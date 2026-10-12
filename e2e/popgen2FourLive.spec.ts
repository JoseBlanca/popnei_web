/**
 * The four analyses of popgen2.html that can be live, the PCA, the
 * diversity, the LD decay and the distances between populations, on the
 * built site, after the merge of the LD decay and the distances (13
 * October 2026): after one change of a threshold they run one at a time
 * in the order of calculation, the PCA, the diversity, the distances and
 * the LD decay last, so that the distances never wait for the LD decay;
 * and the band at 320 px, the PCA held running with the three others
 * waiting after it, on one line with Stop and Stop all, the words whole
 * and no sideways scroll, Stop all named by the four in the order of the
 * tabs.
 *
 * ld.nei holds 500 variants of 100 diploid individuals, and ld_pops.csv
 * puts them in two populations of 50, pop_a and pop_b.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** How long a calculation of ld.nei may take to give its result. */
const RESULT_TIMEOUT = 30_000;

/** The label of the field of the distance of the LD pruning of the
    PCA. */
const PCA_DISTANCE =
  /^Distance within which variants are compared, in base pairs, from 1/u;

/** The label of the field of the largest distance of the LD decay. */
const LD_DISTANCE = /^Largest distance between the two variants of a pair/u;

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

/** The calculations of the four live analyses the page asked for, and
    their results, in their order, from the `from`-th entry. */
async function timeline(page: Page, from = 0): Promise<readonly string[]> {
  const all = await page.evaluate(
    (name) => (window as unknown as Record<string, string[]>)[name] ?? [],
    TIMELINE,
  );
  return all
    .slice(from)
    .filter((entry) => /(pca|diversity|popDists|ldDecay)$/u.test(entry));
}

/** How many entries the timeline has. */
async function timelineLength(page: Page): Promise<number> {
  return page.evaluate(
    (name) =>
      ((window as unknown as Record<string, string[]>)[name] ?? []).length,
    TIMELINE,
  );
}

/** Picks the fixture `name` with the button of the box `box`. */
async function pick(
  page: Page,
  box: "Variants" | "Individuals",
  name: string,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: box, exact: true })
    .getByRole("button", {
      name:
        box === "Variants"
          ? /^Open (another )?variants file…$/u
          : /^Open (another )?individuals file…$/u,
    })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** The tab of the row named `name`. */
function tab(
  page: Page,
  name: "Variants" | "PCA" | "Populations" | "Distances",
): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shown(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** The part of the tab shown named `name`. */
function part(page: Page, name: "Diversity" | "LD decay"): Locator {
  return shown(page).getByRole("region", { name, exact: true });
}

/** The Run of the PCA tab or of the Distances tab, shown. */
function tabRun(page: Page): Locator {
  return shown(page).getByRole("button", { name: "Run", exact: true });
}

/** Types `value` into the field `label` of `within` and commits it. */
async function typeInto(
  within: Locator,
  label: RegExp,
  value: string,
): Promise<void> {
  const field = within.getByRole("textbox", { name: label });
  await expect(field).toBeVisible({ timeout: RESULT_TIMEOUT });
  await field.fill(value);
  await field.press("Enter");
}

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
    the Variants tab, which stays shown. */
async function setMissing(page: Page, value: string): Promise<void> {
  await tab(page, "Variants").click();
  await missingBox(page).fill(value);
  await missingBox(page).press("Enter");
}

/** The band. */
function band(page: Page): Locator {
  return page.getByRole("banner", { name: "What the page is doing" });
}

/** The heading Popnei at the band's left. */
function heading(page: Page): Locator {
  return band(page).getByRole("heading", { level: 1, name: "Popnei" });
}

/** The line of the band as the eye reads it, and how it lies in the
    window: on one row, within the window, no sideways scroll, its
    words not cut. */
async function bandFit(page: Page): Promise<{
  readonly text: string;
  readonly oneLine: boolean;
  readonly inWindow: boolean;
  readonly wordsCut: boolean;
  readonly noSidewaysScroll: boolean;
} | null> {
  return heading(page).evaluate((h1) => {
    const line = h1.parentElement;
    const words = h1.nextElementSibling;
    if (line === null || !(words instanceof HTMLElement)) return null;
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    const texts: string[] = [];
    for (
      let node = walker.nextNode();
      node !== null;
      node = walker.nextNode()
    ) {
      const parent = node.parentElement;
      if (parent === null || parent.getBoundingClientRect().width <= 1)
        continue;
      texts.push(node.textContent ?? "");
    }
    const shownButtons = [...line.querySelectorAll("button")].filter(
      (button) => button.getClientRects().length > 0,
    );
    const parts = [h1, words, ...shownButtons].map((element) =>
      element.getBoundingClientRect(),
    );
    const top = Math.min(...parts.map((box) => box.top));
    return {
      text: texts.join(" ").replace(/\s+/gu, " ").trim(),
      oneLine: parts.every((box) => Math.abs(box.top - top) < 8),
      inWindow: parts.every((box) => box.right <= window.innerWidth + 0.5),
      wordsCut: words.scrollWidth > words.clientWidth,
      noSidewaysScroll:
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    };
  });
}

/**
 * Opens popgen2.html with what it asks of its workers recorded, the one
 * pass held and released to its end, ld.nei and ld_pops.csv, and runs
 * the four by their Runs to their results, in the order of the tabs:
 * the PCA at an LD distance of 50,000, the diversity, the LD decay at
 * 100,000 bp and the distances; all four live. The Variants tab is
 * shown at the end.
 */
async function fourLive(page: Page): Promise<void> {
  await page.addInitScript(recordTimeline, TIMELINE);
  await page.goto("popgen2.html");
  await expect(heading(page)).toBeVisible();
  await pick(page, "Variants", "ld.nei");
  await release(page, "allSoFar");
  await release(page, "result");
  await pick(page, "Individuals", "ld_pops.csv");

  await tab(page, "PCA").click();
  await typeInto(shown(page), PCA_DISTANCE, "50000");
  await expect(tabRun(page)).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await tabRun(page).click();
  await release(page, "pca");
  await expect(
    page.getByText(/^The place of each of the 100 individuals/u),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });

  await tab(page, "Populations").click();
  const diversityRun = part(page, "Diversity").getByRole("button", {
    name: "Run",
    exact: true,
  });
  await expect(diversityRun).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await diversityRun.click();
  await expect(
    part(page, "Diversity").getByRole("table", {
      name: /^The diversity of each population/u,
    }),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });
  await typeInto(part(page, "LD decay"), LD_DISTANCE, "100000");
  const ldRun = part(page, "LD decay").getByRole("button", {
    name: "Run",
    exact: true,
  });
  await expect(ldRun).toBeEnabled();
  await ldRun.click();
  await expect(
    part(page, "LD decay").getByRole("table", {
      name: /^The LD decay of each population/u,
    }),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });

  await tab(page, "Distances").click();
  await expect(tabRun(page)).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await tabRun(page).click();
  await expect(
    shown(page).getByRole("table", {
      name: /^Distances between the populations of ld\.nei/u,
    }),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });
  await tab(page, "Variants").click();
}

test.describe("the four live analyses of popgen2.html (the merge of the LD decay and the distances, 13 October 2026)", () => {
  test("after one change of a threshold the four run one at a time, the PCA, the diversity, the distances and the LD decay last: the distances run before the LD decay and never wait for it", async ({
    page,
  }) => {
    await holdSummary(page);
    await fourLive(page);
    const from = await timelineLength(page);
    await setMissing(page, "0.05");
    await expect
      .poll(() => timeline(page, from), { timeout: RESULT_TIMEOUT })
      .toEqual([
        "run pca",
        "result pca",
        "run diversity",
        "result diversity",
        "run popDists",
        "result popDists",
        "run ldDecay",
        "result ldDecay",
      ]);
    await expect(heading(page)).toBeVisible();
  });

  test("at 320 px, the PCA held running with the diversity, the distances and the LD decay waiting after it: Popnei, PCA · 0:0…, Stop and Stop all on one line, the words whole, no sideways scroll; Stop all named by the four in the order of the tabs; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    await holdSummary(page, { holdPca: true });
    await fourLive(page);
    await release(page, "holdPcaAgain");
    const from = await timelineLength(page);
    await page.setViewportSize({ width: 320, height: 720 });
    await setMissing(page, "0.05");
    await expect
      .poll(async () => (await bandFit(page))?.text, {
        timeout: RESULT_TIMEOUT,
      })
      .toMatch(/^Popnei PCA · 0:\d\d Stop Stop all$/u);
    const fit = await bandFit(page);
    expect(fit).toMatchObject({
      oneLine: true,
      inWindow: true,
      wordsCut: false,
      noSidewaysScroll: true,
    });
    await expect(
      band(page).getByRole("button", {
        name: "Stop all: the PCA, the diversity, the LD decay and the distances",
      }),
    ).toBeVisible();
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
    }
    await page.emulateMedia({ colorScheme: "light", reducedMotion: null });
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect
      .poll(async () => (await bandFit(page))?.text)
      .toMatch(
        /^Popnei PCA running · 0:\d\d · then the diversity, the distances and the LD decay Stop Stop all$/u,
      );
    await release(page, "pca");
    await expect
      .poll(() => timeline(page, from), { timeout: RESULT_TIMEOUT })
      .toContain("result ldDecay");
  });
});
