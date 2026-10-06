/**
 * The opening of the variants file on popgen2.html
 * (docs/plans/open-variants.md, "Two widgets"; the owner's layouts of 6
 * October 2026): one widget, a zone that also takes a dropped or pasted
 * file, with the button "Open variants file…" and, on its row, the
 * default ploidy a VCF is read with; under them the box of the passed
 * variants. The two options apply before a file is opened, and their
 * change reads an open VCF again. Below the zone, a ploidy the field
 * refused. The words of a file it did not open go to the page, which
 * shows them in the box of the file above the zone.
 *
 * Nothing above or beside the button and the box of the passed variants
 * may move as the ploidy field loses the focus, or the press that takes
 * the focus from it would be lost: the box of the file above them
 * changes when the file is read again. So a change of the options made
 * during a press of the pointer on the widget reads the file again once
 * the press, and the click it gives, have ended.
 *
 * It reads the project from the store and sends it the commands of the
 * Variants step; what it holds itself is the options the user last set,
 * kept when a `.nei` file is opened.
 */
import { useRef, useState } from "react";

import { MAX_PLOIDY } from "../../core/project.ts";
import type { VariantLoad } from "../../core/project.ts";
import type { VcfReadOptions } from "../../worker/protocol.ts";
import { classOf } from "../classOf.ts";
import { useFiles } from "../files.tsx";
import { useAnnouncer } from "../shell/announcer.tsx";
import { pickCommand, readAgainCommand } from "../steps/variants/commands.ts";
import {
  DEFAULT_READ_OPTIONS,
  ONLY_PASSED_LABEL,
  PICKER_ENDINGS,
  formatOfName,
  ploidyRefusedText,
} from "../steps/variants/words.ts";
import { useAppState, useStore } from "../store.tsx";
import { Checkbox } from "../widgets/Checkbox.tsx";
import { FileZone } from "../widgets/FileZone.tsx";
import { NumberField } from "../widgets/NumberField.tsx";
import styles from "./Variants.module.css";
import {
  DEFAULT_PLOIDY_LABEL,
  FOLDER_DROPPED,
  OPEN_ANOTHER_LABEL,
  OPEN_LABEL,
  OPENING_NAME,
  PASTE_LABEL,
  SEVERAL_DROPPED,
  TEXT_DROPPED,
  notOpenedText,
} from "./words.ts";

/** What the page says of a drop, or a paste, that is not of one file. */
const NOT_FILES_WORDS = {
  folder: FOLDER_DROPPED,
  text: TEXT_DROPPED,
  several: SEVERAL_DROPPED,
} as const;

/** The words of a file the page did not open, with the load that was
    open when they were said, by its id, or `null` with none: they are
    shown until the next opening, or until that load is no longer the
    project's. */
export interface Refusal {
  readonly text: string;
  readonly forLoad: string | null;
}

/** What the opening is drawn with. */
export interface OpenVariantsProps {
  /** The element of the open button, for the page to move the focus to
      it when the summary goes. */
  readonly buttonRef: React.RefObject<HTMLButtonElement | null>;
  /** Called with the words of a file not opened, and with `null` when an
      opening or a new read makes them out of date. */
  readonly onRefusal: (refusal: Refusal | null) => void;
}

/** The section that opens the variants file. */
export function OpenVariants({
  buttonRef,
  onRefusal,
}: OpenVariantsProps): React.JSX.Element {
  const store = useStore();
  const files = useFiles();
  const announcer = useAnnouncer();
  const variants = useAppState((s) => s.project.variants);

  // The options the user last set, for the next VCF and for a VCF open;
  // a .nei file opened keeps them, since it has its own ploidy. The ref
  // holds them at once for a pick made in the same moment as a commit.
  const [options, setOptions] = useState<VcfReadOptions>(DEFAULT_READ_OPTIONS);
  const optionsNow = useRef(options);
  const commitPloidy = useRef<(() => void) | null>(null);
  // Whether a new file is being opened: a ploidy committed then is kept
  // for it, and the file open before is not read again.
  const opening = useRef(false);

  // Whether a press of the pointer that started on the widget has not
  // yet ended, and whether the options changed during it.
  const pressing = useRef(false);
  const changedInPress = useRef(false);

  // The element the line of a ploidy refused is drawn into, once drawn.
  const [ploidyRefusedIn, setPloidyRefusedIn] = useState<HTMLElement | null>(
    null,
  );

  const refuse = (text: string): void => {
    onRefusal({
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
    onRefusal(null);
    // A number still being typed in the ploidy is committed first, for
    // the new file, since a file dropped from the desktop leaves the
    // focus in the field; the file it replaces is not read again, nor
    // after a press.
    opening.current = true;
    try {
      commitPloidy.current?.();
    } finally {
      opening.current = false;
    }
    changedInPress.current = false;
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

  /** An open VCF read again with the options the user last set, the same
      file under a new load. */
  const readAgain = (): void => {
    const open = store.getState().project.variants;
    const file = open === null ? null : files.fileOf(open.fileId);
    if (open?.format !== "vcf" || file === null) return;
    onRefusal(null);
    const step = readAgainCommand({
      fileId: files.addFile(file),
      name: open.name,
      size: open.size,
      format: "vcf",
      readOptions: optionsNow.current,
    });
    store.apply(step.description, step.command);
  };

  /** The options changed to `next`: kept for the next VCF, and an open
      VCF is read again with them, unless a new file is being opened; at
      once, or, during a press, once it has ended. */
  const change = (next: VcfReadOptions): void => {
    optionsNow.current = next;
    setOptions(next);
    if (opening.current) return;
    if (pressing.current) {
      changedInPress.current = true;
      return;
    }
    readAgain();
  };

  /** A press of the pointer starts on the widget, before the field loses
      the focus to it. It ends with the task after the pointer is
      released, which gives the click first; or when the browser cancels
      it. Then the file is read again if the options changed during it, a
      ploidy committed, the box ticked. */
  const pressStarts = (): void => {
    if (pressing.current) return;
    pressing.current = true;
    const ends = (): void => {
      window.removeEventListener("pointerup", ends, true);
      window.removeEventListener("pointercancel", ends, true);
      setTimeout(() => {
        pressing.current = false;
        if (changedInPress.current) {
          changedInPress.current = false;
          readAgain();
        }
      });
    };
    window.addEventListener("pointerup", ends, true);
    window.addEventListener("pointercancel", ends, true);
  };

  return (
    <section
      aria-label={OPENING_NAME}
      className={classOf(styles, "section")}
      onPointerDownCapture={pressStarts}
    >
      <FileZone
        pasteLabel={PASTE_LABEL}
        buttonLabel={variants === null ? OPEN_LABEL : OPEN_ANOTHER_LABEL}
        accept={PICKER_ENDINGS}
        onFiles={onFiles}
        onNotFiles={(dropped) => {
          refuse(NOT_FILES_WORDS[dropped]);
        }}
        buttonRef={buttonRef}
        actions={
          <NumberField
            label={DEFAULT_PLOIDY_LABEL}
            value={options.ploidy}
            minValue={1}
            maxValue={MAX_PLOIDY}
            step={1}
            inline
            refusedText={ploidyRefusedText}
            refusedIn={ploidyRefusedIn}
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
        }
        status={
          <Checkbox
            label={ONLY_PASSED_LABEL}
            isSelected={options.onlyPassed}
            onChange={(onlyPassed) => {
              change({ ...optionsNow.current, onlyPassed });
            }}
          />
        }
      />
      {/* The line of a ploidy refused, drawn here and not under the
          field, where, appearing as the field loses the focus to a click
          on the box or the button, it would move them from under it. */}
      <div ref={setPloidyRefusedIn} className={classOf(styles, "slot")} />
    </section>
  );
}
