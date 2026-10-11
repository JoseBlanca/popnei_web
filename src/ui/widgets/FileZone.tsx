/**
 * A zone to load a file: React Aria's `DropZone` holding the button that
 * opens the file picker of the system (react.md, "Widgets: React Aria,
 * wrapped once"). A file is dropped on the zone, or picked with the
 * button, since dropping a file cannot be done with a keyboard. What the
 * screen shows of the file goes in the zone, before the button, and what
 * can be done with it, a Remove, after; the button is the same element
 * whatever the zone holds, and whether the zone waits or not, so that the
 * focus stays on it after a pick and through a wait.
 *
 * React Aria's zone also holds a button of its own, hidden, which takes a
 * file pasted into it; it comes first in the order of the Tab key, and
 * `pasteLabel` names it.
 *
 * A zone may wait, with its reason, as the zone of the individuals file
 * of popgen2.html does while the diversity runs
 * (docs/specs/steps/popgen2-input.md, "While the diversity runs"): its
 * button is greyed, marked `aria-disabled`, with the reason as its
 * tooltip and its description, and opens no picker; the hidden button of
 * the paste is marked `aria-disabled` and described by the reason; and a
 * file dropped or pasted opens nothing and is given to `onWaitingDrop`,
 * which shows the reason. The drop is still taken by the zone, so that
 * the browser does not open the file dropped in the tab in place of the
 * page. The picker is opened from an input of the zone's own, and not
 * from React Aria's `FileTrigger`, whose press reaches the button through
 * a context that a button that waits cannot refuse.
 */
import { useId, useLayoutEffect, useRef } from "react";
import { DropZone, Text } from "react-aria-components";
import type { DropItem } from "react-aria-components";

import { classOf } from "../classOf.ts";
import { Button } from "./Button.tsx";
import { droppedOf } from "./dropped.ts";
import type { Dropped } from "./dropped.ts";
import styles from "./FileZone.module.css";
import { ariaDisabledRef, describedByOf } from "./waiting.ts";

/** What a zone to load a file is drawn with. */
export interface FileZoneProps {
  /** The name of the zone's hidden button that takes a pasted file,
      "Paste a variants file". */
  readonly pasteLabel: string;
  /** The words of the button that opens the file picker. */
  readonly buttonLabel: string;
  /** The endings the file picker offers first, `.vcf`. */
  readonly accept: readonly string[];
  /** Called with the files picked, dropped or pasted, of which there may
      be several when they are dropped or pasted. */
  readonly onFiles: (files: readonly File[]) => void;
  /** Called for a drop or a paste that is not of files alone: a folder, a
      piece of text, or several things one of which is not a file; nothing
      is then given to `onFiles`. React Aria gives a paste as a drop, so
      the two cannot be told apart. */
  readonly onNotFiles: (dropped: Exclude<Dropped, "files" | "nothing">) => void;
  /** The element of the button, for a screen that moves the focus to it. */
  readonly buttonRef?: React.Ref<HTMLButtonElement>;
  /** What the zone shows of the file, before the button. */
  readonly children?: React.ReactNode;
  /** What can be done with the file, after the button. */
  readonly actions?: React.ReactNode;
  /** The reason the zone waits, while it opens no file; or `null`, when
      it does not wait. `null` when absent. */
  readonly waiting?: string | null;
  /** Called for a file, or anything else, dropped or pasted while the
      zone waits, which opens nothing; given with `waiting`. */
  readonly onWaitingDrop?: () => void;
}

/** A zone to drop a file on, with the button that picks one. */
export function FileZone({
  pasteLabel,
  buttonLabel,
  accept,
  onFiles,
  onNotFiles,
  buttonRef,
  children,
  actions,
  waiting = null,
  onWaitingDrop,
}: FileZoneProps): React.JSX.Element {
  const zoneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reasonId = useId();
  const waits = waiting !== null;
  // The hidden button of the paste is React Aria's, drawn by the zone:
  // its marks are put on it by hand, after each drawing, React Aria
  // setting neither.
  useLayoutEffect(() => {
    const paste = zoneRef.current?.querySelector("button") ?? null;
    if (paste === null) return;
    ariaDisabledRef(waits)(paste);
    const describedBy = describedByOf(waits ? reasonId : undefined);
    if (describedBy === undefined) paste.removeAttribute("aria-describedby");
    else paste.setAttribute("aria-describedby", describedBy);
  });
  const onDrop = (event: { readonly items: readonly DropItem[] }): void => {
    if (waits) {
      onWaitingDrop?.();
      return;
    }
    const dropped = droppedOf(event.items.map((item) => item.kind));
    if (dropped !== "files") {
      if (dropped !== "nothing") onNotFiles(dropped);
      return;
    }
    const reads: Promise<File>[] = [];
    for (const item of event.items) {
      if (item.kind === "file") reads.push(item.getFile());
    }
    // A rejection reaches the window's handler and the error bar.
    void Promise.all(reads).then((files) => {
      if (files.length > 0) onFiles(files);
    });
  };
  const openPicker = (): void => {
    const input = inputRef.current;
    if (input === null) return;
    // The same file picked again is a change, and opens it again.
    input.value = "";
    input.click();
  };
  return (
    <DropZone
      ref={zoneRef}
      aria-label={pasteLabel}
      className={classOf(styles, "zone")}
      onDrop={onDrop}
    >
      {/* The label slot of the zone, empty: React Aria names its hidden
          button by its aria-label and this slot, and with no slot drawn
          it writes an empty aria-labelledby, which names nothing. Empty,
          it adds nothing to the name, "Paste a variants file". */}
      <Text slot="label" />
      {waits && (
        <span id={reasonId} hidden>
          {waiting}
        </span>
      )}
      <div className={classOf(styles, "content")}>{children}</div>
      <div className={classOf(styles, "buttons")}>
        <Button
          label={buttonLabel}
          onPress={openPicker}
          waiting={waiting}
          {...(buttonRef !== undefined && { ref: buttonRef })}
        />
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={accept.join(",")}
          // The click the button gives the input is not a click on the
          // zone, which would move the focus to its hidden button.
          onClick={(event) => {
            event.stopPropagation();
          }}
          onChange={(event) => {
            const list = event.currentTarget.files;
            const files = list === null ? [] : Array.from(list);
            if (files.length > 0) onFiles(files);
          }}
        />
        {actions}
      </div>
    </DropZone>
  );
}
