/**
 * The tests of the words of the panel of the LD decay that are not core's
 * (docs/specs/analyses/ldDecay.md, "What it shows", "The states" and
 * "Its words"): the lines of its ready state, the line under the bar,
 * the caption and the cells of its two tables, and the names of its
 * downloads.
 */

import { describe, expect, test } from "vitest";
import { individualsKept } from "../../../core/individualsKept.ts";
import { panelOf } from "../panels.ts";
import type { Project } from "../../../core/project.ts";
import { deepFreeze, sampleProject } from "../../../core/testSupport.ts";
import { WAITS_FOR_STATISTICS_TEXT } from "../words.ts";
import {
  LD_DECAY_COLUMNS,
  LD_PRUNING_LINE,
  captionText,
  fitLine,
  ldBinCells,
  ldBinsCsvName,
  ldDecayCells,
  ldDecayCsvName,
  pruningLine,
} from "./words.ts";

/** The sample project, panel.nei of four individuals, with the filters of
    the variants `filters` and no filter of individuals, or those of the
    sample, a list and a threshold, when `thresholds`. */
function project(filters: Project["filters"], thresholds = false): Project {
  const sample = sampleProject();
  return deepFreeze<Project>({
    ...sample,
    filters,
    individualFilters: thresholds ? sample.individualFilters : [],
  });
}

const MISSING_DATA = {
  kind: "missing_data",
  maxAllowedMissingRate: 0.1,
} as const;

/** The lines of the ready state of the panel of the LD decay. */
const readyLines = panelOf("ldDecay").readyLines;

describe("PA8 D1 the ready state of the LD decay", () => {
  test("the line under the options says the LD pruning of the Variants step is not applied while it is on, with or without its distance, and the lines of the ready state are the individuals of the run", () => {
    for (const maxDist of [50_000, null]) {
      const p = project([
        MISSING_DATA,
        { kind: "ld", maxAllowedR2: 0.1, maxDist },
      ]);
      expect(pruningLine(p)).toBe(
        "The LD pruning of the Variants step is not applied here: it removes the pairs of variants in LD that this analysis measures. The other filters of the Variants step are.",
      );
      expect(readyLines(p, individualsKept(p, null))).toEqual([
        "4 individuals of panel.nei",
      ]);
    }
    expect(LD_PRUNING_LINE).toMatch(/^The LD pruning of the Variants step/);
  });

  test("without the LD pruning there is no line of it, and the ready state gives the individuals, and, while a threshold waits for the statistics, those the lists keep and the line that Run calculates them first", () => {
    const p = project([MISSING_DATA]);
    expect(pruningLine(p)).toBeNull();
    expect(readyLines(p, individualsKept(p, null))).toEqual([
      "4 individuals of panel.nei",
    ]);
    const waits = project([MISSING_DATA], true);
    expect(readyLines(waits, individualsKept(waits, null))).toEqual([
      "3 of the 4 individuals of panel.nei, those the filters of individuals keep",
      WAITS_FOR_STATISTICS_TEXT,
    ]);
  });

  test("the line under the bar says the curves are fitted once the file is read, and, PA10, that a large distance on a file of close variants may take tens of minutes and end refused", () => {
    expect(fitLine("ld.nei")).toBe(
      "The bar shows the reading of ld.nei. The curves are fitted once it is read. With a large distance on a file whose variants are close together, the reading may take tens of minutes and may end with the LD decay refused for lack of memory.",
    );
  });
});

describe("PA8 D1 the tables of the LD decay", () => {
  test("the caption and the columns of the table of the populations are the spec's: PA10, the caption says what the r² at distance 0 depends on", () => {
    expect(captionText(500, "ld.nei", 100_000)).toBe(
      "The LD decay of each population, over the 500 variants of ld.nei the filters kept, pairs up to 100,000 base pairs apart. The r² at distance 0 is where the fitted curve starts, which depends on the number of individuals of the population alone.",
    );
    expect(LD_DECAY_COLUMNS).toEqual([
      "Population",
      "Individuals",
      "Variants",
      "Pairs",
      "Half distance (bp)",
      "r² at distance 0, of the curve",
      "4Nr per base pair",
    ]);
  });

  test("the cells of a population: its half distance as the legend writes it without bp, r² at 0 to four decimals, ρ to three significant digits, and no pair or no curve", () => {
    expect(
      ldDecayCells({
        population: "pop_a",
        individuals: 50,
        variants: 432,
        pairs: 29367,
        halfDist: 7548.08187836982,
        r2AtZero: 0.46942148760330576,
        rhoPerBp: 0.00029996668947275404,
      }),
    ).toEqual(["pop_a", "50", "432", "29,367", "7,548", "0.4694", "0.000300"]);
    expect(
      ldDecayCells({
        population: "p2",
        individuals: 84,
        variants: 1152,
        pairs: 5,
        halfDist: 0.24712,
        r2AtZero: 0.5,
        rhoPerBp: 12.3456,
      }).slice(4),
    ).toEqual(["0.247", "0.5000", "12.3"]);
    const none = {
      population: "p3",
      individuals: 12,
      variants: 1,
      pairs: 0,
      halfDist: null,
      r2AtZero: null,
      rhoPerBp: null,
    };
    expect(ldDecayCells(none).slice(3)).toEqual([
      "0",
      "no pair",
      "no pair",
      "no pair",
    ]);
    expect(ldDecayCells({ ...none, pairs: 3 }).slice(3)).toEqual([
      "3",
      "no curve",
      "no curve",
      "no curve",
    ]);
  });

  test("the cells of a bin: its distances and pairs with commas, its mean and sd to four decimals, no pair for a bin without one", () => {
    expect(
      ldBinCells({
        population: "pop_b",
        from: 98_001,
        to: 100_000,
        pairs: 1452,
        meanR2: 0.03162397044318621,
        sdR2: 0.2814576610764838,
      }),
    ).toEqual(["pop_b", "98,001", "100,000", "1,452", "0.0316", "0.2815"]);
    expect(
      ldBinCells({
        population: "pop_b",
        from: 1,
        to: 2000,
        pairs: 0,
        meanR2: null,
        sdR2: null,
      }).slice(3),
    ).toEqual(["0", "no pair", "no pair"]);
  });

  test("the downloads are named after the variants file", () => {
    expect(ldDecayCsvName("ld.nei")).toBe("ld.ld_decay.csv");
    expect(ldBinsCsvName("ld.nei")).toBe("ld.ld_decay_bins.csv");
    expect(ldDecayCsvName("ld.vcf.gz")).toBe("ld.ld_decay.csv");
  });
});
