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
 * heading "Diversity".
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
import { PcaTab } from "../analyses/pca/PcaTab.tsx";
import { pcaTabTitle } from "../analyses/pca/tabWords.ts";
import { classOf } from "../classOf.ts";
import { PCA_TAB_CONTENT_ID } from "../pageTab.ts";
import { ErrorBoundary } from "../shell/ErrorBoundary.tsx";
import { useAppState } from "../store.tsx";
import { Tabs } from "../widgets/Tabs.tsx";
import type { TabItem } from "../widgets/Tabs.tsx";
import {
  greyedText,
  ANALYSES_TABS_LABEL,
  DISTANCES_NOT_BUILT,
  PAGE_TAB_LABELS,
} from "./analysisTabsWords.ts";
import { IndividualsTab } from "./IndividualsTab.tsx";
import { INDIVIDUALS_TAB_CONTENT_NAME } from "./individualsWords.ts";
import type { StatsShown } from "./announceChanges.ts";
import { StatsSection } from "./StatsSection.tsx";
import styles from "./VariantsPage.module.css";
import { NO_VARIANTS_FILE_TAB, notReadTabText } from "./words.ts";

/** What the row of tabs is drawn with. */
export interface PageTabsProps {
  /** The tab shown, the screen's. */
  readonly tab: PageTab;
  /** Called with the tab the user chose. */
  readonly onTabChange: (tab: PageTab) => void;
  /** The button that opens a variants file, in its box. */
  readonly openButton: React.RefObject<HTMLButtonElement | null>;
  /** Told when the section of the statistics of a load is drawn, and when
      it goes. */
  readonly onStatsShown: StatsShown;
}

/** The row of five tabs and what each shows. */
export function PageTabs({
  tab,
  onTabChange,
  openButton,
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
          content: (
            <>
              {fileId === null && (
                <p className={classOf(styles, "boxLine")}>
                  {NO_VARIANTS_FILE_TAB}
                </p>
              )}
              {notRead !== null && (
                <p className={classOf(styles, "boxLine")}>
                  {notReadTabText(notRead)}
                </p>
              )}
              <StatsSection openButton={openButton} onShown={onStatsShown} />
            </>
          ),
        },
        {
          id: "individuals",
          label: PAGE_TAB_LABELS.individuals,
          content: (
            // Another load is another boundary, which has caught
            // nothing, as the statistics of the variants file have.
            <ErrorBoundary
              key={individualsId ?? "none"}
              heading={INDIVIDUALS_TAB_CONTENT_NAME}
              level={2}
            >
              <IndividualsTab shown={tab === "individuals"} />
            </ErrorBoundary>
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
          <p className={classOf(styles, "boxLine")}>{DISTANCES_NOT_BUILT}</p>,
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
          {...(id === "pca" && { id: PCA_TAB_CONTENT_ID })}
        >
          {content}
        </div>
      </>
    ),
    greyedReason: words,
  };
}
