/**
 * The band at the top of popgen2.html (docs/specs/steps/popgen2-band.md):
 * the page's heading, "Popnei", at its left, and after it, on the same
 * line, what the page is doing, with its Stop or its link, as `bandOf`
 * works it out; under it, the line of an error of the application, in the
 * place of the error bar of popgen.html, with its words and buttons
 * taken from it (shell/barSave.ts). It is the page's banner, a `<header>`
 * named "What the page is doing".
 *
 * It is drawn in the page's second root, `#defects`, so that it stays,
 * with the heading and what happened, when an error has emptied the
 * application's root; before the store is made, it is drawn with no
 * page and shows the heading and an error met as the page started.
 *
 * It stays at the top of the window, over the page, which keeps room
 * under it as tall as it is: the band writes its height into the
 * property `--band-room` of the page, which the room before the
 * application's root takes and the padding of the scroll of base.css
 * reads, so that a control the Tab key reaches is scrolled clear of it
 * (WCAG 2.4.11). Its height is the same whatever its line says, so that
 * nothing under it moves when it starts or stops saying something. While
 * the details of an error are shown it scrolls with the page, and the
 * room is 0.
 *
 * Its line is not a live region: its percentage and its clock change
 * every second. What starts and ends is said by the page's status
 * region; the band says there only what its own Stop of the one pass
 * says, as the box's does, and the Stop of the PCA is said by the page
 * at every `pause`. Its alert and its own status region are live
 * announcers, which React Aria keeps readable while a dialog is open.
 */
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { pcaOnPopgen2 } from "../../core/analyses/pca.ts";
import type { AutoRuns, LiveState } from "../autoRuns.ts";
import { classOf } from "../classOf.ts";
import type { Defects } from "../defects.ts";
import { PCA_TAB_CONTENT_ID } from "../pageTab.ts";
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
import { keepingFocus } from "../shell/focusKept.ts";
import type { Announcer } from "../shell/status.ts";
import type { PageStore } from "../store.tsx";
import { stoppedText } from "../variants/words.ts";
import { Button } from "../widgets/Button.tsx";
import { Link } from "../widgets/Link.tsx";
import { bandOf } from "./bandLine.ts";
import type { BandLine } from "./bandLine.ts";
import styles from "./Band.module.css";
import {
  BAND_NAME,
  DETAILS_LABEL,
  PAGE_HEADING,
  lineWords,
  stopOf,
} from "./bandWords.ts";
import type { BandStop, LineWords } from "./bandWords.ts";

/** The id of the PCA of the page. */
const PCA = pcaOnPopgen2.id;

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

/** The live state of the PCA before the store is made. */
const NOT_LIVE: LiveState = Object.freeze({ kind: "off" });

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
  const state = useSyncExternalStore(
    page?.store.subscribe ?? subscribeToNothing,
    () => page?.store.getState() ?? null,
  );
  // The live state, which autoRuns tells of at each change, of the store
  // and of the gate as well as its own; and what it knows of the one
  // pass, a Stop with no pass running among it, which the store does not.
  const pcaLive = useSyncExternalStore(
    page?.autoRuns.subscribe ?? subscribeToNothing,
    () => page?.autoRuns.liveState(PCA) ?? NOT_LIVE,
  );
  useSyncExternalStore(
    page?.autoRuns.subscribe ?? subscribeToNothing,
    () => page?.autoRuns.getVersion() ?? 0,
  );
  const tab = useSyncExternalStore(
    page?.pageTab.subscribe ?? subscribeToNothing,
    () => page?.pageTab.shown() ?? "variants",
  );
  const stopping = useStoppingTimes(state?.stoppedAwaitingWorker ?? null);
  const band = bandOf(
    page === null || state === null
      ? null
      : {
          state,
          startedUnder: (key) => page.autoRuns.startedUnder(key),
          pcaLive,
          tab,
          now: stopping?.now ?? 0,
          stoppingSince: stopping?.since ?? null,
        },
    defectsState,
  );

  // Whether the details of the error are shown, until it is closed.
  const [detailsShown, setDetailsShown] = useState(false);
  const [boxShown, setBoxShown] = useState(false);
  const { said, say, clear } = useSaid();
  const error = band.error;
  if (error === null && detailsShown) setDetailsShown(false);
  const details = detailsShown && error !== null;

  const headerRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (header === null) return;
    const giveBack = keepRoom(header, details);
    if (details) return giveBack;
    const stopClearing = keepFocusClear(header);
    return () => {
      stopClearing();
      giveBack();
    };
  }, [details]);

  async function copyDetails(): Promise<void> {
    const text = detailsText(
      defects.details(),
      state?.popneiVersion ?? null,
      appVersion,
    );
    try {
      // navigator.clipboard is missing on a page served over plain HTTP
      // from another machine, and the call then throws.
      await navigator.clipboard.writeText(text);
      say(COPIED);
    } catch {
      setBoxShown(true);
      say(NOT_COPIED);
    }
  }

  function close(): void {
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
      className={classOf(styles, details ? "bandScrolls" : "band")}
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
            <Line
              line={band.line}
              page={page}
              onLink={(warnings) => {
                showPcaTab(page.pageTab, warnings);
              }}
            />
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
                    state?.popneiVersion ?? null,
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

/** What the line after "Popnei" is drawn with. */
interface LineProps {
  readonly line: BandLine;
  readonly page: BandWith;
  /** The link to the PCA tab was followed: to its warnings, or, `false`,
      to its error. */
  readonly onLink: (warnings: boolean) => void;
}

/** The line after "Popnei": its words or its link, and its Stop. */
function Line({ line, page, onLink }: LineProps): React.JSX.Element | null {
  const stop = stopOf(line);
  const control =
    stop === null ? null : (
      <span className={classOf(styles, "control")}>
        <Button
          label={stop.label}
          name={stop.name}
          onPress={() => {
            pressStop(stop, page);
          }}
        />
      </span>
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
                onLink(line.warnings !== null);
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
      {line.kind === "pcaRunning" ? (
        // A new request is a new clock.
        <Clocked key={line.runId} line={line} runId={line.runId} />
      ) : (
        <Words words={lineWords(line, 0)} />
      )}
      {control}
    </>
  );
}

/** The words of the PCA running, with its clock. */
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
      <span className={classOf(styles, "full")}>{words.full}</span>
      <span className={classOf(styles, "short")} aria-hidden="true">
        {words.short}
      </span>
    </span>
  );
}

/** The band's Stop `stop`: of the one pass, as the box's, said in the
    status region as it; of the PCA, running or about to start, as the PCA tab's,
    `pause`, which the page says. The button then goes, and the focus
    goes to the heading "Popnei". */
function pressStop(stop: BandStop, page: BandWith): void {
  keepingFocus(() => {
    switch (stop.stops) {
      case "pass":
        page.autoRuns.stop(POPGEN2_CHAIN);
        page.announcer.announce(stoppedText());
        return;
      case "pca":
      case "live":
        page.autoRuns.pause(PCA);
        return;
    }
  });
}

/** Shows the PCA tab, as a click on its label would, and gives the focus
    to the heading of its warnings, `warnings`, or to that of the tab,
    once the application's root has drawn it. */
function showPcaTab(pageTab: PageTabStore, warnings: boolean): void {
  pageTab.show("pca");
  requestAnimationFrame(() => {
    const content = document.getElementById(PCA_TAB_CONTENT_ID);
    const heading = content?.querySelector(
      warnings ? "[data-warnings-heading]" : "h2",
    );
    if (heading instanceof HTMLElement) heading.focus();
  });
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

/** When the band looks again at a Stop waiting, after it first saw it:
    the 10 s of `STOPPING_MAX_MS`, a little later, so that the look falls
    after them. */
const STOPPING_LOOK_MS = 10_050;

/** The text of the band's own status region, and `say`, which empties it
    and writes `text` a frame later, so that a second Copy, which gives
    the same words, is heard; and `clear`, which empties it. */
function useSaid(): {
  readonly said: string;
  readonly say: (text: string) => void;
  readonly clear: () => void;
} {
  const [said, setSaid] = useState("");
  const pending = useRef<number | null>(null);
  const cancel = (): void => {
    if (pending.current !== null) cancelAnimationFrame(pending.current);
    pending.current = null;
  };
  useEffect(() => cancel, []);
  return {
    said,
    say: (text) => {
      cancel();
      setSaid("");
      pending.current = requestAnimationFrame(() => {
        pending.current = null;
        setSaid(text);
      });
    },
    clear: () => {
      cancel();
      setSaid("");
    },
  };
}

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
 * Scrolls the page so that an element of it that takes the focus is
 * below the band `header`, fixed at the top of the window, and not under
 * it (WCAG 2.4.11). The padding of the scroll of base.css does it in
 * Chromium; WebKit 26.6 ignores it when the element is already in the
 * window, and left a number box reached by Shift+Tab 42 pixels under the
 * band at 1280 by 600 pixels (seen on 10 October 2026). Looked at as the
 * focus comes; a second look a frame later stopped the menus "Download…"
 * of the Variants tab from handing a PNG to the browser in Chromium 153,
 * for a reason not found, and WebKit needs none.
 */
function keepFocusClear(header: HTMLElement): () => void {
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
    clear(event.target);
  };
  document.addEventListener("focusin", onFocusIn);
  return () => {
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
