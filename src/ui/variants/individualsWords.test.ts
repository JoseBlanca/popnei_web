/**
 * The words of the box and of the tab of the individuals file on
 * popgen2.html with no individuals file
 * (docs/specs/steps/popgen2-input.md, "The box of the individuals file",
 * its first two rows, and "The tab Individuals file", its first row),
 * each asserted whole.
 */
import { describe, expect, test } from "vitest";

import { emptyProject, loadVariants } from "../../core/project.ts";
import type { Project } from "../../core/project.ts";
import {
  INDIVIDUALS_BOX_NAME,
  NO_INDIVIDUALS_FILE_TAB,
  noIndividualsFileText,
} from "./individualsWords.ts";

const FILE_ID = "0123456789abcdef0123456789abcdef";

/** A project with the `.nei` file `name` opened, not yet read. */
function opened(name: string): Project {
  return loadVariants(emptyProject("popgen"), {
    fileId: FILE_ID,
    name,
    size: 1000,
    format: "nei",
    readOptions: null,
  });
}

/** The same, read with `numIndividuals` individuals. */
function read(name: string, numIndividuals: number): Project {
  const p = opened(name);
  if (p.variants === null) throw new Error("no variants file opened");
  return {
    ...p,
    variants: {
      ...p.variants,
      read: {
        kind: "read",
        individuals: Array.from(
          { length: numIndividuals },
          (_, i) => `s${String(i).padStart(3, "0")}`,
        ),
        ploidy: 2,
        numVars: null,
        keepsPassed: false,
      },
    },
  };
}

describe("IN3 the words of no individuals file on popgen2.html", () => {
  test("the heading of the box and the words of the tab", () => {
    expect(INDIVIDUALS_BOX_NAME).toBe("Individuals file");
    expect(NO_INDIVIDUALS_FILE_TAB).toBe("No individuals file open.");
  });

  test("with no variants file, the first sentence alone", () => {
    expect(noIndividualsFileText(emptyProject("popgen").variants)).toBe(
      "No individuals file: every individual is unclassified.",
    );
  });

  test("before the variants file has given its individuals, the first sentence alone", () => {
    expect(noIndividualsFileText(opened("panel.nei").variants)).toBe(
      "No individuals file: every individual is unclassified.",
    );
  });

  test("with a variants file read, its individuals and its name", () => {
    expect(noIndividualsFileText(read("panel.nei", 200).variants)).toBe(
      "No individuals file: all 200 individuals of panel.nei are unclassified, and the analyses per population will take them as one population.",
    );
  });

  test("a count of thousands with its comma", () => {
    expect(noIndividualsFileText(read("big.vcf.gz", 1250).variants)).toBe(
      "No individuals file: all 1,250 individuals of big.vcf.gz are unclassified, and the analyses per population will take them as one population.",
    );
  });

  test("one individual, in the singular", () => {
    expect(noIndividualsFileText(read("one.nei", 1).variants)).toBe(
      "No individuals file: the one individual of one.nei is unclassified.",
    );
  });

  test("a character that would reverse the text is written escaped in the name", () => {
    expect(noIndividualsFileText(read("a\u202eb.nei", 2).variants)).toBe(
      "No individuals file: all 2 individuals of a\\u202eb.nei are unclassified, and the analyses per population will take them as one population.",
    );
  });
});
