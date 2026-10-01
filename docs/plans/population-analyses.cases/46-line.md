<!-- spec: docs/specs/charts/line.md -->
<!-- heading: The line plot -->
<!-- row: the line plot -->
<!-- sections: "The cases" and "How it is verified" -->
<!-- file ln: src/charts/line.test.ts -->
<!-- file plots: e2e/plots.spec.ts -->

The line plot draws, for each series, its points, a line through other
positions, and marks, each a dashed vertical line with the mark of the
series at its top; the LD decay gives a series for each population, the
mean r² of its bins as the points, its fitted curve as the line, and
its half distance as the mark. A casing is a wider line in the colour
of the axes under a line of one of the three light colours. The spec is
of stage 5 and is mapped whole.

| item | test | note |
|---|---|---|
| A series with no point and no line, a population with no pair and no curve: it has its row in the legend, with the words the screen gives it, "pop_c · no pair", and nothing in the frame {{@ - **A series with no point and no line**, a population}} | {{ln: a series with no point and no line keeps its row in the legend and draws nothing in the frame; every series empty leaves the axes and the legend}} | |
| Every series empty: the axes and the legend, and an empty frame {{@ - **Every series empty**: the axes and the legend}} | {{ln: a series with no point and no line keeps its row in the legend and draws nothing in the frame; …}} | |
| A mark with a NaN is not drawn, as a point is not {{@ - **A mark with a NaN** is not drawn}} | {{ln: a mark beyond the horizontal range, or with a NaN, draws no line and no mark, and a point outside the ranges is not drawn}} | |
| More series than the legend has room for in the frame: the rows run below the frame's bottom, one every 18 pixels; so the screen gives no more series than its frame holds rows {{@ - **More series than the legend has room for**}} | in part: {{ln: the legend has a row per series in their order, its label as text, its mark, and its piece of line on a casing for a light colour}}; {{ln: 50 series are refused and 49 drawn}} | the tests reach the plot's part, a row every 18 pixels and as many rows as series, 49 of them; no test asserts that the rows past the frame are cut. That the LD decay draws at most 16 populations, and its words for those left out, are the screen's, and are mapped with `docs/specs/analyses/ldDecay.md`, above, in the flow of 17 populations; how the legend holds more is left by the spec for the running application, so nothing is asked of the owner here |
| A label with markup, `<b>p1</b>`: written as text {{@ - **A label with markup**, `<b>p1</b>`: written as text}} | {{ln: the legend has a row per series in their order, its label as text, …}} | |
| A change of theme: nothing is drawn again; the file is in the light theme {{@ - **A change of theme**: nothing is drawn again; the file is in the}} | {{plots: VS4 D3 a change of theme while the plot is on the screen draws nothing again, and a later toSVG is light}}; {{plots: PA4 D5 toSVG of the LD decay of ld.nei, from a dark page, is in the light theme: …}} | that nothing is drawn again is the base's, tested on the histogram; the file of the line plot is checked from a dark page |
| Under jsdom: the skeleton with `chart chart-line` and no `chart-overlay` {{@ - the skeleton with `chart chart-line` and no `chart-overlay`}} | {{ln: the skeleton has the classes chart chart-line, its title and description, and no overlay}} | |
| two series of groups 0 and 1, of three points, a line of four positions and one mark each: two `path.chart-line` and two `path.chart-line-casing`, and none more when a third series of group 2, green, is added {{@ - two series of groups 0 and 1, of three points}} | {{ln: two series of groups 0 and 1 draw two lines on two casings, orange and sky blue being light; a third of group 2, green, adds a line and no casing}} | |
| two `path.chart-points` with the classes `chart-colour-0` and `chart-colour-1`; a series of group 9 has `chart-colour-2` and the shape of index 3 {{@ added; two `path.chart-points` with the classes `chart-colour-0`}} | {{ln: the points of each series are one path in the colour of its group, circles for group 0, and a series of group 9 has chart-colour-2 and the shape of index 3}} | |
| two `line.chart-mark-line`, from the bottom of the frame to the y of the mark, each over a `line.chart-mark-casing` of the same ends, and none for the mark of a third series of group 2 {{@ two `line.chart-mark-line`, from the bottom of the}} | {{ln: each mark is a dashed line from the bottom of the frame up to its y in the colour of its series, on a casing of the same ends for a light colour, …}} | |
| two legend rows with the labels as text {{@ two legend rows with the labels as text}} | {{ln: the legend has a row per series in their order, its label as text, …}} | |
| the order in `chart-marks`: every line before every set of points {{@ - the order in `chart-marks`: every line before every set of points}} | {{ln: in the marks every line comes before every set of points, after an update that adds a series too}} | |
| a NaN in `points.y` leaves that point out of the path {{@ - a NaN in `points.y` leaves that point out of the path}} | {{ln: a NaN in points.y leaves that point out of the path}} | |
| a NaN in `line.y` breaks the path into two parts, two `M` commands {{@ `line.y` breaks the path into two parts, two `M` commands}} | {{ln: a NaN in line.y breaks the line into two parts, two M commands}} | |
| a mark at an x beyond `xDomain` draws no line and no mark {{@ - a mark at an x beyond `xDomain` draws no line and no mark}} | {{ln: a mark beyond the horizontal range, or with a NaN, draws no line and no mark, …}} | |
| `check` throws for a domain `[1, 1]` or `[0, NaN]` {{@ - `check` throws for a domain `[1, 1]` or `[0, NaN]`}} | {{ln: a domain [1, 1] or [0, NaN], across or up, is refused, by createLine and by update}} | |
| for arrays of different lengths {{@ `check` throws for a domain `[1, 1]` or `[0, NaN]`, for arrays of different lengths}} | {{ln: points or a line whose two arrays differ in length are refused}} | |
| for 50 series {{@ different lengths, for 50 series}} | {{ln: 50 series are refused and 49 drawn}} | |
| and for 50,001 points and positions {{@ and for 50,001 points and positions}} | {{ln: 50,001 points and positions of lines together are refused, and 50,000 drawn}} | |
| the ticks of a horizontal axis from 0 to 100,000 with `xWholeNumbers` read "0", "20,000", …, "100,000" at 600 pixels {{@ - the ticks of a horizontal axis from 0 to 100,000 with}} | {{ln: the ticks of a horizontal axis from 0 to 100,000 with xWholeNumbers read 0, 20,000, … 100,000 at 600 pixels}} | |
| In Playwright, the plot of the LD decay of `ld.nei` with its numbers as literals: the SVG of `toSVG` in the light theme when the page is dark, the line of `chart-line-colour-0` with the stroke `rgb(230, 159, 0)` and a casing, and the legend in the file {{@ the SVG of `toSVG` in the light theme when the page is dark, the line of}} | {{plots: PA4 D5 toSVG of the LD decay of ld.nei, from a dark page, is in the light theme: …}} | |
| `toPNG(2)` of the plot {{@ `toPNG(2)` of the plot}} | {{plots: PA4 D5 toPNG(2) of the LD decay in 600 by 375 pixels is a PNG of 1,200 by 750 pixels, orange on the piece of line of the first row of its legend}} | |
| A test of the tokens checks the four colours without a casing at 3:1 or more on the background of each theme {{@ A test of the tokens checks the four colours without a casing}} | {{plots: PA4 D5 the lines of the four colours without a casing, green, blue, vermilion and reddish purple, are 3:1 or more on the background of the light and the dark theme}} | |
