/**
 * The LD decay in the Populations tab of popgen2.html, on the built site
 * (docs/specs/steps/popgen2-populations.md, "The LD decay", "How it is
 * checked", In Playwright): on ld.nei with ld_pops.csv, the missing data
 * at 0.1, which keeps all 500 variants; the lock until a distance is
 * typed and the lock of the memory; the numbers of each population at
 * 100,000 bp and, live, at the missing data of 0.05 with no Run pressed;
 * the one population with no individuals file; the time of the last run;
 * the diversity and the LD decay live, a threshold moved, the LD decay
 * after the diversity's result, counted at the worker; the LD decay held
 * running, what it reads greyed and the band naming it; and the
 * downloads read back.
 *
 * The numbers are popnei 0.2.2's under node on 12 October 2026
 * (docs/specs/analyses/ldDecay.md, "On popgen2.html", "How it is
 * verified"): pop_a 7548.08187836982 bp and pop_b 7339.709512618931,
 * 432 variants and 29,367 pairs each; at 0.05, 7639.382672516462 and
 * 7416.431965140492, 401 variants and 25,293 pairs; the one population
 * of the 100, 7150.803607577506.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type AxeBuilder from "@axe-core/playwright";
import type { Download, Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** How long a calculation of ld.nei may take to give its result. */
const RESULT_TIMEOUT = 30_000;

/** The caption of the table of the populations at 100,000 bp, its
    first sentence, at the missing data of 0.1 and of 0.05. */
const CAPTION =
  /^The LD decay of each population, over the 500 variants of ld\.nei the filters kept, pairs up to 100,000 base pairs apart\./u;
const CAPTION_005 =
  /^The LD decay of each population, over the 464 variants of ld\.nei/u;

/** The label of the field of the largest distance. */
const DISTANCE = /^Largest distance between the two variants of a pair/u;

/** What the page records, on `window`, of the calculations it asks of
    its workers and the results it gets back, in their order. */
const TIMELINE = "__e2eTimeline";

/** The script of the page that records every calculation it posts to a
    worker, "run ‹analysis›", and every result a worker posts back,
    "result ‹analysis›", in their order, in `window[name]`. */
function recordTimeline(name: string): void {
  const timeline: string[] = [];
  Object.defineProperty(window, name, { value: timeline });
  const analysisOf = (value: unknown): string | null =>
    typeof value === "object" &&
    value !== null &&
    "analysis" in value &&
    typeof value.analysis === "string"
      ? value.analysis
      : null;
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
      message.kind === "run" &&
      "job" in message
    ) {
      timeline.push(`run ${analysisOf(message.job) ?? "?"}`);
    }
    (post as (...args: unknown[]) => void).call(this, message, ...rest);
  } as typeof post;
  const RealWorker = window.Worker;
  window.Worker = class extends RealWorker {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      this.addEventListener("message", (event: MessageEvent<unknown>) => {
        const m = event.data;
        if (
          typeof m === "object" &&
          m !== null &&
          "kind" in m &&
          m.kind === "result" &&
          "result" in m
        ) {
          timeline.push(`result ${analysisOf(m.result) ?? "?"}`);
        }
      });
    }
  };
}

/** The calculations of the diversity and of the LD decay the page asked
    for, and their results, in their order. */
async function timeline(page: Page): Promise<readonly string[]> {
  const all = await page.evaluate(
    (name) => (window as unknown as Record<string, string[]>)[name] ?? [],
    TIMELINE,
  );
  return all.filter((entry) => /(diversity|ldDecay)$/u.test(entry));
}

/** Opens popgen2.html with what the page asks of its workers
    recorded. */
async function openPage(page: Page): Promise<void> {
  await page.addInitScript(recordTimeline, TIMELINE);
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
}

/** Picks the fixture `name` with the button of the box Variants. */
async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants", exact: true })
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** Opens the individuals file `name`, a fixture, with the button of its
    box. */
async function pickIndividuals(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Individuals", exact: true })
    .getByRole("button", { name: /^Open (another )?individuals file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** The tab of the row named `name`. */
function tab(page: Page, name: "Variants" | "Populations"): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The part of the LD decay, shown or hidden behind another tab. */
function ldDecay(page: Page): Locator {
  return page.getByRole("region", {
    name: "LD decay",
    exact: true,
    includeHidden: true,
  });
}

/** The part of the diversity. */
function diversity(page: Page): Locator {
  return page.getByRole("region", {
    name: "Diversity",
    exact: true,
    includeHidden: true,
  });
}

/** The button of the part `part` named `name`. */
function button(
  part: Locator,
  name: "Run" | "Stop" | "Stop recalculating",
): Locator {
  return part.getByRole("button", { name, exact: true });
}

/** The field of the largest distance. */
function distance(page: Page): Locator {
  return ldDecay(page).getByRole("textbox", { name: DISTANCE });
}

/** Types `value` into the field of the largest distance and commits it. */
async function typeDistance(page: Page, value: string): Promise<void> {
  await distance(page).fill(value);
  await distance(page).press("Enter");
}

/** The cells of the row of the population `pop` of the table of the
    populations of the LD decay, its header left out. */
function row(page: Page, pop: string): Locator {
  return ldDecay(page)
    .getByRole("table", { name: CAPTION_ANY })
    .getByRole("row")
    .filter({
      has: page.getByRole("rowheader", { name: pop, exact: true }),
    })
    .getByRole("cell");
}

/** The caption of the table of the populations, at any distance. */
const CAPTION_ANY = /^The LD decay of each population/u;

/** The box of the threshold of the missing data of the variants, in the
    Variants tab. */
function missingBox(page: Page): Locator {
  return page
    .getByRole("region", { name: "Statistics of the file" })
    .getByRole("group", {
      name: "Proportion of missing genotypes",
      exact: true,
    })
    .getByRole("textbox");
}

/** Sets the threshold of the missing data of the variants to `value` in
    the Variants tab, and comes back to the Populations tab. */
async function setMissing(page: Page, value: string): Promise<void> {
  await tab(page, "Variants").click();
  await missingBox(page).fill(value);
  await missingBox(page).press("Enter");
  await tab(page, "Populations").click();
}

/** Opens ld.nei, and ld_pops.csv unless `individuals` is false, and
    shows the Populations tab once its Run of the diversity is enabled,
    the one pass done. */
async function ready(
  page: Page,
  individuals = true,
  held = false,
): Promise<void> {
  await openPage(page);
  await pick(page, "ld.nei");
  if (held) {
    // The one pass's results, which holdSummary keeps back.
    await release(page, "allSoFar");
    await release(page, "result");
  }
  if (individuals) await pickIndividuals(page, "ld_pops.csv");
  await tab(page, "Populations").click();
  await expect(button(diversity(page), "Run")).toBeEnabled({
    timeout: RESULT_TIMEOUT,
  });
}

/** Types 100000, presses the LD decay's Run and waits for its table. */
async function runLdDecay(page: Page): Promise<void> {
  await typeDistance(page, "100000");
  await expect(button(ldDecay(page), "Run")).toBeEnabled();
  await button(ldDecay(page), "Run").click();
  await expect(ldDecay(page).getByRole("table", { name: CAPTION })).toBeVisible(
    { timeout: RESULT_TIMEOUT },
  );
}

/** Checks the page with axe, light and then dark, and leaves it light. */
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

/** Opens the menu of the focused button with Enter, goes down to `item`
    with the arrow keys, chooses it with Enter, and gives the file. */
async function chooseByKeys(
  page: Page,
  item: "Table as CSV" | "Image as SVG" | "Image as PNG" | "Data as CSV",
): Promise<Download> {
  const index = ["Table as CSV", "Image as SVG", "Image as PNG", "Data as CSV"]
    .filter((one) => item === "Table as CSV" || one !== "Table as CSV")
    .indexOf(item);
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  for (let at = 0; at < index; at += 1) await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: item })).toBeFocused();
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  return download;
}

/** The text of a downloaded file. */
async function textOf(download: Download): Promise<string> {
  return readFile(await download.path(), "utf8");
}

/** Whether the top of `below` is under the bottom of `above`. */
async function isBelow(below: Locator, above: Locator): Promise<boolean> {
  const [top, bottom] = await Promise.all([
    below.boundingBox(),
    above.boundingBox(),
  ]);
  if (top === null || bottom === null) return false;
  return top.y >= bottom.y + bottom.height - 1;
}

test.describe("LT1 D5 the LD decay in the Populations tab", () => {
  test("LT1 D5 ld.nei and ld_pops.csv: locked until a distance is typed, and above 12,500,000 bp for two populations; at 100000 pop_a and pop_b 50, 432, 29,367, 7,548 and 7,340, no warning, the time of the last run; the missing data at 0.05 gives 7,639 and 7,416 with no Run pressed; axe locked and done, light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await ready(page);
    const part = ldDecay(page);
    await expect(
      part.getByRole("heading", { level: 2, name: "LD decay" }),
    ).toBeVisible();
    await expect(
      part.getByText(
        "2 populations: pop_a, 50 individuals; pop_b, 50 individuals",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(button(part, "Run")).toBeDisabled();
    await expect(button(part, "Run")).toHaveAccessibleDescription(
      "Type the largest distance, above.",
    );
    await expect(distance(page)).toHaveAccessibleDescription(
      /The LD decay needs the largest distance between the two variants of a pair\. It has no default/u,
    );
    await expectNoAxeViolations(page, makeAxeBuilder);

    await typeDistance(page, "30000000");
    await expect(button(part, "Run")).toHaveAccessibleDescription(
      /^With 2 populations, the largest distance can be at most 12,500,000 base pairs: /u,
    );

    await runLdDecay(page);
    await expect(row(page, "pop_a")).toHaveText([
      "50",
      "432",
      "29,367",
      "7,548",
      "0.4694",
      "0.000300",
    ]);
    await expect(row(page, "pop_b").nth(3)).toHaveText("7,340");
    await expect(part.getByRole("heading", { name: /warning/u })).toHaveCount(
      0,
    );
    // Under a second on the owner's Mac when the machine is idle; a run
    // of a second or more under load is written in minutes and seconds.
    await expect(
      part.getByText(/^The last run took (less than a second|\d+:\d\d)\.$/u),
    ).toBeVisible();
    await expect(
      part.getByText(
        "Calculated with popnei 0.2.2, in version 0.1.0 of the application.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(part.locator("svg.chart-line")).toBeVisible();
    await expect(button(part, "Stop recalculating")).toBeVisible();
    // The old page's buttons of download are not drawn here.
    await expect(
      part.getByRole("button", { name: /^Download the .* as CSV$/u }),
    ).toHaveCount(0);
    await expectNoAxeViolations(page, makeAxeBuilder);

    const before = (await timeline(page)).filter(
      (entry) => entry === "run ldDecay",
    ).length;
    await setMissing(page, "0.05");
    await expect(part.getByRole("table", { name: CAPTION_005 })).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await expect(row(page, "pop_a").nth(3)).toHaveText("7,639");
    await expect(row(page, "pop_b").nth(3)).toHaveText("7,416");
    await expect(row(page, "pop_a").nth(2)).toHaveText("25,293");
    expect(
      (await timeline(page)).filter((entry) => entry === "run ldDecay"),
    ).toHaveLength(before + 1);
  });

  test("LT1 D5 no individuals file: the line of the one population and the row Unclassified, 100, 432, 29,367, 7,151", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await ready(page, false);
    await expect(
      ldDecay(page).getByText(
        "1 population, Unclassified: 100 individuals. No individual is assigned to a population, so the LD decay is of every individual kept as one population.",
        { exact: true },
      ),
    ).toBeVisible();
    await runLdDecay(page);
    await expect(row(page, "Unclassified")).toHaveText([
      "100",
      "432",
      "29,367",
      "7,151",
      "0.4620",
      "0.000302",
    ]);
  });

  test("LT1 D5 the LD decay's Run while the diversity runs, held: its line of waiting for the diversity, and no request until the diversity's result; then, both live, a threshold moved: one diversity, then one LD decay after its result, counted at the worker", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await holdSummary(page, { holdDiversity: true });
    await ready(page, true, true);
    await button(diversity(page), "Run").click();
    await expect(button(diversity(page), "Stop")).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await typeDistance(page, "100000");
    await button(ldDecay(page), "Run").click();
    await expect(
      ldDecay(page).getByText(
        "The LD decay starts once the diversity, which is running, ends.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(button(ldDecay(page), "Stop recalculating")).toBeVisible();
    expect(await timeline(page)).toEqual(["run diversity"]);
    await release(page, "diversity");
    await expect(
      ldDecay(page).getByRole("table", { name: CAPTION }),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    expect(await timeline(page)).toEqual([
      "run diversity",
      "result diversity",
      "run ldDecay",
      "result ldDecay",
    ]);

    // The worker started again after the LD decay holds the next
    // diversity too: the LD decay waits for it, live.
    await setMissing(page, "0.05");
    await expect(
      ldDecay(page).getByText(
        "The LD decay starts once the diversity, which is running, ends.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    expect((await timeline(page)).slice(4)).toEqual(["run diversity"]);
    await release(page, "diversity");
    await expect(
      ldDecay(page).getByRole("table", { name: CAPTION_005 }),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    expect((await timeline(page)).slice(4)).toEqual([
      "run diversity",
      "result diversity",
      "run ldDecay",
      "result ldDecay",
    ]);
  });
});

test.describe("LT1 D5 the LD decay held running", () => {
  test("LT1 D5 what it reads greyed with its words, the diversity's options open; the band names it with Stop, and Stop all with the diversity live; its Stop ends it; axe running, light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await holdSummary(page, { holdLdDecay: true });
    await ready(page, true, true);
    await button(diversity(page), "Run").click();
    await expect(button(diversity(page), "Stop recalculating")).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await typeDistance(page, "100000");
    await button(ldDecay(page), "Run").click();
    await expect(button(ldDecay(page), "Stop")).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await expect(
      ldDecay(page).getByText(/^The bar shows the reading of ld\.nei\./u),
    ).toBeVisible();

    // Its options greyed with the words of the lock, the diversity's not.
    const words =
      "Stop the LD decay in the Populations tab to change the filters, or press Stop all beside the heading Popnei to stop the diversity too; then press Run in each tab to calculate them again.";
    await expect(distance(page)).toHaveAttribute("aria-disabled", "true");
    await expect(distance(page)).toHaveAccessibleDescription(
      new RegExp(words.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"),
    );
    await expect(
      diversity(page).getByRole("textbox").first(),
    ).not.toHaveAttribute("aria-disabled", "true");
    await expectNoAxeViolations(page, makeAxeBuilder);

    // The filters and the column greyed with its words.
    await tab(page, "Variants").click();
    await expect(missingBox(page)).toHaveAttribute("aria-disabled", "true");
    await expect(missingBox(page)).toHaveAccessibleDescription(
      new RegExp(words.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"),
    );
    const column = page
      .getByRole("region", { name: "Individuals", exact: true })
      .getByRole("button", { name: "Column of the populations" });
    await expect(column).toHaveAttribute("aria-disabled", "true");

    // The band, with another tab shown.
    const band = page.getByRole("banner", { name: "What the page is doing" });
    await expect(band.getByText(/^LD decay running · 0:\d\d$/u)).toBeVisible();
    await expect(
      band.getByRole("button", { name: "Stop the LD decay", exact: true }),
    ).toBeVisible();
    await expect(
      band.getByRole("button", {
        name: "Stop all: the diversity and the LD decay",
        exact: true,
      }),
    ).toBeVisible();

    await band
      .getByRole("button", { name: "Stop the LD decay", exact: true })
      .click();
    await expect(missingBox(page)).not.toHaveAttribute("aria-disabled", "true");
    await tab(page, "Populations").click();
    await expect(
      ldDecay(page).getByText(
        "Stopped: the LD decay no longer starts by itself after a change. Run calculates it and starts it again after each change.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
  });
});

/** The band at the top of the page. */
function band(page: Page): Locator {
  return page.getByRole("banner", { name: "What the page is doing" });
}

/** How the band's line lies at the window's width: the buttons drawn,
    whether its words are cut, whether "Popnei", the words and the
    buttons are on one row of the line and within it, whether the page
    scrolls sideways, the line's room and the width its parts take, with the gaps
    between them, the words' padding taken back by their margins; and
    the width the words would take as `other`, measured in a copy of
    them; `null` until the words hold `has`. */
async function bandFit(
  page: Page,
  has: string,
  other: string,
): Promise<{
  readonly buttons: readonly string[];
  readonly wordsCut: boolean;
  readonly oneLine: boolean;
  readonly inLine: boolean;
  readonly noSidewaysScroll: boolean;
  readonly room: number;
  readonly used: number;
  readonly otherExtra: number;
} | null> {
  return band(page)
    .getByRole("heading", { level: 1, name: "Popnei" })
    .evaluate(
      (h1, [want, otherWords]) => {
        const line = h1.parentElement;
        const words = h1.nextElementSibling;
        if (line === null || !(words instanceof HTMLElement)) return null;
        if (!words.textContent.includes(want)) return null;
        const shownButtons = [...line.querySelectorAll("button")].filter(
          (button) => button.getClientRects().length > 0,
        );
        const lineBox = line.getBoundingClientRect();
        const parts = [h1, words, ...shownButtons].map((element) =>
          element.getBoundingClientRect(),
        );
        const top = Math.min(...parts.map((box) => box.top));
        const gapValue = parseFloat(getComputedStyle(line).columnGap);
        const gap = Number.isNaN(gapValue) ? 0 : gapValue;
        const wordsPadding =
          parseFloat(getComputedStyle(words).paddingInlineStart) +
          parseFloat(getComputedStyle(words).paddingInlineEnd);
        // The words as `otherWords` would take, in a copy out of the
        // flow, against the words shown.
        const shownWidth = (element: HTMLElement): number => {
          const copy = element.cloneNode(true);
          if (!(copy instanceof HTMLElement)) return 0;
          copy.style.position = "absolute";
          copy.style.width = "max-content";
          copy.style.visibility = "hidden";
          document.body.append(copy);
          const width = copy.getBoundingClientRect().width;
          copy.remove();
          return width;
        };
        const asShown = shownWidth(words);
        const otherCopy = words.cloneNode(true);
        let asOther = asShown;
        if (otherCopy instanceof HTMLElement) {
          const walker = document.createTreeWalker(
            otherCopy,
            NodeFilter.SHOW_TEXT,
          );
          for (
            let node = walker.nextNode();
            node !== null;
            node = walker.nextNode()
          ) {
            if (node.textContent?.includes(want) === true) {
              node.textContent = node.textContent.replace(want, otherWords);
            }
          }
          asOther = shownWidth(otherCopy);
        }
        return {
          buttons: shownButtons.map((button) => button.textContent),
          wordsCut: words.scrollWidth > words.clientWidth,
          oneLine: parts.every((box) => Math.abs(box.top - top) < 8),
          inLine: parts.every((box) => box.right <= lineBox.right + 0.5),
          noSidewaysScroll:
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
          room: Math.round(lineBox.width * 10) / 10,
          used:
            Math.round(
              (parts.reduce((sum, box) => sum + box.width, 0) +
                gap * (parts.length - 1) -
                wordsPadding) *
                10,
            ) / 10,
          otherExtra: Math.round((asOther - asShown) * 10) / 10,
        };
      },
      [has, other] as const,
    );
}

test.describe("LT1 D5 the band in the Populations tab", () => {
  test("LT1 D5 the LD decay alone live, held running, the Populations tab shown: the band keeps its Stop, after the diversity's part; at 320 px Popnei, LD decay · 0:0… and Stop on one line; the band's Stop ends it (the review of the LD decay, 12 October 2026)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await holdSummary(page, { holdLdDecay: true });
    await ready(page, true, true);
    await typeDistance(page, "100000");
    await button(ldDecay(page), "Run").click();
    await expect(button(ldDecay(page), "Stop")).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await expect(
      band(page).getByText(/^LD decay running · 0:\d\d$/u),
    ).toBeVisible();
    await expect(
      band(page).getByRole("button", {
        name: "Stop the LD decay",
        exact: true,
      }),
    ).toBeVisible();

    await page.setViewportSize({ width: 320, height: 800 });
    await expect
      .poll(async () => bandFit(page, "LD decay", "LD decay"))
      .toMatchObject({
        buttons: ["Stop"],
        wordsCut: false,
        oneLine: true,
        inLine: true,
        noSidewaysScroll: true,
      });
    process.stdout.write(
      `LD decay running at 320 px: ${JSON.stringify(await bandFit(page, "LD decay", "LD decay"))}\n`,
    );

    await band(page)
      .getByRole("button", { name: "Stop the LD decay", exact: true })
      .click();
    await expect(
      ldDecay(page).getByText(
        "Stopped: the LD decay no longer starts by itself after a change. Run calculates it and starts it again after each change.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
  });

  test("LT1 D5 the LD decay alone live and about to start, the Populations tab shown, at 320 px: Popnei and LD decay soon whole, the whole Stop recalculating on a second row, within the window, as LD decay later would be; the band's Stop recalculating ends it", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // A clock of the test, so that the quiet second stands still while
    // the line is measured.
    await page.clock.install();
    await ready(page);
    await runLdDecay(page);
    await page.setViewportSize({ width: 320, height: 800 });
    await page.clock.pauseAt(Date.now() + 1000);
    await typeDistance(page, "90000");

    await expect
      .poll(async () =>
        (
          await bandFit(page, "LD decay soon", "LD decay later")
        )?.buttons.join(),
      )
      .toBe("Stop recalculating");
    const fit = await bandFit(page, "LD decay soon", "LD decay later");
    process.stdout.write(`LD decay soon at 320 px: ${JSON.stringify(fit)}\n`);
    if (fit === null) throw new Error("the band does not say LD decay soon");
    // 295 px of the line's 288, and "LD decay later" 291.9, in
    // Chromium 153 and WebKit 26.6 on 12 October 2026: Stop
    // recalculating takes a second row, the words whole, as "Diversity
    // later" does (docs/specs/steps/popgen2-band.md, "The LD decay").
    expect(fit).toMatchObject({
      wordsCut: false,
      inLine: true,
      noSidewaysScroll: true,
    });
    const { used, room, otherExtra } = fit;
    expect(used).toBeGreaterThan(room);
    expect(used + otherExtra).toBeGreaterThan(room);

    await band(page)
      .getByRole("button", {
        name: "Stop recalculating the LD decay",
        exact: true,
      })
      .click();
    await expect(
      ldDecay(page).getByText(
        /^Stopped: the LD decay no longer starts by itself after a change\./u,
      ),
    ).toBeVisible();
  });
});

/** Serves the calculation worker with every result of an LD decay
    turned into popnei's refusal `message`, as popnei would refuse it;
    to call before the page is opened. */
async function refuseLdDecay(page: Page, message: string): Promise<void> {
  await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
    const response = await route.fetch();
    const front = `{ const realPost = self.postMessage.bind(self); self.postMessage = (m, t) => { if (m && m.kind === "result" && m.result && m.result.analysis === "ldDecay") { realPost({ kind: "refused", id: m.id, message: ${JSON.stringify(message)} }); return; } realPost(m, t); }; }\n`;
    await route.fulfill({ response, body: front + (await response.text()) });
  });
}

test.describe("LT1 D5 the LD decay refused by popnei", () => {
  test("LT1 D5 refused for memory: its words, no Run and no Stop recalculating, and the line that says what brings Run back; a smaller distance brings it (the review of the LD decay, 12 October 2026)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await refuseLdDecay(
      page,
      "this machine has not the memory for the counts of 2 populations at 100,000 base pairs",
    );
    await ready(page);
    await typeDistance(page, "100000");
    await button(ldDecay(page), "Run").click();
    const part = ldDecay(page);
    await expect(part.getByText(/needed more memory/u)).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    await expect(
      part.getByText(
        "The LD decay no longer starts by itself after a change, since popnei refused it for lack of memory. Once a smaller largest distance is typed, or fewer individuals are kept, Run comes back: it calculates the LD decay and starts it again after each change.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(button(part, "Run")).toHaveCount(0);
    await expect(button(part, "Stop recalculating")).toHaveCount(0);

    await typeDistance(page, "50000");
    await expect(button(part, "Run")).toBeEnabled();
    await expect(
      part.getByText(
        "The LD decay no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change.",
        { exact: true },
      ),
    ).toBeVisible();
  });
});

test.describe("LT1 D5 the downloads of the LD decay", () => {
  test("LT1 D5 the table of the populations, the plot and the table of the bins saved by the keyboard and read back; each Download… of a table below it, the plot's above it", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await ready(page);
    await runLdDecay(page);
    const part = ldDecay(page);
    const menu = (what: string): Locator =>
      part.getByRole("button", { name: `Download ${what}`, exact: true });

    const tableMenu = menu("the table of the populations of the LD decay");
    expect(
      await isBelow(tableMenu, part.getByRole("table", { name: CAPTION })),
    ).toBe(true);
    await tableMenu.focus();
    const tableFile = await chooseByKeys(page, "Table as CSV");
    expect(tableFile.suggestedFilename()).toBe("ld.ld_decay.csv");
    const lines = (await textOf(tableFile)).trimEnd().split("\n");
    expect(lines[0]).toBe(
      'Population,Individuals,Variants,Pairs,Half distance (bp),"r² at distance 0, of the curve",4Nr per base pair',
    );
    expect(lines[1]).toBe(
      "pop_a,50,432,29367,7548.08187836982,0.46942148760330576,0.00029996668947275404",
    );

    const plotMenu = menu("the plot of the LD decay");
    expect(await isBelow(part.locator("svg.chart-line"), plotMenu)).toBe(true);
    await plotMenu.focus();
    const plotCsv = await chooseByKeys(page, "Data as CSV");
    expect(plotCsv.suggestedFilename()).toBe("ld.ld_decay.points.csv");
    const plotLines = (await textOf(plotCsv)).trimEnd().split("\n");
    expect(plotLines[0]).toBe("population,distance_bp,mean_r2,fitted_r2");
    expect(plotLines[1]).toMatch(/^pop_a,1000\.5,0\.3104664289575117,0\.\d+$/u);
    expect(plotLines).toHaveLength(1 + 100);
    await plotMenu.focus();
    const plotSvg = await chooseByKeys(page, "Image as SVG");
    expect(plotSvg.suggestedFilename()).toBe("ld.ld_decay.svg");

    await part.getByRole("tab", { name: "Plot" }).focus();
    await page.keyboard.press("ArrowRight");
    const binsMenu = menu("the table of the bins of the LD decay");
    await expect(binsMenu).toBeVisible();
    await binsMenu.focus();
    const binsFile = await chooseByKeys(page, "Table as CSV");
    expect(binsFile.suggestedFilename()).toBe("ld.ld_decay_bins.csv");
    const binLines = (await textOf(binsFile)).trimEnd().split("\n");
    expect(binLines[1]).toBe(
      "pop_a,1,2000,745,0.3104664289575117,0.28243883665741665",
    );
  });
});
