/**
 * The browser's download of a text the application wrote: a link to a
 * `Blob` of the text, clicked and then released. The browser saves the
 * file under `name`, or asks where, as the user set it.
 */

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
  // Released once the click has been handled: Safari reads the link
  // after the click returns.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  });
}
