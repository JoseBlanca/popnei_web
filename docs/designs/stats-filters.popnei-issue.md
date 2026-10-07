# The issue for popnei, opened as JoseBlanca/popnei#11

Drafted on 6 October 2026 with the design `stats-filters.md` beside it,
and rewritten on 7 October 2026 after the owner asked for the bin edges
to be given by the caller. Opened on 7 October 2026 as
https://github.com/JoseBlanca/popnei/issues/11, with the owner's approval.

---

**Title:** The histograms of the statistics take their bin edges from the caller, and can hold the right edge of each bin

**What is asked.** Two options of `histKwargs`, in the TypeScript and the Python API:

1. **The edges given by the caller**, an increasing list of finite numbers, in place of `range` and `numBins`; given with either of them, an error. popnei makes the edges itself today, as k · ((hi − lo) / n), and cannot be given them.
2. **Bins that hold their right edge**: each bin holds the values above its left edge and up to its right edge, and the first bin holds its left edge too, as in pandas' `cut(..., right=True, include_lowest=True)`. Today a value on an edge falls in the bin to its right.

The two options can be used alone or together. A value outside the edges, and a variant with no value (NaN), are treated as values outside the range and NaN are today. The Python API takes the same two options under its own spelling of `histKwargs`.

With both, the bins below an edge t hold exactly the variants whose value is at most t, which is what `filterByMissingData(t)`, `filterByMaf(t)` and `filterByObsHet(t)` keep. One option alone is not enough: with edges given and bins that hold their left edge, a value of exactly t still falls in the bin above t, together with the values just above it; with bins that hold their right edge and popnei's own edges, the edges are not the numbers a user types.

**Why popnei_web needs it.** popnei_web, the web application that runs popnei's wasm package in the browser, has a page that opens a variants file and draws the histograms of four statistics of its variants: the missing rate, the MAF, the observed and the expected heterozygosity. They come from one pass of `calcVariantsSummary`, asked for 1,280 bins over [0, 1], each 1/1280 wide, which the page adds up into about 40 bars. On each histogram the user drags the threshold of a filter, and under the plot the page says how many variants that threshold keeps, without a pass over the file, by adding up the bins below the threshold. That count is exact only when the threshold is an edge and no variant has a value exactly on it. Otherwise the page gives the lowest and the highest count the bins allow, "Keeps 1,113 to 1,152 of 1,200 variants": the lowest leaves out every variant of the bin the threshold falls in or starts, the highest keeps them all. On `panel.vcf.gz`, a test file of 200 diploid individuals and 1,200 variants, popnei js-v0.2.1 under node:

| threshold | the page shows | popnei's filter keeps |
|---|---|---|
| missing rate at most 0.05 | 1,113 to 1,152 | 1,152 |
| missing rate at most 0.02 | 185 to 345 | 345 |

At 0.05 the edge is 0.05, and the 39 variants with a missing rate of exactly 0.05, 10 missing genotypes of their 200, share the bin from 0.05 to 0.05078125 with any just above. At 0.02 the threshold is inside the bin from 0.01953125 to 0.0203125.

With the two options, the page would give the edges 0, 0.001, 0.002, …, 1, each computed as k / 1000, which is the same floating-point number as the one a user's typed "0.07" is read as; every threshold of up to three decimals would then be an edge, and every count exact. The page draws its bars by adding up these bins, as it does now.

**How to see it.** On popnei js-v0.2.1 under node, a VCF of 10 diploid individuals and six variants with missing rates or observed heterozygosities of exactly 0.1, 0.3 and 0.7, and `calcPerVarDistribs` with `{minNumIndividuals: 0, histKwargs: {numBins: 1280, range: [0, 1]}}`:

| statistic | threshold | edge | variants in the bins below the edge | variants the filter keeps |
|---|---|---|---|---|
| missing rate | 0.1 | 0.1 | 3 | 4 |
| missing rate | 0.3 | 0.30000000000000004 | 5 | 5 |
| observed heterozygosity | 0.1 | 0.1 | 3 | 4 |
| observed heterozygosity | 0.3 | 0.30000000000000004 | 5 | 5 |

At 0.1 the bins leave out the variant whose value is exactly 0.1. At 0.3 they agree only because popnei's edge there is 0.30000000000000004, the floating-point number just above 0.3, so a value of exactly 0.3 falls in the bin below the edge. The script:

```js
import * as p from "popnei";
await p.init();
const n = 10, inds = [...Array(n)].map((_, i) => "i" + i);
const row = (pos, gts) => `1\t${pos}\t.\tA\tC\t.\tPASS\t.\tGT\t${gts.join("\t")}`;
const g = (miss, het) => [...Array(n)].map((_, i) => i < miss ? "./." : i < miss + het ? "0/1" : "0/0");
const lines = ["##fileformat=VCFv4.2",
  "#CHROM\tPOS\tID\tREF\tALT\tQUAL\tFILTER\tINFO\tFORMAT\t" + inds.join("\t"),
  row(1, g(3, 0)), row(2, g(0, 3)), row(3, g(7, 0)),
  row(4, g(0, 7)), row(5, g(1, 0)), row(6, g(0, 1))];
const bytes = new TextEncoder().encode(lines.join("\n") + "\n");
const open = () => p.openVcf(bytes, { ploidy: 2 });
const d = p.calcPerVarDistribs(open(), { minNumIndividuals: 0, histKwargs: { numBins: 1280, range: [0, 1] } });
for (const [stat, filter] of [["missingRate", "filterByMissingData"], ["obsHet", "filterByObsHet"]]) {
  for (const t of [0.1, 0.3]) {
    const k = Math.round(t * 1280);
    let inBins = 0;
    for (let i = 0; i < k; i++) inBins += d[stat].histCounts[i];
    const w = open(); w[filter](t);
    const blocks = w.iterBlocks({ fields: [] }); for (const _ of blocks) {}
    console.log(stat, t, d[stat].histBinEdges[k], inBins, blocks.passStats.numVars);
  }
}
```

Over every threshold of three decimals on the three test files of popnei_web, popnei's filter count has always been inside the range the page shows, so nothing is wrong today; the options would turn each range into the one number.
