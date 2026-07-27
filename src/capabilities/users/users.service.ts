import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException({ code: 'USER_EMAIL_EXISTS', message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        organizationId: dto.organizationId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        organizationId: true,
        createdAt: true,
      },
    });
  }

  async findAll(organizationId?: string) {
    const where = organizationId ? { organizationId, deletedAt: null } : { deletedAt: null };
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        roles: { select: { id: true, name: true } },
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        capabilityRoles: { select: { capability: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, requester?: { organizationId?: string; role: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        organizationId: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    if (requester && requester.role !== 'PLATFORM_SUPER_ADMIN') {
      if (user.organizationId !== requester.organizationId) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Access denied to this user' });
      }
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto, requester?: { id?: string; organizationId?: string; role: string; permissions?: string[] }) {
    const user = await this.findById(id, requester);

    const { roleIds, password, isActive, ...rest } = dto;
    const data: any = { ...rest };
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 12);
    }

    // 1. A user cannot disable their own account
    if (isActive !== undefined && id === requester?.id && isActive === false) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You cannot deactivate your own account.' });
    }

    // 2. The Organization Owner cannot be deactivated or have their roles modified by anyone else
    if (user.role === 'ORGANIZATION_OWNER' && id !== requester?.id) {
      if (isActive === false || roleIds !== undefined) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'The organization owner account cannot be modified or deactivated.' });
      }
    }

    // 3. Permission-based check: Only users with 'org:manage_users' can modify user roles or status
    const hasManageUsersPermission = requester?.permissions?.includes('org:manage_users') || requester?.role === 'PLATFORM_SUPER_ADMIN';
    if (!hasManageUsersPermission) {
      if (roleIds !== undefined || isActive !== undefined) {
        throw new ForbiddenException({ code: 'FORBIDDEN', message: 'You do not have permission to change user roles or status.' });
      }
    }

    if (isActive !== undefined) {
      data.isActive = isActive;
    }

    if (roleIds) {
      data.roles = {
        set: roleIds.map((rid) => ({ id: rid })),
      };
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        organizationId: true,
      },
    });
  }

  async search(orgId: string, query: string) {
    if (!query) return [];
    return this.prisma.user.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        OR: [
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
      take: 20,
    });
  }

  async remove(id: string, requester?: { organizationId?: string; role: string }) {
    await this.findById(id, requester);

    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
