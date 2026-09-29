/**
 * The script of e2e/allows.html: sets `window.allowsPage`, which times
 * `columnAllows` alone on a table read by the reader of the light worker
 * (e2e/allowsPage.ts).
 */

import { columnAllows } from "../src/core/project.ts";
import { readCsv } from "../src/worker/individuals/csv.ts";
import type { AllowsPage } from "./allowsPage.ts";

const page: AllowsPage = {
  time: (text, repeats) => {
    const read = readCsv(text, { separator: "auto", decimal: "auto" });
    if (!read.ok) {
      throw new Error(
        `the CSV of the measurement was refused: ${read.error.kind}`,
      );
    }
    const { table, columns, separator, decimal } = read.value;
    const times: number[] = [];
    for (let k = 0; k < repeats; k++) {
      // A copy, since columnAllows keeps its answer for a table it has seen.
      const copy = structuredClone(table);
      const start = performance.now();
      columnAllows({
        kind: "read",
        table: copy,
        columns,
        found: { encoding: "utf-8", separator, decimal, undecodedLine: null },
      });
      times.push(performance.now() - start);
    }
    return times;
  },
};

window.allowsPage = page;
