import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaClient } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type TransactionOperation = 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL';

export type TransactionOtpMetadata = {
  operation: TransactionOperation;
  amount: number;
  receiverWalletNumber?: string;
  beneficiaryId?: string;
  fundingSourceId?: string;
  description?: string;
};

@Injectable()
export class OtpService {
  private readonly OTP_EXPIRY_MINUTES = 5;

  private readonly MAX_ATTEMPTS = 5;

  constructor(private readonly prisma: PrismaService) {}

  async requestTransactionOtp(
    userId: string,
    metadata: TransactionOtpMetadata,
  ) {
    const prisma = this.prisma as PrismaClient;

    await prisma.otpChallenge.updateMany({
      where: {
        userId,
        purpose: 'TRANSACTION',
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    const code = this.generateOtp();

    const codeHash = await bcrypt.hash(code, 10);

    const expiresAt = new Date(
      Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    const challenge = await prisma.otpChallenge.create({
      data: {
        userId,
        purpose: 'TRANSACTION',
        codeHash,
        expiresAt,
        metadata,
      },
    });

    return {
      challengeId: challenge.id,
      expiresAt: challenge.expiresAt,

      ...(process.env.NODE_ENV !== 'production' && {
        developmentCode: code,
      }),
    };
  }

  async verifyTransactionOtp(
    userId: string,
    challengeId: string,
    code: string,
    expectedMetadata: TransactionOtpMetadata,
  ) {
    const prisma = this.prisma as PrismaClient;

    const challenge = await prisma.otpChallenge.findFirst({
      where: {
        id: challengeId,
        userId,
        purpose: 'TRANSACTION',
      },
    });

    if (!challenge) {
      throw new BadRequestException('Invalid OTP challenge');
    }

    if (challenge.usedAt) {
      throw new BadRequestException('OTP challenge has already been used');
    }

    if (challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP has expired');
    }

    if (challenge.attempts >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many incorrect OTP attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const valid = await bcrypt.compare(code, challenge.codeHash);

    if (!valid) {
      await prisma.otpChallenge.update({
        where: {
          id: challenge.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      throw new BadRequestException('Invalid OTP');
    }

    const storedMetadata = challenge.metadata as TransactionOtpMetadata | null;

    if (!storedMetadata) {
      throw new BadRequestException('OTP transaction metadata is missing');
    }

    if (!this.metadataMatches(storedMetadata, expectedMetadata)) {
      throw new BadRequestException('OTP does not authorise this transaction');
    }

    /*
     * CRITICAL:
     *
     * Atomically claim the OTP.
     *
     * Only the first request that finds
     * usedAt = null can change it.
     */
    const claimed = await prisma.otpChallenge.updateMany({
      where: {
        id: challenge.id,
        userId,
        purpose: 'TRANSACTION',
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (claimed.count !== 1) {
      throw new BadRequestException('OTP challenge has already been used');
    }

    return {
      verified: true,
      challengeId: challenge.id,
    };
  }

  private metadataMatches(
    stored: TransactionOtpMetadata,
    expected: TransactionOtpMetadata,
  ) {
    if (stored.operation !== expected.operation) {
      return false;
    }

    if (Number(stored.amount) !== Number(expected.amount)) {
      return false;
    }

    if (stored.receiverWalletNumber !== expected.receiverWalletNumber) {
      return false;
    }

    if (stored.beneficiaryId !== expected.beneficiaryId) {
      return false;
    }

    if (stored.fundingSourceId !== expected.fundingSourceId) {
      return false;
    }

    return true;
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
