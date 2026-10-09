/**
 * What the page e2e/allows.html gives the measurement of `columnAllows`
 * (e2e/measure.spec.ts, IP5 D4), as `window.allowsPage`: the time of
 * `columnAllows` alone, on the thread of the page, which the time the page
 * is frozen by a read holds with the rest of the drawing
 * (docs/specs/core/project.md, "How it runs").
 */

/** The page's side of the measurement. */
export interface AllowsPage {
  /**
   * Makes the table of the CSV `text` as the light worker would, not timed,
   * and times `columnAllows` on its table `repeats` times, each on a copy
   * of the table, which it has not kept an answer for; the times in
   * milliseconds, by `performance.now`.
   */
  readonly time: (text: string, repeats: number) => readonly number[];
}

declare global {
  interface Window {
    /** Set by the script of e2e/allows.html once it has run. */
    allowsPage?: AllowsPage;
  }
}
