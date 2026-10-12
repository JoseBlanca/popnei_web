/**
 * The band at the top of popgen2.html with the PCA and the diversity
 * live, on the built site (docs/specs/steps/popgen2-band.md, "Several
 * live analyses", "How it is checked", In Playwright, from 11 October
 * 2026): a threshold moved with both live and the PCA held running, the
 * band's "PCA running · 0:0… · then the diversity" with Stop and Stop
 * all; Stop all, after which no request of the diversity follows, both
 * tabs show the line of a Stop and the status region says the words of
 * Stop all once; the band read at every change of a round, never
 * "Popnei" alone between the PCA's end and the diversity's start; at 320
 * pixels, "Popnei", "PCoA · 0:0…", Stop and Stop all on one line with no
 * sideways scroll, and, the diversity about to start alone, "Popnei",
 * "Diversity soon" and Stop all alone, the band's Stop recalculating
 * neither read nor reached by Tab, and at 1280 pixels its words with
 * Stop recalculating and Stop all; and axe in each new state, light and
 * dark.
 *
 * panel.nei holds 1,200 variants of 200 diploid individuals, and
 * panel_pops.csv puts them in three populations, p0, p2 and p1.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { holdSummary, release, workersListening } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** How long a calculation of panel.nei may take to give its result. */
const RESULT_TIMEOUT = 30_000;

/** The label of the field of the distance of the LD pruning of the
    PCA. */
const DISTANCE =
  "Distance within which variants are compared, in base pairs, from 1";

/** What the status region says at Stop all, both tabs then offering
    Run, the threshold moved having left neither a result. */
const STOPPED_ALL =
  "Stopped: the PCA and the diversity no longer start by themselves. Press Run in their tabs to calculate them again.";

/** The lines of the two tabs after a Stop with no result shown. */
const PCA_STOPPED_LINE =
  "Stopped: the PCA no longer starts by itself after a change. Run calculates it and starts it again after each change.";
const DIVERSITY_STOPPED_LINE =
  "Stopped: the diversity no longer starts by itself after a change. Run calculates it and starts it again after each change.";

/** Counts, from the next load of `page`, the requests of each analysis
    the page posts to a worker, in `window.postedJobs`. */
async function countJobs(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const posted: Record<string, number> = {};
    Reflect.set(window, "postedJobs", posted);
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
        "job" in message &&
        typeof message.job === "object" &&
        message.job !== null &&
        "analysis" in message.job &&
        typeof message.job.analysis === "string"
      ) {
        const analysis = message.job.analysis;
        posted[analysis] = (posted[analysis] ?? 0) + 1;
      }
      (post as (...args: unknown[]) => void).call(this, message, ...rest);
    } as typeof post;
  });
}

/** How many requests of `analysis` the page posted. */
async function jobsOf(page: Page, analysis: string): Promise<number> {
  return page.evaluate(
    (name) =>
      (Reflect.get(window, "postedJobs") as Record<string, number>)[name] ?? 0,
    analysis,
  );
}

/** Records, from the next load of `page`, the text of the band's line,
    as the eye reads it, and the band's height, at each change of the
    band: a MutationObserver sees every state it was drawn in, also one
    shown for less than a frame. */
async function recordBand(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const states: { text: string; height: number }[] = [];
    Reflect.set(window, "popneiBand", states);
    const record = (): void => {
      const heading = document.querySelector("#defects h1");
      const line = heading?.parentElement;
      const header = document.querySelector("#defects header");
      if (!(line instanceof HTMLElement) || header === null) return;
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      const parts: string[] = [];
      for (
        let node = walker.nextNode();
        node !== null;
        node = walker.nextNode()
      ) {
        const parent = node.parentElement;
        if (parent === null || parent.getBoundingClientRect().width <= 1)
          continue;
        parts.push(node.textContent ?? "");
      }
      const text = parts.join(" ").replace(/\s+/gu, " ").trim();
      if (states.at(-1)?.text === text) return;
      states.push({ text, height: header.getBoundingClientRect().height });
    };
    new MutationObserver(record).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
}

/** What `recordBand` kept. */
async function bandStates(
  page: Page,
): Promise<readonly { text: string; height: number }[]> {
  return page.evaluate(() => {
    const states: unknown = Reflect.get(window, "popneiBand");
    return Array.isArray(states)
      ? (states as { text: string; height: number }[])
      : [];
  });
}

/** The band. */
function band(page: Page): Locator {
  return page.getByRole("banner", { name: "What the page is doing" });
}

/** The heading Popnei at the band's left. */
function heading(page: Page): Locator {
  return band(page).getByRole("heading", { level: 1, name: "Popnei" });
}

/** The line of the band as the eye reads it: "Popnei", its words and
    its controls, without what is drawn for a screen reader alone. */
async function lineText(page: Page): Promise<string> {
  return heading(page).evaluate((h1) => {
    const line = h1.parentElement;
    if (line === null) return "";
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    const parts: string[] = [];
    for (
      let node = walker.nextNode();
      node !== null;
      node = walker.nextNode()
    ) {
      const parent = node.parentElement;
      if (parent === null || parent.getBoundingClientRect().width <= 1)
        continue;
      parts.push(node.textContent ?? "");
    }
    return parts.join(" ").replace(/\s+/gu, " ").trim();
  });
}

/** The names of the band's buttons, as a screen reader reads them. */
async function bandButtons(page: Page): Promise<readonly string[]> {
  return band(page)
    .getByRole("button")
    .evaluateAll((buttons) =>
      buttons.map(
        (button) => button.getAttribute("aria-label") ?? button.textContent,
      ),
    );
}

/** The tab of the row named `name`. */
function tab(page: Page, name: "Variants" | "PCA" | "Populations"): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shown(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** The button of the tab shown named `name`. */
function button(page: Page, name: "Run" | "Stop"): Locator {
  return shown(page).getByRole("button", { name, exact: true });
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

/** axe on the page as it is, in the light and the dark theme, left
    light. */
async function expectAxeBothSchemes(
  page: Page,
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
  }
  await page.emulateMedia({ colorScheme: "light", reducedMotion: null });
}

/** Holds the start of every live analysis about to start, with the
    clock of the page running again: a key typed in the box of the
    missing data of the Variants tab, shown, and not yet given, is a
    change under way, so that the state stays while axe reads the page,
    which a paused clock of the page leaves waiting for ever. */
async function holdWithAKeyTyped(page: Page): Promise<void> {
  const box = missingBox(page);
  const value = await box.inputValue();
  await box.press("End");
  await box.press("Backspace");
  await box.press(value.slice(-1));
  await page.clock.resume();
}

/** How the band's line lies in the window: whether its words are cut,
    whether every part drawn is on one row of the line and within it,
    whether the page scrolls sideways, the room of the line and the
    width its parts take, the words and the buttons shown, with the
    gaps between them, the words' padding taken back by their margins. */
async function lineFit(page: Page): Promise<{
  readonly buttons: readonly string[];
  readonly wordsCut: boolean;
  readonly oneLine: boolean;
  readonly inLine: boolean;
  readonly inWindow: boolean;
  readonly noSidewaysScroll: boolean;
  readonly room: number;
  readonly used: number;
} | null> {
  return heading(page).evaluate((h1) => {
    const line = h1.parentElement;
    const words = h1.nextElementSibling;
    if (line === null || !(words instanceof HTMLElement)) return null;
    const shownButtons = [...line.querySelectorAll("button")].filter(
      (button) => button.getClientRects().length > 0,
    );
    const lineBox = line.getBoundingClientRect();
    const parts = [h1, words, ...shownButtons].map((element) =>
      element.getBoundingClientRect(),
    );
    const gapValue = parseFloat(getComputedStyle(line).columnGap);
    const gap = Number.isNaN(gapValue) ? 0 : gapValue;
    const wordsPadding =
      parseFloat(getComputedStyle(words).paddingInlineStart) +
      parseFloat(getComputedStyle(words).paddingInlineEnd);
    const top = Math.min(...parts.map((box) => box.top));
    return {
      buttons: shownButtons.map((button) => button.textContent),
      wordsCut: words.scrollWidth > words.clientWidth,
      oneLine: parts.every((box) => Math.abs(box.top - top) < 8),
      inLine: parts.every((box) => box.right <= lineBox.right + 0.5),
      inWindow: parts.every((box) => box.right <= window.innerWidth + 0.5),
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
    };
  });
}

/**
 * Opens popgen2.html with each diversity held, panel.nei and
 * panel_pops.csv, runs the PCA to its result and the diversity by its
 * Run, held running, and shows the Variants tab: the PCA live and idle,
 * the band's "Diversity running" with Stop and Stop all.
 */
async function diversityHeldRunning(page: Page): Promise<void> {
  await holdSummary(page, { holdDiversity: true });
  await page.goto("popgen2.html");
  await expect(heading(page)).toBeVisible();
  await pick(page, "Variants", "panel.nei");
  await release(page, "allSoFar");
  await release(page, "result");
  await pick(page, "Individuals", "panel_pops.csv");
  await tab(page, "PCA").click();
  const distance = shown(page).getByRole("textbox", { name: DISTANCE });
  await expect(distance).toBeVisible({ timeout: RESULT_TIMEOUT });
  await distance.fill("50000");
  await distance.press("Enter");
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await button(page, "Run").click();
  await expect(
    page.getByText(/^The place of each of the 200 individuals/u),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });
  await tab(page, "Populations").click();
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await button(page, "Run").click();
  await tab(page, "Variants").click();
  await expect(
    band(page).getByRole("button", {
      name: "Stop all: the PCA and the diversity",
    }),
  ).toBeVisible();
}

/**
 * Opens popgen2.html with the one pass held and released to its end,
 * panel.nei and panel_pops.csv, and runs the PCA, or the PCoA with
 * `pcoa`, and then the diversity, by their Run, each to its result: both
 * live. The Variants tab is shown at the end.
 */
async function bothLive(page: Page, pcoa = false): Promise<void> {
  await holdSummary(page);
  await page.goto("popgen2.html");
  await expect(heading(page)).toBeVisible();
  await pick(page, "Variants", "panel.nei");
  await release(page, "allSoFar");
  await release(page, "result");
  await pick(page, "Individuals", "panel_pops.csv");
  await tab(page, "PCA").click();
  if (pcoa) {
    await shown(page)
      .getByRole("button", { name: /Method$/u })
      .click();
    await page.getByRole("option", { name: /^PCoA of the Kosman/u }).click();
  }
  const distance = shown(page).getByRole("textbox", { name: DISTANCE });
  await expect(distance).toBeVisible({ timeout: RESULT_TIMEOUT });
  await distance.fill("50000");
  await distance.press("Enter");
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await button(page, "Run").click();
  await expect(
    page.getByText(/^The place of each of the 200 individuals/u),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });
  await tab(page, "Populations").click();
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await button(page, "Run").click();
  await expect(
    shown(page).getByRole("table", {
      name: /^The diversity of each population/u,
    }),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });
  await tab(page, "Variants").click();
  // The PCoA of panel.nei has a warning, Lingoes' correction, which the
  // band links to while the Variants tab is shown.
  await expect
    .poll(() => lineText(page))
    .toMatch(pcoa ? /^Popnei PCoA: 1 warning/u : /^Popnei$/u);
}

test.describe("PT4 D3 the band with the PCA and the diversity live", () => {
  test("PT4 D3 both live, a threshold moved, the PCA held running: PCA running · 0:0… · then the diversity, with Stop and Stop all; Stop all sends no diversity, both tabs show the line of a Stop, the status region says Stop all once, the focus on Popnei; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await countJobs(page);
    await recordAnnouncements(page);
    // A clock of the test, run past the quiet second after Stop all.
    await page.clock.install();
    await bothLive(page);
    await release(page, "holdPcaAgain");
    await setMissing(page, "0.05");

    await expect
      .poll(() => lineText(page), { timeout: RESULT_TIMEOUT })
      .toMatch(
        /^Popnei PCA running · 0:0\d · then the diversity Stop Stop all$/u,
      );
    expect(await bandButtons(page)).toEqual([
      "Stop the PCA",
      "Stop all: the PCA and the diversity",
    ]);
    await expectAxeBothSchemes(page, makeAxeBuilder);
    const diversities = await jobsOf(page, "diversity");

    await band(page)
      .getByRole("button", { name: "Stop all: the PCA and the diversity" })
      .click();
    await expect(heading(page)).toBeFocused();
    await expect.poll(() => lineText(page), { timeout: 15_000 }).toBe("Popnei");
    // Past the quiet second, in which the diversity would have started
    // had it stayed live.
    await page.clock.runFor(2000);
    expect(await jobsOf(page, "diversity")).toBe(diversities);
    expect(
      (await announced(page)).filter((text) => text.includes(STOPPED_ALL)),
    ).toHaveLength(1);
    await tab(page, "PCA").click();
    await expect(
      shown(page).getByText(PCA_STOPPED_LINE, { exact: true }),
    ).toBeVisible();
    await tab(page, "Populations").click();
    await expect(
      shown(page).getByText(DIVERSITY_STOPPED_LINE, { exact: true }),
    ).toBeVisible();
    await workersListening(page);
  });

  test("PT4 D3 both live, a threshold moved: the band read at every change says both about to start with Stop all, then the PCA running then the diversity, never Popnei alone between them, then Popnei alone; its height the same in each", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await recordBand(page);
    await bothLive(page);
    await setMissing(page, "0.05");
    // A key typed in the box and not yet given holds the start, so that
    // the quiet second does not run out before axe reads the band.
    await missingBox(page).press("Backspace");
    await missingBox(page).press("5");
    await expect
      .poll(() => lineText(page))
      .toBe("Popnei The PCA and the diversity start in a moment Stop all");
    expect(await bandButtons(page)).toEqual([
      "Stop all: the PCA and the diversity",
    ]);
    await expectAxeBothSchemes(page, makeAxeBuilder);
    await missingBox(page).press("Enter");
    await expect
      .poll(() => lineText(page), { timeout: RESULT_TIMEOUT })
      .toBe("Popnei");
    await tab(page, "Populations").click();
    await expect(
      shown(page).getByRole("table", {
        name: /^The diversity of each population, over the 1,152 variants/u,
      }),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });

    const states = (await bandStates(page)).map((state) => state.text);
    const soon = states.indexOf(
      "Popnei The PCA and the diversity start in a moment Stop all",
    );
    const lastDiversity = states.findLastIndex((text) =>
      text.startsWith("Popnei Diversity running"),
    );
    process.stdout.write(`band states: ${states.join(" | ")}\n`);
    expect(soon).toBeGreaterThanOrEqual(0);
    expect(lastDiversity).toBeGreaterThan(soon);
    const round = states.slice(soon, lastDiversity + 1);
    expect(round).not.toContain("Popnei");
    expect(
      round.some((text) =>
        /^Popnei PCA running · 0:\d\d · then the diversity Stop Stop all$/u.test(
          text,
        ),
      ),
    ).toBe(true);
    expect(round.at(-1)).toMatch(
      /^Popnei Diversity running · 0:\d\d Stop Stop all$/u,
    );
    const heights = new Set((await bandStates(page)).map((s) => s.height));
    expect([...heights]).toHaveLength(1);
  });

  test("PT4 D3 at 320 px, the PCoA held running with the diversity waiting: Popnei, PCoA · 0:0…, Stop and Stop all on one line, the words whole, no sideways scroll, the whole words for a screen reader; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 800 });
    await bothLive(page, true);
    await release(page, "holdPcaAgain");
    await setMissing(page, "0.05");

    await expect
      .poll(() => lineText(page), { timeout: RESULT_TIMEOUT })
      .toMatch(/^Popnei PCoA · 0:0\d Stop Stop all$/u);
    expect(await band(page).ariaSnapshot()).toContain("PCoA running · 0:0");
    expect(await band(page).ariaSnapshot()).toContain("then the diversity");
    const fit = await heading(page).evaluate((h1) => {
      const line = h1.parentElement;
      const words = h1.nextElementSibling;
      if (line === null || !(words instanceof HTMLElement)) return null;
      const lineBox = line.getBoundingClientRect();
      const parts = [h1, words, ...line.querySelectorAll("button")].map(
        (element) => element.getBoundingClientRect(),
      );
      return {
        wordsCut: words.scrollWidth > words.clientWidth,
        // Every part on the line, and within it.
        oneLine: parts.every(
          (box) =>
            box.top >= lineBox.top - 0.5 && box.bottom <= lineBox.bottom + 0.5,
        ),
        inLine: parts.every((box) => box.right <= lineBox.right + 0.5),
        buttons: line.querySelectorAll("button").length,
        noSidewaysScroll:
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth,
      };
    });
    expect(fit).toEqual({
      wordsCut: false,
      oneLine: true,
      inLine: true,
      buttons: 2,
      noSidewaysScroll: true,
    });
    await expectAxeBothSchemes(page, makeAxeBuilder);
    await release(page, "pca");
    await workersListening(page);
  });

  test("PT4 D3 at 320 px, the diversity about to start alone beside the PCA live: Popnei, Diversity soon and Stop all alone on one line, the words whole, no sideways scroll; the band's Stop recalculating neither read by a screen reader nor reached by Tab; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 800 });
    // A clock of the test, so that the quiet second stands still while
    // the line is read and the Tab key pressed.
    await page.clock.install();
    await bothLive(page);
    await tab(page, "Populations").click();
    const minimum = shown(page).getByRole("textbox", {
      name: /^Individuals with a called genotype needed in each population, per variant/u,
    });
    await page.clock.pauseAt(Date.now() + 1000);
    await minimum.fill("10");
    await minimum.press("Enter");
    await tab(page, "Variants").click();

    let fit: unknown = null;
    await expect
      .poll(async () => {
        fit = await heading(page).evaluate((h1) => {
          const line = h1.parentElement;
          const words = h1.nextElementSibling;
          if (line === null || !(words instanceof HTMLElement)) return null;
          if (!words.textContent.includes("Diversity soon")) {
            return null;
          }
          // The buttons drawn; one not drawn has an empty box.
          const shownButtons = [...line.querySelectorAll("button")].filter(
            (button) => button.getClientRects().length > 0,
          );
          const lineBox = line.getBoundingClientRect();
          const parts = [h1, words, ...shownButtons].map((element) =>
            element.getBoundingClientRect(),
          );
          return {
            buttons: shownButtons.map((button) => button.textContent),
            wordsCut: words.scrollWidth > words.clientWidth,
            oneLine: parts.every(
              (box) =>
                box.top >= lineBox.top - 0.5 &&
                box.bottom <= lineBox.bottom + 0.5,
            ),
            inLine: parts.every((box) => box.right <= lineBox.right + 0.5),
            noSidewaysScroll:
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
            room: Math.round(lineBox.width),
            used: Math.round(parts.reduce((sum, box) => sum + box.width, 0)),
          };
        });
        return fit !== null;
      })
      .toBe(true);
    process.stdout.write(`diversity soon at 320 px: ${JSON.stringify(fit)}\n`);
    expect(fit).toMatchObject({
      buttons: ["Stop all"],
      wordsCut: false,
      oneLine: true,
      inLine: true,
      noSidewaysScroll: true,
    });

    // Not in the accessibility tree, and out of the order of the Tab
    // key: from the heading Popnei, Tab goes to Stop all.
    expect(await bandButtons(page)).toEqual([
      "Stop all: the PCA and the diversity",
    ]);
    await expect(band(page)).toContainText("Diversity soon");
    await heading(page).focus();
    await page.keyboard.press("Tab");
    await expect(
      band(page).getByRole("button", {
        name: "Stop all: the PCA and the diversity",
      }),
    ).toBeFocused();
    await expect(band(page)).toContainText("Diversity soon");

    await holdWithAKeyTyped(page);
    await expectAxeBothSchemes(page, makeAxeBuilder);
    expect(await lineText(page)).toBe("Popnei Diversity soon Stop all");
  });

  test("PT4 D3 at 1280 px, the diversity about to start alone beside the PCA live: its words with Stop recalculating and Stop all; axe light and dark (the review of package 4, 12 October 2026)", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await page.clock.install();
    await bothLive(page);
    await tab(page, "Populations").click();
    const minimum = shown(page).getByRole("textbox", {
      name: /^Individuals with a called genotype needed in each population, per variant/u,
    });
    await page.clock.pauseAt(Date.now() + 1000);
    await minimum.fill("10");
    await minimum.press("Enter");
    await tab(page, "Variants").click();
    await holdWithAKeyTyped(page);

    await expect
      .poll(() => lineText(page))
      .toBe(
        "Popnei The diversity starts in a moment Stop recalculating Stop all",
      );
    expect(await bandButtons(page)).toEqual([
      "Stop recalculating the diversity",
      "Stop all: the PCA and the diversity",
    ]);
    await expectAxeBothSchemes(page, makeAxeBuilder);
    expect(await lineText(page)).toBe(
      "Popnei The diversity starts in a moment Stop recalculating Stop all",
    );
  });

  for (const width of [1280, 320]) {
    test(`PT4 D3 at ${String(width)} px, the band's Stop of the PCA focused when the PCA ends and the diversity starts: the focus goes to Popnei, never to a Stop of the diversity (the review of package 4, 12 October 2026)`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 800 });
      await bothLive(page);
      await release(page, "holdPcaAgain");
      await setMissing(page, "0.05");
      await expect
        .poll(() => lineText(page), { timeout: RESULT_TIMEOUT })
        .toMatch(/^Popnei PCA(?: running)? · 0:0\d.* Stop Stop all$/u);
      await band(page).getByRole("button", { name: "Stop the PCA" }).focus();
      // The name of the element with the focus at each change of the
      // page and at each frame, so that a state shown for less than a
      // frame is seen too.
      await page.evaluate(() => {
        const names: string[] = [];
        Reflect.set(window, "popneiFocused", names);
        const record = (): void => {
          const active = document.activeElement;
          const name =
            active === null
              ? "none"
              : (active.getAttribute("aria-label") ??
                `${active.tagName} ${active.textContent}`);
          if (names.at(-1) !== name) names.push(name);
        };
        new MutationObserver(record).observe(document, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
        });
        const frame = (): void => {
          record();
          requestAnimationFrame(frame);
        };
        frame();
      });

      await release(page, "pca");
      await expect(heading(page)).toBeFocused({ timeout: RESULT_TIMEOUT });
      await expect
        .poll(() => lineText(page), { timeout: RESULT_TIMEOUT })
        .toBe("Popnei");
      const focused = await page.evaluate(
        () => Reflect.get(window, "popneiFocused") as string[],
      );
      process.stdout.write(
        `focus at ${String(width)} px: ${focused.join(" | ")}\n`,
      );
      expect(focused.filter((name) => name.includes("diversity"))).toEqual([]);
      await expect(heading(page)).toBeFocused();
      await workersListening(page);
    });
  }

  test("PT4 D3 the band's Stop recalculating of the diversity focused at 1280 px, the window narrowed to 320 px, where the band does not show it: the focus goes to Popnei (the review of package 4, 12 October 2026)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.clock.install();
    await bothLive(page);
    await tab(page, "Populations").click();
    const minimum = shown(page).getByRole("textbox", {
      name: /^Individuals with a called genotype needed in each population, per variant/u,
    });
    await page.clock.pauseAt(Date.now() + 1000);
    await minimum.fill("10");
    await minimum.press("Enter");
    await tab(page, "Variants").click();
    const recalculating = band(page).getByRole("button", {
      name: "Stop recalculating the diversity",
    });
    await expect(recalculating).toBeVisible();
    await heading(page).focus();
    await page.keyboard.press("Tab");
    await expect(recalculating).toBeFocused();

    await page.setViewportSize({ width: 320, height: 800 });

    await expect(heading(page)).toBeFocused();
    await expect(band(page)).toContainText("Diversity soon");
    expect(await bandButtons(page)).toEqual([
      "Stop all: the PCA and the diversity",
    ]);
  });
  test("PT4 D3 at 320 px, the diversity held running beside the PCA live and idle: Popnei, Diversity · 0:0…, Stop and Stop all on one line, the words whole, no sideways scroll (the review of package 4, 12 October 2026)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 800 });
    await diversityHeldRunning(page);
    await expect
      .poll(() => lineText(page))
      .toMatch(/^Popnei Diversity · 0:\d\d Stop Stop all$/u);
    // Measured until it holds: the plots under the band are drawn again
    // at the new width a moment after it.
    await expect
      .poll(async () => lineFit(page))
      .toMatchObject({
        wordsCut: false,
        oneLine: true,
        inLine: true,
        noSidewaysScroll: true,
      });
    const fit = await lineFit(page);
    process.stdout.write(
      `diversity running at 320 px: ${JSON.stringify(fit)}\n`,
    );
    expect(fit).toMatchObject({
      buttons: ["Stop", "Stop all"],
      wordsCut: false,
      oneLine: true,
      inLine: true,
      noSidewaysScroll: true,
    });
    // Each button a target of 24 by 24 px at least (WCAG 2.5.8).
    for (const name of [
      "Stop the diversity",
      "Stop all: the PCA and the diversity",
    ]) {
      const box = await band(page).getByRole("button", { name }).boundingBox();
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
    }
    await release(page, "diversity");
    await workersListening(page);
  });

  test("PT4 D3 the widest lines of the band whole at 520 px and around the width under which it is narrow, 703 and 704 px, and at 720 px: the diversity about to start beside Stop recalculating and Stop all, then the PCA running then the diversity with Stop and Stop all (the review of package 4, 12 October 2026)", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.clock.install();
    await bothLive(page);
    await tab(page, "Populations").click();
    const minimum = shown(page).getByRole("textbox", {
      name: /^Individuals with a called genotype needed in each population, per variant/u,
    });
    await page.clock.pauseAt(Date.now() + 1000);
    await minimum.fill("10");
    await minimum.press("Enter");
    await tab(page, "Variants").click();
    await holdWithAKeyTyped(page);
    for (const width of [520, 703, 704, 720]) {
      await page.setViewportSize({ width, height: 800 });
      await expect
        .poll(() => lineText(page))
        .toMatch(
          width < 704
            ? /^Popnei Diversity soon Stop all$/u
            : /^Popnei The diversity starts in a moment Stop recalculating Stop all$/u,
        );
      // Measured until it holds: the plots under the band are drawn again
      // at the new width a moment after it.
      await expect
        .poll(async () => lineFit(page))
        .toMatchObject({
          wordsCut: false,
          oneLine: true,
          inLine: true,
          noSidewaysScroll: true,
        });
      const fit = await lineFit(page);
      process.stdout.write(
        `diversity soon at ${String(width)} px: ${JSON.stringify(fit)}\n`,
      );
    }
    await page.keyboard.press("Enter");
    await release(page, "holdPcaAgain");
    await setMissing(page, "0.04");
    await expect
      .poll(() => lineText(page), { timeout: RESULT_TIMEOUT })
      .toMatch(/^Popnei PCA( running)? · 0:\d\d.* Stop Stop all$/u);
    for (const width of [520, 703, 704, 720]) {
      await page.setViewportSize({ width, height: 800 });
      await expect
        .poll(() => lineText(page))
        .toMatch(
          width < 704
            ? /^Popnei PCA · 0:\d\d Stop Stop all$/u
            : /^Popnei PCA running · 0:\d\d · then the diversity Stop Stop all$/u,
        );
      // Measured until it holds: the plots under the band are drawn again
      // at the new width a moment after it.
      await expect
        .poll(async () => lineFit(page))
        .toMatchObject({
          wordsCut: false,
          oneLine: true,
          inLine: true,
          noSidewaysScroll: true,
        });
      const fit = await lineFit(page);
      process.stdout.write(
        `PCA then the diversity at ${String(width)} px: ${JSON.stringify(fit)}\n`,
      );
    }
    await release(page, "pca");
    await workersListening(page);
  });

  test("PT4 D3 at 320 px with the text twice its size, the diversity held running: the buttons on a second row, Stop all inside the window, the words whole, the page's content clear of the band (the review of package 4, 12 October 2026)", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 800 });
    await diversityHeldRunning(page);
    // Chromium sets the browser's size of text, as its setting does;
    // WebKit has no such call, and the closest is the page's own text
    // at 200%, which leaves the media queries at their width.
    if (testInfo.project.name === "chromium") {
      const session = await page.context().newCDPSession(page);
      await session.send("Page.setFontSizes", {
        fontSizes: { standard: 32, fixed: 26 },
      });
    } else {
      await page.addStyleTag({ content: "html { font-size: 200%; }" });
    }
    await expect
      .poll(() =>
        page.evaluate(
          () => getComputedStyle(document.documentElement).fontSize,
        ),
      )
      .toBe("32px");
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    const fit = await lineFit(page);
    process.stdout.write(
      `diversity running at 320 px, text 32 px: ${JSON.stringify(fit)}\n`,
    );
    expect(fit).toMatchObject({
      buttons: ["Stop", "Stop all"],
      wordsCut: false,
      inWindow: true,
    });
    // The page as a whole in Chromium alone: WebKit's text at 200% of the
    // page leaves the media queries of the rest of the page at the usual
    // width, which then scrolls sideways under a band that does not.
    if (testInfo.project.name === "chromium") {
      expect(fit?.noSidewaysScroll).toBe(true);
    }
    await expect
      .poll(async () => {
        const bandBottom = (await band(page).boundingBox())?.y ?? 0;
        const boxes = await page
          .getByRole("region", { name: "Variants", exact: true })
          .boundingBox();
        return (
          ((await band(page).boundingBox())?.height ?? 0) + bandBottom <=
          (boxes?.y ?? 0)
        );
      })
      .toBe(true);
    await release(page, "diversity");
    await workersListening(page);
  });
});
