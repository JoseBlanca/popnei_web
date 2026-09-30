/**
 * The options of the diversity, above the Run button in every state
 * (docs/specs/analyses/diversity.md, "What it shows", the options): the
 * minimum number of individuals, the frequency below which a variant is
 * polymorphic, and the chromosomes drawn for the rarefaction, three number
 * fields that stay enabled while the panel is locked or running, since a
 * change of any of them can unlock it or leaves the calculation behind.
 * Each is one command, of `commands.ts`. The field of the draw shows the
 * draw in use, and says under it where it comes from: the default, the
 * ploidy times the minimum, or a number typed, with "Use the default"
 * beside it, which sets the draw back and gives the focus to the field,
 * since the button goes (diversity.md, "Accessibility"). A number typed
 * that is the default's is kept as typed.
 */
import { useRef } from "react";

import {
  MIN_DRAW,
  defaultDrawOf,
  diversityOptions,
  drawOf,
} from "../../../core/analyses/diversity.ts";
import { LARGEST_WHOLE_NUMBER } from "../../../core/project.ts";
import { classOf } from "../../classOf.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { minimumRefusedText } from "../words.ts";
import { drawCommand, minimumCommand, thresholdCommand } from "./commands.ts";
import type { OptionCommand } from "./commands.ts";
import styles from "./DiversityOptionsPart.module.css";
import {
  DRAW_LABEL,
  MINIMUM_LABEL,
  MINIMUM_LINE,
  THRESHOLD_LABEL,
  USE_DEFAULT_LABEL,
  drawLine,
  drawRefusedText,
  thresholdRefusedText,
} from "./words.ts";

/** The threshold takes two decimals, and an arrow key moves it by 0.01,
    as the threshold of the MAF does. */
const THRESHOLD_STEP = 0.01;
const THRESHOLD_DECIMALS = 2;

/** The options of the diversity. */
export function DiversityOptionsPart(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  // The same object while the options of the project are the same.
  const options = useAppState((s) => diversityOptions(s.project));
  const draw = useAppState((s) => drawOf(s.project));
  const defaultDraw = useAppState((s) => defaultDrawOf(s.project));
  const ploidy = useAppState((s) =>
    s.project.variants?.read.kind === "read"
      ? s.project.variants.read.ploidy
      : null,
  );
  const drawRef = useRef<HTMLDivElement>(null);
  const typed = options.numCalledAlleles !== null;

  const apply = (step: OptionCommand): void => {
    store.apply(step.description, step.command);
  };
  const announce = (text: string): void => {
    announcer.announce(text);
  };

  return (
    <div className={classOf(styles, "options")}>
      <NumberField
        label={MINIMUM_LABEL}
        value={options.minNumIndividuals}
        minValue={0}
        maxValue={LARGEST_WHOLE_NUMBER}
        step={1}
        description={MINIMUM_LINE}
        refusedText={minimumRefusedText}
        onRefused={announce}
        onChange={(value) => {
          apply(minimumCommand(value));
        }}
      />
      <NumberField
        label={THRESHOLD_LABEL}
        value={options.polyThreshold}
        minValue={0}
        maxValue={1}
        step={THRESHOLD_STEP}
        decimals={THRESHOLD_DECIMALS}
        refusedText={thresholdRefusedText}
        onRefused={announce}
        onChange={(value) => {
          apply(thresholdCommand(value));
        }}
      />
      <div ref={drawRef} className={classOf(styles, "draw")}>
        <NumberField
          label={DRAW_LABEL}
          // Empty while the variants file is not read, whose ploidy the
          // default needs.
          value={draw ?? Number.NaN}
          minValue={MIN_DRAW}
          maxValue={LARGEST_WHOLE_NUMBER}
          step={1}
          description={drawLine({
            typed,
            ploidy,
            minNumIndividuals: options.minNumIndividuals,
            defaultDraw,
          })}
          refusedText={drawRefusedText}
          onRefused={announce}
          onChange={(value) => {
            apply(drawCommand(value));
          }}
          onSameCommitted={(value) => {
            // The default's number typed is kept as typed, so that the
            // draw does not follow a later change of the minimum without
            // the user knowing.
            if (!typed) apply(drawCommand(value));
          }}
        />
        {typed && (
          <Button
            label={USE_DEFAULT_LABEL}
            onPress={() => {
              // The button goes with the draw typed: the focus goes to the
              // field of the draw, and not to the top of the page.
              drawRef.current
                ?.querySelector<HTMLInputElement>("input")
                ?.focus();
              apply(drawCommand(null));
            }}
          />
        )}
      </div>
    </div>
  );
}
