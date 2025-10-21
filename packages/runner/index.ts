import fs from "fs/promises";
import { parseStep, type Context, type StepSuccess, type StepFailure } from "../step-library/steps";
import type { Feature } from "../feature-parser/loadFeatures";
import { type Result, type Success, type Failure } from "../result/result";

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

const runScenario = async (
  scenario: { title: string; steps: string[] },
  context: Context,
  headless: boolean,
  onUpdate?: (update: RunnerUpdate) => void
): Promise<Result<{ status: "ok" }, RunnerError>> => {
  onUpdate?.({ type: "scenario_started", scenarioTitle: scenario.title });

  for (const step of scenario.steps) {
    onUpdate?.({ type: "step_started", step });

    const parsed = parseStep(step);
    if ("type" in parsed && parsed.type === "Err") {
      return {
        _tag: "Failure",
        error: {
          type: "runner_error",
          message: parsed.step,
          scenarioTitle: scenario.title,
          step,
        },
      } as Failure<RunnerError>;
    }

    // At this point, parsed is guaranteed to be a ParseResult (Result type)
    const parseResult = parsed as Result<any, any>;

    if (parseResult._tag !== "Success") {
      return {
        _tag: "Failure",
        error: {
          type: "runner_error",
          message: "Failed to parse step",
          scenarioTitle: scenario.title,
          step,
        },
      } as Failure<RunnerError>;
    }

    try {
      const result = await parseResult.value.execute(context);

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
          _tag: "Failure",
          error: {
            type: "runner_error",
            message: result.message,
            scenarioTitle: scenario.title,
            step,
            image: screenshot_path,
          },
        } as Failure<RunnerError>;
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
        _tag: "Failure",
        error: {
          type: "runner_error",
          message: `Step execution failed: ${errorMessage}`,
          scenarioTitle: scenario.title,
          step,
        },
      } as Failure<RunnerError>;
    }
  }

  onUpdate?.({ type: "scenario_completed", scenarioTitle: scenario.title });
  return { _tag: "Success", value: { status: "ok" } } as Success<{
    status: "ok";
  }>;
};

export const runFeature = async (
  feature: Feature,
  options: RunnerOptions = {}
): Promise<{ duration_ms: number }> => {
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

    for (const scenario of activeScenarios) {
      const scenarioResult = await runScenario(
        scenario,
        context,
        headless,
        onUpdate
      );
      if (scenarioResult._tag === "Failure") {
        const error = scenarioResult.error;
        // Clean up browser on error
        if (closeAfterFail) {
          await context.browser?.close();
        }
        throw error;
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

    return { duration_ms };
  } catch (error) {
    // Clean up browser on error
    if (closeAfterFail) {
      await context.browser?.close();
    }

    // Re-throw RunnerError as-is, wrap other errors
    if (
      error &&
      typeof error === "object" &&
      "type" in error &&
      error.type === "runner_error"
    ) {
      throw error;
    }

    // Provide better error context for unknown errors
    const errorMessage =
      (error as Error)?.message || String(error) || "Unknown error occurred";
    const errorStack = (error as Error)?.stack || "No stack trace available";

    throw {
      type: "runner_error",
      message: `${errorMessage}\n\nStack trace:\n${errorStack}`,
      scenarioTitle: "unknown",
      step: "unknown",
    };
  }
};
