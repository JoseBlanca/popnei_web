/**
 * Who asks for a read (docs/specs/entry.md, "Who asks for a read"): after
 * every change of the project, the entry asks the worker client for the
 * read of each source whose read is pending and has none under way,
 * cancels a read under way whose source the project no longer holds
 * pending, and records the outcome of each read into the store.
 */

import type { Project } from "../core/project.ts";
import type { Store } from "../core/store.ts";
import type {
  Client,
  IndividualsAnswer,
  Read,
  VariantsOpened,
} from "../worker/client.ts";
import type { CsvOptions, JobResult, LoadFormat } from "../worker/protocol.ts";

/** A read the project waits for. */
export type WantedRead =
  /** The variants file of the load `fileId`, with its format and the read
      options of a VCF. */
  | ({ readonly kind: "variants"; readonly fileId: string } & LoadFormat)
  /** The individuals file of the load `fileId`, with the options of its
      CSV, `null` for an xlsx. */
  | {
      readonly kind: "individuals";
      readonly fileId: string;
      readonly csv: CsvOptions | null;
    };

/** The part of the worker client that reads. */
export type ReadClient = Pick<Client, "openVariants" | "readIndividuals">;

/** What the reads need of the store. */
export type ReadStore = Pick<
  Store<JobResult, Blob>,
  "getState" | "variantsRead" | "individualsRead"
>;

/**
 * The reads the project waits for: its sources whose read is pending, the
 * variants file first, and the individuals file with the options of its
 * CSV, `null` for an xlsx (docs/specs/entry.md, "Who asks for a read").
 * Throws a defect on a variants source whose read options do not go with
 * its format.
 */
export function wantedReads(p: Project): readonly WantedRead[] {
  const wanted: WantedRead[] = [];
  const variants = p.variants;
  if (variants?.read.kind === "pending") {
    const { fileId, format, readOptions } = variants;
    if (format === "vcf" && readOptions !== null) {
      wanted.push({ kind: "variants", fileId, format, readOptions });
    } else if (format === "nei" && readOptions === null) {
      wanted.push({ kind: "variants", fileId, format, readOptions });
    } else {
      throw new Error(
        `popnei_web defect: the variants file ${fileId} is a ${format} file with the read options ${JSON.stringify(readOptions)}.`,
      );
    }
  }
  const individuals = p.individuals;
  if (individuals?.read.kind === "pending") {
    wanted.push({
      kind: "individuals",
      fileId: individuals.fileId,
      csv: individuals.csv,
    });
  }
  return wanted;
}

/** A read under way, with its handle. */
type UnderWay =
  | {
      readonly wanted: Extract<WantedRead, { kind: "variants" }>;
      readonly read: Read<VariantsOpened>;
    }
  | {
      readonly wanted: Extract<WantedRead, { kind: "individuals" }>;
      readonly read: Read<IndividualsAnswer>;
    };

/** Whether two options of a CSV have the same values; `null`, an xlsx,
    is the same only as `null`. */
function sameCsv(a: CsvOptions | null, b: CsvOptions | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.encoding === b.encoding &&
    a.separator === b.separator &&
    a.decimal === b.decimal
  );
}

/** Whether a read under way is the read `wanted`: the same load and, for
    the individuals file, options of the CSV of the same values, since an
    undo and a new choice of the same options give equal options in
    different objects. */
function isRead(underWay: UnderWay, wanted: WantedRead): boolean {
  const asked = underWay.wanted;
  if (asked.kind === "variants" || wanted.kind === "variants") {
    return asked.kind === wanted.kind && asked.fileId === wanted.fileId;
  }
  return asked.fileId === wanted.fileId && sameCsv(asked.csv, wanted.csv);
}

/**
 * Keeps the reads under way and applies the rule of the reads. The entry
 * calls `sync` from its subscription to the store, which also calls it for
 * a progress of a calculation: it looks at the project only when it is
 * another object than the one it last looked at. The outcome of a read
 * makes it look again whatever the project.
 */
export function createReads(deps: {
  readonly store: ReadStore;
  readonly client: ReadClient;
}): { sync(): void } {
  const { store, client } = deps;
  const underWay: UnderWay[] = [];
  let looked: Project | null = null;

  function take(read: UnderWay["read"]): void {
    const index = underWay.findIndex((u) => u.read === read);
    if (index !== -1) {
      underWay.splice(index, 1);
    }
  }

  function recordVariants(fileId: string, outcome: VariantsOpened): void {
    switch (outcome.kind) {
      case "opened":
        store.variantsRead(fileId, {
          kind: "read",
          individuals: outcome.individuals,
          ploidy: outcome.ploidy,
          numVars: null,
          keepsPassed: outcome.keepsPassed,
        });
        return;
      case "failed": {
        const error = outcome.error;
        store.variantsRead(fileId, {
          kind: "failed",
          error:
            error.kind === "popnei"
              ? { kind: "popnei", message: error.message }
              : { kind: "worker", error },
        });
        return;
      }
      case "cancelled":
        return;
    }
  }

  function recordIndividuals(
    fileId: string,
    csv: CsvOptions | null,
    outcome: IndividualsAnswer,
  ): void {
    switch (outcome.kind) {
      case "read":
        store.individualsRead(fileId, csv, {
          kind: "read",
          table: outcome.table,
          columns: outcome.columns,
          found: outcome.found,
        });
        return;
      case "refused":
        store.individualsRead(fileId, csv, {
          kind: "failed",
          error: outcome.error,
          format: outcome.format,
        });
        return;
      case "failed":
        store.individualsRead(fileId, csv, {
          kind: "failed",
          error: { kind: "worker", error: outcome.error },
          format: null,
        });
        return;
      case "cancelled":
        return;
    }
  }

  function ask(wanted: WantedRead): void {
    switch (wanted.kind) {
      case "variants": {
        const fileId = wanted.fileId;
        const read = client.openVariants(
          wanted.format === "vcf"
            ? { fileId, format: "vcf", readOptions: wanted.readOptions }
            : { fileId, format: "nei", readOptions: null },
        );
        underWay.push({ wanted, read });
        void read.outcome.then((outcome) => {
          take(read);
          recordVariants(fileId, outcome);
          apply();
        });
        return;
      }
      case "individuals": {
        const { fileId, csv } = wanted;
        const read = client.readIndividuals(fileId, csv);
        underWay.push({ wanted, read });
        void read.outcome.then((outcome) => {
          take(read);
          recordIndividuals(fileId, csv, outcome);
          apply();
        });
        return;
      }
    }
  }

  /** The rule: cancel what the project no longer waits for, ask for what
      it waits for and nobody reads. */
  function apply(): void {
    const project = store.getState().project;
    looked = project;
    const wanted = wantedReads(project);
    for (const u of [...underWay]) {
      if (!wanted.some((w) => isRead(u, w))) {
        take(u.read);
        u.read.cancel();
      }
    }
    for (const w of wanted) {
      if (!underWay.some((u) => isRead(u, w))) {
        ask(w);
      }
    }
  }

  return {
    sync: () => {
      if (store.getState().project !== looked) {
        apply();
      }
    },
  };
}
