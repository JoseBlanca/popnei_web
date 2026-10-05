/**
 * popnei's message when it could not order the populations of a heatmap,
 * the order `notPlaced` (docs/specs/analyses/popDists.md, "Its words"):
 * the panel does not show it, since it names popnei's arguments and calls
 * the populations individuals, and writes it to the console once for each
 * result, for whoever reports the problem.
 */
import type { PopDistsResult } from "../../../worker/protocol.ts";

/** The results whose message went to the console already. */
const WARNED = new WeakSet<PopDistsResult>();

/** Writes popnei's messages of an order of `r` it refused, one for each
    measure refused, with `warn`, once for the result: a panel drawn again,
    or twice by React's StrictMode, writes nothing more. */
export function warnNotPlaced(
  r: PopDistsResult,
  warn: (message: string) => void = (message) => {
    console.warn(message);
  },
): void {
  if (WARNED.has(r)) return;
  WARNED.add(r);
  for (const measure of ["fst", "dest"] as const) {
    const order = r.order[measure];
    if (order.kind === "file" && order.reason === "notPlaced") {
      warn(
        `popnei could not order the heatmap of ${measure}: ${order.message}`,
      );
    }
  }
}
