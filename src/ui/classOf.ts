/**
 * The classes of a CSS Module, read by name (.claude/skills/coding/css.md,
 * "CSS Modules"). Vite types a module as an object of any name, so the
 * compiler cannot tell a class of the file from a misspelt one; this
 * function tells them apart when the component is first drawn.
 */

/** The class `name` of the CSS Module `styles`, as Vite renamed it.
    Throws a defect when the module has no class of that name. */
export function classOf(
  styles: Readonly<Record<string, string>>,
  name: string,
): string {
  const found = styles[name];
  if (found === undefined) {
    throw new Error(`popnei_web defect: the CSS Module has no class .${name}.`);
  }
  return found;
}
