# Two issues for popnei, opened on 7 October 2026 as JoseBlanca/popnei#12 and #13

Drafted for the design `stats-filters.md` beside it, with the owner's
approval to open both in JoseBlanca/popnei.

---

**Title:** calcVariantsSummary counts the variants that passed their FILTER, without taking them out

**What is asked.** An option of `calcVariantsSummary` that counts, in the same pass and over the same variants as the statistics, how many variants passed their FILTER (`PASS` or a dot) and how many failed, with no variant taken out of the statistics. It is one number beside the histograms: of the variants that reach the statistics, how many passed and how many failed.

**Why.** popnei_web, the web application that runs popnei's wasm package in the browser, opens a VCF with `onlyPassed: false` and draws the histograms of its variants from one pass of `calcVariantsSummary`, over every variant of the file. It wants to say, beside them, how many variants passed their FILTER. Today the only count of the FILTER column is that of the step `filterPassed`, which takes the failed variants out of the pass it counts them in: with it in the summary's pass, the histograms would be over the variants that passed only, and on a VCF where none passed `calcVariantsSummary` throws "the pass gave no variant". So the page would need a second pass over the file for that one number, and it reads each file once.

**What the result could look like.** A field of `VariantsSummary`, for example `filterColumn: { passed: number; failed: number } | null`, the counts for a VCF and for a vars file of format 1.2, which keeps whether each variant passed, and null for a vars file written before it.

---

**Title:** writeVars and writeVcf hand the file over in pieces, without building it whole in the memory of wasm

**What is asked.** A way for `writeVars` and `writeVcf` to give the file they write in pieces as the pass goes, for example a callback `onBytes(piece: Uint8Array)` called with each piece of bytes as it is written, or an iterator of pieces, so that the caller can put them into a `Blob` and the memory of wasm holds a piece at a time rather than the whole file.

**Why.** Both calls build the whole file in the memory of wasm before it crosses into the array that is returned (their doc comments in `io_vars.d.ts` and `io_vcf.d.ts`), so a tab holds the file twice while the call returns, in wasm and in the array, and the memory of wasm, which never shrinks, keeps the room of the file until the worker is ended. popnei_web downloads the variants a user's filters keep as a `.nei` file or a VCF from a web worker; for 100,000 variants of 1,000 diploid individuals a VCF without bgzip is about 400 MB, four characters a genotype, so about 800 MB in the tab while the call returns; beside the open file, that comes near to where a browser tab runs out of memory, between 2 and 4 GB depending on the browser and the machine. With the pieces, the page builds a `Blob` from them, which the browser may keep out of the memory of the page, and saves it.

**What stays the same.** The bytes of the file, the counts of the pass returned at the end (`passStats`), and the options of each call.
