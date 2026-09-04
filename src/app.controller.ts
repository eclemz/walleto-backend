import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { WalletsService } from './wallets/wallets.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly walletsService: WalletsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getWallet(@Request() req: any) {
    return this.walletsService.findByUserId(req.user.sub);
  }
}
