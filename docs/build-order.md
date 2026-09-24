# The order in which the applications are built

Written on 24 September 2026, to be revised after the walking skeleton
of stage 2. The pieces the two web applications are built
from, in the order they are built, why each comes where it does, what it
needs of popnei, and what shows that it is done. What the applications do
is in `docs/functionality.md`, their parts in `docs/architecture.md`, and
how each piece becomes a spec, a plan and code in the skills
`writing-specs`, `writing-plans` and `following-plans`. Each stage below is
one plan or a few, and each plan is written when its stage is next, not
before: what the first stages teach changes the later ones.

## The words of the web used here

- **wasm package**: popnei compiled to WebAssembly, the form in which its
  Rust runs in a browser, published with the JavaScript that loads it.
- **web worker**: a second thread of a browser tab, where a long
  calculation runs without freezing the page. The applications have two:
  the **calculation worker**, the only one that opens the variant file and
  runs popnei, and the **light worker**, which reads the individuals file
  and writes xlsx and zip files, so that those jobs of a second do not
  wait behind a calculation of minutes.
- **GitHub Pages**: the host of the site, which serves files and runs no
  code. The **base path** is the part of the site's address after the
  host, `/popnei_web/` for a repository of that name, which every address
  inside the site starts with.
- **The tools of the build and the checks**, all chosen in
  `docs/technology.md`: Vite builds the site; ESLint and Prettier check
  and format the code; Vitest runs the tests that need no browser;
  Playwright opens the site in the three engines of the browsers,
  Chromium (Chrome and Edge), Firefox and WebKit (Safari), and runs the
  tests there; axe checks the accessibility of each screen from
  Playwright. **CI** is those checks run by GitHub Actions on every push.
- **The parts of the code**, from `docs/architecture.md`: `src/core` holds
  the project, the settings of the user, and the results, each stored
  under a **key**, a hash of everything it was calculated from, so that a
  result whose inputs changed is never shown; the **store** is the one
  place the screens read the project and the results from. `crates/files/`
  is the small Rust crate that reads and writes xlsx.
- **The screen**: the **stepper** is the row of steps at the top of an
  application, the **summary line** the one below it that says what
  dataset is in use, and a **notice** a short message such as "3 results
  removed because the MAF filter changed · Undo". **SVG** is the vector
  format the plots are drawn in, and three.js the library that draws the
  3D PCA.
- **check numbers**: a few numbers of each result kept in the project
  file, so that when a project is opened and run again, the application
  says whether the new results are the same as the original ones.

## 1. How the order was chosen

- **What could sink the project goes first.** The one thing that no
  document can settle is whether popnei's wasm package loads and runs in
  a web worker, built by Vite and served by GitHub Pages, in the three
  browser engines. Everything rests on it, so it is tried before anything
  is built on it (stage 0).
- **The walking skeleton before any breadth.** The smallest path that
  goes through every layer once (`docs/architecture.md`, section 10)
  comes before any second analysis, because a mistake in how the layers
  fit is cheap to fix when one analysis depends on it and dear when ten
  do.
- **Logic before screens.** Within a stage, the modules of `src/core` and
  `src/worker`, which are specified in full and tested without a browser,
  come before the screens that show them, which are refined in the running
  application with the owner.
- **Population genetics before association.** It is the application with
  more of its analyses already in popnei, and association reuses its
  variants step and its PCA. The GWAS comes when its step and its plots
  can be built on pieces that already work.
- **What popnei lacks comes last within its stage, or waits.** An analysis
  whose calculation popnei does not have yet is built after the ones it
  has, so that no stage stops on popnei; section 4 lists what is asked of
  popnei and which stage needs it.
- **Measure, then decide.** Four choices were left for a measurement of
  the walking skeleton (section 3, stage 2); the stages after it follow
  those measurements.

## 2. What popnei already gives

Checked against its TypeScript package on 24 September 2026, so that the
order does not wait for what exists:

- reading a VCF and a `.nei` file from their bytes, and writing a `.nei`
  file;
- the filters by missing data, MAF, observed heterozygosity and LD, and
  the filter of individuals by a list;
- the statistics per individual, missing data and observed
  heterozygosity, which the filters of individuals by threshold are built
  from in the application;
- per population, the expected and observed heterozygosity and the
  polymorphic variants, as means and histograms;
- seven distances between populations, Hudson's Fst and Jost's D among
  them, with their standard errors; Kosman distances between individuals;
- the PCA of the genotypes and the PCoA of a distance matrix; the r² of
  Rogers and Huff; the kinship;
- the GWAS of a continuous trait, linear and linear mixed, with
  covariates, its null model with the heritability; the logistic models
  are being written in popnei.

## 3. The stages

### Stage 0. The site stands up, and popnei runs in it

- **What:** the repository set up as `.claude/skills/coding/configs.md`
  says: `package.json`, the TypeScript configs, ESLint, Prettier, Vite,
  Vitest, Playwright; a GitHub Actions workflow that runs the checks and
  deploys to GitHub Pages; one page whose calculation worker loads popnei's
  wasm package from its release, opens a small `.nei` file and shows
  popnei's version and the number of individuals.
- **Why first:** it tries the one thing the documents cannot: popnei's
  wasm loader in a module worker built by Vite, under the base path of
  GitHub Pages, in Chromium, Firefox and WebKit. If it fails, the
  architecture changes before any code rests on it.
- **Needs of the owner:** the GitHub repository of the site, whose name
  sets the base path (`/popnei_web/` is assumed), and a release of popnei's
  wasm package on GitHub, made by a GitHub Actions workflow of popnei,
  which popnei does not have yet (`docs/technology.md`, section 5).
- **Done when:** the page, deployed, shows the version in the three
  engines of Playwright, and every check of the coding skill passes in CI.

### Stage 1. The core, with no screen

- **What:** the modules of `src/core` that everything else reads: the
  project and its commands, the keys and their hash, undo and redo, the
  cache of results, the store (`docs/architecture.md`, sections 2 to 4 and
  9); `result.ts`; and the types of `src/worker/protocol.ts` that core
  names, the filters, the individuals table and a run, without the jobs
  and their results, which come with the workers in stage 2
  (`docs/specs/worker/protocol.md`).
- **Why here:** they carry the invariant the applications are least
  allowed to break, that no result is shown stale, and they are pure
  TypeScript, tested fully with Vitest and fast-check before a screen
  depends on them.
- **Done when:** the cases of their module specs pass, the property tests
  of the keys and of undo among them.

### Stage 2. The walking skeleton

- **What:** `docs/architecture.md` section 10, whole: the two workers and
  their messages, with the queue, cancelling and the restart; the reader of
  CSV and TSV and the types of its columns, in the light worker; the shell
  of the population genetics application, its stepper, its summary line
  and its notices; the few widgets it needs; the missing data filter; the
  diversity table per population from popnei's expected and observed
  heterozygosity; the results removed with their notice when the filter
  changes, and brought back by undo with no calculation; a calculation
  cancelled; the project saved and opened.
- **Why here:** it goes through every layer once, so the ways they fit
  badly show up while one analysis depends on them.
- **Needs of the owner:** the screens tried, a planned stop of the plan
  (`writing-plans`).
- **Measured at its end, and decided:** the React Compiler, from what the
  renders of its screens cost (`docs/technology.md`); the cost of a
  restart of the calculation worker, and of compiling popnei's wasm; the
  bound of the cache; the number of SVG points a plot can hold, for the
  plots of the later stages (`.claude/skills/coding/charts.md`).
- **Done when:** its Playwright flow passes in the three engines, the
  owner accepted its screens, and the measurements are written down.

### Stage 3. The variants step, whole

- **What:** every filter of `docs/functionality.md` section 3, of variants
  and of individuals, with what each kept; the histograms of the checks
  per variant and per individual, the first plot of `src/charts`; writing
  the filtered variants as `.nei` and as VCF; the regions of a BED file.
- **Why here:** both applications share this step, and every analysis
  after it reads the variants it leaves. The histogram is the simplest
  plot, so the plot contract and its export are tried on it first.
- **Needs of popnei:** a VCF writer, if popnei does not have one; the
  regions of a BED file, if they are not filtered in popnei (to check).

### Stage 4. The samples step and the PCA

- **What:** the metadata file in xlsx, which brings the Rust crate
  `crates/files/` and Rust in CI (`docs/architecture.md`, section 6); the
  columns and their types, set by the user; the column that defines the
  populations; the PCA and the PCoA, first as a 2D scatter plot, then in 3D
  with three.js.
- **Why here:** the populations are what every analysis of the next stage
  groups by, and the PCA is where the user checks them. The 3D view comes
  after the 2D one, because the 2D plot tries the scatter, the colours of
  the populations and the export, which the 3D one reuses.

### Stage 5. The analyses of the populations

- **What:** each one a module of `docs/architecture.md` section 4 with its
  panel, in this order: the distances between populations, as a heatmap
  and a table, which popnei has; the diversity whole, with F, the private
  alleles and the rarefaction; the LD against distance, with the distance
  at which r² falls to half; the folded site frequency spectrum.
- **Why in this order:** first what popnei computes today, then what it
  is asked for (section 4), so that the stage never waits on popnei.
- **Needs of popnei:** the private alleles, the rarefaction, the folded
  SFS with its projection, and the distance at which the LD decays to
  half, if they belong in popnei rather than in the application (section
  4).

### Stage 6. Taking the work out

- **What:** the project file whole, with its check numbers; opening a
  project with another variant file, and the comparison after the new run;
  the report built as data in core and drawn on the page, zipped by the
  light worker; the Python script; every table as CSV and every plot as
  SVG and PNG.
- **Why here:** the report, the script and the check numbers have
  something to say only once the analyses of the population genetics
  application exist. Saving and opening the project came earlier, in the
  walking skeleton, so the format was tried then.
- **The population genetics application is complete at the end of this
  stage.**

### Stage 7. The association application

- **What:** its own page and steps (whether it is published before popnei
  has the logistic models, with continuous traits alone, is open point
  3); the traits file, with the roles of the
  columns and the coding of a binary trait; the transformations of the
  trait; the GWAS of a continuous trait with the kinship and the covariates,
  the principal components among them; the Manhattan plot, the QQ plot with
  λ, the table of the top hits, the heritability; then the GWAS of a binary
  trait when popnei has the logistic models.
- **Why here:** it reuses the variants step, the individuals file, the
  PCA, the project file and the report, all built before.
- **Needs of popnei:** the logistic models, which popnei is writing; the
  thinning of the points of the Manhattan and QQ plots, with the counts;
  λ, if it belongs in popnei.

### Stage 8. The site around the applications

- **What:** the start page with the two applications and the example
  datasets; the help drawer and its texts; the documentation pages; an
  audit of accessibility of the whole, beyond what axe checks in each flow.
- **Why last:** the start page and the help describe applications that
  exist, and their texts are written once the screens have settled. The
  example datasets are chosen with the owner, with a licence that allows
  hosting them.

### Reading files by ranges, when popnei gives it

Not a stage of its own. When popnei gives a source of bytes over a `File`
(popnei issue #1), it is a design first, as the `designing` skill says,
and then a change to the calculation worker. It can come after stage 2 at
any point, and the sooner the better, since the users' files are large;
until then the applications read a file whole, with the limits of
`docs/architecture.md` section 11.

## 4. What is asked of popnei, and when

| what | asked by | needed in |
|---|---|---|
| a release of the wasm package by a workflow | technology.md, section 5 | stage 0 |
| a source of bytes over a `File`, read by ranges, with progress | popnei issue #1 | after stage 2, as soon as it can |
| a VCF writer, if there is none | functionality.md, section 3 | stage 3 |
| the private alleles, the rarefaction, the folded SFS, the half-decay distance of LD | functionality.md, section 11 | stage 5 |
| the logistic models of the GWAS | popnei, being written | stage 7 |
| the thinning of the Manhattan and QQ points, and λ | technology.md; worker.md | stage 7 |

For the rows that say "if", whether the calculation belongs in popnei or
in the application is decided when the stage is planned. The rule is the
one of the rest of these documents: a number the user is shown is
popnei's when it is a calculation of population genetics, and the
application's when it is only arithmetic on popnei's results, such as F
from the expected and observed heterozygosity, or a filter of individuals
by a threshold on popnei's statistics per individual.

## 5. Open points

Each is for the owner, and none stops stage 0 but the first.

1. The name of the GitHub repository of the site, which sets its base
   path; needed for stage 0.
2. Whether the regions of a BED file are filtered in popnei or in the
   application, and whether the rarefaction and the distance at which the
   LD decays to half are popnei's calculations, by the rule of section 4;
   needed for stages 3 and 5. F is settled by that rule: it is the
   application's arithmetic on popnei's heterozygosities.
3. Whether the association application is published with continuous
   traits alone, before popnei has the logistic models, or waits for
   them; needed for stage 7.
