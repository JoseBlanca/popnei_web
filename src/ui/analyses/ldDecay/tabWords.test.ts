/**
 * The words of the LD decay of the Populations tab of popgen2.html
 * (docs/specs/steps/popgen2-populations.md, "The LD decay"): the line of
 * the populations, the lock of the one pass, the lines of a Stop, of a
 * failure and of what it waits for, the time of the last run; what the
 * status region says of it; which of its failures end its live state;
 * and the round of three live analyses.
 */
import { describe, expect, test } from "vitest";

import { liveAnalysisOf } from "../status.ts";
import type { IndividualsKept } from "../../../core/individualsKept.ts";
import {
  emptyProject,
  loadIndividuals,
  setGrouping,
} from "../../../core/project.ts";
import type { Project } from "../../../core/project.ts";
import type { AnalysisStatus, AppState } from "../../../core/store.ts";
import { deepFreeze } from "../../../core/testSupport.ts";
import type { JobResult } from "../../../worker/protocol.ts";
import { roundText, stopAllText } from "../liveWords.ts";
import { ldDecayFailureEndsLive } from "./liveEnd.ts";
import {
  LD_DECAY_HELD_AFTER_CRASH,
  LD_DECAY_STARTED_BY_ITSELF,
  ldDecayStoppedText,
} from "./liveWords.ts";
import {
  LD_DECAY_AFTER_CRASH_LINE,
  LD_DECAY_FAILURE_ENDED_LINE,
  lastRunText,
  ldDecayPanelLive,
  ldDecayStoppedLine,
  ldDecayTabLock,
  ldDecayTabReadyLines,
  ldDecayWaitingLine,
} from "./tabWords.ts";

/** The ten individuals of the variants file, s000 to s009. */
const INDIVIDUALS = Array.from({ length: 10 }, (_, i) => `s00${String(i)}`);

/** A project of popgen2.html with `ld.nei` of INDIVIDUALS read, and,
    given `rows`, the individuals file `ld_pops.csv` of those rows, its
    column `pop` chosen when `column` is true and "None" otherwise. */
function projectOf(
  rows: readonly (readonly [string, string | null])[] | null,
  column = true,
): Project {
  const base: Project = {
    ...emptyProject("popgen"),
    variants: {
      fileId: "a".repeat(32),
      name: "ld.nei",
      size: 1000,
      format: "nei",
      readOptions: null,
      read: {
        kind: "read",
        individuals: INDIVIDUALS,
        ploidy: 2,
        numVars: null,
        keepsPassed: false,
      },
    },
  };
  if (rows === null) return deepFreeze(base);
  const loaded = loadIndividuals(base, {
    fileId: "b".repeat(32),
    name: "ld_pops.csv",
    csv: { encoding: "auto", separator: "auto", decimal: "auto" },
  });
  if (loaded.individuals === null) throw new Error("no individuals file");
  const read: Project = {
    ...loaded,
    individuals: {
      ...loaded.individuals,
      read: {
        kind: "read",
        table: { columns: ["id", "pop"], rows: rows.map(([n, p]) => [n, p]) },
        columns: [{ kind: "identifier" }, { kind: "categorical" }],
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      },
    },
  };
  return deepFreeze(
    setGrouping(read, { kind: "populations", column: column ? "pop" : null }),
  );
}

/** The individuals kept, `individuals` or every one for `null`, known. */
function keptOf(individuals: readonly string[] | null): IndividualsKept {
  return {
    list: { kind: "known", individuals },
    byLists: individuals ?? INDIVIDUALS,
    counts: [],
  };
}

/** s000 to s003 in A, s004 to s007 in B, s008 with an empty cell, and
    s009 not in the file. */
const ROWS: readonly (readonly [string, string | null])[] = [
  ["s000", "A"],
  ["s001", "A"],
  ["s002", "A"],
  ["s003", "A"],
  ["s004", "B"],
  ["s005", "B"],
  ["s006", "B"],
  ["s007", "B"],
  ["s008", null],
];

/** A state of the store of the page with the LD decay in `status`. */
function stateWith(
  status: AnalysisStatus<JobResult>,
): AppState<unknown, unknown> {
  return {
    analyses: [{ id: "ldDecay", status }],
  } as unknown as AppState<unknown, unknown>;
}

describe("LT1 D3 the words of the LD decay of the Populations tab", () => {
  test("the line of the populations: those of the column and the unclassified left out", () => {
    const lines = ldDecayTabReadyLines(projectOf(ROWS), keptOf(null));
    expect(lines).toEqual([
      "2 populations: A, 4 individuals; B, 4 individuals",
      "2 unclassified individuals kept are left out, as the box Individuals says.",
    ]);
  });

  test("the one population of no file, and of a column that classifies nobody, in the words of the LD decay", () => {
    expect(ldDecayTabReadyLines(projectOf(null), keptOf(null))).toEqual([
      "1 population, Unclassified: 10 individuals. No individual is assigned to a population, so the LD decay is of every individual kept as one population.",
    ]);
    const nobody = projectOf(ROWS.map(([name]) => [name, null]));
    expect(ldDecayTabReadyLines(nobody, keptOf(null))).toEqual([
      "1 population, Unclassified: 10 individuals. No individual is assigned to a population, so the LD decay is of every individual kept as one population. If the individuals belong to several populations, the r² of Unclassified is that of all the individuals taken as one population, and comes out higher than within each population at every distance; choose a column of populations in the box Individuals to get each one's.",
    ]);
    expect(ldDecayTabReadyLines(projectOf(ROWS, false), keptOf(null))[0]).toBe(
      "1 population, Unclassified: 10 individuals. No individual is assigned to a population, so the LD decay is of every individual kept as one population.",
    );
  });

  test("the lock of the one pass names the LD decay", () => {
    expect(ldDecayTabLock(projectOf(null), "reading")).toBe(
      "Run once ld.nei is read to the end: the reading under way in the box Variants and the LD decay cannot run at once.",
    );
    expect(ldDecayTabLock(projectOf(null), null)).toBeNull();
  });

  test("the lines of a Stop, of a failure that ended it and of what it waits for", () => {
    expect(ldDecayStoppedLine(false)).toBe(
      "Stopped: the LD decay no longer starts by itself after a change. Run calculates it and starts it again after each change.",
    );
    expect(ldDecayStoppedLine(true)).toBe(
      "Stopped: the LD decay no longer starts by itself after a change. After the next change, Run calculates it and starts it again after each change.",
    );
    expect(LD_DECAY_FAILURE_ENDED_LINE).toBe(
      "The LD decay no longer starts by itself after a change, since its calculation failed. Run calculates it and starts it again after each change.",
    );
    expect(ldDecayWaitingLine("changes", null)).toBe(
      "The LD decay starts in a moment, later if the filters, its options or the populations change.",
    );
    expect(ldDecayWaitingLine("changes", "the PCA")).toBe(
      "The LD decay starts after the PCA, once the filters, the options and the populations stop changing.",
    );
    expect(ldDecayWaitingLine("behind", "the diversity")).toBe(
      "The LD decay starts once the diversity, which is running, ends.",
    );
    expect(ldDecayWaitingLine("download", null)).toBe(
      "The LD decay starts again when the download is written or closed.",
    );
    expect(ldDecayWaitingLine("afterCrash", null)).toBe(
      LD_DECAY_AFTER_CRASH_LINE,
    );
    expect(LD_DECAY_AFTER_CRASH_LINE).toBe(
      "The LD decay starts after the next change of the filters, of its options or of the populations, or when Run is pressed.",
    );
    expect(
      ldDecayPanelLive(
        {
          kind: "live",
          aboutToStart: "behind",
          running: false,
          after: "diversity",
        },
        "the diversity",
        false,
      ),
    ).toEqual({
      kind: "live",
      aboutToStartLine:
        "The LD decay starts once the diversity, which is running, ends.",
      runBeside: false,
    });
    expect(ldDecayPanelLive({ kind: "endedByFailure" }, null, false)).toEqual({
      kind: "stopped",
      line: LD_DECAY_FAILURE_ENDED_LINE,
    });
  });

  test("the time of the last run: under a second, minutes and seconds, and past an hour", () => {
    expect(lastRunText(0.4)).toBe("The last run took less than a second.");
    expect(lastRunText(59)).toBe("The last run took 0:59.");
    expect(lastRunText(61.7)).toBe("The last run took 1:01.");
    expect(lastRunText(3725)).toBe("The last run took 1:02:05.");
  });

  test("the status region: its start by itself, held after a crash, a Stop", () => {
    expect(LD_DECAY_STARTED_BY_ITSELF).toBe(
      "Calculating the LD decay again. To change the filters or the populations, stop it in the Populations tab.",
    );
    expect(LD_DECAY_HELD_AFTER_CRASH).toBe(
      "The LD decay did not start: it starts after the next change of the filters, of its options or of the populations, or when Run is pressed in the Populations tab.",
    );
    expect(ldDecayStoppedText(true)).toBe(
      "LD decay stopped. Press Run in the Populations tab to calculate it again.",
    );
    expect(ldDecayStoppedText(false)).toBe("LD decay stopped.");
  });

  test("the failures that end its live state: any crash, a refusal for memory, those only a reload mends; not another refusal nor a file", () => {
    const failed = (
      error: Extract<AnalysisStatus<JobResult>, { kind: "error" }>["error"],
    ): boolean =>
      ldDecayFailureEndsLive(
        stateWith({
          kind: "error",
          key: "k",
          error,
        } as AnalysisStatus<JobResult>),
        "ldDecay",
      );
    expect(
      failed({ kind: "failed", error: { kind: "workerFailed", message: "x" } }),
    ).toBe(true);
    expect(
      failed({
        kind: "refused",
        message:
          "this machine has not the memory for the pairs counted at every distance, 250000000 values of 16 bytes",
      }),
    ).toBe(true);
    expect(failed({ kind: "refused", message: "`numBins` is 0." })).toBe(false);
    expect(
      failed({ kind: "failed", error: { kind: "protocolMismatch" } } as never),
    ).toBe(true);
  });

  test("the round of the three names the analyses of one tab with it once; Stop all names Run in their tabs", () => {
    const s = { project: projectOf(null) } as unknown as AppState<
      JobResult,
      unknown
    >;
    const pca = liveAnalysisOf(s, "pca");
    const diversity = liveAnalysisOf(s, "diversity");
    const ld = liveAnalysisOf(s, "ldDecay");
    expect(ld).toEqual({
      id: "ldDecay",
      name: "the LD decay",
      tab: "Populations",
      readsPopulations: true,
    });
    expect(roundText([pca, diversity, ld])).toBe(
      "Calculating the PCA, the diversity and then the LD decay again. To change the filters, press Stop all beside the heading Popnei, or stop each in its tab; to change the populations, stop the diversity and the LD decay in the Populations tab.",
    );
    expect(
      stopAllText([
        { named: pca, runOffered: false },
        { named: diversity, runOffered: true },
        { named: ld, runOffered: true },
      ]),
    ).toBe(
      "Stopped: the PCA, the diversity and the LD decay no longer start by themselves. Press Run for the diversity and the LD decay in the Populations tab to calculate them again.",
    );
  });
});
