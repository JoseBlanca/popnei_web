// @vitest-environment jsdom
/**
 * The code of the Populations tab of popgen2.html, downloaded apart from
 * the page's (docs/specs/steps/popgen2-populations.md, "The result", its
 * code): asked for the first time the tab is shown, and not before;
 * "Loading the Populations tab…" until it arrives; after a download
 * that failed, its words with "Try again", said by the status region,
 * and Try again asks again, with the focus on the place and then on the
 * heading the tab draws. The download is a fake that the test settles,
 * and the tab it gives a heading alone.
 */
import { StrictMode, act, createElement } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { Store } from "../../../core/store.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import type { CodeDownload, CodeState } from "../../codeDownload.ts";
import { AnnouncerProvider } from "../../shell/announcer.tsx";
import type { Announcer } from "../../shell/status.ts";
import { StoreProvider } from "../../store.tsx";
import { PopulationsTab } from "./PopulationsTab.tsx";

/** The module the tab's code gives. */
interface TabModule {
  readonly PopulationsTabView: () => React.JSX.Element;
}

/** The fake download of the tab's code: each `load` waits for the test
    to settle it. */
const fake = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const download = {
    loads: 0,
    state: "idle" as CodeState,
    module: null as TabModule | null,
    settle: null as ((ok: boolean) => void) | null,
    tell: (): void => {
      for (const listener of [...listeners]) listener();
    },
    listeners,
  };
  return download;
});

vi.mock("../../codeDownload.ts", () => ({
  createCodeDownload: (): CodeDownload<TabModule> => ({
    load: () => {
      fake.loads += 1;
      fake.state = "loading";
      fake.tell();
      return new Promise<TabModule>((resolve, reject) => {
        fake.settle = (ok) => {
          if (ok) {
            fake.module = {
              PopulationsTabView: () =>
                createElement("h2", { tabIndex: -1 }, "Diversity"),
            };
            fake.state = "loaded";
            fake.tell();
            resolve(fake.module);
          } else {
            fake.state = "failed";
            fake.tell();
            reject(new Error("Failed to fetch dynamically imported module"));
          }
        };
      });
    },
    loaded: () => fake.module,
    state: () => fake.state,
    subscribe: (listener) => {
      fake.listeners.add(listener);
      return () => {
        fake.listeners.delete(listener);
      };
    },
  }),
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

const FAILED =
  "The Populations tab could not be loaded. If the connection works, the site may have been updated since this page was opened: try again, or reload the page and open panel.nei again.";

let container: HTMLDivElement;
let root: Root;
let announced: string[];

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  fake.loads = 0;
  fake.state = "idle";
  fake.module = null;
  fake.settle = null;
  announced = [];
  // jsdom lays nothing out: every element counts as shown.
  HTMLElement.prototype.checkVisibility = () => true;
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

/** A store that gives a project with `panel.nei` open, all the tab's
    wrapper reads. */
const STORE = {
  getState: () => ({ project: { variants: { name: "panel.nei" } } }),
  subscribe: () => () => undefined,
} as unknown as Store<JobResult, Blob>;

/** An announcer that keeps what it is given. */
const ANNOUNCER: Announcer = {
  announce: (text: string) => {
    announced.push(text);
  },
} as unknown as Announcer;

/** The wrapper drawn with the tab shown or not. */
function draw(shown: boolean): void {
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(
          StoreProvider,
          { value: STORE },
          createElement(
            AnnouncerProvider,
            { value: ANNOUNCER },
            createElement(PopulationsTab, { shown }),
          ),
        ),
      ),
    );
  });
}

/** Settles the download under way, as the network would. */
async function settle(ok: boolean): Promise<void> {
  await act(async () => {
    fake.settle?.(ok);
    for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
  });
}

describe("PT1 D3 the code of the Populations tab", () => {
  test("not asked for while the tab is not shown, asked for when it is first shown, with its line until it arrives, then the tab", async () => {
    draw(false);
    expect(fake.loads).toBe(0);
    expect(container.textContent).toBe("");
    draw(true);
    expect(fake.loads).toBeGreaterThan(0);
    expect(container.textContent).toBe("Loading the Populations tab…");
    await settle(true);
    expect(container.querySelector("h2")?.textContent).toBe("Diversity");
    // Turned away and back: drawn at once, nothing asked again.
    const loads = fake.loads;
    draw(false);
    draw(true);
    expect(fake.loads).toBe(loads);
    expect(container.querySelector("h2")?.textContent).toBe("Diversity");
  });

  test("a download that failed: its words with Try again, said by the status region; Try again asks again, the focus on the place and then on the heading of the tab", async () => {
    draw(true);
    await settle(false);
    expect(container.textContent).toContain(FAILED);
    expect(announced).toContain(FAILED);
    const button = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Try again",
    );
    expect(button).toBeDefined();
    const loads = fake.loads;
    await act(async () => {
      button?.focus();
      button?.click();
      await Promise.resolve();
    });
    expect(fake.loads).toBe(loads + 1);
    expect(container.textContent).toBe("Loading the Populations tab…");
    expect(document.activeElement?.textContent).toBe(
      "Loading the Populations tab…",
    );
    await settle(true);
    expect(document.activeElement?.tagName).toBe("H2");
    expect(document.activeElement?.textContent).toBe("Diversity");
  });
});
