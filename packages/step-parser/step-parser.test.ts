import { z } from "zod";
import { expect, test } from "bun:test";
import { step } from "./step-parser";
import { type Result } from "../result/result";
import { suggestMostLikelyMatches } from "./suggest-most-likely-matches";
import { getError } from "./getError";

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
  if (result._tag !== "Success") {
    throw new Error("Expected success");
  }
  expect(result._tag).toBe("Success");
});

test("step parser failure case", () => {
  const result = input_text.parse("I write the text into the input_name");
  if (result._tag === "Success") {
    throw new Error("Expected fail");
  }
  const error = getError(result);
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
  if (result._tag !== "Success") {
    throw new Error("Expected success");
  }
  const success = result.value;
  expect(result._tag).toBe("Success");
  expect(success.args.text).toBe("Hello World");
  expect(success.args.input_name).toBe("bio");
});

test("Trim Given, when, then, and", () => {
  const result = input_text.parse("Given I write 'Hello World' into the bio");
  if (result._tag !== "Success") {
    throw new Error("Expected success");
  }
  const success = result.value;
  expect(result._tag).toBe("Success");
  expect(success.args.text).toBe("Hello World");
  expect(success.args.input_name).toBe("bio");
  const result2 = input_text.parse(
    "And then I write 'Hello World' into the bio"
  );
  if (result2._tag !== "Success") {
    throw new Error("Expected success");
  }
  const success2 = result2.value;
  expect(result2._tag).toBe("Success");
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
