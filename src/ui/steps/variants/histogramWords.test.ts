/**
 * The words of the histograms of the variants on the Variants step
 * (docs/specs/steps/variants.md, "The histograms beside the filters of
 * the variants"; docs/specs/analyses/variantChecks.md, "The panel"), and
 * the agreement of the two types of the state of a bin, core's, which
 * the description and the CSV read, and that of src/charts, which the
 * rows of a histogram give: core may not import src/charts, so the two
 * are written apart, and this file, which may import both, fails to
 * type check when they drift apart.
 */
import { describe, expect, expectTypeOf, test } from "vitest";

import type { DescribedBin } from "../../../core/analyses/words.ts";
import type { Notice } from "../../../core/store.ts";
import type { BinState, HistogramRow } from "../../../charts/histogram.ts";
import { failureText } from "../../analyses/words.ts";
import { readAgainCommand } from "./commands.ts";
import {
  CALCULATE_AGAIN,
  VARIANT_HISTOGRAMS,
  binCells,
  histogramThreshold,
  histogramTitle,
  histogramsCaption,
  removedText,
  thresholdText,
} from "./histogramWords.ts";

/** A notice of a change of the load, of the kind `kind`, a new load
    unless `description` says otherwise. */
function notice(
  kind: Notice["cause"]["kind"],
  description = "a new variants file was loaded",
): Notice {
  return {
    cause: { kind, description },
    removed: ["variantChecks"],
    leftBehind: [],
    stopped: [],
    writeLeftBehind: false,
    writeStopped: false,
    writeDiscarded: false,
  };
}

describe("VS6 D2 the words of the histograms of the variants", () => {
  test("the state of a bin is the same three words in core and in src/charts", () => {
    expectTypeOf<DescribedBin["state"]>().toEqualTypeOf<BinState | null>();
    // The rows of a histogram are what the screen gives the description
    // and the CSV of core.
    expectTypeOf<HistogramRow>().toExtend<DescribedBin>();
  });

  test("the title with the mean to four decimals, and with no mean", () => {
    expect(histogramTitle("Major allele frequency", 0.7163445463101891)).toBe(
      "Major allele frequency, mean 0.7163",
    );
    expect(histogramTitle("Major allele frequency", Number.NaN)).toBe(
      "Major allele frequency, no mean",
    );
  });

  test("the threshold and the rows of its legend", () => {
    expect(histogramThreshold(0.95)).toEqual({
      value: 0.95,
      label: "Maximum 0.95",
      keptLabel: "Kept by this filter",
      removedLabel: "Removed by this filter",
    });
    expect(thresholdText("the MAF filter", 0.9)).toBe(
      "Threshold of the MAF filter: 0.9, drawn over every variant of the file",
    );
  });

  test("the three histograms, their axes and their tables", () => {
    expect(VARIANT_HISTOGRAMS.maf.name).toBe("Major allele frequency");
    expect(VARIANT_HISTOGRAMS.obsHet.name).toBe("Observed heterozygosity");
    expect(VARIANT_HISTOGRAMS.unbiasedExpHet.name).toBe(
      "Expected heterozygosity (unbiased)",
    );
    for (const words of Object.values(VARIANT_HISTOGRAMS)) {
      expect(words.countLabel).toBe("Variants");
    }
    expect(VARIANT_HISTOGRAMS.maf.filterName).toBe("the MAF filter");
    expect(VARIANT_HISTOGRAMS.obsHet.filterName).toBe(
      "the filter of the variants by observed heterozygosity",
    );
    expect(VARIANT_HISTOGRAMS.unbiasedExpHet.filterName).toBeNull();
  });

  test("the caption of the three, over every individual, over the individuals the filters of individuals keep, and over one", () => {
    expect(histogramsCaption(1200, "panel.nei", null)).toBe(
      "Over the 1,200 variants of panel.nei, before any filter.",
    );
    expect(histogramsCaption(1200, "panel.nei", 111)).toBe(
      "Over the 1,200 variants of panel.nei and the 111 individuals the filters of individuals keep, before any filter of the variants.",
    );
    expect(histogramsCaption(1, "a\tb.vcf", 1)).toBe(
      "Over the 1 variant of a\\tb.vcf and the one individual the filters of individuals keep, before any filter of the variants.",
    );
  });

  test("the cells of a bin: the edges to 12 significant digits, the count grouped, the state in words", () => {
    expect(
      binCells({
        from: 0.07500000000000001,
        to: 0.1,
        toIncluded: false,
        count: 1234,
        state: null,
      }),
    ).toEqual(["0.075", "0.1", "1,234"]);
    expect(
      binCells({
        from: 0.5,
        to: 0.525,
        toIncluded: false,
        count: 62,
        state: "partlyKept",
      }),
    ).toEqual(["0.5", "0.525", "62", "Partly kept"]);
    expect(
      binCells({ from: 0, to: 1, toIncluded: true, count: 1, state: "kept" }),
    ).toEqual(["0", "1", "1", "Kept"]);
    expect(
      binCells({
        from: 0.975,
        to: 1,
        toIncluded: true,
        count: 3,
        state: "removed",
      }),
    ).toEqual(["0.975", "1", "3", "Removed"]);
  });

  test("the words of a failure ask to calculate them again, and not to run it", () => {
    expect(
      failureText(
        { kind: "workerFailed", message: "trap" },
        "panel.nei",
        CALCULATE_AGAIN,
      ),
    ).toBe(
      "The calculation stopped unexpectedly. Calculate them again. If it stops again, load panel.nei again in the Variants step.",
    );
    expect(
      failureText(
        { kind: "defect", message: "a bad answer" },
        "panel.nei",
        CALCULATE_AGAIN,
      ),
    ).toBe(
      "The application met an error of its own: a bad answer. Calculate them again.",
    );
  });

  test("the words of the histograms removed by a read of the same file with other options, and its undo", () => {
    const { description } = readAgainCommand({
      fileId: "b".repeat(32),
      name: "panel.vcf.gz",
      size: 1000,
      format: "vcf",
      readOptions: { ploidy: 4, onlyPassed: true },
    });
    expect(removedText(notice("command", description))).toBe(
      "The histograms of the variants were removed because the variants file was read again with other options. Undo brings them back as they were, with no calculation; Calculate makes them anew for the file loaded now.",
    );
    expect(removedText(notice("undo", description))).toBe(
      "Undone: the variants file was read again with other options. The histograms of the variants were removed; Redo brings them back as they were, with no calculation, and Calculate makes them anew for the file loaded now.",
    );
  });

  test("the words of the histograms removed by a change of a filter of individuals end with the settings as they are now", () => {
    const description = "the filter of individuals by missing data changed";
    expect(removedText(notice("command", description))).toBe(
      "The histograms of the variants were removed because the filter of individuals by missing data changed. Undo brings them back as they were, with no calculation; Calculate makes them anew for the settings as they are now.",
    );
    expect(removedText(notice("undo", description))).toBe(
      "Undone: the filter of individuals by missing data changed. The histograms of the variants were removed; Redo brings them back as they were, with no calculation, and Calculate makes them anew for the settings as they are now.",
    );
  });

  test("the words of the histograms removed, after a command, an undo and a redo", () => {
    expect(removedText(notice("command"))).toBe(
      "The histograms of the variants were removed because a new variants file was loaded. Undo brings them back as they were, with no calculation; Calculate makes them anew for the file loaded now.",
    );
    expect(removedText(notice("undo"))).toBe(
      "Undone: a new variants file was loaded. The histograms of the variants were removed; Redo brings them back as they were, with no calculation, and Calculate makes them anew for the file loaded now.",
    );
    expect(removedText(notice("redo"))).toBe(
      "Redone: a new variants file was loaded. The histograms of the variants were removed; Undo brings them back as they were, with no calculation, and Calculate makes them anew for the file loaded now.",
    );
  });
});
