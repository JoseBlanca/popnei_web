/**
 * A crash of the calculation worker, for the flows and the screens of
 * popgen2.html: what a trap of the wasm, or a tab out of memory, does to
 * the worker, which no file of the tests can make it do.
 */
import type { Page } from "@playwright/test";

/** Makes the calculation worker stop on the message of the kind `kind`,
    "open" or "run", and for a run only that of the analysis `analysis`
    when it is given, as a crash of the wasm would: its script is served
    with a listener in front of the runner's, which keeps that message
    from the runner and throws outside any handler of it. With `once`,
    only the first worker the page makes is served so, and the one the
    page makes after the crash is the real one. */
export async function crashWorkerOn(
  page: Page,
  kind: "open" | "run",
  analysis: string | null = null,
  once = false,
): Promise<void> {
  const ofAnalysis =
    analysis === null
      ? ""
      : ` && event.data.job !== null && typeof event.data.job === "object" && event.data.job.analysis === ${JSON.stringify(analysis)}`;
  let served = 0;
  await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
    const response = await route.fetch();
    served += 1;
    if (once && served > 1) {
      await route.fulfill({ response });
      return;
    }
    const script = await response.text();
    const front = `self.addEventListener("message", (event) => { if (event.data !== null && typeof event.data === "object" && event.data.kind === ${JSON.stringify(kind)}${ofAnalysis}) { event.stopImmediatePropagation(); setTimeout(() => { throw new Error("a crash of the test"); }, 0); } });\n`;
    await route.fulfill({ response, body: front + script });
  });
}
