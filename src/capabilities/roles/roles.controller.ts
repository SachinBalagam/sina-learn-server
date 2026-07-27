import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/permissions/require-permission.decorator';
import { Permissions } from '../../common/permissions/permission.registry';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Post()
  @RequirePermission(Permissions.ORG_MANAGE_USERS)
  async create(@CurrentUser('organizationId') orgId: string, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(orgId, dto);
  }

  @Get()
  @RequirePermission(Permissions.ORG_MANAGE_USERS)
  async findAll(@CurrentUser('organizationId') orgId: string) {
    return this.rolesService.findAll(orgId);
  }

  @Get(':id')
  @RequirePermission(Permissions.ORG_MANAGE_USERS)
  async findOne(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.rolesService.findOne(orgId, id);
  }

  @Patch(':id')
  @RequirePermission(Permissions.ORG_MANAGE_USERS)
  async update(
    @CurrentUser('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(orgId, id, dto);
  }

  @Delete(':id')
  @RequirePermission(Permissions.ORG_MANAGE_USERS)
  async remove(@CurrentUser('organizationId') orgId: string, @Param('id') id: string) {
    return this.rolesService.remove(orgId, id);
  }
}
