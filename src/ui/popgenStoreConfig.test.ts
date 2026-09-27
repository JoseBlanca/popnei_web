import { describe, expect, test, vi } from "vitest";

import { CACHE_MAX_BYTES } from "../core/cache.ts";
import { MAX_UNDO_STEPS } from "../core/history.ts";
import { createStore } from "../core/store.ts";
import type { Outcome, Run } from "../worker/protocol.ts";
import { createPopgenStore } from "./popgenStore.ts";

// What the store of the page is made with (docs/specs/entry.md, "At the
// opening", step 3), read from the call of createStore, which the mock
// passes on to the real one.

vi.mock(import("../core/store.ts"), { spy: true });

/** A request that never ends. */
function never<T>(): Run<T> {
  return {
    id: 1,
    outcome: new Promise<Outcome<T>>(() => undefined),
    cancel: () => undefined,
  };
}

describe("VS5 D1 the store of the page is made with", () => {
  test("the version of the application, the bound of the cache, the steps of undo and the two analyses it reads", () => {
    createPopgenStore({
      send: () => never(),
      sendWrite: () => never(),
      appVersion: "9.8.7",
    });
    const config = vi.mocked(createStore).mock.calls.at(-1)?.[0];
    expect(config?.appVersion).toBe("9.8.7");
    expect(config?.cacheMaxBytes).toBe(CACHE_MAX_BYTES);
    expect(config?.maxUndoSteps).toBe(MAX_UNDO_STEPS);
    expect(config?.counts).toBe("filterCounts");
    expect(config?.statistics?.analysis).toBe("individualChecks");
  });
});
