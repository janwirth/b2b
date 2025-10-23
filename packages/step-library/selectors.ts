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
  | {
      type: "function";
      expression: typeof selectAllText | "@aria-label" | "@placeholder";
    }
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

/**
 * Finds an input element by multiple strategies
 * 1. By aria-label attribute
 * 2. By associated label text (nested inside label tag)
 * 3. By associated label text (label tag with for attribute or next sibling)
 * 4. By placeholder attribute
 * @param page - Puppeteer page instance
 * @param searchTerm - The label text or aria-label to search for
 * @param options - Configuration options
 * @returns The input element or null if not found
 */
export const findInputElement = async (
  page: any,
  searchTerm: string,
  options: { timeout?: number } = {}
) => {
  const { timeout = 2000 } = options;

  // Strategy 1: Find by aria-label
  const findInputByAriaLabel = async (ariaLabel: string) => {
    return await page?.waitForSelector(inputSelector(ariaLabel), {
      timeout: 1500,
    });
  };

  // Strategy 2: Find by label tag text (handles both nested and adjacent patterns)
  const findInputByLabel = async (label: string) => {
    try {
      // Try to find input nested inside label with matching text
      const nestedXPath = `//label[contains(${translate({
        type: "function",
        expression: selectAllText,
      })}, ${translate({ type: "literal", text: label })})]//input`;

      const nestedInput = await page?.waitForSelector(`xpath/${nestedXPath}`, {
        timeout: 500,
      });

      if (nestedInput) {
        return nestedInput;
      }
    } catch {
      // Continue to next strategy
    }

    try {
      // Try to find label by text and then associated input via for attribute
      const labelXPath = `//label[contains(${translate({
        type: "function",
        expression: selectAllText,
      })}, ${translate({ type: "literal", text: label })})]`;

      const labelElement = await page?.waitForSelector(`xpath/${labelXPath}`, {
        timeout: 500,
      });

      if (labelElement) {
        const labelFor = await labelElement.evaluate(
          (el: HTMLLabelElement) => el.htmlFor
        );

        if (labelFor) {
          return await page?.waitForSelector(`#${labelFor}`, { timeout: 500 });
        }
      }
    } catch {
      // Continue to next strategy
    }

    try {
      // Try to find input next to label with matching text
      const adjacentXPath = `//label[contains(${translate({
        type: "function",
        expression: selectAllText,
      })}, ${translate({
        type: "literal",
        text: label,
      })})]//following-sibling::input[1]`;

      const adjacentInput = await page?.waitForSelector(
        `xpath/${adjacentXPath}`,
        {
          timeout: 500,
        }
      );

      if (adjacentInput) {
        return adjacentInput;
      }
    } catch {
      // Continue to next strategy
    }

    try {
      // Try to find input by placeholder attribute (case-insensitive)
      const placeholderXPath = `//*[contains(${translate({
        type: "function",
        expression: "@placeholder",
      })}, ${translate({ type: "literal", text: label })})]`;
      console.log(placeholderXPath);

      const placeholderInput = await page?.waitForSelector(
        `xpath/${placeholderXPath}`,
        {
          timeout: 500,
        }
      );

      if (placeholderInput) {
        return placeholderInput;
      }
    } catch {
      // Continue to next strategy
    }

    return null;
  };

  // Try both strategies with Promise.allSettled to handle failures gracefully
  try {
    const results = await Promise.allSettled([
      findInputByAriaLabel(searchTerm),
      findInputByLabel(searchTerm),
    ]);

    // Return the first successful result
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        return result.value;
      }
    }

    return null;
  } catch {
    return null;
  }
};
