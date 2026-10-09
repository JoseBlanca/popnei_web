/**
 * Tabs: React Aria's `Tabs`, `TabList`, `Tab` and `TabPanel`, with our
 * look (react.md, "Widgets: React Aria, wrapped once"). Two uses: the
 * parts of one result of which one is shown at a time, the plot of a
 * histogram and the table of its bins of popgen.html
 * (docs/specs/steps/variants.md, "The plot and the table of its bins");
 * and the row of the five tabs of popgen2.html, Variants, Individuals,
 * PCA, Populations and Distances (docs/specs/steps/popgen2-pca.md, "The
 * row of tabs"). The row of the labels is one stop of the Tab key,
 * whose arrow keys move between the labels and show each panel as they
 * reach it; the panel shown is the next stop, or its first element that
 * the Tab key reaches.
 *
 * By default only the panel shown is drawn: a plot in a panel not shown
 * is destroyed, and drawn anew when its label is chosen again, as the
 * plot and the table of the bins of popgen.html have it. With
 * `keepHidden`, as the row of popgen2.html has it
 * (docs/specs/steps/popgen2-input.md, "Both tabs kept drawn"), every
 * panel stays drawn: React Aria marks a panel not shown inert, which the
 * Tab key, the mouse and a screen reader pass over, and its style hides
 * it, so that a turn to another tab and back finds what the user left
 * there, a number half typed, the sort of a table, the plots drawn.
 *
 * A tab given a reason, `greyedReason`, as the tabs of the analyses of
 * popgen2.html have it while they cannot run (docs/specs/steps/popgen2-pca.md,
 * "The row of tabs"; docs/designs/analyses-pca.md, "A greyed tab, for every
 * user", option (b)), is not disabled for React Aria, which would take it
 * out of the arrow keys and leave a keyboard user without its reason. It
 * keeps its place among the arrow keys, its tooltip shows when the focus
 * or the pointer rests on it, the reason is its description, and a choice
 * of it, by a click, Enter, Space or the arrow key that reached it, is
 * refused: the tab shown stays shown, and the tooltip shows, which a
 * press would otherwise close. The tooltip opens under the row, at its
 * start, and stays through a scroll while the focus is in the row
 * (`HeldTooltip` of Tooltip.tsx). React Aria lets through no
 * `aria-disabled` on a tab it does not disable, so the widget sets it on
 * the tab's element after each drawing, for a screen reader to say
 * "dimmed"; the tests of the widget check that it stays.
 */
import { useContext, useEffect, useId, useRef, useState } from "react";
import {
  Tabs as AriaTabs,
  Tab,
  TabList,
  TabListStateContext,
  TabPanel,
} from "react-aria-components";
import type { Key } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Tabs.module.css";
import { WithTooltip } from "./Tooltip.tsx";
import type { HeldTooltip } from "./Tooltip.tsx";

/** One tab: its label and what its panel holds; `Id` is the union of
    the ids of the tabs of a set. */
export interface TabItem<Id extends string> {
  /** Its id, unique among the tabs. */
  readonly id: Id;
  /** The words of its label. */
  readonly label: string;
  /** What its panel shows. */
  readonly content: React.ReactNode;
  /** Why it does not open, its tooltip and its description, or `null`
      or absent when it opens; never empty, which would give an empty
      tooltip and an empty description, and is refused as a defect. */
  readonly greyedReason?: string | null;
}

/** What a set of tabs is drawn with, whose ids are of the union
    `Id`. */
export interface TabsProps<Id extends string> {
  /** The name of the row of labels, read before its labels: the title of
      the result the tabs belong to. */
  readonly label: string;
  /** The tabs, in their order. */
  readonly tabs: readonly TabItem<Id>[];
  /** The id of the tab shown. */
  readonly selected: Id;
  /** Called with the id of the tab the user chose. */
  readonly onChange: (id: Id) => void;
  /** Whether the panels not shown stay drawn, inert and hidden, rather
      than being taken out of the page; false when absent. */
  readonly keepHidden?: boolean;
  /** Whether this is the row of the page's tabs, the five of
      popgen2.html: the tabs that open are drawn in the colour of the
      text, so that a greyed tab stands apart from them, and each label is
      as wide as in bold, so that the labels do not move when the tab
      shown changes. False when absent, as the plot and the table of the
      bins of popgen.html have it, which keep their look. */
  readonly pageRow?: boolean;
}

/** A row of labels, and the panel of the one chosen. */
export function Tabs<Id extends string>({
  label,
  tabs,
  selected,
  onChange,
  keepHidden = false,
  pageRow = false,
}: TabsProps<Id>): React.JSX.Element {
  const reasonsId = useId();
  const reasonId = (id: Id): string => `${reasonsId}-${id}`;
  const listRef = useRef<HTMLDivElement>(null);
  // The tab whose reason's tooltip is open, held here so that a press on
  // a greyed tab, which React Aria would let close it, opens it.
  const [reasonShown, setReasonShown] = useState<Id | null>(null);
  if (
    reasonShown !== null &&
    !tabs.some((tab) => tab.id === reasonShown && isGreyed(tab))
  ) {
    setReasonShown(null);
  }
  const heldFor = (tab: TabItem<Id>): HeldTooltip => ({
    isOpen: reasonShown === tab.id,
    onOpenChange: (isOpen) => {
      setReasonShown((shown) =>
        isOpen ? tab.id : shown === tab.id ? null : shown,
      );
    },
    hasFocus: () => listRef.current?.contains(document.activeElement) ?? false,
    placedUnder: listRef,
  });
  return (
    <AriaTabs
      selectedKey={selected}
      onSelectionChange={(key: Key) => {
        // React Aria gives back the id of one of the tabs it was given.
        const chosen = tabs.find((tab) => tab.id === key);
        if (chosen === undefined) {
          throw new Error(
            `popnei_web defect: a tab was chosen that is not among the tabs, ${String(key)}.`,
          );
        }
        if (isGreyed(chosen)) {
          // Refused, and the reason shown, for a click, a tap, Enter or
          // Space that would see nothing happen otherwise.
          setReasonShown(chosen.id);
          return;
        }
        onChange(chosen.id);
      }}
      className={classOf(styles, "tabs")}
    >
      <TabStopToShown listRef={listRef} />
      <TabList
        ref={listRef}
        aria-label={label}
        className={
          pageRow
            ? `${classOf(styles, "list")} ${classOf(styles, "pageRow")}`
            : classOf(styles, "list")
        }
      >
        {tabs.map((tab) => (
          <WithTooltip
            key={tab.id}
            text={tab.greyedReason ?? null}
            drawnElsewhereId={reasonId(tab.id)}
            held={heldFor(tab)}
          >
            {(describedBy) => (
              <Tab
                id={tab.id}
                // Called at each drawing of this component, a new function
                // each time, so the mark follows `greyedReason`; React Aria
                // drawing the tab again leaves an attribute it does not
                // set alone.
                ref={(element: HTMLElement | null) => {
                  markGreyed(element, isGreyed(tab));
                }}
                className={classOf(styles, "tab")}
                {...(describedBy !== undefined && {
                  "aria-describedby": describedBy,
                })}
                {...(isGreyed(tab) && { [GREYED_ATTRIBUTE]: "true" })}
              >
                {pageRow ? (
                  <span
                    className={classOf(styles, "label")}
                    data-label={tab.label}
                  >
                    {tab.label}
                  </span>
                ) : (
                  tab.label
                )}
              </Tab>
            )}
          </WithTooltip>
        ))}
      </TabList>
      {/* The reasons, the descriptions of the greyed tabs, outside the
          row, where an element that is not a tab would break React
          Aria's collection of the tabs. */}
      {tabs.map(
        (tab) =>
          isGreyed(tab) && (
            <span key={tab.id} id={reasonId(tab.id)} hidden>
              {tab.greyedReason}
            </span>
          ),
      )}
      {tabs.map((tab) => (
        <TabPanel
          key={tab.id}
          id={tab.id}
          shouldForceMount={keepHidden}
          className={classOf(styles, "panel")}
        >
          {tab.content}
        </TabPanel>
      ))}
    </AriaTabs>
  );
}

/** Gives the row's one stop of the Tab key back to the tab shown when
    the focus leaves the row. React Aria keeps it on the tab the arrow
    keys last reached, so that after the arrows rested on a greyed tab,
    Tab out and Shift+Tab back landed on the greyed tab, not on the tab
    shown, as the tabs pattern of WAI-ARIA has it (seen in Chromium and
    WebKit on 9 October 2026). Draws nothing. */
function TabStopToShown({
  listRef,
}: {
  readonly listRef: React.RefObject<HTMLDivElement | null>;
}): null {
  const state = useContext(TabListStateContext);
  useEffect(() => {
    const list = listRef.current;
    if (list === null || state === null) {
      return;
    }
    const onFocusOut = (event: FocusEvent): void => {
      const next = event.relatedTarget;
      if (next instanceof Node && list.contains(next)) {
        return;
      }
      // Not focused first, so that React Aria does not move the focus
      // back to the tab it is given.
      state.selectionManager.setFocused(false);
      state.selectionManager.setFocusedKey(state.selectedKey);
    };
    list.addEventListener("focusout", onFocusOut);
    return () => {
      list.removeEventListener("focusout", onFocusOut);
    };
  }, [listRef, state]);
  return null;
}

/** The attribute that marks a greyed tab for its style; React Aria lets
    a `data-` attribute through to the tab's element. */
const GREYED_ATTRIBUTE = "data-greyed";

/** Whether `tab` is greyed. Throws a defect on an empty reason. */
function isGreyed<Id extends string>(tab: TabItem<Id>): boolean {
  const reason = tab.greyedReason;
  if (reason === "") {
    throw new Error(
      `popnei_web defect: the tab ${tab.id} was greyed with an empty reason.`,
    );
  }
  return reason !== undefined && reason !== null;
}

/** Sets `aria-disabled` on the element of a tab when it is greyed, and
    takes it off when it is not; nothing with no element. */
function markGreyed(element: HTMLElement | null, greyed: boolean): void {
  if (element === null) {
    return;
  }
  if (greyed) {
    element.setAttribute("aria-disabled", "true");
  } else {
    element.removeAttribute("aria-disabled");
  }
}
