/**
 * The download of the filtered variants on popgen2.html, at the end of
 * the Individuals part of the statistics of the file
 * (docs/specs/steps/popgen2-download.md): the button "Download filtered
 * variants…", disabled with its reason until the one pass is finished;
 * its dialog, with the choice of the format, then the bar of the write
 * and Stop, or the words of a failure and Close; and, when the write ends
 * with a file, the browser's download started by itself and, in place of
 * the button, the text that says what was downloaded and what each
 * filter removed, with "Save it again". When there is nothing to
 * download, a sentence takes the place of the button. What takes that
 * place is `downloadPlace` of downloadState.ts, from the store.
 *
 * The dialog is modal, so no filter can change while a file is written.
 * Escape does nothing while it writes, so that a key pressed by habit
 * does not throw away minutes of writing. When the dialog closes after
 * Cancel, Escape, Stop or Close, React Aria gives the focus back to the
 * button; after a download, or a write of no variant, the button is gone,
 * and the page moves the focus to what took its place once the dialog
 * has gone from the page, since a focus put on the page while it closes
 * is pulled back into it.
 */
import { useRef, useState } from "react";

import { writtenName } from "../../core/fileNames.ts";
import type { WriteFormat } from "../../core/keys.ts";
import type { WriteStatus } from "../../core/store.ts";
import type { Progress } from "../../worker/protocol.ts";
import { progressShare } from "../analyses/words.ts";
import { classOf } from "../classOf.ts";
import { downloadFile } from "../download.ts";
import { startWriting } from "../runs.ts";
import { useRunSeconds } from "../runSeconds.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { useAppState, useStore } from "../store.tsx";
import { Button } from "../widgets/Button.tsx";
import { Dialog } from "../widgets/Dialog.tsx";
import { whenNoDialog } from "../widgets/dialogMark.ts";
import { ProgressBar } from "../widgets/ProgressBar.tsx";
import { RadioGroup } from "../widgets/RadioGroup.tsx";
import styles from "./DownloadVariants.module.css";
import { downloadPlace, endOfWrite, saveAgain } from "./downloadState.ts";
import type { WriteEnd } from "./downloadState.ts";
import {
  DIALOG_HEADING,
  DOWNLOAD_LABEL,
  FORMAT_ITEMS,
  FORMAT_LABEL,
  SAVE_AGAIN_LABEL,
  SAVE_IT_LABEL,
  stoppedText,
  writeFailedText,
  writingBarLabel,
  writingLine,
} from "./downloadWords.ts";
import { summaryStatus } from "./words.ts";

/** The format chosen last in the dialog, which it opens on, for as long
    as the page is open: the VCF the first time, since most programs read
    it. The page's own, not the project's, and with no Undo. */
let formatChosen: WriteFormat = "vcf";

/** What the dialog shows: the choice of the format, or the write sent in
    `format`, whose state the store holds. */
type DialogPhase =
  | { readonly kind: "choose"; readonly format: WriteFormat }
  | { readonly kind: "writing"; readonly format: WriteFormat };

/** The content of the dialog, its heading and its phase. */
interface DialogContent {
  readonly title: string;
  readonly text: null;
  readonly phase: DialogPhase;
}

/** The last state of the write in flight that the dialog drew, for the
    moment between its answer and the dialog's close. */
interface LastRunning {
  readonly runId: number;
  readonly progress: Progress | null;
}

/** The download of the filtered variants: the button, or what takes its
    place, and its dialog. */
export function DownloadVariants(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const summary = useAppState(summaryStatus);
  const write = useAppState((s) => s.write);
  const project = useAppState((s) => s.project);
  const kept = useAppState((s) => s.individualsKept);
  const [phase, setPhase] = useState<DialogPhase | null>(null);
  // The text or the sentence that takes the place of the button, which
  // takes the focus after a write.
  const placeRef = useRef<HTMLParagraphElement>(null);
  // Each Download is a new attempt, and a Stop ends it, so that the end
  // of a write stopped does nothing.
  const attempt = useRef(0);

  const place = downloadPlace(summary, write, project, kept);

  const close = (): void => {
    setPhase(null);
  };

  /** Puts the focus on what took the place of the button, once the
      dialog has gone from the page. */
  const focusPlace = async (): Promise<void> => {
    await whenNoDialog(document);
    placeRef.current?.focus();
  };

  /** What the page does when the write of the attempt `mine` ends. */
  const finish = (mine: number): void => {
    if (mine !== attempt.current) return;
    let end: WriteEnd | null = null;
    try {
      end = endOfWrite(store, downloadFile);
    } finally {
      // A download that threw, a defect, closes the dialog as well: the
      // file is written, and the text in place of the button says so.
      if (end === null || end === "downloaded" || end === "noVariant") {
        close();
        void focusPlace();
      }
    }
  };

  const startDownload = (format: WriteFormat): void => {
    attempt.current += 1;
    const mine = attempt.current;
    setPhase({ kind: "writing", format });
    // Null when the store sends nothing: a refusal of popnei under the
    // same filters and format, whose words the dialog shows at once.
    const writing = startWriting(store, format);
    if (writing === null) return;
    // A defect of ours rejects it, and reaches the error bar.
    void writing.then(() => {
      finish(mine);
    });
  };

  const stop = (name: string): void => {
    attempt.current += 1;
    store.cancelWrite();
    close();
    announcer.announce(stoppedText(name));
  };

  const writingNow = phase?.kind === "writing" && write?.kind === "running";

  return (
    <div className={classOf(styles, "download")}>
      <Place
        place={place}
        placeRef={placeRef}
        onOpen={() => {
          setPhase({ kind: "choose", format: formatChosen });
        }}
        onSave={() => {
          saveAgain(store, downloadFile);
        }}
      />
      <Dialog
        content={
          phase === null ? null : { title: DIALOG_HEADING, text: null, phase }
        }
        onClose={close}
        escapeCloses={!writingNow}
      >
        {(content: DialogContent) =>
          content.phase.kind === "choose" ? (
            <ChooseFormat
              format={content.phase.format}
              onFormat={(format) => {
                formatChosen = format;
                setPhase({ kind: "choose", format });
              }}
              onDownload={() => {
                startDownload(content.phase.format);
              }}
              onCancel={close}
            />
          ) : (
            <WriteShown
              write={write}
              format={content.phase.format}
              onStop={stop}
              onClose={close}
            />
          )
        }
      </Dialog>
    </div>
  );
}

/** What the place of the button is drawn with. */
interface PlaceProps {
  readonly place: ReturnType<typeof downloadPlace>;
  /** The element of the text or the sentence, which takes the focus
      after a write. */
  readonly placeRef: React.RefObject<HTMLParagraphElement | null>;
  /** Opens the dialog. */
  readonly onOpen: () => void;
  /** Save it again, or Save it. */
  readonly onSave: () => void;
}

/** The button, or what takes its place. */
function Place({
  place,
  placeRef,
  onOpen,
  onSave,
}: PlaceProps): React.JSX.Element {
  switch (place.kind) {
    case "disabled":
      return (
        <div className={classOf(styles, "button")}>
          <Button
            label={DOWNLOAD_LABEL}
            isDisabled
            description={place.reason}
          />
        </div>
      );
    case "enabled":
      return (
        <div className={classOf(styles, "button")}>
          <Button label={DOWNLOAD_LABEL} onPress={onOpen} />
        </div>
      );
    case "sentence":
      return (
        // It takes the focus from the code alone, after a write.
        <p ref={placeRef} tabIndex={-1} className={classOf(styles, "text")}>
          {place.text}
        </p>
      );
    case "file":
      return (
        <p ref={placeRef} tabIndex={-1} className={classOf(styles, "text")}>
          {place.text}{" "}
          <Button
            label={
              place.handed === "downloaded" ? SAVE_AGAIN_LABEL : SAVE_IT_LABEL
            }
            look="link"
            onPress={onSave}
          />
        </p>
      );
  }
}

/** What the choice of the format is drawn with. */
interface ChooseFormatProps {
  readonly format: WriteFormat;
  readonly onFormat: (format: WriteFormat) => void;
  readonly onDownload: () => void;
  readonly onCancel: () => void;
}

/** The format, Download and Cancel; the format chosen takes the focus. */
function ChooseFormat({
  format,
  onFormat,
  onDownload,
  onCancel,
}: ChooseFormatProps): React.JSX.Element {
  return (
    <>
      <RadioGroup
        label={FORMAT_LABEL}
        items={FORMAT_ITEMS}
        value={format}
        onChange={onFormat}
        autoFocus
      />
      <div className={classOf(styles, "buttons")}>
        <Button label="Download" onPress={onDownload} />
        <Button label="Cancel" onPress={onCancel} />
      </div>
    </>
  );
}

/** What the write in the dialog is drawn with. */
interface WriteShownProps {
  /** The store's write. */
  readonly write: WriteStatus<Blob> | null;
  /** The format sent. */
  readonly format: WriteFormat;
  /** Stops the write of the file named so. */
  readonly onStop: (name: string) => void;
  /** Closes the dialog after a failure. */
  readonly onClose: () => void;
}

/** The write: its line, its bar and Stop while it runs; the words of its
    failure and Close; and, between its answer and the dialog's close,
    the last state drawn. */
function WriteShown({
  write,
  format,
  onStop,
  onClose,
}: WriteShownProps): React.JSX.Element | null {
  const project = useAppState((s) => s.project);
  // What a render while the write ran showed, React's way of keeping a
  // value of an earlier render.
  const [last, setLast] = useState<LastRunning | null>(null);
  const name = writtenName(project, format);
  if (write?.kind === "error") {
    return (
      <>
        <p role="alert" className={classOf(styles, "failure")}>
          {writeFailedText(write.error, write.ofStatistics, project, name)}
        </p>
        <div className={classOf(styles, "buttons")}>
          <Button label="Close" onPress={onClose} autoFocus />
        </div>
      </>
    );
  }
  const running: LastRunning | null =
    write?.kind === "running"
      ? { runId: write.runId, progress: write.progress }
      : null;
  if (
    running !== null &&
    (last?.runId !== running.runId || last.progress !== running.progress)
  ) {
    setLast(running);
  }
  const shown = running ?? last;
  if (shown === null) return null;
  return (
    <>
      {/* A new request is a new clock. */}
      <Writing
        key={shown.runId}
        name={name}
        runId={shown.runId}
        progress={shown.progress}
      />
      <div className={classOf(styles, "buttons")}>
        <Button
          label="Stop"
          autoFocus
          onPress={() => {
            onStop(name);
          }}
        />
      </div>
    </>
  );
}

/** What the line and the bar of a write are drawn with. */
interface WritingProps {
  readonly name: string;
  readonly runId: number;
  readonly progress: Progress | null;
}

/** The line of the write, with the time since Download, and its bar,
    busy before popnei's first report. */
function Writing({ name, runId, progress }: WritingProps): React.JSX.Element {
  const seconds = useRunSeconds(runId);
  const share = progress === null ? null : progressShare(progress);
  return (
    <div className={classOf(styles, "writing")}>
      <p className={classOf(styles, "line")}>
        {writingLine(name, share, seconds)}
      </p>
      <ProgressBar label={writingBarLabel(name)} value={share} />
    </div>
  );
}
