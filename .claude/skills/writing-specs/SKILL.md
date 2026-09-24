---
name: writing-specs
description: How a spec is written in popnei_web. Use it when writing or revising a document under docs/specs/, either a module spec, which says what a module of src/core, src/worker or src/charts has to do, its TypeScript interface and how it is verified, or a screen spec, which says what a step or an analysis panel of src/ui shows in each of its states, what it sends to core, and its warnings and help. The prose follows the writing skill, which is read first.
---

# Writing specs

A spec says what one part of the applications has to do and how we will
know that it does it. It is written before the code of that part, and the
implementation plan and the tests are made from it. It does not give the
order of the work, which is the plan's, and it does not repeat
`docs/functionality.md`, `docs/architecture.md` or `docs/technology.md`,
which it points to by section.

The prose follows the `writing` skill. Read that first. This skill says
what goes into a spec, in which order, and what stays out. It is the
writing-specs skill of popnei, at
`/Users/jose/devel/popnei/.claude/skills/writing-specs/SKILL.md`, adapted
to an application.

## Two kinds of spec

The parts of the applications are of two kinds, and so are their specs.

- **A module spec**, for a module of `src/core`, `src/worker` or
  `src/charts`, and for the module of an analysis in `src/core/analyses/`.
  These are where a mistake gives a wrong number, a stale result shown as
  current, or a project that does not open again (`docs/technology.md`,
  section 3), and a user cannot see such a mistake. So a module spec is
  full, it is reviewed before any code, and the code follows it.
- **A screen spec**, for a step or an analysis panel of `src/ui`. What a
  screen shows, in which states, with which warnings, is decided before
  the code, because it is what the user is told. How it looks and how it
  feels to use is not: it is found by trying it in the running application,
  and a spec written before that would be guessed. So a screen spec is
  short, and its look is refined against the running application.

The owner set this way of working, specs before code for what has to be
right and trial for what has to be pleasant, when the skills were first
written, on 24 September 2026.

## Where they live

Under `docs/specs/`, in folders that mirror `src/`:

- `docs/specs/core/<module>.md`, `docs/specs/worker/<module>.md`,
  `docs/specs/charts/<plot>.md`, one for each module of section 9 of
  `docs/architecture.md`, or one for a few small modules that are always
  read together.
- `docs/specs/analyses/<id>.md`, one for each analysis: its module spec
  first and its screen spec after it, in one file, because the warnings
  that the module raises are the ones the screen shows and the two are
  read together.
- `docs/specs/steps/<step>.md`, the screen spec of a step, and
  `docs/specs/shell.md`, the header, the stepper, the summary line and the
  notices.

## The two readers

The owner reads a spec to check that the right thing is going to be built
and to decide the points that are theirs. The owner has not built a web
application, so a spec does not leave a question of the web for them to
notice: what happens to a result when the user changes a filter while it
runs, what a user of the keyboard alone can reach, what the page shows
while the wasm loads. The spec asks those questions and answers them, or
lists them as open. The implementer, a person or a session of the
assistant, reads it to build the part without having to work out again
what popnei gives or what the architecture meant. Every paragraph is for
one of the two.

## No filler

A spec has as many lines as it has things its two readers need, and none
besides. A spec that the owner does not read to the end has failed,
however correct it is, and what stops them is thoroughness for its own
sake: every edge named, every part filled.

The test for a sentence: would an implementer who has read the
architecture and the popnei function get this wrong without it? Would the
owner decide differently without it? When both answers are no, it goes
out. The parts below are the order of a spec and not a form to fill. A
part with nothing to say is a line or is left out.

A spec that describes more than one person can build in one go is split
along a line the code will also have.

## What a spec is checked against

popnei had pyNei, whose results were its specification. The applications
have no older application to copy. What a spec's claims are checked
against, instead:

- **popnei itself**, through its TypeScript API, at
  `/Users/jose/devel/popnei/js/popnei/src`. Its numbers are verified
  against plink2, R and pyNei in popnei, so the applications never
  recompute them: a spec names the popnei function that gives each number,
  and the check is that the application shows the number popnei gives.
  The doc comment of the function, its defaults and its `@throws` are
  read, not guessed, because what it refuses is what the screen has to
  explain. What the application needs and popnei lacks is said, with the
  item of section 11 of `docs/functionality.md` that asks for it.
- **The three documents**, for what the applications do and how. Each
  claim of that kind names its section: "the result stays in the cache for
  an undo (`docs/architecture.md`, section 3)".
- **The mockup of the interface**, for the screens, once there is one; the
  document of the interface, `docs/interface.md`, was not written on 24
  September 2026.
- **The accessibility standard**, for the screens: WCAG 2.2 at level AA,
  and the patterns of the ARIA Authoring Practices Guide for the widgets,
  which the React Aria components already follow.
- **The properties the architecture rests on**, for the modules of
  `src/core` that no outside program can check: that the same inputs give
  the same key, that an undo gives back the very project it undid. These
  are written as the checks of the spec.

## Before writing

1. Check that the part fits a slot of `docs/architecture.md` with its
   interfaces and invariants as they are, by the test of the `designing`
   skill. When it does not, or it needed a design, the approved design
   comes first, since a spec written against an architecture that is
   about to change is written twice. A spec that finds, while it is
   written, that the architecture does not fit stops and asks the owner
   for a design, and does not work around it.
2. Read the sections of the three documents the part develops, and, for a
   screen, the specs of the modules it reads.
3. Read the popnei functions it calls, their doc comments and their
   tests. When the package is built, in
   `/Users/jose/devel/popnei/js/popnei/dist`, a case can be run under node
   to see what comes out.
4. Write down what a reader of the documents would not expect: a default
   of popnei, a case it refuses, something the architecture assumes and
   popnei does not give yet. On 24 September 2026, for instance, `openVars`
   took the bytes of a whole file and not a `File` read as it streams, and
   no function of popnei reported its progress, while section 5 of the
   architecture counts on both. These are what the spec is most needed
   for.
5. Make the sketch the writing skill asks for.
6. Ask the owner, in a reply in chat, what would rewrite the spec if it
   were answered after the writing: what the part offers that other parts
   will call, a line each, and any open point whose other answer would
   change more than a sentence. Each is asked as the writing skill asks for
   a decision. An open point that moves one value stays in the spec with
   its "meanwhile". What the owner answered is in the spec as decided,
   with that the owner decided it, the date, and the option not taken.
   When there is nothing to ask, say so in a line and go on.

A claim about what popnei does comes from its code or from running it,
and names the function and the file. A claim that was reasoned out is
checked or left out.

## The parts of a module spec

**The opening.** What the module gives to the rest of the application, in
a paragraph; the date; that there is no code yet or what there is; the
row of section 9 of `docs/architecture.md` it develops; and the specs it
depends on.

**What it does.** In words first, what a user would see go right or wrong
because of it, and then the rules. For the module of an analysis: which
parts of the project go into its key and which do not, why it cannot run
yet, what it asks of the worker, the warnings it raises from the data with
their text, the numbers it keeps in the project file, and its lines of the
Python script.

**The TypeScript interface.** The types and the functions another module
calls, in a code block, with a sentence before each one. Nothing private.

**The cases** where the result is not what the rules would make a reader
expect: an empty project, a result that arrives after the user changed
something, a cancel in the middle, a file of another version, a popnei
function that throws.

**How it runs**, when there is something to say: in which thread, what it
keeps, and the memory when it grows with the dataset.

**How it is verified.** Each check with the function it is made at, the
highest one at which the thing can be seen, because a test pins the
signature it calls. The Vitest tests of the rules and the properties, a
small worked example with its values, and, where popnei gives the numbers,
the dataset and the numbers that popnei gave for it, with the command that
got them, written into the tests as literals. What needs a browser, the
worker, the files of the user, a plot drawn, is checked with Playwright,
as `.claude/skills/coding/testing.md` says.

**Open points** and **Not in this spec**, as below.

## The parts of a screen spec

**The opening.** The step or the analysis, the section of
`docs/functionality.md` it shows, and the module spec it reads.

**What it shows.** The options, each with its label, its default and
where the default comes from; the results, each with the popnei field or
the core function it comes from; what can be downloaded.

**The states.** A table of every state the screen can be in, what the user
sees in it and what they can do. A screen has these seven, and a state
that cannot happen gets a line that says why:

| state | what it is |
|---|---|
| empty | nothing to show yet, and nothing the user can do here about it |
| locked | it cannot run, with the reason in words, and where to fix it |
| ready | it can run, with its options |
| running | it is running, with its progress, and it can be cancelled |
| done | the result, with its warnings |
| results removed | a change took the result off the screen, with the notice and its undo |
| error | the calculation failed, with what happened and what to do |

The reason a screen is locked is text on the screen and not a greyed
control alone, because a greyed control tells a user neither why nor
what to do, and a screen reader may not reach it.

**What it sends and reads.** The commands of core it sends and the parts
of the store it reads. A screen holds no state of the project of its own
(`docs/architecture.md`, section 7).

**Its words.** The text of every warning, error, notice and locked reason,
in its final wording, following the section on the text of the
applications of the writing skill, and what the help drawer says, as a
few lines.

**Accessibility**, what this screen asks beyond what React Aria gives: the
order in which the keyboard goes through it; what is announced to a
screen reader without moving the focus, the end of a run and a notice of
removed results among them (WCAG 2.2, success criterion 4.1.3); and what
the colours of a plot or a table carry that has to be said in words as
well (1.4.1).

**Left for the running application.** What the spec does not decide on
purpose: the layout, the sizes, how the options are grouped. A line or
two.

## Decided, inherited and open

Every statement in a spec is one of three kinds, and the reader has to be
able to tell which.

Decided: the spec states it, with the reason when there was a real choice.

Inherited: it comes from popnei or from one of the three documents, and
the spec says from where. "20 individuals at each variant, the default of
`minNumIndividuals` in popnei's `calcPerVarDistribs`" is a complete entry,
and tells the reader which numbers can move and where.

Open: the owner decides. Where it comes up, the text gives the fact and
marks it, "(**Open 2**, below)", and says no more. The list at the end has
each point once, as a request for a decision in the form the writing skill
gives, with what the implementer does meanwhile. The points are numbered
through the whole spec. An open point of the three documents that the
spec depends on is named by its number there, and not copied.

What the writer can decide alone, a name, the shape of a private type, is
decided and not listed. Few open points, each one worth the owner's time:
what changes what a user sees or is told, or the interface other modules
call.

**Not in this spec.** What a reader could expect to find here and is
somewhere else or will not be built, with where it goes. A few lines.

## Two short examples

They show the size and the order. They were written with this skill, from
`docs/architecture.md` and popnei's `stats.ts`, on 24 September 2026,
before any code, and neither has been reviewed; the open points they name
are in the lists of their specs, which are left out here.

A piece of a module spec, `docs/specs/core/history.md`:

```markdown
## Undo and redo

### What it does

The history keeps the projects the user has had, so that an undo gives
back the previous one. Because a result is found by the key of the
project that asks for it (docs/architecture.md, section 3), an undo also
brings back the results of the previous project, with no calculation, as
long as the cache still holds them.

### The TypeScript interface

The history is a plain value, as the project is, and every function gives
a new one.

    interface History {
      readonly past: readonly Project[];   // oldest first
      readonly present: Project;
      readonly future: readonly Project[]; // the next redo first
    }

A command of the user gives a new project, which becomes the present; the
future is dropped, since it followed from a project the user has left.

    function commit(h: History, next: Project): History;

    function undo(h: History): History;  // h itself when past is empty
    function redo(h: History): History;  // h itself when future is empty

### The cases

A command that changes nothing gives back the same project, by reference
(docs/specs/core/project.md), and `commit` then gives back `h`, so the
user does not have to undo a step that did nothing. Opening a project file
starts a new history (**Open 1**, below).

### How it is verified

At `commit`, `undo` and `redo`, with Vitest. `undo(commit(h, p)).present`
is `h.present` itself, compared with `===` and not by its contents,
because the screens tell what changed by comparing references
(docs/architecture.md, section 2). From p0, commit p1, commit p2, undo:
the present is p1 and the future is [p2]; commit p3: the future is empty,
and a redo gives back the same history.
```

A screen spec, the part of `docs/specs/analyses/diversity.md` after its
module spec, for the walking skeleton of section 10 of the architecture:

```markdown
## The panel

The diversity of each population, docs/functionality.md section 6, from
the module above.

### What it shows

No option in the walking skeleton. A table with one row per population:
its name, its number of individuals, the unbiased expected heterozygosity,
the observed heterozygosity and the proportion of polymorphic variants,
the means of `unbiasedExpHet`, `obsHet` and `polyVarsRatio.polyRatio` of
popnei's `calcPerVarDistribs`. It downloads as CSV. F, the mean number of
alleles and the private alleles wait for popnei (docs/functionality.md,
section 11).

### The states

| state | what the user sees |
|---|---|
| empty | cannot happen: whatever is missing, `needs` of the module gives a reason, and the panel is locked |
| locked | the reason `needs` gives: "Load a variants file in the Variants step." or "The metadata file lacks 12 individuals of the variants: ind_031, ind_044 and 10 more. Add them to the file and load it again in the Individuals step." |
| ready | a Run button, and the populations with their sizes |
| running | the time since it started and a Cancel button; popnei reports no progress yet (**Open 2**) |
| done | the table, and the warnings above it |
| results removed | the notice "Diversity removed because the missing data filter changed · Undo" |
| error | popnei throws when the filters keep no variant: "The filters kept no variant. Loosen them in the Variants step." |

### Its words

A population with fewer individuals than the 20 that popnei's
`minNumIndividuals` asks at each variant has no values, and its row says
so: "P3 has 12 individuals, fewer than the 20 needed at each variant, so
its diversity is not calculated."

The help drawer: what each column means, that the rarefied values come
later, and the Python call that gives the same numbers.

### Accessibility

The end of a run and the notice are announced without moving the focus.
The table has header cells for its columns and its rows.

### Left for the running application

Where the warnings go, the number format, whether the populations are
sortable.
```

## Before handing it over

The spec goes to the `first-reader` subagent as the writing skill says,
once as the owner and once as the implementer, with questions for each.
For the implementer: what is shown when the filters keep no variant,
which popnei function gives the number in a column, what the first test
asserts. For the owner: what is asked of me, and what does each answer
lead to.

Then read the list of open points against the text: every **Open** of the
text is in the list, and nothing in the list is decided somewhere in the
text. Read it for filler as the owner would, who has a day of other work.

Last, the review. The code is made from the spec, so a wrong sentence in
it becomes wrong code, and the writer who misread a popnei function will
not find the misreading by reading the spec again. The spec goes to the
`spec-reviewer` subagent, with its path and the popnei files it relies on.
Evaluate each finding before acting on it, since the reviewer can be
wrong, and when the spec is handed to the owner, say which findings were
not taken and why, a line for each.

The owner approves the spec. Its opening then says that it is approved,
with the date, and only then can a plan be written from it: the
`writing-plans` and `following-plans` skills call such a spec settled,
once each of its open points is answered or has a meanwhile.

A change made after the review is checked against every other place that
speaks of the same thing: search the spec for the name and the number.

## Once there is code

A module spec changes first. A changed decision, an answered open point,
a case the code found, goes into the spec in a commit of its own, and the
commit that changes the code comes after it, so the spec is never behind
the code.

A screen spec changes when what the user is told changes: a state, a
warning, a text, an option and its default. What was refined in the
running application, the layout, the spacing, the colours, stays in the
code and the CSS, and goes into the spec only when it was a decision the
owner made.

## When a spec is sent back

As in the writing skill: the spec is corrected, the principle here that
allowed the failure is revised, and the case is saved under `cases/`
beside this file.

## Sources

- The writing-specs skill of popnei and its example,
  `/Users/jose/devel/popnei/.claude/skills/writing-specs/`.
- Web Content Accessibility Guidelines (WCAG) 2.2, W3C Recommendation of
  12 December 2024: https://www.w3.org/TR/WCAG22/, and Understanding SC
  4.1.3, Status Messages:
  https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
- ARIA Authoring Practices Guide, W3C WAI: https://www.w3.org/WAI/ARIA/apg/
