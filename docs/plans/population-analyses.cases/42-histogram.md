<!-- spec: docs/specs/charts/histogram.md -->
<!-- heading: The histogram -->
<!-- row: the histogram -->
<!-- sections: "How it is verified", the items of stage 5 -->
<!-- file hist: src/charts/histogram.test.ts -->

The revision changed no item of "The cases". From stage 5 the histogram
draws the folded site frequency spectrum of a population: its bars are
shares, numbers that are not whole; the screen gives the top of the
vertical axis, `yMax`, so that the histograms of several populations
share one scale; and the ticks of the horizontal axis are whole numbers.

| item | test | note |
|---|---|---|
| The shares of p0 at n = 40, as a `Float64Array` over the edges 0.5 to 20.5, with `yMax` 0.061, give a vertical domain of 0 to 0.065, made round from it, where p0's largest share, 0.05590275165567829, would give 0 to 0.06 {{@ the shares of p0 at n = 40 of `docs/specs/analyses/sfs.md`, "The}} | {{hist: the shares of p0 with yMax 0.061 give a vertical domain of 0 to 0.065, and without it 0 to 0.06}} | |
| the largest share of the three populations, 0.05618145165329451, gives 0 to 0.06 as well, so it cannot tell the two apart {{@ (the largest share of the three populations, 0.05618145165329451,}} | {{hist: the shares of p0 with yMax 0.061 give a vertical domain of 0 to 0.065, …}} | the test asserts 0 to 0.06 for a `yMax` of that share |
| ticks that are not whole on it {{@ to 5 ticks, and the histograms of stage 4 would change with that; ticks that are not whole on it}} | {{hist: the shares of p0 with yMax 0.061 have vertical ticks that are not whole, 0.00 to 0.06, and bars that reach 0.0559 of 0.065}} | |
| `xWholeNumbers` over the edges 0.5 to 2.5, two bins, the ticks 1 and 2 alone, where d3 would give fractions {{@ `xWholeNumbers` over the edges 0.5 to 2.5,}} | {{hist: xWholeNumbers over the edges 0.5 to 2.5, two bins, gives the horizontal ticks 1 and 2 alone, and without it d3 gives fractions}}; {{hist: the spectrum of p0 with xWholeNumbers has whole ticks under the centres of its bars}} | |
| a count of −0.1 or NaN throws {{@ a count of −0.1 or NaN, and a `yMax` below the largest count,}} | {{hist: a share of -0.1 is refused}}; {{hist: a share of NaN or of an infinity is refused}} | |
| and a `yMax` below the largest count throws | {{hist: a yMax below the largest count is refused, and one equal to it is drawn}}; {{hist: a yMax that is not finite is refused}} | |
