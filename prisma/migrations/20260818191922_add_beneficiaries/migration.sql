-- CreateEnum
CREATE TYPE "BeneficiaryType" AS ENUM ('WALLETO', 'US_DOMESTIC', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS');

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BeneficiaryType" NOT NULL,
    "name" TEXT NOT NULL,
    "walletNumber" TEXT,
    "bankName" TEXT,
    "bankAddress" TEXT,
    "country" TEXT,
    "currency" "Currency",
    "accountNumber" TEXT,
    "accountType" "AccountType",
    "routingNumber" TEXT,
    "iban" TEXT,
    "swiftBic" TEXT,
    "localBankIdentifier" TEXT,
    "beneficiaryAddress" TEXT,
    "purpose" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Beneficiary_userId_idx" ON "Beneficiary"("userId");

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
