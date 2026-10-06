import { describe, expect, test } from "vitest";

import { emptyProject, loadVariants } from "../../core/project.ts";
import type { Project } from "../../core/project.ts";
import type { VcfReadOptions } from "../../worker/protocol.ts";
import { ONLY_PASSED_LABEL } from "../steps/variants/words.ts";
import {
  countAgainMends,
  countedText,
  countingText,
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

  test("the ploidy of a VCF is the one set in the field, the one it starts with told apart, and not checked against the genotypes; that of a .nei file the file's", () => {
    expect(ploidyLine(2, { ploidy: 2, onlyPassed: true })).toBe(
      "Ploidy 2, the Default ploidy the page starts with: a VCF does not give its ploidy, and this page does not check it against the genotypes",
    );
    expect(ploidyLine(4, { ploidy: 4, onlyPassed: true })).toBe(
      "Ploidy 4, the Default ploidy set on this page: a VCF does not give its ploidy, and this page does not check it against the genotypes",
    );
    expect(ploidyLine(2, null)).toBe("Ploidy 2, as the file says");
  });

  test("the line of a count under way says what is counted and that its time is elapsed", () => {
    expect(countingText(6, 12)).toBe(
      "Counting the variants · 6% · 12 seconds so far",
    );
    expect(countingText(null, 1)).toBe(
      "Counting the variants · 1 second so far",
    );
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
  test("a VCF of no variant read with only the passed ones gives words that hold for both causes", () => {
    expect(
      refusalText(
        "the pass gave no variant and its source holds none: the file",
        PASSED,
      ),
    ).toBe(
      `panel.vcf.gz has no variant, or none with PASS or . in its FILTER column. If its variants have another FILTER, untick "${ONLY_PASSED_LABEL}" and it is read again with every variant; otherwise open another variants file.`,
    );
  });

  test("a file of no variant read with every variant says to open another", () => {
    expect(
      refusalText("the pass gave no variant and its source holds none", EVERY),
    ).toBe("panel.vcf.gz has no variants. Open another variants file.");
  });

  test("a gzipped file cut short says it could not be read to its end, and to fetch it again", () => {
    expect(
      refusalText(
        "the source could not be read: incomplete deflate stream",
        PASSED,
      ),
    ).toBe(
      "panel.vcf.gz could not be read to its end: it may be damaged or cut short. Fetch or copy it again, and open it again.",
    );
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
      "A variant of chromosome 1 in panel.vcf.gz is at a position beyond 2,147,483,647, the largest the VCF format allows, and too large for the application to count. Correct the position in the file and open it again.",
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

  test.each([
    [{ kind: "refused", message: "a refusal" }, false],
    [
      {
        kind: "failed",
        error: { kind: "reopenFailed", name: "panel.vcf.gz", message: "gone" },
      },
      false,
    ],
    [{ kind: "failed", error: { kind: "workerFailed", message: "oom" } }, true],
    [
      { kind: "failed", error: { kind: "couldNotStart", reason: "no ready" } },
      false,
    ],
    [{ kind: "failed", error: { kind: "protocolMismatch" } }, false],
    [
      { kind: "failed", error: { kind: "defect", message: "x is undefined" } },
      false,
    ],
  ] as const)("Count again for %o: %s", (error, mends) => {
    expect(countAgainMends(error)).toBe(mends);
  });

  test("a defect of the count is said as one, for the error bar to tell", () => {
    expect(
      failedText(
        {
          kind: "failed",
          error: { kind: "defect", message: "x is undefined" },
        },
        PASSED,
      ),
    ).toBe(
      "The count stopped on an error of the application itself. The error bar says what it was, and its details can be copied for a report.",
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
