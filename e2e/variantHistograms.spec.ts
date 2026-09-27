/**
 * The histograms of the variants on the built site
 * (docs/specs/steps/variants.md, "The histograms beside the filters of
 * the variants" and "How it is checked", stage 3;
 * docs/specs/analyses/variantChecks.md, "The panel"), on
 * e2e/fixtures/panel.nei, 1,200 variants of 200 individuals, with the
 * numbers popnei's release js-v0.1.0-dev.2 gave in node on 26 September
 * 2026: the block in each of its states, ready, running and stopped,
 * done, removed by a new load and back by an undo, and in error; the
 * three histograms beside their filters, the mean of the MAF 0.7163 and
 * still there after the missing data filter moved; the threshold line
 * following the number typed, before Enter, in a browser in English and
 * in Spanish; the two tabs and the table of the bins, reached with the
 * keyboard; the CSV of the bins of the MAF; no button that downloads a
 * plot; the legend inside each plot at 320 pixels wide; and axe at each
 * state reached.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const CALCULATE = "Calculate the histograms of the variants";
const MAF_SWITCH = "Filter the variants by major allele frequency (MAF)";
const OBS_HET_SWITCH = "Filter the variants by observed heterozygosity";
const MAF_LABEL = "Maximum major allele frequency, from 0 to 1";
const MISSING_LABEL = "Maximum proportion of missing genotypes, from 0 to 1";
const CAPTION = "Over the 1,200 variants of panel.nei, before any filter.";
const MAF_TITLE = "Major allele frequency, mean 0.7163";
const OBS_HET_TITLE = "Observed heterozygosity, mean 0.3543";
const EXP_HET_TITLE = "Expected heterozygosity (unbiased), mean 0.3755";

async function openVariants(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
}

/** Picks `fixture` with the file button, as a user does, and waits for
    the card of the file read. */
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

function block(page: Page): Locator {
  return page.getByRole("region", { name: "Histograms of the variants" });
}

function histogram(page: Page, title: string | RegExp): Locator {
  return page.getByRole("group", { name: title });
}

function field(page: Page, label: string): Locator {
  return page.getByLabel(label, { exact: true });
}

/** Turns a switch on or off with the mouse, on its words. */
async function flip(page: Page, name: string): Promise<void> {
  await page
    .getByRole("region", { name: "Filters of the variants" })
    .getByText(name, { exact: true })
    .click();
}

function banner(page: Page, name: string): Locator {
  return page.getByRole("banner").getByRole("button", { name, exact: true });
}

/** Calculates the histograms and waits for them. */
async function calculate(page: Page): Promise<void> {
  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(block(page).getByText(CAPTION, { exact: true })).toBeVisible();
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** Makes the calculation worker keep its results back and pass its
    progress on, so that a calculation stays under way. */
async function holdResults(page: Page): Promise<void> {
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
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind !== "result") post(message, transfer);
    };
  });
}

/** The x of the threshold line of the plot of `group`, in its SVG. */
async function lineX(group: Locator): Promise<number> {
  return Number(await group.locator("line.chart-threshold").getAttribute("x1"));
}

test("VS6 D2 the histograms calculated: the button, the caption, the versions, the focus on the heading, the three beside their filters, and the mean of the MAF still there after the missing data filter moved", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  const button = block(page).getByRole("button", { name: CALCULATE });
  await expect(
    block(page).getByRole("heading", {
      level: 3,
      name: "Histograms of the variants",
    }),
  ).toBeVisible();
  // Ready: the button, and no histogram.
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  // Pressed with the keyboard, the button goes when they are done, and
  // the focus moves to the heading of the block.
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(block(page).getByText(CAPTION, { exact: true })).toBeVisible();
  await expect(button).toHaveCount(0);
  await expect(
    block(page).getByRole("heading", { name: "Histograms of the variants" }),
  ).toBeFocused();
  await expect(
    block(page).getByText(
      /^Calculated with popnei \S+, in version \S+ of the application\.$/,
    ),
  ).toBeVisible();

  // The three, in their order down the step: the observed and the
  // expected heterozygosity after the filter by heterozygosity, the MAF
  // after the MAF filter; each with no threshold while its filter is off.
  const groups = page.getByRole("group", { name: /, mean / });
  await expect(groups).toHaveCount(3);
  await expect(groups.nth(0)).toHaveAccessibleName(OBS_HET_TITLE);
  await expect(groups.nth(1)).toHaveAccessibleName(EXP_HET_TITLE);
  await expect(groups.nth(2)).toHaveAccessibleName(MAF_TITLE);
  await expect(page.locator("line.chart-threshold")).toHaveCount(0);
  await expect(page.getByText(/^Threshold of /)).toHaveCount(0);
  const mafSvg = histogram(page, MAF_TITLE).getByRole("img");
  // The image is named by its title and its description, which the base
  // of the plots joins (docs/specs/charts/plot2d.md).
  await expect(mafSvg).toHaveAccessibleName(
    `${MAF_TITLE} The major allele frequency of 1,200 variants, in 40 bins from 0 to 1.`,
  );
  // The filter by heterozygosity comes before its histogram, and the MAF
  // filter after the histogram of the expected heterozygosity.
  const order = await page
    .getByRole("region", { name: "Filters of the variants" })
    .evaluate((region) =>
      [...region.querySelectorAll("[role=switch], [role=group]")].map(
        (element) =>
          element.getAttribute("role") === "switch"
            ? (element.closest("label")?.textContent ?? "switch")
            : "histogram",
      ),
    );
  expect(order).toEqual([
    "Filter the variants by missing data",
    OBS_HET_SWITCH,
    "histogram",
    "histogram",
    MAF_SWITCH,
    "histogram",
    "Prune the variants by linkage disequilibrium (LD)",
  ]);
  await expectNoViolations(makeAxeBuilder);

  // A filter moved does not take them off.
  await field(page, MISSING_LABEL).fill("0.05");
  await field(page, MISSING_LABEL).press("Enter");
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the missing data filter changed",
  );
  await expect(histogram(page, MAF_TITLE)).toBeVisible();
  await expect(block(page).getByText(CAPTION, { exact: true })).toBeVisible();
  await expect(button).toHaveCount(0);

  // Each filter turned on marks its threshold on its histogram, with the
  // line in words and the description of what it keeps.
  await flip(page, MAF_SWITCH);
  await flip(page, OBS_HET_SWITCH);
  await expect(
    histogram(page, MAF_TITLE).getByText("Threshold of the MAF filter: 0.95", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(mafSvg).toHaveAccessibleName(
    `${MAF_TITLE} The major allele frequency of 1,200 variants, in 40 bins from 0 to 1. The threshold 0.95 keeps the 38 bins up to it, 1,175 variants, and removes the 2 bins above it, 25 variants.`,
  );
  await expect(
    histogram(page, OBS_HET_TITLE).getByText(
      "Threshold of the filter by observed heterozygosity: 0.5",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    histogram(page, OBS_HET_TITLE).getByRole("img"),
  ).toHaveAccessibleName(
    `${OBS_HET_TITLE} The observed heterozygosity of 1,200 variants, in 40 bins from 0 to 1. The threshold 0.5 keeps the 20 bins up to it, 1,090 variants, splits the bin from 0.5 to 0.525, 62 variants, and removes the 19 bins above it, 48 variants.`,
  );
  await expect(
    histogram(page, EXP_HET_TITLE).locator("line.chart-threshold"),
  ).toHaveCount(0);
  await expect(
    histogram(page, MAF_TITLE).locator("rect.chart-bar-removed"),
  ).toHaveCount(2);
  await expectNoViolations(makeAxeBuilder);

  // Turned off, the threshold goes and the histogram stays.
  await flip(page, MAF_SWITCH);
  await expect(
    histogram(page, MAF_TITLE).locator("line.chart-threshold"),
  ).toHaveCount(0);
  await expect(histogram(page, MAF_TITLE).getByText(/^Threshold/)).toHaveCount(
    0,
  );
});

// The threshold follows what is typed, read as digits and a point in
// every browser, whatever its language (the spec, "The threshold typed
// and not yet committed").
for (const locale of ["en-US", "es-ES"] as const) {
  test.describe(locale, () => {
    test.use({ locale });

    test(`VS6 D2 in a browser in ${locale} the threshold line of the MAF moves as 0.9 is typed, before Enter, and the counts of the project wait for the commit`, async ({
      page,
      makeAxeBuilder,
    }) => {
      await openVariants(page);
      await pick(page, "panel.nei");
      await calculate(page);
      await flip(page, MAF_SWITCH);
      const group = histogram(page, MAF_TITLE);
      await expect(group.locator("line.chart-threshold")).toHaveCount(1);
      const at95 = await lineX(group);

      const maf = field(page, MAF_LABEL);
      await maf.click();
      await maf.press("ControlOrMeta+a");
      await maf.press("Backspace");
      // Nothing the field would take: the threshold of the project stays.
      await expect(group.getByText("Maximum 0.95")).toBeAttached();
      await maf.pressSequentially("0.");
      await expect(group.getByText("Maximum 0.95")).toBeAttached();
      expect(await lineX(group)).toBe(at95);
      await maf.pressSequentially("9");
      await expect(
        group.getByText("Maximum 0.9", { exact: true }),
      ).toBeAttached();
      await expect(
        group.getByText("Threshold of the MAF filter: 0.9", { exact: true }),
      ).toBeVisible();
      const at9 = await lineX(group);
      expect(at9).toBeLessThan(at95);
      // Not committed: no command yet.
      await expect(banner(page, "Undo")).toHaveAccessibleDescription(
        "Undo: the MAF filter was turned on",
      );
      await expect(maf).toBeFocused();
      await expectNoViolations(makeAxeBuilder);

      await maf.press("Enter");
      await expect(banner(page, "Undo")).toHaveAccessibleDescription(
        "Undo: the MAF filter changed",
      );
      expect(await lineX(group)).toBe(at9);

      // A number the field would refuse, three decimals, leaves the line
      // at the number committed.
      await maf.press("ControlOrMeta+a");
      await maf.pressSequentially("0.925");
      await expect(
        group.getByText("Maximum 0.9", { exact: true }),
      ).toBeAttached();
      expect(await lineX(group)).toBe(at9);

      // An undo after the commit puts the line back at the number of the
      // project.
      await maf.press("Enter");
      await banner(page, "Undo").click();
      await expect(maf).toHaveValue("0.95");
      await expect(group.getByText("Maximum 0.95")).toBeAttached();
      expect(await lineX(group)).toBe(at95);
    });

    test(`VS6 D2 in a browser in ${locale} 0.9 typed in the MAF field, committed with Enter and undone with the keys, with the focus kept in the field, puts the line back at 0.95`, async ({
      page,
    }) => {
      await openVariants(page);
      await pick(page, "panel.nei");
      await calculate(page);
      await flip(page, MAF_SWITCH);
      const group = histogram(page, MAF_TITLE);
      const maf = field(page, MAF_LABEL);
      await maf.click();
      await maf.press("ControlOrMeta+a");
      await maf.pressSequentially("0.9");
      await maf.press("Enter");
      await expect(
        group.getByText("Maximum 0.9", { exact: true }),
      ).toBeAttached();
      // The field keeps the focus: the number typed is dropped by the
      // commit, and not by leaving the field.
      await maf.press("ControlOrMeta+z");
      await expect(maf).toHaveValue("0.95");
      await expect(maf).toBeFocused();
      await expect(group.getByText("Maximum 0.95")).toBeAttached();
      await expect(
        group.getByText("Threshold of the MAF filter: 0.95", { exact: true }),
      ).toBeVisible();
    });
  });
}

test("VS6 D2 0.9 pasted over 0.8 typed in the MAF field is committed at once, and the line follows it", async ({
  page,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await calculate(page);
  await flip(page, MAF_SWITCH);
  const group = histogram(page, MAF_TITLE);
  const maf = field(page, MAF_LABEL);
  await maf.click();
  await maf.press("ControlOrMeta+a");
  await maf.pressSequentially("0.8");
  await expect(group.getByText("Maximum 0.8", { exact: true })).toBeAttached();
  await maf.press("ControlOrMeta+a");
  // A paste as the browser gives it, with the text in its data.
  await maf.evaluate((input) => {
    const data = new DataTransfer();
    data.setData("text/plain", "0.9");
    input.dispatchEvent(
      new ClipboardEvent("paste", {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the MAF filter changed",
  );
  await expect(maf).toHaveValue("0.9");
  await expect(group.getByText("Maximum 0.9", { exact: true })).toBeAttached();
  await expect(
    group.getByText("Threshold of the MAF filter: 0.9", { exact: true }),
  ).toBeVisible();
});

test("VS6 D2 the threshold line of the observed heterozygosity moves as 0.4 is typed, before Enter", async ({
  page,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await calculate(page);
  await flip(page, OBS_HET_SWITCH);
  const group = histogram(page, OBS_HET_TITLE);
  await expect(group.locator("line.chart-threshold")).toHaveCount(1);
  const at5 = await lineX(group);
  const obsHet = field(page, "Maximum observed heterozygosity, from 0 to 1");
  await obsHet.click();
  await obsHet.press("ControlOrMeta+a");
  await obsHet.pressSequentially("0.4");
  await expect(group.getByText("Maximum 0.4", { exact: true })).toBeAttached();
  await expect(
    group.getByText("Threshold of the filter by observed heterozygosity: 0.4", {
      exact: true,
    }),
  ).toBeVisible();
  expect(await lineX(group)).toBeLessThan(at5);
  // Not committed: no command yet.
  await expect(banner(page, "Undo")).toHaveAccessibleDescription(
    "Undo: the filter by observed heterozygosity was turned on",
  );
});

// React Aria throws a comma away as it is typed, so that 0,1 shows as 01;
// the threshold drawn is then the number committed, not the 1 or the 0
// the field shows (the spec, "A character the field does not take").
for (const keys of ["0,", "0,1", "0,0", "0.,5"] as const) {
  test(`VS6 D2 "${keys}" typed key by key leaves the threshold of the MAF, its line and the plot's description at 0.95, and a deletion gives the number typed back`, async ({
    page,
  }) => {
    await openVariants(page);
    await pick(page, "panel.nei");
    await calculate(page);
    await flip(page, MAF_SWITCH);
    const group = histogram(page, MAF_TITLE);
    await expect(group.locator("line.chart-threshold")).toHaveCount(1);
    const at95 = await lineX(group);
    const described = group.locator("svg.chart desc");
    const description = await described.textContent();
    expect(description).toContain("The threshold 0.95 ");

    const maf = field(page, MAF_LABEL);
    await maf.click();
    await maf.press("ControlOrMeta+a");
    await maf.press("Backspace");
    await maf.pressSequentially(keys);
    await expect(
      page.getByText(
        /^Write the decimals with a point, 0.1 and not 0,1; the threshold stays 0.95.$/,
      ),
    ).toBeVisible();
    await expect(
      group.getByText("Threshold of the MAF filter: 0.95", { exact: true }),
    ).toBeVisible();
    await expect(group.getByText("Maximum 0.95")).toBeAttached();
    await expect(described).toHaveText(description ?? "");
    expect(await lineX(group)).toBe(at95);

    // A deletion mends the text: what it shows now is what was typed.
    await maf.press("ControlOrMeta+a");
    await maf.pressSequentially("0.9");
    await expect(
      group.getByText("Threshold of the MAF filter: 0.9", { exact: true }),
    ).toBeVisible();
    expect(await lineX(group)).toBeLessThan(at95);
  });
}

test("VS6 D2 the filter by observed heterozygosity at 0.5 splits the bin from 0.5, which a line under its plot names; at 0.6 it splits none", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await calculate(page);
  const group = histogram(page, OBS_HET_TITLE);
  const line = group.getByText(/^The threshold .* splits the bin/);
  await expect(line).toHaveCount(0);
  await flip(page, OBS_HET_SWITCH);
  await expect(line).toHaveText(
    "The threshold 0.5 splits the bin from 0.5 to 0.525, 62 variants: the filter keeps those of its variants at most 0.5 and removes the others.",
  );
  await expectNoViolations(makeAxeBuilder);
  const obsHet = field(page, "Maximum observed heterozygosity, from 0 to 1");
  await obsHet.fill("0.6");
  await obsHet.press("Enter");
  await expect(
    group.getByText("Threshold of the filter by observed heterozygosity: 0.6", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(line).toHaveCount(0);
});

test("VS6 D2 the table of the bins reached with the keyboard: the tabs one stop, the arrow keys between them, the table the next stop, then the CSV", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await calculate(page);
  await flip(page, MAF_SWITCH);
  const group = histogram(page, MAF_TITLE);
  const plotTab = group.getByRole("tab", { name: "Plot" });
  const tableTab = group.getByRole("tab", { name: "Table of the bins" });
  await expect(plotTab).toHaveAttribute("aria-selected", "true");
  await expect(group.getByRole("tablist")).toHaveAccessibleName(MAF_TITLE);

  // From the field of the MAF, the Tab key reaches the tab selected.
  await field(page, MAF_LABEL).focus();
  await page.keyboard.press("Tab");
  await expect(plotTab).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(tableTab).toBeFocused();
  await expect(tableTab).toHaveAttribute("aria-selected", "true");
  const panel = group.getByRole("tabpanel");
  await expect(group.getByRole("img")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(panel).toBeFocused();

  const table = panel.getByRole("table", {
    name: "The bins of the major allele frequency",
  });
  await expect(table).toBeVisible();
  await expect(
    panel.getByText(
      "Each bin runs from its lower edge up to its upper edge, not included; the last bin includes its upper edge.",
      { exact: true },
    ),
  ).toBeVisible();
  const header = table.getByRole("row").first();
  await expect(header.getByRole("columnheader")).toHaveText([
    "From",
    "To",
    "Variants",
    "This filter",
  ]);
  const rows = table.getByRole("row");
  await expect(rows).toHaveCount(41);
  // The header, then a row per bin: the 39th bin, from 0.95, is row 39.
  await expect(rows.nth(39).getByRole("rowheader")).toHaveText("0.95");
  await expect(rows.nth(39).getByRole("cell")).toHaveText([
    "0.975",
    "22",
    "Removed",
  ]);
  await expect(rows.nth(38).getByRole("cell")).toHaveText([
    "0.95",
    "25",
    "Kept",
  ]);
  await expectNoViolations(makeAxeBuilder);

  await page.keyboard.press("Tab");
  await expect(
    group.getByRole("button", { name: "Download the bins as CSV" }),
  ).toBeFocused();

  // The tab chosen stays while the step is drawn, a filter moved among
  // it; with the filter off, the table has no column of what it keeps.
  await flip(page, MAF_SWITCH);
  await expect(tableTab).toHaveAttribute("aria-selected", "true");
  await expect(header.getByRole("columnheader")).toHaveText([
    "From",
    "To",
    "Variants",
  ]);
  await expect(rows.nth(39).getByRole("cell")).toHaveText(["0.975", "22"]);

  // Back to the plot with the arrow keys.
  await tableTab.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(plotTab).toHaveAttribute("aria-selected", "true");
  await expect(group.getByRole("img")).toHaveAccessibleName(
    new RegExp(`^${MAF_TITLE} The major allele frequency`),
  );
  await expect(group.getByRole("table")).toHaveCount(0);
});

test("VS6 D2 the CSV of the bins of the MAF: panel.variant_maf_bins.csv, its header, its 40 rows and its 39th, with no threshold", async ({
  page,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await calculate(page);
  const downloading = page.waitForEvent("download");
  await histogram(page, MAF_TITLE)
    .getByRole("button", { name: "Download the bins as CSV" })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("panel.variant_maf_bins.csv");
  const lines = (await readFile(await download.path(), "utf8")).split("\n");
  expect(lines[0]).toBe("from,to,count,state");
  expect(lines).toHaveLength(42);
  expect(lines.at(-1)).toBe("");
  expect(lines[39]).toBe("0.9500000000000001,0.9750000000000001,22,");

  // The other two, by their names, and the states with a threshold.
  await flip(page, OBS_HET_SWITCH);
  for (const [title, name] of [
    [OBS_HET_TITLE, "panel.variant_obs_het_bins.csv"],
    [EXP_HET_TITLE, "panel.variant_exp_het_bins.csv"],
  ] as const) {
    const next = page.waitForEvent("download");
    await histogram(page, title)
      .getByRole("button", { name: "Download the bins as CSV" })
      .click();
    const file = await next;
    expect(file.suggestedFilename()).toBe(name);
    const text = await readFile(await file.path(), "utf8");
    if (title === OBS_HET_TITLE) {
      expect(text.split("\n")[21]).toBe("0.5,0.525,62,partly_kept");
    } else {
      expect(text.split("\n")[1]).toBe("0,0.025,0,");
    }
  }
});

test("VS6 D2 no button on the step downloads a histogram as SVG or PNG: each histogram has one button, the CSV of its bins", async ({
  page,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await calculate(page);
  await flip(page, MAF_SWITCH);
  await flip(page, OBS_HET_SWITCH);
  await expect(page.getByRole("group", { name: /, mean / })).toHaveCount(3);
  for (const title of [MAF_TITLE, OBS_HET_TITLE, EXP_HET_TITLE]) {
    await expect(histogram(page, title).getByRole("button")).toHaveText([
      "Download the bins as CSV",
    ]);
  }
  await expect(
    page.getByRole("main").getByRole("button", { name: /SVG|PNG|plot/i }),
  ).toHaveCount(0);
});

test("VS6 D2 at 320 pixels wide the legend of each histogram with a threshold lies inside its plot", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openVariants(page);
  await pick(page, "panel.nei");
  await calculate(page);
  await flip(page, MAF_SWITCH);
  await flip(page, OBS_HET_SWITCH);
  await expect(page.locator("line.chart-threshold")).toHaveCount(2);
  const plots = await page.locator("svg.chart").evaluateAll((svgs) =>
    svgs.map((svg) => {
      const frame = svg.getBoundingClientRect();
      return {
        width: frame.width,
        rows: [...svg.querySelectorAll(".chart-legend-row")].map((row) => {
          const box = row.getBoundingClientRect();
          return {
            text: row.textContent,
            left: box.left - frame.left,
            top: box.top - frame.top,
            right: box.right - frame.left,
            bottom: box.bottom - frame.top,
            height: frame.height,
          };
        }),
      };
    }),
  );
  expect(plots.map((plot) => plot.rows.map((row) => row.text))).toEqual([
    ["Maximum 0.5", "Kept by this filter", "Removed by this filter"],
    [],
    ["Maximum 0.95", "Kept by this filter", "Removed by this filter"],
  ]);
  for (const plot of plots) {
    // The plot is narrower than the page, which has its gutters.
    expect(plot.width).toBeLessThan(320);
    for (const row of plot.rows) {
      expect(row.left).toBeGreaterThanOrEqual(0);
      expect(row.top).toBeGreaterThanOrEqual(0);
      expect(row.right).toBeLessThanOrEqual(plot.width);
      expect(row.bottom).toBeLessThanOrEqual(row.height);
    }
  }
  // No sideways scroll of the page.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 at 320 pixels wide the table of the bins of a filter that is on fits its four columns with no sideways scroll", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openVariants(page);
  await pick(page, "panel.nei");
  await calculate(page);
  await flip(page, OBS_HET_SWITCH);
  const group = histogram(page, OBS_HET_TITLE);
  await group.getByRole("tab", { name: "Table of the bins" }).click();
  const table = group.getByRole("table");
  await expect(
    table.getByRole("columnheader", { name: "This filter" }),
  ).toBeVisible();
  await expect(table.getByRole("cell", { name: "Partly kept" })).toBeVisible();
  expect(
    await table.evaluate((element) => {
      const frame = element.parentElement;
      return frame === null ? null : frame.scrollWidth <= frame.clientWidth;
    }),
  ).toBe(true);
  await expect(group.getByText(/^Scroll the table sideways/)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 histograms drawn at 1280 pixels wide narrow with the window to 320: no sideways scroll, and each plot within its panel", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openVariants(page);
  await pick(page, "panel.nei");
  await calculate(page);
  await flip(page, MAF_SWITCH);
  await flip(page, OBS_HET_SWITCH);
  await expect(page.locator("line.chart-threshold")).toHaveCount(2);
  const widths = (): Promise<number[]> =>
    page
      .locator("svg.chart")
      .evaluateAll((svgs) =>
        svgs.map((svg) => svg.getBoundingClientRect().width),
      );
  expect(Math.min(...(await widths()))).toBeGreaterThan(320);

  await page.setViewportSize({ width: 320, height: 900 });
  // The plots are drawn again when their element changes size.
  await expect
    .poll(async () => Math.max(...(await widths())))
    .toBeLessThanOrEqual(320 - 2 * 16);
  const overflows = await page.locator("svg.chart").evaluateAll((svgs) =>
    svgs.map((svg) => {
      const panel = svg.closest('[role="tabpanel"]');
      if (panel === null) return "no panel";
      const plot = svg.getBoundingClientRect();
      const frame = panel.getBoundingClientRect();
      return plot.left >= frame.left && plot.right <= frame.right
        ? "inside"
        : `${String(plot.width)} in ${String(frame.width)}`;
    }),
  );
  expect(overflows).toEqual(["inside", "inside", "inside"]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("VS6 D2 running: Stop, the bar and its line; stopped, the button back and no histogram", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await holdResults(page);
  await block(page).getByRole("button", { name: CALCULATE }).click();
  const stop = block(page).getByRole("button", { name: "Stop" });
  await expect(stop).toBeFocused();
  await expect(
    block(page).getByRole("progressbar", {
      name: "Calculating the histograms of the variants",
    }),
  ).toBeVisible();
  await expect(block(page).getByText(/^Calculating · /)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await stop.click();
  const button = block(page).getByRole("button", { name: CALCULATE });
  await expect(button).toBeFocused();
  await expect(block(page).getByRole("progressbar")).toHaveCount(0);
  await expect(page.getByRole("tablist")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 removed by a new load, with the words of the change; back by an undo with no calculation; removed again by a redo", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await calculate(page);
  await pick(page, "panel.nei");
  const button = block(page).getByRole("button", { name: CALCULATE });
  await expect(
    block(page).getByText(
      "The histograms of the variants were removed because a new variants file was loaded. Undo brings them back as they were, with no calculation; Calculate makes them anew for the file loaded now.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(button).toBeVisible();
  await expect(page.getByRole("group", { name: /, mean / })).toHaveCount(0);
  await expect(block(page).getByText(CAPTION)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await banner(page, "Undo").click();
  await expect(histogram(page, MAF_TITLE)).toBeVisible();
  await expect(block(page).getByText(CAPTION, { exact: true })).toBeVisible();
  // No calculation: no bar, and no button.
  await expect(block(page).getByRole("progressbar")).toHaveCount(0);
  await expect(button).toHaveCount(0);
  await expect(block(page).getByText(/were removed/)).toHaveCount(0);

  await banner(page, "Redo").click();
  await expect(
    block(page).getByText(
      "Redone: a new variants file was loaded. The histograms of the variants were removed; Undo brings them back as they were, with no calculation, and Calculate makes them anew for the file loaded now.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: /, mean / })).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  // Calculated anew for the file loaded now.
  await calculate(page);
  await expect(histogram(page, MAF_TITLE)).toBeVisible();
  await expect(block(page).getByText(/were removed/)).toHaveCount(0);
});

test("VS6 D2 in error: the ploidy of tetraploid.vcf.gz refused, in the words of the diversity with no button, and no histogram", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "tetraploid.vcf.gz");
  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(
    block(page).getByText(
      "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.",
      { exact: true },
    ),
  ).toBeVisible();
  // popnei would refuse it again: no button, and the focus on the heading.
  await expect(block(page).getByRole("button")).toHaveCount(0);
  await expect(
    block(page).getByRole("heading", { name: "Histograms of the variants" }),
  ).toBeFocused();
  await expect(page.getByRole("group", { name: /, mean / })).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 a calculation under way stopped by a new load, with the line that says so and the button back", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await holdResults(page);
  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(block(page).getByRole("button", { name: "Stop" })).toBeVisible();
  await pick(page, "panel.nei");
  await expect(
    block(page).getByText(
      "The calculation of the histograms of the variants was stopped because a new variants file was loaded.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    block(page).getByRole("button", { name: CALCULATE }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 a calculation whose worker stopped asks to calculate them again, with the button, which then gives them", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  // The worker answers the next result as if it had crashed.
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
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind === "result") {
        post({ kind: "crashed", message: "a crash made by the test" });
      } else {
        post(message, transfer);
      }
    };
  });
  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(
    block(page).getByText(
      "The calculation stopped unexpectedly. Calculate them again. If it stops again, load panel.nei again in the Variants step.",
      { exact: true },
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
  // The crash started a new worker, which answers.
  await calculate(page);
  await expect(histogram(page, MAF_TITLE)).toBeVisible();
});

test("VS6 D2 a variant with no called genotype gives the warning above the caption, and is in no bin", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  const vcf = [
    "##fileformat=VCFv4.2",
    "##contig=<ID=1>",
    '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
    "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ta\tb",
    "1\t1\t.\tA\tT\t.\tPASS\t.\tGT\t0/1\t0/0",
    "1\t2\t.\tA\tT\t.\tPASS\t.\tGT\t./.\t./.",
    "1\t3\t.\tA\tT\t.\tPASS\t.\tGT\t1/1\t0/1",
    "",
  ].join("\n");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "calls.vcf",
    mimeType: "text/plain",
    buffer: Buffer.from(vcf),
  });
  await block(page).getByRole("button", { name: CALCULATE }).click();
  await expect(
    block(page).getByText(
      "Over the 3 variants of calls.vcf, before any filter.",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expect(
    block(page).getByRole("heading", { name: "1 warning" }),
  ).toBeVisible();
  await expect(
    block(page).getByText(
      "1 of the 3 variants of calls.vcf has no called genotype, and is in none of the histograms.",
    ),
  ).toBeVisible();
  await expect(
    histogram(page, /^Major allele frequency, mean /).getByRole("img"),
  ).toHaveAccessibleName(
    /The major allele frequency of 2 variants, in 40 bins/,
  );
  await expectNoViolations(makeAxeBuilder);
});
