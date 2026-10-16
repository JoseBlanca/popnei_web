/**
 * A file dropped on a page outside the zones of a file
 * (docs/specs/entry.md, "A file dropped outside a zone"): on both pages,
 * the drag over a heading and its drop have their defaults prevented,
 * which is what keeps the browser from opening the file in the tab in
 * place of the page, and the page stays as it was; a file dropped on the
 * zone of the variants file still opens. On popgen2.html the box of a
 * file with no file open stops a drop outside its zone, and the box of a
 * file open takes a drop anywhere on it, its heading among
 * (docs/plans/file-buttons.md, 16 October 2026). A script cannot make the
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

test("EN30 popgen2.html: a file dropped on the page's heading and on the heading of the box Individuals with no file is stopped and the page stays; one dropped on the zone of the variants file opens", async ({
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
    page
      .getByRole("region", { name: "File information" })
      .getByText("Variants: 1,200", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByRole("button", { name: "Open another variants file…" }),
  ).toBeVisible();
  expect(await strayDrop(heading(page, "Popnei"))).toEqual(STOPPED);
});

test("EN30 popgen2.html: with a file open, a file dropped on the heading of its box is taken by the box and opens, where the page's heading still stops one", async ({
  page,
}) => {
  await page.goto("popgen2.html");
  await expect(heading(page, "Popnei")).toBeVisible();
  const variants = page.getByRole("region", { name: "Variants", exact: true });
  await dropFiles(
    page,
    variants.getByRole("button", { name: "Open variants file…" }),
    [{ name: "panel.nei", bytes: await panelBytes() }],
  );
  await expect(variants.getByText("panel.nei", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  const boxHeading = variants.getByRole("heading", {
    name: "Variants",
    exact: true,
  });
  // The box's zone prevents the defaults itself, and takes the drop,
  // which other.csv, not a variants file, then gets the words of.
  const taken = await strayDrop(boxHeading);
  expect(taken.dragoverPrevented).toBe(true);
  expect(taken.dropPrevented).toBe(true);
  await expect(variants.getByText(/^other\.csv/u)).toBeVisible();
  await dropFiles(page, boxHeading, [
    { name: "second.nei", bytes: await panelBytes() },
  ]);
  await expect(variants.getByText("second.nei", { exact: true })).toBeVisible({
    timeout: 20_000,
  });
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
