/**
 * The fields of "Stricter for the PCA" on popgen2.html
 * (docs/specs/steps/popgen2-pca.md, "Its filters" and "How it is
 * checked"): `stricterBound`, the upper end, the decimals and the number
 * shown of each field, and `stricterLines`, the line of a refusal and the
 * line of the Variants tab stricter, with the Variants tab at 0.1, at
 * 0.0035 and off.
 */
import { describe, expect, test } from "vitest";

import { PCA2_DEFAULTS, pcaOnPopgen2 } from "../../../core/analyses/pca.ts";
import type { PcaOptions } from "../../../core/analyses/pca.ts";
import { setAnalysisOptions } from "../../../core/project.ts";
import type { Project, ProjectVariantFilter } from "../../../core/project.ts";
import {
  deepFreeze,
  sampleProject,
  summaryResult,
} from "../../../core/testSupport.ts";
import type { NumberRefusal } from "../../widgets/committedNumber.ts";
import { stepDecimalsOf, stricterBound, stricterLines } from "./stricter.ts";

/** The sample project with the Variants tab's filters `filters` and the
    options of the PCA of popgen2.html, PCA2_DEFAULTS with `change` over
    them. */
function project(
  filters: readonly ProjectVariantFilter[],
  change: Partial<PcaOptions> = {},
): Project {
  const o = { ...PCA2_DEFAULTS, ...change };
  return deepFreeze(
    setAnalysisOptions({ ...sampleProject(), filters }, pcaOnPopgen2, {
      method: o.method,
      missingData: { ...o.missingData },
      maf: { ...o.maf },
      ld: { ...o.ld },
      colourBy: o.colourBy,
      axes: [...o.axes],
      view: o.view,
    }),
  );
}

const missing = (rate: number): ProjectVariantFilter => ({
  kind: "missing_data",
  maxAllowedMissingRate: rate,
});
const maf = (value: number): ProjectVariantFilter => ({
  kind: "maf",
  maxAllowedMaf: value,
});
const ownMissing = (rate: number): Partial<PcaOptions> => ({
  missingData: { follow: false, maxAllowedMissingRate: rate },
});
const ownMaf = (value: number): Partial<PcaOptions> => ({
  maf: { follow: false, maxAllowedMaf: value },
});

/** A number above the upper end of a field, as the field gives it. */
const above = (typed: string, maxValue: number): NumberRefusal => ({
  kind: "aboveMax",
  typed,
  maxValue,
});

describe("AP6 D1 stricterBound, the upper end and the decimals of each field", () => {
  test("the Variants tab's missing rate at 0.1: the upper end 0.1, three decimals on the axis of panel.nei, whose step is 0.001, two before the axis is drawn", () => {
    const p = project([missing(0.1)]);
    expect(stricterBound(p, "missing_data", 3)).toEqual({
      tab: 0.1,
      max: 0.1,
      decimals: 3,
      shown: 0.1,
    });
    expect(stricterBound(p, "missing_data", null).decimals).toBe(2);
    expect(stricterBound(p, "missing_data", 2).decimals).toBe(2);
  });

  test("the Variants tab at 0.0035: the upper end 0.0035, and the four decimals it is written with, though the box of a threshold of the variants rounds to three", () => {
    const p = project([missing(0.0035)], ownMissing(0.0035));
    expect(stricterBound(p, "missing_data", 4)).toEqual({
      tab: 0.0035,
      max: 0.0035,
      decimals: 4,
      shown: 0.0035,
    });
    expect(stricterBound(p, "missing_data", null).decimals).toBe(4);
  });

  test("the Variants tab's threshold off: the upper end 1, the decimals of the step of the box, three at most", () => {
    const p = project([], ownMissing(1));
    expect(stricterBound(p, "missing_data", 3)).toEqual({
      tab: null,
      max: 1,
      decimals: 3,
      shown: 1,
    });
    expect(stricterBound(p, "missing_data", 5).decimals).toBe(3);
    expect(stricterBound(p, "missing_data", null).decimals).toBe(2);
  });

  test("the MAF at 0.95: the upper end 0.95, two decimals", () => {
    const p = project([missing(0.1), maf(0.95)], ownMaf(0.9));
    expect(stricterBound(p, "maf", 2)).toEqual({
      tab: 0.95,
      max: 0.95,
      decimals: 2,
      shown: 0.9,
    });
  });

  test("the field never shows a value looser than the one the PCA uses: the PCA's own 0.05 with the Variants tab at 0.1, 0.05; at 0.03, 0.03", () => {
    expect(
      stricterBound(
        project([missing(0.1)], ownMissing(0.05)),
        "missing_data",
        3,
      ).shown,
    ).toBe(0.05);
    expect(
      stricterBound(
        project([missing(0.03)], ownMissing(0.05)),
        "missing_data",
        3,
      ).shown,
    ).toBe(0.03);
  });
});

describe("AP6 D1 stricterLines, the line of a refusal and the line of the Variants tab stricter", () => {
  test("a number above the Variants tab's 0.1, under the PCA and under the PCoA", () => {
    const p = project([missing(0.1)], ownMissing(0.05));
    expect(
      stricterLines(p, "missing_data", "pca").refusedText(
        above("0.2", 0.1),
        0.05,
      ),
    ).toBe(
      "0.2 is more than the 0.1 of the Variants tab; the maximum proportion of missing genotypes for the PCA stays 0.05.",
    );
    expect(
      stricterLines(p, "missing_data", "pcoa").refusedText(
        above("0.2", 0.1),
        0.05,
      ),
    ).toBe(
      "0.2 is more than the 0.1 of the Variants tab; the maximum proportion of missing genotypes for the PCoA stays 0.05.",
    );
  });

  test("a number above the Variants tab's MAF of 0.95", () => {
    const p = project([missing(0.1), maf(0.95)], ownMaf(0.9));
    expect(
      stricterLines(p, "maf", "pca").refusedText(above("0.97", 0.95), 0.9),
    ).toBe(
      "0.97 is more than the 0.95 of the Variants tab; the maximum major allele frequency for the PCA stays 0.9.",
    );
  });

  test("the Variants tab at 0.0035: the line of a number above it names 0.0035", () => {
    const p = project([missing(0.0035)], ownMissing(0.0035));
    expect(
      stricterLines(p, "missing_data", "pca").refusedText(
        above("0.004", 0.0035),
        0.0035,
      ),
    ).toBe(
      "0.004 is more than the 0.0035 of the Variants tab; the maximum proportion of missing genotypes for the PCA stays 0.0035.",
    );
  });

  test("the Variants tab's threshold off: a number above 1 has the old panel's line, and so has a number below 0 or of too many decimals", () => {
    const p = project([], ownMissing(0.05));
    const { refusedText } = stricterLines(p, "missing_data", "pca");
    expect(refusedText(above("1.5", 1), 0.05)).toBe(
      "1.5 is more than 1; the threshold stays 0.05.",
    );
    expect(
      refusedText({ kind: "belowMin", typed: "-0.1", minValue: 0 }, 0.05),
    ).toBe("-0.1 is less than 0; the threshold stays 0.05.");
    expect(
      refusedText({ kind: "offStep", typed: "0.0512", decimals: 3 }, 0.05),
    ).toBe("0.0512 has more than three decimals; the threshold stays 0.05.");
  });

  test("the Variants tab's threshold off and the PCA's own at 1: the line that 1 keeps every variant; below 1, or the Variants tab's on, none", () => {
    expect(
      stricterLines(project([missing(0.1)], ownMaf(1)), "maf", "pca").keepsAll,
    ).toBe("1 keeps every variant: type a lower value to filter.");
    expect(
      stricterLines(project([], ownMissing(1)), "missing_data", "pcoa")
        .keepsAll,
    ).toBe("1 keeps every variant: type a lower value to filter.");
    expect(
      stricterLines(project([missing(0.1)], ownMaf(0.9)), "maf", "pca")
        .keepsAll,
    ).toBeNull();
    expect(
      stricterLines(project([missing(0.1), maf(0.95)], ownMaf(1)), "maf", "pca")
        .keepsAll,
    ).toBeNull();
  });

  test("the Variants tab stricter than the PCA's own: at 0.03 the line; at 0.1, at 0.05 and off, none", () => {
    expect(
      stricterLines(
        project([missing(0.03)], ownMissing(0.05)),
        "missing_data",
        "pca",
      ).tabStricter,
    ).toBe(
      "The Variants tab keeps at most 0.03, stricter than the 0.05 set here, so the PCA uses 0.03.",
    );
    for (const filters of [[missing(0.1)], [missing(0.05)], []]) {
      expect(
        stricterLines(project(filters, ownMissing(0.05)), "missing_data", "pca")
          .tabStricter,
      ).toBeNull();
    }
  });

  test("the Variants tab at 0.0035 stricter than the PCA's own 0.05, under the PCoA", () => {
    expect(
      stricterLines(
        project([missing(0.0035)], ownMissing(0.05)),
        "missing_data",
        "pcoa",
      ).tabStricter,
    ).toBe(
      "The Variants tab keeps at most 0.0035, stricter than the 0.05 set here, so the PCoA uses 0.0035.",
    );
  });
});

describe("AP6 D1 stepDecimalsOf, the decimals of the step of the Variants tab's box", () => {
  test("the missing rate up to 0.1 steps by 0.001, three decimals; the MAF from 0.5 to 1 by 0.01, two", () => {
    const pass = summaryResult(
      ["1"],
      [1200],
      Array.from({ length: 200 }, (_, i) => `s${String(i)}`),
    );
    // Of popnei's 1,000 fine bins, the variants in the first and in the
    // one ending at 0.1 for the missing rate, in the one from 0.5 and
    // the last for the MAF.
    const missing = new Uint32Array(1000);
    missing[0] = 600;
    missing[99] = 600;
    const maf = new Uint32Array(1000);
    maf[500] = 600;
    maf[999] = 600;
    const result = {
      ...pass,
      perVar: {
        ...pass.perVar,
        missingRate: { mean: 0.05, counts: missing },
        maf: { mean: 0.75, counts: maf },
      },
    };
    expect(stepDecimalsOf(result, "missing_data", 2)).toBe(3);
    expect(stepDecimalsOf(result, "maf", 2)).toBe(2);
  });
});
