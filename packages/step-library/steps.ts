/**
 * Steps Module
 *
 * Combines step parsing and execution functionality using the new step-parser.
 * This module replaces the old syntax.ts and index.ts approach with a more
 * structured step definition system.
 */

import type { Browser, ElementHandle, Page, ScreenRecorder } from "puppeteer";
import { fetch } from "bun";
import puppeteer from "puppeteer";
import { z } from "zod";
import {
  step,
  type ParseFailure,
  type ParseResult,
  type Step,
} from "../step-parser";
import { ocrImageAtUrl } from "./ocr";
import { inputSelector, selectXPath, assertUnreachable } from "./selectors";
import { existsSync, readFileSync } from "node:fs";
import { dir_exists } from "../../dir_exists";
import { readFile } from "node:fs/promises";

// Types
export type Context = {
  browser?: Browser;
  page?: Page;
  recorder?: ScreenRecorder;
  featureFilePath: string;
};

export type StepResult =
  | { type: "success" }
  | { type: "failure"; image?: string; message: string };

// Helper functions
const timeout = (ms: number) => new Promise((res) => setTimeout(res, ms));

export function cleanStringArgs(input: string | undefined) {
  return input?.trim().replaceAll(/(^['"]|['"]$)/g, "") ?? "";
}

export function normalizeUrl(input: string, defaultProtocol = "http:") {
  const input_ = input.trim();
  const hasProtocol = input_.includes("://");
  if (hasProtocol) {
    return input_;
  } else {
    return `${defaultProtocol}//${input_}`;
  }
}
var browsers: Browser[] = [];

export const shutdownBrowsers = async () => {
  for (const browser of browsers) {
    await browser.close();
  }
  browsers = [];
};

// Browser setup
const ensurePage = async (context: Context, headless: boolean) => {
  if (!context.browser) {
    context.browser = await puppeteer.launch({ headless });
    browsers.push(context.browser);
    const bContext = context.browser.defaultBrowserContext();
    await bContext.overridePermissions("http://localhost:3000", [
      "clipboard-read",
      "clipboard-write",
      "clipboard-sanitized-write",
    ]);
  }
  context.page = (await context.browser.pages())[0];
  if (!context.page) {
    context.page = await context.browser.newPage();

    context.page.on("request", (req) => {
      if (req.url().includes("/api/cv-management/upload"))
        console.log("Uploading:", req.headers()["content-type"]);
    });

    await context.page.evaluate(() => {
      const clipboard = {
        text: "",
        async writeText(text: string) {
          this.text = text;
        },
        async readText() {
          return this.text;
        },
      };
      Object.defineProperty(navigator, "clipboard", { value: clipboard });
    });
  }
  const server_up = await fetch("http://localhost:3000", { method: "GET" });
  if (!context.page.url().includes("localhost:3000")) {
    await context.page.goto("http://localhost:3000");
  }
  return [context.browser, context.page] as [Browser, Page];
};

// Keywords - consistent constants for all step definitions
const I = "I";
const search = "search";
const for_ = "for";
const open = "open";
const copied = "copied";
const link = "link";
const the = "the";
const find = "find";
const see = "see";
const read = "read";
const in_ = "in";
const browser = "browser";
const tab = "tab";
const do_ = "do";
const not = "not";
const click = "click";
const type_ = "type";
const into = "into";
const contains = "contains";
const image = "image";
const does = "does";
const contain = "contain";
const title = "title";
const upload = "upload";
const select = "select";
const file = "file";
const wait = "wait";
const seconds = "seconds";
const reload = "reload";
const page = "page";

// Step definitions using the new step-parser
export const steps = {
  // "I search for <query>"
  search: step(
    {
      I,
      search,
      for_,
      query: z.string(),
    },
    async ({ query }, context) => {
      const [browser, page] = await ensurePage(context, true);
      await page?.type('input[type="search"]', query);
      return { type: "success" };
    }
  ),

  // "I open the copied link"
  openCopiedLink: step(
    {
      I,
      open,
      the,
      copied,
      link,
    },
    async (_, context) => {
      const [browser, page] = await ensurePage(context, true);
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      try {
        await page?.goto(copied);
      } catch (e) {
        throw new Error(`Could not open link from clipboard:
          the URL is '${copied}'
         
${(e as Error).message}
          `);
      }
      return { type: "success" };
    }
  ),

  // "I find <text> in <label>"
  find: step(
    {
      I,
      find,
      text: z.string(),
      in: in_,
      label: z.string(),
    },
    async ({ text, label }, context) => {
      const [browser, page] = await ensurePage(context, true);
      await page.waitForNetworkIdle();
      let tries = 0;
      for (tries = 0; tries < 10; tries++) {
        await timeout(100);
        try {
          const textValue = await page.$eval(
            inputSelector(label),
            (input) => (input as HTMLInputElement).value
          );
          if (
            textValue
              .toLowerCase()
              .includes(cleanStringArgs(text).toLowerCase())
          ) {
            return { type: "success" };
          } else {
            throw new Error(
              `input ${label} does not contain ${text}: ${textValue}`
            );
          }
        } catch (e) {}
      }
      throw new Error(`Could not find input ${inputSelector(label)}`);
    }
  ),

  // "I see <text>"
  see: step(
    {
      I,
      see,
      text: z.string(),
    },
    async ({ text }, context) => {
      await timeout(100);
      const [browser, page] = await ensurePage(context, true);
      const txt = text.trim().replaceAll(/(^['"]|['"]$)/g, "");
      try {
        await page.waitForSelector(selectXPath({ searchTerm: txt }), {
          timeout: 10000,
          // visible: true,
        });
      } catch (e) {
        throw new Error(`can not find '${txt}'

${selectXPath({ searchTerm: txt })}

        `);
      }
      return { type: "success" };
    }
  ),

  // "I read the <text> in the browser tab"
  readInBrowserTab: step(
    {
      I,
      read,
      text: z.string(),
      in_,
      the,
      browser,
      tab,
      title,
    },
    async ({ text }, context) => {
      const [browser, page] = await ensurePage(context, true);
      const title = await page.title();
      if (title.includes(text)) {
        return { type: "success" };
      } else {
        throw new Error(`title does not contain '${text}':\n${title}`);
      }
    }
  ),

  // "I do not see <text>"
  doNotSee: step(
    {
      I,
      do_,
      not,
      see,
      text: z.string(),
    },
    async ({ text }, context) => {
      const [browser, page] = await ensurePage(context, true);
      await page.waitForNetworkIdle();
      try {
        await page.waitForSelector(selectXPath({ searchTerm: text.trim() }), {
          timeout: 500,
        });
      } catch (e) {
        return { type: "success" };
      }
      throw new Error(`can see '${text.trim()}' but should not`);
    }
  ),

  // "I click <text>"
  click: step(
    {
      I,
      click,
      text: z.string(),
    },
    async ({ text }, context) => {
      const [browser, page] = await ensurePage(context, true);
      const txt__ = text.trim().replaceAll(/(^['"]|['"]$)/g, "");
      try {
        let el: ElementHandle<Element> | null = null;
        try {
          el = await page.waitForSelector(selectXPath({ searchTerm: txt__ }), {
            timeout: 500,
            visible: true,
          });
        } catch (e) {
          console.error("SELECTOR NOT VISIBLE");
          el = await page.waitForSelector(selectXPath({ searchTerm: txt__ }), {
            timeout: 3000,
            visible: true,
          });
        }
        el!.click();
        await timeout(200);

        // const toClick = await page.click(selectXPath({ searchTerm: txt__ }, {timeout: }));
        // const toClick = await page.waitForSelector(
        //   selectXPath({ searchTerm: txt__ }),
        //   { timeout: 100 }
        // );
      } catch (e) {
        throw new Error(
          `can not click on '` +
            txt__ +
            `'
  
    ${(e as Error).message}
    `
        );
      }
      return { type: "success" };
    }
  ),

  // "I open <url>"
  open: step(
    {
      I,
      open,
      url: z.string(),
    },
    async ({ url }, context) => {
      const [browser, page] = await ensurePage(context, true);
      const normalized = normalizeUrl(url);
      try {
        await page.goto(normalized, { waitUntil: "networkidle2" });
        // await page.waitForNetworkIdle();
      } catch (e) {
        throw new Error(`Could not open link:
          the URL is '${normalized}'
         
${(e as Error).message}
          `);
      }
      return { type: "success" };
    }
  ),

  // "I type <text> into <label>"
  type: step(
    {
      I,
      type: type_,
      text: z.string(),
      into,
      label: z.string(),
    },
    async ({ text, label }, context) => {
      const [browser, page] = await ensurePage(context, true);
      const sel = label.trim().replaceAll(/(^['"]|['"]$)/g, "");
      const input = await page?.waitForSelector(inputSelector(sel), {
        timeout: 1000,
      });
      if (!input) {
        throw new Error(`Could not find input ${inputSelector(sel)}`);
      }
      await input.click({ clickCount: 3 });
      await input.type(text.replaceAll(/(^['"]|['"]$)/g, ""));
      return { type: "success" };
    }
  ),

  // "the url contains <text>"
  urlContains: step(
    {
      the,
      url: "url",
      contains,
      text: z.string(),
    },
    async ({ text }, context) => {
      const [browser, page] = await ensurePage(context, true);
      const url = await page.url();
      if (!url.toLowerCase().includes(text)) {
        throw new Error(`Url does not contain ${text}:
            ${url}
        `);
      }
      return { type: "success" };
    }
  ),

  // "the image contains <text>"
  imageContains: step(
    {
      the,
      image,
      contains,
      text: z.string(),
    },
    async ({ text }, context) => {
      const [browser, page] = await ensurePage(context, true);
      const url = await page.url();
      const content = await ocrImageAtUrl(url);
      const txt_ = text.trim().replaceAll(/(^['"]|['"]$)/g, "");

      if (!content.toLowerCase().includes(txt_.toLowerCase())) {
        throw new Error(`Image does not contain '${text}':\n${content}

Instead we read:
${content}
        `);
      }
      return { type: "success" };
    }
  ),

  // "the image does not contain <text>"
  imageDoesNotContain: step(
    {
      the,
      image,
      does,
      not,
      contain,
      text: z.string(),
    },
    async ({ text }, context) => {
      const [browser, page] = await ensurePage(context, true);
      const url_ = (await page.url()) + "/image";
      try {
        const content_ = await ocrImageAtUrl(url_);
        if (content_.toLowerCase().includes(text.toLowerCase())) {
          throw new Error(`Opengraph image contains '${text}':\n${content_}

Instead we read:
${content_}
        `);
        }
      } catch (e) {
        throw new Error(`could not read image at url:
${url_}

${(e as Error).message}
        `);
      }
      return { type: "success" };
    }
  ),

  // "I upload <filename>"
  upload: step(
    {
      I,
      select,
      the,
      file,
      filename: z.string(),
    },
    async ({ filename }, context) => {
      const [browser, page] = await ensurePage(context, true);
      const cleanFilename = cleanStringArgs(filename);

      // Look for file input element
      const fileInput = await page.$('input[type="file"]');

      if (!fileInput) {
        throw new Error(`Could not find file input element on the page`);
      }

      // Get the path relative to the feature file directoryuuukx
      let filePath: string;
      if (context.featureFilePath) {
        // Get the directory of the feature file
        const featureDir = context.featureFilePath.substring(
          0,
          context.featureFilePath.lastIndexOf("/")
        );
        filePath = `${featureDir}/${cleanFilename}`;
        await uploadFile(page, filePath);
        return { type: "success" };
      } else {
        throw new Error("Feature file path not found");
      }
    }
  ),

  // "I wait <number> seconds"
  wait: step(
    {
      I,
      wait,
      duration: z.string().transform((val) => parseInt(val)),
      seconds,
    },
    async ({ duration }, context) => {
      await timeout(duration * 1000);
      return { type: "success" };
    }
  ),

  // "I reload the page"
  reload: step(
    {
      I,
      reload,
      the,
      page,
    },
    async (_, context) => {
      const [browser, page] = await ensurePage(context, true);
      await page.reload({ waitUntil: "networkidle2" });
      return { type: "success" };
    }
  ),
};

const uploadFile = async (page: Page, filePath: string) => {
  const file = await readFile(filePath);

  // 2. Convert to base64 so we can safely send it to the browser
  const base64 = file.toString("base64");
  await page.evaluate(
    async (base64: string, filePath: string) => {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // 4. Create Blob with correct MIME
      const blob = new Blob([bytes], { type: "application/pdf" });
      //Create blob and file from file string
      const b = blob;
      const dt = new DataTransfer();
      dt.items.add(new File([b], filePath.split("/").pop() || "file"));

      //Simulate drag and drop on your input field using DataTransfer class
      const ele = document.querySelector("input[type=file]");
      console.log("ele", ele);
      if (ele) {
        (ele as HTMLInputElement).files = dt.files;
        (ele as HTMLInputElement).dispatchEvent(
          new Event("input", { bubbles: true })
        );
        (ele as HTMLInputElement).dispatchEvent(
          new Event("change", { bubbles: true })
        );
      }
    },
    base64,
    filePath
  );
};

// Find the best matching step definition
export const parseStep = (stepString: string) => {
  let failedSteps: { parseResult: ParseFailure; step: Step<any, any> }[] = [];
  for (const [stepName, stepDef] of Object.entries(steps)) {
    const parseResult = stepDef.parse(stepString);
    if (parseResult.type === "success") {
      return parseResult;
    }
    failedSteps.push({ parseResult, step: stepDef });
  }
  // log all the failed steps
  // console.error("Failed to parse step", failedSteps);
  return { type: "Err" as const, step: stepString, failedSteps };
};

// Export types for compatibility
// export type StepTypes = Exclude<ReturnType<typeof parseStep>, { type: "Err" }>;

// Re-export utilities
export { ocrImageAtUrl } from "./ocr";
export { inputSelector, selectXPath, assertUnreachable } from "./selectors";

export const printCheatSheet = () => {
  for (const [stepName, stepDef] of Object.entries(steps)) {
    console.log(stepDef.description);
  }
};
