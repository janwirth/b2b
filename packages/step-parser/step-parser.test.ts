import { z } from "zod";
import { expect, test } from "bun:test";
import { step, type ParseFailure, type ParseResult } from "./step-parser";
import { parseStep } from "../step-library/steps";
import { A } from "@mobily/ts-belt";
import { tokenize } from "./tokenize";

const I = "I";
const write = "write";
const into = "into";
const the = "the";
const text = z.string();
const search = "search";
const for_ = "for";

const input_text = step(
  { I, write, text, into, the, input_name: z.string() },
  async (args) => {}
);
const search_for = step(
  { I, search, for_, query: z.string() },
  async (args) => {}
);

test("step parser keyword workaround", () => {
  const result = search_for.parse("I search for 'Hello World'");
  if (result.type === "fail") {
    throw new Error("Expected success");
  }
  expect(result.type).toBe("success");
});

test("step parser failure case", () => {
  const result = input_text.parse("I write the text into the input_name");
  if (result.type === "success") {
    throw new Error("Expected fail");
  }
  expect(result.actual).toBe("text");
  expect(result.expected).toBe("into");
  expect(result.parsed_so_far).toEqual([
    { key: "I", value: "I" },
    { key: "write", value: "write" },
    { key: "text", value: "the" },
  ]);
});

test("step parser success case", () => {
  const result = input_text.parse("I write 'Hello World' into the bio");
  if (result.type === "fail") {
    throw new Error("Expected success");
  }
  expect(result.type).toBe("success");
  expect(result.args.text).toBe("Hello World");
  expect(result.args.input_name).toBe("bio");
});

test("Trim Given, when, then, and", () => {
  const result = input_text.parse("Given I write 'Hello World' into the bio");
  if (result.type === "fail") {
    throw new Error("Expected success");
  }
  expect(result.type).toBe("success");
  expect(result.args.text).toBe("Hello World");
  expect(result.args.input_name).toBe("bio");
  const result2 = input_text.parse(
    "And then I write 'Hello World' into the bio"
  );
  if (result2.type === "fail") {
    throw new Error("Expected success");
  }
  expect(result2.type).toBe("success");
  expect(result2.args.text).toBe("Hello World");
  expect(result2.args.input_name).toBe("bio");
});

const scores: Record<string, number> = {
  I: 1,
  write: 2,
  text: 1,
  into: 2,
  the: 1,
  input_name: 1,
};
test.only("Most likely matches", () => {
  const input = "I write 'Hello World' into the bio";
  const tokens = tokenize(input);
  const result = parseStep(input);
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
    .map((x) => `- ${x.step.description}`)
    .join("\n");
  const info = `
${chalk.red("Could not parse step")}

> ${input}

Did you mean one of the following?:

${candidates}
`;
  console.log(info);
});
import chalk from "chalk";
