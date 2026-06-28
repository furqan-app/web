# Database Standards

## Stack

- **MySQL** on port **3307** (non-standard — always check `.env.local`).
- **Prisma ORM** for all queries. Raw `mysql2` connection is exported from `app/utils/db.ts` but should rarely be needed.
- **Prisma client:** import from `@/app/utils/db` — `import { prisma } from "@/app/utils/db"`.

## Key Schema Facts

### Chapter.pages
Stored as `"startPage-endPage"` string (e.g. `"1-21"`). **Not an array.**

```ts
const startPage = chapter.pages.split('-')[0]; // "1"
```

### PageMetadata
Per-page structural info. Key fields:
- `surah_id` — first surah starting on the page, or the continuing surah
- `page_surahs` — dash-separated chapter IDs of all surahs on the page
- `juz_number`
- `hizb_number`
- `hizb_position` — `null` (no new rub) or `"hizb"` | `"hizb-quarter"` | `"hizb-half"` | `"hizb-three-quarters"`

### Mark
User marks at verse or word granularity:
- `marked_type`: `"verse"` | `"word"`
- `mark_type`: `"note"` | `"highlight"`
- `mark_value`: text (for notes) or color (for highlights)
- `from_user` / `to_user`: both set to the authenticated user's ID (self-marks only for now)

## Query Patterns

### Parallel fetches
```ts
const [words, pageMetadata] = await Promise.all([
  prisma.word.findMany({ ... }),
  prisma.pageMetadata.findUniqueOrThrow({ ... }),
]);
```

### Upsert pattern (marks)
```ts
await prisma.mark.upsert({
  where: { marked_type_marked_id_mark_type_to_user: { ... } },
  update: { mark_value },
  create: { ... },
});
```

### Include relations
Use `include` for eager-loading relations. Avoid N+1 — fetch in one query.

## Connection Limits

The Prisma client is configured with `connection_limit: 5` (set in `app/utils/db.ts`) to avoid overwhelming the DB in serverless/edge contexts.

## Migrations

Run via Prisma CLI. The companion scraper project (`furqan-app/scraper`) handles initial data loading and schema preparation. Do not modify schema without checking whether the scraper also needs updating.
