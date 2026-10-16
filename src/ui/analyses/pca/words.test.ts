/**
 * The words of the PCA tab of popgen2.html (docs/specs/steps/popgen2-pca.md,
 * "Its filters", "While a PCA runs" and "Its words"): the line under the
 * heading of its filters, the names of the sliders of the missing data
 * and of the MAF, and the words of the lock of the filters while a PCA
 * runs, each by the method.
 */
import { describe, expect, test } from "vitest";
import { PCA2_LD_MAX_DIST } from "../../../core/analyses/pca.ts";
import { grouped } from "../../../core/project.ts";

import {
  DISTANCE_HINT,
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
    const pca = {
      id: "pca",
      name: "the PCA",
      tab: "PCA",
      readsPopulations: false,
      plural: false,
    };
    expect(filtersLockedText(pca, [])).toBe(
      "Stop the PCA in the PCA tab to change the filters; then press Run there to calculate it again.",
    );
    expect(filtersLockedText({ ...pca, name: "the PCoA" }, [])).toBe(
      "Stop the PCoA in the PCA tab to change the filters; then press Run there to calculate it again.",
    );
  });
});

describe("the line under the distance of the LD pruning (the owner, 16 October 2026)", () => {
  test("says that 100,000 bp is a start that suits many genomes and not all, where to see how far LD extends, and which distance of the LD decay to choose", () => {
    expect(DISTANCE_HINT).toBe(
      "100,000 bp is a start that suits many genomes but not all. The LD decay of the Populations tab shows how far LD extends in your data: choose a distance where its curve has flattened, well beyond the half distance.",
    );
  });

  test("the distance it names is the default of the page", () => {
    expect(DISTANCE_HINT.startsWith(`${grouped(PCA2_LD_MAX_DIST)} bp `)).toBe(
      true,
    );
  });
});
