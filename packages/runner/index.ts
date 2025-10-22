import fs from "fs/promises";
import { type Context } from "../step-library/steps";
import type { DecodedFeature } from "../feature-parser/parser-flow";
import { runScenario } from "./runScenario";

export type RunnerUpdate =
  | { type: "feature_started"; featureTitle: string }
  | { type: "scenario_started"; scenarioTitle: string }
  | { type: "step_started"; step: string }
  | { type: "step_completed"; step: string }
  | { type: "scenario_completed"; scenarioTitle: string }
  | { type: "feature_completed"; featureTitle: string; duration_ms: number };

export type RunnerOptions = {
  headless?: boolean;
  closeAfterFail?: boolean;
  onUpdate?: (update: RunnerUpdate) => void;
};

export type RunnerError = {
  type: "runner_error";
  message: string;
  scenarioTitle: string;
  step: string;
  image?: string;
};

export type ScenarioSuccess = {
  type: "success";
  status: "ok";
};

export type ScenarioResult = ScenarioSuccess | RunnerError;

export type FeatureResult = {
  duration_ms: number;
  scenarios: Array<{
    title: string;
    result: ScenarioResult;
  }>;
  success: boolean;
};
import chalk from "chalk";

export const runFeature = async (
  feature: DecodedFeature,
  options: RunnerOptions = {}
): Promise<FeatureResult> => {
  const { headless = true, closeAfterFail = true, onUpdate } = options;

  const startTime = Date.now();
  try {
    onUpdate?.({ type: "feature_started", featureTitle: feature.title });

    // Filter out skipped scenarios
    const activeScenarios = feature.scenarios.filter(
      (scenario) => !scenario.skipReason
    );

    const scenarioResults: Array<{ title: string; result: ScenarioResult }> =
      [];
    let hasFailures = false;

    for (const scenario of activeScenarios) {
      const scenarioResult = await runScenario(
        feature,
        scenario,
        headless,
        onUpdate
      );

      scenarioResults.push({
        title: scenario.title,
        result: scenarioResult,
      });

      if (scenarioResult.type === "runner_error") {
        hasFailures = true;
        console.log(chalk.yellow("Scenario failed"), scenario.title);
        // Continue running other scenarios instead of throwing
      }
    }

    const duration_ms = Date.now() - startTime;
    onUpdate?.({
      type: "feature_completed",
      featureTitle: feature.title,
      duration_ms,
    });

    return {
      duration_ms,
      scenarios: scenarioResults,
      success: !hasFailures,
    };
  } catch (error) {
    // For unexpected errors, create a feature result with error information
    const duration_ms = Date.now() - startTime;
    const errorMessage =
      (error as Error)?.message || String(error) || "Unknown error occurred";
    const errorStack = (error as Error)?.stack || "No stack trace available";

    return {
      duration_ms,
      scenarios: [
        {
          title: "unknown",
          result: {
            type: "runner_error",
            message: `${errorMessage}\n\nStack trace:\n${errorStack}`,
            scenarioTitle: "unknown",
            step: "unknown",
          },
        },
      ],
      success: false,
    };
  }
};
