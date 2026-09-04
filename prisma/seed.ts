import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import {
  PrismaClient,
  Role,
  Currency,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  /*
   * Clear existing development data.
   *
   * Order matters because transactions reference wallets,
   * and wallets reference users.
   */
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Existing development data cleared.');

  /*
   * Passwords
   */
  const adminPassword = await bcrypt.hash(
    'AdminPass123!',
    10,
  );

  const demoPassword = await bcrypt.hash(
    'DemoPass123!',
    10,
  );

  /*
   * ADMIN
   */
  const admin = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@walleto.com',
      password: adminPassword,
      phoneNumber: '+1 415 555 0100',
      role: Role.ADMIN,
    },
  });

  /*
   * CUSTOMER 1
   */
  const jordan = await prisma.user.create({
    data: {
      firstName: 'Jordan',
      lastName: 'Ellis',
      email: 'jordan@walleto.com',
      password: demoPassword,
      phoneNumber: '+1 415 555 0192',
      role: Role.CUSTOMER,
    },
  });

  /*
   * CUSTOMER 2
   */
  const alex = await prisma.user.create({
    data: {
      firstName: 'Alex',
      lastName: 'Mercer',
      email: 'alex@walleto.com',
      password: demoPassword,
      phoneNumber: '+1 415 555 0188',
      role: Role.CUSTOMER,
    },
  });

  /*
   * WALLETS
   */
  const jordanWallet = await prisma.wallet.create({
    data: {
      walletNumber: '8493029201',
      balance: 4750,
      currency: Currency.USD,
      userId: jordan.id,
    },
  });

  const alexWallet = await prisma.wallet.create({
    data: {
      walletNumber: '5587912929',
      balance: 1250,
      currency: Currency.USD,
      userId: alex.id,
    },
  });

  console.log('👛 Wallets created.');

  /*
   * TRANSACTIONS
   *
   * We create a realistic history whose totals
   * reconcile with the wallet balances.
   */

  // Jordan deposits $5,000
  await prisma.transaction.create({
    data: {
      amount: 5000,
      currency: Currency.USD,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      description: 'Initial bank deposit',
      receiverWalletId: jordanWallet.id,
    },
  });

  // Jordan sends Alex $750
  await prisma.transaction.create({
    data: {
      amount: 750,
      currency: Currency.USD,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      description: 'Shared expenses',
      senderWalletId: jordanWallet.id,
      receiverWalletId: alexWallet.id,
    },
  });

  // Alex deposits $1,000
  await prisma.transaction.create({
    data: {
      amount: 1000,
      currency: Currency.USD,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      description: 'Bank transfer',
      receiverWalletId: alexWallet.id,
    },
  });

  // Alex withdraws $500
  await prisma.transaction.create({
    data: {
      amount: 500,
      currency: Currency.USD,
      type: TransactionType.WITHDRAWAL,
      status: TransactionStatus.COMPLETED,
      description: 'ATM withdrawal',
      senderWalletId: alexWallet.id,
    },
  });

  // Jordan deposits another $1,000
  await prisma.transaction.create({
    data: {
      amount: 1000,
      currency: Currency.USD,
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.COMPLETED,
      description: 'Payroll deposit',
      receiverWalletId: jordanWallet.id,
    },
  });

  // Jordan sends Alex another $500
  await prisma.transaction.create({
    data: {
      amount: 500,
      currency: Currency.USD,
      type: TransactionType.TRANSFER,
      status: TransactionStatus.COMPLETED,
      description: 'Dinner and groceries',
      senderWalletId: jordanWallet.id,
      receiverWalletId: alexWallet.id,
    },
  });

  // Alex withdraws another $500
  await prisma.transaction.create({
    data: {
      amount: 500,
      currency: Currency.USD,
      type: TransactionType.WITHDRAWAL,
      status: TransactionStatus.COMPLETED,
      description: 'Cash withdrawal',
      senderWalletId: alexWallet.id,
    },
  });

  console.log('💳 Transactions created.');

  console.log('');
  console.log('======================================');
  console.log('        USD DEMO DATABASE READY');
  console.log('======================================');
  console.log('');
  console.log('ADMIN');
  console.log('Email:    admin@walleto.com');
  console.log('Password: AdminPass123!');
  console.log('');
  console.log('CUSTOMER 1');
  console.log('Name:     Jordan Ellis');
  console.log('Email:    jordan@walleto.com');
  console.log('Password: DemoPass123!');
  console.log('Wallet:   8493029201');
  console.log('Balance:  $4,750.00');
  console.log('');
  console.log('CUSTOMER 2');
  console.log('Name:     Alex Mercer');
  console.log('Email:    alex@walleto.com');
  console.log('Password: DemoPass123!');
  console.log('Wallet:   5587912929');
  console.log('Balance:  $1,250.00');
  console.log('');
  console.log('Total wallet balance: $6,000.00');
  console.log('======================================');

  /*
   * Prevent unused-variable lint warnings in environments
   * where the created admin is otherwise not referenced.
   */
  void admin;
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
