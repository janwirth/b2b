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

const anyFocused = allFeatures.features.some((feature) => feature.isFocused);
for (const feature of allFeatures.features) {
  test(feature.title, async () => {
    if (feature.isSkipped) {
      console.log(chalk.yellow("Skipping feature (skip)"), feature.title);
      return;
    }
    if (anyFocused) {
      if (!feature.isFocused) {
        console.log(
          chalk.yellow("Skipping feature (not focused)"),
          feature.title
        );
        return;
      }
    }
    await runFeature(feature, {
      onUpdate: (update) => {
        switch (update.type) {
          case "feature_started":
            console.log(chalk.blue("Starting feature"), update.featureTitle);
            break;
          case "scenario_started":
            console.log(chalk.blue("Starting scenario"), update.scenarioTitle);
            break;
          case "step_started":
            console.log(chalk.blue("Starting step"), update.step);
            break;
          case "step_completed":
            console.log(chalk.green("Completed step"), update.step);
            break;
          case "scenario_completed":
            console.log(
              chalk.green("Completed scenario"),
              update.scenarioTitle
            );
            break;
        }
      },
    });
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
