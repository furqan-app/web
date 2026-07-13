-- DropIndex
DROP INDEX `marks_marked_type_marked_id_mark_type_to_user_key` ON `marks`;

-- AlterTable
ALTER TABLE `marks` DROP COLUMN `mark_type`,
    DROP COLUMN `mark_value`,
    ADD COLUMN `category` VARCHAR(191) NOT NULL,
    ADD COLUMN `comment` TEXT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `marks_marked_type_marked_id_to_user_key` ON `marks`(`marked_type`, `marked_id`, `to_user`);
