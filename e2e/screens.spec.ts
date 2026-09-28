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

const FIXTURES = join(import.meta.dirname, "fixtures");
const SCREENS = join(import.meta.dirname, "..", "screens");

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
        page.getByRole("main").getByText(/Reload the page/),
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
          .getByText("2.5 is not a whole number; the distance stays 10000."),
      ).toBeVisible();
      await save(page, `popgen-variants-distance-refused-${theme}`);
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

    test("the Individuals step, an Excel file not loaded", async ({ page }) => {
      await goTo(page, "Individuals");
      await pickIndividuals(page, { name: "pops.xlsx", text: "PK" });
      await expect(
        page.getByRole("main").getByText(/^pops\.xlsx was not loaded/),
      ).toBeVisible();
      await save(page, `popgen-individuals-excel-${theme}`);
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
            "Load a metadata file, a CSV or a TSV, not a piece of text.",
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
        page.getByRole("button", { name: "Run" }),
      ).toHaveAccessibleDescription(/^Choose the column/);
      await save(page, `popgen-diversity-locked-${theme}`);
    });

    test("the diversity ready", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await expect(
        page.getByRole("main").getByText(/^3 populations: /),
      ).toBeVisible();
      await save(page, `popgen-diversity-ready-${theme}`);
    });

    test("the diversity running, with its bar", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await holdResults(page);
      await goTo(page, "Analyses");
      await page.getByRole("button", { name: "Run" }).click();
      await expect(
        page.getByRole("main").getByText(/^Calculating · 99% · 0:01$/),
      ).toBeVisible({
        timeout: 3000,
      });
      await save(page, `popgen-diversity-running-${theme}`);
    });

    test("the diversity done", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await page.getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
      await save(page, `popgen-diversity-done-${theme}`);
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
      await page.getByRole("button", { name: "Run" }).click();
      await expect(
        page.getByRole("main").getByText(/^Warning: Population A/),
      ).toBeVisible();
      await save(page, `popgen-diversity-warning-${theme}`);
    });

    test("the diversity in error, the ploidy refused", async ({ page }) => {
      await loadTetraploid(page);
      await goTo(page, "Analyses");
      await page.getByRole("button", { name: "Run" }).click();
      await expect(
        page.getByRole("main").getByText(/^At line 5 of tetraploid\.vcf\.gz/),
      ).toBeVisible();
      await save(page, `popgen-diversity-refused-${theme}`);
    });

    test("the diversity removed", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await page.getByRole("button", { name: "Run" }).click();
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
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await page.getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
      // The frame measured as narrower than the table, and its line shown.
      await expect(
        page
          .getByRole("main")
          .getByText("Scroll the table sideways to see all its columns."),
      ).toBeVisible();
      // The frame of the table, reached by the Tab key, with its focus
      // ring.
      await page.keyboard.press("Tab");
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
      await page.getByRole("button", { name: "Run" }).click();
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
      await page.getByRole("button", { name: "Run" }).click();
      await expect(
        page.getByRole("main").getByText(/^panel\.nei could not be read again/),
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
      await page.getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
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
      await page.getByRole("button", { name: "Run" }).click();
      await expect(
        page.getByRole("main").getByText(/^Calculating · 99% · 0:01$/),
      ).toBeVisible({
        timeout: 3000,
      });
      await save(page, `popgen-shell-running-${theme}`);
    });

    test("the shell done", async ({ page }) => {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await page.getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
      await save(page, `popgen-shell-done-${theme}`);
    });

    /** Calculates the diversity of the panel and sets the missing data
        threshold to 1 at the Variants step, which removes it. */
    async function removeTheDiversity(page: Page): Promise<void> {
      await loadPanelWithPopulations(page);
      await goTo(page, "Analyses");
      await page.getByRole("button", { name: "Run" }).click();
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
      await page.getByRole("button", { name: "Run" }).click();
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
      await page.getByRole("button", { name: "Run" }).click();
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
      await page.getByRole("button", { name: "Run" }).click();
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
        page
          .getByRole("main")
          .getByText("2 populations: p0, 29 individuals; p2, 48 individuals"),
      ).toBeVisible();
      await save(page, `popgen-diversity-kept-${theme}`);
    });

    test("the diversity ready, the thresholds waiting for the statistics of each individual", async ({
      page,
    }) => {
      await diversityWithThresholds(page, false);
      await goTo(page, "Analyses");
      await expect(
        page.getByRole("main").getByText(/^Run calculates the statistics/),
      ).toBeVisible();
      await save(page, `popgen-diversity-waits-ready-${theme}`);
    });

    test("the diversity running, waiting for the statistics of each individual", async ({
      page,
    }) => {
      await diversityWithThresholds(page, false);
      await holdResults(page);
      await goTo(page, "Analyses");
      await page.getByRole("button", { name: "Run" }).click();
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
      await page.getByRole("button", { name: "Run" }).click();
      await expect(
        page
          .getByRole("main")
          .getByText(
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
      await expect(
        page.getByRole("main").getByText("200 individuals"),
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
      await page.getByRole("button", { name: "Run" }).click();
      await expect(page.getByRole("rowheader", { name: "p0" })).toBeVisible();
      const saved = await saveProjectFile(page, testInfo.outputPath());
      await openProject(page, saved);
      await pickVariants(page, "panel.vcf.gz");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Analyses");
      await page.getByRole("button", { name: "Run" }).click();
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
      await page.getByRole("button", { name: "Run" }).click();
      await expect(page.getByText(/^Not compared with/)).toBeVisible();
      await save(page, `popgen-diversity-uncompared-${theme}`);

      // A file of the other format than the project's.
      await goTo(page, "Variants");
      await pickVariants(page, "panel.nei");
      await expect(
        page.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(page, "Analyses");
      await page.getByRole("button", { name: "Run" }).click();
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
  });
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
