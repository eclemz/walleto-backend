import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getOverview() {
    const [
      totalUsers,
      activeUsers,
      totalTransactions,
      completedTransactions,
      deposits,
      withdrawals,
      transfers,
      totalWalletBalance,
    ] = await Promise.all([
      this.prisma.user.count(),

      this.prisma.user.count({
        where: {
          status: 'ACTIVE',
        },
      }),

      this.prisma.transaction.count(),

      this.prisma.transaction.count({
        where: {
          status: 'COMPLETED',
        },
      }),

      this.prisma.transaction.aggregate({
        where: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.transaction.aggregate({
        where: {
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.transaction.aggregate({
        where: {
          type: 'TRANSFER',
          status: 'COMPLETED',
        },
        _sum: {
          amount: true,
        },
      }),

      this.prisma.wallet.aggregate({
        _sum: {
          balance: true,
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
      },

      transactions: {
        total: totalTransactions,
        completed: completedTransactions,
      },

      volume: {
        deposits: deposits._sum.amount ?? 0,
        withdrawals: withdrawals._sum.amount ?? 0,
        transfers: transfers._sum.amount ?? 0,
      },

      totalWalletBalance:
        totalWalletBalance._sum.balance ?? 0,

      currency: 'USD',
    };
  }

  async getUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        createdAt: true,

        wallet: {
          select: {
            walletNumber: true,
            balance: true,
            currency: true,
          },
        },
      },
    });

    return users;
  }

  async getTransactions() {
    const transactions =
      await this.prisma.transaction.findMany({
        orderBy: {
          createdAt: 'desc',
        },

        take: 100,

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

    return transactions;
  }

  async getPendingTransactions() {
    return this.prisma.transaction.findMany({
      where: {
        status: 'PENDING',
        beneficiaryId: {
          not: null,
        },
      },

      orderBy: {
        createdAt: 'asc',
      },

      include: {
        beneficiary: true,

        senderWallet: {
          select: {
            id: true,
            walletNumber: true,
            balance: true,
            currency: true,

            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async approveTransaction(
    transactionId: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const transaction =
          await tx.transaction.findUnique({
            where: {
              id: transactionId,
            },

            include: {
              beneficiary: true,

              senderWallet: true,
            },
          });

        if (!transaction) {
          throw new NotFoundException(
            'Transaction not found',
          );
        }

        if (
          transaction.status !== 'PENDING'
        ) {
          throw new BadRequestException(
            `Transaction is already ${transaction.status.toLowerCase()}`,
          );
        }

        if (!transaction.beneficiaryId) {
          throw new BadRequestException(
            'Only external beneficiary transfers require admin approval',
          );
        }

        if (!transaction.senderWallet) {
          throw new BadRequestException(
            'Sender wallet not found',
          );
        }

        const wallet =
          await tx.wallet.findUnique({
            where: {
              id: transaction.senderWallet.id,
            },
          });

        if (!wallet) {
          throw new BadRequestException(
            'Sender wallet not found',
          );
        }

        if (
          wallet.balance.lessThan(
            transaction.amount,
          )
        ) {
          await tx.transaction.update({
            where: {
              id: transaction.id,
            },
            data: {
              status: 'FAILED',
            },
          });

          throw new BadRequestException(
            'Transaction failed because the sender has insufficient balance',
          );
        }

        const updatedWallet =
          await tx.wallet.update({
            where: {
              id: wallet.id,
            },

            data: {
              balance: {
                decrement:
                  transaction.amount,
              },
            },
          });

        const updatedTransaction =
          await tx.transaction.update({
            where: {
              id: transaction.id,
            },

            data: {
              status: 'COMPLETED',
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
            },
          });

        return {
          message:
            'Transfer approved successfully',

          transaction:
            updatedTransaction,

          wallet: updatedWallet,
        };
      },
    );
  }

  async rejectTransaction(
    transactionId: string,
  ) {
    const transaction =
      await this.prisma.transaction.findUnique({
        where: {
          id: transactionId,
        },

        include: {
          beneficiary: true,
        },
      });

    if (!transaction) {
      throw new NotFoundException(
        'Transaction not found',
      );
    }

    if (
      transaction.status !== 'PENDING'
    ) {
      throw new BadRequestException(
        `Transaction is already ${transaction.status.toLowerCase()}`,
      );
    }

    if (!transaction.beneficiaryId) {
      throw new BadRequestException(
        'Only external beneficiary transfers require admin approval',
      );
    }

    const updatedTransaction =
      await this.prisma.transaction.update({
        where: {
          id: transaction.id,
        },

        data: {
          status: 'FAILED',
        },

        include: {
          beneficiary: true,
        },
      });

    return {
      message:
        'Transfer rejected successfully',

      transaction: updatedTransaction,
    };
  }

  async suspendUser(userId: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    if (user.role === 'ADMIN') {
      throw new BadRequestException(
        'Admin accounts cannot be suspended',
      );
    }

    if (user.status === 'SUSPENDED') {
      return {
        message: 'User is already suspended',
        user,
      };
    }

    const updatedUser =
      await this.prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          status: 'SUSPENDED',
        },

        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
        },
      });

    return {
      message:
        'User suspended successfully',

      user: updatedUser,
    };
  }

  async activateUser(userId: string) {
    const user =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },

        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
        },
      });

    if (!user) {
      throw new NotFoundException(
        'User not found',
      );
    }

    const updatedUser =
      await this.prisma.user.update({
        where: {
          id: userId,
        },

        data: {
          status: 'ACTIVE',
        },

        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          status: true,
        },
      });

    return {
      message:
        'User activated successfully',

      user: updatedUser,
    };
  }
}
