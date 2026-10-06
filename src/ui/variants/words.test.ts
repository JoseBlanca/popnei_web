import { describe, expect, test } from "vitest";

import { emptyProject, loadVariants } from "../../core/project.ts";
import type { Project } from "../../core/project.ts";
import type { VcfReadOptions } from "../../worker/protocol.ts";
import {
  chromosomesLine,
  countAgainMends,
  countedText,
  countingVariantsLine,
  failedText,
  individualsLine,
  nameAndSizeText,
  notOpenedText,
  openFailedText,
  ploidyLine,
  refusalText,
  variantsLine,
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

  test("the ploidy is the file's, with no note", () => {
    expect(ploidyLine(4)).toBe("Ploidy: 4");
  });

  test("a VCF whose ploidy popnei could not read: what happened, and popnei's Python, which opens it with a ploidy and writes the .nei file this page opens", () => {
    const failed = (name: string, message: string): Project => {
      const p = withVcf(name, { ploidy: null, onlyPassed: false });
      const variants = p.variants;
      if (variants === null) throw new Error("the test loaded a file");
      return {
        ...p,
        variants: {
          ...variants,
          read: { kind: "failed", error: { kind: "popnei", message } },
        },
      };
    };
    expect(
      openFailedText(
        failed(
          "no_ploidy.vcf.gz",
          "the first 5 data lines of the VCF hold no genotype with alleles, so its ploidy cannot be read from the file; give the ploidy",
        ),
      ),
    ).toBe(
      'The ploidy of no_ploidy.vcf.gz could not be read from the file: every genotype of its first 5 variants is a single dot, a missing genotype that does not say how many alleles it has, and this page has no way to give the ploidy. In Python, popnei opens the file with its ploidy given, 2 for a diploid: variants = popnei.open_vcf("no_ploidy.vcf.gz", ploidy=2, only_passed=False). It then writes it as a .nei file, popnei.write_vars(variants, "no_ploidy.nei"), which this page opens.',
    );
    expect(
      openFailedText(
        failed(
          "one.vcf",
          "the one data line of the VCF holds no genotype with alleles, so its ploidy cannot be read from the file; give the ploidy",
        ),
      ),
    ).toContain("every genotype of its one variant is a single dot");
    expect(
      openFailedText(
        failed(
          "big.vcf.bgz",
          "the first 4096 data lines of the VCF hold no genotype with alleles, so its ploidy cannot be read from the file; give the ploidy",
        ),
      ),
    ).toContain("its first 4,096 variants is a single dot");
    expect(
      openFailedText(
        failed(
          "empty.vcf",
          "the file has no variants and the ploidy can't be inferred",
        ),
      ),
    ).toBe("empty.vcf has no variants. Open another variants file.");
    // Any other refusal keeps the words of the opening.
    expect(
      openFailedText(
        failed("bad.vcf", "the source is not a VCF: it starts with `x`"),
      ),
    ).toBe(
      "popnei could not read bad.vcf: the source is not a VCF: it starts with x. Open another file.",
    );
    expect(openFailedText(PASSED)).toBe("Reading panel.vcf.gz.");
    // A worker that stopped during the opening: the error bar has what
    // it said.
    const stopped = withVcf("panel.vcf.gz", {
      ploidy: null,
      onlyPassed: false,
    });
    const variants = stopped.variants;
    if (variants === null) throw new Error("the test loaded a file");
    expect(
      openFailedText({
        ...stopped,
        variants: {
          ...variants,
          read: {
            kind: "failed",
            error: {
              kind: "worker",
              error: {
                kind: "workerFailed",
                message: "wasm.default_ploidy is not a function",
              },
            },
          },
        },
      }),
    ).toBe("panel.vcf.gz could not be read.");
  });

  test("the lines of the box of the file: its name and size, its individuals, variants and chromosomes, with their numbers grouped", () => {
    const vcf = PASSED.variants;
    if (vcf === null) throw new Error("the project of the test has no VCF");
    expect(nameAndSizeText({ ...vcf, size: 1234567 })).toBe(
      "panel.vcf.gz · 1.2 MB",
    );
    expect(individualsLine(1200)).toBe("Individuals: 1,200");
    expect(chromosomesLine(1)).toBe("Chromosomes: 1");
  });

  test("the variants are the number alone, since the box of the passed variants says which are read", () => {
    expect(variantsLine(1200)).toBe("Variants: 1,200");
  });

  test("the line of the variants while they are counted says the share done, once known", () => {
    expect(countingVariantsLine(6)).toBe("Variants: counting… 6%");
    expect(countingVariantsLine(null)).toBe("Variants: counting…");
  });

  test("the count, with its nouns in the singular and the plural", () => {
    expect(countedText(1200, 1)).toBe("1,200 variants on 1 chromosome.");
    expect(countedText(1, 2)).toBe("1 variant on 2 chromosomes.");
  });
});

describe("the refusals of the count", () => {
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
    ).toBe("The variants of panel.vcf.gz could not be counted.");
  });

  test("a failure of the worker names the file, the error bar saying the rest", () => {
    expect(
      failedText(
        {
          kind: "failed",
          error: { kind: "workerFailed", message: "out of memory" },
        },
        PASSED,
      ),
    ).toBe("The variants of panel.vcf.gz could not be counted.");
  });
});
