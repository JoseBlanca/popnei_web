/**
 * What the status region of popgen2.html says of the PCA started again
 * by itself and of its Stop (docs/specs/steps/popgen2-pca.md, "Running",
 * "Stop" and "Accessibility"), told by the analyses started by
 * themselves, over the store of the page with a fake worker.
 */
import { describe, expect, test, vi } from "vitest";

import {
  diversityOnPopgen2,
  diversityOptions,
} from "../../core/analyses/diversity.ts";
import { pcaOnPopgen2, pcaOptions } from "../../core/analyses/pca.ts";
import { setAnalysisOptions } from "../../core/project.ts";
import { noPopDiversity, summaryResult } from "../../core/testSupport.ts";
import type { JobResult, Outcome, Run } from "../../worker/protocol.ts";
import { statusOf } from "../analyses/status.ts";
import type { LiveEvent } from "../autoRuns.ts";
import { createPopgen2Store, openVariantsFile } from "../popgen2Store.ts";
import type { Popgen2PageStore } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { ANNOUNCE_DELAY_MS, createAnnouncer } from "../shell/status.ts";
import type { Announcer } from "../shell/status.ts";
import { announceChanges, announceLive } from "./announceChanges.ts";

/** A result of the PCA of `s000` and `s001`. */
function pcaResult(): JobResult {
  return {
    analysis: "pca",
    method: "pca",
    individuals: ["s000", "s001"],
    numComps: 1,
    numCompsFound: 1,
    projections: Float64Array.from([1, -1]),
    explainedVariancePercent: Float64Array.from([100]),
    numVarsUsed: 548,
    lingoesConstant: null,
    negativeEigenvaluesPercent: null,
    passStats: { numVars: 548, filtering: {} },
  };
}

/** A result of the diversity of the one population of `s000` and
    `s001`. */
function diversityResult(): JobResult {
  return {
    analysis: "diversity",
    pops: ["Unclassified"],
    numIndividuals: Uint32Array.from([2]),
    unbiasedExpHet: Float64Array.from([0.3]),
    obsHet: Float64Array.from([0.3]),
    polyRatio: Float64Array.from([0.9]),
    numVarsWithValue: Uint32Array.from([548]),
    ...noPopDiversity(1),
    passStats: { numVars: 548, filtering: {} },
  };
}

/** An announcer that keeps what it was given. */
function recorder(): {
  readonly said: string[];
  readonly announcer: Announcer;
} {
  const said: string[] = [];
  return {
    said,
    announcer: {
      announce: (text) => {
        said.push(text);
      },
      announceChange: (change) => {
        const text = change();
        if (text !== null) said.push(text);
      },
      clear: () => undefined,
      getState: () => said.at(-1) ?? "",
      subscribe: () => () => undefined,
    },
  };
}

/** As `setUp`, with `panel.nei` read, its one pass done and the LD
    distance typed, so that the PCA is ready and its Run enabled; and
    `endLast`, which ends the last request with `outcome`, or its result
    when it is a function of the key. */
async function setUpReady(announcer?: Announcer): Promise<
  ReturnType<typeof setUp> & {
    readonly endLast: (outcome: (key: string) => Outcome<JobResult>) => void;
  }
> {
  const ends: ((outcome: Outcome<JobResult>) => void)[] = [];
  const keys: string[] = [];
  const page = setUp(
    (key) => ({
      id: keys.length + 1,
      outcome: new Promise<Outcome<JobResult>>((resolve) => {
        keys.push(key);
        ends.push(resolve);
      }),
      cancel: () => undefined,
    }),
    announcer,
  );
  page.store.variantsRead("a".repeat(32), {
    kind: "read",
    individuals: ["s000", "s001"],
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
  page.store.apply("the LD distance changed", (p) =>
    setAnalysisOptions(p, pcaOnPopgen2, {
      ...pcaOptions(p, "popgen2"),
      ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50_000 },
    }),
  );
  // The diversity of the two individuals as one population, with a
  // minimum and a draw they meet, so that its Run is enabled.
  page.store.apply("the options of the diversity changed", (p) =>
    setAnalysisOptions(p, diversityOnPopgen2, {
      ...diversityOptions(p),
      minNumIndividuals: 2,
      numCalledAlleles: 4,
    }),
  );
  const pass = startAnalysis(page.store, "variantsSummary");
  const [end, key] = [ends[0], keys[0]];
  if (pass === null || end === undefined || key === undefined) {
    throw new Error("the one pass did not start");
  }
  end({ kind: "done", key, result: summaryResult(["1"], [1200]) });
  await pass;
  expect(statusOf(page.store.getState(), "pca").kind).toBe("ready");
  expect(statusOf(page.store.getState(), "diversity").kind).toBe("ready");
  return {
    ...page,
    endLast: (outcome) => {
      const last = ends.at(-1);
      const lastKey = keys.at(-1);
      if (last === undefined || lastKey === undefined) {
        throw new Error("no request to end");
      }
      last(outcome(lastKey));
    },
  };
}

/** The store of the page with `panel.nei` open, and the events of the
    live analyses the test tells. */
function setUp(
  send: (key: string) => Run<JobResult> = (): Run<JobResult> => ({
    id: 1,
    outcome: new Promise(() => undefined),
    cancel: () => undefined,
  }),
  given?: Announcer,
): {
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly said: string[];
  readonly tell: (event: LiveEvent) => void;
  readonly toPcoa: () => void;
} {
  const store = createPopgen2Store({
    send,
    sendWrite: () => {
      throw new Error("no write here");
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.2.2");
  openVariantsFile(store, {
    fileId: "a".repeat(32),
    name: "panel.nei",
    size: 261_490,
    format: "nei",
    readOptions: null,
  });
  const listeners: ((event: LiveEvent) => void)[] = [];
  const recorded = recorder();
  const said = recorded.said;
  const announcer = given ?? recorded.announcer;
  announceLive(
    store,
    {
      onLive: (listener) => {
        listeners.push(listener);
        return () => undefined;
      },
    },
    announcer,
  );
  return {
    store,
    said,
    tell: (event) => {
      for (const listener of listeners) listener(event);
    },
    toPcoa: () => {
      store.apply("the method changed", (p) =>
        setAnalysisOptions(p, pcaOnPopgen2, {
          ...pcaOptions(p, "popgen2"),
          method: "pcoa",
        }),
      );
    },
  };
}

describe("NU4 D2 the status region says the PCA started by itself and its Stop", () => {
  test("a PCA started by itself that ends within the region's pause is said by its end alone", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const announcer = createAnnouncer();
      const page = await setUpReady(announcer);
      announceChanges(page.store, announcer, () => null);
      const run = startAnalysis(page.store, "pca");
      page.tell({ kind: "startedByItself", id: "pca", round: ["pca"] });
      page.endLast((key) => ({ kind: "done", key, result: pcaResult() }));
      await run;
      await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
      expect(announcer.getState()).toBe("PCA of panel.nei calculated.");
    } finally {
      vi.useRealTimers();
    }
  });

  test("a PCA started by itself that ends after the pause: its start said, then its end", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const announcer = createAnnouncer();
      const page = await setUpReady(announcer);
      announceChanges(page.store, announcer, () => null);
      const run = startAnalysis(page.store, "pca");
      page.tell({ kind: "startedByItself", id: "pca", round: ["pca"] });
      await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
      expect(announcer.getState()).toBe(
        "Calculating the PCA again. To change the filters, stop it in the PCA tab.",
      );
      page.endLast((key) => ({ kind: "done", key, result: pcaResult() }));
      await run;
      await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
      expect(announcer.getState()).toBe("PCA of panel.nei calculated.");
    } finally {
      vi.useRealTimers();
    }
  });

  test("a start by itself is said once, by the method", () => {
    const { said, tell, toPcoa } = setUp();
    tell({ kind: "startedByItself", id: "pca", round: ["pca"] });
    expect(said).toEqual([
      "Calculating the PCA again. To change the filters, stop it in the PCA tab.",
    ]);
    toPcoa();
    tell({ kind: "startedByItself", id: "pca", round: ["pca"] });
    expect(said.at(-1)).toBe(
      "Calculating the PCoA again. To change the filters, stop it in the PCA tab.",
    );
    expect(said).toHaveLength(2);
  });

  test("a Stop that leaves Run disabled, or no Run, is said alone, with nothing to press", () => {
    const { said, tell, toPcoa } = setUp();
    // panel.nei opened and not read: the PCA locked, its Run disabled.
    tell({ kind: "paused", id: "pca" });
    expect(said).toEqual(["PCA stopped."]);
    toPcoa();
    tell({ kind: "paused", id: "pca" });
    expect(said.at(-1)).toBe("PCoA stopped.");
  });

  test("a Stop is said with what to press to calculate it again", async () => {
    const { said, tell, toPcoa } = await setUpReady();
    tell({ kind: "paused", id: "pca" });
    expect(said).toEqual([
      "PCA stopped. Press Run in the PCA tab to calculate it again.",
    ]);
    toPcoa();
    tell({ kind: "paused", id: "pca" });
    expect(said.at(-1)).toBe(
      "PCoA stopped. Press Run in the PCA tab to calculate it again.",
    );
  });
});

describe("PT2 D2 the status region says a round of two analyses once, a Run that waited at its start, and the diversity's start, Stop and end", () => {
  const ROUND =
    "Calculating the PCA and then the diversity again. To change the filters, stop each in its tab; to change the populations, stop the diversity in the Populations tab.";

  test("the first start of a round of the PCA and the diversity names both, once; the diversity's start in the same round says nothing", () => {
    const { said, tell, toPcoa } = setUp();
    tell({ kind: "startedByItself", id: "pca", round: ["pca", "diversity"] });
    tell({ kind: "startedByItself", id: "diversity", round: [] });
    expect(said).toEqual([ROUND]);
    toPcoa();
    tell({ kind: "startedByItself", id: "pca", round: ["pca", "diversity"] });
    expect(said.at(-1)).toBe(
      "Calculating the PCoA and then the diversity again. To change the filters, stop each in its tab; to change the populations, stop the diversity in the Populations tab.",
    );
    expect(said).toHaveLength(2);
  });

  test("the diversity started by itself alone says its own words", () => {
    const { said, tell } = setUp();
    tell({ kind: "startedByItself", id: "diversity", round: ["diversity"] });
    expect(said).toEqual([
      "Calculating the diversity again. To change the filters or the populations, stop it in the Populations tab.",
    ]);
  });

  test("a Run that waited is said at its start, the diversity's and the PCA's", () => {
    const { said, tell, toPcoa } = setUp();
    tell({ kind: "startedAfterWaiting", id: "diversity" });
    tell({ kind: "startedAfterWaiting", id: "pca" });
    toPcoa();
    tell({ kind: "startedAfterWaiting", id: "pca" });
    expect(said).toEqual([
      "Calculating the diversity of panel.nei.",
      "Calculating the PCA of panel.nei.",
      "Calculating the PCoA of panel.nei.",
    ]);
  });

  test("a Stop of the diversity, with Run to press, or alone while Run is not offered", async () => {
    const locked = setUp();
    // panel.nei opened and not read: the diversity locked.
    locked.tell({ kind: "paused", id: "diversity" });
    expect(locked.said).toEqual(["Diversity stopped."]);
    const ready = await setUpReady();
    ready.tell({ kind: "paused", id: "diversity" });
    expect(ready.said).toEqual([
      "Diversity stopped. Press Run in the Populations tab to calculate it again.",
    ]);
  });

  test("Stop all is said once, naming the analyses it stopped, with Run to press in the tabs that offer it", async () => {
    const locked = setUp();
    // panel.nei opened and not read: both locked, no Run to press.
    locked.tell({ kind: "pausedAll", ids: ["pca", "diversity"] });
    expect(locked.said).toEqual([
      "Stopped: the PCA and the diversity no longer start by themselves.",
    ]);
    const ready = await setUpReady();
    ready.tell({ kind: "pausedAll", ids: ["pca", "diversity"] });
    expect(ready.said).toEqual([
      "Stopped: the PCA and the diversity no longer start by themselves. Press Run in their tabs to calculate them again.",
    ]);
  });

  test("Stop all with the PCA's result shown names Run in the Populations tab alone", async () => {
    const page = await setUpReady();
    const run = startAnalysis(page.store, "pca");
    page.endLast((key) => ({ kind: "done", key, result: pcaResult() }));
    await run;
    page.tell({ kind: "pausedAll", ids: ["pca", "diversity"] });
    expect(page.said).toEqual([
      "Stopped: the PCA and the diversity no longer start by themselves. Press Run in the Populations tab to calculate the diversity again.",
    ]);
  });

  test("Stop all that ended one live state is said as that analysis's Stop", async () => {
    const page = await setUpReady();
    page.tell({ kind: "pausedAll", ids: ["diversity"] });
    page.tell({ kind: "pausedAll", ids: ["pca"] });
    expect(page.said).toEqual([
      "Diversity stopped. Press Run in the Populations tab to calculate it again.",
      "PCA stopped. Press Run in the PCA tab to calculate it again.",
    ]);
  });

  test("a PCA that ends within the region's pause does not drop the round's start, which says the diversity starts next", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const announcer = createAnnouncer();
      const page = await setUpReady(announcer);
      announceChanges(page.store, announcer, () => null);
      const run = startAnalysis(page.store, "pca");
      page.tell({
        kind: "startedByItself",
        id: "pca",
        round: ["pca", "diversity"],
      });
      page.endLast((key) => ({ kind: "done", key, result: pcaResult() }));
      await run;
      await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
      expect(announcer.getState()).toBe(
        `${ROUND} PCA of panel.nei calculated.`,
      );
    } finally {
      vi.useRealTimers();
    }
  });

  test("a round whose last analysis ends within the region's pause is said by its ends alone", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const announcer = createAnnouncer();
      const page = await setUpReady(announcer);
      announceChanges(page.store, announcer, () => null);
      const pca = startAnalysis(page.store, "pca");
      page.tell({
        kind: "startedByItself",
        id: "pca",
        round: ["pca", "diversity"],
      });
      page.endLast((key) => ({ kind: "done", key, result: pcaResult() }));
      await pca;
      const diversity = startAnalysis(page.store, "diversity");
      page.tell({ kind: "startedByItself", id: "diversity", round: [] });
      page.endLast((key) => ({
        kind: "done",
        key,
        result: diversityResult(),
      }));
      await diversity;
      await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
      expect(announcer.getState()).toBe(
        "PCA of panel.nei calculated. Diversity of panel.nei calculated.",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  test("the round's start said, then the PCA's end, then the diversity's end, each alone", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const announcer = createAnnouncer();
      const texts: string[] = [];
      announcer.subscribe(() => {
        const text = announcer.getState();
        if (text !== "") texts.push(text);
      });
      const page = await setUpReady(announcer);
      announceChanges(page.store, announcer, () => null);
      const pca = startAnalysis(page.store, "pca");
      page.tell({
        kind: "startedByItself",
        id: "pca",
        round: ["pca", "diversity"],
      });
      await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
      page.endLast((key) => ({ kind: "done", key, result: pcaResult() }));
      await pca;
      await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
      const diversity = startAnalysis(page.store, "diversity");
      page.tell({ kind: "startedByItself", id: "diversity", round: [] });
      page.endLast((key) => ({
        kind: "done",
        key,
        result: diversityResult(),
      }));
      await diversity;
      await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
      expect(texts).toEqual([
        ROUND,
        "PCA of panel.nei calculated.",
        "Diversity of panel.nei calculated.",
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  test("a crash of the diversity is said, with what to do", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const announcer = createAnnouncer();
      const page = await setUpReady(announcer);
      announceChanges(page.store, announcer, () => null);
      const run = startAnalysis(page.store, "diversity");
      page.endLast(() => ({
        kind: "failed",
        error: { kind: "workerFailed", message: "a crash" },
      }));
      await run;
      await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
      expect(announcer.getState()).toBe(
        "The diversity of panel.nei could not be calculated: The calculation stopped unexpectedly. Run it again. If it stops again, open panel.nei again in the box Variants.",
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("PT2 D2 a run of a live analysis that ends within the region's pause is said by its end alone", () => {
  test.each([
    { id: "pca", started: "startedByItself" },
    { id: "pca", started: "startedAfterWaiting" },
    { id: "diversity", started: "startedByItself" },
    { id: "diversity", started: "startedAfterWaiting" },
  ] as const)(
    "$id $started, ended within the pause: its end alone",
    async ({ id, started }) => {
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
      try {
        const announcer = createAnnouncer();
        const page = await setUpReady(announcer);
        announceChanges(page.store, announcer, () => null);
        const run = startAnalysis(page.store, id);
        page.tell(
          started === "startedByItself"
            ? { kind: started, id, round: [id] }
            : { kind: started, id },
        );
        page.endLast((key) => ({
          kind: "done",
          key,
          result: id === "pca" ? pcaResult() : diversityResult(),
        }));
        await run;
        await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
        expect(announcer.getState()).toBe(
          id === "pca"
            ? "PCA of panel.nei calculated."
            : "Diversity of panel.nei calculated.",
        );
      } finally {
        vi.useRealTimers();
      }
    },
  );
});

describe("PT2 D2 the status region says each live analysis a crash holds", () => {
  test("each analysis held after a crash is said in its own words, with what starts it", () => {
    const { said, tell, toPcoa } = setUp();
    tell({ kind: "heldAfterCrash", ids: ["pca"] });
    tell({ kind: "heldAfterCrash", ids: ["diversity"] });
    toPcoa();
    tell({ kind: "heldAfterCrash", ids: ["pca", "diversity"] });
    expect(said).toEqual([
      "The PCA did not start: it starts after the next change of the filters or of its options, or when Run is pressed in the PCA tab.",
      "The diversity did not start: it starts after the next change of the filters, of its options or of the populations, or when Run is pressed in the Populations tab.",
      "The PCoA did not start: it starts after the next change of the filters or of its options, or when Run is pressed in the PCA tab.",
      "The diversity did not start: it starts after the next change of the filters, of its options or of the populations, or when Run is pressed in the Populations tab.",
    ]);
  });
});
