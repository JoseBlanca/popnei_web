# popgen2.html: the download of the filtered variants

The screen spec of the download of the filtered variants on
`popgen2.html`: one button, "Download filtered variants…", after the
Variants and Individuals sections, that writes the variants and the
individuals the filters keep as a VCF compressed with bgzip, `.vcf.gz`,
or as a `.nei` file, and hands the file to the browser's download. It
develops the section "The download of the filtered variants" of the
design `docs/designs/stats-filters.md`, approved by the owner on 8
October 2026 with its decisions 7 to 12, and section 3 of
`docs/functionality.md`, "Reading and writing". Written on 8 October
2026; there is no code of it yet. It covers case 1 of
`docs/use-cases.md` to its end, the filtered file in the user's hands.

The module specs it reads, revised for it the same day: the write
itself, its request, its file name, the check of a filtering that keeps
no variant and the words of its failures,
`docs/specs/analyses/writeVariants.md`; the state of the write in the
store, `docs/specs/core/store.md`, "The writing of the filtered
variants"; and the request and the answer of the calculation worker,
`docs/specs/worker/protocol.md`, `messages.md` and `runner.md`. The
thresholds and the FILTER box this download carries out are those of
`docs/specs/steps/popgen2-filters.md`, whose terms this spec uses.

## The terms

- **The one pass** is the single reading of the variants file when it
  is opened, which gives the count of the variants, every plot of the
  page, each individual's missing rate and heterozygosity, and how many
  variants failed their FILTER (`popgen2-filters.md`, "The terms"). It
  reads no filter. **Finished** means it read the file to its end: not
  while it runs, not after a Stop, not after a failure.
- **The write** is a second reading of the file, made only when the user
  asks for it, that carries the filters out: the individuals kept are
  given to popnei as a list, and every filter of the variants that
  applies to the file is put on the pass, in the order of
  `docs/architecture.md` section 2. popnei writes the file as it reads,
  and hands it over in pieces of 1 MiB, which the calculation worker
  gathers into one file in memory, a `Blob`, the browser's object for a
  file made in the page (`writeVariants.md`, "What it does").
- **The worker** is the second thread of the tab, where popnei reads the
  file, so that the page does not freeze. One request runs in it at a
  time, and Stop ends it and starts another.
- **The dialog** is a box over the page, React Aria's modal dialog
  (`src/ui/widgets/Dialog.tsx`): while it is open the rest of the page
  cannot be clicked or reached with the Tab key, and a screen reader
  hears only the dialog. So no filter can change while a file is
  written.
- **The focus** is the control the keys act on; **the status region** is
  a line of the page that is not seen and that a screen reader speaks
  each time its words change (`popgen2-filters.md`, "The terms").
- **The text after the download** is the paragraph that takes the place
  of the button once a file was downloaded: the file, its size, what it
  holds and what each filter removed, with "Save it again".
- **Certain**: the page knows, from the one pass alone, that the filters
  keep no variant. The rules of when it knows are in `writeVariants.md`,
  "The functions of core", `noVariantForCertain`; in short, when the
  FILTER box is ticked and no variant of the file passed its FILTER, or
  when the filters of the individuals keep every individual and one
  threshold of the variants has no variant at or below it in its plot.

## What changes for the user

- After the Individuals section, a button "Download filtered variants…".
  It waits, with its reason in words beside it, until the one pass is
  finished.
- It opens a dialog with the choice of the format, a VCF compressed with
  bgzip or a `.nei` file, and Download and Cancel. No count is shown
  there, as the owner decided on 8 October 2026.
- While the file is written the dialog shows a bar and Stop.
- When the write ends the dialog closes, the browser's download starts
  by itself, and the button gives way to the text after the download,
  with "Save it again". The text stays until a threshold, the FILTER box
  or the file changes; then the button is back.
- When the filters keep no variant the page says so in one sentence in
  place of the button: before any write when it is certain, after the
  write otherwise.
- No estimate of the size, no warning and no refusal of a large file, as
  the owner decided on 8 October 2026.

## What it shows

### The button

"Download filtered variants…", the button of the widgets
(`src/ui/widgets/Button.tsx`), at the end of the Individuals section,
after "Download the missing genotypes and heterozygosity of each
individual (CSV)" and before "Open another variants file…". It is drawn
whenever the sections of the statistics are, that is once a file is
open. The three dots say that it opens a dialog and downloads nothing
by itself.

It is enabled once the one pass is finished, since the individuals kept
are worked out from the values of the individuals that the finished one
pass gives (`docs/specs/core/store.md`, "The individuals kept"). Before
that it is disabled, with a line beside it that says why:

- while the file is opened, while the one pass runs, and after a Stop of
  it: "The download waits for the statistics of the file to be read to
  the end." After a Stop, Start again in the box of the file is what the
  user does;
- after a failure of the opening or of the one pass: "The download needs
  the statistics of the file, which could not be calculated." The box of
  the file says what failed, as it does today.

A file that holds no variant is refused by popnei's one pass, "the pass
gave no variant and its source holds none" (popnei 0.2.2 under node, on
a `.nei` file of no variant written from `panel.nei`, 8 October 2026), so
the box says "panel.nei has no variants. Open another variants file.",
and the button is disabled with the second line above. The design gave
such a file a sentence of its own, "panel.nei holds no variants, so
there is nothing to download."; with popnei 0.2.2 the page never reaches
it, and it is not built.

When the filters of the individuals keep none, the store's write is
`locked`, and the button gives way to the words of `keptNoneReason` of
`docs/specs/core/individualsKept.md` without a step to name, which the
page asks of it with its new third argument, `null`: "The filters of
individuals keep none of the 200 individuals of panel.nei. Loosen
them." The reason the store's lock carries ends "in the Variants step",
a step of the old page, and is not shown here. Nothing can be written,
since popnei refuses an empty list of individuals. The store's other
reasons of a lock, `projectNeeds`, `individualListNeeds` and
`variantFilterNeeds`, cannot hold once the one pass is finished on this
page, which has no lists of individuals and no LD filter; a lock for
another reason than an empty list is a defect, thrown.

When it is certain that the filters keep no variant, the button gives
way to the sentence of "When the filters keep no variant", below.

### The dialog

Before the dialog opens, the button makes every change of a threshold
still waiting a change of the project: a run of the arrow keys within
its quiet second, and a number typed and not yet committed
(`gate.endAll()` of `src/ui/variants/thresholdRun.ts`, and the commit of
the number box, as an opening of a file does,
`docs/specs/steps/popgen2-filters.md`, "A run waiting is made a change
before any other command"). The press on the button takes the focus from
the threshold, which already does it; the button does it as well, so
that the write never starts from filters about to change.

Its heading is "Download filtered variants". It holds:

- **The format**, a group of two radio buttons named "Format"
  (`src/ui/widgets/RadioGroup.tsx`): "VCF compressed with bgzip
  (.vcf.gz)" and "popnei's .nei file". The VCF is chosen the first time
  the dialog opens, since most programs read it; after that the dialog
  opens on the format chosen last, until the page is closed. The format
  is not part of the project and has no Undo.
- **Download**, which starts the write, and **Cancel**, which closes the
  dialog and gives the focus back to the button.

Escape closes it as Cancel does. The dialog shows no count, no size and
no name of the file before the write.

### While the file is written

Download sends the write, `startWriting` of `src/ui/runs.ts` with the
format chosen. The dialog then shows, in place of the format and its two
buttons:

- the words "Writing low_qual.filtered.vcf.gz · 35% · 0:12", the name of
  the file, the share written and the time since Download, as the old
  page's line of a write (`writeVariants.md`, "Its words"); before
  popnei's first report, "Writing low_qual.filtered.vcf.gz · 0:12";
- the bar (`src/ui/widgets/ProgressBar.tsx`), named "Writing
  low_qual.filtered.vcf.gz", whose value is popnei's progress of the
  pass, the bytes of the variants file read over its size, as a whole
  percentage; with no report yet it is drawn busy, as the bar of the
  widgets draws it;
- **Stop**, which ends the write.

The bar is approximate, as the owner accepted on 8 October 2026 (the
design, "The bar of the write"): it counts the bytes of the variants file
read, not of the file written, so its speed varies along the file; for a
`.nei` variants file it stops below full, since popnei does not read the
head of the file again; and after popnei's pass the worker joins the
pieces and checks the file, a moment the bar does not show. The answer
of the write closes the dialog, so the page never draws the bar full,
where the design has the page set it full at the answer: with the
dialog closing at that moment, a full bar would not be seen.
popnei reports every 4 MiB of the variants file read, and at the end, so
a file under 4 MiB, every fixture of the tests, goes from busy to its
end in one report or two.

Escape does nothing while the file is written, so that a key pressed by
habit does not throw away minutes of writing; Stop is reached with the
Tab key. `Dialog.tsx` closes on Escape today, and gains a prop under
which it does not, React Aria's `isKeyboardDismissDisabled` of its
`ModalOverlay`.

**Stop** stops the write, `cancelWrite` of the store, which ends the
worker and starts another (`docs/architecture.md`, section 5), closes
the dialog, and gives the focus back to the button; the status region
says "The writing of low_qual.filtered.vcf.gz was stopped. Nothing was
downloaded." No file is kept, and nothing is downloaded.

### When the write ends

When the write ends with at least one variant, the page, in the code
that awaited `startWriting`, finds the store's write `done` and:

1. hands the file to the browser, `downloadFile(name, file)` of
   `src/ui/download.ts`, a link to the file with the `download`
   attribute clicked by the code, under the name `writtenName` of
   `src/core/fileNames.ts` gives for the format;
2. tells the store, `writeSaved()`, so that the write is `saved`, which
   now keeps the file (`docs/specs/core/store.md`);
3. closes the dialog, draws the text after the download in place of the
   button, and puts the focus on that text, which a screen reader then
   reads. The text is not a control, and takes the focus only from the
   code (`tabIndex={-1}`). React Aria would give the focus back to the
   button, which is gone, and while the dialog closes it keeps the
   modal drawn and the page out of reach, pulling back into the dialog
   any focus put outside it; so the focus is moved once the overlay is
   off the page, when React Aria has finished closing it, and the flows
   check where it lands in both engines.

If the browser's download throws, a defect of ours, `writeSaved` is
not called and the store stays `done` with the file; the defect reaches
the error bar, and the page shows the state `done` as it shows it after
a Cancel of a Save click (below, "The trial that comes first").

The text, on `low_qual.vcf.gz` with the FILTER box ticked, the missing
rate of the variants at 0.05, the MAF at 0.9, and the thresholds of the
individuals at 0.03 for the missing rate and 0.38 for the observed
heterozygosity, a VCF chosen:

> low_qual.filtered.vcf.gz downloaded, 42 KB: 772 variants of 111
> individuals. Variants removed: 300 by their FILTER, 58 by the missing
> rate, 70 by the MAF. Individuals removed: 84 by the missing rate, 5 by
> the observed heterozygosity. Save it again

(popnei 0.2.2 under node, 8 October 2026: 41,972 bytes; the `.nei`
file of the same filters is 113,594 bytes, "114 KB".) Its parts:

- the name, `writtenName`; the size, `sizeText` of
  `src/core/writeEstimate.ts` of `numBytes`; the variants, `numVars` of
  the counts of the pass; the individuals, those of the list kept, or
  every individual of the file when the filters remove none;
- "Variants removed:", for each filter of the variants in the order of
  `VARIANT_FILTER_ORDER`, the variants it was given less those it kept,
  `varsProcessed` less `varsKept` of the counts of the pass; a filter
  that removed none is left out, and the line is left out when none
  removed any;
- "Individuals removed:", for each threshold of the individuals in the
  order of the project, `given` less `kept` of the counts of
  `individualsKept` (`docs/specs/core/individualsKept.md`), which the
  store gives in `individualsKept` of its state; left out the same way.

Each filter is counted over what the filters before it kept, so the
counts add up to the variants of the file less those written, and to
the individuals of the file less those kept (the design, "What the page
says after the download"). The words of each filter are in "Its words",
below.

**Save it again** is a button with the look of a link, the button of
the widgets with `look: "link"` (`src/ui/widgets/Button.tsx`), so that a
screen reader calls it a button, which it is; it calls `downloadFile` again with the file the store
keeps in its state `saved`, under the same name. It is for a download
the browser blocked, or that the user cancelled in the browser's own
question: the page is not told of either (the design, "The download
started by itself"). It makes a new address of the file each time, so it
works after the address of the first download was released, a minute
after it.

The text says "downloaded" and not "saved": the page knows the download
was started, not where the browser put the file.

**The trial that comes first.** Whether a browser downloads a file a
page hands it minutes after the click that asked for it is tried first,
before the rest of the screen is built, in Chromium and WebKit with
Playwright and in Firefox by hand (the design, "The download started by
itself"). If one browser of the floor blocks it or asks every time,
every browser gets a Save click, as the owner decided on 8 October 2026
(the design, "What the owner decided", 12): the dialog does not close at
the end of the write but shows "low_qual.filtered.vcf.gz is written, 42
KB." and a button "Save low_qual.filtered.vcf.gz", which downloads it,
calls `writeSaved()`, closes the dialog and draws the text after the
download, whose first words are then "low_qual.filtered.vcf.gz saved,
42 KB: …". Escape and a Cancel beside Save close it with nothing
downloaded; the store stays `done` and keeps the file, since `startWrite`
does nothing in `done`, so the page shows that state in place of the
button as the text after the download with "written" and a Save in
place of "Save it again": "low_qual.filtered.vcf.gz written, 42 KB: … Save
it", whose Save downloads the file and calls `writeSaved()`. The rest of
this spec is written for the download started by itself.

### The text stays until a filter or the file changes

The text after the download, and the absence of the button, stay
through everything but a change of the project's filters or of its
file, as the owner decided on 8 October 2026: a change of a threshold,
of the FILTER box, or the opening of another file. Then the text goes
and the button is back, in the state the new project gives it: enabled,
or giving way to a sentence. The store does this by itself: the write's
key holds the file, every filter that applies to it and the format
(`docs/specs/core/keys.md`, `writeKeyOf`), so such a change gives the
write another key, the state `saved` is forgotten with its file, and
the state is `ready` (`docs/specs/core/store.md`). The file is then out
of the page's memory; it has been downloaded, so no notice says so, and
the page has no notice (`popgen2-filters.md`, "No notice").

A threshold moved and brought back to where it was, or the box ticked
and unticked, gives the same key again, but the file is gone with the
first change, so the button is back: the store keeps a file only for the
key the project gives at each moment.

### When the filters keep no variant

One sentence, for every cause, as the owner decided on 8 October 2026:
"None of the 1,200 variants of low_qual.vcf.gz pass the filters, so
there is nothing to download." The number is that of the variants of
the file, `numVars` of the one pass. It takes the place of the button in
one of two moments:

- **Before any write, when it is certain**, by `noVariantForCertain` of
  `writeVariants.md`. The dialog does not open, since it could do
  nothing. The sentence stays while the filters give the same answer,
  and goes when a change makes it uncertain or false, and the button is
  back. Examples on `panel.vcf.gz`, whose plots show no variant with an
  observed heterozygosity at or below 0.026 and none with a MAF below
  0.5: the observed heterozygosity of the variants at 0, or the MAF at
  0.45; and a VCF none of whose variants passed its FILTER, with the box
  ticked.
- **After the write, otherwise.** popnei writes a file of no variant
  without refusing, 541 bytes for the VCF of `panel.vcf.gz` with the
  missing rate at 0 and the MAF at 0.6 (popnei 0.2.2 under node, 8
  October 2026), and the store keeps nothing of it, its state
  `noVariant` (`docs/specs/core/store.md`). The dialog closes, nothing
  is downloaded, the sentence takes the place of the button with the
  focus on it, and stays as the text after a download does, until a
  filter or the file changes.

Why some cases are known only after the write. The plots are of every
variant and every individual, one statistic each. Two thresholds that
each keep some variants may keep none together: on `panel.vcf.gz` the
missing rate at 0 keeps 2 variants and the MAF at 0.6 keeps 277 of
the 1,200, and the two together none. And when a threshold of the
individuals leaves some out, a variant's values over the individuals
kept are not those of its plot: on `panel.vcf.gz`, with the missing rate
of the individuals at 0.03, which keeps 116 of 200, the observed
heterozygosity of the variants at 0.02 keeps one variant though its plot
holds none at or below 0.026, and at 0.01 keeps none (popnei 0.2.2
under node, 8 October 2026). So with any individual left out the page
never says it is certain.

When the sentence takes the place of the button before any write,
because the user changed a threshold or the box, the status region says
it once: the button the user might look for is elsewhere on the page,
and a user of a screen reader would not hear it go. Nothing is said when
the button comes back.

### When the write fails

The dialog stays open, and shows, in place of the bar and Stop, the
words of the failure, read out by a screen reader as they appear
(`role="alert"`), and one button, **Close**, which takes the focus.
Close and Escape close the dialog, the button is back, and the focus
goes to it. The words, by failure, are in "Its words", below, from
`writeVariants.md`, "Its words on popgen2.html". A failure of the
worker, and a defect of our own code, are also given to the error bar
of the page once, as the failures of the one pass are
(`src/ui/variants/workerDefects.ts`), so that what the worker said can
be copied and reported.

A Download pressed again after a refusal of popnei under the same
filters and format sends nothing, since the store keeps a refusal for
the session (`docs/specs/core/store.md`, "A failure"); the dialog shows
the refusal's words again at once, with Close. After any other failure,
Download writes again.

## The states

The states of the download, from the one pass's state and the store's
state `write`, the first that holds:

| state | what the user sees | what they can do |
|---|---|---|
| empty | no file open: the sections of the statistics are not drawn, nor the button | open a file |
| locked | the button disabled, with "The download waits for the statistics of the file to be read to the end." while the file is opened, while the one pass runs, and after its Stop; with "The download needs the statistics of the file, which could not be calculated." after a failure; or, in place of the button, the words of `keptNoneReason`, or the sentence of no variant when it is certain | Start again in the box of the file, after a Stop or a crash; change the thresholds |
| ready | the button | open the dialog; choose the format; Download or Cancel |
| running | the dialog with the words of the write, the bar and Stop; the rest of the page out of reach | Stop |
| done | the text after the download, with the focus on it, in place of the button, the store's `saved`; or, after a write of no variant, the sentence of no variant in its place, `noVariant`; or, the store's `done` when the file was not handed to the browser, a defect of the download or a Cancel of a Save click, the same text with "written" and Save | Save it again, or Save; change a filter or open another file, which brings the button back |
| results removed | never on this page: a change that gives the write another key brings the button back with no notice, as the owner decided for every change of a filter on this page on 8 October 2026; a file already downloaded is not lost, and one not yet downloaded cannot meet a change, since the dialog is modal | |
| error | the dialog with the words of the failure and Close | Close; Download again after a failure that is not popnei's refusal |

A change of a filter while a file is written, which on the old page
leaves the write behind, cannot happen here: the dialog keeps the page
out of reach until the write ends, fails or is stopped. Opening another
file by a drop or a paste while the dialog is open cannot happen either:
the drop zone and the paste are on the page, which the modal dialog
takes out of reach (to be confirmed in the flows, below).

## What it sends and reads

It sends:

| what the user does | what is sent |
|---|---|
| Download | `startWriting(store, format)` of `src/ui/runs.ts`, which calls `startWrite(format)` of the store |
| Stop | `cancelWrite()` of the store |
| the end of a write with a file | `downloadFile(name, file)`, then `writeSaved()` of the store |
| Save it again | `downloadFile(name, file)`, with the file of the state `saved` |

It reads: the status of the one pass, `summaryStatus` of
`src/ui/variants/words.ts`, its result when done; the store's `write`,
with its `format`, its progress while it runs, its file, size and counts
when done or saved, its failure; `individualsKept` of the state, for the
individuals and their counts; the project, for `writtenName`,
`filtersApplied` and the variants file's name and individuals; and
`noVariantForCertain` over the project, the one pass's result and the
individuals kept. The format chosen in the dialog is the page's own,
for as long as the page is open, and the one value the screen holds;
everything else is the store's.

`popgen2Store.ts` makes the store with a `write`, `Client.write` and
`writeCountsOf`, and with the one pass as its `statistics`, so that the
store works out the individuals kept from the finished one pass
(`docs/specs/core/store.md`, "The individuals kept"); today it gives
`null` for both.

## Its words

| where | the words |
|---|---|
| the button | "Download filtered variants…" |
| beside it, disabled, while the file is opened, the one pass runs or after its Stop | "The download waits for the statistics of the file to be read to the end." |
| beside it, disabled, after a failure of the opening or of the one pass | "The download needs the statistics of the file, which could not be calculated." |
| in its place, the filters of the individuals keep none | "The filters of individuals keep none of the 200 individuals of panel.nei. Loosen them."; with one individual, "The filters of individuals do not keep the one individual of one.vcf. Loosen them." |
| in its place, no variant kept, before or after the write | "None of the 1,200 variants of low_qual.vcf.gz pass the filters, so there is nothing to download." |
| the heading of the dialog | "Download filtered variants" |
| the group of the format and its two choices | "Format"; "VCF compressed with bgzip (.vcf.gz)"; "popnei's .nei file" |
| the buttons of the dialog | "Download", "Cancel"; while it writes, "Stop"; after a failure, "Close" |
| the line of the write | "Writing low_qual.filtered.vcf.gz · 35% · 0:12"; before popnei's first report, "Writing low_qual.filtered.vcf.gz · 0:12" |
| the name of the bar | "Writing low_qual.filtered.vcf.gz" |
| the status region, after Stop | "The writing of low_qual.filtered.vcf.gz was stopped. Nothing was downloaded." |
| the text after the download | "low_qual.filtered.vcf.gz downloaded, 42 KB: 772 variants of 111 individuals. Variants removed: 300 by their FILTER, 58 by the missing rate, 70 by the MAF. Individuals removed: 84 by the missing rate, 5 by the observed heterozygosity."; one variant or individual in the singular, "1 variant of 1 individual" |
| the words of each filter in it | the variants: "by their FILTER", "by the missing rate", "by the MAF", "by the observed heterozygosity"; the individuals: "by the missing rate", "by the observed heterozygosity" |
| its button, with the look of a link | "Save it again" |
| the store's `done`, a file not handed to the browser | "low_qual.filtered.vcf.gz written, 42 KB: 772 variants of 111 individuals. …", the same lines, and the button "Save it" |
| the failures, in the dialog | as `writeVariants.md`, "Its words on popgen2.html", gives them |

With a Save click, should the trial ask for it: "low_qual.filtered.vcf.gz
is written, 42 KB.", the button "Save low_qual.filtered.vcf.gz", and the
text after it starting "low_qual.filtered.vcf.gz saved, 42 KB: …".

The page has no help drawer yet; what the help of this download would
say, the two formats and the Python call that writes the same file,
`popnei.write_vcf` or `popnei.write_vars` after the same filters, waits
for it.

## Accessibility

The criteria are those of WCAG 2.2, the standard of accessibility the
applications follow at level AA.

**The order of the Tab key** (2.4.3, "Focus order"). On the page, the
button, or the text after the download's "Save it again", comes after
the download of the table of the individuals and before "Open another
variants file…". In the dialog: the group of the format, one stop whose
arrow keys move the choice, then Download, then Cancel; while it writes,
Stop alone; after a failure, Close alone. The Tab key stays inside the
dialog while it is open (React Aria).

**Where the focus goes.** The dialog takes it when it opens, on the
format chosen. At Download the format and its buttons go, so the focus
is put on Stop, which would otherwise be on nothing. When the dialog
closes: after Cancel, Escape, Stop or Close, on the button, which React
Aria does; after a download, on the text after it; after a write of no
variant, on the sentence of no variant; these two are moved by the page
once the overlay is off the page (above, "When the write ends").

**What is said without moving the focus** (4.1.3, "Status messages").
The Stop of a write, in the status region. The sentence of no variant
when it takes the place of the button before any write, once. The bar is
not a live region: its value is read when the user reaches it, so a
screen reader is not made to read a percentage every few seconds. A
failure in the dialog is read as it appears.

**A disabled button with its reason** (the writing-specs skill, "The
states"). The button disabled while the one pass is not finished cannot
be reached with the Tab key; its reason is a line of text beside it,
which a screen reader reads in the order of the page, so a user of the
keyboard learns why the download is not offered.

**Not yet heard in VoiceOver.** The design asks that VoiceOver on macOS
with Safari be heard before the plan is settled, which cannot be done
before the screen exists, and the session cannot run VoiceOver. What is
to be heard: the dialog announced with its heading as it opens, the
group of the format and its choice, Stop announced as the focus moves
to it, the text after the download read as the focus lands on it, and
the words of a failure read as they appear.

## How it is checked

**In Vitest**, in node: the words of the text after the download from
the counts of a pass and of `individualsKept`, each filter left out
when it removed none, each line left out when no filter of its kind
removed any, the singular; the choice of what takes the place of the
button in each state of the table above, from a store made with a fake
worker; that the end of a write with a file calls `downloadFile` once
and then `writeSaved`, and that a write of no variant calls neither;
that Save it again calls `downloadFile` with the file of the state
`saved`; that Escape does not close the dialog while it writes, at the
prop of `Dialog.tsx`; and the functions of core of `writeVariants.md`.

**In Playwright, on the built site, in Chromium and WebKit**, the
`--project=chromium --project=webkit` of the flows, on the fixtures
`low_qual.vcf.gz`, `panel.vcf.gz`, `panel.nei`, and a VCF the flow makes
of `panel.vcf.gz` with `LowQual` in place of `PASS` in every FILTER
column, as the old page's flow of the write does:

- `low_qual.vcf.gz` as it opens, the FILTER box ticked and the missing
  rate of the variants at 0.1, downloaded as a VCF: the browser's
  download event comes with no click after Download, under the name
  `low_qual.filtered.vcf.gz`, 75,577 bytes, which popnei in node reads
  back with 900 variants and 200 individuals; the text says
  "low_qual.filtered.vcf.gz downloaded, 76 KB: 900 variants of 200
  individuals. Variants removed: 300 by their FILTER." and has the
  focus, read from `document.activeElement` once the dialog is gone, and
  so the sentence of no variant after a write;
- a run of the arrow keys on a threshold, then Enter on the button
  within its quiet second: the write has the threshold the run moved to;
- the same file with the thresholds of the example above, as a `.nei`
  file: `low_qual.filtered.nei`, 113,594 bytes, 772 variants and 111
  individuals read back by popnei, and the text of the example with
  "114 KB"; as a VCF, 41,972 bytes;
- `panel.nei` as it opens, as a `.nei` file: `panel.filtered.nei`,
  261,570 bytes, and the text "panel.filtered.nei downloaded, 262 KB:
  1,200 variants of 200 individuals.", with no line of what was removed;
- Save it again gives a second download event of the same name and the
  same bytes;
- the text stays after a click elsewhere on the page and after Escape,
  and goes, with the button back, at a change of a threshold, a click on
  the FILTER box, and the opening of another file;
- the button is disabled with "The download waits …" while the one pass
  runs, held by `e2e/holdWorker.ts`, and after its Stop, and is enabled
  at Start again's end;
- Stop during a write of a VCF of 200,000 variants made by
  `e2e/bigVcf.ts` gives no download event, closes the dialog, puts the
  focus on the button, and the status region says the words of a Stop;
  Escape while it writes leaves the dialog open;
- the sentence of no variant before any write, with no dialog and no
  request of a write sent to the worker: on `panel.vcf.gz` with the
  observed heterozygosity of the variants at 0, and with the MAF at
  0.45; on the VCF with `LowQual` in every FILTER column, with the box
  ticked; and the button, not the sentence, with the missing rate at 0,
  which keeps 2 variants;
- the sentence after the write, with no download event: on
  `panel.vcf.gz` with the missing rate at 0 and the MAF at 0.6; and with
  the missing rate of the individuals at 0.03 and the observed
  heterozygosity of the variants at 0.01; and a file of one variant, not
  the sentence, at 0.02;
- the missing rate of the individuals at 0.01, which keeps none of the
  200, gives the words of `keptNoneReason` in place of the button;
- a crash of the worker during a write, `e2e/crashWorker.ts`, gives the
  words of a failure of the worker in the dialog, with Close, and
  Download writes again;
- while the dialog is open, a file dropped on the page or pasted opens
  nothing;
- the dialog, the button with its reason, and the text after the
  download, checked with axe (`e2e/axe.ts`), in light and in dark.

**The screens**, with `--project=screens`: the button disabled with its
reason; the dialog with the format; the dialog writing, with the bar at
a share; the text after the download; the sentence of no variant; the
dialog with a failure; light and dark; 1280 and 320 pixels wide.

**By hand**, in the plan: the download started by itself in Firefox, and
in each browser the first and the second download of a session, with
the browser asking where to save and not, and in Chrome a site whose
automatic downloads are set to Block (the design, "The download started
by itself"), first of all; the measurements of the design on the built
site, the largest file written and saved in Chromium and WebKit, with
the memory of each process, and a file of 2 GB in Firefox
(`writeVariants.md`, "What is measured in the plan"); and VoiceOver, as
above.

## Choices made by the session

The design left these open; the spec decides them, and each can be
changed without changing anything else:

- The VCF is the format chosen when the dialog first opens, and the
  dialog then opens on the last format chosen, while the page is open.
- Stop closes the dialog and gives the focus back to the button, rather
  than returning to the choice of the format.
- A failure keeps the dialog open with its words and Close; a failure of
  the worker and a defect also reach the error bar.
- The sentence of no variant that comes before any write is said once in
  the status region.
- The page does not draw the bar full at the end, since the dialog
  closes at the answer; the design had it set full then.
- The labels of the two formats, and no line of description under them,
  as the owner asked for a dialog of the format and its buttons alone.

## Left for the running application

Where the line of a disabled button's reason sits, beside or under it;
the spacing of the text after the download; the width of the dialog and
of its bar; whether the text after the download is set apart from the
plots by a rule or a box.

## Open points

None. The owner answered the two of the design on 8 October 2026 (the
design, "What the owner decided", 12).

## Not in this spec

- The request of the write, its file name, the check of a filtering
  that keeps no variant for certain, the words of the failures, the
  pieces and the `Blob`, the size and its limits:
  `docs/specs/analyses/writeVariants.md`.
- How the store tracks the write and keeps its file:
  `docs/specs/core/store.md`.
- A link to the other format after a download: not built, as the owner
  decided on 8 October 2026; a user who wants both opens the file
  downloaded and downloads it again in the other format.
- The write of the old page, `popgen.html`, its estimate, its warning
  and its limit of size, which stay: `writeVariants.md`.
- The saving of the project on `popgen2.html`, and the help drawer.
