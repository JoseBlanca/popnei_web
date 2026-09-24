# CSS

How the styles of `src/ui` are written. Read it before writing or
changing a style. The components are in `react.md`, beside this file, and
the review list of accessibility is at its end; the colours inside a plot
are in `charts.md`.

The styles are plain CSS (`docs/technology.md`): the design tokens are
custom properties in `src/ui/tokens.css`, and each component has a CSS
Module beside it. There is no Tailwind, no Sass and no CSS in
JavaScript.

## Which CSS the browsers have

The applications run where popnei's wasm runs: Chrome and Edge from 91,
Firefox from 89, Safari from 16.4 (`docs/objectives.md` of popnei). That
floor is older than much of what is called modern CSS, and a feature a
browser lacks does not fail loudly: the rule, or the whole block, is
ignored, and the page looks broken only in that browser. The Playwright
tests run current engines, so nothing tests the floor; this table is the
check.

| feature | Chrome, Firefox, Safari | here |
|---|---|---|
| custom properties, grid, flex with `gap`, `clamp()`, `min()`, `max()`, `:is()`, `:where()`, `:focus-visible`, `aspect-ratio`, logical properties (`margin-inline`, `inset`), `prefers-color-scheme`, `prefers-reduced-motion`, `forced-colors`, `@supports selector()` | all at the floor | allowed |
| nesting, `&` | 120, 117, 17.2 | **not used**. The build could flatten it, but only if its target is set to the floor, and a mistake there would break the styles of old browsers alone, where nobody looks. The selectors of a CSS Module are short enough flat |
| `@layer` | 99, 97, 15.4 | **not used**. A browser without it ignores everything inside the block, so the styles vanish |
| `:has()` | 105, 121, 15.4 | **not used** for anything that must work. A selector list that holds it is dropped whole where it is unknown. Where its absence is harmless it goes inside `@supports selector(:has(*))` |
| container queries, `@container`, `cqi` | 105, 110, 16 | only as an improvement over a layout that works without them |
| `subgrid` | 117, 71, 16 | only as an improvement |
| `color-mix()`, `oklch()`, `light-dark()`, relative colours | 111 to 123 | **not used**. The tokens hold every colour written out |
| media range syntax, `(width >= 40em)` | 104, 102, 16.4 | **not used**; `(min-width: 40em)` |
| `dvh` and the other dynamic viewport units | 108, 101, 15.4 | **not used** |
| `@property` | 85, 128, 16.4 | **not used** |
| `text-wrap: balance` | 114, 121, 17.5 | allowed: where it is missing the text wraps as usual |

When popnei raises its floor, or the applications set one of their own,
this table is revised first.

## The tokens

`src/ui/tokens.css` is the one place where a colour, a length of the
spacing, a size of type, a radius or a duration is written as a value.
Every other file uses the tokens, so that a change of the look is a change
there, and the dark theme is the same tokens with other values.

```css
:root {
  color-scheme: light dark;

  /* colours: named by their role, never by their hue */
  --color-background: #ffffff;
  --color-surface: #f4f5f7;
  --color-text: #1a1d21;
  --color-text-muted: #555d68;
  --color-border: #7c8591;
  --color-accent: #1f5fbf;
  --color-on-accent: #ffffff;
  --color-danger: #b3261e;
  --color-warning: #8a5a00;
  --color-focus: #1f5fbf;

  /* spacing: a scale of 0.25rem */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;

  /* type */
  --font-body: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.5rem;
  --leading-body: 1.5;
  --leading-heading: 1.25;

  /* shape, focus, size, motion */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-full: 999rem;
  --focus-ring: 2px solid var(--color-focus);
  --focus-offset: 2px;
  --target-min: 1.5rem;
  --duration-fast: 120ms;
  --duration-base: 200ms;
}
```

- **Colours are named by their role**, `--color-text-muted`, not
  `--grey-600`. A component asks for the role; the theme decides the
  value. The colours of a plot, the categorical palette of the
  populations among them, are tokens here too, and `charts.md` says how
  a plot reads them.
- **Lengths are in `rem`**, which follows the size of text the user set
  in the browser; a layout in `px` ignores it, and WCAG 1.4.4 asks for
  text that can be doubled. `px` is for borders and the focus ring, which
  should stay thin. Media queries are in `em`, which every browser
  resolves against the user's size.
- **No magic numbers.** A length in a component is a token, a
  `calc()` of tokens, `0`, `100%` or an `fr`. A value that is truly
  particular, the aspect ratio of a plot, is written with a comment that
  says where it comes from. A number repeated in two files is a missing
  token.
- The values above are checked: every text colour is at least 4.5:1 on
  the background and on the surface, and the border, the accent and the
  focus at least 3:1, in both themes (below).

## Light and dark

The user's system chooses the theme, and the application offers a
setting, system, light or dark, that overrides it. The dark theme is the
same tokens redefined:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;
    --color-background: #16181b;
    --color-surface: #202328;
    --color-text: #e8eaed;
    --color-text-muted: #a3abb5;
    --color-border: #7a838e;
    --color-accent: #7fb0ff;
    --color-on-accent: #0d1b2e;
    --color-danger: #ff8a80;
    --color-warning: #f2c14e;
    --color-focus: #7fb0ff;
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;
  /* the same declarations as the block above */
}

:root[data-theme="light"] {
  color-scheme: light;
}
```

- **The dark values are written twice**, in the media query and under
  `[data-theme="dark"]`, because the floor lacks `light-dark()`, the one
  way to write them once. A test reads `tokens.css` and checks that the two
  blocks declare the same values, so that they cannot drift.
- **The setting is an attribute of `<html>`**, `data-theme`, absent for
  "system". It is kept in `localStorage`, and a few lines of script in the
  `<head>` of each page set it before the first paint, so that a user who
  chose dark does not see a white page flash. Reading `localStorage` can
  throw, in a private window among others, so the script catches that and
  keeps the system's theme.
- **`color-scheme`** makes the browser draw its own parts, scrollbars and
  the native parts of form fields, in the same theme.
- A dark theme is not the light one inverted. Surfaces that sit higher
  are lighter, not darker; pure black and pure white are avoided, because
  their contrast is tiring to read; and every pair is measured again,
  since a colour that passes on white may fail on grey.

## CSS Modules

Each component has its styles in a module of the same name,
`Switch.module.css` beside `Switch.tsx`, imported as
`import styles from "./Switch.module.css"`. Vite renames every class to a
name of its own, so a class of one component cannot reach another, and a
style can be changed while knowing every place it applies.

- **Only classes, in a module.** No element selectors, `button`, `p`,
  no ids, no `:global`. An element selector in a module reaches the
  elements of every child component, which is the leak the modules are
  there to stop.
- **Class names in camelCase**, `.resultHeader`, so that they read as
  `styles.resultHeader` in TypeScript, and named by what the element is,
  `.warningCount`, not by how it looks, `.yellowBadge`, which is false
  after the next change of design.
- **Flat and short selectors**, a class, a class with a state,
  `.tab[data-selected]`, or a class inside a class of the same module.
  Specificity stays low and equal, so that the order in the file decides,
  and no `!important`, which would win over the user's own styles.
- **Global CSS is two files**: `tokens.css`, and `src/ui/base.css`, which
  holds the `@font-face`, a small reset, the styles of `body` and of the
  text that comes from Markdown in the help, and the default focus ring.
  Both are imported once, in the entry file of each page.

## Layout

- **Grid for two dimensions**, the page, a form of labels and fields, a
  set of cards; **flex for one**, a row of buttons, a label and its
  control.
- **Space between siblings is `gap` on the parent**, not a margin on the
  child. A child with a margin carries its spacing into every place it is
  used; a gap belongs to the layout, which is where the spacing is
  decided. This is also why the widgets take no `className` (`react.md`).
- **Layouts bend, not break.** `repeat(auto-fill, minmax(…, 1fr))` and
  `flex-wrap` make a layout that fits the width it has, with a media
  query only where the structure of the page changes. At 320 CSS px wide,
  which is a phone and also a desktop at 400% zoom, nothing but a table
  or a plot scrolls sideways (WCAG 1.4.10).
- **No fixed heights on anything that holds text.** A user who enlarges
  the spacing of text, or a translation longer than the English, would
  see the text cut (WCAG 1.4.12).
- **Logical properties**, `margin-inline`, `padding-block`, `inset`,
  where the direction is not physical, which costs nothing and is ready
  for a language written right to left.

## Styling the widgets of React Aria

The components of React Aria have no styles. They expose their state as
data attributes on the element they render, and the CSS selects on them
as it would on `:hover` or `:checked`:

```css
.switch {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-block-size: var(--target-min);
}

.track {
  inline-size: var(--space-8);
  block-size: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  background: var(--color-surface);
  transition: background-color var(--duration-fast);
}

.switch[data-selected] .track {
  border-color: var(--color-accent);
  background: var(--color-accent);
}

.switch[data-focus-visible] .track {
  outline: var(--focus-ring);
  outline-offset: var(--focus-offset);
}

.switch[data-disabled] {
  color: var(--color-text-muted);
}
```

- **Data attributes first.** `[data-selected]`, `[data-focus-visible]`,
  `[data-hovered]`, `[data-pressed]`, `[data-disabled]`, `[data-invalid]`,
  `[data-open]`, `[data-expanded]`, `[data-placeholder]`; each component's
  page lists its own. The state stays in CSS, where the rest of the look
  is.
- **`className` as a function**, which React Aria also accepts, only for
  what no attribute says. Note that a `className` replaces the default
  class, `react-aria-Switch`, which we do not use anyway.
- **`[data-hovered]` rather than `:hover`**, because React Aria sets it
  only for a mouse, and not after a tap, where `:hover` sticks on touch
  screens.
- **The variables React Aria gives** are used where they exist,
  `--trigger-width` on the popover of a `Select`, so that the list is as
  wide as its button.
- **Overlays animate with `[data-entering]` and `[data-exiting]`**, which
  React Aria sets for the length of the animation, and only under the
  rules of motion below.

## Focus

- **The focus ring is never removed.** `outline: none` appears only on
  the same rule that draws another ring. A keyboard user without a ring
  does not know where they are (WCAG 2.4.7).
- **`[data-focus-visible]` on the widgets of React Aria, `:focus-visible`
  on native elements**, links and the headings that take focus. Both show
  the ring for the keyboard and not after a click.
- **The ring is an `outline`**, 2px, with an offset, in `--color-focus`,
  which is at least 3:1 against the background in both themes. An outline
  is kept in the forced colours of Windows, where a `box-shadow` or a
  change of background is erased.
- **Nothing covers what has focus.** A sticky header or a toast region
  that sits over the page leaves room, `scroll-padding-block-start` on
  the scrolling element, so that a field reached by Tab is not hidden
  under it (WCAG 2.4.11).

## Contrast and colour

The values of WCAG 2.2 at level AA, in both themes:

| what | against what is next to it | criterion |
|---|---|---|
| text | 4.5:1 | 1.4.3 |
| large text, 24px, or 18.66px bold | 3:1 | 1.4.3 |
| the parts of a control that show it is one, a border, a thumb, and its states | 3:1 | 1.4.11 |
| the marks of a plot that carry its meaning, points, lines, bars | 3:1 against the background | 1.4.11 |
| the focus ring | 3:1 | 1.4.11 |

- **A test computes the ratios** of the pairs of tokens that are used
  together, text on background, text on surface, border on surface,
  in both themes, with the formula of WCAG, and fails below the limit.
  A pair is added to the test when a component starts to use it.
- **Colour is never the only sign** (WCAG 1.4.1). An error has a message
  and a symbol, a warning its "⚠" and its words, a selected tab a bar
  and not only a colour, a disabled control its muted text and its state
  to assistive technology. In the forced colours of Windows every
  background is erased, and what was colour alone is gone.
- **The populations of a plot** are told apart by colour and by a second
  sign: the legend with their names, the name on hover, a highlight of
  one population from the legend, and the table beside the plot. The
  palette is chosen to be told apart by the common kinds of colour
  blindness, and it has a limit, about eight colours, beyond which no
  palette separates them; `charts.md` says what a plot does past it.
- **The disabled state is exempt** from contrast in WCAG, but its text
  still uses `--color-text-muted`, which passes, so that a user can read
  what they cannot use and why.

## Size of the targets

A control that a pointer or a finger aims at is at least 24 by 24 CSS px,
or has that much space around it clear of other targets (WCAG 2.5.8),
`--target-min`. Small targets are missed by users with a tremor and on
touch screens, and a missed click in this application may be a filter
changed.

## Motion

- Transitions are short, `--duration-fast` or `--duration-base`, and
  change colour or opacity, not the layout.
- **With reduced motion on, the durations are zero.** In `tokens.css`:

  ```css
  @media (prefers-reduced-motion: reduce) {
    :root {
      --duration-fast: 0ms;
      --duration-base: 0ms;
    }
  }
  ```

  Every transition takes its duration from a token, so this one rule
  covers them. The motion of the plots, the rotation of the 3D PCA, the
  transitions of D3, reads the same setting in JavaScript, in `charts.md`.
- Nothing moves by itself for more than five seconds unless the user can
  stop it (WCAG 2.2.2).

## Fonts

The first version uses the fonts of the system, `system-ui` and
`ui-monospace`: no file to download, the look each platform's users know,
and nothing to license. If the owner chooses a typeface later, it is
served by the site (`docs/technology.md`, section 4: no request to any
other domain):

- `woff2` files in the repository, with the licence of the font, the OFL
  for most open fonts, beside them;
- declared in `base.css` with `@font-face` and `font-display: swap`, so
  that the text shows at once in the fallback and changes when the font
  arrives, instead of staying invisible;
- only the weights used, two at most, since each is a file.

Numbers in tables and in the summary line use
`font-variant-numeric: tabular-nums`, so that the digits of a column line
up.

## When this file is wrong

No style existed when it was written, in September 2026. The walking
skeleton will try the tokens, the two themes, the switch of theme before
the first paint and the widgets wrapped. What proves wrong is corrected
here, with what showed it; the table of features is revised whenever the
floor of the browsers changes.

## Sources

- MDN Web Docs and its browser compatibility data (the package
  `@mdn/browser-compat-data`, read on 24 September 2026) for the versions
  of the table of features; caniuse.com agrees with it.
- React Aria, react-aria.adobe.com, "Styling": the data attributes, the
  `className` function, the variables of the popover.
- WCAG 2.2, w3.org/TR/WCAG22, and its Understanding documents for 1.4.1,
  1.4.3, 1.4.4, 1.4.10, 1.4.11, 1.4.12, 2.2.2, 2.4.7, 2.4.11 and 2.5.8.
- Vite, vite.dev, "Features: CSS Modules" and "Build Options".
