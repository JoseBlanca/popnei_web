/**
 * The order of the tabs against the order of calculation of the live
 * analyses of popgen2.html (the merge of the LD decay and the distances,
 * 13 October 2026): the words that name several analyses with no "then"
 * follow the tabs, those of a sequence the calculation.
 */
import { describe, expect, test } from "vitest";

import { POPGEN2_LIVE } from "../../core/apps.ts";
import { liveStatesOf } from "../band/bandLine.ts";
import { createPopgen2Store } from "../popgen2Store.ts";
import { roundText, stopAllText } from "./liveWords.ts";
import { liveAnalysisOf, liveBeside } from "./status.ts";
import type { LiveAnalysisName } from "./status.ts";
import { POPGEN2_LIVE_IN_TABS, inTabOrder } from "./tabOrder.ts";
import { eachInItsTab, filtersLockedText } from "./words.ts";

/** The four analyses that can be live as the page names them. */
function names(): Readonly<Record<string, LiveAnalysisName>> {
  const state = createPopgen2Store({
    send: () => {
      throw new Error("nothing is sent");
    },
    sendWrite: () => {
      throw new Error("nothing is written");
    },
    appVersion: "0.1.0",
  }).getState();
  return {
    pca: liveAnalysisOf(state, "pca"),
    diversity: liveAnalysisOf(state, "diversity"),
    distances: liveAnalysisOf(state, "popDists"),
    ld: liveAnalysisOf(state, "ldDecay"),
  };
}

/** `name` of `names()`, a defect when it has none. */
function named(name: string): LiveAnalysisName {
  const one = names()[name];
  if (one === undefined) throw new Error(`no analysis ${name}`);
  return one;
}

describe("the order of the tabs of the live analyses", () => {
  test("the tabs: the PCA, the diversity, the LD decay, the distances; the calculation ends with the LD decay", () => {
    expect(POPGEN2_LIVE_IN_TABS).toEqual([
      "pca",
      "diversity",
      "ldDecay",
      "popDists",
    ]);
    expect(POPGEN2_LIVE).toEqual(["pca", "diversity", "popDists", "ldDecay"]);
    expect(inTabOrder([{ id: "popDists" }, { id: "ldDecay" }])).toEqual([
      { id: "ldDecay" },
      { id: "popDists" },
    ]);
    expect(() => inTabOrder([{ id: "variantsSummary" }])).toThrow(
      /popnei_web defect/u,
    );
  });

  test("a round says the order of calculation, and the analyses to stop for the populations by their tabs in the order of the tabs", () => {
    const [pca, diversity, distances, ld] = [
      named("pca"),
      named("diversity"),
      named("distances"),
      named("ld"),
    ];
    expect(roundText([pca, diversity, distances, ld])).toBe(
      "Calculating the PCA, the diversity, the distances and then the LD decay again. To change the filters, press Stop all beside the heading Popnei, or stop each in its tab; to change the populations, stop the diversity and the LD decay in the Populations tab and the distances in the Distances tab.",
    );
    expect(eachInItsTab([distances, ld])).toBe(
      "the LD decay in the Populations tab and the distances in the Distances tab",
    );
  });

  test("Stop all names the four in the order of the tabs, and Run in each tab that offers it", () => {
    const [pca, diversity, distances, ld] = [
      named("pca"),
      named("diversity"),
      named("distances"),
      named("ld"),
    ];
    expect(
      stopAllText([
        { named: pca, runOffered: false },
        { named: diversity, runOffered: true },
        { named: distances, runOffered: true },
        { named: ld, runOffered: true },
      ]),
    ).toBe(
      "Stopped: the PCA, the diversity, the LD decay and the distances no longer start by themselves. Press Run for the diversity and the LD decay in the Populations tab and the distances in the Distances tab to calculate them again.",
    );
  });

  test("the lock while the PCA runs names those live beside it in the order of the tabs", () => {
    const state = createPopgen2Store({
      send: () => {
        throw new Error("nothing is sent");
      },
      sendWrite: () => {
        throw new Error("nothing is written");
      },
      appVersion: "0.1.0",
    }).getState();
    const pca = liveAnalysisOf(state, "pca");
    const beside = liveBeside(state, pca, { isLive: () => true });
    expect(beside.map((one) => one.id)).toEqual([
      "diversity",
      "ldDecay",
      "popDists",
    ]);
    expect(filtersLockedText(pca, beside)).toBe(
      "Stop the PCA in the PCA tab to change the filters, or press Stop all beside the heading Popnei to stop the diversity, the LD decay and the distances too; then press Run in each tab to calculate them again.",
    );
  });
});

describe("the live states the band reads", () => {
  test("liveStatesOf gives the state of each analysis of POPGEN2_LIVE, and of no other, as autoRuns tells it", () => {
    const asked: string[] = [];
    const states = liveStatesOf({
      liveState: (id) => {
        asked.push(id);
        return id === "ldDecay" ? { kind: "stopped" } : { kind: "off" };
      },
    });
    expect(asked).toEqual([...POPGEN2_LIVE]);
    expect(Object.keys(states)).toEqual([...POPGEN2_LIVE]);
    expect(states.ldDecay).toEqual({ kind: "stopped" });
    expect(states.popDists).toEqual({ kind: "off" });
  });
});
