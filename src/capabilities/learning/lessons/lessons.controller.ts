import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { RequirePermission } from '../../../common/permissions/require-permission.decorator';
import { Permissions } from '../../../common/permissions/permission.registry';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { createLessonSchema } from '../../../shared';

@Controller('courses/:courseId/modules/:moduleId/lessons')
@UseGuards(JwtAuthGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post()
  @RequirePermission(Permissions.LESSONS_CREATE)
  async create(
    @Param('moduleId') moduleId: string,
    @Param('courseId') courseId: string,
    @CurrentOrg('id') orgId: string,
    @Body(new ZodValidationPipe(createLessonSchema)) dto: CreateLessonDto,
  ) {
    return this.lessonsService.create(moduleId, courseId, orgId, dto);
  }

  @Get()
  @RequirePermission(Permissions.COURSES_READ)
  async findByModule(
    @Param('moduleId') moduleId: string,
    @Param('courseId') courseId: string,
    @CurrentOrg('id') orgId: string,
  ) {
    return this.lessonsService.findByModule(moduleId, courseId, orgId);
  }

  @Get(':id')
  @RequirePermission(Permissions.COURSES_READ)
  async findById(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
    @CurrentOrg('id') orgId: string,
  ) {
    return this.lessonsService.findById(id, courseId, orgId);
  }

  @Patch(':id')
  @RequirePermission(Permissions.LESSONS_UPDATE)
  async update(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
    @CurrentOrg('id') orgId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, courseId, orgId, dto);
  }

  @Delete(':id')
  @RequirePermission(Permissions.LESSONS_DELETE)
  async remove(
    @Param('id') id: string,
    @Param('courseId') courseId: string,
    @CurrentOrg('id') orgId: string,
  ) {
    return this.lessonsService.remove(id, courseId, orgId);
  }

  @Post('reorder')
  @RequirePermission(Permissions.MODULES_UPDATE)
  async reorder(
    @Param('moduleId') moduleId: string,
    @Param('courseId') courseId: string,
    @CurrentOrg('id') orgId: string,
    @Body('orderedIds') orderedIds: string[],
  ) {
    return this.lessonsService.reorder(moduleId, courseId, orgId, orderedIds);
  }
}
