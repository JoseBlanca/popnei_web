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
      await expect(page.getByText("1 second so far.")).toBeVisible();
      await save(page, `popgen-variants-reading-${theme}`);
    });

    test("the Variants step, a .nei file read", async ({ page }) => {
      await pickVariants(page, "panel.nei");
      await expect(page.getByText("200 individuals")).toBeVisible();
      await save(page, `popgen-variants-nei-read-${theme}`);
    });

    test("the Variants step, a VCF read", async ({ page }) => {
      await pickVariants(page, "panel.vcf.gz");
      await expect(page.getByText("200 individuals")).toBeVisible();
      await save(page, `popgen-variants-vcf-read-${theme}`);
    });

    test("the Variants step, a VCF to read again with ploidy 4", async ({
      page,
    }) => {
      await pickVariants(page, "tetraploid.vcf.gz");
      await expect(page.getByText("12 individuals")).toBeVisible();
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
        page.getByText(/^popnei could not read bad\.vcf/),
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
        page.getByRole("main").getByText("Drop one variants file at a time."),
      ).toBeVisible();
      await save(page, `popgen-variants-several-dropped-${theme}`);
    });

    test("the Variants step, a VCF to read again with every variant", async ({
      page,
    }) => {
      await pickVariants(page, "panel.vcf.gz");
      await expect(page.getByText("200 individuals")).toBeVisible();
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
      await expect(page.getByText("Reading panel.nei.")).toBeVisible();
      await unlink(path);
      await expect.poll(() => held.length).toBeGreaterThan(0);
      for (const route of held) await route.continue();
      await expect(
        page.getByRole("main").getByText(/it may have changed on the disk/),
      ).toBeVisible();
      await save(page, `popgen-variants-no-longer-read-${theme}`);
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
