/**
 * The writing of the filtered variants on the built site
 * (docs/specs/analyses/writeVariants.md and docs/specs/entry.md, "How it
 * is verified"; docs/specs/worker/client.md, "How it is verified"):
 * panel.nei written at 0.05 and saved, the download read; the focus on
 * Save when a write ends with the focus on Write, and the words the
 * status region reads; a file not saved discarded by a change of the
 * threshold, with its notice and Undo; the question before an opening
 * that names it; and a file saved after the worker that made it was
 * ended. axe in each state reached.
 */
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page, Route } from "@playwright/test";
import { init, openVars } from "popnei";

import { expect, test } from "./axe.ts";
import { NUM_INDIVIDUALS, bigVcfPopsCsv, writeBigVcf } from "./bigVcf.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The variants of the VCF of the Stop in the middle of a pass, WS8 D3 of
    e2e/diversity.spec.ts, whose pass lasts seconds. */
const STOP_VCF_VARIANTS = 200_000;

/** The size of panel.nei written with the missing data filter at 0.05,
    which popnei's writeVars gave in node (writeVariants.md). */
const WRITTEN_AT_005 = 250_994;

/** What the step says in place of the size of panel.nei, whose variants
    no pass has counted. */
const NO_SIZE =
  "The size of the file is known once the variants are counted: Count, above.";

/** The words of the notice of the change of the threshold that discarded
    the file. */
const DISCARDED =
  "The missing data filter changed. The written file, not saved, was discarded, and Undo does not bring it back; write it again to save it";

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

async function openVariants(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
}

function stepLink(page: Page, name: string): Locator {
  return page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name });
}

/** The section of the writing. */
function writing(page: Page): Locator {
  return page.getByRole("region", { name: "Writing the filtered variants" });
}

function writeButton(page: Page): Locator {
  return writing(page).getByRole("button", {
    name: "Write the filtered variants as a .nei file",
  });
}

function saveButtons(page: Page): Locator {
  return writing(page).getByRole("button", { name: /^Save / });
}

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

function notice(page: Page): Locator {
  return page.getByRole("region", { name: "Notice" });
}

function threshold(page: Page): Locator {
  return page.getByLabel("Maximum proportion of missing genotypes");
}

/** Picks `file`, a fixture or a path, with the button of the zone
    `region`. */
async function pick(page: Page, region: string, file: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: region })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (
    await chooser
  ).setFiles(file.includes("/") ? file : join(FIXTURES, file));
}

/** Picks panel.nei and waits for its read. */
async function loadPanelNei(page: Page): Promise<void> {
  await pick(page, "Variants file", "panel.nei");
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
}

/** Sets the threshold of the missing data filter to `value`. */
async function setThreshold(page: Page, value: string): Promise<void> {
  await threshold(page).fill(value);
  await threshold(page).press("Enter");
  await expect(threshold(page)).toHaveValue(value);
}

/** Goes to a step by its link in the stepper. */
async function goTo(page: Page, step: string): Promise<void> {
  await stepLink(page, step).click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

/** Makes the calculation worker keep back the files it writes, until
    `releaseWritten`, so that a write stays under way. */
async function holdWritten(page: Page): Promise<void> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown) => void;
      heldWritten: unknown[];
      releaseWritten: () => void;
    };
    const post = scope.postMessage.bind(scope);
    scope.heldWritten = [];
    scope.releaseWritten = () => {
      for (const message of scope.heldWritten) post(message);
      scope.heldWritten = [];
      scope.postMessage = post;
    };
    scope.postMessage = (message) => {
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind === "written") scope.heldWritten.push(message);
      else post(message);
    };
  });
}

/** Posts the files the calculation worker kept back. */
async function releaseWritten(page: Page): Promise<void> {
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    (globalThis as unknown as { releaseWritten: () => void }).releaseWritten();
  });
}

test("VS5 D3 panel.nei at 0.05 written and saved: the download panel.filtered.nei of 250,994 bytes, and the step then says it was handed to the browser, with no second Save, and axe", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  await openVariants(page);
  await expect(writing(page)).toHaveCount(0);
  await loadPanelNei(page);
  await expect(writeButton(page)).toHaveAccessibleDescription(NO_SIZE);
  await expectNoViolations(makeAxeBuilder);

  await setThreshold(page, "0.05");
  await writeButton(page).click();
  const save = writing(page).getByRole("button", {
    name: "Save panel.filtered.nei, 251 KB",
  });
  await expect(save).toBeVisible();
  await expect(writeButton(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  const download = page.waitForEvent("download");
  await save.click();
  const file = await download;
  expect(file.suggestedFilename()).toBe("panel.filtered.nei");
  const path = testInfo.outputPath("panel.filtered.nei");
  await file.saveAs(path);
  expect((await stat(path)).size).toBe(WRITTEN_AT_005);

  await expect(
    writing(page).getByText(
      "panel.filtered.nei, 251 KB, was handed to the browser to save. To save it again, write it again.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(saveButtons(page)).toHaveCount(0);
  // The write counted the variants the filter keeps, so the size is
  // known: 1,152 variants of 200 individuals at one byte each.
  await expect(writeButton(page)).toHaveAccessibleDescription(
    "About 230 KB: 1,152 variants of 200 individuals.",
  );
  await expectNoViolations(makeAxeBuilder);
});

test("VS5 D3 with the focus on Write, the write ends with the focus on Save, the bar and Stop meanwhile, and the status region says the file is written, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await setThreshold(page, "0.05");
  await holdWritten(page);

  // The keyboard alone: from the threshold, the next stop is Write.
  await threshold(page).focus();
  await page.keyboard.press("Tab");
  await expect(writeButton(page)).toBeFocused();
  await page.keyboard.press("Enter");

  const stop = writing(page).getByRole("button", { name: "Stop" });
  await expect(stop).toBeFocused();
  await expect(
    writing(page).getByRole("progressbar", {
      name: "Writing panel.filtered.nei",
    }),
  ).toBeVisible();
  await expect(
    writing(page).getByText(
      /^Writing panel\.filtered\.nei · (\d+% · )?\d:\d\d$/,
    ),
  ).toBeVisible();
  // After the words of the read, when they come within the pause of the
  // announcer.
  await expect(status(page)).toHaveText(/Writing panel\.filtered\.nei\.$/);
  await expectNoViolations(makeAxeBuilder);

  await releaseWritten(page);
  const save = writing(page).getByRole("button", {
    name: "Save panel.filtered.nei, 251 KB",
  });
  await expect(save).toBeFocused();
  await expect(status(page)).toHaveText(
    "panel.filtered.nei is written, 251 KB; Save it in the Variants step.",
  );
  await expectNoViolations(makeAxeBuilder);

  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  expect((await download).suggestedFilename()).toBe("panel.filtered.nei");
  // The button that was Save is Write again, and keeps the focus.
  await expect(writeButton(page)).toBeFocused();
});

test("VS5 D3 Stop of a write under way gives Write back with the focus on it and no Save, and the status region says the writing stopped, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await holdWritten(page);
  await writeButton(page).click();
  const stop = writing(page).getByRole("button", { name: "Stop" });
  await expect(stop).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(writeButton(page)).toBeFocused();
  await expect(saveButtons(page)).toHaveCount(0);
  await expect(writing(page).getByRole("progressbar")).toHaveCount(0);
  await expect(status(page)).toHaveText(/Writing the file: stopped\.$/);
  await expectNoViolations(makeAxeBuilder);
});

test("VS5 D3 a change of the threshold with the file not saved discards it: the notice says so, and its Undo brings the threshold back and no Save, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await setThreshold(page, "0.05");
  await writeButton(page).click();
  await expect(saveButtons(page)).toHaveCount(1);

  await setThreshold(page, "0.06");
  const alert = notice(page).getByRole("alertdialog", { name: DISCARDED });
  await expect(alert).toBeVisible();
  await expect(saveButtons(page)).toHaveCount(0);
  await expect(writeButton(page)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await alert.getByRole("button", { name: "Undo" }).click();
  await expect(threshold(page)).toHaveValue("0.05");
  await expect(saveButtons(page)).toHaveCount(0);
  await expect(writeButton(page)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("VS5 D3 Open project… with the file written and not saved asks first, and the question names the file, and axe", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  await openVariants(page);
  await loadPanelNei(page);
  // A project file saved before the write, so that nothing but the file
  // written makes the page ask.
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save project" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Save the project" });
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const saved = testInfo.outputPath("panel.popnei.json");
  await (await download).saveAs(saved);
  await writeButton(page).click();
  await expect(saveButtons(page)).toHaveCount(1);

  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Open project…" })
    .click();
  await (await chooser).setFiles(saved);
  const question = page.getByRole("alertdialog", {
    name: "Open panel.popnei.json?",
  });
  await expect(question).toHaveAccessibleDescription(
    "It replaces the project on the page, and an opening cannot be undone. To keep the project on the page, press Keep the current project and save it first. panel.filtered.nei, written and not saved, will be discarded.",
  );
  await expectNoViolations(makeAxeBuilder);
  await question
    .getByRole("button", { name: "Keep the current project" })
    .click();
  await expect(question).toHaveCount(0);
  await expect(saveButtons(page)).toHaveCount(1);
});

test("VS5 D4 a file written from the big VCF is saved after the worker that made it was ended, and popnei in node opens it with its 1,000 individuals", async ({
  page,
}, testInfo) => {
  // The VCF of WS8 D3, a pass over which lasts 3.5 s in WebKit on the
  // owner's Mac; the write, the run and the file read back in node take
  // well over the default time of a test.
  test.setTimeout(300_000);
  const vcf = testInfo.outputPath("stop.vcf.gz");
  await writeBigVcf(vcf, STOP_VCF_VARIANTS);
  const pops = testInfo.outputPath("stop_pops.csv");
  await writeFile(pops, bigVcfPopsCsv());

  await openVariants(page);
  await pick(page, "Variants file", vcf);
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  // The calculation worker that writes the file, whose end is awaited
  // below.
  const maker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (maker === undefined) throw new Error("no calculation worker");
  let makerEnded = false;
  maker.on("close", () => {
    makerEnded = true;
  });
  await writeButton(page).click();
  const save = writing(page).getByRole("button", {
    name: /^Save stop\.filtered\.nei, /,
  });
  await expect(save).toBeVisible({ timeout: 120_000 });

  // The diversity run and stopped while its bar is below 100%, which ends
  // the worker that made the file.
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", pops);
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: "pop", exact: true }).click();
  await goTo(page, "Analyses");
  const panel = page.getByRole("region", { name: "Diversity" });
  await panel.getByRole("button", { name: "Run" }).click();
  const bars = panel.getByRole("progressbar", {
    name: "Calculating the diversity",
  });
  await expect
    .poll(
      async () => {
        const shares = await bars.evaluateAll((els) =>
          els.map((el) => el.getAttribute("aria-valuetext")),
        );
        return shares.some(
          (v) => v !== null && /^\d+%$/.test(v) && parseInt(v, 10) < 100,
        );
      },
      { timeout: 60_000, intervals: [20] },
    )
    .toBe(true);
  // The wasm held back from the worker the stop starts, so that no worker
  // runs while the file is saved.
  const held: Route[] = [];
  await page.route("**/*.wasm", (route) => {
    held.push(route);
  });
  await panel.getByRole("button", { name: "Stop" }).click();
  await expect(panel.getByRole("button", { name: "Run" })).toBeVisible();
  await expect.poll(() => makerEnded).toBe(true);

  await goTo(page, "Variants");
  const download = page.waitForEvent("download", { timeout: 120_000 });
  await save.click();
  const path = testInfo.outputPath("stop.filtered.nei");
  await (await download).saveAs(path);
  for (const route of held) await route.continue();

  await init();
  const variants = openVars(new Uint8Array(await readFile(path)));
  expect(variants.individuals.length).toBe(NUM_INDIVIDUALS);
});
