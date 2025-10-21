/**
 * DOM Selectors Module
 *
 * Provides utilities for creating CSS and XPath selectors to locate elements
 * in web pages. Includes helper functions for input fields and text-based
 * element selection using XPath expressions.
 */

export function assertUnreachable(_value: never): never {
  throw new Error("Statement should be unreachable");
}

/**
 * Creates a CSS selector for input fields by aria-label
 * @param label - The label text to match (case-insensitive)
 * @returns CSS selector string for input or textarea elements
 */
export const inputSelector = (label: string) =>
  `input[aria-label*='${label}'], textarea[aria-label*='${label}']`;

type XPathValue =
  | { type: "function"; expression: typeof selectAllText | "@aria-label" }
  | { type: "literal"; text: string };

// Concatenates multiple text nodes from an element
const selectAllText = `concat(text()[1], ' ', text()[2], text()[3], text()[4], text()[5] )`;

/**
 * Converts XPath values to string expressions
 */
const ExpressionToString = (XPathValue: XPathValue): string => {
  switch (XPathValue.type) {
    case "function":
      return XPathValue.expression;
    case "literal":
      return `"${XPathValue.text}"`;
    default:
      assertUnreachable(XPathValue);
  }
};

/**
 * Creates a normalized XPath expression for case-insensitive text matching
 */
const translate = (what: XPathValue) => {
  const searchString = ExpressionToString(what);
  return `normalize-space(translate(${searchString}, "ABCDEFGHIJKLMNOPQRSTUVWXYZ'", "abcdefghijklmnopqrstuvwxyz_"))`;
};

/**
 * Generates an XPath selector that searches for elements containing the given text
 * in either their content or aria-label attribute
 * @param searchTerm - The text to search for
 * @returns XPath selector string
 */
export const selectXPath = ({ searchTerm }: { searchTerm: string }) => {
  // Search in element text content
  const content = `//*[contains(${translate({
    type: "function",
    expression: selectAllText,
  })}, ${translate({ type: "literal", text: searchTerm })})]`;

  // Search in aria-label attributes
  const aria = `//*[contains(${translate({
    type: "function",
    expression: "@aria-label",
  })}, ${translate({ type: "literal", text: searchTerm })})]`;
  return `xpath/${content} | ${aria}`;
};
