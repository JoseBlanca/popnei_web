/**
 * The flows of the distances between populations on the built site
 * (docs/specs/analyses/popDists.md, "How it is verified", In Playwright;
 * docs/specs/shell.md, "How it is checked"), PA5 D2 of the plan of
 * stage 5, each from a fresh page:
 *
 * - panel.nei and panel_pops.csv, popcat, Run: the row of p0 and p2,
 *   0.1027, 0.0613 and 1,200, and the rows of the heatmap p2, p0, p1;
 *   Jost's D drawn, "0.0613" in the cell of p2 and p0, with no running
 *   state and no request; the undo, Hudson's Fst back.
 * - panel_split.csv, popsplit: the warning of a negative distance with
 *   −0.0113 and the rows p0b, p0a, p2, p1; the minimum at 25, the notice
 *   of the result removed, the ready state naming p0a and p0b; Run, the
 *   heatmap of two in the order p2, p1 and no line of order.
 * - 201 populations of two: the line of tooManyPopulationsText, no
 *   heatmap nor table, and the download of 20,100 rows.
 * - The links of the Analyses step, "Distances between populations"
 *   among them.
 * - The key on the screen: a change of the measure removes no result and
 *   sends no request to the calculation worker; a change of the minimum
 *   removes it, with its notice, and sends none either.
 *
 * axe runs in each state reached. The requests are counted as the page
 * posts them to its workers, by a wrapper of `Worker.prototype.postMessage`
 * put on the page before its scripts run, as e2e/pca.spec.ts counts them.
 * The numbers are popnei's of the spec, as the screen rounds them.
 */
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { bigVcfPopsCsv, writeBigVcf } from "./bigVcf.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The distances of panel.nei take well under a second; 30 s leaves room
    for a loaded machine. */
const RESULT_TIMEOUT = 30_000;

const MINIMUM =
  "Individuals with a called genotype needed in each population, per variant";
const MEASURE = "Distance in the heatmap";
const PCOA_ORDER =
  "Ordered so that similar populations are together: by the first axis of a principal coordinate analysis of these distances.";

/** Counts the calculations the page asks of its workers, in
    `window.postedRuns`: every "run" message is one. */
function countRuns(): void {
  const posted = { runs: 0 };
  Object.assign(globalThis, { postedRuns: posted });
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its worker
  const post = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (
    this: Worker,
    message: unknown,
    ...rest: unknown[]
  ) {
    if (
      typeof message === "object" &&
      message !== null &&
      "kind" in message &&
      message.kind === "run"
    ) {
      posted.runs += 1;
    }
    (post as (...args: unknown[]) => void).call(this, message, ...rest);
  } as typeof post;
}

/** The calculations the page asked of its workers so far. */
async function runsPosted(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (globalThis as unknown as { postedRuns: { runs: number } }).postedRuns
        .runs,
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

/** Picks `file`, a fixture or a file at an absolute path, with the button
    of the zone `region`, through the file picker of the system. */
async function pick(page: Page, region: string, file: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: region })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (
    await chooser
  ).setFiles(isAbsolute(file) ? file : join(FIXTURES, file));
}

/** Opens the page with its requests counted, loads `variants` and the
    metadata file `metadata`, chooses the column `column`, and goes to the
    Analyses step. */
async function load(
  page: Page,
  variants: string,
  metadata: string,
  column: string,
): Promise<void> {
  await page.addInitScript(countRuns);
  await page.goto("popgen.html#variants");
  await pick(page, "Variants file", variants);
  await expect(page.getByText(/^[\d,]+ individuals$/)).toBeVisible();
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", metadata);
  await expect(page.getByText(/^All [\d,]+ individuals of /)).toBeVisible();
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: column, exact: true }).click();
  await goTo(page, "Analyses");
}

/** The panel of the distances between populations, its region named by
    its heading. */
function panel(page: Page): Locator {
  return page.getByRole("region", {
    name: "Distances between populations",
    exact: true,
  });
}

/** Runs the distances with the Run button, and waits for the table, or
    for the line that stands in its place above 200 populations. */
async function run(page: Page): Promise<void> {
  await panel(page).getByRole("button", { name: "Run", exact: true }).click();
  await expect(
    panel(page)
      .getByRole("table")
      .or(panel(page).getByText(/^The heatmap and the table are shown/)),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });
}

/** Types `minimum` key by key in the field of the minimum of
    individuals, and commits it with Enter. */
async function setMinimum(page: Page, minimum: string): Promise<void> {
  const field = panel(page).getByLabel(MINIMUM);
  await field.clear();
  await field.pressSequentially(minimum);
  await field.press("Enter");
  await expect(field).toHaveValue(minimum);
}

/** Chooses the radio button `name` of the measure by a click on its
    words. */
async function chooseMeasure(page: Page, name: string): Promise<void> {
  const group = panel(page).getByRole("radiogroup", { name: MEASURE });
  await group.locator("label").filter({ hasText: name }).click();
  await expect(group.getByRole("radio", { name })).toBeChecked();
}

/** The heatmap of `measure`, the image a screen reader meets. */
function heatmap(page: Page, measure: string): Locator {
  return panel(page).getByRole("img", {
    name: new RegExp(`^${measure} between populations`),
  });
}

/** The names of the rows of the heatmap, from the top, as the SVG places
    them. */
async function heatmapRows(page: Page): Promise<string[]> {
  return panel(page)
    .locator("svg .chart-axis-y .tick text")
    .evaluateAll((texts) =>
      texts
        .map((text) => ({
          top: text.getBoundingClientRect().top,
          name: text.textContent,
        }))
        .toSorted((a, b) => a.top - b.top)
        .map((text) => text.name),
    );
}

/** The values written in the cells of the heatmap, row by row from the
    top and left to right in each, the diagonal having none. */
async function heatmapValues(page: Page): Promise<string[]> {
  return panel(page)
    .locator("svg text.chart-cell-text")
    .evaluateAll((texts) =>
      texts
        .map((text) => ({
          x: Number(text.getAttribute("x")),
          y: Number(text.getAttribute("y")),
          value: text.textContent,
        }))
        .toSorted((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y))
        .map((text) => text.value),
    );
}

/** The cells of the row of the pair `pair` of the table. */
function row(page: Page, pair: string): Locator {
  return panel(page)
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: pair, exact: true }) })
    .getByRole("cell");
}

/** The Undo button of the header. */
function undo(page: Page): Locator {
  return page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true });
}

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

/** The values of Hudson's Fst of panel.nei in the heatmap's order p2, p0,
    p1, row by row: the pairs p2 and p0, p2 and p1; p0 and p2, p0 and p1;
    p1 and p2, p1 and p0. */
const FST_CELLS = ["0.1027", "0.1096", "0.1027", "0.1050", "0.1096", "0.1050"];
/** The same of Jost's D. */
const DEST_CELLS = ["0.0613", "0.0657", "0.0613", "0.0635", "0.0657", "0.0635"];

test.describe("PA5 D2 the distances on the screen", () => {
  test("PA5 D2 panel.nei and popcat: the row of p0 and p2, the heatmap in the order p2, p0, p1; Jost's D drawn with 0.0613 and no calculation; the undo gives Hudson's Fst back", async ({
    page,
    makeAxeBuilder,
  }) => {
    await load(page, "panel.nei", "panel_pops.csv", "popcat");
    await expect(
      panel(page).getByText(
        "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals",
      ),
    ).toBeVisible();
    await expectNoViolations(makeAxeBuilder);

    await run(page);
    expect(await runsPosted(page)).toBe(1);
    await expect(row(page, "p0 and p2")).toHaveText([
      "0.1027",
      "0.0613",
      "1,200",
    ]);
    await expect(row(page, "p0 and p1")).toHaveText([
      "0.1050",
      "0.0635",
      "1,200",
    ]);
    await expect(row(page, "p2 and p1")).toHaveText([
      "0.1096",
      "0.0657",
      "1,200",
    ]);
    await expect(
      panel(page).getByText(
        "Distances between the populations of panel.nei, over the 1,200 variants the filters kept.",
      ),
    ).toBeVisible();
    await expect(heatmap(page, "Hudson's Fst")).toBeVisible();
    // The title and the description name the image together.
    await expect(heatmap(page, "Hudson's Fst").locator("desc")).toHaveText(
      "Heatmap of Hudson's Fst between 3 populations of panel.nei, ordered so that similar ones are together: p2, p0, p1. From 0.1027, between p0 and p2, to 0.1096, between p2 and p1.",
    );
    expect(await heatmapRows(page)).toEqual(["p2", "p0", "p1"]);
    expect(await heatmapValues(page)).toEqual(FST_CELLS);
    await expect(panel(page).getByText(PCOA_ORDER)).toBeVisible();
    await expectNoViolations(makeAxeBuilder);

    // Jost's D: the same result drawn with the other measure, no running
    // state and no request.
    await chooseMeasure(page, "Jost's D");
    await expect(heatmap(page, "Jost's D")).toBeVisible();
    await expect(heatmap(page, "Hudson's Fst")).toHaveCount(0);
    await expect(status(page)).toContainText("Heatmap of Jost's D");
    expect(await heatmapRows(page)).toEqual(["p2", "p0", "p1"]);
    expect(await heatmapValues(page)).toEqual(DEST_CELLS);
    await expect(panel(page).getByRole("progressbar")).toHaveCount(0);
    await expect(panel(page).getByText(/^Calculating/)).toHaveCount(0);
    await expect(row(page, "p0 and p2")).toHaveText([
      "0.1027",
      "0.0613",
      "1,200",
    ]);
    expect(await runsPosted(page)).toBe(1);
    await expectNoViolations(makeAxeBuilder);

    // The undo gives the measure back, and the heatmap follows.
    await undo(page).click();
    await expect(heatmap(page, "Hudson's Fst")).toBeVisible();
    await expect(
      panel(page)
        .getByRole("radiogroup", { name: MEASURE })
        .getByRole("radio", { name: "Hudson's Fst" }),
    ).toBeChecked();
    expect(await heatmapValues(page)).toEqual(FST_CELLS);
    await expect(panel(page).getByRole("progressbar")).toHaveCount(0);
    expect(await runsPosted(page)).toBe(1);
    await expectNoViolations(makeAxeBuilder);
  });

  test("PA5 D2 panel_split.csv: the negative distance and the order p0b, p0a, p2, p1; the minimum at 25 removes the result with its notice, names p0a and p0b in the ready state, and gives the heatmap of two", async ({
    page,
    makeAxeBuilder,
  }) => {
    await load(page, "panel.nei", "panel_split.csv", "popsplit");
    await run(page);
    await expect(
      panel(page).getByText(
        "Warning: p0a and p0b have a negative Hudson's Fst, −0.0113, and Jost's D, −0.0060: the variants cannot tell the two apart. The heatmap orders them as if the distance were 0, and shows the value.",
      ),
    ).toBeVisible();
    await expect(row(page, "p0a and p0b")).toHaveText([
      "−0.0113",
      "−0.0060",
      "1,200",
    ]);
    expect(await heatmapRows(page)).toEqual(["p0b", "p0a", "p2", "p1"]);
    await expect(panel(page).getByText(PCOA_ORDER)).toBeVisible();
    await expectNoViolations(makeAxeBuilder);

    // The minimum at 25: p0a and p0b, 24 each, fall under it.
    await setMinimum(page, "25");
    await expect(
      page.getByRole("alertdialog", {
        name: "Distances between populations removed because the minimum number of individuals of the distances changed",
      }),
    ).toBeVisible();
    await expect(
      panel(page).getByText(
        "The distances between populations were removed because the minimum number of individuals of the distances changed. Undo brings back the heatmap and the table as they were, with no calculation; Run calculates new ones for the new settings.",
      ),
    ).toBeVisible();
    await expect(panel(page).getByRole("table")).toHaveCount(0);
    await expect(
      panel(page).getByText(
        "p0a and p0b have fewer individuals than the minimum of 25, 24 and 24, and are left out.",
      ),
    ).toBeVisible();
    await expectNoViolations(makeAxeBuilder);

    await run(page);
    await expect(
      panel(page).getByText(
        /^Warning: Populations p0a and p0b have fewer than 25 individuals, 24 and 24, so they are left out of the distances\./,
      ),
    ).toBeVisible();
    await expect(panel(page).getByRole("rowheader")).toHaveText(["p2 and p1"]);
    await expect(row(page, "p2 and p1")).toHaveText([
      "0.1096",
      "0.0657",
      "1,200",
    ]);
    await expect(heatmap(page, "Hudson's Fst")).toBeVisible();
    expect(await heatmapRows(page)).toEqual(["p2", "p1"]);
    expect(await heatmapValues(page)).toEqual(["0.1096", "0.1096"]);
    await expect(panel(page).getByText(/^Ordered so that/)).toHaveCount(0);
    await expect(panel(page).getByText(/^In the order of/)).toHaveCount(0);
    expect(await runsPosted(page)).toBe(2);
    await expectNoViolations(makeAxeBuilder);
  });

  test("PA5 D2 201 populations of two: the line of tooManyPopulationsText, no heatmap nor table, and a CSV of 20,100 rows", async ({
    page,
    makeAxeBuilder,
  }, testInfo) => {
    // A VCF of 100 variants of 402 individuals, two in each of the 201
    // populations q0 to q200.
    const vcf = testInfo.outputPath("pops201.vcf");
    const pops = testInfo.outputPath("pops201.csv");
    await writeBigVcf(vcf, 100, 402);
    await writeFile(pops, bigVcfPopsCsv(402, 2));
    await load(page, vcf, pops, "pop");
    await setMinimum(page, "2");
    await run(page);
    await expect(
      panel(page).getByText(
        "The heatmap and the table are shown for up to 200 populations, and this result has 201. Download the table as CSV to read it.",
        { exact: true },
      ),
    ).toBeVisible();
    // The icons of the warnings are the panel's only SVGs, hidden from a
    // screen reader.
    await expect(
      panel(page).locator("svg:not([aria-hidden='true'])"),
    ).toHaveCount(0);
    await expect(panel(page).getByRole("img")).toHaveCount(0);
    await expect(panel(page).getByRole("table")).toHaveCount(0);
    await expect(
      panel(page).getByRole("radiogroup", { name: MEASURE }),
    ).toBeVisible();
    await expectNoViolations(makeAxeBuilder);

    const downloading = page.waitForEvent("download");
    await panel(page)
      .getByRole("button", { name: "Download the table as CSV" })
      .click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("pops201.popdists.csv");
    const lines = (await readFile(await download.path(), "utf8"))
      .split("\n")
      .filter((line) => line !== "");
    expect(lines).toHaveLength(1 + 20_100);
    expect(lines[0]).toBe(
      "population_1,population_2,fst_hudson,jost_d,num_variants",
    );
    expect(lines[1]).toMatch(/^q0,q1,/);
    expect(lines.at(-1)).toMatch(/^q199,q200,/);
  });

  test("PA5 D2 the links of the Analyses step name the distances between populations, in the order of the panels, and a click and Enter put the focus on its heading", async ({
    page,
    makeAxeBuilder,
  }) => {
    await load(page, "panel.nei", "panel_pops.csv", "popcat");
    const list = page.getByRole("navigation", {
      name: "Analyses of this step",
    });
    await expect(list.getByRole("link")).toHaveText([
      "Principal components",
      "Diversity",
      "Distances between populations",
      "LD decay",
    ]);
    const link = list.getByRole("link", {
      name: "Distances between populations",
    });
    const heading = panel(page).getByRole("heading", {
      level: 2,
      name: "Distances between populations",
    });

    await link.click();
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    expect(new URL(page.url()).hash).toBe("#analyses");
    await expect(
      page.getByRole("heading", { level: 1, name: "Analyses" }),
    ).toBeVisible();

    await page.getByRole("heading", { level: 1, name: "Analyses" }).focus();
    await link.focus();
    await page.keyboard.press("Enter");
    await expect(heading).toBeFocused();
    expect(new URL(page.url()).hash).toBe("#analyses");
    await expectNoViolations(makeAxeBuilder);
  });

  test("PA5 D2 the key on the screen: the measure removes no result and sends no request; the minimum removes it with its notice", async ({
    page,
    makeAxeBuilder,
  }) => {
    await load(page, "panel.nei", "panel_pops.csv", "popcat");
    await run(page);
    await expect(row(page, "p0 and p2")).toHaveText([
      "0.1027",
      "0.0613",
      "1,200",
    ]);
    const posted = await runsPosted(page);
    expect(posted).toBe(1);

    // The measure, there and back: the result stays, no notice, no
    // request.
    await chooseMeasure(page, "Jost's D");
    await expect(heatmap(page, "Jost's D")).toBeVisible();
    await chooseMeasure(page, "Hudson's Fst");
    await expect(heatmap(page, "Hudson's Fst")).toBeVisible();
    await expect(row(page, "p0 and p2")).toHaveText([
      "0.1027",
      "0.0613",
      "1,200",
    ]);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(panel(page).getByText(/were removed because/)).toHaveCount(0);
    expect(await runsPosted(page)).toBe(posted);

    // The minimum: the result is removed, with its notice, and nothing
    // is calculated until Run.
    await setMinimum(page, "10");
    await expect(
      page.getByRole("alertdialog", {
        name: "Distances between populations removed because the minimum number of individuals of the distances changed",
      }),
    ).toBeVisible();
    await expect(
      panel(page).getByText(
        /^The distances between populations were removed because the minimum number of individuals of the distances changed\./,
      ),
    ).toBeVisible();
    await expect(panel(page).getByRole("table")).toHaveCount(0);
    await expect(heatmap(page, "Hudson's Fst")).toHaveCount(0);
    expect(await runsPosted(page)).toBe(posted);
    await expectNoViolations(makeAxeBuilder);
  });
});

/** What one log of React Aria's live announcer holds: its politeness,
    its whole text, as a screen reader may take it, and each message it
    was given, a child of its own. */
interface LogRead {
  readonly live: string;
  readonly text: string;
  readonly messages: readonly string[];
}

/** The logs of React Aria's live announcer: the element it puts first in
    the body, marked `data-live-announcer`, with two children of the role
    log, one `aria-live="assertive"` and one `"polite"`. The shell's status
    region is marked so too, and is inside the root of the page, not a
    child of the body. Empty until React Aria first announces. */
async function readAnnouncer(page: Page): Promise<LogRead[]> {
  return page
    .locator("body > [data-live-announcer] > [role='log']")
    .evaluateAll((logs) =>
      logs.map((log) => ({
        live: log.getAttribute("aria-live") ?? "",
        text: log.textContent,
        messages: [...log.children].map((child) => child.textContent),
      })),
    );
}

test.describe("PA5 D4 what a number field announces", () => {
  test("PA5 D4 the live region of React Aria's NumberField while the minimum of the distances is typed key by key, across two edits", async ({
    page,
    browserName,
  }) => {
    await load(page, "panel.nei", "panel_pops.csv", "popcat");
    const field = panel(page).getByLabel(MINIMUM);
    const steps: { readonly step: string; readonly logs: LogRead[] }[] = [];
    // Reads the logs after the key `step` and two frames of the page.
    const read = async (step: string): Promise<void> => {
      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                resolve();
              });
            });
          }),
      );
      steps.push({ step, logs: await readAnnouncer(page) });
    };

    // Two edits: 20 replaced by 15, committed with Enter; then 15 by 30.
    for (const [edit, digits] of [
      ["first", "15"],
      ["second", "30"],
    ] as const) {
      await field.selectText();
      await read(`${edit} edit, the number selected`);
      for (const digit of digits) {
        await field.press(digit);
        await read(`${edit} edit, ${digit} typed`);
      }
      await field.press("Enter");
      await expect(field).toHaveValue(digits);
      await read(`${edit} edit, Enter`);
    }

    process.stdout.write(
      `PA5 D4 ${browserName}\n${steps
        .map(
          ({ step, logs }) =>
            `${step}: ${
              logs.length === 0
                ? "no region"
                : logs
                    .map(
                      (log) =>
                        `${log.live} ${JSON.stringify(log.text)} ${JSON.stringify(log.messages)}`,
                    )
                    .join("; ")
            }`,
        )
        .join("\n")}\n`,
    );
    // The region was read: React Aria made its two logs, and the last
    // read found them.
    const last = steps.at(-1)?.logs ?? [];
    expect(last.map((log) => log.live)).toEqual(["assertive", "polite"]);
    // React Aria empties its assertive log before each number, but for
    // its first, which it holds back 100 ms while its logs are added to
    // the page, and which may then land after the next one: by the end of
    // the second edit only its number is left.
    expect(last.map((log) => log.text)).toEqual(["30", ""]);
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

/** Makes the calculation worker keep its results until
    `releaseResults`, so that the panel stays in its running state. */
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

/** Keeps every text the status regions of the page hold, in
    `window.statusTexts`, so that a flow can tell what was announced
    between two of its steps. */
function recordStatus(): void {
  const texts: string[] = [];
  Object.assign(globalThis, { statusTexts: texts });
  new MutationObserver(() => {
    for (const region of document.querySelectorAll("[role='status']")) {
      const text = region.textContent;
      if (text !== "" && texts.at(-1) !== text) texts.push(text);
    }
  }).observe(document, { childList: true, subtree: true, characterData: true });
}

/** The texts the status regions held so far. */
async function statusTexts(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (globalThis as unknown as { statusTexts: string[] }).statusTexts,
  );
}

/** Posts the results the calculation worker kept. */
async function releaseResults(page: Page): Promise<void> {
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    (globalThis as unknown as { release: () => void }).release();
  });
}

test.describe("PA5 D2 the review of the panel of the distances", () => {
  test("PA5 D2 the download of panel.nei holds the spec's three rows, whole", async ({
    page,
  }) => {
    await load(page, "panel.nei", "panel_pops.csv", "popcat");
    await run(page);
    const downloading = page.waitForEvent("download");
    await panel(page)
      .getByRole("button", { name: "Download the table as CSV" })
      .click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("panel.popdists.csv");
    expect(await readFile(await download.path(), "utf8")).toBe(
      "population_1,population_2,fst_hudson,jost_d,num_variants\n" +
        "p0,p2,0.10273588423661377,0.06129813142463423,1200\n" +
        "p0,p1,0.10496244498389443,0.06354346296076403,1200\n" +
        "p2,p1,0.10962148955018115,0.06567052128821259,1200\n",
    );
  });

  test("PA5 D2 the arrow key between the measures redraws the heatmap and leaves the focus on Jost's D", async ({
    page,
  }) => {
    await load(page, "panel.nei", "panel_pops.csv", "popcat");
    await run(page);
    const group = panel(page).getByRole("radiogroup", { name: MEASURE });
    await group.getByRole("radio", { name: "Hudson's Fst" }).focus();
    await page.keyboard.press("ArrowDown");
    await expect(heatmap(page, "Jost's D")).toBeVisible();
    expect(await heatmapValues(page)).toEqual(DEST_CELLS);
    await expect(group.getByRole("radio", { name: "Jost's D" })).toBeFocused();
    await expect(status(page)).toContainText("Heatmap of Jost's D");
  });

  test("PA5 D2 the measure changed while the distances run: the result shows the measure chosen, and nothing is announced before it", async ({
    page,
  }) => {
    await page.addInitScript(recordStatus);
    await load(page, "panel.nei", "panel_pops.csv", "popcat");
    await holdResults(page);
    await panel(page).getByRole("button", { name: "Run", exact: true }).click();
    await expect(panel(page).getByRole("progressbar")).toBeVisible();
    await chooseMeasure(page, "Jost's D");
    await expect(panel(page).getByRole("progressbar")).toBeVisible();
    // A number refused is announced after anything announced before it,
    // so once it is heard, the measure had its turn.
    const field = panel(page).getByLabel(MINIMUM);
    await field.fill("2.5");
    await field.press("Enter");
    await expect(status(page)).toContainText("2.5 is not a whole number");
    expect(
      (await statusTexts(page)).filter((text) => text.includes("Heatmap of")),
    ).toEqual([]);
    await releaseResults(page);
    await expect(heatmap(page, "Jost's D")).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    expect(await heatmapValues(page)).toEqual(DEST_CELLS);
    expect(await runsPosted(page)).toBe(1);
  });

  test("PA5 D2 a project file with the distances opened, panel.nei loaded and Run: the same numbers as in the project file, under the table, with its Jost's D", async ({
    page,
  }) => {
    await page.addInitScript(countRuns);
    await page.goto("popgen.html#variants");
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Open project…" }).click();
    await (
      await chooser
    ).setFiles(
      join(
        import.meta.dirname,
        "..",
        "src/core/fixtures/projectFile/v1-stage5-options.popnei.json",
      ),
    );
    await pick(page, "Variants file", "panel.nei");
    await expect(page.getByText(/^200 individuals$/)).toBeVisible();
    await goTo(page, "Analyses");
    await run(page);
    await expect(heatmap(page, "Jost's D")).toBeVisible();
    await expect(
      panel(page).getByText(
        "The same numbers as in the project file: this variants file gives the results the project was saved with.",
      ),
    ).toBeVisible();
  });

  test("PA5 D2 at 320 pixels, in the committed font, names of 20 characters: the frame of the heatmap scrolls, the grid keeps 128 pixels, the Tab key reaches its region, each name of a pair on one line, and axe", async ({
    page,
    makeAxeBuilder,
  }, testInfo) => {
    await page.setViewportSize({ width: 320, height: 900 });
    const text = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
    const pops = testInfo.outputPath("long_pops.csv");
    await writeFile(
      pops,
      text.replaceAll(/,(p\d)$/gm, ",Valencia_landrace_$1"),
    );
    await load(page, "panel.nei", pops, "popcat");
    await useWideFont(page);
    await run(page);
    await expect(
      panel(page).getByText("Scroll the heatmap sideways to see all of it."),
    ).toBeVisible();
    const grid = await panel(page)
      .locator("svg g.chart-marks")
      .evaluate((marks) => marks.getBoundingClientRect().width);
    expect(grid).toBeGreaterThanOrEqual(127);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320);

    const region = panel(page).getByRole("region", {
      name: "Hudson's Fst between populations",
    });
    await panel(page)
      .getByRole("radiogroup", { name: MEASURE })
      .getByRole("radio", { name: "Hudson's Fst" })
      .focus();
    await page.keyboard.press("Tab");
    await expect(region).toBeFocused();

    // Each name of a pair is on one line, "Valencia_landrace_p0 and" on
    // the first.
    const lines = await panel(page)
      .getByRole("rowheader")
      .first()
      .locator("span")
      .evaluateAll((spans) =>
        spans.map((span) => ({
          text: span.textContent,
          lines: new Set(
            [...span.getClientRects()].map((rect) => Math.round(rect.top)),
          ).size,
        })),
      );
    expect(lines).toEqual([
      { text: "Valencia_landrace_p0 and", lines: 1 },
      { text: "Valencia_landrace_p2", lines: 1 },
    ]);
    await expectNoViolations(makeAxeBuilder);
    const scrollable = await new AxeBuilder({ page })
      .withRules(["scrollable-region-focusable"])
      .analyze();
    expect(scrollable.violations).toEqual([]);
    expect(scrollable.passes.map((rule) => rule.id)).toContain(
      "scrollable-region-focusable",
    );
  });
});
