# ADR 0050: A dedicated `/share/verse` route owns per-verse Open Graph metadata

_Note: this ADR was drafted with a per-verse `next/og` image; that was dropped
during implementation (Satori cannot shape Arabic). The route ships with
metadata only — verse text in `og:description`, image falls back to the app
icon. A real verse-card renderer is a separate task._

**Date:** 2026-08-31
**Status:** Accepted

## Context

Sharing a verse from the MarkModal sends social platforms the canonical reader
URL. Facebook and LinkedIn ignore share-link text params and scrape Open Graph
tags from that URL; the reader route only carries the app-wide static OG block
(ADR-less, DECISIONS.md "Root-Layout Open Graph"), so the preview is generic
app branding with no verse text. That entry deliberately did not build per-verse
`generateMetadata` — the concern was a dynamic metadata function on a Quran page
route reading `searchParams` and opting the 604 statically-generated pages out of
static rendering. A per-verse card needs dynamic metadata somewhere; the question
is where it can live without touching the Static Generation Strategy.

## Options Considered

**Option A — per-verse `generateMetadata` on the reader page route**
Add a metadata function to `app/[locale]/pages/[id]/page.tsx` keyed off the
`highlight` search param.

**Option B — a separate `/[locale]/share/verse/[surah]/[ayah]` route**
A new route outside the Quran page tree whose only job is per-verse OG tags and a
redirect to the canonical reader URL. Share targets link here instead of the
reader directly.

## Decision

Option B — a dedicated `/[locale]/share/verse/[surah]/[ayah]` route owns per-verse
Open Graph metadata. The Quran page routes keep zero `generateMetadata`; the
Static Generation Strategy is untouched. The share route uses on-demand ISR with
`export const revalidate = 300` (same bound and rationale as ADR 0035),
`dynamicParams = true`, and no `generateStaticParams` — so it never adds 6236×2
pages to the build. Its component renders a `<meta http-equiv="refresh">` plus a
script redirect and a plain `<a>` fallback to
`/{locale}/pages/{page}?highlight={verseKey}&highlight-type=selection`; it never
calls the server `redirect()` helper, which would return a 307 with no body and
strip the head before a crawler reads it. The verse text travels in
`og:description` / `twitter:description` (`Verse.text_uthmani` with U+06DE
stripped — standard Unicode, rendered by the consuming platform); `twitter:card`
is `summary` and `og:image` falls back to the app icon. **No per-verse OG image**
— `next/og`/Satori cannot shape Arabic (tried UthmanicHafs1Ver18, Noto Naskh
Arabic, IBM Plex Sans Arabic — all reversed word order or dropped joins), and a
real verse-card pipeline (headless-browser screenshot or deploy-time pre-gen) is
deferred to its own task. Invalid surah/verse → `notFound()`.

## Consequences

- **+** Verse text appears in every platform preview card (Facebook, LinkedIn,
  WhatsApp, Telegram, X) via `og:description`, not just the two that were broken.
- **+** The Static Generation Strategy and the "no `generateMetadata` on Quran
  routes" constraint stay intact — the dynamic surface is a separate, cheap route.
- **+** Bounded `revalidate` caps CDN staleness the same way as the reader routes;
  no build-time blowup from pre-rendering every verse.
- **-** The URL users see and paste is `/share/verse/...`, not the reader URL —
  mitigated by an instant redirect that preserves the highlight params.
- **-** The card shows no verse image — only the description carries the verse —
  because Satori's Arabic shaping is unusable; a proper verse card is a separate
  deferred task. Previews are only fully verifiable against a deployed URL
  (LinkedIn's crawler cannot reach `localhost`).
- **-** Two OG code paths now exist — the root static block for every other route,
  and this one route's dynamic block.
