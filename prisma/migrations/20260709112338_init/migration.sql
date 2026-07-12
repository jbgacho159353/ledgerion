-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `startingBalance` DECIMAL(12, 2) NOT NULL DEFAULT 10000,
    `riskPercent` DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Account_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Trade` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tradeDate` DATE NOT NULL,
    `pair` VARCHAR(191) NOT NULL,
    `session` VARCHAR(191) NOT NULL,
    `direction` VARCHAR(191) NOT NULL,
    `lotSize` DECIMAL(10, 2) NULL,
    `entryPrice` DECIMAL(14, 5) NULL,
    `stopLoss` DECIMAL(14, 5) NULL,
    `takeProfit` DECIMAL(14, 5) NULL,
    `exitPrice` DECIMAL(14, 5) NULL,
    `pips` DECIMAL(10, 2) NULL,
    `riskAmount` DECIMAL(12, 2) NULL,
    `pnl` DECIMAL(12, 2) NOT NULL,
    `rMultiple` DECIMAL(6, 2) NULL,
    `setup` VARCHAR(191) NULL,
    `result` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Trade_userId_idx`(`userId`),
    INDEX `Trade_userId_tradeDate_idx`(`userId`, `tradeDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Trade` ADD CONSTRAINT `Trade_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
