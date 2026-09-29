// The vars files of the probe, made with popnei under node
// (docs/specs/site.md, "The fixtures"). From the panel VCF, 1200 variants,
// 200 individuals, ploidy 2, it writes the same bytes to
// e2e/fixtures/panel.nei, which the tests give to the file input, and to
// public/probe/panel.nei, which the build serves at probe/panel.nei. From
// the tetraploid VCF of popnei's tests, opened with ploidy 4, it writes
// e2e/fixtures/tetraploid.nei, a file whose numbers differ from the panel's,
// so that a page that always showed the panel's would fail. It copies the
// populations of the panel, popnei's tests/reference/stats/panel_pops.txt,
// byte for byte to e2e/fixtures/panel_pops.txt, which the runner's tests
// read, and writes them as a CSV, e2e/fixtures/panel_pops.csv, with the
// header `IID,popcat`, which the flows give to the individuals file input
// (docs/specs/worker/runner.md and docs/specs/analyses/diversity.md, "How it
// is verified"). From panel.nei it writes the statistics of each
// individual that popnei's calcPerIndividualStats gives over every variant
// of the file, with no filter, to
// e2e/fixtures/panel_individual_stats.json, which the tests of core read,
// since they may not call popnei (docs/specs/core/individualsKept.md, "How
// it is verified"). From panel_pops.csv it writes
// e2e/fixtures/panel_meta.csv, the same individuals and populations with a
// third column of numbers, `altitude`, 100 + 10 × i for the individual
// `s‹i›` and NA for s197, s198 and s199, which the flow of the PCA colours
// by (docs/specs/analyses/pca.md, "How it is verified"). And from panel.nei
// it writes the PCA of the flow, the missing data filter at 0.1 and the
// PCA's own LD filter at r² 0.1 within 50,000 base pairs, cut to its first
// 10 components as the calculation worker cuts it, to
// e2e/fixtures/panel_pca.json, which the tests of the panel's functions of
// core read.
//
// Run it from anywhere with `node e2e/fixtures/make_fixtures.mjs`, and again
// only when popnei's format of vars files or its panel changes; the files it
// writes are committed. popnei's checkout is looked for beside this
// repository's, at ../popnei, or where the variable POPNEI says, as from a
// worktree: `POPNEI=/Users/jose/devel/popnei node e2e/fixtures/make_fixtures.mjs`.
//
// The three vars files, panel.nei, its copy in public/probe/ and
// tetraploid.nei, are written only when the script is given `--nei`; the
// statistics and the PCA are calculated from the panel.nei on disk either
// way. The tests pin the sizes of the committed files, 261,490 and 16,194
// bytes, written by popnei 0.1.0 on 24 September 2026, and popnei
// js-v0.1.0-dev.3 writes them in 261,570 and 16,218 bytes (29 September
// 2026), so a run for the other files leaves the vars files as they are.
// `--nei` is for a change of the format, with the sizes in the tests and
// the specs changed in the same commit.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  calcPerIndividualStats,
  doPcaFromVariants,
  init,
  openVars,
  openVcf,
  writeVars,
} from "popnei";

const fixtures = dirname(fileURLToPath(import.meta.url));
const root = join(fixtures, "..", "..");
// eslint-disable-next-line no-undef -- a script of node, whose globals the lint of .mjs files does not declare
const popnei = process.env.POPNEI ?? join(root, "..", "popnei");

await init();

/** Writes the VCF at `vcf`, opened with `options`, as a vars file to `outputs`. */
function writeFixture(vcf, options, outputs) {
  const variants = openVcf(readFileSync(join(fixtures, vcf)), options);
  let written;
  try {
    written = writeVars(variants);
  } finally {
    variants.free();
  }
  for (const path of outputs) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, written.bytes);
    console.log(`${path}: ${String(written.bytes.length)} bytes`);
  }
  // What the file holds, read back from it, for the numbers of the spec.
  const reread = openVars(written.bytes);
  try {
    console.log(
      `${String(written.passStats.numVars)} variants, ` +
        `${String(reread.individuals.length)} individuals, ` +
        `ploidy ${String(reread.ploidy)}`,
    );
  } finally {
    reread.free();
  }
}

// eslint-disable-next-line no-undef -- a script of node, as above
if (process.argv.includes("--nei")) {
  writeFixture("panel.vcf.gz", {}, [
    join(fixtures, "panel.nei"),
    join(root, "public", "probe", "panel.nei"),
  ]);
  writeFixture("tetraploid.vcf.gz", { ploidy: 4 }, [
    join(fixtures, "tetraploid.nei"),
  ]);
} else {
  console.log("the vars files left as they are; --nei writes them again");
}

// The populations: the copy, and the same rows as a CSV. The names hold no
// comma nor quote, so no cell is quoted; a name that did would stop here.
const pops = join(fixtures, "panel_pops.txt");
copyFileSync(
  join(popnei, "tests", "reference", "stats", "panel_pops.txt"),
  pops,
);
const csv = readFileSync(pops, "utf8")
  .split("\n")
  .map((line) => {
    if (/[,"]/.test(line)) {
      throw new Error(
        `a line of panel_pops.txt needs quoting in a CSV: ${line}`,
      );
    }
    return line.replaceAll("\t", ",");
  })
  .join("\n");
writeFileSync(join(fixtures, "panel_pops.csv"), csv);
console.log(
  `${pops} and panel_pops.csv: ${String(csv.trim().split("\n").length)} lines`,
);

// The statistics of each individual of panel.nei, over every variant of
// the file with no filter, as the application calculates them from 28
// September 2026: the individuals, their missingGtRate and their
// obsHetRate, in the order of the file. `filters` is the filters they were
// calculated with, none. JSON.stringify writes each double as the shortest
// text that reads back as the same double, and a NaN, an individual with
// no called genotype, as null, which the tests read back as NaN.
const panel = openVars(readFileSync(join(fixtures, "panel.nei")));
let individualStats;
try {
  individualStats = calcPerIndividualStats(panel);
} finally {
  panel.free();
}
const statsPath = join(fixtures, "panel_individual_stats.json");
writeFileSync(
  statsPath,
  `${JSON.stringify(
    {
      filters: [],
      individuals: individualStats.individuals,
      missingGtRate: [...individualStats.missingGtRate],
      obsHetRate: [...individualStats.obsHetRate],
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${statsPath}: ${String(individualStats.individuals.length)} individuals, ` +
    `${String(individualStats.passStats.numVars)} variants`,
);

// The metadata file with a column of numbers: the rows of panel_pops.csv in
// its order, and `altitude`, 100 + 10 × i for s‹i›, from 100 for s000 to
// 2,060 for s196, and NA for the last three, so that the column is read
// as continuous and three individuals have no value.
const NO_ALTITUDE = new Set(["s197", "s198", "s199"]);
const [popsHeader, ...popsRows] = csv.trim().split("\n");
const metaLines = [
  `${popsHeader},altitude`,
  ...popsRows.map((row) => {
    const name = row.split(",")[0];
    const match = /^s(\d+)$/.exec(name);
    if (match === null) {
      throw new Error(`an individual of panel_pops.csv is not s‹i›: ${name}`);
    }
    const altitude = NO_ALTITUDE.has(name)
      ? "NA"
      : String(100 + 10 * Number(match[1]));
    return `${row},${altitude}`;
  }),
];
const metaPath = join(fixtures, "panel_meta.csv");
writeFileSync(metaPath, `${metaLines.join("\n")}\n`);
console.log(`${metaPath}: ${String(metaLines.length)} lines`);

// The PCA of the flow of docs/specs/analyses/pca.md: the missing data
// filter at 0.1 and the PCA's own LD filter at r² 0.1 within 50,000 base
// pairs, as src/worker/runner.ts asks popnei for it, cut to the first 10
// components as the runner cuts it, PCA_NUM_COMPS_KEPT.
const NUM_COMPS_KEPT = 10;
const pcaVariants = openVars(readFileSync(join(fixtures, "panel.nei")));
let pca;
try {
  pcaVariants.filterByMissingData(0.1);
  pcaVariants.filterByLd(0.1, 50000);
  pca = doPcaFromVariants(pcaVariants, {
    numPrinComps: 0,
    transformToBiallelic: true,
  });
} finally {
  pcaVariants.free();
}
const numComps = Math.min(NUM_COMPS_KEPT, pca.numComps);
const projections = [];
for (let row = 0; row < pca.individuals.length; row += 1) {
  const start = row * pca.numComps;
  projections.push(...pca.projections.slice(start, start + numComps));
}
const pcaPath = join(fixtures, "panel_pca.json");
writeFileSync(
  pcaPath,
  `${JSON.stringify(
    {
      filters: [
        { kind: "missing_data", maxAllowedMissingRate: 0.1 },
        { kind: "ld", maxAllowedR2: 0.1, maxDist: 50000 },
      ],
      method: "pca",
      individuals: pca.individuals,
      numComps,
      numCompsFound: pca.numComps,
      numVarsUsed: pca.usedVars.length,
      passStats: pca.passStats,
      explainedVariancePercent: [
        ...pca.explainedVariancePercent.slice(0, numComps),
      ],
      projections,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `${pcaPath}: ${String(pca.individuals.length)} individuals, ` +
    `${String(numComps)} of ${String(pca.numComps)} components, ` +
    `${String(pca.usedVars.length)} variants used`,
);
