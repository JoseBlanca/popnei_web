/**
 * The results so far of the summary of the variants file held on the
 * screen for as long as a flow or a screen needs them, for popgen2.html.
 * Without it the state "so far" lasts from popnei's first result so far,
 * 2 seconds of its clock into the pass, to the final result, 770 to 880
 * ms on the owner's Mac for the VCF of 200,000 variants, which a check
 * with axe can outlast; with a pass 22% shorter FS2 failed 3 runs of 6.
 *
 * The calculation worker's script is served with a few lines in front of
 * it, as crashWorker.ts serves it, and no code of the application
 * changes: popnei's clock, `performance.now`, runs a million times
 * faster in the worker, so that popnei, which reads it at the start of
 * each pass, gives a result so far after every block of the file; and
 * the worker's `postMessage` keeps back its results so far and the final
 * result of the summary until the page releases them, by a message on
 * the BroadcastChannel "e2e-hold", which `release` sends. Each worker the
 * page makes is served so, a worker made after a Stop with nothing held.
 */
import type { Page } from "@playwright/test";

/** The name of the channel the page releases the messages on. */
const CHANNEL = "e2e-hold";

/** What a release lets through: the results so far held, one or all, and
    those after them for `all`; or the final result. */
export type Release = "oneSoFar" | "allSoFar" | "result";

const FRONT = `{
  const realNow = performance.now.bind(performance);
  performance.now = () => realNow() * 1e6;
  const realPost = self.postMessage.bind(self);
  const held = { soFar: [], result: [] };
  const holding = { soFar: true, result: true };
  const ofSummary = (m) =>
    m !== null && typeof m === "object" && m.result !== null &&
    typeof m.result === "object" && m.result.analysis === "variantsSummary";
  new BroadcastChannel(${JSON.stringify(CHANNEL)}).onmessage = (event) => {
    const release = event.data;
    if (release === "oneSoFar") {
      const first = held.soFar.shift();
      if (first !== undefined) realPost(first[0], first[1]);
      return;
    }
    const kind = release === "allSoFar" ? "soFar" : "result";
    holding[kind] = false;
    for (const [m, t] of held[kind].splice(0)) realPost(m, t);
  };
  self.postMessage = (m, t) => {
    if (ofSummary(m) && (m.kind === "soFar" || m.kind === "result") && holding[m.kind]) {
      held[m.kind].push([m, t]);
      return;
    }
    realPost(m, t);
  };
}
`;

/** Serves every calculation worker of the page with the results of the
    summary held; to call before the page is opened. */
export async function holdSummary(page: Page): Promise<void> {
  await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
    const response = await route.fetch();
    const script = await response.text();
    await route.fulfill({ response, body: FRONT + script });
  });
}

/** Lets the worker of the page post what `what` names of what it held. */
export async function release(page: Page, what: Release): Promise<void> {
  await page.evaluate(
    ([channel, message]) => {
      const sent = new BroadcastChannel(channel);
      sent.postMessage(message);
      sent.close();
    },
    [CHANNEL, what] as const,
  );
}
