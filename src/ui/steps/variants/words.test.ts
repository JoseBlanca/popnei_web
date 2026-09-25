import { describe, expect, test } from "vitest";

import { emptyProject } from "../../../core/project.ts";
import type { Project, VariantSource } from "../../../core/project.ts";
import {
  elapsedText,
  formatOfName,
  notLoadedText,
  readAgainLabel,
  readWithText,
  sizeText,
  startingOptions,
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

  test("a size in bytes, kB, MB and GB", () => {
    expect(sizeText(812)).toBe("812 bytes");
    expect(sizeText(45_300)).toBe("45.3 kB");
    expect(sizeText(999_990)).toBe("1.0 MB");
    expect(sizeText(1_234_567)).toBe("1.2 MB");
    expect(sizeText(80_692_954)).toBe("80.7 MB");
    expect(sizeText(3_400_000_000)).toBe("3.4 GB");
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
