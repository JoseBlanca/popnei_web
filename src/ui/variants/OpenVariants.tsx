/**
 * The opening of the variants file on popgen2.html
 * (docs/plans/open-variants.md, "Two widgets"): the button "Open a
 * variants file…" in a zone that also takes a dropped or pasted file, the
 * two options a VCF is read with, the ploidy and the passed variants,
 * whose change reads an open VCF again, and below them what went wrong
 * with an opening: a file refused by its name, several files at once, a
 * file popnei could not read. While a file is being read, the zone says
 * so. It reads the project from the store and sends it the commands of
 * the Variants step; what it holds itself is the options of the next VCF
 * and the words of a file it did not open.
 */
import { useId, useRef, useState, useSyncExternalStore } from "react";

import { MAX_PLOIDY, variantsOpenNeeds } from "../../core/project.ts";
import type { VariantLoad } from "../../core/project.ts";
import type { VcfReadOptions } from "../../worker/protocol.ts";
import { classOf } from "../classOf.ts";
import { useFiles } from "../files.tsx";
import { useAnnouncer } from "../shell/announcer.tsx";
import {
  pickCommand,
  readAgainCommand,
  shownOptions,
} from "../steps/variants/commands.ts";
import { ReadingTime } from "../steps/variants/ReadingTime.tsx";
import { createVcfOptions } from "../steps/variants/vcfOptions.ts";
import {
  ONLY_PASSED_LABEL,
  PICKER_ENDINGS,
  PLOIDY_LABEL,
  formatOfName,
  ploidyRefusedText,
} from "../steps/variants/words.ts";
import { useAppState, useStore } from "../store.tsx";
import { Checkbox } from "../widgets/Checkbox.tsx";
import { FileZone } from "../widgets/FileZone.tsx";
import { NumberField } from "../widgets/NumberField.tsx";
import { Problem } from "../widgets/Problem.tsx";
import styles from "./Variants.module.css";
import {
  DROP_HINT,
  FOLDER_DROPPED,
  OPEN_ANOTHER_LABEL,
  OPEN_LABEL,
  PASTE_LABEL,
  PLOIDY_DESCRIPTION,
  SEVERAL_DROPPED,
  TEXT_DROPPED,
  VCF_OPTIONS_HEADING,
  notOpenedText,
} from "./words.ts";

/** What the page says of a drop, or a paste, that is not of one file. */
const NOT_FILES_WORDS = {
  folder: FOLDER_DROPPED,
  text: TEXT_DROPPED,
  several: SEVERAL_DROPPED,
} as const;

/** The words of a file the page did not open, with the load that was
    open when they were said, by its id, or `null` with none. */
interface Refusal {
  readonly text: string;
  readonly forLoad: string | null;
}

/** The section that opens the variants file. */
export function OpenVariants(): React.JSX.Element {
  const store = useStore();
  const files = useFiles();
  const announcer = useAnnouncer();
  const variants = useAppState((s) => s.project.variants);
  const reason = useAppState((s) => variantsOpenNeeds(s.project));
  const heading = useId();
  const optionsHeading = useId();

  // The options of the next VCF, the Variants step's (vcfOptions.ts).
  const [vcfOptions] = useState(() => createVcfOptions(store));
  const edited = useSyncExternalStore(
    vcfOptions.subscribe,
    vcfOptions.getEdited,
  );
  const options = useAppState((s) => shownOptions(edited, s.project));
  const commitPloidy = useRef<(() => void) | null>(null);

  // The words of a file not opened, until the next opening, or until the
  // load they were said beside is no longer the project's.
  const [refusal, setRefusal] = useState<Refusal | null>(null);
  const forLoad = variants?.fileId ?? null;
  const refusalText =
    refusal !== null && refusal.forLoad === forLoad ? refusal.text : null;

  const refuse = (text: string): void => {
    setRefusal({
      text,
      forLoad: store.getState().project.variants?.fileId ?? null,
    });
    // The focus stays on the button, so a screen reader would not read
    // the words by themselves.
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
      refuse(notOpenedText(file.name));
      return;
    }
    setRefusal(null);
    // A number still being typed in the ploidy is committed first: a
    // file dropped from the desktop leaves the focus in the field.
    commitPloidy.current?.();
    const readOptions = format === "vcf" ? vcfOptions.shown() : null;
    const load: VariantLoad = {
      fileId: files.addFile(file),
      name: file.name,
      size: file.size,
      format,
      readOptions,
    };
    vcfOptions.load(pickCommand(load));
  };

  /** The options changed to `next`: an open VCF is read again with them,
      the same file under a new load; otherwise they wait for the next
      VCF. */
  const change = (next: VcfReadOptions): void => {
    const open = store.getState().project.variants;
    const file = open === null ? null : files.fileOf(open.fileId);
    if (open?.format !== "vcf" || file === null) {
      vcfOptions.edit(next);
      return;
    }
    setRefusal(null);
    vcfOptions.load(
      readAgainCommand({
        fileId: files.addFile(file),
        name: open.name,
        size: open.size,
        format: "vcf",
        readOptions: next,
      }),
    );
  };

  const reading = variants?.read.kind === "pending";
  const failed = variants?.read.kind === "failed";

  return (
    <section aria-labelledby={heading} className={classOf(styles, "section")}>
      <h2 id={heading} className={classOf(styles, "heading")}>
        Variants file
      </h2>
      <FileZone
        pasteLabel={PASTE_LABEL}
        buttonLabel={variants === null ? OPEN_LABEL : OPEN_ANOTHER_LABEL}
        accept={PICKER_ENDINGS}
        onFiles={onFiles}
        onNotFiles={(dropped) => {
          refuse(NOT_FILES_WORDS[dropped]);
        }}
      >
        {variants === null && (
          <p className={classOf(styles, "muted")}>{DROP_HINT}</p>
        )}
        {reading && reason !== null && (
          <p className={classOf(styles, "line")}>
            {reason}{" "}
            <ReadingTime
              key={variants.fileId}
              className={classOf(styles, "muted")}
            />
          </p>
        )}
      </FileZone>
      {refusalText !== null && <Problem>{refusalText}</Problem>}
      {failed && reason !== null && <Problem>{reason}</Problem>}

      <section
        aria-labelledby={optionsHeading}
        className={classOf(styles, "options")}
      >
        <h3 id={optionsHeading} className={classOf(styles, "subheading")}>
          {VCF_OPTIONS_HEADING}
        </h3>
        <NumberField
          label={PLOIDY_LABEL}
          value={options.ploidy}
          minValue={1}
          maxValue={MAX_PLOIDY}
          step={1}
          description={PLOIDY_DESCRIPTION}
          refusedText={ploidyRefusedText}
          onRefused={(text) => {
            announcer.announce(text);
          }}
          onCommitReady={(commit) => {
            commitPloidy.current = commit;
          }}
          onChange={(ploidy) => {
            change({ ...vcfOptions.shown(), ploidy });
          }}
        />
        <Checkbox
          label={ONLY_PASSED_LABEL}
          isSelected={options.onlyPassed}
          onChange={(onlyPassed) => {
            change({ ...vcfOptions.shown(), onlyPassed });
          }}
        />
      </section>
    </section>
  );
}
