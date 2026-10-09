/**
 * The words of the box and of the tab of the individuals file on
 * popgen2.html (docs/specs/steps/popgen2-input.md, "The box of the
 * individuals file" and "The tab Individuals file"). Pure, so that a
 * test in node checks them; the widgets draw them. For now the words of
 * no individuals file, the page opening none yet.
 */
import { escaped, grouped } from "../../core/project.ts";
import type { VariantSource } from "../../core/project.ts";

/** The heading of the box of the individuals file, and the label of its
    tab. */
export const INDIVIDUALS_BOX_NAME = "Individuals file";

/** What the tab of the individuals file says with no individuals file. */
export const NO_INDIVIDUALS_FILE_TAB = "No individuals file open.";

/** What the box of the individuals file says with no individuals file,
    from the variants file of the project, or null with none:
    that every individual is unclassified, and, once the variants file
    has given its individuals, how many and what the analyses per
    population will do with them. */
export function noIndividualsFileText(variants: VariantSource | null): string {
  const first = "No individuals file: every individual is unclassified.";
  if (variants?.read.kind !== "read") return first;
  const name = escaped(variants.name);
  const numIndividuals = variants.read.individuals.length;
  return numIndividuals === 1
    ? `No individuals file: the one individual of ${name} is unclassified.`
    : `No individuals file: all ${grouped(numIndividuals)} individuals of ${name} are unclassified, and the analyses per population will take them as one population.`;
}
