/**
 * A disclosure, a line that opens and closes a part of the page under
 * it: React Aria's `Disclosure`, its trigger `Button` and its
 * `DisclosurePanel`, with our look (react.md, "Widgets: React Aria,
 * wrapped once"). React Aria tells a screen reader whether it is open.
 * Whether it is open belongs to the screen and is not saved (react.md,
 * "What state goes where"), so React Aria keeps it; a disclosure drawn
 * again with a new `key` starts closed.
 */
import {
  Disclosure as AriaDisclosure,
  Button,
  DisclosurePanel,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Disclosure.module.css";

/** What a disclosure is drawn with. */
export interface DisclosureProps {
  /** The words of the line that opens it, which are also its name. */
  readonly label: string;
  /** What it opens. */
  readonly children: React.ReactNode;
}

/** A disclosure with its line and what it opens. */
export function Disclosure({
  label,
  children,
}: DisclosureProps): React.JSX.Element {
  return (
    <AriaDisclosure className={classOf(styles, "disclosure")}>
      <Button slot="trigger" className={classOf(styles, "trigger")}>
        <svg
          className={classOf(styles, "chevron")}
          viewBox="0 0 16 16"
          aria-hidden="true"
        >
          <polyline points="6 4 10 8 6 12" />
        </svg>
        {label}
      </Button>
      <DisclosurePanel className={classOf(styles, "panel")}>
        {children}
      </DisclosurePanel>
    </AriaDisclosure>
  );
}
