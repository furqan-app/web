# ADR 0078: Heart-Pulse Multi-Track Wird & Read-Time Derivation

**Date:** 2026-11-12  
**Status:** Accepted

## Context

Users track per-surah page memorization in `/heart` via `UserSurahPageMemorization` (ADR 0077), classifying pages into mastered, needs review, or unmemorized. Issue #652 introduces the "Heart Pulse" smart multi-track wird ("خطة أوراد نبض القلب الذكية") that schedules daily memorization, review of slipping pages, near review, and recitation. This feature must honor ADR 0030 (the plan engine must remain a pure function with zero database queries at derivation time) while keeping memorization state in `UserSurahPageMemorization` synchronized when daily assignments are completed.

## Options Considered

**Option A — Dynamic DB queries inside the derivation engine**  
Have `engine.ts` query `UserSurahPageMemorization` on every read-time call to find current slipping pages and gaps. This violates ADR 0030, introduces network waterfalls into offline/service-worker and SSR rendering paths, and causes historical streak recomputation to drift whenever memorization state is altered.

**Option B — Snapshot target queues at enrollment with transaction sync on progress check-off**  
At enrollment or edit time, the wizard diagnoses the heart state and snapshots the resolved ordered target page sequences (`targetPages` for new memorization/gaps, `slippingPages` for needs-review) into `UserPlan.params`. `engine.ts` derives daily assignments purely from these arrays and the append-only `PlanProgressEntry` log. When a user completes a daily assignment in `POST /api/plans/[planId]/progress`, a single Prisma transaction records the progress entry and promotes completed pages to `mastered` in `UserSurahPageMemorization`.

## Decision

Adopt Option B — Snapshot diagnosed target queues in `UserPlan.params` for pure read-time assignment derivation, and synchronize completed pages to `UserSurahPageMemorization` at progress check-off time within a single database transaction.

## Consequences

- **+** Preserves ADR 0030: `engine.ts` remains a pure, clockless, DB-free function with deterministic assignment derivation and full Vitest unit test coverage.
- **+** Real-time visual parity: completing a daily wird instantly turns the corresponding heart cells and progress bars in `/heart` to living emerald green (`mastered`).
- **+** Preserves ADR 0008: all models reside strictly in `furqan_app` with scalar IDs and no cross-DB foreign keys.
- **+** Idles gracefully: when all slipping pages are mastered, the slipping review track automatically produces empty assignments while memorization continues.
- **-** Target queues are snapshot-based: if a user manually repaints surah pages in `/heart` outside the plan, the active plan retains its snapshot sequence until the user opens the "Edit wird" ("تعديل الورد") dialog to refresh their plan targets.
