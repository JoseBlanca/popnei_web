/**
 * The stem of the name of a variants file, which the files the
 * application writes are named after: the project file
 * (docs/specs/core/projectFile.md, `projectFileName`) and the download of
 * a table (docs/specs/analyses/diversity.md, "What it shows").
 */

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
