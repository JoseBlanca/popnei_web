import { describe, expect, test } from "vitest";

import { firstProject } from "../../core/apps.ts";
import { CACHE_MAX_BYTES } from "../../core/cache.ts";
import { MAX_UNDO_STEPS } from "../../core/history.ts";
import { loadVariants } from "../../core/project.ts";
import { createStore } from "../../core/store.ts";
import type { Store } from "../../core/store.ts";
import { TEST_DEFS } from "../../core/testSupport.ts";
import type { TestDefJob, TestDefResult } from "../../core/testSupport.ts";
import type { Outcome, Run } from "../../worker/protocol.ts";
import { createDefects } from "../defects.ts";
import { createSaving } from "../saving.ts";
import { NOT_SAVED, barText, saveFromBar, saveLabel } from "./barSave.ts";

const PANEL_ID = "0123456789abcdef0123456789abcdef";

/** A store of the analyses of population genetics of `TEST_DEFS`, with
    panel.nei read and its diversity done with the check numbers
    `numbers`. */
function storeWithDiversity(numbers: readonly number[]): Store<TestDefResult> {
  const sent: { key: string; run: Run<TestDefResult> }[] = [];
  const store = createStore<TestDefJob, TestDefResult>({
    first: firstProject("popgen"),
    analyses: TEST_DEFS.filter((def) => def.app.includes("popgen")),
    send: (key) => {
      const run: Run<TestDefResult> = {
        id: 1,
        outcome: new Promise<Outcome<TestDefResult>>(() => undefined),
        cancel: () => undefined,
      };
      sent.push({ key, run });
      return run;
    },
    countsOf: () => ({ numVarsRead: null, counts: null }),
    counts: null,
    statistics: null,
    write: null,
    appVersion: "0.1.0",
    cacheMaxBytes: CACHE_MAX_BYTES,
    maxUndoSteps: MAX_UNDO_STEPS,
  });
  store.popneiReady("0.1.0");
  store.apply("a new variants file was loaded", (p) =>
    loadVariants(p, {
      fileId: PANEL_ID,
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
    }),
  );
  store.variantsRead(PANEL_ID, {
    kind: "read",
    individuals: ["i1", "i2"],
    ploidy: 2,
    numVars: null,
  });
  store.startRun("diversity");
  const [request] = sent;
  if (request === undefined) throw new Error("no calculation was sent");
  store.runEnded(request.run.id, {
    kind: "done",
    key: request.key,
    result: { analysis: "diversity", numbers },
  });
  return store;
}

describe("WS9 the Save of the error bar", () => {
  test("a project whose check number is Infinity is not saved: the bar says so, the error is counted, nothing is downloaded, and a second press says it again", () => {
    const store = storeWithDiversity([Infinity]);
    const downloads: string[] = [];
    const saving = createSaving({
      store,
      app: "popgen",
      analyses: TEST_DEFS,
      appVersion: "0.1.0",
      downloadFile: () => undefined,
      download: (name) => {
        downloads.push(name);
      },
    });
    const defects = createDefects();

    expect(saveFromBar(saving, defects)).toBe(NOT_SAVED);
    expect(defects.getState().first?.message).toMatch(/^popnei_web defect:/);
    expect(saveFromBar(saving, defects)).toBe(NOT_SAVED);
    expect(defects.getState().more).toBe(1);
    expect(downloads).toEqual([]);
  });

  test("a project that can be written is handed to the browser under the name proposed, and no error is counted", () => {
    const store = storeWithDiversity([0.35]);
    const downloads: string[] = [];
    const saving = createSaving({
      store,
      app: "popgen",
      analyses: TEST_DEFS,
      appVersion: "0.1.0",
      downloadFile: () => undefined,
      download: (name) => {
        downloads.push(name);
      },
    });
    const defects = createDefects();

    expect(saveFromBar(saving, defects)).toBe(
      "panel.popnei.json was handed to the browser to download.",
    );
    expect(downloads).toEqual(["panel.popnei.json"]);
    expect(defects.getState().first).toBeNull();
  });

  test("the first line of the bar: intact, not saved, and as the page started", () => {
    expect(barText("test.", true, false)).toBe(
      "The application met an error of its own: test. Your project is intact: save it, then reload the page.",
    );
    expect(barText("test", true, true)).toBe(
      "The application met an error of its own: test. Your project could not be saved; copy the details and report them.",
    );
    expect(barText("test", false, false)).toBe(
      "The application met an error of its own as it started: test. Reload the page.",
    );
  });

  test("the bar's Save reads Try to save again after a save failed", () => {
    expect(saveLabel(false)).toBe("Save the project");
    expect(saveLabel(true)).toBe("Try to save again");
  });
});
