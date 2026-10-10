/**
 * The sliders of the PCA's own missing data and MAF on popgen2.html
 * (docs/specs/steps/popgen2-pca.md, "Its filters" and "How it is
 * checked"): `stricterBound`, the ends, the step and the value shown of
 * each slider; `stricterValueText`, the words of its value;
 * `stricterMoveCommand`, the command of a move; and `tabStricterLine`,
 * the line of the Variants tab stricter; with the Variants tab at 0.1, at
 * 0.0035 and off, and a MAF below 0.5.
 */
import { describe, expect, test } from "vitest";

import {
  PCA2_DEFAULTS,
  pcaOnPopgen2,
  pcaOptions,
} from "../../../core/analyses/pca.ts";
import type { PcaOptions } from "../../../core/analyses/pca.ts";
import { setAnalysisOptions } from "../../../core/project.ts";
import type { Project, ProjectVariantFilter } from "../../../core/project.ts";
import {
  deepFreeze,
  sampleProject,
  summaryResult,
} from "../../../core/testSupport.ts";
import type { OptionCommand } from "../optionCommand.ts";
import {
  emptyRangeLine,
  stricterEnds,
  stepDecimalsOf,
  stricterBound,
  tabStricterLine,
  stricterMoveCommand,
  stricterValueText,
} from "./stricter.ts";

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

describe("AP10 D2 stricterBound, the ends, the step and the value shown of each slider", () => {
  test("the Variants tab's missing rate at 0.1: from 0 to 0.1 by 0.001 on the axis of panel.nei, whose step is 0.001, by 0.01 before the axis is drawn; following, at 0.1", () => {
    const p = project([missing(0.1)]);
    expect(stricterBound(p, "missing_data", 3)).toEqual({
      tab: 0.1,
      min: 0,
      max: 0.1,
      decimals: 3,
      step: 0.001,
      shown: 0.1,
    });
    expect(stricterBound(p, "missing_data", null).step).toBe(0.01);
    expect(stricterBound(p, "missing_data", 2).decimals).toBe(2);
  });

  test("the Variants tab at 0.0035: up to 0.0035, by 0.0001, the four decimals it is written with, though the box of a threshold of the variants rounds to three", () => {
    const p = project([missing(0.0035)], ownMissing(0.0035));
    expect(stricterBound(p, "missing_data", 4)).toEqual({
      tab: 0.0035,
      min: 0,
      max: 0.0035,
      decimals: 4,
      step: 0.0001,
      shown: 0.0035,
    });
    expect(stricterBound(p, "missing_data", null).decimals).toBe(4);
  });

  test("the Variants tab's threshold off: up to 1, by the step of the box, 0.001 at the least", () => {
    const p = project([], ownMissing(0.05));
    expect(stricterBound(p, "missing_data", 3)).toEqual({
      tab: null,
      min: 0,
      max: 1,
      decimals: 3,
      step: 0.001,
      shown: 0.05,
    });
    expect(stricterBound(p, "missing_data", 5).decimals).toBe(3);
    expect(stricterBound(p, "missing_data", null).decimals).toBe(2);
  });

  test("the MAF at 0.95: from 0.5 to 0.95 by 0.01; the PCA's own 0.9 shown", () => {
    const p = project([missing(0.1), maf(0.95)], ownMaf(0.9));
    expect(stricterBound(p, "maf", 2)).toEqual({
      tab: 0.95,
      min: 0.5,
      max: 0.95,
      decimals: 2,
      step: 0.01,
      shown: 0.9,
    });
  });

  test("the MAF of the Variants tab at 0.4, below 0.5, as a variant of three alleles allows: from 0.4 to 0.4; off: from 0.5 to 1", () => {
    const low = stricterBound(project([maf(0.4)]), "maf", 2);
    expect([low.min, low.max, low.shown]).toEqual([0.4, 0.4, 0.4]);
    const off = stricterBound(project([]), "maf", 2);
    expect([off.min, off.max, off.shown]).toEqual([0.5, 1, 1]);
  });

  test("following the Variants tab, the slider at its upper end, whatever value the PCA kept of its own", () => {
    const following: Partial<PcaOptions> = {
      missingData: { follow: true, maxAllowedMissingRate: 0.05 },
    };
    expect(
      stricterBound(project([missing(0.1)], following), "missing_data", 3)
        .shown,
    ).toBe(0.1);
    expect(stricterBound(project([], following), "missing_data", 3).shown).toBe(
      1,
    );
  });

  test("the slider never shows a value looser than the one the PCA uses: the PCA's own 0.05 with the Variants tab at 0.1, 0.05; at 0.03, 0.03", () => {
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

describe("AP10 D2 stricterBound keeps the decimals of the PCA's own value", () => {
  test("the PCA's own 0.045, set on a step of 0.001: read 0.045 on a step of 0.001, before the axis is drawn, and on a step of 0.01; its own 0.0021, 0.0021", () => {
    const p = project([missing(0.1)], ownMissing(0.045));
    for (const stepDecimals of [3, null, 2]) {
      const bound = stricterBound(p, "missing_data", stepDecimals);
      expect(bound.shown).toBe(0.045);
      expect(stricterValueText(bound, bound.shown)).toBe("0.045");
    }
    const finer = stricterBound(
      project([missing(0.1)], ownMissing(0.0021)),
      "missing_data",
      3,
    );
    expect(stricterValueText(finer, finer.shown)).toBe("0.0021");
  });

  test("following the Variants tab, the PCA's own value kept does not change the decimals", () => {
    const p = project([missing(0.1)], {
      missingData: { follow: true, maxAllowedMissingRate: 0.045 },
    });
    expect(stricterBound(p, "missing_data", 2).decimals).toBe(2);
  });
});

describe("AP10 D2 stricterValueText, the words of the value of a slider", () => {
  test("at the upper end, the Variants tab's value or Off, as in the Variants tab; below it, the value", () => {
    const on = stricterBound(project([missing(0.1)]), "missing_data", 3);
    expect(stricterValueText(on, 0.1)).toBe("0.1, as in the Variants tab");
    expect(stricterValueText(on, 0.05)).toBe("0.05");
    expect(stricterValueText(on, 0.012)).toBe("0.012");
    const off = stricterBound(project([]), "maf", 2);
    expect(stricterValueText(off, 1)).toBe("Off, as in the Variants tab");
    expect(stricterValueText(off, 0.9)).toBe("0.9");
  });

  test("a value that a step of 0.001 left off its decimals is written rounded to them", () => {
    const on = stricterBound(project([missing(0.1)]), "missing_data", 3);
    expect(stricterValueText(on, 0.07 + 0.001 * 3)).toBe("0.073");
  });
});

/** The options of the PCA after `step` on `p`. */
function optionsAfter(p: Project, step: OptionCommand | null): PcaOptions {
  if (step === null) throw new Error("no command");
  return pcaOptions(step.command(p), "popgen2");
}

describe("AP10 D2 stricterMoveCommand, the command of a move of a slider", () => {
  const page = { page: "popgen2", method: "pca" } as const;

  test("from the upper end to 0.05: the missing data made stricter, follow false and 0.05 in one step", () => {
    const p = project([missing(0.1)]);
    const step = stricterMoveCommand(p, "missing_data", 0.05, 3, page);
    expect(step?.description).toBe(
      "the missing data filter of the PCA was made stricter",
    );
    expect(optionsAfter(p, step).missingData).toEqual({
      follow: false,
      maxAllowedMissingRate: 0.05,
    });
  });

  test("from the PCA's own 0.05 to 0.04: the value changed; under the PCoA, its name", () => {
    const p = project([missing(0.1)], ownMissing(0.05));
    const step = stricterMoveCommand(p, "missing_data", 0.04, 3, {
      page: "popgen2",
      method: "pcoa",
    });
    expect(step?.description).toBe(
      "the missing data filter of the PCoA changed",
    );
    expect(optionsAfter(p, step).missingData).toEqual({
      follow: false,
      maxAllowedMissingRate: 0.04,
    });
  });

  test("to the upper end, from the PCA's own 0.9: set back to as in the Variants tab, the 0.9 kept", () => {
    const p = project([missing(0.1), maf(0.95)], ownMaf(0.9));
    const step = stricterMoveCommand(p, "maf", 0.95, 2, page);
    expect(step?.description).toBe(
      "the MAF filter of the PCA was set back to as in the Variants tab",
    );
    expect(optionsAfter(p, step).maf.follow).toBe(true);
  });

  test("to the upper end of 1 while the Variants tab has the threshold off: as in the Variants tab, no filter", () => {
    const p = project([], ownMaf(0.9));
    expect(
      optionsAfter(p, stricterMoveCommand(p, "maf", 1, 2, page)).maf.follow,
    ).toBe(true);
  });

  test("at the upper end already, following: no command", () => {
    const p = project([missing(0.1)]);
    expect(stricterMoveCommand(p, "missing_data", 0.1, 3, page)).toBeNull();
  });

  test("the Variants tab at 0.03 stricter than the PCA's own 0.05, the thumb at the end: a move that ends there, a press with no move or a key at the end, sends no command, so the 0.05 is kept", () => {
    const p = project([missing(0.03)], ownMissing(0.05));
    expect(stricterMoveCommand(p, "missing_data", 0.03, 3, page)).toBeNull();
  });

  test("the PCA's own 0.05, a move that ends at 0.05: no command", () => {
    const p = project([missing(0.1)], ownMissing(0.05));
    expect(stricterMoveCommand(p, "missing_data", 0.05, 3, page)).toBeNull();
  });

  test("a value of a step of 0.001 off its decimals is rounded to them", () => {
    const p = project([missing(0.1)]);
    const step = stricterMoveCommand(p, "missing_data", 0.07 + 0.003, 3, page);
    expect(optionsAfter(p, step).missingData.maxAllowedMissingRate).toBe(0.073);
  });
});

describe("AP6 D1 tabStricterLine, the line of the Variants tab stricter", () => {
  test("the Variants tab stricter than the PCA's own: at 0.03 the line; at 0.1, at 0.05 and off, none", () => {
    expect(
      tabStricterLine(
        project([missing(0.03)], ownMissing(0.05)),
        "missing_data",
        "pca",
      ),
    ).toBe(
      "The Variants tab keeps at most 0.03, stricter than the 0.05 set here, so the PCA uses 0.03.",
    );
    // Following the Variants tab, the 0.05 kept is not used: no line.
    expect(
      tabStricterLine(
        project([missing(0.03)], {
          missingData: { follow: true, maxAllowedMissingRate: 0.05 },
        }),
        "missing_data",
        "pca",
      ),
    ).toBeNull();
    for (const filters of [[missing(0.1)], [missing(0.05)], []]) {
      expect(
        tabStricterLine(
          project(filters, ownMissing(0.05)),
          "missing_data",
          "pca",
        ),
      ).toBeNull();
    }
  });

  test("the Variants tab at 0.0035 stricter than the PCA's own 0.05, under the PCoA", () => {
    expect(
      tabStricterLine(
        project([missing(0.0035)], ownMissing(0.05)),
        "missing_data",
        "pcoa",
      ),
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

describe("AP10 D2 emptyRangeLine, a slider whose two ends are the same", () => {
  test("the Variants tab's missing rate at 0: the line, under the PCA and the PCoA", () => {
    const bound = stricterBound(project([missing(0)]), "missing_data", 3);
    expect([bound.min, bound.max]).toEqual([0, 0]);
    expect(emptyRangeLine(bound, "pca")).toBe(
      "0, as in the Variants tab. The PCA cannot be stricter than the Variants tab here.",
    );
    expect(emptyRangeLine(bound, "pcoa")).toBe(
      "0, as in the Variants tab. The PCoA cannot be stricter than the Variants tab here.",
    );
  });

  test("the Variants tab's MAF at 0.5 and at 0.4: the line with its value", () => {
    for (const value of [0.5, 0.4]) {
      const bound = stricterBound(project([maf(value)]), "maf", 2);
      expect(emptyRangeLine(bound, "pca")).toBe(
        `${String(value)}, as in the Variants tab. The PCA cannot be stricter than the Variants tab here.`,
      );
    }
  });

  test("a range, at 0.1, at 0.51 and off: no line", () => {
    expect(
      emptyRangeLine(
        stricterBound(project([missing(0.1)]), "missing_data", 3),
        "pca",
      ),
    ).toBeNull();
    expect(
      emptyRangeLine(stricterBound(project([maf(0.51)]), "maf", 2), "pca"),
    ).toBeNull();
    expect(
      emptyRangeLine(stricterBound(project([]), "maf", 2), "pca"),
    ).toBeNull();
  });
});

describe("AP10 D2 stricterMoveCommand given a value that is no number", () => {
  test("throws a defect for NaN and an infinity", () => {
    const p = project([missing(0.1)]);
    const page = { page: "popgen2", method: "pca" } as const;
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        stricterMoveCommand(p, "missing_data", value, 3, page),
      ).toThrow(/^popnei_web defect:/u);
    }
  });
});

describe("AP10 D2 stricterEnds, the words of the ends of a slider", () => {
  test("the missing data at 0.1: 0 and 0.1; the MAF off: 0.5 and Off; at 0.95: 0.5 and 0.95; at 0.0035: 0 and 0.0035", () => {
    expect(
      stricterEnds(stricterBound(project([missing(0.1)]), "missing_data", 3)),
    ).toEqual({ min: "0", max: "0.1" });
    expect(stricterEnds(stricterBound(project([]), "maf", 2))).toEqual({
      min: "0.5",
      max: "Off",
    });
    expect(stricterEnds(stricterBound(project([maf(0.95)]), "maf", 2))).toEqual(
      { min: "0.5", max: "0.95" },
    );
    expect(
      stricterEnds(
        stricterBound(project([missing(0.0035)]), "missing_data", 3),
      ),
    ).toEqual({ min: "0", max: "0.0035" });
  });
});
