/**
 * Not a test: it takes the probe through its states and writes a PNG of
 * each into screens/, which git ignores, for a person to look at
 * (testing.md, "The screens, as pictures"). The probe has the browser's
 * default look and no dark theme, so each state is taken once, in light.
 */
import { join } from "node:path";

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

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
