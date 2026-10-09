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
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";

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
    expect(presses).toBeLessThanOrEqual(4);
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
