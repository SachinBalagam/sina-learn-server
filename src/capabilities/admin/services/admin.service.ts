import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listOrganizations(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, courses: true } },
          subscription: {
            select: { status: true, planId: true, plan: { select: { name: true, slug: true } } },
          },
        },
      }),
      this.prisma.organization.count(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOrganization(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, courses: true } },
        subscription: {
          select: {
            status: true, planId: true, currentPeriodEnd: true,
            plan: { select: { name: true, slug: true, priceMonth: true, priceYear: true } },
          },
        },
        users: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  async listAuditLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}