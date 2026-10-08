/**
 * The header of the shell (docs/specs/shell.md, "The header"): "popnei
 * web", a link to the start page of the site, and the name of the
 * application as text, not a heading, since the `<h1>` of the page is the
 * step's; Undo and Redo, with their keys, in UndoRedoButtons.tsx, which
 * popgen2.html draws too; and Open project… and Save project, in
 * ProjectButtons.tsx.
 */
import { classOf } from "../classOf.ts";
import { Link } from "../widgets/Link.tsx";
import styles from "./Header.module.css";
import { OpenProject, SaveProject } from "./ProjectButtons.tsx";
import { UndoRedoButtons } from "./UndoRedoButtons.tsx";

/** The header of the population genetics application. */
export function Header(): React.JSX.Element {
  return (
    <header className={classOf(styles, "header")}>
      <Link href="index.html" label="popnei web" />
      <span className={classOf(styles, "application")}>
        Population genetics
      </span>
      <span className={classOf(styles, "actions")}>
        <UndoRedoButtons />
        <OpenProject />
        <SaveProject />
      </span>
    </header>
  );
}
