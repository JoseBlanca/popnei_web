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
import { RunGateProvider } from "./runGate.tsx";
import { createRunGate } from "./thresholdRun.ts";
import { VariantsPage } from "./VariantsPage.tsx";
import type * as FileZoneModule from "../widgets/FileZone.tsx";
import type { FileZoneProps } from "../widgets/FileZone.tsx";
import type * as WordsModule from "./words.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** The number of chromosomes for which the line of the chromosomes so
    far throws, or null. */
const inject = vi.hoisted(() => ({
  throwAt: null as number | null,
  zoneThrows: false,
}));

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
    with the analyses it starts by itself; a file picked is kept under
    `pickedId`, and with none given the test picks no file. */
async function drawPage(pickedId?: string): Promise<{
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
  });
  store.subscribe(() => {
    queueMicrotask(() => {
      autoRuns.sync();
    });
  });
  const files = {
    addFile: (): string => {
      if (pickedId === undefined) throw new Error("the test picks no file");
      return pickedId;
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
          RunGateProvider,
          { value: createRunGate() },
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

describe("IN3 the page in two boxes and two tabs", () => {
  test("with no file: the two boxes with their words of no file, the zone in the box of the variants file, then the two tabs with the variants file's shown", async () => {
    await drawPage();
    const variantsBox = region("Variants file");
    const individualsBox = region("Individuals file");
    expect(variantsBox).not.toBeNull();
    expect(individualsBox).not.toBeNull();
    expect(variantsBox?.contains(buttonOf("Open variants file…"))).toBe(true);
    expect(individualsBox?.querySelector("p")?.textContent).toBe(
      "No individuals file: every individual is unclassified.",
    );
    const tabs = [...container.querySelectorAll('[role="tab"]')];
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Variants file",
      "Individuals file",
    ]);
    expect(tabs.map((tab) => tab.getAttribute("aria-selected"))).toEqual([
      "true",
      "false",
    ]);
    expect(
      container.querySelector('[role="tablist"]')?.getAttribute("aria-label"),
    ).toBe("The files");
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
      "No variants file open. Open one in the box Variants file.",
    );
    // The tab not shown is drawn, inert.
    const hidden = [...container.querySelectorAll("[inert]")];
    expect(hidden.map((element) => element.textContent)).toEqual([
      "No individuals file open.",
    ]);
  });

  test("with a variants file read, the box of the individuals file says how many individuals of it are unclassified", async () => {
    const { store } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    expect(region("Individuals file")?.querySelector("p")?.textContent).toBe(
      "No individuals file: all 2 individuals of first.nei are unclassified, and the analyses per population will take them as one population.",
    );
    expect(container.textContent).not.toContain("No variants file open.");
  });

  test("the zone is outside the boundary made for each file: its button is the same element after a throw in the box of one file and the opening of the next", async () => {
    const { store, requests } = await drawPage();
    await open(store, "a".repeat(32), "first.nei");
    const button = buttonOf("Open another variants file…");
    expect(button).not.toBeNull();
    inject.throwAt = 3;
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
    expect(region("Variants file")?.contains(button)).toBe(true);
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
): Promise<Store<JobResult, Blob>> {
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
    expect(headings).toEqual([
      "H1 Popnei",
      "H2 Variants file",
      "H3 Opening a variants file",
      "H2 Individuals file",
    ]);
  });

  test("after a throw in the zone, a turn of the tab draws the zone again, and a file can be opened from it", async () => {
    const store = await drawWithZoneThrowing("c".repeat(32));
    await act(async () => {
      tabOf("Individuals file").click();
      await Promise.resolve();
    });
    expect(tabOf("Individuals file").getAttribute("aria-selected")).toBe(
      "true",
    );
    const button = buttonOf("Open variants file…");
    expect(button).not.toBeNull();
    expect(region("Variants file")?.contains(button)).toBe(true);

    const input =
      region("Variants file")?.querySelector<HTMLInputElement>(
        'input[type="file"]',
      );
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
