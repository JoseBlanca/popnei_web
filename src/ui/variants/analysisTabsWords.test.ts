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
  PAGE_TAB_LABELS,
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
  });

  test("the PCA with no variants file, one being opened, and one whose opening failed", () => {
    expect(greyedText("pca", { kind: "noVariants" })).toBe(
      "The PCA needs a variants file. Open one in the box Variants.",
    );
    expect(
      greyedText("pca", { kind: "variantsOpening", name: "panel.nei" }),
    ).toBe("The PCA needs a variants file: panel.nei is being opened.");
    expect(
      greyedText("pca", { kind: "variantsFailed", name: "panel.nei" }),
    ).toBe(
      "The PCA needs a variants file: panel.nei could not be opened; the box Variants says why and what to do.",
    );
  });

  test("Populations, the three of the PCA with its own subject", () => {
    expect(greyedText("populations", { kind: "noVariants" })).toBe(
      "The analyses of the populations need a variants file. Open one in the box Variants.",
    );
    expect(
      greyedText("populations", { kind: "variantsOpening", name: "panel.nei" }),
    ).toBe(
      "The analyses of the populations need a variants file: panel.nei is being opened.",
    );
    expect(
      greyedText("populations", { kind: "variantsFailed", name: "panel.nei" }),
    ).toBe(
      "The analyses of the populations need a variants file: panel.nei could not be opened; the box Variants says why and what to do.",
    );
  });

  test("Distances, the three of the PCA with its own subject", () => {
    expect(greyedText("distances", { kind: "noVariants" })).toBe(
      "The distances between populations need a variants file. Open one in the box Variants.",
    );
    expect(
      greyedText("distances", { kind: "variantsOpening", name: "panel.nei" }),
    ).toBe(
      "The distances between populations need a variants file: panel.nei is being opened.",
    );
    expect(
      greyedText("distances", { kind: "variantsFailed", name: "panel.nei" }),
    ).toBe(
      "The distances between populations need a variants file: panel.nei could not be opened; the box Variants says why and what to do.",
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
      "The distances between populations need at least two populations: panel_pops.csv could not be read; the box Individuals says why and what to do.",
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
      "The distances between populations need at least two populations, and country has 35 values, more than the 20 a column of populations can have. Choose another column in the box Individuals.",
    );
    expect(greyedText("distances", { kind: "noColumn" })).toBe(
      "The distances between populations need at least two populations, and no column of the populations is chosen. Choose one in the box Individuals.",
    );
  });

  test("Distances with no column to choose but the names of the individuals, of a text file and of an xlsx", () => {
    expect(
      greyedText("distances", {
        kind: "noColumnToChoose",
        name: "panel_pops.csv",
        textFile: true,
        oneColumn: true,
      }),
    ).toBe(
      "The distances between populations need at least two populations, and panel_pops.csv was read as a single column, the names of the individuals. If its columns are separated by another character, choose that separator in the Individuals tab.",
    );
    expect(
      greyedText("distances", {
        kind: "noColumnToChoose",
        name: "panel_pops.xlsx",
        textFile: false,
        oneColumn: true,
      }),
    ).toBe(
      "The distances between populations need at least two populations, and panel_pops.xlsx has no column to choose besides the names of the individuals. Add a column of the populations to it and open it again in the Individuals tab.",
    );
  });

  test("Distances with no column to choose, the other columns of the file all of true or false", () => {
    for (const textFile of [true, false]) {
      expect(
        greyedText("distances", {
          kind: "noColumnToChoose",
          name: "panel_pops.csv",
          textFile,
          oneColumn: false,
        }),
      ).toBe(
        "The distances between populations need at least two populations, and panel_pops.csv has no column of text to choose as the column of the populations: its other columns hold only true or false. Add a column of the populations to it and open it again in the Individuals tab.",
      );
    }
  });

  test("Distances with fewer than two populations among the individuals of the variants file", () => {
    expect(greyedText("distances", fewPopulations(1, false))).toBe(
      "The distances between populations need at least two populations, and popcat gives 1 population among the individuals of panel.nei. Choose another column of the populations in the box Individuals, or add the populations to panel_pops.csv and open it again.",
    );
    expect(greyedText("distances", fewPopulations(0, true))).toBe(
      "The distances between populations need at least two populations, and no individual of panel.nei is in panel_pops.csv. Check that panel_pops.csv names the individuals as panel.nei does.",
    );
    expect(greyedText("distances", fewPopulations(0, false))).toBe(
      "The distances between populations need at least two populations, and no individual of panel.nei has a value in popcat. Choose another column of the populations in the box Individuals, or add the populations to panel_pops.csv and open it again.",
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
      greyedText("pca", { kind: "variantsOpening", name: "pan\u202eel.nei" }),
    ).toBe("The PCA needs a variants file: pan\\u202eel.nei is being opened.");
    expect(
      greyedText("distances", {
        kind: "tooManyValues",
        column: "c".repeat(50),
        numValues: 1234,
      }),
    ).toBe(
      `The distances between populations need at least two populations, and ${"c".repeat(40)}… has 1,234 values, more than the 20 a column of populations can have. Choose another column in the box Individuals.`,
    );
  });

  test("the name of the variants file is escaped in a failed opening, of each tab", () => {
    for (const [tab, subject] of [
      ["pca", "The PCA needs"],
      ["populations", "The analyses of the populations need"],
      ["distances", "The distances between populations need"],
    ] as const) {
      expect(
        greyedText(tab, { kind: "variantsFailed", name: "pan\u202eel.nei" }),
      ).toBe(
        `${subject} a variants file: pan\\u202eel.nei could not be opened; the box Variants says why and what to do.`,
      );
    }
  });

  test("the name of the individuals file is escaped while it is read, when it failed, and when it has no column to choose", () => {
    const start =
      "The distances between populations need at least two populations";
    expect(
      greyedText("distances", {
        kind: "individualsReading",
        name: "pops\u202e.csv",
      }),
    ).toBe(`${start}: pops\\u202e.csv is being read.`);
    expect(
      greyedText("distances", {
        kind: "individualsFailed",
        name: "pops\u202e.csv",
      }),
    ).toBe(
      `${start}: pops\\u202e.csv could not be read; the box Individuals says why and what to do.`,
    );
    expect(
      greyedText("distances", {
        kind: "noColumnToChoose",
        name: "pops\u202e.csv",
        textFile: true,
        oneColumn: true,
      }),
    ).toBe(
      `${start}, and pops\\u202e.csv was read as a single column, the names of the individuals. If its columns are separated by another character, choose that separator in the Individuals tab.`,
    );
  });

  test("the names of the files and the column are escaped in the reasons of fewer than two populations", () => {
    const start =
      "The distances between populations need at least two populations";
    const reason = (numPopulations: 0 | 1, noneInFile: boolean): TabGreyed => ({
      kind: "fewPopulations",
      column: "pop\u202ecat",
      numPopulations,
      variantsName: "pan\u202eel.nei",
      individualsName: "pops\u202e.csv",
      noneInFile,
    });
    expect(greyedText("distances", reason(1, false))).toBe(
      `${start}, and pop\\u202ecat gives 1 population among the individuals of pan\\u202eel.nei. Choose another column of the populations in the box Individuals, or add the populations to pops\\u202e.csv and open it again.`,
    );
    expect(greyedText("distances", reason(0, true))).toBe(
      `${start}, and no individual of pan\\u202eel.nei is in pops\\u202e.csv. Check that pops\\u202e.csv names the individuals as pan\\u202eel.nei does.`,
    );
    expect(greyedText("distances", reason(0, false))).toBe(
      `${start}, and no individual of pan\\u202eel.nei has a value in pop\\u202ecat. Choose another column of the populations in the box Individuals, or add the populations to pops\\u202e.csv and open it again.`,
    );
  });
});
