/**
 * The runs of the keys on a threshold of popgen2.html, and the gate that
 * makes a run waiting a change before any other command
 * (docs/specs/steps/popgen2-filters.md, "When a threshold changes the
 * project"), with the fake timers of Vitest for the quiet second.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  loadIndividuals,
  setThreshold,
  thresholdValue,
} from "../../core/project.ts";
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

  test("a run waiting is made a change before another command reaches the project, and the gate lets it go once ended", () => {
    const gate = createRunGate();
    const store = gatedStore(
      createPopgen2Store({
        send: () => unsent(),
        sendWrite: () => {
          throw new Error("popnei_web defect: no write is sent here");
        },
        appVersion: "0.1.0",
      }),
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
    // The run's change came first, and the command after it.
    expect(filtersOf(store.getState().project)).toContain("maf");
    expect(filtersOf(store.getState().project)).not.toContain("passed");

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
        ...createPopgen2Store({
          send: () => unsent(),
          sendWrite: () => {
            throw new Error("popnei_web defect: no write is sent here");
          },
          appVersion: "0.1.0",
        }),
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
      createPopgen2Store({
        send: () => unsent(),
        sendWrite: () => {
          throw new Error("popnei_web defect: no write is sent here");
        },
        appVersion: "0.1.0",
      }),
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

describe("AP3 D2 the gate before applyAfresh", () => {
  /** The store of the page through a gate, and the gate. */
  const gated = (): {
    readonly store: ReturnType<typeof createPopgen2Store>;
    readonly gate: ReturnType<typeof createRunGate>;
  } => {
    const gate = createRunGate();
    const store = gatedStore(
      createPopgen2Store({
        send: () => unsent(),
        sendWrite: () => {
          throw new Error("popnei_web defect: no write is sent here");
        },
        appVersion: "0.1.0",
      }),
      gate,
    );
    return { store, gate };
  };
  const maf = { of: "variants", kind: "maf" } as const;
  const missing = { of: "variants", kind: "missing_data" } as const;
  /** Loads pops.csv as the individuals file. */
  const loadPops = (p: Project): Project =>
    loadIndividuals(p, {
      fileId: "d".repeat(32),
      name: "pops.csv",
      csv: null,
    });

  test("a run of the arrow keys waiting, then applyAfresh: the run's change made first, then nothing to undo", () => {
    const { store, gate } = gated();
    const run = createThresholdRun({
      gate,
      change: (to) => {
        store.apply("the MAF filter was turned on", (p) =>
          setThreshold(p, maf, to),
        );
      },
      ended: () => undefined,
    });
    run.press(1, 0.05);
    store.applyAfresh(loadPops);
    const state = store.getState();
    expect(run.waiting()).toBe(false);
    expect(thresholdValue(state.project, maf)).toBe(0.05);
    expect(state.project.individuals?.name).toBe("pops.csv");
    expect(state.undo).toBeNull();
    // The quiet second then makes no change of its own.
    vi.advanceTimersByTime(RUN_QUIET_MS);
    expect(store.getState()).toBe(state);
  });

  test("a number typed in a box and not applied, then applyAfresh: the number applied first, then nothing to undo", () => {
    const { store, gate } = gated();
    gate.typing(() => {
      store.apply("the missing data filter changed", (p) =>
        setThreshold(p, missing, 0.25),
      );
    });
    store.applyAfresh(loadPops);
    const state = store.getState();
    expect(thresholdValue(state.project, missing)).toBe(0.25);
    expect(state.project.individuals?.name).toBe("pops.csv");
    expect(state.undo).toBeNull();
  });

  test("the run ended and the number applied before the store's applyAfresh, in that order", () => {
    const gate = createRunGate();
    const order: string[] = [];
    const store = gatedStore(
      {
        ...createPopgen2Store({
          send: () => unsent(),
          sendWrite: () => {
            throw new Error("popnei_web defect: no write is sent here");
          },
          appVersion: "0.1.0",
        }),
        applyAfresh: () => {
          order.push("applyAfresh");
        },
      },
      gate,
    );
    const run = createThresholdRun({
      gate,
      change: () => {
        order.push("run");
      },
      ended: () => undefined,
    });
    gate.typing(() => {
      order.push("typed");
    });
    run.press(0.5, 0.4);
    store.applyAfresh((p) => p);
    expect(order).toEqual(["run", "typed", "applyAfresh"]);
  });
});

describe("NU3 D1 the gate counts the changes under way", () => {
  /** A gate, and the count of the calls of a listener subscribed now. */
  const listened = (
    gate = createRunGate(),
  ): {
    readonly gate: ReturnType<typeof createRunGate>;
    readonly told: { count: number };
  } => {
    const told = { count: 0 };
    gate.subscribe(() => {
      told.count += 1;
    });
    return { gate, told };
  };

  test("two holds taken, one released: still held; the second released: one call of the listener", () => {
    const gate = createRunGate();
    expect(gate.underWay()).toBe(0);
    const releaseSlider = gate.holdChange();
    const releaseList = gate.holdChange();
    expect(gate.underWay()).toBe(2);
    const { told } = listened(gate);
    releaseSlider();
    expect(gate.underWay()).toBe(1);
    expect(told.count).toBe(0);
    releaseList();
    expect(gate.underWay()).toBe(0);
    expect(told.count).toBe(1);
  });

  test("the listener is told when the first hold is taken, and not when another is taken while one holds", () => {
    const { gate, told } = listened();
    const release = gate.holdChange();
    expect(told.count).toBe(1);
    gate.holdChange();
    expect(told.count).toBe(1);
    release();
    expect(told.count).toBe(1);
  });

  test("a hold released twice counts once", () => {
    const gate = createRunGate();
    const releaseBox = gate.holdChange();
    const releaseList = gate.holdChange();
    const { told } = listened(gate);
    releaseBox();
    releaseBox();
    expect(gate.underWay()).toBe(1);
    expect(told.count).toBe(0);
    releaseList();
    releaseList();
    expect(gate.underWay()).toBe(0);
    expect(told.count).toBe(1);
  });

  test("a run of the arrow keys is a hold from its first press to its change", () => {
    const { gate, told } = listened();
    const { run, changes } = runOf(gate);
    run.press(0.5, 0.49);
    expect(gate.underWay()).toBe(1);
    run.press(0.49, 0.48);
    expect(gate.underWay()).toBe(1);
    vi.advanceTimersByTime(RUN_QUIET_MS - 1);
    expect(gate.underWay()).toBe(1);
    const toldBefore = told.count;
    vi.advanceTimersByTime(1);
    expect(changes).toEqual([0.48]);
    expect(gate.underWay()).toBe(0);
    expect(told.count).toBe(toldBefore + 1);
  });

  test("a run made a change by another command lets its hold go, and the listener is told when the count falls to 0", () => {
    const { gate, told } = listened();
    const { run, changes } = runOf(gate);
    const release = gate.holdChange();
    run.press(0.5, 0.49);
    expect(gate.underWay()).toBe(2);
    const toldBefore = told.count;
    gate.endAll();
    expect(changes).toEqual([0.49]);
    expect(gate.underWay()).toBe(1);
    expect(told.count).toBe(toldBefore);
    release();
    expect(gate.underWay()).toBe(0);
    expect(told.count).toBe(toldBefore + 1);
  });

  test("a hold whose control is removed, through the release the widget gives at its removal, brings the count back to 0", () => {
    const { gate, told } = listened();
    // A slider held, a list open, and a threshold with a run of the keys
    // waiting, all removed at once, as by another variants file opened:
    // each widget lets its hold go as it leaves the page.
    const { run } = runOf(gate);
    const removals = [gate.holdChange(), gate.holdChange(), run.end];
    run.press(0.5, 0.49);
    expect(gate.underWay()).toBe(3);
    const toldBefore = told.count;
    for (const removal of removals) removal();
    expect(gate.underWay()).toBe(0);
    expect(told.count).toBe(toldBefore + 1);
    // A release given again after the removal changes nothing.
    for (const removal of removals) removal();
    expect(gate.underWay()).toBe(0);
    expect(told.count).toBe(toldBefore + 1);
  });

  test("a listener stopped is told nothing more", () => {
    const gate = createRunGate();
    let told = 0;
    const stop = gate.subscribe(() => {
      told += 1;
    });
    const release = gate.holdChange();
    stop();
    release();
    expect(told).toBe(1);
  });
});

/** A send that is never called in these tests, which start no pass. */
function unsent(): never {
  throw new Error("the test started a pass");
}

describe("NU1 the listeners of the gate see the change a run of the keys made", () => {
  const maf = { of: "variants", kind: "maf" } as const;
  /** The store of the page through a gate, a run of the MAF threshold
      whose change passes the gate as the page's does, and the MAF value a
      listener read each time the count of the changes under way was 0. */
  const setUp = (): {
    readonly gate: ReturnType<typeof createRunGate>;
    readonly run: ReturnType<typeof createThresholdRun>;
    readonly seen: (number | null)[];
  } => {
    const gate = createRunGate();
    const store = gatedStore(
      createPopgen2Store({
        send: () => unsent(),
        sendWrite: () => {
          throw new Error("popnei_web defect: no write is sent here");
        },
        appVersion: "0.1.0",
      }),
      gate,
    );
    const run = createThresholdRun({
      gate,
      change: (to) => {
        store.apply("the MAF filter was turned on", (p) =>
          setThreshold(p, maf, to),
        );
      },
      ended: () => undefined,
    });
    const seen: (number | null)[] = [];
    gate.subscribe(() => {
      if (gate.underWay() === 0) {
        seen.push(thresholdValue(store.getState().project, maf));
      }
    });
    return { gate, run, seen };
  };

  test("a run ended by its quiet second: the listener told at 0 reads the new value", () => {
    const { run, seen } = setUp();
    run.press(1, 0.05);
    vi.advanceTimersByTime(RUN_QUIET_MS);
    expect(seen).toEqual([0.05]);
  });

  test("a run ended by the focus leaving: the listener told at 0 reads the new value", () => {
    const { run, seen } = setUp();
    run.press(1, 0.05);
    run.end();
    expect(seen).toEqual([0.05]);
  });

  test("a run ended by another command: the listener told at 0 reads the new value", () => {
    const { gate, run, seen } = setUp();
    run.press(1, 0.05);
    gate.endAll();
    expect(seen).toEqual([0.05]);
  });
});

describe("NU1 the gate when a listener or an end throws", () => {
  test("a listener that throws when a hold is taken: the release is given all the same, the error thrown after, and the count falls back to 0", () => {
    const gate = createRunGate();
    const thrown: (() => void)[] = [];
    const queued = vi
      .spyOn(globalThis, "queueMicrotask")
      .mockImplementation((callback) => {
        thrown.push(callback);
      });
    const failure = new Error("a listener failed");
    let throws = true;
    let others = 0;
    gate.subscribe(() => {
      if (throws) throw failure;
    });
    gate.subscribe(() => {
      others += 1;
    });
    const release = gate.holdChange();
    expect(gate.underWay()).toBe(1);
    expect(others).toBe(1);
    expect(thrown).toHaveLength(1);
    expect(() => {
      thrown[0]?.();
    }).toThrow(failure);
    throws = false;
    release();
    expect(gate.underWay()).toBe(0);
    expect(others).toBe(2);
    queued.mockRestore();
  });

  test("the first of two runs whose end throws: both runs let go, the second ended, the listeners told, and the error thrown", () => {
    const gate = createRunGate();
    const failure = new Error("an end failed");
    const ended: string[] = [];
    gate.hold(() => {
      ended.push("first");
      throw failure;
    });
    gate.hold(() => {
      ended.push("second");
    });
    let told = 0;
    gate.subscribe(() => {
      told += 1;
    });
    expect(() => {
      gate.endAll();
    }).toThrow(failure);
    expect(ended).toEqual(["first", "second"]);
    expect(gate.underWay()).toBe(0);
    expect(told).toBe(1);
  });
});

describe("NU1 when the gate tells its listeners", () => {
  test("a hold taken while a run of the keys is held does not tell: the count does not rise from 0", () => {
    const gate = createRunGate();
    const { run } = runOf(gate);
    run.press(0.5, 0.49);
    let told = 0;
    gate.subscribe(() => {
      told += 1;
    });
    gate.holdChange();
    expect(gate.underWay()).toBe(2);
    expect(told).toBe(0);
  });

  test("endAll over two runs tells once", () => {
    const gate = createRunGate();
    runOf(gate).run.press(0.5, 0.49);
    runOf(gate).run.press(0.3, 0.29);
    let told = 0;
    gate.subscribe(() => {
      told += 1;
    });
    gate.endAll();
    expect(gate.underWay()).toBe(0);
    expect(told).toBe(1);
  });

  test("endAll with nothing held tells nothing", () => {
    const gate = createRunGate();
    let told = 0;
    gate.subscribe(() => {
      told += 1;
    });
    gate.endAll();
    expect(told).toBe(0);
  });
});

describe("NU2 D2 the gate tells only when the count of the changes under way rises from 0 or falls to 0", () => {
  test("a press of a run held, a second run held, and the first let go tell nothing; the count falling to 0 tells once", () => {
    const gate = createRunGate();
    let told = 0;
    gate.subscribe(() => {
      told += 1;
    });
    const first = runOf(gate).run;
    const second = runOf(gate).run;

    first.press(0.5, 0.49);
    expect(told).toBe(1);
    first.press(0.49, 0.48);
    second.press(0.3, 0.29);
    expect(gate.underWay()).toBe(2);
    expect(told).toBe(1);
    first.end();
    expect(gate.underWay()).toBe(1);
    expect(told).toBe(1);
    second.end();

    expect(gate.underWay()).toBe(0);
    expect(told).toBe(2);
  });

  test("a run held while a hold of a widget holds tells nothing, nor its end", () => {
    const gate = createRunGate();
    const release = gate.holdChange();
    let told = 0;
    gate.subscribe(() => {
      told += 1;
    });
    const { run, changes } = runOf(gate);

    run.press(0.5, 0.49);
    run.press(0.49, 0.48);
    vi.advanceTimersByTime(RUN_QUIET_MS);

    expect(changes).toEqual([0.48]);
    expect(told).toBe(0);
    release();
    expect(told).toBe(1);
  });
});
