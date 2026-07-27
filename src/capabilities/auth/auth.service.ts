import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RolePermissions } from '../../common/permissions/permission.registry';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/reset-password.dto';
import { MailNotificationService } from '../mail/mail-notification.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailNotificationService: MailNotificationService,
  ) {}

  async login(dto: LoginDto, orgId?: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: { select: { id: true, name: true, permissions: true } },
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });

    if (!user || !user.isActive) {
      await this.logAudit('LOGIN_FAILURE', dto.email, ipAddress, userAgent);
      throw new UnauthorizedException({ code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.logAudit('LOGIN_FAILURE', user.id, ipAddress, userAgent, user.organizationId);
      throw new UnauthorizedException({ code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password' });
    }



    const tokens = await this.generateTokens(user);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.logAudit('LOGIN_SUCCESS', user.id, ipAddress, userAgent, user.organizationId);

    return {
      user: this.mapProfile(user),
      ...tokens,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId },
        data: { revokedAt: new Date() },
      });
    }

    await this.logAudit('LOGOUT', userId);
  }

  async refresh(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException({ code: 'AUTH_TOKEN_INVALID', message: 'Invalid refresh token' });
    }

    if (!storedToken.user.isActive) {
      throw new UnauthorizedException({ code: 'AUTH_ACCOUNT_DISABLED', message: 'Account is disabled' });
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(storedToken.user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({ code: 'AUTH_USER_NOT_FOUND', message: 'User not found' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException({ code: 'AUTH_INVALID_CREDENTIALS', message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await this.logAudit('PASSWORD_CHANGED', userId);
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { select: { id: true, name: true, permissions: true } },
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });

    if (!user) return null;
    return this.mapProfile(user);
  }

  async updateProfile(userId: string, dto: { firstName: string; lastName: string; email: string; avatarUrl?: string }) {
    const existing = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        id: { not: userId },
      },
    });
    if (existing) {
      throw new BadRequestException({ code: 'AUTH_EMAIL_EXISTS', message: 'Email address already registered' });
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        avatarUrl: dto.avatarUrl ?? null,
      },
      include: {
        roles: { select: { id: true, name: true, permissions: true } },
        organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
    });

    await this.logAudit('PROFILE_UPDATED', userId);
    return this.mapProfile(updated);
  }

  private mapProfile(user: {
    id: string; email: string; firstName: string; lastName: string;
    avatarUrl: string | null; role: string; isActive: boolean;
    organizationId: string | null; lastLoginAt: Date | null; createdAt: Date;
    roles?: { id: string; name: string; permissions: string[] }[];
    organization?: { id: string; name: string; slug: string; logoUrl: string | null } | null;
  }) {
    const permissions = (user.roles?.length
      ? user.roles.flatMap(r => r.permissions)
      : (RolePermissions as Record<string, string[]>)[user.role] || []);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isActive: user.isActive,
      organizationId: user.organizationId,
      organization: user.organization || undefined,
      permissions,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  private async generateTokens(user: { id: string; email: string; role: string; organizationId?: string | null }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = randomUUID();

    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiresIn));

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      // Return success message to avoid email harvesting
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

    await this.prisma.passwordResetToken.create({
      data: {
        token,
        email: user.email,
        userId: user.id,
        expiresAt,
      },
    });

    const resetLink = `${this.configService.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;
    this.mailNotificationService.sendNotification(
      user.organizationId || '',
      'core_password_reset',
      user.email,
      {
        firstName: user.firstName,
        resetLink,
      }
    ).catch((e) => this.logger.error('Failed to send password reset email', e));

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException({ code: 'RESET_TOKEN_INVALID', message: 'Password reset token is invalid or expired' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({
      where: { id: tokenRecord.userId! },
      data: { passwordHash },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    await this.prisma.refreshToken.updateMany({
      where: { userId: tokenRecord.userId!, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password has been reset successfully' };
  }

  private async logAudit(action: string, entityId?: string | null, ipAddress?: string, userAgent?: string, tenantId?: string | null) {
    await this.prisma.auditLog.create({
      data: {
        action,
        entity: 'auth',
        entityId: entityId || undefined,
        userId: entityId || undefined,
        tenantId: tenantId || undefined,
        ipAddress,
        userAgent,
      },
    }).catch((e) => this.logger.error('Failed to write audit log', e));
  }
}
