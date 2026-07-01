# Quran Text Rendering Standards

See also: [ADR 0002](../architecture/adr/0002-non-page-quran-text-rendering.md)

## Column–Font Contract

Every rendering context has one correct column and one correct font. Never mix across rows.

| Context | Column | Font class | Font source |
|---|---|---|---|
| Word on Quran page | `word.code_v1` | `font-family: quran-p{pageId}` | Per-page TTF, loaded inline on page route |
| Word outside page (modal, search) | `word.qpc_uthmani_hafs` | `font-uthmanic` | `UthmanicHafs1Ver18`, globally loaded |
| Verse (any context) | `verse.text_uthmani` | `font-uthmanic` | `UthmanicHafs1Ver18`, globally loaded |
| Surah name | Zero-padded surah number e.g. `"001"` | `font-surahnames` | `sura_names.ttf`, globally loaded |

## Rendering Contexts

### 1. Quran Page Word

Used only inside `app/[locale]/pages/[id]/page.tsx`.

```tsx
<span style={{ fontFamily: `quran-p${pageId}` }}>
  {word.code_v1}
</span>
```

- Never use `code_v1` outside this route — the font is not loaded elsewhere.
- Never use `qpc_uthmani_hafs` here — it requires the UthmanicHafs font, not the per-page glyph font.

### 2. Word Outside Page Context

Used in mark modal, search results, tooltips, or any component that displays a word independently.

```tsx
<span className="font-uthmanic" dir="rtl">
  {word.qpc_uthmani_hafs}
</span>
```

- Use `word.qpc_uthmani_hafs`, not `word.text_uthmani` or `word.code_v1`.
- `font-uthmanic` must be declared in `tailwind.config.ts` (the CSS variable alone is not enough for Tailwind class usage).

### 3. Standalone Verse (joined from words)

Used in search results or any non-page verse display. Never use `verse.text_uthmani` directly — it contains rub el hizb markers (۞ U+06DE) that the font cannot render.

```tsx
<p className="font-uthmanic text-right" dir="rtl">
  {verse.Word
    .filter(w => w.char_type_name === 'word')
    .map(w => w.qpc_uthmani_hafs)
    .join(' ')}
</p>
```

- `Verse` has no `qpc_uthmani_hafs` column — always reconstruct verse text by joining words.
- Filter to `char_type_name === 'word'` to exclude rub el hizb and other markers.

### 4. Verse-Level Display (when words are unavailable)

When only the `Verse` model is available (e.g. MarkModal receiving a `Verse`):

```tsx
<p className="font-uthmanic text-right" dir="rtl">
  {verse.text_uthmani}
</p>
```

- `UthmanicHafs1Ver18` supports standard Unicode Arabic — `text_uthmani` will render correctly except for rub el hizb markers.

### 5. Surah Name

```tsx
<span className="font-surahnames">
  {String(chapter.id).padStart(3, '0')}
</span>
```

- Pass the zero-padded chapter ID, not `chapter.name_arabic` — the font maps numbers to calligraphic glyphs.

## Common Mistakes

| Mistake | Why it breaks |
|---|---|
| `verse.text_uthmani` in search results | Contains ۞ (U+06DE) rub el hizb markers the font can't render — join words instead |
| `word.text_uthmani` + `font-uthmanic` | `UthmanicHafs1Ver18` is optimised for `qpc_uthmani_hafs`; `text_uthmani` lacks proper glyph coverage |
| `word.code_v1` outside the page route | Per-page font not loaded — renders as random characters |
| Per-page font (`quran-p{n}`) in a modal | Font is not available outside the page route |
| `chapter.name_arabic` + `font-surahnames` | Font maps numbers to glyphs, not Arabic text — pass zero-padded ID |
| Relying on inherited `dir` for Quran text | Always set `dir="rtl"` explicitly |
