import { z } from "zod";
import { tokenize } from "./tokenize";
import type { Context } from "../step-library/steps";

export type InferStep<T extends Record<string, any>> = {
  [K in keyof T as T[K] extends string ? never : K]: T[K] extends z.ZodTypeAny
    ? z.infer<T[K]>
    : never;
};

export type ParseSuccess<T> = {
  type: "success";
  args: T;
  execute: (
    context: Context
  ) => Promise<{ type: "success" } | { type: "failure"; message: string }>;
};

export type ParseFailure = {
  type: "failure";

  expected: string;
  actual: string;
  parsed_so_far: { key: string; value: any }[];
  input: string;
};

export type ParseResult<Input, Output> = ParseSuccess<Input> | ParseFailure;

export type ParserTypes =
  | string
  | z.ZodString
  | z.ZodURL
  | z.ZodTransform<any, any>;
// | z.ZodEffects<any, any>;
export type Step<T extends Record<string, ParserTypes>, Output> = {
  description: string;
  parse: (step: string) => ParseResult<InferStep<T>, Output>;
};

export function step<T extends Record<string, ParserTypes>, Output>(
  defs: T,
  execute: (
    step: InferStep<T>,
    context: Context
  ) => Promise<{ type: "success" } | { type: "failure"; message: string }>
): Step<T, Output> {
  const [first, ...rest] = Object.entries(defs)
    .map(([key, value]) => {
      if (typeof value === "string") {
        return `${key.replace(/_/g, "")}`;
      }
      return `{${key}}`;
    })
    .join(" ");
  const description = `${first.toUpperCase()}${rest.join("")}`;
  const parsers = Object.entries(defs);

  const parse = (step: string): ParseResult<InferStep<T>, Output> => {
    const tokens = tokenize(step);
    const parsed_so_far: any[] = [];
    const result: Record<string, any> = {};

    // Loop through each token and parser
    const maxLength = Math.max(tokens.length, parsers.length);
    for (let i = 0; i < maxLength; i++) {
      const token = tokens[i];
      const parserEntry = parsers[i];

      // Check if we've run out of tokens
      if (token === undefined) {
        return {
          type: "failure",

          expected: `${parsers.length} tokens`,
          actual: `${tokens.length} tokens`,
          parsed_so_far,
          input: step,
        };
      }

      // Check if we've run out of parsers
      if (parserEntry === undefined) {
        return {
          type: "failure",

          expected: `${parsers.length} tokens`,
          actual: `${tokens.length} tokens`,
          parsed_so_far,
          input: step,
        };
      }

      const [key, parser] = parserEntry;

      let parseResult;
      if (typeof parser === "string") {
        parseResult = z.literal(parser).safeParse(token);
      } else {
        parseResult = parser.safeParse(token);
      }

      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        let expected = issue?.message || "valid value";

        // Clean up Zod error messages to extract just the expected value
        if (typeof parser === "string") {
          expected = parser; // For string literals, just use the expected string
        } else if (expected.includes("expected")) {
          // Extract the expected value from Zod error messages like "Invalid input: expected "into""
          const match = expected.match(/expected "([^"]+)"/);
          if (match) {
            expected = match[1];
          }
        }

        return {
          type: "failure",
          expected: expected,
          actual: token,
          parsed_so_far,
          input: step,
        };
      }

      result[key] = parseResult.data;
      parsed_so_far.push({ key, value: parseResult.data });
    }

    return {
      type: "success",
      args: result as InferStep<T>,
      execute: (context: Context) => execute(result as InferStep<T>, context),
    };
  };

  return { description, parse };
}
