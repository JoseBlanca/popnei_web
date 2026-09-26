/**
 * Save project, Open project… and the question before the page is left,
 * on the built site (docs/specs/shell.md, "Saving", "Opening" and "How it
 * is checked"; docs/specs/entry.md, "The saving"): the dialog of Save and
 * its download, the question before leaving after a pick and not after a
 * Save, a project file refused in a dialog, the question before an
 * opening, the Variants step after an opening with the file it asks for
 * and the warning of the identity, the Save of the error bar, and the
 * comparison under the diversity's table, with axe in each state.
 */
import { open as openFile, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Download, Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The largest project file the page reads, 64 MB. */
const MAX_PROJECT_FILE_BYTES = 64 * 1024 * 1024;

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

async function openPopgen(page: Page, hash = "#variants"): Promise<void> {
  await page.goto(`popgen.html${hash}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

function header(page: Page): Locator {
  return page.getByRole("banner");
}

function saveButton(page: Page): Locator {
  return header(page).getByRole("button", { name: "Save project" });
}

function openButton(page: Page): Locator {
  return header(page).getByRole("button", { name: "Open project…" });
}

function stepLink(page: Page, name: string): Locator {
  return page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name });
}

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

function threshold(page: Page): Locator {
  return page.getByLabel("Maximum proportion of missing genotypes");
}

/** Picks the fixture `fixture` with the button of the zone `region`. */
async function pick(
  page: Page,
  region: string,
  fixture: string,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: region })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(join(FIXTURES, fixture));
}

/** Picks panel.nei and waits for its read. */
async function loadPanelNei(page: Page): Promise<void> {
  await pick(page, "Variants file", "panel.nei");
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
}

/** Goes to a step by its link in the stepper. */
async function goTo(page: Page, step: string): Promise<void> {
  await stepLink(page, step).click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

/** Loads the variants file `variants` and panel_pops.csv, chooses the
    column popcat, and stays at the Individuals step. */
async function loadWithPopulations(
  page: Page,
  variants: string,
): Promise<void> {
  await pick(page, "Variants file", variants);
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", "panel_pops.csv");
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: "popcat", exact: true }).click();
  await expect(stepLink(page, "Individuals")).toHaveAccessibleName(
    "Individuals, Done",
  );
}

/** Sets the threshold of the missing data filter to `value`. */
async function setThreshold(page: Page, value: string): Promise<void> {
  await threshold(page).fill(value);
  await threshold(page).press("Enter");
  await expect(threshold(page)).toHaveValue(value);
}

/** Saves the project with Save project, under the name the dialog
    proposes, and gives the download. */
async function saveProject(page: Page): Promise<Download> {
  await saveButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Save the project" });
  await expect(dialog).toBeVisible();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  return download;
}

/** Saves the project and keeps the file under the test's output folder,
    with the name the page gave it; gives its path. */
async function saveProjectFile(page: Page, folder: string): Promise<string> {
  const download = await saveProject(page);
  const path = join(folder, download.suggestedFilename());
  await download.saveAs(path);
  return path;
}

/** Picks the file `file` with Open project…. */
async function openProject(
  page: Page,
  file: string | { name: string; text: string },
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await openButton(page).click();
  await (
    await chooser
  ).setFiles(
    typeof file === "string"
      ? file
      : {
          name: file.name,
          mimeType: "text/plain",
          buffer: Buffer.from(file.text),
        },
  );
}

/** The name of the element that has the focus in the next frame:
    "body" when the focus is lost to the page. */
async function focusedInNextFrame(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        requestAnimationFrame(() => {
          const active = document.activeElement;
          resolve(
            active === null || active === document.body
              ? "body"
              : active.textContent,
          );
        });
      }),
  );
}

/** Reloads the page, and gives the kind of the dialog the browser raised
    before leaving it, accepted, or "none". */
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

test("WS9 D3 a page just opened is left with no question, and after a pick of a file leaving it raises the browser's question", async ({
  page,
}) => {
  await openPopgen(page);
  // A click, since a browser asks only on a page the user has used.
  await page.getByRole("heading", { level: 1, name: "Variants" }).click();
  expect(await leave(page)).toBe("none");

  await loadPanelNei(page);

  expect(await leave(page)).toBe("beforeunload");
});

test("WS9 D3 Save project opens its dialog with panel.popnei.json selected, Save downloads it, the status region says so and the focus is back on Save project, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPopgen(page);
  await loadPanelNei(page);

  await saveButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Save the project" });
  const field = dialog.getByRole("textbox", { name: "File name" });
  await expect(field).toHaveValue("panel.popnei.json");
  await expect(field).toBeFocused();
  // The whole name selected, so that typing replaces it.
  expect(
    await field.evaluate((input: HTMLInputElement) => [
      input.selectionStart,
      input.selectionEnd,
    ]),
  ).toEqual([0, "panel.popnei.json".length]);
  await expectNoViolations(makeAxeBuilder);

  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();

  expect((await download).suggestedFilename()).toBe("panel.popnei.json");
  await expect(dialog).toHaveCount(0);
  await expect(status(page)).toHaveText(
    "panel.popnei.json was handed to the browser to download.",
  );
  await expect(saveButton(page)).toBeFocused();
});

test("WS9 D3 a name typed as run1 downloads run1.popnei.json, Cancel and Escape download nothing, and an empty name keeps Save disabled with its reason", async ({
  page,
}) => {
  await openPopgen(page);
  await loadPanelNei(page);
  const downloads: string[] = [];
  page.on("download", (download) => {
    downloads.push(download.suggestedFilename());
  });
  const dialog = page.getByRole("dialog", { name: "Save the project" });
  const field = dialog.getByRole("textbox", { name: "File name" });
  const save = dialog.getByRole("button", { name: "Save", exact: true });

  await saveButton(page).click();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(saveButton(page)).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(field).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(saveButton(page)).toBeFocused();

  await page.keyboard.press("Enter");
  await page.keyboard.press("Backspace");
  await expect(save).toBeDisabled();
  await expect(save).toHaveAccessibleDescription("Give the file a name.");
  await page.keyboard.type("run1");
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");

  expect((await download).suggestedFilename()).toBe("run1.popnei.json");
  expect(downloads).toEqual(["run1.popnei.json"]);
});

test("WS9 D3 once the dialog of Save has closed, the page takes a click again, with reduced motion as without", async ({
  page,
}) => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    await openPopgen(page);
    await loadPanelNei(page);
    await saveButton(page).click();
    const dialog = page.getByRole("dialog", { name: "Save the project" });
    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await download;
    await expect(dialog).toHaveCount(0);

    await stepLink(page, "Individuals").click({ timeout: 2000 });
    await expect(
      page.getByRole("heading", { level: 1, name: "Individuals" }),
    ).toBeVisible();
  }
});

test("WS9 D3 in the dialog of Save, a click into the field of the name puts the cursor there, and the Tab key back into it selects the name", async ({
  page,
}) => {
  await openPopgen(page);
  await loadPanelNei(page);

  await saveButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Save the project" });
  const field = dialog.getByRole("textbox", { name: "File name" });
  await expect(field).toBeFocused();
  // From Cancel, the last of the dialog, the Tab key goes round to the
  // field, and the browser selects its text, so typing replaces it.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(field).toBeFocused();
  await page.keyboard.type("run1");
  await expect(field).toHaveValue("run1");

  // A click after the first letter puts the cursor there.
  await dialog.getByRole("heading", { name: "Save the project" }).click();
  const box = await field.boundingBox();
  if (box === null) throw new Error("the field is not laid out");
  await page.mouse.click(box.x + box.width - 4, box.y + box.height / 2);
  await page.keyboard.type("b");
  await expect(field).toHaveValue("run1b");
});

test("WS9 D3 inside the dialog of Save the keyboard's Undo does nothing to the project", async ({
  page,
}) => {
  await openPopgen(page);
  await loadPanelNei(page);
  await setThreshold(page, "0.05");

  await saveButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Save the project" });
  await expect(dialog.getByRole("textbox")).toBeFocused();
  // Away from the text of the field, on the Save button.
  await page.keyboard.press("Tab");
  await expect(dialog.getByRole("button", { name: "Save" })).toBeFocused();
  await page.keyboard.press("ControlOrMeta+z");
  await page.keyboard.press("Escape");

  await expect(threshold(page)).toHaveValue("0.05");
  await expect(
    header(page).getByRole("button", { name: "Redo", exact: true }),
  ).toBeDisabled();
});

test("WS9 D3 in the field of the name of Save, the keyboard's Undo takes back the typing of that field alone, and not that of the threshold behind the dialog", async ({
  page,
}) => {
  await openPopgen(page);
  await loadPanelNei(page);
  await setThreshold(page, "0.05");

  await saveButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Save the project" });
  const field = dialog.getByRole("textbox", { name: "File name" });
  await expect(field).toBeFocused();
  await page.keyboard.type("x");
  for (let press = 0; press < 3; press++) {
    await page.keyboard.press("ControlOrMeta+z");
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await expect(threshold(page)).toHaveValue("0.05");
  await expect(
    header(page).getByRole("button", { name: "Redo", exact: true }),
  ).toBeDisabled();
});

test("WS9 D3 leaving the page just after a Save raises no question, and after a change that follows it, the question", async ({
  page,
}) => {
  await openPopgen(page);
  await loadPanelNei(page);
  await (await saveProject(page)).path();

  expect(await leave(page)).toBe("none");

  await loadPanelNei(page);
  await (await saveProject(page)).path();
  await setThreshold(page, "0.05");

  expect(await leave(page)).toBe("beforeunload");
});

test("WS9 D3 Open project… with notes.txt shows the text of notJson in a dialog whose OK takes the focus and gives it back to Open project…, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPopgen(page);

  await openProject(page, { name: "notes.txt", text: "some notes" });

  const dialog = page.getByRole("alertdialog", {
    name: "notes.txt was not opened",
  });
  await expect(dialog).toHaveAccessibleDescription(
    "notes.txt cannot be opened as a project: it is not a project file, or it was cut short or changed outside the application. Open the .popnei.json file the application saved, or a copy of it.",
  );
  await expect(dialog.getByRole("button", { name: "OK" })).toBeFocused();
  await expectNoViolations(makeAxeBuilder);

  await page.keyboard.press("Enter");

  await expect(dialog).toHaveCount(0);
  await expect(openButton(page)).toBeFocused();
});

test("WS9 D3 Open project… with a file of a newer format, whose text does not name the file, names it in the heading of its dialog", async ({
  page,
}) => {
  await openPopgen(page);

  await openProject(page, {
    name: "later.popnei.json",
    text: '{"format": "popnei_web project", "formatVersion": 99}',
  });

  const dialog = page.getByRole("alertdialog", {
    name: "later.popnei.json was not opened",
  });
  await expect(dialog).toHaveAccessibleDescription(
    /^This project file was saved by a newer version of the application/,
  );
});

test("WS9 D3 of two project files picked close together, the second opens, and the first, read after it, is not answered", async ({
  page,
}) => {
  await openPopgen(page);
  // The file slow.popnei.json is read half a second late, and the page
  // notes when its read has ended.
  await page.evaluate(() => {
    File.prototype.text = async function (this: File): Promise<string> {
      const read = await new Response(this).text();
      if (this.name !== "slow.popnei.json") return read;
      await new Promise((resolve) => setTimeout(resolve, 500));
      Object.assign(window, { slowRead: true });
      return read;
    };
  });

  await openProject(page, { name: "slow.popnei.json", text: "some notes" });
  await openProject(
    page,
    join(
      import.meta.dirname,
      "..",
      "src",
      "core",
      "fixtures",
      "projectFile",
      "v1-empty.popnei.json",
    ),
  );

  await expect(status(page)).toHaveText("Opened v1-empty.popnei.json.");
  await expect.poll(() => page.evaluate(() => "slowRead" in window)).toBe(true);
  // A frame for the page to answer the first file, if it did.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  );
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeFocused();
});

/** Makes the page hold the read of every file picked until
    `releaseRead` is called, and note when a read has ended. */
async function holdReads(page: Page): Promise<void> {
  await page.evaluate(() => {
    const held: (() => void)[] = [];
    Object.assign(window, {
      releaseRead: () => {
        for (const release of held.splice(0)) release();
      },
    });
    File.prototype.text = async function (this: File): Promise<string> {
      const read = await new Response(this).text();
      await new Promise<void>((resolve) => {
        held.push(resolve);
      });
      Object.assign(window, { readEnded: true });
      return read;
    };
  });
}

/** Ends the reads `holdReads` held, and waits a frame past them, for the
    page to answer the file if it does. */
async function releaseReads(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { releaseRead: () => void }).releaseRead();
  });
  await expect
    .poll(() => page.evaluate(() => "readEnded" in window))
    .toBe(true);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(resolve)),
  );
}

test("WS9 D3 a project file whose read ends while the dialog of Save is open is opened once that dialog has closed, and not behind it", async ({
  page,
}) => {
  // At the Individuals step, which an opening leaves for Variants.
  await openPopgen(page, "#individuals");
  await holdReads(page);
  await openProject(
    page,
    join(
      import.meta.dirname,
      "..",
      "src",
      "core",
      "fixtures",
      "projectFile",
      "v1-empty.popnei.json",
    ),
  );
  await saveButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Save the project" });
  await expect(dialog.getByRole("textbox")).toBeFocused();

  await releaseReads(page);
  expect(new URL(page.url()).hash).toBe("#individuals");
  await expect(dialog.getByRole("textbox")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(status(page)).toHaveText("Opened v1-empty.popnei.json.");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeFocused();
});

test("WS9 D3 a project file refused whose read ends while the dialog of Save is open is told once that dialog has closed, and its OK gives the focus to Open project…", async ({
  page,
}) => {
  await openPopgen(page);
  await holdReads(page);
  await openProject(page, { name: "notes.txt", text: "some notes" });
  await saveButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Save the project" });
  await expect(dialog.getByRole("textbox")).toBeFocused();

  await releaseReads(page);
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  await dialog.getByRole("button", { name: "Cancel" }).click();
  const refusal = page.getByRole("alertdialog", {
    name: "notes.txt was not opened",
  });
  await expect(refusal.getByRole("button", { name: "OK" })).toBeFocused();
  await refusal.getByRole("button", { name: "OK" }).click();
  await expect(refusal).toHaveCount(0);
  await expect(openButton(page)).toBeFocused();
});

test("WS9 D3 Open project… with a file above 64 MB shows the text of tooLarge", async ({
  page,
}, testInfo) => {
  const path = testInfo.outputPath("big.popnei.json");
  const file = await openFile(path, "w");
  await file.truncate(MAX_PROJECT_FILE_BYTES + 1);
  await file.close();
  await openPopgen(page);

  await openProject(page, path);

  const dialog = page.getByRole("alertdialog", {
    name: "big.popnei.json was not opened",
  });
  await expect(dialog).toHaveAccessibleDescription(
    "big.popnei.json cannot be opened as a project: it is larger than 64 MB, and a project file, which holds settings and no genotypes, is much smaller. Open the .popnei.json file the application saved.",
  );
  await expect(dialog.getByRole("button", { name: "OK" })).toBeFocused();
  await page.keyboard.press("Escape");

  await expect(dialog).toHaveCount(0);
  await expect(openButton(page)).toBeFocused();
});

test("WS9 D3 Open project… with the saved file after a change asks first, Keep leaves the project as it is, and the opening gives the Variants step with the focus on its heading and the file it asks for, and axe", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  await openPopgen(page, "#analyses");
  await goTo(page, "Variants");
  await loadPanelNei(page);
  const saved = await saveProjectFile(page, testInfo.outputPath());
  await setThreshold(page, "0.05");
  await goTo(page, "Analyses");

  await openProject(page, saved);
  const question = page.getByRole("alertdialog", {
    name: "Open panel.popnei.json?",
  });
  await expect(question).toHaveAccessibleDescription(
    "It replaces the project on the page, and an opening cannot be undone. Save the project first to keep it.",
  );
  const keep = question.getByRole("button", {
    name: "Keep the current project",
  });
  await expect(keep).toBeFocused();
  await expectNoViolations(makeAxeBuilder);
  await keep.click();
  await expect(question).toHaveCount(0);
  await expect(openButton(page)).toBeFocused();
  await expect(
    page.getByRole("heading", { level: 1, name: "Analyses" }),
  ).toBeVisible();

  await openProject(page, saved);
  await question
    .getByRole("button", { name: "Open panel.popnei.json" })
    .click();

  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeFocused();
  expect(new URL(page.url()).hash).toBe("#variants");
  const asked =
    "This project was made with panel.nei and 200 individuals. Load it in the Variants step to run its analyses again.";
  await expect(page.getByRole("main").getByText(asked)).toBeVisible();
  await expect(status(page)).toHaveText(`Opened panel.popnei.json. ${asked}`);
  await expect(threshold(page)).toHaveValue("0.1");
  await expect(
    header(page).getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await expectNoViolations(makeAxeBuilder);

  // The opened project is the one to compare with: leaving asks nothing.
  expect(await leave(page)).toBe("none");
});

test("WS9 D3 an opening at the Variants step moves the focus to its heading, and a project not changed since its Save opens with no question", async ({
  page,
}, testInfo) => {
  await openPopgen(page);
  await loadPanelNei(page);
  const saved = await saveProjectFile(page, testInfo.outputPath());

  await openProject(page, saved);

  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeFocused();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  // After the words of the Save, when they come within the pause of the
  // announcer.
  await expect(status(page)).toHaveText(/Opened panel\.popnei\.json\. /);
});

test("WS9 D3 the opening answered in the question while the Variants step is on screen moves the focus to its heading", async ({
  page,
}, testInfo) => {
  await openPopgen(page);
  await loadPanelNei(page);
  const saved = await saveProjectFile(page, testInfo.outputPath());
  await setThreshold(page, "0.05");

  await openProject(page, saved);
  const question = page.getByRole("alertdialog", {
    name: "Open panel.popnei.json?",
  });
  await question
    .getByRole("button", { name: "Open panel.popnei.json" })
    .click();

  await expect(question).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeFocused();
  await expect(threshold(page)).toHaveValue("0.1");
});

test("WS9 D3 a dialog of Save project or of Open project… has given the focus back to its button by the next frame after it closes, a Save that downloads the file among them", async ({
  page,
}, testInfo) => {
  await openPopgen(page);
  await loadPanelNei(page);
  await saveButton(page).click();
  await page
    .getByRole("dialog", { name: "Save the project" })
    .getByRole("button", { name: "Cancel" })
    .click();
  expect(await focusedInNextFrame(page)).toBe("Save project");

  await saveButton(page).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("dialog", { name: "Save the project" })
    .getByRole("button", { name: "Save", exact: true })
    .click();
  expect(await focusedInNextFrame(page)).toBe("Save project");
  const saved = testInfo.outputPath("panel.popnei.json");
  await (await download).saveAs(saved);

  await openProject(page, { name: "notes.txt", text: "some notes" });
  await page
    .getByRole("alertdialog", { name: "notes.txt was not opened" })
    .getByRole("button", { name: "OK" })
    .click();
  expect(await focusedInNextFrame(page)).toBe("Open project…");

  await setThreshold(page, "0.05");
  await openProject(page, saved);
  await page
    .getByRole("alertdialog", { name: "Open panel.popnei.json?" })
    .getByRole("button", { name: "Keep the current project" })
    .click();
  expect(await focusedInNextFrame(page)).toBe("Open project…");
});

test("WS9 D3 the question before an opening says that the calculations under way will be stopped", async ({
  page,
}, testInfo) => {
  await openPopgen(page);
  await loadWithPopulations(page, "panel.nei");
  const saved = await saveProjectFile(page, testInfo.outputPath());
  // The calculation worker keeps its results back, so that the
  // calculation stays under way.
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
    };
    const post = scope.postMessage.bind(scope);
    scope.postMessage = (message, transfer) => {
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind !== "result") post(message, transfer);
    };
  });
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(stepLink(page, "Analyses")).toHaveAccessibleName(
    "Analyses, Running",
  );

  await openProject(page, saved);

  const question = page.getByRole("alertdialog", {
    name: "Open panel.popnei.json?",
  });
  await expect(question).toHaveAccessibleDescription(
    "It replaces the project on the page, and an opening cannot be undone. Save the project first to keep it. The ongoing calculations will be stopped.",
  );
  await question
    .getByRole("button", { name: "Open panel.popnei.json" })
    .click();
  await expect(stepLink(page, "Analyses")).not.toHaveAccessibleName(
    "Analyses, Running",
  );
});

test("WS9 D3 the question before an opening loses its sentence of the calculations when they end while it is open", async ({
  page,
}, testInfo) => {
  await openPopgen(page);
  await loadWithPopulations(page, "panel.nei");
  const saved = await saveProjectFile(page, testInfo.outputPath());
  // The calculation worker keeps its results until the test lets them go.
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
      release: () => void;
    };
    const post = scope.postMessage.bind(scope);
    const held: [unknown, Transferable[] | undefined][] = [];
    scope.postMessage = (message, transfer) => {
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind === "result") held.push([message, transfer]);
      else post(message, transfer);
    };
    scope.release = () => {
      scope.postMessage = post;
      for (const [message, transfer] of held) post(message, transfer);
    };
  });
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(stepLink(page, "Analyses")).toHaveAccessibleName(
    "Analyses, Running",
  );
  await openProject(page, saved);
  const question = page.getByRole("alertdialog", {
    name: "Open panel.popnei.json?",
  });
  await expect(question).toHaveAccessibleDescription(
    /The ongoing calculations will be stopped\.$/,
  );

  await worker.evaluate(() => {
    (globalThis as unknown as { release: () => void }).release();
  });

  await expect(stepLink(page, "Analyses")).toHaveAccessibleName(
    "Analyses, Done",
  );
  await expect(question).toHaveAccessibleDescription(
    "It replaces the project on the page, and an opening cannot be undone. Save the project first to keep it.",
  );
});

test("WS9 D3 after an opening, another variants file given shows the warning of the identity beside its card, announced, and axe", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  await openPopgen(page);
  await loadPanelNei(page);
  const saved = await saveProjectFile(page, testInfo.outputPath());
  await openProject(page, saved);
  // After the words of the Save, when they come within the pause of the
  // announcer.
  await expect(status(page)).toHaveText(/Opened panel\.popnei\.json\. /);

  await pick(page, "Variants file", "panel.vcf.gz");

  const warning =
    "The project was made with panel.nei and 200 individuals; this file is called panel.vcf.gz, is a VCF file and has 87,304 bytes where that one had 261,490. Load the file the project was made with, or go on with this one.";
  await expect(
    page.getByRole("region", { name: "Variants file" }).getByText(warning),
  ).toHaveText(`Warning: ${warning}`);
  // The read first, then the warning, which waited for it.
  await expect(status(page)).toHaveText(
    `panel.vcf.gz read: 200 individuals, ploidy 2. Warning: ${warning}`,
  );
  await expect(
    page
      .getByRole("region", { name: "Variants file" })
      .getByText(/^This project was made with/),
  ).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D3 the read of a variants file that makes the warning of the identity appear announces both, the read and the warning", async ({
  page,
}, testInfo) => {
  await openPopgen(page);
  await loadPanelNei(page);
  const saved = await saveProjectFile(page, testInfo.outputPath());
  // The project file of a panel.nei of ploidy 4, of the same name, size
  // and format, which differs only once the file given is read.
  const file = JSON.parse(await readFile(saved, "utf-8")) as {
    variants: { read: { ploidy: number } };
  };
  file.variants.read.ploidy = 4;
  const edited = testInfo.outputPath("tetra.popnei.json");
  await writeFile(edited, JSON.stringify(file));
  await openProject(page, edited);
  await expect(status(page)).toHaveText(/Opened tetra\.popnei\.json\. /);

  await pick(page, "Variants file", "panel.nei");

  // One change of the store, whose two announcements are joined.
  await expect(status(page)).toHaveText(
    "panel.nei read: 200 individuals, ploidy 2. Warning: The project was made with panel.nei and 200 individuals; this file has ploidy 2 where that one had 4. Load the file the project was made with, or go on with this one.",
  );
});

test("WS9 D3 a ploidy typed and a file refused with no variants file are forgotten at an opening, and the VCF the project asks for is read as it was and compared, and axe", async ({
  page,
  context,
  makeAxeBuilder,
}, testInfo) => {
  // Saved from a page of its own, and opened in the page of the test,
  // which axe checks.
  const first = await context.newPage();
  await openPopgen(first);
  await loadWithPopulations(first, "panel.vcf.gz");
  await goTo(first, "Analyses");
  await first.getByRole("button", { name: "Run" }).click();
  await expect(first.getByRole("rowheader", { name: "p0" })).toBeVisible();
  const saved = await saveProjectFile(first, testInfo.outputPath());

  await openPopgen(page);
  const ploidy = page.getByLabel("Ploidy of the VCF, from 1 to 255");
  await ploidy.fill("4");
  await ploidy.press("Enter");
  await expect(ploidy).toHaveValue("4");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: "Choose a variants file…" })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "panel.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not variants"),
  });
  const refused = page
    .getByRole("region", { name: "Variants file" })
    .getByText(/^panel\.txt was not loaded/);
  await expect(refused).toBeVisible();

  await openProject(page, saved);

  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeFocused();
  await expect(ploidy).toHaveValue("2");
  await expect(refused).toHaveCount(0);
  await pick(page, "Variants file", "panel.vcf.gz");
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  await expect(
    page.getByRole("region", { name: "Variants file" }).getByText(/^Warning/),
  ).toHaveCount(0);
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(
    page.getByText(
      "The same numbers as in the project file: this variants file gives the results the project was saved with.",
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D3 Save the project of the error bar downloads the project file with no dialog and says so in the bar, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPopgen(page);
  await loadPanelNei(page);
  await page.evaluate(() => {
    setTimeout(() => {
      throw new Error("test");
    });
  });
  await expect(page.getByRole("alert")).toContainText("test");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save the project" }).click();

  expect((await download).suggestedFilename()).toBe("panel.popnei.json");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // The bar's own status region, the first of the page.
  await expect(page.getByRole("status").first()).toHaveText(
    "panel.popnei.json was handed to the browser to download.",
  );
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D3 a project that cannot be written: Save closes its dialog and the bar shows the error, and the bar's Save says the project was not saved, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPopgen(page);
  await loadPanelNei(page);
  // Writing the file throws, as a defect of the writer would.
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error("popnei_web defect: test");
    };
  });

  await saveButton(page).click();
  await page
    .getByRole("dialog", { name: "Save the project" })
    .getByRole("button", { name: "Save", exact: true })
    .click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText(
    "popnei_web defect: test",
  );
  await page.getByRole("button", { name: "Save the project" }).click();
  // The bar's own status region, the first of the page.
  await expect(page.getByRole("status").first()).toHaveText(
    "The project could not be saved: the application met an error of its own as it wrote the file. Reloading the page would lose the project.",
  );
  await expect(page.getByText("1 more error followed it.")).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D3 the error bar's Save after a Copy that failed keeps the box of the details, and a second Save writes its words again", async ({
  page,
}) => {
  await openPopgen(page);
  await loadPanelNei(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
    setTimeout(() => {
      throw new Error("test");
    });
  });
  await page.getByRole("button", { name: "Copy the details" }).click();
  const box = page.getByRole("textbox", { name: "The details of the errors" });
  await expect(box).toBeVisible();
  const barStatus = page.getByRole("status").first();
  await expect(barStatus).toHaveText(
    "The details could not be copied. Select them in the box below and copy them.",
  );
  // Every text the bar's status region holds, in order, the empty one
  // among them.
  await page.evaluate(() => {
    const region = document.querySelector('#defects [role="status"]');
    if (region === null) throw new Error("no status region in the bar");
    const texts: string[] = [];
    Object.assign(window, { barTexts: texts });
    new MutationObserver(() => {
      texts.push(region.textContent);
    }).observe(region, { childList: true, subtree: true, characterData: true });
  });
  const handed = "panel.popnei.json was handed to the browser to download.";

  await page.getByRole("button", { name: "Save the project" }).click();
  await expect(barStatus).toHaveText(handed);
  await expect(box).toBeVisible();
  await page.getByRole("button", { name: "Save the project" }).click();

  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { barTexts: string[] }).barTexts.filter(
          (text) => text !== "",
        ),
      ),
    )
    .toEqual([handed, handed]);
  await expect(barStatus).toHaveText(handed);
});

test("WS9 D3 under the diversity's table, a VCF read with every variant is told why its numbers are not compared, and read again as the project was, the same numbers, and axe", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  await openPopgen(page);
  await loadWithPopulations(page, "panel.vcf.gz");
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
  const saved = await saveProjectFile(page, testInfo.outputPath());
  await openProject(page, saved);
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeFocused();

  const onlyPassed = page.getByRole("checkbox", {
    name: "Only the variants with PASS or . in the FILTER column",
  });
  // Pressed by its words, which the mark of the box covers.
  const onlyPassedWords = page.getByText(
    "Only the variants with PASS or . in the FILTER column",
    { exact: true },
  );
  await expect(onlyPassed).toBeChecked();
  await onlyPassedWords.click();
  await expect(onlyPassed).not.toBeChecked();
  await pick(page, "Variants file", "panel.vcf.gz");
  await expect(
    page
      .getByRole("region", { name: "Variants file" })
      .getByText(/^Warning: .*is read with every variant where that one/),
  ).toBeVisible();
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
  await expect(
    page.getByText(
      "Not compared with the numbers of the project file: this file was read with every variant, and the project's with only the variants with PASS or . in the FILTER column. To compare them, read the file again in the Variants step with only the variants with PASS or . in the FILTER column.",
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await goTo(page, "Variants");
  await onlyPassedWords.click();
  await expect(onlyPassed).toBeChecked();
  await page
    .getByRole("button", {
      name: "Read panel.vcf.gz again with only the variants with PASS or . in the FILTER column",
    })
    .click();
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  await goTo(page, "Analyses");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(
    page.getByText(
      "The same numbers as in the project file: this variants file gives the results the project was saved with.",
    ),
  ).toBeVisible();
  await expect(page.getByText(/^Not compared/)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});
