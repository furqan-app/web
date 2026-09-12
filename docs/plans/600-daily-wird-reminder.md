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
-- **Delivery Channels (`app/lib/notifications/channels/`):**
  `push.ts` (Web Push via `web-push` SDK with automatic stale subscription cleanup on 404/410) and `email.ts` (Nodemailer SMTP transport with log fallback). *Note on in-app channel retirement:* The in-app notification UI surface (bell icon in `Nav`, notification feed modal) and `in_app` channel were retired across the application as a deliberate product simplification; daily wird reminders dispatch via the `push` channel only.
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

## 2. Data Model & Schema Migration (D1, D8)

### Multi-Reminder Architecture & Row Specification for `plans.daily_reminder`

Per **D1**, the daily wird reminder supports two complementary reminder paradigms:
1. **General Reminders (Up to 3 Slots):** A user can configure up to 3 independent general reminder times (`MAX_GENERAL_WIRD_REMINDERS = 3`, e.g., 08:00, 14:00, 20:00). When any general reminder fires, it aggregates pending assignments across all active plans that are **not** bound to a dedicated reminder.
2. **Dedicated Per-Wird Reminders:** Any active plan can additionally receive its own dedicated reminder with its own wall-clock time, independent of and not counted against the general cap of 3.
3. **Strict Dedup Exclusion Rule:** Any plan bound to a dedicated reminder is completely excluded from general reminders.

The scheduled notification rows in `scheduled_notifications` follow these specifications:

- `user_id`: Scalar user ID (`Int`).
- `type`: `"plans.daily_reminder"`.
- `recurrence`: `"daily"`.
- `dedupe_key`: Structured per category to preserve uniqueness without table schema changes:
  - **General Reminder:** `plans.daily_reminder:<userId>:slot:<1-3>` (e.g. `plans.daily_reminder:42:slot:1`).
  - **Dedicated Plan Reminder:** `plans.daily_reminder:<userId>:plan:<planId>` (e.g. `plans.daily_reminder:42:plan:105`).
  *Note on Key Stability:* These keys are **stable across reschedules**. There is one persistent row per slot or dedicated plan. When claimed and processed by the cron runner, the exact same row's `scheduled_for` is advanced to the next day via `nextOccurrence`; rows are **never** recreated per date.
- `timezone`: Client-resolved IANA timezone (e.g., `"Africa/Cairo"`), captured at enqueue time.
- `locale`: User's interface locale (e.g., `"ar"` or `"en"`), captured at enqueue time (D8).
- `channels`: `["push"]` (per **D7** — Web Push only; in-app UI/channel retired, email excluded to avoid daily inbox clutter).
- `status`: `"pending"` (values: `pending` | `dispatched` | `cancelled` | `failed`).
- `payload`: In `ScheduledNotification`, stores preference metadata:
  - General: `{"time": "08:30", "slot": 1}`
  - Dedicated: `{"time": "21:00", "planId": 105}`

#### Dedupe Key Conventions

| Category | Key Format | Example | Max per User | Payload Metadata |
|---|---|---|---|---|
| **General Reminder** | `plans.daily_reminder:<userId>:slot:<1-3>` | `plans.daily_reminder:42:slot:1` | 3 (`MAX_GENERAL_WIRD_REMINDERS`) | `{"time": "08:30", "slot": 1}` |
| **Dedicated Plan Reminder** | `plans.daily_reminder:<userId>:plan:<planId>` | `plans.daily_reminder:42:plan:105` | 1 per active `UserPlan` | `{"time": "21:00", "planId": 105}` |

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
  planName?: string | null; // Personalized plan name for dedicated reminders
};
```

This strict separation ensures that:
- **Push Delivery (Cron):** Renders the notification body and title using the row's captured `locale` (D8) via `typeDef.render(payload, cronRenderContext)`. Dedicated reminders incorporate `payload.planName` into the title (`"Reminder: {{name}}"`) while general reminders use the universal title (`"Daily Wird"`).
- **Deep Link:** The URL is rebuilt dynamically as `/${ctx.locale}/pages/${payload.targetPage}` or `/${ctx.locale}/plans` rather than being baked into the payload as a static locale path.

### D8 Schema Analysis & Database Migrations

#### Migration 1: Dedicated `locale` Column (`20260911000000_add_scheduled_notification_locale`)
**Decision:** Add a dedicated `locale` column to `ScheduledNotification` in `prisma/app/schema.prisma`.

**Justification:**
1. **Structural Symmetry with `timezone`:** `ScheduledNotification` is an infrastructure-level queue table. Just as `timezone` is a top-level column needed by the scheduler to compute `nextOccurrence` without parsing payload JSON, `locale` is required by `app/api/cron/reminders/route.ts` to construct `Recipient.locale` for `dispatchNotification`.
2. **Elimination of Hardcoded Fallback:** Resolves the deferred technical debt in the cron route that previously defaulted to `"ar"`.
3. **Migration SQL:**
   ```sql
   -- AlterTable
   ALTER TABLE `scheduled_notifications` ADD COLUMN `locale` VARCHAR(191) NULL;
   ```

#### Migration 2: Slot 1 Key Migration (`20260912000000_migrate_legacy_wird_reminders_to_slot1`)
**Decision:** Provide a forward-only, idempotent migration that transitions legacy single-reminder rows to slot 1 without key collisions:
```sql
-- Alter legacy single-reminder dedupe keys to slot 1 where slot 1 does not already exist
UPDATE `scheduled_notifications` AS legacy
LEFT JOIN `scheduled_notifications` AS existing_slot1
  ON existing_slot1.dedupe_key = CONCAT(legacy.dedupe_key, ':slot:1')
SET
  legacy.dedupe_key = CONCAT(legacy.dedupe_key, ':slot:1'),
  legacy.channels = '["push"]',
  legacy.payload = JSON_SET(COALESCE(legacy.payload, '{}'), '$.slot', 1)
WHERE legacy.type = 'plans.daily_reminder'
  AND legacy.dedupe_key REGEXP '^plans\\.daily_reminder:[0-9]+$'
  AND existing_slot1.id IS NULL;

-- Where slot 1 already exists, cancel the legacy duplicate row to prevent duplicate fires
UPDATE `scheduled_notifications` AS legacy
INNER JOIN `scheduled_notifications` AS existing_slot1
  ON existing_slot1.dedupe_key = CONCAT(legacy.dedupe_key, ':slot:1')
SET
  legacy.status = 'cancelled'
WHERE legacy.type = 'plans.daily_reminder'
  AND legacy.dedupe_key REGEXP '^plans\\.daily_reminder:[0-9]+$';
```

#### Prisma Schema (`prisma/app/schema.prisma`):
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

#### TypeScript Types (`app/lib/notifications/types.ts`):
`ScheduledReminderRow` exposes `dedupe_key`:
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
  status: string;
  dedupe_key?: string | null;
  updated_at?: Date;
};
```
`NotificationStore` additions:
- `upsertScheduledReminder` accepts `locale?: string | null`.
- `rescheduleReminder` accepts `(id, nextScheduledFor, lastError?, expectedUpdatedAt?)` to support optimistic concurrency against concurrent user mutations.
- `listScheduledRemindersForUser: (userId: number, type?: string) => Promise<ScheduledReminderRow[]>`.
- `cancelScheduledReminder: (dedupeKey: string) => Promise<void>`.


---

## 3. Enqueue Layer

### Module Path & Responsibilities
A new service module `app/lib/notifications/wird-reminder.ts` manages the lifecycle of the user's daily wird reminder.

### Signatures & Types

```ts
export const MAX_GENERAL_WIRD_REMINDERS = 3;

export type GeneralWirdReminderSlot = {
  id: number;
  slot: number;
  time: string; // "HH:MM" (15-minute boundary: "08:00", "08:15", etc.)
  timezone: string;
  locale: string;
  scheduledFor: Date | null;
};

export type DedicatedWirdReminder = {
  id: number;
  planId: number;
  time: string;
  timezone: string;
  locale: string;
  scheduledFor: Date | null;
};

export type MultiWirdReminderPreference = {
  general: GeneralWirdReminderSlot[];
  dedicated: DedicatedWirdReminder[];
  enabled: boolean;
  time: string; // Primary time (slot 1 or first dedicated) or fallback "08:00"
  timezone: string;
  locale: string;
};

export type SetGeneralWirdReminderInput = {
  userId: number;
  slot?: number;
  time: string; // "HH:MM"
  timezone: string;
  locale: string;
};

export type SetDedicatedWirdReminderInput = {
  userId: number;
  planId: number;
  time: string; // "HH:MM"
  timezone: string;
  locale: string;
};

/** Retrieves all active general reminder slots and dedicated plan reminders for a user. */
export async function getDailyWirdReminders(
  userId: number,
  store: NotificationStore
): Promise<MultiWirdReminderPreference>;

/** Creates or updates a general reminder slot idempotently (slot 1..3). */
export async function setGeneralWirdReminder(
  input: SetGeneralWirdReminderInput,
  store: NotificationStore,
  clock?: Clock
): Promise<{ id: number; scheduledFor: Date; slot: number }>;

/** Cancels a specific general reminder slot (slot 1..3). */
export async function cancelGeneralWirdReminder(
  userId: number,
  slot: number,
  store: NotificationStore
): Promise<void>;

/** Cancels all general reminder slots (1..3) when the master toggle is turned off. */
export async function cancelAllGeneralWirdReminders(
  userId: number,
  store: NotificationStore
): Promise<void>;

/** Creates or updates a dedicated per-wird reminder idempotently. */
export async function setDedicatedWirdReminder(
  input: SetDedicatedWirdReminderInput,
  store: NotificationStore,
  clock?: Clock
): Promise<{ id: number; scheduledFor: Date; planId: number }>;

/** Cancels a dedicated reminder bound to a specific plan. */
export async function cancelDedicatedWirdReminder(
  userId: number,
  planId: number,
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

In `app/lib/notifications/repository.ts`, `upsertScheduledReminder` actively applies the new schedule and resets the lifecycle, while preserving any active worker lease:
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
  channels: ["push"],
  status: "pending",
  // Preserve claim_id and locked_at if an in-flight cron lease is active,
  // preventing concurrent cron workers from double-claiming.
  claim_id: isActivelyLeased ? existing.claim_id : null,
  locked_at: isActivelyLeased ? existing.locked_at : null,
  last_error: null,
}
```

### Cancellation Semantics
- **General Slot Cancellation:** `cancelGeneralWirdReminder` cancels the row matching `dedupe_key = "plans.daily_reminder:<userId>:slot:<slot>"`, setting `status: "cancelled"` and clearing `claim_id` and `locked_at`. When canceling slot 1, it also cancels legacy key `plans.daily_reminder:<userId>` if present.
- **Master General Cancellation:** `cancelAllGeneralWirdReminders` iterates over slots 1..3 (and the legacy single key), canceling all active general rows.
- **Dedicated Reminder Cancellation:** `cancelDedicatedWirdReminder` cancels the row matching `dedupe_key = "plans.daily_reminder:<userId>:plan:<planId>"`.
This leaves audit history intact while ensuring `claimDueReminders` (which filters strictly by `status: "pending"`) never picks up cancelled rows. Re-enabling a reminder upserts the row back to `status: "pending"` with the new target time.

---

## 4. API Endpoints

A Route Handler `app/api/notifications/daily-reminder/route.ts` provides client access to read and update both general and dedicated reminder preferences.

### `GET /api/notifications/daily-reminder`
Retrieves all active reminders for the authenticated user while maintaining top-level backward compatibility:

- **Authentication:** Verified via `extractUser(request)`. Returns `401 Unauthorized` if unauthenticated.
- **Response (200 OK):**
  ```json
  {
    "data": {
      "general": [
        {
          "id": 101,
          "slot": 1,
          "time": "08:00",
          "timezone": "Africa/Cairo",
          "locale": "ar",
          "scheduledFor": "2026-09-12T05:00:00.000Z"
        },
        {
          "id": 102,
          "slot": 2,
          "time": "14:00",
          "timezone": "Africa/Cairo",
          "locale": "ar",
          "scheduledFor": "2026-09-12T11:00:00.000Z"
        }
      ],
      "dedicated": [
        {
          "id": 103,
          "planId": 45,
          "time": "21:00",
          "timezone": "Africa/Cairo",
          "locale": "ar",
          "scheduledFor": "2026-09-11T18:00:00.000Z"
        }
      ],
      "enabled": true,
      "time": "08:00",
      "timezone": "Africa/Cairo",
      "locale": "ar"
    }
  }
  ```
  *Top-Level Compatibility:* `enabled`, `time`, `timezone`, and `locale` fall back to the primary general slot (slot 1) or the first dedicated reminder if general slots are empty, ensuring existing client surfaces operate seamlessly.

### `POST /api/notifications/daily-reminder`
Handles mutations for general reminder slots and dedicated plan reminders.

- **Authentication:** Verified via `extractUser(request)`. Returns `401 Unauthorized` if unauthenticated.
- **Shared Validation Helper (`validateReminderFields`):**
  Validates `time`, `timezone`, and `locale`:
  - `time`: Must match `/^(0[0-9]|1[0-9]|2[0-3]):(00|15|30|45)$/` (15-minute intervals).
  - `timezone`: Must be a valid IANA timezone string verified via `Intl.DateTimeFormat(undefined, { timeZone })`.
  - `locale`: Must be supported (`"ar"` | `"en"` in `routing.locales`).

#### Case A: Dedicated Per-Wird Reminder (`type: "dedicated"` or `planId` provided)
- **Request Body:**
  ```json
  {
    "type": "dedicated",
    "planId": 45,
    "enabled": true,
    "time": "21:00",
    "timezone": "Africa/Cairo",
    "locale": "ar"
  }
  ```
- **Validation & Handling:**
  1. `planId` must be a strictly positive integer (`typeof body.planId === "number" && Number.isInteger(body.planId) && body.planId > 0`). If missing, float, or invalid → `422 "Missing or invalid 'planId'"`.
  2. If `enabled === false`: Calls `cancelDedicatedWirdReminder(user.id, planId, store)` and returns `{ data: { success: true, planId, enabled: false } }`.
  3. If `enabled === true`:
     - Validates that `planId` belongs to the authenticated user and has `status: "active"`. If not → `422 "Cannot bind reminder to inactive or non-existent plan"`.
     - Validates reminder fields via `validateReminderFields`.
     - Upserts `plans.daily_reminder:<userId>:plan:<planId>` with `channels: ["push"]`.

#### Case B: General Reminder Slot (`type: "general"` or default)
- **Request Body (Update / Enable Slot):**
  ```json
  {
    "type": "general",
    "slot": 2,
    "enabled": true,
    "time": "14:00",
    "timezone": "Africa/Cairo",
    "locale": "ar"
  }
  ```
- **Validation & Handling:**
  1. If `body.slot !== undefined`: Must be an integer between 1 and 3 (`typeof body.slot === "number" && Number.isInteger(body.slot) && body.slot >= 1 && body.slot <= 3`). If invalid (e.g. string `"2"`, float `1.5`, `NaN`, `< 1`, `> 3`) → `422 "Slot must be an integer between 1 and 3"`.
  2. If `enabled === false`:
     - If `slot` specified: Cancels that specific slot via `cancelGeneralWirdReminder(user.id, slot, store)`.
     - If `slot` omitted: Cancels all general slots via `cancelAllGeneralWirdReminders(user.id, store)`.
  3. If `enabled === true`:
     - `slot` defaults to 1 if omitted.
     - Validates reminder fields via `validateReminderFields`.
     - Upserts `plans.daily_reminder:<userId>:slot:<slot>` with `channels: ["push"]`.

### Plan Deactivation Integration (`PATCH /api/plans/[planId]`)
When a plan transitions away from `status: "active"` (e.g., paused, completed, abandoned), the dedicated reminder must not fire as an orphan. In `app/api/plans/[planId]/route.ts`, a helper `cancelDedicatedIfLeavingActive` automatically cancels any associated dedicated reminder in `scheduled_notifications` wrapped in a `try/catch` error trap:
```ts
async function cancelDedicatedIfLeavingActive(
  userId: number,
  planId: number,
  newStatus?: UserPlanStatus
): Promise<void> {
  if (newStatus !== undefined && newStatus !== "active") {
    try {
      const deps = getNotificationDeps();
      await cancelDedicatedWirdReminder(userId, planId, deps.store);
    } catch (err) {
      console.error(
        `Failed to cancel dedicated wird reminder for user ${userId}, plan ${planId}:`,
        err
      );
    }
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
We introduce dedicated server helpers in `app/lib/notifications/wird-reminder-resolver.ts`: `resolveGeneralWirdDispatch` and `resolveDedicatedWirdDispatch`. The cron route invokes the appropriate resolver for any claimed row with `type === "plans.daily_reminder"` before calling `dispatchNotification`.

### Structured Payload Generation in Resolvers

The resolvers decide **whether to send** and **what data describes the reminder** — **never what words**:

```ts
export type WirdDispatchResolution =
  | { shouldSend: false; reason: "all_completed" | "no_active_plans" | "plan_not_active" }
  | { shouldSend: true; payload: PlanDailyReminderPayload };
```

#### 1. General Resolver (`resolveGeneralWirdDispatch`)
Evaluates reminders for general slots (1..3), strictly enforcing the dedup exclusion rule:
1. **Query Bound Plan IDs:**
   Finds all pending dedicated reminders for the user (`dedupe_key` starting with `plans.daily_reminder:<userId>:plan:`) to collect `boundPlanIds`.
2. **Fetch Active Plans Excluding Bound Plans:**
   Fetches the user's active plans where `id` is not in `boundPlanIds`.
3. **Completion & Plan Guards:**
   - If no unbound plans are active → returns `{ shouldSend: false, reason: "no_active_plans" }`.
   - Derives today's assignments across unbound plans.
   - If all assignments are completed → returns `{ shouldSend: false, reason: "all_completed" }`.
4. **Build Aggregate Payload:**
   Constructs `PlanDailyReminderPayload` targeting the single pending assignment's mushaf page (if `pendingCount === 1`) or `/plans` (if multiple).

```ts
export async function resolveGeneralWirdDispatch(
  userId: number,
  timezone: string,
  now: Date,
  prisma: AppPrismaClient = appPrisma
): Promise<WirdDispatchResolution> {
  const localDate = toLocalDateString(now, timezone);

  const boundRows = await prisma.scheduledNotification.findMany({
    where: {
      user_id: userId,
      type: "plans.daily_reminder",
      status: "pending",
      dedupe_key: { startsWith: `plans.daily_reminder:${userId}:plan:` },
    },
    select: { dedupe_key: true, payload: true },
  });

  const boundPlanIds = new Set<number>();
  for (const row of boundRows) {
    const pId = (row.payload as { planId?: number } | null)?.planId;
    if (typeof pId === "number") boundPlanIds.add(pId);
    else if (row.dedupe_key) {
      const match = row.dedupe_key.match(/:plan:(\d+)$/);
      if (match) boundPlanIds.add(Number(match[1]));
    }
  }

  const plans = await prisma.userPlan.findMany({
    where: {
      user_id: userId,
      status: "active",
      ...(boundPlanIds.size > 0 ? { id: { notIn: Array.from(boundPlanIds) } } : {}),
    },
    include: { progress: true },
    orderBy: { created_at: "asc" },
  });

  if (plans.length === 0) {
    return { shouldSend: false, reason: "no_active_plans" };
  }

  const allAssignments: TrackAssignment[] = [];
  for (const plan of plans) {
    const template = getEnrollmentTemplate(plan);
    if (!template) continue;
    const entries = plan.progress.map((p) => ({
      track_key: p.track_key,
      date: p.date.toISOString().slice(0, 10),
      range_start: String(p.range_start),
      range_end: String(p.range_end),
    }));
    const assignments = deriveAssignments(
      template,
      (plan.params ?? {}) as UserPlanParams,
      entries,
      localDate
    );
    allAssignments.push(...assignments);
  }

  const pending = allAssignments.filter((a) => !a.completed);
  if (pending.length === 0) {
    return { shouldSend: false, reason: "all_completed" };
  }

  return {
    shouldSend: true,
    payload: buildReminderPayload(pending),
  };
}
```

#### 2. Dedicated Per-Wird Resolver (`resolveDedicatedWirdDispatch`)
Evaluates a reminder bound to a single `planId`:
1. **Fetch Targeted Plan:**
   Queries `userPlan` for `id === planId`, `user_id === userId`, and `status === "active"`. If not found or inactive → returns `{ shouldSend: false, reason: "plan_not_active" }`.
2. **Derive Assignments for this Plan Only:**
   Derives today's assignments strictly from this plan's template and progress.
3. **Completion Guard:**
   If all assignments are completed → returns `{ shouldSend: false, reason: "all_completed" }`.
4. **Build Dedicated Payload:**
   Constructs `PlanDailyReminderPayload` with `planName: plan.name` so the push notification displays the personalized title.

```ts
export async function resolveDedicatedWirdDispatch(
  userId: number,
  planId: number,
  timezone: string,
  now: Date,
  prisma: AppPrismaClient = appPrisma
): Promise<WirdDispatchResolution> {
  const localDate = toLocalDateString(now, timezone);

  const plan = await prisma.userPlan.findFirst({
    where: { id: planId, user_id: userId, status: "active" },
    include: { progress: true },
  });

  if (!plan) {
    return { shouldSend: false, reason: "plan_not_active" };
  }

  const template = getEnrollmentTemplate(plan);
  if (!template) {
    return { shouldSend: false, reason: "plan_not_active" };
  }

  const entries = plan.progress.map((p) => ({
    track_key: p.track_key,
    date: p.date.toISOString().slice(0, 10),
    range_start: String(p.range_start),
    range_end: String(p.range_end),
  }));

  const assignments = deriveAssignments(
    template,
    (plan.params ?? {}) as UserPlanParams,
    entries,
    localDate
  );

  const pending = assignments.filter((a) => !a.completed);
  if (pending.length === 0) {
    return { shouldSend: false, reason: "all_completed" };
  }

  return {
    shouldSend: true,
    payload: buildReminderPayload(pending, plan.name || null),
  };
}
```

#### 3. Cron Route Integration (`app/api/cron/reminders/route.ts`)
When claiming rows, `route.ts` differentiates between dedicated and general reminders based on the row's payload and dedupe key:
```ts
if (reminder.type === "plans.daily_reminder") {
  const payload = reminder.payload as { planId?: number; time?: string } | null;
  const planId =
    payload?.planId ??
    (reminder.dedupe_key?.match(/:plan:(\d+)$/)?.[1] ? Number(RegExp.$1) : undefined);

  const resolution =
    planId !== undefined
      ? await resolveDedicatedWirdDispatch(reminder.user_id, planId, reminder.timezone ?? "UTC", now)
      : await resolveGeneralWirdDispatch(reminder.user_id, reminder.timezone ?? "UTC", now);

  if (!resolution.shouldSend) {
    deps.logger.info("notifications.cron.wird_reminder_skipped", {
      reminderId: reminder.id,
      userId: reminder.user_id,
      reason: resolution.reason,
    });
    const next = nextOccurrence(reminder.scheduled_for, reminder.recurrence, reminder.timezone, now);
    await deps.store.rescheduleReminder(reminder.id, next, undefined, reminder.updated_at);
    continue;
  }

  // Dispatch push notification with the resolved structured payload
  await dispatchNotification(
    {
      userId: reminder.user_id,
      type: reminder.type,
      payload: resolution.payload,
      channels: ["push"],
      locale: reminder.locale ?? "ar",
    },
    deps
  );

  const next = nextOccurrence(reminder.scheduled_for, reminder.recurrence, reminder.timezone, now);
  await deps.store.rescheduleReminder(reminder.id, next, undefined, reminder.updated_at);
}
```
**Open/Closed Invariant (ADR 0037):** `app/lib/notifications/dispatch.ts` remains 100% untouched.

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
3. **Zero Risk to Existing Callers:** Existing `t` call sites remain 100% backward-compatible and untouched.

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

The type definition in `app/constants/notifications.ts` performs rendering dynamically using `ctx.t` and `ctx.tPlural`:

```ts
"plans.daily_reminder": {
  key: "plans.daily_reminder",
  defaultChannels: ["push"],
  render: (payload: PlanDailyReminderPayload, ctx: RenderContext) => {
    const title = payload.planName
      ? ctx.t("notifications.types.plansDailyReminder.dedicatedTitle", "Reminder: {{name}}", {
          name: payload.planName,
        })
      : ctx.t("notifications.types.plansDailyReminder.title", "Daily Wird");

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
  - `dispatchNotification` is called with the resolved structured payload and `channels: ["push"]`.
  - Upon success, the reminder is rescheduled to tomorrow using the identical `nextOccurrence` call and optimistic concurrency.
- **When resolver throws / transient error:**
  - If a resolver fails (e.g. transient DB error), recurring reminders are **not** marked `status: "failed"`.
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

## 7. Settings UI, Shared Combobox Extraction & Dedicated Card Affordance (D5, D6)

### Settings Placement
A component `app/components/notifications/DailyWirdReminderSection.tsx` is mounted directly below `<EnablePushToggle />` in `app/components/SettingsSidebar.tsx`:

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

### UI States & Multi-Reminder Configuration
The section provides complete control over general daily reminders:

1. **Master Switch:**
   - Controls whether general reminders are active. Toggling OFF deactivates all general slots via `cancelAllGeneralWirdReminders`. Toggling ON initializes slot 1 with default time `08:00`.
2. **Multi-Slot List (when enabled):**
   - Renders a card list of up to 3 general reminder slots (`MAX_GENERAL_WIRD_REMINDERS = 3`).
   - Each row displays:
     - Slot label: e.g., *"التذكير الأول"* ("Reminder 1"), *"التذكير الثاني"* ("Reminder 2").
     - `TimeCombobox`: Stepped by 15 minutes, with `portalContainer` to prevent Radix popover event swallowing.
     - Remove button: Interactive trash icon button (minimum 44px hit target) for any slot when multiple slots exist, allowing slot removal down to 1.
3. **"+ Add Reminder Time" Button:**
   - Rendered at the bottom of the list when active slots < 3.
   - Defaults new slots to smart 6-hour intervals (slot 2 defaults to `14:00`, slot 3 defaults to `20:00`).
   - When 3 slots are active, the button is replaced by quiet helper text: `(الحد الأقصى ٣ تذكيرات عامة)` ("Maximum of 3 general reminders reached").
4. **Browser Push Status Interactions:**
   - **Push Granted & Subscribed:** Web Push notifications are scheduled and delivered.
   - **Push Denied / Blocked:** The switch remains usable, and a quiet helper note informs the user:
     - Arabic: *"الإشعارات الفورية محظورة في متصفحك. فعّلها من إعدادات المتصفح لتلقي التذكيرات."*
     - English: *"Push notifications are blocked in your browser. Enable them in browser settings to receive reminders."*
   - **Push Supported but Not Yet Subscribed:** Toggling a reminder ON prompts the user with an inline secondary action: *"تفعيل الإشعارات الفورية على هذا الجهاز"* ("Enable push notifications on this device"), calling `subscribe()` from `usePushSubscription()`.
5. **All Plans Bound Notice:**
   If all active plans followed by the user have dedicated reminders, general reminders will skip at cron time. The section displays an inline notice:
   - Arabic: *"جميع أورادك النشطة مرتبطة بتذكيرات مخصصة. التذكيرات العامة لن ترسل تنبيهات حتى تفعيل ورد غير مخصص."*
   - English: *"All your active plans have dedicated reminders. General reminders will not send alerts until an unbound plan is active."*
6. **Query Error State:**
   If fetching preferences fails, renders an inline alert with retry button (`wirdReminderLoadError` / `wirdReminderRetry`).

### Dedicated Per-Wird Reminder Affordance (`MyPlansList.tsx`)

In addition to general reminders, users can bind a dedicated reminder directly to an individual active plan on the `/plans` ("My Plans") page:

- **Location:** Inside `PlanCard` in `app/components/plans/MyPlansList.tsx`, placed directly beneath `PlanParametersSummary` and above `PlanHistorySection`, separated by a subtle dashed divider.
- **Unbound State:**
  - Displays: Muted bell icon + *"يتبع التذكيرات العامة"* ("Included in general reminders").
  - Action: Button `+ تخصيص وقت` ("+ Set dedicated time"). Clicking immediately binds a dedicated reminder with default time `20:00`.
- **Bound State:**
  - Displays: Muted bell icon + badge *"تذكير مخصص: {time}"* ("Dedicated reminder: {time}") + notice *(مستثنى من التذكيرات العامة)* ("(Excluded from general reminders)").
  - Controls: `TimeCombobox` to adjust the time, and a remove button (`X`, 44px hit target) to unbind the dedicated reminder and return the plan to general reminders.
- **Dedup Rule Visual Reinforcement:** Explicitly confirms right on the card that the plan is excluded from general reminders, avoiding any confusion about duplicate alerts.

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

### Visual Design & Multi-Reminder Display
- Situated quietly at the bottom of the card in `PlansTodayHero.tsx`, separated by a subtle hairline divider.
- Layout:
  - Leading: Muted Bell icon (`size-3.5 text-muted-foreground`).
  - Text:
    - Multiple active reminders (`totalCount > 1` across general + dedicated): Displays aggregate count *"تذكيرات اليوم: {count}"* ("Daily reminders: {count}").
    - Single active reminder (`totalCount === 1`): Displays formatted time *"تذكير يومي: {time}"* ("Daily reminder: {time}").
    - No active reminders (`totalCount === 0`): Displays *"ضبط تذكير الورد اليومي"* ("Set daily reminder").
  - Trailing: Subtle Chevron icon (`size-3 text-muted-foreground/60 rtl:rotate-180`).
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

All user-facing strings use structured message objects for ICU plural categories, respecting Arabic's 6 plural categories and English's 2 categories. Translations support multi-slot general reminders (up to 3 slots), dedicated per-wird reminders, browser permission guidance (with push-only messaging, directing users to browser settings), and dynamic hero counter formatting.

### Additions to `messages/ar.json`
```json
{
  "notifications": {
    "settings": {
      "wirdReminderTitle": "تذكير الورد اليومي",
      "wirdReminderDescription": "تنبيهات يومية لمتابعة وردك القرآني في أوقاتك المفضلة (حتى ٣ أوقات)",
      "wirdReminderSlotLabel": "التذكير {n}",
      "wirdReminderAdd": "إضافة وقت آخر",
      "wirdReminderRemove": "حذف هذا التذكير",
      "wirdReminderMaxReached": "الحد الأقصى ٣ تذكيرات عامة",
      "allPlansBoundNotice": "جميع أورادك النشطة مرتبطة بتذكيرات مخصصة. التذكيرات العامة لن ترسل تنبيهات حتى تفعيل ورد غير مخصص.",
      "wirdReminderTime": "وقت التذكير",
      "wirdReminderPushBlocked": "الإشعارات الفورية محظورة في متصفحك. فعّلها من إعدادات المتصفح لتلقي التذكيرات.",
      "wirdReminderEnablePush": "تفعيل الإشعارات الفورية على هذا الجهاز",
      "wirdReminderLoadError": "تعذر تحميل إعدادات التذكير",
      "wirdReminderRetry": "إعادة المحاولة",
      "searchTime": "ابحث عن وقت…",
      "noTimeMatch": "لا يوجد وقت مطابق."
    },
    "types": {
      "plansDailyReminder": {
        "title": "وردك اليومي",
        "dedicatedTitle": "تذكير: {{name}}",
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
      "remindersMultiple": "تذكيرات اليوم: {count}",
      "reminderSet": "ضبط تذكير الورد اليومي"
    },
    "dedicatedReminder": {
      "includedInGeneral": "يتبع التذكيرات العامة",
      "badge": "تذكير مخصص: {time}",
      "generalNotice": "مستثنى من التذكيرات العامة",
      "set": "تخصيص وقت",
      "remove": "إلغاء التخصيص والعودة للتذكير العام"
    }
  }
}
```

### Additions to `messages/en.json`
```json
{
  "notifications": {
    "settings": {
      "wirdReminderTitle": "Daily Wird Reminders",
      "wirdReminderDescription": "Daily reminders to keep up with your Quran reading at your preferred times (up to 3 times)",
      "wirdReminderSlotLabel": "Reminder {n}",
      "wirdReminderAdd": "Add another time",
      "wirdReminderRemove": "Remove this reminder",
      "wirdReminderMaxReached": "Maximum of 3 general reminders reached",
      "allPlansBoundNotice": "All your active plans have dedicated reminders. General reminders will not send alerts until an unbound plan is active.",
      "wirdReminderTime": "Reminder Time",
      "wirdReminderPushBlocked": "Push notifications are blocked in your browser. Enable them in browser settings to receive reminders.",
      "wirdReminderEnablePush": "Enable push notifications on this device",
      "wirdReminderLoadError": "Failed to load reminder settings",
      "wirdReminderRetry": "Retry",
      "searchTime": "Search time…",
      "noTimeMatch": "No matching time."
    },
    "types": {
      "plansDailyReminder": {
        "title": "Daily Wird",
        "dedicatedTitle": "Reminder: {{name}}",
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
      "remindersMultiple": "Daily reminders: {count}",
      "reminderSet": "Set daily reminder"
    },
    "dedicatedReminder": {
      "includedInGeneral": "Included in general reminders",
      "badge": "Dedicated reminder: {time}",
      "generalNotice": "Excluded from general reminders",
      "set": "Set dedicated time",
      "remove": "Remove dedicated reminder"
    }
  }
}
```

---

## 11. Testing Strategy

### Unit Tests (Vitest)
All unit tests follow the project convention of **co-location next to the tested module** (no `__tests__/` directories):

1. **`app/lib/notifications/render-context.test.ts`:**
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

2. **`app/lib/notifications/wird-reminder-resolver.test.ts`:**
   - **General Resolver (`resolveGeneralWirdDispatch`):**
     - Active plans A and B: when Plan A has a dedicated reminder in `scheduled_notifications`, `resolveGeneralWirdDispatch` only aggregates Plan B.
     - If Plan B is completed but Plan A is pending: general reminder returns `{ shouldSend: false, reason: "all_completed" }` (proving Plan A is strictly excluded).
     - If all active plans have dedicated reminders: general reminder returns `{ shouldSend: false, reason: "no_active_plans" }`.
     - Skip when complete (D3): When all unbound active plan assignments for the local day have `completed: true`, returns `{ shouldSend: false, reason: "all_completed" }`.
     - Skip when no active plans: Returns `{ shouldSend: false, reason: "no_active_plans" }`.
     - Structured payload generation: When 1 page-unit assignment is pending, returns `{ shouldSend: true, payload: { pendingCount: 1, primary: { unit: "page", rangeStart, rangeEnd }, targetPage, targetUrlKind: "page" } }` with zero human words in payload.
     - Deep link target page: For verse-unit assignment, converts verse ordinal to page via `pageOfVerse`.
     - Multiple pending assignments: Returns `{ targetPage: null, targetUrlKind: "plans" }`.
   - **Dedicated Resolver (`resolveDedicatedWirdDispatch`):**
     - Targets Plan A only: derives payload strictly from Plan A's assignments, completely ignoring Plan B.
     - Carries `planName` in payload for notification title rendering.
     - If Plan A is completed: returns `{ shouldSend: false, reason: "all_completed" }`.
     - If Plan A is paused or abandoned: returns `{ shouldSend: false, reason: "plan_not_active" }`.
     - Verse/page unit rendering and deep linking specific to the targeted plan.

3. **`app/lib/notifications/wird-reminder.test.ts`:**
   - **Scheduling & Rollover:** Computes correct UTC `scheduled_for` when local time is in the future today; rolls over to tomorrow's occurrence when local time has already passed.
   - **Multi-Slot Dedup & Keys:** Upserting slot 1, slot 2, and slot 3 creates distinct dedupe keys (`plans.daily_reminder:<userId>:slot:<1-3>`) without collisions.
   - **Strict Slot Validation:** Rejects non-integers, floats, NaN, strings, and numbers outside 1..3 (`MAX_GENERAL_WIRD_REMINDERS`).
   - **Cap Enforcement:** Rejects slot creation beyond 3 slots.
   - **Slot Cancellation:** Disabling slot 2 cancels only slot 2 without altering slot 1 or slot 3; disabling a non-existent slot does not clear active slots.
   - **Cancel All:** `cancelAllGeneralWirdReminders` deactivates all general slots (1..3) when the master toggle is turned off.
   - **Dedicated Reminders:** Setting reminder for `planId: 45` creates `plans.daily_reminder:<userId>:plan:45` with `{ planId: 45, time }`.
   - **Plan ID Validation:** Strict positive integer check; rejects floats, NaN, non-integers, non-existent plans, and inactive plans.
   - **Plan Status Transition:** `cancelDedicatedIfLeavingActive` cancels the dedicated reminder when a plan transitions to `paused`, `completed`, or `abandoned`.
   - **Legacy Migration:** Fetching preferences when DB contains legacy key `plans.daily_reminder:<userId>` returns it as slot 1 and triggers an asynchronous key upgrade to `:slot:1`.

4. **`app/lib/notifications/reminders.test.ts` (Extend existing):**
   - **Reschedule on skipped send:** Ensures that skipping a reminder calls `rescheduleReminder` to advance `scheduled_for` without marking `status: "failed"` or setting `last_error`.

5. **`app/contexts/SettingsSidebarContext.test.tsx`:**
   - Tests default closed state, `openSettings(target)`, `closeSettings()`, and `clearTarget()`.

6. **`components/ui/number-combobox.test.tsx`:**
   - Renders correctly with `min`/`max` ranges and discrete `values` arrays.
   - Searches numbers properly in both Arabic-Indic and Latin digits.
   - Dispatches `onChange` on item selection.

7. **`components/ui/time-combobox.test.tsx`:**
   - Generates 96 15-minute intervals.
   - Searches times by Arabic/Latin numerals and am/pm keywords.

### E2E Specification (`e2e/tests/wird-reminder-settings.spec.ts`)

Located in `e2e/tests/` (following the repo convention).

#### Strict Assertion Discipline:
All spec assertions target explicit `data-testid` attributes, **never** localized `aria-label` substrings or localized button texts:
- `data-testid="wird-reminder-toggle"`: Master switch toggle button in `DailyWirdReminderSection`.
- `data-testid="wird-reminder-time-trigger-<slot>"`: Combobox button triggering the time popover for a slot.
- `data-testid="wird-reminder-time-popover"`: Popover container holding the time options list.
- `data-testid="wird-reminder-time-search"`: Search input inside the time combobox.
- `data-testid="wird-reminder-time-option-<HHMM>"`: Selectable time item (e.g. `data-testid="wird-reminder-time-option-0830"`).
- `data-testid="wird-reminder-add-slot"`: Button to add another reminder time (slots 2 and 3).
- `data-testid="wird-reminder-remove-slot-<slot>"`: Button to remove a specific general reminder slot.
- `data-testid="plan-card-dedicated-toggle"` / `data-testid="plan-card-dedicated-set"`: Button on `PlanCard` to set dedicated reminder time.
- `data-testid="plan-card-dedicated-badge"`: Badge indicating dedicated reminder is active.
- `data-testid="plan-card-dedicated-notice"`: Notice confirming exclusion from general reminders.
- `data-testid="plans-hero-reminder-row"`: The quiet reminder affordance row on the `/plans` hero card.
- `data-testid="settings-section-wird-reminder"`: The section container in `SettingsSidebar`.

*Unconditional Assertions & Deterministic Seeding:* The spec must never wrap assertions in conditional visibility checks (`if (await x.isVisible())`). It deterministically seeds an active plan fixture via `clearUserPlans(1)` and `createTestPlan(1)` in `e2e/helpers/auth.ts`, asserting presence unconditionally.

#### Flow Tested:
1. Deterministically seed user plan fixtures via `clearUserPlans(1)` and `createTestPlan(1)`.
2. Navigate to `/plans`, assert `[data-testid="plans-hero-reminder-row"]` is visible, and click it.
3. Assert `SettingsSidebar` opens and `[data-testid="settings-section-wird-reminder"]` is visible and revealed into view.
4. Toggle switch `[data-testid="wird-reminder-toggle"]` ON (enabling slot 1).
5. Click time trigger for slot 1, search for `08:30`, and select `[data-testid="wird-reminder-time-option-0830"]`.
6. Click `[data-testid="wird-reminder-add-slot"]` to add slot 2, select `14:00`.
7. Reload page, navigate back, and verify both 08:30 and 14:00 persist.
8. Click `[data-testid="wird-reminder-remove-slot-2"]`, reload and verify only 08:30 remains.
9. Navigate to `/plans` (My Plans tab), assert dedicated reminder row is visible on the active plan card, click to set dedicated time (`21:00`), reload and verify dedicated badge and "Excluded from general reminders" notice persist.

---

## 12. Decisions Record (`docs/architecture/decisions/observability.md`)

The design decisions approved in Issue #600 and the multi-reminder/dedicated binding enhancements (D1–D13) extend the existing notification architecture. In accordance with project standards, they do **not** warrant a separate ADR. Instead, the following text is recorded in the `## Notification System` section of [`docs/architecture/decisions/observability.md`](../architecture/decisions/observability.md):

```markdown
- General daily wird reminders use slot-based dedupe keys `plans.daily_reminder:<userId>:slot:<1-3>` (up to 3 general reminders per user, `MAX_GENERAL_WIRD_REMINDERS = 3`), and dedicated per-wird reminders use `plans.daily_reminder:<userId>:plan:<planId>` (one per active `UserPlan`) (D1). Never create separate rows per date; recurring reminders advance daily via `nextOccurrence`. Legacy single-reminder keys `plans.daily_reminder:<userId>` are migrated to `:slot:1`.
- Notification payloads must contain language-neutral structured data (`pendingCount`, `primary` range, `targetPage`, `targetUrlKind`, optional `planName`), never pre-rendered localized sentences (D2). `app/api/notifications/route.ts` re-renders stored notifications at READ time using the reader's live session locale; storing formatted sentences pins notifications permanently to the writer's locale.
- Cron notification rendering must use `tPlural` with a complete 6-category plural object (`zero`, `one`, `two`, `few`, `many`, `other`) evaluated via `Intl.PluralRules` for count-bearing strings. `next-intl` is unavailable outside HTTP request scope, and plain count interpolation violates Arabic grammar.
- The completion skip guard (D3) must evaluate completion against the user's local calendar day derived from the reminder's IANA `timezone`, never from UTC. When today's wird is complete, the runner skips dispatch and advances to tomorrow; skipped rows must never be marked `failed` or logged as errors.
- Deep link URLs (D4) must route directly to the specific mushaf page (`/<locale>/pages/<targetPage>`) when exactly one assignment is pending, or fall back to `/<locale>/plans` when multiple assignments are pending. Target paths must be synthesized dynamically from structured payload data and the reader's current locale at render time.
- The client must send its freshly resolved `Intl.DateTimeFormat().resolvedOptions().timeZone` on every reminder mutation (D5). Stored timezones are strictly display fallbacks; reusing them on save pins travelling users to their old timezone.
- Reminder time selection must use a 15-minute stepped combobox primitive (`components/ui/time-combobox.tsx`), never raw `<input type="time">` (D6).
- Daily wird reminder dispatches are restricted strictly to the `push` channel (`channels = ["push"]`) (D7); `email` must never be targeted, and the retired `in_app` notification feed is not used.
- `ScheduledNotification.locale` nullable column stores the user's active UI locale (`ar` | `en`) at enqueue time (D8), ensuring cron push dispatches target the user's language without hardcoded fallbacks.
- Auto-cancel dedicated reminder on plan deactivation (D9): Moving an active plan to `paused`, `completed`, or `abandoned` in `PATCH /api/plans/[planId]` invokes `cancelDedicatedIfLeavingActive` to immediately cancel `plans.daily_reminder:<userId>:plan:<planId>` in `scheduled_notifications`, avoiding orphaned rows and surprise dispatches.
- Silent skip when all plans bound (D10): When every active plan has a dedicated reminder, general reminders silently skip dispatch (`reason: "no_active_plans"`) and reschedule to tomorrow. `DailyWirdReminderSection` displays a quiet informational notice (`allPlansBoundNotice`) explaining this state.
- Personalized dedicated title (D11): Dedicated reminders carry `planName` in their dispatch payload and render with `dedicatedTitle` (`"تذكير: {{name}}"` / `"Reminder: {{name}}"`) to clearly identify the targeted wird.
- Hero reminder aggregation (D12): `PlansTodayHero` displays aggregate count when multiple reminders exist across general and dedicated (`remindersMultiple`), or formatted time when exactly one reminder is set.
- Default time proposals (D13): Adding general reminder slots proposes smart 6-hour intervals (slot 1: 08:00, slot 2: 14:00, slot 3: 20:00) for instant 1-click addition while remaining fully editable.
- Transient errors in cron during resolver execution must never mark a recurring reminder `status: "failed"`. The runner must record `last_error`, log the failure, increment the batch failure count, and reschedule the row to its `nextOccurrence` with `status: "pending"`; terminal failures silently kill reminders for that user.
- Reminder concurrency must protect active worker leases and user mutations: `upsertScheduledReminder` must preserve existing `claim_id` and `locked_at` when an active lease exists to prevent concurrent double-claiming, and `rescheduleReminder` must apply optimistic concurrency (`where: { id, updated_at: expectedUpdatedAt }`) to release worker leases without overwriting schedules saved by the user mid-flight.
```


---

## 13. Risks & Architectural Guardrails

### Operational Risks
1. **Cron Polling Jitter:**
   Hostinger hPanel cron runs every 5 minutes. A reminder scheduled for 08:00 may fire between 08:00 and 08:05. This is an accepted tradeoff under ADR 0037 and is why 15-minute steps are used (D6).
2. **Traveling User Timezone Drift:**
   If a user travels to another timezone, `ScheduledNotification.timezone` will reflect their previous timezone until they open the app or adjust their settings. The client refreshes timezone automatically on every reminder mutation (D5).

### Non-Negotiable Architectural Guardrails
1. **`app/lib/notifications/dispatch.ts` is Closed to Modification:**
   Per ADR 0037, `dispatch.ts` is closed to modification. Pre-dispatch filtering, resolver branching, and payload synthesis belong entirely in `cron/reminders/route.ts` and the resolver modules.
2. **Language-Neutral Payloads in `scheduled_notifications`:**
   All payload data stored in the database must remain language-neutral structured data (`pendingCount`, `primary` range, `targetPage`, `targetUrlKind`, `planName`, `planId`). Never persist formatted or localized sentences in database rows.
3. **Cap Isolation:**
   Dedicated plan reminders must never count against the cap of 3 general reminders (`MAX_GENERAL_WIRD_REMINDERS = 3`). The cap applies strictly to general slots. Dedicated reminders are upper-bounded solely by the user's active plans.
4. **Strict Dedup Exclusion Rule:**
   Any plan bound to a dedicated reminder must be strictly excluded from all general reminder aggregations. General resolvers must query and filter out bound plans before computing pending counts, preventing double-notifications on the same calendar day.



---

## 14. Revision History

- **2026-09-12**: Folded multi-reminder (cap of 3) and dedicated per-wird binding addendum into main specification. Superseded single-reminder model (**D1 superseded**: replaced single `plans.daily_reminder:<userId>` dedupe key with slot-based keys `plans.daily_reminder:<userId>:slot:<1-3>` up to 3 slots, plus dedicated per-wird keys `plans.daily_reminder:<userId>:plan:<planId>`), superseded in-app channel references (**D7 updated**: push-only delivery, in-app feed retired), added decisions **D9–D13** for plan deactivation auto-cancellation, silent skip when all plans are bound, personalized dedicated titles, hero count aggregation, and 6-hour slot presets.
