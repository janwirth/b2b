import { test, expect, beforeAll, afterAll } from "bun:test";
import Bun from "bun";
import {
  getAllFeatures,
  getFeature,
} from "../packages/feature-parser/loadFeatures";
import { runFeature } from "../packages/runner";
import { serve } from "./mock-server";

let server = null as Bun.Server | null;
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

test("Read content", async () => {
  const features = await getAllFeatures();
  const feature = getFeature(features, "Read");
  if (!feature) {
    throw new Error("Feature not found");
  }
  // console.log("Running feature", feature.title);
  await runFeature(feature, {
    onUpdate: (update) => {
      // console.log("Update", update);
    },
  });
});
test("OCR", async () => {
  const features = await getAllFeatures();
  const feature = getFeature(features, "OCR");
  if (!feature) {
    throw new Error("Feature not found");
  }
  // console.log("Running feature", feature.title);
  await runFeature(feature, {
    onUpdate: (update) => {
      // console.log("Update", update);
    },
  });
});
test("Clipboard", async () => {
  const features = await getAllFeatures();
  const feature = getFeature(features, "Clipboard");
  if (!feature) {
    throw new Error("Feature not found");
  }
  // console.log("Running feature", feature.title);
  await runFeature(feature, {
    onUpdate: (update) => {
      // console.log("Update", update);
    },
  });
});
test("Input", async () => {
  const features = await getAllFeatures();
  const feature = getFeature(features, "Input");
  if (!feature) {
    throw new Error("Feature not found");
  }
  // console.log("Running feature", feature.title);
  await runFeature(feature, {
    onUpdate: (update) => {
      // console.log("Update", update);
    },
  });
});

test("File Upload", async () => {
  const features = await getAllFeatures();
  const feature = getFeature(features, "File Upload");
  if (!feature) {
    throw new Error("Feature not found");
  }
  // console.log("Running feature", feature.title);
  await runFeature(feature, {
    onUpdate: (update) => {
      // console.log("Update", update);
    },
  });
});
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
