/**
 * The panel of the diversity on the individuals the filters keep, on the
 * built site (docs/specs/analyses/diversity.md, "The panel", its states
 * and its words, and "How it is verified", the flow of stage 3), on
 * e2e/fixtures/panel.nei with the missing data filter of the variants at
 * 0.05 and panel_pops.csv, the column popcat: the ready state with the
 * populations kept, and with those left empty; a Run with the thresholds
 * at 0.03 and 0.38 and no statistics of each individual, which says it
 * waits for them and then gives p0 with 32 individuals, 0.3524, 0.3566
 * and 0.9089, the numbers popnei's release js-v0.1.0-dev.2 gave in node
 * on 26 September 2026; a Stop during the wait; the statistics refused,
 * in their words; and no population left. axe at each state reached.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page, Worker } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

const VARIANTS_MISSING_LABEL =
  "Maximum proportion of missing genotypes, from 0 to 1";
const MISSING_SWITCH = "Filter the individuals by missing data";
const MISSING_LABEL =
  "Maximum proportion of missing genotypes of an individual, from 0 to 1";
const OBS_HET_SWITCH = "Filter the individuals by observed heterozygosity";
const OBS_HET_LABEL =
  "Maximum observed heterozygosity of an individual, from 0 to 1";
const CALCULATE = "Calculate the statistics of each individual";
const STATS_CAPTION =
  "The statistics of the 200 individuals of panel.nei, over the 1,152 variants the filters kept.";
const PASS_119 = "119 of the 200 individuals of panel.nei pass the filters.";

const POPS_ALL =
  "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals";
const POPS_119 =
  "3 populations: p0, 32 individuals; p2, 50 individuals; p1, 37 individuals";
const RUN_WAITS =
  "Run calculates the statistics of each individual first, and the populations may lose individuals to the thresholds.";
const P1_LEFT_OUT =
  "p1 has no individual left after the filters of individuals, and is left out. Loosen the filters of individuals in the Variants step to keep it.";
const WAIT_LINE =
  /^Calculating the statistics of each individual, which the thresholds of the individuals need · \d+% · \d:\d\d$/;
const WAIT_BAR = "Calculating the statistics of each individual";
const STATS_FAILED =
  "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the diversity was not run. At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.";
/** The reason of the lock when the thresholds leave p0, the one
    population, with no individual. */
const P0_EMPTIED =
  "p0 has no individual left after the filters of individuals. Loosen the filters of individuals in the Variants step to keep it.";

/** The twelve individuals of tetraploid.vcf.gz, in one population, A. */
const TETRAPLOID_POPS = {
  name: "tetraploid_pops.csv",
  text: `IID,pop\n${Array.from(
    { length: 12 },
    (_, i) => `t${String(i).padStart(2, "0")},A\n`,
  ).join("")}`,
};

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** Goes to a step by its link in the stepper. */
async function goTo(page: Page, step: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: new RegExp(`^${step}\\b`) })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

/** Picks `file`, a fixture or a file of a name and text, with the button
    of the zone `region`. */
async function pick(
  page: Page,
  region: string,
  file: string | { readonly name: string; readonly text: string },
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: region })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (
    await chooser
  ).setFiles(
    typeof file === "string"
      ? join(FIXTURES, file)
      : {
          name: file.name,
          mimeType: "text/plain",
          buffer: Buffer.from(file.text),
        },
  );
}

/** Opens the page, loads `variants` and the metadata file `metadata`,
    chooses the column `column`, and sets the missing data filter of the
    variants to `missing`, when one is given; ends at the Variants
    step. */
async function load(
  page: Page,
  variants: string,
  metadata: string | { readonly name: string; readonly text: string },
  column: string,
  missing: string | null,
): Promise<void> {
  await page.goto("popgen.html#variants");
  await pick(page, "Variants file", variants);
  await expect(page.getByText(/^[\d,]+ individuals$/)).toBeVisible();
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", metadata);
  await expect(page.getByText(/^All [\d,]+ individuals of /)).toBeVisible();
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: column, exact: true }).click();
  await goTo(page, "Variants");
  if (missing !== null) {
    const field = page.getByLabel(VARIANTS_MISSING_LABEL, { exact: true });
    await field.fill(missing);
    await field.press("Enter");
    await expect(field).toHaveValue(missing);
  }
}

function individuals(page: Page): Locator {
  return page.getByRole("region", { name: "Filters of the individuals" });
}

/** Turns the threshold `name` on, with the mouse on its words, and
    commits `value` in its field `label` with Enter. */
async function threshold(
  page: Page,
  name: string,
  label: string,
  value: string,
): Promise<void> {
  await individuals(page).getByText(name, { exact: true }).click();
  const field = individuals(page).getByLabel(label, { exact: true });
  await field.fill(value);
  await field.press("Enter");
  await expect(field).toHaveValue(value);
}

/** The two thresholds at 0.03 and 0.38. */
async function thresholds(page: Page): Promise<void> {
  await threshold(page, MISSING_SWITCH, MISSING_LABEL, "0.03");
  await threshold(page, OBS_HET_SWITCH, OBS_HET_LABEL, "0.38");
}

async function calculateStatistics(page: Page): Promise<void> {
  await individuals(page).getByRole("button", { name: CALCULATE }).click();
  await expect(
    individuals(page).getByText(STATS_CAPTION, { exact: true }),
  ).toBeVisible();
}

function panel(page: Page): Locator {
  return page.getByRole("region", { name: "Diversity" });
}

function line(page: Page, text: string): Locator {
  return panel(page).getByText(text, { exact: true });
}

/** The cells of the row of the population `pop`, its header left out. */
function row(page: Page, pop: string): Locator {
  return panel(page)
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: pop, exact: true }) })
    .getByRole("cell");
}

function status(page: Page): Locator {
  return page.getByRole("status").last();
}

/** The calculation worker of the page. */
async function calculationWorker(page: Page): Promise<Worker> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  return worker;
}

/** Makes the calculation worker keep back its results, and leaves on it
    a function, `__release`, that posts what it kept and lets the next
    ones through. */
async function holdResults(worker: Worker): Promise<void> {
  await worker.evaluate(() => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
      __release: () => void;
    };
    const post = scope.postMessage.bind(scope);
    const kept: unknown[] = [];
    scope.postMessage = (message, transfer) => {
      const kind =
        typeof message === "object" && message !== null && "kind" in message
          ? message.kind
          : null;
      if (kind === "result") {
        kept.push(message);
      } else {
        post(message, transfer);
      }
    };
    scope.__release = () => {
      scope.postMessage = post;
      for (const message of kept) post(message);
    };
  });
}

test("VS7 D2 a Run with the thresholds at 0.03 and 0.38 and no statistics says it waits for them, then gives p0 with 32 individuals, 0.3524, 0.3566 and 0.9089, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", "popcat", "0.05");
  await thresholds(page);
  const worker = await calculationWorker(page);
  await holdResults(worker);

  await goTo(page, "Analyses");
  // The populations before the thresholds, which wait for the
  // statistics.
  await expect(line(page, POPS_ALL)).toBeVisible();
  await expect(line(page, RUN_WAITS)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  const button = panel(page).getByRole("button", { name: "Run" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(panel(page).getByText(WAIT_LINE)).toBeVisible();
  await expect(
    panel(page).getByRole("progressbar", { name: WAIT_BAR }),
  ).toBeVisible();
  await expect(panel(page).getByRole("button", { name: "Stop" })).toBeFocused();
  await expect(status(page)).toHaveText(
    "Statistics of each individual: calculating.",
  );
  await expectNoViolations(makeAxeBuilder);

  await worker.evaluate(() => {
    (globalThis as unknown as { __release: () => void }).__release();
  });
  await expect(row(page, "p0")).toHaveText([
    "32",
    "0.3524",
    "0.3566",
    "0.9089",
  ]);
  await expect(row(page, "p2")).toHaveText([
    "50",
    "0.3433",
    "0.3491",
    "0.9054",
  ]);
  await expect(row(page, "p1")).toHaveText([
    "37",
    "0.3495",
    "0.3542",
    "0.9132",
  ]);
  await expect(panel(page).getByText(WAIT_LINE)).toHaveCount(0);
  // Stop kept the focus from the statistics to the diversity, and gave it
  // to the heading when the table came.
  await expect(
    panel(page).getByRole("heading", { level: 2, name: "Diversity" }),
  ).toBeFocused();
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D2 the ready state lists the populations the filters keep, before the thresholds while they wait for the statistics, and names those a list leaves empty, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", "popcat", "0.05");
  await thresholds(page);
  // Every individual of p1 removed by the list to remove.
  const pops = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  const p1 = pops
    .split("\n")
    .map((text) => text.split(","))
    .filter(([, pop]) => pop === "p1")
    .map(([name]) => name ?? "");
  await individuals(page)
    .getByRole("textbox", { name: "Individuals to remove, one name per line" })
    .fill(p1.join("\n"));
  await individuals(page)
    .getByRole("button", { name: "Apply the list to remove", exact: true })
    .click();

  // The thresholds wait for the statistics: the populations the list
  // keeps, before them.
  await goTo(page, "Analyses");
  await expect(
    line(page, "2 populations: p0, 48 individuals; p2, 84 individuals"),
  ).toBeVisible();
  await expect(line(page, P1_LEFT_OUT)).toBeVisible();
  await expect(line(page, RUN_WAITS)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await goTo(page, "Variants");
  await calculateStatistics(page);
  await goTo(page, "Analyses");
  await expect(
    line(page, "2 populations: p0, 32 individuals; p2, 50 individuals"),
  ).toBeVisible();
  await expect(line(page, P1_LEFT_OUT)).toBeVisible();
  await expect(line(page, RUN_WAITS)).toHaveCount(0);
  // The summary line counts the populations kept.
  await expect(
    page.getByText(/ · 2 of 3 populations by popcat$/),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await goTo(page, "Variants");
  await individuals(page)
    .getByRole("button", { name: "Clear the list to remove", exact: true })
    .click();
  await expect(
    individuals(page).getByText(PASS_119, { exact: true }),
  ).toBeVisible();
  await goTo(page, "Analyses");
  await expect(line(page, POPS_119)).toBeVisible();
  await expect(line(page, P1_LEFT_OUT)).toHaveCount(0);
  await expect(line(page, RUN_WAITS)).toHaveCount(0);
  await expect(page.getByText(/ · 3 populations by popcat$/)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D2 a Run whose statistics keep no individual is not run, says why beside the disabled Run, announces it, and moves the focus to the heading", async ({
  page,
  makeAxeBuilder,
}) => {
  const reason =
    "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them in the Variants step.";
  await load(page, "panel.nei", "panel_pops.csv", "popcat", "0.05");
  // 0.03 and 0.1 keep none (e2e/screens.spec.ts).
  await threshold(page, MISSING_SWITCH, MISSING_LABEL, "0.03");
  await threshold(page, OBS_HET_SWITCH, OBS_HET_LABEL, "0.1");
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).focus();
  await page.keyboard.press("Enter");

  await expect(status(page)).toHaveText(
    new RegExp(
      `(^| )Diversity was not run\\. ${reason.replaceAll(".", "\\.")}$`,
    ),
  );
  const run = panel(page).getByRole("button", { name: "Run" });
  await expect(run).toBeDisabled();
  await expect(run).toHaveAccessibleDescription(reason);
  // The disabled Run cannot hold the focus, which goes to the heading.
  await expect(
    panel(page).getByRole("heading", { level: 2, name: "Diversity" }),
  ).toBeFocused();
  await expect(line(page, reason)).toBeVisible();
  await expect(
    page.getByText(/ · none of 3 populations by popcat$/),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D2 a Stop during the wait for the statistics leaves the diversity and the statistics ready, and the focus on Run", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", "popcat", "0.05");
  await thresholds(page);
  await holdResults(await calculationWorker(page));
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();
  // The Stop is pressed only once the wait is on the screen: before it,
  // the Run may not yet have sent the request of the statistics.
  await expect(panel(page).getByText(WAIT_LINE)).toBeVisible();
  const stop = panel(page).getByRole("button", { name: "Stop" });
  await stop.focus();
  await page.keyboard.press("Enter");

  await expect(panel(page).getByRole("button", { name: "Run" })).toBeFocused();
  await expect(panel(page).getByRole("progressbar")).toHaveCount(0);
  await expect(line(page, POPS_ALL)).toBeVisible();
  await expect(line(page, RUN_WAITS)).toBeVisible();
  // After the start of the statistics, when both came within the 100 ms
  // the region joins.
  await expect(status(page)).toHaveText(
    /(^| )Statistics of each individual: stopped\.$/,
  );
  await expectNoViolations(makeAxeBuilder);

  await goTo(page, "Variants");
  await expect(
    individuals(page).getByRole("button", { name: CALCULATE }),
  ).toBeEnabled();
  await expect(individuals(page).getByRole("progressbar")).toHaveCount(0);
});

test("VS7 D2 the statistics a Run waited for, refused by popnei, are told in their words and not the diversity's, with no Run, and the focus goes to the heading", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "tetraploid.vcf.gz", TETRAPLOID_POPS, "pop", null);
  await threshold(page, MISSING_SWITCH, MISSING_LABEL, "0.5");
  await goTo(page, "Analyses");
  await expect(line(page, "1 population: A, 12 individuals")).toBeVisible();
  await expect(line(page, RUN_WAITS)).toBeVisible();
  const button = panel(page).getByRole("button", { name: "Run" });
  await button.focus();
  await page.keyboard.press("Enter");

  await expect(line(page, STATS_FAILED)).toBeVisible();
  // popnei would refuse the same statistics again.
  await expect(panel(page).getByRole("button")).toHaveCount(0);
  await expect(
    panel(page).getByRole("heading", { level: 2, name: "Diversity" }),
  ).toBeFocused();
  await expectNoViolations(makeAxeBuilder);
});

test("VS7 D2 thresholds that keep only individuals with no population lock the diversity: a Run that waited for the statistics is not run, and the Run is disabled with the reason, and axe", async ({
  page,
  makeAxeBuilder,
}) => {
  // s000 alone has a population; its observed heterozygosity, 0.3672, is
  // above the threshold of 0.36, which keeps others.
  const pops = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  const text = pops
    .split("\n")
    .map((row, index) => {
      if (index === 0 || row === "") return row;
      const [name] = row.split(",");
      return name === "s000" ? row : `${name ?? ""},NA`;
    })
    .join("\n");
  await load(
    page,
    "panel.nei",
    { name: "panel_s000.csv", text },
    "popcat",
    "0.05",
  );
  await threshold(page, OBS_HET_SWITCH, OBS_HET_LABEL, "0.36");
  await goTo(page, "Analyses");
  await expect(line(page, RUN_WAITS)).toBeVisible();
  const run = panel(page).getByRole("button", { name: "Run" });
  await run.focus();
  await page.keyboard.press("Enter");

  // The statistics calculated, the list leaves no population: nothing is
  // sent, and the Run is disabled with the reason.
  await expect(status(page)).toHaveText(
    new RegExp(
      `(^| )Diversity was not run\\. ${P0_EMPTIED.replaceAll(".", "\\.")}$`,
    ),
  );
  await expect(run).toBeDisabled();
  await expect(run).toHaveAccessibleDescription(P0_EMPTIED);
  await expect(line(page, P0_EMPTIED)).toBeVisible();
  await expect(panel(page).getByText(/^\d+ populations?:/)).toHaveCount(0);
  await expect(
    panel(page).getByRole("heading", { level: 2, name: "Diversity" }),
  ).toBeFocused();
  await expectNoViolations(makeAxeBuilder);
});
