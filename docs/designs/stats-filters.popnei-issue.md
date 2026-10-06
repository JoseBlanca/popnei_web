# A draft of an issue for popnei, not opened

Drafted on 6 October 2026 with the design `stats-filters.md` beside it,
for the owner to open in JoseBlanca/popnei if they approve it.

---

**Title:** The bins of the histograms cannot give what a filter at an edge keeps

**What was seen.** popnei_web counts how many variants a threshold of a
filter keeps by adding up the bins of `calcPerVarDistribs` below the
threshold, with 1,280 bins over [0, 1] and the threshold on an edge.
The count differs from what the filter keeps at that threshold on most
edges, for two reasons:

1. A value on an edge falls in the bin to its right (`stats.d.ts`, the
   comment of the bins), while `filterByMissingData`, `filterByMaf` and
   `filterByObsHet` keep the values at most their threshold. So the bins
   below the edge 0.1 leave out the variants whose value is 0.1, which
   the filter at 0.1 keeps.
2. The edges are made as k · (1/1280), not k/1280. On 817 of the 1,281
   edges the two are the same number; on the other 464 the edge is the
   next number above k/1280: `histBinEdges[384]` is 0.30000000000000004.
   There the bins below the edge hold the values at most 0.3, and the
   count agrees with the filter.

So whether the bins below an edge agree with the filter at that number
depends on how k · (1/1280) rounds.

**How to see it.** On popnei js-v0.2.1 under node, a VCF of 10 diploid
individuals and six variants with missing rates or observed
heterozygosities of exactly 0.1, 0.3 and 0.7, `calcPerVarDistribs` with
`{minNumIndividuals: 0, histKwargs: {numBins: 1280, range: [0, 1]}}`:

| statistic | threshold | edge | variants in the bins below the edge | variants the filter at the threshold keeps |
|---|---|---|---|---|
| missing rate | 0.1 | 0.1 | 3 | 4 |
| missing rate | 0.3 | 0.30000000000000004 | 5 | 5 |
| missing rate | 0.7 | 0.7000000000000001 | 6 | 6 |
| observed heterozygosity | 0.1 | 0.1 | 3 | 4 |
| observed heterozygosity | 0.3 | 0.30000000000000004 | 5 | 5 |
| observed heterozygosity | 0.7 | 0.7000000000000001 | 6 | 6 |

Values on the round numbers are common in real data: a missing rate of
0.1 is one individual of ten missing.

**What it means for popnei_web.** Its new page draws the histograms of
the variants and lets the user drag on each the threshold of its filter,
with how many variants that threshold keeps, without a pass over the
file. That count is right on 464 edges and too low on 817.

**What is asked.** An option of `histKwargs` for bins that hold their
right edge instead of their left, the first bin holding its left edge
too, so that the bins below an edge hold exactly the values at most that
edge; and edges made as lo + (hi − lo) · k / n, so that the edge of a
round number is that number. With both, the bins below the edge t give
what the filter at t keeps, for every edge.
