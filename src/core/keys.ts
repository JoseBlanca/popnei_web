/**
 * The keys of the results: the canonical form of a JSON value, its hash,
 * and the key of an analysis for a project (docs/specs/core/keys.md).
 */

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
 * same text.
 */
export interface KeyMemo {
  /** The text of each object written, let go of when nothing else holds
      the object. */
  readonly texts: WeakMap<object, string>;
}
