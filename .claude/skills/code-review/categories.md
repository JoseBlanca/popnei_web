# The categories of a code review

A reviewer reads the section for its category, the files of the `coding`
skill it names, and the specs it was given. The rules are in the
`coding` skill with their reasons and are not repeated here. What is
here is what to look for, the evidence a finding needs, and what is not
a finding.

For every category, a finding has a place, a file and a line or a
screenshot and a state; what is wrong; and evidence that someone else
can repeat: a command and its output, a sequence of actions in the
browser and what happened, a line of a spec. What could not be shown is
reported as a suspicion, with what would settle it. Style that Prettier
and ESLint settle is never a finding.

## spec

Does the code do what the module spec, the screen spec and
`docs/functionality.md` say?

- Go through the spec item part by part. For each statement find the
  code that makes it true and the test that would fail if it stopped
  being true. A statement with no code, or with code and no test, is a
  finding.
- The defaults. Every default the spec gives, a threshold, a model, the
  pruning on inside the PCA, reaches popnei as the spec says. A default
  that the application passes wrongly gives a sound looking wrong
  result, which is the worst defect it can have.
- Run the cases. The worked example of the spec and two or three of your
  own: no individuals file, an individual of the variants missing from
  it, a population of one individual, every variant filtered out. Where
  the spec gives popnei's numbers for a test file, run popnei's Python
  API from `/Users/jose/devel/popnei` on the same file and compare with
  what the screen shows.
- Look for what the code does that the spec does not say: a default, an
  option, a step skipped. Each is a gap of the spec or a defect of the
  code, and the finding says which.

Evidence: the statement of the spec and the line that contradicts it, or
the two numbers, from the screen and from popnei. Not a finding: what
the spec leaves open and the code settles in one of the ways the spec
allows.

## tests

Can each test fail, and are the numbers the change claims true?

- For every test of the change, break the code it guards and run it:
  drop an input from a `keyInputs`, flip a comparison, return early,
  remove the `aria-label`. A test that still passes guards nothing.
  Before reporting one, show that your change did alter the behaviour.
- The expected values are literals from the spec. A test that computes
  its expectation with the code under test is a finding.
- Playwright: a test that waits a fixed time and not for a state; that
  selects by CSS class where a role and a name exist, and so does not
  check that the control has a name; that runs in one engine where the
  deliverable says three; that asserts that a result appears and not
  that it is the right one.
- Fixtures that hide a defect: all populations of one size, nothing
  missing, one chromosome, a change of input that happens not to change
  the result.
- Every number that a comment, a test or the commit message gives about
  the change, how many tests, how many bytes, how much faster, is
  computed again, not read again.
- Restore the code after each experiment and end with `git status`
  clean.

Evidence: the change you made, the command, and that it still passed.
Not a finding: a test that could be written more briefly.

## stale

Could the screen show a result whose inputs have changed? Section 3 of
`docs/architecture.md` makes a result current by its key, so what makes
it stale is a key that misses an input, or a result shown by a path that
does not go through the key.

- For each analysis, list what its `run`, `needs`, `warnings` and
  `script` read from the project, and compare with what `keyInputs`
  returns. An input that is read and is not in the key is a finding: the
  result of before the change stays on screen. The identity of the
  variant file, the filters before it, the individuals and the grouping
  it uses, its options and the version of popnei are in every key the
  architecture describes.
- The canonical form of `keys.ts`, against the rules of "Keys" in
  `.claude/skills/coding/SKILL.md`: two projects that differ in an input
  give two keys, and two that are the same give one. Try `0.05` against
  `"0.05"` and `-0` against `0`, which those rules do not name.
- A result that arrives from the worker after the project changed, or
  from a worker that was ended by a cancel: is it shown only when the
  current project gives its key?
- What the worker keeps under keys of its own, the pruned variants, the
  kinship, the principal components: the same questions.
- A screen that keeps a copy of a result in its own state, a `useMemo`
  or a chart handle that is not given the new data, a warning computed
  with another project than the result's.
- The notice of results removed, undo and redo, and a project file
  opened, which loads no result: do they give what section 3 says?

Evidence: two projects that differ in one input and give the same key,
as a Vitest test or a call in node; or a sequence of actions in the
browser, with the screenshot of the stale number. Not a finding: a
result calculated again that could have been kept, unless the spec says
it is kept, as it says of the PCA when the populations change; then it
is `spec`.

## errors

`.claude/skills/coding/SKILL.md` and `worker.md` on errors.

- For each way the input can be wrong, what does the user see? A VCF
  that is not one, an individuals file with a missing individual, a
  project file of another version, a file too large for the tab. The
  message says which file and what is wrong, and what to do, as
  `docs/functionality.md` section 4 asks for the missing individuals.
- The worker: its `error` event, a wasm that fails to load, a request
  that throws, the tab out of memory. Does the page say so and stay
  usable, and does the queue go on?
- A promise whose rejection nobody handles, a `catch` that drops the
  error or turns it into an empty result, a React error boundary missing
  around a panel whose failure blanks the whole application.
- After a cancel, is the application in the state it was before the
  run?

Evidence: the input, the action, and a screenshot or the console. Not a
finding: an error that cannot happen, when you have shown why it
cannot.

## api

The TypeScript rules of `.claude/skills/coding/SKILL.md`, and comments as
`.claude/skills/writing/SKILL.md` asks for them.

- Names: does each say what the value is, and is the same thing called
  the same as in `docs/functionality.md`, in popnei's wasm package and
  in `/Users/jose/devel/popnei/docs/glossary.md`?
- Types: `any`, a cast with `as` or a `!` that hides a case, a string
  where a union of its values belongs, a message of the worker that is
  not a discriminated union, a `switch` over a union with no check that
  every case is handled.
- The types and fields against `docs/architecture.md` and the spec: the
  `Project`, the `AnalysisDef`, the messages.
- Defaults: in the `defaults` of the analysis, with their source, or
  hidden in a panel.
- Dead code, the same logic in three places, a `TODO` with no issue.

Evidence: the line and what a reader would take it to mean. Not a
finding: a name you would choose differently that says the same.

## architecture

`docs/architecture.md`, sections 1, 7 and 9, and the core layer of
`.claude/skills/coding/SKILL.md`.

- The layers: `src/core/` imports no React and touches no DOM, `window`
  or `document`; nothing in `core` imports `ui` or `charts`; nothing in
  `charts` imports `core` or `ui`. `grep` the imports.
- The project is immutable: a push, a splice or an assignment into a
  value of the project, or of a result from the cache.
- The screens hold no state of the project. What belongs to the project
  and lives in a component is lost by undo and by the project file.
- The page never holds genotypes; the worker runs one request at a time;
  results come back as typed arrays and are transferred, not copied,
  when they are large, unless the worker keeps them in its cache, when
  they are copied (`.claude/skills/coding/worker.md`).
- The files wasm is loaded by the worker, when it is first needed, and
  from nowhere else.
- Adding an analysis added its module and its panel and changed nothing
  else, as section 4 says; a change outside is a finding or a reason
  the plan gave.

Evidence: the import or the line, and the section it goes against. Not a
finding: a helper shared by two layers that has no DOM, React or project
in it.

## react

`.claude/skills/coding/react.md`, and "You Might Not Need an Effect" of
react.dev.

- An effect is for synchronising with a system outside React: the store
  of `core`, a chart of `src/charts`, the worker, a `ResizeObserver`.
  An effect that computes a value from props or state, reacts to a user
  action that an event handler could handle, resets state when a prop
  changes, where a `key` would, or tells the parent of a change, is a
  finding.
- An effect that starts something asynchronous and does not ignore its
  answer after cleanup shows the answer of an older request: this is
  also `stale`.
- Every effect has the cleanup that undoes it, and doing it twice is
  harmless, since `StrictMode` runs it twice in development: a chart
  removed, a three.js renderer, its geometries and materials disposed,
  a listener removed. A missing one leaks memory each time a panel
  opens.
- State derived from other state or from the store and kept in
  `useState`, which can disagree with its source. The store read other
  than through the one subscription of `docs/architecture.md` section 7.
- Lists with the index as `key` where rows can be reordered or removed,
  a context whose value is a new object on each render, a large table
  or a plot of many points rendered again on every keystroke.

Evidence: the line, and the sequence that shows the bug, or for a cost
the number of renders or the milliseconds measured with the React
Profiler or `performance.now()`. Not a finding: a `useMemo` or a
`useCallback` that is missing where nothing was measured to be slow.

## accessibility

WCAG 2.2 at level AA, with `.claude/skills/coding/react.md` and
`css.md`. React Aria gives the roles, the keyboard and the focus of its
widgets, and what is left to check is what we add around them.

- The keyboard (2.1.1, 2.1.2, 2.4.3, 2.4.7). Walk every control of the
  screen with Tab, Shift+Tab, Enter, Space, the arrows and Escape, in
  Playwright, reading `document.activeElement` at each step. Every
  control is reached, in an order that follows the screen, its focus is
  visible, and nothing traps it. A dialog or a drawer takes focus when
  it opens and gives it back when it closes.
- Focus not hidden (2.4.11): a focused element hidden under a sticky
  header, a toast or the help drawer.
- Names and roles (1.3.1, 3.3.2, 4.1.2): every control and field has a
  name that says what it is, a field its label, a button with an icon a
  text for it; a table has its headers.
- Status messages (4.1.3): the progress of a run, the notice of results
  removed, a warning that appears after a run, are announced without
  taking the focus, through a live region or the toast of React Aria.
- Time (2.2.1): a notice with its Undo that closes by itself before the
  user can reach it.
- Contrast (1.4.3, 1.4.11): the ratios of "Contrast and colour" in
  `.claude/skills/coding/css.md`, in the light and in the dark theme,
  computed from the tokens of `tokens.css`.
- Colour alone (1.4.1): the populations of a plot or the cells of a
  heatmap told apart only by colour, with no legend, shape or table.
- Plots: an SVG plot has a name, and its numbers are in a table the user
  can reach. The 3D PCA on a canvas is operated by pointer; rotation by
  dragging needs a way without dragging (2.5.7), and its points a table.
- Files: the drop zone has a file picker beside it, which React Aria's
  `DropZone` with `FileTrigger` gives, since dropping is dragging.
- Target size (2.5.8): targets of 24 by 24 CSS pixels or spaced as the
  criterion allows.
- Zoom and reflow (1.4.4, 1.4.10): the page at 200% zoom and at 320 CSS
  pixels of width, where the criterion's exception for tables and plots
  applies to them only.
- Headings and landmarks (1.3.1, 2.4.6): one `<h1>` per step, headings in
  order, `<main>` and `<nav>`, and the focus on the `<h1>` after a change
  of step, as `react.md` lays them out.
- Motion: with the system's reduced motion on, nothing animates that is
  not needed to understand it (`css.md`, "Motion").
- The page: `lang` on `html` (3.1.1), a title for each page (2.4.2), the
  help in the same place on every step (3.2.6), a change of a select
  that starts no run and moves to no other step by itself (3.2.2).

Evidence: the keys pressed and the element that had the focus, the two
colours and the ratio, the screenshot, or the output of the axe check
of `e2e/axe.ts`, which `testing.md` describes, and which finds part of
the problems and never proves their absence. Not a finding: a criterion of
level AAA; a pattern of React Aria that follows the ARIA Authoring
Practices, unless you show that it fails in a browser.

## ux

The screen spec, and the principles of `docs/functionality.md` section 2.
The reviewer looks at the screenshots of every state and at the running
application.

- Every state the screen spec lists is there and looks as it says:
  nothing given yet, running with its progress, the result, an error, a
  warning, the notice of results removed. A state missing from the
  screenshots is a finding, unless the plan said why.
- Nothing that misleads without warning: every warning the analysis
  raises is shown where the spec says, beside the result it is about,
  with its measure, and is in the report.
- The words of the screen are those of the spec and of
  `docs/functionality.md`, the same thing named the same on every step.
- Numbers: formatted as the spec says, the same number of digits in a
  column, a p value below the smallest a float can show given as such,
  a missing value shown as missing and never as `NaN` or `undefined`,
  the number of individuals beside each value of a population as section
  6 asks.
- The defaults visible, and what the user changed from them.
- The help: where the spec puts it, and what it says matches what the
  screen does.
- The light and the dark theme, and the narrow width when the spec has
  it: nothing cut, overlapping or unreadable.

Evidence: the screenshot and its state, and the line of the spec. Not a
finding: a matter of taste that the spec does not decide. When the spec
is silent on something a user will stumble on, that is a finding about
the spec.

## browser

The browsers are those of goal 3 of
`/Users/jose/devel/popnei/docs/objectives.md`: Chrome and Edge from 91,
Firefox from 89, Safari from 16.4 on macOS and iOS, the floor that
`.claude/skills/coding/worker.md` takes for the applications. The floor
is open for the owner (point 1 of "Open for the owner" in
`.claude/skills/coding/SKILL.md`); the review uses the one in force. Playwright's WebKit is a recent WebKit, not Safari
16.4, so a test that passes there does not show that the floor works:
what the floor has is read in the compatibility table of MDN.

- Every browser API, CSS feature and syntax that the change uses: its
  first version in the three engines, against the floor. Vite lowers
  syntax to its `build.target` and does not add what an API lacks.
  Those that are easy to miss: module workers, `new Worker(url, {type:
  "module"})`, Firefox 114; `Promise.withResolvers` and `Object.groupBy`,
  Safari 17.4; the new methods of `Set`, Safari 17; the popover
  attribute, Safari 17; `Array.prototype.findLast`, Chrome 97 and
  Firefox 104, which React Aria's table calls; the File System Access
  API, Chromium only. Those versions are MDN's of 24 September 2026. The
  CSS allowed at the floor is the table of `.claude/skills/coding/css.md`,
  and the worker's build is in `worker.md`.
- The Playwright tests of the change pass in Chromium, Firefox and
  WebKit.
- Every file the site loads is served by the site
  (`docs/technology.md` section 4). `grep` for `http://`, `https://` and
  `//` in `src/`, the HTML and the CSS, and run the application with a
  listener on the requests of Playwright: a request to another origin, a
  font, a script, an analytics call, is a finding, since the site
  promises that the data never leaves the browser.
- What differs in Safari: a download made from a blob URL revoked too
  early, a file larger than what iOS gives a tab, `FileReaderSync` in the
  worker.

Evidence: the feature, its version from MDN and the floor, or the failing
run in one engine, or the request logged. Not a finding: a feature of
Baseline that every browser of the floor has.

## bundle

`docs/technology.md`, sections 2 and 3, and `.claude/skills/coding/charts.md`
and `worker.md` where they say what is loaded when.

- A dependency added to `package.json`: is it in `docs/technology.md`?
  One that is not is a decision of the owner, and a finding until it is
  taken. A development dependency among the dependencies of the site.
- The size: the output of `npm run build` before and after, gzipped,
  for the file that each page loads first and for each lazy chunk.
- What is loaded when: the files wasm is fetched only when an xlsx is
  read or the report is written, so a run with a CSV makes no request
  for it; check it with the requests logged by Playwright. The same for
  any chunk the `coding` skill says is loaded lazily.
- An import that pulls a whole library where a part is used, when the
  build shows it in the size.
- Every wasm and data file served with the name that changes with its
  content, so that a new release is not read from an old cache.

Evidence: the two sizes, or the requests logged, or the line of
`package.json`. Not a finding: a dependency that `docs/technology.md`
decided, at the size it was decided at.

## Sources

- W3C, "What's New in WCAG 2.2", w3.org/WAI/standards-guidelines/wcag/new-in-22/,
  read on 24 September 2026: the nine new criteria, and 4.1.1 Parsing
  removed.
- W3C, "Web Content Accessibility Guidelines (WCAG) 2.2",
  w3.org/TR/WCAG22/, for the criteria by their numbers.
- React, "You Might Not Need an Effect",
  react.dev/learn/you-might-not-need-an-effect, read on 24 September
  2026.
- MDN Web Docs, the browser compatibility tables of each feature,
  developer.mozilla.org, and web.dev/baseline for Baseline.
- Vite, "Build Options", vite.dev/config/build-options, read on 24
  September 2026: the default `build.target` is Baseline widely
  available, Chrome 111, Firefox 114, Safari 16.4.
