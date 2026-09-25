/**
 * What a drop on a zone to load a file held, told from the kinds of its
 * items as React Aria gives them (docs/specs/steps/variants.md, "The
 * file"). Pure, so that a test in node checks every case, some of which
 * a script in a browser can only imitate.
 */

/** The kind of one item of a drop: a file, a folder, or a piece of text. */
export type DropItemKind = "file" | "directory" | "text";

/** What a drop held: files alone, however many; one folder; a piece of
    text alone; several things, files and folders, of which one at least
    is a folder; or nothing. Text that comes with files or folders is left
    out, so that a drop of a file that also carries its name as text,
    which a browser may give, is a drop of the file. */
export type Dropped = "files" | "folder" | "text" | "several" | "nothing";

/** What a drop of items of the kinds `kinds` held. */
export function droppedOf(kinds: readonly DropItemKind[]): Dropped {
  const things = kinds.filter((kind) => kind !== "text");
  if (things.length === 0) return kinds.length === 0 ? "nothing" : "text";
  if (things.every((kind) => kind === "file")) return "files";
  return things.length > 1 ? "several" : "folder";
}
