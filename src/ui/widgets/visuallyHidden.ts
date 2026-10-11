/**
 * The class of words a screen reader reads and the screen does not show,
 * the one rule of the page for them (VisuallyHidden.module.css), which
 * each component gives such words, alone or beside a class of its own:
 * the status region, a caption that names a table for a screen reader
 * alone, the rest of a label shown in part.
 */
import { classOf } from "../classOf.ts";
import styles from "./VisuallyHidden.module.css";

/** The class of words for a screen reader alone. */
export const VISUALLY_HIDDEN: string = classOf(styles, "visuallyHidden");
