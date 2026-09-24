import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The pages are at the root, so the build writes them to the root of dist/
// and they are served at /popnei_web/<name>.html (docs/technology.md,
// section 4).
const page = (name: string): string =>
  resolve(import.meta.dirname, `${name}.html`);

export default defineConfig({
  base: "/popnei_web/",
  // Several pages and no single-page fallback: a missing file is a 404,
  // as on GitHub Pages, and not index.html with status 200.
  appType: "mpa",
  plugins: [react()],
  // A page is added here with its stage: the build fails on a page that
  // does not exist.
  input: {
    index: page("index"),
    probe: page("probe"),
  },
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
