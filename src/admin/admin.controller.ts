import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('users')
  getUsers() {
    return this.adminService.getUsers();
  }

  @Get('transactions')
  getTransactions() {
    return this.adminService.getTransactions();
  }

  /*
   * Pending external transfers
   */
  @Get('transactions/pending')
  getPendingTransactions() {
    return this.adminService.getPendingTransactions();
  }

  /*
   * Approve pending external transfer
   */
  @Patch('transactions/:id/approve')
  approveTransaction(@Param('id') id: string) {
    return this.adminService.approveTransaction(id);
  }

  /*
   * Reject pending external transfer
   */
  @Patch('transactions/:id/reject')
  rejectTransaction(@Param('id') id: string) {
    return this.adminService.rejectTransaction(id);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.adminService.suspendUser(id);
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.adminService.activateUser(id);
  }
}
