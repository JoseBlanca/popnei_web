/**
 * The PCA tab of popgen2.html up to its run, on the built site
 * (docs/plans/analyses-pca.md, work package 6, task 6.3;
 * docs/specs/steps/popgen2-pca.md, "The PCA tab", "While a PCA runs",
 * "The states" and "How it is checked", In Playwright): Run locked while
 * the one pass is held by holdWorker.ts, then free with the LD pruning at
 * its default of 100,000 base pairs, locked once the distance is emptied
 * and free again once one is typed; a PCA held running, the
 * bar moving, with the thresholds, the FILTER box and the PCA's options
 * greyed, `aria-disabled`, reached by the Tab key and refusing a press, a
 * key and a drag; Ctrl+Z doing nothing; the column of the
 * populations left open; another variants file opened, which stops the
 * PCA; the download of the filtered variants waiting with its words; the
 * end of a run said in the status region while the Variants tab is
 * shown; the reason of the tab in place of its options while another
 * file is opened; and axe in each state of the tab, light and dark.
 *
 * And its result (task 6.4): the numbers of popnei 0.2.2 on the plot,
 * the explained variance and the table, for the PCA, its filters made
 * stricter, the LD pruning off and the PCoA; the legend with
 * "Unclassified" and the populations of panel_pops.csv with no request;
 * the menus of the plot and the tables, chosen with the
 * keyboard and read back; the 3D view turned, hidden with its tab and
 * shown again, and drawn when its run ended while its tab was hidden.
 *
 * panel.nei and panel.vcf.gz hold 1,200 variants of 200 diploid
 * individuals, s000 to s199; panel.vcf.gz records the FILTER of its
 * variants, so its box is drawn; panel_pops.csv puts the individuals in
 * p0, p2 and p1.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Download, Locator, Page, Route } from "@playwright/test";

import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { dropOnBox, pickFile } from "./openFiles.ts";
import { openParameters } from "./parameters.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The reason every control a running PCA reads waits with. */
const LOCKED =
  "Stop the PCA in the PCA tab to change the filters; then press Run there to calculate it again.";

/** The words of Run locked by the one pass while it runs. */
const READING =
  "Run once panel.nei is read to the end: the reading under way in the box Variants and the PCA cannot run at once.";

/** The words beside Run locked by the LD pruning with no distance. */
const NO_DISTANCE =
  "Type the LD distance in Parameters, or turn the LD pruning off.";

/** The reason of the LD pruning with its distance emptied, in full,
    under the field of the distance. */
const NO_DISTANCE_FULL =
  "The LD pruning of the PCA needs the distance within which variants are compared. Type a distance in base pairs, 100,000 to start with, or turn the LD pruning off.";

/** The line under the field of the distance, on how to choose it. */
/** The box of the threshold of the missing data of the individuals, in
    the Variants tab. */
const INDIVIDUALS_MISSING =
  "Missing GTs max: maximum proportion of missing genotypes of an individual";

const DISTANCE_HINT =
  "100,000 bp is a start that suits many genomes but not all. The LD decay of the Populations tab shows how far LD extends in your data: choose a distance where its curve has flattened, well beyond the half distance.";

/** The label of the field of the distance. */
const DISTANCE =
  "Distance within which variants are compared, in base pairs, from 1";

/** The words of the button of the download while a PCA runs. */
const DOWNLOAD_WAITS_PCA =
  "Waits for the PCA to end; or stop it in the PCA tab.";

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

/** Picks the variants file `name`, a fixture, with the open button. */
async function pick(page: Page, name: string): Promise<void> {
  await pickFile(page, "variants", join(FIXTURES, name));
}

/** The box of the individuals file. */
function individualsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Individuals", exact: true });
}

/** Opens the individuals file `name`, a fixture, with the button that
    opens one now (openFiles.ts). */
async function pickIndividuals(page: Page, name: string): Promise<void> {
  await pickFile(page, "individuals", join(FIXTURES, name));
}

/** The label of the tab `name`. */
function tab(page: Page, name: "Variants" | "PCA"): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shown(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** Run of the PCA tab. */
function run(page: Page): Locator {
  return shown(page).getByRole("button", { name: "Run", exact: true });
}

/** Stop of the PCA tab. */
function stop(page: Page): Locator {
  return shown(page).getByRole("button", { name: "Stop", exact: true });
}

/** The field of the distance of the LD pruning. */
function distance(page: Page): Locator {
  return shown(page).getByRole("textbox", { name: DISTANCE });
}

/** The slider of the PCA's own missing data or MAF in the PCA tab, by
    its name under the PCA or the PCoA. */
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

/** Presses `key` on `slider` until its value reads `text`, at most `most`
    times, each press a change of the project. */
async function moveTo(
  slider: Locator,
  key: "ArrowLeft" | "ArrowRight",
  text: string,
  most = 200,
): Promise<void> {
  await slider.focus();
  for (let press = 0; press < most; press += 1) {
    if ((await slider.getAttribute("aria-valuetext")) === text) return;
    await slider.press(key);
  }
  await expect(slider).toHaveAttribute("aria-valuetext", text);
}

/** The drop-down list of the method in the PCA tab, its button, named
    by the item chosen and its label. */
function methodButton(page: Page): Locator {
  return shown(page).getByRole("button", { name: /Method$/u });
}

/** Chooses the PCoA in the drop-down list of the method. */
async function choosePcoa(page: Page): Promise<void> {
  await methodButton(page).click();
  await page.getByRole("option", { name: /^PCoA of the Kosman/u }).click();
  await expect(methodButton(page)).toHaveAccessibleName(
    "PCoA of the Kosman distances Method",
  );
}

/** The section of the statistics of the file, in the Variants tab. */
function stats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

/** The histogram of the variants titled `title`, its box and its
    line. */
function histogram(
  page: Page,
  title: string,
): { readonly box: Locator; readonly slider: Locator } {
  const block = stats(page).getByRole("group", { name: title, exact: true });
  return { box: block.getByRole("textbox"), slider: block.getByRole("slider") };
}

/** The button of the download of the filtered variants. */
function downloadButton(page: Page): Locator {
  return stats(page).getByRole("button", {
    name: "Download filtered variants…",
    exact: true,
  });
}

/** Opens popgen2.html with the one pass and each PCA held, `file` open,
    the pass released to its end, and the PCA tab shown. */
async function openHeld(page: Page, file: string): Promise<void> {
  await holdSummary(page, { holdPca: true });
  await page.goto("popgen2.html");
  await pick(page, file);
  await release(page, "allSoFar");
  await release(page, "result");
  await tab(page, "PCA").click();
  await openParameters(shown(page));
  await expect(run(page)).toBeEnabled({ timeout: 30_000 });
}

/** Types the distance of the LD pruning and gives it with Enter. */
async function typeDistance(page: Page, value: string): Promise<void> {
  await openParameters(shown(page));
  await distance(page).fill(value);
  await distance(page).press("Enter");
  await expect(run(page)).toBeEnabled();
}

/** Presses Run and waits for the PCA held running, its bar past 0, so
    that it is calculated in the worker and not waiting in its queue. */
async function runHeld(page: Page): Promise<void> {
  await run(page).click();
  await expect(stop(page)).toBeVisible();
  await expect(
    shown(page).getByRole("progressbar", { name: "Calculating the PCA" }),
  ).toHaveAttribute("aria-valuenow", /^[1-9]\d*$/u, { timeout: 30_000 });
}

/** Expects one tooltip shown, with the reason of the lock, under
    `anchor`, the visible part of the control it belongs to, and
    overlapping it from left to right. */
async function expectTooltipUnder(page: Page, anchor: Locator): Promise<void> {
  const tip = page.getByRole("tooltip");
  await expect(tip).toHaveCount(1);
  await expect(tip).toHaveText(LOCKED);
  const tipBox = await tip.boundingBox();
  const anchorBox = await anchor.boundingBox();
  if (tipBox === null || anchorBox === null) {
    throw new Error("no box of the tooltip or of its control");
  }
  expect(tipBox.y).toBeGreaterThanOrEqual(anchorBox.y + anchorBox.height - 1);
  expect(tipBox.x).toBeLessThan(anchorBox.x + anchorBox.width);
  expect(tipBox.x + tipBox.width).toBeGreaterThan(anchorBox.x);
}

/** Sends a scroll event from the document, which holds every control,
    as the browser sends one when the Tab key scrolls the page to bring a
    control into view, and waits two frames for the page to answer it. A
    real scroll by a pixel does not do: at the viewport of the flows,
    1280 by 3000 pixels, nothing scrolls and the browser sends no event.
    React Aria closes a tooltip on a scroll of anything that holds its
    trigger, which it hears on the window as the event goes down to its
    target; the step fails when the event did not reach the window. */
async function sendAScroll(page: Page): Promise<void> {
  const heard = await page.evaluate(
    () =>
      new Promise<boolean>((resolve) => {
        let seen = false;
        const listener = (event: Event): void => {
          if (event.target === document) seen = true;
        };
        window.addEventListener("scroll", listener, true);
        document.dispatchEvent(new Event("scroll"));
        window.removeEventListener("scroll", listener, true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(seen);
          });
        });
      }),
  );
  expect(heard).toBe(true);
}

/** Expects `control` to wait with the reason of the lock: marked
    `aria-disabled`, and its tooltip, alone, shown under `anchor`, its
    visible part, when the Tab key reaches it from the control before it,
    once, with no tooltip shown before the key, and still shown after a
    scroll of what holds it: the browser scrolls a control reached by the Tab
    key into view, and under load sends the events of that scroll after
    the tooltip shows (task 9.2). */
async function expectWaiting(
  page: Page,
  control: Locator,
  anchor: Locator = control,
): Promise<void> {
  await expect(control).toHaveAttribute("aria-disabled", "true");
  await control.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.keyboard.press("Tab");
  await expect(control).toBeFocused();
  await expectTooltipUnder(page, anchor);
  await sendAScroll(page);
  await expectTooltipUnder(page, anchor);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
}

/** The label of a radio button, a switch or a check box, whose words
    and mark the user sees, around its input. */
function labelOf(control: Locator): Locator {
  return control.locator("xpath=ancestor::label[1]");
}

/** The controls of the PCA tab that wait while a PCA runs, in their
    order on the page, each with its visible part, the tooltip's anchor,
    and the part a pointer reaches: the drop-down list of the method
    (anchored on its label and button), the two sliders (on their track),
    the switch (on its label) and the number boxes (on themselves). */
async function pcaTabControls(page: Page): Promise<
  readonly {
    readonly control: Locator;
    readonly anchor: Locator;
    readonly target: Locator;
  }[]
> {
  const method = methodButton(page);
  const controls: { control: Locator; anchor: Locator; target: Locator }[] = [
    { control: method, anchor: method.locator(".."), target: method },
  ];
  for (const slider of await shown(page).getByRole("slider").all()) {
    controls.push({
      control: slider,
      anchor: trackOf(slider),
      target: trackOf(slider),
    });
  }
  for (const toggle of await shown(page).getByRole("switch").all()) {
    controls.push({
      control: toggle,
      anchor: labelOf(toggle),
      target: labelOf(toggle),
    });
  }
  for (const box of await shown(page).getByRole("textbox").all()) {
    controls.push({ control: box, anchor: box, target: box });
  }
  return controls;
}

test("AP6 D3 the PCA tab opened during the one pass, held: Run disabled with the reading under way; after it, Run with the distance at 100,000 and no line of the individuals; the distance emptied, the reason of the LD pruning with no distance; a distance typed, Run; axe light and dark in each", async ({
  page,
  makeAxeBuilder,
}) => {
  await holdSummary(page);
  await page.goto("popgen2.html");
  await pick(page, "panel.nei");
  await tab(page, "PCA").click();
  await expect(
    shown(page).getByRole("heading", { level: 2, name: "PCA" }),
  ).toBeVisible();
  await expect(run(page)).toBeDisabled();
  await expect(run(page)).toHaveAccessibleDescription(READING);
  // Every individual is used, which the boxes at the top count: no line
  // of the individuals in the tab (the owner, 16 October 2026).
  await expect(
    shown(page).getByText("200 individuals of panel.nei", { exact: true }),
  ).toHaveCount(0);
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await release(page, "allSoFar");
  await release(page, "result");
  await openParameters(shown(page));
  // The LD pruning starts within 100,000 base pairs, so Run is free with
  // no option typed (the owner, 16 October 2026).
  await expect(run(page)).toBeEnabled({ timeout: 30_000 });
  await expect(run(page)).toHaveAccessibleDescription("");
  await expect(distance(page)).toHaveValue("100000");
  await expect(distance(page)).toHaveAccessibleDescription(
    new RegExp(`${DISTANCE_HINT.replace(/[.()]/gu, "\\$&")}$`, "u"),
  );
  await expect(
    shown(page).getByText(NO_DISTANCE_FULL, { exact: true }),
  ).toHaveCount(0);

  // The distance emptied is no distance, which locks Run.
  await distance(page).fill("");
  await distance(page).press("Enter");
  await expect(run(page)).toHaveAccessibleDescription(NO_DISTANCE);
  await expect(run(page)).toBeDisabled();
  await expect(distance(page)).toHaveValue("");
  await expect(distance(page)).toHaveAccessibleDescription(
    new RegExp(`^${NO_DISTANCE_FULL.replace(/[.()]/gu, "\\$&")}`, "u"),
  );
  await expect(distance(page)).toHaveAccessibleDescription(
    new RegExp(`${DISTANCE_HINT.replace(/[.()]/gu, "\\$&")}$`, "u"),
  );
  // Said once on the page, under the field, as a line and not a problem;
  // and the short line beside Run.
  const full = shown(page).getByText(NO_DISTANCE_FULL, { exact: true });
  await expect(full).toHaveCount(1);
  await expect(full.locator("svg")).toHaveCount(0);
  await expect(shown(page).getByText(NO_DISTANCE, { exact: true })).toHaveCount(
    1,
  );
  await expect(
    shown(page).getByText(DISTANCE_HINT, { exact: true }),
  ).toBeVisible();

  // The sliders at their upper end, as in the Variants tab: the missing
  // data at its 0.1; the MAF, whose threshold is off there, at 1, off.
  const missingSlider = pcaSlider(page, "missing");
  await expect(missingSlider).toHaveAttribute(
    "aria-valuetext",
    "0.1, as in the Variants tab",
  );
  await expect(missingSlider).toHaveAttribute("max", "0.1");
  await expect(missingSlider).toHaveAttribute("min", "0");
  await expect(
    shown(page).getByText("0.1, as in the Variants tab", { exact: true }),
  ).toBeVisible();
  const mafSlider = pcaSlider(page, "maf");
  await expect(mafSlider).toHaveAttribute(
    "aria-valuetext",
    "Off, as in the Variants tab",
  );
  await expect(mafSlider).toHaveAttribute("min", "0.5");
  await expect(mafSlider).toHaveAttribute("max", "1");
  await mafSlider.focus();
  await mafSlider.press("Home");
  await expect(mafSlider).toHaveAttribute("aria-valuetext", "0.5");
  await mafSlider.press("ArrowRight");
  await expect(mafSlider).toHaveAttribute("aria-valuetext", "0.51");
  await mafSlider.press("End");
  await expect(mafSlider).toHaveAttribute(
    "aria-valuetext",
    "Off, as in the Variants tab",
  );

  await typeDistance(page, "50000");
  await expect(run(page)).toHaveAccessibleDescription("");
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("AP6 D3 the missing rate of the individuals at 0.03 keeps 116 of the 200: the PCA tab's line names them, and none once every individual is used again", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await openReady(page, null);
  const line = shown(page).getByText(
    "116 of the 200 individuals of panel.nei, those the filters of individuals keep",
    { exact: true },
  );
  await expect(line).toHaveCount(0);
  // 116 kept, as the box Individuals and the download of the filtered
  // variants count them at 0.03 (e2e/popgen2Input.spec.ts, IN6 D3).
  await tab(page, "Variants").click();
  const individualsMissing = stats(page).getByRole("textbox", {
    name: INDIVIDUALS_MISSING,
  });
  await individualsMissing.fill("0.03");
  await individualsMissing.press("Enter");
  await tab(page, "PCA").click();
  await expect(line).toBeVisible();
  await expect(run(page)).toBeEnabled();

  await tab(page, "Variants").click();
  // At 1 the threshold keeps every individual.
  await individualsMissing.fill("1");
  await individualsMissing.press("Enter");
  await tab(page, "PCA").click();
  await expect(run(page)).toBeEnabled();
  await expect(
    shown(page).getByText(/those the filters of individuals keep$/u),
  ).toHaveCount(0);
});

test.describe("AP6 D3 the locks while a PCA runs", () => {
  // Tall enough that a control reached by the Tab key is never at the
  // bottom of the window, where React Aria would turn its tooltip above
  // it.
  test.use({ viewport: { width: 1280, height: 3_000 } });

  test("AP6 D3 a PCA held running: the bar moves; every option of the PCA tab, every threshold box and line of the Variants tab and the FILTER box greyed, aria-disabled, with their reason as description, and its tooltip alone under each reached by the Tab key; a press, a key or a drag changes nothing; axe light and dark; all back after Stop", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await openHeld(page, "panel.vcf.gz");
    await typeDistance(page, "50000");
    await runHeld(page);
    await expectAxeBothSchemes(page, makeAxeBuilder);

    // Every option of the PCA tab: the method's drop-down list, the two
    // sliders, the switch and the 2 boxes.
    const controls = await pcaTabControls(page);
    expect(controls).toHaveLength(6);
    for (const { control, anchor } of controls) {
      await expect(control).toHaveAccessibleDescription(
        new RegExp(LOCKED, "u"),
      );
      await expectWaiting(page, control, anchor);
    }

    // Pressed though they say they wait, as a user may: Playwright would
    // not press a control marked aria-disabled.
    const missing = pcaSlider(page, "missing");
    const ld = shown(page).getByRole("switch", {
      name: "Prune the variants by linkage disequilibrium (LD)",
    });
    // The arrows to the side, which choose the next item of a closed
    // list, and the letters typed, which choose the item they start.
    await methodButton(page).focus();
    for (const key of ["ArrowRight", "ArrowLeft", "c", "o"]) {
      await methodButton(page).press(key);
      await expect(methodButton(page)).toHaveAccessibleName(
        "PCA of the genotypes Method",
      );
      await expect(stop(page)).toBeVisible();
    }
    await methodButton(page).click({ force: true });
    await methodButton(page).press("ArrowDown");
    await methodButton(page).press("Enter");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(methodButton(page)).toHaveAccessibleName(
      "PCA of the genotypes Method",
    );
    await missing.focus();
    for (const key of ["ArrowLeft", "PageDown", "Home"]) {
      await page.keyboard.press(key);
    }
    const track = await trackOf(missing).boundingBox();
    if (track === null) throw new Error("no track");
    await page.mouse.move(
      track.x + track.width - 2,
      track.y + track.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(track.x + 2, track.y + track.height / 2, {
      steps: 8,
    });
    await page.mouse.up();
    await expect(missing).toHaveAttribute(
      "aria-valuetext",
      "0.1, as in the Variants tab",
    );
    await labelOf(ld).click({ force: true });
    await expect(ld).toBeChecked();
    await distance(page).focus();
    await page.keyboard.press("End");
    await page.keyboard.type("5");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    await expect(distance(page)).toHaveValue("50000");
    await expect(stop(page)).toBeVisible();

    // The five thresholds of the Variants tab, each its box and its line,
    // and the FILTER box.
    await tab(page, "Variants").click();
    // The lines are drawn over the plots once they are laid out.
    await expect(stats(page).getByRole("slider")).toHaveCount(5);
    const boxes = await stats(page).getByRole("textbox").all();
    const lines = await stats(page).getByRole("slider").all();
    expect(boxes).toHaveLength(5);
    expect(lines).toHaveLength(5);
    for (const control of [...boxes, ...lines]) {
      await expect(control).toHaveAccessibleDescription(
        new RegExp(LOCKED, "u"),
      );
      await expectWaiting(page, control);
    }
    const rate = histogram(page, "Proportion of missing genotypes");
    const before = await rate.slider.inputValue();
    await rate.box.focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.type("2");
    await page.keyboard.press("Enter");
    await expect(rate.box).toHaveValue("0.1");
    await rate.slider.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("PageDown");
    await expect(rate.slider).toHaveValue(before);
    // The keys leave the reason shown.
    await expect(page.getByRole("tooltip")).toHaveText(LOCKED);
    // Ctrl+Z after the keys, in the box and on the line: no run of the
    // keys was started to be made a change, and the keys change nothing.
    for (const control of [rate.box, rate.slider]) {
      await control.focus();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("ControlOrMeta+z");
      await control.blur();
    }
    await expect(rate.box).toHaveValue("0.1");
    await expect(rate.slider).toHaveValue(before);
    const thumb = rate.slider.locator("xpath=../..");
    await thumb.scrollIntoViewIfNeeded();
    const box = await thumb.boundingBox();
    if (box === null) throw new Error("no thumb");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 100, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(rate.slider).toHaveValue(before);
    await expect(rate.box).toHaveValue("0.1");

    const filter = stats(page).getByRole("checkbox", {
      name: "Leave out the variants that failed their FILTER",
    });
    await expect(filter).toHaveAccessibleDescription(new RegExp(LOCKED, "u"));
    await expectWaiting(page, filter, labelOf(filter));
    await labelOf(filter).click({ force: true });
    await expect(filter).toBeChecked();
    await expectAxeBothSchemes(page, makeAxeBuilder);

    await tab(page, "PCA").click();
    await stop(page).click();
    await expect(run(page)).toBeEnabled();
    for (const { control } of await pcaTabControls(page)) {
      await expect(control).not.toHaveAttribute("aria-disabled");
    }
    await tab(page, "Variants").click();
    for (const control of [...boxes, ...lines, filter]) {
      await expect(control).not.toHaveAttribute("aria-disabled");
    }
  });

  test("AP6 D3 a PCA held running: 20 moves of the Tab key over the options of the PCA tab, each with no tooltip before it and the reason alone under the control after it", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openHeld(page, "panel.nei");
    await typeDistance(page, "50000");
    await runHeld(page);
    // The stops of the Tab key in their order: the method, the two
    // sliders, the switch, r² and the distance.
    const inOrder = await pcaTabControls(page);
    expect(inOrder).toHaveLength(6);
    const first = inOrder[0];
    if (first === undefined) throw new Error("no stop");
    await first.control.focus();
    await page.keyboard.press("Escape");
    let at = 0;
    let step = 1;
    for (let move = 0; move < 20; move += 1) {
      if (at + step < 0 || at + step >= inOrder.length) step = -step;
      await page.keyboard.press("Escape");
      await expect(page.getByRole("tooltip")).toHaveCount(0);
      await page.keyboard.press(step > 0 ? "Tab" : "Shift+Tab");
      at += step;
      const reached = inOrder[at];
      if (reached === undefined) throw new Error("no stop reached");
      await expect(reached.control).toBeFocused();
      await expectTooltipUnder(page, reached.anchor);
    }
  });

  test("AP6 D3 a PCA held running: the mouse resting on each option of the PCA tab and on the FILTER box shows the reason, and a click on it shows it too", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openHeld(page, "panel.vcf.gz");
    await typeDistance(page, "50000");
    await runHeld(page);
    const targets = await pcaTabControls(page);
    const check = async (
      targetsHere: readonly { target: Locator; anchor: Locator }[],
    ): Promise<void> => {
      for (const { target, anchor } of targetsHere) {
        await page.mouse.move(0, 0);
        await expect(page.getByRole("tooltip")).toHaveCount(0);
        await target.hover({ force: true });
        await expectTooltipUnder(page, anchor);
        await page.mouse.move(0, 0);
        await expect(page.getByRole("tooltip")).toHaveCount(0);
        await target.click({ force: true });
        await expectTooltipUnder(page, anchor);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("tooltip")).toHaveCount(0);
        // The focus the click left in the control taken out, which would
        // keep the next tooltip of the same group through the mouse
        // leaving it.
        await page.evaluate(() => {
          const focused = document.activeElement;
          if (focused instanceof HTMLElement) focused.blur();
        });
      }
    };
    await check(targets);
    await tab(page, "Variants").click();
    const filter = stats(page).getByRole("checkbox", {
      name: "Leave out the variants that failed their FILTER",
    });
    await check([{ target: labelOf(filter), anchor: labelOf(filter) }]);
  });
});

test.describe("AP6 D3 the locks on a touch screen", () => {
  test.use({ hasTouch: true, viewport: { width: 1280, height: 3_000 } });

  test("AP6 D3 a PCA held running: a tap on each option of the PCA tab and on the FILTER box shows the reason", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await openHeld(page, "panel.vcf.gz");
    await typeDistance(page, "50000");
    await runHeld(page);
    const targets = await pcaTabControls(page);
    const check = async (
      targetsHere: readonly { target: Locator; anchor: Locator }[],
    ): Promise<void> => {
      for (const { target, anchor } of targetsHere) {
        await page.keyboard.press("Escape");
        await expect(page.getByRole("tooltip")).toHaveCount(0);
        await target.tap({ force: true });
        await expectTooltipUnder(page, anchor);
      }
    };
    await check(targets);
    await tab(page, "Variants").click();
    const filter = stats(page).getByRole("checkbox", {
      name: "Leave out the variants that failed their FILTER",
    });
    await check([{ target: labelOf(filter), anchor: labelOf(filter) }]);
  });
});

test("AP6 D3 Run pressed within the second of an arrow key on a threshold: the PCA runs on the threshold the key gave, and is not stopped when the second passes", async ({
  page,
}) => {
  test.setTimeout(90_000);
  // The page's clock, which the flow moves on past the quiet second.
  await page.clock.install();
  await openHeld(page, "panel.nei");
  await typeDistance(page, "50000");
  await tab(page, "Variants").click();
  const rate = histogram(page, "Proportion of missing genotypes");
  await expect(rate.box).toHaveValue("0.1");
  await rate.box.focus();
  await page.keyboard.press("ArrowDown");
  // The tab and Run activated with no pointer, which moves no focus. The
  // Variants tab hidden takes the focus from the threshold, which then
  // ends its run, in both engines on 10 October 2026, before and after
  // the gate made Run end it; so this checks the outcome, and the test
  // of the store the order.
  await tab(page, "PCA").dispatchEvent("click");
  await run(page).dispatchEvent("click");
  await expect(stop(page)).toBeVisible();
  await expect(pcaSlider(page, "missing")).toHaveAttribute(
    "aria-valuetext",
    "0.099, as in the Variants tab",
  );
  // Past the quiet second after the key, a timer of the page, when a run
  // of the keys left waiting would have changed the threshold: the
  // page's clock moved on by 1.5 s, its timers run.
  await page.clock.runFor(1_500);
  await expect(stop(page)).toBeVisible();
  await expect(
    shown(page).getByRole("progressbar", { name: "Calculating the PCA" }),
  ).toBeVisible();
});

test("AP6 D3 while a PCA runs Ctrl+Z changes nothing; the column of the populations stays open and a column chosen leaves the PCA running; another variants file opened stops it, the tab ready", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await openHeld(page, "panel.nei");
  await typeDistance(page, "50000");
  await runHeld(page);

  await page.getByRole("heading", { level: 1, name: "Popnei" }).click();
  await page.keyboard.press("ControlOrMeta+z");
  await expect(distance(page)).toHaveValue("50000");
  await expect(stop(page)).toBeVisible();

  await pickIndividuals(page, "panel_pops.csv");
  const column = individualsBox(page).getByRole("button", {
    name: "Column of the populations",
  });
  await expect(column).toContainText("popcat", { timeout: 20_000 });
  await expect(column).not.toHaveAttribute("aria-disabled");
  await column.click();
  await page
    .getByRole("option", {
      name: "None: every individual unclassified",
      exact: true,
    })
    .click();
  await expect(column).toContainText("None");
  await expect(stop(page)).toBeVisible();

  // Dropped on the box, which keeps the PCA tab shown (16 October 2026).
  await dropOnBox(page, "variants", join(FIXTURES, "panel.vcf.gz"));
  await expect(stop(page)).toHaveCount(0);
  await release(page, "allSoFar");
  await release(page, "result");
  // The options kept, the distance among them.
  await expect(run(page)).toBeEnabled({ timeout: 30_000 });
  await expect(distance(page)).toHaveValue("50000");
});

/** Expects what a running PCA locks open again: the options of the PCA
    tab, and, in the Variants tab, the boxes and lines of the
    thresholds, the FILTER box when drawn, and the download of the
    filtered variants. Leaves the Variants tab shown. */
async function expectUnlocked(page: Page): Promise<void> {
  await tab(page, "PCA").click();
  for (const { control } of await pcaTabControls(page)) {
    await expect(control).not.toHaveAttribute("aria-disabled");
  }
  await tab(page, "Variants").click();
  for (const control of [
    ...(await stats(page).getByRole("textbox").all()),
    ...(await stats(page).getByRole("slider").all()),
    ...(await stats(page).getByRole("checkbox").all()),
  ]) {
    await expect(control).not.toHaveAttribute("aria-disabled");
  }
  await expect(downloadButton(page)).toBeEnabled();
  await expect(downloadButton(page)).toHaveAccessibleDescription("");
}

test("AP6 D3 a PCA that ends with its result gives back the options of the PCA, the thresholds, the FILTER box and the download of the filtered variants", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await openHeld(page, "panel.vcf.gz");
  await typeDistance(page, "50000");
  await runHeld(page);
  await release(page, "pca");
  await expect(stop(page)).toHaveCount(0, { timeout: RESULT_TIMEOUT });
  await expect(tableCaptionOf(page)).toBeVisible({ timeout: RESULT_TIMEOUT });
  await expectUnlocked(page);
});

test("AP6 D3 a PCA that fails: its words in the tab and in the status region, Stop recalculating while it stays live and Run after it, the filters and the download given back; axe light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  test.setTimeout(90_000);
  await recordAnnouncements(page);
  await openHeld(page, "panel.vcf.gz");
  await typeDistance(page, "50000");
  await runHeld(page);
  await release(page, "crash");
  const words =
    "The calculation stopped unexpectedly. Run it again. If it stops again, open panel.vcf.gz again in the box Variants.";
  await expect(shown(page).getByText(words, { exact: true })).toBeVisible({
    timeout: RESULT_TIMEOUT,
  });
  await expect
    .poll(
      async () =>
        // The region may say it with what comes in the same pause.
        (await announced(page)).some((text) =>
          text.includes(
            `The PCA of panel.vcf.gz could not be calculated: ${words}`,
          ),
        ),
      { timeout: 10_000 },
    )
    .toBe(true);
  // The crash, not of the memory, leaves the PCA live: Stop
  // recalculating, which then gives Run.
  const stopLive = shown(page).getByRole("button", {
    name: "Stop recalculating",
    exact: true,
  });
  await expect(stopLive).toBeEnabled();
  await expect(stop(page)).toHaveCount(0);
  await expectAxeBothSchemes(page, makeAxeBuilder);
  await stopLive.click();
  await expect(run(page)).toBeEnabled();
  await expectUnlocked(page);
});

test("AP6 D3 the download of the filtered variants waits while a PCA is held, with its words, and comes back after Stop; the PCoA's words; the text after a download stays during a run; axe light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  test.setTimeout(90_000);
  await openHeld(page, "panel.nei");
  await typeDistance(page, "50000");
  await runHeld(page);
  await tab(page, "Variants").click();
  await expect(downloadButton(page)).toBeDisabled();
  await expect(downloadButton(page)).toHaveAccessibleDescription(
    DOWNLOAD_WAITS_PCA,
  );
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await tab(page, "PCA").click();
  await stop(page).click();
  await tab(page, "Variants").click();
  await expect(downloadButton(page)).toBeEnabled();

  await tab(page, "PCA").click();
  await choosePcoa(page);
  await expect(
    shown(page).getByRole("heading", { level: 2, name: "PCoA" }),
  ).toBeVisible();
  await run(page).click();
  await expect(stop(page)).toBeVisible();
  await tab(page, "Variants").click();
  await expect(downloadButton(page)).toHaveAccessibleDescription(
    "Waits for the PCoA to end; or stop it in the PCA tab.",
  );
  await tab(page, "PCA").click();
  await stop(page).click();

  await tab(page, "Variants").click();
  await downloadButton(page).click();
  const dialog = page.getByRole("dialog", {
    name: "Download filtered variants",
  });
  await dialog
    .locator("label")
    .filter({ hasText: "popnei's .nei file" })
    .click();
  const coming = page.waitForEvent("download", { timeout: 60_000 });
  await dialog.getByRole("button", { name: "Download" }).click();
  await coming;
  const after = stats(page).locator("p", { hasText: /^panel\.filtered\.nei/u });
  await expect(after).toBeVisible();
  await tab(page, "PCA").click();
  await run(page).click();
  await expect(stop(page)).toBeVisible();
  await tab(page, "Variants").click();
  await expect(after).toBeVisible();
  await expect(downloadButton(page)).toHaveCount(0);
});

test('AP6 D3 "PCA of panel.nei calculated." in the status region while the Variants tab is shown', async ({
  page,
}) => {
  await recordAnnouncements(page);
  await openHeld(page, "panel.nei");
  await typeDistance(page, "50000");
  await runHeld(page);
  await tab(page, "Variants").click();
  await release(page, "pca");
  // The region may say it with what comes in the same pause.
  await expect
    .poll(
      async () =>
        (await announced(page)).some((text) =>
          text.includes("PCA of panel.nei calculated."),
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
  await tab(page, "PCA").click();
  await expect(stop(page)).toHaveCount(0);
});

test("AP6 D3 the PCA tab shown, another variants file opened: its reason in place of the options, which come back as they were once it is open", async ({
  page,
  makeAxeBuilder,
}) => {
  // The opening of panel.vcf.gz kept from the worker, so that it stays
  // being opened.
  await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
    const response = await route.fetch();
    const script = await response.text();
    const front = `self.addEventListener("message", (event) => { if (event.data !== null && typeof event.data === "object" && event.data.kind === "open" && event.data.file.name === "panel.vcf.gz") { event.stopImmediatePropagation(); } });\n`;
    await route.fulfill({ response, body: front + script });
  });
  await page.goto("popgen2.html");
  await pick(page, "panel.nei");
  await tab(page, "PCA").click();
  await openParameters(shown(page));
  await expect(run(page)).toBeEnabled({ timeout: 30_000 });
  await typeDistance(page, "50000");

  // Dropped on the box, which keeps the PCA tab shown (16 October 2026).
  await dropOnBox(page, "variants", join(FIXTURES, "panel.vcf.gz"));
  const reason = "The PCA needs a variants file: panel.vcf.gz is being opened.";
  await expect(shown(page).getByText(reason, { exact: true })).toBeVisible();
  await expect(distance(page)).toBeHidden();
  await expect(run(page)).toBeHidden();
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await page.unrouteAll({ behavior: "wait" });
  await dropOnBox(page, "variants", join(FIXTURES, "panel.nei"));
  await expect(distance(page)).toBeVisible({ timeout: 30_000 });
  await expect(distance(page)).toHaveValue("50000");
  await expect(run(page)).toBeEnabled({ timeout: 30_000 });
});

/** A PCA of panel.nei takes well under a second; 30 s leaves room for a
    loaded machine. */
const RESULT_TIMEOUT = 30_000;

/** The names of the plot, in 3D and in 2D. */
const PCA_3D = "Principal components, PC1, PC2 and PC3";
const PCA_2D = "Principal components, PC1 and PC2";

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

/** Whether this engine gives WebGL 2, as the 3D view asks for it. */
async function givesWebGl(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const context = document.createElement("canvas").getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return context !== null;
  });
}

/** Opens popgen2.html with its calculations counted, opens panel.nei,
    shows the PCA tab once the one pass has ended, and types the distance
    of the LD pruning, `distance`, or leaves it at its default of 100,000
    base pairs when `distance` is `null`. */
async function openReady(
  page: Page,
  distance: string | null = "50000",
): Promise<void> {
  await page.addInitScript(countRuns);
  await page.goto("popgen2.html");
  await pick(page, "panel.nei");
  await tab(page, "PCA").click();
  await openParameters(shown(page));
  await expect(run(page)).toBeEnabled({ timeout: 30_000 });
  if (distance !== null) await typeDistance(page, distance);
}

/** The caption of the table of the individuals of a result. */
function tableCaptionOf(page: Page): Locator {
  return shown(page).getByText(/^The place of each of the 200 individuals/u);
}

/** Presses Run and waits for the result. */
async function runToResult(page: Page): Promise<void> {
  await run(page).click();
  await expect(tableCaptionOf(page)).toBeVisible({ timeout: RESULT_TIMEOUT });
}

/** The labels of the axes of the 2D plot. */
function axisLabels(page: Page): Locator {
  return shown(page).locator("svg.chart-scatter .chart-axis-label");
}

/** The legend of the points, by its title. */
function legend(page: Page, title = "Population"): Locator {
  return shown(page).getByRole("radiogroup", { name: title, exact: true });
}

/** The table of the explained variance. */
function varianceTable(page: Page): Locator {
  return shown(page).getByRole("table", {
    name: /^The variance of the individuals explained/u,
  });
}

/** The grid of the individuals. */
function individualsGrid(page: Page): Locator {
  return shown(page).getByRole("grid", { name: /^The place of each/u });
}

/** The button "Download…" named `what`, after "Download ". */
function menuButton(page: Page, what: string): Locator {
  return shown(page).getByRole("button", {
    name: `Download ${what}`,
    exact: true,
  });
}

/** Checks that the button `button` is drawn below the table `table`:
    after it in the page, and its top at or under the table's bottom. */
async function expectDrawnBelow(
  button: Locator,
  table: Locator,
): Promise<void> {
  const after = await table.evaluate(
    (element, other) =>
      (element.compareDocumentPosition(other) &
        Node.DOCUMENT_POSITION_FOLLOWING) !==
      0,
    await button.elementHandle(),
  );
  expect(after).toBe(true);
  const tableBox = await table.boundingBox();
  const buttonBox = await button.boundingBox();
  expect(tableBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(buttonBox?.y ?? 0).toBeGreaterThanOrEqual(
    (tableBox?.y ?? 0) + (tableBox?.height ?? 0) - 0.5,
  );
}

/** Focuses the button `button`, opens its menu with Enter, goes down to
    `item`, the `index`th, with the arrow keys, chooses it with Enter, and
    gives the file the page hands to the browser. */
async function chooseByKeys(
  page: Page,
  button: Locator,
  item: string,
  index: number,
): Promise<Download> {
  await button.focus();
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

/** Switches the plot to 2D, named `name` for a screen reader. */
async function to2d(page: Page, name = PCA_2D): Promise<void> {
  await shown(page).getByRole("radio", { name: "2D", exact: true }).click();
  await expect(shown(page).getByRole("img", { name })).toBeVisible();
}

/** The status region of the shell, the last of the page's. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

test.describe("AP6 D3 the result of the PCA tab", () => {
  test("AP6 D3 the PCA with no option typed, the LD pruning within 100,000: its title, the 3D view first, PC1 (3.55%) and PC2 (3.40%) in 2D, PC3 1.89%, s000 at −0.7139 and 7.6765, 548 variants, no warning; Unclassified (200) alone, then p0, p2 and p1 with panel_pops.csv and no request; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    // popnei 0.2.2 under node gives the same numbers within 100,000 base
    // pairs as within any distance from 2,000: 548 variants are kept at
    // all of them, so the numbers alone tell only that the pruning ran at
    // r² 0.1 within some such distance. The caption of the table, built
    // from the options the run was made with, says it was 100,000.
    await openReady(page, null);
    await runToResult(page);
    await expect(
      shown(page).getByRole("heading", {
        level: 3,
        name: "Principal components of panel.nei",
      }),
    ).toBeVisible();
    if (await givesWebGl(page)) {
      await expect(shown(page).getByRole("img", { name: PCA_3D })).toBeVisible({
        timeout: RESULT_TIMEOUT,
      });
      // No buttons to turn, tilt, look along, zoom or reset the 3D view
      // on this page: a drag turns it, Ctrl and the wheel zoom it.
      await expect(
        shown(page).getByRole("button", {
          name: /^(Turn|Tilt|View along|Zoom|Reset view)/u,
        }),
      ).toHaveCount(0);
    }
    await expect(shown(page).getByText(/^Warning:/u)).toHaveCount(0);
    await expect(
      shown(page).getByRole("heading", { name: /warning/u }),
    ).toHaveCount(0);
    await expect(tableCaptionOf(page)).toHaveText(
      "The place of each of the 200 individuals of panel.nei on the first 10 of the 199 components, from 548 variants, after the LD pruning at r² 0.1 within 100,000 bp.",
    );
    await expect(
      varianceTable(page).getByRole("row", { name: /^PC3 / }),
    ).toContainText("1.89%");
    await expect(legend(page).getByRole("radio")).toHaveText([
      "Unclassified (200)",
    ]);
    await expectAxeBothSchemes(page, makeAxeBuilder);

    await to2d(page);
    await expect(axisLabels(page)).toHaveText(["PC1 (3.55%)", "PC2 (3.40%)"]);
    const cells = individualsGrid(page)
      .getByRole("row", { name: /^s000/u })
      .getByRole("gridcell");
    await expect(cells.nth(0)).toHaveText("Unclassified");
    await expect(cells.nth(1)).toHaveText("−0.7139");
    await expect(cells.nth(2)).toHaveText("7.6765");
    expect(await runsPosted(page)).toBe(2);

    await pickIndividuals(page, "panel_pops.csv");
    await expect(legend(page).getByRole("radio")).toHaveText(
      ["p0 (48)", "p2 (84)", "p1 (68)"],
      { timeout: 20_000 },
    );
    await expect(axisLabels(page)).toHaveText(["PC1 (3.55%)", "PC2 (3.40%)"]);
    // The one pass and the PCA, and nothing for the individuals file.
    expect(await runsPosted(page)).toBe(2);
    await expectAxeBothSchemes(page, makeAxeBuilder);
  });

  test("AP6 D3 the table of the individuals cut at the right says so, in its words and to a screen reader, until it is scrolled sideways to PC10, at 1280 and at 320 px", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const MORE = "More columns: scroll sideways.";
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 900 });
      if (width === 1280) {
        await openReady(page);
        await runToResult(page);
      }
      const grid = individualsGrid(page);
      await grid.scrollIntoViewIfNeeded();
      const cue = shown(page).getByText(MORE, { exact: true });
      await expect(cue).toBeVisible();
      await expect(grid).toHaveAccessibleDescription(MORE);
      await grid.evaluate((element) => {
        element.scrollTo({ left: element.scrollWidth });
      });
      await expect(
        grid.getByRole("columnheader", { name: "PC10" }),
      ).toBeInViewport();
      await expect(cue).toHaveCount(0);
      await expect(grid).toHaveAccessibleDescription("");
      await grid.evaluate((element) => {
        element.scrollTo({ left: 0 });
      });
      await expect(cue).toBeVisible();
    }
  });

  test("AP10 D2 its filters, the PCA calculated again by itself after each: the slider of the missing data moved to 0.05, 532 variants and PC1 3.58%; the Variants tab at 0.03 and back; the MAF at 0.9, 510 variants and PC1 3.68%; the LD pruning off, 1,200 variants, PC1 7.61% and its warning", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    await openReady(page);
    await runToResult(page);
    await to2d(page);

    const missing = pcaSlider(page, "missing");
    await expect(missing).toHaveAttribute(
      "aria-valuetext",
      "0.1, as in the Variants tab",
    );
    // A move there and back: the result goes, since no result is kept
    // for a value the screen left, and the PCA, live since its Run,
    // starts again by itself on the value set back, with no Run offered
    // (docs/specs/steps/popgen2-pca.md, "The PCA calculated again by
    // itself"). One ArrowLeft moves it one step of the axis of panel.nei,
    // 0.001.
    await missing.focus();
    await missing.press("ArrowLeft");
    await expect(missing).toHaveAttribute("aria-valuetext", "0.099");
    await missing.press("End");
    await expect(tableCaptionOf(page)).toHaveCount(0);
    await expect(run(page)).toHaveCount(0);
    await expect(tableCaptionOf(page)).toContainText(
      "from 548 variants, after the LD pruning",
      {
        timeout: RESULT_TIMEOUT,
      },
    );
    await moveTo(missing, "ArrowLeft", "0.05");
    await expect(tableCaptionOf(page)).toContainText(
      "from 532 variants, after the LD pruning",
      {
        timeout: RESULT_TIMEOUT,
      },
    );
    await expect(axisLabels(page).first()).toHaveText("PC1 (3.58%)");
    const posted = await runsPosted(page);

    // The Variants tab stricter: the PCA reads 0.03, by itself again.
    await tab(page, "Variants").click();
    const rate = histogram(page, "Proportion of missing genotypes");
    await rate.box.fill("0.03");
    await rate.box.press("Enter");
    await tab(page, "PCA").click();
    await expect(missing).toHaveAttribute(
      "aria-valuetext",
      "0.03, as in the Variants tab",
    );
    await expect(missing).toHaveAttribute("max", "0.03");
    await expect(
      shown(page).getByText(
        "The Variants tab keeps at most 0.03, stricter than the 0.05 set here, so the PCA uses 0.03.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(tableCaptionOf(page)).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    expect(await runsPosted(page)).toBe(posted + 1);
    await tab(page, "Variants").click();
    await rate.box.fill("0.1");
    await rate.box.press("Enter");
    await tab(page, "PCA").click();
    await expect(missing).toHaveAttribute("aria-valuetext", "0.05");
    // The key of 0.05 again, whose result was not kept: calculated again
    // by itself.
    await expect(tableCaptionOf(page)).toContainText(
      "from 532 variants, after the LD pruning",
      {
        timeout: RESULT_TIMEOUT,
      },
    );
    expect(await runsPosted(page)).toBe(posted + 2);

    await missing.focus();
    await missing.press("End");
    await expect(missing).toHaveAttribute(
      "aria-valuetext",
      "0.1, as in the Variants tab",
    );
    await expect(tableCaptionOf(page)).toContainText(
      "from 548 variants, after the LD pruning",
      {
        timeout: RESULT_TIMEOUT,
      },
    );
    const maf = pcaSlider(page, "maf");
    await moveTo(maf, "ArrowLeft", "0.9");
    await expect(tableCaptionOf(page)).toContainText(
      "from 510 variants, after the LD pruning",
      {
        timeout: RESULT_TIMEOUT,
      },
    );
    await expect(axisLabels(page).first()).toHaveText("PC1 (3.68%)");

    await maf.focus();
    await maf.press("End");
    await expect(tableCaptionOf(page)).toContainText(
      "from 548 variants, after the LD pruning",
      {
        timeout: RESULT_TIMEOUT,
      },
    );
    await shown(page)
      .locator("label")
      .filter({ hasText: "Prune the variants by linkage disequilibrium (LD)" })
      .click();
    await expect(tableCaptionOf(page)).toContainText("from 1,200 variants.", {
      timeout: RESULT_TIMEOUT,
    });
    await expect(axisLabels(page).first()).toHaveText("PC1 (7.61%)");
    await expect(
      shown(page).getByRole("heading", { level: 3, name: "1 warning" }),
    ).toBeVisible();
    await expect(
      shown(page).getByText(
        /^Warning: No LD pruning was applied for the PCA,/u,
      ),
    ).toContainText(
      "Turn on the LD pruning of the PCA in Parameters, unless such regions are what you are looking for.",
    );
    await expectAxeBothSchemes(page, makeAxeBuilder);
  });

  test("AP10 D2 the slider of the missing data dragged from its end to about 0.05: the value at the release, made stricter; ArrowLeft, changed", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await openReady(page);
    const missing = pcaSlider(page, "missing");
    await expect(missing).toHaveAttribute(
      "aria-valuetext",
      "0.1, as in the Variants tab",
    );
    await trackOf(missing).scrollIntoViewIfNeeded();
    const track = await trackOf(missing).boundingBox();
    if (track === null) throw new Error("no track");
    const y = track.y + track.height / 2;
    // From the thumb at the right end to the middle of the track, 0.05.
    await page.mouse.move(track.x + track.width, y);
    await page.mouse.down();
    await page.mouse.move(track.x + track.width / 2, y, { steps: 12 });
    await page.mouse.up();
    const released = /^0\.0(49|5|51)$/u;
    await expect(missing).toHaveAttribute("aria-valuetext", released);
    await expect(missing).toHaveValue(
      String(Number(await missing.getAttribute("aria-valuetext"))),
    );
    const dragged = await missing.getAttribute("aria-valuetext");
    await missing.focus();
    await missing.press("ArrowLeft");
    const left = (Number(dragged) * 1000 - 1) / 1000;
    await expect(missing).toHaveAttribute("aria-valuetext", String(left));
  });

  test("AP6 D3 the PCoA within 50,000: its title, PC1 (3.68%) and PC2 (3.54%), the warning of the correction with 7.87%, 0.047, 53% and 0.22, and the line under the explained variance; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await openReady(page);
    await choosePcoa(page);
    await runToResult(page);
    await expect(
      shown(page).getByRole("heading", {
        level: 3,
        name: "Principal coordinates of panel.nei",
      }),
    ).toBeVisible();
    const warning = shown(page).getByText(/^Warning: .*Lingoes/u);
    for (const number of ["7.87%", "0.047", "53%", "0.22"]) {
      await expect(warning).toContainText(number);
    }
    const line = shown(page).getByText(
      /^The percentages are of the Kosman distances after Lingoes' correction/u,
    );
    await expect(line).toContainText("added 0.047 to the square");
    await expect(line).toContainText("over all the 198 components of the PCoA");
    await expect(menuButton(page, "the plot of the PCoA")).toBeVisible();
    // Its plots named by the method, for a screen reader.
    if (await givesWebGl(page)) {
      await expect(
        shown(page).getByRole("img", {
          name: "Principal coordinates, PC1, PC2 and PC3",
        }),
      ).toBeVisible({ timeout: RESULT_TIMEOUT });
    }
    await to2d(page, "Principal coordinates, PC1 and PC2");
    await expect(axisLabels(page)).toHaveText(["PC1 (3.68%)", "PC2 (3.54%)"]);
    await expectAxeBothSchemes(page, makeAxeBuilder);
  });

  test("AP6 D3 the downloads by the keyboard alone: the coordinates read back, the table sorted by PC1 in that order, the explained variance, a PNG of the 3D view, and the menu waiting while three.js downloads; axe with a menu open, light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(120_000);
    // The file of the 3D view held back, so that the menu waits.
    let release3d: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release3d = resolve;
    });
    await page.route(/\/pca3d-[^/]*\.js$/u, async (route) => {
      await held;
      await route.continue();
    });
    await openReady(page);
    await runToResult(page);
    const plotMenu = menuButton(page, "the plot of the PCA");
    const webGl = await givesWebGl(page);
    await expect(plotMenu).toHaveAttribute("aria-disabled", "true");
    await expect(plotMenu).toHaveAccessibleDescription(
      "Download once the 3D view is drawn.",
    );
    await plotMenu.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toHaveCount(0);
    release3d();
    if (webGl) {
      await expect(shown(page).getByRole("img", { name: PCA_3D })).toBeVisible({
        timeout: RESULT_TIMEOUT,
      });
    }
    await expect(plotMenu).not.toHaveAttribute("aria-disabled", {
      timeout: RESULT_TIMEOUT,
    });

    const coordinates = await chooseByKeys(page, plotMenu, "Data as CSV", 2);
    expect(coordinates.suggestedFilename()).toBe("panel.pca.coordinates.csv");
    await expect(status(page)).toContainText(
      "Saving panel.pca.coordinates.csv.",
    );
    const lines = (await textOf(coordinates)).split("\n");
    expect(lines[0]).toBe(
      "individual,PC1,PC2,PC3,PC4,PC5,PC6,PC7,PC8,PC9,PC10",
    );
    expect(lines[1]).toMatch(/^s000,-0\.7138853335304419,7\.676473141448964,/u);
    expect(lines).toHaveLength(202);

    const png = await chooseByKeys(page, plotMenu, "Image as PNG", 1);
    expect(png.suggestedFilename()).toBe("panel.pca.png");
    const bytes = await readFile(await png.path());
    expect(bytes.subarray(1, 4).toString("latin1")).toBe("PNG");
    expect(bytes.length).toBeGreaterThan(5_000);

    await plotMenu.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menu")).toBeVisible();
    await expectAxeBothSchemes(page, makeAxeBuilder);
    await page.keyboard.press("Escape");

    const variance = await chooseByKeys(
      page,
      menuButton(page, "the explained variance of the PCA"),
      "Table as CSV",
      0,
    );
    expect(variance.suggestedFilename()).toBe("panel.pca.variance.csv");
    const varianceLines = (await textOf(variance)).split("\n");
    expect(varianceLines[0]).toBe("Component,Explained variance");
    expect(varianceLines[1]).toBe("PC1,3.5476992895181616");

    // Sorted by PC1, up, by a click on its header.
    const grid = individualsGrid(page);
    await grid.getByRole("columnheader", { name: "PC1" }).click();
    const firstRow = grid.getByRole("row").nth(1);
    const firstName =
      (await firstRow.getByRole("rowheader").textContent()) ?? "";
    const table = await chooseByKeys(
      page,
      menuButton(page, "the table of the individuals of the PCA"),
      "Table as CSV",
      0,
    );
    expect(table.suggestedFilename()).toBe("panel.pca.table.csv");
    const rows = (await textOf(table)).trimEnd().split("\n");
    expect(rows[0]).toBe(
      "Individual,Population,PC1,PC2,PC3,PC4,PC5,PC6,PC7,PC8,PC9,PC10",
    );
    expect(rows).toHaveLength(201);
    expect(rows[1]?.split(",")[0]).toBe(firstName);
    const pc1 = rows.slice(1).map((row) => Number(row.split(",")[2]));
    expect(pc1).toEqual(pc1.toSorted((a, b) => a - b));
    // The unclassified as stored, with no population.
    expect(rows.find((row) => row.startsWith("s000,"))).toMatch(
      /^s000,,-0\.7138853335304419,/u,
    );
  });

  test("NU8 R1 the Download… of the explained variance and that of the table of the individuals drawn below their tables, at 1280 and at 320 pixels", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await openReady(page);
    await runToResult(page);
    const variance = shown(page).getByRole("table", {
      name: /^The variance of the individuals explained by each component/u,
    });
    const pairs: readonly (readonly [Locator, Locator])[] = [
      [menuButton(page, "the explained variance of the PCA"), variance],
      [
        menuButton(page, "the table of the individuals of the PCA"),
        individualsGrid(page),
      ],
    ];
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 800 });
      for (const [button, table] of pairs) {
        await expect(table).toBeVisible();
        await expectDrawnBelow(button, table);
      }
    }
  });

  test("AP6 D3 kept drawn: the 3D view turned by a drag, the Variants tab shown and back, the same view; a run that ends while the tab is hidden draws its view when the tab is shown, its loading not said meanwhile", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await recordAnnouncements(page);
    await openHeld(page, "panel.nei");
    test.skip(!(await givesWebGl(page)), "this engine gives no WebGL 2");
    await typeDistance(page, "50000");
    await runHeld(page);
    await tab(page, "Variants").click();
    const view3d = page.waitForResponse(/\/pca3d-[^/]*\.js$/u, {
      timeout: RESULT_TIMEOUT,
    });
    await release(page, "pca");
    await expect
      .poll(
        async () =>
          (await announced(page)).some((text) =>
            text.includes("PCA of panel.nei calculated."),
          ),
        { timeout: 30_000 },
      )
      .toBe(true);
    // three.js downloaded, and the 3D view drawn in the hidden tab.
    await view3d;
    await expect(page.locator("canvas")).toHaveCount(1, {
      timeout: RESULT_TIMEOUT,
    });
    expect(
      (await announced(page)).some((text) =>
        text.includes("Loading the 3D view…"),
      ),
    ).toBe(false);

    await tab(page, "PCA").click();
    const view = shown(page).getByRole("img", { name: PCA_3D });
    await expect(view).toBeVisible({ timeout: RESULT_TIMEOUT });
    const canvas = shown(page).locator("canvas");
    const labels = shown(page).locator(".chart-pca3d-label");
    await expect(labels).toHaveCount(3);

    // Turned by a drag across the view, the only way on this page; the
    // pointer then taken off it, so that no point under it is named.
    await canvas.scrollIntoViewIfNeeded();
    // The pointer off the view, as for the picture after the drag.
    await page.mouse.move(0, 0);
    const unturned = await canvas.screenshot();
    const box = await canvas.boundingBox();
    if (box === null) throw new Error("no box of the 3D view");
    const middle = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(middle.x, middle.y);
    await page.mouse.down();
    await page.mouse.move(middle.x + 120, middle.y + 40, { steps: 10 });
    await page.mouse.up();
    await page.mouse.move(0, 0);
    const before = await canvas.screenshot();
    // The drag turned the view.
    expect(before.equals(unturned)).toBe(false);
    const placesBefore = await labels.evaluateAll((all) =>
      all.map((label) => {
        const style = (label as HTMLElement).style;
        return `${style.left} ${style.top}`;
      }),
    );

    await tab(page, "Variants").click();
    await expect(canvas).toBeHidden();
    // Two frames, by which the browser has told the view its box is gone.
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
    await tab(page, "PCA").click();
    await expect(view).toBeVisible();
    await canvas.scrollIntoViewIfNeeded();
    expect(
      await labels.evaluateAll((all) =>
        all.map((label) => {
          const style = (label as HTMLElement).style;
          return `${style.left} ${style.top}`;
        }),
      ),
    ).toEqual(placesBefore);
    const after = await canvas.screenshot();
    expect(after.equals(before)).toBe(true);
  });

  test("AP6 D3 in a browser without checkVisibility, as Safari before 17.4, a run that ends while the tab is hidden says only that the PCA was calculated, and its 3D view loads unsaid", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.addInitScript(() => {
      Reflect.deleteProperty(Element.prototype, "checkVisibility");
    });
    await recordAnnouncements(page);
    await openHeld(page, "panel.nei");
    await typeDistance(page, "50000");
    await runHeld(page);
    await tab(page, "Variants").click();
    const view3d = page.waitForResponse(/\/pca3d-[^/]*\.js$/u, {
      timeout: RESULT_TIMEOUT,
    });
    await release(page, "pca");
    await expect
      .poll(
        async () =>
          (await announced(page)).some((text) =>
            text.includes("PCA of panel.nei calculated."),
          ),
        { timeout: 30_000 },
      )
      .toBe(true);
    // The 3D view's code arrived while the tab is hidden.
    await view3d;
    expect(
      (await announced(page)).filter((text) => text.includes("3D view")),
    ).toEqual([]);

    await tab(page, "PCA").click();
    await expect(tableCaptionOf(page)).toBeVisible();
  });

  test("AP6 D3 the 3D view that could not be downloaded while the tab is hidden is said when the tab is shown, not before", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.route(/\/pca3d-[^/]*\.js(\?.*)?$/u, (route) => route.abort());
    await recordAnnouncements(page);
    await openHeld(page, "panel.nei");
    await typeDistance(page, "50000");
    await runHeld(page);
    await tab(page, "Variants").click();
    await release(page, "pca");
    // The failure drawn in the hidden tab, its words over the 2D plot.
    // A paragraph, where the status region's text is not.
    const failed = page.locator("p", {
      hasText: /^The 3D view could not be loaded/u,
    });
    await expect(failed).toHaveCount(1, { timeout: RESULT_TIMEOUT });
    expect(
      (await announced(page)).filter((text) =>
        text.includes("The 3D view could not be loaded"),
      ),
    ).toEqual([]);

    await tab(page, "PCA").click();
    await expect
      .poll(
        async () =>
          (await announced(page)).some((text) =>
            text.includes(
              "The 3D view could not be loaded, so the 2D plot is shown in its place.",
            ),
          ),
        { timeout: 10_000 },
      )
      .toBe(true);
  });

  test('AP6 D3 the result\'s code that could not be downloaded: "Loading the result…" while it is asked for, then its words in the tab and the status region with Try again, no error bar; Try again draws the result', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await recordAnnouncements(page);
    await page.goto("popgen2.html");
    await pick(page, "panel.nei");
    // The plots of the Variants tab drawn, their code there. The first
    // file of the result is held, which Try again asks for at another
    // address in Chromium; a file it imports, which popgen.html shares,
    // Chromium would not ask for again until a reload.
    await expect(
      stats(page).getByRole("group", {
        name: "Proportion of missing genotypes",
        exact: true,
      }),
    ).toBeVisible({ timeout: 30_000 });
    const resultsFile = /\/PcaTabResultView-[^/]*\.js(\?.*)?$/u;
    const held: Route[] = [];
    await page.route(resultsFile, (route) => {
      held.push(route);
    });
    await tab(page, "PCA").click();
    await expect(run(page)).toBeEnabled({ timeout: 30_000 });
    await typeDistance(page, "50000");
    await run(page).click();
    await expect(
      shown(page).getByText("Loading the result…", { exact: true }),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });

    for (const route of held) await route.abort();
    await page.unroute(resultsFile);
    const words =
      "The result of the PCA could not be loaded. Press Try again. If it fails again, the site may have been updated since this page was opened: reload the page, open panel.nei again and run the PCA again; what the page has calculated is lost.";
    await expect(shown(page).getByText(words, { exact: true })).toBeVisible();
    await expect
      .poll(
        async () =>
          // The region may say it with what comes in the same pause.
          (await announced(page)).some((text) => text.includes(words)),
        { timeout: 10_000 },
      )
      .toBe(true);
    // The error bar, there from the start, says nothing.
    await expect(page.getByRole("alert")).toHaveText("");

    await shown(page).getByRole("button", { name: "Try again" }).click();
    await expect(
      shown(page).getByRole("heading", { level: 2, name: "PCA" }),
    ).toBeFocused();
    await expect(tableCaptionOf(page)).toBeVisible({ timeout: RESULT_TIMEOUT });
    await expect(shown(page).getByText(words, { exact: true })).toHaveCount(0);
  });

  test("AP6 D3 a file the plots of the Variants tab share with the result fails once while the plots download: the result, with Try again if it is asked, is drawn", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const sharedFile =
      /\/shared~popgen~PopulationsTabView~SectionPlots~PcaTabResultView-[^~/]*\.js(\?.*)?$/u;
    let failed = 0;
    await page.route(sharedFile, async (route) => {
      if (failed === 0) {
        failed += 1;
        await route.abort();
      } else {
        await route.continue();
      }
    });
    await page.goto("popgen2.html");
    await pick(page, "panel.nei");
    // The plots of the Variants tab ask for the file first.
    await expect.poll(() => failed).toBe(1);
    await tab(page, "PCA").click();
    await expect(run(page)).toBeEnabled({ timeout: 30_000 });
    await typeDistance(page, "50000");
    await run(page).click();
    const tryAgain = shown(page).getByRole("button", { name: "Try again" });
    await expect(tableCaptionOf(page).or(tryAgain)).toBeVisible({
      timeout: RESULT_TIMEOUT,
    });
    if (await tryAgain.isVisible()) await tryAgain.click();
    await expect(tableCaptionOf(page)).toBeVisible({ timeout: RESULT_TIMEOUT });
  });

  for (const kind of ["js", "css"] as const) {
    test(`AP6 D3 a file the result imports, shared with popgen.html, fails until Try again is shown, its ${kind === "js" ? "script" : "styles"}: Try again draws the result with its styles`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await page.goto("popgen2.html");
      await pick(page, "panel.nei");
      // A file the first file of the result imports, which a browser
      // keeps the failure of for the life of the page once an import()
      // met it (the review of work package 1 of
      // docs/plans/population-tab.md): it fails until the result shows
      // Try again, both when the tab is first shown, which asks for the
      // code, and when the result is drawn, which asks again.
      const sharedFile = new RegExp(
        `/shared~popgen~PcaTabResultView-[^~/]*\\.${kind}(\\?.*)?$`,
        "u",
      );
      let failing = true;
      let failed = 0;
      await page.route(sharedFile, async (route) => {
        if (failing) {
          failed += 1;
          await route.abort();
        } else {
          await route.continue();
        }
      });
      await tab(page, "PCA").click();
      await expect(run(page)).toBeEnabled({ timeout: 30_000 });
      await typeDistance(page, "50000");
      await run(page).click();
      const tryAgain = shown(page).getByRole("button", { name: "Try again" });
      await expect(tryAgain).toBeVisible({ timeout: RESULT_TIMEOUT });
      expect(failed).toBeGreaterThan(0);
      failing = false;
      await tryAgain.click();
      await expect(tableCaptionOf(page)).toBeVisible({
        timeout: RESULT_TIMEOUT,
      });
      await expect(tryAgain).toHaveCount(0);
      // The styles of the result are in force.
      expect(
        await page.evaluate(() =>
          [...document.styleSheets].some(
            (sheet) =>
              sheet.href?.includes("shared~popgen~PcaTabResultView-") === true,
          ),
        ),
      ).toBe(true);
    });
  }
});
