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

test("Most likely matches", () => {
  const input = "I write 'Hello World' into the bio";
  // console.log(info);
  console.log(
    `Most likely matches PASS IF LOOK GOOD: ${suggestMostLikelyMatches(input)}`
  );
});
import chalk from "chalk";
import { suggestMostLikelyMatches } from "./suggest-most-likely-matches";
