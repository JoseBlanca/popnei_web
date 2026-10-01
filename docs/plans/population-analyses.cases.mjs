// Joins the parts of the map of the cases of stage 5 into
// docs/plans/population-analyses.cases.md (deliverable 3 of work package 9
// of docs/plans/population-analyses.md). The parts, one per spec, are the
// Markdown files of docs/plans/population-analyses.cases/, joined in the
// order of their names after head.md. A part names a test by its file and
// its title, which later commits do not move, and this script finds the
// line the test is at now, so that running it again after any commit gives
// the right lines: the map of stage 4 was written with line numbers, and
// 182 of its 2,438 had moved before it was committed.
//
//   node docs/plans/population-analyses.cases.mjs          writes the map
//   node docs/plans/population-analyses.cases.mjs --check  writes nothing,
//       and exits 1 when the map on disk is not what it would write
//
// It exits 1, and writes nothing, when a part names a test that is not in
// its file, or that is there twice, or a passage of a spec that is not
// there once; it prints each with its part and its line.
//
// What a part holds:
//
//   <!-- spec: docs/specs/core/project.md -->   the spec it maps
//   <!-- heading: The project -->               its heading in the map
//   <!-- row: the project -->                   its name in the summary
//   <!-- sections: "How it is verified" -->     the sections it maps
//   <!-- file prj: src/core/project.test.ts --> a short name of a test file
//
// and then prose and tables. A table whose first header cell is "item" is
// a table of items, one a row, with the cells item, test and note. An item
// whose test cell is "none", or starts with "in part:", is not reached, and
// is listed again in "Left without a test" with its note as the reason.
// In any line of a part:
//
//   {{prj: a describe > the title of a test}}   a test of the file `prj`,
//       written out as `prj:5457` "the title of a test". The title is the
//       first argument of describe, it or test, of their .each and of
//       Playwright's test.describe; "…" stands for any text, so a long
//       title can be cut; the titles before a ">" are of the blocks the
//       test is in, and are needed only when two tests share a title.
//   {{+prj: the title of a test}}               the same, of a test written
//       for the map, marked "added" and counted.
//   {{@ words of the spec}}                     the line of the spec where
//       those words start, written out as (1946); line breaks and runs of
//       spaces in the spec count as one space.
//
// head.md has {{summary}} where the table of the specs goes, and {{items}},
// {{reached}}, {{left}}, {{tests}} and {{added}} for the totals.

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const plans = dirname(fileURLToPath(import.meta.url));
const root = join(plans, "..", "..");
const partsDir = join(plans, "population-analyses.cases");
const mapPath = join(plans, "population-analyses.cases.md");

/** What went wrong, each with its part and line; none when the map is whole. */
const problems = [];

const oneSpace = (text) => text.replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------
// The tests of a file: the line, the title and the blocks of each call of
// describe, it and test that starts a line, as Prettier leaves them.

const ESCAPES = { n: "\n", t: "\t", r: "\r", 0: "\0", b: "\b", f: "\f" };

/** The text of the string literal that starts at `at`, and where it ends;
    null when no literal starts there. A template is kept as written, with
    its ${…}. */
function literalAt(source, at) {
  const quote = source[at];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  let text = "";
  let i = at + 1;
  while (i < source.length && source[i] !== quote) {
    const char = source[i];
    if (char === "\\") {
      const next = source[i + 1];
      if (next === "u" && source[i + 2] === "{") {
        const close = source.indexOf("}", i);
        text += String.fromCodePoint(parseInt(source.slice(i + 3, close), 16));
        i = close + 1;
      } else if (next === "u") {
        text += String.fromCharCode(parseInt(source.slice(i + 2, i + 6), 16));
        i += 6;
      } else if (next === "x") {
        text += String.fromCharCode(parseInt(source.slice(i + 2, i + 4), 16));
        i += 4;
      } else {
        text += ESCAPES[next] ?? next;
        i += 2;
      }
    } else if (quote === "`" && char === "$" && source[i + 1] === "{") {
      const close = closeOf(source, i + 1);
      text += source.slice(i, close + 1);
      i = close + 1;
    } else {
      text += char;
      i += 1;
    }
  }
  return { text, end: i + 1 };
}

/** The place of the bracket that closes the one at `open`, past the
    strings between them. */
function closeOf(source, open) {
  const pairs = { "(": ")", "[": "]", "{": "}" };
  const stack = [pairs[source[open]]];
  let i = open + 1;
  while (i < source.length && stack.length > 0) {
    const char = source[i];
    const literal = literalAt(source, i);
    if (literal !== null) {
      i = literal.end;
      continue;
    }
    if (char in pairs) stack.push(pairs[char]);
    else if (char === stack.at(-1)) stack.pop();
    i += 1;
  }
  return i - 1;
}

const skipSpace = (source, at) => {
  let i = at;
  while (/\s/.test(source[i] ?? "")) i += 1;
  return i;
};

/** The title a call gives, from just after its callee: past the table of
    an .each, the string literals joined by +; null when the first argument
    is no string, as of test.use({ … }) and test.beforeEach(async …). */
function titleAt(source, at, isEach) {
  let i = skipSpace(source, at);
  if (isEach) {
    // The types of the rows, test.each<[string, number]>([ … ]).
    if (source[i] === "<") {
      let depth = 0;
      do {
        if (source[i] === "<") depth += 1;
        else if (source[i] === ">") depth -= 1;
        i += 1;
      } while (depth > 0 && i < source.length);
      i = skipSpace(source, i);
    }
    if (source[i] === "`") i = literalAt(source, i).end;
    else if (source[i] === "(") i = closeOf(source, i) + 1;
    else return null;
    i = skipSpace(source, i);
  }
  if (source[i] !== "(") return null;
  i = skipSpace(source, i + 1);
  let title = null;
  for (;;) {
    const literal = literalAt(source, i);
    if (literal === null) return title;
    title = (title ?? "") + literal.text;
    i = skipSpace(source, literal.end);
    if (source[i] !== "+") return title;
    i = skipSpace(source, i + 1);
  }
}

const testsByFile = new Map();

/** Every describe, it and test of a file, with the titles of the blocks
    it is in, found by the indentation. */
function testsOf(file) {
  const known = testsByFile.get(file);
  if (known !== undefined) return known;
  const source = readFileSync(join(root, file), "utf8");
  const calls = [];
  const open = []; // the blocks the line is in, each with its indentation
  // A test under another name, as `import { test as withAxe }` of the
  // flows that run axe, is a test too.
  const callees = ["describe", "it", "test"];
  for (const [, alias] of source.matchAll(/\btest as (\w+)/g))
    callees.push(alias);
  const start = new RegExp(
    `^([ \\t]*)(${callees.join("|")})((?:\\.\\w+)*)[ \\t]*(?=[(<\`])`,
    "gm",
  );
  for (const match of source.matchAll(start)) {
    const [whole, indentation, callee, chain] = match;
    const title = titleAt(
      source,
      match.index + whole.length,
      chain.split(".").includes("each"),
    );
    if (title === null) continue;
    const indent = indentation.length;
    while (open.length > 0 && open.at(-1).indent >= indent) open.pop();
    const line = source.slice(0, match.index).split("\n").length;
    calls.push({
      line,
      title: oneSpace(title),
      blocks: open.map((block) => block.title),
    });
    const isBlock = callee === "describe" || chain.includes(".describe");
    if (isBlock) open.push({ indent, title: oneSpace(title) });
  }
  testsByFile.set(file, calls);
  return calls;
}

/** Whether a title is the one a part wrote, where "…" is any text. */
function matches(title, written) {
  const pieces = written.split("…").map((piece) => piece.trim());
  if (pieces.length === 1) return title === pieces[0];
  if (!title.startsWith(pieces[0])) return false;
  let from = pieces[0].length;
  for (const piece of pieces.slice(1, -1)) {
    const found = title.indexOf(piece, from);
    if (found === -1) return false;
    from = found + piece.length;
  }
  const last = pieces.at(-1);
  return title.length - last.length >= from && title.endsWith(last);
}

/** The one test of `file` that `written` names, "a block > a title". */
function findTest(file, written) {
  const path = written.split(" > ").map(oneSpace);
  const title = path.pop();
  const found = testsOf(file).filter((call) => {
    if (!matches(call.title, title)) return false;
    let from = 0;
    for (const block of path) {
      const at = call.blocks.findIndex(
        (name, index) => index >= from && matches(name, block),
      );
      if (at === -1) return false;
      from = at + 1;
    }
    return true;
  });
  return { found, title };
}

// ---------------------------------------------------------------------
// A passage of a spec: the line where it starts.

const specs = new Map();

function specOf(file) {
  const known = specs.get(file);
  if (known !== undefined) return known;
  const source = readFileSync(join(root, file), "utf8");
  // The text with one space for each run of white space, and for each of
  // its characters the line it came from.
  let text = "";
  const lines = [];
  let line = 1;
  let spaced = true;
  for (const char of source) {
    if (/\s/.test(char)) {
      if (!spaced) {
        text += " ";
        lines.push(line);
        spaced = true;
      }
    } else {
      text += char;
      lines.push(line);
      spaced = false;
    }
    if (char === "\n") line += 1;
  }
  const spec = { text, lines };
  specs.set(file, spec);
  return spec;
}

// ---------------------------------------------------------------------
// The parts.

const DIRECTIVE =
  /^<!--\s*(spec|heading|row|sections|file\s+\S+):\s*(.*?)\s*-->$/;
const REFERENCE = /\{\{(\+?)([@\w]+):?\s([^]*?)\}\}/g;
const cellsOf = (row) =>
  row
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());

function readPart(name) {
  const where = `population-analyses.cases/${name}`;
  const part = {
    name,
    files: new Map(),
    body: [],
    items: 0,
    left: [],
    tests: new Set(),
    added: new Set(),
  };
  const lines = readFileSync(join(partsDir, name), "utf8").split("\n");
  let inItems = false;
  lines.forEach((written, index) => {
    const at = `${where}, line ${index + 1}`;
    const directive = DIRECTIVE.exec(written);
    if (directive !== null) {
      const [, key, value] = directive;
      if (key.startsWith("file")) {
        const file = value;
        if (!existsSync(join(root, file)))
          problems.push(`${at}: no file ${file}`);
        part.files.set(key.split(/\s+/)[1], file);
      } else part[key] = value;
      return;
    }
    const line = written.replace(REFERENCE, (whole, plus, short, words) => {
      if (short === "@") {
        if (part.spec === undefined) {
          problems.push(`${at}: a passage of a spec before the spec is named`);
          return whole;
        }
        const { text, lines: lineOf } = specOf(part.spec);
        const passage = oneSpace(words);
        const first = text.indexOf(passage);
        if (first === -1) {
          problems.push(`${at}: not in ${part.spec}: "${passage}"`);
          return whole;
        }
        if (text.indexOf(passage, first + 1) !== -1) {
          problems.push(`${at}: more than once in ${part.spec}: "${passage}"`);
          return whole;
        }
        return `(${lineOf[first]})`;
      }
      const file = part.files.get(short);
      if (file === undefined) {
        problems.push(`${at}: no test file is named "${short}"`);
        return whole;
      }
      if (!existsSync(join(root, file))) return whole;
      const { found, title } = findTest(file, words);
      if (found.length !== 1) {
        const lines = found.map((call) => call.line).join(" and ");
        problems.push(
          found.length === 0
            ? `${at}: no test of ${file} has the title "${oneSpace(words)}"`
            : `${at}: ${found.length} tests of ${file}, at lines ${lines}, have the title "${oneSpace(words)}"`,
        );
        return whole;
      }
      const test = `${file}:${found[0].line}`;
      part.tests.add(test);
      if (plus === "+") part.added.add(test);
      const mark = plus === "+" ? ", added" : "";
      return `\`${short}:${found[0].line}\` "${title.replaceAll("|", "\\|")}"${mark}`;
    });
    if (!line.trim().startsWith("|")) inItems = false;
    else {
      const cells = cellsOf(line);
      if (cells[0] === "item") inItems = true;
      else if (inItems && !/^:?-+:?$/.test(cells[0])) {
        part.items += 1;
        if (cells.length !== 3)
          problems.push(
            `${at}: a row of items has ${cells.length} cells, not 3`,
          );
        const test = cells[1] ?? "";
        if (test === "none" || test.startsWith("in part:"))
          part.left.push({ item: cells[0], note: cells[2] ?? "" });
        else if (!/`\w+:\d+`/.test(test) && !test.includes("{{"))
          problems.push(`${at}: an item with no test, and not marked "none"`);
      }
    }
    part.body.push(line);
  });
  for (const key of ["spec", "heading", "row", "sections"])
    if (part[key] === undefined)
      problems.push(`${where}: no <!-- ${key}: … --> line`);
  if (part.spec !== undefined && !existsSync(join(root, part.spec)))
    problems.push(`${where}: no spec ${part.spec}`);
  return part;
}

function writePart(part) {
  const reached = part.items - part.left.length;
  const names = [...part.files]
    .map(([short, file]) => `\`${short}:\` for \`${file}\``)
    .join("; ");
  const body = part.body.join("\n").trim();
  return [
    `## ${part.heading}`,
    "",
    `\`${part.spec}\`, ${part.sections}: ${count(part.items, "item")}, ${reached} with a test that reaches all of it.`,
    ...(names === ""
      ? []
      : [
          "",
          `The tests are named by these short names of their files: ${names}.`,
        ]),
    "",
    body,
  ].join("\n");
}

const count = (n, noun) => `${n} ${noun}${n === 1 ? "" : "s"}`;

const names = readdirSync(partsDir)
  .filter((name) => name.endsWith(".md") && name !== "head.md")
  .sort();
const parts = names.map(readPart);

const total = (of) => parts.reduce((sum, part) => sum + of(part), 0);
const items = total((part) => part.items);
const left = total((part) => part.left.length);
const tests = new Set(parts.flatMap((part) => [...part.tests]));
const added = new Set(parts.flatMap((part) => [...part.added]));

const summary = [
  "| spec | items | reached |",
  "|---|---|---|",
  ...parts.map(
    (part) =>
      `| ${part.row}, \`${part.spec}\` | ${part.items} | ${part.items - part.left.length} |`,
  ),
  `| all | ${items} | ${items - left} |`,
].join("\n");

const leftRows = parts.flatMap((part) =>
  part.left.map(({ item, note }) => `| ${part.row} | ${item} | ${note} |`),
);
const leftSection = [
  "## Left without a test",
  "",
  ...(leftRows.length === 0
    ? ["No item is left without a test."]
    : [
        "Each is in the table of its spec above, where its row says what a test reaches of it.",
        "",
        "| spec | item | reason |",
        "|---|---|---|",
        ...leftRows,
      ]),
].join("\n");

const totals = {
  summary,
  items: String(items),
  reached: String(items - left),
  left: String(left),
  tests: String(tests.size),
  added: String(added.size),
};
const head = readFileSync(join(partsDir, "head.md"), "utf8")
  .trim()
  .replace(/\{\{(\w+)\}\}/g, (whole, key) => totals[key] ?? whole);

const map = [head, ...parts.map(writePart), leftSection].join("\n\n") + "\n";

if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error(
    `${count(problems.length, "problem")}: docs/plans/population-analyses.cases.md is not written.`,
  );
  process.exit(1);
}

for (const part of parts)
  console.log(
    `${part.name}: ${count(part.items, "item")}, ${part.items - part.left.length} reached, ${count(part.tests.size, "test")}, ${part.added.size} added`,
  );
console.log(
  `all: ${count(parts.length, "part")}, ${count(items, "item")}, ${items - left} reached, ${left} left without a test, ${count(tests.size, "test")} cited, ${added.size} added`,
);

if (process.argv.includes("--check")) {
  const onDisk = existsSync(mapPath) ? readFileSync(mapPath, "utf8") : "";
  if (onDisk !== map) {
    console.error(
      "docs/plans/population-analyses.cases.md is not what the parts and the tests give now: run this script without --check.",
    );
    process.exit(1);
  }
  console.log("docs/plans/population-analyses.cases.md is up to date.");
} else {
  writeFileSync(mapPath, map);
  console.log("wrote docs/plans/population-analyses.cases.md");
}
