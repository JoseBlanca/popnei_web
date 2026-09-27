/**
 * The last section of the Variants step, the writing of the variants and
 * the individuals the filters keep as a `.nei` file
 * (docs/specs/steps/variants.md, "Writing the filtered variants";
 * docs/specs/analyses/writeVariants.md, "The step's part"): the button
 * that writes, with the size expected and, from 500 MB, the warning of
 * the memory of the tab; the bar and Stop while the file is written, or
 * while the statistics of each individual it waits for are calculated;
 * and Save once it is written, which hands the file to the browser.
 *
 * Write, Stop and Save are one button in one place, so the focus stays on
 * it as it changes: Save takes the focus when a write ends with the focus
 * on the button that asked for it, and stays where it is otherwise. When
 * the button goes, after a file of no variant or a refusal of popnei, or
 * turns into a disabled Write, the focus, when it was on it, moves to the
 * heading of the section. The
 * section is drawn only while the variants file is read, as the store
 * locks the writing with the reason of a file not read otherwise.
 */
import { useId, useLayoutEffect, useRef } from "react";

import { variantsKept as variantsKeptOf } from "../../../core/apps.ts";
import { writtenName } from "../../../core/fileNames.ts";
import type { WriteStatus } from "../../../core/store.ts";
import { writeEstimate } from "../../../core/writeEstimate.ts";
import type { Progress } from "../../../worker/protocol.ts";
import { progressShare } from "../../analyses/words.ts";
import { classOf } from "../../classOf.ts";
import { startWriting } from "../../runs.ts";
import { useRunSeconds } from "../../runSeconds.ts";
import { useSaving } from "../../saving.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { useAppState, useStore } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import { ProgressBar } from "../../widgets/ProgressBar.tsx";
import { Warning } from "../../widgets/Warning.tsx";
import styles from "./VariantsStep.module.css";
import { writeParts } from "./writeParts.ts";
import type { WriteButton } from "./writeParts.ts";
import {
  WRITE_HEADING,
  WRITE_LABEL,
  handedText,
  saveLabel,
  writingBarLabel,
  writingText,
} from "./writeWords.ts";

/** The one format written in this version. */
const FORMAT = "nei";

/** The section of the writing, while the variants file is read and the
    store tracks the writing. */
export function WriteSection(): React.JSX.Element | null {
  const read = useAppState((s) => s.project.variants?.read.kind === "read");
  const write = useAppState((s) => s.write);
  if (!read || write === null) return null;
  return <WriteBody write={write} />;
}

/** The parts of the section in the state `write`. */
function WriteBody({
  write,
}: {
  readonly write: WriteStatus<Blob>;
}): React.JSX.Element {
  const store = useStore();
  const saving = useSaving();
  const announcer = useAnnouncer();
  const project = useAppState((s) => s.project);
  const kept = useAppState((s) => s.individualsKept);
  const variantsKept = useAppState(variantsKeptOf);
  const headingId = useId();
  const heading = useRef<HTMLHeadingElement>(null);

  const estimate = writeEstimate(project, kept, variantsKept);
  const { message, warning, button } = writeParts(write, estimate, project);

  return (
    <section aria-labelledby={headingId} className={classOf(styles, "section")}>
      {/* It takes the focus when the button goes while it had it, and is
          not in the order of the Tab key. */}
      <h2
        id={headingId}
        ref={heading}
        tabIndex={-1}
        className={classOf(styles, "heading")}
      >
        {WRITE_HEADING}
      </h2>
      {message?.kind === "line" && (
        <p className={classOf(styles, "line")}>{message.text}</p>
      )}
      {message?.kind === "problem" && <Problem>{message.text}</Problem>}
      {warning !== null && <Warning>{warning}</Warning>}
      {button !== null && (
        <div>
          {/* A disabled button is another button, so that its cleanup
              moves the focus to the heading when the button had it, as
              when Stop of a write that waits for the statistics turns into
              Write locked by filters that keep no individual. */}
          <ActionButton
            key={
              button.kind === "write" && button.disabled
                ? "disabled"
                : "enabled"
            }
            button={button}
            onWrite={() => {
              void startWriting(store, FORMAT);
            }}
            onStop={() => {
              store.cancelWrite();
            }}
            onSave={(name) => {
              saving.saveWritten(name);
              announcer.announce(handedText(name));
            }}
            onGone={() => {
              heading.current?.focus();
            }}
          />
        </div>
      )}
      {write.kind === "running" && (
        // A new request is a new clock.
        <Writing
          key={write.runId}
          name={writtenName(project)}
          runId={write.runId}
          progress={write.progress}
          waitsForStatistics={write.waitsForStatistics}
        />
      )}
    </section>
  );
}

/** What the button of the section is drawn with. */
interface ActionButtonProps {
  /** Write, with what describes it, Stop, or Save. */
  readonly button: WriteButton;
  /** Starts the write. */
  readonly onWrite: () => void;
  /** Stops it. */
  readonly onStop: () => void;
  /** Saves the file written under its name. */
  readonly onSave: (name: string) => void;
  /** Called when the button leaves the page while it has the focus. */
  readonly onGone: () => void;
}

/** Write, Stop or Save, one button in one place. */
function ActionButton({
  button,
  onWrite,
  onStop,
  onSave,
  onGone,
}: ActionButtonProps): React.JSX.Element {
  const element = useRef<HTMLButtonElement>(null);
  // The latest onGone, for the cleanup below, which runs once.
  const gone = useRef(onGone);
  useLayoutEffect(() => {
    gone.current = onGone;
  });
  useLayoutEffect(() => {
    const node = element.current;
    return () => {
      // The cleanup of a layout effect runs while the button is still in
      // the page, so the focus is still on it when it had it.
      if (node !== null && document.activeElement === node) {
        gone.current();
      }
    };
  }, []);

  switch (button.kind) {
    case "stop":
      return <Button label="Stop" onPress={onStop} ref={element} />;
    case "save":
      return (
        <Button
          label={saveLabel(button.name, button.numBytes)}
          onPress={() => {
            onSave(button.name);
          }}
          ref={element}
        />
      );
    case "write":
      return (
        <Button
          label={WRITE_LABEL}
          onPress={onWrite}
          ref={element}
          isDisabled={button.disabled}
          description={button.description}
        />
      );
  }
}

/** What the part of a write under way is drawn with. */
interface WritingProps {
  /** The name of the file written. */
  readonly name: string;
  /** The id of its request, or of the request of the statistics it waits
      for. */
  readonly runId: number;
  /** How far that request has gone, or `null` until the worker says. */
  readonly progress: Progress | null;
  /** Whether the write waits for the statistics of each individual. */
  readonly waitsForStatistics: boolean;
}

/** The bar and the line of a write under way, with the time since its
    request started. */
function Writing({
  name,
  runId,
  progress,
  waitsForStatistics,
}: WritingProps): React.JSX.Element {
  const afterStop = useAppState(
    (s) => s.runs.find((r) => r.runId === runId)?.afterStop ?? false,
  );
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  const seconds = useRunSeconds(runId);
  const share = progress === null ? null : progressShare(progress);
  return (
    <div className={classOf(styles, "running")}>
      <ProgressBar
        label={writingBarLabel(name, waitsForStatistics)}
        value={share}
      />
      <p className={classOf(styles, "line")}>
        {writingText({
          name,
          waitsForStatistics,
          share,
          seconds,
          waitingFor: afterStop ? variantsName : null,
        })}
      </p>
    </div>
  );
}
