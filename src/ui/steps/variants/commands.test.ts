import { describe, expect, test } from "vitest";

import { POPGEN_ANALYSES, countsOf, firstProject } from "../../../core/apps.ts";
import type { VariantLoad } from "../../../core/project.ts";
import { createStore } from "../../../core/store.ts";
import type { Store } from "../../../core/store.ts";
import type { Job, JobResult } from "../../../worker/protocol.ts";
import {
  LOAD_DESCRIPTIONS,
  besideOf,
  filterCommand,
  filterSwitchCommand,
  isBeside,
  pickCommand,
  readAgainCommand,
  turnedOnFilter,
} from "./commands.ts";
import type { StepCommand } from "./commands.ts";
import { createVcfOptions } from "./vcfOptions.ts";
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

/** The missing data filter at `maxAllowedMissingRate` committed. */
function missingData(maxAllowedMissingRate: number): StepCommand {
  return filterCommand({ kind: "missing_data", maxAllowedMissingRate });
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
    apply(store, filterSwitchCommand("missing_data", false));
    expect(store.getState().undo).toBe(
      "the filter of the variants by missing data was turned off",
    );
    expect(store.getState().project.filters).toEqual([]);
    apply(store, filterSwitchCommand("missing_data", true));
    expect(store.getState().undo).toBe(
      "the filter of the variants by missing data was turned on",
    );
    expect(store.getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
  });

  test("two presses of an arrow key from 0.1 are two commands, each undone alone", () => {
    const store = realStore();
    apply(store, missingData(0.11));
    apply(store, missingData(0.12));
    expect(store.getState().undo).toBe(
      "the filter of the variants by missing data changed",
    );
    store.undo();
    expect(store.getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.11 },
    ]);
    expect(store.getState().undo).toBe(
      "the filter of the variants by missing data changed",
    );
    store.undo();
    expect(store.getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
  });
});

describe("the four filters of the variants", () => {
  test("each switch turned on starts its filter at the values of the table of the filters, in the fixed order, with its description", () => {
    const store = realStore();
    apply(store, filterSwitchCommand("ld", true));
    expect(store.getState().undo).toBe("the LD pruning was turned on");
    apply(store, filterSwitchCommand("maf", true));
    expect(store.getState().undo).toBe("the MAF filter was turned on");
    apply(store, filterSwitchCommand("obs_het", true));
    expect(store.getState().undo).toBe(
      "the filter of the variants by observed heterozygosity was turned on",
    );
    expect(store.getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "obs_het", maxAllowedObsHet: 0.5 },
      { kind: "maf", maxAllowedMaf: 0.95 },
      { kind: "ld", maxAllowedR2: 0.3, maxDist: null },
    ]);
  });

  test("a field committed changes its filter alone, with the description of the filter, and off takes it out of the filters", () => {
    const store = realStore();
    apply(store, filterSwitchCommand("ld", true));
    apply(
      store,
      filterCommand({ kind: "ld", maxAllowedR2: 0.3, maxDist: 500 }),
    );
    expect(store.getState().undo).toBe("the LD pruning changed");
    apply(store, filterCommand({ kind: "maf", maxAllowedMaf: 0.9 }));
    expect(store.getState().undo).toBe("the MAF filter changed");
    apply(store, filterCommand({ kind: "obs_het", maxAllowedObsHet: 0.4 }));
    expect(store.getState().undo).toBe(
      "the filter of the variants by observed heterozygosity changed",
    );
    expect(store.getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "obs_het", maxAllowedObsHet: 0.4 },
      { kind: "maf", maxAllowedMaf: 0.9 },
      { kind: "ld", maxAllowedR2: 0.3, maxDist: 500 },
    ]);
    apply(store, filterSwitchCommand("obs_het", false));
    expect(store.getState().undo).toBe(
      "the filter of the variants by observed heterozygosity was turned off",
    );
    apply(store, filterSwitchCommand("maf", false));
    expect(store.getState().undo).toBe("the MAF filter was turned off");
    apply(store, filterSwitchCommand("ld", false));
    expect(store.getState().undo).toBe("the LD pruning was turned off");
    expect(store.getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
    expect(store.getState().project.filtersOff).toEqual([
      { kind: "obs_het", maxAllowedObsHet: 0.4 },
      { kind: "maf", maxAllowedMaf: 0.9 },
      { kind: "ld", maxAllowedR2: 0.3, maxDist: 500 },
    ]);
  });

  test("IP3 D3 each switch turned off and on again gives back the values of its filter, in the fixed order", () => {
    const store = realStore();
    apply(store, filterSwitchCommand("ld", true));
    apply(
      store,
      filterCommand({ kind: "ld", maxAllowedR2: 0.2, maxDist: 50000 }),
    );
    apply(store, filterSwitchCommand("obs_het", true));
    apply(store, filterCommand({ kind: "obs_het", maxAllowedObsHet: 0.4 }));
    apply(store, filterSwitchCommand("maf", true));
    apply(store, filterCommand({ kind: "maf", maxAllowedMaf: 0.9 }));
    apply(store, missingData(0.05));
    for (const kind of ["missing_data", "obs_het", "maf", "ld"] as const) {
      apply(store, filterSwitchCommand(kind, false));
    }
    expect(store.getState().project.filters).toEqual([]);
    for (const kind of ["ld", "maf", "obs_het", "missing_data"] as const) {
      apply(store, filterSwitchCommand(kind, true));
    }
    expect(store.getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.05 },
      { kind: "obs_het", maxAllowedObsHet: 0.4 },
      { kind: "maf", maxAllowedMaf: 0.9 },
      { kind: "ld", maxAllowedR2: 0.2, maxDist: 50000 },
    ]);
    expect(store.getState().project.filtersOff).toEqual([]);
  });

  test("IP3 D3 the LD pruning turned on, off and on again before a distance is typed has no distance", () => {
    const store = realStore();
    apply(store, filterSwitchCommand("ld", true));
    apply(store, filterSwitchCommand("ld", false));
    apply(store, filterSwitchCommand("ld", true));
    expect(store.getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "ld", maxAllowedR2: 0.3, maxDist: null },
    ]);
  });

  test("a new project has the missing data filter alone, at 0.1", () => {
    expect(realStore().getState().project.filters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
    ]);
  });
});

describe("IP3 D4 the filter a switch turned on gives", () => {
  test('turnedOnFilter(p, "ld") of a project that has never had the LD pruning gives r² 0.3 and no distance', () => {
    expect(turnedOnFilter(firstProject("popgen"), "ld")).toEqual({
      kind: "ld",
      maxAllowedR2: 0.3,
      maxDist: null,
    });
  });

  test('turnedOnFilter(p, "ld") of a project that keeps the LD pruning in filtersOff gives that filter', () => {
    const kept = { kind: "ld", maxAllowedR2: 0.2, maxDist: 50000 } as const;
    const p = {
      ...firstProject("popgen"),
      filtersOff: [{ kind: "maf", maxAllowedMaf: 0.9 } as const, kept],
    };
    expect(turnedOnFilter(p, "ld")).toBe(kept);
  });
});

describe("the options of a VCF the Variants step shows", () => {
  test("after a pick with ploidy 4 and an undo, the options of the load it goes back to, and no button to read it again", () => {
    const store = realStore();
    const options = createVcfOptions(store);
    options.load(pickCommand(vcf("a", "a.vcf", 2)));
    options.edit({ ploidy: 4, onlyPassed: true });
    expect(options.shown().ploidy).toBe(4);
    options.load(
      pickCommand({ ...vcf("b", "b.vcf", 4), readOptions: options.shown() }),
    );
    expect(options.getEdited()).toBeNull();
    expect(options.shown().ploidy).toBe(4);

    store.undo();

    const shown = options.shown();
    expect(shown.ploidy).toBe(2);
    expect(store.getState().project.variants?.readOptions?.ploidy).toBe(2);
    expect(
      readAgainLabel("a.vcf", { ploidy: 2, onlyPassed: true }, shown),
    ).toBe(null);
  });

  test("with no file, a ploidy set and picked is forgotten, and an undo shows the default", () => {
    const store = realStore();
    const options = createVcfOptions(store);
    options.edit({ ploidy: 4, onlyPassed: true });
    expect(options.shown().ploidy).toBe(4);
    options.load(pickCommand({ ...vcf("a", "a.vcf", 4) }));
    store.undo();
    expect(options.shown().ploidy).toBe(2);
  });

  test("an edit not yet picked is kept while its load is there, and set back when the load changes", () => {
    const store = realStore();
    const options = createVcfOptions(store);
    options.load(pickCommand(vcf("a", "a.vcf", 2)));
    options.edit({ ploidy: 3, onlyPassed: false });
    apply(store, missingData(0.2));
    expect(options.shown()).toEqual({ ploidy: 3, onlyPassed: false });
    apply(store, pickCommand(vcf("c", "c.vcf", 2)));
    expect(options.shown()).toEqual({ ploidy: 2, onlyPassed: true });
  });

  test("with no file, a ploidy set and then a project opened whose file was a VCF of ploidy 2: the options of that VCF", () => {
    const store = realStore();
    const options = createVcfOptions(store);
    options.edit({ ploidy: 4, onlyPassed: false });
    const made = store.getState().project;
    store.open({
      ...made,
      reference: {
        variants: {
          ...vcf("a", "panel.vcf.gz", 2),
          read: { kind: "pending" },
        },
        checks: [],
      },
    });

    expect(options.shown()).toEqual({ ploidy: 2, onlyPassed: true });
  });

  test("what the step said beside a load is beside it after a change of the filter, and not after an undo back past its pick", () => {
    const store = realStore();
    apply(store, pickCommand(vcf("a", "a.vcf", 2)));
    const beside = besideOf(store.getState().project);
    apply(store, missingData(0.2));
    expect(isBeside(beside, store.getState().project)).toBe(true);

    store.undo();
    store.undo();

    expect(isBeside(beside, store.getState().project)).toBe(false);
  });

  test("each change of the edits calls the listeners, and getEdited keeps its object until then", () => {
    const store = realStore();
    const options = createVcfOptions(store);
    let calls = 0;
    const stop = options.subscribe(() => {
      calls += 1;
    });
    options.edit({ ploidy: 4, onlyPassed: true });
    const edited = options.getEdited();
    expect(options.getEdited()).toBe(edited);
    options.load(pickCommand(vcf("a", "a.vcf", 4)));
    expect(calls).toBe(2);
    stop();
    options.edit({ ploidy: 3, onlyPassed: true });
    expect(calls).toBe(2);
  });
});

describe("the descriptions of the commands that change the load", () => {
  test("the list the words of the histograms removed read is the descriptions of the pick and of the read again", () => {
    const load = vcf("a", "a.vcf", 2);
    expect(LOAD_DESCRIPTIONS).toEqual([
      pickCommand(load).description,
      readAgainCommand(load).description,
    ]);
  });
});
