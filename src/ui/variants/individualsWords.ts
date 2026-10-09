/**
 * The words of the box and of the tab of the individuals file on
 * popgen2.html (docs/specs/steps/popgen2-input.md, "The box of the
 * individuals file", "The tab Individuals file" and "Its words"): with no
 * file, the list of the column of the populations, the counts and the
 * lines under them, what the tab shows from the read and its format, and
 * what the status region says of a read. Pure, so that a test in node
 * checks them; the widgets draw them.
 */
import type { IndividualsKept } from "../../core/individualsKept.ts";
import {
  defaultPopulationsColumn,
  populationColumnChoices,
  populationCounts,
} from "../../core/populations.ts";
import type { PopulationCounts } from "../../core/populations.ts";
import {
  MAX_NAMED,
  bothOf,
  counted,
  escaped,
  grouped,
  individualsBoxNeeds,
  shown,
} from "../../core/project.ts";
import type {
  IndividualsSource,
  Project,
  VariantSource,
} from "../../core/project.ts";
import type { TableFormat } from "../../worker/protocol.ts";
import { firstSheetText } from "../steps/individuals/words.ts";

/** The heading of the box of the individuals file, and the label of its
    tab. */
export const INDIVIDUALS_BOX_NAME = "Individuals file";

/** What the tab of the individuals file says with no individuals file. */
export const NO_INDIVIDUALS_FILE_TAB = "No individuals file open.";

/** What the box of the individuals file says with no individuals file,
    from the variants file of the project, or null with none:
    that every individual is unclassified, and, once the variants file
    has given its individuals, how many and what the analyses per
    population will do with them. */
export function noIndividualsFileText(variants: VariantSource | null): string {
  const first = "No individuals file: every individual is unclassified.";
  if (variants?.read.kind !== "read") return first;
  const name = escaped(variants.name);
  const numIndividuals = variants.read.individuals.length;
  return numIndividuals === 1
    ? `No individuals file: the one individual of ${name} is unclassified.`
    : `No individuals file: all ${grouped(numIndividuals)} individuals of ${name} are unclassified, and the analyses per population will take them as one population.`;
}

/** The button of the zone of the individuals file, with no file and
    with one. */
export const OPEN_INDIVIDUALS_FILE = "Open individuals file…";
export const OPEN_ANOTHER_INDIVIDUALS_FILE = "Open another individuals file…";

/** The name of the zone, which takes a paste, for a screen reader. */
export const PASTE_INDIVIDUALS_FILE = "Paste an individuals file";

/** The button that removes the individuals file `name`. */
export function removeLabel(name: string): string {
  return `Remove ${escaped(name)}`;
}

/** What the box says of a drop or a paste of a folder, of a piece of
    text, or of several files. */
export const INDIVIDUALS_FOLDER_DROPPED =
  "Open an individuals file, a CSV, a TSV or an xlsx, not a folder.";
export const INDIVIDUALS_TEXT_DROPPED =
  "Open an individuals file, a CSV, a TSV or an xlsx, not a piece of text.";
export const INDIVIDUALS_SEVERAL_DROPPED =
  "Open one individuals file at a time.";

/** The label of the list of the column of the populations, and its first
    item, the grouping with no column. */
export const COLUMN_LIST_LABEL = "Column of the populations";
export const NO_COLUMN_ITEM = "None: every individual unclassified";

/** The column the list shows chosen in `p`: the column of the grouping
    when the list offers it, `populationColumnChoices` of core; null,
    "None", otherwise, and while the file is not read. */
export function columnShown(p: Project): string | null {
  const read = p.individuals?.read;
  if (read?.kind !== "read" || p.grouping.kind !== "populations") {
    return null;
  }
  const column = p.grouping.column;
  return column !== null && populationColumnChoices(read).includes(column)
    ? column
    : null;
}

/** The line under the list when the page found no column to choose,
    `defaultPopulationsColumn` of core, and the list is on "None"; null
    otherwise, and while the file is not read. */
export function noColumnQualifiedText(p: Project): string | null {
  const individuals = p.individuals;
  if (individuals?.read.kind !== "read" || columnShown(p) !== null) {
    return null;
  }
  return defaultPopulationsColumn(individuals.read) === null
    ? `No column of ${escaped(individuals.name)} holds text with 20 different values or fewer, so none was chosen as the column of the populations. Choose it in the list.`
    : null;
}

/** The caption of the table of the counts, of the variants file
    `variantsName`. */
export function countsCaption(variantsName: string): string {
  return `Individuals of ${escaped(variantsName)} after the filters of individuals`;
}

/** The headers of the two columns of the counts. */
export const POPULATION_HEADER = "Population";
export const INDIVIDUALS_HEADER = "Individuals";

/** A count not yet known, as the table shows it, and as a screen reader
    reads it. */
export const WAITING_COUNT = "…";
export const NOT_COUNTED_YET = "not counted yet";

/** A count of the table, with a comma for the thousands; `WAITING_COUNT`
    while it is not known. */
export function countText(kept: number | null): string {
  return kept === null ? WAITING_COUNT : grouped(kept);
}

/** Why the counts wait for the one pass: it runs or has not started, the
    user stopped it, or it, or the opening, failed. Read only while the
    list of the individuals kept is not known. */
export type PassWait = "running" | "stopped" | "failed";

/** A line under the list: words, or a warning, whose words follow the
    "Warning: " that the widget writes. */
export interface CountsLine {
  readonly kind: "line" | "warning";
  readonly text: string;
}

/** What the box shows of the counts: whether the table is drawn, and the
    lines under it, or in its place, in their order. */
export interface CountsShown {
  readonly table: boolean;
  readonly lines: readonly CountsLine[];
}

/**
 * What the box shows of `counts`, the counts of `p`, an individuals file
 * read: before the variants file is read, the warning of too many values
 * if any and the line of the counts to come; once it is read, the
 * warning of too many values, the warning of none of the individuals in
 * the file, the line of why the counts wait, `wait`, while the list of
 * the individuals kept is not known, the line of every individual kept
 * unclassified, or the table with the line of the unclassified kept if
 * any, the first of these that holds; and last, always, the line of the
 * rows of the file the variants file does not have.
 */
export function countsShown(
  p: Project,
  counts: PopulationCounts,
  wait: PassWait,
): CountsShown {
  const tooMany = tooManyWarning(counts);
  if (!counts.variantsRead || p.variants === null) {
    return {
      table: false,
      lines: [
        ...tooMany,
        {
          kind: "line",
          text: "The individuals are counted once a variants file is open.",
        },
      ],
    };
  }
  const variantsName = escaped(p.variants.name);
  const fileName = escaped(p.individuals?.name ?? "");
  const rowsLine: CountsLine = {
    kind: "line",
    text: `Individuals in ${fileName} but not in ${variantsName}: ${grouped(counts.rowsNotInVariants ?? 0)}`,
  };
  const shownFirst = firstShown(counts, wait, variantsName, fileName, p);
  return {
    table: shownFirst.table,
    lines: [...tooMany, ...shownFirst.lines, rowsLine],
  };
}

/** The warning of too many values of `counts`, or none. */
function tooManyWarning(counts: PopulationCounts): CountsLine[] {
  if (!counts.tooMany || counts.column === null) return [];
  return [
    {
      kind: "warning",
      text: `${shown(counts.column)} has ${grouped(counts.numValues)} different values, too many for a column of populations: the individuals are counted here only for a column of 20 different values or fewer. If it is not the column of the populations, choose another in the list.`,
    },
  ];
}

/** What `countsShown` shows between the warning of too many values and
    the line of the rows, once the variants file is read. */
function firstShown(
  counts: PopulationCounts,
  wait: PassWait,
  variantsName: string,
  fileName: string,
  p: Project,
): CountsShown {
  if (counts.tooMany) return { table: false, lines: [] };
  const none = counts.noneInFile;
  if (none !== null) {
    const numIndividuals =
      p.variants?.read.kind === "read" ? p.variants.read.individuals.length : 0;
    const whom =
      numIndividuals === 1
        ? `the one individual of ${variantsName} is not in ${fileName}, so it is unclassified`
        : `none of the ${grouped(numIndividuals)} individuals of ${variantsName} is in ${fileName}, so all of them are unclassified`;
    return {
      table: false,
      lines: [
        {
          kind: "warning",
          text: `${whom}. The first column of ${fileName} has to hold their names as ${variantsName} writes them: ${variantsName} starts with ${shown(none.firstOfVariants)}, and ${fileName} with ${shown(none.firstOfFile)}.`,
        },
      ],
    };
  }
  const unclassified = counts.unclassified;
  if (!counts.known || unclassified === null) {
    return {
      table: counts.populations.length > 0,
      lines: [{ kind: "line", text: waitingText(wait, variantsName) }],
    };
  }
  const classified = counts.populations.reduce(
    (sum, { kept }) => sum + (kept ?? 0),
    0,
  );
  if (classified === 0 && unclassified.kept > 0) {
    return {
      table: false,
      lines: [{ kind: "line", text: allUnclassifiedText(unclassified.kept) }],
    };
  }
  return {
    table: counts.populations.length > 0,
    lines:
      unclassified.kept === 0
        ? []
        : [
            {
              kind: "line",
              text: unclassifiedText(unclassified, counts.column, fileName),
            },
          ],
  };
}

/** Why the counts wait for the one pass over the variants file
    `variantsName`, escaped. */
function waitingText(wait: PassWait, variantsName: string): string {
  switch (wait) {
    case "running":
      return `The individuals the filters keep are counted once ${variantsName} is read to the end.`;
    case "stopped":
      return `Not counted: the reading of ${variantsName} was stopped. Start it again in the box of ${variantsName} to count the individuals the filters keep.`;
    case "failed":
      return `Not counted: ${variantsName} could not be read to the end; the box of ${variantsName} says why.`;
  }
}

/** The line of every one of the `numKept` individuals kept unclassified. */
function allUnclassifiedText(numKept: number): string {
  return numKept === 1
    ? "The one individual kept is unclassified."
    : `All ${grouped(numKept)} individuals kept are unclassified, and the analyses per population will take them as one population.`;
}

/**
 * The line of the unclassified kept, some individuals being classified:
 * their count, then each cause with its count, a cause of 0 left out, and
 * the count of a cause dropped when it is the only one; with both causes,
 * the names of those not in the file in a sentence of their own, so that
 * they are not read as of both: "Unclassified, left out of the analyses
 * per population: 7 individuals kept, 3 with an empty cell in popcat and
 * 4 that are not in panel_pops.csv. Not in panel_pops.csv: s031, s044,
 * s102 and 1 more; the tab Individuals file lists them all."
 */
function unclassifiedText(
  unclassified: NonNullable<PopulationCounts["unclassified"]>,
  column: string | null,
  fileName: string,
): string {
  const { missingCell, notInFile } = unclassified;
  const cell = column === null ? "" : `an empty cell in ${shown(column)}`;
  const outside = `${notInFile.length === 1 ? "is" : "are"} not in ${fileName}`;
  const start = "Unclassified, left out of the analyses per population: ";
  if (notInFile.length === 0) {
    return `${start}${counted(missingCell, "individual")} kept with ${cell}.`;
  }
  if (missingCell === 0) {
    return `${start}${counted(notInFile.length, "individual")} kept that ${outside}: ${namesShown(notInFile)}`;
  }
  return `${start}${counted(unclassified.kept, "individual")} kept, ${grouped(missingCell)} with ${cell} and ${grouped(notInFile.length)} that ${outside}. Not in ${fileName}: ${namesShown(notInFile)}`;
}

/** The names of individuals with the full stop that ends them, past
    `MAX_NAMED` the count of the rest and where they all are: "s031,
    s044, s102 and 1 more; the tab Individuals file lists them all." */
function namesShown(names: readonly string[]): string {
  const words = names.slice(0, MAX_NAMED).map(shown);
  if (names.length <= MAX_NAMED) return `${bothOf(words)}.`;
  return `${bothOf([...words, `${grouped(names.length - MAX_NAMED)} more`])}; the tab ${INDIVIDUALS_BOX_NAME} lists them all.`;
}

/** What the tab "Individuals file" shows: no file; a read under way,
    `options` when the last read of the load was of a text file, so that
    the selects of the options stay drawn; a file refused, `options` when
    it was read as text; or a file read, `options` for a text file and,
    for an xlsx, the line of its first sheet. */
export type IndividualsTabShows =
  | { readonly kind: "none"; readonly text: string }
  | {
      readonly kind: "reading";
      readonly text: string;
      readonly options: boolean;
    }
  | {
      readonly kind: "refused";
      readonly text: string;
      readonly options: boolean;
    }
  | {
      readonly kind: "read";
      readonly options: boolean;
      readonly sheetLine: string | null;
    };

/** What the tab shows of `individuals`, whose last read of the same load
    id was of the format `lastFormat`, or null when it had none. What the
    file is comes from its read, never from its name. */
export function individualsTabShows(
  individuals: IndividualsSource | null,
  lastFormat: TableFormat | null,
): IndividualsTabShows {
  if (individuals === null) {
    return { kind: "none", text: NO_INDIVIDUALS_FILE_TAB };
  }
  const name = escaped(individuals.name);
  const read = individuals.read;
  switch (read.kind) {
    case "pending":
      return {
        kind: "reading",
        text: `Reading ${name}.`,
        options: lastFormat === "text",
      };
    case "failed":
      return {
        kind: "refused",
        text: `${name} could not be read; the box Individuals file says why.`,
        options: read.format === "text",
      };
    case "read":
      return {
        kind: "read",
        options: read.found !== null,
        sheetLine:
          read.found === null ? firstSheetText(individuals.name) : null,
      };
    case "notGiven":
      throw new Error(
        "popnei_web defect: popgen2.html has an individuals file not given, which only an opened project file makes.",
      );
  }
}

/** The heading of the individuals of the variants file `variantsName`
    that the individuals file `fileName` does not have, before the
    filters. */
export function notInFileHeading(
  variantsName: string,
  fileName: string,
): string {
  return `Individuals in ${escaped(variantsName)} but not in ${escaped(fileName)}, before the filters`;
}

/** The name of the table of the individuals file `name`, for a screen
    reader. */
export function tableLabel(name: string): string {
  return `The table of ${escaped(name)}`;
}

/**
 * What the status region says of the read of the individuals file of
 * `p`, with the individuals kept `kept`: for a table, "panel_pops.csv
 * read: 200 rows, the populations from popcat." or "…, no column chosen
 * for the populations.", then the warning the box shows, if any, of too
 * many values or of none of the individuals in the file, and the line of
 * no column qualified; for a refusal, the words of the box; null with no
 * file or a file being read.
 */
export function individualsReadAnnouncement(
  p: Project,
  kept: IndividualsKept | null,
): string | null {
  const individuals = p.individuals;
  if (individuals === null) return null;
  const read = individuals.read;
  if (read.kind !== "read") {
    return read.kind === "failed" ? individualsBoxNeeds(p) : null;
  }
  const column = columnShown(p);
  const said = [
    `${escaped(individuals.name)} read: ${counted(read.table.rows.length, "row")}, ${
      column === null
        ? "no column chosen for the populations."
        : `the populations from ${shown(column)}.`
    }`,
  ];
  const counts = populationCounts(p, kept);
  if (counts !== null) {
    const warnings = countsShown(p, counts, "running").lines.filter(
      (line) => line.kind === "warning",
    );
    said.push(...warnings.map((warning) => `Warning: ${warning.text}`));
  }
  const noColumn = noColumnQualifiedText(p);
  if (noColumn !== null) said.push(noColumn);
  return said.join(" ");
}
