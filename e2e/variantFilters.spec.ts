/**
 * The filters of the variants on the built site
 * (docs/specs/steps/variants.md, "The filters of the variants" and "How
 * it is checked", stage 3): the line in place of the checks before a
 * file is read; the four filters, each turned on at its value of the
 * table of the filters, set, undone and turned off; the refusals of the
 * maximum r² and of the distance, with their lines as the description of
 * the field and in the status region; the order of the keyboard; the
 * fields in a browser in Spanish; and axe at each state reached.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The line in place of the checks while no variants file is read. */
const NOT_READ =
  "The histograms, the counts and the statistics of each individual are calculated once a variants file is read.";

/** The lines under the switches. */
const MISSING_DATA_LINE =
  "A genotype is missing when any of its alleles is, 0/. among them; the proportion is over the individuals the filters of individuals keep.";
const OBS_HET_LINE =
  "The proportion of the individuals with a called genotype that are heterozygous; a high one often marks duplicated regions read as one.";
const MAF_LINE =
  "The frequency of the commonest allele: 0.95 removes a variant whose commonest allele is above 0.95. For a variant of two alleles, that is a minor allele frequency below 0.05.";
const LD_LINE =
  "Of two variants closer than the distance, and with an r² above the maximum, the first is kept.";

/** Each filter: its switch, its fields with the values they are turned
    on at, the line under the switch, and the words of its commands. */
const FILTERS = [
  {
    kind: "missing_data",
    switch: "Filter the variants by missing data",
    fields: [["Maximum proportion of missing genotypes, from 0 to 1", "0.1"]],
    line: MISSING_DATA_LINE,
    name: "the filter of the variants by missing data",
  },
  {
    kind: "obs_het",
    switch: "Filter the variants by observed heterozygosity",
    fields: [["Maximum observed heterozygosity, from 0 to 1", "0.5"]],
    line: OBS_HET_LINE,
    name: "the filter of the variants by observed heterozygosity",
  },
  {
    kind: "maf",
    switch: "Filter the variants by major allele frequency (MAF)",
    fields: [["Maximum major allele frequency, from 0 to 1", "0.95"]],
    line: MAF_LINE,
    name: "the MAF filter",
  },
  {
    kind: "ld",
    switch: "Prune the variants by linkage disequilibrium (LD)",
    fields: [
      ["Maximum r² with a variant kept before it, from 0 to 1", "0.3"],
      [
        "Distance within which variants are compared, in base pairs, from 1",
        "10000",
      ],
    ],
    line: LD_LINE,
    name: "the LD pruning",
  },
] as const;

const R2_LABEL = "Maximum r² with a variant kept before it, from 0 to 1";
const DISTANCE_LABEL =
  "Distance within which variants are compared, in base pairs, from 1";

async function openVariants(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
}

function filtersRegion(page: Page): Locator {
  return page.getByRole("region", { name: "Filters of the variants" });
}

function field(page: Page, label: string): Locator {
  return page.getByLabel(label, { exact: true });
}

function switchOf(page: Page, name: string): Locator {
  return page.getByRole("switch", { name });
}

/** Turns a switch on or off with the mouse, on its words, as a user does:
    the element of the switch itself sits under them. */
async function flip(page: Page, name: string): Promise<void> {
  await filtersRegion(page).getByText(name, { exact: true }).click();
}

function undoButton(page: Page): Locator {
  return page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true });
}

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

/** Picks `fixture` with the file button, as a user does. */
async function pick(page: Page, fixture: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, fixture));
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

test("VS6 D2 before a file the line stands in place of the checks, the four filters are there in their order, and each can be set", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  const region = filtersRegion(page);
  await expect(
    region.getByRole("heading", { level: 2, name: "Filters of the variants" }),
  ).toBeVisible();
  await expect(region.getByText(NOT_READ, { exact: true })).toBeVisible();

  // In a new project only the missing data filter is on, at 0.1.
  const switches = region.getByRole("switch");
  await expect(switches).toHaveCount(FILTERS.length);
  for (const [index, filter] of FILTERS.entries()) {
    await expect(switches.nth(index)).toHaveAccessibleName(filter.switch);
  }
  await expect(switchOf(page, FILTERS[0].switch)).toBeChecked();
  for (const filter of FILTERS.slice(1)) {
    await expect(switchOf(page, filter.switch)).not.toBeChecked();
    for (const [label] of filter.fields) {
      await expect(field(page, label)).toHaveCount(0);
    }
  }
  // The lines under the switches, there while their filters are off, and
  // the description of each switch.
  for (const filter of FILTERS) {
    await expect(region.getByText(filter.line, { exact: true })).toBeVisible();
    await expect(switchOf(page, filter.switch)).toHaveAccessibleDescription(
      filter.line,
    );
  }
  await expectNoViolations(makeAxeBuilder);

  // Each set before a file: turned on and a number committed.
  for (const [kind, label, typed] of [
    ["obs_het", "Maximum observed heterozygosity, from 0 to 1", "0.9"],
    ["maf", "Maximum major allele frequency, from 0 to 1", "0.9"],
    ["ld", DISTANCE_LABEL, "500"],
  ] as const) {
    const filter = FILTERS.find((f) => f.kind === kind);
    if (filter === undefined) throw new Error(`no filter ${kind}`);
    await flip(page, filter.switch);
    await field(page, label).fill(typed);
    await field(page, label).press("Enter");
    await expect(field(page, label)).toHaveValue(typed);
    await expect(undoButton(page)).toHaveAccessibleDescription(
      `Undo: ${filter.name} changed`,
    );
  }
  await expectNoViolations(makeAxeBuilder);

  // The line goes once the file is read.
  await pick(page, "panel.nei");
  await expect(
    page
      .getByRole("region", { name: "Variants file" })
      .getByText("200 individuals"),
  ).toBeVisible();
  await expect(region.getByText(NOT_READ, { exact: true })).toHaveCount(0);
  await expect(field(page, DISTANCE_LABEL)).toHaveValue("500");
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 the line stays while a file is being read and when popnei refused it", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  const line = filtersRegion(page).getByText(NOT_READ, { exact: true });
  await pick(page, "bad.vcf");
  await expect(
    page.getByRole("region", { name: "Variants file" }).getByText(/^popnei/),
  ).toBeVisible();
  await expect(line).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  // The wasm held back, the next file waits to be read.
  await page.route("**/*.wasm", () => undefined);
  await openVariants(page);
  await pick(page, "panel.nei");
  await expect(
    page
      .getByRole("region", { name: "Variants file" })
      .getByText("Reading panel.nei."),
  ).toBeVisible();
  await expect(line).toBeVisible();
});

test("VS6 D2 each switch turned on starts its filter at its value of the table of the filters; a number committed, undone, and the switch off take it back", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  // The missing data filter, on in a new project, turned off first.
  await flip(page, FILTERS[0].switch);
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the filter of the variants by missing data was turned off",
  );

  for (const filter of FILTERS) {
    const toggle = switchOf(page, filter.switch);
    // Turned on with the keyboard.
    await toggle.focus();
    await page.keyboard.press("Space");
    await expect(toggle).toBeChecked();
    await expect(undoButton(page)).toHaveAccessibleDescription(
      `Undo: ${filter.name} was turned on`,
    );
    for (const [label, value] of filter.fields) {
      await expect(field(page, label)).toHaveValue(value);
      await expect(field(page, label)).toHaveAccessibleDescription(filter.line);
    }
    await expectNoViolations(makeAxeBuilder);

    // A number committed, then undone with the header's Undo.
    const [label, value] = filter.fields[0];
    const typed = filter.kind === "ld" ? "0.45" : "0.07";
    await field(page, label).fill(typed);
    await field(page, label).press("Enter");
    await expect(field(page, label)).toHaveValue(typed);
    await expect(undoButton(page)).toHaveAccessibleDescription(
      `Undo: ${filter.name} changed`,
    );
    await undoButton(page).click();
    await expect(field(page, label)).toHaveValue(value);
    await expect(status(page)).toHaveText(`Undone: ${filter.name} changed.`);

    // Off, its fields go.
    await flip(page, filter.switch);
    await expect(toggle).not.toBeChecked();
    await expect(undoButton(page)).toHaveAccessibleDescription(
      `Undo: ${filter.name} was turned off`,
    );
    for (const [fieldLabel] of filter.fields) {
      await expect(field(page, fieldLabel)).toHaveCount(0);
    }
  }
  await expectNoViolations(makeAxeBuilder);

  // The distance committed keeps the r², and the r² the distance.
  await flip(page, FILTERS[3].switch);
  await field(page, DISTANCE_LABEL).fill("2000");
  await field(page, DISTANCE_LABEL).press("Tab");
  await expect(field(page, R2_LABEL)).toHaveValue("0.3");
  await field(page, R2_LABEL).fill("0.2");
  await field(page, R2_LABEL).press("Enter");
  await expect(field(page, DISTANCE_LABEL)).toHaveValue("2000");
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the LD pruning changed",
  );
});

test("VS6 D2 the maximum r² refuses 1.5, and the distance 0, 2.5 and 10,000, each with its line, the value kept and the line announced", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await flip(page, FILTERS[3].switch);
  const r2 = field(page, R2_LABEL);
  const distance = field(page, DISTANCE_LABEL);
  const main = page.getByRole("main");

  for (const [input, typed, kept, line] of [
    [r2, "1.5", "0.3", "1.5 is more than 1; the maximum r² stays 0.3."],
    [
      r2,
      "0.125",
      "0.3",
      "0.125 has more than two decimals; the maximum r² stays 0.3.",
    ],
    [distance, "0", "10000", "0 is less than 1; the distance stays 10000."],
    [
      distance,
      "2.5",
      "10000",
      "2.5 is not a whole number; the distance stays 10000.",
    ],
  ] as const) {
    await input.fill(typed);
    await input.press("Enter");
    await expect(input).toHaveValue(kept);
    await expect(main.getByText(line, { exact: true })).toBeVisible();
    // The line of the refusal first, then the line under the switch.
    await expect(input).toHaveAccessibleDescription(`${line} ${LD_LINE}`);
    await expect(status(page)).toHaveText(line);
    await expectNoViolations(makeAxeBuilder);
  }
  // Nothing was committed: the last step of undo is the switch.
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the LD pruning was turned on",
  );

  // A comma typed key by key is thrown away and said at once.
  const comma =
    "Write the distance as a whole number of base pairs, 10000 and not 10,000; the distance stays 10000.";
  await distance.fill("");
  await distance.pressSequentially("10,000");
  await expect(main.getByText(comma, { exact: true })).toBeVisible();
  await expect(status(page)).toHaveText(comma);
  await distance.press("Enter");
  await expect(distance).toHaveValue("10000");
  await expect(distance).toHaveAccessibleDescription(`${comma} ${LD_LINE}`);

  // The next number taken takes the line away.
  await distance.fill("5000");
  await distance.press("Enter");
  await expect(distance).toHaveValue("5000");
  await expect(main.getByText(/the distance stays/)).toHaveCount(0);
  await expect(distance).toHaveAccessibleDescription(LD_LINE);

  // Turned off with a line under the r², the line goes with the field.
  await r2.fill("2");
  await r2.press("Enter");
  await expect(main.getByText(/the maximum r² stays/)).toHaveCount(1);
  await flip(page, FILTERS[3].switch);
  await flip(page, FILTERS[3].switch);
  await expect(r2).toHaveValue("0.3");
  await expect(main.getByText(/the maximum r² stays/)).toHaveCount(0);
});

test("VS6 D2 the keyboard goes through each filter, its switch and then its fields, in the fixed order", async ({
  page,
}) => {
  await openVariants(page);
  for (const filter of FILTERS.slice(1)) {
    await flip(page, filter.switch);
  }
  const order = FILTERS.flatMap((filter) => [
    switchOf(page, filter.switch),
    ...filter.fields.map(([label]) => field(page, label)),
  ]);
  await order[0]?.focus();
  for (const next of order.slice(1)) {
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
  }
});

// The fields read what is typed in English in every browser, whatever
// its language: a comma is no decimal mark, and the field keeps its value.
for (const locale of ["en-US", "es-ES"] as const) {
  test.describe(locale, () => {
    test.use({ locale });

    test(`VS6 D2 in a browser in ${locale} the maximum r² takes 0.25 and keeps its value for 0,25, and the MAF takes 0.9`, async ({
      page,
    }) => {
      await openVariants(page);
      await flip(page, FILTERS[3].switch);
      const r2 = field(page, R2_LABEL);
      // Typed key by key, as a user types it. Playwright's fill gives the text
      // in Firefox as one composition, the way the input method of a
      // language gives it, whose characters the field leaves to React Aria
      // to check at the end, with no line of the comma (NumberField.tsx).
      await r2.click();
      await r2.press("ControlOrMeta+a");
      await r2.pressSequentially("0,25");
      await r2.press("Enter");
      await expect(r2).toHaveValue("0.3");
      await expect(
        page
          .getByRole("main")
          .getByText(
            "Write the decimals with a point, 0.1 and not 0,1; the maximum r² stays 0.3.",
          ),
      ).toBeVisible();
      await r2.fill("0.25");
      await r2.press("Enter");
      await expect(r2).toHaveValue("0.25");

      await flip(page, FILTERS[2].switch);
      const maf = field(page, "Maximum major allele frequency, from 0 to 1");
      await maf.fill("0.9");
      await maf.press("Enter");
      await expect(maf).toHaveValue("0.9");
      await expect(undoButton(page)).toHaveAccessibleDescription(
        "Undo: the MAF filter changed",
      );
    });
  });
}

// Cmd+Z right after a commit, with the focus still in the field, is the
// project's undo: the browser's own would take back the text React Aria
// wrote, and Chromium left "0." to be committed as 0 (docs/specs/shell.md,
// "The header").
test("VS6 D2 Cmd+Z in the MAF field right after 0.9 was committed undoes the change of the project, and the Tab key then commits nothing", async ({
  page,
}) => {
  await openVariants(page);
  await flip(page, "Filter the variants by major allele frequency (MAF)");
  const maf = field(page, "Maximum major allele frequency, from 0 to 1");
  await maf.click();
  await maf.press("ControlOrMeta+a");
  await maf.pressSequentially("0.9");
  await maf.press("Enter");
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the MAF filter changed",
  );
  await maf.press("ControlOrMeta+z");
  await expect(maf).toHaveValue("0.95");
  await expect(status(page)).toHaveText("Undone: the MAF filter changed.");
  await maf.press("Tab");
  await expect(maf).toHaveValue("0.95");
  await expect(undoButton(page)).toHaveAccessibleDescription(
    "Undo: the MAF filter was turned on",
  );
});

// React Aria asks an iPhone for the keypad of decimals, which in a region
// that writes 0,1 has no point (the spec, "A character the fields do not
// take"). It tells an iPhone by the platform the browser gives, which
// the page is made to give before it starts.
test("VS6 D2 on an iPhone a field of decimals asks for the whole keyboard, and a field of whole numbers for the keypad of digits", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "platform", {
      get: () => "iPhone",
    });
    Object.defineProperty(Navigator.prototype, "userAgentData", {
      get: () => undefined,
    });
  });
  await openVariants(page);
  expect(await page.evaluate(() => navigator.platform)).toBe("iPhone");
  await flip(page, "Filter the variants by major allele frequency (MAF)");
  await flip(page, "Prune the variants by linkage disequilibrium (LD)");
  for (const label of [
    "Maximum proportion of missing genotypes, from 0 to 1",
    "Maximum major allele frequency, from 0 to 1",
    R2_LABEL,
  ]) {
    await expect(field(page, label)).toHaveAttribute("inputmode", "text");
  }
  await expect(field(page, DISTANCE_LABEL)).toHaveAttribute(
    "inputmode",
    "numeric",
  );
  await expect(page.getByLabel("Ploidy of the VCF")).toHaveAttribute(
    "inputmode",
    "numeric",
  );
});
