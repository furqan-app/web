# Store Static Page Metadata in Database

**Status:** implemented

## Summary

Move page metadata computation (surah, juz, hizb) from `QuranSafha.tsx` render-time (`getPageInfo()`) into the data layer (seeder), stored in a new `page_metadata` table.

## Schema

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

Add `pageMetadata PageMetadata[]` relation to `Chapter`.

**Field logic:**
- `surah_id`: first surah starting on the page (verse_number=1, word position=1); fallback to continuing surah.
- `page_surahs`: all distinct chapter_ids on the page, dash-separated.
- `juz_number`, `hizb_number`, `hizb_position`: from the last verse on the page. `hizb_position` = `hizb_number * 4 - rub_el_hizb_number` → 3="quarter", 2="half", 1="three-quarters", 0="hizb".

## Files Changed

- `prisma/schema.prisma` — new `PageMetadata` model, relation on `Chapter`
- `scripts/quran-seed/` — compute and insert `page_metadata` after verses/words
- `app/hooks/get-page-words.ts` — add parallel `pageMetadata.findUnique` call; return `{ lines, pageMetadata }`
- `app/[locale]/pages/[id]/page.tsx` — destructure `pageMetadata`, pass to `QuranSafha`
- `app/components/QuranSafha.tsx` — accept `pageMetadata` prop; remove `getPageInfo()` entirely; use `pageMetadata` in header
- `app/types/prisma.ts` — add `PageMetadataWithChapter` type
