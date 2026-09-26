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
} from "../../core/store.ts";
import { identityWarning } from "../../core/projectFile.ts";
import { deepFreeze } from "../../core/testSupport.ts";
import type { TestDefResult } from "../../core/testSupport.ts";
import type { CsvOptions, IndividualsTable } from "../../worker/protocol.ts";
import {
  announcementsOf,
  noticeText,
  stepStates,
  summaryLine,
} from "./words.ts";
import type { StepState } from "./words.ts";

// The two analyses of population genetics of TEST_DEFS.
const DIVERSITY = "diversity";
const PCA = "pca";

const TITLES: ReadonlyMap<AnalysisId, string> = new Map([
  [DIVERSITY, "Diversity"],
  [PCA, "PCA"],
]);

function title(id: AnalysisId): string {
  const found = TITLES.get(id);
  if (found === undefined) {
    throw new Error(`popnei_web defect: no title for ${id}.`);
  }
  return found;
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
  return { fileId: INDIVIDUALS_ID, name: "pops.csv", csv, read };
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
  return { kind: "running", key, runId, progress: null };
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
  };
}

function run(
  runId: number,
  analysis: AnalysisId,
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
    popneiVersion: "0.1.0",
    analyses: [
      { id: DIVERSITY, status: statuses[0] },
      { id: PCA, status: statuses[1] },
    ],
    runs: [],
    notice: null,
    ...rest,
  });
}

function notice(parts: Partial<Notice>): Notice {
  return {
    cause: { kind: "command", description: "the missing data filter changed" },
    removed: [],
    leftBehind: [],
    stopped: [],
    ...parts,
  };
}

/** The state and reason stepStates gives the step `id`. */
function stepOf(
  s: AppState<TestDefResult>,
  id: StepState["id"],
): Omit<StepState, "id"> {
  const found = stepStates(s, title).find((step) => step.id === id);
  if (found === undefined) {
    throw new Error(`popnei_web defect: no step ${id}.`);
  }
  return { status: found.status, reason: found.reason };
}

describe("WS9 D1 the states of the steps", () => {
  test("the steps come in their order, each with its state", () => {
    expect(stepStates(state({}), title)).toEqual([
      { id: "variants", status: "todo", reason: LOAD_VARIANTS },
      {
        id: "individuals",
        status: "todo",
        reason: "Load a metadata file in the Individuals step.",
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

  test("Individuals with no metadata file is To do", () => {
    const p = project({ variants: variants(READ) });
    expect(stepOf(state({ project: p }), "individuals")).toEqual({
      status: "todo",
      reason: "Load a metadata file in the Individuals step.",
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
        "Choose the column that defines the populations in the Individuals step.",
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
        "pops.csv has no column region, from which the populations were taken. Choose the column that defines the populations in the Individuals step.",
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
    expect(summaryLine(firstProject("popgen"))).toBe(
      "No variants file · 1 filter · no metadata file",
    );
  });

  test("the example of the spec, with 1,200 variants counted", () => {
    const p = project({
      variants: variants(readOf(TWO_HUNDRED, 1200)),
      individuals: individuals(THREE_POPS),
      grouping: BY_POP,
    });
    expect(summaryLine(p)).toBe(
      "panel.nei · 200 individuals · 1,200 variants · 1 filter · 3 populations by pop",
    );
  });

  test("no variants file, and for an opened project the file it was made with", () => {
    expect(summaryLine(OPENED)).toBe(
      "No variants file: the project was made with panel_2026.nei · 1 filter · no metadata file",
    );
  });

  test("a variants file being read", () => {
    expect(summaryLine(project({ variants: variants(PENDING) }))).toBe(
      "Reading panel.nei · 1 filter · no metadata file",
    );
  });

  test("a variants file whose read failed", () => {
    expect(summaryLine(project({ variants: variants(REFUSED) }))).toBe(
      "panel.nei could not be read · 1 filter · no metadata file",
    );
  });

  test("a variants file read, its variants once a calculation has counted them", () => {
    expect(summaryLine(project({ variants: variants(READ) }))).toBe(
      "panel.nei · 3 individuals · 1 filter · no metadata file",
    );
    expect(
      summaryLine(project({ variants: variants(readOf(["i1"], 1_203_554)) })),
    ).toBe(
      "panel.nei · 1 individual · 1,203,554 variants · 1 filter · no metadata file",
    );
  });

  test("the filters of the variants and of the individuals, counted", () => {
    expect(summaryLine(project({ filters: [] }))).toBe(
      "No variants file · no filter · no metadata file",
    );
    expect(
      summaryLine(
        project({
          individualFilters: [
            { kind: "missing_data", maxAllowedMissingRate: 0.2 },
          ],
        }),
      ),
    ).toBe("No variants file · 2 filters · no metadata file");
  });

  test("no metadata file", () => {
    expect(summaryLine(project({ variants: variants(READ) }))).toMatch(
      / · no metadata file$/,
    );
  });

  test("a metadata file being read", () => {
    expect(summaryLine(project({ individuals: individuals(PENDING) }))).toBe(
      "No variants file · 1 filter · reading pops.csv",
    );
  });

  test("a metadata file whose read failed, with individuals missing, or without the column of the populations", () => {
    expect(summaryLine(project({ individuals: individuals(EMPTY_FILE) }))).toBe(
      "No variants file · 1 filter · pops.csv could not be read",
    );
    const missing = project({
      variants: variants(readOf(["i1", "i2", "i3", "i4"])),
      individuals: individuals(SHORT_TABLE_READ),
      grouping: BY_POP,
    });
    expect(summaryLine(missing)).toBe(
      "panel.nei · 4 individuals · 1 filter · 2 individuals missing from pops.csv",
    );
    const oneMissing = project({
      variants: variants(READ),
      individuals: individuals(SHORT_TABLE_READ),
      grouping: BY_POP,
    });
    expect(summaryLine(oneMissing)).toBe(
      "panel.nei · 3 individuals · 1 filter · 1 individual missing from pops.csv",
    );
    const noSuchColumn = project({
      variants: variants(READ),
      individuals: individuals(TABLE_READ),
      grouping: { kind: "populations", column: "region" },
    });
    expect(summaryLine(noSuchColumn)).toBe(
      "panel.nei · 3 individuals · 1 filter · column region not in pops.csv",
    );
  });

  test("a metadata file read with no column chosen is one population", () => {
    const p = project({
      variants: variants(READ),
      individuals: individuals(TABLE_READ),
    });
    expect(summaryLine(p)).toBe(
      "panel.nei · 3 individuals · 1 filter · one population",
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
    expect(summaryLine(read)).toBe(
      "panel.nei · 3 individuals · 1 filter · 2 populations by pop",
    );
    const reading = project({
      variants: variants(PENDING),
      individuals: individuals(withEmptyCell),
      grouping: BY_POP,
    });
    expect(summaryLine(reading)).toBe(
      "Reading panel.nei · 1 filter · 3 populations by pop",
    );
  });
});

const NEW_FILE = "a new variants file was loaded";

describe("WS9 D1 the words of the notice", () => {
  test("a command", () => {
    expect(noticeText(notice({ removed: [DIVERSITY] }), title)).toEqual({
      text: "Diversity removed because the missing data filter changed",
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
      text: "The missing data filter changed. The ongoing calculation of Diversity will be stopped unless you undo the change",
      action: "Undo",
      reverse: "undo",
    });
  });

  test("an undo", () => {
    const n = notice({
      cause: { kind: "undo", description: "the missing data filter changed" },
      removed: [DIVERSITY],
    });
    expect(noticeText(n, title)).toEqual({
      text: "Undone: the missing data filter changed. Diversity removed",
      action: "Redo",
      reverse: "redo",
    });
  });

  test("an undo, with a calculation left behind, names Redo", () => {
    const n = notice({
      cause: { kind: "undo", description: "the missing data filter changed" },
      leftBehind: [DIVERSITY],
    });
    expect(noticeText(n, title)).toEqual({
      text: "Undone: the missing data filter changed. The ongoing calculation of Diversity will be stopped unless you redo the change",
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
      cause: { kind: "redo", description: "the missing data filter changed" },
      removed: [DIVERSITY],
      leftBehind: [DIVERSITY],
    });
    expect(noticeText(n, title)).toEqual({
      text: "Redone: the missing data filter changed. Diversity removed. The ongoing calculation of Diversity will be stopped unless you undo the change",
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
      cause: { kind: "undo", description: "the missing data filter changed" },
      leftBehind: [DIVERSITY, PCA],
    });
    expect(noticeText(undone, title)).toEqual({
      text: "Undone: the missing data filter changed. The 2 ongoing calculations will be stopped unless you redo the change",
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
    expect(announcementsOf(before, after, title)).toEqual([
      "Diversity: calculating.",
    ]);
    // In the order of the table: a start comes before an end.
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
    expect(announcementsOf(ending, endedAndStarted, title)).toEqual([
      "PCA: calculating.",
      "Diversity: done.",
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
    expect(announcementsOf(before, after, title)).toEqual([
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
    expect(announcementsOf(currentBefore, currentAfter, title)).toEqual([
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
    expect(announcementsOf(twoBefore, twoAfter, title)).toEqual([
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
    expect(announcementsOf(before, twoStarted, title)).toEqual([
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
        title,
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
        title,
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
        title,
      ),
    ).toEqual(["Diversity: done."]);
    expect(
      announcementsOf(
        before,
        state({ project: READY, statuses: [done(KEY_A, 2), LOCKED] }),
        title,
      ),
    ).toEqual(["Diversity: done, 2 warnings."]);
    expect(
      announcementsOf(
        before,
        state({ project: READY, statuses: [done(KEY_A, 1), LOCKED] }),
        title,
      ),
    ).toEqual(["Diversity: done, 1 warning."]);
    // Done under another key is not the end of this request.
    expect(
      announcementsOf(
        before,
        state({ project: READY, statuses: [done(KEY_B), LOCKED] }),
        title,
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
    expect(announcementsOf(before, after, title)).toEqual([
      "Diversity could not be calculated. The Analyses step says why.",
    ]);
    // An error under another key is not the end of this request.
    const otherKey = state({
      project: READY,
      statuses: [failed(KEY_B), LOCKED],
    });
    expect(announcementsOf(before, otherKey, title)).toEqual([]);
  });

  test("a current request being stopped that left runs is stopped", () => {
    const before = state({
      project: READY,
      statuses: [ready(KEY_A), LOCKED],
      runs: [run(1, DIVERSITY, KEY_A, CURRENT_STOPPING)],
    });
    const after = state({ project: READY, statuses: [ready(KEY_A), LOCKED] });
    expect(announcementsOf(before, after, title)).toEqual([
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
        title,
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
        title,
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
          title,
        ),
      ).toEqual(["panel.nei read: 3 individuals, ploidy 2."]);
    }
  });

  test("the variants file of the same load failed gives the reason of the project", () => {
    expect(
      announcementsOf(
        state({ project: project({ variants: variants(PENDING) }) }),
        state({ project: project({ variants: variants(REFUSED) }) }),
        title,
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
        title,
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
        title,
      ),
    ).toEqual([
      "pops.csv read: 2 rows, 2 columns. 2 individuals of panel.nei are not in pops.csv.",
    ]);
    const alone = project({ individuals: individuals(TABLE_READ) });
    expect(
      announcementsOf(
        state({ project: project({ individuals: individuals(PENDING) }) }),
        state({ project: alone }),
        title,
      ),
    ).toEqual(["pops.csv read: 4 rows, 2 columns."]);
  });

  test("the metadata file of the same load and options failed gives the reason of the individuals", () => {
    expect(
      announcementsOf(
        state({ project: project({ individuals: individuals(PENDING) }) }),
        state({ project: project({ individuals: individuals(EMPTY_FILE) }) }),
        title,
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
      redo: "the missing data filter changed",
    });
    expect(announcementsOf(before, after, title)).toEqual([]);
  });

  test("a calculation left behind that ends, by itself or stopped, announces nothing", () => {
    const after = state({ project: READY, statuses: [done(KEY_A), LOCKED] });
    for (const flags of [LEFT_BEHIND, LEFT_BEHIND_STOPPING]) {
      const before = state({
        project: READY,
        statuses: [done(KEY_A), LOCKED],
        runs: [run(1, DIVERSITY, KEY_A, flags)],
      });
      expect(announcementsOf(before, after, title)).toEqual([]);
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
        title,
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
        title,
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
    expect(announcementsOf(before, after, title)).toEqual([]);
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
        title,
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
        title,
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
        title,
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
        title,
      ),
    ).toEqual([]);
    expect(
      announcementsOf(
        state({ project: pending }),
        state({ project: read }),
        title,
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
        title,
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
        title,
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
          title,
        ),
      ).toEqual([]);
    }
  });
});
