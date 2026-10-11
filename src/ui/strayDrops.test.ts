// @vitest-environment jsdom
/**
 * The listeners of a file dropped outside the zones of a file, in jsdom
 * (docs/specs/entry.md, "A file dropped outside a zone"). jsdom has no
 * DragEvent nor DataTransfer, so an event of the test carries an object
 * with a drop effect in their place. The flows of
 * e2e/strayDrops.spec.ts drop a file on each page in the browsers.
 */
import { afterEach, describe, expect, test } from "vitest";

import { stopStrayDrops } from "./strayDrops.ts";

/** What an event of the test carries in place of a DataTransfer. */
interface FakeTransfer {
  dropEffect: string;
  readonly types: readonly string[];
}

/** Dispatches a drag event `type` on `target`, of a file, or of a piece
    of text with `kind` "text", with a drop effect "move" to start with,
    and gives whether its default was prevented and the drop effect it
    ended with. */
function drag(
  target: EventTarget,
  type: "dragover" | "drop",
  kind: "file" | "text" = "file",
): { readonly prevented: boolean; readonly dropEffect: string } {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const transfer: FakeTransfer = {
    dropEffect: "move",
    types: kind === "file" ? ["Files"] : ["text/plain"],
  };
  Object.defineProperty(event, "dataTransfer", { value: transfer });
  target.dispatchEvent(event);
  return { prevented: event.defaultPrevented, dropEffect: transfer.dropEffect };
}

let stop: (() => void) | null = null;

afterEach(() => {
  stop?.();
  stop = null;
  document.body.replaceChildren();
});

describe("a file dropped outside a zone", () => {
  test("a dragover on the body has its default prevented and the drop effect none", () => {
    stop = stopStrayDrops(window);
    expect(drag(document.body, "dragover")).toEqual({
      prevented: true,
      dropEffect: "none",
    });
  });

  test("a drop on the body has its default prevented", () => {
    stop = stopStrayDrops(window);
    expect(drag(document.body, "drop").prevented).toBe(true);
  });

  test("a dragover a zone took keeps the zone's drop effect", () => {
    stop = stopStrayDrops(window);
    const zone = document.createElement("div");
    document.body.append(zone);
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      const transfer: unknown = Reflect.get(event, "dataTransfer");
      if (typeof transfer === "object" && transfer !== null) {
        Reflect.set(transfer, "dropEffect", "copy");
      }
    });
    expect(drag(zone, "dragover")).toEqual({
      prevented: true,
      dropEffect: "copy",
    });
  });

  test("a drag of text, which a text box takes, is left to the browser", () => {
    stop = stopStrayDrops(window);
    const box = document.createElement("input");
    document.body.append(box);
    expect(drag(box, "dragover", "text")).toEqual({
      prevented: false,
      dropEffect: "move",
    });
    expect(drag(box, "drop", "text").prevented).toBe(false);
  });

  test("after the function it returns, a dragover and a drop are left to the browser", () => {
    stopStrayDrops(window)();
    expect(drag(document.body, "dragover")).toEqual({
      prevented: false,
      dropEffect: "move",
    });
    expect(drag(document.body, "drop").prevented).toBe(false);
  });
});
