/**
 * The row of five tabs of popgen2.html on the built site
 * (docs/plans/analyses-pca.md, work package 1; docs/specs/steps/popgen2-pca.md,
 * "The row of tabs", "Accessibility" and "How it is checked", the bullet
 * "The row of tabs"): the tabs of the analyses greyed before a file, while
 * panel.nei opens, once it is open, and with panel_pops.csv; a greyed tab
 * reached by the arrow keys, its tooltip, Escape, and its refusal of a
 * click, Enter, Space and the arrows, with aria-disabled and its reason
 * as its description, and the tab shown still selected; the PCA tab shown
 * while another variants file is opened, its reason in its place; the
 * labels on two lines at 320 pixels with no sideways scroll; axe with
 * each tab shown, light and dark.
 *
 * panel.nei holds 1,200 variants of 200 diploid individuals, s000 to
 * s199; panel_pops.csv puts them in p0, p2 and p1.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The labels of the five tabs, in their order. */
const LABELS = [
  "Variants",
  "Individuals",
  "PCA",
  "Populations",
  "Distances",
] as const;

type Label = (typeof LABELS)[number];

/** The reasons of the three tabs of the analyses with no variants
    file. */
const NO_VARIANTS = {
  PCA: "The PCA needs a variants file. Open one in the box Variants file.",
  Populations:
    "The analyses of the populations need a variants file. Open one in the box Variants file.",
  Distances:
    "The distances between populations need a variants file. Open one in the box Variants file.",
} as const;

/** The reason of Distances with a variants file and no individuals
    file. */
const NO_INDIVIDUALS =
  "The distances between populations need at least two populations. Open an individuals file that assigns the individuals to them.";

/** The line of the Populations tab once it opens. */
const POPULATIONS_NOT_BUILT =
  "Not built yet: the diversity of each population, its site frequency spectrum and its LD decay come in a later version of the page.";

/** The line of the Distances tab once it opens. */
const DISTANCES_NOT_BUILT =
  "Not built yet: the distances between the populations, Hudson's Fst or Jost's D, come in a later version of the page.";

/** The row of tabs. */
function row(page: Page): Locator {
  return page.getByRole("tablist", { name: "Files and analyses" });
}

/** The label of the tab `name`. */
function tab(page: Page, name: Label): Locator {
  return row(page).getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shownPanel(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** The box of the variants file, named by its heading. */
function variantsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Variants file", exact: true });
}

/** The box of the individuals file, named by its heading. */
function individualsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Individuals file", exact: true });
}

/** Opens popgen2.html. */
async function openPage(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
}

/** Picks the fixture `name` with the button of the box of the variants
    file. */
async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await variantsBox(page)
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** Picks the fixture `name` with the button of the box of the
    individuals file. */
async function pickIndividuals(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await individualsBox(page)
    .getByRole("button", { name: /^Open (another )?individuals file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** Serves every calculation worker with the opening of the file `name`
    kept from its runner, so that the file stays being opened; to call
    before the page is opened. */
async function holdOpening(page: Page, name: string): Promise<void> {
  await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
    const response = await route.fetch();
    const script = await response.text();
    const front = `self.addEventListener("message", (event) => { if (event.data !== null && typeof event.data === "object" && event.data.kind === "open" && event.data.file.name === ${JSON.stringify(name)}) { event.stopImmediatePropagation(); } });\n`;
    await route.fulfill({ response, body: front + script });
  });
}

/** Rests the mouse on the tab `name`. React Aria shows a tooltip on the
    mouse only once the page has had a press of the pointer, as after the
    user's first click: on a page just opened, or after keys, the mouse
    alone shows none (seen in Chromium and WebKit on 9 October 2026), so
    a click on an empty corner of the page comes first. */
async function hoverTab(page: Page, name: Label): Promise<void> {
  await page.mouse.click(2, 2);
  await tab(page, name).hover();
}

/** Expects the tab `name` greyed with the reason `reason`: aria-disabled,
    and the reason as its description. */
async function expectGreyed(
  page: Page,
  name: Label,
  reason: string,
): Promise<void> {
  await expect(tab(page, name)).toHaveAttribute("aria-disabled", "true");
  await expect(tab(page, name)).toHaveAccessibleDescription(reason);
}

/** Expects the tab `name` not greyed. */
async function expectOpen(page: Page, name: Label): Promise<void> {
  await expect(tab(page, name)).not.toHaveAttribute("aria-disabled");
  await expect(tab(page, name)).toHaveAccessibleDescription("");
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** axe on the page as it is, in the light and the dark theme. */
async function expectAxeBothSchemes(
  page: Page,
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  for (const scheme of ["light", "dark"] as const) {
    // No transition of the colours, which axe would read halfway.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await expectNoViolations(makeAxeBuilder);
  }
}

test("AP1 D4 before a file the five tabs in their order, PCA, Populations and Distances greyed with their reasons, the tooltip on the mouse, and axe light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await expect(row(page).getByRole("tab")).toHaveText([...LABELS]);
  await expect(tab(page, "Variants")).toHaveAttribute("aria-selected", "true");
  await expectOpen(page, "Variants");
  await expectOpen(page, "Individuals");
  for (const [name, reason] of Object.entries(NO_VARIANTS)) {
    await expectGreyed(page, name as Label, reason);
  }
  await expectAxeBothSchemes(page, makeAxeBuilder);

  // The mouse resting on a greyed tab shows its reason, and the tooltip
  // stays while the mouse moves onto it.
  await hoverTab(page, "PCA");
  await expect(page.getByRole("tooltip")).toHaveText(NO_VARIANTS.PCA);
  await page.getByRole("tooltip").hover();
  await expect(page.getByRole("tooltip")).toHaveText(NO_VARIANTS.PCA);
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("AP1 D4 a greyed tab reached by the arrow keys shows its tooltip, hides it with Escape, and opens by neither a click, Enter, Space nor the arrows, the tab shown still selected", async ({
  page,
}) => {
  await openPage(page);
  await tab(page, "Variants").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Individuals")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(shownPanel(page)).toHaveText("No individuals file open.");

  // The arrow key reaches the greyed PCA: the focus rests on it, its
  // tooltip shows, and Individuals stays shown and selected.
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "PCA")).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveText(NO_VARIANTS.PCA);
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "false");
  await expect(tab(page, "Individuals")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(shownPanel(page)).toHaveText("No individuals file open.");
  await expectGreyed(page, "PCA", NO_VARIANTS.PCA);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(tab(page, "PCA")).toBeFocused();

  for (const key of ["Enter", " "]) {
    await page.keyboard.press(key);
    await expect(tab(page, "Individuals")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(shownPanel(page)).toHaveText("No individuals file open.");
  }
  // Forced, since Playwright clicks nothing marked aria-disabled; a user
  // can.
  await tab(page, "PCA").click({ force: true });
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "false");
  await expect(shownPanel(page)).toHaveText("No individuals file open.");

  // The next arrow keys move along the greyed tabs, and Home shows the
  // first.
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Populations")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Distances")).toBeFocused();
  await expect(tab(page, "Individuals")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Home");
  await expect(tab(page, "Variants")).toBeFocused();
  await expect(tab(page, "Variants")).toHaveAttribute("aria-selected", "true");
  // And the arrow key from a greyed tab to one that opens shows it.
  await page.keyboard.press("End");
  await expect(tab(page, "Distances")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "Individuals")).toBeFocused();
  await expect(tab(page, "Individuals")).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("AP1 D4 while panel.nei is being opened the three tabs of the analyses say so, and the PCA's tooltip on the mouse", async ({
  page,
  makeAxeBuilder,
}) => {
  await holdOpening(page, "panel.nei");
  await openPage(page);
  await pick(page, "panel.nei");
  const opening = {
    PCA: "The PCA needs a variants file: panel.nei is being opened.",
    Populations:
      "The analyses of the populations need a variants file: panel.nei is being opened.",
    Distances:
      "The distances between populations need a variants file: panel.nei is being opened.",
  } as const;
  for (const [name, reason] of Object.entries(opening)) {
    await expectGreyed(page, name as Label, reason);
  }
  await hoverTab(page, "PCA");
  await expect(page.getByRole("tooltip")).toHaveText(opening.PCA);
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("AP1 D4 panel.nei open: PCA and Populations open and Distances asks for an individuals file; with panel_pops.csv Distances opens; axe with each tab shown, light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, "panel.nei");
  await expectOpen(page, "PCA");
  await expectOpen(page, "Populations");
  await expectGreyed(page, "Distances", NO_INDIVIDUALS);
  await tab(page, "PCA").click();
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "true");
  await expect(
    shownPanel(page).getByRole("heading", { level: 2, name: "PCA" }),
  ).toBeVisible();
  await tab(page, "Populations").click();
  await expect(shownPanel(page)).toHaveText(POPULATIONS_NOT_BUILT);
  await tab(page, "Distances").click({ force: true });
  await expect(tab(page, "Populations")).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await pickIndividuals(page, "panel_pops.csv");
  await expectOpen(page, "Distances");
  // The one pass ended, so that axe reads a page that stays still: the
  // download of the individuals' table, in the Variants tab, is its sign.
  await tab(page, "Variants").click();
  await expect(
    page.getByRole("button", {
      name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
    }),
  ).toBeVisible({ timeout: 20_000 });
  for (const name of LABELS) {
    await tab(page, name).click();
    await expect(tab(page, name)).toHaveAttribute("aria-selected", "true");
    if (name === "Distances") {
      await expect(shownPanel(page)).toHaveText(DISTANCES_NOT_BUILT);
    }
    await expectAxeBothSchemes(page, makeAxeBuilder);
  }
});

test("AP1 D4 the PCA tab shown, another variants file opened: the tab stays shown, greyed, with its reason in its place, and comes back when the file is open", async ({
  page,
  makeAxeBuilder,
}) => {
  await holdOpening(page, "panel.vcf.gz");
  await openPage(page);
  await pick(page, "panel.nei");
  await expectOpen(page, "PCA");
  await tab(page, "PCA").click();
  await expect(
    shownPanel(page).getByRole("heading", { level: 2, name: "PCA" }),
  ).toBeVisible();

  await pick(page, "panel.vcf.gz");
  const reason = "The PCA needs a variants file: panel.vcf.gz is being opened.";
  await expectGreyed(page, "PCA", reason);
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "true");
  await expect(shownPanel(page)).toHaveText(reason);
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await page.unrouteAll({ behavior: "wait" });
  await pick(page, "panel.nei");
  await expectOpen(page, "PCA");
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "true");
  await expect(
    shownPanel(page).getByRole("heading", { level: 2, name: "PCA" }),
  ).toBeVisible();
});

test("AP1 D4 at 320 pixels the five labels on two lines, the tab shown with its bar and its weight, and no sideways scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openPage(page);
  await pick(page, "panel.nei");
  await expectOpen(page, "PCA");
  for (const shown of ["Variants", "Populations"] as const) {
    await tab(page, shown).click();
    const tops = new Set<number>();
    for (const name of LABELS) {
      const box = await tab(page, name).boundingBox();
      if (box === null) throw new Error(`the tab ${name} has no box`);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
      tops.add(Math.round(box.y));
    }
    expect(tops.size).toBe(2);
    const look = await tab(page, shown).evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        weight: style.fontWeight,
        bar: style.borderBottomColor,
        barWidth: style.borderBottomWidth,
      };
    });
    expect(look.weight).toBe("600");
    expect(look.barWidth).toBe("3px");
    expect(look.bar).not.toBe("rgba(0, 0, 0, 0)");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  // A greyed tab never has the bar and the weight of the tab shown.
  const greyed = await tab(page, "Distances").evaluate((element) => {
    const style = getComputedStyle(element);
    return { weight: style.fontWeight, bar: style.borderBottomColor };
  });
  expect(greyed.weight).toBe("400");
  expect(greyed.bar).toBe("rgba(0, 0, 0, 0)");
});
