/**
 * The Variants step (docs/specs/steps/variants.md): the user picks the
 * variants file, a VCF or a `.nei` file, sets how a VCF is read, sees
 * what the file holds, and sets the missing data filter. The step reads
 * the project from the store and sends it commands; what it holds itself
 * is the options of the next VCF, until the pick writes them into the
 * project, and the message of a file it did not load.
 */
import { useId, useRef, useState } from "react";

import { DEFAULT_MAX_MISSING_RATE } from "../../../core/apps.ts";
import {
  MAX_PLOIDY,
  escaped,
  loadVariants,
  projectNeeds,
  removeVariantFilter,
  setVariantFilter,
} from "../../../core/project.ts";
import type { VariantSource } from "../../../core/project.ts";
import type {
  VariantFilter,
  VcfReadOptions,
} from "../../../worker/protocol.ts";
import { classOf } from "../../classOf.ts";
import { useFiles } from "../../files.tsx";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Checkbox } from "../../widgets/Checkbox.tsx";
import { FileZone } from "../../widgets/FileZone.tsx";
import { NumberField } from "../../widgets/NumberField.tsx";
import { Switch } from "../../widgets/Switch.tsx";
import { ReadingTime } from "./ReadingTime.tsx";
import styles from "./VariantsStep.module.css";
import {
  ONLY_PASSED_LABEL,
  PICKER_ENDINGS,
  SEVERAL_DROPPED,
  formatOfName,
  formatText,
  individualsText,
  notLoadedText,
  ploidyText,
  readAgainLabel,
  readWithText,
  sizeText,
  startingOptions,
  variantsText,
} from "./words.ts";

/** The line under the ploidy, which the owner asked for on 25 September
    2026. */
const PLOIDY_DESCRIPTION =
  "A VCF does not say its ploidy, so it is given here. If it is wrong, the first analysis stops with a message that names the line and the individual, and the file is read again with the right ploidy.";

/** The options of a VCF the user set, for the load they were set on. */
interface EditedOptions {
  /** The load id of the variants file when they were set; `null` with
      none. */
  readonly forLoad: string | null;
  /** The options. */
  readonly options: VcfReadOptions;
}

/** The missing data filter of the project, or `null` when it is off. */
function missingDataOf(
  filters: readonly VariantFilter[],
): Extract<VariantFilter, { kind: "missing_data" }> | null {
  for (const filter of filters) {
    if (filter.kind === "missing_data") return filter;
  }
  return null;
}

/** The Variants step, in the `<main>` of the shell. */
export function VariantsStep(): React.JSX.Element {
  const store = useStore();
  const files = useFiles();
  const announcer = useAnnouncer();
  const variants = useAppState((s) => s.project.variants);
  const filters = useAppState((s) => s.project.filters);
  const starting = useAppState((s) => startingOptions(s.project));
  const reason = useAppState((s) => projectNeeds(s.project));

  // The options start again at those of the load, the reference's or the
  // defaults whenever the load changes, by a pick or an undo.
  const [edited, setEdited] = useState<EditedOptions | null>(null);
  const loadId = variants?.fileId ?? null;
  const options =
    edited !== null && edited.forLoad === loadId ? edited.options : starting;
  const setOptions = (next: VcfReadOptions): void => {
    setEdited({ forLoad: loadId, options: next });
  };

  // The message of a file not loaded, until the next pick.
  const [message, setMessage] = useState<string | null>(null);
  const fileButton = useRef<HTMLButtonElement>(null);
  const fileHeading = useId();
  const vcfHeading = useId();
  const filterHeading = useId();

  const refuse = (text: string): void => {
    setMessage(text);
    // The focus stays on the button, so a screen reader would not read
    // the message by itself.
    announcer.announce(text);
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
    setMessage(null);
    const fileId = files.addFile(file);
    store.apply("a new variants file was loaded", (p) =>
      loadVariants(p, {
        fileId,
        name: file.name,
        size: file.size,
        format,
        readOptions: format === "vcf" ? options : null,
      }),
    );
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
    store.apply("the variants file was read again with other options", (p) =>
      loadVariants(p, {
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

  const missingData = missingDataOf(filters);
  const setMissingData = (on: boolean): void => {
    if (on) {
      store.apply("the missing data filter was turned on", (p) =>
        setVariantFilter(p, {
          kind: "missing_data",
          maxAllowedMissingRate: DEFAULT_MAX_MISSING_RATE,
        }),
      );
    } else {
      store.apply("the missing data filter was turned off", (p) =>
        removeVariantFilter(p, "missing_data"),
      );
    }
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
          <FileZone
            label="Variants file"
            buttonLabel={
              variants === null
                ? "Choose a variants file…"
                : `Replace ${escaped(variants.name)}…`
            }
            accept={PICKER_ENDINGS}
            onFiles={onFiles}
            buttonRef={fileButton}
          >
            {variants === null ? (
              <p className={classOf(styles, "hint")}>
                Drop a VCF or a .nei file here, or choose one.
              </p>
            ) : (
              <FileCard variants={variants} reason={reason} />
            )}
          </FileZone>
          {message !== null && (
            <p className={classOf(styles, "problem")}>
              <ProblemIcon />
              <span>{message}</span>
            </p>
          )}
        </section>

        <section
          aria-labelledby={vcfHeading}
          className={classOf(styles, "section")}
        >
          <h2 id={vcfHeading} className={classOf(styles, "heading")}>
            How a VCF is read
          </h2>
          <NumberField
            label="Ploidy of the VCF"
            value={options.ploidy}
            minValue={1}
            maxValue={MAX_PLOIDY}
            step={1}
            description={PLOIDY_DESCRIPTION}
            onChange={(ploidy) => {
              setOptions({ ...options, ploidy });
            }}
          />
          <Checkbox
            label={ONLY_PASSED_LABEL}
            isSelected={options.onlyPassed}
            onChange={(onlyPassed) => {
              setOptions({ ...options, onlyPassed });
            }}
          />
          {againLabel !== null && againFile !== null && (
            <div>
              <Button label={againLabel} onPress={readAgain} />
            </div>
          )}
        </section>
      </div>

      <section
        aria-labelledby={filterHeading}
        className={classOf(styles, "section")}
      >
        <h2 id={filterHeading} className={classOf(styles, "heading")}>
          Missing data filter
        </h2>
        <Switch
          label="Filter the variants by missing data"
          isSelected={missingData !== null}
          onChange={setMissingData}
        />
        {missingData !== null && (
          <NumberField
            label="Maximum proportion of missing genotypes"
            value={missingData.maxAllowedMissingRate}
            minValue={0}
            maxValue={1}
            step={0.01}
            onChange={(maxAllowedMissingRate) => {
              store.apply("the missing data filter changed", (p) =>
                setVariantFilter(p, {
                  kind: "missing_data",
                  maxAllowedMissingRate,
                }),
              );
            }}
          />
        )}
      </section>
    </div>
  );
}

/** What the card of a loaded file is drawn with. */
interface FileCardProps {
  /** The variants file of the project. */
  readonly variants: VariantSource;
  /** The reason `projectNeeds` gives, for a file being read or refused. */
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
          <li>{ploidyText(read.ploidy)}</li>
          <li>{variantsText(read.numVars)}</li>
          {variants.readOptions !== null && (
            <li>{readWithText(variants.readOptions)}</li>
          )}
        </ul>
      );
    case "failed":
      return (
        <p className={classOf(styles, "problem")}>
          <ProblemIcon />
          <span>{reason}</span>
        </p>
      );
  }
}

/** The mark of a problem, beside its words, which say it too. */
function ProblemIcon(): React.JSX.Element {
  return (
    <svg
      className={classOf(styles, "icon")}
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" />
      <line x1="8" y1="4" x2="8" y2="9" />
      <line x1="8" y1="11.5" x2="8" y2="12" />
    </svg>
  );
}
