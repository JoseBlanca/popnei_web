/**
 * The buttons that open the two files of popgen2.html, as a user finds
 * them since 16 October 2026 (docs/plans/file-buttons.md): before a file
 * of its kind is open, "Open variants file…" or "Open individuals file…"
 * at the bottom of its box; once one is, "Open another variants file…"
 * at the end of the Variants tab, or "Open another individuals file…"
 * at the end of the Individuals tab, which the flow shows first when
 * another tab is shown, as a user would. A file is dropped there too: the
 * box of a file open takes no drop (the owner's decision of 16 October
 * 2026).
 */
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import type { FileChooser, Locator, Page } from "@playwright/test";

import { dropFiles } from "./dropFiles.ts";

/** What a file picker is given: a path, a file the flow makes, or
    several. */
type PickedFiles = Parameters<FileChooser["setFiles"]>[0];

/** The two files of the page. */
export type FileKind = "variants" | "individuals";

/** The heading of the box of each file, and the label of its tab. */
const NAME: Readonly<Record<FileKind, string>> = {
  variants: "Variants",
  individuals: "Individuals",
};

/** The box of the file `kind`, named by its heading. */
export function fileBox(page: Page, kind: FileKind): Locator {
  return page.getByRole("region", { name: NAME[kind], exact: true });
}

/** The label of the tab of the file `kind`. */
export function fileTab(page: Page, kind: FileKind): Locator {
  return page
    .getByRole("tablist", { name: "Files and analyses" })
    .getByRole("tab", { name: NAME[kind], exact: true });
}

/** The panel of the tab of the file `kind`, while it is shown. */
export function filePanel(page: Page, kind: FileKind): Locator {
  return page.getByRole("tabpanel", { name: NAME[kind], exact: true });
}

/** The button of the box that opens the first file of `kind`, "Open
    variants file…", there while no file of that kind is open. */
export function firstOpenButton(page: Page, kind: FileKind): Locator {
  return fileBox(page, kind).getByRole("button", {
    name: `Open ${kind} file…`,
    exact: true,
  });
}

/** The button at the end of the tab of `kind` that opens another file,
    "Open another variants file…", there while a file of that kind is
    open and its tab is shown. */
export function anotherOpenButton(page: Page, kind: FileKind): Locator {
  return filePanel(page, kind).getByRole("button", {
    name: `Open another ${kind} file…`,
    exact: true,
  });
}

/** The button that opens a file of `kind` now: the box's with no file of
    that kind open; with one, the one at the end of its tab, whose tab is
    shown first when it is not. */
export async function openButtonOf(
  page: Page,
  kind: FileKind,
): Promise<Locator> {
  // The box is drawn before the flow looks into it.
  await fileBox(page, kind).waitFor();
  const first = firstOpenButton(page, kind);
  if ((await first.count()) > 0) return first;
  const tab = fileTab(page, kind);
  if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
  return anotherOpenButton(page, kind);
}

/** Opens `files`, a path or a file the flow makes, as a file of `kind`
    with the button that opens one now, through the file picker of the
    system, as a user does. */
export async function pickFile(
  page: Page,
  kind: FileKind,
  files: PickedFiles,
): Promise<void> {
  const button = await openButtonOf(page, kind);
  const chooser = page.waitForEvent("filechooser");
  await button.click();
  await (await chooser).setFiles(files);
}

/** Drops the file at `path` on the zone at the end of the tab of
    `kind`, beside its button "Open another … file…", as a drag from the
    desktop does, after showing that tab when another is shown, as a user
    does: since 16 October 2026 the box of a file open takes no drop, and
    the zone in its tab is where another file is dropped. The tab of the
    file stays shown. */
export async function dropInTab(
  page: Page,
  kind: FileKind,
  path: string,
): Promise<void> {
  const tab = fileTab(page, kind);
  if ((await tab.getAttribute("aria-selected")) !== "true") await tab.click();
  await dropFiles(page, anotherOpenButton(page, kind), [
    { name: basename(path), bytes: [...(await readFile(path))] },
  ]);
}
