/**
 * The pure parts of the panel of the principal components
 * (docs/specs/analyses/pca.md, "The panel"): its words, the commands of
 * its options, the data of its two plots, and its notes, on the sample
 * project of core, its four individuals, and results written here.
 */
import { describe, expect, test } from "vitest";

import {
  pca,
  pcaColours,
  pcaOptions,
  pcaRows,
} from "../../../core/analyses/pca.ts";
import type { PcaColours } from "../../../core/analyses/pca.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import { setAnalysisOptions } from "../../../core/project.ts";
import type { Project, ProjectVariantFilter } from "../../../core/project.ts";
import { sampleProject } from "../../../core/testSupport.ts";
import type { PcaResult } from "../../../worker/protocol.ts";
import {
  axisCommand,
  colourCommand,
  followCommand,
  methodCommand,
  ownValueCommand,
  viewCommand,
} from "./commands.ts";
import { failedAddressOf } from "./load3d.ts";
import { notesAppeared, notesOf } from "./notes.ts";
import {
  componentColumn,
  pca3dData,
  pointColours,
  scatterData,
} from "./plotData.ts";
import {
  axisLabel,
  coordinateText,
  decompositionLine,
  filtersHeading,
  filtersLine,
  followLabel,
  marksNote,
  pcoaVarianceLine,
  plotTitle,
  readyLines,
  rowCells,
  sortedRows,
  tableCaption,
  tableCsvName,
  valueText,
  varianceCaption,
  varianceCsvName,
} from "./words.ts";

/** A result of the four individuals of the sample project, i1 to i4, on
    three components. */
function result(over: Partial<PcaResult> = {}): PcaResult {
  return Object.freeze<PcaResult>({
    analysis: "pca",
    method: "pca",
    individuals: ["i1", "i2", "i3", "i4"],
    numComps: 3,
    numCompsFound: 3,
    projections: Float64Array.from([
      1, 2, 3, -1.23456, 0.5, 6, 7, 8, 9, 10, 11, -0.00001,
    ]),
    explainedVariancePercent: Float64Array.from([40.125, 30, 20]),
    numVarsUsed: 548,
    lingoesConstant: null,
    negativeEigenvaluesPercent: null,
    passStats: { numVars: 600, filtering: {} },
    ...over,
  });
}

/** The sample project with the PCA's colour or axes set. */
function withOptions(
  p: Project,
  options: { readonly colourBy?: string; readonly axes?: readonly number[] },
): Project {
  return setAnalysisOptions(p, pca, {
    method: "pca",
    missingData: { follow: true, maxAllowedMissingRate: 0.1 },
    maf: { follow: true, maxAllowedMaf: 0.95 },
    ld: { follow: true, maxAllowedR2: 0.1, maxDist: null },
    colourBy: options.colourBy ?? null,
    axes: [...(options.axes ?? [1, 2, 3])],
    view: "3d",
  });
}

describe("IP8 panel: the words of the options", () => {
  test("the heading and its line say the method", () => {
    expect(filtersHeading("pca")).toBe("Filters of the variants for the PCA");
    expect(filtersLine("pcoa")).toBe(
      "The PCoA uses the filters of the Variants step. Set a filter here to use another value for the PCoA alone.",
    );
  });

  test("a filter that follows the Variants step says what the step has on, off, or an LD filter with no distance", () => {
    const filters: readonly ProjectVariantFilter[] = [
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "ld", maxAllowedR2: 0.3, maxDist: 10000 },
    ];
    expect(followLabel("missing_data", filters)).toBe(
      "As in the Variants step: 0.1",
    );
    expect(followLabel("maf", filters)).toBe("As in the Variants step: off");
    expect(followLabel("ld", filters)).toBe(
      "As in the Variants step: r² at most 0.3 within 10000 base pairs",
    );
    expect(
      followLabel("ld", [{ kind: "ld", maxAllowedR2: 0.3, maxDist: null }]),
    ).toBe(
      "As in the Variants step: r² at most 0.3, its distance still to be typed there",
    );
  });

  test("the individuals a run will take: all of them, those the filters keep, and those the lists keep while a threshold waits", () => {
    const p = sampleProject();
    const all: IndividualsKept = {
      list: { kind: "known", individuals: null },
      byLists: ["i1", "i2", "i3", "i4"],
      counts: [],
    };
    expect(readyLines(p, all)).toEqual(["4 individuals of panel.nei"]);
    expect(
      readyLines(p, { ...all, list: { kind: "known", individuals: ["i1"] } }),
    ).toEqual([
      "1 of the 4 individuals of panel.nei, those the filters of individuals keep",
    ]);
    const waiting = readyLines(p, {
      ...all,
      list: { kind: "needsStatistics" },
      byLists: ["i1", "i2", "i3"],
    });
    expect(waiting[0]).toBe(
      "3 of the 4 individuals of panel.nei, those the filters of individuals keep",
    );
    expect(waiting[1]).toMatch(
      /^Run calculates the statistics of each individual first/,
    );
    expect(readyLines(p, null)).toEqual([]);
  });

  test("the line under the bar names the variants file", () => {
    expect(decompositionLine("panel.nei")).toBe(
      "The bar shows the reading of panel.nei. The components are calculated once it is read, and the bar does not move meanwhile: from under a second for 1,000 individuals to minutes for several thousand.",
    );
  });
});

describe("IP8 panel: the commands of the options", () => {
  test("each option is one command with its description, and the others are kept", () => {
    const p = sampleProject();
    const method = methodCommand("pcoa");
    expect(method.description).toBe(
      "the method of the principal components changed",
    );
    expect(pcaOptions(method.command(p)).method).toBe("pcoa");

    const own = followCommand("ld", false);
    expect(own.description).toBe(
      "the LD filter of the principal components was set for them alone",
    );
    const owned = own.command(p);
    expect(pcaOptions(owned).ld).toEqual({
      follow: false,
      maxAllowedR2: 0.1,
      maxDist: null,
    });
    const typed = ownValueCommand({ kind: "ld", maxDist: 50000 });
    expect(typed.description).toBe(
      "the LD filter of the principal components changed",
    );
    const withDist = typed.command(owned);
    const back = followCommand("ld", true);
    expect(back.description).toBe(
      "the LD filter of the principal components was set back to that of the Variants step",
    );
    // Set back, the values are kept for the next time.
    expect(pcaOptions(back.command(withDist)).ld).toEqual({
      follow: true,
      maxAllowedR2: 0.1,
      maxDist: 50000,
    });
    expect(
      pcaOptions(followCommand("missing_data", false).command(p)).missingData,
    ).toEqual({
      follow: false,
      maxAllowedMissingRate: 0.1,
    });
    expect(
      pcaOptions(
        ownValueCommand({ kind: "maf", maxAllowedMaf: 0.9 }).command(p),
      ).maf,
    ).toEqual({ follow: true, maxAllowedMaf: 0.9 });
    expect(pcaOptions(colourCommand("height").command(p)).colourBy).toBe(
      "height",
    );
    expect(colourCommand(null).description).toBe(
      "the colour of the points of the principal components changed",
    );
    const twoD = viewCommand("2d");
    expect(twoD.description).toBe("the principal components were drawn in 2D");
    const after = pcaOptions(twoD.command(withDist));
    expect(after.view).toBe("2d");
    expect(after.ld).toEqual(pcaOptions(withDist).ld);
    expect(after.method).toBe("pca");
  });

  test("a missing data filter and a MAF filter set back keep the values typed, and set again give them back", () => {
    const p = sampleProject();
    const typed = ownValueCommand({
      kind: "missing_data",
      maxAllowedMissingRate: 0.02,
    }).command(followCommand("missing_data", false).command(p));
    const back = followCommand("missing_data", true).command(typed);
    expect(pcaOptions(back).missingData).toEqual({
      follow: true,
      maxAllowedMissingRate: 0.02,
    });
    expect(
      pcaOptions(followCommand("missing_data", false).command(back))
        .missingData,
    ).toEqual({ follow: false, maxAllowedMissingRate: 0.02 });
    const maf = ownValueCommand({ kind: "maf", maxAllowedMaf: 0.98 }).command(
      followCommand("maf", false).command(p),
    );
    expect(pcaOptions(followCommand("maf", true).command(maf)).maf).toEqual({
      follow: true,
      maxAllowedMaf: 0.98,
    });
  });

  test("choosing for an axis the component another shows swaps the two, in one command", () => {
    const p = sampleProject();
    const swapped = axisCommand([1, 2, 3], 0, 2);
    expect(swapped.description).toBe("the components on the axes changed");
    expect(pcaOptions(swapped.command(p)).axes).toEqual([2, 1, 3]);
    expect(pcaOptions(axisCommand([1, 2, 3], 2, 7).command(p)).axes).toEqual([
      1, 2, 7,
    ]);
    // Axes beyond the result: the choice starts from those shown.
    const beyond = withOptions(p, { axes: [4, 5, 6] });
    expect(
      pcaOptions(axisCommand([1, 2, 3], 1, 3).command(beyond)).axes,
    ).toEqual([1, 3, 2]);
    // Two components shown, the third of the options repeating one of them.
    const repeating = withOptions(p, { axes: [3, 1, 2] });
    expect(
      pcaOptions(axisCommand([2, 1], 0, 1).command(repeating)).axes,
    ).toEqual([1, 2, 3]);
  });
});

describe("IP8 panel: the data of the plots", () => {
  test("a component is a column of the projections", () => {
    expect(Array.from(componentColumn(result(), 2))).toEqual([2, 0.5, 8, 11]);
    expect(() => componentColumn(result(), 4)).toThrow(/popnei_web defect/);
  });

  test("the 2D and 3D data share the colours, the highlight, the labels and the title", () => {
    const r = result();
    const p = sampleProject();
    const c = pcaColours(r, p);
    const flat = scatterData(r, c, [2, 1, 3], 1, p);
    expect(flat.title).toBe("Principal components, PC2 and PC1");
    expect(flat.xLabel).toBe("PC2 (30.00%)");
    expect(flat.yLabel).toBe("PC1 (40.13%)");
    expect(Array.from(flat.x)).toEqual([2, 0.5, 8, 11]);
    expect(flat.colours).toEqual({
      kind: "groups",
      title: "Population",
      group: c.kind === "groups" ? c.group : null,
      names: ["P1", "P2"],
      noneName: "No population",
      highlighted: 1,
    });
    expect(flat.description).toMatch(
      /^Principal components of 4 individuals of panel\.nei, PC2/,
    );
    const deep = pca3dData(r, c, [1, 2, 3], null, p);
    expect(deep.axisLabels).toEqual([
      "PC1 (40.13%)",
      "PC2 (30.00%)",
      "PC3 (20.00%)",
    ]);
    expect(Array.from(deep.z)).toEqual([3, 6, 9, -0.00001]);
    expect(deep.title).toBe("Principal components, PC1, PC2 and PC3");
    expect(deep.description).toMatch(/in 3D/);
  });

  test("the 3D data of other components name them for the tooltip, with their labels and their highlight", () => {
    const r = result();
    const p = sampleProject();
    const c = pcaColours(r, p);
    const deep = pca3dData(r, c, [3, 1, 2], 0, p);
    expect(deep.axisNames).toEqual(["PC3", "PC1", "PC2"]);
    expect(deep.axisLabels).toEqual([
      "PC3 (20.00%)",
      "PC1 (40.13%)",
      "PC2 (30.00%)",
    ]);
    expect(Array.from(deep.x)).toEqual([3, 6, 9, -0.00001]);
    expect(deep.colours).toMatchObject({ kind: "groups", highlighted: 0 });
    expect(deep.title).toBe("Principal components, PC3, PC1 and PC2");
  });

  test("a colouring by values has no highlight", () => {
    const c: PcaColours = {
      kind: "values",
      title: "height",
      values: Float64Array.from([1, 2]),
      numNone: 0,
      noneName: "No value",
      note: null,
    };
    expect(pointColours(c, 3)).toEqual({
      kind: "values",
      title: "height",
      values: c.values,
      noneName: "No value",
    });
  });
});

describe("IP8 panel: the explained variance and the table", () => {
  test("the captions, the line of the PCoA, the cells and the names of the downloads", () => {
    const r = result({ numCompsFound: 199 });
    expect(varianceCaption(r)).toBe(
      "The variance of the individuals explained by each component, of the 199 components of the PCA.",
    );
    expect(tableCaption(r, "panel.nei")).toBe(
      "The place of each of the 4 individuals of panel.nei on the first 3 of the 199 components, from 548 variants.",
    );
    expect(pcoaVarianceLine(r)).toBeNull();
    const pcoa = result({
      method: "pcoa",
      numCompsFound: 198,
      numVarsUsed: null,
      lingoesConstant: 0.023674522901958598,
      negativeEigenvaluesPercent: 7.87,
    });
    expect(pcoaVarianceLine(pcoa)).toBe(
      "The percentages are of the Kosman distances after Lingoes' correction, which added 0.047 to the square of every distance, as the warning says; over all the 198 components of the PCoA they add up to 100.",
    );
    expect(tableCaption(pcoa, "panel.nei")).toMatch(/from 600 variants\.$/);
    expect(
      pcoaVarianceLine(
        result({ method: "pcoa", numCompsFound: 39, lingoesConstant: 0 }),
      ),
    ).toBe(
      "The Kosman distances of these individuals can all be drawn in one space, so they were not corrected; over all the 39 components of the PCoA the percentages add up to 100.",
    );
    expect(coordinateText(-0.71388533)).toBe("−0.7139");
    expect(coordinateText(-0.00001)).toBe("0.0000");
    expect(valueText(-2060)).toBe("−2060");
    expect(valueText(0.07500000000000001)).toBe("0.075");
    expect(axisLabel(r, 1)).toBe("PC1 (40.13%)");
    expect(plotTitle([1, 2])).toBe("Principal components, PC1 and PC2");
    expect(tableCsvName("panel.vcf.gz", "pca")).toBe("panel.pca.csv");
    expect(varianceCsvName("panel.nei", "pcoa")).toBe(
      "panel.pcoa_variance.csv",
    );
    const rows = pcaRows(r, pcaColours(r, sampleProject()));
    const second = rows[1];
    if (second === undefined) throw new Error("no second row");
    expect(rowCells(second, "No population")).toEqual([
      "i2",
      "P1",
      "−1.2346",
      "0.5000",
      "6.0000",
    ]);
    // An individual in no group is named as the legend names it.
    expect(rowCells({ ...second, colour: null }, "No value")[1]).toBe(
      "No value",
    );
  });

  test("the rows sorted by a component, by the colour with none last, and not sorted", () => {
    const r = result();
    const rows = pcaRows(r, pcaColours(r, sampleProject()));
    expect(sortedRows(rows, null)).toBe(rows);
    expect(
      sortedRows(rows, { column: "pc1", direction: "descending" }).map(
        (row) => row.individual,
      ),
    ).toEqual(["i4", "i3", "i1", "i2"]);
    const withNone = rows.map((row, i) =>
      i === 0 ? { ...row, colour: null } : row,
    );
    for (const direction of ["ascending", "descending"] as const) {
      expect(
        sortedRows(withNone, { column: "colour", direction }).at(-1)
          ?.individual,
      ).toBe("i1");
    }
  });
});

describe("IP8 panel: the notes", () => {
  test("the marks that repeat past 49 groups, and the notes a change made appear", () => {
    const many: PcaColours = {
      kind: "groups",
      title: "collection",
      names: Array.from({ length: 60 }, (_, i) => `c${String(i)}`),
      group: new Uint16Array(60).map((_, i) => i),
      counts: Array.from({ length: 60 }, () => 1),
      numNone: 0,
      noneName: "No value",
      note: null,
    };
    expect(marksNote(many)).toBe(
      "The 60 values of collection are drawn with 49 marks, which repeat; the legend and the table tell them apart.",
    );
    expect(
      marksNote({
        ...many,
        counts: many.counts.map((c, i) => (i < 49 ? c : 0)),
      }),
    ).toBeNull();
    const r = result();
    const p = sampleProject();
    const byMissing = withOptions(p, { colourBy: "country" });
    const before = notesOf(r, p, null);
    const after = notesOf(r, byMissing, null);
    expect(before).toEqual([]);
    expect(notesAppeared(before, after)).toEqual([
      "pops.csv has no column country, by which the points were coloured, so they are coloured by the populations.",
    ]);
    // A note already there is not said again.
    expect(notesAppeared(after, after)).toEqual([]);
    const beyond = withOptions(p, { axes: [4, 5, 6] });
    expect(notesOf(r, beyond, null)).toEqual([
      "The axes chosen, PC4, PC5 and PC6, are beyond the 3 components of this result, so PC1, PC2 and PC3 are drawn.",
    ]);
  });
});

describe("IP10 D3 panel: the note of the missing genotypes", () => {
  test("IP10 D3 an individual that lacks more than 20% of its genotypes is named in a note under the plot, given the statistics of each individual, and in none without them", () => {
    const r = result();
    const p = sampleProject();
    const stats = {
      individuals: ["i1", "i2", "i3", "i4"],
      missingGtRate: Float64Array.from([0.25, 0.2, 0, 0.1]),
      obsHetRate: Float64Array.from([0.3, 0.3, 0.3, 0.3]),
    };
    expect(notesOf(r, p, stats)).toEqual([
      "i1 lacks more than 20% of its genotypes over the variants of panel.nei. The PCA gives a missing genotype the mean of its variant, which draws an individual toward the centre of the plot about as much as it lacks. The PCoA of the Kosman distances compares each pair over the variants both have called, and does not.",
    ]);
    expect(notesOf(r, p, null)).toEqual([]);
  });
});

describe("IP8 panel: the address a retry of the 3D view asks for", () => {
  test("the first address of http or https in the message of a failure, whatever its words, and none when it names none", () => {
    expect(
      failedAddressOf(
        new TypeError(
          "Failed to fetch dynamically imported module: http://localhost:4173/popnei_web/assets/pca3d-OokKI9tC.js",
        ),
      ),
    ).toBe("http://localhost:4173/popnei_web/assets/pca3d-OokKI9tC.js");
    expect(
      failedAddressOf(
        new Error(
          "error loading dynamically imported module: https://example.org/a/pca3d-x.js?retry=1",
        ),
      ),
    ).toBe("https://example.org/a/pca3d-x.js?retry=1");
    expect(
      failedAddressOf(new TypeError("Importing a module script failed.")),
    ).toBeNull();
  });
});
