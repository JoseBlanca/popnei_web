/**
 * The FILTER box of popgen2.html, at the end of the part of the variants
 * (docs/specs/steps/popgen2-filters.md, "The FILTER box"): a check box
 * that turns the filter of the FILTER column on and off, ticked in the
 * first project of the page, with the sentence under it that says why a
 * click changes no plot. Shown once the opening of the file has answered
 * that its variants record their FILTER, in every state of the
 * statistics, since it is a filter of the project and no part of the
 * plots. Each click is one change of the project, with its step of
 * Undo and no notice, as the owner asked on 8 October 2026: the check
 * box's own change of state is what a screen reader hears. The page sends
 * nothing to the worker for it, since the key of the one pass holds no
 * filter.
 *
 * Drawn by FileStats.tsx from the read of the file, whether the code of
 * the plots is there or not, so that it is one element across the
 * arrival of that code and keeps a keyboard user's focus.
 */
import { useAppState, useStore } from "../store.tsx";
import { Checkbox } from "../widgets/Checkbox.tsx";
import {
  passedFilterChange,
  passedFilterOn,
  passedFilterShown,
} from "./passedFilter.ts";
import {
  PASSED_FILTER_DESCRIPTION,
  PASSED_FILTER_LABEL,
} from "./statsWords.ts";

/** The FILTER box and its sentence; nothing for a file whose read does
    not say that its variants record their FILTER. */
export function PassedFilterBox(): React.JSX.Element | null {
  const store = useStore();
  const shown = useAppState((s) => passedFilterShown(s.project));
  const on = useAppState((s) => passedFilterOn(s.project));
  if (!shown) return null;
  return (
    <Checkbox
      label={PASSED_FILTER_LABEL}
      description={PASSED_FILTER_DESCRIPTION}
      isSelected={on}
      onChange={(isSelected) => {
        const change = passedFilterChange(isSelected);
        store.apply(change.description, change.command);
      }}
    />
  );
}
