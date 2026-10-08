# Writing the filtered variants as a file

Written on 26 September 2026, for stage 3 of `docs/build-order.md`, the
Variants step whole. There is no code of it yet. This spec gives how the
user writes the variants and the individuals the filters keep as a
`.nei` file and saves it: the request to the calculation worker, the
file it gives back, how the store tracks it, the size the step expects
and warns of, and the words. It develops section 3 of
`docs/functionality.md`, "Reading and writing", and sections 5 and 6 of
`docs/architecture.md`, "The workers and their messages" and "The files
written", with points 5 and 6 of its section 13. Revised on 26
September 2026, after the review of the code of stage 3: the warning
comes at `WRITE_WARN_BYTES` as well as above it, as the interface below
has it; and `sizeText` writes one byte as "1 byte". Revised on 27
September 2026 with the measurement of the write: the peak is about 4F
to 6.1F and not 3F, the largest file written is 1.98 GB and not 4 GB,
and the constants and the words of the warning and of a file too large
follow from it. Revised again on 27 September 2026, after the review of
the code: the estimate adds 40 bytes per variant, `BYTES_PER_VARIANT`,
since the columns of a variant cost about 22 to 40 bytes whatever the
number of individuals, which one byte per genotype missed by up to ten
times with 2 individuals; the words of a refusal for another ploidy and
of an empty source; and Save of a written file announced. Revised on 27
September 2026 with the owner's decisions at stop A of
`docs/plans/variants-step.md`, where the owner tried the screen: Write is
refused before a Count when the file may reach `WRITE_MAX_BYTES`, when
the Count says the filters keep no variant, and after a Count that
popnei refused; the warning says that phones and tablets fail with far
smaller files; once saved, the part gives the size written alone; and
its words leave out "in the Variants step", the step they are shown in.
Revised on 28 September 2026 for the owner's decision that day that the
LD filter of the Variants step starts with no distance: while it has
none, the store locks the writing with the reason of `variantFilterNeeds` of
`docs/specs/core/project.md`, and the job takes its filters from
`jobFilters`. This changes the code of stage 3, and the plan of stage 4
carries the change. Revised again that day for the owner's decision
that the filters of individuals act first (`docs/architecture.md`,
section 2): the runner puts the list of the individuals kept before the
filters of the variants, which count over those individuals, so a file
written with a filter of individuals holds other variants than before;
the write waits for the statistics of each individual once per load; and
the numbers with the thresholds are recomputed. These revisions are
approved by the owner on 28 September 2026; they change the code of stage 3.

Revised on 7 October 2026 for the thresholds of popgen2.html as filters
of the project (`docs/designs/stats-filters.md`, approved by the owner
that day): its job, its key, the name of its file (`writtenName`) and
the estimate of its size (`writeEstimate`) read the filters of the
variants that apply to the project's file, `filtersApplied(p)` of
`docs/specs/core/project.md`, in place of `p.filters`. A project keeps
its filters through a new file, so the filter of the FILTER column,
`passed`, can be on while a `.nei` file is open, and popnei refuses it
over a `.nei` file written before its format 1.2; `filtersApplied`
leaves it out for such a file, and gives `p.filters` itself otherwise. On
`popgen.html`, whose projects never hold that filter, the two are the
same array, so nothing a user sees changes.

Revised on 8 October 2026 for the download of the filtered variants on
popgen2.html (`docs/designs/stats-filters.md`, "The download of the
filtered variants", approved by the owner that day with its decisions
7 to 12; its screen is `docs/specs/steps/popgen2-download.md`), with
popnei 0.2.2, installed that day, whose `writeVars` and `writeVcf` hand
the file over in pieces of 1 MiB through `onBytes`. The write takes a
format, `"nei"` or `"vcf"`, the VCF always compressed with bgzip; the
runner gathers the pieces into one `Blob` in parts of 64 MiB, so that
the memory of wasm no longer holds the file, and reads its last byte
before it posts it; `writtenName` takes the format; a function of core,
`noVariantForCertain`, tells from the one pass of popgen2.html when the
filters keep no variant for certain; and the state `saved` of the store
keeps the file until the write's key changes, for the "Save it again" of
popgen2.html. The old page, popgen.html, writes the `.nei` file alone,
through the same runner, and keeps its Save, its estimate, its warning
and its limit of size, which the pieces leave cautious; popgen2.html has
none of the three. What is new is in the section "On popgen2.html" and
in the places it names; a sentence below that the pieces made untrue is
corrected where it stands, with its date.

**It is not an analysis** in the sense of section 4 of the architecture,
and it is under `docs/specs/analyses/` only because the architecture names
no other place for it. It has no definition of that shape, no result in
the cache, no check numbers, no entry in the project file and no lines
of the Python script: its answer is a file, which can be larger than the
bound of 256 MB of the cache, and which is on the user's disk once saved
(`docs/architecture.md`, section 5). The parts of other modules it asks
for are in `docs/specs/worker/protocol.md`, `runner.md` and `client.md`,
`docs/specs/core/store.md` and `keys.md`, `docs/specs/entry.md`, which
has the download, and `docs/specs/steps/variants.md`, which places the
button; they are listed at the end. The words key, load, pass and the
filters are those of `docs/specs/analyses/individualChecks.md`.

## What it does

The user presses "Write the filtered variants as a .nei file" in the
Variants step. The calculation worker makes one pass through the filters
of the variants and the filter of individuals, with popnei's `writeVars`
of `js/popnei/src/io_vars.ts`, and gives back the file. The step then
shows a button, "Save panel.filtered.nei, 19.2 MB", which saves it
through the browser's download. The file holds the six columns of a VCF,
the chromosome, the position, the id, the alleles, the quality and the
genotypes, of the variants kept and of the individuals kept, in the
order of the variants file; any analysis, and popnei in Python, reads it
as it reads the original.

What a user would see go wrong, and what the rules below prevent: a file
saved with other variants than the step shows, when a filter changed
during the write; a tab closed by the browser for its memory, with the
work since the last save of the project lost, when a file is too large;
and a download the browser blocks, when it starts with no click.

### The request and its answer

The store builds the request from the project, as the `run` of an
analysis does:

```ts
{
  format: "nei" | "vcf", // "nei" alone on popgen.html; the VCF bgzipped
  fileId: p.variants.fileId,
  filters: jobFilters(filtersApplied(p)),
  individuals: readonly string[] | null, // the individuals kept, as the store
                                         // hands them to every analysis; null
                                         // when the filters remove nobody
}
```

This is `WriteJob` of `docs/specs/worker/protocol.md`, tagged by its
`format` and not by an `analysis`, since it is no member of `Job`.

The runner puts `filterIndividuals(individuals)` on the `Variants` when
the list is not `null`, then the filters in their order, which count
over the individuals kept, and calls
`writeVars(variants, { onBytes })` with popnei's size of batch for a
`.nei` file, or `writeVcf(variants, { bgzip: true, onBytes })` for a
VCF. popnei writes the file as its pass reads, holding one block of it
in the memory of wasm, and gives `onBytes` each piece of 1 MiB, the last
one shorter, then returns the counts of its pass alone. The worker
gathers the pieces into a `Blob`, the browser's object for a file made
in the page, in parts of 64 MiB (`docs/specs/worker/runner.md`, "The
written file"), reads its last byte, and posts it; the `Blob` crosses to
the page as a handle, with no copy:

```ts
{ format: "nei" | "vcf", file: Blob, numBytes: number, passStats: PassStats }
```

Until 8 October 2026 popnei built the whole file in the memory of wasm
and copied it into one `Uint8Array`, of which the worker made the
`Blob`; the measurements below, "What was measured", are of that write.

This is `Written<Blob>` of the protocol; `numBytes` is the `size` of the
`Blob`, which core reads without naming a type of the browser.

`numPassesOf("writeVars")` is 1, so the bar fills once. Core has no type
of the browser, and the store holds the `Blob` without reading it, as a
value of a type it is given (`docs/specs/core/store.md`); only the page
reads it, to save it.

### Its key, and how the store tracks it

The store tracks a write as it tracks a calculation
(`docs/architecture.md`, section 5), under a key of the load, both lists
of filters and the format, `"nei"` or `"vcf"`, made by `docs/specs/core/keys.md`;
the list of the individuals kept is in no key, the thresholds are. So:

- it has a progress, a Stop, and a cancel that restarts the worker, as a
  calculation does;
- a change of a filter while it runs leaves it behind, and the notice of
  the change says "The writing of the file will be stopped unless you
  undo the change."; an undo while the notice is up lets it go on; it is
  stopped when the notice is closed or replaced, or when a calculation is
  asked for;
- a write that ends after such a change, and before it was stopped, is
  dropped: its file would hold other variants than the step shows, as the
  owner decided on 26 September 2026 (`docs/architecture.md`, section 13,
  point 6);
- a calculation asked for while a file is written waits behind it, in the
  queue of the one calculation worker;
- with a threshold on the individuals and no statistics of each individual
  for the current load in the cache, the write starts
  their calculation first, and its own request is sent when they arrive,
  as a Run of an analysis that reads the filters of individuals does;
- its answer is never put in the cache, but its counts are, under the
  key of `filterCounts`, since its pass had the project's filters
  (`docs/specs/analyses/filterCounts.md`, "Which results fill it").

### Saving the file

The step shows the Save button when the write ends, with the name and
the size of the file. Pressing it starts the download through a link
that names the file, a link with the `download` attribute, which every
browser of the floor of `docs/technology.md` has; on the old page the
save is a click of its own, since a download started by the code minutes after the click
that asked for it may be blocked by the browser, or asked about, as
Chrome does for a page that starts several downloads. The address the
link reads the file from is released a minute after the click
(`src/ui/download.ts`), and the `Blob` when a change of the filters, a
new write or a new load makes the file other than the step shows, as
section 6 of the architecture has it (`docs/specs/entry.md`, "A file of
the filtered variants saved"; `docs/specs/core/store.md`, `writeSaved`).
Until 8 October 2026 the store forgot the `Blob` once Save was pressed
too; it now keeps it in the state `saved` until such a change, for the
"Save it again" of popgen2.html, and the old page holds it so as long as
it held it before the Save. The old page is not told whether the
browser kept the download and does not offer the file again: a user who
cancels the question of a browser that asks where to save writes the
file again, as the owner decided on 26 September 2026 (point A of
`docs/specs/stage-3-open-points.md`), and its words stay "To save it
again, write it again." A file written and not saved that
a change of the filters, or a new load, releases is gone, and an Undo
does not bring it back; the notice of that change says so, as the owner
decided on 26 September 2026 (point G of
`docs/specs/stage-3-open-points.md`).

The name, `writtenName` of `src/core/fileNames.ts` (below, "The
functions of core"), is the stem of the variants file, `variantsStem` of
the same module, with `.filtered.nei`, or `.filtered.vcf.gz` for a VCF:
`panel.vcf.gz` gives `panel.filtered.nei`. With no filter of the
variants that applies to the file, `filtersApplied(p)` empty, and no
filter of individuals the name of a `.nei` file is the stem with `.nei`,
`panel.nei`, since the
file is then the variants file converted, which is what the application
suggests doing once with a VCF (`docs/functionality.md`, section 3). A
VCF keeps `.filtered.vcf.gz` with no filter too, decided on 8 October
2026 after the review of this spec: from `panel.vcf.gz` the name
`panel.vcf.gz` would be that of the file it came from, which a browser
that asks where to save offers to overwrite, and the bytes differ, since
popnei compresses it again with bgzip. The
size is `numBytes` as `sizeText` writes it, below: "251 KB", "19.2 MB",
"1.2 GB".

### The size, before the write

This section is the old page's, `popgen.html`, which keeps it as it is.
Its numbers were measured on 27 September 2026 with popnei building the
whole file in the memory of wasm; with the pieces, from 8 October 2026,
the tab holds about F and not 4F to 6.1F, and the limits below are
cautious, as the design decided (`docs/designs/stats-filters.md`,
"Whether a limit of size is needed"). popgen2.html has no estimate,
warning or limit (below, "On popgen2.html").

The tab holds, at the peak of a write of F bytes, 4.1F to 4.4F above
what it held before in Chromium and 4.8F to 6.1F in WebKit (measured,
below, and in the doubled files of `VS5 D5`); the warning below says
"about six times". In
Chromium, where the parts can be told apart, that is about 2.4F in the
memory of wasm, where popnei builds the file, which is what the page's
process held beyond the array, F in the array, and F in the browser's
own process, where the engine copies the array into the `Blob`. A file
of about 2.2 GB, 2,000,000 variants of 1,000 individuals, could not be
written in either engine, and in WebKit its write closed the tab. So the step says the size
it expects before the user writes:

- **The estimate** is the variants kept times the bytes of one
  variant: the individuals kept at one byte per genotype,
  `BYTES_PER_GENOTYPE`, and 40 bytes for its other columns,
  `BYTES_PER_VARIANT`. A file of popnei holds, for each variant, its
  genotypes, which popnei's compression takes to about one byte each,
  and its chromosome, position, id, alleles and quality, which cost about
  the same whatever the number of individuals, and which one byte per
  genotype alone left out. `e2e/measure/writeSize.ts` measured both, in
  node with the popnei of `package.json`, `js-v0.1.0-dev.2`, on 27
  September 2026: the files `writeVars` wrote of 50,000 variants of 2,
  10, 20, 200 and 1,000 individuals, with the random genotypes of
  `e2e/bigVcf.ts`, took beyond one byte per genotype 22 to 24 bytes per
  variant for 2 to 20 individuals with one chromosome and no id nor
  quality, 27 to 29 with twelve chromosomes of the names of an assembly,
  `SL4.0ch01`, a quality and the four bases, and 40 to 42 with an id of
  11 characters too; for 200 and 1,000 individuals the genotypes took
  1.07 to 1.09 bytes each. So the file is at most 7% larger than the
  estimate in every case measured: 6.9% for 1,000 individuals with ids,
  a file of 55,589,898 bytes of an estimate of 52,000,000; and the
  estimate is up to 77% larger than the file for 2 individuals with no
  id, 42 bytes per variant for a file of 23.7. Of the files of real
  genotypes, the `.nei` file of 19,161,178 bytes, 20,000 variants of
  1,000 individuals (`docs/specs/worker/runner.md`), is 8% under its
  estimate, 20,800,000 bytes, and `panel.nei` written at 0.05, 250,994
  bytes, 9% under its estimate, 276,480 bytes. Before this revision the
  estimate was one byte per genotype alone, which gave 100,000 bytes for
  a file of 1,182,922 of 2 individuals. An id or alleles longer than
  those measured, as those of indels, make a variant cost more, and the
  file larger than the estimate. The variants
  kept are the counts of
  `filterCounts` for the current filters, when the cache has them, and
  otherwise the variants of the file, when a pass has counted them; the
  individuals kept are those of `individualsKept` of
  `docs/specs/core/individualsKept.md`, and those the lists keep,
  `byLists`, while a threshold waits for its statistics. An estimate
  from a bound says "at most about".
- **The warning** comes at or above `WRITE_WARN_BYTES`, 500 MB, a constant
  of the code: a file of 500 MB to 550 MB, at 1 to 1.1 bytes per
  genotype, needs at its peak up to about 2.4 GB more in Chromium and
  3.4 GB more in WebKit, a large share of a computer of 8 GB. Its words are
  below. No computer of 8 GB was measured; the value is a judgment on
  the peak, and nothing was seen to fail at it. The warning also says
  that phones and tablets fail with far smaller files, as the owner
  decided on 27 September 2026: Safari on an iPhone closes a tab that
  asks for more than about 300 to 450 MB on the iPhone 11 to 14, and
  about 1 GB from the iPhone 15, from reports and not from a device, so
  a file of 50 to 200 MB can close it, and Safari there never asks
  before a page is left. The limits stay those of a computer, since the
  population genetics page is meant for one, and the page cannot tell a
  phone for certain.
- **At an estimate of `WRITE_MAX_BYTES` or more from the counts
  themselves**, not from a bound, the button is disabled with its reason
  as text beside it, since the write would fail. `WRITE_MAX_BYTES` is
  1.8 GB, 1,800,000,000 bytes: with the file at most 7% larger than its
  estimate, an estimate under it is a file under 1.93 GB, and the
  largest file written in both
  Chromium and WebKit was 1,982,018,522 bytes, 1,800,000 variants of 1,000
  individuals, while one of 2,000,000 variants, about 2.2 GB, failed in
  both. The 4 GB its words name are the most memory wasm addresses, 4
  GiB, in which popnei builds the file; the failure between 1.98 GB and
  2.2 GB fits a file that needs more than twice its size there. Its words
  are below.
- **Before a Count, at a bound of `WRITE_MAX_BYTES` or more**, an
  estimate from the variants of the file with a filter of the variants,
  the button is disabled too, with words that ask for the Count, which
  gives the exact size in one pass, as the owner decided on 27 September
  2026: a VCF not yet counted whose file would be over about 2 GB stops
  the worker in Chromium and closes the tab in WebKit. While the Count
  runs, the words say that the size comes when it ends, and not to
  press it. The option not taken left Write offered on the bound, with
  the warning alone. A bound from the individuals, while a threshold
  waits for the statistics of each individual, is not refused: the
  Count does not make it exact.
- **When the Count says the filters keep no variant**, `variantsKept`
  0, or the variants file holds none, the button is disabled with the
  words of a file of no variant, since a write would give a file that
  the step does not offer; and **after a Count in error with no button
  to count again**, a refusal of popnei or a variants file the browser
  can no longer read, it is disabled with words that send the user to
  the words of the Count, since a write makes the same pass over the
  same filters and would fail the same way. Both decided by the owner
  on 27 September 2026; before, Write was offered in both cases.

Once the write has ended, the calculation worker is started again when
the file is larger than `WRITE_RESTART_BYTES`, a constant of
`src/worker/client.ts` (`docs/specs/worker/client.md`), to give the tab back the
memory of wasm the file took, which would otherwise stay until the next
load, as the owner decided on 26 September 2026 (`docs/architecture.md`,
section 13, point 5). `WRITE_RESTART_BYTES` is 25 MB: a write of the
`.nei` file of 19,161,178 bytes, which does not restart the worker, left
the tab 88 MB larger than before in Chromium and 80 MB in WebKit, about
4.5 times the file, so a file of 25 MB leaves at most about 115 MB, and
a larger one is given back. 25 MB keeps what a write leaves near the 100
MB that the value before the measurement, 100 MB of file, was meant to
leave when a write was thought to leave its size, at the cost of a
restart after any file above it, 49 ms in stage 3. The restart costs the
intermediate results the worker held and the reading of the file's
header, at most 49 ms from the start of a new worker to the file opened,
measured at the end of the walking skeleton on the `.nei` file of
19,161,178 bytes and its VCF, in Chromium 153 and WebKit 26.6 on the
owner's Mac (`docs/plans/walking-skeleton.report.md`). The worker is
started again, too, after a write that popnei refused, whatever the
size of the file, since a refusal for memory leaves the memory of wasm
grown by the part of the file it had built (`docs/specs/worker/client.md`).
With the pieces, from 8 October 2026, wasm grows by one block of the
file and not by the file, so the restart may give back little; it stays
until the plan measures what a write leaves in the tab, and is dropped
if it gives back nothing (below, "What is measured in the plan").

### What was measured

These are measurements of the write before the pieces, in which popnei
built the whole file in the memory of wasm. On 27 September 2026, by `VS5 D5` of `e2e/measure.spec.ts`, on the built
site, in Chromium 153.0.8010.12 (Playwright's headless shell) and WebKit
26.6, with Playwright 1.63.0, on the owner's Mac, an Apple M5 Pro with 64
GB of memory and macOS 27.0. The memory is the footprint that macOS
gives each process of the engine, its memory in RAM or compressed,
summed over all of them, since the `Blob` is kept in another process
than the page's; each write is on a new page, with the filters of a new
project, and the file is saved and read back whole with pyarrow. Firefox
cannot be launched by Playwright on that Mac and was not measured.

| | Chromium | WebKit |
|---|---|---|
| the `.nei` file of 19,161,178 bytes written from itself: the write, median of 5 | 144 ms | 149 ms |
| its peak, above the tab before the write | 109 MB | 134 MB |
| left in the tab 3 s after, the worker not started again | 107 MB | 0 MB (−37 MB) |
| the file of 200,000 variants, 220,236,506 bytes, from its gzipped VCF of 127.6 MB: the write, median of 5 | 3.73 s | 3.70 s |
| its peak, above the tab before the write | 966 MB, 4.4F | 1,059 MB, 4.8F |
| the `Blob` made of the array | 13 ms, a copy into the browser's own process, which grew by 220 MB | 12 ms; in some writes WebKit's network process grew by the size of the file within 1.5 s, in others no process did |
| left in the tab 3 s after, the worker started again | 246 MB, the `Blob` in the browser's process | 45 MB |
| the largest file written, 1,800,000 variants | 1,982,018,522 bytes in 33.8 s, peak 8.28 GB | 1,982,018,522 bytes in 33.5 s, peak 11.46 GB |
| 2,000,000 variants, a file of about 2.2 GB | the worker stopped with no answer, the words of `workerFailed`; the same when tried again | the tab closed |

The rows of 19,161,178 bytes in WebKit are the engine's processes
summed, among which its GPU process fell by about 110 MB during the
write; its page's process, where the worker runs, was 80 MB larger 3 s
after. Every file saved was whole: its size was the size of the `Blob`,
and pyarrow read every batch, with the variants and the 1,000
individuals it was written with.

### The functions of core

The step and the words of the shell read the name, the estimate and the
sizes from these functions, pure, so that Vitest checks them in node. The
name goes in `src/core/fileNames.ts`, beside `variantsStem`, since that
module names every file the application writes; the estimate and the
sizes in `src/core/writeEstimate.ts`, with the constants above. Both are
rows of section 9 of `docs/architecture.md`.

```ts
// src/core/fileNames.ts
/** The name of the written file of the filtered variants in `format`:
    "panel.filtered.nei" or "panel.filtered.vcf.gz" from panel.vcf.gz with
    a filter; with no filter of the variants that applies to the file and
    none of individuals, "panel.nei" for a .nei file and still
    "panel.filtered.vcf.gz" for a VCF; "project.nei" or
    "project.filtered.vcf.gz" for a project with no variants file, which
    no page asks. */
export function writtenName(p: Project, format: WriteFormat): string;

// src/core/noVariantKept.ts
/** Whether the one pass of popgen2.html, `summary`, finished (`done`;
    never a result so far nor that of a stopped pass), shows for
    certain that the filters of `p` that apply to its file keep no
    variant, the individuals kept being `kept` (below). */
export function noVariantForCertain(
  p: Project,
  summary: VariantsSummaryResult,
  kept: IndividualsKept | null,
): boolean;

// src/core/writeEstimate.ts
export const BYTES_PER_GENOTYPE = 1;
export const BYTES_PER_VARIANT = 40;          // the columns of a variant but its genotypes
export const WRITE_WARN_BYTES = 500_000_000;  // a peak of about 2 GB more in Chromium, 3 GB in WebKit
export const WRITE_MAX_BYTES = 1_800_000_000; // a file under 1.93 GB, under the 1.98 GB both engines wrote

export interface WriteEstimate {
  readonly numVars: number;         // the variants the file would hold, or their bound
  readonly numIndividuals: number;  // the individuals, or their bound
  readonly numBytes: number;        // numVars * (numIndividuals * BYTES_PER_GENOTYPE + BYTES_PER_VARIANT)
  readonly bound: boolean;          // either count is a bound: "at most about"
  readonly warn: boolean;           // numBytes >= WRITE_WARN_BYTES
  readonly tooLarge: boolean;       // numBytes >= WRITE_MAX_BYTES and not bound
}

/** The size expected of the file, or null when the variants are not
    known, no counts and no number of variants of the file, or when
    `kept` is null. `variantsKept` is the number of variants the counts of
    filterCounts give for the current filters, `passStats.numVars` of its
    result when done, which the Variants step and the shell read the
    same way, `variantsKept` of `docs/specs/shell.md`, or null. */
export function writeEstimate(
  p: Project, kept: IndividualsKept | null, variantsKept: number | null,
): WriteEstimate | null;

/** A size of a file in decimal units: "812 bytes", "251 KB", "19.2 MB", "1.2 GB". */
export function sizeText(numBytes: number): string;
```

`writeEstimate` takes the variants from `variantsKept`, exact; when it
is `null`, from `numVars` of the read of the variants file, exact with
no filter of the variants that applies to the file, `filtersApplied(p)`
empty, and a bound with one; and `null` when neither
is known. It takes the individuals from `kept.list`: all those of the
file when the list is `known` with `null`, the length of the list when
it is `known` with one, both exact; `byLists`, a bound, when it is
`needsStatistics`.

`sizeText` writes a size under 1,000 bytes in bytes, "1 byte" for one
and "812 bytes" for any other number, under 1,000,000 in whole KB, under 1,000,000,000 in MB with one decimal, and above in GB
with one decimal, each rounded to the nearest, with a comma between
groups of three digits of the whole part, as `grouped` of
`docs/specs/core/project.md` writes a count. A size that rounds to 1,000
of its unit is written in the next: 999,600 bytes is "1.0 MB". So
250,994 bytes is "251 KB", 19,161,178 "19.2 MB", and 4,300,000,000 "4.3
GB". It is the same function for the estimate and for the written file.

`noVariantForCertain` is for popgen2.html, which writes with no count
before: it says, from the one pass alone, when a write would give a file
of no variant, so that the page says so in place of its button and
writes nothing (`docs/specs/steps/popgen2-download.md`, "When the
filters keep no variant"). Its `summary` is the result of the one pass
finished, `variantsSummary` done, over every variant and every
individual of the file, and never a result so far nor that of a
stopped pass: over the variants read so far, every one may have failed
its FILTER or a low bin may be empty though popnei keeps variants
further on. Its histograms of the variants are popnei's
1,000 bins over 0 to 1 that hold their right edge, the first holding 0
as well (`VARIANT_FINE_BINS`, `VARIANT_RANGE`, `VARIANT_BINS_CLOSED`).
It answers true when one of these holds, and false otherwise:

- the filters that apply to the file, `filtersApplied(p)`, hold the
  filter of the FILTER column, and no variant of the file passed its
  FILTER, `summary.filterColumn.passed` 0. That filter judges a variant
  by its FILTER column alone, whatever the individuals;
- the filters of the individuals keep every individual, `kept.list` known
  with `null`, and one threshold of the variants among `filtersApplied(p)`,
  the missing rate, the MAF or the observed heterozygosity, keeps no
  variant of its histogram: at a threshold t above 0, the bins whose
  right edge is at most t hold no variant; at 0, the first bin holds
  none. The first bin holds 0 and the values up to 0.001, so at 0 only an
  empty first bin says that no variant has the value 0: on
  `panel.vcf.gz` two variants have a missing rate of 0, and popnei's
  filter at 0 keeps them (node, popnei 0.2.2, 8 October 2026). A
  variant with no called genotype is in no histogram of the MAF or of
  the observed heterozygosity, and their filters drop it at any
  threshold, so it changes nothing; the missing rate counts it, at 1.
  A threshold that is no edge of the bins is a defect, thrown, as in
  `variantsAllKept` of `src/core/thresholds.ts`: the page rounds every
  threshold to an edge.

It answers false in every other case, though the write may keep no
variant: with an individual left out, since a variant's values over the
individuals kept are not those of its histogram; and for two filters
that each keep some variants and may keep none together, since each
histogram is of one statistic. An LD filter, which popgen2.html does not
have, makes no answer certain. It reads popnei's bins and counts and
counts nothing else; it computes no statistic.

## The cases

- **The LD filter with no distance.** The write is locked by the store
  with the reason of `variantFilterNeeds` of
  `docs/specs/core/project.md`, which the step shows without its end
  "in the Variants step" under the empty field of the distance, and
  beside the button as the short line "Locked until the distance of the
  LD pruning is typed, above.", which describes it
  (`docs/specs/steps/variants.md`, "Its words"); the Count is locked with it, and the statistics of
  each individual and the histograms of the variants, which read no
  filter of the variants, are not.
- **A list of individuals popnei would refuse**, a list to keep that
  names an individual not in the file. The write is locked by the store
  with the reason of `individualListNeeds` of
  `docs/specs/core/project.md`, which the step shows under the list it
  names and beside the button. The same reason locks the Count and the
  histograms of the variants, which read the filters of individuals;
  the statistics of each individual, which read no filter, are not
  locked. Until 29 September 2026 this said none of the three checks of
  the step was locked, and the spec took the code, as the owner decided
  that day.
- **The filters keep no variant.** `writeVars` does not refuse: on
  `panel.nei` with the missing data filter at 0.05 and the MAF filter at
  0.4 it gave a file of 3,594 bytes and no variant (node, 26 September
  2026), and `js-v0.1.0-dev.3` one of 3,682 bytes. The store keeps nothing of a file whose `passStats.numVars` is
  0, and its state `write` is `noVariant` (`docs/specs/core/store.md`),
  so the step shows no Save button, and says so (below), and the page
  holds no file that nobody can save; its counts fill `filterCounts`, so
  the user sees which filter kept none. Once the counts of the filters
  as they are say so, from a Count or from such a write, Write is
  disabled with that reason, and no write is made (above, "The size,
  before the write").
- **The variants file holds no variant**, or, for a VCF read with only
  the variants with PASS or . in its FILTER column, none that passed.
  `writeVars` does not refuse an empty source either (popnei's
  `write_vars`, `vars.rs`), so the write ends in `noVariant` as above,
  and its `passStats` tell the case apart: the first filter was given no
  variant, or, with no filter, the pass gave none, `variantsOfFile` of
  `docs/specs/analyses/filterCounts.md` giving 0. No filter would help,
  so the words are those of an empty source that the analyses give for
  popnei's refusal of one (`docs/specs/analyses/diversity.md`, "Its
  words"), with "there is nothing to write" (below).
- **The filters keep no individual.** The write is locked by the store,
  since popnei refuses an empty list, with the words below.
- **A file written and not saved.** The step offers Save, and no second
  write of the same filters, which would give the same file: a new write
  needs another key, a change of the filters, which forgets the file of
  the one before and releases it, and the notice of the change says that
  the file was discarded and that Undo does not bring it back (**Open
  1**).
- **The statistics of each individual that the write waited for fail.**
  A refusal of popnei, or another failure, of the statistics the write
  started first, puts the write in the state `error` with that failure,
  as it does an analysis that reads the filters of individuals
  (`docs/specs/core/store.md`); Write does nothing after a refusal of
  popnei, which would come again, and starts the statistics again after
  another failure.
- **A write stopped, or left behind and stopped**, gives no file; the
  step shows the button to write again.
- **A new load of the variants file** stops the write at once, as every
  request in flight (`docs/architecture.md`, section 5).
- **A project file saved and opened.** Nothing of a write is in it.
- **The memory of the tab does not take the file.** popnei refuses the
  write with a plain `Error`, which the runner answers as a refusal of
  popnei, or the engine traps, `workerFailed` (`docs/specs/worker/runner.md`,
  "The written file"); the words of both, below, say what to do, and
  neither blames the variants file.

- **On popgen2.html, the filters keep no variant.** The page says so
  before the write when `noVariantForCertain` is true, and after it
  otherwise, from the state `noVariant`; nothing is downloaded
  (`docs/specs/steps/popgen2-download.md`).
- **On popgen2.html, a variants file of no variant.** popnei refuses the
  one pass of such a file, "the pass gave no variant and its source
  holds none" (node, popnei 0.2.2, 8 October 2026, a `.nei` file of no
  variant written from `panel.nei`), so the download waits for
  statistics that never come, and the box of the file says "panel.nei
  has no variants. Open another variants file." The design's sentence
  for such a file is not reached.
- **A file the browser cannot keep.** A `Blob` that the browser's storage
  could not take is made at once and fails only when it is read, in
  Chromium (the design, "Whether a limit of size is needed"); so the
  worker reads the last byte of the finished `Blob` before it posts it,
  and a `Blob` it cannot read ends the write as a crash of the worker,
  `workerFailed`, whose words say that the file did not fit.
- **A Stop during a write** ends the worker, and what it held of the
  file goes with it; nothing is left on the disk or in the page.

## The step's part

The button, the estimate and the Save button are in the Variants step,
under the filters (`docs/specs/steps/variants.md`). Its title in the
notice and the status region is "Writing the file".

### The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: while the variants file is not read the part is not drawn, and the step shows the line of a file not read in its place (`docs/specs/steps/variants.md`, "What it does") | |
| locked | the reason of `individualListNeeds` of `docs/specs/core/project.md`, or of `variantFilterNeeds` of the same spec, the LD pruning with no distance, in that order, or of the filters keeping no individual, beside the disabled button; for the LD pruning, the short line "Locked until the distance of the LD pruning is typed, above." in place of the reason, which stands under the field of the distance. While the variants file is not read, when the store locks it with the reason of `projectNeeds`, the part is not drawn, as for empty | what the reason says |
| ready | the button, and the estimate: "About 20.8 MB: 20,000 variants of 1,000 individuals."; disabled, with its reason, for a file too large, a bound too large before a Count, filters that keep no variant, or a Count refused (above, "The size, before the write") | Write; what the reason says |
| waiting for the statistics | "Calculating the statistics of each individual, which the thresholds of the individuals need · 35% · 0:12" | Stop |
| writing | "Writing panel.filtered.nei · 35% · 0:12", the bar of the diversity | Stop |
| written, the store's `done` | "Save panel.filtered.nei, 19.2 MB" | Save |
| written with no variant, the store's `noVariant` | the words of a file of no variant, below, and no Save | loosen the filters |
| saved, the store's `saved` | "panel.filtered.nei, 19.2 MB, was handed to the browser to save. To save it again, write it again." and the button to write, with no estimate beside it, so that the part gives one size of the file, the one written, as the owner decided on 27 September 2026; when Write is then disabled, a Count refused after the save among the reasons, the line ends at "… to save.", since it cannot be written again | Write |
| stopped or dropped, the store's `ready` | the button to write, and, when a change dropped it, `dropped`, "The file was not kept, since the filters changed while it was written." | Write |
| results removed | a file written and not saved, which a change of the filters or a new load discarded: the part is `ready` for the new filters, with the button to write, and the notice of the shell says that the file was discarded and that Undo does not bring it back (`docs/specs/shell.md`, "The notice"; point G of `docs/specs/stage-3-open-points.md`) | Write; the Undo of the notice, which brings the filters back and not the file |
| error | the words of the failure, below | as the words say |

The estimate of the ready state is 20,000 variants of 1,040 bytes each,
1,000 genotypes at one byte and 40 bytes more, 20,800,000 bytes, "20.8
MB"; the file popnei writes of them
is 19,161,178 bytes, "19.2 MB", which the Save button shows.

### Its words

The sizes in the words are the estimate, "about"; 1.0 GB is a million
variants of 1,000 individuals, 1,040,000,000 bytes, 2.0 GB about
1,920,000 variants of 1,000 individuals, and "at most about 2.1 GB" a
bound of 2,000,000 variants of 1,000 individuals before a Count.

The part is in the Variants step, so its words leave out "in the
Variants step", which the words of the same failures end with elsewhere
in the application, the stepper and the status region among them: "Load
another variants file." and not "Load another variants file in the
Variants step.", as the Variants step does for its own reasons
(`docs/specs/steps/variants.md`, "What it does"), and as the owner
decided on 27 September 2026. The words the part takes from other
specs, below, are given as the part shows them.

| when | the text |
|---|---|
| at or above `WRITE_WARN_BYTES` | "Warning: a file of about 1.0 GB may need about six times that in the memory of this tab while it is written, and a browser may close a tab that asks for too much, losing the work since the project was last saved. On a phone or a tablet, the write fails with far smaller files. Save the project first. To write a smaller file, remove variants or individuals with the filters; to write any size, use popnei in Python." |
| an estimate of `WRITE_MAX_BYTES` or more | "A file of about 2.0 GB cannot be written in a browser tab: popnei needs more than twice the file in its memory while it writes it, and a tab gives popnei at most 4 GB. Remove variants or individuals with the filters, or write the file with popnei in Python." |
| before a Count, a bound of `WRITE_MAX_BYTES` or more, the Count ready or in error with its button, beside the disabled button | "A file of at most about 2.1 GB may be too large to be written in a browser tab. Count the variants first, above." |
| the same, while the Count runs | "A file of at most about 2.1 GB may be too large to be written in a browser tab. Its size is known once the Count above ends." |
| the Count done, and the filters keep no variant, beside the disabled button | "The filters keep none of the variants of panel.nei, so there is nothing to write. Loosen the filters above." |
| the variants file holds no variant, beside the disabled button | the words of a file of no variant below, in the present: "panel.nei has no variants, so there is nothing to write. Load another variants file." |
| no counts, and the Count in error with no button to count again, since popnei refused it or the browser can no longer read the variants file (`filterCounts.md`, "The states"), beside the disabled button | "The variants could not be counted, so the file cannot be written either: the Count above says why." |
| no counts and no number of variants, the Count ready or in error with its button | "The size of the file is known once the variants are counted: Count, above." |
| the same, while the Count runs | "The size of the file is known once the Count above ends." |
| the filters keep no variant, `noVariant` | "The filters kept none of the variants of panel.nei, so there is nothing to write. Loosen the filters above." |
| the variants file holds no variant, `noVariant` with `variantsOfFile` 0 | "panel.nei has no variants, so there is nothing to write. Load another variants file." |
| a VCF read with only the variants that passed holds none that passed, `noVariant` with `variantsOfFile` 0 | "panel.vcf has no variant with PASS or . in its FILTER column, and it was read with only those, so there is nothing to write. Untick "Only the variants with PASS or . in the FILTER column" and read the file again." |
| the filters keep no individual | the store's lock, `keptNoneReason` of `docs/specs/core/individualsKept.md`: "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them."; and a list of individuals popnei would refuse, `individualListNeeds`: "… Change the list, or remove the filter." |
| the worker stopped with no answer, a trap of the wasm or a memory that could not grow, `workerFailed` | "The writing stopped unexpectedly, perhaps because the file, of about 1.0 GB, did not fit in the memory of this tab. Remove variants or individuals with the filters and write it again, or write the file with popnei in Python." |
| popnei refused the write for a genotype of another ploidy than the VCF was read with, its message "line ‹n› of the VCF, the column of ‹individual›: its genotype is of the ploidy ‹found› and the variants are read with the ploidy ‹given›" | "panel.filtered.nei could not be written. ", then the words the analyses give that refusal (`docs/specs/analyses/diversity.md`, "Its words"): "At line 12 of panel.vcf.gz, the genotype of ind_3 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version." |
| popnei refused the write otherwise, for a memory that does not take the file or for a line of the VCF it cannot read, which its message alone tells apart | "panel.filtered.nei could not be written: popnei stopped with "‹its message›". A file of about 1.0 GB may not fit in the memory of this tab: remove variants or individuals with the filters and write it again, or write the file with popnei in Python. If the message names a line of the VCF, correct the file, or fetch it again, and load it again." |
| the statistics of each individual it waited for failed | "The statistics of each individual, which the thresholds of the individuals need, could not be calculated, so the file was not written. ", then the words the statistics' own part gives that failure (`docs/specs/analyses/individualChecks.md`, "Its words"): "… popnei could not read panel.vcf.gz: ‹its message›. Correct the file, or fetch it again, and load it again."; their pass has no filter since 28 September 2026, so filters that keep no variant are not among their failures |
| the browser can no longer read the variants file, `reopenFailed` | the diversity's words, "panel.nei could not be read again; it may have changed on the disk since it was picked. Load it again." |
| the calculations could not start, `couldNotStart`, or the page is out of date after a new version of the site, `protocolMismatch` | the diversity's words, "The application could not start its calculations. Save the project, reload the page, and open the project again." and "The page is out of date. Save the project, reload the page, and open the project again." |
| an error of the application's own code, `defect` | "The application met an error of its own: ‹message›. Write the file again." |

What the table leaves open, chosen with the code of the step on 27
September 2026:

- An estimate from a bound starts "At most about" in the ready state,
  "At most about 288 KB: 1,200 variants of 200 individuals.", and says
  "at most about" in the warning.
- The line of the writing before the first progress has no share,
  "Writing panel.filtered.nei · 0:12", and, when the write waits for
  the variants file to be opened again after a stop, "Waiting for
  panel.nei to be opened again, then writing panel.filtered.nei · 0:12",
  as the diversity's line does; the line of the statistics it waits for
  does the same with "calculating the statistics of each individual,
  which the thresholds of the individuals need". The bar is named
  "Writing panel.filtered.nei", or "Calculating the statistics of each
  individual" while the write waits for them.
- When no size is known at a failure, no counts and no number of
  variants, the words of `workerFailed` and of popnei's refusal leave the
  size out: "The writing stopped unexpectedly, perhaps because the file
  did not fit in the memory of this tab. …" and "… popnei stopped with
  "‹its message›". The file may not fit in the memory of this tab: …".

The help, for the drawer of stage 8: what the file holds; that a `.nei`
file is read many times faster than a VCF, so converting once is worth
it; the memory a large file needs, and `popnei.write_vars(variants,
path)` in Python, which writes to the disk with no such limit.

### Accessibility

The Save button takes the focus when the write ends, if the focus was on
the button that asked for it, which the write replaces; otherwise the
focus stays where it is, and the end is announced by the shell's status
region, "panel.filtered.nei is written, 19.2 MB; Save it in the Variants
step." Save keeps the focus as it turns into Write, and the status
region says "panel.filtered.nei was handed to the browser to save.", so
that a user of a screen reader learns that the press did something
before a second Enter starts a new write (`docs/specs/shell.md`, "The
status region"). The warning says "Warning:" in words (WCAG 2.2,
1.4.1).

### Left for the running application

Where the button and its estimate sit, and whether the estimate is shown
before the user asks.

## On popgen2.html

The download of `docs/specs/steps/popgen2-download.md` is this write,
with what the old page's step adds left out: no estimate, no warning,
no limit of size, no Count, and no Save but the download started by
itself and its "Save it again", as the owner decided on 8 October 2026
(the design, "What the owner decided", 7 to 12).

### What it asks of core

- The store of popgen2.html is made with a `write`, `Client.write` and
  `writeCountsOf`, as the old page's is, and with the one pass,
  `variantsSummary`, as its `statistics`, the analysis whose result
  gives each individual's missing rate and heterozygosity
  (`perIndividual` of its result). The store then works out the
  individuals kept, and `keptNoneReason`, from the one pass finished,
  and from nothing before: a result so far, or the one kept after a Stop,
  is never in the cache (`docs/specs/core/store.md`, "The individuals
  kept"). Its `counts` stays `null`, so the counts of a write are put
  nowhere but in its state.
- The format is the user's choice in the dialog, `"vcf"` or `"nei"`,
  given to `startWrite`; the key of the write holds it.
- The name is `writtenName(p, format)`.

### What a write holds

A write of a file of F bytes holds, from 8 October 2026, the `Blob`, F,
up to 64 MiB of pieces in the worker before they become a part of it,
and one block of the file in the memory of wasm, about 10 MB of
genotypes for 1,000 individuals at the size popnei writes (the design,
"What popnei 0.2.2 gives"), where the write before held 4.1F to 6.1F
(above, "What was measured"). Where each browser keeps the bytes of the
`Blob` is in the design, "How the pieces reach the user's download":
Chromium in its own process up to 2 GB of `Blob`s and on the disk past
that, Firefox not settled by its sources, WebKit not documented. The
store keeps the file after its download until the write's key changes,
for "Save it again".

No limit is set before the write, as the owner decided on 8 October
2026. A write the browser cannot hold ends in an error, the worker's
crash or a `Blob` it cannot read, both `workerFailed`, with the words
below; a tab the browser closes says nothing, and the plan looks for the
size at which that happens.

### Its words on popgen2.html

Shown in the dialog in place of the bar, with Close
(`docs/specs/steps/popgen2-download.md`, "When the write fails"); the
examples are of `low_qual.vcf.gz` written as a VCF. They leave out the
size, which popgen2.html does not know before the write, and the
project, which popgen2.html does not save.

| when | the text |
|---|---|
| popnei refused the write, `refused` | "low_qual.filtered.vcf.gz could not be written: popnei stopped with "‹its message›". If the message speaks of memory, the file may be too large for this tab: leave out more variants or individuals with the filters, or write the file with popnei in Python, which writes files of any size. If it names a line of the VCF, correct the file, or fetch it again, and open it again." |
| the worker stopped with no answer, or the `Blob` could not be read, `workerFailed` | "low_qual.filtered.vcf.gz could not be written: the writing stopped unexpectedly, perhaps because the file did not fit in the memory of this tab. Leave out more variants or individuals with the filters and download again, or write the file with popnei in Python, which writes files of any size." |
| the browser can no longer read the variants file, `reopenFailed` | the words of the box of the file for it, `failedText` of `src/ui/variants/words.ts`: "low_qual.vcf.gz could not be read again; it may have changed on the disk since it was opened. Open it again." |
| `couldNotStart` | "The application could not start its calculations. Reload the page and open low_qual.vcf.gz again." |
| `protocolMismatch` | "The page is out of date. Reload the page and open low_qual.vcf.gz again." |
| a defect of our own code, `defect` | "The page met an error of its own while writing low_qual.filtered.vcf.gz: ‹message›. Download again." |

A failure of the statistics the write waited for, `ofStatistics`, does
not reach the dialog: the button is enabled only once the one pass is
finished, so the write never waits for it. The kind `files` is a defect,
thrown, as in the box of the file: the calculation worker holds no files
wasm.

### What is measured in the plan

As the design asks ("How it is tested, and what would prove it wrong",
and "Whether a limit of size is needed"), on the built site:

- the largest file written and saved in Chromium and WebKit, files of 2,
  4 and 8 GB from `e2e/bigVcf.ts` as `VS5 D5` did, with the memory of
  each process; a file past Chromium's quota of `Blob`s on the disk; and
  a file of 2 GB in Firefox by hand, with `about:memory`;
- whether WebKit and Firefox copy the bytes of a `Blob` made of
  `Blob`s; if one does, the runner keeps the parts as a list and makes
  the last `Blob` once;
- one write timed with the bar and without it;
- what a write leaves in the tab, with and without the restart after
  `WRITE_RESTART_BYTES`, which is dropped if it gives back nothing;
- the value of the parts, 64 MiB, `WRITE_PART_BYTES` of the runner.

## How it is verified

- **The runner, in node**, from 8 October 2026 with popnei 0.2.2: the
  pieces gathered into the `Blob` are the bytes `writeVars` or
  `writeVcf` gives whole, with the same counts, on `panel.nei` with the
  missing data filter at 0.05, 251,074 bytes as a `.nei` file and 95,879
  as a VCF, and on `panel.vcf.gz` with the filter of the FILTER column
  and the missing data filter at 0.1, 261,746 and 100,409 bytes, each one
  piece; on a VCF of 3,000 variants of 1,000 individuals made by
  `e2e/bigVcf.ts`, 1,917,582 bytes, the `.nei` file is 3,320,026 bytes
  in four pieces and the VCF 1,297,166 bytes in two, and with parts of
  one piece each, a value of the runner's test, the `Blob` holds the
  same bytes, those of the pieces in their order; a file of no variant, `panel.nei` at 0.05 with
  a MAF filter at 0.4, is 3,682 bytes as a `.nei` file and 528 as a VCF,
  with `numVars` 0; a `Blob` whose last byte cannot be read is answered
  as a crash; a `told` that throws makes `write` throw that value (`docs/specs/worker/runner.md`, "How it is verified").
  Before, with the writer of the whole file: the job with the missing data
  filter at 0.05 on `panel.nei` answers a `Blob` of 250,994 bytes and
  `passStats` of 1,152 of 1,200; with the 111 individuals the thresholds
  0.03 and 0.38 keep, put before the filter, 156,802 bytes and
  `passStats` of 1,117 of 1,200, since the filter counts over those 111;
  from stage 4, whose popnei, `js-v0.1.0-dev.3`, writes version 1.1 of
  its vars file, 251,074 and 156,818 bytes (`docs/specs/worker/runner.md`,
  "The written file", `orderA.mjs`); the file read back with `openVars`
  has 1,152 variants and 200 individuals, and 1,117 variants and those
  111 individuals in their order. `Blob` exists
  in node, so the runner's test makes it there.
- **The store, with Vitest** (`docs/specs/core/store.md`): a change of a
  filter during a write leaves it behind with the words above; a
  calculation asked for stops it; a write that ends after the change is
  dropped and saves nothing; the counts of a write fill `filterCounts`;
  a write that ends with no variant is `noVariant` and holds no file; a
  change of the filters while `write` is `done` makes a notice with the
  file discarded; the statistics it waited for refused put it in `error`,
  and `startWrite` then returns `null`.
- **The words, with Vitest**, each row of "Its words" asserted whole
  from its failure, the two of 1.0 GB and 2.0 GB from estimates of a
  million and of 2 million variants of 1,000 individuals; and the parts
  of the section in each state, the button disabled for a bound too
  large before a Count, with the Count ready, running and refused, for
  filters that keep no variant and a file that holds none, and the
  saved state with no estimate; and no text of the section, in any
  state and for any failure, with "Variants step" in it.
- **`writeEstimate`, with Vitest**: the bytes of 20,000 variants of
  1,000 individuals, 20,800,000, and of one variant of one individual,
  41; the variants of `variantsKept`, of
  the read with and without a filter of the variants, and none, which
  gives `null`; the individuals of a known list, of `null`, and of
  `byLists` while a threshold waits; `bound` and the words "about" and
  "at most about"; `warn` at `WRITE_WARN_BYTES` and one byte below it;
  `tooLarge` at `WRITE_MAX_BYTES` from exact counts and not from a bound.
- **`sizeText`**: 1, 812, 250,994, 999,600, 19,161,178 and 4,300,000,000
  bytes, as above.
- **`writtenName`**: `panel.vcf.gz` with a filter gives
  `panel.filtered.nei`, with a threshold on the individuals alone too,
  with none `panel.nei`; `PANEL.NEI` with a filter `PANEL.filtered.nei`;
  in `"vcf"`, `panel.filtered.vcf.gz`, with no filter too.
- **`noVariantForCertain`, with Vitest**, over the one pass's result
  that popnei 0.2.2 gives under node, kept as a fixture as
  `e2e/fixtures/variant_fine_bins.json` is, and checked against what
  popnei's filters keep: on `panel.vcf.gz`, whose first bin of the
  missing rate holds 2 variants, whose MAF starts in the bin of 0.499 to
  0.5 and whose observed heterozygosity in the bin of 0.026 to 0.027
  (node, 8 October 2026): certain for the observed heterozygosity at 0
  and at 0.026, and for the MAF at 0.45 and at 0.499, where popnei keeps
  none; not certain for the missing rate at 0, where popnei keeps 2, for
  the observed heterozygosity at 0.027, nor for the missing rate at 0
  with the MAF at 0.6, which keep 2 and 277 alone and none together; not certain with the
  missing rate of the individuals at 0.03, which keeps 116 of 200, and
  the observed heterozygosity of the variants at 0.01 or at 0.02, where
  popnei keeps none and one; certain with the filter of the FILTER
  column over a result whose `filterColumn.passed` is 0, made in the
  test, and not without that filter, nor with it on `low_qual.vcf.gz`,
  900 of whose 1,200 variants passed. Never certain where popnei keeps a
  variant: at 0.027 popnei keeps one variant, and at 0.5 the MAF keeps
  three.
- **Playwright**, on popgen2.html: the flows of
  `docs/specs/steps/popgen2-download.md`, "How it is checked". On
  popgen.html, in Chromium, Firefox and WebKit: the flow writes
  `panel.nei` with the missing data filter at 0.05, presses Save, and
  reads the download's name and size, 250,994 bytes, and 251,074 from
  stage 4; the variants of
  `panel.vcf.gz` with LowQual in place of PASS in every FILTER column,
  a VCF made by the flow, read with only the variants that passed and
  written, which gives the words of a VCF with none that passed; and
  the measurement above.

## What this spec relies on in the specs written beside it

- `docs/specs/worker/protocol.md` and `messages.md`: the request and the
  answer above, a member apart from `Job` and `JobResult`, whose `file`
  the check of a message takes with `instanceof Blob`.
- `docs/specs/worker/runner.md`: the write as above, and the `Blob` made
  in the worker.
- `docs/specs/worker/client.md`: the restart after a file larger than
  `WRITE_RESTART_BYTES`, and after a write that popnei refused.
- `docs/specs/core/keys.md`: the key of a write.
- `docs/specs/core/store.md`: a write tracked as a calculation, with its
  own words in the notice, its wait for the statistics of each
  individual, its late answer dropped, its counts put under
  `filterCounts`, and the `Blob` held as a value it does not read until
  `writeSaved` forgets it; the states `saved`, `noVariant` and `ready`
  with `dropped`; the failure of the statistics it waited for as its
  own; and the file discarded in the notice.
- `docs/specs/core/individualsKept.md`: the individuals kept, and how
  many.
- `docs/specs/entry.md`: the download through a link, and the release of
  the `Blob`.
- `docs/specs/steps/variants.md`: where the button goes on the old page;
  `docs/specs/steps/popgen2-download.md`: the download of popgen2.html.

## Open points

None. The owner decided on 27 September 2026, at stop A of
`docs/plans/variants-step.md`, the points of the screen written above,
and kept one rule as it was: a write that popnei refuses stays refused
under its key for the session, as every refusal of popnei does
(`docs/specs/core/store.md`, "A failure"), also when the refusal is for
memory, since no write that failed for its size in the measurement was
a refusal of popnei, and a second try in a fresh worker failed the same
way in Chromium.

The four constants were set by the measurement of 27 September 2026,
"What was measured" above, in Chromium and WebKit; Firefox is measured
by the owner by hand. The one point that was the owner's, point G of
`docs/specs/stage-3-open-points.md`, was decided by the owner on 26
September 2026 as it was recommended, and is written above as decided:
a file written and not saved is discarded at a change of a filter or a
new load, one press of an arrow key in a threshold among them, and the
notice of the change says "The written file, not saved, was discarded,
and Undo does not bring it back; write it again to save it."; the user
writes it again, one pass over the variants file. The option not taken
kept the file while the notice is up, so that its Undo brings it back,
at the cost of holding the file, about 960 MB for a million variants of
1,000 individuals, for as long as the notice stays, which has no timer.

## Not in this spec

- The VCF on the old page, which writes the `.nei` file alone; and new
  values of its warning and of `WRITE_MAX_BYTES` from a measurement with
  the pieces, which the plan of the download may give but does not
  change them for.
- The screen of the download of popgen2.html, its states and its words
  but those of a failure: `docs/specs/steps/popgen2-download.md`.
- The filtered variants in the report, which leaves them out by default
  (`docs/functionality.md`, section 9): stage 6.
