import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class RequestOtpDto {
  @IsIn(['TRANSACTION'])
  purpose!: 'TRANSACTION';

  @IsIn(['TRANSFER', 'DEPOSIT', 'WITHDRAWAL'])
  operation!: 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL';

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  receiverWalletNumber?: string;

  @IsOptional()
  @IsString()
  fundingSourceId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  beneficiaryId?: string;
}
