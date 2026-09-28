/**
 * The commands the Individuals step sends to the store, each with the
 * description that ends its notice and names its step of undo
 * (docs/specs/steps/individuals.md, "What it sends and reads"). Pure, so
 * that a test in node applies them to the real store.
 */

import {
  escaped,
  forgetTypesLost,
  loadIndividuals,
  removeIndividuals,
  setColumnType,
  setCsvOptions,
  setGrouping,
} from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { ColumnType, CsvOptions } from "../../../worker/protocol.ts";
import type { StepCommand } from "../variants/commands.ts";
import type { CsvOption, PopulationItemId } from "./words.ts";
import { AUTO_CSV, groupingOfItem } from "./words.ts";

/** A file picked or dropped, a new load read with every option found
    by the reader. */
export function pickCommand(fileId: string, name: string): StepCommand {
  return {
    description: "a new metadata file was loaded",
    command: (p) => loadIndividuals(p, { fileId, name, csv: AUTO_CSV }),
  };
}

/** The words of each option in the description of its change. */
const OPTION_WORDS: Readonly<Record<CsvOption, string>> = {
  encoding: "the encoding",
  separator: "the separator",
  decimal: "the decimal mark",
};

/** One option of the reader of the file `name` chosen, `option` set to
    the value in `csv`, which holds the other two as they are. */
export function csvOptionCommand(
  option: CsvOption,
  name: string,
  csv: CsvOptions,
): StepCommand {
  return {
    description: `${OPTION_WORDS[option]} of ${escaped(name)} changed`,
    command: (p) => setCsvOptions(p, csv),
  };
}

/** The column of the populations chosen. */
export function groupingCommand(column: string): StepCommand {
  return {
    description: "the column of the populations changed",
    command: (p) => setGrouping(p, { kind: "populations", column }),
  };
}

/** "All individuals in one population" chosen. */
export const ONE_POPULATION_COMMAND: StepCommand = Object.freeze({
  description: "every individual was put in one population",
  command: (p: Project) => setGrouping(p, { kind: "onePopulation" }),
});

/** The item `id` of the select of the populations chosen: the one
    population, or a column. */
export function populationItemCommand(id: PopulationItemId): StepCommand {
  const grouping = groupingOfItem(id);
  return grouping.kind === "populations" && grouping.column !== null
    ? groupingCommand(grouping.column)
    : ONE_POPULATION_COMMAND;
}

/** The type `type` chosen for the column `column`; a binary type as
    `columnAllows` gives it, with the coding the reader proposes. */
export function typeCommand(column: string, type: ColumnType): StepCommand {
  return {
    description: `the type of ${escaped(column)} changed`,
    command: (p) => setColumnType(p, column, type),
  };
}

/** The value `one` chosen as the value coded 1 of the binary column
    `column`, whose other value, `zero`, is coded 0. */
export function codingCommand(
  column: string,
  one: string,
  zero: string,
): StepCommand {
  return {
    description: `the value coded 1 in ${escaped(column)} changed`,
    command: (p) => setColumnType(p, column, { kind: "binary", one, zero }),
  };
}

/** "Forget these types", or "Forget this type": the types set that the
    read does not apply dropped. */
export const FORGET_TYPES_COMMAND: StepCommand = Object.freeze({
  description: "the types set and not applied were forgotten",
  command: forgetTypesLost,
});

/** The metadata file removed. */
export const REMOVE_COMMAND: StepCommand = Object.freeze({
  description: "the metadata file was removed",
  command: removeIndividuals,
});
