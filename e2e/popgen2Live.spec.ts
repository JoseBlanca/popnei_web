/**
 * The PCA of popgen2.html calculated again by itself, on the built site
 * (docs/specs/steps/popgen2-pca.md, "The PCA calculated again by itself"
 * and "How it is checked", the bullet "Live"; docs/specs/steps/
 * popgen2-download.md, "When the PCA starts by itself"): after Run and
 * its end, ten presses of an arrow key on a threshold, on the slider of
 * the missing data of the PCA and on the closed list of the method start
 * one PCA, after the last press, and no control greys before it; a
 * slider held still, a threshold's line moved and held still, a thumb
 * pressed and held without moving, the list held open, a menu
 * "Download…" held open and digits typed slowly, each for 3 s, keep
 * working before any PCA starts, and the line or the thumb stays where
 * the user left it; after a change the tab never shows the result left
 * behind, nor Run, between the change and the bar, read every animation
 * frame; the line of the quiet second, then the bar; the status region
 * says the end of the run, never joined with its start; a value set back
 * is calculated again; Stop recalculating during the second gives Run
 * and a later change sends nothing; the numbers of the PCA started by
 * itself with the missing data of the PCA at 0.05, and the count of
 * variants of each PCA started by itself where it differs from 548; the
 * download pressed within the second goes first, and after a Stop of a
 * run a change sends nothing; axe in the state about to start, light
 * and dark.
 *
 * The 3 s are what the spec asks a change under way to hold, so they
 * are waited for in real time; every other wait is for what the page
 * shows. The page's timers are the fake clock's from its load, and a
 * flow that makes a change and then presses a control within the quiet
 * second stops them across the two, so that a loaded machine cannot let
 * the second run out between. panel.nei holds 1,200 variants of 200
 * diploid individuals; its PCA within 50,000 bp keeps, with the missing
 * data at 0.1, 548 variants, at 0.05, 532, PC1 3.58%, and at 0.045, 519;
 * with the missing data at 0.099 and the r² at 0.2, 1,072 (popnei 0.2.2
 * under node; the screen spec, "The numbers", for 548 and 532).
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { openParameters } from "./parameters.ts";
import { holdSummary, release, workersListening } from "./holdWorker.ts";
import { pcaTabSeen, watchPcaTab } from "./pcaSeen.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** How long a PCA of panel.nei may take to give its result. */
const RESULT_TIMEOUT = 30_000;

/** How long a change under way is held in these flows: three times the
    quiet second. */
const HELD_MS = 3000;

/** The line of the quiet second. */
const ABOUT =
  "The PCA starts in a moment, later if the filters or its options change.";

/** The line of the quiet second while the dialog of the download is
    open. */
const ABOUT_DIALOG =
  "The PCA starts again when the download is written or closed.";

/** The line under Run after a Stop, in the place of the bar. */
const STOPPED =
  "Stopped: the PCA no longer starts by itself after a change. Run calculates it and starts it again after each change.";

/** What the status region says at a start by itself, and at a Stop. */
const STARTED =
  "Calculating the PCA again. To change the filters, stop it in the PCA tab.";
const STOPPED_SAID =
  "PCA stopped. Press Run in the PCA tab to calculate it again.";

/** The label of the field of the distance of the LD pruning. */
const DISTANCE =
  "Distance within which variants are compared, in base pairs, from 1";

/** The label of the field of the r² of the LD pruning. */
const R2 = "Maximum r² with a variant kept before it, from 0 to 1";

const MISSING_TITLE = "Proportion of missing genotypes";
const MAF_TITLE = "Major allele frequency";

/** Ten presses of keys on a missing rate at 0.1 that step by 0.001:
    five of Page Down, ten steps each, and five of the left arrow, to
    0.045. */
const TEN_PRESSES = [
  ...Array.from({ length: 5 }, () => "PageDown"),
  ...Array.from({ length: 5 }, () => "ArrowLeft"),
] as const;

/** Counts the calculations the page asks of its workers, every "run"
    message, in `window.postedRuns`. */
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

async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

function tab(page: Page, name: "Variants" | "PCA"): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shown(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** The section of the PCA tab, shown or hidden behind another. */
function pcaSection(page: Page): Locator {
  return page
    .getByRole("region", { name: /^PCo?A$/u, includeHidden: true })
    .first();
}

function run(page: Page): Locator {
  return shown(page).getByRole("button", { name: "Run", exact: true });
}

function stop(page: Page): Locator {
  return shown(page).getByRole("button", { name: "Stop", exact: true });
}

/** The button that ends the automatic runs while the PCA is live and no
    PCA runs. */
function stopRecalculating(page: Page): Locator {
  return shown(page).getByRole("button", {
    name: "Stop recalculating",
    exact: true,
  });
}

function pcaSlider(page: Page, kind: "missing" | "maf"): Locator {
  return shown(page).getByRole("slider", {
    name:
      kind === "missing"
        ? /^Maximum proportion of missing genotypes for the PCo?A$/u
        : /^Maximum major allele frequency for the PCo?A$/u,
  });
}

/** The track of the slider whose input is `slider`, its visible part:
    the input is in a hidden box in the thumb, in the track. */
function trackOf(slider: Locator): Locator {
  return slider.locator("xpath=../../..");
}

/** The thumb of the slider whose input is `slider`. */
function thumbOf(slider: Locator): Locator {
  return slider.locator("xpath=../..");
}

function methodButton(page: Page): Locator {
  return shown(page).getByRole("button", { name: /Method$/u });
}

function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

/** The histogram of the variants titled `title`: its box and its line. */
function histogram(
  page: Page,
  title: string,
): { readonly box: Locator; readonly slider: Locator } {
  const block = stats(page).getByRole("group", { name: title, exact: true });
  return { box: block.getByRole("textbox"), slider: block.getByRole("slider") };
}

function downloadButton(page: Page): Locator {
  return stats(page).getByRole("button", {
    name: "Download filtered variants…",
    exact: true,
  });
}

function downloadDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Download filtered variants" });
}

/** The caption of the table of the individuals of a result, shown or
    hidden behind another tab. */
function caption(page: Page): Locator {
  return page.getByText(/^The place of each of the 200 individuals/u);
}

/** The labels of the axes of the 2D plot. */
function axisLabels(page: Page): Locator {
  return shown(page).locator("svg.chart-scatter .chart-axis-label");
}

/** Opens popgen2.html with its calculations counted and what its status
    regions say recorded, opens panel.nei, shows the PCA tab once the one
    pass has ended, types the distance of the LD pruning, 50000, presses
    Run and waits for its result: the PCA is live. */
async function openLive(page: Page): Promise<void> {
  await page.addInitScript(countRuns);
  await recordAnnouncements(page);
  // Every timer of the page is the fake clock's from its load, so that a
  // flow that stops it holds every quiet second, the one set by the
  // distance's Enter below among them; until then time flows as usual.
  await page.clock.install();
  await page.goto("popgen2.html");
  await pick(page, "panel.nei");
  await tab(page, "PCA").click();
  await openParameters(shown(page));
  const distance = shown(page).getByRole("textbox", { name: DISTANCE });
  await expect(distance).toBeVisible({ timeout: RESULT_TIMEOUT });
  await distance.fill("50000");
  await distance.press("Enter");
  await expect(run(page)).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await run(page).click();
  await expect(caption(page)).toContainText(
    "from 548 variants, after the LD pruning",
    {
      timeout: RESULT_TIMEOUT,
    },
  );
  await expect(stopRecalculating(page)).toBeVisible();
}

/** Expects one more calculation than `posted` once the PCA started by
    itself has given its result, and none more meanwhile; and, given
    `variants`, "from 532 variants, after the LD pruning", the caption of that result. */
async function expectOneMore(
  page: Page,
  posted: number,
  variants?: string,
): Promise<void> {
  await expect(caption(page)).toBeAttached({ timeout: RESULT_TIMEOUT });
  if (variants !== undefined) {
    await expect(caption(page)).toContainText(variants);
  }
  expect(await runsPosted(page)).toBe(posted + 1);
}

/** Stops the page's timers, so that what a flow does next, a commit and
    the press of a control, happens within one quiet second however
    loaded the machine; `startClock` lets them run again. */
async function stopClock(page: Page): Promise<void> {
  await page.clock.pauseAt(Date.now() + 1000);
}

async function startClock(page: Page): Promise<void> {
  await page.clock.resume();
}

/** Waits `ms` of real time: the time a change under way is held for,
    which is what the flow checks, not a wait for the page. */
async function holdFor(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}

/** Expects `control` not greyed by a running PCA. */
async function expectNotGreyed(control: Locator): Promise<void> {
  await expect(control).not.toHaveAttribute("aria-disabled", "true");
}

test.describe("NU4 D3 the PCA calculated again by itself", () => {
  test("NU4 D3 ten presses of Page Down and the left arrow on the line of a threshold start one PCA, after the last, for the value they reached, and no control greys before it", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    await tab(page, "Variants").click();
    const missing = histogram(page, MISSING_TITLE);
    await missing.slider.focus();
    // Five of ten steps and five of one, 0.1 to 0.045, where the PCA
    // keeps 519 variants and not the 548 of 0.1.
    for (const key of [...TEN_PRESSES]) {
      await page.keyboard.press(key);
      await expectNotGreyed(missing.slider);
    }
    await expect(missing.slider).toHaveValue("0.045");
    await expect(caption(page)).toHaveCount(0);
    await expectOneMore(
      page,
      posted,
      "from 519 variants, after the LD pruning",
    );
  });

  test("NU4 D3 ten presses of Page Down and the left arrow on the slider of the missing data of the PCA start one PCA, after the last, for the value they reached, and no control greys before it", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    const missing = pcaSlider(page, "missing");
    await missing.focus();
    for (const key of [...TEN_PRESSES]) {
      await page.keyboard.press(key);
      await expectNotGreyed(missing);
    }
    await expect(missing).toHaveAttribute("aria-valuetext", "0.045");
    await expectOneMore(
      page,
      posted,
      "from 519 variants, after the LD pruning",
    );
  });

  test("NU4 D3 ten presses of the arrow keys on the closed list of the method start one PCA, after the last, and no control greys before it", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    const method = methodButton(page);
    await method.focus();
    for (let press = 0; press < 10; press += 1) {
      await page.keyboard.press(press % 2 === 0 ? "ArrowRight" : "ArrowLeft");
      await expectNotGreyed(method);
    }
    await expect(method).toHaveAccessibleName(/^PCA of the genotypes/u);
    await expect(caption(page)).toContainText(
      "from 548 variants, after the LD pruning",
      {
        timeout: RESULT_TIMEOUT,
      },
    );
    expect(await runsPosted(page)).toBe(posted + 1);
  });

  test("NU4 D3 the slider of the PCA dragged and held still for 3 s: no PCA starts, nothing greys; at the release the thumb stays where it was left, and the PCA starts", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    const missing = pcaSlider(page, "missing");
    await trackOf(missing).scrollIntoViewIfNeeded();
    const track = await trackOf(missing).boundingBox();
    if (track === null) throw new Error("no track");
    const y = track.y + track.height / 2;
    // A change first, the MAF of the PCA a step down, whose quiet second
    // the drag must hold: the drag itself changes the project only at its
    // release. The page's timers stand still from the change to the press,
    // so that the second cannot run out between them.
    await stopClock(page);
    const maf = pcaSlider(page, "maf");
    await maf.focus();
    await maf.press("ArrowLeft");
    await page.mouse.move(track.x + track.width, y);
    await page.mouse.down();
    await startClock(page);
    await page.mouse.move(track.x + track.width / 2, y, { steps: 12 });
    await holdFor(page, HELD_MS);
    expect(await runsPosted(page)).toBe(posted);
    await expectNotGreyed(missing);
    const held = await missing.getAttribute("aria-valuetext");
    await page.mouse.up();
    await expect(missing).toHaveAttribute("aria-valuetext", held ?? "");
    await expectOneMore(page, posted);
    await expect(missing).toHaveAttribute("aria-valuetext", held ?? "");
  });

  test("NU4 D3 the line of a threshold moved and held still for 3 s: no PCA starts, the line not greyed; at the release it stays where it was left, and the PCA starts", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    await tab(page, "Variants").click();
    const missing = histogram(page, MISSING_TITLE);
    const thumb = thumbOf(missing.slider);
    await thumb.scrollIntoViewIfNeeded();
    const box = await thumb.boundingBox();
    if (box === null) throw new Error("no thumb");
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    // A change first, the MAF typed in its box, whose quiet second the
    // drag must hold: the drag itself changes the project only at its
    // release. The page's timers stand still from the change to the press.
    await stopClock(page);
    const maf = histogram(page, MAF_TITLE);
    await maf.box.fill("0.9");
    await maf.box.press("Enter");
    await page.mouse.move(x, y);
    await page.mouse.down();
    await startClock(page);
    await page.mouse.move(x - 60, y, { steps: 8 });
    await holdFor(page, HELD_MS);
    expect(await runsPosted(page)).toBe(posted);
    await expectNotGreyed(missing.slider);
    const held = await missing.slider.inputValue();
    expect(held).not.toBe("0.1");
    await page.mouse.up();
    await expect(missing.slider).toHaveValue(held);
    await expectOneMore(page, posted);
    await expect(missing.slider).toHaveValue(held);
  });

  test("NU4 D3 a change, then the thumb of the MAF of the PCA pressed and held without moving for 3 s: no PCA starts; at the release the thumb has not moved, and the PCA starts", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    const missing = pcaSlider(page, "missing");
    const maf = pcaSlider(page, "maf");
    const before = await maf.getAttribute("aria-valuetext");
    const thumb = thumbOf(maf);
    await thumb.scrollIntoViewIfNeeded();
    const box = await thumb.boundingBox();
    if (box === null) throw new Error("no thumb");
    await stopClock(page);
    await missing.focus();
    await missing.press("ArrowLeft");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await startClock(page);
    await holdFor(page, HELD_MS);
    expect(await runsPosted(page)).toBe(posted);
    await expectNotGreyed(maf);
    await page.mouse.up();
    await expect(maf).toHaveAttribute("aria-valuetext", before ?? "");
    await expectOneMore(page, posted);
  });

  test("NU4 D3 a change, then the list of the method held open for 3 s: no PCA starts and the list stays open; closed, the PCA starts", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    const missing = pcaSlider(page, "missing");
    await stopClock(page);
    await missing.focus();
    await missing.press("ArrowLeft");
    await methodButton(page).click();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    await startClock(page);
    await holdFor(page, HELD_MS);
    await expect(list).toBeVisible();
    expect(await runsPosted(page)).toBe(posted);
    await page.keyboard.press("Escape");
    await expect(list).toBeHidden();
    await expectOneMore(page, posted);
  });

  test("NU4 D3 a change, then a menu Download… held open for 3 s: no PCA starts and the menu stays open; closed, the PCA starts", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    await tab(page, "Variants").click();
    const missing = histogram(page, MISSING_TITLE);
    await stopClock(page);
    await missing.box.fill("0.05");
    await missing.box.press("Enter");
    await stats(page)
      .getByRole("button", {
        name: "Download the plot of the proportion of missing genotypes of the variants",
        exact: true,
      })
      .click();
    const menu = page.getByRole("menu");
    await expect(menu).toBeVisible();
    await startClock(page);
    await holdFor(page, HELD_MS);
    await expect(menu).toBeVisible();
    expect(await runsPosted(page)).toBe(posted);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expectOneMore(
      page,
      posted,
      "from 532 variants, after the LD pruning",
    );
  });

  test("NU4 D3 a change, then digits typed slowly in the r² of the PCA, over 3 s: no PCA starts and the box keeps taking them; Enter, and the PCA starts with both", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    const missing = pcaSlider(page, "missing");
    const r2 = shown(page).getByRole("textbox", { name: R2 });
    await stopClock(page);
    await missing.focus();
    await missing.press("ArrowLeft");
    await r2.click();
    await r2.press("ControlOrMeta+a");
    await r2.press("0");
    await startClock(page);
    await holdFor(page, HELD_MS / 3);
    expect(await runsPosted(page)).toBe(posted);
    for (const key of [".", "2"]) {
      await r2.press(key);
      await holdFor(page, HELD_MS / 3);
      expect(await runsPosted(page)).toBe(posted);
      await expectNotGreyed(r2);
    }
    await expect(r2).toHaveValue("0.2");
    await r2.press("Enter");
    // The missing data at 0.099 and the r² at 0.2: 1,072 variants.
    await expectOneMore(
      page,
      posted,
      "from 1,072 variants, after the LD pruning",
    );
    await expect(r2).toHaveValue("0.2");
    await expect(missing).toHaveAttribute("aria-valuetext", "0.099");
  });

  test("NU4 D3 the missing data of the PCA moved to 0.05: the line of the quiet second, then the bar, never the result left behind nor Run between; 532 variants and PC1 3.58%; its end said, never joined with its start", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    await shown(page).getByRole("radio", { name: "2D", exact: true }).click();
    const posted = await runsPosted(page);
    await watchPcaTab(page);
    const missing = pcaSlider(page, "missing");
    await missing.focus();
    for (let press = 0; press < 50; press += 1) {
      await page.keyboard.press("ArrowLeft");
    }
    await expect(missing).toHaveAttribute("aria-valuetext", "0.05");
    await expect(shown(page).getByText(ABOUT, { exact: true })).toBeVisible();
    await expect(stopRecalculating(page)).toHaveAccessibleDescription("");
    await expect(caption(page)).toContainText(
      "from 532 variants, after the LD pruning",
      {
        timeout: RESULT_TIMEOUT,
      },
    );
    await expect(axisLabels(page).first()).toHaveText("PC1 (3.58%)");
    expect(await runsPosted(page)).toBe(posted + 1);
    expect(await pcaTabSeen(page)).toEqual({
      run: 0,
      gone: true,
      bar: true,
      resultBeforeBar: 0,
    });
    // panel.nei's PCA ends within the status region's pause, so its end
    // is said alone, and its start, if said, never joined with it.
    const END = "PCA of panel.nei calculated.";
    await expect
      .poll(async () => (await announced(page)).some((t) => t.includes(END)))
      .toBe(true);
    const said = await announced(page);
    expect(
      said.filter((text) => text.includes(STARTED)).length,
    ).toBeLessThanOrEqual(1);
    expect(
      said.filter((text) => text.includes(STARTED) && text.includes(END)),
    ).toEqual([]);
  });

  test("NU4 D3 a value set back is calculated again: 0.05 and back to 0.1, each a PCA", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    const missing = pcaSlider(page, "missing");
    await missing.focus();
    await missing.press("ArrowLeft");
    await expect(caption(page)).toContainText("from ", {
      timeout: RESULT_TIMEOUT,
    });
    await expect(missing).not.toHaveAttribute("aria-disabled", "true", {
      timeout: RESULT_TIMEOUT,
    });
    expect(await runsPosted(page)).toBe(posted + 1);
    await missing.press("End");
    await expect(caption(page)).toHaveCount(0);
    await expect(caption(page)).toContainText(
      "from 548 variants, after the LD pruning",
      {
        timeout: RESULT_TIMEOUT,
      },
    );
    expect(await runsPosted(page)).toBe(posted + 2);
  });

  test("NU4 D3 Stop recalculating during the quiet second: Run, the line of a Stop under it, the focus on it, the Stop said; a later change sends nothing", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    // The page's timers stand still from here, so that the second does
    // not run out before Stop recalculating is pressed, whatever the
    // machine; the clock was installed before the page loaded, so no
    // timer of its own is left running.
    await stopClock(page);
    const missing = pcaSlider(page, "missing");
    await missing.focus();
    await missing.press("ArrowLeft");
    await expect(shown(page).getByText(ABOUT, { exact: true })).toBeVisible();
    await stopRecalculating(page).focus();
    await page.keyboard.press("Enter");
    await expect(run(page)).toBeFocused();
    await expect(shown(page).getByText(STOPPED, { exact: true })).toBeVisible();
    // The status region writes its words a moment later, on the page's
    // clock.
    await page.clock.resume();
    await expect.poll(() => announced(page)).toContain(STOPPED_SAID);

    await missing.focus();
    await missing.press("ArrowLeft");
    await holdFor(page, HELD_MS);
    expect(await runsPosted(page)).toBe(posted);
    await expect(shown(page).getByText(STOPPED, { exact: true })).toBeVisible();
    await expect(caption(page)).toHaveCount(0);
  });

  test("NU4 D3 about to start: the line and Stop recalculating, no Run nor result; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    const missing = pcaSlider(page, "missing");
    await missing.focus();
    await missing.press("ArrowLeft");
    // The state held for axe by the thumb of the MAF pressed and not
    // moved, a change under way that shows nothing of its own: axe runs
    // on the page's timers, which a paused clock would stop.
    const thumb = thumbOf(pcaSlider(page, "maf"));
    await thumb.scrollIntoViewIfNeeded();
    const box = await thumb.boundingBox();
    if (box === null) throw new Error("no thumb");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(shown(page).getByText(ABOUT, { exact: true })).toBeVisible();
    await expect(stopRecalculating(page)).toBeVisible();
    await expect(run(page)).toHaveCount(0);
    await expect(caption(page)).toHaveCount(0);
    for (const scheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
    }
    expect(await runsPosted(page)).toBe(posted);
    await page.mouse.up();
    await expectOneMore(page, posted);
  });

  test("NU4 D3 a threshold moved after the PCA ended, then the download pressed within the second: the dialog opens and no PCA is asked for until it closes; then one, for the threshold moved", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openLive(page);
    const posted = await runsPosted(page);
    await tab(page, "Variants").click();
    const missing = histogram(page, MISSING_TITLE);
    await stopClock(page);
    await missing.box.fill("0.05");
    await missing.box.press("Enter");
    await downloadButton(page).click();
    await expect(downloadDialog(page)).toBeVisible();
    await startClock(page);
    await holdFor(page, HELD_MS);
    expect(await runsPosted(page)).toBe(posted);
    await expect(
      pcaSection(page).getByText(ABOUT_DIALOG, { exact: true }),
    ).toBeAttached();
    await downloadDialog(page).getByRole("button", { name: "Cancel" }).click();
    await expect(downloadDialog(page)).toBeHidden();
    await expectOneMore(
      page,
      posted,
      "from 532 variants, after the LD pruning",
    );
    await expect(missing.slider).toHaveValue("0.05");
  });

  test("NU4 D3 a Stop of the PCA during its run, then a threshold moved: no PCA asked for, and the download enabled", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.addInitScript(countRuns);
    await recordAnnouncements(page);
    await holdSummary(page, { holdPca: true });
    await page.goto("popgen2.html");
    await pick(page, "panel.nei");
    await release(page, "allSoFar");
    await release(page, "result");
    await tab(page, "PCA").click();
    await openParameters(shown(page));
    const distance = shown(page).getByRole("textbox", { name: DISTANCE });
    await distance.fill("50000");
    await distance.press("Enter");
    await expect(run(page)).toBeEnabled({ timeout: RESULT_TIMEOUT });
    await run(page).click();
    await expect(stop(page)).toBeVisible();
    await stop(page).click();
    await expect(shown(page).getByText(STOPPED, { exact: true })).toBeVisible();
    const posted = await runsPosted(page);
    // The words of the Stop may be joined with the end of the statistics,
    // which the region says once their section is drawn: on a loaded
    // machine that comes within the region's pause before the Stop.
    await expect
      .poll(async () =>
        (await announced(page)).some((text) => text.includes(STOPPED_SAID)),
      )
      .toBe(true);

    await tab(page, "Variants").click();
    const missing = histogram(page, MISSING_TITLE);
    await missing.box.fill("0.05");
    await missing.box.press("Enter");
    await holdFor(page, HELD_MS);
    expect(await runsPosted(page)).toBe(posted);
    await expect(downloadButton(page)).toBeEnabled();
    await workersListening(page);
  });
});
