# The decisions of the specs of stage 2, and what they change in approved files

25 September 2026, for the owner. Stage 2 of `docs/build-order.md` is the
walking skeleton, the smallest application that goes through every part
once, and it has eleven specs, all drafts of this day:
`docs/specs/worker/messages.md`, `client.md`, `runner.md` and
`individuals.md`; `docs/specs/core/projectFile.md`;
`docs/specs/analyses/diversity.md`; `docs/specs/entry.md` and `shell.md`;
`docs/specs/steps/variants.md` and `individuals.md`. This file held their
open points, the decisions each spec left to the owner, with the ones
two specs share made one. The owner answered them on 25 September 2026,
and the eleven specs now say what was decided. This file records each
answer, the numbers of the release of popnei stage 2 builds on, the three
points that are open, open again or to confirm, what is asked of popnei, and
every change the eleven ask of files already approved: the approved
specs of stage 1, the code of `src/` and `package.json`,
`docs/architecture.md`, `docs/functionality.md`, `docs/build-order.md`
and the skills.

## What is still asked of the owner

Three things, each with what the plan builds meanwhile.

### D again. Which popnei function gives the three columns of the diversity

The owner decided that the diversity is calculated with
`calcPopDiversity`, with the three columns of the walking skeleton, the
expected heterozygosity, unbiased, the observed heterozygosity and the
proportion of polymorphic variants, below 0.95. `calcPopDiversity` of
`js-v0.1.0-dev.2` gives none of the three. Read in its source,
`js/popnei/src/diversity.ts` at `b3f77c8`, and run in node, it gives for
each population the alleles it called, the private alleles, the share of
variable variants, the folded spectrum of a draw and F_IS. Its share of
variable variants counts a variant that called two alleles in the
population however rare the second, with no threshold, and it has no
`polyThreshold`; its F_IS is 1 − Ho/He of the two heterozygosities, which
it computes and does not return. On the panel, the numbers below, the
share of variable variants of p0 is 0.9775 where the share below 0.95 is
0.9266666666666666, and F_IS equals, to the last digit, 1 − Ho/He of
the means of `calcPerVarDistribs` in all six rows.

- **(a) The three columns from `calcPerVarDistribs`** of the same
  release, which gives the numbers of the release before to the last
  digit and whose numbers popnei verifies against plink2 and pyNei; and
  `calcPopDiversity` from stage 5, for F, the alleles, the private
  alleles, the rarefaction and the spectrum, which are its statistics.
  Stage 5 then makes two calls, two passes over the file, or asks popnei
  for one (c).
- **(b) `calcPopDiversity` now**, with its columns in place of the
  three: the share of variable variants and F_IS, no heterozygosity. It
  moves F, which the owner put in stage 5, into stage 2, and drops the
  two columns the owner named.
- **(c) Ask popnei** to add the two heterozygosities and a polymorphism
  threshold to `calcPopDiversity`, so that one pass gives the whole table
  of stage 5, and build stage 2 on (a) until the release that has them.

Recommended: (a), since it gives the columns the owner named; (c) when
stage 5 wants one pass. Meanwhile, (a): the eleven specs are written on
it, with `calcPopDiversity` described where it would enter. Needed
before the plan of stage 2, since (b) changes the call of the runner,
the job, the result, the check numbers, the script, the table and the
help. Specs: `diversity.md` **Open 1**, `runner.md` **Open 1**.

### K, its last part. Whether a Save stops the question before leaving

The owner decided that the question the browser asks before the page is
left is asked when the project changed since the page opened or since
the last Save, and is being asked to confirm the second half. A Save
that stops it spares the user a question after every save; its cost is
a user who cancels the browser's own dialog of the download, or whose
download fails, and then leaves the page with no question and loses the
project, since the page never learns whether the file was kept.
Meanwhile, as decided: a Save stops the question until the next change.
The other answer is one line of `createSaving` and one test. Specs:
`shell.md` **Open 2**, `entry.md` ("The saving").

### R. A browser that reads a changed variants file with no word

popnei reads the variants file from the disk at every calculation. When
the user changes the file on the disk after picking it, the File API
asks the browser to refuse the read, and then the user is told to load
the file again (point B). popnei tested its reading of a file in
Chromium only, and an engine may instead read the new bytes and say
nothing. The user would then see numbers calculated from the new file
shown as those of the file they picked, filed under the key of that
load: an undo back to it, and a project saved with its check numbers,
would treat them as the old file's. Nothing in
the application can see the change, since a `File` keeps the size and
the date it had at the pick. Whether any engine does this is not known;
the Playwright flow of stage 2 rewrites `panel.nei` after the pick in
three ways, shorter, the same size and longer, in Chromium, Firefox and
WebKit, and records what each shows (`docs/specs/worker/runner.md`, "In
the browser").

- **(a) Measure first, and tell the user meanwhile.** The first work
  package of stage 2 runs those rewrites in the three engines, and this
  point comes back to the owner with what they showed. Until then the
  help of the Variants step, which already says that a file changed on
  the disk after it was picked has to be loaded again, adds that the
  application may not notice the change, and that results calculated
  after it may be of the new file. Costs a sentence, and the measurement
  the flow makes anyway.
- **(b) Ask popnei to check the file at every pass**, that the bytes it
  read at the open, the first range and the footer of a `.nei` file, are
  the same when a pass reads them again, which a pass does already; it
  would catch a rewrite that changes the head or the size, and not one
  that changes a byte in the middle of a VCF. Costs a change of popnei
  and a release.
- **(c) Accept it**, with the line of the help alone, and no
  measurement. Costs nothing, and leaves the user unwarned of a wrong
  number in the engine where it happens.

Recommended: (a), and (b) if an engine reads silently. Meanwhile, (a):
the flow records the rewrites, and the line of the help is added to
`docs/specs/steps/variants.md`, "The help drawer". Needed before the
first work package of stage 2 ends, since (b) is a request to popnei
that the plan waits on. Specs: `runner.md` **Open 2**, `client.md` ("The
variants file changed on the disk since it was picked").

## What the owner decided on 25 September 2026

Each point with the owner's decision, as the session was given it, and
what it changed in the specs. The option not taken of each is in the
spec that applies it.

### A. The metadata file, and a column of populations

"A metadata file and a column are required in stage 2, optional from
stage 4." The diversity locks on no file, "Load a metadata file in the
Individuals step.", and on no column, "Choose the column that defines
the populations in the Individuals step."; the Individuals step says "No
metadata file. The analyses per population need one." From stage 4 a
project with no file runs as one population, `Grouping` of
`docs/specs/core/project.md` gains a value for that choice, and the
stepper's first To do of Individuals becomes "Optional". Specs:
`diversity.md`, `steps/individuals.md`, `shell.md`.

### B. A variants file the browser can no longer read

"A kind of its own for a file that cannot be read or reopened,
`reopenFailed`, with words saying the file may have changed on the disk
and to load it again in the Variants step." `RunError` gains `{ kind:
"reopenFailed"; name; message }`. The runner answers it when popnei
refused a call that reads the file, the open or a pass, with its message
of a range the browser refused or gave short, "the source could not be
read: the browser did not give popnei …" or "the source could not be
read: popnei asked this file for the …", since popnei turns the
browser's refusal into a plain `Error` that no kind tells apart from a
refusal of the data; and when popnei refused an open again of a file it
had opened, whatever the message. The worker goes on. The
client fails a run with it, and an `open` sent for a run that fails
either way fails the runs waiting on it with it. The words: on the
panel, "panel.nei could not be read again; it may have changed on the
disk since it was picked. Load it again in the Variants step."; at the
first open, in the Variants step, "panel.nei could not be read; it may
have changed on the disk since it was picked. Load it again in the
Variants step." Specs: `messages.md`, `runner.md`, `client.md`,
`diversity.md`, `steps/variants.md`, `entry.md`.

### C. The release of popnei

"Build on js-v0.1.0-dev.2." The release was made on 25 September 2026
from popnei's `main` at `b3f77c8`,
https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.2/popnei-0.1.0.tgz,
and its 444 tests of TypeScript pass. Its `openVcf` and `openVars` take a
`Uint8Array` or a `Blob`, which a `File` is, and read a `File` by ranges
of 4 MiB at most through `FileReaderSync`, inside a web worker only;
`Variants.onProgress` tells a function the four numbers of each pass,
`bytesRead`, `numBytes`, `pass` and `numPasses`; `numPassesOf` gives the
passes of a function before it runs; and `calcPopDiversity` is new. What
it changed:

- **The runner** gives popnei the `File` and copies no byte of it; a
  change of the filters frees the `Variants` and opens the `File` again,
  which reads its header, or the footer of a `.nei` file, and not its
  variants, so the cost of reading the whole file again at each change of
  the filters, which the architecture did not list, is gone; the limit
  of 1.5 to 2 GB of a file read whole is gone, and what limits a file is
  the time of a pass; it passes each `Progress` on to the page.
  (`runner.md`: "Opening the load", "The filters", "Progress", "The
  memory", "What a restart costs", "How it is verified".)
- **The messages**: `progress` carries the four fields of `Progress`
  under their names; `PROTOCOL_VERSION` stays 1, since the messages of
  the draft before were never built. (`messages.md`, "The progress".)
- **The client**: a restart costs the wasm, from the cache, and the
  reading of a header; the client passes the four fields on.
  (`client.md`.)
- **The diversity**: its running state has a progress bar, the share of
  the run done, `(pass − 1 + bytesRead / numBytes) / numPasses`, rounded
  down; one pass. (`diversity.md`.)
- **The Variants step** has no warning of a file above 1.5 GB; what a
  large file costs, the time of a pass, is shown by the bar of each
  calculation, and the help says that writing a `.nei` file, which reads
  faster, comes to the step in stage 3. (`steps/variants.md`.)

`version()` of the release gives "0.1.0", as `js-v0.1.0-dev.1` did: the
version of popnei's core crate, which neither release raised. The owner
agreed that popnei raises it with each release, "0.1.0-dev.2" and on,
which is asked of popnei below; until it is done, the version of popnei
in a key and beside a check number is only as good as the one
`version()` gives, and a key of one release is a key of the other.

### D. The diversity and its check numbers

"calcPopDiversity, the same three columns, He, Ho and the polymorphic
share, in stage 2; F, the private alleles, the rarefaction and the
spectrum in stage 5." The check numbers: "numVars, then He, Ho and the
polymorphic share per population", 1 + 3 × the populations, 10 for the
panel of three, with section 9 of `docs/functionality.md` corrected.
Which function gives the three columns is open again, above. Specs:
`diversity.md`, `projectFile.md`, `runner.md`.

### E. The versions in the files the application writes

"Every file the application writes records popnei's version and the
application's: the project file with each check number (option A of
projectFile.md); the report when it comes (stage 6); a CSV download
stays clean and the versions are shown on the page next to each
download." The diversity's panel shows, beside its download, "Calculated
with popnei 0.1.0, in version 0.1.0 of the application." Specs:
`projectFile.md`, `diversity.md`.

### F. The filters of individuals in stage 2

"Locked in stage 2." The diversity is locked while the project holds a
filter of individuals, which only a project file can hold in stage 2,
and the runner answers a job with one as a defect. Specs:
`diversity.md`, `runner.md`.

### G. Polymorphic below 0.95

"Polymorphic means below 0.95, as popnei does; docs/functionality.md is
corrected." Specs: `diversity.md`, `runner.md`.

### H. The warning of variants without a value

"Shown whenever any are skipped, and it reports the number and the
share of the variants skipped", as "p0a has a value at 641 of the 1,152
variants kept (56%); at the others fewer than 20 of its individuals have
a genotype." A share below 100% is never written 100%, nor one above 0%
written 0%. Specs: `diversity.md`.

### I. The version of the application

"A number in package.json, 0.1.0 now." Vite's `define` writes it into
the code as `APP_VERSION`. Specs: `entry.md`, `projectFile.md`,
`diversity.md`.

### J. The steps

"Three steps; writing the filtered variants as VCF or .nei goes in the
Variants step, in stage 3, not an Export step." The Export step comes
with the report, in stage 6. Specs: `shell.md`, `entry.md`,
`steps/variants.md`, `runner.md`.

### K. Save

"Save is our own dialog in the page: a file-name field and a Save
button, after which the browser downloads the file; the page never says
the file was saved; the browser's own question before leaving is asked
when the project changed since the page opened or since the last Save."
The last part is to confirm, above. The dialog's field starts at
`projectFileName`; a name without `.popnei.json` gets it; the error bar's
Save saves under the proposed name with no dialog. Specs: `shell.md`,
`entry.md`, `projectFile.md`.

### L. How many variants the filters keep, in the summary line

Left as it is: the line gives the variants of the file once counted and
the number of filters, "1,200 variants · 1 filter", and the kept count
joins it in stage 3. Specs: `shell.md` **Open 1**.

### M. Reading a VCF already loaded again with another ploidy

"A button in the Variants step, 'Read ‹name› again with ploidy N', in
stage 2." It makes a new load of the same `File` with a new load id;
the step finds the `File` with `fileOf(fileId)` of `src/ui/files.tsx`.
Specs: `steps/variants.md`, `entry.md`, `diversity.md`.

### N. The default of the missing data filter

"On at 0.1 by default", plink's default for `--geno`. It settles open
point 4 of `docs/functionality.md` for this filter. Specs:
`steps/variants.md`, `entry.md`.

### O. A refused row names its separator

"A refused row names the separator it was read with": "line 7 has 3
cells where the header has 4, read with the semicolon as the
separator". `raggedRow` and `unclosedQuote` gain `separator`. Specs:
`worker/individuals.md`, `steps/individuals.md`.

### P. The name of the file in the reasons of core

"Each application's own name for its file, 'metadata file', 'traits
file', in core's reasons": "Load a metadata file in the Individuals
step." in population genetics. Specs: `steps/individuals.md`,
`worker/individuals.md`, `shell.md`, `diversity.md`, `projectFile.md`.

### Q. The words of the project file

Left as they are, to be judged on the screens of stage 2. Specs:
`projectFile.md` **Open 1**.

## The numbers of `js-v0.1.0-dev.2`

The release was installed on 25 September 2026 in a folder of the
session's scratchpad, outside the worktree, with `npm install --no-save
https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.2/popnei-0.1.0.tgz`,
and run under node on `e2e/fixtures/panel.nei` and `panel.vcf.gz`, the
panel of popnei's `tests/reference/stats/`, 1,200 variants over 200
diploid individuals, with the populations of the column `popcat` of
`/Users/jose/devel/popnei/tests/reference/stats/panel_pops.txt`, p0 of
48 individuals, p2 of 84 and p1 of 68. The package holds its `dist` and
its wasm and not its TypeScript sources, which were read at `b3f77c8`
in popnei's repository. The script, `numbers.mjs`, run with
`POPS=…/panel_pops.txt FIXTURES=…/e2e/fixtures node numbers.mjs`:

```js
import { readFileSync } from "node:fs";
import { init, openVars, openVcf, calcPopDiversity, calcPerVarDistribs } from "popnei";
await init();
const pops = {};
for (const line of readFileSync(process.env.POPS, "utf8").trim().split("\n").slice(1)) {
  const [individual, pop] = line.split("\t");
  (pops[pop] ??= []).push(individual);
}
for (const [file, threshold] of [["panel.nei"], ["panel.vcf.gz"], ["panel.nei", 0.05], ["panel.nei", 1], ["panel.vcf.gz", 0.05]]) {
  const bytes = new Uint8Array(readFileSync(`${process.env.FIXTURES}/${file}`));
  const v = file.endsWith(".nei") ? openVars(bytes) : openVcf(bytes);
  if (threshold !== undefined) v.filterByMissingData(threshold);
  const d = calcPopDiversity(v, { pops });
  const r = calcPerVarDistribs(v, { pops, stats: ["obs_het", "unbiased_exp_het", "poly_vars_ratio"] });
  // printed: d.passStats, and per population d.numVars.withData, d.variableVarsRatio.total and
  // .ratio, d.fis; r.unbiasedExpHet.mean, r.obsHet.mean, r.polyVarsRatio.polyRatio
  v.free();
}
```

`calcPopDiversity` with its defaults, `minNumIndividuals` 20 and the four
statistics that need no draw:

| filter | variants kept | population | with data | variable | share variable | F_IS |
|---|---|---|---|---|---|---|
| none, and at 1 | 1,200 | p0 | 1,200 | 1,173 | 0.9775 | −0.012758486763376542 |
| | | p2 | 1,200 | 1,184 | 0.9866666666666667 | −0.018458583231322434 |
| | | p1 | 1,200 | 1,177 | 0.9808333333333333 | −0.018110713076467055 |
| missing data at 0.05 | 1,152 | p0 | 1,152 | 1,128 | 0.9791666666666666 | −0.011344341019483117 |
| | | p2 | 1,152 | 1,136 | 0.9861111111111112 | −0.020803811522959625 |
| | | p1 | 1,152 | 1,130 | 0.9809027777777778 | −0.017724256612463796 |

`calcPerVarDistribs` with its defaults, `minNumIndividuals` 20 and
`polyThreshold` 0.95, the numbers of the three columns:

| filter | population | He | Ho | polymorphic, below 0.95 |
|---|---|---|---|---|
| none, and at 1 | p0 | 0.35193160994408107 | 0.35642172473116646 | 0.9266666666666666 |
| | p2 | 0.344856554637815 | 0.3512221180544642 | 0.9108333333333334 |
| | p1 | 0.35038890489752544 | 0.356734697819302 | 0.9175 |
| missing data at 0.05 | p0 | 0.35267894847982756 | 0.35667985874177544 | 0.9288194444444444 |
| | p2 | 0.3440824705971255 | 0.3512406974637824 | 0.9105902777777778 |
| | p1 | 0.3498365468860467 | 0.35603713961547323 | 0.9157986111111112 |

What they say:

- **`calcPerVarDistribs` of the new release agrees with the numbers the
  specs held**, given by `js-v0.1.0-dev.1`, to the last digit, with no
  filter and at 0.05; the release changed how popnei reads a file and
  not what it calculates. `panel.vcf.gz` gives the same as `panel.nei`.
  The filter at 1 keeps all 1,200 variants and gives the numbers of no
  filter, and so does 0.1, the default of the application, since the
  missing rates of the panel stop at 0.08.
- **`calcPopDiversity` gives other numbers, of other statistics**, and
  none of the three columns. Its share of variable variants is above the
  share below 0.95 in every row, 1,173 against 1,112 variants of p0 with
  no filter. Its F_IS is exactly 1 − Ho/He of the table of
  `calcPerVarDistribs`, in all six rows, so the two functions agree
  where they meet.
- **The progress** of each pass was two calls: `{ bytesRead: 0,
  numBytes: 261490, pass: 1, numPasses: 1 }` and `{ bytesRead: 259376, …
  }` for `panel.nei`, whose pass does not read the schema at the head of
  the file, and 0 then 87,304 of 87,304 bytes for `panel.vcf.gz`.
  `numPassesOf` gives 1 for both functions. A value thrown by the
  function of `onProgress` came back from the calculation as the same
  value, `===`.
- **popnei's messages** that the specs quote as literals, the empty
  pass, the ploidy of `tetraploid.vcf.gz` read with ploidy 2, `bad.vcf`
  as a VCF and as a `.nei` file, a second filter of one kind and a MAF
  threshold of 1.5, are the same in the new release.
- A `Blob` given to `openVars` under node throws "popnei reads a `File`
  or a `Blob` through `FileReaderSync`, which a browser gives only inside
  a web worker, and this call was made where there is none: the main
  thread of a page, or node. Open the file inside a web worker, or give
  its bytes as a `Uint8Array`.", so the tests of the runner in node give
  popnei the bytes.

Nothing here was run in a browser: a `File` read by ranges, its
progress, and a file changed on the disk are seen by the Playwright flow
of stage 2.

## What is asked of popnei

1. **Raise `version()` with each release**, "0.1.0-dev.2" for the one
   stage 2 builds on, as the owner agreed on 25 September 2026. The
   version is in every key and beside every check number, and with
   "0.1.0" for two releases a result of one is found under the key of the
   other, and a difference of the check numbers between them is not put
   down to popnei.
2. **A kind for a source that could not be read**, apart from a refusal
   of its data, on the `Error` popnei throws when the browser refuses a
   range of a `File` or gives it short. The runner tells the two apart
   meanwhile by the start of popnei's message, "the source could not be
   read: " followed by the words of a range refused or given short,
   which a test holds against the release; a change of those words in a
   later release would make a changed file read as a refusal of its
   data until the test catches it. The prefix alone is not enough, since
   a damaged gzip crosses with it too. It is of the kind that popnei's
   issue #3 asks for other refusals.
3. **If D is answered (c)**: the unbiased expected and the observed
   heterozygosity, and a polymorphism threshold, in `calcPopDiversity`.

## Choices of a spec the owner may overrule

Not open points, decided by the writers and listed so that they are
seen: an individuals file whose read is pending or failed is not saved
in a project file; the Variants step starts a VCF's read options at the
reference's; a variants file whose name alone differs from the
reference's drops the carried check numbers (`projectFile.md`); the
warnings of a result are sentences above its table, not a count that
opens the help drawer, until the drawer comes in stage 8
(`diversity.md`); popnei's numbers are compared exactly in the tests of
the runner (`runner.md`); a change of the filters always opens the file
again, where the draft put only the filters missing from the end of the
list (`runner.md`); a refusal of popnei when the file opens again for a
run is `reopenFailed`, a file that changed and still reads
(`client.md`), and so is a refusal of an open again the runner makes
itself when the filters change (`runner.md`).

## Changes to approved files

What the eleven specs ask of files approved before them, each with the
spec that asks it and, where it follows from a decision above, its
letter. Each is made when the owner approves that spec, in a commit of
its own before the code of stage 2, as the `writing-specs` skill has a
spec change before its code.

### `package.json`

- `"popnei"` names the release
  `https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.2/popnei-0.1.0.tgz`
  in place of `js-v0.1.0-dev.1` (C), and the lock file follows.
- `"version": "0.1.0"`, the version of the application, which
  `vite.config.ts` writes into the code as `APP_VERSION` with `define`
  (I; `entry.md`).

### `src/worker/protocol.ts` and `docs/specs/worker/protocol.md`

- `IndividualsFileError` gains six kinds, `unnamedColumn`,
  `emptyIndividual`, `unclosedQuote`, `tooLarge`, `unreadable` and
  `notText`, with their fields (`worker/individuals.md`).
- `raggedRow` and `unclosedQuote` gain `separator: "," | ";" | "\t"`,
  the one the read used (O; `worker/individuals.md`).
- `CsvFound.encoding` gains `"utf-16"`, and the comment of `CsvFound`
  says it holds the three options used, set or found, and not only what
  "auto" found (`worker/individuals.md`).
- `RunError` gains `{ kind: "reopenFailed"; name: string; message:
  string }`, a variants file the browser can no longer read, changed,
  moved or deleted on the disk since it was picked; a second try does
  not mend it, a new load does (B; `messages.md`, `runner.md`,
  `client.md`).
- `Progress` becomes popnei's four fields, `bytesRead`, `numBytes`,
  `pass` and `numPasses`, in place of `done` and `total`, with their
  comments (C; `messages.md`, `client.md`).
- `Job` and `JobResult` are added, with the members `DiversityJob` and
  `DiversityResult`, and `Pops` (`diversity.md`, `messages.md`); the
  spec's "Not in this spec" points to those two specs for them.
  `PROTOCOL_VERSION` goes in `messages.ts`, not here (`messages.md`).
- The tests the spec gave to stage 2: the boundary of the missing data
  filter is checked at 0.05, since the missing rates of the panel stop
  at 0.08, and the PCA's MAF filter merged with the dataset's waits for
  the job of the PCA, in stage 4 (`runner.md`).

### `src/core/project.ts` and `docs/specs/core/project.md`

- `individualsNeeds` writes the words of the ten refusals of the reader
  after "could not be read:", `empty` reworded "it has no row of
  individuals", `raggedRow` and `unclosedQuote` ending with the
  separator, ", read with the semicolon as the separator" (O); the
  validation of a project file accepts a failed read of each kind with
  its fields, `separator` among them, and `"utf-16"` in `found`; the
  comment of `found` says the three options used. This settles **Open
  5** of `project.md` (`worker/individuals.md`).
- `individualsNeeds` takes the name of the file of the application, "a
  metadata file" in population genetics and "a traits file" in
  association, for its reasons, "Load a metadata file in the
  Individuals step.", and for the words of `tooLarge`, which name it
  twice (P; `steps/individuals.md`, `worker/individuals.md`,
  `shell.md`).
- `individualsCheck(p)`, a new function that gives the individuals of
  the variants file found in the table, those missing, and the rows of
  other individuals, with `individualsNeeds` written on it
  (`steps/individuals.md`; `shell.md` reads it).
- The private helpers that escape and cut a name, name a list of
  individuals, count and group digits, `shown`, `escaped`, `namesOf`,
  `counted` and `grouped`, are exported, or moved to a module of their
  own, with no change of behaviour; and a function that escapes without
  cutting, beside `shown` (`diversity.md`, `projectFile.md`,
  `steps/individuals.md`).
- The words of `newerFormat` become those of `projectFile.md`, which the
  spec left to it; "The cases" no longer leaves to stage 2 what a
  project file writes of a pending read, which `projectFile.md` decides
  (`projectFile.md`).
- `Check` gains `popneiVersion` and `appVersion`, `Reference` loses its
  own, and `parseCheck`, `parseReference` and `FIELD_WORDS` follow (E;
  `projectFile.md`).
- `SourceError` carries `reopenFailed` through its type, as a failure of
  the worker; `WHAT_HAPPENED`, `SOURCE_ERROR_KINDS` and `parseSourceError`
  gain the kind, and `projectNeeds` gives for it "panel.nei could not be
  read; it may have changed on the disk since it was picked. Load it
  again in the Variants step." (B; `steps/variants.md`, `entry.md`).
- From stage 4, not in stage 2: `Grouping` gains a value for "every
  individual in one population", and `individualsNeeds` no longer locks
  on no file (A).

### `src/core/testSupport.ts`

- `TEST_DEFS`, the three analyses of `TEST_ANALYSES` as whole
  definitions of `AnalysisDef`, which the tests of the project file and
  of the shell use (`projectFile.md`, `shell.md`).
- `wholeProject` draws checks with their versions (E; `projectFile.md`).

### `src/core/store.ts` and `docs/specs/core/store.md`

- "The final words are those of the screen of the project file, in
  stage 6" becomes `checkVerdictText` of `projectFile.md`, in stage 2;
  the other mentions of the project file in stage 6 become stage 2
  (`projectFile.md`).
- "Not in this spec" gives `src/ui/runs.ts` to `docs/specs/entry.md`, not
  to the specs of the shell (`entry.md`).
- `verdictOf` reads the versions of the check, not of the reference, and
  its test follows (E; `projectFile.md`).
- The progress a `RunView` holds is the `Progress` of four fields; the
  store passes it on unchanged, so only the literals of
  `src/core/store.test.ts`, `{ done: 3, total: 10 }` and the like,
  change (C; `client.md`).

### `docs/specs/core/history.md`

- The question before an opening is no longer "Open a project and lose
  this one?", asked always, but the dialog of `shell.md`, "Opening",
  asked when the project has changed or calculations are in flight.

### `docs/architecture.md`

- Sections 5, 6 and 11: reading by ranges is the design, built on
  `js-v0.1.0-dev.2`, and no longer a target (C; `runner.md`,
  `client.md`, `messages.md`, `steps/variants.md`):
  - section 6, "The variant file, read by ranges: the target" and "The
    variant file read whole: popnei 0.1.0, where the walking skeleton
    starts" become one section: the worker gives popnei's `openVcf` and
    `openVars` the `File`, which popnei reads in ranges of 4 MiB at most
    through `FileReaderSync`, with no source of bytes of our own; a
    change of the filters frees the `Variants` and opens the `File`
    again, which reads its header, since a filter cannot be taken off a
    `Variants`; "What this asks of popnei", items 1 and 2, are given by
    that release;
  - section 5, "Progress": it comes from popnei's `Variants.onProgress`,
    four numbers, the bytes the pass has read, the bytes of the file,
    the pass and the passes of the run, which `numPassesOf` gives before
    the run, and not from a source of ours; "Cancelling" and "A change
    of the load": a restart, and an undo to the previous load, open the
    file again by reading its header, not the whole file; "Two workers,
    and why": the pool's cost "with popnei 0.1.0 each would hold the
    whole variant file" goes;
  - section 11: the size of a file is limited by the time of a pass and
    not by memory, the limit of 1.5 to 2 GB goes; "A file changed on the
    disk" names `reopenFailed` and its words; "Picking a file again"
    loses "with popnei 0.1.0, the time of reading the whole file"; the
    opening line names the release, `js-v0.1.0-dev.2`, and not version
    0.1.0 alone.
- Section 10: the walking skeleton reads the variants file by ranges
  with `js-v0.1.0-dev.2`, and not whole as popnei 0.1.0 did; it reads a
  VCF as well as a `.nei` file, and writes the project file in its full
  first version, as the owner decided on 25 September 2026
  (`diversity.md`, `projectFile.md`).
- Section 9, the tree: `src/worker/runnerWorker.ts`, the worker's script,
  beside `runner.ts`, which alone calls popnei (`runner.md`);
  `src/worker/individualsFile.ts`, which reads and decodes the bytes of
  the individuals file (`worker/individuals.md`); `src/ui/popgen.tsx`,
  the entry, with `src/ui/reads.ts`, `saving.ts`, `defects.ts`,
  `files.tsx` and `store.tsx` (`entry.md`); `src/ui/shell/status.ts` and
  `words.ts` (`shell.md`); `src/ui/analyses/AnalysisPanel.tsx`,
  `panels.ts` and `diversity/` (`diversity.md`, `shell.md`); the steps
  of stage 2 are three, `variants`, `individuals` and `analyses`, and
  `export` joins in stage 6 (J; `shell.md`).
- Section 2, the type `Reference`, and section 8, "when it is not the one
  in the file's header": the versions are kept with each check (E;
  `projectFile.md`).
- Section 3, the version of popnei in the key, "which the calculation
  worker reports": it is what `version()` gives, which is only as good as popnei
  raising it at each release (C; `runner.md`).

### `docs/functionality.md`

- Section 6: "below 0.95" in place of "at most 0.95" (G; `diversity.md`).
- Section 9, the project file: the check numbers of the diversity are
  the number of variants the filters kept and the expected
  heterozygosity, the observed heterozygosity and the proportion of
  polymorphic variants of each population (D; `diversity.md`); the
  versions of popnei and of the application are kept with the numbers of
  each analysis (E).
- Section 9, "Any table or plot": a CSV or a plot downloaded holds the
  table or the plot alone, and the versions of popnei and of the
  application are shown on the page beside the download (E;
  `diversity.md`).
- Section 3, the table of the filters of variants, and open point 4: the
  missing data filter is on at 0.1 (N; `steps/variants.md`).

### `docs/build-order.md`

- Stage 2 holds the project file in its full first version, which stage
  6 held, and reads both formats of the variants file, as the owner
  decided on 25 September 2026 (`projectFile.md`, `diversity.md`).
- Stage 2 builds on `js-v0.1.0-dev.2` and reads the variants file by
  ranges, with a progress bar; a design of reading by ranges after stage
  2 is no longer needed (C).
- Stage 2 holds the button of the Variants step that reads a VCF again
  with another ploidy (M).
- Stage 3: writing the filtered variants as a VCF or a `.nei` file is in
  the Variants step; stage 6: the Export step comes with the report (J).
- Stage 4: the metadata file becomes optional (A).
- This file is not among those the stage 2 specs may edit.

### `.claude/skills/coding/worker.md`

- The message `files` is gone: the `File` travels in the `open` and the
  `readIndividuals` that need it, `{ kind: "readIndividuals", id, file,
  csv }`; the Cancelling step 4 and "What is tested where" follow
  (`messages.md`).
- The answer `error` with `fatal` becomes four kinds, `refused`,
  `reopenFailed`, `crashed` and `badRequest` (B; `messages.md`).
- `progress` carries popnei's four fields, and `Progress` of the
  protocol with it (C; `messages.md`).
- "Progress, from the source of bytes" becomes progress from popnei's
  `Variants.onProgress`; "popnei 0.1.0 reads the whole file" becomes
  popnei reading the `File` by ranges; "What popnei has to provide",
  items 1 and 2, are given by `js-v0.1.0-dev.2`; the pool of workers
  loses "each would hold the whole variant file" (C; `runner.md`).
- `PROTOCOL_VERSION` is in `messages.ts`, not in `protocol.ts`, and the
  example of `Job` takes the fields of `DiversityJob` (`messages.md`,
  `diversity.md`).
- `start.ts` imports `./runnerWorker.ts?worker`, not `./runner.ts?worker`
  (`runner.md`, `client.md`).
- The filters are not copied onto a pass: popnei cannot, so a change of
  the filters frees the `Variants` and opens the `File` again, which
  reads its header (`runner.md`).
- An array of a result that is a view of part of a buffer is a defect,
  thrown by `transferablesOf`, where the skill copies it with `slice()`
  (`runner.md`).
- The `error` handler of each worker's script, and the client's `onerror`
  of each worker, call `event.preventDefault()`, so that a crash of a
  worker does not reach the error bar of the page (`entry.md`,
  `runner.md`, `worker/individuals.md`, `client.md`).

### `.claude/skills/coding/testing.md`

- popnei's numbers that the runner passes on with no arithmetic are
  compared with `toBe`, exactly, where the skill asks `toBeCloseTo` for
  every float; the tolerance stays for numbers our code computes
  (`runner.md`).
- The runner's tests in node give popnei the bytes of a fixture, since
  popnei reads a `File` only inside a web worker; a `File` read by
  ranges is checked by the Playwright flow (C; `runner.md`).

### `.claude/skills/coding/react.md`

- "The states of an analysis": the warnings are sentences above the
  result, with their count on the heading, until the help drawer comes in
  stage 8, where the skill has a count that opens the drawer
  (`diversity.md`).
- "Errors": what the bar does with a second error, which the skill left
  to the shell, is `shell.md`'s: a count after the first error's text,
  and every error kept for "Copy the details" (`shell.md`).
