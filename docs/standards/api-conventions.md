# API Conventions

## Route Structure

All API routes live under `app/api/`. Route files export named functions for each HTTP method:

```
app/api/quran/pages/[pageId]/route.ts       → GET /api/quran/pages/:pageId
app/api/quran/pages/[pageId]/marks/route.ts → GET/POST /api/quran/pages/:pageId/marks
app/api/search/verses/route.ts              → GET /api/search/verses
app/api/search/chapters/route.ts            → GET /api/search/chapters
app/api/auth/[...nextauth]/route.ts         → NextAuth handler
```

## Response Shape

All routes must use `jsonResponse()` from `@/app/api/response`:

```ts
import { jsonResponse } from "@/app/api/response";

return jsonResponse({ data: marks });                          // success
return jsonResponse({ code: 422, message: "Missing fields" }); // error
return jsonResponse({ code: 404, message: "Not found" });
```

The envelope is always:
```json
{ "data": ..., "success": true|false, "error": ..., "code": 200, "message": ... }
```

The legacy page words route (`/api/quran/pages/[pageId]`) returns raw `NextResponse.json()` — do not copy that pattern.

## Auth in API Routes

`auth-middleware` in `middleware.ts` enforces auth and injects the user as a JSON-stringified `user` header. Read it with:

```ts
import { extractUser } from "@/app/api/request";

const user = extractUser(request); // { id, email, name, ... }
```

Do not call `getServerSession()` inside API route handlers.

## Adding a Protected Route

1. Implement the route handler as normal.
2. Add the route path pattern to the matcher regex in `app/middlewares/auth-middleware.ts`.
3. Update the `DECISIONS.md` middleware section if the pattern changes structurally.

## Input Validation

Validate required body fields before touching the DB. Return `422` with a `message` on failure:

```ts
const { field1, field2 } = await request.json();
if (!field1 || !field2) {
  return jsonResponse({ code: 422, message: "Missing required fields" });
}
```

## Query Parameters

Read via `request.nextUrl.searchParams`:

```ts
const query = request.nextUrl.searchParams.get("q") ?? "";
```

## Error Handling

Only catch errors you can handle meaningfully (e.g. `Prisma.NotFoundError` → `404`). Others propagate to Next.js error boundaries.
