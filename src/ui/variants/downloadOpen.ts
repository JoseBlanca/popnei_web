/**
 * Whether the dialog of the download of the filtered variants of
 * popgen2.html is open, for the PCA tab, whose line of the quiet second
 * says then that the PCA waits for the download
 * (docs/specs/steps/popgen2-pca.md, "About to start"). The dialog holds a
 * change under way on the gate as well, but the gate's count does not
 * say which control holds it, so the tab reads the dialog's own state
 * here. One dialog of the download is drawn on the page, so its state is
 * kept once for the page.
 */

/** How many marks of an open dialog are held: one while it is open, and
    two for a moment when <StrictMode> runs its effect twice. */
let marks = 0;
const listeners = new Set<() => void>();

function tell(): void {
  for (const listener of [...listeners]) listener();
}

/** Marks the dialog open, and gives the function that takes the mark
    away when it closes or leaves the page; a second call of that function
    changes nothing. */
export function markDownloadOpen(): () => void {
  marks += 1;
  if (marks === 1) tell();
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    marks -= 1;
    if (marks === 0) tell();
  };
}

/** Whether the dialog of the download is open now. */
export function isDownloadOpen(): boolean {
  return marks > 0;
}

/** Calls `listener` when the dialog opens or closes; returns the function
    that stops it. Made once, so React keeps it. */
export function subscribeDownloadOpen(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
