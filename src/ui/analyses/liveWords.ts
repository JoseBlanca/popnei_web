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
 * analyses `names`, two or more in their order, "the PCA", "the
 * diversity": "Calculating the PCA and then the diversity again. To
 * change the filters, press Stop all beside the heading Popnei, or stop
 * each in its tab." when the band offers Stop all, `stopAllOffered`;
 * until then "… To change the filters, stop each in its tab."
 */
export function roundText(
  names: readonly string[],
  stopAllOffered: boolean,
): string {
  const how = stopAllOffered
    ? "press Stop all beside the heading Popnei, or stop each in its tab"
    : "stop each in its tab";
  return `Calculating ${joined(names, true)} again. To change the filters, ${how}.`;
}

/** What the status region says when a Run of the analysis `name`, "the
    diversity", starts after it waited for another calculation, on the
    variants file `variantsName`, since the bar then comes in a tab the
    user may not see: "Calculating the diversity of panel.nei." */
export function runWaitedText(name: string, variantsName: string): string {
  return `Calculating ${name} of ${escaped(variantsName)}.`;
}

/** What the status region says at Stop all, which ended the live state
    of the analyses `names`, two or more in their order: "Stopped: the
    PCA and the diversity no longer start by themselves. Press Run in
    their tabs to calculate them again." */
export function stopAllText(names: readonly string[]): string {
  return `Stopped: ${joined(names, false)} no longer start by themselves. Press Run in their tabs to calculate them again.`;
}
