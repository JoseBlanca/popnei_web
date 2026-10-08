import { describe, expect, test } from "vitest";
import { spectraCsv, spectraOf, spectrumWarnings } from "./sfs.ts";
import type { Project } from "../project.ts";
import {
  deepFreeze,
  noPopDiversity,
  sampleProject,
  withPassedOn,
} from "../testSupport.ts";
import type {
  DiversityResult,
  FilteringStats,
  VariantFilter,
} from "../../worker/protocol.ts";

/** A result of the diversity with the spectra `foldedSfs` at the draw
    `numCalledAlleles`, `numVarsInDraw` for each population, and the counts
    of the MAF filter `maf` in its pass when given. */
function result(fields: {
  readonly pops: readonly string[];
  readonly numCalledAlleles: number;
  readonly numVarsInDraw: readonly number[];
  readonly foldedSfs: readonly (readonly number[] | null)[];
  readonly maf?: FilteringStats;
}): DiversityResult {
  const numPops = fields.pops.length;
  const nan = (): Float64Array => new Float64Array(numPops).fill(NaN);
  return {
    analysis: "diversity",
    pops: fields.pops,
    numIndividuals: new Uint32Array(numPops).fill(50),
    unbiasedExpHet: nan(),
    obsHet: nan(),
    polyRatio: nan(),
    numVarsWithValue: new Uint32Array(numPops),
    ...noPopDiversity(numPops, fields.numCalledAlleles),
    numVarsInDraw: Uint32Array.from(fields.numVarsInDraw),
    foldedSfs: fields.foldedSfs.map((values) =>
      values === null ? null : Float64Array.from(values),
    ),
    passStats: {
      numVars: fields.maf?.varsKept ?? 1200,
      filtering: fields.maf === undefined ? {} : { maf: fields.maf },
    },
  };
}

/** The worked example of the spec: two populations at a draw of 4. */
function workedExample(): DiversityResult {
  return result({
    pops: ["p0", "p1"],
    numCalledAlleles: 4,
    numVarsInDraw: [5, 3],
    foldedSfs: [
      [1, 2, 2],
      [3, 0, 0],
    ],
  });
}

/** The project of the tests, frozen deeply, with the filters `filters`. */
function projectWith(filters: readonly VariantFilter[]): Project {
  const p = sampleProject();
  return deepFreeze<Project>({ ...p, filters });
}

describe("PA6 D6 the spectrum's module: spectraOf", () => {
  test("a population not given to popnei is not calculated and not in the CSV", () => {
    const r = result({
      pops: ["p0", "p1", "p3"],
      numCalledAlleles: 4,
      numVarsInDraw: [5, 3, 0],
      foldedSfs: [[1, 2, 2], [3, 0, 0], null],
    });
    const p3 = spectraOf(r).pops[2];
    expect(p3?.population).toBe("p3");
    expect(p3?.calculated).toBe(false);
    expect(p3?.variantsInDraw).toBe(0);
    expect(p3?.expected).toEqual(new Float64Array(0));
    expect(p3?.shares).toBeNull();
    expect(p3?.numIndividuals).toBe(50);
    expect(spectraCsv(r)).toBe(spectraCsv(workedExample()));
  });

  test("PA7 D2 each spectrum carries the individuals of its population, and a result with none for a population is a defect", () => {
    const r = workedExample();
    expect(spectraOf(r).pops.map((pop) => pop.numIndividuals)).toEqual([
      50, 50,
    ]);
    expect(() =>
      spectraOf({ ...workedExample(), numIndividuals: new Uint32Array(1) }),
    ).toThrow(/^popnei_web defect: /);
  });

  test("the worked example: the shares, the variants in the draw and the largest share", () => {
    const spectra = spectraOf(workedExample());
    expect(spectra.numCalledAlleles).toBe(4);
    const [first, second] = spectra.pops;
    expect(first?.population).toBe("p0");
    expect(first?.calculated).toBe(true);
    expect(first?.variantsInDraw).toBe(5);
    expect(first?.expected).toEqual(Float64Array.from([1, 2, 2]));
    expect(first?.shares).toEqual(Float64Array.from([0.5, 0.5]));
    expect(second?.population).toBe("p1");
    expect(second?.calculated).toBe(true);
    expect(second?.variantsInDraw).toBe(3);
    expect(second?.shares).toBeNull();
    expect(spectra.largestShare).toBe(0.5);
  });

  test("the same object for the same result", () => {
    const r = workedExample();
    expect(spectraOf(r)).toBe(spectraOf(r));
  });

  test("a spectrum of 2 values for a draw of 4 is a defect", () => {
    const r = result({
      pops: ["p0", "p1"],
      numCalledAlleles: 4,
      numVarsInDraw: [5, 3],
      foldedSfs: [
        [1, 2, 2],
        [3, 0],
      ],
    });
    expect(() => spectraOf(r)).toThrow(/^popnei_web defect: /u);
  });

  test("a spectrum missing for a population is a defect", () => {
    const r = result({
      pops: ["p0", "p1"],
      numCalledAlleles: 4,
      numVarsInDraw: [5, 3],
      foldedSfs: [[1, 2, 2]],
    });
    expect(() => spectraOf(r)).toThrow(/^popnei_web defect: /u);
  });

  test("an odd draw gives floor(n / 2) + 1 bins, the last with its share", () => {
    const r = result({
      pops: ["p0"],
      numCalledAlleles: 5,
      numVarsInDraw: [4],
      foldedSfs: [[0, 1, 3]],
    });
    expect(spectraOf(r).pops[0]?.shares).toEqual(
      Float64Array.from([0.25, 0.75]),
    );
    expect(spectraOf(r).largestShare).toBe(0.75);
  });

  // The case "A population that no variant counted for, or that reached
  // the draw at none" of sfs.md.
  test("a population calculated that reached the draw at no variant has a spectrum of zeros and no shares, and its rows of zeros with empty shares in the CSV", () => {
    const r = result({
      pops: ["p0", "p4"],
      numCalledAlleles: 4,
      numVarsInDraw: [5, 0],
      foldedSfs: [
        [1, 2, 2],
        [0, 0, 0],
      ],
    });
    const p4 = spectraOf(r).pops[1];
    expect(p4?.calculated).toBe(true);
    expect(p4?.variantsInDraw).toBe(0);
    expect(p4?.expected).toEqual(Float64Array.from([0, 0, 0]));
    expect(p4?.shares).toBeNull();
    expect(spectraOf(r).largestShare).toBe(0.5);
    expect(spectraCsv(r)).toBe(
      "population,rarer_allele,variants,share\n" +
        "p0,0,1,\n" +
        "p0,1,2,0.5\n" +
        "p0,2,2,0.5\n" +
        "p4,0,0,\n" +
        "p4,1,0,\n" +
        "p4,2,0,\n",
    );
  });

  test("with no population calculated the largest share is 0", () => {
    const r = result({
      pops: ["p0", "p1"],
      numCalledAlleles: 4,
      numVarsInDraw: [0, 0],
      foldedSfs: [null, null],
    });
    expect(spectraOf(r).largestShare).toBe(0);
    expect(spectraCsv(r)).toBe("population,rarer_allele,variants,share\n");
  });
});

describe("PA6 D6 the spectrum's module: spectraCsv", () => {
  test("the worked example, to the letter", () => {
    expect(spectraCsv(workedExample())).toBe(
      "population,rarer_allele,variants,share\n" +
        "p0,0,1,\n" +
        "p0,1,2,0.5\n" +
        "p0,2,2,0.5\n" +
        "p1,0,3,\n" +
        "p1,1,0,\n" +
        "p1,2,0,\n",
    );
  });

  test("a population's name with a comma is quoted", () => {
    const r = result({
      pops: ['north, "high"'],
      numCalledAlleles: 2,
      numVarsInDraw: [2],
      foldedSfs: [[1, 1]],
    });
    expect(spectraCsv(r)).toBe(
      "population,rarer_allele,variants,share\n" +
        '"north, ""high""",0,1,\n' +
        '"north, ""high""",1,1,1\n',
    );
  });
});

describe("PA10 spectraCsv and a name a spreadsheet would run as a formula", () => {
  test("a population named +north is written with a quote before it", () => {
    const r = result({
      pops: ["+north"],
      numCalledAlleles: 2,
      numVarsInDraw: [2],
      foldedSfs: [[1, 1]],
    });
    expect(spectraCsv(r)).toBe(
      "population,rarer_allele,variants,share\n" +
        "'+north,0,1,\n" +
        "'+north,1,1,1\n",
    );
  });
});

describe("PA6 D6 the spectrum's module: spectrumWarnings", () => {
  test("no warning without a MAF filter", () => {
    const p = projectWith([
      { kind: "missing_data", maxAllowedMissingRate: 0.05 },
    ]);
    expect(spectrumWarnings(workedExample(), p)).toEqual([]);
  });

  test("no warning for a MAF filter that kept every variant it was given", () => {
    const p = projectWith([{ kind: "maf", maxAllowedMaf: 0.95 }]);
    const r = result({
      pops: ["p0"],
      numCalledAlleles: 2,
      numVarsInDraw: [2],
      foldedSfs: [[1, 1]],
      maf: { varsProcessed: 1200, varsKept: 1200 },
    });
    expect(spectrumWarnings(r, p)).toEqual([]);
  });

  test("no warning for a MAF filter at 1, which removes only the variants with no called allele", () => {
    const p = projectWith([{ kind: "maf", maxAllowedMaf: 1 }]);
    const r = result({
      pops: ["p0"],
      numCalledAlleles: 2,
      numVarsInDraw: [2],
      foldedSfs: [[1, 1]],
      maf: { varsProcessed: 1200, varsKept: 1198 },
    });
    expect(spectrumWarnings(r, p)).toEqual([]);
  });

  test("the text of the flow's MAF filter at 0.95, to the letter", () => {
    const p = projectWith([
      { kind: "missing_data", maxAllowedMissingRate: 0.05 },
      { kind: "maf", maxAllowedMaf: 0.95 },
    ]);
    const r = result({
      pops: ["p0"],
      numCalledAlleles: 2,
      numVarsInDraw: [2],
      foldedSfs: [[1, 1]],
      maf: { varsProcessed: 1152, varsKept: 1128 },
    });
    expect(spectrumWarnings(r, p)).toEqual([
      {
        code: "mafFilterOnSpectrum",
        text: "The MAF filter of the Variants step removes the variants whose commonest allele is above 0.95 in the individuals kept, taken together, and it removed 24 of the 1,152 it was given. So the spectrum lacks many of the rare alleles, and its first bins are lower than those of the population. To see every variant in the spectrum, turn off the MAF filter in the Variants step.",
      },
    ]);
  });
});

describe("PA6 D6 the spectrum's module: the numbers of popnei", () => {
  // popnei's release js-v0.1.0-dev.3 under node 26.8.2, 30 September 2026:
  // calcPopDiversity of e2e/fixtures/panel.nei with the populations of
  // panel_pops.csv, numCalledAlleles 40, minNumIndividuals 20, stats
  // ["folded_sfs"], no filter (sfs.md, "The numbers of popnei").
  const PANEL: DiversityResult = result({
    pops: ["p0", "p2", "p1"],
    numCalledAlleles: 40,
    numVarsInDraw: [1200, 1200, 1200],
    foldedSfs: [
      [
        44.79323144486922, 38.07795856907602, 45.90929500071056,
        49.58828818728836, 53.132366448624396, 57.19228474015672,
        60.233726499348585, 61.61253751117249, 62.082502213503176,
        62.476412954270614, 63.00985963617158, 63.53282327580937,
        63.95279004314632, 64.30170342514248, 64.56242066707769,
        64.5792370934961, 64.15865743482942, 63.255856435947365,
        62.09214416480302, 61.100653301457186, 30.355250953099038,
      ],
      [
        48.34836722710054, 49.07990431264654, 50.67135834358706,
        51.35696231772572, 53.36052639575582, 56.06976946391264,
        58.798929485402866, 60.950292204761844, 62.303787683643556,
        63.029119969934456, 63.39164994923464, 63.5123818951802,
        63.36055366368545, 62.890486232626394, 62.15655604996026,
        61.31826497130863, 60.55831547395532, 59.99483831622564,
        59.650305031680304, 59.481263965432525, 29.716367046239476,
      ],
      [
        49.419228567305325, 43.859352021499134, 47.805999869396146,
        49.69306288199363, 51.70707205749801, 53.784645903947194,
        55.72624050850176, 57.68075715904365, 59.730613643607334,
        61.58158234273017, 62.85741537944473, 63.51842732885266,
        63.865087839130474, 64.18829740568917, 64.50865226392075,
        64.64129798345625, 64.4291028559367, 63.891976053621335,
        63.21794351723831, 62.666194351447665, 31.22705006573954,
      ],
    ],
  });

  test("panel.nei at a draw of 40 with no filter", () => {
    const [p0, p2, p1] = spectraOf(PANEL).pops;
    expect(p0?.shares?.[0]).toBe(0.03296202862168288);
    expect(p0?.shares?.[19]).toBe(0.026276898456079615);
    expect(p2?.shares?.[0]).toBe(0.042616971066566346);
    expect(p1?.shares?.[14]).toBe(0.05618145165329451);
    expect(spectraOf(PANEL).largestShare).toBe(0.05618145165329451);
  });
});

describe("SF2 D4 the warning of the spectrum reads the filters that apply to the file", () => {
  test("with passed on and a .nei file whose read says keepsPassed false, the warnings are those of the filters without it", () => {
    const base = projectWith([{ kind: "maf", maxAllowedMaf: 0.95 }]);
    const r = workedExample();
    expect(spectrumWarnings(r, withPassedOn(base, false))).toEqual(
      spectrumWarnings(r, base),
    );
  });
});
