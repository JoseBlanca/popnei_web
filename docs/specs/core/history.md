# Undo and redo

Draft, 24 September 2026, not yet approved by the owner. There is no code
yet. The history keeps the projects the user has had, so that an undo
gives back the previous one and a redo the one after it. Because a result
is found by the key that a project gives it (`docs/architecture.md`,
section 3), an undo also brings back the results of the previous project,
with no calculation, as long as the cache still holds them. This spec
develops sections 2 and 6 of `docs/architecture.md` and depends on
`docs/specs/core/project.md`.

## What it does

The user sees the history as Undo and Redo, in the header, on Ctrl+Z and
Ctrl+Shift+Z, and as the Undo of the notice "3 results removed because
the MAF filter changed · Undo" (`.claude/skills/coding/react.md`). An undo
that gave back a project equal to the previous one but not the very same
object in memory would make every screen draw itself again, since the
screens tell what changed by whether an object is the same one, compared
with `===`; and a history that forgot what the
workers read would show "reading the file" again after a redo of a pick
whose file was read long ago.

- **A step is a command of the user.** Each entry holds the project the
  command made and the description of the command, the words that finish
  the notice, "the MAF filter changed" (`docs/specs/core/store.md`), so
  that an undo or a redo can say what it undid.
- **A command that changes nothing makes no step**: the command returns
  the project it was given (`docs/specs/core/project.md`), and `commit`
  returns the history it was given.
- **A command after an undo drops the redo**, since the projects there
  followed from one the user has left.
- **Opening a project file starts a new history.** Ctrl+Z does not undo the
  opening, and the work before it is gone unless it was saved; the screen
  asks before opening, "Open a project and lose this one?"
  (`.claude/skills/coding/react.md`). The owner decided it on 24 September
  2026. The option not taken was to make the opening a step of undo, which
  would have brought back the work before it at no cost.
- **A record of a read changes every project of the history that holds
  that load**, and makes no step (`docs/architecture.md`, section 6, step
  3). A pick of the variants file is a step; the read of the file that
  the calculation worker sends back completes that step, so it goes into
  the project of the pick and into every project after it that still
  holds that load, in the past, the present and the future. A redo of the
  pick then brings the file back read, and an undo of the pick removes the
  source whole. A project that does not hold the load is left as it is,
  the same object.
- **The history is bounded**: it keeps the last 200 steps of undo, and
  drops the oldest beyond them (**Open 1**, below).

## The TypeScript interface

The history is a plain value, as the project is, and every function gives
a new one.

```ts
export interface Entry {
  readonly project: Project;
  readonly description: string;  // the command that made it; "" for the first
}

export interface History {
  readonly past: readonly Entry[];   // oldest first
  readonly present: Entry;
  readonly future: readonly Entry[]; // the next redo first
  readonly maxSteps: number;         // the steps of undo kept, which every function keeps
}

/** The steps of undo kept; the oldest beyond them is dropped. */
export const MAX_UNDO_STEPS = 200;
```

A history with one project and nothing to undo: the first project of a
page, and an opened project file. It keeps at most `maxSteps` steps of
undo, `MAX_UNDO_STEPS` in the application, and a smaller number in a test.

```ts
export function startHistory(p: Project, maxSteps: number): History;
```

A command of the user gives a new project, which becomes the present with
the description of the command; the future is dropped. When `next` is the
present project itself, `commit` returns `h`.

```ts
export function commit(h: History, next: Project, description: string): History;
```

An undo makes the last of the past the present, and puts the present first
in the future; a redo does the opposite. Each returns `h` itself when
there is nothing to undo or redo. What was undone is the description of
the present before the undo, and what was redone that of the present after
the redo, which the store gives to the notice.

```ts
export function undo(h: History): History;
export function redo(h: History): History;
```

A record applied to every project of the history. `f` is one of the
records of `docs/specs/core/project.md`, with its arguments, and returns
the project it was given when there is nothing to record in it. An entry
whose project `f` leaves as it is stays the same object, and when no
project changes, `mapProjects` returns `h`.

```ts
export function mapProjects(h: History, f: (p: Project) => Project): History;
```

## The cases

- **An undo past the first project** returns `h`; the store then changes
  nothing and tells no screen.
- **A record for a load that no project holds any more**, a read that
  came back after the user undid the pick and made another command, which
  dropped the pick from the future: `mapProjects` returns `h`.
- **The 201st step** drops the oldest entry of the past. What the user
  loses is the chance to undo that far back; the project and the results
  are those of the present.

## How it runs

The projects of the history share every part that the commands between
them did not change, since a command keeps the references of what it did
not touch (`docs/specs/core/project.md`). So 200 steps that each changed a
threshold hold the individuals table once, not 200 times. A step that
loads a new individuals file holds a new table; the largest, 10,000 rows,
is kept by every step until the steps that hold it are dropped.

## How it is verified

With Vitest, at `commit`, `undo`, `redo`, `startHistory` and
`mapProjects`, on projects frozen deeply.

- `undo(commit(h, p, "d")).present` is `h.present` itself, compared with
  `toBe`, because the screens tell what changed by comparing references.
- From p0, commit p1, commit p2, undo: the present is p1 and the future is
  [p2]; commit p3: the future is empty, and a redo returns the same
  history.
- `commit(h, h.present.project, "d")` is `h`.
- 201 commits from `startHistory(p0, 200)` leave 200 entries in the
  past, the first of them the project of the first commit; the bound is
  kept by `undo`, `redo` and `mapProjects`.
- `mapProjects` with `recordVariantsRead` of the load `a` on a history
  whose past holds a project without a variants file and two with the
  load `a`, pending: the first entry is the same object, the two others
  are read, the descriptions are kept; the same with the load `b` returns
  `h`.
- **Properties, with fast-check**, which draws random sequences of
  commands of `docs/specs/core/project.md` with valid arguments, and a
  bound from 1 to 10, so that sequences longer than the bound are drawn
  often. With a sequence no longer than the bound, undoing every step
  gives back the first project, the same object, and redoing them all
  then gives back the last one, the same object; with a longer one,
  undoing all it can gives back the project of the step the bound left
  first. A command after an undo empties the future, and the past never
  holds more entries than the bound.

## Open points

1. **How far back undo goes.** 200 steps is a guess at more than a session
   of work needs, and costs little memory, since the steps share what they
   did not change. The owner may prefer no bound, which risks holding many
   tables of 10,000 rows after many loads of individuals files, or a
   smaller one. Meanwhile, 200.

## Not in this spec

- When the store commits, and what it does with the description:
  `docs/specs/core/store.md`.
- Keeping the history across a reload of the page: nothing is kept, and
  the warning before the tab closes is for the screens of the shell.
