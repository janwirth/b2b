import { test, expect } from "bun:test";
import { getAllFeatures } from "./loadFeatures";
import fs from "fs";

const featureDir = `./features`;
const featureFiles = fs.readdirSync(featureDir);
const featureFilesCount = featureFiles.filter((file) =>
  file.endsWith(".feature")
).length;

test("All features are parsed", async () => {
  const features = await getAllFeatures();
  expect(features.features.length).toBe(featureFilesCount);
});
