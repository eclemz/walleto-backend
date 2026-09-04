import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [PrismaModule],
  providers: [WalletsService, JwtStrategy, JwtAuthGuard],
  exports: [WalletsService],
  controllers: [WalletsController],
})
export class WalletsModule {}
