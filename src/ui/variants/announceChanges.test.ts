/**
 * What the status region of popgen2.html says of the PCA started again
 * by itself and of its Stop (docs/specs/steps/popgen2-pca.md, "Running",
 * "Stop" and "Accessibility"), told by the analyses started by
 * themselves, over the store of the page with a fake worker.
 */
import { describe, expect, test } from "vitest";

import { pcaOnPopgen2, pcaOptions } from "../../core/analyses/pca.ts";
import { setAnalysisOptions } from "../../core/project.ts";
import type { JobResult, Run } from "../../worker/protocol.ts";
import type { LiveEvent } from "../autoRuns.ts";
import { createPopgen2Store, openVariantsFile } from "../popgen2Store.ts";
import type { Announcer } from "../shell/status.ts";
import { announceLive } from "./announceChanges.ts";

/** An announcer that keeps what it was given. */
function recorder(): {
  readonly said: string[];
  readonly announcer: Announcer;
} {
  const said: string[] = [];
  return {
    said,
    announcer: {
      announce: (text) => {
        said.push(text);
      },
      announceChange: (change) => {
        const text = change();
        if (text !== null) said.push(text);
      },
      clear: () => undefined,
      getState: () => said.at(-1) ?? "",
      subscribe: () => () => undefined,
    },
  };
}

/** The store of the page with `panel.nei` open, and the events of the
    live analyses the test tells. */
function setUp(): {
  readonly said: string[];
  readonly tell: (event: LiveEvent) => void;
  readonly toPcoa: () => void;
} {
  const store = createPopgen2Store({
    send: (): Run<JobResult> => ({
      id: 1,
      outcome: new Promise(() => undefined),
      cancel: () => undefined,
    }),
    sendWrite: () => {
      throw new Error("no write here");
    },
    appVersion: "0.1.0",
  });
  openVariantsFile(store, {
    fileId: "a".repeat(32),
    name: "panel.nei",
    size: 261_490,
    format: "nei",
    readOptions: null,
  });
  const listeners: ((event: LiveEvent) => void)[] = [];
  const { said, announcer } = recorder();
  announceLive(
    store,
    {
      onLive: (listener) => {
        listeners.push(listener);
        return () => undefined;
      },
    },
    announcer,
  );
  return {
    said,
    tell: (event) => {
      for (const listener of listeners) listener(event);
    },
    toPcoa: () => {
      store.apply("the method changed", (p) =>
        setAnalysisOptions(p, pcaOnPopgen2, {
          ...pcaOptions(p, "popgen2"),
          method: "pcoa",
        }),
      );
    },
  };
}

describe("NU4 D2 the status region says the PCA started by itself and its Stop", () => {
  test("a start by itself is said once, by the method", () => {
    const { said, tell, toPcoa } = setUp();
    tell({ kind: "startedByItself", id: "pca" });
    expect(said).toEqual([
      "Calculating the PCA again. To change the filters, stop it in the PCA tab.",
    ]);
    toPcoa();
    tell({ kind: "startedByItself", id: "pca" });
    expect(said.at(-1)).toBe(
      "Calculating the PCoA again. To change the filters, stop it in the PCA tab.",
    );
    expect(said).toHaveLength(2);
  });

  test("a Stop is said with what to press to calculate it again", () => {
    const { said, tell, toPcoa } = setUp();
    tell({ kind: "paused", id: "pca" });
    expect(said).toEqual([
      "PCA stopped. Press Run in the PCA tab to calculate it again.",
    ]);
    toPcoa();
    tell({ kind: "paused", id: "pca" });
    expect(said.at(-1)).toBe(
      "PCoA stopped. Press Run in the PCA tab to calculate it again.",
    );
  });
});
