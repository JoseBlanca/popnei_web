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
 *   of the plot and the table, the downloads, each file read and its
 *   first lines compared with popnei's numbers of the spec.
 * - The states a result is not in: locked by the memory of the counts,
 *   with the reason beside the field and said by the status region;
 *   running, with the line of the fit; and popnei's refusal of filters
 *   that keep no variant.
 * - At 320 pixels the frame of the plot is reached by the Tab key and
 *   scrolled by the arrow keys.
 * - At 320 pixels, with population names of 45 characters, the warnings
 *   of the LD decay, of the diversity and of the distances between
 *   populations, which share the frame of the panels, do not make the
 *   page scroll sideways.
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
import { readFile } from "node:fs/promises";
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
const NO_DISTANCE_RUN = "Type the largest distance, above.";
const FIT_LINE =
  "The bar shows the reading of ld.nei. The curves are fitted once it is read. With a large distance on a file whose variants are close together, the reading may take tens of minutes and may end with the LD decay refused for lack of memory.";
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
  // The media type of every file the page hands the browser to save.
  const types: string[] = [];
  Object.assign(globalThis, { savedTypes: types });
  const createObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (object: Blob | MediaSource): string => {
    if (object instanceof Blob) types.push(object.type);
    return createObjectURL(object);
  };
}

/** The media types of the files the page handed the browser to save. */
async function savedTypes(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (globalThis as unknown as { savedTypes: string[] }).savedTypes,
  );
}

/** The lines of the file of a download, read where the browser saved
    it. */
async function linesOf(download: {
  path(): Promise<string>;
}): Promise<string[]> {
  return (await readFile(await download.path(), "utf8")).split("\n");
}

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

/** Makes the calculation worker keep its results until its `release` is
    called, so that the panel stays in its running state. */
async function holdResults(page: Page): Promise<void> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
      held: [unknown, Transferable[] | undefined][];
      release: () => void;
    };
    const post = scope.postMessage.bind(scope);
    scope.held = [];
    scope.release = () => {
      for (const [message, transfer] of scope.held) post(message, transfer);
      scope.held = [];
      scope.postMessage = post;
    };
    scope.postMessage = (message, transfer) => {
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind === "result") scope.held.push([message, transfer]);
      else post(message, transfer);
    };
  });
}

/** Lets the results the calculation worker kept go to the page, from a
    timer of the worker, so that this call has its answer first: the page
    ends the worker of an LD decay as soon as its result arrives, and in
    WebKit 26.6 a call that posted the result itself failed 2 times in 6,
    its worker closed before it answered. */
async function releaseResults(page: Page): Promise<void> {
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    setTimeout(() => {
      (globalThis as unknown as { release: () => void }).release();
    }, 0);
  });
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

/** The table of the bins, named by its caption. */
function binsTable(page: Page): Locator {
  return panel(page).getByRole("table", { name: /^The \d+ bins/ });
}

/** The frame the table of the bins scrolls in, a region named by the
    caption of the table while the table is higher than it. */
function binsFrame(page: Page): Locator {
  return panel(page).getByRole("region", { name: /^The \d+ bins/ });
}

/** The top and the bottom of `locator` on the page. */
async function edgesOf(
  locator: Locator,
): Promise<{ readonly top: number; readonly bottom: number }> {
  const box = await locator.boundingBox();
  if (box === null) throw new Error("The element is not drawn.");
  return { top: box.y, bottom: box.y + box.height };
}

/** Checks that the table of the bins, of `rows` rows with its header, is
    in a frame lower than it, and that after the frame is scrolled to its
    end its header is still at the top of the frame, and its last row in
    view. */
async function expectBinsFramed(page: Page, rows: number): Promise<void> {
  const table = binsTable(page);
  const frame = binsFrame(page);
  await expect(table.getByRole("row")).toHaveCount(rows);
  await expect(
    panel(page).getByText("Scroll the table to see all its rows."),
  ).toBeVisible();
  const sizes = await frame.evaluate((element) => ({
    held: element.scrollHeight,
    shown: element.clientHeight,
  }));
  // At most 28rem, 448 pixels, and two lines of a border.
  expect(sizes.shown).toBeLessThanOrEqual(450);
  expect(sizes.held).toBeGreaterThan(sizes.shown);
  await frame.evaluate((element) => {
    element.scrollTo(0, element.scrollHeight);
  });
  const frameEdges = await edgesOf(frame);
  const header = await edgesOf(
    table.getByRole("columnheader", { name: "Mean r²" }),
  );
  expect(header.top).toBeGreaterThanOrEqual(frameEdges.top);
  expect(header.top).toBeLessThan(frameEdges.top + 4);
  const last = await edgesOf(table.getByRole("row").last());
  expect(last.bottom).toBeLessThanOrEqual(frameEdges.bottom + 1);
  // The last row lies under the header, not behind it.
  expect(last.top).toBeGreaterThanOrEqual(header.bottom - 1);
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
  test("PA8 D2 ld.nei with its two populations: why the distance has to be typed beside the field and where beside the Run button, no key sends anything while it is empty, 100000 typed, Run with the keyboard, the plot, 7,548 and 7,340 bp and no warning, the tabs and the downloads", async ({
    page,
    makeAxeBuilder,
  }) => {
    await load(page, "ld_pops.csv");
    const distance = panel(page).getByLabel(DISTANCE);
    const frequency = panel(page).getByLabel(FREQUENCY);

    // Locked: why the distance has to be typed beside the field alone,
    // which it describes before the line under it, as a line of help with
    // no mark of a problem; and beside the disabled Run, where to type it.
    await expect(distance).toHaveValue("");
    await expect(frequency).toHaveValue("0.95");
    await expect(panel(page).getByText(NO_DISTANCE)).toHaveCount(1);
    await expect(panel(page).getByText(NO_DISTANCE).locator("svg")).toHaveCount(
      0,
    );
    await expect(distance).toHaveAccessibleDescription(
      new RegExp(`^${NO_DISTANCE.replaceAll(".", "\\.")} How far to look`),
    );
    await expect(runButton(page)).toBeDisabled();
    await expect(runButton(page)).toHaveAccessibleDescription(NO_DISTANCE_RUN);
    await expect(panel(page).getByText(NO_DISTANCE_RUN)).toHaveCount(1);
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
    await expect(panel(page).getByText(NO_DISTANCE)).toHaveCount(1);
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
    await expect(panel(page).getByText(NO_DISTANCE_RUN)).toHaveCount(0);
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
    // The legend stands at the right of the frame, on this wide page.
    await expect(panel(page).locator("g.chart-legend")).toHaveAttribute(
      "data-place",
      "right",
    );
    // The table of the populations stands above the tabs, with the
    // caption that says what its r² at distance 0 is.
    const tablist = panel(page).getByRole("tablist", {
      name: "Mean r² against the distance",
    });
    expect((await edgesOf(populations(page))).bottom).toBeLessThanOrEqual(
      (await edgesOf(tablist)).top,
    );
    await expect(
      panel(page).getByText(
        "The LD decay of each population, over the 500 variants of ld.nei the filters kept, pairs up to 100,000 base pairs apart. The r² at distance 0 is where the fitted curve starts, which depends on the number of individuals of the population alone.",
      ),
    ).toBeVisible();
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
    // The table of the bins is in a frame lower than it, which the Tab
    // key reaches after the tabs and the arrow keys scroll, and the table
    // of the populations stays above the tabs.
    expect((await edgesOf(populations(page))).bottom).toBeLessThanOrEqual(
      (await edgesOf(tablist)).top,
    );
    await page.keyboard.press("Tab");
    await expect(binsFrame(page)).toBeFocused();
    await expect
      .poll(async () => {
        await page.keyboard.press("ArrowDown");
        return binsFrame(page).evaluate((element) => element.scrollTop);
      })
      .toBeGreaterThan(0);
    await expectBinsFramed(page, 101);
    await expectNoViolations(makeAxeBuilder);
    await binsTab.focus();
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
    const populationsFile = await one;
    expect(populationsFile.suggestedFilename()).toBe("ld.ld_decay.csv");
    // Every digit of popnei's numbers of the spec, a line for each
    // population and the new line that ends the last.
    expect(await linesOf(populationsFile)).toEqual([
      "population,individuals,variants,pairs,half_distance_bp,r2_at_distance_0,rho_per_bp",
      "pop_a,50,432,29367,7548.08187836982,0.46942148760330576,0.00029996668947275404",
      "pop_b,50,432,29367,7339.709512618931,0.46942148760330576,0.00030848266256738914",
      "",
    ]);
    await page.keyboard.press("Tab");
    await expect(second).toBeFocused();
    const two = page.waitForEvent("download");
    await page.keyboard.press("Enter");
    const binsFile = await two;
    expect(binsFile.suggestedFilename()).toBe("ld.ld_decay_bins.csv");
    const binLines = await linesOf(binsFile);
    // The header, 50 bins for each population, and the last new line.
    expect(binLines).toHaveLength(102);
    expect(binLines.slice(0, 2)).toEqual([
      "population,smallest_dist,largest_dist,num_pairs,mean_r2,sd_r2",
      "pop_a,1,2000,745,0.3104664289575117,0.28243883665741665",
    ]);
    expect(binLines[50]).toMatch(
      /^pop_a,98001,100000,452,0\.025953462391956096,0\.\d+$/,
    );
    expect(binLines[51]).toBe(
      "pop_b,1,2000,745,0.31876304803774247,0.2814576610764838",
    );
    expect(binLines[100]).toMatch(
      /^pop_b,98001,100000,452,0\.03162397044318621,0\.\d+$/,
    );
    expect(await savedTypes(page)).toEqual([
      "text/csv;charset=utf-8",
      "text/csv;charset=utf-8",
    ]);
    // No stop of the Tab key lies between the tabs and the first download
    // but the panel of the tab shown.
    await plotTab.focus();
    await page.keyboard.press("Tab");
    await expect(first).not.toBeFocused();
    await page.keyboard.press("Tab");
    await expect(first).toBeFocused();
  });

  test("PA8 D2 17 populations of 5 or 6 individuals: 16 rows in the legend, q0 to q15, the line of the populations the plot leaves out, 17 rows in the table, and the 850 bins in a frame whose header stays in view", async ({
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
        "The plot draws the first 16 of the 17 populations, in the order of the table. The two tables hold all 17.",
      ),
    ).toBeVisible();
    // Every row of the legend is in the picture, at the right of the frame.
    const svg = await edgesOf(panel(page).locator("svg.chart-line"));
    const lastRow = await edgesOf(
      panel(page).locator("g.chart-legend-row").last(),
    );
    expect(lastRow.bottom).toBeLessThanOrEqual(svg.bottom);
    await expect(populations(page).getByRole("rowheader")).toHaveText(
      Array.from({ length: 17 }, (_, i) => `q${String(i)}`),
    );
    await expect(
      panel(page).getByText(
        /^Warning: Populations q0, q1 and 15 more have fewer than 20 individuals\..* longer than those of a larger population\.$/,
      ),
    ).toBeVisible();
    await expectNoViolations(makeAxeBuilder);
    await panel(page).getByRole("tab", { name: "Table of the bins" }).click();
    await expectBinsFramed(page, 851);
    await expect(populations(page).getByRole("rowheader")).toHaveCount(17);
    await expectNoViolations(makeAxeBuilder);
  });
});

test.describe("PA8 D2 the states of the LD decay with no result, and its plot on a narrow page", () => {
  test("PA8 D2 a distance above what the memory allows locks the panel, with the reason beside the field, under Run and said by the status region; a calculation under way shows the line of the fit; filters that keep no variant show popnei's refusal", async ({
    page,
    makeAxeBuilder,
  }) => {
    await load(page, "ld_pops.csv");
    const distance = panel(page).getByLabel(DISTANCE);
    const memory =
      "With 2 populations, the largest distance can be at most 12,500,000 base pairs: the pairs are counted at every distance up to it, in up to 40 bytes for each base pair and population, and more than 1 GB of such counts may not fit in the memory of a browser tab. Type a smaller distance, or calculate it with popnei in Python, outside the browser.";

    // Locked by the memory: one base pair above what two populations
    // are allowed.
    await setDistance(page, "12500001");
    await expect(panel(page).getByText(memory)).toHaveCount(2);
    await expect(runButton(page)).toBeDisabled();
    await expect(runButton(page)).toHaveAccessibleDescription(memory);
    await expect(distance).toHaveAccessibleDescription(
      /^With 2 populations, the largest distance can be at most 12,500,000 base pairs: .* How far to look for pairs\./,
    );
    await expect(status(page)).toHaveText(memory);
    await expectNoViolations(makeAxeBuilder);
    await setDistance(page, "12500000");
    await expect(panel(page).getByText(memory)).toHaveCount(0);
    await expect(runButton(page)).toBeEnabled();

    // Running: the bar, and under it the line of what it does not show.
    await setDistance(page, "100000");
    await holdResults(page);
    await runButton(page).click();
    await expect(
      panel(page).getByRole("button", { name: "Stop", exact: true }),
    ).toBeVisible();
    await expect(panel(page).getByText(FIT_LINE)).toBeVisible();
    await expect(panel(page).getByText(/^Calculating · /)).toBeVisible();
    await expectNoViolations(makeAxeBuilder);
    await releaseResults(page);
    await expect(populations(page)).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(
      panel(page).getByText(/The curves are fitted once it is read/),
    ).toHaveCount(0);

    // The error: a MAF filter of the Variants step that keeps no variant.
    await goTo(page, "Variants");
    await page
      .getByText("Filter the variants by major allele frequency (MAF)", {
        exact: true,
      })
      .click();
    const threshold = page.getByLabel("Maximum major allele frequency", {
      exact: false,
    });
    await threshold.fill("0.4");
    await threshold.press("Enter");
    await goTo(page, "Analyses");
    await runButton(page).click();
    await expect(
      panel(page).getByText(
        "The filters kept none of the variants of ld.nei, so there is no variant to calculate the LD decay over. Loosen the filters in the Variants step.",
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(runButton(page)).toHaveCount(0);
    await expect(populations(page)).toHaveCount(0);
    await expectNoViolations(makeAxeBuilder);
  });

  test("PA8 D2 at 320 pixels the frame of the plot is the stop of the Tab key after the tabs, scrolled sideways by the arrow keys, and the page does not scroll sideways", async ({
    page,
    makeAxeBuilder,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await load(page, "ld_pops.csv");
    await runTo100000(page);
    const frame = panel(page).getByRole("region", {
      name: "Plot of the LD decay",
    });
    await expect(frame).toBeVisible();
    await expect(
      panel(page).getByText("Scroll the plot sideways to see all of it."),
    ).toBeVisible();
    // On this narrow page the legend stands above the plot, every row of
    // it in the picture, and the frame of the plot keeps its height.
    await expect(panel(page).locator("g.chart-legend")).toHaveAttribute(
      "data-place",
      "above",
    );
    const picture = await edgesOf(panel(page).locator("svg.chart-line"));
    const rows = panel(page).locator("g.chart-legend-row");
    expect((await edgesOf(rows.first())).top).toBeGreaterThanOrEqual(
      picture.top,
    );
    const up = await edgesOf(panel(page).locator("g.chart-axis-y path.domain"));
    expect((await edgesOf(rows.last())).bottom).toBeLessThan(up.top);
    expect(up.bottom - up.top).toBeGreaterThanOrEqual(300);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);
    await panel(page).getByRole("tab", { name: "Plot" }).focus();
    await page.keyboard.press("Tab");
    await expect(frame).toBeFocused();
    // Pressed until the frame scrolls, as the flow of the distances does:
    // WebKit 26.6 under Playwright lets a first press go by.
    await expect
      .poll(async () => {
        await page.keyboard.press("ArrowRight");
        return frame.evaluate((element) => element.scrollLeft);
      })
      .toBeGreaterThan(0);
    await expectNoViolations(makeAxeBuilder);
  });
});

/** The fonts of DejaVu Sans, the sans-serif font of Ubuntu's runners, as
    wide as Verdana and wider than the Mac's system font, which a check at
    320 pixels gives the page, so that it does not rest on the fonts of
    the machine (the plan of stage 5, "What every prompt of a task
    carries"). */
const WIDE_FONTS = [
  { file: "DejaVuSans.woff2", weight: "100 500" },
  { file: "DejaVuSans-Bold.woff2", weight: "600 900" },
] as const;

/** Gives the page DejaVu Sans as the font of its text. */
async function useWideFont(page: Page): Promise<void> {
  const faces = await Promise.all(
    WIDE_FONTS.map(async ({ file, weight }) => {
      const bytes = await readFile(join(FIXTURES, "fonts", file));
      return `@font-face { font-family: "Wide test font"; font-weight: ${weight}; src: url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2"); }`;
    }),
  );
  await page.addStyleTag({
    content: `${faces.join("\n")}\n:root { --font-body: "Wide test font"; font-family: "Wide test font"; }`,
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

/** The width of what the page holds, 320 on a page of 320 pixels that
    does not scroll sideways. */
async function pageWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth);
}

/** The 40 characters two long names share. */
const LONG_STEM = "Solanum_pimpinellifolium_from_N_Ecuador_";

/** A metadata file of ld.nei whose populations have names of 45
    characters alike in their first 40: the individuals from `tinyFrom`
    on in a third, and the others in two halves. */
function longNames(tinyFrom: number): {
  readonly name: string;
  readonly text: string;
} {
  const popOf = (i: number): string =>
    i >= tinyFrom ? "tiny3" : i < tinyFrom / 2 ? "wild1" : "weed2";
  return {
    name: "long_pops.csv",
    text: `IID,pop\n${Array.from(
      { length: 100 },
      (_, i) => `i${String(i).padStart(3, "0")},${LONG_STEM}${popOf(i)}\n`,
    ).join("")}`,
  };
}

test.describe("PA8 D2 the warnings of a panel on a narrow page", () => {
  test("PA8 D2 at 320 pixels, in the committed font, the warnings of the LD decay that name populations of 45 characters do not make the page scroll sideways", async ({
    page,
    makeAxeBuilder,
  }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await load(page, longNames(100));
    await useWideFont(page);
    expect(await pageWidth(page)).toBeLessThanOrEqual(320);
    // Within 2,000 bp each curve falls to half beyond the plot, and its
    // warning names its population.
    await setDistance(page, "2000");
    await runButton(page).click();
    await expect(
      panel(page).getByText(/^Warning: .* beyond the 2,000 base pairs/),
    ).toHaveCount(2, { timeout: RESULT_TIMEOUT });
    await expect(populations(page)).toBeVisible();
    await expect.poll(() => pageWidth(page)).toBeLessThanOrEqual(320);
    // The legend, above the plot, has the names cut after 15 characters,
    // and each text of it ends inside the picture, which scrolls sideways
    // in its frame; the table has the names whole.
    const texts = panel(page).locator("g.chart-legend-row text");
    await expect(texts).toHaveText([
      /^Solanum_pimpine… · half at [\d,]+ bp, beyond the plot$/,
      /^Solanum_pimpine… · half at [\d,]+ bp, beyond the plot$/,
    ]);
    const svgRight = await panel(page)
      .locator("svg.chart-line")
      .evaluate((svg) => svg.getBoundingClientRect().right);
    for (const text of await texts.all()) {
      expect(
        await text.evaluate((each) => each.getBoundingClientRect().right),
      ).toBeLessThanOrEqual(svgRight);
    }
    await expect(populations(page).getByRole("rowheader")).toHaveText([
      `${LONG_STEM}wild1`,
      `${LONG_STEM}weed2`,
    ]);
    await expectNoViolations(makeAxeBuilder);
  });

  for (const analysis of ["Diversity", "Distances between populations"]) {
    test(`PA8 D2 at 320 pixels, in the committed font, the warning of ${analysis} that names a population of 45 characters does not make the page scroll sideways`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      // The third population has 10 individuals, under the minimum of 20
      // of both analyses, which warn of it by its name.
      await load(page, longNames(90));
      await useWideFont(page);
      expect(await pageWidth(page)).toBeLessThanOrEqual(320);
      const region = page.getByRole("region", { name: analysis, exact: true });
      await region.getByRole("button", { name: "Run", exact: true }).click();
      await expect(
        region.getByText(/^Warning: .*Solanum_pimpinellifolium/).first(),
      ).toBeVisible({ timeout: RESULT_TIMEOUT });
      await expect.poll(() => pageWidth(page)).toBeLessThanOrEqual(320);
    });
  }
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
