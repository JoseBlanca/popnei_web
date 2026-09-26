/**
 * The drawing of the measurement of the SVG points (e2e/measure.spec.ts,
 * "The points of an SVG plot"), run in the page points.html by
 * `page.evaluate`, so it closes over nothing: every value it uses is in
 * its argument or made inside it.
 *
 * It draws `n` points in four groups as `.claude/skills/coding/charts.md`
 * draws a scatter plot: one `<path>` per group, whose `d` a plain loop
 * builds, each point a circle of area 16 px² at its position, written as
 * d3-shape's `symbolCircle` writes it into d3-path: a move and two arcs.
 * D3 is not a dependency of the site yet, so its text is written here in
 * the same form, with the numbers at full precision, as d3-path writes
 * them, or rounded to `digits` decimals, as its `pathRound` does.
 */

/** What one drawing is asked to do. */
export interface DrawAsked {
  /** The number of points. */
  readonly n: number;
  /** The decimals of the numbers of the path, or `null` for all. */
  readonly digits: number | null;
  /** The seed of the positions, the same for every engine. */
  readonly seed: number;
}

/** What one drawing took, in milliseconds of `performance.now()`. */
export interface DrawTimes {
  /** The loop that builds the four texts of `d`. */
  readonly buildMs: number;
  /** The four paths made, given their `d`, and put in the page. */
  readonly setMs: number;
  /** From the paths in the page to the next frame drawn after them. */
  readonly frameMs: number;
  /** From the start to the next frame drawn: the three above. */
  readonly totalMs: number;
  /** The SVG written as text, as the export of a plot does. */
  readonly serializeMs: number;
  /** The length of that text, in characters. */
  readonly svgChars: number;
}

/** Draws the points asked into `#plot` of points.html, after emptying it,
    and times it. */
export async function drawPoints(asked: DrawAsked): Promise<DrawTimes> {
  const width = 800;
  const height = 500;
  const groups = 4;
  const area = 16;
  const r = Math.sqrt(area / Math.PI);
  const svgNs = "http://www.w3.org/2000/svg";

  // The positions, in [0, 1), from a linear congruential generator.
  let state = asked.seed >>> 0;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const x = new Float64Array(asked.n);
  const y = new Float64Array(asked.n);
  const group = new Uint8Array(asked.n);
  for (let i = 0; i < asked.n; i++) {
    x[i] = next();
    y[i] = next();
    group[i] = i % groups;
  }

  const plot = document.getElementById("plot");
  if (plot === null) throw new Error("points.html has no #plot");
  plot.replaceChildren();
  await new Promise((done) => requestAnimationFrame(done));

  const digits = asked.digits;
  const num =
    digits === null
      ? (v: number): string => String(v)
      : (v: number): string =>
          String(Math.round(v * 10 ** digits) / 10 ** digits);

  const t0 = performance.now();
  const texts: string[] = [];
  for (let g = 0; g < groups; g++) {
    const parts: string[] = [];
    for (let i = 0; i < asked.n; i++) {
      if (group[i] !== g) continue;
      const px = (x[i] ?? 0) * width;
      const py = (1 - (y[i] ?? 0)) * height;
      parts.push(
        `M${num(px + r)},${num(py)}A${num(r)},${num(r)},0,1,1,${num(px - r)},${num(py)}A${num(r)},${num(r)},0,1,1,${num(px + r)},${num(py)}`,
      );
    }
    texts.push(parts.join(""));
  }
  const t1 = performance.now();

  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", `0 0 ${String(width)} ${String(height)}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  const marks = document.createElementNS(svgNs, "g");
  marks.setAttribute("class", "chart-marks");
  for (const [g, d] of texts.entries()) {
    const path = document.createElementNS(svgNs, "path");
    path.setAttribute("class", `chart-points chart-group-${String(g)}`);
    path.setAttribute("d", d);
    marks.append(path);
  }
  svg.append(marks);
  plot.append(svg);
  const t2 = performance.now();

  // The frame after the paths: a callback of the next frame, then a
  // message, which runs once that frame has been drawn.
  await new Promise((done) => requestAnimationFrame(done));
  await new Promise((done) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = done;
    channel.port2.postMessage(null);
  });
  const t3 = performance.now();

  const text = new XMLSerializer().serializeToString(svg);
  const t4 = performance.now();

  return {
    buildMs: t1 - t0,
    setMs: t2 - t1,
    frameMs: t3 - t2,
    totalMs: t3 - t0,
    serializeMs: t4 - t3,
    svgChars: text.length,
  };
}
