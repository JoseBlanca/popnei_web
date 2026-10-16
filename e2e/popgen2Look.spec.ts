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
import { fileBox, pickFile } from "./openFiles.ts";
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

/** Picks the fixture `name` as the file of the box `box`, with the
    button that opens one now (openFiles.ts). */
async function pickInto(
  page: Page,
  box: "Variants" | "Individuals",
  name: string,
): Promise<void> {
  await pickFile(
    page,
    box === "Variants" ? "variants" : "individuals",
    join(FIXTURES, name),
  );
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

test("the words that stand in the place of the 3D view of the PCA while it loads are on the panel's colour, not the page's, light and dark", async ({
  page,
}) => {
  test.setTimeout(60_000);
  // The file of the 3D view held back, so that its words stay over the
  // place of the view, as on a slow connection.
  let release3d: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release3d = resolve;
  });
  await page.route(/\/pca3d-[^/]*\.js$/u, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
  await pickInto(page, "Variants", "panel.nei");
  await tab(page, "PCA").click();
  await openParameters(shown(page));
  const distance = shown(page).getByRole("textbox", {
    name: "Distance within which variants are compared, in base pairs, from 1",
  });
  await distance.fill("50000");
  await distance.press("Enter");
  await expect(button(page, "Run")).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await button(page, "Run").click();
  const words = shown(page).getByText("Loading the 3D view…", { exact: true });
  await expect(words).toBeVisible({ timeout: RESULT_TIMEOUT });
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    const [over, panel] = await Promise.all([
      words.evaluate((element) => getComputedStyle(element).backgroundColor),
      shown(page).evaluate(
        (element) => getComputedStyle(element).backgroundColor,
      ),
    ]);
    expect(over, scheme).toBe(panel);
    expect(await drawnInPageColour(page), scheme).toEqual([]);
  }
  release3d();
});

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

  test("the tab shown of the page's row has a bar of 3 px in Highlight, at its top from 640 px and under it at 639 and 320 px, by the separate rules of forced colours on a narrow window; a tab greyed while shown has it in GrayText, apart from a greyed tab not shown", async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await page.goto("popgen2.html");
    await expect(
      page.getByRole("heading", { level: 1, name: "Popnei" }),
    ).toBeVisible();
    const highlight = await systemColour(page, "Highlight");
    const grey = await systemColour(page, "GrayText");
    expect(highlight).not.toBe(grey);
    // Before a file the PCA tab is greyed and not shown: no bar in
    // GrayText.
    await expect(tab(page, "PCA")).toHaveAttribute("aria-disabled", "true");
    for (const [width, side] of [
      [1280, "top"],
      [639, "bottom"],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      expect((await bar(tab(page, "PCA"), side)).colour).not.toBe(grey);
    }
    await pickInto(page, "Variants", "panel.nei");
    await expect(tab(page, "PCA")).not.toHaveAttribute("aria-disabled");

    for (const [width, side] of [
      [1280, "top"],
      [640, "top"],
      [639, "bottom"],
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

    // Distances shown, then no column of the populations chosen in the
    // box Individuals: Distances greyed while shown, since 16 October
    // 2026 the one way left to grey a tab of the analyses while it is
    // shown.
    await page.setViewportSize({ width: 1280, height: 900 });
    await pickInto(page, "Individuals", "panel_pops.csv");
    await expect(tab(page, "Distances")).not.toHaveAttribute("aria-disabled", {
      timeout: RESULT_TIMEOUT,
    });
    await tab(page, "Distances").click();
    const column = fileBox(page, "individuals").getByRole("button", {
      name: "Column of the populations",
    });
    await column.click();
    await page
      .getByRole("option", {
        name: "None: every individual unclassified",
        exact: true,
      })
      .click();
    await expect(tab(page, "Distances")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(tab(page, "Distances")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    for (const [width, side] of [
      [1280, "top"],
      [640, "top"],
      [639, "bottom"],
      [320, "bottom"],
    ] as const) {
      await page.setViewportSize({ width, height: 900 });
      expect(await bar(tab(page, "Distances"), side)).toEqual({
        width: "3px",
        colour: grey,
      });
      expect((await bar(tab(page, "PCA"), side)).colour).not.toBe(grey);
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
