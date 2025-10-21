// Yadda-specific parsing functionality
// This module handles all interactions with the yadda library

import * as fs from "fs";
import * as Yadda from "yadda";
import type { SpecificationExport } from "yadda/lib/parsers/FeatureParser";

// Yadda parser instance
const featureParser = new Yadda.parsers.FeatureParser();

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
export const parseAllFeatureFiles = async (): Promise<YaddaFeatureExport[]> => {
  const featureFiles = getFeatureFiles();
  return Promise.all(featureFiles.map(readFeatureFile));
};
