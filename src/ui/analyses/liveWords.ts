/**
 * The words the status region of popgen2.html says of several analyses
 * calculated again by themselves (docs/specs/steps/popgen2-pca.md,
 * "Several analyses calculated again by themselves", "The status
 * region"): the first start of a round, the start of a Run that waited,
 * and Stop all. The words of each analysis alone are its tab's:
 * `src/ui/analyses/pca/tabWords.ts` and
 * `src/ui/analyses/diversity/liveWords.ts`. Pure, so that a test in node
 * checks them; `announceLive` of src/ui/variants/announceChanges.ts says
 * them.
 */
import { escaped } from "../../core/project.ts";
import type { LiveAnalysisName } from "./status.ts";
import { eachInItsTab } from "./words.ts";

/** The analyses `names`, in their order, joined as a sentence names
    them: "the PCA", "the PCA and the diversity", "the PCA, the
    diversity and the LD decay"; with `then`, "and then" before the
    last. */
function joined(names: readonly string[], then: boolean): string {
  const last = names.at(-1) ?? "";
  if (names.length < 2) return last;
  return `${names.slice(0, -1).join(", ")} ${then ? "and then" : "and"} ${last}`;
}

/**
 * What the status region says at the first start of a round of the live
 * analyses `named`, two or more in their order, the PCA and the
 * diversity: "Calculating the PCA and then the diversity again. To
 * change the filters, press Stop all beside the heading Popnei, or stop
 * each in its tab; to change the populations, stop the diversity in the
 * Populations tab." when the band offers Stop all, `stopAllOffered`;
 * until then "… To change the filters, stop each in its tab; …". The
 * populations are named with the analyses of the round that read them,
 * since only those lock them, and with "or the populations" when all
 * do.
 */
export function roundText(
  named: readonly LiveAnalysisName[],
  stopAllOffered: boolean,
): string {
  const how = stopAllOffered
    ? "press Stop all beside the heading Popnei, or stop each in its tab"
    : "stop each in its tab";
  const readers = named.filter((one) => one.readsPopulations);
  const start = `Calculating ${joined(
    named.map((one) => one.name),
    true,
  )} again.`;
  if (readers.length === 0) {
    return `${start} To change the filters, ${how}.`;
  }
  if (readers.length === named.length) {
    return `${start} To change the filters or the populations, ${how}.`;
  }
  return `${start} To change the filters, ${how}; to change the populations, stop ${eachInItsTab(readers)}.`;
}

/** What the status region says when a Run of the analysis `name`, "the
    diversity", starts after it waited for another calculation, on the
    variants file `variantsName`, since the bar then comes in a tab the
    user may not see: "Calculating the diversity of panel.nei." */
export function runWaitedText(name: string, variantsName: string): string {
  return `Calculating ${name} of ${escaped(variantsName)}.`;
}

/** An analysis whose live state Stop all ended, and whether its tab
    then offers Run. */
export interface StoppedByAll {
  /** The analysis as the words name it. */
  readonly named: LiveAnalysisName;
  /** Whether its tab then offers an enabled Run. */
  readonly runOffered: boolean;
}

/**
 * What the status region says at Stop all, which ended the live state of
 * the analyses `stopped`, two or more in their order: "Stopped: the PCA
 * and the diversity no longer start by themselves.", and, as a Stop in
 * one tab says it, Run to press only in the tabs that offer it: "Press
 * Run in their tabs to calculate them again." when all do, "Press Run in
 * the Populations tab to calculate the diversity again." when one does,
 * and nothing when none does (docs/specs/steps/popgen2-pca.md, "Several
 * analyses calculated again by themselves", "The status region").
 */
export function stopAllText(stopped: readonly StoppedByAll[]): string {
  const first = `Stopped: ${joined(
    stopped.map((one) => one.named.name),
    false,
  )} no longer start by themselves.`;
  const offered = stopped
    .filter((one) => one.runOffered)
    .map((one) => one.named);
  const [only] = offered;
  if (only === undefined) return first;
  if (offered.length === stopped.length) {
    return `${first} Press Run in their tabs to calculate them again.`;
  }
  return offered.length === 1
    ? `${first} Press Run in the ${only.tab} tab to calculate ${only.name} again.`
    : `${first} Press Run for ${eachInItsTab(offered)} to calculate them again.`;
}
