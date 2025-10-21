// This is the feature file parser
// ideally it just returns the features

import { findBestStep } from "../step-library/steps";
import {
  parseAllFeatureFiles,
  type YaddaFeatureExport,
  type YaddaAnnotations,
} from "./yadda-parser";

export const getFeature = (
  parsedFeatures: GetAllFeaturesResult,
  name: string
) => parsedFeatures.features.find((f) => f.title === name);

type GetAllFeaturesResult = { features: Feature[] };
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
};
type FeatureSkipReason = "other-feature-focused" | "feature-explicit-skip";
type ScenarioSkipReason =
  | FeatureSkipReason
  | "other-scenario-focused"
  | "scenario-explicit-skip";

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
  const activeFeatures: FeatureResult[] = parseAnnotations(features).items.map(
    (feature) => ({
      ...feature,
      skipReason: feature.isSkipped
        ? feature.isFocused
          ? "other-feature-focused"
          : "feature-explicit-skip"
        : null,
      scenarios: {
        items: parseAnnotations(
          feature.scenarios.map((scen) => ({
            ...scen,
            parsedSteps: scen.steps.map(findBestStep),
          }))
        ).items.map((scenario) => ({
          ...scenario,
          skipReason: scenario.isSkipped
            ? scenario.isFocused
              ? "other-scenario-focused"
              : scenario.shouldFail
              ? "scenario-explicit-skip"
              : "other-feature-focused"
            : null,
        })),
      },
    })
  );
  return {
    features: activeFeatures,
  };
};
export type ParsedAnnotations = {
  isSkipped: boolean;
  isFocused: boolean;
  shouldFail: boolean;
};
type WithRawAnnotations = {
  annotations: YaddaAnnotations;
};
type ParseResult<T> = {
  items: (T & ParsedAnnotations)[];
  hasFocusedItem: boolean;
};

const parseAnnotations = <T extends WithRawAnnotations>(
  rawItems: T[]
): ParseResult<T & ParsedAnnotations> => {
  const oneFocused = rawItems.some((item) => item.annotations.focus);
  const items = rawItems.map((item) => {
    const annotations = AnnotationsSchema.parse(item.annotations);
    return {
      ...item,
      isSkipped: !!annotations.skip || (!!oneFocused && !annotations.focus),
      isFocused: !!annotations.focus,
      shouldFail: !!annotations.shouldFail,
    };
  });
  return { items, hasFocusedItem: oneFocused };
};
import { z } from "zod";

const AnnotationsSchema = z.object({
  focus: z.literal(true).optional(),
  skip: z.literal(true).optional(),
  shouldFail: z.literal(true).optional(),
});
