import { describe, expect, test } from "vitest";

import { variantsStem, writtenName } from "./fileNames.ts";
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
    expect(writtenName(p)).toBe("panel.filtered.nei");
  });

  test("panel.vcf.gz with a threshold on the individuals alone gives panel.filtered.nei", () => {
    const p = projectNamed("panel.vcf.gz", {
      filters: [],
      individualFilters: [{ kind: "obs_het", maxAllowedObsHet: 0.38 }],
    });
    expect(writtenName(p)).toBe("panel.filtered.nei");
  });

  test("panel.vcf.gz with no filter gives panel.nei, the file converted", () => {
    const p = projectNamed("panel.vcf.gz", {
      filters: [],
      individualFilters: [],
    });
    expect(writtenName(p)).toBe("panel.nei");
  });

  test("PANEL.NEI with a filter gives PANEL.filtered.nei", () => {
    const p = projectNamed("PANEL.NEI", {
      filters: [{ kind: "missing_data", maxAllowedMissingRate: 0.05 }],
      individualFilters: [],
    });
    expect(writtenName(p)).toBe("PANEL.filtered.nei");
  });

  test("a project with no variants file gives project.nei", () => {
    const p = deepFreeze<Project>({ ...sampleProject(), variants: null });
    expect(writtenName(p)).toBe("project.nei");
  });
});

describe("SF2 D4 the name of the written file reads the filters that apply to the file", () => {
  test("panel.nei with passed alone on, its read saying keepsPassed false, gives panel.nei, the file converted", () => {
    const p = projectNamed("panel.nei", { filters: [], individualFilters: [] });
    expect(writtenName(withPassedOn(p, false))).toBe("panel.nei");
    expect(writtenName(withPassedOn(p, true))).toBe("panel.filtered.nei");
  });
});
