/**
 * The section of the filters of the individuals in the Variants step
 * (docs/specs/steps/variants.md, "The filters of the individuals"): the
 * list to keep and the list to remove, each a text area of one name per
 * line with Apply and Clear.
 *
 * The text of each list is the step's until Apply sends it: it starts at
 * the list of the project each time the step is drawn and after each
 * undo, redo or opening, and while its names are not the list applied a
 * line under it says so. The reason `individualListNeeds` gives for a
 * list popnei would refuse, a name not in the variants file among them,
 * stands whole under the list it names; the stepper and the writing show
 * it too. The lists are drawn in every state, since they belong to the
 * project, and a list is checked only once the variants file is read.
 */
import { useId, useMemo, useState } from "react";

import { individualListNeeds } from "../../../core/project.ts";
import { classOf } from "../../classOf.ts";
import { useHistoryMoves } from "../../historyMoves.ts";
import { useAppState, useStore } from "../../store.tsx";
import { Button } from "../../widgets/Button.tsx";
import { Problem } from "../../widgets/Problem.tsx";
import { TextArea } from "../../widgets/TextArea.tsx";
import type { StepCommand } from "./commands.ts";
import {
  INDIVIDUAL_FILTERS_HEADING,
  LIST_KINDS,
  LIST_WORDS,
  applyCommand,
  clearCommand,
  isApplied,
  listOf,
  notAppliedText,
  shownText,
} from "./individualLists.ts";
import type { ListKind, TypedList } from "./individualLists.ts";
import styles from "./VariantsStep.module.css";

/** The texts typed in the two lists, `null` where nothing was typed. */
type TypedLists = Readonly<Record<ListKind, TypedList | null>>;

const NOTHING_TYPED: TypedLists = { keep: null, remove: null };

/** The Clears of each list so far. */
type Clears = Readonly<Record<ListKind, number>>;

const NO_CLEAR: Clears = { keep: 0, remove: 0 };

/** The section of the filters of the individuals. */
export function IndividualFilters(): React.JSX.Element {
  const store = useStore();
  const project = useAppState((s) => s.project);
  const moves = useHistoryMoves();
  const [typed, setTyped] = useState<TypedLists>(NOTHING_TYPED);
  const [clears, setClears] = useState<Clears>(NO_CLEAR);
  const headingId = useId();
  const needs = useMemo(() => individualListNeeds(project), [project]);

  const send = (step: StepCommand): void => {
    store.apply(step.description, step.command);
  };
  const type = (kind: ListKind, text: string): void => {
    setTyped((before) => ({ ...before, [kind]: { text, moves } }));
  };

  return (
    <section aria-labelledby={headingId} className={classOf(styles, "section")}>
      <h2 id={headingId} className={classOf(styles, "heading")}>
        {INDIVIDUAL_FILTERS_HEADING}
      </h2>
      <div className={classOf(styles, "lists")}>
        {LIST_KINDS.map((kind) => {
          const list = listOf(project, kind);
          const text = shownText(typed[kind], moves, list);
          return (
            <IndividualList
              key={kind}
              kind={kind}
              edition={`${String(moves)} ${String(clears[kind])}`}
              text={text}
              applied={isApplied(text, list)}
              reason={needs?.list === kind ? needs.reason : null}
              onType={(next) => {
                type(kind, next);
              }}
              onApply={() => {
                send(applyCommand(kind, text));
              }}
              onClear={() => {
                type(kind, "");
                setClears((before) => ({
                  ...before,
                  [kind]: before[kind] + 1,
                }));
                send(clearCommand(kind));
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

/** What one list is drawn with. */
interface IndividualListProps {
  /** Which list it is. */
  readonly kind: ListKind;
  /** Changes whenever the step sets the text itself, after an undo, a
      redo, an opening or a Clear, and the text area is then drawn anew:
      the browser's own undo of the field would otherwise work on the text
      before, and its redo put back what the user did not type. After
      "s000" applied and undone with the button of the header, Cmd+Z and
      then Cmd+Shift+Z in the emptied field gave "s000s000" in the
      Chromium and the WebKit of Playwright 1.63, on 27 September 2026. */
  readonly edition: string;
  /** The text it shows. */
  readonly text: string;
  /** Whether the names of the text are the list applied. */
  readonly applied: boolean;
  /** The reason popnei would refuse the list applied, or `null`. */
  readonly reason: string | null;
  /** Called with the text at each change of it. */
  readonly onType: (text: string) => void;
  /** Called by Apply. */
  readonly onApply: () => void;
  /** Called by Clear. */
  readonly onClear: () => void;
}

/** One list: its text area, the line under it, the line of a list not
    applied, the reason of a list popnei would refuse, and its two
    buttons. */
function IndividualList({
  kind,
  edition,
  text,
  applied,
  reason,
  onType,
  onApply,
  onClear,
}: IndividualListProps): React.JSX.Element {
  const words = LIST_WORDS[kind];
  const notAppliedId = useId();
  return (
    <div className={classOf(styles, "list")}>
      <TextArea
        key={edition}
        label={words.label}
        value={text}
        onChange={onType}
        describedBy={applied ? null : notAppliedId}
      />
      <p className={classOf(styles, "filterLine")}>{words.line}</p>
      {!applied && (
        <p id={notAppliedId} className={classOf(styles, "line")}>
          {notAppliedText(kind)}
        </p>
      )}
      {reason !== null && <Problem>{reason}</Problem>}
      <div className={classOf(styles, "buttons")}>
        <Button label={words.apply} onPress={onApply} />
        <Button label={words.clear} onPress={onClear} />
      </div>
    </div>
  );
}
