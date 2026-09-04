# Active Decisions — Index

Architectural decisions are split by domain under [`decisions/`](decisions/). The `adr/`
directory is the historical audit trail (humans, not the per-task hot path).

**How to load this:** read this index always. Then load the 1–3 `decisions/*.md` files whose
domain your task touches — the same task-type→file mechanism `docs/workflow/start-task.md`
already uses for `docs/standards/`. Do not read every domain file. See
[ADR 0057](adr/0057-decisions-split-by-domain.md) for why the split exists.

---

## Non-negotiable invariants

Cross-cutting rules a task in any domain can violate. One line each here; full text and
rationale in the linked domain file.

- **Quran page routes never get server-side dynamic rendering.** All 604 pages are statically generated; user state is client-only. → [`decisions/rendering.md`](decisions/rendering.md)
- **Never add a foreign key or Prisma relation across `furqan_quran` ↔ `furqan_app`.** Scalar id references only — this is the load-bearing invariant of the DB split. → [`decisions/db.md`](decisions/db.md)
- **Never mutate the text of a live `<style>` element carrying `@font-face` rules.** Add fonts only as new immutable units (registry `FontFace`, keyed `<style>`, adopted `CSSStyleSheet`). ADR 0029. → [`decisions/rendering.md`](decisions/rendering.md)
- **`commitTo` is the only in-reader navigation primitive.** Never `router.push` for swipe / arrows / recitation-follow; never read `usePathname()` for the current page. ADR 0028. → [`decisions/reader.md`](decisions/reader.md)
- **Breakpoint-dependent positioning is CSS `@media`-gated, never JS-hook-gated.** SSR renders the hook's `false` default and paints it before hydration. ADR 0043. → [`decisions/reader.md`](decisions/reader.md)
- **`useSession()` is never the input to persistent per-user state.** It reports unauthenticated on every offline launch; distinguish "no session" from "unknown". → [`decisions/api.md`](decisions/api.md)
- **A sync or reconciliation read must never fall through to `defaultCache`.** Same-origin `GET /api/*` is cached 24h; such endpoints need `NetworkOnly` in `app/sw.ts`. → [`decisions/pwa.md`](decisions/pwa.md)
- **Any verse→page lookup resolves through the active mushaf edition** — never `Verse.page_number` directly, never locale-flipped `next`/`prev` href logic. ADR 0033. → [`decisions/rendering.md`](decisions/rendering.md)

---

## Domains

| Domain | File | Covers |
|---|---|---|
| Quran text & fonts | [`decisions/rendering.md`](decisions/rendering.md) | static generation, per-page font registry, mushaf editions & word placement, tajweed mode |
| Reader surface | [`decisions/reader.md`](decisions/reader.md) | persistent client pager, swipe animation, double-page spread, desktop reading group, surface depth, safha viewport fit, first-paint positioning, ICB heights |
| Nav chrome & overlays | [`decisions/nav.md`](decisions/nav.md) | sidebar loading & trigger architecture, sheet `top`/`h-full` sizing, nav z-index, live nav-mounted state |
| Theming & design language | [`decisions/theming.md`](decisions/theming.md) | shadcn/Radix component library, theme-class architecture, reader-lab design language, gold→emerald accent unification |
| Surah layout | [`decisions/surah-layout.md`](decisions/surah-layout.md) | surah-banner / bismillah gap-detection placement |
| Databases | [`decisions/db.md`](decisions/db.md) | Prisma connection, the two-DB split, local Docker dev DBs & seeding, PageMetadata |
| API & auth | [`decisions/api.md`](decisions/api.md) | middleware chain, NextAuth / `extractUser`, `jsonResponse()` envelope |
| PWA & offline | [`decisions/pwa.md`](decisions/pwa.md) | offline page caching, Android PWA launch & back navigation, root-layout network budget, offline recitation audio, offline tafsir |
| Marks & sharing | [`decisions/marks.md`](decisions/marks.md) | mark = category + optional comment, semantic color categories, verse/word comments, shared mushaf access grants |
| Recitation | [`decisions/recitation.md`](decisions/recitation.md) | recitation playback (QDC proxy, global audio timeline) |
| Search | [`decisions/search.md`](decisions/search.md) | Arabic search normalization & result caps |
| i18n | [`decisions/i18n.md`](decisions/i18n.md) | next-intl locales, direction, key coverage |
| Awrad / plans | [`decisions/plans.md`](decisions/plans.md) | learning-plans engine, per-track units, derived assignments |
| Social metadata | [`decisions/sharing.md`](decisions/sharing.md) | root-layout Open Graph, per-verse `/share/verse` route |
| Tafsir | [`decisions/tafsir.md`](decisions/tafsir.md) | client-side QDC tafsir provider, quote normalization, reader-pager sync, offline blob fallback |
| Observability | [`decisions/observability.md`](decisions/observability.md) | Sentry error tracking, Sentry→Slack relay, `fq-logger`, notification dispatch |
| Testing & CI | [`decisions/testing.md`](decisions/testing.md) | Playwright behavioral e2e, CI quality gate, e2e-skip rule, local dev-server / build-CPU ergonomics |
| Release | [`decisions/release.md`](decisions/release.md) | feature-branch → main → release-branch → stg → prod workflow |

---

## Recording new decisions

- A decision lands in the domain file it most belongs to, with a `**Status:** active` line under its heading. Add a row here only if it introduces a whole new domain file.
- A cross-cutting rule that any domain could trip on also gets a one-liner in **Non-negotiable invariants** above.
- Superseded: change the section's `**Status:**` to `superseded by <x> (YYYY-MM-DD)` — do not delete it.
- Workflow / process decisions go in [`docs/workflow/INDEX.md`](../workflow/INDEX.md), not here.
