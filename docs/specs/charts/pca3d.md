# The 3D plot of the PCA

Written on 27 September 2026, for stage 4 of `docs/build-order.md`, the
Individuals step and the PCA; revised the same day to agree with the
specs written beside it: the words of the buttons, of the loading, of
the failures and of the description are `docs/specs/analyses/pca.md`'s,
and `.claude/skills/coding/charts.md` and `testing.md` are revised for
it; reviewed the same day, and revised for the review: the third
component kept up, the point under the pointer, the highlight, the size
of the marks, the test for WebGL and the pieces the tests call; and
again after its last review: the zoom set on the camera within limits,
a colouring by values as one object per step of viridis, `Pca3dError`
in a file with no three.js, the bottom of the legend of the exported
file, and what five presses of "Tilt down" show; and when the specs of stage
4 were made to agree, the bounds of the zoom named, `ZOOM_MIN` and
`ZOOM_MAX`; and on 28 September 2026 for two decisions of the owner:
the PCA opens on the 3D view, with the 2D plot drawn in its place when
the browser cannot draw it, and the wheel zooms with the Ctrl key held,
Open 1; and after the final review of stage 4, the same day: the
listener of the wheel in the capture phase, the pinch in Safari, ⌘ and
the zoom of macOS, the test of the wheel, and the file of three.js
requested once the first result is drawn; approved by the owner on 28 September 2026. There is no
code of it yet. This spec gives the function of `src/charts/pca3d.ts`
that draws the individuals on three principal components with three.js,
the library of WebGL the applications take for it
(`docs/technology.md`, section 2), a view the user turns by dragging or
with buttons; and the function of `src/charts/project.ts` that finds
where a point of the view falls on the screen. WebGL is the part of the
browser that draws with the graphics card; the 2D plots do not use it.

The words of the web of `docs/specs/charts/scatter.md`, the SVG, the
base, the handle, React, React Aria, the screen reader, the focus and
WCAG 2.2, are used here as it defines them, and three more. A **canvas**
is an element of the page that holds pixels and no elements, which
three.js draws into and a screen reader cannot see into. A **WebGL
context** is what the browser gives a canvas to draw on with WebGL; a
browser gives a page only a few at once, and can take one away. An **effect** is the code React runs after it has drawn
a screen, the only place where a screen may call a plot, and its
**cleanup** is the code React runs when that screen goes, or before the
effect runs again (`.claude/skills/coding/react.md`, "Mounting a
plot").

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

The PCA opens on the 3D view, as the owner decided on 28 September
2026, and the 2D scatter is one button away, in the bar of controls
above the plot ("The PCA opens on the 3D view" in
`docs/specs/stage-4-open-points.md`). When the browser has no WebGL 2,
or three.js cannot be downloaded, the screen draws the 2D scatter in
its place, with the words of `pca.md` that say why (below, "Loading
three.js" and "When the browser has no WebGL").
In 3D the individuals are shown on the three components of the axes,
PC1, PC2 and PC3 by default (`pca.md`, the option `axes`), each with the
colour and the shape of its group as in 2D, and the same legend over
the top right corner, at the same place as in 2D, `SCATTER_MARGIN.top`
pixels from the top of the element and `SCATTER_MARGIN.right` from its
right (`scatter.md`), so that it does not move when the user switches.
Three lines through the origin, one along each
component over the range of its values, carry at their positive ends
the labels "PC1 (3.55%)", "PC2 (3.40%)" and "PC3 (1.89%)". A label
whose end falls outside the element, as the zoom brings the ends of the
lines out of it, is hidden, and the element clips what it holds, so
that no label is drawn over the controls around the plot or makes the
page scroll sideways; decided on 29 September 2026, after the review of
work package 8 found "PC3 (1.89%)" over a field of the panel after four
presses of "Zoom in", and a page of 320 pixels scrolling to 364. The user turns
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
(`charts.md`). The first component is the x of the scene, the second
its y and the third its z, and the third is kept up (below, "The
view"). `scenePositions` of "The TypeScript interface" makes the
positions, the index and the scale.

The groups are one `Points` object each, with the symbol of the group
drawn on a small canvas as its texture, in its colour with the outline
in `--chart-axis`, the no-group a ring, and the area of a mark on the
screen that of the scatter, `SYMBOL_AREA`, whatever the zoom
(`charts.md`, "The data and the scene"). three.js draws each point of a
`Points` object as a square of a size in CSS pixels, with the texture
on it, so the square has to hold the largest mark: the star of
`d3-shape`, whose tips reach 7.55 pixels from its centre at 64 square
pixels, and 8.05 with half of its outline of 1 pixel, drawn with round
joins as in 2D (`scatter.md`, "The marks of the groups"). The square is
18 pixels a side, and its texture 36 by 36 pixels, for the pixel ratio
of 2 at most (`charts.md`, "Resizing and the pixel ratio"). The texture
is one per mark in use, shared by the groups that have that mark, so 50
at most, the 49 marks and the ring, 259 KB. A colouring by values is
one `Points` object per step of viridis that has points, as the scatter
draws one path per step, each with a texture of a circle in the colour
of its step and its outline, 256 at most, 1.3 MB; and one of the rings
of the points with no value. The option not taken, one object whose
points each carry their colour, `vertexColors`, makes one texture
serve every point, but three.js multiplies the colour of the point
with the texture, the outline with it, so the outline would take the
colour of each point and the pale yellow end of viridis would lose the
edge the outline gives it in 2D.

A highlighted group is drawn over the faded ones wherever they are, as
in 2D. three.js draws every opaque object of a scene before every
transparent one, whatever their `renderOrder`, which orders the objects
only within each of the two lists (`three.module.js` of three 0.186.1,
lines 18025 and 18027). So an opaque highlighted group would be drawn
first, and a faded point nearer the camera would cover it. While a
group is highlighted, every group is transparent to three.js: the faded
ones at an opacity of 0.25, with `depthWrite: false`, so that they hide
nothing drawn after them, and `renderOrder` 0; the highlighted one at an
opacity of 1, with `transparent: true` and `renderOrder` 1, so it is
drawn after all of them and over them, and its own points hide each
other by their depth. With no highlight every group is opaque, and the
points hide each other by their depth alone. The `alphaTest` that cuts
the edge of a mark is half the opacity of its material, 0.5 or 0.125,
since three.js compares it with the alpha of the texture times the
opacity, and a test of 0.5 at an opacity of 0.25 would cut every point
away.

### The view

The camera is orthographic, and the controls are `OrbitControls` of
three.js (`charts.md`, "Renderer, camera and controls"). They turn the
camera about one axis of the scene, which they keep up on the screen:
the one the camera's `up` names when the controls are made, which they
read once, in their constructor (`OrbitControls.js` of three 0.186.1,
line 406). The plot sets `up` to the z of the scene, the third
component, before it makes them. So PC3 is always up, or towards the
top of the screen, and a turn to the left or the right turns the cloud
about PC3.

A view along PC3 is then a view straight down the axis the controls
keep up, which they allow: they keep the angle between the camera and
that axis between 0.000001 radians and π less that, `makeSafe` of
`Spherical.js`, line 87, so the camera is 0.00006° from straight above,
and which way PC1 and PC2 point on the screen is set by the turn of the
camera about PC3. Placed straight above the centre, the camera takes the
turn 0, and PC1 runs across to the right and PC2 up: the 2D plot of the
first two components, as a node script with three 0.186.1 showed on 27
September 2026, with PC3 at the centre within 0.0001 of the width. The
other views along a component are level, with PC3 up: along PC1, the
camera on the positive side of PC1, PC2 runs to the right; along PC2,
the camera on the negative side of PC2, PC1 runs to the right. Each view
so shows the first of its two components growing to the right and the
second growing upwards, as the 2D plot of them does, and none is a
mirror image. `lookAlong` of "The TypeScript interface" puts
the camera for each.

The option not taken was to keep PC2 up. The view along PC3, which is
the 2D plot, would then be level, and a turn to the right from it would
bring PC3 into depth, a natural way to explore from the 2D plot. But
two of the three buttons "View along" would show another picture than
the one they promise: along PC1, PC3 would run across the screen and
PC2 up, where every other view has the third component up; and along
PC2 the camera would look straight down the axis kept up, a view from
above in which a turn to the left or the right spins the plot and
never brings PC3 in. With PC3 up, both of those views are level with
PC3 up, and the 2D plot is the view from straight above, which "View
along PC3" gives, and where a turn spins the 2D plot about its centre. plotly's 3D scatter plots keep their third axis
up in the same way, `scene.camera.up` of (0, 0, 1) by default in its
documentation.

The view starts turned, meanwhile 20° above the plane of PC1 and PC2,
and turned by 30° about PC3 from the view along PC2, so that the three
lines are seen at once; refined in the running application. The option
not taken, starting along the third component, shows the 2D plot of
the first two, and a user would see no depth, and no third component,
until they turned it.
Two settings of the controls are decided here:

- **No pan**, the moving of the view sideways that `OrbitControls`
  gives to the right button and to two fingers: the cloud of a PCA is
  centred on the origin, and a pan has no button to do it for a user who
  cannot drag, which WCAG 2.2 asks of a movement made by dragging
  (success criterion 2.5.7). The zoom is about the centre.
- **The zoom** by the wheel of the mouse and by two fingers pinching,
  with buttons for a user who uses neither (2.5.1 asks a gesture of two
  fingers to have one of a single pointer). The wheel zooms with the
  Ctrl key held, and alone scrolls the page, as the owner decided on 28
  September 2026 (**Open 1**, below). The plot does it with a listener
  of the wheel of its own, on the element that holds the canvas, added
  in the capture phase, so that it hears the wheel before the listener
  of `OrbitControls` on the canvas: a wheel without Ctrl is stopped
  there with `stopPropagation`, and never reaches the controls, and
  `preventDefault` is not called, so the browser scrolls the page; a
  wheel with Ctrl goes on to the controls, which zoom and call
  `preventDefault`, so the browser does not enlarge the page. The
  listener is passive, since it never calls `preventDefault`. A pinch
  on a trackpad reaches the page in Chromium and Firefox as a wheel
  with Ctrl, and zooms. Safari, and WebKit, send a pinch as events of
  their own, `gesturestart`, `gesturechange` and `gestureend`, and no
  wheel, and `OrbitControls` listens to none of them, so a pinch over
  the plot in Safari may enlarge the page and not the plot. The plan
  tries the pinch in Safari on a Mac and in WebKit; when it does not
  zoom the plot there, the buttons "Zoom in" and "Zoom out", which work
  in every browser, and Ctrl with the wheel of a mouse remain, and a
  listener of those events is a few lines the plan can add then.
  The zoom runs from 0.25, the cloud a quarter of its starting size, to
  20, `ZOOM_MIN` and `ZOOM_MAX`, meanwhile, refined in the running application: the controls'
  `minZoom` and `maxZoom`, which bound the wheel and the pinch, and
  which the buttons keep to as well. The buttons set the camera's
  `zoom` themselves, multiplied by their factor and held within the
  two, and call its `updateProjectionMatrix`; not the controls'
  `dollyIn` and `dollyOut`, whose factor works the other way round on
  an orthographic camera, `dollyIn(1.25)` taking the zoom from 1 to 0.8,
  as a node script with three 0.186.1 showed on 27 September 2026.

A drag with one finger on the plot turns it, and so does not scroll the
page: `OrbitControls` sets `touch-action: none` on the canvas
(`OrbitControls.js` of three 0.186.1, line 508). At 320 pixels wide the
plot is 320 by 240 pixels, the size of the scatter, and the page is
scrolled by a finger on the rest of it.

### The buttons of the bar above the plot

The screen draws the bar with React Aria's buttons and calls the
handle; the plot draws no control. The bar holds the switch between 2D
and 3D (`pca.md`), and, in 3D, these buttons, whose words are
`pca.md`'s, "What it shows", and may be refined in the running
application. Each turn does what a drag of 15° in its direction does:
the side of the cloud nearest the viewer moves that way.

| button | calls | what the user sees |
|---|---|---|
| "Turn left", "Turn right" | `rotate("vertical", −15)`, `rotate("vertical", 15)` | the cloud turns by 15° about the third component, as a drag to the left or the right turns it; in the view along the third component, the 2D plot spins about its centre |
| "Tilt up", "Tilt down" | `rotate("horizontal", 15)`, `rotate("horizontal", −15)` | the cloud turns by 15° about the horizontal of the screen, as a drag upwards or downwards turns it: "Tilt down" brings the view towards looking straight down the third component, and "Tilt up" towards looking straight up it from below; at either the view stops |
| "View along PC1", "View along PC2", "View along PC3" | `viewAlong(0)`, `viewAlong(1)`, `viewAlong(2)` | the view looks down that component: along PC3, from above, PC1 across and PC2 up, the 2D plot of the first two; along PC1, PC2 across and PC3 up; along PC2, PC1 across and PC3 up |
| "Zoom in", "Zoom out" | `zoom(1.25)`, `zoom(0.8)` | the points spread further apart or closer, their marks keeping their size |
| "Reset view" | `resetView()` | the starting view and zoom |

The names of the components are those of the axes shown, "View along PC4"
when the user chose PC4. A step of 15° makes a whole turn in 24 presses,
and the drag gives any angle between them. From the starting view, 20°
above the plane of PC1 and PC2, 5 presses of "Tilt down", 75°, would
pass the top, so the fifth stops there, looking straight down PC3 but
with the plot still turned by the 30° of the starting view, PC1 and PC2
at a slant; "View along PC3" gives the 2D plot exactly, PC1 across and
PC2 up, as a node script with three 0.186.1 showed on 27 September
2026. The view jumps to
the new angle with no animation, so a user who asked the system for
reduced motion needs nothing more (`css.md`, "Motion"). Each button is a
stop of the Tab key, and the plot listens for no key of its own: a key
listened for on the whole page would act while the user types in
another field, as it does in the owner's widget. Two listeners of the
page remain, neither of which acts on a key the user types in a field.
`OrbitControls` listens on the document to the Ctrl key going down and
up (`OrbitControls.js` of three 0.186.1, lines 506 and 1944 to 1969),
passively, only to tell a pinch on a trackpad, which Chromium and
Firefox send as a wheel with Ctrl, from the wheel turned with Ctrl held
(line 1541), and a pinch zooms ten times faster; it changes nothing
else. And the tooltip is
hidden by the Escape key while it is shown (`scatter.md`, "The point
under the pointer").

### The point under the pointer

As `charts.md`, "Picking the point under the pointer": at each movement
of the pointer that is not a drag, the plot projects the points to the
pixels of the element with `projectToScreen`, and `nearestPoint` of
`hover.ts` (`scatter.md`) finds the point. Among the points whose mark
covers the pointer, those within `MARK_RADIUS` pixels of it, the radius
of a circle of a mark's area, 4.5 pixels, it takes the one nearest the
camera, since that is the mark the user sees there; when no mark covers
the pointer, the nearest within 10 pixels, whatever its depth. The rule
not taken, the nearest to the camera among every point within 10
pixels, would name a point 9 pixels away in front of the one the
pointer is on. The tooltip, its words, its numbers, its `textContent`,
how it is kept and dismissed, and `events.onHover` are the scatter's,
with the three coordinates, "PC1 −0.0231, PC2 0.0104, PC3 0.0012",
placed as the scatter places it, where the pointer reaches it. The plot
listens to the pointer on its canvas itself, since it has no base, and
a pointer that leaves the canvas onto the tooltip, which `holds` of the
tooltip tells from the event's `relatedTarget`, keeps it shown. A turn,
a zoom or an `update` hides it. A tap that does not move shows
the tooltip of the point tapped.

### Loading three.js

three.js is loaded when the 3D view is first shown and not with the
page, into a script file of its own that the browser downloads then
(`docs/technology.md`, section 2, "three.js for the 3D PCA"):

- `pca3d.ts` imports `three` and `OrbitControls`, and nothing imports
  `pca3d.ts` but its tests and the screen, which does it with `import()`,
  the call that asks the browser for a module when the code reaches it,
  so that the bundler makes of it and three.js the file of their own.
  `marks.ts`, `legend.ts`, `hover.ts`, `export.ts`, `project.ts` and
  `pca3dError.ts` import nothing of three.js, so the scatter and the legend load none
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
- **When it loads.** The panel opens on the 3D view, so the file is
  downloaded when the first result of a PCA is drawn in the tab, and not
  when the page opens: a user who never runs a PCA never downloads it.
  **While it loads**, the screen shows in the place of the plot the
  words of `pca.md` for it, "Loading the 3D view…", read by a screen
  reader without moving the focus (WCAG 2.2, 4.1.3); the switch to 2D
  works, and the buttons of the turns are shown once the plot is
  drawn.
- **When it arrives too late.** The download takes its time, and by
  the end the user may have switched back to 2D, closed the panel, or
  React in development may have removed the effect that asked for it
  and mounted it again (`react.md`, "Mounting a plot"). A plot made
  then would draw into an element that is gone, or would be a second
  plot with a second WebGL context in the same element. So the effect
  that calls `import()` notes, in its cleanup, that it is over, and when
  the promise resolves it calls `createPca3d` only if it is not; the
  module downloaded is kept by the browser, and the next effect's
  `import()` resolves at once with it.
- **When it fails to load**, the promise of `import()` is refused: the
  connection is down, or the site was deployed again since the page was
  opened. A deploy to GitHub Pages replaces every file of the site, and
  the name of this file holds a hash of its content, so a page opened
  before a deploy asks for a file of the old build that is no longer
  there. The screen draws the 2D scatter in the place of the 3D view,
  and says so above it, in the words of `pca.md`, "Its words", with a
  button "Try again", which calls `import()` again and, when the module
  arrives, draws the 3D view in the place of the 2D plot. These words,
  which say that the site may have been updated and to save the
  project, reload the page and open the project again, were decided by
  the owner on 28 September 2026, as recommended (point 13 of
  `docs/specs/stage-4-open-points.md`); not taken: downloading three.js
  and the reader of xlsx soon after the page opens, 0.43 MB gzipped more
  on every visit. A browser may remember that the download of a
  module failed and give the same failure to every later `import()` of
  it without asking the network again (the standard leaves it open,
  whatwg/html issue 6768); which engines do is seen in each when the
  plot is built. In such a browser "Try again" fails again, even once
  the connection is back, and the words already tell the user what
  works there: save the project and reload the page.

### When the browser has no WebGL

three.js r186 draws with WebGL 2 alone: it refuses WebGL 1 since r163
(`build/three.module.js` of three 0.186.1, line 16139), and its
`WebGLRenderer` throws a plain `Error`, "Error creating WebGL context.",
when the browser gives no context (line 16458). The browsers of the
floor of the applications, Chrome 111, Firefox 115 and Safari 16.4
(`docs/technology.md`, section 6), are newer than the first of their
engines with WebGL 2, Chrome 56, Firefox 51 and Safari 15, as MDN's
data of compatibility give them, not tried in a browser; a browser
gives none when WebGL is turned off in its settings or by the policy of
an institution, when its hardware acceleration is off or the graphics
card is on its list of cards it refuses, and in some remote desktops.
Which of these gives no WebGL in which browser was not tried.

So the plot asks for the context itself, before three.js does: it makes
its canvas, calls `canvas.getContext("webgl2", { alpha: true, depth:
true, stencil: false, antialias: false, premultipliedAlpha: true,
preserveDrawingBuffer: false })`, the attributes `WebGLRenderer` asks
for by default (line 16425), and gives the canvas and the context to
`new WebGLRenderer({ canvas, context })`, which then asks for none of
its own. When `getContext` gives no context, `null` in a browser and
in jsdom, or gives one already lost, which a browser does when it has
taken the graphics card away from the page or holds too many contexts,
`createPca3d` throws a `Pca3dError` of kind `noWebGl`, after
removing what it added, and the element is left as it was. With a
context lost at its creation three.js throws a `TypeError` of its own,
reading the attributes of the context, which the review of work package
8 of `docs/plans/individuals-pca.md` found on 29 September 2026: the page
then showed the bar of an error of the application and no plot. Such a
context draws nothing until the browser gives it back, and a view made
anew once it has, by 2D and 3D pressed again, asks for a new one. `noWebGl`
comes from that call alone, and not from reading the message of an
error of three.js, whose words can change in any release; an error of
three.js made with a context in hand is a defect. It is a
thrown error and not a state of the handle, because there is no plot to
give a handle to; and a typed one, as `PngError` is, because it is a
state of the browser that the screen shows, and not a defect. Every
other error of `createPca3d` is a defect. The class is in a file of its
own, `src/charts/pca3dError.ts`, which imports nothing, and `pca3d.ts`
imports it from there: the screen tells the error apart with
`instanceof Pca3dError`, so it imports the class with the page, and an
import of it from `pca3d.ts` would put three.js in the first script of
the page. The screen draws the 2D scatter in its place, and says above
it that this browser cannot draw the 3D view, in the words of `pca.md`,
"Its words". Since the panel opens on 3D, a user of such a browser
meets them at the first PCA, and at every one after it until they press
"2D", which sets the view to 2D. A project saved in 3D and opened on
such a machine shows the same; the screen does not switch the project
to 2D by itself, since that would be a change of the project the user
did not make.

The option not taken: to test for WebGL 2 before downloading three.js,
by asking a canvas for a context, which spares 134 KB on the machines
that have none and makes and throws away a WebGL context on every other.

### The WebGL context lost

As `charts.md`, "Losing the WebGL context": the browser can take the
context away, and three.js asks it back (its `webglcontextlost`
listener calls `preventDefault`, `three.module.js` line 17152). The plot
calls `events.onContextChange(true)` when it is lost, and `(false)` when
it is given back, after it has drawn again; the screen shows its words
over the plot, those of `pca.md`, "Its words", since the words of the
screens are the screen's. A switch to 2D destroys the plot and its
context, and a switch back makes a new one (`pca.md`). `charts.md` had
the plot show "The 3D view was lost by the browser" itself, a sentence
that does not say what the user can do; it is revised with this spec.

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
description of the 3D view that names its components and says where the
numbers are, since what is across and what is up changes as the view
turns (`pca.md`, "Accessibility"). The labels of the axes and the tooltip are hidden
from a screen reader, which reads the table beside the plot.

### The export

As `charts.md`, "Export of the 3D plot": `toSVG` writes the view as it
is on the screen as an SVG of vectors, with `projectToScreen`, and no
reading of the WebGL canvas, so it works while the context is lost. The
SVG is built apart from the page with the classes of the plots, `chart
chart-pca3d`, its title and description, the three lines and their
labels as text, the points, and the legend of `drawLegendSvg`
(`scatter.md`) at the place it has on the screen, its rows ending
`SCATTER_MARGIN.right` pixels from the right and starting
`SCATTER_MARGIN.top` from the top, over its background no wider than
from `SCATTER_MARGIN.left` pixels from the left, the `left` of
`drawLegendSvg`, where the frame of the scatter starts, and no row below
the height of the SVG less `SCATTER_MARGIN.bottom`, the `bottom` of
`drawLegendSvg`, so that its "and 12 more" comes where the scatter's
does. The plot draws
the legend into the SVG it builds, so it passes no function to
`exportSvg` of `export.ts` (`plot2d.md`, "The export"), which writes the
colours of the light theme on it; `toPNG` draws that SVG, as every plot
does, with its `PngError`.

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
  /** The labels at the ends of the lines: "PC1 (3.55%)". */
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
view. `rotate` turns the cloud as a drag in that direction does:
`"vertical"` about the third component, a positive angle as a drag to
the right, which is `rotateLeft` of `OrbitControls` with the angle in
radians; `"horizontal"` about the horizontal of the screen, a positive
angle as a drag upwards, `rotateUp` with the angle negated, stopping at
straight down or straight up the third component as the controls do. A
turn, a zoom and a view along a component render once and change
nothing in the data.

```ts
export type TurnAxis = "vertical" | "horizontal";

export interface Pca3dHandle extends ChartHandle<Pca3dData> {
  rotate(axis: TurnAxis, degrees: number): void;
  /** Looks down component 0, 1 or 2 of the data. */
  viewAlong(component: 0 | 1 | 2): void;
  /** Multiplies the camera's zoom by `factor`, above 1 nearer, within ZOOM_MIN and ZOOM_MAX. */
  zoom(factor: number): void;
  resetView(): void;
}

/** The bounds of the zoom, the controls' minZoom and maxZoom and the buttons' alike. */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 20;

// src/charts/pca3dError.ts, which imports nothing
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

These throw an `Error`, a defect of the caller:

- `createPca3d` and `update`, for the defects of the scatter's check
  (`scatter.md`, "The TypeScript interface"), with `z` among the arrays
  that must be of one length;
- `rotate`, for an angle that is not finite, and `zoom`, for a factor
  that is not finite or is 0 or less;
- every function of the handle but `destroy` after `destroy`, as the
  base's do (`plot2d.md`);
- `toSVG`, and `toPNG` by rejecting, for a plot never drawn, whose
  element never had a size, as the base's do.

The pieces the handle is built from that its tests check without WebGL,
exported for them; the screen calls none of them. `OrbitControls`
works with no element to listen to, `null`, and three.js computes
under node, so the view is tested with the very camera and controls the
plot uses.

```ts
/**
 * The points with three finite coordinates, in the units of the scene,
 * the largest absolute value among them brought to 1: `positions` x, y
 * and z per point drawn, `index` the index in the data of each, `scale`
 * the units of the scene per unit of the components, 1 when none is
 * drawn.
 */
export function scenePositions(
  x: Float64Array,
  y: Float64Array,
  z: Float64Array,
): { readonly positions: Float32Array; readonly index: Uint32Array; readonly scale: number };

export type ViewName = 0 | 1 | 2 | "start";

/**
 * The orthographic camera of a plot of `width` by `height` CSS pixels,
 * with the third component up, and its OrbitControls, with no pan and
 * no damping, at the starting view. `canvas` null gives controls that
 * listen to nothing.
 */
export function createView(
  canvas: HTMLCanvasElement | null,
  width: number,
  height: number,
): { readonly camera: OrthographicCamera; readonly controls: OrbitControls };

/**
 * Puts the camera along component 0, 1 or 2, as "The view" says, or at
 * the starting view, 20° above the plane of the first two and turned
 * 30° about the third from the view along the second.
 */
export function lookAlong(controls: OrbitControls, view: ViewName): void;

/** Turns the view as `rotate` of the handle does. */
export function turnView(controls: OrbitControls, axis: TurnAxis, degrees: number): void;

/** Zooms the view as `zoom` of the handle does, on the camera of `controls`. */
export function zoomView(controls: OrbitControls, factor: number): void;

/**
 * The paths of the exported view, in the order they are drawn: runs of
 * consecutive points of one path from far to near, `depth` one per point
 * drawn and `index` its index in the data; `path` gives the path of each
 * point of the data, its group or its step of viridis. With `highlighted`,
 * the runs of every other path first, then those of the highlighted one.
 */
export function exportRuns(
  depth: Float32Array,
  index: Uint32Array,
  path: Uint16Array,
  highlighted: number | null,
): readonly { readonly path: number; readonly points: Uint32Array }[];
```

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
- **Many groups**: as the scatter's; each group is a `Points` object,
  a thousand at most, and the groups share the textures of their marks,
  50 at most.

## How it runs

On the page, in the main thread, with the graphics card drawing. The
plot keeps the positions, 12 bytes per point, the projected positions,
another 12, 225 KB for 9,381 points, the textures of the marks in use,
259 KB at most, or of the steps of viridis, 1.3 MB at most, and one
WebGL context. It renders only after a change
(`charts.md`), and a projection of 9,381 points for the hover is a loop
of about 150,000 multiplications, under a millisecond.

A point of 18 CSS pixels is 36 pixels of the screen at a pixel ratio of
2. WebGL 2 promises points of 1 pixel only, and a graphics card gives
its largest size in `ALIASED_POINT_SIZE_RANGE`, and the plot is drawn
with smaller squares, and smaller marks, where it is below 36 pixels.
On the owner's Mac on 28 September 2026, with Playwright 1.63.0, the
headless Chromium 153 gave 1 to 1,023 pixels and the headless WebKit
26.6 gave 1 to 511, so both draw the squares at their full 36 pixels
(below, "Which headless engines give WebGL"). GitHub's runners have not
been seen.

## How it is verified

At `projectToScreen`, `createPca3d` and its handle, and at the pieces
the plot is built from, `scenePositions`, `createView`, `lookAlong`,
`turnView`, `zoomView` and `exportRuns` (above, "The TypeScript interface").

**In the project `charts` of Vitest**, where three.js runs as arithmetic
with no WebGL:

- `projectToScreen` with the matrix of an `OrthographicCamera(−2, 2, 1,
  −1, 0.1, 10)` of three.js at (0, 0, 5) looking at the origin, onto
  400 by 200 pixels: (0, 0, 0) at (200, 100), (2, 1, 0) at (400, 0),
  (−1, −0.5, 0) at (100, 150), and (0, 0, 1) nearer than (0, 0, −1); and
  for 100 points drawn by fast-check, the pixels that three.js's own
  `Vector3.project` gives, within 0.001 pixel.
- `scenePositions`: for x `[1, −4, NaN]`, y `[2, 0, 1]`, z `[0, 2, 3]`,
  the scale 1/4, two positions, (0.25, 0.5, 0) and (−1, 0, 0.5), and
  the index `[0, 1]`.
- The views, with `createView(null, 400, 300)` and the ends of the three
  components, (1, 0, 0), (0, 1, 0) and (0, 0, 1), projected with
  `Vector3.project` of three.js: after `lookAlong(controls, 2)`, the
  first component projects to the right of the centre and the second
  above it, the third within 0.0001 of the centre, and the polar angle
  of the controls, `getPolarAngle`, is 0.000001; after `lookAlong(…,
  0)`, the second to the right and the third above; after `lookAlong(…,
  1)`, the first to the right and the third above; after `lookAlong(…,
  "start")`, a polar angle of 70° and an azimuth of 30°. A node script
  with three 0.186.1 gave these on 27 September 2026.
- The turns: from the view along component 2, `turnView(controls,
  "horizontal", −15)` leaves the polar angle at 0.000001, since the
  view is at the top, and `turnView(controls, "horizontal", 15)` makes
  it 15°; from the starting view, five of `turnView(controls,
  "horizontal", −15)` give the polar angle 0.000001 and leave the
  azimuth at 30°, the plot seen from above and turned; from the view along component 1, `turnView(controls,
  "vertical", 15)` moves the end of the first component to 0.966 of its
  length to the right, cos 15°, and the end of the second to the left of
  the centre, so the near side of the cloud moved to the right.
- The zoom: `zoomView(controls, 1.25)` from the start makes the camera's
  `zoom` 1.25, and the end of the first component projects 1.25 times
  as far from the centre; 20 calls of it stop at 20, and 10 of
  `zoomView(controls, 0.8)` from the start stop at 0.25.
- `exportRuns`: three points of groups A, B and A, from far to near,
  give three runs, A, B and A, in that order; with B highlighted, one
  run of A's two points from far to near, then B's.
- Each defect of "The TypeScript interface" throws.
- Under jsdom, which gives no WebGL, `createPca3d` throws a `Pca3dError`
  of kind `noWebGl` and leaves the element with no child.
  So does a canvas whose `getContext` gives a context already lost.

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
  calls `onHover(0)`; Escape hides it; and of two points at one pixel,
  the tooltip is the one nearer the camera;
- a loss of the context forced with `WEBGL_lose_context`, then its
  restore, calls `onContextChange(true)` then `(false)`, and the plot
  draws again (`charts.md`);
- a change of `data-theme` on `<html>` draws the lines in the colour of
  the new theme, read from a screenshot;
- `toSVG` has no `var(` and holds the legend, and with 40 groups in a
  plot of 600 by 450 its last row says how many more there are;
  `toPNG(3)` of a plot of
  600 by 450 is 1,800 by 1,350 pixels;
- after `destroy`, no canvas is left in the element, and the context of
  the old canvas reports itself lost;
- the wheel over the plot, sent by Playwright's `mouse.wheel` with the
  pointer on the canvas: without Ctrl it scrolls the page, `scrollY`
  grows, and leaves the points of `toSVG` where they were; with Ctrl
  held it moves them apart and the page does not scroll. A pinch on a
  trackpad cannot be sent by Playwright, and is tried by hand ("The
  view", the zoom).

**Which headless engines give WebGL.** Playwright runs the engines
headless, with no window, on the owner's Mac and on the Linux of
GitHub's runners, where there is no graphics card and WebGL, when it is
given, is drawn by the processor. The page of the tests
`e2e/webgl.html` asks for a WebGL 2 context with the attributes above,
with no three.js, and `e2e/webgl.spec.ts` prints what it got. On the
owner's Mac on 28 September 2026, with Playwright 1.63.0 and the built
site:

- Chromium 153.0.8010.12, of the projects `chromium` and `screens`,
  gives WebGL 2, drawn by SwiftShader on the processor and not by the
  Mac's graphics card; points of 1 to 1,023 pixels, textures of 8,192
  pixels at most.
- WebKit 26.6, of the project `webkit`, gives WebGL 2, drawn by the
  Mac's graphics card, "Apple GPU"; points of 1 to 511 pixels, textures
  of 16,384 pixels at most.
- Firefox was not seen: Playwright cannot launch it on this Mac
  (`testing.md`, "Against the built site").
- GitHub's runners were not seen: the branches of the plans are never
  pushed, and the first push of `main` after the merge of stage 4 shows
  them in the output of that test.

So the tests above run in Chromium and WebKit on the Mac, and the 3D
view is in the screens. In an engine that gives none, those tests are
reported as not run for that reason, and not as passed, as `testing.md`
asks of a check that could not be run; and the test of the words of
"When the browser has no WebGL" runs there.

**The file of its own**, in the flows of the PCA (`pca.md`), which
opens on the 3D view: no file of `pca3d` is requested before the first
result of a PCA is drawn, the page opened, a variants file loaded and
the panel of the PCA shown before its run, and one is requested after
it, as the requests of the page show in Playwright; and the first
script of `popgen.html` in `dist/`, which imports `Pca3dError`, holds
no text of three.js, such as "WebGLRenderer". And a download that
arrives too late: with the file of `pca3d` held back by the routing of
Playwright, the result drawn while the panel says "Loading the 3D
view…", 2D pressed, and then the file let through, no canvas is left
in the panel.

The 3D view, in both themes, with a group highlighted, is in the screens
of `e2e/screens.spec.ts`, looked at as `testing.md` says, where the
engine of the screens gives WebGL.

**The dependencies it adds**, none yet in `package.json`: `three`
0.186.1, which is r186, and for development `@types/three` 0.186.0, the
versions of `npm view` on 27 September 2026, which the owner took on 24
September 2026 (`docs/technology.md`, section 2), and approved at these
versions on 27 September 2026. `@types/three` brings six packages for
development, which the list put to the owner that day named, and which
came with that approval (`.claude/skills/coding/SKILL.md`,
"Dependencies"):
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
when 3D is first shown, its result dropped when the effect that asked
for it is over ("Loading three.js"), and the plot destroyed when the
user switches to 2D; the description of the 3D view; the legend and its
highlight, shared with the scatter, placed at the same offset from the
corner in 2D and 3D; the words of the buttons of the turns, which are
about the third component and do what a drag does ("The buttons of the
bar above the plot").

Of `docs/specs/charts/scatter.md`: `PointColours`, `groupMark`,
`symbolPath`, `SYMBOL_AREA`, `MARK_RADIUS`, `legendOf`, `drawLegendSvg`,
`nearestPoint`, `tooltipLines` and `createTooltip`, the rings of no
group, and the outlines drawn with round joins.

## What this spec asks of other documents

- `.claude/skills/coding/charts.md`, "The 3D PCA with three.js": the data as three columns and `PointColours`, not
  the projections whole; the words of a lost context shown by the
  screen through `onContextChange`, not by the plot; `projectToScreen`
  with the matrix as 16 numbers, the pixels and the depth apart, so that
  it imports nothing of three.js; the exported points in one order of
  depth for every group; no pan; three.js r186 needs WebGL 2, and a
  browser without it gets a `Pca3dError`, from the plot's own call of
  `getContext`; the versions, three 0.186.1 and `@types/three` 0.186.0,
  and the six packages the latter brings. Revised again after the
  review of 27 September 2026: the third component kept up, set by the
  camera's `up` before the controls are made; the points nearest the
  camera only among those whose mark covers the pointer; the highlighted
  group drawn over the faded ones as a transparent object of a later
  `renderOrder`; the squares of the points, 18 pixels, and one texture
  per mark; and the listener of `OrbitControls` on the document for the
  Ctrl key. And after the last review: the zoom set on the camera
  within 0.25 and 20, a colouring by values as one `Points` object per
  step of viridis, and `Pca3dError` in `src/charts/pca3dError.ts`.
- `docs/technology.md`, section 2, "three.js for the 3D PCA": that
  three.js r186 needs WebGL 2, which a browser of the floor has unless
  it is turned off or refused, in place of "every browser has WebGL";
  made on 27 September 2026.
- `.claude/skills/coding/testing.md`: what each headless engine gives for
  WebGL, on the Mac and on CI, once the first work package has seen it.
- `docs/architecture.md`, section 9: `project.ts` in the list of
  `src/charts`.
- `docs/architecture.md`, section 11: a
  page opened before a deploy that later downloads a file of the build,
  the file of three.js here, and also the files wasm, which the light
  worker loads the first time an xlsx is read, finds it gone. Nothing
  in the architecture says what the user sees then; `pca.md` gives the
  words for the 3D view, and `docs/specs/worker/files.md` and
  `docs/specs/core/project.md` the same advice for the files wasm,
  `xlsxReaderNotLoaded`.

Each of these was made in its document on 27 September 2026, when the
specs of stage 4 were made to agree, `docs/architecture.md` among them
(its sections 9, 11 and 13, point 10), but the lines of `testing.md` on
the headless engines, made on 28 September 2026 for the owner's Mac;
those of GitHub's runners wait for the first push of `main` after the
merge of stage 4.

## Open points

1. **Whether the wheel of the mouse zooms the 3D view, decided by the
   owner on 28 September 2026, as recommended: with the Ctrl key held.**
   `OrbitControls` zooms with the wheel and stops the page from
   scrolling while the pointer is over the plot (`OrbitControls.js` of
   three 0.186.1, line 503, its listener of the wheel not passive). So a
   user who scrolled down the panel with the pointer over the plot would
   zoom the plot instead, until the pointer left it, and a plot 48rem
   wide, the largest, is most of the width of a laptop's window. The
   wheel zooms with the Ctrl key held, as maps in a page do on Windows
   and Linux, and alone scrolls the page. A few lines of our own, since
   `OrbitControls` has no such setting: the listener of the wheel of
   "The view", in the capture phase, on the element that holds the
   canvas. Ctrl and the wheel over the plot then no longer enlarge the
   page, as they do elsewhere, and the user is told of the key in the
   help. Not taken: the wheel alone, the zoom most users of 3D plots
   expect, with the trap above; and the zoom by the buttons and by
   pinching alone, with no trap and a press per step on a computer.

   Two things of a Mac, kept apart from the decision. Maps in a page,
   Google Maps among them, zoom with ⌘ and the wheel on a Mac, and a
   user of a Mac may try ⌘ first. And macOS can zoom the whole screen
   with Ctrl and the scroll, a setting of its accessibility that is off
   unless the user turned it on; for such a user Ctrl and the wheel
   zoom the screen, and the plot never hears them. For both, the
   buttons "Zoom in" and "Zoom out" work, and so does a pinch where the
   browser sends it as a wheel ("The view"). The plan tries the zoom in
   Safari and WebKit on a Mac, and when Ctrl clashes there, ⌘ on a Mac
   is the alternative, one test more in the listener
   (`stage-4-open-points.md`, the zoom's entry).

## Not in this spec

- The lasso, which is not in stage 4 (`charts.md`, "The lasso, later").
- The switch between 2D and 3D, the bar and the legend as components of
  the screen: `pca.md`.
- `WebGPURenderer`, which `charts.md` leaves for when it is the default
  of three.js.
