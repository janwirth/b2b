import fs from "fs/promises";
import { parseStep, type Context } from "../step-library/steps";
import type { Feature } from "../feature-parser/loadFeatures";
import { R } from "@mobily/ts-belt";

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

export class RunnerError extends Error {
  constructor(
    message: string,
    public scenarioTitle: string,
    public step: string,
    public image?: string
  ) {
    super(message);
    this.name = "RunnerError";
  }
}

const runScenario = async (
  scenario: { title: string; steps: string[] },
  context: Context,
  headless: boolean,
  onUpdate?: (update: RunnerUpdate) => void
): Promise<void> => {
  onUpdate?.({ type: "scenario_started", scenarioTitle: scenario.title });

  for (const step of scenario.steps) {
    onUpdate?.({ type: "step_started", step });

    const parsed = parseStep(step);
    if ("type" in parsed && parsed.type === "Err") {
      throw new RunnerError(parsed.step, scenario.title, step);
    }

    // At this point, parsed is guaranteed to be a ParseResult (Result type)
    const parseResult = parsed as R.Result<any, any>;

    try {
      const result = R.getExn(parseResult).execute(context);

      if (R.isError(result)) {
        const failure = R.getExn(result) as {
          type: "failure";
          message: string;
          image?: string;
        };
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

        throw new RunnerError(
          failure.message,
          scenario.title,
          step,
          screenshot_path
        );
      }

      onUpdate?.({ type: "step_completed", step });
    } catch (stepError) {
      // If it's already a RunnerError, re-throw it
      if (stepError instanceof RunnerError) {
        throw stepError;
      }

      // Otherwise, wrap it with context
      let errorMessage = "Unknown step error";
      if (stepError instanceof Error) {
        errorMessage =
          stepError.message || stepError.name || "Error without message";
      } else if (typeof stepError === "string") {
        errorMessage = stepError;
      } else if (stepError && typeof stepError === "object") {
        errorMessage = JSON.stringify(stepError, null, 2);
      }

      throw new RunnerError(
        `Step execution failed: ${errorMessage}`,
        scenario.title,
        step
      );
    }
  }

  onUpdate?.({ type: "scenario_completed", scenarioTitle: scenario.title });
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
      await runScenario(scenario, context, headless, onUpdate);
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
    if (error instanceof RunnerError) {
      throw error;
    }

    // Provide better error context for unknown errors
    const errorMessage =
      (error as Error)?.message || String(error) || "Unknown error occurred";
    const errorStack = (error as Error)?.stack || "No stack trace available";

    throw new RunnerError(
      `${errorMessage}\n\nStack trace:\n${errorStack}`,
      "unknown",
      "unknown"
    );
  }
};
