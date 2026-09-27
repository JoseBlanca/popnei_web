# The 3D plot of the PCA

Written on 27 September 2026, for stage 4 of `docs/build-order.md`, the
Individuals step and the PCA; not yet reviewed or approved. There is no
code of it yet. This spec gives the function of `src/charts/pca3d.ts`
that draws the individuals on three principal components with three.js,
the library of WebGL the applications take for it
(`docs/technology.md`, section 2), a view the user turns by dragging or
with buttons; and the function of `src/charts/project.ts` that finds
where a point of the view falls on the screen. WebGL is the part of the
browser that draws with the graphics card; the 2D plots do not use it.

Most of the plot is decided in `.claude/skills/coding/charts.md`, "The
3D PCA with three.js": the renderer; the orthographic camera, a view in
which a point keeps its size and its distances whatever its depth, so
that looking down one axis shows exactly the 2D plot of the other two;
the controls of the mouse and the fingers, `OrbitControls`, the ones
three.js gives for turning a view about its centre; the rendering only when
something changes, the picking of the point under the pointer by
projecting every point, the export as vectors, the size and the pixel
ratio, what `destroy` frees and why, the change of theme and the loss of
the WebGL context. This spec points to it for those and does not repeat
them. It adds what they leave to a spec: the data, which the scatter
shares; the handle with its turns and the buttons that call them; how
three.js is loaded and what the user sees while it loads, when it fails
to load and when the browser has no WebGL; the words of a lost context;
the export; and how each is verified. It depends on
`docs/specs/charts/scatter.md`, whose marks, legend and point under the
pointer it shares, on `src/charts/export.ts` of
`docs/specs/charts/plot2d.md`, and on `docs/specs/analyses/pca.md`, whose
panel shows it.

## What it does

### What the user sees

The PCA opens as the 2D scatter of its first two components, and 3D is
one button away, in the bar of controls above the plot (point 5 of the
recommendations of 27 September 2026, `docs/specs/stage-4-open-points.md`).
In 3D the individuals are shown on the three components of the axes,
PC1, PC2 and PC3 by default (`pca.md`, the option `axes`), each with the
colour and the shape of its group as in 2D, and the same legend over
the top right corner. Three lines through the origin, one along each
component over the range of its values, carry at their positive ends
the labels "PC1 (12.3%)", "PC2 (8.1%)" and "PC3 (5.4%)". The user turns
the view by dragging it, zooms it, and turns it with the buttons of the
bar; the pointer over a point shows the tooltip of the scatter, with
three coordinates.

### The points and the scale

The data give the three coordinates of each point as three columns, as
the scatter gets two (below, "The TypeScript interface"): one function
of `pca.md` turns a result into the data of both plots, and it takes
the components out of the projections, which popnei gives row after
row, `numComps` wide. `charts.md` had the plot take the projections
whole and pick its columns; three columns keep one shape for the two
plots, for a copy of 9,381 × 3 numbers.

The plot copies the points with three finite coordinates into one
`Float32Array` of positions, with an index back to the point of each
position, and leaves out the others, which the legend does not count
(`legendOf` of `scatter.md`); popnei's PCA gives none. The three
components have one scale, the largest absolute value among them
brought to 1, so that the spread along each is shown as it is
(`charts.md`). The first component is the world's x, across the screen
in the view along the third; the second its y, up; the third its z,
towards the viewer.

The groups are one `Points` object each, with the symbol of the group
drawn on a small canvas as its texture, in its colour with the outline
in `--chart-axis`, the no-group a ring, and the area of a mark on the
screen that of the scatter, `SYMBOL_AREA`, whatever the zoom
(`charts.md`, "The data and the scene"). A colouring by values is one
`Points` object whose points each carry their colour of viridis, as
circles, and the rings of the points with no value. A highlighted group
is drawn after the others, and the others at an opacity of 0.25 and
behind it, as in 2D.

### The view

The view starts turned, meanwhile 30° about the vertical and 20° above
the plane of the first two components, so that the three lines are seen
at once; refined in the running application. The option not taken,
starting along the third component, shows the 2D plot again, and a user
who switched to 3D would see no change until they turned it. The camera
is orthographic, and the controls are `OrbitControls` of three.js, with
one axis kept up (`charts.md`, "Renderer, camera and controls"). Two
settings of the controls are decided here:

- **No pan**, the moving of the view sideways that `OrbitControls`
  gives to the right button and to two fingers: the cloud of a PCA is
  centred on the origin, and a pan has no button to do it for a user who
  cannot drag, which WCAG 2.2 asks of a movement made by dragging
  (success criterion 2.5.7). The zoom is about the centre.
- **The zoom** by the wheel of the mouse and by two fingers pinching,
  with buttons for a user who uses neither (2.5.1 asks a gesture of two
  fingers to have one of a single pointer). Whether the wheel
  zooms alone or with the Ctrl key held is open (**Open 1**, below).

A drag with one finger on the plot turns it, and so does not scroll the
page: `OrbitControls` sets `touch-action: none` on the canvas
(`OrbitControls.js` of three 0.186.1, line 508). At 320 pixels wide the
plot is 320 by 240 pixels, the size of the scatter, and the page is
scrolled by a finger on the rest of it.

### The buttons of the bar above the plot

The screen draws the bar with React Aria's buttons and calls the
handle; the plot draws no control. The bar holds the switch between 2D
and 3D (`pca.md`), and, in 3D, these buttons, meanwhile, with their
words refined in the running application:

| button | calls | what the user sees |
|---|---|---|
| "Turn left", "Turn right" | `rotate("vertical", −15)`, `rotate("vertical", 15)` | the view turns by 15° about the vertical of the screen |
| "Tilt up", "Tilt down" | `rotate("horizontal", 15)`, `rotate("horizontal", −15)` | the view turns by 15° about the horizontal of the screen, and stops when it looks straight down or straight up the second component |
| "Along PC1", "Along PC2", "Along PC3" | `viewAlong(0)`, `viewAlong(1)`, `viewAlong(2)` | the view looks down that component: along PC3, PC1 across and PC2 up, the 2D plot of the first two; along PC1, PC2 across and PC3 up; along PC2, PC1 across and PC3 up |
| "Zoom in", "Zoom out" | `zoom(1.25)`, `zoom(0.8)` | the points spread further apart or closer, their marks keeping their size |
| "Reset view" | `resetView()` | the starting view and zoom |

The names of the components are those of the axes shown, "Along PC4"
when the user chose PC4. A step of 15° makes a whole turn in 24 presses,
and the drag gives any angle between them. The view jumps to the new
angle with no animation, so a user who asked the system for reduced
motion needs nothing more (`css.md`, "Motion"). Each button is a stop of
the Tab key; nothing listens for a key on the canvas or the page, since
a key listened for on the whole page would act while the user types in
another field, as the owner's widget does and this one does not.

### The point under the pointer

As `charts.md`, "Picking the point under the pointer": at each movement
of the pointer that is not a drag, the plot projects the points to the
pixels of the element with `projectToScreen`, and `nearestPoint` of
`hover.ts` (`scatter.md`) takes the nearest within 10 pixels, the one
nearest the camera among those. The tooltip, its words, its
`textContent` and `events.onHover` are the scatter's, with the three
coordinates, "PC1 −0.0231, PC2 0.0104, PC3 0.0012". A turn, a zoom or an
`update` hides it. A tap that does not move shows the tooltip of the
point tapped.

### Loading three.js

three.js is loaded when the 3D view is first shown and not with the
page, into a script file of its own that the browser downloads then
(`docs/technology.md`, section 2, "three.js for the 3D PCA"):

- `pca3d.ts` imports `three` and `OrbitControls`, and nothing imports
  `pca3d.ts` but its tests and the screen, which does it with `import()`,
  the call that asks the browser for a module when the code reaches it,
  so that the bundler makes of it and three.js the file of their own.
  `marks.ts`, `legend.ts`, `hover.ts`, `export.ts` and `project.ts`
  import nothing of three.js, so the scatter and the legend load none
  of it; `project.ts` takes the matrix of the camera as 16 numbers for
  that reason.
- **Its size.** A file that imports the classes of three.js the plot
  uses, `WebGLRenderer`, `OrthographicCamera`, `Scene`, `Points`,
  `PointsMaterial`, `BufferGeometry`, `BufferAttribute`,
  `CanvasTexture`, `LineSegments`, `LineBasicMaterial`, `Color` and
  `OrbitControls`, bundled and minified by rolldown 1.2.10, the bundler
  of Vite 8.3.0, from three 0.186.1, was 554,333 bytes, and 134,245
  with `gzip -9`, on 27 September 2026; the first script of the page is
  154,923 bytes with `gzip -9` (`docs/technology.md`). At 3 Mbit/s, a
  slow mobile connection, the 134 KB take about 0.4 s; the browser keeps
  the file for the next time. The file of the built site is measured
  again when the plot is built.
- **While it loads**, the screen shows in the place of the plot
  "Loading the 3D view…", read by a screen reader without moving the
  focus (WCAG 2.2, 4.1.3); the switch back to 2D works, and the buttons
  of the turns are shown once the plot is drawn.
- **When it fails to load**, the promise of `import()` is refused: the
  connection is down, or the site was deployed again since the page was
  opened. A deploy to GitHub Pages replaces every file of the site, and
  the name of this file holds a hash of its content, so a page opened
  before a deploy asks for a file of the old build that is no longer
  there. The screen says, drafted here for `pca.md`: "The 3D view could
  not be loaded. If the connection works, the site may have been
  updated since this page was opened: save the project, reload the page
  and open the project again." with a button "Try again", which calls
  `import()` again, and the 2D plot one press away. Whether an engine
  asks the network again for a module whose download failed, or keeps
  the failure, is seen in each engine when the plot is built. In an
  engine that keeps it, "Try again" fails again, and what works there is
  what the words say: saving the project and reloading the page.

### When the browser has no WebGL

three.js r186 draws with WebGL 2 alone: it refuses WebGL 1 since r163
(`build/three.module.js` of three 0.186.1, line 16139), and its
`WebGLRenderer` throws "Error creating WebGL context." when the browser
gives no context (line 16458). The browsers of the floor of the
applications, Chrome 111, Firefox 115 and Safari 16.4
(`docs/technology.md`, section 6), are newer than the first of their
engines with WebGL 2, Chrome 56, Firefox 51 and Safari 15, as MDN's
data of compatibility give them, not tried in a browser; a browser
gives none when WebGL is turned off in its settings or by the policy of
an institution, when its hardware acceleration is off or the graphics
card is on its list of cards it refuses, and in some remote desktops.
Which of these gives no WebGL in which browser was not tried.

`createPca3d` then throws a `Pca3dError` of kind `noWebGl`, after
removing what it added, and the element is left as it was. It is a
thrown error and not a state of the handle, because there is no plot to
give a handle to; and a typed one, as `PngError` is, because it is a
state of the browser that the screen shows, and not a defect. Every
other error of `createPca3d` is a defect. The screen shows, drafted here
for `pca.md`: "This browser cannot draw the 3D view: WebGL, the part of
the browser that draws it, is turned off or not available on this
computer. The 2D plot shows any two of the components." The 2D plot
stays one press away. A project saved in 3D and opened on such a
machine shows the same words; the screen does not switch the project to
2D by itself, since that would be a change of the project the user did
not make.

The option not taken: to test for WebGL 2 before downloading three.js,
by asking a canvas for a context, which spares 134 KB on the machines
that have none and makes and throws away a WebGL context on every other.

### The WebGL context lost

As `charts.md`, "Losing the WebGL context": the browser can take the
context away, and three.js asks it back (its `webglcontextlost`
listener calls `preventDefault`, `three.module.js` line 17152). The plot
calls `events.onContextChange(true)` when it is lost, and `(false)` when
it is given back, after it has drawn again; the screen shows the words
over the plot, since the words of the screens are the screen's:
"The browser stopped drawing the 3D view. It is drawn again when the
browser allows it, or when you switch to 2D and back to 3D." A switch to
2D destroys the plot and its context, and a switch back makes a new one
(`pca.md`). `charts.md` had the plot show "The 3D view was lost by the
browser" itself; that sentence does not say what the user can do.

### A change of theme

As `charts.md`, "A change of theme": the colours of the textures and of
the lines are read from the tokens with `getComputedStyle` on the
element, and on a change of `prefers-color-scheme` or of the attribute
`data-theme` of `<html>`, watched with `matchMedia` and a
`MutationObserver`, the textures are drawn again and the view rendered.
The canvas is transparent, so the background is the element's, from
the tokens.

### `update`, the view and `destroy`

`update` replaces the positions and the colours, making new geometries
and textures and disposing of the old (`charts.md`), and keeps the view
the user turned and zoomed, so that a change of the colouring, of the
highlight or of the components does not turn the view back
(`.claude/skills/coding/react.md`, "Mounting a plot"). `destroy` is
`charts.md`'s, "`destroy`, and why every piece is disposed", with the
observers of the theme, the axis labels, the tooltip and the hidden
title and description removed too, and can be called twice. The screen
destroys the plot when the user switches to 2D, so that no WebGL context
is held while it is not shown, and the view starts again when 3D is shown
again. This is decided for stage 4, and is among the choices the owner
may overrule once they have tried the screen
(`docs/specs/stage-4-open-points.md`); the option not taken, the plot
kept hidden, keeps the view the user turned and holds a WebGL context,
of which a browser allows only a few at once, while 2D is shown.

### The text for a screen reader

The canvas has `role="img"` and is named by a hidden title and described
by a hidden description, elements the plot adds beside it from the
`title` and `description` of the data, as text. The screen writes a
description of the 3D view that says what it adds and where the numbers
are: "The same 200 individuals on PC1, PC2 and PC3. The table gives
every coordinate." The labels of the axes and the tooltip are hidden
from a screen reader, which reads the table beside the plot.

### The export

As `charts.md`, "Export of the 3D plot": `toSVG` writes the view as it
is on the screen as an SVG of vectors, with `projectToScreen`, and no
reading of the WebGL canvas, so it works while the context is lost. The
SVG is built apart from the page with the classes of the plots, `chart
chart-pca3d`, its title and description, the three lines and their
labels as text, the points and the legend of `drawLegendSvg`
(`scatter.md`) at the top right, and given to `exportSvg` of
`export.ts`, which writes the colours of the light theme on it; `toPNG`
draws that SVG, as every plot does, with its `PngError`.

The points are sorted from far to near, and consecutive points of one
group in that order share one path, so that a nearer point is drawn over
a farther one of another group, as the screen shows it; the paths of the
faded groups are all drawn before the highlighted group, as on the
screen. `charts.md` had one path per group, which draws a whole group
over another whatever their depth. The number of paths is at most the
number of points, 9,381, when the groups alternate at every step of
depth, and a few hundred for populations that form clusters; the file
holds one symbol per point, rounded to one decimal, as the scatter's.

## The TypeScript interface

The data. The colours, the marks and the legend are the scatter's
(`scatter.md`, `PointColours` of `marks.ts`); every text is the screen's.

```ts
// src/charts/pca3d.ts
export interface Pca3dData {
  /** The name of the canvas for a screen reader. */
  readonly title: string;
  /** Its description, written by the screen. */
  readonly description: string;
  /** The coordinates of each point on the three components; NaN or an infinity is not drawn. */
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly z: Float64Array;
  /** The short names of the components, for the tooltip: "PC1", "PC2", "PC3". */
  readonly axisNames: readonly [string, string, string];
  /** The labels at the ends of the lines: "PC1 (12.3%)". */
  readonly axisLabels: readonly [string, string, string];
  /** The name of each point, an individual, for the tooltip. */
  readonly pointNames: readonly string[];
  readonly colours: PointColours;
}

export interface Pca3dEvents {
  /** The point under the pointer, by its index, or null; called when it changes. */
  onHover?(point: number | null): void;
  /** The WebGL context was lost (true) or given back and drawn again (false). */
  onContextChange?(lost: boolean): void;
}
```

The handle has the four functions of every plot and the turns of the
view. `"vertical"` turns about the vertical of the screen, to the right
for a positive angle; `"horizontal"` about its horizontal, upwards for
a positive angle, and stops at the poles as `OrbitControls` does. A
turn, a zoom and a view along a component render once and change
nothing in the data.

```ts
export type TurnAxis = "vertical" | "horizontal";

export interface Pca3dHandle extends ChartHandle<Pca3dData> {
  rotate(axis: TurnAxis, degrees: number): void;
  /** Looks down component 0, 1 or 2 of the data. */
  viewAlong(component: 0 | 1 | 2): void;
  /** Multiplies the zoom: above 1 nearer. */
  zoom(factor: number): void;
  resetView(): void;
}

/** The browser gives no WebGL 2 context. */
export class Pca3dError extends Error {
  readonly kind: "noWebGl";
}

/** Throws Pca3dError when the browser has no WebGL 2, and an Error for a defect of the caller. */
export function createPca3d(
  element: HTMLElement,
  data: Pca3dData,
  events?: Pca3dEvents,
): Pca3dHandle;
```

`createPca3d` and `update` throw an `Error`, a defect of the caller, for
the defects of the scatter's check (`scatter.md`, "The TypeScript
interface"), with `z` among the arrays of one length; `rotate` and
`zoom` for an angle or a factor that is not finite, or a factor of 0 or
less; and every function of the handle after `destroy`, but `destroy`,
as the base's do (`plot2d.md`). `toSVG` and `toPNG` of a plot never
drawn, whose element never had a size, are the base's defect too.

The projection, plain arithmetic over typed arrays, with no WebGL and no
import of three.js:

```ts
// src/charts/project.ts
/**
 * Projects `positions`, x, y and z per point in the units of the scene,
 * with `viewProjection`, the camera's projection times its view, 16
 * numbers in the column-major order of three.js, onto an element of
 * `width` by `height` CSS pixels: `xy` gets x and y in pixels from the
 * top left, two per point, and `depth` from −1, the nearest, to 1, the
 * farthest, one per point. A NaN position gives NaN.
 */
export function projectToScreen(
  positions: Float32Array,
  viewProjection: ArrayLike<number>,
  width: number,
  height: number,
  xy: Float32Array,
  depth: Float32Array,
): void;
```

## The cases

- **No point with three finite coordinates**: the three lines are drawn
  from −1 to 1 and no point; the screen says why.
- **An `update` while the view is turned**, to another colouring, a
  highlight or other components: the view stays; the labels of the
  lines change with the components.
- **An element with no size**, a tab that is hidden: nothing is rendered
  and the next size renders; `toSVG` exports the last view.
- **The context lost while the user exports**: `toSVG` and `toPNG` work,
  since they read no canvas.
- **React's double mount in development** (`react.md`): the first
  `destroy` loses its context with `forceContextLoss`, and the second
  mount makes a new one; a browser allows a few contexts at once
  (`charts.md`), and two are within it.
- **A name with markup in it**: shown as text in the tooltip, the
  hidden title and description, the labels and the legend of the file.
- **Many groups**: as the scatter's; each group is a `Points` object
  and a texture, a thousand at most.

## How it runs

On the page, in the main thread, with the graphics card drawing. The
plot keeps the positions, 12 bytes per point, the projected positions,
another 12, 225 KB for 9,381 points, one texture of 32 by 32 pixels per
group, and one WebGL context. It renders only after a change
(`charts.md`), and a projection of 9,381 points for the hover is a loop
of about 150,000 multiplications, under a millisecond.

## How it is verified

At `projectToScreen`, `createPca3d` and its handle, and at the pure
functions the plot is built from: the positions and their scale, the
angles of each view, and the order of the exported paths.

**In the project `charts` of Vitest**, where three.js runs as arithmetic
with no WebGL:

- `projectToScreen` with the matrix of an `OrthographicCamera(−2, 2, 1,
  −1, 0.1, 10)` of three.js at (0, 0, 5) looking at the origin, onto
  400 by 200 pixels: (0, 0, 0) at (200, 100), (2, 1, 0) at (400, 0),
  (−1, −0.5, 0) at (100, 150), and (0, 0, 1) nearer than (0, 0, −1); and
  for 100 points drawn by fast-check, the pixels that three.js's own
  `Vector3.project` gives, within 0.001 pixel.
- The positions: for x `[1, −4, NaN]`, y `[2, 0, 1]`, z `[0, 2, 3]`, the
  scale 1/4, two positions, (0.25, 0.5, 0) and (−1, 0, 0.5), and the
  index `[0, 1]`.
- The views: after the view along component 2, the first component
  projects to the right of the centre and the second above it; along
  component 0, the second to the right and the third above; along
  component 1, the first to the right and the third above; a
  `rotate("horizontal", 15)` from the top stays at the top.
- The order of the export: three points of groups A, B and A, from far
  to near, give three paths, A, B and A, in that order; with B
  highlighted, one path of A's two points from far to near, then B's.
- Each defect of "The TypeScript interface" throws.
- Under jsdom, which gives no WebGL, `createPca3d` throws a `Pca3dError`
  of kind `noWebGl` and leaves the element with no child.

**In Playwright, in Chromium, Firefox and WebKit**, on the page of the
tests of the plots, `e2e/plots.html`, which draws the 3D plot of the
scatter's 9,381 points with a third coordinate:

- the plot draws: its canvas holds pixels other than the background at
  the projected place of three points, read from a screenshot of the
  element;
- a drag across it and a `rotate("vertical", 15)` each move the points
  of `toSVG`; after `viewAlong(2)` the order of the points across and up
  in `toSVG` is the order of their first and second coordinates;
- the pointer over the projected place of point 0 shows its tooltip and
  calls `onHover(0)`;
- a loss of the context forced with `WEBGL_lose_context`, then its
  restore, calls `onContextChange(true)` then `(false)`, and the plot
  draws again (`charts.md`);
- a change of `data-theme` on `<html>` draws the lines in the colour of
  the new theme, read from a screenshot;
- `toSVG` has no `var(` and holds the legend; `toPNG(3)` of a plot of
  600 by 450 is 1,800 by 1,350 pixels;
- after `destroy`, no canvas is left in the element, and the context of
  the old canvas reports itself lost.

**What the headless engines give for WebGL is not known.** `testing.md`
says nothing of it, and Playwright runs the three engines headless,
with no screen, on the owner's Mac and on the Linux of GitHub's runners,
where there is no graphics card and WebGL, when it is given, is drawn by
the processor. The first work package of the plot runs the tests above
in each engine, on the Mac and on CI when `main` is pushed, and writes
into this spec and into `testing.md` which engines give WebGL where. In
an engine that gives none, those tests are reported as not run for that
reason, and not as passed, as `testing.md` asks of a check that could
not be run; and the test of the words of "When the browser has no WebGL"
runs there.

**The file of its own**, in the flows of the PCA (`pca.md`): opening the
PCA in 2D downloads no file of `pca3d`, and pressing 3D downloads one,
as the requests of the page show in Playwright; and the first script of
`popgen.html` in `dist/` holds no text of three.js, such as
"WebGLRenderer".

The 3D view, in both themes, with a group highlighted, is in the screens
of `e2e/screens.spec.ts`, looked at as `testing.md` says, where the
engine of the screens gives WebGL.

**The dependencies it adds**, none yet in `package.json`: `three`
0.186.1, which is r186, and for development `@types/three` 0.186.0, the
versions of `npm view` on 27 September 2026, which the owner took on 24
September 2026 (`docs/technology.md`, section 2). `@types/three` brings
six packages for development, which the owner has not been asked for
(`.claude/skills/coding/SKILL.md`, "Dependencies"):
`@dimforge/rapier3d-compat` 0.12.0, a physics engine of 7.5 MB unpacked
whose types the types of three.js name; `fflate` 0.8.3;
`meshoptimizer` 1.1.1; `@tweenjs/tween.js` 23.1.3; `@types/webxr`
0.5.24; and `@types/stats.js` 0.17.4. None reaches the site. three.js
itself depends on nothing.

## What this spec assumes of other specs

Of `docs/specs/analyses/pca.md`: the switch between 2D and 3D, the
option `view` saved in the project; the one function that gives the
scatter and the 3D plot their data; the bar with the buttons of the
table above, the words of loading, of a failed load, of no WebGL and of
a lost context, and where each is shown; the `import()` of `pca3d.ts`
when 3D is first shown, and the plot destroyed when the user switches
to 2D; the description of the 3D view; the legend and its highlight,
shared with the scatter.

Of `docs/specs/charts/scatter.md`: `PointColours`, `groupMark`,
`symbolPath`, `SYMBOL_AREA`, `legendOf`, `drawLegendSvg`,
`nearestPoint` and `tooltipLines`, and the rings of no group.

## What this spec asks of other documents

- `.claude/skills/coding/charts.md`, "The 3D PCA with three.js", not
  edited by this spec: the data as three columns and `PointColours`, not
  the projections whole; the words of a lost context shown by the
  screen through `onContextChange`, not by the plot; `projectToScreen`
  with the matrix as 16 numbers, the pixels and the depth apart, so that
  it imports nothing of three.js; the exported points in one order of
  depth for every group; no pan; three.js r186 needs WebGL 2, and a
  browser without it gets a `Pca3dError`; the versions, three 0.186.1
  and `@types/three` 0.186.0, and the six packages the latter brings.
- `.claude/skills/coding/testing.md`: what each headless engine gives for
  WebGL, on the Mac and on CI, once the first work package has seen it.
- `docs/architecture.md`, section 9: `project.ts` in the list of
  `src/charts`.
- `docs/architecture.md`, section 11, for the orchestrator to weigh: a
  page opened before a deploy that later downloads a file of the build,
  the file of three.js here, and also the files wasm, which the light
  worker loads the first time an xlsx is read, finds it gone. Nothing
  in the architecture says what the user sees then; this spec gives the
  words for the 3D view alone.

## Open points

1. **Whether the wheel of the mouse zooms the 3D view.** `OrbitControls`
   zooms with the wheel and stops the page from scrolling while the
   pointer is over the plot (`OrbitControls.js` of three 0.186.1, line
   503, its listener of the wheel not passive). So a user who scrolls
   down the panel with the pointer over the plot zooms the plot
   instead, until the pointer leaves it, and a plot 48rem wide, the
   largest, is most of the width of a laptop's window.
   - Keep the wheel, as `charts.md` has it: the zoom most users of 3D
     plots expect, and the trap above.
   - Zoom by the buttons and by pinching alone, the wheel scrolling the
     page: no trap, and a zoom that takes a press per step on a
     computer.
   - Zoom by the wheel with the Ctrl key held, as maps in a page do, the
     wheel alone scrolling the page. A pinch on the trackpad of a Mac
     reaches the page as a wheel with Ctrl held, so it zooms too. A few
     lines of our own, since `OrbitControls` has no such setting: a
     listener of the wheel on the element, before the canvas, that stops
     a wheel without Ctrl from reaching the controls. Ctrl and the wheel
     over the plot then no longer enlarge the page, as they do elsewhere,
     and the user is told of the key in the help.

   Recommended: the wheel with Ctrl, meanwhile, since the trap is met at
   every scroll, and a zoom by the wheel and by the trackpad is kept.
   `OrbitControls` turns off its wheel and its pinch together, with
   `enableZoom`, so the second option is the same few lines, letting no
   wheel through.

## Not in this spec

- The lasso, which is not in stage 4 (`charts.md`, "The lasso, later").
- The switch between 2D and 3D, the bar and the legend as components of
  the screen: `pca.md`.
- `WebGPURenderer`, which `charts.md` leaves for when it is the default
  of three.js.
