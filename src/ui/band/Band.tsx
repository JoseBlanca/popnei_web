/**
 * The band at the top of popgen2.html (docs/specs/steps/popgen2-band.md):
 * the page's heading, "Popnei", at its left, and after it, on the same
 * line, what the page is doing, with its Stop, its Stop all or its link, as `bandOf`
 * works it out; under it, the line of an error of the application, in the
 * place of the error bar of popgen.html, with its words and buttons
 * taken from it (shell/barSave.ts). It is the page's banner, a `<header>`
 * named "What the page is doing".
 *
 * It is drawn in the page's second root, `#defects`, so that it stays,
 * with the heading and what happened, when an error has emptied the
 * application's root; before the store is made, it is drawn with no
 * page and shows the heading and an error met as the page started. Its
 * line after the heading is drawn inside a boundary that shows nothing
 * when it fails, and the line of an error is worked out from the log of
 * the errors alone, so that a defect of the line leaves the heading and
 * is shown as every later error is.
 *
 * It stays at the top of the window, over the page, which keeps room
 * under it as tall as it is: the band writes its height into the
 * property `--band-room` of the page, which the room before the
 * application's root takes and the padding of the scroll of base.css
 * reads, so that a control the Tab key reaches is scrolled clear of it
 * (WCAG 2.4.11). Its height is the same whatever its line says, so that
 * nothing under it moves when it starts or stops saying something. While
 * an error of the application is shown it scrolls with the page, at its
 * top, and the room is 0: fixed, its error covered half the window at
 * 200% zoom and all of it at 400%, Close out of reach. When the error
 * comes with the band above the window, the page is scrolled to it,
 * once no dialog is open, and the focus goes to the heading when the
 * control that had it is then out of the window.
 *
 * Its line is not a live region: its percentage and its clock change
 * every second. What starts and ends is said by the page's status
 * region; the band says there only what its own Stop of the one pass
 * says, as the box's does, and the Stop of an analysis and Stop all are
 * said by the page at every `pause` and `pauseAll`. Its alert and its own status region are live
 * announcers, which React Aria keeps readable while a dialog is open.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { pcaOptions } from "../../core/analyses/pca.ts";
import type { AnalysisTabId } from "../../core/popgen2Tabs.ts";
import type { PcaMethod } from "../../worker/protocol.ts";
import type { AutoRuns } from "../autoRuns.ts";
import { classOf } from "../classOf.ts";
import type { Defects } from "../defects.ts";
import { PANEL_HEADING_ATTRIBUTE } from "../analyses/AnalysisPanel.tsx";
import { WARNINGS_HEADING_ATTRIBUTE } from "../analyses/Warnings.tsx";
import { tabContentId } from "../pageTab.ts";
import type { PageTabStore } from "../pageTab.ts";
import { POPGEN2_CHAIN } from "../popgen2Store.ts";
import { useRunSeconds } from "../runSeconds.ts";
import {
  CLOSE_LABEL,
  COPIED,
  COPY_DETAILS_LABEL,
  DETAILS_BOX_LABEL,
  NOT_COPIED,
  detailsText,
  moreText,
} from "../shell/barSave.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { keepingFocus } from "../shell/focusKept.ts";
import { useSaid } from "../shell/said.ts";
import type { Announcer } from "../shell/status.ts";
import type { PageStore } from "../store.tsx";
import { stoppedText } from "../variants/words.ts";
import { Button } from "../widgets/Button.tsx";
import { Link } from "../widgets/Link.tsx";
import { WideShort } from "../widgets/WideShort.tsx";
import { isDialogOnPage, whenNoDialog } from "../widgets/dialogMark.ts";
import { errorOf, lineOf, liveStatesOf } from "./bandLine.ts";
import type { BandLine } from "./bandLine.ts";
import styles from "./Band.module.css";
import {
  BAND_NAME,
  DETAILS_LABEL,
  PAGE_HEADING,
  lineWords,
  stopAllOf,
  stopOf,
} from "./bandWords.ts";
import type { BandStop, LineWords } from "./bandWords.ts";

/** What the band reads and acts on once the store is made. */
export interface BandWith {
  /** The store of the page, unwrapped by the gate: the band changes
      nothing in the project. */
  readonly store: PageStore;
  /** The analyses the page starts by itself: the one pass and the PCA
      live, whose Stops the band sends. */
  readonly autoRuns: AutoRuns;
  /** The tab shown, which the link to the PCA's warnings changes. */
  readonly pageTab: PageTabStore;
  /** The announcer of the page's status region, which says the band's
      Stop of the one pass as the box's Stop is said. */
  readonly announcer: Announcer;
}

/** What the band is drawn with. */
export interface BandProps {
  /** The log of the errors, which the band reads and closes. */
  readonly defects: Defects;
  /** What it reads once the store is made; `null` before. */
  readonly page: BandWith | null;
  /** The version of the application, for Copy the details. */
  readonly appVersion: string;
}

/** The property of the page that holds the room kept under the band. */
const ROOM_PROPERTY = "--band-room";

/** The band: "Popnei", what the page is doing, and an error of the
    application. */
export function Band({
  defects,
  page,
  appVersion,
}: BandProps): React.JSX.Element {
  const defectsState = useSyncExternalStore(defects.subscribe, () =>
    defects.getState(),
  );
  // Read at every change, for Copy the details.
  const popneiVersion = useSyncExternalStore(
    page?.store.subscribe ?? subscribeToNothing,
    () => page?.store.getState().popneiVersion ?? null,
  );
  // The variants file open, whose change draws again a line that met a
  // defect.
  const fileId = useSyncExternalStore(
    page?.store.subscribe ?? subscribeToNothing,
    () => page?.store.getState().project.variants?.fileId ?? null,
  );
  const error = errorOf(defectsState, page !== null);

  // Whether the details of the error are shown, until it is closed.
  const [detailsShown, setDetailsShown] = useState(false);
  const [boxShown, setBoxShown] = useState(false);
  const { said, say, clear } = useSaid();
  if (error === null && detailsShown) setDetailsShown(false);
  const details = detailsShown && error !== null;
  // While an error is shown, the band scrolls with the page.
  const scrolls = error !== null;

  const headerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const keepFocus = useFocusKept(headerRef, headingRef);
  useLayoutEffect(keepFocus);
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (header === null) return;
    const giveBack = keepRoom(header, scrolls);
    if (scrolls) {
      // Run when the error comes, and not at a second error, Details or
      // Close, which leave `scrolls` as it was.
      const stopBringing = bringIntoView(header, headingRef);
      return () => {
        stopBringing();
        giveBack();
      };
    }
    const stopClearing = keepFocusClear(header);
    return () => {
      stopClearing();
      giveBack();
    };
  }, [scrolls]);

  // The number of the last copy of the details, raised by Close, so that
  // a copy that settles after it, or after a later copy, says nothing.
  const copies = useRef(0);
  async function copyDetails(): Promise<void> {
    copies.current += 1;
    const copy = copies.current;
    const text = detailsText(defects.details(), popneiVersion, appVersion);
    try {
      // navigator.clipboard is missing on a page served over plain HTTP
      // from another machine, and the call then throws.
      await navigator.clipboard.writeText(text);
      if (copy === copies.current) say(COPIED);
    } catch {
      if (copy !== copies.current) return;
      setBoxShown(true);
      say(NOT_COPIED);
    }
  }

  function close(): void {
    copies.current += 1;
    defects.dismiss();
    clear();
    setBoxShown(false);
    setDetailsShown(false);
    headingRef.current?.focus();
  }

  return (
    <header
      ref={headerRef}
      aria-label={BAND_NAME}
      className={classOf(styles, scrolls ? "bandScrolls" : "band")}
    >
      <div className={classOf(styles, "column")}>
        <div className={classOf(styles, "line")}>
          {/* It takes the focus after the band's Stop and its Close, and
              is not in the order of the Tab key. */}
          <h1
            ref={headingRef}
            tabIndex={-1}
            className={classOf(styles, "heading")}
          >
            {PAGE_HEADING}
          </h1>
          {page !== null && (
            // A defect of the line empties it alone; the root's
            // onCaughtError gives it to the line of an error.
            <ErrorBoundary heading={null} resetOn={fileId ?? ""}>
              <Activity
                page={page}
                keepFocus={keepFocus}
                onLink={(tab, warnings) => {
                  showTab(page.pageTab, tab, warnings, headingRef.current);
                }}
              />
            </ErrorBoundary>
          )}
        </div>
        <div role="alert" data-live-announcer="true">
          {error !== null && (
            <p className={classOf(styles, "error")}>{error.text}</p>
          )}
        </div>
        {error !== null && (
          <div className={classOf(styles, "actions")}>
            <Button
              label={DETAILS_LABEL}
              expanded={detailsShown}
              onPress={() => {
                setDetailsShown(!detailsShown);
              }}
            />
            <Button label={CLOSE_LABEL} onPress={close} />
          </div>
        )}
        {details && (
          <div className={classOf(styles, "details")}>
            {error.more > 0 && (
              <p className={classOf(styles, "more")}>{moreText(error.more)}</p>
            )}
            <div className={classOf(styles, "actions")}>
              <Button
                label={COPY_DETAILS_LABEL}
                onPress={() => {
                  void copyDetails();
                }}
              />
            </div>
            {boxShown && (
              <label className={classOf(styles, "box")}>
                {DETAILS_BOX_LABEL}
                <textarea
                  readOnly
                  rows={8}
                  value={detailsText(
                    defects.details(),
                    popneiVersion,
                    appVersion,
                  )}
                />
              </label>
            )}
          </div>
        )}
        <p
          role="status"
          data-live-announcer="true"
          className={classOf(styles, "status")}
        >
          {said}
        </p>
      </div>
    </header>
  );
}

/** What the line after "Popnei" works out its words from. */
interface ActivityProps {
  readonly page: BandWith;
  /** Gives the focus to the heading when a control of the band that had
      it has gone by itself; called after each drawing of the line. */
  readonly keepFocus: () => void;
  /** The link to the tab `tab` was followed: to the warnings of its
      result, or, `false`, to its error. */
  readonly onLink: (tab: AnalysisTabId, warnings: boolean) => void;
}

/** The line after "Popnei", worked out from the store, the live state of
    the PCA, the tab shown and the time a Stop was first seen waiting. */
function Activity({
  page,
  keepFocus,
  onLink,
}: ActivityProps): React.JSX.Element | null {
  useLayoutEffect(keepFocus);
  const state = useSyncExternalStore(page.store.subscribe, () =>
    page.store.getState(),
  );
  // The live state of each live analysis, which autoRuns tells of at
  // each change, of the store and of the gate as well as its own, with
  // one subscription, read below; and what it knows of the one pass, a
  // Stop with no pass running among it, which the store does not.
  useSyncExternalStore(page.autoRuns.subscribe, () =>
    page.autoRuns.getVersion(),
  );
  const tab = useSyncExternalStore(page.pageTab.subscribe, () =>
    page.pageTab.shown(),
  );
  const stopping = useStoppingTimes(state.stoppedAwaitingWorker);
  const stoppedMethod = useStoppedMethod(
    state.stoppedAwaitingWorker,
    pcaOptions(state.project, "popgen2").method,
  );
  const line = lineOf({
    state,
    startedUnder: (key) => page.autoRuns.startedUnder(key),
    live: liveStatesOf(page.autoRuns),
    tab,
    now: stopping?.now ?? 0,
    stoppingSince: stopping?.since ?? null,
    stoppedMethod,
  });
  return <Line line={line} page={page} onLink={onLink} />;
}

/** What the line after "Popnei" is drawn with. */
interface LineProps {
  readonly line: BandLine;
  readonly page: BandWith;
  /** The link to the tab `tab` was followed: to the warnings of its
      result, or, `false`, to its error. */
  readonly onLink: (tab: AnalysisTabId, warnings: boolean) => void;
}

/** The line after "Popnei": its words or its link, and its Stop. */
function Line({ line, page, onLink }: LineProps): React.JSX.Element | null {
  const stop = stopOf(line);
  const stopAll = stopAllOf(line);
  // Stop, then Stop all, each beside the words, so that the one that
  // stops one analysis comes first, as in the tab.
  const control = (
    <>
      {stop !== null && (
        <span className={classOf(styles, "control")}>
          <Button
            label={stop.label}
            ariaLabel={stop.name}
            onPress={() => {
              pressStop(stop, page);
            }}
          />
        </span>
      )}
      {stopAll !== null && (
        <span className={classOf(styles, "control")}>
          <Button
            label={stopAll.label}
            ariaLabel={stopAll.name}
            onPress={() => {
              keepingFocus(() => {
                page.autoRuns.pauseAll();
              });
            }}
          />
        </span>
      )}
    </>
  );
  if (line.kind === "nothing") return null;
  if (line.kind === "result") {
    const words = lineWords(line, 0);
    return (
      <>
        <span className={classOf(styles, "words")}>
          {words !== null && (
            <Link
              label={words.full}
              shortLabel={words.short}
              onPress={() => {
                onLink(line.tab, line.warnings !== null);
              }}
            />
          )}
        </span>
        {control}
      </>
    );
  }
  return (
    <>
      {line.kind === "running" ? (
        // A new request is a new clock.
        <Clocked key={line.runId} line={line} runId={line.runId} />
      ) : (
        <Words words={lineWords(line, 0)} />
      )}
      {control}
    </>
  );
}

/** The words of an analysis running, with its clock. */
function Clocked({
  line,
  runId,
}: {
  readonly line: BandLine;
  readonly runId: number;
}): React.JSX.Element {
  const seconds = useRunSeconds(runId);
  return <Words words={lineWords(line, seconds)} />;
}

/** The words of a line, whole, and under 30 rem in their short form,
    the whole words then still read by a screen reader. */
function Words({
  words,
}: {
  readonly words: LineWords | null;
}): React.JSX.Element | null {
  if (words === null) return null;
  return (
    <span className={classOf(styles, "words")}>
      <WideShort full={words.full} short={words.short} />
    </span>
  );
}

/** The band's Stop `stop`: of the one pass, as the box's, said in the
    status region as it; of an analysis, running or about to start, as
    its tab's, `pause`, which the page says. The button then goes, and the focus
    goes to the heading "Popnei". */
function pressStop(stop: BandStop, page: BandWith): void {
  keepingFocus(() => {
    if (stop.stops === "pass") {
      page.autoRuns.stop(POPGEN2_CHAIN);
      page.announcer.announce(stoppedText());
      return;
    }
    page.autoRuns.pause(stop.stops);
  });
}

/** Shows the tab of the analyses `tab`, as a click on its label would,
    and gives the focus to the heading of the warnings of its result,
    `warnings`, or to that of its panel, once the application's root has
    drawn it; to the band's heading, `bandHeading`, when the tab has
    none, as when an error has emptied the application's root. */
function showTab(
  pageTab: PageTabStore,
  tab: AnalysisTabId,
  warnings: boolean,
  bandHeading: HTMLHeadingElement | null,
): void {
  pageTab.show(tab);
  requestAnimationFrame(() => {
    const content = document.getElementById(tabContentId(tab));
    const heading = content?.querySelector(
      `[${warnings ? WARNINGS_HEADING_ATTRIBUTE : PANEL_HEADING_ATTRIBUTE}]`,
    );
    if (heading instanceof HTMLElement) heading.focus();
    else bandHeading?.focus();
  });
}

/**
 * Follows the focus inside the band `header`, and gives the function
 * that gives it to the band's heading, `heading`, when the control of
 * the band that had it has left the page by itself, the Stop of the one
 * pass when the pass ends among them, and nothing else took it: the
 * browser leaves it on nothing then, and the next press of the Tab key
 * would start again from the top of the page. A focus the user gave
 * elsewhere, or let go of, stays where it went.
 */
function useFocusKept(
  header: React.RefObject<HTMLElement | null>,
  heading: React.RefObject<HTMLHeadingElement | null>,
): () => void {
  // The element of the band that has the focus, or had it last when
  // nothing took it from it.
  const focused = useRef<Element | null>(null);
  useEffect(() => {
    const element = header.current;
    if (element === null) return;
    const onFocusIn = (event: FocusEvent): void => {
      focused.current = event.target instanceof Element ? event.target : null;
    };
    const onFocusOut = (event: FocusEvent): void => {
      const to = event.relatedTarget;
      if (to instanceof Node && element.contains(to)) return;
      if (to !== null) {
        focused.current = null;
        return;
      }
      // Nothing took it: the user let it go, or its element left the
      // page, which a moment later tells apart.
      const left = event.target;
      queueMicrotask(() => {
        if (
          left instanceof Element &&
          left.isConnected &&
          focused.current === left
        ) {
          focused.current = null;
        }
      });
    };
    element.addEventListener("focusin", onFocusIn);
    element.addEventListener("focusout", onFocusOut);
    return () => {
      element.removeEventListener("focusin", onFocusIn);
      element.removeEventListener("focusout", onFocusOut);
    };
  }, [header]);
  return () => {
    const lost = focused.current;
    if (lost === null || lost.isConnected) return;
    focused.current = null;
    const active = document.activeElement;
    if (active === null || active === document.body) heading.current?.focus();
  };
}

/** When the band first saw a Stop waiting for the calculation worker,
    `stopped`, and the time of the last look at it, 10 s later; `null`
    while no Stop waits. */
function useStoppingTimes(
  stopped: string | null,
): { readonly since: number; readonly now: number } | null {
  const [times, setTimes] = useState<{
    readonly stopped: string | null;
    readonly since: number;
    readonly now: number;
  } | null>(null);
  useEffect(() => {
    if (stopped === null) return;
    const since = performance.now();
    const timer = setTimeout(() => {
      setTimes({ stopped, since, now: performance.now() });
    }, STOPPING_LOOK_MS);
    return () => {
      clearTimeout(timer);
      setTimes(null);
    };
  }, [stopped]);
  return times !== null && times.stopped === stopped ? times : null;
}

/** The method of the PCA, `method`, as it was when the band first saw a
    Stop waiting for the calculation worker, `stopped`: that of the run
    stopped, which a PCoA chosen after the Stop does not change; `null`
    while no Stop waits. */
function useStoppedMethod(
  stopped: string | null,
  method: PcaMethod,
): PcaMethod | null {
  const [seen, setSeen] = useState<{
    readonly stopped: string;
    readonly method: PcaMethod;
  } | null>(null);
  // Kept in the drawing that first sees the Stop, as react.dev's
  // "adjusting some state when a prop changes" does.
  if (stopped === null) {
    if (seen !== null) setSeen(null);
    return null;
  }
  if (seen?.stopped !== stopped) {
    setSeen({ stopped, method });
    return method;
  }
  return seen.method;
}

/** When the band looks again at a Stop waiting, after it first saw it:
    the 10 s of `STOPPING_MAX_MS`, a little later, so that the look falls
    after them. */
const STOPPING_LOOK_MS = 10_050;

/**
 * Keeps room at the top of the page for the band `header`, as tall as
 * it is, while it is fixed there; none while it scrolls with the page,
 * `scrolls`. Gives the room back when the band goes.
 */
function keepRoom(header: HTMLElement, scrolls: boolean): () => void {
  const root = document.documentElement;
  const measure = (): void => {
    root.style.setProperty(
      ROOM_PROPERTY,
      scrolls
        ? "0px"
        : `${String(Math.ceil(header.getBoundingClientRect().height))}px`,
    );
  };
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(header);
  return () => {
    observer.disconnect();
    root.style.removeProperty(ROOM_PROPERTY);
  };
}

/**
 * Scrolls the page, at once, to the top of the band `header`, in the
 * flow of the page while an error is shown, when any part of it is above
 * the window: an error that came with the page scrolled down was out of
 * sight at 320 pixels and cut at its first line at 1280, and a user of
 * the mouse saw nothing change (the screens of work package 5, 10
 * October 2026). Then, when the control with the focus is no longer
 * whole in the window, the focus goes to the band's heading, `heading`,
 * as Close gives it: a slider left out of sight was moved by the arrow
 * keys with nothing seen (the review of 20af8575, 10 October 2026). The
 * alert has read the error, and the Tab key from the heading reaches
 * Details and Close.
 *
 * While a dialog is open nothing moves, since the focus cannot leave it
 * and the page would jump behind it; this is done once it has gone and
 * React Aria, a frame later, has given the focus back to the control
 * that opened it. Gives the function that cancels what waits.
 */
function bringIntoView(
  header: HTMLElement,
  heading: React.RefObject<HTMLHeadingElement | null>,
): () => void {
  if (!isDialogOnPage(document)) {
    scrollToBand(header, heading.current);
    return () => undefined;
  }
  let waiting = true;
  let frame = 0;
  void whenNoDialog(document).then(() => {
    if (!waiting) return;
    frame = requestAnimationFrame(() => {
      if (waiting) scrollToBand(header, heading.current);
    });
  });
  return () => {
    waiting = false;
    cancelAnimationFrame(frame);
  };
}

/** Scrolls the page to the top of the band `header` when it is above the
    window, and then gives the focus to `heading` when the control of
    the page that has it is no longer whole in the window. "auto" and
    not "smooth", which would ignore a user who asks for less motion;
    nor "instant", which Safari 16.4 does not know and throws on. */
function scrollToBand(
  header: HTMLElement,
  heading: HTMLHeadingElement | null,
): void {
  const top = header.getBoundingClientRect().top;
  if (top >= 0) return;
  window.scrollTo({ top: window.scrollY + top, behavior: "auto" });
  const focused = document.activeElement;
  if (
    focused === null ||
    focused === document.body ||
    header.contains(focused)
  ) {
    return;
  }
  const place = focused.getBoundingClientRect();
  if (place.top < 0 || place.bottom > window.innerHeight) heading?.focus();
}

/**
 * Scrolls the page so that an element of it that takes the focus from
 * the keyboard is below the band `header`, fixed at the top of the
 * window, and not under it (WCAG 2.4.11). The padding of the scroll of
 * base.css does it in Chromium; WebKit 26.6 ignores it when the element
 * is already in the window, and left a number box reached by Shift+Tab
 * 42 pixels under the band at 1280 by 600 pixels (seen on 10 October
 * 2026). Looked at as the focus comes; a second look a frame later
 * stopped the menus "Download…" of the Variants tab from handing a PNG
 * to the browser in Chromium 153, for a reason not found, and WebKit
 * needs none.
 *
 * Not for a focus that follows a press of the pointer, from the press
 * until the next key: the page moved under the pointer between its
 * press and its release, and the click of a button half under the band
 * was lost, in Chromium and WebKit (the review of work package 5, 10
 * October 2026). The pointer is where the user looks.
 */
function keepFocusClear(header: HTMLElement): () => void {
  // Whether the last the user did was a press of the pointer, and not a
  // key.
  let byPointer = false;
  const onPointerDown = (): void => {
    byPointer = true;
  };
  const onKeyDown = (): void => {
    byPointer = false;
  };
  const clear = (target: EventTarget | null): void => {
    // The page's own controls alone: a popover, a menu or a dialog of
    // React Aria is drawn outside the application's root, over the band,
    // and a scroll of the page closes a menu that is open.
    if (
      !(target instanceof Element) ||
      document.getElementById("root")?.contains(target) !== true
    ) {
      return;
    }
    const covered =
      header.getBoundingClientRect().bottom -
      target.getBoundingClientRect().top;
    if (covered > 0) window.scrollBy({ top: -covered - FOCUS_CLEARANCE_PX });
  };
  const onFocusIn = (event: FocusEvent): void => {
    if (!byPointer) clear(event.target);
  };
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("focusin", onFocusIn);
  return () => {
    document.removeEventListener("pointerdown", onPointerDown, true);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("focusin", onFocusIn);
  };
}

/** The room left between the band and an element scrolled clear of it,
    so that its ring of the focus, 2 pixels away from it, shows whole. */
const FOCUS_CLEARANCE_PX = 8;

/** The subscription when there is nothing to read: nothing changes. */
function subscribeToNothing(): () => void {
  return () => undefined;
}
