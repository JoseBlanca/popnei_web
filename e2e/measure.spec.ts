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
 *   80,692,954 bytes and the .nei file of 19,161,178 bytes.
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
 *   Protocol, with the .nei file of 19,161,178 bytes loaded and the
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
 * write of the .nei file of 19,161,178 bytes and of a file ten times
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
 * and the .nei file of 19,161,178 bytes, each on a new page just after
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
 * The time to write and read a project file, and to make a key, is
 * measured in node, by e2e/measure/projectFile.ts.
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
import { cpus, tmpdir, totalmem } from "node:os";
import { join } from "node:path";

import {
  expect,
  test,
  type Browser,
  type Locator,
  type Page,
  type Worker as PlaywrightWorker,
} from "@playwright/test";
import { init, openVcf, writeVars } from "popnei";

import { bigVcfPopsCsv, STOP_VCF_VARIANTS, writeBigVcf } from "./bigVcf.ts";
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

/** The sizes of the two files of the restart, as the plan gives them. */
const BIG_VCF_BYTES = 80_692_954;
const BIG_NEI_BYTES = 19_161_178;

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
  /** Of a progress, the bytes read. */
  readonly bytesRead?: number;
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
      });
      this.addEventListener("message", (event: MessageEvent<unknown>) => {
        const kind = kindOf(event.data);
        const data = event.data as { readonly bytesRead?: unknown };
        log.push({
          worker,
          url: name,
          event: "in",
          kind,
          t: performance.now(),
          ...(kind === "progress" && typeof data.bytesRead === "number"
            ? { bytesRead: data.bytesRead }
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
  return page.getByRole("region", { name: "Diversity" });
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
    a few tens of milliseconds apart. */
function sampleMemory(
  browser: Browser,
  browserName: string,
): { readonly samples: readonly Sample[]; stop(): Promise<void> } {
  const samples: Sample[] = [];
  const state = { stopped: false };
  const loop = (async () => {
    while (!state.stopped) {
      const processes = await engineProcesses(browser, browserName);
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
      await new Promise((resolve) => setTimeout(resolve, 10));
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
// The Count against the diversity (VS6 D3).

/** The time of one pass of `what`, the Count or the diversity, with the
    missing data filter at 0.05, on a new page with `file` just loaded,
    from the run posted to the calculation worker to its answer: the
    filter put on the Variants opened at the load, and a pass. */
async function passOnce(
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

test("VS6 D3 the Count against the diversity: a pass of each with the same filters, on the VCF of 80,692,954 bytes and the .nei file of 19,161,178 bytes", async ({
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
    // Each pass on a new page, the Count and the diversity in turn, so
    // that neither finds the Variants of the other already opened.
    for (let k = 0; k < REPEATS; k++) {
      counts.push(await passOnce(browser, file, files.pops, "count"));
      diversities.push(await passOnce(browser, file, files.pops, "diversity"));
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
    `${machine(browser, browserName)}; ${String(REPEATS)} passes of each, each on a new page just after the load, from the run posted to the calculation worker to its answer`,
    [
      "file",
      "Count, median",
      "Count, range",
      "diversity, median",
      "diversity, range",
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
