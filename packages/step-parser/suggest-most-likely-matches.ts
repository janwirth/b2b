import { tokenize } from "./tokenize";
import { findBestStep } from "../step-library/steps";
import { A } from "@mobily/ts-belt";
import chalk from "chalk";

export const suggestMostLikelyMatches = (input: string): string => {
  const tokens = tokenize(input);
  const result = findBestStep(input);
  if (result.type === "success") {
    throw new Error("Expected fail");
  }
  const evaled = result.failedSteps.map((f) => {
    const candidate_tokens = tokenize(f.step.description);
    const intersection = A.intersection(tokens, candidate_tokens);
    const score = intersection.reduce(
      (acc, token) => acc + (scores[token] ?? 1),
      0
    );
    return { ...f, score };
  });
  const sorted = A.sortBy(evaled, (x) => -x.score);
  const candidates = sorted
    .slice(0, 3)
    .map((x) => `  - ${x.step.description}`)
    .join("\n");
  const info = `

  > ${input}

Did you mean one of the following?:

${candidates}

Did you forget "quotation marks"?
`;
  return info;
};

const scores: Record<string, number> = {
  I: 1,
  write: 2,
  text: 1,
  into: 2,
  the: 1,
  input_name: 1,
};
