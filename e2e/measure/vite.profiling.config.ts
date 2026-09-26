/**
 * The profiling build of the measurement of React's commits
 * (e2e/measure.spec.ts, "The commits of React"): the site's config, with
 * `react-dom/client` replaced by profilingRoot.ts, which draws each root
 * in a `<Profiler>` of React's profiling build. It is built outside
 * dist/, into PROFILING_OUT, and served by `vite preview` with the same
 * config; the site's build never reads this file.
 *
 *   PROFILING_OUT=<folder> npx vite build --config e2e/measure/vite.profiling.config.ts
 *   PROFILING_OUT=<folder> npx vite preview --config e2e/measure/vite.profiling.config.ts --port 4174
 */
import { resolve } from "node:path";
import { defineConfig, mergeConfig } from "vite";

import site from "../../vite.config.ts";

const out = process.env["PROFILING_OUT"];
if (out === undefined || out === "") {
  throw new Error(
    "PROFILING_OUT names the folder of the profiling build, outside dist/.",
  );
}

// Vite reads its configuration from a default export, as the root's
// *.config.ts files, which the lint allows by their place. The site's
// config is a function of the mode of the build (vite.config.ts), called
// here with this build's.
// eslint-disable-next-line no-restricted-exports
export default defineConfig((env) =>
  mergeConfig(site(env), {
    resolve: {
      alias: [
        {
          find: /^react-dom\/client$/,
          replacement: resolve(import.meta.dirname, "profilingRoot.ts"),
        },
      ],
    },
    build: { outDir: out, emptyOutDir: true },
  }),
);
