// @vitest-environment jsdom
/**
 * The widget of tabs drawn by React in jsdom: with `keepHidden`, as the
 * two tabs of the files of popgen2.html take it, both panels stay in the
 * page, the one not shown inert, so that what the user left in it is
 * there when it is shown again (docs/specs/steps/popgen2-input.md, "Both
 * tabs kept drawn"); without it, as the plot and the table of the bins of
 * popgen.html use it, only the panel shown is drawn. That the panel not
 * shown takes no room is its style's, which jsdom does not apply, and is
 * checked by the flows of e2e/popgen2Input.spec.ts.
 *
 * A greyed tab, as the tabs of the analyses of popgen2.html have it
 * (docs/specs/steps/popgen2-pca.md, "The row of tabs" and
 * "Accessibility"; docs/designs/analyses-pca.md, "A greyed tab, for every
 * user", option (b)): the keyboard reaches it and its tooltip shows, a
 * choice of it is refused, and it carries `aria-disabled` and its reason
 * as its description. The flows of e2e/popgen2Tabs.spec.ts see the same
 * in the browsers.
 */
import { StrictMode, act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { Tabs } from "./Tabs.tsx";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

type Id = "first" | "second";

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  container.remove();
});

/** Draws the two tabs with `second` shown or not, each panel holding a
    text field named by its tab. */
function draw(selected: Id, keepHidden: boolean | null): void {
  const tabs = (["first", "second"] as const).map((id) => ({
    id,
    label: `The ${id}`,
    content: createElement("input", { "aria-label": `Field of ${id}` }),
  }));
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(Tabs<Id>, {
          label: "The parts",
          tabs,
          selected,
          onChange: () => undefined,
          ...(keepHidden === null ? {} : { keepHidden }),
        }),
      ),
    );
  });
}

/** The field of the tab `id`, or null when it is not in the page. */
function field(id: Id): HTMLInputElement | null {
  return container.querySelector(`input[aria-label="Field of ${id}"]`);
}

/** The panel that holds the field of the tab `id`. */
function panelOf(id: Id): Element {
  const panel = field(id)?.parentElement ?? null;
  if (panel === null) throw new Error(`no panel holds the field of ${id}`);
  return panel;
}

describe("IN3 D1 the widget of tabs keeps the tab not shown drawn when asked", () => {
  test("with keepHidden both panels are in the page, the one not shown inert and the one shown not", () => {
    draw("first", true);
    expect(field("first")).not.toBeNull();
    expect(field("second")).not.toBeNull();
    expect(panelOf("first").hasAttribute("inert")).toBe(false);
    expect(panelOf("first").hasAttribute("data-inert")).toBe(false);
    expect(panelOf("second").hasAttribute("inert")).toBe(true);
    expect(panelOf("second").getAttribute("data-inert")).toBe("true");
  });

  test("with keepHidden a turn to the other tab and back finds the same field with what was typed in it", () => {
    draw("first", true);
    const typed = field("first");
    if (typed === null) throw new Error("no field of the first tab");
    typed.value = "0.1";
    draw("second", true);
    expect(panelOf("first").hasAttribute("inert")).toBe(true);
    expect(panelOf("second").hasAttribute("inert")).toBe(false);
    draw("first", true);
    expect(field("first")).toBe(typed);
    expect(field("first")?.value).toBe("0.1");
    expect(panelOf("first").hasAttribute("inert")).toBe(false);
  });

  test("without keepHidden, as popgen.html uses the widget, only the panel shown is drawn", () => {
    draw("first", null);
    expect(field("first")).not.toBeNull();
    expect(field("second")).toBeNull();
    draw("second", null);
    expect(field("first")).toBeNull();
    expect(field("second")).not.toBeNull();
  });

  test("keepHidden false draws only the panel shown, as with no keepHidden", () => {
    draw("second", false);
    expect(field("first")).toBeNull();
    expect(field("second")).not.toBeNull();
  });
});

/** The three tabs of the greyed tests, the second greyed or not. */
type Three = "first" | "second" | "third";

/** The reason the second tab is greyed in the tests. */
const REASON = "The second needs a file. Open one in the box.";

/** The ids the harness's tabs were chosen with, in order. */
let chosen: Three[] = [];

/** Three tabs, the one shown held as the page holds it, the second
    greyed with `reason`, or not with null. */
function Harness({
  first,
  reason,
}: {
  readonly first: Three;
  readonly reason: string | null;
}): React.JSX.Element {
  const [selected, setSelected] = useState<Three>(first);
  return createElement(Tabs<Three>, {
    label: "Files and analyses",
    pageRow: true,
    selected,
    onChange: (id: Three) => {
      chosen.push(id);
      setSelected(id);
    },
    keepHidden: true,
    tabs: (["first", "second", "third"] as const).map((id) => ({
      id,
      label: `The ${id}`,
      content: createElement("p", null, `Content of ${id}`),
      greyedReason: id === "second" ? reason : null,
    })),
  });
}

/** Draws the harness with `first` shown and the second tab greyed with
    `reason`. */
function drawGreyed(first: Three, reason: string | null = REASON): void {
  chosen = [];
  act(() => {
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(Harness, { first, reason }),
      ),
    );
  });
}

/** The element of the tab whose label is `The ${id}`. */
function tabElement(id: Three): HTMLElement {
  const found = Array.from(
    container.querySelectorAll<HTMLElement>('[role="tab"]'),
  ).find((element) => element.textContent === `The ${id}`);
  if (found === undefined) throw new Error(`no tab ${id}`);
  return found;
}

/** The id of the tab marked selected. */
function selectedTab(): string | null {
  return (
    container.querySelector('[role="tab"][aria-selected="true"]')
      ?.textContent ?? null
  );
}

/** The text of the panel shown, the one not inert. */
function shownContent(): string | null {
  return (
    container.querySelector('[role="tabpanel"]:not([inert])')?.textContent ??
    null
  );
}

/** Presses the key `key` on the element that has the focus. */
function press(key: string): void {
  const target = document.activeElement;
  if (!(target instanceof HTMLElement)) throw new Error("no focus");
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
  });
}

/** Puts the focus on the tab `id` by the keyboard: the focus on the
    first, then the arrow keys. */
function focusFirst(): void {
  act(() => {
    tabElement("first").focus();
  });
}

/** The text of the tooltip shown, or null. */
function tooltip(): string | null {
  return document.querySelector('[role="tooltip"]')?.textContent ?? null;
}

describe("AP1 D2 a greyed tab is reached, refused and said", () => {
  test("a click on the greyed tab leaves the tab shown as it was", () => {
    drawGreyed("first");
    act(() => {
      tabElement("second").click();
    });
    expect(chosen).toEqual([]);
    expect(selectedTab()).toBe("The first");
    expect(shownContent()).toBe("Content of first");
  });

  test("the arrow key that reaches the greyed tab rests the focus on it and shows nothing new", () => {
    drawGreyed("first");
    focusFirst();
    press("ArrowRight");
    expect(document.activeElement).toBe(tabElement("second"));
    expect(chosen).toEqual([]);
    expect(selectedTab()).toBe("The first");
    expect(shownContent()).toBe("Content of first");
  });

  test("Enter and Space on the greyed tab show nothing new", () => {
    drawGreyed("first");
    focusFirst();
    press("ArrowRight");
    press("Enter");
    press(" ");
    expect(chosen).toEqual([]);
    expect(selectedTab()).toBe("The first");
    expect(shownContent()).toBe("Content of first");
    expect(document.activeElement).toBe(tabElement("second"));
  });

  test("the next arrow key shows the tab after the greyed one", () => {
    drawGreyed("first");
    focusFirst();
    press("ArrowRight");
    press("ArrowRight");
    expect(document.activeElement).toBe(tabElement("third"));
    expect(chosen).toEqual(["third"]);
    expect(selectedTab()).toBe("The third");
    expect(shownContent()).toBe("Content of third");
  });

  test("the greyed tab carries aria-disabled and its reason as its description, and the others neither", () => {
    drawGreyed("first");
    const second = tabElement("second");
    expect(second.getAttribute("aria-disabled")).toBe("true");
    const describedBy = second.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy ?? "")?.textContent).toBe(
      REASON,
    );
    for (const id of ["first", "third"] as const) {
      expect(tabElement(id).hasAttribute("aria-disabled")).toBe(false);
      expect(tabElement(id).hasAttribute("aria-describedby")).toBe(false);
    }
  });

  test("aria-disabled is still there after the tabs are drawn again", () => {
    drawGreyed("first");
    focusFirst();
    press("ArrowRight");
    press("ArrowRight");
    press("ArrowLeft");
    expect(selectedTab()).toBe("The third");
    expect(tabElement("second").getAttribute("aria-disabled")).toBe("true");
    drawGreyed("third");
    expect(tabElement("second").getAttribute("aria-disabled")).toBe("true");
  });

  test("a tab no longer greyed loses aria-disabled and its description, and opens", () => {
    drawGreyed("first");
    act(() => {
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(Harness, { first: "first", reason: null }),
        ),
      );
    });
    const second = tabElement("second");
    expect(second.hasAttribute("aria-disabled")).toBe(false);
    expect(second.hasAttribute("aria-describedby")).toBe(false);
    act(() => {
      second.click();
    });
    expect(chosen).toEqual(["second"]);
    expect(shownContent()).toBe("Content of second");
  });

  test("a greyed tab that is shown stays shown, with aria-disabled", () => {
    drawGreyed("second");
    expect(selectedTab()).toBe("The second");
    expect(shownContent()).toBe("Content of second");
    expect(tabElement("second").getAttribute("aria-disabled")).toBe("true");
  });

  test("the tooltip shows on the focus of the keyboard and goes with Escape", () => {
    drawGreyed("first");
    focusFirst();
    expect(tooltip()).toBeNull();
    press("ArrowRight");
    expect(tooltip()).toBe(REASON);
    press("Escape");
    expect(tooltip()).toBeNull();
    expect(document.activeElement).toBe(tabElement("second"));
  });

  test("aria-disabled and the description follow the reason across drawings, open, greyed, open, greyed", () => {
    for (const reason of [null, REASON, null, REASON]) {
      drawGreyed("first", reason);
      const second = tabElement("second");
      if (reason === null) {
        expect(second.hasAttribute("aria-disabled")).toBe(false);
        expect(second.hasAttribute("aria-describedby")).toBe(false);
      } else {
        expect(second.getAttribute("aria-disabled")).toBe("true");
        expect(
          document.getElementById(second.getAttribute("aria-describedby") ?? "")
            ?.textContent,
        ).toBe(REASON);
      }
    }
  });

  test("a tooltip open on a greyed tab goes when the tab stops being greyed, and the tab is described by nothing", () => {
    drawGreyed("first");
    focusFirst();
    press("ArrowRight");
    expect(tooltip()).toBe(REASON);
    drawGreyed("first", null);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(tabElement("second").hasAttribute("aria-describedby")).toBe(false);
    // And it does not come back by itself when the tab is greyed again.
    focusFirst();
    drawGreyed("first");
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  test("a click on a greyed tab shows its tooltip, and the tab shown stays shown", () => {
    drawGreyed("first");
    act(() => {
      tabElement("second").click();
    });
    expect(tooltip()).toBe(REASON);
    expect(chosen).toEqual([]);
    expect(selectedTab()).toBe("The first");
  });

  test("Enter on a greyed tab shows its tooltip again after Escape hid it", () => {
    drawGreyed("first");
    focusFirst();
    press("ArrowRight");
    press("Escape");
    expect(tooltip()).toBeNull();
    press("Enter");
    expect(tooltip()).toBe(REASON);
    expect(chosen).toEqual([]);
  });

  test("an empty reason is refused as a defect, since it would give an empty tooltip and an empty description", () => {
    expect(() => {
      drawGreyed("first", "");
    }).toThrow(/^popnei_web defect: /u);
  });

  test("the row of the page draws each label with its bold copy, for its width, and popgen.html's tabs draw their words alone", () => {
    drawGreyed("first");
    const label = tabElement("first").querySelector("[data-label]");
    expect(label?.getAttribute("data-label")).toBe("The first");
    expect(tabElement("first").textContent).toBe("The first");
    draw("first", null);
    for (const element of container.querySelectorAll('[role="tab"]')) {
      expect(element.querySelector("[data-label]")).toBeNull();
    }
  });

  test("without greyed tabs, as popgen.html uses the widget, no tab carries aria-disabled or a description", () => {
    draw("first", null);
    for (const element of container.querySelectorAll('[role="tab"]')) {
      expect(element.hasAttribute("aria-disabled")).toBe(false);
      expect(element.hasAttribute("aria-describedby")).toBe(false);
    }
  });
});
