import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { EnrollmentsService } from './enrollments.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { RequirePermission } from '../../../common/permissions/require-permission.decorator';
import { Permissions } from '../../../common/permissions/permission.registry';

@Controller('enrollments')
@UseGuards(JwtAuthGuard)
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Post()
  @RequirePermission(Permissions.COURSES_ENROLL)
  async enroll(@CurrentOrg('id') orgId: string, @CurrentUser('id') userId: string, @Body() dto: CreateEnrollmentDto) {
    return this.enrollmentsService.enroll(orgId, { ...dto, userId: dto.userId || userId });
  }

  @Get('stats/:courseId')
  @RequirePermission(Permissions.COURSES_READ)
  async getStats(@Param('courseId') courseId: string, @CurrentOrg('id') orgId: string) {
    return this.enrollmentsService.getStats(courseId, orgId);
  }

  @Get('course/:courseId')
  @RequirePermission(Permissions.COURSES_READ)
  async findByCourse(@Param('courseId') courseId: string, @CurrentOrg('id') orgId: string) {
    return this.enrollmentsService.findByCourse(courseId, orgId);
  }

  @Get('me')
  async myEnrollments(@CurrentUser('id') userId: string, @CurrentOrg('id') orgId: string) {
    return this.enrollmentsService.findByUser(userId, orgId);
  }

  @Post(':courseId/progress')
  async updateProgress(
    @CurrentUser('id') userId: string,
    @Param('courseId') courseId: string,
    @Body('progress') progress: number,
  ) {
    return this.enrollmentsService.updateProgress(userId, courseId, progress);
  }

  @Post(':courseId/lessons/:lessonId/complete')
  async completeLesson(
    @CurrentUser('id') userId: string,
    @CurrentOrg('id') orgId: string,
    @Param('courseId') courseId: string,
    @Param('lessonId') lessonId: string,
  ) {
    return this.enrollmentsService.completeLesson(userId, courseId, lessonId, orgId);
  }

  @Get(':courseId/lessons/completed')
  async getCompletedLessons(
    @CurrentUser('id') userId: string,
    @CurrentOrg('id') orgId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.enrollmentsService.getCompletedLessons(userId, courseId, orgId);
  }

  @Delete(':courseId')
  @RequirePermission(Permissions.COURSES_DELETE)
  async unenroll(@CurrentUser('id') userId: string, @Param('courseId') courseId: string, @CurrentOrg('id') orgId: string, @Query('userId') targetUserId?: string) {
    return this.enrollmentsService.unenroll(targetUserId || userId, courseId, orgId);
  }
}
