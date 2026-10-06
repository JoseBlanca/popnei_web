// @vitest-environment jsdom
/**
 * The box of the variants file on popgen2.html, drawn by React in jsdom
 * over the real store of the page, with a fake `send` whose requests the
 * test ends by hand, and the analyses the page starts by itself, synced
 * when the test says: the one button of the chain in a state that passes
 * too fast for a flow to see, a pass about to start, and the focus when
 * popnei refuses the file while Stop has it.
 */
import { StrictMode, act, createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { loadVariants } from "../../core/project.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type { Store } from "../../core/store.ts";
import type { Job, JobResult, Outcome, Run } from "../../worker/protocol.ts";
import { createAutoRuns } from "../autoRuns.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { POPGEN2_AUTO_GROUPS, createPopgen2Store } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { AnnouncerProvider } from "../shell/announcer.tsx";
import { createAnnouncer } from "../shell/status.ts";
import { StoreProvider } from "../store.tsx";
import { VariantsSummary } from "./VariantsSummary.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** A request the fake `send` was given, and how the test ends it. */
interface Request {
  readonly key: string;
  readonly job: Job;
  cancelled: boolean;
  readonly end: (outcome: Outcome<JobResult>) => void;
  /** Gives the store a result so far of the request. */
  readonly soFar: (result: JobResult) => void;
}

/** The page: its store, the analyses it starts by itself, which start
    only at the test's `sync`, and the requests sent. */
interface Page {
  readonly store: Store<JobResult, Blob>;
  readonly autoRuns: AutoRuns;
  readonly requests: Request[];
}

const FILE_ID = "0123456789abcdef0123456789abcdef";

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
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

/** Draws the box in <StrictMode>, as the development server draws the
    page, with the open button before it, and `panel.nei` opened and
    read; no pass is started until the test syncs. */
async function drawPage(): Promise<Page> {
  const requests: Request[] = [];
  let lastId = 0;
  const store = createPopgen2Store({
    send: (key, job, _onProgress, onSoFar): Run<JobResult> => {
      lastId += 1;
      let request: Request | null = null;
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        request = {
          key,
          job,
          cancelled: false,
          end: resolve,
          soFar: onSoFar,
        };
        requests.push(request);
      });
      return {
        id: lastId,
        outcome,
        cancel: () => {
          if (request !== null) request.cancelled = true;
        },
      };
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  const autoRuns = createAutoRuns({
    store,
    groups: POPGEN2_AUTO_GROUPS,
    start: (id) => startAnalysis(store, id),
  });
  const openButton = createRef<HTMLButtonElement>();
  const tree = createElement(
    StrictMode,
    null,
    createElement(
      StoreProvider,
      { value: store },
      createElement(
        AnnouncerProvider,
        { value: createAnnouncer() },
        createElement("button", { ref: openButton }, "Open variants file…"),
        createElement(VariantsSummary, {
          autoRuns,
          openButton,
          onCountButton: () => undefined,
          refusal: null,
        }),
      ),
    ),
  );
  await act(async () => {
    root.render(tree);
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
      individuals: ["i1", "i2"],
      ploidy: 2,
      numVars: null,
    });
    await Promise.resolve();
  });
  return { store, autoRuns, requests };
}

/** The buttons of the box, by their words. */
function buttonsOf(): readonly string[] {
  return [...container.querySelectorAll("section button")].map(
    (element) => element.textContent,
  );
}

/** The button of the box with the words `name`. */
function buttonNamed(name: string): HTMLButtonElement {
  const found = [
    ...container.querySelectorAll<HTMLButtonElement>("section button"),
  ].find((element) => element.textContent === name);
  if (found === undefined) throw new Error(`no button ${name} in the box`);
  return found;
}

describe("the one button of the box of the variants file", () => {
  test("while the pass is about to start, read and not yet started, the box shows Stop, and its press keeps the pass from starting and offers Start again", async () => {
    const page = await drawPage();
    expect(page.requests).toHaveLength(0);
    expect(buttonsOf()).toEqual(["Stop"]);

    await act(async () => {
      buttonNamed("Stop").click();
      await Promise.resolve();
    });
    act(() => {
      page.autoRuns.sync();
    });
    expect(page.requests).toHaveLength(0);
    expect(buttonsOf()).toEqual(["Start again"]);

    await act(async () => {
      buttonNamed("Start again").click();
      await Promise.resolve();
    });
    expect(page.requests.map((r) => r.job.analysis)).toEqual([
      "variantsSummary",
    ]);
    expect(buttonsOf()).toEqual(["Stop"]);
  });

  test("popnei's refusal of the file while Stop has the focus moves the focus onto the words of the failure", async () => {
    const page = await drawPage();
    act(() => {
      page.autoRuns.sync();
    });
    expect(page.requests).toHaveLength(1);
    const stop = buttonNamed("Stop");
    act(() => {
      stop.focus();
    });
    expect(document.activeElement).toBe(stop);

    page.requests[0]?.end({
      kind: "failed",
      error: {
        kind: "popnei",
        message:
          "line 9 of the VCF, the column of s000: its genotype is of the ploidy 1 and the variants are read with the ploidy 2; popnei does not read a VCF whose genotypes are of different ploidies",
      },
    });
    await settled();

    expect(buttonsOf()).toEqual([]);
    const active = document.activeElement;
    expect(active?.textContent).toBe(
      "Line 9 of panel.nei has a genotype of ploidy 1 among genotypes of ploidy 2, and the application reads one ploidy per file. Remove those variants or individuals from the file and open it again.",
    );
    expect(active?.getAttribute("tabindex")).toBe("-1");
  });

  test("live-stats 2 while the pass runs, the lines of the variants and the chromosomes give those read so far once the pass gave a result so far", async () => {
    const page = await drawPage();
    act(() => {
      page.autoRuns.sync();
    });
    const lines = (): string => container.textContent;
    expect(lines()).toContain("Variants: counting…");
    await act(async () => {
      page.requests[0]?.soFar(
        summaryResult(["1", "2", "3"], [52_000, 7, 0], ["i1", "i2"]),
      );
      await Promise.resolve();
    });
    expect(lines()).toContain("Variants: 52,007 so far");
    expect(lines()).not.toContain("counting");
    // The chromosomes with a variant among those read.
    expect(lines()).toContain("Chromosomes: 2 so far");
  });
});
