/**
 * The panel of the diversity on the built site
 * (docs/specs/analyses/diversity.md, "The panel" and "How it is
 * verified"): locked until the column of the populations is chosen; run
 * on panel.nei and panel_pops.csv with the missing data filter at 0.05 and
 * at 1, whose rows are popnei's numbers to four decimals; the table
 * removed when the filter changes; its download and the line of the
 * versions; a VCF of ploidy 4 read with ploidy 2, refused, and read again
 * with ploidy 4, with the warning of a population of 12; axe at each state
 * reached.
 */
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

import type { Locator, Page, Route, Worker } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { bigVcfPopsCsv, STOP_VCF_VARIANTS, writeBigVcf } from "./bigVcf.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** Goes to a step by its link in the stepper. */
async function goTo(page: Page, step: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: step })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

/** Picks `file`, a fixture, a file at an absolute path, or a file of a
    name and text, with the button of the zone `region`, through the file
    picker of the system. */
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
      ? isAbsolute(file)
        ? file
        : join(FIXTURES, file)
      : {
          name: file.name,
          mimeType: "text/plain",
          buffer: Buffer.from(file.text),
        },
  );
}

/** Sets the threshold of the missing data filter of the Variants step. */
async function setThreshold(page: Page, value: string): Promise<void> {
  await goTo(page, "Variants");
  const threshold = page.getByLabel("Maximum proportion of missing genotypes");
  await threshold.fill(value);
  await threshold.press("Enter");
  await expect(threshold).toHaveValue(value);
}

/** Opens the page, loads `variants` and the metadata file `metadata`,
    and chooses the column `column`, when one is given. */
async function load(
  page: Page,
  variants: string | { readonly name: string; readonly text: string },
  metadata: string | { readonly name: string; readonly text: string },
  column: string | null,
): Promise<void> {
  await page.goto("popgen.html#variants");
  await pick(page, "Variants file", variants);
  await expect(page.getByText(/^[\d,]+ individuals$/)).toBeVisible();
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", metadata);
  await expect(page.getByText(/^All [\d,]+ individuals of /)).toBeVisible();
  if (column !== null) {
    await page
      .getByRole("button", { name: "Column that defines the populations" })
      .click();
    await page.getByRole("option", { name: column, exact: true }).click();
  }
}

/** The panel of the diversity. */
function panel(page: Page): Locator {
  return page.getByRole("region", { name: "Diversity" });
}

/** The row of the population `pop` of the table of the diversity, as the
    text of its cells. */
function row(page: Page, pop: string): Locator {
  return panel(page)
    .getByRole("row")
    .filter({ has: page.getByRole("rowheader", { name: pop, exact: true }) })
    .getByRole("cell");
}

/** Runs the diversity with the Run button, and waits for its table. */
async function run(page: Page): Promise<void> {
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(panel(page).getByRole("table")).toBeVisible();
}

const CAPTION_005 =
  "The diversity of each population, over the 1,152 variants of panel.nei the filters kept.";

test("WS8 D2 the diversity is locked until the column of the populations is chosen, and says so beside Run", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", null);
  await goTo(page, "Analyses");
  const button = panel(page).getByRole("button", { name: "Run" });
  await expect(button).toBeDisabled();
  await expect(button).toHaveAccessibleDescription(
    "Choose the column that defines the populations in the Individuals step.",
  );
  await expect(
    panel(page).getByText(
      "Choose the column that defines the populations in the Individuals step.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Diversity" }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D2 at 0.05 the row p0 reads 48, 0.3527, 0.3567, 0.9288, and the focus goes from Run to the heading", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", "popcat");
  await setThreshold(page, "0.05");
  await goTo(page, "Analyses");
  await expect(
    panel(page).getByText(
      "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  // No calculation was stopped, so no line says one was.
  await expect(panel(page).getByText(/was stopped because/)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  // With the keyboard: the button pressed with Enter goes when the run
  // ends done, and the focus goes to the heading of the panel.
  await panel(page).getByRole("button", { name: "Run" }).focus();
  await page.keyboard.press("Enter");
  await expect(panel(page).getByRole("table")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Diversity" }),
  ).toBeFocused();
  await expect(panel(page).getByRole("button", { name: "Run" })).toHaveCount(0);

  await expect(
    panel(page).getByRole("table", { name: CAPTION_005 }),
  ).toBeVisible();
  await expect(panel(page).getByRole("columnheader")).toHaveText([
    "Population",
    "Individuals",
    "Expected heterozygosity (unbiased)",
    "Observed heterozygosity",
    "Proportion of polymorphic variants",
  ]);
  await expect(panel(page).getByRole("rowheader")).toHaveText([
    "p0",
    "p2",
    "p1",
  ]);
  await expect(row(page, "p0")).toHaveText([
    "48",
    "0.3527",
    "0.3567",
    "0.9288",
  ]);
  await expect(row(page, "p2")).toHaveText([
    "84",
    "0.3441",
    "0.3512",
    "0.9106",
  ]);
  await expect(row(page, "p1")).toHaveText([
    "68",
    "0.3498",
    "0.3560",
    "0.9158",
  ]);
  await expect(
    panel(page).getByText(
      "A variant counts in a population when at least 20 of its individuals have a called genotype there, and is polymorphic when its commonest allele is below 0.95.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(panel(page).getByText(/^Warning:/)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D2 a panel drawn locked that becomes ready gives the focus to its heading when the run it started ends", async ({
  page,
}) => {
  // popnei's wasm held back, so that panel.nei stays being read while the
  // Analyses step is on the screen; the metadata file needs none.
  const held: Route[] = [];
  await page.route("**/*.wasm", (route) => {
    held.push(route);
  });
  await page.goto("popgen.html#individuals");
  await pick(page, "Metadata file", "panel_pops.csv");
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: "popcat", exact: true }).click();
  await goTo(page, "Variants");
  await pick(page, "Variants file", "panel.nei");
  await goTo(page, "Analyses");
  const button = panel(page).getByRole("button", { name: "Run" });
  await expect(button).toBeDisabled();
  await expect(button).toHaveAccessibleDescription("Reading panel.nei.");

  await expect.poll(() => held.length).toBeGreaterThan(0);
  for (const route of held) await route.continue();
  await expect(button).toBeEnabled();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(panel(page).getByRole("table")).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Diversity" }),
  ).toBeFocused();
});

for (const width of [320, 640]) {
  test(`WS8 D2 at ${String(width)} px wide the name of a population stays on one line`, async ({
    page,
  }) => {
    // 320 px is a phone, and a desktop at 400% zoom; 640 px at 200%.
    await page.setViewportSize({ width, height: 800 });
    await load(page, "panel.nei", "panel_pops.csv", "popcat");
    await goTo(page, "Analyses");
    await run(page);
    // The lines the text of the cell takes, one box each.
    const lines = await panel(page)
      .getByRole("rowheader", { name: "p0" })
      .evaluate((cell) => {
        const range = document.createRange();
        range.selectNodeContents(cell);
        return range.getClientRects().length;
      });
    expect(lines).toBe(1);
  });
}

test("WS8 D2 at 320 px wide the table scrolls in a frame that the Tab key reaches and the arrow keys scroll", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await load(page, "panel.nei", "panel_pops.csv", "popcat");
  await goTo(page, "Analyses");
  await run(page);
  const frame = panel(page).getByRole("region", {
    name: "The diversity of each population, over the 1,200 variants of panel.nei the filters kept.",
  });
  // The table is wider than its frame, and the page does not scroll
  // sideways.
  expect(await frame.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
    true,
  );
  // A line says so, and a shadow on the edge the table scrolls toward.
  await expect(
    panel(page).getByText("Scroll the table sideways to see all its columns.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await frame.evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toContain("radial-gradient");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  // The Tab key goes from the heading, where the run left the focus, to
  // the frame, and the arrow key scrolls it.
  await expect(
    page.getByRole("heading", { level: 2, name: "Diversity" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(frame).toBeFocused();
  // The arrow key is pressed until the frame scrolls: WebKit 26.6 under
  // Playwright let the first press after the Tab key go by, and scrolled
  // from the second, when the presses were half a second apart; Chromium
  // scrolled from the first.
  await expect
    .poll(async () => {
      await page.keyboard.press("ArrowRight");
      return frame.evaluate((el) => el.scrollLeft);
    })
    .toBeGreaterThan(0);
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D2 a table that fits its frame has no line of scrolling, and its frame is neither a region nor a stop of the Tab key, until the window narrows", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", "popcat");
  await goTo(page, "Analyses");
  await run(page);
  const caption =
    "The diversity of each population, over the 1,200 variants of panel.nei the filters kept.";
  const frame = panel(page).getByRole("region", { name: caption });
  const line = panel(page).getByText(
    "Scroll the table sideways to see all its columns.",
  );
  await expect(panel(page).getByRole("table", { name: caption })).toBeVisible();
  await expect(frame).toHaveCount(0);
  await expect(line).toHaveCount(0);
  // The Tab key goes from the heading to the download, past the table.
  await panel(page)
    .getByRole("heading", { level: 2, name: "Diversity" })
    .focus();
  await page.keyboard.press("Tab");
  await expect(
    panel(page).getByRole("button", { name: "Download the table as CSV" }),
  ).toBeFocused();
  await expectNoViolations(makeAxeBuilder);

  // Narrowed, the table no longer fits: the frame becomes a region and a
  // stop of the Tab key, and the line appears.
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(frame).toHaveCount(1);
  await expect(line).toBeVisible();
  await panel(page)
    .getByRole("heading", { level: 2, name: "Diversity" })
    .focus();
  await page.keyboard.press("Tab");
  await expect(frame).toBeFocused();

  // Widened again, they go.
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(frame).toHaveCount(0);
  await expect(line).toHaveCount(0);
});

test("WS8 D2 the filter moved to 1 removes the table with the words of its notice, and Run at 1 gives p0 0.3519, 0.3564, 0.9267", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", "popcat");
  await setThreshold(page, "0.05");
  await goTo(page, "Analyses");
  await run(page);
  await expect(row(page, "p0")).toHaveText([
    "48",
    "0.3527",
    "0.3567",
    "0.9288",
  ]);

  await setThreshold(page, "1");
  await goTo(page, "Analyses");
  await expect(
    panel(page).getByText(
      "The diversity was removed because the filter of the variants by missing data changed. Undo brings back the table as it was, with no calculation; Run calculates a new one for the new settings.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(panel(page).getByRole("table")).toHaveCount(0);
  // What Run will take, as in the state ready.
  await expect(
    panel(page).getByText(
      "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await run(page);
  await expect(
    panel(page).getByRole("table", {
      name: "The diversity of each population, over the 1,200 variants of panel.nei the filters kept.",
    }),
  ).toBeVisible();
  await expect(row(page, "p0")).toHaveText([
    "48",
    "0.3519",
    "0.3564",
    "0.9267",
  ]);
  await expect(row(page, "p2")).toHaveText([
    "84",
    "0.3449",
    "0.3512",
    "0.9108",
  ]);
  await expect(row(page, "p1")).toHaveText([
    "68",
    "0.3504",
    "0.3567",
    "0.9175",
  ]);
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D2 at 0.05 the download panel.diversity.csv holds the table, and the versions are beside it", async ({
  page,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", "popcat");
  await setThreshold(page, "0.05");
  await goTo(page, "Analyses");
  await run(page);
  await expect(
    panel(page).getByText(
      "Calculated with popnei 0.1.0, in version 0.1.0 of the application.",
      { exact: true },
    ),
  ).toBeVisible();

  const downloading = page.waitForEvent("download");
  await panel(page)
    .getByRole("button", { name: "Download the table as CSV" })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("panel.diversity.csv");
  expect(await readFile(await download.path(), "utf8")).toBe(
    "population,individuals,expected_heterozygosity_unbiased,observed_heterozygosity,proportion_polymorphic\n" +
      "p0,48,0.35267894847982756,0.35667985874177544,0.9288194444444444\n" +
      "p2,84,0.3440824705971255,0.3512406974637824,0.9105902777777778\n" +
      "p1,68,0.3498365468860467,0.35603713961547323,0.9157986111111112\n",
  );
});

test("WS8 D2 a population none of whose individuals is in the variants file gets no warning", async ({
  page,
}) => {
  // The metadata file serves another panel too: p9 and its individuals
  // are not in panel.nei.
  const text = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  await load(
    page,
    "panel.nei",
    { name: "two_panels.csv", text: `${text}x001,p9\nx002,p9\n` },
    "popcat",
  );
  await goTo(page, "Analyses");
  await expect(
    panel(page).getByText(
      "3 populations: p0, 48 individuals; p2, 84 individuals; p1, 68 individuals",
      {
        exact: true,
      },
    ),
  ).toBeVisible();
  await run(page);
  await expect(panel(page).getByRole("rowheader")).toHaveText([
    "p0",
    "p2",
    "p1",
  ]);
  await expect(panel(page).getByText(/^Warning:/)).toHaveCount(0);
  await expect(panel(page).getByText(/p9/)).toHaveCount(0);
});

/** Unticks the box of the passed variants in the Variants step and reads
    the VCF `name` again with every variant. */
async function readAgainWithEveryVariant(
  page: Page,
  name: string,
): Promise<void> {
  await goTo(page, "Variants");
  await page
    .getByText("Only the variants with PASS or . in the FILTER column", {
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: `Read ${name} again with every variant` })
    .click();
  await expect(page.getByText(/^[\d,]+ individuals$/)).toBeVisible();
}

test("WS8 D2 a VCF with no variant, read with only the passed variants, is told to untick the box, and read with every variant is told that it has none, with no Run", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(
    page,
    {
      name: "empty.vcf",
      text:
        '##fileformat=VCFv4.2\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
        "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ta\tb\n",
    },
    { name: "empty_pops.csv", text: "IID,pop\na,A\nb,A\n" },
    "pop",
  );
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(
    panel(page).getByText(
      'empty.vcf has no variant with PASS or . in its FILTER column, and it was read with only those, so there is no variant to calculate the diversity over. Untick "Only the variants with PASS or . in the FILTER column" in the Variants step and read the file again.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(panel(page).getByRole("button")).toHaveCount(0);

  await readAgainWithEveryVariant(page, "empty.vcf");
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(
    panel(page).getByText(
      "empty.vcf has no variants, so there is no variant to calculate the diversity over. Load another variants file in the Variants step.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(panel(page).getByRole("button")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

test("a VCF none of whose variants passed is told to untick the box of the passed variants, and read with every variant gives the table", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(
    page,
    {
      name: "failed.vcf",
      text:
        '##fileformat=VCFv4.2\n##FILTER=<ID=q10,Description="Quality below 10">\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
        "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ta\tb\n" +
        "1\t100\t.\tA\tG\t5\tq10\t.\tGT\t0/1\t1/1\n" +
        "1\t200\t.\tC\tT\t5\tq10\t.\tGT\t0/0\t0/1\n",
    },
    { name: "failed_pops.csv", text: "IID,pop\na,A\nb,A\n" },
    "pop",
  );
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(
    panel(page).getByText(
      /^failed\.vcf has no variant with PASS or \. in its FILTER column/,
    ),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  await readAgainWithEveryVariant(page, "failed.vcf");
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(panel(page).getByRole("rowheader", { name: "A" })).toBeVisible();
});

test("WS8 D2 a variants file the browser can no longer read is told so, with no Run, and the focus goes to the heading", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  const dir = testInfo.outputPath("gone");
  await mkdir(dir, { recursive: true });
  const copy = join(dir, "panel.nei");
  await copyFile(join(FIXTURES, "panel.nei"), copy);
  await load(page, copy, "panel_pops.csv", "popcat");
  await goTo(page, "Analyses");
  await rm(copy);
  await panel(page).getByRole("button", { name: "Run" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    panel(page).getByText(
      "panel.nei could not be read again; it may have changed on the disk since it was picked. Load it again in the Variants step.",
      { exact: true },
    ),
  ).toBeVisible();
  // Run would fail again until the file is loaded again.
  await expect(panel(page).getByRole("button")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 2, name: "Diversity" }),
  ).toBeFocused();
  await expectNoViolations(makeAxeBuilder);

  // Another threshold does not bring Run back: the file is still unread.
  await setThreshold(page, "0.05");
  await goTo(page, "Analyses");
  await expect(
    panel(page).getByText(/^panel\.nei could not be read again/),
  ).toBeVisible();
  await expect(panel(page).getByRole("button")).toHaveCount(0);
});

test("the line of a calculation stopped by a read again goes once the user runs the analysis again, and does not come back after the user's own Stop", async ({
  page,
}) => {
  await load(page, "panel.vcf.gz", "panel_pops.csv", "popcat");
  const first = await calculationWorker(page);
  await holdBack(first, ["result"]);
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(panel(page).getByRole("button", { name: "Stop" })).toBeVisible();
  await readAgainWithEveryVariant(page, "panel.vcf.gz");
  await goTo(page, "Analyses");
  const stoppedLine = panel(page).getByText(/was stopped because/);
  await expect(stoppedLine).toBeVisible();

  // The worker started for the read again keeps its result back too.
  await expect
    .poll(() =>
      page
        .workers()
        .some((w) => w !== first && w.url().includes("runnerWorker")),
    )
    .toBe(true);
  const second = page
    .workers()
    .find((w) => w !== first && w.url().includes("runnerWorker"));
  if (second === undefined) throw new Error("no second calculation worker");
  await holdBack(second, ["result"]);
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(panel(page).getByRole("button", { name: "Stop" })).toBeVisible();
  await expect(stoppedLine).toHaveCount(0);
  await panel(page).getByRole("button", { name: "Stop" }).click();
  await expect(panel(page).getByRole("button", { name: "Run" })).toBeVisible();
  await expect(stoppedLine).toHaveCount(0);
});

test("WS8 D2 a calculation stopped by reading the same VCF again with other options says that, and not that a new file was loaded", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "panel.vcf.gz", "panel_pops.csv", "popcat");
  const worker = await calculationWorker(page);
  await holdBack(worker, ["result"]);
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(panel(page).getByRole("button", { name: "Stop" })).toBeVisible();

  await goTo(page, "Variants");
  await page
    .getByText("Only the variants with PASS or . in the FILTER column", {
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Read panel.vcf.gz again with every variant" })
    .click();
  await goTo(page, "Analyses");
  await expect(
    panel(page).getByText(
      "The calculation of the diversity was stopped because the variants file was read again with other options.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(panel(page).getByText(/a new variants file/)).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
});

/** The twelve individuals of tetraploid.vcf.gz in one population, A. */
const TETRAPLOID_POPS = {
  name: "tetraploid_pops.csv",
  text: `IID,pop\n${Array.from(
    { length: 12 },
    (_, i) => `t${String(i).padStart(2, "0")},A\n`,
  ).join("")}`,
};

test("WS8 D2 tetraploid.vcf.gz read with ploidy 2 is refused in the panel's words, and read again with ploidy 4 runs with its warning", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "tetraploid.vcf.gz", TETRAPLOID_POPS, "pop");
  await goTo(page, "Analyses");
  await expect(
    panel(page).getByText("1 population: A, 12 individuals", { exact: true }),
  ).toBeVisible();
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(
    panel(page).getByText(
      "At line 5 of tetraploid.vcf.gz, the genotype of t00 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.",
      { exact: true },
    ),
  ).toBeVisible();
  // popnei would refuse the same settings again, so Run is not offered.
  await expect(panel(page).getByRole("button")).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);

  await goTo(page, "Variants");
  const ploidy = page.getByLabel("Ploidy of the VCF");
  await ploidy.fill("4");
  await ploidy.press("Enter");
  await page
    .getByRole("button", { name: "Read tetraploid.vcf.gz again with ploidy 4" })
    .click();
  await expect(
    page.getByRole("main").getByText("12 individuals"),
  ).toBeVisible();
  await goTo(page, "Analyses");
  await run(page);
  await expect(
    panel(page).getByRole("heading", { level: 3, name: "1 warning" }),
  ).toBeVisible();
  await expect(
    panel(page).getByText(
      "Warning: Population A has 12 individuals, and a variant has a value in a population only when at least 20 of its individuals have a called genotype there, so A has no values. To have them, merge it with another population in the metadata file.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(row(page, "A")).toHaveText([
    "12",
    "no value",
    "no value",
    "no value",
  ]);
  await expectNoViolations(makeAxeBuilder);
});

/** The calculation worker of the page. */
async function calculationWorker(page: Page): Promise<Worker> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  return worker;
}

test("WS8 D2 a calculation under way shows its bar, its share and its clock, and Stop in place of Run", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", "popcat");
  // The worker keeps the result back, and passes the progress on.
  const worker = await calculationWorker(page);
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
  const button = panel(page).getByRole("button", { name: "Run" });
  await button.focus();
  await page.keyboard.press("Enter");

  const bar = panel(page).getByRole("progressbar", {
    name: "Calculating the diversity",
  });
  await expect(bar).toHaveAttribute("aria-valuetext", "99%");
  await expect(
    panel(page).getByText(/^Calculating · 99% · 0:0\d$/),
  ).toBeVisible();
  // One button, Run then Stop, and the focus stays on it.
  await expect(panel(page).getByRole("button", { name: "Stop" })).toBeFocused();
  await expect(panel(page).getByText(/^Calculating · 99% · 0:01$/)).toBeVisible(
    { timeout: 3000 },
  );
  await expectNoViolations(makeAxeBuilder);

  await page.keyboard.press("Enter");
  await expect(panel(page).getByRole("button", { name: "Run" })).toBeFocused();
  await expect(bar).toHaveCount(0);
});

/** Makes the calculation worker keep back what it posts of `kinds`, and
    leaves on it a function, `__release`, that posts what it kept. */
async function holdBack(
  worker: Worker,
  kinds: readonly string[],
): Promise<void> {
  await worker.evaluate((held) => {
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
      if (typeof kind === "string" && held.includes(kind)) {
        kept.push(message);
      } else {
        post(message, transfer);
      }
    };
    scope.__release = () => {
      scope.postMessage = post;
      for (const message of kept) post(message);
    };
  }, kinds);
}

test("WS8 D2 before its first progress the bar has no value, the clock keeps its start across a change of step, and the focus stays where it was when the run ends", async ({
  page,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", "popcat");
  const worker = await calculationWorker(page);
  await holdBack(worker, ["progress", "result"]);
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();

  const bar = panel(page).getByRole("progressbar", {
    name: "Calculating the diversity",
  });
  await expect(bar).toBeVisible();
  // Busy, with no value: neither 0% nor any other.
  await expect(bar).not.toHaveAttribute("aria-valuenow", /.*/);
  await expect(bar).not.toHaveAttribute("aria-valuetext", /.*/);
  await expect(panel(page).getByText(/^Calculating · 0:02$/)).toBeVisible({
    timeout: 4000,
  });

  // Another step and back: the clock goes on from the start of the run,
  // and does not start again at 0:00.
  await goTo(page, "Variants");
  await goTo(page, "Analyses");
  await expect(panel(page).getByText(/^Calculating · 0:0[2-9]$/)).toBeVisible({
    timeout: 500,
  });

  // The focus is on the heading of the step, not on Stop, so it stays
  // there when the button goes.
  const stepHeading = page.getByRole("heading", { level: 1, name: "Analyses" });
  await expect(stepHeading).toBeFocused();
  await worker.evaluate(() => {
    (globalThis as unknown as { __release: () => void }).__release();
  });
  await expect(panel(page).getByRole("table")).toBeVisible();
  await expect(stepHeading).toBeFocused();
});

test("WS8 D2 a calculation whose worker stopped says so and offers Run, which then gives the table", async ({
  page,
  makeAxeBuilder,
}) => {
  await load(page, "panel.nei", "panel_pops.csv", "popcat");
  // The worker answers the run as if it had crashed.
  const worker = await calculationWorker(page);
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
      if (kind === "result") {
        post({ kind: "crashed", message: "a crash made by the test" });
      } else {
        post(message, transfer);
      }
    };
  });
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(
    panel(page).getByText(
      "The calculation stopped unexpectedly. Run it again. If it stops again, load panel.nei again in the Variants step.",
      { exact: true },
    ),
  ).toBeVisible();
  const button = panel(page).getByRole("button", { name: "Run" });
  await expect(button).toBeEnabled();
  await expectNoViolations(makeAxeBuilder);

  // A new worker, which crashes nothing.
  await button.click();
  await expect(row(page, "p0")).toHaveText([
    "48",
    "0.3519",
    "0.3564",
    "0.9267",
  ]);
});

test("WS8 D2 two warnings are counted on their heading, above the table", async ({
  page,
  makeAxeBuilder,
}) => {
  // t00 with no population, the others in A.
  await load(
    page,
    "tetraploid.vcf.gz",
    {
      name: "tetraploid_pops.csv",
      text: `IID,pop\nt00,\n${Array.from(
        { length: 11 },
        (_, i) => `t${String(i + 1).padStart(2, "0")},A\n`,
      ).join("")}`,
    },
    "pop",
  );
  await goTo(page, "Variants");
  const ploidy = page.getByLabel("Ploidy of the VCF");
  await ploidy.fill("4");
  await ploidy.press("Enter");
  await page
    .getByRole("button", { name: "Read tetraploid.vcf.gz again with ploidy 4" })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Read tetraploid.vcf.gz again with ploidy 4",
    }),
  ).toHaveCount(0);
  await goTo(page, "Analyses");
  await run(page);

  const warnings = panel(page).getByRole("region", { name: "2 warnings" });
  await expect(
    warnings.getByRole("heading", { level: 3, name: "2 warnings" }),
  ).toBeVisible();
  await expect(warnings.getByRole("listitem")).toHaveText([
    /^Warning: Population A has 11 individuals/,
    /^Warning: 1 individual of tetraploid\.vcf\.gz has no population/,
  ]);
  const warningsBox = await warnings.boundingBox();
  const tableBox = await panel(page).getByRole("table").boundingBox();
  if (warningsBox === null || tableBox === null) {
    throw new Error("the warnings or the table are not laid out");
  }
  expect(warningsBox.y + warningsBox.height).toBeLessThanOrEqual(tableBox.y);
  await expectNoViolations(makeAxeBuilder);
});

test("WS8 D2 the line of the versions names popnei's version and the application's, each in its place", async ({
  page,
}) => {
  // The page is told popnei is 0.9.9, so that the two versions differ.
  await page.addInitScript(() => {
    const property = Object.getOwnPropertyDescriptor(
      Worker.prototype,
      "onmessage",
    );
    if (property === undefined) return;
    Object.defineProperty(Worker.prototype, "onmessage", {
      configurable: true,
      get(this: Worker) {
        return property.get?.call(this) as unknown;
      },
      set(this: Worker, handler: ((event: MessageEvent) => void) | null) {
        property.set?.call(
          this,
          handler === null
            ? null
            : (event: MessageEvent<unknown>) => {
                const data = event.data;
                const isReady =
                  typeof data === "object" &&
                  data !== null &&
                  "kind" in data &&
                  data.kind === "ready" &&
                  "popneiVersion" in data;
                handler.call(
                  this,
                  isReady
                    ? new MessageEvent("message", {
                        data: { ...data, popneiVersion: "0.9.9" },
                      })
                    : event,
                );
              },
        );
      },
    });
  });
  await load(page, "panel.nei", "panel_pops.csv", "popcat");
  await goTo(page, "Analyses");
  await run(page);
  await expect(
    panel(page).getByText(
      "Calculated with popnei 0.9.9, in version 0.1.0 of the application.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("WS8 D3 a Stop in the middle of a pass leaves the panel ready with no table, and panel.nei then runs at 0.05", async ({
  page,
  makeAxeBuilder,
}, testInfo) => {
  // The VCF is written for the test, a pass over it lasting 3.5 s in
  // WebKit on the owner's Mac (measure.spec.ts), so that Stop is pressed
  // while the pass reads.
  test.setTimeout(120_000);
  const vcf = testInfo.outputPath("stop.vcf.gz");
  await writeBigVcf(vcf, STOP_VCF_VARIANTS);
  const pops = testInfo.outputPath("stop_pops.csv");
  await writeFile(pops, bigVcfPopsCsv());
  await load(page, vcf, pops, "pop");
  await goTo(page, "Analyses");
  await panel(page).getByRole("button", { name: "Run" }).click();

  // The bar below 100%, or the run ended first, which fails the test: on a
  // machine that reads the file before the bar is seen, Stop would reach a
  // run that has ended, and the test would check nothing.
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

  // popnei's wasm held back from the worker that the stop starts, so that
  // the next run waits for the file to be opened again.
  const held: Route[] = [];
  await page.route("**/*.wasm", (route) => {
    held.push(route);
  });
  await panel(page).getByRole("button", { name: "Stop" }).click();
  await expect(panel(page).getByRole("button", { name: "Run" })).toBeVisible();
  await expect(bars).toHaveCount(0);
  await expect(table).toHaveCount(0);
  await expect(
    panel(page).getByText("3 populations: a, 334 individuals; b, 333; c, 333", {
      exact: true,
    }),
  ).toBeVisible();
  await expectNoViolations(makeAxeBuilder);

  // Run again after the stop: it waits for the file to be opened again.
  await panel(page).getByRole("button", { name: "Run" }).click();
  await expect(
    panel(page).getByText(
      /^Waiting for stop\.vcf\.gz to be opened again, then calculating · \d:\d\d$/,
    ),
  ).toBeVisible();

  // The page goes on: panel.nei loaded during that run stops it, and the
  // panel says so while the notice is up.
  await goTo(page, "Variants");
  await pick(page, "Variants file", "panel.nei");
  await goTo(page, "Analyses");
  await expect(
    panel(page).getByText(
      "The calculation of the diversity was stopped because a new variants file was loaded.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(bars).toHaveCount(0);
  await expectNoViolations(makeAxeBuilder);
  for (const route of held) await route.continue();
  await page.unroute("**/*.wasm");
  await goTo(page, "Variants");
  await expect(
    page.getByRole("main").getByText("200 individuals"),
  ).toBeVisible();
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", "panel_pops.csv");
  await expect(page.getByText(/^All 200 individuals of /)).toBeVisible();
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: "popcat", exact: true }).click();
  await setThreshold(page, "0.05");
  await goTo(page, "Analyses");
  await run(page);
  await expect(row(page, "p0")).toHaveText([
    "48",
    "0.3527",
    "0.3567",
    "0.9288",
  ]);
});
