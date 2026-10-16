/**
 * The commands of the options of the LD decay
 * (docs/specs/analyses/ldDecay.md, "What it sends and reads"), on the
 * sample project of core.
 */
import { describe, expect, test } from "vitest";

import { ldDecayOptions } from "../../../core/analyses/ldDecay.ts";
import { deepFreeze, sampleProject } from "../../../core/testSupport.ts";
import { maxAllowedMafCommand, maxDistCommand } from "./commands.ts";

describe("PA8 the commands of the options of the LD decay", () => {
  test("the largest distance is set with the frequency kept, and names the change that removes the result", () => {
    const strict = maxAllowedMafCommand(0.8, "popgen").command(
      deepFreeze(sampleProject()),
    );
    const step = maxDistCommand(100_000, "popgen");
    expect(step.description).toBe(
      "the largest distance of the LD decay changed",
    );
    expect(ldDecayOptions(step.command(deepFreeze(strict)), "popgen")).toEqual({
      maxDist: 100_000,
      maxAllowedMaf: 0.8,
    });
  });

  test("the maximum major allele frequency is set with the distance kept, and names the change", () => {
    const far = maxDistCommand(250_000, "popgen").command(
      deepFreeze(sampleProject()),
    );
    const step = maxAllowedMafCommand(0.9, "popgen");
    expect(step.description).toBe(
      "the maximum major allele frequency of the LD decay changed",
    );
    expect(ldDecayOptions(step.command(deepFreeze(far)), "popgen")).toEqual({
      maxDist: 250_000,
      maxAllowedMaf: 0.9,
    });
  });

  test("with none set the options are the defaults, no distance and 0.95, and the same options committed again give the project back", () => {
    const p = deepFreeze(sampleProject());
    expect(ldDecayOptions(p, "popgen")).toEqual({
      maxDist: null,
      maxAllowedMaf: 0.95,
    });
    const far = maxDistCommand(250_000, "popgen").command(p);
    expect(maxDistCommand(250_000, "popgen").command(far)).toBe(far);
  });

  test("on popgen2.html, a change of the frequency with none set keeps the default distance, 100,000 base pairs, and an emptied distance is no distance (the owner, 16 October 2026)", () => {
    const p = deepFreeze(sampleProject());
    const strict = maxAllowedMafCommand(0.8, "popgen2").command(p);
    expect(ldDecayOptions(strict, "popgen2")).toEqual({
      maxDist: 100_000,
      maxAllowedMaf: 0.8,
    });
    const emptied = maxDistCommand(null, "popgen2").command(deepFreeze(strict));
    expect(ldDecayOptions(emptied, "popgen2")).toEqual({
      maxDist: null,
      maxAllowedMaf: 0.8,
    });
  });
});
