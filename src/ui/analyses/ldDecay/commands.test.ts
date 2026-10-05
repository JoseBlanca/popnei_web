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
    const strict = maxAllowedMafCommand(0.8).command(
      deepFreeze(sampleProject()),
    );
    const step = maxDistCommand(100_000);
    expect(step.description).toBe(
      "the largest distance of the LD decay changed",
    );
    expect(ldDecayOptions(step.command(deepFreeze(strict)))).toEqual({
      maxDist: 100_000,
      maxAllowedMaf: 0.8,
    });
  });

  test("the maximum major allele frequency is set with the distance kept, and names the change", () => {
    const far = maxDistCommand(250_000).command(deepFreeze(sampleProject()));
    const step = maxAllowedMafCommand(0.9);
    expect(step.description).toBe(
      "the maximum major allele frequency of the LD decay changed",
    );
    expect(ldDecayOptions(step.command(deepFreeze(far)))).toEqual({
      maxDist: 250_000,
      maxAllowedMaf: 0.9,
    });
  });

  test("with none set the options are the defaults, no distance and 0.95, and the same options committed again give the project back", () => {
    const p = deepFreeze(sampleProject());
    expect(ldDecayOptions(p)).toEqual({ maxDist: null, maxAllowedMaf: 0.95 });
    const far = maxDistCommand(250_000).command(p);
    expect(maxDistCommand(250_000).command(far)).toBe(far);
  });
});
