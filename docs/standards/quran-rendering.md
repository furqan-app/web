# Quran Text Rendering Standards

See also: [ADR 0002](../architecture/adr/0002-non-page-quran-text-rendering.md)

## Column–Font Contract

Every rendering context has one correct column and one correct font. Never mix across rows.

| Context | Column | Font class | Font source |
|---|---|---|---|
| Word on Quran page | `word.code_v1` | `font-family: quran-p{pageId}` | Per-page TTF, loaded inline on page route |
| Word outside page (modal, search) | `word.text_uthmani` | `font-uthmanic` | `uthmanic.ttf`, globally loaded |
| Verse (any context) | `verse.text_uthmani` | `font-uthmanic` | `uthmanic.ttf`, globally loaded |
| Surah name | `chapter.name_arabic` | `font-surahnames` | `sura_names.ttf`, globally loaded |

## Rendering Contexts

### 1. Quran Page Word

Used only inside `app/[locale]/pages/[id]/page.tsx`.

```tsx
// Font is loaded per-page and scoped to that route
<span style={{ fontFamily: `quran-p${pageId}` }}>
  {word.code_v1}
</span>
```

- Never use `code_v1` outside this route — the font is not loaded elsewhere.
- Never use `text_uthmani` here — it will render in the wrong typeface.

### 2. Word Outside Page Context

Used in mark modal, search results, tooltips, or any component that displays a word independently.

```tsx
<span className="font-uthmanic" dir="rtl">
  {word.text_uthmani}
</span>
```

- Use `word.text_uthmani`, not `word.qpc_uthmani_hafs` or `word.code_v1`.
- `font-uthmanic` must be declared in `tailwind.config.ts` (the CSS variable alone is not enough for Tailwind class usage).

### 3. Standalone Verse

Used in search results, verse previews, share cards, or any non-page verse display.

```tsx
<p className="font-uthmanic text-right" dir="rtl">
  {verse.text_uthmani}
</p>
```

- `Verse` has no `qpc_uthmani_hafs` column — `text_uthmani` is the only option at verse level.

### 4. Surah Name

```tsx
<span className="font-surahnames">
  {chapter.name_arabic}
</span>
```

## Common Mistakes

| Mistake | Why it breaks |
|---|---|
| `word.qpc_uthmani_hafs` + `font-uthmanic` | `uthmanic.ttf` has no PUA glyphs — renders as boxes or blanks |
| `word.code_v1` outside the page route | Per-page font not loaded — renders as random characters |
| Per-page font (`quran-p{n}`) in a modal | Font is not available outside the page route |
| Relying on inherited `dir` for Quran text | Always set `dir="rtl"` explicitly |
