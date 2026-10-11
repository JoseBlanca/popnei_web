/**
 * The files of a piece of code downloaded apart (codeFiles.ts): read from
 * the manifest of the build, the first file of the source, the files it
 * imports and theirs, and the styles of each, leaving out the files the
 * page loaded with its HTML; and each source named in the code is a file
 * that a wrapper imports with import().
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import { codeFilesOf } from "./codeFiles.ts";

/** A manifest of the shape Vite 8.3 writes, cut to what is read. */
const MANIFEST = {
  "popgen2.html": {
    file: "assets/popgen2-A.js",
    isEntry: true,
    imports: ["_shared~popgen~popgen2-B.js"],
    css: ["assets/popgen2-A.css"],
  },
  "_shared~popgen~popgen2-B.js": { file: "assets/shared~popgen~popgen2-B.js" },
  "_shared~popgen~Tab-C.js": {
    file: "assets/shared~popgen~Tab-C.js",
    imports: ["_shared~popgen~popgen2-B.js", "_shared~deep-D.js"],
    css: ["assets/shared~popgen~Tab-C.css"],
  },
  "_shared~deep-D.js": {
    file: "assets/shared~deep-D.js",
    imports: ["_shared~popgen~Tab-C.js"],
  },
  "src/ui/Tab.tsx": {
    file: "assets/Tab-E.js",
    isDynamicEntry: true,
    imports: ["_shared~popgen~Tab-C.js", "popgen2.html"],
    dynamicImports: ["src/charts/far.ts"],
  },
  "src/charts/far.ts": { file: "assets/far-F.js", isDynamicEntry: true },
};

describe("PT1 D3 the files of the code of a source", () => {
  test("the first file, those it imports and theirs once each, with their styles, and none the page has loaded, with what they import, nor any imported with import()", () => {
    expect(
      codeFilesOf(
        MANIFEST,
        "src/ui/Tab.tsx",
        new Set(["assets/popgen2-A.js", "assets/shared~popgen~popgen2-B.js"]),
      ),
    ).toEqual({
      ok: true,
      value: [
        "assets/Tab-E.js",
        "assets/shared~popgen~Tab-C.js",
        "assets/shared~deep-D.js",
        "assets/shared~popgen~Tab-C.css",
      ],
    });
  });

  test("a source the manifest does not have, or a manifest of another shape, is refused", () => {
    expect(codeFilesOf(MANIFEST, "src/ui/Other.tsx", new Set()).ok).toBe(false);
    expect(codeFilesOf([], "src/ui/Tab.tsx", new Set()).ok).toBe(false);
    expect(
      codeFilesOf(
        { "src/ui/Tab.tsx": { file: 3 } },
        "src/ui/Tab.tsx",
        new Set(),
      ).ok,
    ).toBe(false);
  });

  test("each source a wrapper names is a file of the sources that it imports with import()", () => {
    const src = resolve(import.meta.dirname, "..", "..");
    for (const wrapper of [
      "src/ui/analyses/pca/PcaTabResults.tsx",
      "src/ui/analyses/diversity/PopulationsTab.tsx",
      "src/ui/variants/FileStats.tsx",
    ]) {
      const text = readFileSync(resolve(src, wrapper), { encoding: "utf8" });
      const named = [...text.matchAll(/codeFilesReady\("([^"]+)"\)/gu)].map(
        (match) => match[1],
      );
      expect(named).toHaveLength(1);
      const [source] = named;
      expect(source).toBeDefined();
      if (source === undefined) continue;
      expect(() => readFileSync(resolve(src, source))).not.toThrow();
      const stem = source.split("/").at(-1);
      expect(text).toContain(`import("./${stem ?? ""}")`);
    }
  });
});
