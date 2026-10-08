/**
 * The filters of the variants that apply to the variants file: whether
 * its variants record whether each passed its FILTER, and the filters on
 * without the filter of the FILTER column when they do not
 * (docs/specs/core/project.md, "The filters of popgen2.html"). A module
 * of its own, which imports only types, so that the keys and the project
 * both read it without a cycle of modules.
 */

import type {
  Project,
  ProjectVariantFilter,
  VariantSource,
} from "./project.ts";

/**
 * Whether the variants of the file record whether each passed its FILTER,
 * which the filter of the FILTER column needs: the read's `keepsPassed`
 * once the file is read; before, or when the read failed, true for a VCF,
 * whose variants always hold the record, and false for a `.nei` file,
 * which may not. That answer by the format is for what is worked out from
 * a file whose read has not answered, the filters applied while the read
 * is pending and the fingerprint of a reference, whose read no project
 * file saves. The FILTER box does not read it: it is shown from the read
 * alone.
 */
export function keepsPassed(source: VariantSource): boolean {
  return source.read.kind === "read"
    ? source.read.keepsPassed
    : source.format === "vcf";
}

/**
 * The filters of the variants on that apply to the project's variants
 * file: `p.filters` without the filter of the FILTER column, `passed`,
 * when `keepsPassed(p.variants)` is false, since popnei refuses it over a
 * file whose variants do not record their FILTER; `p.filters` itself, the
 * same array, otherwise and with no file. A project keeps its filters
 * through a new file, so `passed` stays in `p.filters` and comes back
 * with a file that has the record. What reads the filters applied reads
 * this, never `p.filters`: the keys, the jobs, through
 * `jobFilters(filtersApplied(p))`, the counts of each filter, the
 * scripts and the words.
 */
export function filtersApplied(p: Project): readonly ProjectVariantFilter[] {
  // `p.variants` is read only when the filter is on: the `keyInputs` of
  // the PCA and the LD decay call this, and read nothing of the file for
  // a project without it, as every project of popgen.html is
  // (docs/specs/core/keys.md, "What it does").
  if (!p.filters.some((f) => f.kind === "passed") || p.variants === null) {
    return p.filters;
  }
  return filtersAppliedTo(p.filters, keepsPassed(p.variants));
}

/**
 * The filters of the variants on that apply to a file whose variants
 * record their FILTER or not, as `keeps` says: `filters` itself when it
 * is true, and when it holds no filter of the FILTER column; without
 * that filter otherwise. For the fingerprint of the settings, which is
 * given the file it is made for (docs/specs/core/keys.md).
 */
export function filtersAppliedTo(
  filters: readonly ProjectVariantFilter[],
  keeps: boolean,
): readonly ProjectVariantFilter[] {
  if (keeps || !filters.some((f) => f.kind === "passed")) {
    return filters;
  }
  return filters.filter((f) => f.kind !== "passed");
}
