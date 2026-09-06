# Check Furqan Standards

Guardrail run by `/start-fq-task` around every implementation: once *before* code is written (know what not to touch) and once *after* (verify nothing regressed), before the task is reported done. Also invocable standalone as `/check-fq-standards` against the current diff.

This is not a replacement for `docs/architecture/decisions/*.md` or the standards files — it is a gate that makes sure they were actually applied.

## Pre-check (before writing code)

1. From the plan, list the files/components/subsystems this task will touch.
2. From the Domains table in `docs/architecture/DECISIONS.md`, pick the `decisions/*.md` file(s) covering those areas. Grep **those** files for `Constraints`, `Never`, `Do not`, `must not` lines whose section mentions any of the touched files/components/subsystems (by path, component name, or keyword). Read the **full decision block** for every hit, not just the constraint line — the rationale is what disambiguates edge cases. Also read the Non-negotiable Invariants block in the index.
3. Note which invariants are load-bearing for this change. If the plan appears to require violating one, stop and raise it with the user — reinforces `start-task.md` Step 2's gate, before any code is touched.
4. Skim "General Engineering Bar" below for the domains this task touches (Next.js / TypeScript / PWA / DB schema / clean code) and note which items apply.

## Post-check (after implementing, before reporting done)

1. `git diff` against the base branch for everything changed.
2. For every changed file, re-grep the `decisions/*.md` file(s) for its domain the same way as the pre-check — catches anything the plan didn't originally anticipate touching.
3. Walk "Regression Classes" below against the diff — each item is a concrete thing that must still hold.
4. Walk "General Engineering Bar" below against the diff.
5. Fix any failing item before reporting success. Never report a task done with a known open violation.
6. In the report, name which checklist items were relevant and confirmed OK — not a bare "all good." Mirrors `/review-fq-work`'s requirement for concrete, itemized findings.

## Regression Classes

A static, highest-risk-first list (last reconciled against the decisions 2026-08-13; split into `decisions/*.md` 2026-09-02). It is **not exhaustive** — the live grep in the pre/post-check steps above is the actual source of truth; this list exists so common regressions get caught even on a skim. Bracket tags name the source section (findable in its `decisions/*.md` file) and ADR.

### Reachability (new code must be called)
- **Every new module in the diff has at least one non-test importer.** A module only `*.test.ts`
  imports is dead code that ships green: unit tests pass, lint passes, type-check passes, and the
  failure is invisible from inside the module. `#546`/`#547` both merged to `main` this way and the
  whole offline-marks feature was inert until `#560` wired it up — grep the diff's new files for
  importers before reporting done.
- **Behaviour the plan promises is traceable to a real call site.** A module-scope listener,
  singleton or lifecycle trigger does nothing until something imports the module; a `subscribe()`
  that attaches event listeners on its first listener does nothing until something subscribes. If the
  plan says "on launch" or "when the session becomes authenticated", name the mounted component that
  makes that happen. `#547`'s plan listed both triggers and its Files to Change named no component to
  host either.
- **A plan whose Files to Change are all new files is the warning sign.** Working code almost always
  edits something that already exists. If nothing existing changed, ask what is supposed to call this.

### Swipe / reader flicker
- Never mutate the text/content of a live `<style>` element carrying `@font-face` rules (rewrite or `appendChild`). Add fonts only as new immutable units — a registry `FontFace`, or a new keyed `<style>`. [Font System, ADR 0029]
- `commitTo` is the only in-reader navigation primitive. Never reintroduce `router.push` for swipe/arrows/recitation-follow, never read `usePathname()` for the current page. [ADR 0028]
- The commit **slide** animation is swipe-only — arrows and keyboard commit instantly (`animate: false`). Don't unify onto the animated path.
- Input arriving mid-commit must be **settled**, never aborted or dropped.
- The same page can be mounted 2–3× at once (window overlap, spread partner). Never cache one DOM element per `word.location` — code touching word DOM nodes must tolerate multiple live matches.
- `FontFaceInjector` renders unconditionally, never gated by breakpoint.

### Performance
- The reader mounts a **window** (visible page/spread ±1), never the full page list.
- Recitation word-highlighting is DOM-direct (`querySelectorAll` + class toggle) — never React state per recited word (fires ~4×/sec).
- Font-loading (`ensurePageFonts`) is scoped to genuinely-visible ids only, never "everything in the window."
- Quran page routes stay statically generated — never add server-side dynamic rendering to them.
- Search stays capped (`take: 10`) with a 2+ char gate enforced server-side, not just client-side.
- Prisma URLs keep `connection_limit=1`; never construct `PrismaClient` with an explicit `new URL()` datasource at module scope.

### Navigation / nav chrome
- `<nav>` keeps `relative z-10` in its base (non-overlay) className.
- Exactly one sidebar trigger, living in `Nav`, gated on `pathname.includes("/pages/")` (trailing slash required).
- State an always-mounted component (e.g. `Nav`) displays, that can change while the app is open, must be live context state — never a mount-only `localStorage.getItem`.
- Any verse→page lookup (recitation-follow, deep links, rub/hizb nav) resolves through the **active mushaf edition** — never `Verse.page_number` directly, never the locale-flipped `next`/`prev` href logic.

### Mushaf layout
- The 15-slot line budget (`SKELETON_LINE_COUNT`, banner gap-detection) is load-bearing — don't shortcut it with a line-count heuristic.
- Banner/frame art: never stretch to the line ratio (no `preserveAspectRatio="none"`); width is DOM-measured, never computed from a fixed em ratio.
- A mushaf edition owns glyph field + font file + word placement as **one inseparable unit** — never mix across editions.
- No per-edition or per-page justification branch in `QuranLine` — line centering is edition- and page-independent.

### Database / schema
- Never add a foreign key or Prisma relation crossing `furqan_quran` ↔ `furqan_app` — scalar id references only.
- `furqan_quran` has no migrations (seeder-owned, `db push --force-reset`); `furqan_app` uses versioned `prisma migrate`.
- Use `quranPrisma`/`appPrisma` explicitly — there is no single `prisma` client.
- `Chapter.pages` is a `"start-end"` string, not an array.

### PWA / offline
- The bulk 604-page pre-cache is explicit-tap-only on every surface — never silent or auto-started.
- `globPublicPatterns` in `next.config.mjs` stays pinned to the app shell, never `["**/*"]`.
- Reader HTML is `NetworkFirst`; only page fonts/JSON are `CacheFirst`.
- Page fonts are never pre-cached for a regular (non-installed) browser tab.

### Theming
- No hardcoded color values outside theme class blocks in `globals.css`.
- `.dark` is always applied together with a `.theme-*` class, never alone.
- Dark reader surfaces (`--background` ≈ (7,15,23)) get no drop shadows — verify by sampling rendered pixels, not by reading the CSS.

### API / auth / i18n
- API routes return `jsonResponse()`, never a raw `NextResponse.json()`.
- Route files (`route.ts`) export only route handlers and route config — never shared constants or helpers (Next.js rejects non-route exports at build time, and neither `tsc` nor `lint` catches it; put shared values in `app/constants/`).
- Read the authenticated user via `extractUser(request)` in API routes, never `getServerSession` there (layouts/pages are the documented exception).
- `dir="auto"` is reserved for genuine free-text user content (notes, comments) — UI chrome and Quran text keep their locale-locked or Quran-locked `dir`.

### Design & UX (any diff touching components, pages, or `globals.css`)
- Text/background pairs meet WCAG AA (4.5:1 body, 3:1 large/UI) — against the actual theme token values, checked in all three themes.
- Visual hierarchy is intentional: one primary action per view; size, weight, and colour track importance, not convenience.
- Spacing uses the scale in `docs/design/design-principles.md` / `styling.md` — no arbitrary one-off `px` gaps.
- RTL/LTR parity: `ps-`/`pe-`/`ms-`/`me-` and `start`/`end`, never `left`/`right`, for anything that mirrors; verify the surface in `/ar`.
- Interactive targets are ≥ 44×44px (or have an equivalent hit area) on touch.
- Motion honours `prefers-reduced-motion` and follows the `styling.md` Motion rules (no animation on keyboard/high-frequency actions, transform/opacity only).

## General Engineering Bar

Apply on every task, scoped to the domains actually touched.

**Next.js (App Router, v14)**
- Server Components by default; add `"use client"` only where interactivity/hooks require it.
- Static Quran content fetches server-side/build-time; user-specific state fetches client-side, post-hydration.
- No `<style dangerouslySetInnerHTML>` in a Server Component — hydration-mismatch risk.
- A new dynamic segment or route needs its `generateStaticParams` implications checked against the 604-page build.

**TypeScript**
- No `any` as an escape hatch — narrow the real type or use `unknown` plus a guard.
- Prefer the generated Prisma types over hand-rolled duplicates.
- Switch over typed unions (mark categories, scheduling rule kinds, notification channels) exhaustively — let TS catch a missing case, don't add a silent `default`.

**PWA**
- A new asset directory under `public/` must be added to `middleware.ts`'s matcher exclusion list, or `intl-middleware` 404s it behind a locale prefix.
- Any new precache rule needs an explicit consent gate — `display-mode` alone is never sufficient.

**Database schema (Prisma)**
- New table: which database, `quran` or `app`? Scalar-id references only across the split.
- `String @db.Text` for anything that can exceed 191 chars; plain `String` for single-word/short fields.
- `furqan_app` schema changes need a migration (`app-migrate-dev`); `furqan_quran` changes need a reseed, not a migration file.

**Clean code / YAGNI / KISS / DRY**
- No new abstraction (registry, factory, provider interface) until a second real consumer exists.
- No feature flag, config option, or "for future use" parameter with no current caller.
- Prefer extending an existing typed constant/registry (`MARK_CATEGORIES`, `NOTIFICATION_TYPES`, `PLAN_TEMPLATES`) over a parallel one-off mechanism.
- Don't add error handling for states that can't occur here (e.g. re-validating what middleware already guarantees) — validate only at real boundaries.

**Testing & verification**
- Do not run full test suites or local E2E by default (CI runs lint, type-check, unit tests, and Playwright automatically on PRs).
- Run targeted unit tests (`npx vitest run <file>`) only when adding or modifying pure business logic, calculations, or utilities that have unit tests.
- Never run uncapped full-suite Playwright commands locally; local E2E is reserved for when specifically working on E2E specs or requested by the user, run targeted against `npm run e2e:serve` (never `next dev`).
