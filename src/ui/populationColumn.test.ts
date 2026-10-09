/**
 * The column of the populations that the entry of popgen2.html chooses
 * when a read of the individuals file is recorded, and what it says of
 * the read (docs/specs/entry.md, "The column of the populations on
 * popgen2.html"), with the store the entry makes and a fake worker that
 * never answers: the reads are recorded by the test, as the light worker
 * would give them.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import {
  loadIndividuals,
  loadVariants,
  setCsvOptions,
  setGrouping,
  setThreshold,
} from "../core/project.ts";
import type { IndividualsReadGiven, Project } from "../core/project.ts";
import type { Store } from "../core/store.ts";
import type {
  Cell,
  CsvOptions,
  IndividualsTable,
  JobResult,
  Outcome,
  Run,
} from "../worker/protocol.ts";
import { choosePopulationColumns } from "./populationColumn.ts";
import { createPopgen2Store } from "./popgen2Store.ts";
import { createRunGate, gatedStore } from "./variants/thresholdRun.ts";

/** The description of the entry's command. */
const CHOSEN = "the column of the populations was chosen";

/** The options of a CSV a file is opened with. */
const AUTO: CsvOptions = {
  encoding: "auto",
  separator: "auto",
  decimal: "auto",
};

/** The table of `panel_pops.csv`, every cell a text. */
const PANEL_POPS: IndividualsTable = (() => {
  const text = readFileSync(
    new URL("../../e2e/fixtures/panel_pops.csv", import.meta.url),
    "utf8",
  );
  const [header, ...lines] = text.trim().split("\n");
  if (header === undefined) throw new Error("panel_pops.csv has no header");
  return {
    columns: header.split(","),
    rows: lines.map((line): Cell[] => line.split(",")),
  };
})();

/** The individuals of `panel.nei`. */
const PANEL_INDIVIDUALS = PANEL_POPS.rows.map((row) => String(row[0]));

/** A read of a CSV of `table`, read with the comma. */
function readOf(table: IndividualsTable): IndividualsReadGiven {
  return {
    kind: "read",
    table,
    columns: table.columns.map((_, index) =>
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

/** `panel_pops.csv` read with the semicolon: a table of one column, each
    line whole, so that none of its names is one of panel.nei. */
const NAMES_ALONE: IndividualsTable = {
  columns: ["IID,popcat"],
  rows: PANEL_POPS.rows.map((row) => [`${String(row[0])},${String(row[1])}`]),
};

/** A read that failed because the light worker crashed, which the read
    after its restart replaces. */
const WORKER_FAILED: IndividualsReadGiven = {
  kind: "failed",
  error: {
    kind: "worker",
    error: { kind: "workerFailed", message: "the worker crashed" },
  },
  format: null,
};

/** The load id of the `n`th file opened. */
function loadId(n: number): string {
  return n.toString(16).padStart(32, "0");
}

/** The page's store with a fake worker, gated as the screens' is, the
    entry's watch of it, what it said and the commands of the column
    sent. */
function page(): {
  readonly store: Store<JobResult, Blob>;
  readonly gate: ReturnType<typeof createRunGate>;
  readonly said: string[];
  readonly chosen: () => number;
  readonly stop: () => void;
} {
  const raw = createPopgen2Store({
    send: (): Run<JobResult> => ({
      id: 1,
      outcome: new Promise<Outcome<JobResult>>(() => undefined),
      cancel: () => undefined,
    }),
    sendWrite: () => {
      throw new Error("popnei_web defect: no write is sent here");
    },
    appVersion: "0.1.0",
  });
  raw.popneiReady("0.2.2");
  const gate = createRunGate();
  const store = gatedStore(raw, gate);
  let chosen = 0;
  const counted: Store<JobResult, Blob> = {
    ...store,
    apply: (description, command) => {
      if (description === CHOSEN) chosen += 1;
      store.apply(description, command);
    },
  };
  const said: string[] = [];
  const stop = choosePopulationColumns({
    store: counted,
    announce: (words) => {
      said.push(words);
    },
  });
  return { store: counted, gate, said, chosen: () => chosen, stop };
}

/** Opens `panel.nei` in `store`, read with its 200 individuals. */
function openVariants(store: Store<JobResult, Blob>): void {
  const fileId = "ffffffffffffffffffffffffffffffff";
  store.apply("a new variants file was loaded", (p) =>
    loadVariants(p, {
      fileId,
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
    }),
  );
  store.variantsRead(fileId, {
    kind: "read",
    individuals: PANEL_INDIVIDUALS,
    ploidy: 2,
    numVars: null,
    keepsPassed: false,
  });
}

/** Opens the individuals file `name` as the load `fileId`. */
function openIndividuals(
  store: Store<JobResult, Blob>,
  fileId: string,
  name = "panel_pops.csv",
): void {
  store.apply("an individuals file was opened", (p) =>
    loadIndividuals(p, { fileId, name, csv: AUTO }),
  );
}

/** Records the read `read` of the load `fileId` with the options the
    project holds, and lets the entry's microtask run. */
async function recorded(
  store: Store<JobResult, Blob>,
  fileId: string,
  read: IndividualsReadGiven,
): Promise<void> {
  const csv = store.getState().project.individuals?.csv ?? null;
  store.individualsRead(fileId, csv, read);
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/** The column of the grouping of `p`. */
function columnOf(p: Project): string | null | undefined {
  return p.grouping.kind === "populations" ? p.grouping.column : undefined;
}

/** Chooses "None" in the list, as the screen does. */
function chooseNone(store: Store<JobResult, Blob>): void {
  store.apply("the column of the populations changed", (p) =>
    setGrouping(p, { kind: "populations", column: null }),
  );
}

/** Sets the separator of the CSV, as the select of the tab does. */
function setSeparator(
  store: Store<JobResult, Blob>,
  separator: CsvOptions["separator"],
): void {
  store.apply("the separator changed", (p) =>
    setCsvOptions(p, { ...AUTO, separator }),
  );
}

describe("IN5 D2 the column of the populations chosen by the entry of popgen2.html", () => {
  test("a read of panel_pops.csv recorded sends one command after the listeners of the record, the grouping is popcat, and the read is said", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    store.individualsRead(loadId(1), AUTO, readOf(PANEL_POPS));
    // Not while the store tells its listeners of the record, but after.
    expect(chosen()).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(chosen()).toBe(1);
    expect(columnOf(store.getState().project)).toBe("popcat");
    expect(store.getState().undo).toBe(CHOSEN);
    expect(said).toEqual([
      "panel_pops.csv read: 200 rows, the populations from popcat.",
    ]);
  });

  test("None chosen after it sends nothing, and a change of separator read again keeps None", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    chooseNone(store);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(chosen()).toBe(1);
    setSeparator(store, ";");
    await recorded(store, loadId(1), readOf(NAMES_ALONE));
    setSeparator(store, ",");
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    expect(chosen()).toBe(1);
    expect(columnOf(store.getState().project)).toBeNull();
    expect(said).toEqual([
      "panel_pops.csv read: 200 rows, the populations from popcat.",
      "panel_pops.csv read: 200 rows, no column chosen for the populations. Warning: none of the 200 individuals of panel.nei is in panel_pops.csv, so all of them are unclassified. The first column of panel_pops.csv has to hold their names as panel.nei writes them: panel.nei starts with s000, and panel_pops.csv with s000,p0. No column of panel_pops.csv holds text with 20 different values or fewer, so none was chosen as the column of the populations. Choose it in the list.",
      "panel_pops.csv read: 200 rows, no column chosen for the populations.",
    ]);
  });

  test("another file opened after None gets its column", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    chooseNone(store);
    openIndividuals(store, loadId(2), "other.csv");
    await recorded(store, loadId(2), readOf(PANEL_POPS));
    expect(chosen()).toBe(2);
    expect(columnOf(store.getState().project)).toBe("popcat");
    expect(said).toEqual([
      "panel_pops.csv read: 200 rows, the populations from popcat.",
      "other.csv read: 200 rows, the populations from popcat.",
    ]);
  });

  test("a second file with a column popcat keeps it and sends nothing", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    openIndividuals(store, loadId(2), "split.csv");
    const split: IndividualsTable = {
      columns: ["IID", "region", "popcat"],
      rows: PANEL_POPS.rows.map((row) => [
        row[0] ?? null,
        "north",
        row[1] ?? null,
      ]),
    };
    await recorded(store, loadId(2), readOf(split));
    expect(chosen()).toBe(1);
    expect(columnOf(store.getState().project)).toBe("popcat");
    expect(said.at(-1)).toBe(
      "split.csv read: 200 rows, the populations from popcat.",
    );
  });

  test("a second file whose popcat is true and false, which the list does not offer, gets the page's column", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    openIndividuals(store, loadId(2), "flags.csv");
    const flags: IndividualsTable = {
      columns: ["IID", "popcat", "region"],
      rows: PANEL_POPS.rows.map((row) => [
        row[0] ?? null,
        row[1] === "p0",
        row[1] ?? null,
      ]),
    };
    await recorded(store, loadId(2), readOf(flags));
    expect(chosen()).toBe(2);
    expect(columnOf(store.getState().project)).toBe("region");
    expect(said).toEqual([
      "panel_pops.csv read: 200 rows, the populations from popcat.",
      "flags.csv read: 200 rows, the populations from region.",
    ]);
  });

  test("with no None of the user, a read again whose table has no popcat gets the page's column, or keeps the grouping when there is none", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    setSeparator(store, ";");
    await recorded(store, loadId(1), readOf(NAMES_ALONE));
    // No column of the table qualifies: nothing is sent, and the list
    // shows None.
    expect(chosen()).toBe(1);
    expect(said.at(-1)).toBe(
      "panel_pops.csv read: 200 rows, no column chosen for the populations. Warning: none of the 200 individuals of panel.nei is in panel_pops.csv, so all of them are unclassified. The first column of panel_pops.csv has to hold their names as panel.nei writes them: panel.nei starts with s000, and panel_pops.csv with s000,p0. No column of panel_pops.csv holds text with 20 different values or fewer, so none was chosen as the column of the populations. Choose it in the list.",
    );
    setSeparator(store, "\t");
    const renamed: IndividualsTable = {
      columns: ["IID", "group"],
      rows: PANEL_POPS.rows,
    };
    await recorded(store, loadId(1), readOf(renamed));
    expect(chosen()).toBe(2);
    expect(columnOf(store.getState().project)).toBe("group");
  });

  test("a table of numbers alone sends nothing and says the read with no column", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1), "codes.csv");
    const numbers: IndividualsTable = {
      columns: ["IID", "code"],
      rows: PANEL_INDIVIDUALS.map((name, index) => [name, index % 3]),
    };
    await recorded(store, loadId(1), readOf(numbers));
    expect(chosen()).toBe(0);
    expect(columnOf(store.getState().project)).toBeNull();
    expect(said).toEqual([
      "codes.csv read: 200 rows, no column chosen for the populations. No column of codes.csv holds text with 20 different values or fewer, so none was chosen as the column of the populations. Choose it in the list.",
    ]);
  });

  test("an undo and a redo send nothing and say nothing", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    store.undo();
    store.undo();
    store.redo();
    store.redo();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(chosen()).toBe(1);
    expect(said).toHaveLength(1);
    expect(columnOf(store.getState().project)).toBe("popcat");
  });

  test("an undo of the column the entry chose is the user's None, kept through a change of separator", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    store.undo();
    expect(columnOf(store.getState().project)).toBeNull();
    setSeparator(store, ",");
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    expect(chosen()).toBe(1);
    expect(columnOf(store.getState().project)).toBeNull();
    expect(said).toEqual([
      "panel_pops.csv read: 200 rows, the populations from popcat.",
      "panel_pops.csv read: 200 rows, no column chosen for the populations.",
    ]);
  });

  test("a run of the arrow keys on a threshold still held when a read is recorded is made a change before the command of the column", async () => {
    const { store, gate, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    gate.hold(
      () => {
        store.apply("the threshold of the missing genotypes changed", (p) =>
          setThreshold(p, { of: "individuals", kind: "missing_data" }, 0.03),
        );
      },
      () => "the threshold of the missing genotypes changed",
    );
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    expect(chosen()).toBe(1);
    expect(store.getState().undo).toBe(CHOSEN);
    store.undo();
    expect(store.getState().undo).toBe(
      "the threshold of the missing genotypes changed",
    );
  });

  test("a refusal sends nothing and says the words of the box", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), {
      kind: "failed",
      error: {
        kind: "raggedRow",
        line: 2,
        expected: 1,
        found: 2,
        separator: ",",
      },
      format: "text",
    });
    expect(chosen()).toBe(0);
    expect(said).toHaveLength(1);
    expect(said[0]).toMatch(
      /^panel_pops\.csv could not be read: .*\. Choose another separator under the tab Individuals file, or open a corrected file\.$/u,
    );
  });

  test("the read of a file opened before the variants file is said, and its column chosen", async () => {
    const { store, said, chosen } = page();
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    expect(chosen()).toBe(1);
    expect(said).toEqual([
      "panel_pops.csv read: 200 rows, the populations from popcat.",
    ]);
  });

  test("an undo of a change of separator whose read still waits says nothing", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    setSeparator(store, ";");
    store.undo();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.getState().project.individuals?.read.kind).toBe("read");
    expect(chosen()).toBe(1);
    expect(said).toEqual([
      "panel_pops.csv read: 200 rows, the populations from popcat.",
    ]);
  });

  test("a read that failed in its worker is said once, and a change of a threshold after it says nothing", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), WORKER_FAILED);
    store.apply("the threshold of the missing genotypes changed", (p) =>
      setThreshold(p, { of: "individuals", kind: "missing_data" }, 0.03),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(chosen()).toBe(0);
    expect(said).toEqual([
      "panel_pops.csv could not be read: the page stopped while it read it. Open the file again.",
    ]);
  });

  test("the read after the worker's restart, over a read that failed in it, chooses the column and is said", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    await recorded(store, loadId(1), WORKER_FAILED);
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    expect(chosen()).toBe(1);
    expect(columnOf(store.getState().project)).toBe("popcat");
    expect(said).toEqual([
      "panel_pops.csv could not be read: the page stopped while it read it. Open the file again.",
      "panel_pops.csv read: 200 rows, the populations from popcat.",
    ]);
  });

  test("a read replaced by another before the entry's turn is not acted on: only the last is", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    store.individualsRead(loadId(1), AUTO, readOf(PANEL_POPS));
    setSeparator(store, ";");
    await recorded(store, loadId(1), readOf(NAMES_ALONE));
    expect(chosen()).toBe(0);
    expect(columnOf(store.getState().project)).toBeNull();
    expect(said).toEqual([
      "panel_pops.csv read: 200 rows, no column chosen for the populations. Warning: none of the 200 individuals of panel.nei is in panel_pops.csv, so all of them are unclassified. The first column of panel_pops.csv has to hold their names as panel.nei writes them: panel.nei starts with s000, and panel_pops.csv with s000,p0. No column of panel_pops.csv holds text with 20 different values or fewer, so none was chosen as the column of the populations. Choose it in the list.",
    ]);
  });

  test("a grouping of every individual in one population is never changed", async () => {
    const { store, said, chosen } = page();
    openVariants(store);
    openIndividuals(store, loadId(1));
    store.apply("the grouping changed", (p) =>
      setGrouping(p, { kind: "onePopulation" }),
    );
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    expect(chosen()).toBe(0);
    expect(store.getState().project.grouping).toEqual({
      kind: "onePopulation",
    });
    expect(said).toEqual([
      "panel_pops.csv read: 200 rows, no column chosen for the populations.",
    ]);
  });

  test("stopped after a read is recorded and before its turn, it sends and says nothing", async () => {
    const { store, said, chosen, stop } = page();
    openIndividuals(store, loadId(1));
    store.individualsRead(loadId(1), AUTO, readOf(PANEL_POPS));
    stop();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(chosen()).toBe(0);
    expect(said).toEqual([]);
  });

  test("once stopped, it sends and says nothing", async () => {
    const { store, said, chosen, stop } = page();
    openIndividuals(store, loadId(1));
    stop();
    await recorded(store, loadId(1), readOf(PANEL_POPS));
    expect(chosen()).toBe(0);
    expect(said).toEqual([]);
  });
});
