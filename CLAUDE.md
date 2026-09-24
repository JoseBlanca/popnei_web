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
before it is handed over. The work goes in this order: a spec, under
`docs/specs/`, as the `writing-specs` skill says; a plan, as
`writing-plans` says; the code, as `coding` says. A module of `src/core`,
`src/worker` or `src/charts` is specified in full before its code; a
screen of `src/ui` has a short spec, and its look is refined in the
running application.

A session that writes anything in the repository, a spec, a plan, a skill
or code, works in a git worktree and a branch of its own, under
`.claude/worktrees/` of `/Users/jose/devel/popnei_web`, which it makes
before its first edit: two sessions that edit the main checkout at once
leave their changes mixed in the same files, as happened in popnei on 21
September 2026. An implementation plan is carried out the same way, as
the `following-plans` skill says. Nothing is merged into `main`, and
nothing is pushed, without the owner's order.

## popnei in the application

The application takes the wasm package of popnei from a GitHub Release of
popnei, named by its URL in `package.json`, and a newer popnei is a new
tag there and a new URL here (`docs/technology.md`, section 5). While the
two are changed together, the application may use the local build of
popnei, with `npm link` or `"popnei": "file:../popnei/js/popnei"`, which
is never committed: what is committed, and what the site is built from, is
always a release. A session that needs something popnei does not have
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
