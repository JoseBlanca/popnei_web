# popnei web: the technology

September 2026. The languages, libraries and tools the web applications
of popnei are built with, why each was chosen, and what was considered
and not taken. The owner decided them on 23 and 24 September 2026. What
the applications do is in `docs/functionality.md`.

## 1. What the choices had to meet

- **A static site.** No server runs code for the applications: the host
  serves files, and every calculation runs in the tab, through the wasm
  package of popnei (`docs/architecture.md` of popnei, section 11).
- **Long life.** The JavaScript world changes fast. A library is taken
  only when it is the established standard of its field, with a large
  user base and a maintainer with a reason to keep it alive, or when it is
  small enough to be replaced or written by us. A nicer library with a
  thin user base is not taken.
- **Few dependencies.** Each one is a future upgrade, a possible break
  and a possible abandonment.
- **The logic outside the framework.** What matters, the state of a
  project, the dependencies between the results, undo, the project file,
  is plain TypeScript, so that it can be tested without a browser and
  would outlive the UI framework.

## 2. The decisions

| layer | choice |
|---|---|
| language | TypeScript 6.0, and 7 when typescript-eslint supports it |
| build | Vite, with @vitejs/plugin-react and @react-aria/optimize-locales-plugin |
| UI framework | React, as a client application, with no server framework |
| accessible widgets | React Aria Components |
| CSS | plain modern CSS, custom properties as design tokens, CSS Modules |
| 2D plots | D3, as its modules, `d3-selection`, `d3-scale`, `d3-path` and the others, with their `@types/d3-*` |
| 3D plot | three.js, with `@types/three` |
| calls to the worker | a small typed message layer of our own |
| documentation and in-app help | Markdown, rendered with markdown-it |
| xlsx, zip | in Rust, in xlsx_rs, a project of its own whose wasm package the site installs from a GitHub Release and loads when needed (section 5): calamine, and rust_xlsxwriter from stage 6 |
| CSV and TSV of the individuals | read in TypeScript, by code of ours, with the inference of the types of the columns |
| tests | Vitest, Playwright; for development only jsdom, @axe-core/playwright and fast-check |
| lint and format | ESLint with @eslint/js, typescript-eslint and eslint-plugin-react-hooks, Prettier |
| types of node | @types/node, for development only |
| package manager | npm |
| host | GitHub Pages |
| popnei itself | its wasm package, from a GitHub Release of popnei (section 5) |
| the reader of xlsx | the wasm package of xlsx_rs, from a GitHub Release of xlsx_rs, as popnei's (section 5) |

### TypeScript

The wasm package of popnei ships TypeScript declarations of its functions
and its results, so the application is typed from the core to the
screen.

The compiler is TypeScript 6.0, 6.0.3, and the move to 7 is made when
typescript-eslint supports it, as the owner decided on 24 September 2026.
typescript-eslint, whose rules that read types catch most of the
mistakes the `coding` skill lists, reads the types through the
programmatic API of the compiler, and 7.0, rewritten in Go, has only
unstable ones: typescript-eslint 8.70.1 takes TypeScript `>=4.8.4
<6.1.0`. 6.0 is the release that leads to 7, with the same language and
the defaults of 7, so the move is expected to be a change of version
and no change of code. Vite's React template pins `~6.0.2` too.

### Vite

The standard bundler, the one the templates of most frameworks use. It
writes plain static files, and it handles WebAssembly and web workers
without plugins of our own. `@vitejs/plugin-react`, which Vite's team
maintains, is part of it for a React application: it compiles the JSX
and refreshes a component in the development server without losing its
state.

### React

The largest user base of the UI frameworks, the most documentation, the
most libraries that target it first, and a maintainer, Meta, that runs its
own products on it. Its core API has not changed in substance since hooks
in 2019. The churn of the React world is in the server frameworks around
it, Next.js and server components, which a static application does not
use: React is used alone, built by Vite.

Considered and not taken:

- **Vue.** Easier to learn, with templates close to HTML, and a
  reactivity that fits imperative code such as D3 and three.js better
  than React's `useEffect`. It was not taken for three reasons: the
  accessible widgets of React Aria exist only for React, and Vue's
  equivalent, Reka UI, is a smaller community port renamed in 2025; its
  user base is several times smaller; and its funding rests on sponsors
  and one company. The move from Vue 2 to Vue 3, from 2020 to 2023, was
  also hard on many projects.
- **Svelte.** Pleasant to write and common next to D3, but its user base
  is smaller still, and its version 5, of 2024, changed its model of
  reactivity, the kind of churn this document avoids.

Because the logic is in `src/core` and the plots are plain functions
(section 3), the framework only draws the screens. Replacing it would
rewrite the screens and nothing else.

**eslint-plugin-react-hooks**, a development dependency, taken on 24
September 2026. It is the React team's own lint of the Rules of Hooks and
of what each effect depends on, the mistakes of React that compile and
run and show a stale value; version 7 also holds the rules the compiler
would need.

**The React Compiler is off** for the walking skeleton, as the owner
decided on 24 September 2026. It memoizes the components at build time,
which spares the question of when to memoize by hand, but it is three
development packages more, one of them first published in February 2026
(`.claude/skills/coding/react.md`). The decision is taken again after the
walking skeleton, with a measurement of what the renders of its screens
cost without it.

### React Aria Components

Unstyled, accessible components from Adobe, which builds its own design
system on them. They cover the widgets that are hard to make accessible
by hand and that the applications need: select, switch, number field,
checkbox, tabs, dialog, disclosure, toast, a sortable table, and a drop
zone and a file picker for loading files. The look is ours, in CSS.

What it costs: 50.7 KB gzipped of the first script of the page of the
walking skeleton, 19 KB of it its translations into 34 languages,
measured with source maps on 25 September 2026 on the Vite build. With
the components the page used at the end of work package 9 of the plan
of the walking skeleton, `docs/plans/walking-skeleton.md`, React Aria
bundles alone, without React, to 70.8 KB gzipped, against 64.5 KB before
that work package; its toast added 3.2 KB, its tooltip 1.6 KB, its
dialog 1.4 KB and its text field 0.3 KB. Measured on 26 September 2026
by bundling those components with rolldown 1.2.10 and compressing with
gzip -9. The application is in English, and the entry sets the
language of React Aria to English, `en-US`, whatever the language of the
browser.

So the words of React Aria in its other 33 languages are left out of the
build by **@react-aria/optimize-locales-plugin**, a development
dependency taken by the owner on 25 September 2026: Adobe's own plugin
for it, version 2.0.2, which answers React Aria's import of the file of
each other language with an empty module, in `vite.config.ts`. It brings
in `unplugin` 2.3.11, of the UnJS project, which makes one plugin work
in Vite, Rollup, webpack and esbuild, and `webpack-virtual-modules`
0.6.2, which unplugin requires and Vite does not use; its other
dependencies were already installed. The first script of
`popgen.html`, the page's own, went from 148.39 KB gzipped to 113.30 KB
with it, as `vite build` reported them with Vite 8.3.0 on 25 September
2026, and the script it shares with the probe page, React with its
`jsx-runtime`, stayed at 68.78 KB. The 35.09 KB that went are more
than the 19 KB above, which were measured on an earlier build of the
page; where the difference comes from was not looked into. The plugin
itself reaches no user. A second
language, later, is a line of the plugin's list, `locales: ["en-US"]`.

The table of the diversity is a plain HTML table, `<table>` with header
cells for its columns and for its rows, and not React Aria's `Table`, as
the owner decided on 25 September 2026. It has a few rows, one per
population, and is neither sorted nor selected, so the grid of React
Aria, which moves the focus from cell to cell with the arrow keys, gave
it nothing that a table of HTML does not: a screen reader reads a
`<table>` cell by cell with its own keys, and the frame that scrolls it
on a narrow page is reached by the Tab key. The first script of
`popgen.html` went from 114.64 KB gzipped to 100.45 KB with the change,
as `vite build` reported them with Vite 8.3.0 on 25 September 2026, and
the script it shares with the probe page stayed at 68.78 KB. The 14.19
KB that went are less than the 25.1 KB the review of the diversity
panel measured for the `Table` with source maps, on a build before the
plugin of the languages; where the difference comes from was not looked
into. React Aria's `Table` stays for the tables that are sorted or have
thousands of rows, the individuals and the hits of a GWAS, and its
select list stays, as the list of the column of the populations.

The sortable table of the individuals, React Aria's `Table` with its
`Virtualizer`, which draws only the rows in view, made the first script
of `popgen.html` 188,958 bytes with `gzip -9` against 156,467 before
it, 32,491 bytes more, on the site built at commits 9c513cc and
0b13e8b on 27 September 2026: about 19 KB of the table and its grid,
about 15 KB of the Virtualizer and its layouts, each module compressed
alone, and about 9 KB of the application's own code; the bytes were
given to their sources with the source map of the build. Nothing of
React Aria can be imported narrower. Loading the table with `lazy()`,
when the statistics of each individual are first shown, would take
26,100 of those bytes out of the first script, 2.7% of the 977.7 KB of
a first visit, 698,713 bytes of which are the wasm of popnei; not
taken, as for the plots ("D3 for the 2D plots", below), for a second request and a moment of
waiting before the table, against 26 KB, and it is measured again if
the table grows.

Not taken: component libraries with their own look, MUI, Chakra,
Mantine, which bring a style we would fight and, for Chakra, a history of
large rewrites; and Radix Primitives, whose maintenance slowed.

### CSS

Plain CSS, which is never deprecated, and whose custom properties, grid
and flex cover what Sass was used for. Which of the newer features of CSS
can be used, nesting, `:has()`, container queries, depends on the oldest
browsers the applications support: nesting, for one, needs Chrome 120,
Firefox 117 and Safari 17.2, newer than the floor of the applications,
Chrome 111, Firefox 115 and Safari 16.4 (section 6). The table of what
is allowed is in
`.claude/skills/coding/css.md`. The design tokens,
colours, spacing, type, radii, are custom properties on `:root`, which
gives a dark theme by redefining them. The styles of a component are a
CSS Module, which Vite supports without a dependency.

Not taken: Tailwind, popular, but rewritten in its version 4 and tying the
markup to its classes; and Sass, whose features CSS has now.

### D3 for the 2D plots

The most used library of visualisation on the web, since 2011, by Mike
Bostock and Observable, and the one most other libraries borrow from. It
gives the pieces, scales, axes, shapes, zoom, brushing, and the plot is
ours, so that it looks as a scientific plot should. A plot drawn in SVG is
exported as SVG by serialising it, and as PNG by drawing that SVG on a
canvas at two or three times its size.

The applications have about ten kinds of plot: histograms, scatter plots,
the QQ plot, line plots, the heatmap, the Manhattan plot. Each is written
once.

D3 is taken as its modules, not as the `d3` package, as the owner
decided on 24 September 2026: `d3-selection`, `d3-scale`, `d3-axis`,
`d3-shape`, `d3-path`, `d3-array`, `d3-format`, `d3-zoom` and
`d3-scale-chromatic`, and not `d3-delaunay`, which a loop over the
points replaced on 27 September 2026 (`docs/specs/charts/scatter.md`), each with its `@types/d3-*` for development,
since D3 ships no types. `d3-shape`, `d3-path` and `d3-scale-chromatic`,
which the scatter of stage 4 is the first to use, were approved with
their versions by the owner on 27 September 2026. The `d3` package brings every module, geography
and forces among them, and a list of the modules says in `package.json`
what the plots use. The list and its versions are in
`.claude/skills/coding/charts.md`; a module added later, `d3-brush` or
`d3-polygon`, is a new dependency like any other.

The modules bring packages that the plots do not import: `d3-scale`
brings `d3-interpolate`, `d3-color`, `d3-time` and `d3-time-format`,
modules of D3 outside the list above, besides `d3-array` and
`d3-format`, which are on it; `d3-array` brings `internmap`, a `Map`
keyed by value, of the same author; and `@types/d3-scale` brings
`@types/d3-time`. The owner approved these on 26 September 2026, with
the plan of the Variants step, `docs/plans/variants-step.md`, and with
them the 38 packages that jsdom, below, brings for development.

No 2D plot needs WebGL, because the points are reduced before they are
drawn. Only the Manhattan plot has many, up to a million; every variant
above a threshold, p < 10⁻³ by default, is drawn, and the others, which
lie along the axis and cannot be told apart, are thinned. The thinning
runs in Rust, beside the calculation. The plot keeps a few tens of
thousands of points, which SVG draws, and which export as vectors.

The plots are in the first script of the page, the one the browser
downloads before it shows anything, and not loaded when the first plot
is drawn. The histograms of the Variants step, the first plots on a
screen, made that script 154,923 bytes with `gzip -9` against 133,788
before them, 21.1 KB more, on the site built at commit 64989f6 on 27
September 2026. Loading the plots with `import()`, when a result first
needs one, would take 16,007 of those bytes out of the first script,
1.7% of the about 942 KB of a first visit, most of which is the wasm of
popnei; not taken, for a second request and a moment of waiting before
the first plot, against 16 KB, and it is measured again if the plots
grow. three.js is the exception, below.

Considered and not taken:

- **Plotly.js.** One library for every plot, the 3D scatter included, and
  the model of Python's plotly. Not taken for its size, about 3.5 MB whole
  and 1 MB in a custom bundle, its look, which is recognisably its own, the
  configuration it takes to change what it draws, and its export of WebGL
  plots to SVG as an image inside the file. It would have been the choice
  for the fastest first version.
- **Observable Plot**, a grammar of graphics over D3 by the same people:
  a smaller user base than D3, and it can be added over D3 later if a plot
  asks for it.
- **Vega-Lite**, the engine of Altair: custom interaction, such as a lasso
  that edits the populations, is awkward in it, and large data is slow.
- **Apache ECharts**: well governed, but made for dashboards, and its 3D
  extension is less maintained.
- **Chart.js**, made for business charts, and small fast libraries such
  as uPlot, whose user base is thin.

### three.js for the 3D PCA

The established library of WebGL, since 2010. The 3D scatter of the PCA
is drawn with it, with a thin layer of ours for the axes, the rotation,
the hover and, later, the lasso, which would be our code with any library.
three.js r186 draws with WebGL 2 alone, which every browser of the floor
of section 6 has, unless WebGL is turned off in it or its graphics card
is refused; the 3D view then says so, and the 2D plot stays
(`docs/specs/charts/pca3d.md`). three.js ships no types of
its own, so `@types/three`, from DefinitelyTyped, is taken with it for
development; the owner approved both, three 0.186.1 and `@types/three`
0.186.0, on 27 September 2026. It is loaded with `import()` when the 3D PCA is first
drawn, into a chunk of its own, a script the browser downloads then, so
that a user who never runs a PCA never downloads it, unlike the 2D plots
above. The panel of the PCA opens on the 3D view, as the owner decided
on 28 September 2026, so three.js, 134 KB gzipped, is downloaded when
the first result of a PCA is drawn, and not only when a user asks for
the 3D view (`docs/specs/analyses/pca.md`, "Its options").

### The calls to the worker

The calculations run in a web worker (`docs/architecture.md` of popnei,
section 11). The page talks to it through a message layer of our own, of
about 150 lines, typed from the TypeScript declarations of the wasm
package, with progress reports and cancellation. Comlink, the usual
library, was not taken because it has neither.

### Markdown for the documentation and the help

The documentation pages and the help drawer of the applications
(`docs/interface.md`, to be written) come from the same Markdown files,
rendered by markdown-it, which has been maintained since 2014.

### xlsx and zip in Rust, in xlsx_rs

An xlsx file of the individuals is read with calamine, and from stage 6
written with rust_xlsxwriter, all pure Rust, in **xlsx_rs**, a project of
its own in a repository of its own, which is not part of popnei and
releases a wasm package that the site installs as it installs popnei's
(section 5; `docs/architecture.md`, section 6). The owner decided it on
28 September 2026; until then it was a crate of this repository,
`crates/files/`. Where the report is zipped, with the `zip` crate in
xlsx_rs or otherwise, is decided with stage 6 (`docs/architecture.md`,
section 13, point 14). A CSV or TSV file of
the individuals, and the inference of the types of the columns of either,
are not in this module but in TypeScript of ours (below), so that a user
whose file is a CSV never downloads it.

They were measured on 24 September 2026, in a crate of trial that read an
xlsx with calamine 0.36.1, wrote one with rust_xlsxwriter 0.99.1 and
zipped files with zip 8.6.0, built with `opt-level = 3`, LTO, one codegen
unit and wasm-bindgen, as the wasm package of popnei is. All three build
for `wasm32-unknown-unknown` and for `wasm32-unknown-emscripten`, with
the emsdk of popnei, and none has C in it: the compression is zlib-rs,
which is Rust. Both calamine and rust_xlsxwriter take zip with its
optional parts off already, so there was nothing to trim. What they add
to a wasm module:

| | raw | gzipped |
|---|---|---|
| the wasm package of popnei, for comparison, release js-v0.1.0-dev.2 as Vite builds it | 2.16 MB | 0.71 MB |
| calamine, reading | 0.52 MB | 0.29 MB |
| rust_xlsxwriter, writing | 0.90 MB | 0.35 MB |
| zip | 0.29 MB | 0.12 MB |
| the three together, which share zip and the compression | 1.36 MB | 0.58 MB |
| the three together with `opt-level = "z"` | 1.04 MB | 0.47 MB |

The trial showed that they build and what they weigh, not yet that they
read the files of real users right.

In stage 4 xlsx_rs only reads, so it holds calamine alone, and
rust_xlsxwriter joins it with the report, in stage 6. The owner
approved calamine 0.36.1 as a dependency of xlsx_rs, and
rust_xlsxwriter 0.99.1 for its tests until then, on 28 September 2026
(`docs/architecture.md`, section 13, point 12). Measured on
27 September 2026 in a crate of trial with calamine 0.36.1 alone, built
with the profile above and `wasm-bindgen --target web`, with Rust 1.98.0
on the owner's Mac, and
gzipped with `gzip -9`: `files_bg.wasm` is 533,415 to 533,519 bytes raw
and 295,475 to 295,521 gzipped in two builds, 0.30 MB, and the JavaScript wasm-bindgen generates beside it
11,892 and 2,962 (`docs/specs/worker/files.md`, "Its size"). That agrees with the 0.29 MB of calamine in the
table above.

calamine 0.36.1 refuses a whole sheet at an error cell it does not
know, as its source reads and the same trial saw: it knows the seven
errors of older Excel,
`#N/A`, `#DIV/0!`, `#NAME?`, `#NULL!`, `#NUM!`, `#REF!` and `#VALUE!`,
and gives `XlsxError::CellError` at any other: `#SPILL!` and `#CALC!` of
the newest versions of Excel, if Excel stores them as such, which it may
instead store as `#VALUE!` with the real error elsewhere in the file,
unconfirmed until the owner's `spill.xlsx` is read
(`docs/specs/worker/files.md`); and `#GETTING_DATA`, which
rust_xlsxwriter writes and which the trial refused with "Unsupported
cell error value '#GETTING_DATA'". xlsx_rs gives such a sheet as a
refusal that names the error, so that the user is told which formula to
mend (`docs/specs/worker/files.md`, "The refusals").

Together they would almost double what a user downloads before anything
runs. So they are a second wasm module, apart from the wasm package of
popnei, which the application loads the first time it is asked to read an
xlsx or to write the report, and which the browser keeps after that. A
user whose file is a CSV never downloads it. The owner decided it on 24
September 2026, and decided the same day that the module is not built
and released beside popnei, because reading and writing these files is
not popnei's business; on 28 September 2026, that it is a project of its
own, xlsx_rs.

The site takes xlsx_rs's package from a GitHub Release, by its URL in
`package.json`, as it takes popnei's (section 5), and so needs no Rust:
no toolchain, no `wasm-bindgen-cli` and no build of a crate on the
owner's machine, a contributor's or the runners of the continuous
integration. What xlsx_rs costs instead:

- **A second repository to keep**, with the conventions and the skills
  of popnei, as the owner asked: its `CLAUDE.md`, its docs, its tests,
  `cargo test` natively and a test of the built package, and the
  upgrades of calamine and rust_xlsxwriter as commits of their own. The
  library is a few hundred lines around them, an estimate.
- **A release for every change the site is to see**: a tag, the package
  built and packed by hand as popnei's are, about ten minutes by the
  estimate of `docs/specs/site.md`, and a new URL in the site's
  `package.json`. The owner decided on 28 September 2026 that the
  releases are made by hand, and later by a workflow shared with
  popnei. While the two are changed together, the site installs the
  local build packed, as section 5 says, never committed.
- **A release that nothing ties to its source** while releases are made
  by hand: the lockfile's hash says the file of a URL never changed, not
  that it was built from the tagged commit, as popnei's releases are made
  today; a workflow that builds on the tag answers it
  (`docs/architecture.md`, section 13, point 13).
- **Rust on the machine that makes a release**, the owner's, which has
  Rust 1.98.0 and `wasm-bindgen-cli` 0.2.128, approved for the site on
  27 September 2026 and no longer needed by it.

Considered and not taken on 28 September 2026 (`docs/architecture.md`,
section 6, has the comparison):

- **The crate in this repository, built by the site**, as it was from 24
  to 28 September 2026: `cargo build` and `wasm-bindgen` into
  `crates/files/pkg/` before every `vite build` and `vite dev`, with Rust
  and `wasm-bindgen-cli` on every machine that builds the site and in
  each of the three jobs of its continuous integration, times never
  measured, and `npm run dev` about 1 s slower, 5.2 s the first time, on
  the owner's Mac. A change of the reader would wait for no release. It
  would win if the reader changed often, together with the screens.
- **A crate of xlsx_rs published on crates.io and built by the site**:
  every cost of the one before, Rust in the site, with the wait of a
  release as well; and the name `xlsx-rs`, which crates.io takes as the
  same as `xlsx_rs`, is a crate of another author, of 2021.

Considered and not taken:

- **Leaving xlsx out and reading only CSV and TSV.** It would not take
  the trouble of the encodings and the separators away from the users; it
  would give it to all of them, since Excel in Spanish writes `;` and
  decimal commas by default.
- **Reading and writing xlsx in JavaScript**, with fflate, a zip library
  of about 10 KB, and the XML parser of the browser. Small, but the reader
  of xlsx would be ours to write and keep, with its hard cases, shared
  strings, the cells that a sparse row leaves out, dates kept as numbers
  with a format, the date system of 1904, which calamine already handles.
- **SheetJS**, for years the library of JavaScript for xlsx. Its
  maintainers left npm in 2023: the npm version stays at 0.18.5, with
  known vulnerabilities, and the newer ones come only from their own
  server. **ExcelJS**, the other one, has had few releases since 2023.
- **The module in popnei's workspace, released beside popnei's package**,
  which the approved architecture had until 24 September 2026. The site
  would have needed no Rust, since it would have installed the module
  from a release as it does popnei (section 5); but a release of popnei
  would carry a package of the applications, and a change to how they
  read an xlsx would wait for a tag of popnei. The owner decided against
  it that day. xlsx_rs keeps what it gave, no Rust in the site, without
  what it cost: its releases are its own.

### CSV and TSV in TypeScript

A CSV or TSV file of the individuals is read by code of ours in
TypeScript, in the light worker, and the types of its columns, and of an
xlsx's, are inferred by the same code, as the owner decided on 24
September 2026 (`docs/architecture.md`, section 6): reading these files is
not popnei's business, so nothing of it is asked of popnei. What the
reader has to do is in section 4 of `docs/functionality.md`: detect the
separator, `,`, `;` or a tab, accept decimals with a comma, remove a BOM,
read an empty cell, `NA` and `-` as missing. It is pure code with no
dependency, a few hundred lines with the inference, an estimate, and it is
tested with Vitest in node.

Considered and not taken:

- **The reader in popnei's core and its wasm**, which the approved
  architecture had until that day, so that Python would read the files
  with the same code. The Python script of the report reads the file with
  pandas instead, every column as text and converted as the types of the
  project say (`docs/architecture.md`, section 8).
- **Papa Parse**, the established parser of CSV in JavaScript, which
  detects the separator and reads quoted fields. The decimal commas, the
  missing values and the inference of the types, which are most of the
  work, would still be ours, and it would be a dependency for the
  smallest part of it.

### Tests, lint, format, packages

- **Vitest** for the unit tests of `src/core` and of the plots, with no
  browser; **Playwright** for the tests in a browser, Chromium, Firefox
  and WebKit, which are the three engines popnei supports.
- **ESLint** with typescript-eslint, and **Prettier**, the established
  pair. Biome, one faster tool for both, is younger. `@eslint/js`, the
  rules ESLint recommends, is part of ESLint, published by its team.
- **npm**, which comes with node.

For development only, taken by the owner on 24 September 2026:

- **jsdom**, the DOM in node that the tests of the plots run in. It has
  been maintained since 2010 and is what most DOM tests run on; happy-dom,
  faster, lacks some of what the plots use.
- **@axe-core/playwright**, by Deque, which runs axe, the usual
  automatic checker of accessibility, inside the Playwright tests.
- **fast-check**, the property-based testing of JavaScript, as
  Hypothesis is for Python: it draws random projects and sequences of
  commands and shrinks a failure to the smallest one. It depends on one
  small package of its author.
- **@types/node**, the types of node, for the configuration files and
  the tests that read files.

Not taken: `@vitest/coverage-v8`, which is optional, so coverage is not
measured for now (`.claude/skills/coding/testing.md`); and
`eslint-plugin-jsx-a11y`, a lint of accessibility in the markup, not
proposed for now: the widgets come from React Aria, which gives them their
roles and labels, and axe checks every state of the screens in the
browser (`.claude/skills/coding/testing.md`).

## 3. The layout of the code

```
src/core/      plain TypeScript: the project, the keys of the results,
               undo, the project file. No React, no DOM.
src/worker/    the web workers: the wasm package of popnei in the
               calculation worker, the reader of CSV and TSV, the messages
               to the workers and from them, in src/worker/protocol.ts
               and src/worker/messages.ts, and the page's side of them.
src/charts/    D3 and three.js. Each plot is a function that takes an
               element and the data and returns a handle to update or
               remove it. No React.
src/ui/        React: the screens and the widgets, reading src/core.
docs/          these documents, and the Markdown of the help.
```

`src/core` is where a mistake would give a wrong result, a stale number
shown as current or a project that does not restore, so it is the part
tested most. There is no Rust in the repository: the two wasm modules,
popnei's and xlsx_rs's, come as packages from their releases (section 5).

## 4. The site

- **One HTML file per page, no router.** `index.html`, the start page;
  `popgen.html`, the population genetics application; `gwas.html`, the
  association application; and the documentation pages. Vite builds each
  as an entry. Any static host serves them with no rewrite rules.
- **The step of an application is in the URL hash**, `popgen.html#analyses`,
  so that the back button of the browser moves between steps.
- **The host is GitHub Pages**, decided by the owner on 24 September
  2026, deployed by a GitHub Actions workflow that builds the site with
  Vite and publishes the `dist/` folder. Its limits, 1 GB for a site and a
  soft 100 GB a month of traffic, are far above what the applications,
  the wasm package and the example datasets need.
- **GitHub Pages cannot set HTTP headers, and threads in wasm need two.**
  A browser gives `SharedArrayBuffer`, which threads in wasm need, only to
  a page served with `Cross-Origin-Opener-Policy` and
  `Cross-Origin-Embedder-Policy`. popnei is single threaded in its first
  version, and whether it gets threads later is an open question of its
  `rust_core.md`, so nothing is needed now. If threads come, a service
  worker of the site adds the two headers to the responses it serves,
  the way coi-serviceworker, a small and widely copied script, does on
  GitHub Pages; the page loads once more the first time a user opens it.
  The option not taken was a host that sets headers, Cloudflare Pages or
  Netlify.
- **Every file the site loads is served by the site.** The fonts, the
  scripts and the example data are in the repository, none from another
  domain. A page under `Cross-Origin-Embedder-Policy` cannot load from
  another domain what that domain does not allow, so this keeps threads
  possible; and a site that promises that the data never leaves the
  browser should make no request to anyone else.

## 5. How the application gets popnei, and xlsx_rs

Decided by the owner on 24 September 2026, while both are developed; and
on 28 September 2026 for xlsx_rs, the project of the reader of xlsx,
whose package is taken in the same way (below).

The wasm package cannot be installed from the git repository of popnei
directly. It is in a folder of the repository, `js/popnei`, and npm
installs from git only a package at the root of a repository; and its
built files, `dist/` from TypeScript and `wasm/` from cargo and
wasm-bindgen, are not in git, so an install from git would have to build
them. A release spares the site a Rust toolchain, a checkout and a
release build of the whole of popnei in every build of the site, and it
means that what the site runs is a popnei that was tagged and built in
popnei, with its hash in the lockfile.

So the package is taken from a GitHub Release of popnei:

1. In popnei, a tag such as `js-v0.1.0-dev.3`; the package built with
   `npm run build`, packed with `npm pack`, and the `.tgz` attached to a
   pre-release of that tag. popnei has made its three releases so far,
   `js-v0.1.0-dev.1` to `js-v0.1.0-dev.3`, by hand, as the notes of the
   last say; a GitHub Actions workflow that does it on a tag was the
   recommendation of `docs/specs/site.md`, open point 2, and is not
   written yet.
2. The `package.json` of the application names that file by its URL,
   `"popnei": "https://github.com/JoseBlanca/popnei/releases/download/js-v0.1.0-dev.3/popnei-0.1.0.tgz"`,
   and the lockfile keeps its hash.
3. A newer popnei in the application is a new tag in popnei and a new URL
   here.

Every tag is used once and never moved, because a file that changed under
the same URL no longer matches the hash in the lockfile. The repository of
popnei is public, so the release is downloaded with no token. When popnei
is published to npm, only the URL changes, to a version.

While popnei and the application are changed together, the application
uses the local build of popnei, packed with `npm pack` in
`popnei/js/popnei` and installed here by the absolute path of the
`.tgz` with `npm install --no-save`, which copies it into
`node_modules/` and changes neither `package.json` nor the lockfile, so
nothing of it is committed. Not a link, `npm link` or a `file:` path: a
link is a symbolic link whose `.wasm` the development server refuses to
serve, "403 Forbidden", as the review of 28 September 2026 saw with
popnei's link, and a relative path such as `../popnei` names no folder
from a worktree under `.claude/worktrees/` (`docs/architecture.md`,
section 6). What is committed, and what the site is built from, is
always a release.

xlsx_rs is taken in the same way, from its own releases, on tags
`js-v…` of its repository, `github.com/JoseBlanca/xlsx_rs`, under the
owner's account and public as popnei's is, as the owner decided on 28
September 2026 (`docs/architecture.md`, section 13, point 11): `"xlsx_rs":
"https://github.com/JoseBlanca/xlsx_rs/releases/download/js-v0.1.0-dev.1/xlsx_rs-0.1.0.tgz"`
for the first, a new tag and a new URL for each newer one. While the two
are changed together, its local build is packed and installed as
popnei's is, above, and never linked, for the same reasons. So the site
needs no Rust at all.

## 6. The browsers

The applications run from Chrome and Edge 111, Firefox 115 and Safari
16.4, on macOS and iOS, as the owner decided on 24 September 2026. That
is higher than popnei's own floor for the library, Chrome 91, Firefox 89
and Safari 16.4, which stays as it is. The reasons: React Aria calls
`Array.prototype.findLast`, Chrome 97 and Firefox 104, and `at`, Firefox
90; the code of the core calls `toSorted`, Chrome 110, Firefox 115 and
Safari 16, which the start guard of each page tests for
(`docs/specs/entry.md`, "The page"); a module worker, which lets the files wasm be loaded apart, needs
Firefox 114; and what is lost is Chrome and Firefox of 2021 to 2023,
while Safari, and so every browser of iOS, stays at 16.4. The versions
are those of MDN's compatibility data. What follows from it, the
language the compiler accepts, the CSS allowed and the build of the
worker, is in `.claude/skills/coding/typescript.md`, `css.md` and
`worker.md`.

## 7. Open points

1. Whether calamine reads right the xlsx files that users make, dates,
   sparse rows and Excel in other languages included, on a set of
   test files kept in the repository. On 27 September 2026 its source,
   and a trial with `#GETTING_DATA`, showed that it refuses a whole
   sheet at an error cell it does not know, `#GETTING_DATA` among them;
   whether `#SPILL!` of the newest Excel is one is unconfirmed
   (section 2, "xlsx and zip in Rust, in xlsx_rs"); the
   files the owner makes for the tests of xlsx_rs, kept in its
   repository, `docs/specs/worker/files.md`, "How it is verified",
   answer the rest.
2. How the second wasm module is built and published. Settled by the
   owner on 24 September 2026: a crate of this repository,
   `crates/files/`, built by the site's own build; settled again on 28
   September 2026: xlsx_rs, a project of its own, released as popnei is
   and installed from its release (sections 2 and 5); its releases made
   by hand, as popnei's are, and a workflow shared with popnei later,
   also decided by the owner that day.
3. The threshold and the method of thinning the points of the Manhattan
   plot.
