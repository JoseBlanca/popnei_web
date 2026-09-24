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
  | {
      /** Which request this is. */
      readonly kind: "openServed";
    }
  /** Open a file the user picked. */
  | {
      /** Which request this is. */
      readonly kind: "openFile";
      /** The file, as the file input gave it to the page. */
      readonly file: File;
    };

/** What the worker tells the page. */
export type FromProbe =
  /** popnei's wasm is loaded and can be called. */
  | {
      /** Which message this is. */
      readonly kind: "ready";
      /**
       * popnei's `version()`, the version of its core crate,
       * `major.minor.patch`, which is also the version of the package.
       */
      readonly popneiVersion: string;
      /** How long popnei's `init()` took, in milliseconds. */
      readonly initMs: number;
    }
  /** A file was opened. */
  | {
      /** Which message this is. */
      readonly kind: "opened";
      /** The file the site serves, or a file the user picked. */
      readonly source: "served" | "file";
      /** The name of the file, without its folder. */
      readonly name: string;
      /** The number of individuals popnei read from the file. */
      readonly numIndividuals: number;
      /** The ploidy popnei opened the file with. */
      readonly ploidy: number;
      /**
       * True when the ploidy was given to popnei and not read from the
       * file, as for a VCF, which is opened as diploid.
       */
      readonly ploidyAssumed: boolean;
      /** How long the opening took, in milliseconds. */
      readonly openMs: number;
    }
  /** popnei could not be loaded. */
  | {
      /** Which message this is. */
      readonly kind: "failed";
      /** What failed: loading popnei. */
      readonly stage: "init";
      /**
       * The address of popnei's wasm, as the worker's list of what it
       * fetched has it, or null when the list has none.
       */
      readonly address: string | null;
      /** popnei's message or the browser's, as it came. */
      readonly message: string;
    }
  /** A file could not be opened. */
  | {
      /** Which message this is. */
      readonly kind: "failed";
      /** What failed: opening a file. */
      readonly stage: "open";
      /**
       * The file the site serves, or a file the user picked, as in
       * `opened`: the two answers can arrive in either order, and this is
       * what tells the page which file failed.
       */
      readonly source: "served" | "file";
      /** The name of the file, without its folder. */
      readonly name: string;
      /**
       * The address the worker fetched the served file from, or null for
       * a file of the user, which has none.
       */
      readonly address: string | null;
      /** popnei's message or the browser's, as it came. */
      readonly message: string;
    }
  /**
   * The worker received a request that is not a `ToProbe`, which only a
   * defect of the page can send.
   */
  | {
      /** Which message this is. */
      readonly kind: "failed";
      /** What failed: a request the worker does not know. */
      readonly stage: "message";
      /** What was wrong with the request, from `describeMessageError`. */
      readonly message: string;
    };

/** The stages of a `failed`, tied to the type so a new one is not missed. */
const FAILED_STAGES: Readonly<
  Record<Extract<FromProbe, { kind: "failed" }>["stage"], true>
> = {
  init: true,
  open: true,
  message: true,
};

/**
 * The outcome of a validator: the typed message, or the way it was wrong.
 *
 * It is a type of its own and not the `Result` of `src/core/result.ts`,
 * which it has the shape of, because the probe imports nothing of `src/`
 * (docs/specs/site.md, "The repository").
 */
export type Checked<T> =
  | {
      /** The message is one of its side. */
      readonly ok: true;
      /** The message, typed. */
      readonly value: T;
    }
  | {
      /** The message is not one of its side. */
      readonly ok: false;
      /** The way it was wrong; `describeMessageError` writes it out. */
      readonly error: MessageError;
    };

/**
 * The type of a value as a message error names it: what `typeof` gives,
 * but `null` and `array` apart from `object`.
 */
export type TypeName =
  | "undefined"
  | "null"
  | "array"
  | "object"
  | "boolean"
  | "number"
  | "bigint"
  | "string"
  | "symbol"
  | "function";

/** The ways a message can fail a validator, each with its facts. */
export type MessageError =
  /** The message is not a plain object. */
  | {
      readonly kind: "notObject";
      /** The type of what arrived. */
      readonly found: TypeName;
    }
  /** The message has no field `kind`. */
  | { readonly kind: "noKind" }
  /** The field `kind` is not text. */
  | {
      readonly kind: "kindNotText";
      /** The type of the field `kind`. */
      readonly found: TypeName;
    }
  /** The field `kind` is text but not a kind of this side. */
  | {
      readonly kind: "unknownKind";
      /** The kind that arrived. */
      readonly found: string;
      /** The kinds of this side. */
      readonly expected: readonly string[];
    }
  /** Fields of the message's kind are not there. */
  | {
      readonly kind: "missingFields";
      /** The kind of the message. */
      readonly messageKind: string;
      /** The fields that are not there. */
      readonly fields: readonly string[];
    }
  /** The message has fields its kind does not have. */
  | {
      readonly kind: "extraFields";
      /** The kind of the message. */
      readonly messageKind: string;
      /** The fields it should not have. */
      readonly fields: readonly string[];
    }
  /** A field is there, with a value of the wrong type. */
  | {
      readonly kind: "wrongType";
      /** The kind of the message. */
      readonly messageKind: string;
      /** The field. */
      readonly field: string;
      /** What the field should hold, in words. */
      readonly expected: string;
      /** The type of what it holds. */
      readonly found: TypeName;
    };

/** The kinds of each side, tied to the types so a new kind is not missed. */
const TO_PROBE_KINDS: Readonly<Record<ToProbe["kind"], true>> = {
  openServed: true,
  openFile: true,
};
const FROM_PROBE_KINDS: Readonly<Record<FromProbe["kind"], true>> = {
  ready: true,
  opened: true,
  failed: true,
};

/**
 * Checks a message that arrived at the worker from the page. It gives the
 * typed message when its kind is one of `ToProbe`, every field of that
 * kind is there with its type, and there is no other field; otherwise the
 * first way it was wrong.
 */
export function validateToProbe(message: unknown): Checked<ToProbe> {
  const known = knownKind(message, TO_PROBE_KINDS);
  if (!known.ok) {
    return known;
  }
  const { record, kind } = known.value;
  switch (kind) {
    case "openServed": {
      const wrong = wrongFields(record, kind, ["kind"]);
      return wrong ?? { ok: true, value: { kind } };
    }
    case "openFile": {
      const wrong = wrongFields(record, kind, ["kind", "file"]);
      if (wrong !== null) {
        return wrong;
      }
      const file = ownField(record, "file");
      if (!(file instanceof File)) {
        return wrongType(kind, "file", "a File", file);
      }
      return { ok: true, value: { kind, file } };
    }
  }
}

/**
 * Checks a message that arrived at the page from the worker. It gives the
 * typed message when its kind is one of `FromProbe`, every field of that
 * kind is there with its type, and there is no other field; otherwise the
 * first way it was wrong. It checks the type of a number and not its
 * range, which is the worker's to get right (worker.md).
 */
export function validateFromProbe(message: unknown): Checked<FromProbe> {
  const known = knownKind(message, FROM_PROBE_KINDS);
  if (!known.ok) {
    return known;
  }
  const { record, kind } = known.value;
  switch (kind) {
    case "ready": {
      const wrong = wrongFields(record, kind, [
        "kind",
        "popneiVersion",
        "initMs",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const popneiVersion = ownField(record, "popneiVersion");
      const initMs = ownField(record, "initMs");
      if (typeof popneiVersion !== "string") {
        return wrongType(kind, "popneiVersion", "a string", popneiVersion);
      }
      if (typeof initMs !== "number") {
        return wrongType(kind, "initMs", "a number", initMs);
      }
      return { ok: true, value: { kind, popneiVersion, initMs } };
    }
    case "opened": {
      const wrong = wrongFields(record, kind, [
        "kind",
        "source",
        "name",
        "numIndividuals",
        "ploidy",
        "ploidyAssumed",
        "openMs",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const source = ownField(record, "source");
      const name = ownField(record, "name");
      const numIndividuals = ownField(record, "numIndividuals");
      const ploidy = ownField(record, "ploidy");
      const ploidyAssumed = ownField(record, "ploidyAssumed");
      const openMs = ownField(record, "openMs");
      if (source !== "served" && source !== "file") {
        return wrongType(kind, "source", '"served" or "file"', source);
      }
      if (typeof name !== "string") {
        return wrongType(kind, "name", "a string", name);
      }
      if (typeof numIndividuals !== "number") {
        return wrongType(kind, "numIndividuals", "a number", numIndividuals);
      }
      if (typeof ploidy !== "number") {
        return wrongType(kind, "ploidy", "a number", ploidy);
      }
      if (typeof ploidyAssumed !== "boolean") {
        return wrongType(kind, "ploidyAssumed", "a boolean", ploidyAssumed);
      }
      if (typeof openMs !== "number") {
        return wrongType(kind, "openMs", "a number", openMs);
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
    case "failed":
      return validateFailed(record);
  }
}

/**
 * Checks a `failed` whose kind is known: its stage first, then the fields
 * of that stage, which differ from one stage to another. The errors of the
 * fields name the message as "failed of stage <stage>".
 */
function validateFailed(record: object): Checked<FromProbe> {
  if (!Object.hasOwn(record, "stage")) {
    return refused({
      kind: "missingFields",
      messageKind: "failed",
      fields: ["stage"],
    });
  }
  const stage = ownField(record, "stage");
  if (typeof stage !== "string" || !isKind(stage, FAILED_STAGES)) {
    return wrongType("failed", "stage", '"init", "open" or "message"', stage);
  }
  const messageKind = `failed of stage ${stage}`;
  const text = ownField(record, "message");
  switch (stage) {
    case "init": {
      const wrong = wrongFields(record, messageKind, [
        "kind",
        "stage",
        "address",
        "message",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const address = ownField(record, "address");
      if (address !== null && typeof address !== "string") {
        return wrongType(messageKind, "address", "a string or null", address);
      }
      if (typeof text !== "string") {
        return wrongType(messageKind, "message", "a string", text);
      }
      return {
        ok: true,
        value: { kind: "failed", stage, address, message: text },
      };
    }
    case "open": {
      const wrong = wrongFields(record, messageKind, [
        "kind",
        "stage",
        "source",
        "name",
        "address",
        "message",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      const source = ownField(record, "source");
      const name = ownField(record, "name");
      const address = ownField(record, "address");
      if (source !== "served" && source !== "file") {
        return wrongType(messageKind, "source", '"served" or "file"', source);
      }
      if (typeof name !== "string") {
        return wrongType(messageKind, "name", "a string", name);
      }
      if (address !== null && typeof address !== "string") {
        return wrongType(messageKind, "address", "a string or null", address);
      }
      if (typeof text !== "string") {
        return wrongType(messageKind, "message", "a string", text);
      }
      return {
        ok: true,
        value: { kind: "failed", stage, source, name, address, message: text },
      };
    }
    case "message": {
      const wrong = wrongFields(record, messageKind, [
        "kind",
        "stage",
        "message",
      ]);
      if (wrong !== null) {
        return wrong;
      }
      if (typeof text !== "string") {
        return wrongType(messageKind, "message", "a string", text);
      }
      return { ok: true, value: { kind: "failed", stage, message: text } };
    }
  }
}

/** The text the page shows for a message that failed its validator. */
export function describeMessageError(error: MessageError): string {
  switch (error.kind) {
    case "notObject":
      return `A message between the probe's page and its worker is not an object but ${error.found}.`;
    case "noKind":
      return "A message between the probe's page and its worker has no kind.";
    case "kindNotText":
      return `A message between the probe's page and its worker has a kind that is ${error.found}, not text.`;
    case "unknownKind":
      return `A message between the probe's page and its worker has the kind "${error.found}", which is not one of ${error.expected.join(", ")}.`;
    case "missingFields":
      return `The message ${error.messageKind} lacks the fields ${error.fields.join(", ")}.`;
    case "extraFields":
      return `The message ${error.messageKind} has fields it should not have: ${error.fields.join(", ")}.`;
    case "wrongType":
      return `The field ${error.field} of the message ${error.messageKind} is ${error.found}, not ${error.expected}.`;
  }
}

/**
 * The message as an object and its kind, when the kind is one of `kinds`;
 * otherwise the way it was wrong.
 */
function knownKind<K extends string>(
  message: unknown,
  kinds: Readonly<Record<K, true>>,
): Checked<{ readonly record: object; readonly kind: K }> {
  if (!isRecord(message)) {
    return refused({ kind: "notObject", found: typeName(message) });
  }
  if (!Object.hasOwn(message, "kind")) {
    return refused({ kind: "noKind" });
  }
  const kind = ownField(message, "kind");
  if (typeof kind !== "string") {
    return refused({ kind: "kindNotText", found: typeName(kind) });
  }
  if (!isKind(kind, kinds)) {
    return refused({
      kind: "unknownKind",
      found: kind,
      expected: Object.keys(kinds),
    });
  }
  return { ok: true, value: { record: message, kind } };
}

function isKind<K extends string>(
  value: string,
  kinds: Readonly<Record<K, true>>,
): value is K {
  return Object.hasOwn(kinds, value);
}

function refused(error: MessageError): {
  readonly ok: false;
  readonly error: MessageError;
} {
  return { ok: false, error };
}

function wrongType(
  messageKind: string,
  field: string,
  expected: string,
  value: unknown,
): { readonly ok: false; readonly error: MessageError } {
  return refused({
    kind: "wrongType",
    messageKind,
    field,
    expected,
    found: typeName(value),
  });
}

function isRecord(value: unknown): value is object {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeName(value: unknown): TypeName {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value;
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
 * The fields missing from a message, or those it should not have, or
 * null when it has exactly `expected`.
 */
function wrongFields(
  record: object,
  messageKind: string,
  expected: readonly string[],
): { readonly ok: false; readonly error: MessageError } | null {
  const present = Object.keys(record);
  const missing = expected.filter((name) => !present.includes(name));
  if (missing.length > 0) {
    return refused({ kind: "missingFields", messageKind, fields: missing });
  }
  const extra = present.filter((name) => !expected.includes(name));
  if (extra.length > 0) {
    return refused({ kind: "extraFields", messageKind, fields: extra });
  }
  return null;
}
