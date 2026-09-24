/**
 * The checker of accessibility, axe, built with the rules of WCAG 2.2 at
 * levels A and AA, for every flow to run at each state it reaches
 * (testing.md, "Accessibility, with axe").
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
  makeAxeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }).withTags(WCAG_22_AA));
  },
});

export { expect } from "@playwright/test";
