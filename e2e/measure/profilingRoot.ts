/**
 * What the profiling build of the measurements puts in the place of
 * `react-dom/client` (vite.profiling.config.ts): React's profiling build
 * of `react-dom`, whose `<Profiler>` reports the time of each commit, and
 * a `createRoot` that draws every root inside one `<Profiler>`. Each
 * commit is pushed to `measureCommits` on the window, for
 * e2e/measure.spec.ts to read. The site's build never takes this file:
 * only the profiling config names it.
 */
import { Profiler, createElement } from "react";
import type { ProfilerOnRenderCallback, ReactNode } from "react";
import type { Root, RootOptions } from "react-dom/client";
import { createRoot as profilingCreateRoot } from "react-dom/profiling";

export { hydrateRoot } from "react-dom/profiling";

/** One commit of a root, as React's `<Profiler>` gives it. */
export interface Commit {
  /** The root, "root0" for the first one made, "root1" for the next. */
  readonly root: string;
  /** "mount" at the first drawing, "update" or "nested-update" after. */
  readonly phase: string;
  /** The milliseconds spent drawing the components that drew again. */
  readonly actualDuration: number;
  /** The milliseconds that drawing the whole tree again would take, the
      sum of the last drawing of each component. */
  readonly baseDuration: number;
  /** `performance.now()` when React began drawing this update. */
  readonly startTime: number;
  /** `performance.now()` when React committed it. */
  readonly commitTime: number;
}

const commits: Commit[] = [];
Object.assign(globalThis, { measureCommits: commits });
let made = 0;

/** A root of React whose every drawing is inside a `<Profiler>`. */
export function createRoot(
  container: Element | DocumentFragment,
  options?: RootOptions,
): Root {
  const root = profilingCreateRoot(container, options);
  const id = `root${String(made)}`;
  made += 1;
  const onRender: ProfilerOnRenderCallback = (
    rootId,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  ) => {
    commits.push({
      root: rootId,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
    });
  };
  return {
    render(children: ReactNode): void {
      root.render(createElement(Profiler, { id, onRender }, children));
    },
    unmount(): void {
      root.unmount();
    },
  };
}
