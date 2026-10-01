/**
 * The options of the distances between populations, above the Run button
 * in every state (docs/specs/analyses/popDists.md, "What it shows", its
 * options): the field of the minimum number of individuals, which stays
 * enabled while the panel is locked, since lowering it can unlock it,
 * and the radio buttons of the measure the heatmap draws. Each is one
 * command, of `commands.ts`. A minimum committed removes the result, as a
 * change of its key; a measure removes nothing, since it is in no key,
 * and the heatmap is drawn again below without moving the focus, so the
 * status region says which heatmap is drawn now, when one is
 * (popDists.md, "Accessibility").
 */
import { popDistsOptions } from "../../../core/analyses/popDists.ts";
import { LARGEST_WHOLE_NUMBER } from "../../../core/project.ts";
import type { ShownMeasure } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { RadioGroup } from "../../widgets/RadioGroup.tsx";
import { statusOf } from "../status.ts";
import { minimumRefusedText } from "../words.ts";
import { measureCommand, minimumCommand } from "./commands.ts";
import type { OptionCommand } from "../optionCommand.ts";
import styles from "./PopDistsOptionsPart.module.css";
import {
  MEASURE_ITEMS,
  MEASURE_LABEL,
  MINIMUM_LABEL,
  measureAnnouncement,
} from "./words.ts";

/** The options of the distances between populations. */
export function PopDistsOptionsPart(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  // The same object while the options of the project are the same.
  const options = useAppState((s) => popDistsOptions(s.project));

  const apply = (step: OptionCommand): void => {
    store.apply(step.description, step.command);
  };

  return (
    <div className={classOf(styles, "options")}>
      <NumberField
        label={MINIMUM_LABEL}
        value={options.minNumIndividuals}
        minValue={0}
        maxValue={LARGEST_WHOLE_NUMBER}
        step={1}
        refusedText={minimumRefusedText}
        onRefused={(text) => {
          announcer.announce(text);
        }}
        onChange={(value) => {
          apply(minimumCommand(value));
        }}
      />
      <RadioGroup<ShownMeasure>
        label={MEASURE_LABEL}
        items={MEASURE_ITEMS}
        value={options.measure}
        onChange={(chosen) => {
          apply(measureCommand(chosen));
          // Said only when a heatmap is on the page to be drawn again.
          const text = measureAnnouncement(
            statusOf(store.getState(), "popDists"),
            chosen,
          );
          if (text !== null) announcer.announce(text);
        }}
      />
    </div>
  );
}
