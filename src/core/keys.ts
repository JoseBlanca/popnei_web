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
 * `memo`, when given, keeps the text of each object and list written, and
 * gives it back when the same object comes again.
 *
 * Throws a defect, with the path of the value, on anything that is not a
 * JSON value: `undefined`, `NaN`, an infinity, a function, a `Map`, a
 * `Set`, a typed array, a `Date`, an object of a class, a file, a bigint,
 * a symbol, and a hole in a list. An object is plain when its prototype is
 * `Object.prototype` or `null`.
 */
export function canonical(value: unknown, memo: KeyMemo | null): string {
  return writeValue(value, [], memo);
}

type Path = readonly (string | number)[];

function writeValue(value: unknown, path: Path, memo: KeyMemo | null): string {
  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "number":
      if (!Number.isFinite(value)) {
        throw notJson(String(value), path);
      }
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "object":
      return value === null ? "null" : writeObject(value, path, memo);
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

function writeObject(value: object, path: Path, memo: KeyMemo | null): string {
  const known = memo?.texts.get(value);
  if (known !== undefined) {
    return known;
  }
  const text = isList(value)
    ? writeList(value, path, memo)
    : writeFields(value, path, memo);
  memo?.texts.set(value, text);
  return text;
}

function isList(value: object): value is readonly unknown[] {
  return Array.isArray(value);
}

function writeList(
  list: readonly unknown[],
  path: Path,
  memo: KeyMemo | null,
): string {
  if (Object.getPrototypeOf(list) !== Array.prototype) {
    throw notJson("a list of a class", path);
  }
  const items: string[] = [];
  for (let index = 0; index < list.length; index++) {
    if (!Object.hasOwn(list, index)) {
      throw notJson("a hole in a list", [...path, index]);
    }
    items.push(writeValue(list[index], [...path, index], memo));
  }
  return `[${items.join(",")}]`;
}

function writeFields(value: object, path: Path, memo: KeyMemo | null): string {
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw notJson(
      `an object that is not plain, ${Object.prototype.toString.call(value)}`,
      path,
    );
  }
  const names = Object.keys(value).toSorted(compareCodeUnits);
  const fields = names.map((name) => {
    const field: unknown = Reflect.get(value, name);
    return `${JSON.stringify(name)}:${writeValue(field, [...path, name], memo)}`;
  });
  return `{${fields.join(",")}}`;
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
