/**
 * A file dropped on a page outside the zones of a file
 * (docs/specs/entry.md, "A file dropped outside a zone"): on both pages,
 * the drag over a heading and its drop have their defaults prevented,
 * which is what keeps the browser from opening the file in the tab in
 * place of the page, and the page stays as it was; a file dropped on the
 * zone of the variants file still opens. A script cannot make the
 * browser open a file it drops, so the flow reads whether the page
 * prevented the defaults, as the browser does before it opens the file.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { Locator, Page } from "@playwright/test";

import { expect, test } from "./axe.ts";
import { dropFiles } from "./dropFiles.ts";

const FIXTURES = join(import.meta.dirname, "fixtures");

/** What the page did with a drag of a file over `target` and its drop:
    whether each had its default prevented, and the drop effect the drag
    over it ended with. */
interface StrayDrop {
  readonly dragoverPrevented: boolean;
  readonly dropEffect: string;
  readonly dropPrevented: boolean;
}

/** Drags a file named other.csv over `target` and drops it there, with
    events the page's listeners may cancel, as the browser's are. */
async function strayDrop(target: Locator): Promise<StrayDrop> {
  return target.evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File(["IID,pop\ns000,q\n"], "other.csv", { type: "text/csv" }),
    );
    const fire = (type: string): boolean =>
      !element.dispatchEvent(
        new DragEvent(type, {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }),
      );
    fire("dragenter");
    const dragoverPrevented = fire("dragover");
    const dropEffect = transfer.dropEffect;
    const dropPrevented = fire("drop");
    return { dragoverPrevented, dropEffect, dropPrevented };
  });
}

/** What a drop outside every zone should give. */
const STOPPED: StrayDrop = {
  dragoverPrevented: true,
  dropEffect: "none",
  dropPrevented: true,
};

/** The bytes of panel.nei, as a drop carries them. */
async function panelBytes(): Promise<readonly number[]> {
  return [...(await readFile(join(FIXTURES, "panel.nei")))];
}

/** The heading of the page, level 1, `name`. */
function heading(page: Page, name: string): Locator {
  return page.getByRole("heading", { level: 1, name, exact: true });
}

test("EN30 popgen2.html: a file dropped on the page's heading and on the heading of the box Individuals is stopped and the page stays; one dropped on the zone of the variants file opens", async ({
  page,
}) => {
  await page.goto("popgen2.html");
  await expect(heading(page, "Popnei")).toBeVisible();
  const url = page.url();

  expect(await strayDrop(heading(page, "Popnei"))).toEqual(STOPPED);
  expect(
    await strayDrop(
      page
        .getByRole("region", { name: "Individuals", exact: true })
        .getByRole("heading"),
    ),
  ).toEqual(STOPPED);
  expect(page.url()).toBe(url);
  await expect(heading(page, "Popnei")).toBeVisible();

  const variants = page.getByRole("region", { name: "Variants", exact: true });
  await dropFiles(
    page,
    variants.getByRole("button", { name: "Open variants file…" }),
    [{ name: "panel.nei", bytes: await panelBytes() }],
  );
  await expect(
    variants.getByRole("button", { name: "Open another variants file…" }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page
      .getByRole("region", { name: "File information" })
      .getByText("Variants: 1,200", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  expect(await strayDrop(heading(page, "Popnei"))).toEqual(STOPPED);
});

test("EN30 popgen.html: a file dropped on the step's heading is stopped and the page stays; one dropped on the zone of the variants file opens", async ({
  page,
}) => {
  await page.goto("popgen.html#variants");
  await expect(heading(page, "Variants")).toBeVisible();
  const url = page.url();

  expect(await strayDrop(heading(page, "Variants"))).toEqual(STOPPED);
  expect(page.url()).toBe(url);
  await expect(heading(page, "Variants")).toBeVisible();

  const zone = page.getByRole("region", { name: "Variants file" });
  await dropFiles(page, zone.getByRole("button", { name: /^Choose .*…$/u }), [
    { name: "panel.nei", bytes: await panelBytes() },
  ]);
  await expect(
    zone.getByRole("button", { name: "Replace panel.nei…" }),
  ).toBeVisible({ timeout: 20_000 });
});
