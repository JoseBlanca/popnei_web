---
name: designing
description: How a design is made in popnei_web, the argument for how a new piece fits the architecture or how the architecture changes for it. Use it before the specs of a change that adds a kind of module, changes an interface between layers or an invariant of docs/architecture.md, or changes what the site depends on, and when the owner asks for a design; and when a spec, a plan or a task finds that the architecture does not fit. A design goes to the architecture-reviewer subagent, then to the first-reader, then to the owner.
---

# Designing

A design decides how a new piece fits the architecture of the
applications, or how the architecture changes so that it fits. It is an
argument for a choice: the problem, the options with what each costs,
and why one was taken. It is not a spec. The spec says what a part has
to do and is written against the architecture, so the architecture has
to be settled first.

The owner works by thinking a problem through before its specs are
written, and keeps the code modular so that a screen or an analysis can
be tried and refined. Nothing covered the step between the two: whether a
new piece fits the architecture, and what to do when it does not. The
owner asked for this skill, and for a design to be reviewed before the
work goes on, on 24 September 2026. The owner has not built a web
application, so the costs that belong to the web, a tab out of memory, a
frozen page, a larger download, are for the design and its reviewer to
catch; the owner will not.

The prose follows the `writing` skill, which is read first.

## When a design is needed

The test is whether the change fits a slot that `docs/architecture.md`
already has, with its interfaces and its invariants as they are. The
slots are an analysis, a module of the shape of section 4; a plot, a
function of `src/charts` as section 7 gives it; a screen; a step of an
application. A new analysis that popnei computes, a new plot, a new
warning, a new filter that popnei has, fit, and need no design: go to
the spec, as the `writing-specs` skill says. A design written for a
change that fits is a document nobody needs.

The invariants, which the rest of the code relies on without checking
them again:

1. **A result is never shown stale.** What the screen shows for an
   analysis is the result under the key that the current project gives
   it (section 3), and a key holds every input of the result and nothing
   that changes between two runs of the same inputs.
2. **The layers import as `.claude/skills/coding/SKILL.md` allows**:
   nothing in `src/core` imports `src/ui` or `src/charts`, and nothing in
   `src/charts` imports `src/core` or `src/ui` (section 9).
3. **The project is one plain, immutable value**, and every change is a
   command that gives a new one (section 2). A screen holds no state of
   the project of its own (section 7).
4. **`src/core` has no DOM and no React**, so that it is tested with no
   browser (section 9).
5. **Two workers, one request at a time in each** (architecture section
   5): one calculation worker, the only thread that opens the variant
   file, and one light worker for the jobs that read no genotype.
6. **A cancel of a running request ends its worker and starts another**
   (section 5). The new calculation worker opens the variant file again.

A design is needed when a change:

- adds a kind of module that the architecture does not have;
- changes an interface between layers: `AnalysisDef`, `WorkerClient`,
  the messages of the worker, the handle of a plot, the subscription of
  the screens to the store;
- changes one of the invariants above;
- changes what the site depends on: a new wasm module, a new capability
  asked of the browser or of the host;
- or when the owner asks for one.

The cases seen so far, each of which needs a design:

- **Reading the variant file by ranges.** It is the target design of
  section 6, and a priority request to popnei, decided by the owner on 24
  September 2026; popnei 0.1.0 reads the whole file. When popnei provides
  the source of bytes, it is a design of its own: the calculation worker
  holds something new, and the runner changes where it opens a file. A
  region of the genome that the user picks would, besides, become an input
  of every key.
- **The lasso on the PCA**, which edits the populations from the plot.
  A plot knows nothing of the project, so the selection has to come back
  through `src/ui` as a command; the edited grouping changes the keys of
  every analysis that uses the populations; and a lasso drawn with the
  mouse needs a way for the keyboard.
- **Threads in wasm.** They break "one request at a time in each worker",
  need `SharedArrayBuffer` and the two headers GitHub Pages cannot set
  (`docs/technology.md`, section 4), and may give a cancel other than
  a restart.
- **The store and who awaits a run.** Section 9 has `src/ui/runs.ts`
  await the outcome of each run that core starts. Moving that into core,
  or into the worker client, changes an interface between layers and
  where a stale result could slip through.

When in doubt, write the problem and the options in ten lines and show
them to the owner: that is a design, and a short one is enough when the
choice is easy.

## What a design holds

In this order, each part as long as it needs and no longer:

1. **The opening.** What it decides, the date, its state, draft or
   approved by the owner with the date, and the sections of
   `docs/architecture.md` it touches.
2. **The problem, and what forces it.** What the user needs, in the
   words of `docs/functionality.md`, and what in the architecture, in
   popnei or in the browser makes it more than a new slot filled.
3. **The options**, at least two, the architecture as it stands among
   them when it can be made to work. Each with what it gives and what it
   costs, in the same units on both sides, as the writing skill asks of
   a trade-off. One option is not a design: the reader cannot tell
   whether the choice follows or was the first idea.
4. **The choice and its reason**, and what would have to be true for
   another option to win.
5. **The invariants.** Which of the six it keeps, and which it changes.
   For each one it changes, the code that relies on it and how that code
   changes: a key that gains an input changes every analysis that reads
   that part of the project, and the module of each one is named.
6. **How it will be tested, and what would prove it wrong**: the check
   that fails if the choice is wrong, and the observation, in a spike or
   in the code, that would send the design back.
7. **What is hard to undo**: the format of the project file, which users
   keep; a key, whose change drops every result in the cache; a
   dependency others build on; a URL.
8. **The costs of the web**, below. Each one is written, with its number
   when there is one, or said to be none.
9. **Open points** for the owner, each with a recommendation.

### The costs of the web

The owner cannot judge these, so the design states each, as what a user
would see:

- **Memory of a tab.** A tab that runs out of memory is closed by the
  browser with the user's work, and wasm32 cannot address more than 4 GB
  whatever the machine has. What a choice keeps in memory, in the page
  and in the workers, and how it grows with the variants and the
  individuals, and whether it has a bound.
- **The page frozen.** Work on the main thread blocks every click and
  key until it ends. A task that runs on the page and grows with the
  data, a sort of a million points, a JSON of the project with its
  table, is measured or moved to a worker.
- **Download size**, before anything runs and on first use: the wasm
  package of popnei is 0.63 MB gzipped and the files wasm 0.58 MB
  (`docs/technology.md`, section 2), and a new dependency is set beside
  those.
- **The browsers.** The floor of the applications is Chrome 111,
  Firefox 115 and Safari 16.4, decided by the owner on 24 September 2026
  (`docs/technology.md`); popnei's own, lower floor is the library's. An API newer than
  that, looked up in MDN's compatibility table, is a cost or a reason to
  raise the floor, which is the owner's to decide.
- **What GitHub Pages does not allow**: no code on the server, no HTTP
  headers, so no `SharedArrayBuffer` without the service worker of
  `docs/technology.md` section 4, and no file loaded from another domain.
- **Accessibility**, WCAG 2.2 at level AA: a new way to act, a drag, a
  lasso, a plot that is clicked, has a way for the keyboard (success
  criteria 2.1.1 and 2.5.7), and what it tells the user is not carried by
  colour alone (1.4.1).
- **What is lost when the tab is closed or a worker restarts.** A
  browser cannot open a file by itself (section 6), and a restart drops
  what the worker held (section 5). A restart of the calculation worker
  reopens the variant file, and with popnei 0.1.0 reads it whole again,
  a time that grows with the file. What the user would have to do
  again, and wait for.

### Measuring before choosing

When the choice turns on a number nobody has, the memory of a kinship in
a tab, the time of a pass in Safari, measure it before choosing. A spike
is small and thrown away: it lives in the session's scratchpad or in a
worktree of its own, it is never merged, and what it leaves is the
number in the design, with what it was measured on, as the writing skill
asks. A measurement that closed an option stays in the design, because
the next person would try that option again.

## Where it goes

- **A change to the architecture** is a revision of
  `docs/architecture.md` itself, dated in its opening, with a paragraph
  "What was revised" at the end of the section it changes: what the
  previous version said, what replaced it, who decided and when, and the
  reasons with their numbers. Section 1 of popnei's
  `/Users/jose/devel/popnei/docs/architecture.md` is the model. The
  options not taken and the measurements go there too, in a few lines,
  so that the architecture stays the one place a spec is written
  against.
- **A design for one feature that does not change the architecture**,
  where the choice was still worth arguing, goes in
  `docs/designs/<topic>.md`, and the architecture points to it from the
  section it concerns when a reader of that section would need it.

## The order

The work goes: `docs/functionality.md` says what the applications do;
the design, when one is needed; the `architecture-reviewer` subagent;
the `first-reader` subagent; the owner approves, and the opening of the
design, or of the revised architecture, then says approved, with the
date; then the specs, the plan and the code. Until it is approved, a
revision of `docs/architecture.md` exists only on the branch of the
design, so that `main` always holds the architecture the code is built
against; the owner's approval is the merge. The design goes before the
specs because the specs are written against the architecture, and a
spec written against an architecture that is about to change is written
twice.

When a spec, a plan or a task finds that the architecture does not fit,
the work stops there and comes back to this skill. A spec or a task that
works around the architecture leaves an invariant broken where nobody
will look for it.

## The review

The writer of a design cannot see what they left out, and the owner
cannot see the costs of the web. So the design, or the revised
`docs/architecture.md`, goes to the `architecture-reviewer` subagent, with
a fresh context, its path, the sections of the architecture it touches,
the popnei files it relies on, and what the owner has already decided.

The session evaluates each finding as the `code-review` skill does: it
checks it, and decides that it holds, with the fix, or that it does not
hold, with a reason the reviewer would accept. A finding about a stale
result or a frozen page is not set aside on a doubt. Then the first
reader, then the owner, told which findings were not fixed and why, a
line each, and which questions the reviewer left for them.

## When a design is sent back

As in the writing skill: the design is corrected, and so is this skill,
where the principle that allowed the failure stands. A new kind of
change that needed a design and was not caught by the test above goes
into the list of cases.
