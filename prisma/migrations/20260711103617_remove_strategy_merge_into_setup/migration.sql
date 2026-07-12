-- DropForeignKey
ALTER TABLE `strategy` DROP FOREIGN KEY `Strategy_userId_fkey`;

-- DropForeignKey
ALTER TABLE `trade` DROP FOREIGN KEY `Trade_strategyId_fkey`;

-- AlterTable
ALTER TABLE `trade` DROP COLUMN `strategyId`;

-- DropTable
DROP TABLE `strategy`;

