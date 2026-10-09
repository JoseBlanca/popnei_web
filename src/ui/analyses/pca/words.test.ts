/**
 * The words of the PCA tab of popgen2.html (docs/specs/steps/popgen2-pca.md,
 * "Its filters", "While a PCA runs" and "Its words"): the line under the
 * heading of its filters, the two radio buttons of the missing data and of
 * the MAF, the label of the field of each made stricter, and the words of
 * the lock of the filters while a PCA runs, each by the method.
 */
import { describe, expect, test } from "vitest";

import type { ProjectVariantFilter } from "../../../core/project.ts";
import {
  filtersHeading,
  popgen2FiltersLine,
  stricterFieldLabel,
  stricterLabel,
  tabFollowLabel,
} from "./words.ts";
import { filtersLockedText } from "../words.ts";

const FILTERS: readonly ProjectVariantFilter[] = [
  { kind: "missing_data", maxAllowedMissingRate: 0.1 },
  { kind: "maf", maxAllowedMaf: 0.95 },
];

describe("AP6 D1 the words of the PCA tab", () => {
  test("the heading of the filters and the line under it, by the method", () => {
    expect(filtersHeading("pca")).toBe("Filters of the variants for the PCA");
    expect(popgen2FiltersLine("pca")).toBe(
      "The PCA reads the variants the Variants tab keeps. Its own missing data and MAF filters can only be stricter.",
    );
    expect(popgen2FiltersLine("pcoa")).toBe(
      "The PCoA reads the variants the Variants tab keeps. Its own missing data and MAF filters can only be stricter.",
    );
  });

  test("the radio buttons: as in the Variants tab, with its value as its box writes it or off, and stricter for the PCA or the PCoA", () => {
    expect(tabFollowLabel("missing_data", FILTERS)).toBe(
      "As in the Variants tab: 0.1",
    );
    expect(tabFollowLabel("maf", FILTERS)).toBe("As in the Variants tab: 0.95");
    expect(
      tabFollowLabel("missing_data", [
        { kind: "missing_data", maxAllowedMissingRate: 0.0035 },
      ]),
    ).toBe("As in the Variants tab: 0.0035");
    expect(tabFollowLabel("maf", FILTERS.slice(0, 1))).toBe(
      "As in the Variants tab: off",
    );
    expect(stricterLabel("pca")).toBe("Stricter for the PCA");
    expect(stricterLabel("pcoa")).toBe("Stricter for the PCoA");
  });

  test("the label of a field made stricter, with its upper end", () => {
    expect(stricterFieldLabel("missing_data", 0.1)).toBe(
      "Maximum proportion of missing genotypes, from 0 to 0.1",
    );
    expect(stricterFieldLabel("maf", 0.95)).toBe(
      "Maximum major allele frequency, from 0 to 0.95",
    );
    expect(stricterFieldLabel("maf", 1)).toBe(
      "Maximum major allele frequency, from 0 to 1",
    );
  });

  test("the lock of the filters while a PCA runs, by the method", () => {
    expect(filtersLockedText("the PCA")).toBe(
      "Stop the PCA to change the filters.",
    );
    expect(filtersLockedText("the PCoA")).toBe(
      "Stop the PCoA to change the filters.",
    );
  });
});
