/**
 * The lines of the live analyses that read the populations, in their
 * tabs (liveTabLines.ts) and in the status region (liveLines.ts), written
 * once from how the page names each (the merge of the LD decay and the
 * distances, 13 October 2026): the words of the diversity and of the LD
 * decay in the singular, those of the distances in the plural, each in
 * its tab.
 */
import { describe, expect, test } from "vitest";

import { DIVERSITY_LINES } from "./diversity/liveWords.ts";
import { LD_DECAY_LINES } from "./ldDecay/liveWords.ts";
import {
  heldAfterCrashText,
  startedByItselfText,
  stoppedText,
} from "./liveLines.ts";
import {
  afterCrashLine,
  failureEndedLine,
  stoppedLine,
  waitingLine,
} from "./liveTabLines.ts";
import { DISTANCES_LINES } from "./popDists/liveWords.ts";
import { DIVERSITY_NAMES } from "./status.ts";

describe("the lines of a live analysis that reads the populations", () => {
  test("the distances, in the plural", () => {
    const named = DISTANCES_LINES.named;
    expect(waitingLine(named, "changes", null)).toBe(
      "The distances start in a moment, later if the filters, their options or the populations change.",
    );
    expect(waitingLine(named, "behind", DIVERSITY_NAMES)).toBe(
      "The distances start once the diversity, which is running, ends.",
    );
    expect(waitingLine(named, "changes", DIVERSITY_NAMES)).toBe(
      "The distances start after the diversity, once the filters, the options and the populations stop changing.",
    );
    expect(waitingLine(named, "download", null)).toBe(
      "The distances start again when the download is written or closed.",
    );
    expect(afterCrashLine(named)).toBe(
      "The distances start after the next change of the filters, of their options or of the populations, or when Run is pressed.",
    );
    expect(stoppedLine(named, false)).toBe(
      "Stopped: the distances no longer start by themselves after a change. Run calculates them and starts them again after each change.",
    );
    expect(stoppedLine(named, true)).toBe(
      "Stopped: the distances no longer start by themselves after a change. After the next change, Run calculates them and starts them again after each change.",
    );
    expect(failureEndedLine(named, null)).toBe(
      "The distances no longer start by themselves after a change, since their calculation failed. Run calculates them and starts them again after each change.",
    );
    expect(failureEndedLine(named, "unreadable")).toBe(
      "The distances no longer start by themselves after a change, since their calculation failed. Once the variants file is opened again in the box Variants, Run calculates them and starts them again after each change.",
    );
    expect(startedByItselfText(DISTANCES_LINES)).toBe(
      "Calculating the distances between populations again. To change the filters or the populations, stop them in the Distances tab.",
    );
    expect(heldAfterCrashText(named)).toBe(
      "The distances did not start: they start after the next change of the filters, of their options or of the populations, or when Run is pressed in the Distances tab.",
    );
    expect(stoppedText(named, true)).toBe(
      "Distances stopped. Press Run in the Distances tab to calculate them again.",
    );
    expect(stoppedText(named, false)).toBe("Distances stopped.");
  });

  test("the diversity and the LD decay, in the singular, in the Populations tab", () => {
    for (const [lines, name, title] of [
      [DIVERSITY_LINES, "diversity", "Diversity"],
      [LD_DECAY_LINES, "LD decay", "LD decay"],
    ] as const) {
      const named = lines.named;
      expect(waitingLine(named, "changes", null)).toBe(
        `The ${name} starts in a moment, later if the filters, its options or the populations change.`,
      );
      expect(afterCrashLine(named)).toBe(
        `The ${name} starts after the next change of the filters, of its options or of the populations, or when Run is pressed.`,
      );
      expect(stoppedLine(named, false)).toBe(
        `Stopped: the ${name} no longer starts by itself after a change. Run calculates it and starts it again after each change.`,
      );
      expect(failureEndedLine(named, "result")).toBe(
        `The ${name} no longer starts by itself after a change, since its calculation failed. After the next change, Run calculates it and starts it again after each change.`,
      );
      expect(startedByItselfText(lines)).toBe(
        `Calculating the ${name} again. To change the filters or the populations, stop it in the Populations tab.`,
      );
      expect(heldAfterCrashText(named)).toBe(
        `The ${name} did not start: it starts after the next change of the filters, of its options or of the populations, or when Run is pressed in the Populations tab.`,
      );
      expect(stoppedText(named, true)).toBe(
        `${title} stopped. Press Run in the Populations tab to calculate it again.`,
      );
    }
  });
});
