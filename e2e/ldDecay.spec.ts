/**
 * The flows of the LD decay on the built site
 * (docs/specs/analyses/ldDecay.md, "How it is verified", with Playwright),
 * PA8 D2 and PA8 D3 of the plan of stage 5, each from a fresh page:
 *
 * - ld.nei and ld_pops.csv, pop: the lock of the distance beside the field
 *   and the Run button; no key sends anything while the distance is
 *   empty; 100,000 typed with its comma is refused; 100000 typed, Run,
 *   the plot, "7,548" and "7,340" in the column "Half distance (bp)" and
 *   no warning; the path of the keyboard, the two fields, Run, the tabs
 *   of the plot and the table, the downloads.
 * - 17 populations of 5 or 6 individuals: 16 rows in the legend, the line
 *   of the populations the plot leaves out, and 17 rows in the table.
 * - The key on the screen: the LD pruning of the Variants step turned on
 *   and its distance changed remove no result and send no request; the
 *   missing data filter changed removes it, with its notice.
 * - The restart: after an LD decay, a Run of the diversity is answered by
 *   a calculation worker started after the one that ran the LD decay.
 *
 * axe runs in each state reached. The requests and the workers are
 * counted as the page makes them, by a `Worker` put on the page before
 * its scripts run. The numbers are popnei's of the spec, as the screen
 * rounds them; nothing is read from the pixels of the plot.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The LD decay of ld.nei takes well under a second; 30 s leaves room for
    a loaded machine. */
const RESULT_TIMEOUT = 30_000;

const DISTANCE =
  "Largest distance between the two variants of a pair, in base pairs, from 50";
const FREQUENCY =
  "Maximum major allele frequency in each population, from 0.5 to 1";
const NO_DISTANCE =
  "The LD decay needs the largest distance between the two variants of a pair. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs.";
const PRUNING_LINE =
  "The LD pruning of the Variants step is not applied here: it removes the pairs of variants in LD that this analysis measures. The other filters of the Variants step are.";

/** What the page counted: the calculations it asked of its workers, the
    calculation workers it started, and, for each calculation, which of
    those workers it was asked of, numbered from 1 as they were started. */
interface Counted {
  runs: number;
  runners: number;
  askedOf: number[];
}

/** Counts, in `window.counted`, the calculation workers the page starts
    and the calculations it asks of them: every "run" message is one. */
function count(): void {
  const counted: Counted = { runs: 0, runners: 0, askedOf: [] };
  Object.assign(globalThis, { counted });
  class CountedWorker extends Worker {
    /** Its number among the calculation workers, or 0 for another. */
    readonly runner: number;
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      if (String(url).includes("runnerWorker")) {
        counted.runners += 1;
        this.runner = counted.runners;
      } else {
        this.runner = 0;
      }
    }
    override postMessage(message: unknown, options?: unknown): void {
      if (
        typeof message === "object" &&
        message !== null &&
        "kind" in message &&
        message.kind === "run"
      ) {
        counted.runs += 1;
        counted.askedOf.push(this.runner);
      }
      super.postMessage(message, options as StructuredSerializeOptions);
    }
  }
  globalThis.Worker = CountedWorker;
}

/** What the page counted so far. */
async function countedOf(page: Page): Promise<Counted> {
  return page.evaluate(
    () => (globalThis as unknown as { counted: Counted }).counted,
  );
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** Goes to a step by its link in the stepper. */
async function goTo(page: Page, step: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: step })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

/** Picks `file`, a fixture or a file of a name and a text, with the
    button of the zone `region`, through the file picker of the system. */
async function pick(
  page: Page,
  region: string,
  file: string | { readonly name: string; readonly text: string },
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: region })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (
    await chooser
  ).setFiles(
    typeof file === "string"
      ? join(FIXTURES, file)
      : {
          name: file.name,
          mimeType: "text/csv",
          buffer: Buffer.from(file.text),
        },
  );
}

/** Opens the page with its requests and workers counted, loads ld.nei and
    the metadata file `metadata`, chooses the column pop, and goes to the
    Analyses step. */
async function load(
  page: Page,
  metadata: string | { readonly name: string; readonly text: string },
): Promise<void> {
  await page.addInitScript(count);
  await page.goto("popgen.html#variants");
  await pick(page, "Variants file", "ld.nei");
  await expect(page.getByText(/^[\d,]+ individuals$/)).toBeVisible();
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", metadata);
  await expect(page.getByText(/^All [\d,]+ individuals of /)).toBeVisible();
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: "pop", exact: true }).click();
  await goTo(page, "Analyses");
}

/** The panel of the LD decay, its region named by its heading. */
function panel(page: Page): Locator {
  return page.getByRole("region", { name: "LD decay", exact: true });
}

/** The Run button of the panel. */
function runButton(page: Page): Locator {
  return panel(page).getByRole("button", { name: "Run", exact: true });
}

/** The plot, the image a screen reader meets. */
function plot(page: Page): Locator {
  return panel(page).getByRole("img", { name: "LD decay" });
}

/** The table of the populations, named by its caption. */
function populations(page: Page): Locator {
  return panel(page).getByRole("table", {
    name: /^The LD decay of each population/,
  });
}

/** The cell of the column "Half distance (bp)" of the population `pop`:
    the fifth column, the fourth cell after the header of the row. */
function halfDistance(page: Page, pop: string): Locator {
  return populations(page)
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: pop, exact: true }) })
    .getByRole("cell")
    .nth(3);
}

/** Types `distance` key by key in the field of the largest distance, and
    commits it with Enter. */
async function setDistance(page: Page, distance: string): Promise<void> {
  const field = panel(page).getByLabel(DISTANCE);
  await field.clear();
  await field.pressSequentially(distance);
  await field.press("Enter");
  await expect(field).toHaveValue(distance);
}

/** Runs the LD decay up to 100,000 bp, and waits for the plot and the
    table of the populations. */
async function runTo100000(page: Page): Promise<void> {
  await setDistance(page, "100000");
  await runButton(page).click();
  await expect(populations(page)).toBeVisible({ timeout: RESULT_TIMEOUT });
  await expect(plot(page)).toBeVisible();
}

/** The notice of the shell that names the LD decay removed. */
function removedNotice(page: Page): Locator {
  return page.getByRole("alertdialog", { name: /^LD decay removed because/ });
}

test.describe("PA8 D2 the LD decay on the screen", () => {
  test("PA8 D2 ld.nei with its two populations: the lock of the distance beside the field and the Run button, no key sends anything while it is empty, 100000 typed, Run with the keyboard, the plot, 7,548 and 7,340 bp and no warning, the tabs and the downloads", async ({
    page,
    makeAxeBuilder,
  }) => {
    await load(page, "ld_pops.csv");
    const distance = panel(page).getByLabel(DISTANCE);
    const frequency = panel(page).getByLabel(FREQUENCY);

    // Locked: the reason beside the field, which it describes before
    // the line under it, and beside the disabled Run.
    await expect(distance).toHaveValue("");
    await expect(frequency).toHaveValue("0.95");
    await expect(panel(page).getByText(NO_DISTANCE)).toHaveCount(2);
    await expect(distance).toHaveAccessibleDescription(
      new RegExp(`^${NO_DISTANCE.replaceAll(".", "\\.")} How far to look`),
    );
    await expect(runButton(page)).toBeDisabled();
    await expect(runButton(page)).toHaveAccessibleDescription(NO_DISTANCE);
    await expectNoViolations(makeAxeBuilder);

    // No key sends anything while the distance is empty: the keys that
    // step a number, Home and End, Enter, and the Tab key there and back.
    await distance.focus();
    for (const key of [
      "ArrowUp",
      "ArrowDown",
      "PageUp",
      "PageDown",
      "Home",
      "End",
      "Enter",
    ]) {
      await page.keyboard.press(key);
      await expect(distance).toHaveValue("");
    }
    await page.keyboard.press("Tab");
    await expect(frequency).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(distance).toBeFocused();
    await expect(distance).toHaveValue("");
    await expect(runButton(page)).toBeDisabled();
    await expect(panel(page).getByText(NO_DISTANCE)).toHaveCount(2);
    await expect(removedNotice(page)).toHaveCount(0);

    // 100,000 typed key by key, with its comma, is refused, and the
    // distance is still to be typed.
    await page.keyboard.type("100,000");
    await expect(
      panel(page).getByText(
        "Write the distance as a whole number of base pairs, 10000 and not 10,000; the distance is still to be typed.",
      ),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(distance).toHaveValue("");
    await expect(runButton(page)).toBeDisabled();

    // 0,9 typed key by key in the frequency is refused as well.
    await frequency.focus();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.type("0,9");
    await expect(
      panel(page).getByText(
        "Write the decimals with a point, 0.9 and not 0,9; the frequency stays 0.95.",
      ),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(frequency).toHaveValue("0.95");

    // The path of the keyboard: the distance typed, the Tab key to the
    // frequency, which commits it and unlocks Run, and to Run.
    await distance.focus();
    await page.keyboard.type("100000");
    await page.keyboard.press("Tab");
    await expect(frequency).toBeFocused();
    await expect(panel(page).getByText(NO_DISTANCE)).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(runButton(page)).toBeFocused();
    await expect(
      panel(page).getByText("100 individuals of ld.nei"),
    ).toBeVisible();
    await expectNoViolations(makeAxeBuilder);
    expect((await countedOf(page)).runs).toBe(0);
    await page.keyboard.press("Enter");

    // Done: the plot, the two half distances, and no warning.
    await expect(populations(page)).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(plot(page)).toBeVisible();
    await expect(populations(page).getByRole("columnheader").nth(4)).toHaveText(
      "Half distance (bp)",
    );
    await expect(halfDistance(page, "pop_a")).toHaveText("7,548");
    await expect(halfDistance(page, "pop_b")).toHaveText("7,340");
    await expect(panel(page).locator(".chart-legend-row text")).toHaveText([
      "pop_a · half at 7,548 bp",
      "pop_b · half at 7,340 bp",
    ]);
    await expect(panel(page).getByText(/^Warning/)).toHaveCount(0);
    await expect(panel(page).getByText(/warnings?$/)).toHaveCount(0);
    // The Run button went with the focus on it: the heading has it.
    await expect(
      panel(page).getByRole("heading", { level: 2, name: "LD decay" }),
    ).toBeFocused();
    expect((await countedOf(page)).runs).toBe(1);
    await expectNoViolations(makeAxeBuilder);

    // After the fields, the tabs of the plot and the table.
    await frequency.focus();
    await page.keyboard.press("Tab");
    const plotTab = panel(page).getByRole("tab", { name: "Plot" });
    const binsTab = panel(page).getByRole("tab", { name: "Table of the bins" });
    await expect(plotTab).toBeFocused();
    await expect(plotTab).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(binsTab).toBeFocused();
    await expect(binsTab).toHaveAttribute("aria-selected", "true");
    const bins = panel(page).getByRole("table", { name: /^The 50 bins/ });
    // The header and 50 bins for each of the two populations.
    await expect(bins.getByRole("row")).toHaveCount(101);
    await expect(bins.getByRole("row").nth(1).getByRole("cell")).toHaveText([
      "1",
      "2,000",
      "745",
      "0.3105",
      "0.2824",
    ]);
    await expect(plot(page)).toHaveCount(0);
    await expectNoViolations(makeAxeBuilder);
    await page.keyboard.press("ArrowLeft");
    await expect(plotTab).toHaveAttribute("aria-selected", "true");
    await expect(plot(page)).toBeVisible();

    // Then the downloads, the table of the populations first.
    const first = panel(page).getByRole("button", {
      name: "Download the table of the populations as CSV",
    });
    const second = panel(page).getByRole("button", {
      name: "Download the table of the bins as CSV",
    });
    await first.focus();
    const one = page.waitForEvent("download");
    await page.keyboard.press("Enter");
    expect((await one).suggestedFilename()).toBe("ld.ld_decay.csv");
    await page.keyboard.press("Tab");
    await expect(second).toBeFocused();
    const two = page.waitForEvent("download");
    await page.keyboard.press("Enter");
    expect((await two).suggestedFilename()).toBe("ld.ld_decay_bins.csv");
    // No stop of the Tab key lies between the tabs and the first download
    // but the panel of the tab shown.
    await plotTab.focus();
    await page.keyboard.press("Tab");
    await expect(first).not.toBeFocused();
    await page.keyboard.press("Tab");
    await expect(first).toBeFocused();
  });

  test("PA8 D2 17 populations of 5 or 6 individuals: 16 rows in the legend, q0 to q15, the line of the populations the plot leaves out, and 17 rows in the table", async ({
    page,
    makeAxeBuilder,
  }) => {
    await load(page, {
      name: "pops17.csv",
      text: `IID,pop\n${Array.from(
        { length: 100 },
        (_, i) => `i${String(i).padStart(3, "0")},q${String(i % 17)}\n`,
      ).join("")}`,
    });
    await runTo100000(page);
    const legend = panel(page).locator(".chart-legend-row text");
    await expect(legend).toHaveCount(16);
    expect(
      (await legend.allTextContents()).map((label) => label.split(" · ")[0]),
    ).toEqual(Array.from({ length: 16 }, (_, i) => `q${String(i)}`));
    await expect(
      panel(page).getByText(
        "The plot draws the first 16 of the 17 populations, in the order of the table. The tables below hold all 17.",
      ),
    ).toBeVisible();
    await expect(populations(page).getByRole("rowheader")).toHaveText(
      Array.from({ length: 17 }, (_, i) => `q${String(i)}`),
    );
    await expect(
      panel(page).getByText(
        /^Warning: Populations q0, q1 and 15 more have fewer than 20 individuals\./,
      ),
    ).toBeVisible();
    await expectNoViolations(makeAxeBuilder);
  });
});

test.describe("PA8 D3 the key of the LD decay on the screen, and its restart", () => {
  test("PA8 D3 the LD pruning of the Variants step turned on and its distance changed remove no result and send no request; the missing data filter changed removes it with its notice", async ({
    page,
    makeAxeBuilder,
  }) => {
    await load(page, "ld_pops.csv");
    await runTo100000(page);
    await expect(halfDistance(page, "pop_a")).toHaveText("7,548");
    const posted = (await countedOf(page)).runs;
    expect(posted).toBe(1);

    /** The result is on the screen as it was, with the line of the
        pruning, no notice and no request. */
    const kept = async (): Promise<void> => {
      await goTo(page, "Analyses");
      await expect(halfDistance(page, "pop_a")).toHaveText("7,548");
      await expect(halfDistance(page, "pop_b")).toHaveText("7,340");
      await expect(plot(page)).toBeVisible();
      await expect(panel(page).getByText(PRUNING_LINE)).toBeVisible();
      await expect(removedNotice(page)).toHaveCount(0);
      await expect(panel(page).getByText(/was removed because/)).toHaveCount(0);
      expect((await countedOf(page)).runs).toBe(posted);
    };

    // The LD pruning turned on, with no distance.
    await expect(panel(page).getByText(PRUNING_LINE)).toHaveCount(0);
    await goTo(page, "Variants");
    await page
      .getByText("Prune the variants by linkage disequilibrium (LD)", {
        exact: true,
      })
      .click();
    const pruningDistance = page.getByLabel(
      "Distance within which variants are compared, in base pairs, from 1",
    );
    await expect(pruningDistance).toHaveValue("");
    await kept();
    await expectNoViolations(makeAxeBuilder);

    // Its distance typed, and changed.
    for (const typed of ["50000", "20000"]) {
      await goTo(page, "Variants");
      await pruningDistance.fill(typed);
      await pruningDistance.press("Enter");
      await expect(pruningDistance).toHaveValue(typed);
      await kept();
    }

    // The missing data filter, which the LD decay reads.
    await goTo(page, "Variants");
    const threshold = page.getByLabel(
      "Maximum proportion of missing genotypes, from 0 to 1",
      { exact: true },
    );
    await threshold.fill("0.05");
    await threshold.press("Enter");
    await expect(
      page.getByRole("alertdialog", {
        name: "LD decay removed because the filter of the variants by missing data changed",
      }),
    ).toBeVisible();
    await goTo(page, "Analyses");
    await expect(
      panel(page).getByText(
        "The LD decay was removed because the filter of the variants by missing data changed. Undo brings back the LD decay as it was, with no calculation; Run calculates a new one for the new settings.",
      ),
    ).toBeVisible();
    await expect(populations(page)).toHaveCount(0);
    await expect(plot(page)).toHaveCount(0);
    await expect(runButton(page)).toBeEnabled();
    expect((await countedOf(page)).runs).toBe(posted);
    await expectNoViolations(makeAxeBuilder);
  });

  test("PA8 D3 after an LD decay, a Run of the diversity is answered by a calculation worker the page started after the one that ran the LD decay", async ({
    page,
  }) => {
    await load(page, "ld_pops.csv");
    await runTo100000(page);
    const afterLd = await countedOf(page);
    expect(afterLd.runs).toBe(1);
    const ranLd = afterLd.askedOf[0] ?? 0;
    expect(ranLd).toBeGreaterThanOrEqual(1);

    const diversity = page.getByRole("region", {
      name: "Diversity",
      exact: true,
    });
    await diversity.getByRole("button", { name: "Run", exact: true }).click();
    await expect(
      diversity.getByRole("rowheader", { name: "pop_a", exact: true }).first(),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    const afterDiversity = await countedOf(page);
    expect(afterDiversity.runs).toBeGreaterThan(afterLd.runs);
    // Every request after the LD decay went to a worker started after
    // the one that ran it, and the page started one more at least.
    for (const runner of afterDiversity.askedOf.slice(afterLd.runs)) {
      expect(runner).toBeGreaterThan(ranLd);
    }
    expect(afterDiversity.runners).toBeGreaterThan(ranLd);
    // The plot of the LD decay is still shown.
    await expect(halfDistance(page, "pop_a")).toHaveText("7,548");
  });
});
