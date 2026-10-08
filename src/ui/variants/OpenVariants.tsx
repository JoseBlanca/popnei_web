/**
 * The opening of the variants file on popgen2.html
 * (docs/plans/open-variants.md, "Round 3"; the owner's decision of 6
 * October 2026): one widget, a zone that also takes a dropped or pasted
 * file, with the button "Open variants file…". A VCF is opened with no
 * ploidy, which popnei reads from the file, and with every variant,
 * whatever its FILTER column, which a filter is to choose among later;
 * so the page asks nothing of how a file is read. The words of a file it
 * did not open go to the page, which shows them in the box of the file
 * above the zone.
 *
 * It reads the project from the store and opens the file as a new history,
 * with nothing to undo (`openVariantsFile` of popgen2Store.ts), since the
 * page's Undo serves the changes of the filters alone.
 */
import type { VariantLoad } from "../../core/project.ts";
import type { VcfReadOptions } from "../../worker/protocol.ts";
import { classOf } from "../classOf.ts";
import { useFiles } from "../files.tsx";
import { openVariantsFile } from "../popgen2Store.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { PICKER_ENDINGS, formatOfName } from "../steps/variants/words.ts";
import { useAppState, useStore } from "../store.tsx";
import { FileZone } from "../widgets/FileZone.tsx";
import styles from "./Variants.module.css";
import {
  FOLDER_DROPPED,
  OPEN_ANOTHER_LABEL,
  OPEN_LABEL,
  OPENING_NAME,
  PASTE_LABEL,
  SEVERAL_DROPPED,
  TEXT_DROPPED,
  notOpenedText,
} from "./words.ts";

/** How the page reads a VCF: with the ploidy popnei reads from the file,
    and every variant, whatever its FILTER column. */
const READ_OPTIONS: VcfReadOptions = Object.freeze({
  ploidy: null,
  onlyPassed: false,
});

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
      opening makes them out of date. */
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
    const load: VariantLoad = {
      fileId: files.addFile(file),
      name: file.name,
      size: file.size,
      format,
      readOptions: format === "vcf" ? READ_OPTIONS : null,
    };
    openVariantsFile(store, load);
  };

  return (
    <section aria-label={OPENING_NAME} className={classOf(styles, "section")}>
      <FileZone
        pasteLabel={PASTE_LABEL}
        buttonLabel={variants === null ? OPEN_LABEL : OPEN_ANOTHER_LABEL}
        accept={PICKER_ENDINGS}
        onFiles={onFiles}
        onNotFiles={(dropped) => {
          refuse(NOT_FILES_WORDS[dropped]);
        }}
        buttonRef={buttonRef}
      />
    </section>
  );
}
