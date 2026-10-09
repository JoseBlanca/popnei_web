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
 * docs/specs/steps/popgen2-pca.md do.
 *
 * A PNG the browser refuses, a `PngError`, is said in words under the
 * button and in the status region, until the next choice of the menu;
 * any other failure of an item is a defect, thrown again in a promise
 * that nothing handles, which the bar of the errors of the page shows
 * (react.md, "Errors").
 */
import { useState } from "react";
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
  // The words of the last choice that failed, until the next choice.
  const [failure, setFailure] = useState<string | null>(null);
  const isWaiting = waiting !== null;

  const onOpenChange = (open: boolean): void => {
    // A waiting menu opens nothing; it closes, if it was open when it
    // began to wait.
    if (open && isWaiting) return;
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
    // The rejection of anything but a PNG refused is thrown again here,
    // and reaches the window's unhandledrejection, the bar of the errors
    // of the page, as a defect.
    void item.save().then(
      (fileName) => {
        announcer.announce(savingText(fileName));
      },
      (error: unknown) => {
        if (!(error instanceof PngError)) throw error;
        const words = pngRefusedText(error.kind);
        setFailure(words);
        announcer.announce(words);
      },
    );
  };

  return (
    <div className={classOf(styles, "download")}>
      <MenuTrigger isOpen={isOpen && !isWaiting} onOpenChange={onOpenChange}>
        <WithTooltip text={waiting}>
          {(describedBy) => (
            <AriaButton
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
