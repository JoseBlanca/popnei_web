/**
 * A zone to load a file: React Aria's `DropZone` holding a `FileTrigger`
 * with its button (react.md, "Widgets: React Aria, wrapped once"). A file
 * is dropped on the zone, or picked with the button, which opens the file
 * picker of the system, since dropping a file cannot be done with a
 * keyboard. What the screen shows of the file goes in the zone, before
 * the button, or, for what a blur of a field on the button's row must not
 * move, under that row; what goes on the button's row after it, a Remove
 * or a field of how the file is read, is given as `actions`; the button
 * is the same element whatever the zone holds, so that the focus stays on
 * it after a pick.
 *
 * React Aria's zone also holds a button of its own, hidden, which takes a
 * file pasted into it; it comes first in the order of the Tab key, and
 * `pasteLabel` names it. A click on the zone where nothing takes the
 * focus gives the focus to that button, except on the button's row, where
 * it would take the focus from a field the user is typing in.
 */
import { DropZone, FileTrigger, Text } from "react-aria-components";
import type { DropItem } from "react-aria-components";

import { classOf } from "../classOf.ts";
import { Button } from "./Button.tsx";
import { droppedOf } from "./dropped.ts";
import type { Dropped } from "./dropped.ts";
import styles from "./FileZone.module.css";

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
  /** What goes on the button's row after it: a Remove, or a field of how
      the file is read. */
  readonly actions?: React.ReactNode;
  /** What goes under the button's row, which a blur of a field on that
      row must not move: a box, or a line of the file that changes height
      as the file is read. A read that starts as a field loses the focus
      to a click on the button would otherwise move the button from under
      the pointer, and the click would be lost. */
  readonly status?: React.ReactNode;
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
  status,
}: FileZoneProps): React.JSX.Element {
  const onDrop = (event: { readonly items: readonly DropItem[] }): void => {
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
  return (
    <DropZone
      aria-label={pasteLabel}
      className={classOf(styles, "zone")}
      onDrop={onDrop}
    >
      {/* The label slot of the zone, empty: React Aria names its hidden
          button by its aria-label and this slot, and with no slot drawn
          it writes an empty aria-labelledby, which names nothing. Empty,
          it adds nothing to the name, "Paste a variants file". */}
      <Text slot="label" />
      <div className={classOf(styles, "content")}>{children}</div>
      {/* A click on the row that lands on nothing taking the focus, a gap
          between the button and what follows it, goes no further than
          the row: React Aria's zone would give the focus to its hidden
          button, which shows nothing of what is then typed into it. */}
      <div
        className={classOf(styles, "buttons")}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <FileTrigger
          acceptedFileTypes={[...accept]}
          onSelect={(list) => {
            const files = list === null ? [] : Array.from(list);
            if (files.length > 0) onFiles(files);
          }}
        >
          <Button
            label={buttonLabel}
            {...(buttonRef !== undefined && { ref: buttonRef })}
          />
        </FileTrigger>
        {actions}
      </div>
      {status !== undefined && (
        <div className={classOf(styles, "content")}>{status}</div>
      )}
    </DropZone>
  );
}
