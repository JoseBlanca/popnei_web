/**
 * The words of Save project and Open project…, and the first three steps
 * of an opening (docs/specs/shell.md, "Saving" and "Opening"), with the
 * fixtures of the project file of core.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { POPGEN_ANALYSES } from "../../core/apps.ts";
import {
  handedText,
  openQuestion,
  openedText,
  readPicked,
  unreadableText,
} from "./saveOpen.ts";
import type { PickedFile } from "./saveOpen.ts";

const FIXTURES = join(
  import.meta.dirname,
  "..",
  "..",
  "core",
  "fixtures",
  "projectFile",
);

function fileOf(name: string, text: string): PickedFile {
  return new File([text], name);
}

describe("the words and the reading of Save project and Open project…", () => {
  test("a save is said handed to the browser, not saved", () => {
    expect(handedText("panel.popnei.json")).toBe(
      "panel.popnei.json was handed to the browser to download.",
    );
  });

  test("the question before an opening, and its sentence of the calculations in flight", () => {
    expect(openQuestion("panel.popnei.json", false)).toEqual({
      title: "Open panel.popnei.json?",
      text: "It replaces the project on the page, and an opening cannot be undone. Save the project first to keep it.",
    });
    expect(openQuestion("panel.popnei.json", true)).toEqual({
      title: "Open panel.popnei.json?",
      text: "It replaces the project on the page, and an opening cannot be undone. Save the project first to keep it. The ongoing calculations will be stopped.",
    });
  });

  test("a file the browser cannot read, its message without its full stop", () => {
    expect(
      unreadableText(
        "panel.popnei.json",
        "The requested file could not be read.",
      ),
    ).toBe(
      "panel.popnei.json could not be read: The requested file could not be read. Choose it again.",
    );
  });

  test("a file above 64 MB is refused as tooLarge, and not read", async () => {
    const big: PickedFile = {
      name: "notes.vcf",
      size: 64 * 1024 * 1024 + 1,
      text: () => Promise.reject(new Error("read")),
    };
    expect(await readPicked(big, POPGEN_ANALYSES)).toEqual({
      kind: "refused",
      text: "notes.vcf cannot be opened as a project: it is larger than 64 MB, and a project file, which holds settings and no genotypes, is much smaller. Open the .popnei.json file the application saved.",
    });
  });

  test("a file the browser cannot read is told so", async () => {
    const gone: PickedFile = {
      name: "panel.popnei.json",
      size: 10,
      text: () =>
        Promise.reject(new DOMException("It moved.", "NotFoundError")),
    };
    expect(await readPicked(gone, POPGEN_ANALYSES)).toEqual({
      kind: "refused",
      text: "panel.popnei.json could not be read: It moved. Choose it again.",
    });
  });

  test("a text that is not JSON gives the text of notJson", async () => {
    expect(
      await readPicked(fileOf("notes.txt", "some notes"), POPGEN_ANALYSES),
    ).toEqual({
      kind: "refused",
      text: "notes.txt cannot be opened as a project: it is not a project file, or it was cut short or changed outside the application. Open the .popnei.json file the application saved, or a copy of it.",
    });
  });

  test("a project file opens, and the opening says which variants file to give", async () => {
    const text = await readFile(
      join(FIXTURES, "v1-nei-diversity.popnei.json"),
      "utf8",
    );
    const picked = await readPicked(
      fileOf("panel.popnei.json", text),
      POPGEN_ANALYSES,
    );
    if (picked.kind !== "project") throw new Error(picked.text);
    expect(picked.project.variants).toBeNull();
    expect(openedText("panel.popnei.json", picked.project)).toMatch(
      /^Opened panel\.popnei\.json\. This project was made with .+\. Load it in the Variants step to run its analyses again\.$/,
    );
  });

  test("an opened project with no variants file is only said opened", async () => {
    const text = await readFile(join(FIXTURES, "v1-empty.popnei.json"), "utf8");
    const picked = await readPicked(
      fileOf("empty.popnei.json", text),
      POPGEN_ANALYSES,
    );
    if (picked.kind !== "project") throw new Error(picked.text);
    expect(openedText("empty.popnei.json", picked.project)).toBe(
      "Opened empty.popnei.json.",
    );
  });
});
