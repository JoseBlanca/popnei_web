# The shell of the population genetics application

25 September 2026, a draft awaiting the owner's approval. The screen
spec of what surrounds every step of the population genetics
application in the walking skeleton of stage 2 (`docs/build-order.md`):
the header, with Undo, Redo and the saving and opening of the project
file; the stepper, the row of the steps with the state of each; the
summary line under it, which says what dataset is in use; the notice of
what the last change removed or stopped, with its Undo or Redo; the
status region, which a screen reader reads out; and the error bar. It
shows sections 1, 2 and 9 of `docs/functionality.md`, and reads the
store of `docs/specs/core/store.md`, the project of
`docs/specs/core/project.md` and the project file of
`docs/specs/core/projectFile.md`. The page and the code that starts it
are `docs/specs/entry.md`. There is no code of it yet.

The words of core used here: the **project** is everything the user has
set; a **command** is a change of it that one Undo takes back, sent with
a **description** that ends its notice, "the missing data filter
changed"; a **load** is one pick of a file; a **source** is what the
project holds of a loaded file, and its **read** what a worker read of
it, pending until the worker answers. The **URL hash** is the part of
the address after `#`, `popgen.html#analyses`, which the browser's back
button moves through without loading the page again.

## What it shows

From the top of the page down: the error bar, when there is an error;
the header; the stepper; the summary line; the step, in `<main>`, with
its `<h1>`; and the notice, at the bottom.

### The header

- **"popnei web"**, a link to the start page, `index.html`, and the name
  of the application, "Population genetics", as text; not a heading,
  since the `<h1>` of the page is the step's.
- **Undo** and **Redo**, buttons that call `store.undo()` and
  `store.redo()`. Each is described, for a screen reader and on hover,
  by what it would take back or bring again, "Undo: the missing data
  filter changed", from `undo` and `redo` of the state of the store, and
  is disabled when that is `null`. The keyboard gives them too
  (`.claude/skills/coding/react.md`, "Keyboard shortcuts"): Ctrl+Z
  undoes; Ctrl+Shift+Z and Ctrl+Y redo; on macOS Cmd+Z and Cmd+Shift+Z;
  except while the focus is in a text field, where they belong to the
  text.
- **Open project…** and **Save project**, below ("Saving", "Opening").

### The stepper

A `<nav>` labelled "Steps", with one link per step, `#variants`,
`#individuals` and `#analyses`, and on each its name, the one of the
`<h1>` of its step, and its state, as a word with a symbol beside it, so
that the state is not told by colour alone (WCAG 2.2, success criterion
1.4.1). Three steps, and no Export step yet (**Open 1**).

The link of the step on screen has `aria-current="step"` and a mark that
is not colour alone. Every step can be opened in every state: a locked
step shows why it is locked, in its own words, and a link that could not
be followed would hide the reason from the user who needs it. The reason
of a step that is not done is also the description of its link, read by
a screen reader with its name, and shown on hover and on focus.

| step | state | when | its reason |
|---|---|---|---|
| Variants | To do | no variants file | "Load a variants file." or, for an opened project, "Load panel_2026.nei, which the project was made with." |
| | Reading | its read is pending | "Reading panel.nei." |
| | Problem | its read failed, or `projectNeeds` gives another reason | the reason `projectNeeds` gives |
| | Done | read, and `projectNeeds` gives none | — |
| Individuals | To do | no metadata file | "Load a metadata file." |
| | Reading | its read is pending | "Reading pops.csv." |
| | Problem | its read failed, or `individualsNeeds` gives another reason, the individuals missing among them | the reason `individualsNeeds` gives |
| | Done | read, and `individualsNeeds` gives none | — |
| Analyses | Locked | every analysis is locked | the reason of the first analysis, "Load a variants file in the Variants step." |
| | Running | an analysis is running | — |
| | Results removed | the notice lists an analysis among the results removed | — |
| | Failed | an analysis is in the state `error` | "Diversity failed." |
| | Done | every analysis that is not locked is done | — |
| | Ready | otherwise | — |

The states of the Analyses step are taken from the states the store
gives each analysis (`docs/specs/core/store.md`, "The state of an
analysis"), the first row that holds, in the order of the table. With
the diversity alone they are its state. The words of the Individuals
step follow its spec, which calls the file of population genetics the
metadata file (`docs/specs/steps/individuals.md`); if that spec makes
the file optional (its **Open 1**), its To do becomes "Optional", with
the reason "Without it, every individual is in one population."

**The step in the hash.** The step on screen is the one the hash names;
an empty hash, or one that names no step, shows Variants and leaves the
address as it is. A change of step is a link the browser follows, which
it makes an entry of its history, so the back button goes to the step
before (`docs/technology.md`, section 4; `react.md`, "What state goes
where"). When the hash changes, the focus moves to the `<h1>` of the new
step, since a screen reader says nothing of a content replaced without a
new page (`react.md`, "Moving focus"); not when the page opens, where
the browser puts the reader at the start. The title of the page names
the step, "Variants · Population genetics · popnei web", so that a tab
and the history of the browser say where the user is (2.4.2).

### The summary line

One line under the stepper that says what the analyses would be run on,
made of the parts below joined by " · ": "panel.nei · 200 individuals ·
1,200 variants · 1 filter · 3 populations by pop". It is text, and is
not announced when it changes.

| part | the project | the words |
|---|---|---|
| the variants file | none | "No variants file", or for an opened project "No variants file: the project was made with panel_2026.nei" |
| | being read | "Reading panel.nei" |
| | read failed | "panel.nei could not be read" |
| | read | "panel.nei · 200 individuals", the individuals of the file, and "· 1,200 variants" once a pass has counted them (`numVars` of the source) |
| the filters | | "no filter", "1 filter", "2 filters": the filters of the variants and of the individuals |
| the metadata file | none | "no metadata file" |
| | being read | "reading pops.csv" |
| | read failed, or individuals missing, or the column of the populations not in it | "pops.csv could not be read", "12 individuals missing from pops.csv", "column pop not in pops.csv" |
| | read, no column chosen | "one population" |
| | read, a column chosen | "3 populations by pop": the number of populations of the function of core that gives them (`docs/specs/steps/individuals.md`, "What it sends and reads"), the individuals with an empty cell not counted |

A count is written with a comma between groups of three digits, as core
writes them (`docs/specs/core/project.md`). A name from the user's
files is shown escaped as core shows it. The mockup of the owner's
summary line said how many variants the filters kept, "48,210 of
1,203,554 variants kept (3 filters)", which the walking skeleton does
not know (**Open 2**).

### The notice

The notice says what the last change removed from the screen and which
calculations it stopped or will stop, with the action that reverses the
change (`docs/specs/core/store.md`, "The notice, and the calculations it
stops"). It is a toast of React Aria, a small panel at the bottom of the
page, the one the store gives, `notice` of its state, or none. It has
two buttons: the action, **Undo** after a command or a redo, **Redo**
after an undo, as the owner decided on 25 September 2026, taken from
`cause.kind`; and **Close**, which calls `store.dismissNotice()`.

**It has no timer.** It stays until the next command, undo, redo or
opening replaces it, or until it is closed, as the store has it. A
notice that went away by itself would take its Undo from a user who is
slow to reach it, with the keyboard or a screen reader (WCAG 2.2.1), and
closing it is what stops the calculations it left behind. Undo and Redo
stay in the header and on the keyboard, so the notice is never the only
way.

**Its words** are made from the notice by one function of the shell,
from four parts:

- **the results removed**, `removed`: one named, "Diversity removed";
  more counted, "3 results removed";
- **the calculations stopped**, `stopped`, by a change of the load of
  the variants file: one named, "the calculation of Diversity stopped";
  more counted, "2 calculations stopped";
- **the calculations left behind**, `leftBehind`, which will be stopped
  unless the change is reversed: a sentence of their own, "The ongoing
  calculation of Diversity will be stopped unless you undo the change.",
  "The 2 ongoing calculations will be stopped unless you undo the
  change."; after an undo, "unless you redo the change", since Redo is
  then the action;
- **the cause**, its description.

The removed and the stopped are joined by "and"; the sentences are
joined by a full stop, with none after the last, which the action
follows. A name is the title of the analysis's panel, "Diversity".

| the cause | the notice |
|---|---|
| a command | "Diversity removed because the missing data filter changed · Undo" |
| a command, with calculations stopped | "Diversity removed and the calculation of Diversity stopped because a new variants file was loaded · Undo" |
| a command, with a calculation left behind and nothing removed | "The missing data filter changed. The ongoing calculation of Diversity will be stopped unless you undo the change · Undo" |
| an undo | "Undone: the missing data filter changed. Diversity removed · Redo" |
| an undo that changes the load | "Undone: a new variants file was loaded. The calculation of Diversity stopped · Redo" |
| a redo, with a calculation left behind | "Redone: the missing data filter changed. Diversity removed. The ongoing calculation of Diversity will be stopped unless you undo the change · Undo" |

The second row is the case of one analysis whose result of the old
settings is removed and whose calculation of newer ones is stopped
(`docs/specs/core/store.md`, "The cases"). A command's description
starts the sentence with its first letter made upper case when nothing
comes before it. The pattern is the owner's mockup, "3 results removed
because the MAF filter changed · Undo", and the store's, "2
calculations stopped because a new variants file was loaded · Undo".

When a Run stops the calculations the notice left behind, the notice
loses its sentence on them and keeps the rest, or goes if nothing is
left, and the status region says "The earlier calculation of Diversity
was stopped." (below).

### The status region

A `<div role="status">`, empty and present from the first drawing of the
page, since a region added at the moment of its message is not read by
every screen reader (`react.md`, "Announcements"). What is written into
it is read out without moving the focus (WCAG 2.2, success criterion
4.1.3). An announcement equal to the one before is still read: the
region is emptied before it is written.

Two kinds of announcements go into it. The first are made from the
state of the store, by one function of the shell that compares the
state before a change with the state after it; the entry calls it at
every change (`docs/specs/entry.md`). They are of what the user did not
do at that moment, and may not be looking at:

| what changed | the announcement |
|---|---|
| a calculation started | "Diversity: running." |
| a calculation ended with its result shown | "Diversity: done.", "Diversity: done, 2 warnings." |
| a calculation ended in the state `error` | "Diversity: failed. The Analyses step says why." |
| a calculation stopped with Stop | "Diversity: stopped." |
| a Run stopped the calculations the notice left behind | "The earlier calculation of Diversity was stopped." |
| the variants file read | "panel.nei read: 200 individuals, ploidy 2." (`docs/specs/steps/variants.md`) |
| the variants file not read | "bad.vcf could not be read." and the reason `projectNeeds` gives |
| the metadata file read | "pops.csv read: 360 rows, 5 columns." and "All 342 individuals found." or "12 individuals of panel.nei are not in pops.csv." (`docs/specs/steps/individuals.md`) |
| the metadata file not read | the reason `individualsNeeds` gives |

A result that comes back from the cache after an undo is not announced
as a calculation done: only a calculation that ended is. The notice is
not written here, since the toast of React Aria is read out by itself.

The second are said by an event handler, through a function the shell
gives the screens: an undo or a redo that makes no notice, "Undone: the
missing data filter changed.", "Redone: …", since otherwise a user of a
screen reader who pressed Ctrl+Z hears nothing; a project saved or
opened (below); the details of an error copied. Several at once are
joined into one message.

### The error bar

An error of our own code that no error boundary sees is shown in a bar
at the top of the page, above the header, as the owner decided on 25
September 2026 (`react.md`, "Errors"; `docs/specs/entry.md`, "The
errors nothing else shows"). The bar says:

"The application met an error of its own: ‹message›. Your project is
intact: save it, then reload the page."

It has three buttons:

- **Save the project**, which does what Save project of the header does,
  so that the user can save when the header is gone with the rest of the
  application's root, after an error while it was drawn. Decided here,
  not by the owner: the words of the bar tell the user to save, and this
  keeps that possible in every case.
- **Copy the details**, which copies, for a report of the bug, the
  message and the stack of every error kept, where each came from, the
  address of the page, the versions of the application and of popnei,
  and the browser; not the project. The status region then says "The
  details were copied." When the browser refuses the copy, which it does
  on a page not served over HTTPS, the development server opened from
  another machine among them, the bar says "The details could not be
  copied. Select them in the box below and copy them." and shows them
  in a box of text that can be selected.
- **Close**, which empties the bar; a later error brings it back.

**A second error while the bar is up** does not replace the first, which
is the likeliest cause of what follows, and is not listed after it,
since an error thrown at every drawing would push the bar down the
page. The bar keeps the first and counts the others after its text: "1
more error followed it.", "3 more errors followed it.", and Copy the
details copies them all, the first 20 whole. The owner's decision left
this to this spec.

The bar is `role="alert"`, which a screen reader reads at once, since it
interrupts what the user was doing (`react.md`, "Errors"); its element
is on the page, empty, from the first drawing, and only its first
error's text is in the alert, so that each new count is not read out
again.

### Saving

**Save project** writes the project file, `docs/functionality.md` section
9, with the function of `src/core/projectFile.ts` that makes its text
from the state of the store, the version of the application and the
date, which the shell gives, since core reads no clock. The browser
downloads it, as a file the page made, under the name of the variants
file with its ending replaced, `panel.popnei.json` for `panel.nei` or
`panel.vcf.gz`; for an opened project with no variants file yet, the
name of its reference's; and `project.popnei.json` otherwise. The
browser saves it where it saves downloads, or asks where if the user
set it to; a page cannot choose the folder in Firefox and Safari. The
status region says "The browser saves panel.popnei.json where it saves
downloads."

When `projectFile.ts` refuses to save the project as it is, a dialog
says why, in its words, "The project cannot be saved yet: ‹its reason›",
with a button OK. The button of the header stays enabled, so that the
reason is reached by the keyboard and read, and not hidden behind a
greyed button.

**The changes not saved.** A reload or a closed tab loses the project,
since nothing of it is kept in the browser. So while the project on the
page is not the empty first project and is not the one last saved or
opened, compared by reference, the page asks the browser to confirm
before it is left, with the browser's own words, which a page cannot
change. Decided here, not by the owner. A read recorded makes the
project another object, and then the page asks although the user
changed nothing; the file saved after it would hold the number of
variants the pass counted, so it is not the file saved before.

### Opening

**Open project…** is a button that opens the file picker of the system,
for a file ending in `.json`. What follows:

1. A file larger than 64 MB is not read, since the page would hold it
   whole: "panel.vcf is 2.1 GB, and is not a project file. A project
   file ends in .popnei.json and holds no genotypes." The bound is a
   named constant, `MAX_PROJECT_FILE_BYTES`; the project of 10,000
   individuals with 20 columns is a few MB, an estimate.
2. The page reads the file as text. A file the browser cannot read,
   moved since it was picked: "panel.popnei.json could not be read: ‹the
   browser's message›. Choose it again."
3. `projectFile.ts` reads the text. A file it refuses: "‹name› could not
   be opened: ‹its reason›", with its words
   (`docs/specs/core/projectFile.md`).
4. When the project on the page has changes not saved, as above, a
   dialog asks first: "Open panel.popnei.json? It replaces the project on
   the page, whose changes are not saved. Save it first to keep them.",
   and, when calculations are in flight, "The ongoing calculations will
   be stopped." Its buttons: "Open panel.popnei.json" and "Keep the
   current project". The store stops the calculations at the opening,
   since the screen asked (`docs/specs/core/store.md`, "Commands and
   events").
5. `store.open(project)`, which starts a new history and clears the
   notice; the hash goes to `#variants`, where the step asks for the
   variants file the project was made with; and the status region says
   "Opened panel.popnei.json. It was made with panel_2026.nei: load that
   file in the Variants step.", or "Opened panel.popnei.json." when the
   file names none.

The file is read and checked before the dialog, so that the user is not
asked to give up their project for a file that does not open. Choosing
the same file again opens it again. The errors of steps 1 to 3 are in a
dialog with a button OK, which takes the focus and gives it back to Open
project… when it closes.

## The states

The shell is not an analysis: it runs nothing itself and shows the state
of the steps and of the store. Its states:

| state | what the user sees | what they can do |
|---|---|---|
| empty | the page just opened: Undo and Redo disabled; the stepper at Variants, To do, Individuals, To do, Analyses, Locked with "Load a variants file in the Variants step."; the summary "No variants file · 1 filter · no metadata file"; no notice | pick a file in the step, open a project |
| locked | cannot happen for the shell as a whole: it waits for nothing. What cannot be done yet says why in words: a step locked, with its reason; Undo or Redo with nothing to take back, disabled with no reason needed; a save refused, in its dialog | — |
| ready | files loaded: the stepper with the state of each step; the summary with the file, its individuals, the filters and the populations | move between steps, undo, redo, save, open |
| running | a read or a calculation: Reading on its step, or Running on Analyses; the summary "Reading panel.nei"; its start and end in the status region | all of the above; opening asks and says the calculations will stop |
| done | a result on screen: Analyses Done | all of the above |
| results removed | the notice, with its words and Undo or Redo; Analyses at Results removed | reverse the change, close the notice |
| error | the error bar; a step at Problem, or Analyses at Failed, with the reason; a project file that could not be opened, in its dialog | save, copy the details, close the bar; fix what the reason says |

## What it sends and reads

It reads, from the state of the store, `project`, `undo`, `redo`,
`notice`, `analyses`, `runs` and `popneiVersion`, each with its own
selector (`react.md`, "Reading core"), and `projectNeeds` and
`individualsNeeds` of the project. It reads the step from the hash, with
`useStepHash` of `react.md`. It sends `store.undo()`, `store.redo()`,
`store.dismissNotice()` and `store.open(project)`. It holds, as state of
the screen, whether a dialog is open, and the project last saved or
opened, to know whether there are changes not saved; nothing of the
project.

The words are made by pure functions of the shell, from the state of the
store, so that Vitest checks them in node: the states of the steps, the
summary line, the text of the notice, and the announcements made from
two states.

## Its words

Every text of the shell is above, in its section, final. The help
drawer is not in the walking skeleton (stage 8).

## Accessibility

- **The keyboard** goes through the page in this order: the error bar
  and its three buttons, when it is up; the header, "popnei web", Undo,
  Redo, Open project…, Save project; the three links of the stepper; the
  step. The notice is last in the order of the page, and F6 reaches it
  from anywhere, as React Aria gives its region of toasts; when it goes
  while it had the focus, the focus goes back to where it was before.
- **The landmarks**: the header is `<header>`, the stepper `<nav>`
  labelled "Steps", the step `<main>`, the notice a region labelled
  "Notice"; they let a screen reader skip to the step, so no link to skip
  the header is needed (2.4.1).
- **Nothing covers what has the focus**: the notice sits over the bottom
  of the page, which keeps room under what the Tab key reaches
  (2.4.11, `.claude/skills/coding/css.md`, "Focus").
- **Announced without moving the focus**, through the status region:
  the table above (4.1.3). The notice through the toast, the error bar
  as an alert.
- **Not colour alone**: a state of a step is a word and a symbol; the
  current step a mark; the error bar its words (1.4.1).
- **The dialogs** of saving and opening take the focus and give it back
  to the button that opened them, and Escape closes them, as React
  Aria's `Dialog` does.
- **A screen reader**, VoiceOver with Safari at least, is tried on the
  stepper, the notice and the error bar, which are new widgets of this
  stage (`react.md`, "Accessibility review").

## Left for the running application

The layout of the header and where the name of the application goes;
the symbols of the states of the steps, and whether the steps are
numbered; where on the bottom the notice sits and its width; how the
box of the details looks.

## What this spec assumes of the other specs of stage 2

- `docs/specs/core/projectFile.md`: a function that makes the text of
  the project file from the state of the store, the version of the
  application and the date, or refuses with a reason in words; a
  function that reads the text into a project, or refuses with a reason
  in words; the reference of an opened project names its variants file.
- `docs/specs/steps/variants.md` and `individuals.md`: the `<h1>` of
  each step is "Variants" and "Individuals"; their descriptions of the
  commands are those of their tables, "a new variants file was loaded"
  among them; they announce the ends of their reads through this spec's
  status region with the words above, and not by themselves.
- `docs/specs/analyses/diversity.md`: the title of its panel,
  "Diversity", in `src/ui/analyses/panels.ts`; the `<h1>` of the
  Analyses step, "Analyses", with each analysis an `<h2>`.
- `docs/specs/steps/individuals.md`: the function of core that gives the
  populations of the column chosen.
- `docs/specs/entry.md`: it calls the announcements made from two states
  at every change of the store, and draws the error bar in its own root.

## Open points

1. **Whether the stepper has an Export step in the walking skeleton.**
   The steps of the architecture are four, the fourth, Export, holding
   the report and the project file (`docs/architecture.md`, section 9).
   In stage 2 the report does not exist, and saving the project is in
   the header, on every step, since a user saves in the middle of the
   work as much as at its end. An Export step now would hold the one
   button the header has already. Options: three steps, and Export comes
   with the report in stage 6; or four, with Export holding "Save
   project" alone and a line that the report comes later, which shows
   the user the shape of the application from the start and costs a step
   with nothing of its own. Recommended: three. Meanwhile, three.
2. **How many variants the filters keep, in the summary line.** The
   owner's mockup has "48,210 of 1,203,554 variants kept (3 filters)".
   The walking skeleton does not know it: the variants kept are counted
   by a pass, and what each filter kept comes with the Variants step
   whole, in stage 3 (`docs/specs/steps/variants.md`, "Not in this
   spec"). Meanwhile, the line gives the variants of the file once
   counted and the number of filters, "1,200 variants · 1 filter"; in
   stage 3 the kept count joins it, as the mockup has it.

## Not in this spec

- What each step shows, and the panel of the diversity:
  `docs/specs/steps/` and `docs/specs/analyses/diversity.md`.
- The format of the project file, and the comparison of a reopened
  project with its variants file and its check numbers:
  `docs/specs/core/projectFile.md`, `docs/specs/steps/variants.md`, and
  stage 6.
- The Export step, with the report and the Python script: stage 6.
- The help drawer and its texts, and the setting of the theme: stage 8
  and after; the walking skeleton follows the theme of the system.
- The page, its start and its roots: `docs/specs/entry.md`.
