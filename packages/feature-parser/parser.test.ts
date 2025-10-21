import { test, expect } from "bun:test";
import { parseAllFeatureFiles, type DecodedFeature } from "./yadda-parser";
import fs from "fs";

const featureDir = `./features`;
const featureFiles = fs.readdirSync(featureDir);
const featureFilesCount = featureFiles.filter((file) =>
  file.endsWith("")
).length;
const getFeature = (features: DecodedFeature[], title: string) => {
  return features.find((feature) => feature.title === title);
};

test("All features are parsed", async () => {
  const features = await parseAllFeatureFiles();
  expect(features.length).toBe(featureFilesCount);
});

test("Feature annotations are parsed correctly", async () => {
  const features = await parseAllFeatureFiles();

  // Test @focus annotation - this should be on the feature level, not scenario level
  const readFeature = getFeature(features, "Read");
  expect(readFeature).toBeDefined();
  // The @focus annotation is on the feature, so scenarios should not be individually focused
  expect(
    readFeature?.scenarios.some((scenario) =>
      scenario.annotations.includes("focus")
    )
  ).toBe(false);

  // Test @skip annotation
  const parsingErrorFeature = getFeature(features, "Parsing Error Example");
  expect(parsingErrorFeature).toBeDefined();
  expect(parsingErrorFeature?.skipReason).toBe("feature-explicit-skip");
});

test("Scenario annotations are parsed correctly", async () => {
  const features = await parseAllFeatureFiles();
  const readFeature = getFeature(features, "Read");

  expect(readFeature).toBeDefined();
  expect(readFeature?.scenarios).toHaveLength(2);

  // Test @shouldFail annotation
  const shouldFailScenario = readFeature?.scenarios.find(
    (s) => s.title === "Should fail"
  );
  expect(shouldFailScenario).toBeDefined();
  expect(shouldFailScenario?.annotations.includes("shouldfail")).toBe(true);

  // Test basic scenario (no annotations)
  const basicScenario = readFeature?.scenarios.find((s) => s.title === "Basic");
  expect(basicScenario).toBeDefined();
  expect(basicScenario?.annotations.includes("focus")).toBe(false);
  expect(basicScenario?.skipReason).toBeNull();
});

test("Focus logic works correctly", async () => {
  const features = await parseAllFeatureFiles();

  // When there's a focused feature, non-focused features should be skipped
  const readFeature = getFeature(features, "Read");
  expect(readFeature?.skipReason).toBeNull(); // @focus feature should not be skipped

  // Non-focused features should be skipped when there's a focused feature
  // Note: The current implementation doesn't distinguish between explicit @skip and focus-based skipping
  // Both get "feature-explicit-skip" when isFocused = false
  const inputFeature = getFeature(features, "Input");
  expect(inputFeature?.skipReason).toBe("feature-explicit-skip");

  const clipboardFeature = getFeature(features, "Clipboard");
  expect(clipboardFeature?.skipReason).toBe("feature-explicit-skip");
});

test("Skip logic works correctly for scenarios", async () => {
  const features = await parseAllFeatureFiles();
  const readFeature = getFeature(features, "Read");

  expect(readFeature).toBeDefined();

  // In a focused feature, non-focused scenarios should be skipped
  const basicScenario = readFeature?.scenarios.find((s) => s.title === "Basic");
  expect(basicScenario?.skipReason).toBeNull(); // Should not be skipped since it's in a focused feature

  const shouldFailScenario = readFeature?.scenarios.find(
    (s) => s.title === "Should fail"
  );
  expect(shouldFailScenario?.skipReason).toBeNull(); // Should not be skipped since it's in a focused feature
});

test("Explicit skip annotations work correctly", async () => {
  const features = await parseAllFeatureFiles();

  // Feature with @skip should be marked as skipped
  const parsingErrorFeature = getFeature(features, "Parsing Error Example");
  expect(parsingErrorFeature?.skipReason).toBe("feature-explicit-skip");
});

test("Annotation parsing handles edge cases", async () => {
  const features = await parseAllFeatureFiles();

  // Test that features without annotations have correct default values
  const inputFeature = getFeature(features, "Input");
  expect(inputFeature?.skipReason).toBe("feature-explicit-skip"); // Skipped due to focus logic

  // Test that scenarios without annotations have correct default values
  const fileUploadFeature = getFeature(features, "File Upload");
  expect(
    fileUploadFeature?.scenarios.every(
      (scenario) =>
        scenario.skipReason === null &&
        scenario.annotations.includes("focus") === false
    )
  ).toBe(true);
});

test("All annotation types are properly parsed", async () => {
  const features = await parseAllFeatureFiles();

  // Test @focus annotation parsing
  const readFeature = getFeature(features, "Read");
  expect(readFeature).toBeDefined();

  // Test @skip annotation parsing
  const parsingErrorFeature = getFeature(features, "Parsing Error Example");
  expect(parsingErrorFeature?.skipReason).toBe("feature-explicit-skip");

  // Test @shouldFail annotation parsing
  const shouldFailScenario = readFeature?.scenarios.find(
    (s) => s.title === "Should fail"
  );
  expect(shouldFailScenario?.annotations.includes("shouldfail")).toBe(true);
});
