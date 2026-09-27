/**
 * The two thresholds of the filters of individuals and what each filter
 * of individuals kept (docs/specs/steps/variants.md, "The two thresholds"
 * and "What each filter of the individuals kept"), on the worked case of
 * docs/specs/core/individualsKept.md: five individuals `a` to `e`, with
 * the missing rates 0.2, 0.1, 0.3, 0.05 and 1 and the heterozygosities
 * 0.3, 0.5, 0.2, 0.4 and none, `e` calling no genotype.
 */
import { describe, expect, test } from "vitest";

import { individualsKept } from "../../../core/individualsKept.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import type { Project } from "../../../core/project.ts";
import {
  deepFreeze,
  fiveIndividualsProject,
  fiveStats,
} from "../../../core/testSupport.ts";
import type { IndividualFilter } from "../../../worker/protocol.ts";
import {
  INDIVIDUAL_MISSING_TURNED_ON,
  INDIVIDUAL_OBS_HET_TURNED_ON,
  KNOWN_ONCE_TEXT,
  appearedKeptNone,
  keptAnnouncement,
  individualCountText,
  individualKeptText,
  individualThresholdText,
  keptTotal,
  thresholdCommand,
  thresholdOf,
  thresholdSwitchCommand,
} from "./individualThresholds.ts";

/** The project of the worked case with `filters`, and what the filters
    keep with the statistics, or with none. */
function worked(
  filters: readonly IndividualFilter[],
  withStats = true,
): { readonly p: Project; readonly kept: IndividualsKept | null } {
  const p = fiveIndividualsProject(filters);
  return {
    p,
    kept: individualsKept(p, withStats ? fiveStats().stats : null),
  };
}

describe("the commands of the thresholds", () => {
  test("a threshold committed sets its filter at the number, with its description, and leaves the other filters", () => {
    const p = fiveIndividualsProject([
      { kind: "remove", individuals: ["b"] },
      { kind: "obs_het", maxAllowedObsHet: 0.4 },
    ]);
    const missing = thresholdCommand("missing_data", 0.0312);
    expect(missing.description).toBe(
      "the filter of individuals by missing data changed",
    );
    expect(missing.command(p).individualFilters).toEqual([
      { kind: "remove", individuals: ["b"] },
      { kind: "missing_data", maxAllowedMissingRate: 0.0312 },
      { kind: "obs_het", maxAllowedObsHet: 0.4 },
    ]);
    const obsHet = thresholdCommand("obs_het", 0.38);
    expect(obsHet.description).toBe(
      "the filter of individuals by observed heterozygosity changed",
    );
    expect(obsHet.command(p).individualFilters).toEqual([
      { kind: "remove", individuals: ["b"] },
      { kind: "obs_het", maxAllowedObsHet: 0.38 },
    ]);
  });

  test("the same number committed again is no change of the project", () => {
    const p = fiveIndividualsProject([
      { kind: "missing_data", maxAllowedMissingRate: 0.03 },
    ]);
    expect(thresholdCommand("missing_data", 0.03).command(p)).toBe(p);
  });

  test("turned on, the missing data starts at 0.1 and the heterozygosity at 0.5; turned off, the filter goes", () => {
    expect(INDIVIDUAL_MISSING_TURNED_ON).toBe(0.1);
    expect(INDIVIDUAL_OBS_HET_TURNED_ON).toBe(0.5);
    const p = fiveIndividualsProject([]);
    const missingOn = thresholdSwitchCommand("missing_data", true);
    expect(missingOn.description).toBe(
      "the filter of individuals by missing data was turned on",
    );
    const both = thresholdSwitchCommand("obs_het", true).command(
      missingOn.command(p),
    );
    expect(both.individualFilters).toEqual([
      { kind: "missing_data", maxAllowedMissingRate: 0.1 },
      { kind: "obs_het", maxAllowedObsHet: 0.5 },
    ]);
    const off = thresholdSwitchCommand("missing_data", false);
    expect(off.description).toBe(
      "the filter of individuals by missing data was turned off",
    );
    expect(off.command(deepFreeze(both)).individualFilters).toEqual([
      { kind: "obs_het", maxAllowedObsHet: 0.5 },
    ]);
    expect(thresholdSwitchCommand("obs_het", false).description).toBe(
      "the filter of individuals by observed heterozygosity was turned off",
    );
  });

  test("the threshold of each kind, or null while its filter is off", () => {
    const filters: readonly IndividualFilter[] = [
      { kind: "keep", individuals: ["a"] },
      { kind: "obs_het", maxAllowedObsHet: 0.38 },
    ];
    expect(thresholdOf(filters, "obs_het")).toBe(0.38);
    expect(thresholdOf(filters, "missing_data")).toBeNull();
  });
});

describe("the words beside a threshold and its histogram", () => {
  test("the line of the threshold names its filter and the individuals the histogram counts", () => {
    expect(individualThresholdText("missing_data", 0.03)).toBe(
      "Threshold of the filter of individuals by missing data: 0.03, drawn over every individual of the file",
    );
    expect(individualThresholdText("obs_het", 0.3812)).toBe(
      "Threshold of the filter of individuals by observed heterozygosity: 0.3812, drawn over every individual of the file",
    );
  });

  test("what a filter kept, with a comma between thousands and one individual in the singular", () => {
    expect(individualKeptText(200, 125)).toBe(
      "Kept 125 of the 200 individuals it was given.",
    );
    expect(individualKeptText(10000, 9999)).toBe(
      "Kept 9,999 of the 10,000 individuals it was given.",
    );
    expect(individualKeptText(1, 1)).toBe(
      "Kept 1 of the 1 individual it was given.",
    );
  });
});

describe("the count beside each filter of individuals", () => {
  test("with the statistics, what each filter kept of what the one before it kept", () => {
    const { kept } = worked([
      { kind: "remove", individuals: ["b"] },
      { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      { kind: "obs_het", maxAllowedObsHet: 0.4 },
    ]);
    expect(individualCountText(kept, "remove", false)).toBe(
      "Kept 4 of the 5 individuals it was given.",
    );
    expect(individualCountText(kept, "missing_data", false)).toBe(
      "Kept 2 of the 4 individuals it was given.",
    );
    expect(individualCountText(kept, "obs_het", false)).toBe(
      "Kept 2 of the 2 individuals it was given.",
    );
    expect(individualCountText(kept, "keep", false)).toBeNull();
  });

  test("with no statistics, a list keeps its count and a threshold, and each filter after it, says it is known once they are calculated", () => {
    const { kept } = worked(
      [
        { kind: "keep", individuals: ["a", "b", "c"] },
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
        { kind: "obs_het", maxAllowedObsHet: 0.4 },
      ],
      false,
    );
    expect(individualCountText(kept, "keep", false)).toBe(
      "Kept 3 of the 5 individuals it was given.",
    );
    expect(individualCountText(kept, "missing_data", false)).toBe(
      KNOWN_ONCE_TEXT,
    );
    expect(individualCountText(kept, "obs_het", false)).toBe(KNOWN_ONCE_TEXT);
    expect(KNOWN_ONCE_TEXT).toBe(
      "Known once the statistics of each individual are calculated for these filters of the variants.",
    );
  });

  test("while the statistics could not be calculated, a count that needs them says so, and the lists keep their counts", () => {
    const { kept } = worked(
      [
        { kind: "keep", individuals: ["a", "b", "c"] },
        { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      ],
      false,
    );
    expect(individualCountText(kept, "keep", true)).toBe(
      "Kept 3 of the 5 individuals it was given.",
    );
    expect(individualCountText(kept, "missing_data", true)).toBe(
      "Not known: the statistics of each individual could not be calculated, and their block says why.",
    );
  });

  test("no count while a list is refused", () => {
    const { kept } = worked([{ kind: "keep", individuals: ["a", "z"] }]);
    expect(kept).toBeNull();
    expect(individualCountText(kept, "keep", false)).toBeNull();
  });
});

describe("what stands under the filters of individuals", () => {
  test("the individuals that pass them all, of the individuals of the file", () => {
    const { p, kept } = worked([
      { kind: "remove", individuals: ["b"] },
      { kind: "missing_data", maxAllowedMissingRate: 0.2 },
      { kind: "obs_het", maxAllowedObsHet: 0.4 },
    ]);
    expect(keptTotal(p, kept)).toEqual({
      kind: "passed",
      text: "2 of the 5 individuals of panel.nei pass the filters.",
    });
  });

  test("a variants file whose name holds a tab is named escaped in the line of those that pass", () => {
    const { p, kept } = worked([{ kind: "remove", individuals: ["b"] }]);
    const variants = p.variants;
    if (variants === null) throw new Error("the worked case has a file");
    const tabbed: Project = {
      ...p,
      variants: { ...variants, name: "a\tb.nei" },
    };
    expect(keptTotal(tabbed, kept)).toEqual({
      kind: "passed",
      text: "4 of the 5 individuals of a\\tb.nei pass the filters.",
    });
  });

  test("filters that remove none give every individual, and one individual passes", () => {
    const all = worked([{ kind: "missing_data", maxAllowedMissingRate: 1 }]);
    expect(keptTotal(all.p, all.kept)).toEqual({
      kind: "passed",
      text: "5 of the 5 individuals of panel.nei pass the filters.",
    });
    const one = worked([{ kind: "keep", individuals: ["c"] }]);
    expect(keptTotal(one.p, one.kept)).toEqual({
      kind: "passed",
      text: "1 of the 5 individuals of panel.nei passes the filters.",
    });
  });

  test("filters that keep none give the reason without its end in the Variants step", () => {
    const { p, kept } = worked([
      { kind: "missing_data", maxAllowedMissingRate: 0.01 },
    ]);
    expect(keptTotal(p, kept)).toEqual({
      kind: "keptNone",
      text: "The filters of individuals keep none of the 5 individuals of panel.nei. Loosen them.",
    });
  });

  test("nothing with no filter of individuals, with a list refused, and while the statistics are awaited", () => {
    const none = worked([]);
    expect(keptTotal(none.p, none.kept)).toEqual({ kind: "nothing" });
    const refused = worked([{ kind: "keep", individuals: ["z"] }]);
    expect(keptTotal(refused.p, refused.kept)).toEqual({ kind: "nothing" });
    const waiting = worked([{ kind: "obs_het", maxAllowedObsHet: 0.4 }], false);
    expect(keptTotal(waiting.p, waiting.kept)).toEqual({ kind: "nothing" });
  });

  test("the reason of none kept is announced when it appears or changes, and not when it stays or goes", () => {
    const none = {
      kind: "keptNone",
      text: "The filters of individuals keep none of the 5 individuals of panel.nei. Loosen them.",
    } as const;
    const passed = { kind: "passed", text: "2 of the 5 …" } as const;
    expect(appearedKeptNone(passed, none)).toBe(none.text);
    expect(appearedKeptNone({ kind: "nothing" }, none)).toBe(none.text);
    expect(appearedKeptNone(none, none)).toBeNull();
    expect(appearedKeptNone(none, passed)).toBeNull();
    expect(
      appearedKeptNone(none, { kind: "keptNone", text: "Other words." }),
    ).toBe("Other words.");
  });

  test("after a command, the line of those that pass is announced; the reason of none kept when it appears; nothing while they wait", () => {
    const none = {
      kind: "keptNone",
      text: "The filters of individuals keep none of the 5 individuals of panel.nei. Loosen them.",
    } as const;
    const passed = {
      kind: "passed",
      text: "2 of the 5 individuals of panel.nei pass the filters.",
    } as const;
    const nothing = { kind: "nothing" } as const;
    expect(keptAnnouncement(nothing, passed)).toBe(passed.text);
    expect(keptAnnouncement(passed, passed)).toBe(passed.text);
    expect(keptAnnouncement(none, passed)).toBe(passed.text);
    expect(keptAnnouncement(passed, none)).toBe(none.text);
    expect(keptAnnouncement(none, none)).toBeNull();
    expect(keptAnnouncement(passed, nothing)).toBeNull();
  });
});
