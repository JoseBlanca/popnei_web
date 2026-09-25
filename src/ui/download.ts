/**
 * The browser's download of a text the application wrote: a link to a
 * `Blob` of the text, clicked and then released. The browser saves the
 * file under `name`, or asks where, as the user set it.
 */

/** How long the link to the text is kept, in milliseconds. */
const RELEASE_AFTER_MS = 60_000;

/**
 * Downloads `text`, in UTF-8 with no byte order mark, as a file named
 * `name` of the media type `type`, "text/csv".
 */
export function downloadText(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(
    new Blob([text], { type: `${type};charset=utf-8` }),
  );
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
