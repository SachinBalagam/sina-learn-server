import { Injectable, NestMiddleware, NotFoundException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const host = req.headers.host;
    const orgIdHeader = req.headers['x-org-id'] as string;

    let org: any = null;

    if (orgIdHeader) {
      org = await this.prisma.organization.findFirst({
        where: { id: orgIdHeader, deletedAt: null, isActive: true },
      });
    }

    if (!org && host) {
      const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
      if (!isLocalhost) {
        org = await this.prisma.organization.findFirst({
          where: { domain: host, deletedAt: null, isActive: true },
        });
      }
    }

    if (org) {
      (req as any).org = org;
      (req as any).orgId = org.id;
    }

    next();
  }
}
