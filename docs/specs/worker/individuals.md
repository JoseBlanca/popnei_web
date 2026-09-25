# The reader of the individuals file

25 September 2026, approved by the owner on 25 September 2026; there is no
code yet. The reader turns the CSV or TSV file of the individuals, the
metadata file of population genetics or the traits file of association,
into the table the project holds, and infers the type of each of its
columns. It runs in the light worker, the second thread of the tab that
reads the files of the user and holds no popnei, so that a file of
10,000 rows does not freeze the page. This spec covers the module
`src/worker/individuals/`, which reads the text, the part of the light
worker that reads the bytes of the file and decodes them,
`src/worker/individualsFile.ts`, and the light worker's runner,
`src/worker/filesRunner.ts`, the code of the worker that answers the
page, as far as the walking skeleton needs it: CSV and TSV only. The
walking skeleton is stage 2 of `docs/build-order.md`, the smallest
application that goes through every part once; the xlsx and the files
crate, the small Rust module that reads them, come in stage 4. It
develops the rows `individuals/` and `filesRunner.ts` of section 9 of
`docs/architecture.md` and its section 6, "The individuals file", and
depends on `docs/specs/worker/protocol.md`, for the table, the types of
the columns and the options of a CSV, and on `docs/specs/core/project.md`,
which records what the reader gives into the project.

The variants file is the file of genotypes that the calculations read;
every individual it names must be in the individuals file, which core
checks, not the reader. The implementer is taken to have read
`docs/specs/core/project.md`, whose names, `recordIndividualsRead`,
`individualsNeeds`, `parseProject` and `IndividualsRead`, this spec uses.
A load id, as that spec says, is the random name the page gives each pick
of a file, new at every pick. A read is recorded into the project only
under the load id and the options of the CSV it was asked with, and the
entry of the page asks for one whenever the project holds a file whose
read is pending (`docs/architecture.md`, section 6, "Who asks for a
read"). So the reader is asked to read a file once for each set of
options, and it knows nothing of the project, the variants or the other
reads.

## What it does

A user picks their file in the individuals step and sees, beside it, how
it was read, "Read as Windows-1252, separator `;`, decimal comma", the
table, the type of each column, and a choice of the column that defines
the populations. What goes wrong because of the reader is seen there, or
later, and some of it is not seen at all:

- a file read with the wrong separator is one column wide, or refused
  with a line whose cells do not match the header;
- a file decoded with the wrong encoding shows `EspaÃ±a` for `España`,
  and its individuals with accents in their names do not match those of
  the variants;
- a decimal mark read wrong makes a column of heights text, categorical,
  where it should be continuous, which the association analysis, the
  GWAS, would later refuse or misuse;
- an identifier `001` read as a number becomes `1`, which matches no
  individual of the variants;
- a column wrongly inferred cannot be fixed by the user in stage 2, since
  the types are shown and not edited until stage 4, as the owner decided
  on 25 September 2026.

### The bytes and the encoding

The runner is given, in the request, the `File` the user picked and the
options of the CSV of the source, `encoding`, `separator` and `decimal`, each `"auto"`
until the user sets it (`CsvOptions`, `docs/specs/worker/protocol.md`).

1. A file of more than 20 MB, `MAX_INDIVIDUALS_FILE_BYTES`, 20,000,000
   bytes, is refused before it is read. A table of 10,000 individuals with
   100 columns of 10 characters is about 11 MB; a larger file is usually the
   variants file picked by mistake, and reading a VCF of gigabytes whole
   would end the worker for lack of memory. The table is also held whole
   in the project, the project file and the keys, which no file of this
   size has been tried on; the limit is an estimate, to be revised when
   one is.
2. The bytes are read with `file.arrayBuffer()`. When the browser cannot
   read them, the read fails with `unreadable`. The File API, the standard
   of the web for how a page reads a file the user picked, says that a
   file changed on the disk after it was picked cannot be read, so a user
   who picks `pops.csv`, fixes it in Excel and saves it, then changes the
   separator on the screen, gets this refusal and has to pick the file
   again. That the browsers do so has not been seen in any of them; one
that reads the new bytes instead gives the table of the file as it is
now, which is what the keys of the results are made from, so no result
is shown for a table other than the one on the screen.
3. A file that starts with the mark of UTF-16, the bytes `FF FE` or
   `FE FF`, is what Excel writes for "Unicode Text", tab separated. It is
   decoded as UTF-16, little endian after `FF FE` and big endian after
   `FE FF`, with `new TextDecoder("utf-16le")` or `"utf-16be"`, which
   remove the mark, and `found.encoding` is `"utf-16"`, shown as "Read as
   UTF-16". The mark says the encoding for certain, so it is read so
   whatever the encoding option says, and UTF-16 is not offered as a
   choice. No file is refused for its encoding, as the owner decided on
   24 September 2026, and the coordinator of the specs applied it to
   these files on 25 September 2026. Any other file with a byte 0 anywhere in it, the whole file being
   looked at, is
   not text, an xlsx, a gzipped VCF or a `.nei` file picked by mistake,
   and is refused as `notText`.
4. The three bytes `EF BB BF` at the start, the byte order mark of UTF-8,
   the BOM, which Excel writes in "CSV UTF-8", are removed, whatever the
   encoding.
5. With `"utf-8"`, the bytes are decoded with `new TextDecoder("utf-8")`,
   which puts the replacement character in the place of an invalid byte.
   With `"windows-1252"`, with `new TextDecoder("windows-1252")`, which
   gives a character for every byte and so never fails. With `"auto"`,
   first with `new TextDecoder("utf-8", { fatal: true })`, and when that
   throws, as Windows-1252: what Excel on Windows writes for "CSV (comma
   delimited)" in Spanish and the other languages of Western Europe
   (`docs/architecture.md`, section 6). A file of ASCII alone is the same
   text in both and is reported as UTF-8. A file in Windows-1252 is
   taken for UTF-8 only when its accented letters happen to form valid
   UTF-8, which needs pairs such as `Ã` followed by `±` wherever an
   accent is, and does not happen in a real text. No file is refused for its encoding, as the owner decided on
   24 September 2026.
6. The text goes to the reader, which removes a character U+FEFF at its
   start, so that a text given with its BOM, as a test may give it,
   reads the same.

### The separator

With a separator set, the file is read with it. With `"auto"`, the reader
counts the cells of each row with each of the three separators, a tab,
`;` and `,`, with the quotes of the next section, and without making the
cells. The blank rows of the next section are skipped here too, and the
header is the first row that is not blank. A separator fits the file
when it gives the header two cells or more and every row as many cells
as the header; a row with more cells,
whose cells past the header are all empty, fits too. A separator with
which a quote is never closed does not fit, since whether a `"` opens a
cell depends on the separator before it. Of the separators
that fit, the one that gives the header the most cells is taken, and on a
tie the tab, then `;`, then `,`, since a tab is the least likely of the
three to be inside a value. When none fits, the one that gives the header
the most cells is taken, with the same order on a tie, and the read then
refuses the row that does not fit, which names its line; when every
separator gives the header one cell, the file is read with `,`, as a file
of one column.

A Spanish Excel file, `Individuo;Población;Altura` over rows such as
`ind_001;España;1,75`, gives three cells to every line with `;`, and with
`,` one to the header and two to the rows, so `;` is taken.

### The rows and the cells

- **The lines** end with `\r\n`, `\n` or `\r`, the last being what old
  versions of Excel for Mac wrote. A line number counts every line of the file
  from 1, the header's included, blank ones and the lines inside a quoted
  cell too, so that it is the number an editor shows.
- **Quotes** are those of RFC 4180, the standard of
  CSV, as Excel writes them: a cell that
  starts with `"` goes on to the next `"` that is not doubled, and may
  hold the separator, a line break and `""`, which is one `"`. What
  follows the closing quote, up to the separator, is kept as part of the
  cell. A `"` inside a cell that does not start with one is an ordinary
  character. A quote that is never closed takes the rest of the file into
  one cell, and the file is refused as `unclosedQuote`, with the line
  where the cell starts.
- **Spaces**, U+0020, at the start and the end of a cell are removed, and
  so are tabs when the separator is not a tab; inside quotes they are
  kept. A file typed by hand as `ind_01, pop1` then reads `pop1`. The
  spaces before a cell are removed first, so `A, "x, y"` is two cells,
  `A` and `x, y`.
- **A blank row**, one whose cells are all empty, `;;;` among them, which
  Excel writes for rows it once formatted, is skipped, wherever it is.
- **The header** is the first row that is not blank, and gives the names
  of the columns, as text: `NA` in the header is a column named `NA`. A
  column whose name is empty and whose cells are all empty is dropped,
  which removes the columns Excel adds with a trailing separator. A
  column with an empty name and some value is refused, as
  `unnamedColumn`, with its number, counted from 1 in the file. Two
  columns of one name are refused, as `duplicateColumn`: the populations
  are chosen by the name of their column (`docs/specs/core/project.md`,
  "The grouping").
- **The rows** below the header are the individuals, in the order of the
  file. A row with fewer cells than the header, or with more whose
  extra cells are not all empty, is refused, as `raggedRow`, with its
  line, the cells it has and the cells of the header. The option not
  taken was to read a short row as ending in missing cells, as pandas
  does: a cell lost in the middle of a row would then move the values
  after it into the wrong columns, with no warning.
- **The first column names the individuals**, whatever its header says,
  an empty name included, as pandas' `to_csv` and R's `write.csv` write
  the column of the row names; it is never dropped, and `unnamedColumn`
  is of the other columns.
  Its cells are text, as written: `001` stays `001`, and `NA` and `-` are
  the names `NA` and `-`, since an individual is never missing. A row
  whose first cell is empty is refused, as `emptyIndividual`, with its
  line. An individual in two rows is refused, as `duplicateIndividual`,
  with its name. Names are compared exactly, `Ind_1` and `ind_1` being
  two individuals.
- **A missing value** in any other column is an empty cell, `NA` or `-`,
  exactly, quoted or not (`docs/functionality.md`, section 4), and is
  `null` in the table. `na`, `N/A` and `NaN` are text.
- **Every other cell is text, as written**, spaces removed; a CSV has no
  numbers (`Cell`, `docs/specs/worker/protocol.md`). A number is read out
  of the text with the decimal mark, below, when a type is inferred, and
  later by what uses the column.

When a file has several of these problems, the one reported is the first
in this order: an unclosed quote; no row below the header, `empty`, also
for a file with no line at all; a row of the wrong length, the first by
line; a column with no name, then two columns of one name, the first by
position; then, row by row in the order of the file, a row with no name
or an individual already seen.

### The decimal mark and the numbers

A cell is a number when its text is an optional sign, `+` or `-`, digits
with at most one decimal mark among or around them, `12`, `1,75`, `,5`,
`5,`, and, after them, an optional exponent, `e` or `E` with an optional
sign and digits, `1,2E-03`; and when the value is finite. Nothing else
is: no thousands separator, `1.234,5` is text, no space inside, no `%`,
no `Inf`.

With a decimal mark set, it is used. With `"auto"`, it is the point when
the separator is `,`. Otherwise the reader counts, in the cells below the
header and outside the first column, those that are numbers written with
a comma and those written with a point; the comma is taken when the
first count is larger, and the point otherwise, a file of whole numbers
among them. So a file of `1,75` and `1,82` is read with a comma, and a
file that mixes `1,75` and `1.82` is read with the mark most of its cells
use, and the others are text.

### The types of the columns

Each column gets one type, from its values, the cells that are not
missing, compared as text (`docs/functionality.md`, section 4):

| type | when | example |
|---|---|---|
| identifier | the first column, always | `ind_001`, `001` |
| binary | exactly two distinct values | `case`/`control`, `0`/`1`, `1`/`2`, `P1`/`P2` |
| continuous | three distinct values or more, every one a number | `1,75`, `1,82`, `1,69`; a score from 1 to 5 |
| categorical | anything else: one value, no value, or three or more of which one is not a number | `España`, `Italia`, `Perú`; `12`, `15`, `n.d.` |

A binary column holds its two values as they are in the table, the text
`"1"` and not the number 1, and which of the two is coded 1, the case,
proposed by these rules and changed by the user from stage 4:

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
   `Female`, `P2` over `P1`. Two numbers of one value, `1` and `1,0`,
   fall here too.

The case is spelled `case` or `Case` in the file, and `one` holds it as
written.

A continuous column whose values are all whole numbers, written as
digits with an optional sign and no decimal mark or exponent, `12` and
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
> as a measurement. If they are codes, such as numbered populations, it
> can still be chosen as the column of the populations."

and, for a column whose values are one number written in several ways,
`1`, `01` and `001`:

> "score holds only one whole number, 1, written in different ways, and
> is taken as a measurement. If it is a code, such as a numbered
> population, it can still be chosen as the column of the populations."

The name of the column is written as the warning holds it, and the
numbers as JavaScript writes them, `-3`, `12000`. The words are made by
`columnWarningText`; the "Warning: " before them is the screen's, which
`docs/specs/steps/individuals.md` puts there. The screen gives
`columnWarningText` the warning with the name of the column escaped, as
it shows every name of the file (`docs/specs/core/project.md`, "The
validation"), so that a character that reverses the text, U+202E, in a
name shows as `\u202e` and does not turn the rest of the sentence
around; the reader does not escape it, since it imports nothing of core.

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

A refusal is a value, never an exception: the reader returns a `Result`
(`.claude/skills/coding/typescript.md`, "Errors"), and the runner gives it
back as the result of the read, not as a failure of the request
(`.claude/skills/coding/worker.md`, "Errors are values"). The project
records it, and `individualsNeeds` of `src/core/project.ts` shows it as
"pops.csv could not be read: ‹what the reader found›. Load a metadata
file in the Individuals step.", with the file named as each application
names it, "a metadata file" in population genetics and "a traits file"
in association, as the owner decided on 25 September 2026, and the
names and counts shown as that
spec says (`docs/specs/core/project.md`, "What every analysis needs").
This spec owns the words after the colon, which settles **Open 5** of
that spec; the first four are the ones its meanwhile gave, but for the
words of `empty`, which change. Each is a kind of `IndividualsFileError`,
and the last six are new:

| kind | what the user reads after "could not be read:" |
|---|---|
| `empty` | "it has no row of individuals", for a file with a header alone and for one with nothing at all |
| `duplicateColumn` | "two columns are named pop" |
| `duplicateIndividual` | "the individual ind_031 is in two rows" |
| `raggedRow` | "line 7 has 3 cells where the header has 4, read with the semicolon as the separator" |
| `unnamedColumn` | "column 4 has values but no name in the header" |
| `emptyIndividual` | "line 7 has no name of an individual in its first column" |
| `unclosedQuote` | "the quote that opens a cell on line 7 is never closed, read with the comma as the separator" |
| `tooLarge` | "it is 312.4 MB, more than the 20 MB a metadata file can have; check that it is the metadata file and not the variants", with the name of the file of the application, "a traits file" in association |
| `unreadable` | "the browser could not read it; it may have been changed, moved or deleted since it was picked" |
| `notText` | "it is not a text file; in Excel, save the sheet as CSV" |

A size is in MB of 1,000,000 bytes, as macOS shows it, with one
decimal rounded up, so that a file of 20,000,001 bytes is "20.1 MB" and
never "20.0 MB, more than the 20 MB"; the limit, a whole number of MB, is
written with none.

The separator of `raggedRow` and `unclosedQuote` is the one the read
used, set or found, named as the select of the Individuals step names
it, the comma, the semicolon or the tab, since a wrong separator is the
likeliest cause of both and a failed read has no `found` to show it; the
owner decided on 25 September 2026 that the refusal says it. The
ending, "Load a metadata file in the Individuals step.", fits every
row: each is mended by picking a file again, the same one changed or
another, or, for the two of a separator, by setting the separator in
that step.

## The TypeScript interface

Every field is `readonly` and every array `readonly T[]` in the code;
`readonly` is left out here. The reader imports only types, those of
`src/worker/protocol.ts` and the `Result` of `src/core/result.ts`, and
builds its results as literals, as the lint of the worker asks
(`.claude/skills/coding/configs.md`).

The reader of the text, in `src/worker/individuals/csv.ts`. It gives the
table, the separator and the decimal mark it used, set or found, and the
types of the columns:

```ts
export interface CsvRead {
  table: IndividualsTable;
  columns: ColumnType[];          // one per column, the first identifier
  separator: "," | ";" | "\t";    // as set, or as found
  decimal: "." | ",";             // the same
}

export function readCsv(
  text: string,
  options: { separator: CsvOptions["separator"]; decimal: CsvOptions["decimal"] },
): Result<CsvRead, IndividualsFileError>;
```

The inference, in `src/worker/individuals/columnTypes.ts`, which the xlsx
of stage 4 calls too. `decimal` is the mark a text cell is read with; a
number cell of an xlsx is a number already.

```ts
/** The number a cell holds, or null: a missing cell, a text that is not a
    number by the rules above, a boolean. */
export function cellNumber(cell: Cell, decimal: "." | ","): number | null;

/** Throws a defect when a row is not as long as the columns. */
export function inferColumnTypes(table: IndividualsTable, decimal: "." | ","): ColumnType[];

export const MAX_FEW_WHOLE_LEVELS = 20;

/** A column taken as continuous whose values may be codes. */
export interface ColumnWarning {
  kind: "fewWholeLevels";
  column: string;                  // its name
  numLevels: number;               // its distinct numbers, by value, 1 to 20
  min: number;
  max: number;
}

/** The warnings of the columns, in the order of the table. Throws a
    defect when `columns` or a row is not as long as the columns. */
export function columnWarnings(
  table: IndividualsTable, columns: readonly ColumnType[], decimal: "." | ",",
): ColumnWarning[];

/** The words of a warning, without the "Warning: " the screen puts
    before them. */
export function columnWarningText(warning: ColumnWarning): string;
```

The read of a file, in `src/worker/individualsFile.ts`, which
`filesRunner.ts` calls with the `File`. It never rejects. It is apart
from the runner so that it runs under Vitest in node, where `Blob`,
`TextDecoder` and Windows-1252 exist and a worker does not; it is checked
with the worker's configuration, since the reader of the text may not
name `TextDecoder`.

```ts
export const MAX_INDIVIDUALS_FILE_BYTES = 20_000_000;

/** What of a File the read uses; a File and a Blob are one. */
export interface BytesSource { size: number; arrayBuffer(): Promise<ArrayBuffer> }

// In src/worker/messages.ts (docs/specs/worker/messages.md):
// type IndividualsFileRead =
//   | { kind: "read"; table: IndividualsTable; columns: ColumnType[]; found: CsvFound }
//   | { kind: "failed"; error: IndividualsFileError };

export function readIndividualsFile(file: BytesSource, csv: CsvOptions): Promise<IndividualsFileRead>;
```

`CsvFound.encoding` gains `"utf-16"`, which only the mark of a file
gives; `CsvOptions.encoding` does not, since the mark decides it.

`found` holds the three options used, set or found, so that the screen
shows them all; which of them were `"auto"` it knows from the `csv` of
the source. The comments of `CsvFound` in `protocol.ts` and of `found` in
`docs/specs/core/project.md` say it holds only what `"auto"` found,
which a `CsvFound`, whose three fields are all required, cannot be; they
are corrected to this when this spec is approved
(`docs/specs/stage-2-open-points.md`, "Changes to approved files"), and
`docs/specs/worker/messages.md` says it already. The client gives the
entry the read or the refusal, and the entry records it into the store
as the project's `IndividualsRead`, a read or a failure
(`docs/specs/entry.md`, "Who asks for a read").

The union of the refusals, in `src/worker/protocol.ts`, grows by six
kinds:

```ts
export type IndividualsFileError =
  | { kind: "empty" }
  | { kind: "duplicateColumn"; name: string }
  | { kind: "duplicateIndividual"; name: string }
  | { kind: "raggedRow"; line: number; expected: number; found: number;
      separator: "," | ";" | "\t" }                   // the one the read used
  | { kind: "files"; message: string }                 // the reader of xlsx, stage 4
  | { kind: "unnamedColumn"; column: number }          // counted from 1
  | { kind: "emptyIndividual"; line: number }
  | { kind: "unclosedQuote"; line: number;             // where the cell starts
      separator: "," | ";" | "\t" }
  | { kind: "tooLarge"; size: number; max: number }    // in bytes
  | { kind: "unreadable"; message: string }            // the browser's, for the console
  | { kind: "notText" };
```

`src/core/project.ts` learns them in two places: the words above, in
`individualsNeeds`, and the validation of a project file, which accepts a
failed read of each kind with its fields.

The runner, `src/worker/filesRunner.ts`, in stage 2: it posts its
`ready` as soon as it starts, and answers each `readIndividuals` by
calling `readIndividualsFile` with the `File` and the options the
request carries, and posting what it gives. It holds nothing between two
reads, and imports neither popnei nor the files wasm. The messages, and
what the worker does with a request that fails its check, are those of
`docs/specs/worker/messages.md`, "A worker that cannot go on": each
request is handled inside one `try`, a throw posts `crashed` and the
worker closes itself, and the worker's own `error` and
`unhandledrejection` handlers do the same, the `error` handler calling
`event.preventDefault()`, so that the browser does not pass the error on
to the page's window and its error bar (`docs/specs/entry.md`, "The
errors nothing else shows").

## The cases

- **A file with no header, whose first row is an individual**: nothing
  can tell it, and the first individual becomes the names of the
  columns. The user sees it in the table, and the check against the
  variants names that individual as missing from the file.
- **A VCF of less than 20 MB, not compressed**, picked by mistake: its
  first lines, `##fileformat=VCFv4.2` and the others, are not a table,
  so the file is refused as a row of the wrong length within its first
  lines, which names the line.
- **A title line above the header**: Excel writes it as `Tabla 1;;`, a
  header of three cells of which two are empty, and the file is refused
  with "column 2 has values but no name in the header", which leads the
  user to the first line. A title line of one cell, `Tabla 1`, gives the
  header one cell with every separator, so the file is read with `,`: it
  is refused at the first row with a comma, a decimal comma among them,
  or else reads as one column, the whole of each line a name, which the
  table on the screen shows.
- **The user sets the separator to `,` on a file of `;`**: a file with a
  decimal comma is refused at its first row with one, as a row of the
  wrong length. A file with no comma reads as one column, the whole line
  of each individual its name; nothing refuses it, since such a file is
  valid, and the screen shows a table of one column and the check
  against the variants lacks every individual.
- **A decimal comma set with the separator `,`**: the numbers can only
  be written in quotes, `"1,75"`, and they are read so.
- **The encoding set to UTF-8 on a Windows-1252 file**: every byte
  that is not valid is the replacement character, `Espa�a`, and the user
  sees it in the table.
- **A file saved by Excel for Mac**: what encoding it writes for "CSV" has
  not been checked. If it is Mac Roman, which older versions wrote, an
  accented name is read as other characters by both encodings offered;
  the populations are still grouped, and a name with an accent does not
  match the variants.
- **An individual named `NA`**, or `-`: it is the name `NA`, since the
  first column has no missing values.
- **A binary column whose values are `1` and `01`**: two values as text,
  so binary, and both numbers of one value, so the rule of code units,
  and `1` is coded 1.
- **A column that is all missing** is categorical, with no value; as the
  column of the populations it puts every individual in none, which the
  screen of the individuals step says.
- **A read that comes back after the user changed the options, or picked
  another file**, is dropped by `recordIndividualsRead`, by its load id
  and options (`docs/specs/core/project.md`, "The records"); the reader
  does nothing for it.

## How it runs

In the light worker, one read at a time, as the queue of the client gives
them (`.claude/skills/coding/worker.md`, "The queue"). A read holds the
bytes, the text, which a string of JavaScript holds in one or two bytes
a character, and the cells; the separators are tried by
counting, without making cells, so that the cells are made once. For a
file of 20 MB that is 20 MB of bytes, 20 to 40 MB of text, and the
cells, a few times the text: an estimate, not measured.

A file of 10,000 rows and 20 short columns is 1 to 2 MB. Reading it in the
worker does not freeze the page, whatever it takes; the table then
crosses to the page as a copy, 200,000 short strings, and the page
records it and shows it. That the page stays usable while it does, and
how long the whole takes, is measured in the Playwright flow of stage 2
in Chrome, over a file of 10,000 rows made by the test, and written in
the report of the plan; the screen draws no row of the table, only its
columns with their first values (`docs/specs/steps/individuals.md`, "The
columns").

With a CSV or TSV, the light worker loads no wasm at all
(`docs/architecture.md`, section 6).

## How it is verified

With Vitest in node, at `readCsv`, `cellNumber`, `inferColumnTypes`,
`columnWarnings` and `readIndividualsFile`, the highest functions that run without a
worker, and in the browser with Playwright.

A table of cases at `readCsv`, each a literal text and the literal table,
types and options it gives, or the refusal. Among them, with `\n` for a
line break:

| text | options | gives |
|---|---|---|
| `id,pop\nA,P1\nB,P2\nC,P1\n` | auto | `,` `.`; columns `id`, `pop`; types identifier, binary one `P2` zero `P1` |
| `id\tpop\nA\tP1\n` | auto | tab |
| `id;h\nA;1,5\nB;1,7\nC;1,9\n` | auto | `;` `,`; `h` continuous, cells `"1,5"` |
| `id;h\nA;1.5\nB;1,7\nC;1,9\n` | auto | `,`, and `h` categorical, since `1.5` is text |
| `id,x\n001,1\n002,2\n003,3\n` | auto | first cells `"001"`, `"002"`, `"003"`; `x` continuous |
| `id,st\nA,case\nB,control\nC,\nD,NA\n` | auto | `st` binary, one `case`, zero `control`; cells of C and D `null` |
| `id,g\nA,1\nB,2\n` | auto | `g` binary, one `"2"`, zero `"1"` |
| `id,s\nA,1\nB,2\nC,3\nD,5\n` | auto | `s` continuous; `columnWarnings` gives `s`, 4 levels, 1 to 5 |
| `id,n\nA,"x, y"\nB,"say ""hi"""\n` | auto | cells `x, y` and `say "hi"` |
| `id,n\r\nA,1\r\n\r\nB,2\r\n` and the same with `\r` alone | auto | the same table as with `\n`, the blank line skipped |
| `id;pop;;\nA;P1;;\n` | auto | columns `id`, `pop` |
| `id,pop\nA,P1\nB\n` | auto | `raggedRow`, line 3, expected 2, found 1, separator `,` |
| `id,pop\n,P1\n` | auto | `emptyIndividual`, line 2 |
| `id,pop\nA,P1\nA,P2\n` | auto | `duplicateIndividual`, `A` |
| `id,pop,pop\nA,1,2\n` | auto | `duplicateColumn`, `pop` |
| `id,,pop\nA,1,P1\n` | auto | `unnamedColumn`, 2 |
| `id,pop\nA,"P1\nB,P2\n` | `,` | `unclosedQuote`, line 2, separator `,` |
| `id,pop\n` and the empty text | auto | `empty` |
| `\uFEFFid,pop\nA,P1\n` | auto | column `id`, not `\uFEFFid` |
| `id;n\tx\nA;1\t2\n` | auto | both fit with two cells: the tab, by the order of a tie |
| `id,pop\nA,P1\nB,P2,P3\n` | auto | none fits; `,` gives the header the most cells, and the read is `raggedRow`, line 3, expected 2, found 3, separator `,` |
| `id,n\nA,"x\ny"\nB,1,2\n` | auto | `raggedRow` at line 4, the line of `B`, since the quoted cell spans lines 2 and 3 |
| `only\nA\nB\n` | auto | `,`, one column, types identifier |

At `cellNumber`, with a comma: `12` is 12, `-1,75` is −1.75, `,5` is
0.5, `5,` is 5, `1,2E-03` is 0.0012, and `1.234,5`, `1,5 `, `Inf`,
`1e999`, `-`, `NA` and `null` give `null`, as do `1,5` with a point and
`true`.

At `readIndividualsFile`, over bytes written into the test as literals,
in a `Blob`:

- a Spanish Excel file in Windows-1252, `Individuo;Población;Altura` and
  four rows such as `ind_001;España;1,75`, with `ó` as the byte `F3` and
  `ñ` as `F1`, and `\r\n`: found Windows-1252, `;`, comma; the header
  `Población`; the cells `España`; `Altura` continuous;
- the same file as UTF-8 with its BOM, found UTF-8 and the same table;
- the same file with the encoding set to UTF-8: the cells `Espa�a`;
- the same file as UTF-16 little endian, `FF FE` and two bytes a
  character, and as big endian, `FE FF`: found UTF-16 and the same
  table, also with the encoding set to Windows-1252; the bytes `PK\x03\x04` and a
  byte 0: `notText`;
- a source whose `size` is 20,000,001 and whose `arrayBuffer` the test
  counts: `tooLarge`, and `arrayBuffer` never called;
- a source whose `arrayBuffer` rejects with a `DOMException` named
  `NotReadableError`: `unreadable`.

Properties, with fast-check (`.claude/skills/coding/testing.md`):

- **A table written as CSV reads back as itself.** The tables made:
  header names distinct and not empty; first cells distinct and not
  empty; other cells `null` or a text that is not empty, `NA` or `-`; no
  name or text with a space at its ends, nor a tab when the separator is
  not a tab; no U+FEFF at the start of the first name. Each is written
  with any of the three
  separators and any of the three line endings, a `null` as an empty
  cell, and every cell that holds the separator, a quote or a line break
  in quotes. Read with that separator set, it gives the same table. Read
  with `"auto"`, when the header has two columns or more and no cell
  holds any of the three separators, the separator found is the one
  written.
- **The types do not depend on the order of the rows**: `inferColumnTypes`
  of a table and of the same table with its rows shuffled are equal, the
  coding of a binary column included.
- **The first type is identifier and no other is**, and a binary type's
  two values are the two distinct values of its column, which is what
  `parseProject` checks of a project file (`docs/specs/core/project.md`).

With Playwright, in the flow of stage 2: a CSV loaded through the page,
the table and "Read as" shown, and no request for any wasm from the light
worker in the network log (`.claude/skills/coding/worker.md`, "What is
tested where"); and the measurement of the file of 10,000 rows, above.
That a file changed on the disk gives `unreadable` is checked by hand in
Chrome, Firefox and Safari, since a test cannot change a file the page
has picked, and what each browser did is written in the report of the
plan.

## What this spec relies on in the others

- `docs/specs/worker/messages.md`: `readIndividuals` carries the `File`
  and its `CsvOptions`, `{ kind: "readIndividuals", id, file, csv }`, with
  no other message that gives the worker a file, and its answer is an
  `IndividualsFileRead`, the union that spec declares.
- `docs/specs/worker/client.md`: the client sends that request to the
  light worker, gives a refusal of the reader as `refused` and a crash
  of the worker as `failed`, and the entry records the second as `{ kind:
  "worker" }` (`docs/specs/entry.md`).
- `docs/specs/entry.md`: the entry asks for a read of a pending source
  with its load id and the options of its `csv`, and records the answer
  with `store.individualsRead` under those, which records it with
  `recordIndividualsRead` of `project.ts`.
- `docs/specs/steps/individuals.md`: it shows the options used, from
  `found`, and which were `"auto"`; no row of the table, only its columns
  with their first values; the types, read only; the warnings of
  `columnWarnings` with the words above; and offers every column but the
  first as the column of the populations, whatever its type; it takes
  `.csv`, `.tsv` and `.txt` files in stage 2.

What this spec changes in `src/worker/protocol.ts` and
`src/core/project.ts`, which are approved, is listed in
`docs/specs/stage-2-open-points.md`, "Changes to approved files", to be
approved with this spec: the six kinds of refusal of
`IndividualsFileError`, their words in `individualsNeeds`, the new words
of `empty`, and their fields in the validation of a project file; the
field `separator` of `raggedRow` and `unclosedQuote`, with its words and
its check; the name of the file of each application in the reasons;
`CsvFound.encoding`, which gains `"utf-16"`, in `protocol.ts` and in the
check of `found` when a project file is opened; and the comment of
`CsvFound`, which says all three options.

## Open points

The open points of the eleven specs of stage 2 are gathered in
`docs/specs/stage-2-open-points.md`. The one this spec had was decided
by the owner on 25 September 2026, and is written above as decided: a
refused row names the separator it was read with (point O there), a
field `separator` on `raggedRow` and `unclosedQuote`, which changes
those two kinds in the approved `protocol.ts` and their check in a
project file in the approved `project.ts`.

One is open, to be settled before the reader of xlsx of stage 4 is
written. "The types of the columns" compares the values of a column as
text, so that a number 1 of an xlsx and a text `1` in the same column
would be one value; `inferColumnTypes` compares the cells as they are,
and counts them as two, so that such a column of `1`, `1` as text and
`2` is continuous and not binary. A CSV gives only text, so stage 2 is
not touched.

## Not in this spec

- The xlsx, read by the files crate, and how its cells, numbers and
  booleans among them, and a number in the first column, become the
  table: stage 4, with the crate.
- The types changed by the user, the coding of a binary column, and the
  roles of the traits file: `setColumnType` of
  `docs/specs/core/project.md`, and the screens of stages 4 and 7.
- Who turns the text of a continuous column into numbers for the GWAS
  and the covariates, with `cellNumber` and the decimal mark of the
  project: the specs of stage 7.
- That every individual of the variants is in the file:
  `individualsNeeds` of `docs/specs/core/project.md`.
- The messages, the queue, the restart of the light worker:
  `docs/specs/worker/messages.md` and `client.md`.
