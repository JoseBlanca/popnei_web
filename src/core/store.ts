/**
 * The store, the one object of core that changes: it holds the history of
 * the projects, the cache of the results, the version of popnei and the
 * calculations in flight, and gives the screens the state of each
 * analysis (docs/specs/core/store.md). Here, for now, the definition of an
 * analysis, which the project and the keys name, and what it uses.
 */

import type { JsonObject, JsonValue } from "./keys.ts";
import type { AnalysisId, AppId, Project } from "./project.ts";
import type { Result } from "./result.ts";
import type { Run } from "../worker/protocol.ts";

/**
 * The definition of an analysis, which its module exports. The store is
 * given those of its application, in the order the screens show them, and
 * calls nothing else of them. `J` is the type of the requests of the
 * calculation worker and `R` that of its results.
 */
export interface AnalysisDef<J, R> {
  /** The id of the analysis, "diversity", "pca". */
  readonly id: AnalysisId;
  /** The applications that have it. */
  readonly app: readonly AppId[];
  /** Its options when the user has set none. */
  readonly defaults: JsonObject;
  /** A number raised when what its result means changes for the same
      inputs, so that the results calculated before are no longer found. */
  readonly keyVersion: number;
  /** Which of the two lists of filters it reads, and so which go into its
      key. */
  readonly filtersRead: {
    readonly variants: boolean;
    readonly individuals: boolean;
  };
  /** Checks its options read from a project file of the version
      `formatVersion` of the format, and gives them whole, or what is
      wrong with them. */
  parseOptions(
    options: unknown,
    formatVersion: number,
  ): Result<JsonObject, string>;
  /** What its key holds beyond the load of the variants file and the
      filters, all of it. It answers for any project and does not read
      `p.variants`. */
  keyInputs(p: Project): JsonValue;
  /** The reason it cannot run beyond what every analysis needs, in the
      words the screen shows next to its Run button, or `null`. */
  needs(p: Project): string | null;
  /** Builds its request and sends it through `c`, which the store binds
      to its key, and returns the handle without waiting on it. */
  run(p: Project, c: WorkerClient<J, R>): Run<R>;
  /** The warnings its result raises from the data, given the project the
      request was made from. */
  warnings(r: R, p: Project): readonly Warning[];
  /** The numbers of its result kept in the project file, made from
      popnei's by addition, subtraction, multiplication and division
      alone; `null` where popnei gave NaN. */
  checkNumbers(r: R): readonly (number | null)[];
  /** Its lines of the Python script. */
  script(p: Project): string;
}

/** What an analysis sends its request through, bound by the store to one
    key. */
export interface WorkerClient<J, R> {
  /** Sends the request under the key of the analysis. */
  run(job: J): Run<R>;
  /** The key of an intermediate result of the request, "the pruned
      variants", made from its name and its inputs. */
  intermediateKey(name: string, inputs: JsonValue): string;
}

/** A warning raised by the data. */
export interface Warning {
  /** What the tests assert. */
  readonly code: string;
  /** The text the user reads. */
  readonly text: string;
}
