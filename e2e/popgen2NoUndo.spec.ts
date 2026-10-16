/**
 * No Undo and no Redo on popgen2.html, on the built site
 * (docs/specs/steps/popgen2-pca.md, "No Undo and no Redo" and "How it is
 * checked", the bullet "No Undo"; docs/specs/steps/popgen2-filters.md,
 * "Undo, Redo and their keys"): no button Undo nor Redo when the page
 * opens, after a variants file, after a threshold moved and after the
 * PCA; Ctrl+Z, Meta+Z, Ctrl+Shift+Z and Ctrl+Y on the heading, on a line
 * and in a box with nothing typed change no threshold, no option and no
 * result; Ctrl+Y and Meta+Y in a box reached by Tab, its text selected,
 * leave its number; in a box with digits not confirmed, Ctrl+Z puts back
 * the box's number and the keys of redo leave the digits; on a line
 * whose run of the arrow keys waits, the keys leave the run to become a
 * change at its second; the browser's own undo of a
 * box held back; the PCA done, a threshold moved and moved back: no Run
 * and no result between the change and the bar, and the PCA calculated
 * again by itself, one request. A file opened while the pass
 * of the file before it runs starts its own pass, and is never said to
 * be stopped.
 *
 * panel.vcf.gz and panel.nei hold the same 1,200 variants of 200
 * individuals, counted by popnei; panel.vcf.gz records the FILTER of its
 * variants. The MAF's axis goes from 0.45 to 1 by 0.01, the missing
 * rate's from 0 to 0.1 by 0.001.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { openParameters } from "./parameters.ts";
import { holdSummary, release } from "./holdWorker.ts";
import { pcaTabSeen, watchPcaTab } from "./pcaSeen.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const LABEL = "Leave out the variants that failed their FILTER";
/** The title of the histogram of the missing rate of the variants. */
const MISSING_TITLE = "Proportion of missing genotypes";
/** How long a PCA of panel.nei may take to give its result. */
const RESULT_TIMEOUT = 30_000;
/** The keys of Undo and Redo of the browsers, on Windows, Linux and
    macOS. */
const UNDO_KEYS = [
  "Control+z",
  "Meta+z",
  "Control+Shift+z",
  "Meta+Shift+z",
  "Control+y",
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

/** Opens popgen2.html with its calculations counted. */
async function openPage(page: Page): Promise<void> {
  await page.addInitScript(countRuns);
  await page.goto("popgen2.html");
  await expect(heading(page)).toBeVisible();
}

function heading(page: Page): Locator {
  return page.getByRole("heading", { level: 1, name: "Popnei" });
}

/** Any button of Undo or Redo on the page, with or without words after
    the name. */
function undoOrRedo(page: Page): Locator {
  return page.getByRole("button", { name: /^(Undo|Redo)\b/u });
}

/** The button that opens the file picker, whatever its words. */
function openButton(page: Page): Locator {
  return page.getByRole("button", {
    name: /^Open (another )?variants file…$/u,
  });
}

/** The box of the file open. */
function info(page: Page): Locator {
  return page.getByRole("region", { name: "File information" });
}

function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

/** The notice of the old page, which popgen2.html does not have. */
function notice(page: Page): Locator {
  return page.getByRole("region", { name: "Notice" });
}

function filterBox(page: Page): Locator {
  return page.getByRole("checkbox", { name: LABEL });
}

/** Clicks the words of the FILTER box, as a user does: the input itself
    is hidden under the drawn box. */
async function clickBox(page: Page): Promise<void> {
  await page.getByText(LABEL, { exact: true }).click();
}

/** Picks the fixture `name` with the open button. */
async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await openButton(page).click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** Expects the file `name` open, its 1,200 variants counted and its
    plots drawn: the one pass done. */
async function expectDone(page: Page, name: string): Promise<void> {
  await expect(info(page).getByText(name)).toBeVisible();
  await expect(
    info(page).getByText("Variants: 1,200", { exact: true }),
  ).toBeVisible();
  await expect(
    stats(page).getByRole("group", {
      name: "Major allele frequency",
      exact: true,
    }),
  ).toBeVisible();
}

/** The group of the histogram titled `title`, its box and its line. */
function threshold(
  page: Page,
  title: string,
): { readonly box: Locator; readonly slider: Locator } {
  const group = stats(page).getByRole("group", { name: title, exact: true });
  return { box: group.getByRole("textbox"), slider: group.getByRole("slider") };
}

/** The missing rate of the variants, typed at `value` and applied. */
async function typeMissing(page: Page, value: string): Promise<void> {
  const missing = threshold(page, MISSING_TITLE);
  await missing.box.fill(value);
  await missing.box.press("Enter");
  await expect(missing.slider).toHaveValue(value);
}

/** The tab named `name` of the row of tabs. */
function tab(page: Page, name: "Variants" | "PCA"): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shown(page: Page): Locator {
  return page.getByRole("tabpanel");
}

function run(page: Page): Locator {
  return shown(page).getByRole("button", { name: "Run", exact: true });
}

/** The caption of the table of the individuals of a result of the PCA. */
function tableCaptionOf(page: Page): Locator {
  return shown(page).getByText(/^The place of each of the 200 individuals/u);
}

/** The same caption, whether the PCA's panel is shown or not: the row
    of tabs keeps every panel drawn, so the result is read with the focus
    left where it is. */
function pcaCaption(page: Page): Locator {
  return page.getByText(/^The place of each of the 200 individuals/u);
}

/** Shows the PCA tab once the one pass has ended, types the distance of
    the LD pruning, 50000, presses Run and waits for the result. */
async function runPca(page: Page): Promise<void> {
  await tab(page, "PCA").click();
  await openParameters(shown(page));
  const distance = shown(page).getByRole("textbox", {
    name: "Distance within which variants are compared, in base pairs, from 1",
  });
  await distance.fill("50000");
  await distance.press("Enter");
  await expect(run(page)).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await run(page).click();
  await expect(tableCaptionOf(page)).toBeVisible({ timeout: RESULT_TIMEOUT });
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** axe on the page as it is, in the light and the dark theme. */
async function expectAxeBothSchemes(
  page: Page,
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  for (const scheme of ["light", "dark"] as const) {
    // No transition of the colours, which axe would read halfway.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await expectNoViolations(makeAxeBuilder);
  }
}

test("NU2 D3 no button Undo nor Redo when the page opens, after panel.nei, after a threshold moved and after the PCA; axe light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  test.setTimeout(90_000);
  await openPage(page);
  await expect(undoOrRedo(page)).toHaveCount(0);
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await pick(page, "panel.nei");
  await expectDone(page, "panel.nei");
  await expect(undoOrRedo(page)).toHaveCount(0);

  await typeMissing(page, "0.1");
  await typeMissing(page, "0.09");
  await expect(undoOrRedo(page)).toHaveCount(0);

  await runPca(page);
  await expect(undoOrRedo(page)).toHaveCount(0);
  await expect(notice(page)).toHaveCount(0);
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("NU2 D3 Ctrl+Z, Meta+Z, Ctrl+Shift+Z, Meta+Shift+Z and Ctrl+Y on the heading, on a line and in a box with nothing typed change no threshold, no option and no result", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  // A change of each kind before the keys: an option, the FILTER box,
  // and a threshold, the missing rate of the variants.
  await clickBox(page);
  await expect(filterBox(page)).not.toBeChecked();
  await typeMissing(page, "0.05");
  await runPca(page);
  const posted = await runsPosted(page);
  await tab(page, "Variants").click();
  const missing = threshold(page, MISSING_TITLE);

  // Each key alone, and everything read after it: the page keeps one
  // past project, so an undo and a redo pressed in a row would cancel
  // out and a check at the end alone would see nothing.
  for (const place of [heading(page), missing.slider, missing.box]) {
    for (const keys of UNDO_KEYS) {
      await place.focus();
      await page.keyboard.press(keys);
      await expect(place).toBeFocused();
      await expect(filterBox(page)).not.toBeChecked();
      await expect(missing.slider).toHaveValue("0.05");
      await expect(missing.box).toHaveValue("0.05");
      await expect(pcaCaption(page)).toBeAttached();
    }
    // A run of the keys would end with the focus: nothing waits here.
    await place.blur();
  }

  await tab(page, "PCA").click();
  await expect(tableCaptionOf(page)).toBeVisible();
  expect(await runsPosted(page)).toBe(posted);
  await expect(undoOrRedo(page)).toHaveCount(0);
  await expect(notice(page)).toHaveCount(0);
});

test("NU2 D3 0.9 typed in the box of the MAF and not confirmed: Ctrl+Shift+Z, Meta+Shift+Z and Ctrl+Y leave it typed; Ctrl+Z and Meta+Z put the box back to its number, the threshold off as it was", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  const maf = threshold(page, "Major allele frequency");
  // The keys of redo leave the digits typed, not committed: Escape then
  // puts back the box's number.
  for (const keys of ["Control+Shift+z", "Meta+Shift+z", "Control+y"]) {
    await maf.box.fill("0.9");
    await maf.box.press(keys);
    await expect(maf.box).toHaveValue("0.9");
    await maf.box.press("Escape");
    await expect(maf.box).toHaveValue("1");
    await expect(maf.slider).toHaveValue("1");
  }
  for (const keys of ["Control+z", "Meta+z"]) {
    await maf.box.fill("0.9");
    await maf.box.press(keys);
    await expect(maf.box).toHaveValue("1");
    await expect(maf.slider).toHaveValue("1");
  }
  // The box left: nothing typed is given to the project.
  await maf.box.press("Tab");
  await expect(maf.box).toHaveValue("1");
  await expect(maf.slider).toHaveValue("1");
});

/** Keeps, from the next load of `page`, every text React Aria's live
    region takes, for `liveSaid`: the region of a number box, which
    says "Empty" when its text is emptied, clears itself a few seconds
    later. */
async function recordLive(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const texts: string[] = [];
    Reflect.set(window, "popneiLive", texts);
    new MutationObserver(() => {
      for (const region of document.querySelectorAll("[data-live-announcer]")) {
        const text = region.textContent;
        if (text !== "") texts.push(text);
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
}

/** The texts React Aria's live region took since the load, after
    `recordLive`. */
async function liveSaid(page: Page): Promise<string> {
  return page.evaluate((): string => {
    const texts: unknown = Reflect.get(window, "popneiLive");
    return Array.isArray(texts) ? texts.join(" | ") : "";
  });
}

test("NU2 D3 a box reached by Tab, its text selected, Ctrl+Y and Meta+Y: the box keeps its number, and no Empty is said", async ({
  page,
}) => {
  // Chromium on macOS emptied the box at Ctrl+Y, its "yank", until the
  // window took the key (docs/specs/steps/popgen2-filters.md, "Undo,
  // Redo and their keys").
  await recordLive(page);
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  const missing = threshold(page, MISSING_TITLE);
  for (const keys of ["Control+y", "Meta+y"]) {
    // Back from the line over the menu "Download…" to the box.
    await missing.slider.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(missing.box).toBeFocused();
    expect(
      await missing.box.evaluate(
        (box: HTMLInputElement) =>
          box.selectionStart === 0 && box.selectionEnd === box.value.length,
      ),
    ).toBe(true);
    await page.keyboard.press(keys);
    await expect(missing.box).toHaveValue("0.1");
    await expect(missing.box).toBeFocused();
  }
  await expect(missing.slider).toHaveValue("0.1");
  expect(await liveSaid(page)).not.toContain("Empty");
});

test("NU2 D3 a run of the arrow keys waiting on a line, each key of Undo and Redo: the line stays where the presses put it, and the run becomes a change at its second, which leaves the PCA's result behind", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  // The PCA's result, which the run's change leaves behind, since the
  // PCA's filter of missing data follows the Variants tab's; and the
  // distance typed for it, the last change, which an undo would take
  // back and remove the result with it.
  await runPca(page);
  await tab(page, "Variants").click();
  const missing = threshold(page, MISSING_TITLE);
  await expect(missing.slider).toHaveValue("0.1");
  // The page's timers stand still from here, so that the run waits at the
  // keys whatever the speed of the machine.
  await page.clock.install();
  await page.clock.pauseAt(Date.now() + 1000);
  await missing.slider.focus();
  for (let press = 0; press < 3; press += 1) {
    await page.keyboard.press("ArrowLeft");
  }
  await expect(missing.slider).toHaveValue("0.097");
  const box = await missing.box.inputValue();

  // Each key alone, and everything read after it, as in the flow above.
  for (const keys of UNDO_KEYS) {
    await page.keyboard.press(keys);
    await expect(missing.slider).toHaveValue("0.097");
    await expect(missing.slider).toBeFocused();
    await expect(missing.box).toHaveValue(box);
    await expect(filterBox(page)).toBeChecked();
    await expect(pcaCaption(page)).toBeAttached();
  }

  // The run is no change yet: the result is still there until its second
  // has passed.
  await expect(pcaCaption(page)).toBeAttached();
  await page.clock.runFor(1_000);
  await expect(pcaCaption(page)).toHaveCount(0);
  await expect(missing.box).toHaveValue("0.097");
  await expect(missing.slider).toHaveValue("0.097");
  await expect(undoOrRedo(page)).toHaveCount(0);
});

test("NU2 D3 the PCA done, the missing rate of the variants moved and moved back: no Run and no result between the change and the bar, and the PCA calculated again by itself, one request", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await openPage(page);
  await pick(page, "panel.nei");
  await expectDone(page, "panel.nei");
  await runPca(page);
  const posted = await runsPosted(page);
  // From here, every frame: a Run or a result in the PCA tab, which the
  // live PCA must not show between the change and its bar
  // (docs/specs/steps/popgen2-pca.md, "About to start"; task 4.2 (a) of
  // docs/plans/no-undo.md).
  await watchPcaTab(page);

  await tab(page, "Variants").click();
  await typeMissing(page, "0.05");
  await typeMissing(page, "0.1");
  await tab(page, "PCA").click();

  await expect(tableCaptionOf(page)).toContainText(
    "from 548 variants, after the LD pruning",
    {
      timeout: RESULT_TIMEOUT,
    },
  );
  expect(await runsPosted(page)).toBe(posted + 1);
  expect(await pcaTabSeen(page)).toEqual({
    run: 0,
    gone: true,
    bar: true,
    resultBeforeBar: 0,
  });
});

test("NU2 D3 0.9 typed in a box and committed, another file opened: Ctrl+Z and Meta+Z in the box and on the heading leave the box at 0.9", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  const maf = threshold(page, "Major allele frequency");
  // 0.9 typed over the 1 of a threshold that is off, and committed.
  await maf.box.fill("0.9");
  await maf.box.press("Enter");
  await expect(maf.slider).toHaveValue("0.9");
  await pick(page, "panel.nei");
  await expectDone(page, "panel.nei");
  await expect(maf.box).toHaveValue("0.9");

  // The browser's own undo of the box's text would take it back to the
  // 1 that 0.9 was typed over, which Chromium did even from the heading,
  // moving the focus into the box (NumberField.tsx).
  const expectKept = async (): Promise<void> => {
    await expect(maf.box).toHaveValue("0.9");
    await expect(maf.slider).toHaveValue("0.9");
    await expect(maf.box).not.toHaveAttribute("data-muted");
  };
  for (const keys of ["Control+z", "Meta+z"]) {
    await maf.box.focus();
    await page.keyboard.press(keys);
    await expectKept();
    await heading(page).focus();
    await page.keyboard.press(keys);
    await expect(heading(page)).toBeFocused();
    await expectKept();
  }
  // The box committed again as the focus leaves it: still 0.9, on.
  await maf.box.focus();
  await page.keyboard.press("Tab");
  await expectKept();
  await expect(undoOrRedo(page)).toHaveCount(0);
});

test("NU2 D3 the commands undo and redo of document.execCommand, with the focus on the heading or in a box whose number was typed and committed, leave the number, the line and the threshold", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, "panel.vcf.gz");
  await expectDone(page, "panel.vcf.gz");
  const maf = threshold(page, "Major allele frequency");
  // 0.9 typed over the 1 of a threshold that is off, and committed.
  await maf.box.fill("0.9");
  await maf.box.press("Enter");
  await expect(maf.slider).toHaveValue("0.9");
  // The browser's undo and redo given as commands, a stand-in for its
  // menu Edit, which no flow can click: Chromium carries them out with no
  // beforeinput to cancel, only an input after the text changed; WebKit
  // offers them in a beforeinput, as it does the keys.
  const command = async (name: "undo" | "redo"): Promise<void> => {
    await page.evaluate(
      // eslint-disable-next-line @typescript-eslint/no-deprecated -- the only way a page gives the browser's own undo, which the box must withstand
      (n) => document.execCommand(n),
      name,
    );
  };
  const expectKept = async (): Promise<void> => {
    await expect(maf.box).toHaveValue("0.9");
    await expect(maf.slider).toHaveValue("0.9");
    await expect(maf.box).not.toHaveAttribute("data-muted");
  };

  await heading(page).focus();
  await command("undo");
  await command("redo");
  await command("undo");
  // The focus may have gone into the box; Tab commits it as it leaves.
  await page.keyboard.press("Tab");
  await expectKept();

  await maf.box.focus();
  await command("undo");
  await expect(maf.box).toHaveValue("0.9");
  await command("redo");
  await command("undo");
  await page.keyboard.press("Tab");
  await expectKept();

  // With 0.95 typed and not committed, the undo puts back 0.9.
  await maf.box.focus();
  await maf.box.press("End");
  await maf.box.pressSequentially("5");
  await expect(maf.box).toHaveValue("0.95");
  await command("undo");
  await expect(maf.box).toHaveValue("0.9");
  await page.keyboard.press("Tab");
  await expectKept();
});

test("SF7 round a file opened while the pass of the file before it runs starts its own pass, and is never said to be stopped", async ({
  page,
}) => {
  await holdSummary(page);
  await openPage(page);
  const stop = info(page).getByRole("button", { name: "Stop" });
  // Seen: the line of each part keeps the room of its words of a Stop,
  // hidden, while plots are drawn or coming.
  const stopped = stats(page)
    .getByText(/^Stopped\./u)
    .filter({ visible: true });
  await pick(page, "panel.vcf.gz");
  await expect(stop).toBeVisible();
  await clickBox(page);
  await expect(filterBox(page)).not.toBeChecked();

  // panel.vcf.gz is still read when panel.nei is opened over it.
  await pick(page, "panel.nei");
  await expect(info(page).getByText("panel.nei")).toBeVisible();
  await expect(stop).toBeVisible();
  await expect(stopped).toHaveCount(0);
  await expect(notice(page)).toHaveCount(0);

  await release(page, "result");
  await expectDone(page, "panel.nei");
  await expect(stopped).toHaveCount(0);
});
