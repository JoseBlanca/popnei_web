# popnei_web: how the assistant works here

popnei_web is the two static web applications of popnei, population
genetics and association, which run popnei in the browser tab through its
wasm package. What they do is in `docs/functionality.md`, what they are
built with and why in `docs/technology.md`, and their parts and how a
change of the user reaches the results in `docs/architecture.md`. popnei
itself is at `/Users/jose/devel/popnei`, and its `CLAUDE.md` and `docs/`
hold the library the applications call.

The owner is a population geneticist who programs in Python and Rust and
has not built a web application. So a problem of the web is for the
assistant to catch, and when one reaches the owner it is said as what a
user would see or be unable to do.

The skills are under `.claude/skills/` and the subagents under
`.claude/agents/`. The `writing` skill is read before anything a person
will read is written, the text of the applications included, and a
document, a spec or a GitHub issue goes to the `first-reader` subagent
before it is handed over. What the applications do is in `docs/functionality.md`, and what their
users come to do in `docs/use-cases.md`. Since 5 October 2026 they are
built in small pieces, each tried by the owner in the running
application before the next, as the `building` skill says: the owner
and the session decide the piece; the session writes its short plan,
sends the implementation, the code review and the fixes to subagents,
looks at the screen, and reports; it stops for the owner only in the
cases that skill lists. A piece that skill calls complex gets a design,
a spec and a plan first, as the `designing`, `writing-specs` and
`writing-plans` skills say, approved by the owner before its code. The
code follows the `coding` skill.

A session that writes anything in the repository, a spec, a plan, a skill
or code, works in a git worktree and a branch of its own, under
`.claude/worktrees/` of `/Users/jose/devel/popnei_web`, which it makes
before its first edit: two sessions that edit the main checkout at once
leave their changes mixed in the same files, as happened in popnei on 21
September 2026. A piece is built the same way, as the `building` skill says. Nothing is merged into `main`, and
nothing is pushed, without the owner's order.

## popnei in the application

The application takes the wasm package of popnei from a GitHub Release of
popnei, named by its URL in `package.json`, and a newer popnei is a new
tag there and a new URL here (`docs/technology.md`, section 5). While the
two are changed together, the application may use the local build of
popnei, packed with `npm pack` in `popnei/js/popnei` and installed with
`npm install --no-save <absolute path of the .tgz>`, which changes neither
`package.json` nor the lockfile and is never committed: what is committed,
and what the site is built from, is always a release. Over an installed
popnei of the same version that install leaves the old package in place,
and the build keeps the old wasm, as the plan of stage 4 found on 28
September 2026 with `js-v0.1.0-dev.3` over `dev.2`, both "0.1.0"; so
`node_modules/popnei` is removed first, or `npm ci` run, before it. A
development server that was running keeps the old popnei's JavaScript in
its cache, `node_modules/.vite`, beside the new wasm, so the calculation
worker stops on the first call ("wasm.default_ploidy is not a function",
seen by the owner on 6 October 2026); it is started again with
`npm run dev -- --force`, and the owner is told so whenever popnei is
installed under a server they may have running. A
link, `npm link`
or `"file:../popnei/js/popnei"`, does not do: the development server
refuses to serve popnei's `.wasm` through it, "403 Forbidden", and
`../popnei` names no folder from a worktree, as the specs of stage 4 found
on 28 September 2026. The same holds for xlsx_rs. A session that needs something popnei does not have
says so and does not work around it in the application, because the
numbers of the applications are popnei's, verified there.

## A screen is seen, not only tested

A change to what a screen shows or does is checked in a running browser,
by opening the page and going through the states it touches, as
`.claude/skills/coding/testing.md` says, and not only by its tests. A test
checks what it was written to check; a screen can pass every test and
still show a field under another one, a warning nobody can read, or a
button that the keyboard cannot reach. A reply or a pull request says
which browsers the screen was seen in, and when it was not seen, says
that.

## Replies in chat

The owner reads a reply to decide something or to learn something they
need for their own work. They did not see the session. The principles of
the writing skill, `.claude/skills/writing/SKILL.md`, hold in chat, and
these are the ones that fail most often there:

- A reply opens with a sentence that says what it is about, also when it
  follows a question: what was asked or what was being worked on, with the
  options or the things named by what they are. The owner may come back to
  it after hours of other work. The answer comes next, in a full sentence.
  When several things are true, the one that changes what the owner does
  goes first.
- A longer reply is sketched before it is written, as the writing skill
  says, so that no term is used before the sentence that explains it.
- A reply holds the decisions that are needed from the owner and what they
  need to know. How the work went stays out, unless it changes what they
  do next.
- A reply carries the numbers the answer turns on and leaves the rest for
  a document, with a line that says where it is or that it can be
  written. A reply that needs headings is usually a document.
- A request for a decision has the options, what each one costs, and a
  recommendation. What can be decided without the owner is decided, and is
  mentioned only when they need to know of it.
- No name before its explanation. Labels from the session, the names of
  files, components and functions, and the words of the web, are not words
  the owner has, unless the owner used them first.
- A number where an adjective would go, with what it was measured on, the
  browser among it. A comparison has both sides in the same units and
  says which is better.
- Nothing about the reply itself, and nothing about how interesting or
  important a thing is.
- What failed, or was not done, or was not seen in a browser, is said as
  plainly as what worked.
