/**
 * The announcer of the status region (docs/specs/shell.md, "How it is
 * checked", the announcer), with the fake timers of Vitest.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { createAnnouncer } from "./status.ts";

describe("WS9 D1 the announcer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("the same text announced twice empties the region and writes it each time", () => {
    const announcer = createAnnouncer();
    const seen: string[] = [];
    announcer.subscribe(() => {
      seen.push(announcer.getState());
    });

    announcer.announce("Diversity: done.");
    expect(announcer.getState()).toBe("");
    vi.advanceTimersByTime(100);
    expect(announcer.getState()).toBe("Diversity: done.");
    announcer.announce("Diversity: done.");
    expect(announcer.getState()).toBe("");
    vi.advanceTimersByTime(99);
    expect(announcer.getState()).toBe("");
    vi.advanceTimersByTime(1);

    expect(announcer.getState()).toBe("Diversity: done.");
    expect(seen).toEqual(["", "Diversity: done.", "", "Diversity: done."]);
  });

  test("two texts announced within 100 ms are written together, joined by a space", () => {
    const announcer = createAnnouncer();
    const seen: string[] = [];
    announcer.subscribe(() => {
      seen.push(announcer.getState());
    });

    announcer.announce("Diversity: calculating.");
    vi.advanceTimersByTime(60);
    announcer.announce("The earlier calculation of Diversity was stopped.");
    vi.advanceTimersByTime(40);

    expect(announcer.getState()).toBe(
      "Diversity: calculating. The earlier calculation of Diversity was stopped.",
    );
    expect(seen).toEqual([
      "",
      "Diversity: calculating. The earlier calculation of Diversity was stopped.",
    ]);
  });

  test("the text of a change goes before what was announced while it ran and after what was announced before it, and two changes keep their order", () => {
    const announcer = createAnnouncer();

    announcer.announce("Diversity: done.");
    announcer.announceChange(() => {
      announcer.announce("Warning: the file differs.");
      return "Undone: a new variants file was loaded.";
    });
    announcer.announceChange(() => "Redone: a new variants file was loaded.");
    announcer.announceChange(() => null);
    vi.advanceTimersByTime(100);
    expect(announcer.getState()).toBe(
      "Diversity: done. Undone: a new variants file was loaded. Warning: the file differs. Redone: a new variants file was loaded.",
    );

    announcer.announceChange(() => "Undone: the missing data filter changed.");
    expect(announcer.getState()).toBe("");
    vi.advanceTimersByTime(100);
    expect(announcer.getState()).toBe(
      "Undone: the missing data filter changed.",
    );
  });

  test("clear empties the region at once and drops a text waiting", () => {
    const announcer = createAnnouncer();
    announcer.announce(
      "panel.filtered.nei is written, 251 KB; Save it in the Variants step.",
    );
    vi.advanceTimersByTime(100);
    announcer.clear();
    expect(announcer.getState()).toBe("");

    announcer.announce(
      "panel.filtered.nei is written, 251 KB; Save it in the Variants step.",
    );
    announcer.clear();
    vi.advanceTimersByTime(100);
    expect(announcer.getState()).toBe("");

    announcer.announce("Diversity: done.");
    vi.advanceTimersByTime(100);
    expect(announcer.getState()).toBe("Diversity: done.");
  });
});
