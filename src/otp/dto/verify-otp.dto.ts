import { IsIn, IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsIn(['TRANSACTION'])
  purpose!: 'TRANSACTION';

  @IsString()
  @Length(6, 6)
  code!: string;
}
