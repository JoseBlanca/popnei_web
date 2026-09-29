/**
 * The mount of the 3D view of the principal components, `createPca3d` of
 * src/charts/pca3d.ts, downloaded with three.js the first time it is shown
 * in the tab (docs/specs/charts/pca3d.md, "Loading three.js"; react.md,
 * "Mounting a plot"). While the download runs, "Loading the 3D view…"
 * stands alone in the place of the plot, and is announced. The effect that
 * asked for the download notes in its cleanup that it is over, and a
 * download that arrives after it draws nothing: the user went back to 2D,
 * or React in development mounted the effect again. A download that fails,
 * or a browser with no WebGL 2, is told to the panel, which draws the 2D
 * plot in the place of this one. While the browser has taken the drawing
 * away, its words stand over the canvas. The plot is destroyed when this
 * leaves the page, so that no WebGL context is held while the 2D plot is
 * shown, and the panel is given its handle, for the buttons of the view,
 * once it is drawn and `null` when it goes.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import type { Pca3dData, Pca3dHandle } from "../../../charts/pca3d.ts";
import { Pca3dError } from "../../../charts/pca3dError.ts";
import { classOf } from "../../classOf.ts";
import { useAnnouncer } from "../../shell/announcer.tsx";
import { loadPca3d, loadedPca3d } from "./load3d.ts";
import type { Pca3dModule } from "./load3d.ts";
import styles from "./PcaResults.module.css";
import { CONTEXT_LOST, LOADING_3D } from "./words.ts";

/** Why the 3D view could not be drawn: its download failed, or the
    browser gives no WebGL 2. */
export type Pca3dFailure = "load" | "noWebGl";

/** What the mount of the 3D view is drawn with. */
export interface Pca3dViewProps {
  /** What the view draws, the same object until something in it changes,
      so that it is not drawn again on every render. */
  readonly data: Pca3dData;
  /** Called with the handle of the plot once it is drawn, and with `null`
      when it goes. */
  readonly onHandle: (handle: Pca3dHandle | null) => void;
  /** Called when the view cannot be drawn, and why. */
  readonly onFailed: (failure: Pca3dFailure) => void;
}

/** The element of the 3D view, and the plot in it once three.js is
    downloaded. */
export function Pca3dView({
  data,
  onHandle,
  onFailed,
}: Pca3dViewProps): React.JSX.Element {
  const announcer = useAnnouncer();
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<Pca3dHandle | null>(null);
  // The data the plot drew last, so that it is not drawn twice with the
  // same.
  const drawnRef = useRef<Pca3dData | null>(null);
  const [loading, setLoading] = useState(loadedPca3d() === null);
  const [lost, setLost] = useState(false);
  // A defect of the plot made after the download, in a promise, which no
  // error boundary sees: thrown again in the drawing, so that the boundary
  // of the panel shows it as it shows one made at once (react.md,
  // "Errors").
  const [defect, setDefect] = useState<{ readonly error: unknown } | null>(
    null,
  );
  if (defect !== null) throw defect.error;
  // The latest data and callbacks, for the effect below, which runs once,
  // at the mount, and may create the plot after a download.
  const latest = useRef({ data, onHandle, onFailed, announcer });
  useLayoutEffect(() => {
    latest.current = { data, onHandle, onFailed, announcer };
  });

  useEffect(() => {
    let over = false;
    const create = (module: Pca3dModule): void => {
      const element = containerRef.current;
      if (over || element === null) return;
      setLoading(false);
      const given = latest.current.data;
      try {
        plotRef.current = module.createPca3d(element, given, {
          onContextChange(isLost) {
            setLost(isLost);
            if (isLost) latest.current.announcer.announce(CONTEXT_LOST);
          },
        });
      } catch (error) {
        if (error instanceof Pca3dError) {
          latest.current.onFailed("noWebGl");
          return;
        }
        throw error;
      }
      drawnRef.current = given;
      latest.current.onHandle(plotRef.current);
    };
    const module = loadedPca3d();
    if (module !== null) {
      create(module);
    } else {
      latest.current.announcer.announce(LOADING_3D);
      void loadPca3d().then(
        (loaded) => {
          try {
            create(loaded);
          } catch (error) {
            if (!over) setDefect({ error });
          }
        },
        () => {
          if (!over) latest.current.onFailed("load");
        },
      );
    }
    return () => {
      over = true;
      plotRef.current?.destroy();
      plotRef.current = null;
      drawnRef.current = null;
      latest.current.onHandle(null);
    };
  }, []);

  useEffect(() => {
    if (plotRef.current !== null && drawnRef.current !== data) {
      plotRef.current.update(data);
      drawnRef.current = data;
    }
  }, [data]);

  return (
    <div className={classOf(styles, "view3d")}>
      <div ref={containerRef} className={classOf(styles, "plot")} />
      {(loading || lost) && (
        <p className={classOf(styles, "over")}>
          {loading ? LOADING_3D : CONTEXT_LOST}
        </p>
      )}
    </div>
  );
}
