/**
 * A link to another page of the site: React Aria's `Link`, with our look
 * (react.md, "Widgets: React Aria, wrapped once"). It is an `<a>` that the
 * browser follows.
 */
import { Link as AriaLink } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Link.module.css";

/** What a link is drawn with. */
export interface LinkProps {
  /** Where it goes, relative to the page: `index.html`. */
  readonly href: string;
  /** The words of the link, which say where it goes and are its name for
      a screen reader. */
  readonly label: string;
}

/** A link with its words. */
export function Link({ href, label }: LinkProps): React.JSX.Element {
  return (
    <AriaLink className={classOf(styles, "link")} href={href}>
      {label}
    </AriaLink>
  );
}
