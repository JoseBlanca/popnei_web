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
import type { Announcer } from "../shell/status.ts";
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
  /** The texts given to the status region, in their order. */
  readonly said: string[];
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
    read, or `low_qual.vcf.gz` as the page opens a VCF when `format` is
    "vcf"; no pass is started until the test syncs. */
async function drawPage(
  format: "nei" | "vcf" = "nei",
  { read = true }: { readonly read?: boolean } = {},
): Promise<Page> {
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
  const said: string[] = [];
  const regionAnnouncer = createAnnouncer();
  const announcer: Announcer = {
    ...regionAnnouncer,
    announce: (text, options) => {
      said.push(text);
      regionAnnouncer.announce(text, options);
    },
  };
  const openButton = createRef<HTMLButtonElement>();
  const tree = createElement(
    StrictMode,
    null,
    createElement(
      StoreProvider,
      { value: store },
      createElement(
        AnnouncerProvider,
        { value: announcer },
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
      loadVariants(
        p,
        format === "nei"
          ? {
              fileId: FILE_ID,
              name: "panel.nei",
              size: 261_490,
              format: "nei",
              readOptions: null,
            }
          : {
              fileId: FILE_ID,
              name: "low_qual.vcf.gz",
              size: 30_000,
              format: "vcf",
              readOptions: { ploidy: null, onlyPassed: false },
            },
      ),
    );
    if (read) {
      store.variantsRead(FILE_ID, {
        kind: "read",
        individuals: ["i1", "i2"],
        ploidy: 2,
        numVars: null,
      });
    }
    await Promise.resolve();
  });
  return { store, autoRuns, requests, said };
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

describe("one-pass the box of a file being read has no line of the FILTER failures", () => {
  for (const format of ["vcf", "nei"] as const) {
    test(`a ${format} file`, async () => {
      await drawPage(format, { read: false });
      expect(linesOf()).toContain("Variants: reading…");
      expect(linesOf().some((line) => line.includes("FILTER"))).toBe(false);
    });
  }
});

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

/** The lines of the box, each the words of one paragraph. */
function linesOf(): readonly string[] {
  return [...container.querySelectorAll("section p")].map(
    (element) => element.textContent,
  );
}

/** The name of the bar of the box, or `null` when there is none. */
function barName(): string | null {
  return (
    container
      .querySelector('section [role="progressbar"]')
      ?.getAttribute("aria-label") ?? null
  );
}

/** Ends the request `at` with its result, settles, and syncs the page. */
async function endWith(page: Page, at: number, result: JobResult) {
  const request = page.requests[at];
  if (request === undefined) throw new Error(`no request ${String(at)}`);
  request.end({ kind: "done", key: request.key, result });
  await settled();
  act(() => {
    page.autoRuns.sync();
  });
}

describe("one-pass a VCF is read once", () => {
  test("the summary is the one pass: its end ends the chain, with no line of the FILTER failures, and the focus on Stop moves onto the lines", async () => {
    const page = await drawPage("vcf");
    act(() => {
      page.autoRuns.sync();
    });
    expect(barName()).toBe("Counting the variants");
    const stop = buttonNamed("Stop");
    act(() => {
      stop.focus();
    });

    await endWith(page, 0, summaryResult(["1"], [1200], ["i1", "i2"]));
    expect(page.requests.map((r) => r.job.analysis)).toEqual([
      "variantsSummary",
    ]);
    expect(linesOf()).toEqual([
      "low_qual.vcf.gz · 30 KB",
      "Individuals: 2",
      "Variants: 1,200",
      "Chromosomes: 1",
      "Ploidy: 2",
    ]);
    expect(buttonsOf()).toEqual([]);
    expect(barName()).toBeNull();
    expect(document.activeElement?.textContent).toContain("Variants: 1,200");
  });

  test("a Stop during the summary says not counted on the two lines, beside Start again", async () => {
    const page = await drawPage("vcf");
    act(() => {
      page.autoRuns.sync();
    });
    await act(async () => {
      buttonNamed("Stop").click();
      await Promise.resolve();
    });
    page.requests[0]?.end({ kind: "cancelled" });
    await settled();
    act(() => {
      page.autoRuns.sync();
    });
    expect(linesOf()).toEqual([
      "low_qual.vcf.gz · 30 KB",
      "Individuals: 2",
      "Variants: not counted",
      "Chromosomes: not counted",
      "Ploidy: 2",
    ]);
    expect(buttonsOf()).toEqual(["Start again"]);
    expect(page.said).toEqual([
      "The count of the variants and the statistics were stopped. Start again calculates them from the start.",
    ]);
  });

  for (const kind of ["defect", "workerFailed"] as const) {
    test(`after a ${kind} of the summary no other pass starts, and its words follow the lines`, async () => {
      const page = await drawPage("vcf");
      act(() => {
        page.autoRuns.sync();
      });
      page.requests[0]?.end({
        kind: "failed",
        error: { kind, message: "boom" },
      });
      await settled();
      act(() => {
        page.autoRuns.sync();
      });
      expect(page.requests.map((r) => r.job.analysis)).toEqual([
        "variantsSummary",
      ]);
      expect(linesOf()).toEqual([
        "low_qual.vcf.gz · 30 KB",
        "Individuals: 2",
        "Variants: not counted",
        "Chromosomes: not counted",
        "Ploidy: 2",
        "The variants of low_qual.vcf.gz could not be counted, nor their statistics calculated.",
      ]);
      // Start again mends a crash of the worker, not a defect of ours.
      expect(buttonsOf()).toEqual(
        kind === "workerFailed" ? ["Start again"] : [],
      );
    });
  }
});

const OTHER_FILE_ID = "fedcba9876543210fedcba9876543210";

/** Opens and reads another file on the page, other.vcf.gz, as the page
    opens a VCF. */
async function openOther(page: Page): Promise<void> {
  await act(async () => {
    page.store.apply("a new variants file was loaded", (p) =>
      loadVariants(p, {
        fileId: OTHER_FILE_ID,
        name: "other.vcf.gz",
        size: 10,
        format: "vcf",
        readOptions: { ploidy: null, onlyPassed: false },
      }),
    );
    page.store.variantsRead(OTHER_FILE_ID, {
      kind: "read",
      individuals: ["i1", "i2"],
      ploidy: 2,
      numVars: null,
    });
    await Promise.resolve();
  });
}

describe("one-pass a new file opened while the summary runs", () => {
  test("the old count, ended late, is never shown, and the new file is counted", async () => {
    const page = await drawPage("vcf");
    act(() => {
      page.autoRuns.sync();
    });
    await openOther(page);
    expect(page.requests[0]?.cancelled).toBe(true);
    await endWith(page, 0, summaryResult(["1"], [1200], ["i1", "i2"]));
    expect(linesOf()).not.toContain("Variants: 1,200");
    expect(linesOf()).toContain("Variants: counting…");
    expect(page.requests.map((r) => r.job.analysis)).toEqual([
      "variantsSummary",
      "variantsSummary",
    ]);
  });
});
