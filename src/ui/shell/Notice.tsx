/**
 * The notice (docs/specs/shell.md, "The notice"): what the last change
 * removed from the screen and which calculations it stopped or will stop,
 * in the words of `noticeText`, with the action that reverses the change,
 * Undo after a command or a redo and Redo after an undo, and Close, which
 * closes it and stops the calculations it left behind. It is the toast of
 * the page, in a region labelled "Notice" that F6 reaches, while the store
 * gives a notice, with no timer.
 *
 * A notice stays the same toast while its change is the same, `cause` of
 * the store's notice, which the store keeps as the same object until the
 * next change: its words follow the notice, as when Run stops the
 * calculations it left behind. The next command, undo, redo or opening
 * replaces it with a new toast.
 */
import { titleOf } from "../analyses/titles.ts";
import { useAppState, useStore } from "../store.tsx";
import { Button } from "../widgets/Button.tsx";
import { Toast } from "../widgets/Toast.tsx";
import { useAnnouncer } from "./announcer.tsx";
import { undoOrRedo } from "./undoRedo.ts";
import { noticeText } from "./words.ts";

/** The notice of the store, while there is one. */
export function Notice(): React.JSX.Element {
  const store = useStore();
  const announcer = useAnnouncer();
  const notice = useAppState((s) => s.notice);
  const content =
    notice === null
      ? null
      : { identity: notice.cause, ...noticeText(notice, titleOf) };
  return (
    <Toast label="Notice" content={content}>
      {(words) => (
        <>
          <Button
            label={words.action}
            onPress={() => {
              undoOrRedo(store, announcer, words.reverse);
            }}
          />
          <Button
            label="Close"
            onPress={() => {
              store.dismissNotice();
            }}
          />
        </>
      )}
    </Toast>
  );
}
