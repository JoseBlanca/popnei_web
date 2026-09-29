import { describe, expect, test } from "vitest";

import { emptyProject } from "../../../core/project.ts";
import type { Project, VariantSource } from "../../../core/project.ts";
import {
  LD_LOCKED_LINE,
  buttonInTheStep,
  lockedInTheStep,
  withoutTheStep,
  LD_LINE,
  MISSING_DATA_LINE,
  NOT_COUNTED_LINE,
  OBS_HET_LINE,
  distanceRefusedText,
  elapsedText,
  formatOfName,
  keptText,
  notLoadedText,
  ploidyRefusedText,
  r2RefusedText,
  readAgainLabel,
  readWithText,
  startingOptions,
  thresholdRefusedText,
  variantsText,
} from "./words.ts";

const VCF: VariantSource = {
  fileId: "0123456789abcdef0123456789abcdef",
  name: "panel.vcf.gz",
  size: 1000,
  format: "vcf",
  readOptions: { ploidy: 4, onlyPassed: false },
  read: { kind: "pending" },
};

describe("the words of the Variants step", () => {
  test("the format is told by the end of the name, without regard to case", () => {
    expect(formatOfName("panel.nei")).toBe("nei");
    expect(formatOfName("PANEL.NEI")).toBe("nei");
    expect(formatOfName("panel.vcf")).toBe("vcf");
    expect(formatOfName("PANEL.VCF.GZ")).toBe("vcf");
    expect(formatOfName("panel.vcf.bgz")).toBe("vcf");
    expect(formatOfName("panel.txt")).toBeNull();
    expect(formatOfName("panel.gz")).toBeNull();
    expect(formatOfName("panel.vcf.zst")).toBeNull();
  });

  test("a file of another name is named in the message", () => {
    expect(notLoadedText("panel.txt")).toBe(
      "panel.txt was not loaded: the Variants step reads a VCF, whose name ends in .vcf, .vcf.gz or .vcf.bgz, or a .nei file. If it is one of them, rename it.",
    );
  });

  test("how a VCF was read, with or without the passed variants only", () => {
    expect(readWithText({ ploidy: 2, onlyPassed: true })).toBe(
      "Read with ploidy 2, only the variants with PASS or . in the FILTER column",
    );
    expect(readWithText({ ploidy: 2, onlyPassed: false })).toBe(
      "Read with ploidy 2, every variant",
    );
  });

  test("the button to read again names both options when both differ, the ploidy first", () => {
    expect(
      readAgainLabel(
        "tetraploid.vcf.gz",
        { ploidy: 2, onlyPassed: true },
        { ploidy: 4, onlyPassed: false },
      ),
    ).toBe("Read tetraploid.vcf.gz again with ploidy 4 and every variant");
    expect(
      readAgainLabel(
        "panel.vcf.gz",
        { ploidy: 4, onlyPassed: false },
        { ploidy: 2, onlyPassed: true },
      ),
    ).toBe(
      "Read panel.vcf.gz again with ploidy 2 and only the variants with PASS or . in the FILTER column",
    );
  });

  test("a number the threshold refused: why, and the threshold kept", () => {
    expect(
      thresholdRefusedText({ kind: "aboveMax", typed: "10", maxValue: 1 }, 0.1),
    ).toBe("10 is more than 1; the threshold stays 0.1.");
    expect(
      thresholdRefusedText(
        { kind: "belowMin", typed: "-0.5", minValue: 0 },
        0.1,
      ),
    ).toBe("-0.5 is less than 0; the threshold stays 0.1.");
    expect(
      thresholdRefusedText(
        { kind: "offStep", typed: "0.125", decimals: 2 },
        0.2,
      ),
    ).toBe("0.125 has more than two decimals; the threshold stays 0.2.");
    expect(
      thresholdRefusedText(
        { kind: "offStep", typed: "0.0000001", decimals: 2 },
        0.1,
      ),
    ).toBe("0.0000001 has more than two decimals; the threshold stays 0.1.");
  });

  test("a character the threshold threw away: a comma as a decimal point, any other named, and the threshold kept", () => {
    const comma =
      "Write the decimals with a point, 0.1 and not 0,1; the threshold stays 0.13.";
    expect(thresholdRefusedText({ kind: "notTaken", text: "," }, 0.13)).toBe(
      comma,
    );
    // A comma anywhere, as in 0,05 pasted.
    expect(thresholdRefusedText({ kind: "notTaken", text: "0,05" }, 0.13)).toBe(
      comma,
    );
    expect(thresholdRefusedText({ kind: "notTaken", text: "-" }, 0.1)).toBe(
      "‘-’ cannot be typed in the threshold, which is written with digits and a point, as 0.05; the threshold stays 0.1.",
    );
    // The first character that is not a digit or a point.
    expect(thresholdRefusedText({ kind: "notTaken", text: "0.1x" }, 0.1)).toBe(
      "‘x’ cannot be typed in the threshold, which is written with digits and a point, as 0.05; the threshold stays 0.1.",
    );
    expect(thresholdRefusedText({ kind: "notTaken", text: " " }, 0.1)).toBe(
      "A space cannot be typed in the threshold, which is written with digits and a point, as 0.05; the threshold stays 0.1.",
    );
    // A second point is all there is to name.
    expect(thresholdRefusedText({ kind: "notTaken", text: "." }, 0.1)).toBe(
      "‘.’ cannot be typed in the threshold, which is written with digits and a point, as 0.05; the threshold stays 0.1.",
    );
    // A control character escaped.
    expect(
      thresholdRefusedText({ kind: "notTaken", text: "\u202e" }, 0.1),
    ).toBe(
      "‘\\u202e’ cannot be typed in the threshold, which is written with digits and a point, as 0.05; the threshold stays 0.1.",
    );
  });

  test("a character the ploidy threw away: a comma as a whole number, any other named, and the ploidy kept", () => {
    expect(ploidyRefusedText({ kind: "notTaken", text: "," }, 2)).toBe(
      "Write the ploidy as a whole number, 4 and not 4,0; the ploidy stays 2.",
    );
    expect(ploidyRefusedText({ kind: "notTaken", text: "-" }, 4)).toBe(
      "‘-’ cannot be typed in the ploidy, which is a whole number, as 4; the ploidy stays 4.",
    );
  });

  test("a number the ploidy refused: why, and the ploidy kept", () => {
    expect(
      ploidyRefusedText({ kind: "aboveMax", typed: "300", maxValue: 255 }, 2),
    ).toBe("300 is more than 255; the ploidy stays 2.");
    expect(
      ploidyRefusedText({ kind: "belowMin", typed: "0", minValue: 1 }, 4),
    ).toBe("0 is less than 1; the ploidy stays 4.");
    expect(
      ploidyRefusedText({ kind: "offStep", typed: "2.5", decimals: 0 }, 2),
    ).toBe("2.5 is not a whole number; the ploidy stays 2.");
  });

  test("the button to read again names the ploidy when it differs, otherwise the passed variants, and is not there when nothing differs", () => {
    const loaded = { ploidy: 2, onlyPassed: true };
    expect(
      readAgainLabel("tetraploid.vcf.gz", loaded, {
        ploidy: 4,
        onlyPassed: true,
      }),
    ).toBe("Read tetraploid.vcf.gz again with ploidy 4");
    expect(
      readAgainLabel("panel.vcf.gz", loaded, { ploidy: 2, onlyPassed: false }),
    ).toBe("Read panel.vcf.gz again with every variant");
    expect(
      readAgainLabel(
        "panel.vcf.gz",
        { ploidy: 2, onlyPassed: false },
        { ploidy: 2, onlyPassed: true },
      ),
    ).toBe(
      "Read panel.vcf.gz again with only the variants with PASS or . in the FILTER column",
    );
    expect(readAgainLabel("panel.vcf.gz", loaded, loaded)).toBeNull();
  });

  test("the variants are counted, or said not counted yet", () => {
    expect(variantsText(1200)).toBe("1,200 variants");
    expect(variantsText(null)).toBe(
      "Variants: not counted yet; the first analysis that reads the whole file counts them",
    );
  });

  test("the seconds of a read, from the first", () => {
    expect(elapsedText(0)).toBe("");
    expect(elapsedText(1)).toBe("1 second so far.");
    expect(elapsedText(12)).toBe("12 seconds so far.");
  });

  test("the options start at the VCF loaded, then the reference's, then the defaults", () => {
    const empty = emptyProject("popgen");
    expect(startingOptions(empty)).toEqual({ ploidy: 2, onlyPassed: true });
    expect(startingOptions({ ...empty, variants: VCF })).toEqual({
      ploidy: 4,
      onlyPassed: false,
    });
    const opened: Project = {
      ...empty,
      reference: { variants: VCF, checks: [] },
    };
    expect(startingOptions(opened)).toEqual({ ploidy: 4, onlyPassed: false });
    const nei: VariantSource = {
      ...VCF,
      name: "panel.nei",
      format: "nei",
      readOptions: null,
    };
    expect(startingOptions({ ...opened, variants: nei })).toEqual({
      ploidy: 2,
      onlyPassed: true,
    });
  });
});

describe("VS6 D1 the line of a number of more decimals than a field of four takes", () => {
  test("0.12345 in a threshold of four decimals is said to have more than four", () => {
    expect(
      thresholdRefusedText(
        { kind: "offStep", typed: "0.12345", decimals: 4 },
        0.03,
      ),
    ).toBe("0.12345 has more than four decimals; the threshold stays 0.03.");
  });
});

describe("the lines of the fields of the LD pruning", () => {
  test("a number the maximum r² refused, and a character it threw away, with the r² kept", () => {
    expect(
      r2RefusedText({ kind: "aboveMax", typed: "1.5", maxValue: 1 }, 0.3),
    ).toBe("1.5 is more than 1; the maximum r² stays 0.3.");
    expect(
      r2RefusedText({ kind: "offStep", typed: "0.125", decimals: 2 }, 0.3),
    ).toBe("0.125 has more than two decimals; the maximum r² stays 0.3.");
    expect(r2RefusedText({ kind: "notTaken", text: "," }, 0.3)).toBe(
      "Write the decimals with a point, 0.1 and not 0,1; the maximum r² stays 0.3.",
    );
    expect(r2RefusedText({ kind: "notTaken", text: "-" }, 0.3)).toBe(
      "‘-’ cannot be typed in the maximum r², which is written with digits and a point, as 0.05; the maximum r² stays 0.3.",
    );
  });

  test("a number the distance refused, and a character it threw away, with the distance kept", () => {
    expect(
      distanceRefusedText({ kind: "belowMin", typed: "0", minValue: 1 }, 10000),
    ).toBe("0 is less than 1; the distance stays 10000.");
    expect(
      distanceRefusedText(
        { kind: "offStep", typed: "2.5", decimals: 0 },
        10000,
      ),
    ).toBe("2.5 is not a whole number; the distance stays 10000.");
    expect(distanceRefusedText({ kind: "notTaken", text: "," }, 10000)).toBe(
      "Write the distance as a whole number of base pairs, 10000 and not 10,000; the distance stays 10000.",
    );
    expect(distanceRefusedText({ kind: "notTaken", text: "-" }, 10000)).toBe(
      "‘-’ cannot be typed in the distance, which is a whole number of base pairs, as 10000; the distance stays 10000.",
    );
  });
});

describe("IP3 D3 the lines of the distance while it is empty", () => {
  test("a number refused, or a character thrown away, while the LD pruning has no distance: the distance is still to be typed", () => {
    expect(
      distanceRefusedText(
        { kind: "belowMin", typed: "0", minValue: 1 },
        Number.NaN,
      ),
    ).toBe("0 is less than 1; the distance is still to be typed.");
    expect(
      distanceRefusedText({ kind: "notTaken", text: "," }, Number.NaN),
    ).toBe(
      "Write the distance as a whole number of base pairs, 10000 and not 10,000; the distance is still to be typed.",
    );
    expect(
      distanceRefusedText({ kind: "notTaken", text: "-" }, Number.NaN),
    ).toBe(
      "‘-’ cannot be typed in the distance, which is a whole number of base pairs, as 10000; the distance is still to be typed.",
    );
  });
});

describe("VS6 D2 the count beside a filter of the variants", () => {
  test("what a filter kept, of what it was given, with the thousands grouped and one variant in the singular", () => {
    expect(keptText(1200, 1152)).toBe(
      "Kept 1,152 of the 1,200 variants it was given.",
    );
    expect(keptText(1152, 0)).toBe(
      "Kept 0 of the 1,152 variants it was given.",
    );
    expect(keptText(1, 1)).toBe("Kept 1 of the 1 variant it was given.");
    expect(keptText(0, 0)).toBe("Kept 0 of the 0 variants it was given.");
  });
});

describe("the lines the owner chose at stop A, on 27 September 2026", () => {
  test("the line under the filter by observed heterozygosity, the LD pruning and the line of no counts", () => {
    expect(OBS_HET_LINE).toBe(
      "The proportion of the individuals with a called genotype that are heterozygous; a high one often marks duplicated regions read as one.",
    );
    expect(LD_LINE).toBe(
      "Of two variants closer than the distance, and with an r² above the maximum, the first is kept.",
    );
    expect(NOT_COUNTED_LINE).toBe(
      "Not counted for these filters. Count to see what each filter keeps.",
    );
  });
});

describe("the line of the missing data filter of the variants, which counts over the individuals kept since 28 September 2026", () => {
  test("the proportion is over the individuals the filters of individuals keep", () => {
    expect(MISSING_DATA_LINE).toBe(
      "A genotype is missing when any of its alleles is, 0/. among them; the proportion is over the individuals the filters of individuals keep.",
    );
  });
});

describe("the words of the application without the Variants step", () => {
  test("the end of a sentence, and the comma before it, go; elsewhere the words stay", () => {
    expect(
      withoutTheStep("Load another variants file in the Variants step."),
    ).toBe("Load another variants file.");
    expect(
      withoutTheStep(
        "Change the list, or remove the filter, in the Variants step.",
      ),
    ).toBe("Change the list, or remove the filter.");
    expect(withoutTheStep("Loosen them in the Variants step and run.")).toBe(
      "Loosen them and run.",
    );
    expect(withoutTheStep("The Variants step says why.")).toBe(
      "The Variants step says why.",
    );
  });

  test("the reason of a disabled Calculate or Count loses its end, and an enabled Run, a Stop and no button stay as they are", () => {
    expect(
      buttonInTheStep(
        {
          kind: "run",
          reason:
            "The list of individuals to keep names 1 individual that is not in panel.nei: ind_900. Change the list, or remove the filter, in the Variants step.",
        },
        null,
      ),
    ).toEqual({
      kind: "run",
      reason:
        "The list of individuals to keep names 1 individual that is not in panel.nei: ind_900. Change the list, or remove the filter.",
    });
    const enabled = { kind: "run", reason: null } as const;
    expect(buttonInTheStep(enabled, null)).toBe(enabled);
    const stop = { kind: "stop" } as const;
    expect(buttonInTheStep(stop, LD_REASON)).toBe(stop);
    expect(buttonInTheStep(null, LD_REASON)).toBeNull();
  });

  test("stop A 2 the reason of the LD pruning with no distance is the short line beside a button, and any other reason loses its end", () => {
    expect(LD_LOCKED_LINE).toBe(
      "Locked until the distance of the LD pruning is typed, above.",
    );
    expect(lockedInTheStep(LD_REASON, LD_REASON)).toBe(LD_LOCKED_LINE);
    expect(
      buttonInTheStep({ kind: "run", reason: LD_REASON }, LD_REASON),
    ).toEqual({ kind: "run", reason: LD_LOCKED_LINE });
    // A list refused comes before the LD pruning, and keeps its words.
    expect(lockedInTheStep(LIST_REASON, LD_REASON)).toBe(
      "The list of individuals to keep names 1 individual that is not in panel.nei: ind_900. Change the list, or remove the filter.",
    );
    expect(lockedInTheStep(LIST_REASON, null)).toBe(
      "The list of individuals to keep names 1 individual that is not in panel.nei: ind_900. Change the list, or remove the filter.",
    );
  });
});

/** The reason of the LD pruning with no distance, whole
    (docs/specs/core/project.md). */
const LD_REASON =
  "The LD pruning of the Variants step needs the distance within which variants are compared. It has no default, because it depends on how far linkage disequilibrium extends in the genome of your species. Type a distance in base pairs, or turn off the LD pruning, in the Variants step.";

/** The reason of a list of individuals refused, whole. */
const LIST_REASON =
  "The list of individuals to keep names 1 individual that is not in panel.nei: ind_900. Change the list, or remove the filter, in the Variants step.";
