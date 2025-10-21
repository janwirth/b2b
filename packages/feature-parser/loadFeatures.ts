// This is the feature file parser
// ideally it just returns the features

import * as fs from "fs";
import * as Yadda from "yadda";
import { findBestStep } from "../step-library/steps";
import type { SpecificationExport } from "yadda/lib/parsers/FeatureParser";

export const getFeature = (parsedFeatures: ParsedFeatures, name: string) =>
  parsedFeatures.features.find((f) => f.title === name);

export type Feature = ParsedFeatures["features"][number];

export type ParsedFeatures = Awaited<ReturnType<typeof getAllFeatures>>;
export const getAllFeatures = async () => {
  const featureParser = new Yadda.parsers.FeatureParser();
  const readFeatureFile = (
    filePath: string
  ): Promise<SpecificationExport & { filePath: string }> => {
    return fs.promises.readFile(filePath, "utf8").then(async (text) => {
      const res = featureParser.parse(text);
      if (res) {
        return { ...res, filePath };
      } else {
        throw new Error(`Could not parse ${filePath}`);
      }
    });
  };
  const features = await Promise.all(
    new Yadda.FeatureFileSearch("./features").list().map(readFeatureFile)
  ).then((x) =>
    x.map((x) => ({
      ...x,
      scenarios: x.scenarios.map((y) => ({
        ...y,
        steps: y.steps.map((z) => z.trim()).filter((z) => z !== ""),
      })),
    }))
  );
  const activeFeatures = parseAnnotations(features).items.map((feature) => ({
    ...feature,
    scenarios: parseAnnotations(
      feature.scenarios.map((scen) => ({
        ...scen,
        parsedSteps: scen.steps.map(findBestStep),
      }))
    ),
  }));
  return {
    features: activeFeatures,
    // debugging information as to what failed
    parseResults: activeFeatures.flatMap((feat) =>
      feat.scenarios.items.flatMap((scen) => scen.parsedSteps)
    ),
  };
};
export type ParsedAnnotations = { isSkipped: boolean; isFocused: boolean };
type WithRawAnnotations = Pick<
  Yadda.parsers.FeatureParser.ScenarioExport,
  "annotations"
>;
type ParseResult<T> = {
  items: (T & ParsedAnnotations)[];
  hasFocusedItem: boolean;
};

const parseAnnotations = <T extends WithRawAnnotations>(
  rawItems: T[]
): ParseResult<T> => {
  const oneFocused = rawItems.some((item) => item.annotations.focus);
  const items = rawItems.map((item) => {
    const isFocused = item.annotations.focus;
    const isSkipped = item.annotations.skip;
    return {
      ...item,
      isSkipped: !!isSkipped || (!!oneFocused && !isFocused),
      isFocused: !!isFocused,
    };
  });
  return { items, hasFocusedItem: oneFocused };
};
