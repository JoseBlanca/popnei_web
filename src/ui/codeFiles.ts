/**
 * The files of a piece of code downloaded apart from the page's, asked
 * of the network before its `import()` (src/ui/codeDownload.ts).
 *
 * Chromium 153 and WebKit 26.6 keep the failure of a file an `import()`
 * met, for the life of the page: a later `import()` of the same address,
 * or of a file that imports it, gets the same failure without asking the
 * network, and the files of a tab's code import files that popgen.html
 * shares, whose addresses no retry can change (the review of work
 * package 1 of docs/plans/population-tab.md, 11 October 2026). So each
 * file the `import()` would fetch is first asked for with `fetch`, which
 * keeps nothing of a failure, and the `import()` is made only once every
 * one has arrived; the browser then finds them in its cache when the
 * site is served with one, as GitHub Pages does for 10 minutes.
 *
 * The files are read from the manifest of the build, `manifest.json`
 * beside the pages (vite.config.ts), which names, for each source loaded
 * with `import()`, its first file, the files it imports and its styles.
 * The development server has no manifest and serves each source on its
 * own: there nothing is asked first.
 */
import type { Result } from "../core/result.ts";

/** Why the files of a source could not be read from the manifest. */
export type CodeFilesError =
  | { readonly kind: "notManifest" }
  | { readonly kind: "unknownSource"; readonly source: string };

/** A chunk of the manifest, as far as it is read. */
interface ManifestChunk {
  readonly file: string;
  readonly imports: readonly string[];
  readonly css: readonly string[];
}

/** Whether `value` is an array of strings. */
function isStrings(value: unknown): value is readonly string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

/** The chunk of the manifest `manifest` under `key`, or `null` when there
    is none or it is not of the shape Vite writes. */
function chunkOf(manifest: object, key: string): ManifestChunk | null {
  if (!Object.hasOwn(manifest, key)) return null;
  const chunk: unknown = Object.getOwnPropertyDescriptor(manifest, key)?.value;
  if (typeof chunk !== "object" || chunk === null) return null;
  const file = "file" in chunk ? chunk.file : undefined;
  const imports = "imports" in chunk ? chunk.imports : [];
  const css = "css" in chunk ? chunk.css : [];
  if (typeof file !== "string" || !isStrings(imports) || !isStrings(css)) {
    return null;
  }
  return { file, imports, css };
}

/**
 * The files the `import()` of `source`, its path from the root of the
 * project ("src/ui/analyses/pca/PcaTabResultView.tsx"), would fetch, by
 * the manifest `manifest`, as paths under the site ("assets/…"): its
 * first file, the files it imports and theirs, once each, then the
 * styles of each; none of `loaded`, the files the page has already, nor
 * what they import, and none of those it imports with `import()`.
 * Refused when the manifest is not an object of chunks or lacks
 * `source`.
 */
export function codeFilesOf(
  manifest: unknown,
  source: string,
  loaded: ReadonlySet<string>,
): Result<readonly string[], CodeFilesError> {
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    Array.isArray(manifest)
  ) {
    return { ok: false, error: { kind: "notManifest" } };
  }
  const scripts: string[] = [];
  const styles: string[] = [];
  const seen = new Set<string>();
  // The keys named that the manifest lacks or holds of another shape.
  const wrong: string[] = [];
  const visit = (key: string): void => {
    if (seen.has(key)) return;
    seen.add(key);
    const chunk = chunkOf(manifest, key);
    if (chunk === null) {
      wrong.push(key);
      return;
    }
    if (loaded.has(chunk.file)) return;
    scripts.push(chunk.file);
    for (const imported of chunk.imports) visit(imported);
    for (const style of chunk.css) {
      if (!loaded.has(style) && !styles.includes(style)) styles.push(style);
    }
  };
  if (chunkOf(manifest, source) === null) {
    return { ok: false, error: { kind: "unknownSource", source } };
  }
  visit(source);
  if (wrong.length > 0) return { ok: false, error: { kind: "notManifest" } };
  return { ok: true, value: [...scripts, ...styles] };
}

/** The address of the manifest of the build. */
const MANIFEST_ADDRESS = `${import.meta.env.BASE_URL}manifest.json`;

/** The manifest, once it has arrived; asked again after a failure. */
let manifest: Promise<unknown> | null = null;

/** The files under the site that the page has already loaded, as paths
    under the site: its scripts, the scripts its head preloads, and the
    styles its head holds that arrived, a style that failed having no
    sheet. */
function loadedFiles(): ReadonlySet<string> {
  const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
  const addresses = [
    ...[...document.querySelectorAll("script")].map((script) => script.src),
    ...[...document.querySelectorAll("link")]
      .filter(
        (link) =>
          link.rel === "modulepreload" ||
          (link.rel === "stylesheet" && link.sheet !== null),
      )
      .map((link) => link.href),
  ];
  return new Set(
    addresses
      .filter((address) => address.startsWith(base))
      .map((address) => address.slice(base.length)),
  );
}

/** Fetches `address` to its end; refused when the network fails or the
    server answers with an error. */
async function fetchWhole(address: string): Promise<Response> {
  const response = await fetch(address);
  if (!response.ok) {
    throw new Error(
      `${address} could not be downloaded: the server answered ${String(response.status)}.`,
    );
  }
  return response;
}

/**
 * Asks the network for every file of the code of `source` that the page
 * does not have yet, and settles once each has arrived; refused when one
 * could not be downloaded, which leaves nothing kept, so that a later
 * call asks again. With no manifest, in the development server, or a
 * manifest that does not name `source`, as one of a newer site may not,
 * nothing is asked first and the `import()` meets the network itself.
 */
export async function codeFilesReady(source: string): Promise<void> {
  if (import.meta.env.DEV) return;
  manifest ??= fetchWhole(MANIFEST_ADDRESS).then(
    (response) => response.json() as Promise<unknown>,
  );
  let read: unknown;
  try {
    read = await manifest;
  } catch (error) {
    manifest = null;
    throw error;
  }
  const files = codeFilesOf(read, source, loadedFiles());
  if (!files.ok) return;
  const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
  await Promise.all(
    files.value.map(async (file) => {
      await (await fetchWhole(`${base}${file}`)).arrayBuffer();
    }),
  );
}
