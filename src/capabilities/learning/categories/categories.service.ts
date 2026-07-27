import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: { organizationId: orgId, slug: dto.slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({ code: 'CATEGORY_SLUG_EXISTS', message: 'Category slug already exists in this organization' });
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentId: dto.parentId,
        organizationId: orgId,
      },
    });
  }

  async findAll(orgId: string) {
    return this.prisma.category.findMany({
      where: { organizationId: orgId, deletedAt: null },
      include: { children: { where: { deletedAt: null } }, _count: { select: { courses: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, orgId: string) {
    const cat = await this.prisma.category.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: { children: { where: { deletedAt: null } }, parent: true, _count: { select: { courses: true } } },
    });
    if (!cat) {
      throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND', message: 'Category not found' });
    }
    return cat;
  }

  async update(id: string, orgId: string, dto: UpdateCategoryDto) {
    await this.findById(id, orgId);

    if (dto.slug) {
      const existing = await this.prisma.category.findFirst({
        where: { organizationId: orgId, slug: dto.slug, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException({ code: 'CATEGORY_SLUG_EXISTS', message: 'Slug already in use' });
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, orgId: string) {
    await this.findById(id, orgId);
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
