import fs from "fs/promises";
import {
  findBestStep,
  type Context,
  type StepSuccess,
  type StepFailure,
} from "../step-library/steps";
import type { Feature } from "../feature-parser/loadFeatures";

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

const runScenario = async (
  scenario: { title: string; steps: string[] },
  context: Context,
  headless: boolean,
  onUpdate?: (update: RunnerUpdate) => void
): Promise<ScenarioResult> => {
  onUpdate?.({ type: "scenario_started", scenarioTitle: scenario.title });

  for (const step of scenario.steps) {
    onUpdate?.({ type: "step_started", step });

    const bestStep = findBestStep(step);

    try {
      if (bestStep.type === "Err") {
        return {
          type: "runner_error",
          message: `No matching step definition found for: "${step}"`,
          scenarioTitle: scenario.title,
          step,
        };
      }

      const result = await bestStep.execute(context);

      if (result.type === "failure") {
        // Take screenshot on failure
        const screenshot_path = `./failure/${scenario.title}.png` as const;
        try {
          await fs.mkdir("./failure", { recursive: true });
        } catch (e) {
          // Directory might already exist
        }

        const screenshot = await context.page?.screenshot({
          path: screenshot_path,
        });

        return {
          type: "runner_error",
          message: result.message,
          scenarioTitle: scenario.title,
          step,
          image: screenshot_path,
        };
      }

      onUpdate?.({ type: "step_completed", step });
    } catch (stepError) {
      // Handle different error types
      let errorMessage = "Unknown step error";
      if (stepError instanceof Error) {
        errorMessage =
          stepError.message || stepError.name || "Error without message";
      } else if (typeof stepError === "string") {
        errorMessage = stepError;
      } else if (stepError && typeof stepError === "object") {
        errorMessage = JSON.stringify(stepError, null, 2);
      }

      return {
        type: "runner_error",
        message: `Step execution failed: ${errorMessage}`,
        scenarioTitle: scenario.title,
        step,
      };
    }
  }

  onUpdate?.({ type: "scenario_completed", scenarioTitle: scenario.title });
  return { type: "success", status: "ok" };
};

export const runFeature = async (
  feature: Feature,
  options: RunnerOptions = {}
): Promise<FeatureResult> => {
  const { headless = true, closeAfterFail = true, onUpdate } = options;

  const startTime = Date.now();
  const context: Context = {
    featureFilePath: feature.filePath,
  };

  try {
    onUpdate?.({ type: "feature_started", featureTitle: feature.title });

    // Filter out skipped scenarios
    const activeScenarios = feature.scenarios.items.filter(
      (scenario) => !scenario.isSkipped
    );

    const scenarioResults: Array<{ title: string; result: ScenarioResult }> =
      [];
    let hasFailures = false;

    for (const scenario of activeScenarios) {
      const scenarioResult = await runScenario(
        scenario,
        context,
        headless,
        onUpdate
      );

      scenarioResults.push({
        title: scenario.title,
        result: scenarioResult,
      });

      if (scenarioResult.type === "runner_error") {
        hasFailures = true;
        // Continue running other scenarios instead of throwing
      }
    }

    const duration_ms = Date.now() - startTime;
    onUpdate?.({
      type: "feature_completed",
      featureTitle: feature.title,
      duration_ms,
    });

    // Clean up browser
    await context.browser?.close();

    return {
      duration_ms,
      scenarios: scenarioResults,
      success: !hasFailures,
    };
  } catch (error) {
    // Clean up browser on error
    if (closeAfterFail) {
      await context.browser?.close();
    }

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
