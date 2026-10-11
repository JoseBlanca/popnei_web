// @vitest-environment jsdom
/**
 * The page of popgen2.html drawn by React in jsdom over the real store of
 * the page, with a fake `send` whose requests the test ends by hand: the
 * boundary of errors of the box of the file, made again for each file
 * opened, so that a throw while the box of one file is drawn does not
 * leave the next files with its heading alone. The throw is injected in
 * the words of the box, which no fixture can make throw. And the boundary
 * of the zone that opens a variants file, with a heading of its own; its
 * throw is injected in the widget of the zone.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";

import {
  loadIndividuals,
  loadVariants,
  setGrouping,
  setIndividualFilter,
} from "../../core/project.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type { JobResult, Outcome, Run } from "../../worker/protocol.ts";
import { LIVE_QUIET_MS, createAutoRuns } from "../autoRuns.ts";
import { FilesProvider } from "../files.tsx";
import { createPageTab } from "../pageTab.ts";
import type { PageTabStore } from "../pageTab.ts";
import {
  POPGEN2_AUTO_GROUPS,
  POPGEN2_LIVE,
  createPopgen2Store,
} from "../popgen2Store.ts";
import type { Popgen2PageStore } from "../popgen2Store.ts";
import { statusOf } from "../analyses/status.ts";
import { startAnalysis } from "../runs.ts";
import { AnnouncerProvider } from "../shell/announcer.tsx";
import { createAnnouncer } from "../shell/status.ts";
import { StoreProvider } from "../store.tsx";
import { RunGateProvider } from "./runGate.tsx";
import { createRunGate } from "./thresholdRun.ts";
import { ChangeHoldsProvider } from "../widgets/changeHold.ts";
import { VariantsPage } from "./VariantsPage.tsx";
import type * as FileZoneModule from "../widgets/FileZone.tsx";
import type { FileZoneProps } from "../widgets/FileZone.tsx";
import type * as WordsModule from "./words.ts";
import type * as Popgen2TabsModule from "../../core/popgen2Tabs.ts";
import { pca, pcaOnPopgen2 } from "../../core/analyses/pca.ts";
import { setAnalysisOptions } from "../../core/project.ts";
import type * as PcaModule from "../../core/analyses/pca.ts";
import type * as PcaTabModule from "../analyses/pca/PcaTab.tsx";
import type { PcaTabProps } from "../analyses/pca/PcaTab.tsx";
import { failureEndsLive } from "../analyses/pca/liveEnd.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** The number of variants read so far for which the line of the variants
    in the box throws, or null. */
const inject = vi.hoisted(() => ({
  throwAt: null as number | null,
  zoneThrows: false,
  tabsThrow: false,
  pcaTabThrows: false,
  pcaOptionsThrow: false,
  factsThrow: false,
}));

vi.mock("../../core/analyses/pca.ts", async (importOriginal) => {
  const real = await importOriginal<typeof PcaModule>();
  return {
    ...real,
    pcaOptions: (
      ...args: Parameters<typeof real.pcaOptions>
    ): ReturnType<typeof real.pcaOptions> => {
      if (inject.pcaOptionsThrow) {
        throw new Error(
          "popnei_web defect: the project holds options of the PCA it refuses.",
        );
      }
      return real.pcaOptions(...args);
    },
  };
});

vi.mock("../analyses/pca/PcaTab.tsx", async (importOriginal) => {
  const real = await importOriginal<typeof PcaTabModule>();
  return {
    ...real,
    PcaTab: (props: PcaTabProps): React.JSX.Element => {
      if (inject.pcaTabThrows) {
        throw new Error("the PCA tab could not be drawn");
      }
      return real.PcaTab(props);
    },
  };
});

vi.mock("../../core/popgen2Tabs.ts", async (importOriginal) => {
  const real = await importOriginal<typeof Popgen2TabsModule>();
  return {
    ...real,
    analysisTabs: (
      ...args: Parameters<typeof real.analysisTabs>
    ): ReturnType<typeof real.analysisTabs> => {
      if (inject.tabsThrow) {
        throw new Error(
          "popnei_web defect: an individuals file read gave no counts.",
        );
      }
      return real.analysisTabs(...args);
    },
  };
});

vi.mock("../widgets/FileZone.tsx", async (importOriginal) => {
  const real = await importOriginal<typeof FileZoneModule>();
  return {
    ...real,
    FileZone: (props: FileZoneProps): React.JSX.Element => {
      // The zone of the variants file alone, not the individuals file's.
      if (inject.zoneThrows && props.pasteLabel === "Paste a variants file") {
        throw new Error("the zone could not be drawn");
      }
      return real.FileZone(props);
    },
  };
});

vi.mock("./words.ts", async (importOriginal) => {
  const real = await importOriginal<typeof WordsModule>();
  return {
    ...real,
    variantsLineOf: (
      ...args: Parameters<typeof real.variantsLineOf>
    ): ReturnType<typeof real.variantsLineOf> => {
      const [status] = args;
      if (
        status.kind === "running" &&
        status.soFar?.analysis === "variantsSummary" &&
        status.soFar.passStats.numVars === inject.throwAt
      ) {
        throw new Error("a line of the box could not be drawn");
      }
      return real.variantsLineOf(...args);
    },
    ploidyLine: (
      ...args: Parameters<typeof real.ploidyLine>
    ): ReturnType<typeof real.ploidyLine> => {
      if (inject.factsThrow) {
        throw new Error("the line of the ploidy could not be drawn");
      }
      return real.ploidyLine(...args);
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

beforeAll(async () => {
  // The code of the plots, which the page loads by import() once a file
  // is read, made ready before the tests, so that every run draws the
  // plots: alone, the file was read before its first transform ended, and
  // the plots were never drawn; in the whole suite, on the runner of
  // GitHub with node 24, they were, and threw for want of a
  // ResizeObserver, twelve errors more than the one injected.
  await import("./SectionPlots.tsx");
});

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no ResizeObserver, which the plots ask for their size.
  globalThis.ResizeObserver = class {
    observe(): void {
      // Nothing is laid out in jsdom.
    }
    unobserve(): void {
      // Nothing is laid out in jsdom.
    }
    disconnect(): void {
      // Nothing is laid out in jsdom.
    }
  };
  inject.throwAt = null;
  inject.zoneThrows = false;
  inject.tabsThrow = false;
  inject.pcaTabThrows = false;
  inject.pcaOptionsThrow = false;
  inject.factsThrow = false;
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
    with the analyses it starts by itself, synced after each change of
    the store, or never with `syncByHand`, which holds the one pass in
    the quiet second before it starts; a file picked is kept under
    `pickedId`, and with none given the test picks no file. */
async function drawPage(
  pickedId?: string,
  { syncByHand = false }: { readonly syncByHand?: boolean } = {},
): Promise<{
  readonly store: Popgen2PageStore<JobResult, Blob>;
  readonly requests: Request[];
  readonly pageTab: PageTabStore;
}> {
  const requests: Request[] = [];
  const store = createPopgen2Store({
    send: (_key, _job, _onProgress, onSoFar): Run<JobResult> => {
      const outcome = new Promise<Outcome<JobResult>>((resolve) => {
        requests.push({ end: resolve, soFar: onSoFar });
      });
      return { id: requests.length, outcome, cancel: () => undefined };
    },
    sendWrite: () => {
      throw new Error("popnei_web defect: no write is sent here");
    },
    appVersion: "0.1.0",
  });
  store.popneiReady("0.1.0");
  const autoRuns = createAutoRuns({
    store,
    groups: POPGEN2_AUTO_GROUPS,
    start: (id) => startAnalysis(store, id),
    // The PCA is never made live here, so its gate holds nothing.
    live: {
      analyses: POPGEN2_LIVE,
      changes: createRunGate(),
      runStart: (id) => startAnalysis(store, id),
      quietMs: LIVE_QUIET_MS,
      endsLive: failureEndsLive,
    },
  });
  if (!syncByHand) {
    store.subscribe(() => {
      queueMicrotask(() => {
        autoRuns.sync();
      });
    });
  }
  const files = {
    addFile: (): string => {
      if (pickedId === undefined) throw new Error("the test picks no file");
      return pickedId;
    },
    fileOf: (): File | null => null,
  };
  const gate = createRunGate();
  const pageTab = createPageTab();
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
          RunGateProvider,
          { value: gate },
          createElement(
            ChangeHoldsProvider,
            { value: gate },
            createElement(
              FilesProvider,
              { value: files },
              createElement(VariantsPage, {
                autoRuns,
                pageTab,
                onCountButton: () => undefined,
                onStatsShown: () => () => undefined,
              }),
            ),
          ),
        ),
      ),
    ),
  );
  await act(async () => {
    root.render(tree);
    await Promise.resolve();
  });
  return { store, requests, pageTab };
}

/** Opens the `.nei` file `name` under `fileId` and records its read. */
async function open(
  store: Popgen2PageStore<JobResult, Blob>,
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

/** The text of `element` but that of its parts hidden. */
function shownText(element: Element): string {
  return [...element.childNodes]
    .map((node) => {
      if (node instanceof Element) {
        return node.hasAttribute("hidden") ? "" : shownText(node);
      }
      return node.textContent ?? "";
    })
    .join("");
}

/** The box of the file, by its name. */
function box(): Element | null {
  return container.querySelector('[aria-label="File information"]');
}

test("live-stats 2 after a throw while the box of one file is drawn, the box of the next file is drawn whole, with its Stop", async () => {
  const { store, requests } = await drawPage();
  await open(store, "a".repeat(32), "first.nei");
  inject.throwAt = 300;
  await act(async () => {
    requests
      .at(-1)
      ?.soFar(summaryResult(["1", "2", "3"], [100, 100, 100], ["i1", "i2"]));
    await Promise.resolve();
  });
  expect(caught).toEqual([new Error("a line of the box could not be drawn")]);
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

/** The lines at the top of the Variants tab: the size of the file, its
    chromosomes and its ploidy. */
function factsOfTab(): string[] {
  const facts = container.querySelector('[aria-label="About the file"]');
  return [...(facts?.querySelectorAll("p") ?? [])].map((p) => p.textContent);
}

/** The region of the page named `name`, or null. */
function region(name: string): Element | null {
  return container.querySelector(
    `section[aria-labelledby="${CSS.escape(headingIdOf(name))}"]`,
  );
}

/** The id of the heading of the level 2 whose words are `name`. */
function headingIdOf(name: string): string {
  const heading = [...container.querySelectorAll("h2")].find(
    (h) => h.textContent === name,
  );
  return heading?.id ?? `<no heading ${name}>`;
}

/** The button whose words are `words`, or null. */
function buttonOf(words: string): HTMLButtonElement | null {
  return (
    [...container.querySelectorAll("button")].find(
      (b) => b.textContent === words,
    ) ?? null
  );
}

describe("IN3 the page in two boxes and the row of tabs", () => {
  test("with no file: the two boxes, Variants and Individuals, each with its zone alone, then the five tabs with the Variants tab shown", async () => {
    await drawPage();
    const variantsBox = region("Variants");
    const individualsBox = region("Individuals");
    expect(variantsBox).not.toBeNull();
    expect(individualsBox).not.toBeNull();
    expect(variantsBox?.contains(buttonOf("Open variants file…"))).toBe(true);
    expect(individualsBox?.contains(buttonOf("Open individuals file…"))).toBe(
      true,
    );
    // The individuals box holds its button alone: no words and no table.
    expect(individualsBox?.querySelector("p")).toBeNull();
    expect(individualsBox?.querySelector("table")).toBeNull();
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Variants",
      "Individuals",
      "PCA",
      "Populations",
      "Distances",
    ]);
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
      "false",
      "false",
      "false",
    ]);
    expect(tabs.map((tab) => tab.getAttribute("aria-disabled"))).toEqual([
      null,
      null,
      "true",
      "true",
      "true",
    ]);
    expect(
      container.querySelector('[role="tablist"]')?.getAttribute("aria-label"),
    ).toBe("Files and analyses");
    // The boxes come before the row of the tabs in the page.
    const tabList = container.querySelector('[role="tablist"]');
    expect(
      individualsBox !== null &&
        tabList !== null &&
        (individualsBox.compareDocumentPosition(tabList) &
          Node.DOCUMENT_POSITION_FOLLOWING) !==
          0,
    ).toBe(true);
    expect(container.textContent).toContain(
      "No variants file open. Open one in the box Variants.",
    );
    // The tabs not shown are drawn, inert, those of the analyses with
    // their reasons, and their content hidden under them.
    const hidden = [...container.querySelectorAll("[inert]")];
    expect(hidden.map(shownText)).toEqual([
      "No individuals file open.",
      "The PCA needs a variants file. Open one in the box Variants.",
      "The analyses of the populations need a variants file. Open one in the box Variants.",
      "The distances between populations need a variants file. Open one in the box Variants.",
    ]);
  });

  test("NU8 R1 a variants file popnei could not read: the Variants tab says so in one line and sends the user to the box Variants", async () => {
    const { store } = await drawPage();
    const fileId = "c".repeat(32);
    await act(async () => {
      store.apply("a new variants file was loaded", (p) =>
        loadVariants(p, {
          fileId,
          name: "panel.nei",
          size: 1000,
          format: "nei",
          readOptions: null,
        }),
      );
      store.variantsRead(fileId, {
        kind: "failed",
        error: { kind: "popnei", message: "the source is not a vars file" },
      });
      await Promise.resolve();
    });
    await settled();
    const panel = container.querySelector('[role="tabpanel"]:not([inert])');
    expect(panel === null ? null : shownText(panel)).toBe(
      "panel.nei could not be read; the box Variants says why.",
    );
  });

  test("NU8 R1 with a variants file read and no individuals file, the box of the individuals has the counts of one row, Unclassified, with no caption and no Download", async () => {
    const { store } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    const individualsBox = region("Individuals");
    const rows = [...(individualsBox?.querySelectorAll("tr") ?? [])].map((tr) =>
      [...tr.querySelectorAll("th, td")].map((cell) => cell.textContent),
    );
    expect(rows).toEqual([
      ["Population", "Individuals"],
      ["Unclassified", "2"],
    ]);
    // No words on the screen but the table's: its own caption names it
    // for a screen reader alone, hidden by its style, which jsdom does
    // not apply.
    expect(individualsBox?.querySelectorAll("p")).toHaveLength(0);
    expect(individualsBox?.querySelector("table > caption")?.textContent).toBe(
      "Individuals of first.nei after the filters of individuals",
    );
    expect(
      [...(individualsBox?.querySelectorAll("button") ?? [])].some((b) =>
        (b.getAttribute("aria-label") ?? b.textContent).startsWith("Download"),
      ),
    ).toBe(false);
    expect(container.textContent).not.toContain("No variants file open.");
  });

  test("NU8 R1 the box of the variants file shows its name, individuals and variants; the size, the chromosomes and the ploidy are at the top of the Variants tab", async () => {
    const { store, requests } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    expect(
      [...(box()?.querySelectorAll("p") ?? [])].map((p) => p.textContent),
    ).toEqual(["first.nei", "Individuals: 2", "Variants: counting…"]);
    const facts = factsOfTab();
    expect(facts).toEqual([
      "File size: 1 KB",
      "Chromosomes: counting…",
      "Ploidy: 2",
    ]);
    await act(async () => {
      requests
        .at(-1)
        ?.soFar(summaryResult(["1", "2"], [100, 100], ["i1", "i2"]));
      await Promise.resolve();
    });
    expect(
      [...(box()?.querySelectorAll("p") ?? [])].map((p) => p.textContent),
    ).toEqual(["first.nei", "Individuals: 2", "Variants: 200 so far"]);
    expect(factsOfTab()).toEqual([
      "File size: 1 KB",
      "Chromosomes: 2 so far",
      "Ploidy: 2",
    ]);
  });

  test("NU8 R1 the size, the chromosomes and the ploidy are a region named About the file, which a screen reader lists", async () => {
    const { store } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    const facts = container.querySelector('[aria-label="About the file"]');
    expect(facts?.tagName).toBe("SECTION");
    expect(facts?.getAttribute("role")).toBeNull();
  });

  test("NU8 R1 a throw in the lines of the file at the top of the Variants tab leaves their heading alone, and the statistics drawn", async () => {
    inject.factsThrow = true;
    const { store } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    expect(caught).toEqual([
      new Error("the line of the ploidy could not be drawn"),
    ]);
    const headings = [...container.querySelectorAll("h2, h3")].map(
      (heading) => `${heading.tagName} ${heading.textContent}`,
    );
    expect(headings).toContain("H2 About the file");
    expect(headings).not.toContain("H2 Statistics of the file");
    expect(headings).toContain("H2 Filters of the variants");
    expect(factsOfTab()).toEqual([]);
  });

  test("NU8 R1 a Stop in the quiet second before the one pass starts, which changes nothing in the store, makes the chromosomes not counted", async () => {
    const { store, requests } = await drawPage(undefined, { syncByHand: true });
    await open(store, "a".repeat(32), "first.nei");
    expect(requests).toHaveLength(0);
    expect(factsOfTab()).toEqual([
      "File size: 1 KB",
      "Chromosomes: counting…",
      "Ploidy: 2",
    ]);
    const project = store.getState().project;
    const stop = [...(box()?.querySelectorAll("button") ?? [])].find(
      (button) => button.textContent === "Stop",
    );
    await act(async () => {
      stop?.click();
      await Promise.resolve();
    });
    expect(store.getState().project).toBe(project);
    expect(requests).toHaveLength(0);
    expect(factsOfTab()).toEqual([
      "File size: 1 KB",
      "Chromosomes: not counted",
      "Ploidy: 2",
    ]);
  });

  test("the zone is outside the boundary made for each file: its button is the same element after a throw in the box of one file and the opening of the next", async () => {
    const { store, requests } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    const button = buttonOf("Open another variants file…");
    expect(button).not.toBeNull();
    inject.throwAt = 300;
    await act(async () => {
      requests
        .at(-1)
        ?.soFar(summaryResult(["1", "2", "3"], [100, 100, 100], ["i1", "i2"]));
      await Promise.resolve();
    });
    expect(caught).toEqual([new Error("a line of the box could not be drawn")]);
    expect(buttonOf("Open another variants file…")).toBe(button);
    await open(store, "b".repeat(32), "second.nei");
    expect(buttonOf("Open another variants file…")).toBe(button);
    expect(region("Variants")?.contains(button)).toBe(true);
  });
});

/** The tab whose label is `label`. */
function tabOf(label: string): HTMLElement {
  const found = [
    ...container.querySelectorAll<HTMLElement>('[role="tab"]'),
  ].find((tab) => tab.textContent === label);
  if (found === undefined) throw new Error(`no tab ${label}`);
  return found;
}

/** Draws the page with a throw in the zone that opens a variants file,
    which the boundary of the zone catches. */
async function drawWithZoneThrowing(
  pickedId?: string,
): Promise<Popgen2PageStore<JobResult, Blob>> {
  inject.zoneThrows = true;
  const { store } = await drawPage(pickedId);
  expect(caught).toEqual([new Error("the zone could not be drawn")]);
  expect(buttonOf("Open variants file…")).toBeNull();
  inject.zoneThrows = false;
  return store;
}

describe("IN3 the boundary of the zone that opens a variants file", () => {
  test("after a throw in the zone, its heading is its own, under the box's, and not the box's name again", async () => {
    await drawWithZoneThrowing();
    const headings = [...container.querySelectorAll("h1, h2, h3")].map(
      (heading) => `${heading.tagName} ${heading.textContent}`,
    );
    // The page's heading, Popnei, is in the band, in the other root.
    expect(headings).toEqual([
      "H2 Variants",
      "H3 Opening a variants file",
      "H2 Individuals",
      // The heading of the PCA tab, greyed, drawn hidden under its
      // reason, with the heading of its filters.
      "H2 PCA",
      "H3 Filters of the variants for the PCA",
    ]);
  });

  test("after a throw in the zone, a turn of the tab draws the zone again, and a file can be opened from it", async () => {
    const store = await drawWithZoneThrowing("c".repeat(32));
    await act(async () => {
      tabOf("Individuals").click();
      await Promise.resolve();
    });
    expect(tabOf("Individuals").getAttribute("aria-selected")).toBe("true");
    const button = buttonOf("Open variants file…");
    expect(button).not.toBeNull();
    expect(region("Variants")?.contains(button)).toBe(true);

    const input =
      region("Variants")?.querySelector<HTMLInputElement>('input[type="file"]');
    if (input === null || input === undefined) throw new Error("no input");
    const picked = new File(["##fileformat=VCFv4.2\n"], "panel.vcf");
    Object.defineProperty(input, "files", { value: [picked] });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
    });
    expect(store.getState().project.variants?.name).toBe("panel.vcf");
  });
});

/** Opens an individuals file that puts i1 in p0 and i2 in p1, chooses
    its column pop, and keeps i1 alone. */
async function openPopulationsKeepingI1(
  store: Popgen2PageStore<JobResult, Blob>,
): Promise<void> {
  const fileId = "d".repeat(32);
  const csv = { encoding: "auto", separator: "auto", decimal: "auto" } as const;
  await act(async () => {
    store.apply("an individuals file was loaded", (p) =>
      loadIndividuals(p, { fileId, name: "pops.csv", csv }),
    );
    store.individualsRead(fileId, csv, {
      kind: "read",
      table: {
        columns: ["IID", "pop"],
        rows: [
          ["i1", "p0"],
          ["i2", "p1"],
        ],
      },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    });
    store.apply("the column of the populations changed", (p) =>
      setGrouping(p, { kind: "populations", column: "pop" }),
    );
    store.apply("the individuals kept changed", (p) =>
      setIndividualFilter(p, { kind: "keep", individuals: ["i1"] }),
    );
    await Promise.resolve();
  });
  await settled();
}

describe("AP1 the row of five tabs on the page", () => {
  test("the filters keeping individuals of p0 alone grey Distances with the reason of the individuals kept", async () => {
    const { store } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    await openPopulationsKeepingI1(store);
    const distances = tabOf("Distances");
    expect(distances.getAttribute("aria-disabled")).toBe("true");
    expect(
      document.getElementById(distances.getAttribute("aria-describedby") ?? "")
        ?.textContent,
    ).toBe(
      "The distances between populations need at least two populations, and the filters keep individuals of 1 population. Loosen the filters of the individuals in the Variants tab.",
    );
  });

  test("a tab of the analyses greyed while shown keeps its content drawn, hidden, and shows it again when it opens", async () => {
    const { store } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    await act(async () => {
      tabOf("PCA").click();
      await Promise.resolve();
    });
    const heading = [...container.querySelectorAll("h2")].find(
      (h) => h.textContent === "PCA",
    );
    expect(heading).toBeDefined();
    await act(async () => {
      store.apply("a new variants file was loaded", (p) =>
        loadVariants(p, {
          fileId: "b".repeat(32),
          name: "second.nei",
          size: 1000,
          format: "nei",
          readOptions: null,
        }),
      );
      await Promise.resolve();
    });
    const panel = container.querySelector('[role="tabpanel"]:not([inert])');
    expect(panel?.textContent).toContain(
      "The PCA needs a variants file: second.nei is being opened.",
    );
    expect(heading?.isConnected).toBe(true);
    expect(heading?.closest("[hidden]")).not.toBeNull();
    await open(store, "b".repeat(32), "second.nei");
    expect(
      [...container.querySelectorAll("h2")].find(
        (h) => h.textContent === "PCA",
      ),
    ).toBe(heading);
    expect(heading?.closest("[hidden]")).toBeNull();
    expect(panel?.textContent).not.toContain("is being opened");
  });

  test("a defect in the reasons of the tabs costs the row of tabs alone: both boxes are still drawn", async () => {
    inject.tabsThrow = true;
    await drawPage();
    expect(caught).toEqual([
      new Error("popnei_web defect: an individuals file read gave no counts."),
    ]);
    expect(region("Variants")).not.toBeNull();
    expect(region("Individuals")).not.toBeNull();
    expect(buttonOf("Open variants file…")).not.toBeNull();
    expect(container.querySelector('[role="tablist"]')).toBeNull();
  });
});

describe("NU5 D2 the tab shown, which the row of tabs and the band read and change", () => {
  test("a tab shown from outside the page is the one the row selects, and a tab chosen in the row is the one the store gives", async () => {
    const { store, pageTab } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");

    await act(async () => {
      pageTab.show("pca");
      await Promise.resolve();
    });
    expect(tabOf("PCA").getAttribute("aria-selected")).toBe("true");
    expect(
      container.querySelector('[role="tabpanel"]:not([inert]) h2')?.textContent,
    ).toBe("PCA");

    await act(async () => {
      tabOf("Individuals").click();
      await Promise.resolve();
    });
    expect(pageTab.shown()).toBe("individuals");
    expect(tabOf("Individuals").getAttribute("aria-selected")).toBe("true");
  });
});

describe("AP6 the boundary of the PCA tab", () => {
  test("a throw while the tab is drawn under the PCoA leaves the heading of the tab, PCoA, in its place", async () => {
    const { store } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    await act(async () => {
      store.apply("the method of the PCA changed", (p) =>
        setAnalysisOptions(p, pca, {
          method: "pcoa",
          missingData: { follow: true, maxAllowedMissingRate: 0.1 },
          maf: { follow: true, maxAllowedMaf: 0.95 },
          ld: { follow: false, maxAllowedR2: 0.1, maxDist: null },
          colourBy: null,
          axes: [1, 2, 3],
          view: "3d",
        }),
      );
      await Promise.resolve();
    });
    inject.pcaTabThrows = true;
    await act(async () => {
      tabOf("PCA").click();
      await Promise.resolve();
    });
    expect(caught).toContainEqual(new Error("the PCA tab could not be drawn"));
    const panel = container.querySelector('[role="tabpanel"]:not([inert])');
    expect(
      [...(panel?.querySelectorAll("h2") ?? [])].map((h) => h.textContent),
    ).toEqual(["PCoA"]);
  });

  test("a throw while the tab is drawn under the PCA, the method of a new project, leaves the heading of the tab, PCA, in its place", async () => {
    const { store } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    inject.pcaTabThrows = true;
    await act(async () => {
      tabOf("PCA").click();
      await Promise.resolve();
    });
    expect(caught).toContainEqual(new Error("the PCA tab could not be drawn"));
    const panel = container.querySelector('[role="tabpanel"]:not([inert])');
    expect(
      [...(panel?.querySelectorAll("h2") ?? [])].map((h) => h.textContent),
    ).toEqual(["PCA"]);
  });

  test("options of the PCA the project refuses cost the PCA tab alone: the row of tabs stays, and the tab shows its boundary under PCA", async () => {
    const { store } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    inject.pcaOptionsThrow = true;
    await act(async () => {
      tabOf("PCA").click();
      await Promise.resolve();
    });
    expect(caught).toContainEqual(
      new Error(
        "popnei_web defect: the project holds options of the PCA it refuses.",
      ),
    );
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
    const panel = container.querySelector('[role="tabpanel"]:not([inert])');
    expect(
      [...(panel?.querySelectorAll("h2") ?? [])].map((h) => h.textContent),
    ).toEqual(["PCA"]);
  });

  test("options of the PCA the project refuses while a PCA runs leave the page its two boxes and its row of tabs", async () => {
    const { store } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    await act(async () => {
      store.apply("the LD filter of the PCA follows the Variants tab", (p) =>
        setAnalysisOptions(p, pca, {
          method: "pcoa",
          missingData: { follow: true, maxAllowedMissingRate: 0.1 },
          maf: { follow: true, maxAllowedMaf: 0.95 },
          ld: { follow: true, maxAllowedR2: 0.1, maxDist: null },
          colourBy: null,
          axes: [1, 2, 3],
          view: "3d",
        }),
      );
      void startAnalysis(store, pcaOnPopgen2.id);
      await Promise.resolve();
    });
    expect(statusOf(store.getState(), pcaOnPopgen2.id).kind).toBe("running");
    inject.pcaOptionsThrow = true;
    await act(async () => {
      tabOf("Individuals").click();
      await Promise.resolve();
    });
    expect(region("Variants")).not.toBeNull();
    expect(region("Individuals")).not.toBeNull();
    expect(container.querySelector('[role="tablist"]')).not.toBeNull();
  });
});
