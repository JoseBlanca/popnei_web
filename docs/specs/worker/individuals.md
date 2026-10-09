# The reader of the individuals file

25 September 2026, approved by the owner on 25 September 2026, and
revised for stage 4 and the owner's decisions until 29 September 2026,
as the opening of this spec at commit d10cc1b lists them. Revised on 9
October 2026 for `docs/designs/input-page.md`, approved by the owner
that day, which made table_io the reader of the file: what the light
worker did with the text of a CSV and with the cells of an xlsx is now
done by table_io's package, by the same rules, which moved into
table_io's specs; what stays here is how the light worker loads that
package, makes of what it gives the table and the types the project
holds, or a refusal, and the words of each refusal. The rules of the
bytes, the encoding, the separator, the rows and the cells, the decimal
mark and the xlsx, which this spec held until then, are table_io's
`docs/specs/import.md`, `text-files.md` and `values.md`, in
`github.com/JoseBlanca/table_io`, checked out at `~/devel/xlsx_rs`.
Built on the branch `individuals-file` on 9 October 2026, work packages
1 and 2 of `docs/plans/input-page.md`; not yet tried by the owner, so no
round of theirs has changed it yet.

The reader turns the file of the individuals, a CSV, a TSV or an xlsx,
the metadata file of population genetics or the traits file of
association, into the table the project holds, and infers the type of
each of its columns. It runs in the light worker, the second thread of
the tab that reads the files of the user and holds no popnei, so that a
file of 10,000 rows does not freeze the page. This spec covers
`src/worker/individualsFile.ts`, which reads the bytes, calls table_io
and makes its answer a plain value; `src/worker/individuals/columnTypes.ts`,
the inference of the types; and the light worker's runner,
`src/worker/filesRunner.ts`, which loads table_io's package and answers
the page. It develops the rows `individuals/` and `filesRunner.ts` of
section 9 of `docs/architecture.md` and its section 6, "The individuals
file" and "The files wasm", with their paragraphs of 9 October 2026, and
depends on `docs/specs/worker/protocol.md`, for the table, the types of
the columns and the options of a CSV, and on `docs/specs/core/project.md`,
which records what the reader gives into the project and words its
refusals.

**table_io's package**, which this spec and `docs/architecture.md` call
the **files wasm** as they called xlsx_rs's, is the release
`js-v0.2.0-dev.1`,
`https://github.com/JoseBlanca/table_io/releases/download/js-v0.2.0-dev.1/table_io-0.2.0.tgz`,
named by that URL in `package.json` under the name `table_io`, as popnei
is (`docs/technology.md`, section 5). Its declarations,
`wasm/table_io.d.ts` of the package, are the contract: `importTable`,
which takes the bytes of a file, the largest file and the largest sheet
accepted, and the three options of a text file, and gives a `TableRead`;
and `TableRead`, a table or a refusal, whose fields are properties and
whose columns are read with methods, and which is freed with `free()`.
Its README, in the package, says all a caller needs, and this spec
names what it uses of it.

A load id, as `docs/specs/core/project.md` says, is the random name the
page gives each pick of a file, new at every pick. A read is recorded
into the project only under the load id and the options of the CSV it
was asked with, and the entry of the page asks for one whenever the
project holds a file whose read is pending (`docs/architecture.md`,
section 6, "Who asks for a read"). So the reader is asked to read a file
once for each set of options, and it knows nothing of the project, the
variants or the other reads.

## What it does

A user opens their file and sees, beside it, how it was read, "Read as
Windows-1252, separator `;`, decimal comma", the table, and on the old
page the type of each column; and chooses the column that defines the
populations. What goes wrong because of the reader is seen there, or
later, and some of it is not seen at all:

- a file read with the wrong separator is one column wide, or refused
  with a line whose cells do not match the header;
- a file decoded with the wrong encoding shows `EspaÃ±a` for `España`,
  and its individuals with accents in their names do not match those of
  the variants;
- a decimal mark read wrong makes a column of heights text, categorical,
  where it should be continuous, which the association analysis, the
  GWAS, would later refuse or misuse;
- a refusal whose words name the wrong place, "line 7" in an xlsx, or
  offer the options of a CSV beside an xlsx, sends the user looking for
  what is not there.

The names of the individuals, the first column, are always text as
written, so `001` stays `001` and matches the variants.

### The read by table_io

1. A file of more than 20 MB, `MAX_INDIVIDUALS_FILE_BYTES`, 20,000,000
   bytes, is refused before its bytes are read, `tooLarge`, as before:
   table_io sees the bytes only once they are in the memory of its wasm,
   which never shrinks, so a file is never handed to it to be measured.
   A table of 10,000 individuals with 100 columns of 10 characters is
   about 11 MB; a larger file is usually the variants file picked by
   mistake.
2. The bytes are read with `file.arrayBuffer()`; when the browser cannot
   read them, the read fails with `unreadable`, as before. A file
   changed on the disk after it was picked may be refused so by the File
   API; what each browser does was to be checked by hand, and is not
   known.
3. The files wasm is loaded, on the first read of the worker
   ("Loading the files wasm on first need", below). When it cannot be,
   the read fails with `readerNotLoaded`, the browser's message for the
   console. Since the client ends the worker after every read of a file
   that is not empty, each such read is the first of its worker.
4. `importTable(bytes, MAX_INDIVIDUALS_FILE_BYTES, MAX_SHEET_CELLS,
   encoding, separator, decimal)`: the bytes as a `Uint8Array`, never an
   `ArrayBuffer`, which table_io reads as no bytes; `MAX_SHEET_CELLS`,
   2,000,000, the largest rectangle of a sheet, as before; and the three
   options of the source's `csv`, each `"auto"` given as `""`, `"utf-8"`
   and `"windows-1252"` as they are, the separators `","`, `";"` and
   `"\t"` as `"comma"`, `"semicolon"` and `"tab"`, the marks `"."` and
   `","` as `"point"` and `"comma"`. A source with `csv` `null`, which
   only a project saved before 9 October 2026 holds for an xlsx, is read
   with the three `""`. table_io finds the format from the first bytes,
   a zip as an xlsx, the compound file of the old Office as `oldExcel` or
   `encrypted`, anything else as text; the options serve a text file and
   are checked, not used, for an xlsx.
5. What it gives is read once, each field and each column into a
   variable, since every read of a field copies it out of the wasm, and
   freed in a `finally`, whatever follows, a throw of ours included.
6. **A table**, `refusal` `""`, is made the table of the project:
   - the header, the name of the column of the names, `namesHeader`,
     which may be empty, then `columnName(index)` of each other column,
     in their order;
   - each row, the name of its individual, `names[row]`, then, for each
     other column, its value at that row: `null` when
     `columnMissing(index)[row]` is 1; otherwise, by `columnType(index)`,
     the text of `columnTexts`, the boolean of `columnBooleans`, 1 being
     `true`, the number of `columnFloats`, and the number of
     `columnIntegers`, a `bigint` made a `Number`. An integer column one
     of whose values is beyond `Number.MAX_SAFE_INTEGER`, 2^53 − 1, in
     either sign, is kept whole as texts instead, each value
     `String(bigint)`, its digits as table_io read them, a leading `+`
     and leading zeros gone: a number of JavaScript cannot hold such a
     value exactly, and two identifiers that differ in their last digit
     would become one. The design argued it (`docs/designs/input-page.md`,
     "What the switch to table_io changes").
   - `found`: for `format` `"text"`, the encoding table_io used,
     `"utf-8"`, `"utf-16"` or `"windows-1252"`, the separator and the
     decimal mark mapped back as in point 4, and `undecodedLine`, or
     `null` for `undefined`; for `format` `"xlsx"`, `null`, as before.
   - the types, `inferColumnTypes(table, found?.decimal ?? ".")`, below.
7. **A refusal** is the failed read of its kind, with the format table_io
   found, `"text"` or `"xlsx"`, or `null` for its `unreadable`, whose
   format is `""` ("The refusals and their words", below).

The rules by which the cells become values are table_io's, and the
same as this spec's of 29 September 2026, from which they were written:
a missing value is an empty cell, `NA` or `-`, exactly, and in an xlsx
the seven errors of Excel calamine knows; spaces at the ends of a cell
are removed; blank rows are skipped; the first row that is not blank is
the header, with the empty cells at its end whose columns hold no value
dropped; the first column names the individuals, none empty and none
twice; a VCF picked by mistake is refused, `variantsFile`. Run side by
side under node over 420,000 random files, table_io and the reader of
TypeScript gave the same table or the same refusal in every one but a
file of UTF-16 that starts with its mark three times (table_io's
`docs/reports/table-io.md`, 2 October 2026).

What a user sees change from the reader of TypeScript:

- the values of a CSV's numeric columns are numbers: `007` is 7 and
  `1,75` the number 1.75, which the screens write with the decimal mark
  of the read, `1,75` again; `TRUE` and `true` of one column are the
  boolean `true`. The names of the individuals stay text as written;
- a CSV named `.xlsx` is read as the CSV it is, where it was refused as
  `notXlsx`, and an xlsx named `.csv` is read as the xlsx it is, where
  it was refused as `notText`;
- a CSV loads the files wasm, 0.34 MB gzipped at the first read of the
  worker, where it loaded nothing.

### The types of the columns

Each column gets one type, from its values, the cells that are not
missing, compared as text (`docs/functionality.md`, section 4). The
**text of a cell** is the cell itself when it is text, and, for a number
or a boolean, what JavaScript's `String` writes, `1`,
`0.30000000000000004`, `true`, with the point of a number made the
decimal mark of the read, `1,5` for a CSV read with the comma, as the
screens show it (`cellShown` of `docs/specs/core/project.md`), so that a
binary column never holds a value written otherwise than its cells are
shown. So a number 1 and a text `1` in one column
of an xlsx are one value, as the writers of the specs of stage 4
decided on 27 September 2026, which settles the open point this spec had
and which the owner may overrule (`docs/specs/stage-4-open-points.md`): a
column of Excel where some cells were typed as numbers and some pasted
as text would otherwise count each value twice, and a column of `0` and
`1` would not be binary. A number is read from the text with the decimal
mark of the read, the point for an xlsx. Since 9 October 2026 a CSV
gives numbers and booleans too, made by table_io from its integer, float
and boolean columns, so a column of a CSV whose values are `1`, `01` and
`1,0` holds the number 1 three times, one value, where it held three
texts. A column whose values are each written one way gets the type it
got before.

| type | when | example |
|---|---|---|
| identifier | the first column, always | `ind_001`, `001` |
| binary | exactly two distinct values | `case`/`control`, `0`/`1`, `1`/`2`, `P1`/`P2` |
| continuous | three distinct values or more, every one a number | `1,75`, `1,82`, `1,69`; a score from 1 to 5 |
| categorical | anything else: one value, no value, or three or more of which one is not a number | `España`, `Italia`, `Perú`; `12`, `15`, `n.d.` |

A binary column holds the text of its two values, the text `"1"` and
not the number 1 also for an xlsx, and which of the two is coded 1, the
case, proposed by these rules and changed by the user from stage 4:

1. Two numbers: the larger is 1, so `0`/`1` gives `1`, and `1`/`2` gives
   `2`, as in the phenotypes of plink, the common program of association,
   where 2 is the case.
2. Two words of a known pair, compared without regard to case: `case`
   over `control`, `yes` over `no`, `y` over `n`, `true` over `false`,
   `t` over `f`, `affected` over `unaffected`, `positive` over
   `negative`, `present` over `absent`, `sí` and `si` over `no`.
3. Otherwise, the value that comes second when the two are compared with
   `<`, by their code units, as `.claude/skills/coding/typescript.md`
   asks of an order that has to be the same in every browser: `Male` over
   `Female`, `P2` over `P1`.

The case is spelled `case` or `Case` in the file, and `one` holds it as
written.

A continuous column whose values are all whole numbers, their text
written as digits with an optional sign and no decimal mark or exponent, `12` and
`-3` but not `12,0` or `1e3`, and that has at most 20 distinct numbers,
counted by value, so `1`, `01` and `001` are one,
`MAX_FEW_WHOLE_LEVELS`, is continuous with a warning: such a column is
often a code, the populations numbered 1 to 12, or an ordinal score. 20
covers the scores of 1 to 5, 1 to 7 and 1 to 9, and the numbers of
populations of most collections; a measurement of few whole values, an
age in years, gets the warning too, which says only that the values may
be codes. It is the writer's choice, and moves only which columns get
the warning. The warning is not stored: the screen
asks for it with `columnWarnings`, from the table and its types, so that
it is the same for a table read now and one restored from a project file.
Its words, which `docs/specs/steps/individuals.md` shows beside the
column:

> "score holds only 5 different whole numbers, from 1 to 5, and is taken
> as a measurement. If they are codes, such as numbered populations, set
> its type to categorical."

and, for a column whose values are one number written in several ways,
`1`, `01` and `001`:

> "score holds only one whole number, 1, written in different ways, and
> is taken as a measurement. If it is a code, such as a numbered
> population, set its type to categorical."

and, for a column whose values are one number written in one way, `1`
in every cell, which the reader infers categorical, one value, and the
user can set continuous (`docs/specs/core/project.md`, "The types of the
columns"), since the warning is worked out from the types the column
has, set or inferred:

> "score holds only one whole number, 1, and is taken as a measurement.
> If it is a code, such as a numbered population, set its type to
> categorical."

The two sentences of one number are told apart by `numTexts`, the
number of distinct texts of the column, compared as text, as the values
of a binary column are.

The end of stage 2, "it can still be chosen as the column of the
populations", still holds and no longer says what to do: from stage 4
the user sets the type in the Individuals step, beside the warning
(`docs/specs/steps/individuals.md`, "The columns").

The name of the column is written as the warning holds it, and the
numbers as JavaScript writes them, `-3`, `12000`. The words are made by
`columnWarningText`; the "Warning: " before them is the screen's, which
`docs/specs/steps/individuals.md` puts there. The screen gives
`columnWarningText` the warning with the name of the column escaped, as
it shows every name of the file (`docs/specs/core/project.md`, "The
validation"), so that a character that reverses the text, U+202E, in a
name shows as `\u202e` and does not turn the rest of the sentence
around; the reader does not escape it, since it imports nothing of core.

The warning of few whole numbers changes with table_io for a CSV: a
cell is whole when it is a number that `Number.isInteger` takes, so a
column of `12,0` and `1e3`, numbers now, gets the warning on
`popgen.html`, where as texts it did not; and the sentence of one number
"written in different ways", told by more than one text, can no longer
come from a CSV read since 9 October 2026, whose `1`, `01` and `001` are
the one number 1, but only from an xlsx with texts beside its numbers
or a project saved before. The words do not change.

### When a type is wrong, in stage 2

The types are shown and not changed in stage 2, and no analysis of stage
2 reads them: the diversity per population needs only the column of the
populations, whose values are grouped as the text of the cells, whatever
the type of the column. So a type inferred wrong changes nothing that
stage 2 calculates. What the user can do:

- **Choose any column but the first as the column of the populations.**
  That the screen offers every column whatever its type is assumed of
  `docs/specs/steps/individuals.md`. Offered only binary and categorical
  columns, as the table of `docs/functionality.md` lists what each type
  is used for, a user whose populations are numbered 1 to 12 could not
  choose them until stage 4.
- **Set the decimal mark**, when a column of decimals was read as text.
- **Edit the file and load it again**, writing `P1` for `1`, for
  instance.

The types are saved in the project file (`docs/functionality.md`,
section 9), so a project saved in stage 2 holds the inferred ones, and
the user changes them from stage 4 onwards.


### The refusals and their words

A refusal is a value, never an exception: `readIndividualsFile` returns
it as the failed read, not as a failure of the request
(`.claude/skills/coding/worker.md`, "Errors are values"). The project
records it, and `src/core/project.ts` shows it as "pops.csv could not be
read: ‹what the reader found›." with what to do, ended by each page as
`docs/specs/core/project.md` says, "What an analysis needs of every
project" and "The words of a refusal on popgen2.html". The file is named
as each application names it, "a metadata file" in population genetics
and "a traits file" in association, and on `popgen2.html` "the
individuals file". This spec owns the words after the colon.

Every failed read carries the **format** of the file, `"text"` or
`"xlsx"`, as table_io found it from the bytes, or `null` when the file
was refused before table_io read it, `tooLarge`, `unreadable` and
`readerNotLoaded`, and for table_io's own `unreadable`, whose format it
does not know. The format, and not the name of the file nor whether the
source has options of a CSV, decides the words of a place, a line of a
text file or a row and a column of an xlsx as Excel names them, and
whether the screens offer the options of a CSV beside the refusal.

The kinds of table_io, each made a kind of `IndividualsFileError` with
the fields its words need, and the words:

| table_io's `refusal` | the kind and its fields | what the user reads after "could not be read:" |
|---|---|---|
| `empty` | `empty` | "it has no row of individuals" |
| `duplicateColumn` | `duplicateColumn`, `name` from `text` | "two columns are named pop" |
| `duplicateIndividual` | `duplicateIndividual`, `name` from `text` | "the individual ind_031 is in two rows" |
| `raggedRow` | `raggedRow`, `line`, `expected`, `found`, `separator` mapped back | "line 7 has 3 cells where the header has 4, read with the semicolon as the separator" |
| `unnamedColumn` | `unnamedColumn`, `column` | text: "column 4 has values but no name in the header"; xlsx: "column D has values but no name in the header" |
| `emptyIndividual` | `emptyIndividual`, `line` from `line`, or from `row` for an xlsx | text: "line 7 has no name of an individual in its first column"; xlsx: "row 7 has …" |
| `unclosedQuote` | `unclosedQuote`, `line`, `separator` mapped back | "the quote that opens a cell on line 7 is never closed, read with the comma as the separator" |
| `tooLarge` | `tooLarge`, `size`, `max` | as before, "it is 312.4 MB, more than the 20 MB a metadata file can have; check that it is the metadata file and not the variants"; table_io's own cannot come, since the size is checked first, and is mapped the same |
| `notText` | `notText` | "it is neither a text file, a CSV or a TSV, nor an Excel workbook (.xlsx)", in place of "it is not a text file; if it is an Excel workbook, …", since an xlsx under any name is now read |
| `variantsFile` | `variantsFile` | as before, "it is a variants file, which the Variants step takes"; `popgen2.html` has its own end |
| `cutShort` | `cutShort` | as before |
| `oldExcel` | `oldExcel` | "it is a workbook of Excel 97–2003; in Excel, save it as Excel Workbook (.xlsx)", without "although its name ends in .xlsx", since an `.xls` named `.csv` reaches it too |
| `encrypted` | `encrypted` | as before |
| `notWorkbook`, new | `notWorkbook` | "it is a zip file that holds no Excel workbook" |
| `emptySheet` | `emptySheet`, `sheet` | as before |
| `cellError` | `cellError`, `error` from `text` | as before |
| `headerError` | `headerError`, `row`, `column`, `error` from `text` | as before |
| `sheetTooLarge` | `sheetTooLarge`, `sheet`, `lastRow` `row + sheetRows − 1`, `lastColumn` the letters of `column + sheetColumns − 1`, `max` | as before |
| `unreadable` | `files`, `message` from `text` | as before, "it could not be read as an Excel workbook and may be damaged; open it in Excel and save it again"; the message to the console |
| `formatNotBuilt`, or a kind not in this list | none: a defect of ours, thrown, and the worker ends with `crashed` | |

And the two the light worker gives before table_io reads:

| kind | when | words |
|---|---|---|
| `unreadable` | the browser could not read the bytes | as before |
| `readerNotLoaded`, the old `xlsxReaderNotLoaded` renamed | the files wasm could not be downloaded or started, for any file | "the part of the application that reads tables could not be downloaded; check the connection and load the file again; if it fails again, the site may have been updated since this page was opened: save the project, reload the page and open the project again" on `popgen.html`; `popgen2.html` has its own, with no project to save |

The kind `notXlsx` goes: table_io reads a CSV named `.xlsx`. The other
words, the size in MB of one decimal rounded up, the separator named
"the comma", "the semicolon" or "the tab", and the end of `raggedRow`
and `unclosedQuote` in the Individuals step, "Choose another separator,
or load a corrected file.", are as before.

## The TypeScript interface

Every field is `readonly` and every array `readonly T[]` in the code;
`readonly` is left out here. The inference is unchanged, in
`src/worker/individuals/columnTypes.ts`, and core imports it as before:

```ts
export function cellText(cell: Cell, decimal: "." | ","): string | null;
export function cellNumber(cell: Cell, decimal: "." | ","): number | null;
export function columnLetters(column: number): string;   // 4 is "D"
export function inferColumnTypes(table: IndividualsTable, decimal: "." | ","): ColumnType[];
export const MAX_FEW_WHOLE_LEVELS = 20;
export interface ColumnWarning { kind: "fewWholeLevels"; column: string;
  numLevels: number; numTexts: number; min: number; max: number }
export function columnWarnings(table: IndividualsTable, columns: readonly ColumnType[],
  decimal: "." | ","): ColumnWarning[];
export function columnWarningText(warning: ColumnWarning): string;
```

The read of a file, in `src/worker/individualsFile.ts`, apart from the
runner so that Vitest runs it in node, with table_io's package loaded
from its bytes as its README says, or with an object of the test in its
place. It names no import of the package but its types, which the build
erases; only `filesRunner.ts` loads it. The lint's `filesWasm`, in
`eslint.config.js`, names `table_io` in the place of `xlsx_rs` and allows
the imports of its types alone, as `popneiValues` does for popnei; and
its rule of `import()`, `filesWasmImportCall`, names `table_io` too. The
type is imported under another name, `import type { TableRead as
TableIoRead } from "table_io"`, since core has a `TableRead` of its own
(`src/core/project.ts`).

```ts
export const MAX_INDIVIDUALS_FILE_BYTES = 20_000_000;
export const MAX_SHEET_CELLS = 2_000_000;       // moved from individuals/sheet.ts

export interface BytesSource { size: number; arrayBuffer(): Promise<ArrayBuffer> }

/** What of table_io's TableRead the light worker reads: the type of the
    package, `import type { TableRead } from "table_io"`, so that a
    release whose declarations lose a field fails the type check. */
export type TableReadFields = Pick<TableIoRead,
  "refusal" | "format" | "encoding" | "separator" | "decimal" | "undecodedLine"
  | "namesHeader" | "names" | "numColumns" | "columnName" | "columnType"
  | "columnMissing" | "columnIntegers" | "columnFloats" | "columnBooleans"
  | "columnTexts" | "line" | "row" | "column" | "expected" | "found" | "text"
  | "size" | "sheet" | "sheetRows" | "sheetColumns" | "free">;

/** table_io's importTable, once its package is loaded. */
export type ImportTable = (bytes: Uint8Array, maxBytes: number, maxCells: number,
  encoding: string, separator: string, decimal: string) => TableReadFields;

/** Loads the files wasm on first need and gives its importTable, or the
    browser's message when it could not be loaded; never rejects. */
export type LoadImporter = () => Promise<ImportTable | { notLoaded: string }>;

/**
 * Reads the individuals file `file` with the options `csv`, `null` read
 * as every option "auto": refuses a file above MAX_INDIVIDUALS_FILE_BYTES
 * before reading it, `tooLarge`; one the browser cannot read,
 * `unreadable`; with no files wasm, `readerNotLoaded`; otherwise gives
 * table_io's table, made as "The read by table_io" says, or its refusal.
 * Frees what table_io gives. Rejects for a defect of ours: a refusal or a
 * type of column it does not know, an Error that importTable throws,
 * which it throws only for an argument of ours out of its range, and a
 * trap of the wasm, WebAssembly.RuntimeError.
 */
export function readIndividualsFile(
  file: BytesSource, csv: CsvOptions | null, load: LoadImporter,
): Promise<IndividualsFileRead>;

/** The table and its found, or the refusal, of what importTable gave;
    pure, and frees nothing: readIndividualsFile frees. */
export function readOfTable(read: TableReadFields): IndividualsFileRead;
```

The answer, in `src/worker/messages.ts` (`docs/specs/worker/messages.md`),
whose failed read gains the format:

```ts
export type IndividualsFileRead =
  | { kind: "read"; table: IndividualsTable; columns: ColumnType[];
      found: CsvFound | null }                          // null for an xlsx
  | { kind: "failed"; error: IndividualsFileError;
      format: "text" | "xlsx" | null };                 // null: refused before table_io read it
```

The union of the refusals, in `src/worker/protocol.ts`
(`docs/specs/worker/protocol.md`), with `notXlsx` gone, `notWorkbook`
added and `xlsxReaderNotLoaded` renamed; a failed read is never saved in
a project file, which writes it as `notGiven`
(`docs/specs/core/projectFile.md`), so no project file holds the old
names:

```ts
export type IndividualsFileError =
  | { kind: "empty" }
  | { kind: "duplicateColumn"; name: string }
  | { kind: "duplicateIndividual"; name: string }
  | { kind: "raggedRow"; line: number; expected: number; found: number;
      separator: "," | ";" | "\t" }
  | { kind: "files"; message: string }                 // table_io's unreadable, for the console
  | { kind: "unnamedColumn"; column: number }          // from 1; of the sheet for an xlsx
  | { kind: "emptyIndividual"; line: number }          // the row of the sheet for an xlsx
  | { kind: "unclosedQuote"; line: number; separator: "," | ";" | "\t" }
  | { kind: "tooLarge"; size: number; max: number }
  | { kind: "unreadable"; message: string }            // the browser's, for the console
  | { kind: "notText" }
  | { kind: "variantsFile" }
  | { kind: "cutShort" }
  | { kind: "oldExcel" }
  | { kind: "encrypted" }
  | { kind: "notWorkbook" }                            // a zip that holds no workbook
  | { kind: "emptySheet"; sheet: string }
  | { kind: "cellError"; error: string }
  | { kind: "headerError"; row: number; column: number; error: string }
  | { kind: "sheetTooLarge"; sheet: string; lastRow: number; lastColumn: string; max: number }
  | { kind: "readerNotLoaded"; message: string };     // the browser's, for the console
```

The comment of `Cell` in `protocol.ts`, "numbers and booleans come only
from an xlsx", becomes "numbers and booleans come from the numeric and
boolean columns table_io finds, in any format".

The runner, `src/worker/filesRunner.ts`: it posts `ready` as it starts,
answers each `readIndividuals` with `readIndividualsFile` given the
`File`, the options the request carries and its `LoadImporter`, and
posts what it gives; it holds nothing between two reads but the files
wasm once loaded. A request is handled inside one `try`, and a throw
posts `crashed` and closes the worker, as before
(`docs/specs/worker/messages.md`, "A worker that cannot go on").

### Loading the files wasm on first need

As xlsx_rs's was, with its name changed (`.claude/skills/coding/worker.md`,
"The files wasm, on first need", which names table_io once this spec is
built):

- **On the first read of the worker**, of any file, and not when the
  worker starts: one promise, `filesReady ??= loadFiles()`, where
  `loadFiles` runs `await import("table_io")`, which Vite makes a file of
  its own, and awaits its default export, `init()`, which fetches
  `table_io_bg.wasm` from beside it. Its `importTable` is the
  `ImportTable` given. A later read awaits the same promise.
- **When it fails**, the promise is forgotten, `filesReady = null`, the
  read fails as `readerNotLoaded` with the browser's message, written to
  the console, and the worker goes on; the next read in the same worker,
  which follows only the read of an empty file, since the client ends
  the worker after any other, tries again, at
  another address after a failed `import()`, `?retry=‹n›`, as for
  xlsx_rs (the check `isFilesWasm` asks for `default` and `importTable`),
  since Chromium 153 keeps a failed import failed for the life of the
  worker and WebKit 26.6 does not.
- **A worker started again** imports it again. The client of the light
  worker ends it after every read of a file that is not empty, for the
  memory the wasm keeps (`docs/specs/worker/client.md`, "The light worker
  started again after a large read"), so every read imports the package
  and compiles it. Where the browser takes it from was seen on 9 October
  2026, three reads on the old page from the built site served with the
  headers GitHub Pages sends, `Cache-Control: max-age=600` and an ETag:
  Chromium 153 asked the server for each file once, at the first read,
  and took them from its cache after; WebKit 26.6 asked once for the
  JavaScript and three times for the `.wasm`, in full and with no
  question of whether it had changed, so a user of Safari downloads
  0.33 MB at every read of an individuals file; whether a read made with
  no connection then fails as `readerNotLoaded` was not tried. From vite preview, which sends
  `Cache-Control: no-cache`, Chromium asks again at each read and is
  answered with no body, WebKit the same for the JavaScript and the
  `.wasm` in full.

The download is the `.wasm`, 651,680 bytes and 330,416 gzipped with
`gzip -9`, and its JavaScript, 37,489 and 6,758, measured on the release
on 9 October 2026, 0.34 MB, where xlsx_rs's were 0.30 MB for an xlsx
alone. The screens show the file as being read from the pick until the
table arrives, the download included. The numbers are measured again on
the built site and written in the report of the plan.

## The cases

- **A file with no header, whose first row is an individual**: the first
  individual becomes the names of the columns; the user sees it in the
  table, and the check against the variants names that individual as
  missing, or, on `popgen2.html`, unclassified.
- **A VCF of less than 20 MB, not compressed**, picked by mistake:
  `variantsFile`. A gzipped VCF or a `.nei` file: `notText`.
- **A title line above the header**, `Tabla 1;;`: refused with "column 2
  has values but no name in the header", as before.
- **The user sets the separator to `,` on a file of `;`**: a row of the
  wrong length, or one column; the options under the refusal let them
  set it back, since the format is `"text"`.
- **An xlsx named `.csv`**: read as the xlsx it is; the screens show the
  line of the first sheet, not the options, by `found` `null`.
- **A CSV named `.xlsx`**: read as text, with its options.
- **An `.xls` named `.csv`**: `oldExcel`, format `"xlsx"`, so no options
  of a CSV are offered beside it.
- **A column of a CSV of `1`, `01` and `1,0`**, the decimal comma: the
  number 1 three times, one value, categorical, where the reader of
  TypeScript gave three texts and so categorical too.
- **A column of a CSV of `0` and `1`**: binary, one `"1"`, as before.
- **An integer column with the value 9007199254740993**, beyond 2^53:
  the whole column texts, `"9007199254740993"`; its type by the rules of
  the text, categorical for three values or more.
- **A column all missing**: text in table_io, `null` cells here,
  categorical, as before.
- **A read that comes back after the user changed the options, or
  picked another file**, is dropped by `recordIndividualsRead`, as
  before.
- **An Error thrown by importTable**, an argument out of its range, is a
  defect of ours, and ends the worker with `crashed`.

## How it runs

In the light worker, one read at a time. A read holds the bytes, in the
page's memory and copied into the wasm's, table_io's table in the wasm,
the columns copied out one at a time, and the table of the project, each
cell a value of JavaScript. table_io's report measured under node, at
its commit 87c8a86, up to 610.5 MB of the wasm's memory for a CSV of 20
MB of short cells, and 335.8 MB for 100 columns of `0`; a common file,
5,000 rows of 20 columns, is a hundred thousand cells, a few MB. The
memory of a wasm grows and never shrinks, so the light worker keeps what
its largest read took until it is ended; the client ends it after a read
of a file above `READ_RESTART_BYTES` (`docs/specs/worker/client.md`),
0, so after every read of a file that is not empty. The plan's rule,
applied to the measurement below, gives 0, since the file of 1 MB of
empty cells already gives back 50 MB or more in both engines. So each
read starts a new light worker, which imports and compiles table_io's
package again (the browser serves it from its cache).

What was measured on 9 October 2026, by `IN2 D2` of `e2e/measure.spec.ts`
(the plan of the input page, work package 2), on the owner's Mac, an
Apple M5 Pro of 64 GB, macOS 27.0.1, with Chromium 153 and WebKit 26.6
under Playwright 1.63.0, from the built site with `READ_RESTART_BYTES`
set to 25,000,000, the worker kept, and to 0, the worker ended, and the
machine at a load of 8 to 17 from other work. The CSVs had a header of
100 names over rows of a name and 99 cells, `0` or empty, the shapes of
table_io's report; each was read three times on the old page, each time
on a new page, and the numbers are the medians. Every file was read, the
20 MB ones too. "Kept" is what the engine's processes held 3 s after the
read with the worker kept, above what they held before it; "gives back"
is that less the same with the worker ended.

| file | engine | pick to table | kept | gives back |
|---|---|---|---|---|
| 1 MB, `0` | Chromium | 227 ms | 123.7 MB | 47.0 MB |
| 1 MB, empty | Chromium | 345 ms | 174.7 MB | 76.0 MB |
| 5 MB, `0` | Chromium | 833 ms | 305.3 MB | 77.8 MB |
| 5 MB, empty | Chromium | 1,470 ms | 495.0 MB | 212.5 MB |
| 20 MB, `0` | Chromium | 3,428 ms | 802.7 MB | 391.2 MB |
| 20 MB, empty | Chromium | 6,635 ms | 1,364.5 MB | 816.6 MB |
| 1 MB, `0` | WebKit | 380 ms | 285.1 MB | 32.4 MB |
| 1 MB, empty | WebKit | 570 ms | 405.7 MB | 51.9 MB |
| 5 MB, `0` | WebKit | 1,637 ms | 753.3 MB | 517.5 MB |
| 5 MB, empty | WebKit | 2,761 ms | 1,558.5 MB | 916.9 MB |
| 20 MB, `0` | WebKit | 9,968 ms | 3,144.4 MB | 1,473.8 MB |
| 20 MB, empty | WebKit | 13,107 ms | 4,615.3 MB | 3,326.7 MB |

The time from the pick to the table of `individuals_10000.xlsx`, the
median of five reads after a first one, was 235 ms in Chromium and 257
ms in WebKit with the worker kept, and 344 ms and 272 ms with it ended
after every read; that of `panel_pops.csv`, 29 ms and 15 ms kept, 30 ms
and 31 ms ended.

## How it is verified

With Vitest in node, at `readOfTable` with objects of the test in the
place of a `TableRead`, at `readIndividualsFile` with table_io's package
loaded from `node_modules/table_io/wasm/table_io_bg.wasm` by `init({
module_or_path: bytes })` as its README says, and at the functions of
`columnTypes.ts` as before.

At `readOfTable`, each object a literal and the literal read it gives:

| the object | gives |
|---|---|
| a table, `format` "text", "windows-1252", "semicolon", "comma", `undecodedLine` undefined, names `["A","B"]`, a float column `h` `[1.75, 0]` missing `[0,1]` | the header `[namesHeader, "h"]`, rows `["A", 1.75]`, `["B", null]`; found `windows-1252`, `;`, `,`, `undecodedLine` `null`; types from the comma |
| a table, `format` "xlsx" | `found` `null`; types from the point |
| an integer column `[1n, 2n]` | the numbers 1 and 2 |
| an integer column `[9007199254740993n, 1n]` | the texts `"9007199254740993"` and `"1"` |
| a boolean column `[1, 0]` | `true`, `false` |
| each refusal of the table above | its kind, its fields, and its format, `null` for `unreadable` |
| `formatNotBuilt`, and a `columnType` "date" | a throw each |

At `readIndividualsFile`, with the real package, on the files of
`e2e/fixtures/` and on bytes written into the test: `panel_pops.csv`
gives `popcat` text and the 200 rows; `panel_meta.csv` gives `altitude`
as numbers; `excel_en.xlsx` its five rows with `Altura` numbers and
`Afectado` booleans; `encrypted.xlsx`, `excel97.xls`,
`empty_first_sheet.xlsx`, `header_error.xlsx` and `getting_data.xlsx`
their kinds with format `"xlsx"`; `panel.nei` `notText`; the bytes of
`panel_pops.csv` given with the name `x.xlsx`, read as text; and every
case of the table of `readCsv` of this spec at commit d10cc1b, its text
encoded as UTF-8, gives the table it gave there, with the cells of a
numeric or boolean column as numbers or booleans, the same refusal, and
the same line. A source whose `size` is 20,000,001 is `tooLarge` with
`arrayBuffer` and the loader never called; a loader that gives
`notLoaded` gives `readerNotLoaded` with its message; `free()` is called
once whatever the read gives, counted with an object of the test.

The properties with fast-check of `inferColumnTypes`, that the types do
not depend on the order of the rows and that the first type is
identifier and no other is, stay. The property that a table written as
CSV reads back as itself is table_io's now, in its tests.

With Playwright, in the flows of the Individuals step of `popgen.html`
and of `popgen2.html` (`docs/specs/steps/popgen2-input.md`), in Chromium
and WebKit: a CSV read; the network log with one request of the
package's JavaScript and one of its `.wasm` at the first read, a CSV
included, and none before it; a second file read by a new worker, which
asks for each once more; the light worker ended after a read; the
`.wasm` answered with an error by the test, the words of
`readerNotLoaded`, and the route removed and the file opened again, the
table; the package's JavaScript answered with an error, the same, and
the next file read by a new worker, which asks at the address of the
build; and after the read of an empty file, which keeps its worker, the
next file read by that worker, with its second request at another
address in Chromium; `encrypted.xlsx` its words; and
`individuals_10000.xlsx`, the time from the pick to the table, written
in the report of the plan.

## What this spec relies on in the others

- `docs/specs/worker/messages.md`: `readIndividuals` carries the `File`
  and its `CsvOptions`, or `null`; its answer is `IndividualsFileRead`,
  whose failed read carries the format, which the check of the answer
  accepts as `"text"`, `"xlsx"` or `null`.
- `docs/specs/worker/client.md`: a refusal is `refused`, with its format;
  the light worker started again after a large read.
- `docs/specs/core/project.md`: the failed read with its format in the
  project, the words of each kind and their place by the format, the
  options of a CSV set for every load.
- table_io's package: the declarations of `js-v0.2.0-dev.1`; a newer
  release is a new URL, and a change of its declarations a change here.

## Open points

None of this revision. The open points of stage 2 and 4 of this spec
were decided, as its version at commit d10cc1b says.

## Not in this spec

- How a text file and an xlsx become a table, its encodings, separators,
  quotes, missing values, header and refusals: table_io's specs.
- The types changed by the user and the coding of a binary column:
  `setColumnType` of `docs/specs/core/project.md`.
- That every individual of the variants is in the file, on
  `popgen.html`: `individualsNeeds` of `docs/specs/core/project.md`; on
  `popgen2.html` such an individual is unclassified
  (`docs/specs/core/project.md`, "The counts per population on
  popgen2.html").
- The messages, the queue, the restart of the light worker:
  `docs/specs/worker/messages.md` and `client.md`.
