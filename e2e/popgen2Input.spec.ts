/**
 * The page of popgen2.html in two boxes and two tabs, on the built site
 * (docs/plans/input-page.md, work package 3;
 * docs/specs/steps/popgen2-input.md, "The order of the page", "Both tabs
 * kept drawn", "Accessibility" and "How it is checked"): the tabs by the
 * keyboard alone; a threshold, its line and its plot as they were after a
 * turn to the other tab and back, and a number typed in the box of a
 * threshold with no Enter applied as the focus goes to the tab, its line
 * moved to it; the tab not shown never reached by the Tab key; the status
 * region speaking of the plots while their tab is hidden; the boxes side
 * by side at 1280 pixels and one above the other at 320, with no sideways
 * scroll; the focus on the button after an opening; axe on each tab, light
 * and dark. The flows that need an individuals file come with work
 * package 6.
 *
 * panel.vcf.gz holds 1,200 variants of 200 diploid individuals; the axis
 * of its missing rate goes from 0 to 0.1.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { dropFiles } from "./dropFiles.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const MISSING = "Proportion of missing genotypes";

/** The box of the variants file, named by its heading. */
function variantsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Variants file", exact: true });
}

/** The box of the individuals file, named by its heading. */
function individualsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Individuals file", exact: true });
}

/** The label of the tab named `name`. */
function tab(page: Page, name: "Variants file" | "Individuals file"): Locator {
  return page
    .getByRole("tablist", { name: "The files" })
    .getByRole("tab", { name, exact: true });
}

function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
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

/** Opens popgen2.html and the fixture `name`, and waits for its one pass
    to end, the download of the individuals' table its sign, and for its
    six plots. */
async function openDone(page: Page, name: string): Promise<void> {
  await openPage(page);
  await pick(page, name);
  await expect(
    page.getByRole("button", {
      name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
    }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.locator("svg.chart")).toHaveCount(6, { timeout: 20_000 });
}

/** The histogram of the missing rate of the variants: its group, the box
    of its threshold, the line its plot draws and its SVG. */
function missing(page: Page): {
  readonly group: Locator;
  readonly box: Locator;
  readonly line: Locator;
  readonly svg: Locator;
} {
  const group = stats(page).getByRole("group", { name: MISSING, exact: true });
  return {
    group,
    box: group.getByRole("textbox"),
    line: group.locator("line.chart-threshold"),
    svg: group.locator("svg.chart"),
  };
}

/** The place and size of `locator` on the page, rounded to the pixel. */
async function boxOf(
  locator: Locator,
): Promise<{ x: number; y: number; width: number; height: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("the element has no box");
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  };
}

/** Whether the focus is on an element inside a part of the page marked
    inert. */
async function focusInInert(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (document.activeElement?.closest("[inert]") ?? null) !== null,
  );
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

test("IN3 D2 the tabs by the keyboard alone: the row is one stop of the Tab key, the arrows show each tab as they reach it, Home and End the first and the last", async ({
  page,
}) => {
  await openPage(page);
  // The Tab key from the top of the page: the zone, its button, the row
  // of the tabs.
  let presses = 0;
  while (
    !(await tab(page, "Variants file").evaluate(
      (element) => element === document.activeElement,
    ))
  ) {
    await page.keyboard.press("Tab");
    presses += 1;
    expect(presses).toBeLessThanOrEqual(6);
  }
  await expect(tab(page, "Variants file")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.getByText("No variants file open. Open one in the box Variants file."),
  ).toBeVisible();
  await expect(page.getByText("No individuals file open.")).toBeHidden();

  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Individuals file")).toBeFocused();
  await expect(tab(page, "Individuals file")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByText("No individuals file open.")).toBeVisible();
  await expect(
    page.getByText("No variants file open. Open one in the box Variants file."),
  ).toBeHidden();

  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "Variants file")).toBeFocused();
  await expect(tab(page, "Variants file")).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.keyboard.press("End");
  await expect(tab(page, "Individuals file")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Home");
  await expect(tab(page, "Variants file")).toHaveAttribute(
    "aria-selected",
    "true",
  );

  // One stop: the Tab key leaves the row for the tab shown, and Shift+Tab
  // comes back to the label of the tab shown.
  await page.keyboard.press("End");
  await page.keyboard.press("Tab");
  await expect(tab(page, "Variants file")).not.toBeFocused();
  await expect(tab(page, "Individuals file")).not.toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(tab(page, "Individuals file")).toBeFocused();
});

test("IN3 D2 a threshold moved, the other tab shown and back: the threshold, its line over the plot and the plot at the same place and width as before", async ({
  page,
}) => {
  await openDone(page, "panel.vcf.gz");
  const histogram = missing(page);
  await histogram.box.fill("0.05");
  await histogram.box.press("Enter");
  await expect(histogram.box).toHaveValue("0.05");
  const plotBefore = await boxOf(histogram.svg);
  const lineBefore = await boxOf(histogram.line);
  const boxBefore = await boxOf(histogram.box);

  await tab(page, "Individuals file").click();
  await expect(histogram.group).toBeHidden();
  await expect(page.getByText("No individuals file open.")).toBeVisible();

  await tab(page, "Variants file").click();
  await expect(histogram.group).toBeVisible();
  await expect(histogram.box).toHaveValue("0.05");
  expect(await boxOf(histogram.svg)).toEqual(plotBefore);
  expect(await boxOf(histogram.line)).toEqual(lineBefore);
  expect(await boxOf(histogram.box)).toEqual(boxBefore);
  await expect(page.locator("svg.chart")).toHaveCount(6);
});

test("IN3 D2 the plots of a hidden tab: a window resized with the other tab shown draws them at the width of their box when their tab is shown again, the line of the threshold over its plot", async ({
  page,
}) => {
  await page.setViewportSize({ width: 400, height: 900 });
  await openDone(page, "panel.vcf.gz");
  const histogram = missing(page);
  await histogram.box.fill("0.05");
  await histogram.box.press("Enter");
  const narrow = await boxOf(histogram.svg);

  await tab(page, "Individuals file").click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await tab(page, "Variants file").click();
  // As wide as the box the page gives it, which is not its width before.
  await expect
    .poll(() =>
      histogram.svg.evaluate((svg) => {
        const box = svg.parentElement?.getBoundingClientRect().width ?? -1;
        return Math.round(svg.getBoundingClientRect().width - box);
      }),
    )
    .toBe(0);
  const plot = await boxOf(histogram.svg);
  expect(plot.width).not.toBe(narrow.width);
  // The line stands within the plot.
  const line = await boxOf(histogram.line);
  expect(line.x).toBeGreaterThan(plot.x);
  expect(line.x).toBeLessThan(plot.x + plot.width);
  expect(line.y).toBeGreaterThanOrEqual(plot.y);
  expect(line.y + line.height).toBeLessThanOrEqual(plot.y + plot.height);
});

test("IN3 D2 a number typed in the box of a threshold, with no Enter, is applied as the focus goes to the other tab by the mouse, and found applied after the turn back, with its line moved to it", async ({
  page,
}) => {
  await openDone(page, "panel.vcf.gz");
  const histogram = missing(page);
  await expect(histogram.box).toHaveValue("0.1");
  const lineBefore = await boxOf(histogram.line);
  await histogram.box.fill("0.07");

  // The box commits its number as it loses the focus to the tab.
  await tab(page, "Individuals file").click();
  await tab(page, "Variants file").click();
  await expect(histogram.box).toHaveValue("0.07");
  await expect
    .poll(async () => (await boxOf(histogram.line)).x)
    .toBeLessThan(lineBefore.x);
});

test("IN3 D2 the tab not shown is never reached by the Tab key, with the plots of a file under it", async ({
  page,
}) => {
  await openDone(page, "panel.vcf.gz");
  await tab(page, "Individuals file").click();
  await expect(tab(page, "Individuals file")).toBeFocused();
  for (let press = 0; press < 30; press += 1) {
    await page.keyboard.press("Tab");
    expect(await focusInInert(page)).toBe(false);
  }
  // And backwards from the label.
  await tab(page, "Individuals file").focus();
  for (let press = 0; press < 30; press += 1) {
    await page.keyboard.press("Shift+Tab");
    expect(await focusInInert(page)).toBe(false);
  }
});

test("IN3 D2 the status region goes on speaking of the plots while their tab is hidden", async ({
  page,
}) => {
  await recordAnnouncements(page);
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await tab(page, "Individuals file").click();
  await expect(tab(page, "Individuals file")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  // A text the region takes may join those before it, which a screen
  // reader has not yet spoken.
  await expect
    .poll(async () => (await announced(page)).join(" "), { timeout: 20_000 })
    .toContain("The statistics of panel.vcf.gz are calculated.");
  await expect(tab(page, "Individuals file")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(stats(page)).toBeHidden();
});

for (const width of [320, 1280]) {
  test(`IN3 D2 at ${String(width)} pixels, no sideways scroll of the page, the boxes ${width === 320 ? "one above the other" : "side by side"} and the two labels of the tabs in view`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await openDone(page, "panel.vcf.gz");
    for (const shown of ["Individuals file", "Variants file"] as const) {
      await tab(page, shown).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
    const variants = await boxOf(variantsBox(page));
    const individuals = await boxOf(individualsBox(page));
    if (width === 320) {
      expect(individuals.y).toBeGreaterThanOrEqual(
        variants.y + variants.height,
      );
      // Each the width of the page less its margins of 16 pixels.
      expect(variants.width).toBe(288);
      expect(individuals.width).toBe(288);
    } else {
      expect(individuals.y).toBe(variants.y);
      expect(individuals.x).toBeGreaterThanOrEqual(variants.x + variants.width);
      expect(individuals.width).toBe(variants.width);
    }
    for (const name of ["Variants file", "Individuals file"] as const) {
      await expect(tab(page, name)).toBeVisible();
      const label = await boxOf(tab(page, name));
      expect(label.x).toBeGreaterThanOrEqual(0);
      expect(label.x + label.width).toBeLessThanOrEqual(width);
    }
  });
}

test("IN3 D2 an opening by the button leaves the focus on it, now Open another variants file…, in the box of the variants file", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  const button = variantsBox(page).getByRole("button", {
    name: "Open another variants file…",
  });
  await expect(button).toBeVisible();
  await expect(button).toBeFocused();
  await expect(page.locator("svg.chart")).toHaveCount(6, { timeout: 20_000 });
  await expect(button).toBeFocused();
});

test("IN3 D2 axe on the page with each tab shown, light and dark, with no file and with a file", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await expect(individualsBox(page)).toContainText(
    "No individuals file: every individual is unclassified.",
  );
  await expectAxeBothSchemes(page, makeAxeBuilder);
  await tab(page, "Individuals file").click();
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await tab(page, "Variants file").click();
  await pick(page, "panel.vcf.gz");
  await expect(page.locator("svg.chart")).toHaveCount(6, { timeout: 20_000 });
  await expect(individualsBox(page)).toContainText(
    "No individuals file: all 200 individuals of panel.vcf.gz are unclassified, and the analyses per population will take them as one population.",
  );
  await expectAxeBothSchemes(page, makeAxeBuilder);
  await tab(page, "Individuals file").click();
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

// ---------------------------------------------------------------------
// Work package 6: the box and the tab of the individuals file (IN6 D2,
// IN6 D3). The counts of panel_pops.csv are p0 48, p2 84 and p1 68; at a
// missing rate of the individuals of 0.03, p0 29, p2 51 and p1 36, the
// individuals of each population whose proportion of missing genotypes
// popnei 0.2.2 gives at most 0.03, read under node into
// e2e/fixtures/panel_individual_stats.json.

/** The name of the box of the threshold of the missing genotypes of each
    individual. */
const INDIVIDUALS_MISSING =
  "Missing GTs max: maximum proportion of missing genotypes of an individual";

/** A file the flow makes: its name and its text. */
interface Made {
  readonly name: string;
  readonly text: string;
}

/** Opens the individuals file `file`, a fixture by its name or a file
    the flow makes, with the button of its box. */
async function pickIndividuals(page: Page, file: string | Made): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await individualsBox(page)
    .getByRole("button", { name: /^Open (another )?individuals file…$/u })
    .click();
  await (
    await chooser
  ).setFiles(
    typeof file === "string"
      ? join(FIXTURES, file)
      : {
          name: file.name,
          mimeType: "text/csv",
          buffer: Buffer.from(file.text, "utf8"),
        },
  );
}

/** The list "Column of the populations", by its button. */
function columnList(page: Page): Locator {
  return individualsBox(page).getByRole("button", {
    name: "Column of the populations",
  });
}

/** Chooses `item` in the select named `label` of `scope`. */
async function chooseIn(
  page: Page,
  scope: Locator,
  label: string,
  item: string,
): Promise<void> {
  await scope.getByRole("button", { name: label }).click();
  await page.getByRole("option", { name: item, exact: true }).click();
}

/** The table of the counts in the box. */
function counts(page: Page): Locator {
  return individualsBox(page).getByRole("table", {
    name: /^Individuals of .* after the filters of individuals$/u,
  });
}

/** Expects the rows of the counts, each a population and its count. */
async function expectCounts(
  page: Page,
  rows: readonly (readonly [string, string])[],
): Promise<void> {
  await expect(counts(page).getByRole("rowheader")).toHaveText(
    rows.map(([pop]) => pop),
    { timeout: 20_000 },
  );
  await expect(counts(page).getByRole("cell")).toHaveText(
    rows.map(([, count]) => count),
  );
}

/** The counts of panel_pops.csv with no threshold. */
const ALL_COUNTS = [
  ["p0", "48"],
  ["p2", "84"],
  ["p1", "68"],
] as const;

/** The counts of panel_pops.csv at the missing rate 0.03. */
const COUNTS_003 = [
  ["p0", "29"],
  ["p2", "51"],
  ["p1", "36"],
] as const;

/** The lines of panel_pops.csv, the header first. */
async function panelPopsLines(): Promise<string[]> {
  const text = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  return text.split("\n").filter((line) => line !== "");
}

/** The box of the threshold of the missing genotypes of each
    individual. */
function individualsMissing(page: Page): Locator {
  return stats(page).getByRole("textbox", { name: INDIVIDUALS_MISSING });
}

/** Commits `value` in the box of the threshold of the individuals. */
async function setIndividualsMissing(page: Page, value: string): Promise<void> {
  const box = individualsMissing(page);
  await box.fill(value);
  await box.press("Enter");
  await expect(box).toHaveValue(value);
}

test("IN6 D2 panel.nei then panel_pops.csv, and the other order: the list on popcat, the counts p0 48, p2 84, p1 68 in that order, no line of the unclassified, and no row not used", async ({
  page,
}) => {
  for (const order of ["variants first", "individuals first"] as const) {
    await openPage(page);
    if (order === "variants first") {
      await pick(page, "panel.nei");
      await pickIndividuals(page, "panel_pops.csv");
    } else {
      await pickIndividuals(page, "panel_pops.csv");
      await expect(columnList(page)).toContainText("popcat");
      await expect(
        individualsBox(page).getByText(
          "The individuals are counted once a variants file is open.",
        ),
      ).toBeVisible();
      await pick(page, "panel.nei");
    }
    await expect(columnList(page)).toContainText("popcat");
    await expectCounts(page, ALL_COUNTS);
    await expect(individualsBox(page).getByText(/^Unclassified/u)).toHaveCount(
      0,
    );
    await expect(
      individualsBox(page).getByText(
        "Individuals in panel_pops.csv but not in panel.nei: 0",
        { exact: true },
      ),
    ).toBeVisible();
  }
});

for (const [variants, file, column, pops] of [
  ["panel.nei", "panel_split.csv", "popsplit", ["p0a", "p0b", "p2", "p1"]],
  ["ld.nei", "ld_pops.csv", "pop", ["pop_a", "pop_b"]],
  ["panel.nei", "panel_meta.csv", "popcat", ["p0", "p2", "p1"]],
] as const) {
  test(`IN6 D2 ${file} over ${variants}: the page chooses ${column}`, async ({
    page,
  }) => {
    await openPage(page);
    await pick(page, variants);
    await pickIndividuals(page, file);
    await expect(columnList(page)).toContainText(column);
    await expect(counts(page).getByRole("rowheader")).toHaveText([...pops], {
      timeout: 20_000,
    });
  });
}

test("IN6 D2 a CSV with an integer column before the populations: the page chooses the populations, not the integers", async ({
  page,
}) => {
  const lines = await panelPopsLines();
  const text = lines
    .map((line, index) => {
      const [name, pop] = line.split(",");
      return index === 0
        ? `${String(name)},plot,${String(pop)}`
        : `${String(name)},${String(index % 3)},${String(pop)}`;
    })
    .join("\n");
  await openPage(page);
  await pick(page, "panel.nei");
  await pickIndividuals(page, { name: "plots.csv", text });
  await expect(columnList(page)).toContainText("popcat");
  await expectCounts(page, ALL_COUNTS);
});

test("IN6 D2 four rows left out and three cells of popcat emptied: the line of the unclassified with 3 and 4 and three names, and the full list of 4 under the tab with Copy the 4 names, which copies them", async ({
  page,
  context,
  browserName,
  makeAxeBuilder,
}) => {
  // Playwright gives Chromium the clipboard only with both permissions;
  // WebKit lets the page write on a press, and the test read once
  // granted.
  await context.grantPermissions(
    browserName === "chromium"
      ? ["clipboard-read", "clipboard-write"]
      : ["clipboard-read"],
  );
  await recordAnnouncements(page);
  const lines = await panelPopsLines();
  // s010, s011 and s012 with an empty cell; s100 to s103 left out.
  const out = new Set(["s100", "s101", "s102", "s103"]);
  const empty = new Set(["s010", "s011", "s012"]);
  const text = lines
    .filter((line) => !out.has(line.split(",")[0] ?? ""))
    .map((line) => {
      const name = line.split(",")[0] ?? "";
      return empty.has(name) ? `${name},` : line;
    })
    .join("\n");
  await openPage(page);
  await pick(page, "panel.nei");
  await pickIndividuals(page, { name: "missing.csv", text });
  await expect(
    individualsBox(page).getByText(
      "Unclassified, left out of the analyses per population: 7 individuals kept, 3 with an empty cell in popcat and 4 that are not in missing.csv. Not in missing.csv: s100, s101, s102 and 1 more; the tab Individuals file lists them all.",
      { exact: true },
    ),
  ).toBeVisible({ timeout: 20_000 });
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await tab(page, "Individuals file").click();
  const missing = page.getByRole("region", {
    name: "Individuals in panel.nei but not in missing.csv, before the filters",
  });
  await expect(missing.getByRole("listitem")).toHaveText([
    "s100",
    "s101",
    "s102",
    "s103",
  ]);
  await missing.getByRole("button", { name: "Copy the 4 names" }).click();
  await expect
    .poll(async () => (await announced(page)).at(-1))
    .toBe("4 names copied.");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "s100\ns101\ns102\ns103",
  );
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("IN6 D2 Copy the 4 names where the page may not write the clipboard, not granted in Chromium and missing in WebKit: the names could not be copied, and to select them in the list", async ({
  page,
  browserName,
}) => {
  await recordAnnouncements(page);
  const lines = await panelPopsLines();
  const out = new Set(["s100", "s101", "s102", "s103"]);
  const text = lines
    .filter((line) => !out.has(line.split(",")[0] ?? ""))
    .join("\n");
  // WebKit lets a page write the clipboard on a press, so there the page
  // has none, as a page served over plain HTTP from another machine.
  if (browserName === "webkit") {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: undefined });
    });
  }
  await openPage(page);
  await pick(page, "panel.nei");
  await pickIndividuals(page, { name: "missing.csv", text });
  await tab(page, "Individuals file").click();
  const copy = page.getByRole("button", { name: "Copy the 4 names" });
  await expect(copy).toBeVisible({ timeout: 20_000 });
  await copy.click();
  await expect
    .poll(async () => (await announced(page)).at(-1))
    .toBe("The names could not be copied. Select them in the list.");
  await expect(copy).toBeFocused();
});

test("IN6 D2 a CSV of the names in capitals: the warning of none of the individuals in the file, and no table", async ({
  page,
  makeAxeBuilder,
}) => {
  const lines = await panelPopsLines();
  const text = lines
    .map((line, index) => (index === 0 ? line : line.replace(/^s/u, "S")))
    .join("\n");
  await openPage(page);
  await pick(page, "panel.nei");
  await pickIndividuals(page, { name: "capitals.csv", text });
  await expect(
    individualsBox(page).getByText(
      "Warning: none of the 200 individuals of panel.nei is in capitals.csv, so all of them are unclassified. The first column of capitals.csv has to hold their names as panel.nei writes them: panel.nei starts with s000, and capitals.csv with S000.",
      { exact: true },
    ),
  ).toBeVisible({ timeout: 20_000 });
  await expect(counts(page)).toHaveCount(0);
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("IN6 D2 a column of 21 values chosen: its warning, and no table", async ({
  page,
  makeAxeBuilder,
}) => {
  const lines = await panelPopsLines();
  const text = lines
    .map((line, index) =>
      index === 0 ? `${line},accession` : `${line},a${String(index % 21)}`,
    )
    .join("\n");
  await openPage(page);
  await pick(page, "panel.nei");
  await pickIndividuals(page, { name: "accessions.csv", text });
  await expect(columnList(page)).toContainText("popcat");
  await chooseIn(
    page,
    individualsBox(page),
    "Column of the populations",
    "accession",
  );
  await expect(
    individualsBox(page).getByText(
      "Warning: accession has 21 different values, too many for a column of populations: the individuals are counted here only for a column of 20 different values or fewer. If it is not the column of the populations, choose another in the list.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(counts(page)).toHaveCount(0);
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("IN6 D2 None chosen: every individual kept unclassified; the separator set to the semicolon and back to the comma, the list still on None with the same line", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, "panel.nei");
  await pickIndividuals(page, "panel_pops.csv");
  await expectCounts(page, ALL_COUNTS);
  await chooseIn(
    page,
    individualsBox(page),
    "Column of the populations",
    "None: every individual unclassified",
  );
  const all = individualsBox(page).getByText(
    "All 200 individuals kept are unclassified, and the analyses per population will take them as one population.",
    { exact: true },
  );
  await expect(all).toBeVisible();
  await expect(counts(page)).toHaveCount(0);
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await tab(page, "Individuals file").click();
  const panel = page.getByRole("tabpanel", { name: "Individuals file" });
  await chooseIn(page, panel, "Separator", "Semicolon");
  await expect(panel.getByRole("button", { name: "Separator" })).toContainText(
    "Semicolon",
  );
  await expect(panel.getByText("1 column", { exact: false })).toBeVisible({
    timeout: 20_000,
  });
  await chooseIn(page, panel, "Separator", "Comma");
  await expect(panel.getByText("200 rows, 2 columns")).toBeVisible({
    timeout: 20_000,
  });
  await expect(columnList(page)).toContainText(
    "None: every individual unclassified",
  );
  await expect(all).toBeVisible();
});

test("IN6 D2 the missing rate of the individuals at 0.03, the pass held: … and the line of waiting; after Stop, the line of a Stop; at the end of Start again, the counts p0 29, p2 51 and p1 36", async ({
  page,
  makeAxeBuilder,
}) => {
  test.setTimeout(120_000);
  await holdSummary(page);
  await openPage(page);
  await pickIndividuals(page, "panel_pops.csv");
  await expect(columnList(page)).toContainText("popcat");
  await pick(page, "panel.nei");
  // The plots of what was read so far, the pass held before its end.
  await release(page, "oneSoFar");
  await expect(page.locator("svg.chart")).toHaveCount(6, { timeout: 20_000 });
  await expectCounts(page, ALL_COUNTS);
  await setIndividualsMissing(page, "0.03");
  await expect(counts(page).getByRole("cell")).toHaveText([
    "…not counted yet",
    "…not counted yet",
    "…not counted yet",
  ]);
  await expect(
    individualsBox(page).getByText(
      "The individuals the filters keep are counted once panel.nei is read to the end.",
      { exact: true },
    ),
  ).toBeVisible();
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await variantsBox(page).getByRole("button", { name: "Stop" }).click();
  await expect(
    individualsBox(page).getByText(
      "Not counted: the reading of panel.nei was stopped. Start it again in the box of panel.nei to count the individuals the filters keep.",
      { exact: true },
    ),
  ).toBeVisible();

  await variantsBox(page).getByRole("button", { name: "Start again" }).click();
  await release(page, "allSoFar");
  await release(page, "result");
  await expectCounts(page, COUNTS_003);
});

/** Counts, on `window`, the requests of the summary of the variants
    file the page sends to its calculation workers, the one pass. */
async function countPasses(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const record = { passes: 0 };
    Object.defineProperty(window, "__e2ePasses", { value: record });
    const RealWorker = window.Worker;
    window.Worker = class extends RealWorker {
      override postMessage(
        message: unknown,
        options?: Transferable[] | StructuredSerializeOptions,
      ): void {
        if (
          typeof message === "object" &&
          message !== null &&
          Reflect.get(message, "kind") === "run"
        ) {
          const job: unknown = Reflect.get(message, "job");
          if (
            typeof job === "object" &&
            job !== null &&
            Reflect.get(job, "analysis") === "variantsSummary"
          ) {
            record.passes += 1;
          }
        }
        if (Array.isArray(options)) {
          super.postMessage(message, options);
        } else {
          super.postMessage(message, options);
        }
      }
    };
  });
}

/** The passes counted by `countPasses`. */
async function passes(page: Page): Promise<number> {
  return page.evaluate(() => {
    const record: unknown = Reflect.get(window, "__e2ePasses");
    const count: unknown =
      typeof record === "object" && record !== null
        ? Reflect.get(record, "passes")
        : null;
    return typeof count === "number" ? count : -1;
  });
}

test("IN6 D2 an individuals file opened while the one pass runs: the pass goes on to its end, with no second pass", async ({
  page,
}) => {
  await countPasses(page);
  await holdSummary(page);
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expect(
    variantsBox(page).getByRole("button", { name: "Stop" }),
  ).toBeVisible({ timeout: 20_000 });
  expect(await passes(page)).toBe(1);
  await pickIndividuals(page, "panel_pops.csv");
  await expect(columnList(page)).toContainText("popcat");
  await expect(
    variantsBox(page).getByRole("button", { name: "Stop" }),
  ).toBeVisible();
  await release(page, "allSoFar");
  await release(page, "result");
  await expect(
    page.getByRole("button", {
      name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
    }),
  ).toBeVisible({ timeout: 20_000 });
  await expectCounts(page, ALL_COUNTS);
  expect(await passes(page)).toBe(1);
});

test("IN6 D2 a CSV of semicolons read with the comma: the refusal of its row in the box, the options under the tab, the focus kept on the separator; the semicolon reads it; and panel_pops.csv read with the semicolon, the list with None alone and the line of no column", async ({
  page,
  makeAxeBuilder,
}) => {
  await recordAnnouncements(page);
  await openPage(page);
  await pickIndividuals(page, {
    name: "decimals.csv",
    text: "id;pop;h\ns000;p0;1,75\ns001;p1;2,5\n",
  });
  await expect(columnList(page)).toContainText("pop", { timeout: 20_000 });
  await tab(page, "Individuals file").click();
  const panel = page.getByRole("tabpanel", { name: "Individuals file" });
  await chooseIn(page, panel, "Separator", "Comma");
  const separator = panel.getByRole("button", { name: "Separator" });
  await expect(
    individualsBox(page).getByText(/^decimals\.csv could not be read: /u),
  ).toBeVisible({ timeout: 20_000 });
  await expect(individualsBox(page)).toContainText(
    "Choose another separator in the tab Individuals file, or open a corrected file.",
  );
  await expect(individualsBox(page)).toContainText("line 2");
  await expect(
    panel.getByText(
      "decimals.csv could not be read; the box Individuals file says why.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(separator).toBeFocused();
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await chooseIn(page, panel, "Separator", "Semicolon");
  await expect(panel.getByText("2 rows, 3 columns")).toBeVisible({
    timeout: 20_000,
  });
  await expect(panel.getByRole("gridcell", { name: "1,75" })).toBeVisible();

  await pickIndividuals(page, "panel_pops.csv");
  await expect(panel.getByText("200 rows, 2 columns")).toBeVisible({
    timeout: 20_000,
  });
  await chooseIn(page, panel, "Separator", "Semicolon");
  await expect(
    individualsBox(page).getByText(
      "No column of panel_pops.csv holds text with 20 different values or fewer, so none was chosen as the column of the populations. Choose it in the list.",
      { exact: true },
    ),
  ).toBeVisible({ timeout: 20_000 });
  await columnList(page).click();
  await expect(page.getByRole("option")).toHaveText([
    "None: every individual unclassified",
  ]);
  await page.keyboard.press("Escape");
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("IN6 D2 a CSV named .xlsx is read as text, with its options under the tab; an .xls named .csv is refused as a workbook of Excel 97–2003, with no options", async ({
  page,
  makeAxeBuilder,
}) => {
  const text = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  await openPage(page);
  await pickIndividuals(page, { name: "pops.xlsx", text });
  await tab(page, "Individuals file").click();
  const panel = page.getByRole("tabpanel", { name: "Individuals file" });
  await expect(panel.getByText("200 rows, 2 columns")).toBeVisible({
    timeout: 20_000,
  });
  await expect(panel.getByRole("button", { name: "Separator" })).toBeVisible();

  const chooser = page.waitForEvent("filechooser");
  await individualsBox(page)
    .getByRole("button", { name: "Open another individuals file…" })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "old.csv",
    mimeType: "text/csv",
    buffer: await readFile(join(FIXTURES, "excel97.xls")),
  });
  await expect(individualsBox(page)).toContainText(
    "a workbook of Excel 97–2003",
    { timeout: 20_000 },
  );
  await expect(panel.getByRole("button", { name: "Separator" })).toHaveCount(0);
  await expect(
    panel.getByText(
      "old.csv could not be read; the box Individuals file says why.",
      { exact: true },
    ),
  ).toBeVisible();
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("IN6 D2 the table of the file sorted by a header and scrolled, the other tab and back: the same sort and the same first row in view", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pickIndividuals(page, "panel_pops.csv");
  await tab(page, "Individuals file").click();
  const grid = page.getByRole("grid", { name: "The table of panel_pops.csv" });
  await expect(grid).toBeVisible({ timeout: 20_000 });
  const header = grid.getByRole("columnheader", { name: /^popcat/u });
  await header.click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await header.click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect(grid.getByRole("rowheader").first()).toHaveText("s004");
  await grid.evaluate((element) => {
    element.scrollTo({ top: 1200 });
  });
  /** The first row header wholly under the header of the grid. */
  const firstInView = (): Promise<string> =>
    grid.evaluate((element) => {
      const top = element.getBoundingClientRect().top;
      const head = element.querySelector('[role="columnheader"]');
      const below = top + (head?.getBoundingClientRect().height ?? 0);
      const headers = [...element.querySelectorAll('[role="rowheader"]')]
        .map((cell) => ({
          text: cell.textContent,
          y: cell.getBoundingClientRect().top,
        }))
        .filter((cell) => cell.y >= below - 1)
        .sort((a, b) => a.y - b.y);
      return headers[0]?.text ?? "none";
    });
  await expect.poll(firstInView).not.toBe("s004");
  const before = await firstInView();
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await tab(page, "Variants file").click();
  await expect(grid).toBeHidden();
  await tab(page, "Individuals file").click();
  await expect(grid).toBeVisible();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect.poll(firstInView).toBe(before);
});

test("IN6 D2 a file name of 80 characters at 320 pixels: Remove, the name in the box and the warnings wrap, and the page does not scroll sideways", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const lines = await panelPopsLines();
  const text = lines
    .map((line, index) => (index === 0 ? line : line.replace(/^s/u, "S")))
    .join("\n");
  const name = `${"a_rather_long_name_of_the_individuals_".repeat(2).slice(0, 76)}.csv`;
  expect(name).toHaveLength(80);
  await openPage(page);
  await pick(page, "panel.nei");
  await pickIndividuals(page, { name, text });
  await expect(individualsBox(page).getByText(/^Warning: none/u)).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    individualsBox(page).getByRole("button", { name: `Remove ${name}` }),
  ).toBeVisible();
  for (const shown of ["Individuals file", "Variants file"] as const) {
    await tab(page, shown).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("IN6 D2 table_io's JavaScript and wasm are requested at the first read, a CSV, the wasm served as application/wasm, and once more at the next read, by its new light worker", async ({
  page,
}) => {
  const requested: string[] = [];
  const types = new Map<string, string>();
  page.on("response", (response) => {
    const name = new URL(response.url()).pathname.replace(/^.*\//u, "");
    if (name.startsWith("table_io")) {
      requested.push(name.endsWith(".wasm") ? "wasm" : "js");
      types.set(name, response.headers()["content-type"] ?? "");
    }
  });
  await openPage(page);
  await page.waitForLoadState("networkidle");
  expect(requested).toEqual([]);
  await pickIndividuals(page, "panel_pops.csv");
  await expect(columnList(page)).toContainText("popcat", { timeout: 20_000 });
  await expect.poll(() => requested.filter((r) => r === "wasm").length).toBe(1);
  expect(requested.filter((r) => r === "js")).toHaveLength(1);
  const wasmType = [...types].find(([name]) => name.endsWith(".wasm"))?.[1];
  expect(wasmType).toBe("application/wasm");

  await pickIndividuals(page, "panel_split.csv");
  await expect(columnList(page)).toContainText("popsplit", {
    timeout: 20_000,
  });
  // Chromium takes the second from its cache, which the page's log of
  // responses still lists; WebKit fetches it again.
  await expect.poll(() => requested.filter((r) => r === "wasm").length).toBe(2);
});

test("IN6 D2 axe on the box and the tab with no file, a file being read, a file read with its counts and with an xlsx", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, "panel.nei");
  await expect(page.locator("svg.chart")).toHaveCount(6, { timeout: 20_000 });
  await expectAxeBothSchemes(page, makeAxeBuilder);

  // The read held: table_io's wasm, which the light worker fetches at
  // its first read, is answered only once axe has run on the box and the
  // tab of a file being read.
  let answer = (): void => undefined;
  const held = new Promise<void>((resolve) => {
    answer = resolve;
  });
  await page.route(/table_io[^/]*\.wasm$/u, async (route) => {
    await held;
    await route.continue();
  });
  await pickIndividuals(page, "panel_pops.csv");
  await expect(
    individualsBox(page).getByText("Reading panel_pops.csv.", { exact: true }),
  ).toBeVisible();
  await expectAxeBothSchemes(page, makeAxeBuilder);
  await tab(page, "Individuals file").click();
  await expect(
    page
      .getByRole("tabpanel", { name: "Individuals file" })
      .getByText("Reading panel_pops.csv.", { exact: true }),
  ).toBeVisible();
  await expectAxeBothSchemes(page, makeAxeBuilder);
  await expect(columnList(page)).toHaveCount(0);
  answer();
  await tab(page, "Variants file").click();

  await expectCounts(page, ALL_COUNTS);
  await expectAxeBothSchemes(page, makeAxeBuilder);
  await tab(page, "Individuals file").click();
  await expect(
    page.getByRole("grid", { name: "The table of panel_pops.csv" }),
  ).toBeVisible();
  await expectAxeBothSchemes(page, makeAxeBuilder);
  await pickIndividuals(page, "excel_en.xlsx");
  await expect(
    page.getByText(
      "Read from the first sheet of excel_en.xlsx; any other sheet is not read.",
    ),
  ).toBeVisible({ timeout: 20_000 });
  await expectAxeBothSchemes(page, makeAxeBuilder);
  await individualsBox(page)
    .getByRole("button", { name: "Remove excel_en.xlsx" })
    .click();
  await expect(
    individualsBox(page).getByRole("button", {
      name: "Open individuals file…",
    }),
  ).toBeFocused();
  await expect(page.getByText("No individuals file open.")).toBeVisible();
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("IN6 D2 a run of the arrow keys on the threshold of the individuals, still held as a read of the individuals file ends, is made a change before the column the entry chooses: the counts are of where the keys took it", async ({
  page,
}) => {
  await openDone(page, "panel.nei");
  await setIndividualsMissing(page, "0.031");
  // The light worker's script held, so that the read waits while the
  // keys run.
  let letGo: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    letGo = resolve;
  });
  await page.route(/\/filesRunner-[^/]*\.js$/u, async (route) => {
    await held;
    await route.continue();
  });
  await pickIndividuals(page, "panel_pops.csv");
  await expect(
    individualsBox(page).getByText("Reading panel_pops.csv.", { exact: true }),
  ).toBeVisible();
  // The page's timers stand still from here, so that the run waits at
  // the keys whatever the speed of the machine.
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  const slider = stats(page)
    .getByRole("group", {
      name: "Proportion of missing genotypes of each individual",
      exact: true,
    })
    .getByRole("slider");
  await slider.focus();
  for (let press = 0; press < 20; press += 1) {
    if ((await slider.inputValue()) === "0.03") break;
    await page.keyboard.press("ArrowLeft");
  }
  await expect(slider).toHaveValue("0.03");
  letGo();
  // Through the gate, the entry's command of the column ends the run
  // first: the counts are at 0.03. Given the store with no gate, the run
  // would still wait, its second never passing, and the counts be those
  // of 0.031, p0 30, p2 58 and p1 41.
  await expect(columnList(page)).toContainText("popcat", { timeout: 20_000 });
  await expectCounts(page, COUNTS_003);
  await expect(individualsMissing(page)).toHaveValue("0.03");
});

test("IN6 D3 at the missing rate of the individuals 0.03, the counts and the unclassified kept add up to the individuals the download of the filtered variants says it kept", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await openDone(page, "panel.nei");
  await pickIndividuals(page, "panel_pops.csv");
  await setIndividualsMissing(page, "0.03");
  await expectCounts(page, COUNTS_003);
  const shown = await counts(page).getByRole("cell").allTextContents();
  const sum = shown.reduce((total, count) => total + Number(count), 0);
  // No line of the unclassified: none is kept.
  await expect(individualsBox(page).getByText(/^Unclassified/u)).toHaveCount(0);

  const button = stats(page).getByRole("button", {
    name: "Download filtered variants…",
    exact: true,
  });
  await button.click();
  const dialog = page.getByRole("dialog", {
    name: "Download filtered variants",
  });
  await dialog
    .locator("label")
    .filter({ hasText: "popnei's .nei file" })
    .click();
  const coming = page.waitForEvent("download", { timeout: 60_000 });
  await dialog.getByRole("button", { name: "Download" }).click();
  await coming;
  const after = stats(page).locator("p", { hasText: /^panel\.filtered\./u });
  await expect(after).toContainText(/of [\d,]+ individuals\./u, {
    timeout: 60_000,
  });
  const words = (await after.textContent()) ?? "";
  const kept = /of ([\d,]+) individuals\./u.exec(words)?.[1] ?? "";
  expect(Number(kept.replace(/,/gu, ""))).toBe(sum);
  expect(sum).toBe(116);
});

/** Drops a folder on the zone of the box of the individuals file: a
    script cannot put a folder into a DataTransfer, so the item of a file
    says, when React Aria asks for its entry of the file system, that it
    is a folder, as the entry of a folder dragged from the desktop does. */
async function dropFolder(page: Page): Promise<void> {
  const dataTransfer = await page.evaluateHandle(() => {
    Reflect.set(
      window,
      "popneiEntryOf",
      // eslint-disable-next-line @typescript-eslint/unbound-method -- put back after the drop, as it was
      DataTransferItem.prototype.webkitGetAsEntry,
    );
    DataTransferItem.prototype.webkitGetAsEntry = function () {
      return {
        isFile: false,
        isDirectory: true,
        name: "metadata",
      } as FileSystemEntry;
    };
    const transfer = new DataTransfer();
    transfer.items.add(new File([], "metadata"));
    return transfer;
  });
  const target = individualsBox(page).getByRole("button", {
    name: /^Open (another )?individuals file…$/u,
  });
  for (const type of ["dragenter", "dragover", "drop"]) {
    await target.dispatchEvent(type, { dataTransfer });
  }
  // React Aria asks for the entries within the drop, so that the files
  // of the next drops are files again.
  await page.evaluate(() => {
    const entryOf: unknown = Reflect.get(window, "popneiEntryOf");
    if (typeof entryOf === "function") {
      DataTransferItem.prototype.webkitGetAsEntry =
        entryOf as DataTransferItem["webkitGetAsEntry"];
    }
  });
}

test("IN6 D2 a folder, then two files, dropped on the box of the individuals file: their words in the box and said, nothing opened; a CSV dropped opens it and takes the words away; a folder again, and Remove takes the words away; axe on the words", async ({
  page,
  makeAxeBuilder,
}) => {
  await recordAnnouncements(page);
  await openPage(page);
  const folder =
    "Open an individuals file, a CSV, a TSV or an xlsx, not a folder.";
  const several = "Open one individuals file at a time.";
  const zoneButton = individualsBox(page).getByRole("button", {
    name: /^Open (another )?individuals file…$/u,
  });

  await dropFolder(page);
  await expect(individualsBox(page).getByText(folder)).toBeVisible();
  await expect.poll(() => announced(page)).toContain(folder);
  await expect(zoneButton).toHaveText("Open individuals file…");
  await expectAxeBothSchemes(page, makeAxeBuilder);

  const pops = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  await dropFiles(page, zoneButton, [
    { name: "a.csv", text: pops },
    { name: "b.csv", text: pops },
  ]);
  await expect(individualsBox(page).getByText(several)).toBeVisible();
  await expect(individualsBox(page).getByText(folder)).toHaveCount(0);
  await expect.poll(() => announced(page)).toContain(several);
  await expect(zoneButton).toHaveText("Open individuals file…");

  await dropFiles(page, zoneButton, [{ name: "panel_pops.csv", text: pops }]);
  await expect(columnList(page)).toContainText("popcat", { timeout: 20_000 });
  await expect(individualsBox(page).getByText(several)).toHaveCount(0);
  await expect(zoneButton).toHaveText("Open another individuals file…");

  await dropFolder(page);
  await expect(individualsBox(page).getByText(folder)).toBeVisible();
  await expect(columnList(page)).toContainText("popcat");
  await individualsBox(page)
    .getByRole("button", { name: "Remove panel_pops.csv" })
    .click();
  await expect(individualsBox(page).getByText(folder)).toHaveCount(0);
  await expect(zoneButton).toHaveText("Open individuals file…");
});

test("IN6 D2 an individuals file pasted into the zone of its box is opened as one picked: the list on popcat and its table under the tab", async ({
  page,
}) => {
  await openPage(page);
  const paste = individualsBox(page).getByRole("button", {
    name: "Paste an individuals file",
    exact: true,
  });
  await paste.focus();
  const bytes = [...(await readFile(join(FIXTURES, "panel_pops.csv")))];
  await paste.evaluate((button, given) => {
    // As dropFiles: a file a script puts into a DataTransfer has no entry
    // of the file system in Chromium, and React Aria skips an item
    // without one.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its item, by call
    const entryOf = DataTransferItem.prototype.webkitGetAsEntry;
    DataTransferItem.prototype.webkitGetAsEntry = function (
      this: DataTransferItem,
    ) {
      return (
        entryOf.call(this) ??
        ({ isFile: true, isDirectory: false } as FileSystemEntry)
      );
    };
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(given)], "panel_pops.csv"));
    button.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: transfer,
        bubbles: true,
        cancelable: true,
      }),
    );
  }, bytes);
  await expect(columnList(page)).toContainText("popcat", { timeout: 20_000 });
  await expect(
    individualsBox(page).getByRole("button", { name: "Remove panel_pops.csv" }),
  ).toBeVisible();
  await tab(page, "Individuals file").click();
  await expect(
    page.getByRole("grid", { name: "The table of panel_pops.csv" }),
  ).toBeVisible();
  await expect(
    page.getByText("200 rows, 2 columns", { exact: true }),
  ).toBeVisible();
});

test("IN6 D2 individuals_10000.xlsx sorted by a header: in the first frame after the click, Sorting… in the line of its size and the grid busy; a second click before the rows are drawn sorts them once, up; then the line and the grid as before", async ({
  page,
}) => {
  await openPage(page);
  await pickIndividuals(page, "individuals_10000.xlsx");
  await tab(page, "Individuals file").click();
  const grid = page.getByRole("grid", {
    name: "The table of individuals_10000.xlsx",
  });
  await expect(grid).toBeVisible({ timeout: 60_000 });
  const line = page.getByText("10,000 rows, 20 columns", { exact: true });
  await expect(line).toBeVisible();
  const header = grid.getByRole("columnheader").nth(1);
  const lineHandle = await line.elementHandle();
  // The click, the first frame after it, a second click then, and the
  // frames until the header says the sort, read in the page, where
  // Playwright's own waits would come too late for the first frame.
  const seen = await header.evaluate(async (element, sizeLine) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("the header is not an HTML element");
    }
    const table = element.closest('[role="grid"]');
    const frame = (): Promise<void> =>
      new Promise((resolve) => {
        requestAnimationFrame(() => {
          resolve();
        });
      });
    element.click();
    await frame();
    const first = {
      line: sizeLine.textContent,
      busy: table?.getAttribute("aria-busy") ?? null,
      sort: element.getAttribute("aria-sort"),
    };
    element.click();
    while (element.getAttribute("aria-sort") === first.sort) await frame();
    return first;
  }, lineHandle);
  expect(seen).toEqual({
    line: "10,000 rows, 20 columns. Sorting…",
    busy: "true",
    sort: "none",
  });
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(grid).not.toHaveAttribute("aria-busy", "true");
  await expect(line).toHaveText("10,000 rows, 20 columns");
});

test("IN6 D2 individuals_10000.xlsx at 320 pixels: the table of 20 columns scrolls sideways in its box, and the page does not", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openPage(page);
  await pickIndividuals(page, "individuals_10000.xlsx");
  await tab(page, "Individuals file").click();
  const grid = page.getByRole("grid", {
    name: "The table of individuals_10000.xlsx",
  });
  await expect(grid).toBeVisible({ timeout: 60_000 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await grid.evaluate((element) => element.scrollWidth > element.clientWidth),
  ).toBe(true);
});
