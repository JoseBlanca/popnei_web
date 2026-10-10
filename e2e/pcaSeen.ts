/**
 * What the PCA tab of popgen2.html showed, read at every animation frame
 * from a moment the flow chooses, drawn or hidden behind another tab:
 * once the PCA is live, a change takes the result off and shows the line
 * of the quiet second until the bar of the next run, and never Run nor
 * the result left behind meanwhile (docs/specs/steps/popgen2-pca.md,
 * "About to start", and "How it is checked", the bullet "Live").
 */
import type { Page } from "@playwright/test";

/** Watches the PCA tab every animation frame from now on, drawn or
    hidden: the frames that show its Run; whether its result went and a
    bar of the PCA was seen after; and the frames that show a result
    after it went and before that bar, for `pcaTabSeen`. */
export async function watchPcaTab(page: Page): Promise<void> {
  await page.evaluate(() => {
    const seen = { run: 0, gone: false, bar: false, resultBeforeBar: 0 };
    Reflect.set(window, "popneiPcaSeen", seen);
    const look = (): void => {
      const heading = [...document.querySelectorAll("section h2")].find(
        (h) => h.textContent === "PCA" || h.textContent === "PCoA",
      );
      const section = heading?.closest("section");
      if (section !== null && section !== undefined) {
        const buttons = [...section.querySelectorAll("button")];
        if (buttons.some((b) => b.textContent === "Run")) seen.run += 1;
        const result = section.textContent.includes(
          "The place of each of the 200",
        );
        if (!result) seen.gone = true;
        if (seen.gone && section.querySelector('[role="progressbar"]')) {
          seen.bar = true;
        }
        if (seen.gone && !seen.bar && result) seen.resultBeforeBar += 1;
      }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
}

/** What `watchPcaTab` saw: the frames with Run, and those with a result
    before the bar. */
export async function pcaTabSeen(page: Page): Promise<{
  readonly run: number;
  readonly gone: boolean;
  readonly bar: boolean;
  readonly resultBeforeBar: number;
}> {
  return page.evaluate(() => {
    const seen = Reflect.get(window, "popneiPcaSeen") as {
      run: number;
      gone: boolean;
      bar: boolean;
      resultBeforeBar: number;
    };
    return { ...seen };
  });
}
