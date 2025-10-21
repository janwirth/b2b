import { expect, test, describe } from "bun:test";
import { parseFeatures } from "./parser-flow";
import type { FeatureSkipReason, ScenarioSkipReason } from "./loadFeatures";

describe("parser-flow", () => {
  describe("parseFeatures function", () => {
    test("should handle empty input", async () => {
      const result = await parseFeatures([]);
      expect(result).toEqual([]);
    });

    test("should handle single feature with no annotations", async () => {
      const input = [
        {
          filePath: "test.feature",
          content: `Feature: Test Feature
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe("test.feature");
      expect(result[0].skipReason).toBeNull();
      expect(result[0].parsed_annotations).toEqual([]);
      expect(result[0].scenarios).toHaveLength(1);
      expect(result[0].scenarios[0].skipReason).toBeNull();
    });

    test("should handle feature with explicit skip annotation", async () => {
      const input = [
        {
          filePath: "skipped.feature",
          content: `@skip
Feature: Skipped Feature
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(1);
      expect(result[0].skipReason).toBe("feature-explicit-skip");
    });

    test("should handle feature with focus annotation", async () => {
      const input = [
        {
          filePath: "focused.feature",
          content: `@focus
Feature: Focused Feature
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(1);
      expect(result[0].skipReason).toBeNull();
      expect(result[0].parsed_annotations).toContain("focus");
    });

    test("should skip non-focused features when other feature is focused", async () => {
      const input = [
        {
          filePath: "focused.feature",
          content: `@focus
Feature: Focused Feature
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
        {
          filePath: "normal.feature",
          content: `Feature: Normal Feature
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(2);

      const focusedFeature = result.find(
        (f) => f.filePath === "focused.feature"
      );
      const normalFeature = result.find((f) => f.filePath === "normal.feature");

      expect(focusedFeature?.skipReason).toBeNull();
      expect(normalFeature?.skipReason).toBe("other-feature-focused");
    });

    test("should handle scenario with explicit skip annotation", async () => {
      const input = [
        {
          filePath: "test.feature",
          content: `Feature: Test Feature
  @skip
  Scenario: Skipped Scenario
    Given I am on the homepage
  Scenario: Normal Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(1);
      expect(result[0].scenarios).toHaveLength(2);

      const skippedScenario = result[0].scenarios.find(
        (s) => s.title === "Skipped Scenario"
      );
      const normalScenario = result[0].scenarios.find(
        (s) => s.title === "Normal Scenario"
      );

      expect(skippedScenario?.skipReason).toBe("scenario-explicit-skip");
      expect(normalScenario?.skipReason).toBeNull();
    });

    test("should handle scenario with focus annotation", async () => {
      const input = [
        {
          filePath: "test.feature",
          content: `Feature: Test Feature
  @focus
  Scenario: Focused Scenario
    Given I am on the homepage
  Scenario: Normal Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(1);
      expect(result[0].scenarios).toHaveLength(2);

      const focusedScenario = result[0].scenarios.find(
        (s) => s.title === "Focused Scenario"
      );
      const normalScenario = result[0].scenarios.find(
        (s) => s.title === "Normal Scenario"
      );

      expect(focusedScenario?.skipReason).toBeNull();
      expect(focusedScenario?.parsed_annotations).toContain("focus");
      expect(normalScenario?.skipReason).toBe("other-scenario-focused");
    });

    test("should skip scenarios when other feature is focused", async () => {
      const input = [
        {
          filePath: "focused.feature",
          content: `@focus
Feature: Focused Feature
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
        {
          filePath: "normal.feature",
          content: `Feature: Normal Feature
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(2);

      const normalFeature = result.find((f) => f.filePath === "normal.feature");
      expect(normalFeature?.scenarios[0].skipReason).toBe(
        "other-feature-focused"
      );
    });

    test("should handle complex skip rule interactions", async () => {
      const input = [
        {
          filePath: "focused.feature",
          content: `@focus
Feature: Focused Feature
  @focus
  Scenario: Focused Scenario
    Given I am on the homepage
  Scenario: Normal Scenario
    Given I am on the homepage`,
        },
        {
          filePath: "skipped.feature",
          content: `@skip
Feature: Skipped Feature
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
        {
          filePath: "normal.feature",
          content: `Feature: Normal Feature
  @skip
  Scenario: Skipped Scenario
    Given I am on the homepage
  Scenario: Normal Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(3);

      const focusedFeature = result.find(
        (f) => f.filePath === "focused.feature"
      );
      const skippedFeature = result.find(
        (f) => f.filePath === "skipped.feature"
      );
      const normalFeature = result.find((f) => f.filePath === "normal.feature");

      // Focused feature should not be skipped
      expect(focusedFeature?.skipReason).toBeNull();
      expect(focusedFeature?.scenarios[0].skipReason).toBeNull(); // focused scenario
      expect(focusedFeature?.scenarios[1].skipReason).toBe(
        "other-scenario-focused"
      ); // normal scenario

      // Skipped feature should be explicitly skipped
      expect(skippedFeature?.skipReason).toBe("feature-explicit-skip");

      // Normal feature should be skipped due to other feature being focused
      expect(normalFeature?.skipReason).toBe("other-feature-focused");
      expect(normalFeature?.scenarios[0].skipReason).toBe(
        "scenario-explicit-skip"
      ); // explicitly skipped scenario
      expect(normalFeature?.scenarios[1].skipReason).toBe(
        "other-feature-focused"
      ); // normal scenario
    });

    test("should handle multiple focus annotations correctly", async () => {
      const input = [
        {
          filePath: "feature1.feature",
          content: `@focus
Feature: Feature 1
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
        {
          filePath: "feature2.feature",
          content: `@focus
Feature: Feature 2
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
        {
          filePath: "feature3.feature",
          content: `Feature: Feature 3
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(3);

      const feature1 = result.find((f) => f.filePath === "feature1.feature");
      const feature2 = result.find((f) => f.filePath === "feature2.feature");
      const feature3 = result.find((f) => f.filePath === "feature3.feature");

      // Both focused features should not be skipped
      expect(feature1?.skipReason).toBeNull();
      expect(feature2?.skipReason).toBeNull();
      // Non-focused feature should be skipped
      expect(feature3?.skipReason).toBe("other-feature-focused");
    });

    test("should handle shouldfail annotation without affecting skip logic", async () => {
      const input = [
        {
          filePath: "test.feature",
          content: `@shouldfail
Feature: Test Feature
  @shouldfail
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(1);
      expect(result[0].skipReason).toBeNull();
      expect(result[0].scenarios[0].skipReason).toBeNull();
      expect(result[0].parsed_annotations).toContain("shouldfail");
      expect(result[0].scenarios[0].parsed_annotations).toContain("shouldfail");
    });

    test("should handle invalid feature content gracefully", async () => {
      const input = [
        {
          filePath: "invalid.feature",
          content: `This is not a valid feature file`,
        },
        {
          filePath: "valid.feature",
          content: `Feature: Valid Feature
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      // Should only return the valid feature
      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe("valid.feature");
    });

    test("should handle mixed annotations correctly", async () => {
      const input = [
        {
          filePath: "mixed.feature",
          content: `@focus
Feature: Mixed Feature
  @skip
  Scenario: Skipped Scenario
    Given I am on the homepage
  @focus
  Scenario: Focused Scenario
    Given I am on the homepage
  Scenario: Normal Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(1);

      const feature = result[0];
      expect(feature.skipReason).toBeNull();
      expect(feature.parsed_annotations).toContain("focus");

      const skippedScenario = feature.scenarios.find(
        (s) => s.title === "Skipped Scenario"
      );
      const focusedScenario = feature.scenarios.find(
        (s) => s.title === "Focused Scenario"
      );
      const normalScenario = feature.scenarios.find(
        (s) => s.title === "Normal Scenario"
      );

      expect(skippedScenario?.skipReason).toBe("scenario-explicit-skip");
      expect(skippedScenario?.parsed_annotations).toContain("skip");

      expect(focusedScenario?.skipReason).toBeNull();
      expect(focusedScenario?.parsed_annotations).toContain("focus");

      expect(normalScenario?.skipReason).toBe("other-scenario-focused");
    });
  });

  describe("skip rule edge cases", () => {
    test("should handle empty scenarios array", async () => {
      const input = [
        {
          filePath: "empty.feature",
          content: `Feature: Empty Feature`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(1);
      expect(result[0].scenarios).toHaveLength(0);
      expect(result[0].skipReason).toBeNull();
    });

    test("should handle feature with only skipped scenarios", async () => {
      const input = [
        {
          filePath: "test.feature",
          content: `Feature: Test Feature
  @skip
  Scenario: Skipped Scenario 1
    Given I am on the homepage
  @skip
  Scenario: Skipped Scenario 2
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(1);
      expect(result[0].scenarios).toHaveLength(2);
      expect(result[0].scenarios[0].skipReason).toBe("scenario-explicit-skip");
      expect(result[0].scenarios[1].skipReason).toBe("scenario-explicit-skip");
    });

    test("should prioritize explicit skip over focus-based skip", async () => {
      const input = [
        {
          filePath: "focused.feature",
          content: `@focus
Feature: Focused Feature
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
        {
          filePath: "explicitly-skipped.feature",
          content: `@skip
Feature: Explicitly Skipped Feature
  Scenario: Test Scenario
    Given I am on the homepage`,
        },
      ];

      const result = await parseFeatures(input);
      expect(result).toHaveLength(2);

      const focusedFeature = result.find(
        (f) => f.filePath === "focused.feature"
      );
      const skippedFeature = result.find(
        (f) => f.filePath === "explicitly-skipped.feature"
      );

      expect(focusedFeature?.skipReason).toBeNull();
      expect(skippedFeature?.skipReason).toBe("feature-explicit-skip");
    });
  });
});
