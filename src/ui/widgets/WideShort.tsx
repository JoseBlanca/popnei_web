/**
 * Words shown whole, and in a window under 30 rem wide in their short
 * form in their place, the whole words then still read by a screen
 * reader, as the line of the band of popgen2.html and its link show
 * them (docs/specs/steps/popgen2-band.md, "Its place"). Drawn inside the
 * element that holds the words, a link or a span.
 */
import { classOf } from "../classOf.ts";
import styles from "./WideShort.module.css";

/** The words, whole and short. */
export interface WideShortProps {
  /** The whole words: "Statistics of panel.vcf.gz · 45%". */
  readonly full: string;
  /** The short form under 30 rem: "Statistics · 45%". */
  readonly short: string;
}

/** The whole words, and under 30 rem their short form. */
export function WideShort({ full, short }: WideShortProps): React.JSX.Element {
  return (
    <>
      <span className={classOf(styles, "wide")}>{full}</span>
      <span className={classOf(styles, "short")} aria-hidden="true">
        {short}
      </span>
    </>
  );
}
