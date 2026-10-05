/**
 * The opening of the variants file on popgen2.html
 * (docs/plans/open-variants.md, "Two widgets"): first the two options a
 * VCF is read with, the ploidy and the passed variants, since they apply
 * before a file is opened, and whose change reads an open VCF again;
 * then the button "Open a variants file…" in a zone that also takes a
 * dropped or pasted file, with one line on the file open, being read or
 * not opened; and below it what went wrong with an opening: a file
 * refused by its name, several files at once, a file popnei could not
 * read. It reads the project from the store and sends it the commands of
 * the Variants step; what it holds itself is the options the user last
 * set, kept when a `.nei` file is opened, and the words of a file it did
 * not open.
 */
import { useId, useRef, useState } from "react";

import { MAX_PLOIDY, escaped, variantsOpenNeeds } from "../../core/project.ts";
import type { VariantLoad } from "../../core/project.ts";
import type { VcfReadOptions } from "../../worker/protocol.ts";
import { classOf } from "../classOf.ts";
import { useFiles } from "../files.tsx";
import { useAnnouncer } from "../shell/announcer.tsx";
import { pickCommand, readAgainCommand } from "../steps/variants/commands.ts";
import { ReadingTime } from "../steps/variants/ReadingTime.tsx";
import {
  DEFAULT_READ_OPTIONS,
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
  openLine,
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

/** What the opening is drawn with. */
export interface OpenVariantsProps {
  /** The element of the open button, for the page to move the focus to
      it when the summary goes. */
  readonly buttonRef: React.RefObject<HTMLButtonElement | null>;
}

/** The section that opens the variants file. */
export function OpenVariants({
  buttonRef,
}: OpenVariantsProps): React.JSX.Element {
  const store = useStore();
  const files = useFiles();
  const announcer = useAnnouncer();
  const variants = useAppState((s) => s.project.variants);
  const reason = useAppState((s) => variantsOpenNeeds(s.project));
  const heading = useId();
  const optionsHeading = useId();

  // The options the user last set, for the next VCF and for a VCF open;
  // a .nei file opened keeps them, since it has its own ploidy. The ref
  // holds them at once for a pick made in the same moment as a commit.
  const [options, setOptions] = useState<VcfReadOptions>(DEFAULT_READ_OPTIONS);
  const optionsNow = useRef(options);
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
    // A number still being typed in the ploidy is committed first, which
    // reads an open VCF again before the new file replaces it: a file
    // dropped from the desktop leaves the focus in the field.
    commitPloidy.current?.();
    const load: VariantLoad = {
      fileId: files.addFile(file),
      name: file.name,
      size: file.size,
      format,
      readOptions: format === "vcf" ? optionsNow.current : null,
    };
    const step = pickCommand(load);
    store.apply(step.description, step.command);
  };

  /** The options changed to `next`: kept for the next VCF, and an open
      VCF is read again with them, the same file under a new load. */
  const change = (next: VcfReadOptions): void => {
    optionsNow.current = next;
    setOptions(next);
    const open = store.getState().project.variants;
    const file = open === null ? null : files.fileOf(open.fileId);
    if (open?.format !== "vcf" || file === null) return;
    setRefusal(null);
    const step = readAgainCommand({
      fileId: files.addFile(file),
      name: open.name,
      size: open.size,
      format: "vcf",
      readOptions: next,
    });
    store.apply(step.description, step.command);
  };

  const failed = variants?.read.kind === "failed";

  return (
    <section aria-labelledby={heading} className={classOf(styles, "section")}>
      <h2 id={heading} className={classOf(styles, "heading")}>
        Variants file
      </h2>

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
            change({ ...optionsNow.current, ploidy });
          }}
        />
        <Checkbox
          label={ONLY_PASSED_LABEL}
          isSelected={options.onlyPassed}
          onChange={(onlyPassed) => {
            change({ ...optionsNow.current, onlyPassed });
          }}
        />
      </section>

      <FileZone
        pasteLabel={PASTE_LABEL}
        buttonLabel={variants === null ? OPEN_LABEL : OPEN_ANOTHER_LABEL}
        accept={PICKER_ENDINGS}
        onFiles={onFiles}
        onNotFiles={(dropped) => {
          refuse(NOT_FILES_WORDS[dropped]);
        }}
        buttonRef={buttonRef}
      >
        {/* One line in every state, so that a read that starts, at a
            commit of the ploidy as the focus leaves it, does not move the
            button under a click. */}
        <p className={classOf(styles, "line")}>
          {variants === null ? (
            <span className={classOf(styles, "mutedText")}>{DROP_HINT}</span>
          ) : variants.read.kind === "pending" ? (
            <>
              {`Reading ${escaped(variants.name)}.`}{" "}
              <ReadingTime
                key={variants.fileId}
                className={classOf(styles, "mutedText")}
              />
            </>
          ) : (
            openLine(variants)
          )}
        </p>
      </FileZone>
      {refusalText !== null && <Problem>{refusalText}</Problem>}
      {failed && reason !== null && <Problem>{reason}</Problem>}
    </section>
  );
}
