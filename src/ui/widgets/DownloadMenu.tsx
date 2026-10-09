/**
 * The button "Download…" of a table or a plot, and its menu
 * (docs/specs/widgets/downloads.md, "The menu"): React Aria's
 * `MenuTrigger`, `Button`, `Popover` and `Menu`, with our look (react.md,
 * "Widgets: React Aria, wrapped once"). The button is named for a screen
 * reader by what it downloads, "Download the plot of the PCA", so that
 * the buttons of a page are not all "Download"; Enter, Space or the Down
 * arrow key open the menu, the arrow keys move in it, Enter chooses, and
 * Escape closes it and gives the focus back to the button. A choice calls
 * the item's function, which hands the file to the browser, and the
 * status region says "Saving ‹the file's name›."; the page cannot know
 * that the file was saved, since the browser may ask where.
 *
 * A menu can wait, with its reason, as the histograms of popgen2.html do
 * until the one pass ends. A button disabled for React Aria cannot take
 * the focus, and its tooltip would show to the mouse alone; so a waiting
 * button stays enabled for React Aria and a stop of the Tab key, carries
 * `aria-disabled` and its reason as its tooltip and its description, is
 * drawn as disabled, and opens nothing, as the greyed tabs of
 * docs/specs/steps/popgen2-pca.md do. As theirs, its tooltip is held
 * here (`HeldTooltip` of Tooltip.tsx): a press, of a click, a tap, Enter
 * or Space, shows it, since a tap leaves no pointer resting on the
 * button; and it stays through the scroll that brings a button reached
 * by Tab into view.
 *
 * A PNG the browser refuses, a `PngError`, is said in words under the
 * button and in the status region, until the next choice of the menu or
 * the start of a wait; any other failure of an item, a rejection or a
 * throw, is a defect, thrown again in a promise that nothing handles,
 * which the bar of the errors of the page shows (react.md, "Errors").
 */
import { useEffect, useRef, useState } from "react";
import {
  Button as AriaButton,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components";
import type { Key } from "react-aria-components";

import { PngError } from "../../charts/export.ts";
import type { PngErrorKind } from "../../charts/export.ts";
import { classOf } from "../classOf.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import styles from "./DownloadMenu.module.css";
import type { DownloadItem } from "./downloadItems.ts";
import { WithTooltip } from "./Tooltip.tsx";
import type { HeldTooltip } from "./Tooltip.tsx";

/** What the menu of a download is drawn with. */
export interface DownloadMenuProps {
  /** What it downloads, after "Download ": "the plot of the PCA". */
  readonly what: string;
  /** Its items, in their order. */
  readonly items: readonly DownloadItem[];
  /** The reason it waits, or null. */
  readonly waiting: string | null;
}

/** The words on the button. */
export const DOWNLOAD_BUTTON_TEXT = "Download…";

/** The words of a PNG refused as too large. */
export const PNG_TOO_LARGE_TEXT =
  "The image of this plot is too large for a PNG in this browser; download it as SVG.";

/** The words of a PNG the browser could not make. */
export const PNG_NOT_MADE_TEXT =
  "The image of this plot could not be made as a PNG in this browser; download it as SVG.";

/** The words of the status region when a file is handed to the
    browser: "Saving panel.pca.coordinates.csv." */
export function savingText(fileName: string): string {
  return `Saving ${fileName}.`;
}

/** The words of a PNG refused, by the kind of its refusal. */
function pngRefusedText(kind: PngErrorKind): string {
  switch (kind) {
    case "tooLarge":
      return PNG_TOO_LARGE_TEXT;
    case "notMade":
      return PNG_NOT_MADE_TEXT;
  }
}

/** The button "Download…" and its menu. */
export function DownloadMenu({
  what,
  items,
  waiting,
}: DownloadMenuProps): React.JSX.Element {
  const announcer = useAnnouncer();
  const [isOpen, setOpen] = useState(false);
  // The words of the last choice that failed, until the next choice or
  // the start of a wait.
  const [failure, setFailure] = useState<string | null>(null);
  const isWaiting = waiting !== null;
  // The number of the last choice, raised also when a wait begins: a save
  // that ends after another choice, or after the wait began, says
  // nothing, so that the words are always those of the last choice.
  const lastChoice = useRef(0);

  // A menu that begins to wait closes, and drops the words of a failure:
  // the open menu would come back by itself when the wait ends, and the
  // words would describe a file the menu no longer offers.
  const [wasWaiting, setWasWaiting] = useState(isWaiting);
  // Whether the reason's tooltip is shown, held here so that a press,
  // which React Aria would let close it, shows it.
  const [reasonShown, setReasonShown] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  if (wasWaiting !== isWaiting) {
    setWasWaiting(isWaiting);
    if (isWaiting) {
      setOpen(false);
      setFailure(null);
    } else {
      // So that the tooltip does not show by itself when a wait begins
      // again.
      setReasonShown(false);
    }
  }
  const held: HeldTooltip = {
    isOpen: reasonShown,
    onOpenChange: setReasonShown,
    hasFocus: () =>
      buttonRef.current !== null &&
      buttonRef.current === document.activeElement,
    placedUnder: buttonRef,
    crossOffset: 0,
  };
  useEffect(() => {
    if (isWaiting) lastChoice.current += 1;
  }, [isWaiting]);

  const onOpenChange = (open: boolean): void => {
    // A waiting menu opens nothing, and shows its reason.
    if (open && isWaiting) {
      setReasonShown(true);
      return;
    }
    setOpen(open);
  };

  const onAction = (key: Key): void => {
    const item = items.find((candidate) => candidate.label === key);
    if (item === undefined) {
      throw new Error(
        `popnei_web defect: a menu of downloads has no item ${String(key)}.`,
      );
    }
    setFailure(null);
    lastChoice.current += 1;
    const choice = lastChoice.current;
    // Every save is called in a promise, so that one that throws before
    // it gives its promise fails the same way as one that rejects, and
    // the menu closes. The rejection of anything but a PNG refused is
    // thrown again here, and reaches the window's unhandledrejection, the
    // bar of the errors of the page, as a defect.
    void Promise.resolve()
      .then(() => item.save())
      .then(
        (fileName) => {
          if (choice !== lastChoice.current) return;
          announcer.announce(savingText(fileName));
        },
        (error: unknown) => {
          if (!(error instanceof PngError)) throw error;
          if (choice !== lastChoice.current) return;
          const words = pngRefusedText(error.kind);
          setFailure(words);
          announcer.announce(words);
        },
      );
  };

  return (
    <div className={classOf(styles, "download")}>
      <MenuTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
        <WithTooltip text={waiting} held={held}>
          {(describedBy) => (
            <AriaButton
              ref={buttonRef}
              aria-label={`Download ${what}`}
              {...(isWaiting && { "aria-disabled": true })}
              {...(describedBy !== undefined && {
                "aria-describedby": describedBy,
              })}
              className={classOf(styles, "button")}
            >
              {DOWNLOAD_BUTTON_TEXT}
            </AriaButton>
          )}
        </WithTooltip>
        <Popover className={classOf(styles, "popover")} placement="bottom end">
          <Menu
            className={classOf(styles, "menu")}
            items={items}
            onAction={onAction}
          >
            {(item) => (
              <MenuItem id={item.label} className={classOf(styles, "item")}>
                {item.label}
              </MenuItem>
            )}
          </Menu>
        </Popover>
      </MenuTrigger>
      {failure !== null && (
        <p className={classOf(styles, "failure")}>{failure}</p>
      )}
    </div>
  );
}
