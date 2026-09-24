import { defineConfig, devices } from "@playwright/test";

// A server already running, such as `npm run dev` or the deployed site;
// otherwise the built site under vite preview, at the base path it has on
// GitHub Pages (testing.md).
const running = process.env["BASE_URL"];
const preview = "http://localhost:4173/popnei_web/";
const ci = process.env["CI"] !== undefined;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [["html", { open: "never" }], ["github"]] : "list",
  use: {
    baseURL: running ?? preview,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // No field rather than `webServer: undefined`, which
  // exactOptionalPropertyTypes refuses.
  ...(running === undefined && {
    webServer: {
      command: "npm run preview -- --port 4173 --strictPort",
      url: preview,
      reuseExistingServer: !ci,
    },
  }),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /screens\.spec\.ts/,
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: /screens\.spec\.ts/,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: /screens\.spec\.ts/,
    },
    {
      name: "screens",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /screens\.spec\.ts/,
    },
  ],
});
