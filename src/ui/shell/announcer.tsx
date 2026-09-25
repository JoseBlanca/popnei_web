/**
 * The announcer of the status region, given to the screens
 * (docs/specs/shell.md, "The status region"). The entry makes it once,
 * with `createAnnouncer` of status.ts, and gives it through
 * `AnnouncerProvider`; the status region of the shell reads it, and a
 * screen announces what one of its event handlers did with `useAnnouncer`.
 */
import { createContext, useContext } from "react";

import type { Announcer } from "./status.ts";

const AnnouncerContext = createContext<Announcer | null>(null);

/** Gives the announcer to every component under it. */
export const AnnouncerProvider = AnnouncerContext.Provider;

/** The announcer of the page. Throws a defect outside an
    `AnnouncerProvider`. */
export function useAnnouncer(): Announcer {
  const announcer = useContext(AnnouncerContext);
  if (announcer === null) {
    throw new Error(
      "popnei_web defect: useAnnouncer outside an AnnouncerProvider",
    );
  }
  return announcer;
}
