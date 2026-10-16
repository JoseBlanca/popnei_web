/**
 * The sections "Parameters" of popgen2.html, which hold the options of
 * each analysis in the PCA, Populations and Distances tabs, closed when
 * the page opens (docs/specs/steps/popgen2-pca.md, "The PCA tab", the
 * section "Parameters"; the owner, 16 October 2026). A flow that changes
 * an option opens the section first, as a user does.
 */
import type { Locator } from "@playwright/test";

import { expect } from "./axe.ts";

/** The words of the button of a section, which are also its name. */
export const PARAMETERS = "Parameters";

/** The button of the section, or of each section, in `scope`. */
export function parametersButton(scope: Locator): Locator {
  return scope.getByRole("button", { name: PARAMETERS, exact: true });
}

/** Opens, with a click, every section "Parameters" of `scope` that is
    closed: the one of a panel, or both of the Populations tab given the
    tab. */
export async function openParameters(scope: Locator): Promise<void> {
  const buttons = parametersButton(scope);
  await expect(buttons.first()).toBeVisible();
  for (const button of await buttons.all()) {
    if ((await button.getAttribute("aria-expanded")) !== "true") {
      await button.click();
    }
    await expect(button).toHaveAttribute("aria-expanded", "true");
  }
}
