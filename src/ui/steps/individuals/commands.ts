/**
 * The commands the Individuals step sends to the store, each with the
 * description that ends its notice and names its step of undo
 * (docs/specs/steps/individuals.md, "What it sends and reads"). Pure, so
 * that a test in node applies them to the real store.
 */

import {
  escaped,
  loadIndividuals,
  removeIndividuals,
  setCsvOptions,
  setGrouping,
} from "../../../core/project.ts";
import type { CsvOptions } from "../../../worker/protocol.ts";
import type { StepCommand } from "../variants/commands.ts";
import type { CsvOption } from "./words.ts";
import { AUTO_CSV } from "./words.ts";

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

/** The metadata file removed. */
export const REMOVE_COMMAND: StepCommand = Object.freeze({
  description: "the metadata file was removed",
  command: removeIndividuals,
});
