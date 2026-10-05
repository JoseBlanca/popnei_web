import { describe, expect, test } from "vitest";

import { emptyProject, loadVariants } from "../../core/project.ts";
import type { Project } from "../../core/project.ts";
import type { VcfReadOptions } from "../../worker/protocol.ts";
import {
  countedText,
  failedText,
  notOpenedText,
  passedLine,
  ploidyLine,
  refusalText,
} from "./words.ts";

/** A project with a VCF of the name `name`, read with `readOptions`. */
function withVcf(name: string, readOptions: VcfReadOptions): Project {
  return loadVariants(emptyProject("popgen"), {
    fileId: "0123456789abcdef0123456789abcdef",
    name,
    size: 1000,
    format: "vcf",
    readOptions,
  });
}

const PASSED = withVcf("panel.vcf.gz", { ploidy: 2, onlyPassed: true });
const EVERY = withVcf("panel.vcf.gz", { ploidy: 2, onlyPassed: false });

describe("the words of the page that opens a variants file", () => {
  test("a file of another name names the endings it opens", () => {
    expect(notOpenedText("pops.csv")).toBe(
      "pops.csv was not opened: a variants file is a VCF, whose name ends in .vcf, .vcf.gz or .vcf.bgz, or a .nei file. If it is one of them, rename it.",
    );
  });

  test("the ploidy of a VCF is the one given, that of a .nei file the file's", () => {
    expect(ploidyLine(4, true)).toBe("Ploidy 4, as given to read the VCF");
    expect(ploidyLine(2, false)).toBe("Ploidy 2, as the file says");
  });

  test("the passed variants of a VCF, both ways", () => {
    expect(passedLine({ ploidy: 2, onlyPassed: true })).toBe(
      "Only the variants with PASS or . in the FILTER column were read",
    );
    expect(passedLine({ ploidy: 2, onlyPassed: false })).toBe(
      "Every variant was read, whatever its FILTER column",
    );
  });

  test("the count, with its nouns in the singular and the plural", () => {
    expect(countedText(1200, 1)).toBe("1,200 variants on 1 chromosome.");
    expect(countedText(1, 2)).toBe("1 variant on 2 chromosomes.");
  });
});

describe("the refusals of the count", () => {
  test("a VCF with no variant that passed says to untick the box", () => {
    expect(
      refusalText(
        "the pass gave no variant and its source holds none: the file",
        PASSED,
      ),
    ).toBe(
      'panel.vcf.gz has no variant with PASS or . in its FILTER column, and it was read with only those, so there is nothing to count. Untick "Only the variants with PASS or . in the FILTER column", and the file is read again with every variant.',
    );
  });

  test("a file of no variant read with every variant says to open another", () => {
    expect(
      refusalText("the pass gave no variant and its source holds none", EVERY),
    ).toBe("panel.vcf.gz has no variants. Open another variants file.");
  });

  test("a variant at position 0 names its chromosome", () => {
    expect(
      refusalText(
        "a variant of the chromosome chr2 is at the position 0, and the windows of the density of the variants start at the position 1, so it is in none of them; the VCF format puts a telomere there",
        PASSED,
      ),
    ).toBe(
      "A variant of chromosome chr2 in panel.vcf.gz is at position 0, where the VCF format puts a telomere and not a variant, so the variants cannot be counted. Remove that line from the file and open it again.",
    );
  });

  test("a position of 2^53 or more is said as a position, not as a window", () => {
    expect(
      refusalText(
        "the window 9007199254740992 to 18014398509481982 of the chromosome 1 ends past 9007199254740991, the last whole number a number of JavaScript holds: the one after it would be read as another",
        PASSED,
      ),
    ).toBe(
      "A variant of chromosome 1 in panel.vcf.gz is at a position of 9,007,199,254,740,992 or more, larger than the application can count. The VCF format allows positions up to 2,147,483,647: correct the position in the file and open it again.",
    );
  });

  test("a bad line of the VCF gives popnei's words without their backquotes", () => {
    expect(
      refusalText(
        "line 84 of the VCF, the column POS: `x80` is not a position",
        PASSED,
      ),
    ).toBe(
      "popnei could not read panel.vcf.gz: line 84 of the VCF, the column POS: x80 is not a position. Correct the file, or fetch it again, and open it again.",
    );
  });

  test("a failure of the worker says to count again", () => {
    expect(
      failedText(
        {
          kind: "failed",
          error: { kind: "workerFailed", message: "out of memory" },
        },
        PASSED,
      ),
    ).toBe(
      "The count stopped unexpectedly. Count again. If it stops again, open panel.vcf.gz again.",
    );
  });
});
