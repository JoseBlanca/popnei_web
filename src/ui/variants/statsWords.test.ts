import { describe, expect, test } from "vitest";

import { emptyProject, loadVariants } from "../../core/project.ts";
import type { Key } from "../../core/keys.ts";
import type { AnalysisStatus } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import {
  overIndividualsLine,
  overVariantsLine,
  pendingText,
  statsBarLabel,
  statsButton,
  statsFailedText,
  statsRunningLine,
} from "./statsWords.ts";

const PANEL = loadVariants(emptyProject("popgen"), {
  fileId: "0123456789abcdef0123456789abcdef",
  name: "panel.vcf.gz",
  size: 1000,
  format: "vcf",
  readOptions: { ploidy: null, onlyPassed: false },
});

const KEY = "k" as Key;

const RUNNING: AnalysisStatus<JobResult> = {
  kind: "running",
  key: KEY,
  runId: 1,
  progress: null,
  waitsForStatistics: false,
};
const READY: AnalysisStatus<JobResult> = { kind: "ready", key: KEY };

describe("the words of the statistics of the open file", () => {
  test("the bar and its line name the statistic, with its share once known", () => {
    expect(statsBarLabel("individualChecks")).toBe(
      "Calculating the statistics of the individuals",
    );
    expect(statsRunningLine("variantChecks", null)).toBe(
      "Calculating the statistics of the variants…",
    );
    expect(statsRunningLine("individualChecks", 34)).toBe(
      "Calculating the statistics of the individuals… 34%",
    );
  });

  test("a part not started says what it waits for, what held it back, or that it was stopped", () => {
    expect(pendingText({ kind: "waiting", after: "variantsSummary" })).toBe(
      "Waiting for the count of the variants.",
    );
    expect(pendingText({ kind: "waiting", after: "individualChecks" })).toBe(
      "Waiting for the statistics of the individuals.",
    );
    expect(pendingText({ kind: "waiting", after: null })).toBe("Calculating…");
    expect(pendingText({ kind: "blocked", by: "variantsSummary" })).toBe(
      "Not calculated: the variants were not counted.",
    );
    expect(pendingText({ kind: "blocked", by: "individualChecks" })).toBe(
      "Not calculated: the statistics of the individuals failed.",
    );
    expect(pendingText({ kind: "stopped" })).toBe("Stopped.");
    expect(() => pendingText({ kind: "blocked", by: "pca" })).toThrow(
      /popnei_web defect/,
    );
  });

  test("the failures are short: popnei's words, a crash whose details the error bar has, a file that changed", () => {
    expect(
      statsFailedText(
        "individualChecks",
        {
          kind: "refused",
          message:
            "line 84 of the VCF, the column POS: `x80` is not a position.",
        },
        PANEL,
      ),
    ).toBe(
      "popnei could not read panel.vcf.gz: line 84 of the VCF, the column POS: `x80` is not a position. Correct the file, or fetch it again, and open it again.",
    );
    expect(
      statsFailedText(
        "variantChecks",
        { kind: "refused", message: "a genotype has `3` alleles." },
        PANEL,
      ),
    ).toBe(
      "popnei could not calculate the statistics of the variants: a genotype has “3” alleles.",
    );
    expect(
      statsFailedText(
        "individualChecks",
        {
          kind: "failed",
          error: { kind: "workerFailed", message: "out of memory" },
        },
        PANEL,
      ),
    ).toBe("The statistics of the individuals could not be calculated.");
    expect(
      statsFailedText(
        "variantChecks",
        { kind: "failed", error: { kind: "defect", message: "a defect" } },
        PANEL,
      ),
    ).toBe("The statistics of the variants could not be calculated.");
    expect(
      statsFailedText(
        "variantChecks",
        {
          kind: "failed",
          error: {
            kind: "reopenFailed",
            name: "panel.vcf.gz",
            message: "changed",
          },
        },
        PANEL,
      ),
    ).toBe(
      "panel.vcf.gz could not be read again; it may have changed on the disk since it was opened. Open it again.",
    );
    expect(() =>
      statsFailedText(
        "variantChecks",
        { kind: "failed", error: { kind: "files", message: "x" } },
        PANEL,
      ),
    ).toThrow(/popnei_web defect/);
  });

  test("each histogram says how many variants or individuals it is over", () => {
    expect(overVariantsLine(1200)).toBe("Over 1,200 variants");
    expect(overIndividualsLine(1)).toBe("Over 1 individual");
  });

  test("one button: Stop while one runs or is about to start, start again when resume would start one, none otherwise", () => {
    expect(statsButton([RUNNING, READY], [null, null], true)).toEqual({
      kind: "stop",
    });
    expect(
      statsButton(
        [
          {
            kind: "done",
            key: KEY,
            result: null as never,
            warnings: [],
            check: null,
          },
          READY,
        ],
        [null, { kind: "waiting", after: null }],
        true,
      ),
    ).toEqual({ kind: "stop" });
    expect(
      statsButton(
        [READY, READY],
        [{ kind: "stopped" }, { kind: "waiting", after: "individualChecks" }],
        true,
      ),
    ).toEqual({ kind: "resume" });
    expect(
      statsButton(
        [READY, READY],
        [
          { kind: "waiting", after: "variantsSummary" },
          { kind: "waiting", after: "variantsSummary" },
        ],
        false,
      ),
    ).toBeNull();
  });
});
