import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WalletsService } from './wallets.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get()
  getWallet(@Request() req: any) {
    return this.walletsService.findByUserId(req.user.sub);
  }

  @Get('recipient/:walletNumber')
  getRecipient(@Param('walletNumber') walletNumber: string) {
    return this.walletsService.findRecipientByWalletNumber(walletNumber);
  }
}
