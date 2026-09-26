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
import { useState, useSyncExternalStore } from "react";

import type { Store } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import { classOf } from "../classOf.ts";
import type { Defects } from "../defects.ts";
import type { Saving } from "../saving.ts";
import { Button } from "../widgets/Button.tsx";
import styles from "./ErrorBar.module.css";
import { saveFromBar } from "./barSave.ts";

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

/** What the bar's buttons did last: nothing, Copy the details, or Save
    the project with the words of what it did. */
type Copying =
  | { readonly kind: "idle" }
  | { readonly kind: "copied" }
  | { readonly kind: "failed" }
  | { readonly kind: "saved"; readonly text: string };

const IDLE: Copying = { kind: "idle" };

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
  const [copying, setCopying] = useState<Copying>(IDLE);
  const details = detailsText(defects.details(), popneiVersion, appVersion);

  async function copyDetails(): Promise<void> {
    const text = details;
    try {
      // navigator.clipboard is missing on a page served over plain HTTP
      // from another machine, and the call then throws.
      await navigator.clipboard.writeText(text);
      setCopying({ kind: "copied" });
    } catch {
      setCopying({ kind: "failed" });
    }
  }

  function close(): void {
    defects.dismiss();
    setCopying(IDLE);
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
            {barText(first.message, store !== null)}
          </p>
        )}
      </div>
      {first !== null && more > 0 && <p>{moreText(more)}</p>}
      {first !== null && (
        <div className={classOf(styles, "actions")}>
          {saving !== null && (
            <Button
              label="Save the project"
              onPress={() => {
                setCopying({
                  kind: "saved",
                  text: saveFromBar(saving, defects),
                });
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
        {statusText(copying)}
      </p>
      {copying.kind === "failed" && (
        <label className={classOf(styles, "details")}>
          The details of the errors
          <textarea readOnly rows={8} value={details} />
        </label>
      )}
    </div>
  );
}

/** The words of the bar for the first error, `message` without its last
    full stop, since the sentence adds its own. */
function barText(message: string, hasStore: boolean): string {
  const text = message.endsWith(".") ? message.slice(0, -1) : message;
  return hasStore
    ? `The application met an error of its own: ${text}. Your project is intact: save it, then reload the page.`
    : `The application met an error of its own as it started: ${text}. Reload the page.`;
}

/** The count of the errors after the first. */
function moreText(more: number): string {
  return more === 1
    ? "1 more error followed it."
    : `${String(more)} more errors followed it.`;
}

/** What the bar's status region says after Copy the details. */
function statusText(copying: Copying): string {
  switch (copying.kind) {
    case "idle":
      return "";
    case "copied":
      return "The details were copied.";
    case "failed":
      return "The details could not be copied. Select them in the box below and copy them.";
    case "saved":
      return copying.text;
  }
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
