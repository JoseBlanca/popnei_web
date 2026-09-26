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
import { loadVariants } from "../../core/project.ts";
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
    const texts = announcementsOf(before, after, (id) => id);
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
