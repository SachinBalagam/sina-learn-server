import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Query } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { UpdateLiveSessionDto } from './dto/update-live-session.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { RequirePermission } from '../../../common/permissions/require-permission.decorator';
import { Permissions } from '../../../common/permissions/permission.registry';
import { LiveSessionStatus } from '@prisma/client';

@Controller('live-sessions')
@UseGuards(JwtAuthGuard)
export class LiveSessionsController {
  constructor(private readonly liveSessionsService: LiveSessionsService) {}

  @Post()
  @RequirePermission(Permissions.COURSES_CREATE)
  async create(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLiveSessionDto,
  ) {
    return this.liveSessionsService.create(orgId, userId, dto);
  }

  @Get()
  @RequirePermission(Permissions.COURSES_READ)
  async findAll(
    @CurrentOrg('id') orgId: string,
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: LiveSessionStatus,
    @Query('courseId') courseId?: string,
  ) {
    const isLearner = user.role === 'LEARNER';
    return this.liveSessionsService.findAll(orgId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      courseId,
      userId: isLearner ? user.id : undefined,
    });
  }

  @Get(':id')
  @RequirePermission(Permissions.COURSES_READ)
  async findOne(@CurrentOrg('id') orgId: string, @Param('id') id: string) {
    return this.liveSessionsService.findOne(id, orgId);
  }

  @Patch(':id')
  @RequirePermission(Permissions.COURSES_UPDATE)
  async update(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLiveSessionDto,
  ) {
    return this.liveSessionsService.update(id, orgId, dto);
  }

  @Delete(':id')
  @RequirePermission(Permissions.COURSES_DELETE)
  async remove(@CurrentOrg('id') orgId: string, @Param('id') id: string) {
    return this.liveSessionsService.remove(id, orgId);
  }

  @Patch(':id/start')
  @RequirePermission(Permissions.COURSES_UPDATE)
  async start(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
  ) {
    return this.liveSessionsService.markLive(id, orgId);
  }

  @Patch(':id/end')
  @RequirePermission(Permissions.COURSES_UPDATE)
  async end(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
  ) {
    return this.liveSessionsService.markEnded(id, orgId);
  }

  @Patch(':id/recording')
  @RequirePermission(Permissions.COURSES_UPDATE)
  async addRecording(
    @CurrentOrg('id') orgId: string,
    @Param('id') id: string,
    @Body() body: { recordingUrl: string },
  ) {
    return this.liveSessionsService.addRecording(id, orgId, body.recordingUrl);
  }
}
