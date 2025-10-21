import { expect, test } from "bun:test";
import type { ParsedAnnotations, AllowedAnnotations } from "./loadFeatures";
test.only("determineSkipReason works correctly", () => {
  for (const [name, feature] of Object.entries(ExampleFeatures)) {
    const skipReasonA = determineFeatureSkipReason({
      annotations: feature.input.A.annotations,
      otherFeatures: feature.input.B.annotations,
    });
    const skipReasonB = determineFeatureSkipReason({
      annotations: feature.input.B.annotations,
      otherFeatures: feature.input.A.annotations,
    });
    const isFocusedA = feature.input.A.annotations.includes("focus");
    const isFocusedB = feature.input.B.annotations.includes("focus");
    const resultA: FeatureOutput = {
      skipReason: skipReasonA,
      isFocused: isFocusedA,
      scenarios:
        feature.input.A.scenarios?.map((scenario) => ({
          isFocused: scenario.includes("focus"),
          skipReason: determineScenarioSkipReason({
            annotations: scenario,
            otherScenarios: feature.input.A.scenarios!,
            otherFeatures: feature.input.B.annotations,
          }),
        })) ?? [],
    };
    const resultB: FeatureOutput = {
      skipReason: skipReasonB,
      isFocused: isFocusedB,
      scenarios:
        feature.input.B.scenarios?.map((scenario) => ({
          isFocused: scenario.includes("focus"),
          skipReason: determineScenarioSkipReason({
            annotations: scenario,
            otherScenarios: feature.input.B.scenarios!,
            otherFeatures: feature.input.A.annotations,
          }),
        })) ?? [],
    };
    expect(resultA).toEqual(feature.output.A);
    expect(resultB).toEqual(feature.output.B);
  }
});
// separate skip reason functions for feature and scenario

const determineFeatureSkipReason = ({
  annotations,
  otherFeatures,
}: {
  annotations: AllowedAnnotations[];
  otherFeatures: AllowedAnnotations[];
}): null | FeatureSkipReason => {
  if (annotations.includes("skip")) {
    return "feature-explicit-skip";
  }
  if (
    otherFeatures.some((feature) => feature.includes("focus")) &&
    !annotations.includes("focus")
  ) {
    return "other-feature-focused";
  }
  return null;
};

const determineScenarioSkipReason = ({
  annotations,
  otherScenarios,
  otherFeatures,
}: {
  annotations: AllowedAnnotations[];
  otherScenarios: AllowedAnnotations[][];
  otherFeatures: AllowedAnnotations[];
}): null | ScenarioSkipReason => {
  if (annotations.includes("skip")) {
    return "scenario-explicit-skip";
  }
  if (
    otherScenarios.some((scenario) => scenario.includes("focus")) &&
    !annotations.includes("focus")
  ) {
    return "other-scenario-focused";
  }
  if (
    otherFeatures.some((feature) => feature.includes("focus")) &&
    !annotations.includes("focus")
  ) {
    return "other-feature-focused";
  }
  return null;
};

type ExampleFeature<T extends Record<string, any>> = {
  input: {
    A: {
      annotations: AllowedAnnotations[];
      scenarios?: AllowedAnnotations[][];
    };
    B: {
      annotations: AllowedAnnotations[];
      scenarios?: AllowedAnnotations[][];
    };
  };
  output: {
    A: FeatureOutput;
    B: FeatureOutput;
  };
};
type FeatureOutput = {
  skipReason: FeatureSkipReason | null;
  isFocused: boolean;
  scenarios: {
    skipReason: ScenarioSkipReason | null;
    isFocused: boolean;
  }[];
};

import type { FeatureSkipReason, ScenarioSkipReason } from "./loadFeatures";
const ExampleFeatures: Record<string, ExampleFeature<any>> = {
  oneFocused: {
    input: {
      A: { scenarios: [], annotations: ["focus"] },
      B: { scenarios: [], annotations: [] },
    },
    output: {
      A: { skipReason: null, isFocused: true, scenarios: [] },
      B: {
        skipReason: "other-feature-focused",
        isFocused: false,
        scenarios: [],
      },
    },
  },
  oneSkipped: {
    input: {
      A: { annotations: ["skip"] },
      B: { annotations: [] },
    },
    output: {
      A: {
        skipReason: "feature-explicit-skip",
        isFocused: false,
        scenarios: [],
      },
      B: {
        skipReason: "other-feature-focused",
        isFocused: false,
        scenarios: [],
      },
    },
  },
  oneFocusedScenario: {
    input: {
      // first scenario is focused
      A: { scenarios: [["focus"], []], annotations: ["focus"] },
      B: { scenarios: [], annotations: [] },
    },
    output: {
      A: {
        skipReason: null,
        isFocused: true,
        scenarios: [
          { skipReason: null, isFocused: true },
          { skipReason: "other-scenario-focused", isFocused: false },
        ],
      },
      B: {
        skipReason: "other-feature-focused",
        isFocused: false,
        scenarios: [],
      },
    },
  },
};
