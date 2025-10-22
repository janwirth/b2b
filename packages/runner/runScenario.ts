import { findBestStep, type Context } from "../step-library/steps";
import type { RunnerUpdate, ScenarioResult } from "./index";
import puppeteer, { Browser, ConsoleMessage, Page } from "puppeteer";
import type {
  DecodedFeature,
  DecodedScenario,
} from "../feature-parser/parser-flow";
import { PuppeteerScreenRecorder } from "puppeteer-screen-recorder";
const error = console.error;

console.error = (...args: any[]) => {
  // ffmpeg error, video still is created
  if (args[0]?.includes("unable to capture video stream")) {
    return;
  }
  error(...args);
};
import fs from "fs/promises";

const setup = async (
  feature: DecodedFeature,
  scenario: DecodedScenario,
  headless: boolean
) => {
  // create browser
  const browser = await puppeteer.launch({
    headless: headless,
    args: ["--no-sandbox", "--no-zygote"],
  });
  // should always have one page open
  const page = (await browser.pages())[0];
  await clipboardCompat(browser, page);
  const recorder = new PuppeteerScreenRecorder(page);
  const recordingPath = `./recordings/${feature.title}/${scenario.title}.mp4`;
  await recorder.start(recordingPath);
  const context: Context = {
    featureFilePath: feature.filePath,
    page,
  };
  // clipboard compat
  const cleanup = async (mode: "failure" | "success") => {
    await recorder.stop();
    // await new Promise((resolve) => setTimeout(resolve, 50));
    if (mode === "failure") {
      await fs.rename(recordingPath, `${recordingPath}.failed.mp4`);
    }
    await browser.close();
  };
  return [context, cleanup] as const;
};
const clipboardCompat = async (browser: Browser, page: Page) => {
  await page.evaluate(() => {
    const clipboard = {
      text: "",
      async writeText(text: string) {
        this.text = text;
      },
      async readText() {
        return this.text;
      },
    };
    Object.defineProperty(navigator, "clipboard", { value: clipboard });
  });
  const bContext = browser.defaultBrowserContext();
  await bContext.overridePermissions("http://localhost:3000", [
    "clipboard-read",
    "clipboard-write",
    "clipboard-sanitized-write",
  ]);
};

export const runScenario = async (
  feature: DecodedFeature,
  scenario: DecodedScenario,
  headless: boolean,
  onUpdate?: (update: RunnerUpdate) => void
): Promise<ScenarioResult> => {
  const [context, teardown] = await setup(feature, scenario, headless);
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
        // const screenshot_path = `./failure/${scenario.title}.png` as const;
        // try {
        //   await fs.mkdir("./failure", { recursive: true });
        // } catch (e) {
        //   // Directory might already exist
        // }

        teardown("failure");

        return {
          type: "runner_error",
          message: result.message,
          scenarioTitle: scenario.title,
          step,
          // image: screenshot_path,
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
      await teardown("failure");

      return {
        type: "runner_error",
        message: `Step execution failed: ${errorMessage}`,
        scenarioTitle: scenario.title,
        step,
      };
    }
  }
  await teardown("success");

  onUpdate?.({ type: "scenario_completed", scenarioTitle: scenario.title });
  return { type: "success", status: "ok" };
};
