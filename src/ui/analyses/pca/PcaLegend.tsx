/**
 * The legend of the principal components, over the top right corner of
 * the plot, one legend for the 2D and the 3D plot, drawn by the panel
 * (docs/specs/analyses/pca.md, "What it shows"; docs/specs/charts/
 * scatter.md, "The legend, drawn by the screen"): for a colouring by
 * groups, React Aria's `ToggleButtonGroup` of one selection, vertical, an
 * entry per group with points, its mark and its name and count, "p0 (48)",
 * and "No population (5)" last, whose press highlights its group, a second
 * press clearing it; for a colouring by values, a bar of viridis with the
 * smallest and the largest value, and the points with no value. The
 * marks are the plots' own, `symbolPath` with the classes of their
 * colours, so that the legend and the points cannot differ.
 */
import { groupColourClass, symbolPath } from "../../../charts/marks.ts";
import { viridisColour } from "../../../charts/marks.ts";
import type { Legend } from "../../../charts/legend.ts";
import { NO_COLOUR_GROUP } from "../../../core/analyses/pca.ts";
import { grouped, shown } from "../../../core/project.ts";
import { classOf } from "../../classOf.ts";
import { ToggleButtonGroup } from "../../widgets/ToggleButtonGroup.tsx";
import styles from "./PcaResults.module.css";
import { valueText } from "./words.ts";

/** The side of the drawing of a mark in the legend, in CSS pixels: that
    of the square a point of the 3D view is drawn on, which holds the
    star, the largest mark. */
const MARK_SIDE = 18;

/** The bands of the bar of viridis, as the exported legend draws it. */
const BANDS = 32;

/** What the legend is drawn with. */
export interface PcaLegendProps {
  /** The legend of the points drawn, `legendOf` of the plots' data. */
  readonly legend: Legend;
  /** The group highlighted, or `null`. */
  readonly highlighted: number | null;
  /** Called with the group pressed, or `null` when a press cleared it. */
  readonly onHighlight: (group: number | null) => void;
  /** Where the legend stands over the plot: its distance from the top
      and from the right of the plot's element, in CSS pixels. */
  readonly top: number;
  readonly right: number;
}

/** The mark of `group`, drawn as the plots draw it. */
function Mark({ group }: { readonly group: number }): React.JSX.Element {
  const half = MARK_SIDE / 2;
  return (
    <svg
      width={MARK_SIDE}
      height={MARK_SIDE}
      viewBox={`${String(-half)} ${String(-half)} ${String(MARK_SIDE)} ${String(MARK_SIDE)}`}
    >
      <path
        d={symbolPath(group)}
        className={`chart-points ${groupColourClass(group)}`}
      />
    </svg>
  );
}

/** The legend over the plot. */
export function PcaLegend({
  legend,
  highlighted,
  onHighlight,
  top,
  right,
}: PcaLegendProps): React.JSX.Element {
  const place = { insetBlockStart: top, insetInlineEnd: right };
  if (legend.kind === "groups") {
    const title = shown(legend.title);
    return (
      <div className={classOf(styles, "legend")} style={place}>
        {/* The group is named by the title, which the eye reads here. */}
        <p aria-hidden="true" className={classOf(styles, "legendTitle")}>
          {title}
        </p>
        <ToggleButtonGroup
          label={title}
          look="legend"
          orientation="vertical"
          keepsOne={false}
          value={highlighted === null ? null : String(highlighted)}
          items={legend.entries.map((entry) => ({
            id: String(entry.group),
            label: `${shown(entry.name)} (${grouped(entry.count)})`,
            mark: <Mark group={entry.group} />,
            faded: entry.faded,
          }))}
          onChange={(id) => {
            onHighlight(id === null ? null : Number(id));
          }}
        />
      </div>
    );
  }
  const steps = Array.from({ length: BANDS }, (_, band) =>
    viridisColour(Math.round(((BANDS - 1 - band) / (BANDS - 1)) * 255)),
  );
  return (
    <div className={classOf(styles, "legend")} style={place}>
      <p className={classOf(styles, "legendTitle")}>{shown(legend.title)}</p>
      {legend.min !== null && legend.max !== null && (
        <div className={classOf(styles, "scale")}>
          <svg
            className={classOf(styles, "scaleBar")}
            viewBox={`0 0 1 ${String(BANDS)}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {steps.map((colour, band) => (
              <rect
                key={colour + String(band)}
                x={0}
                y={band}
                width={1}
                height={1.05}
                fill={colour}
              />
            ))}
          </svg>
          <p className={classOf(styles, "scaleEnds")}>
            <span>{valueText(legend.max)}</span>
            <span>{valueText(legend.min)}</span>
          </p>
        </div>
      )}
      {legend.noneCount > 0 && (
        <p className={classOf(styles, "legendNone")}>
          <span aria-hidden="true">
            <Mark group={NO_COLOUR_GROUP} />
          </span>
          {`${legend.noneName} (${grouped(legend.noneCount)})`}
        </p>
      )}
    </div>
  );
}
