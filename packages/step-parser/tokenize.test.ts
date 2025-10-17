import { test, expect } from "bun:test";
import { tokenize } from "./tokenize";

test("tokenize", () => {
  const result = tokenize("I type 'hello world' into the input");
  expect(result).toEqual(["I", "type", "hello world", "into", "the", "input"]);
  const result2 = tokenize("I type 'hello pretty world' into the input");
  expect(result2).toEqual([
    "I",
    "type",
    "hello pretty world",
    "into",
    "the",
    "input",
  ]);
});
