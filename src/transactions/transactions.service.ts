import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { OtpService } from '../otp/otp.service';
import { PrismaService } from '../prisma/prisma.service';

import { DepositDto } from './dto/deposit.dto';
import { PaginationDto } from './dto/pagination.dto';
import { TransferDto } from './dto/transfer.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
  ) {}

  async transfer(senderUserId: string, transferDto: TransferDto) {
    await this.ensureAccountActive(senderUserId);

    /*
     * WALLETO TRANSFER
     */
    if (transferDto.receiverWalletNumber) {
      return this.transferToWalleto(senderUserId, transferDto);
    }

    /*
     * EXTERNAL BANK TRANSFER
     */
    if (transferDto.beneficiaryId) {
      return this.transferToBeneficiary(senderUserId, transferDto);
    }

    throw new BadRequestException(
      'A Walleto account or beneficiary is required',
    );
  }

  private async transferToWalleto(
    senderUserId: string,
    transferDto: TransferDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const senderWallet = await tx.wallet.findUnique({
        where: {
          userId: senderUserId,
        },
      });

      if (!senderWallet) {
        throw new BadRequestException('Sender wallet not found');
      }

      const receiverWallet = await tx.wallet.findUnique({
        where: {
          walletNumber: transferDto.receiverWalletNumber,
        },
      });

      if (!receiverWallet) {
        throw new BadRequestException('Receiver wallet not found');
      }

      if (senderWallet.id === receiverWallet.id) {
        throw new BadRequestException(
          'You cannot transfer money to your own wallet',
        );
      }

      if (senderWallet.balance.lessThan(transferDto.amount)) {
        throw new BadRequestException('Insufficient balance');
      }

      await this.otpService.verifyTransactionOtp(
        senderUserId,
        transferDto.otpChallengeId,
        transferDto.otpCode,
        {
          operation: 'TRANSFER',
          amount: transferDto.amount,
          receiverWalletNumber: transferDto.receiverWalletNumber,
          description: transferDto.description,
        },
      );

      const updatedSender = await tx.wallet.update({
        where: {
          id: senderWallet.id,
        },
        data: {
          balance: {
            decrement: transferDto.amount,
          },
        },
      });

      const updatedReceiver = await tx.wallet.update({
        where: {
          id: receiverWallet.id,
        },
        data: {
          balance: {
            increment: transferDto.amount,
          },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          amount: transferDto.amount,
          currency: senderWallet.currency,
          type: 'TRANSFER',
          status: 'COMPLETED',
          description: transferDto.description,
          senderWalletId: senderWallet.id,
          receiverWalletId: receiverWallet.id,
        },
      });

      this.logger.log(
        `Walleto transfer completed: ${transferDto.amount} from ${senderWallet.walletNumber} to ${receiverWallet.walletNumber}`,
      );

      return {
        transaction,
        senderWallet: updatedSender,
        receiverWallet: updatedReceiver,
      };
    });
  }

  private async transferToBeneficiary(
    senderUserId: string,
    transferDto: TransferDto,
  ) {
    /*
     * Find the beneficiary before entering the
     * Prisma interactive transaction.
     *
     * Ownership is enforced here.
     */
    const beneficiary =
      //here is the first beneficiary error
      await this.prisma.beneficiary.findFirst({
        where: {
          id: transferDto.beneficiaryId,
          userId: senderUserId,
        },
      });

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const senderWallet = await tx.wallet.findUnique({
        where: {
          userId: senderUserId,
        },
      });

      if (!senderWallet) {
        throw new BadRequestException('Sender wallet not found');
      }

      if (senderWallet.balance.lessThan(transferDto.amount)) {
        throw new BadRequestException('Insufficient balance');
      }

      await this.otpService.verifyTransactionOtp(
        senderUserId,
        transferDto.otpChallengeId,
        transferDto.otpCode,
        {
          operation: 'TRANSFER',
          amount: transferDto.amount,
          beneficiaryId: transferDto.beneficiaryId,
          description: transferDto.description,
        },
      );

      /*
       * External transfers remain PENDING until
       * a real banking/payment provider confirms
       * the transfer.
       */
      const transaction = await tx.transaction.create({
        data: {
          amount: transferDto.amount,
          currency: senderWallet.currency,
          type: 'TRANSFER',
          status: 'PENDING',
          description: transferDto.description,

          senderWalletId: senderWallet.id,

          beneficiaryId: beneficiary.id,
        },
      });

      this.logger.log(
        `External transfer created: ${transferDto.amount} from ${senderWallet.walletNumber} to beneficiary ${beneficiary.id}`,
      );

      return {
        transaction,
        beneficiary,
        wallet: senderWallet,
        message: 'Transfer submitted and is awaiting processing',
      };
    });
  }

  async deposit(userId: string, depositDto: DepositDto) {
    await this.ensureAccountActive(userId);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          userId,
        },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const fundingSource = await tx.fundingSource.findFirst({
        where: {
          id: depositDto.fundingSourceId,
          userId,
        },
      });

      if (!fundingSource) {
        throw new BadRequestException('Funding source not found');
      }

      await this.otpService.verifyTransactionOtp(
        userId,
        depositDto.otpChallengeId,
        depositDto.otpCode,
        {
          operation: 'DEPOSIT',
          amount: depositDto.amount,
          fundingSourceId: depositDto.fundingSourceId,
          description: depositDto.description,
        },
      );

      const updatedWallet = await tx.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance: {
            increment: depositDto.amount,
          },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          amount: depositDto.amount,
          currency: wallet.currency,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          description: depositDto.description,
          receiverWalletId: wallet.id,
          fundingSourceId: depositDto.fundingSourceId,
        },
      });

      this.logger.log(
        `Deposit completed: ${depositDto.amount} to ${wallet.walletNumber}`,
      );

      return {
        transaction,
        wallet: updatedWallet,
      };
    });
  }

  async withdraw(userId: string, withdrawDto: WithdrawDto) {
    await this.ensureAccountActive(userId);

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          userId,
        },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      if (wallet.balance.lessThan(withdrawDto.amount)) {
        throw new BadRequestException('Insufficient balance');
      }

      const fundingSource = await tx.fundingSource.findFirst({
        where: {
          id: withdrawDto.fundingSourceId,
          userId,
        },
      });

      if (!fundingSource) {
        throw new BadRequestException('Funding source not found');
      }

      await this.otpService.verifyTransactionOtp(
        userId,
        withdrawDto.otpChallengeId,
        withdrawDto.otpCode,
        {
          operation: 'WITHDRAWAL',
          amount: withdrawDto.amount,
          fundingSourceId: withdrawDto.fundingSourceId,
          description: withdrawDto.description,
        },
      );

      const updatedWallet = await tx.wallet.update({
        where: {
          id: wallet.id,
        },
        data: {
          balance: {
            decrement: withdrawDto.amount,
          },
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          amount: withdrawDto.amount,
          currency: wallet.currency,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          description: withdrawDto.description,
          senderWalletId: wallet.id,
          fundingSourceId: withdrawDto.fundingSourceId,
        },
      });

      this.logger.log(
        `Withdrawal completed: ${withdrawDto.amount} from ${wallet.walletNumber}`,
      );

      return {
        transaction,
        wallet: updatedWallet,
      };
    });
  }

  async getHistory(userId: string, paginationDto: PaginationDto) {
    const wallet = await this.prisma.wallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const { page, limit, type, status, search } = paginationDto;

    const skip = (page - 1) * limit;

    const where = {
      AND: [
        {
          OR: [
            {
              senderWalletId: wallet.id,
            },
            {
              receiverWalletId: wallet.id,
            },
          ],
        },

        ...(type
          ? [
              {
                type: type as any,
              },
            ]
          : []),

        ...(status
          ? [
              {
                status: status as any,
              },
            ]
          : []),

        ...(search
          ? [
              {
                OR: [
                  {
                    description: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    id: {
                      contains: search,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    type: {
                      equals: search.toUpperCase() as any,
                    },
                  },
                  {
                    status: {
                      equals: search.toUpperCase() as any,
                    },
                  },
                ],
              },
            ]
          : []),
      ],
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: {
          //here is the second beneficiary error
          beneficiary: true,
        },
      }),

      this.prisma.transaction.count({
        where,
      }),
    ]);

    const data = transactions.map((transaction) => {
      let direction: 'INCOMING' | 'OUTGOING';

      if (transaction.type === 'DEPOSIT') {
        direction = 'INCOMING';
      } else if (transaction.type === 'WITHDRAWAL') {
        direction = 'OUTGOING';
      } else if (transaction.receiverWalletId === wallet.id) {
        direction = 'INCOMING';
      } else {
        direction = 'OUTGOING';
      }

      return {
        ...transaction,
        direction,
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSummary(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const transactions = await this.prisma.transaction.findMany({
      where: {
        OR: [
          {
            senderWalletId: wallet.id,
          },
          {
            receiverWalletId: wallet.id,
          },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let income = 0;
    let expenses = 0;
    let transfers = 0;

    for (const transaction of transactions) {
      const amount = Number(transaction.amount);

      if (transaction.type === 'DEPOSIT') {
        income += amount;
      }

      if (transaction.type === 'WITHDRAWAL') {
        expenses += amount;
      }

      if (transaction.type === 'TRANSFER') {
        transfers += 1;

        if (transaction.receiverWalletId === wallet.id) {
          income += amount;
        }

        if (transaction.senderWalletId === wallet.id) {
          expenses += amount;
        }
      }
    }

    const recentTransactions = transactions.slice(0, 5).map((transaction) => {
      let direction: 'INCOMING' | 'OUTGOING';

      if (transaction.type === 'DEPOSIT') {
        direction = 'INCOMING';
      } else if (transaction.type === 'WITHDRAWAL') {
        direction = 'OUTGOING';
      } else if (transaction.receiverWalletId === wallet.id) {
        direction = 'INCOMING';
      } else {
        direction = 'OUTGOING';
      }

      return {
        ...transaction,
        amount: Number(transaction.amount),
        direction,
      };
    });

    const now = new Date();

    const monthlyFlow = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);

      return {
        month: date.toLocaleString('en-US', {
          month: 'short',
        }),
        income: 0,
        expenses: 0,
      };
    });

    for (const transaction of transactions) {
      const transactionDate = new Date(transaction.createdAt);

      const monthDifference =
        (now.getFullYear() - transactionDate.getFullYear()) * 12 +
        (now.getMonth() - transactionDate.getMonth());

      if (monthDifference < 0 || monthDifference > 5) {
        continue;
      }

      const index = 5 - monthDifference;

      const amount = Number(transaction.amount);

      if (transaction.type === 'DEPOSIT') {
        monthlyFlow[index].income += amount;
      } else if (transaction.type === 'WITHDRAWAL') {
        monthlyFlow[index].expenses += amount;
      } else if (transaction.type === 'TRANSFER') {
        if (transaction.receiverWalletId === wallet.id) {
          monthlyFlow[index].income += amount;
        }

        if (transaction.senderWalletId === wallet.id) {
          monthlyFlow[index].expenses += amount;
        }
      }
    }

    return {
      balance: Number(wallet.balance),
      currency: wallet.currency,
      income,
      expenses,
      transfers,
      recentTransactions,
      monthlyFlow,
    };
  }

  async getTransactionById(userId: string, transactionId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      throw new BadRequestException('Wallet not found');
    }

    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        OR: [
          {
            senderWalletId: wallet.id,
          },
          {
            receiverWalletId: wallet.id,
          },
        ],
      },

      include: {
        beneficiary: true,

        senderWallet: {
          select: {
            walletNumber: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },

        receiverWallet: {
          select: {
            walletNumber: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    let direction: 'INCOMING' | 'OUTGOING';

    if (transaction.type === 'DEPOSIT') {
      direction = 'INCOMING';
    } else if (transaction.type === 'WITHDRAWAL') {
      direction = 'OUTGOING';
    } else if (transaction.receiverWalletId === wallet.id) {
      direction = 'INCOMING';
    } else {
      direction = 'OUTGOING';
    }

    return {
      ...transaction,
      amount: Number(transaction.amount),
      direction,
    };
  }

  private async ensureAccountActive(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        status: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Your account is currently restricted from performing transactions. Please contact customer service for assistance.',
      );
    }
  }
}
