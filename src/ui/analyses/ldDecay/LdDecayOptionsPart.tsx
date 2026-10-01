/**
 * The options of the LD decay, above the Run button in every state
 * (docs/specs/analyses/ldDecay.md, "What it shows", the options): the
 * largest distance between the two variants of a pair, empty until the
 * user types one, and the maximum major allele frequency in each
 * population, two number fields that stay enabled while the panel is
 * locked or running, since the distance typed unlocks it and a change of
 * either leaves the calculation behind. Each is one command, of
 * `commands.ts`. While no distance is typed, or the one typed is more
 * than the memory of a browser tab allows the populations, the reason of
 * the lock stands beside the field and describes it, whatever reason the
 * Run button gives; a distance committed that the memory does not allow
 * is announced with that reason, since the focus is then on the field or
 * past it, and the reason appears beside it and under Run with no word
 * to a screen reader: once, when the lock turns on, and not at each
 * distance committed while it holds, an arrow key among them. Under the fields, while the LD pruning of the Variants
 * step is on, the line that says it is not applied here, also over a plot
 * shown, which the pruning turned on does not remove.
 */
import { useId } from "react";

import {
  MAX_DIST_TAKEN,
  MAX_MAX_ALLOWED_MAF,
  MIN_MAX_ALLOWED_MAF,
  MIN_MAX_DIST,
  ldDecayOptions,
  maxDistReason,
} from "../../../core/analyses/ldDecay.ts";
import { classOf } from "../../classOf.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { distanceRefusedText } from "../../steps/variants/words.ts";
import { useAppState, useStore } from "../../store.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import type { OptionCommand } from "../optionCommand.ts";
import { maxAllowedMafCommand, maxDistCommand } from "./commands.ts";
import styles from "./LdDecayOptionsPart.module.css";
import {
  MAX_DIST_LABEL,
  MAX_DIST_LINE,
  MAX_MAF_LABEL,
  MAX_MAF_LINE,
  frequencyRefusedText,
  pruningLine,
} from "./words.ts";

/** The frequency takes two decimals, and an arrow key moves it by 0.01,
    as the threshold of the MAF filter of the Variants step does. */
const FREQUENCY_STEP = 0.01;
const FREQUENCY_DECIMALS = 2;

/** The options of the LD decay. */
export function LdDecayOptionsPart(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  // Each option alone, a number or `null`: `ldDecayOptions` makes a new
  // object at each call, which a selector must not give back.
  const maxDist = useAppState((s) => ldDecayOptions(s.project).maxDist);
  const maxAllowedMaf = useAppState(
    (s) => ldDecayOptions(s.project).maxAllowedMaf,
  );
  const distanceReason = useAppState((s) => maxDistReason(s.project));
  const pruning = useAppState((s) => pruningLine(s.project));
  const reasonId = useId();

  const apply = (step: OptionCommand): void => {
    store.apply(step.description, step.command);
  };
  const announce = (text: string): void => {
    announcer.announce(text);
  };

  return (
    <div className={classOf(styles, "options")}>
      <div className={classOf(styles, "distance")}>
        <NumberField
          label={MAX_DIST_LABEL}
          // No distance typed yet: React Aria shows NaN as an empty field,
          // where undefined would let it keep the number an Undo took out
          // of the project.
          value={maxDist ?? Number.NaN}
          minValue={MIN_MAX_DIST}
          maxValue={MAX_DIST_TAKEN}
          step={1}
          {...(distanceReason !== null && { describedBy: reasonId })}
          description={MAX_DIST_LINE}
          refusedText={distanceRefusedText}
          onRefused={announce}
          onChange={(typed) => {
            // Said when the commit turns the lock on, or changes its
            // reason, and not again while the same reason holds.
            const before = maxDistReason(store.getState().project);
            apply(maxDistCommand(typed));
            const reason = maxDistReason(store.getState().project);
            if (reason !== null && reason !== before) announce(reason);
          }}
        />
        {distanceReason !== null && (
          <Problem id={reasonId}>{distanceReason}</Problem>
        )}
      </div>
      <NumberField
        label={MAX_MAF_LABEL}
        value={maxAllowedMaf}
        minValue={MIN_MAX_ALLOWED_MAF}
        maxValue={MAX_MAX_ALLOWED_MAF}
        step={FREQUENCY_STEP}
        decimals={FREQUENCY_DECIMALS}
        description={MAX_MAF_LINE}
        refusedText={frequencyRefusedText}
        onRefused={announce}
        onChange={(typed) => {
          apply(maxAllowedMafCommand(typed));
        }}
      />
      {pruning !== null && <p className={classOf(styles, "line")}>{pruning}</p>}
    </div>
  );
}
