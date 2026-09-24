/**
 * The keys of the results: the canonical form of a JSON value, its hash,
 * the key of an analysis for a project, the key of an intermediate result
 * of the calculation worker, and the fingerprint of the settings of an
 * analysis (docs/specs/core/keys.md).
 */

import type { Project, VariantSource } from "./project.ts";
import type { AnalysisDef } from "./store.ts";

/** A JSON value, which every part of a key and of the project is. */
export type JsonValue =
  null | boolean | number | string | readonly JsonValue[] | JsonObject;

/** A JSON object, whose fields are JSON values. */
export interface JsonObject {
  readonly [field: string]: JsonValue;
}

/**
 * The key of a result: the SHA-256 of the canonical form of everything the
 * result was calculated from, as 64 lower case hexadecimal digits. Only
 * this module makes one, so a name of an individual, also a text, cannot
 * be passed where a key goes.
 */
export type Key = string & { readonly __brand: "Key" };

/**
 * The canonical text of each object of the project already written, so
 * that a command that changes a threshold does not write the individuals
 * table again. The store makes it and holds it. It is right because the
 * project is never changed in place: an object seen once always has the
 * same text. It keeps only objects frozen with all they hold, as the store
 * freezes every project, so that a value changed in place by a bug is
 * written again rather than given its old text.
 */
export interface KeyMemo {
  /** The text of each object written, let go of when nothing else holds
      the object. */
  readonly texts: WeakMap<object, string>;
}

/** A new, empty memo, which the store makes once and holds. */
export function createKeyMemo(): KeyMemo {
  return { texts: new WeakMap() };
}

/**
 * The canonical text of a JSON value, the same for two equal values
 * whatever order their fields were set in: the fields of every object
 * sorted by their names, compared by the numbers of their characters; a
 * list in its order; a text, a number, `true`, `false` and `null` as
 * `JSON.stringify` writes them, so −0 is `0` and half of a pair that
 * encodes one character is the escape `\ud800`. A field named `__proto__`
 * is written as any other.
 *
 * `memo`, when given, keeps the text of each object and list written that
 * is frozen with all it holds, and gives it back when the same object
 * comes again. An object not frozen is written each time, so a value
 * changed in place gives its new text.
 *
 * Throws a defect, with the path of the value, on anything that is not a
 * JSON value: `undefined`, `NaN`, an infinity, a function, a `Map`, a
 * `Set`, a typed array, a `Date`, an object of a class, a file, a bigint,
 * a symbol, a hole in a list, and a cycle; an object held in two places
 * that do not hold each other is written twice. An object is plain when
 * its prototype is `Object.prototype` or `null`.
 */
export function canonical(value: unknown, memo: KeyMemo | null): string {
  return writeValue(value, [], { memo, onPath: new Set() }).text;
}

type Path = readonly (string | number)[];

/** What the writing of one value carries: the memo, and the objects on
    the path to the value being written, to find a cycle. */
interface Writer {
  readonly memo: KeyMemo | null;
  readonly onPath: Set<object>;
}

/** The text of a value, and whether the value is frozen with all it
    holds, so that the memo may keep it. */
interface Written {
  readonly text: string;
  readonly frozen: boolean;
}

function writeValue(value: unknown, path: Path, writer: Writer): Written {
  switch (typeof value) {
    case "string":
      return { text: JSON.stringify(value), frozen: true };
    case "number":
      if (!Number.isFinite(value)) {
        throw notJson(String(value), path);
      }
      return { text: JSON.stringify(value), frozen: true };
    case "boolean":
      return { text: value ? "true" : "false", frozen: true };
    case "object":
      return value === null
        ? { text: "null", frozen: true }
        : writeObject(value, path, writer);
    case "undefined":
      throw notJson("undefined", path);
    case "function":
      throw notJson("a function", path);
    case "bigint":
      throw notJson("a bigint", path);
    case "symbol":
      throw notJson("a symbol", path);
  }
}

function writeObject(value: object, path: Path, writer: Writer): Written {
  const known = writer.memo?.texts.get(value);
  if (known !== undefined) {
    return { text: known, frozen: true };
  }
  if (writer.onPath.has(value)) {
    throw notJson("a cycle", path);
  }
  writer.onPath.add(value);
  const parts = isList(value)
    ? writeList(value, path, writer)
    : writeFields(value, path, writer);
  writer.onPath.delete(value);
  const frozen = Object.isFrozen(value) && parts.every((part) => part.frozen);
  const text = isList(value)
    ? `[${parts.map((part) => part.text).join(",")}]`
    : `{${parts.map((part) => part.text).join(",")}}`;
  if (frozen) {
    writer.memo?.texts.set(value, text);
  }
  return { text, frozen };
}

function isList(value: object): value is readonly unknown[] {
  return Array.isArray(value);
}

function writeList(
  list: readonly unknown[],
  path: Path,
  writer: Writer,
): Written[] {
  if (Object.getPrototypeOf(list) !== Array.prototype) {
    throw notJson("a list of a class", path);
  }
  const items: Written[] = [];
  for (let index = 0; index < list.length; index++) {
    if (!Object.hasOwn(list, index)) {
      throw notJson("a hole in a list", [...path, index]);
    }
    items.push(writeValue(list[index], [...path, index], writer));
  }
  return items;
}

/** The fields of an object, each written as its name, a colon and its
    value, sorted by name. */
function writeFields(value: object, path: Path, writer: Writer): Written[] {
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw notJson(
      `an object that is not plain, ${Object.prototype.toString.call(value)}`,
      path,
    );
  }
  const names = Object.keys(value).toSorted(compareCodeUnits);
  return names.map((name) => {
    const field: unknown = Reflect.get(value, name);
    const written = writeValue(field, [...path, name], writer);
    return {
      text: `${JSON.stringify(name)}:${written.text}`,
      frozen: written.frozen,
    };
  });
}

/** Orders two texts by the numbers of their characters, as `<` does, and
    not by the language of the browser. */
function compareCodeUnits(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

function notJson(what: string, path: Path): Error {
  return new Error(
    `popnei_web defect: the canonical form was given ${what} at ${JSON.stringify(path)}, which is not a JSON value.`,
  );
}

/**
 * The SHA-256 of a text encoded as UTF-8, as 64 lower case hexadecimal
 * digits, by FIPS 180-4. Ours rather than the browser's, which answers
 * only later, and synchronous as the rest of core.
 *
 * Throws a defect on a text with half of a pair that encodes one
 * character alone, which has no UTF-8 and which the canonical form never
 * gives.
 */
export function sha256Hex(text: string): string {
  const message = paddedUtf8(text);
  const words = new DataView(message.buffer);
  const schedule = new DataView(new ArrayBuffer(64 * 4));
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  for (let block = 0; block < message.length; block += 64) {
    for (let t = 0; t < 16; t++) {
      schedule.setUint32(t * 4, words.getUint32(block + t * 4));
    }
    for (let t = 16; t < 64; t++) {
      const w2 = schedule.getUint32((t - 2) * 4);
      const w15 = schedule.getUint32((t - 15) * 4);
      const sigma1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      const sigma0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      schedule.setUint32(
        t * 4,
        sigma1 +
          schedule.getUint32((t - 7) * 4) +
          sigma0 +
          schedule.getUint32((t - 16) * 4),
      );
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    for (const [t, k] of ROUND_CONSTANTS.entries()) {
      const sum1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + k + schedule.getUint32(t * 4)) | 0;
      const sum0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) | 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => (word >>> 0).toString(16).padStart(8, "0"))
    .join("");
}

/** The first 32 bits of the fractional parts of the cube roots of the
    first 64 primes, the constants of the rounds of SHA-256 (FIPS 180-4,
    4.2.2). */
const ROUND_CONSTANTS: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
  0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
  0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
  0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/** A word of 32 bits turned right by `bits`. */
function rotr(word: number, bits: number): number {
  return (word >>> bits) | (word << (32 - bits));
}

/**
 * The UTF-8 of a text, padded as SHA-256 asks: a byte 0x80, as many zeros
 * as make the length 8 bytes short of a multiple of 64, and the length of
 * the text in bits, in 8 bytes, the most significant first.
 */
function paddedUtf8(text: string): Uint8Array {
  const numBytes = utf8Length(text);
  const numBlocks = Math.ceil((numBytes + 9) / 64);
  const message = new Uint8Array(numBlocks * 64);
  let at = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x80) {
      message[at++] = code;
    } else if (code < 0x800) {
      message[at++] = 0xc0 | (code >>> 6);
      message[at++] = 0x80 | (code & 0x3f);
    } else if (code < 0x10000) {
      message[at++] = 0xe0 | (code >>> 12);
      message[at++] = 0x80 | ((code >>> 6) & 0x3f);
      message[at++] = 0x80 | (code & 0x3f);
    } else {
      message[at++] = 0xf0 | (code >>> 18);
      message[at++] = 0x80 | ((code >>> 12) & 0x3f);
      message[at++] = 0x80 | ((code >>> 6) & 0x3f);
      message[at++] = 0x80 | (code & 0x3f);
    }
  }
  message[at] = 0x80;
  const lengths = new DataView(message.buffer);
  lengths.setUint32(message.length - 8, Math.floor(numBytes / 0x20000000));
  lengths.setUint32(message.length - 4, (numBytes * 8) >>> 0);
  return message;
}

/**
 * The number of bytes of the UTF-8 of a text. Throws a defect on half of
 * a pair that encodes one character alone, which has no UTF-8.
 */
function utf8Length(text: string): number {
  let numBytes = 0;
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0xd800 && code <= 0xdfff) {
      throw new Error(
        `popnei_web defect: sha256Hex was given a text with half of a pair that encodes one character, \\u${code.toString(16)}, alone at position ${String(numBytes)} of its UTF-8; the canonical form never gives one.`,
      );
    }
    if (code < 0x80) {
      numBytes += 1;
    } else if (code < 0x800) {
      numBytes += 2;
    } else if (code < 0x10000) {
      numBytes += 3;
    } else {
      numBytes += 4;
    }
  }
  return numBytes;
}

/** What of the definition of an analysis the keys read. */
export type KeyedDef = Pick<
  AnalysisDef<unknown, unknown>,
  "id" | "keyVersion" | "filtersRead" | "keyInputs"
>;

/**
 * The key of an analysis for a project: the hash of the canonical form of
 * the id of the analysis, its key version, the version of popnei, the load
 * of the variants file, its load id and read options, the two lists of
 * filters, each empty when the analysis does not read it, and what its
 * `keyInputs` gives.
 *
 * Throws a defect when the project has no variants file, since the store
 * makes a key only for an analysis that can run.
 */
export function keyOf(
  def: KeyedDef,
  p: Project,
  popneiVersion: string,
  memo: KeyMemo,
): Key {
  const text = canonical(
    {
      analysis: def.id,
      keyVersion: def.keyVersion,
      popneiVersion,
      load: loadOf(p, "keyOf"),
      ...filtersReadBy(def, p),
      inputs: def.keyInputs(p),
    },
    memo,
  );
  return asKey(sha256Hex(text));
}

/**
 * The key of an intermediate result of the calculation worker, "the
 * pruned variants": the hash of the canonical form of its name, what it
 * was made from beyond the file and the filters, the load of the variants
 * file, the filters `def` reads and the version of popnei. It holds no id
 * of an analysis, so two analyses that read the same filters share it.
 *
 * Throws a defect when the project has no variants file.
 */
export function intermediateKeyOf(
  def: KeyedDef,
  p: Project,
  popneiVersion: string,
  name: string,
  inputs: JsonValue,
  memo: KeyMemo,
): string {
  const text = canonical(
    {
      intermediate: name,
      inputs,
      load: loadOf(p, "intermediateKeyOf"),
      ...filtersReadBy(def, p),
      popneiVersion,
    },
    memo,
  );
  return sha256Hex(text);
}

/**
 * The fingerprint of the settings of an analysis, which an opened project
 * file keeps for each analysis: the hash of the canonical form of the key
 * without the version of popnei, the key version and the load id, and
 * with `readOptions` in place of the load. It names only what the user
 * chose, and never coincides with a key, whose object has other fields.
 *
 * Reads nothing of `p.variants`, so it is made also when no variants file
 * is loaded, as when a project file is opened.
 */
export function settingsFingerprint(
  def: KeyedDef,
  p: Project,
  readOptions: VariantSource["readOptions"],
  memo: KeyMemo | null,
): string {
  const text = canonical(
    {
      analysis: def.id,
      ...filtersReadBy(def, p),
      inputs: def.keyInputs(p),
      readOptions,
    },
    memo,
  );
  return sha256Hex(text);
}

/**
 * The key that came back from a worker with its result, a text on the
 * wire. Throws a defect on a text that is not 64 lower case hexadecimal
 * digits, since both sides are our code; its message quotes at most the
 * first 80 characters of the text, which could be of any length.
 */
export function keyFromWire(text: string): Key {
  if (!/^[0-9a-f]{64}$/.test(text)) {
    const quoted =
      text.length > MAX_QUOTED
        ? `${JSON.stringify(text.slice(0, MAX_QUOTED))}… (${String(text.length)} characters)`
        : JSON.stringify(text);
    throw new Error(
      `popnei_web defect: a worker sent back the key ${quoted}, which is not 64 lower case hexadecimal digits.`,
    );
  }
  return asKey(text);
}

/** The most characters of a wrong key that a defect quotes. */
const MAX_QUOTED = 80;

/** A hash made here, or checked by `keyFromWire`, as a key. */
function asKey(hash: string): Key {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the one place a Key is made, from a hash of 64 digits (typescript.md, "Branded types").
  return hash as Key;
}

/** The load of the variants file as a key holds it, its load id and its
    read options, and nothing else of the file. */
function loadOf(
  p: Project,
  caller: string,
): { fileId: string; readOptions: VariantSource["readOptions"] } {
  if (p.variants === null) {
    throw new Error(
      `popnei_web defect: ${caller} was given a project with no variants file; the store makes a key only for an analysis that can run.`,
    );
  }
  return { fileId: p.variants.fileId, readOptions: p.variants.readOptions };
}

/** The two lists of filters of the project, each empty when `def` does
    not read it. */
function filtersReadBy(
  def: KeyedDef,
  p: Project,
): Pick<Project, "filters" | "individualFilters"> {
  return {
    filters: def.filtersRead.variants ? p.filters : [],
    individualFilters: def.filtersRead.individuals ? p.individualFilters : [],
  };
}
