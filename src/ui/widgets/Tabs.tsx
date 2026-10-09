/**
 * Tabs: React Aria's `Tabs`, `TabList`, `Tab` and `TabPanel`, with our
 * look (react.md, "Widgets: React Aria, wrapped once"), for the parts of
 * one result of which one is shown at a time, the plot of a histogram and
 * the table of its bins (docs/specs/steps/variants.md, "The plot and the
 * table of its bins"). The row of the labels is one stop of the Tab key,
 * whose arrow keys move between the labels and show each panel as they
 * reach it; the panel shown is the next stop, or its first element that
 * the Tab key reaches.
 *
 * By default only the panel shown is drawn: a plot in a panel not shown
 * is destroyed, and drawn anew when its label is chosen again, as the
 * plot and the table of the bins of popgen.html have it. With
 * `keepHidden`, as the two tabs of the files of popgen2.html have it
 * (docs/specs/steps/popgen2-input.md, "Both tabs kept drawn"), every
 * panel stays drawn: React Aria marks a panel not shown inert, which the
 * Tab key, the mouse and a screen reader pass over, and its style hides
 * it, so that a turn to another tab and back finds what the user left
 * there, a number half typed, the sort of a table, the plots drawn.
 *
 * A tab given a reason, `greyed`, as the tabs of the analyses of
 * popgen2.html have it while they cannot run (docs/specs/steps/popgen2-pca.md,
 * "The row of tabs"; docs/designs/analyses-pca.md, "A greyed tab, for every
 * user", option (b)), is not disabled for React Aria, which would take it
 * out of the arrow keys and leave a keyboard user without its reason. It
 * keeps its place among the arrow keys, its tooltip shows when the focus
 * or the pointer rests on it, the reason is its description, and a choice
 * of it, by a click, Enter, Space or the arrow key that reached it, is
 * refused: the tab shown stays shown. React Aria lets through no
 * `aria-disabled` on a tab it does not disable, so the widget sets it on
 * the tab's element after each drawing, for a screen reader to say
 * "dimmed"; the tests of the widget check that it stays.
 */
import { useId } from "react";
import {
  Tabs as AriaTabs,
  Tab,
  TabList,
  TabPanel,
} from "react-aria-components";
import type { Key } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Tabs.module.css";
import { WithTooltip } from "./Tooltip.tsx";

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
      or absent when it opens. */
  readonly greyed?: string | null;
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
}

/** A row of labels, and the panel of the one chosen. */
export function Tabs<Id extends string>({
  label,
  tabs,
  selected,
  onChange,
  keepHidden = false,
}: TabsProps<Id>): React.JSX.Element {
  const reasonsId = useId();
  const reasonId = (id: Id): string => `${reasonsId}-${id}`;
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
          return;
        }
        onChange(chosen.id);
      }}
      className={classOf(styles, "tabs")}
    >
      <TabList aria-label={label} className={classOf(styles, "list")}>
        {tabs.map((tab) => (
          <WithTooltip
            key={tab.id}
            text={tab.greyed ?? null}
            descriptionId={reasonId(tab.id)}
          >
            {(describedBy) => (
              <Tab
                id={tab.id}
                // Called at each drawing of this component, a new function
                // each time, so the mark follows `greyed`; React Aria
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
                {tab.label}
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
              {tab.greyed}
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

/** The attribute that marks a greyed tab for its style; React Aria lets
    a `data-` attribute through to the tab's element. */
const GREYED_ATTRIBUTE = "data-greyed";

/** Whether `tab` is greyed. */
function isGreyed<Id extends string>(tab: TabItem<Id>): boolean {
  return tab.greyed !== undefined && tab.greyed !== null;
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
