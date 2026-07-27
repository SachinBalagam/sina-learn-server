import { Controller, Get, Post, Patch, Param, Body, Query, Req, ParseUUIDPipe } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async findAll(
    @Query() query: QueryNotificationDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    if (!orgId) {
      return this.notificationsService.findAll(userId, '', query);
    }
    return this.notificationsService.findAll(userId, orgId, query);
  }

  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    if (!orgId) {
      return { count: 0 };
    }
    const count = await this.notificationsService.getUnreadCount(userId, orgId);
    return { count };
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.notificationsService.markAsRead(id, userId);
  }

  @Post('read-all')
  async markAllAsRead(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    if (!orgId) {
      return { success: true };
    }
    return this.notificationsService.markAllAsRead(userId, orgId);
  }

  @Get('preferences')
  async getPreferences(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.notificationsService.getPreferences(userId, orgId);
  }

  @Patch('preferences')
  async updatePreferences(
    @Body() dto: UpdateNotificationPrefsDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.notificationsService.updatePreferences(userId, orgId, dto);
  }
}
