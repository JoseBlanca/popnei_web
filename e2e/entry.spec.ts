/**
 * The page of the population genetics application on the built site: it
 * opens with no error bar, the errors of our own code that nothing else
 * shows reach the bar, and the start guard says when the application's
 * code could not be loaded or run, and a crash of the calculation worker
 * is not an error of the page (docs/specs/entry.md, "How it is verified";
 * docs/specs/shell.md, "The error bar").
 */
import type { Locator, Page, Worker } from "@playwright/test";

import { expect, test } from "./axe.ts";

/** The bar's words for an error thrown with the message "test", once the
    store is made. */
const BAR_TEST =
  "The application met an error of its own: test. Your project is intact: save it, then reload the page.";

async function openPopgen(page: Page): Promise<void> {
  // Relative to the base path, with no leading slash (testing.md).
  await page.goto("popgen.html");
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
}

function bar(page: Page): Locator {
  return page.getByRole("alert");
}

function steps(page: Page): Locator {
  return page.getByRole("navigation", { name: "Steps" });
}

/** Throws from a handler of the page, a timer, since a throw directly
    inside page.evaluate would reject the call of the test and never reach
    the page's listener. */
async function throwFromHandler(page: Page, message: string): Promise<void> {
  await page.evaluate((text) => {
    setTimeout(() => {
      throw new Error(text);
    });
  }, message);
}

test("WS7 D2 the page opens with the frame at Variants and no error bar, and axe finds no violation", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPopgen(page);

  await expect(page).toHaveTitle("Variants · Population genetics · popnei web");
  const header = page.getByRole("banner");
  await expect(
    header.getByRole("link", { name: "popnei web" }),
  ).toHaveAttribute("href", "index.html");
  await expect(header).toContainText("Population genetics");
  const links = steps(page).getByRole("link");
  await expect(links.nth(0)).toHaveAccessibleName("Variants, To do");
  await expect(links.nth(1)).toHaveAccessibleName("Individuals, To do");
  await expect(links.nth(2)).toHaveAccessibleName("Analyses, Locked");
  await expect(links.first()).toHaveAttribute("aria-current", "step");
  await expect(links.nth(1)).not.toHaveAttribute("aria-current");
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toHaveText("Variants");
  // The status regions of the bar and of the shell, empty and on the page.
  await expect(page.getByRole("status")).toHaveText(["", ""]);
  await expect(bar(page)).toHaveText("");
  // No button of the error bar; the Variants step has buttons of its own.
  await expect(
    page.getByRole("button", {
      name: /^(Close|Copy the details|Save the project)$/,
    }),
  ).toHaveCount(0);
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("WS7 D2 the links of the stepper change the step and the title, the back button goes to the step before, and the focus is on the heading of the new step", async ({
  page,
}) => {
  await openPopgen(page);
  const link = (name: string): Locator =>
    steps(page).getByRole("link", { name });
  const heading = (name: string): Locator =>
    page.getByRole("heading", { level: 1, name });

  await link("Analyses").click();

  await expect(page).toHaveURL(/popgen\.html#analyses$/);
  await expect(page).toHaveTitle("Analyses · Population genetics · popnei web");
  await expect(heading("Analyses")).toBeFocused();
  await expect(link("Analyses")).toHaveAttribute("aria-current", "step");
  await expect(link("Variants")).not.toHaveAttribute("aria-current");

  // With the keyboard: the link reached, and Enter.
  await link("Individuals").focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveTitle(
    "Individuals · Population genetics · popnei web",
  );
  await expect(heading("Individuals")).toBeFocused();

  await page.goBack();

  await expect(page).toHaveURL(/popgen\.html#analyses$/);
  await expect(page).toHaveTitle("Analyses · Population genetics · popnei web");
  await expect(heading("Analyses")).toBeFocused();
});

test("WS7 D2 the Tab key goes through the error bar, the header and the stepper in their order", async ({
  page,
}) => {
  await openPopgen(page);
  await throwFromHandler(page, "test");
  await expect(bar(page)).toHaveText(BAR_TEST);
  // Undo and Redo, disabled on a page just opened, are not stops.
  const order = [
    page.getByRole("button", { name: "Save the project" }),
    page.getByRole("button", { name: "Copy the details" }),
    page.getByRole("button", { name: "Close" }),
    page.getByRole("banner").getByRole("link", { name: "popnei web" }),
    page.getByRole("banner").getByRole("button", { name: "Open project…" }),
    page.getByRole("banner").getByRole("button", { name: "Save project" }),
    steps(page).getByRole("link", { name: "Variants" }),
    steps(page).getByRole("link", { name: "Individuals" }),
    steps(page).getByRole("link", { name: "Analyses" }),
  ];

  for (const next of order) {
    await page.keyboard.press("Tab");
    await expect(next).toBeFocused();
  }
});

test("WS7 D2 an error thrown from a handler shows the error bar as an alert", async ({
  page,
  makeAxeBuilder,
}) => {
  await openPopgen(page);

  await throwFromHandler(page, "test");

  await expect(bar(page)).toHaveText(BAR_TEST);
  await expect(
    page.getByRole("button", { name: "Copy the details" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
  expect((await makeAxeBuilder().analyze()).violations).toEqual([]);
});

test("WS7 D2 a promise rejected with nothing to handle it shows the error bar as an alert", async ({
  page,
}) => {
  await openPopgen(page);

  await page.evaluate(() => {
    void Promise.reject(new Error("test"));
  });

  await expect(bar(page)).toHaveText(BAR_TEST);
});

test("WS7 D2 a second error adds its count after the first, which stays", async ({
  page,
}) => {
  await openPopgen(page);

  await throwFromHandler(page, "test");
  await expect(bar(page)).toHaveText(BAR_TEST);
  await throwFromHandler(page, "another");

  await expect(page.getByText("1 more error followed it.")).toBeVisible();
  await expect(bar(page)).toHaveText(BAR_TEST);
});

test("WS7 D2 Close empties the bar and gives the focus to the heading of the step", async ({
  page,
}) => {
  await openPopgen(page);
  await throwFromHandler(page, "test");
  await expect(bar(page)).toHaveText(BAR_TEST);

  await page.getByRole("button", { name: "Close" }).click();

  await expect(bar(page)).toHaveText("");
  // No button of the error bar; the Variants step has buttons of its own.
  await expect(
    page.getByRole("button", {
      name: /^(Close|Copy the details|Save the project)$/,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeFocused();
});

test("WS7 D2 Copy the details with no clipboard shows the details in a box", async ({
  page,
}) => {
  await openPopgen(page);
  // A browser without the clipboard, as on a page served over plain HTTP
  // from another machine.
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
  });
  await throwFromHandler(page, "test");

  await page.getByRole("button", { name: "Copy the details" }).click();

  // The bar's own status region, the first of the page, above the shell's.
  await expect(page.getByRole("status").first()).toHaveText(
    "The details could not be copied. Select them in the box below and copy them.",
  );
  const box = page.getByRole("textbox", { name: "The details of the errors" });
  await expect(box).toHaveValue(/popnei web: 0\.1\.0/);
  await expect(box).toHaveValue(
    /Error 1, thrown in an event handler, through the window's error event:\ntest\n/,
  );
});

test("WS7 D2 the box of the details takes in an error that follows it", async ({
  page,
}) => {
  await openPopgen(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
  });
  await throwFromHandler(page, "test");
  await page.getByRole("button", { name: "Copy the details" }).click();
  const box = page.getByRole("textbox", { name: "The details of the errors" });
  await expect(box).toHaveValue(/\ntest\n/);

  await throwFromHandler(page, "another");

  await expect(box).toHaveValue(/Error 2, [^\n]*:\nanother\n/);
});

test("WS7 D2 the entry's file answered 404 says the application could not be loaded", async ({
  page,
}) => {
  await page.route("**/assets/popgen-*.js", (route) =>
    route.fulfill({ status: 404, body: "" }),
  );

  await page.goto("popgen.html");

  await expect(
    page.getByText("The application could not be loaded. Reload the page.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("WS7 D2 the entry's file of bad syntax says the application could not start", async ({
  page,
}) => {
  await page.route("**/assets/popgen-*.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: "this is not ( JavaScript",
    }),
  );

  await page.goto("popgen.html");

  await expect(
    page.getByText(/^The application could not start: .+\. Reload the page\.$/),
  ).toBeVisible();
  await expect(page.getByText(/Uncaught|\.\./)).toHaveCount(0);
});

test("WS7 D2 the entry's file that throws says the application could not start, with the message as it was thrown", async ({
  page,
}) => {
  await page.route("**/assets/popgen-*.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: 'throw new Error("the entry failed.");',
    }),
  );

  await page.goto("popgen.html");

  await expect(
    page.getByText(
      "The application could not start: Error: the entry failed. Reload the page.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("WS7 D2 a browser without Array.prototype.toSorted is told it is too old, with no error bar", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(Array.prototype, "toSorted");
  });

  await page.goto("popgen.html");

  await expect(
    page.getByText(
      "The application needs Chrome or Edge 111, Firefox 115 or Safari 16.4, or a newer version, and this browser is older.",
      { exact: true },
    ),
  ).toBeVisible();
  // The entry stopped at its first line, before it drew the bar.
  await expect(bar(page)).toHaveCount(0);
  await expect(steps(page)).toHaveCount(0);
});

test("WS7 D2 a defect while the entry starts shows the bar with its words for the start, and no Loading", async ({
  page,
}) => {
  // createStore freezes the first project, the one object with the field
  // app "popgen" that is frozen as the page starts.
  await page.addInitScript(() => {
    const freeze = Object.freeze;
    Object.freeze = <T>(value: T): Readonly<T> => {
      if (
        typeof value === "object" &&
        value !== null &&
        "app" in value &&
        value.app === "popgen"
      ) {
        throw new Error("test");
      }
      return freeze(value);
    };
  });

  await page.goto("popgen.html");

  await expect(bar(page)).toHaveText(
    "The application met an error of its own as it started: test. Reload the page.",
  );
  await expect(page.getByText(/Loading/)).toHaveCount(0);
});

test("WS7 D2 a throw while a step is drawn shows the bar and keeps the frame and the step's heading", async ({
  page,
}) => {
  // The number field of the Variants step formats its value with
  // Intl.NumberFormat, which the header and the stepper do not call.
  await page.addInitScript(() => {
    Object.defineProperty(Intl, "NumberFormat", {
      // A function, which new can call, unlike an arrow function.
      value: function () {
        throw new Error("test");
      },
    });
  });

  await page.goto("popgen.html");

  await expect(bar(page)).toContainText(
    "The application met an error of its own: test.",
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Variants" }),
  ).toBeVisible();
  await expect(page.getByRole("banner")).toContainText("Population genetics");
  await steps(page).getByRole("link", { name: "Individuals" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Individuals" }),
  ).toBeVisible();
});

test("WS7 D2 a throw inside the calculation worker, outside a request, starts it again and shows no error bar", async ({
  page,
}) => {
  const isCalculation = (w: Worker): boolean =>
    w.url().includes("runnerWorker");
  const first = page.waitForEvent("worker", isCalculation);
  await openPopgen(page);
  const crashed = await first;
  // popnei's wasm fetched, so that the throw most likely reaches a worker
  // that is ready and idle; one still starting is started again as well.
  await expect
    .poll(() =>
      crashed.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .some((entry) => entry.name.endsWith(".wasm")),
      ),
    )
    .toBe(true);
  const closed = new Promise<void>((resolve) => {
    crashed.on("close", () => {
      resolve();
    });
  });
  const second = page.waitForEvent("worker", isCalculation);

  // A timer, as on the page: a throw directly inside evaluate would reject
  // the call of the test and never reach the worker's own handler.
  await crashed.evaluate(() => {
    setTimeout(() => {
      throw new Error("test");
    });
  });

  await closed;
  await second;
  await expect(bar(page)).toHaveText("");
  // No button of the error bar; the Variants step has buttons of its own.
  await expect(
    page.getByRole("button", {
      name: /^(Close|Copy the details|Save the project)$/,
    }),
  ).toHaveCount(0);
});

test("WS7 D2 in a browser in Spanish the threshold is written the English way", async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: "es-ES" });
  const page = await context.newPage();
  await openPopgen(page);

  await expect(
    page.getByLabel("Maximum proportion of missing genotypes"),
  ).toHaveValue("0.1");
  await context.close();
});

test("WS7 D2 the noise of a ResizeObserver loop shows no error bar", async ({
  page,
}) => {
  await openPopgen(page);
  // An observer that resizes what it observes: the browser gives up on the
  // loop and fires the window's error event with "ResizeObserver loop …".
  const noises = await page.evaluate(async () => {
    let count = 0;
    window.addEventListener("error", (event) => {
      if (event.message.startsWith("ResizeObserver loop")) count += 1;
    });
    const box = document.createElement("div");
    document.body.append(box);
    let width = 10;
    new ResizeObserver(() => {
      width += 1;
      box.style.width = `${String(width)}px`;
    }).observe(box);
    for (let frame = 0; frame < 5; frame++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return count;
  });
  expect(noises).toBeGreaterThan(0);

  // An error after it is the first the bar shows, with none before it.
  await throwFromHandler(page, "test");
  await expect(bar(page)).toHaveText(BAR_TEST);
});

test("WS7 D2 an error event with no error shows its message in the bar", async ({
  page,
}) => {
  await openPopgen(page);
  await page.evaluate(() => {
    window.dispatchEvent(
      new ErrorEvent("error", { message: "a script of another origin failed" }),
    );
  });
  await expect(bar(page)).toHaveText(
    "The application met an error of its own: a script of another origin failed. Your project is intact: save it, then reload the page.",
  );
});

test("WS7 D2 the details of the errors give popnei's version once the calculation worker is ready", async ({
  page,
}) => {
  await openPopgen(page);
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
  });
  await throwFromHandler(page, "test");
  await page.getByRole("button", { name: "Copy the details" }).click();
  const box = page.getByRole("textbox", { name: "The details of the errors" });

  await expect(box).toHaveValue(/\npopnei: 0\.1\.0\n/);
});
