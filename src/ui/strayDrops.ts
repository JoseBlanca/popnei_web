/**
 * A file dropped on a page outside the zones of a file, which the
 * browser would open in the tab in place of the page, losing the files
 * open and the results (docs/specs/entry.md, "A file dropped outside a
 * zone").
 */

/** Whether `event` drags files, as a drag from the desktop does, and
    nothing before the window, a zone, has prevented its default. A drag
    of text, which a text box takes, is left to the browser. */
function isStrayFile(event: DragEvent): boolean {
  return (
    !event.defaultPrevented &&
    event.dataTransfer?.types.includes("Files") === true
  );
}

/**
 * Listens on `target`, the window of the page, for the drags and drops
 * of files no zone took, whose default nothing has prevented: a
 * `dragover` has its default prevented with the drop effect "none", so
 * that the pointer
 * shows nothing can be dropped there and the browser gives no drop, and
 * a `drop` has its default prevented, so that the browser opens nothing.
 * A zone listens on its element, inside the window, and so takes its own
 * first. Gives the function that takes the listeners off.
 */
export function stopStrayDrops(target: Window): () => void {
  const onDragOver = (event: DragEvent): void => {
    if (!isStrayFile(event)) return;
    event.preventDefault();
    const transfer = event.dataTransfer;
    if (transfer !== null) transfer.dropEffect = "none";
  };
  const onDrop = (event: DragEvent): void => {
    if (isStrayFile(event)) event.preventDefault();
  };
  target.addEventListener("dragover", onDragOver);
  target.addEventListener("drop", onDrop);
  return () => {
    target.removeEventListener("dragover", onDragOver);
    target.removeEventListener("drop", onDrop);
  };
}
