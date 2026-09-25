/**
 * The links of the stepper stay where they are when the step changes,
 * though the one of the step on screen is in bold (docs/specs/shell.md,
 * "The stepper"): a link that moved under the mouse would be missed.
 */
import { expect, test } from "./axe.ts";

test("WS7 D2 the links of the stepper do not move when the step changes", async ({
  page,
}) => {
  await page.goto("popgen.html#variants");
  const steps = page.getByRole("navigation", { name: "Steps" });
  const lefts: number[][] = [];
  for (const step of ["Variants", "Individuals", "Analyses"]) {
    await steps.getByRole("link", { name: step }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: step }),
    ).toBeVisible();
    const row: number[] = [];
    for (const name of ["Individuals", "Analyses"]) {
      const box = await steps.getByRole("link", { name }).boundingBox();
      if (box === null) throw new Error(`the link ${name} is not drawn`);
      row.push(box.x);
    }
    lefts.push(row);
  }
  expect(lefts[1]).toEqual(lefts[0]);
  expect(lefts[2]).toEqual(lefts[0]);
  // The name of each link is its words once.
  await expect(steps.getByRole("link")).toHaveText([
    "Variants",
    "Individuals",
    "Analyses",
  ]);
});
