/**
 * The row of five tabs of popgen2.html on the built site
 * (docs/plans/analyses-pca.md, work package 1; docs/specs/steps/popgen2-pca.md,
 * "The row of tabs", "Accessibility" and "How it is checked", the bullet
 * "The row of tabs"): the tabs of the analyses greyed before a file, while
 * panel.nei opens, once it is open, and with panel_pops.csv; a greyed tab
 * reached by the arrow keys, its tooltip, Escape, and its refusal of a
 * click, Enter, Space and the arrows, with aria-disabled and its reason
 * as its description, and the tab shown still selected; the PCA tab shown
 * while another variants file is opened, its reason in its place; the
 * labels on two lines at 320 pixels with no sideways scroll; axe with
 * each tab shown, light and dark. And, from the review of the work
 * package: a tooltip gone when its tab opens under the focus; the reason
 * shown by a press of the mouse, a tap and Enter; the tooltip kept
 * through the scroll of a short window; the tab stop back on the tab
 * shown; Distances greyed by the filters of the individuals; End onto
 * Distances once it opens; the look of a tab greyed while shown, of the
 * tabs that open, and labels that do not move.
 *
 * panel.nei holds 1,200 variants of 200 diploid individuals, s000 to
 * s199; panel_pops.csv puts them in p0, p2 and p1.
 */
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** The labels of the five tabs, in their order. */
const LABELS = [
  "Variants",
  "Individuals",
  "PCA",
  "Populations",
  "Distances",
] as const;

type Label = (typeof LABELS)[number];

/** The reasons of the three tabs of the analyses with no variants
    file. */
const NO_VARIANTS = {
  PCA: "The PCA needs a variants file. Open one in the box Variants.",
  Populations:
    "The analyses of the populations need a variants file. Open one in the box Variants.",
  Distances:
    "The distances between populations need a variants file. Open one in the box Variants.",
} as const;

/** The reason of Distances with a variants file and no individuals
    file. */
const NO_INDIVIDUALS =
  "The distances between populations need at least two populations. Open an individuals file that assigns the individuals to them.";

/** The heading of the Distances tab once it opens, since 12 October
    2026 (docs/specs/steps/popgen2-distances.md); "Not built yet: …"
    until then. */
const DISTANCES_HEADING = "Distances between populations";

/** The row of tabs. */
function row(page: Page): Locator {
  return page.getByRole("tablist", { name: "Files and analyses" });
}

/** The label of the tab `name`. */
function tab(page: Page, name: Label): Locator {
  return row(page).getByRole("tab", { name, exact: true });
}

/** The look of the label of the tab `name`: the weight of its words,
    their colour, its background, and its bar, where it is, its width and
    its colour. From 40em the look of 16 October 2026 joins the tab shown
    to its panel and draws its bar at its top as the first shadow inside
    it (tokens.css, --shadow-tab-selected; docs/plans/visual-design.md);
    under 40em, where the row may wrap, the bar is a border under it, as
    in the rows inside a result. Width "0px", colour "none" and place
    "none" when it has none; a line under it thinner than 2 px, the
    joined tab's line in the panel's colour, is no bar. */
async function tabLook(
  page: Page,
  name: Label,
): Promise<{
  readonly weight: string;
  readonly colour: string;
  readonly background: string;
  readonly barAt: "top" | "bottom" | "none";
  readonly barWidth: string;
  readonly bar: string;
}> {
  return tab(page, name).evaluate((element) => {
    const style = getComputedStyle(element);
    const common = {
      weight: style.fontWeight,
      colour: style.color,
      background: style.backgroundColor,
    };
    // "rgb(29, 92, 150) 0px 3px 0px 0px inset, ...", as Chromium and
    // WebKit write it: the colour, then x, y, blur and spread.
    const first = /^(rgba?\([^)]*\)) 0px (\d+(?:\.\d+)?px) 0px 0px inset/u.exec(
      style.boxShadow,
    );
    if (first?.[1] !== undefined && first[2] !== undefined) {
      return { ...common, barAt: "top", barWidth: first[2], bar: first[1] };
    }
    const under = style.borderBottomColor;
    if (
      parseFloat(style.borderBottomWidth) >= 2 &&
      under !== "rgba(0, 0, 0, 0)"
    ) {
      return {
        ...common,
        barAt: "bottom",
        barWidth: style.borderBottomWidth,
        bar: under,
      };
    }
    return { ...common, barAt: "none", barWidth: "0px", bar: "none" };
  });
}

/** The lines the labels of the row take when each line holds as many as
    fit it, from their widths, the gap between them and the room of the
    row, as measured in the page: as many as the font of the page needs. */
async function linesTheLabelsNeed(page: Page): Promise<number> {
  return row(page).evaluate((list) => {
    const room = list.clientWidth;
    const gapValue = parseFloat(getComputedStyle(list).columnGap);
    const gap = Number.isNaN(gapValue) ? 0 : gapValue;
    let lines = 0;
    let used = 0;
    for (const label of list.querySelectorAll('[role="tab"]')) {
      const width = label.getBoundingClientRect().width;
      if (lines > 0 && used + gap + width <= room + 0.5) {
        used += gap + width;
      } else {
        lines += 1;
        used = width;
      }
    }
    return lines;
  });
}

/** The panel of the tab shown. */
function shownPanel(page: Page): Locator {
  return page.getByRole("tabpanel");
}

/** Expects the panel of the tab shown to show `text`, as a user sees it:
    the content of a tab greyed while shown is drawn, hidden, under its
    reason. */
async function expectShown(page: Page, text: string): Promise<void> {
  await expect(shownPanel(page)).toHaveText(text, { useInnerText: true });
}

/** The box of the variants file, named by its heading. */
function variantsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Variants", exact: true });
}

/** The box of the individuals file, named by its heading. */
function individualsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Individuals", exact: true });
}

/** Opens popgen2.html. */
async function openPage(page: Page): Promise<void> {
  await page.goto("popgen2.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Popnei" }),
  ).toBeVisible();
}

/** Picks the fixture `name` with the button of the box of the variants
    file. */
async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await variantsBox(page)
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** Picks the fixture `name` with the button of the box of the
    individuals file. */
async function pickIndividuals(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await individualsBox(page)
    .getByRole("button", { name: /^Open (another )?individuals file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

/** Serves every calculation worker with the opening of the file `name`
    kept from its runner, so that the file stays being opened; to call
    before the page is opened. */
async function holdOpening(page: Page, name: string): Promise<void> {
  await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
    const response = await route.fetch();
    const script = await response.text();
    const front = `self.addEventListener("message", (event) => { if (event.data !== null && typeof event.data === "object" && event.data.kind === "open" && event.data.file.name === ${JSON.stringify(name)}) { event.stopImmediatePropagation(); } });\n`;
    await route.fulfill({ response, body: front + script });
  });
}

/** The channel on which a flow lets an opening held by
    `holdOpeningUntilReleased` through. */
const RELEASE_CHANNEL = "e2e-tabs-release";

/** Serves every calculation worker with the opening of the file `name`
    kept from its runner until `releaseOpening` lets it through; to call
    before the page is opened. */
async function holdOpeningUntilReleased(
  page: Page,
  name: string,
): Promise<void> {
  await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
    const response = await route.fetch();
    const script = await response.text();
    const front = `{ let released = false; const held = []; const channel = new BroadcastChannel(${JSON.stringify(RELEASE_CHANNEL)}); channel.onmessage = () => { released = true; for (const data of held.splice(0)) { self.dispatchEvent(new MessageEvent("message", { data })); } }; self.addEventListener("message", (event) => { if (!released && event.data !== null && typeof event.data === "object" && event.data.kind === "open" && event.data.file.name === ${JSON.stringify(name)}) { held.push(event.data); event.stopImmediatePropagation(); } }); }\n`;
    await route.fulfill({ response, body: front + script });
  });
}

/** Lets the opening held by `holdOpeningUntilReleased` through. */
async function releaseOpening(page: Page): Promise<void> {
  await page.evaluate((channel) => {
    new BroadcastChannel(channel).postMessage("release");
  }, RELEASE_CHANNEL);
}

/** Moves the mouse onto the tab `name` in steps, from below the row, as
    a hand moves it. React Aria shows a tooltip on the mouse once the
    pointer has moved on the page, which a real mouse always does;
    Playwright's \`hover()\` jumps there in one step, after which no
    tooltip showed on a page just opened or after keys (seen in Chromium
    and WebKit on 9 October 2026). Moved in steps, the tooltip shows with
    no click first. */
async function hoverTab(page: Page, name: Label): Promise<void> {
  const box = await tab(page, name).boundingBox();
  if (box === null) throw new Error(`the tab ${name} has no box`);
  const x = box.x + box.width / 2;
  await page.mouse.move(x, box.y + box.height + 120);
  await page.mouse.move(x, box.y + box.height / 2, { steps: 10 });
}

/** Expects the tab `name` greyed with the reason `reason`: aria-disabled,
    and the reason as its description. */
async function expectGreyed(
  page: Page,
  name: Label,
  reason: string,
): Promise<void> {
  await expect(tab(page, name)).toHaveAttribute("aria-disabled", "true");
  await expect(tab(page, name)).toHaveAccessibleDescription(reason);
}

/** Expects the tab `name` not greyed. */
async function expectOpen(page: Page, name: Label): Promise<void> {
  await expect(tab(page, name)).not.toHaveAttribute("aria-disabled");
  await expect(tab(page, name)).toHaveAccessibleDescription("");
}

async function expectNoViolations(
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
}

/** axe on the page as it is, in the light and the dark theme. */
async function expectAxeBothSchemes(
  page: Page,
  makeAxeBuilder: () => { analyze(): Promise<{ violations: unknown[] }> },
): Promise<void> {
  for (const scheme of ["light", "dark"] as const) {
    // No transition of the colours, which axe would read halfway.
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await expectNoViolations(makeAxeBuilder);
  }
}

test("AP1 D4 before a file the five tabs in their order, PCA, Populations and Distances greyed with their reasons, the tooltip on the mouse, and axe light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await expect(row(page).getByRole("tab")).toHaveText([...LABELS]);
  await expect(tab(page, "Variants")).toHaveAttribute("aria-selected", "true");
  await expectOpen(page, "Variants");
  await expectOpen(page, "Individuals");
  for (const [name, reason] of Object.entries(NO_VARIANTS)) {
    await expectGreyed(page, name as Label, reason);
  }
  await expectAxeBothSchemes(page, makeAxeBuilder);

  // The mouse resting on a greyed tab shows its reason, and the tooltip
  // stays while the mouse moves onto it.
  await hoverTab(page, "PCA");
  await expect(page.getByRole("tooltip")).toHaveText(NO_VARIANTS.PCA);
  await page.getByRole("tooltip").hover();
  await expect(page.getByRole("tooltip")).toHaveText(NO_VARIANTS.PCA);
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("AP1 D4 a greyed tab reached by the arrow keys shows its tooltip, hides it with Escape, and opens by neither a click, Enter, Space nor the arrows, the tab shown still selected", async ({
  page,
}) => {
  await openPage(page);
  await tab(page, "Variants").focus();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Individuals")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(shownPanel(page)).toHaveText("No individuals file open.");

  // The arrow key reaches the greyed PCA: the focus rests on it, its
  // tooltip shows, and Individuals stays shown and selected.
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "PCA")).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveText(NO_VARIANTS.PCA);
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "false");
  await expect(tab(page, "Individuals")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(shownPanel(page)).toHaveText("No individuals file open.");
  await expectGreyed(page, "PCA", NO_VARIANTS.PCA);

  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(tab(page, "PCA")).toBeFocused();

  for (const key of ["Enter", " "]) {
    await page.keyboard.press(key);
    await expect(tab(page, "Individuals")).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(shownPanel(page)).toHaveText("No individuals file open.");
    // The press refused shows the reason again, which Escape had hidden.
    await expect(page.getByRole("tooltip")).toHaveText(NO_VARIANTS.PCA);
    await page.keyboard.press("Escape");
  }
  // Forced, since Playwright clicks nothing marked aria-disabled; a user
  // can.
  await tab(page, "PCA").click({ force: true });
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "false");
  await expect(shownPanel(page)).toHaveText("No individuals file open.");

  // The next arrow keys move along the greyed tabs, and Home shows the
  // first.
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Populations")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Distances")).toBeFocused();
  await expect(tab(page, "Individuals")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Home");
  await expect(tab(page, "Variants")).toBeFocused();
  await expect(tab(page, "Variants")).toHaveAttribute("aria-selected", "true");
  // And the arrow key from a greyed tab to one that opens shows it.
  await page.keyboard.press("End");
  await expect(tab(page, "Distances")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(tab(page, "Individuals")).toBeFocused();
  await expect(tab(page, "Individuals")).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("AP1 D4 while panel.nei is being opened the three tabs of the analyses say so, and the PCA's tooltip on the mouse", async ({
  page,
  makeAxeBuilder,
}) => {
  await holdOpening(page, "panel.nei");
  await openPage(page);
  await pick(page, "panel.nei");
  const opening = {
    PCA: "The PCA needs a variants file: panel.nei is being opened.",
    Populations:
      "The analyses of the populations need a variants file: panel.nei is being opened.",
    Distances:
      "The distances between populations need a variants file: panel.nei is being opened.",
  } as const;
  for (const [name, reason] of Object.entries(opening)) {
    await expectGreyed(page, name as Label, reason);
  }
  await hoverTab(page, "PCA");
  await expect(page.getByRole("tooltip")).toHaveText(opening.PCA);
  await expectAxeBothSchemes(page, makeAxeBuilder);
});

test("AP1 D4 panel.nei open: PCA and Populations open and Distances asks for an individuals file; with panel_pops.csv Distances opens; axe with each tab shown, light and dark", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPage(page);
  await pick(page, "panel.nei");
  await expectOpen(page, "PCA");
  await expectOpen(page, "Populations");
  await expectGreyed(page, "Distances", NO_INDIVIDUALS);
  await tab(page, "PCA").click();
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "true");
  await expect(
    shownPanel(page).getByRole("heading", { level: 2, name: "PCA" }),
  ).toBeVisible();
  await tab(page, "Populations").click();
  await expect(
    shownPanel(page).getByRole("heading", { level: 2, name: "Diversity" }),
  ).toBeVisible();
  await tab(page, "Distances").click({ force: true });
  await expect(tab(page, "Populations")).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await pickIndividuals(page, "panel_pops.csv");
  await expectOpen(page, "Distances");
  // The one pass ended, so that axe reads a page that stays still: the
  // download of the individuals' table, in the Variants tab, is its sign.
  await tab(page, "Variants").click();
  await expect(
    page.getByRole("button", {
      name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
    }),
  ).toBeVisible({ timeout: 20_000 });
  for (const name of LABELS) {
    await tab(page, name).click();
    await expect(tab(page, name)).toHaveAttribute("aria-selected", "true");
    if (name === "Distances") {
      await expect(
        shownPanel(page).getByRole("heading", {
          level: 2,
          name: DISTANCES_HEADING,
        }),
      ).toBeVisible({ timeout: 20_000 });
    }
    await expectAxeBothSchemes(page, makeAxeBuilder);
  }
});

test("AP1 D4 the PCA tab shown, another variants file opened: the tab stays shown, greyed, with its reason in its place, and comes back when the file is open", async ({
  page,
  makeAxeBuilder,
}) => {
  await holdOpening(page, "panel.vcf.gz");
  await openPage(page);
  await pick(page, "panel.nei");
  await expectOpen(page, "PCA");
  await tab(page, "PCA").click();
  await expect(
    shownPanel(page).getByRole("heading", { level: 2, name: "PCA" }),
  ).toBeVisible();

  await pick(page, "panel.vcf.gz");
  const reason = "The PCA needs a variants file: panel.vcf.gz is being opened.";
  await expectGreyed(page, "PCA", reason);
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "true");
  await expectShown(page, reason);
  // Its bar kept, in the greyed colour, its words not in bold, so that
  // the user can tell which tab they are on.
  const look = await tabLook(page, "PCA");
  expect(look.weight).toBe("400");
  expect(look.barAt).toBe("top");
  expect(look.barWidth).toBe("3px");
  expect(look.bar).toBe(look.colour);
  await expectAxeBothSchemes(page, makeAxeBuilder);

  await page.unrouteAll({ behavior: "wait" });
  await pick(page, "panel.nei");
  await expectOpen(page, "PCA");
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "true");
  await expect(
    shownPanel(page).getByRole("heading", { level: 2, name: "PCA" }),
  ).toBeVisible();
});

test("at 320 pixels the PCA tab shown, another variants file opened: the tab keeps a bar of 3 px under it in the greyed colour", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await holdOpening(page, "panel.vcf.gz");
  await openPage(page);
  await pick(page, "panel.nei");
  await expectOpen(page, "PCA");
  await tab(page, "PCA").click();
  await pick(page, "panel.vcf.gz");
  await expectGreyed(
    page,
    "PCA",
    "The PCA needs a variants file: panel.vcf.gz is being opened.",
  );
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "true");
  const look = await tabLook(page, "PCA");
  expect(look.weight).toBe("400");
  expect(look.background).toBe("rgba(0, 0, 0, 0)");
  expect(look.barAt).toBe("bottom");
  expect(look.barWidth).toBe("3px");
  expect(look.bar).toBe(look.colour);
});

test("at 1280 pixels the PCA tab greyed while shown has its greyed bar at its top, no background, and under it the row's line, not a line in the greyed colour", async ({
  page,
}) => {
  // The rule of a tab greyed while shown in the rows inside a result,
  // whose bar is the 3 px border under it, coloured the 1 px line under
  // the tab of the page's row in the greyed colour, a dark mark under the
  // tab that the row's other tabs do not have (the review of the look, 16
  // October 2026).
  await page.setViewportSize({ width: 1280, height: 900 });
  await holdOpening(page, "panel.vcf.gz");
  await openPage(page);
  await pick(page, "panel.nei");
  await expectOpen(page, "PCA");
  await tab(page, "PCA").click();
  await pick(page, "panel.vcf.gz");
  await expectGreyed(
    page,
    "PCA",
    "The PCA needs a variants file: panel.vcf.gz is being opened.",
  );
  await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "true");
  const look = await tabLook(page, "PCA");
  expect(look.barAt).toBe("top");
  expect(look.bar).toBe(look.colour);
  expect(look.background).toBe("rgba(0, 0, 0, 0)");
  const under = await tab(page, "PCA").evaluate(
    (element) => getComputedStyle(element).borderBottomColor,
  );
  const rowLine = await row(page).evaluate(
    (element) => getComputedStyle(element).borderBottomColor,
  );
  expect(under).not.toBe(look.colour);
  // Transparent, so that the row's line shows through as under a tab not
  // shown, or that line's colour.
  expect(["rgba(0, 0, 0, 0)", rowLine]).toContain(under);
});

test("AP1 D4 at 320 pixels the five labels on two lines, the tab shown with its bar and its weight, and no sideways scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await openPage(page);
  await pick(page, "panel.nei");
  await expectOpen(page, "PCA");
  const boxes = new Map<string, string>();
  for (const shown of ["Variants", "Populations"] as const) {
    await tab(page, shown).click();
    const tops = new Set<number>();
    for (const name of LABELS) {
      const box = await tab(page, name).boundingBox();
      if (box === null) throw new Error(`the tab ${name} has no box`);
      // Each label where it was with the other tab shown: the labels do
      // not move when the tab shown changes.
      const where = `${String(box.x)},${String(box.y)},${String(box.width)}`;
      expect(boxes.get(name) ?? where).toBe(where);
      boxes.set(name, where);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
      tops.add(Math.round(box.y));
    }
    // The lines the labels take as wide as they are in the font of the
    // page: two in the Mac's system font, three in DejaVu Sans, Ubuntu's,
    // where "Variants", "Individuals" and "PCA" do not fit 288 px (GitHub's
    // runners, 13 October 2026). Each line holds as many labels as fit it,
    // so that the row breaks only where it must.
    expect(tops.size).toBe(await linesTheLabelsNeed(page));
    expect(tops.size).toBeGreaterThanOrEqual(2);
    // Not joined to the panel, which a tab of the first line does not
    // touch: no background of its own, and its bar of 3 px under it.
    const look = await tabLook(page, shown);
    expect(look.weight).toBe("600");
    expect(look.background).toBe("rgba(0, 0, 0, 0)");
    expect(look.barAt).toBe("bottom");
    expect(look.barWidth).toBe("3px");
    expect(look.bar).not.toMatch(/^(none|rgba\(0, 0, 0, 0\))$/u);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  // A greyed tab not shown has neither the bar nor the weight of the tab
  // shown, and a tab that opens is in the colour of the text, the
  // heading's, apart from the greyed one's.
  const greyed = await tabLook(page, "Distances");
  expect(greyed.weight).toBe("400");
  expect(greyed.barAt).toBe("none");
  const textColour = await page
    .getByRole("heading", { level: 1, name: "Popnei" })
    .evaluate((element) => getComputedStyle(element).color);
  const openColour = await tab(page, "PCA").evaluate(
    (element) => getComputedStyle(element).color,
  );
  expect(openColour).toBe(textColour);
  expect(greyed.colour).not.toBe(textColour);
});

test("the panel of the tab shown on a narrow window runs to the window's edges with the page's 16 px inside and no border at its sides, the tab shown not joined to it; from 640 px it stands in the column with its border and 24 px inside, the tab joined to it on a row of one line", async ({
  page,
}) => {
  // 40em at the browser's 16 px: the width under which the panel runs to
  // the edges and the tab shown is not joined to it (Tabs.module.css, the
  // look of 16 October 2026). At 320 px the text and the buttons of the
  // panel stood 0 px from its border, and the tab shown of the first of
  // two lines was drawn joined to a panel it did not touch. The five
  // labels take 477 px in the Mac's font and 541 px in DejaVu Sans, the
  // font of GitHub's runners, and the row has 608 px at 640.
  for (const [width, narrow] of [
    [320, true],
    [639, true],
    [640, false],
    [1280, false],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await openPage(page);
    const panel = await shownPanel(page).evaluate((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        paddingStart: style.paddingInlineStart,
        paddingEnd: style.paddingInlineEnd,
        borderStart: style.borderInlineStartWidth,
        borderEnd: style.borderInlineEndWidth,
      };
    });
    // The tab shown, Variants, joined to the panel only where the row is
    // on one line, its bar at its top; under 40em its bar under it.
    const look = await tabLook(page, "Variants");
    expect(look.barAt).toBe(narrow ? "bottom" : "top");
    expect(look.barWidth).toBe("3px");
    if (!narrow) {
      const tops = new Set<number>();
      for (const name of LABELS) {
        const box = await tab(page, name).boundingBox();
        if (box === null) throw new Error(`the tab ${name} has no box`);
        tops.add(Math.round(box.y));
      }
      expect(tops.size).toBe(1);
    }
    if (narrow) {
      expect(panel).toEqual({
        left: 0,
        right: width,
        paddingStart: "16px",
        paddingEnd: "16px",
        borderStart: "0px",
        borderEnd: "0px",
      });
    } else {
      expect(panel.left).toBeGreaterThanOrEqual(16);
      expect(panel.right).toBeLessThanOrEqual(width - 16);
      expect(panel.paddingStart).toBe("24px");
      expect(panel.paddingEnd).toBe("24px");
      expect(panel.borderStart).toBe("1px");
      expect(panel.borderEnd).toBe("1px");
    }
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBe(0);
  }
});

test("AP1 D4 a tooltip on a greyed tab goes when the tab opens while the focus stays on it", async ({
  page,
}) => {
  await holdOpeningUntilReleased(page, "panel.nei");
  await openPage(page);
  await pick(page, "panel.nei");
  const reason = "The PCA needs a variants file: panel.nei is being opened.";
  await expectGreyed(page, "PCA", reason);
  await tab(page, "Variants").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "PCA")).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveText(reason);

  await releaseOpening(page);
  await expectOpen(page, "PCA");
  await expect(tab(page, "PCA")).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveCount(0);
});

test("AP1 D4 the mouse moved onto a greyed tab and pressed at once shows its reason, which stays while the mouse rests", async ({
  page,
}) => {
  await openPage(page);
  await hoverTab(page, "PCA");
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.getByRole("tooltip")).toHaveText(NO_VARIANTS.PCA);
  await expect(tab(page, "Variants")).toHaveAttribute("aria-selected", "true");
  // The time the tooltip has to stay is what is checked, not a wait for
  // the page: 1.5 s, the delay of React Aria's own tooltips.
  await page.waitForTimeout(1_500);
  await expect(page.getByRole("tooltip")).toHaveText(NO_VARIANTS.PCA);
});

test.describe("on a touch screen", () => {
  test.use({ hasTouch: true });

  test("AP1 D4 a tap on a greyed tab shows its reason, and the tab shown stays shown", async ({
    page,
  }) => {
    await openPage(page);
    await tab(page, "PCA").tap({ force: true });
    await expect(page.getByRole("tooltip")).toHaveText(NO_VARIANTS.PCA);
    await expect(tab(page, "Variants")).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

test("AP1 D4 on a short window the arrow key onto a greyed tab of the second line keeps its tooltip through the scroll that brings it into view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 500 });
  await openPage(page);
  // The first tab of the second line, greyed with no file: Populations in
  // the Mac's system font, PCA in DejaVu Sans, Ubuntu's, whose wider
  // labels leave PCA no room on the first line (GitHub's runners, 13
  // October 2026).
  const tops = await Promise.all(
    LABELS.map(async (name) => (await tab(page, name).boundingBox())?.y ?? 0),
  );
  const place = tops.findIndex((top) => top > (tops[0] ?? 0) + 1);
  const first = LABELS[place];
  if (first === undefined || !(first in NO_VARIANTS)) {
    throw new Error(`the second line starts with ${String(first)}`);
  }
  const reason = NO_VARIANTS[first as keyof typeof NO_VARIANTS];
  // The window ends just above the bottom of the second line of tabs,
  // so that the arrow key onto its first tab scrolls it into view,
  // however high the boxes above are.
  const second = await tab(page, first).boundingBox();
  if (second === null) throw new Error(`the tab ${first} is not drawn`);
  await page.setViewportSize({
    width: 320,
    height: Math.floor(second.y + second.height) - 2,
  });
  await tab(page, "Variants").focus();
  for (let step = 1; step < place; step += 1) {
    await page.keyboard.press("ArrowRight");
  }
  const previous = LABELS[place - 1];
  if (previous !== undefined && previous in NO_VARIANTS) {
    await expect(page.getByRole("tooltip")).toHaveText(
      NO_VARIANTS[previous as keyof typeof NO_VARIANTS],
    );
  }
  const before = await page.evaluate(() => window.scrollY);
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, first)).toBeFocused();
  await expect(page.getByRole("tooltip")).toHaveText(reason);
  // The browser scrolled the tab into view, which closed every tooltip
  // before.
  // WebKit may scroll after the focus has moved, so the scroll is waited
  // for, not read once.
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(before);
  await expect(page.getByRole("tooltip")).toHaveText(reason);
});

test("AP1 D4 the arrows resting on a greyed tab, Tab out and Shift+Tab back put the focus on the tab shown", async ({
  page,
}) => {
  await openPage(page);
  await tab(page, "Variants").focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(tab(page, "Populations")).toBeFocused();
  await expect(tab(page, "Individuals")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Tab");
  await expect(
    row(page).getByRole("tab").and(page.locator(":focus")),
  ).toHaveCount(0);
  await page.keyboard.press("Shift+Tab");
  await expect(tab(page, "Individuals")).toBeFocused();
});

test("AP1 D4 the filters of the individuals keeping one population grey Distances with their reason, and a threshold off opens it again; End shows Distances when it opens", async ({
  page,
}) => {
  await openPage(page);
  await pick(page, "panel.nei");
  await pickIndividuals(page, "panel_pops.csv");
  await expectOpen(page, "Distances");
  // The one pass ended, which the thresholds of the individuals need: the
  // download of the individuals' table is its sign.
  await expect(
    page.getByRole("button", {
      name: "Download the missing genotypes and heterozygosity of each individual (CSV)",
    }),
  ).toBeVisible({ timeout: 20_000 });

  await tab(page, "Variants").focus();
  await page.keyboard.press("End");
  await expect(tab(page, "Distances")).toBeFocused();
  await expect(tab(page, "Distances")).toHaveAttribute("aria-selected", "true");
  await expect(
    shownPanel(page).getByRole("heading", {
      level: 2,
      name: DISTANCES_HEADING,
    }),
  ).toBeVisible({ timeout: 20_000 });
  await tab(page, "Variants").click();

  // Only s005, of p2, has an observed heterozygosity of 0.322 or less
  // (0.3211; the next, s142 of p0, 0.3222), as popnei 0.2.2 gives it in
  // e2e/fixtures/panel_individual_stats.json.
  const threshold = page.getByRole("textbox", {
    name: /maximum observed heterozygosity of an individual$/u,
  });
  await threshold.fill("0.322");
  await threshold.press("Enter");
  await expectGreyed(
    page,
    "Distances",
    "The distances between populations need at least two populations, and the filters keep individuals of 1 population. Loosen the filters of the individuals in the Variants tab.",
  );
  await threshold.fill("1");
  await threshold.press("Enter");
  await expectOpen(page, "Distances");
});

test("AP1 D4 the tooltip of a greyed tab opens below the whole row, under its own tab: at 1280 px its left edge at the tab's, at 320 px below both lines", async ({
  page,
}) => {
  for (const width of [1280, 320] as const) {
    await page.setViewportSize({ width, height: 900 });
    await openPage(page);
    await tab(page, "Variants").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tooltip")).toHaveText(NO_VARIANTS.PCA);
    const tooltipBox = await page.getByRole("tooltip").boundingBox();
    const tabBox = await tab(page, "PCA").boundingBox();
    const rowBox = await row(page).boundingBox();
    if (tooltipBox === null || tabBox === null || rowBox === null) {
      throw new Error("the tooltip, the tab or the row has no box");
    }
    expect(tooltipBox.y).toBeGreaterThanOrEqual(rowBox.y + rowBox.height);
    if (width === 1280) {
      expect(Math.abs(tooltipBox.x - tabBox.x)).toBeLessThanOrEqual(4);
    }
  }
});
