import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async get(orgId: string) {
    if (!orgId) {
      throw new BadRequestException({ code: 'ORG_CONTEXT_REQUIRED', message: 'Organization context is required' });
    }
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    }
    return org.settings ?? {};
  }

  async update(orgId: string, dto: UpdateSettingsDto) {
    if (!orgId) {
      throw new BadRequestException({ code: 'ORG_CONTEXT_REQUIRED', message: 'Organization context is required' });
    }
    const org = await this.prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
    });
    if (!org) {
      throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    }

    const current = (org.settings as Record<string, any>) ?? {};
    const merged = this.deepMerge(current, dto as any);

    return this.prisma.organization.update({
      where: { id: orgId },
      data: { settings: merged },
      select: { id: true, name: true, slug: true, settings: true },
    });
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }
    return result;
  }
}
