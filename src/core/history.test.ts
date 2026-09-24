import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
  MAX_UNDO_STEPS,
  commit,
  mapProjects,
  redo,
  startHistory,
  undo,
} from "./history.ts";
import type { History } from "./history.ts";
import {
  emptyProject,
  loadVariants,
  recordVariantsRead,
  setVariantFilter,
} from "./project.ts";
import type { Project, SourceRead } from "./project.ts";
import { deepFreeze, drawnCommand, sampleProject } from "./testSupport.ts";
import type { DrawnCommand } from "./testSupport.ts";

const LOAD_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const LOAD_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const READ: SourceRead = {
  kind: "read",
  individuals: ["i1", "i2", "i3", "i4"],
  ploidy: 2,
  numVars: null,
};

/** The sample project with the MAF filter at `maf`, a new project for
    each value but 0.95, the sample's own. */
function withMaf(maf: number): Project {
  return deepFreeze(
    setVariantFilter(sampleProject(), { kind: "maf", maxAllowedMaf: maf }),
  );
}

/** A history from `withMaf(0)` with a commit for each of `mafs`, frozen
    deeply. */
function historyOf(mafs: readonly number[], maxSteps: number): History {
  let h = startHistory(withMaf(0), maxSteps);
  for (const maf of mafs) {
    h = commit(h, withMaf(maf), `the MAF filter changed to ${String(maf)}`);
  }
  return deepFreeze(h);
}

/** The history after 201 commits from `startHistory(p0, 200)`, with the
    projects it was given, p0 first. */
function fullHistory(): {
  readonly h: History;
  readonly projects: readonly Project[];
} {
  const projects = Array.from({ length: 202 }, (_, i) => withMaf(i / 1000));
  const [first, ...rest] = projects;
  if (first === undefined) {
    throw new Error("popnei_web defect: no first project");
  }
  let h = deepFreeze(startHistory(first, MAX_UNDO_STEPS));
  for (const p of rest) {
    h = deepFreeze(commit(h, p, "the MAF filter changed"));
  }
  return { h, projects };
}

/** The projects of `h`, past, present and future, in order. */
function projectsOf(h: History): readonly Project[] {
  return [...h.past, h.present, ...h.future].map((e) => e.project);
}

/**
 * The history of a sequence of commands from the sample project, bounded
 * by `maxSteps`, and the projects of its steps, the first project first.
 * A command that changes nothing makes no step.
 */
function run(
  commands: readonly DrawnCommand[],
  maxSteps: number,
): { readonly h: History; readonly steps: readonly Project[] } {
  const first = sampleProject();
  const steps: Project[] = [first];
  let h = deepFreeze(startHistory(first, maxSteps));
  for (const command of commands) {
    const bound = command.bind(h.present.project);
    if (bound === null) {
      continue;
    }
    const next = deepFreeze(bound(h.present.project));
    const after = deepFreeze(commit(h, next, command.name));
    if (after !== h) {
      steps.push(next);
    }
    h = after;
  }
  return { h, steps };
}

/** Undoes until there is nothing to undo, checking the bound on the way. */
function undoAll(h: History): History {
  let current = h;
  for (;;) {
    const before = current;
    current = deepFreeze(undo(current));
    expect(current.past.length).toBeLessThanOrEqual(current.maxSteps);
    if (current === before) {
      return current;
    }
  }
}

/** Redoes until there is nothing to redo, checking the bound on the way. */
function redoAll(h: History): History {
  let current = h;
  for (;;) {
    const before = current;
    current = deepFreeze(redo(current));
    expect(current.past.length).toBeLessThanOrEqual(current.maxSteps);
    if (current === before) {
      return current;
    }
  }
}

const bound = fc.integer({ min: 1, max: 10 });

describe("WP3 D1 the history", () => {
  test("a new history holds its one project, with an empty description and nothing to undo or redo", () => {
    const p = withMaf(0);
    const h = startHistory(p, MAX_UNDO_STEPS);
    expect(h.present.project).toBe(p);
    expect(h.present.description).toBe("");
    expect(h.past).toEqual([]);
    expect(h.future).toEqual([]);
    expect(h.maxSteps).toBe(200);
  });

  test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "a bound of %s is a defect",
    (maxSteps) => {
      expect(() => startHistory(withMaf(0), maxSteps)).toThrow(
        /^popnei_web defect:/,
      );
    },
  );

  test("undo after a commit gives back the present before it, the same object", () => {
    const h = historyOf([0.1], 10);
    const undone = undo(commit(h, withMaf(0.2), "d"));
    expect(undone.present).toBe(h.present);
    expect(undone.present.project).toBe(h.present.project);
  });

  test("an undo moves the present to the future, a command after it drops the future, and a redo then does nothing", () => {
    const p0 = withMaf(0);
    const p1 = withMaf(0.1);
    const p2 = withMaf(0.2);
    const p3 = withMaf(0.3);
    let h = deepFreeze(startHistory(p0, 10));
    h = deepFreeze(commit(h, p1, "d1"));
    h = deepFreeze(commit(h, p2, "d2"));
    h = deepFreeze(undo(h));
    expect(h.present.project).toBe(p1);
    expect(h.future.map((e) => e.project)).toEqual([p2]);
    expect(h.future[0]?.project).toBe(p2);
    expect(h.future[0]?.description).toBe("d2");
    h = deepFreeze(commit(h, p3, "d3"));
    expect(h.present.project).toBe(p3);
    expect(h.future).toEqual([]);
    expect(h.past.map((e) => e.project)).toEqual([p0, p1]);
    expect(redo(h)).toBe(h);
  });

  test("a redo makes the next project the present, with the description of what it redid", () => {
    const h = historyOf([0.1, 0.2], 10);
    const undone = deepFreeze(undo(h));
    const redone = redo(undone);
    expect(redone.present).toBe(h.present);
    expect(redone.present.description).toBe("the MAF filter changed to 0.2");
    expect(redone.past).toEqual(h.past);
    expect(redone.future).toEqual([]);
  });

  test("a commit of the present project itself returns the history it was given", () => {
    const h = historyOf([0.1], 10);
    expect(commit(h, h.present.project, "d")).toBe(h);
  });

  test("an undo past the first project, and a redo with nothing to redo, return the history they were given", () => {
    const h = deepFreeze(startHistory(withMaf(0), 10));
    expect(undo(h)).toBe(h);
    expect(redo(h)).toBe(h);
    const undone = undoAll(historyOf([0.1, 0.2], 10));
    expect(undo(undone)).toBe(undone);
  });

  test("201 commits from a bound of 200 leave 200 entries in the past, the first of them the first commit", () => {
    const { h, projects } = fullHistory();
    expect(h.past).toHaveLength(200);
    expect(h.past[0]?.project).toBe(projects[1]);
    expect(h.present.project).toBe(projects[201]);
    expect(h.maxSteps).toBe(200);
  });

  test("undo keeps the bound of the history", () => {
    const { h, projects } = fullHistory();
    const undone = deepFreeze(undo(h));
    expect(undone.maxSteps).toBe(200);
    expect(undone.past).toHaveLength(199);
    const bottom = undoAll(h);
    expect(bottom.maxSteps).toBe(200);
    expect(bottom.present.project).toBe(projects[1]);
    expect(bottom.future).toHaveLength(200);
  });

  test("redo keeps the bound of the history", () => {
    const { h, projects } = fullHistory();
    const redone = deepFreeze(redo(deepFreeze(undo(h))));
    expect(redone.maxSteps).toBe(200);
    expect(redone.past).toHaveLength(200);
    const top = redoAll(undoAll(h));
    expect(top.maxSteps).toBe(200);
    expect(top.past).toHaveLength(200);
    expect(top.past[0]?.project).toBe(projects[1]);
    expect(top.present.project).toBe(projects[201]);
  });

  test("mapProjects keeps the bound of the history", () => {
    const { h } = fullHistory();
    const mapped = mapProjects(h, (p) =>
      setVariantFilter(p, { kind: "obs_het", maxAllowedObsHet: 0.5 }),
    );
    expect(mapped).not.toBe(h);
    expect(mapped.maxSteps).toBe(200);
    expect(mapped.past).toHaveLength(200);
  });

  /** A history whose past holds a project with no variants file and two
      with the load A pending, and whose present holds the load A too. */
  function pendingHistory(): History {
    const noFile = deepFreeze(emptyProject("popgen"));
    const loaded = deepFreeze(
      loadVariants(noFile, {
        fileId: LOAD_A,
        name: "panel.vcf",
        size: 4096,
        format: "vcf",
        readOptions: { ploidy: 2, onlyPassed: false },
      }),
    );
    const filtered = deepFreeze(
      setVariantFilter(loaded, { kind: "maf", maxAllowedMaf: 0.9 }),
    );
    const present = deepFreeze(
      setVariantFilter(filtered, {
        kind: "missing_data",
        maxAllowedMissingRate: 0.1,
      }),
    );
    let h = startHistory(noFile, 10);
    h = commit(h, loaded, "the variants file was loaded");
    h = commit(h, filtered, "the MAF filter changed");
    h = commit(h, present, "the missing data filter changed");
    return deepFreeze(h);
  }

  test("mapProjects records a read in every project that holds its load and leaves the others the same objects", () => {
    const h = pendingHistory();
    const mapped = mapProjects(h, (p) => recordVariantsRead(p, LOAD_A, READ));
    const [noFile, loaded, filtered] = mapped.past;
    expect(mapped.past).toHaveLength(3);
    expect(noFile).toBe(h.past[0]);
    expect(loaded?.project.variants?.read).toEqual(READ);
    expect(filtered?.project.variants?.read).toEqual(READ);
    expect(mapped.present.project.variants?.read).toEqual(READ);
    expect(mapped.past.map((e) => e.description)).toEqual(
      h.past.map((e) => e.description),
    );
    expect(mapped.present.description).toBe(h.present.description);
    expect(loaded?.project.filters).toBe(h.past[1]?.project.filters);
  });

  test("mapProjects records a read in the projects of the future too", () => {
    const h = deepFreeze(undo(deepFreeze(undo(pendingHistory()))));
    const mapped = mapProjects(h, (p) => recordVariantsRead(p, LOAD_A, READ));
    expect(mapped.future).toHaveLength(2);
    for (const entry of mapped.future) {
      expect(entry.project.variants?.read).toEqual(READ);
    }
    expect(mapped.past[0]).toBe(h.past[0]);
  });

  test("mapProjects with a read of a load no project holds returns the history it was given", () => {
    const h = pendingHistory();
    expect(mapProjects(h, (p) => recordVariantsRead(p, LOAD_B, READ))).toBe(h);
  });

  test("property: within the bound, undoing every step gives back the first project and redoing them all the last", () => {
    fc.assert(
      fc.property(
        bound.chain((maxSteps) =>
          fc.tuple(
            fc.constant(maxSteps),
            fc.array(drawnCommand, { maxLength: maxSteps }),
          ),
        ),
        ([maxSteps, commands]) => {
          const { h, steps } = run(commands, maxSteps);
          const bottom = undoAll(h);
          expect(bottom.present.project).toBe(steps[0]);
          expect(bottom.past).toEqual([]);
          const top = redoAll(bottom);
          expect(top.present.project).toBe(steps.at(-1));
          expect(projectsOf(top)).toEqual(steps);
          expect(projectsOf(top).every((p, i) => p === steps[i])).toBe(true);
        },
      ),
    );
  });

  test("property: beyond the bound, undoing all it can gives back the project of the first step the bound kept", () => {
    fc.assert(
      fc.property(
        bound.chain((maxSteps) =>
          fc.tuple(
            fc.constant(maxSteps),
            fc.array(drawnCommand, {
              minLength: maxSteps + 1,
              maxLength: maxSteps + 10,
            }),
          ),
        ),
        ([maxSteps, commands]) => {
          const { h, steps } = run(commands, maxSteps);
          const numSteps = steps.length - 1;
          fc.pre(numSteps > maxSteps);
          expect(h.past).toHaveLength(maxSteps);
          const bottom = undoAll(h);
          expect(bottom.present.project).toBe(steps[numSteps - maxSteps]);
          const top = redoAll(bottom);
          expect(top.present.project).toBe(steps.at(-1));
          expect(
            projectsOf(top).every(
              (p, i) => p === steps[i + numSteps - maxSteps],
            ),
          ).toBe(true);
        },
      ),
    );
  });

  test("property: a command after an undo empties the future, and the past never holds more entries than the bound", () => {
    fc.assert(
      fc.property(
        bound,
        fc.array(
          fc.oneof(
            drawnCommand,
            fc.constant("undo" as const),
            fc.constant("redo" as const),
          ),
          { maxLength: 30 },
        ),
        (maxSteps, actions) => {
          let h = deepFreeze(startHistory(sampleProject(), maxSteps));
          for (const action of actions) {
            if (action === "undo") {
              h = deepFreeze(undo(h));
            } else if (action === "redo") {
              h = deepFreeze(redo(h));
            } else {
              const command = action.bind(h.present.project);
              if (command === null) {
                continue;
              }
              const before = h;
              h = deepFreeze(
                commit(h, deepFreeze(command(h.present.project)), action.name),
              );
              if (h !== before) {
                expect(h.future).toEqual([]);
              }
            }
            expect(h.past.length).toBeLessThanOrEqual(maxSteps);
            expect(h.maxSteps).toBe(maxSteps);
          }
        },
      ),
    );
  });
});
