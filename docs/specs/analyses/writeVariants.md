# Writing the filtered variants as a .nei file

Written on 26 September 2026, for stage 3 of `docs/build-order.md`, the
Variants step whole. There is no code of it yet. This spec gives how the
user writes the variants and the individuals the filters keep as a
`.nei` file and saves it: the request to the calculation worker, the
file it gives back, how the store tracks it, the size the step expects
and warns of, and the words. It develops section 3 of
`docs/functionality.md`, "Reading and writing", and sections 5 and 6 of
`docs/architecture.md`, "The workers and their messages" and "The files
written", with points 5 and 6 of its section 13.

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
shows a button, "Save panel.filtered.nei, 18.4 MB", which saves it
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
save writes the file again (point A of
`docs/specs/stage-3-open-points.md`).

The name is the stem of the variants file, `variantsStem` of
`src/core/fileNames.ts`, with `.filtered.nei`: `panel.vcf.gz` gives
`panel.filtered.nei`. With no filter of the variants and no filter of
individuals the name is the stem with `.nei`, `panel.nei`, since the
file is then the variants file converted, which is what the application
suggests doing once with a VCF (`docs/functionality.md`, section 3). The
size is `numBytes`, in decimal units with one decimal and a comma
between groups of three digits in whole numbers: "940 KB", "18.4 MB",
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
  `docs/specs/core/individualsKept.md`, and
  every individual of the file while a threshold waits for its
  statistics. An estimate from a bound says "at most about".
- **The warning** comes above `WRITE_WARN_BYTES`, a constant of the code
  set by the measurement below; meanwhile 500 MB, whose peak is up to 1.5
  GB. Its words are below.
- **At an estimate of 4 GB or more from the counts themselves**, not from
  a bound, the button is disabled with its reason as text beside it,
  since the write would fail.

Once the write has ended, the calculation worker is started again when
the file is larger than `WRITE_RESTART_BYTES`, a constant of
`src/worker/client.ts` (`docs/specs/worker/client.md`), to give the tab back the
memory of wasm the file took, which would otherwise stay until the next
load, as the owner decided on 26 September 2026 (`docs/architecture.md`,
section 13, point 5). Meanwhile 100 MB. The restart costs the
intermediate results the worker held and the reading of the file's
header, at most 49 ms in the measurement of the walking skeleton.

**To be measured**, in the first work package that writes a file, in
Chromium, Firefox and WebKit, on the `.nei` file of 19,161,178 bytes and
on one ten times larger (`docs/architecture.md`, section 11): the memory
of the tab during and after a write, whether each engine copies the array
into the `Blob`, and the time of the write. They set `WRITE_WARN_BYTES`,
`WRITE_RESTART_BYTES` and `BYTES_PER_GENOTYPE`.

## The cases

- **The filters keep no variant.** `writeVars` does not refuse: on
  `panel.nei` with the missing data filter at 0.05 and the MAF filter at
  0.4 it gave a file of 3,594 bytes and no variant (node, 26 September
  2026). The step shows no Save button for a file whose `passStats.numVars`
  is 0, and says so (below); its counts fill `filterCounts`, so the user
  sees which filter kept none.
- **The filters keep no individual.** The write is locked by the store,
  since popnei refuses an empty list, with the words below.
- **A file written and not saved.** The step offers Save, and no second
  write of the same filters, which would give the same file: a new write
  needs another key, a change of the filters, which forgets the file of
  the one before and releases it.
- **A write stopped, or left behind and stopped**, gives no file; the
  step shows the button to write again.
- **A new load of the variants file** stops the write at once, as every
  request in flight (`docs/architecture.md`, section 5).
- **A project file saved and opened.** Nothing of a write is in it.
- **The memory of the tab does not take the file.** popnei throws, or the
  engine does, `workerFailed`; the words below say what to do.

## The step's part

The button, the estimate and the Save button are in the Variants step,
under the filters (`docs/specs/steps/variants.md`). Its title in the
notice and the status region is "Writing the file".

### The states

| state | what the user sees | what they can do |
|---|---|---|
| locked | the reason of `projectNeeds`, or of the filters keeping no individual, beside the disabled button | what the reason says |
| ready | the button, and the estimate: "About 18.4 MB: 20,000 variants of 1,000 individuals." | Write |
| waiting for the statistics | "Calculating the statistics of each individual, which the filters of individuals are set from · 35% · 0:12" | Stop |
| writing | "Writing panel.filtered.nei · 35% · 0:12", the bar of the diversity | Stop |
| written, the store's `done` | "Save panel.filtered.nei, 18.4 MB" | Save |
| saved, the store's `saved` | "panel.filtered.nei, 18.4 MB, was handed to the browser to save. To save it again, write it again." and the button to write | Write |
| stopped or dropped, the store's `ready` | the button to write, and, when a change dropped it, `dropped`, "The file was not kept, since the filters changed while it was written." | Write |
| error | the words of the failure, below | as the words say |

### Its words

| when | the text |
|---|---|
| above `WRITE_WARN_BYTES` | "Warning: a file of about 960 MB may need up to three times that in the memory of this tab while it is written, and a browser may close a tab that asks for too much, losing the work since the project was last saved. Save the project first. To write a smaller file, remove variants or individuals with the filters; to write any size, use popnei in Python." |
| an estimate of 4 GB or more | "A file of about 4.3 GB cannot be written in a browser tab, which gives popnei at most 4 GB. Remove variants or individuals with the filters, or write the file with popnei in Python." |
| no counts and no number of variants | "The size of the file is known once the variants are counted: Count, above." |
| the filters keep no variant | "The filters kept none of the variants of panel.nei, so there is nothing to write. Loosen the filters above." |
| the filters keep no individual | the store's lock, `keptNoneReason` of `docs/specs/core/individualsKept.md`: "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them in the Variants step." |
| `workerFailed` | "The writing stopped unexpectedly, perhaps because the file, of about 960 MB, did not fit in the memory of this tab. Remove variants or individuals with the filters, or write the file with popnei in Python." |
| a refusal of popnei, of a line of the VCF | the diversity's words for it, "popnei could not read panel.vcf.gz: ‹its message›. …" |
| `reopenFailed`, `couldNotStart`, `protocolMismatch`, `defect` | the diversity's words |

The help, for the drawer of stage 8: what the file holds; that a `.nei`
file is read many times faster than a VCF, so converting once is worth
it; the memory a large file needs, and `popnei.write_vars(variants,
path)` in Python, which writes to the disk with no such limit.

### Accessibility

The Save button takes the focus when the write ends, if the focus was on
the button that asked for it, which the write replaces; otherwise the
focus stays where it is, and the end is announced by the shell's status
region, "panel.filtered.nei is written, 18.4 MB; Save it in the Variants
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
  dropped and saves nothing; the counts of a write fill `filterCounts`.
- **The estimate**: the variants of `filterCounts`, of the source, and
  none; the individuals kept and all of them; the words "about" and "at
  most about"; the warning at `WRITE_WARN_BYTES` and one byte below it.
- **The file name**: `panel.vcf.gz` with a filter gives
  `panel.filtered.nei`, with none `panel.nei`.
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
  `WRITE_RESTART_BYTES`.
- `docs/specs/core/keys.md`: the key of a write.
- `docs/specs/core/store.md`: a write tracked as a calculation, with its
  own words in the notice, its wait for the statistics of each
  individual, its late answer dropped, its counts put under
  `filterCounts`, and the `Blob` held as a value it does not read until
  `writeSaved` forgets it; the states `saved` and `ready` with
  `dropped`.
- `docs/specs/core/individualsKept.md`: the individuals kept, and how
  many.
- `docs/specs/entry.md`: the download through a link, and the release of
  the `Blob`.
- `docs/specs/steps/variants.md`: where the button goes.

## Open points

None of the owner's. The three constants have their values meanwhile
above, until the measurement.

## Not in this spec

- The VCF, bgzipped, and the writer by pieces, with popnei's release that
  has them (`docs/architecture.md`, section 6, "What this asks of
  popnei"). With the writer by pieces, the peak falls from up to 3F to
  about F, and the warning is measured again.
- The filtered variants in the report, which leaves them out by default
  (`docs/functionality.md`, section 9): stage 6.
