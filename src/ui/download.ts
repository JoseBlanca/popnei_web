/**
 * The browser's download of a text the application wrote, or of a file
 * the calculation worker made: a link to the `Blob`, clicked and then
 * released. The browser saves the file under `name`, or asks where, as
 * the user set it.
 */

/** How long the link to the file is kept, in milliseconds. */
const RELEASE_AFTER_MS = 60_000;

/**
 * Downloads `text`, in UTF-8 with no byte order mark, as a file named
 * `name` of the media type `type`, "text/csv".
 */
export function downloadText(name: string, text: string, type: string): void {
  downloadFile(name, new Blob([text], { type: `${type};charset=utf-8` }));
}

/**
 * Downloads `file` as a file named `name`, whatever made it: the text of
 * `downloadText`, a project file or a table, or a file of the filtered
 * variants the calculation worker wrote. The address of `file` is
 * released a minute after the click, and from then this function holds
 * no reference to it; whatever else holds `file`, the store among them,
 * keeps it in memory.
 */
export function downloadFile(name: string, file: Blob): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  // Released a minute later, as FileSaver.js does: iOS Safari asks the
  // user whether to download before it fetches the link, and a link
  // released before the answer gives a failed download.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, RELEASE_AFTER_MS);
}
