import { Injectable, BadRequestException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import * as crypto from 'crypto';
import { MailNotificationService } from '../mail/mail-notification.service';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private readonly baseUrl: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private mailNotificationService: MailNotificationService,
  ) {
    this.baseUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
  }

  async create(orgId: string, invitedById: string, dto: CreateInvitationDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser && existingUser.organizationId === orgId) {
      throw new ConflictException({ code: 'USER_ALREADY_IN_ORG', message: 'User already belongs to this organization' });
    }

    const existingInvite = await this.prisma.invitation.findFirst({
      where: {
        email: dto.email,
        organizationId: orgId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (existingInvite) {
      throw new ConflictException({ code: 'INVITE_PENDING', message: 'A pending invitation already exists for this email' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        role: dto.role ?? 'LEARNER',
        token,
        organizationId: orgId,
        invitedById,
        expiresAt,
      },
      select: {
        id: true,
        email: true,
        role: true,
        token: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    // Send email asynchronously
    const inviteLink = `${this.baseUrl}/register?token=${token}`;
    this.mailNotificationService.sendNotification(
      orgId,
      'core_invite',
      dto.email,
      {
        inviteLink,
        role: dto.role ?? 'LEARNER',
      }
    ).catch((e) => this.logger.error('Failed to send invitation email', e));

    return invitation;
  }

  async accept(token: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });
    if (!invitation) {
      throw new NotFoundException({ code: 'INVITE_NOT_FOUND', message: 'Invitation not found' });
    }
    if (invitation.acceptedAt) {
      throw new BadRequestException({ code: 'INVITE_ALREADY_ACCEPTED', message: 'Invitation has already been accepted' });
    }
    if (invitation.expiresAt < new Date()) {
      throw new BadRequestException({ code: 'INVITE_EXPIRED', message: 'Invitation has expired' });
    }

    const org = await this.prisma.organization.findUnique({ where: { id: invitation.organizationId } });
    if (!org || !org.isActive) {
      throw new BadRequestException({ code: 'ORG_INACTIVE', message: 'Organization is no longer active' });
    }

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return {
      email: invitation.email,
      role: invitation.role,
      organizationId: invitation.organizationId,
      token,
    };
  }

  async findByOrg(orgId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        acceptedAt: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async revoke(id: string, orgId: string) {
    const invite = await this.prisma.invitation.findFirst({
      where: { id, organizationId: orgId },
    });
    if (!invite) {
      throw new NotFoundException({ code: 'INVITE_NOT_FOUND', message: 'Invitation not found' });
    }

    await this.prisma.invitation.delete({ where: { id } });
  }
}
