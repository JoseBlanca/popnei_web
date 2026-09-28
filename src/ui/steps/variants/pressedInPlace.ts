/**
 * Keeps what the pointer pressed under the pointer until it is let go,
 * for the section of the filters of the variants.
 *
 * A press on a switch takes the focus from a number field where a number
 * is typed, and the field commits it as it loses the focus, before the
 * pointer is let go. The commit changes a filter, which takes the counts
 * of the filters off the page, and the lines "Kept … of the … variants it
 * was given." above the switch go with them: the switch moves up, the
 * pointer is let go over something else, and the browser gives the
 * switch no click, so that the first click on the switch of the LD
 * pruning only committed its distance. So, while the pointer is down,
 * each drawing of the section scrolls the page by what the element
 * pressed moved, and it stays under the pointer.
 */
import { useEffect, useLayoutEffect, useRef } from "react";

/** Where the element pressed was when the pointer went down. */
interface Pressed {
  readonly target: Element;
  readonly top: number;
}

/** What the section is given: its handler of a pointer going down. */
export interface PressedInPlace {
  readonly onPointerDownCapture: (event: React.PointerEvent) => void;
}

/** The handler for the section, and, at each drawing of the component
    that calls it, the scroll that keeps the element pressed in place. */
export function usePressedInPlace(): PressedInPlace {
  const pressed = useRef<Pressed | null>(null);
  useEffect(() => {
    const release = (): void => {
      pressed.current = null;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);
  useLayoutEffect(() => {
    const at = pressed.current;
    if (at?.target.isConnected !== true) return;
    const moved = at.target.getBoundingClientRect().top - at.top;
    if (moved !== 0) {
      // At once, whatever the scrolling behaviour of the page: the
      // pointer may be let go at any moment.
      window.scrollBy({ top: moved, behavior: "instant" });
    }
  });
  return {
    onPointerDownCapture: (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      pressed.current = { target, top: target.getBoundingClientRect().top };
    },
  };
}
