import { Inject, Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MeetingProviderInterface } from '../../../common/providers/meeting-provider.interface';
import { CreateLiveSessionDto } from './dto/create-live-session.dto';
import { UpdateLiveSessionDto } from './dto/update-live-session.dto';
import { LiveSessionStatus, Prisma } from '@prisma/client';

@Injectable()
export class LiveSessionsService {
  private readonly logger = new Logger(LiveSessionsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject('MEETING_PROVIDER') private meetingProvider: MeetingProviderInterface,
  ) {}

  async create(orgId: string, userId: string, dto: CreateLiveSessionDto) {
    return this.prisma.liveSession.create({
      data: {
        title: dto.title,
        description: dto.description,
        courseId: dto.courseId,
        startTime: new Date(dto.startTime),
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        organizationId: orgId,
        createdById: userId,
      },
    });
  }

  async findAll(orgId: string, query: { page?: number; limit?: number; status?: LiveSessionStatus; courseId?: string; userId?: string }) {
    const where: Prisma.LiveSessionWhereInput = {
      organizationId: orgId,
      deletedAt: null,
    };

    if (query.status) where.status = query.status;
    
    if (query.courseId) {
      where.courseId = query.courseId;
    } else if (query.userId) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { userId: query.userId },
        select: { courseId: true },
      });
      const enrolledCourseIds = enrollments.map((e) => e.courseId);
      where.OR = [
        { courseId: { in: enrolledCourseIds } },
        { courseId: null },
      ];
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.liveSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'desc' },
        include: {
          course: { select: { id: true, title: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.liveSession.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string, orgId: string) {
    const session = await this.prisma.liveSession.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        course: { select: { id: true, title: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!session) throw new NotFoundException({ code: 'LIVE_SESSION_NOT_FOUND', message: 'Live session not found' });
    return session;
  }

  async update(id: string, orgId: string, dto: UpdateLiveSessionDto) {
    await this.findOne(id, orgId);
    return this.prisma.liveSession.update({
      where: { id },
      data: {
        ...dto,
        startTime: dto.startTime ? new Date(dto.startTime) : undefined,
        endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      },
    });
  }

  async remove(id: string, orgId: string) {
    await this.findOne(id, orgId);
    return this.prisma.liveSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async markLive(id: string, orgId: string) {
    const session = await this.findOne(id, orgId);
    const durationMinutes = session.startTime && session.endTime
      ? Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000)
      : 40;

    let meeting: Awaited<ReturnType<MeetingProviderInterface['createMeeting']>>;
    try {
      meeting = await this.meetingProvider.createMeeting({
        title: session.title,
        description: session.description || undefined,
        startTime: new Date(),
        durationMinutes,
      });
    } catch (err: any) {
      this.logger.error('Failed to create meeting', err?.message);
      throw new BadRequestException({
        code: 'MEETING_PROVIDER_ERROR',
        message: err?.message || 'Meeting provider is not configured. Please set the required environment variables.',
      });
    }

    return this.prisma.liveSession.update({
      where: { id },
      data: {
        status: LiveSessionStatus.LIVE,
        provider: meeting.provider,
        providerMeetingId: meeting.providerMeetingId,
        joinUrl: meeting.joinUrl,
        startUrl: meeting.startUrl,
        meetingPassword: meeting.password,
      },
    });
  }

  async markEnded(id: string, orgId: string) {
    const session = await this.findOne(id, orgId);

    if (session.providerMeetingId) {
      try {
        await this.meetingProvider.endMeeting(session.providerMeetingId);
      } catch {
        // meeting may already be ended on the provider side
      }
    }

    let recordingUrl = session.recordingUrl;

    if (!recordingUrl && session.providerMeetingId && this.meetingProvider.getRecordings) {
      try {
        const recordings = await this.meetingProvider.getRecordings(session.providerMeetingId);
        if (recordings.length > 0) {
          recordingUrl = recordings[0].url;
        }
      } catch {
        // recordings not available yet
      }
    }

    return this.prisma.liveSession.update({
      where: { id },
      data: {
        status: LiveSessionStatus.ENDED,
        endTime: new Date(),
        recordingUrl,
      },
    });
  }

  async addRecording(id: string, orgId: string, recordingUrl: string) {
    const session = await this.findOne(id, orgId);
    if (session.status !== 'ENDED') {
      throw new BadRequestException({ code: 'SESSION_NOT_ENDED', message: 'Can only add recording to ended sessions' });
    }
    return this.prisma.liveSession.update({
      where: { id },
      data: { recordingUrl },
    });
  }
}
