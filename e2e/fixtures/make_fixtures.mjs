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
// individual that popnei's calcPerIndividualStats gives with the missing
// data filter of the variants at 0.05, to
// e2e/fixtures/panel_individual_stats.json, which the tests of core read,
// since they may not call popnei (docs/specs/core/individualsKept.md, "How
// it is verified").
//
// Run it from anywhere with `node e2e/fixtures/make_fixtures.mjs`, and again
// only when popnei's format of vars files or its panel changes; the files it
// writes are committed. popnei's checkout is looked for beside this
// repository's, at ../popnei, or where the variable POPNEI says, as from a
// worktree: `POPNEI=/Users/jose/devel/popnei node e2e/fixtures/make_fixtures.mjs`.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  calcPerIndividualStats,
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

writeFixture("panel.vcf.gz", {}, [
  join(fixtures, "panel.nei"),
  join(root, "public", "probe", "panel.nei"),
]);
writeFixture("tetraploid.vcf.gz", { ploidy: 4 }, [
  join(fixtures, "tetraploid.nei"),
]);

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

// The statistics of each individual of panel.nei at 0.05: the individuals,
// their missingGtRate and their obsHetRate, in the order of the file.
// JSON.stringify writes each double as the shortest text that reads back
// as the same double, and a NaN, an individual with no called genotype,
// as null, which the tests read back as NaN.
const MISSING_DATA_THRESHOLD = 0.05;
const panel = openVars(readFileSync(join(fixtures, "panel.nei")));
let individualStats;
try {
  panel.filterByMissingData(MISSING_DATA_THRESHOLD);
  individualStats = calcPerIndividualStats(panel);
} finally {
  panel.free();
}
const statsPath = join(fixtures, "panel_individual_stats.json");
writeFileSync(
  statsPath,
  `${JSON.stringify(
    {
      maxAllowedMissingRate: MISSING_DATA_THRESHOLD,
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
