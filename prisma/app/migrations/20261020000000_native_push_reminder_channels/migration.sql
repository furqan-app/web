-- ADR 0076 (#792): wird reminders now fan out to ["push", "native_push"].
-- ScheduledNotification rows persist their channel list at upsert time, so
-- rows saved before this change would otherwise never reach the new native
-- channel without the user re-saving the slot.
UPDATE `scheduled_notifications`
SET channels = JSON_ARRAY_APPEND(channels, '$', 'native_push')
WHERE type = 'plans.daily_reminder'
  AND channels IS NOT NULL
  AND NOT JSON_CONTAINS(channels, JSON_QUOTE('native_push'), '$');
