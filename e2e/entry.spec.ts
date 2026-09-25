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
  await expect(links).toHaveText(["Variants", "Individuals", "Analyses"]);
  await expect(links.first()).toHaveAttribute("aria-current", "step");
  await expect(links.nth(1)).not.toHaveAttribute("aria-current");
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toHaveText("Variants");
  // The status regions of the bar and of the shell, empty and on the page.
  await expect(page.getByRole("status")).toHaveText(["", ""]);
  await expect(bar(page)).toHaveText("");
  await expect(page.getByRole("button")).toHaveCount(0);
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
  const order = [
    page.getByRole("button", { name: "Copy the details" }),
    page.getByRole("button", { name: "Close" }),
    page.getByRole("banner").getByRole("link", { name: "popnei web" }),
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
  await expect(page.getByRole("button")).toHaveCount(0);
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
  await expect(page.getByRole("button")).toHaveCount(0);
});
