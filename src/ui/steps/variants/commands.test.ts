import { describe, expect, test } from "vitest";

import {
  POPGEN_ANALYSES,
  firstProject,
  numVarsOf,
} from "../../../core/apps.ts";
import type { VariantLoad } from "../../../core/project.ts";
import { createStore } from "../../../core/store.ts";
import type { Store } from "../../../core/store.ts";
import type { Job, JobResult } from "../../../worker/protocol.ts";
import {
  filterSwitchCommand,
  pickCommand,
  readAgainCommand,
  shownOptions,
  thresholdCommand,
} from "./commands.ts";
import type { EditedOptions, StepCommand } from "./commands.ts";
import { readAgainLabel } from "./words.ts";

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

function vcf(fileId: string, name: string, ploidy: number): VariantLoad {
  return {
    fileId: fileId.repeat(32),
    name,
    size: 1000,
    format: "vcf",
    readOptions: { ploidy, onlyPassed: true },
  };
}

describe("the commands of the Variants step", () => {
  test("each command is one step of undo, with its description", () => {
    const store = realStore();
    apply(store, pickCommand(vcf("a", "a.vcf", 2)));
    expect(store.getState().undo).toBe("a new variants file was loaded");
    apply(store, readAgainCommand(vcf("b", "a.vcf", 4)));
    expect(store.getState().undo).toBe(
      "the variants file was read again with other options",
    );
    apply(store, filterSwitchCommand(false));
    expect(store.getState().undo).toBe(
      "the missing data filter was turned off",
    );
    expect(store.getState().project.filters).toEqual([]);
    apply(store, filterSwitchCommand(true));
    expect(store.getState().undo).toBe("the missing data filter was turned on");
    expect(store.getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
  });

  test("two presses of an arrow key from 0.1 are two commands, each undone alone", () => {
    const store = realStore();
    apply(store, thresholdCommand(0.11));
    apply(store, thresholdCommand(0.12));
    expect(store.getState().undo).toBe("the missing data filter changed");
    store.undo();
    expect(store.getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.11 },
    ]);
    expect(store.getState().undo).toBe("the missing data filter changed");
    store.undo();
    expect(store.getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
  });
});

describe("the options of a VCF the Variants step shows", () => {
  test("after an undo, the options of the load it goes back to, and no button to read it again", () => {
    const store = realStore();
    apply(store, pickCommand(vcf("a", "a.vcf", 2)));
    // Ploidy 4 set, then b.vcf picked with it: the step forgets the edit
    // it applied.
    let edited: EditedOptions | null = {
      forLoad: "a".repeat(32),
      options: { ploidy: 4, onlyPassed: true },
    };
    const chosen = shownOptions(edited, store.getState().project);
    expect(chosen.ploidy).toBe(4);
    apply(store, pickCommand({ ...vcf("b", "b.vcf", 4), readOptions: chosen }));
    edited = null;
    expect(shownOptions(edited, store.getState().project).ploidy).toBe(4);

    store.undo();

    const project = store.getState().project;
    const shown = shownOptions(edited, project);
    expect(shown.ploidy).toBe(2);
    expect(project.variants?.readOptions?.ploidy).toBe(2);
    expect(
      readAgainLabel("a.vcf", { ploidy: 2, onlyPassed: true }, shown),
    ).toBe(null);
  });

  test("with no file, a ploidy set and picked is forgotten, and an undo shows the default", () => {
    const store = realStore();
    let edited: EditedOptions | null = {
      forLoad: null,
      options: { ploidy: 4, onlyPassed: true },
    };
    expect(shownOptions(edited, store.getState().project).ploidy).toBe(4);
    apply(store, pickCommand(vcf("a", "a.vcf", 4)));
    edited = null;
    store.undo();
    expect(shownOptions(edited, store.getState().project).ploidy).toBe(2);
  });

  test("an edit not yet picked is kept while its load is there", () => {
    const store = realStore();
    apply(store, pickCommand(vcf("a", "a.vcf", 2)));
    const edited: EditedOptions = {
      forLoad: "a".repeat(32),
      options: { ploidy: 3, onlyPassed: false },
    };
    apply(store, thresholdCommand(0.2));
    expect(shownOptions(edited, store.getState().project)).toEqual({
      ploidy: 3,
      onlyPassed: false,
    });
  });
});
