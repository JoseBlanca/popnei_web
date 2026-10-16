# The look of popgen2.html: Instrument, blue

A note of 16 October 2026, written after the owner accepted the look in
the running page the same day. It records what was chosen, why, and the
colours and sizes it rests on, for whoever next changes a colour or a
part of the layout. The work that built it, its reviews and the counts
of its checks are in `docs/plans/visual-design.md`.

Every colour, size of type, space and corner of the page is written once,
as a named value, a token, in `src/ui/tokens.css`: `--color-panel`,
for instance, is the white of the panels. The styles of every part of
the page use the names, never the values, so a change of the look is a
change of that file, and the dark theme is the same names with other
values. `.claude/skills/coding/css.md` gives the rules of the styles.

## What the owner asked, and what was chosen

The owner asked for a look that tells a user the page is modern but not
flashy, an academic site, a bit sober. Three looks were made on the real
page, each a set of values of the tokens, and compared on screens in
both themes at 1280 and 320 px beside the page as it was on main that
day:

1. Journal: white paper, serif headings, thin rules, a navy accent.
2. Instrument: a light grey page, the boxes of the files and the content
   of the open tab on white panels, one accent.
3. Soft academic: the structure of 2 with a warm off-white, shadows and
   round corners.

The owner found 1, and the page as it was, too uniform: the boxes of the
files were told from the tabs only by thin lines, where 2 and 3 told the
parts of the page apart by their background. They asked for the
selected tab to touch its content with the same background, so that the
choice of a tab reads as a change of what is under it, and for a bit of
soft blue. Two variants with blue were made, one of 2 and one of 3, and
the owner chose the one of 2, "Instrument, blue". The blue is kept on
backgrounds and on the band, and the text stays near-black, so that the
page reads as a tool and not as a brochure, and the blue does not
compete with the blue of the plots.

## The look

- The page is a pale blue-grey. The band, the bar fixed at the top of
  the window that holds "Popnei" and says what the page is doing, is a
  soft blue. The column of the page is centred in the window.
- The two boxes of the files, Variants and Individuals, and the content
  of the open tab of the row of five tabs (Variants, Individuals, PCA,
  Populations, Distances) stand on white panels. In the dark theme the
  panels are a step lighter than the page.
- The selected tab of that row is joined to its panel: white like it, the
  tab's and the panel's top corners square, and a bar of 3 px at the
  tab's top in the accent, beside its words in bold. A tab greyed while
  shown, the PCA tab while a new variants file opens, keeps a bar in the
  grey of disabled text and its words in normal weight.
- In Windows' high-contrast mode, which draws every colour from the
  user's few system colours and removes the shadows the bar is drawn
  with, the bar is a real border instead, in the system's colour for a
  selection.
- Below 40em, 640 px, the row of tabs can wrap to two lines, and a tab
  joined to the panel would stand above the other line. There the tab is
  not joined: its bar is a line under its words, and the panel loses its
  side borders and reaches the window's edges, so that the plots keep
  the whole width of a phone.
- One blue accent marks the selected tab, the links and the ring of the
  keyboard's focus. The headings are semibold. The font is the
  system's.
- The plots stand on the white panel. Their colours for the populations
  stay the palette of Okabe and Ito, chosen to be told apart by readers
  with the common kinds of colour blindness, and a plot downloaded as a
  file keeps a white background.

## The values

| token | light | dark |
|---|---|---|
| `--color-background`, the page | #edf2f7 | #121821 |
| `--color-band` | #d9e5f1 | #1d2836 |
| `--color-panel`, `--color-box`, `--color-tab-selected` | #ffffff | #19212c |
| `--color-rule`, the lines that only separate | #c4d0dc | #2f3b4a |
| `--color-text` | #16202b | #e8edf3 |
| `--color-text-muted` | #47525e | #a0acb9 |
| `--color-text-disabled` | #626d7a | #7d8997 |
| `--color-border`, of fields and buttons | #6f7d8c | #788594 |
| `--color-accent`, `--color-focus` | #1d5c96 | #86b8ea |

Corners are 0.25rem on fields and buttons and 0.375rem on boxes and
panels; the panel has 1.5rem inside, 1rem below 40em.

WCAG 2.2 AA asks of text a contrast of 4.5:1 with its background, and of
the parts of a control, the focus ring and the marks of a plot, 3:1;
the contrast is the ratio of the lighter colour's luminance to the
darker's, each plus 0.05. `src/ui/tokens.test.ts` computes it for every
pair of tokens a screen uses, in both themes. The pair closest to its
limit is the disabled text on the dark panel, 4.55:1, which also keeps
3.03:1 from the normal text, so that a disabled control is told from an
enabled one.

## Left open

- A font served with the site, which would make the page look the same
  on macOS, Windows and Linux, where today each computer uses its own.
  Source Sans 3, two weights, adds 31 KB to the first visit, beside the
  0.81 MB of popnei's calculations, compressed, that the page already
  loads; it was shown on screens beside the system font. A decision for
  the owner.
- The old page, `popgen.html`, which will be deleted, takes the same
  tokens and was not looked at.
