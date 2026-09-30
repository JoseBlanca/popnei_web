/**
 * The options of the distances between populations, above the Run button
 * in every state (docs/specs/analyses/popDists.md, "What it shows", its
 * options): the field of the minimum number of individuals, which stays
 * enabled while the panel is locked, since lowering it can unlock it,
 * and the radio buttons of the measure the heatmap draws. Each is one
 * command. A minimum committed removes the result, as a change of its
 * key; a measure removes nothing, since it is in no key, and the heatmap
 * is drawn again below without moving the focus, so the status region
 * says which heatmap is drawn now (popDists.md, "Accessibility").
 */
import { popDists, popDistsOptions } from "../../../core/analyses/popDists.ts";
import type { PopDistsOptions } from "../../../core/analyses/popDists.ts";
import {
  LARGEST_WHOLE_NUMBER,
  setAnalysisOptions,
} from "../../../core/project.ts";
import type { ShownMeasure } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { minimumRefusedText } from "../../steps/variants/words.ts";
import { useAppState, useStore } from "../../store.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { RadioGroup } from "../../widgets/RadioGroup.tsx";
import styles from "./PopDistsOptionsPart.module.css";
import {
  MEASURE_DESCRIPTION,
  MEASURE_ITEMS,
  MEASURE_LABEL,
  MINIMUM_DESCRIPTION,
  MINIMUM_LABEL,
  measureAnnounced,
} from "./words.ts";

/** The options of the distances between populations. */
export function PopDistsOptionsPart(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  // Two primitives, since popDistsOptions makes a new object at each
  // call.
  const minNumIndividuals = useAppState(
    (s) => popDistsOptions(s.project).minNumIndividuals,
  );
  const measure = useAppState((s) => popDistsOptions(s.project).measure);

  const apply = (
    description: string,
    change: Partial<PopDistsOptions>,
  ): void => {
    store.apply(description, (p) => {
      const next = { ...popDistsOptions(p), ...change };
      return setAnalysisOptions(p, popDists, {
        minNumIndividuals: next.minNumIndividuals,
        measure: next.measure,
      });
    });
  };

  return (
    <div className={classOf(styles, "options")}>
      <NumberField
        label={MINIMUM_LABEL}
        value={minNumIndividuals}
        minValue={0}
        maxValue={LARGEST_WHOLE_NUMBER}
        step={1}
        refusedText={minimumRefusedText}
        onRefused={(text) => {
          announcer.announce(text);
        }}
        onChange={(value) => {
          apply(MINIMUM_DESCRIPTION, { minNumIndividuals: value });
        }}
      />
      <RadioGroup<ShownMeasure>
        label={MEASURE_LABEL}
        items={MEASURE_ITEMS}
        value={measure}
        onChange={(chosen) => {
          apply(MEASURE_DESCRIPTION, { measure: chosen });
          announcer.announce(measureAnnounced(chosen));
        }}
      />
    </div>
  );
}
