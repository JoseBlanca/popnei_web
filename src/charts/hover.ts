/**
 * The point under the pointer and its tooltip, shared by the 2D scatter
 * and the 3D plot (docs/specs/charts/scatter.md, "The point under the
 * pointer"): the nearest point by a loop over the pixel positions of the
 * points drawn, the lines of its tooltip, and the tooltip itself, which
 * stays while the pointer is on it and goes with Escape (WCAG 2.2,
 * success criterion 1.4.13).
 */

import "./charts.css";
import { MARK_RADIUS, NO_GROUP, type PointColours } from "./marks.ts";
import { tableNumber } from "./plot2d.ts";

/** The minus sign, U+2212, which the ticks of d3-axis write, where Intl.NumberFormat writes a hyphen. */
const MINUS = "−";

/**
 * From the point to the nearest corner of the tooltip, across and down,
 * in pixels: 9.9 pixels from the point, inside the 10 within which it
 * stays under the pointer and beyond the 8.05 a mark reaches.
 */
const TOOLTIP_OFFSET = 7;

/** A coordinate of the tooltip, to three significant digits. */
const coordinateFormat = new Intl.NumberFormat("en-US", {
  maximumSignificantDigits: 3,
});

/** `text` with each hyphen-minus written as the minus sign. */
function withMinus(text: string): string {
  return text.replaceAll("-", MINUS);
}

/**
 * The index of the point nearest to (px, py) within `radius` pixels, or
 * null. `positions` holds x and y in pixels, two per point, NaN for a
 * point not drawn. With `depth`, one per point, from −1 the nearest the
 * camera: among the points within MARK_RADIUS of (px, py), the one
 * nearest the camera; when none is, the nearest within `radius`
 * (pca3d.md). Of points at the same distance, or the same depth, the
 * first. Throws an `Error`, a defect of the caller, when `positions` is
 * of an odd length or `depth` is not one per point.
 */
export function nearestPoint(
  positions: Float32Array,
  px: number,
  py: number,
  radius: number,
  depth?: Float32Array,
): number | null {
  if (positions.length % 2 !== 0) {
    throw new Error(
      `popnei_web defect: the pixel positions of the points are ${String(positions.length)} numbers, not two per point.`,
    );
  }
  const numPoints = positions.length / 2;
  if (depth !== undefined && depth.length !== numPoints) {
    throw new Error(
      `popnei_web defect: ${String(numPoints)} points were given ${String(depth.length)} depths.`,
    );
  }
  const radiusSquared = radius * radius;
  const coverSquared = MARK_RADIUS * MARK_RADIUS;
  let nearest: number | null = null;
  let nearestSquared = Infinity;
  let covering: number | null = null;
  let coveringDepth = Infinity;
  for (let point = 0; point < numPoints; point++) {
    const x = positions[2 * point];
    const y = positions[2 * point + 1];
    if (x === undefined || y === undefined) break;
    const dx = x - px;
    const dy = y - py;
    const squared = dx * dx + dy * dy;
    // A NaN position gives a NaN distance, which no comparison takes.
    if (!(squared <= radiusSquared)) continue;
    if (squared < nearestSquared) {
      nearest = point;
      nearestSquared = squared;
    }
    if (depth !== undefined && squared <= coverSquared) {
      const pointDepth = depth[point] ?? Infinity;
      if (pointDepth < coveringDepth) {
        covering = point;
        coveringDepth = pointDepth;
      }
    }
  }
  return covering ?? nearest;
}

/**
 * The lines of the tooltip of point `index`, with its coordinates by
 * name, [["PC1", -0.02314], ["PC2", 0.01041]], written "PC1 −0.0231,
 * PC2 0.0104", with the minus sign U+2212: the name of the point; its
 * group, "Population: P2", or its value, "Year: 2019", or the name of
 * none, "No population"; and its coordinates, to three significant
 * digits. A value is written as tableNumber gives it, to 12 significant
 * digits. Throws an `Error`, a defect of the caller, for an index with no
 * colour, or of a group beyond the names.
 */
export function tooltipLines(
  name: string,
  colours: PointColours,
  index: number,
  coordinates: readonly (readonly [string, number])[],
): string[] {
  const place = coordinates
    .map(
      ([axis, value]) => `${axis} ${withMinus(coordinateFormat.format(value))}`,
    )
    .join(", ");
  return [name, colourLine(colours, index), place];
}

/** The line of the group or the value of point `index`. */
function colourLine(colours: PointColours, index: number): string {
  switch (colours.kind) {
    case "groups": {
      const group = colours.group[index];
      if (group === undefined) {
        throw new Error(
          `popnei_web defect: the tooltip of point ${String(index)} was asked for, of ${String(colours.group.length)} points.`,
        );
      }
      if (group === NO_GROUP) return colours.noneName;
      const groupName = colours.names[group];
      if (groupName === undefined) {
        throw new Error(
          `popnei_web defect: point ${String(index)} is in group ${String(group)}, of ${String(colours.names.length)} names.`,
        );
      }
      return `${colours.title}: ${groupName}`;
    }
    case "values": {
      const value = colours.values[index];
      if (value === undefined) {
        throw new Error(
          `popnei_web defect: the tooltip of point ${String(index)} was asked for, of ${String(colours.values.length)} points.`,
        );
      }
      if (!Number.isFinite(value)) return colours.noneName;
      return `${colours.title}: ${withMinus(String(tableNumber(value)))}`;
    }
  }
}

/**
 * How the user hid a tooltip: by Escape, or by a mouse or a pen that
 * left the plot's element from the tooltip itself.
 */
export type TooltipDismissal = "escape" | "leave";

/**
 * The tooltip of a plot, a <div> in `element`, made at the first `show`:
 * kept while the pointer is on it; hidden by Escape, which then calls
 * `onDismiss("escape")`, and by a mouse or a pen that leaves `element`
 * from it, which calls `onDismiss("leave")`, as "The point under the
 * pointer" says.
 */
export interface Tooltip {
  /** Shows `lines` beside the point at (x, y), in the pixels of `element`. */
  show(lines: readonly string[], x: number, y: number): void;
  hide(): void;
  /** True while the pointer is on the tooltip. */
  readonly hovered: boolean;
  /** True when `target` is the tooltip or inside it: a leave of the plot onto it is none. */
  holds(target: EventTarget | null): boolean;
  /** Removes the <div> and the listener of Escape; safe to call twice. */
  destroy(): void;
}

/**
 * The tooltip of the plot in `element`, whose CSS makes it `position:
 * relative`. `onDismiss` is called when the user hides the tooltip: by
 * Escape, and by a mouse or a pen that leaves `element` from the tooltip,
 * which the plot's own leave, on its overlay or its canvas, does not
 * hear. The plot then forgets its point and calls its `onHover(null)`;
 * after Escape it keeps that point's tooltip hidden until the pointer
 * leaves every point, which a leave of `element` already is.
 */
export function createTooltip(
  element: HTMLElement,
  onDismiss: (by: TooltipDismissal) => void,
): Tooltip {
  let div: HTMLDivElement | null = null;
  let shown = false;
  let hovered = false;
  let listening = false;
  let destroyed = false;

  const onKeyDown = (event: KeyboardEvent): void => {
    // Neither stopped nor prevented: a field or a dialog with the focus
    // gets the key as before.
    if (event.key !== "Escape" || !shown) return;
    hide();
    onDismiss("escape");
  };

  const onPointerEnter = (): void => {
    hovered = true;
  };

  const onPointerLeave = (): void => {
    hovered = false;
  };

  // A leave of the element with the pointer on the tooltip, which the
  // overlay does not hear. A touch "leaves" when the finger is lifted,
  // and its tooltip stays until the next tap on the plot.
  const onElementLeave = (event: PointerEvent): void => {
    if (event.pointerType === "touch" || !shown) return;
    if (holdsNode(element, event.relatedTarget)) return;
    hide();
    onDismiss("leave");
  };

  function listen(on: boolean): void {
    if (on === listening) return;
    listening = on;
    if (on) {
      document.addEventListener("keydown", onKeyDown);
      element.addEventListener("pointerleave", onElementLeave);
    } else {
      document.removeEventListener("keydown", onKeyDown);
      element.removeEventListener("pointerleave", onElementLeave);
    }
  }

  function made(): HTMLDivElement {
    if (div !== null) return div;
    const created = document.createElement("div");
    created.className = "chart-tooltip";
    created.setAttribute("aria-hidden", "true");
    created.hidden = true;
    created.addEventListener("pointerenter", onPointerEnter);
    created.addEventListener("pointerleave", onPointerLeave);
    element.append(created);
    div = created;
    return created;
  }

  function show(lines: readonly string[], x: number, y: number): void {
    if (destroyed) {
      throw new Error(
        "popnei_web defect: a tooltip was shown after its destroy.",
      );
    }
    const box = made();
    // Text alone, never markup: the names come from the user's files.
    box.replaceChildren(
      ...lines.map((line) => {
        const row = document.createElement("div");
        row.textContent = line;
        return row;
      }),
    );
    box.hidden = false;
    shown = true;
    const width = box.offsetWidth;
    const height = box.offsetHeight;
    const right = x + TOOLTIP_OFFSET;
    const below = y + TOOLTIP_OFFSET;
    const left =
      right + width > element.clientWidth ? x - TOOLTIP_OFFSET - width : right;
    const top =
      below + height > element.clientHeight
        ? y - TOOLTIP_OFFSET - height
        : below;
    box.style.left = `${String(left)}px`;
    box.style.top = `${String(top)}px`;
    listen(true);
  }

  function hide(): void {
    shown = false;
    hovered = false;
    if (div !== null) div.hidden = true;
    listen(false);
  }

  return {
    show,
    hide,
    get hovered() {
      return hovered;
    },
    holds(target) {
      return div !== null && holdsNode(div, target);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      hide();
      if (div !== null) {
        div.removeEventListener("pointerenter", onPointerEnter);
        div.removeEventListener("pointerleave", onPointerLeave);
        div.remove();
        div = null;
      }
    },
  };
}

/** True when `target` is `container` or a node inside it. */
function holdsNode(container: Node, target: EventTarget | null): boolean {
  return target instanceof Node && container.contains(target);
}
