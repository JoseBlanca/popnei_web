/**
 * The header of the shell (docs/specs/shell.md, "The header"): "popnei
 * web", a link to the start page of the site, and the name of the
 * application as text, not a heading, since the `<h1>` of the page is the
 * step's. Undo, Redo, Open project… and Save project join it with work
 * package 9 of the walking skeleton.
 */
import { classOf } from "../classOf.ts";
import { Link } from "../widgets/Link.tsx";
import styles from "./Header.module.css";

/** The header of the population genetics application. */
export function Header(): React.JSX.Element {
  return (
    <header className={classOf(styles, "header")}>
      <Link href="index.html" label="popnei web" />
      <span className={classOf(styles, "application")}>
        Population genetics
      </span>
    </header>
  );
}
