-- Clear existing rows first (marks data is disposable — ADR 0025). This makes
-- the migration safe to apply on any environment via `migrate deploy`: the
-- new NOT NULL `category` column has no backfill to do, and the new unique key
-- [marked_type, marked_id, to_user] cannot collide with legacy spots that
-- carried both a "color" and a "note" row under the old 4-column unique key.
DELETE FROM `marks`;

-- DropIndex
DROP INDEX `marks_marked_type_marked_id_mark_type_to_user_key` ON `marks`;

-- AlterTable
ALTER TABLE `marks` DROP COLUMN `mark_type`,
    DROP COLUMN `mark_value`,
    ADD COLUMN `category` VARCHAR(191) NOT NULL,
    ADD COLUMN `comment` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `marks_marked_type_marked_id_to_user_key` ON `marks`(`marked_type`, `marked_id`, `to_user`);
