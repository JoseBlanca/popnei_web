/**
 * The words of the PCA tab of popgen2.html (docs/specs/steps/popgen2-pca.md,
 * "Its filters", "While a PCA runs" and "Its words"): the line under the
 * heading of its filters, the names of the sliders of the missing data
 * and of the MAF, and the words of the lock of the filters while a PCA
 * runs, each by the method.
 */
import { describe, expect, test } from "vitest";

import {
  METHOD_ADVICE,
  METHOD_ITEMS,
  POPGEN2_METHOD_ITEMS,
  filtersHeading,
  popgen2FiltersLine,
  stricterSliderLabel,
} from "./words.ts";
import { filtersLockedText } from "../words.ts";

describe("AP10 D1 the words of the drop-down list of the method", () => {
  test("its two items, each short enough for one line, and the advice of the PCoA under it; the old page's radio buttons as they were", () => {
    expect(POPGEN2_METHOD_ITEMS.map((item) => item.label)).toEqual([
      "PCA of the genotypes",
      "PCoA of the Kosman distances",
    ]);
    expect(METHOD_ADVICE).toBe(
      "The PCoA suits data with many missing genotypes.",
    );
    expect(METHOD_ITEMS.map((item) => item.label)).toEqual([
      "PCA of the genotypes",
      "PCoA of the Kosman distances, for data with many missing genotypes",
    ]);
  });
});

describe("AP6 D1 the words of the PCA tab", () => {
  test("the heading of the filters and the line under it, by the method", () => {
    expect(filtersHeading("pca")).toBe("Filters of the variants for the PCA");
    expect(popgen2FiltersLine("pca")).toBe(
      "PCA filters can be stricter than the general analysis ones.",
    );
    expect(popgen2FiltersLine("pcoa")).toBe(
      "PCoA filters can be stricter than the general analysis ones.",
    );
  });

  test("the name of the slider of each filter of the PCA's own, by the method", () => {
    expect(stricterSliderLabel("missing_data", "pca")).toBe(
      "Maximum proportion of missing genotypes for the PCA",
    );
    expect(stricterSliderLabel("maf", "pca")).toBe(
      "Maximum major allele frequency for the PCA",
    );
    expect(stricterSliderLabel("maf", "pcoa")).toBe(
      "Maximum major allele frequency for the PCoA",
    );
  });

  test("the lock of the filters while a PCA runs, by the method", () => {
    expect(filtersLockedText({ name: "the PCA", tab: "PCA" })).toBe(
      "Stop the PCA in the PCA tab to change the filters; then press Run there to calculate it again.",
    );
    expect(filtersLockedText({ name: "the PCoA", tab: "PCA" })).toBe(
      "Stop the PCoA in the PCA tab to change the filters; then press Run there to calculate it again.",
    );
  });
});
