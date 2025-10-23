import { z } from "zod";
import { expect, test } from "bun:test";
import { step } from "./step-parser";
import { suggestMostLikelyMatches } from "./suggest-most-likely-matches";

const I = "I";
const write = "write";
const into = "into";
const the = "the";
const text = z.string();
const search = "search";
const for_ = "for";

const input_text = step(
  { I, write, text, into, the, input_name: z.string() },
  async (args) => {
    return { type: "success" };
  }
);
const search_for = step(
  { I, search, for_, query: z.string() },
  async (args) => {
    return { type: "success" };
  }
);

test("step parser keyword workaround", () => {
  const result = search_for.parse("I search for 'Hello World'");
  if ("expected" in result) {
    throw new Error("Expected success");
  }
  expect("args" in result).toBe(true);
});

// test("patience", () => {
//   const result = search_for.parse("I search for 'Hello World' patiently");
//   if (result.type === "failure") {
//     throw new Error("Expected success");
//   } else {
//   }
// });

test("step parser failure case", () => {
  const result = input_text.parse("I write the text into the input_name");
  if ("args" in result) {
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
  if ("expected" in result) {
    throw new Error("Expected success");
  }
  expect("args" in result).toBe(true);
  expect(result.args.text).toBe("Hello World");
  expect(result.args.input_name).toBe("bio");
});

test("Trim Given, when, then, and", () => {
  const result = input_text.parse("Given I write 'Hello World' into the bio");
  if ("expected" in result) {
    throw new Error("Expected success");
  }
  expect("args" in result).toBe(true);
  expect(result.args.text).toBe("Hello World");
  expect(result.args.input_name).toBe("bio");
  const result2 = input_text.parse(
    "And then I write 'Hello World' into the bio"
  );
  if ("expected" in result2) {
    throw new Error("Expected success");
  }
  expect("args" in result2).toBe(true);
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

test("patience", () => {
  const result = input_text.parse(
    "I write 'Hello World' into the bio patiently"
  );
  if ("expected" in result) {
    throw new Error("Expected success");
  }
  expect("args" in result).toBe(true);
  expect(result.args.text).toBe("Hello World");
  expect(result.args.input_name).toBe("bio");
  expect(result.patiently).toBe(true);
});
