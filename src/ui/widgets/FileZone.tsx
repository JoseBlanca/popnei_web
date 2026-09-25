/**
 * A zone to load a file: React Aria's `DropZone` holding a `FileTrigger`
 * with its button (react.md, "Widgets: React Aria, wrapped once"). A file
 * is dropped on the zone, or picked with the button, which opens the file
 * picker of the system, since dropping a file cannot be done with a
 * keyboard. What the screen shows of the file goes in the zone, before
 * the button, and what can be done with it, a Remove, after; the button
 * is the same element whatever the zone holds, so that the focus stays on
 * it after a pick.
 *
 * React Aria's zone also holds a button of its own, hidden, which takes a
 * file pasted into it; it comes first in the order of the Tab key, and
 * `pasteLabel` names it.
 */
import { useEffect, useRef } from "react";
import { DropZone, FileTrigger } from "react-aria-components";
import type { DropItem } from "react-aria-components";

import { classOf } from "../classOf.ts";
import { Button } from "./Button.tsx";
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
      be several when they are dropped. */
  readonly onFiles: (files: readonly File[]) => void;
  /** The element of the button, for a screen that moves the focus to it. */
  readonly buttonRef?: React.Ref<HTMLButtonElement>;
  /** What the zone shows of the file, before the button. */
  readonly children?: React.ReactNode;
  /** What can be done with the file, after the button. */
  readonly actions?: React.ReactNode;
}

/** A zone to drop a file on, with the button that picks one. */
export function FileZone({
  pasteLabel,
  buttonLabel,
  accept,
  onFiles,
  buttonRef,
  children,
  actions,
}: FileZoneProps): React.JSX.Element {
  const zoneRef = useRef<HTMLDivElement>(null);
  // React Aria writes an empty aria-labelledby on its hidden button, once
  // it finds that the zone has no label of its own in the page, in a
  // render of its own after this component's; an empty reference names
  // nothing, and is taken off whenever it is written.
  useEffect(() => {
    const zone = zoneRef.current;
    if (zone === null) return;
    const clean = (): void => {
      for (const element of zone.querySelectorAll('[aria-labelledby=""]')) {
        element.removeAttribute("aria-labelledby");
      }
    };
    clean();
    const observer = new MutationObserver(clean);
    observer.observe(zone, {
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-labelledby"],
    });
    return () => {
      observer.disconnect();
    };
  }, []);
  const onDrop = (event: { readonly items: readonly DropItem[] }): void => {
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
      ref={zoneRef}
      aria-label={pasteLabel}
      className={classOf(styles, "zone")}
      onDrop={onDrop}
    >
      <div className={classOf(styles, "content")}>{children}</div>
      <div className={classOf(styles, "buttons")}>
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
    </DropZone>
  );
}
