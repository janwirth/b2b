// Yadda-specific parsing functionality
// This module handles all interactions with the yadda library

import * as fs from "fs";
import * as Yadda from "yadda";
import type { SpecificationExport } from "yadda/lib/parsers/FeatureParser";
import {
  type AllowedAnnotations,
  type FeatureSkipReason,
  type ScenarioSkipReason,
} from "./loadFeatures";

// Yadda parser instance
const featureParser = new Yadda.parsers.FeatureParser();
export const parseFeature = (text: string): SpecificationExport | null => {
  return featureParser.parse(text);
};

// Yadda-specific types
export type YaddaFeatureExport = SpecificationExport & { filePath: string };
export type YaddaScenarioExport = Yadda.parsers.FeatureParser.ScenarioExport;
export type YaddaAnnotations =
  Yadda.parsers.FeatureParser.ScenarioExport["annotations"];

/**
 * Reads and parses a feature file using yadda
 */
export const readFeatureFile = (
  filePath: string
): Promise<YaddaFeatureExport> => {
  return fs.promises.readFile(filePath, "utf8").then(async (text) => {
    const res = featureParser.parse(text);
    if (res) {
      return { ...res, filePath };
    } else {
      throw new Error(`Could not parse ${filePath}`);
    }
  });
};

/**
 * Gets all feature files from the features directory using yadda
 */
export const getFeatureFiles = (): string[] => {
  return new Yadda.FeatureFileSearch("./features").list();
};

/**
 * Parses all feature files using yadda
 */
export const parseAllFeatureFiles = async (): Promise<DecodedFeature[]> => {
  const featureFiles = getFeatureFiles();
  const parsed = await Promise.all(featureFiles.map(readFeatureFile));
  const decoded: DecodedFeature[] = parsed.map((x) => {
    const annotations = AnnotationsSchema.parse(x.annotations);
    const otherFeatures = parsed.flatMap((other) => {
      if (other.filePath !== x.filePath) {
        return {
          annotations: AnnotationsSchema.parse(other.annotations),
          filePath: other.filePath,
          scenarios: other.scenarios.map((scenario) => {
            return {
              title: scenario.title,
              annotations: AnnotationsSchema.parse(scenario.annotations),
              steps: scenario.steps
                .map((step) => step.trim())
                .filter((step) => step !== ""),
            };
          }),
        };
      }
      return [];
    });
    const featureSkipReason = determineFeatureSkipReason({
      annotations,
      otherFeatures: parsed.flatMap((y) =>
        AnnotationsSchema.parse(y.annotations)
      ),
    });
    const scenarios: DecodedScenario[] = x.scenarios.map((y) => {
      return {
        ...y,
        skipReason: determineScenarioSkipReason({
          annotations: AnnotationsSchema.parse(y.annotations),
          otherScenarios: x.scenarios.map((z) =>
            AnnotationsSchema.parse(z.annotations)
          ),
          otherFeatures: parsed.flatMap((z) =>
            AnnotationsSchema.parse(z.annotations)
          ),
        }),
        annotations: AnnotationsSchema.parse(y.annotations),
        steps: y.steps.map((z) => z.trim()).filter((z) => z !== ""),
      };
    });
    return {
      title: x.title,
      featureFilePath: x.filePath,
      scenarios,
      annotations,
      skipReason: featureSkipReason,
    };
  });
  return decoded;
};
import { z } from "zod";
import {
  determineFeatureSkipReason,
  determineScenarioSkipReason,
} from "./skipreason.test";

const AnnotationsSchema = z
  .object({
    focus: z.literal(true).optional(),
    skip: z.literal(true).optional(),
    shouldfail: z.literal(true).optional(),
  })
  .transform((x) => Object.keys(x) as AllowedAnnotations[]);

export type DecodedFeature = {
  title: string;
  // featureFilePath: string;
  annotations: z.infer<typeof AnnotationsSchema>;
  skipReason: FeatureSkipReason | null;
  scenarios: DecodedScenario[];
};

export type DecodedScenario = {
  title: string;
  annotations: z.infer<typeof AnnotationsSchema>;
  skipReason: ScenarioSkipReason | null;
  steps: string[];
};
