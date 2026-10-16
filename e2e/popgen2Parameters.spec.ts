/**
 * The sections "Parameters" of popgen2.html, on the built site
 * (docs/plans/popgen2-tidy.md, phase 3; docs/specs/steps/popgen2-pca.md,
 * "The PCA tab", the section "Parameters", and "How it is checked"):
 * one in the PCA tab, two in the Populations tab, the diversity's and
 * the LD decay's, and one in the Distances tab, each closed when the
 * page opens, its button with `aria-expanded`; the Tab key reaches the
 * button, Enter opens it and Space closes it; an option inside works as
 * before; an option greyed while its analysis runs is reached inside the
 * open section; a distance emptied locks Run with a reason beside it
 * that stays visible with the section closed; and a section opened stays
 * open while the user moves between tabs. axe on each state.
 *
 * panel.nei holds 1,200 variants of 200 diploid individuals, and
 * panel_pops.csv puts them in p0, p2 and p1.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";
import type AxeBuilder from "@axe-core/playwright";

import { expect, test } from "./axe.ts";
import { holdSummary, release } from "./holdWorker.ts";
import { parametersButton } from "./parameters.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** A run, or the one pass, can take this long on a loaded machine. */
const RESULT_TIMEOUT = 30_000;

/** The words beside Run of the PCA with the distance of its LD pruning
    emptied. */
const PCA_NO_DISTANCE =
  "Type the LD distance in Parameters, or turn the LD pruning off.";

/** The same in full, under the field, inside the section. */
const PCA_NO_DISTANCE_FULL =
  "The LD pruning of the PCA needs the distance within which variants are compared. Type a distance in base pairs, 100,000 to start with, or turn the LD pruning off.";

/** The words beside Run of the LD decay with its largest distance
    emptied. */
const LD_NO_DISTANCE = "Type the largest distance in Parameters.";

/** The reason every option a running PCA reads waits with. */
const PCA_LOCKED =
  "Stop the PCA in the PCA tab to change the filters; then press Run there to calculate it again.";

/** Picks the variants file `name`, a fixture. */
async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants", exact: true })
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** Opens the individuals file `name`, a fixture. */
async function pickIndividuals(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Individuals", exact: true })
    .getByRole("button", { name: /^Open (another )?individuals file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** The tab of the row named `name`. */
function tab(
  page: Page,
  name: "Variants" | "PCA" | "Populations" | "Distances",
): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shown(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** The part of the analysis `id` in the tab shown. */
function part(page: Page, id: "diversity" | "ldDecay"): Locator {
  return shown(page).locator(`[data-panel-analysis="${id}"]`);
}

/** The button of `scope` named `name`. */
function button(scope: Locator, name: "Run" | "Stop"): Locator {
  return scope.getByRole("button", { name, exact: true });
}

/** The drop-down list of the PCA's method, named by its item and its
    label. */
function method(page: Page): Locator {
  return shown(page).getByRole("button", { name: /Method$/u });
}

/** The field of the distance of the PCA's LD pruning. */
function pcaDistance(page: Page): Locator {
  return shown(page).getByRole("textbox", {
    name: "Distance within which variants are compared, in base pairs, from 1",
  });
}

/** The field of the LD decay's largest distance. */
function ldDistance(page: Page): Locator {
  return part(page, "ldDecay").getByRole("textbox", {
    name: "Largest distance between the two variants of a pair, in base pairs, from 50",
  });
}

/** axe on the page as it is, in the light and the dark theme. */
async function expectNoAxeViolations(
  page: Page,
  makeAxeBuilder: () => AxeBuilder,
): Promise<void> {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
  }
  await page.emulateMedia({ colorScheme: "light" });
}

/** Opens popgen2.html with panel.nei and panel_pops.csv, and waits for
    the PCA's Run once the one pass has read the file to the end. */
async function openBoth(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await pick(page, "panel.nei");
  await pickIndividuals(page, "panel_pops.csv");
  await tab(page, "PCA").click();
  await expect(button(shown(page), "Run")).toBeEnabled({
    timeout: RESULT_TIMEOUT,
  });
}

test.describe("popgen2-tidy phase 3: the sections Parameters", () => {
  test("each closed when the page opens, the options hidden and Run shown, in the PCA, Populations and Distances tabs", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await openBoth(page);
    const pcaSection = parametersButton(shown(page));
    await expect(pcaSection).toHaveCount(1);
    await expect(pcaSection).toHaveAttribute("aria-expanded", "false");
    await expect(method(page)).toBeHidden();
    await expect(button(shown(page), "Run")).toBeVisible();
    await expectNoAxeViolations(page, makeAxeBuilder);

    await tab(page, "Populations").click();
    for (const id of ["diversity", "ldDecay"] as const) {
      const section = parametersButton(part(page, id));
      await expect(section).toHaveCount(1);
      await expect(section).toHaveAttribute("aria-expanded", "false");
      await expect(button(part(page, id), "Run")).toBeVisible();
    }
    await expect(
      shown(page).getByRole("textbox", {
        name: "Chromosomes drawn for the rarefaction, a whole number from 2",
      }),
    ).toBeHidden();
    await expect(ldDistance(page)).toBeHidden();
    await expectNoAxeViolations(page, makeAxeBuilder);

    await tab(page, "Distances").click();
    const distances = parametersButton(shown(page));
    await expect(distances).toHaveCount(1);
    await expect(distances).toHaveAttribute("aria-expanded", "false");
    await expect(
      shown(page).getByRole("radio", { name: "Jost's D" }),
    ).toBeHidden();
    await expect(button(shown(page), "Run")).toBeEnabled({
      timeout: RESULT_TIMEOUT,
    });
    await expectNoAxeViolations(page, makeAxeBuilder);
  });

  test("the Tab key reaches the button after the row of tabs, Enter opens the section and Space closes it, aria-expanded following; the method is the next stop once open", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await openBoth(page);
    const trigger = parametersButton(shown(page));
    await tab(page, "PCA").focus();
    await page.keyboard.press("Tab");
    await expect(trigger).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(method(page)).toBeVisible();
    await expect(
      shown(page).getByRole("group", { name: "Parameters", exact: true }),
    ).toBeVisible();
    await expectNoAxeViolations(page, makeAxeBuilder);
    await page.keyboard.press("Tab");
    await expect(method(page)).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Space");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(method(page)).toBeHidden();
    // Closed, the next stop is Run, past the hidden options.
    await page.keyboard.press("Tab");
    await expect(button(shown(page), "Run")).toBeFocused();

    // The same keys on a section of the Populations tab.
    await tab(page, "Populations").click();
    const ldTrigger = parametersButton(part(page, "ldDecay"));
    await ldTrigger.focus();
    await page.keyboard.press("Space");
    await expect(ldTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(ldDistance(page)).toBeVisible();
    await expect(parametersButton(part(page, "diversity"))).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await page.keyboard.press("Enter");
    await expect(ldTrigger).toHaveAttribute("aria-expanded", "false");
  });

  test("a distance emptied inside the section locks Run with a reason beside it, which stays visible with the section closed; typed again, Run is free", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await openBoth(page);
    const trigger = parametersButton(shown(page));
    await trigger.click();
    await pcaDistance(page).fill("");
    await pcaDistance(page).press("Enter");
    const run = button(shown(page), "Run");
    await expect(run).toBeDisabled();
    await expect(run).toHaveAccessibleDescription(PCA_NO_DISTANCE);
    await expect(shown(page).getByText(PCA_NO_DISTANCE_FULL)).toBeVisible();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(shown(page).getByText(PCA_NO_DISTANCE)).toBeVisible();
    // Inside the closed section, hidden by its attribute: WebKit's
    // Playwright reads text hidden by `hidden="until-found"`, which the
    // browser does not draw, as visible.
    await expect(
      shown(page)
        .locator('[role="group"][hidden]')
        .getByText(PCA_NO_DISTANCE_FULL),
    ).toHaveCount(1);
    await expect(run).toBeDisabled();
    await expectNoAxeViolations(page, makeAxeBuilder);

    await trigger.click();
    await pcaDistance(page).fill("50000");
    await pcaDistance(page).press("Enter");
    await expect(run).toBeEnabled();

    // The LD decay's largest distance, the same.
    await tab(page, "Populations").click();
    const ldTrigger = parametersButton(part(page, "ldDecay"));
    await ldTrigger.click();
    await ldDistance(page).fill("");
    await ldDistance(page).press("Enter");
    const ldRun = button(part(page, "ldDecay"), "Run");
    await expect(ldRun).toBeDisabled();
    await ldTrigger.click();
    await expect(ldTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(part(page, "ldDecay").getByText(LD_NO_DISTANCE)).toBeVisible();
    await expect(ldRun).toHaveAccessibleDescription(LD_NO_DISTANCE);
    await expectNoAxeViolations(page, makeAxeBuilder);
  });

  test("while the PCA runs, its options, greyed, are reached by the Tab key inside the open section with their reason; the section's button stays a button that opens it", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await holdSummary(page, { holdPca: true });
    await page.goto("popgen2.html");
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await tab(page, "PCA").click();
    const run = button(shown(page), "Run");
    await expect(run).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await run.click();
    await expect(button(shown(page), "Stop")).toBeVisible();

    const trigger = parametersButton(shown(page));
    await expect(trigger).toBeEnabled();
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Tab");
    await expect(method(page)).toBeFocused();
    await expect(method(page)).toHaveAttribute("aria-disabled", "true");
    await expect(method(page)).toHaveAccessibleDescription(
      new RegExp(PCA_LOCKED.replaceAll(".", "\\."), "u"),
    );
    await expectNoAxeViolations(page, makeAxeBuilder);
    await release(page, "pca");
    await expect(method(page)).not.toHaveAttribute("aria-disabled", "true", {
      timeout: RESULT_TIMEOUT,
    });
  });

  test("while the distances run, the Tab key reaches inside the open section the greyed minimum and then the measure, which stays open; after the run the section is still open", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await holdSummary(page, { holdPopDists: true });
    await page.goto("popgen2.html");
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await pickIndividuals(page, "panel_pops.csv");
    await tab(page, "Distances").click();
    const run = button(shown(page), "Run");
    await expect(run).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await run.click();
    await expect(button(shown(page), "Stop")).toBeVisible();

    const trigger = parametersButton(shown(page));
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const minimum = shown(page).getByRole("textbox", {
      name: "Individuals with a called genotype needed in each population, per variant",
    });
    await expect(minimum).toHaveAttribute("aria-disabled", "true");
    // From the button of the section, the Tab key reaches the greyed
    // minimum, which tells its reason, and then the measure.
    await trigger.focus();
    await page.keyboard.press("Tab");
    await expect(minimum).toBeFocused();
    await page.keyboard.press("Tab");
    const hudson = shown(page).getByRole("radio", { name: "Hudson's Fst" });
    await expect(hudson).toBeFocused();
    await expect(hudson).not.toHaveAttribute("aria-disabled", "true");
    await release(page, "popDists");
    // The run ended, the section is still open and the minimum no longer
    // greyed.
    await expect(button(shown(page), "Stop")).toHaveCount(0, {
      timeout: RESULT_TIMEOUT,
    });
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(minimum).not.toHaveAttribute("aria-disabled", "true");
  });

  test("a section opened stays open while the user moves to another tab and back, and the others stay closed", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openBoth(page);
    const trigger = parametersButton(shown(page));
    await trigger.click();
    await expect(method(page)).toBeVisible();

    await tab(page, "Populations").click();
    await expect(parametersButton(part(page, "diversity"))).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await parametersButton(part(page, "diversity")).click();
    await tab(page, "Variants").click();
    await tab(page, "PCA").click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(method(page)).toBeVisible();
    await tab(page, "Populations").click();
    await expect(parametersButton(part(page, "diversity"))).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(parametersButton(part(page, "ldDecay"))).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
