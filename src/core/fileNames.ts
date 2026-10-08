/**
 * The stem of the name of a variants file, which the files the
 * application writes are named after: the project file
 * (docs/specs/core/projectFile.md, `projectFileName`), the download of
 * a table (docs/specs/analyses/diversity.md, "What it shows"), and the
 * written file of the filtered variants
 * (docs/specs/analyses/writeVariants.md, "The functions of core").
 */

import { filtersApplied } from "./project.ts";
import type { Project } from "./project.ts";

/** The stem of a name that is only an extension, `.nei`. */
const FALLBACK_STEM = "project";

/** The extensions of a variants file, in any case. */
const VARIANTS_EXTENSION = /\.(nei|vcf|vcf\.gz)$/i;

/**
 * The name of a variants file without `.nei`, `.vcf` or `.vcf.gz`, in any
 * case, any other extension kept: `panel.vcf.gz` gives `panel`; or
 * `project` when nothing is left, for a file named `.nei`.
 */
export function variantsStem(name: string): string {
  const stem = name.replace(VARIANTS_EXTENSION, "");
  return stem === "" ? FALLBACK_STEM : stem;
}

/**
 * The name of the written file of the filtered variants of `p`: the stem
 * of the variants file with `.filtered.nei`, `panel.filtered.nei` from
 * `panel.vcf.gz`, when the project has a filter of the variants or of the
 * individuals; with `.nei`, `panel.nei`, when it has none, since the file
 * is then the variants file converted; `project.nei` for a project with
 * no variants file, which the step never asks.
 */
export function writtenName(p: Project): string {
  if (p.variants === null) {
    return `${FALLBACK_STEM}.nei`;
  }
  const stem = variantsStem(p.variants.name);
  const filtered =
    filtersApplied(p).length > 0 || p.individualFilters.length > 0;
  return filtered ? `${stem}.filtered.nei` : `${stem}.nei`;
}
