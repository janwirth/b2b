// This is the feature file parser
// ideally it just returns the features

import { findBestStep } from "../step-library/steps";
import {
  parseAllFeatureFiles,
  type YaddaFeatureExport,
  type YaddaAnnotations,
} from "./yadda-parser";
import { suggestMostLikelyMatches } from "../step-parser/suggest-most-likely-matches";

export const getFeature = (
  parsedFeatures: GetAllFeaturesResult,
  name: string
) => parsedFeatures.features.find((f) => f.title === name);

export const getParseResults = (features: Feature[]): ParseResults => {
  const errors: ParseError[] = [];

  for (const feature of features) {
    for (const scenario of feature.scenarios.items) {
      if (scenario.parsedSteps) {
        for (let i = 0; i < scenario.parsedSteps.length; i++) {
          const parseResult = scenario.parsedSteps[i];
          if (parseResult.type === "Err") {
            errors.push({
              featureTitle: feature.title,
              scenarioTitle: scenario.title,
              stepText: parseResult.step,
              stepIndex: i,
              suggestions: suggestMostLikelyMatches(parseResult.step),
            });
          }
        }
      }
    }
  }

  return { errors };
};

export type GetAllFeaturesResult = { features: Feature[] };
type FeatureResult = {
  title: string;
  scenarios: {
    items: (Scenario & ParsedAnnotations)[];
  };
  skipReason: null | FeatureSkipReason;
};

export type Feature = FeatureResult & {
  filePath: string;
  scenarios: {
    items: (Scenario & ParsedAnnotations)[];
  };
};
type Scenario = {
  title: string;
  steps: string[];
  skipReason: null | ScenarioSkipReason;
  shouldFail: boolean;
  parsedSteps?: ReturnType<typeof findBestStep>[];
};
export type FeatureSkipReason =
  | "other-feature-focused"
  | "feature-explicit-skip";
export type ScenarioSkipReason =
  | FeatureSkipReason
  | "other-scenario-focused"
  | "scenario-explicit-skip";

export type ParseError = {
  featureTitle: string;
  scenarioTitle: string;
  stepText: string;
  stepIndex: number;
  suggestions: string;
};

export type ParseResults = {
  errors: ParseError[];
};

export const determineFeatureSkipReason = (
  annotations: ParsedAnnotations
): null | FeatureSkipReason => {
  if (!annotations.isSkipped) {
    return null;
  }

  if (annotations.isFocused) {
    return "other-feature-focused";
  }

  return "feature-explicit-skip";
};

export const determineScenarioSkipReason = (
  annotations: ParsedAnnotations
): null | ScenarioSkipReason => {
  if (!annotations.isSkipped) {
    return null;
  }

  if (annotations.isFocused) {
    return "other-scenario-focused";
  }

  if (annotations.shouldFail) {
    return "scenario-explicit-skip";
  }

  return "other-feature-focused";
};

export const determineSkipReason = (
  annotations: ParsedAnnotations,
  type: "feature" | "scenario"
): null | FeatureSkipReason | ScenarioSkipReason => {
  return type === "feature"
    ? determineFeatureSkipReason(annotations)
    : determineScenarioSkipReason(annotations);
};

const transformFeaturesWithAnnotations = (
  features: YaddaFeatureExport[]
): Feature[] => {
  return parseAnnotations(features).items.map((feature) => ({
    ...feature,
    skipReason: determineFeatureSkipReason(feature),
    scenarios: {
      items: parseAnnotations(
        feature.scenarios.map((scen) => ({
          ...scen,
          parsedSteps: scen.steps.map(findBestStep),
        }))
      ).items.map((scenario) => ({
        ...scenario,
        skipReason: determineScenarioSkipReason(scenario),
        parsedSteps: scenario.parsedSteps,
      })),
    },
  }));
};

export const getAllFeatures = async (): Promise<GetAllFeaturesResult> => {
  const features = await parseAllFeatureFiles().then((x) =>
    x.map((x) => ({
      ...x,
      scenarios: x.scenarios.map((y) => ({
        ...y,
        steps: y.steps.map((z) => z.trim()).filter((z) => z !== ""),
      })),
    }))
  );
  const activeFeatures: Feature[] = transformFeaturesWithAnnotations(features);
  return {
    features: activeFeatures,
  };
};
import { z } from "zod";

const AnnotationsSchema = z.object({
  focus: z.literal(true).optional(),
  skip: z.literal(true).optional(),
  shouldfail: z.literal(true).optional(),
});

export type AllowedAnnotations = keyof z.infer<typeof AnnotationsSchema>;
