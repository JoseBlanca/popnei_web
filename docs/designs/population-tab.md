# The Populations tab of popgen2.html: several analyses that calculate again by themselves

A design of 11 October 2026, approved by the owner the same day with
the recommendations of its two open points: Stop in a tab stops that
analysis and the band adds "Stop all" (1a), and the column of the
populations and the individuals file are greyed while the diversity
runs (2a).
It decides how `popgen2.html` runs several analyses that each calculate
again by themselves after a change, with the one calculation worker it
has: the PCA, which does so since 10 October 2026, and the diversity of
each population with its site frequency spectrum, which the Populations
tab brings; later the LD decay in the same tab and the distances
between populations in the Distances tab. It is the design of the first
of the three pieces of use case 4 of `docs/use-cases.md`, which the
owner chose on 11 October 2026, and it settles what the second and the
third build on. It extends `docs/designs/no-undo.md`, which made the PCA
calculate again by itself, and keeps its choices. It touches sections
3, 5, 7 and 9 of `docs/architecture.md` without changing any of the six
rules the rest of the code relies on, and the specs listed in the last
section.

## The design in short, for the owner

Approving the design means approving its recommended choices, 1 to 9
below, as a whole, and answering its two open points, at the end; any
choice may also be changed. In short:

- Each analysis is live on its own: the Run of its tab makes it live,
  and from then on it calculates again by itself after a change of what
  it reads, until its Stop. An analysis whose Run was never pressed
  never runs.
- After a change that several live analyses read, a threshold for
  instance, they run one after the other, a quiet second after the last
  change, in the order of the tabs: the PCA, then the diversity, later
  the LD decay, then the distances. Each tab whose analysis waits says
  which analysis runs before it.
- While an analysis runs, what it reads is greyed, as for the PCA
  today. The diversity reads more than the PCA: also the column of the
  populations and the individuals file, which are greyed only while the
  diversity runs.
- Stop in a tab stops that analysis and ends its live state, as now; the
  others wait a quiet second, so that a filter changed at once after the
  Stop is the one they calculate with. The band at the top of the page
  gains "Stop all", which ends every live state at once.
- The diversity and its spectrum come from one request of popnei, so
  the Populations tab has one Run for both.
- The download of the filtered variants waits for every calculation
  under way, as it waits for the PCA today, and its words name the one
  that runs.
- The code that starts the PCA by itself already keeps one live state
  per analysis, but six places assume the PCA is the only one; the last
  section names them.
- Two open points are left for the owner, at the end.

## The words used below

- **The project** is the one value that holds what the user has chosen:
  the variants file, its filters, the individuals file and its column of
  the populations, the options of each analysis (`docs/architecture.md`,
  section 2).
- **A key** is a hash of everything a result is calculated from, made
  from the project (section 3). A result is shown only under the key the
  current project gives its analysis, so a result is never shown for
  values other than those on the screen. A change of a threshold gives
  the PCA and the diversity new keys; a change of the column of the
  populations gives the diversity a new key and the PCA none.
- **The calculation worker** is the second thread of the browser tab, a
  web worker, where popnei runs, so that the page does not freeze. It
  runs one calculation at a time. A calculation inside it cannot be told
  to stop: a Stop ends the worker and starts a new one, which opens the
  variants file again (section 5).
- **The one pass** is the reading of the whole variants file that the
  page starts by itself when the file is opened, which gives its
  statistics and histograms. Every other calculation waits for its end.
- **Live**: an analysis is live for the open variants file once the user
  has pressed its Run for that file. From then on a change of what its
  key holds starts it again by itself. Its Stop, another variants file,
  a reload or a crash for lack of memory end the live state
  (`docs/designs/no-undo.md`, choice 3).
- **The quiet second** is the second the page waits after the last
  change, or after the end of a change still under way, a slider held or
  a number typed and not yet confirmed, before it starts a live
  analysis again.
- **The lock**: while an analysis runs, the controls of what it reads are
  greyed, with a sentence that says how to stop it. A change therefore
  never meets a running calculation, and nothing but the user's Stop
  ends the worker (`docs/designs/no-undo.md`, "Why a change does not
  stop a run").
- **Waiting**, new here: a live analysis whose values are settled, whose
  quiet second has run out, and which does not run because another
  calculation runs or goes before it.
- **The band** is the line at the top of `popgen2.html` that says what
  the page is doing, with the Stop of what runs
  (`docs/specs/steps/popgen2-band.md`). **The status region** is the
  part of the page that a screen reader reads aloud without moving the
  focus.

## The problem, and what forces it

The user of use case 4 opens a variants file and an individuals file,
looks at the number of individuals of each population, and computes
the diversity of each population, its spectrum, its LD decay and the
distances between the populations (`docs/use-cases.md`, case 4). They
move a filter and look again, as in the case of the PCA. The owner
decided on 11 October 2026 that the population analyses run as the PCA
does: after the first Run, each is calculated again by itself after
each change, with the quiet second, the lock while it runs, and Stop
ending its automatic runs.

The analyses exist, built for `popgen.html` in stage 5, with their
numbers verified in popnei; what is new is that several of them are
live at once on one page, and the page was built for one. Four facts
force a design:

1. **One calculation at a time.** The calculation worker runs one
   request at a time, and the store, the part of the page that keeps the
   project and the results, has no state for a request that waits
   behind another: two sent at once both show as running, one with a bar
   that does not move (`src/ui/autoRuns.ts`, lines 13 to 15). So after a
   change that two live analyses read, the page has to choose which goes
   first, and the second has to be shown as waiting.
2. **The diversity reads more than the PCA.** Its key holds the
   populations, from the individuals file and its column
   (`keyInputs` of `src/core/analyses/diversity.ts`, lines 411 to 425),
   which only colour the points of the PCA. Today the lock leaves the
   column and the individuals file open, as the owner decided on 10
   October 2026 for the PCA (open point 3 of `docs/designs/no-undo.md`).
   Left open while the diversity runs, a change of them would leave the
   running diversity behind, and the page stops what a change leaves
   behind (`stopLeftBehind`, `src/ui/popgen2Store.ts`, line 144): a stop
   of the worker that no Stop of the user asked for.
3. **A Stop that frees the filters for one moment.** The lock tells the
   user to stop the running analysis to change the filters. With a
   second live analysis waiting, that Stop frees the worker, the second
   starts, and the filters are greyed again before the user reaches
   them.
4. **The page assumes one live analysis in six places**, read in the
   code of 11 October 2026: an analysis whose Run was never pressed, or
   that failed, keeps every later one from starting by itself (choice 1
   below); a Run pressed while another analysis runs sends its request
   into the queue (choice 3); the lock, the download and the band name
   the PCA alone; the status region speaks only of the PCA. The section
   "For the session that builds it" gives each with its file and line.

## The time and the memory of a diversity, measured

Three choices below turn on how long a diversity runs and how much
memory it leaves, which were measured for this design on 11 October
2026. They were measured on the Diversity panel of the old page,
`popgen.html`, which makes the same calls of popnei as the Populations
tab will: `calcPerVarDistribs` and then `calcPopDiversity`, with the
spectrum in the same Run. The machine was the owner's Apple M5 Pro with
64 GB, macOS 27.0.1, with Playwright 1.63.0 driving Chromium
153.0.8010.12 and WebKit 26.6 on the built site, at load averages of 1.8
to 6.4. The memory is the sum of the memory of the engine's processes,
read every 250 ms. The time runs from the request sent to the
calculation worker to its answer. Each file had three populations, of
334, 333 and 333 individuals out of 1,000, or of 3,127 each out of
9,381. Each value is the median of two or three runs.

The totals below are to be read against the most a tab of this page is
known to have held and survived: 4.33 GB in WebKit, a PCoA of 9,381
individuals on `popgen2.html` (`docs/architecture.md`, section 11,
measured on 10 October 2026 on the same Mac). WebKit has closed no tab
of this page; what it does above that is not known.

The table gives, in each cell, the time of a Run, and then the memory
of the engine before the Run, at its peak and 3 s after its end, in GB.

| file | Chromium: time; GB before, peak, 3 s after | WebKit: time; GB before, peak, 3 s after |
|---|---|---|
| gzipped VCF, 300 variants of 9,381 individuals | 0.10 s; 0.18, 0.24, 0.24 | 0.10 s; 0.25, 0.47, 0.25 |
| `.nei`, 19,161,818 bytes, 20,000 variants of 1,000 | 0.27 s; 0.17, 0.25, 0.25 | 0.27 s; 0.26, 0.58, 0.36 |
| VCF, 80,692,954 bytes, 1,000 individuals | 0.50 s; 0.17, 0.32, 0.25 | 0.55 s; 0.25, 0.80, 0.51 |
| VCF, 403 MB, 100,000 variants of 1,000 | 2.4 s; 0.17, 0.70, 0.43 | 2.5 s; 0.25, 0.96, 0.72 |
| gzipped VCF, 128 MB, 200,000 variants of 1,000 | not measured | 5.8 s; 0.26, 0.80, 0.51 |
| gzipped VCF, 510 MB, 800,000 variants of 1,000, made for this measurement | 23.8 s; 0.17, 0.73, 0.38 | 23.1 s; 0.27, 0.80, 0.50 |

In WebKit about 0.2 GB of each peak is the process that draws the page
on the graphics card, drawing the result, and it is gone within 3 s. The
runs of 0.10 s were read only once or twice, so their peaks may be
higher than the table says.

**A Stop in the middle of a diversity**, on the file of 800,000
variants, stopped at 11.5 s and followed for 60 s: in WebKit the memory
was 0.26 GB before, 0.81 at the peak, 0.69 at the Stop and 0.44 GB 60 s
after, and never came back to its level before, the page's own process
keeping 0.35 GB against 0.13 before; so a stopped diversity leaves about
0.2 GB in WebKit. In Chromium it was 0.17, 0.50 and 0.39 GB, and back
to 0.14 GB 2.2 s after the Stop. The new worker was ready to calculate
0.07 s after the Stop in WebKit and 0.04 s in Chromium.

**A diversity a second after a Stop of a PCA**, in WebKit on the VCF of
300 variants of 9,381 individuals: the old page's PCA stopped at 10 s,
then a diversity 1 s later. The tab held, and the table came in 0.10 s;
the memory was 2.30 GB at the Stop, 2.41 GB at the diversity's peak and
2.19 GB 11 s later. The old page's PCA, with its own options, reached
2.3 GB, not the 3.7 to 4.2 GB of the PCA of `popgen2.html`, so a
diversity started after a Stop of that larger PCA is not measured; it
is measured in the plan's first work package, once the diversity is on
`popgen2.html`.

## The options and the choices

### 1. The order after a change

A change of a threshold gives every live analysis that reads the
filters a new key. Whatever the order, they run one after the other,
and the last ends after the sum of their times. The times differ by
up to three orders of magnitude: a diversity took 0.10 s to 23.8 s on
the files measured above, in Chromium 153 and WebKit 26.6, the engine
of Safari; a PCA of 9,381 individuals on `popgen2.html` took 226 s in
Chromium 153 and 134 s in WebKit 26.6, up to 4 minutes, on the owner's
Apple M5 Pro on 10 October 2026 (`docs/architecture.md`, section 11).

Only a change of what several analyses read needs an order, and on this
page that is a change of the filters: a threshold or the FILTER box,
which are in the Variants tab. An option of the diversity, or the column
of the populations, gives the diversity alone a new key; an option of
the PCA gives the PCA alone one.

**(a) A fixed order, the order of the tabs**: the PCA, the diversity,
the LD decay after it in the same tab, then the distances. The user can
tell in advance which comes first. A user with the PCA of 9,381
individuals live waits up to 4 minutes (226 s in Chromium, above) after a change of a threshold for
a diversity of a quarter of a second on a smaller file.

**(b) The tab shown first, then the order of the tabs.** Since the
filters are changed with the Variants tab shown, this gives the same
order as (a) after almost every change. It differs only when the user
turns to another tab within the quiet second, or while one analysis runs
and two others wait. It costs about 20 lines more: the code that starts
the analyses reads the tab shown, and the order changes with it.

**(c) The analyses of the other tabs calculated only when their tab is
shown.** Less work and a shorter lock when the user looks at one tab,
but a user who moves a threshold in the Variants tab finds every
analysis still to calculate when they turn to it, unlike the PCA today,
which the owner asked these analyses to follow.

**Recommended: (a).** It is simpler and predictable, and (b) differs
from it only in cases a user rarely makes. (b) would win if users often
turned to an analysis's tab during the quiet second to see it first; (c)
if users of large files complained of waiting for analyses they did not
look at.

### 2. What the lock covers

The lock stays, as the owner decided. The question is what it greys.

**(a) What the running analysis reads.** While the PCA runs: the
thresholds and the FILTER box of the Variants tab and the options of the
PCA, as now. While the diversity runs: the same thresholds and FILTER
box, the options of the diversity, the column of the populations, and
the opening of another individuals file, by its button, by a paste and
by a drop. So no change the screen allows leaves a running calculation
behind. Cost: the box of the individuals file gains a greyed state it
does not have (the zone of a file, `src/ui/widgets/FileZone.tsx`, takes
no such option today), and a file dropped on it then is refused with the
lock's sentence.

**(b) The same controls for every analysis**, the column and the
individuals file greyed also while the PCA runs. One rule, but the
column the owner left open during a PCA, which only colours its points,
would be greyed for up to 4 minutes.

**(c) The column and the individuals file never greyed**: a change of
them while the diversity runs stops it and starts it again on the new
populations after the quiet second. It costs a stop of the worker that
the user did not press. For the PCA that was refused because, in WebKit,
a worker ended in the middle of a PCA of 9,381 individuals keeps its 3
to 4 GB in the tab for 40 s and more (`docs/designs/no-undo.md`). A
worker ended in the middle of a diversity leaves about 0.2 GB in WebKit,
on the largest file measured, and the new worker is ready in 0.07 s
(above). This design would have set (c) aside had a stopped diversity
kept more than 1 GB in WebKit; at about 0.2 GB, a stop at each change
of the populations during a run would cost little memory.

Under (a) the column and the individuals file are greyed for as long as
the diversity runs: half a second on the VCF of 80 MB, 2.5 s on the VCF
of 403 MB, and 23 s on the largest file made, 800,000 variants of 1,000
individuals.

**Recommended: (a).** It keeps the owner's rule that only the user's
Stop stops a calculation, and leaves the column open during a PCA. (c)
is what the owner may prefer, now that its cost in memory is known to be
small: the column and the file always open, at the cost of a stop of
the worker the user did not press at each change of them during a run.

### 3. A Run pressed while another analysis runs

**(a) Run makes the analysis live and waiting.** Its tab says which
analysis runs before it, and it starts when the worker is free, in the
order of choice 1. Its filters are not greyed by it while it waits, so a
change gives it new values and puts its start off.

**(b) Run greyed while another analysis runs**, with the reason, as Run
is greyed during the one pass today ("Run once panel.nei is read to the
end", `src/ui/analyses/pca/passLock.ts`, lines 72 to 86). The user comes
back later to press it, for up to 4 minutes behind a PCA.

**Recommended: (a).** It costs nothing more than the waiting state the
analyses started by themselves need anyway. The Run during the one pass
stays greyed, as now: the one pass is not a live analysis, and its Stop
and Start again are the box's.

### 4. The live state: one per analysis, or one for the page

**(a) One per analysis**, as the code already keeps it (`liveFor` and
`pausedFor` of `src/ui/autoRuns.ts`, lines 415 to 417). A user who wants
the diversity calculated again does not get a PCA of minutes they never
asked for.

**(b) One for the page**: the first Run makes every analysis that can
run live. One switch, but a Run of the diversity would start a PCA of
9,381 individuals, 3 GB and 4 minutes, in a tab the user may never open.

**Recommended: (a).**

### 5. What Stop stops

Today Stop, in the PCA tab or in the band, stops the PCA and ends its
live state, the owner's choice of 10 October 2026, and "Stop
recalculating" in the tab ends the live state when nothing runs.

**(a) Stop in a tab stops that analysis alone and ends its live state;
the analyses waiting start a quiet second after the Stop, as after a
change; and the band offers "Stop all", which stops the one running and
ends the live state of every analysis.** The user who stopped to change
a filter has the second to start changing it, and each change puts the
others off again, so they calculate with the new value. A user who
needs longer, with a screen reader or a switch, presses "Stop all", and
then Run in each tab they want back. That is what WCAG 2.2, success
criterion 2.2.1, Timing Adjustable, requires of a page that acts after a
time: that the user can turn the time limit off, extend it or adjust it. Cost: a second button in the band while more than
one analysis is live, and the lock's sentence names it then. The second
after a Stop does not come by itself: the code that starts the analyses
counts the quiet second only from a change of the project or of a
change under way, and a Stop is neither, so without more the waiting
analysis would start at once, as in (c). Under (a) a Stop starts the
quiet second again, as a change does (point 7 of "For the session that
builds it").

**(b) Every Stop ends the live state of every analysis.** One press
frees the filters for good; the user presses Run again in every tab
they want back, which shows the result kept, with no calculation, when
its values did not change.

**(c) Stop stops that analysis, and the waiting ones start as soon as
the new worker has opened the file.** The filters are greyed again
before the user reaches them, the failure of point 3 of the problem.

**Recommended: (a)**, which keeps Stop meaning what it means today for
one analysis, and adds one control for the case only several live
analyses make. (b) would win if users of the page kept one analysis live
at a time, when it is the same as (a) with one fewer button.

In WebKit a Stop of a large PCA leaves 3.7 to 4.2 GB in the tab for 40 s
and more; under (a) the diversity waiting grows beside that memory a
second after the Stop. Its peak was at most 0.96 GB of the whole
engine, about 0.7 GB above the engine before the Run, on the files
measured above. A diversity a second after a Stop of the old page's PCA,
at 2.30 GB, raised the tab to 2.41 GB and the tab held. So no hold after
a Stop is added for now. The case of a Stop of the larger PCA of
`popgen2.html` is not measured; "How it will be tested" gives the
result that would call for a hold.

### 6. What the band shows with several analyses

The band says one thing, the first that holds of its list
(`docs/specs/steps/popgen2-band.md`, "The line"). With choices 1 and 5:

- while one runs and others wait: "PCA running · 1:20 · then the
  diversity", with "Stop all" after it; with nothing waiting, "Stop", as
  now. Corrected on 11 October 2026, after the approval, by the session
  that wrote the specs, to follow choice 5 and the owner's answer 1a:
  "Stop all" shows whenever two or more analyses are live and one of
  them runs, waits or is about to start, also with nothing waiting,
  since a Stop of the one running then lets the other start a second
  after the next change; while nothing runs, waits or is about to
  start, the band shows "Popnei" alone, the owner's rule of 10 October
  2026;
- while several are about to start: "The PCA and the diversity start
  again in a moment", with "Stop all";
- the link to the warnings or the error of a result, in another tab:
  that of the first analysis in the order of the tabs that has one.

The band keeps "Stop all" while the tab of the running analysis is
shown, since its words differ from the tab's Stop; it drops the plain
"Stop" there, as now. The exact words are the spec's.

### 7. The diversity and its spectrum: one Run or two

popnei 0.2.2 gives the spectrum as one of the five statistics of
`calcPopDiversity` (`node_modules/popnei/dist/diversity.d.ts`, lines 33
and 225), and the heterozygosities of the diversity table from a second
call, `calcPerVarDistribs`, each a pass over the file
(`runDiversity` of `src/worker/runner.ts`, lines 903 to 950), until
popnei issue #4, which asks for the heterozygosities in the same call,
makes the two passes one. popnei's `calcVariantsSummary`, which
makes the one pass, joins three statistics in one pass but not
`calcPopDiversity` (`stats.d.ts`, lines 491 to 519), so the diversity
cannot ride on the one pass either.

**(a) One analysis and one Run for the table and the spectrum**, as on
`popgen.html`: two passes, one bar, and the spectrum drawn from the same
result (`src/core/analyses/sfs.ts`, lines 1 to 11).

**(b) Two analyses with a Run each.** A spectrum alone is a third pass
over the file, and the two are calculated again after each change, one
after the other: on a VCF of several gigabytes, a pass of minutes more
for every change.

**Recommended: (a).** While another analysis runs, the Populations tab
shows its options, open, and the line of waiting in the place of the
bar, and no result, since none is kept for values left behind.

### 8. A change of the populations

The diversity's key holds the populations, so:

- a new column of the populations gives a new key, and a live diversity
  is calculated again a quiet second later;
- an individuals file being read locks the diversity, with its reason
  in the tab; the result it had is kept, not shown, and if the new file
  gives the same populations it is shown again with no calculation, as
  a lock does on this page (`docs/architecture.md`, section 3, "No
  result kept for values left behind"); with other populations it is
  calculated again a quiet second after the read ends;
- "None" chosen in the list of the column, or a column that gives no
  individual of the variants file a population, gives the one
  population, "Unclassified", of every individual kept, and the
  diversity is calculated again for it a quiet second later. Corrected
  on 11 October 2026, after the approval, by the session that wrote the
  specs: this bullet said that no column chosen locks the diversity
  until one is chosen, against the owner's answer 3 of 9 October 2026
  (`docs/designs/input-page.md`, "The unclassified in the analyses per
  population"), that the unclassified are one population whenever no
  individual is classified; the earlier answer prevails, and the plan
  `docs/plans/population-tab.md` reports the correction to the owner.

None of these ends the live state, and none of them reaches a running
diversity under choice 2 (a); the page does it with the keys and locks
it already has, and nothing is added for it. The one alternative, ending the live
state at a new individuals file as a new variants file ends it, would
make the user press Run again after correcting a typo in the file; it is
not recommended.

### 9. The download of the filtered variants

The write of the file is a request of the calculation worker too, and
sent while another runs it would wait in the queue shown as running.

**(a) It waits for the calculation running, as for the PCA today**, its
words naming it: "Waits for the diversity to end; or stop it in the
Populations tab." With analyses waiting, it waits for them too, since
each starts when the one before ends. A download pressed during the
quiet second goes first, as now, and every live analysis starts a
second after its dialog closes.

**(b) The download stops what runs**, the option the owner set aside for
the PCA on 10 October 2026 (open point 2 of `docs/designs/no-undo.md`).

**Recommended: (a)**, the owner's choice for the PCA, extended.

## What stays true of the architecture

The six rules the rest of the code relies on
(`.claude/skills/designing/SKILL.md`) all hold, and no interface between
the layers changes:

1. **A result is never shown stale.** Each tab shows the result under
   the key the project gives its analysis now; a waiting analysis shows
   none.
2. **The layers import as they do.** The order, the waiting and Stop all
   are in `src/ui`, in the code that already starts the PCA by itself;
   the diversity of `popgen2.html` is a definition in `src/core`, beside
   the old page's, as the PCA has one of each.
3. **The project is one plain, immutable value.** The live states stay
   outside it, as for the PCA (`docs/designs/no-undo.md`, choice 3).
4. **`src/core` has no DOM and no React.**
5. **One request at a time in each worker.** The page starts one
   analysis at a time, and a Run during another's run only makes its
   analysis live (choice 3).
6. **A cancel ends the worker and starts another**, no more often than
   today: at the user's Stop, at Stop all, and at another variants file.
   Choice 2 (a) is what keeps a change of the populations from adding a
   stop.

Sections 3, 5, 7 and 9 of `docs/architecture.md` describe the PCA as the
one analysis that starts again by itself; once this design is approved
they gain a paragraph "What was revised" that names the live analyses
and points here.

## What is hard to undo

`popgen2.html` saves no project file, and the diversity of this page is
a new definition with keys of its own, so no saved file or cached
result depends on this design. What users will learn is that every
analysis they ran is calculated again after a change, in the order of
choice 1, and that Stop all ends it everywhere.

## The costs of the web

- **Memory of a tab.** Live analyses run one after the other, never
  together, so the memory at any moment is that of one analysis and the
  one pass's result. The calculation worker is started again after a PCA
  of more than 700 individuals and after every LD decay
  (`PCA_RESTART_INDIVIDUALS` of `src/worker/client.ts`, line 87;
  `docs/architecture.md`, section 13, point 16), and a worker ended after
  its result gave a PCA's memory back within 3 s in both engines
  (`docs/specs/steps/popgen2-pca.md`, "Stop"). So the next analysis grows
  beside at most 3 s of the previous one's memory. The worker is not
  started again after a diversity, and needs no restart: the engine
  peaked under 1 GB in every case measured above, and 3 s after a
  diversity of the VCF of 403 MB it held 0.72 GB in WebKit, 0.47 GB
  above its level before the Run, under which a PCA of 9,381
  individuals, 3.0 to 3.4 GB of its own, would run. The exception is a
  Stop in WebKit, whose 3.7 to 4.2 GB after a PCA stay 40 s and more,
  beside which a waiting analysis starts a second later (choice 5). A
  stopped diversity leaves about 0.2 GB in WebKit. The results kept are
  the one pass's, at most one PCA, 0.90 MB at 9,381 individuals, and one
  diversity of a few hundred bytes.
- **The page frozen.** The table of the diversity has one row per
  population and the spectrum one plot per population, both drawn as on
  `popgen.html`; nothing new on the page's own thread grows with the
  variants. The key of the diversity walks the table of the individuals
  file at each change of the column, up to 10,000 rows, a time not
  measured (`docs/specs/analyses/diversity.md`, "How it runs"), and kept
  by a memo across changes of a threshold.
- **Download size.** The Populations tab's code, its table, its plots and
  its menus, is downloaded when the tab is first shown, as the PCA tab's
  is. Its size is measured in the plan's first work package.
- **The browsers.** Nothing here needs a browser above the floor of the
  applications, Chrome 111, Firefox 115 and Safari 16.4.
- **What GitHub Pages does not allow.** Nothing new is asked of it.
- **Accessibility.** Each start by itself is said in the status region
  today, "Calculating the PCA again. To change the filters, stop it in
  the PCA tab."; three live analyses would say three such sentences
  after one change. The status region says the first start after a
  change, naming every analysis that will run ("Calculating the PCA and
  the diversity again."), and each end as now. Stop all is reached by the
  keyboard in the band, which is the first stop of the Tab key on the
  page, so the automatic runs of every analysis can be ended from any
  tab, as WCAG 2.2.1 requires: the user can turn off the time after
  which the page acts. A greyed column or file zone says why when it has
  the focus, as the greyed filters do.
- **What is lost when a worker restarts.** As now: a Stop loses the
  running analysis's time so far, and the new worker opens the variants
  file again, in at most 49 ms on a `.nei` file of 19 MB and its VCF
  (`docs/architecture.md`, section 13, point 5).

## How it will be tested, and what would prove it wrong

- **Without a browser**, on the real store of the page: with the PCA
  never run, a live diversity starts by itself after a change; with
  both live, a change of a threshold starts the PCA first and the
  diversity after it, whatever tab is shown, and a change of the column
  starts the diversity alone; a Run while the PCA runs sends nothing
  until it ends; a Stop of the running one starts the waiting one a
  quiet second later, not at once, and a change within that second puts
  it off; after a Stop of the PCA, which leaves it not live and ready,
  a live diversity still starts by itself after a change; Stop all ends
  every live state; the lock greys the column and the individuals file
  while the diversity runs and not while the PCA runs; the download
  waits while either runs; a failure of the PCA, popnei's refusal among
  them, does not keep the diversity from starting.
- **In Chromium and WebKit**, by the plan's browser checks, the states
  of the Populations tab: before Run, running, waiting behind the PCA,
  about to start, with its result, locked, failed, stopped; the band
  with two analyses; the order after a change made in each tab.
- **Measurements.** The time and the memory of a diversity, and of a
  Stop in its middle, are measured, above. Two remain for the plan's
  first work package: a diversity started a second after a Stop of the
  PCA of `popgen2.html` of 9,381 individuals, in WebKit; and the gzipped
  size of the Populations tab's code.

**What would send each choice back**, with what the measurements above
show for each.

- **Choices 1 (a) and 2 (a).** A diversity of the largest file that
  takes more than about a minute would grey the column of the
  populations and the individuals file that long whenever the diversity
  runs, and keep the filters greyed for the PCA and then the diversity
  after each change of a threshold. The longest measured took 23.8 s in
  Chromium and 23.1 s in WebKit, on 800,000 variants of 1,000
  individuals, a gzipped VCF of 510 MB. A file several times longer, or
  with many more individuals, could pass the minute; then 2 (c) and 1
  (c) would be weighed again with the owner.
- **Choice 5 (a).** The diversity waiting starts 1 s after a Stop, and
  after a Stop of a large PCA of `popgen2.html` WebKit still holds the
  stopped PCA's 3.7 to 4.2 GB for 40 s and more. The most a tab of this
  page is known to have held and survived is 4.33 GB, WebKit's PCoA of
  9,381 individuals (`docs/architecture.md`, section 11). A diversity
  peaks at up to 0.7 GB above the engine before it, on the files
  measured, which on top of 3.7 to 4.2 GB passes 4.33 GB. So if the
  measurement of the plan's first work package finds the tab closed, or
  the engine above 4.33 GB, a diversity a second after a Stop of the PCA
  of 9,381 individuals calls for a hold after a Stop of a large PCA: the
  waiting analyses not started until WebKit has given that memory back,
  or until the user's next change after it.
- **The worker after a diversity.** The calculation worker is not
  started again after a diversity, only after a large write, a PCA of
  more than 700 individuals and every LD decay
  (`src/worker/client.ts`, lines 9 to 16), and the memory of wasm never
  shrinks. A diversity of the VCF of 403 MB left WebKit's engine at 0.72
  GB 3 s after its end, 0.47 GB above its level before; a diversity that
  left more than about 1 GB under a PCA of 9,381 individuals, 3.0 to 3.4
  GB of its own, would call for a restart after a diversity, as after
  an LD decay.
- **The wait after each change.** The owner, trying the page with the
  PCA and the diversity live on a large file, finding the wait after
  each change too long, which would call for 1 (c).

## Open points

1. **What Stop stops** (choice 5). (a) Stop in a tab stops its analysis
   and ends its live state; the others start a quiet second later; the
   band adds "Stop all". (b) Every Stop ends every live state, and the
   user presses Run again in each tab they want back. Recommended: (a),
   since Stop keeps the meaning it has for the PCA and the second button
   appears only while two or more analyses are live.
2. **The column of the populations and the individuals file while the
   diversity runs** (choice 2). (a) Greyed while the diversity runs, and
   open while only the PCA runs. (c) Never greyed: a change of them
   stops the diversity and starts it again on the new populations, a
   stop of the worker the user did not press, which leaves about 0.2 GB
   in WebKit. Under (a) they are greyed for as long as the diversity
   runs, from half a second on a VCF of 80 MB to 23 s on the largest
   file measured, 800,000 variants of 1,000 individuals. Recommended:
   (a), since only the user's Stop then stops a calculation; (c) if the
   owner prefers them always open.

## For the session that builds it

The owner can stop reading here. What follows names the code.

**What assumes one live analysis**, each to change:

1. `holderOf` of `src/ui/autoRuns.ts` (lines 339 to 348), which `liveKey`
   calls (lines 477 to 486), holds a live analysis back behind any
   analysis before it that is neither done nor locked, and that failed
   in another group. With the groups `[summary]`, `[pca]`,
   `[diversity]`, a PCA never run, `ready` in the store, or refused by
   popnei, keeps the diversity from ever starting by itself. A live
   analysis waits for the group `POPGEN2_CHAIN`, the one pass, and for
   no group of an analysis that can be live, whatever that analysis's
   state: not live, stopped by the user and `ready`, done, locked,
   running or failed. A PCA stopped by the user is not live and is
   `ready`, and under a rule that held back behind any analysis not
   live, the diversity would never start after it. The order among the
   live ones is choice 1, the order of the groups in
   `POPGEN2_AUTO_GROUPS`; one runs at a time because `sync` starts
   nothing while any analysis runs (line 590).
2. `run` of `autoRuns` (lines 655 to 666) calls `runStart` at once,
   refused only during a write: a Run while another analysis runs would
   send its request into the client's queue. It makes the analysis live
   and calls `sync` instead when anything runs.
3. `aboutToStart` (lines 490 to 497) gives `"changes"` or `"download"`;
   it gains the waiting state, with the analysis that runs before.
4. `runningAnalysisOf` of `src/ui/analyses/status.ts` (lines 131 to 137)
   names the PCA alone; the lock (`src/ui/variants/filtersLock.ts`), the
   download (`src/ui/variants/downloadState.ts`, line 210) and their
   words read it. It gives the running live analysis, its name in a
   sentence, its tab, and what it reads, so that the column of the
   populations (`src/ui/variants/IndividualsBox.tsx`, line 278) and the
   file zone (line 171) read the lock too.
5. The band, `src/ui/band/bandLine.ts`: `BandPage.pcaLive` (line 55)
   becomes the live state of each live analysis; `pcaRunning` and
   `aboutToStart` (lines 211 to 245) name the analysis and those waiting;
   the link of a result (lines 247 to 258) takes the first in the order
   of the tabs. `stoppingOf` (lines 277 to 292) already names any
   analysis by its title. Noted on 12 October 2026, after work package
   4 of `docs/plans/population-tab.md`: as built, the field is
   `BandPage.live`, the live state of each analysis of `POPGEN2_LIVE`,
   and `pcaLive` is gone.
6. `announceLive` of `src/ui/variants/announceChanges.ts` (lines 139 to
   158) speaks of the PCA's method alone; it names the analyses of the
   round, once at its first start. `failureEndsLive` of
   `src/ui/analyses/pca/liveEnd.ts` is the PCA's; `endsLive` of
   `LiveDeps` dispatches by analysis, and the diversity's crash for
   memory and failures only a reload mends end its live state as the
   PCA's do. Corrected on 11 October 2026, after the approval, by the
   session that wrote the specs: every crash of the diversity ends its
   live state, since its words cannot tell a crash for memory from
   another.
7. A Stop restarts no quiet second. The timer of the second is started
   again only by a change of the project and by the page's count of the
   controls in the middle of a change, a slider held, a list open, a
   number typed and not confirmed (`autoRuns.ts`, lines 567 to 584); `pause` (lines
   667 to 673) cancels the run and ends the live state, and leaves
   `quiet` true, so the `sync` after the store's change starts the
   waiting analysis at once, the failure of choice 5 (c). `pause` calls
   `quietAgain` before it cancels the run, so that the waiting analyses
   start a quiet second after the Stop; Stop all needs none, since it
   leaves nothing live.

**The diversity of the page.** `diversity` of
`src/core/analyses/diversity.ts` (line 283) speaks of the steps of
`popgen.html` in its reasons, "in the Individuals step", "in the
Variants step" (lines 249, 468, 499 and 750, among others, and `populationsNeeds` of
`src/core/project.ts`, line 3062). `popgen2.html` gets
`diversityOnPopgen2`, as the PCA has `pcaOnPopgen2`
(`src/core/analyses/pca.ts`, lines 2150 to 2155): the same key, request
and numbers, the words of the page's tabs and boxes. It joins
`POPGEN2_ANALYSES` of `src/core/apps.ts` (line 76) and a live group of
its own after `POPGEN2_LIVE` in `src/ui/popgen2Store.ts`. The panel of
the old page, `src/ui/analyses/diversity/`, its table and
`SpectrumBlock`, is reused in the Populations tab, loaded apart as the
PCA tab's result is.

**What changes, by document.** `docs/specs/steps/popgen2-pca.md`, "The
PCA calculated again by itself", for the order, the waiting and Stop
all; `popgen2-band.md`, "The line"; `popgen2-download.md`, "While a PCA
runs"; a new screen spec of the Populations tab; a section "On
popgen2.html" in `docs/specs/analyses/diversity.md` and `sfs.md`;
`docs/functionality.md`, the paragraph of the PCA tab that says it alone
calculates again by itself; `docs/architecture.md`, sections 3 ("While a
PCA runs there"), 5 ("The PCA of `popgen2.html` starts again by
itself"), 7 (the band) and 9 (the rows of `autoRuns.ts` and `band/`),
each with its "What was revised".

**For pieces 2 and 3.** The LD decay and the distances join as live
groups of their own and need nothing more of this design. The LD decay
has no default distance (the owner, memory "no genome-dependent
defaults"), so it is locked until the user types one; it can run for
tens of minutes and reach 4 GB on a dense file
(`docs/architecture.md`, section 11), so a live LD decay greys the
filters that long after each change, which its own design or plan
weighs with the owner. The distances take one pass, 118 ms on the file
of 19 MB.
