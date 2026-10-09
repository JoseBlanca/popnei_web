/**
 * The measurements of stage 2 that a browser makes, run by the projects
 * measure-chromium and measure-webkit and not by the flows (the plan of
 * the walking skeleton, work package 8, deliverable 4; testing.md, "The
 * measurements"). Each test prints its table, with the engine, its
 * version and the machine, for the report of the plan.
 *
 * - Point R (docs/specs/worker/runner.md, "In the browser"): a copy of
 *   panel.nei picked, run at 0.05, written again in place in one of three
 *   ways, and run at 0.05 with no open again and at 1 with one; what the
 *   page showed. First the check that the File is on the disk: the copy
 *   deleted after the pick, which a File on the disk cannot read.
 * - The restart (runner.md, "What a restart costs"): a new worker's start
 *   to its opened, a run whose filters changed, and a pass, on the VCF of
 *   80,692,954 bytes and the .nei file of 19,161,194 bytes.
 * - The metadata file of 10,000 rows, in Chromium
 *   (docs/specs/worker/individuals.md, "How it runs"): the pick to the
 *   columns shown, and whether a click is answered meanwhile.
 * - A pass over the VCF of the Stop in the middle (WS8 D3), whose size it
 *   sets.
 *
 * And those of the end of stage 2 (the plan, work package 10), each
 * repeated MEASURE_REPEATS times, 5 when it is not given, and printed as
 * the median and the range:
 *
 * - The memory of the tab, in Chromium, from the Chrome DevTools
 *   Protocol, with the .nei file of 19,161,194 bytes loaded and the
 *   diversity done, for the bound of the cache
 *   (docs/specs/core/cache.md, Open 1).
 * - The points an SVG plot can hold, 10,000 to 200,000 drawn as one path
 *   per group, in both engines, on the page e2e/measure/points.html,
 *   which is not part of the site (.claude/skills/coding/charts.md).
 * - The commits of React, in Chromium, for a change of the threshold, a
 *   result arriving, an undo and a change of step, with a metadata file
 *   of 10,000 rows, for the React Compiler (docs/technology.md). It needs
 *   the profiling build of e2e/measure/vite.profiling.config.ts, served
 *   at BASE_URL, and runs only when MEASURE_PROFILING is set.
 *
 * And those of the writing of the filtered variants of stage 3 (VS5 D5,
 * docs/specs/analyses/writeVariants.md, "To be measured"), in both
 * engines, run on one worker so that one browser runs at a time: the
 * write of the .nei file of 19,161,194 bytes and of a file ten times
 * larger, 200,000 variants, each MEASURE_REPEATS times, with the time
 * and the memory of the engine, the footprints of all its processes, at
 * each moment of the write; and the largest file written, the variants
 * doubled from 200,000, the first that fails tried again once, then
 * three halvings between the last written and the first failed. Every
 * file written is saved and read back whole with pyarrow, with uv.
 *
 * And the Count against the diversity (VS6 D3,
 * docs/specs/analyses/filterCounts.md, "The request"): a pass of each
 * with the missing data filter at 0.05, on the VCF of 80,692,954 bytes
 * and the .nei file of 19,161,194 bytes, each on a new page just after
 * the load, and the ratio of their medians.
 *
 * And the time of columnAllows (IP5 D4, docs/specs/core/project.md, "How
 * it runs"), in both engines: the page frozen by a metadata file of
 * 10,000 rows and 50 columns read, and by a project file that holds its
 * read opened, each MEASURE_REPEATS times on a new page, as the longest
 * time between two frames and, in Chromium, the longest task; and, beside
 * them, columnAllows alone on the same table, on e2e/allows.html, which
 * the plan's rule of 100 ms is about.
 *
 * And the times of the PCA (IP6 D6, docs/specs/analyses/pca.md, "How it
 * runs"), in both engines, each PCA run from its panel in the
 * application, on a new page, with its options set by a project file the
 * test writes, since the panel has none yet: the pruning inside a PCA, a
 * PCA with and without its own LD filter on panel.nei and the two files of
 * 20,000 variants; and the time and the memory of the engine for a PCA
 * and a PCoA of 700 to 9,381 individuals, from the gzipped VCFs of 300
 * variants of e2e/bigVcf.ts, with whether the worker was started again. A
 * tab that closes is recorded, and fails nothing.
 *
 * And the memory and the time of the LD decay (PA2 D7, the open-points
 * file of stage 5, "Set by a measurement"; docs/specs/analyses/ldDecay.md,
 * "How it runs"), in both engines, each run from its panel on a new
 * page, with its largest distance set by a project file:
 * the growth of the engine and its size when the answer arrives, which
 * the tab would keep without the restart after it, and 3 s after the
 * restart, on a VCF of 20,000 variants and 1,000 individuals at 100,000
 * and 1,000,000 bp; an LD decay at the lock of 1 GB of counts, on a file
 * whose positions are drawn at random, with the time of the fit after the
 * pass; and a file of 1,000 individuals with a variant every 100 bp at
 * the distances of MEASURE_LD_DENSE, until a tab closes or popnei
 * refuses. A tab that closes is the outcome of its case.
 *
 * And the time of the distances between populations (PA5 D3, the
 * open-points file of stage 5, "Set by a measurement";
 * docs/specs/analyses/popDists.md, "How it runs"), in both engines, each
 * run from its panel on a new page just after the load: panel.nei and the
 * .nei file of 19,161,194 bytes, each with three populations and with
 * twenty, from the run posted to the calculation worker to its answer,
 * and from the answer to the table of the pairs seen.
 *
 * And the time of each of the two passes of a Run of the diversity (PA7
 * D3, the open-points file of stage 5, "Set by a measurement";
 * docs/specs/analyses/diversity.md, "How it runs"), in both engines, on
 * panel.nei and the .nei file of 19,161,194 bytes, with what popnei
 * issue #4, one pass, would save.
 *
 * And the trial of the automatic download (DL1 D1, the plan of the
 * download, docs/plans/download.md, work package 1), in both engines:
 * whether the browser downloads a file that the page's code hands it at
 * once, 10 s and 70 s after a real click, and a second file in the same
 * page, after a second click or with none.
 *
 * And the cost of the bar (DL5 D1, the plan of the download, work package
 * 5), in both engines: the write of the .nei file of 200,000 variants of
 * 1,000 individuals on the old page, five times with popnei's progress
 * drawn by the bar and five times with it dropped in the worker, timed
 * from the press of Write to the answer of the write.
 *
 * The time to write and read a project file, and to make a key, is
 * measured in node, by e2e/measure/projectFile.ts.
 *
 * And the memory of table_io (IN2 D2, the plan of the input page,
 * docs/plans/input-page.md, work package 2), in both engines: CSVs of 1,
 * 5 and 20 MB in two shapes read on the old page, with what the engine's
 * processes hold before each read and 3 s after it, from a build that
 * keeps the light worker and one that ends it after every read, for
 * READ_RESTART_BYTES of src/worker/client.ts; and the time of a read of
 * panel_pops.csv and of individuals_10000.xlsx in each build.
 *
 * The large files are written outside the repository, into the folder
 * MEASURE_DIR, or a folder of the system's temporary one: the VCF by
 * popnei's crates/popnei/benches/make_big_vcf.py, run with uv, from
 * popnei's checkout at POPNEI or beside this repository, and the .nei by
 * writeVars of popnei in node.
 */
import { execFile, execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readFile,
  rename,
  rm,
  utimes,
  writeFile,
} from "node:fs/promises";
import { cpus, loadavg, tmpdir, totalmem } from "node:os";
import { join } from "node:path";

import {
  chromium,
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Download,
  type Locator,
  type Page,
  type Worker as PlaywrightWorker,
} from "@playwright/test";
import { init, openVcf, writeVars } from "popnei";

import { bigVcfPopsCsv, STOP_VCF_VARIANTS, writeBigVcf } from "./bigVcf.ts";
import type { VcfPositions } from "./bigVcf.ts";
import { drawPoints } from "./measure/points.ts";
import type { DrawAsked, DrawTimes } from "./measure/points.ts";
import type { Commit } from "./measure/profilingRoot.ts";
import "./allowsPage.ts";

const ROOT = join(import.meta.dirname, "..");
const FIXTURES = join(import.meta.dirname, "fixtures");
const POPNEI = process.env["POPNEI"] ?? join(ROOT, "..", "popnei");
const MEASURE_DIR =
  process.env["MEASURE_DIR"] ?? join(tmpdir(), "popnei_web-measure");
const UV = process.env["UV"] ?? "uv";

/** The sizes of the two files of the restart. The plan of stage 2 gave
    the .nei file 19,161,178 bytes, written by popnei's js-v0.1.0-dev.2;
    writeVars of js-v0.1.0-dev.3 writes the same variants in 16 bytes
    more, 19,161,194, as it does panel.nei's (runner.md), and writeVars of
    popnei 0.2.2 in 19,161,818 (the plan of the download, work package
    8). */
const BIG_VCF_BYTES = 80_692_954;
const BIG_NEI_BYTES = 19_161_818;

// ---------------------------------------------------------------------
// What the page is timed with.

/** A message between the page and a worker, or a worker's start. */
interface Logged {
  /** The worker, numbered in the order the page made them. */
  readonly worker: number;
  /** The address of its script. */
  readonly url: string;
  /** Its start, a message it posted, or one posted to it. */
  readonly event: "start" | "in" | "out";
  /** The `kind` of the message, "" for a start. */
  readonly kind: string;
  /** `performance.now()` of the page. */
  readonly t: number;
  /** `Date.now()` of the page, the clock of the samples of the memory. */
  readonly wall: number;
  /** Of a progress, the bytes read. */
  readonly bytesRead?: number;
  /** Of a progress, the pass it is of, from 1. */
  readonly pass?: number;
  /** Of a result of the PCA, the variants it used. */
  readonly numVarsUsed?: number;
}

/** Put in the page before its scripts: every worker it makes is timed
    from its start, and every message to and from it. */
function instrument(): void {
  const log: Logged[] = [];
  Object.assign(globalThis, { measureLog: log });
  const kindOf = (data: unknown): string =>
    typeof data === "object" &&
    data !== null &&
    "kind" in data &&
    typeof data.kind === "string"
      ? data.kind
      : "";
  let count = 0;
  class Timed extends Worker {
    private readonly measureId: number;
    private readonly measureUrl: string;
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      this.measureId = count;
      this.measureUrl = String(url);
      count += 1;
      const worker = this.measureId;
      const name = this.measureUrl;
      log.push({
        worker,
        url: name,
        event: "start",
        kind: "",
        t: performance.now(),
        wall: Date.now(),
      });
      // A worker that stops with no answer, as when wasm runs out of
      // memory, is told by an error event, logged as the answer
      // "workerError".
      this.addEventListener("error", () => {
        log.push({
          worker,
          url: name,
          event: "in",
          kind: "workerError",
          t: performance.now(),
          wall: Date.now(),
        });
      });
      this.addEventListener("message", (event: MessageEvent<unknown>) => {
        const kind = kindOf(event.data);
        const data = event.data as {
          readonly bytesRead?: unknown;
          readonly pass?: unknown;
          readonly result?: { readonly numVarsUsed?: unknown };
        };
        const used = data.result?.numVarsUsed;
        log.push({
          worker,
          url: name,
          event: "in",
          kind,
          t: performance.now(),
          wall: Date.now(),
          ...(kind === "progress" && typeof data.bytesRead === "number"
            ? { bytesRead: data.bytesRead }
            : {}),
          ...(kind === "progress" && typeof data.pass === "number"
            ? { pass: data.pass }
            : {}),
          ...(kind === "result" && typeof used === "number"
            ? { numVarsUsed: used }
            : {}),
        });
      });
    }
    override postMessage(
      message: unknown,
      options?: Transferable[] | StructuredSerializeOptions,
    ): void {
      log.push({
        worker: this.measureId,
        url: this.measureUrl,
        event: "out",
        kind: kindOf(message),
        t: performance.now(),
        wall: Date.now(),
      });
      super.postMessage(message, options as StructuredSerializeOptions);
    }
  }
  globalThis.Worker = Timed;
}

async function logOf(page: Page): Promise<readonly Logged[]> {
  return page.evaluate(
    () => (globalThis as unknown as { measureLog: Logged[] }).measureLog,
  );
}

/** The answers that end a request of the calculation worker. */
const ENDS = new Set(["result", "refused", "reopenFailed", "crashed"]);

const isCalc = (l: Logged): boolean => l.url.includes("runnerWorker");

/** The engine, its version and the machine, for the head of a table. */
function machine(browser: Browser, engine: string): string {
  const cpu = cpus()[0]?.model ?? "unknown";
  const memory = `${String(Math.round(totalmem() / 2 ** 30))} GB`;
  return `${engine} ${browser.version()}, Playwright ${test.info().config.version}, ${cpu}, ${memory}`;
}

/** Prints a table in Markdown, with its title and the machine. */
function report(
  title: string,
  head: string,
  columns: readonly string[],
  rows: readonly (readonly string[])[],
): void {
  const lines = [
    `### ${title}`,
    head,
    "",
    `| ${columns.join(" | ")} |`,
    `|${columns.map(() => "---").join("|")}|`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
}

const ms = (x: number): string => `${x.toFixed(0)} ms`;

/** How many times each measurement of the end of stage 2 is repeated. */
const REPEATS = Number(process.env["MEASURE_REPEATS"] ?? "5");

/** The median of `xs`, which is not empty. */
function median(xs: readonly number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const at = (i: number): number => sorted[i] ?? Number.NaN;
  return sorted.length % 2 === 1 ? at(mid) : (at(mid - 1) + at(mid)) / 2;
}

/** The median of `xs` and its range, "238 ms to 262 ms", each written by
    `unit`. */
function stats(
  xs: readonly number[],
  unit: (x: number) => string,
): [string, string] {
  return [
    unit(median(xs)),
    `${unit(Math.min(...xs))} to ${unit(Math.max(...xs))}`,
  ];
}

const mb = (bytes: number): string => `${(bytes / 1e6).toFixed(1)} MB`;

// ---------------------------------------------------------------------
// The page, as the flows go through it.

async function goTo(page: Page, step: string): Promise<void> {
  await page
    .getByRole("navigation", { name: "Steps" })
    .getByRole("link", { name: step })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: step }),
  ).toBeVisible();
}

/** Picks the file at `path` with the button of the zone `region`. */
async function pick(page: Page, region: string, path: string): Promise<void> {
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: region })
    .getByRole("button", { name: /^(Choose|Replace) .*…$/ })
    .click();
  await (await chooser).setFiles(path);
}

async function setThreshold(page: Page, value: string): Promise<void> {
  await goTo(page, "Variants");
  const threshold = page.getByLabel("Maximum proportion of missing genotypes");
  await threshold.fill(value);
  await threshold.press("Enter");
  await expect(threshold).toHaveValue(value);
}

async function chooseColumn(page: Page, column: string): Promise<void> {
  await goTo(page, "Individuals");
  await page
    .getByRole("button", { name: "Column that defines the populations" })
    .click();
  await page.getByRole("option", { name: column, exact: true }).click();
}

/** Opens the page timed, picks the variants file at `variants` and the
    metadata file at `metadata`, and chooses the column `column`. */
async function load(
  page: Page,
  variants: string,
  metadata: string,
  column: string,
): Promise<void> {
  await page.addInitScript(instrument);
  await page.goto("popgen.html#variants");
  await pick(page, "Variants file", variants);
  await expect(page.getByText(/^[\d,]+ individuals$/)).toBeVisible({
    timeout: 30_000,
  });
  await goTo(page, "Individuals");
  await pick(page, "Metadata file", metadata);
  await expect(page.getByText(/^All [\d,]+ individuals of /)).toBeVisible();
  await chooseColumn(page, column);
}

function panel(page: Page): Locator {
  return page.getByRole("region", { name: "Diversity", exact: true });
}

/** What a run gave: the text of the panel once it ended, and its times
    from the messages of the calculation worker. */
interface Ran {
  /** The panel's text, its lines joined by " / ". */
  readonly text: string;
  /** Whether it shows a table. */
  readonly table: boolean;
  /** The answer that ended the request. */
  readonly answer: string;
  /** From the run posted to its answer. */
  readonly runMs: number;
  /** From its first progress to its answer. */
  readonly afterFirstProgressMs: number | null;
}

/** Runs the diversity from the Analyses step, and waits for the answer
    of the worker and for the panel to leave its running state. */
async function runAndSettle(page: Page, timeout: number): Promise<Ran> {
  await goTo(page, "Analyses");
  const before = (await logOf(page)).length;
  await panel(page).getByRole("button", { name: "Run", exact: true }).click();
  let ended: readonly Logged[] = [];
  await expect
    .poll(
      async () => {
        ended = (await logOf(page)).slice(before).filter(isCalc);
        return ended.some((l) => l.event === "in" && ENDS.has(l.kind));
      },
      { timeout, intervals: [50] },
    )
    .toBe(true);
  await expect(panel(page).getByRole("progressbar")).toHaveCount(0);
  const run = ended.find((l) => l.event === "out" && l.kind === "run");
  const answer = ended.find((l) => l.event === "in" && ENDS.has(l.kind));
  const progress = ended.find((l) => l.kind === "progress");
  if (run === undefined || answer === undefined) {
    throw new Error("no run, or no answer to it, in the log of the worker");
  }
  const text = (await panel(page).innerText())
    .split(/[\n\t]/)
    .map((s) => s.trim())
    .filter((s) => s !== "")
    .join(" / ");
  return {
    text,
    table: (await panel(page).getByRole("table").count()) > 0,
    answer: answer.kind,
    runMs: answer.t - run.t,
    afterFirstProgressMs: progress === undefined ? null : answer.t - progress.t,
  };
}

// ---------------------------------------------------------------------
// Point R.

/** The CSV of the populations of panel.nei with a second column,
    `popcat2`, the same populations named q0, q2 and q1: another key with
    the same filters, so a run with no open again. */
function panelPopsTwoColumns(): string {
  const lines = readFileSync(join(FIXTURES, "panel_pops.csv"), "utf8")
    .split("\n")
    .filter((l) => l !== "");
  return [
    "IID,popcat,popcat2",
    ...lines.slice(1).map((l) => `${l},${l.replace(/^.*,p/, "q")}`),
  ].join("\n");
}

/** The three rewrites of the copy `copy` of `original`, as the shell
    commands the owner runs by hand in Firefox, each ending with
    `cat … >` so that the copy keeps its path. panel.nei is 261,490
    bytes; its byte at 130,745, the middle, is 0 and becomes 255. */
const REWRITES: readonly {
  readonly way: string;
  readonly command: (original: string, copy: string, dir: string) => string;
}[] = [
  {
    way: "shorter, its first 130,000 bytes",
    command: (original, copy, dir) =>
      `head -c 130000 '${original}' > '${dir}/short.nei' && cat '${dir}/short.nei' > '${copy}'`,
  },
  {
    way: "the same size, the byte in the middle changed",
    command: (original, copy, dir) =>
      `{ head -c 130745 '${original}'; printf '\\377'; tail -c +130747 '${original}'; } > '${dir}/changed.nei' && cat '${dir}/changed.nei' > '${copy}'`,
  },
  {
    way: "longer, 4,096 zero bytes after it",
    command: (original, copy, dir) =>
      `{ cat '${original}'; head -c 4096 /dev/zero; } > '${dir}/longer.nei' && cat '${dir}/longer.nei' > '${copy}'`,
  },
];

/** A copy of panel.nei under its name in the output folder, and the CSV
    of its populations with two columns. */
async function copyPanel(dir: string): Promise<{ copy: string; pops: string }> {
  await mkdir(dir, { recursive: true });
  const copy = join(dir, "panel.nei");
  await copyFile(join(FIXTURES, "panel.nei"), copy);
  const pops = join(dir, "panel_pops2.csv");
  await writeFile(pops, panelPopsTwoColumns());
  return { copy, pops };
}

test.describe("point R", () => {
  test("the File of a pick is on the disk: the copy deleted is not read", async ({
    page,
    browser,
    browserName,
  }, testInfo) => {
    const { copy, pops } = await copyPanel(testInfo.outputPath("r"));
    await load(page, copy, pops, "popcat");
    await setThreshold(page, "0.05");
    await rm(copy);
    const ran = await runAndSettle(page, 30_000);
    report(
      "Point R, the check by deletion",
      machine(browser, browserName),
      [
        "the copy deleted after the pick, run at 0.05",
        "answer",
        "what the page showed",
      ],
      [["", ran.answer, ran.text]],
    );
    // A table would be a File in memory: the rewrites below would then
    // test nothing, and this engine is not measured.
    expect(ran.table, "the File was given in memory, not on the disk").toBe(
      false,
    );
  });

  // A rewrite a second or more after the copy was written, as a user's
  // would be, and one that keeps the copy's time of change, as a copy that
  // keeps the times of its files does: an engine that compares the time
  // of the file in whole seconds tells the first and not the second.
  const WHENS = [
    { when: "a second later", keepsTime: false },
    { when: "its time kept", keepsTime: true },
  ] as const;
  for (const [i, rewrite] of REWRITES.entries()) {
    for (const { when, keepsTime } of WHENS) {
      test(`rewrite ${String(i + 1)}, ${when}: ${rewrite.way}`, async ({
        page,
        browser,
        browserName,
      }, testInfo) => {
        const dir = testInfo.outputPath("r");
        const { copy, pops } = await copyPanel(dir);
        await load(page, copy, pops, "popcat");
        await setThreshold(page, "0.05");
        const before = await runAndSettle(page, 30_000);
        expect(before.text).toContain("p0 / 48 / 0.3527 / 0.3567 / 0.9288");

        const picked = statSync(copy);
        if (!keepsTime) {
          const wait = picked.mtimeMs + 1100 - Date.now();
          await new Promise((resolve) =>
            setTimeout(resolve, Math.max(0, wait)),
          );
        }
        const command = rewrite.command(join(FIXTURES, "panel.nei"), copy, dir);
        execFileSync("sh", ["-c", command]);
        if (keepsTime) {
          await utimes(copy, picked.atime, picked.mtime);
        }
        const rewritten = statSync(copy);
        const size = rewritten.size;
        const seconds = (rewritten.mtimeMs - picked.mtimeMs) / 1000;

        // The same filters under another key: a pass with no open again.
        await chooseColumn(page, "popcat2");
        const at005 = await runAndSettle(page, 30_000);
        // The filter changed: the file is opened again.
        await setThreshold(page, "1");
        const at1 = await runAndSettle(page, 30_000);

        report(
          `Point R, rewrite ${String(i + 1)}, ${when}: ${rewrite.way} (${size.toLocaleString("en-US")} bytes, its time of change ${seconds.toFixed(3)} s after the pick's)`,
          machine(browser, browserName),
          ["run", "answer", "what the page showed"],
          [
            ["before, at 0.05", before.answer, before.text],
            ["after, at 0.05, no open again", at005.answer, at005.text],
            ["after, at 1, opened again", at1.answer, at1.text],
          ],
        );
      });
    }
  }
});

// ---------------------------------------------------------------------
// The restart.

/** The VCF of 80,692,954 bytes and the .nei of 19,161,178, made when
    they are not in MEASURE_DIR, and the CSV of their individuals. */
async function bigFiles(): Promise<{
  vcf: string;
  nei: string;
  pops: string;
}> {
  await mkdir(MEASURE_DIR, { recursive: true });
  const vcf = join(MEASURE_DIR, "big.vcf");
  const nei = join(MEASURE_DIR, "big.nei");
  const pops = join(MEASURE_DIR, "big_pops.csv");
  if (!existsSync(vcf)) {
    execFileSync(UV, [
      "run",
      "--no-project",
      "--with",
      "numpy",
      "python",
      join(POPNEI, "crates", "popnei", "benches", "make_big_vcf.py"),
      vcf,
      "20000",
    ]);
  }
  if (!existsSync(nei)) {
    await init();
    const variants = openVcf(new Uint8Array(await readFile(vcf)), {});
    try {
      await writeFile(nei, writeVars(variants).bytes);
    } finally {
      variants.free();
    }
  }
  // make_big_vcf.py names its 1,000 individuals as bigVcf.ts does.
  await writeFile(pops, bigVcfPopsCsv());
  expect(statSync(vcf).size).toBe(BIG_VCF_BYTES);
  expect(statSync(nei).size).toBe(BIG_NEI_BYTES);
  return { vcf, nei, pops };
}

/** The times of one restart, in milliseconds. */
interface Restart {
  readonly firstReady: number;
  readonly ready: number;
  readonly opened: number;
  readonly fresh: number;
  readonly changed: number;
  readonly restarted: number;
}

/** Opens a new page, loads `file`, runs the diversity at 0.05 and at 1,
    loads the file again, which restarts the calculation worker, and runs
    at 0.1. */
async function restartOnce(
  browser: Browser,
  file: string,
  pops: string,
): Promise<Restart> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await load(page, file, pops, "pop");
    const first = (await logOf(page)).filter(isCalc);
    const firstStart = first.find((l) => l.event === "start");
    const firstReady = first.find(
      (l) => l.event === "in" && l.kind === "ready",
    );
    if (firstStart === undefined || firstReady === undefined) {
      throw new Error("the first worker's start or ready is missing");
    }

    await setThreshold(page, "0.05");
    const fresh = await runAndSettle(page, 240_000);
    expect(fresh.table).toBe(true);
    await setThreshold(page, "1");
    const changed = await runAndSettle(page, 240_000);
    expect(changed.table).toBe(true);

    // A new load of the file ends the worker, and the client starts
    // another that opens it at once. A Stop does the same, but a pass of
    // a tenth of a second ends before a Stop can be pressed in it.
    await setThreshold(page, "0.1");
    const beforeStop = (await logOf(page)).length;
    await goTo(page, "Variants");
    await pick(page, "Variants file", file);
    let after: readonly Logged[] = [];
    await expect
      .poll(
        async () => {
          after = (await logOf(page)).slice(beforeStop).filter(isCalc);
          return after.some((l) => l.event === "in" && l.kind === "opened");
        },
        { timeout: 60_000, intervals: [50] },
      )
      .toBe(true);
    const start = after.find((l) => l.event === "start");
    const ready = after.find((l) => l.event === "in" && l.kind === "ready");
    const opened = after.find((l) => l.event === "in" && l.kind === "opened");
    if (start === undefined || ready === undefined || opened === undefined) {
      throw new Error("the new worker's start, ready or opened is missing");
    }
    // The run of the file opened again: its filter is put on the new
    // Variants, with no second open.
    const restarted = await runAndSettle(page, 240_000);
    expect(restarted.table).toBe(true);
    return {
      firstReady: firstReady.t - firstStart.t,
      ready: ready.t - start.t,
      opened: opened.t - start.t,
      fresh: fresh.runMs,
      changed: changed.runMs,
      restarted: restarted.runMs,
    };
  } finally {
    await context.close();
  }
}

for (const which of ["vcf", "nei"] as const) {
  test(`the restart on the large ${which === "vcf" ? "VCF" : ".nei file"}`, async ({
    browser,
    browserName,
  }) => {
    test.setTimeout(600_000);
    const files = await bigFiles();
    const file = files[which];
    const runs: Restart[] = [];
    for (let k = 0; k < REPEATS; k++) {
      runs.push(await restartOnce(browser, file, files.pops));
    }
    const row = (what: string, of: (r: Restart) => number): string[] => [
      what,
      ...stats(runs.map(of), ms),
    ];
    const size = statSync(file).size.toLocaleString("en-US");
    report(
      `The restart, ${which === "vcf" ? "VCF" : ".nei file"} of ${size} bytes`,
      `${machine(browser, browserName)}; ${String(REPEATS)} repetitions, each on a new page`,
      ["what", "median", "range"],
      [
        row(
          "the page's first worker, its start to its ready (popnei's wasm fetched and compiled)",
          (r) => r.firstReady,
        ),
        row(
          "a new worker's start to its ready (popnei loaded)",
          (r) => r.ready,
        ),
        row("a new worker's start to its opened", (r) => r.opened),
        row(
          "run at 0.05 just after the open: the filter put and a pass",
          (r) => r.fresh,
        ),
        row(
          "run at 1, filters changed: opened again and a pass",
          (r) => r.changed,
        ),
        row(
          "run at 0.1 after the new worker opened: the filter put and a pass",
          (r) => r.restarted,
        ),
      ],
    );
  });
}

// ---------------------------------------------------------------------
// The metadata file of 10,000 rows.

/** A CSV of 10,000 rows and 20 short columns. */
function tenThousandRows(): string {
  const head = [
    "IID",
    "pop",
    ...Array.from({ length: 18 }, (_, j) => `c${String(j)}`),
  ];
  const rows = Array.from({ length: 10_000 }, (_, i) =>
    [
      `ind${String(i).padStart(5, "0")}`,
      `p${String(i % 7)}`,
      ...Array.from({ length: 18 }, (_, j) =>
        j % 2 === 0
          ? `${String((i * (j + 3)) % 997)}.25`
          : `level${String((i + j) % 13)}`,
      ),
    ].join(","),
  );
  return `${head.join(",")}\n${rows.join("\n")}\n`;
}

test("the metadata file of 10,000 rows, from the pick to its columns", async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  test.skip(browserName !== "chromium", "measured in Chromium alone");
  const csv = testInfo.outputPath("rows10000.csv");
  await mkdir(testInfo.outputPath(), { recursive: true });
  const text = tenThousandRows();
  await writeFile(csv, text);

  await page.addInitScript(() => {
    const times = {
      change: null as number | null,
      columns: null as number | null,
      clickDelays: [] as number[],
      clickTimes: [] as number[],
      longTasks: [] as number[],
    };
    Object.assign(globalThis, { measureTimes: times });
    document.addEventListener(
      "change",
      () => (times.change ??= performance.now()),
      true,
    );
    document.addEventListener(
      "click",
      (event) => {
        times.clickDelays.push(performance.now() - event.timeStamp);
        times.clickTimes.push(performance.now());
      },
      true,
    );
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        times.longTasks.push(entry.duration);
    }).observe({ type: "longtask" });
    new MutationObserver((_, observer) => {
      if (document.body.textContent.includes("10,000 rows, 20 columns")) {
        times.columns = performance.now();
        observer.disconnect();
      }
    }).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
  await page.goto("popgen.html#individuals");
  const heading = page.getByRole("heading", { level: 1, name: "Individuals" });
  await expect(heading).toBeVisible();
  const box = await heading.boundingBox();
  if (box === null) throw new Error("the heading has no box");

  await pick(page, "Metadata file", csv);
  // Clicks on the heading, which does nothing, one after another until
  // the columns are shown: each is timed from the input to its handler.
  const clickRoundTrips: number[] = [];
  for (;;) {
    const shown = await page.evaluate(
      () =>
        (globalThis as unknown as { measureTimes: { columns: number | null } })
          .measureTimes.columns !== null,
    );
    if (shown) break;
    const t0 = Date.now();
    await page.mouse.click(box.x + 5, box.y + box.height / 2);
    clickRoundTrips.push(Date.now() - t0);
  }
  await expect(page.getByText("10,000 rows, 20 columns")).toBeVisible();
  const times = await page.evaluate(
    () =>
      (
        globalThis as unknown as {
          measureTimes: {
            change: number;
            columns: number;
            clickDelays: number[];
            clickTimes: number[];
            longTasks: number[];
          };
        }
      ).measureTimes,
  );
  report(
    `The metadata file of 10,000 rows and 20 columns, ${(text.length / 1e6).toFixed(2)} MB`,
    machine(browser, browserName),
    ["what", "value"],
    [
      [
        "the pick (its change) to the columns shown",
        ms(times.columns - times.change),
      ],
      [
        "clicks answered between the pick and the columns shown",
        String(
          times.clickTimes.filter((t) => t > times.change && t < times.columns)
            .length,
        ),
      ],
      [
        "longest wait of a click for its handler",
        ms(Math.max(0, ...times.clickDelays)),
      ],
      [
        "longest round trip of a click, from the test",
        ms(Math.max(0, ...clickRoundTrips)),
      ],
      [
        "tasks of the page over 50 ms",
        times.longTasks.length === 0
          ? "none"
          : times.longTasks.map(ms).join(", "),
      ],
    ],
  );
  expect(clickRoundTrips.length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------
// A pass over the VCF of the Stop in the middle.

test("a pass over the VCF of the Stop in the middle", async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  test.setTimeout(300_000);
  await mkdir(testInfo.outputPath(), { recursive: true });
  const vcf = testInfo.outputPath("stop.vcf.gz");
  await writeBigVcf(vcf, STOP_VCF_VARIANTS);
  const pops = testInfo.outputPath("stop_pops.csv");
  await writeFile(pops, bigVcfPopsCsv());
  await load(page, vcf, pops, "pop");
  const ran = await runAndSettle(page, 240_000);
  expect(ran.table).toBe(true);
  report(
    `A pass over the VCF of WS8 D3, ${STOP_VCF_VARIANTS.toLocaleString("en-US")} variants, ${statSync(vcf).size.toLocaleString("en-US")} bytes`,
    machine(browser, browserName),
    ["what", "time"],
    [
      ["the run, with no filter: a pass", ms(ran.runMs)],
      ["what the panel showed", ran.text],
      [
        "from its first progress to its result",
        ran.afterFirstProgressMs === null
          ? "no progress"
          : ms(ran.afterFirstProgressMs),
      ],
    ],
  );
});

// ---------------------------------------------------------------------
// The memory of the tab.

/** The memory of the tab at one moment, in bytes. */
interface Memory {
  /** The page's JavaScript heap in use, and the arrays outside it. */
  readonly pageHeap: number;
  readonly pageArrays: number;
  /** The calculation worker's JavaScript heap in use, the arrays outside
      it, and its memory of wasm, where popnei holds what it read. */
  readonly calcHeap: number;
  readonly calcArrays: number;
  readonly calcWasm: number;
  /** The light worker's JavaScript heap in use and its arrays. */
  readonly filesHeap: number;
  /** The footprint of the tab's process, as macOS counts it: its memory
      in RAM or compressed, which the page and both workers share. */
  readonly footprint: number;
}

/** A session of the Chrome DevTools Protocol with a page and its
    workers, which it reaches through the page's own session. */
interface Probe {
  heap(target: string | null): Promise<{ used: number; arrays: number }>;
  wasm(target: string): Promise<number>;
  collectGarbage(target: string | null): Promise<void>;
  workers(): readonly { readonly sessionId: string; readonly url: string }[];
  footprint(): Promise<number>;
}

async function probeOf(page: Page, browser: Browser): Promise<Probe> {
  const cdp = await page.context().newCDPSession(page);
  const workers: { sessionId: string; url: string }[] = [];
  cdp.on("Target.attachedToTarget", (event) => {
    if (event.targetInfo.type === "worker") {
      workers.push({
        sessionId: event.sessionId,
        url: event.targetInfo.url,
      });
    }
  });
  cdp.on("Target.detachedFromTarget", (event) => {
    const at = workers.findIndex((w) => w.sessionId === event.sessionId);
    if (at >= 0) workers.splice(at, 1);
  });
  const waiting = new Map<number, (message: unknown) => void>();
  cdp.on("Target.receivedMessageFromTarget", (event) => {
    const message = JSON.parse(event.message) as {
      readonly id?: number;
      readonly result?: unknown;
      readonly error?: unknown;
    };
    if (message.id === undefined) return;
    const done = waiting.get(message.id);
    waiting.delete(message.id);
    if (message.error !== undefined) {
      throw new Error(`the worker refused: ${JSON.stringify(message.error)}`);
    }
    done?.(message.result);
  });
  let next = 1;
  /** Sends `method` to the worker of `sessionId`, or to the page. */
  const send = async (
    sessionId: string | null,
    method: string,
    params: Record<string, unknown> = {},
  ): Promise<unknown> => {
    if (sessionId === null) {
      return cdp.send(method as "Runtime.evaluate", params as never);
    }
    const id = next;
    next += 1;
    const answer = new Promise<unknown>((done) => waiting.set(id, done));
    await cdp.send("Target.sendMessageToTarget", {
      sessionId,
      message: JSON.stringify({ id, method, params }),
    });
    return answer;
  };
  await cdp.send("Target.setAutoAttach", {
    autoAttach: true,
    waitForDebuggerOnStart: false,
    flatten: false,
  });
  const browserCdp = await browser.newBrowserCDPSession();
  return {
    async heap(target) {
      const usage = (await send(target, "Runtime.getHeapUsage")) as {
        readonly usedSize: number;
        readonly backingStorageSize?: number;
      };
      return { used: usage.usedSize, arrays: usage.backingStorageSize ?? 0 };
    },
    async wasm(target) {
      // Every WebAssembly.Memory of the worker, found by its prototype.
      const proto = (await send(target, "Runtime.evaluate", {
        expression: "WebAssembly.Memory.prototype",
      })) as { readonly result: { readonly objectId: string } };
      const found = (await send(target, "Runtime.queryObjects", {
        prototypeObjectId: proto.result.objectId,
      })) as { readonly objects: { readonly objectId: string } };
      const sum = (await send(target, "Runtime.callFunctionOn", {
        objectId: found.objects.objectId,
        functionDeclaration:
          "function () { return this.reduce((s, m) => s + m.buffer.byteLength, 0); }",
        returnByValue: true,
      })) as { readonly result: { readonly value: number } };
      return sum.result.value;
    },
    async collectGarbage(target) {
      await send(target, "HeapProfiler.collectGarbage");
    },
    workers: () => workers,
    async footprint() {
      const { processInfo } = await browserCdp.send(
        "SystemInfo.getProcessInfo",
      );
      const renderers = processInfo.filter((p) => p.type === "renderer");
      if (renderers.length !== 1) {
        throw new Error(
          `${String(renderers.length)} renderers, not the one of the page`,
        );
      }
      const text = execFileSync(
        "footprint",
        ["-f", "bytes", "--noCategories", "-p", String(renderers[0]?.id)],
        { encoding: "utf8" },
      );
      const bytes = /Footprint: (\d+) B/.exec(text)?.[1];
      if (bytes === undefined) throw new Error(`no footprint in ${text}`);
      return Number(bytes);
    },
  };
}

/** The memory of the tab now, after a collection of its garbage. */
async function memoryOf(probe: Probe): Promise<Memory> {
  const calc = probe.workers().find((w) => w.url.includes("runnerWorker"));
  const files = probe.workers().find((w) => w.url.includes("filesRunner"));
  if (calc === undefined) throw new Error("no calculation worker");
  for (const target of [null, calc.sessionId, files?.sessionId ?? null]) {
    await probe.collectGarbage(target);
  }
  const page = await probe.heap(null);
  const calcHeap = await probe.heap(calc.sessionId);
  const filesHeap =
    files === undefined ? { used: 0 } : await probe.heap(files.sessionId);
  return {
    pageHeap: page.used,
    pageArrays: page.arrays,
    calcHeap: calcHeap.used,
    calcArrays: calcHeap.arrays,
    calcWasm: await probe.wasm(calc.sessionId),
    filesHeap: filesHeap.used,
    footprint: await probe.footprint(),
  };
}

test("the memory of the tab with the .nei file of 19,161,178 bytes", async ({
  browser,
  browserName,
}) => {
  test.skip(browserName !== "chromium", "the protocol is Chromium's");
  test.setTimeout(600_000);
  const files = await bigFiles();
  const moments = [
    "the page opened",
    "the file opened",
    "the diversity done",
    "done again at 1, the file opened again",
  ];
  const taken: Memory[][] = moments.map(() => []);
  for (let k = 0; k < REPEATS; k++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const probe = await probeOf(page, browser);
      await page.addInitScript(instrument);
      await page.goto("popgen.html#variants");
      await expect
        .poll(async () =>
          (await logOf(page)).some(
            (l) => isCalc(l) && l.event === "in" && l.kind === "ready",
          ),
        )
        .toBe(true);
      taken[0]?.push(await memoryOf(probe));
      await pick(page, "Variants file", files.nei);
      await expect(page.getByText(/^[\d,]+ individuals$/)).toBeVisible({
        timeout: 30_000,
      });
      await goTo(page, "Individuals");
      await pick(page, "Metadata file", files.pops);
      await expect(page.getByText(/^All [\d,]+ individuals of /)).toBeVisible();
      await chooseColumn(page, "pop");
      taken[1]?.push(await memoryOf(probe));
      const ran = await runAndSettle(page, 240_000);
      expect(ran.table).toBe(true);
      taken[2]?.push(await memoryOf(probe));
      await setThreshold(page, "1");
      const again = await runAndSettle(page, 240_000);
      expect(again.table).toBe(true);
      taken[3]?.push(await memoryOf(probe));
    } finally {
      await context.close();
    }
  }
  const fields: readonly [string, (m: Memory) => number][] = [
    ["the tab's process, its footprint", (m) => m.footprint],
    ["the page, JavaScript heap", (m) => m.pageHeap],
    ["the page, arrays outside the heap", (m) => m.pageArrays],
    ["the calculation worker, memory of wasm", (m) => m.calcWasm],
    ["the calculation worker, JavaScript heap", (m) => m.calcHeap],
    ["the calculation worker, arrays outside the heap", (m) => m.calcArrays],
    ["the light worker, JavaScript heap", (m) => m.filesHeap],
  ];
  report(
    "The memory of the tab, the .nei file of 19,161,178 bytes and 1,000 individuals",
    `${machine(browser, browserName)}; ${String(REPEATS)} repetitions, each on a new page; the median, and the range in brackets`,
    ["what", ...moments],
    fields.map(([what, of]) => [
      what,
      ...taken.map((values) => {
        const [mid, range] = stats(values.map(of), mb);
        return `${mid} (${range})`;
      }),
    ]),
  );
});

// ---------------------------------------------------------------------
// The points of an SVG plot.

test("the points of an SVG plot, one path per group", async ({
  page,
  browser,
  browserName,
}) => {
  test.setTimeout(600_000);
  const html = join(import.meta.dirname, "measure", "points.html");
  // The page is served at an address of the site that the site does not
  // have, so it is never built into dist/.
  await page.route("**/measure-page/points.html", (route) =>
    route.fulfill({ path: html, contentType: "text/html" }),
  );
  await page.goto("measure-page/points.html");
  const sizes = [10_000, 50_000, 100_000, 200_000];
  const rows: string[][] = [];
  for (const digits of [null, 1]) {
    for (const n of sizes) {
      const asked: DrawAsked = { n, digits, seed: 12345 };
      // One drawing first that is not counted, as the plot's own first
      // drawing warms the engine's compiler.
      await page.evaluate(drawPoints, asked);
      const times: DrawTimes[] = [];
      for (let k = 0; k < REPEATS; k++) {
        times.push(await page.evaluate(drawPoints, asked));
      }
      const cell = (of: (t: DrawTimes) => number): string => {
        const [mid, range] = stats(times.map(of), ms);
        return `${mid} (${range})`;
      };
      rows.push([
        n.toLocaleString("en-US"),
        digits === null ? "all" : String(digits),
        cell((t) => t.buildMs),
        cell((t) => t.setMs + t.frameMs),
        cell((t) => t.totalMs),
        cell((t) => t.serializeMs),
        mb(times[0]?.svgChars ?? 0),
      ]);
    }
  }
  report(
    "The points of an SVG plot, 4 groups of circles of 16 px², 800 × 500 px",
    `${machine(browser, browserName)}; ${String(REPEATS)} repetitions after one not counted; the median, and the range in brackets`,
    [
      "points",
      "decimals",
      "the loop that builds the paths",
      "the paths put in the page to the next frame",
      "the drawing, whole",
      "the SVG written as text, for its export",
      "the text of the SVG",
    ],
    rows,
  );
});

// ---------------------------------------------------------------------
// The commits of React.

/** A metadata file of 10,000 rows and 20 columns whose first 200 rows are
    the individuals of panel.nei in their populations, and the others
    individuals the variants file does not have. */
function panelTenThousandRows(): string {
  const panel = readFileSync(join(FIXTURES, "panel_pops.csv"), "utf8")
    .split("\n")
    .filter((l) => l !== "")
    .slice(1)
    .map((l) => l.split(","));
  const head = [
    "IID",
    "popcat",
    ...Array.from({ length: 18 }, (_, j) => `c${String(j)}`),
  ];
  const rows = Array.from({ length: 10_000 }, (_, i) => {
    const known = panel[i];
    return [
      known?.[0] ?? `x${String(i).padStart(5, "0")}`,
      known?.[1] ?? `p${String(i % 3)}`,
      ...Array.from({ length: 18 }, (_, j) =>
        j % 2 === 0
          ? `${String((i * (j + 3)) % 997)}.25`
          : `level${String((i + j) % 13)}`,
      ),
    ].join(",");
  });
  return `${head.join(",")}\n${rows.join("\n")}\n`;
}

/** What React committed during one interaction. */
interface Committed {
  /** How many commits. */
  readonly count: number;
  /** The milliseconds React spent drawing, summed over the commits. */
  readonly actual: number;
  /** What drawing the whole tree again would take, at the largest commit. */
  readonly base: number;
  /** The longest event of the interaction, from the input to the frame
      drawn after it, as the browser's Event Timing gives it, 0 when none
      lasted 16 ms or more. */
  readonly event: number;
}

async function commitsSince(page: Page, since: number): Promise<Committed> {
  // Waits until nothing has been committed for 300 ms.
  let last = -1;
  let still = 0;
  for (;;) {
    const count = await page.evaluate(
      () =>
        (globalThis as unknown as { measureCommits: unknown[] }).measureCommits
          .length,
    );
    if (count === last) {
      still += 1;
      if (still >= 6) break;
    } else {
      still = 0;
      last = count;
    }
    await page.waitForTimeout(50);
  }
  return page.evaluate((from) => {
    const g = globalThis as unknown as {
      measureCommits: readonly Commit[];
      measureEvents: readonly { start: number; duration: number }[];
    };
    const commits = g.measureCommits.filter((c) => c.startTime >= from);
    return {
      count: commits.length,
      actual: commits.reduce((s, c) => s + c.actualDuration, 0),
      base: Math.max(0, ...commits.map((c) => c.baseDuration)),
      event: Math.max(
        0,
        ...g.measureEvents
          .filter((e) => e.start >= from)
          .map((e) => e.duration),
      ),
    };
  }, since);
}

const now = (page: Page): Promise<number> =>
  page.evaluate(() => performance.now());

test("the commits of React, with a metadata file of 10,000 rows", async ({
  page,
  browser,
  browserName,
}, testInfo) => {
  test.skip(
    process.env["MEASURE_PROFILING"] === undefined,
    "needs the profiling build at BASE_URL and MEASURE_PROFILING set",
  );
  test.skip(browserName !== "chromium", "measured in Chromium alone");
  test.setTimeout(600_000);
  await mkdir(testInfo.outputPath(), { recursive: true });
  const csv = testInfo.outputPath("panel_rows10000.csv");
  await writeFile(csv, panelTenThousandRows());
  await page.addInitScript(() => {
    const events: { start: number; duration: number }[] = [];
    Object.assign(globalThis, { measureEvents: events });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        events.push({ start: e.startTime, duration: e.duration });
      }
    }).observe({ type: "event", durationThreshold: 16 } as never);
  });
  await load(page, join(FIXTURES, "panel.nei"), csv, "popcat");
  expect(
    await page.evaluate(() => "measureCommits" in globalThis),
    "the page is not the profiling build",
  ).toBe(true);
  // The result of 0.1, the default, which each Undo below brings back.
  await runAndSettle(page, 30_000);

  const kinds = [
    "a change of step, to Variants",
    "a change of the threshold",
    "a change of step, to Analyses",
    "a result arriving",
    "an undo, its result brought back",
  ];
  const taken: Committed[][] = kinds.map(() => []);
  const repeats = REPEATS * 2;
  for (let k = 0; k < repeats; k++) {
    let t = await now(page);
    await goTo(page, "Variants");
    taken[0]?.push(await commitsSince(page, t));

    t = await now(page);
    const threshold = page.getByLabel(
      "Maximum proportion of missing genotypes",
    );
    const value = String((21 + k) / 100);
    await threshold.fill(value);
    await threshold.press("Enter");
    await expect(threshold).toHaveValue(value);
    taken[1]?.push(await commitsSince(page, t));

    t = await now(page);
    await goTo(page, "Analyses");
    taken[2]?.push(await commitsSince(page, t));

    const before = (await logOf(page)).length;
    await panel(page).getByRole("button", { name: "Run", exact: true }).click();
    let answer: Logged | undefined;
    await expect
      .poll(
        async () => {
          answer = (await logOf(page))
            .slice(before)
            .find((l) => isCalc(l) && l.event === "in" && l.kind === "result");
          return answer !== undefined;
        },
        { timeout: 30_000, intervals: [50] },
      )
      .toBe(true);
    await expect(panel(page).getByRole("table")).toBeVisible();
    taken[3]?.push(await commitsSince(page, answer?.t ?? 0));

    t = await now(page);
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Undo", exact: true })
      .click();
    await expect(panel(page).getByRole("table")).toBeVisible();
    taken[4]?.push(await commitsSince(page, t));
  }
  const cell = (xs: readonly number[], unit: (x: number) => string): string => {
    const [mid, range] = stats(xs, unit);
    return `${mid} (${range})`;
  };
  const ms1 = (x: number): string => `${x.toFixed(1)} ms`;
  report(
    "The commits of React, panel.nei and a metadata file of 10,000 rows and 20 columns",
    `${machine(browser, browserName)}, React's profiling build; ${String(repeats)} repetitions in one page; the median, and the range in brackets`,
    [
      "interaction",
      "commits",
      "React drawing, summed over the commits",
      "the whole tree drawn again, at the largest commit",
      "the longest event, input to frame",
    ],
    kinds.map((kind, i) => {
      const of = taken[i] ?? [];
      return [
        kind,
        cell(
          of.map((c) => c.count),
          (x) => String(x),
        ),
        cell(
          of.map((c) => c.actual),
          ms1,
        ),
        cell(
          of.map((c) => c.base),
          ms1,
        ),
        cell(
          of.map((c) => c.event),
          ms,
        ),
      ];
    }),
  );
});

// ---------------------------------------------------------------------
// The writing of the filtered variants (VS5 D5).

/** A process of the engine under test: its pid and what it does, the
    type Chromium gives it or the service WebKit runs in it. */
interface EngineProcess {
  readonly pid: number;
  readonly kind: string;
}

/** Runs a command and gives its output, also when it exits with an error,
    as `footprint` does when a process it was given has ended. */
function execFileAsync(
  command: string,
  args: readonly string[],
): Promise<string> {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { encoding: "utf8", maxBuffer: 16 * 2 ** 20 },
      (_, stdout) => {
        resolve(stdout);
      },
    );
  });
}

/** The processes of the engine, Chromium's from the Chrome DevTools
    Protocol, WebKit's from the paths of Playwright's build of it, which
    runs one browser at a time when the tests run on one worker. */
async function engineProcesses(
  browser: Browser,
  browserName: string,
): Promise<readonly EngineProcess[]> {
  if (browserName === "chromium") {
    const cdp = await browser.newBrowserCDPSession();
    try {
      const { processInfo } = await cdp.send("SystemInfo.getProcessInfo");
      return processInfo.map((p) => ({
        pid: p.id,
        kind: p.type.includes("NetworkService") ? "network" : p.type,
      }));
    } finally {
      await cdp.detach();
    }
  }
  const text = await execFileAsync("ps", ["-axo", "pid=,command="]);
  const found: EngineProcess[] = [];
  for (const line of text.split("\n")) {
    const match = /^\s*(\d+) (.*ms-playwright\/webkit-.*)$/.exec(line);
    if (match === null) continue;
    const command = match[2] ?? "";
    const service = /com\.apple\.WebKit\.(\w+)\.xpc/.exec(command)?.[1];
    const kind = service ?? (command.includes("Playwright.app") ? "UI" : null);
    if (kind !== null) found.push({ pid: Number(match[1]), kind });
  }
  return found;
}

/** The footprint of each process, as macOS counts it: its memory in RAM
    or compressed. A process that ended meanwhile is left out. */
async function footprints(
  processes: readonly EngineProcess[],
): Promise<Map<number, number>> {
  const args = ["-f", "bytes", "--noCategories"];
  for (const p of processes) args.push("-p", String(p.pid));
  const text = await execFileAsync("footprint", args);
  const found = new Map<number, number>();
  for (const match of text.matchAll(/\[(\d+)\]: .*Footprint: (\d+) B/g)) {
    found.set(Number(match[1]), Number(match[2]));
  }
  return found;
}

/** The memory of the engine at one moment: the sum of the footprints of
    its processes of each kind, and of all of them. */
interface Sample {
  /** `Date.now()`, the clock the calculation worker marks its moments by. */
  readonly t: number;
  readonly byKind: ReadonlyMap<string, number>;
  readonly total: number;
}

/** Takes the memory of the engine one time after another until stopped,
    a few tens of milliseconds apart, or `pauseMs` and the time of a
    sample; the processes are listed by `list` when given, for an engine
    with no `Browser`. */
function sampleMemory(
  browser: Browser | null,
  browserName: string,
  pauseMs = 10,
  list?: () => Promise<readonly EngineProcess[]>,
): { readonly samples: readonly Sample[]; stop(): Promise<void> } {
  const samples: Sample[] = [];
  const state = { stopped: false };
  const loop = (async () => {
    while (!state.stopped) {
      const processes =
        list === undefined
          ? browser === null
            ? []
            : await engineProcesses(browser, browserName)
          : await list();
      const sizes = await footprints(processes);
      const byKind = new Map<string, number>();
      let total = 0;
      for (const p of processes) {
        const size = sizes.get(p.pid);
        if (size === undefined) continue;
        byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + size);
        total += size;
      }
      samples.push({ t: Date.now(), byKind, total });
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  })();
  return {
    samples,
    async stop() {
      state.stopped = true;
      await loop;
    },
  };
}

/** How long the calculation worker holds still, busy, before and after
    it makes the `Blob` of a written file, so that the memory can be taken
    with the array alone and with the array and the `Blob`. */
const WRITE_PAUSE_MS = 1500;

/** The moments the calculation worker marks around the `Blob` of a
    written file, `Date.now()` of each. */
interface BlobMarks {
  /** The array held, before the first pause. */
  readonly array: number;
  /** After the pause, the `Blob` about to be made. */
  readonly blobStart: number;
  /** The `Blob` made, the array still held. */
  readonly blobEnd: number;
  /** The end of the second pause, after which the runner drops the array. */
  readonly pauseEnd: number;
}

/** Makes the calculation worker mark, on its console, the moments of the
    `Blob` of a file larger than 1 MB, and hold still `WRITE_PAUSE_MS`
    before and after making it. The worker's `Blob` is replaced by a
    subclass that does this and is a `Blob` all the same. */
async function markBlobs(worker: PlaywrightWorker): Promise<void> {
  await worker.evaluate((pauseMs) => {
    const Original = Blob;
    const hold = (ms: number): void => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        // Busy, so that nothing of the worker runs meanwhile.
      }
    };
    const mark = (what: string): void => {
      console.warn(`measure ${what} ${String(Date.now())}`);
    };
    class Marked extends Original {
      constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
        const large = (parts ?? []).some(
          (part) =>
            typeof part !== "string" &&
            "byteLength" in part &&
            part.byteLength > 1_000_000,
        );
        if (large) {
          mark("array");
          hold(pauseMs);
          mark("blobStart");
        }
        super(parts, options);
        if (large) {
          mark("blobEnd");
          hold(pauseMs);
          mark("pauseEnd");
        }
      }
    }
    globalThis.Blob = Marked;
  }, WRITE_PAUSE_MS);
}

/** What one write gave. */
interface WriteRun {
  /** How it ended: the Save button, popnei's refusal, the worker stopped
      with no answer, the page crashed, or other words. */
  readonly outcome: "saved" | "refused" | "workerFailed" | "crashed" | "other";
  /** What the section of the writing said at its end. */
  readonly words: string;
  /** From the write posted to the worker to its answer, the two pauses
      taken off, in ms; null when the worker gave no answer. */
  readonly writeMs: number | null;
  /** How long the engine took to make the `Blob`, in ms. */
  readonly blobMs: number | null;
  /** The size of the file downloaded, and what pyarrow read back of it. */
  readonly fileBytes: number | null;
  readonly whole: string;
  /** The memory of the engine, the sum over its processes, at each
      moment. */
  readonly before: Sample | null;
  readonly peak: Sample | null;
  readonly withArray: Sample | null;
  readonly withArrayAndBlob: Sample | null;
  readonly after: Sample | null;
  readonly afterSave: Sample | null;
}

/** The sample of the largest total among those taken between `from` and
    `to`, or null when none was. */
function largest(
  samples: readonly Sample[],
  from: number,
  to: number,
): Sample | null {
  let best: Sample | null = null;
  for (const s of samples) {
    if (s.t < from || s.t > to) continue;
    if (best === null || s.total > best.total) best = s;
  }
  return best;
}

/** The sample of the median total among those between `from` and `to`. */
function settled(
  samples: readonly Sample[],
  from: number,
  to: number,
): Sample | null {
  const inside = samples
    .filter((s) => s.t >= from && s.t <= to)
    .sort((a, b) => a.total - b.total);
  return inside[Math.floor(inside.length / 2)] ?? null;
}

function writingSection(page: Page): Locator {
  return page.getByRole("region", { name: "Writing the filtered variants" });
}

/** Reads the written file at `path` with pyarrow: its variants, its
    individuals and the position of its last variant, "20,000 variants of
    1,000 individuals, the last at 20,000,000". Every batch is read, so a
    file with a part missing or damaged fails here. */
function readBack(path: string): string {
  const script = [
    "import json, sys, pyarrow as pa",
    "r = pa.ipc.open_file(pa.memory_map(sys.argv[1]))",
    "n = 0",
    "last = None",
    "for i in range(r.num_record_batches):",
    "    b = r.get_batch(i)",
    "    n += b.num_rows",
    "    last = b.column('pos')[-1].as_py()",
    "inds = json.loads(r.schema.metadata[b'popnei'])['individuals']",
    "print(f'{n:,} variants of {len(inds):,} individuals, the last at {last:,}')",
  ].join("\n");
  return execFileSync(
    UV,
    ["run", "--no-project", "--with", "pyarrow", "python", "-c", script, path],
    { encoding: "utf8" },
  ).trim();
}

/** How a write ended: the Save button, or the words of a failure. */
async function writeOutcome(
  page: Page,
  crashed: () => boolean,
  timeout: number,
): Promise<WriteRun["outcome"]> {
  const section = writingSection(page);
  const found: { outcome: WriteRun["outcome"] | null; started: boolean } = {
    outcome: null,
    started: false,
  };
  await expect
    .poll(
      async () => {
        let bar: boolean;
        try {
          bar = (await section.getByRole("progressbar").count()) > 0;
        } catch (error) {
          // A page whose process ended answers no locator, sometimes before
          // its event of the crash arrives.
          if (!crashed() && !/crash|closed/i.test(String(error))) throw error;
          found.outcome = "crashed";
          return true;
        }
        if (crashed()) {
          found.outcome = "crashed";
        } else if (
          (await section.getByRole("button", { name: /^Save / }).count()) > 0
        ) {
          found.outcome = "saved";
        } else if (bar) {
          found.started = true;
        } else if (found.started) {
          const text = await section.innerText();
          found.outcome = text.includes("could not be written")
            ? "refused"
            : text.includes("stopped unexpectedly")
              ? "workerFailed"
              : "other";
        }
        return found.outcome !== null;
      },
      { timeout, intervals: [250] },
    )
    .toBe(true);
  return found.outcome ?? "other";
}

/** Presses Write on the page, whose variants file is read, waits for the
    end, and saves the file when there is one into MEASURE_DIR, reads it
    back and deletes it. */
async function writeAndSave(
  page: Page,
  samples: readonly Sample[],
  crashed: () => boolean,
): Promise<WriteRun> {
  await expect
    .poll(() => page.workers().some((w) => w.url().includes("runnerWorker")))
    .toBe(true);
  const worker = page.workers().find((w) => w.url().includes("runnerWorker"));
  if (worker === undefined) throw new Error("no calculation worker");
  const marks = new Map<string, number>();
  worker.on("console", (message) => {
    const match = /^measure (\w+) (\d+)$/.exec(message.text());
    if (match !== null) marks.set(match[1] ?? "", Number(match[2]));
  });
  await markBlobs(worker);
  await page.waitForTimeout(1500);
  const logFrom = (await logOf(page)).length;
  const clicked = Date.now();
  await writingSection(page)
    .getByRole("button", { name: "Write the filtered variants as a .nei file" })
    .click();
  const outcome = await writeOutcome(page, crashed, 1_800_000);
  const ended = Date.now();
  const words =
    crashed() || outcome === "crashed"
      ? "the page crashed"
      : (await writingSection(page).innerText()).replace(/\s+/g, " ").trim();
  const log = outcome === "crashed" ? [] : (await logOf(page)).slice(logFrom);
  const posted = log.find((l) => l.event === "out" && l.kind === "write");
  const answered = log.find(
    (l) =>
      l.event === "in" && ["written", "refused", "crashed"].includes(l.kind),
  );
  const array = marks.get("array");
  const blobStart = marks.get("blobStart");
  const blobEnd = marks.get("blobEnd");
  const pauseEnd = marks.get("pauseEnd");
  const blob: BlobMarks | null =
    array === undefined ||
    blobStart === undefined ||
    blobEnd === undefined ||
    pauseEnd === undefined
      ? null
      : { array, blobStart, blobEnd, pauseEnd };
  const paused =
    blob === null
      ? 0
      : blob.blobStart - blob.array + blob.pauseEnd - blob.blobEnd;
  const base = {
    words,
    writeMs:
      posted === undefined || answered === undefined
        ? null
        : answered.t - posted.t - paused,
    blobMs: blob === null ? null : blob.blobEnd - blob.blobStart,
    before: settled(samples, clicked - 1200, clicked),
    peak: largest(samples, clicked, ended),
    withArray:
      blob === null ? null : settled(samples, blob.array + 500, blob.blobStart),
    withArrayAndBlob:
      blob === null
        ? null
        : settled(samples, blob.blobEnd + 500, blob.pauseEnd),
  };
  if (outcome !== "saved") {
    return {
      ...base,
      outcome,
      fileBytes: null,
      whole: "",
      after: null,
      afterSave: null,
    };
  }
  // The worker is started again after a large file, and the page holds
  // the Blob until it is saved.
  await page.waitForTimeout(3000);
  const afterAt = Date.now();
  await page.waitForTimeout(1000);
  const after = settled(samples, afterAt, Date.now());
  const download = page.waitForEvent("download", { timeout: 1_800_000 });
  await writingSection(page)
    .getByRole("button", { name: /^Save / })
    .click();
  const saving = await download;
  const failure = await saving.failure();
  let fileBytes: number | null = null;
  let whole = `the download failed: ${String(failure)}`;
  if (failure === null) {
    // A folder for each project, since the two engines may run at once.
    const dir = join(MEASURE_DIR, `written-${test.info().project.name}`);
    await mkdir(dir, { recursive: true });
    const path = join(dir, saving.suggestedFilename());
    await saving.saveAs(path);
    fileBytes = statSync(path).size;
    try {
      whole = readBack(path);
    } catch (error) {
      whole = `not read back: ${String(error)}`;
    }
    await rm(path);
  }
  await page.waitForTimeout(3000);
  const savedAt = Date.now();
  await page.waitForTimeout(1000);
  return {
    ...base,
    outcome,
    fileBytes,
    whole,
    after,
    afterSave: settled(samples, savedAt, Date.now()),
  };
}

/** Opens a new page, picks `file`, and writes its variants with the
    filters of a new project, taking the memory of the engine throughout.
    With `retry`, a write that fails is tried again once, after a change of
    the threshold that keeps the same variants, in the worker the client
    started after the failure. */
async function writeOnce(
  browser: Browser,
  browserName: string,
  file: string,
  retry: boolean,
): Promise<{ run: WriteRun; retried: WriteRun | null }> {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  let pageCrashed = false;
  page.on("crash", () => {
    pageCrashed = true;
  });
  const sampler = sampleMemory(browser, browserName);
  try {
    await page.addInitScript(instrument);
    await page.goto("popgen.html#variants");
    await pick(page, "Variants file", file);
    await expect(page.getByText(/^[\d,]+ individuals$/)).toBeVisible({
      timeout: 120_000,
    });
    const run = await writeAndSave(page, sampler.samples, () => pageCrashed);
    let retried: WriteRun | null = null;
    if (retry && run.outcome !== "saved" && run.outcome !== "crashed") {
      await setThreshold(page, "0.2");
      retried = await writeAndSave(page, sampler.samples, () => pageCrashed);
    }
    return { run, retried };
  } finally {
    await sampler.stop();
    await context.close();
  }
}

/** The kinds of process of each engine, in the order of the tables. */
const KINDS: Readonly<Record<string, readonly string[]>> = {
  chromium: ["browser", "renderer", "GPU", "network"],
  webkit: ["UI", "WebContent", "Networking", "GPU"],
};

const gb = (bytes: number): string => `${(bytes / 1e9).toFixed(2)} GB`;

/** The rows of the memory of the writes of one file: each moment, the
    median of the total and its range, and the median of each kind. */
function memoryRows(
  runs: readonly WriteRun[],
  browserName: string,
): string[][] {
  const moments: readonly [string, (r: WriteRun) => Sample | null][] = [
    ["before the write, the file read", (r) => r.before],
    ["the largest during the write", (r) => r.peak],
    ["the array made, before the Blob", (r) => r.withArray],
    ["the Blob made, the array still held", (r) => r.withArrayAndBlob],
    ["the file written, 3 s after", (r) => r.after],
    ["the file saved, 3 s after", (r) => r.afterSave],
  ];
  return moments.map(([what, of]) => {
    const samples = runs.map(of).filter((s): s is Sample => s !== null);
    if (samples.length === 0) return [what, "not taken"];
    const [mid, range] = stats(
      samples.map((s) => s.total),
      mb,
    );
    const kinds = (KINDS[browserName] ?? []).map((kind) =>
      mb(median(samples.map((s) => s.byKind.get(kind) ?? 0))),
    );
    return [what, `${mid} (${range})`, ...kinds];
  });
}

/** The version of macOS, for the head of a table. */
function macOs(): string {
  return execFileSync("sw_vers", ["-productVersion"], {
    encoding: "utf8",
  }).trim();
}

/** The .nei file of 200,000 variants of the 1,000 individuals, ten times
    that of 20,000, is written from a gzipped VCF of `e2e/bigVcf.ts`, and
    so are the larger ones: node's wasm has the 4 GB bound of the tab's,
    so writeVars in node cannot make them. */
const TEN_TIMES_VARIANTS = 200_000;

/** The gzipped VCF of `numVars` variants of `e2e/bigVcf.ts` in
    MEASURE_DIR, written when it is not there: 127.6 MB for 200,000
    variants, 5 s to write in node on the owner's Mac. */
async function writeVcfOf(numVars: number): Promise<string> {
  await mkdir(MEASURE_DIR, { recursive: true });
  const path = join(MEASURE_DIR, `write_${String(numVars)}.vcf.gz`);
  if (!existsSync(path)) {
    // Under another name until whole, so that a run stopped midway leaves
    // no short file for the next one to take.
    const part = join(MEASURE_DIR, `write_${String(numVars)}.part.vcf.gz`);
    await writeBigVcf(part, numVars);
    await rename(part, path);
  }
  return path;
}

/** Writes `file` MEASURE_REPEATS times, each on a new page, and prints
    the time and the memory. */
async function measureWrites(
  browser: Browser,
  browserName: string,
  file: string,
  title: string,
): Promise<void> {
  const runs: WriteRun[] = [];
  for (let k = 0; k < REPEATS; k++) {
    const { run } = await writeOnce(browser, browserName, file, false);
    expect(run.outcome, run.words).toBe("saved");
    runs.push(run);
  }
  const numbers = (of: (r: WriteRun) => number | null): number[] =>
    runs.map(of).filter((x): x is number => x !== null);
  const head = `${machine(browser, browserName)}, macOS ${macOs()}; ${String(REPEATS)} writes, each on a new page; the median, and the range in brackets; the source ${statSync(file).size.toLocaleString("en-US")} bytes`;
  report(
    `${title}: the time`,
    head,
    ["what", "median", "range"],
    [
      [
        "the write, from its request to the file in the page, the pauses taken off",
        ...stats(
          numbers((r) => r.writeMs),
          ms,
        ),
      ],
      [
        "the Blob made of the array",
        ...stats(
          numbers((r) => r.blobMs),
          ms,
        ),
      ],
      [
        "the file downloaded, in bytes",
        ...stats(
          numbers((r) => r.fileBytes),
          (x) => x.toLocaleString("en-US"),
        ),
      ],
      [
        "read back with pyarrow",
        [...new Set(runs.map((r) => r.whole))].join("; "),
        "",
      ],
    ],
  );
  report(
    `${title}: the memory of the engine, the footprints of its processes summed`,
    `${head}; the worker held still ${ms(WRITE_PAUSE_MS)} before and after it made the Blob`,
    ["moment", "all the processes", ...(KINDS[browserName] ?? [])],
    memoryRows(runs, browserName),
  );
}

test.describe("VS5 D5 the measurements of the write", () => {
  test("VS5 D5 the write of the .nei file of 19,161,178 bytes: the time, the memory, and the copy into the Blob", async ({
    browser,
    browserName,
  }) => {
    test.setTimeout(1_800_000);
    const { nei } = await bigFiles();
    await measureWrites(
      browser,
      browserName,
      nei,
      "The write of the .nei file of 20,000 variants of 1,000 individuals, from itself",
    );
  });

  test("VS5 D5 the write of a file ten times larger, 200,000 variants of 1,000 individuals: the time, the memory, and the copy into the Blob", async ({
    browser,
    browserName,
  }) => {
    test.setTimeout(3_600_000);
    const vcf = await writeVcfOf(TEN_TIMES_VARIANTS);
    await measureWrites(
      browser,
      browserName,
      vcf,
      "The write of the .nei file of 200,000 variants of 1,000 individuals, from their gzipped VCF",
    );
  });

  test("VS5 D5 the largest file written, the variants doubled from 200,000 until a write fails, and a second try of the one that failed", async ({
    browser,
    browserName,
  }) => {
    // Each size is a pass over a gzipped VCF of up to 2 GB, and the file
    // written is downloaded and read back.
    test.setTimeout(7_200_000);
    const rows: string[][] = [];
    const row = (what: string, r: WriteRun): string[] => [
      what,
      r.outcome,
      r.fileBytes === null ? "" : r.fileBytes.toLocaleString("en-US"),
      r.whole,
      r.writeMs === null ? "" : ms(r.writeMs),
      r.peak === null ? "" : gb(r.peak.total),
      r.withArray === null ? "" : gb(r.withArray.total),
      r.withArrayAndBlob === null ? "" : gb(r.withArrayAndBlob.total),
      r.after === null ? "" : gb(r.after.total),
      r.words,
    ];
    /** Writes the VCF of `numVars` variants, and says whether the file
        was saved. */
    const tryWrite = async (
      numVars: number,
      retry: boolean,
    ): Promise<boolean> => {
      const vcf = await writeVcfOf(numVars);
      const { run, retried } = await writeOnce(
        browser,
        browserName,
        vcf,
        retry,
      );
      rows.push(row(numVars.toLocaleString("en-US"), run));
      if (retried !== null) rows.push(row("the same, tried again", retried));
      return run.outcome === "saved";
    };
    // Doubled up to 3,200,000 variants, a file of about 3.5 GB, since one
    // of 6,400,000 would be larger than the 4 GiB wasm addresses; the
    // first that fails is tried again. Then three halvings of the interval
    // between the last file written and the first that failed.
    let written: number | null = null;
    let failedAt: number | null = null;
    for (let numVars = TEN_TIMES_VARIANTS; numVars <= 3_200_000; numVars *= 2) {
      if (!(await tryWrite(numVars, true))) {
        failedAt = numVars;
        break;
      }
      written = numVars;
    }
    if (failedAt !== null && written !== null) {
      let [low, high] = [written, failedAt];
      for (let k = 0; k < 3; k++) {
        const middle = (low + high) / 2;
        if (await tryWrite(middle, false)) low = middle;
        else high = middle;
      }
    }
    report(
      "The largest file written, the variants of 1,000 individuals doubled",
      `${machine(browser, browserName)}, macOS ${macOs()}; one write of each, on a new page; the memory is the footprints of the engine's processes summed; a failed write is tried again once, after a change of the threshold that keeps every variant`,
      [
        "variants",
        "outcome",
        "file, bytes",
        "read back with pyarrow",
        "write",
        "largest memory",
        "the array made",
        "the array and the Blob",
        "written, 3 s after",
        "the words of the step",
      ],
      rows,
    );
  });
});

// ---------------------------------------------------------------------
// DL5 D1, the cost of the bar (docs/plans/download.md, work package 5):
// the write of the .nei file of 200,000 variants of 1,000 individuals on
// the old page, with popnei's progress posted to the page and drawn by
// its bar, and with it dropped in the worker before it is posted, so that
// the bar is drawn busy. No code of the application changes: the
// calculation worker's script is served with a few lines in front of it,
// as e2e/holdWorker.ts serves it.

/** Put in front of the calculation worker's script: the progress of a
    write is dropped before it is posted. The worker's own listener is
    added after this one, so the id of a write is known before the write
    runs. */
const NO_WRITE_PROGRESS = `{
  const realPost = self.postMessage.bind(self);
  let writeId = null;
  self.addEventListener("message", (event) => {
    const d = event.data;
    if (d !== null && typeof d === "object" && d.kind === "write") writeId = d.id;
  });
  self.postMessage = (m, t) => {
    if (m !== null && typeof m === "object" && m.kind === "progress" && m.id === writeId) return;
    realPost(m, t);
  };
}
`;

/** The load above which a write waits before it is timed, the 1-minute
    average of `uptime`. */
const DL5_MAX_LOAD = 8;

/** What one timed write gave. */
interface BarRun {
  readonly bar: boolean;
  readonly order: number;
  /** From the press of Write to the answer of the write, in ms. */
  readonly pressMs: number;
  /** From the write posted to the worker to its answer, in ms. */
  readonly postMs: number;
  /** The messages of progress of the write the page received. */
  readonly progress: number;
  readonly load: string;
  readonly words: string;
}

/** Opens a new page of popgen.html, picks `file`, and times one write of
    its variants with the filters of a new project, with the bar or with
    the progress of the write dropped. */
async function timeWrite(
  browser: Browser,
  file: string,
  bar: boolean,
  order: number,
): Promise<BarRun> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.addInitScript(instrument);
    if (!bar) {
      await page.route(/\/runnerWorker-[^/]*\.js$/u, async (route) => {
        const response = await route.fetch();
        const script = await response.text();
        await route.fulfill({ response, body: NO_WRITE_PROGRESS + script });
      });
    }
    await page.goto("popgen.html#variants");
    await pick(page, "Variants file", file);
    await expect(page.getByText(/^[\d,]+ individuals$/)).toBeVisible({
      timeout: 120_000,
    });
    // The pass of the opening ended, and the page settled.
    await page.waitForTimeout(3000);
    for (let waited = 0; (loadavg()[0] ?? 0) > DL5_MAX_LOAD; waited++) {
      if (waited >= 40)
        throw new Error(`the load stayed above ${String(DL5_MAX_LOAD)}`);
      await page.waitForTimeout(30_000);
    }
    const load = machineLoad();
    const logFrom = (await logOf(page)).length;
    const clicked = Date.now();
    await writingSection(page)
      .getByRole("button", {
        name: "Write the filtered variants as a .nei file",
      })
      .click();
    let log: readonly Logged[] = [];
    await expect
      .poll(
        async () => {
          log = (await logOf(page)).slice(logFrom).filter(isCalc);
          return log.some(
            (l) =>
              l.event === "in" &&
              ["written", "refused", "crashed", "workerError"].includes(l.kind),
          );
        },
        { timeout: 600_000, intervals: [100] },
      )
      .toBe(true);
    const posted = log.find((l) => l.event === "out" && l.kind === "write");
    const answered = log.find(
      (l) =>
        l.event === "in" &&
        ["written", "refused", "crashed", "workerError"].includes(l.kind),
    );
    if (posted === undefined || answered === undefined) {
      throw new Error("no write, or no answer to it, in the log of the worker");
    }
    expect(answered.kind).toBe("written");
    await expect(
      writingSection(page).getByRole("button", { name: /^Save / }),
    ).toBeVisible({ timeout: 60_000 });
    const words = (await writingSection(page).innerText())
      .replace(/\s+/g, " ")
      .trim();
    return {
      bar,
      order,
      pressMs: answered.wall - clicked,
      postMs: answered.t - posted.t,
      progress: log.filter((l) => l.event === "in" && l.kind === "progress")
        .length,
      load,
      words,
    };
  } finally {
    await context.close();
  }
}

test("DL5 D1 the cost of the bar: the write of the .nei file of 200,000 variants of 1,000 individuals, five times with popnei's progress drawn by the bar and five times with it dropped in the worker", async ({
  browser,
  browserName,
}) => {
  test.setTimeout(3_600_000);
  const vcf = await writeVcfOf(TEN_TIMES_VARIANTS);
  const runs: BarRun[] = [];
  // Alternated, so that a drift of the machine falls on both.
  for (let k = 0; k < 2 * REPEATS; k++) {
    runs.push(await timeWrite(browser, vcf, k % 2 === 0, k + 1));
  }
  const of = (bar: boolean): number[] =>
    runs.filter((r) => r.bar === bar).map((r) => r.pressMs);
  const spread = (xs: readonly number[]): number =>
    Math.max(...xs) - Math.min(...xs);
  const withBar = of(true);
  const without = of(false);
  const allowed = Math.max(0.02 * median(without), spread(without));
  const longer = median(withBar) - median(without);
  report(
    "The cost of the bar: each write",
    `${machine(browser, browserName)}, macOS ${macOs()}; ${new Date().toISOString().slice(0, 10)}; each write on a new page of popgen.html, the gzipped VCF of ${statSync(vcf).size.toLocaleString("en-US")} bytes, the filters of a new project; in the order run`,
    [
      "write",
      "bar",
      "press of Write to the answer",
      "write posted to the answer",
      "progress received",
      "load (1, 5, 15 min)",
      "the words of the section",
    ],
    runs.map((r) => [
      String(r.order),
      r.bar ? "with" : "without",
      ms(r.pressMs),
      ms(r.postMs),
      String(r.progress),
      r.load,
      r.words,
    ]),
  );
  report(
    "The cost of the bar: the medians",
    `${machine(browser, browserName)}; the time from the press of Write to the answer of the write; the spread is the longest of the writes less the shortest`,
    ["bar", "median", "spread", "writes"],
    [
      [
        "with",
        ms(median(withBar)),
        ms(spread(withBar)),
        withBar.map(ms).join(", "),
      ],
      [
        "without",
        ms(median(without)),
        ms(spread(without)),
        without.map(ms).join(", "),
      ],
      [
        "with less without",
        ms(longer),
        `allowed ${ms(allowed)}`,
        longer <= allowed
          ? "the bar may show its share"
          : "the bar slows the write",
      ],
    ],
  );
  // The bar received popnei's progress, and its absence received none.
  expect(runs.filter((r) => r.bar).every((r) => r.progress > 0)).toBe(true);
  expect(runs.filter((r) => !r.bar).every((r) => r.progress === 0)).toBe(true);
});

// ---------------------------------------------------------------------
// The Count against the diversity (VS6 D3).

/** The time of one run of `what`, the Count, one pass, or the
    diversity, two passes from stage 5 when a population has the minimum
    of individuals, with the missing data filter at 0.05, on a new page
    with `file` just loaded, from the run posted to the calculation worker
    to its answer: the filter put on the Variants opened at the load, and
    the passes. */
async function runOnce(
  browser: Browser,
  file: string,
  pops: string,
  what: "count" | "diversity",
): Promise<number> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await load(page, file, pops, "pop");
    await setThreshold(page, "0.05");
    if (what === "diversity") {
      const ran = await runAndSettle(page, 240_000);
      expect(ran.table).toBe(true);
      return ran.runMs;
    }
    const before = (await logOf(page)).length;
    await page
      .getByRole("button", { name: "Count the variants each filter keeps" })
      .click();
    let ended: readonly Logged[] = [];
    await expect
      .poll(
        async () => {
          ended = (await logOf(page)).slice(before).filter(isCalc);
          return ended.some((l) => l.event === "in" && ENDS.has(l.kind));
        },
        { timeout: 240_000, intervals: [50] },
      )
      .toBe(true);
    const run = ended.find((l) => l.event === "out" && l.kind === "run");
    const answer = ended.find((l) => l.event === "in" && ENDS.has(l.kind));
    if (run === undefined || answer === undefined) {
      throw new Error("no run, or no answer to it, in the log of the worker");
    }
    expect(answer.kind).toBe("result");
    await expect(
      page
        .getByRole("main")
        .getByText(/ variants of big\.(vcf|nei) pass the filters\.$/),
    ).toBeVisible();
    return answer.t - run.t;
  } finally {
    await context.close();
  }
}

test("VS6 D3 the Count against the diversity: a pass of the Count and a run of the diversity, two passes from stage 5, with the same filters, on the VCF of 80,692,954 bytes and the .nei file of 19,161,178 bytes", async ({
  browser,
  browserName,
}) => {
  test.setTimeout(1_800_000);
  const files = await bigFiles();
  const rows: string[][] = [];
  for (const which of ["vcf", "nei"] as const) {
    const file = files[which];
    const counts: number[] = [];
    const diversities: number[] = [];
    // Each run on a new page, the Count and the diversity in turn, so
    // that neither finds the Variants of the other already opened.
    for (let k = 0; k < REPEATS; k++) {
      counts.push(await runOnce(browser, file, files.pops, "count"));
      diversities.push(await runOnce(browser, file, files.pops, "diversity"));
    }
    rows.push([
      `${which === "vcf" ? "VCF" : ".nei file"} of ${statSync(file).size.toLocaleString("en-US")} bytes`,
      ...stats(counts, ms),
      ...stats(diversities, ms),
      (median(counts) / median(diversities)).toFixed(2),
    ]);
  }
  report(
    "The Count against the diversity, with the missing data filter at 0.05",
    `${machine(browser, browserName)}; ${String(REPEATS)} runs of each, the Count one pass and the diversity two from stage 5, each on a new page just after the load, from the run posted to the calculation worker to its answer`,
    [
      "file",
      "Count, median",
      "Count, range",
      "diversity, two passes, median",
      "diversity, two passes, range",
      "Count / diversity",
    ],
    rows,
  );
});

// ---------------------------------------------------------------------
// The table of the statistics of 10,000 individuals (VS7 D4).

/** The individuals and the variants of the VCF of the table. */
const TABLE_INDIVIDUALS = 10_000;
const TABLE_VARIANTS = 500;

/** The gzipped VCF of 10,000 individuals and 500 variants of
    `e2e/bigVcf.ts` in MEASURE_DIR, written when it is not there. */
async function tableVcf(): Promise<string> {
  await mkdir(MEASURE_DIR, { recursive: true });
  const name = `individuals_${String(TABLE_INDIVIDUALS)}`;
  const path = join(MEASURE_DIR, `${name}.vcf.gz`);
  if (!existsSync(path)) {
    // Under another name until whole, as the files of the write.
    const part = join(MEASURE_DIR, `${name}.part.vcf.gz`);
    await writeBigVcf(part, TABLE_VARIANTS, TABLE_INDIVIDUALS);
    await rename(part, path);
  }
  return path;
}

/** The time the page is frozen by a press of `control`: from the click,
    which React answers in the same task, to the end of the task that
    follows the next frame, so that the change drawn, its layout and its
    paint are in it. */
async function frozenBy(control: Locator): Promise<number> {
  return control.evaluate(async (element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("the control is not an HTML element");
    }
    const t0 = performance.now();
    element.click();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 0);
      });
    });
    return performance.now() - t0;
  });
}

/** The time the page is frozen by Enter pressed in the field `field`,
    which commits what it holds: from the key, which React answers in the
    same task, to the end of the task that follows the next frame, as
    `frozenBy`. */
async function frozenByEnter(field: Locator): Promise<number> {
  return field.evaluate(async (element) => {
    const t0 = performance.now();
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
      }),
    );
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 0);
      });
    });
    return performance.now() - t0;
  });
}

/**
 * The time the page is frozen by the table of the statistics of each
 * individual at 10,000 individuals (docs/specs/analyses/individualChecks.md,
 * "Left for the running application"; the plan of the Variants step,
 * VS7 D4): the column Kept added by a list applied, then changed by
 * another list, the table sorted by a header, and a threshold of the
 * filters of individuals committed, which redraws the column Kept and
 * the counts beside the filters with no pass.
 */
test("VS7 D4 the table at 10,000 individuals: the page frozen when the column Kept changes, when a header sorts it and when a threshold moves", async ({
  page,
  browser,
  browserName,
}) => {
  test.setTimeout(600_000);
  const vcf = await tableVcf();
  await page.goto("popgen.html#variants");
  await pick(page, "Variants file", vcf);
  await expect(
    page
      .getByRole("region", { name: "Variants file" })
      .getByText(`${TABLE_INDIVIDUALS.toLocaleString("en-US")} individuals`),
  ).toBeVisible({ timeout: 60_000 });
  const section = page.getByRole("region", {
    name: "Filters of the individuals",
  });
  await section
    .getByRole("button", {
      name: "Calculate the statistics of each individual",
    })
    .click();
  const table = section.getByRole("grid", {
    name: "Statistics of each individual",
  });
  await expect(table).toBeVisible({ timeout: 120_000 });
  const drawn = await table.getByRole("row").count();

  const area = section.getByRole("textbox", {
    name: "Individuals to remove, one name per line",
  });
  const apply = section.getByRole("button", {
    name: "Apply the list to remove",
    exact: true,
  });
  const kept = table.getByRole("columnheader", { name: /^Kept/ });

  // The column Kept added: a list to remove applied to a table with none.
  await area.fill("s0000");
  const added = await frozenBy(apply);
  await expect(kept).toBeVisible();

  // The column Kept changed: the list to remove, s0001 and s0000 in turn.
  const changed: number[] = [];
  for (let k = 0; k < REPEATS; k++) {
    const name = k % 2 === 0 ? "s0001" : "s0000";
    await area.fill(name);
    changed.push(await frozenBy(apply));
    await expect(
      table
        .getByRole("row")
        .filter({ has: page.getByRole("rowheader", { name, exact: true }) })
        .getByRole("gridcell", { name: "removed", exact: true }),
    ).toBeVisible();
  }

  // A header sorts the table, up and down in turn.
  const header = table.getByRole("columnheader", {
    name: /^Proportion of missing genotypes/,
  });
  const sorted: number[] = [];
  for (let k = 0; k < REPEATS; k++) {
    sorted.push(await frozenBy(header));
  }
  await expect(header).toHaveAttribute("aria-sort", /ascending|descending/);

  // A threshold of the individuals committed: the missing data of each
  // individual, about 3 in 100 of its 500 genotypes, so that 0.03 and
  // 0.028 in turn move thousands of individuals between kept and removed.
  // The number is typed, and the Enter that commits it timed.
  await section
    .getByText("Filter the individuals by missing data", { exact: true })
    .click();
  const threshold = section.getByLabel(
    "Maximum proportion of missing genotypes of an individual, from 0 to 1",
    { exact: true },
  );
  await expect(threshold).toHaveValue("0.1");
  const moved: number[] = [];
  for (let k = 0; k < REPEATS; k++) {
    const value = k % 2 === 0 ? "0.03" : "0.028";
    await threshold.fill(value);
    moved.push(await frozenByEnter(threshold));
    await expect(
      section.getByText(
        /^Kept [\d,]+ of the 10,000 individuals it was given\.$/,
      ),
    ).toBeVisible();
    await expect(threshold).toHaveValue(value);
  }

  report(
    `The table of the statistics of ${TABLE_INDIVIDUALS.toLocaleString("en-US")} individuals, from a VCF of ${String(TABLE_VARIANTS)} variants`,
    `${machine(browser, browserName)}; ${String(drawn)} rows of the table in the page, its header among them; each time from the click to the end of the task after the next frame, ${String(REPEATS)} times but the first`,
    ["change", "median", "range"],
    [
      ["the column Kept added by a list", ms(added), "once"],
      ["the column Kept changed by a list", ...stats(changed, ms)],
      ["a header sorts the rows", ...stats(sorted, ms)],
      ["a threshold of the individuals committed", ...stats(moved, ms)],
    ],
  );
});

// ---------------------------------------------------------------------
// The table of individuals_10000.xlsx under the tab "Individuals file" of
// popgen2.html, sorted by a header (IN6 D4, the plan of the input page),
// beside the sort of the 10,000 rows of the statistics of VS7 D4.

/** What a sort of the table took, in milliseconds from the click: to the
    first frame drawn after it, to the end of the task after the frame
    that shows the rows sorted, and the longest stretch between two
    frames, in which the page answered nothing. */
interface SortTimes {
  readonly firstFrame: number;
  readonly sorted: number;
  readonly longest: number;
}

/** The times of a sort of the table by a click on `header`: the rows are
    sorted when the header's `aria-sort` has changed and the grid is not
    `aria-busy`; until then a frame is asked for after each frame. */
async function sortTimes(header: Locator): Promise<SortTimes> {
  return header.evaluate(async (element) => {
    if (!(element instanceof HTMLElement)) {
      throw new Error("the header is not an HTML element");
    }
    const grid = element.closest('[role="grid"]');
    if (grid === null) throw new Error("the header is in no grid");
    const before = element.getAttribute("aria-sort");
    const t0 = performance.now();
    let last = t0;
    let longest = 0;
    // The times of the frames from the click.
    const frames: number[] = [];
    element.click();
    const sortedAt = await new Promise<number>((resolve) => {
      const tick = (): void => {
        const now = performance.now();
        longest = Math.max(longest, now - last);
        last = now;
        frames.push(now - t0);
        const done =
          element.getAttribute("aria-sort") !== before &&
          grid.getAttribute("aria-busy") !== "true";
        if (done) {
          setTimeout(() => {
            resolve(performance.now() - t0);
          }, 0);
        } else {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    });
    return { firstFrame: frames[0] ?? sortedAt, sorted: sortedAt, longest };
  });
}

test("IN6 D4 the table of individuals_10000.xlsx under the tab Individuals file of popgen2.html: the page frozen when a header sorts it", async ({
  page,
  browser,
  browserName,
}) => {
  test.setTimeout(300_000);
  await page.goto("popgen2.html");
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("region", { name: "Individuals file", exact: true })
    .getByRole("button", { name: "Open individuals file…" })
    .click();
  await (
    await chooser
  ).setFiles(join(import.meta.dirname, "fixtures", "individuals_10000.xlsx"));
  await page
    .getByRole("tab", { name: "Individuals file", exact: true })
    .click();
  const table = page.getByRole("grid", {
    name: "The table of individuals_10000.xlsx",
  });
  await expect(table).toBeVisible({ timeout: 120_000 });
  const drawn = await table.getByRole("row").count();
  const header = table.getByRole("columnheader").nth(1);
  // The first sort, which makes the order of the column, is left out, as
  // the first of VS7 D4 is.
  await sortTimes(header);
  const times: SortTimes[] = [];
  for (let k = 0; k < REPEATS; k++) {
    times.push(await sortTimes(header));
  }
  await expect(header).toHaveAttribute("aria-sort", /ascending|descending/u);
  const rows = [
    [
      "the first frame after the click",
      ...stats(
        times.map((t) => t.firstFrame),
        ms,
      ),
    ],
    [
      "the rows sorted on screen",
      ...stats(
        times.map((t) => t.sorted),
        ms,
      ),
    ],
    [
      "the longest stretch with no frame",
      ...stats(
        times.map((t) => t.longest),
        ms,
      ),
    ],
  ];
  // The processor slowed 4 times, as a slower machine than the owner's,
  // which only Chromium can do.
  if (browserName === "chromium") {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const slow: SortTimes[] = [];
    for (let k = 0; k < 3; k++) {
      slow.push(await sortTimes(header));
    }
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
    rows.push(
      [
        "slowed 4 times, the first frame",
        ...stats(
          slow.map((t) => t.firstFrame),
          ms,
        ),
      ],
      [
        "slowed 4 times, the rows sorted",
        ...stats(
          slow.map((t) => t.sorted),
          ms,
        ),
      ],
      [
        "slowed 4 times, the longest stretch",
        ...stats(
          slow.map((t) => t.longest),
          ms,
        ),
      ],
    );
  }
  report(
    "The table of individuals_10000.xlsx under the tab Individuals file of popgen2.html",
    `${machine(browser, browserName)}; ${String(drawn)} rows of the table in the page, its header among them; each time from the click, ${String(REPEATS)} times but the first${browserName === "chromium" ? ", and 3 times with the processor slowed" : ""}`,
    ["a sort by a header", "median", "range"],
    rows,
  );
});

// ---------------------------------------------------------------------
// The time of columnAllows, a metadata file of 10,000 rows and 50
// columns (IP5 D4).

/** The rows and the columns of the metadata file of IP5 D4. */
const ALLOWS_ROWS = 10_000;
const ALLOWS_COLUMNS = 50;

/**
 * A CSV of `ALLOWS_ROWS` rows and `ALLOWS_COLUMNS` columns whose names are
 * those of the VCF of `tableVcf`, s0000 to s9999, the largest table the
 * architecture plans for. After the name and a column of 7 populations,
 * the columns go by fours, so that `columnAllows` walks most of them to
 * the end: decimal numbers with a missing cell in every 50, integers,
 * texts of 13 levels, and two values, yes and no.
 */
function allowsCsv(): string {
  const head = [
    "IID",
    "pop",
    ...Array.from(
      { length: ALLOWS_COLUMNS - 2 },
      (_, j) => `c${String(j).padStart(2, "0")}`,
    ),
  ];
  const cell = (i: number, j: number): string => {
    switch (j % 4) {
      case 0:
        return (i + j) % 50 === 0 ? "" : `${String((i * (j + 3)) % 997)}.25`;
      case 1:
        return String((i * (j + 7)) % 1009);
      case 2:
        return `level${String((i + j) % 13)}`;
      default:
        return (i + j) % 3 === 0 ? "yes" : "no";
    }
  };
  const rows = Array.from({ length: ALLOWS_ROWS }, (_, i) =>
    [
      `s${String(i).padStart(4, "0")}`,
      `p${String(i % 7)}`,
      ...Array.from({ length: ALLOWS_COLUMNS - 2 }, (_, j) => cell(i, j)),
    ].join(","),
  );
  return `${head.join(",")}\n${rows.join("\n")}\n`;
}

/** What `watchFrames` keeps in the page. */
interface Watched {
  /** `performance.now()` at each frame, in its callback. */
  readonly frames: number[];
  /** The tasks over 50 ms, in Chromium, which reports them. */
  readonly longTasks: { readonly start: number; readonly duration: number }[];
  /** The time of the last change of an input, null until one. */
  change: number | null;
}

/** Put in the page before its scripts: the time of every frame, the
    long tasks where the engine reports them, and the last change of an
    input, the pick of a file. */
function watchFrames(): void {
  const watched: Watched = { frames: [], longTasks: [], change: null };
  Object.assign(globalThis, { measureWatched: watched });
  const tick = (): void => {
    watched.frames.push(performance.now());
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.addEventListener(
    "change",
    () => {
      watched.change = performance.now();
    },
    true,
  );
  if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        watched.longTasks.push({
          start: entry.startTime,
          duration: entry.duration,
        });
      }
    }).observe({ type: "longtask" });
  }
}

/** What the page was frozen by, from the last change of an input to now. */
interface Frozen {
  /** From the change to the end, the work of the worker included. */
  readonly total: number;
  /** The longest time between two frames after the change: the longest
      task of the page with the frame that follows it. */
  readonly gap: number;
  /** The longest task over 50 ms after the change, where the engine
      reports them: 0 when none was, null in an engine that does not. */
  readonly longTask: number | null;
}

/** Waits for two frames and 300 ms more, then gives what froze the page
    since the last change of an input. */
async function frozenSinceChange(page: Page): Promise<Frozen> {
  return page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 300);
        });
      });
    });
    const end = performance.now();
    const watched = (globalThis as unknown as { measureWatched: Watched })
      .measureWatched;
    const start = watched.change;
    if (start === null) throw new Error("no input changed");
    const { frames } = watched;
    let gap = 0;
    for (let k = 1; k < frames.length; k++) {
      const before = frames[k - 1] ?? 0;
      const after = frames[k] ?? 0;
      if (after >= start && before <= end) gap = Math.max(gap, after - before);
    }
    const reports =
      PerformanceObserver.supportedEntryTypes.includes("longtask");
    const tasks = watched.longTasks
      .filter((t) => t.start + t.duration >= start)
      .map((t) => t.duration);
    return {
      total: end - start,
      gap,
      longTask: reports ? Math.max(0, ...tasks) : null,
    };
  });
}

/**
 * The time the page is frozen by `columnAllows` (docs/specs/core/project.md,
 * "How it runs"; the plan of stage 4, IP5 D4): a metadata file of 10,000
 * rows and 50 columns read in the Individuals step, with the VCF of its
 * 10,000 individuals loaded, and a project file that holds its read
 * opened, each on a new page `REPEATS` times; and the Individuals step
 * shown after the opening, which finds the answer kept. The CSV is
 * written into MEASURE_DIR, and the project saved there by the first run.
 */
test("IP5 D4 the time of columnAllows: the page frozen by a metadata file of 10,000 rows and 50 columns read, and by a project that holds it opened", async ({
  browser,
  browserName,
}) => {
  test.setTimeout(900_000);
  const vcf = await tableVcf();
  const csv = join(MEASURE_DIR, "allows_10000x50.csv");
  const text = allowsCsv();
  await writeFile(csv, text);
  const size = `${ALLOWS_ROWS.toLocaleString("en-US")} rows, ${String(ALLOWS_COLUMNS)} columns`;
  const project = join(MEASURE_DIR, `allows_${browserName}.popnei.json`);

  const reads: Frozen[] = [];
  for (let k = 0; k < REPEATS; k++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(watchFrames);
    await page.goto("popgen.html#variants");
    await pick(page, "Variants file", vcf);
    await expect(
      page
        .getByRole("region", { name: "Variants file" })
        .getByText(`${TABLE_INDIVIDUALS.toLocaleString("en-US")} individuals`),
    ).toBeVisible({ timeout: 120_000 });
    await goTo(page, "Individuals");
    await pick(page, "Metadata file", csv);
    // In the card: the status region says the same words at the end of
    // the read.
    await expect(
      page
        .getByRole("region", { name: "Metadata file" })
        .getByText(size, { exact: true }),
    ).toBeVisible({ timeout: 60_000 });
    reads.push(await frozenSinceChange(page));
    if (k === 0) {
      await page
        .getByRole("banner")
        .getByRole("button", { name: "Save project" })
        .click();
      const dialog = page.getByRole("dialog", { name: "Save the project" });
      const download = page.waitForEvent("download");
      await dialog.getByRole("button", { name: "Save", exact: true }).click();
      await (await download).saveAs(project);
    }
    await context.close();
  }

  const opens: Frozen[] = [];
  const shown: number[] = [];
  for (let k = 0; k < REPEATS; k++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(watchFrames);
    await page.goto("popgen.html#variants");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Open project…" })
      .click();
    await (await chooser).setFiles(project);
    await expect(page.getByRole("status").last()).toHaveText(/^Opened /, {
      timeout: 60_000,
    });
    opens.push(await frozenSinceChange(page));
    shown.push(
      await frozenBy(
        page
          .getByRole("navigation", { name: "Steps" })
          .getByRole("link", { name: /^Individuals/ }),
      ),
    );
    await expect(
      page.getByRole("heading", { level: 1, name: "Individuals" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("region", { name: "Metadata file" })
        .getByText(size, { exact: true }),
    ).toBeVisible();
    await context.close();
  }

  // columnAllows alone, on the page of the tests that runs it on the same
  // table, which the plan's rule is about: above 100 ms in an engine, it is
  // worked out in the light worker.
  const alone = await (async (): Promise<readonly number[]> => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("e2e/allows.html");
    await page.waitForFunction(() => window.allowsPage !== undefined);
    const times = await page.evaluate(
      ([csvText, repeats]) => {
        const allows = window.allowsPage;
        if (allows === undefined) throw new Error("no allowsPage");
        return allows.time(csvText, repeats);
      },
      [text, REPEATS] as const,
    );
    await context.close();
    return times;
  })();

  const longest = (xs: readonly Frozen[]): [string, string] => {
    const tasks = xs.map((x) => x.longTask);
    return tasks.every((t): t is number => t !== null)
      ? stats(tasks, ms)
      : ["not reported by the engine", ""];
  };
  report(
    `The time of columnAllows: a metadata file of ${size}, ${(text.length / 1e6).toFixed(2)} MB, and a project file of ${(statSync(project).size / 1e6).toFixed(2)} MB that holds its read`,
    `${machine(browser, browserName)}; the VCF of ${TABLE_INDIVIDUALS.toLocaleString("en-US")} individuals and ${String(TABLE_VARIANTS)} variants loaded before the read; each on a new page, ${String(REPEATS)} times; the gap is the longest time between two frames after the pick, the longest task with the frame after it`,
    ["what", "median", "range"],
    [
      [
        "read: the pick to the columns shown and 2 frames and 300 ms more, the worker's read included",
        ...stats(
          reads.map((x) => x.total),
          ms,
        ),
      ],
      [
        "read: the longest gap between two frames",
        ...stats(
          reads.map((x) => x.gap),
          ms,
        ),
      ],
      ["read: the longest task over 50 ms", ...longest(reads)],
      [
        "opening: the pick to Opened and 2 frames and 300 ms more",
        ...stats(
          opens.map((x) => x.total),
          ms,
        ),
      ],
      [
        "opening: the longest gap between two frames",
        ...stats(
          opens.map((x) => x.gap),
          ms,
        ),
      ],
      ["opening: the longest task over 50 ms", ...longest(opens)],
      [
        "the Individuals step shown after the opening, the click to the task after the next frame",
        ...stats(shown, ms),
      ],
      [
        "columnAllows alone, on a copy of the table each time, on e2e/allows.html",
        ...stats(alone, ms),
      ],
    ],
  );
});

// ---------------------------------------------------------------------
// IP6 D6, the times of the PCA.

/** The individuals of the VCFs of the PCA's time and memory: 700, the
    bound of the restart, below which the worker keeps what the PCA left,
    and the four of the plan, the last popnei's limit; or those of
    MEASURE_PCA_INDIVIDUALS, a list such as "700,1000", to check the
    measurement in minutes rather than the 37 of the whole. */
const PCA_INDIVIDUALS: readonly number[] = process.env[
  "MEASURE_PCA_INDIVIDUALS"
]
  ?.split(",")
  .map(Number) ?? [700, 1_000, 2_000, 4_000, 9_381];

/** Their variants, those of the times in node of pca.md, "How it runs". */
const PCA_VARIANTS = 300;

/** The distance of the PCA's own LD filter in the measurement of the
    pruning, in base pairs: the variants of the files of 20,000 variants
    are 1,000 bases apart, so each is compared with the 100 before it. It
    is not a default of the application, which has none. */
const PCA_LD_DIST = 100_000;

/** The gzipped VCF of `n` individuals and 300 variants of `e2e/bigVcf.ts`
    in MEASURE_DIR, written when it is not there. */
async function pcaVcf(n: number): Promise<string> {
  await mkdir(MEASURE_DIR, { recursive: true });
  const name = `pca_${String(n)}x${String(PCA_VARIANTS)}`;
  const path = join(MEASURE_DIR, `${name}.vcf.gz`);
  if (!existsSync(path)) {
    const part = join(MEASURE_DIR, `${name}.part.vcf.gz`);
    await writeBigVcf(part, PCA_VARIANTS, n);
    await rename(part, path);
  }
  return path;
}

/** The options of the PCA in a project file: `method`, its filters of
    missing data and MAF following the Variants step, and its LD filter
    following the step, whose own is off, or its own at r² 0.1 and
    `ldDist`. */
function pcaOptionsJson(
  method: "pca" | "pcoa",
  ldDist: number | null,
): Record<string, unknown> {
  return {
    axes: [1, 2, 3],
    colourBy: null,
    ld: { follow: ldDist === null, maxAllowedR2: 0.1, maxDist: ldDist },
    maf: { follow: true, maxAllowedMaf: 0.95 },
    method,
    missingData: { follow: true, maxAllowedMissingRate: 0.1 },
    view: "3d",
  };
}

/** The project file of a new project with the variants file at
    `variants` loaded, and the metadata file at `pops` with its column
    `pop` chosen when it is given, saved by the application into
    MEASURE_DIR as `name`. */
async function savedProject(
  browser: Browser,
  variants: string,
  name: string,
  pops: string | null = null,
): Promise<string> {
  const path = join(MEASURE_DIR, name);
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto("popgen.html#variants");
    await pick(page, "Variants file", variants);
    await expect(page.getByText(/^[\d,]+ individuals$/)).toBeVisible({
      timeout: 120_000,
    });
    if (pops !== null) {
      await goTo(page, "Individuals");
      await pick(page, "Metadata file", pops);
      await expect(page.getByText(/^All [\d,]+ individuals of /)).toBeVisible();
      await chooseColumn(page, "pop");
    }
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Save project" })
      .click();
    const dialog = page.getByRole("dialog", { name: "Save the project" });
    const download = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await (await download).saveAs(path);
  } finally {
    await context.close();
  }
  return path;
}

/** The project file at `base` with the PCA's options `options`, written
    beside it with `suffix`, so that the measurement sets a PCoA and the
    PCA's own LD filter by the project the application opens, and types
    in no field: it was first taken while the panel of the PCA had no
    options. */
async function projectWithPca(
  base: string,
  suffix: string,
  options: Record<string, unknown>,
): Promise<string> {
  const project = JSON.parse(await readFile(base, "utf8")) as Record<
    string,
    unknown
  >;
  project["analyses"] = [{ analysis: "pca", options }];
  const path = base.replace(/\.popnei\.json$/, `_${suffix}.popnei.json`);
  await writeFile(path, JSON.stringify(project, null, 2));
  return path;
}

/** The project file at `base` with the LD decay's largest distance
    `maxDist`, and its maximum MAF at its default, 0.95, written beside it
    with `suffix`, so that the measurement types in no field: it was
    first taken while the panel of the LD decay had no options. */
async function projectWithLdDecay(
  base: string,
  suffix: string,
  maxDist: number,
): Promise<string> {
  const project = JSON.parse(await readFile(base, "utf8")) as Record<
    string,
    unknown
  >;
  project["analyses"] = [
    { analysis: "ldDecay", options: { maxAllowedMaf: 0.95, maxDist } },
  ];
  const path = base.replace(/\.popnei\.json$/, `_${suffix}.popnei.json`);
  await writeFile(path, JSON.stringify(project, null, 2));
  return path;
}

/** What one PCA through the application gave. */
interface PcaRun {
  /** The answer that ended the request, or "the tab closed". */
  readonly answer: string;
  /** From the run posted to the calculation worker to its answer; `null`
      when the tab closed. */
  readonly runMs: number | null;
  /** The engine's memory, the footprints of its processes summed: after
      the load, before the Run; the largest while the PCA ran; and 3 s
      after its answer, after the restart when there is one. */
  readonly before: number | null;
  readonly peak: number | null;
  readonly after: number | null;
  /** Whether a new calculation worker was started after the answer. */
  readonly restarted: boolean;
  /** Of a result of the PCA, the variants it used. */
  readonly numVarsUsed: number | null;
}

/** Opens the project file at `project` on a new page, loads the variants
    file at `variants` that it asks for, and runs the PCA from its panel
    in the Analyses step, with the memory of the engine sampled. */
async function pcaOnce(
  browser: Browser,
  browserName: string,
  project: string,
  variants: string,
  timeout: number,
  pauseMs: number,
): Promise<PcaRun> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const closed = { crashed: false };
  page.on("crash", () => {
    closed.crashed = true;
  });
  const sampler = sampleMemory(browser, browserName, pauseMs);
  try {
    await page.addInitScript(instrument);
    await page.goto("popgen.html#variants");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Open project…" })
      .click();
    await (await chooser).setFiles(project);
    await expect(page.getByRole("status").last()).toHaveText(/^Opened /, {
      timeout: 60_000,
    });
    await pick(page, "Variants file", variants);
    await expect(
      page
        .getByRole("region", { name: "Variants file" })
        .getByText(/^[\d,]+ individuals$/),
    ).toBeVisible({ timeout: 120_000 });
    await goTo(page, "Analyses");
    const region = page.getByRole("region", { name: "Principal components" });
    // The memory settles after the load before it is taken.
    await page.waitForTimeout(2000);
    const before = (await logOf(page)).length;
    const clickedAt = Date.now();
    await region.getByRole("button", { name: "Run", exact: true }).click();
    let ended: readonly Logged[] = [];
    try {
      await expect
        .poll(
          async () => {
            if (closed.crashed) return true;
            ended = (await logOf(page)).slice(before).filter(isCalc);
            return ended.some((l) => l.event === "in" && ENDS.has(l.kind));
          },
          { timeout, intervals: [200] },
        )
        .toBe(true);
    } catch (error) {
      if (!closed.crashed && !/crash|closed/i.test(String(error))) throw error;
      closed.crashed = true;
    }
    const answeredAt = Date.now();
    if (closed.crashed) {
      return {
        answer: "the tab closed",
        runMs: null,
        before: null,
        peak: null,
        after: null,
        restarted: false,
        numVarsUsed: null,
      };
    }
    const run = ended.find((l) => l.event === "out" && l.kind === "run");
    const answer = ended.find((l) => l.event === "in" && ENDS.has(l.kind));
    if (run === undefined || answer === undefined) {
      throw new Error("no run, or no answer to it, in the log of the worker");
    }
    const worker = answer.worker;
    // The pass over the file is not timed apart: popnei tells a progress
    // at each range of 4 MiB it reads and at the end of the run, after the
    // decomposition, and the VCFs of 300 variants are under 4 MiB, so no
    // progress marks the end of their pass.
    await expect(region.getByRole("progressbar")).toHaveCount(0, {
      timeout: 60_000,
    });
    // The restart, when there is one, comes after the answer: waited for
    // up to 15 s, and the memory taken 3 s after it.
    const startedAgain = async (): Promise<boolean> =>
      (await logOf(page)).some(
        (l) => isCalc(l) && l.event === "start" && l.worker > worker,
      );
    const restarted = await expect
      .poll(startedAgain, { timeout: 15_000, intervals: [100] })
      .toBe(true)
      .then(
        () => true,
        () => false,
      );
    await page.waitForTimeout(3000);
    await sampler.stop();
    const at = (from: number, to: number): readonly Sample[] =>
      sampler.samples.filter((s) => s.t >= from && s.t <= to);
    const beforeRun = at(0, clickedAt).at(-1)?.total ?? null;
    const during = at(clickedAt, answeredAt).map((s) => s.total);
    return {
      answer: answer.kind,
      runMs: answer.t - run.t,
      before: beforeRun,
      peak: during.length === 0 ? null : Math.max(...during),
      after: sampler.samples.at(-1)?.total ?? null,
      restarted,
      numVarsUsed: answer.numVarsUsed ?? null,
    };
  } finally {
    await sampler.stop();
    await context.close().catch(() => undefined);
  }
}

/** The load of the machine, `uptime`'s averages of 1, 5 and 15 minutes. */
function machineLoad(): string {
  const text = execFileSync("uptime", [], { encoding: "utf8" });
  return /load averages?: (.*)$/m.exec(text.trim())?.[1] ?? text.trim();
}

test.describe("IP6 D6 the times of the PCA", () => {
  test("IP6 D6 the pruning inside a PCA: panel.nei and the files of 20,000 variants, with and without the PCA's own LD filter", async ({
    browser,
    browserName,
  }) => {
    test.setTimeout(3_600_000);
    const { vcf, nei } = await bigFiles();
    const files: readonly (readonly [string, string])[] = [
      [
        "panel.nei, 200 individuals, 1,200 variants",
        join(FIXTURES, "panel.nei"),
      ],
      ["big.nei, 1,000 individuals, 20,000 variants, 19,161,194 bytes", nei],
      ["big.vcf, 1,000 individuals, 20,000 variants, 80,692,954 bytes", vcf],
    ];
    const loadBefore = machineLoad();
    const rows: string[][] = [];
    for (const [what, file] of files) {
      const name = file.split("/").at(-1) ?? "file";
      const base = await savedProject(
        browser,
        file,
        `pca_prune_${browserName}_${name.replace(/\./g, "_")}.popnei.json`,
      );
      const without = await projectWithPca(
        base,
        "noLd",
        pcaOptionsJson("pca", null),
      );
      const withLd = await projectWithPca(
        base,
        "ld",
        pcaOptionsJson("pca", PCA_LD_DIST),
      );
      const times: Record<"without" | "with", number[]> = {
        without: [],
        with: [],
      };
      const used: Record<"without" | "with", number | null> = {
        without: null,
        with: null,
      };
      for (let k = 0; k < REPEATS; k++) {
        for (const [key, project] of [
          ["without", without],
          ["with", withLd],
        ] as const) {
          const ran = await pcaOnce(
            browser,
            browserName,
            project,
            file,
            600_000,
            250,
          );
          expect(ran.answer).toBe("result");
          expect(ran.before).toBeGreaterThan(0);
          times[key].push(ran.runMs ?? Number.NaN);
          used[key] = ran.numVarsUsed;
        }
      }
      // The PCA's own LD filter pruned: fewer variants used with it.
      expect(used.with).not.toBeNull();
      expect(used.without).not.toBeNull();
      expect(used.with ?? Infinity).toBeLessThan(used.without ?? 0);
      const noLd = median(times.without);
      const ld = median(times.with);
      rows.push([
        what,
        String(used.without),
        stats(times.without, ms).join(", "),
        String(used.with),
        stats(times.with, ms).join(", "),
        ms(ld - noLd),
        `${((100 * (ld - noLd)) / ld).toFixed(0)}%`,
      ]);
    }
    report(
      "IP6 D6 the pruning inside a PCA",
      `${machine(browser, browserName)}, macOS ${macOs()}; load averages ${loadBefore} before and ${machineLoad()} after; the filters of a new project, the missing data at 0.1; the PCA's own LD filter at r² 0.1 and ${PCA_LD_DIST.toLocaleString("en-US")} bp; each PCA run from its panel on a new page after the project opened and the file loaded, ${String(REPEATS)} times, alternating; the time from the run posted to the calculation worker to its result; the difference is a lower bound of the pruning, since the PCA with the filter also calculates over fewer variants`,
      [
        "file",
        "variants used without the LD filter",
        "the PCA without it: median, range",
        "variants used with it",
        "the PCA with it: median, range",
        "the pruning, at least: the difference of the medians",
        "its share of the PCA with it",
      ],
      rows,
    );
  });

  test("IP6 D6 the time and the memory of the tab for a PCA and a PCoA of 700 to 9,381 individuals", async ({
    browser,
    browserName,
  }) => {
    test.setTimeout(4 * 3_600_000);
    const loadBefore = machineLoad();
    const rows: string[][] = [];
    for (const n of PCA_INDIVIDUALS) {
      const vcf = await pcaVcf(n);
      const base = await savedProject(
        browser,
        vcf,
        `pca_${String(n)}_${browserName}.popnei.json`,
      );
      for (const method of ["pca", "pcoa"] as const) {
        const project = await projectWithPca(
          base,
          method,
          pcaOptionsJson(method, null),
        );
        // The runs of seconds are repeated, and their memory taken more
        // often; those of minutes are run once.
        const small = n <= 2_000;
        const runs: PcaRun[] = [];
        for (let k = 0; k < (small ? REPEATS : 1); k++) {
          runs.push(
            await pcaOnce(
              browser,
              browserName,
              project,
              vcf,
              1_800_000,
              small ? 20 : 250,
            ),
          );
        }
        for (const ran of runs) {
          // Only the largest may close the tab, which is recorded and
          // fails nothing. Otherwise each run gives a result, the engine's
          // memory was taken, and the worker is started again after more
          // than PCA_RESTART_INDIVIDUALS, 700, and not at 700.
          if (ran.answer === "the tab closed" && n === 9_381) continue;
          expect(ran.answer).toBe("result");
          expect(ran.before).toBeGreaterThan(0);
          expect(ran.restarted).toBe(n > 700);
        }
        const cell = (
          of: (r: PcaRun) => number | null,
          unit: (x: number) => string,
        ): string => {
          const xs = runs.map(of).filter((x): x is number => x !== null);
          if (xs.length === 0) return "";
          if (xs.length === 1) return unit(xs[0] ?? Number.NaN);
          const [mid, range] = stats(xs, unit);
          return `${mid} (${range})`;
        };
        const seconds = (x: number): string => `${(x / 1000).toFixed(2)} s`;
        rows.push([
          n.toLocaleString("en-US"),
          method === "pca" ? "PCA" : "PCoA",
          String(runs.length),
          [...new Set(runs.map((r) => r.answer))].join(", "),
          cell((r) => r.runMs, seconds),
          cell((r) => r.before, mb),
          cell((r) => r.peak, mb),
          cell(
            (r) =>
              r.peak === null || r.before === null ? null : r.peak - r.before,
            mb,
          ),
          cell((r) => r.after, mb),
          `${String(runs.filter((r) => r.restarted).length)} of ${String(runs.length)}`,
        ]);
        process.stdout.write(`${rows.at(-1)?.join(" | ") ?? ""}\n`);
      }
    }
    report(
      "IP6 D6 the time and the memory of the tab for a PCA and a PCoA",
      `${machine(browser, browserName)}, macOS ${macOs()}; load averages ${loadBefore} before and ${machineLoad()} after; gzipped VCFs of ${String(PCA_VARIANTS)} variants of e2e/bigVcf.ts, the filters of a new project; each run from the panel on a new page after the project opened and the file loaded, ${String(REPEATS)} times up to 2,000 individuals, the median and the range, and once above; the time is the run whole, the pass over the file with the calculation, which popnei's progress does not tell apart in files under 4 MiB; the memory is the footprints of the engine's processes summed, taken every 20 ms and the time of a sample up to 2,000 individuals and every 250 ms above`,
      [
        "individuals",
        "method",
        "runs",
        "answer",
        "run posted to answer",
        "memory before the Run",
        "largest during it",
        "grown by",
        "3 s after the answer or the restart",
        "worker started again",
      ],
      rows,
    );
  });
});

// ---------------------------------------------------------------------
// PA2 D7, the memory and the time of the LD decay.

/** The answers that end a request of the LD decay: those of every
    request, and a worker that stopped with no answer. */
const LD_ENDS = new Set([...ENDS, "workerError"]);

/** How the end of the pass is found in the memory of the engine. When the
    pass has ended popnei takes each population in turn: it copies the
    distances that hold a pair into three arrays of 24 bytes a distance,
    then fits the curve over them, which reads and takes no memory
    (`calc_ld_and_dist` of popnei's crates/popnei/src/ld/dist.rs;
    ldDecay.md, "Why it cannot run"). So the memory rises once for each
    population after the pass, tens to hundreds of MB at the lock, and is
    flat between: a rise is a run of samples each more than STEP_RISE
    above the one before, of more than FIT_RISE in all, and the pass ended
    at the first of the last rises, one for each population. It is not
    told apart at distances whose copies are a few MB. */
const STEP_RISE = 2e6;
const FIT_RISE = 20e6;

/** The distances of the dense file, from MEASURE_LD_DENSE, a list such
    as "2000000", to check the measurement in minutes; those of the plan
    otherwise. */
const LD_DENSE_DISTS: readonly number[] = process.env["MEASURE_LD_DENSE"]
  ?.split(",")
  .map(Number) ?? [2_000_000, 4_000_000, 8_333_333];

/** The gzipped VCF of `e2e/bigVcf.ts` named `name` in MEASURE_DIR, of
    `numVars` variants of `numIndividuals` at the positions `where`,
    written when it is not there, and the CSV of its individuals in three
    populations beside it. */
async function ldVcf(
  name: string,
  numVars: number,
  numIndividuals: number,
  where: VcfPositions,
): Promise<{ vcf: string; pops: string }> {
  await mkdir(MEASURE_DIR, { recursive: true });
  const vcf = join(MEASURE_DIR, `${name}.vcf.gz`);
  if (!existsSync(vcf)) {
    const part = join(MEASURE_DIR, `${name}.part.vcf.gz`);
    await writeBigVcf(part, numVars, numIndividuals, where);
    await rename(part, vcf);
  }
  const pops = join(MEASURE_DIR, `${name}_pops.csv`);
  await writeFile(pops, bigVcfPopsCsv(numIndividuals));
  return { vcf, pops };
}

/** What one LD decay through the application gave. */
interface LdRun {
  /** The answer that ended the request, "result", "refused", "crashed"
      or "workerError", or "the tab closed". */
  readonly answer: string;
  /** The text of the panel after an answer that is not a result. */
  readonly words: string;
  /** From the run posted to the calculation worker to its answer, or from
      the Run to the tab closed. */
  readonly runMs: number | null;
  /** The engine's memory, the footprints of its processes summed: after
      the load, before the Run; the largest while the LD decay ran; the
      last sample before the answer, while the worker still held what
      popnei took, which the tab would keep without the restart; and 3 s
      after the restart. */
  readonly before: number | null;
  readonly peak: number | null;
  readonly atAnswer: number | null;
  readonly after: number | null;
  /** Whether a new calculation worker was started after the answer. */
  readonly restarted: boolean;
  /** The time after the pass, which tells no progress: from the first
      sample of the copy of the counts of the first population to the
      answer, `null` when the rises of the copies were not found. */
  readonly fitMs: number | null;
  /** The memory the rises of the copies gained, all populations. */
  readonly riseBytes: number | null;
  /** The load average of 1 minute of the machine at the Run. */
  readonly load: number;
}

/** Opens the project file at `project` on a new page, loads the variants
    file at `variants` that it asks for, and runs the LD decay from its
    panel in the Analyses step, with the memory of the
    engine sampled every `pauseMs` and the time of a sample; the pass
    ended at the first of the last `numPops` rises of the memory. */
async function ldDecayOnce(
  browser: Browser,
  browserName: string,
  project: string,
  variants: string,
  timeout: number,
  pauseMs: number,
  numPops: number,
): Promise<LdRun> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const closed = { crashed: false, at: 0 };
  page.on("crash", () => {
    closed.crashed = true;
    closed.at = Date.now();
  });
  const sampler = sampleMemory(browser, browserName, pauseMs);
  try {
    await page.addInitScript(instrument);
    await page.goto("popgen.html#variants");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("banner")
      .getByRole("button", { name: "Open project…" })
      .click();
    await (await chooser).setFiles(project);
    await expect(page.getByRole("status").last()).toHaveText(/^Opened /, {
      timeout: 60_000,
    });
    await pick(page, "Variants file", variants);
    await expect(
      page
        .getByRole("region", { name: "Variants file" })
        .getByText(/^[\d,]+ individuals$/),
    ).toBeVisible({ timeout: 300_000 });
    await goTo(page, "Analyses");
    const region = page.getByRole("region", { name: "LD decay", exact: true });
    // The memory settles after the load before it is taken.
    await page.waitForTimeout(2000);
    const logged = (await logOf(page)).length;
    const load = loadavg()[0] ?? Number.NaN;
    const clickedAt = Date.now();
    await region.getByRole("button", { name: "Run", exact: true }).click();
    let ended: readonly Logged[] = [];
    try {
      await expect
        .poll(
          async () => {
            if (closed.crashed) return true;
            ended = (await logOf(page)).slice(logged).filter(isCalc);
            return ended.some((l) => l.event === "in" && LD_ENDS.has(l.kind));
          },
          { timeout, intervals: [500] },
        )
        .toBe(true);
    } catch (error) {
      if (!closed.crashed && !/crash|closed/i.test(String(error))) throw error;
      closed.crashed = true;
      closed.at = closed.at === 0 ? Date.now() : closed.at;
    }
    const at = (from: number, to: number): readonly Sample[] =>
      sampler.samples.filter((s) => s.t >= from && s.t <= to);
    const beforeRun = at(0, clickedAt).at(-1)?.total ?? null;
    if (closed.crashed) {
      await sampler.stop();
      const during = at(clickedAt, closed.at).map((s) => s.total);
      return {
        answer: "the tab closed",
        words: "",
        runMs: closed.at - clickedAt,
        before: beforeRun,
        peak: during.length === 0 ? null : Math.max(...during),
        atAnswer: null,
        after: null,
        restarted: false,
        fitMs: null,
        riseBytes: null,
        load,
      };
    }
    const run = ended.find((l) => l.event === "out" && l.kind === "run");
    const answer = ended.find((l) => l.event === "in" && LD_ENDS.has(l.kind));
    if (run === undefined || answer === undefined) {
      throw new Error("no run, or no answer to it, in the log of the worker");
    }
    await expect(region.getByRole("progressbar")).toHaveCount(0, {
      timeout: 60_000,
    });
    const words =
      answer.kind === "result"
        ? ""
        : (await region.innerText()).replace(/\s+/g, " ").trim();
    // The restart comes after the answer: waited for up to 15 s, and the
    // memory taken 3 s after it.
    const startedAgain = async (): Promise<boolean> =>
      (await logOf(page)).some(
        (l) => isCalc(l) && l.event === "start" && l.worker > answer.worker,
      );
    const restarted = await expect
      .poll(startedAgain, { timeout: 15_000, intervals: [100] })
      .toBe(true)
      .then(
        () => true,
        () => false,
      );
    await page.waitForTimeout(3000);
    await sampler.stop();
    const during = at(clickedAt, answer.wall);
    const totals = during.map((s) => s.total);
    const total = (i: number): number => during[i]?.total ?? 0;
    // The rises: runs of samples each more than STEP_RISE above the one
    // before, from the first sample above to the last, of more than
    // FIT_RISE in all.
    const rises: { readonly first: number; readonly bytes: number }[] = [];
    for (let i = 1; i < during.length; i += 1) {
      if (total(i) - total(i - 1) <= STEP_RISE) continue;
      let last = i;
      while (
        last + 1 < during.length &&
        total(last + 1) - total(last) > STEP_RISE
      ) {
        last += 1;
      }
      const bytes = total(last) - total(i - 1);
      if (bytes > FIT_RISE) rises.push({ first: i, bytes });
      i = last;
    }
    const copies = rises.length >= numPops ? rises.slice(-numPops) : null;
    const passEnd = copies?.[0]?.first;
    return {
      answer: answer.kind,
      words,
      runMs: answer.t - run.t,
      before: beforeRun,
      peak: totals.length === 0 ? null : Math.max(...totals),
      atAnswer: during.at(-1)?.total ?? null,
      after: sampler.samples.at(-1)?.total ?? null,
      restarted,
      fitMs:
        passEnd === undefined ? null : answer.wall - (during[passEnd]?.t ?? 0),
      riseBytes:
        copies === null ? null : copies.reduce((sum, r) => sum + r.bytes, 0),
      load,
    };
  } finally {
    await sampler.stop();
    await context.close().catch(() => undefined);
  }
}

/** The cells of one run of the LD decay in a table: its answer, the time,
    the memory, the time after the pass and the rises of the copies when
    `withFit`, and the load; "" for what a closed tab left unmeasured. */
function ldCells(r: LdRun, withFit: boolean): string[] {
  const seconds = (x: number | null): string =>
    x === null ? "" : `${(x / 1000).toFixed(1)} s`;
  const size = (x: number | null): string => (x === null ? "" : mb(x));
  return [
    r.words === "" ? r.answer : `${r.answer}: "${r.words.slice(0, 160)}"`,
    seconds(r.runMs),
    size(r.before),
    size(r.peak),
    size(r.peak === null || r.before === null ? null : r.peak - r.before),
    size(r.atAnswer),
    size(r.after),
    ...(withFit ? [seconds(r.fitMs), size(r.riseBytes)] : []),
    r.load.toFixed(1),
  ];
}

/** The heads of the columns of `ldCells`. */
function ldColumns(withFit: boolean): readonly string[] {
  return [
    "answer",
    "run posted to answer",
    "memory before the Run",
    "largest during it",
    "grown by",
    "at the answer, the worker still holding it: without the restart",
    "3 s after the restart: with it",
    ...(withFit
      ? [
          "after the pass, the copies and the fits: from the first copy to the answer",
          "the memory the copies took",
        ]
      : []),
    "load average of 1 minute at the Run",
  ];
}

/** That the run `r` measured a number in every column of `ldCells`: every
    one after a result, the fit only when `withFit`, all but the fit after
    a refusal or a crash, and the time and the memory before and during
    it after a tab that closed. */
function expectMeasured(r: LdRun, what: string, withFit: boolean): void {
  const wanted: readonly (keyof LdRun)[] =
    r.answer === "the tab closed"
      ? ["runMs", "before", "peak", "load"]
      : [
          "runMs",
          "before",
          "peak",
          "atAnswer",
          "after",
          "load",
          ...(withFit && r.answer === "result"
            ? (["fitMs", "riseBytes"] as const)
            : []),
        ];
  for (const key of wanted) {
    const value = r[key];
    expect(
      typeof value === "number" && Number.isFinite(value),
      `${what}: ${key}`,
    ).toBe(true);
  }
  expect(r.before ?? 0, `${what}: the memory before`).toBeGreaterThan(0);
  expect(r.peak ?? 0, `${what}: the largest memory`).toBeGreaterThan(0);
  if (r.answer !== "the tab closed") {
    expect(r.restarted, `${what}: the worker started again`).toBe(true);
  }
}

/** The head of a table of the LD decay: the engine, the machine, the
    load, the file `what` and how the memory was sampled. */
function ldHead(
  browser: Browser,
  browserName: string,
  loadBefore: string,
  what: string,
  pauseMs: number,
  withFit: boolean,
): string {
  const fit = withFit
    ? `; after the pass popnei copies the counts of each population in turn and fits its curve, with no progress, and the memory rises once for each population: a rise is a run of samples each more than ${mb(STEP_RISE)} above the one before, of more than ${mb(FIT_RISE)} in all, and the time after the pass is from the first sample of the first of the last rises, one for each population, to the answer`
    : "";
  return `${machine(browser, browserName)}, macOS ${macOs()}; load averages ${loadBefore} before and ${machineLoad()} after; ${what}; each LD decay run from its panel on a new page, after the project file that sets its largest distance opened and the file loaded; the memory is the footprints of the engine's processes summed, a sample every ${String(pauseMs)} ms and the time of a sample${fit}`;
}

test.describe("PA2 D7 the memory and the time of the LD decay", () => {
  test("PA2 D7 the growth of the engine and its size 3 s after an LD decay, with the restart and without it: 20,000 variants every 1,000 bp and 1,000 individuals in three populations, at 100,000 and 1,000,000 bp", async ({
    browser,
    browserName,
  }) => {
    test.setTimeout(2 * 3_600_000);
    const pauseMs = 20;
    const { vcf, pops } = await ldVcf("ld_1000x20000", 20_000, 1_000, {
      every: 1000,
    });
    const base = await savedProject(
      browser,
      vcf,
      `ld_1000x20000_${browserName}.popnei.json`,
      pops,
    );
    const loadBefore = machineLoad();
    const rows: string[][] = [];
    for (const maxDist of [100_000, 1_000_000]) {
      const project = await projectWithLdDecay(base, String(maxDist), maxDist);
      for (let k = 0; k < REPEATS; k++) {
        const ran = await ldDecayOnce(
          browser,
          browserName,
          project,
          vcf,
          1_800_000,
          pauseMs,
          3,
        );
        expect(ran.answer).toBe("result");
        expectMeasured(
          ran,
          `${String(maxDist)} bp, run ${String(k + 1)}`,
          false,
        );
        rows.push([
          maxDist.toLocaleString("en-US"),
          String(k + 1),
          ...ldCells(ran, false),
        ]);
        process.stdout.write(`${rows.at(-1)?.join(" | ") ?? ""}\n`);
      }
    }
    report(
      "PA2 D7 the growth of the engine and its size after an LD decay, with the restart and without it",
      ldHead(
        browser,
        browserName,
        loadBefore,
        "a gzipped VCF of e2e/bigVcf.ts, 20,000 variants every 1,000 bp on one chromosome, 1,000 individuals in three populations of 334, 333 and 333, the filters of a new project, the missing data at 0.1",
        pauseMs,
        false,
      ),
      ["largest distance, bp", "run", ...ldColumns(false)],
      rows,
    );
  });

  test("PA2 D7 at the lock of 1 GB of counts: 25,000,000 bp for one population and 8,333,333 for three, on 20,000 variants of 100 individuals at positions drawn at random over 26 Mb", async ({
    browser,
    browserName,
  }) => {
    test.setTimeout(3 * 3_600_000);
    const pauseMs = 100;
    const { vcf, pops } = await ldVcf("ld_lock_100x20000", 20_000, 100, {
      randomOver: 26_000_000,
    });
    const cases = [
      {
        what: "one population, 25,000,000 bp",
        base: await savedProject(
          browser,
          vcf,
          `ld_lock_one_${browserName}.popnei.json`,
        ),
        maxDist: 25_000_000,
        numPops: 1,
      },
      {
        what: "three populations, 8,333,333 bp",
        base: await savedProject(
          browser,
          vcf,
          `ld_lock_three_${browserName}.popnei.json`,
          pops,
        ),
        maxDist: 8_333_333,
        numPops: 3,
      },
    ];
    const loadBefore = machineLoad();
    const rows: string[][] = [];
    for (const c of cases) {
      const project = await projectWithLdDecay(
        c.base,
        String(c.maxDist),
        c.maxDist,
      );
      const ran = await ldDecayOnce(
        browser,
        browserName,
        project,
        vcf,
        3_600_000,
        pauseMs,
        c.numPops,
      );
      // A tab that closes is the outcome of its case, and the next case
      // is run.
      expectMeasured(ran, c.what, true);
      rows.push([
        c.what,
        ran.answer === "the tab closed" ? "no" : "yes",
        ...ldCells(ran, true),
      ]);
      process.stdout.write(`${rows.at(-1)?.join(" | ") ?? ""}\n`);
    }
    report(
      "PA2 D7 at the lock of 1 GB of counts",
      ldHead(
        browser,
        browserName,
        loadBefore,
        "a gzipped VCF of e2e/bigVcf.ts, 20,000 variants on one chromosome at positions drawn at random from 1 to 26,000,000, 100 individuals, with no metadata file, one population, in the first case, and in three populations of 34, 33 and 33 in the second, the filters of a new project, the missing data at 0.1",
        pauseMs,
        true,
      ),
      ["case", "the tab held", ...ldColumns(true)],
      rows,
    );
  });

  test("PA2 D7 the dense file: 1,000 individuals in three populations, a variant every 100 bp, at 2,000,000, 4,000,000 and 8,333,333 bp until a tab closes or popnei refuses", async ({
    browser,
    browserName,
  }) => {
    test.setTimeout(10 * 3_600_000);
    const pauseMs = 1000;
    const loadBefore = machineLoad();
    const rows: string[][] = [];
    for (const maxDist of LD_DENSE_DISTS) {
      // The file reaches 500,000 bp beyond the distance, so that the pass
      // holds a whole distance of variants for its last 5,000.
      const numVars = Math.ceil(maxDist / 100) + 5_000;
      const name = `ld_dense_1000x${String(numVars)}`;
      const { vcf, pops } = await ldVcf(name, numVars, 1_000, { every: 100 });
      const base = await savedProject(
        browser,
        vcf,
        `${name}_${browserName}.popnei.json`,
        pops,
      );
      const project = await projectWithLdDecay(base, String(maxDist), maxDist);
      const ran = await ldDecayOnce(
        browser,
        browserName,
        project,
        vcf,
        6 * 3_600_000,
        pauseMs,
        3,
      );
      // The time after the pass is taken at the lock, above: here the
      // blocks of variants read make rises too, and a sample is taken
      // every second.
      expectMeasured(ran, `${String(maxDist)} bp`, false);
      rows.push([
        maxDist.toLocaleString("en-US"),
        numVars.toLocaleString("en-US"),
        ran.answer === "the tab closed" ? "no" : "yes",
        ...ldCells(ran, false),
      ]);
      process.stdout.write(`${rows.at(-1)?.join(" | ") ?? ""}\n`);
      if (ran.answer !== "result") break;
    }
    report(
      "PA2 D7 the dense file",
      ldHead(
        browser,
        browserName,
        loadBefore,
        "gzipped VCFs of e2e/bigVcf.ts, a variant every 100 bp on one chromosome up to 500,000 bp beyond the largest distance, 1,000 individuals in three populations of 334, 333 and 333, the filters of a new project, the missing data at 0.1; the distances tried from the smallest, stopping at the first that closes the tab or is not a result",
        pauseMs,
        false,
      ),
      [
        "largest distance, bp",
        "variants of the file",
        "the tab held",
        ...ldColumns(false),
      ],
      rows,
    );
  });
});

// ---------------------------------------------------------------------
// The time of the distances between populations (PA5 D3).

/** The CSV of the 200 individuals of panel.nei in twenty populations of
    ten, in the order of panel_pops.csv: q0 its first ten, q1 the next. */
function panelTwentyPops(): string {
  const individuals = readFileSync(join(FIXTURES, "panel_pops.csv"), "utf8")
    .split("\n")
    .slice(1)
    .filter((l) => l !== "")
    .map((l) => l.split(",")[0] ?? "");
  expect(individuals).toHaveLength(200);
  const rows = individuals.map(
    (individual, i) => `${individual},q${String(Math.floor(i / 10))}\n`,
  );
  return `IID,pop\n${rows.join("")}`;
}

/** One case of the distances: a variants file, its metadata file, the
    column of the populations, and the minimum typed before the Run, when
    the default of 20 would leave populations out. */
interface PopDistsCase {
  readonly file: string;
  /** The variants file, as the table names it. */
  readonly what: string;
  readonly pops: string;
  readonly column: string;
  readonly numPops: number;
  readonly minimum: string | null;
}

/** What one run of the distances gave. */
interface PopDistsRun {
  /** The answer that ended the request. */
  readonly answer: string;
  /** From the run posted to the calculation worker to its answer. */
  readonly runMs: number;
  /** From the answer to the table of the pairs seen, which the test
      polls, so to within the time of a poll. */
  readonly drawnMs: number;
}

/** Runs the distances once, on a new page with the case loaded, and
    times the request to the calculation worker. */
async function popDistsOnce(
  browser: Browser,
  c: PopDistsCase,
): Promise<PopDistsRun> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await load(page, c.file, c.pops, c.column);
    await goTo(page, "Analyses");
    const distances = page.getByRole("region", {
      name: "Distances between populations",
      exact: true,
    });
    if (c.minimum !== null) {
      const field = distances.getByLabel(
        "Individuals with a called genotype needed in each population, per variant",
      );
      await field.fill(c.minimum);
      await field.press("Enter");
      await expect(field).toHaveValue(c.minimum);
    }
    await expect(
      distances.getByText(new RegExp(`^${String(c.numPops)} populations: `)),
    ).toBeVisible();
    const before = (await logOf(page)).length;
    await distances.getByRole("button", { name: "Run", exact: true }).click();
    let ended: readonly Logged[] = [];
    await expect
      .poll(
        async () => {
          ended = (await logOf(page)).slice(before).filter(isCalc);
          return ended.some((l) => l.event === "in" && ENDS.has(l.kind));
        },
        { timeout: 600_000, intervals: [50] },
      )
      .toBe(true);
    const run = ended.find((l) => l.event === "out" && l.kind === "run");
    const answer = ended.find((l) => l.event === "in" && ENDS.has(l.kind));
    if (run === undefined || answer === undefined) {
      throw new Error("no run, or no answer to it, in the log of the worker");
    }
    await expect(distances.getByRole("table")).toBeVisible({
      timeout: 60_000,
    });
    const drawn = await page.evaluate(() => performance.now());
    // Every pair of the populations is a row of the table.
    await expect(distances.getByRole("rowheader")).toHaveCount(
      (c.numPops * (c.numPops - 1)) / 2,
    );
    return {
      answer: answer.kind,
      runMs: answer.t - run.t,
      drawnMs: drawn - answer.t,
    };
  } finally {
    await context.close();
  }
}

test("PA5 D3 the time of the distances between populations: panel.nei and the .nei file of 19,161,178 bytes, with three populations and with twenty", async ({
  browser,
  browserName,
}) => {
  test.setTimeout(3_600_000);
  const big = await bigFiles();
  const bigTwenty = join(MEASURE_DIR, "big_pops20.csv");
  await writeFile(bigTwenty, bigVcfPopsCsv(1000, 50));
  const panelTwenty = join(MEASURE_DIR, "panel_pops20.csv");
  await writeFile(panelTwenty, panelTwentyPops());
  const panelNei = join(FIXTURES, "panel.nei");
  const panelWhat = "panel.nei, 1,200 variants of 200 individuals";
  const bigWhat = `.nei file of ${BIG_NEI_BYTES.toLocaleString("en-US")} bytes, 20,000 variants of 1,000 individuals`;
  const cases: readonly PopDistsCase[] = [
    {
      file: panelNei,
      what: panelWhat,
      pops: join(FIXTURES, "panel_pops.csv"),
      column: "popcat",
      numPops: 3,
      minimum: null,
    },
    {
      file: panelNei,
      what: panelWhat,
      pops: panelTwenty,
      column: "pop",
      numPops: 20,
      minimum: "10",
    },
    {
      file: big.nei,
      what: bigWhat,
      pops: big.pops,
      column: "pop",
      numPops: 3,
      minimum: null,
    },
    {
      file: big.nei,
      what: bigWhat,
      pops: bigTwenty,
      column: "pop",
      numPops: 20,
      minimum: null,
    },
  ];
  const loadBefore = machineLoad();
  const rows: string[][] = [];
  for (const c of cases) {
    const runs: PopDistsRun[] = [];
    for (let k = 0; k < REPEATS; k++) {
      const ran = await popDistsOnce(browser, c);
      expect(ran.answer).toBe("result");
      runs.push(ran);
    }
    const times = runs.map((r) => r.runMs);
    const drawn = runs.map((r) => r.drawnMs);
    // A number in every column: each time measured, a request that took
    // no time being one that was not timed.
    for (const x of [...times, ...drawn]) {
      expect(Number.isFinite(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
    }
    for (const x of times) expect(x).toBeGreaterThan(0);
    rows.push([
      c.what,
      String(c.numPops),
      String((c.numPops * (c.numPops - 1)) / 2),
      c.minimum ?? "20",
      ...stats(times, ms),
      ...stats(drawn, ms),
    ]);
    process.stdout.write(`${rows.at(-1)?.join(" | ") ?? ""}\n`);
  }
  for (const r of rows) {
    for (const cell of r) expect(cell).toMatch(/\d/);
  }
  report(
    "PA5 D3 the time of the distances between populations",
    `${machine(browser, browserName)}; the load of the machine, uptime's averages of 1, 5 and 15 minutes, ${loadBefore} before and ${machineLoad()} after; ${String(REPEATS)} runs of each case, each on a new page just after the load, the filters of a new project, the missing data at 0.1; the three populations of panel.nei are those of popcat, 48, 84 and 68 individuals, and those of the large file 334, 333 and 333; the twenty are of 10 and of 50 individuals, in the order of the file`,
    [
      "variants file",
      "populations",
      "pairs",
      "minimum of individuals",
      "run to answer, median",
      "run to answer, range",
      "answer to table seen, median",
      "answer to table seen, range",
    ],
    rows,
  );
});

// ---------------------------------------------------------------------
// The time of the second pass of the diversity (PA7 D3).

/** The times of one run of the diversity of two passes, in
    milliseconds. */
interface TwoPasses {
  /** From the run posted to the calculation worker to the first progress
      of its second pass: the opening of the file and the first pass,
      calcPerVarDistribs. */
  readonly first: number;
  /** From the first progress of the second pass to the answer: the
      second pass, calcPopDiversity, and the result posted. */
  readonly second: number;
  /** From the run posted to the answer. */
  readonly run: number;
}

/** One run of the diversity, with its default options, on a new page
    with `file` and its populations just loaded, timed by pass from the
    messages of the calculation worker. */
async function twoPassesOnce(
  browser: Browser,
  file: string,
  pops: string,
  column: string,
): Promise<TwoPasses> {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await load(page, file, pops, column);
    const before = (await logOf(page)).length;
    const ran = await runAndSettle(page, 240_000);
    expect(ran.table).toBe(true);
    const ended = (await logOf(page)).slice(before).filter(isCalc);
    const run = ended.find((l) => l.event === "out" && l.kind === "run");
    const second = ended.find((l) => l.kind === "progress" && l.pass === 2);
    const answer = ended.find((l) => l.event === "in" && ENDS.has(l.kind));
    if (run === undefined || second === undefined || answer === undefined) {
      throw new Error(
        "the run, the first progress of its second pass or its answer is not in the log of the worker",
      );
    }
    return {
      first: second.t - run.t,
      second: answer.t - second.t,
      run: answer.t - run.t,
    };
  } finally {
    await context.close();
  }
}

test("PA7 D3 the time of each of the two passes of a Run of the diversity, on panel.nei and on the .nei file of 19,161,194 bytes, and what popnei issue #4 would save", async ({
  browser,
  browserName,
}) => {
  test.setTimeout(1_800_000);
  const big = await bigFiles();
  const files = [
    {
      name: "panel.nei, 1,200 variants of 200 individuals",
      file: join(FIXTURES, "panel.nei"),
      pops: join(FIXTURES, "panel_pops.csv"),
      column: "popcat",
    },
    {
      name: `the .nei file of ${statSync(big.nei).size.toLocaleString("en-US")} bytes, 20,000 variants of 1,000 individuals`,
      file: big.nei,
      pops: big.pops,
      column: "pop",
    },
  ];
  const rows: string[][] = [];
  for (const { name, file, pops, column } of files) {
    const times: TwoPasses[] = [];
    for (let k = 0; k < REPEATS; k++) {
      times.push(await twoPassesOnce(browser, file, pops, column));
    }
    const firsts = times.map((t) => t.first);
    const seconds = times.map((t) => t.second);
    const runs = times.map((t) => t.run);
    // A number measured in every column.
    for (const t of [...firsts, ...seconds, ...runs]) {
      expect(Number.isFinite(t) && t > 0).toBe(true);
    }
    rows.push([
      name,
      ...stats(firsts, ms),
      ...stats(seconds, ms),
      ...stats(runs, ms),
      `${ms(median(firsts))}, ${((100 * median(firsts)) / median(runs)).toFixed(0)}% of the run`,
    ]);
  }
  report(
    "The two passes of a Run of the diversity",
    `${machine(browser, browserName)}; ${String(REPEATS)} runs on each file, each on a new page just after the load, with the default options and filters; the first pass from the run posted to the calculation worker to the first progress of the second, the second from there to the answer`,
    [
      "file",
      "first pass, median",
      "first pass, range",
      "second pass, median",
      "second pass, range",
      "run, median",
      "run, range",
      "saved by popnei issue #4, one pass",
    ],
    rows,
  );
});

// ---------------------------------------------------------------------
// DL1 D1, the trial of the automatic download (docs/plans/download.md,
// work package 1). No code of the application: a button the test adds to
// the built page, clicked by Playwright, which gives the page the user's
// activation, and a download made as downloadFile of src/ui/download.ts
// makes it, a link to a Blob with the download attribute, clicked by the
// code, its address released a minute later.

/** How long after the code's click a download still counts as come. */
const DOWNLOAD_WAIT_MS = 5_000;

/** The size of each file of the trial, 1 MiB. */
const TRIAL_BYTES = 2 ** 20;

/** A download the button's click makes, `delay` ms after it. */
interface Planned {
  readonly delay: number;
  readonly name: string;
}

/** The code's click on the link of a planned download. */
interface CodeClick {
  readonly name: string;
  /** `Date.now()` of the page at the code's click. */
  readonly at: number;
  /** Whether the page still had the user's activation then, or "unknown"
      when the engine has no navigator.userActivation. */
  readonly active: boolean | "unknown";
}

/** Put in the page: the button "Trial", whose click makes the downloads
    of `trialPlan`, and the log of the code's clicks, `trialClicks`. */
function addTrialButton(bytes: number): void {
  const clicks: CodeClick[] = [];
  const holder = globalThis as unknown as {
    trialPlan: readonly Planned[];
    trialClicks: CodeClick[];
  };
  holder.trialPlan = [];
  holder.trialClicks = clicks;
  const button = document.createElement("button");
  button.textContent = "Trial";
  button.id = "trial";
  button.addEventListener("click", () => {
    for (const { delay, name } of holder.trialPlan) {
      setTimeout(() => {
        clicks.push({
          name,
          at: Date.now(),
          active:
            "userActivation" in navigator
              ? navigator.userActivation.isActive
              : "unknown",
        });
        const url = URL.createObjectURL(
          new Blob([new Uint8Array(bytes).fill(31)], {
            type: "application/gzip",
          }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        link.hidden = true;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 60_000);
      }, delay);
    }
  });
  document.body.prepend(button);
}

/** A download the page's context saw. */
interface Seen {
  readonly name: string;
  /** `Date.now()` of the test when the event came. */
  readonly at: number;
  readonly bytes: Promise<number>;
}

/** One row of the table: a planned download and what came of it. */
interface TrialRow {
  readonly trialCase: string;
  readonly name: string;
  readonly delay: number;
  readonly active: boolean | "unknown";
  readonly came: boolean;
  readonly after: string;
  readonly seenName: string;
  readonly bytes: string;
}

/** A new page of the built site with the trial's button, and the
    downloads its context sees. */
async function trialPage(
  browser: Browser,
): Promise<{ page: Page; seen: Seen[]; close: () => Promise<void> }> {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const seen: Seen[] = [];
  page.on("download", (download) => {
    seen.push({
      name: download.suggestedFilename(),
      at: Date.now(),
      bytes: download
        .path()
        .then((path) => statSync(path).size)
        .catch(() => -1),
    });
  });
  await page.goto("popgen2.html");
  await page.evaluate(addTrialButton, TRIAL_BYTES);
  return { page, seen, close: () => context.close() };
}

/** Clicks the button with `plan` and waits for each planned download:
    its code's click, then DOWNLOAD_WAIT_MS for the event. */
async function clickAndWait(
  page: Page,
  seen: readonly Seen[],
  trialCase: string,
  plan: readonly Planned[],
): Promise<TrialRow[]> {
  await page.evaluate((p) => {
    (globalThis as unknown as { trialPlan: readonly Planned[] }).trialPlan = p;
  }, plan);
  await page.getByRole("button", { name: "Trial" }).click();
  const rows: TrialRow[] = [];
  for (const { delay, name } of plan) {
    const handle = await page.waitForFunction(
      (n) =>
        (
          globalThis as unknown as { trialClicks: CodeClick[] }
        ).trialClicks.find((c) => c.name === n) ?? false,
      name,
      { timeout: delay + 30_000, polling: 100 },
    );
    const click = await handle.jsonValue();
    if (click === false) {
      throw new Error(`no click of the code for ${name}`);
    }
    const deadline = click.at + DOWNLOAD_WAIT_MS;
    while (Date.now() < deadline && !seen.some((s) => s.name === name)) {
      await page.waitForTimeout(100);
    }
    const event = seen.find((s) => s.name === name);
    rows.push({
      trialCase,
      name,
      delay,
      active: click.active,
      came: event !== undefined,
      after: event === undefined ? "" : ms(event.at - click.at),
      seenName: event?.name ?? "",
      bytes:
        event === undefined ? "" : (await event.bytes).toLocaleString("en-US"),
    });
  }
  return rows;
}

test("DL1 D1 the trial of the automatic download: a file the page's code downloads at once, 10 s and 70 s after a real click, and a second file in the same page, after a second click or with none", async ({
  browser,
  browserName,
}) => {
  test.setTimeout(600_000);
  const rows: TrialRow[] = [];
  const cases: {
    name: string;
    clicks: readonly (readonly Planned[])[];
  }[] = [
    {
      name: "at once after the click",
      clicks: [[{ delay: 0, name: "at-once.filtered.vcf.gz" }]],
    },
    {
      name: "10 s after the click",
      clicks: [[{ delay: 10_000, name: "after-10s.filtered.vcf.gz" }]],
    },
    {
      name: "70 s after the click",
      clicks: [[{ delay: 70_000, name: "after-70s.filtered.vcf.gz" }]],
    },
    {
      name: "a second download 10 s after a second click",
      clicks: [
        [{ delay: 10_000, name: "first-click.filtered.vcf.gz" }],
        [{ delay: 10_000, name: "second-click.filtered.nei" }],
      ],
    },
    {
      name: "a second download 10 s after the first, no click between",
      clicks: [
        [
          { delay: 0, name: "first-of-two.filtered.vcf.gz" },
          { delay: 10_000, name: "second-no-click.filtered.nei" },
        ],
      ],
    },
  ];
  for (const { name, clicks } of cases) {
    const { page, seen, close } = await trialPage(browser);
    for (const plan of clicks) {
      rows.push(...(await clickAndWait(page, seen, name, plan)));
    }
    await close();
  }
  report(
    "The trial of the automatic download",
    `${machine(browser, browserName)}; ${new Date().toISOString().slice(0, 10)}; each case on a new page of the built popgen2.html, from Playwright's click on a button the test adds; a file of ${TRIAL_BYTES.toLocaleString("en-US")} bytes downloaded as downloadFile does; a download counts as come when its event arrives within ${String(DOWNLOAD_WAIT_MS / 1000)} s of the code's click`,
    [
      "case",
      "file",
      "delay after the click",
      "activation at the code's click",
      "download came",
      "event after the code's click",
      "name given",
      "bytes",
    ],
    rows.map((r) => [
      r.trialCase,
      r.name,
      ms(r.delay),
      String(r.active),
      r.came ? "yes" : "no",
      r.after,
      r.seenName,
      r.bytes,
    ]),
  );
  // Measured whatever came: every planned download had its code's click.
  expect(rows).toHaveLength(7);
});

// ---------------------------------------------------------------------
// DL8, the largest file, and what a write leaves in the tab (the plan of
// the download, docs/plans/download.md, work package 8): the `.nei` file
// of the filtered variants downloaded from popgen2.html, with the first
// project of the page, the FILTER box on and the missing rate of the
// variants at 0.1, which keep every variant of the VCFs of bigVcf.ts.
// Each size is one command in the foreground, chosen by DL8_VARIANTS, and
// its VCF is made by a test of its own; the VCFs and the files saved are
// in DL8_DIR, outside the repository.

/** Where the VCFs of DL8 and the files saved go. */
const DL8_DIR = process.env["DL8_DIR"] ?? MEASURE_DIR;

/** The variants of the VCF of one size: 1,820,000 when not given, a
    `.nei` file of about 2 GB at the 1,101 bytes per variant the old page
    wrote. */
const DL8_VARIANTS = Number(process.env["DL8_VARIANTS"] ?? "1820000");

/** Whether the file saved is read back with pyarrow; "0" leaves it out,
    for the writes of DL8 D4, which time the parts alone. */
const DL8_READ_BACK = process.env["DL8_READ_BACK"] !== "0";

/** Whether the file saved is kept in DL8_DIR, "1", to be looked at. */
const DL8_KEEP = process.env["DL8_KEEP"] === "1";

/** Above it, in bytes, the summed footprint of the engine's processes,
    half the memory of the Mac, the page is closed. */
const ENGINE_LIMIT_BYTES = 32e9;

/** The gzipped VCF of DL8 of `numVars` variants. */
function dl8Vcf(numVars: number): string {
  return join(DL8_DIR, `dl8_${String(numVars)}.vcf.gz`);
}

/** Put in the page: the size of every `Blob` given an address, which is
    the file of the download. */
function recordBlobSizes(): void {
  const sizes: number[] = [];
  Object.assign(globalThis, { measureBlobSizes: sizes });
  const original = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (object: Blob | MediaSource): string => {
    if (object instanceof Blob) sizes.push(object.size);
    return original(object);
  };
}

/** Put in the page: the calculation worker is never ended, so that the
    client's restart after a large write starts a new worker beside the
    old one, which keeps what the write left in it. */
function keepWorkers(): void {
  const Before = globalThis.Worker;
  class Kept extends Before {
    constructor(url: string | URL, options?: WorkerOptions) {
      super(url, options);
      if (String(url).includes("runnerWorker")) {
        this.terminate = (): void => {
          // Kept, with its memory.
        };
      }
    }
  }
  globalThis.Worker = Kept;
}

/** The processes of Playwright's Chromium, from their paths, for a
    browser of a profile of its own, which has no `Browser` to ask; their
    kinds from the switch `--type` of each. */
async function chromiumProcesses(): Promise<readonly EngineProcess[]> {
  const text = await execFileAsync("ps", ["-axo", "pid=,command="]);
  const found: EngineProcess[] = [];
  for (const line of text.split("\n")) {
    const match = /^\s*(\d+) (.*ms-playwright\/chromium.*)$/.exec(line);
    if (match === null) continue;
    const command = match[2] ?? "";
    const type = /--type=([\w-]+)/.exec(command)?.[1];
    const kind =
      type === undefined
        ? "browser"
        : type === "renderer"
          ? "renderer"
          : type === "gpu-process"
            ? "GPU"
            : command.includes("NetworkService")
              ? "network"
              : type;
    found.push({ pid: Number(match[1]), kind });
  }
  return found;
}

/** What one download of popgen2.html gave. */
interface DownloadRun {
  /** Saved whole, the words of a failure in the dialog, the tab closed,
      or the page closed by the test above ENGINE_LIMIT_BYTES. */
  readonly outcome: "saved" | "failed" | "closed" | "overLimit";
  readonly words: string;
  readonly blobBytes: number | null;
  readonly savedBytes: number | null;
  /** From the click on Download in the dialog to the download event. */
  readonly ms: number | null;
  readonly before: Sample | null;
  readonly peak: Sample | null;
  /** The last sample before the download event. */
  readonly atDownload: Sample | null;
  /** 3 s after the download event. */
  readonly after: Sample | null;
  readonly whole: string;
}

/** Opens popgen2.html on a new page, picks `file`, waits for the one
    pass, and downloads the filtered variants as a `.nei` file, taking the
    memory of the engine throughout; the file saved into DL8_DIR is read
    back when `readBack`, and deleted. With `kept`, the calculation worker
    is never ended. */
async function downloadOnce(
  browser: Browser | null,
  browserName: string,
  file: string,
  options: {
    readonly readBack: boolean;
    readonly kept: boolean;
    readonly persistent?: boolean;
  },
): Promise<DownloadRun> {
  const profile =
    options.persistent === true
      ? join(DL8_DIR, `profile-${String(Date.now())}`)
      : null;
  let context: BrowserContext;
  if (profile !== null) {
    context = await chromium.launchPersistentContext(profile, {
      acceptDownloads: true,
      baseURL: test.info().project.use.baseURL ?? "",
    });
  } else if (browser !== null) {
    context = await browser.newContext({ acceptDownloads: true });
  } else {
    throw new Error("no browser, and no profile of its own");
  }
  const page = context.pages()[0] ?? (await context.newPage());
  const state = { crashed: false, over: false, endedAt: 0 };
  page.on("crash", () => {
    state.crashed = true;
    state.endedAt = Date.now();
  });
  const sampler = sampleMemory(
    browser,
    browserName,
    10,
    profile === null ? undefined : chromiumProcesses,
  );
  const watch = setInterval(() => {
    const last = sampler.samples.at(-1);
    if (!state.over && last !== undefined && last.total > ENGINE_LIMIT_BYTES) {
      state.over = true;
      state.endedAt = Date.now();
      void page.close().catch(() => undefined);
    }
  }, 250);
  const empty = {
    blobBytes: null,
    savedBytes: null,
    ms: null,
    atDownload: null,
    after: null,
    whole: "",
  };
  try {
    await page.addInitScript(recordBlobSizes);
    if (options.kept) await page.addInitScript(keepWorkers);
    await page.goto("popgen2.html");
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: /^Open (another )?variants file…$/u })
      .click();
    await (await chooser).setFiles(file);
    const stats = page.getByRole("region", { name: "Statistics of the file" });
    const button = stats.getByRole("button", {
      name: "Download filtered variants…",
      exact: true,
    });
    await expect(button).toBeEnabled({ timeout: 400_000 });
    // The memory settles after the one pass before it is taken.
    await page.waitForTimeout(2000);
    await button.click();
    const dialog = page.getByRole("dialog", {
      name: "Download filtered variants",
    });
    await dialog
      .locator("label")
      .filter({ hasText: "popnei's .nei file" })
      .click();
    const got: { download: Download | null; at: number } = {
      download: null,
      at: 0,
    };
    page.on("download", (d) => {
      got.download = d;
      got.at = Date.now();
    });
    const clicked = Date.now();
    await dialog.getByRole("button", { name: "Download" }).click();
    let words = "";
    try {
      await expect
        .poll(
          async () => {
            if (got.download !== null || state.crashed || state.over) {
              return true;
            }
            const failed = dialog.filter({ hasText: "could not be written" });
            if ((await failed.count()) > 0) {
              words = (await failed.innerText()).replace(/\s+/g, " ").trim();
              return true;
            }
            return false;
          },
          { timeout: 500_000, intervals: [250] },
        )
        .toBe(true);
    } catch (error) {
      if (!state.crashed && !state.over && !/crash|closed/i.test(String(error)))
        throw error;
      if (!state.over) state.crashed = true;
      state.endedAt = state.endedAt === 0 ? Date.now() : state.endedAt;
    }
    const before = settled(sampler.samples, clicked - 1200, clicked);
    const download = got.download;
    if (download === null) {
      const end = state.endedAt === 0 ? Date.now() : state.endedAt;
      return {
        ...empty,
        outcome: state.over ? "overLimit" : state.crashed ? "closed" : "failed",
        words: state.over
          ? `closed by the test above ${gb(ENGINE_LIMIT_BYTES)}`
          : state.crashed
            ? "the tab closed"
            : words,
        ms: end - clicked,
        before,
        peak: largest(sampler.samples, clicked, end),
      };
    }
    await page.waitForTimeout(4000);
    const after = settled(sampler.samples, got.at + 3000, got.at + 4000);
    const atDownload =
      sampler.samples.filter((s) => s.t <= got.at).at(-1) ?? null;
    const peak = largest(sampler.samples, clicked, got.at);
    const blobBytes = await page.evaluate(
      () =>
        (
          globalThis as unknown as { measureBlobSizes: number[] }
        ).measureBlobSizes.at(-1) ?? null,
    );
    const failure = await download.failure();
    let savedBytes: number | null = null;
    let whole = `the download failed: ${String(failure)}`;
    if (failure === null) {
      await mkdir(DL8_DIR, { recursive: true });
      const path = join(
        DL8_DIR,
        `${test.info().project.name}-${download.suggestedFilename()}`,
      );
      await download.saveAs(path);
      await download.delete();
      savedBytes = statSync(path).size;
      whole = "";
      if (options.readBack) {
        try {
          whole = readBack(path);
        } catch (error) {
          whole = `not read back: ${String(error)}`;
        }
      }
      if (!DL8_KEEP) await rm(path);
    }
    return {
      outcome:
        failure === null && savedBytes === blobBytes ? "saved" : "failed",
      words:
        (await stats.innerText().catch(() => ""))
          .split("\n")
          .find((line) => line.includes(" downloaded, ")) ?? "",
      blobBytes,
      savedBytes,
      ms: got.at - clicked,
      before,
      peak,
      atDownload,
      after,
      whole,
    };
  } finally {
    clearInterval(watch);
    await sampler.stop();
    await context.close().catch(() => undefined);
    if (profile !== null) await rm(profile, { recursive: true, force: true });
  }
}

/** What a sample holds above `base`, in GB, and its largest kinds. */
function above(s: Sample | null, base: Sample | null): string {
  if (s === null || base === null) return "";
  return gb(s.total - base.total);
}

/** The total and each kind of process of a sample, in GB. */
function byKinds(s: Sample | null, browserName: string): string {
  if (s === null) return "";
  const kinds = (KINDS[browserName] ?? []).map(
    (kind) => `${kind} ${gb(s.byKind.get(kind) ?? 0)}`,
  );
  return `${gb(s.total)} (${kinds.join(", ")})`;
}

test(`DL8 VCF made: the gzipped VCF of ${String(DL8_VARIANTS)} variants of 1,000 individuals, 1,000 bp apart`, async ({
  browserName,
}) => {
  test.skip(browserName !== "chromium", "made once, for both engines");
  test.setTimeout(590_000);
  await mkdir(DL8_DIR, { recursive: true });
  const path = dl8Vcf(DL8_VARIANTS);
  if (!existsSync(path)) {
    const part = join(DL8_DIR, `dl8_${String(DL8_VARIANTS)}.part.vcf.gz`);
    await writeBigVcf(part, DL8_VARIANTS);
    await rename(part, path);
  }
  process.stdout.write(
    `${path}: ${statSync(path).size.toLocaleString("en-US")} bytes\n`,
  );
});

test(`DL8 D1 the .nei file of the VCF of ${String(DL8_VARIANTS)} variants downloaded from popgen2.html: the outcome, the bytes, the time, the peak above the tab before (DL8 D2 at 2 GB), and what the engine holds 3 s after; tried once more in a new page when it fails`, async ({
  browser,
  browserName,
}) => {
  test.setTimeout(595_000);
  const vcf = dl8Vcf(DL8_VARIANTS);
  expect(existsSync(vcf), `${vcf} is made by "DL8 VCF made"`).toBe(true);
  const runs: DownloadRun[] = [];
  const first = await downloadOnce(browser, browserName, vcf, {
    readBack: DL8_READ_BACK,
    kept: false,
  });
  runs.push(first);
  if (first.outcome === "failed" || first.outcome === "closed") {
    runs.push(
      await downloadOnce(browser, browserName, vcf, {
        readBack: DL8_READ_BACK,
        kept: false,
      }),
    );
  }
  const n = (x: number | null): string =>
    x === null ? "" : x.toLocaleString("en-US");
  report(
    `DL8 D1 the .nei file of ${n(DL8_VARIANTS)} variants of 1,000 individuals downloaded from popgen2.html`,
    `${machine(browser, browserName)}, macOS ${macOs()}; ${new Date().toISOString()}; the VCF ${n(statSync(vcf).size)} bytes; load ${(loadavg()[0] ?? 0).toFixed(1)}; the memory is the footprints of the engine's processes summed`,
    [
      "try",
      "outcome",
      "Blob, bytes",
      "saved, bytes",
      "Download to the download event",
      "before",
      "peak",
      "peak above before",
      "peak above before / file",
      "3 s after",
      "3 s after, above before",
      "read back",
      "words",
    ],
    runs.map((r, i) => [
      String(i + 1),
      r.outcome,
      n(r.blobBytes),
      n(r.savedBytes),
      r.ms === null ? "" : ms(r.ms),
      byKinds(r.before, browserName),
      byKinds(r.peak, browserName),
      above(r.peak, r.before),
      r.peak === null || r.before === null || r.blobBytes === null
        ? ""
        : ((r.peak.total - r.before.total) / r.blobBytes).toFixed(2),
      byKinds(r.after, browserName),
      above(r.after, r.before),
      r.whole,
      r.words === "" ? r.outcome : r.words,
    ]),
  );
});

test("DL8 D3 what a write leaves: the page's process 3 s after a write of the .nei file of 20,000 variants from itself, 19,161,818 bytes, and of 200,000 variants, 220 MB, with the restart and with the old worker kept", async ({
  browser,
  browserName,
}) => {
  test.setTimeout(595_000);
  const { nei } = await bigFiles();
  const vcf = await writeVcfOf(TEN_TIMES_VARIANTS);
  const page = browserName === "chromium" ? "renderer" : "WebContent";
  const cases = [
    {
      what: "the .nei file of 20,000 variants, from itself",
      file: nei,
      kept: false,
    },
    { what: "200,000 variants, the restart", file: vcf, kept: false },
    { what: "200,000 variants, the old worker kept", file: vcf, kept: true },
  ];
  const rows: string[][] = [];
  for (const c of cases) {
    const runs: DownloadRun[] = [];
    for (let k = 0; k < 3; k++) {
      const run = await downloadOnce(browser, browserName, c.file, {
        readBack: false,
        kept: c.kept,
      });
      expect(run.outcome, run.words).toBe("saved");
      runs.push(run);
    }
    const ofPage = (s: Sample | null, b: Sample | null): number =>
      (s?.byKind.get(page) ?? 0) - (b?.byKind.get(page) ?? 0);
    const total = (s: Sample | null, b: Sample | null): number =>
      (s?.total ?? 0) - (b?.total ?? 0);
    rows.push([
      c.what,
      (runs[0]?.blobBytes ?? 0).toLocaleString("en-US"),
      ...stats(
        runs.map((r) => ofPage(r.atDownload, r.before)),
        mb,
      ),
      ...stats(
        runs.map((r) => ofPage(r.after, r.before)),
        mb,
      ),
      ...stats(
        runs.map((r) => total(r.after, r.before)),
        mb,
      ),
    ]);
  }
  report(
    "DL8 D3 what a write leaves in the tab, popgen2.html",
    `${machine(browser, browserName)}, macOS ${macOs()}; ${new Date().toISOString()}; 3 writes of each, each on a new page; the median, and the range; the page's process is the ${page}, where the worker runs`,
    [
      "write",
      "file, bytes",
      "page's process at the download, above before",
      "range",
      "page's process 3 s after, above before",
      "range",
      "all the processes 3 s after, above before",
      "range",
    ],
    rows,
  );
});

test(`DL8 D1 the same in a Chromium of a profile of its own, not off the record as Playwright's contexts are, for the VCF of ${String(DL8_VARIANTS)} variants`, async ({
  browserName,
}) => {
  test.skip(browserName !== "chromium", "a profile of its own in Chromium");
  test.setTimeout(595_000);
  const vcf = dl8Vcf(DL8_VARIANTS);
  expect(existsSync(vcf), `${vcf} is made by "DL8 VCF made"`).toBe(true);
  const r = await downloadOnce(null, browserName, vcf, {
    readBack: DL8_READ_BACK,
    kept: false,
    persistent: true,
  });
  const n = (x: number | null): string =>
    x === null ? "" : x.toLocaleString("en-US");
  report(
    `DL8 D1 the .nei file of ${n(DL8_VARIANTS)} variants downloaded from popgen2.html, Chromium with a profile of its own`,
    `${browserName}, launchPersistentContext, macOS ${macOs()}; ${new Date().toISOString()}; load ${(loadavg()[0] ?? 0).toFixed(1)}`,
    [
      "outcome",
      "Blob, bytes",
      "saved, bytes",
      "Download to the download event",
      "before",
      "peak",
      "peak above before",
      "3 s after",
      "read back",
      "words",
    ],
    [
      [
        r.outcome,
        n(r.blobBytes),
        n(r.savedBytes),
        r.ms === null ? "" : ms(r.ms),
        byKinds(r.before, browserName),
        byKinds(r.peak, browserName),
        above(r.peak, r.before),
        byKinds(r.after, browserName),
        r.whole,
        r.words === "" ? r.outcome : r.words,
      ],
    ],
  );
});

// IN2 D2, the memory of table_io and the restart of the light worker
// (the plan of the input page, docs/plans/input-page.md, work package 2):
// CSVs of 1,000,000, 5,000,000 and 19,999,000 bytes in the two shapes of
// table_io's report of 2 October 2026, read on the old page, whose
// Individuals step reads its file through the light worker, from a build
// with READ_RESTART_BYTES at 25,000,000, the worker kept, and one with it
// at 0, the worker ended after every read. Each build is one command in
// the foreground, with IN2_BUILD set to "kept" or "ended"; each writes its
// numbers into IN2_DIR, and the second prints what the restart gives
// back. The CSVs are made in IN2_DIR, outside the repository.

/** Where the CSVs of IN2 D2 and the numbers of each build go. */
const IN2_DIR = process.env["IN2_DIR"] ?? MEASURE_DIR;

/** The build the site under test was made with: "kept", READ_RESTART_BYTES
    at 25,000,000, or "ended", at 0. The test is skipped without it. */
const IN2_BUILD = process.env["IN2_BUILD"];

/** The sizes of the CSVs, in bytes. */
const IN2_SIZES = [1_000_000, 5_000_000, 19_999_000] as const;

/** The two shapes: a header of 100 names over rows of a name and 99
    cells, "0" or empty, the shape that took the most of a file read whole
    under node (table_io's report, "The memory of a text file"). */
const IN2_SHAPES = [
  { shape: "zeros", cell: "0" },
  { shape: "empty", cell: "" },
] as const;

/** The CSV of `bytes` bytes of the shape whose 99 cells are `cell`, made in
    IN2_DIR when it is not there: rows named s0000000 on, the last row's
    name lengthened by what the rows leave to reach `bytes`. */
async function in2Csv(
  bytes: number,
  shape: string,
  cell: string,
): Promise<string> {
  await mkdir(IN2_DIR, { recursive: true });
  const path = join(IN2_DIR, `in2_${shape}_${String(bytes)}.csv`);
  if (existsSync(path) && statSync(path).size === bytes) return path;
  const header = `IID,${Array.from({ length: 99 }, (_, i) => `c${String(i + 1)}`).join(",")}\n`;
  const tail = `${`,${cell}`.repeat(99)}\n`;
  const name = (i: number): string => `s${String(i).padStart(7, "0")}`;
  const rowBytes = name(0).length + tail.length;
  const rows = Math.floor((bytes - header.length) / rowBytes);
  const left = bytes - header.length - rows * rowBytes;
  const lines = [header];
  for (let i = 0; i < rows; i++) {
    const last = i === rows - 1 ? "x".repeat(left) : "";
    lines.push(`${name(i)}${last}${tail}`);
  }
  const text = lines.join("");
  expect(Buffer.byteLength(text)).toBe(bytes);
  await writeFile(path, text);
  return path;
}

/** The engine's processes summed, macOS's footprint of each. */
async function engineTotal(
  browser: Browser,
  browserName: string,
): Promise<number> {
  const processes = await engineProcesses(browser, browserName);
  const sizes = await footprints(processes);
  let total = 0;
  for (const p of processes) total += sizes.get(p.pid) ?? 0;
  return total;
}

function metadataZone(page: Page): Locator {
  return page.getByRole("region", { name: "Metadata file" });
}

/** Opens the old page at its Individuals step, timed. */
async function openOldIndividuals(page: Page): Promise<void> {
  await page.addInitScript(instrument);
  await page.goto("popgen.html#individuals");
  await expect(
    page.getByRole("heading", { level: 1, name: "Individuals" }),
  ).toBeVisible();
}

/** Picks `file` in the Metadata file zone and waits for the line of the
    size of its table, or for words of a failure; gives whether it was
    read, the words, and the time from the pick to them. */
async function readTimed(
  page: Page,
  file: string | { name: string; mimeType: string; buffer: Buffer },
  columns: number,
): Promise<{ read: boolean; words: string; ms: number }> {
  const zone = metadataZone(page);
  const chooser = page.waitForEvent("filechooser");
  await zone.getByRole("button", { name: /^(Choose|Replace) .*…$/ }).click();
  const picker = await chooser;
  const name =
    typeof file === "string" ? (file.split("/").at(-1) ?? "") : file.name;
  const start = Date.now();
  await picker.setFiles(file);
  const size = zone.getByText(
    new RegExp(`^[\\d,]+ rows, ${String(columns)} columns$`),
  );
  const failed = zone.getByText(/could not be read|stopped/);
  await expect(size.or(failed).first()).toBeVisible({ timeout: 300_000 });
  const ms = Date.now() - start;
  await expect(
    zone.getByRole("button", { name: `Replace ${name}…` }),
  ).toBeVisible();
  const read = (await size.count()) > 0;
  const words = read
    ? await size.innerText()
    : await failed.first().innerText();
  return { read, words, ms };
}

/** The numbers of one build, written to IN2_DIR for the other. */
interface In2Numbers {
  readonly build: string;
  readonly head: string;
  /** By "shape bytes": the summed footprints before and 3 s after each
      read, and its time, one entry a read. */
  readonly files: Record<
    string,
    readonly {
      before: number;
      after: number;
      ms: number;
      read: boolean;
      words: string;
      load: number;
    }[]
  >;
  readonly panelMs: readonly number[];
  readonly xlsxMs: readonly number[];
  readonly lightStarts: number;
}

test("IN2 D2 the memory of table_io: CSVs of 1, 5 and 20 MB in two shapes read on the old page, the engine's processes before and 3 s after, with the light worker kept or ended by the build; and the reads of panel_pops.csv and individuals_10000.xlsx", async ({
  browser,
  browserName,
}) => {
  test.skip(IN2_BUILD === undefined, "needs IN2_BUILD, kept or ended");
  const build = IN2_BUILD ?? "";
  test.setTimeout(1_800_000);
  const files: Record<string, In2Numbers["files"][string]> = {};
  for (const bytes of IN2_SIZES) {
    for (const { shape, cell } of IN2_SHAPES) {
      const path = await in2Csv(bytes, shape, cell);
      const reads = [];
      for (let k = 0; k < 3; k++) {
        const page = await browser.newPage();
        await openOldIndividuals(page);
        await page.waitForTimeout(2000);
        const load = loadavg()[0] ?? 0;
        const before = await engineTotal(browser, browserName);
        const { read, words, ms } = await readTimed(page, path, 100);
        await page.waitForTimeout(3000);
        const after = await engineTotal(browser, browserName);
        reads.push({ before, after, ms, read, words, load });
        await page.context().close();
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      files[`${shape} ${String(bytes)}`] = reads;
    }
  }

  // The reads of the small files, five each after a first read that
  // loads table_io, on one page: each a new worker in the build "ended".
  const page = await browser.newPage();
  await openOldIndividuals(page);
  const pops = await readFile(join(FIXTURES, "panel_pops.csv"));
  const xlsx = await readFile(join(FIXTURES, "individuals_10000.xlsx"));
  const csv = (i: number) => ({
    name: `panel_pops_${String(i)}.csv`,
    mimeType: "text/csv",
    buffer: pops,
  });
  const book = (i: number) => ({
    name: `individuals_${String(i)}.xlsx`,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: xlsx,
  });
  expect((await readTimed(page, csv(0), 2)).read).toBe(true);
  const panelMs: number[] = [];
  for (let i = 1; i <= 5; i++) {
    const r = await readTimed(page, csv(i), 2);
    expect(r.read, r.words).toBe(true);
    panelMs.push(r.ms);
  }
  const xlsxMs: number[] = [];
  for (let i = 1; i <= 5; i++) {
    const r = await readTimed(page, book(i), 20);
    expect(r.read, r.words).toBe(true);
    xlsxMs.push(r.ms);
  }
  const lightStarts = (await logOf(page)).filter(
    (l) => l.event === "start" && l.url.includes("filesRunner"),
  ).length;
  await page.context().close();

  const head = `${machine(browser, browserName)}, macOS ${macOs()}; ${new Date().toISOString()}; build "${build}"; 3 reads of each CSV, each on a new page; the median, and the range`;
  const numbers: In2Numbers = {
    build,
    head,
    files,
    panelMs,
    xlsxMs,
    lightStarts,
  };
  await writeFile(
    join(IN2_DIR, `in2_${browserName}_${build}.json`),
    JSON.stringify(numbers, null, 1),
  );
  const rows = Object.entries(files).map(([key, reads]) => [
    key,
    reads.map((r) => (r.read ? "read" : r.words)).join("; "),
    ...stats(
      reads.map((r) => r.ms),
      ms,
    ),
    ...stats(
      reads.map((r) => r.before),
      mb,
    ),
    ...stats(
      reads.map((r) => r.after),
      mb,
    ),
    ...stats(
      reads.map((r) => r.after - r.before),
      mb,
    ),
    reads.map((r) => r.load.toFixed(1)).join(", "),
  ]);
  report(
    `IN2 D2 the CSVs read on popgen.html, the light worker ${build}`,
    head,
    [
      "shape, bytes",
      "outcome",
      "pick to table",
      "range",
      "before",
      "range",
      "3 s after",
      "range",
      "after above before",
      "range",
      "load",
    ],
    rows,
  );
  report(
    `IN2 D2 the small reads, the light worker ${build}`,
    `${head}; ${String(lightStarts)} starts of the light worker for 11 reads`,
    ["file", "pick to table, median of 5", "range"],
    [
      ["panel_pops.csv", ...stats(panelMs, ms)],
      ["individuals_10000.xlsx", ...stats(xlsxMs, ms)],
    ],
  );

  // What the restart gives back, once both builds are measured.
  const other = join(
    IN2_DIR,
    `in2_${browserName}_${build === "kept" ? "ended" : "kept"}.json`,
  );
  if (!existsSync(other)) return;
  const both = [numbers, JSON.parse(readFileSync(other, "utf8")) as In2Numbers];
  const kept = both.find((x) => x.build === "kept");
  const ended = both.find((x) => x.build === "ended");
  if (kept === undefined || ended === undefined) return;
  const medianOf = (
    x: In2Numbers,
    key: string,
    f: (r: In2Numbers["files"][string][number]) => number,
  ): number => median((x.files[key] ?? []).map(f));
  report(
    "IN2 D2 what the restart gives back",
    `${machine(browser, browserName)}; kept: ${kept.head}; ended: ${ended.head}`,
    [
      "shape, bytes",
      "3 s after, kept",
      "3 s after, ended",
      "gives back",
      "above before, kept",
      "above before, ended",
      "difference",
    ],
    Object.keys(kept.files).map((key) => {
      const ak = medianOf(kept, key, (r) => r.after);
      const ae = medianOf(ended, key, (r) => r.after);
      const gk = medianOf(kept, key, (r) => r.after - r.before);
      const ge = medianOf(ended, key, (r) => r.after - r.before);
      return [key, mb(ak), mb(ae), mb(ak - ae), mb(gk), mb(ge), mb(gk - ge)];
    }),
  );
});
