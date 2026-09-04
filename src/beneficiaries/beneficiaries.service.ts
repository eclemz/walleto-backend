import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AccountType,
  BeneficiaryType,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';

@Injectable()
export class BeneficiariesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    dto: CreateBeneficiaryDto,
  ) {
    this.validateBeneficiary(dto);

    return this.prisma.beneficiary.create({
      data: {
        userId,

        type: dto.type,
        name: dto.name,

        walletNumber: dto.walletNumber,

        bankName: dto.bankName,
        bankAddress: dto.bankAddress,
        country: dto.country,
        currency: dto.currency,

        accountNumber: dto.accountNumber,
        accountType: dto.accountType,
        routingNumber: dto.routingNumber,

        iban: dto.iban,
        swiftBic: dto.swiftBic,
        localBankIdentifier:
          dto.localBankIdentifier,

        beneficiaryAddress:
          dto.beneficiaryAddress,

        purpose: dto.purpose,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.beneficiary.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(
    userId: string,
    beneficiaryId: string,
  ) {
    const beneficiary =
      await this.prisma.beneficiary.findFirst({
        where: {
          id: beneficiaryId,
          userId,
        },
      });

    if (!beneficiary) {
      throw new NotFoundException(
        'Beneficiary not found',
      );
    }

    return beneficiary;
  }

  async remove(
    userId: string,
    beneficiaryId: string,
  ) {
    const beneficiary =
      await this.findOne(
        userId,
        beneficiaryId,
      );

    await this.prisma.beneficiary.delete({
      where: {
        id: beneficiary.id,
      },
    });

    return {
      message:
        'Beneficiary removed successfully',
    };
  }

  private validateBeneficiary(
    dto: CreateBeneficiaryDto,
  ) {
    if (
      dto.type === BeneficiaryType.WALLETO
    ) {
      if (!dto.walletNumber) {
        throw new BadRequestException(
          'Walleto account number is required',
        );
      }

      return;
    }

    if (
      dto.type ===
      BeneficiaryType.US_DOMESTIC
    ) {
      if (!dto.bankName) {
        throw new BadRequestException(
          'Bank name is required',
        );
      }

      if (!dto.accountNumber) {
        throw new BadRequestException(
          'Account number is required',
        );
      }

      if (!dto.accountType) {
        throw new BadRequestException(
          'Account type is required',
        );
      }

      if (!dto.routingNumber) {
        throw new BadRequestException(
          'Routing number is required',
        );
      }

      if (!dto.beneficiaryAddress) {
        throw new BadRequestException(
          'Beneficiary address is required',
        );
      }

      return;
    }

    if (
      dto.type ===
      BeneficiaryType.INTERNATIONAL
    ) {
      if (!dto.country) {
        throw new BadRequestException(
          'Country is required',
        );
      }

      if (!dto.currency) {
        throw new BadRequestException(
          'Currency is required',
        );
      }

      if (!dto.bankName) {
        throw new BadRequestException(
          'Bank name is required',
        );
      }

      if (!dto.beneficiaryAddress) {
        throw new BadRequestException(
          'Beneficiary address is required',
        );
      }

      /*
       * International transfers don't all use
       * the same banking identifiers.
       *
       * We therefore require either:
       *
       * IBAN
       * OR
       * account number + SWIFT/BIC
       *
       * Country-specific validation can be
       * added later.
       */
      const hasIban = Boolean(dto.iban);

      const hasAccountAndSwift =
        Boolean(dto.accountNumber) &&
        Boolean(dto.swiftBic);

      if (
        !hasIban &&
        !hasAccountAndSwift
      ) {
        throw new BadRequestException(
          'International beneficiary requires an IBAN or an account number with SWIFT/BIC',
        );
      }

      return;
    }

    throw new BadRequestException(
      'Invalid beneficiary type',
    );
  }
}
