/**
 * The checker of accessibility, axe, built with the rules of WCAG 2.2 at
 * levels A and AA, for every flow to run at each state it reaches
 * (testing.md, "Accessibility, with axe"), and the page of every flow,
 * whose routes go at its end.
 */
import AxeBuilder from "@axe-core/playwright";
import { test as base } from "@playwright/test";

/** The tags of axe's rules for WCAG 2.0, 2.1 and 2.2, levels A and AA. */
const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

interface AxeFixture {
  /** A checker of the page as it is when `.analyze()` is called. */
  readonly makeAxeBuilder: () => AxeBuilder;
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
    await use(page);
    await page.unrouteAll({ behavior: "ignoreErrors" });
  },
  makeAxeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }).withTags(WCAG_22_AA));
  },
});

export { expect } from "@playwright/test";
