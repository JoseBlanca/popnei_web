// The vars file of the probe, made from the panel VCF with popnei under
// node: 1200 variants, 200 individuals, ploidy 2 (docs/specs/site.md, "The
// fixtures"). It writes the same bytes to e2e/fixtures/panel.nei, which the
// tests give to the file input, and to public/probe/panel.nei, which the
// build serves at probe/panel.nei.
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
const outputs = [
  join(fixtures, "panel.nei"),
  join(root, "public", "probe", "panel.nei"),
];

await init();
const variants = openVcf(readFileSync(join(fixtures, "panel.vcf.gz")));
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
