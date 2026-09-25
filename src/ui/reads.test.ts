import { describe, expect, test } from "vitest";

import { POPGEN_ANALYSES, firstProject, numVarsOf } from "../core/apps.ts";
import { CACHE_MAX_BYTES } from "../core/cache.ts";
import { MAX_UNDO_STEPS } from "../core/history.ts";
import {
  emptyProject,
  loadIndividuals,
  loadVariants,
  setCsvOptions,
} from "../core/project.ts";
import type { Project } from "../core/project.ts";
import { createStore } from "../core/store.ts";
import type { Store } from "../core/store.ts";
import type {
  IndividualsAnswer,
  Read,
  VariantsOpened,
} from "../worker/client.ts";
import type { CsvOptions, Job, JobResult } from "../worker/protocol.ts";
import { createReads, wantedReads } from "./reads.ts";
import type { ReadClient } from "./reads.ts";

// The real store of core and a fake client whose reads the test ends by
// hand and whose cancels it records (docs/specs/entry.md, "How it is
// verified").

const PANEL_ID = "0123456789abcdef0123456789abcdef";
const PANEL_AGAIN_ID = "fedcba9876543210fedcba9876543210";
const POPS_ID = "00000000000000000000000000000001";

const A: CsvOptions = { encoding: "auto", separator: "auto", decimal: "auto" };
const B: CsvOptions = { encoding: "utf-8", separator: ",", decimal: "." };

/** A read the fake client was asked for. */
interface Asked<T> {
  readonly fileId: string;
  /** The request, as the client was given it. */
  readonly request: unknown;
  /** Ends the read with `outcome`. */
  readonly end: (outcome: T) => void;
  /** How many times the entry cancelled it. */
  readonly cancels: () => number;
}

function fakeRead<T>(): {
  readonly read: Read<T>;
  readonly end: (outcome: T) => void;
  readonly cancels: () => number;
} {
  let end: (outcome: T) => void = () => undefined;
  const outcome = new Promise<T>((resolve) => {
    end = resolve;
  });
  let cancels = 0;
  return {
    read: {
      outcome,
      cancel: () => {
        cancels += 1;
      },
    },
    end,
    cancels: () => cancels,
  };
}

function fakeClient(): {
  readonly client: ReadClient;
  readonly variants: Asked<VariantsOpened>[];
  readonly individuals: (Asked<IndividualsAnswer> & {
    readonly csv: CsvOptions;
  })[];
} {
  const variants: Asked<VariantsOpened>[] = [];
  const individuals: (Asked<IndividualsAnswer> & {
    readonly csv: CsvOptions;
  })[] = [];
  return {
    client: {
      openVariants: (load) => {
        const made = fakeRead<VariantsOpened>();
        variants.push({ fileId: load.fileId, request: load, ...made });
        return made.read;
      },
      readIndividuals: (fileId, csv) => {
        const made = fakeRead<IndividualsAnswer>();
        individuals.push({ fileId, csv, request: { fileId, csv }, ...made });
        return made.read;
      },
    },
    variants,
    individuals,
  };
}

/** The store of the page, joined to the reads as the entry joins them. */
function setUp(): {
  readonly store: Store<JobResult>;
  readonly fake: ReturnType<typeof fakeClient>;
} {
  const store = createStore<Job, JobResult>({
    first: firstProject("popgen"),
    analyses: POPGEN_ANALYSES,
    send: () => {
      throw new Error("the reads send no calculation");
    },
    numVarsOf,
    appVersion: "0.1.0",
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });
  const fake = fakeClient();
  const reads = createReads({ store, client: fake.client });
  store.subscribe(() => {
    reads.sync();
  });
  reads.sync();
  return { store, fake };
}

/** Lets the outcomes ended by the test reach the reads. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
}

function pickNei(store: Store<JobResult>, fileId: string): void {
  store.apply("the variants file changed", (p) =>
    loadVariants(p, {
      fileId,
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
    }),
  );
}

function pickVcf(store: Store<JobResult>, fileId: string): void {
  store.apply("the variants file changed", (p) =>
    loadVariants(p, {
      fileId,
      name: "panel.vcf.gz",
      size: 30_000,
      format: "vcf",
      readOptions: { ploidy: 2, onlyPassed: false },
    }),
  );
}

function pickCsv(store: Store<JobResult>, csv: CsvOptions): void {
  store.apply("the individuals file changed", (p) =>
    loadIndividuals(p, { fileId: POPS_ID, name: "panel_pops.csv", csv }),
  );
}

function setCsv(store: Store<JobResult>, csv: CsvOptions): void {
  store.apply("how the individuals file is read changed", (p) =>
    setCsvOptions(p, csv),
  );
}

function variantsRead(store: Store<JobResult>): unknown {
  return store.getState().project.variants?.read;
}

function individualsRead(store: Store<JobResult>): unknown {
  return store.getState().project.individuals?.read;
}

/** The fake's reads of the individuals file with the options of the
    values of `csv`. */
function readsOf(
  fake: ReturnType<typeof fakeClient>,
  csv: CsvOptions,
): readonly Asked<IndividualsAnswer>[] {
  return fake.individuals.filter(
    (asked) =>
      asked.csv.encoding === csv.encoding &&
      asked.csv.separator === csv.separator &&
      asked.csv.decimal === csv.decimal,
  );
}

const OPENED: VariantsOpened = {
  kind: "opened",
  individuals: ["s000", "s001"],
  ploidy: 2,
};

const TABLE_READ: IndividualsAnswer = {
  kind: "read",
  table: { columns: ["name", "pop"], rows: [["s000", "p0"]] },
  columns: [{ kind: "identifier" }, { kind: "categorical" }],
  found: { encoding: "utf-8", separator: ",", decimal: "." },
};

describe("WS7 D1 the rule of the reads", () => {
  test("a pick of a variants file asks one openVariants with its load id, format and read options", () => {
    const { store, fake } = setUp();
    expect(fake.variants).toHaveLength(0);

    pickVcf(store, PANEL_ID);

    expect(fake.variants.map((asked) => asked.request)).toEqual([
      {
        fileId: PANEL_ID,
        format: "vcf",
        readOptions: { ploidy: 2, onlyPassed: false },
      },
    ]);
  });

  test("a change of the store that keeps the project, as a progress does, asks no second read", () => {
    const { store, fake } = setUp();
    pickNei(store, PANEL_ID);
    const project = store.getState().project;

    store.popneiReady("0.1.0");

    expect(store.getState().project).toBe(project);
    expect(fake.variants).toHaveLength(1);
  });

  test("the outcome opened makes the source read, with the individuals and the ploidy", async () => {
    const { store, fake } = setUp();
    pickNei(store, PANEL_ID);

    fake.variants[0]?.end(OPENED);
    await settle();

    expect(variantsRead(store)).toEqual({
      kind: "read",
      individuals: ["s000", "s001"],
      ploidy: 2,
      numVars: null,
    });
    expect(fake.variants).toHaveLength(1);
  });

  test("the same file picked again, a new load id, asks a second openVariants", async () => {
    const { store, fake } = setUp();
    pickNei(store, PANEL_ID);
    fake.variants[0]?.end(OPENED);
    await settle();

    pickNei(store, PANEL_AGAIN_ID);

    expect(fake.variants.map((asked) => asked.fileId)).toEqual([
      PANEL_ID,
      PANEL_AGAIN_ID,
    ]);
  });
});

describe("WS7 D1 the reads cancelled", () => {
  test("a pick undone before its outcome is cancelled, and a redo asks for the same load again", () => {
    const { store, fake } = setUp();
    pickNei(store, PANEL_ID);

    store.undo();
    expect(fake.variants[0]?.cancels()).toBe(1);
    expect(fake.variants).toHaveLength(1);

    store.redo();
    expect(fake.variants.map((asked) => asked.fileId)).toEqual([
      PANEL_ID,
      PANEL_ID,
    ]);
  });

  test("a variants file replaced while it is read cancels its read and asks for the new one", () => {
    const { store, fake } = setUp();
    pickNei(store, PANEL_ID);

    pickVcf(store, PANEL_AGAIN_ID);

    expect(fake.variants[0]?.cancels()).toBe(1);
    expect(fake.variants.map((asked) => asked.fileId)).toEqual([
      PANEL_ID,
      PANEL_AGAIN_ID,
    ]);
    expect(fake.variants[1]?.cancels()).toBe(0);
  });

  test("the options of a CSV set to A then B cancel the read of A and ask B, and an undo asks A", () => {
    const { store, fake } = setUp();
    pickCsv(store, A);
    expect(fake.individuals).toHaveLength(1);

    setCsv(store, B);
    expect(fake.individuals[0]?.cancels()).toBe(1);
    expect(readsOf(fake, B)).toHaveLength(1);

    store.undo();
    expect(readsOf(fake, B)[0]?.cancels()).toBe(1);
    expect(readsOf(fake, A)).toHaveLength(2);
  });

  test("A chosen again as a new object while B is read asks A once, and options of the same values in another object ask nothing more", () => {
    const { store, fake } = setUp();
    pickCsv(store, A);
    setCsv(store, B);

    setCsv(store, { ...A });
    expect(readsOf(fake, B)[0]?.cancels()).toBe(1);
    expect(readsOf(fake, A)).toHaveLength(2);

    setCsv(store, { ...A });
    // An opening of the same project whose options are other objects of
    // the same values: the read under way is the one it waits for.
    const present = store.getState().project;
    const individuals = present.individuals;
    const csv = individuals?.csv ?? null;
    if (individuals === null || csv === null) {
      throw new Error("the test's project has no CSV");
    }
    const reopened: Project = {
      ...present,
      individuals: { ...individuals, csv: { ...csv } },
    };
    store.open(reopened);

    expect(store.getState().project.individuals?.csv).not.toBe(csv);
    expect(readsOf(fake, A)).toHaveLength(2);
    expect(readsOf(fake, A)[1]?.cancels()).toBe(0);
  });

  test("a read the client ends cancelled with no cancel of the entry is asked again while its source is pending", async () => {
    const { store, fake } = setUp();
    pickNei(store, PANEL_ID);

    fake.variants[0]?.end({ kind: "cancelled" });
    await settle();

    expect(fake.variants.map((asked) => asked.fileId)).toEqual([
      PANEL_ID,
      PANEL_ID,
    ]);
    expect(variantsRead(store)).toEqual({ kind: "pending" });
  });

  test("a late cancelled of the first read of A leaves the second under way, whose outcome is recorded", async () => {
    const { store, fake } = setUp();
    pickCsv(store, A);
    setCsv(store, B);
    store.undo();
    expect(readsOf(fake, A)).toHaveLength(2);

    readsOf(fake, A)[0]?.end({ kind: "cancelled" });
    await settle();
    expect(readsOf(fake, A)).toHaveLength(2);
    expect(readsOf(fake, A)[1]?.cancels()).toBe(0);

    readsOf(fake, A)[1]?.end(TABLE_READ);
    await settle();
    expect(individualsRead(store)).toEqual({
      kind: "read",
      table: { columns: ["name", "pop"], rows: [["s000", "p0"]] },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: { encoding: "utf-8", separator: ",", decimal: "." },
    });
  });

  test("a cancelled read records nothing", async () => {
    const { store, fake } = setUp();
    pickNei(store, PANEL_ID);
    store.undo();
    const undone = store.getState();

    fake.variants[0]?.end({ kind: "cancelled" });
    await settle();

    expect(store.getState()).toBe(undone);
    store.redo();
    expect(variantsRead(store)).toEqual({ kind: "pending" });
  });
});

describe("WS7 D1 the outcomes of the reads", () => {
  test("a refusal of popnei is recorded as failed with popnei's message", async () => {
    const { store, fake } = setUp();
    pickNei(store, PANEL_ID);

    fake.variants[0]?.end({
      kind: "failed",
      error: { kind: "popnei", message: "the source is not a vars file" },
    });
    await settle();

    expect(variantsRead(store)).toEqual({
      kind: "failed",
      error: { kind: "popnei", message: "the source is not a vars file" },
    });
  });

  test("a workerFailed is recorded as a failure of the worker, and the file is not asked again", async () => {
    const { store, fake } = setUp();
    pickNei(store, PANEL_ID);

    fake.variants[0]?.end({
      kind: "failed",
      error: { kind: "workerFailed", message: "unreachable" },
    });
    await settle();

    expect(variantsRead(store)).toEqual({
      kind: "failed",
      error: {
        kind: "worker",
        error: { kind: "workerFailed", message: "unreachable" },
      },
    });
    expect(fake.variants).toHaveLength(1);
  });

  test("a couldNotStart is recorded as a failure of the worker, as the client gives it", async () => {
    const { store, fake } = setUp();
    pickNei(store, PANEL_ID);

    fake.variants[0]?.end({
      kind: "failed",
      error: { kind: "couldNotStart", reason: "no ready in 30 s" },
    });
    await settle();

    expect(variantsRead(store)).toEqual({
      kind: "failed",
      error: {
        kind: "worker",
        error: { kind: "couldNotStart", reason: "no ready in 30 s" },
      },
    });
  });

  test("the individuals file read is recorded with its table, its columns and what auto found", async () => {
    const { store, fake } = setUp();
    pickCsv(store, A);

    fake.individuals[0]?.end(TABLE_READ);
    await settle();

    expect(individualsRead(store)).toEqual({
      kind: "read",
      table: { columns: ["name", "pop"], rows: [["s000", "p0"]] },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: { encoding: "utf-8", separator: ",", decimal: "." },
    });
  });

  test("a refusal of the reader is recorded as failed with the way the file is wrong", async () => {
    const { store, fake } = setUp();
    pickCsv(store, A);

    fake.individuals[0]?.end({
      kind: "refused",
      error: { kind: "duplicateIndividual", name: "s000" },
    });
    await settle();

    expect(individualsRead(store)).toEqual({
      kind: "failed",
      error: { kind: "duplicateIndividual", name: "s000" },
    });
  });

  test("a failure of the light worker is recorded as a failure of the worker", async () => {
    const { store, fake } = setUp();
    pickCsv(store, A);

    fake.individuals[0]?.end({
      kind: "failed",
      error: { kind: "workerFailed", message: "out of memory" },
    });
    await settle();

    expect(individualsRead(store)).toEqual({
      kind: "failed",
      error: {
        kind: "worker",
        error: { kind: "workerFailed", message: "out of memory" },
      },
    });
    expect(fake.individuals).toHaveLength(1);
  });
});

describe("WS7 D1 wantedReads", () => {
  test("an individuals source pending with no options of a CSV, an xlsx, is a defect", () => {
    const project: Project = {
      ...emptyProject("popgen"),
      individuals: {
        fileId: POPS_ID,
        name: "pops.xlsx",
        csv: null,
        read: { kind: "pending" },
      },
    };

    expect(() => wantedReads(project)).toThrow(/^popnei_web defect: /);
  });
});
