/**
 * What the tests of the 3D plot add to a page for WebKit, whose
 * screenshots of a WebGL canvas on Linux are of the background unless
 * the canvas keeps its drawing.
 */

/**
 * In WebKit, makes each WebGL 2 context keep its drawing after it is
 * shown, `preserveDrawingBuffer`. The WebKit of Playwright on Linux
 * builds a screenshot of an element from the drawing of the canvas, which
 * WebGL clears once the frame is shown: on GitHub's runners on 29
 * September 2026 every screenshot of the canvas was of the background,
 * while the frames of the page in the trace showed the plot drawn. It is
 * given to the pages of the tests only: the plot of the application asks
 * for no kept drawing, and a user sees it drawn.
 */
export function keepDrawingBuffer(): void {
  // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its canvas
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    id: string,
    options?: unknown,
  ) {
    const kept =
      id === "webgl2"
        ? { ...(options as object | undefined), preserveDrawingBuffer: true }
        : options;
    return (getContext as (...args: unknown[]) => unknown).call(this, id, kept);
  } as typeof getContext;
}
