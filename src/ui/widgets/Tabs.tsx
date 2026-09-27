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
 * Only the panel shown is drawn: a plot in a panel not shown is
 * destroyed, and drawn anew when its label is chosen again.
 */
import {
  Tabs as AriaTabs,
  Tab,
  TabList,
  TabPanel,
} from "react-aria-components";
import type { Key } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Tabs.module.css";

/** One tab: its label and what its panel holds. */
export interface TabItem {
  /** Its id, unique among the tabs. */
  readonly id: string;
  /** The words of its label. */
  readonly label: string;
  /** What its panel shows. */
  readonly content: React.ReactNode;
}

/** What a set of tabs is drawn with. */
export interface TabsProps {
  /** The name of the row of labels, read before its labels: the title of
      the result the tabs belong to. */
  readonly label: string;
  /** The tabs, in their order. */
  readonly tabs: readonly TabItem[];
  /** The id of the tab shown. */
  readonly selected: string;
  /** Called with the id of the tab the user chose. */
  readonly onChange: (id: string) => void;
}

/** A row of labels, and the panel of the one chosen. */
export function Tabs({
  label,
  tabs,
  selected,
  onChange,
}: TabsProps): React.JSX.Element {
  return (
    <AriaTabs
      selectedKey={selected}
      onSelectionChange={(key: Key) => {
        onChange(String(key));
      }}
      className={classOf(styles, "tabs")}
    >
      <TabList aria-label={label} className={classOf(styles, "list")}>
        {tabs.map((tab) => (
          <Tab key={tab.id} id={tab.id} className={classOf(styles, "tab")}>
            {tab.label}
          </Tab>
        ))}
      </TabList>
      {tabs.map((tab) => (
        <TabPanel key={tab.id} id={tab.id} className={classOf(styles, "panel")}>
          {tab.content}
        </TabPanel>
      ))}
    </AriaTabs>
  );
}
