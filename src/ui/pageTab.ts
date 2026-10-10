/**
 * The tab shown on popgen2.html, one of the five under the boxes of the
 * files, Variants, Individuals, PCA, Populations or Distances
 * (docs/specs/steps/popgen2-band.md, "What it sends and reads", its last
 * paragraph; docs/architecture.md, section 9). It is the screen's and
 * not the project's: no Undo, no project file and no key reads it. It
 * is a small store of its own, which the entry makes once, because the
 * page is drawn in two roots: the row of tabs, in the application's,
 * and the band at the top, in `#defects`, both read it and both change
 * it, the band's link to the PCA's warnings showing the PCA tab.
 */
import { useSyncExternalStore } from "react";

import type { PageTab } from "../core/popgen2Tabs.ts";

/** The id of the element that holds what the PCA tab shows, where the
    band's link to the PCA's warnings or error finds the heading it gives
    the focus to. */
export const PCA_TAB_CONTENT_ID = "pca-tab-content";

/** The tab shown, read and changed by the two roots of the page. */
export interface PageTabStore {
  /** The tab shown now. A property made once, as `subscribe` is, for
      React's `useSyncExternalStore`. */
  readonly shown: () => PageTab;
  /** Shows `tab`, and tells every listener; nothing when it is already
      shown. */
  show(tab: PageTab): void;
  /** Calls `listener` after every change of the tab shown; returns the
      function that stops it. A property made once, so that React keeps
      it. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** Makes the store of the tab shown, the Variants tab first, as the
    page opens. */
export function createPageTab(): PageTabStore {
  let tab: PageTab = "variants";
  const listeners = new Set<() => void>();
  return {
    shown: () => tab,
    show(next) {
      if (next === tab) return;
      tab = next;
      for (const listener of [...listeners]) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** The tab shown of `pageTab`, drawn again at each change of it. */
export function usePageTab(pageTab: PageTabStore): PageTab {
  return useSyncExternalStore(pageTab.subscribe, pageTab.shown);
}
