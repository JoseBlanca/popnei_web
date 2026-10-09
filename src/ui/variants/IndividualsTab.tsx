/**
 * The tab "Individuals file" of popgen2.html
 * (docs/specs/steps/popgen2-input.md, "The tab Individuals file" and
 * "Both tabs kept drawn"): with no file, its words; while it is read, the
 * words of the read, under the options of a CSV when the last read of the
 * same load was of a text file, so that the select just changed keeps the
 * focus; refused, the options of a text file and the line that sends to
 * the box; read, how it was read, the options of a CSV or the line of the
 * first sheet of an xlsx, the individuals of the variants file that the
 * file does not have with the button that copies their names, and the
 * table of the file, sortable.
 *
 * What the screen holds of its own: the format of the last read of each
 * load, and whether it started with the mark of UTF-16, which a read
 * under way does not tell; the sort of the table; and how far the table
 * was scrolled, which a box hidden with the tab forgets, put back when
 * the tab is shown again.
 */
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { escaped, individualsCheck } from "../../core/project.ts";
import type { IndividualsSource, TableRead } from "../../core/project.ts";
import type {
  CsvFound,
  CsvOptions,
  TableFormat,
} from "../../worker/protocol.ts";
import { classOf } from "../classOf.ts";
import { useAnnouncer } from "../shell/announcer.tsx";
import { csvOptionCommand } from "../steps/individuals/commands.ts";
import {
  NOT_COPIED,
  UTF16_TEXT,
  copiedNames,
  copiedText,
  copyLabel,
  decimalItems,
  detectedText,
  encodingItems,
  separatorItems,
  undecodedText,
} from "../steps/individuals/words.ts";
import { useAppState, useStore } from "../store.tsx";
import { Button } from "../widgets/Button.tsx";
import { Select } from "../widgets/Select.tsx";
import { SortableTable } from "../widgets/SortableTable.tsx";
import type { TableSort } from "../widgets/tableSort.ts";
import { Warning } from "../widgets/Warning.tsx";
import styles from "./IndividualsTab.module.css";
import {
  individualsTableColumns,
  individualsTableRows,
  sortedTableRows,
} from "./individualsTable.ts";
import type { TableColumnId } from "./individualsTable.ts";
import {
  individualsTabShows,
  notInFileHeading,
  tableLabel,
  tableSizeText,
} from "./individualsWords.ts";

/** What the tab is drawn with. */
export interface IndividualsTabProps {
  /** Whether the tab is shown, for the table to scroll back to where it
      was when it is shown again. */
  readonly shown: boolean;
}

/** The tab of the individuals file. */
export function IndividualsTab({
  shown,
}: IndividualsTabProps): React.JSX.Element {
  const individuals = useAppState((s) => s.project.individuals);
  const read = individuals?.read ?? null;
  const loadId = individuals?.fileId ?? null;

  // The format of the last read of the load, kept for it while a read of
  // other options is under way, which tells nothing; set while drawing,
  // as React keeps such a value, for the load it belongs to.
  const [formatLoad, setFormatLoad] = useState<{
    readonly fileId: string;
    readonly format: TableFormat | null;
  } | null>(null);
  const known = knownFormat(read);
  if (
    known !== undefined &&
    loadId !== null &&
    (formatLoad?.fileId !== loadId || formatLoad.format !== known)
  ) {
    setFormatLoad({ fileId: loadId, format: known });
  }
  const lastFormat =
    known !== undefined
      ? known
      : formatLoad !== null && formatLoad.fileId === loadId
        ? formatLoad.format
        : null;

  // The load whose file starts with the mark of UTF-16, which no option
  // changes, so that its line stays while a read of other options is
  // under way.
  const [utf16Load, setUtf16Load] = useState<string | null>(null);
  const found = read?.kind === "read" ? read.found : null;
  if (found?.encoding === "utf-16" && loadId !== null && utf16Load !== loadId) {
    setUtf16Load(loadId);
  }
  const isUtf16 =
    found !== null ? found.encoding === "utf-16" : utf16Load === loadId;

  const shows = individualsTabShows(individuals, lastFormat);
  const options =
    individuals !== null && individuals.csv !== null ? (
      <ReadOptions
        name={individuals.name}
        csv={individuals.csv}
        found={found}
        isUtf16={isUtf16}
      />
    ) : null;

  switch (shows.kind) {
    case "none":
      return <p className={classOf(styles, "line")}>{shows.text}</p>;
    case "reading":
    case "refused":
      return (
        <div className={classOf(styles, "tab")}>
          {shows.options && options}
          <p className={classOf(styles, "line")}>{shows.text}</p>
        </div>
      );
    case "read":
      if (individuals === null || read?.kind !== "read") {
        throw new Error(
          "popnei_web defect: the tab of the individuals file shows a read it does not have.",
        );
      }
      return (
        <div className={classOf(styles, "tab")}>
          {shows.options ? (
            options
          ) : (
            <p className={classOf(styles, "line")}>{shows.sheetLine}</p>
          )}
          {found?.undecodedLine !== null && found !== null && (
            <p className={classOf(styles, "line")}>
              <Warning>
                {undecodedText(individuals.name, found, found.undecodedLine)}
              </Warning>
            </p>
          )}
          <NotInFile individuals={individuals} />
          <FileTable
            // A new load, or a read of other options, starts unsorted and
            // at the top.
            key={`${individuals.fileId} ${JSON.stringify(individuals.csv)}`}
            read={read}
            name={individuals.name}
            shown={shown}
          />
        </div>
      );
  }
}

/** The format the reader found of `read`: "text" for a read with a
    found, "xlsx" for one without, the format of a refusal, `null` for a
    refusal before the reader read the bytes; `undefined` with no file or
    while it is being read, which tells nothing. */
function knownFormat(
  read: IndividualsSource["read"] | null,
): TableFormat | null | undefined {
  if (read === null) return undefined;
  switch (read.kind) {
    case "pending":
      return undefined;
    case "read":
      return read.found === null ? "xlsx" : "text";
    case "failed":
      return read.format;
    case "notGiven":
      return null;
  }
}

/** What the three options of the reader are drawn with. */
interface ReadOptionsProps {
  /** The name of the file. */
  readonly name: string;
  /** How it is read now. */
  readonly csv: CsvOptions;
  /** What the last read used, `null` while it is under way or after a
      refusal. */
  readonly found: CsvFound | null;
  /** Whether the file starts with the mark of UTF-16, which no encoding
      changes. */
  readonly isUtf16: boolean;
}

/** The encoding, or the line of UTF-16, the separator and the decimal
    mark, each with "Detected: …" until the user sets it, as in the old
    Individuals step; a change reads the file again. */
function ReadOptions({
  name,
  csv,
  found,
  isUtf16,
}: ReadOptionsProps): React.JSX.Element {
  const store = useStore();
  const send = (
    option: "encoding" | "separator" | "decimal",
    next: CsvOptions,
  ): void => {
    const step = csvOptionCommand(option, name, next);
    store.apply(step.description, step.command);
  };
  return (
    <div className={classOf(styles, "options")}>
      {isUtf16 ? (
        <p className={classOf(styles, "line")}>{UTF16_TEXT}</p>
      ) : (
        <Select
          label="Encoding"
          items={encodingItems(detectedText("encoding", csv, found))}
          value={csv.encoding}
          onChange={(encoding) => {
            send("encoding", { ...csv, encoding });
          }}
        />
      )}
      <Select
        label="Separator"
        items={separatorItems(detectedText("separator", csv, found))}
        value={csv.separator}
        onChange={(separator) => {
          send("separator", { ...csv, separator });
        }}
      />
      <Select
        label="Decimal mark"
        items={decimalItems(detectedText("decimal", csv, found))}
        value={csv.decimal}
        onChange={(decimal) => {
          send("decimal", { ...csv, decimal });
        }}
      />
    </div>
  );
}

/** The individuals of the variants file that `individuals` does not
    have, before the filters, in the order of the variants file, with the
    button that copies their names; nothing when there are none, or the
    variants file is not read. */
function NotInFile({
  individuals,
}: {
  readonly individuals: IndividualsSource;
}): React.JSX.Element | null {
  const headingId = useId();
  const check = useAppState((s) => individualsCheck(s.project));
  const variantsName = useAppState((s) => s.project.variants?.name ?? null);
  if (check === null || variantsName === null || check.missing.length === 0) {
    return null;
  }
  return (
    <section
      aria-labelledby={headingId}
      className={classOf(styles, "notInFile")}
    >
      <h2 id={headingId} className={classOf(styles, "heading")}>
        {notInFileHeading(variantsName, individuals.name)}
      </h2>
      <ul className={classOf(styles, "names")}>
        {check.missing.map((name) => (
          <li key={name}>{escaped(name)}</li>
        ))}
      </ul>
      <div>
        <CopyNames names={check.missing} />
      </div>
    </section>
  );
}

/** The button that copies the names to the clipboard, one a line, for a
    user of the keyboard, who cannot select the list, and says in the
    status region whether it did, since the focus stays on the button. */
function CopyNames({
  names,
}: {
  readonly names: readonly string[];
}): React.JSX.Element {
  const announcer = useAnnouncer();
  async function copy(): Promise<void> {
    let copied = true;
    try {
      // navigator.clipboard is missing on a page served over plain HTTP
      // from another machine, and the call then throws; a browser may
      // also refuse the write.
      await navigator.clipboard.writeText(copiedNames(names));
    } catch {
      copied = false;
    }
    announcer.announce(copied ? copiedText(names.length) : NOT_COPIED);
  }
  return (
    <Button
      label={copyLabel(names.length)}
      onPress={() => {
        void copy();
      }}
    />
  );
}

/** What the table of the file is drawn with. */
interface FileTableProps {
  /** The read of the file, with its table. */
  readonly read: TableRead;
  /** The name of the file. */
  readonly name: string;
  /** Whether the tab is shown. */
  readonly shown: boolean;
}

/** How far a box is scrolled, down and sideways, in CSS pixels. */
interface ScrollPlace {
  readonly top: number;
  readonly left: number;
}

/** The size of the table, and the table, sorted by a click on a header
    or Enter on it, which keeps its sort and its place through a turn of
    the tabs. A sort is drawn as a transition of React, which first
    paints "Sorting…" beside the size and marks the grid busy, and then
    draws the rows sorted. At 10,000 rows of 20 columns the rows took a
    median of 268 ms in Chromium 153 and 382 ms in WebKit 26.6 with
    nothing on screen to say the click was taken, and a second click then
    sorted the other way; as a transition, "Sorting…" is painted 11 and
    6 ms after the click, and the rows 311 and 382 ms after it (IN6 D4 of
    e2e/measure.spec.ts, 9 October 2026). A click while a sort is drawn
    asks again for the same one, since the header still holds the sort
    before it. */
function FileTable({ read, name, shown }: FileTableProps): React.JSX.Element {
  const [sort, setSort] = useState<TableSort<TableColumnId> | null>(null);
  const [sorting, startSorting] = useTransition();
  // The same function at each drawing, so that "Sorting…" does not draw
  // the grid again.
  const sortBy = useCallback((next: TableSort<TableColumnId>): void => {
    startSorting(() => {
      setSort(next);
    });
  }, []);
  const columns = useMemo(() => individualsTableColumns(read), [read]);
  // The same objects in every order, so that a sort only reorders them:
  // 10,000 rows made anew at each sort would be the slowness react.md,
  // "Performance", warns of.
  const rows = useMemo(
    () => sortedTableRows(read, individualsTableRows(read), sort),
    [read, sort],
  );
  const frame = useRef<HTMLDivElement>(null);
  useScrollPlace(frame, shown);
  return (
    <div className={classOf(styles, "table")}>
      <p className={classOf(styles, "line")}>
        {tableSizeText(read.table, sorting)}
      </p>
      <div ref={frame}>
        <SortableTable
          label={tableLabel(name)}
          columns={columns}
          rows={rows}
          sort={sort}
          onSortChange={sortBy}
          headingLines={1}
          busy={sorting}
        />
      </div>
    </div>
  );
}

/**
 * Notes how far the grid in `frame` is scrolled while it is in view, and,
 * when `shown` turns true again, scrolls it back there once the table has
 * measured its box and drawn its rows: a box hidden with `display: none`
 * forgets how far it was scrolled, and the table, which draws only the
 * rows in view, finds none in view while its box has no size (the spec,
 * "Both tabs kept drawn").
 */
function useScrollPlace(
  frame: React.RefObject<HTMLDivElement | null>,
  shown: boolean,
): void {
  const noted = useRef<ScrollPlace | null>(null);

  useEffect(() => {
    const grid = frame.current?.querySelector<HTMLElement>('[role="grid"]');
    if (grid === null || grid === undefined) return undefined;
    const note = (): void => {
      // A box with no size, its tab hidden, is not where the user left
      // it.
      if (grid.clientHeight === 0) return;
      noted.current = { top: grid.scrollTop, left: grid.scrollLeft };
    };
    grid.addEventListener("scroll", note, { passive: true });
    return () => {
      grid.removeEventListener("scroll", note);
    };
  }, [frame]);

  useLayoutEffect(() => {
    if (!shown) return undefined;
    const back = noted.current;
    const grid = frame.current?.querySelector<HTMLElement>('[role="grid"]');
    if (back === null || grid === null || grid === undefined) return undefined;
    // The next frame, once the table has measured its box, laid out its
    // rows and drawn those in view at the top.
    const handle = requestAnimationFrame(() => {
      grid.scrollTo({ top: back.top, left: back.left });
    });
    return () => {
      cancelAnimationFrame(handle);
    };
  }, [frame, shown]);
}
