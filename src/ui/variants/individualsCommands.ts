/**
 * The commands the box and the tab of the individuals file of
 * popgen2.html send to the store, each with the description that names
 * its step of the history (docs/specs/steps/popgen2-input.md, "What it
 * sends and reads"), and the items of the list "Column of the
 * populations". A change of an option of a CSV is the old step's
 * command, `csvOptionCommand`. Pure, so that a test in node applies them
 * to the real store.
 */
import { populationColumnChoices } from "../../core/populations.ts";
import {
  escaped,
  loadIndividuals,
  removeIndividuals,
  setGrouping,
} from "../../core/project.ts";
import type { Project, TableRead } from "../../core/project.ts";
import type { StepCommand } from "../steps/variants/commands.ts";
import { AUTO_CSV } from "../steps/individuals/words.ts";
import { NO_COLUMN_ITEM, columnShown } from "./individualsWords.ts";

/** An individuals file opened by the button, a drop or a paste, a new
    load read with every option of a CSV found by the reader. */
export function openIndividualsCommand(
  fileId: string,
  name: string,
): StepCommand {
  return {
    description: "an individuals file was opened",
    command: (p) => loadIndividuals(p, { fileId, name, csv: AUTO_CSV }),
  };
}

/** Remove of the individuals file. */
export const REMOVE_INDIVIDUALS_COMMAND: StepCommand = Object.freeze({
  description: "the individuals file was removed",
  command: removeIndividuals,
});

/** The id of an item of the list "Column of the populations": "None", or
    a column by its name, which may be any text, "none" among them. */
export type ColumnItemId = "none" | `column:${string}`;

/** An item of the list. */
export interface ColumnItem {
  readonly id: ColumnItemId;
  readonly label: string;
}

/** The items of the list for the read `read`: "None", then each column
    the list offers (`populationColumnChoices` of core), by its name in
    the file, in its order. */
export function columnItems(read: TableRead): readonly ColumnItem[] {
  return [
    { id: "none", label: NO_COLUMN_ITEM },
    ...populationColumnChoices(read).map((column) => ({
      id: `column:${column}` as const,
      label: escaped(column),
    })),
  ];
}

/** The item the list shows chosen in `p`: the column of the grouping
    when the list offers it, "None" otherwise. */
export function chosenColumnItem(p: Project): ColumnItemId {
  const column = columnShown(p);
  return column === null ? "none" : `column:${column}`;
}

/** The item `id` of the list chosen: the grouping by that column, or by
    none. */
export function columnItemCommand(id: ColumnItemId): StepCommand {
  const column = id === "none" ? null : id.slice("column:".length);
  return {
    description: "the column of the populations changed",
    command: (p) => setGrouping(p, { kind: "populations", column }),
  };
}
