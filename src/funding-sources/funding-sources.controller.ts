import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateFundingSourceDto } from './dto/create-funding-source.dto';
import { FundingSourcesService } from './funding-sources.service';

@Controller('funding-sources')
@UseGuards(JwtAuthGuard)
export class FundingSourcesController {
  constructor(
    private readonly fundingSourcesService: FundingSourcesService,
  ) {}

  @Post()
  create(
    @Request() req: any,
    @Body() dto: CreateFundingSourceDto,
  ) {
    return this.fundingSourcesService.create(
      req.user.sub,
      dto,
    );
  }

  @Get()
  findAll(@Request() req: any) {
    return this.fundingSourcesService.findAll(
      req.user.sub,
    );
  }

  @Get(':id')
  findOne(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.fundingSourcesService.findOne(
      req.user.sub,
      id,
    );
  }

  @Delete(':id')
  remove(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.fundingSourcesService.remove(
      req.user.sub,
      id,
    );
  }
}
