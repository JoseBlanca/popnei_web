/**
 * A toast: React Aria's `ToastRegion`, `Toast` and `ToastQueue`, with our
 * look (react.md, "Widgets: React Aria, wrapped once"). They are still
 * marked unstable in React Aria 1.21, which is one reason they are
 * wrapped here alone.
 *
 * The toast is a small panel fixed at the bottom of the page, in a region
 * of its own that F6 reaches from anywhere, and its words are read out by
 * a screen reader when it appears. It shows one toast at a time and has
 * no timer: it stays while the screen gives it, and a new identity
 * replaces it with a new one, which is read out again. When it goes while
 * it had the focus, React Aria gives the focus back to where it was
 * before F6 or the Tab key took it into the region; when a new one
 * replaces it, the focus goes to the new one.
 *
 * While it is up, the page keeps room under its content as tall as the
 * toast, so that what the Tab key reaches at the end of the page is never
 * under it (WCAG 2.4.11): the toast writes its height into the property
 * `--toast-room` of the page, which base.css reads; and the element that
 * has the focus when it appears is scrolled clear of it.
 */
import { useLayoutEffect, useState, useSyncExternalStore } from "react";
import {
  Text,
  UNSTABLE_Toast as AriaToast,
  UNSTABLE_ToastContent as AriaToastContent,
  UNSTABLE_ToastQueue as AriaToastQueue,
  UNSTABLE_ToastRegion as AriaToastRegion,
} from "react-aria-components";

import { classOf } from "../classOf.ts";
import styles from "./Toast.module.css";

/** What a toast is drawn with. */
export interface ToastProps {
  /** The name of the region of the toast, for a screen reader. */
  readonly label: string;
  /** What the toast shows, compared by reference: a new value replaces
      the toast with a new one, which is read out; the same value keeps
      it, with its words and buttons as they are now; `null` for none. */
  readonly identity: object | null;
  /** The words of the toast, read out when it appears. */
  readonly text: string;
  /** Its buttons, after the words. */
  readonly children: React.ReactNode;
}

/** The region of the toast, drawn at the end of the page while there is
    one. */
export function Toast({
  label,
  identity,
  text,
  children,
}: ToastProps): React.JSX.Element {
  // React Aria's queue, the store its region reads, made once for this
  // component, with a function that subscribes to it of the same identity
  // on every drawing.
  const [{ queue, subscribe }] = useState(() => {
    const made = new AriaToastQueue<null>({ maxVisibleToasts: 1 });
    return {
      queue: made,
      subscribe: (listener: () => void): (() => void) => {
        const unsubscribe = made.subscribe(listener);
        return () => {
          unsubscribe();
        };
      },
    };
  });
  const isUp = useSyncExternalStore(
    subscribe,
    () => queue.visibleToasts.length > 0,
  );

  // The queue follows the identity: a toast added for each new one, and
  // closed when it changes or goes. Before the paint, so that the old
  // toast is never seen with the new words.
  useLayoutEffect(() => {
    if (identity === null) return;
    const key = queue.add(null);
    return () => {
      queue.close(key);
    };
  }, [identity, queue]);

  // React Aria makes the region a landmark that F6 reaches when the
  // region is made, or its name changes, and only if it is drawn then; it
  // is drawn only while a toast is in the queue, so a region made before
  // its first toast is never reached (react-aria-components 1.21.1, found
  // in Chromium 153 and WebKit 26.6). So the region is made again, by its
  // key, when a toast comes up. It is always given its name, so that
  // React Aria never writes its own, which calls Intl.NumberFormat on
  // every drawing of the shell.
  return (
    <AriaToastRegion
      key={isUp ? "up" : "down"}
      queue={queue}
      aria-label={label}
      className={classOf(styles, "region")}
      ref={keepRoom}
    >
      {({ toast }) => (
        <AriaToast toast={toast} className={classOf(styles, "toast")}>
          <AriaToastContent className={classOf(styles, "content")}>
            <Text slot="title">{text}</Text>
          </AriaToastContent>
          <span className={classOf(styles, "actions")}>{children}</span>
        </AriaToast>
      )}
    </AriaToastRegion>
  );
}

/** The property of the page that holds the room kept under its content
    while the toast is up. */
const ROOM_PROPERTY = "--toast-room";

/**
 * Keeps room at the end of the page for the region `region` while it is
 * drawn, from the top of the region to the bottom of the window, and
 * gives the room back when the region goes. When the region appears or
 * grows over the element that has the focus, the page scrolls it clear,
 * since the toast appears where the user did not act, and would
 * otherwise hide the field they have just changed.
 */
function keepRoom(region: HTMLDivElement): () => void {
  const page = document.documentElement;
  const measure = (): void => {
    const top = region.getBoundingClientRect().top;
    page.style.setProperty(
      ROOM_PROPERTY,
      `${String(Math.ceil(window.innerHeight - top))}px`,
    );
    const focused = document.activeElement;
    if (
      focused instanceof HTMLElement &&
      !region.contains(focused) &&
      focused.getBoundingClientRect().bottom > top
    ) {
      // "nearest" scrolls it just above the room, which the
      // scroll-padding of base.css keeps.
      focused.scrollIntoView({ block: "nearest" });
    }
  };
  const observer = new ResizeObserver(measure);
  observer.observe(region);
  window.addEventListener("resize", measure);
  measure();
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", measure);
    page.style.removeProperty(ROOM_PROPERTY);
  };
}
