import { describe, expect, test } from "vitest";

import { loadVariants } from "../../core/project.ts";
import type { Store } from "../../core/store.ts";
import type { JobResult, Outcome, Run } from "../../worker/protocol.ts";
import { createDefects } from "../defects.ts";
import { createPopgen2Store } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { SUMMARY_ID } from "./words.ts";
import { reportDefects } from "./workerDefects.ts";

const FILE_ID = "0123456789abcdef0123456789abcdef";

/** The store of the new page with a fake `send` ended by hand, and
    panel.nei open and read. */
function setUp(): {
  readonly store: Store<JobResult, Blob>;
  readonly sent: ((outcome: Outcome<JobResult>) => void)[];
} {
  const sent: ((outcome: Outcome<JobResult>) => void)[] = [];
  let lastId = 0;
  const store = createPopgen2Store({
    send: (): Run<JobResult> => {
      lastId += 1;
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        sent.push(resolve);
      });
      return { id: lastId, outcome, cancel: () => undefined };
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  store.apply("a new variants file was loaded", (p) =>
    loadVariants(p, {
      fileId: FILE_ID,
      name: "panel.nei",
      size: 261_490,
      format: "nei",
      readOptions: null,
    }),
  );
  store.variantsRead(FILE_ID, {
    kind: "read",
    individuals: ["s1", "s2"],
    ploidy: 2,
    numVars: null,
  });
  return { store, sent };
}

/** Lets the outcomes given settle through `startAnalysis`. */
async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("the defects of the worker given to the error bar of the new page", () => {
  test("a defect of the count is reported once, with its message and no stack of the page", async () => {
    const { store, sent } = setUp();
    const defects = createDefects();
    reportDefects(store, defects);

    void startAnalysis(store, SUMMARY_ID);
    sent[0]?.({
      kind: "failed",
      error: { kind: "defect", message: "popnei_web defect: a test." },
    });
    await settled();
    // Another change of the store, with the failure still shown.
    store.popneiReady("0.1.0");

    expect(defects.getState()).toEqual({
      first: {
        message: "popnei_web defect: a test.",
        details:
          "Error 1, thrown in the calculation worker during a calculation, given back to the page as its failure:\npopnei_web defect: a test.",
      },
      more: 0,
    });
  });

  test("a failure that is no defect of our code is not reported", async () => {
    const { store, sent } = setUp();
    const defects = createDefects();
    reportDefects(store, defects);

    void startAnalysis(store, SUMMARY_ID);
    sent[0]?.({
      kind: "failed",
      error: { kind: "workerFailed", message: "out of memory" },
    });
    await settled();

    expect(defects.getState().first).toBeNull();
  });
});
