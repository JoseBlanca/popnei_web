# React

How the screens of `src/ui` are written. Read it before writing or
changing a component. The TypeScript rules are in `typescript.md`, and
the layers and the checks in `SKILL.md`, beside this file; the styles
are in `css.md`; how a plot is drawn is in `charts.md`; the tests are in
`testing.md`.

React here only draws the screens. What a project is, what a result is,
undo, the cache, the worker, all of it is in `src/core`, plain TypeScript
(`docs/architecture.md`, sections 2 to 7). A screen reads the state of
core and sends it commands, and holds nothing else but what belongs to the
screen. Every rule below follows from that, or from making the
applications usable with a keyboard and a screen reader, which is the
default and not an extra.

## Versions

- React 19 (19.3.0 in September 2026) and react-dom of the same version,
  as a client application: `createRoot` in the entry file of each page,
  no server rendering, no server components, no framework.
- React Aria Components 1.x (1.21.1 in September 2026), the one package
  `react-aria-components`, not the separate `@react-aria/*` hooks. The
  components are the stable part of React Aria; the hooks under them are
  for building new widgets, which we do not do.
- No React Compiler for the walking skeleton, as the owner decided on 24
  September 2026 (below).
- `eslint-plugin-react-hooks` with its `recommended` config, which in
  version 7 holds the Rules of Hooks, the dependency check of effects and
  the rules the compiler needs. The owner took it on 24 September 2026
  (`docs/technology.md`, section 2).

Components are functions. The one class is the error boundary, because
React has no function form of it.

## The React Compiler: off for the walking skeleton

The owner decided on 24 September 2026 to leave it off for the walking
skeleton, and to decide again after it, with a measurement of what the
renders cost (`docs/technology.md`, section 2). While it is off, a
`useMemo` or a `useCallback` is written only where a slowness was
measured, and the rest of this file reads "the compiler keeps it" as "it
is made again on each render". What follows is the case for it, kept for
that second decision. The compiler, stable since October 2025,
memoizes components and values at build time, which is what `useMemo`,
`useCallback` and `memo` do by hand. react.dev recommends it for new
applications, and Vite's template offers it.

Why yes: when to memoize by hand is a judgement that takes experience of
React to make, it is the most common source of both slow screens and
stale values, and the owner would have to review it. With the compiler
the code is plain, and the question does not come up. It is a
development dependency only, but not a small one:
`babel-plugin-react-compiler` 1.0.0; `@rolldown/plugin-babel` 0.2.4, first published in February 2026,
which `@vitejs/plugin-react` 6 needs to run Babel; and `@babel/core`, a
required peer of that plugin, which create-vite's template of the
compiler installs with `@types/babel__core`. `@vitejs/plugin-react`
6.1.1 also offers `compiler: true` through an optional Rust port,
`oxc-transform-react`, which was not assessed. And it can be removed: the
code stays ordinary React, and without the compiler it renders the same,
only more often.

What it would ask:

- The Rules of React, which we follow anyway: rendering is pure, props,
  state and values from the store are never mutated, hooks are called at
  the top level. Where a component breaks them the compiler skips it
  silently; the lint of `eslint-plugin-react-hooks` says so, and its
  errors are not silenced.
- No `useMemo`, `useCallback` or `memo` by hand. The one exception that
  react.dev names is a value used as a dependency of an effect whose
  identity must not change; here that does not arise, because what an
  effect depends on comes from the store, whose values are immutable and
  keep their identity until they change.
- `"use no memo"` at the top of a component turns the compiler off for it.
  It is used only to find out whether the compiler causes a bug, never
  committed without a comment that says what broke.

## Reading core

`src/core/store.ts` gives `getState()`, `subscribe(listener)` and
`apply(description, command)`, as `SKILL.md`, "The core", describes them. The screens
read it through one hook, in `src/ui/store.tsx`:

```tsx
import { createContext, useContext, useSyncExternalStore } from "react";
import type { AppState, Store } from "../core/store.ts";
import type { JobResult } from "../worker/protocol.ts";

// The store of the application holds the results of its workers, JobResult.
const StoreContext = createContext<Store<JobResult> | null>(null);
export const StoreProvider = StoreContext.Provider;

export function useStore(): Store<JobResult> {
  const store = useContext(StoreContext);
  if (store === null) {
    throw new Error("popnei_web defect: useStore outside a StoreProvider");
  }
  return store;
}

export function useAppState<T>(select: (state: AppState<JobResult>) => T): T {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, () => select(store.getState()));
}
```

- **`useSyncExternalStore`, and never `useState` plus an effect that
  subscribes.** It is React's hook for state that lives outside React. It
  reads the value during the render, so that two components never show
  two versions of the project in the same frame, which a subscription in
  an effect allows.
- **The store is made once per page, in the entry file, outside any
  component**, and given through `StoreProvider`. A store or a worker made
  inside a component is made again on every mount, and twice in
  development (StrictMode, below). The context lets a test give a
  component a store of its own.
- **`subscribe` has the same identity on every call.** React subscribes
  again whenever the function it is given changes. `store.subscribe` is
  a property of the store, bound once, so it holds; a function written
  inline in the component would not.
- **A selector returns a part of the state as it is, or a primitive.**
  React calls it on every change of the store and compares what it
  returns with `Object.is`. A selector that builds a new array or object,
  `s => s.project.filters.filter(f => f.enabled)`, returns a new value
  every time, and React renders again, calls it again, and stops with the
  error "The result of getSnapshot should be cached". Select the part,
  and derive in the render:

  ```tsx
  const filters = useAppState((s) => s.project.filters);
  const enabledCount = filters.filter((f) => f.enabled).length;
  ```

  A value that is costly to derive, or that several screens need, the
  status of an analysis, its warnings, is a function of core that
  memoizes on the reference of the state it is given, so that it returns
  the same object for the same state. The screens never write such a
  cache of their own.
- **Several small selectors rather than one large one.** A component
  renders again only when what its selectors return changes, so a
  component that selects `s.project` renders on every change, and one
  that selects `s.project.analyses.pca` only when the PCA's options do.

### Sending commands

A change is a command, a function of core from a project to a new one
(`SKILL.md`), applied to the store from an event handler. `NumberField`
here is our wrapper of `src/ui/widgets/`, below:

```tsx
const store = useStore();
const threshold = useAppState(selectMaxMissingRate); // a selector of core, popnei's number

<NumberField
  label="Maximum proportion of missing genotypes"
  value={threshold}
  minValue={0}
  maxValue={1}
  step={0.01}
  onChange={(value) =>
    store.apply("the missing data filter changed", (p) =>
      setVariantFilter(p, { kind: "missing_data", maxAllowedMissingRate: value }),
    )
  }
/>
```

- **Never from the render**, which React may run several times, or throw
  away.
- **Never from an effect that watches a value**, "when the threshold
  changes, send a command". The handler that changed the threshold sends
  it. An effect that sends a command runs a render late, runs twice in
  development, and hides which action of the user caused it, which undo
  and the notice of removed results depend on.
- **One action of the user is one command**, so that one Ctrl+Z undoes
  it. A number field of React Aria calls `onChange` when the value is
  committed, on Enter or when the field loses focus, not on each key, so
  typing 0.95 is one command and not four.

## What state goes where

| state | where it lives | why |
|---|---|---|
| filters and their thresholds, the individuals table, the grouping, the options of each analysis | the project, in core | it is undone, saved in the project file, and goes into the keys of the results |
| results, what is running and its progress, errors of a run, warnings | core: the cache and the runs | several screens show it, and it outlives the screen that asked for it |
| the step of the application | the URL hash | the back button moves between steps (`docs/technology.md`, section 4) |
| the theme the user chose | `localStorage` and an attribute of `<html>` (`css.md`) | it belongs to this browser and not to the project |
| the tab that is open, a drawer or dialog that is open, a disclosure that is expanded, the sort of a table, the point under the mouse | `useState` in the screen | nothing else needs it, and losing it on a reload loses nothing |

The test for a case not in the table: if it should be saved in the project
file, or undone with Ctrl+Z, it is in the project; otherwise it is the
screen's. A value that can be calculated from other state is not state at
all: it is calculated in the render.

The step comes from the hash through the same hook React has for outside
state:

```tsx
function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash(): string {
  return window.location.hash;
}

export function useStepHash(): string {
  return useSyncExternalStore(subscribeToHash, readHash);
}
```

A step is changed by a link, `<a href="#analyses">`, which the browser
already makes a history entry of, and which a keyboard and a screen
reader already know how to use. The stepper is a `<nav>` of such links,
with `aria-current="step"` on the current one.

## Effects

An effect is for synchronizing with something outside React: code that
must run because the component is on the screen. Almost nothing in these
applications is that, because what is outside React, core, is read with
`useSyncExternalStore`, and every change comes from an event of the user.
react.dev's page "You Might Not Need an Effect" is the reference; its
cases, as they appear here:

- **A value derived from props or state** is calculated in the render,
  not copied into state by an effect. The copy is one render late, and
  the two can disagree.
- **An expensive derivation** is calculated in the render as well; the
  compiler keeps it until its inputs change. What is truly expensive,
  anything over the genotypes, runs in a worker and is never in a
  component.
- **Resetting the state of a component when what it shows changes**, the
  sort of a table when a new result arrives, is done with a `key`,
  `<ResultTable key={resultKey} … />`, which makes React treat it as a new
  component with fresh state.
- **What an action of the user causes** goes in its event handler, not in
  an effect that watches the state it changed.
- **A subscription to something outside React**, the store, the hash, a
  media query, is `useSyncExternalStore`.
- **Fetching**: nothing is fetched from a component. A run is started by
  core, and its outcome is awaited by `src/ui/runs.ts`, not by a
  component (`SKILL.md`, "The core").

What is left are the imperative things that React does not draw: a plot
of `src/charts`, the three.js view, moving focus to a heading.

### Mounting a plot

A plot is a function of `src/charts`, `createScatter(element, data,
events)`, that draws into an element and returns a handle with `update`,
`destroy` and the exports (`charts.md` defines it). The screen gives it an
element through a ref, creates the plot once, updates it when the data
change, and destroys it when the component leaves the screen:

```tsx
export function PcaPlot({ data, onHover }: PcaPlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<ChartHandle<ScatterData> | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (element === null) return;
    if (plotRef.current === null) {
      plotRef.current = createScatter(element, data, { onHover });
    } else {
      plotRef.current.update(data);
    }
  }, [data, onHover]);

  useEffect(() => {
    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className={styles.plot} />;
}
```

- **Created once, then updated.** Creating the plot again on every change
  of its data would lose what the user did in it, the rotation of the 3D
  PCA when its colours change, the zoom of the Manhattan plot, and for
  three.js would make a new WebGL context each time.
- **The cleanup undoes everything the plot did**, which is what `destroy`
  is: the SVG, the listeners, the `ResizeObserver`, the WebGL context. A
  plot that is not destroyed stays in memory after the screen is gone, and
  a browser allows only a handful of WebGL contexts, after which the next
  one fails.
- **In development, React mounts every component twice**: the setups, the
  cleanups, the setups again. That is StrictMode, which is on in the entry
  file, and it is on purpose: it shows at once an effect whose cleanup
  does not undo its setup, a bug that would otherwise appear only when a
  user left a screen and came back. Here the second effect destroys the
  plot and empties the ref, and the first creates it again from nothing.
  The answer to a double mount is never to make an effect "run once"; it
  is a cleanup that leaves nothing behind.
- **The effect lists what it reads**, `[data, onHover]`, and the lint
  checks it. The data of the plot are made from a result, in the render,
  and the compiler keeps the same object until the result changes, so the
  plot is not updated on renders that changed nothing else. While the
  compiler is off, the data are made with `useMemo` on the result, since
  a plot updated on every render is the measured slowness this case is. The events
  are given once, when the plot is created, as `charts.md` has it, so the
  handler must not depend on values that change: a setter of `useState`
  qualifies.
- **The container `<div>` has no children that React draws.** React and
  D3 must not both own the same nodes; the title, the legend in HTML and
  the controls go beside it. The size of the container comes from CSS
  (`css.md`), and the plot reads it.

### Moving focus

Changing the step replaces the content of the page without loading a new
one, and a screen reader says nothing. So when the hash changes, focus
moves to the `<h1>` of the new step, which has `tabIndex={-1}` so that it
can take focus without entering the tab order. It is an effect on the
step, in the shell, and the one place where focus is moved by hand: React
Aria moves it for dialogs, menus and toasts, and returns it when they
close.

## Lists and keys

- **The key of an item is its identity in the data**: the id of the
  analysis, the name of the individual, the id of the filter. React uses
  the key to know which item is which between two renders; with the index
  as key, removing the second filter of three gives the third filter the
  state, the open disclosure, the focused field, of the second.
- The index is a key only for a list that never reorders, never filters
  and whose items have no state. A key made in the render, `Math.random()`
  or `crypto.randomUUID()`, makes every item new on every render and
  loses its state and its focus.
- The items of the project that the user can add, remove or reorder need
  an id of their own in core, since two filters of the same kind may sit
  in one list.
- The collections of React Aria, `Select`, `Table`, `Tabs`, take `id` on
  each item for the same reason, and use it as the value of a selection.

## Widgets: React Aria, wrapped once

Every interactive widget is a component of React Aria, wrapped with our
styles in `src/ui/widgets/`. A hand-made widget, a `<div onClick>` as a
button, a select built of divs, is not written: getting its roles, its
keyboard, its focus, its announcements and its behaviour on touch right
takes the testing with screen readers that Adobe does and we cannot. A
native element is fine where it is the whole widget: `<a>` for a link,
such as a step of the stepper.

- **One wrapper per widget**, `src/ui/widgets/Switch.tsx` with
  `Switch.module.css`, which the screens import instead of
  `react-aria-components`. The look is in one place, and so is the
  adaptation to a new version of React Aria.
- **The wrapper takes a `label: string`, required.** A field without a
  label has no name for a screen reader, and a required prop makes a
  missing one a type error rather than a finding of review. The label is
  visible; `aria-label` alone is for a widget whose purpose is shown by
  something else, a table whose heading is above it.
- **The wrapper takes the props the screens need, not all of React
  Aria's**, and no `className`: where a widget sits is decided by the
  layout of its parent (`css.md`), not by styles passed into it, so every
  switch looks like every other.
- **Controlled**: `value` and `onChange`, `isSelected` and `onChange`,
  from the store; never `defaultValue`, which would keep a second copy of
  the value inside the widget, and it would disagree with the project
  after an undo.

What each one is for here:

| need | React Aria | notes |
|---|---|---|
| choose one of a few, the column of the populations, Hudson or Jost | `Select` with `Label`, `Button`, `SelectValue`, `Popover`, `ListBox` | items with `id`; `selectedKey` and `onSelectionChange` |
| on or off, the pruning of the PCA | `Switch` | for a setting that takes effect at once |
| a number with bounds, a threshold | `NumberField` | `minValue`, `maxValue`, `step`, `formatOptions`; it parses the number in the user's locale, so `0,95` works in Spanish |
| a yes or no inside a list, the columns kept | `Checkbox`, `CheckboxGroup` | |
| the results of one analysis, table and plot | `Tabs`, `TabList`, `Tab`, `TabPanel` | the selected tab is screen state |
| a question that blocks, "open a project and lose this one?" | `DialogTrigger`, `Modal`, `Dialog` with a `Heading slot="title"` | focus goes in and comes back; Escape closes |
| advanced options, a warning's explanation | `Disclosure`, `DisclosurePanel` | |
| the notice of removed results with Undo | `UNSTABLE_ToastRegion`, `UNSTABLE_ToastQueue` | still marked unstable in 1.21, which is one reason it lives in one wrapper; below |
| a sortable table, the GWAS hits, the individuals | `Table` with `Column allowsSorting`, `sortDescriptor`, `onSortChange`; `Virtualizer` with `TableLayout` beyond a few hundred rows | `aria-label` or `aria-labelledby` on the table; one column `isRowHeader` |
| load a file | `DropZone` holding a `FileTrigger` | dragging is not possible with a keyboard, so the zone always holds a button that opens the file picker |
| progress of a run | `ProgressBar` with a label | announced through the status region, below |

A `File` the user picked or dropped goes into the worker client's map
under a new load id, and core is given the id, the name and the size, in
a command; core never holds the `File`, and the screen does not read it
(`docs/architecture.md`, section 6).

### Announcements

A screen reader reads what has focus. What changes elsewhere, a run that
ends, results removed, is heard only through a live region.

- **One status region in the shell**, `<div role="status">`, present from
  the first render and empty; what is announced is written into it. A
  region added at the moment of the change is not announced by every
  screen reader, which is why it exists before.
- **A run announces its start and its end**, "Diversity: running",
  "Diversity: done, 2 warnings", and not each step of its progress, which
  would talk over everything else. The `ProgressBar` shows the progress
  to whoever looks at it.
- **The notice of removed results is a toast** of React Aria, which is a
  labelled landmark that F6 reaches and whose content is announced. It
  holds the action that reverses what caused it, Undo, or Redo after an
  undo (`docs/specs/core/store.md`), and it stays until the next command or until it
  is closed: it has an action, and a notice with an action that
  disappears on a timer fails a user who is slow to reach it (WCAG 2.2.1).
  Undo and Redo are also always in the header and on Ctrl+Z and
  Ctrl+Shift+Z, so the notice is never the only way. When the change also stops calculations, the same notice
  says so, "The ongoing calculations will be stopped unless you undo the
  change". There is no timer: the calculations stop when the notice is
  closed or replaced, or when the user runs another calculation, and then
  the notice loses that sentence and the status region announces "The
  earlier calculation of Diversity was stopped"
  (`docs/specs/core/store.md`). A change of the load of the variants
  file stops the calculations at once, and its notice says so, "2
  calculations stopped because a new variants file was loaded · Undo",
  as the owner decided on 25 September 2026.
- **Errors of a run** are shown in the panel of the analysis with the
  message and are announced as the end of the run is; `role="alert"` is
  kept for what interrupts, which here is nothing.

### Keyboard shortcuts

Ctrl+Z and Ctrl+Shift+Z (Cmd on macOS) undo and redo the project, with a
listener in the shell, except when focus is in a text field, where they
belong to the text. No other shortcut in the first version: each one is a
key that some screen reader or browser also wants.

## The states of an analysis

The panel of every analysis shows one of the seven states of a screen
spec (`writing-specs` skill): empty, locked with its reason, ready,
running with its progress, done, results removed with the notice, error. Core gives the
status as a discriminated union, and a shared component,
`src/ui/analyses/AnalysisPanel.tsx`, draws the frame of each state and
switches over it with every case named, so that a new state is a type
error until it is drawn. The panel of one analysis supplies only its
options and its results.

- **Locked** shows why, the text `needs()` gives, next to the control
  that would unlock it; the run button is disabled with that text as its
  description, not hidden, so that a user knows it exists.
- **Warnings** are a count on the header of the result, "⚠ 2", whose
  accessible name is the words, "2 warnings", with the symbol
  `aria-hidden`; activating it opens the help drawer at the warnings. A
  warning is never colour alone (`css.md`).

## Errors

- **An error boundary per step and per analysis panel**, a small class
  component in `src/ui/shell/ErrorBoundary.tsx`. It catches what throws
  while rendering and shows, in place of what failed, a message and a
  button that renders it again; the rest of the application keeps
  working, and the project, which is in core, is untouched. Without one,
  an error in any component empties the whole page.
- It catches errors of rendering and of effects, not of event handlers
  or of the workers. Those are data: core puts them in the state, and the
  panel shows them in its error state.
- The entry file passes `onUncaughtError` and `onCaughtError` to
  `createRoot`, which log to the console with the component stack; there
  is no server to send them to.

## Performance

The compiler, if the owner takes it after the walking skeleton, would
remove most of the traps. What is
left:

- **State that changes fast lives low.** The point under the mouse is
  state of the plot, inside `src/charts`, or of the smallest component
  that shows it; at the top of a screen it renders the whole screen at the
  rate of the mouse.
- **Long tables are virtualized**, with React Aria's `Virtualizer`: the
  individuals, 10000 in the largest dataset, and the variants of a GWAS.
  Ten thousand rows of DOM take seconds to draw and to scroll.
- **Results are not copied into React state**, nor turned from typed
  arrays into arrays of objects in every render. A shape the table needs
  is made once, from the result, by a function of core that memoizes on
  it, or in the render, where the compiler keeps it.
- **Nothing costly runs in a component.** If a calculation over the data
  is slow enough to notice, it belongs in a worker.

## The layout of a screen and of an analysis

```
src/ui/
  store.tsx                 StoreProvider, useStore, useAppState
  shell/                    the header, the stepper, the summary line, the
                            notices, the status region, ErrorBoundary.tsx
  steps/variants/
    VariantsStep.tsx        the step: its <h1>, its sections, reading the store
    VariantsStep.module.css
    FilterList.tsx          a part used by this step alone
    FilterList.module.css
  analyses/
    AnalysisPanel.tsx       the frame of the states, shared
    panels.ts               Record<AnalysisId, AnalysisUi>: every analysis of
                            core has its panel, or it does not compile
    diversity/
      DiversityOptions.tsx  its options, read from the project, sent as commands
      DiversityResults.tsx  its table and its plot
      DiversityPlot.tsx     the mount of its plot
      *.module.css
  widgets/
    Select.tsx Select.module.css Switch.tsx NumberField.tsx …
```

- One component per file, named as the file, exported by name.
- A part used by one step stays in its folder; it moves to `widgets/`
  only when a second screen needs it and it is a widget, not a piece of a
  screen.
- The styles of a component are in the CSS Module of the same name
  beside it (`css.md`).
- The page structure: `<header>`, the stepper in `<nav>`, the step in
  `<main>` with one `<h1>`; each analysis an `<h2>`, its parts `<h3>`, so
  that a screen reader can move by headings; `<html lang="en">` on every
  page.

## Accessibility review

What a reviewer checks on every change of `src/ui` is the `accessibility`
section of `.claude/skills/code-review/categories.md`. The writer of a
screen does one thing more: a screen reader is tried on each new widget
and each new step, VoiceOver on macOS with Safari at least, since that is
where most bugs of ARIA show. The automatic check, axe in the Playwright
tests, is in `testing.md`; it finds what a machine can see, a missing
name, a low contrast, and not whether the order, the names and the
announcements make sense.

## When this file is wrong

No screen existed when it was written, in September 2026. The walking
skeleton will try the store hook, the pattern of the plot, the status
region and the notice. What proves wrong there is corrected here, with
what showed it.

## Sources

- react.dev: "You Might Not Need an Effect", "Synchronizing with Effects",
  `useSyncExternalStore`, `<StrictMode>`, "Rules of React",
  "Preserving and Resetting State", "Rendering Lists".
- react.dev, "React Compiler v1.0", 7 October 2025, and "React Compiler:
  Installation".
- React Aria, react-aria.adobe.com: "Styling", "Toast", "Table",
  "Quality" (the screen readers it is tested with).
- WCAG 2.2, w3.org/TR/WCAG22, and WAI-ARIA Authoring Practices, "Live
  regions".
- npm registry, 24 September 2026: react 19.3.0,
  react-aria-components 1.21.1, babel-plugin-react-compiler 1.0.0,
  @vitejs/plugin-react 6.1.1, eslint-plugin-react-hooks 7.1.1.
