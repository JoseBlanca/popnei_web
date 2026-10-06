/**
 * A drop of files from the desktop, for the flows of popgen2.html, whose
 * open button is also the zone a file is dropped on.
 */
import type { Locator, Page } from "@playwright/test";

/** A file dropped: its name, and its text or its bytes. */
export type DroppedFile =
  | { readonly name: string; readonly text: string }
  | { readonly name: string; readonly bytes: readonly number[] };

/** Drops `files` on `target`, as a drag from the desktop does. */
export async function dropFiles(
  page: Page,
  target: Locator,
  files: readonly DroppedFile[],
): Promise<void> {
  const dataTransfer = await page.evaluateHandle((given) => {
    // A file a script puts into a DataTransfer has no entry of the file
    // system in Chromium, and React Aria skips an item without one; so
    // the item says it is a file.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with its item, by call
    const entryOf = DataTransferItem.prototype.webkitGetAsEntry;
    DataTransferItem.prototype.webkitGetAsEntry = function (
      this: DataTransferItem,
    ) {
      return (
        entryOf.call(this) ??
        ({ isFile: true, isDirectory: false } as FileSystemEntry)
      );
    };
    const transfer = new DataTransfer();
    for (const file of given) {
      const content = "text" in file ? file.text : new Uint8Array(file.bytes);
      transfer.items.add(new File([content], file.name));
    }
    return transfer;
  }, files);
  for (const type of ["dragenter", "dragover", "drop"]) {
    await target.dispatchEvent(type, { dataTransfer });
  }
}
