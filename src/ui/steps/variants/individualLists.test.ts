import { describe, expect, test } from "vitest";

import { POPGEN_ANALYSES, countsOf, firstProject } from "../../../core/apps.ts";
import { createStore } from "../../../core/store.ts";
import type { Store } from "../../../core/store.ts";
import type { Job, JobResult } from "../../../worker/protocol.ts";
import {
  applyCommand,
  clearCommand,
  isApplied,
  listOf,
  namesOfText,
  notAppliedText,
  shownText,
  textOfList,
} from "./individualLists.ts";
import type { StepCommand } from "./commands.ts";

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

describe("the names of the text of a list", () => {
  test("one per line, the spaces and tabs at the ends taken off, the empty lines dropped, in the order written", () => {
    expect(namesOfText("  s002\t\n\n\ts000 \n \t \ns001")).toEqual([
      "s002",
      "s000",
      "s001",
    ]);
  });

  test("CRLF, a CR alone and LF all end a line", () => {
    expect(namesOfText("s000\r\ns001\rs002\ns003\r\n")).toEqual([
      "s000",
      "s001",
      "s002",
      "s003",
    ]);
  });

  test("a comma, a space or a tab inside a line is part of its name", () => {
    expect(namesOfText("s000, s001\ns002\ts003\nind 7")).toEqual([
      "s000, s001",
      "s002\ts003",
      "ind 7",
    ]);
  });

  test("other spaces at the ends, a no-break space among them, are kept", () => {
    expect(namesOfText(" s000 ")).toEqual([" s000 "]);
  });

  test("an empty text, or one of blank lines, has no name", () => {
    expect(namesOfText("")).toEqual([]);
    expect(namesOfText(" \n\t\r\n")).toEqual([]);
  });

  test("a column of 600 names pasted from a spreadsheet, with CRLF and a tab at the end of each, gives the 600 names in order", () => {
    const names = Array.from(
      { length: 600 },
      (_, i) => `s${String(i).padStart(3, "0")}`,
    );
    const pasted = names.map((name) => `${name}\t`).join("\r\n") + "\r\n";
    expect(namesOfText(pasted)).toEqual(names);
  });

  test("a repeated name is kept twice, for the reason of the project to name it", () => {
    expect(namesOfText("s000\ns000")).toEqual(["s000", "s000"]);
  });
});

describe("a list applied or not", () => {
  test("the text of a list is its names, one per line, and empty for none", () => {
    expect(textOfList(["s000", "s001"])).toBe("s000\ns001");
    expect(textOfList(null)).toBe("");
  });

  test("a text is the list applied when its names are the list, in the same order", () => {
    expect(isApplied(" s000\n\ns001 \n", ["s000", "s001"])).toBe(true);
    expect(isApplied("s001\ns000", ["s000", "s001"])).toBe(false);
    expect(isApplied("s000", ["s000", "s001"])).toBe(false);
    expect(isApplied("s000\ns001\ns002", ["s000", "s001"])).toBe(false);
  });

  test("a text of no name is no list, and an empty list of a project file", () => {
    expect(isApplied("", null)).toBe(true);
    expect(isApplied(" \n", null)).toBe(true);
    expect(isApplied("s000", null)).toBe(false);
    expect(isApplied("", [])).toBe(true);
  });

  test("the line of a list not applied names its button", () => {
    expect(notAppliedText("keep")).toBe(
      "This list is not applied yet; Apply the list to keep applies it.",
    );
    expect(notAppliedText("remove")).toBe(
      "This list is not applied yet; Apply the list to remove applies it.",
    );
  });

  test("the text shown is the one typed until an undo, a redo or an opening, and then the list of the project", () => {
    const typed = { text: "s009", moves: 3 };
    expect(shownText(typed, 3, ["s000"])).toBe("s009");
    expect(shownText(typed, 4, ["s000", "s001"])).toBe("s000\ns001");
    expect(shownText(typed, 4, null)).toBe("");
    expect(shownText(null, 3, ["s000"])).toBe("s000");
  });
});

describe("Apply and Clear", () => {
  test("Apply sends the names in the order written, one step of undo with its description", () => {
    const store = realStore();
    apply(store, applyCommand("keep", "s002\n s000 \n\n"));
    const state = store.getState();
    expect(listOf(state.project, "keep")).toEqual(["s002", "s000"]);
    expect(listOf(state.project, "remove")).toBeNull();
    expect(state.undo).toBe("the list of individuals to keep changed");
    apply(store, applyCommand("remove", "s001"));
    expect(listOf(store.getState().project, "remove")).toEqual(["s001"]);
    expect(store.getState().undo).toBe(
      "the list of individuals to remove changed",
    );
    store.undo();
    expect(listOf(store.getState().project, "remove")).toBeNull();
    expect(listOf(store.getState().project, "keep")).toEqual(["s002", "s000"]);
  });

  test("Apply of a text of no name removes the filter, and never sends an empty list", () => {
    const store = realStore();
    apply(store, applyCommand("keep", "s000"));
    apply(store, applyCommand("keep", " \n\t"));
    const project = store.getState().project;
    expect(listOf(project, "keep")).toBeNull();
    expect(project.individualFilters).toEqual([]);
    expect(store.getState().undo).toBe(
      "the list of individuals to keep changed",
    );
  });

  test("Apply of the list applied, or of no name with no list, makes no step of undo", () => {
    const store = realStore();
    apply(store, applyCommand("keep", " \n"));
    expect(store.getState().undo).toBeNull();
    apply(store, applyCommand("remove", "s000\ns001"));
    const project = store.getState().project;
    apply(store, applyCommand("remove", "s000\n\ns001 "));
    expect(store.getState().project).toBe(project);
    store.undo();
    expect(store.getState().undo).toBeNull();
  });

  test("Clear removes the filter, one step of undo with its description, and leaves the other list", () => {
    const store = realStore();
    apply(store, applyCommand("keep", "s000"));
    apply(store, applyCommand("remove", "s001"));
    apply(store, clearCommand("keep"));
    const project = store.getState().project;
    expect(listOf(project, "keep")).toBeNull();
    expect(listOf(project, "remove")).toEqual(["s001"]);
    expect(store.getState().undo).toBe(
      "the list of individuals to keep was cleared",
    );
    apply(store, clearCommand("remove"));
    expect(store.getState().undo).toBe(
      "the list of individuals to remove was cleared",
    );
    store.undo();
    store.undo();
    expect(listOf(store.getState().project, "keep")).toEqual(["s000"]);
  });

  test("Clear of a list the project does not have makes no step of undo", () => {
    const store = realStore();
    apply(store, clearCommand("remove"));
    expect(store.getState().undo).toBeNull();
  });
});
