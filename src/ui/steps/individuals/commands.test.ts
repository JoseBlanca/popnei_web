import { describe, expect, test } from "vitest";

import {
  POPGEN_ANALYSES,
  firstProject,
  numVarsOf,
} from "../../../core/apps.ts";
import { createStore } from "../../../core/store.ts";
import type { Store } from "../../../core/store.ts";
import type { Job, JobResult } from "../../../worker/protocol.ts";
import type { StepCommand } from "../variants/commands.ts";
import {
  REMOVE_COMMAND,
  csvOptionCommand,
  groupingCommand,
  pickCommand,
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
    numVarsOf,
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
});
