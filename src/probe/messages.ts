/**
 * The messages between the probe's page and its worker, and the two
 * validators that check each message when it arrives
 * (docs/specs/site.md, "The messages of the probe").
 *
 * A message that is not one of these is a defect of the probe, and the
 * page shows it as an error. Both sides import this file, so it imports
 * nothing.
 */

/** A request of the page to the worker. */
export type ToProbe =
  /** Open the file the site serves, `probe/panel.nei`. */
  | { readonly kind: "openServed" }
  /** Open a file the user picked. */
  | { readonly kind: "openFile"; readonly file: File };

/** What the worker tells the page. */
export type FromProbe =
  /** popnei's wasm is loaded; `initMs` is how long `init()` took. */
  | {
      readonly kind: "ready";
      readonly popneiVersion: string;
      readonly initMs: number;
    }
  /**
   * A file was opened. `ploidyAssumed` is true when the ploidy was given
   * to popnei and not read from the file, as for a VCF; `openMs` is how
   * long the opening took.
   */
  | {
      readonly kind: "opened";
      readonly source: "served" | "file";
      readonly name: string;
      readonly numIndividuals: number;
      readonly ploidy: number;
      readonly ploidyAssumed: boolean;
      readonly openMs: number;
    }
  /**
   * popnei could not be loaded, stage `init`, or a file could not be
   * opened, stage `open`. `address` is the address the worker tried, when
   * there was one; `message` is popnei's or the browser's, as it came.
   */
  | {
      readonly kind: "failed";
      readonly stage: "init" | "open";
      readonly address: string | null;
      readonly message: string;
    };

/**
 * The outcome of a validator: the typed message, or what was wrong with
 * it, in words for the page's error.
 */
export type Checked<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

/**
 * Checks a message that arrived at the worker from the page. It gives the
 * typed message when the kind is known, every field of that kind is there
 * with its type, and there is no other field; otherwise what was wrong.
 */
export function validateToProbe(message: unknown): Checked<ToProbe> {
  if (!isRecord(message)) {
    return refused("a message to the probe's worker is not an object");
  }
  const kind = ownField(message, "kind");
  switch (kind) {
    case "openServed": {
      const wrong = wrongFields(message, ["kind"]);
      if (wrong !== null) {
        return refused(`the message openServed ${wrong}`);
      }
      return { ok: true, value: { kind } };
    }
    case "openFile": {
      const wrong = wrongFields(message, ["kind", "file"]);
      if (wrong !== null) {
        return refused(`the message openFile ${wrong}`);
      }
      const file = ownField(message, "file");
      if (!(file instanceof File)) {
        return refused("the field file of openFile is not a File");
      }
      return { ok: true, value: { kind, file } };
    }
    default:
      return refused(
        `a message to the probe's worker has the kind ${describe(kind)}, not openServed or openFile`,
      );
  }
}

/**
 * Checks a message that arrived at the page from the worker. It gives the
 * typed message when the kind is known, every field of that kind is there
 * with its type and in its range, and there is no other field; otherwise
 * what was wrong.
 */
export function validateFromProbe(message: unknown): Checked<FromProbe> {
  if (!isRecord(message)) {
    return refused("a message from the probe's worker is not an object");
  }
  const kind = ownField(message, "kind");
  switch (kind) {
    case "ready": {
      const wrong = wrongFields(message, ["kind", "popneiVersion", "initMs"]);
      if (wrong !== null) {
        return refused(`the message ready ${wrong}`);
      }
      const popneiVersion = ownField(message, "popneiVersion");
      const initMs = ownField(message, "initMs");
      if (typeof popneiVersion !== "string") {
        return refused("the field popneiVersion of ready is not a string");
      }
      if (!isDuration(initMs)) {
        return refused(
          "the field initMs of ready is not a finite number of 0 or more",
        );
      }
      return { ok: true, value: { kind, popneiVersion, initMs } };
    }
    case "opened": {
      const wrong = wrongFields(message, [
        "kind",
        "source",
        "name",
        "numIndividuals",
        "ploidy",
        "ploidyAssumed",
        "openMs",
      ]);
      if (wrong !== null) {
        return refused(`the message opened ${wrong}`);
      }
      const source = ownField(message, "source");
      const name = ownField(message, "name");
      const numIndividuals = ownField(message, "numIndividuals");
      const ploidy = ownField(message, "ploidy");
      const ploidyAssumed = ownField(message, "ploidyAssumed");
      const openMs = ownField(message, "openMs");
      if (source !== "served" && source !== "file") {
        return refused("the field source of opened is not served or file");
      }
      if (typeof name !== "string") {
        return refused("the field name of opened is not a string");
      }
      if (!isCount(numIndividuals, 0)) {
        return refused(
          "the field numIndividuals of opened is not an integer of 0 or more",
        );
      }
      if (!isCount(ploidy, 1)) {
        return refused(
          "the field ploidy of opened is not an integer of 1 or more",
        );
      }
      if (typeof ploidyAssumed !== "boolean") {
        return refused("the field ploidyAssumed of opened is not a boolean");
      }
      if (!isDuration(openMs)) {
        return refused(
          "the field openMs of opened is not a finite number of 0 or more",
        );
      }
      return {
        ok: true,
        value: {
          kind,
          source,
          name,
          numIndividuals,
          ploidy,
          ploidyAssumed,
          openMs,
        },
      };
    }
    case "failed": {
      const wrong = wrongFields(message, [
        "kind",
        "stage",
        "address",
        "message",
      ]);
      if (wrong !== null) {
        return refused(`the message failed ${wrong}`);
      }
      const stage = ownField(message, "stage");
      const address = ownField(message, "address");
      const text = ownField(message, "message");
      if (stage !== "init" && stage !== "open") {
        return refused("the field stage of failed is not init or open");
      }
      if (address !== null && typeof address !== "string") {
        return refused("the field address of failed is not a string or null");
      }
      if (typeof text !== "string") {
        return refused("the field message of failed is not a string");
      }
      return { ok: true, value: { kind, stage, address, message: text } };
    }
    default:
      return refused(
        `a message from the probe's worker has the kind ${describe(kind)}, not ready, opened or failed`,
      );
  }
}

function refused(error: string): {
  readonly ok: false;
  readonly error: string;
} {
  return { ok: false, error };
}

function isRecord(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The value of a field of the object itself, not of its prototype, so that
 * a message never passes on a field such as `constructor` that every
 * object inherits.
 */
function ownField(record: object, name: string): unknown {
  return Object.getOwnPropertyDescriptor(record, name)?.value;
}

/**
 * What is wrong with the names of the fields of a message, a field
 * missing or one of more, or null when it has exactly `expected`.
 */
function wrongFields(
  record: object,
  expected: readonly string[],
): string | null {
  const present = Object.keys(record);
  const missing = expected.filter((name) => !present.includes(name));
  if (missing.length > 0) {
    return `lacks the field ${missing.join(", ")}`;
  }
  const extra = present.filter((name) => !expected.includes(name));
  if (extra.length > 0) {
    return `has the unexpected field ${extra.join(", ")}`;
  }
  return null;
}

function isDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isCount(value: unknown, least: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= least;
}

function describe(value: unknown): string {
  return typeof value === "string" ? `"${value}"` : typeof value;
}
