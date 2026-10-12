/**
 * The distances between populations as a live analysis of popgen2.html
 * (docs/specs/steps/popgen2-distances.md; popgen2-pca.md, "Several
 * analyses calculated again by themselves", its line of 12 October 2026;
 * popgen2-band.md, "The distances"): last in the order of the live
 * analyses, named "the distances" in the Distances tab, with their verbs
 * and pronouns in the plural wherever the page's words name an analysis;
 * and the words of their own the status region says.
 */
import { describe, expect, test } from "vitest";

import { POPGEN2_ANALYSES, POPGEN2_LIVE } from "../../../core/apps.ts";
import { popDistsOnPopgen2 } from "../../../core/analyses/popDists.ts";
import { LIVE_TABS } from "../../band/bandLine.ts";
import { lineWords, stopAllOf, stopOf } from "../../band/bandWords.ts";
import { createPopgen2Store, popgen2EndsLive } from "../../popgen2Store.ts";
import { analysisWaitsText } from "../../variants/downloadWords.ts";
import { notOpenedWhileRunningText } from "../../variants/individualsWords.ts";
import { liveAnalysisOf } from "../status.ts";
import type { LiveAnalysisName } from "../status.ts";
import { roundText, stopAllText } from "../liveWords.ts";
import { filtersLockedText, populationsLockedText } from "../words.ts";
import {
  DISTANCES_HELD_AFTER_CRASH,
  DISTANCES_STARTED_BY_ITSELF,
  distancesStoppedText,
} from "./liveWords.ts";

/** The store of popgen2.html, with a worker that is never sent
    anything. */
function page(): ReturnType<typeof createPopgen2Store> {
  return createPopgen2Store({
    send: () => {
      throw new Error("nothing is sent");
    },
    sendWrite: () => {
      throw new Error("nothing is written");
    },
    appVersion: "0.1.0",
  });
}

/** The distances, the diversity and the PCA as the page names them. */
function names(): {
  readonly distances: LiveAnalysisName;
  readonly diversity: LiveAnalysisName;
  readonly pca: LiveAnalysisName;
} {
  const state = page().getState();
  return {
    distances: liveAnalysisOf(state, "popDists"),
    diversity: liveAnalysisOf(state, "diversity"),
    pca: liveAnalysisOf(state, "pca"),
  };
}

describe("DT1 D2 the distances, a live analysis of popgen2.html", () => {
  test("the page runs the distances of popgen2.html, last of its analyses and last of the live ones", () => {
    expect(POPGEN2_ANALYSES.at(-1)).toBe(popDistsOnPopgen2);
    expect(POPGEN2_LIVE.at(-1)).toBe("popDists");
    expect(LIVE_TABS.popDists).toBe("distances");
  });

  test("liveAnalysisOf names them the distances, in the Distances tab, reading the populations, in the plural", () => {
    expect(names().distances).toStrictEqual({
      id: "popDists",
      name: "the distances",
      tab: "Distances",
      readsPopulations: true,
      plural: true,
    });
  });

  test("a crash ends their live state, as the diversity's; nothing else in a state that is not an error", () => {
    expect(popgen2EndsLive(page().getState(), "popDists")).toBe(false);
  });

  test("the locks name them with their pronoun in the plural", () => {
    const { distances, pca } = names();
    expect(filtersLockedText(distances, [])).toBe(
      "Stop the distances in the Distances tab to change the filters; then press Run there to calculate them again.",
    );
    expect(populationsLockedText(distances, [])).toBe(
      "Stop the distances in the Distances tab to change the populations; then press Run there to calculate them again.",
    );
    expect(filtersLockedText(distances, [pca])).toBe(
      "Stop the distances in the Distances tab to change the filters, or press Stop all beside the heading Popnei to stop the PCA too; then press Run in each tab to calculate them again.",
    );
    // The diversity's words are unchanged.
    expect(filtersLockedText(names().diversity, [])).toBe(
      "Stop the diversity in the Populations tab to change the filters; then press Run there to calculate it again.",
    );
  });

  test("the download and the box Individuals name them in the plural", () => {
    const { distances, diversity } = names();
    expect(analysisWaitsText(distances, [])).toBe(
      "Waits for the distances to end; or stop them in the Distances tab.",
    );
    expect(analysisWaitsText(diversity, [])).toBe(
      "Waits for the diversity to end; or stop it in the Populations tab.",
    );
    expect(notOpenedWhileRunningText("other.csv", distances)).toBe(
      "other.csv was not opened: the populations cannot change while the distances run. Stop the distances in the Distances tab, then open other.csv again.",
    );
    expect(notOpenedWhileRunningText("other.csv", diversity)).toBe(
      "other.csv was not opened: the populations cannot change while the diversity runs. Stop the diversity in the Populations tab, then open other.csv again.",
    );
  });

  test("the band names them in the plural, alone and with others", () => {
    const { distances, pca, diversity } = names();
    const aboutToStart = {
      kind: "aboutToStart",
      ids: ["popDists"],
      named: [distances],
      withStop: true,
      stopAll: null,
    } as const;
    expect(lineWords({ ...aboutToStart, waitsFor: "changes" }, 0)).toEqual({
      full: "The distances start in a moment",
      short: "Distances soon",
      aroundName: null,
    });
    expect(
      lineWords({ ...aboutToStart, waitsFor: "afterCrash" }, 0)?.full,
    ).toBe("The distances start after the next change");
    expect(lineWords({ ...aboutToStart, waitsFor: "download" }, 0)?.full).toBe(
      "The distances start after the download",
    );
    expect(stopOf({ ...aboutToStart, waitsFor: "changes" })?.name).toBe(
      "Stop recalculating the distances",
    );
    const running = {
      kind: "running",
      id: "pca",
      named: pca,
      runId: 1,
      then: [diversity, distances],
      withStop: true,
      stopAll: [pca, diversity, distances],
    } as const;
    expect(lineWords(running, 80)?.full).toBe(
      "PCA running · 1:20 · then the diversity and the distances",
    );
    expect(stopAllOf(running)?.name).toBe(
      "Stop all: the PCA, the diversity and the distances",
    );
    expect(
      lineWords(
        {
          kind: "running",
          id: "popDists",
          named: distances,
          runId: 2,
          then: [],
          withStop: true,
          stopAll: null,
        },
        12,
      ),
    ).toEqual({
      full: "Distances running · 0:12",
      short: "Distances · 0:12",
      aroundName: null,
    });
  });

  test("the status region: a round with the distances, Stop all, and their own words", () => {
    const { distances, pca, diversity } = names();
    expect(roundText([pca, distances])).toBe(
      "Calculating the PCA and then the distances again. To change the filters, press Stop all beside the heading Popnei, or stop each in its tab; to change the populations, stop the distances in the Distances tab.",
    );
    expect(roundText([diversity, distances])).toBe(
      "Calculating the diversity and then the distances again. To change the filters or the populations, press Stop all beside the heading Popnei, or stop each in its tab.",
    );
    expect(
      stopAllText([
        { named: pca, runOffered: true },
        { named: distances, runOffered: true },
      ]),
    ).toBe(
      "Stopped: the PCA and the distances no longer start by themselves. Press Run in their tabs to calculate them again.",
    );
    expect(DISTANCES_STARTED_BY_ITSELF).toBe(
      "Calculating the distances between populations again. To change the filters or the populations, stop them in the Distances tab.",
    );
    expect(DISTANCES_HELD_AFTER_CRASH).toBe(
      "The distances did not start: they start after the next change of the filters, of their options or of the populations, or when Run is pressed in the Distances tab.",
    );
    expect(distancesStoppedText(true)).toBe(
      "Distances stopped. Press Run in the Distances tab to calculate them again.",
    );
    expect(distancesStoppedText(false)).toBe("Distances stopped.");
  });
});
