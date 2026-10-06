import { describe, expect, test } from "vitest";

import { emptyProject, loadVariants } from "../../core/project.ts";
import type { Project, SourceError } from "../../core/project.ts";
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
  openFailure,
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

  /** A project whose VCF of the name `name`, opened with no ploidy,
      failed with `error`. */
  const failedWith = (name: string, error: SourceError): Project => {
    const p = withVcf(name, { ploidy: null, onlyPassed: false });
    const variants = p.variants;
    if (variants === null) throw new Error("the test loaded a file");
    return { ...p, variants: { ...variants, read: { kind: "failed", error } } };
  };
  const refused = (name: string, message: string): Project =>
    failedWith(name, { kind: "popnei", message });
  const NO_ALLELES =
    "hold no genotype with alleles, so its ploidy cannot be read from the file; give the ploidy";

  test("a VCF whose ploidy popnei could not read: no genotype with alleles, either missing or with no GT, and popnei's Python as the remedy when they are missing, in lines of their own", () => {
    expect(
      openFailure(
        refused(
          "no_ploidy.vcf.gz",
          `the first 5 data lines of the VCF ${NO_ALLELES}`,
        ),
      ),
    ).toEqual({
      text: "No genotype with alleles was found in the first 5 variants of no_ploidy.vcf.gz: their genotypes are missing, or the file has no genotypes (GT). popnei cannot read the ploidy of the file.",
      remedy: {
        words:
          "If the genotypes are missing, popnei's Python opens the file with its ploidy given, 2 for a diploid, and writes it as a .nei file, which this page opens:",
        code: 'import popnei\nvariants = popnei.open_vcf("no_ploidy.vcf.gz", ploidy=2, only_passed=False)\npopnei.write_vars(variants, "no_ploidy.nei")',
      },
    });
    expect(
      openFailure(
        refused(
          "one.vcf",
          `the one data line of the VCF holds no genotype with alleles, so its ploidy cannot be read from the file; give the ploidy`,
        ),
      )?.text,
    ).toBe(
      "No genotype with alleles was found in the one variant of one.vcf: its genotypes are missing, or the file has no genotypes (GT). popnei cannot read the ploidy of the file.",
    );
    expect(
      openFailure(
        refused(
          "big.vcf.bgz",
          `the first 4096 data lines of the VCF ${NO_ALLELES}`,
        ),
      )?.text,
    ).toContain("in the first 4,096 variants of big.vcf.bgz:");
  });

  test("the name in popnei's Python is a string of Python, its quotes, backslashes and hidden characters escaped as the box escapes them", () => {
    const remedy = openFailure(
      refused(
        'a"b\\c\u202e\n\u{e0001}.vcf',
        `the first 5 data lines of the VCF ${NO_ALLELES}`,
      ),
    )?.remedy;
    expect(remedy?.code).toBe(
      'import popnei\nvariants = popnei.open_vcf("a\\"b\\\\c\\u202e\\n\\U000e0001.vcf", ploidy=2, only_passed=False)\npopnei.write_vars(variants, "a\\"b\\\\c\\u202e\\n\\U000e0001.nei")',
    );
  });

  test("a VCF of no variant, and any other refusal of the opening, have no Python", () => {
    expect(
      openFailure(
        refused(
          "empty.vcf",
          "the file has no variants and the ploidy can't be inferred",
        ),
      ),
    ).toEqual({
      text: "empty.vcf has no variants. Open another variants file.",
      remedy: null,
    });
    expect(
      openFailure(
        refused("bad.vcf", "the source is not a VCF: it starts with `x`"),
      ),
    ).toEqual({
      text: "popnei could not read bad.vcf: the source is not a VCF: it starts with \u201cx\u201d. Open another file.",
      remedy: null,
    });
    expect(openFailure(PASSED)).toEqual({
      text: "Reading panel.vcf.gz.",
      remedy: null,
    });
  });

  test("a gzipped VCF cut short before its ploidy is read, and a bgzipped one, have the words their count gives", () => {
    const cut = "the source could not be read: incomplete deflate stream";
    expect(openFailure(refused("panel.vcf.gz", cut))?.text).toBe(
      "panel.vcf.gz could not be read to its end: it may be damaged or cut short. Fetch or copy it again, and open it again.",
    );
    expect(openFailure(refused("panel.vcf.gz", cut))?.text).toBe(
      refusalText(cut, EVERY),
    );
    const bgzip =
      "the VCF was written by bgzip and does not end with the empty member of 28 bytes that marks the end of a bgzipped file, so the file is cut short and the variants after the cut are not in it; the file has to be fetched or copied again. bcftools says of the same file `no BGZF EOF marker; file may be truncated`";
    expect(openFailure(refused("panel.vcf.gz", bgzip))?.text).toBe(
      refusalText(bgzip, EVERY),
    );
  });

  test.each(["workerFailed", "defect"] as const)(
    "a worker that failed with %s during the opening: the file could not be read, the error bar saying the rest",
    (kind) => {
      expect(
        openFailure(
          failedWith("panel.vcf.gz", {
            kind: "worker",
            error: { kind, message: "wasm.default_ploidy is not a function" },
          }),
        ),
      ).toEqual({ text: "panel.vcf.gz could not be read.", remedy: null });
    },
  );

  test("popnei's backquotes become quotes, so that the text of the file it quotes keeps its bounds", () => {
    expect(
      refusalText(
        "line 3 of the VCF, the column of a: `x` is not an allele number, which is a run of digits",
        EVERY,
      ),
    ).toBe(
      "popnei could not read panel.vcf.gz: line 3 of the VCF, the column of a: \u201cx\u201d is not an allele number, which is a run of digits. Correct the file, or fetch it again, and open it again.",
    );
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

  test("the variants are the number alone, every variant of the file", () => {
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
      "popnei could not read panel.vcf.gz: line 84 of the VCF, the column POS: \u201cx80\u201d is not a position. Correct the file, or fetch it again, and open it again.",
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
