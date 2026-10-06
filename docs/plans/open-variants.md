# Open a variants file and see what it holds

The first piece of the new screens, asked for by the owner on 5 October
2026: a page with an Open button that opens a VCF or a `.nei` file; once
the file is opened, a second widget that shows what popnei says the file
holds; and an error message when the file cannot be opened or read.
Built as the `building` skill says, on the branch `open-variants`.

## What the user can do when it is done

Steps 1 and 2 of cases 1 and 2 of `docs/use-cases.md`. The user opens
the new page, presses "Open variants file…", and picks a VCF, gzipped
or not, or a `.nei` file. They see the name and size of the file, the
number of individuals, the ploidy, and, after one pass over the file
with its progress shown, the number of variants and the chromosomes with
the number of variants on each. When the file cannot be used, they see
why, in words that name the file and say what to do.

## What it stands on

Reused as they are:

- The store (`src/core/store.ts`, `src/ui/store.tsx`), the client of the
  calculation worker (`src/worker/client.ts`), the files of the user
  (`src/ui/files.tsx`) and the reads (`src/ui/reads.ts`), set up as
  `src/ui/popgen.tsx` sets them up.
- Opening: `loadVariants` of `src/core/project.ts` with the command the
  Variants step uses (`src/ui/steps/variants/commands.ts`), which leads
  the worker to call popnei's `openVcf` or `openVars`. The result,
  `SourceRead` of `project.ts`, gives the individuals and the ploidy.
- The words of a failed read: `variantsReadNeeds` of `project.ts`, and
  the words of a refused analysis that the other analyses use.
- The defects of the application's own code, an exception or a React
  error: `src/ui/defects.ts` with `ErrorBar` and `ErrorBoundary` of
  `src/ui/shell/`.
- The widgets `FileZone`, `Problem`, `ProgressBar` and `Table` of
  `src/ui/widgets/`.

New from popnei: `calcVarDensity(variants, windowSize)`, declared in
`node_modules/popnei/dist/stats.d.ts`, which the application does not
call yet. Opening reads only the header of the file. So the number of
variants and the chromosomes need this pass over the whole file. The
pass reads only the chromosome and the position of each variant, as its
doc comment says. It finds a bad position in the middle of a VCF, but
not a bad genotype, nor genotypes of another ploidy than the one given:
the architecture review of 5 October 2026 ran a tetraploid VCF read as
diploid through it, and got 200 variants and no error. Those are caught
by the next piece, whose distributions read the genotypes. Until then
the summary says the ploidy is the one the user gave, not one popnei
found.

## The design

**The summary is an analysis.** A new module,
`src/core/analyses/variantsSummary.ts`, has the shape of section 4 of
`docs/architecture.md`, with its request and result added to the unions
of `src/worker/protocol.ts`, their checks in `messages.ts`, and its
handler in the runner. It reads no filter, `filtersRead: { variants:
false, individuals: false }`: it describes the file as it is. It has no options. Its result has the field `analysis` and `passStats`
as every result does, so `countsOf` of `src/core/apps.ts` gets a case
for it, and through it the store records the number of variants with
`recordVariantsCounted`, as for every other pass. Not taken:
calling popnei in the read of the file itself. That would change the
read, which every analysis waits on, and would put a pass of minutes
before the individuals and the ploidy are shown.

**One window per chromosome.** `calcVarDensity` counts the variants in
windows of a size the caller gives. Any size would be a default that
depends on the genome, which the owner does not want. A window of
`Number.MAX_SAFE_INTEGER` base pairs, the largest popnei accepts, gives
one window per chromosome, so the counts per chromosome need no choice.
It is called with `chromLengths: {}`, so that the lengths of the
`##contig` lines are not used. With them, a header of thousands of
scaffolds would list each one, with 0 variants, and a variant past the
length its header gives would make the whole summary fail on a file
that is otherwise usable. Without them, the chromosomes are those with
variants, in the order of their first variant.
The density along each chromosome, which needs a size of window, is a
later piece.

```ts
// protocol.ts, beside the other jobs
type VariantsSummaryJob = { analysis: "variantsSummary" };
type VariantsSummaryResult = {
  analysis: "variantsSummary";
  passStats: PassStats;                  // its numVars is the count
  chroms: readonly string[];             // in the order of their first variant
  numVarsPerChrom: Uint32Array;          // one count for each of chroms
};
```

As built, the job is `{ analysis, fileId, filters: [] }`, like the job
of the statistics of each individual, and the counts are a typed array,
as `coding/worker.md` asks of a result; `chromRows` of the module gives
the rows of the table. `PROTOCOL_VERSION` goes
from 4 to 5, and the literals `protocol: 4` of `messages.test.ts` and
`client.test.ts` with it.

**Its own list of analyses.** The summary is in a list of the new page,
not in `POPGEN_ANALYSES` of `apps.ts`. In that list the old page would
show it in its stepper as ready, and the lists of `titles.ts`, its tests,
and `checksWritten` of `projectFile.ts` would change. The unions of the
protocol, `stepsOf` of the runner and `countsOf` do change, as types; the
old page behaves as before.

**It runs on its own once the file is read.** The user opens a file to
see what it holds, so the summary starts without a Run button. No
analysis starts on its own today: they start from `startAnalysis` of
`src/ui/runs.ts`, at a Run. So a module of the page, `src/ui/autoRuns.ts`,
subscribed to the store as `reads.sync` is in `popgen.tsx`, calls
`startAnalysis` once for each key of the summary and remembers the keys
it started. It does not start a key again after a failure, which the
store clears at the next command of the user, nor after a Stop; only a
new file, or the user's "Count again", does. Opening another file while
it runs leaves the old result unshown, as the keys of the store already
ensure: a new load stops what is in flight.

**A Stop.** A pass over millions of variants takes minutes, so the
progress has a Stop button, and a stopped count says so and offers
"Count again".

**A new page, beside the old one.** The screens start again, so the
piece is a new entry of the site, `popgen2.html` with
`src/ui/popgen2.tsx`, added to the `input` of `vite.config.ts`. It has the defects, the store, the client, the files and the reads of
`popgen.tsx`, and no stepper. The part of `popgen.tsx` that sets them
up, and the start guard inline in `popgen.html`, are moved into
functions both pages call, rather than copied: about 150 lines that
would otherwise drift apart. The old page's browser tests check that the
move changed nothing there. Two tabs, one on each page, each run a
calculation worker of their own. The old `popgen.html` stays, with its
tests, until the new page covers what it does. Then the new page takes
its name. Not taken: replacing the Variants step of the old page, which
would break 1,143 browser tests that check screens that are going away.

**Two widgets, in `src/ui/variants/`:**

- `OpenVariants`: the button "Open variants file…" over `FileZone`,
  which also takes a dropped file. It accepts `.vcf`, `.vcf.gz`, `.vcf.bgz` and `.nei`, whatever `formatOfName` of the Variants step accepts. For a
  VCF the read has two options, settled since stage 3: the ploidy, a
  whole number from 1 to 255, 2 by default, and whether only the
  variants with PASS or `.` in their FILTER column are read, on by
  default. The field "Default ploidy" is on the button's row, after it,
  and the box of the PASS variants under that row; both reuse the code
  of the Variants step. The ploidy is asked for because a VCF does not
  say its ploidy, and popnei reads it with the one given. Changing either
  reads the file again. Under the zone, the errors of opening: a file
  refused by its name, several files at once, and a file popnei could
  not read. Each is a `Problem`, announced to a screen reader.
- `VariantsSummary`, shown once the file is read: the name and size of
  the file, the individuals, the ploidy, said as the one given for a VCF
  and as the file's for a `.nei`, and for a VCF whether only the passed
  variants were read; then the progress of the pass, with its Stop;
  then the number of variants and a table of the chromosomes with their
  variants. When the pass fails, a bad line of the VCF among the causes,
  the words of the refusal are shown in place of the counts, as a
  `Problem`.

The words follow the last section of the `writing` skill, and those
the Variants step already has are reused when they fit.

## The phases

**1. The analysis.** The module, the job, the result, the handler of the
runner, its definition in `src/core/apps.ts`, and whatever else section 4
of the architecture lists for a new analysis. The old page must not show
it anywhere and must not change. Its tests are in Vitest:

- the module, as the tests of `variantChecks.ts` are written;
- the runner on `e2e/fixtures/panel.nei` and `panel.vcf.gz`, with the
  number of variants and the counts per chromosome taken from popnei's
  Python on the same files, as literals;
- a new fixture, a VCF whose header and first lines are right and one of
  whose later lines has a position that is not a number, refused by the
  pass with popnei's words. `bad.vcf` is plain text and is refused at
  the opening, before any pass.

**2. The page.** The entry, the two widgets, the errors. Its tests are a
flow of Playwright for the use case: open `panel.vcf.gz`, see 200
individuals, the ploidy and the counts; open `panel.nei`; open `bad.vcf` and see the refusal of the opening; open the new fixture
and see the refusal of the pass; stop a count and count again; change
the ploidy and see the file read again; drop a file of another kind and see why it is
refused; with axe on each state. Run in Chromium and WebKit, since
Firefox cannot be started on this Mac. The states for the screenshots,
in `e2e/screens.spec.ts`, light and dark, at the width of a desktop and
at 320 px:

1. nothing opened;
2. reading the file;
3. counting the variants, with the progress;
4. the summary;
5. a file refused by its name;
6. a file popnei could not read;
7. a pass that failed;
8. a count stopped.

## What is left out

- The density of variants along each chromosome: a later piece, with the
  size of its windows decided with the owner.
- The names of the individuals, which the read gives: a later piece,
  with the files of the individuals.
- A check that the genotypes agree with the ploidy given: the next
  piece, whose pass reads the genotypes.

- The filters, the histograms and the saving of the file of cases 1 and
  2: the next pieces.

## What was done

### Phase 1, the analysis

Commits a73b80c (the worker) and 88f73d8 (core), then the fixes of the
review: bc2f073, cb612c8, cbbf5d5, 3b1626a. On 3b1626a: Prettier clean,
`tsc` and ESLint with no output, Vitest "Tests 3715 passed (3715)", the
build, Playwright "1142 passed" in Chromium and WebKit (Firefox cannot be
started on this Mac), the release URLs of popnei and xlsx_rs.

popnei's Python gave the literals of the tests: `panel.nei` and
`panel.vcf.gz` 1,200 variants on "1"; `ld.vcf.gz` and `ld.nei` 250 on
chr1 and 250 on chr2; the new `bad_position.vcf.gz`, the panel's first
100 variants with the position of the 80th written `x80`, refused at
"line 84 of the VCF, the column POS: `x80` is not a position".

The review sent spec, tests, stale, errors, api and architecture. Fixed:
no test guarded `chromLengths: {}`, the order of the chromosomes or
`onlyPassed`, now a VCF built in the test with lengths in its header;
the check of popnei's answer was never run, now a function tested with
hand-made answers, which also checks that the counts add up to the
pass; the Python line that opens the file was written in four analyses,
now `pythonOpenVariants` of `words.ts`; `app` is `["popgen"]`;
`docs/architecture.md`, sections 4, 6 and 9, records the summary and the
list of the new page. Not taken: keeping the counts per chromosome among
the check numbers of the project file, since the total comes from the
same pass. stale and architecture found nothing.

**For phase 2**, from the review:

- The words of a refused summary are the page's own; the shared ones send
  the user to a Variants step. Three refusals of popnei need words that
  say what to do: a VCF in which no variant passed, which popnei words
  as "its source holds none", and which the old Variants step already
  words for a VCF with none that passed (`e2e/writing.spec.ts`, VS5 D3);
  a variant at the position 0; a position of 2^53 or more, which popnei
  words as a window the user never chose, rare since the VCF format
  allows positions up to 2^31 − 1.
- After a Stop the store's status is `ready`, as before any run; the page
  knows a count was stopped only from the keys `autoRuns.ts` remembers.
- `titleOf` and `stepOf` of `src/ui/analyses/titles.ts` throw for an
  analysis they do not list: the page must not pass the summary to the
  shell's words, or the summary gets a title there.
- The new page saves no project file in this piece. A project of the new
  page opened on the old one would name an analysis the old page does not
  know; that waits for the piece that saves projects.

**For popnei**, not opened as an issue: the refusal of a position of 2^53
or more names a window and not the line of the VCF; Python's
`calc_var_density` accepts a window of 2^53, which the TypeScript
declaration says is past its limit.

### Phase 2, the page

Commits a992911, 4e30773, a83bdc8 and 6495722; the fixes of its review,
6547d66, c4f958f, 395ee6a, 5a689b3 and 9c27cf7; the fixes of a second
look at them, dc2fc53, 79539b5, 0074a55 and 3d4f635. On 3d4f635:
Prettier clean, `tsc` and ESLint with no output, Vitest "Tests 3758
passed (3758)", the build, Playwright "1190 passed" in Chromium and
WebKit (Firefox cannot be started on this Mac), the release URLs.

The review sent all ten categories. stale, bundle and browser found
nothing: the old page downloads 333.7 kB gzipped before any lazy file,
334.9 kB before the piece; the new page 192.9 kB; the guard's three
messages show on both pages. Fixed, among 24 findings: the options of a
VCF moved before the zone and kept over a `.nei`; the words of a plain
gzip cut short, of an empty VCF, and of a failure Count again cannot
mend; a defect of the count sent to the error bar; one source of the
refusal words; the page starts from the first project of the old page,
with the missing-data filter at 0.1; the build fails on a page without
the guard; the shared code in two chunks named `react` and `shared`;
flows with two chromosomes and with variants that did not pass;
`docs/architecture.md`, `docs/specs/entry.md` and `shell.md` updated.

A second look, react and accessibility, found that the first click on
the open button was still lost with a long file name at 320 px and after
a refused ploidy, and that the focus fell to the top of the page from
the count's heading. Fixed: the zone's line is under the button, and the
refusal of the ploidy under the zone, tied to its field by
`aria-describedby`; the summary hands the focus to the open button when
it goes. A re-run of the reviewer's scripts: the file chooser opened on
the first click in 42 of 42 runs, and axe found 0 violations in 100
checks, in Chromium and WebKit.

Decisions of the session the owner may want otherwise: the read options
before the open button; the refusal of a ploidy shown under the zone,
away from its field, so that nothing above the button moves; the
summary's ploidy line "Ploidy 2, the default, as set under How a VCF is
read"; the page's name `popgen2.html`, to become `popgen.html` when it
replaces the old page.

Not seen: Firefox, which runs on GitHub once `main` is pushed; a screen
reader (VoiceOver), whose words were checked only in the page's status
region; iOS Safari, whose file picker may grey out `.vcf` and `.nei`
files (seen outside the scope by the browser review).

### Round 1 with the owner, 6 October 2026

The owner, trying the page: the headings "Population genetics",
"Variants file" and "How a VCF is read" go, and the page's one heading
is "Popnei"; the explanation under the ploidy goes; right under the
heading, one widget holds the button "Open variants file…" and, on the
same row, the field "Default ploidy" (2); the PASS box below them.

Built in 173fd61, with a flaky test fixed in cbf6cb2 and the fixes of
its review in 97c61f5. The review sent ux, react and accessibility.
Fixed: with the explanation under the field gone, nothing said the
ploidy is not checked against the genotypes, so the summary's ploidy
line says it; a click in the gap beside the ploidy field sent the
focus to the zone's hidden paste button, in Chromium and WebKit; the
field's one-row form is allowed by its type only with the refusal drawn
elsewhere. The flaky test matched the refusal both on the page and in
the status region, 12 runs in 40 in WebKit under load. On 97c61f5:
Vitest "Tests 3758 passed (3758)", Playwright "1204 passed" in Chromium
and WebKit, axe 0 violations in 32 runs. Not changed, for the owner:
with a `.nei` open, the ploidy field and the box apply to the next VCF
and nothing says so; the tab's title is "Popnei".

### Round 2 with the owner, 6 October 2026

The owner: the heading "What the file holds" goes; the information of
the open file in one box of its own, above the open widget, "file name,
file size / individuals / variants / number of chromosomes / ploidy",
showing what is known at once and filled in when the file is read; any
error of the file in that box. Built in ea4ee6d; its review sent ux,
react and accessibility, and the fixes are in 10d81a2. The box keeps the
same five lines in every state of a read and a count, each value
replaced in place ("reading…", "counting… 6%", "not counted"), with one
row of fixed height under them for the reading time, the bar and Stop,
or Count again; so nothing above the open widget changes height when a
change of the ploidy reads the file again, and the deferral of that read
until a press ended, which a context menu could leave unapplied, is
gone. The table of the chromosomes is under the open widget. On 10d81a2:
Vitest "Tests 3762 passed (3762)", Playwright "1212 passed" in Chromium
and WebKit, axe with no violation in 10 states.

The owner also decided that the ploidy of a VCF is to be empty by
default once popnei reads it from the file: issue
https://github.com/JoseBlanca/popnei/issues/8, opened on 6 October 2026.
Until a release of popnei has it, the field starts at 2.

### Round 3: the ploidy read from the file, 6 October 2026

popnei closed issue #8 on 6 October 2026 (merge 0a40644 of its main):
`openVcf` with no `ploidy` reads it from the file, the number of alleles
of the first genotype that is not a single dot, and refuses with its own
words when the search finds none. No release of the wasm package has it
yet; the newest is `js-v0.1.0-dev.3`. So this round is built against the
local build of popnei's main, installed with `npm install --no-save` as
CLAUDE.md says, and the branch is not merged until a release has it and
`package.json` names that release.

What changes, as the owner decided: the ploidy field is empty by default
and a VCF is opened without a ploidy unless the user gives one; the box
shows the ploidy popnei read, said as read from the file; a ploidy the
user gives is used as today; popnei's refusal when it cannot read the
ploidy is shown in the box and asks for one.

The owner then changed this round, on 6 October 2026, while it was
being built, and these decisions replace the empty field above:

- "now that we can open most VCF files without giving a ploidy, we're
  going to remove the possibility of giving a default ploidy. We just
  need the 'open variants file...' dialog." The open widget is the
  button alone; a VCF is always opened with no ploidy, which popnei
  reads from the file. A VCF whose ploidy popnei cannot read is not
  opened here; the box says how popnei's Python opens it with a ploidy
  and writes a `.nei` file.
- "we don't need the 'Only the variants with PASS or . in the FILTER
  column' check, that can be a filter to be applied along with other
  filters." Every variant of a VCF is read, whatever its FILTER column,
  until a filter of the FILTER column comes with the other filters. In
  popnei that choice is an option of the opening, not a filter of a
  pass, so such a filter needs popnei (asked of the owner on 6 October
  2026).
- "We don't need the 'given by the file' note, all ploidies in the web
  application will be given by the file. Also, we don't need the
  'Variants on each chromosome' table." The box says "Ploidy: N"; the
  table is gone, and the box keeps "Chromosomes: N".
- A crash of the worker sends its technical words to the error bar,
  where they can be copied for a report, and the box says only
  "<file> could not be read.", in the owner's words.

popnei's release `js-v0.2.0` (tag at popnei 6abacd1, 6 October 2026) has
the ploidy read from the file; `package.json` names it (4a41175).

Left for the owner and for popnei: popnei reads the ploidy from the
first genotype that is not a single dot, so a diploid VCF whose first
genotype is haploid, a male's chrX listed first, is shown as "Ploidy: 1"
until a pass reads the genotypes; and popnei's refusal "hold no genotype
with alleles" does not tell a VCF of missing genotypes from one with no
GT field. The project file still refuses a null ploidy; the piece that
saves projects from this page decides how a ploidy read from the file is
saved.
