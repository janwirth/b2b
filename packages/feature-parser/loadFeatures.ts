// This is the feature file parser
// ideally it just returns the features

import { findBestStep } from "../step-library/steps";
import { type DecodedFeature } from "./yadda-parser";
import { suggestMostLikelyMatches } from "../step-parser/suggest-most-likely-matches";

export const getParseResults = (features: DecodedFeature[]): ParseResults => {
  const errors: ParseError[] = [];

  for (const feature of features) {
    for (const scenario of feature.scenarios) {
      const parsedSteps = scenario.steps.map(findBestStep);
      if (scenario) {
        for (let i = 0; i < parsedSteps.length; i++) {
          const parseResult = parsedSteps[i];
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

import { z } from "zod";

export const AnnotationsRecordSchema = z.object({
  focus: z.literal(true).optional(),
  skip: z.literal(true).optional(),
  shouldfail: z.literal(true).optional(),
});

export const AnnotationsSchema: z.ZodType<AllowedAnnotations[]> =
  AnnotationsRecordSchema.transform(
    (x) => Object.keys(x) as AllowedAnnotations[]
  );
export type AllowedAnnotations = keyof z.infer<typeof AnnotationsRecordSchema>;
