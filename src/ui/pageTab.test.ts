import { describe, expect, test } from "vitest";

import { createPageTab } from "./pageTab.ts";

describe("NU5 D2 the tab shown of popgen2.html, a store of the screen", () => {
  test("it starts at the Variants tab, and a tab shown is read back and told to every listener", () => {
    const pageTab = createPageTab();
    expect(pageTab.shown()).toBe("variants");
    const told: string[] = [];
    pageTab.subscribe(() => {
      told.push(`first ${pageTab.shown()}`);
    });
    pageTab.subscribe(() => {
      told.push(`second ${pageTab.shown()}`);
    });

    pageTab.show("pca");

    expect(pageTab.shown()).toBe("pca");
    expect(told).toEqual(["first pca", "second pca"]);
  });

  test("the tab already shown, shown again, tells nobody", () => {
    const pageTab = createPageTab();
    let told = 0;
    pageTab.subscribe(() => {
      told += 1;
    });

    pageTab.show("variants");

    expect(told).toBe(0);
  });

  test("a listener that stopped is told nothing more", () => {
    const pageTab = createPageTab();
    let told = 0;
    const stop = pageTab.subscribe(() => {
      told += 1;
    });
    pageTab.show("individuals");
    stop();

    pageTab.show("pca");

    expect(told).toBe(1);
    expect(pageTab.shown()).toBe("pca");
  });
});
