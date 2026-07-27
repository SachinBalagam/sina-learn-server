import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/permissions/require-permission.decorator';
import { Permissions } from '../../common/permissions/permission.registry';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateOrganizationDto, @CurrentUser('id') userId: string) {
    const org = await this.organizationsService.create(dto);
    await this.organizationsService.setOwner(org.id, userId);
    return org;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.ORG_READ)
  async findAll() {
    return this.organizationsService.findAll();
  }

  @Get('by-subdomain/:subdomain')
  async findBySubdomain(@Param('subdomain') subdomain: string) {
    return this.organizationsService.findBySlug(subdomain);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.ORG_READ)
  async findById(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.ORG_UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.organizationsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.ORG_DELETE)
  async remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
