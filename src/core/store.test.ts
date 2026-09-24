import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
  createKeyMemo,
  intermediateKeyOf,
  keyOf,
  settingsFingerprint,
} from "./keys.ts";
import type { JsonValue } from "./keys.ts";
import {
  analysisOptions,
  emptyProject,
  individualsNeeds,
  loadIndividuals,
  loadVariants,
  projectNeeds,
  removeIndividuals,
  setCsvOptions,
  setGrouping,
  setIndividualFilter,
  setVariantFilter,
} from "./project.ts";
import type {
  IndividualsRead,
  Project,
  SourceRead,
  VariantSource,
} from "./project.ts";
import { createStore } from "./store.ts";
import type {
  AnalysisDef,
  AnalysisError,
  AnalysisStatus,
  AppState,
  Store,
} from "./store.ts";
import { drawnCommand, jsonObjectOf, sampleProject } from "./testSupport.ts";
import type { DrawnCommand } from "./testSupport.ts";
import type {
  CsvOptions,
  Outcome,
  Progress,
  Run,
  RunError,
} from "../worker/protocol.ts";

// The fakes of the store spec's "How it is verified": a `send` whose
// requests the test ends by hand, and two analyses, one that needs the
// individuals file and uses the populations, and one that needs only the
// variants file. Their results differ in shape, so that a result given
// to the other analysis's functions shows.

/** A request of the fake analyses. */
interface TestJob {
  readonly analysis: "pops" | "vars";
  /** The key of an intermediate result, made by the client. */
  readonly pruned: string;
}

/** The result of the analysis of the populations. */
interface PopsResult {
  readonly kind: "pops";
  readonly fst: Float64Array;
}

/** The result of the analysis of the variants. */
interface VarsResult {
  readonly kind: "vars";
  /** The number of variants the pass counted, or `null`. */
  readonly numVars: number | null;
  readonly values: Float64Array;
}

type TestResult = PopsResult | VarsResult;

/** A request the fake `send` was given, which the test ends by hand. */
interface SentRequest {
  readonly run: Run<TestResult>;
  readonly key: string;
  readonly job: TestJob;
  /** Passes a progress to the store, as the worker client would. */
  readonly progress: (p: Progress) => void;
  /** Resolves the request's outcome. */
  readonly end: (outcome: Outcome<TestResult>) => void;
  /** How many times its `cancel()` was called. */
  readonly cancels: () => number;
}

/** A fake `send`, and the requests it was given, in order. */
function fakeSend(): {
  readonly send: (
    key: string,
    job: TestJob,
    onProgress: (p: Progress) => void,
  ) => Run<TestResult>;
  readonly sent: SentRequest[];
  /** What was sent and cancelled, in order: "send 2", "cancel 1". */
  readonly log: string[];
} {
  const sent: SentRequest[] = [];
  const log: string[] = [];
  const send = (
    key: string,
    job: TestJob,
    onProgress: (p: Progress) => void,
  ): Run<TestResult> => {
    let end: (outcome: Outcome<TestResult>) => void = () => undefined;
    const outcome = new Promise<Outcome<TestResult>>((resolve) => {
      end = resolve;
    });
    let cancels = 0;
    const id = sent.length + 1;
    log.push(`send ${String(id)}`);
    const run: Run<TestResult> = {
      id,
      outcome,
      cancel: () => {
        cancels += 1;
        log.push(`cancel ${String(id)}`);
      },
    };
    sent.push({
      run,
      key,
      job,
      progress: onProgress,
      end,
      cancels: () => cancels,
    });
    return run;
  };
  return { send, sent, log };
}

/** How many times the fake analyses were asked for their keys and their
    reasons. */
interface Calls {
  /** The calls of the `keyInputs` of the analysis of the populations. */
  pops: number;
  /** The calls of the `keyInputs` of the analysis of the variants. */
  vars: number;
  /** The calls of the `needs` of the analysis of the populations. */
  needs: number;
  /** What each `warnings` and `checkNumbers` was given, in order:
      "pops warnings of vars" when the populations were given a result of
      the variants. */
  readonly given: string[];
}

/** The intermediate result both fake analyses ask the client for. */
const PRUNED: readonly [string, JsonValue] = ["pruned", { maxR2: 0.5 }];

/** The warning of the analysis of the variants when its request's
    project filters by MAF. */
const MAF_WARNING = {
  code: "mafFiltered",
  text: "Rare variants were removed.",
};

/** The reason of the analysis of the populations when no column of the
    individuals file defines them. */
const NO_POPULATIONS =
  "Choose the column of the populations in the Individuals step.";

/** The two fake analyses, the populations first, and the count of the
    calls of their `keyInputs`. */
function fakeAnalyses(): {
  readonly analyses: readonly AnalysisDef<TestJob, TestResult>[];
  readonly calls: Calls;
} {
  const calls: Calls = { pops: 0, vars: 0, needs: 0, given: [] };
  const pops: AnalysisDef<TestJob, TestResult> = {
    id: "pops",
    app: ["popgen"],
    defaults: {},
    keyVersion: 1,
    filtersRead: { variants: true, individuals: true },
    parseOptions: (options) => jsonObjectOf(options),
    keyInputs: (p) => {
      calls.pops += 1;
      const read = p.individuals?.read;
      return {
        populations:
          p.grouping.kind === "populations" ? p.grouping.column : null,
        table:
          read?.kind === "read"
            ? { columns: read.table.columns, rows: read.table.rows }
            : null,
      };
    },
    needs: (p) => {
      calls.needs += 1;
      return (
        individualsNeeds(p) ??
        (p.grouping.kind === "populations" && p.grouping.column === null
          ? NO_POPULATIONS
          : null)
      );
    },
    run: (_p, c) =>
      c.run({ analysis: "pops", pruned: c.intermediateKey(...PRUNED) }),
    warnings: (r) => {
      calls.given.push(`pops warnings of ${r.kind}`);
      return [];
    },
    checkNumbers: (r) => {
      calls.given.push(`pops checkNumbers of ${r.kind}`);
      return r.kind === "pops" ? [...r.fst] : [];
    },
    script: () => "",
  };
  const vars: AnalysisDef<TestJob, TestResult> = {
    id: "vars",
    app: ["popgen"],
    defaults: { minMaf: 0 },
    keyVersion: 1,
    filtersRead: { variants: true, individuals: false },
    parseOptions: (options) => jsonObjectOf(options),
    keyInputs: (p) => {
      calls.vars += 1;
      return analysisOptions(p, "vars", { minMaf: 0 });
    },
    needs: () => null,
    run: (_p, c) =>
      c.run({ analysis: "vars", pruned: c.intermediateKey(...PRUNED) }),
    warnings: (r, p) => {
      calls.given.push(`vars warnings of ${r.kind}`);
      return p.filters.some((filter) => filter.kind === "maf")
        ? [MAF_WARNING]
        : [];
    },
    checkNumbers: (r) => {
      calls.given.push(`vars checkNumbers of ${r.kind}`);
      return r.kind === "vars"
        ? [...r.values].map((value) => (Number.isNaN(value) ? null : value))
        : [];
    },
    script: () => "",
  };
  return { analyses: [pops, vars], calls };
}

const VARIANTS_ID = "0123456789abcdef0123456789abcdef";
const OTHER_VARIANTS_ID = "fedcba9876543210fedcba9876543210";
const INDIVIDUALS_ID = "00000000000000000000000000000001";

const VARIANTS_READ: SourceRead = {
  kind: "read",
  individuals: ["i1", "i2"],
  ploidy: 2,
  numVars: null,
};

const CSV: CsvOptions = {
  encoding: "auto",
  separator: "auto",
  decimal: "auto",
};

const INDIVIDUALS_READ: IndividualsRead = {
  kind: "read",
  table: {
    columns: ["id", "pop"],
    rows: [
      ["i1", "P1"],
      ["i2", "P2"],
    ],
  },
  columns: [{ kind: "identifier" }, { kind: "categorical" }],
  found: { encoding: "utf-8", separator: ",", decimal: "." },
};

/** The command that loads the variants file `panel.vcf` as `fileId`. */
function loadPanel(fileId: string): (p: Project) => Project {
  return (p) =>
    loadVariants(p, {
      fileId,
      name: "panel.vcf",
      size: 2048,
      format: "vcf",
      readOptions: { ploidy: 2, onlyPassed: false },
    });
}

/** The command that loads the individuals file `pops.csv`. */
function loadPops(p: Project): Project {
  return loadIndividuals(p, {
    fileId: INDIVIDUALS_ID,
    name: "pops.csv",
    csv: CSV,
  });
}

/** A store of population genetics from an empty project, with the fake
    analyses and send, and a cache of `cacheMaxBytes`. */
function newStore(cacheMaxBytes: number = 1024 * 1024): {
  readonly store: Store<TestResult>;
  readonly analyses: readonly AnalysisDef<TestJob, TestResult>[];
  readonly calls: Calls;
  readonly sent: SentRequest[];
  readonly log: string[];
} {
  const { analyses, calls } = fakeAnalyses();
  const { send, sent, log } = fakeSend();
  const store = createStore({
    first: emptyProject("popgen"),
    analyses,
    send,
    numVarsOf: (r) => (r.kind === "vars" ? r.numVars : null),
    appVersion: "0.1.0",
    cacheMaxBytes,
    maxUndoSteps: 200,
  });
  return { store, analyses, calls, sent, log };
}

/** A store at the point of "A worked sequence" where the variants file is
    read: popnei 0.1.0, the variants file loaded and read. */
function storeWithVariantsRead(
  cacheMaxBytes?: number,
): ReturnType<typeof newStore> {
  const made = newStore(cacheMaxBytes);
  made.store.popneiReady("0.1.0");
  made.store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
  made.store.variantsRead(VARIANTS_ID, VARIANTS_READ);
  return made;
}

/** A store where both analyses are ready: the variants file and the
    individuals file read, the populations in the column `pop`. */
function storeWithBothReady(
  cacheMaxBytes?: number,
): ReturnType<typeof newStore> {
  const made = storeWithVariantsRead(cacheMaxBytes);
  made.store.apply("an individuals file was loaded", loadPops);
  made.store.individualsRead(INDIVIDUALS_ID, CSV, INDIVIDUALS_READ);
  made.store.apply("the populations changed", (p) =>
    setGrouping(p, { kind: "populations", column: "pop" }),
  );
  return made;
}

/** The statuses of the analyses, in the order of the definitions. */
function statuses(store: Store<TestResult>): AnalysisStatus<TestResult>[] {
  return store.getState().analyses.map((view) => view.status);
}

/** The key the keys spec gives the analysis for the current project,
    made with a memo of its own. */
function expectedKey(
  store: Store<TestResult>,
  analysis: AnalysisDef<TestJob, TestResult>,
  version: string,
): string {
  return keyOf(analysis, store.getState().project, version, createKeyMemo());
}

/** Whether a value and everything it holds is frozen. */
function frozenDeeply(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return true;
  }
  const fields: readonly unknown[] = Object.values(value);
  return Object.isFrozen(value) && fields.every(frozenDeeply);
}

/** A listener that counts its calls. */
function counter(): {
  readonly listener: () => void;
  readonly count: () => number;
} {
  let count = 0;
  return {
    listener: () => {
      count += 1;
    },
    count: () => count,
  };
}

/** A store whose analysis of the variants throws a defect in its
    `keyInputs` for a MAF filter at 0.42, or whenever `boom.on` is set:
    popnei 0.1.0, the variants file loaded and read. */
function storeWithTouchyKeys(): ReturnType<typeof newStore> & {
  readonly boom: { on: boolean };
} {
  const { analyses, calls } = fakeAnalyses();
  const [pops, vars] = analyses;
  if (pops === undefined || vars === undefined) {
    throw new Error("popnei_web defect: no fake analyses");
  }
  const boom = { on: false };
  const touchy: AnalysisDef<TestJob, TestResult> = {
    ...vars,
    keyInputs: (p) => {
      const at042 = p.filters.some(
        (filter) => filter.kind === "maf" && filter.maxAllowedMaf === 0.42,
      );
      if (boom.on || at042) {
        throw new Error("popnei_web defect: a keyInputs that throws");
      }
      return vars.keyInputs(p);
    },
  };
  const { send, sent, log } = fakeSend();
  const store = createStore({
    first: emptyProject("popgen"),
    analyses: [pops, touchy],
    send,
    numVarsOf: () => null,
    appVersion: "0.1.0",
    cacheMaxBytes: 1024 * 1024,
    maxUndoSteps: 200,
  });
  store.popneiReady("0.1.0");
  store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
  store.variantsRead(VARIANTS_ID, VARIANTS_READ);
  return { store, analyses: [pops, touchy], calls, sent, log, boom };
}

describe("WP4 D1 the state with no calculation", () => {
  test("both analyses are locked until a variants file is loaded, with the reason every analysis shares", () => {
    const { store, sent } = newStore();
    const state = store.getState();
    expect(statuses(store)).toStrictEqual([
      { kind: "locked", reason: "Load a variants file in the Variants step." },
      { kind: "locked", reason: "Load a variants file in the Variants step." },
    ]);
    expect(state.analyses.map((view) => view.id)).toStrictEqual([
      "pops",
      "vars",
    ]);
    expect(state.undo).toBeNull();
    expect(state.redo).toBeNull();
    expect(state.popneiVersion).toBeNull();
    expect(state.runs).toStrictEqual([]);
    expect(state.notice).toBeNull();
    expect(sent).toHaveLength(0);
  });

  test("while the variants file is read both are locked, and once it is read the analysis of the variants is ready under its key and the other is locked by the individuals file", () => {
    const { store, analyses, sent } = newStore();
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    expect(statuses(store)).toStrictEqual([
      { kind: "locked", reason: "Reading panel.vcf." },
      { kind: "locked", reason: "Reading panel.vcf." },
    ]);
    expect(store.getState().undo).toBe("a variants file was loaded");
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    const [, vars] = analyses;
    if (vars === undefined) {
      throw new Error("popnei_web defect: no analysis of the variants");
    }
    expect(statuses(store)).toStrictEqual([
      {
        kind: "locked",
        reason: "Load an individuals file in the Individuals step.",
      },
      { kind: "ready", key: expectedKey(store, vars, "0.1.0") },
    ]);
    expect(store.getState().popneiVersion).toBe("0.1.0");
    expect(sent).toHaveLength(0);
  });

  test("the analysis of the populations is ready once the individuals file is read and a column defines the populations", () => {
    const { store, analyses } = storeWithVariantsRead();
    store.apply("an individuals file was loaded", loadPops);
    expect(statuses(store)[0]).toStrictEqual({
      kind: "locked",
      reason: "Reading pops.csv.",
    });
    store.individualsRead(INDIVIDUALS_ID, CSV, INDIVIDUALS_READ);
    expect(statuses(store)[0]).toStrictEqual({
      kind: "locked",
      reason: NO_POPULATIONS,
    });
    store.apply("the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "pop" }),
    );
    const [pops] = analyses;
    if (pops === undefined) {
      throw new Error("popnei_web defect: no analysis of the populations");
    }
    expect(statuses(store)[0]).toStrictEqual({
      kind: "ready",
      key: expectedKey(store, pops, "0.1.0"),
    });
  });

  test("popneiReady twice with the same version gives the same state object and tells no screen", () => {
    const { store } = storeWithVariantsRead();
    const before = store.getState();
    const { listener, count } = counter();
    store.subscribe(listener);
    store.popneiReady("0.1.0");
    expect(store.getState()).toBe(before);
    expect(count()).toBe(0);
  });

  test("popneiReady with another version makes every key again with it", () => {
    const { store, analyses } = storeWithBothReady();
    const [pops, vars] = analyses;
    if (pops === undefined || vars === undefined) {
      throw new Error("popnei_web defect: no fake analyses");
    }
    const before = statuses(store);
    store.popneiReady("0.2.0");
    expect(store.getState().popneiVersion).toBe("0.2.0");
    const after = statuses(store);
    expect(after).toStrictEqual([
      { kind: "ready", key: expectedKey(store, pops, "0.2.0") },
      { kind: "ready", key: expectedKey(store, vars, "0.2.0") },
    ]);
    expect(after[0]).not.toStrictEqual(before[0]);
    expect(after[1]).not.toStrictEqual(before[1]);
  });

  test("getState gives the same object between two changes, and each listener is called once per change until it is stopped", () => {
    const { store } = storeWithVariantsRead();
    const first = store.getState();
    expect(store.getState()).toBe(first);
    const one = counter();
    const two = counter();
    const stopOne = store.subscribe(one.listener);
    store.subscribe(two.listener);
    store.apply("the MAF filter changed", (p) =>
      setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }),
    );
    const second = store.getState();
    expect(second).not.toBe(first);
    expect(store.getState()).toBe(second);
    expect([one.count(), two.count()]).toStrictEqual([1, 1]);
    stopOne();
    store.undo();
    expect(store.getState().project).toBe(first.project);
    expect([one.count(), two.count()]).toStrictEqual([1, 2]);
  });

  test("the state of an analysis that did not change is the same object after a change to another", () => {
    const { store } = storeWithBothReady();
    const before = store.getState();
    store.apply("the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "id" }),
    );
    const after = store.getState();
    expect(after.analyses[0]).not.toBe(before.analyses[0]);
    expect(after.analyses[0]?.status).not.toStrictEqual(
      before.analyses[0]?.status,
    );
    expect(after.analyses[1]).toBe(before.analyses[1]);
  });

  test("a change that leaves every analysis as it was keeps the list of their states", () => {
    const { store } = storeWithVariantsRead();
    store.apply("an individuals file was loaded", loadPops);
    const before = store.getState();
    // The analysis of the variants does not read the grouping, and the
    // other stays locked by the individuals file being read.
    store.apply("the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "pop" }),
    );
    const after = store.getState();
    expect(after).not.toBe(before);
    expect(after.analyses).toBe(before.analyses);
    // A second change of the same words: only the project differs.
    store.apply("the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "id" }),
    );
    const last = store.getState();
    expect(last).not.toBe(after);
    expect(last.undo).toBe(after.undo);
    expect(last.analyses).toBe(after.analyses);
    expect(last.project.grouping).toStrictEqual({
      kind: "populations",
      column: "id",
    });
  });

  test("a command that returns the project it was given changes nothing: the same state object, no step of undo, no screen told, no key made", () => {
    const { store, calls } = storeWithVariantsRead();
    store.apply("the MAF filter changed", (p) =>
      setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }),
    );
    const before = store.getState();
    const made = { ...calls };
    const { listener, count } = counter();
    store.subscribe(listener);
    store.apply("nothing changed", (p) => p);
    // The filter already there, which the command gives back unchanged.
    store.apply("the MAF filter changed again", (p) =>
      setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }),
    );
    expect(store.getState()).toBe(before);
    expect(store.getState().undo).toBe("the MAF filter changed");
    expect(count()).toBe(0);
    expect(calls).toStrictEqual(made);
  });

  test("the keys are made again only when the project or the version of popnei changes", () => {
    const { store, calls } = storeWithVariantsRead();
    store.apply("the MAF filter changed", (p) =>
      setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }),
    );
    const made = { ...calls };
    // The keys of the variants, and the reasons of the populations.
    const at = (vars: number, needs: number): Calls => ({
      pops: made.pops,
      vars: made.vars + vars,
      needs: made.needs + needs,
      given: [],
    });
    store.getState();
    store.getState();
    store.popneiReady("0.1.0");
    store.redo();
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    expect(calls).toStrictEqual(at(0, 0));
    // A new history whose project is the present one: the same project,
    // so the same keys.
    store.open(store.getState().project);
    expect(store.getState().undo).toBeNull();
    expect(calls).toStrictEqual(at(0, 0));
    store.apply("the MAF filter changed", (p) =>
      setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.8 }),
    );
    expect(calls).toStrictEqual(at(1, 1));
    store.undo();
    expect(calls).toStrictEqual(at(2, 2));
    // Another version makes the keys again, and asks no reason again.
    store.popneiReady("0.2.0");
    expect(calls).toStrictEqual(at(3, 2));
  });

  test("a read recorded only into a project of the past makes no key and leaves the state object as it was", () => {
    const { store, calls } = newStore();
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    store.apply("a variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    const before = store.getState();
    const made = { ...calls };
    const { listener, count } = counter();
    store.subscribe(listener);
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    expect(store.getState()).toBe(before);
    expect(calls).toStrictEqual(made);
    expect(count()).toBe(0);
    store.undo();
    expect(store.getState().project.variants?.read).toStrictEqual(
      VARIANTS_READ,
    );
  });

  test("the keys are made with one memo kept across changes, so a frozen part already written is not written again", () => {
    let reads = 0;
    const probe: JsonValue = Object.freeze({
      get table(): string {
        reads += 1;
        return "the text of a large table";
      },
    });
    const { analyses } = fakeAnalyses();
    const [, vars] = analyses;
    if (vars === undefined) {
      throw new Error("popnei_web defect: no analysis of the variants");
    }
    const probed: AnalysisDef<TestJob, TestResult> = {
      ...vars,
      keyInputs: (p) => ({
        options: analysisOptions(p, "vars", {}),
        probe,
      }),
    };
    const { send } = fakeSend();
    const store = createStore({
      first: emptyProject("popgen"),
      analyses: [probed],
      send,
      numVarsOf: () => null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024,
      maxUndoSteps: 200,
    });
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    expect(reads).toBe(1);
    store.apply("the MAF filter changed", (p) =>
      setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }),
    );
    store.popneiReady("0.2.0");
    expect(statuses(store)[0]?.kind).toBe("ready");
    expect(reads).toBe(1);
  });

  test("a read is recorded into every project of the history that holds its load, with no step of undo", () => {
    const { store, analyses } = newStore();
    const [, vars] = analyses;
    if (vars === undefined) {
      throw new Error("popnei_web defect: no analysis of the variants");
    }
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    store.apply("the MAF filter changed", (p) =>
      setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }),
    );
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    expect(store.getState().project.variants?.read).toStrictEqual(
      VARIANTS_READ,
    );
    expect(store.getState().undo).toBe("the MAF filter changed");
    store.undo();
    expect(store.getState().project.variants?.read).toStrictEqual(
      VARIANTS_READ,
    );
    expect(statuses(store)[1]).toStrictEqual({
      kind: "ready",
      key: expectedKey(store, vars, "0.1.0"),
    });
    expect(store.getState().undo).toBe("a variants file was loaded");
    store.undo();
    expect(store.getState().project.variants).toBeNull();
    store.redo();
    store.redo();
    expect(store.getState().project.variants?.read).toStrictEqual(
      VARIANTS_READ,
    );
    expect(store.getState().redo).toBeNull();

    store.apply("an individuals file was loaded", loadPops);
    store.apply("the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "pop" }),
    );
    store.individualsRead(INDIVIDUALS_ID, CSV, INDIVIDUALS_READ);
    store.undo();
    expect(store.getState().project.individuals?.read).toStrictEqual(
      INDIVIDUALS_READ,
    );
    expect(statuses(store)[0]).toStrictEqual({
      kind: "locked",
      reason: NO_POPULATIONS,
    });
  });

  test("two projects of the history that shared the source of a file share the new one after its read", () => {
    const { store } = newStore();
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    store.apply("an individuals file was loaded", loadPops);
    store.apply("the MAF filter changed", (p) =>
      setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }),
    );
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    store.individualsRead(INDIVIDUALS_ID, CSV, INDIVIDUALS_READ);
    const last = store.getState().project;
    store.undo();
    const middle = store.getState().project;
    store.undo();
    const first = store.getState().project;
    expect(middle).not.toBe(last);
    expect(middle.variants).toBe(last.variants);
    expect(first.variants).toBe(last.variants);
    expect(middle.individuals).toBe(last.individuals);
    expect(last.variants?.read).toStrictEqual(VARIANTS_READ);
    expect(last.individuals?.read).toStrictEqual(INDIVIDUALS_READ);
  });

  test("a read of a load no project holds, or of options since changed, changes nothing", () => {
    const { store } = storeWithVariantsRead();
    store.apply("an individuals file was loaded", loadPops);
    const before = store.getState();
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    store.individualsRead(
      INDIVIDUALS_ID,
      { ...CSV, separator: ";" },
      INDIVIDUALS_READ,
    );
    expect(store.getState()).toBe(before);
  });

  test("open starts a history with the opened project and nothing to undo or redo", () => {
    const { store, analyses } = storeWithBothReady();
    store.undo();
    expect(store.getState().redo).toBe("the populations changed");
    const opened = setGrouping(
      setVariantFilter(loadPanel(OTHER_VARIANTS_ID)(emptyProject("popgen")), {
        kind: "maf",
        maxAllowedMaf: 0.8,
      }),
      { kind: "populations", column: "pop" },
    );
    const { listener, count } = counter();
    store.subscribe(listener);
    store.open(opened);
    const state = store.getState();
    expect(state.project).toBe(opened);
    expect(state.undo).toBeNull();
    expect(state.redo).toBeNull();
    expect(state.popneiVersion).toBe("0.1.0");
    expect(count()).toBe(1);
    expect(statuses(store)).toStrictEqual([
      { kind: "locked", reason: "Reading panel.vcf." },
      { kind: "locked", reason: "Reading panel.vcf." },
    ]);
    store.undo();
    store.redo();
    expect(store.getState()).toBe(state);
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    const [, vars] = analyses;
    if (vars === undefined) {
      throw new Error("popnei_web defect: no analysis of the variants");
    }
    expect(statuses(store)[1]).toStrictEqual({
      kind: "ready",
      key: expectedKey(store, vars, "0.1.0"),
    });
    expect(store.getState().undo).toBeNull();
  });

  test("the store freezes every project it takes: the first, a command's, an opened one, and each a read changed", () => {
    const { analyses } = fakeAnalyses();
    const { send } = fakeSend();
    const first = emptyProject("popgen");
    expect(Object.isFrozen(first)).toBe(false);
    const store = createStore({
      first,
      analyses,
      send,
      numVarsOf: () => null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024,
      maxUndoSteps: 200,
    });
    expect(frozenDeeply(store.getState().project)).toBe(true);
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    expect(frozenDeeply(store.getState().project)).toBe(true);
    store.apply("the MAF filter changed", (p) =>
      setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }),
    );
    const read: SourceRead = {
      kind: "read",
      individuals: ["i1", "i2"],
      ploidy: 2,
      numVars: null,
    };
    store.variantsRead(VARIANTS_ID, read);
    expect(frozenDeeply(store.getState().project)).toBe(true);
    store.undo();
    expect(store.getState().project.variants?.read).toBe(read);
    expect(frozenDeeply(store.getState().project)).toBe(true);
    const opened = loadPanel(OTHER_VARIANTS_ID)(emptyProject("popgen"));
    store.open(opened);
    expect(store.getState().project).toBe(opened);
    expect(frozenDeeply(opened)).toBe(true);
  });

  test("two definitions of one id are a defect", () => {
    const { analyses } = fakeAnalyses();
    const { send } = fakeSend();
    const [pops] = analyses;
    if (pops === undefined) {
      throw new Error("popnei_web defect: no analysis of the populations");
    }
    expect(() =>
      createStore({
        first: emptyProject("popgen"),
        analyses: [...analyses, pops],
        send,
        numVarsOf: () => null,
        appVersion: "0.1.0",
        cacheMaxBytes: 1024,
        maxUndoSteps: 200,
      }),
    ).toThrow(
      /^popnei_web defect: createStore was given two definitions of the analysis "pops"/,
    );
  });

  test("an analysis that can run before the version of popnei is known is a defect", () => {
    const { store } = newStore();
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    expect(() => {
      store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    }).toThrow(/^popnei_web defect: the analysis "vars" can run before/);
  });
  test("a defect while the keys of a change are made leaves the store as it was: apply, undo, redo and popneiReady", () => {
    const { store, sent, boom } = storeWithTouchyKeys();
    store.apply("the MAF filter changed", maf(0.9));
    store.apply("the MAF filter changed again", maf(0.8));
    store.undo();
    store.startRun("vars");
    const error = { kind: "workerFailed", message: "a trap" } as const;
    store.runEnded(sentAt(sent, 0).run.id, { kind: "failed", error });
    boom.on = true;
    const before = store.getState();
    expect(before.analyses[1]?.status.kind).toBe("error");
    expect(() => {
      store.apply("the MAF filter changed", maf(0.5));
    }).toThrow("a keyInputs that throws");
    expect(store.getState()).toBe(before);
    expect(() => {
      store.undo();
    }).toThrow("a keyInputs that throws");
    expect(store.getState()).toBe(before);
    expect(() => {
      store.redo();
    }).toThrow("a keyInputs that throws");
    expect(store.getState()).toBe(before);
    expect(() => {
      store.popneiReady("0.2.0");
    }).toThrow("a keyInputs that throws");
    expect(store.getState()).toBe(before);
    boom.on = false;
    // Nothing moved: the failure is kept, the undo goes back to the load
    // and the redo is the one of before.
    store.undo();
    expect(store.getState().project.filters).toStrictEqual([]);
    store.redo();
    expect(statuses(store)[1]).toMatchObject({ kind: "ready" });
    store.redo();
    expect(store.getState().project.filters).toStrictEqual([
      { kind: "maf", maxAllowedMaf: 0.8 },
    ]);
    expect(store.getState().popneiVersion).toBe("0.1.0");
  });

  test("a defect while the keys of another version are made stops no calculation", () => {
    const { store, sent, boom } = storeWithTouchyKeys();
    store.startRun("vars");
    boom.on = true;
    const before = store.getState();
    expect(() => {
      store.popneiReady("0.2.0");
    }).toThrow("a keyInputs that throws");
    expect(store.getState()).toBe(before);
    expect(sentAt(sent, 0).cancels()).toBe(0);
  });
  test("a listener that throws does not keep the others from being called, and the first error is thrown once all were", () => {
    const { store } = storeWithVariantsRead();
    const { listener, count } = counter();
    store.subscribe(() => {
      throw new Error("the first listener");
    });
    store.subscribe(listener);
    store.subscribe(() => {
      throw new Error("the third listener");
    });
    expect(() => {
      store.apply("the MAF filter changed", maf(0.9));
    }).toThrow("the first listener");
    expect(count()).toBe(1);
    expect(store.getState().project.filters).toStrictEqual([
      { kind: "maf", maxAllowedMaf: 0.9 },
    ]);
  });
  test("an undo past the first project, and a redo with nothing to redo, change nothing and tell no screen", () => {
    const { store } = storeWithVariantsRead();
    store.open(store.getState().project);
    const before = store.getState();
    const { listener, count } = counter();
    store.subscribe(listener);
    store.undo();
    store.redo();
    expect(store.getState()).toBe(before);
    expect(count()).toBe(0);
  });
});

/** The request `index` the fake `send` was given, or a defect. */
function sentAt(sent: readonly SentRequest[], index: number): SentRequest {
  const request = sent[index];
  if (request === undefined) {
    throw new Error(`popnei_web defect: no request ${String(index)} sent`);
  }
  return request;
}

/** The key the store gives the analysis at `index`, which must not be
    locked. */
function keyAt(store: Store<TestResult>, index: number): string {
  const status = statuses(store)[index];
  if (status === undefined || status.kind === "locked") {
    throw new Error(`popnei_web defect: analysis ${String(index)} is locked`);
  }
  return status.key;
}

/** A result of the analysis of the variants, of 100 numbers, 800 bytes. */
function varsResult(numVars: number | null): VarsResult {
  return { kind: "vars", numVars, values: new Float64Array(100) };
}

/** A result of the analysis of the populations, of 100 numbers. */
function popsResult(): PopsResult {
  return { kind: "pops", fst: new Float64Array(100) };
}

/** The outcome of a request done with `result`, under its own key. */
function doneWith(
  request: SentRequest,
  result: TestResult,
): Outcome<TestResult> {
  return { kind: "done", key: request.key, result };
}

/** The command that sets the MAF filter to `threshold`. */
function maf(threshold: number): (p: Project) => Project {
  return (p) => setVariantFilter(p, { kind: "maf", maxAllowedMaf: threshold });
}

/** Which function of the analysis of the variants throws a defect when a
    result is taken in. */
type Faulty = "warnings" | "checkNumbers" | "numVarsOf" | "none";

/** A store with the variants file read, whose analysis of the variants
    throws in `faulty.part` when a result is taken in. */
function storeWithFaultyIntake(): ReturnType<typeof newStore> & {
  readonly faulty: { part: Faulty };
} {
  const { analyses, calls } = fakeAnalyses();
  const [pops, vars] = analyses;
  if (pops === undefined || vars === undefined) {
    throw new Error("popnei_web defect: no fake analyses");
  }
  const faulty: { part: Faulty } = { part: "none" };
  const fail = (part: Faulty): void => {
    if (faulty.part === part) {
      throw new Error(`popnei_web defect: ${part} threw`);
    }
  };
  const fragile: AnalysisDef<TestJob, TestResult> = {
    ...vars,
    warnings: (r, p) => {
      fail("warnings");
      return vars.warnings(r, p);
    },
    checkNumbers: (r) => {
      fail("checkNumbers");
      return vars.checkNumbers(r);
    },
  };
  const { send, sent, log } = fakeSend();
  const store = createStore({
    first: emptyProject("popgen"),
    analyses: [pops, fragile],
    send,
    numVarsOf: (r) => {
      fail("numVarsOf");
      return r.kind === "vars" ? r.numVars : null;
    },
    appVersion: "0.1.0",
    cacheMaxBytes: 1024 * 1024,
    maxUndoSteps: 200,
  });
  store.popneiReady("0.1.0");
  store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
  store.variantsRead(VARIANTS_ID, VARIANTS_READ);
  return { store, analyses: [pops, fragile], calls, sent, log, faulty };
}

describe("WP4 D2 the calculations", () => {
  test("from startRun to done: running with no progress, then its progress, then done with the result and its warnings, kept in the cache", () => {
    const { store, analyses, sent } = storeWithVariantsRead();
    store.apply("the MAF filter changed", maf(0.9));
    const key = keyAt(store, 1);
    const project = store.getState().project;
    const run = store.startRun("vars");
    expect(sent).toHaveLength(1);
    const request = sentAt(sent, 0);
    expect(run).toBe(request.run);
    expect(request.key).toBe(key);
    const [, vars] = analyses;
    if (vars === undefined) {
      throw new Error("popnei_web defect: no analysis of the variants");
    }
    expect(request.job).toStrictEqual({
      analysis: "vars",
      pruned: intermediateKeyOf(
        vars,
        project,
        "0.1.0",
        "pruned",
        { maxR2: 0.5 },
        createKeyMemo(),
      ),
    });
    expect(statuses(store)[1]).toStrictEqual({
      kind: "running",
      key,
      runId: request.run.id,
      progress: null,
    });
    expect(store.getState().runs).toStrictEqual([
      {
        runId: request.run.id,
        analysis: "vars",
        key,
        current: true,
        stopping: false,
        afterStop: false,
        progress: null,
      },
    ]);
    request.progress({ done: 3, total: 10 });
    expect(statuses(store)[1]).toStrictEqual({
      kind: "running",
      key,
      runId: request.run.id,
      progress: { done: 3, total: 10 },
    });
    expect(store.getState().runs[0]?.progress).toStrictEqual({
      done: 3,
      total: 10,
    });
    const result = varsResult(null);
    store.runEnded(request.run.id, doneWith(request, result));
    const done = statuses(store)[1];
    expect(done).toStrictEqual({
      kind: "done",
      key,
      result,
      warnings: [MAF_WARNING],
      check: null,
    });
    expect(done?.kind === "done" && done.result).toBe(result);
    expect(store.getState().runs).toStrictEqual([]);
    // Another threshold and back: the result comes from the cache.
    store.apply("the MAF filter changed", maf(0.8));
    expect(statuses(store)[1]?.kind).toBe("removed");
    store.undo();
    const again = statuses(store)[1];
    expect(again?.kind === "done" && again.result).toBe(result);
    expect(sent).toHaveLength(1);
  });

  test("run asked twice for one key: the second startRun returns null and sends nothing, as it does once the result is there", () => {
    const { store, sent } = storeWithVariantsRead();
    const run = store.startRun("vars");
    const before = store.getState();
    expect(store.startRun("vars")).toBeNull();
    expect(store.getState()).toBe(before);
    expect(sent).toHaveLength(1);
    const request = sentAt(sent, 0);
    expect(run).toBe(request.run);
    store.runEnded(request.run.id, doneWith(request, varsResult(null)));
    expect(store.startRun("vars")).toBeNull();
    expect(sent).toHaveLength(1);
  });

  test("a locked analysis does not start, and an unknown analysis is a defect", () => {
    const { store, sent } = storeWithVariantsRead();
    expect(store.startRun("pops")).toBeNull();
    expect(sent).toHaveLength(0);
    expect(() => store.startRun("nothing")).toThrow(
      /^popnei_web defect: startRun was given the analysis "nothing"/,
    );
    expect(() => {
      store.cancelRun("nothing");
    }).toThrow(
      /^popnei_web defect: cancelRun was given the analysis "nothing"/,
    );
  });

  test("popnei's refusal is kept under its key: error refused, again after a command and its undo, and startRun returns null", () => {
    const { store, sent } = storeWithVariantsRead();
    store.startRun("vars");
    const request = sentAt(sent, 0);
    const key = keyAt(store, 1);
    store.runEnded(request.run.id, {
      kind: "failed",
      error: { kind: "popnei", message: "no variant left" },
    });
    const refused = {
      kind: "error",
      key,
      error: { kind: "refused", message: "no variant left" },
    };
    expect(statuses(store)[1]).toStrictEqual(refused);
    expect(store.startRun("vars")).toBeNull();
    store.apply("the MAF filter changed", maf(0.9));
    expect(statuses(store)[1]?.kind).toBe("ready");
    store.undo();
    expect(statuses(store)[1]).toStrictEqual(refused);
    expect(store.startRun("vars")).toBeNull();
    expect(sent).toHaveLength(1);
  });

  test("another failure is kept until the next change: error failed, startRun works, and after a command and its undo the analysis is ready", () => {
    const { store, sent } = storeWithVariantsRead();
    store.startRun("vars");
    const key = keyAt(store, 1);
    const error = { kind: "workerFailed", message: "out of memory" } as const;
    store.runEnded(sentAt(sent, 0).run.id, { kind: "failed", error });
    expect(statuses(store)[1]).toStrictEqual({
      kind: "error",
      key,
      error: { kind: "failed", error },
    });
    // A second try, cancelled: the failure it retried is forgotten.
    const retry = store.startRun("vars");
    expect(retry).toBe(sentAt(sent, 1).run);
    expect(statuses(store)[1]?.kind).toBe("running");
    store.cancelRun("vars");
    store.runEnded(sentAt(sent, 1).run.id, { kind: "cancelled" });
    expect(statuses(store)[1]).toStrictEqual({ kind: "ready", key });
    // A third, failed, then a command and its undo.
    store.startRun("vars");
    store.runEnded(sentAt(sent, 2).run.id, { kind: "failed", error });
    expect(statuses(store)[1]?.kind).toBe("error");
    store.apply("the MAF filter changed", maf(0.9));
    store.undo();
    expect(statuses(store)[1]).toStrictEqual({ kind: "ready", key });
  });

  test("a failure is not forgotten when a read is recorded, the number of variants of another result among them", () => {
    const { store, sent } = storeWithBothReady();
    // A load of another variants file undone, pending in the future.
    store.apply("a variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    store.undo();
    store.startRun("pops");
    store.startRun("vars");
    const error = { kind: "couldNotStart", reason: "no ready" } as const;
    store.runEnded(sentAt(sent, 0).run.id, { kind: "failed", error });
    const vars = sentAt(sent, 1);
    store.runEnded(vars.run.id, doneWith(vars, varsResult(1200)));
    expect(store.getState().project.variants?.read).toMatchObject({
      numVars: 1200,
    });
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    expect(statuses(store)[0]).toStrictEqual({
      kind: "error",
      key: keyAt(store, 0),
      error: { kind: "failed", error },
    });
    store.redo();
    expect(store.getState().project.variants).toMatchObject({
      fileId: OTHER_VARIANTS_ID,
      read: VARIANTS_READ,
    });
  });

  test("a cancel by the user stops the request, and the analysis is ready at once; a restart's cancel leaves it ready too", () => {
    const { store, sent } = storeWithVariantsRead();
    const key = keyAt(store, 1);
    const before = store.getState();
    store.cancelRun("vars");
    expect(store.getState()).toBe(before);
    store.startRun("vars");
    const request = sentAt(sent, 0);
    store.cancelRun("vars");
    expect(request.cancels()).toBe(1);
    expect(statuses(store)[1]).toStrictEqual({ kind: "ready", key });
    expect(store.getState().runs).toMatchObject([
      { runId: request.run.id, stopping: true, current: true },
    ]);
    store.cancelRun("vars");
    expect(request.cancels()).toBe(1);
    store.runEnded(request.run.id, { kind: "cancelled" });
    expect(statuses(store)[1]).toStrictEqual({ kind: "ready", key });
    expect(store.getState().runs).toStrictEqual([]);
    // A restart of the worker ends a request cancelled with no cancelRun.
    store.startRun("vars");
    store.runEnded(sentAt(sent, 1).run.id, { kind: "cancelled" });
    expect(statuses(store)[1]).toStrictEqual({ kind: "ready", key });
  });

  test("a crash of the worker shows the failure, and the analysis can run again", () => {
    const { store, sent } = storeWithVariantsRead();
    store.startRun("vars");
    const error = { kind: "workerFailed", message: "a trap" } as const;
    store.runEnded(sentAt(sent, 0).run.id, { kind: "failed", error });
    expect(statuses(store)[1]).toMatchObject({
      kind: "error",
      error: { kind: "failed", error },
    });
    expect(store.startRun("vars")).toBe(sentAt(sent, 1).run);
  });

  test("a progress after the end of its request, or before send returns, is passed over, and a progress changes only its own request", () => {
    const { analyses } = fakeAnalyses();
    const { send, sent } = fakeSend();
    const early = (
      key: string,
      job: TestJob,
      onProgress: (p: Progress) => void,
    ): Run<TestResult> => {
      onProgress({ done: 1, total: 10 });
      return send(key, job, onProgress);
    };
    const store = createStore({
      first: emptyProject("popgen"),
      analyses,
      send: early,
      numVarsOf: () => null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024 * 1024,
      maxUndoSteps: 200,
    });
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    store.apply("an individuals file was loaded", loadPops);
    store.individualsRead(INDIVIDUALS_ID, CSV, INDIVIDUALS_READ);
    store.apply("the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "pop" }),
    );
    store.startRun("pops");
    store.startRun("vars");
    expect(statuses(store)).toMatchObject([
      { kind: "running", progress: null },
      { kind: "running", progress: null },
    ]);
    const pops = sentAt(sent, 0);
    const vars = sentAt(sent, 1);
    const before = store.getState();
    vars.progress({ done: 4, total: 10 });
    const after = store.getState();
    expect(after.analyses[0]).toBe(before.analyses[0]);
    expect(after.runs[0]).toBe(before.runs[0]);
    expect(after.analyses[1]?.status).toMatchObject({
      progress: { done: 4, total: 10 },
    });
    expect(after.runs[1]?.progress).toStrictEqual({ done: 4, total: 10 });
    store.runEnded(pops.run.id, doneWith(pops, popsResult()));
    const ended = store.getState();
    pops.progress({ done: 9, total: 10 });
    expect(store.getState()).toBe(ended);
  });

  test("a result under another key than its request's is a defect, kept as the failure of its key, and the request is no longer in flight", () => {
    const { store, sent } = storeWithVariantsRead();
    store.startRun("vars");
    const request = sentAt(sent, 0);
    const { listener, count } = counter();
    store.subscribe(listener);
    expect(() => {
      store.runEnded(request.run.id, {
        kind: "done",
        key: "f".repeat(64),
        result: varsResult(null),
      });
    }).toThrow(
      /^popnei_web defect: the request 1 of the analysis "vars" was sent under the key/,
    );
    expect(statuses(store)[1]).toMatchObject({
      kind: "error",
      error: { kind: "failed", error: { kind: "defect" } },
    });
    expect(store.getState().runs).toStrictEqual([]);
    expect(count()).toBe(1);
    store.startRun("vars");
    const second = sentAt(sent, 1);
    expect(() => {
      store.runEnded(second.run.id, {
        kind: "done",
        key: "not a key",
        result: varsResult(null),
      });
    }).toThrow(/^popnei_web defect: a worker sent back the key "not a key"/);
    expect(statuses(store)[1]).toMatchObject({
      kind: "error",
      error: { kind: "failed", error: { kind: "defect" } },
    });
    expect(store.getState().runs).toStrictEqual([]);
  });

  test("a runEnded of a request the store did not start is a defect, and changes nothing", () => {
    const { store } = storeWithVariantsRead();
    const before = store.getState();
    expect(() => {
      store.runEnded(7, { kind: "cancelled" });
    }).toThrow(/^popnei_web defect: runEnded was given the request 7/);
    expect(store.getState()).toBe(before);
  });

  test("an analysis's run that throws leaves the state as it was, and what it sent is stopped", () => {
    const { analyses } = fakeAnalyses();
    const [pops, vars] = analyses;
    if (pops === undefined || vars === undefined) {
      throw new Error("popnei_web defect: no fake analyses");
    }
    const { send, sent } = fakeSend();
    const job: TestJob = { analysis: "vars", pruned: "" };
    let behaviour: "throw" | "send, then throw" | "send twice" | "other" =
      "throw";
    const faulty: AnalysisDef<TestJob, TestResult> = {
      ...vars,
      run: (_p, c) => {
        switch (behaviour) {
          case "throw":
            throw new Error("a mistake of the analysis");
          case "send, then throw":
            c.run(job);
            throw new Error("a mistake of the analysis");
          case "send twice":
            c.run(job);
            return c.run(job);
          case "other":
            c.run(job);
            return send("x", job, () => undefined);
        }
      },
    };
    const store = createStore({
      first: emptyProject("popgen"),
      analyses: [pops, faulty],
      send,
      numVarsOf: () => null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024,
      maxUndoSteps: 200,
    });
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    const before = store.getState();
    expect(() => store.startRun("vars")).toThrow("a mistake of the analysis");
    expect(sent).toHaveLength(0);
    behaviour = "send, then throw";
    expect(() => store.startRun("vars")).toThrow("a mistake of the analysis");
    expect(sentAt(sent, 0).cancels()).toBe(1);
    behaviour = "send twice";
    expect(() => store.startRun("vars")).toThrow(
      /^popnei_web defect: the analysis "vars" sent a second request/,
    );
    expect(sentAt(sent, 1).cancels()).toBe(1);
    behaviour = "other";
    expect(() => store.startRun("vars")).toThrow(
      /^popnei_web defect: the run of the analysis "vars" gave a handle its client did not give/,
    );
    expect(sentAt(sent, 2).cancels()).toBe(1);
    expect(store.getState()).toBe(before);
  });

  test("the number of variants of a result is recorded into every project of the history that holds its load, with no step of undo", () => {
    const { store, sent } = storeWithVariantsRead();
    store.apply("the MAF filter changed", maf(0.9));
    store.startRun("vars");
    const request = sentAt(sent, 0);
    store.runEnded(request.run.id, doneWith(request, varsResult(1200)));
    const last = store.getState().project;
    expect(last.variants?.read).toStrictEqual({
      ...VARIANTS_READ,
      numVars: 1200,
    });
    expect(store.getState().undo).toBe("the MAF filter changed");
    store.undo();
    expect(store.getState().project.variants).toBe(last.variants);
    expect(store.getState().undo).toBe("a variants file was loaded");
  });

  test("the warnings of a result are made from the project its request was made from", () => {
    const { store, sent } = storeWithVariantsRead();
    store.startRun("vars");
    const request = sentAt(sent, 0);
    store.apply("the MAF filter changed", maf(0.9));
    expect(statuses(store)[1]?.kind).toBe("ready");
    expect(store.getState().runs).toMatchObject([
      { runId: request.run.id, current: false },
    ]);
    store.runEnded(request.run.id, doneWith(request, varsResult(null)));
    expect(statuses(store)[1]?.kind).toBe("ready");
    store.undo();
    expect(statuses(store)[1]).toMatchObject({ kind: "done", warnings: [] });
  });

  test("each result reaches only the warnings and the checkNumbers of its own analysis", () => {
    const { store, sent, calls } = storeWithBothReady();
    store.startRun("pops");
    store.startRun("vars");
    const pops = sentAt(sent, 0);
    const vars = sentAt(sent, 1);
    store.runEnded(vars.run.id, doneWith(vars, varsResult(null)));
    store.runEnded(pops.run.id, doneWith(pops, popsResult()));
    expect(calls.given).toStrictEqual([
      "vars warnings of vars",
      "vars checkNumbers of vars",
      "pops warnings of pops",
      "pops checkNumbers of pops",
    ]);
    expect(statuses(store).map((s) => s.kind)).toStrictEqual(["done", "done"]);
  });

  test("above its bound, the cache drops a result the project no longer gives, never one it gives", () => {
    // Results of 800 bytes in a cache of 1,000.
    const { store, sent } = storeWithBothReady(1000);
    store.startRun("vars");
    const vars = sentAt(sent, 0);
    const varsDone = varsResult(null);
    store.runEnded(vars.run.id, doneWith(vars, varsDone));
    store.startRun("pops");
    const first = sentAt(sent, 1);
    store.runEnded(first.run.id, doneWith(first, popsResult()));
    // Both shown, above the bound: neither is dropped.
    expect(statuses(store).map((s) => s.kind)).toStrictEqual(["done", "done"]);
    store.apply("the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "id" }),
    );
    store.startRun("pops");
    const second = sentAt(sent, 2);
    store.runEnded(second.run.id, doneWith(second, popsResult()));
    expect(statuses(store).map((s) => s.kind)).toStrictEqual(["done", "done"]);
    // The result of the first column was dropped: the undo removes it.
    store.undo();
    expect(statuses(store).map((s) => s.kind)).toStrictEqual([
      "removed",
      "done",
    ]);
    const shown = statuses(store)[1];
    expect(shown?.kind === "done" && shown.result).toBe(varsDone);
  });
  test("a command whose keys throw moves nothing: a startRun after it sends the job of the settings on screen under their key, and its result is shown for them alone", () => {
    const { store, analyses, sent } = storeWithTouchyKeys();
    const [, touchy] = analyses;
    if (touchy === undefined) {
      throw new Error("popnei_web defect: no analysis of the variants");
    }
    store.apply("the MAF filter changed", maf(0.3));
    const shown = store.getState();
    expect(() => {
      store.apply("the MAF filter changed", maf(0.42));
    }).toThrow("a keyInputs that throws");
    expect(store.getState()).toBe(shown);
    store.startRun("vars");
    const request = sentAt(sent, 0);
    expect(request.key).toBe(
      keyOf(touchy, shown.project, "0.1.0", createKeyMemo()),
    );
    expect(request.job.pruned).toBe(
      intermediateKeyOf(
        touchy,
        shown.project,
        "0.1.0",
        "pruned",
        { maxR2: 0.5 },
        createKeyMemo(),
      ),
    );
    store.undo();
    expect(store.getState().project.filters).toStrictEqual([]);
    const result = varsResult(null);
    store.runEnded(request.run.id, doneWith(request, result));
    expect(statuses(store)[1]?.kind).toBe("ready");
    store.redo();
    expect(store.getState().project).toBe(shown.project);
    const done = statuses(store)[1];
    expect(done?.kind === "done" && done.result).toBe(result);
  });
  test("a startRun whose listener throws takes its request out and cancels it, so that the analysis is not running for ever", () => {
    const { store, sent } = storeWithVariantsRead();
    const stop = store.subscribe(() => {
      throw new Error("a screen that throws");
    });
    expect(() => store.startRun("vars")).toThrow("a screen that throws");
    const lost = sentAt(sent, 0);
    expect(lost.cancels()).toBe(1);
    expect(statuses(store)[1]?.kind).toBe("ready");
    expect(store.getState().runs).toStrictEqual([]);
    stop();
    expect(store.startRun("vars")).toBe(sentAt(sent, 1).run);
    expect(statuses(store)[1]?.kind).toBe("running");
  });

  test.each(["warnings", "checkNumbers", "numVarsOf"] as const)(
    "a %s that throws while a result is taken in keeps a failure of kind defect under its key, and nothing of the result",
    (part) => {
      const { store, sent, faulty } = storeWithFaultyIntake();
      store.startRun("vars");
      const request = sentAt(sent, 0);
      const key = keyAt(store, 1);
      faulty.part = part;
      expect(() => {
        store.runEnded(request.run.id, doneWith(request, varsResult(1200)));
      }).toThrow(`${part} threw`);
      expect(statuses(store)[1]).toStrictEqual({
        kind: "error",
        key,
        error: {
          kind: "failed",
          error: {
            kind: "defect",
            message: `popnei_web defect: ${part} threw`,
          },
        },
      });
      expect(store.getState().runs).toStrictEqual([]);
      expect(store.getState().project.variants?.read).toStrictEqual(
        VARIANTS_READ,
      );
      faulty.part = "none";
      store.apply("the MAF filter changed", maf(0.9));
      store.undo();
      expect(statuses(store)[1]).toStrictEqual({ kind: "ready", key });
    },
  );

  test("the first error while a result is taken in is the one thrown, also when a listener throws after it", () => {
    const { store, sent, faulty } = storeWithFaultyIntake();
    store.startRun("vars");
    const request = sentAt(sent, 0);
    store.subscribe(() => {
      throw new Error("a screen that throws");
    });
    faulty.part = "warnings";
    expect(() => {
      store.runEnded(request.run.id, doneWith(request, varsResult(null)));
    }).toThrow("warnings threw");
    expect(statuses(store)[1]?.kind).toBe("error");
  });

  test("an analysis's run that throws before sending stops no calculation left behind; one that throws after sending leaves stopped what it stopped", () => {
    const { analyses } = fakeAnalyses();
    const [pops, vars] = analyses;
    if (pops === undefined || vars === undefined) {
      throw new Error("popnei_web defect: no fake analyses");
    }
    const { send, sent } = fakeSend();
    const behaviour: { now: "fine" | "throw" | "send, then throw" } = {
      now: "fine",
    };
    const faulty: AnalysisDef<TestJob, TestResult> = {
      ...vars,
      run: (_p, c) => {
        if (behaviour.now === "throw") {
          throw new Error("a mistake of the analysis");
        }
        const handle = c.run({ analysis: "vars", pruned: "" });
        if (behaviour.now === "send, then throw") {
          throw new Error("a mistake of the analysis");
        }
        return handle;
      },
    };
    const store = createStore({
      first: emptyProject("popgen"),
      analyses: [pops, faulty],
      send,
      numVarsOf: () => null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024 * 1024,
      maxUndoSteps: 200,
    });
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    store.startRun("vars");
    const behind = sentAt(sent, 0);
    store.apply("the MAF filter changed", maf(0.9));
    const before = store.getState();
    behaviour.now = "throw";
    expect(() => store.startRun("vars")).toThrow("a mistake of the analysis");
    expect(behind.cancels()).toBe(0);
    expect(store.getState()).toBe(before);
    behaviour.now = "send, then throw";
    expect(() => store.startRun("vars")).toThrow("a mistake of the analysis");
    expect(behind.cancels()).toBe(1);
    expect(sentAt(sent, 1).cancels()).toBe(1);
    expect(store.getState().runs).toMatchObject([
      { runId: behind.run.id, stopping: true },
    ]);
    expect(store.getState().notice).toBeNull();
  });
  test("the number of variants of a result is recorded into the file of its request, not into a file loaded since", () => {
    const { store, sent } = storeWithVariantsRead();
    store.startRun("vars");
    const request = sentAt(sent, 0);
    store.apply("a variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    store.runEnded(request.run.id, doneWith(request, varsResult(1200)));
    expect(store.getState().project.variants).toMatchObject({
      fileId: OTHER_VARIANTS_ID,
      read: VARIANTS_READ,
    });
    store.undo();
    expect(store.getState().project.variants).toMatchObject({
      fileId: VARIANTS_ID,
      read: { ...VARIANTS_READ, numVars: 1200 },
    });
  });
  test("a failure kept until the next change is never popnei's refusal, in its type", () => {
    const wrong: AnalysisError = {
      kind: "failed",
      // @ts-expect-error -- popnei's refusal is kept as refused, never as a failure.
      error: { kind: "popnei", message: "no variant left" },
    };
    expect(wrong.kind).toBe("failed");
  });
  test("a result dropped by the bound, then asked for again by an undo, is removed, then ready, and is made again by a new run, never an error", () => {
    // Results of 800 bytes in a cache of 1,000.
    const { store, sent } = storeWithBothReady(1000);
    store.startRun("pops");
    const first = sentAt(sent, 0);
    store.runEnded(first.run.id, doneWith(first, popsResult()));
    store.apply("the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "id" }),
    );
    store.startRun("pops");
    const second = sentAt(sent, 1);
    store.runEnded(second.run.id, doneWith(second, popsResult()));
    store.undo();
    const key = keyAt(store, 0);
    expect(statuses(store)[0]).toStrictEqual({ kind: "removed", key });
    store.dismissNotice();
    expect(statuses(store)[0]).toStrictEqual({ kind: "ready", key });
    const again = store.startRun("pops");
    expect(again).toBe(sentAt(sent, 2).run);
    expect(sentAt(sent, 2).key).toBe(key);
    const result = popsResult();
    store.runEnded(sentAt(sent, 2).run.id, doneWith(sentAt(sent, 2), result));
    const done = statuses(store)[0];
    expect(done?.kind === "done" && done.result).toBe(result);
  });
});

/** The kinds of the states of the analyses, populations first. */
function kinds(store: Store<TestResult>): string[] {
  return statuses(store).map((status) => status.kind);
}

/** A store with the variants file read and the analysis of the variants
    running, its request the first sent. */
function storeWithVarsRunning(): ReturnType<typeof newStore> & {
  readonly request: SentRequest;
} {
  const made = storeWithVariantsRead();
  made.store.startRun("vars");
  return { ...made, request: sentAt(made.sent, 0) };
}

/** A store with both analyses done, the populations sent first. */
function storeWithBothDone(): ReturnType<typeof newStore> {
  const made = storeWithBothReady();
  made.store.startRun("pops");
  made.store.startRun("vars");
  const pops = sentAt(made.sent, 0);
  const vars = sentAt(made.sent, 1);
  made.store.runEnded(pops.run.id, doneWith(pops, popsResult()));
  made.store.runEnded(vars.run.id, doneWith(vars, varsResult(null)));
  return made;
}

describe("WP4 D3 the notice", () => {
  test("a worked sequence: locked, ready, running, done, removed by a command, and done again by its undo with no calculation", () => {
    const { store, sent } = newStore();
    expect(statuses(store)).toStrictEqual([
      { kind: "locked", reason: "Load a variants file in the Variants step." },
      { kind: "locked", reason: "Load a variants file in the Variants step." },
    ]);
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    expect(statuses(store)[0]).toStrictEqual({
      kind: "locked",
      reason: "Load an individuals file in the Individuals step.",
    });
    const key = keyAt(store, 1);
    expect(statuses(store)[1]).toStrictEqual({ kind: "ready", key });
    store.startRun("vars");
    const request = sentAt(sent, 0);
    expect(statuses(store)[1]?.kind).toBe("running");
    request.progress({ done: 3, total: 10 });
    expect(statuses(store)[1]).toMatchObject({
      progress: { done: 3, total: 10 },
    });
    const result = varsResult(null);
    store.runEnded(request.run.id, doneWith(request, result));
    expect(statuses(store)[1]).toStrictEqual({
      kind: "done",
      key,
      result,
      warnings: [],
      check: null,
    });
    store.apply("the missing data filter changed", (p) =>
      setVariantFilter(p, { kind: "missing_data", maxAllowedMissingRate: 0.1 }),
    );
    expect(statuses(store)[1]).toStrictEqual({
      kind: "removed",
      key: keyAt(store, 1),
    });
    expect(store.getState().notice).toStrictEqual({
      cause: {
        kind: "command",
        description: "the missing data filter changed",
      },
      removed: ["vars"],
      leftBehind: [],
    });
    store.undo();
    const again = statuses(store)[1];
    expect(again?.kind === "done" && again.result).toBe(result);
    expect(sent).toHaveLength(1);
    expect(request.cancels()).toBe(0);
    expect(store.getState().notice).toBeNull();
  });

  test("stopping, a command that changes the key of a calculation in flight: the notice leaves it behind, and it is not cancelled", () => {
    const { store, request } = storeWithVarsRunning();
    store.apply("the MAF filter changed", maf(0.9));
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "the MAF filter changed" },
      removed: [],
      leftBehind: ["vars"],
    });
    expect(request.cancels()).toBe(0);
    expect(kinds(store)).toStrictEqual(["locked", "ready"]);
    expect(store.getState().runs).toMatchObject([
      { runId: request.run.id, current: false, stopping: false },
    ]);
  });

  test("stopping, then an undo: the calculation goes on, running, and is not cancelled", () => {
    const { store, request } = storeWithVarsRunning();
    store.apply("the MAF filter changed", maf(0.9));
    store.undo();
    expect(request.cancels()).toBe(0);
    expect(statuses(store)[1]).toMatchObject({
      kind: "running",
      runId: request.run.id,
    });
    expect(store.getState().notice).toBeNull();
  });

  test("stopping, then a second command: the calculation left behind is cancelled, and the new notice does not name it", () => {
    const { store, request } = storeWithVarsRunning();
    store.apply("the MAF filter changed", maf(0.9));
    store.apply("the MAF filter changed again", maf(0.8));
    expect(request.cancels()).toBe(1);
    expect(store.getState().notice).toBeNull();
    expect(store.getState().runs).toMatchObject([
      { runId: request.run.id, stopping: true },
    ]);
  });

  test("stopping, then dismissNotice: the calculation is cancelled and the notice is gone", () => {
    const { store, request } = storeWithVarsRunning();
    store.apply("the MAF filter changed", maf(0.9));
    store.dismissNotice();
    expect(request.cancels()).toBe(1);
    expect(store.getState().notice).toBeNull();
    expect(kinds(store)).toStrictEqual(["locked", "ready"]);
  });

  test("stopping, then startRun for the new key: the old request is cancelled before the new one is sent, which is afterStop, and a notice with nothing removed goes", () => {
    const { store, request, sent, log } = storeWithVarsRunning();
    store.apply("the MAF filter changed", maf(0.9));
    const run = store.startRun("vars");
    expect(run).toBe(sentAt(sent, 1).run);
    expect(log).toStrictEqual(["send 1", "cancel 1", "send 2"]);
    expect(request.cancels()).toBe(1);
    expect(store.getState().runs).toMatchObject([
      { runId: 1, stopping: true, current: false, afterStop: false },
      { runId: 2, stopping: false, current: true, afterStop: true },
    ]);
    expect(store.getState().notice).toBeNull();
  });

  test("stopping, then startRun with results removed: the notice keeps them and no longer leaves anything behind", () => {
    const { store, sent } = storeWithBothReady();
    store.startRun("pops");
    const pops = sentAt(sent, 0);
    store.runEnded(pops.run.id, doneWith(pops, popsResult()));
    store.startRun("vars");
    store.apply("the MAF filter changed", maf(0.9));
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "the MAF filter changed" },
      removed: ["pops"],
      leftBehind: ["vars"],
    });
    store.startRun("vars");
    expect(sentAt(sent, 1).cancels()).toBe(1);
    expect(store.getState().runs[1]?.afterStop).toBe(true);
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "the MAF filter changed" },
      removed: ["pops"],
      leftBehind: [],
    });
    expect(kinds(store)).toStrictEqual(["removed", "running"]);
  });

  test("a late result: after a command, the result of the old key goes into the cache with the warnings of its request's project, and an undo shows it", () => {
    const { store, request } = storeWithVarsRunning();
    store.apply("the MAF filter changed", maf(0.9));
    const result = varsResult(null);
    store.runEnded(request.run.id, doneWith(request, result));
    expect(kinds(store)).toStrictEqual(["locked", "ready"]);
    expect(store.getState().notice).toBeNull();
    store.undo();
    const shown = statuses(store)[1];
    expect(shown).toMatchObject({ kind: "done", warnings: [] });
    expect(shown?.kind === "done" && shown.result).toBe(result);
  });

  test("the result of a calculation stopped by closing the notice is cached under its key when it arrives all the same", () => {
    const { store, request } = storeWithVarsRunning();
    store.apply("the MAF filter changed", maf(0.9));
    store.dismissNotice();
    const result = varsResult(null);
    store.runEnded(request.run.id, doneWith(request, result));
    store.undo();
    const shown = statuses(store)[1];
    expect(shown?.kind === "done" && shown.result).toBe(result);
  });

  test("dismissNotice with no notice gives the same state object and tells no screen", () => {
    const { store } = storeWithVarsRunning();
    const before = store.getState();
    const { listener, count } = counter();
    store.subscribe(listener);
    store.dismissNotice();
    expect(store.getState()).toBe(before);
    expect(count()).toBe(0);
  });

  test("a second popneiReady of another version stops every calculation at once and drops the notice, making none", () => {
    const { store, sent } = storeWithBothDone();
    store.apply("the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "id" }),
    );
    store.startRun("pops");
    const pops = sentAt(sent, 2);
    expect(store.getState().notice).toMatchObject({ removed: ["pops"] });
    expect(kinds(store)).toStrictEqual(["running", "done"]);
    store.popneiReady("0.2.0");
    expect(pops.cancels()).toBe(1);
    expect(store.getState().notice).toBeNull();
    expect(kinds(store)).toStrictEqual(["ready", "ready"]);
    expect(store.getState().runs).toMatchObject([
      { runId: pops.run.id, stopping: true },
    ]);
  });

  test("open stops the calculations in flight at once and clears the notice, making none", () => {
    const { store, sent } = storeWithBothDone();
    store.apply("the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "id" }),
    );
    store.startRun("pops");
    const current = sentAt(sent, 2);
    store.apply("the MAF filter changed", maf(0.9));
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "the MAF filter changed" },
      removed: ["vars"],
      leftBehind: ["pops"],
    });
    const { listener, count } = counter();
    store.subscribe(listener);
    store.open(store.getState().project);
    expect(current.cancels()).toBe(1);
    expect(store.getState().notice).toBeNull();
    expect(kinds(store)).toStrictEqual(["ready", "ready"]);
    expect(store.getState().undo).toBeNull();
    expect(count()).toBe(1);
  });

  test("an analysis removed that cannot run is shown locked, with what it lacks, and listed in the notice", () => {
    const { store } = storeWithBothDone();
    store.apply("the individuals file was removed", removeIndividuals);
    expect(statuses(store)[0]).toStrictEqual({
      kind: "locked",
      reason: "Load an individuals file in the Individuals step.",
    });
    expect(store.getState().notice).toMatchObject({ removed: ["pops"] });
    expect(statuses(store)[1]?.kind).toBe("done");
  });

  test("an analysis in the notice that is done again under its new key leaves the notice", () => {
    const { store, sent } = storeWithBothDone();
    store.apply("the MAF filter changed", maf(0.9));
    expect(store.getState().notice).toMatchObject({
      removed: ["pops", "vars"],
    });
    store.startRun("vars");
    const vars = sentAt(sent, 2);
    expect(store.getState().notice).toMatchObject({
      removed: ["pops", "vars"],
    });
    store.runEnded(vars.run.id, doneWith(vars, varsResult(null)));
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "the MAF filter changed" },
      removed: ["pops"],
      leftBehind: [],
    });
    store.startRun("pops");
    const pops = sentAt(sent, 3);
    store.runEnded(pops.run.id, doneWith(pops, popsResult()));
    expect(store.getState().notice).toBeNull();
  });

  test("an analysis removed is ready once the notice is closed, or replaced by one without it", () => {
    const closed = storeWithBothDone().store;
    closed.apply("the MAF filter changed", maf(0.9));
    expect(kinds(closed)).toStrictEqual(["removed", "removed"]);
    closed.dismissNotice();
    expect(kinds(closed)).toStrictEqual(["ready", "ready"]);
    const replaced = storeWithBothDone().store;
    replaced.apply("the MAF filter changed", maf(0.9));
    replaced.apply("the MAF filter changed again", maf(0.8));
    expect(replaced.getState().notice).toBeNull();
    expect(kinds(replaced)).toStrictEqual(["ready", "ready"]);
  });

  test("a calculation left behind that ends by itself, failed or cancelled, leaves leftBehind, and a notice left with nothing goes", () => {
    const { store, sent } = storeWithBothReady();
    store.startRun("pops");
    store.startRun("vars");
    store.apply("the MAF filter changed", maf(0.9));
    expect(store.getState().notice).toMatchObject({
      leftBehind: ["pops", "vars"],
    });
    const error = { kind: "workerFailed", message: "a trap" } as const;
    store.runEnded(sentAt(sent, 1).run.id, { kind: "failed", error });
    expect(store.getState().notice).toMatchObject({ leftBehind: ["pops"] });
    store.runEnded(sentAt(sent, 0).run.id, { kind: "cancelled" });
    expect(store.getState().notice).toBeNull();
    expect(sentAt(sent, 0).cancels()).toBe(0);
  });

  test("a calculation left behind whose key a read gives back leaves leftBehind, and runs again", () => {
    const { store, sent } = storeWithBothReady();
    store.startRun("pops");
    const pops = sentAt(sent, 0);
    const commas: CsvOptions = { ...CSV, separator: "," };
    store.apply("the separator changed", (p) => setCsvOptions(p, commas));
    expect(statuses(store)[0]).toStrictEqual({
      kind: "locked",
      reason: "Reading pops.csv.",
    });
    expect(store.getState().notice).toMatchObject({ leftBehind: ["pops"] });
    store.individualsRead(INDIVIDUALS_ID, commas, INDIVIDUALS_READ);
    expect(store.getState().notice).toBeNull();
    expect(statuses(store)[0]).toMatchObject({
      kind: "running",
      runId: pops.run.id,
    });
    expect(pops.cancels()).toBe(0);
  });

  test("a request is afterStop when the calculation it would wait behind was already being stopped, and not otherwise", () => {
    const { store, request, sent } = storeWithVarsRunning();
    expect(store.getState().runs[0]?.afterStop).toBe(false);
    store.cancelRun("vars");
    store.startRun("vars");
    expect(request.cancels()).toBe(1);
    expect(store.getState().runs).toMatchObject([
      { runId: 1, stopping: true },
      { runId: 2, stopping: false, afterStop: true },
    ]);
    store.runEnded(request.run.id, { kind: "cancelled" });
    store.cancelRun("vars");
    store.runEnded(sentAt(sent, 1).run.id, { kind: "cancelled" });
    // The worker, started again, announces itself ready.
    store.popneiReady("0.1.0");
    store.startRun("vars");
    expect(store.getState().runs).toMatchObject([
      { runId: 3, afterStop: false },
    ]);
  });

  test("a request is afterStop when a stop was issued since the worker was last ready, also when the calculation stopped has ended: after closing the notice, and after Stop", () => {
    const closed = storeWithVarsRunning();
    closed.store.apply("the MAF filter changed", maf(0.9));
    closed.store.dismissNotice();
    closed.store.runEnded(closed.request.run.id, { kind: "cancelled" });
    expect(closed.store.getState().runs).toStrictEqual([]);
    closed.store.startRun("vars");
    expect(closed.store.getState().runs).toMatchObject([
      { runId: 2, afterStop: true },
    ]);
    const stopped = storeWithVarsRunning();
    stopped.store.cancelRun("vars");
    stopped.store.runEnded(stopped.request.run.id, { kind: "cancelled" });
    stopped.store.startRun("vars");
    expect(stopped.store.getState().runs).toMatchObject([
      { runId: 2, afterStop: true },
    ]);
  });

  test("a request is not afterStop once a calculation ended done or failed after the stop, since the worker was already past it", () => {
    const { store, sent } = storeWithBothReady();
    store.startRun("pops");
    store.startRun("vars");
    store.cancelRun("vars");
    store.runEnded(sentAt(sent, 1).run.id, { kind: "cancelled" });
    const pops = sentAt(sent, 0);
    store.runEnded(pops.run.id, doneWith(pops, popsResult()));
    store.startRun("vars");
    expect(store.getState().runs).toMatchObject([
      { runId: 3, afterStop: false },
    ]);
  });

  test("the notice of an undo names the step undone, and that of a redo the step redone", () => {
    const { store, sent } = storeWithVariantsRead();
    store.apply("the MAF filter changed", maf(0.9));
    store.startRun("vars");
    const vars = sentAt(sent, 0);
    store.runEnded(vars.run.id, doneWith(vars, varsResult(null)));
    store.undo();
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "undo", description: "the MAF filter changed" },
      removed: ["vars"],
      leftBehind: [],
    });
    // Another sequence: the redo goes to settings never calculated.
    const other = storeWithVariantsRead();
    other.store.apply("the MAF filter changed", maf(0.9));
    other.store.undo();
    other.store.startRun("vars");
    const first = sentAt(other.sent, 0);
    other.store.runEnded(first.run.id, doneWith(first, varsResult(null)));
    other.store.redo();
    expect(other.store.getState().notice).toStrictEqual({
      cause: { kind: "redo", description: "the MAF filter changed" },
      removed: ["vars"],
      leftBehind: [],
    });
  });

  test("a notice names only the calculations of its own change: one an undo gave back, left behind again by another command, is named by the new notice and stopped when it is closed", () => {
    const { store, request } = storeWithVarsRunning();
    store.apply("the MAF filter changed", maf(0.9));
    store.undo();
    store.apply("the missing data filter changed", (p) =>
      setVariantFilter(p, { kind: "missing_data", maxAllowedMissingRate: 0.1 }),
    );
    expect(request.cancels()).toBe(0);
    expect(store.getState().notice).toStrictEqual({
      cause: {
        kind: "command",
        description: "the missing data filter changed",
      },
      removed: [],
      leftBehind: ["vars"],
    });
    const notice = store.getState().notice;
    request.progress({ done: 5, total: 10 });
    expect(store.getState().notice).toBe(notice);
    store.dismissNotice();
    expect(request.cancels()).toBe(1);
  });
  test("a read that locks an analysis whose calculation is in flight stops that calculation at once, with no notice", () => {
    const { analyses } = fakeAnalyses();
    const [pops, vars] = analyses;
    if (pops === undefined || vars === undefined) {
      throw new Error("popnei_web defect: no fake analyses");
    }
    // Locked once the variants are counted at 3.
    const counted: AnalysisDef<TestJob, TestResult> = {
      ...pops,
      keyInputs: () => null,
      needs: (p) =>
        p.variants?.read.kind === "read" && p.variants.read.numVars === 3
          ? "Three variants are too few."
          : null,
    };
    const { send, sent } = fakeSend();
    const store = createStore({
      first: emptyProject("popgen"),
      analyses: [counted, vars],
      send,
      numVarsOf: (r) => (r.kind === "vars" ? r.numVars : null),
      appVersion: "0.1.0",
      cacheMaxBytes: 1024 * 1024,
      maxUndoSteps: 200,
    });
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    store.startRun("pops");
    store.startRun("vars");
    const first = sentAt(sent, 0);
    const second = sentAt(sent, 1);
    store.runEnded(second.run.id, doneWith(second, varsResult(3)));
    expect(statuses(store)[0]).toStrictEqual({
      kind: "locked",
      reason: "Three variants are too few.",
    });
    expect(first.cancels()).toBe(1);
    expect(store.getState().notice).toBeNull();
    expect(store.getState().runs).toMatchObject([
      { runId: first.run.id, stopping: true },
    ]);
  });

  test("a read that changes the key of a calculation in flight stops it at once, and the next startRun is afterStop", () => {
    const { analyses } = fakeAnalyses();
    const [pops, vars] = analyses;
    if (pops === undefined || vars === undefined) {
      throw new Error("popnei_web defect: no fake analyses");
    }
    // Its key holds the individuals table, and it runs while the file
    // is read.
    const tabled: AnalysisDef<TestJob, TestResult> = {
      ...pops,
      keyInputs: (p) => {
        const read = p.individuals?.read;
        return read?.kind === "read"
          ? { columns: read.table.columns, rows: read.table.rows }
          : null;
      },
      needs: () => null,
    };
    const { send, sent } = fakeSend();
    const store = createStore({
      first: emptyProject("popgen"),
      analyses: [tabled, vars],
      send,
      numVarsOf: () => null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024 * 1024,
      maxUndoSteps: 200,
    });
    store.popneiReady("0.1.0");
    store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    store.apply("an individuals file was loaded", loadPops);
    store.startRun("pops");
    const first = sentAt(sent, 0);
    store.individualsRead(INDIVIDUALS_ID, CSV, INDIVIDUALS_READ);
    expect(first.cancels()).toBe(1);
    expect(store.getState().notice).toBeNull();
    store.startRun("pops");
    expect(first.cancels()).toBe(1);
    expect(store.getState().runs).toMatchObject([
      { runId: first.run.id, stopping: true },
      { runId: sentAt(sent, 1).run.id, afterStop: true },
    ]);
  });
  test("open keeps the cache and popnei's refusals, which are under keys", () => {
    const { store, sent } = storeWithBothReady();
    store.startRun("vars");
    const vars = sentAt(sent, 0);
    const result = varsResult(null);
    store.runEnded(vars.run.id, doneWith(vars, result));
    store.startRun("pops");
    store.runEnded(sentAt(sent, 1).run.id, {
      kind: "failed",
      error: { kind: "popnei", message: "no variant left" },
    });
    store.open(store.getState().project);
    const [pops, done] = statuses(store);
    expect(pops).toMatchObject({
      kind: "error",
      error: { kind: "refused", message: "no variant left" },
    });
    expect(done?.kind === "done" && done.result).toBe(result);
  });

  test("open forgets a failure that is not popnei's", () => {
    const { store, sent } = storeWithVariantsRead();
    store.startRun("vars");
    const error = { kind: "workerFailed", message: "a trap" } as const;
    store.runEnded(sentAt(sent, 0).run.id, { kind: "failed", error });
    expect(statuses(store)[1]?.kind).toBe("error");
    store.open(store.getState().project);
    expect(statuses(store)[1]?.kind).toBe("ready");
  });

  test("the analyses left behind are listed in the order of the definitions, not of their start", () => {
    const { store } = storeWithBothReady();
    store.startRun("vars");
    store.startRun("pops");
    store.apply("the MAF filter changed", maf(0.9));
    expect(store.getState().notice).toMatchObject({
      leftBehind: ["pops", "vars"],
    });
  });
});

/** The read options of the variants file the reference was saved with. */
const SAVED_READ_OPTIONS = { ploidy: 2, onlyPassed: false };

/** The variants file of the reference, a load of another session. */
const SAVED_VARIANTS: VariantSource = {
  fileId: "11111111111111111111111111111111",
  name: "panel.vcf",
  size: 2048,
  format: "vcf",
  readOptions: SAVED_READ_OPTIONS,
  read: { ...VARIANTS_READ, numVars: 1200 },
};

/** The numbers of the result the fake analysis of the variants gives in
    these tests. */
const NUMBERS: readonly number[] = [0.5, 0.25];

/** A store opened from a project file saved with the MAF filter at 0.9,
    popnei 0.1.0 and the application 0.0.9, whose check numbers of the
    variants are `saved`, with key version 1; the calculation worker gives
    `popnei`, the analysis of the variants has `keyVersion` now, the
    variants file is loaded again with `ploidy`, and the analysis runs
    and gives `numbers`. */
function openedAndRun(options: {
  readonly saved: readonly (number | null)[];
  readonly popnei?: string;
  readonly keyVersion?: number;
  readonly ploidy?: number;
  readonly numbers?: readonly number[];
}): ReturnType<typeof newStore> {
  const { analyses, calls } = fakeAnalyses();
  const [pops, vars] = analyses;
  if (pops === undefined || vars === undefined) {
    throw new Error("popnei_web defect: no fake analyses");
  }
  const varsNow = { ...vars, keyVersion: options.keyVersion ?? 1 };
  const settings = maf(0.9)(emptyProject("popgen"));
  const opened: Project = {
    ...settings,
    reference: {
      variants: SAVED_VARIANTS,
      popneiVersion: "0.1.0",
      appVersion: "0.0.9",
      checks: [
        {
          analysis: "vars",
          numbers: options.saved,
          keyVersion: 1,
          settings: settingsFingerprint(
            vars,
            settings,
            SAVED_READ_OPTIONS,
            null,
          ),
        },
      ],
    },
  };
  const { send, sent, log } = fakeSend();
  const store = createStore({
    first: emptyProject("popgen"),
    analyses: [pops, varsNow],
    send,
    numVarsOf: () => null,
    appVersion: "0.1.0",
    cacheMaxBytes: 1024 * 1024,
    maxUndoSteps: 200,
  });
  store.open(opened);
  store.popneiReady(options.popnei ?? "0.1.0");
  store.apply("a variants file was loaded", (p) =>
    loadVariants(p, {
      fileId: VARIANTS_ID,
      name: "panel.vcf",
      size: 2048,
      format: "vcf",
      readOptions: { ploidy: options.ploidy ?? 2, onlyPassed: false },
    }),
  );
  store.variantsRead(VARIANTS_ID, VARIANTS_READ);
  store.startRun("vars");
  const request = sentAt(sent, 0);
  store.runEnded(request.run.id, {
    kind: "done",
    key: request.key,
    result: {
      kind: "vars",
      numVars: null,
      values: new Float64Array(options.numbers ?? NUMBERS),
    },
  });
  return { store, analyses: [pops, varsNow], calls, sent, log };
}

/** The comparison in the state of the analysis of the variants, which
    must be done. */
function checkOf(store: Store<TestResult>): unknown {
  const status = statuses(store)[1];
  if (status?.kind !== "done") {
    throw new Error(
      "popnei_web defect: the analysis of the variants is not done",
    );
  }
  return status.check;
}

describe("WP4 D4 the check numbers", () => {
  test("a result with the numbers saved gives same", () => {
    const { store } = openedAndRun({ saved: NUMBERS });
    expect(checkOf(store)).toStrictEqual({ kind: "same" });
  });

  test("two nulls, NaN of popnei, are the same", () => {
    const { store } = openedAndRun({
      saved: [null, 0.25],
      numbers: [Number.NaN, 0.25],
    });
    expect(checkOf(store)).toStrictEqual({ kind: "same" });
  });

  test("other numbers with the same popnei and key version differ, with neither version named", () => {
    const { store } = openedAndRun({ saved: [0.5, 0.75] });
    expect(checkOf(store)).toStrictEqual({
      kind: "differs",
      popnei: null,
      app: null,
    });
  });

  test("numbers that differ in the last digit differ: the comparison is exact", () => {
    const { store } = openedAndRun({ saved: [0.5, 0.25 + 1e-15] });
    expect(0.25 + 1e-15).not.toBe(0.25);
    expect(checkOf(store)).toMatchObject({ kind: "differs" });
  });

  test("with another popnei now, the comparison names both versions of popnei", () => {
    const { store } = openedAndRun({ saved: [0.5, 0.75], popnei: "0.2.0" });
    expect(checkOf(store)).toStrictEqual({
      kind: "differs",
      popnei: { saved: "0.1.0", now: "0.2.0" },
      app: null,
    });
  });

  test("with another key version of the analysis now, the comparison names both versions of the application", () => {
    const { store } = openedAndRun({ saved: [0.5, 0.75], keyVersion: 2 });
    expect(checkOf(store)).toStrictEqual({
      kind: "differs",
      popnei: null,
      app: { saved: "0.0.9", now: "0.1.0" },
    });
  });

  test("a list one number shorter differs", () => {
    expect(checkOf(openedAndRun({ saved: [0.5] }).store)).toMatchObject({
      kind: "differs",
    });
    expect(
      checkOf(openedAndRun({ saved: [0.5, 0.25, 0] }).store),
    ).toMatchObject({ kind: "differs" });
  });

  test("a setting changed takes the comparison off, and its undo brings it back", () => {
    const { store, sent } = openedAndRun({ saved: NUMBERS });
    store.apply("the MAF filter changed", maf(0.8));
    store.startRun("vars");
    const request = sentAt(sent, 1);
    store.runEnded(request.run.id, doneWith(request, varsResult(null)));
    expect(checkOf(store)).toBeNull();
    store.undo();
    expect(checkOf(store)).toStrictEqual({ kind: "same" });
  });

  test("an opened project whose settings are changed and set back by another command has its comparison again", () => {
    const { store, sent } = openedAndRun({ saved: NUMBERS });
    store.apply("the MAF filter changed", maf(0.8));
    store.startRun("vars");
    const request = sentAt(sent, 1);
    store.runEnded(request.run.id, doneWith(request, varsResult(null)));
    store.apply("the MAF filter changed", maf(0.9));
    expect(store.getState().undo).toBe("the MAF filter changed");
    expect(checkOf(store)).toStrictEqual({ kind: "same" });
  });

  test("a variants file loaded with other read options than the saved ones gives no comparison", () => {
    const { store } = openedAndRun({ saved: NUMBERS, ploidy: 4 });
    expect(checkOf(store)).toBeNull();
  });

  test("a change of the filters the analysis does not read keeps its comparison, and its state the same object", () => {
    const { store } = openedAndRun({ saved: NUMBERS });
    const before = store.getState().analyses[1];
    store.apply("a filter of the individuals changed", (p) =>
      setIndividualFilter(p, { kind: "obs_het", maxAllowedObsHet: 0.5 }),
    );
    expect(checkOf(store)).toStrictEqual({ kind: "same" });
    expect(store.getState().analyses[1]).toBe(before);
  });

  test("checkNumbers is given only results of its own analysis", () => {
    const { calls } = storeWithBothDone();
    expect(
      calls.given.filter((given) => given.includes("checkNumbers")),
    ).toStrictEqual(["pops checkNumbers of pops", "vars checkNumbers of vars"]);
  });
  test("a comparison that differs keeps the state of its analysis the same object across a change that does not touch it", () => {
    const { store } = openedAndRun({ saved: [0.5, 0.75] });
    const before = store.getState().analyses[1];
    expect(checkOf(store)).toMatchObject({ kind: "differs" });
    store.apply("a filter of the individuals changed", (p) =>
      setIndividualFilter(p, { kind: "obs_het", maxAllowedObsHet: 0.5 }),
    );
    expect(store.getState().analyses[1]).toBe(before);
  });
});

// The properties of the store: random sequences of commands and events,
// drawn by fast-check, with a model of the requests in flight beside the
// store that says which must have been cancelled.

/** One step of a drawn sequence. */
type Step =
  | { readonly kind: "command"; readonly command: DrawnCommand }
  | { readonly kind: "undo" }
  | { readonly kind: "redo" }
  | { readonly kind: "open"; readonly empty: boolean }
  | { readonly kind: "popneiReady"; readonly version: string }
  | { readonly kind: "read"; readonly ok: boolean }
  | { readonly kind: "startRun"; readonly analysis: "pops" | "vars" }
  | { readonly kind: "cancelRun"; readonly analysis: "pops" | "vars" }
  | {
      readonly kind: "end";
      readonly which: number;
      readonly outcome: OutcomeKind;
      readonly numVars: number | null;
    }
  | { readonly kind: "progress"; readonly which: number }
  | { readonly kind: "dismissNotice" };

/** How a drawn request ends: done, cancelled, or failed of a kind. */
type OutcomeKind = "done" | "cancelled" | RunError["kind"];

const analysisId = fc.constantFrom<"pops" | "vars">("pops", "vars");

const step: fc.Arbitrary<Step> = fc.oneof(
  {
    arbitrary: drawnCommand.map((command): Step => ({
      kind: "command",
      command,
    })),
    weight: 4,
  },
  { arbitrary: fc.constant<Step>({ kind: "undo" }), weight: 2 },
  { arbitrary: fc.constant<Step>({ kind: "redo" }), weight: 1 },
  {
    arbitrary: fc.boolean().map((empty): Step => ({ kind: "open", empty })),
    weight: 1,
  },
  {
    arbitrary: fc
      .constantFrom("0.1.0", "0.2.0")
      .map((version): Step => ({ kind: "popneiReady", version })),
    weight: 1,
  },
  {
    arbitrary: fc.boolean().map((ok): Step => ({ kind: "read", ok })),
    weight: 3,
  },
  {
    arbitrary: analysisId.map((analysis): Step => ({
      kind: "startRun",
      analysis,
    })),
    weight: 5,
  },
  {
    arbitrary: analysisId.map((analysis): Step => ({
      kind: "cancelRun",
      analysis,
    })),
    weight: 1,
  },
  {
    arbitrary: fc
      .record({
        which: fc.nat(),
        outcome: fc.constantFrom<OutcomeKind>(
          "done",
          "done",
          "done",
          "done",
          "done",
          "done",
          "cancelled",
          "popnei",
          "files",
          "workerFailed",
          "couldNotStart",
          "protocolMismatch",
          "defect",
        ),
        numVars: fc.option(fc.nat({ max: 5000 })),
      })
      .map((end): Step => ({ kind: "end", ...end })),
    weight: 4,
  },
  {
    arbitrary: fc.nat().map((which): Step => ({ kind: "progress", which })),
    weight: 2,
  },
  { arbitrary: fc.constant<Step>({ kind: "dismissNotice" }), weight: 1 },
);

/** Two commands, a calculation started, and two undos: the first leaves
    the calculation behind, and the second, which does not give its key
    back, stops it. */
const twoUndos: fc.Arbitrary<readonly Step[]> = fc
  .record({ analysis: analysisId, first: drawnCommand, second: drawnCommand })
  .map(({ analysis, first, second }): readonly Step[] => [
    { kind: "command", command: first },
    { kind: "command", command: second },
    { kind: "startRun", analysis },
    { kind: "undo" },
    { kind: "undo" },
  ]);

/** The options of a CSV, drawn. */
const csvDrawn: fc.Arbitrary<CsvOptions> = fc.record(
  {
    encoding: fc.constantFrom("auto", "utf-8", "windows-1252"),
    separator: fc.constantFrom("auto", ",", ";", "\t"),
    decimal: fc.constantFrom("auto", ".", ","),
  },
  { noNullPrototype: true },
);

/** The populations running, the options of their CSV changed, and the
    file read again into the same table: the read gives back the key of
    the calculation the change left behind. */
const csvReadAgain: fc.Arbitrary<readonly Step[]> = csvDrawn.map(
  (csv): readonly Step[] => [
    { kind: "startRun", analysis: "pops" },
    {
      kind: "command",
      command: {
        name: "setCsvOptions",
        bind: (p) =>
          (p.individuals?.csv ?? null) === null
            ? null
            : (q) => setCsvOptions(q, csv),
      },
    },
    { kind: "read", ok: true },
  ],
);

/** Sequences long enough to reach results removed and calculations left
    behind: with the default size, most drawn sequences had under five
    steps, and a notice that removed a result was drawn in no run of 100.
    Two groups of steps are drawn beside the single steps: with single
    steps alone, of 1,000 sequences 6 had an undo that stopped a
    calculation and 7 a read that gave one back; with the groups, 169 and
    476. So 100 runs catch a store that cancels a calculation an undo
    gave back, which they missed before. */
const steps: fc.Arbitrary<readonly Step[]> = fc
  .array(
    fc.oneof(
      { arbitrary: step.map((s): readonly Step[] => [s]), weight: 10 },
      { arbitrary: twoUndos, weight: 1 },
      { arbitrary: csvReadAgain, weight: 1 },
    ),
    { maxLength: 30, size: "max" },
  )
  .map((groups) => groups.flat());

/** A request the fake `send` was given, as the model follows it. */
interface ModelRequest {
  readonly sent: SentRequest;
  readonly analysis: "pops" | "vars";
  /** Whether its outcome was given to `runEnded`. */
  ended: boolean;
  /** Whether the current notice leaves it behind, by the model. */
  named: boolean;
  /** Whether the rules require it to have been cancelled. */
  mustCancel: boolean;
  /** Whether a `cancelRun` of the user may have cancelled it. */
  mayCancel: boolean;
}

/** The outcome of a failure of the kind `kind`. */
function failure(kind: RunError["kind"]): Outcome<TestResult> {
  switch (kind) {
    case "popnei":
      return { kind: "failed", error: { kind, message: "no variant left" } };
    case "files":
    case "workerFailed":
    case "defect":
      return { kind: "failed", error: { kind, message: "a trap" } };
    case "couldNotStart":
      return { kind: "failed", error: { kind, reason: "no ready" } };
    case "protocolMismatch":
      return { kind: "failed", error: { kind } };
  }
}

/** A store of population genetics started as the page does, popnei
    0.1.0, and the sample project opened, with the model of its
    requests. */
function modelledStore(): {
  readonly store: Store<TestResult>;
  readonly analyses: readonly AnalysisDef<TestJob, TestResult>[];
  readonly model: ModelRequest[];
  /** The result put under each key, the last one. */
  readonly results: Map<string, TestResult>;
  /** Carries out one step, and updates the model. */
  readonly run: (s: Step) => void;
} {
  const { analyses } = fakeAnalyses();
  const { send, sent } = fakeSend();
  const store = createStore({
    first: emptyProject("popgen"),
    analyses,
    send,
    numVarsOf: (r) => (r.kind === "vars" ? r.numVars : null),
    appVersion: "0.1.0",
    cacheMaxBytes: 1024 * 1024 * 1024,
    maxUndoSteps: 200,
  });
  store.popneiReady("0.1.0");
  store.open(sampleProject());
  const model: ModelRequest[] = [];
  const results = new Map<string, TestResult>();
  const inFlight = (): ModelRequest[] => model.filter((r) => !r.ended);
  const currentKey = (analysis: "pops" | "vars"): string | null => {
    const status = statuses(store)[analysis === "pops" ? 0 : 1];
    return status === undefined || status.kind === "locked" ? null : status.key;
  };
  const isCurrent = (r: ModelRequest): boolean =>
    currentKey(r.analysis) === r.sent.key;
  /** The rules of a change that no undo can take back: every request in
      flight is stopped, and no notice names any. */
  const stopEverything = (): void => {
    for (const r of inFlight()) {
      if (r.sent.cancels() === 0) {
        r.mustCancel = true;
      }
      r.named = false;
    }
  };
  /** The rules of a change of the user: the requests the old notice
      named whose key the new project does not give are stopped, and the
      new notice names those left behind now. */
  const userChanged = (): void => {
    for (const r of inFlight()) {
      if (r.named && !isCurrent(r)) {
        r.mustCancel = true;
      }
    }
    for (const r of inFlight()) {
      r.named = !r.mustCancel && r.sent.cancels() === 0 && !isCurrent(r);
    }
  };
  /** The rule of closing the notice, and of a startRun that sent: every
      request named is stopped. */
  const stopNamed = (): void => {
    for (const r of inFlight()) {
      if (r.named) {
        r.mustCancel = true;
        r.named = false;
      }
    }
  };

  const run = (s: Step): void => {
    const before = store.getState();
    const cancelsBefore = new Map(model.map((r) => [r, r.sent.cancels()]));
    switch (s.kind) {
      case "command": {
        const command = s.command.bind(before.project);
        if (command !== null) {
          store.apply(s.command.name, command);
        }
        break;
      }
      case "undo":
        store.undo();
        break;
      case "redo":
        store.redo();
        break;
      case "open":
        stopEverything();
        store.open(s.empty ? emptyProject("popgen") : sampleProject());
        break;
      case "popneiReady":
        if (s.version !== before.popneiVersion) {
          stopEverything();
        }
        store.popneiReady(s.version);
        break;
      case "read": {
        const variants = before.project.variants;
        const individuals = before.project.individuals;
        if (variants?.read.kind === "pending") {
          store.variantsRead(
            variants.fileId,
            s.ok
              ? {
                  kind: "read",
                  individuals: ["i1", "i2", "i3", "i4"],
                  ploidy: variants.readOptions?.ploidy ?? 2,
                  numVars: null,
                }
              : {
                  kind: "failed",
                  error: { kind: "popnei", message: "not a VCF" },
                },
          );
        } else if (individuals?.read.kind === "pending") {
          const sample = sampleProject().individuals?.read;
          if (sample?.kind !== "read") {
            throw new Error("popnei_web defect: the sample has no table");
          }
          store.individualsRead(
            individuals.fileId,
            individuals.csv,
            s.ok
              ? {
                  ...sample,
                  found: individuals.csv === null ? null : sample.found,
                }
              : { kind: "failed", error: { kind: "empty" } },
          );
        }
        break;
      }
      case "startRun": {
        const count = sent.length;
        const handle = store.startRun(s.analysis);
        if (handle !== null) {
          stopNamed();
          const request = sentAt(sent, count);
          model.push({
            sent: request,
            analysis: s.analysis,
            ended: false,
            named: false,
            mustCancel: false,
            mayCancel: false,
          });
        }
        break;
      }
      case "cancelRun":
        for (const r of inFlight()) {
          if (r.analysis === s.analysis && isCurrent(r)) {
            r.mayCancel = true;
          }
        }
        store.cancelRun(s.analysis);
        break;
      case "end": {
        const open = inFlight();
        const r = open[s.which % Math.max(open.length, 1)];
        if (r === undefined) {
          break;
        }
        r.ended = true;
        r.named = false;
        let outcome: Outcome<TestResult>;
        if (s.outcome === "done") {
          const result =
            r.analysis === "pops" ? popsResult() : varsResult(s.numVars);
          results.set(r.sent.key, result);
          outcome = { kind: "done", key: r.sent.key, result };
        } else if (s.outcome === "cancelled") {
          outcome = { kind: "cancelled" };
        } else {
          outcome = failure(s.outcome);
        }
        store.runEnded(r.sent.run.id, outcome);
        break;
      }
      case "progress": {
        const request = sent[s.which % Math.max(sent.length, 1)];
        request?.progress({ done: 1, total: 2 });
        break;
      }
      case "dismissNotice":
        stopNamed();
        store.dismissNotice();
        break;
    }
    const after = store.getState();
    if (
      (s.kind === "command" || s.kind === "undo" || s.kind === "redo") &&
      after.project !== before.project
    ) {
      userChanged();
    }
    // A read, of a file or of the number of variants of a result, stops
    // at once what it leaves behind that no notice names.
    if (s.kind === "read" || s.kind === "end") {
      for (const r of inFlight()) {
        if (!r.named && !isCurrent(r) && cancelsBefore.get(r) === 0) {
          r.mustCancel = true;
        }
      }
    }
    // A request leaves the notice when it ends or its key comes back.
    for (const r of model) {
      if (r.ended || isCurrent(r)) {
        r.named = false;
      }
    }
  };
  return { store, analyses, model, results, run };
}

/** Runs `drawn` on a new modelled store, checking `holds` after each
    step with the state before it. */
function eachStep(
  drawn: readonly Step[],
  holds: (
    made: ReturnType<typeof modelledStore>,
    s: Step,
    before: AppState<TestResult>,
  ) => void,
): void {
  const made = modelledStore();
  for (const s of drawn) {
    const before = made.store.getState();
    made.run(s);
    holds(made, s, before);
  }
}

describe("WP4 D5 the properties of the store", () => {
  test("a result is shown only under the key keyOf gives for the current project, and is the result calculated under that key", () => {
    fc.assert(
      fc.property(steps, (drawn) => {
        eachStep(drawn, ({ store, analyses, results }) => {
          const state = store.getState();
          const project = state.project;
          const common = projectNeeds(project);
          analyses.forEach((def, index) => {
            const status = state.analyses[index]?.status;
            const reason = common ?? def.needs(project);
            if (reason !== null) {
              expect(status).toStrictEqual({ kind: "locked", reason });
              return;
            }
            const version = state.popneiVersion ?? "";
            const key = keyOf(def, project, version, createKeyMemo());
            expect(status).toMatchObject({ key });
            if (status?.kind === "done") {
              expect(status.result).toBe(results.get(key));
            }
          });
        });
      }),
    );
  });

  test("an undo after a command that removed results gives them back, done, with the same results", () => {
    fc.assert(
      fc.property(steps, drawnCommand, (drawn, command) => {
        const { store, run } = modelledStore();
        for (const s of drawn) {
          run(s);
        }
        const before = store.getState();
        run({ kind: "command", command });
        const removed = store.getState().notice?.removed ?? [];
        if (store.getState().project === before.project) {
          return;
        }
        run({ kind: "undo" });
        const after = store.getState();
        for (const id of removed) {
          const index = after.analyses.findIndex((view) => view.id === id);
          const was = before.analyses[index]?.status;
          const now = after.analyses[index]?.status;
          expect(was?.kind).toBe("done");
          expect(now?.kind).toBe("done");
          expect(now?.kind === "done" && now.result).toBe(
            was?.kind === "done" && was.result,
          );
        }
      }),
    );
  });

  test("the notice of each change lists exactly the analyses done before it and not after it, with its cause", () => {
    fc.assert(
      fc.property(steps, (drawn) => {
        eachStep(drawn, ({ store }, s, before) => {
          const after = store.getState();
          if (
            s.kind === "open" ||
            (s.kind === "popneiReady" && s.version !== before.popneiVersion)
          ) {
            expect(after.notice).toBeNull();
            return;
          }
          const changed =
            (s.kind === "command" || s.kind === "undo" || s.kind === "redo") &&
            after.project !== before.project;
          if (!changed) {
            return;
          }
          const doneIn = (state: AppState<TestResult>): Set<string> =>
            new Set(
              state.analyses
                .filter((view) => view.status.kind === "done")
                .map((view) => view.id),
            );
          const wasDone = doneIn(before);
          const isDone = doneIn(after);
          const expected = after.analyses
            .map((view) => view.id)
            .filter((id) => wasDone.has(id) && !isDone.has(id));
          expect(after.notice?.removed ?? []).toStrictEqual(expected);
          if (after.notice !== null) {
            expect(after.notice.cause.kind).toBe(
              s.kind === "command" ? "command" : s.kind,
            );
          }
        });
      }),
    );
  });

  test("every request in flight whose key the project does not give is named by the notice or being stopped", () => {
    fc.assert(
      fc.property(steps, (drawn) => {
        eachStep(drawn, ({ store, model }) => {
          const state = store.getState();
          for (const r of model) {
            if (r.ended) {
              continue;
            }
            const index = r.analysis === "pops" ? 0 : 1;
            const status = state.analyses[index]?.status;
            const current =
              status !== undefined &&
              status.kind !== "locked" &&
              status.key === r.sent.key;
            if (!current && r.sent.cancels() === 0) {
              expect(state.notice?.leftBehind ?? []).toContain(r.analysis);
              expect(r.named).toBe(true);
            }
          }
        });
      }),
    );
  });

  test("a request left behind is cancelled once its notice is closed or replaced without its key coming back, or a startRun met it; and no other is", () => {
    fc.assert(
      fc.property(steps, (drawn) => {
        eachStep(drawn, ({ model }) => {
          for (const r of model) {
            const cancels = r.sent.cancels();
            expect(cancels).toBeLessThanOrEqual(1);
            if (r.mustCancel) {
              expect(cancels).toBe(1);
            }
            if (cancels > 0) {
              expect(r.mustCancel || r.mayCancel).toBe(true);
            }
          }
        });
      }),
    );
  });
});
