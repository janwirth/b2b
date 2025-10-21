// string -> Yadda -> Decoded -> DecodedWithSkip
import type { FeatureExport } from "yadda/lib/parsers/FeatureParser";
import {
  AnnotationsSchema,
  type AllowedAnnotations,
  type FeatureSkipReason,
  type ScenarioSkipReason,
} from "./loadFeatures";
import { parseFeature, type YaddaFeatureExport } from "./yadda-parser";
import type { YaddaAnnotations, YaddaScenarioExport } from "./yadda-parser";
import {
  determineFeatureSkipReason,
  determineScenarioSkipReason,
} from "./skipreason";

const parseAnnotations = <T extends { annotations: YaddaAnnotations }>(
  yaddaAnnotated: T
): T & { parsed_annotations: AllowedAnnotations[] } => {
  return {
    ...yaddaAnnotated,
    parsed_annotations: AnnotationsSchema.parse(yaddaAnnotated.annotations),
  };
};

type WithAnnotations<T> = T & { annotations: AllowedAnnotations[] };

type RecordWithRequired<K extends keyof any, T, Base = {}> = Omit<Base, K> & {
  [P in K]-?: T;
};

type YaddaAnnotatedList<T> = RecordWithRequired<
  "parsed_annotations",
  YaddaAnnotations
>[];
type AnnotatedList<T> = RecordWithRequired<
  "parsed_annotations",
  AllowedAnnotations[]
>[];

const annotateList = <T extends YaddaAnnotatedList<T>>(
  list: T
): AnnotatedList<T> => {
  return list.map((x) => {
    return {
      ...x,
      parsed_annotations: AnnotationsSchema.parse(x.parsed_annotations),
    };
  });
};

export const parseFeatures = async (
  files: { filePath: string; content: string }[]
) => {
  const parsed_ = await Promise.all(
    files.map((x) => {
      return {
        filePath: x.filePath,
        content: x.content,
        parsed: parseFeature(x.content),
      };
    })
  );
  // ensure all exist and parse yadda flags
  const parsed = parsed_.flatMap((x) => {
    if (x.parsed !== null) {
      return parseAnnotations({
        ...x.parsed,
        filePath: x.filePath,
        scenarios: x.parsed.scenarios.map(parseAnnotations),
      });
    }
    return [];
  });
  // with skip reasons
  const withSkipReasons: DecodedFeature[] = parsed.map((x) => {
    const otherFeatures = parsed.filter((y) => y.filePath !== x.filePath);
    const otherFeaturesAnnotations = otherFeatures.flatMap(
      (y) => y.parsed_annotations
    );
    const scenarios: DecodedScenario[] = x.scenarios.map((y) => {
      const otherScenarios = x.scenarios.filter((z) => z.title !== y.title);
      const otherScenariosAnnotations = otherScenarios.map(
        (z) => z.parsed_annotations
      );
      return {
        ...y,
        isFocused: y.parsed_annotations.includes("focus"),
        skipReason: determineScenarioSkipReason({
          annotations: y.parsed_annotations,
          otherScenarios: otherScenariosAnnotations,
          otherFeatures: otherFeaturesAnnotations,
        }),
      };
    });
    return {
      ...x,
      skipReason: determineFeatureSkipReason({
        annotations: x.parsed_annotations,
        otherFeatures: otherFeaturesAnnotations,
      }),
      isFocused: x.parsed_annotations.includes("focus"),
      scenarios,
    };
  });
  return withSkipReasons;
};
// where we want to end up

export type DecodedFeature = {
  title: string;
  parsed_annotations: AllowedAnnotations[];
  skipReason: FeatureSkipReason | null;
  isFocused: boolean;
  scenarios: DecodedScenario[];
  filePath: string;
};
import { z } from "zod";

export type DecodedScenario = {
  title: string;
  parsed_annotations: z.infer<typeof AnnotationsSchema>;
  skipReason: ScenarioSkipReason | null;
  steps: string[];
};
