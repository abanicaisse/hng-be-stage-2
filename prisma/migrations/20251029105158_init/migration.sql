-- CreateTable
CREATE TABLE `countries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `capital` VARCHAR(255) NULL,
    `region` VARCHAR(100) NULL,
    `population` BIGINT NOT NULL,
    `currency_code` VARCHAR(10) NULL,
    `exchange_rate` DOUBLE NULL,
    `estimated_gdp` DOUBLE NULL,
    `flag_url` TEXT NULL,
    `last_refreshed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `countries_name_key`(`name`),
    INDEX `countries_region_idx`(`region`),
    INDEX `countries_currency_code_idx`(`currency_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `last_refreshed_at` DATETIME(3) NOT NULL,
    `total_countries` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
