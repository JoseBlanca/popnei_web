/**
 * The bar at the top of the page that shows an error of our own code that
 * no error boundary sees (docs/specs/shell.md, "The error bar"). It is
 * drawn in a root of its own, `#defects`, outside the application's, so
 * that it stays when an error while the shell was drawn has emptied the
 * application's root. Save the project joins it with the saving of the
 * entry.
 */
import { useState, useSyncExternalStore } from "react";

import type { Store } from "../../core/store.ts";
import type { JobResult } from "../../worker/protocol.ts";
import type { Defects } from "../defects.ts";
import styles from "./ErrorBar.module.css";

/** What the bar is drawn with. */
export interface ErrorBarProps {
  /** The log of the errors, which the bar reads. */
  readonly defects: Defects;
  /** The store, once the entry has made it; `null` before, when the bar
      says that the application met the error as it started. */
  readonly store: Store<JobResult> | null;
  /** The version of the application, for Copy the details. */
  readonly appVersion: string;
}

/** What Copy the details did last. */
type Copying =
  | { readonly kind: "idle" }
  | { readonly kind: "copied" }
  | { readonly kind: "failed"; readonly text: string };

const IDLE: Copying = { kind: "idle" };

/** The error bar: empty regions until the first error, then its words
    and its buttons. */
export function ErrorBar({
  defects,
  store,
  appVersion,
}: ErrorBarProps): React.JSX.Element {
  const { first, more } = useSyncExternalStore(defects.subscribe, () =>
    defects.getState(),
  );
  const [copying, setCopying] = useState<Copying>(IDLE);

  async function copyDetails(): Promise<void> {
    const text = detailsText(defects, store, appVersion);
    try {
      // navigator.clipboard is missing on a page served over plain HTTP
      // from another machine, and the call then throws.
      await navigator.clipboard.writeText(text);
      setCopying({ kind: "copied" });
    } catch {
      setCopying({ kind: "failed", text });
    }
  }

  function close(): void {
    defects.dismiss();
    setCopying(IDLE);
    moveFocusAfterClose();
  }

  return (
    <div className={first === null ? styles["empty"] : styles["bar"]}>
      <div role="alert">
        {first !== null && (
          <p className={styles["message"]}>
            {barText(first.message, store !== null)}
          </p>
        )}
      </div>
      {first !== null && more > 0 && <p>{moreText(more)}</p>}
      {first !== null && (
        <div className={styles["actions"]}>
          <button
            type="button"
            onClick={() => {
              void copyDetails();
            }}
          >
            Copy the details
          </button>
          <button type="button" onClick={close}>
            Close
          </button>
        </div>
      )}
      <p role="status">{statusText(copying)}</p>
      {copying.kind === "failed" && (
        <label className={styles["details"]}>
          The details of the errors
          <textarea readOnly rows={8} value={copying.text} />
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
  }
}

/** What Copy the details copies, for a report of the bug: the page, the
    versions, the browser and every error kept; not the project. */
function detailsText(
  defects: Defects,
  store: Store<JobResult> | null,
  appVersion: string,
): string {
  const popneiVersion = store?.getState().popneiVersion ?? null;
  return [
    `Page: ${window.location.href}`,
    `popnei web: ${appVersion}`,
    `popnei: ${popneiVersion ?? "not loaded"}`,
    `Browser: ${navigator.userAgent}`,
    "",
    defects.details(),
  ].join("\n");
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
