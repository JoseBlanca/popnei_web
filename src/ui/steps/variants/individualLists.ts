/**
 * The two lists of individuals of the Variants step, to keep and to
 * remove (docs/specs/steps/variants.md, "The filters of the individuals",
 * "The two lists"): the names a text holds, one per line; the text a list
 * of the project starts at; whether a text is the list applied; the
 * commands of Apply and Clear; and their words. Pure, so that a test in
 * node applies the commands to the real store; `IndividualLists.tsx`
 * draws them.
 */

import {
  removeIndividualFilter,
  setIndividualFilter,
} from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { StepCommand } from "./commands.ts";

/** The two lists, in their fixed order. */
export const LIST_KINDS = ["keep", "remove"] as const;

/** One of the two lists. */
export type ListKind = (typeof LIST_KINDS)[number];

/** The words of a list: the label of its text area, the line under it,
    and its two buttons. */
export interface ListWords {
  /** The label of the text area. */
  readonly label: string;
  /** The line under the text area, what the list does. */
  readonly line: string;
  /** The button that applies the text. */
  readonly apply: string;
  /** The button that empties the text and removes the filter. */
  readonly clear: string;
}

/** The words of each list (the spec, the table of "The two lists"). */
export const LIST_WORDS: Readonly<Record<ListKind, ListWords>> = {
  keep: {
    label: "Individuals to keep, one name per line",
    line: "Only the individuals of this list are kept. Leave it empty to keep every individual.",
    apply: "Apply the list to keep",
    clear: "Clear the list to keep",
  },
  remove: {
    label: "Individuals to remove, one name per line",
    line: "The individuals of this list are removed.",
    apply: "Apply the list to remove",
    clear: "Clear the list to remove",
  },
};

/** The heading of the section of the filters of the individuals. */
export const INDIVIDUAL_FILTERS_HEADING = "Filters of the individuals";

/** The line under a text area whose names are not the list applied. */
export function notAppliedText(kind: ListKind): string {
  return `This list is not applied yet; ${LIST_WORDS[kind].apply} applies it.`;
}

/** A line break of any system: CRLF, LF, or a CR alone. */
const LINE_BREAK = /\r\n|\r|\n/u;

/** The spaces and tabs at the ends of a line. */
const ENDS = /^[ \t]+|[ \t]+$/gu;

/**
 * The names of `text`, one per line, in the order written: each line with
 * the spaces and tabs at its ends taken off, and the empty lines dropped,
 * so that a column copied from a spreadsheet, or the text of a file of
 * one name per line, can be pasted. Nothing else is taken off: a comma or
 * a tab inside a line is part of its name.
 */
export function namesOfText(text: string): readonly string[] {
  return text
    .split(LINE_BREAK)
    .map((line) => line.replace(ENDS, ""))
    .filter((name) => name !== "");
}

/** The list of the kind `kind` of `p`, or `null` when it has none. */
export function listOf(p: Project, kind: ListKind): readonly string[] | null {
  for (const filter of p.individualFilters) {
    if (filter.kind === "keep" && kind === "keep") return filter.individuals;
    if (filter.kind === "remove" && kind === "remove") {
      return filter.individuals;
    }
  }
  return null;
}

/** The text a list starts at: its names, one per line; empty for no
    list. */
export function textOfList(list: readonly string[] | null): string {
  return list === null ? "" : list.join("\n");
}

/** Whether the names of `text` are the list applied, `list`, in the same
    order; no name is no list. */
export function isApplied(
  text: string,
  list: readonly string[] | null,
): boolean {
  const names = namesOfText(text);
  const applied = list ?? [];
  return (
    names.length === applied.length &&
    names.every((name, index) => name === applied[index])
  );
}

/** The words "individuals to keep" or "individuals to remove". */
function individualsOf(kind: ListKind): string {
  return kind === "keep" ? "individuals to keep" : "individuals to remove";
}

/** Apply of the list `kind` with the text `text`: its names, in the
    order written, or, when there is none, the filter removed; "the list
    of individuals to keep changed". */
export function applyCommand(kind: ListKind, text: string): StepCommand {
  const individuals = namesOfText(text);
  return {
    description: `the list of ${individualsOf(kind)} changed`,
    command: (p) =>
      individuals.length === 0
        ? removeIndividualFilter(p, kind)
        : setIndividualFilter(p, { kind, individuals }),
  };
}

/** Clear of the list `kind`: the filter removed; "the list of individuals
    to keep was cleared". */
export function clearCommand(kind: ListKind): StepCommand {
  return {
    description: `the list of ${individualsOf(kind)} was cleared`,
    command: (p) => removeIndividualFilter(p, kind),
  };
}

/** A text typed in a list and held by the step, with the count of the
    undos, redos and openings when it was typed. */
export interface TypedList {
  /** The text. */
  readonly text: string;
  /** The moves of the history when it was typed (`historyMoves.ts`). */
  readonly moves: number;
}

/**
 * The text a list shows: the one typed, while no undo, redo or opening
 * has come since it was typed; otherwise the list of the project, one
 * name per line, so that it always shows a list the project has or had.
 */
export function shownText(
  typed: TypedList | null,
  moves: number,
  list: readonly string[] | null,
): string {
  return typed !== null && typed.moves === moves
    ? typed.text
    : textOfList(list);
}
