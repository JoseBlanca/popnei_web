/**
 * The words of Save project and Open project…, and the first three steps
 * of an opening (docs/specs/shell.md, "Saving" and "Opening"), with the
 * fixtures of the project file of core.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

import { POPGEN_ANALYSES } from "../../core/apps.ts";
import { readProjectFile } from "../../core/projectFile.ts";
import type { ProjectFileError } from "../../core/projectFile.ts";
import type { Project } from "../../core/project.ts";
import type { Result } from "../../core/result.ts";
import {
  handedText,
  notOpenedTitle,
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

/** `readProjectFile` with the population genetics application, as the
    saving of its page reads. */
function read(text: string): Result<Project, ProjectFileError> {
  return readProjectFile(text, "popgen", POPGEN_ANALYSES);
}

function fileOf(name: string, text: string): PickedFile {
  return new File([text], name);
}

describe("the words and the reading of Save project and Open project…", () => {
  test("a save is said handed to the browser, not saved", () => {
    expect(handedText("panel.popnei.json")).toBe(
      "panel.popnei.json was handed to the browser to download.",
    );
  });

  test("the heading of a project file refused names the file, escaped as core shows a name", () => {
    expect(notOpenedTitle("panel.popnei.json")).toBe(
      "panel.popnei.json was not opened",
    );
    expect(notOpenedTitle("a\nb.json")).toBe("a\\nb.json was not opened");
  });

  test("the question before an opening, and its sentence of the calculations in flight", () => {
    expect(
      openQuestion("panel.popnei.json", {
        calculating: false,
        writing: null,
        unsaved: null,
      }),
    ).toEqual({
      title: "Open panel.popnei.json?",
      text: "It replaces the project on the page, and an opening cannot be undone. To keep the project on the page, press Keep the current project and save it first.",
    });
    expect(
      openQuestion("panel.popnei.json", {
        calculating: true,
        writing: null,
        unsaved: null,
      }),
    ).toEqual({
      title: "Open panel.popnei.json?",
      text: "It replaces the project on the page, and an opening cannot be undone. To keep the project on the page, press Keep the current project and save it first. The ongoing calculations will be stopped.",
    });
  });

  test("the question before an opening names the file written and not saved, after the calculations", () => {
    expect(
      openQuestion("panel.popnei.json", {
        calculating: false,
        writing: null,
        unsaved: "panel.filtered.nei",
      }),
    ).toEqual({
      title: "Open panel.popnei.json?",
      text: "It replaces the project on the page, and an opening cannot be undone, and panel.filtered.nei, written and not saved, will be discarded. To keep them, press Keep the current project, then save the project with Save project and panel.filtered.nei in the Variants step.",
    });
    expect(
      openQuestion("panel.popnei.json", {
        calculating: true,
        writing: null,
        unsaved: "panel.filtered.nei",
      }),
    ).toEqual({
      title: "Open panel.popnei.json?",
      text: "It replaces the project on the page, and an opening cannot be undone, and panel.filtered.nei, written and not saved, will be discarded. To keep them, press Keep the current project, then save the project with Save project and panel.filtered.nei in the Variants step. The ongoing calculations will be stopped.",
    });
  });

  test("the question before an opening escapes the names that could change the text around them", () => {
    expect(
      openQuestion("pa\u202enel.popnei.json", {
        calculating: false,
        writing: "pa\u202enel.filtered.nei",
        unsaved: "pa\u202enel.filtered.nei",
      }),
    ).toEqual({
      title: "Open pa\\u202enel.popnei.json?",
      text: "It replaces the project on the page, and an opening cannot be undone, and pa\\u202enel.filtered.nei, written and not saved, will be discarded. To keep them, press Keep the current project, then save the project with Save project and pa\\u202enel.filtered.nei in the Variants step. The writing of pa\\u202enel.filtered.nei will be stopped.",
    });
  });

  test("the question before an opening names the writing under way, alone and with the calculations", () => {
    expect(
      openQuestion("panel.popnei.json", {
        calculating: false,
        writing: "panel.filtered.nei",
        unsaved: null,
      }),
    ).toEqual({
      title: "Open panel.popnei.json?",
      text: "It replaces the project on the page, and an opening cannot be undone. To keep the project on the page, press Keep the current project and save it first. The writing of panel.filtered.nei will be stopped.",
    });
    expect(
      openQuestion("panel.popnei.json", {
        calculating: true,
        writing: "panel.filtered.nei",
        unsaved: null,
      }),
    ).toEqual({
      title: "Open panel.popnei.json?",
      text: "It replaces the project on the page, and an opening cannot be undone. To keep the project on the page, press Keep the current project and save it first. The ongoing calculations and the writing of panel.filtered.nei will be stopped.",
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
    expect(await readPicked(big, read)).toEqual({
      kind: "refused",
      title: "notes.vcf was not opened",
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
    expect(await readPicked(gone, read)).toEqual({
      kind: "refused",
      title: "panel.popnei.json was not opened",
      text: "panel.popnei.json could not be read: It moved. Choose it again.",
    });
  });

  test("a text that is not JSON gives the text of notJson", async () => {
    expect(await readPicked(fileOf("notes.txt", "some notes"), read)).toEqual({
      kind: "refused",
      title: "notes.txt was not opened",
      text: "notes.txt cannot be opened as a project: it is not a project file, or it was cut short or changed outside the application. Open the .popnei.json file the application saved, or a copy of it.",
    });
  });

  test("a project file opens, and the opening says which variants file to give", async () => {
    const text = await readFile(
      join(FIXTURES, "v1-nei-diversity.popnei.json"),
      "utf8",
    );
    const picked = await readPicked(fileOf("panel.popnei.json", text), read);
    if (picked.kind !== "project") throw new Error(picked.text);
    expect(picked.project.variants).toBeNull();
    expect(openedText("panel.popnei.json", picked.project)).toMatch(
      /^Opened panel\.popnei\.json\. This project was made with .+\. Load it to run its analyses again\.$/,
    );
  });

  test("an opened project with no variants file is only said opened", async () => {
    const text = await readFile(join(FIXTURES, "v1-empty.popnei.json"), "utf8");
    const picked = await readPicked(fileOf("empty.popnei.json", text), read);
    if (picked.kind !== "project") throw new Error(picked.text);
    expect(openedText("empty.popnei.json", picked.project)).toBe(
      "Opened empty.popnei.json.",
    );
  });
});
