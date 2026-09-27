/**
 * The announcer of the status region (docs/specs/shell.md, "How it is
 * checked", the announcer), with the fake timers of Vitest.
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { INDIVIDUALS_KEPT_KIND, createAnnouncer } from "./status.ts";

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

  test("a text that replaces its kind drops the one of that kind still waiting, and is written last", () => {
    const announcer = createAnnouncer();
    const total = { replaces: INDIVIDUALS_KEPT_KIND } as const;
    announcer.announce("125 of the 200 pass.", total);
    announcer.announce("Other words.");
    announcer.announce("124 of the 200 pass.", total);
    announcer.announce("123 of the 200 pass.", total);
    vi.advanceTimersByTime(100);
    expect(announcer.getState()).toBe("Other words. 123 of the 200 pass.");
    // Once written, the next of the kind is a new announcement.
    announcer.announce("122 of the 200 pass.", total);
    vi.advanceTimersByTime(100);
    expect(announcer.getState()).toBe("122 of the 200 pass.");
  });

  test("a text of a kind that replaces one waiting waits 100 ms again, so a held key writes only its last", () => {
    const announcer = createAnnouncer();
    const seen: string[] = [];
    announcer.subscribe(() => {
      seen.push(announcer.getState());
    });
    const total = { replaces: INDIVIDUALS_KEPT_KIND } as const;
    for (let step = 1; step <= 5; step += 1) {
      announcer.announce(`${String(step)} pass.`, total);
      vi.advanceTimersByTime(60);
    }
    expect(announcer.getState()).toBe("");
    vi.advanceTimersByTime(40);
    expect(announcer.getState()).toBe("5 pass.");
    expect(seen).toEqual(["", "5 pass."]);
  });

  test("a change of the history drops the texts of a kind still waiting, which it makes stale", () => {
    const announcer = createAnnouncer();
    const total = { replaces: INDIVIDUALS_KEPT_KIND } as const;
    announcer.announce("Other words.");
    announcer.announce("109 of the 200 pass.", total);
    announcer.announceChange(() => "Undone: the filter changed.");
    announcer.announce("After it.");
    vi.advanceTimersByTime(100);
    expect(announcer.getState()).toBe(
      "Other words. Undone: the filter changed. After it.",
    );
  });

  test("a held key holds the region back at most about 1 s", () => {
    const announcer = createAnnouncer();
    const total = { replaces: INDIVIDUALS_KEPT_KIND } as const;
    announcer.announce("Other words.");
    for (let step = 1; step <= 40; step += 1) {
      announcer.announce(`${String(step)} pass.`, total);
      vi.advanceTimersByTime(50);
      if (announcer.getState() !== "") break;
    }
    expect(announcer.getState()).toMatch(/^Other words\. \d+ pass\.$/);
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

    announcer.announceChange(
      () => "Undone: the filter of the variants by missing data changed.",
    );
    expect(announcer.getState()).toBe("");
    vi.advanceTimersByTime(100);
    expect(announcer.getState()).toBe(
      "Undone: the filter of the variants by missing data changed.",
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

  test("an announce after a clear waits its full 100 ms and stays: clear stops the timer of the texts it drops", () => {
    const announcer = createAnnouncer();
    announcer.announce("A");
    vi.advanceTimersByTime(50);
    announcer.clear();
    announcer.announce("B");
    vi.advanceTimersByTime(99);
    expect(announcer.getState()).toBe("");
    vi.advanceTimersByTime(1);
    expect(announcer.getState()).toBe("B");
    vi.advanceTimersByTime(200);
    expect(announcer.getState()).toBe("B");
  });

  test("a clear inside a change keeps the change's text before what the change announced", () => {
    const announcer = createAnnouncer();
    announcer.announce("Diversity: done.");
    announcer.announceChange(() => {
      announcer.clear();
      announcer.announce("Warning: the file differs.");
      return "Undone: a new variants file was loaded.";
    });
    vi.advanceTimersByTime(100);
    expect(announcer.getState()).toBe(
      "Undone: a new variants file was loaded. Warning: the file differs.",
    );
  });
});
