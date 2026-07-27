import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { RequirePermission } from '../../../common/permissions/require-permission.decorator';
import { Permissions } from '../../../common/permissions/permission.registry';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @RequirePermission(Permissions.COURSES_CREATE)
  async create(@CurrentOrg('id') orgId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(orgId, dto);
  }

  @Get()
  @RequirePermission(Permissions.COURSES_READ)
  async findAll(@CurrentOrg('id') orgId: string) {
    return this.categoriesService.findAll(orgId);
  }

  @Get(':id')
  @RequirePermission(Permissions.COURSES_READ)
  async findById(@CurrentOrg('id') orgId: string, @Param('id') id: string) {
    return this.categoriesService.findById(id, orgId);
  }

  @Patch(':id')
  @RequirePermission(Permissions.COURSES_UPDATE)
  async update(@CurrentOrg('id') orgId: string, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, orgId, dto);
  }

  @Delete(':id')
  @RequirePermission(Permissions.COURSES_DELETE)
  async remove(@CurrentOrg('id') orgId: string, @Param('id') id: string) {
    return this.categoriesService.remove(id, orgId);
  }
}
