import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { RequestOtpDto } from './dto/request-otp.dto';
import { OtpService } from './otp.service';

@Controller('otp')
@UseGuards(JwtAuthGuard)
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('request')
  requestOtp(@Request() req: any, @Body() dto: RequestOtpDto) {
    return this.otpService.requestTransactionOtp(req.user.sub, {
      operation: dto.operation,
      amount: dto.amount,
      receiverWalletNumber: dto.receiverWalletNumber,
      beneficiaryId: dto.beneficiaryId,
      fundingSourceId: dto.fundingSourceId,
      description: dto.description,
    });
  }
}
