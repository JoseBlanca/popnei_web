# Writing the filtered variants as a .nei file

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
has it; and `sizeText` writes one byte as "1 byte".

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
  format: "nei",
  fileId: p.variants.fileId,
  filters: p.filters,
  individuals: readonly string[] | null, // the individuals kept, as the store
                                         // hands them to every analysis; null
                                         // when the filters remove nobody
}
```

This is `WriteJob` of `docs/specs/worker/protocol.md`, tagged by its
`format` and not by an `analysis`, since it is no member of `Job`.

The runner puts the filters on the `Variants` in their order, then
`filterIndividuals(individuals)` when the list is not `null`, and calls
`writeVars(variants)` with popnei's size of batch. popnei builds the
whole file in the memory of wasm and copies it out, piece by piece, into
one `Uint8Array`, with the counts of its pass. The worker makes of the
array a `Blob`, the browser's object for a file made in the page, drops
the array, and posts the `Blob`, which crosses to the page as a handle,
with no copy:

```ts
{ format: "nei", file: Blob, numBytes: number, passStats: PassStats }
```

This is `Written<Blob>` of the protocol; `numBytes` is the `size` of the
`Blob`, which core reads without naming a type of the browser.

`numPassesOf("writeVars")` is 1, so the bar fills once. Core has no type
of the browser, and the store holds the `Blob` without reading it, as a
value of a type it is given (`docs/specs/core/store.md`); only the page
reads it, to save it.

### Its key, and how the store tracks it

The store tracks a write as it tracks a calculation
(`docs/architecture.md`, section 5), under a key of the load, both lists
of filters and the format, `"nei"`, made by `docs/specs/core/keys.md`;
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
  for the current filters of the variants in the cache, the write starts
  their calculation first, and its own request is sent when they arrive,
  as a Run of an analysis that reads the filters of individuals does;
- its answer is never put in the cache, but its counts are, under the
  key of `filterCounts`, since its pass had the project's filters
  (`docs/specs/analyses/filterCounts.md`, "Which results fill it").

### Saving the file

The step shows the Save button when the write ends, with the name and
the size of the file. Pressing it starts the download through a link
that names the file, a link with the `download` attribute, which every
browser of the floor of `docs/technology.md` has; the save is a click of
its own, since a download started by the code minutes after the click
that asked for it may be blocked by the browser, or asked about, as
Chrome does for a page that starts several downloads. The `Blob` and the
address the link reads it from are released once the file is saved, and
when a change of the filters, a new write or a new load makes the file
other than the step shows, as section 6 of the architecture has it
(`docs/specs/entry.md`, "A file of the filtered variants saved";
`docs/specs/core/store.md`, `writeSaved`). The page is not told whether
the browser kept the download, so the file is released when Save is
pressed: a user who cancels the question of a browser that asks where to
save writes the file again, as the owner decided on 26 September 2026
(point A of `docs/specs/stage-3-open-points.md`). A file written and not saved that
a change of the filters, or a new load, releases is gone, and an Undo
does not bring it back; the notice of that change says so, as the owner
decided on 26 September 2026 (point G of
`docs/specs/stage-3-open-points.md`).

The name, `writtenName` of `src/core/fileNames.ts` (below, "The
functions of core"), is the stem of the variants file, `variantsStem` of
the same module, with `.filtered.nei`: `panel.vcf.gz` gives
`panel.filtered.nei`. With no filter of the variants and no filter of
individuals the name is the stem with `.nei`, `panel.nei`, since the
file is then the variants file converted, which is what the application
suggests doing once with a VCF (`docs/functionality.md`, section 3). The
size is `numBytes` as `sizeText` writes it, below: "251 KB", "19.2 MB",
"1.2 GB".

### The size, before the write

The tab holds, at the peak of a write of F bytes, F in the memory of
wasm, F in the array, and F more if the engine copies the array into the
`Blob`: up to 3F (`docs/architecture.md`, section 6). A file near 4 GB
cannot be written at all, since wasm addresses no more. So the step says
the size it expects before the user writes:

- **The estimate** is the variants kept times the individuals kept, at
  one byte per genotype, `BYTES_PER_GENOTYPE`: popnei's `writeVars` wrote
  20,000 variants of 1,000 individuals in 19,161,178 bytes, 0.96 bytes
  per genotype (`docs/specs/worker/runner.md`), and the 1,152 variants of
  the 200 individuals of `panel.nei` in 250,994 bytes, 1.09, since a
  small file has more of its head (node, 26 September 2026,
  `js-v0.1.0-dev.2`). The variants kept are the counts of
  `filterCounts` for the current filters, when the cache has them, and
  otherwise the variants of the file, when a pass has counted them; the
  individuals kept are those of `individualsKept` of
  `docs/specs/core/individualsKept.md`, and those the lists keep,
  `byLists`, while a threshold waits for its statistics. An estimate
  from a bound says "at most about".
- **The warning** comes at or above `WRITE_WARN_BYTES`, a constant of the code
  set by the measurement below; meanwhile 500 MB, whose peak is up to 1.5
  GB. Its words are below.
- **At an estimate of `WRITE_MAX_BYTES` or more from the counts
  themselves**, not from a bound, the button is disabled with its reason
  as text beside it, since the write would fail. Meanwhile 4 GB, the
  most wasm addresses; a tab that holds up to 3F at the peak may fail
  well below it, so the measurement below finds the largest file each
  engine writes, and `WRITE_MAX_BYTES` is set to the smallest of the
  three, with the words of its row below.

Once the write has ended, the calculation worker is started again when
the file is larger than `WRITE_RESTART_BYTES`, a constant of
`src/worker/client.ts` (`docs/specs/worker/client.md`), to give the tab back the
memory of wasm the file took, which would otherwise stay until the next
load, as the owner decided on 26 September 2026 (`docs/architecture.md`,
section 13, point 5). Meanwhile 100 MB. The restart costs the
intermediate results the worker held and the reading of the file's
header, at most 49 ms from the start of a new worker to the file opened,
measured at the end of the walking skeleton on the `.nei` file of
19,161,178 bytes and its VCF, in Chromium 153 and WebKit 26.6 on the
owner's Mac (`docs/plans/walking-skeleton.report.md`). The worker is
started again, too, after a write that popnei refused, whatever the
size of the file, since a refusal for memory leaves the memory of wasm
grown by the part of the file it had built (`docs/specs/worker/client.md`).

**To be measured**, in the first work package that writes a file, in
Chromium, Firefox and WebKit, on the `.nei` file of 19,161,178 bytes and
on one ten times larger (`docs/architecture.md`, section 11): the memory
of the tab during and after a write, whether each engine copies the array
into the `Blob`, the time of the write, and the largest file each engine
writes before the write fails, tried by doubling the variants from the
file ten times larger. They set `WRITE_WARN_BYTES`, `WRITE_RESTART_BYTES`,
`WRITE_MAX_BYTES` and `BYTES_PER_GENOTYPE`.

### The functions of core

The step and the words of the shell read the name, the estimate and the
sizes from these functions, pure, so that Vitest checks them in node. The
name goes in `src/core/fileNames.ts`, beside `variantsStem`, since that
module names every file the application writes; the estimate and the
sizes in `src/core/writeEstimate.ts`, with the constants above. Both are
rows of section 9 of `docs/architecture.md`.

```ts
// src/core/fileNames.ts
/** The name of the written file of the filtered variants:
    "panel.filtered.nei" from panel.vcf.gz with a filter, "panel.nei" with
    no filter of the variants and none of individuals; "project.nei" for
    a project with no variants file, which the step never asks. */
export function writtenName(p: Project): string;

// src/core/writeEstimate.ts
export const BYTES_PER_GENOTYPE = 1;
export const WRITE_WARN_BYTES = 500_000_000;  // meanwhile; set by the measurement above
export const WRITE_MAX_BYTES = 4_000_000_000; // meanwhile, under the 4 GiB, 4,294,967,296 bytes, wasm
                                              // addresses, which hold the variants read too; set by the measurement above

export interface WriteEstimate {
  readonly numVars: number;         // the variants the file would hold, or their bound
  readonly numIndividuals: number;  // the individuals, or their bound
  readonly numBytes: number;        // numVars * numIndividuals * BYTES_PER_GENOTYPE
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
no filter of the variants and a bound with one; and `null` when neither
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

## The cases

- **A list of individuals popnei would refuse**, a list to keep that
  names an individual not in the file. The write is locked by the store
  with the reason of `individualListNeeds` of
  `docs/specs/core/project.md`, which the step shows under the list it
  names and beside the button; the three checks of the step are not
  locked by it.
- **The filters keep no variant.** `writeVars` does not refuse: on
  `panel.nei` with the missing data filter at 0.05 and the MAF filter at
  0.4 it gave a file of 3,594 bytes and no variant (node, 26 September
  2026). The store keeps nothing of a file whose `passStats.numVars` is
  0, and its state `write` is `noVariant` (`docs/specs/core/store.md`),
  so the step shows no Save button, and says so (below), and the page
  holds no file that nobody can save; its counts fill `filterCounts`, so
  the user sees which filter kept none.
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

## The step's part

The button, the estimate and the Save button are in the Variants step,
under the filters (`docs/specs/steps/variants.md`). Its title in the
notice and the status region is "Writing the file".

### The states

| state | what the user sees | what they can do |
|---|---|---|
| empty | cannot happen: while the variants file is not read the part is not drawn, and the step shows the line of a file not read in its place (`docs/specs/steps/variants.md`, "What it does") | |
| locked | the reason of `individualListNeeds` of `docs/specs/core/project.md`, or of the filters keeping no individual, beside the disabled button. While the variants file is not read, when the store locks it with the reason of `projectNeeds`, the part is not drawn, as for empty | what the reason says |
| ready | the button, and the estimate: "About 20.0 MB: 20,000 variants of 1,000 individuals." | Write |
| waiting for the statistics | "Calculating the statistics of each individual, which the filters of individuals are set from · 35% · 0:12" | Stop |
| writing | "Writing panel.filtered.nei · 35% · 0:12", the bar of the diversity | Stop |
| written, the store's `done` | "Save panel.filtered.nei, 19.2 MB" | Save |
| written with no variant, the store's `noVariant` | the words of a file of no variant, below, and no Save | loosen the filters |
| saved, the store's `saved` | "panel.filtered.nei, 19.2 MB, was handed to the browser to save. To save it again, write it again." and the button to write | Write |
| stopped or dropped, the store's `ready` | the button to write, and, when a change dropped it, `dropped`, "The file was not kept, since the filters changed while it was written." | Write |
| results removed | a file written and not saved, which a change of the filters or a new load discarded: the part is `ready` for the new filters, with the button to write, and the notice of the shell says that the file was discarded and that Undo does not bring it back (`docs/specs/shell.md`, "The notice"; point G of `docs/specs/stage-3-open-points.md`) | Write; the Undo of the notice, which brings the filters back and not the file |
| error | the words of the failure, below | as the words say |

The estimate of the ready state is 20,000 times 1,000 genotypes at one
byte each, 20,000,000 bytes, "20.0 MB"; the file popnei writes of them
is 19,161,178 bytes, "19.2 MB", which the Save button shows.

### Its words

The sizes in the words are the estimate, "about"; 1.0 GB is a million
variants of 1,000 individuals at one byte per genotype.

| when | the text |
|---|---|
| at or above `WRITE_WARN_BYTES` | "Warning: a file of about 1.0 GB may need up to three times that in the memory of this tab while it is written, and a browser may close a tab that asks for too much, losing the work since the project was last saved. Save the project first. To write a smaller file, remove variants or individuals with the filters; to write any size, use popnei in Python." |
| an estimate of `WRITE_MAX_BYTES` or more | "A file of about 4.3 GB cannot be written in a browser tab, which gives popnei at most 4 GB. Remove variants or individuals with the filters, or write the file with popnei in Python." |
| no counts and no number of variants | "The size of the file is known once the variants are counted: Count, above." |
| the filters keep no variant, `noVariant` | "The filters kept none of the variants of panel.nei, so there is nothing to write. Loosen the filters above." |
| the filters keep no individual | the store's lock, `keptNoneReason` of `docs/specs/core/individualsKept.md`: "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them in the Variants step." |
| the worker stopped with no answer, a trap of the wasm or a memory that could not grow, `workerFailed` | "The writing stopped unexpectedly, perhaps because the file, of about 1.0 GB, did not fit in the memory of this tab. Remove variants or individuals with the filters and write it again, or write the file with popnei in Python." |
| popnei refused the write, for a memory that does not take the file or for a line of the VCF it cannot read, which its message alone tells apart | "panel.filtered.nei could not be written: popnei stopped with "‹its message›". A file of about 1.0 GB may not fit in the memory of this tab: remove variants or individuals with the filters and write it again, or write the file with popnei in Python. If the message names a line of the VCF, correct the file, or fetch it again, and load it in the Variants step." |
| the statistics of each individual it waited for failed | "The statistics of each individual, which the thresholds of the filters of individuals are applied to, could not be calculated, so the file was not written. ", then the words the statistics' own part gives that failure (`docs/specs/analyses/individualChecks.md`, "Its words"): "… The filters kept none of the variants of panel.nei, so there is no variant to count each individual's genotypes over. Loosen the filters of the variants in the Variants step." |
| the browser can no longer read the variants file, `reopenFailed` | the diversity's words, "panel.nei could not be read again; it may have changed on the disk since it was picked. Load it again in the Variants step." |
| the calculations could not start, `couldNotStart`, or the page is out of date after a new version of the site, `protocolMismatch` | the diversity's words, "The application could not start its calculations. Save the project, reload the page, and open the project again." and "The page is out of date. Save the project, reload the page, and open the project again." |
| an error of the application's own code, `defect` | "The application met an error of its own: ‹message›. Write the file again." |

What the table leaves open, chosen with the code of the step on 27
September 2026:

- An estimate from a bound starts "At most about" in the ready state,
  "At most about 240 KB: 1,200 variants of 200 individuals.", and says
  "at most about" in the warning.
- The line of the writing before the first progress has no share,
  "Writing panel.filtered.nei · 0:12", and, when the write waits for
  the variants file to be opened again after a stop, "Waiting for
  panel.nei to be opened again, then writing panel.filtered.nei · 0:12",
  as the diversity's line does; the line of the statistics it waits for
  does the same with "calculating the statistics of each individual,
  which the filters of individuals are set from". The bar is named
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
step." The warning says "Warning:" in words (WCAG 2.2, 1.4.1).

### Left for the running application

Where the button and its estimate sit, and whether the estimate is shown
before the user asks.

## How it is verified

- **The runner, in node** with popnei: the job with the missing data
  filter at 0.05 on `panel.nei` answers a `Blob` of 250,994 bytes and
  `passStats` of 1,152 of 1,200; with the 119 individuals the thresholds
  0.03 and 0.38 keep, 170,042 bytes; the file read back with `openVars`
  has 1,152 variants and those individuals in that order. `Blob` exists
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
  from its failure, the two of 1.0 GB and 4.3 GB from estimates of a
  million and of 4.3 million variants of 1,000 individuals.
- **`writeEstimate`, with Vitest**: the variants of `variantsKept`, of
  the read with and without a filter of the variants, and none, which
  gives `null`; the individuals of a known list, of `null`, and of
  `byLists` while a threshold waits; `bound` and the words "about" and
  "at most about"; `warn` at `WRITE_WARN_BYTES` and one byte below it;
  `tooLarge` at `WRITE_MAX_BYTES` from exact counts and not from a bound.
- **`sizeText`**: 1, 812, 250,994, 999,600, 19,161,178 and 4,300,000,000
  bytes, as above.
- **`writtenName`**: `panel.vcf.gz` with a filter gives
  `panel.filtered.nei`, with a threshold on the individuals alone too,
  with none `panel.nei`; `PANEL.NEI` with a filter `PANEL.filtered.nei`.
- **Playwright**, in Chromium, Firefox and WebKit: the flow writes
  `panel.nei` with the missing data filter at 0.05, presses Save, and
  reads the download's name and size, 250,994 bytes; and the measurement
  above.

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
- `docs/specs/steps/variants.md`: where the button goes.

## Open points

The constants have their values meanwhile above, until the
measurement. The one point that was the owner's, point G of
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

- The VCF, bgzipped, and the writer by pieces, a writer of popnei that
  gives the file one batch of variants at a time, so that the memory of
  wasm holds one batch and not the whole file, with popnei's release
  that has them (`docs/architecture.md`, section 6, "What this asks of
  popnei"). With the writer by pieces, the peak falls from up to 3F to
  about F, and the warning is measured again.
- The filtered variants in the report, which leaves them out by default
  (`docs/functionality.md`, section 9): stage 6.
