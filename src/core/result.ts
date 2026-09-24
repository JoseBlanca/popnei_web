/**
 * What a function that can fail with good code returns: the value, or the
 * error that says why there is none. `E` is a union of the ways that
 * function fails, each with the facts that explain it. The caller has to
 * look at `ok` before it reaches `value`.
 */
export type Result<T, E> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };
