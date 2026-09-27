/**
 * The words of the writing of the filtered variants, each row of "Its
 * words" of docs/specs/analyses/writeVariants.md asserted whole from its
 * failure, the sizes of 1.0 GB and 2.0 GB from estimates of a million and
 * of 4.3 million variants of 1,000 individuals.
 */
import { describe, expect, test } from "vitest";

import type { Project } from "../../../core/project.ts";
import { sampleProject } from "../../../core/testSupport.ts";
import type { WriteEstimate } from "../../../core/writeEstimate.ts";
import type { PassStats } from "../../../worker/protocol.ts";
import {
  DROPPED_TEXT,
  NO_SIZE_TEXT,
  estimateText,
  noVariantText,
  saveLabel,
  savedText,
  tooLargeText,
  warnText,
  writeErrorText,
  writingBarLabel,
  writingText,
} from "./writeWords.ts";

/** The estimate of `numVars` variants of `numIndividuals` individuals, at
    one byte a genotype. */
function estimateOf(
  numVars: number,
  numIndividuals: number,
  bound = false,
): WriteEstimate {
  const numBytes = numVars * numIndividuals;
  return {
    numVars,
    numIndividuals,
    numBytes,
    bound,
    warn: numBytes >= 500_000_000,
    tooLarge: numBytes >= 1_800_000_000 && !bound,
  };
}

const GIGABYTE = estimateOf(1_000_000, 1000);
const TOO_LARGE = estimateOf(2_000_000, 1000);

/** The sample project of core: panel.nei, with filters, so its file is
    panel.filtered.nei. */
const PROJECT: Project = sampleProject();

/** The sample project with panel.vcf, a VCF read with ploidy 2 and with
    only the passed variants, `onlyPassed`, or every variant. */
function vcfProject(onlyPassed: boolean): Project {
  const variants = PROJECT.variants;
  if (variants === null) throw new Error("the sample has a variants file");
  return {
    ...PROJECT,
    variants: {
      ...variants,
      name: "panel.vcf",
      format: "vcf",
      readOptions: { ploidy: 2, onlyPassed },
    },
  };
}

/** The counts of a pass whose missing data filter was given 1,200
    variants and kept none. */
const KEPT_NONE: PassStats = {
  numVars: 0,
  filtering: { missing_data: { varsProcessed: 1200, varsKept: 0 } },
};

/** The counts of a pass over a source of no variant. */
const EMPTY_SOURCE: PassStats = {
  numVars: 0,
  filtering: { missing_data: { varsProcessed: 0, varsKept: 0 } },
};

describe("VS5 D3 the words of the writing of the filtered variants", () => {
  test("the size expected, exact and from a bound", () => {
    expect(estimateText(estimateOf(20_000, 1000))).toBe(
      "About 20.0 MB: 20,000 variants of 1,000 individuals.",
    );
    expect(estimateText(estimateOf(1200, 200, true))).toBe(
      "At most about 240 KB: 1,200 variants of 200 individuals.",
    );
    expect(estimateText(estimateOf(1, 1))).toBe(
      "About 1 byte: 1 variant of 1 individual.",
    );
  });

  test("the warning of the memory, at about 1.0 GB, and from a bound", () => {
    expect(warnText(GIGABYTE)).toBe(
      "A file of about 1.0 GB may need about six times that in the memory of this tab while it is written, and a browser may close a tab that asks for too much, losing the work since the project was last saved. Save the project first. To write a smaller file, remove variants or individuals with the filters; to write any size, use popnei in Python.",
    );
    expect(warnText(estimateOf(1_000_000, 1000, true))).toMatch(
      /^A file of at most about 1\.0 GB may need/u,
    );
  });

  test("a file too large to write, at about 2.0 GB", () => {
    expect(tooLargeText(TOO_LARGE)).toBe(
      "A file of about 2.0 GB cannot be written in a browser tab: popnei needs more than twice the file in its memory while it writes it, and a tab gives popnei at most 4 GB. Remove variants or individuals with the filters, or write the file with popnei in Python.",
    );
  });

  test("no counts and no number of variants", () => {
    expect(NO_SIZE_TEXT).toBe(
      "The size of the file is known once the variants are counted: Count, above.",
    );
  });

  test("the filters keep no variant", () => {
    expect(noVariantText(PROJECT, KEPT_NONE)).toBe(
      "The filters kept none of the variants of panel.nei, so there is nothing to write. Loosen the filters above.",
    );
  });

  test("the variants file holds no variant, or a VCF read with only the passed variants none that passed", () => {
    expect(noVariantText(PROJECT, EMPTY_SOURCE)).toBe(
      "panel.nei has no variants, so there is nothing to write. Load another variants file in the Variants step.",
    );
    expect(noVariantText(vcfProject(true), EMPTY_SOURCE)).toBe(
      'panel.vcf has no variant with PASS or . in its FILTER column, and it was read with only those, so there is nothing to write. Untick "Only the variants with PASS or . in the FILTER column" in the Variants step and read the file again.',
    );
    expect(noVariantText(vcfProject(false), EMPTY_SOURCE)).toBe(
      "panel.vcf has no variants, so there is nothing to write. Load another variants file in the Variants step.",
    );
  });

  test("popnei refused the write for a genotype of another ploidy: the words of the panels, with no memory", () => {
    expect(
      writeErrorText(
        {
          kind: "refused",
          message:
            "line 12 of the VCF, the column of ind_3: its genotype is of the ploidy 4 and the reader was asked for the ploidy 2",
        },
        false,
        vcfProject(true),
        GIGABYTE,
      ),
    ).toBe(
      "panel.filtered.nei could not be written. At line 12 of panel.vcf, the genotype of ind_3 has 4 alleles, and the file was read with ploidy 2. If every genotype of the file has 4 alleles, set the ploidy of the VCF to 4 in the Variants step and read the file again. A file that mixes ploidies, such as one with the X of males haploid among diploid autosomes, cannot be read in this version.",
    );
  });

  test("Save, saved and dropped", () => {
    expect(saveLabel("panel.filtered.nei", 19_161_178)).toBe(
      "Save panel.filtered.nei, 19.2 MB",
    );
    expect(savedText("panel.filtered.nei", 19_161_178)).toBe(
      "panel.filtered.nei, 19.2 MB, was handed to the browser to save. To save it again, write it again.",
    );
    expect(DROPPED_TEXT).toBe(
      "The file was not kept, since the filters changed while it was written.",
    );
  });

  test("the line of the writing, with and without a share, and waiting for the file", () => {
    const line = {
      name: "panel.filtered.nei",
      waitsForStatistics: false,
      share: 35,
      seconds: 12,
      waitingFor: null,
    };
    expect(writingText(line)).toBe("Writing panel.filtered.nei · 35% · 0:12");
    expect(writingText({ ...line, share: null })).toBe(
      "Writing panel.filtered.nei · 0:12",
    );
    expect(writingText({ ...line, share: null, waitingFor: "panel.nei" })).toBe(
      "Waiting for panel.nei to be opened again, then writing panel.filtered.nei · 0:12",
    );
    expect(writingText({ ...line, waitingFor: "panel.nei" })).toBe(
      "Writing panel.filtered.nei · 35% · 0:12",
    );
    expect(writingBarLabel("panel.filtered.nei", false)).toBe(
      "Writing panel.filtered.nei",
    );
  });

  test("the line of the statistics the write waits for", () => {
    const line = {
      name: "panel.filtered.nei",
      waitsForStatistics: true,
      share: 35,
      seconds: 12,
      waitingFor: null,
    };
    expect(writingText(line)).toBe(
      "Calculating the statistics of each individual, which the filters of individuals are set from · 35% · 0:12",
    );
    expect(writingText({ ...line, share: null, waitingFor: "panel.nei" })).toBe(
      "Waiting for panel.nei to be opened again, then calculating the statistics of each individual, which the filters of individuals are set from · 0:12",
    );
    expect(writingBarLabel("panel.filtered.nei", true)).toBe(
      "Calculating the statistics of each individual",
    );
  });

  test("the worker stopped with no answer, with the size and without", () => {
    const error = {
      kind: "failed",
      error: { kind: "workerFailed", message: "a trap" },
    } as const;
    expect(writeErrorText(error, false, PROJECT, GIGABYTE)).toBe(
      "The writing stopped unexpectedly, perhaps because the file, of about 1.0 GB, did not fit in the memory of this tab. Remove variants or individuals with the filters and write it again, or write the file with popnei in Python.",
    );
    expect(writeErrorText(error, false, PROJECT, null)).toBe(
      "The writing stopped unexpectedly, perhaps because the file did not fit in the memory of this tab. Remove variants or individuals with the filters and write it again, or write the file with popnei in Python.",
    );
  });

  test("popnei refused the write, with the size and without", () => {
    const error = {
      kind: "refused",
      message: "memory could not grow.",
    } as const;
    expect(writeErrorText(error, false, PROJECT, GIGABYTE)).toBe(
      'panel.filtered.nei could not be written: popnei stopped with "memory could not grow". A file of about 1.0 GB may not fit in the memory of this tab: remove variants or individuals with the filters and write it again, or write the file with popnei in Python. If the message names a line of the VCF, correct the file, or fetch it again, and load it in the Variants step.',
    );
    expect(writeErrorText(error, false, PROJECT, null)).toBe(
      'panel.filtered.nei could not be written: popnei stopped with "memory could not grow". The file may not fit in the memory of this tab: remove variants or individuals with the filters and write it again, or write the file with popnei in Python. If the message names a line of the VCF, correct the file, or fetch it again, and load it in the Variants step.',
    );
  });

  test("the statistics it waited for, refused and failed", () => {
    expect(
      writeErrorText(
        {
          kind: "refused",
          message:
            "the pass gave no variant: the filters kept none of the 1200 variants",
        },
        true,
        PROJECT,
        GIGABYTE,
      ),
    ).toBe(
      "The statistics of each individual, which the thresholds of the filters of individuals are applied to, could not be calculated, so the file was not written. The filters kept none of the variants of panel.nei, so there is no variant to count each individual's genotypes over. Loosen the filters of the variants in the Variants step.",
    );
    expect(
      writeErrorText(
        {
          kind: "failed",
          error: { kind: "workerFailed", message: "a trap" },
        },
        true,
        PROJECT,
        GIGABYTE,
      ),
    ).toBe(
      "The statistics of each individual, which the thresholds of the filters of individuals are applied to, could not be calculated, so the file was not written. The calculation stopped unexpectedly. Run it again. If it stops again, load panel.nei again in the Variants step.",
    );
  });

  test("the variants file no longer read, the calculations not started, the page out of date, in the diversity's words", () => {
    expect(
      writeErrorText(
        {
          kind: "failed",
          error: {
            kind: "reopenFailed",
            name: "panel.nei",
            message: "NotReadableError",
          },
        },
        false,
        PROJECT,
        GIGABYTE,
      ),
    ).toBe(
      "panel.nei could not be read again; it may have changed on the disk since it was picked. Load it again in the Variants step.",
    );
    expect(
      writeErrorText(
        {
          kind: "failed",
          error: { kind: "couldNotStart", reason: "no ready" },
        },
        false,
        PROJECT,
        GIGABYTE,
      ),
    ).toBe(
      "The application could not start its calculations. Save the project, reload the page, and open the project again.",
    );
    expect(
      writeErrorText(
        { kind: "failed", error: { kind: "protocolMismatch" } },
        false,
        PROJECT,
        GIGABYTE,
      ),
    ).toBe(
      "The page is out of date. Save the project, reload the page, and open the project again.",
    );
  });

  test("an error of the application's own code", () => {
    expect(
      writeErrorText(
        {
          kind: "failed",
          error: { kind: "defect", message: "a broken rule." },
        },
        false,
        PROJECT,
        GIGABYTE,
      ),
    ).toBe(
      "The application met an error of its own: a broken rule. Write the file again.",
    );
  });
});
