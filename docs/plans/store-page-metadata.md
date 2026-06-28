# Plan: Store Static Page Metadata in Database — COMPLETE

## Context
`QuranSafha.tsx` computes page metadata (surah, juz, hizb) on every render via `getPageInfo()`. This logic belongs in the data layer (scraper), not the display layer. The scraper owns Quran structural knowledge; the app should just display what's in the DB.

## Schema Change

New Prisma model in `prisma/schema.prisma`:

```prisma
model PageMetadata {
  id             Int     @id @default(autoincrement())
  page_number    Int     @unique
  surah_id       Int
  page_surahs    String  // dash-separated chapter IDs, e.g. "112-113-114"
  juz_number     Int
  hizb_number    Int
  hizb_position  String  // "hizb" | "quarter" | "half" | "three-quarters"
  chapter        Chapter @relation(fields: [surah_id], references: [id])

  @@map("page_metadata")
}
```

Add `pageMetadata PageMetadata[]` relation field to `Chapter` model.

### Field logic (replicate current `getPageInfo()`):
- **surah_id**: First surah that starts on the page (verse_number=1, word position=1). If none starts, use the continuing surah.
- **page_surahs**: All distinct chapter_ids on the page, dash-separated.
- **juz_number, hizb_number, hizb_position**: Derived from the last verse on the page. `hizb_position` = string based on `hizb_number * 4 - rub_el_hizb_number` (3="quarter", 2="half", 1="three-quarters", 0="hizb"). Value 3 means the start (first quarter) of a hizb; value 0 means the end (completion) of a hizb — so page 1 yields "Quarter Hizb 1" and the last page yields "Hizb 60".

## Changes

### 1. Scraper: `quran-scrapper/quran_scraper.js`

- Add `CREATE TABLE IF NOT EXISTS page_metadata` in `createDatabaseTables()`
- After processing all verses/words for a page, compute and insert page metadata:
  - Iterate verses to find surah_id (first verse with verse_number=1, or fallback to last verse's chapter_id)
  - Collect all distinct chapter_ids for page_surahs
  - Use last verse's juz_number, hizb_number, and compute hizb_position string
  - INSERT into page_metadata

### 2. Prisma schema: `prisma/schema.prisma`

- Add `PageMetadata` model (as above)
- Add relation field to `Chapter`

### 3. Extend getPageWords: `app/hooks/get-page-words.ts`

- Add parallel Prisma call for `pageMetadata.findUnique({ where: { page_number }, include: { chapter: true } })`
- Return `{ lines, pageMetadata }` instead of just lines
- Update return type accordingly

### 4. Update page route: `app/[locale]/pages/[id]/page.tsx`

- Destructure `{ lines, pageMetadata }` from `getPageWords()`
- Pass `pageMetadata` as prop to `QuranSafha`

### 5. Clean up QuranSafha: `app/components/QuranSafha.tsx`

- Add `pageMetadata` to props type
- Remove `getPageInfo()` function entirely (lines 69-137)
- Replace the header rendering to use `pageMetadata` directly with translation keys:
  - `surahName`: `t("surah") + " " + (locale === "ar" ? pageMetadata.chapter.name_arabic : pageMetadata.chapter.name_simple)`
  - `juz`: `t("juz") + " " + pageMetadata.juz_number`
  - `hizb`: `t(pageMetadata.hizb_position) + " " + pageMetadata.hizb_number`
- Remove unused imports (`Chapter` type if no longer needed)

### 6. Update types: `app/types/prisma.ts`

- Add `PageMetadataWithChapter` type for the eager-loaded page metadata

## Verification

1. Run the scraper against the DB to populate `page_metadata` table
2. Run `npx prisma db pull` or update schema manually, then `npm run prisma-generate`
3. `npm run build` — all 604 pages should statically generate with correct surah/juz/hizb headers
4. Spot-check a few known pages visually (e.g. page 1 = Al-Fatiha, page 604 = An-Nas, a page with multiple surahs)
5. `npm run lint` — no errors
