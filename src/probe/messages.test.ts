import { describe, expect, test } from "vitest";
import { validateFromProbe, validateToProbe } from "./messages.ts";

describe("validateFromProbe", () => {
  test("accepts ready with the version of popnei and the time of init", () => {
    const message = { kind: "ready", popneiVersion: "0.1.0", initMs: 42.5 };
    expect(validateFromProbe(message)).toEqual({ ok: true, value: message });
  });

  test("accepts opened with the individuals, the ploidy and the time", () => {
    const message = {
      kind: "opened",
      source: "file",
      name: "panel.vcf.gz",
      numIndividuals: 200,
      ploidy: 2,
      ploidyAssumed: true,
      openMs: 3,
    };
    expect(validateFromProbe(message)).toEqual({ ok: true, value: message });
  });

  test("accepts failed with an address and with none", () => {
    const withAddress = {
      kind: "failed",
      stage: "open",
      address: "/popnei_web/probe/panel.nei",
      message: "404 Not Found",
    };
    const withoutAddress = {
      kind: "failed",
      stage: "init",
      address: null,
      message: "WebAssembly.instantiate failed",
    };
    expect(validateFromProbe(withAddress)).toEqual({
      ok: true,
      value: withAddress,
    });
    expect(validateFromProbe(withoutAddress)).toEqual({
      ok: true,
      value: withoutAddress,
    });
  });

  test("refuses a message of another kind", () => {
    const checked = validateFromProbe({ kind: "openServed" });
    expect(checked).toEqual({
      ok: false,
      error:
        'a message from the probe\'s worker has the kind "openServed", not ready, opened or failed',
    });
  });

  test("refuses opened without its ploidy", () => {
    const checked = validateFromProbe({
      kind: "opened",
      source: "served",
      name: "panel.nei",
      numIndividuals: 200,
      ploidyAssumed: false,
      openMs: 3,
    });
    expect(checked).toEqual({
      ok: false,
      error: "the message opened lacks the field ploidy",
    });
  });

  test("refuses ready whose initMs is text", () => {
    const checked = validateFromProbe({
      kind: "ready",
      popneiVersion: "0.1.0",
      initMs: "42",
    });
    expect(checked).toEqual({
      ok: false,
      error: "the field initMs of ready is not a finite number of 0 or more",
    });
  });

  test("refuses opened with a field it does not have", () => {
    const checked = validateFromProbe({
      kind: "opened",
      source: "served",
      name: "panel.nei",
      numIndividuals: 200,
      ploidy: 2,
      ploidyAssumed: false,
      openMs: 3,
      numVars: 1200,
    });
    expect(checked).toEqual({
      ok: false,
      error: "the message opened has the unexpected field numVars",
    });
  });

  test("refuses opened whose number of individuals is not an integer", () => {
    const checked = validateFromProbe({
      kind: "opened",
      source: "served",
      name: "panel.nei",
      numIndividuals: 200.5,
      ploidy: 2,
      ploidyAssumed: false,
      openMs: 3,
    });
    expect(checked).toEqual({
      ok: false,
      error:
        "the field numIndividuals of opened is not an integer of 0 or more",
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

  test("refuses a message of another kind", () => {
    const checked = validateToProbe({ kind: "ready" });
    expect(checked).toEqual({
      ok: false,
      error:
        'a message to the probe\'s worker has the kind "ready", not openServed or openFile',
    });
  });

  test("refuses openFile without its file", () => {
    const checked = validateToProbe({ kind: "openFile" });
    expect(checked).toEqual({
      ok: false,
      error: "the message openFile lacks the field file",
    });
  });

  test("refuses openFile whose file is the name of a file", () => {
    const checked = validateToProbe({ kind: "openFile", file: "mine.vcf" });
    expect(checked).toEqual({
      ok: false,
      error: "the field file of openFile is not a File",
    });
  });

  test("refuses what is not an object", () => {
    const refusal = {
      ok: false,
      error: "a message to the probe's worker is not an object",
    };
    expect(validateToProbe(null)).toEqual(refusal);
    expect(validateToProbe("openServed")).toEqual(refusal);
  });
});
