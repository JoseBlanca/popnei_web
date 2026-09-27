# The files crate: an xlsx read into cells

Written on 27 September 2026, for stage 4 of `docs/build-order.md`, the
Individuals step and the PCA, and revised the same day to agree with the
specs written beside it, and after two reviews of its claims against the
source of calamine 0.36.1 and two crates of trial; and when the specs
of stage 4 were made to agree, the last column of a sheet too large
given in Excel's letters, "XFD"; and with the owner's answer of 27
September 2026 to Open 2, the date whose time the format hides. There
is no code of it yet. This spec gives
the Rust crate `crates/files/`, which reads the first sheet of an xlsx,
the file Excel saves by default, into its cells, and the few lines of the
light worker that load it and call it. The light worker is the second
thread of the tab, beside the page, that reads the files of the user and
holds no popnei (`docs/architecture.md`, section 1). The crate is built
into a second wasm module, apart from popnei's, the **files wasm**, which
the light worker downloads the first time the user loads an xlsx, so that
a user of CSV files never downloads it. In stage 4 it only reads; writing
an xlsx and zipping the report come with stage 6. It develops section 6
of `docs/architecture.md`, "The files wasm, a crate of this repository",
and section 2 of `docs/technology.md`, "xlsx and zip in Rust", with the
row `crates/files/` of section 9 of the architecture. What the cells
become, the table of the project with the types of its columns, is
`docs/specs/worker/individuals.md`, revised beside this spec; the messages
that carry a read are `docs/specs/worker/messages.md`; the configuration
files, `rust-toolchain.toml`, the crate's `Cargo.toml` and the scripts
`build:files` and `test:files`, are `.claude/skills/coding/configs.md`'s;
the workflow that builds the crate is `docs/specs/site.md`'s.

calamine, the Rust library that reads the file, gives each cell, as its
reader of the cells one by one gives them, as one of the values of its
type `DataRef`, which is what the crate matches on: empty, a number, a
text of the workbook's table of texts, which an xlsx keeps once for all
the cells that hold it (`SharedString`), a text the cell holds itself
(`String`), a boolean, a date or a time, a date written in ISO 8601, or
an error such as `#N/A`. `DataRef` also has a whole number and a
duration in ISO 8601, which calamine's reader of an xlsx never gives,
and which the crate turns into a number and a text all the same. calamine's
other type of value, `Data`, is what it gives when it reads a whole
sheet at once, which the crate does not do (below). The crate turns each
value into one of the four kinds of cell the table holds (`Cell`,
`docs/specs/worker/protocol.md`): empty, text, number or boolean. The
rules below are read from the source of calamine 0.36.1, the version
`docs/technology.md` measured, and tried on 27 September 2026 in two
crates of trial built from them on the owner's Mac, with Rust 1.98.0.

## What it does

A user loads `pops.xlsx` in the Individuals step and sees the table of
its first sheet, as they see it in Excel. What goes wrong because of the
crate is seen there, or is not seen at all:

- a date read as a number shows `45425` where Excel shows `13/05/2024`;
- an identifier `001` that Excel shows with a format of three digits is
  stored as the number 1, and the individual `1` matches no individual of
  the variants;
- a value merged over ten rows in Excel, the population of ten
  individuals, would belong to the first of them only;
- a sheet with one cell of an error calamine does not know is not read
  at all, since calamine refuses it (below, "The refusals").

### The sheet read

The first sheet is the first worksheet in the order of the tabs that is
not hidden, the leftmost tab the user sees. It may not be the sheet
Excel opens the file on, which is the one that was active when the file
was saved; the crate does not read that one, since calamine 0.36.1 does
not give it, and the Individuals step says that the first sheet was read
(`docs/specs/worker/individuals.md`, **Open 1**). A hidden first sheet,
which holds the lists of a form or old data, is passed over; the option
not taken, the first sheet whether hidden or not, would read a table the
user does not see. A chart sheet is not a worksheet and is
passed over too. Every row and column of the sheet is read, those hidden
or filtered out included, since a hidden row still holds an individual.

The crate reads the cells one by one, in the order of the file, with
calamine's `Xlsx::worksheet_cells_reader`, and not with its
`worksheet_range`, which builds the whole rectangle of the sheet in
memory before the crate can look at its size. The cells it keeps are those with a
value. The rectangle it gives runs from the first row and the first
column that hold a value to the last ones, so a sheet whose table starts
at C3 gives the table and not two empty rows and columns before it; the
number of its first row, as Excel numbers them from 1, and of its first
column, A being 1, cross with the cells, so that a refusal names a row
and a column as the user finds them in Excel
(`docs/specs/worker/individuals.md`, "The xlsx"). A cell that is missing
from the file, as a sparse row leaves them, is empty.

A sheet whose rectangle has more than 2,000,000 cells, rows times
columns, is refused, as `sheetTooLarge`. The crate keeps the rectangle
of the values it has read so far as it goes, and refuses the sheet at
the first cell that makes it larger than the limit, without reading
further: a note in column XFD, the last of Excel, at row 200, over a
table at A1, is refused when the note is read, and not after the rest of
the sheet. So the crate never holds more than 2,000,000 cells with a
value, and the refusal names the last row and the last column the
rectangle had reached, where the user looks for the values outside the
table. The limit is `MAX_SHEET_CELLS` of
`docs/specs/worker/individuals.md`, which the light worker gives the
crate with each read, so that the number is written in one place. A CSV
of 20 MB, the limit of a file of the individuals, holds about 1,800,000
cells of ten characters, each with its separator, eleven bytes: the
limit of an xlsx lets it hold a table as large as a CSV can, and a
larger rectangle is a stray value far from the table, or not a table of
individuals. It is an estimate: no sheet of that size has been read.

### Each cell

What each value of calamine's `DataRef` becomes. A text crosses as a
JavaScript string, a number as a JavaScript number, a boolean as a
boolean, an empty cell as `null`.

| in the file | calamine gives | the cell |
|---|---|---|
| nothing, or a text with no character | `Empty`, `SharedString("")`, `String("")` | empty |
| a text | `SharedString`; `String` for the text a formula saved, for a text written in the cell itself, which programs other than Excel may write, and for a value of no type that is not a number | the text as it is, spaces at its ends and line breaks in it kept; the reader removes the spaces (`docs/specs/worker/individuals.md`) |
| text with several fonts in it | `SharedString`, its parts joined | the text |
| a number, of any format that is not a date: `1,75`, `50 %`, `001` | `Float` | the number, `1.75`, `0.5`, `1` |
| a whole number | `Float`: an xlsx stores every number alike, and calamine gives `Int` only for other formats | the number |
| a number that is not finite, which Excel does not write | `Float` | the text JavaScript writes for it, `NaN`, `Infinity`, `-Infinity` |
| `TRUE` or `FALSE`, `VERDADERO` or `FALSO` in Spanish | `Bool` | the boolean |
| a date: a number with a format of date or time, of 1 day or more, whose time, rounded to the millisecond, is 0 | `DateTime` whose `ExcelDateTime` is not a duration | `2024-05-13` |
| a date and a time: the same, with a time that is not 0, whether the format shows it or not (**Open 2**, below, decided by the owner) | `DateTime` | `2024-05-13 12:00:00`, and `2024-05-13 12:00:00.250` when its milliseconds are not 0 |
| a time alone: a number with a format of date or time that rounds to less than 1 day and not below 0 | `DateTime` | `14:30:00` |
| a format of date on a number below 0, or on a day after 31 December 9999, which Excel shows as `#######` | `DateTime`, with the parts of a wrong date | the number |
| a duration, a format such as `[h]:mm:ss` | `DateTime` whose `ExcelDateTime` is a duration | hours, minutes and seconds, the hours not wrapped at 24: 1.5 days is `36:00:00`, and a negative one `-0:30:00` |
| a date written as ISO 8601 text, a cell of the type `d`, which other programs than Excel may write | `DateTimeIso` | the text as it is |
| an error: `#N/A`, `#DIV/0!`, `#NAME?`, `#NULL!`, `#NUM!`, `#REF!`, `#VALUE!` | `Error` | the text of the error as Excel writes it in English (**Open 1**, below) |
| a formula | the value saved with it | the cell of that value, by the rows above |

A date becomes text in ISO 8601, year, month, day, and not the number
Excel stores, 45425 for 13 May 2024, which a user would not recognise,
nor the date as Excel shows it, which depends on the language of the
computer. It is text in the table, so a column of dates is categorical,
and a year is a number and not a date.

calamine gives no format of a cell, only that the format is one of a
date or a time, or one of a duration, the `ExcelDateTime` that `DateTime`
holds. So the crate cannot tell a date shown with its time from one
shown without it, and decides by the number: a number with no time, as a
date typed by hand has, gives the date alone, and a number with a time
gives both, whatever Excel shows, as the owner decided on 27 September
2026 (**Open 2**, below).

The crate first rounds the number to a whole number of milliseconds, and
splits that into its days and the milliseconds of its last day, with the
arithmetic of whole numbers. 45425.9999999999, a hundredth of a
millisecond before midnight, is then 14 May 2024 at 0:00, where
calamine's parts of the number as it is give 13 May at hour 24, as the
second trial saw. The parts of the day come from calamine, an
`ExcelDateTime::new` of the days in the date system of the workbook,
`Xlsx::has_1904_epoch`, and its `to_ymd_hms_milli`, with no library of
dates: the crate takes calamine without its feature `chrono`. The date
system is the 1900 one or the 1904 one of old Excel for Mac, so the same
date shown in Excel gives the same text in both, and calamine reproduces
Excel's 29 February 1900, a day that did not exist, as Excel does: 60
gives `1900-02-29` in the trial.

calamine works the parts out only from the first day of the system to
the end of 9999. It turns the days into a whole number with no sign, so
a number below 0 gives 31 December 1899 in the 1900 system and 1 January
1904 in the other; and a day after 9999 gives the year 10000 or later,
from 2,958,466 in the 1900 system and from 2,957,004 in the 1904 one, as
the second trial saw. So the crate gives the number itself for a number
below 0 and for a year after 9999 in the parts, a rule that holds in both
systems. A time alone, a number that rounds to less than a day, is also
a date for calamine, of 31 December 1899 or 1 January 1904; the crate
writes the time only. A duration is written from its whole number of
milliseconds, since calamine gives its parts as a date of January 1900.

A number whose format calamine takes for a date, one with a `d`, `m`,
`y`, `h` or `s` outside quotes, such as `0.0m`, comes as a date too. It
was seen in none of the files tried; a user sees it in the table, as a
date where Excel shows a number.

A formula gives the value Excel saved with the file, which Excel,
LibreOffice and Google Sheets always save. A file written by a program
that calculates no formula has none: rust_xlsxwriter, the library of the
report, saves 0 unless it is given the value, which the trial saw, and
another program may save nothing, which reads as an empty cell. Such a
file is read with those values, and the user sees them in the table.

### Merged cells

A range of merged cells holds its value in its first cell, the one at its
top left, and the others are empty in the file; Excel shows the value
over the whole range. So the crate gives every cell of a merged range the
value of its first cell, within the rectangle of the values, with
calamine's `Xlsx::merge_cells_by_sheet_name`: a population merged over
ten rows is the population of the ten individuals, which is what the user
sees. The option not taken, the value in the first cell alone, which
calamine, pandas and R's readxl give, would leave nine of the ten in no
population, told only by the warning of individuals with no population.
A name of a column merged over two columns gives two columns of one
name, which the reader refuses, "two columns are named Origen".

### The refusals

A file the crate cannot read as an xlsx is refused with the kind of
`IndividualsFileError` that says why, so that the user is told what to do
with it; the kinds and their words are `docs/specs/worker/individuals.md`'s,
"The refusals and their words". The crate says which it is by a code,
and the light worker makes the refusal of it. In the order it looks:

1. **An older file of Office**, whose bytes start with the mark of a
   compound file of Office, `D0 CF 11 E0 A1 B1 1A E1`: an xlsx saved with
   a password, which Excel encrypts inside such a file, is `encrypted`,
   found by calamine, which looks for its part `EncryptedPackage` and
   gives `XlsxError::Password`; any other is a workbook of Excel 97–2003,
   an `.xls` whose name was changed, or another file of the old Office,
   and is `oldExcel`. An `.xls` whose name ends in `.xls` never reaches
   the crate: the Individuals step does not load it
   (`docs/specs/steps/individuals.md`).
2. **Not a zip file**, whose bytes do not start with `PK` and the bytes 3
   and 4, as every xlsx does, since an xlsx is a zip of XML files:
   `notXlsx`. It is most often a CSV saved with the name `.xlsx`, which
   the words say how to mend. An empty file is one.
3. **A zip that calamine cannot open as a workbook, or whose sheet it
   cannot read**: a file cut short, damaged, or another format in a zip,
   a sheet of LibreOffice in its own format, `.ods`, or Excel's binary
   workbook, `.xlsb`, with the name `.xlsx`. calamine's message
   goes into the refusal `files`, which says the file could not be read
   as a workbook and may be damaged, and the message is written to the
   console, where it helps the one who reports it: "Zip error: invalid
   Zip archive: Could not find EOCD", the record that ends every zip, for
   the first 500 bytes of an xlsx, in the trial.
4. **No worksheet that is not hidden**, which Excel does not let a user
   save: `files`, with the crate's own message, "no visible worksheet",
   as `ReadError::Unreadable`.
5. **A cell with an error calamine does not know**: calamine 0.36.1 knows
   the seven errors of the table above, and refuses the whole sheet at
   any other, with `XlsxError::CellError`, whose text is the error.
   rust_xlsxwriter writes `#GETTING_DATA`, which the trial refused with
   "Unsupported cell error value '#GETTING_DATA'". The crate gives it as
   `cellError`, with the text of the error, so that the user is told
   which formula to mend; calamine does not say which cell, and neither
   can the crate, so the words say how to find the cells with an error in
   Excel. The newest versions of Excel have other errors, `#SPILL!` and
   `#CALC!` among them, but whether they reach calamine as such is not
   known: Excel may save them as `#VALUE!`, with the real error in a
   part of the file calamine does not read, and then the cell is the
   text `#VALUE!` and nothing is refused. So the refusal of `#SPILL!` in
   this spec is unconfirmed until the owner's `spill.xlsx` is read
   (below, "Made by the owner").
6. **A sheet too large**: `sheetTooLarge`, with the name of the sheet and
   the last row and column the rectangle had reached, above. It and a
   cell of point 5 come as the cells are read, so the one met first in
   the order of the file is the refusal.
7. **A sheet with no value**: `emptySheet`, with the name of the sheet,
   known once every cell is read. The likeliest cause is a table on the
   second sheet of a workbook whose first holds notes that were deleted,
   or a first sheet left empty; the words say that only the first sheet
   is read.

A sheet whose rows are all blank but its header, or whose values are
all spaces, is not refused here: the crate gives its cells, and the
reader refuses it as a CSV of the same rows, `empty`.

A panic of the crate, or of calamine inside it, is a trap of the wasm,
which ends the light worker (`.claude/skills/coding/worker.md`, "Errors
are values"); the lints of the crate deny what panics in its own code
(`.claude/skills/coding/SKILL.md`, "The files crate"), and calamine
cannot be read line by line for it. A sheet so large in memory that the
wasm cannot grow, within 20 MB of zip, ends the same way. The read then
fails because its worker failed (`docs/specs/worker/messages.md`).

## The Rust interface

The plain functions, which `cargo test` calls natively, in
`crates/files/src/xlsx.rs`, and the exported one, a thin wrapper over
them, in `crates/files/src/lib.rs`, as the coding skill has it: the
functions wasm-bindgen generates cannot run natively.

A cell as it crosses to JavaScript, and the sheet read:

```rust
/// A cell of the sheet: a date, a time, a duration and an error are text
/// by then, as "Each cell" gives them.
pub enum SheetCell {
    Empty,
    Text(String),
    Number(f64), // finite
    Bool(bool),
}

/// The rectangle of the first worksheet that is not hidden, from the
/// first row and column that hold a value to the last ones.
pub struct Sheet {
    pub name: String,
    pub first_row: u32,     // as Excel numbers the rows, from 1
    pub first_column: u32,  // column A is 1
    pub num_rows: u32,
    pub num_columns: u32,
    pub cells: Vec<SheetCell>, // row after row, num_rows × num_columns
}
```

What the crate refuses, each with what its words need, and a file that
calamine cannot read, with calamine's message:

```rust
pub enum Refusal {
    NotXlsx,
    OldExcel,
    Encrypted,
    EmptySheet { sheet: String },
    CellError { error: String },          // "#GETTING_DATA"
    /// The rectangle of the values read when it passed the limit, in the
    /// numbers of Sheet.
    SheetTooLarge {
        sheet: String,
        first_row: u32,
        first_column: u32,
        num_rows: u32,
        num_columns: u32,
    },
}

pub enum ReadError {
    Refused(Refusal),
    Unreadable(String), // calamine's message, for the console
}

/// Reads the first worksheet that is not hidden of the xlsx `bytes`,
/// refusing it at the first cell that makes the rectangle of the values
/// larger than `max_cells` cells.
pub fn read_first_sheet(bytes: &[u8], max_cells: u32) -> Result<Sheet, ReadError>;
```

The exported function. It returns the sheet or the refusal as a value,
and throws only for a file calamine cannot read, as the coding skill has
every exported function do, with a `Result` whose error wasm-bindgen
turns into a JavaScript `Error` with its message
(`.claude/skills/coding/worker.md`, "Errors are values"). The refusals
are values and not errors because each carries fields its words need,
which the message of an `Error` would carry only as text to be taken
apart again. The result is a struct that stays in the wasm's memory;
JavaScript reads its fields through functions wasm-bindgen generates,
each of which copies the field out (`getter_with_clone`), and the light
worker then calls its `free()`, since JavaScript's garbage collector does
not free the memory of a wasm.

```rust
#[wasm_bindgen(getter_with_clone)]
pub struct XlsxRead {
    /// "" for a sheet read; otherwise "notXlsx", "oldExcel",
    /// "encrypted", "emptySheet", "cellError" or "sheetTooLarge".
    #[wasm_bindgen(readonly)] pub refusal: String,
    /// The text of the error, for "cellError"; "" otherwise.
    #[wasm_bindgen(readonly)] pub detail: String,
    /// The name of the sheet, for a sheet read, "emptySheet" and
    /// "sheetTooLarge".
    #[wasm_bindgen(readonly)] pub sheet: String,
    /// The rectangle of the sheet read, or of "sheetTooLarge".
    #[wasm_bindgen(readonly, js_name = firstRow)] pub first_row: u32,
    #[wasm_bindgen(readonly, js_name = firstColumn)] pub first_column: u32,
    #[wasm_bindgen(readonly, js_name = numRows)] pub num_rows: u32,
    #[wasm_bindgen(readonly, js_name = numColumns)] pub num_columns: u32,
    /// Row after row: null, a string, a number or a boolean; empty for a
    /// refusal.
    #[wasm_bindgen(readonly)] pub cells: Vec<JsValue>,
}

#[wasm_bindgen(js_name = readXlsx)]
pub fn read_xlsx(bytes: &[u8], max_cells: u32) -> Result<XlsxRead, JsError>;
```

What wasm-bindgen declares of it in `crates/files/pkg/files.d.ts`, which
the light worker's TypeScript reads. A second crate of trial, of 27
September 2026, with this struct and this function, generated these
lines, the fields in the order of their names, with wasm-bindgen 0.2.128
(the comments are added here):

```ts
export class XlsxRead {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    readonly cells: any[];
    readonly detail: string;
    readonly firstColumn: number;
    readonly firstRow: number;
    readonly numColumns: number;
    readonly numRows: number;
    readonly refusal: string;
    readonly sheet: string;
}

/** Throws an Error with calamine's message for a file it cannot read. */
export function readXlsx(bytes: Uint8Array, max_cells: number): XlsxRead;

/** Fetches and compiles files_bg.wasm, from beside files.js when it is
    called with no argument, as the light worker calls it. */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
```

JavaScript cannot make an `XlsxRead` of its own, `private
constructor()`. `[Symbol.dispose]` frees it as `free()` does; the
light worker calls `free()`, in a `finally`.

wasm-bindgen copies the bytes of the `Uint8Array` into the memory of the
wasm, 20 MB at most, and `cells` makes a JavaScript array of the values
each time it is read, so the light worker reads it once.

## The crate's Cargo.toml

`.claude/skills/coding/configs.md` gives the file whole but its
dependencies, which are, for stage 4:

```toml
[dependencies]
# Pinned to the command line, which refuses a crate of another version;
# the version popnei pins, so one command line builds both.
wasm-bindgen = "=0.2.128"
# The version docs/technology.md measured. Its default features are none;
# chrono, for dates as chrono's types, and picture, for the images of a
# workbook, are left off: the crate writes a date from calamine's own
# parts of it.
calamine = { version = "=0.36.1", default-features = false }

[dev-dependencies]
# The xlsx files of the tests are written in memory; the library the
# report will write with in stage 6, in the tests only until then.
rust_xlsxwriter = { version = "=0.99.1", default-features = false }

[profile.release]
# As measured in docs/technology.md, section 2.
opt-level = 3
lto = true
codegen-units = 1
```

calamine brings zip, with its compression in Rust, and quick-xml; none
has C, and the trial built them for `wasm32-unknown-unknown`.
rust_xlsxwriter is a dependency the owner decided on 24 September 2026
(`docs/technology.md`, section 2), taken here as a development
dependency, which does not reach the wasm: the dependencies of the tests
are the owner's decision as the others are
(`.claude/skills/coding/SKILL.md`, "Dependencies"), and this one is the
one already decided for the crate. `crates/files/Cargo.lock` is
committed. `rust-toolchain.toml` names Rust 1.98.0, the stable release of
18 August 2026, current on 27 September 2026 and the one on the owner's
Mac; calamine 0.36.1 needs 1.88 at least.

## How the light worker loads it

The light worker's script, `src/worker/filesRunner.ts`, is the one file
that imports the files wasm (`.claude/skills/coding/configs.md`, the
pattern `filesWasm`), as `.claude/skills/coding/worker.md` gives it, "The
files wasm, on first need":

- **On the first xlsx**, and not when the worker starts. It keeps one
  promise, `filesReady ??= loadFiles()`, where `loadFiles` imports
  `crates/files/pkg/files.js` with a dynamic `import()`, which Vite, the
  tool that builds the site, makes a file of its own, downloaded only
  when the line runs, and awaits its `init()`, which fetches
  `files_bg.wasm` from beside it. A second xlsx awaits the same promise
  and downloads nothing.
- **When the download fails**, a network that drops or a page left open
  across a deploy of the site, whose files are no longer there, the
  promise is forgotten, `filesReady = null`, so that the next xlsx tries
  again, and the read fails as `xlsxReaderNotLoaded`, with the browser's
  message for the console. The user reads "pops.xlsx could not be read:
  the part of the application that reads Excel files could not be
  downloaded; check the connection and load the file again; if it fails
  again, the site may have been updated since this page was opened: save
  the project, reload the page and open the project again"
  (`docs/specs/worker/individuals.md`), the advice of the 3D view whose
  file is gone after a deploy (`docs/specs/analyses/pca.md`), since a
  reload alone loses what the user has not saved. The worker goes on,
  and a CSV read after it is read. The option not taken was to end the
  worker, as a failure to load popnei ends the calculation worker: the
  user would be told that the reading stopped, and not to check their
  connection.
- **A try again that may fail at once.** A failed `init()` leaves
  nothing of the wasm behind, and the next one fetches `files_bg.wasm`
  again. A failed `import()` may not: the HTML standard, which the
  browsers follow, keeps a module whose download failed as failed, for
  the life of the worker, so that the next `import()` of the same
  address fails again with no request. Whether it should is asked in
  the standard's issue 6768 on GitHub, `whatwg/html`, and what each
  engine does on 27 September 2026 is not known here. In an engine that keeps it,
  "load the file again" fails again after the JavaScript of the files
  wasm failed to download, even with the connection back, and the second
  half of the words, save the project, reload the page and open it
  again, is what mends it, since a reload starts a new worker. The
  Playwright case below finds which engines keep it, and the report of
  the plan says so. The options not taken: an `import()` of a new
  address at each try, which Vite cannot give, since it names the file
  it makes of the files wasm's JavaScript when it builds the site; and the JavaScript imported with the worker's
  own file, so that only the `.wasm` could fail to download, at 2,962
  bytes gzipped more for every user of the light worker, CSV users
  included. The second is the one to take if an engine keeps the failure
  and the owner wants a connection that dropped mended without a
  reload.
- **The read** calls `readXlsx` with the bytes and `MAX_SHEET_CELLS`,
  and makes of what it gives a plain value, the cells or a refusal of
  `IndividualsFileError`, with `readXlsxCells` below, which also frees
  the `XlsxRead`. A code in `refusal` that is not one of the six, or
  `cells` not as long as `numRows × numColumns`, is a defect of ours and
  throws; the read of the individuals file then rejects, and the worker
  ends with `crashed`, the message with which a worker says it cannot go
  on before it closes itself (`docs/specs/worker/messages.md`, "A worker
  that cannot go on"). An `Error` thrown by `readXlsx` is the refusal
  `files`, with its message.

`readXlsxCells`, in `src/worker/xlsxCells.ts`, is the part of this that
has no wasm in it, so that Vitest checks it in node with an object of
the test in the place of the files wasm. It names no import of the
files wasm, and so does not break the rule that only `filesRunner.ts`
imports it: the struct `XlsxRead` of `files.d.ts` has every field of
`XlsxReadFields`, and `filesRunner.ts` passes the files wasm's
`readXlsx` itself.

```ts
/** The fields of the files wasm's XlsxRead that the light worker reads. */
export interface XlsxReadFields {
  readonly refusal: string;
  readonly detail: string;
  readonly sheet: string;
  readonly firstRow: number;
  readonly firstColumn: number;
  readonly numRows: number;
  readonly numColumns: number;
  readonly cells: unknown[];
  free(): void;
}

/** The cells of an xlsx or its refusal: calls `readXlsx` with `bytes`
    and MAX_SHEET_CELLS, gives an Error it throws as the refusal "files"
    with its message, and frees what it returns. Throws a defect for a
    code of refusal it does not know or cells of the wrong length. */
export function readXlsxCells(
  readXlsx: (bytes: Uint8Array, maxCells: number) => XlsxReadFields,
  bytes: Uint8Array,
): SheetCellsRead;
```

A `sheetTooLarge` gives its last row and column, `firstRow + numRows −
1` and `firstColumn + numColumns − 1`, the column written in Excel's
letters, 16,384 as "XFD", since that is where the words send the user (`docs/specs/worker/individuals.md`, "The refusals and
their words"). `SheetCellsRead`, the cells of the sheet or a refusal of
`IndividualsFileError`, the union of every way a file of the individuals
is refused, are `docs/specs/worker/individuals.md`'s.

The loading and `readXlsxCells` together are the function given to
`readIndividualsFile`, which
calls it for a source with no options of a CSV, an xlsx
(`docs/specs/worker/individuals.md`, "The TypeScript interface"). So
`readIndividualsFile` runs in node under Vitest, the runner of the
tests that need no browser, with a function of the test in its place,
and the files wasm is tried in the browser.

### What the user sees while it downloads

The Individuals step shows the file as being read, as it does for a CSV
(`docs/specs/steps/individuals.md`), from the pick until the table
arrives, the download included; no state of its own says that something
is downloading. The download is the wasm and its JavaScript, measured
in the two crates of trial of 27 September 2026, which have calamine
alone and little code of their own, each a little different, built as
`build:files` builds it, with Rust 1.98.0 on the owner's Mac, gzipped
with `gzip -9`:

| file | raw | gzipped |
|---|---|---|
| `files_bg.wasm`, calamine and wasm-bindgen | 533,415 and 533,519 bytes | 295,475 and 295,521 bytes |
| `files.js`, what wasm-bindgen generates, in the crate with the struct `XlsxRead` above | 11,892 bytes | 2,962 bytes |
| popnei's wasm package, for comparison (`docs/technology.md`, section 2) | 2.16 MB | 0.71 MB |

So 0.30 MB, the crate's own code a few hundred bytes of it, which agrees with the 0.29 MB `docs/technology.md` measured
for calamine inside the crate of the three libraries, and is less than
half of popnei's wasm, which every user downloads. At 10 Mbit/s it takes
about a quarter of a second, and at 1.6 Mbit/s about 1.5 s, by
arithmetic, not measured. The browser keeps it after that, and a later
visit asks GitHub Pages whether it changed. The numbers are measured
again from the build of the stage, and written in the report of its plan.

## The cases

- **An identifier `001` stored as a number with the format `000`**:
  the cell is the number 1, and the individual is named `1`, since the
  format is not read. The check against the variants names `1` as
  missing from the file. A user who types `'001`, or formats the column
  as text before typing, gets the text `001`.
- **An xlsx with its table on the second sheet** and notes on the first:
  the notes are read, and the user sees a table of notes. When the first
  sheet is empty, the refusal says only the first sheet is read.
- **Several tables in one sheet**, side by side: one rectangle, whose
  columns between the two are empty in the header, which the reader
  refuses or drops by the rules of a CSV.
- **A value far from the table**, a note in Z5 beside a table of
  columns A to F: the rectangle reaches it, the columns G to Y, with no
  name and no value, are dropped, and the reader refuses column Z, with
  a value and no name, "column Z has values but no name in the header".
  A note in Z1, in the row of the header, is instead the name of a
  column Z with no value in any row, which the user sees in the table.
  Neither reaches the limit of 2,000,000 cells: a note in column XFD,
  over a table of 123 rows or more, does, and is refused as
  `sheetTooLarge`, naming column XFD.
- **The same sheet saved as CSV and as xlsx** gives one table but for
  the dates, `13/05/2024` in the CSV and `2024-05-13` in the xlsx, the
  numbers, as Excel shows them in the CSV, `1,8` rounded to its format,
  and as it stores them in the xlsx, 1.75, and the booleans, the text
  `VERDADERO` in a CSV of Spanish Excel and a boolean in the xlsx.
- **The files wasm, downloaded, then the light worker restarted** after
  a crash or a cancel: the new worker imports it again, which the
  browser's cache serves. A new worker also starts with no module
  kept as failed, so a restart mends a failed `import()` as a reload
  does.

## How it runs

In the light worker, one read at a time. At its largest, near its end, a
read holds at once: the bytes, 20 MB at most, in the worker's memory and
a copy in the wasm's; the texts of the workbook, which an xlsx keeps in
one table and calamine holds whole; the cells with a value, 2,000,000
at most since the size is checked as they are read, and the rectangle
made of them; and the JavaScript array of the cells, 2,000,000 at
most. The memory of a wasm grows and never shrinks, so the worker keeps
the largest a read has needed until it is ended. None of it is measured;
the Playwright test of the Individuals step measures the time of a sheet
of 10,000 rows and 20 columns (below, "In the browser").

## How it is verified

### With cargo test, natively

At `read_first_sheet`, with `npm run test:files`, which also runs `cargo
fmt --check` and clippy with the lints of the crate. Two sets of files.

**Written by the tests, in memory**, with rust_xlsxwriter's
`Workbook::save_to_buffer`, each case a few lines that say what the file
holds, and the literal cells it gives:

| the file | gives |
|---|---|
| a table at A1 of text, numbers, booleans and an empty cell | its cells, `Empty` for the empty one |
| the table at C3 | `first_row` 3, `first_column` 3, the same cells |
| a row with its second cell not written | `Empty` there |
| a number with the format `000` | `Number(1.0)` |
| 45425 with the format `dd/mm/yyyy`; 45425.5 with `dd/mm/yyyy hh:mm:ss`, and with `dd/mm/yyyy`; 45425.9999999999 with `dd/mm/yyyy`; 0.604166666 with `hh:mm`; 1.5 with `[h]:mm:ss`; 60, 2958465 and 2958466 with `dd/mm/yyyy`; −3 with `dd/mm/yyyy` | `2024-05-13`; `2024-05-13 12:00:00` both times (**Open 2**, decided); `2024-05-14`; `14:30:00`, `36:00:00`, `1900-02-29`, `9999-12-31`, `Number(2958466.0)`, `Number(-3.0)`; all seen as dates by calamine in the trials |
| the crate's function that makes the cell of a date, in its own module, with the 1904 system, which rust_xlsxwriter does not write: 2957003, 2957004, −3 and 0.5 | `9999-12-31`, `Number(2957004.0)`, `Number(-3.0)`, `12:00:00` |
| a formula `=1+1` saved with the value 2, one with the text `x`, one with `TRUE`, one with `#N/A`, and `=1+2` with none | `Number(2.0)`, `Text("x")`, `Bool(true)`, `Text("#N/A")`, `Number(0.0)` |
| `0.1 + 0.2` | `Number(0.30000000000000004)` |
| a text `"  sp "` and a text with a line break | both as they are |
| a text of several fonts, `write_rich_string` | the parts joined |
| a population merged over rows 2 to 4, and a name merged over two columns of the header | the population in the three rows; the name in both columns |
| a hidden first sheet, and the table on the second | the second, by its name |
| a first sheet with no value, and a table on the second | `EmptySheet`, with the name of the first |
| a value at A1 and one at XFD200, with `max_cells` 2,000,000 | `SheetTooLarge`, from row 1 and column 1, 200 rows and 16,384 columns |
| a value at XFD1, and one in column A of each row down to row 200 | `SheetTooLarge` at row 123, 16,384 × 123 being the first rectangle above 2,000,000: 123 rows and 16,384 columns, the rows after it not read |
| a formula saved with the value `#GETTING_DATA` | `CellError`, `#GETTING_DATA` |
| the bytes of `id,pop\n` | `NotXlsx`; and the empty bytes |
| the first 500 bytes of an xlsx | `Unreadable`, with calamine's message |
| the eight bytes of a compound file of Office followed by zeros | `OldExcel` |

rust_xlsxwriter writes neither the date system of 1904, nor a password,
nor an `.xls`, nor the errors of the newest Excel, nor a date as ISO
text; those come from the owner's files.

**Made by the owner**, since `docs/technology.md` asks, in its open point
1, whether calamine reads right the files that users make. They are kept
in `crates/files/tests/data/`, and their tests assert the cells the owner
says the file shows in Excel, as literals. Each is small, a header and
five rows, typed by hand as a user would:

1. `excel_es.xlsx`, Excel in Spanish: `Individuo`, `Población`,
   `Altura`, `Fecha`, `Hora`, `Afectado`, `Código`; accented names;
   heights typed with a decimal comma, `1,75`; a date typed `13/05/2024`;
   a time `14:30`; `VERDADERO` and `FALSO`; an identifier typed `'001`;
   a code `7` with the format `000`; a cell of `=NOD()`, the Spanish
   `NA()`, and one of `=1/0`; a population merged over two rows; a blank
   row in the middle.
2. `excel_en.xlsx`, the same in Excel in English, with `=NA()`.
3. `libreoffice.xlsx`, the same in LibreOffice Calc, saved as "Excel
   2007-365 (.xlsx)".
4. `excel_1904.xlsx`, the date of the first file in a workbook set to
   the date system of 1904 (in Excel for Windows, File › Options ›
   Advanced; in Excel for Mac, Preferences › Calculation): the same text,
   `2024-05-13`.
5. `encrypted.xlsx`, any table saved with a password to open it:
   `Encrypted`.
6. `excel97.xls`, any table saved as "Excel 97-2003 Workbook":
   `OldExcel`.
7. `spill.xlsx`, from Excel 365: a cell `=SEQUENCE(3)` with a value
   under it, which gives `#SPILL!`: `CellError`, `#SPILL!`, or the text
   `#VALUE!` if Excel saves it so (above, "The refusals", point 5). What
   it gives settles the words of `cellError`, and the spec is corrected
   to it.
8. `google_sheets.xlsx`, the first file downloaded from Google Sheets as
   .xlsx, if the owner uses it.

Until they arrive, their tests are written and marked `#[ignore]` with
the name of the file they wait for, and the report of the plan says
which ran. What each gives that this spec does not expect, a date read
as a number, a cell missing, is a finding for this spec and not a test
to be bent.

### With Vitest, in node

At `readXlsxCells`, with a function of the test in the place of
`readXlsx` that returns an object of the fields, or throws, and counts
the calls of its `free()`:

| the object | gives |
|---|---|
| `refusal` "", the sheet `Hoja1` at row 3 and column 2, 2 rows of 2 columns, cells `["id", "pop", "a", 1]` | the cells, with the same numbers; `free()` called once |
| `refusal` "encrypted"; "emptySheet" with its sheet; "cellError" with `detail` `#GETTING_DATA` | those refusals, with their fields |
| `refusal` "sheetTooLarge", from row 1 and column 1, 123 rows of 16,384 columns | `sheetTooLarge`, `lastRow` 123 and `lastColumn` "XFD", with the sheet and `max` `MAX_SHEET_CELLS` |
| a function that throws `Error("Zip error")` | the refusal `files`, with that message |
| `refusal` "other", and cells 3 long for 2 × 2 | a throw each, with `free()` still called once |

### In the browser

With Playwright, which drives the three engines of the browsers from a
test, in the flow of the Individuals step
(`.claude/skills/coding/testing.md`), in Chromium, Firefox and WebKit:

- `excel_en.xlsx`, copied to `e2e/fixtures/`, loaded through the page:
  the table shown, with its date as `2024-05-13`; the network log has one
  request for the files wasm's JavaScript and one for its `.wasm`, and
  none before the pick; a second xlsx loaded after it adds none; a CSV
  loaded first, none at all;
- the `.wasm` answered with an error by the test, which Playwright can
  put in the place of the site's answer: the
  words of `xlsxReaderNotLoaded`; the route removed and the file loaded
  again: the table;
- the JavaScript of the files wasm answered with an error, the same way:
  the words of `xlsxReaderNotLoaded`; the route removed and the file
  loaded again: the table in an engine that tries the `import()` again,
  or the same words in one that keeps the failure (above, "How the light
  worker loads it"). The test records which, for each engine, and asserts
  only that one of the two is shown; the report of the plan names the
  engines that keep it;
- `encrypted.xlsx`: its words;
- a sheet of 10,000 rows and 20 columns, `e2e/fixtures/individuals_10000.xlsx`,
  written by a test of the crate marked `#[ignore]` and run by hand, as
  `make_fixtures.mjs` is, and committed: the time from the pick to the
  table, with and without the download, in Chrome on the owner's Mac,
  written in the report of the plan.

The size of `files_bg.wasm` and `files.js`, raw and gzipped, is measured
from the build and written in the same report, beside the numbers above.

## What this spec asks of other documents

- `docs/specs/worker/individuals.md`, revised beside this spec: the
  refusals `notXlsx`, `oldExcel`, `encrypted`, `emptySheet`, `cellError`,
  `sheetTooLarge` and `xlsxReaderNotLoaded` and their words, and
  `MAX_SHEET_CELLS`. From the second review: `sheetTooLarge` carries the
  last row and the last column the rectangle reached, `lastRow` and
  `lastColumn`, in place of its rows and columns, and its words name
  them; the words of `cellError` say how to find the cell in Excel; a
  CSV of 20 MB holds about 1,800,000 cells; and `XlsxReader` rejects for
  a defect of ours. The same fields go into `docs/specs/worker/protocol.md`
  and the words into `docs/specs/steps/individuals.md`.
- `docs/specs/worker/messages.md`, revised beside this spec: the request
  of an xlsx, and the load of the files wasm that fails.
- `docs/technology.md`, section 2 and open point 1: the measure of
  calamine alone, 295,475 to 295,521 bytes gzipped in two crates of
  trial; that calamine 0.36.1 refuses a whole sheet at an error it does
  not know, and that whether `#SPILL!` reaches it as such waits for the
  owner's `spill.xlsx`; and the answer to open point 1 when the owner's
  files have been read.
- `.claude/skills/coding/worker.md`, "The files wasm, on first need":
  "about 0.5 MB gzipped" is 0.30 MB while the crate only reads; a failed
  load forgets the promise and is the refusal `xlsxReaderNotLoaded`, and
  the worker goes on; and, in "Errors are values", the refusals of the
  crate are values of its result, and only a file calamine cannot read
  throws, `files`.
- `.claude/skills/coding/configs.md`: the dependencies above, the
  development dependency on rust_xlsxwriter, `channel = "1.98.0"`, and
  the line `//!` each file of the crate's tests opens with, without
  which `missing_docs = "deny"` stops it compiling.
- `.claude/skills/coding/SKILL.md`, "The files crate": its tests over
  files written by rust_xlsxwriter in memory as well as the owner's.
- `docs/functionality.md`, section 4: "the first sheet" is the first that
  is not hidden, and merged cells take the value Excel shows over them.

## Open points

1. **An error cell of Excel, `#N/A` among them.** A cell whose formula
   failed is the text of its error, `#N/A`, `#DIV/0!`, so a column of
   heights with one `#N/A` is categorical, and the user sees why in its
   values and replaces it with `NA`. The other option: `#N/A` missing, as
   Excel means it, "not available", and as a lookup, `VLOOKUP`, gives it
   for an individual it did not find, with the other errors text. It
   would spare the user those replacements, and would make the xlsx give
   another table than the CSV Excel saves from the same sheet: there
   `#N/A` is the text `#N/A`, which the reader of CSV takes as a value,
   not as missing. Either answer changes only which cells of an xlsx are
   missing, and so which individuals a trait or a population leaves out.
   Recommendation: text, as in the CSV, since nothing is then left out
   without the user seeing it. Meanwhile, text.
2. **A date whose time the format hides, decided by the owner on 27
   September 2026.** calamine does not give the
   format of a cell, only that it is one of a date or a time, so the
   crate cannot tell `13/05/2024` from `13/05/2024 14:03`. The rule
   decided, as recommended: a number whose time, rounded to the millisecond, is 0
   gives the date alone, `2024-05-13`, and any other gives the date and
   the time, `2024-05-13 14:03:00`. A date typed by hand has no time, so
   it gives what the user sees. A date that a formula such as `=NOW()`
   made, or that another program wrote with its time, and that the
   format shows as a date alone, gives the date and the time: a column
   of such dates shows times the user did not see in Excel, and, being
   text, may have a value for each individual where Excel shows a few
   dates. The user sees it in the table; nothing is left out. The option
   not taken: always the date and the time, `2024-05-13 00:00:00` for a
   date typed by hand, which is the same for every date and never
   depends on the number, but adds a time of midnight to every date,
   the common case, to spare the rare one. A third, reading the format
   from the file itself, is not in calamine 0.36.1, and would be a
   reader of the styles of the workbook written for the crate, and was
   not taken either.

## Not in this spec

- What the cells become in the table, the header, the first column, the
  spaces, the missing values, the types, and the words of the refusals:
  `docs/specs/worker/individuals.md`.
- Which files the Individuals step loads as an xlsx, by their name, and
  what it shows while one is read: `docs/specs/steps/individuals.md`.
- Writing an xlsx and zipping the report, rust_xlsxwriter and zip in the
  wasm, and what they add to its download: stage 6.
- Whether pandas, reading the xlsx the report writes, gives a number as
  the same text as the application, `1` and not `1.0`: stage 6, with the
  report (`docs/specs/analyses/diversity.md`, "Not in this spec").
- The workflow that installs Rust and builds the crate: `docs/specs/site.md`.
- `.xlsm`, a workbook with macros, which calamine reads as an xlsx, and
  `.ods`: whether the step loads them is the step's.
