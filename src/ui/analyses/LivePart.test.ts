/**
 * The live analyses of popgen2.html but the PCA are drawn by the one
 * part, `LivePart`, so that the diversity, the LD decay and the
 * distances do not drift apart; what it draws is checked in
 * PopulationsTabView.test.ts and DistancesTabView.test.ts.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, test } from "vitest";

/** The root of the repository. */
const ROOT = resolve(import.meta.dirname, "..", "..", "..");

/** The text of every module of src/ui, by its path from the root. */
function modulesOfUi(): ReadonlyMap<string, string> {
  return new Map(
    readdirSync(join(ROOT, "src", "ui"), { recursive: true, encoding: "utf8" })
      .filter((name) => /\.tsx?$/u.test(name) && !/\.test\.tsx?$/u.test(name))
      .map((name) => {
        const path = join("src", "ui", name);
        return [path, readFileSync(join(ROOT, path), "utf8")] as const;
      }),
  );
}

describe("the part of a live analysis", () => {
  test("the diversity, the LD decay and the distances are each a LivePart, and Run of a live analysis is made in LivePart and in the PCA tab alone", () => {
    const modules = modulesOfUi();
    const parts = [...modules].flatMap(([path, text]) =>
      [...text.matchAll(/<LivePart\s+id=\{(\w+)/gu)].map(
        (match) => `${path} ${match[1] ?? ""}`,
      ),
    );
    expect(parts.toSorted()).toEqual([
      "src/ui/analyses/diversity/PopulationsTabView.tsx diversityOnPopgen2",
      "src/ui/analyses/diversity/PopulationsTabView.tsx ldDecayOnPopgen2",
      "src/ui/analyses/popDists/DistancesTabView.tsx popDistsOnPopgen2",
    ]);
    const runs = [...modules]
      .filter(([, text]) => /\brunLive\(/u.test(text))
      .map(([path]) => path);
    expect(runs.toSorted()).toEqual([
      "src/ui/analyses/LivePart.tsx",
      "src/ui/analyses/liveRun.ts",
      "src/ui/analyses/pca/PcaTab.tsx",
    ]);
  });
});
