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
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:the-text");
    const revoke = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    downloadText("panel.diversity.csv", "a,b\n", "text/csv");

    expect(clicked).toEqual(["panel.diversity.csv blob:the-text"]);
    vi.advanceTimersByTime(59_999);
    expect(revoke).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoke).toHaveBeenCalledWith("blob:the-text");
  });
});
