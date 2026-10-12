/**
 * Words shown in their short form, the whole words read by a screen
 * reader in their place, as the line of the band of popgen2.html and its
 * link show them in a window under 45 em wide
 * (docs/specs/steps/popgen2-band.md, "Its place"); the band decides when
 * (band/narrow.ts). Drawn inside the element that holds the words, a link
 * or a span.
 */
import { VISUALLY_HIDDEN } from "./visuallyHidden.ts";

/** The words, whole and short. */
export interface WideShortProps {
  /** The whole words, read by a screen reader: "Statistics of
      panel.vcf.gz · 45%". */
  readonly full: string;
  /** The short form shown: "Statistics · 45%". */
  readonly short: string;
}

/** The short form shown, and the whole words for a screen reader. */
export function WideShort({ full, short }: WideShortProps): React.JSX.Element {
  return (
    <>
      <span className={VISUALLY_HIDDEN}>{full}</span>
      <span aria-hidden="true">{short}</span>
    </>
  );
}
