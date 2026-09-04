import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import { FundingSourceType } from '@prisma/client';

export class CreateFundingSourceDto {
  @IsEnum(FundingSourceType)
  type!: FundingSourceType;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @Length(4, 4)
  lastFour!: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  brand?: string;
}
