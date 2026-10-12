/**
 * The band at the top of popgen2.html, on the built site
 * (docs/specs/steps/popgen2-band.md, "How it is checked", In
 * Playwright): the one pass held, "Statistics of panel.nei" and its share, and
 * the band's Stop; the PCA held running, its clock, the same in the
 * Variants tab, and the band's Stop, after which a threshold moved
 * starts nothing; the PCA live and a threshold moved, about to start
 * then running, with no line of nothing between, read at every change of
 * the band; the PCoA with the LD pruning off, the link to its 2
 * warnings; an error of the application, its line in an alert, Details
 * and Close, beside a PCA held running; the page scrolled to its end,
 * each control the Tab key reaches below the band; the dialog of the
 * download open and an error, the band's alert not inert; an error with
 * the page scrolled down, the page scrolled at once to the band, at 1280
 * and at 320 pixels, and the focus on the heading when the control that
 * had it is left out of the window; the same with the dialog of the
 * download open, the page still until it closes; the band's
 * height the same whatever it says, at 1280 and at 320 pixels, the
 * short forms on one line, and the one `<h1>`; and axe in each state,
 * light and dark.
 *
 * Not here: the one pass about to start with its start held, which the
 * page cannot hold, since the code that starts the pass does so in the
 * same task as the read of the file ends; its line and its Stop are
 * checked in node (src/ui/band/band.test.ts). And the time of
 * "Stopping", which is the measurement of work package 5.
 *
 * panel.nei holds 1,200 variants of 200 diploid individuals; its PCoA
 * with the LD pruning off has 2 warnings, the pruning off and Lingoes'
 * correction (popnei 0.2.2 under node).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { announced, recordAnnouncements } from "./announced.ts";
import { expect, test } from "./axe.ts";
import { holdSummary, release, workersListening } from "./holdWorker.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** How long a PCA of panel.nei may take to give its result. */
const RESULT_TIMEOUT = 30_000;

/** The label of the field of the distance of the LD pruning. */
const DISTANCE =
  "Distance within which variants are compared, in base pairs, from 1";

/** What the status region says at a Stop of the PCA, and of the pass. */
const PCA_STOPPED =
  "PCA stopped. Press Run in the PCA tab to calculate it again.";
const PASS_STOPPED =
  "The count of the variants and the statistics were stopped. Start again calculates them from the start.";

/** The name of a variants file of 74 characters, longer than the line
    of the band at its widest. */
const LONG_NAME =
  "Solanum_lycopersicum_landraces_and_wild_relatives_genotyped_panel_2026.nei";

/** The words of an error of the application on this page. */
const ERROR_TEXT =
  "The application met an error of its own: test. Reload the page, and open your files again.";

/** Records, from the next load of `page`, every state of the band's
    line, its words and its controls as the eye reads them, with the
    band's height and the top of the box of the variants file in the
    page, at each change of the band: a MutationObserver sees every
    state the band was drawn in, also one shown for less than a frame. */
async function recordBand(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const states: { text: string; height: number; boxTop: number | null }[] =
      [];
    Reflect.set(window, "popneiBand", states);
    const record = (): void => {
      const heading = document.querySelector("#defects h1");
      const line = heading?.parentElement;
      const header = document.querySelector("#defects header");
      if (!(line instanceof HTMLElement) || header === null) return;
      const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
      const parts: string[] = [];
      for (
        let node = walker.nextNode();
        node !== null;
        node = walker.nextNode()
      ) {
        const parent = node.parentElement;
        if (parent === null || parent.getBoundingClientRect().width <= 1)
          continue;
        parts.push(node.textContent ?? "");
      }
      const text = parts.join(" ").replace(/\s+/gu, " ").trim();
      if (states.at(-1)?.text === text) return;
      const box = document.querySelector("main section");
      states.push({
        text,
        height: header.getBoundingClientRect().height,
        boxTop:
          box === null
            ? null
            : box.getBoundingClientRect().top + window.scrollY,
      });
    };
    new MutationObserver(record).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
}

/** What `recordBand` kept. */
async function bandStates(
  page: Page,
): Promise<readonly { text: string; height: number; boxTop: number | null }[]> {
  return page.evaluate(() => {
    const states: unknown = Reflect.get(window, "popneiBand");
    return Array.isArray(states)
      ? (states as { text: string; height: number; boxTop: number | null }[])
      : [];
  });
}

/** The band. */
function band(page: Page): Locator {
  return page.getByRole("banner", { name: "What the page is doing" });
}

/** The heading Popnei at the band's left. */
function heading(page: Page): Locator {
  return band(page).getByRole("heading", { level: 1, name: "Popnei" });
}

/** The line of the band as the eye reads it: "Popnei", its words and
    its controls, without what is drawn for a screen reader alone, the
    whole words clipped to a pixel under 45 rem. */
async function lineText(page: Page): Promise<string> {
  return heading(page).evaluate(seenText);
}

/** The text of what is seen of the line whose heading is `heading`:
    each text whose element is wider than a pixel. Run in the page. */
function seenText(heading: Element): string {
  const line = heading.parentElement;
  if (line === null) return "";
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (parent === null || parent.getBoundingClientRect().width <= 1) continue;
    parts.push(node.textContent ?? "");
  }
  return parts.join(" ").replace(/\s+/gu, " ").trim();
}

/** The button of the band named `name`. */
function bandButton(page: Page, name: string): Locator {
  return band(page).getByRole("button", { name, exact: true });
}

async function pick(page: Page, name: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: /^Open (another )?variants file…$/u })
    .click();
  await (await chooser).setFiles(join(FIXTURES, name));
}

function tab(page: Page, name: "Variants" | "PCA"): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name, exact: true });
}

/** The panel of the tab shown. */
function shown(page: Page): Locator {
  return page.getByRole("tabpanel");
}

function run(page: Page): Locator {
  return shown(page).getByRole("button", { name: "Run", exact: true });
}

/** The box of the variants file. */
function variantsBox(page: Page): Locator {
  return page.getByRole("region", { name: "Variants", exact: true });
}

/** The line of the missing data among the statistics of the file. */
function missingSlider(page: Page): Locator {
  return page
    .getByRole("region", { name: "Statistics of the file" })
    .getByRole("group", {
      name: "Proportion of missing genotypes",
      exact: true,
    })
    .getByRole("slider");
}

/** The caption of the table of the individuals of a result, shown or
    hidden behind another tab. */
function caption(page: Page): Locator {
  return page.getByText(/^The place of each of the 200 individuals/u);
}

/** Counts the calculations the page asks of its workers, every "run"
    message, in `window.postedRuns`. */
function countRuns(): void {
  const posted = { runs: 0 };
  Object.assign(globalThis, { postedRuns: posted });
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its worker
  const post = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function (
    this: Worker,
    message: unknown,
    ...rest: unknown[]
  ) {
    if (
      typeof message === "object" &&
      message !== null &&
      "kind" in message &&
      message.kind === "run"
    ) {
      posted.runs += 1;
    }
    (post as (...args: unknown[]) => void).call(this, message, ...rest);
  } as typeof post;
}

/** The calculations the page asked of its workers so far. */
async function runsPosted(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      (globalThis as unknown as { postedRuns: { runs: number } }).postedRuns
        .runs,
  );
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
  await page.emulateMedia({ colorScheme: "light", reducedMotion: null });
}

/** Opens panel.nei with the one pass held and released to its end. */
async function openHeldPassDone(page: Page): Promise<void> {
  await pick(page, "panel.nei");
  await release(page, "allSoFar");
  await release(page, "result");
  await expect(variantsBox(page)).toContainText("Variants: 1,200", {
    timeout: RESULT_TIMEOUT,
  });
}

/** In the PCA tab: the PCoA chosen when `pcoa`, the LD pruning off when
    `pruningOff`, or its distance typed, 50000, otherwise; then Run. */
async function runPca(
  page: Page,
  { pcoa = false, pruningOff = false } = {},
): Promise<void> {
  await tab(page, "PCA").click();
  if (pcoa) {
    await shown(page)
      .getByRole("button", { name: /Method$/u })
      .click();
    await page.getByRole("option", { name: /^PCoA of the Kosman/u }).click();
  }
  if (pruningOff) {
    await shown(page)
      .locator("label")
      .filter({ hasText: "Prune the variants by linkage disequilibrium (LD)" })
      .click();
  } else {
    const distance = shown(page).getByRole("textbox", { name: DISTANCE });
    await distance.fill("50000");
    await distance.press("Enter");
  }
  await expect(run(page)).toBeEnabled({ timeout: RESULT_TIMEOUT });
  await run(page).click();
}

test.describe("NU5 D3 the band of popgen2.html", () => {
  test("NU5 D3 a file opened, the pass held: Statistics of panel.nei, then its share; the band's Stop stops the pass, the box offers Start again, the status region says it, and the focus is on the heading; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    await holdSummary(page);
    await recordAnnouncements(page);
    await recordBand(page);
    await page.goto("popgen2.html");
    await expect.poll(() => lineText(page)).toBe("Popnei");
    await expectAxeBothSchemes(page, makeAxeBuilder);

    await pick(page, "panel.nei");
    await expect
      .poll(() => lineText(page))
      .toMatch(/^Popnei Statistics of panel\.nei · \d+% Stop$/u);
    const texts = (await bandStates(page)).map((state) => state.text);
    // The name alone before the first progress, if it was drawn, comes
    // before any share.
    expect(texts.find((text) => text !== "Popnei")).toMatch(
      /^Popnei Statistics of panel\.nei( · \d+%)? Stop$/u,
    );
    await expectAxeBothSchemes(page, makeAxeBuilder);

    await bandButton(page, "Stop the statistics of panel.nei").press("Enter");
    await expect(
      variantsBox(page).getByRole("button", { name: "Start again" }),
    ).toBeVisible();
    await expect(heading(page)).toBeFocused();
    await expect
      .poll(async () => (await announced(page)).join(" "))
      .toContain(PASS_STOPPED);
    await expect.poll(() => lineText(page), { timeout: 15_000 }).toBe("Popnei");
    await workersListening(page);
  });

  test("NU5 D3 the PCA run and held: PCA running and its clock, the same in the Variants tab; the band's Stop: Stopping the PCA, the PCA tab shows Run, the status region says it, the focus on the heading, and a threshold moved then starts nothing; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await holdSummary(page, { holdPca: true });
    await page.addInitScript(countRuns);
    await recordAnnouncements(page);
    await recordBand(page);
    await page.goto("popgen2.html");
    await openHeldPassDone(page);
    await runPca(page);

    // The PCA tab shown: the words, and its Stop in the tab alone.
    await expect
      .poll(() => lineText(page))
      .toMatch(/^Popnei PCA running · 0:0\d$/u);
    await tab(page, "Variants").click();
    await expect
      .poll(() => lineText(page))
      .toMatch(/^Popnei PCA running · 0:\d\d Stop$/u);
    await expectAxeBothSchemes(page, makeAxeBuilder);

    await bandButton(page, "Stop the PCA").press("Enter");
    await expect(heading(page)).toBeFocused();
    await expect
      .poll(async () => (await announced(page)).join(" "))
      .toContain(PCA_STOPPED);
    const texts = (await bandStates(page)).map((state) => state.text);
    expect(texts).toContain("Popnei Stopping the PCA…");
    await expect.poll(() => lineText(page), { timeout: 15_000 }).toBe("Popnei");
    await tab(page, "PCA").click();
    await expect(run(page)).toBeVisible();

    const posted = await runsPosted(page);
    await tab(page, "Variants").click();
    await missingSlider(page).focus();
    await page.keyboard.press("ArrowLeft");
    // Twice the quiet second, for a start that must not come.
    await page.waitForTimeout(2000);
    expect(await runsPosted(page)).toBe(posted);
    expect(await lineText(page)).toBe("Popnei");
    await workersListening(page);
  });

  test("NU5 D3 the PCA live and a threshold moved in the Variants tab: The PCA starts in a moment with Stop recalculating, then PCA running, with no line of nothing between, then Popnei alone", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await recordBand(page);
    await page.goto("popgen2.html");
    await pick(page, "panel.nei");
    await expect(variantsBox(page)).toContainText("Variants: 1,200", {
      timeout: RESULT_TIMEOUT,
    });
    await runPca(page);
    await expect(caption(page)).toContainText("from 548 variants.", {
      timeout: RESULT_TIMEOUT,
    });
    // Live, and nothing runs nor is about to start: Popnei alone.
    await expect.poll(() => lineText(page)).toBe("Popnei");
    await tab(page, "Variants").click();
    const before = (await bandStates(page)).length;

    await missingSlider(page).focus();
    await page.keyboard.press("ArrowLeft");

    await expect
      .poll(
        async () =>
          (await bandStates(page))
            .slice(before)
            .some((state) => state.text.startsWith("Popnei PCA running")),
        { timeout: RESULT_TIMEOUT },
      )
      .toBe(true);
    await expect
      .poll(() => lineText(page), { timeout: RESULT_TIMEOUT })
      .toBe("Popnei");
    const texts = (await bandStates(page))
      .slice(before)
      .map((state) => state.text);
    const about = texts.indexOf(
      "Popnei The PCA starts in a moment Stop recalculating",
    );
    const running = texts.findIndex((text) =>
      /^Popnei PCA running · 0:\d\d Stop$/u.test(text),
    );
    expect(about, texts.join(" | ")).toBeGreaterThanOrEqual(0);
    expect(running).toBeGreaterThan(about);
    expect(texts.slice(about, running).every((text) => text !== "Popnei")).toBe(
      true,
    );
  });

  test("NU5 D3 the PCoA with the LD pruning off, done, the Variants tab shown: the link to its 2 warnings; Enter shows the PCA tab with the focus on the heading 2 warnings and the link gone; the Variants tab again, the link back; axe light and dark", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await page.goto("popgen2.html");
    await pick(page, "panel.nei");
    await expect(variantsBox(page)).toContainText("Variants: 1,200", {
      timeout: RESULT_TIMEOUT,
    });
    await runPca(page, { pcoa: true, pruningOff: true });
    await expect(
      shown(page).getByRole("heading", { level: 3, name: "2 warnings" }),
    ).toBeVisible({ timeout: RESULT_TIMEOUT });
    // The PCA tab shown: no link, and the PCoA live, nothing more.
    await expect.poll(() => lineText(page)).toBe("Popnei");

    await tab(page, "Variants").click();
    const link = band(page).getByRole("link", {
      name: "PCoA: 2 warnings, in the PCA tab",
    });
    await expect(link).toBeVisible();
    await expect
      .poll(() => lineText(page))
      .toBe("Popnei PCoA: 2 warnings, in the PCA tab");
    await expectAxeBothSchemes(page, makeAxeBuilder);

    // Reached by the keyboard, its ring of the focus, 2 px wide and 2 px
    // away from it, is drawn whole, not cut by the box of the words; and
    // a circle of 24 px centred on it meets no other control (WCAG 2.5.8).
    await heading(page).focus();
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    const ring = await link.evaluate((element) => {
      // The box of the words, around the link, which React Aria draws
      // as a span with the role of a link when it has no address.
      const words = element.parentElement;
      if (words === null) return null;
      const linkBox = element.getBoundingClientRect();
      const wordsBox = words.getBoundingClientRect();
      const others = [
        ...(element
          .closest("header")
          ?.querySelectorAll("button, a, [role='link']") ?? []),
      ].filter((other) => other !== element);
      return {
        inside:
          linkBox.left - 4 >= wordsBox.left - 0.5 &&
          linkBox.right + 4 <= wordsBox.right + 0.5 &&
          linkBox.top - 4 >= wordsBox.top - 0.5 &&
          linkBox.bottom + 4 <= wordsBox.bottom + 0.5,
        others: others.length,
      };
    });
    expect(ring).toEqual({ inside: true, others: 0 });
    await page.keyboard.press("Enter");
    await expect(tab(page, "PCA")).toHaveAttribute("aria-selected", "true");
    await expect(
      shown(page).getByRole("heading", { level: 3, name: "2 warnings" }),
    ).toBeFocused();
    await expect(link).toHaveCount(0);

    await tab(page, "Variants").click();
    await expect(link).toBeVisible();
  });

  test("NU5 D3 an error of the application beside a PCA held running: both lines, the error in an alert, the band scrolling with the page, Details reached with the page scrolled shows the count and Copy the details in the window, Close empties it and gives the focus to the heading; axe light and dark with the error and with its details", async ({
    page,
    makeAxeBuilder,
  }) => {
    test.setTimeout(90_000);
    await holdSummary(page, { holdPca: true });
    await page.goto("popgen2.html");
    await openHeldPassDone(page);
    await runPca(page);
    await tab(page, "Variants").click();
    await expect
      .poll(() => lineText(page))
      .toMatch(/^Popnei PCA running · 0:\d\d Stop$/u);

    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error("test");
      });
      setTimeout(() => {
        throw new Error("second");
      }, 10);
    });
    await expect(band(page).getByRole("alert")).toHaveText(ERROR_TEXT);
    await expect
      .poll(() => lineText(page))
      .toMatch(/^Popnei PCA running · 0:\d\d Stop$/u);
    await expect(bandButton(page, "Details")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    // With an error shown the band scrolls with the page, and covers
    // nothing of the window, at 400% zoom among others.
    expect(
      await band(page).evaluate(
        (element) => getComputedStyle(element).position,
      ),
    ).toBe("static");
    await expectAxeBothSchemes(page, makeAxeBuilder);

    // Details reached by the keyboard with the page scrolled to its end:
    // the details under it are in the window.
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });
    await bandButton(page, "Details").focus();
    await page.keyboard.press("Enter");
    await expect(bandButton(page, "Details")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(band(page)).toContainText("1 more error followed it.");
    await expect(bandButton(page, "Copy the details")).toBeInViewport();
    expect(
      await band(page).evaluate(
        (element) => getComputedStyle(element).position,
      ),
    ).toBe("static");
    await expectAxeBothSchemes(page, makeAxeBuilder);

    await bandButton(page, "Close").click();
    await expect(band(page).getByRole("alert")).toHaveText("");
    await expect(heading(page)).toBeFocused();
    expect(
      await band(page).evaluate(
        (element) => getComputedStyle(element).position,
      ),
    ).toBe("fixed");
    await bandButton(page, "Stop the PCA").click();
    await workersListening(page);
  });

  for (const width of [1280, 320]) {
    for (const focus of ["page", "slider"] as const) {
      test(`NU5 D3 at ${String(width)} px an error of the application with the page scrolled down and the focus ${focus === "slider" ? "on the slider of the missing genotypes, which the jump leaves out of the window" : "on the page"}: the page is scrolled at once to the band's top, its error line, Details and Close in the window, and the focus ${focus === "slider" ? "on the heading Popnei, in the window" : "where it was"}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 600 });
        await page.goto("popgen2.html");
        await pick(page, "panel.nei");
        await expect(variantsBox(page)).toContainText("Variants: 1,200", {
          timeout: RESULT_TIMEOUT,
        });
        if (focus === "slider") {
          await missingSlider(page).focus();
          await missingSlider(page).evaluate((element) => {
            element.scrollIntoView({ block: "center" });
          });
        } else {
          await page.evaluate(() => {
            (document.activeElement as HTMLElement | null)?.blur();
            window.scrollTo(0, document.documentElement.scrollHeight);
          });
        }
        expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);

        await page.evaluate(() => {
          setTimeout(() => {
            throw new Error("test");
          });
        });

        const alert = band(page).getByRole("alert");
        await expect(alert).toHaveText(ERROR_TEXT);
        const top = await band(page).evaluate(
          (element) => element.getBoundingClientRect().top,
        );
        expect(top).toBeGreaterThanOrEqual(0);
        await expect(alert).toBeInViewport({ ratio: 1 });
        await expect(bandButton(page, "Details")).toBeInViewport({ ratio: 1 });
        await expect(bandButton(page, "Close")).toBeInViewport({ ratio: 1 });
        if (focus === "slider") {
          await expect(missingSlider(page)).not.toBeInViewport({ ratio: 1 });
          await expect(heading(page)).toBeFocused();
          await expect(heading(page)).toBeInViewport({ ratio: 1 });
        } else {
          expect(
            await page.evaluate(() => document.activeElement === document.body),
          ).toBe(true);
        }
      });
    }
  }

  test("NU5 D3 an error of the application with the dialog of the download open on a page scrolled down: the page does not jump and the focus stays in the dialog; Escape, and the band is brought into view, the focus on a control in the window", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto("popgen2.html");
    await pick(page, "panel.nei");
    await expect(variantsBox(page)).toContainText("Variants: 1,200", {
      timeout: RESULT_TIMEOUT,
    });
    const download = page
      .getByRole("region", { name: "Statistics of the file" })
      .getByRole("button", {
        name: "Download filtered variants…",
        exact: true,
      });
    await download.evaluate((element) => {
      element.scrollIntoView({ block: "end" });
    });
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled).toBeGreaterThan(0);
    await download.click();
    const dialog = page.getByRole("dialog", {
      name: "Download filtered variants",
    });
    await expect(dialog).toBeVisible();

    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error("test");
      });
    });

    await expect(band(page).getByRole("alert")).toHaveText(ERROR_TEXT);
    // Two frames, in which a jump would have been made.
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(resolve));
        }),
    );
    expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
    expect(
      await dialog.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect
      .poll(() =>
        band(page).evaluate((element) => element.getBoundingClientRect().top),
      )
      .toBeGreaterThanOrEqual(0);
    await expect(band(page).getByRole("alert")).toBeInViewport({ ratio: 1 });
    await expect(page.locator(":focus")).toBeInViewport({ ratio: 1 });
    await expect(heading(page)).toBeFocused();
  });

  for (const running of [true, false]) {
    test(`NU5 D3 the page scrolled to its end${running ? " with a PCA held running" : ", nothing running"}: the band at the top of the window, and each control the Tab key reaches back to the top below the band`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 1280, height: 600 });
      await holdSummary(page, { holdPca: true });
      await page.goto("popgen2.html");
      await openHeldPassDone(page);
      if (running) {
        await runPca(page);
        await expect
          .poll(() => lineText(page))
          .toMatch(/^Popnei PCA running · 0:\d\d$/u);
      }
      await tab(page, "Variants").click();
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      const bandBox = await band(page).boundingBox();
      expect(bandBox?.y).toBe(0);
      expect(await lineText(page)).toMatch(
        running ? /^Popnei PCA running/u : /^Popnei$/u,
      );

      // From the end of the page, Shift+Tab back to the band.
      await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
      });
      const seen: string[] = [];
      for (let presses = 0; presses < 200; presses += 1) {
        await page.keyboard.press("Shift+Tab");
        const where = await page.evaluate(() => {
          const focused = document.activeElement;
          const header = document.querySelector("#defects header");
          if (focused === null || focused === document.body || header === null)
            return null;
          const rect = focused.getBoundingClientRect();
          return {
            inBand: header.contains(focused),
            top: rect.top,
            bandBottom: header.getBoundingClientRect().bottom,
            name:
              focused.getAttribute("aria-label") ??
              focused.textContent.slice(0, 40),
          };
        });
        if (where === null) continue;
        if (where.inBand) break;
        seen.push(where.name);
        expect(
          where.top,
          `${where.name} under the band`,
        ).toBeGreaterThanOrEqual(where.bandBottom - 1);
      }
      // With a PCA running the controls it reads are greyed, and fewer
      // are reached.
      expect(seen.length).toBeGreaterThan(running ? 3 : 10);
      if (running) await bandButton(page, "Stop the PCA").click();
      await workersListening(page);
    });
  }

  test("NU5 D3 a button half under the band pressed with the mouse below the band does what it says: the page does not scroll under the pointer", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto("popgen2.html");
    await pick(page, "panel.nei");
    await expect(variantsBox(page)).toContainText("Variants: 1,200", {
      timeout: RESULT_TIMEOUT,
    });
    const open = page.getByRole("button", {
      name: "Open another variants file…",
    });
    const bandBottom = (await band(page).boundingBox())?.height ?? 0;
    expect(bandBottom).toBe(51);
    // The button's top at 47 px of the window, under the band's 51, and
    // the focus elsewhere, as after the file was picked it is on it.
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur();
    });
    await page.evaluate(
      ([top]) => {
        const button = [...document.querySelectorAll("button")].find(
          (b) => b.textContent === "Open another variants file…",
        );
        if (button === undefined) throw new Error("no button");
        window.scrollBy(0, button.getBoundingClientRect().top - top);
      },
      [47] as const,
    );
    const box = await open.boundingBox();
    expect(Math.round(box?.y ?? 0)).toBe(47);

    const before = await page.evaluate(() => window.scrollY);
    const chooser = page.waitForEvent("filechooser", { timeout: 5000 });
    await page.mouse.click((box?.x ?? 0) + 20, 53);
    await chooser;
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test("NU5 D3 printed, the band is at the top of the first page alone, in the flow of the page, with no room kept above it", async ({
    page,
  }) => {
    await page.goto("popgen2.html");
    await expect.poll(() => lineText(page)).toBe("Popnei");
    await page.emulateMedia({ media: "print" });
    expect(
      await page.evaluate(() => {
        const header = document.querySelector("#defects header");
        return header === null
          ? null
          : [
              getComputedStyle(header).position,
              getComputedStyle(document.body).paddingBlockStart,
            ];
      }),
    ).toEqual(["static", "0px"]);
  });

  test("NU5 D3 the dialog of the download open and an error thrown: the band's alert says it, and is not inert", async ({
    page,
  }) => {
    await page.goto("popgen2.html");
    await pick(page, "panel.nei");
    await expect(variantsBox(page)).toContainText("Variants: 1,200", {
      timeout: RESULT_TIMEOUT,
    });
    await page
      .getByRole("region", { name: "Statistics of the file" })
      .getByRole("button", { name: "Download filtered variants…", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Download filtered variants" }),
    ).toBeVisible();

    await page.evaluate(() => {
      setTimeout(() => {
        throw new Error("test");
      });
    });

    const alert = page.locator("#defects [role='alert']");
    await expect(alert).toHaveText(ERROR_TEXT);
    expect(
      await alert.evaluate(
        (element) => element.closest("[inert], [aria-hidden='true']") === null,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("alert").filter({ hasText: ERROR_TEXT }),
    ).toHaveCount(1);
  });

  test("NU5 D3 at 320 px with the text twice its size and the page scrolled down, the PCA live started by a threshold and ended: the band grows and shrinks, and what the user reads stays where it was, within 2 px, at every frame (the second review of package 4, 12 October 2026)", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 320, height: 700 });
    await holdSummary(page, { holdPca: true });
    await page.goto("popgen2.html");
    await openHeldPassDone(page);
    await runPca(page);
    await release(page, "pca");
    await expect(caption(page)).toBeAttached({ timeout: RESULT_TIMEOUT });
    await tab(page, "Variants").click();
    await expect.poll(() => lineText(page)).toBe("Popnei");
    // Chromium sets the browser's size of text, as its setting does;
    // WebKit has no such call, and the closest is the page's own text
    // at 200%.
    if (testInfo.project.name === "chromium") {
      const session = await page.context().newCDPSession(page);
      await session.send("Page.setFontSizes", {
        fontSizes: { standard: 32, fixed: 26 },
      });
    } else {
      await page.addStyleTag({ content: "html { font-size: 200%; }" });
    }
    await expect
      .poll(() =>
        page.evaluate(
          () => getComputedStyle(document.documentElement).fontSize,
        ),
      )
      .toBe("32px");
    // A threshold typed and not yet given, then the page scrolled down
    // to the heading of the statistics of the file, in the middle of the
    // window.
    const box = page
      .getByRole("region", { name: "Statistics of the file" })
      .getByRole("group", {
        name: "Proportion of missing genotypes",
        exact: true,
      })
      .getByRole("textbox");
    await box.fill("0.05");
    const read = page
      .getByRole("region", { name: "Statistics of the file" })
      .getByRole("heading")
      .first();
    await read.evaluate((element) => {
      window.scrollTo(
        0,
        element.getBoundingClientRect().top + window.scrollY - 350,
      );
    });
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    // The top of that heading and the band's height, at every frame.
    await read.evaluate((element) => {
      const header = document.querySelector("#defects header");
      const frames: { top: number; band: number }[] = [];
      Reflect.set(window, "readTops", frames);
      const look = (): void => {
        frames.push({
          top: element.getBoundingClientRect().top,
          band: header?.getBoundingClientRect().height ?? 0,
        });
        requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    });
    await expect
      .poll(() =>
        page.evaluate(
          () => (Reflect.get(window, "readTops") as unknown[]).length,
        ),
      )
      .toBeGreaterThan(2);
    // Given with the key alone, which scrolls nothing.
    await page.keyboard.press("Enter");
    await expect
      .poll(() => lineText(page), { timeout: RESULT_TIMEOUT })
      .not.toBe("Popnei");
    await expect
      .poll(() => lineText(page), { timeout: RESULT_TIMEOUT })
      .toBe("Popnei");
    // A few frames more, after the band's last change.
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          });
        }),
    );
    const frames = await page.evaluate(
      () => Reflect.get(window, "readTops") as { top: number; band: number }[],
    );
    const first = frames[0]?.top ?? 0;
    const bands = new Set(frames.map((frame) => Math.round(frame.band)));
    const moved = Math.max(
      ...frames.map((frame) => Math.abs(frame.top - first)),
    );
    process.stdout.write(
      `scrolled at 320 px, text 32 px: band heights ${[...bands].join(", ")}; the heading moved at most ${moved.toFixed(1)} px over ${String(frames.length)} frames\n`,
    );
    // The band changed its height, and the heading did not move.
    expect(bands.size).toBeGreaterThan(1);
    expect(moved).toBeLessThanOrEqual(2);
    await workersListening(page);
  });

  for (const width of [720, 1280]) {
    test(`NU5 D3 at ${String(width)} px the one pass of a file with a name of 74 characters: the band one row, as tall as with Popnei alone, the name cut with "…" and the percentage whole, the whole name for a screen reader (the second review of package 4, 12 October 2026)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 800 });
      await holdSummary(page);
      await page.goto("popgen2.html");
      await expect.poll(() => lineText(page)).toBe("Popnei");
      const alone = (await band(page).boundingBox())?.height;
      const chooser = page.waitForEvent("filechooser");
      await page
        .getByRole("button", { name: /^Open (another )?variants file…$/u })
        .click();
      await (
        await chooser
      ).setFiles({
        name: LONG_NAME,
        mimeType: "application/octet-stream",
        buffer: readFileSync(join(FIXTURES, "panel.nei")),
      });
      await release(page, "oneSoFar");
      await expect
        .poll(() => lineText(page))
        .toMatch(/^Popnei Statistics of Solanum.* · \d+% Stop$/u);
      const fit = await heading(page).evaluate((h1, name) => {
        const line = h1.parentElement;
        const words = h1.nextElementSibling;
        if (line === null || !(words instanceof HTMLElement)) return null;
        const wordsBox = words.getBoundingClientRect();
        // The text node that holds the share, and the one that holds
        // the name, which may be the same.
        const walker = document.createTreeWalker(words, NodeFilter.SHOW_TEXT);
        let share: Range | null = null;
        let nameElement: HTMLElement | null = null;
        for (
          let node = walker.nextNode();
          node !== null;
          node = walker.nextNode()
        ) {
          const text = node.textContent ?? "";
          const dot = text.lastIndexOf("·");
          if (dot >= 0) {
            share = document.createRange();
            share.setStart(node, dot);
            share.setEnd(node, text.length);
          }
          if (text.includes(name)) nameElement = node.parentElement;
        }
        if (share === null || nameElement === null) return null;
        const shareBox = share.getBoundingClientRect();
        return {
          shareWhole:
            shareBox.left >= wordsBox.left - 0.5 &&
            shareBox.right <= wordsBox.right + 0.5,
          nameCut: nameElement.scrollWidth > nameElement.clientWidth,
          wordsInLine:
            wordsBox.right <= line.getBoundingClientRect().right + 0.5,
        };
      }, LONG_NAME);
      expect(fit).toEqual({
        shareWhole: true,
        nameCut: true,
        wordsInLine: true,
      });
      expect((await band(page).boundingBox())?.height).toBe(alone);
      expect(await band(page).ariaSnapshot()).toContain(
        `Statistics of ${LONG_NAME}`,
      );
      await release(page, "allSoFar");
      await release(page, "result");
      await workersListening(page);
    });
  }

  for (const width of [1280, 320]) {
    test(`NU5 D3 at ${String(width)} px the band's height is the same with Popnei alone, with a line and with a Stop, and the boxes stay; ${width === 320 ? "each short form with its button on one line, no sideways scroll, " : ""}the whole words for a screen reader, and the one h1 in the band`, async ({
      page,
      makeAxeBuilder,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: 800 });
      await holdSummary(page, { holdPca: true });
      await recordBand(page);
      await page.goto("popgen2.html");
      await expect.poll(() => lineText(page)).toBe("Popnei");
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(heading(page)).toBeVisible();

      await pick(page, "panel.nei");
      await expect
        .poll(() => lineText(page))
        .toMatch(
          width === 320
            ? /^Popnei Statistics · \d+% Stop$/u
            : /^Popnei Statistics of panel\.nei · \d+% Stop$/u,
        );
      expect(await band(page).ariaSnapshot()).toContain(
        "Statistics of panel.nei",
      );
      await release(page, "allSoFar");
      await release(page, "result");
      await runPca(page);
      // The PCA tab shown: the words, without the Stop the tab shows.
      await expect
        .poll(() => lineText(page))
        .toMatch(
          width === 320
            ? /^Popnei PCA · 0:\d\d$/u
            : /^Popnei PCA running · 0:\d\d$/u,
        );
      await tab(page, "Variants").click();
      await expect
        .poll(() => lineText(page))
        .toMatch(
          width === 320
            ? /^Popnei PCA · 0:\d\d Stop$/u
            : /^Popnei PCA running · 0:\d\d Stop$/u,
        );
      expect(await band(page).ariaSnapshot()).toContain("PCA running");
      await expectAxeBothSchemes(page, makeAxeBuilder);
      await bandButton(page, "Stop the PCA").click();
      await expect
        .poll(() => lineText(page), { timeout: 15_000 })
        .toBe("Popnei");
      await tab(page, "PCA").click();
      await run(page).click();
      await expect
        .poll(() => lineText(page))
        .toMatch(/^Popnei PCA( running)? · 0:\d\d$/u);
      await release(page, "pca");
      await expect(caption(page)).toBeAttached({ timeout: RESULT_TIMEOUT });
      await expect.poll(() => lineText(page)).toBe("Popnei");
      // About to start, held by the thumb of the PCA's MAF pressed and
      // not moved, a change under way that shows nothing of its own.
      const missing = shown(page).getByRole("slider", {
        name: "Maximum proportion of missing genotypes for the PCA",
      });
      await missing.focus();
      await missing.press("ArrowLeft");
      const thumb = shown(page)
        .getByRole("slider", {
          name: "Maximum major allele frequency for the PCA",
        })
        .locator("xpath=../..");
      await thumb.scrollIntoViewIfNeeded();
      const box = await thumb.boundingBox();
      if (box === null) throw new Error("no thumb");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // In the PCA tab, the words without the tab's Stop recalculating.
      await expect
        .poll(() => lineText(page))
        .toBe(
          width === 320
            ? "Popnei PCA soon"
            : "Popnei The PCA starts in a moment",
        );
      await expectAxeBothSchemes(page, makeAxeBuilder);
      await page.mouse.up();
      await expect
        .poll(() => lineText(page), { timeout: RESULT_TIMEOUT })
        .toBe("Popnei");
      // About to start with the Variants tab shown, held by the thumb of
      // its major allele frequency pressed, which the PCA follows, its
      // own missing data now stricter than the tab's: the words with the
      // whole Stop recalculating, which fits the line, the words not cut.
      await tab(page, "Variants").click();
      const maf = page
        .getByRole("region", { name: "Statistics of the file" })
        .getByRole("group", { name: "Major allele frequency", exact: true })
        .getByRole("slider");
      await maf.focus();
      await maf.press("ArrowLeft");
      const variantsThumb = maf.locator("xpath=../..");
      await variantsThumb.scrollIntoViewIfNeeded();
      const thumbBox = await variantsThumb.boundingBox();
      if (thumbBox === null) throw new Error("no thumb");
      await page.mouse.move(
        thumbBox.x + thumbBox.width / 2,
        thumbBox.y + thumbBox.height / 2,
      );
      await page.mouse.down();
      await expect
        .poll(() => lineText(page))
        .toBe(
          width === 320
            ? "Popnei PCA soon Stop recalculating"
            : "Popnei The PCA starts in a moment Stop recalculating",
        );
      const fit = await heading(page).evaluate((h1) => {
        const line = h1.parentElement;
        const words = h1.nextElementSibling;
        const button = line?.querySelector("button");
        if (
          line === null ||
          !(words instanceof HTMLElement) ||
          button === null ||
          button === undefined
        ) {
          return null;
        }
        const lineBox = line.getBoundingClientRect();
        const wordsBox = words.getBoundingClientRect();
        const buttonBox = button.getBoundingClientRect();
        return {
          wordsCut: words.scrollWidth > words.clientWidth,
          buttonInLine: buttonBox.right <= lineBox.right + 0.5,
          buttonOneLine: buttonBox.height < 2 * 14 * 1.5,
          // From the end of the words' margin, which takes back the
          // padding that holds the ring of the focus of a link.
          gap: Math.round(
            buttonBox.left -
              wordsBox.right -
              parseFloat(getComputedStyle(words).marginInlineEnd),
          ),
        };
      });
      expect(fit).toEqual({
        wordsCut: false,
        buttonInLine: true,
        buttonOneLine: true,
        // The control 1 rem after its words at 1280 px, a quarter of a rem
        // under 45 rem.
        gap: width === 320 ? 4 : 16,
      });
      await page.mouse.up();
      await expect
        .poll(() => lineText(page), { timeout: RESULT_TIMEOUT })
        .toBe("Popnei");
      // The link: the PCoA with the LD pruning off, calculated again by
      // itself, has 2 warnings, which the Variants tab links to.
      await tab(page, "PCA").click();
      await shown(page)
        .getByRole("button", { name: /Method$/u })
        .click();
      await page.getByRole("option", { name: /^PCoA of the Kosman/u }).click();
      await shown(page)
        .locator("label")
        .filter({
          hasText: "Prune the variants by linkage disequilibrium (LD)",
        })
        .click();
      await expect(
        shown(page).getByRole("heading", { level: 3, name: "2 warnings" }),
      ).toBeVisible({ timeout: RESULT_TIMEOUT });
      await tab(page, "Variants").click();
      await expect
        .poll(() => lineText(page))
        .toBe(
          width === 320
            ? "Popnei PCoA: 2 warnings"
            : "Popnei PCoA: 2 warnings, in the PCA tab",
        );

      const states = await bandStates(page);
      const heights = new Set(states.map((state) => state.height));
      const boxTops = new Set(
        states
          .map((state) => state.boxTop)
          .filter((top): top is number => top !== null),
      );
      process.stdout.write(
        `band ${String(width)} px: heights ${[...heights].join(", ")}; box tops ${[...boxTops].join(", ")}; ${String(states.length)} states: ${states.map((state) => state.text).join(" | ")}\n`,
      );
      expect([...heights]).toHaveLength(1);
      expect([...boxTops]).toHaveLength(1);
      expect(
        states.map((state) => state.text).filter((text) => text !== "Popnei")
          .length,
      ).toBeGreaterThan(4);
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      ).toBe(true);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await workersListening(page);
    });
  }
});
