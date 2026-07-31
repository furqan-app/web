# ADR 0031: Dark theme — gold marks Mushaf identity, emerald marks interaction

**Date:** 2026-07-27
**Status:** Accepted

## Context

The dark theme's reader page already uses gold (`--mushaf-ornament`, `--surah-frame-gold`)
for page ornaments, and a bright teal (`--primary`) for every interactive control app-wide.
Unifying the dark theme's chrome (nav, drawers, settings, player) around the Mushaf's visual
language raises a recurring question every future component will hit: when a new dark-theme
element needs an accent color, which one — gold or emerald — and why. Without a stated rule,
gold and emerald usage will drift back into being interchangeable "brand colors," which is
exactly the inconsistency this refinement is meant to remove.

## Options Considered

**Option A — Single accent color (emerald only)**
Keep gold confined to the reader page exactly as today; every interactive or brand surface
elsewhere uses emerald. Simplest, but drops the "surah colors match Mushaf colors" identity
cue the design reference calls for (e.g. the surah-list number badge).

**Option B — Gold and emerald as interchangeable brand colors**
Let each component pick whichever looks better locally. Matches neither "restrained" nor
"consistent" — the two accents would compete, which is the dashboard-vs-Mushaf mismatch this
whole pass exists to fix.

**Option C — Semantic split: gold = Mushaf identity, emerald = interaction, gold may leak into chrome**
Gold marks elements whose meaning is "this is Qur'an/Mushaf content" and may appear on a chrome
element that identifies Mushaf content (e.g. a surah-number badge), not just inside the reader
page itself.

**Option D — Semantic split, gold confined to the reader page only**
Same "identity vs. interaction" meaning as Option C, but gold never leaves the reader page —
every chrome surface (nav, drawers, settings, player) stays emerald-only, even for elements
that reference Mushaf content (surah numbers, surah names). The Mushaf owns gold; the
application owns green; the two never mix anywhere outside the page itself.

## Decision

**Option D** (revised from this ADR's original Option C during implementation — see below).
Gold (`--gold`/`--gold-muted` and the reader's `--mushaf-ornament`/`--surah-frame-gold`) is
reserved for the reader page only: ornaments, surah frames, verse markers, page decorations.
It has no exceptions in chrome. Emerald (`--primary`/`--accent`/`--ring`) covers every
interactive element and every chrome surface, including ones that reference Mushaf content
(the surah-list number badge is emerald, not gold). Before adding gold anywhere, the question
isn't "does this identify Mushaf content" — it's "is this literally on the Qur'an page." If
not, it's emerald.

**Why this was revised:** the original Option C (badge = gold) was implemented and then
reviewed against a design reference — mixing the two accents outside the page read as two
competing brand identities rather than one restrained one, which is the opposite of this
whole pass's goal. Confining gold to the page itself is the stricter, correct reading of
"the Mushaf owns gold, the application owns green."

## Consequences

- **+** Zero ambiguity: gold's scope is a literal boundary (the reader page), not a judgment
  call about what "feels" identity-bearing — removes the exact gray area that caused the
  badge misstep.
- **+** Chrome stays visually singular (one accent, emerald) — nothing to compete with the
  page's own gold identity when the two are ever visible together (e.g. sidebar open beside
  the reader in a wide layout).
- **-** Loses the "surah colors echo Mushaf colors" identity cue outside the page — accepted
  as the right trade-off after seeing it rendered.
