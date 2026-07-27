import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto) {
    const existingSlug = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException({ code: 'ORG_SLUG_EXISTS', message: 'Organization slug already exists' });
    }

    if (dto.domain) {
      const existingDomain = await this.prisma.organization.findFirst({
        where: { domain: dto.domain },
      });
      if (existingDomain) {
        throw new ConflictException({ code: 'ORG_DOMAIN_EXISTS', message: 'Domain already in use' });
      }
    }

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        logoUrl: dto.logoUrl,
        domain: dto.domain,
        maxUsers: dto.maxUsers ?? 50,
        maxStorageGb: dto.maxStorageGb ?? 10,
        settings: dto.settings ?? {},
      },
    });

    // Seed default white-label roles for the new organization
    await this.prisma.role.createMany({
      data: [
        {
          name: 'Owner',
          description: 'Full administrative ownership access to all modules, billing, and configurations.',
          permissions: [
            'org:read', 'org:update', 'org:delete', 'org:manage_users', 'org:manage_invites', 'org:manage_subscription',
            'users:read', 'users:create', 'users:update', 'users:delete',
            'courses:read', 'courses:create', 'courses:update', 'courses:delete', 'courses:publish', 'courses:enroll',
            'modules:create', 'modules:update', 'modules:delete',
            'lessons:create', 'lessons:update', 'lessons:delete',
            'media:upload', 'media:read', 'media:delete',
            'quizzes:create', 'quizzes:update', 'quizzes:delete', 'quizzes:attempt',
            'settings:read', 'settings:update', 'analytics:read', 'audit:read', 'payments:read', 'payments:refund'
          ],
          organizationId: org.id,
        },
        {
          name: 'Administrator',
          description: 'Operations manager access. Manage courses, invites, reports, settings, and modules.',
          permissions: [
            'org:read', 'org:manage_users', 'org:manage_invites',
            'users:read', 'users:create', 'users:update',
            'courses:read', 'courses:create', 'courses:update', 'courses:delete', 'courses:publish',
            'modules:create', 'modules:update', 'modules:delete',
            'lessons:create', 'lessons:update', 'lessons:delete',
            'media:upload', 'media:read', 'media:delete',
            'quizzes:create', 'quizzes:update', 'quizzes:delete',
            'settings:read', 'settings:update', 'analytics:read', 'audit:read', 'payments:read'
          ],
          organizationId: org.id,
        },
        {
          name: 'Trainer',
          description: 'Curriculum creator. Construct lectures, edit assignments, upload files, and grade quiz drafts.',
          permissions: [
            'org:read', 'users:read',
            'courses:read', 'courses:create', 'courses:update',
            'modules:create', 'modules:update', 'modules:delete',
            'lessons:create', 'lessons:update', 'lessons:delete',
            'media:upload', 'media:read',
            'quizzes:create', 'quizzes:update', 'quizzes:delete', 'quizzes:attempt',
            'courses:enroll'
          ],
          organizationId: org.id,
        },
        {
          name: 'Teaching Assistant',
          description: 'Classroom moderator. Review lectures, moderate comments, and view directories.',
          permissions: [
            'org:read', 'users:read',
            'courses:read',
            'lessons:update',
            'media:read',
            'quizzes:attempt',
            'courses:enroll'
          ],
          organizationId: org.id,
        },
        {
          name: 'Learner',
          description: 'End consumer. Enroll in lectures, take quizzes, watch videos, and get certificates.',
          permissions: [
            'org:read',
            'courses:read',
            'courses:enroll',
            'quizzes:attempt'
          ],
          organizationId: org.id,
        }
      ]
    });

    return org;
  }

  async findAll() {
    return this.prisma.organization.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const org = await this.prisma.organization.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { users: true, courses: true } } },
    });
    if (!org) {
      throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    }
    return org;
  }

  async findBySlug(slug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug },
      include: { _count: { select: { users: true, courses: true } } },
    });
    if (!org || org.deletedAt) {
      throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    }
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findById(id);

    if (dto.slug) {
      const existing = await this.prisma.organization.findUnique({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException({ code: 'ORG_SLUG_EXISTS', message: 'Slug already in use' });
      }
    }

    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.organization.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async setOwner(orgId: string, userId: string) {
    await this.findById(orgId);
    await this.prisma.organization.update({
      where: { id: orgId },
      data: { ownerId: userId },
    });

    const ownerRole = await this.prisma.role.findFirst({
      where: { name: 'Owner', organizationId: orgId },
    });

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        organizationId: orgId,
        role: 'ORGANIZATION_OWNER',
        roles: ownerRole ? { connect: { id: ownerRole.id } } : undefined,
      },
    });
  }
}
