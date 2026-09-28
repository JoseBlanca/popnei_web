import { describe, expect, test } from "vitest";

import { POPGEN_ANALYSES, countsOf, firstProject } from "../../../core/apps.ts";
import { createStore } from "../../../core/store.ts";
import type { Store } from "../../../core/store.ts";
import type { Job, JobResult } from "../../../worker/protocol.ts";
import type { StepCommand } from "../variants/commands.ts";
import { undoneOrRedone } from "../../sentences.ts";
import {
  FORGET_TYPES_COMMAND,
  ONE_POPULATION_COMMAND,
  REMOVE_COMMAND,
  codingCommand,
  csvOptionCommand,
  groupingCommand,
  pickCommand,
  populationItemCommand,
  typeCommand,
} from "./commands.ts";

/** The store of the page, with the analyses of the application and a
    worker that is never asked for anything here. */
function realStore(): Store<JobResult> {
  return createStore<Job, JobResult>({
    first: firstProject("popgen"),
    analyses: POPGEN_ANALYSES,
    send: () => {
      throw new Error("no calculation in this test");
    },
    countsOf,
    counts: null,
    statistics: null,
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes: 1024 * 1024,
    maxUndoSteps: 200,
  });
}

function apply(store: Store<JobResult>, step: StepCommand): void {
  store.apply(step.description, step.command);
}

const FILE_ID = "a".repeat(32);

describe("the commands of the Individuals step", () => {
  test("a pick loads the file pending, with every option found by the reader", () => {
    const store = realStore();
    apply(store, pickCommand(FILE_ID, "pops.csv"));
    expect(store.getState().undo).toBe("a new metadata file was loaded");
    expect(store.getState().project.individuals).toEqual({
      fileId: FILE_ID,
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [],
      read: { kind: "pending" },
    });
  });

  test("an option chosen sets it, keeps the other two, and names the file", () => {
    const store = realStore();
    apply(store, pickCommand(FILE_ID, "pops.csv"));
    apply(
      store,
      csvOptionCommand("separator", "pops.csv", {
        encoding: "auto",
        separator: ";",
        decimal: "auto",
      }),
    );
    expect(store.getState().undo).toBe("the separator of pops.csv changed");
    expect(store.getState().project.individuals?.csv).toEqual({
      encoding: "auto",
      separator: ";",
      decimal: "auto",
    });
    expect(
      csvOptionCommand("encoding", "a\nb.csv", {
        encoding: "utf-8",
        separator: "auto",
        decimal: "auto",
      }).description,
    ).toBe("the encoding of a\\nb.csv changed");
    expect(
      csvOptionCommand("decimal", "pops.csv", {
        encoding: "auto",
        separator: "auto",
        decimal: ",",
      }).description,
    ).toBe("the decimal mark of pops.csv changed");
  });

  test("a column chosen sets the grouping, and Remove takes the file away and keeps it", () => {
    const store = realStore();
    apply(store, pickCommand(FILE_ID, "pops.csv"));
    apply(store, groupingCommand("popcat"));
    expect(store.getState().undo).toBe("the column of the populations changed");
    expect(store.getState().project.grouping).toEqual({
      kind: "populations",
      column: "popcat",
    });
    apply(store, REMOVE_COMMAND);
    expect(store.getState().undo).toBe("the metadata file was removed");
    expect(store.getState().project.individuals).toBeNull();
    expect(store.getState().project.grouping).toEqual({
      kind: "populations",
      column: "popcat",
    });
    store.undo();
    expect(store.getState().project.individuals?.name).toBe("pops.csv");
  });

  test("IP5 D2 All individuals in one population chosen puts every individual in one population, one step of undo", () => {
    const store = realStore();
    apply(store, pickCommand(FILE_ID, "pops.csv"));
    apply(store, groupingCommand("popcat"));
    apply(store, populationItemCommand("one"));
    expect(store.getState().undo).toBe(
      "every individual was put in one population",
    );
    expect(store.getState().project.grouping).toEqual({
      kind: "onePopulation",
    });
    store.undo();
    expect(store.getState().project.grouping).toEqual({
      kind: "populations",
      column: "popcat",
    });
  });

  test("IP5 D2 the item of a column chooses that column, a column named one among them", () => {
    expect(populationItemCommand("column:popcat").description).toBe(
      "the column of the populations changed",
    );
    const store = realStore();
    apply(store, pickCommand(FILE_ID, "pops.csv"));
    apply(store, populationItemCommand("column:one"));
    expect(store.getState().project.grouping).toEqual({
      kind: "populations",
      column: "one",
    });
    apply(
      store,
      populationItemCommand("column:All individuals in one population"),
    );
    expect(store.getState().project.grouping).toEqual({
      kind: "populations",
      column: "All individuals in one population",
    });
    expect(populationItemCommand("one")).toBe(ONE_POPULATION_COMMAND);
  });
});

const AUTO = { encoding: "auto", separator: "auto", decimal: "auto" } as const;

/** pops.csv read with the comma: the names, status of two values,
    score of numbers. */
function readPops(store: Store<JobResult>, columns: readonly string[]): void {
  const rows = [
    ["i1", "yes", "1"],
    ["i2", "no", "2"],
    ["i3", "yes", "3"],
  ].map((row) => row.slice(0, columns.length));
  store.individualsRead(FILE_ID, AUTO, {
    kind: "read",
    table: { columns, rows },
    columns: (
      [
        { kind: "identifier" },
        { kind: "binary", one: "yes", zero: "no" },
        { kind: "continuous" },
      ] as const
    ).slice(0, columns.length),
    found: {
      encoding: "utf-8",
      separator: ",",
      decimal: ".",
      undecodedLine: null,
    },
  });
}

/** The type the read gives the column `column`. */
function typeOf(store: Store<JobResult>, column: string): unknown {
  const read = store.getState().project.individuals?.read;
  if (read?.kind !== "read") return null;
  return read.columns[read.table.columns.indexOf(column)];
}

describe("IP5 D2 the commands of the types of the columns", () => {
  test("a type chosen sets it, one step of undo with no notice, and an undo is said with its description", () => {
    const store = realStore();
    apply(store, pickCommand(FILE_ID, "pops.csv"));
    readPops(store, ["IID", "status", "score"]);
    apply(store, typeCommand("score", { kind: "categorical" }));
    expect(store.getState().undo).toBe("the type of score changed");
    expect(store.getState().notice).toBeNull();
    expect(typeOf(store, "score")).toEqual({ kind: "categorical" });
    expect(store.getState().project.individuals?.typesSet).toEqual([
      ["score", { kind: "categorical" }],
    ]);
    expect(
      undoneOrRedone({
        kind: "undo",
        description: "the type of score changed",
      }),
    ).toBe("Undone: the type of score changed");
    store.undo();
    expect(typeOf(store, "score")).toEqual({ kind: "continuous" });
    expect(typeCommand("sc\nore", { kind: "categorical" }).description).toBe(
      "the type of sc\\nore changed",
    );
  });

  test("the value coded 1 chosen sets the binary type with the other value coded 0, one step of undo with no notice", () => {
    const store = realStore();
    apply(store, pickCommand(FILE_ID, "pops.csv"));
    readPops(store, ["IID", "status", "score"]);
    apply(store, codingCommand("status", "no", "yes"));
    expect(store.getState().undo).toBe("the value coded 1 in status changed");
    expect(store.getState().notice).toBeNull();
    expect(typeOf(store, "status")).toEqual({
      kind: "binary",
      one: "no",
      zero: "yes",
    });
    store.undo();
    expect(typeOf(store, "status")).toEqual({
      kind: "binary",
      one: "yes",
      zero: "no",
    });
  });

  test("the types forgotten drop those not applied and keep the others, one step of undo with no notice", () => {
    const store = realStore();
    apply(store, pickCommand(FILE_ID, "pops.csv"));
    readPops(store, ["IID", "status", "score"]);
    apply(store, typeCommand("score", { kind: "categorical" }));
    apply(store, codingCommand("status", "no", "yes"));
    // Read again with the semicolon: one column, no type applied.
    apply(
      store,
      csvOptionCommand("separator", "pops.csv", { ...AUTO, separator: ";" }),
    );
    store.individualsRead(
      FILE_ID,
      { ...AUTO, separator: ";" },
      {
        kind: "read",
        table: { columns: ["IID,status,score"], rows: [["i1,yes,1"]] },
        columns: [{ kind: "identifier" }],
        found: {
          encoding: "utf-8",
          separator: ";",
          decimal: ".",
          undecodedLine: null,
        },
      },
    );
    apply(store, FORGET_TYPES_COMMAND);
    expect(store.getState().undo).toBe(
      "the types set and not applied were forgotten",
    );
    expect(store.getState().notice).toBeNull();
    expect(store.getState().project.individuals?.typesSet).toEqual([]);
    store.undo();
    expect(store.getState().project.individuals?.typesSet).toEqual([
      ["score", { kind: "categorical" }],
      ["status", { kind: "binary", one: "no", zero: "yes" }],
    ]);
  });
});
