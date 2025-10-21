import { readFileSync } from "fs";
import { parseFeatures } from "../packages/feature-parser/parser-flow";
import { getFeatureFiles } from "../packages/feature-parser/yadda-parser";

export const loadFeatures = async (): Promise<
  { filePath: string; content: string }[]
> => {
  const featureFiles = getFeatureFiles();
  return featureFiles.map((file) => ({
    filePath: file,
    content: readFileSync(file, "utf8"),
  }));
};
