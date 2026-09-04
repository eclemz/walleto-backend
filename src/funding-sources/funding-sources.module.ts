import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';

import { FundingSourcesController } from './funding-sources.controller';
import { FundingSourcesService } from './funding-sources.service';

@Module({
  imports: [PrismaModule],
  controllers: [FundingSourcesController],
  providers: [FundingSourcesService],
  exports: [FundingSourcesService],
})
export class FundingSourcesModule {}
