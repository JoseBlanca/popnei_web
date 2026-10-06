import { describe, expect, test } from "vitest";

import { loadVariants } from "../../core/project.ts";
import type { VariantLoad } from "../../core/project.ts";
import type { AppState, Store } from "../../core/store.ts";
import type { JobResult, Outcome, Run } from "../../worker/protocol.ts";
import { createPopgen2Store } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { STATS_PROGRESS_KIND, statsAnnouncementsOf } from "./statsWords.ts";
import { announcementsOf, summaryStatus } from "./words.ts";

const FILE_ID = "0123456789abcdef0123456789abcdef";

/** The store of the new page with a fake `send` ended by hand. */
function setUp(): {
  readonly store: Store<JobResult, Blob>;
  readonly sent: ((outcome: Outcome<JobResult>) => void)[];
} {
  const sent: ((outcome: Outcome<JobResult>) => void)[] = [];
  let lastId = 0;
  const store = createPopgen2Store({
    send: (): Run<JobResult> => {
      lastId += 1;
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        sent.push(resolve);
      });
      return { id: lastId, outcome, cancel: () => undefined };
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  return { store, sent };
}

const VCF: VariantLoad = {
  fileId: FILE_ID,
  name: "panel.vcf.gz",
  size: 87_000,
  format: "vcf",
  readOptions: { ploidy: null, onlyPassed: false },
};

/** What the region says of `change` applied to the store. */
function said(
  store: Store<JobResult, Blob>,
  change: () => void,
): readonly string[] {
  const before: AppState<JobResult, Blob> = store.getState();
  change();
  return announcementsOf(before, store.getState());
}

/** Lets the outcomes given settle through `startAnalysis`. */
async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Opens the VCF and records its read of 200 individuals. */
function openRead(store: Store<JobResult, Blob>): void {
  store.apply("a new variants file was loaded", (p) => loadVariants(p, VCF));
  store.variantsRead(FILE_ID, {
    kind: "read",
    individuals: Array.from({ length: 200 }, (_, i) => `s${String(i)}`),
    ploidy: 4,
    numVars: null,
  });
}

describe("what the status region of the new page says", () => {
  test("a read that starts is said once, with the name of the file", () => {
    const { store } = setUp();
    expect(
      said(store, () => {
        store.apply("a new variants file was loaded", (p) =>
          loadVariants(p, VCF),
        );
      }),
    ).toEqual(["Reading panel.vcf.gz."]);
    // Nothing more while it is read and nothing changes.
    expect(said(store, () => undefined)).toEqual([]);
  });

  test("a file read is said with its individuals", () => {
    const { store } = setUp();
    store.apply("a new variants file was loaded", (p) => loadVariants(p, VCF));
    expect(
      said(store, () => {
        store.variantsRead(FILE_ID, {
          kind: "read",
          individuals: ["s1", "s2"],
          ploidy: 4,
          numVars: null,
        });
      }),
    ).toEqual(["panel.vcf.gz is open: 2 individuals."]);
  });

  test("a file popnei could not read is said with its reason", () => {
    const { store } = setUp();
    store.apply("a new variants file was loaded", (p) => loadVariants(p, VCF));
    expect(
      said(store, () => {
        store.variantsRead(FILE_ID, {
          kind: "failed",
          error: { kind: "popnei", message: "the source is not a VCF" },
        });
      }),
    ).toEqual([
      "popnei could not read panel.vcf.gz: the source is not a VCF. Open another file.",
    ]);
  });

  test("a VCF opened with no ploidy whose ploidy popnei could not read is said in the words of the box, without its lines of Python", () => {
    const { store } = setUp();
    store.apply("a new variants file was loaded", (p) => loadVariants(p, VCF));
    expect(
      said(store, () => {
        store.variantsRead(FILE_ID, {
          kind: "failed",
          error: {
            kind: "popnei",
            message:
              "the first 5 data lines of the VCF hold no genotype with alleles, so its ploidy cannot be read from the file; give the ploidy",
          },
        });
      }),
    ).toEqual([
      "No genotype with alleles was found in the first 5 variants of panel.vcf.gz: their genotypes are missing, or the file has no genotypes (GT). popnei cannot read the ploidy of the file.",
    ]);
  });

  test("a VCF opened with no ploidy whose worker stopped during the opening is said as a file that could not be read", () => {
    const { store } = setUp();
    store.apply("a new variants file was loaded", (p) => loadVariants(p, VCF));
    expect(
      said(store, () => {
        store.variantsRead(FILE_ID, {
          kind: "failed",
          error: {
            kind: "worker",
            error: { kind: "workerFailed", message: "out of memory" },
          },
        });
      }),
    ).toEqual(["panel.vcf.gz could not be read."]);
  });

  test("a count done is said with its numbers, and a Stop by nothing of the state", async () => {
    const { store, sent } = setUp();
    openRead(store);
    expect(
      said(store, () => void startAnalysis(store, "variantsSummary")),
    ).toEqual([]);
    const running = summaryStatus(store.getState());
    if (running.kind !== "running") throw new Error("not running");

    const before = store.getState();
    sent[0]?.({
      kind: "done",
      key: running.key,
      result: {
        analysis: "variantsSummary",
        passStats: { numVars: 500, filtering: {} },
        chroms: ["chr1", "chr2"],
        numVarsPerChrom: new Uint32Array([250, 250]),
      },
    });
    await settled();
    expect(announcementsOf(before, store.getState())).toEqual([
      "panel.vcf.gz: 500 variants on 2 chromosomes.",
    ]);
  });

  test("a Stop is not said from the state, since the button says it", async () => {
    const { store, sent } = setUp();
    openRead(store);
    void startAnalysis(store, "variantsSummary");
    const before = store.getState();
    store.cancelRun("variantsSummary");
    sent[0]?.({ kind: "cancelled" });
    await settled();
    expect(announcementsOf(before, store.getState())).toEqual([]);
  });

  test("a count refused is said with its words", async () => {
    const { store, sent } = setUp();
    openRead(store);
    void startAnalysis(store, "variantsSummary");
    const before = store.getState();
    sent[0]?.({
      kind: "failed",
      error: {
        kind: "popnei",
        message: "line 84 of the VCF, the column POS: `x80` is not a position",
      },
    });
    await settled();
    expect(announcementsOf(before, store.getState())).toEqual([
      "popnei could not read panel.vcf.gz: line 84 of the VCF, the column POS: \u201cx80\u201d is not a position. Correct the file, or fetch it again, and open it again.",
    ]);
  });

  test("a count that ends with the focus on Stop is not said, since the focus moves onto its lines", async () => {
    const { store, sent } = setUp();
    openRead(store);
    void startAnalysis(store, "variantsSummary");
    const running = summaryStatus(store.getState());
    if (running.kind !== "running") throw new Error("not running");
    const before = store.getState();
    sent[0]?.({
      kind: "done",
      key: running.key,
      result: {
        analysis: "variantsSummary",
        passStats: { numVars: 500, filtering: {} },
        chroms: ["chr1"],
        numVarsPerChrom: new Uint32Array([500]),
      },
    });
    await settled();
    expect(
      announcementsOf(before, store.getState(), { focusOnCountButton: true }),
    ).toEqual([]);
  });

  test("a count refused with the focus on Stop is not said, since the focus moves onto its words", async () => {
    const { store, sent } = setUp();
    openRead(store);
    void startAnalysis(store, "variantsSummary");
    const before = store.getState();
    sent[0]?.({
      kind: "failed",
      error: {
        kind: "popnei",
        message: "line 84 of the VCF, the column POS: `x80` is not a position",
      },
    });
    await settled();
    expect(
      announcementsOf(before, store.getState(), { focusOnCountButton: true }),
    ).toEqual([]);
  });

  test("a worker that stopped with the focus on Stop is said, since Count again keeps the focus in place of Stop", async () => {
    const { store, sent } = setUp();
    openRead(store);
    void startAnalysis(store, "variantsSummary");
    const before = store.getState();
    sent[0]?.({
      kind: "failed",
      error: { kind: "workerFailed", message: "the worker stopped" },
    });
    await settled();
    expect(
      announcementsOf(before, store.getState(), { focusOnCountButton: true }),
    ).toEqual(["The variants of panel.vcf.gz could not be counted."]);
  });
});

/** The individuals of the VCF `openRead` reads. */
const INDIVIDUALS = Array.from({ length: 200 }, (_, i) => `s${String(i)}`);

/** The result of each statistic of the open file, by its id. */
const STATS_RESULTS: ReadonlyMap<string, JobResult> = new Map<
  string,
  JobResult
>([
  [
    "variantChecks",
    {
      analysis: "variantChecks",
      binEdges: Float64Array.from([0, 0.5, 1]),
      missingRate: { mean: 0.03, counts: Uint32Array.from([500, 0]) },
      maf: { mean: 0.7, counts: Uint32Array.from([0, 500]) },
      obsHet: { mean: 0.35, counts: Uint32Array.from([500, 0]) },
      unbiasedExpHet: { mean: 0.37, counts: Uint32Array.from([500, 0]) },
      passStats: { numVars: 500, filtering: {} },
    },
  ],
  [
    "individualChecks",
    {
      analysis: "individualChecks",
      individuals: INDIVIDUALS,
      missingGtRate: new Float64Array(200).fill(0.02),
      obsHetRate: new Float64Array(200).fill(0.3),
      passStats: { numVars: 500, filtering: {} },
    },
  ],
]);

describe("what the status region of the new page says of the statistics of the open file", () => {
  /** The page with the VCF open and its variants counted. */
  async function counted(): Promise<ReturnType<typeof setUp>> {
    const page = setUp();
    openRead(page.store);
    void startAnalysis(page.store, "variantsSummary");
    const running = summaryStatus(page.store.getState());
    if (running.kind !== "running") throw new Error("not running");
    page.sent[0]?.({
      kind: "done",
      key: running.key,
      result: {
        analysis: "variantsSummary",
        passStats: { numVars: 500, filtering: {} },
        chroms: ["chr1"],
        numVarsPerChrom: new Uint32Array([500]),
      },
    });
    await settled();
    return page;
  }

  /** What the region says of the statistics as `change` is made and the
      outcomes it gave settle. */
  async function statsSaid(
    store: Store<JobResult, Blob>,
    change: () => void,
  ): Promise<readonly string[]> {
    const before = store.getState();
    change();
    await settled();
    return statsAnnouncementsOf(before, store.getState()).map(
      (said) => said.text,
    );
  }

  /** Ends the request `index` of `sent`, of the statistic `id`, with its
      result, under the key it runs under. */
  function endDone(
    page: ReturnType<typeof setUp>,
    index: number,
    id: "variantChecks" | "individualChecks",
  ): void {
    const status = page.store
      .getState()
      .analyses.find((a) => a.id === id)?.status;
    const result = STATS_RESULTS.get(id);
    if (status?.kind !== "running" || result === undefined) {
      throw new Error(`${id} is not running`);
    }
    page.sent[index]?.({ kind: "done", key: status.key, result });
  }

  test("the start is said with the file, the first result while the other is not done, and the end once both are, and not the second pass that follows the first", async () => {
    const page = await counted();
    const { store } = page;
    expect(
      await statsSaid(store, () => void startAnalysis(store, "variantChecks")),
    ).toEqual(["Calculating the statistics of panel.vcf.gz\u2026"]);
    expect(
      await statsSaid(store, () => {
        endDone(page, 1, "variantChecks");
      }),
    ).toEqual([
      "The statistics of the variants of panel.vcf.gz are calculated.",
    ]);
    expect(
      await statsSaid(
        store,
        () => void startAnalysis(store, "individualChecks"),
      ),
    ).toEqual([]);
    expect(
      await statsSaid(store, () => {
        endDone(page, 2, "individualChecks");
      }),
    ).toEqual(["The statistics of panel.vcf.gz are calculated."]);
    // A change after that, the summary counted again, says nothing of
    // the statistics.
    expect(await statsSaid(store, () => undefined)).toEqual([]);
  });

  test("the words of the progress are of the kind the region replaces within a pause, and those of a failure are not", async () => {
    const page = await counted();
    const { store } = page;
    const before = store.getState();
    void startAnalysis(store, "variantChecks");
    expect(statsAnnouncementsOf(before, store.getState())).toEqual([
      {
        text: "Calculating the statistics of panel.vcf.gz\u2026",
        replaces: STATS_PROGRESS_KIND,
      },
    ]);
    const running = store.getState();
    page.sent[1]?.({
      kind: "failed",
      error: { kind: "workerFailed", message: "out of memory" },
    });
    await settled();
    expect(statsAnnouncementsOf(running, store.getState())).toEqual([
      {
        text: "The statistics of the variants could not be calculated.",
        replaces: null,
      },
    ]);
  });

  test("a Stop says nothing from the state, since its button says it", async () => {
    const page = await counted();
    const { store } = page;
    void startAnalysis(store, "variantChecks");
    expect(
      await statsSaid(store, () => {
        store.cancelRun("variantChecks");
        page.sent[1]?.({ kind: "cancelled" });
      }),
    ).toEqual([]);
  });

  test("a failure is said once, with its words, and not again while it stays", async () => {
    const page = await counted();
    const { store } = page;
    void startAnalysis(store, "variantChecks");
    expect(
      await statsSaid(store, () => {
        page.sent[1]?.({
          kind: "failed",
          error: { kind: "workerFailed", message: "out of memory" },
        });
      }),
    ).toEqual(["The statistics of the variants could not be calculated."]);
    // The other pass follows, and the failure stays as it was.
    expect(
      await statsSaid(
        store,
        () => void startAnalysis(store, "individualChecks"),
      ),
    ).toEqual([]);
    // Its result, the other not done but failed, is said as the first.
    expect(
      await statsSaid(store, () => {
        endDone(page, 2, "individualChecks");
      }),
    ).toEqual([
      "The statistics of the individuals of panel.vcf.gz are calculated.",
    ]);
  });

  test("a file that could not be read again, which fails both statistics with the same words, is said once", async () => {
    const page = await counted();
    const { store } = page;
    void startAnalysis(store, "variantChecks");
    expect(
      await statsSaid(store, () => {
        page.sent[1]?.({
          kind: "failed",
          error: {
            kind: "reopenFailed",
            name: "panel.vcf.gz",
            message: "changed",
          },
        });
      }),
    ).toEqual([
      "panel.vcf.gz could not be read again; it may have changed on the disk since it was opened. Open it again.",
    ]);
  });
});
