-- CreateTable
CREATE TABLE `user_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `template_key` VARCHAR(191) NOT NULL,
    `params` JSON NOT NULL,
    `start_date` DATE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_plans_user_id_status_idx`(`user_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plan_progress_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_plan_id` INTEGER NOT NULL,
    `track_key` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'page',
    `range_start` VARCHAR(191) NOT NULL,
    `range_end` VARCHAR(191) NOT NULL,
    `completed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `plan_progress_entries_user_plan_id_track_key_date_key`(`user_plan_id`, `track_key`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `plan_progress_entries` ADD CONSTRAINT `plan_progress_entries_user_plan_id_fkey` FOREIGN KEY (`user_plan_id`) REFERENCES `user_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
