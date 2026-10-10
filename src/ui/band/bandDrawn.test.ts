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

import { setVariantFilter } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import { summaryResult } from "../../core/testSupport.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { defectsRootOptions } from "../defects.ts";
import { createPageTab } from "../pageTab.ts";
import type { PageTabStore } from "../pageTab.ts";
import { PCA_TAB_CONTENT_ID } from "../pageTab.ts";
import { POPGEN2_CHAIN } from "../popgen2Store.ts";
import type { PageStore } from "../store.tsx";
import { createAnnouncer } from "../shell/status.ts";
import type { Announcer } from "../shell/status.ts";
import { PANEL_HEADING_ATTRIBUTE } from "../analyses/AnalysisPanel.tsx";
import { WARNINGS_HEADING_ATTRIBUTE } from "../analyses/Warnings.tsx";
import { Band } from "./Band.tsx";
import { flush, page, pcaDone, pcaResult } from "./testSupport.ts";
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
  document.getElementById(PCA_TAB_CONTENT_ID)?.remove();
});

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
    content.id = PCA_TAB_CONTENT_ID;
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
      content.id = PCA_TAB_CONTENT_ID;
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
    expect(container.textContent).toContain("The PCA starts again in a moment");

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
});
