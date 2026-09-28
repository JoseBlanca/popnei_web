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
import { gunzipSync } from "node:zlib";

import type { Locator, Page, Route } from "@playwright/test";
import { init, openVars, writeVars } from "popnei";

import { expect, test } from "./axe.ts";
import { NUM_INDIVIDUALS, bigVcfPopsCsv, writeBigVcf } from "./bigVcf.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The variants of the VCF of the Stop in the middle of a pass, WS8 D3 of
    e2e/diversity.spec.ts, whose pass lasts seconds. */
const STOP_VCF_VARIANTS = 200_000;

/** The size of panel.nei written with the missing data filter at 0.05,
    which the writeVars of popnei's js-v0.1.0-dev.3 gave in node
    (writeVariants.md, runner.md). */
const WRITTEN_AT_005 = 251_074;

/** What the step says in place of the size of panel.nei, whose variants
    no pass has counted. */
const NO_SIZE =
  "The size of the file is known once the variants are counted: Count, above.";

/** The words of the notice of the change of the threshold that discarded
    the file. */
const DISCARDED =
  "The filter of the variants by missing data changed. The written file, not saved, was discarded, and Undo does not bring it back; write it again to save it";

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

/** Posts the files the calculation worker kept back, once the call
    that asks for it has returned: a refusal of the write makes the page
    start a new calculation worker at once, and WebKit ended the call to
    the old one before it could answer, "Target page, context or browser
    has been closed", in 10 of 20 runs of the flow of the refusal. */
async function releaseWritten(page: Page): Promise<void> {
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    setTimeout(() => {
      (
        globalThis as unknown as { releaseWritten: () => void }
      ).releaseWritten();
    }, 0);
  });
}

test("IP1 D2 the written files of dev.3 on the screen, VS5 D3 panel.nei at 0.05 written and saved: the download panel.filtered.nei of 251,074 bytes, and the step then says it was handed to the browser, with no second Save, and axe", async ({
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
  // The bytes popnei's writeVars gives in node for panel.nei at 0.05, as
  // the runner's test has them, and not only a file of their size.
  await init();
  const variants = openVars(
    new Uint8Array(await readFile(join(FIXTURES, "panel.nei"))),
  );
  variants.filterByMissingData(0.05);
  const inNode = writeVars(variants).bytes;
  expect(Buffer.compare(await readFile(path), inNode)).toBe(0);
  await expect(status(page)).toHaveText(
    "panel.filtered.nei was handed to the browser to save.",
  );

  await expect(
    writing(page).getByText(
      "panel.filtered.nei, 251 KB, was handed to the browser to save. To save it again, write it again.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(saveButtons(page)).toHaveCount(0);
  // Write, with no estimate beside it, so that the size written is the
  // one size of the section, as the owner decided at stop A on 27
  // September 2026.
  await expect(writeButton(page)).toBeEnabled();
  await expect(writeButton(page)).toHaveAccessibleDescription("");
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

  // The keyboard alone: from the threshold, the switches of the three
  // filters that are off, the Count, each list of individuals with its
  // two buttons, the button of the statistics of each individual, the
  // switches of the two thresholds of the individuals, and then Write.
  await threshold(page).focus();
  for (let press = 0; press < 14; press++) {
    await page.keyboard.press("Tab");
  }
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
    writing(page).getByText(/^Writing panel\.filtered\.nei · \d+% · 0:0[1-9]$/),
  ).toBeVisible({ timeout: 5000 });
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

test("VS5 D3 back at the Variants step, the line of a write under way gives the time since the write started from its first drawing, never 0:00", async ({
  page,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await holdWritten(page);
  await writeButton(page).click();
  const line = writing(page).getByText(/^Writing panel\.filtered\.nei · /);
  await expect(line).toHaveText(/ · 0:0[2-9]$/, { timeout: 5000 });

  await goTo(page, "Individuals");
  // Every text of the line from the moment the section is drawn again.
  await page.evaluate(() => {
    const seen: string[] = [];
    (globalThis as unknown as { seenLines: string[] }).seenLines = seen;
    new MutationObserver(() => {
      for (const p of document.querySelectorAll("main p")) {
        const text = p.textContent;
        if (text.startsWith("Writing panel.filtered.nei")) seen.push(text);
      }
    }).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
  await goTo(page, "Variants");
  await expect(line).toHaveText(/ · 0:0[2-9]$/);
  const seen = await page.evaluate(
    () => (globalThis as unknown as { seenLines: string[] }).seenLines,
  );
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.filter((text) => text.endsWith(" 0:00"))).toEqual([]);
});

/** Makes the calculation worker keep back the results of its
    calculations, until `releaseResults`. */
async function holdResults(page: Page): Promise<void> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
      heldResults: [unknown, Transferable[] | undefined][];
      releaseResults: () => void;
    };
    const post = scope.postMessage.bind(scope);
    scope.heldResults = [];
    scope.releaseResults = () => {
      scope.postMessage = post;
      for (const [message, transfer] of scope.heldResults) {
        post(message, transfer);
      }
      scope.heldResults = [];
    };
    scope.postMessage = (message, transfer) => {
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind === "result") scope.heldResults.push([message, transfer]);
      else post(message, transfer);
    };
  });
}

/** Posts the results the calculation worker kept back. */
async function releaseResults(page: Page): Promise<void> {
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    (globalThis as unknown as { releaseResults: () => void }).releaseResults();
  });
}

/** Saves the project of the page, with panel.nei loaded, as a project
    file whose filters of individuals are `individualFilters`, and opens
    it; then picks panel.nei again, as the page asks. */
async function openWithIndividualFilters(
  page: Page,
  folder: string,
  individualFilters: readonly object[],
): Promise<void> {
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save project" })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("dialog", { name: "Save the project" })
    .getByRole("button", { name: "Save", exact: true })
    .click();
  const saved = join(folder, "panel.popnei.json");
  await (await download).saveAs(saved);
  const file = JSON.parse(await readFile(saved, "utf8")) as Record<
    string,
    unknown
  >;
  const changed = join(folder, "filtered.popnei.json");
  await writeFile(
    changed,
    JSON.stringify({ ...file, individualFilters }, null, 2),
  );
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Open project…" })
    .click();
  await (await chooser).setFiles(changed);
  await loadPanelNei(page);
}

test("VS5 D3 with the focus on Stop of a write that waits for the statistics, a threshold of individuals that keeps none locks Write and the focus moves to the heading of the section, and axe", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  await openVariants(page);
  await loadPanelNei(page);
  // Every individual of panel.nei has an observed heterozygosity above
  // 0.3, so a threshold of 0.1 keeps none of them.
  await openWithIndividualFilters(page, testInfo.outputPath(), [
    { kind: "obs_het", maxAllowedObsHet: 0.1 },
  ]);
  await holdResults(page);
  await writeButton(page).click();
  const stop = writing(page).getByRole("button", { name: "Stop" });
  await expect(stop).toBeFocused();
  await expect(
    writing(page).getByRole("progressbar", {
      name: "Calculating the statistics of each individual",
    }),
  ).toBeVisible();

  await releaseResults(page);
  await expect(writeButton(page)).toBeDisabled();
  await expect(writeButton(page)).toHaveAccessibleDescription(
    "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them.",
  );
  await expect(
    writing(page).getByRole("heading", {
      name: "Writing the filtered variants",
    }),
  ).toBeFocused();
  await expect(status(page)).toHaveText(
    /The file was not written\. The filters of individuals keep none of the 200 individuals of panel\.nei\. Loosen them in the Variants step\.$/,
  );
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

  await expect(status(page)).toHaveText(
    /panel\.filtered\.nei is written, 251 KB; Save it in the Variants step\.$/,
  );

  await setThreshold(page, "0.06");
  const alert = notice(page).getByRole("alertdialog", { name: DISCARDED });
  await expect(alert).toBeVisible();
  // Its words "Save it in the Variants step" no longer hold.
  await expect(status(page)).toHaveText("");
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
    "It replaces the project on the page, and an opening cannot be undone, and panel.filtered.nei, written and not saved, will be discarded. To keep them, press Keep the current project, then save the project with Save project and panel.filtered.nei in the Variants step.",
  );
  await expectNoViolations(makeAxeBuilder);
  await question
    .getByRole("button", { name: "Keep the current project" })
    .click();
  await expect(question).toHaveCount(0);
  await expect(saveButtons(page)).toHaveCount(1);
});

/** Reloads the page, and gives the type of the dialog the browser
    raised before it, "beforeunload", or "none". */
async function leave(page: Page): Promise<string> {
  let raised = "none";
  page.once("dialog", (dialog) => {
    raised = dialog.type();
    // Playwright may have accepted it already, when the reload goes on.
    dialog.accept().catch(() => undefined);
  });
  await page.reload();
  return raised;
}

/** Writes the file and saves it, which records the variants of the file
    into the project, then saves the project and writes the file again,
    so that the project is as saved and only the file is not. */
async function writeAfterSavingTheProject(page: Page): Promise<void> {
  await writeButton(page).click();
  const file = page.waitForEvent("download");
  await saveButtons(page).click();
  await file;
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save project" })
    .click();
  const project = page.waitForEvent("download");
  await page
    .getByRole("dialog", { name: "Save the project" })
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await project;
  await writeButton(page).click();
  await expect(saveButtons(page)).toHaveCount(1);
}

test("VS5 D3 with the project saved, leaving the page while a written file is not saved raises the browser's question, and after its Save none", async ({
  page,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await writeAfterSavingTheProject(page);

  expect(await leave(page)).toBe("beforeunload");

  await openVariants(page);
  await loadPanelNei(page);
  await writeAfterSavingTheProject(page);
  const download = page.waitForEvent("download");
  await saveButtons(page).click();
  await download;
  await expect(saveButtons(page)).toHaveCount(0);

  expect(await leave(page)).toBe("none");
});

test("VS5 D3 a VCF with no variant that passed, read with only those, written: the words of a file with none that passed, and no Save, and axe", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  // The variants of panel.vcf.gz, each with LowQual in its FILTER column.
  const text = gunzipSync(await readFile(join(FIXTURES, "panel.vcf.gz")))
    .toString("utf8")
    .replaceAll("\tPASS\t", "\tLowQual\t");
  const vcf = testInfo.outputPath("nopass.vcf");
  await writeFile(vcf, text);

  await openVariants(page);
  await pick(page, "Variants file", vcf);
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  await writeButton(page).click();
  await expect(
    writing(page).getByText(
      'nopass.vcf has no variant with PASS or . in its FILTER column, and it was read with only those, so there is nothing to write. Untick "Only the variants with PASS or . in the FILTER column" and read the file again.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(writing(page).getByRole("button")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS5 D3 Open project… while only a write is under way names the writing in its question, and axe", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  await openVariants(page);
  await loadPanelNei(page);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Save project" })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("dialog", { name: "Save the project" })
    .getByRole("button", { name: "Save", exact: true })
    .click();
  const saved = testInfo.outputPath("panel.popnei.json");
  await (await download).saveAs(saved);
  await holdWritten(page);
  await writeButton(page).click();
  await expect(
    writing(page).getByRole("button", { name: "Stop" }),
  ).toBeVisible();

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
    "It replaces the project on the page, and an opening cannot be undone. To keep the project on the page, press Keep the current project and save it first. The writing of panel.filtered.nei will be stopped.",
  );
  await expectNoViolations(makeAxeBuilder);
});

/** What the calculation worker does with the next file it writes:
    posts it with the counts of a pass that kept `numVars` variants, of
    the missing data filter, in place of its own; posts a crash in its
    place; or posts popnei's refusal `message` in its place. */
type WrittenAs =
  | { readonly kind: "counted"; readonly numVars: number }
  | { readonly kind: "crashed" }
  | { readonly kind: "refused"; readonly message: string };

/** Makes the calculation worker post the files it writes as `as` says,
    from now until it is called again. */
async function writtenAs(page: Page, as: WrittenAs): Promise<void> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate((given) => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
      writtenAs?: WrittenAs;
    };
    const first = scope.writtenAs === undefined;
    scope.writtenAs = given;
    if (!first) return;
    const post = scope.postMessage.bind(scope);
    scope.postMessage = (message, transfer) => {
      const as = scope.writtenAs;
      const written =
        typeof message === "object" &&
        message !== null &&
        "kind" in message &&
        message.kind === "written";
      if (!written || as === undefined) {
        post(message, transfer);
        return;
      }
      const { id, key, result } = message as unknown as {
        id: number;
        key: string;
        result: Record<string, unknown>;
      };
      switch (as.kind) {
        case "counted":
          post({
            kind: "written",
            id,
            key,
            result: {
              ...result,
              passStats: {
                numVars: as.numVars,
                filtering: {
                  missing_data: {
                    varsProcessed: as.numVars + 1000,
                    varsKept: as.numVars,
                  },
                },
              },
            },
          });
          break;
        case "crashed":
          post({ kind: "crashed", message: "a crash made by the test" });
          break;
        case "refused":
          post({ kind: "refused", id, message: as.message });
          break;
      }
    };
  }, as);
}

/** Writes the file, which the worker counts as `numVars` variants kept,
    and saves it, so that the step offers Write with the size of those
    variants. */
async function writeAndSaveCounted(page: Page, numVars: number): Promise<void> {
  await writtenAs(page, { kind: "counted", numVars });
  await writeButton(page).click();
  const download = page.waitForEvent("download");
  await saveButtons(page).click();
  await download;
}

test("VS5 D3 counts of 3,000,000 variants of 200 individuals warn of the memory above Write, and of 8,000,000 disable Write with the words of a file too large, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await writeAndSaveCounted(page, 3_000_000);
  await expect(
    writing(page).getByText(
      "Warning: A file of about 720.0 MB may need about six times that in the memory of this tab while it is written, and a browser may close a tab that asks for too much, losing the work since the project was last saved. On a phone or a tablet, the write fails with far smaller files. Save the project first. To write a smaller file, remove variants or individuals with the filters; to write any size, use popnei in Python.",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  // Saved, Write has no estimate beside it.
  await expect(writeButton(page)).toBeEnabled();
  await expect(writeButton(page)).toHaveAccessibleDescription("");
  await expectNoViolations(makeAxeBuilder);

  // New filters, whose counts the next write gives.
  await setThreshold(page, "0.06");
  await writeAndSaveCounted(page, 8_000_000);
  await expect(writeButton(page)).toBeDisabled();
  await expect(writeButton(page)).toHaveAccessibleDescription(
    "A file of about 1.9 GB cannot be written in a browser tab: popnei needs more than twice the file in its memory while it writes it, and a tab gives popnei at most 4 GB. Remove variants or individuals with the filters, or write the file with popnei in Python.",
  );
  await expect(writing(page).getByText(/^Warning:/)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("VS5 D3 before a Count, a file whose variants make a bound of 1.8 GB or more refuses Write and asks for the Count, which gives Write back, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  // A write that the worker counts as 8,000,000 variants kept of
  // 8,001,000 makes the step take the file for one of 8,001,000
  // variants.
  await writeAndSaveCounted(page, 8_000_000);
  // New filters, not counted: the variants of the file are a bound,
  // 8,001,000 of 240 bytes, 1,920,240,000 bytes.
  await setThreshold(page, "0.06");
  await expect(writeButton(page)).toBeDisabled();
  await expect(writeButton(page)).toHaveAccessibleDescription(
    "A file of at most about 1.9 GB may be too large to be written in a browser tab. Count the variants first, above.",
  );
  await expect(writing(page).getByText(/^Warning:/)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  // The Count gives the variants kept, and Write back with their size.
  await page
    .getByRole("button", { name: "Count the variants each filter keeps" })
    .click();
  await expect(writeButton(page)).toBeEnabled();
  await expect(writeButton(page)).toHaveAccessibleDescription(
    /^About .*: [\d,]+ variants of 200 individuals\.$/u,
  );
});

test("VS5 D3 a write whose worker stopped shows its error and offers Write again, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await writtenAs(page, { kind: "crashed" });
  await writeButton(page).click();
  await expect(
    writing(page).getByText(
      "The writing stopped unexpectedly, perhaps because the file did not fit in the memory of this tab. Remove variants or individuals with the filters and write it again, or write the file with popnei in Python.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(writeButton(page)).toBeEnabled();
  await expectNoViolations(makeAxeBuilder);
});

test("VS5 D3 with the focus on Stop, popnei's refusal of the write shows its error, offers no Write, and the focus moves to the heading of the section, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  // The refusal in place of the file, held back until Stop has the focus.
  await writtenAs(page, { kind: "refused", message: "memory could not grow." });
  await holdWritten(page);
  await writeButton(page).click();
  await expect(
    writing(page).getByRole("button", { name: "Stop" }),
  ).toBeFocused();

  await releaseWritten(page);
  await expect(
    writing(page).getByText(
      'panel.filtered.nei could not be written: popnei stopped with "memory could not grow". The file may not fit in the memory of this tab: remove variants or individuals with the filters and write it again, or write the file with popnei in Python. If the message names a line of the VCF, correct the file, or fetch it again, and load it again.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(writing(page).getByRole("button")).toHaveCount(0);
  await expect(
    writing(page).getByRole("heading", {
      name: "Writing the filtered variants",
    }),
  ).toBeFocused();
  await expectNoViolations(makeAxeBuilder);
});

test("VS5 D3 a write asked just after a Stop waits for the variants file to be opened again, with a bar of no value, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openVariants(page);
  await loadPanelNei(page);
  await holdWritten(page);
  await writeButton(page).click();
  // The wasm of the worker the stop starts is held back, so that it
  // does not open the file again while the line is read.
  const held: Route[] = [];
  await page.route("**/*.wasm", (route) => {
    held.push(route);
  });
  await writing(page).getByRole("button", { name: "Stop" }).click();
  await writeButton(page).click();
  await expect(
    writing(page).getByText(
      /^Waiting for panel\.nei to be opened again, then writing panel\.filtered\.nei · 0:0\d$/,
    ),
  ).toBeVisible();
  const bar = writing(page).getByRole("progressbar", {
    name: "Writing panel.filtered.nei",
  });
  await expect(bar).toBeVisible();
  await expect(bar).not.toHaveAttribute("aria-valuenow");
  await expectNoViolations(makeAxeBuilder);

  for (const route of held) await route.continue();
  await page.unroute("**/*.wasm");
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
