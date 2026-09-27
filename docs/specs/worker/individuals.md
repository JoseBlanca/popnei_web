# The reader of the individuals file

25 September 2026, approved by the owner on 25 September 2026; built in
`src/worker/individuals/` and `src/worker/individualsFile.ts`; revised
the same day for the owner's decisions on the reviews of work packages
2 to 6 and 8 of `docs/plans/walking-skeleton.md`, which its report lists
at its end: the empty cells at the end of a header, a variants file
picked by mistake, the byte order mark of UTF-8 with a bad byte, a
UTF-16 file cut short, and a column with no name whose cells are all
missing. Revised on 27 September 2026 for stage 4 of
`docs/build-order.md`: the xlsx, whose cells the files crate reads
(`docs/specs/worker/files.md`) and this reader makes into the table, with
its refusals; the types inferred from the cells compared as text, which
settles the last open point of this spec; and `readIndividualsFile`,
which takes an xlsx; and again the same day, to agree with the specs
written beside it: the end of the warnings of a column of few whole
numbers, now that the user sets the types, the words of `notText`, now
that an xlsx is read, and the two functions of the inference that core
calls; and after the review of the specs of stage 4, the warning of a
column of one number written in one way, which the user set continuous.
The revision is not approved yet. The reader turns
the file of the individuals, a CSV, a TSV or an xlsx, the
metadata file of population genetics or the traits file of association,
into the table the project holds, and infers the type of each of its
columns. It runs in the light worker, the second thread of the tab that
reads the files of the user and holds no popnei, so that a file of
10,000 rows does not freeze the page. This spec covers the module
`src/worker/individuals/`, which reads the text, the part of the light
worker that reads the bytes of the file and decodes them,
`src/worker/individualsFile.ts`, and the light worker's runner,
`src/worker/filesRunner.ts`, the code of the worker that answers the
page: CSV and TSV from the walking skeleton, stage 2 of
`docs/build-order.md`, the smallest application that goes through every
part once, and the xlsx from stage 4. The files crate, the small Rust
module that reads the cells of an xlsx, and how the light worker loads
it, are `docs/specs/worker/files.md`. It
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
   these files on 25 September 2026. A UTF-16 file whose bytes after the
   mark are odd in number, or whose last two bytes are the first half of
   a character written in four, ends in the middle of a character. It is
   refused as `cutShort`, with no line, since the cut is at the end of
   the file and not on a line the user could look at, as the owner
   decided on 25 September 2026: such a file was most often cut short on
   its way, and a table read from it would lack its last rows without a
   word. Any other file with a byte 0 anywhere in it, the whole file
   being looked at, is not text, an xlsx, a gzipped VCF or a `.nei` file
   picked by mistake, and is refused as `notText`.
4. The three bytes `EF BB BF` at the start, the byte order mark of UTF-8,
   the BOM, which Excel writes in "CSV UTF-8", are removed, whatever the
   encoding. With `"auto"`, the BOM decides UTF-8, as the mark of UTF-16
   decides UTF-16: the file is decoded as with `"utf-8"`, below, and a
   bad byte in it is the replacement character, as the owner decided on
   25 September 2026. Read as Windows-1252 whole, as a file without the
   mark would be, every accented letter of a "CSV UTF-8" with one
   damaged byte would come out wrong.
5. With `"utf-8"`, the bytes are decoded with `new TextDecoder("utf-8")`,
   which puts the replacement character, U+FFFD, shown as �, in the place
   of an invalid byte. With `"windows-1252"`, with `new
   TextDecoder("windows-1252")`, which gives a character for every byte
   and so never fails. With `"auto"` and no BOM,
   first with `new TextDecoder("utf-8", { fatal: true })`, and when that
   throws, as Windows-1252: what Excel on Windows writes for "CSV (comma
   delimited)" in Spanish and the other languages of Western Europe
   (`docs/architecture.md`, section 6). A file of ASCII alone is the same
   text in both and is reported as UTF-8. A file in Windows-1252 is
   taken for UTF-8 only when its accented letters happen to form valid
   UTF-8, which needs pairs such as `Ã` followed by `±` wherever an
   accent is, and does not happen in a real text. No file is refused for its encoding, as the owner decided on
   24 September 2026.
6. The line of the first replacement character of the text, counted as
   the reader counts its lines, below, is `found.undecodedLine`, and
   `null` when the text has none; the Individuals step shows a warning
   that names it, as the owner decided on 25 September 2026
   (`docs/specs/steps/individuals.md`, "Its words"). It comes from a bad
   byte of UTF-8, set or decided by the BOM, and from half of a
   character of UTF-16 in the middle of the file; Windows-1252 gives
   none. A U+FFFD that the file holds itself, written by a program that
   had already lost a character, is taken the same way, since it too
   stands where a character was lost.
7. The text goes to the reader, which removes a character U+FEFF at its
   start, so that a text given with its BOM, as a test may give it,
   reads the same.

### The separator

With a separator set, the file is read with it. With `"auto"`, the reader
counts the cells of each row with each of the three separators, a tab,
`;` and `,`, with the quotes of the next section, and without making the
cells. The blank rows of the next section are skipped here too, the
header is the first row that is not blank, and its cells are counted
without the empty ones at its end whose columns hold no value, as the
next section says. A separator fits the file
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

- **A variants file picked by mistake**: a text whose first line that
  is not blank, spaces and tabs at its start left out, starts with
  `##fileformat=VCF`, as every VCF starts, or with `#CHROM`, the header
  of its columns, is refused as `variantsFile`, whatever its separator,
  as the owner decided on 25 September 2026. A blank line is one of
  spaces and tabs alone, or of nothing; a VCF saved with an empty line
  above its first is still a VCF, and would otherwise be read as a table
  of one column. Read as a table,
  a VCF whose first lines have no comma would be one column wide, and
  the user would be told that every individual of the variants file is
  missing from it. A compressed VCF has a byte 0 and is `notText`
  before this.
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
  of the columns, as text: `NA` in the header is a column named `NA`.
  The empty cells at the end of the header whose columns hold no value
  in any row are dropped, and the header is counted without them, as
  the owner decided on 25 September 2026: a header `id;pop;;` over rows
  of such cells is a header of two, which is what the user sees in
  Excel, and a short row is measured against two. The run dropped is the
  longest at the end of the header whose every cell is empty and whose
  columns hold, in every row, an empty cell, `NA`, `-`, or no cell at
  all. A column with an empty name whose cells are all missing, empty,
  `NA` or `-`, is dropped too, wherever it is, as the owner decided the
  same day, since such a column has no values any more than one of
  empty cells, which Excel adds with a trailing separator. A column with
  an empty name and some value is refused, as `unnamedColumn`, with its
  number, counted from 1 in the file. The run of empty cells at the end
  of the header that is not dropped, because one of its columns has a
  value in some row, is checked so before the lengths of the rows: the
  user sees no name there, and a count of the header that took those
  cells in would be a number shown nowhere. `id;pop;;` over `a;1` and
  `b;2;3` is refused with "column 3 has values but no name in the
  header", and not with "line 2 has 2 cells where the header has 3".
  Two
  columns of one name are refused, as `duplicateColumn`: the populations
  are chosen by the name of their column (`docs/specs/core/project.md`,
  "The grouping").
- **The rows** below the header are the individuals, in the order of the
  file. A row with fewer cells than the header, counted as above, or
  with more whose cells past the whole header are not all empty, is
  refused, as `raggedRow`, with its
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
in this order: a variants file; an unclosed quote; no row below the header, `empty`, also
for a file with no line at all; a column with no name and a value in
the run of empty cells at the end of the header, the first by position;
a row of the wrong length, the first by line; a column with no name,
then two columns of one name, the first by position; then, row by row in the order of the file, a row with no name
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

### The xlsx

A source with no options of a CSV, `csv` `null`, is an xlsx
(`docs/specs/core/project.md`, `IndividualsSource`); the Individuals
step makes it so for a file whose name ends in `.xlsx`
(`docs/specs/steps/individuals.md`). Its read:

1. The size is checked as a CSV's, point 1 of "The bytes and the
   encoding", with the same 20 MB, and the bytes are read as there, point
   2. An xlsx is compressed, so 20 MB of it is a larger table than 20 MB
   of CSV; the size of the table is bounded by the next point.
2. The files crate reads the cells of the first sheet that is not hidden,
   the rectangle from its first to its last row and column with a value,
   each cell empty, text, number or boolean, dates and errors made text
   (`docs/specs/worker/files.md`, "Each cell"), or refuses the file. A
   rectangle of more than `MAX_SHEET_CELLS`, 2,000,000 cells, is refused,
   `sheetTooLarge`, at the first cell that makes it so, as the cells are
   read: a CSV of 20 MB holds about 1,800,000 cells of ten characters
   and a separator, so the limit lets an xlsx hold a table as large as a
   CSV can. It is an estimate, as the 20 MB is.
3. The rows of the rectangle go through the rules of "The rows and the
   cells", but those of the text of a CSV: no variants file, no line
   ending, no quote, no row of another length, since every row of the
   rectangle is as long as it. So a blank row is skipped, the header is
   the first row that is not blank, the empty cells at the end of the
   header whose columns hold no value are dropped, a column with no name
   and a value is refused, and so on, in the same order of refusals. The
   code of those rules is one, for the rows of a CSV and of an xlsx.
4. **A text cell** has its spaces and tabs at the ends removed, as a
   cell of a CSV outside quotes has, and is missing when it is then
   empty, `NA` or `-`, exactly. A cell with an error of Excel, `#N/A`, is
   its text and not missing (`docs/specs/worker/files.md`, **Open 1**
   there).
5. **A number or a boolean** stays one in the table, but in the header
   and in the first column, whose cells are names and so text: there it
   is written as JavaScript's `String` writes it, `1`, `1.5`, `true`, so
   that an individual stored by Excel as the number 1 is named `1`, and
   a column named by the year 2024 is `2024`. Its **text** is the same
   in every column, and is what the types compare, below.
6. The read gives `found` `null`: an xlsx has no encoding, separator or
   decimal mark to report, as `docs/specs/core/project.md` has it
   (`IndividualsRead`). The decimal mark of an xlsx is the point: a
   number of an xlsx is a number already, and a text cell is read as a
   number, when a type is inferred, with the point, as its text writes a
   number, `1.75`. A text `1,75` in an xlsx, which Excel did not take for
   a number when it was typed or pasted, is text.

A refusal of an xlsx names a row and a column as Excel does, so that the
user finds them: the row by its number in the sheet, and the column by
its number, A being 1, which the words write as Excel's letters. The
line of `emptyIndividual` is the row of the sheet, and the column of
`unnamedColumn` the column of the sheet, not of the rectangle.

### The types of the columns

Each column gets one type, from its values, the cells that are not
missing, compared as text (`docs/functionality.md`, section 4). The
**text of a cell** is the cell itself when it is text, and, for a number
or a boolean of an xlsx, what JavaScript's `String` writes, `1`,
`0.30000000000000004`, `true`. So a number 1 and a text `1` in one column
of an xlsx are one value, as the writers of the specs of stage 4
decided on 27 September 2026, which settles the open point this spec had
and which the owner may overrule (`docs/specs/stage-4-open-points.md`): a
column of Excel where some cells were typed as numbers and some pasted
as text would otherwise count each value twice, and a column of `0` and
`1` would not be binary. A number is read from the text with the decimal
mark of the read, the point for an xlsx. A CSV gives only text, so what
it reads is not changed.

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
   `Female`, `P2` over `P1`. Two numbers of one value, `1` and `1,0`,
   fall here too.

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
records it, and `src/core/project.ts` shows it as "pops.csv could not
be read: ‹what the reader found›." and what to do: beside a Run button,
`individualsNeeds` ends it "Load a metadata file in the Individuals
step."; in the Individuals step, `individualsStepNeeds` ends it by what
mends it there (`docs/specs/core/project.md`, "What an analysis needs of
every project"). The file is named as each application names it, "a
metadata file" in population genetics and "a traits file" in
association, as the owner decided on 25 September 2026, and the names
and counts are shown as that spec says. This spec owns the words after
the colon, which settles **Open 5** of that spec; the first four are the
ones its meanwhile gave, but for the words of `empty`, which change.
Each is a kind of `IndividualsFileError`, and the last eight are new:

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
| `notText` | "it is not a text file; if it is an Excel workbook, give it a name that ends in .xlsx", from stage 4, which reads an xlsx by the end of its name; stage 2 said "in Excel, save the sheet as CSV" |
| `variantsFile` | "it is a variants file, which the Variants step takes" |
| `cutShort` | "it ends in the middle of a character and may have been cut short" |

An xlsx is refused with the kinds of the rows and the cells that its
rows can meet, `empty`, `duplicateColumn`, `duplicateIndividual`,
`unnamedColumn` and `emptyIndividual`, with `tooLarge` and `unreadable`
as a CSV, and with its own, from stage 4. Of the first five, two speak
of a place, and for an xlsx they name it as Excel does: "row 7 has no name of an individual in its first
column" and "column D has values but no name in the header", the column
written with the letters of Excel, since a user looks for column D and
not for column 4. `src/core/project.ts` writes them so for a source whose
`csv` is `null`. The kinds of the xlsx, which only it gives, with the
words after "pops.xlsx could not be read:":

| kind | when | what the user reads after "could not be read:" |
|---|---|---|
| `notXlsx` | not a zip, as every xlsx is | "it is not an Excel workbook, although its name ends in .xlsx; if it is a CSV or a TSV, give it a name that ends in .csv" |
| `oldExcel` | a compound file of the old Office, not encrypted | "it is a workbook of Excel 97–2003, although its name ends in .xlsx; in Excel, save it as Excel Workbook (.xlsx)" |
| `encrypted` | saved with a password | "it is protected by a password; in Excel, save a copy without the password" |
| `emptySheet` | the first sheet that is not hidden has no value | "its first sheet, Hoja1, is empty, and only the first sheet is read; put the table in the first sheet" |
| `cellError` | a cell with an error calamine does not know | "a cell holds the error #SPILL!, which cannot be read; in Excel, find the cells with an error with Find & Select › Go To Special › Formulas › Errors, and correct the formula or replace it with its value" |
| `sheetTooLarge` | a rectangle of more than 2,000,000 cells | "its first sheet, Hoja1, has values as far as row 123 and column XFD, more than the 2,000,000 cells a metadata file can have; delete the values outside the table", "a traits file" in association |
| `xlsxReaderNotLoaded` | the files wasm could not be downloaded | "the part of the application that reads Excel files could not be downloaded; check the connection and load the file again; if it fails again, the site may have been updated since this page was opened: save the project, reload the page and open the project again" |
| `files` | calamine could not open it as a workbook | "it could not be read as an Excel workbook and may be damaged; open it in Excel and save it again" |

The message of `files` and of `xlsxReaderNotLoaded`, calamine's and the
browser's, is written to the console and not shown, as that of
`unreadable`: it is for whoever reports the problem, and says nothing a
user can act on.

A size is in MB of 1,000,000 bytes, as macOS shows it, with one
decimal rounded up, so that a file of 20,000,001 bytes is "20.1 MB" and
never "20.0 MB, more than the 20 MB"; the limit, a whole number of MB, is
written with none.

The separator of `raggedRow` and `unclosedQuote` is the one the read
used, set or found, named as the select of the Individuals step names
it, the comma, the semicolon or the tab, since a wrong separator is the
likeliest cause of both and a failed read has no `found` to show it; the
owner decided on 25 September 2026 that the refusal says it. The owner
decided the same day that in the Individuals step these two end "Choose
another separator, or load a corrected file.", since a wrong
separator is their likeliest cause and the separator is set in that
step; the owner took out, the same day, the "above" of the first
wording, since the options of the reader stand beside the refusal on a
wide screen and under it on a phone.

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

The reader of the cells of an xlsx, in `src/worker/individuals/sheet.ts`,
pure as `csv.ts` is: it takes the rectangle the files crate gave and
makes the table, by the rules of "The xlsx", with the rules of the rows
that it shares with `readCsv`.

```ts
/** The rectangle of a sheet, as the light worker makes it of what the
    files wasm gives (docs/specs/worker/files.md). */
export interface SheetCells {
  sheet: string;                  // the name of the sheet
  firstRow: number;               // as Excel numbers the rows, from 1
  firstColumn: number;            // column A is 1
  numColumns: number;
  cells: (string | number | boolean | null)[]; // row after row; numbers finite
}

/** What the light worker gets of an xlsx: its cells, or a refusal of the
    crate or of the download of the files wasm. */
export type SheetCellsRead =
  | { kind: "cells"; cells: SheetCells }
  | { kind: "failed"; error: IndividualsFileError };

export const MAX_SHEET_CELLS = 2_000_000;

/** The table and the types of the columns; throws a defect when `cells`
    is not a whole number of rows of `numColumns`. */
export function readSheet(
  sheet: SheetCells,
): Result<{ table: IndividualsTable; columns: ColumnType[] }, IndividualsFileError>;
```

The inference, in `src/worker/individuals/columnTypes.ts`, which
`readSheet` calls too. `decimal` is the mark a text is read with, the
point for an xlsx; a number cell of an xlsx is a number already.

```ts
/** The text of a cell by which the types compare it: a text as it is, a
    number or a boolean as String writes it; null for a missing cell. */
export function cellText(cell: Cell): string | null;

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
  numTexts: number;                // its distinct texts, compared as text; at least numLevels
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
`filesRunner.ts` calls with the `File`, the options of its CSV, `null`
for an xlsx, and the function that reads the cells of an xlsx with the
files wasm, which only `filesRunner.ts` may import
(`docs/specs/worker/files.md`, "How the light worker loads it"). It
rejects only when that function rejects, for a defect of ours, and then
the worker ends with `crashed`; a file it cannot read, or cannot
download the files wasm for, is a failed read. It is apart
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
//   | { kind: "read"; table: IndividualsTable; columns: ColumnType[];
//       found: CsvFound | null }                                  // null for an xlsx
//   | { kind: "failed"; error: IndividualsFileError };

/** Reads the cells of an xlsx; a refusal, a file calamine cannot open and
    a files wasm that could not be downloaded are a failed read; rejects
    only for a defect of ours, a result of the files wasm that breaks its
    contract (docs/specs/worker/files.md, readXlsxCells). */
export type XlsxReader = (bytes: Uint8Array) => Promise<SheetCellsRead>;

export function readIndividualsFile(
  file: BytesSource, csv: CsvOptions | null, readXlsx: XlsxReader,
): Promise<IndividualsFileRead>;
```

`CsvFound.encoding` gains `"utf-16"`, which only the mark of a file
gives; `CsvOptions.encoding` does not, since the mark decides it.
`CsvFound` gains `undecodedLine: number | null`, the line of the first
character that could not be decoded, shown as �, counted from 1 as a
refusal counts its lines, or `null` when every character was decoded
("The bytes and the encoding", point 6). It is in `found` and not
beside it because it is a fact of the decoding of a text, which an
xlsx, whose `found` is `null`, does not have; it is saved in the
project file with the rest of `found`, so that a project opened again
shows the same warning. It enters no key: the table does, and the line
changes nothing that is calculated.

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

The union of the refusals, in `src/worker/protocol.ts`, grew by eight
kinds in stage 2, the last two with the owner's decisions of 25
September 2026, and grows by seven for the xlsx in stage 4:

```ts
export type IndividualsFileError =
  | { kind: "empty" }
  | { kind: "duplicateColumn"; name: string }
  | { kind: "duplicateIndividual"; name: string }
  | { kind: "raggedRow"; line: number; expected: number; found: number;
      separator: "," | ";" | "\t" }                   // the one the read used
  | { kind: "files"; message: string }                 // calamine's, for the console
  | { kind: "unnamedColumn"; column: number }          // counted from 1
  | { kind: "emptyIndividual"; line: number }
  | { kind: "unclosedQuote"; line: number;             // where the cell starts
      separator: "," | ";" | "\t" }
  | { kind: "tooLarge"; size: number; max: number }    // in bytes
  | { kind: "unreadable"; message: string }            // the browser's, for the console
  | { kind: "notText" }
  | { kind: "variantsFile" }                           // a VCF picked by mistake
  | { kind: "cutShort" }                               // UTF-16 that ends in the middle of a character
  // From stage 4, an xlsx:
  | { kind: "notXlsx" }                                // not a zip
  | { kind: "oldExcel" }                               // Excel 97–2003
  | { kind: "encrypted" }                              // saved with a password
  | { kind: "emptySheet"; sheet: string }
  | { kind: "cellError"; error: string }               // "#SPILL!"
  | { kind: "sheetTooLarge"; sheet: string; lastRow: number; lastColumn: string; max: number }
  | { kind: "xlsxReaderNotLoaded"; message: string };  // the browser's, for the console
```

For an xlsx, the `line` of `emptyIndividual` is the row of the sheet and
the `column` of `unnamedColumn` the column of the sheet, A being 1
("The xlsx").

`src/core/project.ts` learns them in two places: the words above, in
`individualsNeeds`, and the validation of a project file, which accepts a
failed read of each kind with its fields.

The runner, `src/worker/filesRunner.ts`: it posts its
`ready` as soon as it starts, and answers each `readIndividuals` by
calling `readIndividualsFile` with the `File` and the options the
request carries, and posting what it gives. It holds nothing between two
reads but, from stage 4, the files wasm once an xlsx has loaded it
(`docs/specs/worker/files.md`), and imports no popnei. The messages, and
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
  first line, `##fileformat=VCFv4.2`, refuses it as `variantsFile`. A
  VCF whose first lines were cut away, so that it starts with a line of
  genotypes, is read as a table and refused, or reads as one column,
  as any text that is not a table.
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
- **An xlsx column of `0` and `1`, some typed as numbers and some pasted
  as text**: the numbers 0 and 1 and the texts `0` and `1` are two values
  by their text, so the column is binary, one `"1"`, zero `"0"`.
- **An xlsx column of heights with one text `n.d.`**, or one error
  `#N/A`: categorical, as in a CSV, and the user sees the value in the
  column.
- **An xlsx column of dates**: text, `2024-05-13`, and so categorical,
  with as many values as dates. A year typed as a number is a number.
- **An xlsx column of `TRUE` and `FALSE`**, booleans: binary, by the
  known pair `true` over `false`, one `"true"`.
- **An xlsx whose header holds the number 2024**: the column is named
  `2024`, and is chosen by that name.
- **An xlsx that is a CSV renamed**: `notXlsx`, whose words say to give
  it a name that ends in `.csv`; the reader does not try it as a CSV,
  since the source has no options of a CSV to read it with.

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
(`docs/architecture.md`, section 6). With an xlsx it loads the files
wasm the first time, and the read holds the bytes, the rectangle of
cells, 2,000,000 at most, as the crate gives them, and the table
(`docs/specs/worker/files.md`, "How it runs"); a table of 10,000 rows
and 20 columns from an xlsx is timed in the flow of stage 4, as the CSV
of stage 2 was.

## How it is verified

With Vitest in node, at `readCsv`, `readSheet`, `cellText`,
`cellNumber`, `inferColumnTypes`, `columnWarnings` and
`readIndividualsFile`, the highest functions that run without a worker,
and in the browser with Playwright. The files crate has its own tests,
with `cargo test` (`docs/specs/worker/files.md`).

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
| `id,s\nA,1\nB,2\nC,3\nD,5\n` | auto | `s` continuous; `columnWarnings` gives `s`, 4 levels, 4 texts, 1 to 5 |
| `id,s\nA,1\nB,01\nC,001\n` | auto | `s` continuous; `columnWarnings` gives `s`, 1 level, 3 texts, and `columnWarningText` the sentence of one number written in different ways |
| `id,s\nA,1\nB,1\n` | auto | `s` categorical; with its type set continuous, `columnWarnings` gives `s`, 1 level, 1 text, and `columnWarningText` the sentence of one number with no "written in different ways" |
| `id,n\nA,"x, y"\nB,"say ""hi"""\n` | auto | cells `x, y` and `say "hi"` |
| `id,n\r\nA,1\r\n\r\nB,2\r\n` and the same with `\r` alone | auto | the same table as with `\n`, the blank line skipped |
| `id;pop;;\nA;P1;;\n` | auto | columns `id`, `pop` |
| `id;pop;;\nA;P1\nB;P2;NA\n` | auto | `;`; columns `id`, `pop`: the two empty cells of the header dropped, and the rows of two and three cells fit |
| `id,x;pop;;\nA,1;P1\nB,2;P2;NA\n` | auto | `;`; columns `id,x`, `pop`: the search of the separator takes `NA` for no value, so `;` fits with the header counted as two, as `,` does, and wins the tie; were `NA` a value, `;` would not fit and `,` would be taken |
| `id;pop;;\nA;P1\nB;P2;;x\n` | auto | `unnamedColumn`, 4: the fourth column has a value, so the run of empty cells is not dropped, and it is checked before the short row of line 2 |
| `id;pop;;\na;1\nb;2;3\n` | auto | `unnamedColumn`, 3, and not `raggedRow` at line 2 |
| `id;pop;;x\nA;P1;;1\nB;P2\n` | auto | `raggedRow`, line 3, expected 4, found 2, separator `;`: the header ends in a name, so its empty cells are not a run at its end |
| `id,,pop\nA,NA,P1\nB,-,P2\n` | auto | columns `id`, `pop` |
| `##fileformat=VCFv4.2\n#CHROM\tPOS\n` and `#CHROM\tPOS\tID\n1\t10\tx\n` | auto | `variantsFile` |
| `\n##fileformat=VCFv4.2\n#CHROM\tPOS\n` and ` \t\r\n#CHROM\tPOS\n` | auto | `variantsFile`, the blank first line passed over |
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
`true`. With a point, the number 1.75 is 1.75. At `cellText`: the number
1 is `"1"`, 0.1 + 0.2 is `"0.30000000000000004"`, `true` is `"true"`,
`"001"` is `"001"`, `null` is `null`.

A table of cases at `readSheet`, each a literal rectangle, with `firstRow`
and `firstColumn` 1 unless said, and the literal table and types it
gives, or the refusal. Among them:

| rows of the rectangle | gives |
|---|---|
| `["id","pop"]`, `[1,"P1"]`, `[2,"P2"]`, `[3,"P1"]` | first cells `"1"`, `"2"`, `"3"`; `pop` binary, one `"P2"` |
| `["id","h"]`, `["A",1.75]`, `["B","1.8"]`, `["C",1.69]` | `h` continuous, cells `1.75`, `"1.8"`, `1.69` |
| `["id","g"]`, `["A",1]`, `["B","1"]`, `["C",0]` | `g` binary, one `"1"`, zero `"0"`: the number 1 and the text `1` are one value |
| `["id","h"]`, `["A","1,75"]`, `["B",1.8]`, `["C",1.7]` | `h` categorical: `1,75` is text in an xlsx |
| `["id","ok"]`, `["A",true]`, `["B",false]` | `ok` binary, one `"true"`, zero `"false"` |
| `["id",2024]`, `["A",1]` | columns `id`, `2024` |
| `["id","pop"]`, `["A"," P1 "]`, `["B","NA"]`, `["C","  "]` | cells `"P1"`, `null`, `null` |
| `["id","pop"]`, `[null,null]`, `["A","P1"]` | the blank row skipped |
| `["id","pop",null]`, `["A","P1",null]` | columns `id`, `pop` |
| `["id",null,"pop"]`, `["A","x","P1"]`, with `firstColumn` 3 and `firstRow` 5 | `unnamedColumn`, 4, the column D of the sheet |
| `["id","pop"]`, `[null,"P1"]`, with `firstRow` 5 | `emptyIndividual`, 6, the row of the sheet |
| `["id","pop"]`, `[1,"P1"]`, `["1","P2"]` | `duplicateIndividual`, `1` |
| `["id","pop"]` | `empty` |
| `["id","#N/A"]`, `["A","#N/A"]` | the cell `"#N/A"`, a value |

At `readIndividualsFile`, with a source whose `csv` is `null` and a
`readXlsx` of the test: the bytes given to it are those of the file; its
cells give the table of `readSheet` and `found` `null`; its refusal, each
of the seven kinds of the xlsx, is the failed read; a file of 20,000,001
bytes is `tooLarge` and `readXlsx` never called; and with options of a
CSV, `readXlsx` is never called.

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
- the Spanish file as UTF-8 with its BOM and the byte `FF` in the
  third line, with the encoding `"auto"`: found UTF-8, `undecodedLine`
  3, and a cell with �; the same file without the bad byte:
  `undecodedLine` `null`; the Spanish file in Windows-1252: `null`;
- the UTF-16 little endian file with one byte more, and with its last
  character the first half of one written in four, the bytes `3D D8`:
  `cutShort`;
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
- **The types of an xlsx are those of its text**: `inferColumnTypes` of
  a table of numbers, booleans, texts and `null`, with the point, and of
  the same table with every number and boolean replaced by its
  `cellText`, are equal, the coding of a binary column included.
- **The first type is identifier and no other is**, and a binary type's
  two values are the texts of the two distinct values of its column, which is what
  `parseProject` checks of a project file (`docs/specs/core/project.md`).

With Playwright, in the flow of stage 2: a CSV loaded through the page,
the table and "Read as" shown, and no request for any wasm from the light
worker in the network log (`.claude/skills/coding/worker.md`, "What is
tested where"); and the measurement of the file of 10,000 rows, above.
From stage 4, an xlsx loaded through the page, as
`docs/specs/worker/files.md` says, "In the browser". That a file changed
on the disk gives `unreadable` is checked by hand in
Chrome, Firefox and Safari, since a test cannot change a file the page
has picked, and what each browser did is written in the report of the
plan.

## What this spec relies on in the others

- `docs/specs/worker/messages.md`: `readIndividuals` carries the `File`
  and its `CsvOptions`, `null` for an xlsx from stage 4, `{ kind:
  "readIndividuals", id, file, csv }`, with no other message that gives
  the worker a file, and its answer is an `IndividualsFileRead`, the
  union that spec declares, whose `found` is `null` for an xlsx.
- `docs/specs/worker/files.md`: the files crate gives the rectangle of
  the first sheet that is not hidden, its cells finite numbers, text,
  booleans or empty, dates and errors made text, or one of the refusals
  of the xlsx above.
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
  with their first values; the types, read only in stage 2 and set by
  the user from stage 4; the warnings of
  `columnWarnings` with the words above; and offers every column but the
  first as the column of the populations, whatever its type; it takes
  `.csv`, `.tsv` and `.txt` files in stage 2, and from stage 4 a file
  whose name ends in `.xlsx` as an xlsx, with `csv` `null`, and shows no
  "Read as" for it; it gives `columnWarnings` the decimal mark of
  `found`, and the point for an xlsx.

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

What the revision of stage 4 asks of other specs, which the orchestrator
lists in `docs/specs/stage-4-open-points.md`:

- `docs/specs/worker/protocol.md`: the seven kinds of the xlsx in
  `IndividualsFileError`; and a binary `ColumnType` whose `one` and
  `zero` are the texts of its two values, `string`, where they were
  cells as the table holds them, compared exactly. The sentence there
  that a text `"1"` and a number `1` are never compared, "since the
  cells of one column come from one file", does not hold for an xlsx. No
  project file holds another, since every one saved before stage 4 read
  a CSV, whose cells are all text.
- `docs/specs/core/project.md`: the words of the seven kinds in
  `individualsNeeds`, and "row" and the letters of a column for an xlsx
  in those of `emptyIndividual` and `unnamedColumn`; their fields in the
  validation of a project file; and the binary type checked by the text
  of the cells, in `setColumnType` and `parseProject`, where it says "in
  an xlsx the numbers or the booleans".
- `docs/specs/entry.md`: a pending source with `csv` `null` is asked for,
  where stage 2 throws it as a defect.

Each of these was made in its document on 27 September 2026, when the
specs of stage 4 were made to agree.

## Open points

The open points of the eleven specs of stage 2 are gathered in
`docs/specs/stage-2-open-points.md`. The one this spec had was decided
by the owner on 25 September 2026, and is written above as decided: a
refused row names the separator it was read with (point O there), a
field `separator` on `raggedRow` and `unclosedQuote`, which changes
those two kinds in the approved `protocol.ts` and their check in a
project file in the approved `project.ts`.

The one left open, whether a number 1 and a text `1` of one column of an
xlsx are one value, was settled for stage 4 on 27 September 2026: they
are, by their text ("The types of the columns"); `inferColumnTypes` of
stage 2 compares the cells as they are, and is changed to compare their
text. The open points of stage 4 are gathered in
`docs/specs/stage-4-open-points.md`; one of the xlsx is in
`docs/specs/worker/files.md`, whether an error cell `#N/A` is missing, and
this one is new:

1. **The name of the sheet read, shown beside the file.** `found` is
   `null` for an xlsx, so the Individuals step can say only "Read from
   the first sheet of pops.xlsx that is not hidden; the other sheets are
   not read." (`docs/specs/steps/individuals.md`). The first sheet is the first
   in the order of the tabs that is not hidden, and a user whose
   workbook has a hidden sheet before the table, or whose Excel opens it
   on another sheet, the one active when it was saved, may not know
   which that is. The other option:
   `found` for an xlsx gives the name of the sheet read and the number
   of sheets, and the step shows "Read from the sheet Hoja1, the first of
   3 not hidden". It changes the type of `found` in `protocol.ts` and
   `project.ts`, the check of the answer in `messages.ts`, and the words
   of the step. Recommendation: name the sheet. Meanwhile, `found` is
   `null`, as `docs/specs/core/project.md` has it, and the step's line
   stands.

## Not in this spec

- How an xlsx is read into cells, its dates, errors, merged cells and
  the sheet chosen, and the files wasm loaded on first need:
  `docs/specs/worker/files.md`.
- The types changed by the user, the coding of a binary column, and the
  roles of the traits file: `setColumnType` of
  `docs/specs/core/project.md`, and the screens of stages 4 and 7.
- Who turns the text of a continuous column into numbers, with
  `cellNumber` and the decimal mark of the read: from stage 4, core, for
  the colours of the PCA by a continuous column
  (`docs/specs/analyses/pca.md`, "The colours") and for the types each
  column allows, which core works out with `cellNumber` and
  `inferColumnTypes` (`columnAllows` of `docs/specs/core/project.md`);
  both are pure and core may import them; for the GWAS and the
  covariates, the specs of stage 7.
- That every individual of the variants is in the file:
  `individualsNeeds` of `docs/specs/core/project.md`.
- The messages, the queue, the restart of the light worker:
  `docs/specs/worker/messages.md` and `client.md`.
