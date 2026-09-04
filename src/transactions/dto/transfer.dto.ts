import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';

export class TransferDto {
  @IsOptional()
  @IsString()
  receiverWalletNumber?: string;

  @IsOptional()
  @IsString()
  beneficiaryId?: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  otpChallengeId!: string;

  @IsString()
  @Length(6, 6)
  otpCode!: string;
}
