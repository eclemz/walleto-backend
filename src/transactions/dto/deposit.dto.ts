import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';

export class DepositDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  fundingSourceId!: string;

  @IsString()
  @Length(6, 6)
  otpCode!: string;

  @IsString()
  @IsNotEmpty()
  otpChallengeId!: string;
}
