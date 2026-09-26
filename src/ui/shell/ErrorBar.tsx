/**
 * The bar at the top of the page that shows an error of our own code that
 * no error boundary sees (docs/specs/shell.md, "The error bar"). It is
 * drawn in a root of its own, `#defects`, outside the application's, so
 * that it stays when an error while the shell was drawn has emptied the
 * application's root. Its Save the project saves through the saving of
 * the entry, under the name it proposes and with no dialog, since the
 * dialog of the header may be what failed.
 *
 * Its alert and its status region are marked as live announcers, which
 * React Aria keeps readable while a dialog is open and makes the rest of
 * the page inert, so that an error, or what a button of the bar did,
 * is heard then too; its buttons are inert with the page until the dialog
 * closes.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import type { Store } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { classOf } from "../classOf.ts";
import type { Defects } from "../defects.ts";
import type { Saving } from "../saving.ts";
import { Button } from "../widgets/Button.tsx";
import styles from "./ErrorBar.module.css";
import { NOT_SAVED, barText, saveFromBar } from "./barSave.ts";

/** What the bar is drawn with. */
export interface ErrorBarProps {
  /** The log of the errors, which the bar reads. */
  readonly defects: Defects;
  /** The store, once the entry has made it; `null` before, when the bar
      says that the application met the error as it started. */
  readonly store: Store<JobResult> | null;
  /** The saving of the entry, made with the store; `null` before, when
      there is no project to save. */
  readonly saving: Saving | null;
  /** The version of the application, for Copy the details. */
  readonly appVersion: string;
}

/** What the bar's status region says after Copy the details. */
const COPIED = "The details were copied.";
const NOT_COPIED =
  "The details could not be copied. Select them in the box below and copy them.";

/**
 * The text of the bar's status region, and `say`, which empties it and
 * writes `text` a frame later: a screen reader reads a text written
 * again only if it changed, so a second Save, which gives the same words,
 * would otherwise not be heard; and `clear`, which empties it.
 */
function useSaid(): {
  readonly said: string;
  readonly say: (text: string) => void;
  readonly clear: () => void;
} {
  const [said, setSaid] = useState("");
  const pending = useRef<number | null>(null);
  const cancel = (): void => {
    if (pending.current !== null) cancelAnimationFrame(pending.current);
    pending.current = null;
  };
  useEffect(() => cancel, []);
  return {
    said,
    say: (text) => {
      cancel();
      setSaid("");
      pending.current = requestAnimationFrame(() => {
        pending.current = null;
        setSaid(text);
      });
    },
    clear: () => {
      cancel();
      setSaid("");
    },
  };
}

/** The error bar: empty regions until the first error, then its words
    and its buttons. */
export function ErrorBar({
  defects,
  store,
  saving,
  appVersion,
}: ErrorBarProps): React.JSX.Element {
  const { first, more } = useSyncExternalStore(defects.subscribe, () =>
    defects.getState(),
  );
  // Read at every change, so that the box of the details takes in the
  // errors that follow and popnei's version once it is known.
  const popneiVersion = useSyncExternalStore(
    store?.subscribe ?? subscribeToNothing,
    () => store?.getState().popneiVersion ?? null,
  );
  const { said, say, clear } = useSaid();
  // Whether the box of the details is shown, after a copy that failed,
  // until the bar is closed: a Save after it keeps it.
  const [boxShown, setBoxShown] = useState(false);
  // Whether a Save of the bar could not write the project, until the bar
  // is closed: its first line then no longer says to save.
  const [saveFailed, setSaveFailed] = useState(false);
  const details = detailsText(defects.details(), popneiVersion, appVersion);

  async function copyDetails(): Promise<void> {
    const text = details;
    try {
      // navigator.clipboard is missing on a page served over plain HTTP
      // from another machine, and the call then throws.
      await navigator.clipboard.writeText(text);
      say(COPIED);
    } catch {
      setBoxShown(true);
      say(NOT_COPIED);
    }
  }

  function close(): void {
    defects.dismiss();
    clear();
    setBoxShown(false);
    setSaveFailed(false);
    moveFocusAfterClose();
  }

  return (
    <div
      className={
        first === null ? classOf(styles, "empty") : classOf(styles, "bar")
      }
    >
      <div role="alert" data-live-announcer="true">
        {first !== null && (
          <p className={classOf(styles, "message")}>
            {barText(first.message, store !== null, saveFailed)}
          </p>
        )}
      </div>
      {first !== null && more > 0 && (
        <p className={classOf(styles, "more")}>{moreText(more)}</p>
      )}
      {first !== null && (
        <div className={classOf(styles, "actions")}>
          {saving !== null && (
            <Button
              label="Save the project"
              onPress={() => {
                const said = saveFromBar(saving, defects);
                setSaveFailed(said === NOT_SAVED);
                say(said);
              }}
            />
          )}
          <Button
            label="Copy the details"
            onPress={() => {
              void copyDetails();
            }}
          />
          <Button label="Close" onPress={close} />
        </div>
      )}
      <p
        role="status"
        data-live-announcer="true"
        className={classOf(styles, "status")}
      >
        {said}
      </p>
      {boxShown && (
        <label className={classOf(styles, "details")}>
          The details of the errors
          <textarea readOnly rows={8} value={details} />
        </label>
      )}
    </div>
  );
}

/** The count of the errors after the first. */
function moreText(more: number): string {
  return more === 1
    ? "1 more error followed it."
    : `${String(more)} more errors followed it.`;
}

/** What Copy the details copies, for a report of the bug: the page, the
    versions, the browser and every error kept; not the project. */
function detailsText(
  errors: string,
  popneiVersion: string | null,
  appVersion: string,
): string {
  return [
    `Page: ${window.location.href}`,
    `popnei web: ${appVersion}`,
    `popnei: ${popneiVersion ?? "not loaded"}`,
    `Browser: ${navigator.userAgent}`,
    "",
    errors,
  ].join("\n");
}

/** The subscription of the bar when there is no store: nothing changes. */
function subscribeToNothing(): () => void {
  return () => undefined;
}

/** After Close, the focus goes to the `<h1>` of the step on screen, or,
    when the application's root was emptied, to the start of the page. */
function moveFocusAfterClose(): void {
  const heading = document.querySelector("#root h1");
  if (heading instanceof HTMLElement) {
    heading.focus();
    return;
  }
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}
