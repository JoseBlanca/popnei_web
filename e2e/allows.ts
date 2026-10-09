/**
 * The script of e2e/allows.html: sets `window.allowsPage`, which times
 * `columnAllows` alone on the table of a CSV as the light worker gives it
 * (e2e/allowsPage.ts). The CSV of the measurement is made by
 * e2e/measure.spec.ts, with no quote and the comma, so it is split here
 * as table_io reads it: an empty cell missing, a cell of digits with an
 * optional point a number, and any other a text. table_io is not loaded
 * in this page, which only the light worker does.
 */

import { columnAllows } from "../src/core/project.ts";
import type { Cell, IndividualsTable } from "../src/worker/protocol.ts";
import { inferColumnTypes } from "../src/worker/individuals/columnTypes.ts";
import type { AllowsPage } from "./allowsPage.ts";

/** A cell of the measurement's CSV as table_io makes it. */
function cellOf(text: string): Cell {
  if (text === "") return null;
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text;
}

/** The table of the measurement's CSV, its first column the names. */
function tableOf(text: string): IndividualsTable {
  const [header, ...lines] = text.split("\n").filter((line) => line !== "");
  if (header === undefined) {
    throw new Error("the CSV of the measurement has no header");
  }
  return {
    columns: header.split(","),
    rows: lines.map((line) =>
      line.split(",").map((cell, index) => (index === 0 ? cell : cellOf(cell))),
    ),
  };
}

const page: AllowsPage = {
  time: (text, repeats) => {
    const table = tableOf(text);
    const columns = inferColumnTypes(table, ".");
    const times: number[] = [];
    for (let k = 0; k < repeats; k++) {
      // A copy, since columnAllows keeps its answer for a table it has seen.
      const copy = structuredClone(table);
      const start = performance.now();
      columnAllows({
        kind: "read",
        table: copy,
        columns,
        found: {
          encoding: "utf-8",
          separator: ",",
          decimal: ".",
          undecodedLine: null,
        },
      });
      times.push(performance.now() - start);
    }
    return times;
  },
};

window.allowsPage = page;
