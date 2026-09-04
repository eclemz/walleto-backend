-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('NGN', 'USD');

-- AlterTable
ALTER TABLE "Transaction"
ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'NGN';

-- AlterTable
ALTER TABLE "Wallet"
ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'NGN';
