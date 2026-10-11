/**
 * The names of populations made parts of the names of downloaded files,
 * as the histograms of the spectrum of the Populations tab name them
 * (docs/specs/analyses/sfs.md, "On popgen2.html"). A module of its own,
 * apart from fileNames.ts, which both pages load first, so that only the
 * code of that tab, downloaded when the tab is first shown, carries it.
 */

/** A character a part of a file name does not keep: anything but a
    letter of any alphabet, with the accents a letter is written with, a
    digit, "-" and "_". */
const NOT_KEPT = /[^\p{L}\p{M}\p{N}_-]/gu;

/**
 * The parts of file names of the names `names`, in their order, as the
 * files of the histograms of the spectrum name the populations
 * (docs/specs/analyses/sfs.md, "On popgen2.html"): every character other
 * than a letter, a digit, "-" and "_" written "_", so that a name with
 * "/" or "?" makes no folder nor a name a system refuses; and "_2",
 * "_3", … after a part an earlier name already gave, so that two
 * populations never save over each other's file. Parts are compared
 * without regard to case, "P1" and "p1" giving "P1" and "p1_2": the
 * default file systems of macOS and Windows hold one file for both
 * names, and a browser saves the second as "… (1)". A letter of another
 * alphabet is kept, since a browser saves it.
 */
export function fileNameParts(names: readonly string[]): readonly string[] {
  // The parts given so far, in lower case.
  const given = new Set<string>();
  return names.map((name) => {
    const base = name.replace(NOT_KEPT, "_");
    let part = base;
    for (let next = 2; given.has(part.toLowerCase()); next += 1) {
      part = `${base}_${String(next)}`;
    }
    given.add(part.toLowerCase());
    return part;
  });
}
