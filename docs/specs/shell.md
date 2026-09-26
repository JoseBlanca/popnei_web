# The shell of the population genetics application

25 September 2026, approved by the owner on 25 September 2026, and revised
on 26 September 2026 with the owner's decisions at stop 9.6 of
`docs/plans/walking-skeleton.md`, on the points of the review of its
work package 9. The screen
spec of what surrounds every step of the population genetics
application in the walking skeleton of stage 2 (`docs/build-order.md`),
the smallest application that goes through every part once: the header,
with Undo, Redo and the saving and opening of the project file; the
stepper, the row of the steps with the state of each; the summary line
under it, which says what dataset is in use; the notice of what the last
change removed or stopped, with its Undo or Redo; the status region,
which a screen reader reads out; and the error bar. It shows sections 1,
2 and 9 of `docs/functionality.md`, and reads the store of
`docs/specs/core/store.md`, the project of `docs/specs/core/project.md`
and the project file of `docs/specs/core/projectFile.md`. The page, the
code that starts it, and the saving that the header and the error bar
share are `docs/specs/entry.md`. The shell gives the words of every
announcement of the status region, those of the steps and of the panel
of the diversity among them. There is no code of it yet.

The words of core used here: the **project** is everything the user has
set; a **command** is a change of it that one Undo takes back, sent with
a **description** that ends its notice, "the missing data filter
changed"; a **load** is one pick of a file; a **source** is what the
project holds of a loaded file, and its **read** what a worker read of
it, pending until the worker answers; `numVars` of a read variants file
is its number of variants, `null` until the first calculation has read
the whole file and counted them. `projectNeeds(p)` and
`individualsNeeds(p)` of `src/core/project.ts` give, as a sentence, the
reason no analysis can run because of the variants file or of the
individuals file, or `null`. The **reference** of a project opened from
a project file is what that file said of the variants file it was made
with. The **notice** is the store's record of what the last change did,
whose `cause.kind` is `command`, `undo` or `redo`
(`docs/specs/core/store.md`).

The words of the web: a **screen reader** reads the page aloud, or in
braille, to a user who cannot see it, and reads what has the **focus**,
the element the keyboard acts on; `<header>`, `<nav>` and `<main>` are
the **landmarks** of the page, the parts a screen reader can jump
between, and `<h1>` is its heading. A **toast** is a small panel at the
bottom of the page, and a **dialog** a panel that takes the focus and
blocks the page behind it until it is answered; both are components of
**React Aria**, the library of accessible widgets the application uses.
The **URL hash** is the part of the address after `#`,
`popgen.html#analyses`, which the browser's back button moves through
without loading the page again. The numbers such as 1.4.1 are success
criteria of WCAG 2.2, the standard of accessibility the site follows at
level AA.

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
  is disabled when that is `null`. When Undo becomes disabled while it
  has the focus, after the last step was undone with it, the focus moves
  to Redo, which that undo has just enabled, and the same for Redo and
  Undo: a disabled button cannot hold the focus, which the browser would
  drop to the start of the page (2.4.3). The keyboard gives them too
  (`.claude/skills/coding/react.md`, "Keyboard shortcuts"): Ctrl+Z
  undoes; Ctrl+Shift+Z and Ctrl+Y redo; on macOS Cmd+Z and Cmd+Shift+Z;
  except while the focus is in a text field, where they belong to the
  text, and while a dialog of the shell is open, where they would change
  the project behind the question it asks. Z and Y are the letters of
  the keys by the layout of the keyboard, so that on a French or a
  German keyboard they are where the user sees them; on a layout without
  Latin letters, Russian or Greek, where no key gives Z, they are the
  keys that are Z and Y on a US keyboard. In a text field the browser's
  undo takes back the typing of that field alone: once the field has
  nothing left to undo, WebKit would go on to the field edited before it,
  the threshold behind the dialog of Save among them, which would then
  show a number the project does not hold.
- **Open project…** and **Save project**, below ("Saving", "Opening").

### The stepper

A `<nav>` labelled "Steps", with one link per step, `#variants`,
`#individuals` and `#analyses`, and on each its name, the one of the
`<h1>` of its step, and its state, as a word with a symbol beside it, so
that the state is not told by colour alone (1.4.1). Three steps, and no
Export step, as the owner decided on 25 September 2026: saving the
project is in the header, on every step; the report and its Export step
come in stage 6; and writing the filtered variants as a VCF or a `.nei`
file goes in the Variants step, in stage 3.

The link of the step on screen has `aria-current="step"` and a mark that
is not colour alone. Every step can be opened in every state: a step
that cannot go on shows why, as text on its own screen, and a link that
could not be followed would hide the reason from the user who needs it.
The reason of a step that is not done is also the description of its
link, read by a screen reader with its name, and shown on hover and on
focus. The links are React Aria's `Link`, which is an `<a>` the browser
follows, so that React Aria's `TooltipTrigger`, which takes a trigger of
its own components, can show the reason; if it does not take a `Link`
when it is built, the reason is a line of text under the stepper while
the link has the pointer or the focus.

| step | state | when | its reason |
|---|---|---|---|
| Variants | To do | no variants file | for an opened project, the text of `askedFileText` of `projectFile.ts` (`docs/specs/core/projectFile.md`, "Opening"); otherwise the reason `projectNeeds` gives, "Load a variants file in the Variants step." |
| | Reading | its read is pending | the reason `projectNeeds` gives, "Reading panel.nei." |
| | Problem | its read failed, or `projectNeeds` gives another reason | the reason `projectNeeds` gives |
| | Done | read, and `projectNeeds` gives none | — |
| Individuals | To do | no metadata file | the reason `individualsNeeds` gives, "Load a metadata file in the Individuals step." |
| | Reading | its read is pending | "Reading pops.csv.", from `individualsNeeds` |
| | Problem | its read failed, or individuals of the variants file are missing from it | the reason `individualsNeeds` gives |
| | To do | read, and no column of the populations chosen, `populationsNeeds` of kind `noColumn` | its reason, "Choose the column that defines the populations in the Individuals step." |
| | Problem | the column chosen is not in the table, or no individual of the variants file has a population in it, `populationsNeeds` of kind `noSuchColumn` or `noPopulation` | its reason |
| | Done | otherwise | — |
| Analyses | Locked | every analysis is locked | the reason of the first analysis, "Load a variants file in the Variants step." |
| | Running | an analysis is running | — |
| | Results removed | the notice lists an analysis among the results removed | — |
| | Failed | an analysis is in the state `error` | "Diversity could not be calculated." |
| | Done | every analysis that is not locked is done | — |
| | Ready | otherwise | — |

A step's state is the first row of its step whose condition holds, in
the order of the table. The states of the Analyses step are taken from
the states the store gives each analysis (`docs/specs/core/store.md`,
"The state of an analysis"); with the diversity alone they are its
state. The reasons about the column of the populations are the
diversity's words, "Why it cannot run" of
`docs/specs/analyses/diversity.md`, given with their kind by
`populationsNeeds` of that module, so that one condition has one text.
The reasons of core name the file as each application does, the
metadata file here and the traits file in association, as the owner
decided on 25 September 2026, so the stepper and the step say the same
name. The metadata file is required in stage 2, and so the first To do
of Individuals is not "Optional"; from stage 4, when the owner decided
the file becomes optional, that To do becomes "Optional", with the
reason "Without it, every individual is in one population."

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
| | read | "panel.nei · 200 individuals", the individuals of the file, and "· 1,200 variants" once a calculation has counted them (`numVars` of the source) |
| the filters | | "no filter", "1 filter", "2 filters": the filters of the variants and of the individuals |
| the metadata file | none | "no metadata file" |
| | being read | "reading pops.csv" |
| | read failed, or individuals missing, or the column of the populations not in it | "pops.csv could not be read", "12 individuals missing from pops.csv", "column pop not in pops.csv" |
| | read, no column chosen | "one population" |
| | read, a column chosen | "3 populations by pop": the number of populations `populationsToRun` of `docs/specs/analyses/diversity.md` gives, or `populationsOf` while the variants file is not read, the individuals with an empty cell in no population |

A count is written with a comma between groups of three digits, as core
writes them (`docs/specs/core/project.md`). A name from the user's
files is shown escaped as core shows it. The mockup of the owner's
summary line said how many variants the filters kept, "48,210 of
1,203,554 variants kept (3 filters)", which the walking skeleton does
not know (**Open 1**).

### The notice

The notice says what the last change removed from the screen and which
calculations it stopped or will stop, with the action that reverses the
change (`docs/specs/core/store.md`, "The notice, and the calculations it
stops"). It is a toast, the one the store gives, `notice` of its state,
or none. It has two buttons: the action, **Undo** after a command or a
redo, **Redo** after an undo, as the owner decided on 25 September 2026,
taken from `cause.kind`; and **Close**, which calls
`store.dismissNotice()`.

**It has no timer.** It stays until the next command, undo, redo or
opening replaces it, or until it is closed, as the store has it. A
notice that went away by itself would take its Undo from a user who is
slow to reach it, with the keyboard or a screen reader (2.2.1), and
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
follows. A name is the title of the analysis's panel, "Diversity". A
command's description starts the sentence with its first letter made
upper case when nothing comes before it.

| the cause | the notice |
|---|---|
| a command | "Diversity removed because the missing data filter changed · Undo" |
| a command that changes the load, with a calculation running and no result to remove | "The calculation of Diversity stopped because a new variants file was loaded · Undo" |
| a command, with calculations stopped | "Diversity removed and the calculation of Diversity stopped because a new variants file was loaded · Undo" |
| a command, with a calculation left behind and nothing removed | "The missing data filter changed. The ongoing calculation of Diversity will be stopped unless you undo the change · Undo" |
| an undo | "Undone: the missing data filter changed. Diversity removed · Redo" |
| an undo that changes the load | "Undone: a new variants file was loaded. The calculation of Diversity stopped · Redo" |
| a redo, with a calculation left behind | "Redone: the missing data filter changed. Diversity removed. The ongoing calculation of Diversity will be stopped unless you undo the change · Undo" |

The third row is the case of one analysis whose result of the old
settings is removed and whose calculation of newer ones is stopped
(`docs/specs/core/store.md`, "The cases"). The pattern is the owner's
mockup, "3 results removed because the MAF filter changed · Undo", and
the store's, "2 calculations stopped because a new variants file was
loaded · Undo".

When the user starts a calculation with the Run button of an analysis
while the notice has calculations left behind, the store stops them
first (`docs/specs/core/store.md`, "The notice, and the calculations it
stops"); the notice loses its sentence on them and keeps the rest, or
goes if nothing is left, and the status region says so (below).

### The status region

A `<div role="status">` in the shell, empty and present from the first
drawing of the page, since a region added at the moment of its message
is not read by every screen reader (`react.md`, "Announcements"). What
is written into it is read out without moving the focus (4.1.3).

It is written by the **announcer**, `createAnnouncer()` of
`src/ui/shell/status.ts`, which the entry makes once
(`docs/specs/entry.md`) and the shell gives the screens. `announce(text)`
empties the region at once and writes the text 100 ms later, with any
other text announced in those 100 ms after it, joined by a space. The
region is emptied first because a screen reader reads a text written
again only if it changed, and the pause, because React draws two changes
made in the same moment as one. 100 ms is decided here, to be checked
with VoiceOver.

Two kinds of announcements go into it.

**The first are made from the state of the store**, by
`announcementsOf(before, after)`, which the entry calls at every change
of the store with the state before and the state after. They are of
what the user did not do at that moment, and may not be looking at. A
calculation is followed by the id of its request, `runId` of the
`RunView`s in `runs`; a read by its load id, and for the individuals
file its options of the CSV compared by their values:

| what changed, from one state to the next | the announcement |
|---|---|
| a request is in `runs` that was not | "Diversity: calculating." |
| in the same change, calculations left behind, which the current project no longer asks for, went to being stopped | added to it: "The earlier calculation of Diversity was stopped.", or "The 2 earlier calculations were stopped." |
| a request that was current and not being stopped left `runs`, and its analysis is `done` under its key | "Diversity: done.", "Diversity: done, 2 warnings.", followed, for an opened project, by the line its panel shows under the result, `checkVerdictText` of its `check` or, when that is `null`, `uncomparedText`, when either gives one: "Diversity: done. The same numbers as in the project file: this variants file gives the results the project was saved with." |
| the same, and its analysis is in the state `error` under its key | "Diversity could not be calculated. The Analyses step says why." |
| a request that was current and being stopped left `runs` | "Diversity: stopped." |
| the variants file of the same load went from pending to read | "panel.nei read: 200 individuals, ploidy 2.", and, when the metadata file is read, the sentence of the check below |
| the same, to failed | the reason `projectNeeds` gives, which names the file: "popnei could not read bad.vcf: … Load a variants file in the Variants step." |
| the metadata file of the same load and options went from pending to read | "pops.csv read: 360 rows, 5 columns.", and, when the variants file is read, the sentence of the check: "All 342 individuals found." or "12 individuals of panel.nei are not in pops.csv." |
| the same, to failed | the reason `individualsNeeds` gives |
| the warning of a reopened project that differs from its file, `identityWarning` of `projectFile.ts`, appeared, or is there with another load of the variants file than before; while that load is being read, at the end of its read instead | "Warning: " and its words, those of the Variants step (`docs/specs/steps/variants.md`, "A project file opened"), after the read's own announcement |

The comparison with the project file is part of the end of the
calculation, as the owner decided on 26 September 2026 (point 11 of the
review of work package 9): it is the one line of the result that says
whether the variants file given is the one the project was made with,
and a user of a screen reader, who may be on another step, would
otherwise not learn of it.

Nothing else is announced from the state. So a result that comes back
from the cache after an undo is not announced, since no request ended;
a calculation left behind that ends, or is stopped by Close, is not,
since its result is not on the screen; an undo back to a load already
read, and an opening, are not announced as reads, since no read of the
same load went from pending. The warning of a reopened project is
announced from the state, and not by the Variants step, so that it is
heard also when an Undo or a Redo pressed on another step brings it
back, and when a second file that differs replaces the first in one
command. While its load is being read it waits, and is said once, after
the read, with the words the read gave it: a warning said at the pick
would be heard before the read that follows it, and again, longer, when
the read adds a difference. It is not announced again when a change of
a filter leaves it as it was. A calculation that a change of the load
stopped is in the notice, which is not written here, since the toast of
React Aria is read out by itself.

**The second are said by an event handler**, through `announce`, which
the shell gives the screens:

| what the user did | the announcement |
|---|---|
| an undo or a redo that makes no notice, with the button or the keyboard | "Undone: the missing data filter changed.", "Redone: the missing data filter changed." |
| Save of the dialog of Save project | "panel.popnei.json was handed to the browser to download." (below, "Saving") |
| a project opened | "Opened panel.popnei.json." followed by the text of `askedFileText` when it gives one (below, "Opening") |
| a file that a step did not load, several dropped at once | the text the step shows for it, whose words are the step's (`docs/specs/steps/variants.md` and `individuals.md`, "Its words") |

Without the first, a user of a screen reader who pressed Ctrl+Z would
hear nothing. An undo or a redo is said before what its change
announces from the state, "Undone: a new variants file was loaded.
Warning: …", since it is what the user did and the rest follows from
it; the announcer puts it before the texts its change announced, and
after those announced before it, so that presses in quick succession
keep their order.

### The error bar

An error of our own code that no error boundary sees, a component that
catches what throws while React draws the part of the screen under it,
is shown in a bar at the top of the page, above the header, as the owner
decided on 25 September 2026 (`react.md`, "Errors";
`docs/specs/entry.md`, "The errors nothing else shows"). It is drawn in
a root of its own, outside the application's, with a status region of
its own, so that it stays, with its Save, when an error while the shell
was drawn has emptied the application's root. The bar says:

"The application met an error of its own: ‹message›. Your project is
intact: save it, then reload the page."

or, when the error came before the store was made, as the page started,
and there is no project to save: "The application met an error of its
own as it started: ‹message›. Reload the page."

It has three buttons:

- **Save the project**, which saves through the saving of the entry,
  under the name `proposedName` gives and with no dialog, since the
  dialog of the header may be what failed, and announces it in the bar's
  own status region. It is not there when there is no store. Decided here,
  not by the owner: the words of the bar tell the user to save, and this
  keeps that possible when the header is gone. When the project cannot
  be written, because writing it throws a defect of our code, as a check
  number that is not finite does, the bar counts that error with the
  others and its status region says "The project could not be saved: the
  application met an error of its own as it wrote the file. Reloading the
  page would lose the project.", since the bar's own words tell the user
  to reload once it is saved. After any save that could not write the
  project, this one or Save of the dialog of Save project, the bar's
  first line ends "Your project could not be saved; copy the details
  and report them." in place of "Your project is intact: save it, then
  reload the page.", until a save succeeds, as the owner decided on 26
  September 2026 (point 6 of the review of work package 9), so that the
  bar no longer tells the user to do what has just failed. The bar
  learns it from `saveFailed` of the saving (`docs/specs/entry.md`, "The
  saving"). What its status region said after its Save or its Copy the
  details is shown only while `saveFailed` is what it was when the words
  were written, and is emptied when it changes, so that the bar never
  says two things that disagree: after the bar's Save failed and Save of
  the header then succeeded, the first line says to save and reload,
  and the status no longer says that reloading would lose the project;
  after the bar's Save succeeded and Save of the header then failed, the
  first line says the project could not be saved, and the status no
  longer says that it was handed to the browser.
- **Copy the details**, which copies, for a report of the bug, the
  message and the stack of every error kept, where each came from, the
  address of the page, the versions of the application and of popnei,
  and the browser; not the project. The bar's status region then says
  "The details were copied." When the page has no clipboard, which the
  browser gives only to a page served over HTTPS or from the machine
  itself, the development server opened from another machine among
  them, or the browser refuses the copy, the bar says "The details could
  not be copied. Select them in the box below and copy them." and shows
  them in a box of text that can be selected.
- **Close**, which empties the bar; a later error brings it back. The
  focus goes to the `<h1>` of the step on screen, or, when the
  application's root was emptied, to the start of the page.

**The errors after the first.** The bar shows the text of the first
error only, since it is the likeliest cause of the rest. Each error that
follows while the bar is up adds one to a count after the text, "1 more
error followed it.", "3 more errors followed it.", and its own text is
not shown, since an error thrown at every drawing would add a line at
each and push the page down. Copy the details copies them all, the
first 20 whole. The owner's decision left this to this spec.

The bar is `role="alert"`, which a screen reader reads at once, since it
interrupts what the user was doing (`react.md`, "Errors"); its element
is on the page, empty, from the first drawing, and only its first
error's text is in the alert, so that each new count is not read out
again. When the first line changes once the bar is shown, because a
save failed or succeeded, the changed line is drawn in the same place
outside the alert, which is left empty until the bar is closed, so that
the whole sentence is not read out again: after the bar's own Save, its
status region says what happened, nearly in the same words.

### Saving

**Save project** opens a dialog of the page, as the owner decided on 25
September 2026: a React Aria `Dialog` headed "Save the project", with,
under its heading, the line "The page cannot always ask you before it
is closed, and on an iPad or an iPhone it never can: save the project
before you leave." (below, "Before the page is left"), and a
text field, "File name", that starts at the name `proposedName` of the
saving gives, `projectFileName` of `src/core/projectFile.ts`: the name
of the variants file with its ending replaced, `panel.popnei.json` for
`panel.nei` or `panel.vcf.gz`; for an opened project with no variants
file yet, the name of its reference's; and `project.popnei.json`
otherwise. Its buttons are "Save" and "Cancel". Save calls `save(name)`
of the saving, which writes the project file, `docs/functionality.md`
section 9, from the state of the store, the analyses of the
application, the version of the application and the date, and hands it
to the browser to download under that name, `.popnei.json` added when
it does not end so, and put in place of a `.json` it ends in, so that
`run1.json` gives `run1.popnei.json` and not `run1.json.popnei.json`
(`docs/specs/entry.md`, "The saving"); the dialog
closes and the focus goes back to Save project. It can be used at any
time, a read under way included. `writeProjectFile` refuses no project;
a check number that is not finite is a defect of our code, which it
throws, and the error bar shows it. The dialog closes before the file is
written, so that it is not left open over the bar. A field left empty
keeps Save disabled, with the description "Give the file a name.",
which describes the field of the name too: the Tab key skips a disabled
button, so a user of the keyboard, whose focus is in the field, would
otherwise never hear it.

A download is handed to the browser and gives the page no sign of how
it ended: the browser saves it with its downloads, or asks where, or the
user cancels its dialog. So the page never says the file was saved, as
the owner decided: the status region says "panel.popnei.json was handed
to the browser to download." The option not taken was the browser's own
Save As dialog, `showSaveFilePicker`, which tells the page that the file
was written, in Chrome and Edge only, at the cost of a second way of
saving and a test of each.

**Before the page is left.** A reload or a closed tab loses the project,
since nothing of it is kept in the browser. So while the project has
changed since the page opened, since a project file was last opened, or
since the last Save, the present project another object than that one
or a result that ended since then, which the file saved lacks (point 8
of the review of work package 9, decided by the owner on 26 September
2026), the page asks the browser to confirm before it is left, with the
browser's own words, which a page cannot change. The owner decided the
question on 25 September 2026, and a Save stops it until the next
change, as the owner settled with the approval of this spec, though
after a Save the page does not know that the file was kept. A read recorded is a change too: the source of the file now
holds what the worker read, which a file saved before it would not hold,
so the page asks even when the user only picked a file.

The browser does not always let the page ask. Safari on an iPad or an
iPhone never shows the question, and the browsers show it only once the
user has clicked or typed in the page, so not after a file only dropped
on it. The line under the heading of the dialog of Save says so, the
place the user reads when they save, as the owner decided on 26
September 2026 (point 9 of the review of work package 9): the review
recommended the help of Save project, which the walking skeleton does
not have.

### Opening

**Open project…** is a button that opens the file picker of the system,
for a file ending in `.json`. What follows, with the texts of
`projectFileErrorText` of `src/core/projectFile.ts`, of which some name
the file and some, "The project file cannot be opened: …", do not:

1. A file larger than 64 MB, `MAX_PROJECT_FILE_BYTES` of
   `projectFile.ts`, is not read, since the page would hold it whole:
   the text of `tooLarge"
2. The page reads the file as text, with `File.text()`. A file the
   browser cannot read, moved or changed since it was picked, has no
   text of `projectFile.ts`, which reads only text: "panel.popnei.json
   could not be read: ‹the browser's message›. Choose it again."
3. `read` of the saving reads the text, which is `readProjectFile` with
   the application and its analyses that the entry gave the saving. A
   file it refuses: the text of its error.
4. When the project has changed, as above, or calculations are in
   flight, a dialog asks first: "Open panel.popnei.json? It replaces the
   project on the page, and an opening cannot be undone. To keep it,
   answer Keep the current project and save it first.", with, when
   calculations are in flight, "The ongoing calculations will be
   stopped." Its buttons: "Open panel.popnei.json" and "Keep the current
   project". The dialog has no Save of its own, so its words name the
   button that leads to one, as the owner decided on 26 September 2026
   (point 5 of the review of work package 9); they said "Save the
   project first to keep it." before. The store stops the
   calculations at the opening, since the screen asked
   (`docs/specs/core/store.md`, "Commands and events").
5. `store.open(project)`, which starts a new history and clears the
   notice; the saving takes the opened project as the one to compare
   with; the hash goes to `#variants`, where the step asks for the
   variants file the project was made with; the focus goes to the `<h1>`
   of Variants once the dialog has closed, also when the hash was already
   `#variants`; and the status region says "Opened panel.popnei.json.",
   followed by the text of `askedFileText` when the file names a
   variants file.

The file is read and checked before the dialog, so that the user is not
asked to give up their project for a file that does not open. A large
file can still be being read when the user opens the dialog of Save: a
project file of 39 MB, of 3 million individuals, took 0.4 s from its
pick to its opening in Chromium and 2.3 s in WebKit, on the built site,
on 26 September 2026. Its answer, the opening, the question or the
dialog of the refusal, waits until that dialog has closed, so that no
project replaces the one the dialog is saving and no dialog opens over
another; a dialog it then opens gives the focus back to Open project…
when it closes, as after any pick. Choosing
the same file again opens it again. The errors of steps 1 to 3 are in a
dialog headed by the name of the file, "panel.popnei.json was not
opened", so that every text is read with the file it is about, with a
button OK, which takes the focus and gives it back to Open project… when
it closes.

## The states

The shell is not an analysis: it runs nothing itself and shows the state
of the steps and of the store. Its states:

| state | what the user sees | what they can do |
|---|---|---|
| empty | the page just opened: Undo and Redo disabled; the stepper at Variants, To do, Individuals, To do, Analyses, Locked with "Load a variants file in the Variants step."; the summary "No variants file · 1 filter · no metadata file"; no notice | pick a file in the step, open a project |
| locked | cannot happen for the shell as a whole: it waits for nothing. What cannot be done yet says why in words: a step that cannot go on, with its reason; Undo or Redo with nothing to take back, disabled with no reason needed | — |
| ready | files loaded: the stepper with the state of each step; the summary with the file, its individuals, the filters and the populations | move between steps, undo, redo, save, open |
| running | a read or a calculation: Reading on its step, or Running on Analyses; the summary "Reading panel.nei"; its start and end in the status region | all of the above; opening asks and says the calculations will stop |
| done | a result on screen: Analyses Done | all of the above |
| results removed | the notice, with its words and Undo or Redo; Analyses at Results removed | reverse the change, close the notice |
| error | the error bar; a step at Problem, or Analyses at Failed, with the reason; a project file that could not be opened, in its dialog | save, copy the details, close the bar; fix what the reason says |

## What it sends and reads

It reads, from the state of the store, `project`, `undo`, `redo`,
`notice`, `analyses`, `runs` and `popneiVersion`, each with its own
selector, a function that picks one part of the state so that a
component is drawn again only when that part changes (`react.md`,
"Reading core"); `projectNeeds`, `individualsNeeds` and `askedFileText`
of the project, and `populationsNeeds`, `populationsToRun` and
`populationsOf` of the diversity; and the step from the hash, with `useStepHash` of
`react.md`. It sends `store.undo()`, `store.redo()`,
`store.dismissNotice()` and `store.open(project)`, and calls the saving
of the entry. It holds, as state of the screen, whether a dialog is
open; nothing of the project.

The words are made by pure functions of the shell, in
`src/ui/shell/words.ts`, from the state of the store, so that Vitest, the
runner of the tests that need no browser, checks them in node. `title`
gives the title of an analysis's panel, from `src/ui/analyses/panels.ts`:

```ts
// StepId, "variants" | "individuals" | "analyses", is imported from
// src/core/apps.ts, which lists the steps of the application.

export type StepStatus =
  | "todo" | "reading" | "problem" | "done"                          // Variants and Individuals
  | "locked" | "running" | "removed" | "failed" | "ready";           // Analyses, and done

/** The state of each step and its reason, by the table of the stepper. */
export function stepStates<R>(
  s: AppState<R>, title: (id: AnalysisId) => string,
): readonly { readonly id: StepId; readonly status: StepStatus; readonly reason: string | null }[];

/** The summary line, its parts joined by " · ". */
export function summaryLine(p: Project): string;

/** The words of the notice, without its action; the words of the action;
    and what the action does, which the button dispatches on. */
export function noticeText(
  n: Notice, title: (id: AnalysisId) => string,
): {
  readonly text: string;
  readonly action: "Undo" | "Redo";
  readonly reverse: "undo" | "redo";
};

/** The announcements made from two states, in the order of the table; [] when none. */
export function announcementsOf<R>(
  before: AppState<R>, after: AppState<R>, title: (id: AnalysisId) => string,
): readonly string[];
```

`stepStates` and `announcementsOf` take a state of any type of result,
`AppState<R>`, since they read no result, only the kind and the key of
each analysis's state and the count of its warnings; the entry passes
its `AppState<JobResult>`, and the tests states with the results of
`TEST_DEFS`.

The announcer, in `src/ui/shell/status.ts`, a small store that the
status region reads with `useSyncExternalStore`, as the screens read the
store of core:

```ts
export function createAnnouncer(): {
  announce(text: string): void;
  getState(): string;                               // the text of the region now
  readonly subscribe: (listener: () => void) => () => void;
};
```

## Its words

Every text of the shell is above, in its section, final. The words of
the page before the application has started, the start guard's among
them, are `docs/specs/entry.md`'s, "The page". The help drawer is not in
the walking skeleton (stage 8).

## Accessibility

- **The keyboard** goes through the page in this order: the error bar
  and its buttons, when it is up; the header, "popnei web", Undo, Redo,
  Open project…, Save project; the three links of the stepper; the step.
  The notice is last in the order of the page, and F6 (fn+F6 on a Mac)
  reaches it from anywhere but a dialog (below, "The dialogs"), as React
  Aria gives its region of toasts. On a Mac keyboard F6 is a media key,
  so the notice is reached with fn+F6, or with the Tab key; the owner
  decided on 26 September 2026 (point 10 of the review of work package
  9) that where the notice is explained it is written "F6 (fn+F6 on a
  Mac)". The screen of the walking skeleton names F6 nowhere, so the
  words are written here, and go into the help drawer when it comes, in
  stage 8. The owner reached the notice with F6 in Firefox on 26
  September 2026; Chrome and Safari are to be tried by the owner; when it goes while
  it had the focus, the focus goes back to where it was before. Escape
  pressed in the notice gives the focus back to where it was before F6 or
  the Tab key took it there, and leaves the notice as it is, since
  closing it stops the calculations it left behind; F6 and Shift+F6 keep
  the focus in the notice, which is the one region F6 moves between.
- **The landmarks**: the header is `<header>`, the stepper `<nav>`
  labelled "Steps", the step `<main>`, the notice a region labelled
  "Notice"; they let a screen reader skip to the step, so no link to skip
  the header is needed (2.4.1).
- **Nothing covers what has the focus**: the notice sits over the bottom
  of the page, which keeps room under what the Tab key reaches
  (2.4.11, `.claude/skills/coding/css.md`, "Focus").
- **Announced without moving the focus**, through the status region:
  the two tables above (4.1.3). The notice through the toast, the error
  bar as an alert.
- **The focus is never dropped** (2.4.3): Undo and Redo hand it to each
  other when they are disabled; after an opening it goes to the `<h1>`
  of Variants; after Close of the error bar, to the `<h1>` of the step.
- **Not colour alone**: a state of a step is a word and a symbol; the
  current step a mark; the error bar its words (1.4.1).
- **The dialogs** of opening and of Save take the focus, the dialog of
  Save on its field of the name with the name selected, so that typing
  replaces it, and a click into the field afterwards putting the cursor
  where it was clicked, and give it back to the button that opened them, and Escape closes them, as React Aria's
  `Dialog` does; while one is open, the keyboard's Undo and Redo do
  nothing, wherever the focus is, and the notice, drawn under the
  dialog, is out of the reach of F6, the Tab key and a screen reader,
  since its Undo or Redo would change the project behind the question
  the dialog asks; once the dialog closes, F6 reaches it again.
- **A screen reader**, VoiceOver with Safari at least, is tried on the
  stepper, the notice, the status region and the error bar, which are new
  widgets of this stage (`react.md`, "Accessibility review").

## How it is checked

With Vitest, in node, at the functions of `words.ts` and at the
announcer, the states of the store written as literals of `AppState`
with the analyses of `TEST_DEFS` of `src/core/testSupport.ts`:

- **`stepStates`**: a state for each row of the table of the stepper,
  and for the order of its rows: an analysis running while another is
  removed gives Running.
- **`summaryLine`**: the empty first project gives "No variants file · 1
  filter · no metadata file"; the example above, with 1,200 variants
  counted, gives "panel.nei · 200 individuals · 1,200 variants · 1 filter
  · 3 populations by pop"; a case for each row of its table.
- **`noticeText`**: each row of the table of the notice, from a literal
  notice, with the text asserted whole; three removed and two stopped,
  counted.
- **`announcementsOf`**: a pair of states for each row of the first
  table of the status region, and for the end of a calculation with
  each of the lines of the comparison with the project file; and none for a result back from the cache
  after an undo, a calculation left behind that ends, an undo back to a
  load already read, an opening, a read of the metadata file recorded
  for options other than those of the present project, and the warning
  of a reopened project while its load is being read, which the end of
  the read announces after the read.
- **The announcer**, with the fake timers of Vitest: the same text
  announced twice empties the region and writes it each time; two texts
  within 100 ms are written together; the text of a change goes before
  what the change announced and after what came before it, and two
  changes keep their order. **`undoOrRedo`**: an undo that brings the warning of a
  reopened project back says "Undone: …" before the warning.

With Playwright, in the three engines, against the built site, as the
flow of the walking skeleton and beside it (`.claude/skills/coding/testing.md`):

- The links of the stepper change the step and the title; the back
  button goes to the step before; the focus is on the `<h1>` of the new
  step.
- A page just opened is left with no question; after a pick of a file,
  leaving it raises the browser's question, which Playwright sees as a
  `beforeunload` dialog.
- Save project opens the dialog with "panel.popnei.json" in its field
  after `panel.nei` is loaded, and the line under its heading as its
  description; Save downloads `panel.popnei.json`, the
  text of the status region says so, and the focus is on Save project;
  a name changed to "run1" downloads `run1.popnei.json`, and one
  changed to "run1.json" downloads `run1.popnei.json` too; Cancel downloads
  nothing; leaving the page just after the Save raises no question, and
  after a change that follows it, the question.
- Open project… with `notes.txt`, which is not JSON, shows the text of
  `notJson` in a dialog, and the focus is back on Open project… once it
  is closed; with a file above 64 MB, the text of `tooLarge`; with the
  saved file, after a change, the question, and after it the Variants
  step with the focus on its `<h1>`.
- Undo pressed with the mouse until nothing is left: the focus is on
  Redo.
- F6 reaches the notice after a change that removed the diversity, and
  not while the dialog of Save is open, where the keys that would press
  its Undo leave the project as it is.
- An error posted into the page, as `docs/specs/entry.md` does it, shows
  the bar; Copy the details in Chromium without the permission of the
  clipboard shows the box of text.
- axe finds no violation of WCAG 2.2 at level AA in each state of the
  table of the states.

## Left for the running application

The layout of the header and where the name of the application goes;
the symbols of the states of the steps, and whether the steps are
numbered; where on the bottom the notice sits and its width; how the
box of the details looks.

## What this spec relies on in the other specs of stage 2

Each was approved by the owner on 25 September 2026 and says what is listed here.

- `docs/specs/core/projectFile.md`: `writeProjectFile`, which refuses
  nothing; `readProjectFile`, `projectFileErrorText` and
  `MAX_PROJECT_FILE_BYTES`; `askedFileText`; `projectFileName`; and the
  question before an opening left to this spec.
- `docs/specs/steps/variants.md` and `individuals.md`: the `<h1>` of
  each step is "Variants" and "Individuals"; their descriptions of the
  commands are those of their tables, "a new variants file was loaded"
  among them; the ends of their reads are announced by the shell from
  the state, with the words of this spec, and not by the steps; what
  they announce themselves goes through `announce`.
- `docs/specs/analyses/diversity.md`: the title of its panel,
  "Diversity", its `<h2>`, in `src/ui/analyses/panels.ts`, under the
  `<h1>` "Analyses" of the Analyses step; the start, the end and the stop
  of a run announced by the shell, with the words of this spec;
  `populationsNeeds`, for the stepper; `populationsToRun` and
  `populationsOf`, for the summary line.
- `docs/specs/steps/individuals.md`: `individualsCheck` of
  `src/core/project.ts`, which gives the individuals found and missing,
  a function that spec adds to the approved `project.ts`
  (`docs/specs/stage-2-open-points.md`, "Changes to approved files").
- `docs/specs/entry.md`: it makes the announcer, calls `announcementsOf`
  at every change of the store, draws the error bar in its own root with
  the store once it is made, and gives the saving, `createSaving`.

## Open points

The open points of the eleven specs of stage 2 are gathered in
`docs/specs/stage-2-open-points.md`. Two of the three this spec had were
decided by the owner on 25 September 2026, and are written above as
decided: three steps, and no Export step (point J there), and Save as a
dialog of the page (point K), with its question before leaving as
above. One stays:

1. **How many variants the filters keep, in the summary line.** The
   owner's mockup has "48,210 of 1,203,554 variants kept (3 filters)".
   The walking skeleton does not know it: the variants kept are counted
   by a calculation that reads the whole file, and what each filter kept
   comes with the Variants step whole, in stage 3
   (`docs/specs/steps/variants.md`, "Not in this spec"). Meanwhile, the
   line gives the variants of the file once counted and the number of
   filters, "1,200 variants · 1 filter"; in stage 3 the kept count joins
   it, as the mockup has it. The owner left it as it is on 25 September
   2026 (point L).

## Not in this spec

- What each step shows, and the panel of the diversity:
  `docs/specs/steps/` and `docs/specs/analyses/diversity.md`.
- The format of the project file, and the comparison of a reopened
  project with its variants file and its check numbers:
  `docs/specs/core/projectFile.md`, shown by `docs/specs/steps/variants.md`
  and by the panel of each analysis.
- The Export step, with the report and the Python script: stage 6.
- The help drawer and its texts, and the setting of the theme: stage 8
  and after; the walking skeleton follows the theme of the system.
- The page, its start, its roots and the saving: `docs/specs/entry.md`.
