import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import optimizeLocales from "@react-aria/optimize-locales-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The pages are at the root, so the build writes them to the root of dist/
// and they are served at /popnei_web/<name>.html (docs/technology.md,
// section 4).
const page = (name: string): string =>
  resolve(import.meta.dirname, `${name}.html`);

/**
 * The version of the application, the number in package.json, raised by
 * hand at a release that changes what the site calculates or saves
 * (docs/specs/entry.md, "The version of the application").
 */
function appVersion(): string {
  const text = readFileSync(resolve(import.meta.dirname, "package.json"), {
    encoding: "utf8",
  });
  const parsed: unknown = JSON.parse(text);
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "version" in parsed &&
    typeof parsed.version === "string" &&
    parsed.version !== ""
  ) {
    return parsed.version;
  }
  throw new Error("package.json has no version, which the site is built with.");
}

export default defineConfig({
  base: "/popnei_web/",
  // Several pages and no single-page fallback: a missing file is a 404,
  // as on GitHub Pages, and not index.html with status 200.
  appType: "mpa",
  // React Aria's words in the one language of the application; those of
  // its 33 other languages are left out of the build (docs/technology.md,
  // "React Aria Components"). The entry sets React Aria's language to it.
  plugins: [react(), optimizeLocales.vite({ locales: ["en-US"] })],
  // A page is added here with its stage: the build fails on a page that
  // does not exist.
  input: {
    index: page("index"),
    probe: page("probe"),
    popgen: page("popgen"),
  },
  // Written into the code at the build as a literal, where the entry of a
  // page names APP_VERSION.
  define: { APP_VERSION: JSON.stringify(appVersion()) },
  // The floor of the applications (docs/technology.md, section 6).
  build: { target: ["chrome111", "edge111", "firefox115", "safari16.4"] },
  // A module worker, not the default, "iife" (worker.md).
  worker: { format: "es" },
  // What cargo writes while it builds the files crate is not watched.
  server: { watch: { ignored: ["**/crates/files/target/**"] } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: [
            "src/core/**/*.test.ts",
            "src/worker/**/*.test.ts",
            "src/ui/**/*.test.ts",
            "src/probe/**/*.test.ts",
          ],
          environment: "node",
        },
      },
    ],
  },
});
