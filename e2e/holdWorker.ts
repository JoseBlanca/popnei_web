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
 *
 * A release sent before the worker's script has made its channel would
 * be lost, as right after a file is picked, while the page makes the
 * worker again: so the worker says "listening" on the channel once it
 * listens, a script of the page counts those words and the calculation
 * workers the page makes, and `release` waits until every worker made
 * has said it.
 */
import type { Page } from "@playwright/test";

/** The name of the channel the page releases the messages on. */
const CHANNEL = "e2e-hold";

/** What a release lets through: the results so far held, one or all, and
    those after them for `all`; the final results, all and those after
    them; or the next final result alone, the one held or else the next
    to come, after which the others are held again. */
export type Release = "oneSoFar" | "allSoFar" | "result" | "oneResult";

/** What a worker says on the channel once it listens. */
const LISTENING = "listening";

/** What the page records, on `window`, of the calculation workers: how
    many it made and how many said they listen. */
const COUNTS = "__e2eHold";

/** The script of the page that counts the calculation workers made, by
    the name of their script, and those that listen. */
function countWorkers([channelName, listening, counts]: readonly [
  string,
  string,
  string,
]): void {
  const record = { made: 0, listening: 0 };
  Object.defineProperty(window, counts, { value: record });
  const channel = new BroadcastChannel(channelName);
  channel.onmessage = (event) => {
    if (event.data === listening) record.listening += 1;
  };
  const RealWorker = window.Worker;
  window.Worker = class extends RealWorker {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      if (/runnerWorker-[^/]*\.js$/u.test(String(url))) record.made += 1;
    }
  };
}

const FRONT = `{
  const realNow = performance.now.bind(performance);
  performance.now = () => realNow() * 1e6;
  const realPost = self.postMessage.bind(self);
  const held = { soFar: [], result: [] };
  const holding = { soFar: true, result: true };
  let resultsToPass = 0;
  const ofSummary = (m) =>
    m !== null && typeof m === "object" && m.result !== null &&
    typeof m.result === "object" && m.result.analysis === "variantsSummary";
  const channel = new BroadcastChannel(${JSON.stringify(CHANNEL)});
  channel.onmessage = (event) => {
    const release = event.data;
    if (release === "oneSoFar") {
      const first = held.soFar.shift();
      if (first !== undefined) realPost(first[0], first[1]);
      return;
    }
    if (release === "oneResult") {
      const first = held.result.shift();
      if (first !== undefined) realPost(first[0], first[1]);
      else resultsToPass += 1;
      return;
    }
    const kind = release === "allSoFar" ? "soFar" : "result";
    holding[kind] = false;
    for (const [m, t] of held[kind].splice(0)) realPost(m, t);
  };
  channel.postMessage(${JSON.stringify(LISTENING)});
  self.postMessage = (m, t) => {
    if (ofSummary(m) && m.kind === "result" && holding.result && resultsToPass > 0) {
      resultsToPass -= 1;
      realPost(m, t);
      return;
    }
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
  await page.addInitScript(countWorkers, [CHANNEL, LISTENING, COUNTS] as const);
  await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
    const response = await route.fetch();
    const script = await response.text();
    await route.fulfill({ response, body: FRONT + script });
  });
}

/** Lets the worker of the page post what `what` names of what it held. */
export async function release(page: Page, what: Release): Promise<void> {
  await page.waitForFunction((counts) => {
    const record = (
      window as unknown as Record<
        string,
        { readonly made: number; readonly listening: number } | undefined
      >
    )[counts];
    return (
      record !== undefined && record.made > 0 && record.listening >= record.made
    );
  }, COUNTS);
  await page.evaluate(
    ([channel, message]) => {
      const sent = new BroadcastChannel(channel);
      sent.postMessage(message);
      sent.close();
    },
    [CHANNEL, what] as const,
  );
}
