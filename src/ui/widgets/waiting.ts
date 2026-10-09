/**
 * What the widgets that may wait share (docs/specs/steps/popgen2-pca.md,
 * "While a PCA runs"): a control that waits is drawn greyed, is still a
 * stop of the Tab key, carries `aria-disabled` and its reason as its
 * tooltip and its description, and changes nothing when pressed, typed or
 * dragged, as the filters a running PCA reads on popgen2.html. React Aria
 * sets `aria-disabled` only on a control it disables, which then leaves
 * the order of the Tab key, so the attribute is put on the element by
 * hand, on an element where React Aria never sets it.
 */

/** A ref of a callback that puts `aria-disabled="true"` on its element
    while `waits`, and takes it away otherwise; made again at each
    drawing, so that React calls it with the element at each one. */
export function ariaDisabledRef(
  waits: boolean,
): (node: HTMLElement | null) => void {
  return (node) => {
    if (node === null) return;
    if (waits) node.setAttribute("aria-disabled", "true");
    else node.removeAttribute("aria-disabled");
  };
}

/** The ids of the elements that describe a control, `undefined` among
    them for none, joined as `aria-describedby` takes them; `undefined`
    when there are none. */
export function describedByOf(
  ...ids: readonly (string | undefined)[]
): string | undefined {
  const given = ids.filter((id): id is string => id !== undefined && id !== "");
  return given.length === 0 ? undefined : given.join(" ");
}
