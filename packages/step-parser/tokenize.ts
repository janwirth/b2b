export const tokenize = (step: string): string[] => {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < step.length; i++) {
    const char = step[i];

    if (!inQuotes && (char === "'" || char === '"')) {
      // Starting a quoted string
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar) {
      // Ending a quoted string
      inQuotes = false;
      quoteChar = "";
    } else if (!inQuotes && char === " ") {
      // Space outside quotes - end current token
      if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
    } else {
      // Regular character
      current += char;
    }
  }

  // Add the last token if there is one
  if (current.trim()) {
    tokens.push(current.trim());
  }
  // remove leading and trailing Given, when, then, and
  const [first, second, ...rest] = tokens;
  const keywords = ["and", "given", "when", "then"];
  return tokens.filter((token, idx) => {
    if (idx < 2) {
      return !keywords.includes(token.toLowerCase());
    }
    return true;
  });
};
