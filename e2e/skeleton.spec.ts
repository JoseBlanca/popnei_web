/**
 * The walking skeleton on the built site, one test for each sentence of
 * docs/architecture.md section 10, as .claude/skills/coding/testing.md
 * has it ("The walking skeleton, as a flow"): the diversity of panel.nei
 * with the populations of panel_pops.csv at 0.05; the threshold set to 1,
 * the table gone with its notice; undo, and the table back; a
 * calculation stopped, and the application still working; the project
 * saved, opened in a new page, given its variants file, and the same
 * numbers, then another file given and the warning of the identity. Each
 * checks what the user sees, the numbers and the words on the screen,
 * with axe in each state reached. The helpers are those of
 * saving.spec.ts, shell.spec.ts and diversity.spec.ts, whose tests check
 * each piece on its own.
 */
import { writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { bigVcfPopsCsv, STOP_VCF_VARIANTS, writeBigVcf } from "./bigVcf.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The row p0 of panel.nei at 0.05: its individuals, the expected and
    the observed heterozygosity and the proportion of polymorphic
    variants, popnei's numbers to four decimals (diversity.spec.ts). */
const P0_AT_005 = ["48", "0.3527", "0.3567", "0.9288"];

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

async function openPopgen(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

function header(page: Page): Locator {
  return page.getByRole("banner");
}

function stepLink(page: Page, name: string): Locator {
  return page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name });
}

/** Goes to a step by its link in the stepper. */
async function goTo(page: Page, step: string): Promise<void> {
  await stepLink(page, step).click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

/** Picks `file`, a fixture or a file at an absolute path, with the
    button of the zone `region`. */
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

/** Loads the variants file `variants` and the metadata file `metadata`,
    and chooses the column `column` of the populations. */
async function load(
  page: Page,
  variants: string,
  metadata: string,
  column: string,
): Promise<void> {
  await openPopgen(page);
  await pick(page, "Variants file", variants);
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", metadata);
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: column, exact: true }).click();
  await expect(stepLink(page, "Individuals")).toHaveAccessibleName(
    "Individuals, Done",
  );
}

function threshold(page: Page): Locator {
  return page.getByLabel("Maximum proportion of missing genotypes");
}

/** Sets the threshold of the missing data filter at the Variants step. */
async function setThreshold(page: Page, value: string): Promise<void> {
  await goTo(page, "Variants");
  await threshold(page).fill(value);
  await threshold(page).press("Enter");
  await expect(threshold(page)).toHaveValue(value);
}

/** The panel of the diversity. */
function panel(page: Page): Locator {
  return page.getByRole("region", { name: "Diversity" });
}

/** The cells of the row of the population `pop` of the diversity. */
function row(page: Page, pop: string): Locator {
  return panel(page)
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: pop, exact: true }) })
    .getByRole("cell");
}

/** Runs the diversity at the Analyses step, and waits for its table. */
async function run(page: Page): Promise<void> {
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(panel(page).getByRole("table")).toBeVisible();
}

/** Loads panel.nei and panel_pops.csv by popcat, and runs the diversity
    at 0.05. */
async function diversityAt005(page: Page): Promise<void> {
  await load(page, "panel.nei", "panel_pops.csv", "popcat");
  await setThreshold(page, "0.05");
  await run(page);
  await expect(row(page, "p0")).toHaveText(P0_AT_005);
}

/** The notice, the region of the toast at the end of the page. */
function notice(page: Page): Locator {
  return page.getByRole("region", { name: "Notice" });
}

/** Saves the project with Save project, under the name the dialog
    proposes, into the folder `folder`; gives the file's path. */
async function saveProjectFile(page: Page, folder: string): Promise<string> {
  await header(page).getByRole("button", { name: "Save project" }).click();
  const dialog = page.getByRole("dialog", { name: "Save the project" });
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  const path = join(folder, (await download).suggestedFilename());
  await (await download).saveAs(path);
  return path;
}

/** Picks the project file at `path` with Open project…. */
async function openProject(page: Page, path: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await header(page).getByRole("button", { name: "Open project…" }).click();
  await (await chooser).setFiles(path);
}

test("WS9 D4 panel.nei, filtered at 0.05 and grouped by the populations of panel_pops.csv, gives the diversity of p0, 48, 0.3527, 0.3567, 0.9288, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", "popcat");
  await setThreshold(page, "0.05");
  await goTo(page, "Analyses");
  await expect(
    panel(page).getByText("3 populations: p0, 48 individuals; p2, 84; p1, 68", {
      exact: true,
    }),
  ).toBeVisible();

  await run(page);

  await expect(
    panel(page).getByRole("table", {
      name: "The diversity of each population, over the 1,152 variants of panel.nei the filters kept.",
    }),
  ).toBeVisible();
  await expect(panel(page).getByRole("rowheader")).toHaveText([
    "p0",
    "p2",
    "p1",
  ]);
  await expect(row(page, "p0")).toHaveText(P0_AT_005);
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D4 the threshold set to 1 removes the diversity, with the notice Diversity removed because the missing data filter changed and its Undo, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await diversityAt005(page);

  await setThreshold(page, "1");

  await expect(
    notice(page).getByRole("alertdialog", {
      name: "Diversity removed because the missing data filter changed",
    }),
  ).toBeVisible();
  await expect(
    notice(page).getByRole("button", { name: "Undo", exact: true }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
  await goTo(page, "Analyses");
  await expect(panel(page).getByRole("table")).toHaveCount(0);
  await expect(stepLink(page, "Analyses")).toHaveAccessibleName(
    "Analyses, Results removed",
  );
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D4 Undo of the notice brings back the threshold of 0.05 and the diversity of p0 as it was, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await diversityAt005(page);
  await setThreshold(page, "1");

  await notice(page).getByRole("button", { name: "Undo", exact: true }).click();

  await expect(notice(page)).toHaveCount(0);
  await expect(threshold(page)).toHaveValue("0.05");
  await goTo(page, "Analyses");
  // Back from the cache, with no Run pressed.
  await expect(panel(page).getByRole("button", { name: "Run" })).toHaveCount(0);
  await expect(row(page, "p0")).toHaveText(P0_AT_005);
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D4 a calculation stopped in the middle of a pass leaves the panel ready, and Run after it gives the table, and axe", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  // A VCF written for the test, as in WS8 D3 of diversity.spec.ts, over
  // which a pass lasts 3.5 s in WebKit on the owner's Mac, so that Stop is
  // pressed while the pass reads; the run after it reads it whole.
  test.setTimeout(120_000);
  const vcf = testInfo.outputPath("stop.vcf.gz");
  await writeBigVcf(vcf, STOP_VCF_VARIANTS);
  const pops = testInfo.outputPath("stop_pops.csv");
  await writeFile(pops, bigVcfPopsCsv());
  await load(page, vcf, pops, "pop");
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();

  // The bar below 100%, or the run ended first, which fails the test: a
  // Stop that reaches a run that has ended checks nothing.
  const bars = panel(page).getByRole("progressbar", {
    name: "Calculating the diversity",
  });
  const table = panel(page).getByRole("table");
  let state = "waiting";
  await expect
    .poll(
      async () => {
        const shares = await bars.evaluateAll((els) =>
          els.map((el) => el.getAttribute("aria-valuetext")),
        );
        if (
          shares.some(
            (v) => v !== null && /^\d+%$/.test(v) && parseInt(v, 10) < 100,
          )
        ) {
          state = "below";
        } else if ((await table.count()) > 0) {
          state = "ended";
        }
        return state;
      },
      { timeout: 60_000, intervals: [20] },
    )
    .not.toBe("waiting");
  expect(state, "the bar was never seen below 100%").toBe("below");

  await panel(page).getByRole("button", { name: "Stop" }).click();

  await expect(panel(page).getByRole("button", { name: "Run" })).toBeVisible();
  await expect(bars).toHaveCount(0);
  await expect(table).toHaveCount(0);
  await expect(stepLink(page, "Analyses")).toHaveAccessibleName(
    "Analyses, Ready",
  );
  await expectNoViolations(makeAxeBuilder);

  // The pass after the stop, the worker started again, reads the file
  // whole: a timeout above the 3.5 s of a pass and the opening.
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(table).toBeVisible({ timeout: 60_000 });
  await expect(panel(page).getByRole("rowheader")).toHaveText(["a", "b", "c"]);
  await expect(
    panel(page).getByRole("row").getByRole("cell").first(),
  ).toHaveText("334");
  await expectNoViolations(makeAxeBuilder);
});

test("WS9 D4 the project saved after a run and opened in a new page gives the same numbers with panel.nei, and panel.vcf.gz then gets the warning of the identity and numbers not compared, and axe", async ({
  page,
  context,
  makeAxeBuilder,
}, testInfo) => {
  // Saved from a page of its own, and opened in the page of the test,
  // which axe checks.
  const first = await context.newPage();
  await diversityAt005(first);
  const saved = await saveProjectFile(first, testInfo.outputPath());
  await openPopgen(page);
  await openProject(page, saved);
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeFocused();
  await expect(
    page
      .getByRole("main")
      .getByText(
        "This project was made with panel.nei, of 200 individuals and 1,200 variants. Load it to run its analyses again.",
      ),
  ).toBeVisible();
  // The settings of the project, back.
  await expect(threshold(page)).toHaveValue("0.05");
  await expectNoViolations(makeAxeBuilder);

  await pick(page, "Variants file", "panel.nei");
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
  await run(page);

  await expect(row(page, "p0")).toHaveText(P0_AT_005);
  await expect(
    panel(page).getByText(
      "The same numbers as in the project file: this variants file gives the results the project was saved with.",
      { exact: true },
    ),
  ).toBeVisible();

  await goTo(page, "Variants");
  await pick(page, "Variants file", "panel.vcf.gz");

  const warning =
    "The project was made with panel.nei, 200 individuals and 1,200 variants; this file is called panel.vcf.gz and is a VCF file. Load the file the project was made with, or go on with this one.";
  await expect(
    page.getByRole("region", { name: "Variants file" }).getByText(warning),
  ).toHaveText(`Warning: ${warning}`);
  await expectNoViolations(makeAxeBuilder);

  // Its numbers are not compared, since the project was made with the
  // .nei file, and the panel says so.
  await run(page);
  await expect(
    panel(page).getByText(
      "Not compared with the numbers of the project file: this file is a VCF, and the project was made with a .nei file. Load panel.nei to compare them.",
      { exact: true },
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});
