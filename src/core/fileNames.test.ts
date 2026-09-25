import { describe, expect, test } from "vitest";

import { variantsStem } from "./fileNames.ts";

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
