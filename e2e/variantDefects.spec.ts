/**
 * A defect in a part of the Variants step leaves the rest of the step
 * (.claude/skills/coding/react.md, "Errors": an error boundary per
 * analysis panel, and per check of the Variants step). The calculation
 * worker is made to answer with a result that passes the checks of the
 * page and that the screen cannot draw: the histograms with edges that
 * go down. The histograms give way to their headings, the error bar says
 * what happened, and the filters, their fields and the Count stay, also
 * after going to another step and back. A result of the counts that the
 * screen cannot draw is not tested so: core, which words its warnings,
 * throws the defect before a screen draws it.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const CALCULATE = "Calculate the histograms of the variants";
const COUNT = "Count the variants each filter keeps";
const MAF_SWITCH = "Filter the variants by major allele frequency (MAF)";
const MAF_LABEL = "Maximum major allele frequency, from 0 to 1";
const MISSING_LABEL = "Maximum proportion of missing genotypes, from 0 to 1";

async function openVariants(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
}

async function pick(page: Page, fixture: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, fixture));
  await expect(
    page
      .getByRole("region", { name: "Variants file" })
      .getByText(/individuals$/),
  ).toBeVisible();
}

function filters(page: Page): Locator {
  return page.getByRole("region", { name: "Filters of the variants" });
}

/** Makes the calculation worker reverse the edges of the histograms of
    the variants before it sends them. */
async function spoilHistograms(page: Page): Promise<void> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
    };
    const post = scope.postMessage.bind(scope);
    scope.postMessage = (message, transfer) => {
      const answer = message as {
        kind?: string;
        result?: { binEdges?: Float64Array };
      };
      const result = answer.result;
      if (answer.kind === "result" && result?.binEdges !== undefined) {
        result.binEdges = result.binEdges.slice().reverse();
      }
      post(message, transfer);
    };
  });
}

async function expectTheStepStands(page: Page): Promise<void> {
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
  await expect(
    filters(page).getByRole("switch", { name: MAF_SWITCH }),
  ).toBeVisible();
  await expect(page.getByLabel(MISSING_LABEL, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Variants file" }),
  ).toBeVisible();
}

test("VS6 D2 a defect in drawing the histograms leaves the filters and the Count, with the error bar, also after going to another step and back", async ({
  page,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await spoilHistograms(page);
  await filters(page).getByRole("button", { name: CALCULATE }).click();
  await expect(page.getByRole("alert")).toContainText(
    "The application met an error of its own: popnei_web defect:",
  );
  await expectTheStepStands(page);
  // Each histogram gives way to its heading.
  await expect(
    filters(page).getByRole("heading", {
      level: 3,
      name: "Observed heterozygosity",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    filters(page).getByRole("button", { name: COUNT }),
  ).toBeVisible();
  await filters(page).getByText(MAF_SWITCH, { exact: true }).click();
  await expect(page.getByLabel(MAF_LABEL, { exact: true })).toHaveValue("0.95");

  await page.goto("popgen.html#analyses");
  await expect(
    page.getByRole("heading", { level: 1, name: "Analyses" }),
  ).toBeVisible();
  await page.goto("popgen.html#variants");
  await expectTheStepStands(page);
  await expect(
    filters(page).getByRole("button", { name: COUNT }),
  ).toBeVisible();
});
