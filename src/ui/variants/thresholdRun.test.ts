/**
 * The runs of the keys on a threshold of popgen2.html, and the gate that
 * makes a run waiting a change before any other command
 * (docs/specs/steps/popgen2-filters.md, "When a threshold changes the
 * project"), with the fake timers of Vitest for the quiet second.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { setThreshold, thresholdValue } from "../../core/project.ts";
import type { Project } from "../../core/project.ts";
import { createPopgen2Store, openVariantsFile } from "../popgen2Store.ts";
import {
  RUN_QUIET_MS,
  createRunGate,
  createThresholdRun,
  gatedStore,
} from "./thresholdRun.ts";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** A run over a gate of its own, and the changes and ends it made. */
function runOf(gate = createRunGate()): {
  readonly run: ReturnType<typeof createThresholdRun>;
  readonly changes: number[];
  readonly ends: { count: number };
} {
  const changes: number[] = [];
  const ends = { count: 0 };
  const run = createThresholdRun({
    gate,
    describe: (to) => `the MAF filter changed to ${String(to)}`,
    change: (to) => {
      changes.push(to);
    },
    ended: () => {
      ends.count += 1;
    },
  });
  return { run, changes, ends };
}

describe("SF9 D1 a run of the keys on a threshold", () => {
  test("a press makes no change by itself; the run ends one second after its last press, with one change at where it ended", () => {
    const { run, changes, ends } = runOf();
    run.press(0.1, 0.099);
    expect(changes).toEqual([]);
    expect(run.waiting()).toBe(true);
    // Ten presses in all, each just within the quiet second, on the
    // steps of the axis as the page gives them, 0.099 to 0.09.
    for (let press = 1; press < 10; press += 1) {
      vi.advanceTimersByTime(RUN_QUIET_MS - 1);
      run.press((100 - press) / 1000, (99 - press) / 1000);
      expect(changes).toEqual([]);
    }
    vi.advanceTimersByTime(RUN_QUIET_MS - 1);
    expect(changes).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(changes).toEqual([0.09]);
    expect(ends.count).toBe(1);
    expect(run.waiting()).toBe(false);
    // The next press starts a run of its own.
    run.press(0.09, 0.089);
    vi.advanceTimersByTime(RUN_QUIET_MS);
    expect(changes).toEqual([0.09, 0.089]);
  });

  test("the focus leaving ends the run at once, with its change, and the timer then makes none", () => {
    const { run, changes, ends } = runOf();
    run.press(0.5, 0.49);
    run.press(0.49, 0.48);
    run.end();
    expect(changes).toEqual([0.48]);
    expect(ends.count).toBe(1);
    vi.advanceTimersByTime(RUN_QUIET_MS * 2);
    expect(changes).toEqual([0.48]);
    expect(ends.count).toBe(1);
    // Nothing waits: an end makes nothing.
    run.end();
    expect(ends.count).toBe(1);
  });

  test("a run that ends where it started makes no change, and is ended all the same", () => {
    const { run, changes, ends } = runOf();
    // From off, at the top of the axis, Down then Up.
    run.press(0.1, 0.099);
    run.press(0.099, 0.1);
    vi.advanceTimersByTime(RUN_QUIET_MS);
    expect(changes).toEqual([]);
    expect(ends.count).toBe(1);
  });

  test("while a run waits the gate gives the description of the change it will become, and tells its listeners at each press and at its end; nothing for a run back where it started", () => {
    const gate = createRunGate();
    const { run } = runOf(gate);
    let told = 0;
    const stop = gate.subscribe(() => {
      told += 1;
    });
    expect(gate.pending()).toBeNull();
    run.press(0.5, 0.49);
    expect(told).toBe(1);
    expect(gate.pending()).toBe("the MAF filter changed to 0.49");
    run.press(0.49, 0.48);
    expect(told).toBe(2);
    expect(gate.pending()).toBe("the MAF filter changed to 0.48");
    // Back where it started: it will be no change.
    run.press(0.48, 0.49);
    run.press(0.49, 0.5);
    expect(gate.pending()).toBeNull();
    run.press(0.5, 0.49);
    vi.advanceTimersByTime(RUN_QUIET_MS);
    expect(told).toBe(6);
    expect(gate.pending()).toBeNull();
    stop();
    run.press(0.49, 0.48);
    expect(told).toBe(6);
  });

  test("a run waiting is made a change before any other command reaches the project, Undo and an opening among them, and the gate lets it go once ended", () => {
    const gate = createRunGate();
    const store = gatedStore(
      createPopgen2Store({ send: () => unsent(), appVersion: "0.1.0" }),
      gate,
    );
    const maf = { of: "variants", kind: "maf" } as const;
    const run = createThresholdRun({
      gate,
      change: (to) => {
        store.apply("the MAF filter was turned on", (p) =>
          setThreshold(p, maf, to),
        );
      },
      describe: () => "the MAF filter was turned on",
      ended: () => undefined,
    });
    const filtersOf = (p: Project): string =>
      JSON.stringify(p.filters.map((f) => f.kind));

    // Another command: the run first, then the command.
    run.press(1, 0.9);
    store.apply("the variants that failed their FILTER are kept", (p) => ({
      ...p,
      filters: p.filters.filter((f) => f.kind !== "passed"),
    }));
    expect(run.waiting()).toBe(false);
    expect(store.getState().undo).toBe(
      "the variants that failed their FILTER are kept",
    );
    store.undo();
    expect(store.getState().undo).toBe("the MAF filter was turned on");
    expect(filtersOf(store.getState().project)).toContain("maf");
    store.undo();
    expect(filtersOf(store.getState().project)).not.toContain("maf");

    // Undo with a run waiting undoes the run, made a step first.
    store.redo();
    store.redo();
    run.press(0.9, 0.8);
    store.undo();
    expect(store.getState().redo).toBe("the MAF filter was turned on");

    // Redo with a run waiting: the run clears what Redo would bring.
    run.press(0.9, 0.7);
    store.redo();
    expect(store.getState().redo).toBe(null);

    // Nothing held after: the timer makes no second change.
    const before = store.getState();
    vi.advanceTimersByTime(RUN_QUIET_MS);
    expect(store.getState()).toBe(before);
  });

  test("an opening ends the runs waiting and commits what is typed in a box, before the new history starts", () => {
    const gate = createRunGate();
    const opened: string[] = [];
    const store = gatedStore(
      {
        ...createPopgen2Store({ send: () => unsent(), appVersion: "0.1.0" }),
        open: () => {
          opened.push("open");
        },
      },
      gate,
    );
    const run = createThresholdRun({
      gate,
      change: () => {
        opened.push("run");
      },
      describe: () => "the MAF filter was turned on",
      ended: () => undefined,
    });
    const letGo = gate.typing(() => {
      opened.push("typed");
    });
    run.press(0.5, 0.4);
    store.open((p) => p);
    expect(opened).toEqual(["run", "typed", "open"]);
    // A box gone commits nothing more.
    letGo();
    store.open((p) => p);
    expect(opened).toEqual(["run", "typed", "open", "open"]);
  });

  test("a file opened while a run waits, or while a number typed in a box waits, opens with the threshold the run or the number gave", () => {
    const gate = createRunGate();
    const store = gatedStore(
      createPopgen2Store({ send: () => unsent(), appVersion: "0.1.0" }),
      gate,
    );
    const maf = { of: "variants", kind: "maf" } as const;
    const missing = { of: "variants", kind: "missing_data" } as const;
    const run = createThresholdRun({
      gate,
      change: (to) => {
        store.apply("the MAF filter was turned on", (p) =>
          setThreshold(p, maf, to),
        );
      },
      describe: () => "the MAF filter was turned on",
      ended: () => undefined,
    });
    gate.typing(() => {
      store.apply("the missing data filter changed", (p) =>
        setThreshold(p, missing, 0.25),
      );
    });

    run.press(1, 0.05);
    openVariantsFile(store, {
      fileId: "c".repeat(32),
      name: "c.vcf.gz",
      size: 1000,
      format: "vcf",
      readOptions: { ploidy: null, onlyPassed: false },
    });

    const project = store.getState().project;
    expect(project.variants?.fileId).toBe("c".repeat(32));
    expect(thresholdValue(project, maf)).toBe(0.05);
    expect(thresholdValue(project, missing)).toBe(0.25);
    expect(store.getState().undo).toBeNull();
  });
});

/** A send that is never called in these tests, which start no pass. */
function unsent(): never {
  throw new Error("the test started a pass");
}
