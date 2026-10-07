/**
 * What the status regions of a page said, kept as it is said: a text
 * written into a region is replaced by the next one, which may come
 * before a check that waits for it reads it, as the end of the
 * statistics of popgen2.html follows the end of its count.
 */
import type { Page } from "@playwright/test";

/** Keeps, from the next load of `page`, every text the elements of the
    role status take, in their order, for `announced`. */
export async function recordAnnouncements(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const texts: string[] = [];
    Reflect.set(window, "popneiAnnounced", texts);
    // The text each region had at the last change, so that a text said
    // again after the region was emptied is kept again.
    const last = new WeakMap<Element, string>();
    const record = (): void => {
      for (const region of document.querySelectorAll('[role="status"]')) {
        const text = region.textContent;
        if (last.get(region) === text) continue;
        last.set(region, text);
        if (text !== "") texts.push(text);
      }
    };
    new MutationObserver(record).observe(document, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
}

/** The texts the status regions of `page` took since its load, after
    `recordAnnouncements`. */
export async function announced(page: Page): Promise<readonly string[]> {
  return page.evaluate((): string[] => {
    const texts: unknown = Reflect.get(window, "popneiAnnounced");
    return Array.isArray(texts)
      ? texts.filter((text): text is string => typeof text === "string")
      : [];
  });
}
