/**
 * The tabs of popgen2.html loaded apart from the page's code are made by
 * the one loader, `createTabLoader`, so that the two do not drift apart;
 * that the source each gives names the file its `import()` loads is read
 * in src/ui/codeFiles.test.ts.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, test } from "vitest";

/** The root of the repository. */
const ROOT = resolve(import.meta.dirname, "..", "..", "..");

/** Every module of src/ui, its path from the root. */
function modulesOfUi(): readonly string[] {
  return readdirSync(join(ROOT, "src", "ui"), {
    recursive: true,
    encoding: "utf8",
  })
    .filter((name) => /\.tsx?$/u.test(name) && !/\.test\.tsx?$/u.test(name))
    .map((name) => join("src", "ui", name));
}

describe("the tabs loaded apart", () => {
  test("the Populations tab and the Distances tab are each a tab loaded apart by createTabLoader", () => {
    const loaders = modulesOfUi().filter((path) =>
      readFileSync(join(ROOT, path), "utf8").includes("createTabLoader({"),
    );
    expect(loaders.toSorted()).toEqual([
      "src/ui/analyses/diversity/PopulationsTab.tsx",
      "src/ui/analyses/popDists/DistancesTab.tsx",
    ]);
  });
});
