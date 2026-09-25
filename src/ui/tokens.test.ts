/**
 * The tokens of src/ui/tokens.css, read as text: the two blocks of the
 * dark theme declare the same values, and every pair of colours the
 * screens put together has the contrast WCAG 2.2 asks at level AA, in
 * both themes (.claude/skills/coding/css.md, "Light and dark" and
 * "Contrast and colour"). A pair is added here when a component starts to
 * use it.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const CSS = readFileSync(join(import.meta.dirname, "tokens.css"), {
  encoding: "utf8",
});

/** The declarations of custom properties of the first block whose
    selector ends with `selector`, as a map from name to value. */
function block(selector: string): Map<string, string> {
  const start = CSS.indexOf(`${selector} {`);
  if (start < 0) {
    throw new Error(`popnei_web defect: tokens.css has no ${selector}.`);
  }
  const end = CSS.indexOf("}", start);
  const body = CSS.slice(start, end);
  const declarations = new Map<string, string>();
  for (const match of body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) {
      declarations.set(name, value.trim());
    }
  }
  return declarations;
}

const LIGHT = block(`[data-theme="light"]`);
const DARK_BY_SYSTEM = block(`:root:not([data-theme="light"])`);
const DARK_BY_SETTING = block(`:root[data-theme="dark"]`);

/** The value of each colour in a theme: the light values, with the dark
    ones over them. */
function theme(over: Map<string, string>): Map<string, string> {
  return new Map([...LIGHT, ...over]);
}

const THEMES = [
  ["light", LIGHT],
  ["dark", theme(DARK_BY_SYSTEM)],
] as const;

/** The relative luminance of a colour written #rrggbb, by the formula of
    WCAG 2.2. */
function luminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (match === null) {
    throw new Error(`popnei_web defect: ${hex} is not a colour #rrggbb.`);
  }
  const [red, green, blue] = match.slice(1).map((pair) => {
    const channel = Number.parseInt(pair, 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  if (red === undefined || green === undefined || blue === undefined) {
    throw new Error(`popnei_web defect: ${hex} has no three channels.`);
  }
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** The contrast ratio of two colours, from 1 to 21. */
function contrast(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].toSorted(
    (a, b) => b - a,
  );
  if (lighter === undefined || darker === undefined) {
    throw new Error("popnei_web defect: two luminances expected.");
  }
  return (lighter + 0.05) / (darker + 0.05);
}

/** The pairs the screens use, the colour first, what is next to it
    second, and the ratio they need: 4.5 for text (1.4.3), 3 for the
    parts of a control, the focus ring and the marks of a plot (1.4.11). */
const PAIRS: readonly (readonly [string, string, number])[] = [
  ["--color-text", "--color-background", 4.5],
  ["--color-text", "--color-surface", 4.5],
  ["--color-text-muted", "--color-background", 4.5],
  ["--color-text-muted", "--color-surface", 4.5],
  // The links of the header and of the stepper.
  ["--color-accent", "--color-background", 4.5],
  ["--color-accent", "--color-surface", 4.5],
  // The text of a button filled with the accent.
  ["--color-on-accent", "--color-accent", 4.5],
  ["--color-border", "--color-background", 3],
  ["--color-border", "--color-surface", 3],
  ["--color-focus", "--color-background", 3],
  ["--color-focus", "--color-surface", 3],
  // The line under the error bar, on its surface.
  ["--color-danger", "--color-surface", 3],
  // The line and the mark of a file refused in the Variants step.
  ["--color-danger", "--color-background", 3],
  ["--chart-axis", "--color-background", 3],
  ["--chart-threshold", "--color-background", 3],
];

describe("the tokens", () => {
  test("the dark theme of the system and the dark theme set by the user declare the same values", () => {
    expect(DARK_BY_SYSTEM.size).toBeGreaterThan(0);
    expect(DARK_BY_SETTING).toEqual(DARK_BY_SYSTEM);
  });

  for (const [name, colours] of THEMES) {
    for (const [colour, next, needed] of PAIRS) {
      test(`${colour} on ${next} has a contrast of at least ${String(needed)}:1 in the ${name} theme`, () => {
        const first = colours.get(colour);
        const second = colours.get(next);
        if (first === undefined || second === undefined) {
          throw new Error(`tokens.css lacks ${colour} or ${next}.`);
        }
        expect(contrast(first, second)).toBeGreaterThanOrEqual(needed);
      });
    }
  }
});
