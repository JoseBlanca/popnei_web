---
name: writing
description: How prose is written in popnei_web. Use it before writing or revising anything a person will read, a document under docs/, a spec, an implementation plan, a skill, a doc comment, a commit message, a GitHub issue or a pull request, and the text the applications show their users, the labels, the warnings, the errors and the Markdown of the help drawer. Chat replies follow the same principles, and the ones that matter most there are in CLAUDE.md.
---

# Writing

This skill is the writing skill of popnei, at
`/Users/jose/devel/popnei/.claude/skills/writing/SKILL.md`, with the
readers, the examples and the forms of popnei_web. Its principles were
tested there, on the cases under `cases/` beside that file.

## The reader

What is written in popnei_web is read by one of three people.

The first is the owner of the project, a population geneticist who
programs in Python and Rust and wrote popnei. They know the genetics, the
statistics that popnei uses, and the decisions recorded in `docs/`. They
have not built a web application. So every word of the web is a name
they do not have until the text says what it is and why it is here: a
hook, a component, a render, the DOM, a CSS Module, a bundle, a web
worker, ARIA, a focus ring, a screen reader. The sentence that explains
it says what it does in this application, "a web worker, a second thread
of the tab, where the calculations run so that the page does not freeze",
and not what it is in general. The same holds for a problem of the web:
"the button is greyed out and cannot be reached with the Tab key, so a
user who does not use a mouse never learns why the analysis cannot run"
tells the owner what is wrong; "the disabled button is not focusable"
does not.

They were not in the session: they did not see the files that were
opened, the commands that were run, or the names that came up along the
way. So they need a bit of context before the content: what was being
worked on, what the question was, and where it sits in the project. A
sentence or two is usually enough.

The second reader arrives later, a contributor or another session of the
assistant. They may know the web and not the genetics, and they have
only the page.

The third is a user of the applications, who reads their labels, their
warnings and their help. Their own section is at the end.

The first two read in order to do something: to decide, to build, or to
check. A text is good when its reader gets through it once, without
asking a question and without opening anything else, and can then do what
they came to do.

`docs/technology.md` and `docs/architecture.md` are the voice to match:
facts and numbers, each choice with its reason and the option not taken,
headings that name their subject, almost no bold, and no sentence about
the text itself.

## Before writing: the sketch

The order of a text is decided before its sentences. A text whose order is
found while writing uses its terms before it defines them and gives its
reasons before its subject. So write a sketch first, a few lines that are
not part of the text:

1. The subject in one sentence, with each option or thing named by what it
   is: "whether a change that removes a result from the screen deletes it,
   or keeps it in the cache for an undo".
2. What the reader should know or be able to do when they finish, in the
   words you would use with a colleague across the table. When that cannot
   be said yet, the problem is in the thinking and no sentence will fix
   it.
3. The terms the text will need, each with its definition, in the order
   they will be used: "the key: a hash of everything a result was
   calculated from".
4. The points, one line each, in the order the reader needs them. A point
   that leans on another comes after it.
5. What is left out, and where it goes.

Then write from the sketch. The opening of the text is the first two lines
of the sketch, in full sentences. When the text is written, find the first
use of each term in line 3 and check that its definition comes before it,
as a sentence of the text. A meaning that the reader could work out from
what came before does not count as a definition.

## The principles

### Write the contents, not the name of the category

"The store holds the state management" gives the reader nothing to use.
"The store holds the current project, the history of the projects before
it and the cache of the results" does. State, logic, machinery,
infrastructure, plumbing and layer are names of bags. Write what is in the
bag. When the list cannot be written, the thing is not yet understood.

A problem is written as what can go wrong, not as the rule it breaks:
"the panel keeps its own copy of the threshold, so after an undo the
field shows the old value and the result the new one". That says what the
user would see. "It duplicates state, against the architecture" says
neither.

An adjective in the place of a number is the same fault: fast, small,
heavy, responsive, most. The repair is to put the fact in: "the files
module adds 0.58 MB gzipped, about as much as the wasm package of popnei,
0.63 MB". Taking the adjective out and leaving the rest leaves a sentence
that still says nothing.

### A number comes with what it was measured on

The dataset, the browser and its version, the machine, the build, a
development server or the built site, and the date when the measurement is
not from the work being reported. A time in a browser means little
without the browser: the same wasm can run at different speeds in Chrome
and in Safari. The date is the one the session was told, not one worked
out from the dates already in the files: in popnei, on 24 September 2026,
sixteen dates one day ahead were found, written by sessions that had each
inferred the same wrong day. A writer who does not know the date asks.

A comparison has both of its sides in the same units, and says which side
is the better one when the reader could doubt it. A number carried over
from another document keeps all of this.

A trade-off gives up one kind of thing to get another, bytes to download
for code to maintain, a second thread for simplicity. Each kind is named,
and each option gets its value in both. A word keeps one meaning through a
sentence: "costs" that means megabytes in one half and lines of code in the
other has two meanings.

### Context before the name

A term that does work in a sentence is explained before that sentence or
inside it. The reader lacks five kinds of names:

- Labels made up during the session: step numbers, codes of findings, the
  nickname of a component. The reader needs what the thing is.
- Names from the code. That a function is called `keyInputs` does not
  make it a word the reader has. Say what it is, the parts of the project
  an analysis depends on, and then the name can be used.
- Words of the web, as said under the first reader.
- Ordinary words that mean something narrower here. A step, an analysis,
  a result and a project mean particular things in
  `docs/architecture.md`, and a text that leans on them uses them in that
  sense and no other.
- Notation, and a label in a table, which is a first appearance too: the
  words go in the text before the table.

One name for each thing. Before a new name is added, count the ones the
document already uses for it. The things of the genetics keep the names
of popnei's `docs/glossary.md` and of `docs/functionality.md`: an
individual, not a sample; a population, not a group; the variants file,
not the VCF, when a `.nei` file would do as well. The things of the
application keep the names of `docs/architecture.md`.

### What the reader came for goes first

In a document, what it is about and what it decides. In a section, what
the thing does, in words, before the type or the signature. In an issue,
the finding. In a reply, the answer to the question that was asked. The
work usually happened in the opposite order, the answer was found last,
and the temptation is to tell it in the order it happened.

Order carries importance. What matters most is first or has a paragraph of
its own, and then no sentence needs to say that it matters.

### Only what the reader can use

For each sentence, what can the reader do with it? These go out:

- The story of how the work went.
- Sentences about the text: "in one paragraph", "this section describes".
- Sentences about the reader's reaction: "surprisingly", "notably", "the
  key point is".
- Answers to an objection that nobody raised.
- Sentences that only give a verdict, "there is a catch", and leave what
  is good or bad to the next sentence. The sentence that holds the fact
  carries the verdict too.

The test is to delete the clause. When no fact is lost, it stays deleted.

Two things stay although they look like the story of the work: a trap the
next person would fall into, and a measurement that closed an option.
They stay where the next person will look for them, the document or the
issue about that subject.

A few texts have a second reader as well as their own, as the work report
of a plan does, read by the owner to decide whether to merge it and by
whoever next revises a skill. What the second reader needs goes in one
place at the end, under a heading that says who it is for, and the first
reader is told there that they can stop.

### Everything at its true strength

A choice is written as a choice, with the goals it serves and what would
have to be true for another option to win. It is not "forced" or "the only
way". A design is explained by its reason, and what is wrong with the
alternative is not yet a reason.

What was seen is kept apart from what was assumed or read somewhere.
"Works in the browser" means nothing until it says which browsers were
opened: "seen working in Chrome and Firefox on macOS; not opened in
Safari". A test that passes is not a screen that was seen, and a text
says which of the two happened. A claim that holds only in part is given
with the condition under which it holds, "for files up to 2 GB", "with a
mouse". Somewhat, relatively and in general tell the reader that there is
a limit and hide where it is.

### Plain sentences that stand on their own

Short sentences with active verbs and ordinary words. A sentence is not
shaped to sound balanced or sharp. The plain version is usually longer,
and it is the one to write.

Every count has its noun and its set: "three of the seven states", never
"three of the seven". Every pronoun has an antecedent the reader can see,
and a "this" that could point at two things gets its noun. After an edit,
read the sentence before and the sentence after, because a deletion can
take an antecedent with it.

A list for parallel items, a table for measurements and for the states of
a screen, prose for reasoning. A heading names the subject of its section.
Bold marks the terms that a list defines and nothing else.

## The forms

- **Documents under `docs/`.** The opening paragraph says what the
  document is, its date, what it decides and where the related documents
  are.
- **Specs and plans** follow the `writing-specs` and `writing-plans`
  skills, which add what goes into them.
- **Skills and agents.** Each rule with its reason, because a rule without
  one is followed where it does not fit and dropped where it does. A
  decision is dated, "decided on 24 September 2026", so that it can be
  found and revised.
- **Doc comments.** What the item is or does in the words of the domain,
  the shape of each value, and what a caller must know. How it is
  implemented stays out unless the caller sees it.
- **Commit messages.** A lower case subject that says what changed, and a
  body with the why and the numbers. Nothing about the session.
- **GitHub issues.** The title states the finding or the task. The body
  says what was seen, in which browser, on what data and how to see it
  again, what it means for the applications, and what is proposed or asked.
- **Pull requests.** What changed for a user of the applications first,
  then what changed in the code, how it was checked, the tests that were
  run and the browsers the screens were seen in, and what is not done.
- **A request for a decision**, in any form. What is being decided, with
  the options spelled out; what each one gives and takes; the
  recommendation, in a full sentence; what is not known; what happens next
  in each case. It is ready when the reader can answer without asking
  anything back. What the writer can decide alone is decided and not
  asked.

## The text of the applications

The users of the applications are population geneticists and breeders,
who know their data and their field and may not program. They read a
label, a warning or a page of help in the middle of their work, to decide
what to do next. The principles above hold, and the principle of
`docs/functionality.md` sets the tone: nothing that misleads without
warning. The applications neither hide a problem nor raise one that is
not there.

- **A label** names the thing in the words of the field and of
  `docs/functionality.md`: "Minimum proportion of called genotypes", not
  "missing threshold". A number field says its unit or its range.
- **A warning** comes from the data, and says what was found in it, what
  it does to the result, and what the user can do: "Population P3 has 12
  individuals, fewer than the 20 its diversity needs at each variant, so
  it has no values. Lower the minimum, or merge it with another
  population." A warning with no action says so: nothing to do, read the
  result with this in mind.
- **An error** says what happened and how to put it right, in plain words
  and with the names from the user's own files: "12 individuals of the
  variants are not in the metadata file: ind_031, ind_044 and 10 more. Add
  them to the file, or remove them from the variants with a filter of
  individuals." No "invalid", no "oops", no apology, nothing of the code:
  a stack trace, NaN, a key, the cache, wasm, the worker.
- **A notice** of a change says what the change did and how to undo it:
  "3 results removed because the MAF filter changed · Undo".
- **The help drawer** says, for one step or analysis, what it gives, with
  what defaults and why, when its result should not be trusted, and where
  to go for more, the Python API of popnei among the places. It is the
  same Markdown as the documentation pages, so it is written once.

The text of a screen is read aloud by a screen reader to a user who
cannot see it, and without its colours to a user who cannot tell them
apart. So no text leans on where a thing is or on its colour, "the
button on the right", "the values in red"; a link or a button says where
it goes or what it does, never "click here"; and a warning says it is a
warning in words, as well as by its colour and its icon (WCAG 2.2,
success criterion 1.4.1).

## Before handing a text over

The writer cannot see what is missing from the page, because they know it.
So a document, a spec, an issue or the text of a screen goes to the
`first-reader` subagent, which gets only the text, one sentence that says
who reads it, what for and which documents they already know, and three
to five questions that the reader should be able to answer once they have
read it. It returns what it understood the text to say and to ask, its
answers to the questions, the names it did not have, and the sentences it
could not follow.

Compare its summary and its answers with what was meant. Where they differ
the text is wrong, not the reader. Fix what it reports, and send the text
again when the fix was large.

A commit message or a doc comment does not go to the subagent. Read it
once more against "Only what the reader can use" and "Context before the
name".

## When a text is sent back

The text is corrected, and so is this skill. Find the principle that
allowed the failure, or that is missing, and revise it where it stands.
The case, the situation, the text that was sent and the owner's words, is
saved under `cases/` beside this file. The cases are for trying out
changes to the skill and are not read when writing.

The skill does not grow by one entry for each failure. A correction
becomes a new paragraph only when no principle covers it, and each
principle keeps one example. About 320 lines, its size when it was written, is the size to stay near, a
figure to get oriented by and not a limit.

## Sources

- The writing skill of popnei, `/Users/jose/devel/popnei/.claude/skills/writing/SKILL.md`, and its cases.
- Web Content Accessibility Guidelines (WCAG) 2.2, W3C Recommendation of 12 December 2024: https://www.w3.org/TR/WCAG22/
- GOV.UK Design System, error messages: https://design-system.service.gov.uk/components/error-message/
