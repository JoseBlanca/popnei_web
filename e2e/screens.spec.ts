/**
 * Not a test: it takes the probe through its states and writes a PNG of
 * each into screens/, which git ignores, for a person to look at
 * (testing.md, "The screens, as pictures"). The probe has the browser's
 * default look and no dark theme, so each state is taken once, in light.
 */
import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { expect, test } from "@playwright/test";
import type { Locator, Page, Route } from "@playwright/test";

import { writeBigVcf } from "./bigVcf.ts";
import { crashWorkerOn } from "./crashWorker.ts";
import { holdSummary, release } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");
const SCREENS = join(import.meta.dirname, "..", "screens");

/** The panel of the diversity, its region named by its heading: the
    Analyses step holds the principal components' panel beside it, with
    a Run of its own. */
function diversityPanel(page: Page): Locator {
  return page.getByRole("region", { name: "Diversity", exact: true });
}

/** Saves the whole page as `name`, or only the window with `fullPage`
    false, which shows a toast fixed at the bottom of the window where the
    user sees it. */
async function save(
  page: Page,
  name: string,
  { fullPage }: { readonly fullPage: boolean } = { fullPage: true },
): Promise<void> {
  await page.screenshot({ path: join(SCREENS, `${name}.png`), fullPage });
}

async function pick(page: Page, fixture: string): Promise<void> {
  const input = page.getByLabel("Variant file", { exact: true });
  await expect(input).toBeEnabled();
  await input.setInputFiles(join(FIXTURES, fixture));
}

test("the served file shown", async ({ page }) => {
  await page.goto("probe.html");
  await expect(page.getByText("panel.nei: 200 individuals")).toBeVisible();
  await save(page, "probe-served-shown-light");
});

test("a file of the user shown", async ({ page }) => {
  await page.goto("probe.html");
  await expect(page.getByText("panel.nei: 200 individuals")).toBeVisible();
  await pick(page, "panel.vcf.gz");
  await expect(page.getByText("panel.vcf.gz: 200 individuals")).toBeVisible();
  await save(page, "probe-file-shown-light");
});

test("a file refused", async ({ page }) => {
  await page.goto("probe.html");
  await expect(page.getByText("panel.nei: 200 individuals")).toBeVisible();
  await pick(page, "bad.vcf");
  await expect(page.getByText("bad.vcf could not be opened")).toBeVisible();
  await save(page, "probe-file-refused-light");
});

test("popnei not loaded", async ({ page }) => {
  await page.route("**/*.wasm", (route) => route.fulfill({ status: 404 }));
  await page.goto("probe.html");
  await expect(
    page.getByText("popnei could not be loaded.", { exact: true }),
  ).toBeVisible();
  await save(page, "probe-popnei-not-loaded-light");
});

test("the probe's worker not started", async ({ page }) => {
  await page.route("**/probeWorker-*.js", (route) =>
    route.fulfill({ status: 404 }),
  );
  await page.goto("probe.html");
  await expect(
    page.getByText("The probe's worker did not start.", { exact: true }),
  ).toBeVisible();
  await save(page, "probe-worker-not-started-light");
});

test("popnei loading", async ({ page }) => {
  // The wasm is held back, and not answered while the picture is taken.
  await page.route("**/*.wasm", () => undefined);
  await page.goto("probe.html");
  await expect(page.getByText("Loading popnei…")).toBeVisible();
  await save(page, "probe-popnei-loading-light");
});

test("the probe's worker stopped by a trap of popnei", async ({ page }) => {
  const started = page.waitForEvent("worker");
  await page.goto("probe.html");
  const worker = await started;
  await expect(page.getByText("panel.nei: 200 individuals")).toBeVisible();
  await worker.evaluate(() => {
    performance.now = () => {
      throw new WebAssembly.RuntimeError("unreachable");
    };
  });
  await page.getByLabel("Variant file", { exact: true }).focus();
  await pick(page, "panel.nei");
  await expect(
    page.getByText("A defect of the probe: its worker stopped."),
  ).toBeVisible();
  await save(page, "probe-worker-stopped-light");
});

/** Picks `file`, a fixture or a file of a name and text, with the button
    of the Variants step. */
async function pickVariants(
  page: Page,
  file: string | { name: string; text: string } | { path: string },
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (
    await chooser
  ).setFiles(
    typeof file === "string"
      ? join(FIXTURES, file)
      : "path" in file
        ? file.path
        : {
            name: file.name,
            mimeType: "text/plain",
            buffer: Buffer.from(file.text),
          },
  );
}

/** Drops the fixtures `names` on the zone of the Variants step, as the
    flows of e2e/variants.spec.ts do. */
async function dropVariants(
  page: Page,
  names: readonly string[],
): Promise<void> {
  const files = await Promise.all(
    names.map(async (name) => ({
      name,
      bytes: [...(await readFile(join(FIXTURES, name)))],
    })),
  );
  const dataTransfer = await page.evaluateHandle((given) => {
    // Chromium gives a file put into a DataTransfer by a script no entry
    // of the file system, and React Aria skips an item without one.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its item, by call
    const entryOf = DataTransferItem.prototype.webkitGetAsEntry;
    DataTransferItem.prototype.webkitGetAsEntry = function (
      this: DataTransferItem,
    ) {
      return (
        entryOf.call(this) ??
        ({ isFile: true, isDirectory: false } as FileSystemEntry)
      );
    };
    const transfer = new DataTransfer();
    for (const file of given) {
      transfer.items.add(new File([new Uint8Array(file.bytes)], file.name));
    }
    return transfer;
  }, files);
  const target = page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ });
  for (const type of ["dragenter", "dragover", "drop"]) {
    await target.dispatchEvent(type, { dataTransfer });
  }
}

/** Goes to a step of the page by its link in the stepper. */
async function goTo(page: Page, step: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: step })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

/** Picks `file`, a fixture or a file of a name and text, with the button
    of the Individuals step. */
async function pickIndividuals(
  page: Page,
  file: string | { name: string; text: string | Buffer },
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Metadata file" })
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
          buffer:
            typeof file.text === "string" ? Buffer.from(file.text) : file.text,
        },
  );
}

/** Chooses `option` in the select of that label, with the mouse. */
async function choose(
  page: Page,
  label: string,
  option: string,
): Promise<void> {
  await page.getByRole("button", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** panel_pops.csv without twelve individuals of panel.nei. */
async function withoutTwelve(): Promise<string> {
  const leftOut = new Set([
    "s031",
    "s044",
    "s050",
    "s051",
    "s052",
    "s053",
    "s054",
    "s055",
    "s056",
    "s057",
    "s058",
    "s059",
  ]);
  const text = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
  return `${text
    .split("\n")
    .filter((line) => line !== "" && !leftOut.has(line.split(",")[0] ?? ""))
    .join("\n")}\n`;
}

/** Loads panel.nei and panel_pops.csv, chooses the column popcat, and
    stays at the Individuals step. */
async function loadPanelWithPopulations(page: Page): Promise<void> {
  await pickVariants(page, "panel.nei");
  await expect(
    page.getByRole("main").getByText("200 individuals"),
  ).toBeVisible();
  await goTo(page, "Individuals");
  await pickIndividuals(page, "panel_pops.csv");
  await choose(page, "Column that defines the populations", "popcat");
  await expect(
    page.getByRole("main").getByText("p0, 48 individuals"),
  ).toBeAttached();
}

/** Loads tetraploid.vcf.gz, read with ploidy 2, and its twelve
    individuals in one population, A, and goes back to the Variants
    step. */
async function loadTetraploid(page: Page): Promise<void> {
  await pickVariants(page, "tetraploid.vcf.gz");
  await expect(
    page.getByRole("main").getByText("12 individuals"),
  ).toBeVisible();
  await goTo(page, "Individuals");
  await pickIndividuals(page, {
    name: "tetraploid_pops.csv",
    text: `IID,pop\n${Array.from(
      { length: 12 },
      (_, i) => `t${String(i).padStart(2, "0")},A\n`,
    ).join("")}`,
  });
  await choose(page, "Column that defines the populations", "pop");
  await expect(
    page.getByRole("main").getByText("A, 12 individuals"),
  ).toBeAttached();
  await goTo(page, "Variants");
}

/** Makes the calculation worker keep its results back and pass its
    progress on, so that a calculation stays under way. */
async function holdResults(page: Page): Promise<void> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
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
}

/** Makes the calculation worker keep its results back, and the progress
    of every pass after the first, so that a calculation of two passes
    stays under way in its first. */
async function holdAfterFirstPass(page: Page): Promise<void> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  await worker.evaluate(() => {
    const scope = globalThis as unknown as {
      postMessage: (message: unknown, transfer?: Transferable[]) => void;
    };
    const post = scope.postMessage.bind(scope);
    scope.postMessage = (message, transfer) => {
      if (typeof message !== "object" || message === null) {
        post(message, transfer);
        return;
      }
      const kind = "kind" in message ? message.kind : null;
      const pass = "pass" in message ? message.pass : null;
      if (kind === "result") return;
      if (kind === "progress" && typeof pass === "number" && pass > 1) return;
      post(message, transfer);
    };
  });
}

/** The panel of the diversity's field `label`, given `value` and
    committed with Enter. */
async function setDiversityField(
  page: Page,
  label: string,
  value: string,
): Promise<void> {
  const field = diversityPanel(page).getByLabel(label);
  await field.fill(value);
  await field.press("Enter");
  await expect(field).toHaveValue(value);
}

/** The labels of the three fields of the diversity. */
const DIVERSITY_MINIMUM =
  "Individuals with a called genotype needed in each population, per variant";
const DIVERSITY_DRAW =
  "Chromosomes drawn for the rarefaction, a whole number from 2";

/** Makes the calculation worker keep back the files it writes and pass
    its progress on, so that a write stays under way. */
async function holdWritten(page: Page): Promise<void> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
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
      if (kind !== "written") post(message, transfer);
    };
  });
}

/** What the calculation worker does with the files it writes: posts
    them with the counts of a pass that kept `numVars` variants, of the
    missing data filter, in place of their own; posts a crash in their
    place; posts popnei's refusal `message` in their place; or keeps them
    back until `writtenAs` is called again. A test hook of the pictures,
    so that a size of gigabytes is reached with panel.nei. */
type WrittenAs =
  | { readonly kind: "counted"; readonly numVars: number }
  | { readonly kind: "crashed" }
  | { readonly kind: "refused"; readonly message: string }
  | { readonly kind: "held" }
  | { readonly kind: "released" };

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
      heldWritten?: unknown[];
    };
    const first = scope.writtenAs === undefined;
    scope.writtenAs = given;
    const post = first
      ? scope.postMessage.bind(scope)
      : (scope as unknown as { post: (m: unknown) => void }).post;
    (scope as unknown as { post: (m: unknown) => void }).post = post;
    if (given.kind === "released") {
      for (const message of scope.heldWritten ?? []) post(message);
      scope.heldWritten = [];
    }
    if (!first) return;
    scope.heldWritten = [];
    scope.postMessage = (message, transfer) => {
      const as = scope.writtenAs;
      const written =
        typeof message === "object" &&
        message !== null &&
        "kind" in message &&
        message.kind === "written";
      if (!written || as === undefined || as.kind === "released") {
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
        case "held":
          scope.heldWritten?.push(message);
          break;
      }
    };
  }, as);
}

/** Chooses the radio button `name` of `group` by a click on its words. */
async function chooseRadio(group: Locator, name: string): Promise<void> {
  await group.locator("label").filter({ hasText: name }).click();
  await expect(group.getByRole("radio", { name })).toBeChecked();
}

/** Loads panel.nei and panel_meta.csv, chooses popcat, goes to the
    Analyses step, and gives the panel of the principal components. */
async function pcaPanel(page: Page): Promise<Locator> {
  await pickVariants(page, "panel.nei");
  await expect(
    page.getByRole("main").getByText("200 individuals"),
  ).toBeVisible();
  await goTo(page, "Individuals");
  await pickIndividuals(page, "panel_meta.csv");
  await choose(page, "Column that defines the populations", "popcat");
  await goTo(page, "Analyses");
  return page.getByRole("region", { name: "Principal components" });
}

/** Sets the PCA's own LD filter within 50000 base pairs. */
async function ownLdDistance(panel: Locator): Promise<void> {
  await chooseRadio(
    panel.getByRole("radiogroup", {
      name: "Prune the variants by linkage disequilibrium (LD)",
    }),
    "For the PCA alone",
  );
  const field = panel.getByLabel(
    "Distance within which variants are compared, in base pairs, from 1",
  );
  await field.fill("50000");
  await field.press("Enter");
}

/** The panel of the principal components with the PCA run, with its own
    LD filter within 50000 base pairs when `ownLd`. */
async function pcaRun(page: Page, ownLd: boolean): Promise<Locator> {
  const panel = await pcaPanel(page);
  if (ownLd) await ownLdDistance(panel);
  await panel.getByRole("button", { name: "Run", exact: true }).click();
  await expect(panel.getByText(/^The place of each of the 200/)).toBeVisible({
    timeout: 30_000,
  });
  return panel;
}

// The page of the population genetics application, in both themes, since
// its dark theme is the same page with other colours and breaks on its own.
for (const theme of ["light", "dark"] as const) {
  test.describe(`popgen.html, ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      // Reduced motion, so that no picture is taken halfway through a
      // transition of colour.
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
      await page.goto("popgen.html");
      await expect(
        page.getByRole("heading", { level: 1, name: "Variants" }),
      ).toBeVisible();
    });

    test("the page opened, at Variants", async ({ page }) => {
      await save(page, `popgen-opened-${theme}`);
    });

    for (const step of ["Individuals", "Analyses"]) {
      test(`the frame at ${step}`, async ({ page }) => {
        await page
          .getByRole("navigation", { name: "Steps" })
          .getByRole("link", { name: step })
          .click();
        await expect(
          page.getByRole("heading", { level: 1, name: step }),
        ).toBeFocused();
        await save(page, `popgen-${step.toLowerCase()}-${theme}`);
      });
    }

    test("the focus ring on a link of the stepper", async ({ page }) => {
      // The Tab key, so that the browser shows the ring of the keyboard:
      // "popnei web", Open project…, Save project, Variants, Individuals;
      // Undo and Redo, disabled on a page just opened, are not stops.
      for (let press = 0; press < 5; press++) {
        await page.keyboard.press("Tab");
      }
      await expect(
        page
          .getByRole("navigation", { name: "Steps" })
          .getByRole("link", { name: "Individuals" }),
      ).toBeFocused();
      await save(page, `popgen-focus-${theme}`);
    });

    test("the Variants step with no file", async ({ page }) => {
      await save(page, `popgen-variants-empty-${theme}`);
    });

    test("the Variants step reading a file", async ({ page }) => {
      // The wasm is held back, so the read waits for the calculation
      // worker; the page was opened before, so it is fetched again here.
      await page.route("**/*.wasm", () => undefined);
      await page.reload();
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("1 second so far."),
      ).toBeVisible();
      await save(page, `popgen-variants-reading-${theme}`);
    });

    test("the Variants step, a .nei file read", async ({ page }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await save(page, `popgen-variants-nei-read-${theme}`);
    });

    test("the Variants step, the histograms of the variants running", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await holdResults(page);
      await page
        .getByRole("button", {
          name: "Calculate the histograms of the variants",
        })
        .click();
      await expect(
        page.getByRole("main").getByText(/^Calculating · \d+% · 0:0\d$/),
      ).toBeVisible();
      await save(page, `popgen-variants-histograms-running-${theme}`);
    });

    test("the Variants step, the histograms done with the thresholds of their filters", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Calculate the histograms of the variants",
        })
        .click();
      for (const name of [
        "Filter the variants by observed heterozygosity",
        "Filter the variants by major allele frequency (MAF)",
      ]) {
        await page.getByText(name, { exact: true }).click();
      }
      await expect(page.locator("line.chart-threshold")).toHaveCount(2);
      await save(page, `popgen-variants-histograms-done-${theme}`);
      // The table of the bins of the MAF.
      await page
        .getByRole("group", { name: /^Major allele frequency/ })
        .getByRole("tab", { name: "Table of the bins" })
        .click();
      await expect(
        page.getByRole("table", {
          name: "The bins of the major allele frequency",
        }),
      ).toBeVisible();
      await save(page, `popgen-variants-histograms-table-${theme}`);
      await page.setViewportSize({ width: 320, height: 900 });
      await save(page, `popgen-variants-histograms-320-${theme}`);
    });

    test("the Variants step, the histograms in error, the ploidy refused", async ({
      page,
    }) => {
      await pickVariants(page, "tetraploid.vcf.gz");
      await expect(
        page.getByRole("main").getByText("12 individuals"),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Calculate the histograms of the variants",
        })
        .click();
      await expect(
        page.getByRole("main").getByText(/^At line 5 of tetraploid\.vcf\.gz/),
      ).toBeVisible();
      await save(page, `popgen-variants-histograms-error-${theme}`);
    });

    test("the Variants step, the counts done, then not counted after a change", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await page
        .getByText("Filter the variants by major allele frequency (MAF)", {
          exact: true,
        })
        .click();
      const count = page.getByRole("button", {
        name: "Count the variants each filter keeps",
      });
      // With the keyboard, so that the line of the total takes the focus,
      // as it does in every engine.
      await count.focus();
      await page.keyboard.press("Enter");
      // In the section of the filters: the status region may say the
      // same words for a moment.
      await expect(
        page
          .getByRole("region", { name: "Filters of the variants" })
          .getByText(
            / of the 1,200 variants of panel\.nei pass the filters\.$/,
          ),
      ).toBeFocused();
      await save(page, `popgen-variants-counts-done-${theme}`);
      const threshold = page.getByLabel("Maximum major allele frequency", {
        exact: false,
      });
      await threshold.fill("0.9");
      await threshold.press("Enter");
      await expect(
        page.getByText(/^Not counted for these filters\./),
      ).toBeVisible();
      await save(page, `popgen-variants-counts-changed-${theme}`);
    });

    test("the Variants step, a filter that kept none", async ({ page }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await page
        .getByText("Filter the variants by major allele frequency (MAF)", {
          exact: true,
        })
        .click();
      const threshold = page.getByLabel("Maximum major allele frequency", {
        exact: false,
      });
      await threshold.fill("0.4");
      await threshold.press("Enter");
      await page
        .getByRole("button", { name: "Count the variants each filter keeps" })
        .click();
      await expect(
        page.getByRole("main").getByText(/The MAF filter kept none of the /),
      ).toBeVisible();
      await save(page, `popgen-variants-counts-kept-none-${theme}`);
    });

    test("the Variants step, the Count running", async ({ page }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await holdResults(page);
      await page
        .getByRole("button", { name: "Count the variants each filter keeps" })
        .click();
      await expect(
        page
          .getByRole("region", { name: "Filters of the variants" })
          .getByText(/^Calculating · \d+% · 0:0\d$/),
      ).toBeVisible();
      await save(page, `popgen-variants-counts-running-${theme}`);
    });

    test("the Variants step, the Count in error, the ploidy refused", async ({
      page,
    }) => {
      await pickVariants(page, "tetraploid.vcf.gz");
      await expect(
        page.getByRole("main").getByText("12 individuals"),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Count the variants each filter keeps" })
        .click();
      await expect(
        page
          .getByRole("region", { name: "Filters of the variants" })
          .getByText(/^At line 5 of tetraploid\.vcf\.gz/),
      ).toBeVisible();
      await save(page, `popgen-variants-counts-error-${theme}`);
    });

    test("the Variants step, the histograms removed by a new load, with their notice", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await page
        .getByRole("button", {
          name: "Calculate the histograms of the variants",
        })
        .click();
      await expect(
        page.getByText(
          "Over the 1,200 variants of panel.nei, before any filter.",
        ),
      ).toBeVisible();
      await pickVariants(page, "panel.vcf.gz");
      await expect(
        page.getByText(
          /^The histograms of the variants were removed because a new variants file was loaded\./,
        ),
      ).toBeVisible();
      await save(page, `popgen-variants-histograms-removed-${theme}`);
    });

    test("the Variants step, a VCF read", async ({ page }) => {
      await pickVariants(page, "panel.vcf.gz");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await save(page, `popgen-variants-vcf-read-${theme}`);
    });

    test("the Variants step, a VCF to read again with ploidy 4", async ({
      page,
    }) => {
      await pickVariants(page, "tetraploid.vcf.gz");
      await expect(
        page.getByRole("main").getByText("12 individuals"),
      ).toBeVisible();
      const ploidy = page.getByLabel("Ploidy of the VCF");
      await ploidy.fill("4");
      await ploidy.press("Tab");
      await page.keyboard.press("Tab");
      await expect(
        page.getByRole("button", {
          name: "Read tetraploid.vcf.gz again with ploidy 4",
        }),
      ).toBeFocused();
      await save(page, `popgen-variants-read-again-${theme}`);
    });

    test("the Variants step, bad.vcf refused", async ({ page }) => {
      await pickVariants(page, "bad.vcf");
      await expect(
        page.getByRole("main").getByText(/^popnei could not read bad\.vcf/),
      ).toBeVisible();
      await save(page, `popgen-variants-refused-${theme}`);
    });

    test("the Variants step, a file of another name not loaded", async ({
      page,
    }) => {
      await pickVariants(page, { name: "panel.txt", text: "not variants" });
      await expect(
        page.getByRole("main").getByText(/^panel\.txt was not loaded/),
      ).toBeVisible();
      await save(page, `popgen-variants-not-loaded-${theme}`);
    });

    test("the Variants step, several files dropped", async ({ page }) => {
      await dropVariants(page, ["panel.nei", "panel.vcf.gz"]);
      await expect(
        page.getByRole("main").getByText("Load one variants file at a time."),
      ).toBeVisible();
      await save(page, `popgen-variants-several-dropped-${theme}`);
    });

    test("the Variants step, a VCF to read again with every variant", async ({
      page,
    }) => {
      await pickVariants(page, "panel.vcf.gz");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await page
        .getByText("Only the variants with PASS or . in the FILTER column", {
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Read panel.vcf.gz again with every variant",
        }),
      ).toBeVisible();
      await save(page, `popgen-variants-read-again-passed-${theme}`);
    });

    test("the Variants step, the calculations could not start", async ({
      page,
    }) => {
      await page.route("**/*.wasm", (route) => route.fulfill({ status: 404 }));
      await page.reload();
      await pickVariants(page, "panel.nei");
      await expect(
        page
          .getByRole("main")
          .getByText(
            /Save the project, reload the page, open the project and choose panel\.nei again\.$/,
          ),
      ).toBeVisible();
      await save(page, `popgen-variants-could-not-start-${theme}`);
    });

    test("the Variants step, a file the browser can no longer read", async ({
      page,
    }, testInfo) => {
      // The wasm is held until the picked file is gone from the disk, so
      // that the calculation worker opens it only then.
      const held: Route[] = [];
      await page.route("**/*.wasm", (route) => {
        held.push(route);
      });
      await page.reload();
      const path = testInfo.outputPath("panel.nei");
      await writeFile(path, await readFile(join(FIXTURES, "panel.nei")));
      await pickVariants(page, { path });
      await expect(
        page.getByRole("main").getByText("Reading panel.nei."),
      ).toBeVisible();
      await unlink(path);
      await expect.poll(() => held.length).toBeGreaterThan(0);
      for (const route of held) await route.continue();
      await expect(
        page.getByRole("main").getByText(/it may have changed on the disk/),
      ).toBeVisible();
      await save(page, `popgen-variants-no-longer-read-${theme}`);
    });

    test("the Variants step, a VCF to read again with both options", async ({
      page,
    }) => {
      await pickVariants(page, "tetraploid.vcf.gz");
      await expect(
        page.getByRole("main").getByText("12 individuals"),
      ).toBeVisible();
      const ploidy = page.getByLabel("Ploidy of the VCF");
      await ploidy.fill("4");
      await ploidy.press("Enter");
      await page
        .getByText("Only the variants with PASS or . in the FILTER column", {
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Read tetraploid.vcf.gz again with ploidy 4 and every variant",
        }),
      ).toBeVisible();
      await save(page, `popgen-variants-read-again-both-${theme}`);
    });

    test("the Variants step, a threshold refused", async ({ page }) => {
      const threshold = page.getByLabel(
        "Maximum proportion of missing genotypes",
      );
      await threshold.fill("10");
      await threshold.press("Enter");
      await expect(
        page
          .getByRole("main")
          .getByText("10 is more than 1; the threshold stays 0.1."),
      ).toBeVisible();
      await save(page, `popgen-variants-threshold-refused-${theme}`);
    });

    test("the Variants step, a comma typed in the threshold", async ({
      page,
    }) => {
      const threshold = page.getByLabel(
        "Maximum proportion of missing genotypes",
      );
      await threshold.fill("");
      await threshold.pressSequentially("0,2");
      await threshold.press("Enter");
      await expect(
        page
          .getByRole("main")
          .getByText(
            "Write the decimals with a point, 0.1 and not 0,1; the threshold stays 0.1.",
          ),
      ).toBeVisible();
      await save(page, `popgen-variants-comma-${theme}`);
    });

    test("the Variants step, a ploidy refused", async ({ page }) => {
      const ploidy = page.getByLabel("Ploidy of the VCF");
      await ploidy.fill("2.5");
      await ploidy.press("Tab");
      await expect(
        page
          .getByRole("main")
          .getByText("2.5 is not a whole number; the ploidy stays 2."),
      ).toBeVisible();
      await save(page, `popgen-variants-ploidy-refused-${theme}`);
    });

    test("the Variants step, a piece of text dropped", async ({ page }) => {
      const dataTransfer = await page.evaluateHandle(() => {
        const transfer = new DataTransfer();
        transfer.setData("text/plain", "panel.nei");
        return transfer;
      });
      const target = page
        .getByRole("region", { name: "Variants file" })
        .getByRole("button", { name: /^(Choose|Replace) .*…$/ });
      for (const type of ["dragenter", "dragover", "drop"]) {
        await target.dispatchEvent(type, { dataTransfer });
      }
      await expect(
        page
          .getByRole("main")
          .getByText("Load a VCF or a .nei file, not a piece of text."),
      ).toBeVisible();
      await save(page, `popgen-variants-text-dropped-${theme}`);
    });

    test("the Variants step, the missing data filter off", async ({ page }) => {
      // With the mouse, on its words, as a user does.
      await page
        .getByText("Filter the variants by missing data", { exact: true })
        .click();
      await expect(
        page.getByLabel("Maximum proportion of missing genotypes"),
      ).toHaveCount(0);
      await save(page, `popgen-variants-filter-off-${theme}`);
    });

    test("the Variants step, a file read and the four filters on", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      for (const name of [
        "Filter the variants by observed heterozygosity",
        "Filter the variants by major allele frequency (MAF)",
        "Prune the variants by linkage disequilibrium (LD)",
      ]) {
        await page.getByText(name, { exact: true }).click();
      }
      await expect(page.getByLabel("Maximum r² with a variant")).toHaveValue(
        "0.3",
      );
      await save(page, `popgen-variants-filters-on-${theme}`);
    });

    test("the Variants step, a distance refused", async ({ page }) => {
      await page
        .getByText("Prune the variants by linkage disequilibrium (LD)", {
          exact: true,
        })
        .click();
      const distance = page.getByLabel("Distance within which variants");
      await distance.fill("2.5");
      await distance.press("Enter");
      await expect(
        page
          .getByRole("main")
          .getByText(
            "2.5 is not a whole number; the distance is still to be typed.",
          ),
      ).toBeVisible();
      await save(page, `popgen-variants-distance-refused-${theme}`);
    });

    test("the Variants step, the LD pruning on with no distance and its locks", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await page
        .getByText("Prune the variants by linkage disequilibrium (LD)", {
          exact: true,
        })
        .click();
      await expect(
        page
          .getByRole("button", { name: "Count the variants each filter keeps" })
          .first(),
      ).toBeDisabled();
      await save(page, `popgen-variants-ld-no-distance-${theme}`);
    });

    test("the Variants step, the LD pruning with a distance, counted", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await page
        .getByText("Prune the variants by linkage disequilibrium (LD)", {
          exact: true,
        })
        .click();
      const distance = page.getByLabel("Distance within which variants");
      await distance.fill("50000");
      await distance.press("Enter");
      await page
        .getByRole("button", { name: "Count the variants each filter keeps" })
        .click();
      await expect(
        page
          .getByRole("region", { name: "Filters of the variants" })
          .getByText(/^Kept [\d,]+ of the [\d,]+ variants it was given\.$/)
          .last(),
      ).toBeVisible();
      await save(page, `popgen-variants-ld-counted-${theme}`);
    });

    test("the Variants step, the missing data filter turned off and on again after a Count, its count back from the cache", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      const filters = page.getByRole("region", {
        name: "Filters of the variants",
      });
      await filters
        .getByRole("button", { name: "Count the variants each filter keeps" })
        .click();
      await expect(filters.getByText(/^Kept /)).toHaveCount(1);
      const missing = "Filter the variants by missing data";
      await filters.getByText(missing, { exact: true }).click();
      await expect(filters.getByText(/^Kept /)).toHaveCount(0);
      await filters.getByText(missing, { exact: true }).click();
      await expect(filters.getByText(/^Kept /)).toHaveText([
        "Kept 1,200 of the 1,200 variants it was given.",
      ]);
      await save(page, `popgen-variants-count-back-${theme}`);
    });

    test("the Variants step, the LD pruning turned on after a Count: the counts gone and the Count locked", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      const filters = page.getByRole("region", {
        name: "Filters of the variants",
      });
      await filters
        .getByRole("button", { name: "Count the variants each filter keeps" })
        .click();
      await expect(filters.getByText(/^Kept /)).toHaveCount(1);
      await filters
        .getByText("Prune the variants by linkage disequilibrium (LD)", {
          exact: true,
        })
        .click();
      await expect(filters.getByText(/^Kept /)).toHaveCount(0);
      await expect(
        filters.getByRole("button", {
          name: "Count the variants each filter keeps",
        }),
      ).toBeDisabled();
      await save(page, `popgen-variants-ld-after-count-${theme}`);
    });

    test("the Variants step, the MAF filter turned off at 0.9 and on again, with its value kept", async ({
      page,
    }) => {
      const maf = "Filter the variants by major allele frequency (MAF)";
      await page.getByText(maf, { exact: true }).click();
      const threshold = page.getByLabel("Maximum major allele frequency", {
        exact: false,
      });
      await threshold.fill("0.9");
      await threshold.press("Enter");
      await page.getByText(maf, { exact: true }).click();
      await expect(threshold).toHaveCount(0);
      await save(page, `popgen-variants-filter-kept-off-${theme}`);
      await page.getByText(maf, { exact: true }).click();
      await expect(threshold).toHaveValue("0.9");
      await save(page, `popgen-variants-filter-kept-on-${theme}`);
    });

    test("the Variants step, the four filters on at 320 px", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      for (const name of [
        "Filter the variants by observed heterozygosity",
        "Filter the variants by major allele frequency (MAF)",
        "Prune the variants by linkage disequilibrium (LD)",
      ]) {
        await page.getByText(name, { exact: true }).click();
      }
      await expect(page.getByLabel("Maximum r² with a variant")).toHaveValue(
        "0.3",
      );
      await save(page, `popgen-variants-filters-320-${theme}`);
    });

    test("the Individuals step with no file", async ({ page }) => {
      await goTo(page, "Individuals");
      await save(page, `popgen-individuals-empty-${theme}`);
    });

    test("the Individuals step reading a file", async ({ page }) => {
      // The script of the light worker is held back, so the read waits.
      await page.route("**/filesRunner-*.js", () => undefined);
      await goTo(page, "Individuals");
      await pickIndividuals(page, "panel_pops.csv");
      await expect(
        page.getByRole("main").getByText("Reading panel_pops.csv."),
      ).toBeVisible();
      await save(page, `popgen-individuals-reading-${theme}`);
    });

    test("the Individuals step, a file read and a column chosen", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      await pickIndividuals(page, "panel_pops.csv");
      await choose(page, "Column that defines the populations", "popcat");
      await expect(
        page.getByRole("main").getByText("p0, 48 individuals"),
      ).toBeAttached();
      await save(page, `popgen-individuals-read-${theme}`);
    });

    test("the Individuals step, a file read and no column chosen", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      await pickIndividuals(page, "panel_pops.csv");
      await expect(
        page.getByText("All 200 individuals of panel.nei found"),
      ).toBeVisible();
      await save(page, `popgen-individuals-no-column-${theme}`);
    });

    test("the Individuals step, all individuals in one population", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      await pickIndividuals(page, "panel_pops.csv");
      await choose(
        page,
        "Column that defines the populations",
        "All individuals in one population",
      );
      await expect(
        page.getByRole("main").getByText("All individuals, 200 individuals"),
      ).toBeAttached();
      await save(page, `popgen-individuals-one-population-${theme}`);
    });

    test("the Individuals step, a metadata file not read when the project was saved", async ({
      page,
    }) => {
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Open project…" }).click();
      await (
        await chooser
      ).setFiles(
        join(
          import.meta.dirname,
          "..",
          "src",
          "core",
          "fixtures",
          "projectFile",
          "v1-metadata-not-read.popnei.json",
        ),
      );
      await goTo(page, "Individuals");
      await expect(
        page
          .getByRole("main")
          .getByText(/^pops\.csv was not read when this project was saved/),
      ).toBeVisible();
      await save(page, `popgen-individuals-not-given-${theme}`);
    });

    test("the diversity ready with no metadata file", async ({ page }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Analyses");
      await expect(
        page.getByText("1 population, All individuals: 200 individuals"),
      ).toBeVisible();
      await save(page, `popgen-diversity-one-population-ready-${theme}`);
    });

    test("the Individuals step, a file refused", async ({ page }) => {
      await goTo(page, "Individuals");
      await pickIndividuals(page, {
        name: "short.csv",
        text: "IID;popcat;region\ns000;p0;north\ns001;p0\n",
      });
      await expect(
        page.getByRole("main").getByText(/^short\.csv could not be read/),
      ).toBeVisible();
      await save(page, `popgen-individuals-refused-${theme}`);
    });

    test("the Individuals step, a variants file refused", async ({ page }) => {
      await goTo(page, "Individuals");
      await pickIndividuals(page, {
        name: "panel.txt",
        text: "##fileformat=VCFv4.2\n#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ti1\n",
      });
      await expect(
        page
          .getByRole("main")
          .getByText(/^panel\.txt could not be read: it is a variants file/),
      ).toBeVisible();
      await save(page, `popgen-individuals-variants-file-${theme}`);
    });

    test("the Individuals step, a variants file told by its name", async ({
      page,
    }) => {
      await goTo(page, "Individuals");
      await pickIndividuals(page, { name: "panel.vcf.gz", text: "x" });
      await expect(
        page.getByRole("main").getByText(/^panel\.vcf\.gz was not loaded/),
      ).toBeVisible();
      await save(page, `popgen-individuals-variants-name-${theme}`);
    });

    test("the Individuals step, a character not decoded", async ({ page }) => {
      await goTo(page, "Individuals");
      await pickIndividuals(page, {
        name: "pops.csv",
        text: Buffer.concat([
          Buffer.from([0xef, 0xbb, 0xbf]),
          Buffer.from("IID;País\r\ns000;España\r\ns001;Ita"),
          Buffer.from([0xff]),
          Buffer.from("lia\r\ns002;Perú\r\n"),
        ]),
      });
      await expect(
        page.getByRole("main").getByText(/^Warning: line 3 of pops\.csv/),
      ).toBeVisible();
      await save(page, `popgen-individuals-undecoded-${theme}`);
    });

    test("the Individuals step, individuals missing", async ({ page }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      await pickIndividuals(page, {
        name: "pops.csv",
        text: await withoutTwelve(),
      });
      await page
        .getByRole("button", { name: "The 12 individuals missing" })
        .click();
      await expect(
        page.getByRole("main").getByText("s059", { exact: true }),
      ).toBeVisible();
      await save(page, `popgen-individuals-missing-${theme}`);
    });

    test("the Individuals step, a column not in the table", async ({
      page,
    }) => {
      await goTo(page, "Individuals");
      await pickIndividuals(page, "panel_pops.csv");
      await choose(page, "Column that defines the populations", "popcat");
      await pickIndividuals(page, {
        name: "regions.csv",
        text: "IID,region\ns000,north\n",
      });
      await expect(
        page.getByRole("main").getByText(/^regions\.csv has no column popcat/),
      ).toBeVisible();
      await save(page, `popgen-individuals-no-such-column-${theme}`);
    });

    test("the Individuals step, a column that gives no population", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      const text = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
      const withEmpty = text
        .split("\n")
        .filter((line) => line !== "")
        .map((line, index) => (index === 0 ? `${line},region` : `${line},`));
      await pickIndividuals(page, {
        name: "pops.csv",
        text: `${withEmpty.join("\n")}\n`,
      });
      await choose(page, "Column that defines the populations", "region");
      await expect(
        page
          .getByRole("main")
          .getByText(/^No individual of panel\.nei has a population/),
      ).toBeVisible();
      await save(page, `popgen-individuals-no-population-${theme}`);
    });

    test("the Individuals step, the types of the columns", async ({ page }) => {
      await goTo(page, "Individuals");
      await pickIndividuals(page, {
        name: "spain.csv",
        text:
          "Individuo;País;Sano;Altura;score\n" +
          "i1;España;sí;1,75;1\n" +
          "i2;Italia;no;1,62;2\n" +
          "i3;Perú;sí;;3\n" +
          "i4;España;no;1,80;5\n",
      });
      await expect(
        page.getByRole("main").getByText(/^Warning: score/),
      ).toBeVisible();
      await save(page, `popgen-individuals-types-${theme}`);
    });

    for (const width of [null, 320] as const) {
      test(`the Individuals step, the types that wait${width === null ? "" : `, at ${String(width)} px`}`, async ({
        page,
      }) => {
        if (width !== null) {
          await page.setViewportSize({ width, height: 900 });
        }
        await goTo(page, "Individuals");
        await pickIndividuals(page, {
          name: "types.csv",
          text:
            "IID,status,score,height,region\n" +
            "s000,yes,1,1.75,north\n" +
            "s001,no,2,1.62,south\n" +
            "s002,yes,3,1.80,east\n" +
            "s003,no,5,1.70,north\n",
        });
        await choose(page, "Type of score", "categorical");
        await choose(page, "Coded 1, the case, in status", "no");
        // The next file has no score, and a third value of status.
        await pickIndividuals(page, {
          name: "types.csv",
          text:
            "IID,status,height,region\n" +
            "s000,yes,1.75,north\n" +
            "s001,no,1.62,south\n" +
            "s002,maybe,1.80,east\n",
        });
        await expect(
          page.getByRole("button", { name: "Forget these types" }),
        ).toBeVisible();
        await save(
          page,
          `popgen-individuals-types-waiting${width === null ? "" : `-${String(width)}`}-${theme}`,
        );
      });
    }

    test("the Individuals step, an Excel file not loaded", async ({ page }) => {
      await goTo(page, "Individuals");
      await pickIndividuals(page, { name: "pops.xls", text: "PK" });
      await expect(
        page.getByRole("main").getByText(/^pops\.xls was not loaded/),
      ).toBeVisible();
      await save(page, `popgen-individuals-excel-${theme}`);
    });

    test("the Individuals step, an xlsx read", async ({ page }) => {
      await goTo(page, "Individuals");
      await pickIndividuals(page, "excel_en.xlsx");
      await expect(
        page
          .getByRole("main")
          .getByText(
            "Read from the first sheet of excel_en.xlsx; any other sheet is not read.",
          ),
      ).toBeVisible();
      await save(page, `popgen-individuals-xlsx-${theme}`);
    });

    test("the Individuals step, an xlsx refused", async ({ page }) => {
      await goTo(page, "Individuals");
      await pickIndividuals(page, "encrypted.xlsx");
      await expect(
        page
          .getByRole("main")
          .getByText(/^encrypted\.xlsx could not be read: it is protected/),
      ).toBeVisible();
      await save(page, `popgen-individuals-xlsx-refused-${theme}`);
    });

    test("the Individuals step, a piece of text dropped", async ({ page }) => {
      await goTo(page, "Individuals");
      const dataTransfer = await page.evaluateHandle(() => {
        const transfer = new DataTransfer();
        transfer.setData("text/plain", "pops.csv");
        return transfer;
      });
      const target = page
        .getByRole("region", { name: "Metadata file" })
        .getByRole("button", { name: /^(Choose|Replace) .*…$/ });
      for (const type of ["dragenter", "dragover", "drop"]) {
        await target.dispatchEvent(type, { dataTransfer });
      }
      await expect(
        page
          .getByRole("main")
          .getByText(
            "Load a metadata file, a CSV, a TSV or an .xlsx file, not a piece of text.",
          ),
      ).toBeVisible();
      await save(page, `popgen-individuals-text-dropped-${theme}`);
    });

    test("the Individuals step, the types at 320 px", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await goTo(page, "Individuals");
      await pickIndividuals(page, {
        name: "spain.csv",
        text:
          "Individuo;País;Sano;Altura;score\n" +
          "i1;España;sí;1,75;1\n" +
          "i2;Italia;no;1,62;2\n" +
          "i3;Perú;sí;;3\n" +
          "i4;España;no;1,80;5\n",
      });
      await expect(
        page.getByRole("main").getByText(/^Warning: score/),
      ).toBeVisible();
      await save(page, `popgen-individuals-types-320-${theme}`);
    });

    test("the diversity locked", async ({ page }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      await pickIndividuals(page, "panel_pops.csv");
      await goTo(page, "Analyses");
      await expect(
        diversityPanel(page).getByRole("button", { name: "Run" }),
      ).toHaveAccessibleDescription(/^Choose the column/);
      await save(page, `popgen-diversity-locked-${theme}`);
    });

    test("the diversity ready", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await expect(
        diversityPanel(page).getByText(/^3 populations: /),
      ).toBeVisible();
      // The three fields, the draw the default with its line.
      await expect(diversityPanel(page).getByLabel(DIVERSITY_DRAW)).toHaveValue(
        "40",
      );
      await expect(
        diversityPanel(page).getByText(/^The default: the ploidy, 2, /),
      ).toBeVisible();
      await save(page, `popgen-diversity-ready-${theme}`);
    });

    test("the diversity ready, a draw typed with Use the default", async ({
      page,
    }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await setDiversityField(page, DIVERSITY_DRAW, "96");
      await expect(
        diversityPanel(page).getByText(/^Typed; the default would be 40\. /),
      ).toBeVisible();
      await expect(
        diversityPanel(page).getByRole("button", { name: "Use the default" }),
      ).toBeVisible();
      await save(page, `popgen-diversity-draw-typed-${theme}`);
    });

    test("the diversity ready, a population under the minimum", async ({
      page,
    }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await setDiversityField(page, DIVERSITY_MINIMUM, "50");
      await expect(
        diversityPanel(page).getByText(
          /^p0 has 48 individuals, fewer than the minimum of 50, /,
        ),
      ).toBeVisible();
      await save(page, `popgen-diversity-under-minimum-${theme}`);
    });

    test("the diversity locked by the draw", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      // One more than the 168 chromosomes of p2, the largest population.
      await setDiversityField(page, DIVERSITY_DRAW, "169");
      await expect(
        diversityPanel(page).getByRole("button", { name: "Run" }),
      ).toBeDisabled();
      await save(page, `popgen-diversity-locked-draw-${theme}`);
    });

    test("the diversity ready, a population short of the draw", async ({
      page,
    }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await setDiversityField(page, DIVERSITY_DRAW, "120");
      await expect(
        diversityPanel(page).getByText(/^p0 holds 96 chromosomes, /),
      ).toBeVisible();
      await save(page, `popgen-diversity-short-of-draw-${theme}`);
    });

    test("the diversity running, with its bar, in the first of its two passes", async ({
      page,
    }) => {
      await loadPanelWithPopulations(page);
      await holdAfterFirstPass(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        page
          .getByRole("main")
          .getByText(/^Calculating · pass 1 of 2 · 49% · 0:01$/),
      ).toBeVisible({
        timeout: 3000,
      });
      await save(page, `popgen-diversity-running-${theme}`);
    });

    test("the diversity done", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
      // The block of the spectrum under the table, a histogram for each
      // of the three populations.
      await expect(
        diversityPanel(page).getByRole("group", { name: "p1" }).locator("svg"),
      ).toBeVisible();
      await save(page, `popgen-diversity-done-${theme}`);
    });

    test("the diversity done, the table of the spectrum", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await diversityPanel(page).getByRole("tab", { name: "Table" }).click();
      await expect(
        diversityPanel(page).getByRole("columnheader", { name: "p0, share" }),
      ).toBeVisible();
      await save(page, `popgen-diversity-spectrum-table-${theme}`);
    });

    /** Runs the diversity of panel.nei and popcat with the field `label`
        at `value`, and waits for its table. */
    async function runWith(
      page: Page,
      label: string,
      value: string,
    ): Promise<void> {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await setDiversityField(page, label, value);
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
    }

    test("the diversity done, a population under the minimum with no spectrum", async ({
      page,
    }) => {
      await runWith(page, DIVERSITY_MINIMUM, "50");
      await expect(
        diversityPanel(page).getByText(
          /^p0 has 48 individuals, fewer than the 50 /,
        ),
      ).toBeVisible();
      await save(page, `popgen-diversity-spectrum-under-minimum-${theme}`);
    });

    test("the diversity done, a population with no variant in the draw", async ({
      page,
    }) => {
      await runWith(page, DIVERSITY_DRAW, "120");
      await expect(
        diversityPanel(page).getByText(
          /^p0 has no variant with 120 called chromosomes/,
        ),
      ).toBeVisible();
      await save(page, `popgen-diversity-spectrum-none-in-draw-${theme}`);
    });

    test("the diversity done, a draw of more bars than a histogram draws", async ({
      page,
    }, testInfo) => {
      // 1,100 individuals in one population hold 2,200 chromosomes, so
      // that a draw of 2,002, of 1,001 bars, can be run: panel.nei's 200
      // hold 400.
      const path = testInfo.outputPath("draw2002.vcf");
      await writeBigVcf(path, 100, 1100);
      await pickVariants(page, { path });
      await expect(
        page.getByRole("main").getByText("1,100 individuals"),
      ).toBeVisible();
      await goTo(page, "Analyses");
      await setDiversityField(page, DIVERSITY_DRAW, "2002");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        diversityPanel(page).getByText(
          /^A draw of 2,002 chromosomes gives 1,001 bars /,
        ),
      ).toBeVisible();
      await save(page, `popgen-diversity-spectrum-too-many-${theme}`);
    });

    test("the diversity done, an odd draw", async ({ page }) => {
      await runWith(page, DIVERSITY_DRAW, "39");
      await expect(
        diversityPanel(page).getByText(/^Each bar is the share /),
      ).toBeVisible();
      await save(page, `popgen-diversity-spectrum-odd-${theme}`);
    });

    test("the diversity done with a draw typed", async ({ page }) => {
      await runWith(page, DIVERSITY_DRAW, "96");
      await expect(
        diversityPanel(page).getByRole("button", { name: "Use the default" }),
      ).toBeVisible();
      await save(page, `popgen-diversity-spectrum-typed-${theme}`);
    });

    test("the diversity done, the warning of the MAF filter on the spectrum", async ({
      page,
    }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Variants");
      await page
        .getByText("Filter the variants by major allele frequency (MAF)", {
          exact: true,
        })
        .click();
      await expect(
        page.getByLabel("Maximum major allele frequency", { exact: false }),
      ).toBeVisible();
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        diversityPanel(page).getByText(/^Warning: The MAF filter of the /),
      ).toBeVisible();
      await save(page, `popgen-diversity-spectrum-maf-${theme}`);
    });

    test("the diversity done, with a warning", async ({ page }) => {
      await loadTetraploid(page);
      const ploidy = page.getByLabel("Ploidy of the VCF");
      await ploidy.fill("4");
      await ploidy.press("Enter");
      await page
        .getByRole("button", {
          name: "Read tetraploid.vcf.gz again with ploidy 4",
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Read tetraploid.vcf.gz again with ploidy 4",
        }),
      ).toHaveCount(0);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        page.getByRole("main").getByText(/^Warning: Population A/),
      ).toBeVisible();
      await save(page, `popgen-diversity-warning-${theme}`);
    });

    test("the diversity in error, the ploidy refused", async ({ page }) => {
      await loadTetraploid(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        page.getByRole("main").getByText(/^At line 5 of tetraploid\.vcf\.gz/),
      ).toBeVisible();
      await save(page, `popgen-diversity-refused-${theme}`);
    });

    test("the diversity removed", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
      await goTo(page, "Variants");
      const threshold = page.getByLabel(
        "Maximum proportion of missing genotypes",
      );
      await threshold.fill("0.05");
      await threshold.press("Enter");
      await goTo(page, "Analyses");
      await expect(
        page.getByRole("main").getByText(/^The diversity was removed/),
      ).toBeVisible();
      await save(page, `popgen-diversity-removed-${theme}`);
    });

    test("the diversity done, at 320 px", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      // In the committed font, as wide as the fonts of Linux.
      await useWideFont(page);
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
      // The frame measured as narrower than the table, and its line shown.
      await expect(
        page
          .getByRole("main")
          .getByText("Scroll the table sideways to see all its columns."),
      ).toBeVisible();
      // The frame of the table, reached by the Tab key from the heading
      // past the three fields, with its focus ring.
      for (let stop = 0; stop < 4; stop++) {
        await page.keyboard.press("Tab");
      }
      await expect(
        diversityPanel(page).getByRole("region", {
          name: /^The diversity of each population/,
        }),
      ).toBeFocused();
      await save(page, `popgen-diversity-done-320-${theme}`);
    });

    test("the diversity in error, a VCF with no variant", async ({ page }) => {
      await pickVariants(page, {
        name: "empty.vcf",
        text:
          '##fileformat=VCFv4.2\n##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">\n' +
          "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\ta\tb\n",
      });
      await expect(
        page.getByRole("main").getByText("2 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      await pickIndividuals(page, {
        name: "empty_pops.csv",
        text: "IID,pop\na,A\nb,A\n",
      });
      await choose(page, "Column that defines the populations", "pop");
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        page
          .getByRole("main")
          .getByText(/^empty\.vcf has no variant with PASS/),
      ).toBeVisible();
      await save(page, `popgen-diversity-no-variant-${theme}`);
    });

    test("the diversity in error, the file no longer read", async ({
      page,
    }, testInfo) => {
      const path = testInfo.outputPath("panel.nei");
      await writeFile(path, await readFile(join(FIXTURES, "panel.nei")));
      await pickVariants(page, { path });
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      await pickIndividuals(page, "panel_pops.csv");
      await choose(page, "Column that defines the populations", "popcat");
      await goTo(page, "Analyses");
      await unlink(path);
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        diversityPanel(page).getByText(/^panel\.nei could not be read again/),
      ).toBeVisible();
      await save(page, `popgen-diversity-no-longer-read-${theme}`);
    });

    test("the diversity stopped by a read again", async ({ page }) => {
      await pickVariants(page, "panel.vcf.gz");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      await pickIndividuals(page, "panel_pops.csv");
      await choose(page, "Column that defines the populations", "popcat");
      await holdResults(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        diversityPanel(page).getByRole("button", { name: "Stop" }),
      ).toBeVisible();
      await goTo(page, "Variants");
      await page
        .getByText("Only the variants with PASS or . in the FILTER column", {
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name: "Read panel.vcf.gz again with every variant",
        })
        .click();
      await goTo(page, "Analyses");
      await expect(
        page
          .getByRole("main")
          .getByText(/^The calculation of the diversity was stopped/),
      ).toBeVisible();
      await save(page, `popgen-diversity-stopped-${theme}`);
    });

    test("the shell empty", async ({ page }) => {
      await save(page, `popgen-shell-empty-${theme}`);
    });

    test("the shell empty, the reason of Analyses on focus", async ({
      page,
    }) => {
      // The Tab key, so that the tooltip shows at once, as for the
      // keyboard.
      for (let press = 0; press < 4; press++) {
        await page.keyboard.press("Tab");
      }
      await expect(page.getByRole("tooltip")).toBeVisible();
      await save(page, `popgen-shell-reason-${theme}`);
    });

    test("the shell ready", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await expect(
        page.getByRole("button", { name: "Undo", exact: true }),
      ).toBeEnabled();
      await save(page, `popgen-shell-ready-${theme}`);
    });

    test("the shell ready, Undo described on hover", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await page.getByRole("button", { name: "Undo", exact: true }).hover();
      await expect(page.getByRole("tooltip")).toBeVisible();
      await save(page, `popgen-shell-undo-hover-${theme}`);
    });

    test("the shell ready, at 320 px", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await loadPanelWithPopulations(page);
      await save(page, `popgen-shell-ready-320-${theme}`);
    });

    test("the shell running", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await holdResults(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        page
          .getByRole("main")
          .getByText(/^Calculating · pass 2 of 2 · 99% · 0:01$/),
      ).toBeVisible({
        timeout: 3000,
      });
      await save(page, `popgen-shell-running-${theme}`);
    });

    test("the shell done", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
      await save(page, `popgen-shell-done-${theme}`);
    });

    /** Calculates the diversity of the panel and sets the missing data
        threshold to 1 at the Variants step, which removes it. */
    async function removeTheDiversity(page: Page): Promise<void> {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
      await goTo(page, "Variants");
      const threshold = page.getByLabel(
        "Maximum proportion of missing genotypes",
      );
      await threshold.fill("1");
      await threshold.press("Enter");
      await expect(
        page.getByRole("region", { name: "Notice" }).getByRole("alertdialog"),
      ).toBeVisible();
    }

    test("the shell with its notice", async ({ page }) => {
      await removeTheDiversity(page);
      await save(page, `popgen-shell-notice-${theme}`, { fullPage: false });
    });

    test("the shell with its notice, at 320 px", async ({ page }) => {
      // The window of a small phone, which the page scrolls in.
      await page.setViewportSize({ width: 320, height: 640 });
      await removeTheDiversity(page);
      await save(page, `popgen-shell-notice-320-${theme}`, { fullPage: false });
    });

    test("the notice reached by F6, and its Undo by the Tab key", async ({
      page,
    }) => {
      await removeTheDiversity(page);
      const notice = page.getByRole("region", { name: "Notice" });
      await page.keyboard.press("F6");
      await expect(notice).toBeFocused();
      await save(page, `popgen-shell-notice-f6-${theme}`, { fullPage: false });
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await expect(
        notice.getByRole("button", { name: "Undo", exact: true }),
      ).toBeFocused();
      await save(page, `popgen-shell-notice-undo-focus-${theme}`, {
        fullPage: false,
      });
    });

    test("the error bar, with a second error", async ({ page }) => {
      await page.evaluate(() => {
        setTimeout(() => {
          throw new Error("test");
        });
        setTimeout(() => {
          throw new Error("another");
        });
      });
      await expect(page.getByText("1 more error followed it.")).toBeVisible();
      await save(page, `popgen-error-bar-${theme}`);
    });

    /** Saves the project with Save project and keeps the file under the
        test's output folder; gives its path. */
    async function saveProjectFile(
      page: Page,
      folder: string,
    ): Promise<string> {
      await page.getByRole("button", { name: "Save project" }).click();
      const download = page.waitForEvent("download");
      await page
        .getByRole("dialog", { name: "Save the project" })
        .getByRole("button", { name: "Save", exact: true })
        .click();
      const path = join(folder, (await download).suggestedFilename());
      await (await download).saveAs(path);
      return path;
    }

    /** Picks `file` with Open project…. */
    async function openProject(
      page: Page,
      file: string | { name: string; text: string },
    ): Promise<void> {
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Open project…" }).click();
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

    for (const width of [null, 320] as const) {
      const suffix = width === null ? "" : `-${String(width)}`;
      const at = width === null ? "" : `, at ${String(width)} px`;

      test(`the shell with the dialog of Save${at}`, async ({ page }) => {
        if (width !== null) await page.setViewportSize({ width, height: 640 });
        await pickVariants(page, "panel.nei");
        await expect(
          page.getByRole("main").getByText("200 individuals"),
        ).toBeVisible();
        await page.getByRole("button", { name: "Save project" }).click();
        await expect(
          page.getByRole("textbox", { name: "File name" }),
        ).toBeFocused();
        await save(page, `popgen-shell-save-dialog${suffix}-${theme}`, {
          fullPage: false,
        });
      });

      test(`the shell with the question before an opening${at}`, async ({
        page,
      }, testInfo) => {
        if (width !== null) await page.setViewportSize({ width, height: 640 });
        await pickVariants(page, "panel.nei");
        await expect(
          page.getByRole("main").getByText("200 individuals"),
        ).toBeVisible();
        const saved = await saveProjectFile(page, testInfo.outputPath());
        const threshold = page.getByLabel(
          "Maximum proportion of missing genotypes",
        );
        await threshold.fill("0.05");
        await threshold.press("Enter");
        await openProject(page, saved);
        await expect(
          page.getByRole("button", { name: "Keep the current project" }),
        ).toBeFocused();
        await save(page, `popgen-shell-open-question${suffix}-${theme}`, {
          fullPage: false,
        });
      });

      test(`the shell with a project file refused${at}`, async ({ page }) => {
        if (width !== null) await page.setViewportSize({ width, height: 640 });
        await openProject(page, { name: "notes.txt", text: "some notes" });
        await expect(page.getByRole("button", { name: "OK" })).toBeFocused();
        await save(page, `popgen-shell-open-refused${suffix}-${theme}`, {
          fullPage: false,
        });
      });
    }

    test("the shell with the dialog of Save, the name empty", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await page.getByRole("button", { name: "Save project" }).click();
      await page.getByRole("textbox", { name: "File name" }).fill("");
      await expect(page.getByText("Give the file a name.")).toBeVisible();
      await save(page, `popgen-shell-save-dialog-empty-${theme}`, {
        fullPage: false,
      });
    });

    test("the shell with the question before an opening, a calculation under way", async ({
      page,
    }, testInfo) => {
      await loadPanelWithPopulations(page);
      const saved = await saveProjectFile(page, testInfo.outputPath());
      await holdResults(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await openProject(page, saved);
      await expect(
        page.getByText(/The ongoing calculations will be stopped\.$/),
      ).toBeVisible();
      await save(page, `popgen-shell-open-question-running-${theme}`, {
        fullPage: false,
      });
    });

    test("the shell with its longest notice, at 320 px", async ({ page }) => {
      // The notice of an undo that leaves a calculation behind, the
      // longest one the diversity alone can give.
      await page.setViewportSize({ width: 320, height: 640 });
      await loadPanelWithPopulations(page);
      await holdResults(page);
      await goTo(page, "Variants");
      const threshold = page.getByLabel(
        "Maximum proportion of missing genotypes",
      );
      await threshold.fill("0.05");
      await threshold.press("Enter");
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await page.getByRole("heading", { level: 1, name: "Analyses" }).focus();
      await page.keyboard.press("ControlOrMeta+z");
      await expect(
        page.getByRole("region", { name: "Notice" }).getByRole("alertdialog", {
          name: "Undone: the filter of the variants by missing data changed. The ongoing calculation of Diversity will be stopped unless you redo the change",
        }),
      ).toBeVisible();
      await save(page, `popgen-shell-notice-longest-320-${theme}`, {
        fullPage: false,
      });
    });

    /** The section of the writing of the Variants step. */
    function writing(page: Page): Locator {
      return page.getByRole("region", {
        name: "Writing the filtered variants",
      });
    }

    /** Picks panel.nei, sets its missing data filter at 0.05, and writes
        it; the Save button is then shown. */
    async function writePanel(page: Page): Promise<void> {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      const threshold = page.getByLabel(
        "Maximum proportion of missing genotypes",
      );
      await threshold.fill("0.05");
      await threshold.press("Enter");
      await writing(page)
        .getByRole("button", {
          name: "Write the filtered variants as a .nei file",
        })
        .click();
      await expect(
        writing(page).getByRole("button", {
          name: "Save panel.filtered.nei, 251 KB",
        }),
      ).toBeVisible();
    }

    test("the writing, the size not yet known", async ({ page }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        writing(page).getByText(/^The size of the file is known once/),
      ).toBeVisible();
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-no-size-${theme}`);
    });

    test("the writing ready, with the size expected", async ({ page }) => {
      // The diversity counts the variants the filter keeps.
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
      await goTo(page, "Variants");
      await expect(
        writing(page).getByText(
          "About 288 KB: 1,200 variants of 200 individuals.",
        ),
      ).toBeVisible();
      await save(page, `popgen-write-ready-${theme}`);
    });

    test("the writing under way, with its bar", async ({ page }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await holdWritten(page);
      await writing(page)
        .getByRole("button", {
          name: "Write the filtered variants as a .nei file",
        })
        .click();
      await expect(
        writing(page).getByText(
          /^Writing panel\.filtered\.nei · \d+% · 0:0[1-9]$/,
        ),
      ).toBeVisible({ timeout: 3000 });
      await save(page, `popgen-write-running-${theme}`);
    });

    test("the writing done, with Save", async ({ page }) => {
      await writePanel(page);
      await save(page, `popgen-write-done-${theme}`);
    });

    test("the writing saved", async ({ page }) => {
      await writePanel(page);
      const download = page.waitForEvent("download");
      await writing(page)
        .getByRole("button", { name: "Save panel.filtered.nei, 251 KB" })
        .click();
      await download;
      await expect(
        writing(page).getByText(/was handed to the browser to save\./),
      ).toBeVisible();
      await save(page, `popgen-write-saved-${theme}`);
    });

    test("the writing, the notice of a file discarded", async ({ page }) => {
      await writePanel(page);
      const threshold = page.getByLabel(
        "Maximum proportion of missing genotypes",
      );
      await threshold.fill("0.06");
      await threshold.press("Enter");
      await expect(
        page.getByText(/The written file, not saved, was discarded/),
      ).toBeVisible();
      await save(page, `popgen-write-discarded-${theme}`, { fullPage: false });
    });

    test("the writing, the question before an opening", async ({
      page,
    }, testInfo) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      const saved = await saveProjectFile(page, testInfo.outputPath());
      await writing(page)
        .getByRole("button", {
          name: "Write the filtered variants as a .nei file",
        })
        .click();
      await expect(
        writing(page).getByRole("button", { name: /^Save / }),
      ).toBeVisible();
      await openProject(page, saved);
      // The question's own words: "in the Variants step." alone also ends
      // the announcement of the file written, which the status region
      // holds from 100 ms after the write, so that it matched two elements
      // whenever the question came after it.
      await expect(
        page.getByText(/will be discarded\. To keep them, press Keep/),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Keep the current project" }),
      ).toBeFocused();
      await save(page, `popgen-write-open-question-${theme}`, {
        fullPage: false,
      });
    });

    /** The Write button of the section. */
    function writeButton(page: Page): Locator {
      return writing(page).getByRole("button", {
        name: "Write the filtered variants as a .nei file",
      });
    }

    /** Picks panel.nei and waits for its read. */
    async function pickPanel(page: Page): Promise<void> {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
    }

    /** Writes the file, counted as `numVars` variants kept, and saves it,
        so that the step offers Write with the size of those variants. */
    async function writeCounted(page: Page, numVars: number): Promise<void> {
      await writtenAs(page, { kind: "counted", numVars });
      await writeButton(page).click();
      const download = page.waitForEvent("download");
      await writing(page)
        .getByRole("button", { name: /^Save / })
        .click();
      await download;
    }

    /** Saves the project with panel.nei loaded as a project file with
        the fields `fields` changed, opens it, and picks panel.nei again. */
    async function openChanged(
      page: Page,
      folder: string,
      fields: Record<string, unknown>,
    ): Promise<void> {
      await pickPanel(page);
      const saved = await saveProjectFile(page, folder);
      const file = JSON.parse(await readFile(saved, "utf8")) as Record<
        string,
        unknown
      >;
      await openProject(page, {
        name: "changed.popnei.json",
        text: JSON.stringify({ ...file, ...fields }, null, 2),
      });
      await pickPanel(page);
    }

    test("the writing, the warning of the memory", async ({ page }) => {
      await pickPanel(page);
      await writeCounted(page, 3_000_000);
      await expect(writing(page).getByText(/^Warning:/)).toBeVisible();
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-warning-${theme}`);
    });

    test("the writing, Write disabled for a file too large", async ({
      page,
    }) => {
      await pickPanel(page);
      await writeCounted(page, 8_000_000);
      await expect(writeButton(page)).toBeDisabled();
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-too-large-${theme}`);
    });

    test("the writing, Write refused before a Count for a bound too large", async ({
      page,
    }) => {
      await pickPanel(page);
      await writeCounted(page, 8_000_000);
      const threshold = page.getByLabel(
        "Maximum proportion of missing genotypes",
      );
      await threshold.fill("0.06");
      await threshold.press("Enter");
      await expect(writeButton(page)).toHaveAccessibleDescription(
        /Count the variants first, above\.$/u,
      );
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-count-first-${theme}`);
    });

    test("the writing, Write refused after a Count that keeps no variant", async ({
      page,
    }, testInfo) => {
      await openChanged(page, testInfo.outputPath(), {
        filters: [
          { kind: "missing_data", maxAllowedMissingRate: 0.05 },
          { kind: "maf", maxAllowedMaf: 0.4 },
        ],
      });
      await page
        .getByRole("button", { name: "Count the variants each filter keeps" })
        .click();
      await expect(writeButton(page)).toHaveAccessibleDescription(
        /^The filters keep none of the variants/u,
      );
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-kept-none-${theme}`);
    });

    test("the writing locked by a list of individuals", async ({
      page,
    }, testInfo) => {
      await openChanged(page, testInfo.outputPath(), {
        individualFilters: [{ kind: "keep", individuals: ["nobody"] }],
      });
      await expect(writeButton(page)).toBeDisabled();
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-locked-list-${theme}`);
    });

    test("the writing locked by thresholds that keep no individual", async ({
      page,
    }, testInfo) => {
      await openChanged(page, testInfo.outputPath(), {
        individualFilters: [{ kind: "obs_het", maxAllowedObsHet: 0.1 }],
      });
      await writeButton(page).click();
      await expect(writeButton(page)).toBeDisabled();
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-locked-none-${theme}`);
    });

    test("the writing waiting for the statistics of each individual", async ({
      page,
    }, testInfo) => {
      await openChanged(page, testInfo.outputPath(), {
        individualFilters: [{ kind: "obs_het", maxAllowedObsHet: 0.36 }],
      });
      await holdResults(page);
      await writeButton(page).click();
      await expect(
        writing(page).getByText(
          /^Calculating the statistics of each individual, .* · 0:0[1-9]$/,
        ),
      ).toBeVisible({ timeout: 3000 });
      await save(page, `popgen-write-waiting-statistics-${theme}`);
    });

    test("the writing, the filters kept no variant", async ({
      page,
    }, testInfo) => {
      await openChanged(page, testInfo.outputPath(), {
        filters: [
          { kind: "missing_data", maxAllowedMissingRate: 0.05 },
          { kind: "maf", maxAllowedMaf: 0.4 },
        ],
      });
      await writeButton(page).click();
      await expect(
        writing(page).getByText(/^The filters kept none of the variants/),
      ).toBeVisible();
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-no-variant-${theme}`);
    });

    test("the writing, a VCF with no variant that passed", async ({
      page,
    }, testInfo) => {
      const text = gunzipSync(await readFile(join(FIXTURES, "panel.vcf.gz")))
        .toString("utf8")
        .replaceAll("\tPASS\t", "\tLowQual\t");
      const vcf = testInfo.outputPath("nopass.vcf");
      await writeFile(vcf, text);
      await pickVariants(page, { path: vcf });
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await writeButton(page).click();
      await expect(
        writing(page).getByText(/^nopass\.vcf has no variant with PASS/),
      ).toBeVisible();
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-empty-source-${theme}`);
    });

    test("the writing in error, with Write offered again", async ({ page }) => {
      await pickPanel(page);
      await writtenAs(page, { kind: "crashed" });
      await writeButton(page).click();
      await expect(
        writing(page).getByText(/^The writing stopped unexpectedly/),
      ).toBeVisible();
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-error-again-${theme}`);
    });

    test("the writing in error, refused by popnei, with no Write", async ({
      page,
    }) => {
      await pickPanel(page);
      await writtenAs(page, {
        kind: "refused",
        message: "memory could not grow.",
      });
      await writeButton(page).click();
      await expect(
        writing(page).getByText(/could not be written: popnei stopped/),
      ).toBeVisible();
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-error-refused-${theme}`);
    });

    test("the writing, the file dropped since the filters changed while it was written", async ({
      page,
    }) => {
      await pickPanel(page);
      await writtenAs(page, { kind: "held" });
      await writeButton(page).click();
      await expect(
        writing(page).getByRole("button", { name: "Stop" }),
      ).toBeVisible();
      const threshold = page.getByLabel(
        "Maximum proportion of missing genotypes",
      );
      await threshold.fill("0.06");
      await threshold.press("Enter");
      await writtenAs(page, { kind: "released" });
      await expect(
        writing(page).getByText(/^The file was not kept/),
      ).toBeVisible();
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-dropped-${theme}`);
    });

    test("the writing, an estimate from a bound", async ({ page }) => {
      await writePanel(page);
      const threshold = page.getByLabel(
        "Maximum proportion of missing genotypes",
      );
      await threshold.fill("0.06");
      await threshold.press("Enter");
      await expect(
        writing(page).getByText(
          "At most about 288 KB: 1,200 variants of 200 individuals.",
        ),
      ).toBeVisible();
      await page.getByRole("button", { name: "Close" }).click();
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-write-bound-${theme}`);
    });

    /** The section of the lists of individuals, and its list `label`. */
    function individualLists(page: Page): Locator {
      return page.getByRole("region", { name: "Filters of the individuals" });
    }
    function listArea(page: Page, label: string): Locator {
      return individualLists(page).getByRole("textbox", { name: label });
    }

    test("the lists of individuals, applied", async ({ page }) => {
      await pickPanel(page);
      await listArea(page, "Individuals to keep, one name per line").fill(
        "s000\ns001\ns002",
      );
      await individualLists(page)
        .getByRole("button", { name: "Apply the list to keep" })
        .click();
      await listArea(page, "Individuals to remove, one name per line").fill(
        "s001",
      );
      await individualLists(page)
        .getByRole("button", { name: "Apply the list to remove" })
        .click();
      await individualLists(page).screenshot({
        path: join(SCREENS, `popgen-lists-applied-${theme}.png`),
      });
    });

    test("the lists of individuals, not applied", async ({ page }) => {
      await pickPanel(page);
      await listArea(page, "Individuals to keep, one name per line").fill(
        "s000\ns001",
      );
      await expect(
        individualLists(page).getByText(/^This list is not applied yet/u),
      ).toBeVisible();
      await individualLists(page).screenshot({
        path: join(SCREENS, `popgen-lists-not-applied-${theme}.png`),
      });
    });

    test("the lists of individuals, a name not in the file", async ({
      page,
    }) => {
      await pickPanel(page);
      await listArea(page, "Individuals to keep, one name per line").fill(
        "s000\nind_900\nind_901",
      );
      await individualLists(page)
        .getByRole("button", { name: "Apply the list to keep" })
        .click();
      await expect(
        individualLists(page).getByText(/^The list of individuals to keep/u),
      ).toBeVisible();
      await individualLists(page).screenshot({
        path: join(SCREENS, `popgen-lists-not-in-file-${theme}.png`),
      });
      await writing(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-lists-not-in-file-write-${theme}`);
    });

    /** Saves the section of the filters of the individuals as `name`. */
    async function saveIndividuals(page: Page, name: string): Promise<void> {
      await individualLists(page).screenshot({
        path: join(SCREENS, `${name}-${theme}.png`),
      });
    }
    const CALCULATE_STATS = "Calculate the statistics of each individual";
    const STATS_CAPTION =
      /^The statistics of the 200 individuals of panel\.nei/;

    test("the statistics of each individual, ready", async ({ page }) => {
      await pickPanel(page);
      await expect(
        individualLists(page).getByRole("button", { name: CALCULATE_STATS }),
      ).toBeVisible();
      await saveIndividuals(page, "popgen-stats-ready");
    });

    test("the statistics of each individual, running", async ({ page }) => {
      await pickPanel(page);
      await holdResults(page);
      await individualLists(page)
        .getByRole("button", { name: CALCULATE_STATS })
        .click();
      await expect(
        individualLists(page).getByText(/^Calculating · \d+% · 0:0\d$/),
      ).toBeVisible();
      await saveIndividuals(page, "popgen-stats-running");
    });

    test("the statistics of each individual, done, with a list applied and the column Kept, and at 320 pixels wide", async ({
      page,
    }) => {
      await pickPanel(page);
      await individualLists(page)
        .getByRole("button", { name: CALCULATE_STATS })
        .click();
      await expect(
        individualLists(page).getByText(STATS_CAPTION),
      ).toBeVisible();
      await listArea(page, "Individuals to remove, one name per line").fill(
        "s001",
      );
      await individualLists(page)
        .getByRole("button", { name: "Apply the list to remove" })
        .click();
      await expect(
        individualLists(page).getByRole("columnheader", { name: /^Kept/ }),
      ).toBeVisible();
      await saveIndividuals(page, "popgen-stats-done");
      // Sorted down by the proportion of missing genotypes.
      const header = individualLists(page).getByRole("columnheader", {
        name: /^Proportion of missing genotypes/,
      });
      await header.click();
      await header.click();
      await expect(header).toHaveAttribute("aria-sort", "descending");
      await individualLists(page)
        .getByRole("grid", { name: "Statistics of each individual" })
        .screenshot({
          path: join(SCREENS, `popgen-stats-table-sorted-${theme}.png`),
        });
      // Scrolled with the arrow keys, down and back up: the rows under
      // the header, and the cell focused below it.
      const grid = individualLists(page).getByRole("grid", {
        name: "Statistics of each individual",
      });
      await grid.getByRole("rowheader").first().click();
      for (let step = 0; step < 30; step += 1) {
        await page.keyboard.press("ArrowDown");
      }
      for (let step = 0; step < 12; step += 1) {
        await page.keyboard.press("ArrowUp");
      }
      await grid.screenshot({
        path: join(SCREENS, `popgen-stats-table-scrolled-${theme}.png`),
      });
      // A row with the focus: the Tab key back to the cell that had it,
      // and the left arrow from the first cell to its row.
      await individualLists(page)
        .getByRole("button", { name: "Download the bins as CSV" })
        .last()
        .focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("ArrowLeft");
      await expect(page.locator(":focus")).toHaveAttribute("role", "row");
      await grid.screenshot({
        path: join(SCREENS, `popgen-stats-row-focused-${theme}.png`),
      });
      await page.setViewportSize({ width: 320, height: 900 });
      await saveIndividuals(page, "popgen-stats-320");
    });

    test("the statistics of each individual, removed by a new load, with the notice", async ({
      page,
    }) => {
      await pickPanel(page);
      await individualLists(page)
        .getByRole("button", { name: CALCULATE_STATS })
        .click();
      await expect(
        individualLists(page).getByText(STATS_CAPTION),
      ).toBeVisible();
      // Only a new load removes them, since they read no filter.
      await pickVariants(page, "panel.nei");
      await expect(
        individualLists(page).getByText(
          /^The statistics of each individual were removed because/,
        ),
      ).toBeVisible();
      await saveIndividuals(page, "popgen-stats-removed");
      await save(page, `popgen-stats-removed-notice-${theme}`, {
        fullPage: false,
      });
    });

    /** panel.nei at 0.05, its statistics calculated, and the two
        thresholds of the individuals at `missing` and `obsHet`. */
    async function thresholdsAt(
      page: Page,
      missing: string,
      obsHet: string,
    ): Promise<void> {
      await pickPanel(page);
      const variants = page.getByLabel(
        "Maximum proportion of missing genotypes, from 0 to 1",
        { exact: true },
      );
      await variants.fill("0.05");
      await variants.press("Enter");
      await individualLists(page)
        .getByRole("button", { name: CALCULATE_STATS })
        .click();
      await expect(
        individualLists(page).getByText(STATS_CAPTION),
      ).toBeVisible();
      for (const [name, label, value] of [
        [
          "Filter the individuals by missing data",
          "Maximum proportion of missing genotypes of an individual, from 0 to 1",
          missing,
        ],
        [
          "Filter the individuals by observed heterozygosity",
          "Maximum observed heterozygosity of an individual, from 0 to 1",
          obsHet,
        ],
      ] as const) {
        await individualLists(page).getByText(name, { exact: true }).click();
        const field = individualLists(page).getByLabel(label, { exact: true });
        await field.fill(value);
        await field.press("Enter");
        await expect(field).toHaveValue(value);
      }
    }

    test("the thresholds of the individuals at 0.03 and 0.38, with their counts, and Known once … before the statistics", async ({
      page,
    }) => {
      await thresholdsAt(page, "0.03", "0.38");
      await expect(
        individualLists(page).getByText(
          "111 of the 200 individuals of panel.nei pass the filters.",
        ),
      ).toBeVisible();
      await saveIndividuals(page, "popgen-thresholds-counts");
      // A new load: the statistics are of the old one, and the counts of
      // the thresholds wait for them.
      await pickVariants(page, "panel.nei");
      await expect(
        individualLists(page).getByText(/^Known once the statistics/),
      ).toHaveCount(2);
      await saveIndividuals(page, "popgen-thresholds-known-once");
    });

    /** The section of the filters of the variants. */
    function variantFilters(page: Page): Locator {
      return page.getByRole("region", { name: "Filters of the variants" });
    }

    test("the Variants step in its order, the individuals first, before any calculation", async ({
      page,
    }) => {
      await pickPanel(page);
      await expect(
        individualLists(page).getByRole("button", { name: CALCULATE_STATS }),
      ).toBeVisible();
      await save(page, `popgen-variants-order-ready-${theme}`);
    });

    test("the Variants step in its order, with the statistics and the thresholds", async ({
      page,
    }) => {
      await thresholdsAt(page, "0.03", "0.38");
      await expect(
        individualLists(page).getByText(
          "111 of the 200 individuals of panel.nei pass the filters.",
        ),
      ).toBeVisible();
      await save(page, `popgen-variants-order-thresholds-${theme}`);
    });

    test("the Variants step in its order, the Count and the histograms locked by a list naming someone not in the file", async ({
      page,
    }) => {
      await pickPanel(page);
      await listArea(page, "Individuals to keep, one name per line").fill(
        "s000\nind_900",
      );
      await individualLists(page)
        .getByRole("button", { name: "Apply the list to keep" })
        .click();
      await expect(
        variantFilters(page).getByRole("button", {
          name: "Count the variants each filter keeps",
        }),
      ).toBeDisabled();
      await save(page, `popgen-variants-order-list-locked-${theme}`);
      await variantFilters(page).screenshot({
        path: join(
          SCREENS,
          `popgen-variants-order-list-locked-variants-${theme}.png`,
        ),
      });
    });

    /** Saves the section of the filters of the variants as `name`. */
    async function saveVariantFilters(page: Page, name: string): Promise<void> {
      await variantFilters(page).screenshot({
        path: join(SCREENS, `${name}-${theme}.png`),
      });
    }
    const CALCULATE_HISTOGRAMS = "Calculate the histograms of the variants";

    test("the histograms of the variants removed by a change of a filter of individuals, with the notice", async ({
      page,
    }) => {
      await thresholdsAt(page, "0.03", "0.38");
      await variantFilters(page)
        .getByRole("button", { name: CALCULATE_HISTOGRAMS })
        .click();
      await expect(
        page.getByRole("group", { name: /^Major allele frequency, / }),
      ).toBeVisible();
      const missing = individualLists(page).getByLabel(
        "Maximum proportion of missing genotypes of an individual, from 0 to 1",
        { exact: true },
      );
      await missing.fill("0.04");
      await missing.press("Enter");
      await expect(
        variantFilters(page).getByText(/for the settings as they are now\.$/),
      ).toBeVisible();
      await saveVariantFilters(
        page,
        "popgen-variants-histograms-removed-individuals",
      );
      await save(
        page,
        `popgen-variants-histograms-removed-individuals-notice-${theme}`,
        { fullPage: false },
      );
    });

    test("the histograms of the variants done over the individuals kept", async ({
      page,
    }) => {
      await thresholdsAt(page, "0.03", "0.38");
      await variantFilters(page)
        .getByRole("button", { name: CALCULATE_HISTOGRAMS })
        .click();
      await expect(
        variantFilters(page).getByText(
          /and the 111 individuals the filters of individuals keep/,
        ),
      ).toBeVisible();
      await saveVariantFilters(page, "popgen-variants-histograms-kept");
    });

    test("the Count waiting for the statistics of each individual", async ({
      page,
    }) => {
      await pickPanel(page);
      await individualLists(page)
        .getByText("Filter the individuals by missing data", { exact: true })
        .click();
      await holdResults(page);
      await variantFilters(page)
        .getByRole("button", { name: "Count the variants each filter keeps" })
        .click();
      await expect(
        variantFilters(page).getByText(
          /^Calculating the statistics of each individual, which the thresholds of the individuals need · \d+% · 0:0\d$/,
        ),
      ).toBeVisible();
      await saveVariantFilters(page, "popgen-variants-count-waits");
    });

    test("the section of the variants, the Count and the histograms locked by thresholds that keep nobody", async ({
      page,
    }) => {
      await thresholdsAt(page, "0.03", "0.1");
      await expect(
        variantFilters(page).getByRole("button", {
          name: "Count the variants each filter keeps",
        }),
      ).toBeDisabled();
      await saveVariantFilters(page, "popgen-variants-kept-none");
    });

    test("the thresholds of the individuals that keep none", async ({
      page,
    }) => {
      await thresholdsAt(page, "0.03", "0.1");
      await expect(
        individualLists(page).getByText(
          /^The filters of individuals keep none/,
        ),
      ).toBeVisible();
      await saveIndividuals(page, "popgen-thresholds-kept-none");
    });

    test("the statistics of each individual, in error, the ploidy refused", async ({
      page,
    }) => {
      await pickVariants(page, "tetraploid.vcf.gz");
      await expect(
        page.getByRole("main").getByText("12 individuals"),
      ).toBeVisible();
      await individualLists(page)
        .getByRole("button", { name: CALCULATE_STATS })
        .click();
      await expect(
        individualLists(page).getByText(/^At line 5 of tetraploid\.vcf\.gz/),
      ).toBeVisible();
      await saveIndividuals(page, "popgen-stats-error");
    });

    /** The VCF `vcf`, of `numIndividuals` individuals, read with the
        filter of the variants by missing data off, and its statistics
        calculated. */
    async function statisticsOfCalls(
      page: Page,
      vcf: string,
      numIndividuals: number,
    ): Promise<void> {
      await pickVariants(page, { name: "calls.vcf", text: vcf });
      await expect(
        page
          .getByRole("main")
          .getByText(`${String(numIndividuals)} individuals`),
      ).toBeVisible();
      await page
        .getByRole("main")
        .getByText("Filter the variants by missing data", { exact: true })
        .click();
      await individualLists(page)
        .getByRole("button", { name: CALCULATE_STATS })
        .click();
      await expect(
        individualLists(page).getByText(
          new RegExp(
            `^The statistics of the ${String(numIndividuals)} individuals of calls\\.vcf`,
          ),
        ),
      ).toBeVisible();
    }

    /** The lines of a VCF of four variants, its header and one line per
        variant with the genotypes `gts` of its individuals `names`. */
    function callsVcf(
      names: readonly string[],
      gts: readonly (readonly string[])[],
    ): string {
      return [
        "##fileformat=VCFv4.2",
        "##contig=<ID=1>",
        '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
        `#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t${names.join("\t")}`,
        ...gts.map(
          (row, index) =>
            `1\t${String((index + 1) * 10)}\t.\tA\tG\t.\tPASS\t.\tGT\t${row.join("\t")}`,
        ),
        "",
      ].join("\n");
    }

    test("the statistics of each individual, an individual with no called genotype", async ({
      page,
    }) => {
      // The worked example of individualChecks.md: i3 calls nothing.
      await statisticsOfCalls(
        page,
        callsVcf(
          ["i1", "i2", "i3"],
          [
            ["0/1", "0/0", "./."],
            ["1/1", "0/1", "./."],
            ["0/0", "./.", "./."],
            ["0/1", "0/.", "./."],
          ],
        ),
        3,
      );
      await expect(
        individualLists(page).getByText(
          "1 individual with no called genotype is not in the histogram.",
        ),
      ).toBeVisible();
      await saveIndividuals(page, "popgen-stats-no-called");
    });

    test("the statistics of each individual, no individual with a called genotype", async ({
      page,
    }) => {
      await statisticsOfCalls(
        page,
        callsVcf(
          ["i1", "i2", "i3"],
          Array.from({ length: 4 }, () => ["./.", "./.", "./."]),
        ),
        3,
      );
      await expect(
        individualLists(page).getByText(
          "3 individuals with no called genotype are not in the histogram.",
        ),
      ).toBeVisible();
      await saveIndividuals(page, "popgen-stats-none-called");
    });

    test("the statistics of each individual, the column Kept not known while a list is refused", async ({
      page,
    }) => {
      await pickPanel(page);
      await individualLists(page)
        .getByRole("button", { name: CALCULATE_STATS })
        .click();
      await expect(
        individualLists(page).getByText(STATS_CAPTION),
      ).toBeVisible();
      await listArea(page, "Individuals to keep, one name per line").fill(
        "ind_900",
      );
      await individualLists(page)
        .getByRole("button", { name: "Apply the list to keep" })
        .click();
      await expect(
        individualLists(page).getByText(/^Which individuals are kept is shown/),
      ).toBeVisible();
      await saveIndividuals(page, "popgen-stats-kept-not-known");
    });

    test("the diversity locked, every population left empty by a threshold of the individuals", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      const rows = Array.from({ length: 200 }, (_, index) => {
        const name = `s${String(index).padStart(3, "0")}`;
        return `${name},${index === 0 ? "p0" : index === 1 ? "p1" : "NA"}`;
      });
      await pickIndividuals(page, {
        name: "two_pops.csv",
        text: `IID,popcat\n${rows.join("\n")}\n`,
      });
      await choose(page, "Column that defines the populations", "popcat");
      await goTo(page, "Variants");
      // The lists cannot leave every population empty, which locks the
      // diversity; a threshold can: s000 and s001 have an observed
      // heterozygosity of 0.365 and 0.343, over every variant of the
      // file, above 0.34, and 35 individuals with no population lie below
      // it.
      const variants = page.getByLabel(
        "Maximum proportion of missing genotypes, from 0 to 1",
        { exact: true },
      );
      await variants.fill("0.05");
      await variants.press("Enter");
      await individualLists(page)
        .getByRole("button", { name: CALCULATE_STATS })
        .click();
      await expect(
        individualLists(page).getByText(STATS_CAPTION),
      ).toBeVisible();
      await individualThreshold(
        page,
        "Filter the individuals by observed heterozygosity",
        "Maximum observed heterozygosity of an individual, from 0 to 1",
        "0.34",
      );
      await goTo(page, "Analyses");
      await expect(
        page
          .getByRole("main")
          .getByText(/^The 35 individuals kept have no population in popcat/),
      ).toBeVisible();
      await save(page, `popgen-diversity-all-emptied-${theme}`);
    });

    /** Turns the threshold of the individuals `name` on and commits
        `value` in its field `label`. */
    async function individualThreshold(
      page: Page,
      name: string,
      label: string,
      value: string,
    ): Promise<void> {
      await individualLists(page).getByText(name, { exact: true }).click();
      const field = individualLists(page).getByLabel(label, { exact: true });
      await field.fill(value);
      await field.press("Enter");
      await expect(field).toHaveValue(value);
    }

    /** panel.nei and its populations, the missing data filter of the
        variants at 0.05, the statistics of each individual calculated
        when `statistics`, and the thresholds of the individuals at 0.03
        and 0.38; ends at the Analyses step. */
    async function diversityWithThresholds(
      page: Page,
      statistics: boolean,
    ): Promise<void> {
      await loadPanelWithPopulations(page);
      await goTo(page, "Variants");
      const variants = page.getByLabel(
        "Maximum proportion of missing genotypes, from 0 to 1",
        { exact: true },
      );
      await variants.fill("0.05");
      await variants.press("Enter");
      if (statistics) {
        await individualLists(page)
          .getByRole("button", { name: CALCULATE_STATS })
          .click();
        await expect(
          individualLists(page).getByText(STATS_CAPTION),
        ).toBeVisible();
      }
      await individualThreshold(
        page,
        "Filter the individuals by missing data",
        "Maximum proportion of missing genotypes of an individual, from 0 to 1",
        "0.03",
      );
      await individualThreshold(
        page,
        "Filter the individuals by observed heterozygosity",
        "Maximum observed heterozygosity of an individual, from 0 to 1",
        "0.38",
      );
    }

    test("the diversity ready, with the populations the filters of individuals keep and one a list leaves empty", async ({
      page,
    }) => {
      await diversityWithThresholds(page, true);
      const pops = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
      const p1 = pops
        .split("\n")
        .map((text) => text.split(","))
        .filter(([, pop]) => pop === "p1")
        .map(([name]) => name ?? "");
      await listArea(page, "Individuals to remove, one name per line").fill(
        p1.join("\n"),
      );
      await individualLists(page)
        .getByRole("button", { name: "Apply the list to remove" })
        .click();
      await goTo(page, "Analyses");
      await expect(
        diversityPanel(page).getByText(
          "2 populations: p0, 29 individuals; p2, 48 individuals",
        ),
      ).toBeVisible();
      await save(page, `popgen-diversity-kept-${theme}`);
    });

    test("the diversity ready, the thresholds waiting for the statistics of each individual", async ({
      page,
    }) => {
      await diversityWithThresholds(page, false);
      await goTo(page, "Analyses");
      // The principal components say the same beside their Run.
      await expect(
        diversityPanel(page).getByText(/^Run calculates the statistics/),
      ).toBeVisible();
      await save(page, `popgen-diversity-waits-ready-${theme}`);
    });

    test("the diversity running, waiting for the statistics of each individual", async ({
      page,
    }) => {
      await diversityWithThresholds(page, false);
      await holdResults(page);
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        page
          .getByRole("main")
          .getByText(
            /^Calculating the statistics of each individual, which the thresholds of the individuals need · \d+% · 0:01$/,
          ),
      ).toBeVisible({ timeout: 3000 });
      await save(page, `popgen-diversity-waits-running-${theme}`);
    });

    test("the diversity in error, the statistics of each individual refused", async ({
      page,
    }) => {
      await loadTetraploid(page);
      await individualThreshold(
        page,
        "Filter the individuals by missing data",
        "Maximum proportion of missing genotypes of an individual, from 0 to 1",
        "0.5",
      );
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        diversityPanel(page).getByText(
          /^The statistics of each individual, which the thresholds/,
        ),
      ).toBeVisible();
      await save(page, `popgen-diversity-stats-failed-${theme}`);
    });

    test("the Variants step after an opening, and with the warning of the identity", async ({
      page,
    }, testInfo) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      const saved = await saveProjectFile(page, testInfo.outputPath());
      await openProject(page, saved);
      await expect(
        page.getByRole("heading", { level: 1, name: "Variants" }),
      ).toBeFocused();
      await save(page, `popgen-variants-opened-${theme}`);
      await pickVariants(page, "panel.vcf.gz");
      await expect(page.getByRole("main").getByText(/^Warning:/)).toBeVisible();
      // The line of the card, exactly: the warning of the identity names
      // the 200 individuals of the project too.
      await expect(
        page.getByRole("main").getByText("200 individuals", { exact: true }),
      ).toBeVisible();
      await save(page, `popgen-variants-identity-${theme}`);
    });

    test("the diversity with its comparison, and with its numbers not compared, by the read options and by the format", async ({
      page,
    }, testInfo) => {
      await pickVariants(page, "panel.vcf.gz");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      await pickIndividuals(page, "panel_pops.csv");
      await choose(page, "Column that defines the populations", "popcat");
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
      const saved = await saveProjectFile(page, testInfo.outputPath());
      await openProject(page, saved);
      await pickVariants(page, "panel.vcf.gz");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(page.getByText(/^The same numbers as in/)).toBeVisible();
      await save(page, `popgen-diversity-compared-${theme}`);

      await goTo(page, "Variants");
      await page
        .getByText("Only the variants with PASS or . in the FILTER column", {
          exact: true,
        })
        .click();
      await page
        .getByRole("button", {
          name: "Read panel.vcf.gz again with every variant",
        })
        .click();
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(page.getByText(/^Not compared with/)).toBeVisible();
      await save(page, `popgen-diversity-uncompared-${theme}`);

      // A file of the other format than the project's.
      await goTo(page, "Variants");
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Analyses");
      await diversityPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        page.getByText(/^Not compared with .* this file is a \.nei file/),
      ).toBeVisible();
      await save(page, `popgen-diversity-uncompared-format-${theme}`);
    });

    test("the error bar, the project not saved", async ({ page }) => {
      // Writing the file throws, as a defect of the writer would.
      await page.evaluate(() => {
        URL.createObjectURL = () => {
          throw new Error("popnei_web defect: test");
        };
        setTimeout(() => {
          throw new Error("test");
        });
      });
      await page.getByRole("button", { name: "Save the project" }).click();
      await expect(page.getByRole("status").first()).toHaveText(
        /^The project could not be saved/,
      );
      await save(page, `popgen-error-bar-not-saved-${theme}`);
    });

    test("the error bar, the details not copied", async ({ page }) => {
      await page.evaluate(() => {
        Object.defineProperty(navigator, "clipboard", { value: undefined });
        setTimeout(() => {
          throw new Error("test");
        });
      });
      await page.getByRole("button", { name: "Copy the details" }).click();
      await expect(
        page.getByRole("textbox", { name: "The details of the errors" }),
      ).toBeVisible();
      await save(page, `popgen-error-bar-details-${theme}`);
    });

    // The panel of the principal components (docs/specs/analyses/pca.md,
    // "The panel"): panel.nei and panel_meta.csv, the populations of
    // popcat.

    test("the principal components ready, with their options", async ({
      page,
    }) => {
      const panel = await pcaPanel(page);
      await chooseRadio(
        panel.getByRole("radiogroup", {
          name: "Prune the variants by linkage disequilibrium (LD)",
        }),
        "For the PCA alone",
      );
      await expect(
        panel.getByText(/^The LD pruning of the PCA needs the distance/),
      ).toHaveCount(2);
      await save(page, `popgen-pca-ready-${theme}`);
    });

    test("the principal components running, with the words of the decomposition", async ({
      page,
    }) => {
      const panel = await pcaPanel(page);
      await holdResults(page);
      await panel.getByRole("button", { name: "Run", exact: true }).click();
      await expect(
        panel.getByText(/^The bar shows the reading of panel\.nei/),
      ).toBeVisible();
      await expect(
        panel.getByText(/^Calculating · 99% · 0:0\d$/),
      ).toBeVisible();
      await save(page, `popgen-pca-running-${theme}`);
    });

    test("the principal components in 3D, p1 highlighted", async ({ page }) => {
      const panel = await pcaRun(page, true);
      await expect(
        panel.getByRole("img", {
          name: "Principal components, PC1, PC2 and PC3",
        }),
      ).toBeVisible();
      await expect(
        panel.getByRole("button", { name: "Turn left" }),
      ).toBeVisible();
      await panel
        .getByRole("radiogroup", { name: "Population" })
        .locator("button")
        .filter({ hasText: "p1 (68)" })
        .click();
      await expect(
        panel.getByRole("radio", { name: "p1 (68)" }),
      ).toHaveAttribute("aria-checked", "true");
      // A frame for the view to be drawn with the highlight.
      await page.waitForTimeout(200);
      await save(page, `popgen-pca-3d-highlighted-${theme}`);
    });

    test("the principal components in 2D", async ({ page }) => {
      const panel = await pcaRun(page, true);
      await panel.getByRole("radio", { name: "2D", exact: true }).click();
      await expect(
        panel.locator("svg.chart-scatter .chart-axis-label").first(),
      ).toHaveText("PC1 (3.55%)");
      await save(page, `popgen-pca-2d-${theme}`);
    });

    test("the principal components in 2D, p1 highlighted", async ({ page }) => {
      const panel = await pcaRun(page, true);
      await panel.getByRole("radio", { name: "2D", exact: true }).click();
      await expect(
        panel.locator("svg.chart-scatter .chart-axis-label").first(),
      ).toHaveText("PC1 (3.55%)");
      await panel
        .getByRole("radiogroup", { name: "Population" })
        .locator("button")
        .filter({ hasText: "p1 (68)" })
        .click();
      await expect(
        panel.getByRole("radio", { name: "p1 (68)" }),
      ).toHaveAttribute("aria-checked", "true");
      // p0 and p2 faded, p1 drawn over them.
      await expect(
        panel.locator("svg.chart-scatter path.chart-points-faded"),
      ).toHaveCount(2);
      await save(page, `popgen-pca-2d-highlighted-${theme}`);
    });

    test("the principal components in a browser with no WebGL", async ({
      page,
    }) => {
      await page.addInitScript(() => {
        // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its canvas
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (
          this: HTMLCanvasElement,
          id: string,
          ...rest: unknown[]
        ) {
          if (id === "webgl2") return null;
          return (getContext as (...args: unknown[]) => unknown).call(
            this,
            id,
            ...rest,
          );
        } as typeof getContext;
      });
      await page.reload();
      const panel = await pcaRun(page, false);
      await expect(
        panel.getByText(/^This browser cannot draw the 3D view/),
      ).toBeVisible();
      await save(page, `popgen-pca-no-webgl-${theme}`);
    });

    test("the principal components, three.js not loaded", async ({ page }) => {
      await page.route("**/pca3d-*.js", (route) =>
        route.fulfill({ status: 404 }),
      );
      const panel = await pcaRun(page, false);
      await expect(
        panel.getByText(/^The 3D view could not be loaded/),
      ).toBeVisible();
      await save(page, `popgen-pca-not-loaded-${theme}`);
    });

    test("the principal components coloured by the values of altitude", async ({
      page,
    }) => {
      const panel = await pcaRun(page, true);
      await panel.getByRole("radio", { name: "2D", exact: true }).click();
      await choose(page, "Colour the points by", "altitude");
      await expect(panel.getByText("No value (3)")).toBeVisible();
      await save(page, `popgen-pca-values-${theme}`);
    });

    test("the principal components, the table sorted by PC1", async ({
      page,
    }) => {
      const panel = await pcaRun(page, true);
      await panel.getByRole("radio", { name: "2D", exact: true }).click();
      await panel
        .getByRole("columnheader", { name: "PC1", exact: true })
        .click();
      const part = panel
        .getByText(/^The place of each of the 200/)
        .locator("..");
      await part.scrollIntoViewIfNeeded();
      await part.screenshot({
        path: join(SCREENS, `popgen-pca-table-${theme}.png`),
      });
    });

    test("the PCoA with the warning of the correction", async ({ page }) => {
      const panel = await pcaPanel(page);
      await ownLdDistance(panel);
      await chooseRadio(
        panel.getByRole("radiogroup", { name: "Method" }),
        "PCoA of the Kosman distances, for data with many missing genotypes",
      );
      await panel.getByRole("button", { name: "Run", exact: true }).click();
      await expect(
        panel.getByText(/^Warning: The Kosman distances/),
      ).toBeVisible({ timeout: 30_000 });
      await panel.getByRole("radio", { name: "2D", exact: true }).click();
      await save(page, `popgen-pcoa-warning-${theme}`);
    });

    test("the principal components at 320 pixels wide", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      const panel = await pcaRun(page, true);
      await expect(
        panel.getByRole("img", {
          name: "Principal components, PC1, PC2 and PC3",
        }),
      ).toBeVisible();
      await page.waitForTimeout(200);
      await save(page, `popgen-pca-320-${theme}`);
    });

    test("the distances locked, with one population", async ({ page }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Analyses");
      await expect(
        popDistsPanel(page).getByRole("button", { name: "Run" }),
      ).toHaveAccessibleDescription(/^The distances between populations need/);
      await savePanel(page, `popgen-popdists-locked-one-${theme}`);
    });

    test("the distances locked, every population but one under the minimum", async ({
      page,
    }) => {
      await loadSplit(page);
      await goTo(page, "Analyses");
      await setMinimum(page, "70");
      await expect(
        popDistsPanel(page).getByRole("button", { name: "Run" }),
      ).toBeDisabled();
      await savePanel(page, `popgen-popdists-locked-minimum-${theme}`);
    });

    test("the distances ready, naming the populations under the minimum", async ({
      page,
    }) => {
      await loadSplit(page);
      await goTo(page, "Analyses");
      await setMinimum(page, "25");
      await expect(
        popDistsPanel(page).getByText(
          /^p0a and p0b have 24 and 24 individuals/,
        ),
      ).toBeVisible();
      await savePanel(page, `popgen-popdists-ready-under-${theme}`);
    });

    test("the distances running", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await holdResults(page);
      await goTo(page, "Analyses");
      await popDistsPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        popDistsPanel(page).getByText(/^Calculating · \d+% · 0:0[1-9]$/),
      ).toBeVisible({ timeout: 5000 });
      await savePanel(page, `popgen-popdists-running-${theme}`);
    });

    test("the distances done, the heatmap of Hudson's Fst and the table", async ({
      page,
    }) => {
      await popDistsDone(page);
      await savePanel(page, `popgen-popdists-done-${theme}`);
    });

    test("the distances done, the heatmap of Jost's D", async ({ page }) => {
      await popDistsDone(page);
      await chooseRadio(
        popDistsPanel(page).getByRole("radiogroup", {
          name: "Distance in the heatmap",
        }),
        "Jost's D",
      );
      await expect(
        popDistsPanel(page).getByRole("img", {
          name: /^Jost's D between populations/,
        }),
      ).toBeVisible();
      await savePanel(page, `popgen-popdists-jost-${theme}`);
    });

    test("the distances done, the warning of a negative distance", async ({
      page,
    }) => {
      await loadSplit(page);
      await goTo(page, "Analyses");
      await popDistsPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        popDistsPanel(page).getByText(/^Warning: .*−0\.0113/),
      ).toBeVisible();
      await savePanel(page, `popgen-popdists-negative-${theme}`);
    });

    test("the distances removed by a change of the minimum, with the notice", async ({
      page,
    }) => {
      await popDistsDone(page);
      await setMinimum(page, "25");
      await expect(
        popDistsPanel(page).getByText(
          /^The distances between populations were removed/,
        ),
      ).toBeVisible();
      await popDistsPanel(page).scrollIntoViewIfNeeded();
      await save(page, `popgen-popdists-removed-${theme}`, {
        fullPage: false,
      });
    });

    test("the distances in error, the filters keep no variant", async ({
      page,
    }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Variants");
      await page
        .getByText("Filter the variants by major allele frequency (MAF)", {
          exact: true,
        })
        .click();
      const threshold = page.getByLabel("Maximum major allele frequency", {
        exact: false,
      });
      await threshold.fill("0.4");
      await threshold.press("Enter");
      await goTo(page, "Analyses");
      await popDistsPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        popDistsPanel(page).getByText(/^The filters kept none of the variants/),
      ).toBeVisible();
      await savePanel(page, `popgen-popdists-no-variant-${theme}`);
    });

    test("the distances above 200 populations", async ({ page }, testInfo) => {
      // 402 individuals, two in each of 201 populations, q0 to q200.
      const path = testInfo.outputPath("pops201.vcf");
      await writeBigVcf(path, 100, 402);
      await pickVariants(page, { path });
      await expect(
        page.getByRole("main").getByText("402 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      await pickIndividuals(page, {
        name: "pops201.csv",
        text: `IID,pop\n${Array.from(
          { length: 402 },
          (_, i) =>
            `s${String(i).padStart(3, "0")},q${String(Math.floor(i / 2))}\n`,
        ).join("")}`,
      });
      await choose(page, "Column that defines the populations", "pop");
      await goTo(page, "Analyses");
      await setMinimum(page, "2");
      await popDistsPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        popDistsPanel(page).getByText(
          /^The heatmap and the table are shown for up to 200 populations/,
        ),
      ).toBeVisible({ timeout: 30_000 });
      await savePanel(page, `popgen-popdists-many-${theme}`);
    });

    test("the distances done, 100 populations, whose names the heatmap does not write", async ({
      page,
    }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      // Two individuals in each of 100 populations, q0 to q99.
      await pickIndividuals(page, {
        name: "pops100.csv",
        text: `IID,pop\n${Array.from(
          { length: 200 },
          (_, i) =>
            `s${String(i).padStart(3, "0")},q${String(Math.floor(i / 2))}\n`,
        ).join("")}`,
      });
      await choose(page, "Column that defines the populations", "pop");
      await goTo(page, "Analyses");
      await setMinimum(page, "2");
      await popDistsPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        popDistsPanel(page).getByRole("img", {
          name: /^Hudson's Fst between populations/,
        }),
      ).toBeVisible({ timeout: 30_000 });
      await popDistsPanel(page)
        .getByRole("img", { name: /^Hudson's Fst between populations/ })
        .scrollIntoViewIfNeeded();
      await page
        .locator(".chart-heatmap")
        .first()
        .screenshot({
          path: join(SCREENS, `popgen-popdists-hundred-${theme}.png`),
        });
    });

    test("the distances done, Jost's D of a haploid file, every cell with no value", async ({
      page,
    }) => {
      await pickVariants(page, {
        name: "haploid.vcf",
        text: smallVcf(9, () => false, "haploid"),
      });
      await expect(
        page.getByRole("main").getByText("9 individuals"),
      ).toBeVisible();
      const ploidy = page.getByLabel("Ploidy of the VCF");
      await ploidy.fill("1");
      await ploidy.press("Enter");
      await page
        .getByRole("button", { name: "Read haploid.vcf again with ploidy 1" })
        .click();
      await loadSmallPopulations(page);
      await popDistsPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        popDistsPanel(page).getByText(/^Warning: Jost's D has no value/),
      ).toBeVisible();
      await chooseRadio(
        popDistsPanel(page).getByRole("radiogroup", {
          name: "Distance in the heatmap",
        }),
        "Jost's D",
      );
      await expect(
        popDistsPanel(page).getByRole("img", {
          name: /^Jost's D between populations/,
        }),
      ).toBeVisible();
      await savePanel(page, `popgen-popdists-haploid-jost-${theme}`);
    });

    test("the distances done, a pair with no value and its line of order", async ({
      page,
    }) => {
      // The individuals of C, the last three, have no called genotype.
      await pickVariants(page, {
        name: "c_missing.vcf",
        text: smallVcf(9, (individual) => individual >= 6, "diploid"),
      });
      await expect(
        page.getByRole("main").getByText("9 individuals"),
      ).toBeVisible();
      // The missing data filter would keep no variant.
      await page
        .getByText("Filter the variants by missing data", { exact: true })
        .click();
      await loadSmallPopulations(page);
      await popDistsPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        popDistsPanel(page).getByText(/^In the order of the metadata file/),
      ).toBeVisible();
      await savePanel(page, `popgen-popdists-no-value-${theme}`);
    });

    test("the distances done, two populations", async ({ page }) => {
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      const text = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
      await pickIndividuals(page, {
        name: "two_pops.csv",
        text: text.replaceAll(/,p1$/gm, ",p2"),
      });
      await choose(page, "Column that defines the populations", "popcat");
      await goTo(page, "Analyses");
      await popDistsPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        popDistsPanel(page).getByRole("rowheader", { name: "p0 and p2" }),
      ).toBeVisible({ timeout: 30_000 });
      await savePanel(page, `popgen-popdists-two-${theme}`);
    });

    test("the distances done, populations under the minimum left out", async ({
      page,
    }) => {
      await loadSplit(page);
      await goTo(page, "Analyses");
      await setMinimum(page, "25");
      await popDistsPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        popDistsPanel(page).getByText(/^Warning: Populations p0a and p0b/),
      ).toBeVisible({ timeout: 30_000 });
      await savePanel(page, `popgen-popdists-too-few-${theme}`);
    });

    test("the distances done at 320 pixels wide, in the committed font", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await useWideFont(page);
      await popDistsDone(page);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(320);
      // The heatmap of three short names fits the page with no scroll.
      await expect(
        popDistsPanel(page).getByText(
          "Scroll the heatmap sideways to see all of it.",
        ),
      ).toHaveCount(0);
      await savePanel(page, `popgen-popdists-320-${theme}`);
    });

    test("the distances done at 320 pixels wide, with names of 20 characters", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await useWideFont(page);
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      const text = await readFile(join(FIXTURES, "panel_pops.csv"), "utf8");
      await pickIndividuals(page, {
        name: "long_pops.csv",
        text: text.replaceAll(/,(p\d)$/gm, ",Valencia_landrace_$1"),
      });
      await choose(page, "Column that defines the populations", "popcat");
      await goTo(page, "Analyses");
      await popDistsPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        popDistsPanel(page).getByText(
          "Scroll the heatmap sideways to see all of it.",
        ),
      ).toBeVisible({ timeout: 30_000 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(320);
      await savePanel(page, `popgen-popdists-320-long-names-${theme}`);
    });

    test("the LD decay locked by the distance not typed, with why beside the field and where beside the Run button", async ({
      page,
    }) => {
      await loadLd(page);
      await expect(
        ldDecayPanel(page).getByRole("button", { name: "Run" }),
      ).toHaveAccessibleDescription("Type the largest distance, above.");
      await expect(
        ldDecayPanel(page).getByLabel(LD_DISTANCE),
      ).toHaveAccessibleDescription(
        /^The LD decay needs the largest distance .* How far to look for pairs\./,
      );
      await saveLdPanel(page, `popgen-lddecay-locked-distance-${theme}`);
    });

    test("the LD decay locked by the memory of the counts", async ({
      page,
    }) => {
      await loadLd(page);
      // One base pair above the 12,500,000 the memory allows two
      // populations.
      await setLdDistance(page, "12500001");
      await expect(
        ldDecayPanel(page).getByRole("button", { name: "Run" }),
      ).toHaveAccessibleDescription(
        /^With 2 populations, the largest distance can be at most 12,500,000 base pairs/,
      );
      await saveLdPanel(page, `popgen-lddecay-locked-memory-${theme}`);
    });

    test("the LD decay ready, with the line of the LD pruning of the Variants step", async ({
      page,
    }) => {
      await loadLd(page);
      await goTo(page, "Variants");
      await page
        .getByText("Prune the variants by linkage disequilibrium (LD)", {
          exact: true,
        })
        .click();
      await goTo(page, "Analyses");
      await setLdDistance(page, "100000");
      await expect(
        ldDecayPanel(page).getByText(
          /^The LD pruning of the Variants step is not applied here/,
        ),
      ).toBeVisible();
      await expect(
        ldDecayPanel(page).getByRole("button", { name: "Run" }),
      ).toBeEnabled();
      await saveLdPanel(page, `popgen-lddecay-ready-pruning-${theme}`);
    });

    test("the LD decay running, with the line of the fit", async ({ page }) => {
      await loadLd(page);
      await setLdDistance(page, "100000");
      await holdResults(page);
      await ldDecayPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        ldDecayPanel(page).getByText(/^Calculating · \d+% · 0:0[1-9]$/),
      ).toBeVisible({ timeout: 5000 });
      await expect(
        ldDecayPanel(page).getByText(
          /^The bar shows the reading of ld\.nei\. The curves are fitted once it is read\. With a large distance /,
        ),
      ).toBeVisible();
      await saveLdPanel(page, `popgen-lddecay-running-${theme}`);
    });

    test("the LD decay done, the plot with its legend and the table of the populations", async ({
      page,
    }) => {
      await ldDecayDone(page);
      await saveLdPanel(page, `popgen-lddecay-done-${theme}`);
    });

    test("the LD decay done, the table of the bins in its tab", async ({
      page,
    }) => {
      await ldDecayDone(page);
      await ldDecayPanel(page)
        .getByRole("tab", { name: "Table of the bins" })
        .click();
      await expect(
        ldDecayPanel(page).getByRole("columnheader", { name: "Mean r²" }),
      ).toBeVisible();
      await saveLdPanel(page, `popgen-lddecay-bins-${theme}`);
    });

    test("the LD decay done, the table of the bins scrolled in its frame, its header in view", async ({
      page,
    }) => {
      await ldDecayDone(page);
      await ldDecayPanel(page)
        .getByRole("tab", { name: "Table of the bins" })
        .click();
      const frame = ldDecayPanel(page).getByRole("region", {
        name: /^The 50 bins/,
      });
      await frame.focus();
      await frame.evaluate((element) => {
        element.scrollTo(0, 1200);
      });
      await expect(
        ldDecayPanel(page).getByRole("columnheader", { name: "Mean r²" }),
      ).toBeInViewport();
      await saveLdPanel(page, `popgen-lddecay-bins-scrolled-${theme}`);
    });

    test("the LD decay done with 17 populations of 5 or 6 individuals: the warning of few individuals, 16 in the plot and its line", async ({
      page,
    }) => {
      await pickVariants(page, "ld.nei");
      await expect(
        page.getByRole("main").getByText("100 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      await pickIndividuals(page, {
        name: "pops17.csv",
        text: `IID,pop\n${Array.from(
          { length: 100 },
          (_, i) => `i${String(i).padStart(3, "0")},q${String(i % 17)}\n`,
        ).join("")}`,
      });
      await choose(page, "Column that defines the populations", "pop");
      await goTo(page, "Analyses");
      await setLdDistance(page, "100000");
      await ldDecayPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        ldDecayPanel(page).getByText(
          "The plot draws the first 16 of the 17 populations, in the order of the table of the populations. The two tables hold all 17.",
        ),
      ).toBeVisible({ timeout: 30_000 });
      await expect(
        ldDecayPanel(page).getByText(/^Warning: .*fewer than 20 individuals/),
      ).toBeVisible();
      await saveLdPanel(page, `popgen-lddecay-few-individuals-${theme}`);
    });

    test("the LD decay done on panel.nei, each half distance below the closest pairs", async ({
      page,
    }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await setLdDistance(page, "100000");
      await ldDecayPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        ldDecayPanel(page)
          .getByText(/^Warning: The curve of p0 falls to half at 0\.247 bp/)
          .first(),
      ).toBeVisible({ timeout: 30_000 });
      await saveLdPanel(page, `popgen-lddecay-half-below-${theme}`);
    });

    test("the LD decay in error, the filters keep no variant", async ({
      page,
    }) => {
      await loadLd(page);
      await goTo(page, "Variants");
      await page
        .getByText("Filter the variants by major allele frequency (MAF)", {
          exact: true,
        })
        .click();
      const threshold = page.getByLabel("Maximum major allele frequency", {
        exact: false,
      });
      await threshold.fill("0.4");
      await threshold.press("Enter");
      await goTo(page, "Analyses");
      await setLdDistance(page, "100000");
      await ldDecayPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        ldDecayPanel(page).getByText(
          /^The filters kept none of the variants of ld\.nei/,
        ),
      ).toBeVisible();
      await saveLdPanel(page, `popgen-lddecay-no-variant-${theme}`);
    });

    test("the LD decay done, two names of 45 characters alike in their first 40, and half distances beyond the plot", async ({
      page,
    }) => {
      await pickVariants(page, "ld.nei");
      await expect(
        page.getByRole("main").getByText("100 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      const stem = "Solanum_pimpinellifolium_from_N_Ecuador_";
      await pickIndividuals(page, {
        name: "long_pops.csv",
        text: `IID,pop\n${Array.from(
          { length: 100 },
          (_, i) =>
            `i${String(i).padStart(3, "0")},${stem}${i < 50 ? "wild1" : "weed2"}\n`,
        ).join("")}`,
      });
      await choose(page, "Column that defines the populations", "pop");
      await goTo(page, "Analyses");
      // The variants are 1,000 bp apart: within 2,000 bp the curves fitted
      // fall to half beyond the plot.
      await setLdDistance(page, "2000");
      await ldDecayPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        ldDecayPanel(page).getByText(
          /^Warning: .* beyond the 2,000 base pairs/,
        ),
      ).toHaveCount(2, { timeout: 30_000 });
      await saveLdPanel(page, `popgen-lddecay-long-names-${theme}`);
    });

    test("the LD decay done at 320 pixels wide, two names of 45 characters in its warnings", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await useWideFont(page);
      await pickVariants(page, "ld.nei");
      await expect(
        page.getByRole("main").getByText("100 individuals"),
      ).toBeVisible();
      await goTo(page, "Individuals");
      const stem = "Solanum_pimpinellifolium_from_N_Ecuador_";
      await pickIndividuals(page, {
        name: "long_pops.csv",
        text: `IID,pop\n${Array.from(
          { length: 100 },
          (_, i) =>
            `i${String(i).padStart(3, "0")},${stem}${i < 50 ? "wild1" : "weed2"}\n`,
        ).join("")}`,
      });
      await choose(page, "Column that defines the populations", "pop");
      await goTo(page, "Analyses");
      await setLdDistance(page, "2000");
      await ldDecayPanel(page).getByRole("button", { name: "Run" }).click();
      await expect(
        ldDecayPanel(page).getByText(
          /^Warning: .* beyond the 2,000 base pairs/,
        ),
      ).toHaveCount(2, { timeout: 30_000 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(320);
      await saveLdPanel(page, `popgen-lddecay-long-names-320-${theme}`);
    });

    test("the LD decay done at 320 pixels wide, in the committed font", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await useWideFont(page);
      await ldDecayDone(page);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(320);
      // The plot keeps the width the label of its axis needs, and its
      // frame scrolls sideways, not the page.
      await expect(
        ldDecayPanel(page).getByText(
          "Scroll the plot sideways to see all of it.",
        ),
      ).toBeVisible();
      await saveLdPanel(page, `popgen-lddecay-320-${theme}`);
    });

    test("the LD decay locked at 320 pixels wide, in the committed font", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 900 });
      await useWideFont(page);
      await loadLd(page);
      await expect(
        ldDecayPanel(page).getByRole("button", { name: "Run" }),
      ).toBeDisabled();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(320);
      await saveLdPanel(page, `popgen-lddecay-320-locked-${theme}`);
    });
  });
}

/** The panel of the LD decay, its region named by its heading. */
function ldDecayPanel(page: Page): Locator {
  return page.getByRole("region", { name: "LD decay", exact: true });
}

/** Saves the panel of the LD decay alone as `name`: the Analyses step
    holds the other three panels above it. */
async function saveLdPanel(page: Page, name: string): Promise<void> {
  await ldDecayPanel(page).screenshot({ path: join(SCREENS, `${name}.png`) });
}

/** The label of the field of the largest distance of the LD decay. */
const LD_DISTANCE =
  "Largest distance between the two variants of a pair, in base pairs, from 50";

/** Loads ld.nei and ld_pops.csv, chooses the column pop, its two
    populations of 50, and goes to the Analyses step. */
async function loadLd(page: Page): Promise<void> {
  await pickVariants(page, "ld.nei");
  await expect(
    page.getByRole("main").getByText("100 individuals"),
  ).toBeVisible();
  await goTo(page, "Individuals");
  await pickIndividuals(page, "ld_pops.csv");
  await choose(page, "Column that defines the populations", "pop");
  await expect(
    page.getByRole("main").getByText("pop_a, 50 individuals"),
  ).toBeAttached();
  await goTo(page, "Analyses");
}

/** Types `distance` in the field of the largest distance of the LD decay,
    and commits it with Enter. */
async function setLdDistance(page: Page, distance: string): Promise<void> {
  const field = ldDecayPanel(page).getByLabel(LD_DISTANCE);
  await field.fill(distance);
  await field.press("Enter");
  await expect(field).toHaveValue(distance);
}

/** Loads ld.nei with its two populations, runs the LD decay up to
    100,000 bp, and waits for the plot and the table of the populations. */
async function ldDecayDone(page: Page): Promise<void> {
  await loadLd(page);
  await setLdDistance(page, "100000");
  await ldDecayPanel(page).getByRole("button", { name: "Run" }).click();
  await expect(
    ldDecayPanel(page).getByRole("cell", { name: "7,548", exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    ldDecayPanel(page).getByRole("img", { name: "LD decay" }),
  ).toBeVisible();
}

/** The panel of the distances between populations, its region named by
    its heading. */
function popDistsPanel(page: Page): Locator {
  return page.getByRole("region", { name: "Distances between populations" });
}

/** Saves the panel of the distances alone as `name`: the Analyses step
    holds the principal components and the diversity above it. */
async function savePanel(page: Page, name: string): Promise<void> {
  await popDistsPanel(page).screenshot({ path: join(SCREENS, `${name}.png`) });
}

/** Loads panel.nei and panel_split.csv, whose p0 is split in p0a and p0b
    of 24 individuals each, chooses popsplit, and stays at the
    Individuals step. */
async function loadSplit(page: Page): Promise<void> {
  await pickVariants(page, "panel.nei");
  await expect(
    page.getByRole("main").getByText("200 individuals"),
  ).toBeVisible();
  await goTo(page, "Individuals");
  await pickIndividuals(page, "panel_split.csv");
  await choose(page, "Column that defines the populations", "popsplit");
  await expect(
    page.getByRole("main").getByText("p0a, 24 individuals"),
  ).toBeAttached();
}

/** A VCF of 20 variants and `numIndividuals` individuals, i0, i1, …,
    haploid or diploid, with the genotypes of the individuals `missing`
    gives true for left uncalled, and the others drawn from the variant
    and the individual so that the populations differ. */
function smallVcf(
  numIndividuals: number,
  missing: (individual: number) => boolean,
  ploidy: "haploid" | "diploid",
): string {
  const names = Array.from(
    { length: numIndividuals },
    (_, i) => `i${String(i)}`,
  );
  const allele = (variant: number, individual: number, copy: number): string =>
    String(
      (variant * 7 + individual * 3 + copy * 5) % 11 < 4 + (individual % 3)
        ? 1
        : 0,
    );
  const lines = Array.from({ length: 20 }, (_, v) => {
    const genotypes = names.map((_, i) => {
      if (missing(i)) return ploidy === "haploid" ? "." : "./.";
      return ploidy === "haploid"
        ? allele(v, i, 0)
        : `${allele(v, i, 0)}/${allele(v, i, 1)}`;
    });
    return `1\t${String((v + 1) * 1000)}\t.\tA\tC\t.\tPASS\t.\tGT\t${genotypes.join("\t")}`;
  });
  return [
    "##fileformat=VCFv4.2",
    '##FORMAT=<ID=GT,Number=1,Type=String,Description="Genotype">',
    `#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t${names.join("\t")}`,
    ...lines,
    "",
  ].join("\n");
}

/** Loads the metadata file of the small VCF, its nine individuals in A,
    B and C of three, goes to the Analyses step and sets the minimum of
    the distances to 2. */
async function loadSmallPopulations(page: Page): Promise<void> {
  await goTo(page, "Individuals");
  await pickIndividuals(page, {
    name: "small_pops.csv",
    text: `IID,pop\n${Array.from(
      { length: 9 },
      (_, i) => `i${String(i)},${"ABC"[Math.floor(i / 3)] ?? ""}\n`,
    ).join("")}`,
  });
  await choose(page, "Column that defines the populations", "pop");
  await goTo(page, "Analyses");
  await setMinimum(page, "2");
}

/** Types `minimum` in the field of the minimum of the distances, and
    commits it with Enter. */
async function setMinimum(page: Page, minimum: string): Promise<void> {
  const field = popDistsPanel(page).getByLabel(
    "Individuals with a called genotype needed in each population, per variant",
  );
  await field.fill(minimum);
  await field.press("Enter");
}

/** Loads panel.nei and panel_pops.csv with popcat, runs the distances,
    and waits for the heatmap and the table. */
async function popDistsDone(page: Page): Promise<void> {
  await loadPanelWithPopulations(page);
  await goTo(page, "Analyses");
  await popDistsPanel(page).getByRole("button", { name: "Run" }).click();
  await expect(
    popDistsPanel(page).getByRole("rowheader", { name: "p0 and p2" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    popDistsPanel(page).getByRole("img", {
      name: /^Hudson's Fst between populations/,
    }),
  ).toBeVisible();
}

/** The fonts of DejaVu Sans, the sans-serif font of Ubuntu's runners, as
    wide as Verdana and wider than the Mac's system font, which the
    pictures at 320 pixels give the page (testing.md, the plan of stage
    5, "What every prompt of a task carries"). */
const WIDE_FONTS = [
  { file: "DejaVuSans.woff2", weight: "100 500" },
  { file: "DejaVuSans-Bold.woff2", weight: "600 900" },
] as const;

/** Gives the page DejaVu Sans as the font of its text. */
async function useWideFont(page: Page): Promise<void> {
  const faces = await Promise.all(
    WIDE_FONTS.map(async ({ file, weight }) => {
      const bytes = await readFile(join(FIXTURES, "fonts", file));
      return `@font-face { font-family: "Wide test font"; font-weight: ${weight}; src: url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2"); }`;
    }),
  );
  await page.addStyleTag({
    content: `${faces.join("\n")}\n:root { --font-body: "Wide test font"; font-family: "Wide test font"; }`,
  });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

test("popgen.html, its code not loaded", async ({ page }) => {
  await page.route("**/assets/popgen-*.js", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );
  await page.goto("popgen.html");
  await expect(
    page.getByText("The application could not be loaded. Reload the page."),
  ).toBeVisible();
  await save(page, "popgen-not-loaded-light");
});

/** Picks `file`, a fixture or a path, with the button of popgen2.html. */
async function pickOnNewPage(page: Page, file: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Variants file" })
    .getByRole("button", { name: /^Open (another )?variants file…$/ })
    .click();
  await (
    await chooser
  ).setFiles(file.startsWith("/") ? file : join(FIXTURES, file));
}

/** The box of the file open on popgen2.html, which holds the count of
    its variants. */
function newPageCount(page: Page): Locator {
  return page.getByRole("region", { name: "File information" });
}

/** The statistics of the open file on popgen2.html, above the open
    button. */
function newPageStats(page: Page): Locator {
  return page.getByRole("region", { name: "Statistics of the file" });
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [null, 320] as const) {
    const at = width === null ? "" : `-${String(width)}`;
    test.describe(`popgen2.html, ${theme}${width === null ? "" : `, at ${String(width)} px`}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.emulateMedia({
          colorScheme: theme,
          reducedMotion: "reduce",
        });
        if (width !== null) {
          await page.setViewportSize({ width, height: 900 });
        }
        await page.goto("popgen2.html");
        await expect(
          page.getByRole("heading", { level: 1, name: "Popnei" }),
        ).toBeVisible();
      });

      test("nothing opened", async ({ page }) => {
        await save(page, `popgen2-empty${at}-${theme}`);
      });

      test("reading the file", async ({ page }) => {
        // The wasm is held back, so the read waits for the calculation
        // worker; the page was opened before, so it is fetched again.
        await page.route("**/*.wasm", () => undefined);
        await page.reload();
        await pickOnNewPage(page, "panel.vcf.gz");
        await expect(page.getByText("1 second so far.")).toBeVisible();
        await save(page, `popgen2-reading${at}-${theme}`);
      });

      test("counting the variants", async ({ page }, testInfo) => {
        test.setTimeout(120_000);
        const vcf = testInfo.outputPath("count.vcf.gz");
        await writeBigVcf(vcf, 200_000);
        await pickOnNewPage(page, vcf);
        await expect(
          newPageCount(page).getByText(
            /^Variants: (counting… \d+%|[\d,]+ so far)$/u,
          ),
        ).toBeVisible({ timeout: 30_000 });
        await expect(newPageStats(page)).toBeVisible();
        await save(page, `popgen2-counting${at}-${theme}`);
      });

      test("the summary", async ({ page }) => {
        await pickOnNewPage(page, "panel.vcf.gz");
        await expect(
          newPageCount(page).getByText("Chromosomes: 1"),
        ).toBeVisible();
        await expect(newPageStats(page).locator("svg.chart")).toHaveCount(6);
        await save(page, `popgen2-summary${at}-${theme}`);
      });

      test("a .nei summary", async ({ page }) => {
        await pickOnNewPage(page, "panel.nei");
        await expect(
          newPageCount(page).getByText("Chromosomes: 1"),
        ).toBeVisible();
        await expect(newPageStats(page).locator("svg.chart")).toHaveCount(6);
        await save(page, `popgen2-nei-summary${at}-${theme}`);
      });

      test("a file refused by its name", async ({ page }) => {
        const chooser = page.waitForEvent("filechooser");
        await page.getByRole("button", { name: "Open variants file…" }).click();
        await (await chooser).setFiles(join(FIXTURES, "panel_pops.csv"));
        await expect(
          page.getByText(/^panel_pops\.csv was not opened/u),
        ).toBeVisible();
        await save(page, `popgen2-name-refused${at}-${theme}`);
      });

      test("a file refused by its name while another is open", async ({
        page,
      }) => {
        await pickOnNewPage(page, "panel.nei");
        await expect(
          newPageCount(page).getByText("Chromosomes: 1"),
        ).toBeVisible();
        await pickOnNewPage(page, "panel_pops.csv");
        await expect(
          page.getByText(/^panel_pops\.csv was not opened/u),
        ).toBeVisible();
        await save(page, `popgen2-name-refused-open${at}-${theme}`);
      });

      test("a file popnei could not read", async ({ page }) => {
        await pickOnNewPage(page, "bad.vcf");
        await expect(
          page.getByText(/^popnei could not read bad\.vcf/u),
        ).toBeVisible();
        await save(page, `popgen2-not-read${at}-${theme}`);
      });

      test("a count that failed", async ({ page }) => {
        await pickOnNewPage(page, "bad_position.vcf.gz");
        await expect(
          newPageCount(page).getByText(/^popnei could not read bad_position/u),
        ).toBeVisible();
        await expect(
          newPageStats(page).getByText("Not calculated."),
        ).toHaveCount(2);
        await save(page, `popgen2-count-failed${at}-${theme}`);
      });

      test("a count stopped", async ({ page }, testInfo) => {
        test.setTimeout(120_000);
        const vcf = testInfo.outputPath("stop.vcf.gz");
        await writeBigVcf(vcf, 200_000);
        await pickOnNewPage(page, vcf);
        await expect(
          newPageCount(page).getByRole("progressbar", {
            name: "Counting the variants",
            exact: true,
          }),
        ).toBeVisible({ timeout: 60_000 });
        await newPageCount(page).getByRole("button", { name: "Stop" }).click();
        await expect(
          newPageCount(page).getByRole("button", { name: "Start again" }),
        ).toBeVisible();
        await expect(
          newPageStats(page).getByText(
            "Stopped. Start again reads the file from the start.",
          ),
        ).toHaveCount(2);
        await save(page, `popgen2-count-stopped${at}-${theme}`);
      });

      test("a VCF of no variant", async ({ page }) => {
        await pickOnNewPage(page, "no_variants.vcf");
        await expect(
          newPageCount(page).getByText(
            "no_variants.vcf has no variants. Open another variants file.",
          ),
        ).toBeVisible();
        await save(page, `popgen2-no-variants${at}-${theme}`);
      });

      test("a crash at the opening", async ({ page }) => {
        await crashWorkerOn(page, "open");
        await page.reload();
        await pickOnNewPage(page, "panel.vcf.gz");
        await expect(page.getByRole("alert")).toBeVisible();
        await expect(
          newPageCount(page).getByText("panel.vcf.gz could not be read."),
        ).toBeVisible();
        await save(page, `popgen2-crash-opening${at}-${theme}`);
      });

      test("a crash during the count", async ({ page }) => {
        await crashWorkerOn(page, "run");
        await page.reload();
        await pickOnNewPage(page, "panel.vcf.gz");
        await expect(page.getByRole("alert")).toBeVisible();
        await expect(
          newPageCount(page).getByRole("button", { name: "Start again" }),
        ).toBeVisible();
        await expect(
          newPageStats(page).getByText("Not calculated."),
        ).toHaveCount(2);
        await save(page, `popgen2-crash-count${at}-${theme}`);
      });

      test("the FILTER failures of low_qual.vcf.gz while the file is read", async ({
        page,
      }) => {
        await page.route("**/*.wasm", () => undefined);
        await page.reload();
        await pickOnNewPage(page, "low_qual.vcf.gz");
        await expect(
          newPageCount(page).getByText("FILTER failures: reading…"),
        ).toBeVisible();
        await expect(page.getByText("1 second so far.")).toBeVisible();
        await save(page, `popgen2-filter-reading${at}-${theme}`);
      });

      test("the FILTER failures of low_qual.vcf.gz so far", async ({
        page,
      }) => {
        await holdSummary(page);
        await page.reload();
        await pickOnNewPage(page, "low_qual.vcf.gz");
        await expect(newPageCount(page).getByRole("progressbar")).toBeVisible({
          timeout: 60_000,
        });
        await release(page, "oneSoFar");
        await expect(
          newPageCount(page).getByText("FILTER failures: 300 so far"),
        ).toBeVisible({ timeout: 60_000 });
        await save(page, `popgen2-filter-so-far${at}-${theme}`);
      });

      test("the FILTER failures of low_qual.vcf.gz counted", async ({
        page,
      }) => {
        await pickOnNewPage(page, "low_qual.vcf.gz");
        await expect(
          newPageCount(page).getByText("FILTER failures: 300", { exact: true }),
        ).toBeVisible({ timeout: 20_000 });
        await expect(newPageStats(page).locator("svg.chart")).toHaveCount(6);
        await save(page, `popgen2-filter-done${at}-${theme}`);
      });

      test("the FILTER failures of low_qual.vcf.gz after a Stop", async ({
        page,
      }) => {
        await holdSummary(page);
        await page.reload();
        await pickOnNewPage(page, "low_qual.vcf.gz");
        await expect(newPageCount(page).getByRole("progressbar")).toBeVisible({
          timeout: 60_000,
        });
        await newPageCount(page).getByRole("button", { name: "Stop" }).click();
        await expect(
          newPageCount(page).getByText("FILTER failures: not counted"),
        ).toBeVisible();
        await expect(
          newPageStats(page).getByText(
            "Stopped. Start again reads the file from the start.",
          ),
        ).toHaveCount(2);
        await save(page, `popgen2-filter-stopped${at}-${theme}`);
        // The worker made at the Stop served before the test ends.
        await newPageCount(page)
          .getByRole("button", { name: "Start again" })
          .click();
        await release(page, "allSoFar");
        await release(page, "result");
        await expect(
          newPageCount(page).getByText("FILTER failures: 300", { exact: true }),
        ).toBeVisible({ timeout: 20_000 });
      });

      test("the FILTER failures of low_qual.vcf.gz after a crash of the count", async ({
        page,
      }) => {
        await crashWorkerOn(page, "run");
        await page.reload();
        await pickOnNewPage(page, "low_qual.vcf.gz");
        await expect(page.getByRole("alert")).toBeVisible();
        await expect(
          newPageCount(page).getByText("FILTER failures: not counted"),
        ).toBeVisible();
        await expect(
          newPageStats(page).getByText("Not calculated."),
        ).toHaveCount(2);
        await save(page, `popgen2-filter-failed${at}-${theme}`);
      });

      test("the statistics running", async ({ page }, testInfo) => {
        test.setTimeout(120_000);
        const vcf = testInfo.outputPath("running.vcf.gz");
        await writeBigVcf(vcf, 200_000);
        await pickOnNewPage(page, vcf);
        await expect(
          newPageStats(page).getByText(
            /^Calculating the statistics of the variants… \d+%$/u,
          ),
        ).toBeVisible({ timeout: 60_000 });
        await save(page, `popgen2-stats-running${at}-${theme}`);
      });

      test("the statistics running, with their plots so far", async ({
        page,
      }, testInfo) => {
        test.setTimeout(120_000);
        // The first result so far let through and the others and the
        // result held (holdWorker.ts), so that the plots stay those of
        // popnei's first block in the browser, 5,000 variants of 30,000.
        const vcf = testInfo.outputPath("so_far.vcf.gz");
        await writeBigVcf(vcf, 30_000);
        // The page was opened before, so its worker is fetched again.
        await holdSummary(page);
        await page.reload();
        await pickOnNewPage(page, vcf);
        await expect(newPageCount(page).getByRole("progressbar")).toBeVisible({
          timeout: 60_000,
        });
        await release(page, "oneSoFar");
        await expect(
          newPageStats(page).getByText(/^Keeps .* variants so far$/u),
        ).toHaveCount(4, { timeout: 60_000 });
        await expect(newPageStats(page).locator("svg.chart")).toHaveCount(6);
        await save(page, `popgen2-stats-so-far${at}-${theme}`);
      });

      test("the statistics done", async ({ page }) => {
        await pickOnNewPage(page, "panel.vcf.gz");
        await expect(
          newPageStats(page).getByRole("button", {
            name: /^Download the missing genotypes/u,
          }),
        ).toBeVisible({ timeout: 20_000 });
        await expect(newPageStats(page).locator("svg.chart")).toHaveCount(6);
        await save(page, `popgen2-stats-done${at}-${theme}`);
      });

      test("the thresholds moved: a line dragged into the middle, and the six at numbers whose count of the variants was a range before popnei 0.2.2", async ({
        page,
      }) => {
        await pickOnNewPage(page, "panel.vcf.gz");
        const het = newPageStats(page).getByRole("group", {
          name: "Observed heterozygosity",
          exact: true,
        });
        await expect(het.getByText("Keeps all 1,200 variants")).toBeVisible({
          timeout: 20_000,
        });
        // The thumb, around the hidden input of the slider.
        const thumb = het.getByRole("slider").locator("xpath=../..");
        await thumb.scrollIntoViewIfNeeded();
        const box = await thumb.boundingBox();
        if (box === null) throw new Error("no thumb");
        const y = box.y + box.height / 2;
        const frame = await het.locator("svg.chart").boundingBox();
        if (frame === null) throw new Error("no plot");
        await page.mouse.move(box.x + box.width / 2, y);
        await page.mouse.down();
        await page.mouse.move(frame.x + frame.width * 0.55, y, { steps: 8 });
        await page.mouse.up();
        await page.mouse.move(0, 0);
        // Each count one number, what popnei's filter keeps; under popnei
        // 0.2.1 the four of the variants were ranges, "Keeps 1,113 to
        // 1,152 of 1,200 variants" at 0.05 of the missing rate.
        for (const [name, value, words] of [
          [
            "Proportion of missing genotypes",
            "0.05",
            "Keeps 1,152 of 1,200 variants",
          ],
          ["Major allele frequency", "0.52", "Keeps 49 of 1,200 variants"],
          ["Observed heterozygosity", "0.3", "Keeps 373 of 1,200 variants"],
          [
            "Expected heterozygosity (unbiased)",
            "0.3",
            "Keeps 311 of 1,200 variants",
          ],
          [
            "Proportion of missing genotypes of each individual",
            "0.03",
            "Keeps 116 of 200 individuals",
          ],
          [
            "Observed heterozygosity of each individual",
            "0.35",
            "Keeps 73 of 200 individuals",
          ],
        ] as const) {
          const group = newPageStats(page).getByRole("group", {
            name,
            exact: true,
          });
          await group.getByRole("textbox").fill(value);
          await group.getByRole("textbox").press("Enter");
          await expect(group.getByText(words, { exact: true })).toBeVisible();
        }
        await page.mouse.click(1, 1);
        await save(page, `popgen2-thresholds-moved${at}-${theme}`);
      });

      test("a threshold of the variants typed at 0 and raised to 0.001", async ({
        page,
      }) => {
        await pickOnNewPage(page, "panel.vcf.gz");
        const missing = newPageStats(page).getByRole("group", {
          name: "Proportion of missing genotypes",
          exact: true,
        });
        await expect(missing.getByText(/^Keeps .* variants$/u)).toBeVisible({
          timeout: 20_000,
        });
        await missing.getByRole("textbox").fill("0");
        await missing.getByRole("textbox").press("Enter");
        await expect(
          missing.getByText(
            "A threshold below 0.001 is counted as 0.001, the smallest the bins tell apart.",
          ),
        ).toBeVisible();
        await save(page, `popgen2-threshold-raised${at}-${theme}`);
      });

      test("the focus on the line of a threshold", async ({ page }) => {
        await pickOnNewPage(page, "panel.vcf.gz");
        const het = newPageStats(page).getByRole("group", {
          name: "Observed heterozygosity",
          exact: true,
        });
        await expect(het.getByText("Keeps all 1,200 variants")).toBeVisible({
          timeout: 20_000,
        });
        // Reached with the Tab key from its box, over the plot, so that
        // the ring shows.
        await het.getByRole("textbox").focus();
        await page.keyboard.press("Tab");
        await expect(het.getByRole("slider")).toBeFocused();
        for (let step = 0; step < 3; step += 1) {
          await page.keyboard.press("PageDown");
        }
        await save(page, `popgen2-thresholds-focus${at}-${theme}`);
      });

      test("a VCF whose ploidy could not be read", async ({ page }) => {
        await pickOnNewPage(page, "no_ploidy.vcf.gz");
        await expect(
          newPageCount(page).getByText(/^No genotype with alleles was found/u),
        ).toBeVisible();
        await save(page, `popgen2-ploidy-not-read${at}-${theme}`);
      });
    });
  }
}
