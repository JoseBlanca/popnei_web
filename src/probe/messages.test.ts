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
const FAILED = {
  kind: "failed",
  stage: "open",
  address: "/popnei_web/probe/panel.nei",
  message: "404 Not Found",
};

describe("validateFromProbe", () => {
  test.each([
    ["ready", READY],
    ["opened", OPENED],
    ["failed with an address", FAILED],
    ["failed with no address", { ...FAILED, stage: "init", address: null }],
  ])("accepts %s", (_name, message) => {
    expect(validateFromProbe(message)).toEqual({ ok: true, value: message });
  });

  test.each([
    ["popneiVersion", { ...READY, popneiVersion: 1 }, "number"],
    ["initMs", { ...READY, initMs: "42" }, "string"],
    ["source", { ...OPENED, source: "url" }, "string"],
    ["name", { ...OPENED, name: 1 }, "number"],
    ["numIndividuals", { ...OPENED, numIndividuals: "200" }, "string"],
    ["ploidy", { ...OPENED, ploidy: null }, "null"],
    ["ploidyAssumed", { ...OPENED, ploidyAssumed: "yes" }, "string"],
    ["openMs", { ...OPENED, openMs: [3] }, "array"],
    ["stage", { ...FAILED, stage: "load" }, "string"],
    ["address", { ...FAILED, address: 3 }, "number"],
    ["message", { ...FAILED, message: null }, "null"],
  ])("refuses the field %s of the wrong type", (field, message, found) => {
    expect(validateFromProbe(message)).toMatchObject({
      ok: false,
      error: { kind: "wrongType", messageKind: message.kind, field, found },
    });
  });

  test.each([
    ["ready", READY, "initMs"],
    ["opened", OPENED, "ploidy"],
    ["failed", FAILED, "address"],
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
    ["ready", READY],
    ["opened", OPENED],
    ["failed", FAILED],
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
