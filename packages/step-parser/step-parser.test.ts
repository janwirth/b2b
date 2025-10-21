import { z } from "zod";
import { expect, test } from "bun:test";
import { step } from "./step-parser";
import { R } from "@mobily/ts-belt";

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
  if (!R.isOk(result)) {
    throw new Error("Expected success");
  }
  expect(R.isOk(result)).toBe(true);
});

test("step parser failure case", () => {
  const result = input_text.parse("I write the text into the input_name");
  if (R.isOk(result)) {
    throw new Error("Expected fail");
  }
  const error = R.getExn(result) as any;
  expect(error.actual).toBe("text");
  expect(error.expected).toBe("into");
  expect(error.parsed_so_far).toEqual([
    { key: "I", value: "I" },
    { key: "write", value: "write" },
    { key: "text", value: "the" },
  ]);
});

test("step parser success case", () => {
  const result = input_text.parse("I write 'Hello World' into the bio");
  if (!R.isOk(result)) {
    throw new Error("Expected success");
  }
  const success = R.getExn(result) as any;
  expect(R.isOk(result)).toBe(true);
  expect(success.args.text).toBe("Hello World");
  expect(success.args.input_name).toBe("bio");
});

test("Trim Given, when, then, and", () => {
  const result = input_text.parse("Given I write 'Hello World' into the bio");
  if (!R.isOk(result)) {
    throw new Error("Expected success");
  }
  const success = R.getExn(result);
  expect(R.isOk(result)).toBe(true);
  expect(success.args.text).toBe("Hello World");
  expect(success.args.input_name).toBe("bio");
  const result2 = input_text.parse(
    "And then I write 'Hello World' into the bio"
  );
  if (!R.isOk(result2)) {
    throw new Error("Expected success");
  }
  const success2 = R.getExn(result2);
  expect(R.isOk(result2)).toBe(true);
  expect(success2.args.text).toBe("Hello World");
  expect(success2.args.input_name).toBe("bio");
});

test("Most likely matches", () => {
  const input = "I write 'Hello World' into the bio";
  // console.log(info);
  console.log(
    `Most likely matches PASS IF LOOK GOOD: ${suggestMostLikelyMatches(input)}`
  );
});
import chalk from "chalk";
import { suggestMostLikelyMatches } from "./suggest-most-likely-matches";
