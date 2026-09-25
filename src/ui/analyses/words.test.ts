import { describe, expect, test } from "vitest";

import type { Notice } from "../../core/store.ts";
import {
  clockText,
  failureText,
  progressShare,
  removedText,
  runningText,
  stoppedText,
  warningsHeading,
} from "./words.ts";

function notice(kind: Notice["cause"]["kind"]): Notice {
  return {
    cause: { kind, description: "the missing data filter changed" },
    removed: ["diversity"],
    leftBehind: [],
    stopped: [],
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
    expect(runningText({ share: 35, seconds: 12, waitingFor: null })).toBe(
      "Calculating · 35% · 0:12",
    );
    expect(runningText({ share: null, seconds: 12, waitingFor: null })).toBe(
      "Calculating · 0:12",
    );
    expect(
      runningText({ share: null, seconds: 12, waitingFor: "panel.nei" }),
    ).toBe("Waiting for panel.nei to be opened again, then calculating · 0:12");
    expect(
      runningText({ share: 3, seconds: 12, waitingFor: "panel.nei" }),
    ).toBe("Calculating · 3% · 0:12");
  });

  test("a result removed offers Undo, and Redo after an undo", () => {
    expect(removedText("the diversity", notice("command"))).toBe(
      "The diversity was removed because the missing data filter changed. Undo brings it back with no calculation; Run calculates it for the new settings.",
    );
    expect(removedText("the diversity", notice("redo"))).toBe(
      "The diversity was removed because the missing data filter changed. Undo brings it back with no calculation; Run calculates it for the new settings.",
    );
    expect(removedText("the diversity", notice("undo"))).toBe(
      "The diversity was removed because the missing data filter changed. Redo brings it back with no calculation; Run calculates it for the new settings.",
    );
  });

  test("a calculation stopped by a new variants file", () => {
    expect(stoppedText("the diversity")).toBe(
      "The calculation of the diversity was stopped because a new variants file was loaded.",
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
