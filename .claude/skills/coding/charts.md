# The plots: D3 and three.js in `src/charts`

Read this before writing or changing anything in `src/charts`. It was
written in September 2026, before any plot existed, from the docs of D3
7.9 and its modules, of three.js r186, from MDN and from the W3C. What
the walking skeleton and the first plots find to be different is
corrected here.

The plots are listed in `docs/functionality.md`: histograms, scatter
plots, the QQ plot, line plots, the heatmap of Fst, the Manhattan plot,
and the PCA in three dimensions. `docs/architecture.md`, section 7, gives
their shape: a plot is a function that takes an element and the data and
returns a handle. How a screen mounts it is in `react.md`; the tokens it
reads are in `css.md`; how it is tested is in `testing.md`.

## The contract of a plot

```ts
// src/charts/types.ts
export interface ChartHandle<Data> {
  /** Draws new data in the same element, with no flash and no new element. */
  update(data: Data): void;
  /** Removes everything the plot added and every listener; safe to call twice. */
  destroy(): void;
  /** The plot as it is on the screen, as a file that stands alone. */
  toSVG(): string;
  /** The same, as PNG, at `scale` times the size on the screen. */
  toPNG(scale: 2 | 3): Promise<Blob>;
}

export type Chart<Data, Events = object> = (
  element: HTMLElement,
  data: Data,
  events?: Events,
) => ChartHandle<Data>;

// src/charts/scatter.ts
export interface ScatterData {
  readonly title: string;              // the <title> of the SVG
  readonly description: string;        // the <desc>, written by the screen
  readonly xLabel: string;
  readonly yLabel: string;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly group: Uint16Array;         // index into groupNames, one per point
  readonly groupNames: readonly string[];
  readonly pointNames: readonly string[]; // for the tooltip
}
export interface ScatterEvents {
  onHover?(point: number | null): void;
}
export const createScatter: Chart<ScatterData, ScatterEvents> = ...
```

- **One function per kind of plot, `createX`, in its own file.** The
  handle is a closure over the state of that plot, not a class: nothing
  outside can reach into it, and there is no `this` to lose when a method
  is passed as a callback.
- **Everything the plot draws is in `Data`**, the labels, the title and
  the description included. The plot has no options object beside it, so
  `update` is the only way anything changes, and a plot drawn from the
  same data is the same plot. Callbacks, which do not change what is
  drawn, go in `events`, given once.
- **The data are typed arrays and names, never the project, never a
  result of popnei.** `src/charts` imports nothing from `src/core`, from
  `src/ui` or from the wasm package (architecture, section 9), so a plot
  can be tested with a few literal arrays and reused by the report. The
  screen, or the definition of the analysis, turns a result into the data
  of its plot: from `PcaResult.projections`, `numComps` wide and row after
  row, it takes the two columns the user chose; from `StatsDistrib`, the
  edges and the counts of one population, at `p * numBins + b`.
- **The plot draws what it is given and reduces nothing.** A histogram
  gets its bins, the LD decay its binned means, the Manhattan and the QQ
  plot points already thinned (below). Binning, clustering the order of
  the heatmap and thinning are calculations, and calculations are in Rust
  where Python gets the same ones.
- **A value that cannot be drawn, NaN or an infinity, is not drawn and is
  not silently dropped either.** The plot skips it, and the screen, which
  knows what it means, says how many there were. The data of a plot say
  in their doc comment what a NaN is.
- **`update` keeps the element, the SVG and the listeners**, and redraws
  inside them. A screen whose data change calls `update`; it calls
  `destroy` and the function again only when the kind of plot changes.
- **`destroy` leaves the element as it found it**: no child, no listener,
  no `ResizeObserver`, no WebGL context. It can be called twice, because
  React in development mounts every effect, removes it and mounts it
  again (`react.md`).
- **The plot never sets the size of its element.** The element gets its
  size from CSS, a width from its container and a height or an
  `aspect-ratio` (`css.md`); the plot reads it. A plot that set the size
  it observes would loop.
- A plot does not throw for data it can draw. It throws an `Error` for a
  defect of the caller, arrays of different lengths, a group index beyond
  the names, more points than it can draw, because those are bugs to find,
  not states to show.

## D3, one module at a time

D3 is imported as its modules, not as the `d3` package:

| module | version | for |
|---|---|---|
| `d3-selection` | 3.0.0 | the DOM: select, append, attr, join, `pointer` |
| `d3-scale` | 4.0.2 | linear, log, band and ordinal scales |
| `d3-axis` | 3.0.0 | axes |
| `d3-shape` | 3.2.0 | lines, areas, symbols |
| `d3-path` | 3.1.0 | the paths the symbols of the points are drawn into |
| `d3-array` | 3.2.4 | `extent`, `ticks`, `bisect` |
| `d3-format` | 3.1.2 | the numbers of the ticks and the tooltips |
| `d3-zoom` | 3.0.0 | zoom and pan of the Manhattan and the scatter |
| `d3-delaunay` | 6.0.4 | the nearest point under the pointer |
| `d3-scale-chromatic` | 3.1.0 | viridis, for continuous colours |

Each with its `@types/d3-*`, and three.js with `@types/three`, since it
ships no types of its own. The versions are those of `npm view` on 24
September 2026; D3 moves slowly, and a new major version of a module is
read in its changelog before it is taken. `d3-brush`, to select a region,
and `d3-polygon`, for the lasso, are added when a plot first needs them,
each a new dependency for the owner to take. The owner took D3 as these
modules, `d3-path` among them, with their `@types/d3-*`, and
`@types/three`, on 24 September 2026 (`docs/technology.md`, section 2).

The reason is the bundle and the list of dependencies. The `d3` package,
7.9.0, brings every module, geography, forces, CSV parsing, and while a
bundler drops much of what is not imported, `package.json` then says
nothing about what the plots use. Named modules make the dependency
explicit, and an upgrade of one is a change of one line.

No `d3-transition`. An animated plot rarely tells a scientist more than
a still one, and an export taken in the middle of a transition would
write a state that never was. If a plot needs one later, it is added
then.

## Drawing: the join, and when to use a loop

`selection.join` is the way to draw a set of elements that have an
identity and change with `update`: the bars of a histogram, the cells of
the heatmap, the entries of the legend, the lines of the thresholds. Key
it by what the element is, `(d) => d.name`, not by its index, so that a
population that disappears removes its entry and does not relabel the
next one.

```ts
legend
  .selectAll<SVGGElement, LegendEntry>("g.chart-legend-entry")
  .data(entries, (d) => d.name)
  .join((enter) => {
    const g = enter.append("g").attr("class", "chart-legend-entry");
    g.append("path");
    g.append("text");
    return g;
  })
  .attr("transform", (_d, i) => `translate(0,${i * LEGEND_ROW})`);
```

The points are not drawn that way. A join makes one element and one
JavaScript object per point, and a Manhattan plot has tens of thousands of
points: the DOM grows with them, and so does the time to draw, to zoom and
to export. So the points of one group are **one `<path>`**, whose `d` is
built by a plain loop over the typed arrays, each point a small symbol at
its position:

```ts
for (let i = 0; i < x.length; i++) {
  if (group[i] !== g) continue;
  const px = xScale(x[i]), py = yScale(y[i]);
  if (!Number.isFinite(px) || !Number.isFinite(py)) continue;
  drawSymbolAt(path, symbolOf(g), SYMBOL_AREA, px, py); // d3-path with an offset
}
```

`drawSymbolAt` lives in `src/charts/marks.ts`: it draws a `d3-shape`
symbol type into a `d3-path` through a context that adds the offset, so
the path is vectors, exports as vectors, and costs one element per group.
The hover does not need an element per point either (below).

The rule: a join for tens or hundreds of things with an identity, a loop
into a path for thousands of marks of one kind.

A scale is rebuilt from the data and the size on every draw; it is
cheap, and a scale kept from before is how a plot ends up showing the new
data against the old axis.

## The SVG, its parts and their names

Every 2D plot has the same skeleton, so that the export, the tests and
the CSS find the same parts:

```
<svg class="chart chart-scatter" role="img" aria-labelledby="chart3-title chart3-desc"
     viewBox="0 0 W H" width="W" height="H">
  <title id="chart3-title">…</title>
  <desc id="chart3-desc">…</desc>
  <defs><clipPath id="chart3-clip"><rect …/></clipPath></defs>
  <g class="chart-frame" transform="translate(left,top)">
    <g class="chart-grid"/>
    <g class="chart-axis chart-axis-x" transform="translate(0,innerHeight)"/>
    <g class="chart-axis chart-axis-y"/>
    <g class="chart-marks" clip-path="url(#chart3-clip)">
      <path class="chart-points chart-group-0" d="…"/> …
    </g>
    <g class="chart-annotations"/>      thresholds, λ, the line y = x of the QQ plot
    <text class="chart-axis-label chart-axis-label-x"/> …
    <rect class="chart-overlay"/>       transparent, takes the pointer events
  </g>
  <g class="chart-legend"/>
</svg>
```

- The classes start with `chart-` and are plain global classes of
  `src/charts/charts.css`, not a CSS Module: D3 writes them as strings,
  the tests select by them, and an exported file keeps names a person
  can read.
- The ids of an SVG are unique in the page, because several plots are on
  one screen and `aria-labelledby` and `clip-path` look ids up in the
  whole document. Each plot takes a prefix from a counter in
  `src/charts/ids.ts` when it is created.
- `width` and `height` are the size in CSS pixels at the last draw, and
  the `viewBox` is the same: one unit is one pixel, so a stroke of 1 is
  one pixel on the screen and in the file.

### The margins

The frame follows the margin convention of D3: the SVG is the whole
size, a `margin` of `{ top, right, bottom, left }` holds the axes and
their labels, and everything else is drawn in the `chart-frame` group,
translated by the margin, over `innerWidth` by `innerHeight`. The ranges
of the scales are `[0, innerWidth]` and `[innerHeight, 0]`. The margins
of each kind of plot are a named constant in its file. They are fixed,
not measured from the labels, while the labels fit; measuring text in
the DOM needs the font loaded and does not work in the unit tests.

## Accessibility

A plot is an image to a screen reader, and has to say what it shows:

- **`role="img"` on the SVG, with `aria-labelledby` naming its `<title>`
  and `<desc>`.** An SVG has the role `graphics-document` by default, and
  what screen readers do with the `<title>` and `<desc>` of it varies;
  `role="img"` with `aria-labelledby` is read the same way in every one.
  The title names the plot, "PCA of the individuals, PC1 and PC2". The
  description sums it up, "342 individuals in 5 populations; PC1 explains
  12.3% of the variance and PC2 8.1%", and the screen writes it, because
  it knows what the numbers mean.
- **The data are also a table.** A description cannot hold a thousand
  points. Every plot of the applications has a table beside it, which
  the functionality asks for anyway (every table downloadable as CSV);
  the screen links the plot to it. That table is also the way in for the
  keyboard: the points are not focusable, because a few thousand tab stops
  are no use to anyone.
- **Not colour alone** (WCAG 1.4.1). The groups differ in colour and in
  shape, and the legend shows both. Group `i` has colour `i % 7` and
  shape `(i + Math.floor(i / 7)) % 7`, out of the seven filled symbols of
  `d3-shape` (`symbolsFill`), so the first seven groups differ in both
  and 49 groups have 49 different marks. Where there is room, a group is
  labelled on the plot as well, as the lines of the LD decay are at their
  ends.
- **A palette that people with a colour vision deficiency can tell
  apart**: the seven colours of Okabe and Ito, without black, as the
  tokens `--chart-cat-1` to `--chart-cat-7` (`css.md`). A continuous
  value, a trait on the PCA, the heatmap of Fst, is coloured with
  viridis, which is uniform to the eye, readable without colour and
  printable in grey.
- **Contrast**: the ratios are those of `css.md`, "Contrast and colour",
  and the tokens of the plots are checked there, not in each plot. Three
  of the colours of Okabe and Ito are below 3:1 on the light background,
  orange 2.25:1, sky blue 2.31:1 and yellow 1.32:1, so every mark of a
  group has a 1 px outline in `--chart-axis`, which gives its edge the
  contrast the fill does not.

## Colours, themes and the exported file

The plot never writes a colour. It writes classes, and `charts.css` gives
the classes their colours from the tokens:

```css
.chart-axis { color: var(--chart-axis); }          /* d3-axis draws in currentColor */
.chart-group-0 { fill: var(--chart-cat-1); stroke: var(--chart-axis); stroke-width: 1px; }
.chart-threshold { stroke: var(--chart-threshold); stroke-dasharray: 4 3; }
```

So the dark theme is a change of the tokens, and a plot on the screen
follows it with no redraw.

An exported SVG cannot depend on a stylesheet it does not carry: opened
in Inkscape, in a journal's system or in the report, it has none of the
page's CSS. So `toSVG`, in `src/charts/export.ts`:

1. Clones the SVG.
2. Walks the original and the clone together, and writes on each element
   of the clone, as a `style` attribute, the computed values of a fixed
   list of properties: `fill`, `fill-opacity`, `stroke`, `stroke-width`,
   `stroke-dasharray`, `stroke-opacity`, `opacity`, `color`,
   `font-family`, `font-size`, `font-weight`, `text-anchor`,
   `dominant-baseline`. `getComputedStyle` returns them resolved, with no
   `var()` left. The classes stay, as names.
3. Removes `chart-overlay`, and adds a first `<rect>` of the background
   colour, since a transparent plot on a dark slide is unreadable.
4. Serialises it with `XMLSerializer`, which escapes the text and writes
   the SVG namespace.

The exported file is always in the light theme, whatever the screen
shows, because it goes to papers and to print. To get light computed
values while the screen is dark, the clone is resolved inside a hidden
container with `data-theme="light"`, so `css.md` defines the light tokens
on `:root, [data-theme="light"]` and not on `:root` alone.

### Fonts

While the application uses the fonts of the system (`css.md`, "Fonts"),
the exported SVG names a generic stack, `system-ui, "Helvetica",
"Arial", sans-serif`, and embeds nothing: an SVG drawn as an image, as
the PNG is made, may use the fonts installed on the machine, and only
cannot fetch a file.

When the owner chooses a typeface, the SVG names it first, before the
same stack, and embeds it, as a `@font-face` with a `data:` URL of its
WOFF2 file, subset to Latin, in a `<style>` of the SVG. The reason is the
PNG: an SVG drawn as an image loads nothing from outside, fonts included,
and without the font inlined the PNG would fall back to another one and
the labels would no longer fit. Programs that ignore an embedded font,
Illustrator among them, fall back to Helvetica, which fits closely
enough.

Text is measured and exported only after `document.fonts.ready`.

### PNG

`toPNG(scale)` draws the SVG of `toSVG` on a canvas:

```ts
const svg = toSVG();
const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
try {
  const img = new Image();
  img.src = url;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("The browser gave no canvas to draw the PNG on");
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("The PNG could not be made"))),
      "image/png",
    ),
  );
} finally {
  URL.revokeObjectURL(url);
}
```

The SVG is vectors, so drawing it at 2 or 3 times its
size is sharp, not an enlarged bitmap. 2 is for slides, 3 for print at
300 dpi of a plot a few inches wide. A canvas above its limits draws
nothing and says nothing, and on iOS the limit is 4096 by 4096 pixels, so
the export checks the size before it draws and refuses with a message
above it. The SVG holds no `<foreignObject>`, which would taint the
canvas in Safari and make `toBlob` throw.

## Size: responsive with `ResizeObserver`

Each plot observes its own element with a `ResizeObserver`, created in
the function and disconnected in `destroy`. The window's `resize` event
is not used, because a container changes size without the window, when a
drawer opens or a panel collapses.

- The callback reads `contentRect`, and, if the size changed, schedules
  one draw with `requestAnimationFrame`. A drag of the window gives many
  callbacks, and one draw per frame is all the eye sees.
- A draw after a resize rebuilds the scales and redraws the positions:
  axes, the `d` of the paths, the clip. The data join does not run again,
  since nothing entered or left.
- A plot whose element has no size, a tab that is hidden, draws nothing
  and waits for the next callback.

## Hover and tooltips

- **One transparent `chart-overlay` rect takes the pointer events**, not
  the marks, which are paths of many points. On `pointermove`, the plot
  takes the position with `pointer(event, frame)` from `d3-selection`,
  and finds the nearest point with a `Delaunay` of `d3-delaunay`, built
  once from the pixel positions at each draw: `delaunay.find(px, py)` is
  fast for any number of points. A point further than a few pixels is no
  point.
- **The tooltip is one HTML `<div>`** that the plot adds to its element,
  positioned absolutely, and removes in `destroy`. HTML and not SVG,
  because it wraps text and is not part of the exported plot. The element
  is `position: relative` in `css.md`.
- **The text of the tooltip is set with `textContent`, never
  `innerHTML`.** The names of the individuals and of the populations come
  from the files of the user, and a name with `<img onerror=…>` in it
  would run in the page.
- The point under the pointer is marked with one extra element, drawn
  over the others, and `events.onHover` is called with its index or with
  `null`, so that a screen can highlight the row of the table.
- On touch, a tap shows the tooltip of the nearest point, and a tap
  elsewhere hides it; `pointer` events cover mouse and touch alike.

## What SVG can draw: the budget and the thinning of the Manhattan plot

SVG keeps every mark in the DOM, which is what makes it exportable as
vectors and what limits it. The limit is in the number of marks and of
elements; with the points as one path per group, as above, tens of
thousands of points draw well. How many exactly, and how long a draw
takes, is measured in the walking skeleton on the three engines and
written here; until then the budget is `MAX_SVG_POINTS = 50_000` in
`src/charts/limits.ts`, and a plot given more throws.

The Manhattan plot and the QQ plot of a GWAS have up to a million
p values, so they get their points already thinned, in Rust, beside the
calculation (`docs/technology.md`). The contract between the thinning and
the plot:

- **Every variant with p below the threshold, 10⁻³ by default, is in the
  data**, so no hit is ever missing from the plot.
- **The others are thinned** to what cannot be told apart at the size of
  a plot, a grid over the genome and over −log10 p that keeps one point
  per cell. The grid is fixed in Rust, not the size of the screen, so that
  a result in the cache does not depend on the window it was first shown
  in. The method and the grid are open point 3 of `docs/technology.md`.
- **The data say how many variants there were and how many are drawn**,
  and the description of the plot says it: "12,480 of 1,203,554 variants
  drawn; every variant with p < 10⁻³".
- **The plot gets −log10 p, not p**, computed in Rust, where a p value
  below the smallest `f64` can be given as the −log10 of its log. A value
  that is still infinite is drawn at the top of the axis with a mark of
  its own, and never dropped.
- The chromosomes come as an index per point into the names, and the
  position on the x axis as the position within the chromosome; the
  plot lays the chromosomes one after the other, from their lengths,
  which are in the data.

Zooming into a region of the Manhattan plot shows only the thinned
points of that region; whether a zoom asks the worker for the full points
of the region is an open point.

The zoom, where a plot has one, is `d3-zoom`: on each zoom event the
plot rescales with `transform.rescaleX(x)` and rebuilds the paths, one
draw per frame. It does not scale the frame with a CSS or SVG transform,
which would scale the size of the points and the width of the lines as
well. The extent of the zoom is set again after every resize.

## The 3D PCA with three.js

`src/charts/pca3d.ts` has the same contract as every plot: `createPca3d(
element, data, events)` returns the handle. three.js r186 is imported by
name from `three`, and `OrbitControls` from
`three/addons/controls/OrbitControls.js`.

### The data and the scene

The data are the projections as popnei gives them, `numComps` wide and
row after row, the three components to show, the groups and their names,
and for each axis its label with the variance it explains. The plot
copies the three columns into one `Float32Array` of positions for a
`BufferGeometry`, which is what the GPU takes, and uses one scale for the
three axes, so that the spread along each component is shown as it is.

The points of each group are one `Points` object whose material is a
`PointsMaterial` with `sizeAttenuation: false`, so that a point is the
same size in pixels near and far, and a `map` of that group's symbol:
the same `d3-shape` symbol as in 2D, drawn once on a small canvas into a
`CanvasTexture`, with `alphaTest` to cut its edge. So the groups differ in
shape in 3D as in 2D, and the legend, which is HTML beside the canvas,
shows the same marks. The axes are three lines, and their labels are HTML
elements placed at the projected ends of the axes after each render.

### Renderer, camera and controls

- **`WebGLRenderer`, not `WebGPURenderer`.** The WebGL renderer is the
  mature one, every browser popnei supports has WebGL
  (`docs/technology.md`), and a few thousand points gain nothing from
  WebGPU. `WebGPURenderer`, which falls back to WebGL 2, can be tried when
  it is the default of three.js; the plot's code outside the renderer
  would not change.
- **An `OrthographicCamera`.** In a perspective the points nearer the
  camera spread further apart, and distances in a PCA are what the user
  reads; with an orthographic camera, looking down an axis shows exactly
  the 2D plot of the other two. The depth comes from turning it.
- **`OrbitControls`**, the standard controls of three.js: drag to turn,
  wheel to zoom, right drag to pan. It keeps one axis up, which is less
  free than `TrackballControls` and much less disorienting. No damping,
  so that the scene can be drawn only when something changes.
- **Turning without dragging.** A user who cannot drag turns the view
  with buttons beside the plot, and WCAG 2.5.7 asks for them. The handle
  of `pca3d` has two more functions, `rotate(axis, degrees)`, which turns
  by a fixed step, and `viewAlong(axis)`, which looks down one component
  and so shows the 2D plot of the other two. The screen spec lists the
  buttons.
- **Render on demand.** There is no animation loop: the plot renders
  after `update`, after a resize and on the `change` event of the
  controls. A loop at 60 frames a second for a still scene spends the
  battery of a laptop for nothing.

### Picking the point under the pointer

For a few thousand points, the plot projects every point to the screen
and takes the nearest, not the `Raycaster`, not GPU picking:

- `Raycaster` tests points against a threshold in world units, but the
  points are drawn in pixels, so what is hit and what is seen differ as
  the zoom changes.
- GPU picking, drawing every point in a colour that encodes its index to
  a 1x1 render target and reading it back, is for scenes of millions of
  points or of meshes; it doubles the drawing code and adds a render
  target to dispose of.
- Projecting a few thousand points with the camera is a loop of a few
  thousand multiplications, well under a millisecond, and gives the
  distance in pixels, which is what the user sees. Among the points within
  a few pixels, the nearest to the camera wins.

The projection is one function, `projectToScreen(positions, camera,
width, height, out)` in `src/charts/project.ts`, and it serves four
uses: the hover, the labels of the axes, `toSVG` and, later, the lasso.
It is plain arithmetic over typed arrays and the camera's matrices, so it
is tested in Vitest without WebGL.

### Export of the 3D plot

`toSVG` writes the current view as a 2D SVG: the points projected with
`projectToScreen`, sorted from far to near so the nearer ones are drawn on
top, each as its symbol in its group's path, with the axes and the legend,
through the same `export.ts` as the other plots. So the 3D plot exports as
vectors, and `toPNG` draws that SVG on a canvas like every other plot, at
any scale, with no `preserveDrawingBuffer` and no reading of the WebGL
canvas.

### Resizing and the pixel ratio

On a resize, `renderer.setSize(width, height, false)`, the `false` so
that three.js does not write the size of the canvas into its CSS, which
is the element's; then the frustum of the camera from the new aspect,
`camera.updateProjectionMatrix()`, and a render. The pixel ratio is
`renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`, read again on
every resize, because a window moved to another screen changes it; above
2 the points look no sharper and the GPU draws more than twice as many
pixels.

### `destroy`, and why every piece is disposed

three.js creates buffers, shaders and textures on the GPU, and the
garbage collector does not free them; the manual says so. A PCA drawn
again after each change of colour, left undisposed, fills the memory of
the GPU. `destroy` therefore:

1. Disconnects the `ResizeObserver` and removes the listeners of the
   canvas.
2. Calls `controls.dispose()`, which removes its listeners.
3. Calls `dispose()` on every geometry, every material and every texture
   the plot created. The plot keeps a list of them as it creates them,
   rather than walking the scene afterwards, so none is forgotten.
4. Calls `renderer.dispose()` and then `renderer.forceContextLoss()`.
   `dispose` frees what three.js holds, but the browser keeps the WebGL
   context until it is collected, and a browser allows only a few
   contexts at once, dropping the oldest when a new one is made. A user
   who goes back and forth between screens would lose the plot of the PCA
   to that limit.
5. Removes the canvas, the labels and the tooltip.

`update` with new data replaces the positions of the geometry, or makes
new geometries and disposes of the old ones; it never makes a new
renderer.

### A change of theme

The 2D plots follow the tokens with no redraw, but the 3D plot draws its
symbols into textures and gives colours to its materials, which do not
read CSS. So `pca3d` watches `prefers-color-scheme` and the `data-theme`
attribute of `<html>`, and on a change draws its textures again from the
tokens and renders.

### Losing the WebGL context

The browser can take the context away, when the GPU resets, when the
driver updates, or when too many contexts are open. three.js listens for
`webglcontextlost` and `webglcontextrestored` on its canvas and rebuilds
its state on restore. The plot also listens: on loss it shows a short
message over the canvas, "The 3D view was lost by the browser", instead
of a canvas that stays black; on restore it hides it and renders again.
A test forces a loss with the `WEBGL_lose_context` extension
(`renderer.forceContextLoss()`) and a restore, and sees the plot come
back (`testing.md`).

### The lasso, later

Not in the first version. When it comes: a mode in which the controls
are off, `controls.enabled = false`; the pointer draws a polygon in
screen pixels; the points inside it are those whose `projectToScreen`
position `polygonContains` of `d3-polygon` accepts; and the plot calls
`events.onSelect(indices: Uint32Array)`. The plot selects and nothing
more; the screen turns the selection into a command on the populations
of the project. The same would serve a lasso on the 2D scatter.

## Testing the plots

The code of a plot is split so that most of it needs no browser:

- **Pure functions, tested in Vitest with no DOM**: the scales and their
  domains from the data, the path strings from typed arrays, the colour
  and shape of each group, `projectToScreen`, the checks of the contract
  (lengths, group indices, the budget), the layout of the chromosomes of
  the Manhattan plot. Most of the logic of a plot is here, and here is
  where the numbers are asserted.
- **The SVG, in Vitest with a DOM, jsdom (`testing.md`)**: the skeleton is there with its classes, `role="img"`, the
  `<title>` and `<desc>` with unique ids, one path per group, one legend
  entry per group after an `update` that removed one, a name with markup
  in it shown as text, `destroy` leaving the element empty and working
  twice. These DOMs have no layout, no `getBBox`, no `ResizeObserver`,
  no canvas and no WebGL, so the test gives the size and stubs the
  observer; and they resolve custom properties only partly, so the
  inlining of the export is not tested there.
- **Playwright, in Chromium, Firefox and WebKit**: the exported SVG with
  no `var(` and no dependency on the page, and its PNG at the right size
  in pixels; the hover and the tooltip; a resize; the 3D plot rendering,
  turning with the mouse and with its buttons, following a change of
  theme, and surviving a forced loss of context; and, after `destroy`, no
  canvas left.

The states of each plot, in both themes, go into `e2e/screens.spec.ts`
and are looked at, as `testing.md` says. Comparing screenshots pixel by
pixel is not adopted in the first version; `testing.md`, "Visual
regression: later", has why.

## Sources

- D3: https://d3js.org/getting-started, https://d3js.org/d3-selection/joining,
  https://d3js.org/d3-zoom, https://d3js.org/d3-delaunay/delaunay,
  https://d3js.org/d3-shape/symbol, and the margin convention,
  https://observablehq.com/@d3/margin-convention
- three.js: the manual, https://threejs.org/manual/#en/how-to-dispose-of-objects,
  https://threejs.org/manual/#en/responsive,
  https://threejs.org/manual/#en/picking; the docs of `Raycaster`,
  `WebGLRenderer`, `OrbitControls`, `PointsMaterial`; the source of
  `WebGLRenderer` in r186 for the handling of the context loss.
- MDN: `ResizeObserver`, `XMLSerializer`, `HTMLCanvasElement.toBlob`, the
  `<canvas>` element and its maximum size,
  https://developer.mozilla.org/en-US/docs/Web/SVG/Guides/SVG_as_an_image,
  `webglcontextlost` and `WEBGL_lose_context`.
- W3C: the tutorial of complex images, https://www.w3.org/WAI/tutorials/images/complex/;
  WCAG 2.2, 1.4.1 Use of Color, 1.4.3 and 1.4.11 on contrast; the SVG
  Accessibility API Mappings, https://www.w3.org/TR/svg-aam-1.0/.
- The palette: Okabe and Ito, Color Universal Design, https://jfly.uni-koeln.de/color/
