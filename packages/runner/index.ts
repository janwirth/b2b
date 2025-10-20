import fs from "fs/promises";
import { parseStep, type Context } from "../step-library/steps";
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
    if (parsed.type === "Err") {
      throw new RunnerError(parsed.step, scenario.title, step);
    }

    const result = await parsed.execute(context);

    if (result.type === "failure") {
      // Take screenshot on failure
      const screenshot_path = `./failure/${scenario.title}.png`;
      try {
        await fs.mkdir("./failure", { recursive: true });
      } catch (e) {
        // Directory might already exist
      }

      const screenshot = await context.page?.screenshot({
        path: screenshot_path,
      });

      throw new RunnerError(
        result.message,
        scenario.title,
        step,
        screenshot_path
      );
    }

    onUpdate?.({ type: "step_completed", step });
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
      console.log("scenario completed", scenario.title);
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

    throw new RunnerError((error as Error).message, "unknown", "unknown");
  }
};
