// @vitest-environment jsdom
/**
 * The band of popgen2.html drawn by React in jsdom, in <StrictMode> as
 * the development server draws it, over the real store of the page with
 * a fake worker (docs/specs/steps/popgen2-band.md, "How it is checked",
 * In jsdom): what its Stops send, its link, the focus after its Stop and
 * its Close, its live regions, and its Details.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { MockInstance } from "vitest";

import { setVariantFilter } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { defectsRootOptions } from "../defects.ts";
import { createPageTab } from "../pageTab.ts";
import type { PageTabStore } from "../pageTab.ts";
import { tabContentId } from "../pageTab.ts";
import { POPGEN2_CHAIN } from "../popgen2Store.ts";
import type { PageStore } from "../store.tsx";
import { createAnnouncer } from "../shell/status.ts";
import type { Announcer } from "../shell/status.ts";
import { PANEL_HEADING_ATTRIBUTE } from "../analyses/AnalysisPanel.tsx";
import { WARNINGS_HEADING_ATTRIBUTE } from "../analyses/Warnings.tsx";
import { DIALOG_MARK } from "../widgets/dialogMark.ts";
import { Band } from "./Band.tsx";
import { endLast, flush, page, pcaDone, pcaResult } from "./testSupport.ts";
import type { TestPage } from "./testSupport.ts";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/** The result of the one pass over panel.nei. */
const SUMMARY = summaryResult(["1"], [1200], ["s000", "s001"]);

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  // jsdom has no ResizeObserver, which the band asks for its height.
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
  // jsdom has no matchMedia, through which the band reads whether the
  // window is under 30 rem wide.
  narrowNow = false;
  narrowListeners.clear();
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      media: query,
      get matches() {
        return narrowNow;
      },
      addEventListener: (_type: string, listener: () => void) => {
        narrowListeners.add(listener);
      },
      removeEventListener: (_type: string, listener: () => void) => {
        narrowListeners.delete(listener);
      },
    }) as unknown as MediaQueryList;
  container = document.createElement("div");
  container.id = "defects";
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
  document.getElementById(tabContentId("pca"))?.remove();
  document.getElementById(tabContentId("populations"))?.remove();
});

/** Whether the window of the test is under 30 rem wide, which the
    band reads through `window.matchMedia`; wide first. */
let narrowNow = false;
/** The listeners of the band to a change of that width. */
const narrowListeners = new Set<() => void>();

/** Narrows the window of the test under 30 rem, or widens it, `narrow`,
    and tells the band, as a browser tells it of a resize. */
async function setNarrow(narrow: boolean): Promise<void> {
  narrowNow = narrow;
  await act(async () => {
    for (const listener of [...narrowListeners]) listener();
    await Promise.resolve();
  });
}

/** Draws the band over `testPage`, with a tab shown of its own and an
    announcer, and gives them; with the store `store` in place of the
    page's when given. */
async function drawBand(
  testPage: TestPage,
  store: PageStore = testPage.store,
): Promise<{
  readonly pageTab: PageTabStore;
  readonly announcer: Announcer;
}> {
  const pageTab = createPageTab();
  const announcer = createAnnouncer();
  await act(async () => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(Band, {
          defects: testPage.defects,
          page: {
            store,
            autoRuns: testPage.auto,
            pageTab,
            announcer,
          },
          appVersion: "0.1.0",
        }),
      ),
    );
    await Promise.resolve();
  });
  return { pageTab, announcer };
}

/** Lets the page's changes settle and React draw them. */
async function settled(): Promise<void> {
  await act(async () => {
    await flush();
  });
}

/** The button of the band named `name`. */
function button(name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (b) => (b.getAttribute("aria-label") ?? b.textContent) === name,
  );
  if (found === undefined) throw new Error(`no button ${name}`);
  return found;
}

/** Presses `element` as a user does, a click after its focus. */
async function press(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.focus();
    element.click();
    await flush();
  });
}

/** The heading "Popnei" of the band. */
function heading(): Element | null {
  return container.querySelector("h1");
}

describe("NU5 D2 the band drawn", () => {
  test("the Stop of the one pass calls autoRuns.stop with the page's group, is said as the box's Stop, and gives the focus to the heading Popnei", async () => {
    const testPage = page(SUMMARY);
    const stop = vi.spyOn(testPage.auto, "stop");
    const { announcer } = await drawBand(testPage);
    const announce = vi.spyOn(announcer, "announce");
    await settled();
    expect(container.textContent).toContain("Statistics of panel.nei");

    await press(button("Stop the statistics of panel.nei"));

    expect(stop).toHaveBeenCalledWith(POPGEN2_CHAIN);
    expect(announce).toHaveBeenCalledWith(
      "The count of the variants and the statistics were stopped. Start again calculates them from the start.",
    );
    expect(document.activeElement).toBe(heading());
    expect(heading()?.textContent).toBe("Popnei");
  });

  test("the Stop of the PCA running calls autoRuns.pause with the PCA, and the focus goes to the heading", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    testPage.auto.run("pca");
    const pause = vi.spyOn(testPage.auto, "pause");
    await drawBand(testPage);
    await settled();
    expect(container.textContent).toContain("PCA running · 0:00");

    await press(button("Stop the PCA"));

    expect(pause).toHaveBeenCalledWith("pca");
    expect(container.textContent).toContain("Stopping the PCA…");
    expect(document.activeElement).toBe(heading());
  });

  test("after its Stop of the PCA, the PCoA chosen leaves the line Stopping the PCA, the method of the run stopped", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    testPage.auto.run("pca");
    await drawBand(testPage);
    await settled();

    await press(button("Stop the PCA"));
    expect(container.textContent).toContain("Stopping the PCA…");
    await act(async () => {
      testPage.setPca({ method: "pcoa" });
      await flush();
    });

    expect(testPage.store.getState().stoppedAwaitingWorker).toBe("pca");
    expect(container.textContent).toContain("Stopping the PCA…");
  });

  test("while the PCA is live and nothing runs nor is about to start, the band shows Popnei alone", async () => {
    const testPage = await pcaDone(SUMMARY, "pca", 548);
    await drawBand(testPage);

    expect(container.textContent).toBe("Popnei");
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  test("the link to the PCA's warnings shows the PCA tab and gives the focus to the heading of its warnings", async () => {
    const testPage = await pcaDone(SUMMARY, "pca", 1);
    const { pageTab } = await drawBand(testPage);
    // What the PCA tab of the application's root holds.
    const content = document.createElement("div");
    content.id = tabContentId("pca");
    const warnings = document.createElement("h3");
    warnings.tabIndex = -1;
    warnings.setAttribute(WARNINGS_HEADING_ATTRIBUTE, "");
    warnings.textContent = "1 warning";
    content.append(warnings);
    document.body.append(content);
    const link = [...container.querySelectorAll('[role="link"], a')].find(
      (element) => element.textContent.includes("PCA: 1 warning"),
    );
    expect(link).toBeInstanceOf(HTMLElement);

    await press(link as HTMLElement);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(pageTab.shown()).toBe("pca");
    expect(document.activeElement).toBe(warnings);
    // The link goes while the PCA tab is shown.
    expect(container.textContent).not.toContain("PCA: 1 warning");
  });

  test("a control of the band with the focus that goes by itself gives the focus to the heading: the Stop of the one pass when it ends, the Stop of the PCA when its run ends", async () => {
    const testPage = page(SUMMARY);
    await drawBand(testPage);
    await settled();
    act(() => {
      button("Stop the statistics of panel.nei").focus();
    });
    await act(async () => {
      await testPage.endPass();
    });
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(document.activeElement).toBe(heading());

    testPage.auto.run("pca");
    await settled();
    act(() => {
      button("Stop the PCA").focus();
    });
    await act(async () => {
      const last = testPage.lastPca();
      last.end({ kind: "done", key: last.key, result: pcaResult("pca", 548) });
      await flush();
    });
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(document.activeElement).toBe(heading());
  });

  test("the focus given away from the band stays where it went when the band's control goes", async () => {
    const testPage = page(SUMMARY);
    await drawBand(testPage);
    await settled();
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    act(() => {
      button("Stop the statistics of panel.nei").focus();
      elsewhere.focus();
    });
    await act(async () => {
      await testPage.endPass();
    });
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  test("the link to an error of the PCA shows the PCA tab and gives the focus to its heading, or to Popnei when the tab has none", async () => {
    for (const withHeading of [true, false]) {
      const testPage = page(SUMMARY);
      await testPage.endPass();
      testPage.auto.run("pca");
      await flush();
      testPage.lastPca().end({
        kind: "failed",
        error: { kind: "popnei", message: "popnei refused it." },
      });
      await flush();
      const { pageTab } = await drawBand(testPage);
      const content = document.createElement("div");
      content.id = tabContentId("pca");
      const tabHeading = document.createElement("h2");
      tabHeading.tabIndex = -1;
      tabHeading.setAttribute(PANEL_HEADING_ATTRIBUTE, "");
      tabHeading.textContent = "PCA";
      if (withHeading) content.append(tabHeading);
      document.body.append(content);
      const link = [...container.querySelectorAll('[role="link"], a')].find(
        (element) => element.textContent.includes("could not be calculated"),
      );
      expect(link).toBeInstanceOf(HTMLElement);

      await press(link as HTMLElement);
      await act(async () => {
        await new Promise((resolve) => requestAnimationFrame(resolve));
      });

      expect(pageTab.shown()).toBe("pca");
      expect(document.activeElement).toBe(withHeading ? tabHeading : heading());
      content.remove();
    }
  });

  test("the line carries no live role, and the alert and the band's own status region are live announcers, from the first drawing", async () => {
    const testPage = page(SUMMARY);
    await drawBand(testPage);
    await settled();

    const live = [...container.querySelectorAll("[role], [aria-live]")].map(
      (element) => [
        element.getAttribute("role"),
        element.getAttribute("data-live-announcer"),
      ],
    );
    expect(live).toEqual([
      ["alert", "true"],
      ["status", "true"],
    ]);
    expect(container.querySelector("header")?.getAttribute("aria-label")).toBe(
      "What the page is doing",
    );
  });

  test("an error: its words in the alert, Details shows and hides the count of the errors after it with aria-expanded, and Close empties it and gives the focus to the heading", async () => {
    const testPage = page(SUMMARY);
    const dismiss = vi.spyOn(testPage.defects, "dismiss");
    await drawBand(testPage);
    await act(async () => {
      testPage.defects.report(new Error("test"), "event", null);
      testPage.defects.report(new Error("second"), "event", null);
      await Promise.resolve();
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toBe(
      "The application met an error of its own: test. Reload the page, and open your files again.",
    );
    const details = button("Details");
    expect(details.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("1 more error followed it.");

    await press(details);
    expect(button("Details").getAttribute("aria-expanded")).toBe("true");
    expect(container.textContent).toContain("1 more error followed it.");
    expect(button("Copy the details")).toBeDefined();

    await press(button("Details"));
    expect(button("Details").getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("1 more error followed it.");

    await press(button("Close"));
    expect(dismiss).toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe("");
    expect(document.activeElement).toBe(heading());
  });

  test("a threshold changed with the PCA live: the line about to start with Stop recalculating, which calls autoRuns.pause and gives the focus to the heading, the line then Popnei alone", async () => {
    const testPage = await pcaDone(SUMMARY, "pca", 548);
    const pause = vi.spyOn(testPage.auto, "pause");
    await drawBand(testPage);

    await act(async () => {
      testPage.store.apply("the missing data filter changed", (p) =>
        setVariantFilter(p, {
          kind: "missing_data",
          maxAllowedMissingRate: 0.05,
        }),
      );
      await flush();
    });
    expect(container.textContent).toContain("The PCA starts in a moment");
    // Alone, it fits beside the short form under 30 rem too.
    await setNarrow(true);
    expect(container.textContent).toContain("PCA soon");
    expect(buttonNames()).toEqual(["Stop recalculating the PCA"]);

    await press(button("Stop recalculating the PCA"));

    expect(pause).toHaveBeenCalledWith("pca");
    expect(container.textContent).toBe("Popnei");
    expect(document.activeElement).toBe(heading());
  });

  test("a defect while the band works out its line empties that line alone: the heading stays, and the defect, and an error after it, are in the line of an error", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    // The root of #defects as the entry makes it, which gives what a
    // boundary caught to the log of the errors.
    act(() => {
      root.unmount();
    });
    root = createRoot(container, defectsRootOptions(testPage.defects));
    const logged = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    // The store as the band reads it, saying that a Stop waits for an
    // analysis the page does not run, the same object until it changes.
    const real = testPage.store;
    let read: AppState<JobResult, Blob> | null = null;
    let given: AppState<JobResult, Blob> | null = null;
    const store: PageStore = {
      ...real,
      getState: () => {
        const now = real.getState();
        if (now !== read || given === null) {
          read = now;
          given = { ...now, stoppedAwaitingWorker: "notOnThisPage" };
        }
        return given;
      },
    };

    await drawBand(testPage, store);
    await settled();

    expect(heading()?.textContent).toBe("Popnei");
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(
      /^The application met an error of its own: popnei_web defect: .*notOnThisPage/u,
    );
    await act(async () => {
      testPage.defects.report(new Error("later"), "event", null);
      await Promise.resolve();
    });
    await press(button("Details"));
    expect(container.textContent).toContain("1 more error followed it.");
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  test("a copy of the details that settles after Close says nothing, and shows no box at the next error", async () => {
    const testPage = page(SUMMARY);
    let fail = (): void => undefined;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          new Promise<void>((_resolve, reject) => {
            fail = () => {
              reject(new Error("no clipboard"));
            };
          }),
      },
    });
    await drawBand(testPage);
    await act(async () => {
      testPage.defects.report(new Error("test"), "event", null);
      await Promise.resolve();
    });
    await press(button("Details"));
    await press(button("Copy the details"));
    await press(button("Close"));

    await act(async () => {
      fail();
      await flush();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    await act(async () => {
      testPage.defects.report(new Error("next"), "event", null);
      await Promise.resolve();
    });
    await press(button("Details"));

    expect(container.querySelector('[role="status"]')?.textContent).toBe("");
    expect(container.querySelector("textarea")).toBeNull();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  test("Stopping goes 10 s after the band first saw it when the worker never says it is ready", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "clearTimeout", "performance"],
    });
    try {
      const testPage = page(SUMMARY);
      await testPage.endPass();
      testPage.auto.run("pca");
      await drawBand(testPage);
      await settled();
      await press(button("Stop the PCA"));
      expect(container.textContent).toContain("Stopping the PCA…");

      await act(async () => {
        vi.advanceTimersByTime(9_000);
        await flush();
      });
      expect(container.textContent).toContain("Stopping the PCA…");
      await act(async () => {
        vi.advanceTimersByTime(1_050);
        await flush();
      });

      expect(testPage.store.getState().stoppedAwaitingWorker).toBe("pca");
      expect(container.textContent).toBe("Popnei");
    } finally {
      vi.useRealTimers();
    }
  });

  test("Close empties the status region and hides the details and their box, so that the next error shows them closed", async () => {
    const testPage = page(SUMMARY);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error("no clipboard")) },
    });
    await drawBand(testPage);
    await act(async () => {
      testPage.defects.report(new Error("test"), "event", null);
      await Promise.resolve();
    });
    await press(button("Details"));
    await press(button("Copy the details"));
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    expect(container.querySelector('[role="status"]')?.textContent).toBe(
      "The details could not be copied. Select them in the box below and copy them.",
    );
    expect(container.querySelector("textarea")).not.toBeNull();

    await press(button("Close"));
    expect(container.querySelector('[role="status"]')?.textContent).toBe("");
    await act(async () => {
      testPage.defects.report(new Error("next"), "event", null);
      await Promise.resolve();
    });

    expect(button("Details").getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).not.toContain("Copy the details");
    await press(button("Details"));
    expect(container.querySelector("textarea")).toBeNull();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  test("an error that comes with the band above the window scrolls the page, at once, to the band's top; a second error, Details and Close do not; an error after Close does again", async () => {
    const testPage = page(SUMMARY);
    await drawBand(testPage);
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {
      // Nothing is laid out in jsdom.
    });
    const scrollY = vi.spyOn(window, "scrollY", "get").mockReturnValue(800);
    const header = container.querySelector("header");
    if (header === null) throw new Error("no band");
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: -800, width: 1280, height: 120 }),
    );
    try {
      await act(async () => {
        testPage.defects.report(new Error("test"), "event", null);
        await Promise.resolve();
      });
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });

      await act(async () => {
        testPage.defects.report(new Error("second"), "event", null);
        await Promise.resolve();
      });
      await press(button("Details"));
      await press(button("Details"));
      await press(button("Close"));
      expect(scrollTo).toHaveBeenCalledTimes(1);

      await act(async () => {
        testPage.defects.report(new Error("next"), "event", null);
        await Promise.resolve();
      });
      expect(scrollTo).toHaveBeenCalledTimes(2);
    } finally {
      scrollTo.mockRestore();
      scrollY.mockRestore();
    }
  });

  test("an error that comes with the band's top in the window does not scroll the page", async () => {
    const testPage = page(SUMMARY);
    await drawBand(testPage);
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {
      // Nothing is laid out in jsdom.
    });
    try {
      await act(async () => {
        testPage.defects.report(new Error("test"), "event", null);
        await Promise.resolve();
      });
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        "test",
      );
      expect(scrollTo).not.toHaveBeenCalled();
    } finally {
      scrollTo.mockRestore();
    }
  });

  /** The band drawn above the window, 800 px scrolled: scrollTo asked
      for nothing, and the band's top at -800. Gives the spy of scrollTo
      and the function that puts the window back. */
  function bandAbove(): {
    readonly scrollTo: MockInstance<typeof window.scrollTo>;
    readonly restore: () => void;
  } {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {
      // Nothing is laid out in jsdom.
    });
    const scrollY = vi.spyOn(window, "scrollY", "get").mockReturnValue(800);
    const header = container.querySelector("header");
    if (header === null) throw new Error("no band");
    vi.spyOn(header, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: -800, width: 1280, height: 120 }),
    );
    return {
      scrollTo,
      restore: () => {
        scrollTo.mockRestore();
        scrollY.mockRestore();
      },
    };
  }

  /** A control of the page with the focus, at `top` of the window once
      the page is brought to the band. */
  function focusedControl(top: number): HTMLButtonElement {
    const control = document.createElement("button");
    document.body.append(control);
    vi.spyOn(control, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect({ x: 0, y: top, width: 100, height: 30 }),
    );
    control.focus();
    return control;
  }

  test("an error that brings the band into view gives the focus to the heading Popnei when the control that had it is no longer whole in the window, and leaves it on a control still in the window", async () => {
    for (const [top, toHeading] of [
      [window.innerHeight + 100, true],
      [window.innerHeight - 20, true],
      [200, false],
    ] as const) {
      const testPage = page(SUMMARY);
      await drawBand(testPage);
      const { restore } = bandAbove();
      const control = focusedControl(top);
      try {
        await act(async () => {
          testPage.defects.report(new Error("test"), "event", null);
          await Promise.resolve();
        });
        expect(document.activeElement).toBe(toHeading ? heading() : control);
      } finally {
        restore();
        control.remove();
        await act(async () => {
          testPage.defects.dismiss();
          await Promise.resolve();
        });
      }
    }
  });

  test("an error that comes while a dialog is open neither scrolls the page nor moves the focus; once the dialog has gone and React Aria has given the focus back, the band is brought into view and the focus, out of the window, goes to the heading", async () => {
    const testPage = page(SUMMARY);
    await drawBand(testPage);
    const { scrollTo, restore } = bandAbove();
    const dialog = document.createElement("div");
    dialog.setAttribute(DIALOG_MARK, "");
    const inDialog = document.createElement("button");
    dialog.append(inDialog);
    document.body.append(dialog);
    inDialog.focus();
    const control = focusedControl(window.innerHeight + 900);
    inDialog.focus();
    try {
      await act(async () => {
        testPage.defects.report(new Error("test"), "event", null);
        await Promise.resolve();
      });
      expect(scrollTo).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(inDialog);

      // The dialog goes, and React Aria gives the focus back to the
      // control that opened it, a frame later.
      await act(async () => {
        dialog.remove();
        requestAnimationFrame(() => {
          control.focus();
        });
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(heading());
    } finally {
      restore();
      control.remove();
      dialog.remove();
    }
  });
});

/** The names of the buttons of the band, as a screen reader reads them. */
function buttonNames(): readonly string[] {
  return [...container.querySelectorAll("button")].map(
    (b) => b.getAttribute("aria-label") ?? b.textContent,
  );
}

/** The page with the one pass done, the PCA run by Run and running, and
    the diversity's Run pressed, waiting after it. */
async function pcaThenDiversity(): Promise<TestPage> {
  const testPage = page(SUMMARY);
  await testPage.endPass();
  expect(testPage.auto.run("pca")).toBe("started");
  await flush();
  expect(testPage.auto.run("diversity")).toBe("waiting");
  return testPage;
}

describe("PT4 D2 the band drawn with the PCA and the diversity", () => {
  test("Stop all, beside the Stop of the PCA running with the diversity waiting, calls autoRuns.pauseAll and gives the focus to the heading Popnei", async () => {
    const testPage = await pcaThenDiversity();
    const pauseAll = vi.spyOn(testPage.auto, "pauseAll");
    await drawBand(testPage);
    await settled();
    expect(container.textContent).toContain(
      "PCA running · 0:00 · then the diversity",
    );
    expect(buttonNames()).toEqual([
      "Stop the PCA",
      "Stop all: the PCA and the diversity",
    ]);
    expect(button("Stop all: the PCA and the diversity").textContent).toBe(
      "Stop all",
    );

    await press(button("Stop all: the PCA and the diversity"));

    expect(pauseAll).toHaveBeenCalledTimes(1);
    expect(testPage.auto.isLive("pca")).toBe(false);
    expect(testPage.auto.isLive("diversity")).toBe(false);
    expect(buttonNames()).toEqual([]);
    expect(document.activeElement).toBe(heading());
  });

  test("the Stop of the diversity running calls autoRuns.pause with the diversity, the line says Stopping the diversity, and the focus goes to the heading", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    testPage.auto.run("diversity");
    const pause = vi.spyOn(testPage.auto, "pause");
    await drawBand(testPage);
    await settled();
    expect(container.textContent).toContain("Diversity running · 0:00");
    expect(buttonNames()).toEqual(["Stop the diversity"]);

    await press(button("Stop the diversity"));

    expect(pause).toHaveBeenCalledWith("diversity");
    expect(container.textContent).toContain("Stopping the diversity…");
    expect(document.activeElement).toBe(heading());
  });

  test("no Stop of an analysis whose tab is shown, Stop all kept: the PCA tab with the PCA running, the Populations tab with the diversity running", async () => {
    const testPage = await pcaThenDiversity();
    const { pageTab } = await drawBand(testPage);
    await settled();
    act(() => {
      pageTab.show("pca");
    });
    expect(buttonNames()).toEqual(["Stop all: the PCA and the diversity"]);
    act(() => {
      pageTab.show("populations");
    });
    expect(buttonNames()).toEqual([
      "Stop the PCA",
      "Stop all: the PCA and the diversity",
    ]);

    // The PCA ends: the diversity runs, the Populations tab shown, once
    // the quiet second of the options the test page typed has run out.
    await act(async () => {
      await endLast(testPage, "pca");
    });
    await vi.waitFor(
      async () => {
        await settled();
        expect(container.textContent).toContain("Diversity running");
      },
      { timeout: 3000, interval: 100 },
    );
    expect(buttonNames()).toEqual(["Stop all: the PCA and the diversity"]);
  });

  test("the diversity about to start alone beside the PCA live: its Stop recalculating, drawn for 30 rem and wider only, calls autoRuns.pause with the diversity, and Stop all is beside it", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    try {
      const testPage = page(SUMMARY);
      await testPage.endPass();
      testPage.auto.run("pca");
      await flush();
      await endLast(testPage, "pca");
      testPage.auto.run("diversity");
      await flush();
      await endLast(testPage, "diversity");
      const pause = vi.spyOn(testPage.auto, "pause");
      await drawBand(testPage);
      await act(async () => {
        testPage.setDiversity({ minNumIndividuals: 1 });
        await flush();
      });
      expect(container.textContent).toContain(
        "The diversity starts in a moment",
      );
      expect(buttonNames()).toEqual([
        "Stop recalculating the diversity",
        "Stop all: the PCA and the diversity",
      ]);
      // Under 30 rem the line holds Stop all alone: its Stop
      // recalculating is not drawn, and the focus it had goes to the
      // heading (the review of package 4, 12 October 2026).
      button("Stop recalculating the diversity").focus();
      await setNarrow(true);
      expect(buttonNames()).toEqual(["Stop all: the PCA and the diversity"]);
      expect(document.activeElement).toBe(heading());
      await setNarrow(false);

      await press(button("Stop recalculating the diversity"));

      expect(pause).toHaveBeenCalledWith("diversity");
      expect(buttonNames()).toEqual([]);
      expect(document.activeElement).toBe(heading());
    } finally {
      vi.useRealTimers();
    }
  });

  test("the link to the diversity's warnings shows the Populations tab and gives the focus to the heading of its warnings", async () => {
    const testPage = page(SUMMARY);
    await testPage.endPass();
    testPage.auto.run("diversity");
    await flush();
    // The diversity of the one population has 2 warnings, of its
    // private alleles and of its draw.
    await endLast(testPage, "diversity");
    const { pageTab } = await drawBand(testPage);
    const content = document.createElement("div");
    content.id = tabContentId("populations");
    const warnings = document.createElement("h3");
    warnings.tabIndex = -1;
    warnings.setAttribute(WARNINGS_HEADING_ATTRIBUTE, "");
    warnings.textContent = "2 warnings";
    content.append(warnings);
    document.body.append(content);
    const link = [...container.querySelectorAll('[role="link"], a')].find(
      (element) =>
        element.textContent.includes(
          "Diversity: 2 warnings, in the Populations tab",
        ),
    );
    expect(link).toBeInstanceOf(HTMLElement);

    await press(link as HTMLElement);
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(pageTab.shown()).toBe("populations");
    expect(document.activeElement).toBe(warnings);
    expect(container.textContent).not.toContain("Diversity: 2 warnings");
  });
});
