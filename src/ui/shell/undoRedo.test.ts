/**
 * An undo or a redo and what the status region says of it
 * (docs/specs/shell.md, "The status region" and "How it is checked"),
 * with a store of the analyses of `TEST_DEFS` and the announcer, joined
 * as the entry joins them, with the fake timers of Vitest.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { firstProject } from "../../core/apps.ts";
import { CACHE_MAX_BYTES } from "../../core/cache.ts";
import { MAX_UNDO_STEPS } from "../../core/history.ts";
import {
  loadVariants,
  setVariantFilter,
  turnOffVariantFilter,
} from "../../core/project.ts";
import type { Project } from "../../core/project.ts";
import { identityWarning } from "../../core/projectFile.ts";
import { createStore } from "../../core/store.ts";
import type { Store } from "../../core/store.ts";
import { TEST_DEFS } from "../../core/testSupport.ts";
import type { TestDefJob, TestDefResult } from "../../core/testSupport.ts";
import type { Outcome } from "../../worker/protocol.ts";
import { ANNOUNCE_DELAY_MS, createAnnouncer } from "./status.ts";
import type { Announcer } from "./status.ts";
import { undoOrRedo } from "./undoRedo.ts";
import { announcementsOf } from "./words.ts";

const MADE_WITH_ID = "00112233445566778899aabbccddeeff";
const OTHER_ID = "0123456789abcdef0123456789abcdef";

/** A project opened from a project file made with panel.nei, read with
    two individuals, whose variants file is not given yet. */
function opened(): Project {
  return {
    ...firstProject("popgen"),
    reference: {
      variants: {
        fileId: MADE_WITH_ID,
        name: "panel.nei",
        size: 261_490,
        format: "nei",
        readOptions: null,
        read: {
          kind: "read",
          individuals: ["i1", "i2"],
          ploidy: 2,
          numVars: null,
        },
      },
      checks: [],
    },
  };
}

/** A store of the analyses of population genetics of `TEST_DEFS`, whose
    calculations never end. */
function makeStore(): Store<TestDefResult> {
  return createStore<TestDefJob, TestDefResult>({
    first: firstProject("popgen"),
    analyses: TEST_DEFS.filter((def) => def.app.includes("popgen")),
    send: () => ({
      id: 1,
      outcome: new Promise<Outcome<TestDefResult>>(() => undefined),
      cancel: () => undefined,
    }),
    countsOf: () => ({ numVarsRead: null, counts: null }),
    counts: null,
    statistics: null,
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });
}

/** Announces what each change of `store` makes, as the entry does. */
function announceChanges(
  store: Store<TestDefResult>,
  announcer: Announcer,
): void {
  let before = store.getState();
  store.subscribe(() => {
    const after = store.getState();
    const texts = announcementsOf(before, after, {
      title: (id) => id,
      stepOf: () => "analyses",
      variantsKept: () => null,
    });
    before = after;
    for (const text of texts) announcer.announce(text);
  });
}

/** Loads the variants file `name` of the id `fileId` and of `size`
    bytes, and reads it with the individuals i1 and i2. */
function loadAndRead(
  store: Store<TestDefResult>,
  fileId: string,
  name: string,
  size: number,
): void {
  store.apply("a new variants file was loaded", (p) =>
    loadVariants(p, {
      fileId,
      name,
      size,
      format: "nei",
      readOptions: null,
    }),
  );
  store.variantsRead(fileId, {
    kind: "read",
    individuals: ["i1", "i2"],
    ploidy: 2,
    numVars: null,
  });
}

describe("WS9 an undo and the status region", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("an undo that brings the warning of a reopened project back says what it undid before the warning", () => {
    const store = makeStore();
    store.popneiReady("0.1.0");
    store.open(opened());
    loadAndRead(store, OTHER_ID, "other.nei", 87_304);
    const warning = identityWarning(store.getState().project);
    expect(warning).not.toBeNull();
    loadAndRead(store, MADE_WITH_ID, "panel.nei", 261_490);
    // The file the project was made with: no warning.
    expect(identityWarning(store.getState().project)).toBeNull();

    const announcer = createAnnouncer();
    announceChanges(store, announcer);
    undoOrRedo(store, announcer, "undo");
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);

    expect(store.getState().notice).toBeNull();
    expect(announcer.getState()).toBe(
      `Undone: a new variants file was loaded. Warning: ${String(warning)}`,
    );
  });
});

/** The reason of the LD pruning with no distance, whole, as the stepper
    gives it (docs/specs/core/project.md). */
const LD_REASON =
  "The LD pruning of the Variants step needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn off the LD pruning, in the Variants step.";

describe("stop A 3 an undo or a redo that brings back the LD pruning with no distance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** panel.nei read, the LD pruning turned on with no distance, and
      then 50000 typed. */
  function withDistance(): Store<TestDefResult> {
    const store = makeStore();
    store.popneiReady("0.1.0");
    loadAndRead(store, MADE_WITH_ID, "panel.nei", 261_490);
    store.apply("the LD pruning was turned on", (p) =>
      setVariantFilter(p, { kind: "ld", maxAllowedR2: 0.3, maxDist: null }),
    );
    store.apply("the LD pruning changed", (p) =>
      setVariantFilter(p, { kind: "ld", maxAllowedR2: 0.3, maxDist: 50_000 }),
    );
    return store;
  }

  test("an undo of the distance typed says what it undid and then the reason whole", () => {
    const store = withDistance();
    const announcer = createAnnouncer();
    announceChanges(store, announcer);
    undoOrRedo(store, announcer, "undo");
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);

    expect(store.getState().notice).toBeNull();
    expect(announcer.getState()).toBe(
      `Undone: the LD pruning changed. ${LD_REASON}`,
    );
  });

  test("a redo of the switch turned on says the reason, and a redo of the distance does not", () => {
    const store = withDistance();
    store.undo();
    store.undo();
    const announcer = createAnnouncer();
    announceChanges(store, announcer);
    undoOrRedo(store, announcer, "redo");
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
    expect(announcer.getState()).toBe(
      `Redone: the LD pruning was turned on. ${LD_REASON}`,
    );

    undoOrRedo(store, announcer, "redo");
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
    expect(announcer.getState()).toBe("Redone: the LD pruning changed.");
  });

  test("an undo of the switch turned off, with no distance, says the reason; one of a filter that keeps its distance does not", () => {
    const store = makeStore();
    store.popneiReady("0.1.0");
    loadAndRead(store, MADE_WITH_ID, "panel.nei", 261_490);
    store.apply("the LD pruning was turned on", (p) =>
      setVariantFilter(p, { kind: "ld", maxAllowedR2: 0.3, maxDist: null }),
    );
    store.apply("the LD pruning was turned off", (p) =>
      turnOffVariantFilter(p, "ld"),
    );
    const announcer = createAnnouncer();
    announceChanges(store, announcer);
    undoOrRedo(store, announcer, "undo");
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
    expect(announcer.getState()).toBe(
      `Undone: the LD pruning was turned off. ${LD_REASON}`,
    );

    const typed = withDistance();
    typed.apply("the LD pruning was turned off", (p) =>
      turnOffVariantFilter(p, "ld"),
    );
    const other = createAnnouncer();
    announceChanges(typed, other);
    undoOrRedo(typed, other, "undo");
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
    expect(other.getState()).toBe("Undone: the LD pruning was turned off.");
  });
  test("an undo that makes a notice, a calculation over the distance left behind, says the reason alone, since the notice is read out by itself", () => {
    const store = withDistance();
    expect(store.startRun("diversity")).not.toBeNull();
    const announcer = createAnnouncer();
    announceChanges(store, announcer);
    undoOrRedo(store, announcer, "undo");
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
    expect(store.getState().notice).not.toBeNull();
    expect(announcer.getState()).toBe(LD_REASON);
  });
  test("an undo of the r² while the distance is still empty does not say the reason again, which it did not bring back", () => {
    const store = makeStore();
    store.popneiReady("0.1.0");
    loadAndRead(store, MADE_WITH_ID, "panel.nei", 261_490);
    store.apply("the LD pruning was turned on", (p) =>
      setVariantFilter(p, { kind: "ld", maxAllowedR2: 0.3, maxDist: null }),
    );
    store.apply("the LD pruning changed", (p) =>
      setVariantFilter(p, { kind: "ld", maxAllowedR2: 0.5, maxDist: null }),
    );
    const announcer = createAnnouncer();
    announceChanges(store, announcer);
    undoOrRedo(store, announcer, "undo");
    vi.advanceTimersByTime(ANNOUNCE_DELAY_MS);
    expect(announcer.getState()).toBe("Undone: the LD pruning changed.");
  });
});
