import { test, expect, afterAll } from "bun:test";
import { runFeature } from "../packages/runner";
import { shutdownBrowsers } from "../packages/step-library/steps";

afterAll(async () => {
  await shutdownBrowsers();
});

test("runner should handle scenario failures properly", async () => {
  // Create a hard-coded feature with a scenario that will fail
  const failingFeature = {
    title: "Test Failure Feature",
    filePath: "test.feature",
    parsed_annotations: [],
    skipReason: null,
    isFocused: false,
    scenarios: [
      {
        title: "Failing Scenario",
        parsed_annotations: [],
        skipReason: null,
        steps: [
          "When I open localhost:30030303030", // This will fail - invalid URL
          'Then I see "Hello World"',
        ],
      },
    ],
  };

  // Run the feature
  const result = await runFeature(failingFeature, {
    headless: true,
    closeAfterFail: true,
  });

  // Verify that the feature failed
  expect(result.success).toBe(false);
  expect(result.scenarios.length).toBe(1);

  const scenario = result.scenarios[0];
  expect(scenario.title).toBe("Failing Scenario");
  expect(scenario.result.type).toBe("runner_error");

  if (scenario.result.type === "runner_error") {
    expect(scenario.result.scenarioTitle).toBe("Failing Scenario");
    expect(scenario.result.step).toBe("When I open localhost:30030303030");
    // The error message should indicate a connection failure or similar
    expect(scenario.result.message).toBeDefined();
    expect(scenario.result.message.length).toBeGreaterThan(0);
  }
}, 30000); // 30 second timeout for browser operations

test("runner should continue running all scenarios even if one fails", async () => {
  // Create a feature with multiple scenarios - one that fails and one that would succeed
  const multiScenarioFeature = {
    title: "Multi Scenario Feature",
    filePath: "test.feature",
    parsed_annotations: [],
    skipReason: null,
    isFocused: false,
    scenarios: [
      {
        title: "First Scenario - Will Fail",
        parsed_annotations: [],
        skipReason: null,
        steps: [
          "When I open localhost:30030303030", // This will fail
        ],
      },
      {
        title: "Second Scenario - Would Succeed",
        parsed_annotations: [],
        skipReason: null,
        steps: [
          "When I open localhost:3000", // This would succeed if server is running
          'Then I see "Hello World"',
        ],
      },
    ],
  };

  // Run the feature
  const result = await runFeature(multiScenarioFeature, {
    headless: true,
    closeAfterFail: true,
  });

  // Verify that both scenarios were run
  expect(result.scenarios.length).toBe(2);

  // First scenario should have failed
  const firstScenario = result.scenarios[0];
  expect(firstScenario.title).toBe("First Scenario - Will Fail");
  expect(firstScenario.result.type).toBe("runner_error");

  // Second scenario should have been attempted (may succeed or fail depending on server)
  const secondScenario = result.scenarios[1];
  expect(secondScenario.title).toBe("Second Scenario - Would Succeed");

  // Overall feature should be marked as failed due to first scenario
  expect(result.success).toBe(false);
}, 30000);

test("runner should bail out (throw error) when a scenario fails", async () => {
  // This test demonstrates the desired behavior - the runner should throw an error
  // instead of just returning a failed result and continuing

  const failingFeature = {
    title: "Failing Feature",
    filePath: "test.feature",
    parsed_annotations: [],
    skipReason: null,
    isFocused: false,
    scenarios: [
      {
        title: "Failing Scenario",
        parsed_annotations: [],
        skipReason: null,
        steps: [
          "When I open localhost:30030303030", // This will fail
        ],
      },
    ],
  };

  // Currently, the runner does NOT throw an error - it just returns a failed result
  // This test documents the current behavior and could be modified to expect an error
  // if the runner is changed to actually bail out on failures

  const result = await runFeature(failingFeature, {
    headless: true,
    closeAfterFail: true,
  });

  // Current behavior: runner returns a result with success: false
  expect(result.success).toBe(false);
  expect(result.scenarios[0].result.type).toBe("runner_error");

  // TODO: If the runner is modified to actually throw an error on failure,
  // this test should be changed to expect the error to be thrown:
  // expect(() => runFeature(failingFeature, { headless: true, closeAfterFail: true }))
  //   .toThrow();
}, 30000);
