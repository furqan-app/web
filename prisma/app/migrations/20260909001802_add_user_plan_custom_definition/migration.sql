-- AlterTable
ALTER TABLE `user_plans` ADD COLUMN `definition` JSON NULL,
    ADD COLUMN `name` VARCHAR(191) NULL;
