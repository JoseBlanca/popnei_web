/**
 * The commands of the options of the diversity
 * (docs/specs/analyses/diversity.md, "What it sends and reads"), on the
 * sample project of core, whose variants file is read with ploidy 2.
 */
import { describe, expect, test } from "vitest";

import {
  defaultDrawOf,
  diversityOptions,
  drawOf,
} from "../../../core/analyses/diversity.ts";
import { sampleProject } from "../../../core/testSupport.ts";
import { individualsKept } from "../../../core/individualsKept.ts";
import type { Project } from "../../../core/project.ts";
import { panelOf } from "../panels.ts";
import { drawCommand, minimumCommand, thresholdCommand } from "./commands.ts";

/** The sample project with no options of any analysis: its own options
    of the diversity are not those of the diversity of stage 5. */
function diploid(): Project {
  return { ...sampleProject(), analyses: [] };
}

describe("PA7 D1 the commands of the options of the diversity", () => {
  test("each option is set with the other two kept, and names the change that removes the table", () => {
    const typed = drawCommand(96);
    expect(typed.description).toBe(
      "the number of chromosomes of the rarefaction changed",
    );
    const drawn = typed.command(diploid());
    expect(diversityOptions(drawn)).toEqual({
      minNumIndividuals: 20,
      polyThreshold: 0.95,
      numCalledAlleles: 96,
    });

    const minimum = minimumCommand(12);
    expect(minimum.description).toBe(
      "the minimum number of individuals of the diversity changed",
    );
    const lowered = minimum.command(drawn);
    expect(diversityOptions(lowered)).toEqual({
      minNumIndividuals: 12,
      polyThreshold: 0.95,
      numCalledAlleles: 96,
    });

    const threshold = thresholdCommand(0.99);
    expect(threshold.description).toBe(
      "the frequency below which a variant is polymorphic changed",
    );
    expect(diversityOptions(threshold.command(lowered))).toEqual({
      minNumIndividuals: 12,
      polyThreshold: 0.99,
      numCalledAlleles: 96,
    });
  });

  test("a draw typed stays when the minimum changes, and Use the default gives the draw back to the ploidy times the minimum", () => {
    const typed = drawCommand(40).command(diploid());
    const lowered = minimumCommand(10).command(typed);
    // The number of the default, typed, is kept as typed.
    expect(drawOf(lowered)).toBe(40);
    expect(defaultDrawOf(lowered)).toBe(20);
    const back = drawCommand(null).command(lowered);
    expect(diversityOptions(back).numCalledAlleles).toBeNull();
    expect(drawOf(back)).toBe(20);
  });
});

describe("PA7 D1 the ready state of the diversity reads the minimum of its options", () => {
  test("a population under the minimum typed is named, and none at a minimum it reaches", () => {
    const p = minimumCommand(2).command(diploid());
    const lines = panelOf("diversity").readyLines(p, individualsKept(p, null));
    expect(lines).toContain(
      // P1 alone has the minimum, so no private alleles are counted.
      "P2 has 1 individual, fewer than the minimum of 2, so it will have no values.",
    );
    const reached = minimumCommand(1).command(diploid());
    expect(
      panelOf("diversity")
        .readyLines(reached, individualsKept(reached, null))
        .some((line) => line.includes("fewer than the minimum")),
    ).toBe(false);
  });
});
