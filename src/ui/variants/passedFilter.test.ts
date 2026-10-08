import { describe, expect, test } from "vitest";

import { popgen2FirstProject } from "../../core/apps.ts";
import { loadVariants, recordVariantsRead } from "../../core/project.ts";
import type { Project, SourceRead, VariantLoad } from "../../core/project.ts";
import { deepFreeze } from "../../core/testSupport.ts";
import type { Job, JobResult, Outcome, Run } from "../../worker/protocol.ts";
import { createPopgen2Store } from "../popgen2Store.ts";
import { startAnalysis } from "../runs.ts";
import { noticeText } from "../shell/words.ts";
import {
  passedFilterChange,
  passedFilterOn,
  passedFilterShown,
} from "./passedFilter.ts";
import { NOTICE_WORDS } from "./statsWords.ts";
import { summaryStatus } from "./words.ts";

const FILE_ID = "0123456789abcdef0123456789abcdef";

/** A load of `low_qual.vcf.gz` or `low_qual.nei`, as the page makes it. */
function load(format: "vcf" | "nei"): VariantLoad {
  return {
    fileId: FILE_ID,
    name: format === "vcf" ? "low_qual.vcf.gz" : "low_qual.nei",
    size: 10_000,
    format,
    readOptions: format === "vcf" ? { ploidy: null, onlyPassed: false } : null,
  };
}

/** The read of a file of two individuals, recording the FILTER of its
    variants or not. */
function read(keepsPassed: boolean): SourceRead {
  return {
    kind: "read",
    individuals: ["s000", "s001"],
    ploidy: 2,
    numVars: null,
    keepsPassed,
  };
}

/** The first project of popgen2.html with `format` opened and, unless
    `answer` is null, read so. */
function opened(format: "vcf" | "nei", answer: SourceRead | null): Project {
  const p = loadVariants(popgen2FirstProject(), load(format));
  return answer === null ? p : recordVariantsRead(p, FILE_ID, answer);
}

describe("SF7 D2 the FILTER box of popgen2.html", () => {
  test("is shown once the read of the file says its variants record their FILTER, for a VCF as for a .nei file", () => {
    expect(passedFilterShown(opened("vcf", read(true)))).toBe(true);
    expect(passedFilterShown(opened("nei", read(true)))).toBe(true);
  });

  test("is not shown before a file, while a VCF is opened, after an opening that failed, nor for a file without the record", () => {
    expect(passedFilterShown(popgen2FirstProject())).toBe(false);
    expect(passedFilterShown(opened("vcf", null))).toBe(false);
    expect(
      passedFilterShown(
        opened("vcf", {
          kind: "failed",
          error: { kind: "popnei", message: "no ploidy" },
        }),
      ),
    ).toBe(false);
    expect(passedFilterShown(opened("nei", read(false)))).toBe(false);
  });

  test("is ticked in the first project, and a click turns the filter off, kept with the filters off, and on again", () => {
    const first = deepFreeze(opened("vcf", read(true)));
    expect(passedFilterOn(first)).toBe(true);

    const off = passedFilterChange(false);
    const turnedOff = off.command(first);
    expect(off.description).toBe(
      "the filter of the FILTER column was turned off",
    );
    expect(passedFilterOn(turnedOff)).toBe(false);
    expect(turnedOff.filtersOff).toEqual([{ kind: "passed" }]);
    expect(turnedOff.variants).toBe(first.variants);

    const on = passedFilterChange(true);
    const turnedOn = on.command(deepFreeze(turnedOff));
    expect(on.description).toBe(
      "the filter of the FILTER column was turned on",
    );
    expect(passedFilterOn(turnedOn)).toBe(true);
    expect(turnedOn.filters).toEqual(first.filters);
    expect(turnedOn.filtersOff).toEqual([]);
    // Already on, or already off: the same project, no step of Undo.
    expect(on.command(first)).toBe(first);
    expect(off.command(turnedOff)).toBe(turnedOff);
  });

  test("a click while the pass runs sends nothing, stops nothing, and gives the notice of its description; Undo ticks it again", () => {
    const jobs: Job[] = [];
    const store = createPopgen2Store({
      send: (_key, job): Run<JobResult> => {
        jobs.push(job);
        return {
          id: jobs.length,
          outcome: new Promise<Outcome<JobResult>>(() => undefined),
          cancel: () => {
            throw new Error("the pass was cancelled");
          },
        };
      },
      appVersion: "0.1.0",
    });
    store.popneiReady("0.1.0");
    store.apply("low_qual.vcf.gz opened", (p) => loadVariants(p, load("vcf")));
    store.variantsRead(FILE_ID, read(true));
    void startAnalysis(store, "variantsSummary");
    expect(jobs).toHaveLength(1);
    const running = summaryStatus(store.getState());
    expect(running.kind).toBe("running");

    const off = passedFilterChange(false);
    store.apply(off.description, off.command);

    expect(jobs).toHaveLength(1);
    expect(summaryStatus(store.getState())).toBe(running);
    expect(passedFilterOn(store.getState().project)).toBe(false);
    const notice = store.getState().notice;
    if (notice === null) throw new Error("no notice");
    expect(notice).toMatchObject({ removed: [], stopped: [] });
    expect(noticeText(notice, NOTICE_WORDS.title)).toEqual({
      text: "The filter of the FILTER column was turned off",
      action: "Undo",
      reverse: "undo",
    });
    expect(store.getState().undo).toBe(
      "the filter of the FILTER column was turned off",
    );

    store.undo();

    expect(passedFilterOn(store.getState().project)).toBe(true);
    expect(jobs).toHaveLength(1);
    expect(summaryStatus(store.getState())).toBe(running);
  });
});
