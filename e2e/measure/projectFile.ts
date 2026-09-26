/**
 * The measurement of stage 2 made in node: the time to write and read a
 * project file with 10,000 individuals, and to make the key of the
 * diversity (the plan of the walking skeleton, work package 10;
 * docs/specs/core/projectFile.md and docs/specs/core/keys.md, "How it
 * runs"). It calls the functions of src/core the page calls, on a
 * project of 10,000 individuals in 7 populations and a table of 20
 * columns, as the metadata file of the browser's measurements has, and
 * the diversity done. Node runs the same JavaScript engine as Chromium,
 * V8, so the times are those of Chromium's page less its other work.
 *
 *   node e2e/measure/projectFile.ts [repetitions]
 *
 * It prints a table in Markdown: the first call, cold, as after a load,
 * and the median and the range of the calls after it.
 */
import { cpus, totalmem } from "node:os";

import { POPGEN_ANALYSES } from "../../src/core/apps.ts";
import {
  diversity,
  DIVERSITY_DEFAULTS,
} from "../../src/core/analyses/diversity.ts";
import { createKeyMemo, keyOf } from "../../src/core/keys.ts";
import type { Project } from "../../src/core/project.ts";
import {
  readProjectFile,
  writeProjectFile,
} from "../../src/core/projectFile.ts";
import type { AppState } from "../../src/core/store.ts";
import type { JobResult } from "../../src/worker/protocol.ts";

const INDIVIDUALS = 10_000;
const POPS = 7;
const REPETITIONS = Number(process.argv[2] ?? "20");

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const inner of Object.values(value)) deepFreeze(inner);
  }
  return value;
}

const names = Array.from(
  { length: INDIVIDUALS },
  (_, i) => `ind${String(i).padStart(5, "0")}`,
);

/** The project: the variants file of 10,000 individuals, the metadata file
    of 10,000 rows and 20 columns, as the browser's CSV of 10,000 rows, the
    populations from its column `pop`, and the missing data filter at
    `threshold`. */
function projectAt(threshold: number, table: Project["individuals"]): Project {
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: "00112233445566778899aabbccddeeff",
      name: "big.nei",
      size: 19_161_178,
      format: "nei",
      readOptions: null,
      read: { kind: "read", individuals: names, ploidy: 2, numVars: 20_000 },
    },
    filters: [{ kind: "missing_data", maxAllowedMissingRate: threshold }],
    individualFilters: [],
    individuals: table,
    grouping: { kind: "populations", column: "pop" },
    analyses: [{ analysis: "diversity", options: { ...DIVERSITY_DEFAULTS } }],
    reference: null,
  });
}

const individuals: Project["individuals"] = {
  fileId: "ffeeddccbbaa99887766554433221100",
  name: "rows10000.csv",
  csv: { encoding: "auto", separator: "auto", decimal: "auto" },
  read: {
    kind: "read",
    table: {
      columns: [
        "IID",
        "pop",
        ...Array.from({ length: 18 }, (_, j) => `c${String(j)}`),
      ],
      rows: names.map((name, i) => [
        name,
        `p${String(i % POPS)}`,
        ...Array.from({ length: 18 }, (_, j) =>
          j % 2 === 0
            ? ((i * (j + 3)) % 997) + 0.25
            : `level${String((i + j) % 13)}`,
        ),
      ]),
    },
    columns: [
      { kind: "identifier" },
      { kind: "categorical" },
      ...Array.from({ length: 18 }, (_, j) =>
        j % 2 === 0
          ? ({ kind: "continuous" } as const)
          : ({ kind: "categorical" } as const),
      ),
    ],
    found: {
      encoding: "utf-8",
      separator: ",",
      decimal: ".",
      undecodedLine: null,
    },
  },
};

const result: JobResult = {
  analysis: "diversity",
  pops: Array.from({ length: POPS }, (_, k) => `p${String(k)}`),
  numIndividuals: Uint32Array.from({ length: POPS }, (_, k) =>
    k < INDIVIDUALS % POPS
      ? Math.ceil(INDIVIDUALS / POPS)
      : Math.floor(INDIVIDUALS / POPS),
  ),
  unbiasedExpHet: Float64Array.from({ length: POPS }, (_, k) => 0.3 + k / 100),
  obsHet: Float64Array.from({ length: POPS }, (_, k) => 0.29 + k / 100),
  polyRatio: Float64Array.from({ length: POPS }, (_, k) => 0.9 + k / 1000),
  numVarsWithValue: Uint32Array.from({ length: POPS }, () => 19_000),
  passStats: {
    numVars: 19_500,
    filtering: { missing_data: { varsProcessed: 20_000, varsKept: 19_500 } },
  },
};

function stateOf(project: Project): AppState<JobResult> {
  return {
    project,
    undo: null,
    redo: null,
    popneiVersion: "0.1.0",
    analyses: [
      {
        id: "diversity",
        status: {
          kind: "done",
          key: keyOf(diversity, project, "0.1.0", createKeyMemo()),
          result,
          warnings: [],
          check: null,
        },
      },
    ],
    runs: [],
    notice: null,
    individualsKept: null,
  };
}

function timed(f: () => void): number {
  const t0 = performance.now();
  f();
  return performance.now() - t0;
}

interface Row {
  readonly what: string;
  readonly times: readonly number[];
}

const rows: Row[] = [];
const ms = (x: number): string => `${x.toFixed(1)} ms`;

// The key after a load: a new memo and a new table, as after a pick of the
// metadata file, so the table's populations are walked and its text
// written. Each repetition has its own copy of the table.
{
  const times: number[] = [];
  for (let k = 0; k <= REPETITIONS; k++) {
    const copy = structuredClone(individuals);
    const p = projectAt(0.1, copy);
    const memo = createKeyMemo();
    times.push(timed(() => keyOf(diversity, p, "0.1.0", memo)));
  }
  rows.push({
    what: "the key of the diversity after the metadata file is loaded",
    times,
  });
}

// The key after a change of the threshold: the same table and the same
// memo, as the store keeps them.
{
  const memo = createKeyMemo();
  keyOf(diversity, projectAt(0.1, individuals), "0.1.0", memo);
  const times: number[] = [];
  for (let k = 0; k <= REPETITIONS; k++) {
    const p = projectAt(0.1 + (k + 1) / 1000, individuals);
    times.push(timed(() => keyOf(diversity, p, "0.1.0", memo)));
  }
  rows.push({
    what: "the key of the diversity after a change of the threshold",
    times,
  });
}

const state = stateOf(projectAt(0.1, individuals));
let text = "";
{
  const times: number[] = [];
  for (let k = 0; k <= REPETITIONS; k++) {
    times.push(
      timed(() => {
        text = writeProjectFile(
          state,
          POPGEN_ANALYSES,
          "0.1.0",
          "2026-09-26T10:00:00.000Z",
        );
      }),
    );
  }
  rows.push({ what: "writing the project file", times });
}
{
  const times: number[] = [];
  for (let k = 0; k <= REPETITIONS; k++) {
    times.push(
      timed(() => {
        const read = readProjectFile(text, "popgen", POPGEN_ANALYSES);
        if (!read.ok)
          throw new Error(
            `the file written was refused: ${JSON.stringify(read.error)}`,
          );
      }),
    );
  }
  rows.push({ what: "reading it back", times });
}

function median(xs: readonly number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] ?? NaN)
    : ((sorted[mid - 1] ?? NaN) + (sorted[mid] ?? NaN)) / 2;
}

const lines = [
  `### The project file and the key, ${INDIVIDUALS.toLocaleString("en-US")} individuals, a table of 20 columns`,
  `node ${process.version}, ${cpus()[0]?.model ?? "unknown"}, ${String(Math.round(totalmem() / 2 ** 30))} GB; the file ${text.length.toLocaleString("en-US")} characters; ${String(REPETITIONS)} repetitions after the first`,
  "",
  "| what | first call | median of the next | range of the next |",
  "|---|---|---|---|",
  ...rows.map(({ what, times }) => {
    const rest = times.slice(1);
    return `| ${what} | ${ms(times[0] ?? NaN)} | ${ms(median(rest))} | ${ms(Math.min(...rest))} to ${ms(Math.max(...rest))} |`;
  }),
];
process.stdout.write(`${lines.join("\n")}\n`);
