/**
 * The tests of the size expected of the file of the filtered variants and
 * of a size in words, from docs/specs/analyses/writeVariants.md, "How it
 * is verified", with the constants at their values of meanwhile.
 */

import { describe, expect, test } from "vitest";
import type { IndividualsKept, KeptList } from "./individualsKept.ts";
import type { Project } from "./project.ts";
import { deepFreeze, sampleProject, withPassedOn } from "./testSupport.ts";
import {
  WRITE_MAX_BYTES,
  WRITE_WARN_BYTES,
  sizeText,
  writeEstimate,
} from "./writeEstimate.ts";
import type { VariantFilter } from "../worker/protocol.ts";

/** `sampleProject`, whose file has the four individuals i1 to i4, with
    `numVars` counted by a pass, or not, and the filters of the variants
    given, frozen deeply. */
function projectOf(
  numVars: number | null,
  filters: readonly VariantFilter[],
): Project {
  const sample = sampleProject();
  if (sample.variants?.read.kind !== "read") {
    throw new Error("the sample project has no variants file read");
  }
  return deepFreeze<Project>({
    ...sample,
    variants: {
      ...sample.variants,
      read: { ...sample.variants.read, numVars },
    },
    filters,
  });
}

/** The individuals kept, with the list given and `byLists`. */
function keptOf(
  list: KeptList,
  byLists: readonly string[] = ["i1", "i2", "i3"],
): IndividualsKept {
  return deepFreeze<IndividualsKept>({ list, byLists, counts: [] });
}

const MAF: readonly VariantFilter[] = [{ kind: "maf", maxAllowedMaf: 0.95 }];
const ONE: IndividualsKept = keptOf({ kind: "known", individuals: ["i1"] });

/** 60 individuals kept, so that a variant is 100 bytes with the 40 of
    its other columns. */
const SIXTY: IndividualsKept = keptOf({
  kind: "known",
  individuals: Array.from({ length: 60 }, (_, i) => `i${String(i)}`),
});

describe("VS5 D5 the bytes of a variant", () => {
  test("a variant is one byte per individual and 40 bytes more: 20,000 variants of 1,000 individuals are 20,800,000 bytes, one of one individual 41", () => {
    const thousand = keptOf({
      kind: "known",
      individuals: Array.from({ length: 1000 }, (_, i) => `i${String(i)}`),
    });
    expect(writeEstimate(projectOf(null, []), thousand, 20_000)?.numBytes).toBe(
      20_800_000,
    );
    expect(writeEstimate(projectOf(null, []), ONE, 1)?.numBytes).toBe(41);
  });
});

describe("VS2 D4 the size expected of the written file", () => {
  test("the variants of variantsKept are exact, even with a filter of the variants", () => {
    const kept = keptOf({ kind: "known", individuals: ["i1", "i2"] });
    expect(writeEstimate(projectOf(1200, MAF), kept, 1152)).toEqual({
      numVars: 1152,
      numIndividuals: 2,
      numBytes: 1152 * 42,
      bound: false,
      warn: false,
      tooLarge: false,
    });
  });

  test("the variants of the read of the file with no filter of the variants are exact", () => {
    const kept = keptOf({ kind: "known", individuals: ["i1", "i2"] });
    expect(writeEstimate(projectOf(1200, []), kept, null)).toEqual({
      numVars: 1200,
      numIndividuals: 2,
      numBytes: 1200 * 42,
      bound: false,
      warn: false,
      tooLarge: false,
    });
  });

  test("the variants of the read of the file with a filter of the variants are a bound, at most about", () => {
    const kept = keptOf({ kind: "known", individuals: ["i1", "i2"] });
    const estimate = writeEstimate(projectOf(1200, MAF), kept, null);
    expect(estimate?.numVars).toBe(1200);
    expect(estimate?.numBytes).toBe(1200 * 42);
    expect(estimate?.bound).toBe(true);
  });

  test("with no counts and no number of variants of the file, or no individuals kept, there is no estimate", () => {
    const kept = keptOf({ kind: "known", individuals: null });
    expect(writeEstimate(projectOf(null, MAF), kept, null)).toBeNull();
    expect(writeEstimate(projectOf(null, []), kept, null)).toBeNull();
    expect(writeEstimate(projectOf(1200, []), null, 1152)).toBeNull();
    const notRead = deepFreeze<Project>({ ...sampleProject(), variants: null });
    expect(writeEstimate(notRead, kept, 1152)).toBeNull();
  });

  test("the individuals of a known list are its length, exact", () => {
    const kept = keptOf({ kind: "known", individuals: ["i1", "i3", "i4"] });
    const estimate = writeEstimate(projectOf(null, []), kept, 1000);
    expect(estimate?.numIndividuals).toBe(3);
    expect(estimate?.numBytes).toBe(43_000);
    expect(estimate?.bound).toBe(false);
  });

  test("the individuals of a known list of null are every individual of the file, exact, about", () => {
    const kept = keptOf({ kind: "known", individuals: null });
    const estimate = writeEstimate(projectOf(null, []), kept, 1000);
    expect(estimate?.numIndividuals).toBe(4);
    expect(estimate?.numBytes).toBe(44_000);
    expect(estimate?.bound).toBe(false);
  });

  test("the individuals of byLists while a threshold waits for its statistics are a bound, at most about", () => {
    const kept = keptOf({ kind: "needsStatistics" }, ["i1", "i2", "i3"]);
    const estimate = writeEstimate(projectOf(null, []), kept, 1000);
    expect(estimate?.numIndividuals).toBe(3);
    expect(estimate?.numBytes).toBe(43_000);
    expect(estimate?.bound).toBe(true);
  });

  test("the warning comes at WRITE_WARN_BYTES and not 100 bytes below it", () => {
    expect(WRITE_WARN_BYTES).toBe(500_000_000);
    const at = writeEstimate(projectOf(null, []), SIXTY, 5_000_000);
    expect(at?.numBytes).toBe(500_000_000);
    expect(at?.warn).toBe(true);
    expect(at?.tooLarge).toBe(false);
    // 100 bytes below.
    const below = writeEstimate(projectOf(null, []), SIXTY, 4_999_999);
    expect(below?.warn).toBe(false);
  });

  test("tooLarge at WRITE_MAX_BYTES from exact counts, and not 100 bytes below nor from a bound", () => {
    expect(WRITE_MAX_BYTES).toBe(1_800_000_000);
    const at = writeEstimate(projectOf(null, []), SIXTY, 18_000_000);
    expect(at).toEqual({
      numVars: 18_000_000,
      numIndividuals: 60,
      numBytes: 1_800_000_000,
      bound: false,
      warn: true,
      tooLarge: true,
    });
    // 100 bytes below.
    const below = writeEstimate(projectOf(null, []), SIXTY, 17_999_999);
    expect(below?.tooLarge).toBe(false);
    const fromRead = writeEstimate(projectOf(18_000_000, MAF), SIXTY, null);
    expect(fromRead?.bound).toBe(true);
    expect(fromRead?.warn).toBe(true);
    expect(fromRead?.tooLarge).toBe(false);
    const fromLists = writeEstimate(
      projectOf(null, []),
      keptOf({ kind: "needsStatistics" }, ["i1"]),
      18_000_000_000,
    );
    expect(fromLists?.bound).toBe(true);
    expect(fromLists?.tooLarge).toBe(false);
  });
});

describe("VS2 D4 a size of a file in words", () => {
  test("812 bytes is written in bytes, as every size under 1,000 bytes", () => {
    expect(sizeText(812)).toBe("812 bytes");
    expect(sizeText(999)).toBe("999 bytes");
    expect(sizeText(1000)).toBe("1 KB");
  });

  test("one byte is written as 1 byte, and no byte as 0 bytes", () => {
    expect(sizeText(1)).toBe("1 byte");
    expect(sizeText(0)).toBe("0 bytes");
  });

  test("250,994 bytes is 251 KB, in whole KB", () => {
    expect(sizeText(250_994)).toBe("251 KB");
  });

  test("999,600 bytes rounds to 1,000 KB, so it is 1.0 MB", () => {
    expect(sizeText(999_600)).toBe("1.0 MB");
  });

  test("19,161,178 bytes is 19.2 MB, with one decimal", () => {
    expect(sizeText(19_161_178)).toBe("19.2 MB");
  });

  test("4,300,000,000 bytes is 4.3 GB, with one decimal, and a comma groups the whole GB", () => {
    expect(sizeText(4_300_000_000)).toBe("4.3 GB");
    expect(sizeText(1_234_560_000_000)).toBe("1,234.6 GB");
  });
});

describe("IP10 D3 the warning of the size, one byte below its bound", () => {
  test("723,589 variants of 651 individuals, 499,999,999 bytes, one byte below WRITE_WARN_BYTES, give no warning", () => {
    const individuals = keptOf({
      kind: "known",
      individuals: Array.from({ length: 651 }, (_, i) => `i${String(i)}`),
    });
    const below = writeEstimate(projectOf(null, []), individuals, 723_589);
    expect(below?.numBytes).toBe(WRITE_WARN_BYTES - 1);
    expect(below?.warn).toBe(false);
  });
});

describe("SF2 D4 the estimate of the write reads the filters that apply to the file", () => {
  test("with passed alone on and a .nei file whose read says keepsPassed false, the variants of the read are exact, as with no filter", () => {
    const kept = keptOf({ kind: "known", individuals: ["i1", "i2"] });
    const base = projectOf(1200, []);
    expect(writeEstimate(withPassedOn(base, false), kept, null)).toEqual(
      writeEstimate(base, kept, null),
    );
    expect(writeEstimate(withPassedOn(base, false), kept, null)?.bound).toBe(
      false,
    );
    expect(writeEstimate(withPassedOn(base, true), kept, null)?.bound).toBe(
      true,
    );
  });
});
