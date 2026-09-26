import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { POPGEN_ANALYSES, countsOf, firstProject } from "../core/apps.ts";
import { CACHE_MAX_BYTES } from "../core/cache.ts";
import { MAX_UNDO_STEPS } from "../core/history.ts";
import { loadVariants, setVariantFilter } from "../core/project.ts";
import type { Project } from "../core/project.ts";
import { writeProjectFile } from "../core/projectFile.ts";
import { createStore } from "../core/store.ts";
import type { Store } from "../core/store.ts";
import { TEST_DEFS } from "../core/testSupport.ts";
import type { TestDefJob, TestDefResult } from "../core/testSupport.ts";
import type { Job, JobResult, Outcome, Run } from "../worker/protocol.ts";
import { createSaving } from "./saving.ts";

// The real store of core, and a fake download that records what it was
// given (docs/specs/entry.md, "How it is verified", createSaving).

const SAVED_AT = new Date("2026-09-26T10:00:00.000Z");

function makeStore(): Store<JobResult> {
  return createStore<Job, JobResult>({
    first: firstProject("popgen"),
    analyses: POPGEN_ANALYSES,
    send: () => {
      throw new Error("the saving sends no calculation");
    },
    countsOf,
    counts: null,
    statistics: null,
    appVersion: "0.1.0",
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });
}

function setup(): {
  readonly store: Store<JobResult>;
  readonly downloads: { readonly name: string; readonly text: string }[];
  readonly saving: ReturnType<typeof createSaving>;
} {
  const store = makeStore();
  const downloads: { name: string; text: string }[] = [];
  const saving = createSaving({
    store,
    app: "popgen",
    analyses: POPGEN_ANALYSES,
    appVersion: "0.1.0",
    download: (name, text) => {
      downloads.push({ name, text });
    },
  });
  return { store, downloads, saving };
}

const PANEL = {
  fileId: "0123456789abcdef0123456789abcdef",
  name: "panel.nei",
  size: 261_490,
  format: "nei",
  readOptions: null,
} as const;

function loadPanel(store: Store<JobResult>): void {
  store.apply("a new variants file was loaded", (p) => loadVariants(p, PANEL));
}

function setThreshold(store: Store<JobResult>, threshold: number): void {
  store.apply("the missing data filter changed", (p: Project) =>
    setVariantFilter(p, {
      kind: "missing_data",
      maxAllowedMissingRate: threshold,
    }),
  );
}

describe("WS9 D2 the saving", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(SAVED_AT);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("save downloads the text of writeProjectFile under the name given, and returns it", () => {
    const { store, downloads, saving } = setup();
    loadPanel(store);
    const expected = writeProjectFile(
      store.getState(),
      POPGEN_ANALYSES,
      "0.1.0",
      "2026-09-26T10:00:00.000Z",
    );

    expect(saving.save("panel.popnei.json")).toBe("panel.popnei.json");

    expect(downloads).toEqual([{ name: "panel.popnei.json", text: expected }]);
  });

  test("a name that does not end in .popnei.json gets it, in place of a .json it ends in, in any case", () => {
    const { downloads, saving } = setup();

    expect(saving.save("panel")).toBe("panel.popnei.json");
    expect(saving.save("run1.json")).toBe("run1.popnei.json");
    expect(saving.save("run1.JSON")).toBe("run1.popnei.json");
    expect(saving.save("run1.POPNEI.JSON")).toBe("run1.POPNEI.JSON");
    expect(saving.save("run1.json.txt")).toBe("run1.json.txt.popnei.json");

    expect(downloads.map((d) => d.name)).toEqual([
      "panel.popnei.json",
      "run1.popnei.json",
      "run1.popnei.json",
      "run1.POPNEI.JSON",
      "run1.json.txt.popnei.json",
    ]);
  });

  test("proposedName is projectFileName of the present project", () => {
    const { store, saving } = setup();
    expect(saving.proposedName()).toBe("project.popnei.json");

    loadPanel(store);

    expect(saving.proposedName()).toBe("panel.popnei.json");
  });

  test("changed: false on the first project, true after a command, false after an undo back to it", () => {
    const { store, saving } = setup();
    expect(saving.changed()).toBe(false);

    setThreshold(store, 0.05);
    expect(saving.changed()).toBe(true);

    store.undo();
    expect(saving.changed()).toBe(false);
  });

  test("changed: false after opened with the present project, and true after a command that follows", () => {
    const { store, saving } = setup();
    setThreshold(store, 0.05);
    const opened = store.getState().project;
    store.open(opened);

    saving.opened(opened);
    expect(saving.changed()).toBe(false);

    setThreshold(store, 0.2);
    expect(saving.changed()).toBe(true);
  });

  test("changed: false after a save, and true after a command that follows it", () => {
    const { store, saving } = setup();
    setThreshold(store, 0.05);

    saving.save("panel");
    expect(saving.changed()).toBe(false);

    setThreshold(store, 0.2);
    expect(saving.changed()).toBe(true);
  });

  test("read of the text a save downloaded gives its project", () => {
    const { store, downloads, saving } = setup();
    loadPanel(store);
    setThreshold(store, 0.05);
    saving.save("panel");
    const [saved] = downloads;
    if (saved === undefined) throw new Error("nothing downloaded");

    const read = saving.read(saved.text);

    if (!read.ok) throw new Error(read.error.kind);
    expect(read.value.filters).toEqual(store.getState().project.filters);
    expect(read.value.reference?.variants.name).toBe("panel.nei");
  });

  test("read by a saving of association refuses a project file of population genetics as otherApp", () => {
    const { store, downloads, saving } = setup();
    saving.save("panel");
    const [saved] = downloads;
    if (saved === undefined) throw new Error("nothing downloaded");
    const association = createSaving({
      store,
      app: "gwas",
      analyses: POPGEN_ANALYSES,
      appVersion: "0.1.0",
      download: () => {
        throw new Error("the test saves nothing with association");
      },
    });

    expect(association.read(saved.text)).toEqual({
      ok: false,
      error: { kind: "project", error: { kind: "otherApp", found: "popgen" } },
    });
  });

  test("read of a project file of association refuses it as otherApp", () => {
    const { downloads, saving } = setup();
    saving.save("panel");
    const [saved] = downloads;
    if (saved === undefined) throw new Error("nothing downloaded");
    const file: unknown = JSON.parse(saved.text);
    if (typeof file !== "object" || file === null) throw new Error("no file");
    const text = JSON.stringify({
      ...file,
      app: "gwas",
      grouping: { kind: "roles", roles: [] },
      checks: [],
    });

    expect(saving.read(text)).toEqual({
      ok: false,
      error: { kind: "project", error: { kind: "otherApp", found: "gwas" } },
    });
  });
});

describe("WS9 the saving counts a result that ended as a change", () => {
  /** A store of the analyses of population genetics of `TEST_DEFS`, with
      panel.nei read, its saving, and `end`, which ends the diversity
      that `start` began. */
  function withDiversity(): {
    readonly store: Store<TestDefResult>;
    readonly saving: ReturnType<typeof createSaving>;
    readonly start: () => void;
    readonly end: () => void;
  } {
    const sent: { key: string; run: Run<TestDefResult> }[] = [];
    const store = createStore<TestDefJob, TestDefResult>({
      first: firstProject("popgen"),
      analyses: TEST_DEFS.filter((def) => def.app.includes("popgen")),
      send: (key) => {
        const run: Run<TestDefResult> = {
          id: sent.length + 1,
          outcome: new Promise<Outcome<TestDefResult>>(() => undefined),
          cancel: () => undefined,
        };
        sent.push({ key, run });
        return run;
      },
      countsOf: () => ({ numVarsRead: null, counts: null }),
      counts: null,
      statistics: null,
      appVersion: "0.1.0",
      cacheMaxBytes: CACHE_MAX_BYTES,
      maxUndoSteps: MAX_UNDO_STEPS,
    });
    store.popneiReady("0.1.0");
    store.apply("a new variants file was loaded", (p) =>
      loadVariants(p, PANEL),
    );
    store.variantsRead(PANEL.fileId, {
      kind: "read",
      individuals: ["i1", "i2"],
      ploidy: 2,
      numVars: null,
    });
    const saving = createSaving({
      store,
      app: "popgen",
      analyses: TEST_DEFS,
      appVersion: "0.1.0",
      download: () => undefined,
    });
    return {
      store,
      saving,
      start: () => {
        store.startRun("diversity");
      },
      end: () => {
        const request = sent.at(-1);
        if (request === undefined) throw new Error("no calculation was sent");
        store.runEnded(request.run.id, {
          kind: "done",
          key: request.key,
          result: { analysis: "diversity", numbers: [0.35] },
        });
      },
    };
  }

  test("a result that ends after a save, with no command, is a change; a save after it is not", () => {
    const { saving, start, end } = withDiversity();
    start();
    saving.save("panel");
    expect(saving.changed()).toBe(false);

    end();
    expect(saving.changed()).toBe(true);

    saving.save("panel");
    expect(saving.changed()).toBe(false);
  });

  test("a result that comes back after an undo to the saved project, and a result done when it was saved, are no change", () => {
    const { store, saving, start, end } = withDiversity();
    start();
    end();
    saving.save("panel");
    store.apply("the missing data filter changed", (p: Project) =>
      setVariantFilter(p, {
        kind: "missing_data",
        maxAllowedMissingRate: 0.05,
      }),
    );
    expect(saving.changed()).toBe(true);

    store.undo();
    expect(store.getState().analyses[0]?.status.kind).toBe("done");
    expect(saving.changed()).toBe(false);
  });
});

describe("WS9 the saving records a save that failed", () => {
  test("saveFailed is false at first, true after a save whose download throws, with the listener called, and false after one that succeeds", () => {
    const store = makeStore();
    let fail = true;
    const saving = createSaving({
      store,
      app: "popgen",
      analyses: POPGEN_ANALYSES,
      appVersion: "0.1.0",
      download: () => {
        if (fail) throw new Error("popnei_web defect: test");
      },
    });
    let calls = 0;
    const unsubscribe = saving.subscribe(() => {
      calls += 1;
    });
    expect(saving.saveFailed()).toBe(false);

    expect(() => saving.save("panel")).toThrow("popnei_web defect: test");
    expect(saving.saveFailed()).toBe(true);
    expect(calls).toBe(1);

    fail = false;
    saving.save("panel");
    expect(saving.saveFailed()).toBe(false);
    expect(calls).toBe(2);
    unsubscribe();
  });
});
