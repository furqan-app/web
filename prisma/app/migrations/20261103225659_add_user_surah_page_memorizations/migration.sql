-- CreateTable
CREATE TABLE `user_surah_page_memorizations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `chapter_id` INTEGER NOT NULL,
    `page_number` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `user_surah_page_memorizations_user_id_chapter_id_idx`(`user_id`, `chapter_id`),
    UNIQUE INDEX `user_surah_page_memorizations_user_id_chapter_id_page_number_key`(`user_id`, `chapter_id`, `page_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
