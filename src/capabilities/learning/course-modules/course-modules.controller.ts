import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { CourseModulesService } from './course-modules.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { RequirePermission } from '../../../common/permissions/require-permission.decorator';
import { Permissions } from '../../../common/permissions/permission.registry';

@Controller('courses/:courseId/modules')
@UseGuards(JwtAuthGuard)
export class CourseModulesController {
  constructor(private readonly courseModulesService: CourseModulesService) {}

  @Post()
  @RequirePermission(Permissions.MODULES_CREATE)
  async create(
    @Param('courseId') courseId: string,
    @CurrentOrg('id') orgId: string,
    @Body() dto: CreateCourseModuleDto,
  ) {
    return this.courseModulesService.create(courseId, orgId, dto);
  }

  @Get()
  @RequirePermission(Permissions.COURSES_READ)
  async findByCourse(@Param('courseId') courseId: string, @CurrentOrg('id') orgId: string) {
    return this.courseModulesService.findByCourse(courseId, orgId);
  }

  @Patch(':id')
  @RequirePermission(Permissions.MODULES_UPDATE)
  async update(
    @Param('courseId') courseId: string,
    @Param('id') id: string,
    @CurrentOrg('id') orgId: string,
    @Body() dto: UpdateCourseModuleDto,
  ) {
    return this.courseModulesService.update(id, courseId, orgId, dto);
  }

  @Delete(':id')
  @RequirePermission(Permissions.MODULES_DELETE)
  async remove(
    @Param('courseId') courseId: string,
    @Param('id') id: string,
    @CurrentOrg('id') orgId: string,
  ) {
    return this.courseModulesService.remove(id, courseId, orgId);
  }

  @Post('reorder')
  @RequirePermission(Permissions.MODULES_UPDATE)
  async reorder(@Body('ids') ids: string[]) {
    return this.courseModulesService.reorder(ids);
  }
}
