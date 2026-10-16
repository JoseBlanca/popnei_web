/**
 * The look of popgen2.html, "Instrument, blue", of 16 October 2026
 * (docs/plans/visual-design.md), where a flow can see it: what sits on
 * the white panels of the tabs and of the two boxes of the files is not
 * drawn in the page's blue-grey but for the fields, the buttons and the
 * controls, tinted on purpose.
 *
 * panel.nei holds 1,200 variants of 200 diploid individuals, s000 to
 * s199; panel_pops.csv puts them in p0, p2 and p1.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { PARAMETERS, openParameters, parametersButton } from "./parameters.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** A calculation of panel.nei takes a few seconds in either engine. */
const RESULT_TIMEOUT = 30_000;

/** The row of tabs of the page. */
function tab(page: Page, name: string): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shown(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** The button `name` of the panel of the tab shown. */
function button(page: Page, name: string): Locator {
  return shown(page).getByRole("button", { name, exact: true });
}

/** Picks the fixture `name` with the button of the box `box`. */
async function pickInto(
  page: Page,
  box: "Variants" | "Individuals",
  name: string,
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: box, exact: true })
    .getByRole("button", {
      name: new RegExp(`^Open (another )?${box.toLowerCase()} file…$`, "u"),
    })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** What is drawn in the page's background colour, the body's, inside the
    panel of the tab shown and the two boxes: its fill, a gradient through
    it, or a border in it; leaving out the fields, the buttons and the
    controls, which are tinted on the white on purpose, and what is
    inside them: a radio's circle, a select's button, the toggle of 2D
    and 3D, but for the header of a section "Parameters", which is read;
    and the dashed zone that opens a file. Each as "role or tag, its words". */
async function drawnInPageColour(page: Page): Promise<string[]> {
  return page.evaluate((parameters) => {
    const background = getComputedStyle(document.body).backgroundColor;
    const roots = document.querySelectorAll(
      // The panel of the tab shown and the two boxes, sections named
      // by their headings.
      '[role="tabpanel"], section[aria-labelledby]',
    );
    const found = new Set<string>();
    for (const root of roots) {
      for (const element of root.querySelectorAll("*")) {
        if (!(element instanceof HTMLElement) || element.offsetParent === null)
          continue;
        // The header of a section "Parameters" is a button, and is read
        // with what is inside it.
        const control = element.closest(
          'button, input, textarea, select, label, [role="radiogroup"], [role="radio"]',
        );
        if (control !== null && control.textContent.trim() !== parameters)
          continue;
        const style = getComputedStyle(element);
        // The zone that opens a file, dashed, is tinted on purpose, in
        // --color-zone, the page's colour in the light theme.
        if (style.borderTopStyle === "dashed") continue;
        if (
          style.backgroundColor === background ||
          style.backgroundImage.includes(background) ||
          (parseFloat(style.borderTopWidth) > 0 &&
            style.borderTopColor === background)
        ) {
          const words = element.textContent.trim().slice(0, 30);
          found.add(
            `${element.getAttribute("role") ?? element.tagName.toLowerCase()}, "${words}"`,
          );
        }
      }
    }
    return [...found];
  }, PARAMETERS);
}

test("on the white panels the tables, their headers, their fades, the table of the individuals per population, the header of a section Parameters under the pointer, the legend of the PCA and the ring of a slider's handle are in the panel's colour, not the page's, at 320 px where the tables scroll, light and dark", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
  await pickInto(page, "Variants", "panel.nei");
  await pickInto(page, "Individuals", "panel_pops.csv");
  await expect(
    page.getByRole("button", {
      name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
    }),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });

  // The PCA, with its legend over the 2D plot and its table of many
  // columns, whose fade shows at its right edge.
  await tab(page, "PCA").click();
  await openParameters(shown(page));
  const distance = shown(page).getByRole("textbox", {
    name: "Distance within which variants are compared, in base pairs, from 1",
  });
  await distance.fill("50000");
  await distance.press("Enter");
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await button(page, "Run").click();
  await expect(
    page.getByText(/^The place of each of the 200 individuals/u),
  ).toContainText("from 548 variants", { timeout: RESULT_TIMEOUT });
  // The diversity, whose table is wider than 288 px and scrolls.
  await tab(page, "Populations").click();
  await openParameters(shown(page));
  await expect(button(page, "Run").first()).toBeEnabled({
    timeout: RESULT_TIMEOUT,
  });
  await button(page, "Run").first().click();
  await expect(
    shown(page).getByRole("table", {
      name: /^The diversity of each population/u,
    }),
  ).toBeVisible({ timeout: RESULT_TIMEOUT });

  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    for (const name of [
      "Variants",
      "Individuals",
      "PCA",
      "Populations",
    ] as const) {
      await tab(page, name).click();
      await expect(tab(page, name)).toHaveAttribute("aria-selected", "true");
      if (name === "Individuals") {
        // The individuals per population, a table of the tab since 16
        // October 2026.
        await expect(
          shown(page).getByRole("heading", {
            name: "Individuals per population, after the filters of individuals",
          }),
        ).toBeVisible();
      }
      if (name === "PCA" || name === "Populations") {
        // The header of the section "Parameters", open, under the
        // pointer, when it has a background.
        await parametersButton(shown(page)).first().hover();
      }
      expect(await drawnInPageColour(page), `${name}, ${scheme}`).toEqual([]);
    }
  }
});

/** Serves every calculation worker with the opening of the file `name`
    kept from its runner, so that the file stays being opened; to call
    before the page is opened (as in popgen2Tabs.spec.ts). */
async function holdOpening(page: Page, name: string): Promise<void> {
  await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
    const response = await route.fetch();
    const script = await response.text();
    const front = `self.addEventListener("message", (event) => { if (event.data !== null && typeof event.data === "object" && event.data.kind === "open" && event.data.file.name === ${JSON.stringify(name)}) { event.stopImmediatePropagation(); } });\n`;
    await route.fulfill({ response, body: front + script });
  });
}

/** The colour the page gives the system's colour `name`, Highlight,
    GrayText, Canvas. */
async function systemColour(page: Page, name: string): Promise<string> {
  return page.evaluate((colour) => {
    const probe = document.createElement("div");
    probe.style.color = colour;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
}

/** The border of `side` of the tab `tab`: its width and its colour,
    "none" when it is 0 px wide, since nothing is drawn. */
async function bar(
  tab: Locator,
  side: "top" | "bottom",
): Promise<{ readonly width: string; readonly colour: string }> {
  return tab.evaluate((element, where) => {
    const style = getComputedStyle(element);
    const [width, colour] =
      where === "top"
        ? [style.borderTopWidth, style.borderTopColor]
        : [style.borderBottomWidth, style.borderBottomColor];
    return { width, colour: parseFloat(width) > 0 ? colour : "none" };
  }, side);
}

test.describe("in the forced colours of Windows", () => {
  // Playwright emulates forced colours in Chromium alone.
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "forced colours are emulated in Chromium alone",
  );

  test("the tab shown of the page's row has a bar of 3 px in Highlight, at its top from 640 px and under it at 320 px; a tab greyed while shown has it in GrayText, apart from a greyed tab not shown", async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await holdOpening(page, "panel.vcf.gz");
    await page.goto("popgen2.html");
    await expect(
      page.getByRole("heading", { level: 1, name: "Popnei" }),
    ).toBeVisible();
    const highlight = await systemColour(page, "Highlight");
    const grey = await systemColour(page, "GrayText");
    expect(highlight).not.toBe(grey);
    await pickInto(page, "Variants", "panel.nei");
    await expect(tab(page, "PCA")).not.toHaveAttribute("aria-disabled");

    for (const [width, side] of [
      [1280, "top"],
      [320, "bottom"],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      await tab(page, "Variants").click();
      expect(await bar(tab(page, "Variants"), side)).toEqual({
        width: "3px",
        colour: highlight,
      });
      expect((await bar(tab(page, "Individuals"), side)).colour).not.toBe(
        highlight,
      );
    }

    // The PCA shown, another variants file opened: the PCA greyed while
    // shown, and Distances, with no individuals file, greyed and not
    // shown.
    await page.setViewportSize({ width: 1280, height: 900 });
    await tab(page, "PCA").click();
    await pickInto(page, "Variants", "panel.vcf.gz");
    await expect(tab(page, "PCA")).toHaveAttribute("aria-disabled", "true");
    await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "true");
    for (const [width, side] of [
      [1280, "top"],
      [320, "bottom"],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      expect(await bar(tab(page, "PCA"), side)).toEqual({
        width: "3px",
        colour: grey,
      });
      expect((await bar(tab(page, "Distances"), side)).colour).not.toBe(grey);
    }
  });

  test("the tab shown of a row inside a result, Plot or Table of the spectrum, has its bar in Highlight, the other none", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("popgen2.html");
    await expect(
      page.getByRole("heading", { level: 1, name: "Popnei" }),
    ).toBeVisible();
    const highlight = await systemColour(page, "Highlight");
    await pickInto(page, "Variants", "panel.nei");
    await pickInto(page, "Individuals", "panel_pops.csv");
    await tab(page, "Populations").click();
    await expect(button(page, "Run").first()).toBeEnabled({
      timeout: RESULT_TIMEOUT,
    });
    await button(page, "Run").first().click();
    const inner = shown(page).getByRole("tablist").first();
    await expect(inner).toBeVisible({ timeout: RESULT_TIMEOUT });
    const shownTab = inner.getByRole("tab", { selected: true });
    const otherTab = inner.getByRole("tab", { selected: false }).first();
    expect(await bar(shownTab, "bottom")).toEqual({
      width: "3px",
      colour: highlight,
    });
    expect((await bar(otherTab, "bottom")).colour).not.toBe(highlight);
  });
});
