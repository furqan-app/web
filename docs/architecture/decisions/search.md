# Search — Decisions

Active decisions for search. Part of `docs/architecture/decisions/`; always-loaded index is [`../DECISIONS.md`](../DECISIONS.md).

---

## Search

**Status:** active

**Decision:** `/api/search/verses` and `/api/search/chapters` cap results to `take: 10` with a deterministic `orderBy: { id: 'asc' }`, and both the client (`useSearch`, `SearchBar`) and the API routes themselves require the trimmed query to be 2+ characters before searching (`app/constants/search.ts`'s `isSearchQueryValid`). `SearchBar` listens globally for `Cmd+K` / `Ctrl+K` key combinations to toggle the search overlay on desktop. `/api/search/chapters` parses numeric queries (normalizing Eastern Arabic digits `٠-٩` to Western `0-9`) to match chapter `id` directly for valid numbers 1–114 alongside Arabic and simple names.

**Rationale:** The verse search eager-loads each matching verse's full `Word[]` array; without a cap, a common search term could return a very large payload whose render blocks the main thread right as the (500ms-debounced) result lands — felt as input lag, not a debounce bug. The min-length gate must be enforced server-side too, not just client-side, so a direct API call can't bypass it. See `docs/plans/fix-search-debounce-lag.md`. Keyboard shortcuts and numeric chapter lookups enable rapid navigation and discovery without requiring manual mouse targeting.

**Constraints:**
- Any new search endpoint added later should follow the same cap + min-length pattern, using `isSearchQueryValid` from `app/constants/search.ts` rather than re-deriving the threshold.
- Do not remove the `take`/`orderBy` pair or the query-length gate as a "cleanup" — they are load-bearing for perceived typing responsiveness, not arbitrary.
- `take: 10` is a UI-payload cap, not a hard ceiling on search capability — a "see all results" affordance to escape it is a known, deliberately deferred future addition (not yet built).
- `Cmd+K` / `Ctrl+K` keydown listener in `SearchBar.tsx` must always check for both `metaKey` (macOS) and `ctrlKey` (Windows/Linux) and call `e.preventDefault()`.

**Arabic query normalization:** `Verse.text_imlaei_simple` is sourced from the upstream `qdc` API and is confirmed hamza-free across the entire table — it never contains `أ`/`إ`/`آ`, only bare `ا`. Verse search normalizes the incoming query (hamza-alif variants → bare alif) before the Prisma `contains` match; the column itself is never touched. See [ADR 0007](../adr/0007-arabic-search-query-normalization.md).

**Home navigation filter (2026-08-25, #363):** the home page's client-side surah filter (`app/utils/nav-search.ts`) folds hamza-on-alif forms on **both** sides at compare time — a deliberate divergence from the overlay's strict chapter `contains`, allowed because both sides are in-memory strings there (no DB column semantics involved). Do not port this fold into `/api/search/chapters`; that endpoint keeps strict matching and its accepted mismatch.

**Constraints:**
- `Chapter.name_arabic` is real Arabic text and is **not** hamza-free (e.g. `الأنعام`) — the query-only normalization used for verse search does not apply to chapter search. This is an accepted characteristic, not a defect: chapter names are a small (114), low-cardinality list users can select visually rather than type from memory. Do not assume chapter search shares verse search's normalization behavior.
- Do not extend query-only normalization to any column that isn't verified hamza-free; check the actual DB data first (see ADR 0007 Option A vs B).
