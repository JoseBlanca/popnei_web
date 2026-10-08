/**
 * The words of the download of the filtered variants on popgen2.html,
 * asserted whole (docs/specs/steps/popgen2-download.md, "Its words";
 * docs/specs/analyses/writeVariants.md, "Its words on popgen2.html"). The
 * counts of the text after the download are those of the screen spec's
 * example, popnei 0.2.2 under node on low_qual.vcf.gz, 8 October 2026.
 */
import { describe, expect, test } from "vitest";

import { popgen2FirstProject } from "../../core/apps.ts";
import type { IndividualsKept } from "../../core/individualsKept.ts";
import { loadVariants } from "../../core/project.ts";
import type { Project } from "../../core/project.ts";
import type { AnalysisError } from "../../core/store.ts";
import type { PassStats } from "../../worker/protocol.ts";
import {
  DIALOG_HEADING,
  DOWNLOAD_LABEL,
  DOWNLOAD_NEEDS,
  DOWNLOAD_WAITS,
  FORMAT_ITEMS,
  FORMAT_LABEL,
  SAVE_AGAIN_LABEL,
  SAVE_IT_LABEL,
  downloadedText,
  noVariantText,
  stoppedText,
  writeFailedText,
  writingBarLabel,
  writingLine,
} from "./downloadWords.ts";

/** The individuals of low_qual.vcf.gz, 200. */
const INDIVIDUALS = Array.from(
  { length: 200 },
  (_, i) => `s${String(i).padStart(3, "0")}`,
);

/** popgen2.html's first project with low_qual.vcf.gz read. */
function lowQual(): Project {
  const p = loadVariants(popgen2FirstProject(), {
    fileId: "a".repeat(32),
    name: "low_qual.vcf.gz",
    size: 87_000,
    format: "vcf",
    readOptions: { ploidy: null, onlyPassed: false },
  });
  if (p.variants === null) throw new Error("no variants file");
  return {
    ...p,
    variants: {
      ...p.variants,
      read: {
        kind: "read",
        individuals: INDIVIDUALS,
        ploidy: 2,
        numVars: 1200,
        keepsPassed: true,
      },
    },
  };
}

/** The pass of the example: the FILTER box, the missing rate at 0.05 and
    the MAF at 0.9. */
const EXAMPLE_PASS: PassStats = {
  numVars: 772,
  filtering: {
    passed: { varsProcessed: 1200, varsKept: 900 },
    missing_data: { varsProcessed: 900, varsKept: 842 },
    maf: { varsProcessed: 842, varsKept: 772 },
  },
};

/** The individuals of the example: the missing rate at 0.03 keeps 116 of
    200, and the observed heterozygosity at 0.38 111 of them. */
const EXAMPLE_KEPT: IndividualsKept = {
  list: { kind: "known", individuals: INDIVIDUALS.slice(0, 111) },
  byLists: INDIVIDUALS,
  counts: [
    { kind: "missing_data", given: 200, kept: 116 },
    { kind: "obs_het", given: 116, kept: 111 },
  ],
};

/** The individuals kept when the filters remove none. */
const EVERY_ONE: IndividualsKept = {
  list: { kind: "known", individuals: null },
  byLists: INDIVIDUALS,
  counts: [],
};

describe("DL6 D2 the words of the download", () => {
  test("the button, its two reasons, the dialog and its formats", () => {
    expect(DOWNLOAD_LABEL).toBe("Download filtered variants…");
    expect(DOWNLOAD_WAITS).toBe(
      "The download waits for the statistics of the file to be read to the end.",
    );
    expect(DOWNLOAD_NEEDS).toBe(
      "The download needs the statistics of the file, which could not be calculated.",
    );
    expect(DIALOG_HEADING).toBe("Download filtered variants");
    expect(FORMAT_LABEL).toBe("Format");
    expect(FORMAT_ITEMS).toStrictEqual([
      { id: "vcf", label: "VCF compressed with bgzip (.vcf.gz)" },
      { id: "nei", label: "popnei's .nei file" },
    ]);
    expect(SAVE_AGAIN_LABEL).toBe("Save it again");
    expect(SAVE_IT_LABEL).toBe("Save it");
  });

  test("the line of the write with and without popnei's report, the name of the bar, and the status region after Stop", () => {
    expect(writingLine("low_qual.filtered.vcf.gz", 35, 12)).toBe(
      "Writing low_qual.filtered.vcf.gz · 35% · 0:12",
    );
    expect(writingLine("low_qual.filtered.vcf.gz", null, 12)).toBe(
      "Writing low_qual.filtered.vcf.gz · 0:12",
    );
    expect(writingLine("low_qual.filtered.vcf.gz", 0, 75)).toBe(
      "Writing low_qual.filtered.vcf.gz · 0% · 1:15",
    );
    expect(writingBarLabel("low_qual.filtered.vcf.gz")).toBe(
      "Writing low_qual.filtered.vcf.gz",
    );
    expect(stoppedText("low_qual.filtered.vcf.gz")).toBe(
      "The writing of low_qual.filtered.vcf.gz was stopped. Nothing was downloaded.",
    );
  });

  test("each failure of the write, as writeVariants.md gives it on popgen2.html", () => {
    const p = lowQual();
    const name = "low_qual.filtered.vcf.gz";
    const failed = (error: AnalysisError): string =>
      writeFailedText(error, false, p, name);
    expect(failed({ kind: "refused", message: "memory could not grow." })).toBe(
      'low_qual.filtered.vcf.gz could not be written: popnei stopped with "memory could not grow". If the message speaks of memory, the file may be too large for this tab: leave out more variants or individuals with the filters, or write the file with popnei in Python, which writes files of any size. If it names a line of the VCF, correct the file, or fetch it again, and open it again.',
    );
    expect(
      failed({
        kind: "failed",
        error: { kind: "workerFailed", message: "a crash" },
      }),
    ).toBe(
      "low_qual.filtered.vcf.gz could not be written: the writing stopped unexpectedly, perhaps because the file did not fit in the memory of this tab. Leave out more variants or individuals with the filters and download again, or write the file with popnei in Python, which writes files of any size.",
    );
    expect(
      failed({
        kind: "failed",
        error: { kind: "reopenFailed", name: "low_qual.vcf.gz", message: "x" },
      }),
    ).toBe(
      "low_qual.vcf.gz could not be read again; it may have changed on the disk since it was opened. Open it again.",
    );
    expect(
      failed({
        kind: "failed",
        error: { kind: "couldNotStart", reason: "no wasm" },
      }),
    ).toBe(
      "The application could not start its calculations. Reload the page and open low_qual.vcf.gz again.",
    );
    expect(
      failed({
        kind: "failed",
        error: { kind: "protocolMismatch" },
      }),
    ).toBe(
      "The page is out of date. Reload the page and open low_qual.vcf.gz again.",
    );
    expect(
      failed({
        kind: "failed",
        error: { kind: "defect", message: "onBytes threw." },
      }),
    ).toBe(
      "The page met an error of its own while writing low_qual.filtered.vcf.gz: onBytes threw. Download again.",
    );
  });

  test("a failure of the statistics waited for, and one of the files wasm, are defects", () => {
    const p = lowQual();
    expect(() =>
      writeFailedText({ kind: "refused", message: "no" }, true, p, "x.nei"),
    ).toThrow(/^popnei_web defect: /u);
    expect(() =>
      writeFailedText(
        { kind: "failed", error: { kind: "files", message: "no" } },
        false,
        p,
        "x.nei",
      ),
    ).toThrow(/^popnei_web defect: /u);
  });

  test("the text after the download of the example, downloaded and written", () => {
    const file = {
      name: "low_qual.filtered.vcf.gz",
      numBytes: 41_972,
      passStats: EXAMPLE_PASS,
      kept: EXAMPLE_KEPT,
      numIndividuals: 200,
    };
    expect(downloadedText({ ...file, handed: "downloaded" })).toBe(
      "low_qual.filtered.vcf.gz downloaded, 42 KB: 772 variants of 111 individuals. Variants removed: 300 by their FILTER, 58 by the missing rate, 70 by the MAF. Individuals removed: 84 by the missing rate, 5 by the observed heterozygosity.",
    );
    expect(downloadedText({ ...file, handed: "written" })).toBe(
      "low_qual.filtered.vcf.gz written, 42 KB: 772 variants of 111 individuals. Variants removed: 300 by their FILTER, 58 by the missing rate, 70 by the MAF. Individuals removed: 84 by the missing rate, 5 by the observed heterozygosity.",
    );
  });

  test("a filter that removed none is left out, and a line when none of its kind removed any", () => {
    expect(
      downloadedText({
        name: "low_qual.filtered.vcf.gz",
        numBytes: 75_577,
        passStats: {
          numVars: 900,
          filtering: {
            passed: { varsProcessed: 1200, varsKept: 900 },
            missing_data: { varsProcessed: 900, varsKept: 900 },
          },
        },
        kept: EVERY_ONE,
        numIndividuals: 200,
        handed: "downloaded",
      }),
    ).toBe(
      "low_qual.filtered.vcf.gz downloaded, 76 KB: 900 variants of 200 individuals. Variants removed: 300 by their FILTER.",
    );
    expect(
      downloadedText({
        name: "panel.filtered.nei",
        numBytes: 261_570,
        passStats: {
          numVars: 1200,
          filtering: {
            missing_data: { varsProcessed: 1200, varsKept: 1200 },
          },
        },
        kept: {
          list: { kind: "known", individuals: null },
          byLists: INDIVIDUALS,
          counts: [{ kind: "missing_data", given: 200, kept: 200 }],
        },
        numIndividuals: 200,
        handed: "downloaded",
      }),
    ).toBe(
      "panel.filtered.nei downloaded, 262 KB: 1,200 variants of 200 individuals.",
    );
    expect(
      downloadedText({
        name: "low_qual.filtered.nei",
        numBytes: 113_594,
        passStats: {
          numVars: 1200,
          filtering: { obs_het: { varsProcessed: 1200, varsKept: 1200 } },
        },
        kept: {
          list: { kind: "known", individuals: INDIVIDUALS.slice(0, 116) },
          byLists: INDIVIDUALS,
          counts: [
            { kind: "missing_data", given: 200, kept: 116 },
            { kind: "obs_het", given: 116, kept: 116 },
          ],
        },
        numIndividuals: 200,
        handed: "downloaded",
      }),
    ).toBe(
      "low_qual.filtered.nei downloaded, 114 KB: 1,200 variants of 116 individuals. Individuals removed: 84 by the missing rate.",
    );
  });

  test("one variant of one individual in the singular, and one removed", () => {
    expect(
      downloadedText({
        name: "one.filtered.vcf.gz",
        numBytes: 600,
        passStats: {
          numVars: 1,
          filtering: { obs_het: { varsProcessed: 2, varsKept: 1 } },
        },
        kept: {
          list: { kind: "known", individuals: ["s000"] },
          byLists: ["s000", "s001"],
          counts: [{ kind: "missing_data", given: 2, kept: 1 }],
        },
        numIndividuals: 2,
        handed: "downloaded",
      }),
    ).toBe(
      "one.filtered.vcf.gz downloaded, 600 bytes: 1 variant of 1 individual. Variants removed: 1 by the observed heterozygosity. Individuals removed: 1 by the missing rate.",
    );
  });

  test("the sentence of no variant kept", () => {
    expect(noVariantText("low_qual.vcf.gz", 1200)).toBe(
      "None of the 1,200 variants of low_qual.vcf.gz pass the filters, so there is nothing to download.",
    );
  });
});
