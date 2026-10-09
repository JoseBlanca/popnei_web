/**
 * A download of code apart from the page's, kept once it arrives and
 * asked for again after a failure (codeDownload.ts): its states, which a
 * screen draws, and what each call asks of the network. The download is
 * a function of the test.
 */
import { describe, expect, test } from "vitest";

import { createCodeDownload, failedAddressOf } from "./codeDownload.ts";

/** A download whose answers the test gives, one per call. */
function network(): {
  readonly first: () => Promise<string>;
  readonly asks: () => number;
  readonly answer: (module: string | Error) => void;
} {
  const pending: ((module: string | Error) => void)[] = [];
  return {
    first: () =>
      new Promise<string>((resolve, reject) => {
        pending.push((module) => {
          if (module instanceof Error) reject(module);
          else resolve(module);
        });
      }),
    asks: () => pending.length,
    answer: (module) => {
      pending.at(-1)?.(module);
    },
  };
}

describe("AP6 D3 a download of code apart from the page's", () => {
  test("idle until asked; loading while it comes, one request for every call meanwhile; then loaded, its listeners told at each change", async () => {
    const net = network();
    const code = createCodeDownload(net.first);
    let told = 0;
    code.subscribe(() => {
      told += 1;
    });
    expect(code.state()).toBe("idle");
    expect(code.loaded()).toBeNull();

    const one = code.load();
    const two = code.load();
    expect(net.asks()).toBe(1);
    expect(code.state()).toBe("loading");
    net.answer("module");
    await expect(one).resolves.toBe("module");
    await expect(two).resolves.toBe("module");
    expect(code.state()).toBe("loaded");
    expect(code.loaded()).toBe("module");
    expect(told).toBe(2);
    await code.load();
    expect(net.asks()).toBe(1);
  });

  test("a failure is kept as failed, and the next call asks the network again", async () => {
    const net = network();
    const code = createCodeDownload(net.first);
    const failed = code.load();
    net.answer(new TypeError("Importing a module script failed."));
    await expect(failed).rejects.toThrow("Importing a module script failed.");
    expect(code.state()).toBe("failed");

    const again = code.load();
    expect(net.asks()).toBe(2);
    expect(code.state()).toBe("loading");
    net.answer("module");
    await expect(again).resolves.toBe("module");
    expect(code.state()).toBe("loaded");
  });

  test("the address of a failure is the first of http or https in its message", () => {
    expect(
      failedAddressOf(
        new TypeError(
          "Failed to fetch dynamically imported module: http://localhost:4173/assets/pca3d-AbC.js",
        ),
      ),
    ).toBe("http://localhost:4173/assets/pca3d-AbC.js");
    expect(
      failedAddressOf(new TypeError("Importing a module script failed.")),
    ).toBeNull();
  });
});
