/**
 * The tests of what `populations.ts` adds to its functions, which
 * `project.test.ts` tests where they were until 1 October 2026
 * (docs/specs/core/project.md, "How it is verified"): which modules
 * import which, read from their text, so that `project.ts`,
 * `individualsKept.ts` and `populations.ts` do not come to import each
 * other again; and the helpers the spec lists from that day.
 */

import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  loosenText,
  populationsByLists,
  populationsColumnOf,
} from "./populations.ts";
import type { Project } from "./project.ts";
import { deepFreeze } from "./testSupport.ts";

/** The text of a module of src/core. */
function sourceOf(name: string): string {
  return readFileSync(new URL(name, import.meta.url), "utf8");
}

/** The statements of `source` that import or export from `module`, each
    on one line. */
function statementsFrom(source: string, module: string): string[] {
  const statements =
    source.match(/^(?:import|export)\b[^;]*?\bfrom\s+"[^"]+";/gmu) ?? [];
  return statements
    .filter((statement) => statement.endsWith(`from "${module}";`))
    .map((statement) => statement.replaceAll(/\s+/gu, " "));
}

describe("PA10 the modules of the populations do not import each other", () => {
  test("project.ts takes nothing of individualsKept.ts but a type", () => {
    expect(
      statementsFrom(sourceOf("project.ts"), "./individualsKept.ts"),
    ).toEqual(['import type { IndividualsKept } from "./individualsKept.ts";']);
  });

  test("project.ts takes nothing of populations.ts", () => {
    expect(statementsFrom(sourceOf("project.ts"), "./populations.ts")).toEqual(
      [],
    );
  });

  test("individualsKept.ts takes nothing of populations.ts", () => {
    expect(
      statementsFrom(sourceOf("individualsKept.ts"), "./populations.ts"),
    ).toEqual([]);
  });

  test("populations.ts has no constant made when it loads, which the module that loaded it first could find not yet made", () => {
    expect(
      sourceOf("populations.ts").match(/^(?:export )?const /gmu),
    ).toBeNull();
  });
});

/** A project of population genetics whose variants file holds `i1` to
    `i4`, with the metadata file of the diversity's worked example and its
    column `pop` chosen, and the filters of individuals `filters`. */
function project(
  individualFilters: Project["individualFilters"] = [],
  grouping: Project["grouping"] = { kind: "populations", column: "pop" },
): Project {
  return deepFreeze<Project>({
    app: "popgen",
    variants: {
      fileId: "00112233445566778899aabbccddeeff",
      name: "panel.nei",
      size: 100,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: ["i1", "i2", "i3", "i4"],
        ploidy: 2,
        numVars: null,
      },
    },
    filters: [],
    filtersOff: [],
    individualFilters,
    individualFiltersOff: [],
    individuals: {
      fileId: "ffeeddccbbaa99887766554433221100",
      name: "pops.csv",
      csv: { encoding: "auto", separator: "auto", decimal: "auto" },
      typesSet: [],
      read: {
        kind: "read",
        table: {
          columns: ["name", "pop"],
          rows: [
            ["i1", "A"],
            ["i2", "B"],
            ["i3", "A"],
            ["i4", null],
            ["i5", "C"],
          ],
        },
        columns: [{ kind: "identifier" }, { kind: "categorical" }],
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      },
    },
    grouping,
    analyses: [],
    reference: null,
  });
}

describe("PA10 the helpers of the populations the spec lists", () => {
  test("populationsColumnOf gives the column chosen, and null for the one population", () => {
    expect(populationsColumnOf(project())).toBe("pop");
    expect(populationsColumnOf(project([], { kind: "onePopulation" }))).toBe(
      null,
    );
    expect(
      populationsColumnOf(project([], { kind: "populations", column: null })),
    ).toBe(null);
  });

  test("populationsByLists gives the populations the lists leave, each with an individual, and not one they empty", () => {
    expect(populationsByLists(project())).toEqual([
      ["A", ["i1", "i3"]],
      ["B", ["i2"]],
    ]);
    expect(
      populationsByLists(project([{ kind: "remove", individuals: ["i2"] }])),
    ).toEqual([["A", ["i1", "i3"]]]);
    expect(
      populationsByLists(project([{ kind: "keep", individuals: ["i4"] }])),
    ).toEqual([]);
  });

  test("loosenText says what to do about one population left empty, and about several", () => {
    expect(loosenText(true)).toBe(
      "Loosen the filters of individuals in the Variants step to keep it.",
    );
    expect(loosenText(false)).toBe(
      "Loosen the filters of individuals in the Variants step to keep them.",
    );
  });
});
