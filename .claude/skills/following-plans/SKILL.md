---
name: following-plans
description: How an approved implementation plan of popnei_web is carried out. Use it when the owner asks to run, execute, implement or continue a plan under docs/plans/. The session is an orchestrator: it works in a worktree and a branch of the plan, sends each task or work package to a subagent, checks what comes back, has each work package reviewed, stops for the owner to try the screens the plan names, keeps a work report, and goes on until the plan is done or the owner is needed. It never merges into main.
---

# Following an implementation plan

The session that runs a plan is an orchestrator. It does not write the
code. It sends each piece of the work to a subagent, checks what comes
back, and decides what happens next. The reason is its context: a plan
takes many hours of work, the details of each task would fill the
orchestrator's context long before the end, and an orchestrator that has
forgotten the start of the plan decides badly at its end. What it keeps
is the plan, the state of the work, the decisions and the report.

It goes from one work package to the next until the plan is done. It
stops when it needs the owner: for a decision, and at the screens the
plan names for the owner to try, which are the stops the plan expects.

Ported from popnei's skill on 24 September 2026, before any code of
popnei_web existed, and to be revised after the walking skeleton.

## Before the first task

1. The plan is approved by the owner, and its specs are settled. If not,
   say so and stop.
2. The worktree and the branch, named after the plan:

       git worktree add .claude/worktrees/<plan> -b plan/<plan> main

   from the local `main`, and then `EnterWorktree` with that path. All the
   work of the plan happens there, and `main` is not touched. A new
   worktree has no `node_modules`: run `npm ci` there, and
   `npx playwright install` when its browsers are missing.
3. Check what the plan says has to be in place, by running it and not by
   reading it: `node --version`, the release of popnei that
   `package.json` names, the checks of the `coding` skill on the commit
   the work starts from. When something is missing, tell the owner what
   is missing and what would put it in place, and stop. Do not build it
   on the side.
4. Start the work report, described below, and commit it with the plan's
   state changed to under way.

## One task

Send the task to a subagent, `general-purpose` on the model the owner
uses for coding, with a prompt that stands on its own, because the
subagent knows nothing of the session:

- the path of the worktree, and that all its work happens there, on the
  branch that is checked out. It is not given `isolation: "worktree"`,
  which would start it from `main` in a tree of its own;
- the path of the plan, the number of its task, and that it reads the
  whole work package of that task there. The work package is not copied
  into the prompt: the subagent can read the file, and a copy per task
  fills the orchestrator's context with its own plan;
- the paths of the specs, the module spec and, for a screen, the screen
  spec, and of `docs/architecture.md`, which it reads itself;
- the skills to follow: `coding`, with the files of it the task touches,
  `react.md`, `css.md`, `charts.md`, `worker.md`, `testing.md`; and
  `writing` for its comments and its commit message;
- what is already there from earlier tasks that it builds on;
- what the orchestrator knows and the code does not show: an open point
  the owner answered, what the owner asked for in the last round of a
  screen;
- to commit its work when the checks pass, one commit for the task, and
  not to touch the plan or the report. A change to a spec that the task
  needed is a commit of its own before the commit of the code;
- for a task that changes a screen, to run `npm run screens`, look at
  the pictures of the states it changed, and give their paths;
- what to send back, in under 300 words: what it built, the commit, the
  last line of each check, the paths of the screenshots, what it did
  differently from the task and why, and any question it could not
  settle.

Tasks that the plan marks as able to run side by side go to several
subagents at once only if they touch different files, and only one of
them runs the build, the dev server or Playwright at a time, since they
write to the same `dist/` and ports. One tree has one writer per file.

Several small tasks of one work package can go to one subagent in one
prompt. A task never goes together with a task of another work package.

## Checking what comes back

What a subagent says is a claim. A claim that the next step rests on is
checked, by looking at results and not at code:

- `git log` and `git status` in the worktree: the commit is there and the
  tree is clean.
- The checks of "Before the work is called done" of the `coding` skill,
  run by the orchestrator, reading only their last lines: the format, the
  typecheck, the lint, `npm test`, the build, `npm run test:e2e` in the
  three engines, and the dependency on popnei. A runner that selected no
  test can exit with 0, so read the counts of the summary line.
- What the task said would be there: the named tests exist and pass.
- For a screen, look at the screenshots, with `Read`, which shows an
  image. It costs some context, and it is the only way the orchestrator
  sees what the owner will see: a panel cut off, a state missing, a
  screenshot of an error page.
- What it did differently from the task: is it small, or does it change
  what a later task builds on?

When the work is not right, the same subagent gets it back with what is
wrong, through `SendMessage`. When it fails a second time, a fresh
subagent gets the task with what was learned. A third failure is a
reason to stop and ask.

Then tick the task in the plan, note it in the report, and commit both.

## The end of a work package

1. Run each deliverable's check yourself, as the plan gives it, and put
   the command and the result in the report. A deliverable that does not
   pass is not done, whatever the tasks said.
2. Have the work package reviewed, as the `code-review` skill says, over
   its commits, with the screenshots of its screens. The review follows
   the size of the work, but `spec`, `tests` and `stale` always run, and
   for a screen `accessibility` and `ux` too, since those are what the
   owner cannot check.
3. Evaluate the findings yourself, as that skill says: this is a
   judgement and it is the orchestrator's. The fixing is delegated like
   any task, to the subagent that wrote the code when it is still there,
   with the verdict on each finding, test first. It may answer that a
   finding does not hold, with evidence.
4. Run the checks and the deliverables again after the fixes.
5. For a work package with a screen, the owner tries it, as below.
6. Write the work package into the report and go on to the next one.

## When the owner tries a screen

The plan names the screens the owner tries before they are accepted.
The owner is a population geneticist, not a web developer: they judge
the screen as its user, and the reviewers have judged the code.

1. Give them what they need to look, in a reply as CLAUDE.md describes:
   the screenshots of each state, with their paths and what state each
   shows, and how to open the application from the worktree, `npm run
   dev` and the address it prints, with the test file to load in it.
   Say what the reviewers found and fixed on the screen, in a line, and
   what you want them to judge: the order of the steps, the wording,
   what is shown first.
2. Go on meanwhile with the work packages that do not stand on the
   screen.
3. Each change they ask for is sorted before it is done. A change to the
   screen is a round: the screen spec is changed first, in a commit of
   its own, then the code, by a subagent, with the screenshots taken
   again, and shown to the owner. A change that reaches `src/core/`, the
   worker, what an analysis computes, or `docs/functionality.md`, is not
   a round: say so, with what it would change, and it becomes a task or a
   work package with its spec, as a change to the plan.
4. When a round changed the markup after the review, run the
   `accessibility`, `react` and `ux` reviewers again on the screen.
5. The work package ends when the owner says the screen is accepted.
   Tick the box, and write in the report how many rounds it took and what
   changed in each, in a line per round.

## Changing the plan

A plan is written before the work, and the work knows more. The
orchestrator changes the plan without stopping for the owner when the
change is small:

- a task split in two, two merged, tasks put in another order;
- a task added because something needed was not foreseen, inside what
  the work package gives;
- a file or a module other than the one the task named;
- a deliverable's check replaced by another at least as strong, because
  the first could not be run.

Every change goes into the plan, where git keeps the old text, and into
the report with its reason.

It stops for the owner when the change is not small:

- a deliverable dropped, or its check made weaker, a Playwright test
  that runs in fewer engines among them;
- a work package added or removed, or the plan growing beyond what it
  said was in;
- anything that changes a spec: what the user sees or can do, a default,
  an open point. The orchestrator does not answer an open point for the
  owner, it follows its "meanwhile";
- a spec and the code, or a spec and what popnei gives, contradicting
  each other so that a task's approach is wrong;
- a dependency that the plan and `docs/technology.md` do not name;
- a finding of a review whose fix is the owner's, when the rest of the
  plan rests on it;
- a task that failed three times;
- anything that cannot be undone, outside the worktree, a push or a
  deploy among them.

Before stopping, do the work that does not depend on the answer. When
stopping, leave the tree with the checks passing and everything
committed, bring the report up to date, and ask as the `writing` skill
says a decision is asked for: the options, what each gives and takes, a
recommendation.

## The work report

`docs/reports/<plan>.md`, in the worktree, written while the work goes
and not at the end. It follows the `writing` skill: it is for the owner,
who was not there.

After each work package, a short section:

- Did it finish as planned? The deliverables, each with the command that
  checked it and what it gave.
- What was changed in the plan, and why.
- What the review found that mattered, what was fixed, and which findings
  were not taken, with the reason in a line.
- For a screen, the rounds with the owner, a line each, and where the
  last screenshots are.
- What the owner should know: something learned about popnei's wasm
  package, a browser that behaved differently, a part of a spec that
  proved thin, a risk for what comes next.
- How the work went. This one is not for the owner but for whoever next
  revises a skill or writes a plan, and its heading says so. What goes in
  it is what would change a skill, the shape of a plan or the size of a
  task: a task sent twice and what made it fail the first time, a skill
  that misled with the sentence that did it, a check that could not be
  run. The tokens a task's subagent used, set beside what its review and
  its fixes cost, say what a task of that size costs. Not a log.

When the plan is done, the top of the report gets what the owner reads
first: whether the plan is done, what exists now that did not, what is
left open, and what is asked of them, which is at least the merge. Every
number in the report comes from a command that was run, and the report
goes to the `first-reader` before the owner is told.

## When the plan is done

1. Every task ticked, every screen accepted, every deliverable checked,
   the plan's final check run, the state of the plan changed to done, the
   report finished, all committed on the branch.
2. Tell the owner, in a reply as CLAUDE.md describes them: the plan is
   done, on branch `plan/<plan>`, with the report's path and what it asks
   of them.
3. The orchestrator does not merge into `main`, does not push to it and
   does not deploy the site. Those orders are the owner's. When they give
   one, do it as they say, and run the checks on `main` after.
4. After the merge, clean up: `ExitWorktree` with `keep`, then
   `git worktree remove .claude/worktrees/<plan>` and
   `git branch -d plan/<plan>`, and the worktrees of the reviewers. When
   something on the branch was not merged, a screen variant the owner
   turned down for now, nothing is removed: say what it is and where.

## When a session ends before the plan

The state is in the repository, not in the session: the ticks in the
plan, the report, the commits on the branch. A new session enters the
worktree with `EnterWorktree` and its path, reads the plan and the
report, runs the checks, and goes on from the first box that is not
ticked. When that box is a screen the owner was trying, it asks the
owner where they are with it.
