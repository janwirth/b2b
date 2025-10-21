import { test, expect } from "bun:test";
import { loadFeatures } from "../../tests/loadFeatures";
import fs from "fs";
import type { DecodedFeature } from "./parser-flow";

const featureDir = `./features`;
const featureFiles = fs.readdirSync(featureDir);
const featureFilesCount = featureFiles.filter((file) =>
  file.endsWith(".feature")
).length;
const getFeature = (features: DecodedFeature[], title: string) => {
  return features.find((feature) => feature.title === title);
};

test("All features are parsed", async () => {
  const features = await loadFeatures();
  expect(features.length).toBe(featureFilesCount);
});
