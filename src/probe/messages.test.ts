import { describe, expect, test } from "vitest";
import {
  describeMessageError,
  validateFromProbe,
  validateToProbe,
} from "./messages.ts";

const READY = { kind: "ready", popneiVersion: "0.1.0", initMs: 42.5 };
const OPENED = {
  kind: "opened",
  source: "file",
  name: "panel.vcf.gz",
  numIndividuals: 200,
  ploidy: 2,
  ploidyAssumed: true,
  openMs: 3,
};
const FAILED_OPEN = {
  kind: "failed",
  stage: "open",
  source: "served",
  name: "panel.nei",
  address: "http://localhost:4173/popnei_web/probe/panel.nei",
  message: "404 Not Found",
};
const FAILED_INIT = {
  kind: "failed",
  stage: "init",
  address: null,
  message: "WebAssembly.instantiate(): expected magic word",
};
const FAILED_MESSAGE = {
  kind: "failed",
  stage: "message",
  message: "The message openFile lacks the fields file.",
};

describe("validateFromProbe", () => {
  test.each([
    ["ready", READY],
    ["opened", OPENED],
    ["failed to open the served file", FAILED_OPEN],
    [
      "failed to open a file of the user, with no address",
      { ...FAILED_OPEN, source: "file", name: "bad.vcf", address: null },
    ],
    ["failed to load popnei, with no address", FAILED_INIT],
    [
      "failed to load popnei, with the address of the wasm",
      { ...FAILED_INIT, address: "http://localhost/popnei_bg-1a2b.wasm" },
    ],
    ["failed on a request the worker does not know", FAILED_MESSAGE],
  ])("accepts %s", (_name, message) => {
    expect(validateFromProbe(message)).toEqual({ ok: true, value: message });
  });

  test.each([
    ["popneiVersion", { ...READY, popneiVersion: 1 }, "ready", "number"],
    ["initMs", { ...READY, initMs: "42" }, "ready", "string"],
    ["source", { ...OPENED, source: "url" }, "opened", "string"],
    ["name", { ...OPENED, name: 1 }, "opened", "number"],
    [
      "numIndividuals",
      { ...OPENED, numIndividuals: "200" },
      "opened",
      "string",
    ],
    ["ploidy", { ...OPENED, ploidy: null }, "opened", "null"],
    ["ploidyAssumed", { ...OPENED, ploidyAssumed: "yes" }, "opened", "string"],
    ["openMs", { ...OPENED, openMs: [3] }, "opened", "array"],
    ["stage", { ...FAILED_OPEN, stage: "load" }, "failed", "string"],
    ["stage", { ...FAILED_OPEN, stage: 1 }, "failed", "number"],
    [
      "source",
      { ...FAILED_OPEN, source: "url" },
      "failed of stage open",
      "string",
    ],
    ["name", { ...FAILED_OPEN, name: null }, "failed of stage open", "null"],
    [
      "address",
      { ...FAILED_OPEN, address: 3 },
      "failed of stage open",
      "number",
    ],
    [
      "message",
      { ...FAILED_OPEN, message: null },
      "failed of stage open",
      "null",
    ],
    [
      "address",
      { ...FAILED_INIT, address: false },
      "failed of stage init",
      "boolean",
    ],
    [
      "message",
      { ...FAILED_MESSAGE, message: {} },
      "failed of stage message",
      "object",
    ],
  ])(
    "refuses the field %s of the wrong type",
    (field, message, messageKind, found) => {
      expect(validateFromProbe(message)).toMatchObject({
        ok: false,
        error: { kind: "wrongType", messageKind, field, found },
      });
    },
  );

  test.each([
    ["ready", READY, "initMs"],
    ["opened", OPENED, "ploidy"],
    ["failed", FAILED_OPEN, "stage"],
    ["failed of stage open", FAILED_OPEN, "source"],
    ["failed of stage open", FAILED_OPEN, "name"],
    ["failed of stage init", FAILED_INIT, "address"],
    ["failed of stage message", FAILED_MESSAGE, "message"],
  ])("refuses %s without the field %s", (messageKind, message, field) => {
    const lacking = Object.fromEntries(
      Object.entries(message).filter(([name]) => name !== field),
    );
    expect(validateFromProbe(lacking)).toEqual({
      ok: false,
      error: { kind: "missingFields", messageKind, fields: [field] },
    });
  });

  test.each([
    ["failed of stage init", { ...FAILED_INIT, source: "served" }, "source"],
    [
      "failed of stage message",
      { ...FAILED_MESSAGE, address: null },
      "address",
    ],
  ])(
    "refuses %s with the field %s of another stage",
    (messageKind, message, field) => {
      expect(validateFromProbe(message)).toEqual({
        ok: false,
        error: { kind: "extraFields", messageKind, fields: [field] },
      });
    },
  );

  test.each([
    ["ready", READY],
    ["opened", OPENED],
    ["failed of stage open", FAILED_OPEN],
  ])("refuses %s with a field it does not have", (messageKind, message) => {
    expect(validateFromProbe({ ...message, numVars: 1200 })).toEqual({
      ok: false,
      error: { kind: "extraFields", messageKind, fields: ["numVars"] },
    });
  });

  test("refuses a message of the other side", () => {
    expect(validateFromProbe({ kind: "openServed" })).toEqual({
      ok: false,
      error: {
        kind: "unknownKind",
        found: "openServed",
        expected: ["ready", "opened", "failed"],
      },
    });
  });

  test("refuses null", () => {
    expect(validateFromProbe(null)).toEqual({
      ok: false,
      error: { kind: "notObject", found: "null" },
    });
  });

  test("refuses a message whose only kind is inherited", () => {
    const inherited: unknown = Object.create({ kind: "ready" });
    expect(validateFromProbe(inherited)).toEqual({
      ok: false,
      error: { kind: "noKind" },
    });
  });
});

describe("validateToProbe", () => {
  test("accepts openServed", () => {
    expect(validateToProbe({ kind: "openServed" })).toEqual({
      ok: true,
      value: { kind: "openServed" },
    });
  });

  test("accepts openFile with the same File it was given", () => {
    const file = new File(["##fileformat=VCFv4.2\n"], "mine.vcf");
    const checked = validateToProbe({ kind: "openFile", file });
    expect(
      checked.ok && checked.value.kind === "openFile" && checked.value.file,
    ).toBe(file);
  });

  test("refuses a message of the other side", () => {
    expect(validateToProbe({ kind: "ready" })).toEqual({
      ok: false,
      error: {
        kind: "unknownKind",
        found: "ready",
        expected: ["openServed", "openFile"],
      },
    });
  });

  test("refuses openFile without its file", () => {
    expect(validateToProbe({ kind: "openFile" })).toEqual({
      ok: false,
      error: {
        kind: "missingFields",
        messageKind: "openFile",
        fields: ["file"],
      },
    });
  });

  test("refuses openFile whose file is the name of a file", () => {
    expect(validateToProbe({ kind: "openFile", file: "mine.vcf" })).toEqual({
      ok: false,
      error: {
        kind: "wrongType",
        messageKind: "openFile",
        field: "file",
        expected: "a File",
        found: "string",
      },
    });
  });

  test.each([
    ["openServed", { kind: "openServed" }],
    ["openFile", { kind: "openFile", file: new File([], "mine.vcf") }],
  ])("refuses %s with a field it does not have", (messageKind, message) => {
    expect(validateToProbe({ ...message, name: "mine.vcf" })).toEqual({
      ok: false,
      error: { kind: "extraFields", messageKind, fields: ["name"] },
    });
  });

  test.each([
    [
      "what is not an object",
      "openServed",
      { kind: "notObject", found: "string" },
    ],
    ["an array", [], { kind: "notObject", found: "array" }],
    ["a message with no kind", {}, { kind: "noKind" }],
    [
      "a kind that is null",
      { kind: null },
      { kind: "kindNotText", found: "null" },
    ],
    [
      "a kind that is a number",
      { kind: 1 },
      { kind: "kindNotText", found: "number" },
    ],
  ])("refuses %s", (_name, message, error) => {
    expect(validateToProbe(message)).toEqual({ ok: false, error });
  });
});

describe("describeMessageError", () => {
  test("names a missing kind without the word undefined", () => {
    expect(describeMessageError({ kind: "noKind" })).toBe(
      "A message between the probe's page and its worker has no kind.",
    );
  });

  test("names a kind that is not text by its type", () => {
    expect(describeMessageError({ kind: "kindNotText", found: "null" })).toBe(
      "A message between the probe's page and its worker has a kind that is null, not text.",
    );
  });

  test("names the field, the message, what it holds and what it should", () => {
    expect(
      describeMessageError({
        kind: "wrongType",
        messageKind: "opened",
        field: "ploidy",
        expected: "a number",
        found: "string",
      }),
    ).toBe("The field ploidy of the message opened is string, not a number.");
  });
});
