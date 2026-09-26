/**
 * What Save project and Open project… of the shell say and do outside
 * React (docs/specs/shell.md, "Saving" and "Opening"): the words of the
 * dialogs and of the status region, and the first three steps of an
 * opening, which read and check the picked file before the page asks the
 * user to give up their project for it.
 */
import { escaped } from "../../core/project.ts";
import type { Project } from "../../core/project.ts";
import {
  MAX_PROJECT_FILE_BYTES,
  askedFileText,
  projectFileErrorText,
} from "../../core/projectFile.ts";
import type { ProjectFileError } from "../../core/projectFile.ts";
import type { Result } from "../../core/result.ts";

/** The line under the heading of the dialog of Save: the browser does
    not always let the page ask before it is left, and never on an iPad
    or an iPhone. */
export const SAVE_BEFORE_LEAVING =
  "The page cannot always ask you before it is closed, and on an iPad or an iPhone it never can: save the project before you leave.";

/** The description of Save while the field of the name is empty. */
export const NAME_NEEDED = "Give the file a name.";

/** What the status region says after a Save: the page does not learn
    whether the browser kept the file, so it never says it was saved. */
export function handedText(name: string): string {
  return `${escaped(name)} was handed to the browser to download.`;
}

/** The question before an opening, when the project has changed or
    calculations are in flight: its heading, the question itself, and the
    rest of its words under it. */
export function openQuestion(
  name: string,
  running: boolean,
): { readonly title: string; readonly text: string } {
  const text =
    "It replaces the project on the page, and an opening cannot be undone. To keep the project on the page, press Keep the current project and save it first.";
  return {
    title: `Open ${escaped(name)}?`,
    text: running ? `${text} The ongoing calculations will be stopped.` : text,
  };
}

/** The button of the question that keeps the project on the page. */
export const KEEP_PROJECT = "Keep the current project";

/** The heading of the dialog of the project file `name` that does not
    open, which names it, since some of the texts under it do not. */
export function notOpenedTitle(name: string): string {
  return `${escaped(name)} was not opened`;
}

/** The button of the question that opens the file. */
export function openButtonText(name: string): string {
  return `Open ${escaped(name)}`;
}

/** What the status region says after an opening: the file opened, and
    the variants file to give when the project file names one. */
export function openedText(name: string, p: Project): string {
  const asked = askedFileText(p);
  const opened = `Opened ${escaped(name)}.`;
  return asked === null ? opened : `${opened} ${asked}`;
}

/** A picked file the browser could not read, moved or changed since it
    was picked; `message` is the browser's. */
export function unreadableText(name: string, message: string): string {
  const said = message.endsWith(".") ? message.slice(0, -1) : message;
  return `${escaped(name)} could not be read: ${said}. Choose it again.`;
}

/** What the first three steps of an opening gave: the project, or the
    words of why the file does not open, under its heading. */
export type Picked =
  | { readonly kind: "project"; readonly project: Project }
  | { readonly kind: "refused"; readonly title: string; readonly text: string };

/** The parts of a `File` an opening reads. */
export type PickedFile = Pick<File, "name" | "size" | "text">;

/**
 * Reads and checks the picked `file`: a file above 64 MB is not read; a
 * file the browser cannot read is told so; the text is then read by
 * `read`, `read` of the saving, which is `readProjectFile` with the
 * application of the page and its analyses.
 */
export async function readPicked(
  file: PickedFile,
  read: (text: string) => Result<Project, ProjectFileError>,
): Promise<Picked> {
  const refused = (text: string): Picked => ({
    kind: "refused",
    title: notOpenedTitle(file.name),
    text,
  });
  if (file.size > MAX_PROJECT_FILE_BYTES) {
    return refused(
      projectFileErrorText({ kind: "tooLarge", size: file.size }, file.name),
    );
  }
  let text: string;
  try {
    text = await file.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return refused(unreadableText(file.name, message));
  }
  const opened = read(text);
  return opened.ok
    ? { kind: "project", project: opened.value }
    : refused(projectFileErrorText(opened.error, file.name));
}
