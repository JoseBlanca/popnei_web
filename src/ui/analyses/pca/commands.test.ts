/**
 * The commands of the options of the principal components given the page
 * (docs/specs/analyses/pca.md, "On popgen2.html", "The TypeScript
 * interface"; docs/specs/steps/popgen2-pca.md, "What is a step"): the
 * description of each row of that table, under the PCA and under the
 * PCoA, `stricterCommand`, and the options of popgen2.html read and
 * written as that page has them.
 */
import { describe, expect, test } from "vitest";

import {
  PCA2_DEFAULTS,
  pcaOnPopgen2,
  pcaOptions,
} from "../../../core/analyses/pca.ts";
import type { PcaOptions } from "../../../core/analyses/pca.ts";
import { setAnalysisOptions } from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import { deepFreeze, sampleProject } from "../../../core/testSupport.ts";
import type { PcaMethod } from "../../../worker/protocol.ts";
import {
  axisCommand,
  colourCommand,
  followCommand,
  methodCommand,
  ownValueCommand,
  stricterCommand,
  viewCommand,
} from "./commands.ts";
import type { Popgen2CommandPage } from "./commands.ts";
import { POPGEN2_DESCRIPTIONS } from "./words.ts";

/** popgen2.html with the method `method` in its project. */
function popgen2(method: PcaMethod): Popgen2CommandPage {
  return { page: "popgen2", method };
}

/** The sample project with the options of the PCA of popgen2.html,
    PCA2_DEFAULTS with `change` over them. */
function withOptions(change: Partial<PcaOptions> = {}): Project {
  const o = { ...PCA2_DEFAULTS, ...change };
  return deepFreeze(
    setAnalysisOptions(sampleProject(), pcaOnPopgen2, {
      method: o.method,
      missingData: { ...o.missingData },
      maf: { ...o.maf },
      ld: { ...o.ld },
      colourBy: o.colourBy,
      axes: [...o.axes],
      view: o.view,
    }),
  );
}

describe("AP2 D3 the commands of the PCA on popgen2.html", () => {
  test.each([
    ["pca", "PCA"],
    ["pcoa", "PCoA"],
  ] as const)(
    "the description of each row of 'What is a step', under the %s",
    (method, name) => {
      const page = popgen2(method);
      expect(
        [
          methodCommand(method, page),
          stricterCommand("missing_data", 0.1, page),
          stricterCommand("maf", 0.95, page),
          followCommand("missing_data", true, page),
          followCommand("maf", true, page),
          ownValueCommand(
            { kind: "missing_data", maxAllowedMissingRate: 0.05 },
            page,
          ),
          ownValueCommand({ kind: "maf", maxAllowedMaf: 0.9 }, page),
          followCommand("ld", false, page),
          followCommand("ld", true, page),
          ownValueCommand({ kind: "ld", maxAllowedR2: 0.2 }, page),
          ownValueCommand({ kind: "ld", maxDist: 50000 }, page),
          colourCommand("popcat", page),
          axisCommand([1, 2, 3], 0, 2, page),
          viewCommand("3d", page),
          viewCommand("2d", page),
        ].map((command) => command.description),
      ).toEqual([
        `the method of the ${name} changed`,
        `the missing data filter of the ${name} was made stricter`,
        `the MAF filter of the ${name} was made stricter`,
        `the missing data filter of the ${name} was set back to as in the Variants tab`,
        `the MAF filter of the ${name} was set back to as in the Variants tab`,
        `the missing data filter of the ${name} changed`,
        `the MAF filter of the ${name} changed`,
        `the LD pruning of the ${name} was turned on`,
        `the LD pruning of the ${name} was turned off`,
        `the LD pruning of the ${name} changed`,
        `the LD pruning of the ${name} changed`,
        `the colour of the points of the ${name} changed`,
        "the components on the axes changed",
        `the ${name} was drawn in 3D`,
        `the ${name} was drawn in 2D`,
      ]);
    },
  );

  test("the method changed names the method of the project after the command", () => {
    expect(methodCommand("pcoa", popgen2("pca")).description).toBe(
      "the method of the PCoA changed",
    );
    expect(methodCommand("pca", popgen2("pcoa")).description).toBe(
      "the method of the PCA changed",
    );
  });

  test("stricterCommand sets follow false and the value in one step", () => {
    // Values kept from before, unlike those the command gives, so that a
    // command that only set follow false would keep them and fail.
    const p = withOptions({
      missingData: { follow: true, maxAllowedMissingRate: 0.05 },
      maf: { follow: true, maxAllowedMaf: 0.8 },
    });
    const stricter = stricterCommand("missing_data", 0.07, popgen2("pca"));
    const after = stricter.command(p);
    expect(pcaOptions(after, "popgen2").missingData).toEqual({
      follow: false,
      maxAllowedMissingRate: 0.07,
    });
    expect(pcaOptions(after, "popgen2").maf).toEqual({
      follow: true,
      maxAllowedMaf: 0.8,
    });
    const maf = stricterCommand("maf", 1, popgen2("pca")).command(after);
    expect(pcaOptions(maf, "popgen2").maf).toEqual({
      follow: false,
      maxAllowedMaf: 1,
    });
    expect(pcaOptions(maf, "popgen2").missingData).toEqual({
      follow: false,
      maxAllowedMissingRate: 0.07,
    });
  });

  test("a change of the colour of the points of a project with no options keeps the LD pruning on, as popgen2.html has it", () => {
    const p = deepFreeze(sampleProject());
    const after = colourCommand("popcat", popgen2("pca")).command(p);
    expect(pcaOptions(after, "popgen2").ld).toEqual({
      follow: false,
      maxAllowedR2: 0.1,
      maxDist: 100_000,
    });
    expect(pcaOptions(after, "popgen2").colourBy).toBe("popcat");
    // The old page's command reads PCA_DEFAULTS, whose LD filter follows.
    const old = colourCommand("popcat", "popgen").command(p);
    expect(pcaOptions(old, "popgen").ld.follow).toBe(true);
  });

  test("the other commands write the options of popgen2.html and keep the rest", () => {
    const p = withOptions({
      ld: { follow: false, maxAllowedR2: 0.1, maxDist: 50000 },
    });
    const page = popgen2("pca");
    const off = followCommand("ld", true, page).command(p);
    expect(pcaOptions(off, "popgen2").ld).toEqual({
      follow: true,
      maxAllowedR2: 0.1,
      maxDist: 50000,
    });
    const typed = ownValueCommand(
      { kind: "missing_data", maxAllowedMissingRate: 0.05 },
      page,
    ).command(stricterCommand("missing_data", 0.1, page).command(p));
    expect(pcaOptions(typed, "popgen2").missingData).toEqual({
      follow: false,
      maxAllowedMissingRate: 0.05,
    });
    const back = followCommand("missing_data", true, page).command(typed);
    expect(pcaOptions(back, "popgen2").missingData.follow).toBe(true);
    expect(pcaOptions(back, "popgen2").ld).toEqual(pcaOptions(p, "popgen2").ld);
    const twoD = viewCommand("2d", page).command(p);
    expect(pcaOptions(twoD, "popgen2").view).toBe("2d");
    expect(pcaOptions(twoD, "popgen2").ld).toEqual(pcaOptions(p, "popgen2").ld);
    expect(
      pcaOptions(axisCommand([1, 2, 3], 0, 2, page).command(p), "popgen2").axes,
    ).toEqual([2, 1, 3]);
    expect(
      pcaOptions(methodCommand("pcoa", page).command(p), "popgen2").method,
    ).toBe("pcoa");
  });

  test("with no option set the LD pruning is on within 100,000 base pairs, and the distance emptied is no distance (the owner, 16 October 2026)", () => {
    const p = deepFreeze(sampleProject());
    expect(pcaOptions(p, "popgen2").ld).toEqual({
      follow: false,
      maxAllowedR2: 0.1,
      maxDist: 100_000,
    });
    const emptied = ownValueCommand(
      { kind: "ld", maxDist: null },
      popgen2("pca"),
    ).command(p);
    expect(pcaOptions(emptied, "popgen2").ld).toEqual({
      follow: false,
      maxAllowedR2: 0.1,
      maxDist: null,
    });
  });

  test("the calls the screen spec's 'Its filters' has no step for are refused by the compiler", () => {
    // A missing data or a MAF filter of popgen2.html is set for the PCA
    // by stricterCommand alone; followCommand with follow false would
    // bring back a value typed long before as "made stricter".
    expect(() =>
      // @ts-expect-error -- popgen2.html makes the missing data stricter by stricterCommand
      followCommand("missing_data", false, popgen2("pca")),
    ).toThrow(/^popnei_web defect: /u);
    expect(() =>
      // @ts-expect-error -- popgen2.html makes the MAF stricter by stricterCommand
      followCommand("maf", false, popgen2("pcoa")),
    ).toThrow(/^popnei_web defect: /u);
    // The lines are never called.
    const refused = [
      (): unknown =>
        // @ts-expect-error -- the old page has no stricterCommand
        stricterCommand("maf", 0.9, "popgen"),
      (): unknown =>
        // @ts-expect-error -- the LD pruning is turned on, never made stricter
        POPGEN2_DESCRIPTIONS.stricter("ld", "pca"),
    ];
    expect(refused).toHaveLength(2);
  });
});
