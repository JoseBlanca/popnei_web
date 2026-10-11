/**
 * What each page loads before its first screen, read from the imports of
 * the sources: the modules a page's entry reaches by `import` and
 * `export … from`, leaving out `import type`, which loads nothing, and
 * `import()`, which the bundler makes a file of its own. The bundler puts
 * every module so reached in the files the page's HTML loads, so a module
 * reached here is in the page's first download, whatever chunk it lands
 * in. The sizes themselves are measured on the build, as the review of
 * work package 1 of docs/plans/population-tab.md did on 11 October 2026.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";

/** The folder of the sources, `src/`. */
const SRC = resolve(import.meta.dirname, "..");

/** An `import` or `export … from` with its path, `import type` and
    `export type` among them, which `staticImportsOf` leaves out. */
const IMPORT =
  /^\s*(?:import|export)\s+(type\s+)?(?:[^;"']*?\s+from\s+)?["']([^"']+)["']/gmu;

/** The relative paths `file` imports for its values, resolved. */
function staticImportsOf(file: string): readonly string[] {
  const text = readFileSync(file, { encoding: "utf8" });
  const paths: string[] = [];
  for (const match of text.matchAll(IMPORT)) {
    const [, typeOnly, path] = match;
    if (typeOnly !== undefined || path === undefined) continue;
    if (!path.startsWith(".")) continue;
    paths.push(resolve(dirname(file), path));
  }
  return paths;
}

/** The modules of `src/` the entry `entry` reaches by static imports,
    as paths under `src/`. */
function reachedFrom(entry: string): ReadonlySet<string> {
  const reached = new Set<string>();
  const waiting = [resolve(SRC, entry)];
  for (let file = waiting.pop(); file !== undefined; file = waiting.pop()) {
    const name = file.slice(SRC.length + 1);
    if (reached.has(name)) continue;
    reached.add(name);
    if (!/\.tsx?$/u.test(file)) continue;
    waiting.push(...staticImportsOf(file));
  }
  return reached;
}

describe("what the pages load first", () => {
  test("the walk finds the store of each page and the modules of a page's own", () => {
    expect(reachedFrom("ui/popgen.tsx")).toContain("ui/popgenStore.ts");
    expect(reachedFrom("ui/popgen2.tsx")).toContain("ui/popgen2Store.ts");
    // A module the old page loads only by import(), the 3D view.
    expect(reachedFrom("ui/popgen.tsx")).not.toContain("charts/pca3d.ts");
  });

  test("popgen.html loads none of popgen2.html's store, its chain of the filters or the ends of its live analyses", () => {
    const reached = reachedFrom("ui/popgen.tsx");
    expect(reached).not.toContain("ui/popgen2Store.ts");
    expect(reached).not.toContain("ui/variants/chain.ts");
    expect(reached).not.toContain("ui/analyses/pca/passLock.ts");
    expect(reached).not.toContain("ui/analyses/diversity/liveEnd.ts");
    expect(reached).not.toContain("ui/analyses/pca/liveEnd.ts");
  });

  test("popgen2.html loads of the Populations tab only its frame and its first words, and the code of the tab when it is first shown", () => {
    const reached = reachedFrom("ui/popgen2.tsx");
    expect(reached).toContain("ui/analyses/diversity/PopulationsTab.tsx");
    expect(reached).toContain("ui/analyses/diversity/tabLoadWords.ts");
    for (const module of [
      "PopulationsTabView.tsx",
      "populationsTabPanel.ts",
      "DiversityTabOptions.tsx",
      "DiversityOptionsPart.tsx",
      "DiversityResults.tsx",
      "SpectrumBlock.tsx",
      "tabWords.ts",
      "words.ts",
      "resultWords.ts",
    ]) {
      expect(reached).not.toContain(`ui/analyses/diversity/${module}`);
    }
  });
});
