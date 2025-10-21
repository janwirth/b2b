import type {
  AllowedAnnotations,
  FeatureSkipReason,
  ScenarioSkipReason,
} from "./loadFeatures";

export const determineFeatureSkipReason = ({
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

export const determineScenarioSkipReason = ({
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
