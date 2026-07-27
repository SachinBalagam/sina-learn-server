import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailNotificationService } from '../mail/mail-notification.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: Record<string, any>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    passwordHash: '',
    role: 'PLATFORM_SUPER_ADMIN',
    isActive: true,
    organizationId: 'org-1',
    avatarUrl: null,
    lastLoginAt: null,
    createdAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(async () => {
    const mockResolved = (val?: any) => ({ catch: jest.fn().mockReturnThis() });

    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockReturnValue(mockResolved()),
      },
      organization: {
        findUnique: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-access-token'),
    } as any;

    configService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        const config: Record<string, any> = {
          JWT_REFRESH_EXPIRATION: '7d',
          FRONTEND_URL: 'http://localhost:3000',
        };
        return config[key] ?? defaultValue;
      }),
      getOrThrow: jest.fn(),
    } as any;

    const mailNotificationService = {
      sendNotification: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: MailNotificationService, useValue: mailNotificationService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return user and tokens on valid credentials', async () => {
      const passwordHash = await bcrypt.hash('valid-password', 12);
      const user = { ...mockUser, passwordHash };
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.refreshToken.create.mockResolvedValue({ token: 'mock-refresh-token' });

      const result = await service.login({ email: 'test@example.com', password: 'valid-password' });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        include: {
          roles: { select: { id: true, name: true, permissions: true } },
          organization: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
      });
    });

    it('should throw UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'any-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is inactive', async () => {
      const passwordHash = await bcrypt.hash('valid-password', 12);
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash,
        isActive: false,
      });

      await expect(
        service.login({ email: 'inactive@example.com', password: 'valid-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 12);
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash,
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should log audit on successful login', async () => {
      const passwordHash = await bcrypt.hash('valid-password', 12);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash });
      prisma.refreshToken.create.mockResolvedValue({ token: 'mock-refresh-token' });

      await service.login({ email: 'test@example.com', password: 'valid-password' }, 'org-1', '127.0.0.1', 'test-agent');

      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'LOGIN_SUCCESS',
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
          }),
        }),
      );
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'refresh-token-id',
        token: 'valid-refresh-token',
        revokedAt: null,
        expiresAt: futureDate,
        user: { ...mockUser, passwordHash: 'hash' },
      });
      prisma.refreshToken.create.mockResolvedValue({ token: 'new-refresh-token' });

      const result = await service.refresh('valid-refresh-token');

      expect(result.accessToken).toBe('mock-access-token');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: expect.any(String) } }),
      );
    });

    it('should throw UnauthorizedException when token is revoked', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        token: 'revoked-token',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        user: mockUser,
      });

      await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      prisma.refreshToken.findUnique.mockResolvedValue({
        token: 'expired-token',
        revokedAt: null,
        expiresAt: expiredDate,
        user: mockUser,
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    it('should update password when current password is correct', async () => {
      const passwordHash = await bcrypt.hash('current-password', 12);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash });

      await service.changePassword('user-1', {
        currentPassword: 'current-password',
        newPassword: 'new-password',
      });

      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when current password is wrong', async () => {
      const passwordHash = await bcrypt.hash('current-password', 12);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash });

      await expect(
        service.changePassword('user-1', {
          currentPassword: 'wrong-password',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('should create reset token for valid user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.forgotPassword({ email: 'test@example.com' });

      expect(result.message).toContain('reset link');
      expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    });

    it('should return success even for non-existent user (anti-harvesting)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({ email: 'nonexistent@example.com' });

      expect(result.message).toContain('reset link');
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'valid-token',
        userId: 'user-1',
        usedAt: null,
        expiresAt: futureDate,
      });

      await service.resetPassword({ token: 'valid-token', password: 'new-password' });

      expect(prisma.user.update).toHaveBeenCalled();
      expect(prisma.passwordResetToken.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException for expired token', async () => {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 1);

      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'expired-token',
        userId: 'user-1',
        usedAt: null,
        expiresAt: expiredDate,
      });

      await expect(
        service.resetPassword({ token: 'expired-token', password: 'new-password' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already used token', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      prisma.passwordResetToken.findUnique.mockResolvedValue({
        id: 'token-1',
        token: 'used-token',
        userId: 'user-1',
        usedAt: new Date(),
        expiresAt: futureDate,
      });

      await expect(
        service.resetPassword({ token: 'used-token', password: 'new-password' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
