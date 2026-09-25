/**
 * The status region of the shell (docs/specs/shell.md, "The status
 * region"): a `<div role="status">`, empty and on the page from its first
 * drawing, since a region added at the moment of its message is not read
 * by every screen reader. What the announcer writes into it is read out
 * without moving the focus (WCAG 4.1.3). It is out of sight: what it says
 * is already on the screen where it happened.
 */
import { useSyncExternalStore } from "react";

import { classOf } from "../classOf.ts";
import { useAnnouncer } from "./announcer.tsx";
import styles from "./StatusRegion.module.css";

/** The status region, with the text of the announcer. */
export function StatusRegion(): React.JSX.Element {
  const announcer = useAnnouncer();
  const text = useSyncExternalStore(announcer.subscribe, () =>
    announcer.getState(),
  );
  return (
    <div role="status" className={classOf(styles, "region")}>
      {text}
    </div>
  );
}
