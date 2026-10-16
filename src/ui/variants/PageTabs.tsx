/**
 * The row of five tabs of popgen2.html, "Variants", "Individuals",
 * "PCA", "Populations" and "Distances", and what each shows
 * (docs/specs/steps/popgen2-pca.md, "The row of tabs"). Every tab stays
 * drawn, those not shown inert and hidden, so that a turn to another and
 * back finds the plots and the thresholds as they were
 * (docs/specs/steps/popgen2-input.md, "Both tabs kept drawn"). A tab of
 * the analyses that cannot run, from `analysisTabs` of core, is greyed
 * with its reason; while it is shown greyed, the reason stands in place
 * of its content, which stays drawn and hidden, so that what the user
 * left in it, a number half typed, the sort of a table, is there when
 * the tab opens again.
 *
 * The PCA tab holds the PCA's panel, `PcaTab`, in a boundary of errors
 * of its own, which keeps the tab's heading, "PCA" or "PCoA" by the
 * method chosen, after a defect; the Populations tab holds the panel of
 * the diversity, `PopulationsTab`, in one of its own, which keeps the
 * heading "Diversity"; the Distances tab the panel of the distances
 * between populations, `DistancesTab`, in one of its own, which keeps
 * the heading "Distances between populations".
 *
 * The tabs of the two files end, once a file is open, with the zone that
 * opens another: the Variants tab with "Open another variants file…"
 * under "Download filtered variants…", the Individuals tab with "Open
 * another individuals file…" and Remove side by side, which wrap on a
 * narrow window (docs/plans/file-buttons.md, 16 October 2026). Each is
 * outside the boundary made again for each file, so that the button
 * pressed is the same element after the opening and keeps the focus; and
 * the row of the individuals file, which goes with the file at Remove,
 * gives the focus to "Open individuals file…" of the box, which comes
 * back.
 *
 * Its own component, so that the page draws it inside a boundary of
 * errors: a defect thrown by `analysisTabs` costs the row alone, and the
 * two boxes of the files stay.
 */
import { analysisTabs } from "../../core/popgen2Tabs.ts";
import type {
  AnalysisTabId,
  PageTab,
  TabGreyed,
} from "../../core/popgen2Tabs.ts";
import { pcaMethodOf } from "../../core/analyses/pca.ts";
import { PopulationsTab } from "../analyses/diversity/PopulationsTab.tsx";
import { DIVERSITY_TAB_TITLE } from "../analyses/diversity/tabLoadWords.ts";
import { DistancesTab } from "../analyses/popDists/DistancesTab.tsx";
import { DISTANCES_TAB_TITLE } from "../analyses/popDists/tabLoadWords.ts";
import { PcaTab } from "../analyses/pca/PcaTab.tsx";
import { pcaTabTitle } from "../analyses/pca/tabWords.ts";
import { classOf } from "../classOf.ts";
import { tabContentId } from "../pageTab.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { useAppState } from "../store.tsx";
import { Tabs } from "../widgets/Tabs.tsx";
import type { TabItem } from "../widgets/Tabs.tsx";
import {
  greyedText,
  ANALYSES_TABS_LABEL,
  PAGE_TAB_LABELS,
} from "./analysisTabsWords.ts";
import { useFocusOnGone } from "./focusOnGone.ts";
import { IndividualsTab } from "./IndividualsTab.tsx";
import { INDIVIDUALS_TAB_CONTENT_NAME } from "./individualsWords.ts";
import type { StatsShown } from "./announceChanges.ts";
import { OpenIndividuals } from "./OpenIndividuals.tsx";
import type { IndividualsOpening } from "./OpenIndividuals.tsx";
import { OpenVariants } from "./OpenVariants.tsx";
import type { Refusal } from "./OpenVariants.tsx";
import { RemoveIndividuals } from "./RemoveIndividuals.tsx";
import { StatsSection } from "./StatsSection.tsx";
import styles from "./VariantsPage.module.css";
import { OPENING_INDIVIDUALS_ZONE_NAME } from "./individualsWords.ts";
import {
  NO_VARIANTS_FILE_TAB,
  OPENING_ZONE_NAME,
  notReadTabText,
} from "./words.ts";

/** What the row of tabs is drawn with. */
export interface PageTabsProps {
  /** The tab shown, the screen's. */
  readonly tab: PageTab;
  /** Called with the tab the user chose. */
  readonly onTabChange: (tab: PageTab) => void;
  /** The button that opens a variants file: in its box before a file is
      open, at the end of the Variants tab after, which the statistics
      give the focus to when they go. */
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
  /** Called with the words of a variants file not opened, and with
      `null` when an opening makes them out of date. */
  readonly onVariantsRefusal: (refusal: Refusal | null) => void;
  /** The button that opens an individuals file: in its box before a file
      is open, which takes the focus when Remove goes, and at the end of
      the Individuals tab after. */
  readonly individualsOpenButton: React.RefObject<HTMLButtonElement | null>;
  /** The page's one opening of the individuals file. */
  readonly individualsOpening: IndividualsOpening;
  /** Told when the section of the statistics of a load is drawn, and when
      it goes. */
  readonly onStatsShown: StatsShown;
}

/** The row of five tabs and what each shows. */
export function PageTabs({
  tab,
  onTabChange,
  openButton,
  onVariantsRefusal,
  individualsOpenButton,
  individualsOpening,
  onStatsShown,
}: PageTabsProps): React.JSX.Element {
  const fileId = useAppState((s) => s.project.variants?.fileId ?? null);
  // The name of a variants file popnei could not read, whose tab has no
  // statistics to show.
  const notRead = useAppState((s) =>
    s.project.variants?.read.kind === "failed" ? s.project.variants.name : null,
  );
  const individualsId = useAppState(
    (s) => s.project.individuals?.fileId ?? null,
  );
  const individualsName = useAppState(
    (s) => s.project.individuals?.name ?? null,
  );
  // Remove pressed: the row goes with the file, and the focus goes to the
  // box's button, which comes back in the same change.
  const individualsEnd = useFocusOnGone(() => individualsOpenButton.current);
  // The same object while the reasons are the same, so that a threshold
  // moved does not draw the row again.
  const tabReasons = useAppState((s) =>
    analysisTabs(s.project, s.individualsKept),
  );
  // The heading the PCA tab keeps after a defect: its own, "PCA" or
  // "PCoA" by the method chosen, read alone, so that options of the PCA
  // that would be refused cost the PCA tab, and not the row.
  const pcaMethod = useAppState((s) => pcaMethodOf(s.project, "popgen2"));
  return (
    <Tabs<PageTab>
      label={ANALYSES_TABS_LABEL}
      selected={tab}
      onChange={onTabChange}
      keepHidden
      pageRow
      tabs={[
        {
          id: "variants",
          label: PAGE_TAB_LABELS.variants,
          content:
            fileId === null ? (
              <p className={classOf(styles, "boxLine")}>
                {NO_VARIANTS_FILE_TAB}
              </p>
            ) : (
              <div className={classOf(styles, "tabWithEnd")}>
                {notRead !== null && (
                  <p className={classOf(styles, "boxLine")}>
                    {notReadTabText(notRead)}
                  </p>
                )}
                <StatsSection openButton={openButton} onShown={onStatsShown} />
                {/* Drawn again at a turn of the tabs after a throw, as the
                    zone of the box. */}
                <ErrorBoundary
                  heading={OPENING_ZONE_NAME}
                  level={2}
                  resetOn={tab}
                >
                  <OpenVariants
                    buttonRef={openButton}
                    onRefusal={onVariantsRefusal}
                  />
                </ErrorBoundary>
              </div>
            ),
        },
        {
          id: "individuals",
          label: PAGE_TAB_LABELS.individuals,
          content: (
            <div className={classOf(styles, "tabWithEnd")}>
              {/* Another load is another boundary, which has caught
                  nothing, as the statistics of the variants file have. */}
              <ErrorBoundary
                key={individualsId ?? "none"}
                heading={INDIVIDUALS_TAB_CONTENT_NAME}
                level={2}
              >
                <IndividualsTab shown={tab === "individuals"} />
              </ErrorBoundary>
              {individualsName !== null && (
                <div ref={individualsEnd}>
                  <ErrorBoundary
                    heading={OPENING_INDIVIDUALS_ZONE_NAME}
                    level={2}
                    resetOn={tab}
                  >
                    <OpenIndividuals
                      opening={individualsOpening}
                      buttonRef={individualsOpenButton}
                      actions={<RemoveIndividuals name={individualsName} />}
                    />
                  </ErrorBoundary>
                </div>
              )}
            </div>
          ),
        },
        analysisTab(
          "pca",
          tabReasons.pca,
          // A defect in the tab costs the tab alone, the rest of the page
          // stays, until another variants file draws it again; a tab that
          // caught nothing keeps what it holds, a number half typed.
          <ErrorBoundary
            heading={pcaTabTitle(pcaMethod)}
            level={2}
            resetOn={fileId ?? "none"}
          >
            <PcaTab shown={tab === "pca" && tabReasons.pca === null} />
          </ErrorBoundary>,
        ),
        analysisTab(
          "populations",
          tabReasons.populations,
          <ErrorBoundary
            heading={DIVERSITY_TAB_TITLE}
            level={2}
            resetOn={fileId ?? "none"}
          >
            <PopulationsTab
              shown={tab === "populations" && tabReasons.populations === null}
            />
          </ErrorBoundary>,
        ),
        analysisTab(
          "distances",
          tabReasons.distances,
          <ErrorBoundary
            heading={DISTANCES_TAB_TITLE}
            level={2}
            resetOn={fileId ?? "none"}
          >
            <DistancesTab
              shown={tab === "distances" && tabReasons.distances === null}
            />
          </ErrorBoundary>,
        ),
      ]}
    />
  );
}

/** A tab of the analyses: greyed with the words of `reason`, which then
    stand before `content`, hidden and still drawn; or showing
    `content`. */
function analysisTab(
  id: AnalysisTabId,
  reason: TabGreyed | null,
  content: React.ReactNode,
): TabItem<AnalysisTabId> {
  const words = reason === null ? null : greyedText(id, reason);
  return {
    id,
    label: PAGE_TAB_LABELS[id],
    content: (
      <>
        {words !== null && (
          <p className={classOf(styles, "boxLine")}>{words}</p>
        )}
        {/* The same element, greyed or not, so that what it holds is
            kept; hidden, it is out of the Tab key and of a screen
            reader. */}
        <div
          hidden={words !== null}
          className={classOf(styles, "tabContent")}
          id={tabContentId(id)}
        >
          {content}
        </div>
      </>
    ),
    greyedReason: words,
  };
}
