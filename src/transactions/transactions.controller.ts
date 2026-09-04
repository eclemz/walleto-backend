import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DepositDto } from './dto/deposit.dto';
import { PaginationDto } from './dto/pagination.dto';
import { TransferDto } from './dto/transfer.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('transfer')
  transfer(@Request() req: any, @Body() transferDto: TransferDto) {
    return this.transactionsService.transfer(req.user.sub, transferDto);
  }

  @Post('deposit')
  deposit(@Request() req: any, @Body() depositDto: DepositDto) {
    return this.transactionsService.deposit(req.user.sub, depositDto);
  }

  @Post('withdraw')
  withdraw(@Request() req: any, @Body() withdrawDto: WithdrawDto) {
    return this.transactionsService.withdraw(req.user.sub, withdrawDto);
  }

  @Get('summary')
  getSummary(@Request() req: any) {
    return this.transactionsService.getSummary(req.user.sub);
  }

  @Get()
  getHistory(@Request() req: any, @Query() paginationDto: PaginationDto) {
    return this.transactionsService.getHistory(req.user.sub, paginationDto);
  }

  @Get(':id')
  getTransaction(@Request() req: any, @Param('id') transactionId: string) {
    return this.transactionsService.getTransactionById(
      req.user.sub,
      transactionId,
    );
  }
}
