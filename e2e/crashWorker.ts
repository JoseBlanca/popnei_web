/**
 * A crash of the calculation worker, for the flows and the screens of
 * popgen2.html: what a trap of the wasm, or a tab out of memory, does to
 * the worker, which no file of the tests can make it do.
 */
import type { Page } from "@playwright/test";

/** Makes the calculation worker stop on the message of the kind `kind`,
    "open" or "run", as a crash of the wasm would: its script is served
    with a listener in front of the runner's, which keeps that message
    from the runner and throws outside any handler of it. */
export async function crashWorkerOn(
  page: Page,
  kind: "open" | "run",
): Promise<void> {
  await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
    const response = await route.fetch();
    const script = await response.text();
    const front = `self.addEventListener("message", (event) => { if (event.data !== null && typeof event.data === "object" && event.data.kind === ${JSON.stringify(kind)}) { event.stopImmediatePropagation(); setTimeout(() => { throw new Error("a crash of the test"); }, 0); } });\n`;
    await route.fulfill({ response, body: front + script });
  });
}
