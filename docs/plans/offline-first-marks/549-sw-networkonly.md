---
title: Service worker: marks GET must be NetworkOnly
type: chore
date: 2026-09-04
status: ready-to-implement
area: marks
issue: 549
adr: [0061]
---

# Service worker: marks GET must be `NetworkOnly`

> Umbrella: [`INDEX.md`](INDEX.md). **Blocked by #548 — see Sequencing, this must not land early.**

## Summary

Stop the service worker feeding the sync engine cached marks it cannot distinguish from server
truth.

## Root cause

`defaultCache` (from `@serwist/next/worker`) contains a catch-all:

```
matcher: sameOrigin && pathname.startsWith("/api/"), method: "GET"
handler: NetworkFirst({ cacheName: "apis", maxEntries: 16, maxAgeSeconds: 86400, networkTimeoutSeconds: 10 })
```

Both marks GET endpoints match it, so their responses are already cached for 24h. Left alone, an
offline pull — or one on a network slower than the 10s timeout — receives a stale cached `200`,
treats a day-old snapshot as authoritative server truth, writes it into the store as `synced`, and
reports a successful reconciliation it never made. That rolls back synced marks and resurrects
ones deleted on another device. `maxEntries: 16` makes the per-page responses churn through an
LRU, so the symptom would be intermittent rather than consistently wrong.

## Files to change

- `app/sw.ts` — a `NetworkOnly` rule for `/api/quran/pages/[0-9]+/marks` and `/api/marks`,
  registered **before** `...defaultCache`. Same pattern and same class of reason as the existing
  QDC tafsir rule; put it next to that one and cross-reference it in the comment.

## Sequencing — must not land early

Today, offline, `getPageMarks` falls through to that `"apis"` cache and marks partially render.
That is accidental — ADR 0014 declares marks online-only — but it is real behaviour users have.
Landing this before #548 makes the store serve reads would remove offline mark display and
regress them.

## Constraints

A pull must reach the network or fail. Failing is safe: the store already holds the last known
state, which is the whole point of the design.

## Test cases from the umbrella

1 and 5 — both depend on a pull never returning cached data.

## Done when

- Offline, a marks GET rejects rather than resolving from cache.
- The `"apis"` cache holds no marks entries after a session that visited reader pages.
- Offline mark display still works — served by the store, not the cache.
