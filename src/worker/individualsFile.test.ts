import { describe, expect, test } from "vitest";
import type { CsvOptions } from "./protocol.ts";
import type { IndividualsFileRead } from "./messages.ts";
import {
  MAX_INDIVIDUALS_FILE_BYTES,
  readIndividualsFile,
} from "./individualsFile.ts";
import type { BytesSource } from "./individualsFile.ts";

const AUTO: CsvOptions = {
  encoding: "auto",
  separator: "auto",
  decimal: "auto",
};

/** The Spanish Excel file of the reader spec, with `\r\n`. */
const SPANISH_LINES = [
  "Individuo;Población;Altura",
  "ind_001;España;1,75",
  "ind_002;Italia;1,82",
  "ind_003;Perú;1,69",
  "ind_004;España;1,71",
];

/** What each encoding of the Spanish file gives. */
const SPANISH_READ: IndividualsFileRead = {
  kind: "read",
  table: {
    columns: ["Individuo", "Población", "Altura"],
    rows: [
      ["ind_001", "España", "1,75"],
      ["ind_002", "Italia", "1,82"],
      ["ind_003", "Perú", "1,69"],
      ["ind_004", "España", "1,71"],
    ],
  },
  columns: [
    { kind: "identifier" },
    { kind: "categorical" },
    { kind: "continuous" },
  ],
  found: {
    encoding: "windows-1252",
    separator: ";",
    decimal: ",",
    undecodedLine: null,
  },
};

/** The same, as found in a file of another encoding. */
function spanishRead(
  encoding: "utf-8" | "windows-1252" | "utf-16",
): IndividualsFileRead {
  if (SPANISH_READ.kind !== "read") throw new Error("not a read");
  return { ...SPANISH_READ, found: { ...SPANISH_READ.found, encoding } };
}

/** One byte per character: the characters of the Spanish file are all
    below 256, where Windows-1252 and Latin-1 are one. */
function singleBytes(text: string): number[] {
  return Array.from(text, (character) => {
    const code = character.charCodeAt(0);
    if (code > 0xff) throw new Error(`not one byte: ${character}`);
    return code;
  });
}

/** Two bytes per character, little or big endian. */
function doubleBytes(text: string, littleEndian: boolean): number[] {
  return Array.from(text).flatMap((character) => {
    const code = character.charCodeAt(0);
    const low = code & 0xff;
    const high = code >> 8;
    return littleEndian ? [low, high] : [high, low];
  });
}

const SPANISH_TEXT = SPANISH_LINES.join("\r\n") + "\r\n";

function blobOf(bytes: readonly number[]): Blob {
  return new Blob([new Uint8Array(bytes)]);
}

describe("WS4 D3 the bytes", () => {
  test("the Spanish file in Windows-1252 is found Windows-1252, ; and the decimal comma", async () => {
    const bytes = singleBytes(SPANISH_TEXT);
    // ó of Población is the byte F3, and ñ of España F1.
    expect(bytes[17]).toBe(0xf3);
    expect(bytes).toContain(0xf1);
    expect(await readIndividualsFile(blobOf(bytes), AUTO)).toEqual(
      SPANISH_READ,
    );
  });

  test("the same file in UTF-8 with its BOM is found UTF-8, the same table", async () => {
    const bytes = [0xef, 0xbb, 0xbf, ...new TextEncoder().encode(SPANISH_TEXT)];
    expect(await readIndividualsFile(blobOf(bytes), AUTO)).toEqual(
      spanishRead("utf-8"),
    );
  });

  test("the Windows-1252 file with the encoding set to UTF-8 has the replacement character", async () => {
    const read = await readIndividualsFile(blobOf(singleBytes(SPANISH_TEXT)), {
      ...AUTO,
      encoding: "utf-8",
    });
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found.encoding).toBe("utf-8");
    expect(read.table.columns).toEqual(["Individuo", "Poblaci�n", "Altura"]);
    expect(read.table.rows[0]).toEqual(["ind_001", "Espa�a", "1,75"]);
    expect(read.found.undecodedLine).toBe(1);
  });

  test("the file in UTF-16 little endian, FF FE, is found UTF-16, the same table", async () => {
    const bytes = [0xff, 0xfe, ...doubleBytes(SPANISH_TEXT, true)];
    expect(await readIndividualsFile(blobOf(bytes), AUTO)).toEqual(
      spanishRead("utf-16"),
    );
  });

  test("the file in UTF-16 big endian, FE FF, is found UTF-16, the same table", async () => {
    const bytes = [0xfe, 0xff, ...doubleBytes(SPANISH_TEXT, false)];
    expect(await readIndividualsFile(blobOf(bytes), AUTO)).toEqual(
      spanishRead("utf-16"),
    );
  });

  test("UTF-16 little endian is read so with the encoding set to Windows-1252", async () => {
    const bytes = [0xff, 0xfe, ...doubleBytes(SPANISH_TEXT, true)];
    expect(
      await readIndividualsFile(blobOf(bytes), {
        ...AUTO,
        encoding: "windows-1252",
      }),
    ).toEqual(spanishRead("utf-16"));
  });

  test("UTF-16 big endian is read so with the encoding set to Windows-1252", async () => {
    const bytes = [0xfe, 0xff, ...doubleBytes(SPANISH_TEXT, false)];
    expect(
      await readIndividualsFile(blobOf(bytes), {
        ...AUTO,
        encoding: "windows-1252",
      }),
    ).toEqual(spanishRead("utf-16"));
  });

  test("the start of a zip, an xlsx, PK 03 04 with a byte 0, is notText", async () => {
    const bytes = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00];
    expect(await readIndividualsFile(blobOf(bytes), AUTO)).toEqual({
      kind: "failed",
      error: { kind: "notText" },
    });
  });

  test("a text with one byte 0 near its end is notText", async () => {
    const bytes = [...singleBytes("id,pop\nA,P1\nB,P2"), 0x00, 0x0a];
    expect(await readIndividualsFile(blobOf(bytes), AUTO)).toEqual({
      kind: "failed",
      error: { kind: "notText" },
    });
  });

  test("a file of 20,000,001 bytes is tooLarge, and its bytes are never asked for", async () => {
    let calls = 0;
    const source: BytesSource = {
      size: 20_000_001,
      arrayBuffer: () => {
        calls += 1;
        return Promise.resolve(new ArrayBuffer(0));
      },
    };
    expect(await readIndividualsFile(source, AUTO)).toEqual({
      kind: "failed",
      error: { kind: "tooLarge", size: 20_000_001, max: 20_000_000 },
    });
    expect(calls).toBe(0);
    expect(MAX_INDIVIDUALS_FILE_BYTES).toBe(20_000_000);
  });

  test("a file the browser cannot read is unreadable, with its message", async () => {
    const source: BytesSource = {
      size: 10,
      arrayBuffer: () =>
        Promise.reject(
          new DOMException("the file changed", "NotReadableError"),
        ),
    };
    expect(await readIndividualsFile(source, AUTO)).toEqual({
      kind: "failed",
      error: {
        kind: "unreadable",
        message: "NotReadableError: the file changed",
      },
    });
  });

  test("the name of the browser's error is kept when its message is empty", async () => {
    const source: BytesSource = {
      size: 10,
      arrayBuffer: () =>
        Promise.reject(new DOMException("", "NotReadableError")),
    };
    expect(await readIndividualsFile(source, AUTO)).toEqual({
      kind: "failed",
      error: { kind: "unreadable", message: "NotReadableError" },
    });
  });

  test("a deleted file, NotFoundError, is told from a changed one by its name", async () => {
    const source: BytesSource = {
      size: 10,
      arrayBuffer: () =>
        Promise.reject(new DOMException("gone", "NotFoundError")),
    };
    expect(await readIndividualsFile(source, AUTO)).toEqual({
      kind: "failed",
      error: { kind: "unreadable", message: "NotFoundError: gone" },
    });
  });

  test("a file of 20,000,000 bytes is not too large", async () => {
    const source: BytesSource = {
      size: 20_000_000,
      arrayBuffer: () =>
        Promise.resolve(new Uint8Array(singleBytes("id,pop\nA,P1\n")).buffer),
    };
    const read = await readIndividualsFile(source, AUTO);
    expect(read.kind).toBe("read");
  });

  test("a file of ASCII alone is found UTF-8", async () => {
    const read = await readIndividualsFile(
      blobOf(singleBytes("id,pop\nA,P1\n")),
      AUTO,
    );
    expect(read).toEqual({
      kind: "read",
      table: { columns: ["id", "pop"], rows: [["A", "P1"]] },
      columns: [{ kind: "identifier" }, { kind: "categorical" }],
      found: {
        encoding: "utf-8",
        separator: ",",
        decimal: ".",
        undecodedLine: null,
      },
    });
  });

  test("the BOM of UTF-8 is removed with the encoding set to Windows-1252", async () => {
    const bytes = [0xef, 0xbb, 0xbf, ...singleBytes("id,pop\nA,P1\n")];
    const read = await readIndividualsFile(blobOf(bytes), {
      encoding: "windows-1252",
      separator: ",",
      decimal: ".",
    });
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.table.columns).toEqual(["id", "pop"]);
    expect(read.found).toEqual({
      encoding: "windows-1252",
      separator: ",",
      decimal: ".",
      undecodedLine: null,
    });
  });

  test("a refusal of the reader of the text is the failed read", async () => {
    expect(
      await readIndividualsFile(blobOf(singleBytes("id,pop\n")), AUTO),
    ).toEqual({ kind: "failed", error: { kind: "empty" } });
  });

  test("a byte 0 after the first 10,000 bytes is notText", async () => {
    const text = "id,pop\n" + "A,P1\n".repeat(2_500);
    const bytes = [...singleBytes(text), 0x00, 0x0a];
    expect(bytes.length).toBeGreaterThan(10_000);
    expect(await readIndividualsFile(blobOf(bytes), AUTO)).toEqual({
      kind: "failed",
      error: { kind: "notText" },
    });
  });

  test("a first byte EF that is not the BOM of UTF-8 is kept, as the ï of Windows-1252", async () => {
    const read = await readIndividualsFile(
      blobOf(singleBytes("ïdent,pop\nA,P1\n")),
      AUTO,
    );
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found.encoding).toBe("windows-1252");
    expect(read.table.columns).toEqual(["ïdent", "pop"]);
  });
});

describe("WS4 D3 the owner's decisions of 25 September on the bytes", () => {
  const encode = (text: string): number[] => [
    ...new TextEncoder().encode(text),
  ];

  test("with auto, the BOM of UTF-8 decides UTF-8: a bad byte on line 3 is � and its line is found", async () => {
    const bytes = [
      0xef,
      0xbb,
      0xbf,
      ...encode(
        "Individuo;Población;Altura\r\nind_001;España;1,75\r\nind_002;Ita",
      ),
      0xff,
      ...encode("lia;1,82\r\nind_003;Perú;1,69\r\nind_004;España;1,71\r\n"),
    ];
    const read = await readIndividualsFile(blobOf(bytes), AUTO);
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found).toEqual({
      encoding: "utf-8",
      separator: ";",
      decimal: ",",
      undecodedLine: 3,
    });
    expect(read.table.rows[0]).toEqual(["ind_001", "España", "1,75"]);
    expect(read.table.rows[1]).toEqual(["ind_002", "Ita�lia", "1,82"]);
  });

  test("the line of a character not decoded counts the lines as the reader does, \\r alone among them", async () => {
    const bytes = [
      ...singleBytes("id,pop\rA,P1\r\n\nB,P"),
      0xff,
      ...singleBytes("2\n"),
    ];
    const read = await readIndividualsFile(blobOf(bytes), {
      ...AUTO,
      encoding: "utf-8",
    });
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found.undecodedLine).toBe(4);
  });

  test("half of a character of UTF-16 in the middle of the file is not decoded, on its line", async () => {
    const bytes = [
      0xff,
      0xfe,
      ...doubleBytes("id,pop\r\nA,P1\r\n", true),
      0x3d,
      0xd8,
      ...doubleBytes("B,P2\r\n", true),
    ];
    const read = await readIndividualsFile(blobOf(bytes), AUTO);
    if (read.kind !== "read") throw new Error("the read failed");
    expect(read.found.encoding).toBe("utf-16");
    expect(read.found.undecodedLine).toBe(3);
  });

  test("a UTF-16 file with one byte more is cutShort, little and big endian", async () => {
    const little = [0xff, 0xfe, ...doubleBytes(SPANISH_TEXT, true), 0x41];
    const big = [0xfe, 0xff, ...doubleBytes(SPANISH_TEXT, false), 0x00];
    for (const bytes of [little, big]) {
      expect(await readIndividualsFile(blobOf(bytes), AUTO)).toEqual({
        kind: "failed",
        error: { kind: "cutShort" },
      });
    }
  });

  test("a UTF-16 file whose last character is the first half of one written in four is cutShort", async () => {
    const little = [0xff, 0xfe, ...doubleBytes(SPANISH_TEXT, true), 0x3d, 0xd8];
    const big = [0xfe, 0xff, ...doubleBytes(SPANISH_TEXT, false), 0xd8, 0x3d];
    for (const bytes of [little, big]) {
      expect(await readIndividualsFile(blobOf(bytes), AUTO)).toEqual({
        kind: "failed",
        error: { kind: "cutShort" },
      });
    }
  });
});
