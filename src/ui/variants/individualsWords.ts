/**
 * The words of the box and of the tab of the individuals file on
 * popgen2.html (docs/specs/steps/popgen2-input.md, "The box of the
 * individuals file", "The Individuals tab" and "Its words"): the counts
 * with no file, the list of the column of the populations, the counts and
 * the lines under them, the line of the rows not used in the tab, what the tab shows from the read and its format, and
 * what the status region says of a read. Pure, so that a test in node
 * checks them; the widgets draw them.
 */
import type { IndividualsKept } from "../../core/individualsKept.ts";
import type { Key } from "../../core/keys.ts";
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
import type { IndividualsSource, Project } from "../../core/project.ts";
import type { AppState } from "../../core/store.ts";
import type {
  IndividualsTable,
  JobResult,
  TableFormat,
} from "../../worker/protocol.ts";
import type { LiveAnalysisName } from "../analyses/status.ts";
import { withVerb } from "../analyses/words.ts";
import { firstSheetText, sizeText } from "../steps/individuals/words.ts";
import { chainButton, chainStatuses } from "./chain.ts";

/** The heading of the box of the individuals file; "Individuals file"
    until 11 October 2026. */
export const INDIVIDUALS_BOX_NAME = "Individuals";

/** What the tab of the individuals file says with no individuals file. */
export const NO_INDIVIDUALS_FILE_TAB = "No individuals file open.";

/** The one row of the counts with no individuals file, whose individuals
    are all unclassified. */
export const UNCLASSIFIED_ROW = "Unclassified";

/** What the box shows of the counts with no individuals file: the
    individuals kept, every one unclassified, or null while the count waits
    for the one pass, and the line of why it waits. */
export interface NoFileCounts {
  readonly kept: number | null;
  readonly lines: readonly CountsLine[];
}

/** The counts of `p`, a project with no individuals file, with the
    individuals kept `kept` and, while they are not known, why they wait,
    `wait`; null before its variants file has given its individuals, and
    when it could not be opened, so that the box holds its button alone
    (the owner, 11 October 2026). */
export function noFileCounts(
  p: Project,
  kept: IndividualsKept | null,
  wait: PassWait,
): NoFileCounts | null {
  const variants = p.variants;
  if (p.individuals !== null || variants?.read.kind !== "read") return null;
  const list = kept?.list;
  if (list?.kind !== "known") {
    return {
      kept: null,
      lines: [
        { kind: "line", text: waitingText(wait, escaped(variants.name)) },
      ],
    };
  }
  return {
    kept: (list.individuals ?? variants.read.individuals).length,
    lines: [],
  };
}

/** The heading drawn in the box in place of the lines of the file open
    when their code throws, under the box's "Individuals". */
export const INDIVIDUALS_LINES_NAME = "What the individuals file holds";

/** The heading drawn in the tab "Individuals" in place of what it
    shows when its code throws. */
export const INDIVIDUALS_TAB_CONTENT_NAME =
  "How the individuals file was read and what it holds";

/** The heading drawn in the box in place of the zone that opens an
    individuals file when its code throws. */
export const OPENING_INDIVIDUALS_ZONE_NAME = "Opening an individuals file";

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

/**
 * What the box says of the one file `name` dropped, pasted or picked
 * while `running`, a live analysis that reads the populations, runs:
 * "other.csv was not opened: the populations cannot change while the
 * diversity runs. Stop the diversity in the Populations tab, then open
 * other.csv again." A folder, a piece of text or several files get the
 * words they get when the zone does not wait
 * (docs/specs/steps/popgen2-input.md, "While the diversity runs").
 */
export function notOpenedWhileRunningText(
  name: string,
  running: LiveAnalysisName,
): string {
  return `${escaped(name)} was not opened: the populations cannot change while ${withVerb(running, "runs", "run")}. Stop ${running.name} in the ${running.tab} tab, then open ${escaped(name)} again.`;
}

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
    otherwise, and while the file is not read. When the list offers no
    column at all, as a file of semicolons read with the comma gives, the
    line names the separator of a text file, or asks for a column in an
    xlsx, or, when the other columns hold only true or false, asks for a
    column, since "Choose it in the list" would send the user to a list of
    "None" alone. */
export function noColumnQualifiedText(p: Project): string | null {
  const individuals = p.individuals;
  if (individuals?.read.kind !== "read" || columnShown(p) !== null) {
    return null;
  }
  const read = individuals.read;
  const name = escaped(individuals.name);
  if (populationColumnChoices(read).length === 0) {
    if (read.table.columns.length > 1) {
      return `${name} has no column of text to choose as the column of the populations: its other columns hold only true or false. Add a column of the populations to it and open it again.`;
    }
    return read.found === null
      ? `${name} has no column to choose as the column of the populations besides the names of the individuals. Add a column of the populations to it and open it again.`
      : `${name} was read as a single column, the names of the individuals, so it has no column of the populations to choose. If its columns are separated by another character, choose that separator in the Individuals tab.`;
  }
  return defaultPopulationsColumn(read) === null
    ? `No column of ${name} holds text with 20 different values or fewer, so none was chosen as the column of the populations. Choose it in the list.`
    : null;
}

/** The name of the table of the counts, of the variants file
    `variantsName`, for a screen reader alone: the screen has shown no
    caption since 11 October 2026. */
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
    user stopped it, or it failed. Read only while the variants file is
    read and the list of the individuals kept is not known. */
export type PassWait = "running" | "stopped" | "failed";

/** Why the counts of `s` wait for the one pass, read while the variants
    file is read and the list of the individuals kept is not known, so
    never for an opening of the variants file that failed, whose box
    shows no counts (`countsShown`): "failed" when a member of the chain
    of the pass failed;
    "stopped" when the box offers Start again, which `startedUnder` of
    autoRuns.ts tells from the key of the member it would start
    (`chainButton`); "running" otherwise, while the pass runs or is about
    to start by itself. */
export function passWaitOf(
  s: AppState<JobResult, unknown>,
  startedUnder: (key: Key) => boolean,
): PassWait {
  const statuses = chainStatuses(s.analyses);
  if (statuses.some((status) => status.kind === "error")) return "failed";
  return chainButton(statuses, startedUnder)?.kind === "run"
    ? "stopped"
    : "running";
}

/** A line under the list: words, or a warning, whose words follow the
    "Warning: " that the widget writes. */
export interface CountsLine {
  readonly kind: "line" | "warning";
  readonly text: string;
}

/** The table of the counts the box draws: none; a row per population;
    or, when the column classifies none of the individuals of the
    variants file, as None does, the one row "Unclassified", with the
    individuals kept, as with no individuals file. */
export type CountsTable = "none" | "populations" | "unclassified";

/** What the box shows of the counts: the table drawn, and the lines
    under it, or in its place, in their order. */
export interface CountsShown {
  readonly table: CountsTable;
  readonly lines: readonly CountsLine[];
}

/**
 * What the box shows of `counts`, the counts of `p`, an individuals file
 * read: before the variants file is read, the warning of too many values
 * if any and the line of the counts to come; once it is read, the
 * warning of too many values, the warning of none of the individuals in
 * the file, the line of why the counts wait, `wait`, while the list of
 * the individuals kept is not known, or the table with the line of the
 * unclassified kept if any, the first of these that holds; the table is
 * the one row "Unclassified" when the column classifies nobody. The line of the rows of the file
 * the variants file does not have is the Individuals tab's,
 * `rowsNotUsedText`.
 */
export function countsShown(
  p: Project,
  counts: PopulationCounts,
  wait: PassWait,
): CountsShown {
  const tooMany = tooManyWarning(counts);
  if (!counts.variantsRead || p.variants === null) {
    return {
      table: "none",
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
  const shownFirst = firstShown(counts, wait, variantsName, fileName, p);
  return {
    table: shownFirst.table,
    lines: [...tooMany, ...shownFirst.lines],
  };
}

/** The line of the Individuals tab of the rows of the individuals file
    of `p` that name no individual of its variants file, from its counts
    `counts`: "Individuals in panel_pops.csv but not in panel.nei: 18";
    null when there are none, and before the variants file is read
    (the owner, 11 October 2026). */
export function rowsNotUsedText(
  p: Project,
  counts: PopulationCounts,
): string | null {
  const numRows = counts.rowsNotInVariants;
  if (numRows === null || numRows === 0 || p.variants === null) return null;
  return `Individuals in ${escaped(p.individuals?.name ?? "")} but not in ${escaped(p.variants.name)}: ${grouped(numRows)}`;
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

/** What `countsShown` shows after the warning of too many values, once
    the variants file is read. */
function firstShown(
  counts: PopulationCounts,
  wait: PassWait,
  variantsName: string,
  fileName: string,
  p: Project,
): CountsShown {
  if (counts.tooMany) return { table: "none", lines: [] };
  const none = counts.noneInFile;
  if (none !== null) {
    const numIndividuals =
      p.variants?.read.kind === "read" ? p.variants.read.individuals.length : 0;
    const whom =
      numIndividuals === 1
        ? `the one individual of ${variantsName} is not in ${fileName}, so it is unclassified`
        : `none of the ${grouped(numIndividuals)} individuals of ${variantsName} is in ${fileName}, so all of them are unclassified`;
    return {
      table: "none",
      lines: [
        {
          kind: "warning",
          text: `${whom}. The first column of ${fileName} has to hold their names as ${variantsName} writes them: ${variantsName} starts with ${shown(none.firstOfVariants)}, and ${fileName} with ${shown(none.firstOfFile)}.`,
        },
      ],
    };
  }
  // A column that classifies nobody, None among them, has the one row of
  // the unclassified, as no individuals file has (the owner, 11 October
  // 2026), and no line under it.
  const table = counts.populations.length > 0 ? "populations" : "unclassified";
  const unclassified = counts.unclassified;
  if (!counts.known || unclassified === null) {
    return {
      table,
      lines: [{ kind: "line", text: waitingText(wait, variantsName) }],
    };
  }
  return {
    table,
    lines:
      table === "unclassified" || unclassified.kept === 0
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
      return `Not counted: the reading of ${variantsName} was stopped. Start it again in the box Variants to count the individuals the filters keep.`;
    case "failed":
      return `Not counted: ${variantsName} could not be read to the end; the box Variants says why.`;
  }
}

/**
 * The line of the unclassified kept, some individuals being classified:
 * their count, then each cause with its count, a cause of 0 left out, and
 * the count of a cause dropped when it is the only one; with both causes,
 * the names of those not in the file in a sentence of their own, so that
 * they are not read as of both: "Unclassified, left out of the analyses
 * per population: 7 individuals kept, 3 with an empty cell in popcat and
 * 4 that are not in panel_pops.csv. Not in panel_pops.csv: s031, s044,
 * s102 and 1 more; the Individuals tab lists them all."
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
    s044, s102 and 1 more; the Individuals tab lists them all." */
function namesShown(names: readonly string[]): string {
  const words = names.slice(0, MAX_NAMED).map(shown);
  if (names.length <= MAX_NAMED) return `${bothOf(words)}.`;
  return `${bothOf([...words, `${grouped(names.length - MAX_NAMED)} more`])}; the Individuals tab lists them all.`;
}

/** What the tab "Individuals" shows: no file; a read under way,
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
        text: `${name} could not be read; the box Individuals says why.`,
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

/** What the menu "Download…" of the table of the individuals file
    `name` downloads, after "Download ": "the table of panel_pops.csv". */
export function tableWhat(name: string): string {
  return `the table of ${escaped(name)}`;
}

/** The line over the table of the individuals file, its size, "200
    rows, 2 columns", with "Sorting…" after it while a sort is drawn,
    which takes tenths of a second at 10,000 rows. */
export function tableSizeText(
  table: IndividualsTable,
  sorting: boolean,
): string {
  return sorting ? `${sizeText(table)}. Sorting…` : sizeText(table);
}

/**
 * What the status region says of the read of the individuals file of
 * `p`, with the individuals kept `kept`: for a table, "panel_pops.csv
 * read: 200 rows, the populations from popcat." or "…, no column chosen
 * for the populations.", then the warning the box shows, if any, of too
 * many values or of none of the individuals in the file, the line of no
 * column qualified, and the count of the rows that name no individual of
 * the variants file, whose line is in the Individuals tab; for a refusal, the words of the box; null with no
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
  if (counts !== null) {
    const notUsed = rowsNotUsedAnnounced(p, counts);
    if (notUsed !== null) said.push(notUsed);
  }
  return said.join(" ");
}

/** What the status region says of the rows of the individuals file of
    `p` that name no individual of its variants file, from its counts
    `counts`, since the line that counts them is in the Individuals tab,
    which may not be shown: "18 individuals in panel_pops.csv are not in
    panel.nei, as the Individuals tab says."; null when `rowsNotUsedText`
    gives no line, and after the warning of none of the individuals in
    the file, which says as much. */
function rowsNotUsedAnnounced(
  p: Project,
  counts: PopulationCounts,
): string | null {
  const numRows = counts.rowsNotInVariants;
  if (
    rowsNotUsedText(p, counts) === null ||
    numRows === null ||
    counts.noneInFile !== null
  ) {
    return null;
  }
  const verb = numRows === 1 ? "is" : "are";
  return `${counted(numRows, "individual")} in ${escaped(p.individuals?.name ?? "")} ${verb} not in ${escaped(p.variants?.name ?? "")}, as the Individuals tab says.`;
}
