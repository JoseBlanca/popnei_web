/**
 * Not a test: it takes the probe through its states and writes a PNG of
 * each into screens/, which git ignores, for a person to look at
 * (testing.md, "The screens, as pictures"). The probe has the browser's
 * default look and no dark theme, so each state is taken once, in light.
 */
import { readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page, Route } from "@playwright/test";

const FIXTURES = join(import.meta.dirname, "fixtures");
const SCREENS = join(import.meta.dirname, "..", "screens");

async function save(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(SCREENS, `${name}.png`), fullPage: true });
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
      // The Tab key, so that the browser shows the ring of the keyboard.
      for (let press = 0; press < 3; press++) {
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
