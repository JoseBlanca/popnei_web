/**
 * The probe on the built site: popnei loads in its worker and opens the
 * served file and the user's, in each engine, as item 2 of "How it is
 * verified" of docs/specs/site.md says, and its failures show on the page.
 */
import { join } from "node:path";

import type { BrowserContext, Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The version of popnei that package.json installs. */
const POPNEI_VERSION = "0.1.0";

/** What the probe shows for the panel, 200 individuals in three populations. */
const PANEL = "200 individuals, ploidy 2";

async function openProbe(page: Page): Promise<void> {
  // Relative to the base path, with no leading slash (testing.md).
  await page.goto("probe.html");
}

function served(page: Page): Locator {
  return page.getByRole("region", { name: "The variant file of the site" });
}

function own(page: Page): Locator {
  return page.getByRole("region", { name: "A variant file of your own" });
}

/** Gives the file input a fixture, once popnei is loaded and it is enabled. */
async function pick(page: Page, fixture: string): Promise<void> {
  const input = page.getByLabel("Variant file, .nei or VCF");
  await expect(input).toBeEnabled();
  await input.setInputFiles(join(FIXTURES, fixture));
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
  await expect(served(page)).toContainText(`panel.nei: ${PANEL}.`);
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("a .nei file of the user shows the same as the served one", async ({
  page,
  makeAxeBuilder,
}) => {
  await openProbe(page);
  await pick(page, "panel.nei");

  await expect(own(page)).toContainText(`panel.nei: ${PANEL}.`);
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
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

test("a file popnei refuses shows popnei's message and the served result stays", async ({
  page,
  makeAxeBuilder,
}) => {
  await openProbe(page);
  await expect(served(page)).toContainText(`panel.nei: ${PANEL}.`);
  await pick(page, "bad.vcf");

  // popnei's message for a text that is not a VCF (docs/specs/site.md,
  // "The cases").
  await expect(own(page)).toContainText(
    "bad.vcf could not be opened: the source is not a VCF: it starts with",
  );
  await expect(served(page)).toContainText(`panel.nei: ${PANEL}.`);
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
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

  const popnei = page.getByRole("region", { name: "popnei", exact: true });
  await expect(popnei).toContainText("popnei could not be loaded.");
  await expect(popnei).toContainText("The browser said:");
  // The address tried, in popnei's message when the server answered 404
  // (docs/specs/site.md, "The cases").
  await expect(popnei).toContainText(/assets\/popnei_bg-[^/]*\.wasm/);
  await expect(page.getByLabel("Variant file, .nei or VCF")).toBeDisabled();
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
    `panel.nei could not be opened from ${address}: The server answered 404`,
  );
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});
