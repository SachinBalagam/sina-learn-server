import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Query } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { RequirePermission } from '../../../common/permissions/require-permission.decorator';
import { Permissions } from '../../../common/permissions/permission.registry';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { createCourseSchema, updateCourseSchema } from '../../../shared';

@Controller('courses')
@UseGuards(JwtAuthGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @RequirePermission(Permissions.COURSES_CREATE)
  async create(@CurrentOrg('id') orgId: string, @CurrentUser('id') userId: string, @Body(new ZodValidationPipe(createCourseSchema)) dto: CreateCourseDto) {
    return this.coursesService.create(orgId, userId, dto);
  }

  @Get()
  @RequirePermission(Permissions.COURSES_READ)
  async findAll(
    @CurrentOrg('id') orgId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coursesService.findAll(orgId, true, { search, categoryId, page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get('published')
  async findPublished(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.coursesService.findAll(orgId, false, { search, categoryId, page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined, userId });
  }

  @Get('my')
  @RequirePermission(Permissions.COURSES_READ)
  async findMyCourses(@CurrentUser('id') userId: string) {
    return this.coursesService.findByInstructor(userId);
  }

  @Get(':id')
  @RequirePermission(Permissions.COURSES_READ)
  async findById(@CurrentOrg('id') orgId: string, @Param('id') id: string) {
    return this.coursesService.findById(id, orgId);
  }

  @Get('slug/:slug')
  @RequirePermission(Permissions.COURSES_READ)
  async findBySlug(@CurrentOrg('id') orgId: string, @Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug, orgId);
  }

  @Patch(':id')
  @RequirePermission(Permissions.COURSES_UPDATE)
  async update(@CurrentOrg('id') orgId: string, @Param('id') id: string, @Body(new ZodValidationPipe(updateCourseSchema)) dto: UpdateCourseDto) {
    return this.coursesService.update(id, orgId, dto);
  }

  @Delete(':id')
  @RequirePermission(Permissions.COURSES_DELETE)
  async remove(@CurrentOrg('id') orgId: string, @Param('id') id: string) {
    return this.coursesService.remove(id, orgId);
  }

  @Post(':id/instructors')
  @RequirePermission(Permissions.COURSES_UPDATE)
  async addInstructor(@CurrentOrg('id') orgId: string, @Param('id') id: string, @Body('userId') userId: string) {
    return this.coursesService.assignInstructor(id, orgId, userId);
  }

  @Delete(':id/instructors/:userId')
  @RequirePermission(Permissions.COURSES_UPDATE)
  async removeInstructor(@CurrentOrg('id') orgId: string, @Param('id') id: string, @Param('userId') userId: string) {
    return this.coursesService.removeInstructor(id, orgId, userId);
  }

}
