import { test, expect, beforeAll, afterAll } from "bun:test";
import Bun from "bun";
import {
  getAllFeatures,
  getFeature,
} from "../packages/feature-parser/loadFeatures";
import { runFeature } from "../packages/runner";
import { serve } from "./mock-server";
const allFeatures = await getAllFeatures();

beforeAll(async () => {
  server = serve();
  await serveRunning();
});
afterAll(async () => {
  if (server) {
    server.stop();
    console.log(chalk.blue("Stopped mock server"));
  }
  await shutdownBrowsers();
});

const anyFocused = allFeatures.features.some((feature) =>
  feature.scenarios.items.some((scenario) => scenario.isFocused)
);
for (const feature of allFeatures.features) {
  test(feature.title, async () => {
    if (feature.skipReason) {
      console.log(chalk.yellow("⏭️  Skipping feature (skip):"), feature.title);
      return;
    }
    if (anyFocused) {
      if (feature.skipReason === "other-feature-focused") {
        console.log(
          chalk.yellow("⏭️  Skipping feature (not focused):"),
          feature.title
        );
        return;
      }
    }
    const result = await runFeature(
      {
        ...feature,
        filePath: feature.filePath,
      },
      {
        onUpdate: (update) => {
          switch (update.type) {
            case "feature_started":
              console.log(
                chalk.blue("🚀 Starting feature:"),
                update.featureTitle
              );
              break;
            case "scenario_started":
              console.log(
                chalk.cyan("  📋 Starting scenario:"),
                update.scenarioTitle
              );
              break;
            case "step_started":
              console.log(chalk.gray("    ▶️  Starting step:"), update.step);
              break;
            case "step_completed":
              console.log(chalk.green("    ✅ Completed step:"), update.step);
              break;
            case "scenario_completed":
              console.log(
                chalk.green("  ✅ Completed scenario:"),
                update.scenarioTitle
              );
              break;
            case "feature_completed":
              console.log(
                chalk.green("🎉 Completed feature:"),
                update.featureTitle,
                chalk.gray(`(${update.duration_ms}ms)`)
              );
              break;
          }
        },
      }
    );

    // Check if any scenarios failed
    const failedScenarios = result.scenarios.filter(
      (scenario) => scenario.result.type === "runner_error"
    );

    if (failedScenarios.length > 0) {
      // Check if any failed scenarios were expected to fail
      const unexpectedFailures = failedScenarios.filter((failedScenario) => {
        const scenarioDef = feature.scenarios.items.find(
          (s) => s.title === failedScenario.title
        );
        return !scenarioDef?.shouldFail;
      });

      if (unexpectedFailures.length === 0) {
        // All failures were expected
        console.log(
          chalk.green("✅ Feature failed as expected:"),
          feature.title
        );
        return;
      }

      console.error(chalk.red("❌ Feature failed:"), feature.title);
      for (const failedScenario of unexpectedFailures) {
        console.error(
          chalk.red(`  ❌ Scenario failed: ${failedScenario.title}`)
        );
        if (failedScenario.result.type === "runner_error") {
          console.error(
            chalk.red("    Error message:"),
            failedScenario.result.message
          );
          if (failedScenario.result.image) {
            console.error(
              chalk.gray("    Screenshot:"),
              failedScenario.result.image
            );
          }
        }
      }

      // Throw an error to fail the test
      throw new Error(
        `Feature failed with ${unexpectedFailures.length} unexpected scenario(s) failing`
      );
    }
  });
}
let server = null as Bun.Server<undefined> | null;

import chalk from "chalk";
import { shutdownBrowsers } from "../packages/step-library/steps";
const serveRunning = async () => {
  console.log(chalk.blue("Serving mock server"));
  const response = await fetch("http://localhost:3000/");
  const body = await response.text();
  if (!body.includes("Hello World")) {
    // console.error("BODY", body);
    throw new Error("Mock server not running");
  }
  // console.log("Server is running");
};
