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
 * the paste is marked `aria-disabled` and described by the reason, with
 * no tooltip, since it is drawn nowhere; and a file dropped, pasted, or
 * picked in a picker opened before the zone waited, opens nothing: its
 * name is given to the `onRefused` of `waiting`, which says it was not
 * opened; a folder or a piece of text goes to `onNotFiles`, as when the
 * zone does not wait, since it would not open after the wait either.
 * The drop is still taken by the zone, so that the browser does not
 * open the file dropped in the tab in place of the page. The picker
 * is opened from an input of the zone's own, and not from React Aria's
 * `FileTrigger`, whose press reaches the button through a context that a
 * button that waits cannot refuse.
 *
 * A zone may also have no button and no frame, `buttonLabel` `null`, as
 * the box of a file open on popgen2.html is since 16 October 2026
 * (docs/plans/file-buttons.md): what it holds takes a dropped or pasted
 * file, by the same path as a zone with a button, and the button that
 * picks a file is elsewhere, in the file's tab.
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

/** Why a zone waits, and what it does with a file it then refuses. */
export interface ZoneWaiting {
  /** The reason the zone waits, its button's tooltip and the
      description of its two buttons. */
  readonly reason: string;
  /** Called for files dropped or pasted while the zone waits, and for a
      file picked then in a picker opened before, which open nothing:
      with the name of the one file, or `null` for several. A folder or a
      piece of text goes to `onNotFiles`, as when the zone does not
      wait. */
  readonly onRefused: (name: string | null) => void;
}

/** What a zone to load a file is drawn with: what every zone is drawn
    with, and its button, or none. */
export type FileZoneProps = FileZoneBaseProps &
  (FileZoneButtonProps | FileZoneBareProps);

/** What a zone with the button that opens the file picker is drawn
    with. */
export interface FileZoneButtonProps {
  /** The words of the button that opens the file picker. */
  readonly buttonLabel: string;
  /** The endings the file picker offers first, `.vcf`. */
  readonly accept: readonly string[];
  /** The element of the button, for a screen that moves the focus to it. */
  readonly buttonRef?: React.Ref<HTMLButtonElement>;
  /** What can be done with the file, after the button. */
  readonly actions?: React.ReactNode;
}

/** A zone with no button and no frame, around what it holds, which a
    file is dropped or pasted on. */
export interface FileZoneBareProps {
  readonly buttonLabel: null;
  readonly accept?: never;
  readonly buttonRef?: never;
  readonly actions?: never;
}

/** What every zone is drawn with. */
interface FileZoneBaseProps {
  /** The name of the zone's hidden button that takes a pasted file,
      "Paste a variants file". */
  readonly pasteLabel: string;
  /** Called with the files picked, dropped or pasted, of which there may
      be several when they are dropped or pasted. */
  readonly onFiles: (files: readonly File[]) => void;
  /** Called for a drop or a paste that is not of files alone: a folder, a
      piece of text, or several things one of which is not a file; nothing
      is then given to `onFiles`. React Aria gives a paste as a drop, so
      the two cannot be told apart. */
  readonly onNotFiles: (dropped: Exclude<Dropped, "files" | "nothing">) => void;
  /** What the zone shows of the file, before the button. */
  readonly children?: React.ReactNode;
  /** Why the zone waits, while it opens no file, and what it does with a
      file refused; or `null`, when it does not wait. `null` when
      absent. */
  readonly waiting?: ZoneWaiting | null;
}

/** The name of the one file of `names`, or `null` for none or
    several. */
function oneName(names: readonly string[]): string | null {
  const [only, ...others] = names;
  return only !== undefined && others.length === 0 ? only : null;
}

/** A zone to drop a file on, with the button that picks one, or with
    none. */
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
}: FileZoneProps): React.JSX.Element {
  const zoneRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reasonId = useId();
  const waits = waiting !== null;
  // Whether the zone waits at the latest drawing, read when a file
  // arrives after it: a drop whose files are still being read, a pick
  // in a picker opened before the zone waited.
  const waitingNow = useRef<ZoneWaiting | null>(waiting);
  // The hidden button of the paste is React Aria's, drawn by the zone:
  // its marks are put on it by hand, after each drawing, React Aria
  // setting neither.
  useLayoutEffect(() => {
    waitingNow.current = waiting;
    const zone = zoneRef.current;
    if (zone === null) return;
    const paste = pasteButtonOf(zone, pasteLabel);
    ariaDisabledRef(waits)(paste);
    const describedBy = describedByOf(waits ? reasonId : undefined);
    if (describedBy === undefined) paste.removeAttribute("aria-describedby");
    else paste.setAttribute("aria-describedby", describedBy);
  });
  // Files that arrive while the zone waits are refused by their names;
  // otherwise opened.
  const take = (files: readonly File[]): void => {
    const refusing = waitingNow.current;
    if (refusing !== null) {
      refusing.onRefused(oneName(files.map((file) => file.name)));
    } else if (files.length > 0) {
      onFiles(files);
    }
  };
  const onDrop = (event: { readonly items: readonly DropItem[] }): void => {
    const dropped = droppedOf(event.items.map((item) => item.kind));
    if (dropped !== "files") {
      if (dropped !== "nothing") onNotFiles(dropped);
      return;
    }
    if (waiting !== null) {
      waiting.onRefused(
        oneName(
          event.items.flatMap((item) =>
            item.kind === "file" ? [item.name] : [],
          ),
        ),
      );
      return;
    }
    const reads: Promise<File>[] = [];
    for (const item of event.items) {
      if (item.kind === "file") reads.push(item.getFile());
    }
    // A rejection reaches the window's handler and the error bar.
    void Promise.all(reads).then(take);
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
      className={classOf(styles, buttonLabel === null ? "bare" : "zone")}
      onDrop={onDrop}
    >
      {/* The label slot of the zone, empty: React Aria names its hidden
          button by its aria-label and this slot, and with no slot drawn
          it writes an empty aria-labelledby, which names nothing. Empty,
          it adds nothing to the name, "Paste a variants file". */}
      <Text slot="label" />
      {waiting !== null && (
        <span id={reasonId} hidden>
          {waiting.reason}
        </span>
      )}
      <div className={classOf(styles, "content")}>{children}</div>
      {buttonLabel !== null && (
        <div className={classOf(styles, "buttons")}>
          <Button
            label={buttonLabel}
            onPress={openPicker}
            waiting={waiting?.reason ?? null}
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
              if (list !== null && list.length > 0) take(Array.from(list));
            }}
          />
          {actions}
        </div>
      )}
    </DropZone>
  );
}

/** The hidden button of React Aria's zone `zone`, which takes a paste:
    the button of the zone's first element, which React Aria draws before
    what the zone is given. A defect when it is not there, or not named
    `pasteLabel`, so that the marks of a zone that waits never land on
    another button if React Aria draws its zone otherwise. */
function pasteButtonOf(zone: HTMLElement, pasteLabel: string): HTMLElement {
  const paste = zone.firstElementChild?.querySelector(":scope > button");
  if (
    !(paste instanceof HTMLElement) ||
    paste.getAttribute("aria-label") !== pasteLabel
  ) {
    throw new Error(
      `popnei_web defect: React Aria's zone "${pasteLabel}" has no hidden button of the paste as its first element.`,
    );
  }
  return paste;
}
