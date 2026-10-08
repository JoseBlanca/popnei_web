/**
 * The stem of the name of a variants file, which the files the
 * application writes are named after: the project file
 * (docs/specs/core/projectFile.md, `projectFileName`), the download of
 * a table (docs/specs/analyses/diversity.md, "What it shows"), and the
 * written file of the filtered variants
 * (docs/specs/analyses/writeVariants.md, "The functions of core").
 */

import { filtersApplied } from "./filtersApplied.ts";
import type { WriteFormat } from "./keys.ts";
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
 * The name of the written file of the filtered variants of `p` in
 * `format`: the stem of the variants file with `.filtered.nei`, or
 * `.filtered.vcf.gz` for a VCF, `panel.filtered.nei` from `panel.vcf.gz`,
 * when the project has a filter of the variants that applies to the file
 * or one of the individuals. With none, a `.nei` file is the stem with
 * `.nei`, `panel.nei`, since the file is then the variants file
 * converted; a VCF keeps `.filtered.vcf.gz`, since `panel.vcf.gz` would
 * be the name of the file it came from, which a browser that asks where
 * to save offers to overwrite, with other bytes
 * (docs/specs/analyses/writeVariants.md, "Saving the file"). The stem is
 * `project` for a project with no variants file, which no page asks.
 */
export function writtenName(p: Project, format: WriteFormat): string {
  const stem =
    p.variants === null ? FALLBACK_STEM : variantsStem(p.variants.name);
  switch (format) {
    case "vcf":
      return `${stem}.filtered.vcf.gz`;
    case "nei": {
      const filtered =
        p.variants !== null &&
        (filtersApplied(p).length > 0 || p.individualFilters.length > 0);
      return filtered ? `${stem}.filtered.nei` : `${stem}.nei`;
    }
  }
}
