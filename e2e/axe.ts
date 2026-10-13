/**
 * The checker of accessibility, axe, built with the rules of WCAG 2.2 at
 * levels A and AA, for every flow to run at each state it reaches
 * (testing.md, "Accessibility, with axe"), and the page of every flow,
 * whose routes go at its end.
 */
import AxeBuilder from "@axe-core/playwright";
import { test as base } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/** The tags of axe's rules for WCAG 2.0, 2.1 and 2.2, levels A and AA. */
const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

interface AxeFixture {
  /** A checker of the page as it is when `.analyze()` is called. */
  readonly makeAxeBuilder: () => AxeBuilder;
}

/**
 * A script that gives every page DejaVu Sans, the sans-serif font of
 * Ubuntu's runners, as the font of its text, before the page's own styles
 * load, so that a flow run on the Mac with POPNEI_WIDE_FONT set lays its
 * words out about as wide as on GitHub's runners, where four flows of the
 * band and of the tabs failed in October 2026 that passed on the Mac
 * (testing.md, "What differs on the runners").
 */
async function wideFontScript(): Promise<string> {
  const faces = await Promise.all(
    [
      { file: "DejaVuSans.woff2", weight: "100 500" },
      { file: "DejaVuSans-Bold.woff2", weight: "600 900" },
    ].map(async ({ file, weight }) => {
      const bytes = await readFile(
        fileURLToPath(new URL(`fixtures/fonts/${file}`, import.meta.url)),
      );
      return `@font-face { font-family: "Wide test font"; font-weight: ${weight}; src: url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2"); }`;
    }),
  );
  const css = `${faces.join("\n")}\n:root { --font-body: "Wide test font" !important; }`;
  return `(() => {
    const add = () => {
      const style = document.createElement("style");
      style.textContent = ${JSON.stringify(css)};
      document.documentElement.append(style);
    };
    if (document.documentElement === null) {
      document.addEventListener("DOMContentLoaded", add, { once: true });
    } else {
      add();
    }
  })();`;
}

export const test = base.extend<AxeFixture>({
  // At the end of a flow its routes go, and a handler of one still under
  // way, which the closing page leaves with a response disposed, throws
  // no error into the flow. A flow that crashes the worker ends while the
  // page fetches the script of the worker it makes after the crash: the
  // handler of that fetch failed a passing flow in Firefox on GitHub's
  // runner on 9 October 2026 (run 37897260261), "Response has been
  // disposed".
  page: async ({ page }, use) => {
    if (process.env["POPNEI_WIDE_FONT"] !== undefined) {
      await page.addInitScript({ content: await wideFontScript() });
    }
    await use(page);
    await page.unrouteAll({ behavior: "ignoreErrors" });
  },
  makeAxeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }).withTags(WCAG_22_AA));
  },
});

export { expect } from "@playwright/test";
