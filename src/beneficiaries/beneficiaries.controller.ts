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

import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { BeneficiariesService } from './beneficiaries.service';

@Controller('beneficiaries')
@UseGuards(JwtAuthGuard)
export class BeneficiariesController {
  constructor(
    private readonly beneficiariesService: BeneficiariesService,
  ) {}

  @Post()
  create(
    @Request() req: any,
    @Body() dto: CreateBeneficiaryDto,
  ) {
    return this.beneficiariesService.create(
      req.user.sub,
      dto,
    );
  }

  @Get()
  findAll(@Request() req: any) {
    return this.beneficiariesService.findAll(
      req.user.sub,
    );
  }

  @Get(':id')
  findOne(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.beneficiariesService.findOne(
      req.user.sub,
      id,
    );
  }

  @Delete(':id')
  remove(
    @Request() req: any,
    @Param('id') id: string,
  ) {
    return this.beneficiariesService.remove(
      req.user.sub,
      id,
    );
  }
}
