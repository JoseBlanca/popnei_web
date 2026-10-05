---
name: building
description: How a piece of popnei_web is built, from the owner's choice of what to build or fix to the report of the working screen. Use it whenever the owner asks to build, add, change or fix something in the applications, and to continue such a piece. The session coordinates: it makes a short plan, sends the implementation, the code reviews and the fixes to subagents, checks what comes back, looks at the screen in a browser, and reports to the owner, who tries the result in the running application. It stops for the owner only for the decisions listed here. It never merges into main.
---

# Building a piece

The owner decided on 5 October 2026 how the applications are built: in
small pieces, each one tried by the owner in the running application
before the next. A piece is something a user can do or see that they
could not before, or a defect fixed: "a page that opens a VCF or a
`.nei` file and shows what it holds". The pieces follow the use cases of `docs/use-cases.md`. A fix, or a
piece the owner asks for that no case covers, is built all the same;
when it is a new thing a user comes to do, it is added to that document
as a case, in the same branch.

The way it replaces, a spec for each screen and a plan of many work
packages written before any screen existed, gave 15,000 lines of screen
specs, and showed the owner each screen only at the end of a plan. When
the owner then wanted it otherwise, much had been built on it.

The prose of every plan, report and reply follows the `writing` skill.

## The loop

1. **The owner and the session decide what to build or to fix**, in
   chat. The session says which use case and which of its steps the
   piece serves, and what a user will be able to do once it is built.
2. **The implementation**, coordinated by the session, which sends the
   work to subagents:
   1. the plan of the piece, below;
   2. the implementation, phase by phase;
   3. the code review of each phase and the fixes of the findings that
      hold.

   A large piece goes through 2.2 and 2.3 once for each phase of its
   plan.
3. **The report to the owner**, who tries the piece in the running
   application. What they ask to change is the next turn of the loop.

The session works on its own between 1 and 3. It stops for the owner
only in the cases of "When to stop and ask". The owner judges the result
in the screen. The session makes sure that nothing reaches the owner
that the reviewers, the tests or a look at the screen would have caught.

## The session coordinates, and does not write the code

The session sends the implementation, the reviews and the fixes to
subagents, and keeps the plan, the state of the work, the decisions and
what goes into the report. The reason is its context. A piece takes
hours of work, and the details of every file would fill the session's
context before the end. A coordinator that has forgotten the start of
the piece decides badly at its end.

## Before the first edit

1. A worktree and a branch for the piece, before anything is written,
   the plan included, from the local `main`:

       git worktree add .claude/worktrees/<piece> -b <piece> main

   then `EnterWorktree` with that path. All the work of the piece
   happens there. A new worktree has no `node_modules`: run `npm ci`, and
   `npx playwright install` when its browsers are missing.
2. The checks of the `coding` skill on the commit the work starts from,
   so that a failure found later belongs to the piece. When one fails
   already, say so in the report and do not fix it inside the piece
   unless the piece needs it.

## The plan of the piece

A short file, `docs/plans/<piece>.md`, written by the session before the
code, usually one or two pages. It is written for the subagents that
build the piece and review it, and for the session that continues the
piece if this one ends. It holds:

- **What the user can do when it is done**, and the use case and the
  step of it that the piece serves.
- **What it stands on**: the modules of the code it uses as they are and
  those it changes, found by reading the code, and the functions of
  popnei it calls, from the TypeScript declarations of the popnei
  package.
- **The design**: the modules it adds or changes, and, where data
  crosses between `src/core`, `src/worker`, `src/charts` and `src/ui`,
  the TypeScript types of what crosses. Where there was a real choice,
  the options and the reason for the one taken, in a few lines. The
  invariants of `docs/architecture.md` hold. When the piece needs one of
  them changed, that is a stop.
- **The phases**, usually one to three, each something that works and
  can be checked: what it builds, its tests, and, for a screen, the
  states to look at in the browser.
- **What is left out**, and where it goes.
- **What was done**, added as the work goes: each phase with its commits,
  the checks, the review with the findings not taken, and the decisions
  made along the way. The report to the owner is written from it.

The plan goes to the `architecture-reviewer` subagent when it changes an
interface between the layers, an invariant of `docs/architecture.md`, or
what the site depends on. The session acts on its findings as the
`code-review` skill acts on those of a code review. A change of the
architecture is also a stop for the owner. A plan that changes none of
those three is not reviewed, and does not wait for the owner.

`docs/architecture.md`, and `docs/functionality.md` when the piece
changes what the application does, are brought up to date in the same
branch. They are the lasting record of the applications. The plans are
the record of how each piece was built.

## When a piece needs a spec first

Most pieces are small, and their plan is enough. A piece that is complex
gets a spec, as the `writing-specs` skill says, and a plan of work
packages, as the `writing-plans` skill says. Both are reviewed, by the
`spec-reviewer`, the `architecture-reviewer` and the `first-reader`, and
approved by the owner before any code is written. A piece is complex
when a mistake in it would give wrong or stale results in many cases
that no screen shows: the keys of the results, undo, the project file,
the messages to the worker. A piece is also complex when it needs more
than three phases, or when the owner asks for a spec. The session
proposes it to the owner in step 1, with the reason. Once they are
approved, the work packages of that plan are the phases of this loop.

## The implementation

Each phase goes to a subagent, `general-purpose`, on the session's own model unless the owner has
named another, with a prompt that stands on its own, since the
subagent knows nothing of the session:

- the path of the worktree, and that all its work happens there, on the
  branch checked out. It is not given `isolation: "worktree"`, which
  would start it from `main` in a tree of its own;
- the path of the plan and the phase to build, which it reads there,
  with the use case, and the spec when the piece has one;
- the skills to follow: `coding` with its topic files for the layers the
  phase touches, and `writing` for the comments, the text of the screen
  and the commit messages;
- what the session knows and the code does not show: a decision of the
  owner, what the owner asked for after trying the last round;
- to commit its work in commits that each pass the checks, and not to
  edit the plan;
- for a phase that changes a screen, to take the screenshots of the
  states it changed, as `testing.md` says, and give their paths;
- what to send back, in under 300 words: what it built, its commits, the
  last line of each check, the paths of the screenshots, what it did
  differently from the plan and why, and any question it could not
  settle;
- to stop and report, without working around it, when the phase finds
  that the plan or the architecture does not hold.

Two subagents work in one tree at once only on different files, and only
one of them runs the build, the development server or Playwright at a
time, since they share `dist/` and the ports. At most three agents run
at once, so that the owner's machine stays usable.

## Checking what comes back

What a subagent says is a claim. A claim that the next step rests on is
checked by its results, not by reading the code:

- `git log` and `git status` in the worktree: the commits are there and
  the tree is clean.
- The checks of "Before the work is called done" of the `coding` skill,
  run by the session, reading their summary lines and the counts in
  them. A runner that selected no test can exit with 0.
- For a screen, the session looks at the screenshots itself, with
  `Read`, state by state. It costs context, and it is the only way the
  session sees what the owner will see: a field under another, a state
  missing, a warning nobody can read, a screenshot of an error page.
- What the subagent did differently from the plan: is it small, or does
  it change what a later phase builds on?

When the work is not right, the same subagent gets it back with what is
wrong, through `SendMessage`. After a second failure, a fresh subagent
gets the phase with what was learned. A third failure is a stop.

## The review

Each phase is reviewed as the `code-review` skill says, over its commits,
with the screenshots of its screens. The review is not where the loop
saves time. The owner decided on 5 October 2026 that the pieces are
small so that they can be tried early, and that the code is of high
quality, which the review is the guard of. So every category of that
skill that applies is sent, and "when in doubt, send it" holds. The
session evaluates the findings itself, and does not take one only
because a reviewer wrote it. It sends the fixes to a subagent, test
first, and runs the checks and takes the screenshots again after them.

## When to stop and ask

The session stops for the owner in these cases, as the owner decided on 5
October 2026:

- **A choice that is hard to undo**: an interface between the layers or
  an invariant of `docs/architecture.md` changed, a dependency added, the
  format of the project file or of a file the application writes.
- **Something popnei does not have.** It is not worked around in the
  application, because the numbers of the applications are popnei's,
  verified there.
- **A decision about what the user sees or can do that the use cases
  and `docs/functionality.md` do not settle, and that matters.** It
  matters when the owner could well choose otherwise and the choice
  changes what a user can do or understands. Examples: a default, which
  analyses a screen offers, whether a step is required, what a warning
  tells the user to do. The wording of a label, the order of two fields,
  or where a button goes is decided by the session, said in the report,
  and changed when the owner tries the screen.
- **A phase that failed three times**, or a finding of a review that the
  rest of the piece rests on and whose fix is one of the above.
- **Anything outside the worktree**: a push, a merge, a deploy, an issue
  in a repository.

Before stopping, do the work that does not depend on the answer. Leave
the tree with the checks passing and everything committed, and ask as
the `writing` skill says a decision is asked for: the options, what each
gives and takes, and a recommendation.

## The report

When the piece is done, a reply to the owner, as CLAUDE.md describes
replies:

- what a user can now do, and how the owner tries it: the command to
  start the application from the worktree, the address, and the test file
  to open, with the states worth going through;
- the browsers the screens were seen in, and those they were not seen
  in;
- what the review found that mattered and is now fixed, and each finding
  not taken, with its reason in a line;
- the decisions the session made that the owner may want otherwise;
- what was left out, and what was not done or did not work.

## After the owner tries it

A change the owner asks for is the next turn of the loop, on the same
branch: a line added to the plan, the change by a subagent, the review
of the categories it touches, the screenshots again, and a short report.
A change that reaches what the application computes, or
`docs/functionality.md`, is said to the owner as such before it is
made, with what it changes.

The branch is merged into `main` when the owner says so, and not before.
The session does not push or deploy without the owner's order either.
After the merge, `ExitWorktree` with `keep`, then `git worktree remove
.claude/worktrees/<piece>` and `git branch -d <piece>`.

## When a session ends before the piece

The state is in the repository: the plan with its "What was done", and
the commits on the branch. A new session enters the worktree, reads the
plan, runs the checks, and goes on from the first phase not done. When
the owner was trying the piece, it asks them where they are with it.
