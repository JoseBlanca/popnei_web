# The store

24 September 2026, approved by the owner on 24 September 2026, and
revised on 25 September 2026 for decisions of the owner of that day and
for the specs of stage 2 the owner approved that day, as
`docs/specs/stage-2-open-points.md`, "Changes to approved files", lists,
and again that day for `numCheckNumbers`, which the project file needs;
built in `src/core/store.ts`. Revised on 26 September 2026 for stage 3,
the Variants step whole, as the revision of `docs/architecture.md` the
owner approved that day has it (its sections 4 and 5): the individuals
the filters keep, made from the statistics of each individual and given
to each request; a Run that calculates those statistics first; the lock
of an analysis worked out from the project and the cache; the counts of
what each filter kept, filled from every pass; and the writing of the
filtered variants as a file, tracked as a calculation is; this revision
is approved by the owner on 26 September 2026. Revised on 27 September
2026 for stage 4 where it names the PCA: its pass fills no counts, since
its filters are not the project's, and no analysis of stage 4 asks for
the key of an intermediate result; and again the same day, to agree
with the specs written beside it: the read of the individuals file given
to `individualsRead` as the light worker gives it, the types the user
set applied by the record of `project.ts`; and again the same day after
the review of those specs: a result that a read gives back leaves the
notice, and so does a calculation whose key a read gives back, while one
the notice names and a read keeps locked stays in it; and a list of individuals that keeps nobody locks without the
statistics; and on 28 September 2026, for popnei's release
`js-v0.1.0-dev.3`: the PCoA's limit of 9,381 individuals is its
`keptNeeds`, and a Run that waited for the statistics sends nothing when
`keptNeeds` gives a reason, as the code of stage 3 already does; and
again that day for the owner's decision that the LD filter of the
variants starts with no distance: `variantFilterNeeds` of
`docs/specs/core/project.md` locks what reads the filters of the
variants, and the writing, until the distance is typed, and the jobs
take their filters from `jobFilters`; and again that day after the
review of that change: it locks what reads the filters of individuals
too, whose list needs the statistics it locks, and a property draws the
filter with no distance; and again that day for the owner's decision
that a filter turned off keeps its values in the project, in
`filtersOff` or `individualFiltersOff` of `docs/specs/core/project.md`:
such a filter locks nothing and is in no request, and turning it on
again finds the results of before in the cache. The store is the one object of core that
changes: it holds the
history of the projects, the cache of the results, the version of popnei,
the calculations in flight with their handles, and the ones that failed.
From them it gives the screens one state to read, in which each analysis
is in one of the states of a screen, and the notice of what the last
change removed or will stop. The screens change it with commands, and
`src/ui/runs.ts`, which awaits the calculations, with events. This spec
develops sections 3, 4, 5 and 7 of `docs/architecture.md`, declares the
definition of an analysis of its section 4, and depends on
`docs/specs/core/project.md`, `keys.md`, `history.md` and `cache.md`, and
on `docs/specs/worker/protocol.md` for a request and its outcome. The
stages it names are the steps in which the applications are built, in
`docs/build-order.md`: stage 2 is the walking skeleton, the smallest
application that goes through every part once, which writes and opens
the project file, and stage 6 the report.

## What it does

Everything a user sees of a result goes through the store: whether it is
shown, whether it is the result of the settings on screen, whether a
change took it off and an undo can bring it back, whether a calculation
is running for it, and whether that calculation will be stopped. The
store shows a result only under the key that the current project gives
it, and so never one of other settings (`docs/architecture.md`, section
3).

A calculation runs in the calculation worker, and the page learns its
end later, through a promise, a value that arrives when the calculation
ends. Core never waits for one: the store starts a calculation and
returns at once, `src/ui/runs.ts` waits for the outcome, and hands it to
the store (`.claude/skills/coding/SKILL.md`, "The core").

### The definition of an analysis

Each analysis is a module that exports its definition, of the shape of
section 4 of `docs/architecture.md`. The store is given the definitions
of the analyses of its application, in the order the screens show them,
and calls nothing else of them. `J` is the type of the requests of the
calculation worker and `R` that of its results, `Job` and `JobResult` of
`src/worker/protocol.ts` in the application (stage 2), and types of the
tests in the tests.

- `needs` gives the reason the analysis cannot run beyond what every
  analysis needs (`docs/specs/core/project.md`, `projectNeeds`), beyond,
  for an analysis whose `filtersRead.variants` or
  `filtersRead.individuals` is true, an LD filter with no distance
  (`variantFilterNeeds` of the same spec), and, for an analysis whose
  `filtersRead.individuals` is true, beyond the lists of individuals
  popnei would refuse (`individualListNeeds`), in the words the screen
  shows next to its Run button, or `null`. A reason from any of them
  locks the analysis; `projectNeeds` is asked first,
  `variantFilterNeeds` second, only of an analysis that reads either
  list of filters, `individualListNeeds` third, only of one that reads
  the filters of individuals, and `needs` last.
- `filtersRead` says which of the two lists of filters the analysis
  reads, and `keyInputs` what else its key holds
  (`docs/specs/core/keys.md`).
- `run` builds the request and sends it through the client it is given.
  The store makes that client for this one request, from the `send` of
  the worker client of `src/worker`: it sends under the key of the
  request, passes the progress to the store, makes the keys of the
  intermediate results the request needs, none before the kinship of
  stage 7 (`docs/specs/analyses/pca.md`, "How it runs"), and gives the list of the
  individuals the filters keep, `individuals`, which the analysis puts in
  its job (below, "The individuals kept"). So an analysis cannot send a
  request under another key, lose its progress, make a key of its own,
  or make a list of its own. The store looks in the cache before it
  calls `run`.
- `warnings` gives the warnings a result raises from the data. The store
  calls it once, when the result arrives, with the project the request was
  made from, which may no longer be the current one; the warnings are kept
  with the result in the cache, and go when it is dropped.
- `parseOptions` checks the options of the analysis read from a project
  file of a given version of its format.
- `checkNumbers` gives the numbers kept in the project file. They are
  numbers of popnei's result, or made from them by addition, subtraction,
  multiplication and division alone, which give the same result in every
  browser; `Math.log`, `Math.exp`, `Math.pow` and the like may differ in
  the last digit between the engines of the browsers, and would make the
  comparison below say "differs" for the same data. A NaN of popnei is
  given as `null`.
- `numCheckNumbers` gives how many numbers `checkNumbers` gives for a
  result of the project it is given, whose variants file is read, or
  `null` when the project does not fix it. Unlike `keyInputs`, it reads
  `p.variants`. `projectFile.ts` refuses, when a project file is opened,
  a check whose count is not this one, with the file's variants file in
  the project, as the owner decided on 25 September 2026
  (`docs/specs/core/projectFile.md`, "Opening"); the store does not call
  it.
- `script` gives its lines of the Python script, in stage 6.

The store keeps each result to its own definition: it calls `warnings`
and `checkNumbers` of a definition only with a result of a request that
the `run` of that same definition made, found through that request in
flight, or in the cache under a key of that definition, since a key
holds the id of its analysis. The types do not ensure it. The functions
of the definition are methods, whose arguments TypeScript checks
loosely, so a definition whose `warnings` takes the result of one
analysis alone goes into the list of the store, whose `R` is the union
of the results of all, with no error of the compiler; the store holds
the rule instead, and a test with two analyses whose results differ in
shape checks it. The option not taken was to write the functions as
fields, which TypeScript checks strictly: it would refuse such a
definition, and make every analysis take the union of all the results
and pick its own out of it at run time, for a mistake the store rules
out in one place. For the same reason two definitions of one id are a
defect, and `createStore` throws on them: the key, the state and the
requests of an analysis are found by its id. Both decided here, not by
the owner, on 24 September 2026.

### The state of an analysis

The store gives each analysis the first state of this table whose
condition holds. The states are those of a screen spec
(`.claude/skills/writing-specs/SKILL.md`, "The states"), and the panel of
an analysis shows the one the store gives (`.claude/skills/coding/react.md`,
"The states of an analysis"); the state the skill calls "results removed"
has the kind `removed` in the code.

| state | when | what it holds |
|---|---|---|
| locked | `projectNeeds` gives a reason; or the analysis reads either list of filters and `variantFilterNeeds` gives one; or it reads the filters of individuals and `individualListNeeds` gives one; or its `needs` does | the reason |
| done | the cache holds a result under its key | the result, its warnings, and the comparison with the check numbers of an opened project file |
| running | a calculation of its key is in flight and is not being stopped, whether it waits in the queue of the worker or runs; or a Run of its key waits for the statistics of each individual (below) | its progress, the `Progress` of `docs/specs/worker/protocol.md`, popnei's four numbers of the pass as the worker gave them, passed on unchanged, `null` until the worker gives one; the request's id; and whether it waits for the statistics, whose request's progress and id it then holds |
| error | popnei refused the calculation of its key, or the calculation failed since the last change; or it reads the filters of individuals and the statistics it waits for were refused, or failed since the last change (below) | popnei's message, or the failure, and whether it is the failure of the statistics, `ofStatistics`, so that the panel does not tell it as its own |
| locked | it reads the filters of individuals, and the list they make keeps no individual, known from the statistics in the cache, or from the project alone when the lists to keep and to remove leave nobody; or its `keptNeeds` gives a reason for that list, the diversity when the list leaves no population, as the owner decided at stop B on 27 September 2026, and the PCoA when it keeps more than 9,381 individuals (`docs/specs/analyses/pca.md`, "Why it cannot run") | `keptNoneReason` of `docs/specs/core/individualsKept.md`, or the reason of `keptNeeds` |
| removed | the current notice lists it among the results removed | its key; it can run again |
| ready | none of the above | its key |
| empty | cannot happen | — |

The key of an analysis is made when none of `projectNeeds`,
`variantFilterNeeds` for an analysis that reads either list of filters,
`individualListNeeds` for one that reads the filters of individuals,
and its `needs` gives a reason, the first row, and whatever the second lock, the
one of the individuals kept: the key holds the thresholds and not the
list (`docs/specs/core/keys.md`), so it is known without the
statistics. That lock depends on the cache, not on the project alone,
and so it comes after `done`: a result under the key is shown, whatever
the cache holds of the statistics. After an undo to earlier filters whose
statistics the cache has dropped, a diversity still in the cache is
`done`, as section 3 of the architecture asks, and only a new Run waits
for the statistics. The lock stops a Run and nothing else.

`variantFilterNeeds` locks an analysis that reads only the filters of
individuals, although the LD filter is not among them, because a Run of
it can need the statistics of each individual, which read the filters
of the variants and are locked by the same reason. With a threshold on
the individuals, the list of the individuals kept waits for the
statistics, and `startRun` then sends them under the key the project
gives them; while they are locked the project gives them none, and
`startRun` throws a defect rather than send the Run with no list. With
this lock no path reaches that defect: `startRun` and `startWrite` give
`null` in `locked` before they look at the list; a Run that waited for
the statistics from before the LD filter was turned on is no longer
current once they are locked, since the project gives them no key and
so not the one it waits for, and it ends with nothing sent; and
the statistics of each individual have no reason of their own, `needs`
gives `null` (`docs/specs/analyses/individualChecks.md`), so they are
locked only by `projectNeeds` and `variantFilterNeeds`, which lock every
analysis that reads the filters of individuals as well. No analysis of
stages 2 to 4 reads the filters of individuals alone; the rule is for
one that will, and for the definitions the properties draw.

`empty`, nothing to show and nothing the user can do, cannot happen: an
analysis is locked until its variants file is read, and only a
calculation worker that has started, and so has given the version of
popnei the keys need, reads it. A file that could not be read, a worker
that could not start, lock it with their reason
(`docs/specs/core/project.md`, "What an analysis needs of every
project"). So the store has no such state, and a key asked for without a
version is a defect.

### Commands and events

A command of the user goes through `apply` with its description, the
words that finish the notice, "the MAF filter changed". `apply` commits
the new project to the history, unless the command returned the project
it was given, in which case nothing changes, and undo and redo move in it
(`docs/specs/core/history.md`).

`open` starts a new history with an opened project, and Ctrl+Z does not
undo it, as the owner decided on 24 September 2026
(`docs/specs/core/history.md`). The cache and the refusals are kept: they
are under keys, and a key names the load it was made from, so nothing of
them is shown for the new project unless its keys give it. The
calculations in flight are stopped at once, since the screen asked before
opening; an opening makes no notice, and clears the one there was.

The store counts its moves of the history, `historyMoves`, one more at
each undo, redo and opening, and none at a command or an event. A
screen that holds text of its own beside a part of the project, the
text of a list of individuals typed and not applied, starts again at
the project when the count changes, even when the step undone did not
change that part (`docs/specs/steps/variants.md`, "The two lists"); a
command cannot be told from an undo by the project alone. An undo or a
redo with nothing to move, which changes nothing, counts nothing.

The events come from the workers, through `src/ui/runs.ts` and the entry
of the page, the code that starts when the page opens, makes the store and
the workers and joins them, and change what the screens show without a
step of undo: the
version of popnei, the reads of the files, recorded into every project of
the history that holds their load, and the end of a calculation.

### The notice, and the calculations it stops

After a command, an undo or a redo, the store compares the analyses that
were `done` before it with those after it: each that was done and is not
any more is removed, and is in the notice, with the cause, the
description of the command, of the step undone or of the step redone.
The screen writes it as "3 results removed because the MAF filter changed
· Undo" (`.claude/skills/writing/SKILL.md`, "The text of the
applications"). An analysis removed is in the state `removed` if it can
run, and `locked`, with what it lacks, if it cannot.

The action the notice offers is the reverse of what caused it, as the
owner decided on 25 September 2026: Undo after a command, Redo after an
undo, and Undo after a redo; the words before the action are the screen
spec's. The screen takes the action from the kind of
the cause, `command`, `undo` or `redo`, and the store gives nothing more
for it. Where this spec says that an undo keeps a calculation or brings a
result back, the action of the notice is meant, which after an undo is a
redo; the words on the calculations it will stop name that action too.
The option not taken was Undo always: after an undo it would undo the
step before, and take the user further from where they were.

A calculation in flight whose key the project no longer gives, one the
change left behind, is stopped unless the change is undone, as the owner
decided on 24 September 2026 (`docs/architecture.md`, section 5), except
after a change of the load of the variants file, below. It is in
the same notice as the results removed, which is one for the user: one
message and one Undo for everything the change did, "2 results removed
because the MAF filter changed. The ongoing calculations will be stopped
unless you undo the change. · Undo". The store stops a calculation left
behind, with the `cancel()` of its handle, only when keeping it would
cost the user something, at the first of these:

- **the user closes the notice**, `dismissNotice`: they have seen it and
  not undone; every calculation it named is stopped;
- **the next command, undo, redo or opening replaces the notice**: the
  calculations it named whose key the new project still does not give are
  stopped; an undo gives the keys back, and those calculations go on;
- **a new calculation would wait behind it**: `startRun`, when the user
  presses Run, stops first every calculation left behind, since the one
  calculation worker runs one request at a time and the new one would
  otherwise wait for it, minutes for a GWAS. The notice then loses its
  sentence on the calculations it will stop and keeps the rest, the
  results removed, the calculations already stopped and the Undo, or goes
  if nothing is left in it.

There is no deadline. Until one of the three, Undo keeps the calculation
running, however late the user reaches it: a user who moves through the
page with the keyboard or a screen reader can take long to reach the
Undo, and a deadline would cost them the minutes the calculation had
already run, which is the kind of time limit WCAG 2.2, the accessibility
standard the applications follow, asks to avoid (success criterion
2.2.1). The option not taken, a stop ten seconds after the notice
appeared, had been proposed with no measurement and is not in the owner's
words.

A change of the load of the variants file is the exception: it stops
every calculation in flight at once, as the owner decided on 25
September 2026. The load is the load id of the variants file, and the
store compares it in the project before and after each command, undo
and redo: a new pick changes it, and so do an undo or a redo that gives
back another load, or no variants file at all. Other read options are a
new load id, since `loadVariants` with the load id already there and
other options is a defect (`docs/specs/core/project.md`, "The
commands"), and the worker client starts the calculation worker again
by the load id too (`.claude/skills/coding/worker.md`, "Cancelling").
The store compares the read options as well, which gives the same
changes today, so that a way of changing them under the same load id,
which the screen of stage 3 may find for the ploidy of a VCF, is still a
change of the load; decided here, not by the owner, on 25 September
2026.
The calculation worker holds one file only and is started again for the
new load (`docs/architecture.md`, section 5), so a calculation of the
old load could not go on until an undo. The notice does not promise
these calculations to an undo; it lists their analyses in `stopped`,
and the screen says that they were stopped, "2 calculations stopped
because a new variants file was loaded · Undo". An undo still brings
back the old file, and every result that had ended, from the cache; only
the calculations stopped must be run again. `stopped` holds the analysis
of every calculation that was in flight at the change and not already
being stopped, those the notice before left behind among them, in the
order of the definitions and each once. The notice then names no
calculation that will be stopped unless the change is undone: its
`leftBehind`, the list of those, is empty. `stopped` does not change
until the notice is closed or replaced, since what it tells has
happened, and a notice with nothing else in it stays until then, but
for one thing: a `startRun` of an analysis in `stopped` takes it out,
and a notice left with nothing goes. The user has run that analysis
again, and the line that says its calculation was stopped by the new
file would otherwise stay beside the new run, and after a Stop of the
user's own would tell of that Stop as if the file had caused it.
Decided here, not by the owner, on 25 September 2026, after the review
of the changes of that day. An
analysis done again leaves the results removed, as below, and not
`stopped`. One analysis can be both among the results removed and in
`stopped`: its result of the old settings is removed and its
calculation of newer ones stopped (the cases, below). The words of the notices the example above does not cover
are the screen spec's, in stage 2, with the example as their pattern:
an undo or a redo that changes the load, whose cause is not a new file
and whose action is Redo after an undo, and a notice with both results
removed and calculations stopped. The option not taken was to keep the old file in the
calculation worker until those calculations ended or the notice was
closed: the new file could not be used meanwhile, minutes for an
association, and the tab would hold the memory of both files.

A calculation that waits in the queue leaves it at no cost; one that runs
ends the calculation worker, and a new one starts and reads the variants
file again, with popnei 0.1.0 the whole file (`.claude/skills/coding/worker.md`,
"Cancelling"). The calculation of the new settings does not start by
itself: it starts when the user presses Run, as every calculation does.
The request started by a `startRun` that stopped a calculation is marked,
`afterStop`, so that its panel says that it may first wait for the
variants file to be read again, which with a large file is most of the
wait; the store does not know whether the calculation stopped was running
or waiting in the queue, which only the worker client knows. The option not taken for the whole of this was to let a calculation
left behind finish, its result kept for a possible undo, while the
calculation of the new settings waited behind it.

When the notice changes after `startRun` stopped calculations, the
screen's words change without the user's focus on them; the shell, the
header and the frame of the page, announces the change through its status
region, the part of the page a screen reader reads out when its text
changes, "The earlier calculation of Diversity was stopped", as
`.claude/skills/coding/react.md` says of announcements (WCAG 2.2, success
criterion 4.1.3).

A request is `afterStop` when a stop was issued for its `startRun`,
also when the calculation stopped was already being stopped.

How the store does it, decided here, not by the owner, on 24 September
2026: `startRun` stops the calculations left behind at the moment the
analysis sends its request, just before `send`, so that an analysis
whose `run` throws before sending stops nothing. The request is
`afterStop` when a stop of a calculation has been issued since the
calculation worker last announced itself ready, with `popneiReady`,
which it does again after every restart (the cases below), and no
calculation has ended done or failed since the stop: a stop of a
calculation that runs ends the worker, and the new request then waits
for the worker to start again and read the variants file, also when the
calculation stopped has already ended `cancelled`, as it has when the
user closed the notice or pressed Stop before pressing Run. A
calculation that ends done or failed after the stop was answered by a
worker already past it, so the next request does not wait for a
restart; without that, a stop of a calculation that only waited in the
queue, which starts no worker again, would mark every later request
until the next restart.

A change of the load of the variants file marks the requests that
follow it as `afterStop` too, until a read of the new load is recorded
or a request on the new load ends done or failed. The calculation worker
is started again for the new load and opens its file before its first
request (`docs/architecture.md`, section 5), with popnei 0.1.0 reading
it whole. After a new pick, that opening is the read of the file, so the
first Run after the read does not wait and is not marked. After an undo
or a redo back to a load already read, nothing is recorded, since the
source is read already, and the first Run waits for the opening, so it
is marked. `popneiReady` does not clear this mark, since the worker
announces itself ready before it opens the file. Decided on 25 September
2026, within the owner's purpose for `afterStop`, after the review of
the change of the load.

The analyses of `removed` and `leftBehind` are listed in the order of the
definitions, each once. A calculation that was being stopped and ends
`done` all the same puts its result into the cache under its key, as
any other.

The notice goes when it is closed or replaced; a change that removes
nothing, leaves nothing behind, stops nothing and discards no written
file replaces it with none. An analysis is
`removed` while the current notice lists it, or `locked` if it cannot
run; when the notice is closed or replaced without it, the analysis is
`ready`. An analysis among the results removed that is done again, when
a calculation of its new key ends, leaves the results removed; it stays
in `stopped` if it is there and was done again by an undo, and a
`startRun` that calculated it has taken it out. An analysis among the
results removed leaves them too when a read of a file, recorded, makes
the project give again the key of the result the change removed, and the
cache still holds that result: the result is back on the screen, `done`,
with no calculation, and a notice that went on saying it was removed
would be false. So the store keeps, with the notice, the key of each
result it lists as removed. The case is a metadata file loaded while
every individual is in one population: the diversity is locked while
the file is read, which removes its result, and with the grouping
`onePopulation` the read gives the key it had (`docs/specs/steps/individuals.md`,
"The populations"). A result the cache has dropped in the meantime stays
among the results removed, since it did leave and an undo would not
bring it back either. Decided on 27 September 2026, after the review of
the specs of stage 4; the option not taken kept it in the notice until
the notice was closed or replaced, which told of a removal the user could
see had not lasted. A calculation left behind that
ends by itself, done, failed or cancelled, leaves `leftBehind`, and so
does one whose key the project gives again through a read of a file,
which is not a change of the user; when `leftBehind` is empty, the
notice no longer says that calculations will be stopped, and a notice
left with nothing goes.

A change of the user leaves calculations behind, and its notice names
them. A read of a file, the number of variants of a result among them,
can leave one behind too, when it changes the key of an analysis whose
calculation is in flight and whose key the project gave until the read,
or locks it: no notice names that one, and no undo gives its key back,
since the read is recorded into every project of the history. So the
store stops it at once, when the read is recorded. A calculation the
notice already names among those left behind is not of this kind: the
change of the user left it behind, and a read after it that still does
not give its key, an individuals file refused or that lacks individuals
of the variants, keeps it in `leftBehind`, stopped as the notice says,
unless the change is undone. The read is recorded only into the projects
that hold its load, so the project before the change keeps the file it
had, and an undo gives the key back. Decided on 27 September 2026, after
the review of the specs of stage 4, as section 5 of the architecture has
a request the project no longer asks for stopped unless the change is
undone; the option not taken stopped it at the read, which would cost
the user the calculation that the Undo the notice still offered was
meant to keep (`docs/specs/analyses/pca.md`, "The cases"). And `startRun` stops every calculation left behind, those the
notice names and any other, so that the new request never waits behind
one. Decided here, not by the owner, on 24 September 2026, after the
review of the store.

An analysis that was running, and not done, before a change is not in
the notice's results removed: it had no result on the screen. After the
change it is `ready`, its calculation in `leftBehind`, or in `stopped`
after a change of the load, and the result that arrives late goes into
the cache for an undo.

From stage 3, four things join the notice, three decided with the
architecture on 26 September 2026 (its sections 4 and 5), and the
fourth, the file written and discarded, by the owner the same day
(point G of `docs/specs/stage-3-open-points.md`). The results of
`filterCounts`, the counts beside the filters, are never among the
results removed (below, "What each filter kept"). A Run that waits for
the statistics of each individual is a calculation, left behind, stopped
and named as one, by its analysis. And the writing of the filtered
variants is named apart, since it is not an analysis: `writeLeftBehind`
when a change leaves it behind, `writeStopped` when a change of the load
stopped it, each kept and cleared as `leftBehind` and `stopped` are
(below, "The writing of the filtered variants"). And a file written and
not saved that the change forgot, `writeDiscarded`, so that the user
learns that the Undo of the notice brings the filters back and not the
file; it is kept and cleared as `removed` is, and a notice with it alone
is made, as one with a result removed.

### A calculation that failed

When popnei refuses a calculation, the store keeps its message under the
key of the calculation, and the analysis is in the state `error` whenever
the project gives that key again, by an undo or by a value set back,
without calculating again. popnei refuses the same data with the same
message every time, so a second calculation would take its time to say
the same thing. `startRun` does nothing for a key refused; the user
changes the settings, which gives another key. The owner decided it on
24 September 2026. The option not taken was to forget every failure,
which would have shown the analysis ready after an undo and let the user
wait again for popnei's refusal.

Any other failure, a worker that crashed, one that could not start, a
file of the site left from before a deploy, a message that did not
validate, is kept under its key until the next change of the project, and shown as
the state `error` with what happened, so that the user learns it and can
run again; after the next change, the analysis is `ready`, since a second
try can succeed. A cancel is not a failure: the analysis is `ready`.

The next change of the project, for a failure that is not popnei's, is
a command that changed the project, an undo, a redo or an opening; a
read recorded, a number of variants among them, is not, since it comes
from the workers and would clear the failure of one analysis when the
result of another arrives. `startRun` of an analysis in error after
such a failure forgets the failure, so that a cancel of the new
calculation leaves the analysis `ready`. Decided here, not by the
owner, on 24 September 2026.

A variants file that the browser could not read again, `reopenFailed`,
is kept otherwise: under the load id of the file, as the mark of a load
being opened is kept, and not under a key. While the project's variants
file has that load id, every analysis that can run and is not done or
running is in the state `error` with that failure, whatever its key,
and `startRun` does nothing for it; it is forgotten when the load
changes, a new file picked, the same file read again with other
options, or a project opened. The file fails at every read until it is
picked again, and a failure kept under one key and forgotten at the next
change would give back Run after any command and its undo, for a run
that fails the same way. A popnei refusal of the key comes before it,
since it is the answer to those settings. Decided here, not by the
owner, on 25 September 2026, after the review of the changes of that
day.

### The comparison with the check numbers

When the project comes from a project file whose reference holds check
numbers for an analysis, the state `done` of that analysis holds the
comparison of its result with them, if the fingerprint of its settings
now is the one the reference kept (`docs/specs/core/project.md`, "The
project of an opened project file"); otherwise it holds none, since the
numbers belong to other settings. The numbers are compared exactly, a
decision taken here and not by the owner: popnei gives the same numbers
for the same data in every browser, since its calculations are those of
its compiled Rust, whose arithmetic every browser does in the same way,
and `checkNumbers` adds only arithmetic of the same kind. Two lists of
different lengths differ; two `null`s are the same.

- **The same numbers**: the variants file gives the results the project
  was saved with.
- **Other numbers**: the comparison gives what could explain it. The
  variants file always could: it is not the one the project was saved
  with, or it was changed since. When the version of popnei is not the
  one saved with the numbers, the comparison names both versions, since
  the new version could explain it too. When the key
  version of the analysis is not the one saved with its numbers, it names
  both versions of the application, the one saved with the numbers and
  the one now, since the application has changed how it calculates this
  analysis since. It cannot tell which of these is the
  cause.

The versions compared are those saved with the check of the analysis,
since each check keeps the versions its numbers were calculated with
(`docs/specs/core/project.md`, `Check`), as the owner decided on 25
September 2026. The words the user reads are `checkVerdictText` of
`docs/specs/core/projectFile.md`, in stage 2, which the panel of every
analysis shows under its result.

How the store does it, decided here, not by the owner, on 24 September
2026: it asks `checkNumbers` once for each result, when the result
arrives, with the result of that same definition, and keeps the numbers
with it in the cache, whether or not the project has a reference, so
that the comparison costs nothing when the state is made again. The
fingerprint of the settings now is made when the keys are, with the read
options of the current variants file, and compared with the one the
reference kept for the analysis.

### The individuals kept

The filters of individuals by a threshold need the statistics of each
individual, its proportion of missing genotypes and its observed
heterozygosity, which are the result of an analysis of the Variants
step, `individualChecks` (`docs/specs/analyses/individualChecks.md`),
whose key holds the filters of the variants and not those of the
individuals. Core makes the list of the individuals kept from them,
`individualsKept` of `docs/specs/core/individualsKept.md`. The store is given which of its analyses that is, and a
function that finds the statistics in its result (`statistics` of
`createStore`, below).

The store makes that list once for each project and each result of
`individualChecks` under the key the project gives it, as it makes the
keys: after every change of the project, and after every change of the
cache that puts that result or drops it, since the list, the counts
beside the filters and the lock by the individuals kept change with
it. Without that second rule the analyses would stay locked, or keep
waiting, after the statistics arrive, until the next command. The state
gives it to the screens, `individualsKept`, for the counts the Variants
step shows beside each filter of individuals
(`docs/specs/steps/variants.md`). The client bound to a request of an
analysis whose `filtersRead.individuals` is true gives the known list,
`null` when the filters remove nobody; every other request gets `null`,
and so does the analysis of the statistics itself.

**A Run that waits for the statistics.** When an analysis that reads the
filters of individuals is asked to run while the list is not known, the
project having a threshold and the cache no statistics under the key it
gives `individualChecks`, the store calculates the statistics first, and
the user presses Run once (`docs/architecture.md`, section 5):

- `startRun` starts the request of `individualChecks` under the key the
  project gives it, as its own `startRun` would, stopping first the
  calculations left behind; or, when that request is in flight already
  and not being stopped, started by the user or by another Run, it sends
  nothing and waits for it. The analysis is then `running`, waiting for
  the statistics, with the id and the progress of their request, and its
  panel says it waits, "Calculating the statistics of each individual,
  which the thresholds of the individuals need"
  (`docs/specs/analyses/diversity.md`).
- When the statistics end `done`, they go into the cache as any result.
  For each Run that waited for them, when the project still gives both
  its key and theirs, the store makes the list and sends the analysis's
  own request with it, through the `run` of its definition, as
  `startRun` does. `runEnded` returns the handles it sent, which
  `src/ui/runs.ts` awaits as it awaits those `startRun` returns
  (`docs/specs/entry.md`). When the list keeps no individual, or the
  analysis's `keptNeeds` gives a reason for it, nothing is sent, and the
  analysis is `locked` by the individuals kept.
- A Run that waits is a calculation. A change that gives the analysis
  another key, or the statistics another one, leaves it behind, and the
  notice names it in `leftBehind` as any calculation; an undo while the
  statistics run gives it back, and it goes on. When it is stopped, or
  the statistics end while it is left behind, it ends and sends nothing.
  A change of the load of the variants file ends it at once, with its
  analysis in `stopped`.
- When the statistics are refused by popnei, fail or are stopped, every
  Run that waited for them ends and sends nothing. A refusal or a
  failure is kept under the key of the statistics, as any, and while the
  project has a threshold on the individuals, gives that key, and the
  cache has no statistics under it, every
  analysis that reads the filters of individuals and is not `done` shows
  it, in the state `error` with `ofStatistics`: its Run would wait for the same statistics
  and end the same way. `startRun` of such an analysis does nothing after
  a refusal of popnei; after another failure it forgets it, as it forgets
  one of its own, and starts the statistics again. A stop leaves the
  analysis `ready`.
- `cancelRun` of an analysis that waits ends its wait, and stops the
  statistics as well when no other Run waits for them and the user did
  not start them with the Run of `individualChecks`. So a Stop stops both,
  as the architecture asks, and does not take from another panel the
  statistics it too is waiting for. `cancelRun` of `individualChecks`
  stops its request, and every Run that waited for it ends. Decided here,
  not by the owner, on 26 September 2026.

When the project has no threshold on the individuals, the list is known
from the project alone, and a Run sends its request at once.

### What each filter kept

How many variants each filter of the variants was given and kept is the
result of an analysis of its own, `filterCounts`
(`docs/specs/analyses/filterCounts.md`), whose key holds the filters of
the variants and nothing else of the project; the Count button of the
Variants step runs it (`docs/architecture.md`, section 4, "What each
filter kept"). Every pass over the filters of the project fills it too,
so the counts are there after a diversity with no Count.

The store is given `countsOf`, which replaces `numVarsOf` of stage 2,
and the id of `filterCounts`. `countsOf` gives, of any result of an
analysis: the number of variants of the file, which the first filter of
its pass was given, `numVarsRead` of the counts of its pass, recorded
into the variants file of the request's load as before
(`docs/architecture.md`, section 6, step 5); and a result of
`filterCounts` made of the counts of its pass, `PassStats` of
`docs/specs/worker/protocol.md`, popnei's `passStats`, when the analysis
of the result is one whose pass has the filters of the variants of its
request's project and none of its own, or `null`; `countsOf` tells it by
the analysis of the result, and not by comparing filters. A file
written always had them, and `write.countsOf` makes its result of
`filterCounts` from the counts of its pass. It is `null` for the histograms of the
variants, which read no filter, and for the PCA, whose pass has filters
of its own, the stricter of its MAF filter and the project's and its LD
pruning (`pcaFilters` of `docs/specs/analyses/pca.md`); its number of
variants of the file is given, `varsProcessed` of its first filter, which
is the whole file whatever the filter.

- **The counts of a result go into the cache** when the result ends
  `done`, whatever its analysis, under the key of `filterCounts` for the
  request's project, with the warnings and the check numbers the
  definition of `filterCounts` gives of them, as if a Count with those
  filters had ended. The result itself is put first, and the put of the
  counts keeps it, so that the counts cannot drop from the cache the
  result they came with (`docs/specs/core/cache.md`). A result that
  arrives late fills the counts of its own project, for an undo. A Count
  in flight for the same key goes on, and its result replaces them.
- **The counts are left out of the notice's results removed.** Their key
  holds every filter of the variants, so a change of any takes off the
  counts of all, which the user sees beside the filters as they change
  one; a notice at every move of a threshold would say only that. A
  Count in flight that a change leaves behind is named in `leftBehind`
  as any calculation.
- **A result of `filterCounts` made by `countsOf`** is given to the
  `warnings` and the `checkNumbers` of the definition of `filterCounts`,
  the one exception to the rule that a definition is given only results
  of its own requests (above, "The definition of an analysis"): it is a
  result of that definition's shape, made of a pass, and never the
  result of another analysis.

The counts of the filters of individuals need no pass: they are
`individualsKept`'s, above.

### The writing of the filtered variants

The Variants step writes the variants and the individuals the filters
keep as a `.nei` file, which the user saves (`docs/architecture.md`,
section 5, and section 6, "The files written"). It is a request of the
calculation worker that is not an analysis: its answer is the file, as
large as the variants kept, and it never goes into the cache, since one
file can be larger than its bound. The store tracks it as it tracks a
calculation, under the key of `writeKeyOf` of `docs/specs/core/keys.md`,
the load, both lists of filters, the format and the version of popnei,
with a state of its own, `write`:

| state | when | what it holds |
|---|---|---|
| locked | `projectNeeds`, `variantFilterNeeds` or `individualListNeeds` gives a reason, or the list of the individuals kept is known and empty | the reason, the `reason` of `individualListNeeds` for the third, `keptNoneReason` for the fourth |
| done | a write of its key ended done with at least one variant while the project gave that key, the file has not been handed to the browser, and no change has given the write another key since | what the worker gave, `Written` of `docs/specs/worker/protocol.md`: the file, its size and the counts of its pass |
| noVariant | a write of its key ended done with no variant, `passStats.numVars` 0, and no change has given the write another key since | its key, and the size and the counts of the file, without the file, which nobody can save |
| saved | the file of `done` was handed to the browser to save, `writeSaved`, and no change has given the write another key since | its key, and the size and the counts of the file, without the file |
| running | a write of its key is in flight and is not being stopped, or its Run waits for the statistics of each individual | its progress and the request's id, or those of the statistics |
| error | popnei refused the write of its key, or it failed since the last change; or the statistics it waits for were refused, or failed since the last change, while the project has a threshold on the individuals, gives their key, and the cache has none under it, as for an analysis that reads the filters of individuals | popnei's message, or the failure, and `ofStatistics` |
| ready | none of the above | its key, and whether the last write of the key before was dropped because it ended after a change of its filters, until the next change of the project |

Stage 3 writes the `.nei` format alone; the VCF comes with popnei's
writer of it, with a state of its own. Until then a `startWrite` of
another format is a defect, since the store would file its key, and
show its file, as those of the `.nei` file.

- **`startWrite`** in `ready` or `saved`, or in `error` after a failure
  that is not popnei's, of the write or of the statistics it waited for,
  stops the calculations left behind, as `startRun` does, waits
  for the statistics as a Run does when the list is not known, and
  sends, through `write.send` of `createStore`, the job of the write,
  `WriteJob` of `docs/specs/worker/protocol.md`: the load id of the
  variants file, its filters of the variants as `jobFilters` of
  `docs/specs/core/project.md` gives them, the list of the
  individuals kept and the format, under the key of the write. It
  returns the handles it sent. In any other state it does nothing and
  returns `null`: after a refusal of popnei of the statistics, too, which
  a new press would only start again to be refused again, as `startRun`
  does for an analysis.
- **The file is kept until it is saved, or until the project gives
  another key.** When a write ends `done` and the project still gives its
  key, the store keeps what the worker gave, `Written` of the protocol,
  the file with its size and the counts of its pass, and the state is
  `done`. It forgets the file when the page has handed it to the
  browser, `writeSaved`, and the state is `saved`; and when the project
  gives the write another key, the load changes or a project is opened,
  and the state is `ready`. An undo does not bring a file back once it is
  forgotten, and the notice of a command, an undo or a redo that forgets
  a file in `done` says so, `writeDiscarded`, as the owner decided on 26 September 2026
  (point G of `docs/specs/stage-3-open-points.md`); an
  opening makes no notice, and the question the shell asks before it
  names the file (`docs/specs/shell.md`, "Opening"). A write that ends
  with no variant keeps no file: the state is `noVariant`, and the step
  says why there is nothing to save. So the page releases the file once it is saved, and when a
  change makes it another file than the step shows, as section 6 of the
  architecture has it (`docs/specs/entry.md`, "A file of the filtered
  variants saved"). The page is not told whether the browser kept the
  download, so "saved" is the Save pressed: a user who cancels the
  browser's own question writes the file again, as the owner decided on
  26 September 2026 (point A of `docs/specs/stage-3-open-points.md`).
- **A write that ends after a change of its filters is dropped**, as the
  owner decided on 26 September 2026 (`docs/architecture.md`, section
  13, point 6): when it ends `done` and the project no longer gives its
  key, the store keeps nothing of its file, since it would hold other
  variants than the step shows, and the state `ready` of the key the
  project gives says it was dropped, `dropped`, until the next change of
  the project, so that the step says why no Save came. Its counts go into the cache all the same,
  through `write.countsOf`, as those of any pass, and its number of
  variants is recorded: `numVarsRead` that `countsOf` gives of the result
  of `filterCounts` that `write.countsOf` made, as for a write kept.
- **A change of the filters while it is written leaves it behind**, as a
  calculation: the notice says so, `writeLeftBehind`, in the words of the
  architecture, "The writing of the file will be stopped unless you
  undo the change." (`docs/specs/shell.md`), and the store stops it at
  the same three moments; an undo gives its key back, and it goes on. A
  change of the load stops it at once, `writeStopped`.
- **A calculation asked for while a file is written waits behind it**, in
  the queue of the one calculation worker: `startRun` does not stop a
  write whose key the project gives. A `startWrite` stops a write left
  behind, as it stops any calculation left behind.
- **A failure** is kept as an analysis's is: a refusal of popnei under
  the key of the write for the session, `reopenFailed` under the load
  id, any other until the next change of the project. A refusal for
  memory is kept too, as the owner decided on 27 September 2026 at stop
  A of `docs/plans/variants-step.md`: no write that failed for its size
  was a refusal of popnei, and a second try failed the same way
  (`docs/specs/analyses/writeVariants.md`, "Open points").
- **`cancelWrite`** stops the write in flight of the key the project
  gives, and its wait for the statistics as `cancelRun` does.

Starting the calculation worker again after a written file larger than a
bound, to give back the memory of wasm the file took, is the worker
client's (`docs/architecture.md`, section 13, point 5).

## The TypeScript interface

The definition of an analysis, and the client it is given.

```ts
export interface AnalysisDef<J, R> {
  readonly id: AnalysisId;
  readonly app: readonly AppId[];
  readonly defaults: JsonObject;
  readonly keyVersion: number;
  readonly filtersRead: { readonly variants: boolean; readonly individuals: boolean };
  parseOptions(options: unknown, formatVersion: number): Result<JsonObject, string>;
  keyInputs(p: Project): JsonValue;       // must not read p.variants; answers for any project
  needs(p: Project): string | null;
  /** The reason it cannot run for the individuals kept, a known list that
      keeps some individual, or null; absent for an analysis with none.
      The diversity's: the list leaves no population; the PCoA's: it
      keeps more than 9,381 individuals. */
  keptNeeds?(p: Project, kept: IndividualsKept): string | null;
  run(p: Project, c: WorkerClient<J, R>): Run<R>;
  warnings(r: R, p: Project): readonly Warning[];
  checkNumbers(r: R): readonly (number | null)[];
  numCheckNumbers(p: Project): number | null;  // reads p.variants
  script(p: Project): string;
}

/** What an analysis sends its request through, bound by the store to one key. */
export interface WorkerClient<J, R> {
  run(job: J): Run<R>;
  /** The key of an intermediate result of the request, "the kinship";
      no analysis asks for one before stage 7. */
  intermediateKey(name: string, inputs: JsonValue): string;
  /** The individuals the filters keep, in the order of the variants file,
      for the job; null when they remove nobody, and for an analysis that
      does not read the filters of individuals. */
  readonly individuals: readonly string[] | null;
}

/** A warning raised by the data; `code` is what the tests assert. */
export interface Warning {
  readonly code: string;
  readonly text: string;
}
```

The state the screens read. It is the same object until something
changes, and the state of an analysis that did not change is the same
object after a change to another, so that a screen that reads it is not
drawn again.

```ts
export interface AppState<R, F = never> {  // F: the type of a written file, Blob on the page
  readonly project: Project;
  readonly undo: string | null;           // the description of what an undo would undo
  readonly redo: string | null;
  /** The undos, redos and openings so far, 0 when the store is made. */
  readonly historyMoves: number;
  readonly popneiVersion: string | null;
  readonly analyses: readonly AnalysisView<R>[];  // in the order of the definitions
  readonly runs: readonly RunView[];      // the calculations in flight
  readonly notice: Notice | null;
  /** The individuals the filters keep, and each filter's counts; null
      when projectNeeds or individualListNeeds gives a reason
      (docs/specs/core/individualsKept.md). */
  readonly individualsKept: IndividualsKept | null;
  /** The writing of the filtered variants as a .nei file; null when the
      store was made with no `write`. */
  readonly write: WriteStatus<F> | null;
}

export interface AnalysisView<R> {
  readonly id: AnalysisId;
  readonly status: AnalysisStatus<R>;
}

export type AnalysisStatus<R> =
  | { readonly kind: "locked"; readonly reason: string }
  | { readonly kind: "done"; readonly key: Key; readonly result: R;
      readonly warnings: readonly Warning[]; readonly check: CheckVerdict | null }
  | { readonly kind: "running"; readonly key: Key; readonly runId: number;
      readonly progress: Progress | null;
      readonly waitsForStatistics: boolean }   // runId and progress: the statistics'
  | { readonly kind: "error"; readonly key: Key; readonly error: AnalysisError;
      readonly ofStatistics: boolean }   // the failure of the statistics it waited for
  | { readonly kind: "removed"; readonly key: Key }
  | { readonly kind: "ready"; readonly key: Key };

/** The writing of the filtered variants, in the states of its table above. */
export type WriteStatus<F> =
  | { readonly kind: "locked"; readonly reason: string }
  | { readonly kind: "done"; readonly key: Key; readonly written: Written<F> }
  | { readonly kind: "saved"; readonly key: Key; readonly written: Omit<Written<F>, "file"> }
  | { readonly kind: "noVariant"; readonly key: Key; readonly written: Omit<Written<F>, "file"> }
  | { readonly kind: "running"; readonly key: Key; readonly runId: number;
      readonly progress: Progress | null; readonly waitsForStatistics: boolean }
  | { readonly kind: "error"; readonly key: Key; readonly error: AnalysisError;
      readonly ofStatistics: boolean }
  | { readonly kind: "ready"; readonly key: Key; readonly dropped: boolean };

export type AnalysisError =
  | { readonly kind: "refused"; readonly message: string }  // popnei's; kept
  | { readonly kind: "failed";
      readonly error: Exclude<RunError, { readonly kind: "popnei" }> };  // until the next change; reopenFailed until the load changes

/** A calculation in flight; `current` when the project still gives its key. */
export interface RunView {
  readonly runId: number;
  readonly analysis: AnalysisId | null;  // null for the writing of a file
  readonly key: Key;
  readonly current: boolean;
  readonly stopping: boolean;    // cancelled, its outcome not yet arrived
  readonly afterStop: boolean;   // started by a startRun that stopped a calculation
  readonly progress: Progress | null;
}

export type CheckVerdict =
  | { readonly kind: "same" }
  | { readonly kind: "differs";
      readonly popnei: { readonly saved: string; readonly now: string } | null;
      readonly app: { readonly saved: string; readonly now: string } | null };

export interface Notice {
  readonly cause: { readonly kind: "command" | "undo" | "redo"; readonly description: string };
  readonly removed: readonly AnalysisId[];
  readonly leftBehind: readonly AnalysisId[];  // their calculations will be stopped unless undone
  readonly stopped: readonly AnalysisId[];     // their calculations were stopped at once by a change of the load
  readonly writeLeftBehind: boolean;           // the writing of the file will be stopped unless undone
  readonly writeStopped: boolean;              // it was stopped at once by a change of the load
  readonly writeDiscarded: boolean;            // a file written and not saved was forgotten by the change
}
```

A Run that waits for the statistics has no request of its own yet, so
it is in no `RunView`: the request of the statistics is, under
`individualChecks`, and the analysis's state names it by its id.

The store is made once per page, by its entry, with the definitions of
the application's analyses; the function of the worker client that sends
a request (`.claude/skills/coding/worker.md`, `Client.run`), a write
among them; `countsOf`, which finds in a result the number of variants
of the file and the counts of its filters (above, "What each filter
kept"); the analyses of the statistics of each individual and of the
counts, and how their results are read; how a write is sent, and how
its counts are read; and the version of the application. `R` is the union of the results of the
analyses, `JobResult`, and `F` the type of a written file, a `Blob` on
the page, which core holds and never reads; `Written<F>`, `WriteJob`
and `PassStats` are `docs/specs/worker/protocol.md`'s.

```ts
export function createStore<J, R, F = never>(config: {
  readonly first: Project;
  readonly analyses: readonly AnalysisDef<J, R>[];
  readonly send: (key: string, job: J, onProgress: (p: Progress) => void) => Run<R>;
  readonly countsOf: (r: R) => PassFound<R>;
  /** The id of the analysis whose results countsOf makes, "filterCounts"; null in the tests that have none. */
  readonly counts: AnalysisId | null;
  /** The analysis of the statistics of each individual, "individualChecks", and its numbers in its result. */
  readonly statistics: { readonly analysis: AnalysisId; of(r: R): IndividualStats } | null;
  /** How a file of the filtered variants is written; null when the application writes none. */
  readonly write: {
    readonly send: (key: string, job: WriteJob, onProgress: (p: Progress) => void) => Run<Written<F>>;
    /** The result of `counts` made of the counts of the pass of a written file. */
    readonly countsOf: (pass: PassStats) => R;
  } | null;
  readonly appVersion: string;
  readonly cacheMaxBytes: number;          // CACHE_MAX_BYTES
  readonly maxUndoSteps: number;           // MAX_UNDO_STEPS
}): Store<R, F>;

/** What the store takes from the pass of a result. */
export interface PassFound<R> {
  /** The variants of the file, which the first filter of the pass was given; null when the result has none. */
  readonly numVarsRead: number | null;
  /** The counts of its filters, as a result of the analysis `counts`, when the pass had the filters of the variants of its request's project; null otherwise. */
  readonly counts: R | null;
}
```

`createStore` throws a defect when `counts` or `statistics.analysis` is
not the id of one of the definitions, when the definition of the
statistics reads the filters of individuals, which would make it wait for
itself, and when the definition of the counts reads them. `IndividualStats`
and `IndividualsKept` are those of `docs/specs/core/individualsKept.md`, and `WriteFormat`, `"nei"` in stage 3, is
`WriteJob["format"]`. The handles the store gives back are of either
kind of request, `Run<R | Written<F>>`, and `runEnded` takes the outcome
of either; the store knows which by the id of the request.

```ts

export interface Store<R, F = never> {
  getState(): AppState<R, F>;
  /** Calls `listener`, a function of a screen, after every change; returns
      the function that stops it. A property made once, so React keeps it. */
  readonly subscribe: (listener: () => void) => () => void;

  apply(description: string, command: (p: Project) => Project): void;
  undo(): void;
  redo(): void;
  open(p: Project): void;
  /** Closes the notice, and stops the calculations it left behind. */
  dismissNotice(): void;

  /** Starts the calculation of an analysis that is ready, removed, or in
      error after a failure that is not popnei's nor a variants file that
      could not be read again, after stopping every calculation left
      behind, and takes the analysis out of the notice's `stopped`; null,
      and nothing done, in any other state. Gives the handles it sent:
      the analysis's request, or that of the statistics it waits for, or
      none when it waits for statistics already in flight. */
  startRun(id: AnalysisId): readonly Run<R | Written<F>>[] | null;
  /** Stops the calculation in flight of an analysis, or its wait for the
      statistics, if there is one. */
  cancelRun(id: AnalysisId): void;
  /** Starts the writing of the filtered variants, in the states and with
      the handles of startRun. */
  startWrite(format: WriteFormat): readonly Run<R | Written<F>>[] | null;
  /** Stops the writing in flight, or its wait, if there is one. */
  cancelWrite(): void;
  /** The page has handed the file of `write`, `done`, to the browser to
      save: the store forgets the file, and `write` is `saved`. A defect
      in any other state. */
  writeSaved(): void;

  popneiReady(version: string): void;
  variantsRead(fileId: string, read: SourceRead): void;
  /** From stage 4 the read is given as the light worker gives it, and the
      record applies the types the user set that it allows
      (docs/specs/core/project.md, recordIndividualsRead). */
  individualsRead(fileId: string, csv: CsvOptions | null, read: IndividualsReadGiven): void;
  /** Gives the handles it sent because of this end: the requests of the
      Runs that waited for these statistics. */
  runEnded(runId: number, outcome: Outcome<R | Written<F>>): readonly Run<R | Written<F>>[];
}
```

A command is passed as a function: `store.apply("the MAF filter changed",
(p) => setVariantFilter(p, { kind: "maf", maxAllowedMaf: 0.9 }))`.

`startRun`, `startWrite` and `runEnded` return the handles of the
requests they sent to their caller, `src/ui/runs.ts`, which awaits the
outcome of each and gives it to `runEnded`; the store keeps each handle
too, to stop it. A Run that waits for the statistics gets its own
request only when they end, so its handle comes back from the
`runEnded` of the statistics, and `runs.ts` awaits it as the others. For each request in flight the
store keeps its analysis, its key, the project it was made from, the load
of its variants file and its handle.

What `runEnded` does with each outcome, after it takes the request out of
those in flight:

- `done`: the result goes into the cache under its key, with its
  warnings, made from the request's project; if the cache is then above
  its bound, it drops results the current project does not show, never
  one it shows (`docs/specs/core/cache.md`). The result of a write goes
  into no cache: it is kept as the file of the state `write` until it is
  saved, or dropped (above), and not kept at all when it holds no
  variant, `noVariant`. Then, for any result: the counts that `countsOf` gives go
  into the cache under the key of the counts for the request's project,
  keeping the result just put; the number of variants, when `countsOf`
  gives one, is recorded into the variants file of the request's load in
  every project of the history; and, for the statistics of each
  individual, the Runs that waited for them send their requests.
- `failed` of kind `popnei`: the message is kept under the key for the
  session. `reopenFailed`: it is kept under the load id of the request,
  until the load changes, as "A calculation that failed" says. Any
  other kind: it is kept until the next change of the project.
- `cancelled`: nothing is kept.

What the store does with the client it binds, and with the calls it is
given, where the rest of this spec does not say; decided here, not by
the owner, on 24 September 2026:

- The client of a request sends once: a second call of its `run`, or a
  `run` of the analysis that returns a handle the client did not give,
  or none at all, is a defect of that analysis. If the analysis sent
  and then threw, the store cancels what it sent before it throws, so
  that no calculation runs that the store does not know.
- `startRun` and `cancelRun` of an id that no definition has are a
  defect.
- `cancelRun` stops the request of the analysis's current key that is
  not already being stopped; a calculation left behind is stopped by
  the notice, as above.
- The results the cache keeps when it drops some are those under the
  keys the current project gives, which hold every result on screen.

## The cases

- **A result that arrives after the user changed a setting**, before its
  calculation was stopped. The analysis was running and not done, so the
  notice does not list it among the results removed, and it is `ready`.
  The result goes into the cache under the key it was asked for, with its
  warnings, and is not shown, since the project gives that analysis
  another key; an undo shows it with no calculation
  (`docs/architecture.md`, section 5).
- **Run asked twice** for the same key: the second `startRun` returns
  `null`, since the analysis is `running`.
- **A cancel by the user, a crash, a restart.** The outcome is
  `cancelled`, and the analysis `ready`; or a failure of the worker, shown
  until the next change.
- **A progress after the end of its request**, a message the worker had
  sent before the end reached the page: the store no longer has the
  request, and passes it over.
- **A second `popneiReady`**, from the calculation worker started again
  after a restart: with the same version, nothing changes. With another,
  which the page and the workers, built together, do not give, the store
  records it, every key changes, every calculation in flight is stopped at
  once, since no undo gives the old version back, the notice is dropped
  and no notice is made, since this is not a change of the user; the
  analyses that were done are `ready`, and are calculated again when
  asked.
- **A command that returns the project it was given**: nothing changes,
  the notice neither; `getState` gives the same object.
- **A result whose key is not its request's key**, or a `runEnded` of a
  request the store did not start: a defect. The store takes the request
  out of those in flight before it throws, so that the analysis is not
  shown running for ever. A defect while a result is taken in, a key
  from the worker that is not a key, a `warnings`, `checkNumbers`,
  `countsOf` or `statistics.of` that throws, also keeps the failure `{ kind: "failed",
  error: { kind: "defect", message } }` under the request's key, shown
  until the next change as other failures are, so that a calculation of
  minutes that ends in a defect does not end in `ready` with nothing
  said; nothing of the result is kept.
- **An analysis's `run` that throws**: a defect of that analysis. The
  store calls it before it records anything, so when it throws before
  sending, the state is as it was and no calculation is stopped. When it
  throws after sending, the store cancels what it sent; the calculations
  left behind that it stopped just before the send stay stopped, since
  their cancel was sent to the worker.
- **A new variants file picked while calculations run.** Every
  calculation in flight is stopped at the pick, those the notice before
  left behind among them; the notice lists their analyses in `stopped`,
  with the results removed, and leaves nothing behind. An undo of the
  pick shows the results of the old file that had ended, from the cache,
  and stops nothing more, since nothing is in flight that is not already
  being stopped; the analyses whose calculation was stopped are `ready`.
- **One analysis both removed and stopped.** The second analysis done;
  the MAF filter changed, which removes its result; Run, which starts it
  for the new threshold; an undo, which gives the result back and leaves
  the calculation behind; a new variants file picked: the notice lists
  the analysis in the results removed and in `stopped`. Its words are the
  screen spec's, in stage 2.
- **An opened project whose settings are changed and set back.** The
  fingerprint is that of the settings, so the comparison with the check
  numbers comes back with them.
- **An undo to filters whose statistics the cache has dropped.** The
  diversity of those filters, still in the cache, is `done`; the list is
  not known, and only a new Run of an analysis that reads the filters of
  individuals waits for the statistics.
- **A threshold on the individuals moved while a Run waits for the
  statistics.** The statistics' key does not change, since it holds no
  filter of individuals, so their request goes on; the analysis's key
  does, so its wait is left behind and named in the notice. When the
  statistics end, the wait ends with nothing sent, the statistics are in
  the cache, and the analysis is `ready` for the new threshold, with its
  list known: a new Run sends at once.
- **The statistics refused by popnei**, "the pass gave no variant" when
  the filters of the variants keep none: every analysis that reads the
  filters of individuals and is not done shows that refusal in `error`,
  until a change gives the statistics another key.
- **A write that ends after a change of the filters, before its stop.**
  Its file is dropped and the state `write` is `ready` for the new
  filters, with `dropped` true until the next change; its counts are in the cache under the key of the old filters,
  so an undo shows them beside the filters, and shows no Save.
- **A diversity that ends while a Count of the same filters runs.** The
  counts of the diversity go into the cache at once; the Count goes on,
  and its result, the same counts, replaces them.

## How it runs

On the page. The store freezes every project it takes, with
`freezeProject` of `docs/specs/core/project.md`, before it holds it: the
project a command gave to `apply`, the one opened, and each project of
the history that a record changed. A project that undo or redo gives back
was frozen when it was taken. So a write into a project it holds throws,
and the memo of the keys, which trusts only frozen objects, is used for
every project. Freezing stops at the parts already frozen, so it costs
only what the command made.

A read recorded into the history makes one new source of the file for
each source it changes, shared by every project that shared the old
one, as the projects of the history share every part a command did not
change. So an undo after a read gives a project whose source is the
very object of the present one, and a screen that compares the source
is not drawn again. The option not taken, a record applied to each
project alone, would have given each project a copy of its own. Decided
here, not by the owner, on 24 September 2026.

After every change of the project or of the version of
popnei, the store makes the key of each analysis that the project does
not lock, and the key of the write; after those and after every change
of the cache that puts or drops the statistics under the key the project
gives them, it makes the individuals kept, and the states of the
analyses and of the write from them. It
keeps the keys of the last project and version, so that a progress
message, which changes neither, makes no key; and a memo, a table of the
text already written for each object of the project, so that the
individuals table is not written again for a command that changed a
threshold (`docs/specs/core/keys.md`, `KeyMemo`). Then it uses in the
cache the results of the current keys, so that the results on screen are
the last to be dropped (`docs/specs/core/cache.md`), and calls once each
listener, the function each screen gave `subscribe` to be told of a
change.

The keys and the reasons of the new project, or of the new version, are
made before anything of the store changes, so that a defect while they
are made, a `keyInputs` or a `needs` that throws, leaves the store as it
was: the history, the version, the failures kept and the notice. A
listener that throws does not keep the others from being called; the
store calls them all and then throws the first error. When that happens
in `startRun`, the store takes the new request out of those in flight
and cancels it before it throws, since `src/ui/runs.ts` never receives
its handle and would never give its outcome. Decided here, not by the
owner, on 24 September 2026, after the review of the store. The store never waits: `startRun` returns at
once, and the outcome arrives as an event.

What the store keeps grows with the session: the cache, bounded in bytes;
the history, bounded in steps; popnei's refusals, one short text per key
refused, not bounded, since a session makes few.

## How it is verified

With Vitest, at the functions of `Store`, with a fake `send` that returns
requests whose outcomes the test resolves by hand, whose `cancel()` it
records, and which passes progress when the test asks; and two fake
analyses: one that needs the individuals file and uses the populations,
and one that needs only the variants file. From stage 3, three more
fake definitions: statistics of each individual, reading the filters of
the variants alone, whose result carries `IndividualStats`; counts,
reading the filters of the variants alone; and the first fake analysis
reading the filters of individuals as well; with a `countsOf` that gives
counts for every result of the first two fakes, and a fake `write.send`
whose file is a text.

- **A worked sequence.** Create the store; both analyses are locked,
  "Load a variants file in the Variants step." `popneiReady("0.1.0")`,
  `apply("a variants file was loaded", (p) => loadVariants(p, …))` and
  `variantsRead` of that load: the second is `ready`, the first locked by
  the individuals file. `startRun` of the second: it is `running`; a
  progress of `{ bytesRead: 3, numBytes: 10, pass: 1, numPasses: 1 }`:
  its progress is that object; `runEnded` with its
  result: it is `done`, with its warnings, and the cache holds one result.
  `apply("the missing data filter changed", …)`: it is `removed`, the
  notice lists it with that cause and stops nothing. `undo()`: it is
  `done` again with the same result object, `send` was called once, and
  the notice is `null`. `startRun` gives a list of one handle.
- **Stopping**, each case from a new store. With the second running, a
  command that changes its key:
  the notice lists it in `leftBehind`, and `cancel()` was not called.
  Then an undo: `cancel()` is not called and the analysis is `running`.
  Again, then a second command: `cancel()` is called. Again, then
  `dismissNotice()`: `cancel()` is called and the notice is `null`. Again,
  then `startRun` of the second for its new key: `cancel()` of the old
  request is called before `send`, the new request is `afterStop`, and the
  notice keeps its removed results and has no `leftBehind`, or is `null`
  if it had none. Again, then a command that loads another variants
  file: `cancel()` is called at once, the notice lists the analysis in
  `stopped` and none in `leftBehind`, and after an undo of that load the
  old request has been cancelled once and no more. The same with an undo
  and with a redo that change the load. Again, then the new file read,
  `startRun` of the analysis and `cancelRun` of it: the notice no longer
  lists it in `stopped`, and a notice with nothing else in it is `null`. No test waits for a time: the
  store has no clock.
- **A late result**: with the second running, a command, then `runEnded`
  of the old key: the analysis is `ready`, the notice does not list it
  among the results removed and its `leftBehind` is empty, the cache holds
  the result with the warnings of the request's project; `undo()` shows
  it `done`.
- **A refusal**: `runEnded` with `{ kind: "failed", error: { kind:
  "popnei", message: "…" } }` gives `error` of kind `refused`; a command,
  then its undo, give it again, and `startRun` returns `null`. The same
  with `workerFailed` gives `error` of kind `failed`, `startRun` works,
  and after a command and its undo the analysis is `ready`. With
  `reopenFailed`, the analysis is `error` with it, after a command that
  changes its key and after that command's undo, and `startRun` returns
  `null` and calls no `send`; a new variants file loaded and read makes
  it `ready`.
- **The check numbers**: a project opened with a reference whose check
  holds the fingerprint of its settings, popnei "0.1.0", the application
  "0.0.9" and key version 1: a
  result with the same numbers gives `same`; other numbers with popnei
  "0.1.0" now and key version 1 give `differs` with `popnei` and `app`
  null; with "0.2.0" now, `popnei` names both; with key version 2 now,
  `app` names both versions of the application, "0.0.9" of the check and
  the one the store was made with; a list one number
  shorter differs; a setting changed: `check` is null; set back: the
  comparison is there again.
- **The individuals kept and a Run that waits**, on the variants file
  of the five individuals of the worked case of `individualsKept`
  (`docs/specs/core/individualsKept.md`). With no filter of individuals, a Run
  of the analysis that reads them sends at once, with `individuals`
  `null` in its client. With a threshold of 0.2 on the missing rate:
  the analysis is `ready`, its key made, and `individualsKept` gives
  `needsStatistics`; `startRun` gives one handle, that of the
  statistics, the analysis is `running` with `waitsForStatistics`, the
  statistics' id and their progress, and the statistics are `running`
  too; `runEnded` of the statistics gives one handle, the analysis's own
  request, whose client gave `["a", "b", "d"]`, and the state holds the
  counts of the threshold. `cancelRun` of the analysis while it waits
  stops the statistics; the same when the Run of the statistics was
  pressed first, and then `cancelRun` of the analysis stops nothing but
  its wait. With a threshold of 0.01: after the statistics, the analysis
  is `locked` with `keptNoneReason`, and nothing was sent for it. A
  threshold moved while it waits: the notice names it in `leftBehind`;
  the statistics end, and `runEnded` gives no handle. A refusal of the
  statistics: the analysis is `error` with popnei's message and
  `ofStatistics` true, and `startRun` gives `null`. With keep `[a]`,
  remove `[a]` and a threshold of 0.2 on the missing rate, and no
  statistics in the cache: the analysis is `locked` with
  `keptNoneReason`, and `startRun` gives `null` and sends nothing, the
  statistics' request among it.
- **A list of individuals popnei would refuse**, a list to keep that
  names `z`, not in the file: the analysis that reads the filters of
  individuals and the write are `locked` with the `reason` of
  `individualListNeeds`; the statistics of each individual, which read
  none, are `ready`, and `individualsKept` is `null`.
- **An LD filter with no distance**, `maxDist` `null`: the analysis that
  reads the filters of the variants, one that reads only the filters of
  individuals, with a threshold on the individuals and with none, the
  counts of the filters, the statistics of each individual and the write
  are `locked` with the reason of `variantFilterNeeds`,
  before a list popnei would refuse, whose reason comes once the
  distance is typed; an analysis that reads no filter is `ready`; and
  `startRun` and `startWrite` of the locked ones give `null` and send
  nothing. A result `done` before the filter was turned on is in the
  notice of that command, with its Undo, and `locked` after it. Turned
  off, the filter is kept in `filtersOff` with its `maxDist` `null`, and
  every analysis is as in a project with no LD filter, the result of
  before `done` again from the cache.
- **A filter turned off and on again**, the LD filter at r² 0.2 within
  50000 with the diversity `done`: turned off, the diversity is in the
  notice of that command, and no request carries the filter; turned on
  again with the filter kept, the diversity is `done` with the same
  result and no request sent, since its key is the one of before.
- **The key whatever the lock, and the lock from the cache**: with the
  analysis done under a threshold, a command that changes the filter of
  the variants, a result of the other analysis whose put drops the
  statistics of the old filters, their sizes and the bound of the cache
  chosen so, and an undo: the analysis is `done` again with the same
  result, its key is `keyOf` of the project, and the list is
  `needsStatistics`. The lock worked out again from the cache: with a
  threshold set and the list `needsStatistics`, the `runEnded` of a
  Calculate of the statistics changes the state at their put, with no
  command, and the list is `known`. The cache never drops the
  statistics under the key the current project gives them
  (`docs/specs/core/cache.md`), so no put makes the list go back to
  `needsStatistics`; a test that a put of a large result keeps them
  checks it.
- **The counts filled**: `runEnded` of a result of the analysis that
  needs only the variants file puts into the cache, under the key of
  the counts for its request's project, the counts `countsOf` gave;
  the counts are `done` with no Count; a command that changes the filter
  of the variants does not name them in the notice's results removed,
  and its undo shows them `done` again. With a cache whose bound holds
  one result, the result put before the counts is not dropped by their
  put.
- **The write**: `startWrite("nei")` sends a `WriteJob` with the load
  id, the filters of the variants, `individuals` `null` and `"nei"`,
  under `writeKeyOf`, and `write` is `running`; `runEnded` done: `write` is
  `done` with what the worker gave, and the cache does not hold it;
  `writeSaved()`: `write` is `saved`, holds no file, and its size and
  counts are those of the file; `writeSaved()` again is a defect; a
  command and its undo: `ready`. Again, then a
  command that changes a filter: the notice has `writeLeftBehind` and
  `cancel()` was not called; an undo: it goes on. Again, then the result
  arrives after the command: `write` is `ready` with `dropped` true,
  holds no file, and the counts of the result are in the cache under the
  old filters' key, and `numVarsRead` of those counts is recorded into
  the variants file; the next command makes `dropped` false. Again, the
  write `done`, then a command that changes a filter: `write` is `ready`
  and holds no file, the notice has `writeDiscarded`, and its undo does
  not give the file back. A result with `numVars` 0: `write` is
  `noVariant` and holds no file. With a threshold and no statistics,
  `startWrite` waits for them; a refusal of popnei of the statistics
  puts `write` in `error` with `ofStatistics` true, and `startWrite` then
  returns `null` and sends nothing; after a `workerFailed` of the
  statistics, `startWrite` starts them again.
  Again, then `startRun` of an analysis: the write, whose key the project
  gives, is not cancelled. Again, then a new variants file loaded: the
  write is cancelled at once and the notice has `writeStopped`.
- **`popneiReady` twice** with the same version gives the same state
  object; **`dismissNotice`** with no notice gives the same state object.
- **`getState`** returns the same object between two changes, and the
  state of an analysis that did not change is the same object after a
  change to another.
- **A read recorded**: two projects of the history that shared the
  source of the file share the new one after the read.
- **A result given back by a read**: with the analysis that uses the
  populations done under the grouping `onePopulation`, `apply("a new
  metadata file was loaded", (p) => loadIndividuals(p, …))`: it is
  `locked`, and the notice lists it among the results removed;
  `individualsRead` of that load, a table that holds every individual of
  the variants file: it is `done` with the same result object, `send` was
  not called, and the notice, which held nothing else, is `null`. The
  same with a cache whose bound holds one result, and a result of the
  other analysis put while the file is read, which drops the first: the
  analysis stays among the results removed, and is `removed`. With the
  same analysis running instead of done, the same load: the notice
  lists it in `leftBehind`; `individualsRead` of a table that holds every
  individual: it is `running`, `cancel()` was not called, and the notice
  is `null`. Again, with a table that lacks an individual of the
  variants: it is `locked`, `cancel()` was not called and the notice
  still lists it in `leftBehind`; `undo()`: it is `running`, and
  `dismissNotice()` instead calls `cancel()`.
- **A result kept to its definition**: the two fake analyses give
  results of different shapes, and the `warnings` and `checkNumbers` of
  each are called only with results of its own requests; two definitions
  of one id make `createStore` throw.
- **Properties, with fast-check**, which draws random sequences of
  commands, undos, redos, starts, progress, ends and cancels of requests,
  in any order, and shrinks a failure to the smallest one: a result is
  shown only under the key that `keyOf` gives for the current project; an
  undo after a command that removed results gives them back, done, when
  the cache still holds them; the notice of each change lists exactly the
  analyses that were done before it and are not after it; every request
  in flight whose key the project does not give is named by the notice or
  stopping; a request left behind whose notice was closed or replaced
  without its key coming back, or that a `startRun` met, has been
  cancelled; and a change of the load of the variants file cancels at
  once every request in flight, and its notice lists exactly their
  analyses in `stopped`; a result is shown only while it is under a key
  the project gives, whatever the lock by the individuals kept; the list
  given to a request is `individualsKept` of its project and of the
  statistics under the key that project gives them; a write whose result
  arrives when the project gives another key leaves no file in the
  state; and, with the commands drawing an LD filter with no distance
  and filters turned off, an LD filter with no distance among these
  (`docs/specs/core/project.md`, "How it is verified"), and the
  definitions drawing any `filtersRead`, no request, the jobs of the
  statistics and of the write among them, carries an LD filter without
  its distance or a filter turned off, no `startRun` or `startWrite`
  throws, and every definition that reads either list of filters, and
  the writing, is `locked` while the filters on hold an LD filter with
  no distance, and only then for that reason.

The tests in the browser, of the walking skeleton, check the same through
the screens, since core reaches them through the store
(`.claude/skills/coding/testing.md`).

## Open points

The one stage 3 added, point G of `docs/specs/stage-3-open-points.md`,
was decided by the owner on 26 September 2026 as it was recommended, and
is written above as decided: the store forgets a file written and not
saved at the change that gives the write another key, and the notice
says so, `writeDiscarded`. The option not taken kept the file while the
notice is up, so that the Undo of the notice gives it back, which holds
the file, about 960 MB for a million variants of 1,000 individuals, for
as long as the notice stays, with no timer. The other choices of stage 3
are the architecture's, approved by the owner on 26 September 2026, or
decided here and said where they are. The store uses the bound of the
cache (`docs/specs/core/cache.md`, **Open 1**) and the bound of the
history (`docs/specs/core/history.md`, **Open 1**).

## Not in this spec

- `src/ui/runs.ts`, which awaits the requests: `docs/specs/entry.md`.
  The hook, the function through which a React screen reads the store:
  `docs/specs/entry.md` and `.claude/skills/coding/react.md`.
- The list of the analyses of each application, `apps.ts`, `countsOf`
  and the job of a write, and each analysis: from stage 2, and the
  checks of the Variants step in their own specs, stage 3.
- The name and the size of a written file, its Save button and its
  release: `docs/specs/steps/variants.md` and `docs/specs/entry.md`.
  The warning above a size, `WRITE_WARN_BYTES`, and the start of the
  calculation worker again after a large write: the step and the worker
  client (`docs/architecture.md`, sections 6 and 13).
- The words of the notice and the locked reasons of each analysis: the
  screen specs, `docs/specs/shell.md` and the spec of each analysis. The
  words of the comparison: `checkVerdictText` of
  `docs/specs/core/projectFile.md`.
- Starting the calculation worker again when the load of the variants
  file changes: the worker client, which reads it from the project
  (`docs/architecture.md`, section 5).
- Asking the workers to read a file: the store records a read and asks
  for none. After every change of the project the entry of the page asks
  for a read of each source pending with no read under way, as the owner
  decided on 25 September 2026 (`docs/architecture.md`, section 6, "Who
  asks for a read").
