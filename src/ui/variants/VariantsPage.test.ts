// @vitest-environment jsdom
/**
 * The page of popgen2.html drawn by React in jsdom over the real store of
 * the page, with a fake `send` whose requests the test ends by hand: the
 * boundary of errors of the box of the file, made again for each file
 * opened, so that a throw while the box of one file is drawn does not
 * leave the next files with its heading alone. The throw is injected in
 * the words of the box, which no fixture can make throw.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { loadVariants } from "../../core/project.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type { Store } from "../../core/store.ts";
import type { JobResult, Outcome, Run } from "../../worker/protocol.ts";
import { createAutoRuns } from "../autoRuns.ts";
import { FilesProvider } from "../files.tsx";
import { POPGEN2_AUTO_GROUPS, createPopgen2Store } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { AnnouncerProvider } from "../shell/announcer.tsx";
import { createAnnouncer } from "../shell/status.ts";
import { StoreProvider } from "../store.tsx";
import { VariantsPage } from "./VariantsPage.tsx";
import type * as WordsModule from "./words.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** The number of chromosomes for which the line of the chromosomes so
    far throws, or null. */
const inject = vi.hoisted(() => ({ throwAt: null as number | null }));

vi.mock("./words.ts", async (importOriginal) => {
  const real = await importOriginal<typeof WordsModule>();
  return {
    ...real,
    chromosomesSoFarLine: (numChroms: number): string => {
      if (numChroms === inject.throwAt) {
        throw new Error("a line of the box could not be drawn");
      }
      return real.chromosomesSoFarLine(numChroms);
    },
  };
});

/** A request the fake `send` was given, and how the test gives it a
    result so far. */
interface Request {
  readonly end: (outcome: Outcome<JobResult>) => void;
  readonly soFar: (result: JobResult) => void;
}

let container: HTMLElement;
let root: Root;
let caught: unknown[];

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  inject.throwAt = null;
  container = document.createElement("div");
  document.body.append(container);
  caught = [];
  root = createRoot(container, {
    onCaughtError: (error) => {
      caught.push(error);
    },
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

/** Lets the outcomes given settle, and React draw what they changed. */
async function settled(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Draws the page in <StrictMode>, as the development server draws it,
    with the analyses it starts by itself. */
async function drawPage(): Promise<{
  readonly store: Store<JobResult, Blob>;
  readonly requests: Request[];
}> {
  const requests: Request[] = [];
  const store = createPopgen2Store({
    send: (_key, _job, _onProgress, onSoFar): Run<JobResult> => {
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        requests.push({ end: resolve, soFar: onSoFar });
      });
      return { id: requests.length, outcome, cancel: () => undefined };
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  const autoRuns = createAutoRuns({
    store,
    groups: POPGEN2_AUTO_GROUPS,
    start: (id) => startAnalysis(store, id),
  });
  store.subscribe(() => {
    queueMicrotask(() => {
      autoRuns.sync();
    });
  });
  const files = {
    addFile: (): string => {
      throw new Error("the test picks no file");
    },
    fileOf: (): File | null => null,
  };
  const tree = createElement(
    StrictMode,
    null,
    createElement(
      StoreProvider,
      { value: store },
      createElement(
        AnnouncerProvider,
        { value: createAnnouncer() },
        createElement(
          FilesProvider,
          { value: files },
          createElement(VariantsPage, {
            autoRuns,
            onCountButton: () => undefined,
            onStatsShown: () => () => undefined,
          }),
        ),
      ),
    ),
  );
  await act(async () => {
    root.render(tree);
    await Promise.resolve();
  });
  return { store, requests };
}

/** Opens the `.nei` file `name` under `fileId` and records its read. */
async function open(
  store: Store<JobResult, Blob>,
  fileId: string,
  name: string,
): Promise<void> {
  await act(async () => {
    store.apply("a new variants file was loaded", (p) =>
      loadVariants(p, {
        fileId,
        name,
        size: 1000,
        format: "nei",
        readOptions: null,
      }),
    );
    store.variantsRead(fileId, {
      kind: "read",
      individuals: ["i1", "i2"],
      ploidy: 2,
      numVars: null,
      keepsPassed: false,
    });
    await Promise.resolve();
  });
  await settled();
}

/** The box of the file, by its name. */
function box(): Element | null {
  return container.querySelector('[aria-label="File information"]');
}

test("live-stats 2 after a throw while the box of one file is drawn, the box of the next file is drawn whole, with its Stop", async () => {
  const { store, requests } = await drawPage();
  await open(store, "a".repeat(32), "first.nei");
  inject.throwAt = 3;
  await act(async () => {
    requests
      .at(-1)
      ?.soFar(summaryResult(["1", "2", "3"], [100, 100, 100], ["i1", "i2"]));
    await Promise.resolve();
  });
  expect(caught).toHaveLength(1);
  expect(box()).toBeNull();
  expect(container.textContent).toContain("File information");

  await open(store, "b".repeat(32), "second.nei");

  expect(box()).not.toBeNull();
  expect(box()?.textContent).toContain("second.nei");
  expect(box()?.textContent).toContain("Variants: counting…");
  expect(
    [...container.querySelectorAll("button")].map((b) => b.textContent),
  ).toContain("Stop");
});
