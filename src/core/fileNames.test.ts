import { describe, expect, test } from "vitest";

import {
  downloadName,
  fileNameParts,
  individualsStem,
  variantsStem,
  writtenName,
} from "./fileNames.ts";
import type { Project } from "./project.ts";
import { deepFreeze, sampleProject, withPassedOn } from "./testSupport.ts";

describe("the stem of the name of a variants file", () => {
  test("drops .nei, .vcf and .vcf.gz, in any case", () => {
    expect(variantsStem("panel.nei")).toBe("panel");
    expect(variantsStem("panel.vcf")).toBe("panel");
    expect(variantsStem("panel.vcf.gz")).toBe("panel");
    expect(variantsStem("Panel.VCF.GZ")).toBe("Panel");
  });

  test("keeps any other extension", () => {
    expect(variantsStem("panel.vcf.bgz")).toBe("panel.vcf.bgz");
    expect(variantsStem("panel.gz")).toBe("panel.gz");
  });

  test("is project for a name that is only an extension", () => {
    expect(variantsStem(".nei")).toBe("project");
    expect(variantsStem(".VCF.gz")).toBe("project");
  });
});

/** `sampleProject` with its variants file named `name` and the filters
    given, frozen deeply. */
function projectNamed(
  name: string,
  filters: Pick<Project, "filters" | "individualFilters">,
): Project {
  const sample = sampleProject();
  if (sample.variants === null) {
    throw new Error("the sample project has no variants file");
  }
  return deepFreeze<Project>({
    ...sample,
    variants: { ...sample.variants, name },
    ...filters,
  });
}

describe("VS2 D4 the name of the written file of the filtered variants", () => {
  test("panel.vcf.gz with a filter of the variants gives panel.filtered.nei", () => {
    const p = projectNamed("panel.vcf.gz", {
      filters: [{ kind: "maf", maxAllowedMaf: 0.95 }],
      individualFilters: [],
    });
    expect(writtenName(p, "nei")).toBe("panel.filtered.nei");
  });

  test("panel.vcf.gz with a threshold on the individuals alone gives panel.filtered.nei", () => {
    const p = projectNamed("panel.vcf.gz", {
      filters: [],
      individualFilters: [{ kind: "obs_het", maxAllowedObsHet: 0.38 }],
    });
    expect(writtenName(p, "nei")).toBe("panel.filtered.nei");
  });

  test("panel.vcf.gz with no filter gives panel.nei, the file converted", () => {
    const p = projectNamed("panel.vcf.gz", {
      filters: [],
      individualFilters: [],
    });
    expect(writtenName(p, "nei")).toBe("panel.nei");
  });

  test("PANEL.NEI with a filter gives PANEL.filtered.nei", () => {
    const p = projectNamed("PANEL.NEI", {
      filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
      individualFilters: [],
    });
    expect(writtenName(p, "nei")).toBe("PANEL.filtered.nei");
  });

  test("a project with no variants file gives project.nei", () => {
    const p = deepFreeze<Project>({ ...sampleProject(), variants: null });
    expect(writtenName(p, "nei")).toBe("project.nei");
  });
});

describe("SF2 D4 the name of the written file reads the filters that apply to the file", () => {
  test("panel.nei with passed alone on, its read saying keepsPassed false, gives panel.nei, the file converted", () => {
    const p = projectNamed("panel.nei", { filters: [], individualFilters: [] });
    expect(writtenName(withPassedOn(p, false), "nei")).toBe("panel.nei");
    expect(writtenName(withPassedOn(p, true), "nei")).toBe(
      "panel.filtered.nei",
    );
  });
});

describe("DL3 D1 the name of the written file in either format", () => {
  test("panel.vcf.gz with a filter gives panel.filtered.vcf.gz in the VCF", () => {
    const p = projectNamed("panel.vcf.gz", {
      filters: [{ kind: "maf", maxAllowedMaf: 0.95 }],
      individualFilters: [],
    });
    expect(writtenName(p, "vcf")).toBe("panel.filtered.vcf.gz");
    expect(writtenName(p, "nei")).toBe("panel.filtered.nei");
  });

  test("with a threshold on the individuals alone the VCF is panel.filtered.vcf.gz", () => {
    const p = projectNamed("panel.vcf.gz", {
      filters: [],
      individualFilters: [{ kind: "obs_het", maxAllowedObsHet: 0.38 }],
    });
    expect(writtenName(p, "vcf")).toBe("panel.filtered.vcf.gz");
  });

  test("with no filter the VCF keeps .filtered.vcf.gz, not the name of the file it came from", () => {
    const p = projectNamed("panel.vcf.gz", {
      filters: [],
      individualFilters: [],
    });
    expect(writtenName(p, "vcf")).toBe("panel.filtered.vcf.gz");
    expect(writtenName(p, "nei")).toBe("panel.nei");
  });

  test("PANEL.NEI with a filter gives PANEL.filtered.vcf.gz", () => {
    const p = projectNamed("PANEL.NEI", {
      filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
      individualFilters: [],
    });
    expect(writtenName(p, "vcf")).toBe("PANEL.filtered.vcf.gz");
  });

  test("a project with no variants file gives project.filtered.vcf.gz", () => {
    const p = deepFreeze<Project>({ ...sampleProject(), variants: null });
    expect(writtenName(p, "vcf")).toBe("project.filtered.vcf.gz");
    expect(writtenName(p, "nei")).toBe("project.nei");
  });
});

describe("AP5 D1 the names of the downloaded files", () => {
  test("the name of a file is the stem, what is downloaded and the extension, joined by dots", () => {
    expect(downloadName("panel", "pca.coordinates", "csv")).toBe(
      "panel.pca.coordinates.csv",
    );
    expect(downloadName("panel_pops", "table", "csv")).toBe(
      "panel_pops.table.csv",
    );
    expect(downloadName("panel", "maf_variants", "png")).toBe(
      "panel.maf_variants.png",
    );
  });

  test("the stem of an individuals file is its name without its extension", () => {
    expect(individualsStem("panel_pops.csv")).toBe("panel_pops");
    expect(individualsStem("panel_pops.XLSX")).toBe("panel_pops");
    expect(individualsStem("panel.pops.tsv")).toBe("panel.pops");
    expect(individualsStem("panel_pops")).toBe("panel_pops");
  });

  test("the stem of an individuals file named only by an extension is individuals", () => {
    expect(individualsStem(".csv")).toBe("individuals");
    expect(individualsStem("")).toBe("individuals");
  });
});

describe("PT2 D1 the names of populations made parts of file names", () => {
  test("every character other than a letter, a digit, - and _ is written _, and a name an earlier one gave gets _2", () => {
    expect(fileNameParts(["p0", "a/b", "a?b", "é"])).toEqual([
      "p0",
      "a_b",
      "a_b_2",
      "é",
    ]);
  });

  test("letters of another alphabet, digits, - and _ are kept; spaces and dots are written _", () => {
    expect(fileNameParts(["日本", "Ωμέγα", "p-1_b", "pop 1", "p.1"])).toEqual([
      "日本",
      "Ωμέγα",
      "p-1_b",
      "pop_1",
      "p_1",
    ]);
  });

  test("a third name that gives the same part gets _3, and a name that is itself an earlier _2 is not given twice", () => {
    expect(fileNameParts(["a b", "a/b", "a?b"])).toEqual([
      "a_b",
      "a_b_2",
      "a_b_3",
    ]);
    expect(fileNameParts(["a_b", "a/b", "a_b_2"])).toEqual([
      "a_b",
      "a_b_2",
      "a_b_2_2",
    ]);
  });

  test("the names of a histogram of the spectrum", () => {
    const [p0] = fileNameParts(["p0"]);
    expect(downloadName("panel", `sfs.${p0 ?? ""}`, "svg")).toBe(
      "panel.sfs.p0.svg",
    );
  });
});
