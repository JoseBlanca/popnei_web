/**
 * The script of e2e/plots.html, the page of the tests of the plots
 * (docs/specs/charts/plot2d.md and scatter.md, "How it is verified"): the
 * histogram of the MAF of e2e/fixtures/panel.nei, its bins as literals,
 * and a scatter of 9,381 points in four populations and none, drawn at
 * the size a test sets, with the handle given to the test as
 * `window.plotsPage`; and the 3D plot of those points with a third
 * coordinate, loaded with `import()` as the screen loads it
 * (docs/specs/charts/pca3d.md, "How it is verified"). No screen offers the
 * export before stage 6, nor the scatter and the 3D plot before the PCA
 * panel, so this page is where they are seen working in a browser. From
 * stage 5, the heatmap of the distances between populations
 * (docs/specs/charts/heatmap.md, "How it is verified"), with Hudson's Fst
 * of panel.nei as literals; and the line plot of the LD decay of
 * e2e/fixtures/ld.nei (docs/specs/charts/line.md, "How it is verified"),
 * its numbers as literals.
 */

import "../src/ui/tokens.css";
import { PngError } from "../src/charts/export.ts";
import {
  createHeatmap,
  heatmapMargin,
  heatmapScale,
} from "../src/charts/heatmap.ts";
import type { HeatmapData } from "../src/charts/heatmap.ts";
import { createHistogram } from "../src/charts/histogram.ts";
import type { HistogramData } from "../src/charts/histogram.ts";
import { createLine } from "../src/charts/line.ts";
import type { LineData } from "../src/charts/line.ts";
import { NO_GROUP } from "../src/charts/marks.ts";
import type * as Pca3dModule from "../src/charts/pca3d.ts";
import type { Pca3dData, Pca3dHandle, ViewName } from "../src/charts/pca3d.ts";
import { projectToScreen } from "../src/charts/project.ts";
import {
  createScatter,
  SCATTER_MARGIN,
  scatterScales,
} from "../src/charts/scatter.ts";
import type { ScatterData } from "../src/charts/scatter.ts";
import type { ChartHandle } from "../src/charts/types.ts";
import type {
  HeatmapKind,
  LineKind,
  Pca3dKind,
  PlotsPage,
} from "./plotsPage.ts";

/**
 * The edges of the default 40 bins over [0, 1] as popnei gives them,
 * `histBinEdges` of calcPerVarDistribs with the release js-v0.1.0-dev.2,
 * on 26 September 2026, as in src/charts/histogram.test.ts.
 */
const EDGES_40 = Float64Array.from([
  0, 0.025, 0.05, 0.07500000000000001, 0.1, 0.125, 0.15000000000000002,
  0.17500000000000002, 0.2, 0.225, 0.25, 0.275, 0.30000000000000004, 0.325,
  0.35000000000000003, 0.375, 0.4, 0.42500000000000004, 0.45,
  0.47500000000000003, 0.5, 0.525, 0.55, 0.5750000000000001, 0.6000000000000001,
  0.625, 0.65, 0.675, 0.7000000000000001, 0.7250000000000001, 0.75, 0.775, 0.8,
  0.8250000000000001, 0.8500000000000001, 0.875, 0.9, 0.925, 0.9500000000000001,
  0.9750000000000001, 1,
]);

/** The counts of the MAF of panel.nei, every variant and individual. */
const MAF_COUNTS = Uint32Array.from([
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 69, 75, 62, 71,
  60, 74, 72, 83, 70, 68, 64, 83, 64, 63, 67, 57, 48, 25, 22, 3,
]);

/** The histogram, at the threshold of the MAF filter of a new project. */
const MAF: HistogramData = {
  title: "Major allele frequency",
  description: "The major allele frequency of 1,200 variants.",
  xLabel: "Major allele frequency",
  yLabel: "Variants",
  edges: EDGES_40,
  counts: MAF_COUNTS,
  threshold: {
    value: 0.95,
    legend: {
      label: "Maximum 0.95",
      keptLabel: "Kept by this filter",
      removedLabel: "Removed by this filter",
    },
  },
};

/** The points of the scatter: the most individuals popnei takes. */
const NUM_POINTS = 9381;

/**
 * The name of point 0: markup that would run if it were set as HTML
 * (scatter.md, "The cases").
 */
const MARKUP_NAME = '<img src=x onerror="window.plotsInjected = true">';

/**
 * The scatter: four populations around (±1, ±0.5), each point within
 * 0.45 of its centre, and every fifth point in none, within 0.45 of
 * (0, 0), placed by a linear congruential generator so that every engine
 * draws the same. Point 0, of P1, is alone at (0, 1.1), the top of the
 * data, 0.55 at least from every other point, 90 pixels at the scale of a
 * plot of 600 by 450; point 1, of P2, alone at (1.6, −1.1), the bottom
 * right corner, where its tooltip has no room on the right nor below;
 * point 2, in no population, alone at (−1.6, −1.1), the bottom left
 * corner, a ring whose middle shows the background. The name of the
 * fourth population is markup.
 */
function scatterData(): ScatterData {
  let state = 12345;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const centres: readonly (readonly [number, number])[] = [
    [-1, 0.5],
    [1, 0.5],
    [-1, -0.5],
    [1, -0.5],
  ];
  const x = new Float64Array(NUM_POINTS);
  const y = new Float64Array(NUM_POINTS);
  const group = new Uint16Array(NUM_POINTS);
  const pointNames: string[] = [];
  for (let index = 0; index < NUM_POINTS; index++) {
    const kind = index % 5;
    const [centreX, centreY] = centres[kind] ?? [0, 0];
    const radius = 0.45 * Math.sqrt(next());
    const angle = 2 * Math.PI * next();
    x[index] = centreX + radius * Math.cos(angle);
    y[index] = centreY + radius * Math.sin(angle);
    group[index] = kind === 4 ? NO_GROUP : kind;
    pointNames.push(`ind${String(index)}`);
  }
  x[0] = 0;
  y[0] = 1.1;
  pointNames[0] = MARKUP_NAME;
  x[1] = 1.6;
  y[1] = -1.1;
  x[2] = -1.6;
  y[2] = -1.1;
  group[2] = NO_GROUP;
  return {
    title: "Principal components",
    description: `Principal components of ${NUM_POINTS.toLocaleString("en-US")} individuals, for the tests.`,
    xLabel: "PC1 (3.55%)",
    yLabel: "PC2 (3.40%)",
    x,
    y,
    xName: "PC1",
    yName: "PC2",
    pointNames,
    colours: {
      kind: "groups",
      title: "Population",
      group,
      names: ["P1", "P2", "P3", "<b>P4</b>"],
      noneName: "No population",
      highlighted: null,
    },
  };
}

const SCATTER = scatterData();

/** The scatter with `highlighted` as the group the legend highlights. */
function highlightedData(highlighted: number | null): ScatterData {
  if (SCATTER.colours.kind !== "groups") {
    throw new Error("popnei_web defect: the page's scatter is not of groups.");
  }
  return { ...SCATTER, colours: { ...SCATTER.colours, highlighted } };
}

/**
 * The cloud of the 3D plot: the scatter's points with a third coordinate,
 * each population around a depth of its own, −0.5 or 0.5, and none around
 * 0, within 0.4 of it, by a generator of its own. Point 0 at a depth of
 * 0.9, point 1 of −0.9 and point 2 of 0.9; points 3 and 4 moved to one
 * place across and up, (−1.6, 1.1), 0.85 from the centre of the nearest
 * population, at the depths −0.5 and 0.5.
 */
function cloudData(): Pca3dData {
  let state = 67890;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const depths = [0.5, -0.5, -0.5, 0.5, 0];
  const x = Float64Array.from(SCATTER.x);
  const y = Float64Array.from(SCATTER.y);
  const z = new Float64Array(NUM_POINTS);
  for (let index = 0; index < NUM_POINTS; index++) {
    z[index] = (depths[index % 5] ?? 0) + 0.4 * (2 * next() - 1);
  }
  z[0] = 0.9;
  z[1] = -0.9;
  z[2] = 0.9;
  x[3] = -1.6;
  y[3] = 1.1;
  z[3] = -0.5;
  x[4] = -1.6;
  y[4] = 1.1;
  z[4] = 0.5;
  return {
    title: "Principal components, in 3D",
    description: `Principal components of ${NUM_POINTS.toLocaleString("en-US")} individuals in 3D, for the tests.`,
    x,
    y,
    z,
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"],
    pointNames: SCATTER.pointNames,
    colours: SCATTER.colours,
  };
}

/** Five points in five populations, P1 to P5, each alone in its path. */
function fiveData(): Pca3dData {
  return {
    title: "Five individuals, in 3D",
    description: "Five individuals in five populations, for the tests.",
    x: Float64Array.from([0.2, -0.9, 0.5, 1, -0.3]),
    y: Float64Array.from([-0.4, 0.8, 0.1, -1, 0.6]),
    z: Float64Array.from([0.3, -0.2, 0.7, -0.6, 0]),
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"],
    pointNames: ["a", "b", "c", "d", "e"],
    colours: {
      kind: "groups",
      title: "Population",
      group: Uint16Array.from([0, 1, 2, 3, 4]),
      names: ["P1", "P2", "P3", "P4", "P5"],
      noneName: "No population",
      highlighted: null,
    },
  };
}

/** Forty points on a circle, each in a population of its own, Q1 to Q40. */
function fortyData(): Pca3dData {
  const count = 40;
  const angles = Array.from(
    { length: count },
    (_v, at) => (2 * Math.PI * at) / count,
  );
  return {
    title: "Forty populations, in 3D",
    description: "Forty individuals in forty populations, for the tests.",
    x: Float64Array.from(angles, Math.cos),
    y: Float64Array.from(angles, Math.sin),
    z: Float64Array.from(angles, (_angle, at) => at / count - 0.5),
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"],
    pointNames: angles.map((_angle, at) => `q${String(at)}`),
    colours: {
      kind: "groups",
      title: "Population",
      group: Uint16Array.from(angles, (_angle, at) => at),
      names: angles.map((_angle, at) => `Q${String(at + 1)}`),
      noneName: "No population",
      highlighted: null,
    },
  };
}

/**
 * Two points at (0.5, −0.5) across and up, away from the lines, point 0
 * of P1 at a depth of −0.5 and point 1 of P2 at 0.5, above it, and point
 * 2, of neither, at (1, 1, 1), which sets the scale.
 */
function pairData(): Pca3dData {
  return {
    title: "Two individuals at one place, in 3D",
    description: "Two individuals at one place, for the tests.",
    x: Float64Array.from([0.5, 0.5, 1]),
    y: Float64Array.from([-0.5, -0.5, 1]),
    z: Float64Array.from([-0.5, 0.5, 1]),
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"],
    pointNames: ["below", "above", "corner"],
    colours: {
      kind: "groups",
      title: "Population",
      group: Uint16Array.from([0, 1, NO_GROUP]),
      names: ["P1", "P2"],
      noneName: "No population",
      highlighted: null,
    },
  };
}

/**
 * The five points of `five`, coloured by the values 100, 200, 300 and 400
 * of the first four, and the fifth, e, with no value, a ring.
 */
function valuesData(): Pca3dData {
  return {
    ...fiveData(),
    title: "Five individuals by altitude, in 3D",
    description: "Five individuals coloured by altitude, for the tests.",
    colours: {
      kind: "values",
      title: "altitude",
      values: Float64Array.from([100, 200, 300, 400, Number.NaN]),
      noneName: "No value",
    },
  };
}

/** The five points of `five` with no first coordinate: none is drawn. */
function noneData(): Pca3dData {
  return {
    ...fiveData(),
    title: "No individual drawn, in 3D",
    description: "Five individuals with no first coordinate, for the tests.",
    x: new Float64Array(5).fill(Number.NaN),
  };
}

/** The five points of `five` with the first and second coordinates, and their labels, swapped. */
function swappedData(): Pca3dData {
  const five = fiveData();
  return {
    ...five,
    x: five.y,
    y: five.x,
    axisNames: ["PC2", "PC1", "PC3"],
    axisLabels: ["PC2 (3.40%)", "PC1 (3.55%)", "PC3 (1.89%)"],
  };
}

/**
 * The five points of `five` with markup in the title, the description,
 * the labels of the lines and the name of P4, which must show as text.
 */
function markupData(): Pca3dData {
  const five = fiveData();
  if (five.colours.kind !== "groups") {
    throw new Error("popnei_web defect: the page's five are not of groups.");
  }
  return {
    ...five,
    title: "<i>T</i>",
    description: MARKUP_NAME,
    axisLabels: ["<b>PC1</b>", "<b>PC2</b>", "<b>PC3</b>"],
    colours: {
      ...five.colours,
      names: ["P1", "P2", "P3", "<b>P4</b>", "P5"],
    },
  };
}

/**
 * A thousand points on a sphere of radius 1, spread by the golden angle,
 * each in a population of its own, T1 to T1000: the most groups a plot
 * draws.
 */
function thousandData(): Pca3dData {
  const count = 1000;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const at = Array.from({ length: count }, (_v, index) => index);
  const height = (index: number): number => 1 - (2 * (index + 0.5)) / count;
  const radius = (index: number): number => Math.sqrt(1 - height(index) ** 2);
  return {
    title: "A thousand populations, in 3D",
    description:
      "A thousand individuals in a thousand populations, for the tests.",
    x: Float64Array.from(
      at,
      (index) => radius(index) * Math.cos(golden * index),
    ),
    y: Float64Array.from(
      at,
      (index) => radius(index) * Math.sin(golden * index),
    ),
    z: Float64Array.from(at, height),
    axisNames: ["PC1", "PC2", "PC3"],
    axisLabels: ["PC1 (3.55%)", "PC2 (3.40%)", "PC3 (1.89%)"],
    pointNames: at.map((index) => `t${String(index)}`),
    colours: {
      kind: "groups",
      title: "Population",
      group: Uint16Array.from(at),
      names: at.map((index) => `T${String(index + 1)}`),
      noneName: "No population",
      highlighted: null,
    },
  };
}

/** The data of each kind of 3D plot of the page. */
function pca3dDataOf(kind: Pca3dKind): Pca3dData {
  switch (kind) {
    case "cloud":
      return cloudData();
    case "five":
      return fiveData();
    case "forty":
      return fortyData();
    case "pair":
      return pairData();
    case "values":
      return valuesData();
    case "none":
      return noneData();
    case "swapped":
      return swappedData();
    case "markup":
      return markupData();
    case "thousand":
      return thousandData();
  }
}

/** A square matrix, row by row, from the values of its upper triangle. */
function matrixOf(size: number, upper: readonly number[]): Float64Array {
  const values = new Float64Array(size * size).fill(Number.NaN);
  let next = 0;
  for (let row = 0; row < size; row++) {
    for (let column = row + 1; column < size; column++) {
      const value = upper[next] ?? Number.NaN;
      next += 1;
      values[row * size + column] = value;
      values[column * size + row] = value;
    }
  }
  return values;
}

/** A heatmap of Hudson's Fst between `names`, from the upper triangle. */
function heatmapOf(
  names: readonly string[],
  upper: readonly number[],
): HeatmapData {
  return {
    title: "Distances between populations",
    description: `Hudson's Fst between ${String(names.length)} populations, for the tests.`,
    xLabel: "",
    yLabel: "",
    names,
    values: matrixOf(names.length, upper),
    valueName: "Hudson's Fst",
  };
}

/**
 * Values between 0.02 and 0.2 for the `count` pairs of a larger matrix,
 * by a linear congruential generator, so that every engine draws the same.
 */
function spread(count: number): number[] {
  let state = 24680;
  return Array.from({ length: count }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return 0.02 + 0.18 * (state / 2 ** 32);
  });
}

/** The data of each kind of heatmap of the page. */
function heatmapDataOf(kind: HeatmapKind): HeatmapData {
  switch (kind) {
    case "panel":
      // Hudson's Fst of panel.nei and panel_pops.csv, the filter of
      // missing data at 0.1, as popnei js-v0.1.0-dev.3 gives them
      // (docs/specs/analyses/popDists.md): p2 and p0, p2 and p1, p0 and p1.
      return heatmapOf(
        ["p2", "p0", "p1"],
        [0.10273588423661377, 0.10962148955018115, 0.10496244498389443],
      );
    case "split":
      // The same with p0 split, panel_split.csv, in the order of the
      // heatmap: p0b and p0a, p0b and p2 (given no value here), p0b and
      // p1, p0a and p2, p0a and p1, p2 and p1.
      return heatmapOf(
        ["p0b", "p0a", "p2", "p1"],
        [
          -0.011276258310056011,
          Number.NaN,
          0.1020068488376186,
          0.09917164096189776,
          0.10284678759499101,
          0.10962148955018115,
        ],
      );
    case "long": {
      const names = [
        "Andes_highland_2019",
        "Andes_lowland_valley_2020",
        "Coastal_north_2018",
        "Coastal_south_landrace",
        "Mesoamerica_wild_A",
        "Mesoamerica_wild_B_2021",
        "Yucatan_peninsula_cultivar",
        "Amazonia_basin_2017",
      ];
      return heatmapOf(names, spread((names.length * (names.length - 1)) / 2));
    }
    case "capitals":
      // Names in capitals, of 3 and of 20 characters, which the margins
      // counted at 7.2 pixels a character cut at the left edge of the
      // plot (heatmap.md, "The names on the axes").
      return heatmapOf(["MEX", "MESOAMERICA_WILD_ABC", "PER"], spread(3));
    case "many":
    case "most": {
      const count = kind === "many" ? 40 : 200;
      const names = Array.from(
        { length: count },
        (_v, at) => `pop${String(at + 1)}`,
      );
      return heatmapOf(names, spread((count * (count - 1)) / 2));
    }
  }
}

/**
 * The LD decay of e2e/fixtures/ld.nei and ld_pops.csv, as popnei's
 * calcLdAndDistPerPop of js-v0.1.0-dev.3 gives it in node, on 30
 * September 2026, with the missing data filter at 0.1, `minDist` 1,
 * `maxDist` 100,000, `numBins` 50 and `maxAllowedMaf` 0.95
 * (docs/specs/analyses/ldDecay.md, "How it is verified", which gives the
 * first and the last bin, ρ, r² at 0 and the half distances of these):
 * the mean r² of each bin from 1 to 2,000 bp, 2,001 to 4,000 and so on,
 * every bin with 447 pairs or more.
 */
const LD_POPS = [
  {
    name: "pop_a",
    meanR2: [
      0.3104664289575117, 0.2820255905475207, 0.27659287487316725,
      0.2655018974427538, 0.24614250869402585, 0.21102008526901228,
      0.2004786460773509, 0.19145122734838316, 0.17739470597739634,
      0.15523865433910036, 0.15133418365342394, 0.13875922352649073,
      0.13236508634628952, 0.12653646052948295, 0.12243131123456136,
      0.1054545042122309, 0.09804770091615721, 0.09932043031415565,
      0.08833081139464928, 0.08465114117643732, 0.07254462070681451,
      0.07523503739191888, 0.06631937069945551, 0.06361376108343192,
      0.06084978406680016, 0.05660448809671642, 0.053354758226221814,
      0.053661857885035455, 0.05088070571658384, 0.045410867348340295,
      0.04222736556230612, 0.047280654036187114, 0.04279528786916123,
      0.04163850655540775, 0.038147795066883906, 0.03569376304110423,
      0.03972960264519655, 0.03225490230762466, 0.03711007903254675,
      0.03523721641105735, 0.0332631879943675, 0.02992277633113261,
      0.03142050978374764, 0.03121253933812961, 0.02891185708491238,
      0.02847113359375036, 0.02582459044330509, 0.02676728542156746,
      0.026257871513402448, 0.025953462391956096,
    ],
    rhoPerBp: 0.00029996668947275404,
    r2AtZero: 0.46942148760330576,
    halfDist: 7548.08187836982,
    label: "pop_a · half at 7,548 bp",
  },
  {
    name: "pop_b",
    meanR2: [
      0.31876304803774247, 0.2881866647384668, 0.27908183631889316,
      0.25582411690422346, 0.23853081004952895, 0.2073635609117386,
      0.19756193673353173, 0.19020189644071095, 0.17618695270475876,
      0.15073131582369262, 0.14545990597681532, 0.13476170215403435,
      0.12628845890667337, 0.11877906887994663, 0.12182557934910218,
      0.10033548083843576, 0.09827842161265991, 0.0904209555741906,
      0.08292856923441082, 0.08016487548665151, 0.0721657617075713,
      0.07253572398802322, 0.06458440636932421, 0.05732607254998534,
      0.05903622766414325, 0.05454165326749274, 0.054534084596338774,
      0.052746721928583026, 0.04895662492830702, 0.049351361500301866,
      0.04633351959176894, 0.042475884954535297, 0.04260511973127428,
      0.03995788312713356, 0.039060447606816304, 0.036032614946560834,
      0.03719365745471715, 0.03320492894297172, 0.03515917000492124,
      0.036212587352603166, 0.03478004202835503, 0.03412679847173774,
      0.03367712221952762, 0.03157386443438083, 0.030239721111296837,
      0.03188743812979735, 0.0321350739252722, 0.028556562242940963,
      0.029462113557790142, 0.03162397044318621,
    ],
    rhoPerBp: 0.00030848266256738914,
    r2AtZero: 0.46942148760330576,
    halfDist: 7339.709512618931,
    label: "pop_b · half at 7,340 bp",
  },
] as const;

/** The largest distance of the LD decay of the page, in base pairs. */
const LD_MAX_DIST = 100000;
/** The width of each of its 50 bins, in base pairs. */
const LD_BIN_WIDTH = 2000;
/** The individuals of each of its two populations. */
const LD_NUM_INDIVIDUALS = 50;
/** The points of each fitted curve, from 0 to the largest distance. */
const LD_CURVE_POINTS = 200;

/**
 * The curve popnei fits, at `distance` base pairs, for `rhoPerBp` and
 * `numIndividuals`: the formula of ldDecay.md, "The fitted curve", which
 * core gives the screen as fittedR2, written here so that the page of the
 * plots draws the curve with nothing of core.
 */
function ldCurveAt(
  distance: number,
  rhoPerBp: number,
  numIndividuals: number,
): number {
  const rho = distance * rhoPerBp;
  const twoPlusRho = 2 + rho;
  const elevenPlusRho = 11 + rho;
  const expected = (10 + rho) / (twoPlusRho * elevenPlusRho);
  const ofTheSample =
    ((3 + rho) * (12 + 12 * rho + rho * rho)) /
    (numIndividuals * twoPlusRho * elevenPlusRho);
  return expected * (1 + ofTheSample);
}

/** The data of each kind of line plot of the page. */
function lineDataOf(kind: LineKind): LineData {
  switch (kind) {
    case "oneMark": {
      const ld = lineDataOf("ld");
      return {
        ...ld,
        series: ld.series.map((series, at) =>
          at === 0 ? series : { ...series, marks: [] },
        ),
      };
    }
    case "capitals": {
      const ld = lineDataOf("ld");
      const names = ["MESOAMERICA_WILD", "ANDES_LANDRACE_B"];
      return {
        ...ld,
        series: ld.series.map((series, at) => ({
          ...series,
          label: series.label.replace(/^pop_[ab]/u, names[at] ?? ""),
        })),
      };
    }
    case "ld":
      return {
        title: "LD decay",
        description:
          "The mean r² of pairs of variants against their distance, in 50 bins up to 100,000 base pairs, for 2 populations, with the curve fitted to each. The curve falls to half at 7,548 bp in pop_a and 7,340 bp in pop_b.",
        xLabel: "Distance between the two variants (bp)",
        yLabel: "Mean r² of the pairs",
        series: LD_POPS.map((pop, group) => {
          const distances = Array.from(
            { length: LD_CURVE_POINTS },
            (_v, at) => (LD_MAX_DIST * at) / (LD_CURVE_POINTS - 1),
          );
          return {
            label: pop.label,
            group,
            // The middle of each bin, (smallest + largest) / 2: 1,000.5
            // for the bin from 1 to 2,000.
            points: {
              x: Float64Array.from(
                pop.meanR2,
                (_v, bin) => bin * LD_BIN_WIDTH + (1 + LD_BIN_WIDTH) / 2,
              ),
              y: Float64Array.from(pop.meanR2),
            },
            line: {
              x: Float64Array.from(distances),
              y: Float64Array.from(distances, (distance) =>
                ldCurveAt(distance, pop.rhoPerBp, LD_NUM_INDIVIDUALS),
              ),
            },
            marks: [{ x: pop.halfDist, y: pop.r2AtZero / 2 }],
          };
        }),
        xDomain: [0, LD_MAX_DIST],
        // The largest value drawn, 0.4694 at 0, rounded up to a tenth.
        yDomain: [0, 0.5],
        xWholeNumbers: true,
        yWholeNumbers: false,
      };
    case "noCasing": {
      // One series of each colour whose line has no casing, 3:1 or more
      // on the background of both themes: green, blue, vermilion and
      // reddish purple, the colours 2, 4, 5 and 6.
      const groups = [2, 4, 5, 6];
      return {
        title: "Four lines",
        description: "Four lines in the colours that have no casing.",
        xLabel: "x",
        yLabel: "y",
        series: groups.map((group, at) => ({
          label: `line ${String(group)}`,
          group,
          points: { x: Float64Array.of(20, 60), y: Float64Array.of(0.8, 0.6) },
          line: {
            x: Float64Array.of(0, 100),
            y: Float64Array.of(0.8 - 0.1 * at, 0.4 - 0.1 * at),
          },
          marks: [{ x: 50, y: 0.5 - 0.1 * at }],
        })),
        xDomain: [0, 100],
        yDomain: [0, 1],
        xWholeNumbers: false,
        yWholeNumbers: false,
      };
    }
  }
}

/** A plot of the page: its element and its handle. */
type Drawn =
  | {
      readonly kind: "histogram";
      readonly element: HTMLElement;
      readonly handle: ChartHandle<HistogramData>;
    }
  | {
      readonly kind: "scatter";
      readonly element: HTMLElement;
      readonly handle: ChartHandle<ScatterData>;
    }
  | {
      readonly kind: "heatmap";
      readonly element: HTMLElement;
      readonly handle: ChartHandle<HeatmapData>;
      readonly data: HeatmapData;
    }
  | {
      readonly kind: "line";
      readonly element: HTMLElement;
      readonly handle: ChartHandle<LineData>;
    }
  | {
      readonly kind: "pca3d";
      readonly element: HTMLElement;
      readonly handle: Pca3dHandle;
      readonly data: Pca3dData;
      readonly module: typeof Pca3dModule;
    };

const found = document.getElementById("plots");
if (found === null) {
  throw new Error("popnei_web defect: e2e/plots.html has no #plots.");
}
const plots: HTMLElement = found;

let drawn: Drawn | null = null;
/** The calls of onHover of the scatter or the 3D plot since it was drawn. */
let hovers: (number | null)[] = [];
/** The calls of onContextChange of the 3D plot since it was drawn. */
let contextChanges: boolean[] = [];

function last(): Drawn {
  if (drawn === null) {
    throw new Error("popnei_web defect: no plot was drawn on the page.");
  }
  return drawn;
}

function lastScatter(): Extract<Drawn, { kind: "scatter" }> {
  const plot = last();
  if (plot.kind !== "scatter") {
    throw new Error("popnei_web defect: the plot drawn last is no scatter.");
  }
  return plot;
}

function lastHeatmap(): Extract<Drawn, { kind: "heatmap" }> {
  const plot = last();
  if (plot.kind !== "heatmap") {
    throw new Error("popnei_web defect: the plot drawn last is no heatmap.");
  }
  return plot;
}

function lastPca3d(): Extract<Drawn, { kind: "pca3d" }> {
  const plot = last();
  if (plot.kind !== "pca3d") {
    throw new Error("popnei_web defect: the plot drawn last is no 3D plot.");
  }
  return plot;
}

/**
 * Where each point of the 3D plot drawn last is in the viewport at `view`
 * with a zoom of 1, x and y, two per point, NaN for a point not drawn:
 * the corner of the element, its padding, and the camera of that view
 * made apart from the plot's.
 */
function pca3dViewport(view: ViewName): Float64Array {
  const plot = lastPca3d();
  const { element, data, module } = plot;
  const style = getComputedStyle(element);
  const padLeft = Number.parseFloat(style.paddingLeft);
  const padTop = Number.parseFloat(style.paddingTop);
  const width =
    element.clientWidth - padLeft - Number.parseFloat(style.paddingRight);
  const height =
    element.clientHeight - padTop - Number.parseFloat(style.paddingBottom);
  const { camera, controls } = module.createView(null, width, height);
  module.lookAlong(controls, view);
  camera.updateMatrixWorld();
  const matrix = camera.projectionMatrix
    .clone()
    .multiply(camera.matrixWorldInverse)
    .toArray();
  const { positions, index } = module.scenePositions(data.x, data.y, data.z);
  const xy = new Float32Array((2 * positions.length) / 3);
  const depth = new Float32Array(positions.length / 3);
  projectToScreen(positions, matrix, width, height, xy, depth);
  const box = element.getBoundingClientRect();
  const pixels = new Float64Array(2 * data.x.length).fill(Number.NaN);
  for (const [at, point] of index.entries()) {
    pixels[2 * point] = box.left + padLeft + (xy[2 * at] ?? Number.NaN);
    pixels[2 * point + 1] = box.top + padTop + (xy[2 * at + 1] ?? Number.NaN);
  }
  return pixels;
}

/**
 * The padding of the element of the scatter, so that the tests see the
 * plot and its tooltip placed inside it.
 */
const SCATTER_PADDING = 8;

/**
 * A new element whose content is `width` by `height` CSS pixels, with
 * `padding` pixels around it, in place of the plot drawn before,
 * `position: relative` as the screen's CSS makes the element of a
 * scatter, so that its tooltip is placed inside it.
 */
function newElement(width: number, height: number, padding = 0): HTMLElement {
  if (drawn !== null) {
    drawn.handle.destroy();
    drawn.element.remove();
    drawn = null;
  }
  const element = document.createElement("div");
  element.style.position = "relative";
  element.style.width = `${String(width)}px`;
  element.style.height = `${String(height)}px`;
  element.style.padding = `${String(padding)}px`;
  plots.append(element);
  return element;
}

/**
 * Where each point of the scatter in `element` is in the viewport, x and
 * y, two per point: the corner of the element, its padding, the margin
 * and the scales, computed apart from what the plot computes from the
 * pointer.
 */
function viewportPixels(element: HTMLElement): Float64Array {
  const style = getComputedStyle(element);
  const padLeft = Number.parseFloat(style.paddingLeft);
  const padTop = Number.parseFloat(style.paddingTop);
  const innerWidth =
    element.clientWidth -
    padLeft -
    Number.parseFloat(style.paddingRight) -
    SCATTER_MARGIN.left -
    SCATTER_MARGIN.right;
  const innerHeight =
    element.clientHeight -
    padTop -
    Number.parseFloat(style.paddingBottom) -
    SCATTER_MARGIN.top -
    SCATTER_MARGIN.bottom;
  const scales = scatterScales(SCATTER, innerWidth, innerHeight);
  const box = element.getBoundingClientRect();
  const pixels = new Float64Array(2 * NUM_POINTS);
  for (const [index, x] of SCATTER.x.entries()) {
    pixels[2 * index] = box.left + padLeft + SCATTER_MARGIN.left + scales.x(x);
    pixels[2 * index + 1] =
      box.top +
      padTop +
      SCATTER_MARGIN.top +
      scales.y(SCATTER.y[index] ?? Number.NaN);
  }
  return pixels;
}

/**
 * Waits for the next frame drawn: a callback of that frame, then a
 * message, which runs once it has been drawn, as the walking skeleton
 * measured its points (e2e/measure/points.ts).
 */
async function nextFrame(): Promise<void> {
  await new Promise((done) => requestAnimationFrame(done));
  await new Promise((done) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = done;
    channel.port2.postMessage(null);
  });
}

const page: PlotsPage = {
  draw(width, height) {
    const element = newElement(width, height);
    const handle = createHistogram(element, MAF);
    drawn = { kind: "histogram", element, handle };
    return handle;
  },
  drawScatter(width, height) {
    const element = newElement(width, height, SCATTER_PADDING);
    hovers = [];
    const handle = createScatter(element, SCATTER, {
      onHover(point) {
        hovers.push(point);
      },
    });
    drawn = { kind: "scatter", element, handle };
    return handle;
  },
  highlight(highlighted) {
    lastScatter().handle.update(highlightedData(highlighted));
  },
  pointPixel(index) {
    const pixels = viewportPixels(lastScatter().element);
    const x = pixels[2 * index];
    const y = pixels[2 * index + 1];
    if (x === undefined || y === undefined) {
      throw new Error(
        `popnei_web defect: the scatter has no point ${String(index)}.`,
      );
    }
    return { x, y };
  },
  nearestDistance(x, y, except) {
    const pixels = viewportPixels(lastScatter().element);
    let nearest = Infinity;
    for (let index = 0; index < NUM_POINTS; index++) {
      if (index === except) continue;
      const dx = (pixels[2 * index] ?? Number.NaN) - x;
      const dy = (pixels[2 * index + 1] ?? Number.NaN) - y;
      nearest = Math.min(nearest, Math.hypot(dx, dy));
    }
    return nearest;
  },
  hovers: () => [...hovers],
  markupRan: () => "plotsInjected" in window,
  async timeScatter(width, height, repeats) {
    const element = newElement(width, height);
    const create: number[] = [];
    const createCall: number[] = [];
    const highlight: number[] = [];
    const highlightCall: number[] = [];
    // One drawing first that is not counted, as the plot's own first
    // drawing warms the engine's compiler.
    for (let repeat = -1; repeat < repeats; repeat++) {
      await nextFrame();
      const start = performance.now();
      const handle = createScatter(element, SCATTER);
      const createReturned = performance.now();
      await nextFrame();
      const created = performance.now();
      // A group highlighted, a different one in each repetition.
      handle.update(highlightedData(Math.max(0, repeat) % 4));
      const updateReturned = performance.now();
      await nextFrame();
      const updated = performance.now();
      handle.destroy();
      if (repeat >= 0) {
        create.push(created - start);
        createCall.push(createReturned - start);
        highlight.push(updated - created);
        highlightCall.push(updateReturned - created);
      }
    }
    element.remove();
    return { create, createCall, highlight, highlightCall };
  },
  drawHeatmap(width, height, kind) {
    const element = newElement(width, height, SCATTER_PADDING);
    const data = heatmapDataOf(kind);
    const handle = createHeatmap(element, data);
    drawn = { kind: "heatmap", element, handle, data };
    return handle;
  },
  heatmapCell(row, column) {
    const { element, data } = lastHeatmap();
    const style = getComputedStyle(element);
    const padLeft = Number.parseFloat(style.paddingLeft);
    const padTop = Number.parseFloat(style.paddingTop);
    const width =
      element.clientWidth - padLeft - Number.parseFloat(style.paddingRight);
    const height =
      element.clientHeight - padTop - Number.parseFloat(style.paddingBottom);
    const margin = heatmapMargin(data, { width, height });
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;
    const scale = heatmapScale(data.names, innerWidth, innerHeight);
    // The grid stands at the foot of the frame.
    const gridTop = innerHeight - Math.min(innerWidth, innerHeight);
    const middle = (index: number): number => {
      const name = data.names[index];
      const start = name === undefined ? undefined : scale(name);
      if (start === undefined) {
        throw new Error(
          `popnei_web defect: the heatmap has no name ${String(index)}.`,
        );
      }
      return start + scale.bandwidth() / 2;
    };
    const box = element.getBoundingClientRect();
    return {
      x: box.left + padLeft + margin.left + middle(column),
      y: box.top + padTop + margin.top + gridTop + middle(row),
    };
  },
  drawLine(width, height, kind) {
    const element = newElement(width, height);
    const handle = createLine(element, lineDataOf(kind));
    drawn = { kind: "line", element, handle };
    return handle;
  },
  lineUpdate(kind) {
    const plot = last();
    if (plot.kind !== "line") {
      throw new Error(
        "popnei_web defect: the plot drawn last is no line plot.",
      );
    }
    plot.handle.update(lineDataOf(kind));
  },
  webgl() {
    const context = document.createElement("canvas").getContext("webgl2");
    if (context === null) return false;
    // Given back at once: a browser allows only a few at a time.
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  },
  async drawPca3d(width, height, kind) {
    const module = await import("../src/charts/pca3d.ts");
    const element = newElement(width, height, SCATTER_PADDING);
    hovers = [];
    contextChanges = [];
    const data = pca3dDataOf(kind);
    const handle = module.createPca3d(element, data, {
      onHover(point) {
        hovers.push(point);
      },
      onContextChange(lost) {
        contextChanges.push(lost);
      },
    });
    drawn = { kind: "pca3d", element, handle, data, module };
  },
  pca3dData: () => lastPca3d().data,
  pca3dHighlight(highlighted) {
    const plot = lastPca3d();
    const { colours } = plot.data;
    if (colours.kind !== "groups") {
      throw new Error("popnei_web defect: the 3D plot is not of groups.");
    }
    const data = { ...plot.data, colours: { ...colours, highlighted } };
    drawn = { ...plot, data };
    plot.handle.update(data);
  },
  pca3dUpdate(kind) {
    const plot = lastPca3d();
    const data = pca3dDataOf(kind);
    drawn = { ...plot, data };
    plot.handle.update(data);
  },
  pca3dPixel(index, view) {
    const pixels = pca3dViewport(view);
    const x = pixels[2 * index];
    const y = pixels[2 * index + 1];
    if (x === undefined || y === undefined) {
      throw new Error(
        `popnei_web defect: the 3D plot has no point ${String(index)}.`,
      );
    }
    return { x, y };
  },
  pca3dNearest(index, view) {
    const pixels = pca3dViewport(view);
    const x = pixels[2 * index] ?? Number.NaN;
    const y = pixels[2 * index + 1] ?? Number.NaN;
    let nearest = Infinity;
    for (let other = 0; other < pixels.length / 2; other++) {
      if (other === index) continue;
      const dx = (pixels[2 * other] ?? Number.NaN) - x;
      const dy = (pixels[2 * other + 1] ?? Number.NaN) - y;
      nearest = Math.min(nearest, Math.hypot(dx, dy));
    }
    return nearest;
  },
  contextChanges: () => [...contextChanges],
  element: () => last().element,
  handle: () => last().handle,
  pca3d: () => lastPca3d().handle,
  pngErrorKind: (error) => (error instanceof PngError ? error.kind : null),
};

window.plotsPage = page;
