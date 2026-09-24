---
name: writing-plans
description: How an implementation plan is written in popnei_web. Use it when writing or revising a document under docs/plans/, which turns one or more settled specs, module specs and screen specs, into work packages with deliverables that can be checked, each made of tasks that a subagent can carry out, and with room for the owner to try a screen and ask for changes. The following-plans skill is the one that executes it.
---

# Writing implementation plans

A plan turns specs that are settled, approved by the owner with every
open point answered or given a meanwhile, into the order of the work. It says
what is built first and what after, in which pieces, and how we will know
that each piece is done. It is carried out by the `following-plans`
skill: an orchestrator that sends each piece to a subagent, checks what
comes back, and goes on to the next one, so a plan has to be something
that can be run that way.

A plan decides nothing about the design. When writing it shows that a
spec left something open, the question goes back to the spec, as an open
point for the owner, and the plan waits or is written around it. The
specs are the module specs and the screen specs of `docs/specs/`, which
the `writing-specs` skill describes.

The prose follows the `writing` skill. A plan lives in
`docs/plans/<name>.md`. The name says what it builds, in lower case with
hyphens, `walking-skeleton`, `analysis-diversity`, and it is also the name
of the branch, `plan/<name>`, and of the report.

This skill is ported from popnei's on 24 September 2026, before any code
of popnei_web existed. It is to be revised after the walking skeleton of
`docs/architecture.md` section 10 has been built with it.

## No filler

The number of lines is not the measure of a plan. Filler is. A plan has
as many lines as the orchestrator and the subagents need, and none
besides.

The test for a sentence: would the orchestrator, or the subagent that
gets the task, do something different without it? What fails that test
is filler. The usual kinds: what repeats the spec, whose numbers, states
and wording the plan points at, because a copy is wrong as soon as the
spec changes; what a task repeats from its work package; a part that is
there because the shape below has a place for it.

## Before writing

- The specs the plan builds from exist, have been through their review,
  and are approved by the owner, as the `writing-specs` skill ends. Everything a task builds has a spec behind it: a core module, an
  analysis, the worker protocol, a chart have a module spec; a screen has
  a screen spec. When a task would sit on something with no spec, or a
  spec too thin to build from, the session tells the owner what is
  missing, and the plan has it as something that has to be in place. A
  plan does not stand in for a spec.
- Where the change needed a design, as the `designing` skill says, the
  design is approved by the owner too, and the plan builds on it. A plan
  never settles the architecture: when writing it shows that the
  architecture does not hold, the question goes back to a design.
- The open points of those specs are answered by the owner, or each has a
  "meanwhile" that the work can follow. For each one that is not answered
  the plan says which task the answer would change.
- Read the specs, `docs/functionality.md`, `docs/technology.md`,
  `docs/architecture.md` and the code that exists. A plan written without
  looking at the code plans work that is done, or builds on something
  that is not there.
- Run what the checks will run. A number that a check compares with,
  what popnei's Python API gives on a test file, goes into a plan after
  its command has been run once, on this machine. The version of popnei
  in `package.json` is the one the checks are run against.
- Make the sketch the `writing` skill asks for. For a plan, its points
  are the breakdown: the work packages in order, each with what it gives,
  what it stands on and the number of tasks you expect, the reason for
  the order, and what is left out.
- Show the owner the breakdown before the plan is written, as a reply in
  chat. The question is whether the pieces are the right size and in the
  right order, and which screens they want to try before accepting them.
  The owner corrects ten lines faster than a finished plan.

## Work packages

A plan is split into work packages, and a small plan can be one. A work
package ends with something that exists and can be checked, and leaves
the application in a state that works, with every check of the `coding`
skill passing, whatever comes after.

The work is split the way `docs/architecture.md` splits the code, so a
work package is usually one of these:

- **A core module**: `project`, `keys`, `history`, `cache`, `store`,
  `projectFile`. Plain TypeScript with no DOM, checked with Vitest alone.
  It is where a mistake gives a stale or wrong result or a project that
  does not restore, so its deliverables are the cases of its spec.
- **An analysis**: its module under `src/core/analyses/` with the shape
  of section 4 of the architecture, its `run` through the worker, and its
  panel and results under `src/ui/analyses/`. It goes through every layer
  and ends in the browser: a Playwright test that loads a test file,
  runs the analysis and reads on the screen the numbers that popnei's
  Python API gives on the same file, which the spec holds as literals.
  That comparison is the strongest check the applications have, because
  the numbers are popnei's and what the applications can get wrong is
  what they give it: a default, a filter left out, the wrong
  individuals. Its other deliverable is the one section 3 of the
  architecture rests on: a change to each input of `keyInputs` removes
  the result, a change to something outside it leaves it.
- **A chart**: a function of `src/charts/`, which knows nothing of React
  or of the project, checked with Vitest over the SVG it draws, and in
  Playwright for its export, and then mounted by the panel of an
  analysis.
- **The workers and their protocol**: `src/worker/`, the messages, the
  queue of each of the two workers, progress and cancelling. The messages
  and the client are checked with Vitest against fake workers; the real
  workers, `FileReaderSync` and a cancel in the middle of a calculation in
  Playwright
  (`.claude/skills/coding/worker.md`, "What is tested where").
- **A screen, or a step of an application**: `src/ui/steps/` or
  `src/ui/shell/`, built from its screen spec.

An analysis that stops before the screen, at its core module, says so and
says which work package mounts its panel. A plan that builds the core of
five analyses first and their panels last makes its first comparison in
the browser at the end, when a misreading is in all five.

Put first the work package that would change the plan if it failed.
Loading the wasm of popnei in the two workers in the three engines, and
cancelling a calculation, is tried before the analyses that would sit on it.

When the code that exists makes the new work hard, the change to that
code is a work package of its own, before the ones that need it. It
changes nothing the user sees, and its check is that the tests that were
there pass untouched.

Each work package has:

- **What it gives**, in a sentence or two, in the words of a user of the
  application: what they can do when it is done. A core module or a
  chart says it in the words of the work package that will use it.
- **Its deliverables, each with the way to check it.** The check can be
  run and can fail: the Vitest tests of a part of the spec, named by that
  part; a Playwright test with what it does and what it reads on the
  screen; a build that produces a file. "The panel works" is not a
  deliverable. "The Playwright test `diversity shows He` loads
  `e2e/fixtures/panel.nei` with `e2e/fixtures/panel_pops.csv`, runs the
  diversity with its defaults and reads the He of the three populations
  of the spec's 'How it is verified', in Chromium, Firefox and WebKit" is. The numbers
  stay in the spec.
  A check fails on the commit the work starts from, because the thing is
  not there yet. A test runner that selects nothing can still exit with
  0, so a check names its tests or says how many have to run, and the
  count is read from the summary line: `npx vitest list` and
  `npx playwright test --list` print what would run. A check that is true
  before the work checks nothing.
- **What it stands on**: the work packages before it, and what has to be
  in place outside the plan, a release of popnei with the function the
  analysis calls among them. The walking skeleton stands on nothing that
  popnei 0.1.0 lacks, and it reads its individuals file as a CSV, so it
  does not need the files crate either; the crate, and the Rust of its
  build, come with the first work package that reads an xlsx
  (`docs/architecture.md`, section 10).
- **Its tasks.**
- **What could go wrong**, when something is known: the part of the spec
  that is thinnest, the API that WebKit may lack, the file that may be
  too large for a tab. The orchestrator reads this to know where to look.

### A work package with a screen

A work package that changes what the user sees has two more
deliverables, because its tests cannot tell whether the screen is right:

- **The screenshots of the screen in each of its states**, taken in a
  real browser by `npm run screens`, in the light and the dark theme, as
  `.claude/skills/coding/testing.md` says. The states are those the
  screen spec lists, and at least: before anything is given, running
  with its progress, the result, an error, a warning, the notice of
  results removed, and the narrow width when the spec has it. They are
  reviewed by the `ux` and `accessibility` reviewers of the `code-review`
  skill.
- **The owner accepted the screen.** The owner is not a web developer
  and does not review the code, but they are the user who decides
  whether the screen is right, and a screen is judged by using it. So a
  work package with a screen ends when the owner has looked at the
  screenshots or at the running application and said it is accepted,
  and the screen spec says what the screen now is.

Between the two lies the loop in which the owner tries the screen and
asks for changes. It is part of the plan, not a deviation from it, and
the plan gives it its place:

- The plan says which screens the owner will try, as the breakdown
  settled, and the orchestrator stops there for them. It is the one stop
  that is planned. The work packages that do not stand on the screen go
  on meanwhile.
- A change the owner asks for goes into the screen spec first, then into
  the code, and each round is a task with its own commit and its
  screenshots taken again. The spec and the screen never disagree at the
  end of a round, so that the next session builds from a spec that is
  true.
- A round changes the screen: `src/ui/`, the styles, how a chart is
  drawn. A change that reaches `src/core/`, the worker or what an
  analysis computes, or that goes against `docs/functionality.md`, is not
  a round: it goes back to the specs, and becomes a task or a work
  package of its own.
- The plan says how many rounds it expects, two by default. More rounds
  are not a failure; they are said in the report, because they size the
  next plan.
- The review of the `code-review` skill is run on the screen that was
  accepted. When a round after the review changed the markup, the
  `accessibility`, `react` and `ux` reviewers are run again on it.

## Tasks

A task is a natural part of its work package, one a person would also
name as a unit: the key of an analysis and its tests, the messages of the
protocol, the panel of options. It is the unit given to a subagent, which
starts with nothing but the skills, the specs and the plan: the
orchestrator tells it which task is its own, and it reads the whole work
package in the plan. So a task is a few lines and repeats nothing of its
work package. It:

- says what is built and where, the module and the files;
- names the part of the spec it is built from, by its heading, and by the
  path too when the plan builds from more than one spec;
- says which deliverables of the work package it serves, by their
  numbers;
- says what it needs from earlier tasks;
- is between an hour and a day of a person's work. A smaller one is part
  of its neighbour, because a subagent costs a prompt, a run of the
  checks and an entry in the report.

A task whose failure would be silent, a key that misses an input, a
default passed wrongly to popnei, is its own task with its own commit,
and says which check guards it.

Tasks that touch different files and do not need each other are marked
as able to run side by side, and so are two work packages when neither
stands on the other. The rest run in order.

## The shape of the document

1. The opening: what the plan builds and from which specs, the date, and
   the state, draft, approved by the owner, under way or done.
2. In and out: what is built, and what a reader could expect and is not,
   with where it goes. The open points of the specs that are not
   answered go here, each with the task its answer would change.
3. What has to be in place before the first task, in a form that can be
   checked: the version of node, the release of popnei, which of the
   checks of the `coding` skill exist yet and which are reported as not
   there.
4. The work packages in order, each with the parts above. Work packages
   are numbered and tasks are numbered inside them, 2.3, with a box that
   the orchestrator ticks: `- [ ] 2.3 The key of the diversity`. The
   stop for the owner to try a screen is a box too: `- [ ] 3.4 The owner
   accepts the screen of the variants`.
5. How the whole plan is checked at the end, when that is more than the
   sum of its work packages: the largest test file run through the
   application, the build served as the site will serve it.

A plan says what and in what order, not how. It holds no code and no
signatures, which are in the spec, and no reasons of the spec, which it
points to.

## Before handing it over

- Every task names its spec item by the heading of the part. A task with
  nothing of a spec behind it is a gap of the spec or work nobody asked
  for.
- Every deliverable has a check that can fail, and its numbers are in the
  spec. Every check was run on the commit the work starts from and failed
  there, or the plan says why it could not be run.
- Every analysis ends at a Playwright test that reads popnei's numbers on
  the screen, and at the check of its key, or says why it stops before.
- Every work package with a screen ends at the owner's acceptance, with
  its screenshots and its rounds.
- Read it for filler, sentence by sentence, with the test above.
- Could a subagent that reads only one task, the specs and the skills do
  it? Read two tasks that way.
- Nothing in the plan decides what a spec left to the owner.
- The plan goes to the `first-reader` subagent, as any document, read as
  the orchestrator that will run it, with questions of this kind: what is
  the first thing to do, how do I know work package 2 is done, what do I
  do if a worker does not load in WebKit.
- The owner approves the plan before it is run.
