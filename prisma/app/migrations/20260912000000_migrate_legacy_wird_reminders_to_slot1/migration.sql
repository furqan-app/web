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

