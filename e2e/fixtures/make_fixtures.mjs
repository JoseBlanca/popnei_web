// The vars files of the probe, made with popnei under node
// (docs/specs/site.md, "The fixtures"). From the panel VCF, 1200 variants,
// 200 individuals, ploidy 2, it writes the same bytes to
// e2e/fixtures/panel.nei, which the tests give to the file input, and to
// public/probe/panel.nei, which the build serves at probe/panel.nei. From
// the tetraploid VCF of popnei's tests, opened with ploidy 4, it writes
// e2e/fixtures/tetraploid.nei, a file whose numbers differ from the panel's,
// so that a page that always showed the panel's would fail.
//
// Run it from anywhere with `node e2e/fixtures/make_fixtures.mjs`, and again
// only when popnei's format of vars files changes; the files it writes are
// committed.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { init, openVars, openVcf, writeVars } from "popnei";

const fixtures = dirname(fileURLToPath(import.meta.url));
const root = join(fixtures, "..", "..");

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
