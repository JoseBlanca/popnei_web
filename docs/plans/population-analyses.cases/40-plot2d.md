<!-- spec: docs/specs/charts/plot2d.md -->
<!-- heading: The base of the 2D plots -->
<!-- row: the base of the 2D plots -->
<!-- sections: "How it is verified", the items of stage 5 -->
<!-- file p2d: src/charts/plot2d.test.ts -->
<!-- file hm: src/charts/heatmap.test.ts -->
<!-- file plots: e2e/plots.spec.ts -->

The revision changed no item of "The cases". The base is the code every
2D plot is drawn through: it makes the SVG, its frame and its axes. From
stage 5 an axis can show names, one for each band of the heatmap, and
the horizontal axis can keep its ticks at whole numbers. The sentence
that a domain of 0.5 to 20.5 cannot test the whole numbers, since d3
gives whole ticks there by itself, is the reason of the item before it
and is not counted.

| item | test | note |
|---|---|---|
| The ticks of a horizontal axis with `xWholeNumbers` for a domain of 0.5 to 2.5 are the whole numbers 1 and 2 alone, where d3's ticks without it are 0.5, 1, 1.5, 2 and 2.5 {{@ those of a horizontal axis with `xWholeNumbers` for a domain of 0.5 to 2.5}} | {{p2d: the whole ticks of a horizontal axis from 0.5 to 2.5 are 1 and 2 alone, where d3 gives the halves too}}; {{p2d: xWholeNumbers gives the horizontal axis from 0.5 to 2.5 the ticks 1 and 2, and the vertical axis keeps ticks that are not whole}} | the first without a DOM, the second on the SVG, with the five ticks of the same plot without the option |
| while the vertical axis of the same plot, from 0 to 0.06, keeps ticks that are not whole {{@ the vertical axis of the same plot, from 0 to 0.06, keeps ticks}} | {{p2d: xWholeNumbers gives the horizontal axis from 0.5 to 2.5 the ticks 1 and 2, …}} | |
| An axis of a band scale of the names p2, p0, p1 draws three labels in that order and no tick line {{@ an axis of a band scale of the names p2, p0, p1 draws}} | {{p2d: an axis of a band scale of p2, p0, p1 draws the three names in that order, each in the middle of its band, and no tick line}} | |
| with `xLabelAngle` −45 each label of the horizontal axis has the rotation −45 and the anchor `end` {{@ each label of the horizontal axis has the rotation −45 and the anchor}} | {{p2d: with xLabelAngle -45 each name of the horizontal axis is turned by -45 and anchored at its end, and those of the vertical axis are not turned}}; {{plots: PA4 D3 in DejaVu Sans, names of up to 26 characters under the columns and left of the rows, and the legend, lie inside the SVG, each slanted name ending under its column}} | the flow lays the slanted names out in a browser, which jsdom cannot |
| a name `<b>P1</b>` is text {{@ each label of the horizontal axis has the rotation −45 and the anchor `end`; a name `<b>P1</b>` is text}} | {{p2d: a name <b>P1</b> is text on both axes and no b element is made}} | |
| an empty `xLabel` leaves no text element of the label {{@ an empty `xLabel` leaves no text element of the label}} | {{p2d: an empty xLabel or yLabel leaves no text element of that label, and a label given later is written under the overlay}}; {{hm: the names on the vertical axis read p2, p0, p1 from the top, those under the columns slanted at −45°, and no label of the axes is written}} | |
