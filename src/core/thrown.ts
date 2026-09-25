/**
 * The text of what was thrown, for a message of an error: a `catch` and a
 * rejection give an `unknown`, which our code narrows before it reads a
 * message (.claude/skills/coding/typescript.md, "Errors").
 */

/** The message of an `Error`, of any of its subclasses, and the text of
    anything else thrown, which our code never throws but a library
    could. */
export function messageOf(thrown: unknown): string {
  return thrown instanceof Error ? thrown.message : String(thrown);
}
