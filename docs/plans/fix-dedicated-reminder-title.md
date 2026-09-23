---
title: Fix dedicated reminder title fallback
type: bug
date: 2026-09-23
status: implemented
area: notifications
issue: 658
---

# Fix dedicated reminder title fallback

## Summary
When a user sets both a general reminder and a dedicated reminder for a specific plan, they appear to only receive the general reminder. This happens because when a plan lacks a custom name, the dedicated reminder falls back to the generic 'Daily Wird' title and identical body as the general reminder, making them visually indistinguishable. This plan proposes using the plan's template name as a fallback.

## Root Cause / Approach
If a plan lacks a `name`, the reminder dispatch uses `null`. The notification rendering logic currently checks if `planName` is truthy, and if not, falls back to "Daily Wird" (`notifications.types.plansDailyReminder.title`). 
By passing the plan's `template_key` to the payload, we can use `PLAN_TEMPLATE_UI` to resolve the localized template name (e.g. "Al-Husun Al-Khamsa") when `planName` is missing, preventing the title collision.

## Decision Tree / Algorithm
1. In `resolveDedicatedWirdDispatch`, pass `plan.template_key` to `buildReminderPayload`.
2. In `buildReminderPayload`, accept `templateKey?: string | null` and include it in the `PlanDailyReminderPayload`.
3. In `NOTIFICATION_TYPES["plans.daily_reminder"].render`, if `payload.planName` is missing but `payload.templateKey` exists, use `PLAN_TEMPLATE_UI[payload.templateKey].labelKey` to construct a title like "Reminder: Al-Husun Al-Khamsa".
4. If both are missing, fall back to "Daily Wird".

## Verified Test Cases
- **Plan with explicit name:** Payload has `planName="My Hifz"`. Notification title: "Reminder: My Hifz".
- **Plan with no name, husun template:** Payload has `planName=null, templateKey="husun"`. Notification title: "Reminder: Al-Husun Al-Khamsa" (or its Arabic translation).
- **General reminder:** Payload has neither `planName` nor `templateKey`. Notification title: "Daily Wird".

## Files to Change
- `app/lib/notifications/wird-reminder-resolver.ts` — Pass `templateKey` from the `plan` record into `buildReminderPayload`. Update the signature of `buildReminderPayload`.
- `app/constants/notifications.ts` — Update `PlanDailyReminderPayload` to include `templateKey`. Update `render` for `plans.daily_reminder` to import and use `PLAN_TEMPLATE_UI`.

## Constraints
- Do not import `app/constants/plan-ui.ts` into `app/lib/notifications/wird-reminder-resolver.ts` (keep UI localization details in the frontend/constants layer). The resolver should just pass the raw `templateKey`.
- Ensure tests still pass (e.g. `npx vitest run app/lib/notifications/wird-reminder-resolver.test.ts`).

## What NOT to Do
- None known.

## Decisions Made
- Use the plan template's `labelKey` as the fallback name to provide a descriptive title without requiring user input.
