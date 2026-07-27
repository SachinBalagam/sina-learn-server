import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from '../services/admin.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../../common/guards/super-admin.guard';
import { PaginationQueryDto } from '../dto/pagination-query.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('organizations')
  async listOrganizations(@Query() query: PaginationQueryDto) {
    return this.adminService.listOrganizations(query.page ?? 1, query.limit ?? 20);
  }

  @Get('organizations/:id')
  async getOrganization(@Param('id') id: string) {
    return this.adminService.getOrganization(id);
  }

  @Get('audit-logs')
  async listAuditLogs(@Query() query: PaginationQueryDto) {
    return this.adminService.listAuditLogs(query.page ?? 1, query.limit ?? 50);
  }
}