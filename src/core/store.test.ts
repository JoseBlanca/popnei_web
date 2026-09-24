import { describe, expect, test } from "vitest";
import { createKeyMemo, keyOf } from "./keys.ts";
import type { JsonValue } from "./keys.ts";
import {
  analysisOptions,
  emptyProject,
  individualsNeeds,
  loadIndividuals,
  loadVariants,
  setGrouping,
  setVariantFilter,
} from "./project.ts";
import type { IndividualsRead, Project, SourceRead } from "./project.ts";
import { createStore } from "./store.ts";
import type { AnalysisDef, AnalysisStatus, Store } from "./store.ts";
import { jsonObjectOf } from "./testSupport.ts";
import type { CsvOptions, Outcome, Progress, Run } from "../worker/protocol.ts";

// The fakes of the store spec's "How it is verified": a `send` whose
// requests the test ends by hand, and two analyses, one that needs the
// individuals file and uses the populations, and one that needs only the
// variants file. Their results differ in shape, so that a result given
// to the other analysis's functions shows.

/** A request of the fake analyses. */
interface TestJob {
  readonly analysis: "pops" | "vars";
}

/** The result of the analysis of the populations. */
interface PopsResult {
  readonly kind: "pops";
  readonly fst: Float64Array;
}

/** The result of the analysis of the variants. */
interface VarsResult {
  readonly kind: "vars";
  readonly numVars: number;
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
} {
  const sent: SentRequest[] = [];
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
    const run: Run<TestResult> = {
      id: sent.length + 1,
      outcome,
      cancel: () => {
        cancels += 1;
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
  return { send, sent };
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
}

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
  const calls: Calls = { pops: 0, vars: 0, needs: 0 };
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
    run: (_p, c) => c.run({ analysis: "pops" }),
    warnings: () => [],
    checkNumbers: (r) => (r.kind === "pops" ? [...r.fst] : []),
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
    run: (_p, c) => c.run({ analysis: "vars" }),
    warnings: () => [],
    checkNumbers: (r) => (r.kind === "vars" ? [r.numVars] : []),
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
    analyses and send. */
function newStore(): {
  readonly store: Store<TestResult>;
  readonly analyses: readonly AnalysisDef<TestJob, TestResult>[];
  readonly calls: Calls;
  readonly sent: SentRequest[];
} {
  const { analyses, calls } = fakeAnalyses();
  const { send, sent } = fakeSend();
  const store = createStore({
    first: emptyProject("popgen"),
    analyses,
    send,
    numVarsOf: (r) => (r.kind === "vars" ? r.numVars : null),
    appVersion: "0.1.0",
    cacheMaxBytes: 1024 * 1024,
    maxUndoSteps: 200,
  });
  return { store, analyses, calls, sent };
}

/** A store at the point of "A worked sequence" where the variants file is
    read: popnei 0.1.0, the variants file loaded and read. */
function storeWithVariantsRead(): ReturnType<typeof newStore> {
  const made = newStore();
  made.store.popneiReady("0.1.0");
  made.store.apply("a variants file was loaded", loadPanel(VARIANTS_ID));
  made.store.variantsRead(VARIANTS_ID, VARIANTS_READ);
  return made;
}

/** A store where both analyses are ready: the variants file and the
    individuals file read, the populations in the column `pop`. */
function storeWithBothReady(): ReturnType<typeof newStore> {
  const made = storeWithVariantsRead();
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
});
