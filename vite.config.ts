import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import optimizeLocales from "@react-aria/optimize-locales-plugin";
import react from "@vitejs/plugin-react";
import { build } from "vite";
import type { Plugin } from "vite";
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

/** The comment of a page where the start guard goes. */
const GUARD_MARK = "<!-- the start guard -->";

/**
 * Puts the start guard, `src/ui/startGuard.js`, inline where a page has
 * the comment `GUARD_MARK`, so that the pages of the applications share
 * one guard that still runs before their code and needs no request of
 * its own (docs/specs/entry.md, "The page"). The file is read for each
 * page, so that an edit reaches the dev server; a page whose entry is
 * under src/ui/ and has no comment stops the build.
 */
function startGuard(): Plugin {
  const path = resolve(import.meta.dirname, "src/ui/startGuard.js");
  return {
    name: "popnei-web-start-guard",
    transformIndexHtml: {
      order: "pre",
      handler: (html, context) => {
        // A page of the applications, whose entry is under src/ui/, needs
        // the guard, and the build stops when its comment is missing.
        if (html.includes('src="/src/ui/') && !html.includes(GUARD_MARK)) {
          throw new Error(
            `${context.path} loads the application and has no ${GUARD_MARK}.`,
          );
        }
        // Read at each page, so that an edit reaches the dev server.
        const source = readFileSync(path, { encoding: "utf8" });
        return html.replace(GUARD_MARK, () => `<script>\n${source}</script>`);
      },
    },
  };
}

/** Whether a build of the site is followed by that of the pages of the tests. */
const testPages = process.env["POPNEI_TEST_PAGES"] !== undefined;

/** The mode of the second build, of the pages of the tests under e2e/ alone. */
const TEST_PAGES_MODE = "testPages";

/**
 * Builds the pages of the tests once the build of the site has closed, in
 * a build of their own, so that they do not change how the bundler splits
 * the code the pages of the site share, and the tests run on the files
 * that are deployed (testing.md, "Against the built site").
 */
function testPagesBuild(): Plugin {
  return {
    name: "popnei-web-test-pages",
    apply: (_config, env) =>
      testPages && env.command === "build" && env.mode !== TEST_PAGES_MODE,
    async closeBundle() {
      await build({
        configFile: resolve(import.meta.dirname, "vite.config.ts"),
        mode: TEST_PAGES_MODE,
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const testPagesOnly = mode === TEST_PAGES_MODE;
  return {
    base: "/popnei_web/",
    // Several pages and no single-page fallback: a missing file is a 404,
    // as on GitHub Pages, and not index.html with status 200.
    appType: "mpa",
    // React Aria's words in the one language of the application; those of
    // its 33 other languages are left out of the build (docs/technology.md,
    // "React Aria Components"). The entry sets React Aria's language to it.
    plugins: [
      react(),
      startGuard(),
      optimizeLocales.vite({ locales: ["en-US"] }),
      testPagesBuild(),
    ],
    // A page is added here with its stage: the build fails on a page that
    // does not exist. The pages of the tests, of the plots and of WebGL,
    // are built only for the tests, when POPNEI_TEST_PAGES is set, by the
    // second build, to dist/e2e/plots.html, dist/e2e/webgl.html and
    // dist/e2e/allows.html, the time of columnAllows alone, so
    // that the site users open does not carry them (testing.md, "Against
    // the built site").
    input: testPagesOnly
      ? {
          plots: page("e2e/plots"),
          webgl: page("e2e/webgl"),
          allows: page("e2e/allows"),
        }
      : {
          index: page("index"),
          probe: page("probe"),
          popgen: page("popgen"),
          popgen2: page("popgen2"),
        },
    // The second build writes beside the site, under dist/e2e/ alone: it
    // keeps what the first wrote and does not copy public/ again.
    ...(testPagesOnly && { publicDir: false as const }),
    // Written into the code at the build as a literal, where the entry of a
    // page names APP_VERSION.
    define: { APP_VERSION: JSON.stringify(appVersion()) },
    // The floor of the applications (docs/technology.md, section 6).
    build: {
      target: ["chrome111", "edge111", "firefox115", "safari16.4"],
      ...(testPagesOnly && { emptyOutDir: false, assetsDir: "e2e/assets" }),
      // The code two pages or more share goes into chunks named for what
      // they hold, rather than one the bundler names after a module in it:
      // React, which the probe shares too, and what the two pages of
      // population genetics share, our store, client and widgets with
      // React Aria. A helper of the bundler is left to the bundler.
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: (id: string) =>
                  /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/u.test(
                    id,
                  )
                    ? "react"
                    : /[\\/](node_modules|src[\\/](core|ui|worker|charts))[\\/]/u.test(
                          id,
                        )
                      ? "shared"
                      : null,
                minShareCount: 2,
              },
            ],
          },
        },
      },
    },
    // A module worker, not the default, "iife" (worker.md).
    worker: { format: "es" },
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
            // A global of the browsers that node 24 lacks, ErrorEvent.
            setupFiles: ["src/nodeTestSetup.ts"],
          },
        },
        {
          // The plots, under jsdom, a DOM emulated in node (testing.md,
          // "src/charts: under jsdom").
          extends: true,
          test: {
            name: "charts",
            include: ["src/charts/**/*.test.ts"],
            environment: "jsdom",
          },
        },
      ],
    },
  };
});
