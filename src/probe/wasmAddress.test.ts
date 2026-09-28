import { describe, expect, test } from "vitest";

import { wasmAddress } from "./wasmAddress.ts";
import type { FetchedList } from "./wasmAddress.ts";

const WASM = "http://localhost:4173/popnei_web/assets/popnei_bg-B1.wasm";
const SCRIPT = "http://localhost:4173/popnei_web/assets/probeWorker-C2.js";

/** A list driven by hand: `add` adds entries, `tick` fires the timer. */
function fakeList(first: readonly string[]): {
  list: FetchedList;
  add: (addresses: readonly string[]) => void;
  tick: () => void;
  watchers: () => number;
  timers: () => number;
} {
  const listeners = new Set<(added: readonly string[]) => void>();
  const timers = new Set<() => void>();
  return {
    list: {
      addresses: () => first,
      watch: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      after: (_ms, callback) => {
        timers.add(callback);
        return () => timers.delete(callback);
      },
    },
    add: (addresses) => {
      for (const listener of [...listeners]) listener(addresses);
    },
    tick: () => {
      for (const timer of [...timers]) {
        timers.delete(timer);
        timer();
      }
    },
    watchers: () => listeners.size,
    timers: () => timers.size,
  };
}

describe("wasmAddress", () => {
  test("a wasm already in the list is given at once, with no wait", async () => {
    const fake = fakeList([SCRIPT, WASM]);
    await expect(wasmAddress(fake.list, 1000)).resolves.toBe(WASM);
    expect(fake.watchers()).toBe(0);
    expect(fake.timers()).toBe(0);
  });

  test("a wasm added to the list after the call, as Firefox adds it, is given, and the wait ends", async () => {
    const fake = fakeList([SCRIPT]);
    const address = wasmAddress(fake.list, 1000);
    fake.add([SCRIPT]);
    fake.add([WASM]);
    await expect(address).resolves.toBe(WASM);
    expect(fake.watchers()).toBe(0);
    expect(fake.timers()).toBe(0);
  });

  test("no wasm by the end of the wait gives null, and the list is no longer watched", async () => {
    const fake = fakeList([SCRIPT]);
    const address = wasmAddress(fake.list, 1000);
    fake.add([SCRIPT]);
    fake.tick();
    await expect(address).resolves.toBeNull();
    expect(fake.watchers()).toBe(0);
  });
});
