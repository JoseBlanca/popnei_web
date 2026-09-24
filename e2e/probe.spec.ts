/**
 * The probe on the built site: popnei loads in its worker and opens the
 * served file and the user's, in each engine, as item 2 of "How it is
 * verified" of docs/specs/site.md says, and its failures and defects show
 * on the page.
 */
import { join } from "node:path";

import type { BrowserContext, Locator, Page, Worker } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The version of popnei that package.json installs. */
const POPNEI_VERSION = "0.1.0";

/** What the probe shows for the panel, 200 individuals in three populations. */
const PANEL = "200 individuals, ploidy 2";

/** The time of an opening, as the page writes it, with one decimal. */
const TIME = String.raw`(\d+\.\d|under 0\.1) ms`;

async function openProbe(page: Page): Promise<void> {
  // Relative to the base path, with no leading slash (testing.md).
  await page.goto("probe.html");
}

function popnei(page: Page): Locator {
  return page.getByRole("region", { name: "popnei", exact: true });
}

function served(page: Page): Locator {
  return page.getByRole("region", { name: "The variant file of the site" });
}

function own(page: Page): Locator {
  return page.getByRole("region", { name: "A variant file of your own" });
}

function fileInput(page: Page): Locator {
  return page.getByLabel("Variant file", { exact: true });
}

/** Gives the file input a fixture, once popnei is loaded and it is enabled. */
async function pick(page: Page, fixture: string): Promise<void> {
  const input = fileInput(page);
  await expect(input).toBeEnabled();
  await input.setInputFiles(join(FIXTURES, fixture));
}

/** Opens the probe and gives back its worker, once popnei is loaded in it. */
async function openProbeWorker(page: Page): Promise<Worker> {
  const started = page.waitForEvent("worker");
  await openProbe(page);
  const worker = await started;
  await expect(served(page)).toContainText(`panel.nei: ${PANEL}.`);
  return worker;
}

/** The addresses of every request of the page and its worker, as they come. */
function recordRequests(context: BrowserContext): string[] {
  const addresses: string[] = [];
  context.on("request", (request) => {
    addresses.push(request.url());
  });
  return addresses;
}

test("the page shows popnei's version and what popnei read from the served file", async ({
  page,
  makeAxeBuilder,
}) => {
  await openProbe(page);

  await expect(
    page.getByText(`popnei ${POPNEI_VERSION}, loaded in`),
  ).toBeVisible();
  await expect(served(page)).toContainText(
    new RegExp(
      `panel\\.nei: ${PANEL}\\. popnei opened it in ${TIME}, not counting the download\\.`,
    ),
  );
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("a .nei file of the user shows the same as the served one", async ({
  page,
  makeAxeBuilder,
}) => {
  await openProbe(page);
  await pick(page, "panel.nei");

  await expect(own(page)).toContainText(
    new RegExp(
      `panel\\.nei: ${PANEL}\\. popnei opened it in ${TIME}, not counting the reading from the disk\\.`,
    ),
  );
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("a .nei file of another ploidy and size shows its own numbers", async ({
  page,
}) => {
  await openProbe(page);
  await pick(page, "tetraploid.nei");

  await expect(own(page)).toContainText(
    "tetraploid.nei: 12 individuals, ploidy 4.",
  );
});

test("a VCF of the user is opened as diploid and the page says the ploidy was given", async ({
  page,
  makeAxeBuilder,
}) => {
  await openProbe(page);
  await pick(page, "panel.vcf.gz");

  await expect(own(page)).toContainText(
    `panel.vcf.gz: ${PANEL} (given: a VCF is opened as diploid).`,
  );
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("the input says which reader a name chooses", async ({ page }) => {
  await openProbe(page);

  await expect(fileInput(page)).toHaveAccessibleDescription(
    /A \.nei file, or a VCF whose name ends in \.vcf or \.vcf\.gz\. A file with any other name is read as a \.nei file\./,
  );
});

test("a file popnei refuses shows popnei's message and the reader its name chose, and the served result stays", async ({
  page,
  makeAxeBuilder,
}) => {
  await openProbe(page);
  await expect(served(page)).toContainText(`panel.nei: ${PANEL}.`);
  await pick(page, "bad.vcf");

  // popnei's message for a text that is not a VCF (docs/specs/site.md,
  // "The cases"), with the page's full stop after popnei's quotation.
  await expect(own(page)).toContainText(
    "bad.vcf could not be opened: the source is not a VCF: it starts with `This is a line o`.",
  );
  await expect(own(page)).toContainText(
    "It was read as a VCF because its name ends in .vcf or .vcf.gz; any other name is read as a .nei file.",
  );
  await expect(served(page)).toContainText(`panel.nei: ${PANEL}.`);
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("the answers of the two files may come in either order", async ({
  page,
}) => {
  // The served file is held back until the user's file has been refused.
  let release = (): void => undefined;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/probe/panel.nei", async (route) => {
    await released;
    await route.continue();
  });
  await openProbe(page);
  await expect(served(page)).toContainText("Opening panel.nei");
  await pick(page, "bad.vcf");
  await expect(own(page)).toContainText("bad.vcf could not be opened");

  release();
  await expect(served(page)).toContainText(`panel.nei: ${PANEL}.`);
  await expect(own(page)).toContainText("bad.vcf could not be opened");
  await expect(own(page)).not.toContainText("panel.nei");
});

test("only the last of two files picked in a row is shown", async ({
  page,
}) => {
  await openProbe(page);
  await pick(page, "panel.nei");
  await pick(page, "tetraploid.nei");

  await expect(own(page)).toContainText(
    "tetraploid.nei: 12 individuals, ploidy 4.",
  );
  await expect(own(page)).not.toContainText("panel.nei");
});

test("the input is emptied after a file is sent, so the same file can be picked again", async ({
  page,
}) => {
  await openProbe(page);
  await pick(page, "panel.nei");
  await expect(own(page)).toContainText(`panel.nei: ${PANEL}.`);
  await expect(fileInput(page)).toHaveValue("");

  await pick(page, "panel.nei");
  await expect(own(page)).toContainText(`panel.nei: ${PANEL}.`);
});

test("every request of the page and its worker is to the site's origin", async ({
  page,
  context,
  baseURL,
}) => {
  const addresses = recordRequests(context);
  await openProbe(page);
  await expect(served(page)).toContainText(`panel.nei: ${PANEL}.`);
  await pick(page, "panel.vcf.gz");
  await expect(own(page)).toContainText(`panel.vcf.gz: ${PANEL}`);

  const origin = new URL(baseURL ?? page.url()).origin;
  // The requests of the worker are among them: its wasm and the served file.
  expect(addresses.some((address) => address.endsWith(".wasm"))).toBe(true);
  expect(addresses.some((address) => address.endsWith("probe/panel.nei"))).toBe(
    true,
  );
  // WebKit reads a file given by setInputFiles through a blob: address,
  // whose origin is that of the page that made it.
  const elsewhere = addresses.filter(
    (address) => new URL(address).origin !== origin,
  );
  expect(elsewhere).toEqual([]);
});

test("the page says popnei could not be loaded when its wasm is not found", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.route("**/*.wasm", (route) => route.fulfill({ status: 404 }));
  await openProbe(page);

  await expect(popnei(page)).toContainText("popnei could not be loaded.");
  // The address tried, in popnei's message when the server answered 404
  // (docs/specs/site.md, "The cases").
  await expect(popnei(page)).toContainText(
    /Message: .*assets\/popnei_bg-[^/]*\.wasm/,
  );
  await expect(popnei(page)).toContainText(
    "Reload the page. If popnei still does not load, report it at https://github.com/JoseBlanca/popnei_web/issues, with the address and the message above.",
  );
  await expect(served(page)).toContainText(
    "Not opened, since popnei could not be loaded.",
  );
  await expect(fileInput(page)).toBeDisabled();
  await expect(fileInput(page)).toHaveAccessibleDescription(
    /No file can be opened, since popnei could not be loaded\./,
  );
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("the page names the address of a wasm that arrives and does not compile", async ({
  page,
}) => {
  await page.route("**/*.wasm", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/wasm",
      body: "not wasm",
    }),
  );
  await openProbe(page);

  await expect(popnei(page)).toContainText("popnei could not be loaded.");
  await expect(popnei(page)).toContainText(
    /Address tried: \S*\/assets\/popnei_bg-[^/]*\.wasm/,
  );
});

test("the page says the probe's worker did not start when its script is not found", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.route("**/probeWorker-*.js", (route) =>
    route.fulfill({ status: 404 }),
  );
  await openProbe(page);

  await expect(popnei(page)).toContainText("The probe's worker did not start.");
  // The browser gives no message here; the page writes no empty line for it.
  await expect(popnei(page).getByText(/^Message:\s*\.?$/)).toHaveCount(0);
  await expect(fileInput(page)).toHaveAccessibleDescription(
    /No file can be opened, since the probe's worker did not start\./,
  );
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("the page names the address of the served file when it is not found", async ({
  page,
  makeAxeBuilder,
}) => {
  await page.route("**/probe/panel.nei", (route) =>
    route.fulfill({ status: 404 }),
  );
  await openProbe(page);

  const address = new URL("probe/panel.nei", page.url()).href;
  await expect(served(page)).toContainText(
    `panel.nei could not be opened from ${address}: the server answered 404 Not Found.`,
  );
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("a request the worker does not know is shown as a defect of the probe", async ({
  page,
  makeAxeBuilder,
}) => {
  const worker = await openProbeWorker(page);
  await worker.evaluate(() => {
    dispatchEvent(new MessageEvent("message", { data: { kind: "openAll" } }));
  });

  const alert = page.getByRole("alert");
  await expect(alert).toContainText(
    "A defect of the probe: the worker received a request it does not know.",
  );
  await expect(alert).toContainText('has the kind "openAll"');
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("a message the page does not know is shown as a defect of the probe", async ({
  page,
}) => {
  const worker = await openProbeWorker(page);
  await worker.evaluate(() => {
    postMessage({ kind: "opened", source: "served" });
  });

  const alert = page.getByRole("alert");
  await expect(alert).toContainText(
    "A defect of the probe: the page received a message it does not know.",
  );
  await expect(alert).toContainText("The message opened lacks the fields");
});

test("a throw in the worker while it opens a file is answered as a failure of that file", async ({
  page,
}) => {
  const worker = await openProbeWorker(page);
  await worker.evaluate(() => {
    performance.now = () => {
      throw new Error("a defect planted by the test");
    };
  });
  await pick(page, "panel.nei");

  await expect(own(page)).toContainText(
    "panel.nei could not be opened: a defect planted by the test.",
  );
  await expect(fileInput(page)).toBeEnabled();
});

test("a trap of popnei's wasm stops the worker and is shown as a defect", async ({
  page,
}) => {
  const worker = await openProbeWorker(page);
  await worker.evaluate(() => {
    performance.now = () => {
      throw new WebAssembly.RuntimeError("unreachable");
    };
  });
  await pick(page, "panel.nei");

  await expect(page.getByRole("alert")).toContainText(
    "A defect of the probe: its worker stopped.",
  );
  await expect(own(page)).toContainText(
    "panel.nei could not be opened: the probe's worker stopped before it answered.",
  );
  await expect(fileInput(page)).toBeDisabled();
  await expect(fileInput(page)).toHaveAccessibleDescription(
    /No more files can be opened, since the probe's worker stopped\. Reload the page\./,
  );
});
