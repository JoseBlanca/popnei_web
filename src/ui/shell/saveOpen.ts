/**
 * What Save project and Open project… of the shell say and do outside
 * React (docs/specs/shell.md, "Saving" and "Opening"): the words of the
 * dialogs and of the status region, and the first three steps of an
 * opening, which read and check the picked file before the page asks the
 * user to give up their project for it.
 */
import { escaped, individualsNeeds } from "../../core/project.ts";
import type { Project } from "../../core/project.ts";
import {
  MAX_PROJECT_FILE_BYTES,
  NEW_PAGE,
  askedFileText,
  projectFileErrorText,
} from "../../core/projectFile.ts";
import type { ProjectFileError } from "../../core/projectFile.ts";
import type { Result } from "../../core/result.ts";
import { capitalized } from "../sentences.ts";

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

/** What an opening would stop or discard, which the question before it
    names. */
export interface OpeningLoses {
  /** Whether calculations of analyses are in flight. */
  readonly calculating: boolean;
  /** The name of the file of the filtered variants being written,
      "panel.filtered.nei", or `null` when none is. */
  readonly writing: string | null;
  /** The name of the file of the filtered variants written and not
      saved, or `null` when there is none. */
  readonly unsaved: string | null;
}

/** The question before an opening of the project file `name`, when the
    project has changed or the opening would lose what `loses` says: its
    heading, the question itself, and the rest of its words under it. */
export function openQuestion(
  name: string,
  loses: OpeningLoses,
): { readonly title: string; readonly text: string } {
  const { calculating, writing, unsaved } = loses;
  // A file written and not saved is lost with the project, and saving
  // the project does not keep it, so the words of keeping name both.
  const sentences =
    unsaved === null
      ? [
          "It replaces the project on the page, and an opening cannot be undone. To keep the project on the page, press Keep the current project and save it first.",
        ]
      : [
          `It replaces the project on the page, and an opening cannot be undone, and ${escaped(unsaved)}, written and not saved, will be discarded. To keep them, press Keep the current project, then save the project with Save project and ${escaped(unsaved)} in the Variants step.`,
        ];
  const stopped = [
    ...(calculating ? ["the ongoing calculations"] : []),
    ...(writing === null ? [] : [`the writing of ${escaped(writing)}`]),
  ];
  if (stopped.length > 0) {
    sentences.push(capitalized(`${stopped.join(" and ")} will be stopped.`));
  }
  return { title: `Open ${escaped(name)}?`, text: sentences.join(" ") };
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

/** What the status region says after an opening: the file opened; the
    variants file to give when the project file names one; and, when the
    metadata file was not read when the project was saved, `notGiven`,
    the reason `individualsNeeds` gives it, which says to load it again
    (docs/specs/shell.md, "The status region"). */
export function openedText(name: string, p: Project): string {
  const notGiven =
    p.individuals?.read.kind === "notGiven" ? individualsNeeds(p) : null;
  return [`Opened ${escaped(name)}.`, askedFileText(p), notGiven]
    .filter((sentence) => sentence !== null)
    .join(" ");
}

/** A picked file the browser could not read, moved or changed since it
    was picked; `message` is the browser's. */
export function unreadableText(name: string, message: string): string {
  const said = message.endsWith(".") ? message.slice(0, -1) : message;
  return `${escaped(name)} could not be read: ${said}. Choose it again.`;
}

/** Why a project file does not open, in words under a heading; `link`
    is the address of a page of the site that the words name last, which
    the dialog makes a link of, or `null` when they name none. */
export interface Refusal {
  readonly title: string;
  readonly text: string;
  readonly link: string | null;
}

/** What the first three steps of an opening gave: the project, or why the
    file does not open. */
export type Picked =
  | { readonly kind: "project"; readonly project: Project }
  | ({ readonly kind: "refused" } & Refusal);

/** The words of `refusal` around the last mention of its page, `link`,
    which the dialog draws as a link between them; `null` when it names no
    page. The last, since the name of the file comes first and may hold
    the address too. */
export function aroundLink(refusal: Refusal): {
  readonly before: string;
  readonly link: string;
  readonly after: string;
} | null {
  const { text, link } = refusal;
  if (link === null) return null;
  const at = text.lastIndexOf(link);
  if (at === -1) return null;
  return {
    before: text.slice(0, at),
    link,
    after: text.slice(at + link.length),
  };
}

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
  const refused = (text: string, link: string | null = null): Picked => ({
    kind: "refused",
    title: notOpenedTitle(file.name),
    text,
    link,
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
    : refused(
        projectFileErrorText(opened.error, file.name),
        // A file of the new page is opened there, and its words say so.
        opened.error.kind === "newPageFilter" ? NEW_PAGE : null,
      );
}
