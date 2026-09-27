/**
 * The tests of the size expected of the file of the filtered variants and
 * of a size in words, from docs/specs/analyses/writeVariants.md, "How it
 * is verified", with the constants at their values of meanwhile.
 */

import { describe, expect, test } from "vitest";
import type { IndividualsKept, KeptList } from "./individualsKept.ts";
import type { Project } from "./project.ts";
import { deepFreeze, sampleProject } from "./testSupport.ts";
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

describe("VS2 D4 the size expected of the written file", () => {
  test("the variants of variantsKept are exact, even with a filter of the variants", () => {
    const kept = keptOf({ kind: "known", individuals: ["i1", "i2"] });
    expect(writeEstimate(projectOf(1200, MAF), kept, 1152)).toEqual({
      numVars: 1152,
      numIndividuals: 2,
      numBytes: 2304,
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
      numBytes: 2400,
      bound: false,
      warn: false,
      tooLarge: false,
    });
  });

  test("the variants of the read of the file with a filter of the variants are a bound, at most about", () => {
    const kept = keptOf({ kind: "known", individuals: ["i1", "i2"] });
    const estimate = writeEstimate(projectOf(1200, MAF), kept, null);
    expect(estimate?.numVars).toBe(1200);
    expect(estimate?.numBytes).toBe(2400);
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
    expect(estimate?.numBytes).toBe(3000);
    expect(estimate?.bound).toBe(false);
  });

  test("the individuals of a known list of null are every individual of the file, exact, about", () => {
    const kept = keptOf({ kind: "known", individuals: null });
    const estimate = writeEstimate(projectOf(null, []), kept, 1000);
    expect(estimate?.numIndividuals).toBe(4);
    expect(estimate?.numBytes).toBe(4000);
    expect(estimate?.bound).toBe(false);
  });

  test("the individuals of byLists while a threshold waits for its statistics are a bound, at most about", () => {
    const kept = keptOf({ kind: "needsStatistics" }, ["i1", "i2", "i3"]);
    const estimate = writeEstimate(projectOf(null, []), kept, 1000);
    expect(estimate?.numIndividuals).toBe(3);
    expect(estimate?.numBytes).toBe(3000);
    expect(estimate?.bound).toBe(true);
  });

  test("the warning comes at WRITE_WARN_BYTES and not one byte below it", () => {
    expect(WRITE_WARN_BYTES).toBe(500_000_000);
    const at = writeEstimate(projectOf(null, []), ONE, 500_000_000);
    expect(at?.numBytes).toBe(500_000_000);
    expect(at?.warn).toBe(true);
    expect(at?.tooLarge).toBe(false);
    const below = writeEstimate(projectOf(null, []), ONE, 499_999_999);
    expect(below?.warn).toBe(false);
  });

  test("tooLarge at WRITE_MAX_BYTES from exact counts, and not one byte below nor from a bound", () => {
    expect(WRITE_MAX_BYTES).toBe(1_800_000_000);
    const at = writeEstimate(projectOf(null, []), ONE, 1_800_000_000);
    expect(at).toEqual({
      numVars: 1_800_000_000,
      numIndividuals: 1,
      numBytes: 1_800_000_000,
      bound: false,
      warn: true,
      tooLarge: true,
    });
    const below = writeEstimate(projectOf(null, []), ONE, 1_799_999_999);
    expect(below?.tooLarge).toBe(false);
    const fromRead = writeEstimate(projectOf(1_800_000_000, MAF), ONE, null);
    expect(fromRead?.bound).toBe(true);
    expect(fromRead?.warn).toBe(true);
    expect(fromRead?.tooLarge).toBe(false);
    const fromLists = writeEstimate(
      projectOf(null, []),
      keptOf({ kind: "needsStatistics" }, ["i1"]),
      1_800_000_000,
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
