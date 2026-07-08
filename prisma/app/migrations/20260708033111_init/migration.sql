-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `page_number` INTEGER NOT NULL,
    `from_user` INTEGER NOT NULL,
    `to_user` INTEGER NOT NULL,
    `marked_type` VARCHAR(191) NOT NULL,
    `marked_id` VARCHAR(191) NOT NULL,
    `mark_type` VARCHAR(191) NOT NULL,
    `mark_value` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `marks_marked_type_marked_id_mark_type_to_user_key`(`marked_type`, `marked_id`, `mark_type`, `to_user`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mushaf_share_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `owner_user` INTEGER NOT NULL,
    `redeemed_at` DATETIME(3) NULL,
    `redeemed_by` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mushaf_share_codes_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mushaf_access_grants` (
    `id` VARCHAR(191) NOT NULL,
    `owner_user` INTEGER NOT NULL,
    `viewer_user` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `mushaf_access_grants_owner_user_viewer_user_key`(`owner_user`, `viewer_user`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
