import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

import {
  AccountType,
  BeneficiaryType,
  Currency,
} from '@prisma/client';

export class CreateBeneficiaryDto {
  @IsEnum(BeneficiaryType)
  type!: BeneficiaryType;

  @IsString()
  @IsNotEmpty()
  name!: string;

  // Walleto
  @IsOptional()
  @IsString()
  walletNumber?: string;

  // Common bank information
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAddress?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  // U.S. domestic
  @IsOptional()
  @IsString()
  @Length(4, 17)
  accountNumber?: string;

  @IsOptional()
  @IsEnum(AccountType)
  accountType?: AccountType;

  @IsOptional()
  @IsString()
  @Matches(/^\d{9}$/, {
    message: 'Routing number must be 9 digits',
  })
  routingNumber?: string;

  // International
  @IsOptional()
  @IsString()
  iban?: string;

  @IsOptional()
  @IsString()
  swiftBic?: string;

  @IsOptional()
  @IsString()
  localBankIdentifier?: string;

  @IsOptional()
  @IsString()
  beneficiaryAddress?: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}
