/**
 * The words of the shell (docs/specs/shell.md, "How it is checked"): the
 * states of the steps, the summary line, the words of the notice and the
 * announcements made from the state, from states of the store written as
 * literals, with the ids and results of two analyses of `TEST_DEFS`.
 */
import { describe, expect, test } from "vitest";

import { firstProject } from "../../core/apps.ts";
import { keyFromWire } from "../../core/keys.ts";
import type { Key } from "../../core/keys.ts";
import type {
  AnalysisId,
  Grouping,
  IndividualsRead,
  IndividualsSource,
  Project,
  SourceRead,
  VariantSource,
} from "../../core/project.ts";
import type {
  AnalysisStatus,
  AppState,
  CheckVerdict,
  Notice,
  RunView,
  Warning,
  WriteStatus,
} from "../../core/store.ts";
import { identityWarning } from "../../core/projectFile.ts";
import { deepFreeze } from "../../core/testSupport.ts";
import type { TestDefResult } from "../../core/testSupport.ts";
import type { IndividualsKept } from "../../core/individualsKept.ts";
import { individualListNeeds, variantFilterNeeds } from "../../core/project.ts";
import type {
  ColumnType,
  CsvOptions,
  IndividualsTable,
} from "../../worker/protocol.ts";
import {
  announcementsOf,
  noticeText,
  stepStates,
  summaryLine,
  writtenDiscarded,
} from "./words.ts";
import type { ShellWords, StepState } from "./words.ts";

// The two analyses of population genetics of TEST_DEFS.
const DIVERSITY = "diversity";
const PCA = "pca";

// The three checks of the Variants step, from stage 3, by their ids.
const STATISTICS = "individualChecks";
const HISTOGRAMS = "variantChecks";
const COUNTS = "filterCounts";

const TITLES: ReadonlyMap<AnalysisId, string> = new Map([
  [DIVERSITY, "Diversity"],
  [PCA, "PCA"],
  [STATISTICS, "Statistics of each individual"],
  [HISTOGRAMS, "Histograms of the variants"],
  [COUNTS, "Counts of the filters"],
]);

function title(id: AnalysisId): string {
  const found = TITLES.get(id);
  if (found === undefined) {
    throw new Error(`popnei_web defect: no title for ${id}.`);
  }
  return found;
}

/** What the shell's words are given: the titles above, the checks in the
    Variants step and the others in the Analyses step, and the variants
    kept as the first number of the result of the Counts done. */
const WORDS: ShellWords<TestDefResult> = {
  title,
  stepOf: (id) =>
    [STATISTICS, HISTOGRAMS, COUNTS].includes(id) ? "variants" : "analyses",
  variantsKept: (s) => {
    const counts = s.analyses.find((analysis) => analysis.id === COUNTS);
    return counts?.status.kind === "done"
      ? (counts.status.result.numbers[0] ?? null)
      : null;
  },
};

/** The summary line of stage 2: no individuals kept, no counts. */
function plainLine(p: Project): string {
  return summaryLine(p, null, null);
}

const KEY_A: Key = keyFromWire("a".repeat(64));
const KEY_B: Key = keyFromWire("b".repeat(64));

const VARIANTS_ID = "00112233445566778899aabbccddeeff";
const OTHER_VARIANTS_ID = "0123456789abcdef0123456789abcdef";
const INDIVIDUALS_ID = "ffeeddccbbaa99887766554433221100";

const LOAD_VARIANTS = "Load a variants file in the Variants step.";

const PENDING = { kind: "pending" } as const;

function readOf(
  individuals: readonly string[],
  numVars: number | null = null,
): SourceRead {
  return { kind: "read", individuals, ploidy: 2, numVars };
}

const READ = readOf(["i1", "i2", "i3"]);

const REFUSED: SourceRead = {
  kind: "failed",
  error: { kind: "popnei", message: "not a nei file" },
};

function variants(read: SourceRead, fileId = VARIANTS_ID): VariantSource {
  return {
    fileId,
    name: "panel.nei",
    size: 1024,
    format: "nei",
    readOptions: null,
    read,
  };
}

const AUTO: CsvOptions = {
  encoding: "auto",
  separator: "auto",
  decimal: "auto",
};

const SEMICOLON: CsvOptions = { ...AUTO, separator: ";" };

function tableRead(table: IndividualsTable): IndividualsRead {
  return {
    kind: "read",
    table,
    columns: table.columns.map((_column, index) =>
      index === 0 ? { kind: "identifier" } : { kind: "categorical" },
    ),
    found: {
      encoding: "utf-8",
      separator: ",",
      decimal: ".",
      undecodedLine: null,
    },
  };
}

// Every individual of READ, in two populations, and one more row of an
// individual not in the variants file, in a third.
const TABLE: IndividualsTable = {
  columns: ["id", "pop"],
  rows: [
    ["i1", "p0"],
    ["i2", "p1"],
    ["i3", "p0"],
    ["i9", "p2"],
  ],
};

const TABLE_READ = tableRead(TABLE);

// The table without i3 and i9.
const SHORT_TABLE_READ = tableRead({
  columns: ["id", "pop"],
  rows: [
    ["i1", "p0"],
    ["i2", "p1"],
  ],
});

const EMPTY_FILE: IndividualsRead = {
  kind: "failed",
  error: { kind: "empty" },
};

function individuals(
  read: IndividualsRead,
  csv: CsvOptions = AUTO,
): IndividualsSource {
  return { fileId: INDIVIDUALS_ID, name: "pops.csv", csv, typesSet: [], read };
}

const BY_POP = { kind: "populations", column: "pop" } as const;

/** The first project of the application with `parts` set, frozen. */
function project(parts: Partial<Project>): Project {
  return deepFreeze<Project>({ ...firstProject("popgen"), ...parts });
}

/** A project opened from a project file made with panel_2026.nei, whose
    variants file is not given yet. */
const OPENED = project({
  reference: {
    variants: {
      ...variants(readOf(["i1", "i2", "i3"], 1200)),
      name: "panel_2026.nei",
    },
    checks: [],
  },
});

/** Both files read, every individual found, the populations by pop. */
const READY = project({
  variants: variants(READ),
  individuals: individuals(TABLE_READ),
  grouping: BY_POP,
});

const LOCKED: AnalysisStatus<TestDefResult> = {
  kind: "locked",
  reason: LOAD_VARIANTS,
};

function done(
  key: Key,
  numWarnings = 0,
  check: CheckVerdict | null = null,
): AnalysisStatus<TestDefResult> {
  return {
    kind: "done",
    key,
    result: { analysis: DIVERSITY, numbers: [] },
    warnings: Array.from({ length: numWarnings }, (_, index) => ({
      code: `w${String(index)}`,
      text: "a warning",
    })),
    check,
  };
}

function running(key: Key, runId: number): AnalysisStatus<TestDefResult> {
  return {
    kind: "running",
    key,
    runId,
    progress: null,
    waitsForStatistics: false,
  };
}

function ready(key: Key): AnalysisStatus<TestDefResult> {
  return { kind: "ready", key };
}

function removed(key: Key): AnalysisStatus<TestDefResult> {
  return { kind: "removed", key };
}

function failed(key: Key): AnalysisStatus<TestDefResult> {
  return {
    kind: "error",
    key,
    error: { kind: "refused", message: "too few individuals" },
    ofStatistics: false,
  };
}

function run(
  runId: number,
  analysis: AnalysisId | null,
  key: Key,
  flags: { readonly current: boolean; readonly stopping: boolean },
): RunView {
  return {
    runId,
    analysis,
    key,
    ...flags,
    afterStop: false,
    progress: null,
  };
}

const CURRENT = { current: true, stopping: false } as const;
const CURRENT_STOPPING = { current: true, stopping: true } as const;
const LEFT_BEHIND = { current: false, stopping: false } as const;
const LEFT_BEHIND_STOPPING = { current: false, stopping: true } as const;

/** A state of the store: the first project, both analyses locked,
    nothing in flight and no notice, with `parts` set; the statuses of
    diversity and pca given in their order. */
function state(
  parts: Partial<AppState<TestDefResult>> & {
    readonly statuses?: readonly [
      AnalysisStatus<TestDefResult>,
      AnalysisStatus<TestDefResult>,
    ];
  },
): AppState<TestDefResult> {
  const { statuses = [LOCKED, LOCKED], ...rest } = parts;
  return deepFreeze<AppState<TestDefResult>>({
    project: firstProject("popgen"),
    undo: null,
    redo: null,
    historyMoves: 0,
    popneiVersion: "0.1.0",
    analyses: [
      { id: DIVERSITY, status: statuses[0] },
      { id: PCA, status: statuses[1] },
    ],
    runs: [],
    notice: null,
    individualsKept: null,
    write: null,
    ...rest,
  });
}

function notice(parts: Partial<Notice>): Notice {
  return {
    cause: {
      kind: "command",
      description: "the filter of the variants by missing data changed",
    },
    removed: [],
    leftBehind: [],
    stopped: [],
    writeLeftBehind: false,
    writeStopped: false,
    writeDiscarded: false,
    ...parts,
  };
}

/** The state and reason stepStates gives the step `id`. */
function stepOf(
  s: AppState<TestDefResult>,
  id: StepState["id"],
): Omit<StepState, "id"> {
  const found = stepStates(s, WORDS).find((step) => step.id === id);
  if (found === undefined) {
    throw new Error(`popnei_web defect: no step ${id}.`);
  }
  return { status: found.status, reason: found.reason };
}

describe("WS9 D1 the states of the steps", () => {
  test("the steps come in their order, each with its state", () => {
    expect(stepStates(state({}), WORDS)).toEqual([
      { id: "variants", status: "todo", reason: LOAD_VARIANTS },
      {
        id: "individuals",
        status: "optional",
        reason: "Without it, every individual is in one population.",
      },
      { id: "analyses", status: "locked", reason: LOAD_VARIANTS },
    ]);
  });

  test("Variants with no variants file is To do, with the file an opened project asks for", () => {
    expect(stepOf(state({}), "variants")).toEqual({
      status: "todo",
      reason: LOAD_VARIANTS,
    });
    expect(stepOf(state({ project: OPENED }), "variants")).toEqual({
      status: "todo",
      reason:
        "This project was made with panel_2026.nei, of 3 individuals and 1,200 variants. Load it to run its analyses again.",
    });
  });

  test("Variants whose read is pending is Reading", () => {
    const p = project({ variants: variants(PENDING) });
    expect(stepOf(state({ project: p }), "variants")).toEqual({
      status: "reading",
      reason: "Reading panel.nei.",
    });
  });

  test("Variants whose read failed, or with a list of individuals that is wrong, is Problem", () => {
    const refused = project({ variants: variants(REFUSED) });
    expect(stepOf(state({ project: refused }), "variants")).toEqual({
      status: "problem",
      reason:
        "popnei could not read panel.nei: not a nei file. Load a variants file in the Variants step.",
    });
    const emptyList = project({
      variants: variants(READ),
      individualFilters: [{ kind: "keep", individuals: [] }],
    });
    expect(stepOf(state({ project: emptyList }), "variants")).toEqual({
      status: "problem",
      reason:
        "The list of individuals to keep is empty. Add individuals to it, or remove the filter, in the Variants step.",
    });
  });

  test("Variants read with nothing wrong is Done, with no reason", () => {
    const p = project({ variants: variants(READ) });
    expect(stepOf(state({ project: p }), "variants")).toEqual({
      status: "done",
      reason: null,
    });
  });

  test("Individuals with no metadata file is Optional", () => {
    const p = project({ variants: variants(READ) });
    expect(stepOf(state({ project: p }), "individuals")).toEqual({
      status: "optional",
      reason: "Without it, every individual is in one population.",
    });
  });

  test("Individuals whose read is pending is Reading", () => {
    const p = project({ individuals: individuals(PENDING) });
    expect(stepOf(state({ project: p }), "individuals")).toEqual({
      status: "reading",
      reason: "Reading pops.csv.",
    });
  });

  test("Individuals whose read failed, or with individuals of the variants file missing, is Problem", () => {
    const refused = project({ individuals: individuals(EMPTY_FILE) });
    expect(stepOf(state({ project: refused }), "individuals")).toEqual({
      status: "problem",
      reason:
        "pops.csv could not be read: it has no row of individuals. Load a metadata file in the Individuals step.",
    });
    const missing = project({
      variants: variants(READ),
      individuals: individuals(SHORT_TABLE_READ),
      grouping: BY_POP,
    });
    expect(stepOf(state({ project: missing }), "individuals")).toEqual({
      status: "problem",
      reason:
        "1 individual of panel.nei is not in pops.csv: i3. Add it to the file and load the file again in the Individuals step.",
    });
  });

  test("Individuals read with no column of the populations chosen is To do", () => {
    const p = project({
      variants: variants(READ),
      individuals: individuals(TABLE_READ),
    });
    expect(stepOf(state({ project: p }), "individuals")).toEqual({
      status: "todo",
      reason:
        "Choose the column that defines the populations, or all individuals in one population, in the Individuals step.",
    });
  });

  test("Individuals whose column is not in the table, or gives no individual a population, is Problem", () => {
    const noSuchColumn = project({
      variants: variants(READ),
      individuals: individuals(TABLE_READ),
      grouping: { kind: "populations", column: "region" },
    });
    expect(stepOf(state({ project: noSuchColumn }), "individuals")).toEqual({
      status: "problem",
      reason:
        "pops.csv has no column region, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population, in the Individuals step.",
    });
    const noPopulation = project({
      variants: variants(READ),
      individuals: individuals(
        tableRead({
          columns: ["id", "pop"],
          rows: [
            ["i1", null],
            ["i2", null],
            ["i3", null],
          ],
        }),
      ),
      grouping: BY_POP,
    });
    expect(stepOf(state({ project: noPopulation }), "individuals")).toEqual({
      status: "problem",
      reason:
        "No individual of panel.nei has a population in the column pop of pops.csv. Fill in the column and load the file again, or choose another column, in the Individuals step.",
    });
  });

  test("Individuals read with its populations is Done, with no reason", () => {
    expect(stepOf(state({ project: READY }), "individuals")).toEqual({
      status: "done",
      reason: null,
    });
  });

  test("Analyses with every analysis locked is Locked, with the reason of the first", () => {
    const s = state({
      statuses: [LOCKED, { kind: "locked", reason: "Another reason." }],
    });
    expect(stepOf(s, "analyses")).toEqual({
      status: "locked",
      reason: LOAD_VARIANTS,
    });
  });

  test("Analyses with an analysis running is Running", () => {
    const s = state({ statuses: [ready(KEY_A), running(KEY_B, 1)] });
    expect(stepOf(s, "analyses")).toEqual({ status: "running", reason: null });
  });

  test("Analyses whose notice lists a result removed is Results removed", () => {
    const s = state({
      statuses: [removed(KEY_A), done(KEY_B)],
      notice: notice({ removed: [DIVERSITY] }),
    });
    expect(stepOf(s, "analyses")).toEqual({ status: "removed", reason: null });
  });

  test("Analyses with an analysis in error is Failed, with the title of that analysis", () => {
    const s = state({ statuses: [done(KEY_A), failed(KEY_B)] });
    expect(stepOf(s, "analyses")).toEqual({
      status: "failed",
      reason: "PCA could not be calculated.",
    });
  });

  test("Analyses with every analysis that is not locked done is Done", () => {
    const s = state({ statuses: [done(KEY_A), LOCKED] });
    expect(stepOf(s, "analyses")).toEqual({ status: "done", reason: null });
  });

  test("Analyses otherwise is Ready", () => {
    const s = state({ statuses: [done(KEY_A), ready(KEY_B)] });
    expect(stepOf(s, "analyses")).toEqual({ status: "ready", reason: null });
  });

  test("the first row that holds wins: an analysis running while another is removed gives Running", () => {
    const s = state({
      statuses: [running(KEY_A, 1), removed(KEY_B)],
      notice: notice({ removed: [PCA] }),
    });
    expect(stepOf(s, "analyses")).toEqual({ status: "running", reason: null });
  });
});

/** The individuals i1 to i200, and a table that puts them in three
    populations. */
const TWO_HUNDRED = Array.from(
  { length: 200 },
  (_, index) => `i${String(index + 1)}`,
);
const THREE_POPS = tableRead({
  columns: ["id", "pop"],
  rows: TWO_HUNDRED.map((id, index) => [id, `p${String(index % 3)}`]),
});

describe("WS9 D1 the summary line", () => {
  test("the empty first project", () => {
    expect(plainLine(firstProject("popgen"))).toBe(
      "No variants file · 1 filter · no metadata file: one population",
    );
  });

  test("the example of the spec, with 1,200 variants counted", () => {
    const p = project({
      variants: variants(readOf(TWO_HUNDRED, 1200)),
      individuals: individuals(THREE_POPS),
      grouping: BY_POP,
    });
    expect(plainLine(p)).toBe(
      "panel.nei · 200 individuals · 1,200 variants before the filters · 1 filter · 3 populations by pop",
    );
  });

  test("no variants file, and for an opened project the file it was made with", () => {
    expect(plainLine(OPENED)).toBe(
      "No variants file: the project was made with panel_2026.nei · 1 filter · no metadata file: one population",
    );
  });

  test("a variants file being read", () => {
    expect(plainLine(project({ variants: variants(PENDING) }))).toBe(
      "Reading panel.nei · 1 filter · no metadata file: one population",
    );
  });

  test("a variants file whose read failed", () => {
    expect(plainLine(project({ variants: variants(REFUSED) }))).toBe(
      "panel.nei could not be read · 1 filter · no metadata file: one population",
    );
  });

  test("a variants file read, its variants once a calculation has counted them", () => {
    expect(plainLine(project({ variants: variants(READ) }))).toBe(
      "panel.nei · 3 individuals · 1 filter · no metadata file: one population",
    );
    expect(
      plainLine(project({ variants: variants(readOf(["i1"], 1_203_554)) })),
    ).toBe(
      "panel.nei · 1 individual · 1,203,554 variants before the filters · 1 filter · no metadata file: one population",
    );
  });

  test("the filters of the variants and of the individuals, counted", () => {
    expect(plainLine(project({ filters: [] }))).toBe(
      "No variants file · no filter · no metadata file: one population",
    );
    expect(
      plainLine(
        project({
          individualFilters: [
            { kind: "missing_data", maxAllowedMissingRate: 0.2 },
          ],
        }),
      ),
    ).toBe("No variants file · 2 filters · no metadata file: one population");
  });

  test("no metadata file", () => {
    expect(plainLine(project({ variants: variants(READ) }))).toMatch(
      / · no metadata file: one population$/,
    );
  });

  test("a metadata file being read", () => {
    expect(plainLine(project({ individuals: individuals(PENDING) }))).toBe(
      "No variants file · 1 filter · reading pops.csv",
    );
  });

  test("a metadata file whose read failed, with individuals missing, or without the column of the populations", () => {
    expect(plainLine(project({ individuals: individuals(EMPTY_FILE) }))).toBe(
      "No variants file · 1 filter · pops.csv could not be read",
    );
    const missing = project({
      variants: variants(readOf(["i1", "i2", "i3", "i4"])),
      individuals: individuals(SHORT_TABLE_READ),
      grouping: BY_POP,
    });
    expect(plainLine(missing)).toBe(
      "panel.nei · 4 individuals · 1 filter · 2 individuals missing from pops.csv",
    );
    const oneMissing = project({
      variants: variants(READ),
      individuals: individuals(SHORT_TABLE_READ),
      grouping: BY_POP,
    });
    expect(plainLine(oneMissing)).toBe(
      "panel.nei · 3 individuals · 1 filter · 1 individual missing from pops.csv",
    );
    const noSuchColumn = project({
      variants: variants(READ),
      individuals: individuals(TABLE_READ),
      grouping: { kind: "populations", column: "region" },
    });
    expect(plainLine(noSuchColumn)).toBe(
      "panel.nei · 3 individuals · 1 filter · column region not in pops.csv",
    );
  });

  test("a metadata file read with no column chosen is populations not chosen", () => {
    const p = project({
      variants: variants(READ),
      individuals: individuals(TABLE_READ),
    });
    expect(plainLine(p)).toBe(
      "panel.nei · 3 individuals · 1 filter · populations not chosen",
    );
  });

  test("a column chosen counts the populations to run, or those of the table while the variants file is not read", () => {
    // p2 holds only i9, which is not in the variants file, and i3 has no
    // population.
    const withEmptyCell = tableRead({
      columns: ["id", "pop"],
      rows: [
        ["i1", "p0"],
        ["i2", "p1"],
        ["i3", null],
        ["i9", "p2"],
      ],
    });
    const read = project({
      variants: variants(READ),
      individuals: individuals(withEmptyCell),
      grouping: BY_POP,
    });
    expect(plainLine(read)).toBe(
      "panel.nei · 3 individuals · 1 filter · 2 populations by pop",
    );
    const reading = project({
      variants: variants(PENDING),
      individuals: individuals(withEmptyCell),
      grouping: BY_POP,
    });
    expect(plainLine(reading)).toBe(
      "Reading panel.nei · 1 filter · 3 populations by pop",
    );
  });
});

const NEW_FILE = "a new variants file was loaded";

describe("WS9 D1 the words of the notice", () => {
  test("a command", () => {
    expect(noticeText(notice({ removed: [DIVERSITY] }), title)).toEqual({
      text: "Diversity removed because the filter of the variants by missing data changed",
      action: "Undo",
      reverse: "undo",
    });
  });

  test("a command that changes the load, with a calculation running and no result to remove", () => {
    const n = notice({
      cause: { kind: "command", description: NEW_FILE },
      stopped: [DIVERSITY],
    });
    expect(noticeText(n, title)).toEqual({
      text: "The calculation of Diversity stopped because a new variants file was loaded",
      action: "Undo",
      reverse: "undo",
    });
  });

  test("a command, with calculations stopped", () => {
    const n = notice({
      cause: { kind: "command", description: NEW_FILE },
      removed: [DIVERSITY],
      stopped: [DIVERSITY],
    });
    expect(noticeText(n, title)).toEqual({
      text: "Diversity removed and the calculation of Diversity stopped because a new variants file was loaded",
      action: "Undo",
      reverse: "undo",
    });
  });

  test("a command, with a calculation left behind and nothing removed", () => {
    expect(noticeText(notice({ leftBehind: [DIVERSITY] }), title)).toEqual({
      text: "The filter of the variants by missing data changed. The ongoing calculation of Diversity will be stopped unless you undo the change",
      action: "Undo",
      reverse: "undo",
    });
  });

  test("an undo", () => {
    const n = notice({
      cause: {
        kind: "undo",
        description: "the filter of the variants by missing data changed",
      },
      removed: [DIVERSITY],
    });
    expect(noticeText(n, title)).toEqual({
      text: "Undone: the filter of the variants by missing data changed. Diversity removed",
      action: "Redo",
      reverse: "redo",
    });
  });

  test("an undo, with a calculation left behind, names Redo", () => {
    const n = notice({
      cause: {
        kind: "undo",
        description: "the filter of the variants by missing data changed",
      },
      leftBehind: [DIVERSITY],
    });
    expect(noticeText(n, title)).toEqual({
      text: "Undone: the filter of the variants by missing data changed. The ongoing calculation of Diversity will be stopped unless you redo the change",
      action: "Redo",
      reverse: "redo",
    });
  });

  test("an undo that changes the load", () => {
    const n = notice({
      cause: { kind: "undo", description: NEW_FILE },
      stopped: [DIVERSITY],
    });
    expect(noticeText(n, title)).toEqual({
      text: "Undone: a new variants file was loaded. The calculation of Diversity stopped",
      action: "Redo",
      reverse: "redo",
    });
  });

  test("a redo, with a calculation left behind", () => {
    const n = notice({
      cause: {
        kind: "redo",
        description: "the filter of the variants by missing data changed",
      },
      removed: [DIVERSITY],
      leftBehind: [DIVERSITY],
    });
    expect(noticeText(n, title)).toEqual({
      text: "Redone: the filter of the variants by missing data changed. Diversity removed. The ongoing calculation of Diversity will be stopped unless you undo the change",
      action: "Undo",
      reverse: "undo",
    });
  });

  test("three removed and two stopped are counted, and two left behind after an undo name Redo", () => {
    const n = notice({
      cause: { kind: "command", description: NEW_FILE },
      removed: [DIVERSITY, PCA, "gwas_lm"],
      stopped: [DIVERSITY, PCA],
    });
    expect(noticeText(n, title)).toEqual({
      text: "3 results removed and 2 calculations stopped because a new variants file was loaded",
      action: "Undo",
      reverse: "undo",
    });
    const undone = notice({
      cause: {
        kind: "undo",
        description: "the filter of the variants by missing data changed",
      },
      leftBehind: [DIVERSITY, PCA],
    });
    expect(noticeText(undone, title)).toEqual({
      text: "Undone: the filter of the variants by missing data changed. The 2 ongoing calculations will be stopped unless you redo the change",
      action: "Redo",
      reverse: "redo",
    });
  });
});

describe("WS9 D1 the announcements made from the state", () => {
  test("a request new in runs is calculating", () => {
    const before = state({ project: READY, statuses: [ready(KEY_A), LOCKED] });
    const after = state({
      project: READY,
      statuses: [running(KEY_A, 1), LOCKED],
      runs: [run(1, DIVERSITY, KEY_A, CURRENT)],
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Diversity: calculating.",
    ]);
    // In one change the ends come before the starts, as a Run that waits
    // for the statistics has them from stage 3.
    const ending = state({
      project: READY,
      statuses: [running(KEY_A, 1), ready(KEY_B)],
      runs: [run(1, DIVERSITY, KEY_A, CURRENT)],
    });
    const endedAndStarted = state({
      project: READY,
      statuses: [done(KEY_A), running(KEY_B, 2)],
      runs: [run(2, PCA, KEY_B, CURRENT)],
    });
    expect(announcementsOf(ending, endedAndStarted, WORDS)).toEqual([
      "Diversity: done.",
      "PCA: calculating.",
    ]);
  });

  test("calculations left behind that went to being stopped in the same change are added to it", () => {
    const before = state({
      project: READY,
      statuses: [ready(KEY_A), ready(KEY_B)],
      runs: [run(1, PCA, KEY_A, LEFT_BEHIND)],
    });
    const after = state({
      project: READY,
      statuses: [running(KEY_A, 2), ready(KEY_B)],
      runs: [
        run(1, PCA, KEY_A, LEFT_BEHIND_STOPPING),
        run(2, DIVERSITY, KEY_A, CURRENT),
      ],
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Diversity: calculating. The earlier calculation of PCA was stopped.",
    ]);
    // A current calculation being stopped is not one left behind.
    const currentBefore = state({
      ...before,
      runs: [run(1, PCA, KEY_B, CURRENT)],
    });
    const currentAfter = state({
      ...after,
      runs: [
        run(1, PCA, KEY_B, CURRENT_STOPPING),
        run(2, DIVERSITY, KEY_A, CURRENT),
      ],
    });
    expect(announcementsOf(currentBefore, currentAfter, WORDS)).toEqual([
      "Diversity: calculating.",
    ]);
    const twoBefore = state({
      ...before,
      runs: [
        run(1, PCA, KEY_A, LEFT_BEHIND),
        run(3, DIVERSITY, KEY_B, LEFT_BEHIND),
      ],
    });
    const twoAfter = state({
      ...after,
      runs: [
        run(1, PCA, KEY_A, LEFT_BEHIND_STOPPING),
        run(3, DIVERSITY, KEY_B, LEFT_BEHIND_STOPPING),
        run(2, DIVERSITY, KEY_A, CURRENT),
      ],
    });
    expect(announcementsOf(twoBefore, twoAfter, WORDS)).toEqual([
      "Diversity: calculating. The 2 earlier calculations were stopped.",
    ]);
    // Two requests new in the same change: the stopped are added to the
    // last.
    const twoStarted = state({
      ...after,
      runs: [
        run(1, PCA, KEY_A, LEFT_BEHIND_STOPPING),
        run(2, DIVERSITY, KEY_A, CURRENT),
        run(3, PCA, KEY_B, CURRENT),
      ],
    });
    expect(announcementsOf(before, twoStarted, WORDS)).toEqual([
      "Diversity: calculating.",
      "PCA: calculating. The earlier calculation of PCA was stopped.",
    ]);
  });

  test("the end of a calculation of an opened project says the comparison with the project file", () => {
    const before = state({
      project: READY,
      statuses: [running(KEY_A, 1), LOCKED],
      runs: [run(1, DIVERSITY, KEY_A, CURRENT)],
    });
    const same = done(KEY_A, 1, { kind: "same" });
    expect(
      announcementsOf(
        before,
        state({ project: READY, statuses: [same, LOCKED] }),
        WORDS,
      ),
    ).toEqual([
      "Diversity: done, 1 warning. The same numbers as in the project file: this variants file gives the results the project was saved with.",
    ]);
    // A project made with a VCF, given a .nei file: not compared.
    const fromVcf = project({
      ...READY,
      reference: {
        variants: {
          ...variants(READ),
          name: "panel.vcf.gz",
          format: "vcf",
          readOptions: { ploidy: 2, onlyPassed: true },
        },
        checks: [
          {
            analysis: DIVERSITY,
            numbers: [],
            keyVersion: 1,
            popneiVersion: "0.1.0",
            appVersion: "0.1.0",
            settings: "0".repeat(64),
          },
        ],
      },
    });
    expect(
      announcementsOf(
        { ...before, project: fromVcf },
        state({ project: fromVcf, statuses: [done(KEY_A), LOCKED] }),
        WORDS,
      ),
    ).toEqual([
      "Diversity: done. Not compared with the numbers of the project file: this file is a .nei file, and the project was made with a VCF. Load panel.vcf.gz in the Variants step to compare them.",
    ]);
  });

  test("a current request that ended done under its key is done, with its warnings counted", () => {
    const before = state({
      project: READY,
      statuses: [running(KEY_A, 1), LOCKED],
      runs: [run(1, DIVERSITY, KEY_A, CURRENT)],
    });
    expect(
      announcementsOf(
        before,
        state({ project: READY, statuses: [done(KEY_A), LOCKED] }),
        WORDS,
      ),
    ).toEqual(["Diversity: done."]);
    expect(
      announcementsOf(
        before,
        state({ project: READY, statuses: [done(KEY_A, 2), LOCKED] }),
        WORDS,
      ),
    ).toEqual(["Diversity: done, 2 warnings."]);
    expect(
      announcementsOf(
        before,
        state({ project: READY, statuses: [done(KEY_A, 1), LOCKED] }),
        WORDS,
      ),
    ).toEqual(["Diversity: done, 1 warning."]);
    // Done under another key is not the end of this request.
    expect(
      announcementsOf(
        before,
        state({ project: READY, statuses: [done(KEY_B), LOCKED] }),
        WORDS,
      ),
    ).toEqual([]);
  });

  test("a current request that ended in error under its key could not be calculated", () => {
    const before = state({
      project: READY,
      statuses: [running(KEY_A, 1), LOCKED],
      runs: [run(1, DIVERSITY, KEY_A, CURRENT)],
    });
    const after = state({ project: READY, statuses: [failed(KEY_A), LOCKED] });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Diversity could not be calculated. The Analyses step says why.",
    ]);
    // An error under another key is not the end of this request.
    const otherKey = state({
      project: READY,
      statuses: [failed(KEY_B), LOCKED],
    });
    expect(announcementsOf(before, otherKey, WORDS)).toEqual([]);
  });

  test("a current request being stopped that left runs is stopped", () => {
    const before = state({
      project: READY,
      statuses: [ready(KEY_A), LOCKED],
      runs: [run(1, DIVERSITY, KEY_A, CURRENT_STOPPING)],
    });
    const after = state({ project: READY, statuses: [ready(KEY_A), LOCKED] });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Diversity: stopped.",
    ]);
  });

  test("the variants file of the same load read, with the check of the metadata file once it is read", () => {
    const pending = project({ variants: variants(PENDING) });
    const read = project({ variants: variants(READ) });
    expect(
      announcementsOf(
        state({ project: pending }),
        state({ project: read }),
        WORDS,
      ),
    ).toEqual(["panel.nei read: 3 individuals, ploidy 2."]);
    const withTable = project({
      variants: variants(PENDING),
      individuals: individuals(TABLE_READ),
      grouping: BY_POP,
    });
    expect(
      announcementsOf(
        state({ project: withTable }),
        state({ project: READY }),
        WORDS,
      ),
    ).toEqual([
      "panel.nei read: 3 individuals, ploidy 2. All 3 individuals found.",
    ]);
  });

  test("the variants file of the same load read while the metadata file is being read, or failed, has no check", () => {
    for (const table of [PENDING, EMPTY_FILE]) {
      const before = project({
        variants: variants(PENDING),
        individuals: individuals(table),
      });
      const after = project({
        variants: variants(READ),
        individuals: individuals(table),
      });
      expect(
        announcementsOf(
          state({ project: before }),
          state({ project: after }),
          WORDS,
        ),
      ).toEqual(["panel.nei read: 3 individuals, ploidy 2."]);
    }
  });

  test("the variants file of the same load failed gives the reason of the project", () => {
    expect(
      announcementsOf(
        state({ project: project({ variants: variants(PENDING) }) }),
        state({ project: project({ variants: variants(REFUSED) }) }),
        WORDS,
      ),
    ).toEqual([
      "popnei could not read panel.nei: not a nei file. Load a variants file in the Variants step.",
    ]);
  });

  test("the metadata file of the same load and options read, with the check once the variants file is read", () => {
    const pending = project({
      variants: variants(READ),
      individuals: individuals(PENDING),
      grouping: BY_POP,
    });
    const read = project({
      variants: variants(READ),
      individuals: individuals(SHORT_TABLE_READ),
      grouping: BY_POP,
    });
    expect(
      announcementsOf(
        state({ project: pending }),
        state({ project: read }),
        WORDS,
      ),
    ).toEqual([
      "pops.csv read: 2 rows, 2 columns. 1 individual of panel.nei is not in pops.csv.",
    ]);
    const twoMissing = project({
      variants: variants(readOf(["i1", "i2", "i3", "i4"])),
      individuals: individuals(SHORT_TABLE_READ),
      grouping: BY_POP,
    });
    expect(
      announcementsOf(
        state({
          project: { ...twoMissing, individuals: individuals(PENDING) },
        }),
        state({ project: twoMissing }),
        WORDS,
      ),
    ).toEqual([
      "pops.csv read: 2 rows, 2 columns. 2 individuals of panel.nei are not in pops.csv.",
    ]);
    const alone = project({ individuals: individuals(TABLE_READ) });
    expect(
      announcementsOf(
        state({ project: project({ individuals: individuals(PENDING) }) }),
        state({ project: alone }),
        WORDS,
      ),
    ).toEqual(["pops.csv read: 4 rows, 2 columns."]);
  });

  test("the metadata file of the same load and options failed gives the reason of the individuals", () => {
    expect(
      announcementsOf(
        state({ project: project({ individuals: individuals(PENDING) }) }),
        state({ project: project({ individuals: individuals(EMPTY_FILE) }) }),
        WORDS,
      ),
    ).toEqual([
      "pops.csv could not be read: it has no row of individuals. Load a metadata file in the Individuals step.",
    ]);
  });

  test("a result back from the cache after an undo announces nothing", () => {
    const before = state({
      project: READY,
      statuses: [removed(KEY_A), LOCKED],
      notice: notice({ removed: [DIVERSITY] }),
    });
    const after = state({
      project: READY,
      statuses: [done(KEY_A), LOCKED],
      redo: "the filter of the variants by missing data changed",
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([]);
  });

  test("a calculation left behind that ends, by itself or stopped, announces nothing", () => {
    const after = state({ project: READY, statuses: [done(KEY_A), LOCKED] });
    for (const flags of [LEFT_BEHIND, LEFT_BEHIND_STOPPING]) {
      const before = state({
        project: READY,
        statuses: [done(KEY_A), LOCKED],
        runs: [run(1, DIVERSITY, KEY_A, flags)],
      });
      expect(announcementsOf(before, after, WORDS)).toEqual([]);
    }
  });

  test("an undo back to a load already read announces nothing", () => {
    const before = project({
      variants: variants(PENDING, OTHER_VARIANTS_ID),
    });
    const after = project({ variants: variants(READ) });
    expect(
      announcementsOf(
        state({ project: before }),
        state({ project: after }),
        WORDS,
      ),
    ).toEqual([]);
    const tableBefore = project({
      individuals: {
        ...individuals(PENDING),
        fileId: "0123456789abcdef0123456789abcdef",
      },
    });
    const tableAfter = project({ individuals: individuals(TABLE_READ) });
    expect(
      announcementsOf(
        state({ project: tableBefore }),
        state({ project: tableAfter }),
        WORDS,
      ),
    ).toEqual([]);
  });

  test("an opening announces nothing, the calculations it stops among it", () => {
    const before = state({
      project: READY,
      statuses: [running(KEY_A, 1), LOCKED],
      runs: [run(1, DIVERSITY, KEY_A, CURRENT)],
    });
    const after = state({
      project: OPENED,
      runs: [run(1, DIVERSITY, KEY_A, LEFT_BEHIND_STOPPING)],
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([]);
  });

  test("the warning of a reopened project is announced when it appears, and when it comes with another load", () => {
    const given = project({
      ...OPENED,
      variants: variants(READ),
    });
    const warning = identityWarning(given);
    expect(warning).toMatch(/^The project was made with panel_2026\.nei/);
    expect(
      announcementsOf(
        state({ project: OPENED }),
        state({ project: given }),
        WORDS,
      ),
    ).toEqual([`Warning: ${String(warning)}`]);

    // A second file that differs, or an undo back to one, pressed on
    // another step: another load, with a warning before and after.
    const other = project({
      ...OPENED,
      variants: variants(READ, OTHER_VARIANTS_ID),
    });
    expect(
      announcementsOf(
        state({ project: other }),
        state({ project: given }),
        WORDS,
      ),
    ).toEqual([`Warning: ${String(warning)}`]);
  });

  test("the warning of a reopened project that appears at the read of its load is announced after the read", () => {
    // Made with the file of the same name, size and format, with two
    // individuals: the file given differs only once it is read.
    const reference = {
      variants: variants(readOf(["i1", "i2"])),
      checks: [],
    };
    const pending = project({ reference, variants: variants(PENDING) });
    const read = project({ reference, variants: variants(READ) });
    expect(identityWarning(pending)).toBeNull();
    const warning = identityWarning(read);
    expect(warning).toMatch(/this file has 3 individuals/);
    expect(
      announcementsOf(
        state({ project: pending }),
        state({ project: read }),
        WORDS,
      ),
    ).toEqual([
      "panel.nei read: 3 individuals, ploidy 2.",
      `Warning: ${String(warning)}`,
    ]);
  });

  test("the warning of a reopened project waits while its load is being read, and is said once, after the read, with the words the read gave it", () => {
    const pending = project({ ...OPENED, variants: variants(PENDING) });
    const read = project({ ...OPENED, variants: variants(READ) });
    expect(identityWarning(pending)).not.toBeNull();
    expect(
      announcementsOf(
        state({ project: OPENED }),
        state({ project: pending }),
        WORDS,
      ),
    ).toEqual([]);
    expect(
      announcementsOf(
        state({ project: pending }),
        state({ project: read }),
        WORDS,
      ),
    ).toEqual([
      "panel.nei read: 3 individuals, ploidy 2.",
      `Warning: ${String(identityWarning(read))}`,
    ]);
  });

  test("the warning of a reopened project kept through a change of the filter is not announced again", () => {
    const read = project({ ...OPENED, variants: variants(READ) });
    const unfiltered = project({ ...read, filters: [] });
    expect(
      announcementsOf(
        state({ project: read }),
        state({ project: unfiltered }),
        WORDS,
      ),
    ).toEqual([]);
  });

  test("a read of the metadata file recorded for options other than those of the present project announces nothing", () => {
    // An undo from options set and not yet read back to the options the
    // file was read with.
    const before = project({ individuals: individuals(PENDING, SEMICOLON) });
    const after = project({ individuals: individuals(TABLE_READ, AUTO) });
    expect(
      announcementsOf(
        state({ project: before }),
        state({ project: after }),
        WORDS,
      ),
    ).toEqual([]);
    // The same with the encoding, and with the decimal mark.
    for (const options of [
      { ...AUTO, encoding: "windows-1252" },
      { ...AUTO, decimal: "," },
    ] as const) {
      expect(
        announcementsOf(
          state({
            project: project({ individuals: individuals(PENDING, options) }),
          }),
          state({ project: after }),
          WORDS,
        ),
      ).toEqual([]);
    }
  });
});

// From stage 3: the checks of the Variants step, the individuals and the
// variants the filters keep, and the writing of the filtered variants.

const KEY_S: Key = keyFromWire("c".repeat(64));
const KEY_W: Key = keyFromWire("d".repeat(64));

/** panel.nei of the examples of the specs: 200 individuals and 1,200
    variants counted, the populations by pop, and the missing data filter
    of the first project at 0.1. */
const PANEL = project({
  variants: variants(readOf(TWO_HUNDRED, 1200)),
  individuals: individuals(THREE_POPS),
  grouping: BY_POP,
});

const WRITE_READY: WriteStatus<unknown> = {
  kind: "ready",
  key: KEY_W,
  dropped: false,
};

/** The file popnei writes of 20,000 variants of 1,000 individuals
    (docs/specs/analyses/writeVariants.md). */
const WRITTEN = {
  format: "nei",
  file: "the file",
  numBytes: 19_161_178,
  passStats: { numVars: 20_000, filtering: {} },
} as const;

/** The analyses of the states of stage 3, the three checks and the
    diversity, in an order of these tests' own: apps.ts has the
    histograms, the Counts, the statistics of each individual, then the
    diversity, in the order of the sections of the Variants step. */
const THE_ORDER = [STATISTICS, HISTOGRAMS, COUNTS, DIVERSITY] as const;

/** A state of stage 3: `PANEL`, the three checks and the diversity in
    the order of `THE_ORDER`, each ready unless `statuses` gives it another
    state, the writing ready, nothing in flight and no notice, with
    `parts` set. */
function checksState(
  parts: Partial<AppState<TestDefResult, unknown>> & {
    readonly statuses?: Readonly<
      Partial<Record<(typeof THE_ORDER)[number], AnalysisStatus<TestDefResult>>>
    >;
  },
): AppState<TestDefResult, unknown> {
  const { statuses = {}, ...rest } = parts;
  return deepFreeze<AppState<TestDefResult, unknown>>({
    project: PANEL,
    undo: null,
    redo: null,
    historyMoves: 0,
    popneiVersion: "0.1.0",
    analyses: THE_ORDER.map((id) => ({
      id,
      status: statuses[id] ?? ready(KEY_A),
    })),
    runs: [],
    notice: null,
    individualsKept: null,
    write: WRITE_READY,
    ...rest,
  });
}

/** The Counts of the filters done under `key`, `kept` variants passing
    the filters. */
function countsDone(
  key: Key,
  kept: number,
  warnings: readonly Warning[] = [],
): AnalysisStatus<TestDefResult> {
  return {
    kind: "done",
    key,
    result: { analysis: COUNTS, numbers: [kept] },
    warnings,
    check: null,
  };
}

function waitsForStatistics(runId: number): AnalysisStatus<TestDefResult> {
  return {
    kind: "running",
    key: KEY_B,
    runId,
    progress: null,
    waitsForStatistics: true,
  };
}

function writeRunning(runId: number): WriteStatus<unknown> {
  return {
    kind: "running",
    key: KEY_W,
    runId,
    progress: null,
    waitsForStatistics: false,
  };
}

const WRITE_FAILED: WriteStatus<unknown> = {
  kind: "error",
  key: KEY_W,
  error: { kind: "refused", message: "memory" },
  ofStatistics: false,
};

/** The individuals kept, a known list of the first `numKept` of the 200. */
function keptFirst(numKept: number): IndividualsKept {
  return {
    list: { kind: "known", individuals: TWO_HUNDRED.slice(0, numKept) },
    byLists: TWO_HUNDRED,
    counts: [],
  };
}

const THRESHOLDS = [
  { kind: "missing_data", maxAllowedMissingRate: 0.03 },
  { kind: "obs_het", maxAllowedObsHet: 0.38 },
] as const;

describe("VS5 D2 the states of the steps of stage 3", () => {
  test("a check running, the writing running, or a Run that waits for the statistics gives Variants Running", () => {
    const check = checksState({
      statuses: { [HISTOGRAMS]: running(KEY_B, 1) },
    });
    expect(stepStateOfState(check, "variants")).toEqual({
      status: "running",
      reason: null,
    });
    const writing = checksState({ write: writeRunning(2) });
    expect(stepStateOfState(writing, "variants")).toEqual({
      status: "running",
      reason: null,
    });
    const waiting = checksState({
      statuses: { [DIVERSITY]: waitsForStatistics(3) },
    });
    expect(stepStateOfState(waiting, "variants")).toEqual({
      status: "running",
      reason: null,
    });
  });

  test("a check running leaves the Analyses step as it was", () => {
    const doneDiversity = checksState({
      statuses: { [STATISTICS]: running(KEY_B, 1), [DIVERSITY]: done(KEY_A) },
    });
    expect(stepStateOfState(doneDiversity, "analyses")).toEqual({
      status: "done",
      reason: null,
    });
    const readyDiversity = checksState({
      statuses: { [COUNTS]: running(KEY_B, 1) },
    });
    expect(stepStateOfState(readyDiversity, "analyses")).toEqual({
      status: "ready",
      reason: null,
    });
  });

  test("a check among the results removed gives Variants Results removed, and not the Analyses step", () => {
    const s = checksState({
      statuses: { [STATISTICS]: removed(KEY_B) },
      notice: notice({ removed: [STATISTICS] }),
    });
    expect(stepStateOfState(s, "variants")).toEqual({
      status: "removed",
      reason: null,
    });
    expect(stepStateOfState(s, "analyses")).toEqual({
      status: "ready",
      reason: null,
    });
    // Results removed comes before Failed, and the writing in error.
    const alsoFailed = checksState({
      statuses: { [STATISTICS]: removed(KEY_B), [HISTOGRAMS]: failed(KEY_S) },
      notice: notice({ removed: [STATISTICS] }),
      write: WRITE_FAILED,
    });
    expect(stepStateOfState(alsoFailed, "variants")).toEqual({
      status: "removed",
      reason: null,
    });
  });

  test("a check in error gives Failed with its title, the writing in error its own words, the first in the order of the step", () => {
    const statistics = checksState({
      statuses: { [STATISTICS]: failed(KEY_B) },
    });
    expect(stepStateOfState(statistics, "variants")).toEqual({
      status: "failed",
      reason: "Statistics of each individual could not be calculated.",
    });
    const writing = checksState({ write: WRITE_FAILED });
    expect(stepStateOfState(writing, "variants")).toEqual({
      status: "failed",
      reason: "The file could not be written.",
    });
    const all = checksState({
      statuses: { [HISTOGRAMS]: failed(KEY_B), [STATISTICS]: failed(KEY_S) },
      write: WRITE_FAILED,
    });
    expect(stepStateOfState(all, "variants")).toEqual({
      status: "failed",
      reason: "Statistics of each individual could not be calculated.",
    });
  });

  test("a list of individuals that names one not in the file gives Problem before a check running", () => {
    const p = project({
      ...PANEL,
      individualFilters: [{ kind: "keep", individuals: ["i1", "x9"] }],
    });
    const reason = individualListNeeds(p)?.reason ?? null;
    expect(reason).not.toBeNull();
    const s = checksState({
      project: p,
      statuses: { [HISTOGRAMS]: running(KEY_B, 1) },
    });
    expect(stepStateOfState(s, "variants")).toEqual({
      status: "problem",
      reason,
    });
  });

  test("thresholds that keep no individual give Problem with the words of keptNoneReason, before a check running", () => {
    const s = checksState({
      project: project({ ...PANEL, individualFilters: THRESHOLDS }),
      individualsKept: keptFirst(0),
      statuses: { [STATISTICS]: running(KEY_B, 1) },
    });
    expect(stepStateOfState(s, "variants")).toEqual({
      status: "problem",
      reason:
        "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them in the Variants step.",
    });
  });

  test("Variants read with nothing running, removed or failed is Done, the Counts done and a file written among it", () => {
    expect(stepStateOfState(checksState({}), "variants")).toEqual({
      status: "done",
      reason: null,
    });
    const s = checksState({
      statuses: { [COUNTS]: countsDone(KEY_B, 1128) },
      write: { kind: "done", key: KEY_W, written: WRITTEN },
    });
    expect(stepStateOfState(s, "variants")).toEqual({
      status: "done",
      reason: null,
    });
  });
});

/** The state and reason stepStates gives the step `id` of a state of
    stage 3. */
function stepStateOfState(
  s: AppState<TestDefResult, unknown>,
  id: StepState["id"],
): Omit<StepState, "id"> {
  const found = stepStates(s, WORDS).find((step) => step.id === id);
  if (found === undefined) {
    throw new Error(`popnei_web defect: no step ${id}.`);
  }
  return { status: found.status, reason: found.reason };
}

/** The filters of the example of the summary line: the missing data
    filter at 0.05, the filter by heterozygosity at 0.9 and the MAF filter
    at 0.95, and the thresholds of the individuals at 0.03 and 0.38. */
const FIVE_FILTERS = project({
  ...PANEL,
  filters: [
    { kind: "missing_data", maxAllowedMissingRate: 0.05 },
    { kind: "obs_het", maxAllowedObsHet: 0.9 },
    { kind: "maf", maxAllowedMaf: 0.95 },
  ],
  individualFilters: THRESHOLDS,
});

/** The thresholds of the individuals at 0.03 and 0.38 and the missing
    data filter at 0.05 (docs/specs/core/individualsKept.md,
    filterCounts.md). */
const THREE_FILTERS = project({
  ...PANEL,
  filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
  individualFilters: THRESHOLDS,
});

describe("VS5 D2 the summary line of stage 3", () => {
  test("the example of the spec, with the individuals and the variants the filters keep", () => {
    expect(summaryLine(FIVE_FILTERS, keptFirst(111), 1096)).toBe(
      "panel.nei · 111 of 200 individuals kept · 1,096 of 1,200 variants kept · 5 filters · 3 populations by pop",
    );
  });

  test("the thresholds of the individuals with their statistics, and the counts", () => {
    expect(summaryLine(THREE_FILTERS, keptFirst(111), 1117)).toBe(
      "panel.nei · 111 of 200 individuals kept · 1,117 of 1,200 variants kept · 3 filters · 3 populations by pop",
    );
  });

  test("the thresholds of the individuals with no statistics and no counts", () => {
    expect(
      summaryLine(
        THREE_FILTERS,
        { list: { kind: "needsStatistics" }, byLists: TWO_HUNDRED, counts: [] },
        null,
      ),
    ).toBe(
      "panel.nei · 200 individuals, how many kept not yet known · 1,200 variants before the filters · 3 filters · 3 populations by pop",
    );
  });

  test("filters of individuals that remove none, or none known, give the individuals of the file", () => {
    const noneRemoved: IndividualsKept = {
      list: { kind: "known", individuals: null },
      byLists: TWO_HUNDRED,
      counts: [],
    };
    expect(summaryLine(PANEL, noneRemoved, null)).toBe(
      "panel.nei · 200 individuals · 1,200 variants before the filters · 1 filter · 3 populations by pop",
    );
    expect(summaryLine(PANEL, null, null)).toBe(
      "panel.nei · 200 individuals · 1,200 variants before the filters · 1 filter · 3 populations by pop",
    );
  });

  test("filters that keep no individual give none of them kept", () => {
    expect(summaryLine(THREE_FILTERS, keptFirst(0), null)).toBe(
      "panel.nei · none of 200 individuals kept · 1,200 variants before the filters · 3 filters · none of 3 populations by pop",
    );
  });

  test("VS7 D2 filters of individuals that leave populations with no individual give how many populations are kept", () => {
    // Every individual of p1, the second of each three, removed.
    const withoutP1 = TWO_HUNDRED.filter((_, index) => index % 3 !== 1);
    expect(
      summaryLine(
        THREE_FILTERS,
        {
          list: { kind: "known", individuals: withoutP1 },
          byLists: withoutP1,
          counts: [],
        },
        1152,
      ),
    ).toBe(
      "panel.nei · 133 of 200 individuals kept · 1,152 of 1,200 variants kept · 3 filters · 2 of 3 populations by pop",
    );
    expect(summaryLine(THREE_FILTERS, keptFirst(1), 1152)).toBe(
      "panel.nei · 1 of 200 individuals kept · 1,152 of 1,200 variants kept · 3 filters · 1 of 3 populations by pop",
    );
    // While the thresholds wait for the statistics, from the lists.
    expect(
      summaryLine(
        THREE_FILTERS,
        { list: { kind: "needsStatistics" }, byLists: withoutP1, counts: [] },
        null,
      ),
    ).toBe(
      "panel.nei · 200 individuals, how many kept not yet known · 1,200 variants before the filters · 3 filters · 2 of 3 populations by pop",
    );
  });

  test("a file of no variant gives no variant, with or without counts", () => {
    const empty = project({
      ...PANEL,
      variants: variants(readOf(TWO_HUNDRED, 0)),
    });
    expect(summaryLine(empty, null, null)).toBe(
      "panel.nei · 200 individuals · no variant · 1 filter · 3 populations by pop",
    );
    expect(summaryLine(empty, null, 0)).toBe(
      "panel.nei · 200 individuals · no variant · 1 filter · 3 populations by pop",
    );
  });

  test("variants not counted yet give no part of the variants, whatever the counts", () => {
    const notCounted = project({
      ...PANEL,
      variants: variants(readOf(TWO_HUNDRED, null)),
    });
    expect(summaryLine(notCounted, null, 1128)).toBe(
      "panel.nei · 200 individuals · 1 filter · 3 populations by pop",
    );
  });

  test("variants counted with no counts of the filters as they are give the variants of the file, and say the filters are not counted", () => {
    expect(summaryLine(FIVE_FILTERS, keptFirst(111), null)).toBe(
      "panel.nei · 111 of 200 individuals kept · 1,200 variants before the filters · 5 filters · 3 populations by pop",
    );
  });

  test("no counts and no filter of the variants give the variants of the file alone, which no filter changes", () => {
    const thresholdsAlone = project({
      ...PANEL,
      filters: [],
      individualFilters: THRESHOLDS,
    });
    expect(summaryLine(thresholdsAlone, keptFirst(111), null)).toBe(
      "panel.nei · 111 of 200 individuals kept · 1,200 variants · 2 filters · 3 populations by pop",
    );
  });

  test("counts with no filter of the variants give the variants of the file", () => {
    const noFilter = project({ ...PANEL, filters: [] });
    expect(summaryLine(noFilter, null, 1200)).toBe(
      "panel.nei · 200 individuals · 1,200 variants · no filter · 3 populations by pop",
    );
  });
});

const MAF_CHANGED = {
  kind: "command",
  description: "the MAF filter changed",
} as const;

const NEW_LOAD = {
  kind: "command",
  description: "a new variants file was loaded",
} as const;

const DISCARDED =
  "The written file, not saved, was discarded, and Undo does not bring it back; write it again to save it";

describe("VS5 D2 the words of the notice of stage 3", () => {
  test("the statistics of each individual removed, alone and with the diversity", () => {
    expect(
      noticeText(notice({ cause: MAF_CHANGED, removed: [STATISTICS] }), title)
        .text,
    ).toBe(
      "Statistics of each individual removed because the MAF filter changed",
    );
    expect(
      noticeText(
        notice({ cause: MAF_CHANGED, removed: [DIVERSITY, STATISTICS] }),
        title,
      ).text,
    ).toBe("2 results removed because the MAF filter changed");
  });

  test("the writing left behind alone", () => {
    expect(
      noticeText(notice({ cause: MAF_CHANGED, writeLeftBehind: true }), title),
    ).toEqual({
      text: "The MAF filter changed. The writing of the file will be stopped unless you undo the change",
      action: "Undo",
      reverse: "undo",
    });
  });

  test("the writing left behind with one calculation, and with two", () => {
    expect(
      noticeText(
        notice({
          cause: MAF_CHANGED,
          leftBehind: [DIVERSITY],
          writeLeftBehind: true,
        }),
        title,
      ).text,
    ).toBe(
      "The MAF filter changed. The ongoing calculation of Diversity and the writing of the file will be stopped unless you undo the change",
    );
    expect(
      noticeText(
        notice({
          cause: MAF_CHANGED,
          leftBehind: [DIVERSITY, STATISTICS],
          writeLeftBehind: true,
        }),
        title,
      ).text,
    ).toBe(
      "The MAF filter changed. The 2 ongoing calculations and the writing of the file will be stopped unless you undo the change",
    );
  });

  test("the writing stopped with a calculation and a result removed, with the comma of its row", () => {
    expect(
      noticeText(
        notice({
          cause: NEW_LOAD,
          removed: [STATISTICS],
          stopped: [DIVERSITY],
          writeStopped: true,
        }),
        title,
      ).text,
    ).toBe(
      "Statistics of each individual removed, and the calculation of Diversity and the writing of the file stopped, because a new variants file was loaded",
    );
  });

  test("the writing stopped alone, and after an undo with a result removed and no because", () => {
    expect(
      noticeText(notice({ cause: NEW_LOAD, writeStopped: true }), title).text,
    ).toBe(
      "The writing of the file stopped because a new variants file was loaded",
    );
    expect(
      noticeText(
        notice({
          cause: { ...NEW_LOAD, kind: "undo" },
          removed: [STATISTICS],
          writeStopped: true,
        }),
        title,
      ).text,
    ).toBe(
      "Undone: a new variants file was loaded. Statistics of each individual removed, and the writing of the file stopped",
    );
  });

  test("the written file discarded, alone", () => {
    expect(
      noticeText(notice({ cause: MAF_CHANGED, writeDiscarded: true }), title),
    ).toEqual({
      text: `The MAF filter changed. ${DISCARDED}`,
      action: "Undo",
      reverse: "undo",
    });
  });

  test("the written file discarded with a result removed", () => {
    expect(
      noticeText(
        notice({
          cause: MAF_CHANGED,
          removed: [STATISTICS],
          writeDiscarded: true,
        }),
        title,
      ).text,
    ).toBe(
      `Statistics of each individual removed because the MAF filter changed. ${DISCARDED}`,
    );
  });

  test("the written file discarded comes after the calculations left behind", () => {
    expect(
      noticeText(
        notice({
          cause: MAF_CHANGED,
          leftBehind: [DIVERSITY],
          writeDiscarded: true,
        }),
        title,
      ).text,
    ).toBe(
      `The MAF filter changed. The ongoing calculation of Diversity will be stopped unless you undo the change. ${DISCARDED}`,
    );
  });

  test("the written file discarded by an undo names Redo, the action", () => {
    expect(
      noticeText(
        notice({
          cause: { ...MAF_CHANGED, kind: "undo" },
          writeDiscarded: true,
        }),
        title,
      ),
    ).toEqual({
      text: "Undone: the MAF filter changed. The written file, not saved, was discarded, and Redo does not bring it back; write it again to save it",
      action: "Redo",
      reverse: "redo",
    });
  });
});

const KEPT_NONE_WARNING: Warning = {
  code: "filterKeptNone",
  text: "The MAF filter kept none of the 1,152 variants it was given, so the analyses have no variant to calculate over, and a file written would hold none. Loosen it, or a filter before it.",
};

describe("VS5 D2 the announcements of stage 3", () => {
  test("a check is named by its title as it starts and ends", () => {
    const before = checksState({});
    const started = checksState({
      statuses: { [STATISTICS]: running(KEY_S, 1) },
      runs: [run(1, STATISTICS, KEY_S, CURRENT)],
    });
    expect(announcementsOf(before, started, WORDS)).toEqual([
      "Statistics of each individual: calculating.",
    ]);
    const ended = checksState({ statuses: { [STATISTICS]: done(KEY_S) } });
    expect(announcementsOf(started, ended, WORDS)).toEqual([
      "Statistics of each individual: done.",
    ]);
  });

  test("a check that ends in error names the Variants step, which says why", () => {
    const before = checksState({
      statuses: { [HISTOGRAMS]: running(KEY_S, 1) },
      runs: [run(1, HISTOGRAMS, KEY_S, CURRENT)],
    });
    const after = checksState({ statuses: { [HISTOGRAMS]: failed(KEY_S) } });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Histograms of the variants could not be calculated. The Variants step says why.",
    ]);
  });

  test("the end of a Count says the line of the total", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      statuses: { [COUNTS]: running(KEY_S, 1) },
      runs: [run(1, COUNTS, KEY_S, CURRENT)],
    });
    const after = checksState({
      project: FIVE_FILTERS,
      statuses: { [COUNTS]: countsDone(KEY_S, 1128) },
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Counts of the filters: done. 1,128 of the 1,200 variants of panel.nei pass the filters.",
    ]);
  });

  test("the end of a Count where a filter kept none says its warning in place of the total", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      statuses: { [COUNTS]: running(KEY_S, 1) },
      runs: [run(1, COUNTS, KEY_S, CURRENT)],
    });
    const after = checksState({
      project: FIVE_FILTERS,
      statuses: { [COUNTS]: countsDone(KEY_S, 0, [KEPT_NONE_WARNING]) },
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      `Counts of the filters: done. ${KEPT_NONE_WARNING.text}`,
    ]);
  });

  test("the end of a Count with no filter of the variants says the variants of the file", () => {
    const noFilter = project({ ...PANEL, filters: [] });
    const before = checksState({
      project: noFilter,
      statuses: { [COUNTS]: running(KEY_S, 1) },
      runs: [run(1, COUNTS, KEY_S, CURRENT)],
    });
    const after = checksState({
      project: noFilter,
      statuses: { [COUNTS]: countsDone(KEY_S, 1200) },
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Counts of the filters: done. 1,200 variants in panel.nei, with no filter.",
    ]);
  });

  test("a calculation new in runs that stopped the writing left behind says so, alone and with calculations", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      runs: [
        run(1, null, KEY_W, LEFT_BEHIND),
        run(2, DIVERSITY, KEY_B, LEFT_BEHIND),
        run(3, STATISTICS, KEY_S, LEFT_BEHIND),
      ],
    });
    const stopping = (stopped: readonly number[]): readonly RunView[] =>
      [
        run(1, null, KEY_W, LEFT_BEHIND),
        run(2, DIVERSITY, KEY_B, LEFT_BEHIND),
        run(3, STATISTICS, KEY_S, LEFT_BEHIND),
      ].map((r) =>
        stopped.includes(r.runId) ? { ...r, ...LEFT_BEHIND_STOPPING } : r,
      );
    const after = (
      stopped: readonly number[],
    ): ReturnType<typeof checksState> =>
      checksState({
        project: FIVE_FILTERS,
        statuses: { [HISTOGRAMS]: running(KEY_S, 4) },
        runs: [...stopping(stopped), run(4, HISTOGRAMS, KEY_S, CURRENT)],
      });
    expect(announcementsOf(before, after([1]), WORDS)).toEqual([
      "Histograms of the variants: calculating. The earlier writing of the file was stopped.",
    ]);
    expect(announcementsOf(before, after([1, 2]), WORDS)).toEqual([
      "Histograms of the variants: calculating. The earlier calculation of Diversity and the writing of the file were stopped.",
    ]);
    expect(announcementsOf(before, after([1, 2, 3]), WORDS)).toEqual([
      "Histograms of the variants: calculating. The 2 earlier calculations and the writing of the file were stopped.",
    ]);
  });

  test("the end of a Count over a file with no variant says its warning in place of the total", () => {
    const empty: Warning = {
      code: "noVariant",
      text: "panel.nei has no variants. Load another variants file.",
    };
    const before = checksState({
      project: FIVE_FILTERS,
      statuses: { [COUNTS]: running(KEY_S, 1) },
      runs: [run(1, COUNTS, KEY_S, CURRENT)],
    });
    const after = checksState({
      project: FIVE_FILTERS,
      statuses: { [COUNTS]: countsDone(KEY_S, 0, [empty]) },
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      `Counts of the filters: done. ${empty.text}`,
    ]);
  });

  test("a request of the writing new in runs is Writing, with the name of the file", () => {
    const after = checksState({
      project: FIVE_FILTERS,
      write: writeRunning(1),
      runs: [run(1, null, KEY_W, CURRENT)],
    });
    expect(
      announcementsOf(checksState({ project: FIVE_FILTERS }), after, WORDS),
    ).toEqual(["Writing panel.filtered.nei."]);
  });

  test("a request of the writing new in runs that stopped a calculation left behind says so", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      runs: [run(1, DIVERSITY, KEY_B, LEFT_BEHIND)],
    });
    const after = checksState({
      project: FIVE_FILTERS,
      write: writeRunning(2),
      runs: [
        run(1, DIVERSITY, KEY_B, LEFT_BEHIND_STOPPING),
        run(2, null, KEY_W, CURRENT),
      ],
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Writing panel.filtered.nei. The earlier calculation of Diversity was stopped.",
    ]);
  });

  test("the writing that ends done says the file, its size and where to save it", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      write: writeRunning(1),
      runs: [run(1, null, KEY_W, CURRENT)],
    });
    const after = checksState({
      project: FIVE_FILTERS,
      write: { kind: "done", key: KEY_W, written: WRITTEN },
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "panel.filtered.nei is written, 19.2 MB; Save it in the Variants step.",
    ]);
  });

  test("the writing that ends with no variant, or in error, says so", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      write: writeRunning(1),
      runs: [run(1, null, KEY_W, CURRENT)],
    });
    const noFile = {
      format: WRITTEN.format,
      numBytes: WRITTEN.numBytes,
      passStats: WRITTEN.passStats,
    };
    const noVariant = checksState({
      project: FIVE_FILTERS,
      write: { kind: "noVariant", key: KEY_W, written: noFile },
    });
    expect(announcementsOf(before, noVariant, WORDS)).toEqual([
      "The filters kept none of the variants of panel.nei, so there is nothing to write.",
    ]);
    const failedWrite = checksState({
      project: FIVE_FILTERS,
      write: WRITE_FAILED,
    });
    expect(announcementsOf(before, failedWrite, WORDS)).toEqual([
      "The file could not be written. The Variants step says why.",
    ]);
  });

  test("the writing stopped says so", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      write: writeRunning(1),
      runs: [run(1, null, KEY_W, CURRENT_STOPPING)],
    });
    const after = checksState({ project: FIVE_FILTERS });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Writing the file: stopped.",
    ]);
  });

  test("a Run that waits for the statistics: their end and the start of its own request in one change", () => {
    const before = checksState({
      statuses: {
        [STATISTICS]: running(KEY_S, 1),
        [DIVERSITY]: waitsForStatistics(1),
      },
      runs: [run(1, STATISTICS, KEY_S, CURRENT)],
    });
    const after = checksState({
      statuses: { [STATISTICS]: done(KEY_S), [DIVERSITY]: running(KEY_B, 2) },
      runs: [run(2, DIVERSITY, KEY_B, CURRENT)],
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Statistics of each individual: done.",
      "Diversity: calculating.",
    ]);
    const writeAfter = checksState({
      project: FIVE_FILTERS,
      statuses: { [STATISTICS]: done(KEY_S) },
      write: writeRunning(2),
      runs: [run(2, null, KEY_W, CURRENT)],
    });
    expect(
      announcementsOf({ ...before, project: FIVE_FILTERS }, writeAfter, WORDS),
    ).toEqual([
      "Statistics of each individual: done.",
      "Writing panel.filtered.nei.",
    ]);
  });

  test("counts filled by the pass of a diversity are not announced", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      statuses: { [DIVERSITY]: running(KEY_B, 1) },
      runs: [run(1, DIVERSITY, KEY_B, CURRENT)],
    });
    const after = checksState({
      project: FIVE_FILTERS,
      statuses: { [DIVERSITY]: done(KEY_B), [COUNTS]: countsDone(KEY_S, 1128) },
    });
    expect(announcementsOf(before, after, WORDS)).toEqual(["Diversity: done."]);
  });

  test("a write dropped because it ended after a change is not announced", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      runs: [run(1, null, KEY_W, LEFT_BEHIND)],
    });
    const after = checksState({
      project: FIVE_FILTERS,
      write: { kind: "ready", key: KEY_B, dropped: true },
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([]);
    // Nor a write left behind that Close stopped.
    const stopping = checksState({
      project: FIVE_FILTERS,
      runs: [run(1, null, KEY_W, LEFT_BEHIND_STOPPING)],
    });
    expect(announcementsOf(stopping, after, WORDS)).toEqual([]);
  });
});

describe("VS5 D2 writtenDiscarded", () => {
  test("a file written and not saved is discarded when the writing goes to ready, to locked or to none, and not when it is saved or stays", () => {
    const done = checksState({
      write: { kind: "done", key: KEY_W, written: WRITTEN },
    });
    const saved = checksState({
      write: {
        kind: "saved",
        key: KEY_W,
        written: {
          format: WRITTEN.format,
          numBytes: WRITTEN.numBytes,
          passStats: WRITTEN.passStats,
        },
      },
    });
    const ready = checksState({ write: WRITE_READY });
    const locked = checksState({
      write: {
        kind: "locked",
        reason: "Load a variants file in the Variants step.",
      },
    });
    const none = checksState({ write: null });
    expect(writtenDiscarded(done, ready)).toBe(true);
    expect(writtenDiscarded(done, locked)).toBe(true);
    expect(writtenDiscarded(done, none)).toBe(true);
    expect(writtenDiscarded(done, saved)).toBe(false);
    expect(writtenDiscarded(done, done)).toBe(false);
    expect(writtenDiscarded(ready, locked)).toBe(false);
    expect(writtenDiscarded(saved, ready)).toBe(false);
  });
});

describe("VS5 D2 each step takes the states of its own analyses", () => {
  test("a check that failed makes the Variants step Failed and leaves the Analyses step Done with the diversity done", () => {
    const s = checksState({
      statuses: { [STATISTICS]: failed(KEY_S), [DIVERSITY]: done(KEY_A) },
    });
    expect(stepStateOfState(s, "variants")).toEqual({
      status: "failed",
      reason: "Statistics of each individual could not be calculated.",
    });
    expect(stepStateOfState(s, "analyses")).toEqual({
      status: "done",
      reason: null,
    });
  });

  test("the diversity running, or failed, leaves the Variants step Done; waiting for the statistics it makes it Running", () => {
    const runningDiversity = checksState({
      statuses: { [DIVERSITY]: running(KEY_A, 1) },
      runs: [run(1, DIVERSITY, KEY_A, CURRENT)],
    });
    expect(stepStateOfState(runningDiversity, "variants").status).toBe("done");
    const failedDiversity = checksState({
      statuses: { [DIVERSITY]: failed(KEY_A) },
    });
    expect(stepStateOfState(failedDiversity, "variants").status).toBe("done");
    const waiting = checksState({
      statuses: { [DIVERSITY]: waitsForStatistics(1) },
      runs: [run(1, STATISTICS, KEY_S, CURRENT)],
    });
    expect(stepStateOfState(waiting, "variants").status).toBe("running");
  });
});

describe("VS5 D2 the announcements of the writing, more", () => {
  test("two states that hold the same request of the writing announce nothing", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      write: writeRunning(1),
      runs: [run(1, null, KEY_W, CURRENT)],
    });
    const after = checksState({
      project: FIVE_FILTERS,
      write: {
        kind: "running",
        key: KEY_W,
        runId: 1,
        progress: { bytesRead: 10, numBytes: 20, pass: 1, numPasses: 1 },
        waitsForStatistics: false,
      },
      runs: [
        {
          ...run(1, null, KEY_W, CURRENT),
          progress: { bytesRead: 10, numBytes: 20, pass: 1, numPasses: 1 },
        },
      ],
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([]);
  });

  test("the end of an analysis is said before the end of the writing in one change", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      statuses: { [DIVERSITY]: running(KEY_A, 1) },
      write: writeRunning(2),
      runs: [run(1, DIVERSITY, KEY_A, CURRENT), run(2, null, KEY_W, CURRENT)],
    });
    const after = checksState({
      project: FIVE_FILTERS,
      statuses: { [DIVERSITY]: done(KEY_A) },
      write: { kind: "done", key: KEY_W, written: WRITTEN },
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Diversity: done.",
      "panel.filtered.nei is written, 19.2 MB; Save it in the Variants step.",
    ]);
  });

  test("a write whose statistics end with the filters of individuals keeping no one says the file was not written, and why", () => {
    const before = checksState({
      project: THREE_FILTERS,
      statuses: { [STATISTICS]: running(KEY_S, 1) },
      write: {
        kind: "running",
        key: KEY_W,
        runId: 1,
        progress: null,
        waitsForStatistics: true,
      },
      runs: [run(1, STATISTICS, KEY_S, CURRENT)],
    });
    const reason =
      "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them in the Variants step.";
    const after = checksState({
      project: THREE_FILTERS,
      statuses: { [STATISTICS]: done(KEY_S) },
      individualsKept: keptFirst(0),
      write: { kind: "locked", reason },
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Statistics of each individual: done.",
      `The file was not written. ${reason}`,
    ]);
  });

  test("a Run of the diversity whose statistics fail says, after their failure, that it was not run and where why is", () => {
    const before = checksState({
      project: THREE_FILTERS,
      statuses: {
        [STATISTICS]: running(KEY_S, 1),
        [DIVERSITY]: {
          kind: "running",
          key: KEY_A,
          runId: 1,
          progress: null,
          waitsForStatistics: true,
        },
      },
      runs: [run(1, STATISTICS, KEY_S, CURRENT)],
    });
    const after = checksState({
      project: THREE_FILTERS,
      statuses: {
        [STATISTICS]: failed(KEY_S),
        [DIVERSITY]: {
          kind: "error",
          key: KEY_A,
          error: { kind: "refused", message: "too few individuals" },
          ofStatistics: true,
        },
      },
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Statistics of each individual could not be calculated. The Variants step says why.",
      "Diversity was not run. The Analyses step says why.",
    ]);
  });

  test("VS7 D2 a Run of the diversity whose statistics end with the filters of individuals keeping no one says it was not run, and why", () => {
    const reason =
      "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them in the Variants step.";
    const before = checksState({
      project: THREE_FILTERS,
      statuses: {
        [STATISTICS]: running(KEY_S, 1),
        [DIVERSITY]: {
          kind: "running",
          key: KEY_A,
          runId: 1,
          progress: null,
          waitsForStatistics: true,
        },
      },
      runs: [run(1, STATISTICS, KEY_S, CURRENT)],
    });
    const after = checksState({
      project: THREE_FILTERS,
      statuses: {
        [STATISTICS]: done(KEY_S),
        [DIVERSITY]: { kind: "locked", reason },
      },
      individualsKept: keptFirst(0),
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "Statistics of each individual: done.",
      `Diversity was not run. ${reason}`,
    ]);
    // Stopped, it says only that.
    const stopping = checksState({
      ...before,
      runs: [{ ...run(1, STATISTICS, KEY_S, CURRENT), stopping: true }],
    });
    expect(announcementsOf(stopping, after, WORDS)).toEqual([
      "Statistics of each individual: stopped.",
    ]);
    // Individuals kept: its own request starts, and nothing is said of a
    // lock.
    const sent = checksState({
      project: THREE_FILTERS,
      statuses: {
        [STATISTICS]: done(KEY_S),
        [DIVERSITY]: running(KEY_A, 2),
      },
      individualsKept: keptFirst(111),
      runs: [run(2, DIVERSITY, KEY_A, CURRENT)],
    });
    expect(announcementsOf(before, sent, WORDS)).toEqual([
      "Statistics of each individual: done.",
      "Diversity: calculating.",
    ]);
  });

  test("the end of a write of a variants file with no variant says so in the step's words", () => {
    const before = checksState({
      project: FIVE_FILTERS,
      write: writeRunning(1),
      runs: [run(1, null, KEY_W, CURRENT)],
    });
    const after = checksState({
      project: FIVE_FILTERS,
      write: {
        kind: "noVariant",
        key: KEY_W,
        written: {
          format: WRITTEN.format,
          numBytes: 3594,
          passStats: {
            numVars: 0,
            filtering: { missing_data: { varsProcessed: 0, varsKept: 0 } },
          },
        },
      },
    });
    expect(announcementsOf(before, after, WORDS)).toEqual([
      "panel.nei has no variants, so there is nothing to write. Load another variants file in the Variants step.",
    ]);
  });

  test("a file name that could change the text around it is escaped in the start and in the words of no variant", () => {
    const bidi = project({
      ...FIVE_FILTERS,
      variants: {
        ...variants(readOf(TWO_HUNDRED, 1200)),
        name: "pa\u202enel.nei",
      },
    });
    const idle = checksState({ project: bidi });
    const started = checksState({
      project: bidi,
      write: writeRunning(1),
      runs: [run(1, null, KEY_W, CURRENT)],
    });
    expect(announcementsOf(idle, started, WORDS)).toEqual([
      "Writing pa\\u202enel.filtered.nei.",
    ]);
    const noVariant = checksState({
      project: bidi,
      write: {
        kind: "noVariant",
        key: KEY_W,
        written: {
          format: WRITTEN.format,
          numBytes: WRITTEN.numBytes,
          passStats: WRITTEN.passStats,
        },
      },
    });
    expect(announcementsOf(started, noVariant, WORDS)).toEqual([
      "The filters kept none of the variants of pa\\u202enel.nei, so there is nothing to write.",
    ]);
  });
});

/** panel.nei with the missing data filter at 0.1 and the LD filter on
    with no distance. */
const LD_NO_DISTANCE = project({
  ...PANEL,
  filters: [
    { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    { kind: "ld", maxAllowedR2: 0.3, maxDist: null },
  ],
});

describe("IP3 D3 the stepper and the summary line with the switches of stage 4", () => {
  test("an LD filter with no distance gives Variants Problem with the words of variantFilterNeeds, before a check running", () => {
    const reason = variantFilterNeeds(LD_NO_DISTANCE);
    expect(reason).toBe(
      "The LD filter of the Variants step needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn off the LD filter, in the Variants step.",
    );
    const s = checksState({
      project: LD_NO_DISTANCE,
      statuses: { [STATISTICS]: running(KEY_B, 1) },
    });
    expect(stepStateOfState(s, "variants")).toEqual({
      status: "problem",
      reason,
    });
  });

  test("a list of individuals popnei would refuse is said before the LD filter with no distance", () => {
    const p = project({
      ...LD_NO_DISTANCE,
      individualFilters: [{ kind: "keep", individuals: ["i1", "x9"] }],
    });
    const reason = individualListNeeds(p)?.reason ?? null;
    expect(reason).not.toBeNull();
    expect(stepStateOfState(checksState({ project: p }), "variants")).toEqual({
      status: "problem",
      reason,
    });
  });

  test("the LD filter with no distance is said before thresholds that keep no individual", () => {
    const p = project({ ...LD_NO_DISTANCE, individualFilters: THRESHOLDS });
    const s = checksState({ project: p, individualsKept: keptFirst(0) });
    expect(stepStateOfState(s, "variants")).toEqual({
      status: "problem",
      reason: variantFilterNeeds(p),
    });
  });

  test("the LD filter with no distance turned off locks nothing: Variants is Done", () => {
    const off = project({
      ...PANEL,
      filtersOff: [{ kind: "ld", maxAllowedR2: 0.3, maxDist: null }],
    });
    expect(stepStateOfState(checksState({ project: off }), "variants")).toEqual(
      { status: "done", reason: null },
    );
  });

  test("the missing data filter and an LD filter with no distance are 2 filters, over the variants before the filters", () => {
    expect(summaryLine(LD_NO_DISTANCE, null, null)).toBe(
      "panel.nei · 200 individuals · 1,200 variants before the filters · 2 filters · 3 populations by pop",
    );
  });

  test("the LD filter and a threshold turned off are not counted among the filters", () => {
    const off = project({
      ...PANEL,
      filtersOff: [{ kind: "ld", maxAllowedR2: 0.3, maxDist: 50000 }],
      individualFiltersOff: [{ kind: "obs_het", maxAllowedObsHet: 0.38 }],
    });
    expect(summaryLine(off, null, null)).toBe(
      "panel.nei · 200 individuals · 1,200 variants before the filters · 1 filter · 3 populations by pop",
    );
  });
});

// Stage 4: the metadata file optional, the one population, a file not
// given, and the end of a read with what it brings up on the
// Individuals step (docs/specs/shell.md, "How it is checked").

/** The reason of the Individuals step at Optional. */
const OPTIONAL_REASON = "Without it, every individual is in one population.";

const ONE_POPULATION_GROUPING = { kind: "onePopulation" } as const;

const NO_COLUMN = { kind: "populations", column: null } as const;

const NOT_GIVEN: IndividualsRead = { kind: "notGiven" };

/** A read of `table` with the types `types`, found with the options of
    a comma and a point, and a first character not decoded on the line
    `undecodedLine`. */
function typedRead(
  table: IndividualsTable,
  types: readonly ColumnType[],
  undecodedLine: number | null = null,
): IndividualsRead {
  return {
    kind: "read",
    table,
    columns: types,
    found: { encoding: "utf-8", separator: ",", decimal: ".", undecodedLine },
  };
}

// i1, i2 and i3 in the populations p0 and p1, with two columns of whole
// numbers.
const SCORED_TABLE: IndividualsTable = {
  columns: ["id", "pop", "score", "grade"],
  rows: [
    ["i1", "p0", "1", "2"],
    ["i2", "p1", "2", "3"],
    ["i3", "p0", "3", "4"],
  ],
};

const IDENTIFIER: ColumnType = { kind: "identifier" };
const CATEGORICAL: ColumnType = { kind: "categorical" };
const CONTINUOUS: ColumnType = { kind: "continuous" };
const STATUS_BINARY: ColumnType = { kind: "binary", one: "yes", zero: "no" };

/** The announcements of the end of a read of pops.csv, the same load
    pending before and read with `read` after, in a project of READ with
    the grouping `grouping` and the types set `typesSet`. */
function readEnded(
  read: IndividualsRead,
  grouping: Grouping = BY_POP,
  typesSet: IndividualsSource["typesSet"] = [],
): readonly string[] {
  const source = (r: IndividualsRead): IndividualsSource => ({
    ...individuals(r),
    typesSet,
  });
  const before = project({
    variants: variants(READ),
    individuals: source(PENDING),
    grouping,
  });
  const after = project({
    variants: variants(READ),
    individuals: source(read),
    grouping,
  });
  return announcementsOf(
    state({ project: before }),
    state({ project: after }),
    WORDS,
  );
}

/** A read of SCORED_TABLE with every column but the first categorical. */
const SCORED_PLAIN = typedRead(SCORED_TABLE, [
  IDENTIFIER,
  CATEGORICAL,
  CATEGORICAL,
  CATEGORICAL,
]);

const READ_WORDS = "pops.csv read: 3 rows, 4 columns. All 3 individuals found.";

describe("IP5 D1 the states of the Individuals step in the stepper", () => {
  test("with no metadata file Individuals is Optional whatever the grouping, with its reason", () => {
    expect(stepOf(state({}), "individuals")).toEqual({
      status: "optional",
      reason: OPTIONAL_REASON,
    });
    for (const grouping of [NO_COLUMN, BY_POP, ONE_POPULATION_GROUPING]) {
      const p = project({ variants: variants(READ), grouping });
      expect(stepOf(state({ project: p }), "individuals")).toEqual({
        status: "optional",
        reason: OPTIONAL_REASON,
      });
    }
  });

  test("a file read and no column chosen is To do, with the words of the one population", () => {
    const p = project({
      variants: variants(READ),
      individuals: individuals(TABLE_READ),
      grouping: NO_COLUMN,
    });
    expect(stepOf(state({ project: p }), "individuals")).toEqual({
      status: "todo",
      reason:
        "Choose the column that defines the populations, or all individuals in one population, in the Individuals step.",
    });
  });

  test("a file notGiven is To do, with the reason of individualsNeeds", () => {
    const p = project({
      variants: variants(READ),
      individuals: individuals(NOT_GIVEN),
      grouping: BY_POP,
    });
    expect(stepOf(state({ project: p }), "individuals")).toEqual({
      status: "todo",
      reason:
        "pops.csv was not read when this project was saved, so the project file does not hold it. Load pops.csv again in the Individuals step.",
    });
  });

  test("a file read that holds every individual, with the one population, is Done", () => {
    const p = project({
      variants: variants(READ),
      individuals: individuals(TABLE_READ),
      grouping: ONE_POPULATION_GROUPING,
    });
    expect(stepOf(state({ project: p }), "individuals")).toEqual({
      status: "done",
      reason: null,
    });
  });
});

describe("IP5 D1 the summary line of stage 4", () => {
  test("the first project: no metadata file, one population", () => {
    expect(plainLine(firstProject("popgen"))).toBe(
      "No variants file · 1 filter · no metadata file: one population",
    );
  });

  test("a file read and no column chosen: populations not chosen", () => {
    const p = project({
      variants: variants(READ),
      individuals: individuals(TABLE_READ),
      grouping: NO_COLUMN,
    });
    expect(plainLine(p)).toBe(
      "panel.nei · 3 individuals · 1 filter · populations not chosen",
    );
  });

  test("a file read with the one population: one population", () => {
    const p = project({
      variants: variants(READ),
      individuals: individuals(TABLE_READ),
      grouping: ONE_POPULATION_GROUPING,
    });
    expect(plainLine(p)).toBe(
      "panel.nei · 3 individuals · 1 filter · one population",
    );
  });

  test("a file notGiven: pops.csv not loaded", () => {
    const p = project({
      variants: variants(READ),
      individuals: individuals(NOT_GIVEN),
      grouping: BY_POP,
    });
    expect(plainLine(p)).toBe(
      "panel.nei · 3 individuals · 1 filter · pops.csv not loaded",
    );
  });
});

describe("IP5 D1 the end of a read of the metadata file", () => {
  test("a read that brings nothing up says the read and the check alone", () => {
    expect(readEnded(SCORED_PLAIN)).toEqual([READ_WORDS]);
  });

  test("a character not decoded", () => {
    const read = typedRead(
      SCORED_TABLE,
      [IDENTIFIER, CATEGORICAL, CATEGORICAL, CATEGORICAL],
      3,
    );
    expect(readEnded(read)).toEqual([
      `${READ_WORDS} Warning: line 3 of pops.csv has bytes that could not be read.`,
    ]);
  });

  test("a column of few whole numbers, and two of them", () => {
    const one = typedRead(SCORED_TABLE, [
      IDENTIFIER,
      CATEGORICAL,
      CONTINUOUS,
      CATEGORICAL,
    ]);
    expect(readEnded(one)).toEqual([
      `${READ_WORDS} Warning: score may hold codes and is taken as a measurement.`,
    ]);
    const two = typedRead(SCORED_TABLE, [
      IDENTIFIER,
      CATEGORICAL,
      CONTINUOUS,
      CONTINUOUS,
    ]);
    expect(readEnded(two)).toEqual([
      `${READ_WORDS} Warning: 2 columns may hold codes and are taken as measurements.`,
    ]);
  });

  test("the column of the populations not in the file", () => {
    expect(
      readEnded(SCORED_PLAIN, { kind: "populations", column: "popcat" }),
    ).toEqual([
      `${READ_WORDS} pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population.`,
    ]);
  });

  test("the types set and not applied, one column and two", () => {
    expect(
      readEnded(SCORED_PLAIN, BY_POP, [["status", STATUS_BINARY]]),
    ).toEqual([`${READ_WORDS} status does not have the type you set.`]);
    expect(
      readEnded(SCORED_PLAIN, BY_POP, [
        ["status", STATUS_BINARY],
        ["region", CATEGORICAL],
      ]),
    ).toEqual([`${READ_WORDS} 2 columns do not have the type you set.`]);
  });

  test("all four, in their order", () => {
    const read = typedRead(
      SCORED_TABLE,
      [IDENTIFIER, CATEGORICAL, CONTINUOUS, CATEGORICAL],
      7,
    );
    expect(
      readEnded(read, { kind: "populations", column: "popcat" }, [
        ["status", STATUS_BINARY],
      ]),
    ).toEqual([
      `${READ_WORDS} Warning: line 7 of pops.csv has bytes that could not be read. Warning: score may hold codes and is taken as a measurement. pops.csv has no column popcat, from which the populations were taken. Choose the column that defines the populations, or all individuals in one population. status does not have the type you set.`,
    ]);
  });

  test("the names of the columns are escaped", () => {
    const table: IndividualsTable = {
      columns: ["id", "pop", "sc‮ore"],
      rows: [["i1", "p0", "1"]],
    };
    const read = typedRead(table, [IDENTIFIER, CATEGORICAL, CONTINUOUS]);
    const said = readEnded(read, BY_POP, [["st‮atus", STATUS_BINARY]]);
    expect(said).toHaveLength(1);
    expect(said[0]).toContain(
      "Warning: sc\\u202eore may hold codes and is taken as a measurement.",
    );
    expect(said[0]).toContain("st\\u202eatus does not have the type you set.");
  });
});
