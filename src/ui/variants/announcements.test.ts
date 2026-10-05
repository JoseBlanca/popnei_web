import { describe, expect, test } from "vitest";

import { loadVariants } from "../../core/project.ts";
import type { VariantLoad } from "../../core/project.ts";
import type { AppState, Store } from "../../core/store.ts";
import type { JobResult, Outcome, Run } from "../../worker/protocol.ts";
import { createPopgen2Store } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
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
  readOptions: { ploidy: 4, onlyPassed: true },
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
  test("a read that starts is said once, with the ploidy of the VCF", () => {
    const { store } = setUp();
    expect(
      said(store, () => {
        store.apply("a new variants file was loaded", (p) =>
          loadVariants(p, VCF),
        );
      }),
    ).toEqual([
      "Reading panel.vcf.gz, with ploidy 4 and only the variants with PASS or . in the FILTER column.",
    ]);
    // Nothing more while it is read and nothing changes.
    expect(said(store, () => undefined)).toEqual([]);
  });

  test("a VCF read with every variant is said so", () => {
    const { store } = setUp();
    expect(
      said(store, () => {
        store.apply("a new variants file was loaded", (p) =>
          loadVariants(p, {
            ...VCF,
            readOptions: { ploidy: 2, onlyPassed: false },
          }),
        );
      }),
    ).toEqual([
      "Reading panel.vcf.gz, with ploidy 2 and every variant, whatever its FILTER column.",
    ]);
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
      "popnei could not read panel.vcf.gz: line 84 of the VCF, the column POS: x80 is not a position. Correct the file, or fetch it again, and open it again.",
    ]);
  });
});
