import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, tx: Prisma.TransactionClient) {
    const walletNumber = this.generateWalletNumber();

    return tx.wallet.create({
      data: {
        walletNumber,
        userId,
      },
    });
  }

  private generateWalletNumber(): string {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  }

  async findByUserId(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async findRecipientByWalletNumber(walletNumber: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: {
        walletNumber,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!wallet) {
      throw new NotFoundException('Recipient wallet not found');
    }

    return {
      walletNumber: wallet.walletNumber,
      firstName: wallet.user.firstName,
      lastName: wallet.user.lastName,
    };
  }
}
