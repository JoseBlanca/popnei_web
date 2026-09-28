/**
 * Which headless engines give WebGL 2, and the largest point of their
 * graphics card, on the page e2e/webgl.html, which asks for the context
 * with no three.js (docs/specs/charts/pca3d.md, "Which headless
 * engines give WebGL" and "How it runs"). The test
 * writes what it saw into the report, as an annotation and a line of
 * the output, and fails only when the page did not run: an engine with
 * no WebGL is a finding, not a defect, and testing.md, "Against the
 * built site", says which engines give it where.
 */

import { expect, test } from "@playwright/test";
import "./webglPage.ts";

test("what the engine gives for WebGL 2", async ({
  page,
  browser,
}, testInfo) => {
  // Relative to the base path, with no leading slash (testing.md).
  await page.goto("e2e/webgl.html");
  await page.waitForFunction(() => "webglPage" in window);
  const given = await page.evaluate(() => window.webglPage);
  expect(given).toBeDefined();
  const seen = JSON.stringify({
    engine: testInfo.project.name,
    version: browser.version(),
    ...given,
  });
  testInfo.annotations.push({ type: "webgl", description: seen });
  process.stdout.write(`webgl ${seen}\n`);
});
