/**
 * What the section of the writing shows in each state of the writing,
 * from docs/specs/analyses/writeVariants.md, "The step's part": the line
 * or the error above the button, the warning, and the one button with
 * what describes it.
 */
import { describe, expect, test } from "vitest";

import { keyFromWire } from "../../../core/keys.ts";
import type { Project } from "../../../core/project.ts";
import type { WriteStatus } from "../../../core/store.ts";
import { sampleProject } from "../../../core/testSupport.ts";
import type { WriteEstimate } from "../../../core/writeEstimate.ts";
import { writeParts } from "./writeParts.ts";

const KEY = keyFromWire("a".repeat(64));

/** The sample project of core: panel.nei with filters, so its file is
    panel.filtered.nei. */
const PROJECT: Project = sampleProject();

const PASS = { numVars: 1152, filtering: {} };

/** The estimate of `numVars` variants of `numIndividuals` individuals. */
function estimateOf(
  numVars: number,
  numIndividuals: number,
  bound = false,
): WriteEstimate {
  const numBytes = numVars * numIndividuals;
  return {
    numVars,
    numIndividuals,
    numBytes,
    bound,
    warn: numBytes >= 500_000_000,
    tooLarge: numBytes >= 1_800_000_000 && !bound,
  };
}

const SMALL = estimateOf(1152, 200);
const READY: WriteStatus<Blob> = { kind: "ready", key: KEY, dropped: false };

describe("VS5 D3 the parts of the section of the writing in each state", () => {
  test("ready: Write, described by the size expected, and nothing above it", () => {
    expect(writeParts(READY, SMALL, PROJECT)).toEqual({
      message: null,
      warning: null,
      button: {
        kind: "write",
        disabled: false,
        description: "About 230 KB: 1,152 variants of 200 individuals.",
      },
    });
  });

  test("ready with no size known: Write, described by the words of the Count", () => {
    expect(writeParts(READY, null, PROJECT).button).toEqual({
      kind: "write",
      disabled: false,
      description:
        "The size of the file is known once the variants are counted: Count, above.",
    });
  });

  test("ready with no size known while the Count runs: Write, described by the end of the Count, with no word that asks for it", () => {
    expect(writeParts(READY, null, PROJECT, "counting").button).toEqual({
      kind: "write",
      disabled: false,
      description: "The size of the file is known once the Count above ends.",
    });
  });

  test("ready at the warning's size: the warning above Write, which can still be pressed", () => {
    const parts = writeParts(READY, estimateOf(500_000, 1000), PROJECT);
    expect(parts.warning).toMatch(/^A file of about 500\.0 MB may need/u);
    expect(parts.button).toEqual({
      kind: "write",
      disabled: false,
      description: "About 500.0 MB: 500,000 variants of 1,000 individuals.",
    });
    expect(
      writeParts(READY, estimateOf(499_999, 1000), PROJECT).warning,
    ).toBeNull();
  });

  test("ready at the largest size from the counts: Write disabled with its reason, and no warning", () => {
    expect(writeParts(READY, estimateOf(2_000_000, 1000), PROJECT)).toEqual({
      message: null,
      warning: null,
      button: {
        kind: "write",
        disabled: true,
        description:
          "A file of about 2.0 GB cannot be written in a browser tab: popnei needs more than twice the file in its memory while it writes it, and a tab gives popnei at most 4 GB. Remove variants or individuals with the filters, or write the file with popnei in Python.",
      },
    });
  });

  test("ready after a write dropped: its line above Write", () => {
    expect(
      writeParts({ ...READY, dropped: true }, SMALL, PROJECT).message,
    ).toEqual({
      kind: "line",
      text: "The file was not kept, since the filters changed while it was written.",
    });
  });

  test("locked: Write disabled, described by the store's reason", () => {
    expect(
      writeParts(
        { kind: "locked", reason: "The filters keep none." },
        SMALL,
        PROJECT,
      ),
    ).toEqual({
      message: null,
      warning: null,
      button: {
        kind: "write",
        disabled: true,
        description: "The filters keep none.",
      },
    });
  });

  test("running, and waiting for the statistics: Stop", () => {
    const running = {
      kind: "running",
      key: KEY,
      runId: 3,
      progress: null,
      waitsForStatistics: false,
    } as const;
    expect(writeParts(running, SMALL, PROJECT)).toEqual({
      message: null,
      warning: null,
      button: { kind: "stop" },
    });
    expect(
      writeParts({ ...running, waitsForStatistics: true }, SMALL, PROJECT)
        .button,
    ).toEqual({ kind: "stop" });
  });

  test("done: Save of the file's name and size", () => {
    const done: WriteStatus<Blob> = {
      kind: "done",
      key: KEY,
      written: {
        format: "nei",
        file: new Blob([]),
        numBytes: 250_994,
        passStats: PASS,
      },
    };
    expect(writeParts(done, SMALL, PROJECT)).toEqual({
      message: null,
      warning: null,
      button: { kind: "save", name: "panel.filtered.nei", numBytes: 250_994 },
    });
  });

  test("saved: its line, and Write", () => {
    const parts = writeParts(
      {
        kind: "saved",
        key: KEY,
        written: { format: "nei", numBytes: 250_994, passStats: PASS },
      },
      SMALL,
      PROJECT,
    );
    expect(parts.message).toEqual({
      kind: "line",
      text: "panel.filtered.nei, 251 KB, was handed to the browser to save. To save it again, write it again.",
    });
    expect(parts.button?.kind).toBe("write");
  });

  test("locked with a large estimate shows no warning; saved with one shows it above Write", () => {
    const large = estimateOf(3_000_000, 200);
    expect(
      writeParts(
        {
          kind: "locked",
          reason: "Load a variants file in the Variants step.",
        },
        large,
        PROJECT,
      ).warning,
    ).toBeNull();
    const saved = writeParts(
      {
        kind: "saved",
        key: KEY,
        written: { format: "nei", numBytes: 250_994, passStats: PASS },
      },
      large,
      PROJECT,
    );
    expect(saved.warning).toMatch(/^A file of about 600\.0 MB may need/);
    expect(saved.button?.kind).toBe("write");
  });

  test("no variant: its line, and no button", () => {
    expect(
      writeParts(
        {
          kind: "noVariant",
          key: KEY,
          written: {
            format: "nei",
            numBytes: 3594,
            passStats: {
              numVars: 0,
              filtering: { missing_data: { varsProcessed: 1200, varsKept: 0 } },
            },
          },
        },
        SMALL,
        PROJECT,
      ),
    ).toEqual({
      message: {
        kind: "line",
        text: "The filters kept none of the variants of panel.nei, so there is nothing to write. Loosen the filters above.",
      },
      warning: null,
      button: null,
    });
  });

  test("no variant of an empty source: the words of a file of no variant, and no button", () => {
    expect(
      writeParts(
        {
          kind: "noVariant",
          key: KEY,
          written: {
            format: "nei",
            numBytes: 3594,
            passStats: {
              numVars: 0,
              filtering: { missing_data: { varsProcessed: 0, varsKept: 0 } },
            },
          },
        },
        SMALL,
        PROJECT,
      ),
    ).toEqual({
      message: {
        kind: "line",
        text: "panel.nei has no variants, so there is nothing to write. Load another variants file.",
      },
      warning: null,
      button: null,
    });
  });

  test("error: the words of the failure, with Write after a failure that may pass, and none after a refusal or a file no longer read", () => {
    const failed = {
      kind: "error",
      key: KEY,
      error: {
        kind: "failed",
        error: { kind: "workerFailed", message: "a trap" },
      },
      ofStatistics: false,
    } as const;
    const parts = writeParts(failed, SMALL, PROJECT);
    expect(parts.message).toEqual({
      kind: "problem",
      text: "The writing stopped unexpectedly, perhaps because the file, of about 230 KB, did not fit in the memory of this tab. Remove variants or individuals with the filters and write it again, or write the file with popnei in Python.",
    });
    expect(parts.button?.kind).toBe("write");

    const refused = writeParts(
      { ...failed, error: { kind: "refused", message: "no memory" } },
      SMALL,
      PROJECT,
    );
    expect(refused.message?.kind).toBe("problem");
    expect(refused.button).toBeNull();

    const notRead = writeParts(
      {
        ...failed,
        error: {
          kind: "failed",
          error: { kind: "reopenFailed", name: "panel.nei", message: "gone" },
        },
      },
      SMALL,
      PROJECT,
    );
    expect(notRead.button).toBeNull();

    const statsRefused = writeParts(
      {
        ...failed,
        error: { kind: "refused", message: "no memory" },
        ofStatistics: true,
      },
      SMALL,
      PROJECT,
    );
    expect(statsRefused.message?.text).toMatch(
      /^The statistics of each individual, .* so the file was not written\. /u,
    );
    expect(statsRefused.button).toBeNull();
  });
});

/** The sample project with `numVars` variants counted in its file. */
function withFileVariants(numVars: number): Project {
  const variants = PROJECT.variants;
  if (variants?.read.kind !== "read") {
    throw new Error("the sample project has a read variants file");
  }
  return {
    ...PROJECT,
    variants: { ...variants, read: { ...variants.read, numVars } },
  };
}

describe("the writing refused before it starts, as the owner decided at stop A on 27 September 2026", () => {
  const BOUND = estimateOf(2_000_000, 1000, true);

  test("before a Count, a bound at the largest size: Write disabled, asking for the Count, and no warning", () => {
    for (const count of ["notCounted", undefined] as const) {
      expect(writeParts(READY, BOUND, PROJECT, count)).toEqual({
        message: null,
        warning: null,
        button: {
          kind: "write",
          disabled: true,
          description:
            "A file of at most about 2.0 GB may be too large to be written in a browser tab. Count the variants first, above.",
        },
      });
    }
  });

  test("while the Count runs, a bound at the largest size: Write disabled, with no word that asks for the Count", () => {
    expect(writeParts(READY, BOUND, PROJECT, "counting").button).toEqual({
      kind: "write",
      disabled: true,
      description:
        "A file of at most about 2.0 GB may be too large to be written in a browser tab. Its size is known once the Count above ends.",
    });
  });

  test("a bound one byte under the largest size, or a bound of the individuals alone with the variants counted: Write offered", () => {
    const under = { ...BOUND, numBytes: 1_799_999_999 };
    expect(writeParts(READY, under, PROJECT).button).toMatchObject({
      disabled: false,
    });
    expect(writeParts(READY, BOUND, PROJECT, "counted").button).toMatchObject({
      disabled: false,
    });
    const noVariantFilter: Project = { ...PROJECT, filters: [] };
    expect(writeParts(READY, BOUND, noVariantFilter).button).toMatchObject({
      disabled: false,
    });
  });

  test("the Count says the filters keep no variant: Write disabled with the words of a file of no variant", () => {
    expect(
      writeParts(READY, estimateOf(0, 200), withFileVariants(1200), "counted"),
    ).toEqual({
      message: null,
      warning: null,
      button: {
        kind: "write",
        disabled: true,
        description:
          "The filters keep none of the variants of panel.nei, so there is nothing to write. Loosen the filters above.",
      },
    });
  });

  test("a variants file of no variant: Write disabled with the words of an empty source, without the name of the step", () => {
    expect(
      writeParts(READY, estimateOf(0, 200), withFileVariants(0), "counted")
        .button,
    ).toEqual({
      kind: "write",
      disabled: true,
      description:
        "panel.nei has no variants, so there is nothing to write. Load another variants file.",
    });
  });

  test("the Count refused: Write disabled, sent to the words of the Count, with or without a size", () => {
    const refused = {
      kind: "write",
      disabled: true,
      description:
        "The variants could not be counted, so the file cannot be written either: the Count above says why.",
    };
    expect(writeParts(READY, null, PROJECT, "refused")).toEqual({
      message: null,
      warning: null,
      button: refused,
    });
    expect(
      writeParts(READY, estimateOf(600_000, 1000), PROJECT, "refused"),
    ).toEqual({ message: null, warning: null, button: refused });
  });

  test("saved: Write with no estimate, so that the size written is the one size of the part", () => {
    expect(
      writeParts(
        {
          kind: "saved",
          key: KEY,
          written: { format: "nei", numBytes: 250_994, passStats: PASS },
        },
        SMALL,
        PROJECT,
        "counted",
      ).button,
    ).toEqual({ kind: "write", disabled: false, description: null });
  });

  test("the store's reason of a lock, shown in the Variants step, without the name of the step", () => {
    expect(
      writeParts(
        {
          kind: "locked",
          reason:
            "The list of individuals to keep names 2 individuals that are not in panel.nei: ind_900 and ind_901. Change the list, or remove the filter, in the Variants step.",
        },
        SMALL,
        PROJECT,
      ).button,
    ).toEqual({
      kind: "write",
      disabled: true,
      description:
        "The list of individuals to keep names 2 individuals that are not in panel.nei: ind_900 and ind_901. Change the list, or remove the filter.",
    });
  });
});
