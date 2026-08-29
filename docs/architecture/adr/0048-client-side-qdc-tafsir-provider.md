# ADR 0048: Client-Side Direct QDC Tafsir Provider and Quote Normalization

**Date:** 2026-08-29
**Status:** Accepted

## Context

Furqan requires access to comprehensive classical and contemporary Quranic commentaries (Tafsir) across multiple editions (Al-Muyassar, Al-Sa'di, Ibn Kathir, Al-Baghawi, Al-Tabari, Al-Qurtubi). We need to determine how commentary data is fetched, cached, and formatted for rendering in the reader and modal workflows.

## Options Considered

**Option A — Next.js Server Route Handler Proxies**
Create backend `/api/quran/tafsirs/[id]/[verseKey]` routes in Next.js that fetch from QDC and forward responses to the client.

**Option B — Direct Client-Side Fetching with Isomorphic Normalization**
Fetch directly from QDC's public API (`https://api.qurancdn.com/api/qdc/tafsirs/...`) using React Query in the browser, normalizing vendor HTML into structured segments with Quranic brackets (`﴿...﴾`) and `font-uthmanic`.

**Option C — Database Seeding in `furqan_quran`**
Ingest all tafsir text across all supported editions directly into MySQL during the seeding step.

## Decision

Adopt Option B. Fetch tafsir commentaries directly from QDC's public API in client providers and React Query hooks without intermediate Next.js proxy handlers, normalizing vendor HTML into structured segments (`{ type: "text" | "quran" | "reference", text: string }`) and stylized Quranic quotes (`﴿...﴾`).

## Consequences

- **+** Zero Next.js server load or proxy overhead; utilizes QDC's Cloudflare edge CDN and standard CORS support.
- **+** Prevents massive storage bloat in `furqan_quran` MySQL database (hundreds of MBs across 6+ tafsir works).
- **+** Normalizes inconsistent HTML tags across editions into safe, typed AST segments for native React rendering without `dangerouslySetInnerHTML`.
- **-** Client depends on QDC API availability when online (mitigated by 24h client staleTime and PWA precaching in #461).
- **-** Text parser must accommodate variations in QDC HTML markup across different commentary editions.
