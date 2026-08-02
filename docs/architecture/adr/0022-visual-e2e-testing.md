# ADR 0022: Visual E2E Testing via Playwright + Full-Dataset Fixture DB

**Date:** 2026-07-07
**Status:** Accepted

## Context

There is no automated testing of any kind in this repo — no unit, integration, or visual test infrastructure, and no CI beyond `protect-prod.yml` (which only checks a PR's source branch name). Rendering correctness for the Quran reader is unusually easy to silently regress: font-size formulas, RTL/LTR mirroring, theme tokens, and the double-page spread are all `vh`/`vw`-derived CSS (ADR 0004, 0011, 0013) that a routine Tailwind or layout change can break in ways that pass type-checking and linting but only show up visually. We want an automated visual regression check in CI that catches this class of bug, without requiring a live third-party API call (QDC) on every CI run.

A constraint surfaced during implementation: `app/[locale]/pages/[id]/page.tsx`'s `generateStaticParams` hardcodes all 604 page ids, so `next build` always attempts to statically generate all 604 pages × 2 locales regardless of how many pages the test suite actually visits. A fixture trimmed to only the pages under test would make `next build` crash on every page outside that trim (`pageMetadata.findUniqueOrThrow` finding no row). The fixture must therefore contain the full dataset, not a trimmed slice — the "trim to what's tested" idea (this ADR's original Option B) does not compose with this app's static-generation strategy without also changing `generateStaticParams` itself, which was ruled out to avoid touching production source code for a testing concern.

## Options Considered

**Option A — Ephemeral DB seeded from the live QDC API**
Run the existing reproducible seeder (`npm run seed:quran`) against a fresh MySQL service container in CI. Fully realistic, reuses existing tooling, but adds a network dependency on a third-party API to every CI run.

**Option B — Committed full-dataset fixture SQL, loaded into an ephemeral DB**
Generate one SQL dump (all 114 `chapters`, all 604 pages' `verses`/`words`/`page_metadata`/`rubs`/`rub_verse_mappings`) and commit it to the repo. CI spins up MySQL as a service container and loads this file directly, no seeder run, no network call at CI time, deterministic. The dump is generated once (and regenerated only when the Quran schema or seeder logic changes) via a script that reuses the seeder's fetch/derive modules. Trade-off: a large file lives in git, and it must be kept in sync with the real seeder's output shape.

**Option C — Point CI at a shared/staging database**
Fastest to wire up, but couples every CI run to shared external state and requires managing a long-lived connection secret — rejected, no staging environment exists (Release & Deployment Workflow decision: "Hostinger hosts prod only").

## Decision

Option B, full dataset (not trimmed — see Context). Playwright drives the visual tests (`@playwright/test`, chosen over a paid SaaS visual-diff service since Playwright's `toHaveScreenshot()` already provides pixel-diff baselines and the tool is free, self-hosted, and already available in this environment). A fixture-generation script (reusing `scripts/quran-seed/chapters.js`/`verses-words.js`/`derive.js`) produces one committed SQL file covering the entire Quran dataset; CI (and local baseline regeneration) load it into a MySQL service container via `docker compose`/GitHub Actions services, run `next build && next start` against it, and screenshot 5 fixed screens (home/surah-list, Quran page 1, Quran pages 2–3 double-spread, search results, settings sheet) across `{ar, en} × {light, dark}` and, for 4 of the 5 screens, an additional mobile viewport — 36 baseline images total. `app-db` (users/marks) gets its Prisma schema pushed but no seed rows, since none of the five screens require authentication. The e2e databases are dedicated, disposable containers (`compose.e2e.yml`, separate ports/volumes from dev's `compose.yml`) so `e2e:setup`'s `--force-reset` never touches a developer's real seeded dev DB.

A visual diff fails the GitHub Actions check (soft-blocking — not added to `protect-prod.yml`'s hard branch-source rule). Baselines are regenerated via a separate `workflow_dispatch`-triggered CI job that runs `playwright test --update-snapshots` inside the same CI environment and pushes the updated PNGs back to the PR branch, guaranteeing pixel-parity between the images that get committed and the environment that will later check them.

## Consequences

- **+** CI runs are network-independent — no live QDC API call on every run, since the fixture is pre-generated and committed.
- **+** The fixture is deterministic: same SQL in, same rendered pixels out, every run.
- **+** `next build`'s hardcoded 604-page `generateStaticParams` works unmodified — no production source code changed to accommodate testing.
- **+** Baseline regeneration always happens inside the CI environment (via `workflow_dispatch`), eliminating the classic "works on my machine, fails in CI" font-rendering/anti-aliasing drift that plagues visual regression tests.
- **-** The fixture SQL is a large committed file (full 604-page dataset, all verses/words) rather than a small trimmed one — meaningfully bigger git history footprint than the originally-planned 3-page trim.
- **-** The fixture SQL duplicates the full output of what the reproducible seeder already knows how to produce — if the Quran schema changes (ADR 0009's seeder output shape), the fixture generation script must be re-run and the committed SQL regenerated, or CI's DB and the app's Prisma client will disagree.
- **-** Regenerating the fixture (one-time or on schema change) takes as long as a full seed run (604 sequential QDC page fetches) — acceptable since it happens rarely, not per CI run.
- **-** `workflow_dispatch` baseline regeneration is an extra CI job to maintain (checkout PR branch, run with `--update-snapshots`, commit + push back) — more moving parts than a purely local `git commit` of regenerated PNGs, accepted for the pixel-parity guarantee.

## Addendum (2026-07-15): Hosted per-PR report via `gh-pages`, not `actions/deploy-pages`

`visual-e2e.yml` now publishes the Playwright HTML report to the `gh-pages` branch at `reports/pr-<PR_NUMBER>/` on failure, and links it from a sticky PR comment, so a diff is visible in-browser with one click instead of requiring an artifact download. Publishing uses a direct **additive** push to `gh-pages` (each PR's run only touches its own `reports/pr-<N>/` subfolder) rather than GitHub's native `actions/upload-pages-artifact` + `actions/deploy-pages` — that mechanism deploys the entire Pages site from a single artifact per run and is not additive, so it would delete every other open PR's already-published report each time any one PR's workflow ran. This only works because the repo is public (GitHub Pages hosting is free only for public repos; private repos need GitHub Enterprise). A PR's `reports/pr-<N>/` folder is deleted by a separate `pull_request: types: [closed]` workflow when that PR closes — `gh-pages` would otherwise grow unbounded, one folder per PR ever opened. See `docs/plans/visual-e2e-testing.md` Addendum (2026-07-15).

## Addendum (2026-08-02): A frozen loading state reads as a stable frame — visual tests need a positive content wait

`toHaveScreenshot` decides a page has settled by taking two screenshots 100ms apart and comparing them — but it **disables all CSS animations first**. On any surface whose loading state is a shimmer, that ordering is a trap: the skeleton stops animating, the two frames match, and a half-loaded page is captured as a settled one. The reader hits this because its line content arrives after hydration (ADR 0034) while its fonts are already registered, so `document.fonts.ready` — the only readiness signal Playwright waits on by default — resolves long before there is anything to photograph. Measured: `status=loaded`, all page fonts `check() === true`, and every pager panel still at `rows: 0, bars: 8`. Eight repeat loads through the ungated path produced two distinct screenshots, 4/8 each, at identical computed layout.

The gate is therefore a **positive** assertion on rendered content — every `.fq-quran-safha` contains at least one `.fq-safha-row` — rather than the absence of a loading marker. An absence check (`no .animate-pulse`) was rejected because it is satisfied vacuously the instant that class is renamed: `querySelectorAll` returns an empty list, the wait resolves, and the flake returns with no failing test anywhere to reveal it. The positive form fails loudly instead. This generalises to any future screen added to this suite whose content is client-hydrated.

The second half of the problem is that the comparison could not tell that failure apart from a real regression. `maxDiffPixelRatio: 0.02` was chosen without measuring what a regression actually scores on these screens, and a mushaf page is mostly uniform paper — so pixelmatch flags very little even when the layout is wholly different. Measured at the default `threshold: 0.2`: the skeleton-vs-painted difference scores **0.0192**, and a **whole design generation apart scores only 0.037-0.061**. Both sit within a factor of ~3 of the gate. That is why the suite oscillated, and why baselines stale since 2026-07-12 kept passing while `update-visual-baselines` rewrote only the ~3 files per run that happened to cross — leaving the 12 opening-page baselines carrying four different vintages.

The gate moves to `maxDiffPixelRatio: 0.002` (a separate, later PR — see below), with the per-pixel YIQ `threshold` left at its 0.2 default. Raising `threshold` was considered and rejected: it trades a well-understood pixel-count budget for exposure to font-rendering differences between CI runner images, which is a noisier failure mode than the one being fixed. 0.002 is affordable because, once the readiness wait is in place, the measured run-to-run floor is **exactly zero** — three warm runs and four at 8x CPU throttle with 300ms latency all produced byte-identical screenshots.

Sequencing is deliberate and is part of the decision: the readiness wait plus a full baseline regeneration ship first, and the tightened gate follows only after several PRs have run green. Doing both at once would put the new value into effect without it ever having been exercised against a known-good baseline, so any anti-aliasing drift between the regeneration run and later runs would turn the whole suite red with no way to separate runner drift from a genuine regression. See `docs/plans/visual-e2e-testing.md` Addendum (2026-08-02), Trello [#174](https://trello.com/c/D4f3JMMH) and [#175](https://trello.com/c/BSX7EK3j).
