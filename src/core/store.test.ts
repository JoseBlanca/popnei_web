import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
  createKeyMemo,
  intermediateKeyOf,
  keyOf,
  settingsFingerprint,
  writeKeyOf,
} from "./keys.ts";
import type { JsonValue } from "./keys.ts";
import {
  analysisOptions,
  emptyProject,
  individualListNeeds,
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
import { individualsKept, keptNoneReason } from "./individualsKept.ts";
import { createStore } from "./store.ts";
import type {
  AnalysisDef,
  AnalysisError,
  AnalysisStatus,
  AppState,
  Store,
  WriteStatus,
} from "./store.ts";
import {
  FAKE_STATISTICS,
  MAF_WARNING,
  NO_POPULATIONS,
  drawnCommand,
  fakeAnalyses,
  fakeCountsOf,
  fakeSend,
  FIVE_INDIVIDUALS,
  SAMPLE_VARIANTS_ID,
  fakeWriteCountsOf,
  fiveIndividualsProject,
  fiveStats,
  sampleProject,
  statsResult,
  writeTestCountsOf,
  writtenFile,
} from "./testSupport.ts";
import type {
  Calls,
  DrawnCommand,
  ListGiven,
  PopsResult,
  SentRequest,
  SentWrite,
  TestJob,
  TestResult,
  VarsResult,
} from "./testSupport.ts";
import type {
  CsvOptions,
  IndividualFilter,
  Outcome,
  Progress,
  PassStats,
  Run,
  RunError,
  Written,
} from "../worker/protocol.ts";

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
  found: {
    encoding: "utf-8",
    separator: ",",
    decimal: ".",
    undecodedLine: null,
  },
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
    countsOf: (r) => ({
      numVarsRead: r.kind === "vars" ? r.numVars : null,
      counts: null,
    }),
    counts: null,
    statistics: null,
    write: null,
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
    countsOf: () => ({ numVarsRead: null, counts: null }),
    counts: null,
    statistics: null,
    write: null,
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
        reason: "Load a metadata file in the Individuals step.",
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
      countsOf: () => ({ numVarsRead: null, counts: null }),
      counts: null,
      statistics: null,
      write: null,
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
      countsOf: () => ({ numVarsRead: null, counts: null }),
      counts: null,
      statistics: null,
      write: null,
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
        countsOf: () => ({ numVarsRead: null, counts: null }),
        counts: null,
        statistics: null,
        write: null,
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
type Faulty = "warnings" | "checkNumbers" | "countsOf" | "none";

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
    countsOf: (r) => {
      fail("countsOf");
      return {
        numVarsRead: r.kind === "vars" ? r.numVars : null,
        counts: null,
      };
    },
    counts: null,
    statistics: null,
    write: null,
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
    expect(run).toStrictEqual([request.run]);
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
      waitsForStatistics: false,
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
    request.progress({ bytesRead: 3, numBytes: 10, pass: 1, numPasses: 1 });
    expect(statuses(store)[1]).toStrictEqual({
      kind: "running",
      key,
      runId: request.run.id,
      progress: { bytesRead: 3, numBytes: 10, pass: 1, numPasses: 1 },
      waitsForStatistics: false,
    });
    expect(store.getState().runs[0]?.progress).toStrictEqual({
      bytesRead: 3,
      numBytes: 10,
      pass: 1,
      numPasses: 1,
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
    expect(run).toStrictEqual([request.run]);
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
      ofStatistics: false,
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
      ofStatistics: false,
    });
    // A second try, cancelled: the failure it retried is forgotten.
    const retry = store.startRun("vars");
    expect(retry).toStrictEqual([sentAt(sent, 1).run]);
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

  test("a variants file that could not be read again is kept under its load: every analysis that can run shows it, after a command and its undo too, and none can start until the load changes", () => {
    const { store, sent } = storeWithBothReady();
    store.startRun("vars");
    const reopen = failure("reopenFailed");
    if (reopen.kind !== "failed") {
      throw new Error("failure gives a failed outcome");
    }
    store.runEnded(sentAt(sent, 0).run.id, reopen);
    const shownError = { kind: "failed", error: reopen.error };
    expect(statuses(store)).toStrictEqual([
      {
        kind: "error",
        key: keyAt(store, 0),
        error: shownError,
        ofStatistics: false,
      },
      {
        kind: "error",
        key: keyAt(store, 1),
        error: shownError,
        ofStatistics: false,
      },
    ]);
    expect(store.startRun("vars")).toBeNull();
    expect(store.startRun("pops")).toBeNull();
    store.apply("the MAF filter changed", maf(0.9));
    expect(statuses(store)[1]).toStrictEqual({
      kind: "error",
      key: keyAt(store, 1),
      error: shownError,
      ofStatistics: false,
    });
    expect(store.startRun("vars")).toBeNull();
    store.undo();
    expect(statuses(store)[1]).toStrictEqual({
      kind: "error",
      key: keyAt(store, 1),
      error: shownError,
      ofStatistics: false,
    });
    expect(store.startRun("vars")).toBeNull();
    expect(sent).toHaveLength(1);
    // A new variants file, picked and read, forgets it.
    store.apply("a new variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    expect(kinds(store)).toStrictEqual(["ready", "ready"]);
    // An undo back to the old load, a change of the load too, keeps it
    // forgotten until a run on that load fails again.
    store.undo();
    expect(kinds(store)).toStrictEqual(["ready", "ready"]);
    expect(store.startRun("vars")).not.toBeNull();
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
      ofStatistics: false,
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
    expect(store.startRun("vars")).toStrictEqual([sentAt(sent, 1).run]);
  });

  test("a progress after the end of its request, or before send returns, is passed over, and a progress changes only its own request", () => {
    const { analyses } = fakeAnalyses();
    const { send, sent } = fakeSend();
    const early = (
      key: string,
      job: TestJob,
      onProgress: (p: Progress) => void,
    ): Run<TestResult> => {
      onProgress({ bytesRead: 1, numBytes: 10, pass: 1, numPasses: 1 });
      return send(key, job, onProgress);
    };
    const store = createStore({
      first: emptyProject("popgen"),
      analyses,
      send: early,
      countsOf: () => ({ numVarsRead: null, counts: null }),
      counts: null,
      statistics: null,
      write: null,
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
    vars.progress({ bytesRead: 4, numBytes: 10, pass: 1, numPasses: 1 });
    const after = store.getState();
    expect(after.analyses[0]).toBe(before.analyses[0]);
    expect(after.runs[0]).toBe(before.runs[0]);
    expect(after.analyses[1]?.status).toMatchObject({
      progress: { bytesRead: 4, numBytes: 10, pass: 1, numPasses: 1 },
    });
    expect(after.runs[1]?.progress).toStrictEqual({
      bytesRead: 4,
      numBytes: 10,
      pass: 1,
      numPasses: 1,
    });
    store.runEnded(pops.run.id, doneWith(pops, popsResult()));
    const ended = store.getState();
    pops.progress({ bytesRead: 9, numBytes: 10, pass: 1, numPasses: 1 });
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
      countsOf: () => ({ numVarsRead: null, counts: null }),
      counts: null,
      statistics: null,
      write: null,
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
    expect(store.startRun("vars")).toStrictEqual([sentAt(sent, 1).run]);
    expect(statuses(store)[1]?.kind).toBe("running");
  });

  test.each(["warnings", "checkNumbers", "countsOf"] as const)(
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
        ofStatistics: false,
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
      countsOf: () => ({ numVarsRead: null, counts: null }),
      counts: null,
      statistics: null,
      write: null,
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
    expect(again).toStrictEqual([sentAt(sent, 2).run]);
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
      reason: "Load a metadata file in the Individuals step.",
    });
    const key = keyAt(store, 1);
    expect(statuses(store)[1]).toStrictEqual({ kind: "ready", key });
    store.startRun("vars");
    const request = sentAt(sent, 0);
    expect(statuses(store)[1]?.kind).toBe("running");
    request.progress({ bytesRead: 3, numBytes: 10, pass: 1, numPasses: 1 });
    expect(statuses(store)[1]).toMatchObject({
      progress: { bytesRead: 3, numBytes: 10, pass: 1, numPasses: 1 },
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
      stopped: [],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
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
      stopped: [],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
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
    expect(run).toStrictEqual([sentAt(sent, 1).run]);
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
      stopped: [],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
    });
    store.startRun("vars");
    expect(sentAt(sent, 1).cancels()).toBe(1);
    expect(store.getState().runs[1]?.afterStop).toBe(true);
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "the MAF filter changed" },
      removed: ["pops"],
      leftBehind: [],
      stopped: [],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
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
      stopped: [],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
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
      reason: "Load a metadata file in the Individuals step.",
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
      stopped: [],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
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
      stopped: [],
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
      stopped: [],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
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
      stopped: [],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
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
      stopped: [],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
    });
    const notice = store.getState().notice;
    request.progress({ bytesRead: 5, numBytes: 10, pass: 1, numPasses: 1 });
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
      countsOf: (r) => ({
        numVarsRead: r.kind === "vars" ? r.numVars : null,
        counts: null,
      }),
      counts: null,
      statistics: null,
      write: null,
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
      countsOf: () => ({ numVarsRead: null, counts: null }),
      counts: null,
      statistics: null,
      write: null,
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
      stopped: [],
    });
  });

  test("a new variants file stops every calculation in flight at once: the notice lists it in stopped, leaves nothing behind, and an undo brings back the results of the old file", () => {
    const { store, sent } = storeWithBothReady();
    store.startRun("pops");
    const pops = sentAt(sent, 0);
    const result = popsResult();
    store.runEnded(pops.run.id, doneWith(pops, result));
    store.startRun("vars");
    const vars = sentAt(sent, 1);
    store.apply("a new variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    expect(vars.cancels()).toBe(1);
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "a new variants file was loaded" },
      removed: ["pops"],
      leftBehind: [],
      stopped: ["vars"],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
    });
    expect(store.getState().runs).toMatchObject([
      { runId: vars.run.id, stopping: true },
    ]);
    store.undo();
    expect(vars.cancels()).toBe(1);
    const [shown, stopped] = statuses(store);
    expect(shown?.kind === "done" && shown.result).toBe(result);
    expect(stopped?.kind).toBe("ready");
    expect(store.getState().notice).toBeNull();
  });

  test("a new variants file stops at once the calculation the notice before left behind, and lists it in stopped", () => {
    const { store, request } = storeWithVarsRunning();
    store.apply("the MAF filter changed", maf(0.9));
    expect(request.cancels()).toBe(0);
    store.apply("a new variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    expect(request.cancels()).toBe(1);
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "a new variants file was loaded" },
      removed: [],
      leftBehind: [],
      stopped: ["vars"],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
    });
  });

  test("an undo and a redo that change the load of the variants file stop every calculation in flight at once, and so does an undo that leaves no variants file", () => {
    const { store, sent } = storeWithVariantsRead();
    store.apply("a new variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    store.startRun("vars");
    const onNew = sentAt(sent, 0);
    store.undo();
    expect(onNew.cancels()).toBe(1);
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "undo", description: "a new variants file was loaded" },
      removed: [],
      leftBehind: [],
      stopped: ["vars"],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
    });
    store.startRun("vars");
    const onOld = sentAt(sent, 1);
    store.redo();
    expect(onOld.cancels()).toBe(1);
    expect(onNew.cancels()).toBe(1);
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "redo", description: "a new variants file was loaded" },
      removed: [],
      leftBehind: [],
      stopped: ["vars"],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
    });
    // Undo of the first pick: no variants file at all.
    const first = storeWithVarsRunning();
    first.store.undo();
    expect(first.request.cancels()).toBe(1);
    expect(first.store.getState().notice).toMatchObject({
      cause: { kind: "undo", description: "a variants file was loaded" },
      leftBehind: [],
      stopped: ["vars"],
    });
  });

  test("new read options of the same load of the variants file are a change of the load, and stop every calculation at once", () => {
    const { store, request } = storeWithVarsRunning();
    store.apply("the ploidy changed", (p) =>
      p.variants === null
        ? p
        : {
            ...p,
            variants: {
              ...p.variants,
              readOptions: { ploidy: 4, onlyPassed: false },
            },
          },
    );
    expect(request.cancels()).toBe(1);
    expect(store.getState().notice).toMatchObject({
      leftBehind: [],
      stopped: ["vars"],
    });
  });

  test("the calculations stopped stay in the notice until it is closed or replaced, also once their outcome arrived and the new file was read", () => {
    const closed = storeWithVarsRunning();
    closed.store.apply(
      "a new variants file was loaded",
      loadPanel(OTHER_VARIANTS_ID),
    );
    const notice = closed.store.getState().notice;
    closed.store.runEnded(closed.request.run.id, { kind: "cancelled" });
    closed.store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    expect(closed.store.getState().notice).toBe(notice);
    expect(notice).toMatchObject({ removed: [], stopped: ["vars"] });
    closed.store.dismissNotice();
    expect(closed.store.getState().notice).toBeNull();
    expect(closed.request.cancels()).toBe(1);
    const replaced = storeWithVarsRunning();
    replaced.store.apply(
      "a new variants file was loaded",
      loadPanel(OTHER_VARIANTS_ID),
    );
    replaced.store.apply("the MAF filter changed", maf(0.9));
    expect(replaced.store.getState().notice).toBeNull();
    expect(replaced.request.cancels()).toBe(1);
  });

  test("a startRun of an analysis in stopped takes it out, and a notice left with nothing goes, so that the user's own Stop is not told as the new file's", () => {
    const { store, sent } = storeWithVarsRunning();
    store.apply("a new variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    expect(store.getState().notice).toMatchObject({ stopped: ["vars"] });
    store.startRun("vars");
    expect(store.getState().notice).toBeNull();
    store.cancelRun("vars");
    store.runEnded(sentAt(sent, 1).run.id, { kind: "cancelled" });
    expect(store.getState().notice).toBeNull();
    expect(kinds(store)[1]).toBe("ready");
  });

  test("a startRun of one analysis in stopped leaves the other there, and the rest of the notice", () => {
    const { store } = storeWithBothReady();
    store.startRun("pops");
    store.startRun("vars");
    store.apply("a new variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    store.startRun("vars");
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "a new variants file was loaded" },
      removed: [],
      leftBehind: [],
      stopped: ["pops"],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
    });
  });

  test("one analysis can be both among the results removed and in stopped: its result of the old settings removed, its calculation of newer ones stopped", () => {
    const { store, sent } = storeWithVariantsRead();
    store.startRun("vars");
    const first = sentAt(sent, 0);
    store.runEnded(first.run.id, doneWith(first, varsResult(null)));
    store.apply("the MAF filter changed", maf(0.9));
    store.startRun("vars");
    const newer = sentAt(sent, 1);
    store.undo();
    expect(statuses(store)[1]?.kind).toBe("done");
    store.apply("a new variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    expect(newer.cancels()).toBe(1);
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "a new variants file was loaded" },
      removed: ["vars"],
      leftBehind: [],
      stopped: ["vars"],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: false,
    });
  });

  test("after an undo back to a load already read, the next request is afterStop, also after popneiReady, until a request on that load ends done; after a new pick once read, it is not", () => {
    const { store, sent } = storeWithVariantsRead();
    store.apply("a new variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    store.startRun("vars");
    expect(store.getState().runs).toMatchObject([
      { runId: 1, afterStop: false },
    ]);
    const onNew = sentAt(sent, 0);
    store.runEnded(onNew.run.id, doneWith(onNew, varsResult(null)));
    store.undo();
    // The worker, started again for the old load, says it is ready before
    // it opens the file.
    store.popneiReady("0.1.0");
    store.variantsRead(VARIANTS_ID, VARIANTS_READ);
    store.startRun("vars");
    expect(store.getState().runs).toMatchObject([
      { runId: 2, afterStop: true },
    ]);
    const onOld = sentAt(sent, 1);
    store.runEnded(onOld.run.id, doneWith(onOld, varsResult(null)));
    store.apply("the MAF filter changed", maf(0.9));
    store.startRun("vars");
    expect(store.getState().runs).toMatchObject([
      { runId: 3, afterStop: false },
    ]);
  });

  test("a request on another load that ends done does not clear the mark of a change of the load", () => {
    const { store, sent } = storeWithVariantsRead();
    store.apply("a new variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    store.variantsRead(OTHER_VARIANTS_ID, VARIANTS_READ);
    store.undo();
    store.redo();
    store.startRun("vars");
    const first = sentAt(sent, 0);
    store.undo();
    store.runEnded(first.run.id, doneWith(first, varsResult(null)));
    store.startRun("vars");
    expect(store.getState().runs).toMatchObject([
      { runId: 2, afterStop: true },
    ]);
  });

  test("the analyses stopped are listed in the order of the definitions, not of their start", () => {
    const { store } = storeWithBothReady();
    store.startRun("vars");
    store.startRun("pops");
    store.apply("a new variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    expect(store.getState().notice).toMatchObject({
      stopped: ["pops", "vars"],
    });
  });

  test("a command that keeps the load of the variants file stops nothing at once, and its notice lists nothing in stopped", () => {
    const { store, request } = storeWithVarsRunning();
    store.apply("the MAF filter changed", maf(0.9));
    expect(request.cancels()).toBe(0);
    expect(store.getState().notice).toMatchObject({
      leftBehind: ["vars"],
      stopped: [],
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
    whose check numbers of the variants are `saved`, with key version 1,
    calculated with popnei `savedPopnei`, 0.1.0 unless given, and the
    application `savedApp`, 0.0.9 unless given; the calculation worker gives
    `popnei`, the analysis of the variants has `keyVersion` now, the
    variants file is loaded again with `ploidy`, and the analysis runs
    and gives `numbers`. */
function openedAndRun(options: {
  readonly saved: readonly (number | null)[];
  readonly savedPopnei?: string;
  readonly savedApp?: string;
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
      checks: [
        {
          analysis: "vars",
          numbers: options.saved,
          keyVersion: 1,
          popneiVersion: options.savedPopnei ?? "0.1.0",
          appVersion: options.savedApp ?? "0.0.9",
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
    countsOf: () => ({ numVarsRead: null, counts: null }),
    counts: null,
    statistics: null,
    write: null,
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

describe("WS1 D4 the versions of a check", () => {
  test("verdictOf compares the versions saved with the check with those now", () => {
    const { store } = openedAndRun({
      saved: [0.5, 0.75],
      savedPopnei: "0.0.5",
      savedApp: "0.0.8",
      keyVersion: 2,
    });
    expect(checkOf(store)).toStrictEqual({
      kind: "differs",
      popnei: { saved: "0.0.5", now: "0.1.0" },
      app: { saved: "0.0.8", now: "0.1.0" },
    });
  });

  test("a check saved with the versions now names neither", () => {
    const { store } = openedAndRun({
      saved: [0.5, 0.75],
      savedPopnei: "0.2.0",
      popnei: "0.2.0",
    });
    expect(checkOf(store)).toStrictEqual({
      kind: "differs",
      popnei: null,
      app: null,
    });
  });
});

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
  | { readonly kind: "startRun"; readonly analysis: ModelAnalysis }
  | { readonly kind: "cancelRun"; readonly analysis: ModelAnalysis }
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

/** An analysis of the modelled store: the two fakes, and the statistics
    of each individual, which the populations wait for when the project
    has a threshold on the individuals. */
type ModelAnalysis = "pops" | "vars" | "stats";

/** The place of each analysis in the definitions of the modelled
    store. */
const MODEL_INDEX: Readonly<Record<ModelAnalysis, number>> = {
  pops: 0,
  vars: 1,
  stats: 2,
};

const analysisId = fc.constantFrom<ModelAnalysis>("pops", "vars", "stats");

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

/** A variants file loaded into an empty project, read and run, then the
    load undone, back to a project with no variants file: with single
    steps alone, such an undo was drawn so seldom that a store taking no
    file for the same load as any file failed the properties in 2 runs of
    10. */
const undoToNoFile: fc.Arbitrary<readonly Step[]> = analysisId.map(
  (analysis): readonly Step[] => [
    { kind: "open", empty: true },
    {
      kind: "command",
      command: { name: "loadVariants", bind: () => loadPanel(VARIANTS_ID) },
    },
    { kind: "read", ok: true },
    { kind: "startRun", analysis },
    { kind: "undo" },
  ],
);

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
      { arbitrary: undoToNoFile, weight: 1 },
      { arbitrary: csvReadAgain, weight: 1 },
    ),
    { maxLength: 30, size: "max" },
  )
  .map((groups) => groups.flat());

/** A request the fake `send` was given, as the model follows it. */
interface ModelRequest {
  readonly sent: SentRequest;
  readonly analysis: ModelAnalysis;
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
    case "reopenFailed":
      return {
        kind: "failed",
        error: { kind, name: "panel.vcf", message: "a range refused" },
      };
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
  /** The list of the individuals kept each client gave, in order. */
  readonly lists: readonly ListGiven[];
  /** Carries out one step, and updates the model. */
  readonly run: (s: Step) => void;
} {
  const { analyses: twoFakes, stats, lists } = fakeAnalyses();
  const analyses = [...twoFakes, stats];
  const { send, sent } = fakeSend();
  const store = createStore({
    first: emptyProject("popgen"),
    analyses,
    send,
    countsOf: (r) => ({
      numVarsRead: r.kind === "vars" ? r.numVars : null,
      counts: null,
    }),
    counts: null,
    statistics: FAKE_STATISTICS,
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes: 1024 * 1024 * 1024,
    maxUndoSteps: 200,
  });
  store.popneiReady("0.1.0");
  store.open(sampleProject());
  const model: ModelRequest[] = [];
  const results = new Map<string, TestResult>();
  const inFlight = (): ModelRequest[] => model.filter((r) => !r.ended);
  const currentKey = (analysis: ModelAnalysis): string | null =>
    keyGiven(store, analyses, analysis);
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
  /** Follows the requests the store sent, `handles`, from a startRun or
      a runEnded: each sent stopped the requests named first. */
  const track = (
    handles: readonly Run<TestResult | Written<never>>[],
  ): void => {
    if (handles.length > 0) {
      stopNamed();
    }
    for (const handle of handles) {
      const request = sent.find((one) => one.run === handle);
      if (request === undefined) {
        throw new Error("popnei_web defect: a handle the fake did not give");
      }
      model.push({
        sent: request,
        analysis:
          request.job.analysis === "pops"
            ? "pops"
            : request.job.analysis === "vars"
              ? "vars"
              : "stats",
        ended: false,
        named: false,
        mustCancel: false,
        mayCancel: false,
      });
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
      case "startRun":
        track(store.startRun(s.analysis) ?? []);
        break;
      case "cancelRun":
        for (const r of inFlight()) {
          // A Stop of a Run that waits may stop the statistics it waits
          // for.
          const waitedFor = s.analysis === "pops" && r.analysis === "stats";
          if ((r.analysis === s.analysis || waitedFor) && isCurrent(r)) {
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
            r.analysis === "pops"
              ? popsResult()
              : r.analysis === "vars"
                ? varsResult(s.numVars)
                : statsResult(
                    MODEL_INDIVIDUALS,
                    [0.1, 0.2, 0.3, 0.4],
                    [0.3, 0.3, Number.NaN, 0.4],
                  );
          results.set(r.sent.key, result);
          outcome = { kind: "done", key: r.sent.key, result };
        } else if (s.outcome === "cancelled") {
          outcome = { kind: "cancelled" };
        } else {
          outcome = failure(s.outcome);
        }
        track(store.runEnded(r.sent.run.id, outcome));
        break;
      }
      case "progress": {
        const request = sent[s.which % Math.max(sent.length, 1)];
        request?.progress({ bytesRead: 1, numBytes: 2, pass: 1, numPasses: 1 });
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
      // A change of the load of the variants file stops at once every
      // request in flight not already stopped.
      if (!sameLoadOf(before.project, after.project)) {
        for (const r of inFlight()) {
          if (cancelsBefore.get(r) === 0) {
            r.mustCancel = true;
          }
        }
      }
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
  return { store, analyses, model, results, lists, run };
}

/** The individuals of every variants file the modelled store reads. */
const MODEL_INDIVIDUALS: readonly string[] = ["i1", "i2", "i3", "i4"];

/** The key the current project of `store` gives the analysis `analysis`
    of the modelled store, by the keys spec, whatever the lock by the
    individuals kept; `null` when `projectNeeds`, `individualListNeeds`
    for an analysis that reads the filters of individuals, or its `needs`
    gives a reason. */
function keyGiven(
  store: Store<TestResult>,
  analyses: readonly AnalysisDef<TestJob, TestResult>[],
  analysis: ModelAnalysis,
): string | null {
  const state = store.getState();
  const project = state.project;
  const def = analyses[MODEL_INDEX[analysis]];
  if (def === undefined) {
    throw new Error(`popnei_web defect: no analysis ${analysis}`);
  }
  const listReason = def.filtersRead.individuals
    ? (individualListNeeds(project)?.reason ?? null)
    : null;
  const reason = projectNeeds(project) ?? listReason ?? def.needs(project);
  return reason === null
    ? keyOf(def, project, state.popneiVersion ?? "", createKeyMemo())
    : null;
}

/** Whether two projects hold the same load of the variants file: the
    same load id and read options, or no file in both. */
function sameLoadOf(a: Project, b: Project): boolean {
  const load = (p: Project): string =>
    p.variants === null
      ? "none"
      : JSON.stringify([p.variants.fileId, p.variants.readOptions]);
  return load(a) === load(b);
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
          const listReason = individualListNeeds(project)?.reason ?? null;
          analyses.forEach((def, index) => {
            const status = state.analyses[index]?.status;
            const reason =
              common ??
              (def.filtersRead.individuals ? listReason : null) ??
              def.needs(project);
            if (reason !== null) {
              expect(status).toStrictEqual({ kind: "locked", reason });
              return;
            }
            const version = state.popneiVersion ?? "";
            const key = keyOf(def, project, version, createKeyMemo());
            if (status?.kind === "locked") {
              // The lock by the individuals kept, which has a key.
              expect(status.reason).toBe(
                keptNoneReason(project, state.individualsKept),
              );
              return;
            }
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

  test("the notice of each change lists exactly the analyses done before it and not after it, with its cause, and those whose calculations a change of the load stopped", () => {
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
          // A change of the load stops at once every calculation in
          // flight not already being stopped, and the notice lists them.
          // A Run that waits for the statistics is a calculation too,
          // shown running or named in the notice.
          const running = new Set([
            ...before.runs.filter((r) => !r.stopping).map((r) => r.analysis),
            ...before.analyses
              .filter(
                (view) =>
                  view.status.kind === "running" &&
                  view.status.waitsForStatistics,
              )
              .map((view) => view.id),
            ...(before.notice?.leftBehind ?? []),
          ]);
          const stopped = sameLoadOf(before.project, after.project)
            ? []
            : after.analyses
                .map((view) => view.id)
                .filter((id) => running.has(id));
          expect(after.notice?.stopped ?? []).toStrictEqual(stopped);
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
        eachStep(drawn, ({ store, analyses, model }) => {
          const state = store.getState();
          for (const r of model) {
            if (r.ended) {
              continue;
            }
            const current =
              keyGiven(store, analyses, r.analysis) === r.sent.key;
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

// The individuals kept, from stage 3: the fakes of the populations, of
// the variants and of the statistics of each individual, in that order,
// on the five individuals of the worked case of individualsKept.md.

/** The threshold of 0.2 on the proportion of missing genotypes of each
    individual, which keeps `a`, `b` and `d` of the worked case. */
const MISSING_AT_02: IndividualFilter = {
  kind: "missing_data",
  maxAllowedMissingRate: 0.2,
};

/** A store with the fake statistics of each individual, popnei 0.1.0,
    and the project of the five individuals opened with the filters of
    individuals `filters`, and a cache of `cacheMaxBytes`. */
function storeOfFive(
  filters: readonly IndividualFilter[],
  cacheMaxBytes: number = 1024 * 1024,
): {
  readonly store: Store<TestResult>;
  readonly analyses: readonly AnalysisDef<TestJob, TestResult>[];
  readonly sent: SentRequest[];
  readonly lists: readonly ListGiven[];
} {
  const { analyses: twoFakes, stats, lists } = fakeAnalyses();
  const analyses = [...twoFakes, stats];
  const { send, sent } = fakeSend();
  const store = createStore({
    first: emptyProject("popgen"),
    analyses,
    send,
    countsOf: (r) => ({
      numVarsRead: r.kind === "vars" ? r.numVars : null,
      counts: null,
    }),
    counts: null,
    statistics: FAKE_STATISTICS,
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes,
    maxUndoSteps: 200,
  });
  store.popneiReady("0.1.0");
  store.open(fiveIndividualsProject(filters));
  return { store, analyses, sent, lists };
}

/** The state the store gives the analysis `id`. */
function statusIn(
  store: Store<TestResult>,
  id: string,
): AnalysisStatus<TestResult> {
  const view = store.getState().analyses.find((one) => one.id === id);
  if (view === undefined) {
    throw new Error(`popnei_web defect: no analysis ${id}`);
  }
  return view.status;
}

/** The key the keys spec gives the definition `def` for the current
    project of `store`, made with a memo of its own. */
function keyOfNow(
  store: Store<TestResult>,
  def: AnalysisDef<TestJob, TestResult> | undefined,
): string {
  if (def === undefined) {
    throw new Error("popnei_web defect: no definition");
  }
  return keyOf(def, store.getState().project, "0.1.0", createKeyMemo());
}

describe("VS3 D4 the individuals kept and a Run that waits", () => {
  test("with no filter of individuals, a Run of the analysis that reads them sends at once, its client giving no list", () => {
    const { store, sent, lists } = storeOfFive([]);
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "known",
      individuals: null,
    });

    const handles = store.startRun("pops");

    expect(handles).toStrictEqual([sentAt(sent, 0).run]);
    expect(sentAt(sent, 0).job.analysis).toBe("pops");
    expect(lists).toStrictEqual([{ analysis: "pops", individuals: null }]);
  });

  test("with a threshold of 0.2, the Run calculates the statistics first, waits for them, and then sends its request with a, b and d", () => {
    const { store, analyses, sent, lists } = storeOfFive([MISSING_AT_02]);
    const key = keyOfNow(store, analyses[0]);
    expect(statusIn(store, "pops")).toStrictEqual({ kind: "ready", key });
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "needsStatistics",
    });

    const handles = store.startRun("pops");
    const stats = sentAt(sent, 0);
    expect(handles).toStrictEqual([stats.run]);
    expect(stats.job.analysis).toBe("stats");
    expect(stats.key).toBe(keyOfNow(store, analyses[2]));
    expect(statusIn(store, "pops")).toStrictEqual({
      kind: "running",
      key,
      runId: stats.run.id,
      progress: null,
      waitsForStatistics: true,
    });
    expect(statusIn(store, "stats")).toMatchObject({
      kind: "running",
      runId: stats.run.id,
      waitsForStatistics: false,
    });
    const progress = { bytesRead: 3, numBytes: 10, pass: 1, numPasses: 1 };
    stats.progress(progress);
    expect(statusIn(store, "pops")).toMatchObject({ progress });

    const next = store.runEnded(stats.run.id, doneWith(stats, fiveStats()));

    const own = sentAt(sent, 1);
    expect(next).toStrictEqual([own.run]);
    expect(own.job.analysis).toBe("pops");
    expect(own.key).toBe(key);
    expect(lists).toStrictEqual([
      { analysis: "stats", individuals: null },
      { analysis: "pops", individuals: ["a", "b", "d"] },
    ]);
    expect(statusIn(store, "pops")).toStrictEqual({
      kind: "running",
      key,
      runId: own.run.id,
      progress: null,
      waitsForStatistics: false,
    });
    expect(store.getState().individualsKept).toStrictEqual({
      list: { kind: "known", individuals: ["a", "b", "d"] },
      byLists: ["a", "b", "c", "d", "e"],
      counts: [{ kind: "missing_data", given: 5, kept: 3 }],
    });
  });

  test("cancelRun of the analysis while it waits stops the statistics it started", () => {
    const { store, analyses, sent } = storeOfFive([MISSING_AT_02]);
    store.startRun("pops");
    const stats = sentAt(sent, 0);

    store.cancelRun("pops");

    expect(stats.cancels()).toBe(1);
    expect(statusIn(store, "pops")).toStrictEqual({
      kind: "ready",
      key: keyOfNow(store, analyses[0]),
    });
    expect(store.runEnded(stats.run.id, { kind: "cancelled" })).toStrictEqual(
      [],
    );
    expect(sent).toHaveLength(1);
  });

  test("with the Run of the statistics pressed first, the Run that waits sends nothing, and its cancelRun stops nothing but its wait", () => {
    const { store, sent } = storeOfFive([MISSING_AT_02]);
    expect(store.startRun("stats")).toStrictEqual([sentAt(sent, 0).run]);
    const stats = sentAt(sent, 0);

    expect(store.startRun("pops")).toStrictEqual([]);
    expect(sent).toHaveLength(1);
    expect(statusIn(store, "pops")).toMatchObject({
      kind: "running",
      runId: stats.run.id,
      waitsForStatistics: true,
    });
    store.cancelRun("pops");

    expect(stats.cancels()).toBe(0);
    expect(statusIn(store, "pops").kind).toBe("ready");
    expect(statusIn(store, "stats").kind).toBe("running");
    expect(
      store.runEnded(stats.run.id, doneWith(stats, fiveStats())),
    ).toStrictEqual([]);
    expect(sent).toHaveLength(1);
  });

  test("with a threshold of 0.01, the statistics keep no individual: the analysis is locked with keptNoneReason, and nothing is sent for it", () => {
    const { store, sent, lists } = storeOfFive([
      { kind: "missing_data", maxAllowedMissingRate: 0.01 },
    ]);
    store.startRun("pops");
    const stats = sentAt(sent, 0);

    const next = store.runEnded(stats.run.id, doneWith(stats, fiveStats()));

    expect(next).toStrictEqual([]);
    expect(sent).toHaveLength(1);
    expect(lists).toStrictEqual([{ analysis: "stats", individuals: null }]);
    expect(statusIn(store, "pops")).toStrictEqual({
      kind: "locked",
      reason:
        "The filters of individuals keep none of the 5 individuals of panel.nei. Loosen them in the Variants step.",
    });
    expect(store.startRun("pops")).toBeNull();
  });

  test("a threshold moved while the Run waits leaves the wait behind in the notice; the statistics end and it sends nothing, and a new Run sends at once", () => {
    const { store, sent, lists } = storeOfFive([MISSING_AT_02]);
    store.startRun("pops");
    const stats = sentAt(sent, 0);

    store.apply("the missing data filter of the individuals changed", (p) =>
      setIndividualFilter(p, {
        kind: "missing_data",
        maxAllowedMissingRate: 0.3,
      }),
    );

    expect(store.getState().notice?.leftBehind).toStrictEqual(["pops"]);
    expect(stats.cancels()).toBe(0);
    expect(statusIn(store, "pops").kind).toBe("ready");
    expect(statusIn(store, "stats").kind).toBe("running");
    expect(
      store.runEnded(stats.run.id, doneWith(stats, fiveStats())),
    ).toStrictEqual([]);
    expect(sent).toHaveLength(1);
    expect(store.getState().notice).toBeNull();
    expect(statusIn(store, "pops").kind).toBe("ready");

    expect(store.startRun("pops")).toStrictEqual([sentAt(sent, 1).run]);
    expect(lists.at(-1)).toStrictEqual({
      analysis: "pops",
      individuals: ["a", "b", "c", "d"],
    });
  });

  test("a refusal of the statistics by popnei shows in the analysis as the error of the statistics, and its startRun gives null", () => {
    const { store, analyses, sent } = storeOfFive([MISSING_AT_02]);
    store.startRun("pops");
    const stats = sentAt(sent, 0);

    const next = store.runEnded(stats.run.id, {
      kind: "failed",
      error: { kind: "popnei", message: "the pass gave no variant" },
    });

    expect(next).toStrictEqual([]);
    const refused = { kind: "refused", message: "the pass gave no variant" };
    expect(statusIn(store, "pops")).toStrictEqual({
      kind: "error",
      key: keyOfNow(store, analyses[0]),
      error: refused,
      ofStatistics: true,
    });
    expect(statusIn(store, "stats")).toMatchObject({
      kind: "error",
      error: refused,
      ofStatistics: false,
    });
    expect(store.startRun("pops")).toBeNull();
    expect(sent).toHaveLength(1);
  });

  test("after a failure of the statistics that is not popnei's, startRun of the analysis forgets it and starts the statistics again", () => {
    const { store, sent } = storeOfFive([MISSING_AT_02]);
    store.startRun("pops");
    const error = { kind: "workerFailed", message: "out of memory" } as const;
    store.runEnded(sentAt(sent, 0).run.id, { kind: "failed", error });
    expect(statusIn(store, "pops")).toMatchObject({
      kind: "error",
      error: { kind: "failed", error },
      ofStatistics: true,
    });

    const handles = store.startRun("pops");

    const again = sentAt(sent, 1);
    expect(handles).toStrictEqual([again.run]);
    expect(again.job.analysis).toBe("stats");
    expect(statusIn(store, "stats").kind).toBe("running");
    expect(statusIn(store, "pops")).toMatchObject({
      kind: "running",
      runId: again.run.id,
      waitsForStatistics: true,
    });
  });

  test("cancelRun of the statistics stops their request, and the Run that waited for them ends", () => {
    const { store, sent } = storeOfFive([MISSING_AT_02]);
    store.startRun("pops");
    const stats = sentAt(sent, 0);

    store.cancelRun("stats");

    expect(stats.cancels()).toBe(1);
    expect(statusIn(store, "pops").kind).toBe("ready");
    expect(store.runEnded(stats.run.id, { kind: "cancelled" })).toStrictEqual(
      [],
    );
    expect(sent).toHaveLength(1);
  });

  test("a new variants file ends the Run that waits at once, its analysis in stopped with the statistics", () => {
    const { store, sent } = storeOfFive([MISSING_AT_02]);
    store.startRun("pops");
    const stats = sentAt(sent, 0);

    store.apply("a variants file was loaded", loadPanel(OTHER_VARIANTS_ID));

    expect(stats.cancels()).toBe(1);
    expect(store.getState().notice).toMatchObject({
      stopped: ["pops", "stats"],
      leftBehind: [],
    });
  });
});

describe("VS3 D4 a list of individuals popnei would refuse", () => {
  test("a list to keep that names z, not in the file, locks the analysis that reads the filters of individuals with its reason; the statistics are ready, and individualsKept is null", () => {
    const { store } = storeOfFive([{ kind: "keep", individuals: ["a", "z"] }]);
    const reason = individualListNeeds(store.getState().project)?.reason;
    expect(reason).toMatch(/^The list of /);

    expect(statusIn(store, "pops")).toStrictEqual({ kind: "locked", reason });
    expect(statusIn(store, "stats").kind).toBe("ready");
    expect(statusIn(store, "vars").kind).toBe("ready");
    expect(store.getState().individualsKept).toBeNull();
  });
});

describe("VS3 D4 the key whatever the lock, and the lock from the cache", () => {
  test("an undo back to a threshold whose statistics the cache dropped shows the analysis done again with the same result, under keyOf, and the list needs the statistics", () => {
    // The statistics are 90 bytes, the two results 800 each: the third
    // put, over 1,650 bytes, drops the oldest entry, the statistics.
    const { store, analyses, sent } = storeOfFive([MISSING_AT_02], 1650);
    store.startRun("pops");
    const stats = sentAt(sent, 0);
    store.runEnded(stats.run.id, doneWith(stats, fiveStats()));
    const pops = sentAt(sent, 1);
    const result = popsResult();
    store.runEnded(pops.run.id, doneWith(pops, result));
    store.apply("the MAF filter changed", maf(0.9));
    expect(statusIn(store, "pops").kind).toBe("removed");
    store.startRun("vars");
    const vars = sentAt(sent, 2);
    store.runEnded(vars.run.id, doneWith(vars, varsResult(null)));

    store.undo();

    const status = statusIn(store, "pops");
    expect(status.kind === "done" && status.result).toBe(result);
    expect(status).toMatchObject({ key: keyOfNow(store, analyses[0]) });
    expect(statusIn(store, "stats").kind).toBe("ready");
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "needsStatistics",
    });
  });

  test("the lock is worked out again from the cache: the statistics put by a Calculate change the state with no command, and the list is known", () => {
    const { store, sent } = storeOfFive([MISSING_AT_02]);
    store.startRun("stats");
    const stats = sentAt(sent, 0);
    const before = store.getState();
    expect(before.individualsKept?.list).toStrictEqual({
      kind: "needsStatistics",
    });

    store.runEnded(stats.run.id, doneWith(stats, fiveStats()));

    const after = store.getState();
    expect(after).not.toBe(before);
    expect(after.project).toBe(before.project);
    expect(after.individualsKept?.list).toStrictEqual({
      kind: "known",
      individuals: ["a", "b", "d"],
    });
    expect(statusIn(store, "pops").kind).toBe("ready");
  });

  test("a put of a result larger than the bound keeps the statistics under the key the project gives them, and the list stays known", () => {
    const { store, sent } = storeOfFive([MISSING_AT_02], 200);
    store.startRun("stats");
    const stats = sentAt(sent, 0);
    store.runEnded(stats.run.id, doneWith(stats, fiveStats()));
    store.startRun("vars");
    const vars = sentAt(sent, 1);

    store.runEnded(vars.run.id, doneWith(vars, varsResult(null)));

    expect(statusIn(store, "stats").kind).toBe("done");
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "known",
      individuals: ["a", "b", "d"],
    });
  });
});

describe("VS3 D7 the properties of the store of stage 3", () => {
  test("a result is shown only while it is under a key the project gives, whatever the lock by the individuals kept", () => {
    fc.assert(
      fc.property(steps, (drawn) => {
        eachStep(drawn, ({ store, analyses, results }) => {
          const state = store.getState();
          for (const id of ["pops", "vars", "stats"] as const) {
            const status = state.analyses[MODEL_INDEX[id]]?.status;
            const key = keyGiven(store, analyses, id);
            if (key === null) {
              expect(status?.kind).toBe("locked");
              continue;
            }
            // The cache of the modelled store drops nothing, so every
            // result put is there, and shown under the key it was put
            // under, locked by the individuals kept or not.
            const result = results.get(key);
            if (result === undefined) {
              expect(status?.kind).not.toBe("done");
            } else {
              expect(status).toMatchObject({ kind: "done", key });
              expect(status?.kind === "done" && status.result).toBe(result);
            }
          }
        });
      }),
    );
  });

  test("the list given to a request is individualsKept of its project and of the statistics under the key that project gives them", () => {
    fc.assert(
      fc.property(steps, (drawn) => {
        const { store, analyses, results, lists, run } = modelledStore();
        let seen = 0;
        for (const s of drawn) {
          run(s);
          const project = store.getState().project;
          const statsKey = keyGiven(store, analyses, "stats");
          const cached = statsKey === null ? undefined : results.get(statsKey);
          const kept = individualsKept(
            project,
            cached?.kind === "stats" ? cached.stats : null,
          );
          for (const given of lists.slice(seen)) {
            if (given.analysis === "pops") {
              expect(kept?.list).toStrictEqual({
                kind: "known",
                individuals: given.individuals,
              });
              expect(given.individuals).not.toStrictEqual([]);
            } else {
              expect(given.individuals).toBeNull();
            }
          }
          seen = lists.length;
        }
      }),
    );
  });
});

describe("VS3 D4 a Run that waits, stopped as a calculation", () => {
  /** A store whose Run of the populations waits for the statistics, and
      whose threshold was then moved, leaving the wait behind. */
  function storeWithWaitLeftBehind(): ReturnType<typeof storeOfFive> {
    const made = storeOfFive([MISSING_AT_02]);
    made.store.startRun("pops");
    made.store.apply(
      "the missing data filter of the individuals changed",
      (p) =>
        setIndividualFilter(p, {
          kind: "missing_data",
          maxAllowedMissingRate: 0.3,
        }),
    );
    expect(made.store.getState().notice?.leftBehind).toStrictEqual(["pops"]);
    return made;
  }

  test("an undo while the statistics run gives the wait back, and it sends its request when they end", () => {
    const { store, sent, lists } = storeWithWaitLeftBehind();
    store.undo();
    expect(statusIn(store, "pops")).toMatchObject({
      kind: "running",
      waitsForStatistics: true,
    });
    const stats = sentAt(sent, 0);

    const next = store.runEnded(stats.run.id, doneWith(stats, fiveStats()));

    expect(next).toStrictEqual([sentAt(sent, 1).run]);
    expect(lists.at(-1)).toStrictEqual({
      analysis: "pops",
      individuals: ["a", "b", "d"],
    });
  });

  test("closing the notice ends the wait it left behind, and the statistics go on", () => {
    const { store, sent } = storeWithWaitLeftBehind();
    store.dismissNotice();
    store.undo();

    expect(statusIn(store, "pops").kind).toBe("ready");
    expect(sentAt(sent, 0).cancels()).toBe(0);
  });

  test("a second command ends the wait the notice left behind", () => {
    const { store } = storeWithWaitLeftBehind();
    store.apply("the MAF filter changed", maf(0.9));
    expect(store.getState().notice?.leftBehind).toStrictEqual(["stats"]);
    store.undo();
    store.undo();

    expect(statusIn(store, "pops").kind).toBe("ready");
  });

  test("a startRun that sends ends the waits left behind", () => {
    const { store } = storeWithWaitLeftBehind();
    store.startRun("vars");
    expect(store.getState().notice).toBeNull();
    store.undo();

    expect(statusIn(store, "pops").kind).toBe("ready");
  });

  test("a Run that waits for statistics already in flight stops the calculations left behind", () => {
    const { store, sent } = storeOfFive([]);
    store.startRun("pops");
    const pops = sentAt(sent, 0);
    store.startRun("stats");
    const stats = sentAt(sent, 1);
    store.apply("the missing data filter of the individuals changed", (p) =>
      setIndividualFilter(p, MISSING_AT_02),
    );
    expect(store.getState().notice?.leftBehind).toStrictEqual(["pops"]);

    const handles = store.startRun("pops");

    expect(handles).toStrictEqual([]);
    expect(pops.cancels()).toBe(1);
    expect(stats.cancels()).toBe(0);
    expect(sent).toHaveLength(2);
    expect(store.getState().notice).toBeNull();
    expect(statusIn(store, "pops")).toMatchObject({
      kind: "running",
      waitsForStatistics: true,
    });
  });

  test("a Run that waits for the same statistics in flight ends the wait left behind", () => {
    const { store, sent } = storeWithWaitLeftBehind();

    expect(store.startRun("pops")).toStrictEqual([]);

    expect(store.getState().notice).toBeNull();
    expect(sent).toHaveLength(1);
    store.undo();
    expect(statusIn(store, "pops").kind).toBe("ready");
  });

  test("an opening and another version of popnei end every wait", () => {
    const opened = storeOfFive([MISSING_AT_02]);
    opened.store.startRun("pops");
    opened.store.open(opened.store.getState().project);
    expect(statusIn(opened.store, "pops").kind).toBe("ready");
    expect(sentAt(opened.sent, 0).cancels()).toBe(1);

    const upgraded = storeOfFive([MISSING_AT_02]);
    upgraded.store.startRun("pops");
    upgraded.store.popneiReady("0.2.0");
    expect(statusIn(upgraded.store, "pops").kind).toBe("ready");
    expect(sentAt(upgraded.sent, 0).cancels()).toBe(1);
  });

  test("a listener that throws on a Run that waits takes the wait out and stops the statistics it sent", () => {
    const { store, sent } = storeOfFive([MISSING_AT_02]);
    const stop = store.subscribe(() => {
      throw new Error("a screen that throws");
    });

    expect(() => store.startRun("pops")).toThrow("a screen that throws");

    stop();
    expect(sentAt(sent, 0).cancels()).toBe(1);
    expect(statusIn(store, "pops").kind).toBe("ready");
    expect(store.getState().runs).toStrictEqual([]);
  });

  test("a listener that throws when the statistics end takes out and stops the request sent for the Run that waited", () => {
    const { store, sent } = storeOfFive([MISSING_AT_02]);
    store.startRun("pops");
    const stats = sentAt(sent, 0);
    const stop = store.subscribe(() => {
      throw new Error("a screen that throws");
    });

    expect(() =>
      store.runEnded(stats.run.id, doneWith(stats, fiveStats())),
    ).toThrow("a screen that throws");

    stop();
    expect(sentAt(sent, 1).cancels()).toBe(1);
    expect(store.getState().runs).toStrictEqual([]);
    expect(statusIn(store, "pops").kind).toBe("ready");
  });
});

describe("VS3 D4 the statistics of each individual given to the store", () => {
  test("createStore throws on statistics of no definition, and on a definition of the statistics that reads the filters of individuals", () => {
    const { analyses, stats } = fakeAnalyses();
    const { send } = fakeSend();
    const config = {
      first: emptyProject("popgen"),
      send,
      countsOf: () => ({ numVarsRead: null, counts: null }),
      counts: null,
      write: null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024,
      maxUndoSteps: 200,
    };
    expect(() =>
      createStore({ ...config, analyses, statistics: FAKE_STATISTICS }),
    ).toThrow(
      /^popnei_web defect: createStore was given the analysis of the statistics "stats"/,
    );
    expect(() =>
      createStore({
        ...config,
        analyses: [
          ...analyses,
          { ...stats, filtersRead: { variants: true, individuals: true } },
        ],
        statistics: FAKE_STATISTICS,
      }),
    ).toThrow(
      /^popnei_web defect: the analysis of the statistics "stats" reads the filters of individuals/,
    );
  });

  test("statistics of other individuals than the file's are a defect kept under their key, and nothing of them is kept", () => {
    const { store, sent } = storeOfFive([MISSING_AT_02]);
    store.startRun("pops");
    const stats = sentAt(sent, 0);

    expect(() =>
      store.runEnded(
        stats.run.id,
        doneWith(stats, statsResult(["a", "b"], [0, 0], [0, 0])),
      ),
    ).toThrow(/^popnei_web defect: the statistics of each individual are not/);

    expect(statusIn(store, "stats")).toMatchObject({
      kind: "error",
      error: { kind: "failed", error: { kind: "defect" } },
    });
    expect(statusIn(store, "pops")).toMatchObject({
      kind: "error",
      ofStatistics: true,
    });
    expect(store.getState().individualsKept?.list).toStrictEqual({
      kind: "needsStatistics",
    });
    expect(sent).toHaveLength(1);
  });

  test("the individuals kept are the same object until the project or the statistics change", () => {
    const { store, sent } = storeOfFive([MISSING_AT_02]);
    const first = store.getState().individualsKept;
    store.startRun("vars");
    expect(store.getState().individualsKept).toBe(first);
    store.startRun("stats");
    const stats = sentAt(sent, 1);
    store.runEnded(stats.run.id, doneWith(stats, fiveStats()));
    expect(store.getState().individualsKept).not.toBe(first);
  });
});

describe("VS3 D4 the failure of the statistics, and a read that leaves a wait behind", () => {
  test("with no threshold, a refusal of the statistics is theirs alone: the analysis that reads the filters of individuals is ready", () => {
    const { store, sent } = storeOfFive([]);
    store.startRun("stats");

    store.runEnded(sentAt(sent, 0).run.id, {
      kind: "failed",
      error: { kind: "popnei", message: "the pass gave no variant" },
    });

    expect(statusIn(store, "stats").kind).toBe("error");
    expect(statusIn(store, "pops").kind).toBe("ready");
  });

  test("the failure of the statistics forgotten by a startRun of the analysis stays forgotten when that Run is stopped", () => {
    const { store, sent } = storeOfFive([MISSING_AT_02]);
    store.startRun("pops");
    const error = { kind: "workerFailed", message: "out of memory" } as const;
    store.runEnded(sentAt(sent, 0).run.id, { kind: "failed", error });
    store.startRun("pops");

    store.cancelRun("pops");
    store.runEnded(sentAt(sent, 1).run.id, { kind: "cancelled" });

    expect(statusIn(store, "stats").kind).toBe("ready");
    expect(statusIn(store, "pops").kind).toBe("ready");
  });

  test("a read that changes the key of a Run that waits ends the wait at once, and no later notice names it", () => {
    const { analyses: twoFakes, stats } = fakeAnalyses();
    const [pops, vars] = twoFakes;
    if (pops === undefined || vars === undefined) {
      throw new Error("popnei_web defect: no fake analyses");
    }
    // Its key holds the individuals table, and it runs while the file
    // is read.
    const tabled: AnalysisDef<TestJob, TestResult> = {
      ...pops,
      keyInputs: (p) => {
        const read = p.individuals?.read;
        return read?.kind === "read" ? { rows: read.table.rows } : null;
      },
      needs: () => null,
    };
    const { send } = fakeSend();
    const store = createStore({
      first: emptyProject("popgen"),
      analyses: [tabled, vars, stats],
      send,
      countsOf: () => ({ numVarsRead: null, counts: null }),
      counts: null,
      statistics: FAKE_STATISTICS,
      write: null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024 * 1024,
      maxUndoSteps: 200,
    });
    store.popneiReady("0.1.0");
    const five = fiveIndividualsProject([MISSING_AT_02]);
    store.open(five);
    store.apply("an individuals file was loaded", loadPops);
    expect(store.startRun("pops")).toHaveLength(1);
    const read = five.individuals?.read;
    if (read?.kind !== "read") {
      throw new Error("popnei_web defect: the five have no table");
    }

    store.individualsRead(INDIVIDUALS_ID, CSV, read);
    expect(store.getState().notice).toBeNull();
    expect(statusIn(store, "pops").kind).toBe("ready");
    store.apply("the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: null }),
    );

    expect(store.getState().notice).toBeNull();
  });
});

describe("VS3 D4 two Runs that wait for the same statistics", () => {
  test("a Stop of one does not stop the statistics the other waits for, and their end sends the other's request alone", () => {
    const { analyses: twoFakes, stats, lists } = fakeAnalyses();
    const [pops] = twoFakes;
    if (pops === undefined) {
      throw new Error("popnei_web defect: no fake analyses");
    }
    const other: AnalysisDef<TestJob, TestResult> = { ...pops, id: "other" };
    const { send, sent } = fakeSend();
    const store = createStore({
      first: emptyProject("popgen"),
      analyses: [...twoFakes, stats, other],
      send,
      countsOf: () => ({ numVarsRead: null, counts: null }),
      counts: null,
      statistics: FAKE_STATISTICS,
      write: null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024 * 1024,
      maxUndoSteps: 200,
    });
    store.popneiReady("0.1.0");
    store.open(fiveIndividualsProject([MISSING_AT_02]));
    store.startRun("pops");
    const statsRequest = sentAt(sent, 0);
    expect(store.startRun("other")).toStrictEqual([]);

    store.cancelRun("pops");

    expect(statsRequest.cancels()).toBe(0);
    expect(statusIn(store, "other")).toMatchObject({
      kind: "running",
      waitsForStatistics: true,
    });
    const next = store.runEnded(
      statsRequest.run.id,
      doneWith(statsRequest, fiveStats()),
    );
    expect(next).toStrictEqual([sentAt(sent, 1).run]);
    // The other is a copy of the populations, whose job it sends.
    expect(sentAt(sent, 1).key).toBe(keyOfNow(store, other));
    expect(lists.at(-1)?.individuals).toStrictEqual(["a", "b", "d"]);
    expect(statusIn(store, "other").kind).toBe("running");
    expect(statusIn(store, "pops").kind).toBe("ready");
  });
});

// The counts of the filters, filled from the pass of every result:
// store.md, "What each filter kept", and "How it is verified", "The
// counts filled".

/** A store with the two fake analyses and the fake counts of the
    filters, third, whose results `fakeCountsOf` makes, and a cache of
    `cacheMaxBytes`: popnei 0.1.0, the variants file loaded and read.
    `given` holds the counts `countsOf` gave, in order. */
function storeWithCounts(cacheMaxBytes: number = 1024 * 1024): {
  readonly store: Store<TestResult>;
  readonly analyses: readonly AnalysisDef<TestJob, TestResult>[];
  readonly calls: Calls;
  readonly sent: SentRequest[];
  readonly given: TestResult[];
} {
  const { analyses: twoFakes, counts, calls } = fakeAnalyses();
  const analyses = [...twoFakes, counts];
  const { send, sent } = fakeSend();
  const given: TestResult[] = [];
  const store = createStore({
    first: emptyProject("popgen"),
    analyses,
    send,
    countsOf: (r) => {
      const found = fakeCountsOf(r);
      if (found.counts !== null) {
        given.push(found.counts);
      }
      return found;
    },
    counts: "counts",
    statistics: null,
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes,
    maxUndoSteps: 200,
  });
  store.popneiReady("0.1.0");
  store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
  store.variantsRead(VARIANTS_ID, VARIANTS_READ);
  return { store, analyses, calls, sent, given };
}

/** The result the state `status` shows, or `null` when it is not
    done. */
function resultOf(status: AnalysisStatus<TestResult>): TestResult | null {
  return status.kind === "done" ? status.result : null;
}

describe("VS3 D5 the counts filled", () => {
  test("runEnded of a result of the analysis of the variants puts the counts countsOf gave under the key of the counts for its request's project, and the counts are done with no Count", () => {
    const { store, analyses, calls, sent, given } = storeWithCounts();
    store.startRun("vars");
    const vars = sentAt(sent, 0);
    calls.given.splice(0);

    store.runEnded(vars.run.id, doneWith(vars, varsResult(1200)));

    const counts = statusIn(store, "counts");
    expect(given).toHaveLength(1);
    expect(counts).toStrictEqual({
      kind: "done",
      key: keyOfNow(store, analyses[2]),
      result: given[0],
      warnings: [],
      check: null,
    });
    expect(resultOf(counts)).toBe(given[0]);
    expect(sent).toHaveLength(1);
    expect(calls.given).toStrictEqual([
      "vars warnings of vars",
      "vars checkNumbers of vars",
      "counts warnings of counts",
      "counts checkNumbers of counts",
    ]);
    expect(store.getState().project.variants?.read).toMatchObject({
      numVars: 1200,
    });
  });

  test("a command that changes the filter of the variants does not name the counts among the results removed, and its undo shows them done again", () => {
    const { store, sent, given } = storeWithCounts();
    store.startRun("vars");
    const vars = sentAt(sent, 0);
    store.runEnded(vars.run.id, doneWith(vars, varsResult(1200)));

    store.apply("the MAF filter changed", maf(0.9));

    expect(store.getState().notice?.removed).toStrictEqual(["vars"]);
    expect(statusIn(store, "counts").kind).toBe("ready");
    store.undo();
    expect(resultOf(statusIn(store, "counts"))).toBe(given[0]);
    expect(store.getState().notice).toBeNull();
  });

  test("a result that arrives late fills the counts of its own project, which an undo shows done", () => {
    const { store, analyses, sent, given } = storeWithCounts();
    store.startRun("vars");
    const vars = sentAt(sent, 0);
    const keyBefore = keyOfNow(store, analyses[2]);
    store.apply("the MAF filter changed", maf(0.9));

    store.runEnded(vars.run.id, doneWith(vars, varsResult(1200)));

    expect(statusIn(store, "counts").kind).toBe("ready");
    store.undo();
    const counts = statusIn(store, "counts");
    expect(counts).toMatchObject({ kind: "done", key: keyBefore });
    expect(resultOf(counts)).toBe(given[0]);
  });

  test("with a cache whose bound holds one result, the result put before the counts is not dropped by their put", () => {
    // The result is 800 bytes and its counts 400: their put goes over the
    // bound of 1,000 bytes, and the late result is not one the project
    // shows, so only the rule of the counts keeps it.
    const { store, sent } = storeWithCounts(1000);
    store.startRun("vars");
    const vars = sentAt(sent, 0);
    const result = varsResult(1200);
    store.apply("the MAF filter changed", maf(0.9));

    store.runEnded(vars.run.id, doneWith(vars, result));

    store.undo();
    expect(resultOf(statusIn(store, "vars"))).toBe(result);
    expect(statusIn(store, "counts").kind).toBe("done");
  });

  test("a Count in flight for the same key goes on when the counts are filled, and its result replaces them", () => {
    const { store, sent } = storeWithCounts();
    store.startRun("counts");
    const count = sentAt(sent, 0);
    store.startRun("vars");
    const vars = sentAt(sent, 1);

    store.runEnded(vars.run.id, doneWith(vars, varsResult(1200)));

    expect(statusIn(store, "counts").kind).toBe("done");
    expect(count.cancels()).toBe(0);
    expect(store.getState().runs.map((run) => run.runId)).toStrictEqual([
      count.run.id,
    ]);
    const own: TestResult = {
      kind: "counts",
      numVars: 1100,
      kept: new Uint32Array(1),
    };
    store.runEnded(count.run.id, doneWith(count, own));
    expect(resultOf(statusIn(store, "counts"))).toBe(own);
  });

  test("a result whose countsOf gives no counts puts none, and a store with no analysis of the counts keeps none of those it is given", () => {
    const { store, sent } = storeWithCounts();
    store.startRun("vars");
    const vars = sentAt(sent, 0);
    store.runEnded(vars.run.id, doneWith(vars, varsResult(null)));
    expect(statusIn(store, "counts").kind).toBe("ready");

    const { analyses } = fakeAnalyses();
    const { send, sent: sentWithout } = fakeSend();
    const without = createStore({
      first: emptyProject("popgen"),
      analyses,
      send,
      countsOf: fakeCountsOf,
      counts: null,
      statistics: null,
      write: null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024 * 1024,
      maxUndoSteps: 200,
    });
    without.popneiReady("0.1.0");
    without.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
    without.variantsRead(VARIANTS_ID, VARIANTS_READ);
    without.startRun("vars");
    const request = sentAt(sentWithout, 0);
    without.runEnded(request.run.id, doneWith(request, varsResult(1200)));
    expect(statusIn(without, "vars").kind).toBe("done");
    expect(without.getState().project.variants?.read).toMatchObject({
      numVars: 1200,
    });
  });

  test("createStore throws on counts of no definition, and on a definition of the counts that reads the filters of individuals", () => {
    const { analyses, counts } = fakeAnalyses();
    const { send } = fakeSend();
    const config = {
      first: emptyProject("popgen"),
      send,
      countsOf: fakeCountsOf,
      statistics: null,
      write: null,
      appVersion: "0.1.0",
      cacheMaxBytes: 1024,
      maxUndoSteps: 200,
    };
    expect(() =>
      createStore({ ...config, analyses, counts: "counts" }),
    ).toThrow(
      /^popnei_web defect: createStore was given the analysis of the counts "counts"/,
    );
    expect(() =>
      createStore({
        ...config,
        analyses: [
          ...analyses,
          { ...counts, filtersRead: { variants: true, individuals: true } },
        ],
        counts: "counts",
      }),
    ).toThrow(
      /^popnei_web defect: the analysis of the counts "counts" reads the filters of individuals/,
    );
  });
});

// The writing of the filtered variants: store.md, "The writing of the
// filtered variants", and "How it is verified", "The write".

/** A store that writes, with the fakes of the populations, of the
    variants, of the statistics of each individual and of the counts, in
    that order, and a fake `write.send` whose file is a text: popnei
    0.1.0, and the project of the five individuals opened with the MAF
    filter at 0.9 and the filters of individuals `filters`. */
function storeThatWrites(filters: readonly IndividualFilter[] = []): {
  readonly store: Store<TestResult, string>;
  readonly analyses: readonly AnalysisDef<TestJob, TestResult>[];
  readonly sent: SentRequest[];
  readonly writes: SentWrite[];
  readonly lists: readonly ListGiven[];
} {
  const { analyses: twoFakes, stats, counts, lists } = fakeAnalyses();
  const analyses = [...twoFakes, stats, counts];
  const { send, sent, writeSend, writes } = fakeSend();
  const store = createStore({
    first: emptyProject("popgen"),
    analyses,
    send,
    countsOf: writeTestCountsOf,
    counts: "counts",
    statistics: FAKE_STATISTICS,
    write: { send: writeSend, countsOf: fakeWriteCountsOf },
    appVersion: "0.1.0",
    cacheMaxBytes: 1024 * 1024,
    maxUndoSteps: 200,
  });
  store.popneiReady("0.1.0");
  store.open({
    ...fiveIndividualsProject(filters),
    filters: [{ kind: "maf", maxAllowedMaf: 0.9 }],
  });
  return { store, analyses, sent, writes, lists };
}

/** The write `index` the fake `write.send` was given, or a defect. */
function writeAt(writes: readonly SentWrite[], index: number): SentWrite {
  const write = writes[index];
  if (write === undefined) {
    throw new Error(`popnei_web defect: no write ${String(index)} sent`);
  }
  return write;
}

/** The state of the writing, or a defect when the store has none. */
function writeIn(store: Store<TestResult, string>): WriteStatus<string> {
  const write = store.getState().write;
  if (write === null) {
    throw new Error("popnei_web defect: a store with no write");
  }
  return write;
}

/** The state the store that writes gives the analysis `id`. */
function analysisIn(
  store: Store<TestResult, string>,
  id: string,
): AnalysisStatus<TestResult> {
  const view = store.getState().analyses.find((one) => one.id === id);
  if (view === undefined) {
    throw new Error(`popnei_web defect: no analysis ${id}`);
  }
  return view.status;
}

/** The key `writeKeyOf` gives the writing of a `.nei` file of the
    current project, with a memo of its own. */
function writeKeyNow(store: Store<TestResult, string>): string {
  return writeKeyOf(store.getState().project, "nei", "0.1.0", createKeyMemo());
}

/** The store that writes with a write sent and not ended. */
function writing(): ReturnType<typeof storeThatWrites> & {
  readonly write: SentWrite;
} {
  const made = storeThatWrites();
  made.store.startWrite("nei");
  return { ...made, write: writeAt(made.writes, 0) };
}

/** The store that writes with a write done, `file` kept. */
function written(): ReturnType<typeof writing> & {
  readonly file: ReturnType<typeof writtenFile>;
} {
  const made = writing();
  const file = writtenFile(1150, 1200);
  made.store.runEnded(made.write.run.id, {
    kind: "done",
    key: made.write.key,
    result: file,
  });
  return { ...made, file };
}

describe("VS3 D6 the write in the store", () => {
  test("startWrite sends a WriteJob with the load id, the filters of the variants, no list and the format, under writeKeyOf, and the write is running", () => {
    const { store, writes, sent } = storeThatWrites();
    expect(writeIn(store)).toStrictEqual({
      kind: "ready",
      key: writeKeyNow(store),
      dropped: false,
    });

    const handles = store.startWrite("nei");

    const write = writeAt(writes, 0);
    expect(handles).toStrictEqual([write.run]);
    expect(sent).toHaveLength(0);
    expect(write.key).toBe(writeKeyNow(store));
    expect(write.job).toStrictEqual({
      format: "nei",
      fileId: SAMPLE_VARIANTS_ID,
      filters: [{ kind: "maf", maxAllowedMaf: 0.9 }],
      individuals: null,
    });
    expect(writeIn(store)).toStrictEqual({
      kind: "running",
      key: write.key,
      runId: write.run.id,
      progress: null,
      waitsForStatistics: false,
    });
    expect(store.getState().runs).toMatchObject([
      { runId: write.run.id, analysis: null, key: write.key, current: true },
    ]);
    const progress = { bytesRead: 3, numBytes: 10, pass: 1, numPasses: 1 };
    write.progress(progress);
    expect(writeIn(store)).toMatchObject({ progress });
  });

  test("runEnded done: the write is done with what the worker gave, and the cache does not hold it", () => {
    const { store, write, file } = written();

    expect(writeIn(store)).toStrictEqual({
      kind: "done",
      key: write.key,
      written: file,
    });
    // Only the counts of its pass are in the cache, as a result of the
    // counts.
    expect(
      store
        .getState()
        .analyses.filter((view) => view.status.kind === "done")
        .map((view) => view.id),
    ).toStrictEqual(["counts"]);
    expect(analysisIn(store, "counts")).toMatchObject({
      result: { kind: "counts", numVars: 1150 },
    });
    expect(store.getState().runs).toStrictEqual([]);
  });

  test("writeSaved: the write is saved, holds no file, and its size and counts are those of the file", () => {
    const { store, write, file } = written();

    store.writeSaved();

    expect(writeIn(store)).toStrictEqual({
      kind: "saved",
      key: write.key,
      written: {
        format: "nei",
        numBytes: file.numBytes,
        passStats: file.passStats,
      },
    });
  });

  test("writeSaved a second time is a defect", () => {
    const { store } = written();
    store.writeSaved();

    expect(() => {
      store.writeSaved();
    }).toThrow(
      /^popnei_web defect: writeSaved was called with the writing saved/,
    );
  });

  test("a command and its undo after the save give the write ready", () => {
    const { store, write } = written();
    store.writeSaved();

    store.apply("the MAF filter changed", maf(0.8));
    store.undo();

    expect(writeIn(store)).toStrictEqual({
      kind: "ready",
      key: write.key,
      dropped: false,
    });
  });

  test("a command that changes a filter while it is written leaves it behind, with no cancel, and an undo lets it go on", () => {
    const { store, write } = writing();

    store.apply("the MAF filter changed", maf(0.8));

    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "the MAF filter changed" },
      removed: [],
      leftBehind: [],
      stopped: [],
      writeLeftBehind: true,
      writeStopped: false,
      writeDiscarded: false,
    });
    expect(write.cancels()).toBe(0);
    expect(writeIn(store)).toMatchObject({ kind: "ready", dropped: false });
    store.undo();
    expect(write.cancels()).toBe(0);
    expect(writeIn(store)).toMatchObject({
      kind: "running",
      runId: write.run.id,
    });
    expect(store.getState().notice).toBeNull();
  });

  test("a result that arrives after the command is dropped: ready with dropped, no file, its counts in the cache under the old filters and its variants recorded; the next command clears dropped", () => {
    const { store, analyses, write } = writing();
    const countsDef = analyses[3];
    if (countsDef === undefined) {
      throw new Error("popnei_web defect: no fake counts");
    }
    const countsKeyBefore = keyOf(
      countsDef,
      store.getState().project,
      "0.1.0",
      createKeyMemo(),
    );
    store.apply("the MAF filter changed", maf(0.8));

    const next = store.runEnded(write.run.id, {
      kind: "done",
      key: write.key,
      result: writtenFile(1150, 1200),
    });

    expect(next).toStrictEqual([]);
    expect(writeIn(store)).toStrictEqual({
      kind: "ready",
      key: writeKeyNow(store),
      dropped: true,
    });
    expect(store.getState().notice).toBeNull();
    expect(store.getState().project.variants?.read).toMatchObject({
      numVars: 1200,
    });
    store.undo();
    expect(analysisIn(store, "counts")).toMatchObject({
      kind: "done",
      key: countsKeyBefore,
      result: { kind: "counts", numVars: 1150 },
    });
    expect(writeIn(store)).toStrictEqual({
      kind: "ready",
      key: write.key,
      dropped: false,
    });
  });

  test("the write done, then a command that changes a filter: ready with no file, the notice has writeDiscarded, and its undo does not give the file back", () => {
    const { store, write } = written();

    store.apply("the MAF filter changed", maf(0.8));

    expect(writeIn(store)).toMatchObject({ kind: "ready", dropped: false });
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "the MAF filter changed" },
      removed: [],
      leftBehind: [],
      stopped: [],
      writeLeftBehind: false,
      writeStopped: false,
      writeDiscarded: true,
    });
    store.undo();
    expect(writeIn(store)).toStrictEqual({
      kind: "ready",
      key: write.key,
      dropped: false,
    });
    expect(store.getState().notice).toBeNull();
  });

  test("a result with no variant makes the write noVariant, with no file", () => {
    const { store, write } = writing();
    const file = writtenFile(0, 1200);

    store.runEnded(write.run.id, {
      kind: "done",
      key: write.key,
      result: file,
    });

    expect(writeIn(store)).toStrictEqual({
      kind: "noVariant",
      key: write.key,
      written: {
        format: "nei",
        numBytes: file.numBytes,
        passStats: file.passStats,
      },
    });
    expect(analysisIn(store, "counts")).toMatchObject({
      kind: "done",
      result: { kind: "counts", numVars: 0 },
    });
    expect(store.startWrite("nei")).toBeNull();
  });

  test("with a threshold and no statistics, startWrite waits for them; their refusal by popnei puts the write in error with ofStatistics, and startWrite then gives null and sends nothing", () => {
    const { store, sent, writes } = storeThatWrites([MISSING_AT_02]);

    const handles = store.startWrite("nei");

    const stats = sentAt(sent, 0);
    expect(handles).toStrictEqual([stats.run]);
    expect(stats.job.analysis).toBe("stats");
    expect(writes).toHaveLength(0);
    expect(writeIn(store)).toStrictEqual({
      kind: "running",
      key: writeKeyNow(store),
      runId: stats.run.id,
      progress: null,
      waitsForStatistics: true,
    });
    store.runEnded(stats.run.id, {
      kind: "failed",
      error: { kind: "popnei", message: "the pass gave no variant" },
    });
    expect(writeIn(store)).toStrictEqual({
      kind: "error",
      key: writeKeyNow(store),
      error: { kind: "refused", message: "the pass gave no variant" },
      ofStatistics: true,
    });
    expect(store.startWrite("nei")).toBeNull();
    expect(sent).toHaveLength(1);
    expect(writes).toHaveLength(0);
  });

  test("after a workerFailed of the statistics, startWrite starts them again", () => {
    const { store, sent } = storeThatWrites([MISSING_AT_02]);
    store.startWrite("nei");
    const error = { kind: "workerFailed", message: "out of memory" } as const;
    store.runEnded(sentAt(sent, 0).run.id, { kind: "failed", error });
    expect(writeIn(store)).toMatchObject({
      kind: "error",
      error: { kind: "failed", error },
      ofStatistics: true,
    });

    const handles = store.startWrite("nei");

    const again = sentAt(sent, 1);
    expect(handles).toStrictEqual([again.run]);
    expect(again.job.analysis).toBe("stats");
    expect(writeIn(store)).toMatchObject({
      kind: "running",
      runId: again.run.id,
      waitsForStatistics: true,
    });
  });

  test("startRun of an analysis while the file is written does not cancel the write, whose key the project gives", () => {
    const { store, sent, write } = writing();

    store.startRun("vars");

    expect(sent).toHaveLength(1);
    expect(write.cancels()).toBe(0);
    expect(writeIn(store)).toMatchObject({ kind: "running" });
  });

  test("a new variants file loaded cancels the write at once, and the notice has writeStopped", () => {
    const { store, write } = writing();

    store.apply("a variants file was loaded", loadPanel(OTHER_VARIANTS_ID));

    expect(write.cancels()).toBe(1);
    expect(store.getState().notice).toStrictEqual({
      cause: { kind: "command", description: "a variants file was loaded" },
      removed: [],
      leftBehind: [],
      stopped: [],
      writeLeftBehind: false,
      writeStopped: true,
      writeDiscarded: false,
    });
  });
});

describe("VS3 D6 the write in the store, its other rules", () => {
  test("startWrite of a format other than the .nei of the state is a defect, and sends nothing", () => {
    const { store, writes } = storeThatWrites();

    expect(() =>
      // @ts-expect-error -- stage 3 has no format but "nei"
      store.startWrite("vcf"),
    ).toThrow(/^popnei_web defect: startWrite was asked for the format "vcf"/);
    expect(writes).toHaveLength(0);
    expect(writeIn(store).kind).toBe("ready");
  });

  test("a write that waits for statistics already in flight stops the calculations left behind", () => {
    const { store, sent, writes } = storeThatWrites();
    store.startRun("pops");
    const pops = sentAt(sent, 0);
    store.startRun("stats");
    const stats = sentAt(sent, 1);
    store.apply("the missing data filter of the individuals changed", (p) =>
      setIndividualFilter(p, MISSING_AT_02),
    );
    expect(store.getState().notice?.leftBehind).toStrictEqual(["pops"]);

    expect(store.startWrite("nei")).toStrictEqual([]);

    expect(pops.cancels()).toBe(1);
    expect(stats.cancels()).toBe(0);
    expect(writes).toHaveLength(0);
    expect(store.getState().notice).toBeNull();
    expect(writeIn(store)).toMatchObject({
      kind: "running",
      runId: stats.run.id,
      waitsForStatistics: true,
    });
  });

  test("with a threshold, the end of the statistics sends the write with the individuals kept, a, b and d", () => {
    const { store, sent, writes } = storeThatWrites([MISSING_AT_02]);
    store.startWrite("nei");
    const stats = sentAt(sent, 0);

    const next = store.runEnded(stats.run.id, doneWith(stats, fiveStats()));

    const write = writeAt(writes, 0);
    expect(next).toStrictEqual([write.run]);
    expect(write.job.individuals).toStrictEqual(["a", "b", "d"]);
    expect(write.key).toBe(writeKeyNow(store));
    expect(writeIn(store)).toMatchObject({
      kind: "running",
      runId: write.run.id,
      waitsForStatistics: false,
    });
  });

  test("the write is locked by the reason of individualListNeeds, and by keptNoneReason once the statistics keep no individual", () => {
    const refused = storeThatWrites([
      { kind: "keep", individuals: ["a", "z"] },
    ]);
    expect(writeIn(refused.store)).toStrictEqual({
      kind: "locked",
      reason: individualListNeeds(refused.store.getState().project)?.reason,
    });
    expect(refused.store.startWrite("nei")).toBeNull();

    const none = storeThatWrites([
      { kind: "missing_data", maxAllowedMissingRate: 0.01 },
    ]);
    none.store.startWrite("nei");
    const stats = sentAt(none.sent, 0);
    expect(
      none.store.runEnded(stats.run.id, doneWith(stats, fiveStats())),
    ).toStrictEqual([]);
    expect(writeIn(none.store)).toStrictEqual({
      kind: "locked",
      reason:
        "The filters of individuals keep none of the 5 individuals of panel.nei. Loosen them in the Variants step.",
    });
    expect(none.writes).toHaveLength(0);
  });

  test("startWrite gives null while the file is written and while it is done, and writes again once it is saved", () => {
    const { store, writes } = writing();
    expect(store.startWrite("nei")).toBeNull();
    const write = writeAt(writes, 0);
    store.runEnded(write.run.id, {
      kind: "done",
      key: write.key,
      result: writtenFile(1150, 1200),
    });
    expect(store.startWrite("nei")).toBeNull();
    store.writeSaved();

    const handles = store.startWrite("nei");

    expect(handles).toStrictEqual([writeAt(writes, 1).run]);
    expect(writeIn(store)).toMatchObject({ kind: "running" });
  });

  test("cancelWrite stops the write in flight, and the write is ready; a Stop of a write that waits stops the statistics it started", () => {
    const { store, write } = writing();
    store.cancelWrite();
    expect(write.cancels()).toBe(1);
    expect(writeIn(store)).toMatchObject({ kind: "ready" });
    store.runEnded(write.run.id, { kind: "cancelled" });
    expect(writeIn(store)).toMatchObject({ kind: "ready", dropped: false });

    const waiting = storeThatWrites([MISSING_AT_02]);
    waiting.store.startWrite("nei");
    waiting.store.cancelWrite();
    expect(sentAt(waiting.sent, 0).cancels()).toBe(1);
    expect(writeIn(waiting.store)).toMatchObject({ kind: "ready" });
  });

  test("a write left behind is stopped when the notice is closed, and by a startRun and a startWrite that send", () => {
    const closed = writing();
    closed.store.apply("the MAF filter changed", maf(0.8));
    closed.store.dismissNotice();
    expect(closed.write.cancels()).toBe(1);

    const run = writing();
    run.store.apply("the MAF filter changed", maf(0.8));
    run.store.startRun("vars");
    expect(run.write.cancels()).toBe(1);
    expect(run.store.getState().notice).toBeNull();

    const again = writing();
    again.store.apply("the MAF filter changed", maf(0.8));
    again.store.startWrite("nei");
    expect(again.write.cancels()).toBe(1);
    expect(writeAt(again.writes, 1).key).toBe(writeKeyNow(again.store));
  });

  test("a refusal of popnei of the write is kept for the session; another failure until the next change", () => {
    const refused = writing();
    refused.store.runEnded(refused.write.run.id, {
      kind: "failed",
      error: { kind: "popnei", message: "no space" },
    });
    refused.store.apply("the MAF filter changed", maf(0.8));
    refused.store.undo();
    expect(writeIn(refused.store)).toStrictEqual({
      kind: "error",
      key: refused.write.key,
      error: { kind: "refused", message: "no space" },
      ofStatistics: false,
    });
    expect(refused.store.startWrite("nei")).toBeNull();

    const failed = writing();
    const error = { kind: "workerFailed", message: "out of memory" } as const;
    failed.store.runEnded(failed.write.run.id, { kind: "failed", error });
    expect(writeIn(failed.store)).toMatchObject({
      kind: "error",
      error: { kind: "failed", error },
    });
    failed.store.apply("the MAF filter changed", maf(0.8));
    failed.store.undo();
    expect(writeIn(failed.store)).toMatchObject({ kind: "ready" });
  });

  test("a result of a write that is not a file written, and a file given to an analysis, are defects kept under their keys", () => {
    const { store, write, sent } = writing();
    expect(() =>
      store.runEnded(write.run.id, {
        kind: "done",
        key: write.key,
        result: varsResult(10),
      }),
    ).toThrow(
      /^popnei_web defect: the request \d+ of the writing ended with no file written/,
    );
    expect(writeIn(store)).toMatchObject({
      kind: "error",
      error: { kind: "failed", error: { kind: "defect" } },
    });

    store.startRun("vars");
    const vars = sentAt(sent, 0);
    expect(() =>
      store.runEnded(vars.run.id, {
        kind: "done",
        key: vars.key,
        result: writtenFile(10, 10),
      }),
    ).toThrow(
      /^popnei_web defect: the request \d+ of the analysis "vars" ended with a file written/,
    );
  });

  test("an opening and another version of popnei forget the file, with no notice, and the command after them discards none", () => {
    const opened = written();
    opened.store.open(opened.store.getState().project);
    expect(writeIn(opened.store)).toMatchObject({ kind: "ready" });
    expect(opened.store.getState().notice).toBeNull();
    opened.store.apply("the MAF filter changed", maf(0.8));
    expect(opened.store.getState().notice).toBeNull();

    const upgraded = written();
    upgraded.store.popneiReady("0.2.0");
    expect(writeIn(upgraded.store)).toMatchObject({ kind: "ready" });
    expect(upgraded.store.getState().notice).toBeNull();
    upgraded.store.apply("the MAF filter changed", maf(0.8));
    expect(upgraded.store.getState().notice).toBeNull();
  });

  test("a write left behind is stopped by the next command, and dropped is forgotten by a new startWrite", () => {
    const { store, write, writes } = writing();
    store.apply("the MAF filter changed", maf(0.8));
    expect(write.cancels()).toBe(0);
    store.apply("the MAF filter changed", maf(0.7));
    expect(write.cancels()).toBe(1);

    store.undo();
    store.startWrite("nei");
    const late = writeAt(writes, 1);
    store.apply("the MAF filter changed", maf(0.6));
    store.runEnded(late.run.id, {
      kind: "done",
      key: late.key,
      result: writtenFile(1150, 1200),
    });
    expect(writeIn(store)).toMatchObject({ kind: "ready", dropped: true });
    store.startWrite("nei");
    store.cancelWrite();
    store.runEnded(writeAt(writes, 2).run.id, { kind: "cancelled" });

    expect(writeIn(store)).toMatchObject({ kind: "ready", dropped: false });
  });

  test("the state of the write is the same object after a change of an analysis alone, and a store with no write gives null", () => {
    const { store, write } = writing();
    const before = writeIn(store);
    store.startRun("vars");
    expect(writeIn(store)).toBe(before);
    expect(store.getState().write).toBe(before);
    expect(write.cancels()).toBe(0);

    const without = storeOfFive([]);
    expect(without.store.getState().write).toBeNull();
    expect(without.store.startWrite("nei")).toBeNull();
  });

  test("writeDiscarded leaves the notice when a file is written again under the new key", () => {
    const { store, writes } = written();
    store.apply("the MAF filter changed", maf(0.8));
    expect(store.getState().notice?.writeDiscarded).toBe(true);

    store.startWrite("nei");
    const again = writeAt(writes, 1);
    store.runEnded(again.run.id, {
      kind: "done",
      key: again.key,
      result: writtenFile(1100, 1200),
    });

    expect(store.getState().notice).toBeNull();
  });

  test("a startWrite takes the writing out of the notice's writeStopped", () => {
    const { store } = writing();
    store.apply("a variants file was loaded", loadPanel(OTHER_VARIANTS_ID));
    store.variantsRead(OTHER_VARIANTS_ID, {
      kind: "read",
      individuals: FIVE_INDIVIDUALS,
      ploidy: 2,
      numVars: null,
    });
    expect(store.getState().notice?.writeStopped).toBe(true);

    store.startWrite("nei");

    expect(store.getState().notice).toBeNull();
  });
});

describe("VS3 D7 the properties of the write", () => {
  /** A step of the property of the write. */
  type WriteStep =
    | { readonly kind: "startWrite" }
    | { readonly kind: "end"; readonly numVars: number }
    | { readonly kind: "cancelled" }
    | { readonly kind: "maf"; readonly threshold: number }
    | { readonly kind: "undo" }
    | { readonly kind: "redo" }
    | { readonly kind: "dismissNotice" }
    | { readonly kind: "cancelWrite" }
    | { readonly kind: "writeSaved" }
    | { readonly kind: "startRun" };

  // The writes, their ends and the changes of their key are drawn more
  // often, so that a write that ends after a change, and an undo back to
  // its key, come in most runs.
  const writeStep: fc.Arbitrary<WriteStep> = fc.oneof(
    { arbitrary: fc.constant({ kind: "startWrite" } as const), weight: 3 },
    {
      arbitrary: fc.record({
        kind: fc.constant("end" as const),
        numVars: fc.constantFrom(0, 1150, 1150),
      }),
      weight: 3,
    },
    fc.constant({ kind: "cancelled" } as const),
    {
      arbitrary: fc.record({
        kind: fc.constant("maf" as const),
        threshold: fc.constantFrom(0.8, 0.9, 0.95),
      }),
      weight: 3,
    },
    { arbitrary: fc.constant({ kind: "undo" } as const), weight: 2 },
    fc.constant({ kind: "redo" } as const),
    fc.constant({ kind: "dismissNotice" } as const),
    fc.constant({ kind: "cancelWrite" } as const),
    fc.constant({ kind: "writeSaved" } as const),
    fc.constant({ kind: "startRun" } as const),
  );

  test("a write whose result arrives when the project gives another key leaves no file in the state", () => {
    fc.assert(
      fc.property(fc.array(writeStep, { maxLength: 30 }), (drawn) => {
        const { store, writes } = storeThatWrites();
        /** The counts of the files that arrived while the project gave
            their key, each its own object. */
        const kept = new Set<PassStats>();
        /** The writes that have ended. */
        const ended = new Set<SentWrite>();
        for (const s of drawn) {
          switch (s.kind) {
            case "startWrite":
              store.startWrite("nei");
              break;
            case "end":
            case "cancelled": {
              const write = writes.find((one) => !ended.has(one));
              if (write === undefined) {
                break;
              }
              ended.add(write);
              if (s.kind === "cancelled") {
                store.runEnded(write.run.id, { kind: "cancelled" });
                break;
              }
              const file = writtenFile(s.numVars, 1200);
              if (write.key === writeKeyNow(store)) {
                kept.add(file.passStats);
              }
              store.runEnded(write.run.id, {
                kind: "done",
                key: write.key,
                result: file,
              });
              break;
            }
            case "maf":
              store.apply("the MAF filter changed", maf(s.threshold));
              break;
            case "undo":
              store.undo();
              break;
            case "redo":
              store.redo();
              break;
            case "dismissNotice":
              store.dismissNotice();
              break;
            case "cancelWrite":
              store.cancelWrite();
              break;
            case "writeSaved":
              if (writeIn(store).kind === "done") {
                store.writeSaved();
              }
              break;
            case "startRun":
              store.startRun("vars");
              break;
          }
          const write = writeIn(store);
          // What the state holds of a write is of one that arrived
          // under the key the project gives now, and gave since; only
          // `done` holds its file.
          if (
            write.kind === "done" ||
            write.kind === "saved" ||
            write.kind === "noVariant"
          ) {
            expect(write.key).toBe(writeKeyNow(store));
            expect(kept.has(write.written.passStats)).toBe(true);
            expect("file" in write.written).toBe(write.kind === "done");
          }
        }
      }),
      { numRuns: 300 },
    );
  });
});
