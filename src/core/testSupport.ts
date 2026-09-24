/**
 * What the tests of core share: the generators of fast-check, which draw
 * random values for the property tests. Imported by tests alone.
 */

import * as fc from "fast-check";
import type { JsonObject, JsonValue } from "./keys.ts";

/** Half of a pair that encodes one character, alone. */
const loneSurrogate = fc
  .integer({ min: 0xd800, max: 0xdfff })
  .map((code) => String.fromCharCode(code));

/** How the generator of JSON values draws the names of the fields. */
export interface JsonValueOptions {
  /** Whether a field may be named `__proto__`, which JavaScript treats in
      a special way. */
  readonly withProto: boolean;
}

/**
 * Any JSON value: `null`, booleans, whole numbers and fractions, −0 among
 * them, texts of the whole of Unicode, broken characters, half of a pair
 * that encodes one character, among them, and lists and objects of them,
 * nested up to a few levels.
 */
export function jsonValue(options: JsonValueOptions): fc.Arbitrary<JsonValue> {
  const text = fc.oneof(
    fc.string({ unit: "binary" }),
    fc.string({ unit: loneSurrogate }),
  );
  const name = options.withProto
    ? fc.oneof(text, fc.constant("__proto__"))
    : text.filter((n) => n !== "__proto__");
  const number = fc.oneof(
    fc.integer(),
    fc.double({ noNaN: true, noDefaultInfinity: true }),
    fc.constant(-0),
  );
  const { value } = fc.letrec<{ value: JsonValue }>((tie) => ({
    value: fc.oneof(
      { depthSize: "small", withCrossShrink: true },
      fc.constant(null),
      fc.boolean(),
      number,
      text,
      fc.array(tie("value"), { maxLength: 4 }),
      fc
        .uniqueArray(fc.tuple(name, tie("value")), {
          selector: ([field]) => field,
          maxLength: 4,
        })
        // Object.fromEntries defines each field as its own, so a field
        // named __proto__ is kept as a field.
        .map((entries): JsonObject => Object.fromEntries(entries)),
    ),
  }));
  return value;
}
