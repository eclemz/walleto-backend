import { Test, TestingModule } from '@nestjs/testing';

import { OtpService } from '../otp/otp.service';
import { PrismaService } from '../prisma/prisma.service';

import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  let service: TransactionsService;

  const prismaMock = {
    $transaction: jest.fn(),

    user: {
      findUnique: jest.fn(),
    },

    beneficiary: {
      findFirst: jest.fn(),
    },
  };

  const otpServiceMock = {
    verifyTransactionOtp: jest.fn(),
  };

  const txMock = {
    wallet: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },

    fundingSource: {
      findFirst: jest.fn(),
    },

    beneficiary: {
      findFirst: jest.fn(),
    },

    transaction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaMock.user.findUnique.mockResolvedValue({
      id: 'sender-user',
      status: 'ACTIVE',
    });

    prismaMock.$transaction.mockImplementation(async (callback: any) =>
      callback(txMock),
    );

    otpServiceMock.verifyTransactionOtp.mockResolvedValue({
      verified: true,
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,

        {
          provide: PrismaService,
          useValue: prismaMock,
        },

        {
          provide: OtpService,
          useValue: otpServiceMock,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  // ---------------------------------------------------------------------------
  // TRANSFERS
  // ---------------------------------------------------------------------------

  it('should reject a transfer when balance is insufficient', async () => {
    txMock.wallet.findUnique
      .mockResolvedValueOnce({
        id: 'sender-wallet',
        walletNumber: '1111111111',
        balance: {
          lessThan: jest.fn().mockReturnValue(true),
        },
        userId: 'sender-user',
      })
      .mockResolvedValueOnce({
        id: 'receiver-wallet',
        walletNumber: '2222222222',
        balance: {
          lessThan: jest.fn(),
        },
        userId: 'receiver-user',
      });

    await expect(
      service.transfer('sender-user', {
        receiverWalletNumber: '2222222222',
        amount: 10000,
        description: 'Test transfer',
        otpChallengeId: 'otp-challenge-1',
        otpCode: '123456',
      }),
    ).rejects.toThrow('Insufficient balance');

    expect(txMock.wallet.update).not.toHaveBeenCalled();

    expect(txMock.transaction.create).not.toHaveBeenCalled();
  });

  it('should successfully transfer money between wallets', async () => {
    txMock.wallet.findUnique
      .mockResolvedValueOnce({
        id: 'sender-wallet',
        walletNumber: '1111111111',
        balance: {
          lessThan: jest.fn().mockReturnValue(false),
        },
        userId: 'sender-user',
        currency: 'USD',
      })
      .mockResolvedValueOnce({
        id: 'receiver-wallet',
        walletNumber: '2222222222',
        balance: {
          lessThan: jest.fn(),
        },
        userId: 'receiver-user',
        currency: 'USD',
      });

    txMock.wallet.update
      .mockResolvedValueOnce({
        id: 'sender-wallet',
        walletNumber: '1111111111',
        balance: '30000',
        userId: 'sender-user',
        currency: 'USD',
      })
      .mockResolvedValueOnce({
        id: 'receiver-wallet',
        walletNumber: '2222222222',
        balance: '30000',
        userId: 'receiver-user',
        currency: 'USD',
      });

    txMock.transaction.create.mockResolvedValue({
      id: 'transaction-1',
      amount: '20000',
      type: 'TRANSFER',
      status: 'COMPLETED',
      senderWalletId: 'sender-wallet',
      receiverWalletId: 'receiver-wallet',
    });

    const result = await service.transfer('sender-user', {
      receiverWalletNumber: '2222222222',
      amount: 20000,
      description: 'Test transfer',
      otpChallengeId: 'otp-challenge-1',
      otpCode: '123456',
    });

    expect(otpServiceMock.verifyTransactionOtp).toHaveBeenCalledWith(
      'sender-user',
      'otp-challenge-1',
      '123456',
      {
        operation: 'TRANSFER',
        amount: 20000,
        receiverWalletNumber: '2222222222',
        description: 'Test transfer',
      },
    );

    expect(txMock.wallet.update).toHaveBeenCalledTimes(2);

    expect(txMock.wallet.update).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'sender-wallet',
      },
      data: {
        balance: {
          decrement: 20000,
        },
      },
    });

    expect(txMock.wallet.update).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'receiver-wallet',
      },
      data: {
        balance: {
          increment: 20000,
        },
      },
    });

    expect(txMock.transaction.create).toHaveBeenCalledWith({
      data: {
        amount: 20000,
        currency: 'USD',
        type: 'TRANSFER',
        status: 'COMPLETED',
        description: 'Test transfer',
        senderWalletId: 'sender-wallet',
        receiverWalletId: 'receiver-wallet',
      },
    });

    expect(result.transaction).toEqual({
      id: 'transaction-1',
      amount: '20000',
      type: 'TRANSFER',
      status: 'COMPLETED',
      senderWalletId: 'sender-wallet',
      receiverWalletId: 'receiver-wallet',
    });
  });

  it('should reject a transfer to the sender wallet', async () => {
    txMock.wallet.findUnique
      .mockResolvedValueOnce({
        id: 'same-wallet',
        walletNumber: '1111111111',
        balance: {
          lessThan: jest.fn().mockReturnValue(false),
        },
        userId: 'sender-user',
      })
      .mockResolvedValueOnce({
        id: 'same-wallet',
        walletNumber: '1111111111',
        balance: {
          lessThan: jest.fn(),
        },
        userId: 'sender-user',
      });

    await expect(
      service.transfer('sender-user', {
        receiverWalletNumber: '1111111111',
        amount: 10000,
        description: 'Self transfer',
        otpChallengeId: 'otp-challenge-1',
        otpCode: '123456',
      }),
    ).rejects.toThrow('You cannot transfer money to your own wallet');

    expect(txMock.wallet.update).not.toHaveBeenCalled();

    expect(txMock.transaction.create).not.toHaveBeenCalled();
  });

  it('should create an external beneficiary transfer as PENDING without deducting balance', async () => {
    txMock.wallet.findUnique.mockResolvedValue({
      id: 'sender-wallet',
      walletNumber: '1111111111',
      balance: {
        lessThan: jest.fn().mockReturnValue(false),
      },
      userId: 'sender-user',
      currency: 'USD',
    });

    prismaMock.beneficiary.findFirst.mockResolvedValue({
      id: 'beneficiary-1',
      userId: 'sender-user',
      name: 'John Smith',
      type: 'US_DOMESTIC',
      bankName: 'Demo Bank',
      accountNumber: '123456789',
    });

    txMock.transaction.create.mockResolvedValue({
      id: 'transaction-external-1',
      amount: '20000',
      currency: 'USD',
      type: 'TRANSFER',
      status: 'PENDING',
      description: 'External transfer',
      senderWalletId: 'sender-wallet',
      beneficiaryId: 'beneficiary-1',
    });

    const result = await service.transfer('sender-user', {
      beneficiaryId: 'beneficiary-1',
      amount: 20000,
      description: 'External transfer',
      otpChallengeId: 'otp-challenge-external-1',
      otpCode: '123456',
    });

    expect(otpServiceMock.verifyTransactionOtp).toHaveBeenCalledWith(
      'sender-user',
      'otp-challenge-external-1',
      '123456',
      {
        operation: 'TRANSFER',
        amount: 20000,
        beneficiaryId: 'beneficiary-1',
        description: 'External transfer',
      },
    );

    expect(txMock.wallet.update).not.toHaveBeenCalled();

    expect(txMock.transaction.create).toHaveBeenCalledWith({
      data: {
        amount: 20000,
        currency: 'USD',
        type: 'TRANSFER',
        status: 'PENDING',
        description: 'External transfer',
        senderWalletId: 'sender-wallet',
        beneficiaryId: 'beneficiary-1',
      },
    });

    expect(result.transaction.status).toBe('PENDING');
    const beneficiaryResult = result as {
      transaction: {
        status: string;
      };
      beneficiary: {
        id: string;
      };
    };

    expect(beneficiaryResult.transaction.status).toBe('PENDING');

    expect(beneficiaryResult.beneficiary.id).toBe('beneficiary-1');
  });
  // ---------------------------------------------------------------------------
  // WITHDRAWALS
  // ---------------------------------------------------------------------------

  it('should successfully withdraw money', async () => {
    txMock.wallet.findUnique.mockResolvedValue({
      id: 'wallet-1',
      walletNumber: '1111111111',
      balance: {
        lessThan: jest.fn().mockReturnValue(false),
      },
      userId: 'sender-user',
      currency: 'USD',
    });

    txMock.fundingSource.findFirst.mockResolvedValue({
      id: 'funding-source-1',
      userId: 'sender-user',
    });

    txMock.wallet.update.mockResolvedValue({
      id: 'wallet-1',
      walletNumber: '1111111111',
      balance: '30000',
      userId: 'sender-user',
      currency: 'USD',
    });

    txMock.transaction.create.mockResolvedValue({
      id: 'transaction-2',
      amount: '20000',
      type: 'WITHDRAWAL',
      status: 'COMPLETED',
      senderWalletId: 'wallet-1',
      receiverWalletId: null,
    });

    const result = await service.withdraw('sender-user', {
      amount: 20000,
      description: 'Cash withdrawal',
      fundingSourceId: 'funding-source-1',
      otpChallengeId: 'otp-challenge-2',
      otpCode: '123456',
    });

    expect(otpServiceMock.verifyTransactionOtp).toHaveBeenCalledWith(
      'sender-user',
      'otp-challenge-2',
      '123456',
      {
        operation: 'WITHDRAWAL',
        amount: 20000,
        fundingSourceId: 'funding-source-1',
        description: 'Cash withdrawal',
      },
    );

    expect(txMock.wallet.update).toHaveBeenCalledWith({
      where: {
        id: 'wallet-1',
      },
      data: {
        balance: {
          decrement: 20000,
        },
      },
    });

    expect(txMock.transaction.create).toHaveBeenCalledWith({
      data: {
        amount: 20000,
        currency: 'USD',
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        description: 'Cash withdrawal',
        senderWalletId: 'wallet-1',
        fundingSourceId: 'funding-source-1',
      },
    });

    expect(result.transaction.type).toBe('WITHDRAWAL');
  });

  it('should reject a withdrawal when balance is insufficient', async () => {
    txMock.wallet.findUnique.mockResolvedValue({
      id: 'wallet-1',
      walletNumber: '1111111111',
      balance: {
        lessThan: jest.fn().mockReturnValue(true),
      },
      userId: 'sender-user',
    });

    await expect(
      service.withdraw('sender-user', {
        amount: 100000,
        description: 'Should fail',
        fundingSourceId: 'funding-source-1',
        otpChallengeId: 'otp-challenge-3',
        otpCode: '123456',
      }),
    ).rejects.toThrow('Insufficient balance');

    expect(txMock.wallet.update).not.toHaveBeenCalled();

    expect(txMock.transaction.create).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // DEPOSITS
  // ---------------------------------------------------------------------------

  it('should successfully deposit money', async () => {
    txMock.wallet.findUnique.mockResolvedValue({
      id: 'wallet-1',
      walletNumber: '1111111111',
      balance: {
        lessThan: jest.fn(),
      },
      userId: 'user-1',
      currency: 'USD',
    });

    txMock.fundingSource.findFirst.mockResolvedValue({
      id: 'funding-source-1',
      userId: 'user-1',
    });

    txMock.wallet.update.mockResolvedValue({
      id: 'wallet-1',
      walletNumber: '1111111111',
      balance: '120000',
      userId: 'user-1',
      currency: 'USD',
    });

    txMock.transaction.create.mockResolvedValue({
      id: 'transaction-3',
      amount: '20000',
      type: 'DEPOSIT',
      status: 'COMPLETED',
      senderWalletId: null,
      receiverWalletId: 'wallet-1',
    });

    const result = await service.deposit('user-1', {
      amount: 20000,
      description: 'Initial funding',
      fundingSourceId: 'funding-source-1',
      otpChallengeId: 'otp-challenge-4',
      otpCode: '123456',
    });

    expect(otpServiceMock.verifyTransactionOtp).toHaveBeenCalledWith(
      'user-1',
      'otp-challenge-4',
      '123456',
      {
        operation: 'DEPOSIT',
        amount: 20000,
        fundingSourceId: 'funding-source-1',
        description: 'Initial funding',
      },
    );

    expect(txMock.wallet.update).toHaveBeenCalledWith({
      where: {
        id: 'wallet-1',
      },
      data: {
        balance: {
          increment: 20000,
        },
      },
    });

    expect(txMock.transaction.create).toHaveBeenCalledWith({
      data: {
        amount: 20000,
        currency: 'USD',
        type: 'DEPOSIT',
        status: 'COMPLETED',
        description: 'Initial funding',
        receiverWalletId: 'wallet-1',
        fundingSourceId: 'funding-source-1',
      },
    });

    expect(result.transaction.type).toBe('DEPOSIT');
  });

  it('should reject a deposit when wallet does not exist', async () => {
    txMock.wallet.findUnique.mockResolvedValue(null);

    await expect(
      service.deposit('unknown-user', {
        amount: 20000,
        description: 'Initial funding',
        fundingSourceId: 'funding-source-1',
        otpChallengeId: 'otp-challenge-5',
        otpCode: '123456',
      }),
    ).rejects.toThrow('Wallet not found');

    expect(txMock.wallet.update).not.toHaveBeenCalled();

    expect(txMock.transaction.create).not.toHaveBeenCalled();
  });
});
