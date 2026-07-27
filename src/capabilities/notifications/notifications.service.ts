import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, orgId: string, query: QueryNotificationDto) {
    if (!orgId) {
      return { items: [], total: 0, page: query.page || 1, limit: query.limit || 20 };
    }
    const where: any = {
      organizationId: orgId,
      OR: [{ userId }, { userId: null }],
    };

    if (query.isRead !== undefined) {
      if (query.isRead) {
        where.reads = { some: { userId } };
      } else {
        where.reads = { none: { userId } };
      }
    }

    if (query.type) {
      where.type = query.type;
    }

    const skip = ((query.page || 1) - 1) * (query.limit || 20);

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: query.limit || 20,
        orderBy: { createdAt: 'desc' },
        include: {
          reads: {
            where: { userId },
            select: { readAt: true },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    const mapped = items.map((n) => ({
      ...n,
      isRead: n.reads.length > 0,
      reads: undefined,
    }));

    return { items: mapped, total, page: query.page || 1, limit: query.limit || 20 };
  }

  async getUnreadCount(userId: string, orgId: string) {
    if (!orgId) return 0;
    return this.prisma.notification.count({
      where: {
        organizationId: orgId,
        OR: [{ userId }, { userId: null }],
        reads: { none: { userId } },
      },
    });
  }

  async markAsRead(notificationId: string, userId: string) {
    const existing = await this.prisma.notificationRead.findUnique({
      where: { notificationId_userId: { notificationId, userId } },
    });

    if (!existing) {
      await this.prisma.notificationRead.create({
        data: { notificationId, userId },
      });
    }

    return { success: true };
  }

  async markAllAsRead(userId: string, orgId: string) {
    if (!orgId) return { success: true };
    const unread = await this.prisma.notification.findMany({
      where: {
        organizationId: orgId,
        OR: [{ userId }, { userId: null }],
        reads: { none: { userId } },
      },
      select: { id: true },
    });

    await this.prisma.notificationRead.createMany({
      data: unread.map((n) => ({
        notificationId: n.id,
        userId,
      })),
      skipDuplicates: true,
    });

    return { success: true };
  }

  async create(
    data: {
      type: string;
      title: string;
      body?: string;
      data?: any;
      actorId?: string;
      actionUrl?: string;
      organizationId: string;
      userId?: string;
    },
  ) {
    return this.prisma.notification.create({ data });
  }

  async getPreferences(userId: string, orgId: string) {
    if (!orgId) return [];
    const prefs = await this.prisma.notificationPreference.findMany({
      where: { userId, organizationId: orgId },
    });

    const defaultTypes = [
      'enrollment_created',
      'course_published',
      'course_completed',
      'quiz_graded',
      'invitation_received',
      'announcement',
    ];

    const existingTypes = new Set(prefs.map((p) => p.type));
    const combined = defaultTypes.map((type) => {
      const existing = prefs.find((p) => p.type === type);
      return existing || { type, email: true, inApp: true, push: true };
    });

    return combined;
  }

  async updatePreferences(userId: string, orgId: string, dto: UpdateNotificationPrefsDto) {
    if (!orgId) return [];
    for (const pref of dto.preferences) {
      await this.prisma.notificationPreference.upsert({
        where: { userId_type: { userId, type: pref.type } },
        update: {
          email: pref.email ?? true,
          inApp: pref.inApp ?? true,
          push: pref.push ?? true,
        },
        create: {
          userId,
          organizationId: orgId,
          type: pref.type,
          email: pref.email ?? true,
          inApp: pref.inApp ?? true,
          push: pref.push ?? true,
        },
      });
    }

    return this.getPreferences(userId, orgId);
  }
}
