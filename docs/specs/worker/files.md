# xlsx_rs: an xlsx read into cells

From 9 October 2026 the light worker reads the individuals file with
table_io, xlsx_rs renamed and widened, whose package reads every format
into a table (`docs/designs/input-page.md`; `docs/specs/worker/individuals.md`,
"The read by table_io"); xlsx_rs's `readXlsx` is no longer called. What
follows is the pointer of 28 September 2026. Built on the branch
`individuals-file` on 9 October 2026, work package 1 of
`docs/plans/input-page.md`, which removed xlsx_rs from the site; not yet
tried by the owner, so no round of theirs has changed it yet.

This spec moved to the repository of xlsx_rs on 28 September 2026, whole,
as the owner had decided: it is `docs/specs/read.md` there,
`/Users/jose/devel/xlsx_rs/docs/specs/read.md`, and on GitHub, once the
repository is there, `github.com/JoseBlanca/xlsx_rs`. It is kept in one
place, so that the package popnei_web installs and the spec it was built
from cannot drift apart. The text as the owner approved it with the specs
of stage 4 is this file at commit 7e7eb04 of popnei_web; what popnei_web
does with the package is in `docs/specs/worker/individuals.md`, "The
package of xlsx_rs, loaded on first need".
