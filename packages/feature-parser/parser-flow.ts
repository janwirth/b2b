// string -> Yadda -> Decoded -> DecodedWithSkip
import type { FeatureExport } from "yadda/lib/parsers/FeatureParser";
import {
  AnnotationsSchema,
  type AllowedAnnotations,
  type FeatureSkipReason,
} from "./loadFeatures";
import { parseFeature, type YaddaFeatureExport } from "./yadda-parser";
import type {
  DecodedScenario,
  YaddaAnnotations,
  YaddaScenarioExport,
} from "./yadda-parser";
import {
  determineFeatureSkipReason,
  determineScenarioSkipReason,
} from "./skipreason.test";

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

const pipeline = async (files: { filePath: string; content: string }[]) => {
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
      return {
        parsed: parseAnnotations({
          ...x.parsed,
          scenarios: x.parsed.scenarios.map(parseAnnotations),
        }),
        filePath: x.filePath,
      };
    }
    return [];
  });
  // with skip reasons
  const withSkipReasons = parsed.map((x) => {
    const otherFeatures = parsed.filter((y) => y.filePath !== x.filePath);
    const otherFeaturesAnnotations = otherFeatures.flatMap(
      (y) => y.parsed.parsed_annotations
    );
    return {
      ...x,
      skipReason: determineFeatureSkipReason({
        annotations: x.parsed.parsed_annotations,
        otherFeatures: otherFeaturesAnnotations,
      }),
      scenarios: x.parsed.scenarios.map((y) => {
        const otherScenarios = x.parsed.scenarios.filter(
          (z) => z.title !== y.title
        );
        const otherScenariosAnnotations = otherScenarios.map(
          (z) => z.parsed_annotations
        );
        return {
          ...y,
          skipReason: determineScenarioSkipReason({
            annotations: y.parsed_annotations,
            otherScenarios: otherScenariosAnnotations,
            otherFeatures: otherFeaturesAnnotations,
          }),
        };
      }),
    };
  });
  return withSkipReasons;
};
// where we want to end up

type DecodedFeature = {
  title: string;
  annotations: AllowedAnnotations[];
  skipReason: FeatureSkipReason | null;
  isFocused: boolean;
  scenarios: DecodedScenario[];
}[];
