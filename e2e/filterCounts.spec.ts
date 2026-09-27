/**
 * What each filter of the variants kept, on the built site
 * (docs/specs/steps/variants.md, "What each filter of the variants kept"
 * and "How it is checked", stage 3; docs/specs/analyses/filterCounts.md,
 * "The Count button"), on e2e/fixtures/panel.nei, 1,200 variants of 200
 * individuals, with the counts popnei's release js-v0.1.0-dev.2 gave in
 * node on 26 September 2026: the Count at 0.05, the count beside the
 * filter and in the description of its field, the line of the total and
 * the focus on it; the three filters counted; the counts gone at a
 * change and back by an undo with no calculation; the Count running and
 * stopped, stopped by a new load, refused, and failed; a filter that
 * kept none; no filter; a file of no variant; the keyboard; and axe at
 * each state reached.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const COUNT = "Count the variants each filter keeps";
const NOT_COUNTED =
  "Not counted for these filters. Count, or run an analysis, to see what each filter keeps.";
const MISSING_LABEL = "Maximum proportion of missing genotypes, from 0 to 1";
const OBS_HET_LABEL = "Maximum observed heterozygosity, from 0 to 1";
const MAF_LABEL = "Maximum major allele frequency, from 0 to 1";
const OBS_HET_SWITCH = "Filter the variants by observed heterozygosity";
const MAF_SWITCH = "Filter the variants by major allele frequency (MAF)";
const MISSING_SWITCH = "Filter the variants by missing data";
const LD_SWITCH = "Prune the variants by linkage disequilibrium (LD)";
const MISSING_DATA_LINE =
  "A genotype is missing when any of its alleles is, 0/. among them; the proportion is over every individual of the file.";
const MAF_LINE =
  "The frequency of the commonest allele: 0.95 removes a variant whose commonest allele is above 0.95. For a variant of two alleles, that is a minor allele frequency below 0.05.";
const KEPT_AT_005 = "Kept 1,152 of the 1,200 variants it was given.";
const TOTAL_AT_005 =
  "1,152 of the 1,200 variants of panel.nei pass the filters.";

async function openVariants(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
}

/** Picks `fixture` with the file button, as a user does, and waits for
    the card of the file read. */
async function pick(
  page: Page,
  fixture: string | { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (
    await chooser
  ).setFiles(typeof fixture === "string" ? join(FIXTURES, fixture) : fixture);
  await expect(
    page
      .getByRole("region", { name: "Variants file" })
      .getByText(/individuals$/),
  ).toBeVisible();
}

function filters(page: Page): Locator {
  return page.getByRole("region", { name: "Filters of the variants" });
}

function field(page: Page, label: string): Locator {
  return page.getByLabel(label, { exact: true });
}

function countButton(page: Page): Locator {
  return filters(page).getByRole("button", { name: COUNT });
}

/** Turns a switch on or off with the mouse, on its words. */
async function flip(page: Page, name: string): Promise<void> {
  await filters(page).getByText(name, { exact: true }).click();
}

/** Types `value` into the field `label` and commits it with Enter. */
async function setField(
  page: Page,
  label: string,
  value: string,
): Promise<void> {
  const input = field(page, label);
  await input.fill(value);
  await input.press("Enter");
  await expect(input).toHaveValue(value);
}

/** Presses the Count button with the keyboard, which leaves the focus on
    it in every engine, as a click does not in WebKit. */
async function count(page: Page): Promise<void> {
  await countButton(page).focus();
  await page.keyboard.press("Enter");
}

function banner(page: Page, name: string): Locator {
  return page.getByRole("banner").getByRole("button", { name, exact: true });
}

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** Makes the calculation worker keep its results back and pass its
    progress on, so that a calculation stays under way, or, with
    `crash`, answer each result as if it had crashed. */
async function tamperWithResults(
  page: Page,
  how: "hold" | "crash",
): Promise<void> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate((crash) => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
    };
    const post = scope.postMessage.bind(scope);
    scope.postMessage = (message, transfer) => {
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind !== "result") {
        post(message, transfer);
      } else if (crash) {
        post({ kind: "crashed", message: "a crash made by the test" });
      }
    };
  }, how === "crash");
}

test("VS6 D2 the Count at 0.05: the count beside the filter and in the description of its field, the line of the total with the focus on it, and its end announced", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await setField(page, MISSING_LABEL, "0.05");
  await expect(
    filters(page).getByText(NOT_COUNTED, { exact: true }),
  ).toBeVisible();
  await expect(filters(page).getByText(/^Kept /)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await count(page);
  const total = filters(page).getByText(TOTAL_AT_005, { exact: true });
  await expect(total).toBeVisible();
  // The button goes, and the focus, which was on it, is on the line of
  // the total, which is not a stop of the Tab key.
  await expect(total).toBeFocused();
  await expect(total).toHaveAttribute("tabindex", "-1");
  await expect(countButton(page)).toHaveCount(0);
  await expect(filters(page).getByText(NOT_COUNTED)).toHaveCount(0);
  await expect(
    filters(page).getByText(KEPT_AT_005, { exact: true }),
  ).toBeVisible();
  // The field is described by the count first, then by the line under
  // the switch, which alone describes the switch.
  await expect(field(page, MISSING_LABEL)).toHaveAccessibleDescription(
    `${KEPT_AT_005} ${MISSING_DATA_LINE}`,
  );
  await expect(
    page.getByRole("switch", { name: MISSING_SWITCH }),
  ).toHaveAccessibleDescription(MISSING_DATA_LINE);
  await expect(status(page)).toContainText(
    `Counts of the filters: done. ${TOTAL_AT_005}`,
  );
  // No filter kept none: no warning.
  await expect(
    filters(page).getByRole("heading", { name: /warning/ }),
  ).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 the three filters counted, 1,152 of 1,152 and 1,128 of 1,152, and the line of the total; the counts gone at each change and in no notice", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await setField(page, MISSING_LABEL, "0.05");
  await count(page);
  await expect(filters(page).getByText(TOTAL_AT_005)).toBeVisible();

  await flip(page, OBS_HET_SWITCH);
  await setField(page, OBS_HET_LABEL, "0.9");
  await flip(page, MAF_SWITCH);
  await expect(field(page, MAF_LABEL)).toHaveValue("0.95");
  // A change of any filter takes every count off, and says so in no
  // notice.
  await expect(filters(page).getByText(/^Kept /)).toHaveCount(0);
  await expect(
    filters(page).getByText(NOT_COUNTED, { exact: true }),
  ).toBeVisible();
  await expect(countButton(page)).toBeVisible();
  await expect(
    page.getByText(/Counts of the filters .*removed|counts .*removed/i),
  ).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await count(page);
  const total = filters(page).getByText(
    "1,128 of the 1,200 variants of panel.nei pass the filters.",
    { exact: true },
  );
  await expect(total).toBeFocused();
  await expect(
    filters(page).getByText(KEPT_AT_005, { exact: true }),
  ).toBeVisible();
  await expect(
    filters(page).getByText("Kept 1,152 of the 1,152 variants it was given.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    filters(page).getByText("Kept 1,128 of the 1,152 variants it was given.", {
      exact: true,
    }),
  ).toBeVisible();
  // The filter by observed heterozygosity has no line under its switch:
  // its field is described by its count alone.
  await expect(field(page, OBS_HET_LABEL)).toHaveAccessibleDescription(
    "Kept 1,152 of the 1,152 variants it was given.",
  );
  await expect(field(page, MAF_LABEL)).toHaveAccessibleDescription(
    `Kept 1,128 of the 1,152 variants it was given. ${MAF_LINE}`,
  );
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 an undo brings back the counts of the filters before, with no calculation", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await setField(page, MISSING_LABEL, "0.05");
  await count(page);
  await expect(filters(page).getByText(TOTAL_AT_005)).toBeVisible();
  // From here the worker gives no result: what comes back comes from
  // the cache.
  await tamperWithResults(page, "hold");
  await setField(page, MISSING_LABEL, "0.1");
  await expect(
    filters(page).getByText(NOT_COUNTED, { exact: true }),
  ).toBeVisible();
  await expect(filters(page).getByText(/^Kept /)).toHaveCount(0);

  await banner(page, "Undo").click();
  await expect(field(page, MISSING_LABEL)).toHaveValue("0.05");
  await expect(
    filters(page).getByText(TOTAL_AT_005, { exact: true }),
  ).toBeVisible();
  await expect(
    filters(page).getByText(KEPT_AT_005, { exact: true }),
  ).toBeVisible();
  await expect(filters(page).getByRole("progressbar")).toHaveCount(0);
  await expect(countButton(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 the Count running: Stop, the bar and its line, the line of no counts; stopped, the button back with the focus", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await tamperWithResults(page, "hold");
  await count(page);
  const stop = filters(page).getByRole("button", { name: "Stop" });
  await expect(stop).toBeFocused();
  await expect(
    filters(page).getByRole("progressbar", {
      name: "Calculating the counts of the filters",
    }),
  ).toBeVisible();
  await expect(filters(page).getByText(/^Calculating · /)).toBeVisible();
  await expect(
    filters(page).getByText(NOT_COUNTED, { exact: true }),
  ).toBeVisible();
  await expect(filters(page).getByText(/^Kept /)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await stop.press("Enter");
  await expect(countButton(page)).toBeFocused();
  await expect(filters(page).getByRole("progressbar")).toHaveCount(0);
  await expect(status(page)).toContainText("Counts of the filters: stopped.");
});

test("VS6 D2 a Count under way stopped by a new load, with the line that says so and the button back", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await tamperWithResults(page, "hold");
  await count(page);
  await expect(
    filters(page).getByRole("button", { name: "Stop" }),
  ).toBeVisible();
  await pick(page, "panel.nei");
  await expect(
    filters(page).getByText(
      "The calculation of the counts of the filters was stopped because a new variants file was loaded.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(countButton(page)).toBeVisible();
  await expect(
    filters(page).getByText(NOT_COUNTED, { exact: true }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 the Count refused: the ploidy of tetraploid.vcf.gz, in the words of the diversity with no button, and the focus on them", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "tetraploid.vcf.gz");
  await count(page);
  const words = filters(page).getByText(
    "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.",
    { exact: true },
  );
  await expect(words).toBeVisible();
  // popnei would refuse it again: no button, and the focus on the words,
  // which are not a stop of the Tab key.
  await expect(countButton(page)).toHaveCount(0);
  const focused = page.locator(":focus");
  await expect(focused).toHaveAttribute("tabindex", "-1");
  await expect(focused).toContainText("At line 5 of tetraploid.vcf.gz");
  await expect(
    filters(page).getByText(NOT_COUNTED, { exact: true }),
  ).toBeVisible();
  await expect(filters(page).getByText(/^Kept /)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 a Count whose worker stopped asks to count again, with the button, which then gives the counts", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await tamperWithResults(page, "crash");
  await count(page);
  await expect(
    filters(page).getByText(
      "The calculation stopped unexpectedly. Count again. If it stops again, load panel.nei again in the Variants step.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(countButton(page)).toBeFocused();
  await expectNoViolations(makeAxeBuilder);
  // The crash started a new worker, which answers.
  await count(page);
  await expect(
    filters(page).getByText(
      "1,200 of the 1,200 variants of panel.nei pass the filters.",
      { exact: true },
    ),
  ).toBeFocused();
});

test("VS6 D2 a filter that kept none: its count, the line of the total, and the warning that names it", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await setField(page, MISSING_LABEL, "0.05");
  await flip(page, MAF_SWITCH);
  await setField(page, MAF_LABEL, "0.4");
  await count(page);
  const total = filters(page).getByText(
    "0 of the 1,200 variants of panel.nei pass the filters.",
    { exact: true },
  );
  await expect(total).toBeFocused();
  await expect(
    filters(page).getByText("Kept 0 of the 1,152 variants it was given.", {
      exact: true,
    }),
  ).toBeVisible();
  const warning =
    "The MAF filter kept none of the 1,152 variants it was given, so the analyses and the statistics of each individual have no variant to calculate over, and a file written would hold none. Loosen it, or a filter before it.";
  await expect(filters(page).getByText(warning)).toBeVisible();
  await expect(
    filters(page).getByRole("heading", { name: "1 warning" }),
  ).toBeVisible();
  // The shell announces the warning in place of the total.
  await expect(status(page)).toContainText(
    `Counts of the filters: done. ${warning}`,
  );
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 with no filter the Count gives the variants of the file", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await flip(page, MISSING_SWITCH);
  await count(page);
  await expect(
    filters(page).getByText("1,200 variants in panel.nei, with no filter.", {
      exact: true,
    }),
  ).toBeFocused();
  await expect(filters(page).getByText(/^Kept /)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 a file of no variant counted: counts of zero and the warning of a file with no variant", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await pick(page, {
    name: "empty.vcf",
    mimeType: "text/plain",
    buffer: Buffer.from(
      '##fileformat=VCFv4.2\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
        "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ta\tb\n",
    ),
  });
  await count(page);
  await expect(
    filters(page).getByText(
      "0 of the 0 variants of empty.vcf pass the filters.",
      { exact: true },
    ),
  ).toBeFocused();
  await expect(
    filters(page).getByText("Kept 0 of the 0 variants it was given.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    filters(page).getByText(
      'empty.vcf has no variant with PASS or . in its FILTER column, and it was read with only those. Untick "Only the variants with PASS or . in the FILTER column" and read the file again.',
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("VS6 D2 before a file is read, no Count, no line of no counts and no count beside a filter", async ({
  page,
}) => {
  await openVariants(page);
  await expect(
    filters(page).getByText(
      "The histograms, the counts and the statistics of each individual are calculated once a variants file is read.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(countButton(page)).toHaveCount(0);
  await expect(filters(page).getByText(NOT_COUNTED)).toHaveCount(0);
  await expect(filters(page).getByText(/^Kept /)).toHaveCount(0);
});

test("VS6 D2 the keyboard reaches the Count after the last filter, and leaves the line of the total out of the order of the Tab key", async ({
  page,
}) => {
  await openVariants(page);
  await pick(page, "panel.nei");
  await page.getByRole("switch", { name: LD_SWITCH }).focus();
  await page.keyboard.press("Tab");
  await expect(countButton(page)).toBeFocused();
  await page.keyboard.press("Enter");
  const total = filters(page).getByText(
    /^[\d,]+ of the 1,200 variants of panel\.nei pass the filters\.$/,
  );
  await expect(total).toBeFocused();
  await expect(total).toHaveAttribute("tabindex", "-1");
  // Shift+Tab from the line goes back to the last filter, and Tab from
  // there skips the line.
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("switch", { name: LD_SWITCH })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(total).not.toBeFocused();
});
