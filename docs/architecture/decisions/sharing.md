# Sharing — Decisions

Active decisions for Open Graph / social metadata. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Root-Layout Open Graph / Social Metadata

**Status:** active

**Decision:** `app/layout.tsx`'s root `metadata` export carries static `openGraph`/`twitter` fields (title, description, `icon-512.png` as the preview image) plus a `metadataBase: new URL("https://furqan.app")`. This one static block is inherited app-wide. The single exception is `app/[locale]/share/verse/[surah]/[ayah]/` — a dedicated route (outside the Quran page tree) with per-verse `generateMetadata` (verse text in `og:description`; `og:image` falls back to the app icon — no per-verse image, Satori can't shape Arabic), on-demand ISR (`revalidate = 300`, `dynamicParams = true`, no `generateStaticParams`), and a meta-refresh redirect to the canonical reader URL. See [ADR 0050](../adr/0050-per-verse-open-graph-share-route.md). All MarkModal share targets link to this route.

**Rationale:** LinkedIn's `sharing/share-offsite` and Facebook's `sharer.php` both stopped accepting title/text/summary URL params years ago — they scrape Open Graph tags from the target URL server-side and show an error/blank card when none exist. The app had zero OG tags anywhere before the root block, which is why LinkedIn sharing (added in `docs/plans/copy-share-verses.md`) errored. `metadataBase` is required for Next to resolve the image path to an absolute URL. The root static block was the minimum fix; the `/share/verse` route (ADR 0050) then added per-verse `og:description` without touching the Static Generation Strategy — the dynamic metadata lives on a separate cheap route, not on the 604 statically-generated Quran pages. A rendered verse image was attempted and dropped (Satori can't shape Arabic); a real verse-card renderer is a deferred task.

**Constraints:**
- Do not add per-route `generateMetadata` for Open Graph on any route *other than* `/share/verse/*` without checking whether the static root block already covers the need — a dynamic per-request metadata function on a page under the Static Generation Strategy (above) risks opting that route out of static rendering.
- The `/share/verse` route must never use the server `redirect()` helper — it returns a 307 with no body and strips the head before a crawler reads the OG tags. Use `<meta http-equiv="refresh">` + a script redirect + a plain `<a>` fallback.
- `metadataBase` must stay a real `https://furqan.app` URL — a relative or `localhost` base silently breaks absolute image URLs in production builds.
- LinkedIn's crawler cannot reach `localhost`; OG/share-preview behavior for LinkedIn specifically can only be verified against a deployed/public URL, never local dev.
