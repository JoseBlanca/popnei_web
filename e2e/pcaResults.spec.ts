/**
 * The result of the panel of the principal components on the built site
 * (docs/specs/analyses/pca.md, "The panel"), in what the map of its cases
 * found no test of, IP10 D3: the names of the selects of the axes; a turn
 * of the 3D view that is not a command, and the view kept through a
 * change of the colour and of the highlight; a result of one component and
 * of two; the legend, "No population" last, its place over the plot in 2D
 * and 3D, a press that moves the highlight, the highlight kept from one
 * plot to the other, its keys, its name and the keys it does not hear;
 * the table moved through by the keyboard with its header in view, and
 * sorted by the values of a column; the notes, which are not warnings; no
 * export of the plot; and a browser with no WebGL 2, for a project saved
 * in 3D and for the description of the 2D plot drawn in its place. Axe
 * at each state reached.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The PCA takes longer than the 5 seconds of an assertion in WebKit on a
    loaded machine only rarely; 30 s leaves room. */
const RESULT_TIMEOUT = 30_000;

const LD_GROUP = "Prune the variants by linkage disequilibrium (LD)";
const DISTANCE =
  "Distance within which variants are compared, in base pairs, from 1";
const PCA_3D = "Principal components, PC1, PC2 and PC3";
const PCA_2D = "Principal components, PC1 and PC2";
const NO_WEBGL = /^This browser cannot draw the 3D view: WebGL/;
const TO_TABLE =
  "Go to the table of the individuals, which gives the place of each one.";

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

async function goTo(page: Page, step: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: step })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

/** A file given through the button of `region`, from the fixtures by its
    name, or made here. */
async function pick(
  page: Page,
  region: string,
  file: string | { name: string; mimeType: string; buffer: Buffer },
): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: region })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (
    await chooser
  ).setFiles(typeof file === "string" ? join(FIXTURES, file) : file);
}

/** Loads panel.nei and a metadata file, panel_meta.csv or the text
    given, chooses popcat, and goes to the Analyses step; gives the
    panel. */
async function openPanel(page: Page, metadata?: string): Promise<Locator> {
  await page.goto("popgen.html#variants");
  await pick(page, "Variants file", "panel.nei");
  await expect(
    page.getByRole("main").getByText("200 individuals"),
  ).toBeVisible();
  await goTo(page, "Individuals");
  await pick(
    page,
    "Metadata file",
    metadata === undefined
      ? "panel_meta.csv"
      : {
          name: "meta.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(metadata),
        },
  );
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: "popcat", exact: true }).click();
  await goTo(page, "Analyses");
  return page.getByRole("region", { name: "Principal components" });
}

/** panel_meta.csv with a column `collection` of four values, c0 to c3,
    and, when `unplaced` is given, popcat empty for that many individuals,
    the last of the file. */
async function metadataWith(unplaced = 0): Promise<string> {
  const lines = (await readFile(join(FIXTURES, "panel_meta.csv"), "utf8"))
    .trim()
    .split("\n");
  const rows = lines.slice(1).map((row, i, all) => {
    const [iid, popcat, altitude] = row.split(",");
    const pop = i >= all.length - unplaced ? "" : (popcat ?? "");
    return `${iid ?? ""},${pop},${altitude ?? ""},c${String(i % 4)}`;
  });
  return `IID,popcat,altitude,collection\n${rows.join("\n")}\n`;
}

/** Chooses the radio button `name` of `group` as a user does, by a click
    on its words: its input is under the circle drawn for it. */
async function chooseRadio(group: Locator, name: string): Promise<void> {
  await group.locator("label").filter({ hasText: name }).click();
  await expect(group.getByRole("radio", { name })).toBeChecked();
}

/** Sets the LD filter for the PCA alone and types 50000 key by key. */
async function ownLd(panel: Locator): Promise<void> {
  await chooseRadio(
    panel.getByRole("radiogroup", { name: LD_GROUP }),
    "For the PCA alone",
  );
  const field = panel.getByLabel(DISTANCE);
  await field.pressSequentially("50000");
  await field.press("Enter");
  await expect(field).toHaveValue("50000");
}

async function run(panel: Locator): Promise<void> {
  await panel.getByRole("button", { name: "Run", exact: true }).click();
  await expect(panel.getByRole("button", { name: "Stop" })).toHaveCount(0, {
    timeout: RESULT_TIMEOUT,
  });
  await expect(panel.getByText(/^The place of each of the /)).toBeVisible({
    timeout: RESULT_TIMEOUT,
  });
}

async function chooseOption(
  page: Page,
  panel: Locator,
  select: string,
  option: string,
): Promise<void> {
  await panel.getByRole("button", { name: select }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(panel.getByRole("button", { name: select })).toContainText(
    option,
  );
}

function legendOf(panel: Locator, title = "Population"): Locator {
  return panel.getByRole("radiogroup", { name: title });
}

/** The text a screen reader reads for the 2D plot. */
function description2d(panel: Locator): Locator {
  return panel.locator("svg.chart-scatter desc");
}

function banner(page: Page, name: string): Locator {
  return page.getByRole("banner").getByRole("button", { name, exact: true });
}

/** The shell's status region, the last of the page's two. */
function status(page: Page): Locator {
  return page.getByRole("status").last();
}

/** Whether this engine gives WebGL 2, as the plot asks for it. */
async function givesWebGl(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const context = document.createElement("canvas").getContext("webgl2");
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return context !== null;
  });
}

/** Skips what follows in an engine with no WebGL 2, and says so. */
async function needsWebGl(page: Page, what: string): Promise<void> {
  const given = await givesWebGl(page);
  if (!given) {
    test.info().annotations.push({ type: "no WebGL 2", description: what });
  }
  test.skip(!given, `no WebGL 2: ${what}`);
}

/** Makes the page's canvases give no WebGL 2 context, as a browser with
    WebGL turned off does. */
function noWebGl(): void {
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
}

/** Where the three lines of the 3D view end on the canvas, in pixels
    from its top left corner: the anchor of each label, 4 pixels left of
    and below its bottom left corner. */
async function lineEnds(panel: Locator): Promise<{ x: number; y: number }[]> {
  const labels = panel.locator(".chart-pca3d-label");
  await expect(labels).toHaveCount(3);
  return labels.evaluateAll((all) =>
    all.map((label) => {
      const canvas = label.parentElement?.querySelector("canvas");
      if (canvas === null || canvas === undefined) {
        throw new Error("The label is beside no canvas.");
      }
      const at = canvas.getBoundingClientRect();
      const box = label.getBoundingClientRect();
      return { x: box.left - 4 - at.left, y: box.bottom + 4 - at.top };
    }),
  );
}

/** Whether two sets of ends are within half a pixel of each other. */
function sameEnds(
  a: readonly { x: number; y: number }[],
  b: readonly { x: number; y: number }[],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (end, at) =>
        Math.abs(end.x - (b[at]?.x ?? Number.NaN)) < 0.5 &&
        Math.abs(end.y - (b[at]?.y ?? Number.NaN)) < 0.5,
    )
  );
}

/** Where the legend stands in the element of the plot it is drawn over:
    the distance of its top and of its right side from those of the
    element, in CSS pixels. */
async function legendPlace(
  legend: Locator,
): Promise<{ top: number; right: number }> {
  return legend.evaluate((group) => {
    const box = group.parentElement;
    const area = box === null ? null : box.parentElement;
    if (box === null || area === null) {
      throw new Error("The legend is drawn over no plot.");
    }
    const at = box.getBoundingClientRect();
    const plot = area.getBoundingClientRect();
    return { top: at.top - plot.top, right: plot.right - at.right };
  });
}

/** Keeps only the individuals `names`, by the list to keep of the
    Variants step, and goes back to the Analyses step. */
async function keepOnly(page: Page, names: readonly string[]): Promise<void> {
  await goTo(page, "Variants");
  const lists = page.getByRole("region", {
    name: "Filters of the individuals",
  });
  await lists
    .getByRole("textbox", { name: "Individuals to keep, one name per line" })
    .fill(names.join("\n"));
  await lists
    .getByRole("button", { name: "Apply the list to keep", exact: true })
    .click();
  await expect(
    lists.getByText(
      "This list is not applied yet; Apply the list to keep applies it.",
    ),
  ).toHaveCount(0);
  await goTo(page, "Analyses");
}

test.describe("IP10 D3 the bar of controls", () => {
  test("IP10 D3 the selects of the components are Horizontal axis and Vertical axis in 2D, and First axis, Second axis and Third axis, kept up in 3D", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    for (const name of ["Horizontal axis", "Vertical axis"]) {
      await expect(panel.getByRole("button", { name })).toBeVisible();
    }
    await expect(panel.getByRole("button", { name: "First axis" })).toHaveCount(
      0,
    );
    await needsWebGl(page, "the selects of the 3D view were not seen");
    await panel.getByRole("radio", { name: "3D", exact: true }).click();
    await expect(panel.getByRole("img", { name: PCA_3D })).toBeVisible();
    for (const name of ["First axis", "Second axis", "Third axis, kept up"]) {
      await expect(panel.getByRole("button", { name })).toBeVisible();
    }
    await expect(
      panel.getByRole("button", { name: "Vertical axis" }),
    ).toHaveCount(0);
  });

  test("IP10 D3 a turn or a zoom of the 3D view is not a command: the Undo still names the command before it, and Redo stays off", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await ownLd(panel);
    await run(panel);
    await needsWebGl(page, "the 3D view was not turned");
    await expect(panel.getByRole("img", { name: PCA_3D })).toBeVisible();
    const undo = banner(page, "Undo");
    await expect(undo).toHaveAccessibleDescription(
      "Undo: the LD filter of the principal components changed",
    );
    for (const name of ["Turn left", "Tilt up", "View along PC2", "Zoom in"]) {
      await panel.getByRole("button", { name, exact: true }).click();
    }
    await expect(panel.getByRole("img", { name: PCA_3D })).toBeVisible();
    await expect(undo).toHaveAccessibleDescription(
      "Undo: the LD filter of the principal components changed",
    );
    await expect(banner(page, "Redo")).toBeDisabled();
    await expectNoViolations(makeAxeBuilder);
  });

  test("IP10 D3 the 3D view keeps its turn through a change of the highlight and of the colour, and a switch to 2D and back starts it again", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await ownLd(panel);
    await run(panel);
    await needsWebGl(page, "the 3D view was not turned");
    const canvas = panel.getByRole("img", { name: PCA_3D });
    await expect(canvas).toBeVisible();
    const start = await lineEnds(panel);
    await panel.getByRole("button", { name: "Turn left", exact: true }).click();
    await panel.getByRole("button", { name: "Tilt down", exact: true }).click();
    await expect
      .poll(async () => sameEnds(await lineEnds(panel), start))
      .toBe(false);
    const turned = await lineEnds(panel);

    await legendOf(panel).getByRole("radio", { name: "p1 (68)" }).click();
    await expect(canvas).toHaveAccessibleDescription(/ p1 is highlighted\. /);
    expect(sameEnds(await lineEnds(panel), turned)).toBe(true);

    await chooseOption(page, panel, "Colour the points by", "altitude");
    await expect(canvas).toHaveAccessibleDescription(/Coloured by altitude/);
    expect(sameEnds(await lineEnds(panel), turned)).toBe(true);

    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(panel.locator("canvas")).toHaveCount(0);
    await panel.getByRole("radio", { name: "3D", exact: true }).click();
    await expect(canvas).toBeVisible();
    await expect
      .poll(async () => sameEnds(await lineEnds(panel), start))
      .toBe(true);
  });
});

test.describe("IP10 D3 a result of one or two components", () => {
  test("IP10 D3 one component: no plot, the line of the cases, the explained variance and the table, whose second column follows Colour the points by", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await keepOnly(page, ["s000", "s001"]);
    await run(panel);
    await expect(
      panel.getByText(
        /Only one component has variance, since 2 individuals have one axis between them, so there is no plot; the table gives each individual's place on it\./,
      ),
    ).toBeVisible();
    await expect(panel.getByRole("img")).toHaveCount(0);
    await expect(panel.locator("canvas, svg.chart-scatter")).toHaveCount(0);
    await expect(
      panel.getByRole("radio", { name: "3D", exact: true }),
    ).toHaveCount(0);
    await expect(
      panel.getByRole("radio", { name: "2D", exact: true }),
    ).toHaveCount(0);
    await expect(
      panel.getByRole("button", { name: "Horizontal axis" }),
    ).toHaveCount(0);
    await expect(panel.getByRole("link", { name: TO_TABLE })).toHaveCount(0);
    await expect(
      panel.getByRole("table", {
        name: /^The variance of the individuals explained by each component/,
      }),
    ).toBeVisible();
    const table = panel.getByRole("grid", { name: /^The place of each/ });
    await expect(
      table.getByRole("columnheader", { name: "Population" }),
    ).toBeVisible();
    await expectNoViolations(makeAxeBuilder);
    await chooseOption(page, panel, "Colour the points by", "altitude");
    await expect(
      table.getByRole("columnheader", { name: "altitude" }),
    ).toBeVisible();
    await expect(
      table.getByRole("row", { name: /^s001/ }).getByRole("gridcell").first(),
    ).toHaveText("110");
  });

  test("IP10 D3 two components draw the 2D plot with the line of the 3D view, and the option stays 3D, so that a result of three draws the 3D view again", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await keepOnly(page, ["s000", "s001", "s002"]);
    await run(panel);
    await expect(
      panel.getByText(
        "The 3D view needs three components, and this result has 2.",
      ),
    ).toBeVisible();
    await expect(panel.getByRole("img", { name: PCA_2D })).toBeVisible();
    await expect(
      panel.getByRole("radio", { name: "3D", exact: true }),
    ).toBeDisabled();

    await keepOnly(page, []);
    await run(panel);
    await expect(
      panel.getByText(/^The place of each of the 200 individuals/),
    ).toBeVisible();
    await expect(
      panel.getByRole("radio", { name: "3D", exact: true }),
    ).toBeChecked();
    await expect(
      panel.getByText(
        "The 3D view needs three components, and this result has 2.",
      ),
    ).toHaveCount(0);
    if (await givesWebGl(page)) {
      await expect(panel.getByRole("img", { name: PCA_3D })).toBeVisible();
    } else {
      test.info().annotations.push({
        type: "no WebGL 2",
        description: "the words of no WebGL in the place of the 3D view",
      });
      await expect(panel.getByText(NO_WEBGL)).toBeVisible();
    }
  });
});

test.describe("IP10 D3 the legend", () => {
  test("IP10 D3 No population is the last entry, with its count, and the legend stands over the top right corner of the plot", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page, await metadataWith(5));
    await run(panel);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    const legend = legendOf(panel);
    const entries = legend.getByRole("radio");
    await expect(entries.last()).toHaveText("No population (5)");
    await expect(entries).toHaveCount(4);
    const place = await legendPlace(legend);
    expect(place.top).toBeGreaterThanOrEqual(0);
    expect(place.top).toBeLessThanOrEqual(20);
    expect(place.right).toBeGreaterThanOrEqual(0);
    expect(place.right).toBeLessThanOrEqual(20);
    await expectNoViolations(makeAxeBuilder);
  });

  test("IP10 D3 a press on another entry moves the highlight to it, and the entry of No population highlights the individuals in no population", async ({
    page,
  }) => {
    const panel = await openPanel(page, await metadataWith(5));
    await run(panel);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    const legend = legendOf(panel);
    const p0 = legend.getByRole("radio", { name: "p0 (48)" });
    const p1 = legend.getByRole("radio", { name: /^p1 / });
    await p1.click();
    await expect(p1).toHaveAttribute("aria-checked", "true");
    await p0.click();
    await expect(p0).toHaveAttribute("aria-checked", "true");
    await expect(p1).toHaveAttribute("aria-checked", "false");
    await expect(description2d(panel)).toHaveText(/ p0 is highlighted\. /);
    const none = legend.getByRole("radio", { name: "No population (5)" });
    await none.click();
    await expect(none).toHaveAttribute("aria-checked", "true");
    await expect(p0).toHaveAttribute("aria-checked", "false");
    await expect(description2d(panel)).toHaveText(
      / No population is highlighted\. /,
    );
    await expect(panel.locator("path.chart-points-faded")).toHaveCount(3);
  });

  test("IP10 D3 the highlight is kept from the 2D plot to the 3D view and back, and is not a step of Undo", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    const p1 = legendOf(panel).getByRole("radio", { name: "p1 (68)" });
    await p1.click();
    await expect(description2d(panel)).toHaveText(/ p1 is highlighted\. /);
    await needsWebGl(page, "the highlight in the 3D view was not seen");
    await panel.getByRole("radio", { name: "3D", exact: true }).click();
    await expect(
      panel.getByRole("img", { name: PCA_3D }),
    ).toHaveAccessibleDescription(/ p1 is highlighted\. /);
    await expect(p1).toHaveAttribute("aria-checked", "true");
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(description2d(panel)).toHaveText(/ p1 is highlighted\. /);
    await expect(p1).toHaveAttribute("aria-checked", "true");
    await expect(banner(page, "Undo")).toHaveAccessibleDescription(
      "Undo: the principal components were drawn in 2D",
    );
  });

  test("IP10 D3 the legend stands at the same place over the plot in 3D and in 2D", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    await needsWebGl(page, "the legend over the 3D view was not seen");
    await expect(panel.getByRole("img", { name: PCA_3D })).toBeVisible();
    const legend = legendOf(panel);
    const in3d = await legendPlace(legend);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(panel.getByRole("img", { name: PCA_2D })).toBeVisible();
    const in2d = await legendPlace(legend);
    expect(Math.abs(in3d.top - in2d.top)).toBeLessThanOrEqual(1);
    expect(Math.abs(in3d.right - in2d.right)).toBeLessThanOrEqual(1);
  });

  test("IP10 D3 the legend is one stop of the Tab key, Up and Down move along it, Enter presses an entry and Space on the pressed entry clears it", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    const legend = legendOf(panel);
    const p0 = legend.getByRole("radio", { name: "p0 (48)" });
    const p2 = legend.getByRole("radio", { name: "p2 (84)" });
    const p1 = legend.getByRole("radio", { name: "p1 (68)" });
    await p0.focus();
    await page.keyboard.press("Tab");
    await expect(panel.getByRole("link", { name: TO_TABLE })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(p0).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(p1).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(p1).toHaveAttribute("aria-checked", "true");
    await expect(description2d(panel)).toHaveText(/ p1 is highlighted\. /);
    await page.keyboard.press("Space");
    await expect(p1).toHaveAttribute("aria-checked", "false");
    await expect(description2d(panel)).not.toHaveText(/is highlighted/);
    await page.keyboard.press("ArrowUp");
    await expect(p2).toBeFocused();
  });

  test("IP10 D3 the legend is named by the title of the colours, the column's name when the points are coloured by a column", async ({
    page,
  }) => {
    const panel = await openPanel(page, await metadataWith());
    await run(panel);
    await expect(legendOf(panel, "Population")).toBeVisible();
    await chooseOption(page, panel, "Colour the points by", "collection");
    await expect(legendOf(panel, "collection")).toBeVisible();
    await expect(legendOf(panel, "collection").getByRole("radio")).toHaveText([
      "c0 (50)",
      "c1 (50)",
      "c2 (50)",
      "c3 (50)",
    ]);
    await expect(legendOf(panel, "Population")).toHaveCount(0);
  });

  test("IP10 D3 the legend hears keys only while it has the focus: the arrows, Space and Enter elsewhere highlight no group", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    const heading = panel.getByRole("heading", {
      level: 2,
      name: "Principal components",
    });
    await heading.focus();
    await expect(heading).toBeFocused();
    for (const key of ["ArrowDown", "ArrowUp", "Space", "Enter"]) {
      await page.keyboard.press(key);
    }
    await expect(heading).toBeFocused();
    await expect(
      legendOf(panel).getByRole("radio", { checked: true }),
    ).toHaveCount(0);
    await expect(description2d(panel)).not.toHaveText(/is highlighted/);
  });

  test("IP10 D3 a highlight is said by the checked state of its entry and is not announced in the status region", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(status(page)).toContainText("Principal components: done");
    // Every text the region is given from here on.
    await status(page).evaluate((region) => {
      const texts: string[] = [];
      Object.assign(window, { statusTexts: texts });
      new MutationObserver(() => {
        texts.push(region.textContent);
      }).observe(region, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });
    const p1 = legendOf(panel).getByRole("radio", { name: "p1 (68)" });
    await p1.focus();
    await page.keyboard.press("Space");
    await expect(p1).toHaveAttribute("aria-checked", "true");
    await expect(description2d(panel)).toHaveText(/ p1 is highlighted\. /);
    // The Undo of the switch to 2D is announced alone: an announcement of
    // the highlight would stand before it or with it.
    await banner(page, "Undo").click();
    await expect(status(page)).toHaveText(
      "Undone: the principal components were drawn in 2D.",
    );
    const texts = await page.evaluate(
      () => (window as unknown as { statusTexts: string[] }).statusTexts,
    );
    expect(texts.filter((text) => /p1|highlight/.test(text))).toEqual([]);
  });
});

test.describe("IP10 D3 the table of the individuals", () => {
  test("IP10 D3 the keyboard moves through the table cell by cell, and its header stays in view while its box scrolls", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    const table = panel.getByRole("grid", { name: /^The place of each/ });
    await panel.getByRole("link", { name: TO_TABLE }).click();
    await expect
      .poll(() =>
        table.evaluate((grid) => grid.contains(document.activeElement)),
      )
      .toBe(true);
    const focused = (): Promise<string> =>
      page.evaluate(() => {
        const at = document.activeElement;
        const row = at?.closest('[role="row"]');
        return `${at?.getAttribute("role") ?? ""} ${row?.querySelector('[role="rowheader"]')?.textContent ?? ""} ${at?.textContent ?? ""}`;
      });
    // The link puts the focus on the row of s000; down a row, then along
    // it, then down the column.
    await expect.poll(focused).toMatch(/^row s000 /);
    await page.keyboard.press("ArrowDown");
    await expect.poll(focused).toMatch(/^row s001 /);
    await page.keyboard.press("ArrowRight");
    await expect.poll(focused).toBe("rowheader s001 s001");
    await page.keyboard.press("ArrowRight");
    await expect.poll(focused).toBe("gridcell s001 p0");
    await page.keyboard.press("ArrowDown");
    await expect.poll(focused).toBe("gridcell s002 p0");

    await table.evaluate((grid) => {
      grid.scrollTo(0, grid.scrollHeight);
    });
    await expect
      .poll(() => table.evaluate((grid) => grid.scrollTop))
      .toBeGreaterThan(500);
    // The last rows drawn, and the header at the top of the box.
    await expect(table.getByRole("row", { name: /^s199/ })).toHaveCount(1);
    const header = table.getByRole("columnheader", {
      name: "PC1",
      exact: true,
    });
    const inBox = await header.evaluate((cell) => {
      const grid = cell.closest('[role="grid"]');
      if (grid === null) return false;
      const box = grid.getBoundingClientRect();
      const at = cell.getBoundingClientRect();
      return Math.abs(at.top - box.top) <= 2 && at.bottom <= box.bottom;
    });
    expect(inBox).toBe(true);
    await expect(header).toBeVisible();
  });

  test("IP10 D3 coloured by altitude, the second column of the table holds each individual's value and sorts by it, the individuals with no value last", async ({
    page,
    makeAxeBuilder,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    await chooseOption(page, panel, "Colour the points by", "altitude");
    const table = panel.getByRole("grid", { name: /^The place of each/ });
    await expect(
      table.getByRole("row", { name: /^s000/ }).getByRole("gridcell").first(),
    ).toHaveText("100");
    const header = table.getByRole("columnheader", { name: "altitude" });
    const firstRow = table.getByRole("row").nth(1);
    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await expect(firstRow.getByRole("gridcell").first()).toHaveText("100");
    await header.click();
    await expect(header).toHaveAttribute("aria-sort", "descending");
    await expect(firstRow.getByRole("rowheader")).toHaveText("s196");
    await expect(firstRow.getByRole("gridcell").first()).toHaveText("2060");
    await expectNoViolations(makeAxeBuilder);
    // The last three rows, once the box is scrolled to its end.
    await table.evaluate((grid) => {
      grid.scrollTo(0, grid.scrollHeight);
    });
    const rows = table.getByRole("row");
    await expect(rows.last().getByRole("rowheader")).toBeVisible();
    // Polled: the table draws only the rows in view, and draws the last
    // ones a frame or more after the scroll, later on a loaded machine.
    await expect
      .poll(() =>
        rows.evaluateAll((all) =>
          all
            .slice(-3)
            .map(
              (row) =>
                row.querySelector('[role="gridcell"]')?.textContent ?? "",
            ),
        ),
      )
      .toEqual(["No value", "No value", "No value"]);
  });
});

test.describe("IP10 D3 the notes and what the panel does not offer", () => {
  test("IP10 D3 the note of the marks past 49 groups is drawn under the plot as a note, not a warning, with no count on a heading", async ({
    page,
  }) => {
    const lines = (await readFile(join(FIXTURES, "panel_meta.csv"), "utf8"))
      .trim()
      .split("\n");
    const rows = lines.slice(1).map((row, i) => `${row},c${String(i % 60)}`);
    const panel = await openPanel(
      page,
      `IID,popcat,altitude,collection\n${rows.join("\n")}\n`,
    );
    await ownLd(panel);
    await run(panel);
    await expect(panel.getByRole("heading", { name: /warning/ })).toHaveCount(
      0,
    );
    await chooseOption(page, panel, "Colour the points by", "collection");
    await expect(
      panel.getByText(
        "Note: The 60 values of collection are drawn with 49 marks, which repeat; the legend and the table tell them apart.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(panel.getByRole("heading", { name: /warning/ })).toHaveCount(
      0,
    );
    await expect(panel.getByText(/^Warning:/)).toHaveCount(0);
  });

  test("IP10 D3 the plot is not offered as SVG or PNG, in 3D nor in 2D", async ({
    page,
  }) => {
    const panel = await openPanel(page);
    await run(panel);
    const exports = panel.getByRole("button", { name: /SVG|PNG/ });
    await expect(exports).toHaveCount(0);
    await panel.getByRole("radio", { name: "2D", exact: true }).click();
    await expect(panel.getByRole("img", { name: PCA_2D })).toBeVisible();
    await expect(exports).toHaveCount(0);
    await expect(panel.getByRole("link", { name: /SVG|PNG/ })).toHaveCount(0);
  });
});

test.describe("IP10 D3 a browser with no WebGL 2", () => {
  test("IP10 D3 a project saved in 3D and opened in a browser with no WebGL 2 shows the 2D plot with the words of no WebGL, 3D still pressed", async ({
    page,
  }, testInfo) => {
    await page.goto("popgen.html#variants");
    await pick(page, "Variants file", "panel.nei");
    await expect(
      page.getByRole("main").getByText("200 individuals"),
    ).toBeVisible();
    await goTo(page, "Analyses");
    const saving = page.getByRole("region", { name: "Principal components" });
    await run(saving);
    await expect(
      saving.getByRole("radio", { name: "3D", exact: true }),
    ).toBeChecked();
    await banner(page, "Save project").click();
    const dialog = page.getByRole("dialog", { name: "Save the project" });
    const downloading = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    const saved = await downloading;
    const path = testInfo.outputPath(saved.suggestedFilename());
    await saved.saveAs(path);

    // Another tab of the same browser, whose canvases give no WebGL 2.
    const other = await page.context().newPage();
    {
      await other.addInitScript(noWebGl);
      await other.goto("popgen.html#variants");
      const chooser = other.waitForEvent("filechooser");
      await banner(other, "Open project…").click();
      await (await chooser).setFiles(path);
      await expect(
        other.getByRole("heading", { level: 1, name: "Variants" }),
      ).toBeFocused();
      await pick(other, "Variants file", "panel.nei");
      await expect(
        other.getByRole("main").getByText("200 individuals"),
      ).toBeVisible();
      await goTo(other, "Analyses");
      const panel = other.getByRole("region", { name: "Principal components" });
      await run(panel);
      await expect(panel.getByText(NO_WEBGL)).toBeVisible();
      await expect(
        panel.getByRole("radio", { name: "3D", exact: true }),
      ).toBeChecked();
      await expect(panel.getByRole("img", { name: PCA_2D })).toBeVisible();
      await expect(panel.locator("canvas")).toHaveCount(0);
    }
  });

  test("IP10 D3 in a browser with no WebGL 2 the 2D plot drawn in the place of the 3D view has the description of the 2D plot, and the 2D button stays", async ({
    page,
    makeAxeBuilder,
  }) => {
    await page.addInitScript(noWebGl);
    const panel = await openPanel(page);
    await run(panel);
    await expect(panel.getByText(NO_WEBGL)).toBeVisible();
    await expect(panel.getByRole("img", { name: PCA_2D })).toBeVisible();
    await expect(description2d(panel)).toHaveText(
      /^Principal components of 200 individuals of panel\.nei, PC1, 7\.61% of the variance, across/,
    );
    await expect(
      panel.getByRole("radio", { name: "2D", exact: true }),
    ).toBeEnabled();
    await expectNoViolations(makeAxeBuilder);
  });
});
