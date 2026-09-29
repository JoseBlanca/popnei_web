/**
 * A link: React Aria's `Link`, with our look (react.md, "Widgets: React
 * Aria, wrapped once"). With `href`, an `<a>` to another page of the site
 * that the browser follows. With `onPress`, a link within the page that
 * moves the focus, as the one from a plot to its table does
 * (docs/specs/analyses/pca.md, "Accessibility"): not an `<a>` to an anchor,
 * since the address after `#` names the step of the application, and a
 * change of it would change the step.
 */
import { Link as AriaLink } from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Link.module.css";

/** Where a link goes: a page, or a place of this page that the screen
    moves the focus to. */
export type LinkTarget =
  | {
      /** Where it goes, relative to the page: `index.html`. */
      readonly href: string;
      readonly onPress?: never;
    }
  | {
      readonly href?: never;
      /** Moves the focus where the link says it goes. */
      readonly onPress: () => void;
    };

/** What a link is drawn with. */
export type LinkProps = LinkTarget & {
  /** The words of the link, which say where it goes and are its name for
      a screen reader. */
  readonly label: string;
};

/** A link with its words. */
export function Link({ href, onPress, label }: LinkProps): React.JSX.Element {
  return (
    <AriaLink
      className={classOf(styles, "link")}
      {...(href !== undefined && { href })}
      {...(onPress !== undefined && { onPress })}
    >
      {label}
    </AriaLink>
  );
}
