import { afterEach, describe, expect, test, vi } from "vitest";

import { downloadText } from "./download.ts";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the download of a text", () => {
  test("clicks a link to the text, and releases it only after 60 seconds, since iOS Safari asks before it fetches", () => {
    vi.useFakeTimers();
    const clicked: string[] = [];
    const link = {
      href: "",
      download: "",
      hidden: false,
      click(): void {
        clicked.push(`${this.download} ${this.href}`);
      },
      remove(): void {
        // Out of the page.
      },
    };
    vi.stubGlobal("document", {
      createElement: () => link,
      body: { append: () => undefined },
    });
    const blobs: Blob[] = [];
    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      if (blob instanceof Blob) blobs.push(blob);
      return "blob:the-text";
    });
    const revoke = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    downloadText("panel.diversity.csv", "a,b\n", "text/csv");

    expect(clicked).toEqual(["panel.diversity.csv blob:the-text"]);
    // Said to be UTF-8, so that a program that opens it reads the accents
    // of a name right.
    expect(blobs.map((blob) => blob.type)).toEqual(["text/csv;charset=utf-8"]);
    vi.advanceTimersByTime(59_999);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledWith("blob:the-text");
  });
});
