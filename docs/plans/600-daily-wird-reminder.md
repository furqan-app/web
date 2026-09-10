---
title: "Awrad Notifications: turn on the daily wird reminder — enqueue layer, content-aware dispatch & per-user time picker"
type: feature
date: 2026-09-11
status: implemented
area: awrad
issue: 600
---

# Awrad Notifications: turn on the daily wird reminder — enqueue layer, content-aware dispatch & per-user time picker

> Visual mockup: [`600-daily-wird-reminder.mockup.html`](600-daily-wird-reminder.mockup.html)

## 1. Current State & Gap Analysis

The base notification infrastructure in Furqan was delivered in [ADR 0037](../adr/0037-notification-dispatch-and-channels.md) and is already active and functional. Specifically, the following systems exist today and **must not be rebuilt**:

- **Database Models (`prisma/app/schema.prisma`):**
  `Notification`, `NotificationDelivery`, `PushSubscription`, and `ScheduledNotification`. The `ScheduledNotification` table already includes `claim_id` and `locked_at` for concurrent-safe worker polling, `recurrence`, `timezone`, and `dedupe_key`.
- **Cron Polling Route (`app/api/cron/reminders/route.ts`):**
  A secret-guarded Route Handler (`x-cron-secret` timing-safe comparison) that claims due batches using a 10-minute lease timeout, invokes `dispatchNotification`, and computes subsequent recurrence via `nextOccurrence`.
- **Dispatch Orchestration (`app/lib/notifications/dispatch.ts`):**
  A dependency-injected dispatcher coordinating `resolveChannels`, persistence, rendering, and resilient delivery via `Promise.allSettled`.
- **Delivery Channels (`app/lib/notifications/channels/`):**
  `in_app.ts` (persists feed row), `push.ts` (Web Push via `web-push` SDK with automatic stale subscription cleanup on 404/410), and `email.ts` (Nodemailer SMTP transport with log fallback).
- **Client Web Push UI:**
  `app/components/notifications/EnablePushToggle.tsx` and `app/hooks/use-push-subscription.ts`, mounted in `app/components/SettingsSidebar.tsx`.

### The Three Critical Gaps

Despite having this working foundation, the daily wird reminder is inert due to three specific missing pieces:

1. **Empty Scheduled Table:**
   Nothing in the application ever inserts or schedules a `plans.daily_reminder` row in `scheduled_notifications`. The table remains empty in all environments.
2. **Static Placeholder Content & Rigid Deep Link:**
   `NOTIFICATION_TYPES["plans.daily_reminder"]` in `app/constants/notifications.ts` defines a legacy payload (`PlanDailyReminderPayload { planId, templateKey, templateLabel }`) that describes only a single template. It renders a generic string (`"Your {{template}} assignment for today is ready."`), always points to `/plans`, does not reflect live active wird assignments, and does not check if the user has already completed today's wird.
3. **Missing Ops Keys & Scheduler Documentation:**
   Neither `.env.example` nor deployment guides document `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `CRON_SECRET`, or the SMTP environment variables. No runbook exists describing how to configure Hostinger hPanel Cron Jobs to hit `/api/cron/reminders`.

---

## 2. Data Model & Schema Migration (D8)

### Row Specification for `plans.daily_reminder`

Per **D1**, a user receives **one** consolidated daily reminder regardless of how many active plans they follow. The scheduled notification row follows these specifications:

- `user_id`: Scalar user ID (`Int`).
- `type`: `"plans.daily_reminder"`.
- `recurrence`: `"daily"`.
- `dedupe_key`: `"plans.daily_reminder:<userId>"`.
  *Note:* This key is **stable across reschedules**. There is only one persistent row per user. When claimed and processed by the cron runner, the exact same row's `scheduled_for` is advanced to the next day via `nextOccurrence`; it is **not** recreated per date.
- `timezone`: Client-resolved IANA timezone (e.g., `"Africa/Cairo"`), captured at enqueue time.
- `locale`: User's interface locale (e.g., `"ar"` or `"en"`), captured at enqueue time.
- `channels`: `["in_app", "push"]` (per **D7** — email is excluded to avoid daily inbox clutter).
- `status`: `"pending"` (values: `pending` | `dispatched` | `cancelled` | `failed`).
- `payload`: In `ScheduledNotification`, stores preference metadata: `{"time": "08:30"}` (wall-clock time in 24-hour format).

### Dispatched Notification Payload (`PlanDailyReminderPayload`)

When dispatched, the notification persisted to `notifications` carries **structured, language-neutral data only — never human sentences**.

```ts
export type PlanDailyReminderPayload = {
  pendingCount: number;
  primary: {
    unit: "page" | "verse";
    rangeStart: number;
    rangeEnd: number;
    startVerseKey?: string; // e.g. "4:23"
    endVerseKey?: string;   // e.g. "4:60"
  } | null;
  targetPage: number | null; // mushaf page (1–604) for single-assignment deep link, null if multiple/ambiguous
  targetUrlKind: "page" | "plans";
};
```

This strict separation ensures that:
- **Push Delivery (Cron):** Renders the notification body and title using the row's captured `locale` (D8) via `typeDef.render(payload, cronRenderContext)`.
- **In-App Notification Feed (`app/api/notifications/route.ts`):** Renders at **read time** using the viewer's live session request locale via `typeDef.render(item.payload, requestRenderContext)`. An Arabic notification read during an English session displays proper English, and vice versa.
- **Deep Link:** The URL is rebuilt dynamically as `/${ctx.locale}/pages/${payload.targetPage}` or `/${ctx.locale}/plans` rather than being baked into the payload as a static locale path.

### D8 Schema Analysis: Dedicated Column vs. Payload

**Decision:** Add a dedicated `locale` column to `ScheduledNotification` in `prisma/app/schema.prisma`.

#### Justification Against Migration Conventions:
1. **Structural Symmetry with `timezone`:** `ScheduledNotification` is an infrastructure-level queue table. Just as `timezone` is a top-level column needed by the scheduler to compute `nextOccurrence` without parsing payload JSON, `locale` is required by `app/api/cron/reminders/route.ts:59` to construct `Recipient.locale` for `dispatchNotification`.
2. **Elimination of Hardcoded Fallback:** The existing cron route currently contains the comment:
   ```ts
   // No per-user locale column exists yet (deferred, see plan) — default
   // "ar" per the app's i18n decision.
   ```
   Adding a top-level `locale` column directly resolves this acknowledged technical debt for all current and future scheduled notifications.
3. **Migration Precedent:** Recent migrations (e.g., `20260909001802_add_user_plan_custom_definition` adding `definition` and `name` to `user_plans`) show that schema extensions in `furqan_app` are clean, nullable column additions executed via versioned Prisma migrations.

#### Migration Specification:
- **Migration Name:** `20260911000000_add_scheduled_notification_locale`
- **Path:** `prisma/app/migrations/20260911000000_add_scheduled_notification_locale/migration.sql`
- **SQL Shape:**
  ```sql
  -- AlterTable
  ALTER TABLE `scheduled_notifications` ADD COLUMN `locale` VARCHAR(191) NULL;
  ```

#### Prisma Schema Update (`prisma/app/schema.prisma`):
```prisma
model ScheduledNotification {
  id             Int       @id @default(autoincrement())
  user_id        Int
  type           String
  payload        Json
  channels       Json?
  scheduled_for  DateTime
  recurrence     String? // null = one-shot, "daily"
  timezone       String? // IANA, e.g. "Africa/Cairo"
  locale         String? // e.g. "ar" | "en"
  status         String    @default("pending") // pending | dispatched | cancelled | failed
  dedupe_key     String?   @unique
  claim_id       String?
  locked_at      DateTime?
  dispatched_at  DateTime?
  last_error     String?   @db.Text
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt

  @@index([status, scheduled_for])
  @@map("scheduled_notifications")
}
```

#### TypeScript Types Update (`app/lib/notifications/types.ts`):
Update `ScheduledReminderRow`:
```ts
export type ScheduledReminderRow = {
  id: number;
  user_id: number;
  type: string;
  payload: unknown;
  channels: NotificationChannelKey[] | null;
  scheduled_for: Date;
  recurrence: string | null;
  timezone: string | null;
  locale: string | null;
  updated_at?: Date;
};
```
Update `NotificationStore`:
- `upsertScheduledReminder` accepts `locale?: string | null`.
- `rescheduleReminder` accepts `(id, nextScheduledFor, lastError?, expectedUpdatedAt?)` to support optimistic concurrency against concurrent user mutations.


---

## 3. Enqueue Layer

### Module Path & Responsibilities
A new service module `app/lib/notifications/wird-reminder.ts` manages the lifecycle of the user's daily wird reminder.

### Signatures & Types

```ts
export type WirdReminderPreference = {
  enabled: boolean;
  time: string; // "HH:MM" (15-minute boundary: "08:00", "08:15", etc.)
  timezone: string;
  locale: string;
  scheduledFor: Date | null;
};

export type SetWirdReminderInput = {
  userId: number;
  time: string; // "HH:MM"
  timezone: string;
  locale: string;
};

/** Retrieves the current active daily reminder preference for a user. */
export async function getDailyWirdReminder(
  userId: number,
  store: NotificationStore
): Promise<WirdReminderPreference>;

/** Creates or updates the daily wird reminder row idempotently. */
export async function setDailyWirdReminder(
  input: SetWirdReminderInput,
  store: NotificationStore,
  clock?: Clock
): Promise<{ id: number; scheduledFor: Date }>;

/** Cancels the daily wird reminder row. */
export async function cancelDailyWirdReminder(
  userId: number,
  store: NotificationStore
): Promise<void>;
```

### Computing the Initial `scheduled_for`

To compute the first UTC `scheduled_for` timestamp without duplicating complex calendar and DST arithmetic:
1. Parse `input.time` into `targetHour` and `targetMinute`.
2. Determine today's local date parts (`year`, `month`, `day`) in the user's `timezone` using `Intl.DateTimeFormat`.
3. Construct a seed `Date` representing today's target wall-clock time in that timezone.
4. Compare `seedDate` to `now = clock()`:
   - If `seedDate >= now`: The time has not yet passed today (or matches the current minute). First `scheduled_for = seedDate`.
   - If `seedDate < now`: The time has already passed today. Advance to tomorrow by calling:
     ```ts
     scheduledFor = nextOccurrence(seedDate, "daily", input.timezone, now);
     ```
   This guarantees that `nextOccurrence` from `app/lib/notifications/reminders.ts` is the single source of truth for all daily progressions and DST corrections. Annual IANA spring-forward / fall-back transitions are absorbed naturally by `nextOccurrence` constructing target wall-clock dates in the target timezone.

### Idempotency & Repository Update Fix

In `app/lib/notifications/repository.ts`, `upsertScheduledReminder` previously used `update: {}` when a row matched `dedupe_key`.

**Required Fix:** Update `app/lib/notifications/repository.ts` so `update` actively applies the new schedule and resets the lifecycle, while preserving any active worker lease:
```ts
const isActivelyLeased =
  existing &&
  existing.locked_at !== null &&
  existing.locked_at.getTime() > now.getTime() - LEASE_DURATION_MS;

update: {
  scheduled_for: scheduledFor,
  timezone: timezone ?? null,
  locale: locale ?? null,
  payload: payload as object,
  channels: (channels ?? null) as unknown as object,
  status: "pending",
  // Preserve claim_id and locked_at if an in-flight cron lease is active,
  // preventing concurrent cron workers from double-claiming.
  claim_id: isActivelyLeased ? existing.claim_id : null,
  locked_at: isActivelyLeased ? existing.locked_at : null,
  last_error: null,
}
```


### Cancellation Semantics
`cancelDailyWirdReminder` updates the row matching `dedupe_key = "plans.daily_reminder:<userId>"` to `status: "cancelled"`, clearing `claim_id` and `locked_at`. This leaves audit history intact while ensuring `claimDueReminders` (which filters strictly by `status: "pending"`) never picks it up. Re-enabling the reminder simply upserts the same row back to `status: "pending"` with the new target time.

---

## 4. API Endpoints

A new Route Handler `app/api/notifications/daily-reminder/route.ts` provides client access to read and update the reminder preference.

### `GET /api/notifications/daily-reminder`
Retrieves the authenticated user's current reminder status.

- **Authentication:** Verified via `extractUser(request)`. Returns `401 Unauthorized` if no session exists.
- **Response (200 OK):**
  ```json
  {
    "data": {
      "enabled": true,
      "time": "08:30",
      "timezone": "Africa/Cairo",
      "locale": "ar"
    }
  }
  ```
  If no pending reminder row exists, returns:
  ```json
  {
    "data": {
      "enabled": false,
      "time": "08:00",
      "timezone": null,
      "locale": null
    }
  }
  ```

### `POST /api/notifications/daily-reminder`
Updates or disables the reminder.

- **Authentication:** Verified via `extractUser(request)`. Returns `401 Unauthorized` if unauthenticated.
- **Request Body:**
  ```json
  {
    "enabled": true,
    "time": "08:30",
    "timezone": "Africa/Cairo",
    "locale": "ar"
  }
  ```
- **Validation Rules & 422 Unprocessable Entity:**
  1. `enabled` must be a boolean. If missing or non-boolean → `422 "Invalid or missing 'enabled' flag"`.
  2. If `enabled === true`:
     - `time` must be provided and match `/^(0[0-9]|1[0-9]|2[0-3]):(00|15|30|45)$/`.
       - If invalid regex or non-15-minute step → `422 "Time must be in HH:MM format on a 15-minute step (e.g. 08:00, 08:15)"`.
     - `timezone` must be a valid IANA timezone string verified via `Intl.DateTimeFormat(undefined, { timeZone })`.
       - If invalid → `422 "Invalid IANA timezone identifier"`.
     - `locale` must be either `"ar"` or `"en"` (validated against `routing.locales`).
       - If invalid → `422 "Unsupported locale"`.
  3. If `enabled === false`:
     - Calls `cancelDailyWirdReminder(user.id, store)`.
- **Response (200 OK):**
  ```json
  {
    "data": {
      "success": true,
      "enabled": true,
      "time": "08:30",
      "scheduledFor": "2026-09-11T05:30:00.000Z"
    }
  }
  ```

---

## 5. Dispatch-Time Rendering, Plural Support & The Skip Guard (D2, D3)

This is the architectural core of Issue #600.

### Architectural Evaluation: Verdict Hook vs. Pre-Dispatch Resolution

| Dimension | Option A: `shouldSend` Verdict Hook on `NotificationTypeDef` | Option B: Pre-Dispatch Resolver in `cron/reminders/route.ts` |
|---|---|---|
| **ADR 0037 Invariant** | **Violated:** Requires modifying `dispatch.ts` to check verdicts and handle rescheduling. ADR 0037 states: *"dispatch.ts is never edited when adding or tuning types."* | **Preserved:** `dispatch.ts` remains completely untouched. Only the cron route evaluates eligibility prior to calling dispatch. |
| **Client Bundling & Safety** | **Violated:** `NOTIFICATION_TYPES` in `app/constants/notifications.ts` is imported by client UI components. Adding DB queries or plan engines here causes server-module leakage into client bundles. | **Preserved:** `app/constants/notifications.ts` remains a pure TypeScript constant dictionary. All DB and plan derivation logic resides in server modules. |
| **Separation of Concerns** | Conflates one-shot event notifications with recurring scheduled reminders. Immediate notifications do not reschedule on skip. | Cleanly isolates reminder lifecycle management (`claim -> evaluate -> dispatch or skip -> reschedule`) within the cron execution context. |

### Recommendation
**Adopt Option B (Pre-Dispatch Resolution in `app/api/cron/reminders/route.ts`).**
We introduce a dedicated server helper `resolveDailyWirdDispatch` in `app/lib/notifications/wird-reminder-resolver.ts`. The cron route invokes this helper for any claimed row with `type === "plans.daily_reminder"` before calling `dispatchNotification`.

### Structured Payload Generation in `resolveDailyWirdDispatch`

`resolveDailyWirdDispatch` decides **whether to send** and **what data describes the reminder** — **never what words**:

```ts
export type WirdDispatchResolution =
  | { shouldSend: false; reason: "all_completed" | "no_active_plans" }
  | { shouldSend: true; payload: PlanDailyReminderPayload };

export async function resolveDailyWirdDispatch(
  userId: number,
  timezone: string,
  now: Date
): Promise<WirdDispatchResolution> {
  // 1. Determine user's local calendar day "YYYY-MM-DD"
  const localDate = toLocalDateString(now, timezone);

  // 2. Fetch active plans with progress entries
  const plans = await appPrisma.userPlan.findMany({
    where: { user_id: userId, status: "active" },
    include: { progress: true },
    orderBy: { created_at: "asc" },
  });

  if (plans.length === 0) {
    return { shouldSend: false, reason: "no_active_plans" };
  }

  // 3. Derive live assignments for today across all plans
  const allAssignments: TrackAssignment[] = [];
  for (const plan of plans) {
    const template = getEnrollmentTemplate(plan);
    if (!template) continue;
    const entries = plan.progress.map((p) => ({
      track_key: p.track_key,
      date: p.date.toISOString().slice(0, 10),
      range_start: p.range_start,
      range_end: p.range_end,
    }));
    const assignments = deriveAssignments(template, plan.params as any, entries, localDate);
    allAssignments.push(...assignments);
  }

  // 4. Completion Guard (D3): If all completed, skip send entirely
  const pending = allAssignments.filter((a) => !a.completed);
  if (pending.length === 0) {
    return { shouldSend: false, reason: "all_completed" };
  }

  // 5. Structure primary assignment details (neutral data, zero human sentences)
  let primary: PlanDailyReminderPayload["primary"] = null;
  let targetPage: number | null = null;
  let targetUrlKind: PlanDailyReminderPayload["targetUrlKind"] = "plans";

  if (pending.length === 1) {
    const p = pending[0];
    let startVerseKey: string | undefined;
    let endVerseKey: string | undefined;

    if (p.unit === "page") {
      targetPage = p.rangeStart;
    } else if (p.unit === "verse") {
      targetPage = pageOfVerse(p.rangeStart);
      startVerseKey = verseKeyOfOrdinal(p.rangeStart);
      endVerseKey = verseKeyOfOrdinal(p.rangeEnd);
    }

    if (targetPage !== null && targetPage >= 1 && targetPage <= 604) {
      targetUrlKind = "page";
    }

    primary = {
      unit: p.unit,
      rangeStart: p.rangeStart,
      rangeEnd: p.rangeEnd,
      startVerseKey,
      endVerseKey,
    };
  }

  return {
    shouldSend: true,
    payload: {
      pendingCount: pending.length,
      primary,
      targetPage,
      targetUrlKind,
    },
  };
}
```

### Extending `RenderContext` with Plural Selection (`render-context.ts`)

Outside request scope, `next-intl` is unavailable. To support Arabic's grammatical plural categories without duplicating plural logic across individual notification types, `buildRenderContext` in `app/lib/notifications/render-context.ts` is extended with a plural-aware method `tPlural`:

```ts
export type RenderContext = {
  locale: string;
  /** Backward-compatible standard string lookup against messages/<locale>.json with {{var}} interpolation. */
  t: (key: string, fallback: string, vars?: Record<string, string | number>) => string;
  /** Plural-aware category lookup against an object { zero, one, two, few, many, other }. */
  tPlural: (
    key: string,
    count: number,
    fallback: string,
    vars?: Record<string, string | number>
  ) => string;
};
```

#### API Surface Choice: `tPlural` Sibling vs. `t` Overload
We explicitly select a **sibling method `tPlural(key, count, fallback, vars)`** rather than overloading `t`.
**Justification:**
1. **Compile-Time Contract & Type Safety:** With `tPlural(key, count, ...)`, TypeScript enforces that numeric `count` is provided. If `t` were overloaded to detect `vars.count`, a typo (e.g. `vars: { pages: 5 }`) would silently bypass plural selection and drop to `fallback` at runtime.
2. **Separation of Count Driver vs. Localized Numeral:** Per `docs/standards/i18n.md:95`, Arabic numeral policy dictates that numeric `count` drives category selection (`Intl.PluralRules`), while a stringified numeral `n: toLocaleNumeral(count, locale)` is passed in `vars` for Arabic-Indic digit interpolation (`{{n}}`). `tPlural` explicitly separates these two concerns.
3. **Zero Risk to Existing Callers:** Existing `t` call sites in `app/api/notifications/route.ts` and `system.test` remain 100% backward-compatible and untouched.

#### Internal Helper in `render-context.ts`:
Existing `lookup()` returns `undefined` for non-string values. A companion helper `lookupObject` is added:
```ts
const lookupObject = (
  messages: Record<string, unknown>,
  key: string
): Record<string, string> | undefined => {
  const value = key.split(".").reduce<unknown>((acc, segment) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[segment];
    return undefined;
  }, messages);
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, string>;
  }
  return undefined;
};
```

#### Selection & Fallback Logic:
```ts
const pluralRulesCache = new Map<string, Intl.PluralRules>();
const getPluralRules = (locale: string): Intl.PluralRules => {
  let rules = pluralRulesCache.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(locale);
    pluralRulesCache.set(locale, rules);
  }
  return rules;
};

// Inside buildRenderContext:
tPlural: (key, count, fallback, vars) => {
  const safeLocale = toSafeLocale(locale);
  const messages = loadMessages(safeLocale) ?? loadMessages(DEFAULT_LOCALE) ?? {};
  const pluralMap = lookupObject(messages, key) ?? lookupObject(loadMessages(DEFAULT_LOCALE) ?? {}, key);

  if (!pluralMap) {
    return interpolate(fallback, vars);
  }

  const category = getPluralRules(safeLocale).select(count);
  const template = pluralMap[category] ?? pluralMap.other ?? fallback;

  return interpolate(template, vars);
}
```

### Dynamic String Construction in `NOTIFICATION_TYPES`

The type definition in `app/constants/notifications.ts` performs the real rendering dynamically using `ctx.t` and `ctx.tPlural`:

```ts
"plans.daily_reminder": {
  key: "plans.daily_reminder",
  defaultChannels: ["in_app", "push"],
  render: (payload: PlanDailyReminderPayload, ctx: RenderContext) => {
    const title = ctx.t("notifications.types.plansDailyReminder.title", "Daily Wird");
    const url =
      payload.targetUrlKind === "page" && payload.targetPage
        ? `/${ctx.locale}/pages/${payload.targetPage}`
        : `/${ctx.locale}/plans`;

    let body = "";
    if (payload.pendingCount > 1 || !payload.primary) {
      body = ctx.tPlural(
        "notifications.types.plansDailyReminder.multipleTasks",
        payload.pendingCount,
        "You have {{n}} tasks remaining in today's wird",
        { n: toLocaleNumeral(payload.pendingCount, ctx.locale) }
      );
    } else if (payload.primary.unit === "page") {
      const pageCount = payload.primary.rangeEnd - payload.primary.rangeStart + 1;
      body = ctx.tPlural(
        "notifications.types.plansDailyReminder.singlePage",
        pageCount,
        "Today's wird: {{n}} pages (p. {{start}} to p. {{end}})",
        {
          n: toLocaleNumeral(pageCount, ctx.locale),
          start: toLocaleNumeral(payload.primary.rangeStart, ctx.locale),
          end: toLocaleNumeral(payload.primary.rangeEnd, ctx.locale),
        }
      );
    } else {
      // Verse unit
      const startFmt = payload.primary.startVerseKey
        ? formatRawVerseKey(payload.primary.startVerseKey, ctx.locale)
        : toLocaleNumeral(payload.primary.rangeStart, ctx.locale);
      const endFmt = payload.primary.endVerseKey
        ? formatRawVerseKey(payload.primary.endVerseKey, ctx.locale)
        : toLocaleNumeral(payload.primary.rangeEnd, ctx.locale);

      if (payload.primary.rangeStart === payload.primary.rangeEnd) {
        body = ctx.t(
          "notifications.types.plansDailyReminder.singleVerseOne",
          "Today's wird: verse {{verse}}",
          { verse: startFmt }
        );
      } else {
        body = ctx.t(
          "notifications.types.plansDailyReminder.singleVerseRange",
          "Today's wird: verses {{range}}",
          { range: `${startFmt}–${endFmt}` }
        );
      }
    }

    return { title, body, url };
  },
} satisfies NotificationTypeDef<PlanDailyReminderPayload> as NotificationTypeDef,
```

### Lifecycle Handling on Skip vs. Send
- **When `shouldSend === false`:**
  - `dispatchNotification` is **not** called.
  - The reminder is **not** marked `failed`.
  - The cron route logs an info event:
    `deps.logger.info("notifications.cron.wird_reminder_skipped", { reminderId: reminder.id, userId: reminder.user_id, reason })`.
  - The row is rescheduled to tomorrow via optimistic concurrency:
    ```ts
    const next = nextOccurrence(reminder.scheduled_for, reminder.recurrence, reminder.timezone, now);
    await deps.store.rescheduleReminder(reminder.id, next, undefined, reminder.updated_at);
    ```
  - This advances `scheduled_for` and resets `claim_id: null`, `locked_at: null`, and `status: "pending"`. If the user updated the reminder while cron was in-flight, `where: { id, updated_at: expectedUpdatedAt }` matches 0 rows; the worker cleanly releases its lease without overwriting the user's new schedule.
- **When `shouldSend === true`:**
  - `dispatchNotification` is called with the resolved structured payload.
  - Upon success, the reminder is rescheduled to tomorrow using the identical `nextOccurrence` call and optimistic concurrency.
- **When resolver throws / transient error:**
  - If `resolveDailyWirdDispatch` fails (e.g. transient DB error), recurring reminders are **not** marked `status: "failed"`.
  - The error is logged, `failed++` is tracked for the cron batch, and the row is rescheduled to its `nextOccurrence` with `last_error: message`, preserving `status: "pending"` so the reminder stays active for the user.


---

## 6. Deep Link Resolution (D4)

When a user taps the notification, they are routed directly to where their work lives rather than a generic index:

### Deep Link Resolution Discipline
- The URL is **never** baked as a static string (e.g. `/ar/pages/23`) in the payload.
- `resolveDailyWirdDispatch` resolves `targetPage` (`number | null`) and `targetUrlKind` (`"page" | "plans"`).
- `render(payload, ctx)` dynamically formats the final path as `/${ctx.locale}/pages/${payload.targetPage}` or `/${ctx.locale}/plans`.

### Deep Link Logic
1. **Single Outstanding Assignment:**
   - If `unit === "page"`, `targetPage = rangeStart` (1–604).
   - If `unit === "verse"`, `targetPage = pageOfVerse(rangeStart)` (1–604).
   - `targetUrlKind = "page"`.
   - Resulting link opens the reader on that exact page, where #597's `PlansWidget` check-off dial is mounted.
2. **Multiple Outstanding Assignments or Ambiguous Target:**
   - `targetPage = null`, `targetUrlKind = "plans"`.
   - Resulting link opens `/${ctx.locale}/plans`.

---

## 7. Settings UI & Shared Combobox Extraction (D5, D6)

### Settings Placement
A new component `app/components/notifications/DailyWirdReminderSection.tsx` is mounted directly below `<EnablePushToggle />` in `app/components/SettingsSidebar.tsx`:

```tsx
// app/components/SettingsSidebar.tsx
<SettingsSection title={t("settingsSectionDevice", "Device & Recitation")}>
  {(isMobile || isTablet) && <KeepScreenAwakeToggle />}
  <EnablePushToggle />
  <DailyWirdReminderSection />
  <OfflineRecitationSection />
  <OfflineTafsirSection />
</SettingsSection>
```

### UI States & Graceful Degradation
The section handles three primary states cleanly:

1. **Reminder Disabled:**
   The switch is OFF. The time combobox is disabled and rendered with dimmed opacity (`opacity-50 pointer-events-none`).
2. **Reminder Enabled:**
   The switch is ON. The 15-minute time combobox is active, displaying the current setting (e.g., `٠٨:٣٠ ص` / `08:30 AM`). Changing the time triggers an immediate debounced API save. Every save transmits a freshly resolved `Intl.DateTimeFormat().resolvedOptions().timeZone` to prevent pinning travelling users to stale zones.
3. **Browser Push Status Interactions:**
   - **Push Granted & Subscribed:** Both Web Push and in-app feed notifications are delivered.
   - **Push Denied / Unsupported:** The switch remains **fully usable**. The in-app feed notification still works! A quiet helper note appears below the row:
     - Arabic: *"الإشعارات الفورية محظورة في متصفحك. ستصلك التذكيرات في قائمة الإشعارات داخل التطبيق."*
     - English: *"Push notifications are blocked in your browser. Reminders will appear in your in-app feed."*
   - **Push Supported but Not Yet Subscribed:** Toggling the reminder ON prompts the user with an inline secondary action: *"تفعيل الإشعارات على هذا الجهاز"* ("Enable push on this device"), calling `subscribe()` from `usePushSubscription()`.
4. **Query Error State:**
   If `GET /api/notifications/daily-reminder` fails, `DailyWirdReminderSection` renders a quiet inline error alert with a retry button (`wirdReminderLoadError` / `wirdReminderRetry`).

### Extraction of `NumberCombobox` into a Shared Primitive

Currently, `NumberCombobox` is duplicated verbatim across two files:
1. `app/components/plans/CustomWirdForm.tsx:191`
2. `app/components/RecitationSettingsSheet.tsx:239`

#### Proposed Location:
`components/ui/number-combobox.tsx` (accessible via `@/components/ui/number-combobox`).
*Rationale:* `components/ui/` is the project's standard home for Radix + Tailwind headless primitives (`command.tsx`, `popover.tsx`, `button.tsx`). `NumberCombobox` is a pure UI primitive built directly on Radix Popover and Command.

#### Unified Component Interface:
```ts
export type NumberComboboxProps = {
  value: number;
  onChange: (value: number) => void;
  values?: number[];
  min?: number;
  max?: number;
  step?: number;
  portalContainer?: HTMLElement | null;
  variant?: "default" | "settings";
  listClassName?: string;
  itemClassName?: string;
  disabled?: boolean;
  label?: string;
  prefix?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  format?: (value: number) => string;
  className?: string;
};
```
*Design Parity Note:* `variant="settings"` restores the compact `text-[13px]`, uncapped list height, and cursor pointer styling required inside `RecitationSettingsSheet`, while `variant="default"` retains `CustomWirdForm`'s form input look (`min-h-[44px] text-xs max-h-56`).

#### Refactoring Call Sites:
- In `app/components/plans/CustomWirdForm.tsx`: Remove the local `NumberCombobox` definition and import from `@/components/ui/number-combobox` (uses default variant).
- In `app/components/RecitationSettingsSheet.tsx`: Remove the local `NumberCombobox` definition and import from `@/components/ui/number-combobox` with `variant="settings"`.
- Both call sites now inherit consistent accessibility, focus states, and the mandatory `fq-scroll-nice` class on their `CommandList` popover bodies.

### The 15-Minute-Step Time Combobox

The time selector is implemented as `components/ui/time-combobox.tsx`, built with the same Radix Popover + Command architecture:
- **Intervals:** 96 options per day, stepped by 15 minutes (`00:00`, `00:15`, ..., `23:45`).
- **Formatting:** Formats the selected time using localized Arabic-Indic numerals and localized AM/PM markers in Arabic (`٠٨:٣٠ ص`), and standard 12-hour format in English (`08:30 AM`).
- **Searching:** Allows searching by Western digits (`8:30`), Arabic-Indic digits (`٨:٣٠`), or keywords (`am`, `pm`, `صباحا`, `مساء`).
- **Portal Container:** Accepts `portalContainer?: HTMLElement | null` and passes it to `PopoverContent`. When mounted inside a Radix Dialog/Sheet (`SettingsSidebar`), this prevents Radix's inline `pointer-events: none` on `document.body` from swallowing click events on popover items.
- **Design Principles Compliance:**
  - Fully opaque background `hsl(var(--card))`.
  - Inset catch-light rim `--surface-rim` on dark themes (`inset 0 1px 0 hsl(210 20% 28%)`).
  - No drop shadows or `backdrop-blur`.
  - `fq-scroll-nice` on the scrollable option list.
  - Interactive hit target: minimum 44px height (`min-h-[44px]`).


---

## 8. `/plans` Hero Entry Row & Settings Sidebar Lift

For discoverability where users manage their awrad, a quiet reminder indicator is added to `app/components/plans/PlansTodayHero.tsx`.

### Visual Design & Placement
- Situated quietly at the bottom of the card in `PlansTodayHero.tsx`, separated by a subtle hairline divider.
- Layout:
  - Leading: Muted Bell icon (`size-3.5 text-muted-foreground`).
  - Text:
    - When enabled: *"تذكير يومي: ٠٨:٣٠ ص"* ("Daily reminder: 8:30 AM").
    - When disabled: *"تفعيل تذكير الورد اليومي"* ("Set daily reminder").
  - Trailing: Subtle Chevron icon (`size-3 text-muted-foreground/60`).
- Strict compliance with `docs/design/design-principles.md`: quiet and dignified, no aggressive banners, no gamified badges.

### Shared `SettingsSidebarContext` Mechanism

Currently, `SettingsSidebar` is controlled by local state inside `app/components/nav/Nav.tsx:200` (`const [settingsOpen, setSettingsOpen] = useState(false)`). Nothing outside `Nav` can open it.

To allow `/plans` (and future surfaces) to open settings directly at a specific section without hacks or URL hash polling, we lift this state into a dedicated context.

#### Context Definition (`app/contexts/SettingsSidebarContext.tsx`):
Modelled directly after `app/contexts/SidebarContext.tsx` and `app/contexts/NavOverlayContext.tsx`:

```ts
"use client";

import { createContext, useCallback, useContext, useState } from "react";

export type SettingsSectionTarget = "reading" | "appearance" | "device" | "wird-reminder" | null;

type SettingsSidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  targetSection: SettingsSectionTarget;
  openSettings: (target?: SettingsSectionTarget) => void;
  closeSettings: () => void;
  clearTarget: () => void;
};

const SettingsSidebarContext = createContext<SettingsSidebarContextValue>({
  open: false,
  setOpen: () => {},
  targetSection: null,
  openSettings: () => {},
  closeSettings: () => {},
  clearTarget: () => {},
});

export function SettingsSidebarProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [targetSection, setTargetSection] = useState<SettingsSectionTarget>(null);

  const openSettings = useCallback((target?: SettingsSectionTarget) => {
    setTargetSection(target ?? null);
    setOpen(true);
  }, []);

  const closeSettings = useCallback(() => {
    setOpen(false);
    setTargetSection(null);
  }, []);

  const clearTarget = useCallback(() => {
    setTargetSection(null);
  }, []);

  return (
    <SettingsSidebarContext.Provider
      value={{
        open,
        setOpen,
        targetSection,
        openSettings,
        closeSettings,
        clearTarget,
      }}
    >
      {children}
    </SettingsSidebarContext.Provider>
  );
}

export function useSettingsSidebar() {
  return useContext(SettingsSidebarContext);
}
```

#### Provider Placement (`app/[locale]/layout.tsx`):
Mounted in the provider tree in `app/[locale]/layout.tsx` wrapping `<Nav />` and `{children}`, right alongside `SidebarProvider`.

#### `Nav.tsx` Refactoring:
- In `app/components/nav/Nav.tsx`, remove local `useState(false)` for `settingsOpen`.
- Consume `const { open: settingsOpen, setOpen: setSettingsOpen, openSettings } = useSettingsSidebar();`.
- The existing settings button in `Nav.tsx` (`onClick={() => openSettings()}`) continues to work completely unchanged.
- `<SettingsSidebar open={settingsOpen} onOpenChange={setSettingsOpen} />` receives props directly from context.

#### Focus & Quiet Reveal in `SettingsSidebar`:
- In `DailyWirdReminderSection.tsx`, the container carries `id="settings-wird-reminder"` and `data-testid="settings-section-wird-reminder"`.
- When `SettingsSidebar` opens with `targetSection === "wird-reminder"`:
  ```ts
  const sectionRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || targetSection !== "wird-reminder") return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    node.scrollIntoView({
      behavior: prefersReducedMotion ? "instant" : "smooth",
      block: "center",
    });

    if (prefersReducedMotion) {
      clearTarget();
      return;
    }

    node.classList.add("fq-focus-pulse");
    const timer = setTimeout(() => {
      node.classList.remove("fq-focus-pulse");
      clearTarget();
    }, 1200);
    return () => clearTimeout(timer);
  }, [targetSection, clearTarget]);
  ```
- **Quiet Aesthetic Rule & Reduced Motion:** `fq-focus-pulse` performs a gentle 1.2-second transition (subtle primary ring `shadow-[0_0_0_2px_hsl(var(--primary)/0.25)]` fading out). `@media (prefers-reduced-motion: reduce)` in `app/globals.css` completely disables `.fq-focus-pulse` animation and ensures scrolling is instant without harsh flashing or motion, honoring both `docs/design/design-principles.md` and WCAG accessibility standards.


#### `/plans` Hero Call Site (`PlansTodayHero.tsx`):
- Consumes `const { openSettings } = useSettingsSidebar();`.
- The reminder row triggers `openSettings("wird-reminder")`.

---

## 9. Ops Enablement & Deployment Runbook

### `.env.example` Additions

```bash
# --- Web Push notifications ---
# Generate a VAPID keypair with: npx web-push generate-vapid-keys --json
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-public-vapid-key"
VAPID_PUBLIC_KEY="your-public-vapid-key"
VAPID_PRIVATE_KEY="your-private-vapid-key"
VAPID_SUBJECT="mailto:support@furqan.app"

# --- Scheduled reminders cron ---
# Generate secret with: openssl rand -hex 32
# Sent by Hostinger hPanel cron in the x-cron-secret header
CRON_SECRET="your-cron-secret"

# --- SMTP email notifications ---
# Optional: if unset, email deliveries fall back to structured log output
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="Furqan <no-reply@furqan.app>"
```

### Deployment Runbook: `docs/deployment/cron-notifications.md`

1. **Generate VAPID Keypair:**
   Run in the repository root:
   ```bash
   npx web-push generate-vapid-keys --json
   ```
   Save `publicKey` as both `VAPID_PUBLIC_KEY` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. Save `privateKey` as `VAPID_PRIVATE_KEY`.
2. **Generate Cron Secret:**
   ```bash
   openssl rand -hex 32
   ```
   Save as `CRON_SECRET` in Hostinger's environment variable panel.
3. **Configure Hostinger hPanel Cron Job:**
   - Log in to Hostinger hPanel → **Advanced** → **Cron Jobs**.
   - Select **Custom**.
   - Schedule: `*/5 * * * *` (every 5 minutes, matching ADR 0037).
   - Command:
     ```bash
     curl -s -X POST -H "x-cron-secret: <CRON_SECRET>" https://furqan.app/api/cron/reminders > /dev/null 2>&1
     ```

---

## 10. Internationalization (i18n)

All user-facing strings use structured message objects for ICU plural categories, respecting Arabic's 6 plural categories and English's 2 categories.

### Additions to `messages/ar.json`
```json
{
  "notifications": {
    "settings": {
      "wirdReminderTitle": "تذكير الورد اليومي",
      "wirdReminderDescription": "تنبيه يومي لمتابعة وردك القرآني في الوقت المحدد",
      "wirdReminderTime": "وقت التذكير",
      "wirdReminderPushBlocked": "الإشعارات الفورية محظورة في متصفحك. ستصلك التذكيرات في قائمة الإشعارات داخل التطبيق.",
      "wirdReminderEnablePush": "تفعيل الإشعارات الفورية على هذا الجهاز",
      "searchTime": "ابحث عن وقت…",
      "noTimeMatch": "لا يوجد وقت مطابق."
    },
    "types": {
      "plansDailyReminder": {
        "title": "وردك اليومي",
        "multipleTasks": {
          "zero": "لا توجد مهام متبقية في ورد اليوم",
          "one": "لديك مهمة واحدة متبقية في ورد اليوم",
          "two": "لديك مهمتان متبقيتان في ورد اليوم",
          "few": "لديك {{n}} مهام متبقية في ورد اليوم",
          "many": "لديك {{n}} مهمة متبقية في ورد اليوم",
          "other": "لديك {{n}} مهمة متبقية في ورد اليوم"
        },
        "singlePage": {
          "one": "ورد اليوم: صفحة واحدة (ص {{start}})",
          "two": "ورد اليوم: صفحتان (ص {{start}} إلى ص {{end}})",
          "few": "ورد اليوم: {{n}} صفحات (ص {{start}} إلى ص {{end}})",
          "many": "ورد اليوم: {{n}} صفحة (ص {{start}} إلى ص {{end}})",
          "other": "ورد اليوم: {{n}} صفحة (ص {{start}} إلى ص {{end}})"
        },
        "singleVerseOne": "ورد اليوم: الآية {{verse}}",
        "singleVerseRange": "ورد اليوم: الآيات {{range}}",
        "completedCaption": "مكتمل لهذا اليوم"
      }
    }
  },
  "plans": {
    "hero": {
      "reminderLabel": "تذكير يومي: {time}",
      "reminderSet": "ضبط تذكير الورد اليومي"
    }
  }
}
```

### Additions to `messages/en.json`
```json
{
  "notifications": {
    "settings": {
      "wirdReminderTitle": "Daily Wird Reminder",
      "wirdReminderDescription": "Daily reminder to keep up with your Quran reading at your preferred time",
      "wirdReminderTime": "Reminder Time",
      "wirdReminderPushBlocked": "Push notifications are blocked in your browser. Reminders will appear in your in-app feed.",
      "wirdReminderEnablePush": "Enable push notifications on this device",
      "searchTime": "Search time…",
      "noTimeMatch": "No matching time."
    },
    "types": {
      "plansDailyReminder": {
        "title": "Daily Wird",
        "multipleTasks": {
          "one": "You have {{n}} task remaining in today's wird",
          "other": "You have {{n}} tasks remaining in today's wird"
        },
        "singlePage": {
          "one": "Today's wird: 1 page (p. {{start}})",
          "other": "Today's wird: {{n}} pages (p. {{start}} to p. {{end}})"
        },
        "singleVerseOne": "Today's wird: verse {{verse}}",
        "singleVerseRange": "Today's wird: verses {{range}}",
        "completedCaption": "Completed for today"
      }
    }
  },
  "plans": {
    "hero": {
      "reminderLabel": "Daily reminder: {time}",
      "reminderSet": "Set daily reminder"
    }
  }
}
```

---

## 11. Testing Strategy

### Unit Tests (Vitest)
All unit tests follow the project convention of **co-location next to the tested module** (no `__tests__/` directories):

1. **`app/lib/notifications/render-context.test.ts` (New):**
   - **Arabic Plural Selection across all categories:**
     - `count = 0` → selects `zero` ("لا توجد مهام")
     - `count = 1` → selects `one` ("لديك مهمة واحدة متبقية")
     - `count = 2` → selects `two` ("لديك مهمتان متبقيتان")
     - `count = 3` → selects `few` ("لديك ٣ مهام متبقية")
     - `count = 11` → selects `many` ("لديك ١١ مهمة متبقية")
     - `count = 100` → selects `other` ("لديك ١٠٠ مهمة متبقية")
   - **English Plural Selection:**
     - `count = 1` → selects `one` ("1 task remaining")
     - `count = 2` → selects `other` ("2 tasks remaining")
   - **Category Fallback:**
     - When a specific category is absent from the map, falls back to `other`.
     - When `other` is absent, falls back to the provided `fallback` string.
   - **Backward Compatibility of `t`:**
     - Asserts that calling existing `t("notifications.types.plansDailyReminder.title", ...)` with standard string keys functions identically without regressions.
2. **`app/lib/notifications/wird-reminder-resolver.test.ts` (New):**
   - **Skip when complete (D3):** When all active plan assignments for the local day have `completed: true`, returns `{ shouldSend: false }`.
   - **Skip when no plans active:** Returns `{ shouldSend: false }`.
   - **Structured payload generation:** When 1 page-unit assignment is pending, returns `{ shouldSend: true, payload: { pendingCount: 1, primary: { unit: "page", rangeStart, rangeEnd }, targetPage, targetUrlKind: "page" } }` with zero human words in payload.
   - **Deep link target page:** For verse-unit assignment, converts verse ordinal to page via `pageOfVerse`.
   - **Multiple pending assignments:** Returns `{ targetPage: null, targetUrlKind: "plans" }`.
3. **`app/lib/notifications/wird-reminder.test.ts` (New):**
   - **Initial scheduled instant:** Computes correct UTC `scheduled_for` when local time is in the future today.
   - **Past-time rollover:** Computes tomorrow's UTC `scheduled_for` via `nextOccurrence` when local time has already passed today.
   - **Dedupe idempotency:** Calling `setDailyWirdReminder` repeatedly updates the same row without creating duplicates.
   - **Cancellation:** Marks row as `cancelled`.
4. **`app/lib/notifications/reminders.test.ts` (Extend existing):**
   - **Reschedule on skipped send:** Ensures that skipping a reminder calls `rescheduleReminder` to advance `scheduled_for` without marking `status: "failed"` or setting `last_error`.
5. **`app/contexts/SettingsSidebarContext.test.tsx` (New):**
   - Tests default closed state, `openSettings(target)`, `closeSettings()`, and `clearTarget()`.
6. **`components/ui/number-combobox.test.tsx` (New):**
   - Renders correctly with `min`/`max` ranges and discrete `values` arrays.
   - Searches numbers properly in both Arabic-Indic and Latin digits.
   - Dispatches `onChange` on item selection.
7. **`components/ui/time-combobox.test.tsx` (New):**
   - Generates 96 15-minute intervals.
   - Searches times by Arabic/Latin numerals and am/pm keywords.

### E2E Specification (`e2e/tests/wird-reminder-settings.spec.ts`)

Located in `e2e/tests/` (following the repo convention).

#### Strict Assertion Discipline:
All spec assertions target explicit `data-testid` attributes, **never** localized `aria-label` substrings or localized button texts:

- `data-testid="wird-reminder-toggle"`: The switch toggle button in `DailyWirdReminderSection`.
- `data-testid="wird-reminder-time-trigger"`: The combobox button triggering the time popover.
- `data-testid="wird-reminder-time-popover"`: The popover container holding the time options list.
- `data-testid="wird-reminder-time-search"`: The search input inside the time combobox.
- `data-testid="wird-reminder-time-option-<HHMM>"`: Selectable time item (e.g. `data-testid="wird-reminder-time-option-0830"`).
- `data-testid="plans-hero-reminder-row"`: The quiet reminder affordance row on the `/plans` hero card.
- `data-testid="settings-section-wird-reminder"`: The section container in `SettingsSidebar`.

*Unconditional Assertions & Deterministic Seeding:* The spec must never wrap assertions in conditional visibility checks (`if (await x.isVisible())`). It deterministically seeds an active plan fixture via `clearUserPlans(1)` and `createTestPlan(1)` in `e2e/helpers/auth.ts`, asserting presence unconditionally.

#### Flow Tested:
1. Deterministically seed user plan fixture via `clearUserPlans(1)` and `createTestPlan(1)`.
2. Navigate to `/plans`, assert `[data-testid="plans-hero-reminder-row"]` is visible, and click it.
3. Assert `SettingsSidebar` opens and `[data-testid="settings-section-wird-reminder"]` is visible and revealed into view.
4. Toggle switch `[data-testid="wird-reminder-toggle"]` ON.
5. Click `[data-testid="wird-reminder-time-trigger"]`, search for `08:30`, and select `[data-testid="wird-reminder-time-option-0830"]`.
6. Reload page, navigate back, and verify persistence.

---

## 12. Decisions Record Addendum

The design decisions approved in Issue #600 (D1–D8) extend the existing notification architecture. In accordance with project standards, they do **not** warrant a separate ADR. Instead, the following text is recorded in the `## Notification System` section of [`docs/architecture/decisions/observability.md`](../architecture/decisions/observability.md):

```markdown
- The daily wird reminder is strictly one row per user with `dedupe_key = "plans.daily_reminder:<userId>"` (D1) — never create separate rows per plan or per date. The same row advances daily via `nextOccurrence`.
- Notification payloads must contain language-neutral structured data (`pendingCount`, `primary` range, `targetPage`, `targetUrlKind`), never pre-rendered localized sentences (D2). `app/api/notifications/route.ts` re-renders stored notifications at READ time using the reader's live session locale; storing formatted sentences pins notifications permanently to the writer's locale.
- Cron notification rendering must use `tPlural` with a complete 6-category plural object (`zero`, `one`, `two`, `few`, `many`, `other`) evaluated via `Intl.PluralRules` for count-bearing strings. `next-intl` is unavailable outside HTTP request scope, and plain count interpolation violates Arabic grammar.
- The completion skip guard (D3) must evaluate completion against the user's local calendar day derived from the reminder's IANA `timezone`, never from UTC. When today's wird is complete, the runner skips dispatch and advances to tomorrow; skipped rows must never be marked `failed` or logged as errors.
- Deep link URLs (D4) must route directly to the specific mushaf page (`/<locale>/pages/<targetPage>`) when exactly one assignment is pending, or fall back to `/<locale>/plans` when multiple assignments are pending. Target paths must be synthesized dynamically from structured payload data and the reader's current locale at render time.
- The client must send its freshly resolved `Intl.DateTimeFormat().resolvedOptions().timeZone` on every reminder mutation (D5). Stored timezones are strictly display fallbacks; reusing them on save pins travelling users to their old timezone.
- Reminder time selection must use a 15-minute stepped combobox primitive (`components/ui/time-combobox.tsx`), never raw `<input type="time">` (D6).
- Daily wird reminder dispatches are restricted strictly to `in_app` and `push` channels (D7); `email` must never be targeted.
- `ScheduledNotification.locale` nullable column stores the user's active UI locale (`ar` | `en`) at enqueue time (D8), ensuring cron push dispatches target the user's language without hardcoded fallbacks.
- Transient errors in cron during resolver execution must never mark a recurring reminder `status: "failed"`. The runner must record `last_error`, log the failure, increment the batch failure count, and reschedule the row to its `nextOccurrence` with `status: "pending"`; terminal failures silently kill reminders for that user.
- Reminder concurrency must protect active worker leases and user mutations: `upsertScheduledReminder` must preserve existing `claim_id` and `locked_at` when an active lease exists to prevent concurrent double-claiming, and `rescheduleReminder` must apply optimistic concurrency (`where: { id, updated_at: expectedUpdatedAt }`) to release worker leases without overwriting schedules saved by the user mid-flight.
```


---

## 13. Risks & Open Questions

1. **Cron Polling Jitter:**
   Hostinger hPanel cron runs every 5 minutes. A reminder scheduled for 08:00 may fire between 08:00 and 08:05. This is an accepted tradeoff under ADR 0037 and is why 15-minute steps are used (D6).
2. **Traveling User Timezone Drift:**
   If a user travels to another timezone, `ScheduledNotification.timezone` will reflect their previous timezone until they open the app or adjust their settings. An open consideration is whether `usePushSubscription` or the app initialization should silently update `timezone` on the scheduled row if a change in `Intl.DateTimeFormat().resolvedOptions().timeZone` is detected.
