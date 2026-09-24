---
name: code-review
description: How code is reviewed in popnei_web and what is done with the findings. Use it after the tasks of a work package of an implementation plan are committed and before the work package is reported as done, or when the owner asks for a review of a commit, a branch or a module. The session that asks for the review sends one reviewer subagent per category, each with a fresh context, then evaluates every finding and fixes the ones that hold.
---

# Code review

The writer of a piece of code cannot review it, for the same reason the
writer of a text cannot: they know what it was meant to do and read that
into it. So the review is done by subagents that start with nothing but
the code, the specs and the `coding` skill, one for each category below,
and the session that wrote the code, or that the owner asked, is the
orchestrator: it sends them out, and then it acts on what they find.

In popnei_web the review carries more than in popnei. The owner is a
population geneticist and a Python and Rust developer, with no
experience of the web: they cannot tell that a dialog traps no focus,
that an effect shows the result of the previous file, or that an API is
missing in Safari 16.4. So the categories include the web ones that
nobody else in the project would catch, and those are not optional.

Ported from popnei's skill on 24 September 2026, before any code existed.
The categories are to be revised after the walking skeleton, with the
findings that it gives.

## Before sending the reviewers

1. Fix the scope: a commit or a range of commits, and from it the files
   and the functions that changed. The review is of what changed and of
   what calls it and is called by it. A defect seen elsewhere goes at the
   end of a reviewer's report as seen outside the scope, unless it shows
   a wrong or stale result, and then it is a finding like any other.
2. Find the spec items, module and screen, and the task of the plan the
   change was made from. A reviewer needs them to tell a defect from a
   decision.
3. Run the checks of the `coding` skill once and keep the output: the
   typecheck, the lint, Vitest, Playwright, the build with the sizes of
   its files. A reviewer does not spend its time finding what ESLint
   prints.
4. For a change to a screen, have the screenshots of its states, as the
   `writing-plans` skill lists them, and their paths.
5. Note what the reviewers cannot know from the code: an open point the
   owner has answered, what the owner asked for in a round of a screen, a
   later task that will add what looks missing. Most wrong findings come
   from missing context, and a line in the prompt avoids them.

## The categories

Each is described in `categories.md`, beside this file, with what to
look for, the evidence a finding needs, and what is not a finding. Send
every one that applies, in parallel, in one message.

| category | applies when |
|---|---|
| `spec` | always: the code against the module and screen specs and `docs/functionality.md` |
| `tests` | always: whether each test can fail, and the numbers the change claims |
| `stale` | always: anything that could show a result whose inputs changed |
| `errors` | always: what the user sees when a file, the worker or the wasm fails |
| `api` | the change adds or alters types, names, defaults, the messages of the worker or comments |
| `architecture` | the change crosses the layers of `docs/architecture.md`: core, worker, charts, ui |
| `react` | the change touches `src/ui/` |
| `accessibility` | the change touches what the user sees or operates |
| `ux` | the change touches what the user sees: states, notices, warnings, help, numbers shown |
| `browser` | always before a plan is done; for a work package, when it uses a browser API, CSS or a syntax that is new, or a request |
| `bundle` | the change adds a dependency, an import of the wasm, a new entry or a lazy load |

When in doubt, send it. A reviewer with nothing to report costs little.

The subagent is `code-reviewer`. Its prompt gives the category, the
commit under review, the files in scope, the paths of the spec items,
the output of the checks, the paths of the screenshots, and the context
of step 5.

`spec`, `tests`, `browser` and `accessibility` run the code, the tests,
the build or the application in a browser, so they are sent with
`isolation: "worktree"`, each in its own tree, because two agents that
build or serve one checkout overwrite each other's `dist/` and ports. A
worktree starts on `main` and not on the commit under review: the prompt
tells the reviewer to check the commit out, confirm it with
`git rev-parse HEAD`, and run `npm ci` before anything else. The other
categories only read, and share the checkout.

## Acting on the findings

When the reports are in, the orchestrator acts on them. It does not hand
the owner a list.

A finding is to be taken very seriously. The reviewer read the code
without knowing what it was meant to do, which is how its next
maintainer will read it, and often it ran the case. In the web
categories it is also the only expert the project has. A finding is not
set aside because it is inconvenient, because the step was nearly done,
or because the writer remembers meaning something else.

A finding is not the law either. A reviewer lacks context, misreads a
line, assumes an input that cannot occur, or suggests a fix worse than
another. So each finding is evaluated, by the orchestrator, on its
evidence:

1. Check it yourself. Open the line, run the case, press the keys it
   names in the browser, read the part of the spec it cites, look at the
   screenshot.
2. Decide what it is:
   - It holds. Fix it. For a wrong or stale result, a test that fails
     first, then the fix, as the `coding` skill says. The suggested fix
     is a suggestion.
   - It holds and the fix is the owner's: it changes what the user sees
     or can do, or a spec is what is wrong. It becomes an open point of
     the spec or a question to the owner, with a recommendation.
   - It holds and does not belong in this step: a GitHub issue, written
     as the `writing` skill says, so that it is not lost.
   - It does not hold. Say why, with what was checked and what the
     reviewer did not have. A reason is one the reviewer would accept if
     it saw it.
3. When a serious finding can neither be confirmed nor refuted, send the
   reviewer the missing context and ask again, or ask the owner. A
   finding about a wrong or stale result, or about a user who cannot
   reach a control with the keyboard, is never closed as not holding on
   a doubt.

Fix one finding at a time, with the smallest change that settles it. A
fix that fails its checks is reverted whole. When all are handled, run
the checks of the `coding` skill again, all of them, and take the
screenshots again when a fix changed a screen.

Two or three reviewers reporting the same thing from different sides is
evidence, not repetition: handle it once and count it as more certain.

When a finding shows that the `coding` skill, a spec or the plan allowed
the defect, that document is corrected too. A web finding that the owner
could not have caught is the case this is most for: the rule goes into
the file of the `coding` skill it belongs to, so that the next writer
knows it before the next reviewer.

## What the owner gets

A reply in chat, as CLAUDE.md describes replies: what was reviewed, what
was found that mattered and is now fixed, each finding that was not
taken with its reason in a line, what became an issue, and what needs the
owner. A web finding is said in what it does to a user, "a user of the
keyboard cannot close the help drawer", and not in the name of the
criterion alone. No report is saved. The commit message of a fix carries
its why, and the issues carry what is left.
