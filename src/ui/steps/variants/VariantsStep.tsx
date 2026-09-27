/**
 * The Variants step (docs/specs/steps/variants.md): the user picks the
 * variants file, a VCF or a `.nei` file, sets how a VCF is read, sees
 * what the file holds, sets the filters of the variants
 * (VariantFilters.tsx), types the lists of individuals to keep and to
 * remove (IndividualFilters.tsx), and writes the filtered variants
 * (WriteSection.tsx). The step reads
 * the project from the store and sends it commands; what it holds itself
 * is the options of the next VCF, until the pick writes them into the
 * project, and the message of a file it did not load.
 *
 * After a project file was opened, the step says above the zone which
 * variants file the project was made with, and, once one is given, how it
 * differs from that one, in a warning beside its card, which the shell
 * announces from the state (the spec, "A project file opened").
 */
import { useId, useRef, useState, useSyncExternalStore } from "react";

import {
  MAX_PLOIDY,
  escaped,
  variantsStepNeeds,
} from "../../../core/project.ts";
import type { VariantLoad, VariantSource } from "../../../core/project.ts";
import { askedFileText, identityWarning } from "../../../core/projectFile.ts";
import { sizeText } from "../../../core/writeEstimate.ts";
import type { VcfReadOptions } from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { useFiles } from "../../files.tsx";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Checkbox } from "../../widgets/Checkbox.tsx";
import { FileZone } from "../../widgets/FileZone.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import { Warning } from "../../widgets/Warning.tsx";
import {
  besideOf,
  isBeside,
  pickCommand,
  readAgainCommand,
  shownOptions,
} from "./commands.ts";
import type { Beside } from "./commands.ts";
import { IndividualFilters } from "./IndividualFilters.tsx";
import { ReadingTime } from "./ReadingTime.tsx";
import { VariantFilters } from "./VariantFilters.tsx";
import styles from "./VariantsStep.module.css";
import { createVcfOptions } from "./vcfOptions.ts";
import { WriteSection } from "./WriteSection.tsx";
import {
  FOLDER_DROPPED,
  ONLY_PASSED_LABEL,
  PICKER_ENDINGS,
  PLOIDY_DESCRIPTION,
  PLOIDY_LABEL,
  SEVERAL_DROPPED,
  TEXT_DROPPED,
  formatOfName,
  formatText,
  individualsText,
  notLoadedText,
  ploidyRefusedText,
  ploidyText,
  readAgainLabel,
  readWithText,
  variantsText,
} from "./words.ts";

/** What the step says of a drop, or a paste, that is not of one file. */
const NOT_FILES_WORDS = {
  folder: FOLDER_DROPPED,
  text: TEXT_DROPPED,
  several: SEVERAL_DROPPED,
} as const;

/** The message of a file the step did not load, with the files it was
    said beside. */
interface StepMessage extends Beside {
  /** Its words. */
  readonly text: string;
}

/** The Variants step, in the `<main>` of the shell. */
export function VariantsStep(): React.JSX.Element {
  const store = useStore();
  const files = useFiles();
  const announcer = useAnnouncer();
  const variants = useAppState((s) => s.project.variants);
  const reason = useAppState((s) => variantsStepNeeds(s.project));
  const asked = useAppState((s) => askedFileText(s.project));
  const identity = useAppState((s) => identityWarning(s.project));
  const reference = useAppState((s) => s.project.reference);

  // The options the user set and has not applied by a pick or a read
  // again, held by the step while it is drawn (vcfOptions.ts); it shows
  // them while their load is there, and otherwise those it starts at, so
  // a new load or an undo sets them back.
  const [vcfOptions] = useState(() => createVcfOptions(store));
  const edited = useSyncExternalStore(
    vcfOptions.subscribe,
    vcfOptions.getEdited,
  );
  const options = useAppState((s) => shownOptions(edited, s.project));
  // Commits what is typed in the ploidy, through the field's own parser
  // and rounding, with the focus left where it is.
  const commitPloidy = useRef<(() => void) | null>(null);

  /** The options as they are now, with a number still being typed in
      the ploidy committed first: a file dropped from the desktop leaves
      the focus in the field, which has not committed it. */
  const optionsNow = (): VcfReadOptions => {
    commitPloidy.current?.();
    return vcfOptions.shown();
  };

  // The message of a file not loaded, until the next pick, or until an
  // Undo or a Redo past a pick, or an opening, changes the files it was
  // said beside. It is forgotten then, during the drawing, as react.dev
  // has it for state that follows a change of what is drawn, so that a
  // Redo back to those files does not show it again.
  const [said, setSaid] = useState<StepMessage | null>(null);
  const saidBeside = said !== null && isBeside(said, { variants, reference });
  if (said !== null && !saidBeside) setSaid(null);
  const message = saidBeside ? said.text : null;
  const fileButton = useRef<HTMLButtonElement>(null);
  const fileHeading = useId();
  const vcfHeading = useId();

  const announce = (text: string): void => {
    announcer.announce(text);
  };

  const refuse = (text: string): void => {
    setSaid({ ...besideOf(store.getState().project), text });
    // The focus stays on the button, so a screen reader would not read
    // the message by itself.
    announce(text);
  };

  const onFiles = (picked: readonly File[]): void => {
    const [file, ...others] = picked;
    if (file === undefined) return;
    if (others.length > 0) {
      refuse(SEVERAL_DROPPED);
      return;
    }
    const format = formatOfName(file.name);
    if (format === null) {
      refuse(notLoadedText(file.name));
      return;
    }
    setSaid(null);
    const readOptions = format === "vcf" ? optionsNow() : null;
    const fileId = files.addFile(file);
    const load: VariantLoad = {
      fileId,
      name: file.name,
      size: file.size,
      format,
      readOptions,
    };
    vcfOptions.load(pickCommand(load));
  };

  const loadedOptions = variants?.readOptions ?? null;
  const againLabel =
    variants === null || loadedOptions === null
      ? null
      : readAgainLabel(variants.name, loadedOptions, options);
  const againFile = variants === null ? null : files.fileOf(variants.fileId);
  const readAgain = (): void => {
    if (variants === null || againFile === null) return;
    const fileId = files.addFile(againFile);
    vcfOptions.load(
      readAgainCommand({
        fileId,
        name: variants.name,
        size: variants.size,
        format: variants.format,
        readOptions: options,
      }),
    );
    // The button goes with the new load; the file button is in every
    // state.
    fileButton.current?.focus();
  };

  return (
    <div className={classOf(styles, "step")}>
      {/* It takes the focus when the step changes and after Close of the
          error bar, and is not in the order of the Tab key. */}
      <h1 tabIndex={-1}>Variants</h1>

      <div className={classOf(styles, "top")}>
        <section
          aria-labelledby={fileHeading}
          className={classOf(styles, "section")}
        >
          <h2 id={fileHeading} className={classOf(styles, "heading")}>
            Variants file
          </h2>
          {asked !== null && (
            <p className={classOf(styles, "asked")}>{asked}</p>
          )}
          <FileZone
            pasteLabel="Paste a variants file"
            buttonLabel={
              variants === null
                ? "Choose a variants file…"
                : `Replace ${escaped(variants.name)}…`
            }
            accept={PICKER_ENDINGS}
            onFiles={onFiles}
            onNotFiles={(dropped) => {
              refuse(NOT_FILES_WORDS[dropped]);
            }}
            buttonRef={fileButton}
          >
            {variants === null ? (
              <p className={classOf(styles, "hint")}>
                Drop a VCF or a .nei file here, or choose one.
              </p>
            ) : (
              <>
                <FileCard variants={variants} reason={reason} />
                {identity !== null && <Warning>{identity}</Warning>}
              </>
            )}
          </FileZone>
          {message !== null && <Problem>{message}</Problem>}
        </section>

        <section
          aria-labelledby={vcfHeading}
          className={classOf(styles, "section")}
        >
          <h2 id={vcfHeading} className={classOf(styles, "heading")}>
            How a VCF is read
          </h2>
          <NumberField
            label={PLOIDY_LABEL}
            value={options.ploidy}
            minValue={1}
            maxValue={MAX_PLOIDY}
            step={1}
            description={PLOIDY_DESCRIPTION}
            refusedText={ploidyRefusedText}
            onRefused={announce}
            onCommitReady={(commit) => {
              commitPloidy.current = commit;
            }}
            onChange={(ploidy) => {
              vcfOptions.edit({ ...vcfOptions.shown(), ploidy });
            }}
          />
          <Checkbox
            label={ONLY_PASSED_LABEL}
            isSelected={options.onlyPassed}
            onChange={(onlyPassed) => {
              vcfOptions.edit({ ...vcfOptions.shown(), onlyPassed });
            }}
          />
          {againLabel !== null && againFile !== null && (
            <div>
              <Button label={againLabel} onPress={readAgain} />
            </div>
          )}
        </section>
      </div>

      <VariantFilters />

      <IndividualFilters />

      <WriteSection />
    </div>
  );
}

/** What the card of a loaded file is drawn with. */
interface FileCardProps {
  /** The variants file of the project. */
  readonly variants: VariantSource;
  /** The reason `variantsStepNeeds` gives, for a file being read or not
      read. */
  readonly reason: string | null;
}

/** The card of the loaded file: its name, format and size, and what it
    holds once read, or why it was not. */
function FileCard({ variants, reason }: FileCardProps): React.JSX.Element {
  const read = variants.read;
  return (
    <div className={classOf(styles, "card")}>
      <p className={classOf(styles, "fileName")}>{escaped(variants.name)}</p>
      <p className={classOf(styles, "muted")}>
        {formatText(variants.format)} · {sizeText(variants.size)}
      </p>
      <FileRead variants={variants} read={read} reason={reason} />
    </div>
  );
}

/** What the card shows of the read of the file. */
function FileRead({
  variants,
  read,
  reason,
}: FileCardProps & {
  readonly read: VariantSource["read"];
}): React.JSX.Element {
  switch (read.kind) {
    case "pending":
      if (reason === null) throw noReason(variants);
      return (
        <p className={classOf(styles, "line")}>
          {reason}{" "}
          <ReadingTime
            key={variants.fileId}
            className={classOf(styles, "muted")}
          />
        </p>
      );
    case "read":
      return (
        <ul className={classOf(styles, "facts")}>
          <li>{individualsText(read.individuals.length)}</li>
          {/* A VCF's ploidy is the one given, in the line of how it was
              read, and not one found in the file. */}
          {variants.readOptions === null && <li>{ploidyText(read.ploidy)}</li>}
          <li>{variantsText(read.numVars)}</li>
          {variants.readOptions !== null && (
            <li>{readWithText(variants.readOptions)}</li>
          )}
        </ul>
      );
    case "failed":
      if (reason === null) throw noReason(variants);
      return <Problem>{reason}</Problem>;
  }
}

/** The defect of a file being read or refused for which
    `variantsStepNeeds` gave no reason, which it always gives. */
function noReason(variants: VariantSource): Error {
  return new Error(
    `popnei_web defect: variantsStepNeeds gave no reason for the variants file ${variants.fileId}, ${variants.read.kind}.`,
  );
}
