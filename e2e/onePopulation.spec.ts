/**
 * The metadata file optional and the one population, on the built site
 * (docs/specs/steps/individuals.md, "The file", "The populations" and
 * "How it is checked"; docs/specs/shell.md, "The stepper" and "The
 * summary line"; docs/specs/analyses/diversity.md, "How it is
 * verified"): panel.nei with no metadata file runs the diversity on "All
 * individuals", whose row reads popnei's numbers; "All individuals in one
 * population" chosen with a file, its notice, its list and its Undo; the
 * file picked again with the one population; and a project file whose
 * metadata file was not read when it was saved. axe at each state.
 */
import { join } from "node:path";

import type { Locator, Page, Worker } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The project file of core's tests whose metadata file, pops.csv, was
    not read when it was saved. */
const NOT_READ_PROJECT = join(
  import.meta.dirname,
  "..",
  "src",
  "core",
  "fixtures",
  "projectFile",
  "v1-metadata-not-read.popnei.json",
);

const NO_FILE = "No metadata file: every individual is in one population.";

const ONE_POPULATION_LINE = "1 population, All individuals: 200 individuals";

/** The row "All individuals" of panel.nei with the missing data filter
    at 0.1, which keeps its 1,200 variants: its individuals, expected and
    observed heterozygosity and polymorphic variants, as popnei gave them
    to four decimals (docs/specs/analyses/diversity.md, "How it is
    verified"). */
const ALL_INDIVIDUALS_ROW = ["200", "0.3755", "0.3543", "0.9792"];

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** Goes to a step by its link in the stepper. */
async function goTo(page: Page, step: string): Promise<void> {
  await stepLink(page, step).click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

function stepLink(page: Page, step: string): Locator {
  return page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: step });
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

/** Opens the page and loads panel.nei. */
async function loadPanel(page: Page): Promise<void> {
  await page.goto("popgen.html#variants");
  await pick(page, "Variants file", "panel.nei");
  await expect(stepLink(page, "Variants")).toHaveAccessibleName(
    "Variants, Done",
  );
}

/** Loads panel_pops.csv in the Individuals step and waits for its
    check. */
async function loadPops(page: Page): Promise<void> {
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", "panel_pops.csv");
  await expect(
    page.getByText("All 200 individuals of panel.nei found", { exact: true }),
  ).toBeVisible();
}

function populationsSelect(page: Page): Locator {
  return page.getByRole("button", {
    name: "Column that defines the populations",
  });
}

/** Chooses `option` in the select of the populations. */
async function choosePopulations(page: Page, option: string): Promise<void> {
  await populationsSelect(page).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

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

async function run(page: Page): Promise<void> {
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(panel(page).getByRole("table")).toBeVisible();
}

/** The calculation worker of the page. */
function runnerWorker(page: Page): Worker | undefined {
  return page.workers().find((w) => w.url().includes("runnerWorker"));
}

/** Makes the calculation worker keep its results back, so that a table
    shown from then on can only have come from the cache. */
async function holdResults(page: Page): Promise<void> {
  await expect.poll(() => runnerWorker(page) !== undefined).toBe(true);
  const worker = runnerWorker(page);
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
}

/** What the page gives to hold the reads of the metadata file. */
interface Holding {
  /** Whether a read asked for now is held. */
  holding: boolean;
  /** Sends the reads held, and holds no more. */
  releaseReads: () => void;
}

/** From now on, every read of the metadata file the page asks for is
    held on its way to the light worker, until `releaseReads`. */
async function holdReads(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = window as unknown as Partial<Holding>;
    state.holding = true;
    if (state.releaseReads !== undefined) return;
    const held: (() => void)[] = [];
    const pageWorker = window.Worker.prototype;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its worker, by apply
    const post = pageWorker.postMessage;
    pageWorker.postMessage = function (
      this: typeof pageWorker,
      ...args: [message: unknown, options?: StructuredSerializeOptions]
    ) {
      const [message] = args;
      if (
        state.holding === true &&
        typeof message === "object" &&
        message !== null &&
        "kind" in message &&
        message.kind === "readIndividuals"
      ) {
        held.push(() => {
          post.apply(this, args);
        });
        return;
      }
      post.apply(this, args);
    } as typeof pageWorker.postMessage;
    state.releaseReads = () => {
      state.holding = false;
      for (const send of held.splice(0)) send();
    };
  });
}

async function releaseReads(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as Holding).releaseReads();
  });
}

function notice(page: Page): Locator {
  return page.getByRole("region", { name: "Notice" });
}

function summary(page: Page, text: string): Locator {
  return page.getByText(text, { exact: true });
}

test("IP5 D3 panel.nei with no metadata file runs the diversity on All individuals: 200, 0.3755, 0.3543, 0.9792", async ({
  page,
  makeAxeBuilder,
}) => {
  await loadPanel(page);
  await expect(
    page.getByLabel("Maximum proportion of missing genotypes"),
  ).toHaveValue("0.1");

  await goTo(page, "Analyses");
  await expect(panel(page).getByText(ONE_POPULATION_LINE)).toBeVisible();
  await expect(panel(page).getByText(NO_FILE, { exact: true })).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await run(page);

  await expect(row(page, "All individuals")).toHaveText(ALL_INDIVIDUALS_ROW);
  await expect(panel(page).getByRole("rowheader")).toHaveText([
    "All individuals",
  ]);
  await expectNoViolations(makeAxeBuilder);
});

test("IP5 D2 with no metadata file the step offers the pick and says what the analyses run on, and the stepper says Optional", async ({
  page,
  makeAxeBuilder,
}) => {
  await loadPanel(page);
  await expect(stepLink(page, "Individuals")).toHaveAccessibleName(
    "Individuals, Optional",
  );
  await expect(stepLink(page, "Individuals")).toHaveAccessibleDescription(
    "Without it, every individual is in one population.",
  );
  await expect(
    summary(
      page,
      "panel.nei · 200 individuals · 1 filter · no metadata file: one population",
    ),
  ).toBeVisible();

  await goTo(page, "Individuals");
  const zone = page.getByRole("region", { name: "Metadata file" });
  await expect(
    zone.getByRole("button", { name: "Choose a metadata file…" }),
  ).toBeVisible();
  await expect(zone.getByText(NO_FILE, { exact: true })).toBeVisible();
  // Nothing to check and no populations to choose without a file.
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Metadata file",
  ]);
  await expect(populationsSelect(page)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("IP5 D2 All individuals in one population chosen removes the diversity by popcat with its notice, lists All individuals, runs on it, and Undo brings popcat back", async ({
  page,
  makeAxeBuilder,
}) => {
  await loadPanel(page);
  await loadPops(page);

  // A file read and no column chosen: the reason at the select.
  await expect(populationsSelect(page)).toHaveText("Choose a column");
  await expect(populationsSelect(page)).toHaveAccessibleDescription(
    /^Choose the column that defines the populations, or all individuals in one population\. /,
  );
  await expect(stepLink(page, "Individuals")).toHaveAccessibleName(
    "Individuals, To do",
  );
  await expect(
    summary(
      page,
      "panel.nei · 200 individuals · 1 filter · populations not chosen",
    ),
  ).toBeVisible();
  await populationsSelect(page).click();
  await expect(page.getByRole("option")).toHaveText([
    "All individuals in one population",
    "popcat",
  ]);
  await page.keyboard.press("Escape");

  await choosePopulations(page, "popcat");
  await goTo(page, "Analyses");
  await run(page);
  await expect(row(page, "p0")).toHaveText([
    "48",
    "0.3519",
    "0.3564",
    "0.9267",
  ]);

  await goTo(page, "Individuals");
  await choosePopulations(page, "All individuals in one population");

  await expect(populationsSelect(page)).toHaveText(
    "All individuals in one population",
  );
  await expect(
    notice(page).getByRole("alertdialog", {
      name: "Diversity removed because every individual was put in one population",
    }),
  ).toBeVisible();
  const populations = page
    .getByRole("region", { name: "Populations" })
    .getByRole("list");
  await expect(populations).toMatchAriaSnapshot(`
    - list:
      - listitem: All individuals, 200 individuals
  `);
  await expect(
    populations.getByText("All individuals · 200", { exact: true }),
  ).toBeVisible();
  await expect(stepLink(page, "Individuals")).toHaveAccessibleName(
    "Individuals, Done",
  );
  await expect(
    summary(
      page,
      // The run by popcat counted the variants the filters keep.
      "panel.nei · 200 individuals · 1,200 of 1,200 variants kept · 1 filter · one population",
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await goTo(page, "Analyses");
  await expect(panel(page).getByRole("table")).toHaveCount(0);
  await expect(panel(page).getByText(ONE_POPULATION_LINE)).toBeVisible();
  // A file is loaded, so the line of no file is not there.
  await expect(panel(page).getByText(NO_FILE)).toHaveCount(0);
  await run(page);
  await expect(row(page, "All individuals")).toHaveText(ALL_INDIVIDUALS_ROW);

  // Undo takes back the choice, the Run being no step of undo, and the
  // table by popcat comes back from the cache.
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true })
    .click();
  await expect(row(page, "p0")).toHaveText([
    "48",
    "0.3519",
    "0.3564",
    "0.9267",
  ]);
  await goTo(page, "Individuals");
  await expect(populationsSelect(page)).toHaveText("popcat");
  await expectNoViolations(makeAxeBuilder);
});

test("IP5 D2 with the one population, the metadata file picked again gives the table of All individuals back with no Run", async ({
  page,
}) => {
  await loadPanel(page);
  await loadPops(page);
  await choosePopulations(page, "All individuals in one population");
  await goTo(page, "Analyses");
  await run(page);
  await expect(row(page, "All individuals")).toHaveText(ALL_INDIVIDUALS_ROW);

  await goTo(page, "Individuals");
  await expect(
    page.getByText("All 200 individuals of panel.nei found", { exact: true }),
  ).toBeVisible();
  await expect(populationsSelect(page)).toHaveText(
    "All individuals in one population",
  );

  await goTo(page, "Analyses");
  await expect(row(page, "All individuals")).toHaveText(ALL_INDIVIDUALS_ROW);
  // The notice of the new load no longer names the diversity, and goes.
  await expect(notice(page)).toHaveCount(0);
});

test("IP10 D3 Undo of All individuals in one population brings the table by popcat back from the cache, with no calculation", async ({
  page,
}) => {
  await loadPanel(page);
  await loadPops(page);
  await choosePopulations(page, "popcat");
  await goTo(page, "Analyses");
  await run(page);
  await expect(row(page, "p0")).toHaveText([
    "48",
    "0.3519",
    "0.3564",
    "0.9267",
  ]);
  await goTo(page, "Individuals");
  await choosePopulations(page, "All individuals in one population");
  await goTo(page, "Analyses");
  await run(page);
  await expect(row(page, "All individuals")).toHaveText(ALL_INDIVIDUALS_ROW);
  // The end of that run said first, so that the region holds no text of
  // it when the Undo is said: the status region joins the texts
  // announced within 100 ms.
  await expect(page.getByRole("status").last()).toHaveText(/Diversity: done/);

  // With the results of the calculation worker held back, the table by
  // popcat can only come back from the cache.
  await holdResults(page);
  await page
    .getByRole("banner")
    .getByRole("button", { name: "Undo", exact: true })
    .click();

  await expect(row(page, "p0")).toHaveText([
    "48",
    "0.3519",
    "0.3564",
    "0.9267",
  ]);
  await expect(page.getByRole("status").last()).not.toHaveText(
    /Diversity: calculating\./,
  );
});

test("IP10 D3 with the one population, the metadata file picked again takes the table away while it is read, and Run waits for the read", async ({
  page,
  makeAxeBuilder,
}) => {
  await loadPanel(page);
  await loadPops(page);
  await choosePopulations(page, "All individuals in one population");
  await goTo(page, "Analyses");
  await run(page);
  await expect(row(page, "All individuals")).toHaveText(ALL_INDIVIDUALS_ROW);

  await goTo(page, "Individuals");
  await holdReads(page);
  await pick(page, "Metadata file", "panel_pops.csv");
  await goTo(page, "Analyses");

  await expect(panel(page).getByRole("table")).toHaveCount(0);
  const button = panel(page).getByRole("button", { name: "Run" });
  await expect(button).toBeDisabled();
  await expect(button).toHaveAccessibleDescription("Reading panel_pops.csv.");
  await expectNoViolations(makeAxeBuilder);

  // Once read, the table comes back with no Run.
  await releaseReads(page);
  await expect(row(page, "All individuals")).toHaveText(ALL_INDIVIDUALS_ROW);
});

test("IP5 D2 a project file whose metadata file was not read when it was saved shows its reason with no options and no table, and Individuals is To do", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.goto("popgen.html#individuals");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Open project…" }).click();
  await (await chooser).setFiles(NOT_READ_PROJECT);

  await expect(stepLink(page, "Individuals")).toHaveAccessibleName(
    "Individuals, To do",
  );
  // The opening says the file to load again, after the variants file.
  await expect(page.getByRole("status").last()).toHaveText(
    "Opened v1-metadata-not-read.popnei.json. This project was made with panel.nei, of 4 individuals and 1,200 variants. Load it to run its analyses again. pops.csv was not read when this project was saved, so the project file does not hold it. Load pops.csv again in the Individuals step.",
  );
  await expect(stepLink(page, "Individuals")).toHaveAccessibleDescription(
    "pops.csv was not read when this project was saved, so the project file does not hold it. Load pops.csv again in the Individuals step.",
  );
  await goTo(page, "Individuals");
  const zone = page.getByRole("region", { name: "Metadata file" });
  await expect(zone.getByText("pops.csv", { exact: true })).toBeVisible();
  await expect(
    zone.getByRole("button", { name: "Replace pops.csv…" }),
  ).toBeVisible();
  await expect(
    zone.getByRole("button", { name: "Remove pops.csv" }),
  ).toBeVisible();
  await expect(
    zone.getByText(
      "pops.csv was not read when this project was saved, so the project file does not hold it. Choose it again.",
      { exact: true },
    ),
  ).toBeVisible();
  // Neither the options of the reader nor anything under the card.
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Metadata file",
  ]);
  await expect(page.getByRole("button", { name: /^Separator/ })).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
  await expect(page.getByText(/ · pops\.csv not loaded$/)).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await zone.getByRole("button", { name: "Remove pops.csv" }).click();
  await expect(stepLink(page, "Individuals")).toHaveAccessibleName(
    "Individuals, Optional",
  );
  await expect(zone.getByText(NO_FILE, { exact: true })).toBeVisible();
  await expect(
    zone.getByRole("button", { name: "Choose a metadata file…" }),
  ).toBeFocused();
});
