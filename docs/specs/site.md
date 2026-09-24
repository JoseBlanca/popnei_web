# The site stands up, and popnei runs in it

24 September 2026, approved by the owner on 24 September 2026. The owner
changed it the same day, after the review of work package 1 of the plan:
a request the worker does not know has a failure of its own, a failure
to open a file names the file, and only the probe's worker calls popnei.
This spec is stage 0 of `docs/build-order.md`: the repository of the site
set up, a workflow that checks it and publishes it on GitHub Pages, and
one page, the probe, whose worker loads popnei's wasm package and opens a
variant file. It develops sections 4 and 5 of `docs/technology.md`, and
depends on `.claude/skills/coding/configs.md`, `worker.md` and
`testing.md`, which give the configurations and the patterns it uses. The
words of the web it uses are explained at the start of
`docs/build-order.md`; the few that are not are explained where they
first come.

## What it does

It tries the one thing no document can settle: that popnei's wasm, loaded
the way popnei's package loads it, works inside a web worker built by Vite,
served from GitHub Pages under the site's base path, in the three browser
engines, Chromium (Chrome and Edge), Firefox and WebKit (Safari). A
**module worker** is a worker whose code is loaded as a JavaScript module,
which can import other modules; it is the kind the applications use
(`worker.md`).

A user who opens `https://<owner>.github.io/popnei_web/probe.html` sees
popnei's version and what popnei read from a small variant file that the
site serves: "200 individuals, ploidy 2". They can also pick a variant file
of their own, `.nei` or VCF, and see the same for it. If popnei's wasm
cannot be fetched or started, the likeliest way this stage fails, the page
says so, with the browser's or popnei's message, and does not stay blank.
The address of the wasm it tried is on the page in some of these failures
and not in others, as "The cases" says: popnei's `init()` neither takes
the address nor gives it.

The probe is kept after stage 0, linked from no other page, as the check
that a deploy still loads popnei: its end-to-end test keeps running on
every push.

### The repository

The files of `.claude/skills/coding/configs.md`, as that file has them,
with these differences at this stage:

- **No files crate yet.** The files crate is the small Rust crate that
  will read and write xlsx (`docs/architecture.md`, section 6); it comes
  with stage 4. Until then `dev` is `vite` and `build` is `vite build`, as
  `configs.md` says.
- **The pages are HTML files at the root of the repository**, not in
  `pages/`, so that the build writes them to the root of `dist/` and they
  are served at `/popnei_web/probe.html`, the addresses of
  `docs/technology.md` section 4; in `pages/` they would be served at
  `/popnei_web/pages/probe.html`. At this stage they are `index.html`, a
  placeholder of one line, "popnei web, under construction", until stage
  8, and `probe.html`; `popgen.html` and `gwas.html` come with their
  stages. So the `input` of `vite.config.ts` is `{ index, probe }`, each
  resolved at the root: Vite fails the build when `input` names a page
  that does not exist, so the pages are added to it with their stages. The
  plan changes section 9 of the architecture and `configs.md` to match.
- **`appType: "mpa"` in `vite.config.ts`**, which tells Vite the site has
  several pages and no single-page fallback. Without it, the development
  server and `vite preview` answer a missing file with `index.html` and
  status 200, so a wrong address for the wasm or for the served file gives
  a wrong error, "not a vars file" or a failed compile, instead of "not
  found"; GitHub Pages answers 404, and the local servers then behave as it
  does.
- **The configs cover `src/probe/`**, which `configs.md` does not name,
  since the probe is not one of the layers of `docs/architecture.md`
  section 9, the parts of the code and what each may import:
  - a tsconfig for the page, `tsconfig.probe.json`, with the libraries of
    the DOM and JSX, over `src/probe/` without its worker and its tests;
  - a tsconfig for its worker, `tsconfig.probeworker.json`, with the
    library of a worker, over `src/probe/probeWorker.ts` and
    `src/probe/messages.ts`;
  - both in the `references` of `tsconfig.json`, and
    `src/probe/**/*.test.ts` in `tsconfig.test.json` and in the `include`
    of the Vitest project that runs in node;
  - in `eslint.config.js`, a pattern that forbids every file outside
    `src/probe/` to import from it, and a block that lets `src/probe/`
    import popnei and React and nothing of `src/`, and a block that lets
    only the worker, `src/probe/probeWorker.ts`, import popnei's
    functions: the page's files may import its types and nothing else, as
    in the applications, where the page never loads popnei's wasm.
- **The dependencies**, each at an exact version:
  - `popnei`, from the URL of its GitHub Release (`docs/technology.md`,
    section 5; **Open 2**);
  - `react` and `react-dom`, so that the build of React is tried now;
  - for development only: `vite`, `@vitejs/plugin-react`, `typescript`
    6.0.3, `@types/react`, `@types/react-dom`, `@types/node`, `eslint`,
    `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`,
    `prettier`, `vitest`, `@playwright/test`, `@axe-core/playwright`.

  All are in `docs/technology.md` section 2, except the types of React,
  which React does not ship and which the choice of React with TypeScript
  brings, as `@vitejs/plugin-react` comes with Vite. The rest of that
  section, jsdom, fast-check, D3 and three.js, comes with the stage that
  first uses it.

### The probe

Its files, all in `src/probe/` but the page and the fixtures:

| file | what it holds |
|---|---|
| `probe.html` | the page, at the root, which loads `src/probe/probe.tsx` |
| `src/probe/probe.tsx` | a React root, the element a React application draws into, with one screen |
| `src/probe/probeWorker.ts` | the worker |
| `src/probe/messages.ts` | the types of the messages and their two validators |
| `src/probe/messages.test.ts` | the Vitest test of the validators |

**The page** shows popnei's version, the result of the file the site
serves, and a file input for the user's own. It starts the worker with
Vite's `?worker` import, `import ProbeWorker from "./probeWorker.ts?worker"`,
the way `worker.md` says the applications will start theirs in
`src/worker/start.ts`, a file of stage 2 that is not created here: trying
that way of starting a worker is the point of the stage. The page listens
to the worker's `error` event, which fires when the worker cannot start,
and when the worker stops on an error nothing in it caught.

What the page says, beyond the texts of "The cases":

- **The file input** is labelled "Variant file" and described as "A .nei
  file, or a VCF whose name ends in .vcf or .vcf.gz. A file with any other
  name is read as a .nei file.", since the name alone chooses the reader.
  It is disabled until popnei is loaded, and the text under it says why,
  from where popnei is: "A file can be picked once popnei is loaded.",
  "No file picked yet.", "No file can be opened, since popnei could not
  be loaded.", "No file can be opened, since the probe's worker did not
  start.", or, after a defect stopped the worker, "No more files can be
  opened, since the probe's worker stopped. Reload the page." The input is
  described by that text too, which a screen reader reads with the input
  while it can be used. The Tab key does not reach a disabled input, so
  a user of the keyboard then finds the text as the paragraph under it,
  in the order of the page. The served file's section says the same
  in its own words: "It is opened once popnei is loaded.", "Not opened,
  since popnei could not be loaded.", "Not opened, since the probe's
  worker did not start."
- **The result** is announced to a screen reader when it arrives, and
  the texts that wait for popnei are not, since nobody asked for them.
- **The times** have one decimal, "under 0.1 ms" below it, and say what
  they cover: "popnei opened it in 1.8 ms, not counting the download" for
  the served file, "not counting the reading from the disk" for the
  user's.
- **A file of the user that popnei refused** has, after popnei's
  message, which reader the name chose: "It was read as a VCF because its name ends in
  .vcf or .vcf.gz; any other name is read as a .nei file.", or "It was
  read as a .nei file because its name does not end in .vcf or .vcf.gz."
  A `.nei` file named `.vcf` is otherwise refused as "not a VCF" with
  nothing to say why. A file that failed before popnei read it, one the
  browser could not read because it was moved after it was picked, has
  no such sentence, since no reader was used.
- **The defects of the probe** are a list under the heading "Defects of
  the probe", which a screen reader announces one at a time as each is
  added, and not the whole list again at each new one.
- **A message that ends a sentence of the page**, popnei's, the
  browser's or the worker's, gets the full stop the sentence needs; its
  words are kept as they came, popnei's quotation of the first 16 bytes
  of a file among them.
- **Picking the same file again** opens it again: the page empties the
  input when it is clicked, before the browser's dialog opens, so that
  the same file is a change; after the pick the input shows the name of
  the file picked.

**The worker**, when it starts, calls popnei's `init()`, which fetches and
compiles popnei's wasm, and sends `ready` with popnei's version and how
long `init()` took. Then it answers two requests:

- `openServed`: it fetches the file the site serves, at
  `import.meta.env.BASE_URL + "probe/panel.nei"`, the base path of the
  site followed by the file's path, never an address that starts with `/`,
  which on GitHub Pages would leave out `/popnei_web/` (`worker.md`). It
  checks that the answer has status 200 before it gives the bytes to
  popnei. It fetches with `cache: "no-cache"`, which asks the server
  whether its copy is still current: the file keeps its name from one
  build to the next, and GitHub Pages lets a browser keep a copy for ten
  minutes.
- `openFile`: it reads the `File` the page posted, the handle the browser
  gives to a file the user picked, with `FileReaderSync.readAsArrayBuffer`,
  which reads a whole file and waits until it has it, and exists only in a
  worker. It is how the calculation worker will read the user's files
  until popnei can read a file by ranges, a piece at a time
  (`docs/architecture.md`, section 6; popnei issue #1).

It opens the bytes with popnei's `openVcf` when the name ends in `.vcf` or
`.vcf.gz`, compared without case, and with `openVars` otherwise; sends
`opened` with the number of individuals, the ploidy and how long it took;
and frees the `Variants`. The individuals come from the file in both cases
(`Variants.individuals`, popnei `js/popnei/src/variant.ts`). The ploidy is
in a `.nei` file, but a VCF cannot tell it: it is an argument of
`openVcf`, 2 by default (`io_vcf.ts`). Opening reads only the header, so a
tetraploid VCF opened as diploid opens with no error; popnei refuses it at
the first pass that reads its genotypes, with a message that names the
line, the individual and both ploidies (run under node on 24 September
2026). The probe makes no such pass, so it opens a VCF with the default
and says the ploidy was given, not read: "200 individuals, ploidy 2
(given: a VCF is opened as diploid)". The applications ask the user for
it (`docs/architecture.md`, section 2).

The `initMs` and `openMs` it sends are the first measurements of the cost
of starting popnei in a worker, which the walking skeleton needs
(`docs/build-order.md`, stage 2).

The probe is not the calculation worker of the architecture: its messages
are its own, and the real protocol, client and runner are specified for
stage 2.

### The fixtures

`e2e/fixtures/make_fixtures.mjs`, a script written in this stage, which
`testing.md` names, reads `e2e/fixtures/panel.vcf.gz`, a copy of the panel
of popnei's `tests/reference/stats/panel.vcf.gz`, with the node entry of
the popnei package installed, and writes it with `writeVars` as one vars
file, `e2e/fixtures/panel.nei`: 1200 variants, 200 individuals, ploidy 2,
261,490 bytes (popnei 0.1.0 under node, 24 September 2026). The build
serves it at `probe/panel.nei` through a copy, `public/probe/panel.nei`,
which the script writes as well, since Vite serves what is in `public/`.
It also reads `e2e/fixtures/tetraploid.vcf.gz`, a copy of popnei's
`tests/reference/dists/tetraploid.vcf.gz`, opens it with ploidy 4 and
writes `e2e/fixtures/tetraploid.nei`: 200 variants, 12 individuals, ploidy
4, 16,194 bytes (popnei 0.1.0 under node, 24 September 2026). Its numbers
differ from the panel's, so a page that always showed the panel's fails
the test that picks it. All these files are committed, so neither the site nor its tests need a
checkout of popnei, and the script is run again only when popnei's format
of vars files changes. `e2e/fixtures/bad.vcf` is a line of plain text, for
the case of a file popnei refuses.

### The workflow

`.github/workflows/site.yml`, the continuous integration of `testing.md`,
without its Rust setup, which comes with the files crate:

- **check**, on every push and pull request: `npm ci`, `npm run
  format:check`, `npm run typecheck`, `npm run lint`, `npm test`;
- **e2e**, on every push and pull request: `npm ci`, `npx playwright
  install --with-deps`, `npm run test:e2e`, the report kept when it fails;
- **deploy**, on a push to `main`, with `needs: [check, e2e]` so that it
  runs only when both passed: `actions/configure-pages`, the build,
  `actions/upload-pages-artifact` with `dist/`, `actions/deploy-pages`,
  with the permissions `contents: read`, `pages: write` and `id-token:
  write`, as `testing.md` gives them.

## The messages of the probe

Both directions are checked when they arrive, by a validator of each in
`messages.ts`, as every message between threads is
(`.claude/skills/coding/typescript.md`): a message that is not one of
these is a defect, shown as an error on the page.

```ts
type ToProbe =
  | { kind: "openServed" }                  // the served panel.nei
  | { kind: "openFile"; file: File };       // a file the user picked

type FromProbe =
  | { kind: "ready"; popneiVersion: string; initMs: number }
  | { kind: "opened"; source: "served" | "file"; name: string;
      numIndividuals: number; ploidy: number; ploidyAssumed: boolean;
      openMs: number }
  | { kind: "failed"; stage: "init"; address: string | null;
      message: string }
  | { kind: "failed"; stage: "open"; source: "served" | "file";
      name: string; address: string | null; message: string;
      popneiRefused: boolean }
  | { kind: "failed"; stage: "message"; message: string };
```

`failed` has three stages. `init` is popnei that could not be loaded.
`open` is a file that could not be opened, and it carries the `source` and
the `name` that `opened` carries, so that the page shows each answer
beside its own file: the served file is fetched over the network while
the user's is read at once, so their answers can arrive in either order,
and a user's file that fails must not take the place of the served
result. It also says whether popnei refused the file, `popneiRefused`,
true when popnei's `openVcf` or `openVars` threw and false when the file
failed before, not found, not read, or popnei not loaded: only for a
file popnei refused does the page say which reader its name chose.
`message` is a request the worker did not recognise, which only a
defect of the page can send. `init` and `open` carry the address the
worker tried, when there was one, and the message as it came, popnei's or
the browser's; `message` carries what was wrong with the request. The page
asks for the served file as soon as `ready` arrives, so the first result
needs no action of the user.

## The cases

- **The wasm is not found or does not compile.** popnei's loader fetches
  `new URL("popnei_bg.wasm", import.meta.url)`, and a wrong base path or a
  worker built in the wrong way gives an address with nothing there. The
  worker catches what `init()` throws and sends `failed` with stage
  `init`; the page shows "popnei could not be loaded." with the message,
  under the label "Message:", since it is popnei's or the browser's, and
  "Reload the page. If popnei still does not load, report it at
  https://github.com/JoseBlanca/popnei_web/issues, with the message
  above, and the address when the page shows one." The sentence holds
  when no address is shown, as in the second and third failures below.
  popnei's `init()` takes no address and gives none, so the worker looks
  for it in the browser's list of what the worker fetched,
  `performance.getEntriesByType("resource")`, the entry whose path ends
  in `.wasm`, and sends null when there is none; the page then shows the
  address under the label "Address tried:" when it has one, and the
  message always. What the user sees of the address, in Chromium 153 and
  WebKit 26.6 on 24 September 2026:
  - the wasm arrives and does not compile: "Address tried:" with the
    address, in both engines;
  - the server answers 404: no "Address tried:", since the list does not
    have the wasm; the address is only inside popnei's message, "failed
    to fetch Wasm: 404 Not Found fetching '…'", in both engines;
  - the network fails: Chromium shows "Address tried:" with the address;
    WebKit shows no address, only its message "Load failed".

  Firefox was not seen in these three failures. A later popnei whose
  `init()` took the address, or gave it with the error, would let the
  page show the address in every case.
- **The served file is not found**, a wrong address: the status is not
  200, and the worker sends `failed` with stage `open`, the source
  `served`, the address and "the server answered 404 Not Found", instead
  of giving popnei an HTML page to read.
- **The worker does not start**, a module worker in a browser that has
  none, or a syntax error in its bundle: the worker's `error` event. A
  module worker that fails to load gives an event with no message, in
  Chromium and WebKit on 24 September 2026, so the page shows "The
  probe's worker did not start.", the browser's message after it only
  when there is one, and the advice to reload and report. It is the
  probe's worker, not the calculation worker of the applications.
- **Every request of a file is answered.** Whatever the worker's code
  throws while it opens a file, and not only what popnei throws, it
  catches and sends as `failed` with stage `open`, the source and the
  name, so that no section of the page waits on "Opening …" for an
  answer that will not come.
- **popnei traps**, a `WebAssembly.RuntimeError`, which a panic of
  popnei's Rust becomes: after one, the memory of the wasm is not to be
  trusted (`worker.md`), so the worker does not answer the request but
  reports the error, with `reportError`, and closes itself. The page
  receives it as the worker's `error` event after `ready`, and shows "A
  defect of the probe: its worker stopped.", with the browser's message,
  and "Reload the page. If it happens again, report it at
  https://github.com/JoseBlanca/popnei_web/issues, with the name of the
  file and the message above.", since a trap is a defect of popnei; a
  file that was being opened shows "the probe's worker stopped before it
  answered", and the file input is disabled, with its text saying so.
  When the input had the focus, the page moves it to the heading of the
  defects, so that a user of the keyboard is not left on nothing.
- **A file popnei refuses**, the text in `bad.vcf`, a truncated gzip, a
  vars file of another version: `failed` with stage `open`, the source
  `file`, the name of the file and popnei's message, "the source is not a
  VCF: it starts with …" for the first (run under node, 24 September
  2026). The page shows it beside the file input, the served result stays
  where it was, and the page stays usable for another file.
- **A request the worker does not recognise**, a `ToProbe` that fails its
  validator, which only a defect of the page can send: `failed` with stage
  `message` and what was wrong with the request. The page shows "A defect
  of the probe: the worker received a request it does not know", with
  those details. It is neither a file that could not be opened nor a
  worker that did not start, and the page does not call it either.
- **A message the page does not recognise**, a `FromProbe` that fails its
  validator: a defect as well, shown as "A defect of the probe: the page
  received a message it does not know", with what was wrong with it.
- **A VCF of another ploidy** opens, as above, and would be refused at
  the first pass, which the probe does not make.
- **A file of a gigabyte** is read whole into memory, as the architecture
  says for popnei 0.1.0 (section 6); the probe does not guard against it.

## How it is verified

1. **The checks of the coding skill** pass locally and in the workflow:
   format, types, lint, and `npm test`, which runs
   `src/probe/messages.test.ts`: the validator of `FromProbe` accepts each
   of its messages, `failed` in each of its three stages, and refuses a
   message of another kind, one with a missing field and one with a field
   of the wrong type, and a `failed` with the fields of another stage, an
   `open` without its `source` and an `init` with one; the validator of
   `ToProbe` accepts its two, and refuses the same three wrong ones; and
   the text of each way a message can be wrong. The lint fails on a file
   of the probe's page that imports a function of popnei, statically or
   with `import()`.
2. **`e2e/probe.spec.ts`**, with Playwright, against the built site under
   its base path, in Chromium, Firefox and WebKit:
   - the page shows the version `0.1.0` and, for the served file, "200
     individuals, ploidy 2";
   - the file input given `e2e/fixtures/panel.nei` shows the same;
   - given `e2e/fixtures/panel.vcf.gz`, "200 individuals, ploidy 2
     (given: a VCF is opened as diploid)";
   - given `e2e/fixtures/bad.vcf`, popnei's message and the reader its
     name chose, and the served result stays on the page; a file that
     failed before popnei read it, no sentence on the reader;
   - given `e2e/fixtures/tetraploid.nei`, "12 individuals, ploidy 4";
   - two files picked one after the other: only the second is shown;
   - the answers in either order: the served file held back until
     `bad.vcf` has been refused, then released; the served result
     appears in its section and the refusal stays with `bad.vcf`;
   - popnei's wasm answered 404, "popnei could not be loaded." and
     popnei's message with the address; answered 200 with bytes that are
     not wasm, "Address tried:" with the address;
   - the worker's script answered 404, "The probe's worker did not
     start." and no empty line after it;
   - a request the worker does not know, posted from inside the page, and
     a message the page does not know, posted from inside the worker: each
     shows its defect, in an alert;
   - a throw in the worker while it opens a file: the file's section shows
     the failure; a `WebAssembly.RuntimeError` thrown there: the defect
     of a stopped worker, and the file input disabled;
   - axe, the checker of accessibility that `testing.md` runs from
     Playwright, finds no violation of WCAG 2.2 at level AA, the standard
     of accessibility the applications keep to;
   - every request the page makes is to the origin of the site: no font,
     script or file from another domain (`docs/technology.md`, section 4).
3. **The deployed site.** After the first deploy, the same test run
   against the address on GitHub Pages, with `BASE_URL` set as
   `testing.md` says, passes in the three engines; and `curl -sI` on the
   `.wasm` file shows `Content-Type: application/wasm`, without which
   popnei's loader falls back to a slower way of compiling and says so in
   the console (`worker.md`).
4. **The measurements**, the `initMs` and `openMs` of each engine on the
   deployed site, on the owner's machine, are written in the work report
   of the plan (`following-plans`).

What cannot be checked: Playwright runs the current version of each
engine, not Firefox 115 or Safari 16.4, the oldest the applications
support; those are held by Vite's `build.target`, which rewrites newer
syntax for them, and by the compatibility tables of MDN
(`.claude/skills/coding/css.md`, `categories.md`).

## Open points

1. **The repository of the site.** Settled: the owner created
   `https://github.com/JoseBlanca/popnei_web` on 24 September 2026, which
   gives the base path `/popnei_web/`. The owner also sets, in its
   settings, the source of Pages to GitHub Actions, which the deploy job
   needs.
2. **The first release of popnei's wasm package.** `npm ci` installs
   popnei from the URL of a `.tgz`, the packed package, on a GitHub
   Release of popnei, which does not exist yet; popnei has no workflow
   that makes one (`docs/technology.md`, section 5). It is made in popnei's
   repository, by the owner or by a session there, not by the implementer
   of this stage. Options:
   - by hand, now: `npm run build` and `npm pack` in `js/popnei`, and the
     `.tgz` attached to a pre-release of popnei; about ten minutes, and it
     does not wait for anything;
   - the workflow in popnei first, a file of GitHub Actions of some forty
     lines that builds the wasm with Rust and wasm-bindgen, packs it and
     makes the release from a tag; not estimated, but hours, since it has
     to be tried on a tag, and it makes every later release the same.

   Recommendation: by hand now, the workflow before stage 2, when popnei
   changes more often. The tag follows `docs/technology.md` section 5,
   `js-v0.1.0-dev.1` for the first. Meanwhile, the implementer works with
   a local link to popnei's build, which is never committed, and the
   first push waits for the release.

## Not in this spec

- The protocol, the client, the runners and the queue of the two workers,
  and `src/worker/start.ts`: their specs, for stage 2.
- The files crate and the Rust in the workflow: with stage 4.
- The design tokens, the widgets and the shell of the applications: with
  the walking skeleton. The probe uses plain elements and the browser's
  default look.
- jsdom, fast-check, D3 and three.js: with the stages that first use them
  (`docs/build-order.md`).
