import { describe, expect, test } from "vitest";

import type { IndividualsKept } from "../../core/individualsKept.ts";
import type { Project } from "../../core/project.ts";
import type { AnalysisError, Notice } from "../../core/store.ts";
import type { LiveAnalysisName } from "./status.ts";
import {
  clockText,
  failedWordsOf,
  failureText,
  STOP_ALL_OFFERED,
  filtersLockedText,
  populationsLockedText,
  popgen2FailureText,
  minimumRefusedText,
  progressShare,
  removedText,
  runningBarLabel,
  runningText,
  passesOf,
  stoppedText,
  versionsText,
  warningsHeading,
} from "./words.ts";

function notice(
  kind: Notice["cause"]["kind"],
  description = "the filter of the variants by missing data changed",
): Notice {
  return {
    cause: { kind, description },
    removed: ["diversity"],
    leftBehind: [],
    stopped: [],
    writeLeftBehind: false,
    writeStopped: false,
    writeDiscarded: false,
  };
}

describe("the words of the frame of an analysis panel", () => {
  test("the clock counts minutes and seconds, and hours past the first", () => {
    expect(clockText(0)).toBe("0:00");
    expect(clockText(12)).toBe("0:12");
    expect(clockText(725)).toBe("12:05");
    expect(clockText(3725)).toBe("1:02:05");
    expect(clockText(12.9)).toBe("0:12");
  });

  test("the share done is rounded down, 100 only when the file is read", () => {
    const pass = { pass: 1, numPasses: 1 };
    expect(progressShare({ ...pass, bytesRead: 35, numBytes: 100 })).toBe(35);
    // 0.29 × 100 is 28.999… in floats.
    expect(progressShare({ ...pass, bytesRead: 29, numBytes: 100 })).toBe(29);
    expect(progressShare({ ...pass, bytesRead: 999, numBytes: 1000 })).toBe(99);
    // A pass over a .nei file ends below its size.
    expect(
      progressShare({ ...pass, bytesRead: 259_376, numBytes: 261_490 }),
    ).toBe(99);
    expect(progressShare({ ...pass, bytesRead: 100, numBytes: 100 })).toBe(100);
    expect(
      progressShare({ pass: 2, numPasses: 2, bytesRead: 50, numBytes: 100 }),
    ).toBe(75);
    expect(progressShare({ ...pass, bytesRead: 0, numBytes: 0 })).toBe(100);
  });

  test("the line of a calculation under way", () => {
    const line = {
      share: 35,
      seconds: 12,
      waitingFor: null,
      waitsForStatistics: false,
      passes: null,
    };
    expect(runningText(line)).toBe("Calculating · 35% · 0:12");
    expect(runningText({ ...line, share: null })).toBe("Calculating · 0:12");
    expect(runningText({ ...line, share: null, waitingFor: "panel.nei" })).toBe(
      "Waiting for panel.nei to be opened again, then calculating · 0:12",
    );
    expect(runningText({ ...line, share: 3, waitingFor: "panel.nei" })).toBe(
      "Calculating · 3% · 0:12",
    );
    expect(runningBarLabel("the diversity", false)).toBe(
      "Calculating the diversity",
    );
  });

  test("PA7 D1 the line of a run of two passes names the pass it reads, the share being of the whole run, and none before the first progress", () => {
    const line = {
      share: 17,
      seconds: 12,
      waitingFor: null,
      waitsForStatistics: false,
      passes: { pass: 1, numPasses: 2 },
    };
    expect(runningText(line)).toBe("Calculating · pass 1 of 2 · 17% · 0:12");
    expect(
      runningText({ ...line, share: 62, passes: { pass: 2, numPasses: 2 } }),
    ).toBe("Calculating · pass 2 of 2 · 62% · 0:12");
    expect(runningText({ ...line, share: null, passes: null })).toBe(
      "Calculating · 0:12",
    );
    const progress = {
      bytesRead: 90_000,
      numBytes: 261_490,
      pass: 1,
      numPasses: 2,
    };
    expect(passesOf(progress)).toEqual({ pass: 1, numPasses: 2 });
    expect(progressShare(progress)).toBe(17);
    expect(passesOf({ ...progress, numPasses: 1 })).toBeNull();
    expect(passesOf(null)).toBeNull();
  });

  test("VS7 D2 the line and the bar of a Run that waits for the statistics of each individual", () => {
    const line = {
      share: 35,
      seconds: 12,
      waitingFor: null,
      waitsForStatistics: true,
      passes: null,
    };
    expect(runningText(line)).toBe(
      "Calculating the statistics of each individual, which the thresholds of the individuals need · 35% · 0:12",
    );
    expect(runningText({ ...line, share: null })).toBe(
      "Calculating the statistics of each individual, which the thresholds of the individuals need · 0:12",
    );
    expect(runningText({ ...line, share: null, waitingFor: "panel.nei" })).toBe(
      "Waiting for panel.nei to be opened again, then calculating the statistics of each individual, which the thresholds of the individuals need · 0:12",
    );
    expect(runningBarLabel("the diversity", true)).toBe(
      "Calculating the statistics of each individual",
    );
  });

  test("WS8 D2 a result removed is told from the change: its cause after a command, the change undone or redone after an undo or a redo", () => {
    expect(removedText("the diversity", "the table", notice("command"))).toBe(
      "The diversity was removed because the filter of the variants by missing data changed. Undo brings back the table as it was, with no calculation; Run calculates a new one for the new settings.",
    );
    expect(removedText("the diversity", "the table", notice("undo"))).toBe(
      "Undone: the filter of the variants by missing data changed. The diversity was removed; Redo brings back the table as it was, with no calculation, and Run calculates a new one for the settings as they are now.",
    );
    expect(removedText("the diversity", "the table", notice("redo"))).toBe(
      "Redone: the filter of the variants by missing data changed. The diversity was removed; Undo brings back the table as it was, with no calculation, and Run calculates a new one for the settings as they are now.",
    );
  });

  test("IP8 D4 the principal components removed are told in the plural, with the plot and the table", () => {
    expect(
      removedText(
        "the principal components",
        "the plot and the table",
        notice("command"),
        true,
      ),
    ).toBe(
      "The principal components were removed because the filter of the variants by missing data changed. Undo brings back the plot and the table as they were, with no calculation; Run calculates new ones for the new settings.",
    );
    expect(
      removedText(
        "the principal components",
        "the plot and the table",
        notice("undo"),
        true,
      ),
    ).toBe(
      "Undone: the filter of the variants by missing data changed. The principal components were removed; Redo brings back the plot and the table as they were, with no calculation, and Run calculates new ones for the settings as they are now.",
    );
  });

  test("WS8 D2 a calculation stopped is told from the change that stopped it", () => {
    expect(
      stoppedText(
        "the diversity",
        notice(
          "command",
          "the variants file was read again with other options",
        ),
      ),
    ).toBe(
      "The calculation of the diversity was stopped because the variants file was read again with other options.",
    );
    expect(
      stoppedText(
        "the diversity",
        notice("command", "a new variants file was loaded"),
      ),
    ).toBe(
      "The calculation of the diversity was stopped because a new variants file was loaded.",
    );
    expect(
      stoppedText(
        "the diversity",
        notice("undo", "a new variants file was loaded"),
      ),
    ).toBe(
      "Undone: a new variants file was loaded. The calculation of the diversity was stopped.",
    );
    expect(
      stoppedText(
        "the diversity",
        notice("redo", "a new variants file was loaded"),
      ),
    ).toBe(
      "Redone: a new variants file was loaded. The calculation of the diversity was stopped.",
    );
  });

  test("the count of the warnings", () => {
    expect(warningsHeading(1)).toBe("1 warning");
    expect(warningsHeading(2)).toBe("2 warnings");
  });

  test("each failure that is not popnei's has its words", () => {
    expect(
      failureText(
        { kind: "reopenFailed", name: "panel.nei", message: "gone" },
        "panel.nei",
      ),
    ).toBe(
      "panel.nei could not be read again; it may have changed on the disk since it was picked. Load it again in the Variants step.",
    );
    expect(
      failureText({ kind: "workerFailed", message: "trap" }, "panel.nei"),
    ).toBe(
      "The calculation stopped unexpectedly. Run it again. If it stops again, load panel.nei again in the Variants step.",
    );
    expect(
      failureText(
        { kind: "defect", message: "the result had no pops." },
        "panel.nei",
      ),
    ).toBe(
      "The application met an error of its own: the result had no pops. Run it again.",
    );
    expect(
      failureText({ kind: "couldNotStart", reason: "no ready" }, "panel.nei"),
    ).toBe(
      "The application could not start its calculations. Save the project, reload the page, and open the project again.",
    );
    expect(failureText({ kind: "protocolMismatch" }, "panel.nei")).toBe(
      "The page is out of date. Save the project, reload the page, and open the project again.",
    );
    expect(() =>
      failureText({ kind: "files", message: "zip" }, "panel.nei"),
    ).toThrow(/^popnei_web defect: /);
  });
});

describe("the line of the versions", () => {
  test("the line of the versions", () => {
    expect(versionsText("0.1.0", "0.1.0")).toBe(
      "Calculated with popnei 0.1.0, in version 0.1.0 of the application.",
    );
    // Two versions that differ, so that one in the place of the other
    // shows.
    expect(versionsText("0.1.0", "0.2.0")).toBe(
      "Calculated with popnei 0.1.0, in version 0.2.0 of the application.",
    );
  });
});

describe("PA5 D1 the refusals of the minimum of individuals", () => {
  test("a comma as a whole number, any other character named, why, and the minimum kept, with commas between thousands", () => {
    expect(minimumRefusedText({ kind: "notTaken", text: "," }, 20)).toBe(
      "Write the minimum as a whole number, 20 and not 20,0; the minimum stays 20.",
    );
    expect(minimumRefusedText({ kind: "notTaken", text: "x" }, 12)).toBe(
      "‘x’ cannot be typed in the minimum, which is a whole number, as 20; the minimum stays 12.",
    );
    expect(
      minimumRefusedText({ kind: "offStep", typed: "2.5", decimals: 0 }, 20),
    ).toBe("2.5 is not a whole number; the minimum stays 20.");
    expect(
      minimumRefusedText(
        { kind: "aboveMax", typed: "5000000000", maxValue: 4_294_967_295 },
        1500,
      ),
    ).toBe(
      "5,000,000,000 is more than 4,294,967,295; the minimum stays 1,500.",
    );
  });
});

describe("AP6 D1 the failures on popgen2.html, in its words", () => {
  test("each failure that is not popnei's names the box Variants, and a reload with no project to save", () => {
    expect(
      popgen2FailureText(
        { kind: "reopenFailed", name: "panel.nei", message: "gone" },
        "panel.nei",
      ),
    ).toBe(
      "panel.nei could not be read again; it may have changed on the disk since it was opened. Open it again in the box Variants.",
    );
    expect(
      popgen2FailureText(
        { kind: "workerFailed", message: "trap" },
        "panel.nei",
      ),
    ).toBe(
      "The calculation stopped unexpectedly. Run it again. If it stops again, open panel.nei again in the box Variants.",
    );
    expect(
      popgen2FailureText(
        { kind: "defect", message: "the result had no pops." },
        "panel.nei",
      ),
    ).toBe(
      "The application met an error of its own: the result had no pops. Run it again.",
    );
    expect(
      popgen2FailureText(
        { kind: "couldNotStart", reason: "no ready" },
        "panel.nei",
      ),
    ).toBe(
      "The application could not start its calculations. Reload the page and open panel.nei again.",
    );
    expect(popgen2FailureText({ kind: "protocolMismatch" }, "panel.nei")).toBe(
      "The page is out of date. Reload the page and open panel.nei again.",
    );
    expect(() =>
      popgen2FailureText({ kind: "files", message: "zip" }, "panel.nei"),
    ).toThrow(/^popnei_web defect: /);
  });
});

describe("AP6 D1 failedWordsOf, the words a panel gives the errors of its analysis", () => {
  const refusalText = (message: string): string => `refused: ${message}`;
  const project = {} as Project;
  const kept = { list: { kind: "known" } } as unknown as IndividualsKept;
  const error: AnalysisError = {
    kind: "failed",
    error: { kind: "workerFailed", message: "trap" },
  };

  test("a panel with words of its own for none: its refusal alone, the rest left to failedText", () => {
    expect(
      failedWordsOf(
        {
          refusalText,
          statisticsFailedText: null,
          workerFailedText: null,
          failureText: null,
        },
        { ofStatistics: false, waited: false },
        kept,
      ),
    ).toEqual({ refusalText });
  });

  test("a panel with its own words of a worker that stopped and of the page's failures: the worker's given the individuals kept", () => {
    const words = failedWordsOf(
      {
        refusalText,
        statisticsFailedText: null,
        workerFailedText: (_p, given) =>
          given === kept ? "out of memory, kept" : "out of memory",
        failureText: popgen2FailureText,
      },
      { ofStatistics: false, waited: false },
      kept,
    );
    expect(words.workerFailedText?.(project)).toBe("out of memory, kept");
    expect(words.failureText).toBe(popgen2FailureText);
    expect(words.statisticsFailedText).toBeUndefined();
  });

  test("the failure of the statistics of each individual: the panel's words of them, told whether its Run waited for them", () => {
    const told: boolean[] = [];
    const words = failedWordsOf(
      {
        refusalText,
        statisticsFailedText: (_error, _p, failure, waited) => {
          told.push(waited);
          return failure({ kind: "workerFailed", message: "trap" });
        },
        workerFailedText: null,
        failureText: null,
      },
      { ofStatistics: true, waited: true },
      kept,
    );
    expect(
      words.statisticsFailedText?.(error, project, () => "the frame's words"),
    ).toBe("the frame's words");
    expect(told).toEqual([true]);
  });

  test("the failure of the statistics in a panel that does not read them is a defect", () => {
    expect(() =>
      failedWordsOf(
        {
          refusalText,
          statisticsFailedText: null,
          workerFailedText: null,
          failureText: null,
        },
        { ofStatistics: true, waited: false },
        kept,
      ),
    ).toThrow(/^popnei_web defect: /u);
  });
});

/** The PCA, the PCoA and the diversity as `liveAnalysisOf` of status.ts
    names them. */
const PCA: LiveAnalysisName = {
  id: "pca",
  name: "the PCA",
  tab: "PCA",
  readsPopulations: false,
};
const PCOA: LiveAnalysisName = { ...PCA, name: "the PCoA" };
const DIVERSITY: LiveAnalysisName = {
  id: "diversity",
  name: "the diversity",
  tab: "Populations",
  readsPopulations: true,
};

describe("PT1 D7 the words of the lock of the filters, with and without another analysis live", () => {
  test("the PCA alone, and the PCoA, as before", () => {
    expect(filtersLockedText(PCA, [], false)).toBe(
      "Stop the PCA in the PCA tab to change the filters; then press Run there to calculate it again.",
    );
    expect(filtersLockedText(PCOA, [], false)).toBe(
      "Stop the PCoA in the PCA tab to change the filters; then press Run there to calculate it again.",
    );
  });

  test("the diversity alone names its tab, Populations", () => {
    expect(filtersLockedText(DIVERSITY, [], false)).toBe(
      "Stop the diversity in the Populations tab to change the filters; then press Run there to calculate it again.",
    );
  });

  test("until the band offers Stop all, the words name the Stop of each tab", () => {
    expect(filtersLockedText(PCA, [DIVERSITY], false)).toBe(
      "Stop the PCA in the PCA tab and the diversity in the Populations tab to change the filters; then press Run in each tab to calculate them again.",
    );
    expect(filtersLockedText(DIVERSITY, [PCA], false)).toBe(
      "Stop the diversity in the Populations tab and the PCA in the PCA tab to change the filters; then press Run in each tab to calculate them again.",
    );
    expect(filtersLockedText(PCA, [], false)).toBe(
      filtersLockedText(PCA, [], true),
    );
  });

  test("the band offers no Stop all yet: work package 4 turns it on", () => {
    expect(STOP_ALL_OFFERED).toBe(false);
  });

  test("the PCA running with the diversity live adds Stop all, which stops the diversity too", () => {
    expect(filtersLockedText(PCA, [DIVERSITY], true)).toBe(
      "Stop the PCA in the PCA tab to change the filters, or press Stop all beside the heading Popnei to stop the diversity too; then press Run in each tab to calculate them again.",
    );
    expect(filtersLockedText(PCOA, [DIVERSITY], true)).toBe(
      "Stop the PCoA in the PCA tab to change the filters, or press Stop all beside the heading Popnei to stop the diversity too; then press Run in each tab to calculate them again.",
    );
  });

  test("the diversity running with the PCA live adds Stop all, which stops the PCA too", () => {
    expect(filtersLockedText(DIVERSITY, [PCA], true)).toBe(
      "Stop the diversity in the Populations tab to change the filters, or press Stop all beside the heading Popnei to stop the PCA too; then press Run in each tab to calculate them again.",
    );
  });

  test("two analyses live beside the one running are named both, in their order", () => {
    expect(
      filtersLockedText(
        PCA,
        [DIVERSITY, { ...DIVERSITY, name: "the LD decay" }],
        true,
      ),
    ).toBe(
      "Stop the PCA in the PCA tab to change the filters, or press Stop all beside the heading Popnei to stop the diversity and the LD decay too; then press Run in each tab to calculate them again.",
    );
  });
});

describe("PT3 D1 the words of the lock of the populations, with and without another analysis live", () => {
  test("the diversity alone: stop it in the Populations tab to change the populations, then Run there", () => {
    expect(populationsLockedText(DIVERSITY, [], false)).toBe(
      "Stop the diversity in the Populations tab to change the populations; then press Run there to calculate it again.",
    );
    expect(populationsLockedText(DIVERSITY, [], true)).toBe(
      populationsLockedText(DIVERSITY, [], false),
    );
  });

  test("until the band offers Stop all, the words name the Stop of each tab", () => {
    expect(populationsLockedText(DIVERSITY, [PCA], false)).toBe(
      "Stop the diversity in the Populations tab and the PCA in the PCA tab to change the populations; then press Run in each tab to calculate them again.",
    );
  });

  test("with Stop all offered and the PCA live beside it, the words name Stop all, which stops the PCA too", () => {
    expect(populationsLockedText(DIVERSITY, [PCA], true)).toBe(
      "Stop the diversity in the Populations tab to change the populations, or press Stop all beside the heading Popnei to stop the PCA too; then press Run in each tab to calculate them again.",
    );
    expect(populationsLockedText(DIVERSITY, [PCOA], true)).toBe(
      "Stop the diversity in the Populations tab to change the populations, or press Stop all beside the heading Popnei to stop the PCoA too; then press Run in each tab to calculate them again.",
    );
  });
});
