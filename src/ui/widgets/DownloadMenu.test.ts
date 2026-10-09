// @vitest-environment jsdom
/**
 * The menu "Download…" and the downloads of the two tables, drawn by
 * React in jsdom (docs/specs/widgets/downloads.md, "How it is verified",
 * the widgets): a sorted table saves every row in the order shown, with
 * its values and not its texts; a table given a download and a row with
 * no values is a defect; a PNG refused is said under the button and in
 * the status region, and only for the last choice; any other failure of
 * a save reaches the bar of the errors; a menu that waits carries
 * `aria-disabled` and its reason, opens nothing, and closes when it
 * begins to wait. The flows of e2e/popgen2Downloads.spec.ts see
 * the menus in the browsers.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { PngError } from "../../charts/export.ts";
import { downloadText } from "../download.ts";
import { AnnouncerProvider } from "../shell/announcer.tsx";
import { ANNOUNCE_DELAY_MS, createAnnouncer } from "../shell/status.ts";
import type { Announcer } from "../shell/status.ts";
import {
  DownloadMenu,
  PNG_NOT_MADE_TEXT,
  PNG_TOO_LARGE_TEXT,
} from "./DownloadMenu.tsx";
import type { DownloadItem } from "./downloadItems.ts";
import { SortableTable } from "./SortableTable.tsx";
import type { SortableColumn, SortableRow } from "./SortableTable.tsx";
import { Table } from "./Table.tsx";
import type { TableColumn, TableRow } from "./Table.tsx";

vi.mock("../download.ts", () => ({
  downloadText: vi.fn(),
  downloadFile: vi.fn(),
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** A ResizeObserver that reports nothing: jsdom has none, and the frame
    of `Table` observes its size. */
class QuietObserver {
  observe(): void {
    // jsdom lays nothing out, so there is no size to report
  }
  unobserve(): void {
    // nothing observed
  }
  disconnect(): void {
    // nothing to disconnect
  }
}

let container: HTMLElement;
let root: Root;
let announcer: Announcer;
let thrown: unknown[];

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.stubGlobal("ResizeObserver", QuietObserver);
  vi.mocked(downloadText).mockClear();
  container = document.createElement("div");
  document.body.append(container);
  thrown = [];
  root = createRoot(container, {
    onUncaughtError: (error) => {
      thrown.push(error);
    },
  });
  announcer = createAnnouncer();
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  vi.unstubAllGlobals();
});

/** Draws `element` under StrictMode and the announcer. */
function draw(element: React.ReactElement): void {
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(AnnouncerProvider, { value: announcer }, element),
      ),
    );
  });
}

/** Draws `element`, and gives what drawing it threw, whether React
    threw it out of `act` or reported it as uncaught. */
function drawThrown(element: React.ReactElement): unknown {
  try {
    draw(element);
  } catch (error) {
    return error;
  }
  return thrown[0];
}

/** Presses the key `key` on the element that has the focus. */
function press(key: string): void {
  const target = document.activeElement;
  if (!(target instanceof HTMLElement)) throw new Error("no focus");
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  });
}

/** The button "Download…" named "Download `what`". */
function trigger(what: string): HTMLElement {
  const button = document.querySelector(
    `button[aria-label="Download ${what}"]`,
  );
  if (!(button instanceof HTMLElement)) throw new Error(`no button ${what}`);
  return button;
}

/** Puts the focus on `element` as the keyboard would: a key pressed
    first, so that React Aria takes the focus as the keyboard's. */
function focusByKeyboard(element: HTMLElement): void {
  act(() => {
    document.body.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Shift", bubbles: true }),
    );
    element.focus();
  });
}

/** The words of the items of the menu open, or null when none is. */
function menuItems(): string[] | null {
  const menu = document.querySelector('[role="menu"]');
  if (menu === null) return null;
  return [...menu.querySelectorAll('[role="menuitem"]')].map(
    (item) => item.textContent,
  );
}

/** Runs `during` with the rejections that nothing handles caught in
    place of Vitest, which would fail the run on them, and gives them:
    what the window's unhandledrejection, the bar of the errors of the
    page, would show. */
async function rejectionsOf(during: () => Promise<void>): Promise<unknown[]> {
  const listeners = process.listeners("unhandledRejection");
  process.removeAllListeners("unhandledRejection");
  const rejections: unknown[] = [];
  process.on("unhandledRejection", (reason) => {
    rejections.push(reason);
  });
  try {
    await during();
    // Node reports a rejection nothing handled after the microtasks.
    await new Promise((resolve) => setTimeout(resolve, 0));
  } finally {
    process.removeAllListeners("unhandledRejection");
    for (const listener of listeners) {
      process.on("unhandledRejection", listener);
    }
  }
  return rejections;
}

/** A promise and the functions that settle it, for a save that ends when
    the test says. */
function deferred(): {
  readonly promise: Promise<string>;
  readonly resolve: (name: string) => void;
  readonly reject: (error: Error) => void;
} {
  let resolve: (name: string) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<string>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
}

/** Lets the promises of a save settle, and the status region speak. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ANNOUNCE_DELAY_MS * 2));
  });
}

/** Opens the menu of `what` by the keyboard and chooses the item
    `label`, with the arrow keys and Enter, and lets the save end. */
async function choose(what: string, label: string): Promise<void> {
  focusByKeyboard(trigger(what));
  press("Enter");
  const items = menuItems();
  if (items === null) throw new Error("no menu opened");
  const index = items.indexOf(label);
  if (index < 0) throw new Error(`no item ${label}`);
  for (let step = 0; step < index; step += 1) press("ArrowDown");
  expect(document.activeElement?.textContent).toBe(label);
  press("Enter");
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ANNOUNCE_DELAY_MS * 2));
  });
}

/** The text handed to `downloadText` by the one call made, and the name
    of its file. */
function savedText(): { readonly name: string; readonly text: string } {
  const calls = vi.mocked(downloadText).mock.calls;
  expect(calls).toHaveLength(1);
  const [name, text, type] = calls[0] ?? [];
  expect(type).toBe("text/csv");
  return { name: name ?? "", text: text ?? "" };
}

type Id = "name" | "missing";

const SORTABLE_COLUMNS: readonly SortableColumn<Id>[] = [
  { id: "name", label: "Individual", isRowHeader: true, minWidth: 80 },
  { id: "missing", label: "Missing rate", isNumeric: true, minWidth: 80 },
];

/** Three rows sorted down by the missing rate, as the screen sorts
    them, their texts rounded and their values in full; in another order
    than by their names, "=b", "a", "c", so that a CSV in that order
    fails. */
const SORTED_ROWS: readonly SortableRow[] = [
  { id: "c", cells: ["c", "0.9000"], values: ["c", 0.9000000000000001] },
  { id: "a", cells: ["a", "0.5000"], values: ["a", 0.5] },
  { id: "=b", cells: ["=b", "—"], values: ["=b", null] },
];

describe("AP5 D2 the menu Download… and the downloads of the tables", () => {
  test("a sortable table sorted down saves every row in that order, with its values and not its texts", async () => {
    draw(
      createElement(SortableTable<Id>, {
        label: "The individuals",
        columns: SORTABLE_COLUMNS,
        rows: SORTED_ROWS,
        sort: { column: "missing", direction: "descending" },
        onSortChange: () => undefined,
        download: {
          what: "the table of panel_pops.csv",
          fileName: "panel_pops.table.csv",
        },
      }),
    );
    await choose("the table of panel_pops.csv", "Table as CSV");
    const saved = savedText();
    expect(saved.name).toBe("panel_pops.table.csv");
    expect(saved.text).toBe(
      "Individual,Missing rate\nc,0.9000000000000001\na,0.5\n'=b,\n",
    );
    expect(announcer.getState()).toBe("Saving panel_pops.table.csv.");
  });

  test("the menu of a table holds Table as CSV alone, and Escape closes it and gives the focus back", async () => {
    draw(
      createElement(SortableTable<Id>, {
        label: "The individuals",
        columns: SORTABLE_COLUMNS,
        rows: SORTED_ROWS,
        sort: null,
        onSortChange: () => undefined,
        download: {
          what: "the table of panel_pops.csv",
          fileName: "panel_pops.table.csv",
        },
      }),
    );
    const button = trigger("the table of panel_pops.csv");
    expect(button.textContent).toBe("Download…");
    focusByKeyboard(button);
    press("Enter");
    expect(menuItems()).toEqual(["Table as CSV"]);
    press("Escape");
    // React Aria gives the focus back in an animation frame.
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(menuItems()).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  test("a plain table saves its values, not the elements it shows", async () => {
    const columns: readonly TableColumn[] = [
      { id: "pair", label: "Populations", isRowHeader: true },
      { id: "distance", label: "Distance", isNumeric: true },
    ];
    const rows: readonly TableRow[] = [
      {
        id: "p1-p2",
        cells: [createElement("span", null, "p1 – p2"), "−0.0113"],
        values: ["p1 - p2", -0.011283],
      },
    ];
    draw(
      createElement(Table, {
        caption: "Distances",
        columns,
        rows,
        download: { what: "the distances", fileName: "panel.distances.csv" },
      }),
    );
    await choose("the distances", "Table as CSV");
    expect(savedText().text).toBe("Populations,Distance\np1 - p2,-0.011283\n");
  });

  test.each([
    ["given", false, true],
    ["taken away", true, false],
  ])(
    "a sortable table whose download is %s after the first draw keeps the element of its grid",
    (_change, before, after) => {
      const element = (withDownload: boolean): React.ReactElement =>
        createElement(SortableTable<Id>, {
          label: "The individuals",
          columns: SORTABLE_COLUMNS,
          rows: SORTED_ROWS,
          sort: null,
          onSortChange: () => undefined,
          ...(withDownload && {
            download: { what: "the table", fileName: "x.table.csv" },
          }),
        });
      draw(element(before));
      const grid = container.querySelector('[role="grid"]');
      expect(grid).not.toBeNull();
      draw(element(after));
      expect(container.querySelector('[role="grid"]')).toBe(grid);
      expect(container.querySelector("button") !== null).toBe(after);
    },
  );

  test("a sortable table given a download and a row with no values is a defect", () => {
    const error = drawThrown(
      createElement(SortableTable<Id>, {
        label: "The individuals",
        columns: SORTABLE_COLUMNS,
        rows: [...SORTED_ROWS, { id: "d", cells: ["d", "0.1000"] }],
        sort: null,
        onSortChange: () => undefined,
        download: { what: "the table", fileName: "x.table.csv" },
      }),
    );
    expect(String(error)).toMatch(/popnei_web defect/u);
  });

  test("a plain table given a download and a row with no values is a defect", () => {
    const error = drawThrown(
      createElement(Table, {
        caption: "Distances",
        columns: [{ id: "pair", label: "Populations", isRowHeader: true }],
        rows: [{ id: "p1", cells: ["p1"] }],
        download: { what: "the distances", fileName: "x.csv" },
      }),
    );
    expect(String(error)).toMatch(/popnei_web defect/u);
  });

  test("a table with no download, as popgen.html draws it, has no button Download…", () => {
    draw(
      createElement(Table, {
        caption: "Distances",
        columns: [{ id: "pair", label: "Populations", isRowHeader: true }],
        rows: [{ id: "p1", cells: ["p1"] }],
      }),
    );
    expect(container.querySelector("button")).toBeNull();
    expect(thrown).toEqual([]);
  });

  test("a PNG refused as too large is said under the button and in the status region, until the next choice", async () => {
    let refusal: PngError | null = new PngError("tooLarge");
    const items: readonly DownloadItem[] = [
      { label: "Image as SVG", save: () => Promise.resolve("panel.pca.svg") },
      {
        label: "Image as PNG",
        save: () =>
          refusal === null
            ? Promise.resolve("panel.pca.png")
            : Promise.reject(refusal),
      },
    ];
    draw(
      createElement(DownloadMenu, {
        what: "the plot of the PCA",
        items,
        waiting: null,
      }),
    );
    await choose("the plot of the PCA", "Image as PNG");
    expect(container.textContent).toContain(PNG_TOO_LARGE_TEXT);
    expect(announcer.getState()).toBe(PNG_TOO_LARGE_TEXT);
    refusal = null;
    await choose("the plot of the PCA", "Image as SVG");
    expect(container.textContent).not.toContain(PNG_TOO_LARGE_TEXT);
    expect(announcer.getState()).toBe("Saving panel.pca.svg.");
  });

  test("a PNG the browser could not make is said in its own words", async () => {
    draw(
      createElement(DownloadMenu, {
        what: "the plot of the PCA",
        items: [
          {
            label: "Image as PNG",
            save: () => Promise.reject(new PngError("notMade")),
          },
        ],
        waiting: null,
      }),
    );
    await choose("the plot of the PCA", "Image as PNG");
    expect(container.textContent).toContain(PNG_NOT_MADE_TEXT);
    expect(announcer.getState()).toBe(PNG_NOT_MADE_TEXT);
  });

  test("a menu that waits carries aria-disabled and its reason, shows its tooltip on the focus, and opens nothing on Enter", () => {
    const reason = "Download once panel.nei is read to the end.";
    let saves = 0;
    draw(
      createElement(DownloadMenu, {
        what: "the plot of the MAF",
        items: [
          {
            label: "Image as SVG",
            save: () => {
              saves += 1;
              return Promise.resolve("x.svg");
            },
          },
        ],
        waiting: reason,
      }),
    );
    const button = trigger("the plot of the MAF");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button.hasAttribute("disabled")).toBe(false);
    const describedBy = button.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)?.textContent).toBe(reason);
    focusByKeyboard(button);
    expect(document.activeElement).toBe(button);
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe(
      reason,
    );
    press("Enter");
    press(" ");
    press("ArrowDown");
    expect(menuItems()).toBeNull();
    act(() => {
      button.click();
    });
    expect(menuItems()).toBeNull();
    expect(saves).toBe(0);
  });

  test("a save rejected with an error that is not a PNG refused reaches the bar of the errors, with no words under the button", async () => {
    const defect = new Error("x");
    const rejections = await rejectionsOf(async () => {
      draw(
        createElement(DownloadMenu, {
          what: "the plot of the PCA",
          items: [
            { label: "Image as SVG", save: () => Promise.reject(defect) },
          ],
          waiting: null,
        }),
      );
      await choose("the plot of the PCA", "Image as SVG");
    });
    expect(rejections).toEqual([defect]);
    expect(menuItems()).toBeNull();
    expect(container.querySelector("p")).toBeNull();
  });

  test("a save that throws before its promise closes the menu and reaches the bar of the errors as a rejection", async () => {
    const defect = new Error("popnei_web defect: no plot");
    const rejections = await rejectionsOf(async () => {
      draw(
        createElement(DownloadMenu, {
          what: "the plot of the PCA",
          items: [
            {
              label: "Image as SVG",
              save: () => {
                throw defect;
              },
            },
          ],
          waiting: null,
        }),
      );
      await choose("the plot of the PCA", "Image as SVG");
    });
    expect(rejections).toEqual([defect]);
    expect(menuItems()).toBeNull();
  });

  test.each([" ", "ArrowDown"])("the key %j opens the menu", (key) => {
    draw(
      createElement(DownloadMenu, {
        what: "the plot of the PCA",
        items: [
          { label: "Image as SVG", save: () => Promise.resolve("x.svg") },
        ],
        waiting: null,
      }),
    );
    focusByKeyboard(trigger("the plot of the PCA"));
    press(key);
    expect(menuItems()).toEqual(["Image as SVG"]);
  });

  test("a menu open when it begins to wait closes, and stays closed when the wait ends", () => {
    const element = (waiting: string | null): React.ReactElement =>
      createElement(DownloadMenu, {
        what: "the plot of the MAF",
        items: [
          { label: "Image as SVG", save: () => Promise.resolve("x.svg") },
        ],
        waiting,
      });
    draw(element(null));
    focusByKeyboard(trigger("the plot of the MAF"));
    press("Enter");
    expect(menuItems()).toEqual(["Image as SVG"]);
    draw(element("Download once panel.nei is read to the end."));
    expect(menuItems()).toBeNull();
    draw(element(null));
    expect(menuItems()).toBeNull();
  });

  test("a PNG refused after a later choice says nothing of it: the words are those of the last choice", async () => {
    const png = deferred();
    draw(
      createElement(DownloadMenu, {
        what: "the plot of the PCA",
        items: [
          {
            label: "Image as SVG",
            save: () => Promise.resolve("panel.pca.svg"),
          },
          { label: "Image as PNG", save: () => png.promise },
        ],
        waiting: null,
      }),
    );
    await choose("the plot of the PCA", "Image as PNG");
    await choose("the plot of the PCA", "Image as SVG");
    expect(announcer.getState()).toBe("Saving panel.pca.svg.");
    png.reject(new PngError("tooLarge"));
    await settle();
    expect(container.textContent).not.toContain(PNG_TOO_LARGE_TEXT);
    expect(announcer.getState()).toBe("Saving panel.pca.svg.");
  });

  test("the words of a PNG refused go when the menu begins to wait, and a refusal that ends during the wait says nothing", async () => {
    const late = deferred();
    let refusals = 0;
    const element = (waiting: string | null): React.ReactElement =>
      createElement(DownloadMenu, {
        what: "the plot of the PCA",
        items: [
          {
            label: "Image as PNG",
            save: () => {
              refusals += 1;
              return refusals === 1
                ? Promise.reject(new PngError("tooLarge"))
                : late.promise;
            },
          },
        ],
        waiting,
      });
    draw(element(null));
    await choose("the plot of the PCA", "Image as PNG");
    expect(container.textContent).toContain(PNG_TOO_LARGE_TEXT);
    draw(element("Download once panel.nei is read to the end."));
    expect(container.textContent).not.toContain(PNG_TOO_LARGE_TEXT);
    draw(element(null));
    await choose("the plot of the PCA", "Image as PNG");
    draw(element("Download once panel.nei is read to the end."));
    late.reject(new PngError("notMade"));
    await settle();
    expect(container.textContent).not.toContain(PNG_NOT_MADE_TEXT);
  });

  test("a menu that stops waiting loses aria-disabled and its description, and opens", () => {
    const element = (waiting: string | null): React.ReactElement =>
      createElement(DownloadMenu, {
        what: "the plot of the MAF",
        items: [
          { label: "Image as SVG", save: () => Promise.resolve("x.svg") },
        ],
        waiting,
      });
    draw(element("Download once panel.nei is read to the end."));
    draw(element(null));
    const button = trigger("the plot of the MAF");
    expect(button.hasAttribute("aria-disabled")).toBe(false);
    expect(button.hasAttribute("aria-describedby")).toBe(false);
    focusByKeyboard(button);
    press("Enter");
    expect(menuItems()).toEqual(["Image as SVG"]);
  });
});
