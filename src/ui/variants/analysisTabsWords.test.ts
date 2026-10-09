/**
 * The words of the row of five tabs of popgen2.html and of each reason a
 * tab of the analyses is greyed, asserted whole
 * (docs/specs/steps/popgen2-pca.md, "Its words", the rows of the tabs).
 */
import { describe, expect, test } from "vitest";

import type { TabGreyed } from "../../core/popgen2Tabs.ts";
import {
  greyedText,
  ANALYSES_TABS_LABEL,
  DISTANCES_NOT_BUILT,
  PAGE_TAB_LABELS,
  PCA_HEADING,
  POPULATIONS_NOT_BUILT,
} from "./analysisTabsWords.ts";

/** A reason of fewer than two populations of popcat in panel.nei. */
function fewPopulations(numPopulations: 0 | 1, noneInFile: boolean): TabGreyed {
  return {
    kind: "fewPopulations",
    column: "popcat",
    numPopulations,
    variantsName: "panel.nei",
    individualsName: "panel_pops.csv",
    noneInFile,
  };
}

describe("AP1 D3 the words of the row of tabs and of each reason", () => {
  test("the labels of the five tabs, in their order, and the name of the row", () => {
    expect(Object.values(PAGE_TAB_LABELS)).toEqual([
      "Variants",
      "Individuals",
      "PCA",
      "Populations",
      "Distances",
    ]);
    expect(ANALYSES_TABS_LABEL).toBe("Files and analyses");
    expect(PCA_HEADING).toBe("PCA");
  });

  test("the lines of the tabs not built yet", () => {
    expect(POPULATIONS_NOT_BUILT).toBe(
      "Not built yet: the diversity of each population, its site frequency spectrum and its LD decay come in a later version of the page.",
    );
    expect(DISTANCES_NOT_BUILT).toBe(
      "Not built yet: the distances between the populations, Hudson's Fst or Jost's D, come in a later version of the page.",
    );
  });

  test("the PCA with no variants file, one being opened, and one whose opening failed", () => {
    expect(greyedText("pca", { kind: "noVariants" })).toBe(
      "The PCA needs a variants file. Open one in the box Variants file.",
    );
    expect(
      greyedText("pca", { kind: "variantsOpening", name: "panel.nei" }),
    ).toBe("The PCA needs a variants file: panel.nei is being opened.");
    expect(
      greyedText("pca", { kind: "variantsFailed", name: "panel.nei" }),
    ).toBe(
      "The PCA needs a variants file: panel.nei could not be opened. Open another in the box Variants file.",
    );
  });

  test("Populations, the three of the PCA with its own subject", () => {
    expect(greyedText("populations", { kind: "noVariants" })).toBe(
      "The analyses of the populations need a variants file. Open one in the box Variants file.",
    );
    expect(
      greyedText("populations", { kind: "variantsOpening", name: "panel.nei" }),
    ).toBe(
      "The analyses of the populations need a variants file: panel.nei is being opened.",
    );
    expect(
      greyedText("populations", { kind: "variantsFailed", name: "panel.nei" }),
    ).toBe(
      "The analyses of the populations need a variants file: panel.nei could not be opened. Open another in the box Variants file.",
    );
  });

  test("Distances, the three of the PCA with its own subject", () => {
    expect(greyedText("distances", { kind: "noVariants" })).toBe(
      "The distances between populations need a variants file. Open one in the box Variants file.",
    );
    expect(
      greyedText("distances", { kind: "variantsOpening", name: "panel.nei" }),
    ).toBe(
      "The distances between populations need a variants file: panel.nei is being opened.",
    );
    expect(
      greyedText("distances", { kind: "variantsFailed", name: "panel.nei" }),
    ).toBe(
      "The distances between populations need a variants file: panel.nei could not be opened. Open another in the box Variants file.",
    );
  });

  test("Distances with no individuals file, one being read, and one refused", () => {
    expect(greyedText("distances", { kind: "noIndividuals" })).toBe(
      "The distances between populations need at least two populations. Open an individuals file that assigns the individuals to them.",
    );
    expect(
      greyedText("distances", {
        kind: "individualsReading",
        name: "panel_pops.csv",
      }),
    ).toBe(
      "The distances between populations need at least two populations: panel_pops.csv is being read.",
    );
    expect(
      greyedText("distances", {
        kind: "individualsFailed",
        name: "panel_pops.csv",
      }),
    ).toBe(
      "The distances between populations need at least two populations: panel_pops.csv could not be read. Open another in the box Individuals file.",
    );
  });

  test("Distances with a column of too many values, and with none chosen", () => {
    expect(
      greyedText("distances", {
        kind: "tooManyValues",
        column: "country",
        numValues: 35,
      }),
    ).toBe(
      "The distances between populations need at least two populations, and country has 35 values, more than the 20 a column of populations can have. Choose another column in the box Individuals file.",
    );
    expect(greyedText("distances", { kind: "noColumn" })).toBe(
      "The distances between populations need at least two populations, and no column of the populations is chosen. Choose one in the box Individuals file.",
    );
  });

  test("Distances with fewer than two populations among the individuals of the variants file", () => {
    expect(greyedText("distances", fewPopulations(1, false))).toBe(
      "The distances between populations need at least two populations, and popcat gives 1 among the individuals of panel.nei. Choose another column in the box Individuals file.",
    );
    expect(greyedText("distances", fewPopulations(0, true))).toBe(
      "The distances between populations need at least two populations, and no individual of panel.nei is in panel_pops.csv. Check that panel_pops.csv names the individuals as panel.nei does.",
    );
    expect(greyedText("distances", fewPopulations(0, false))).toBe(
      "The distances between populations need at least two populations, and no individual of panel.nei has a value in popcat. Choose another column in the box Individuals file.",
    );
  });

  test("Distances with the filters keeping individuals of fewer than two populations", () => {
    expect(
      greyedText("distances", { kind: "fewKept", numPopulations: 1 }),
    ).toBe(
      "The distances between populations need at least two populations, and the filters keep individuals of 1 population. Loosen the filters of the individuals in the Variants tab.",
    );
    expect(
      greyedText("distances", { kind: "fewKept", numPopulations: 0 }),
    ).toBe(
      "The distances between populations need at least two populations, and the filters keep no individual of any population. Loosen the filters of the individuals in the Variants tab.",
    );
  });

  test("a name of the user's files is escaped, and a column cut", () => {
    expect(
      greyedText("pca", { kind: "variantsOpening", name: "pan‮el.nei" }),
    ).toBe("The PCA needs a variants file: pan\\u202eel.nei is being opened.");
    expect(
      greyedText("distances", {
        kind: "tooManyValues",
        column: "c".repeat(50),
        numValues: 1234,
      }),
    ).toBe(
      `The distances between populations need at least two populations, and ${"c".repeat(40)}… has 1,234 values, more than the 20 a column of populations can have. Choose another column in the box Individuals file.`,
    );
  });
});
