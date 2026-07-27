import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateCourseModuleDto } from './dto/create-course-module.dto';
import { UpdateCourseModuleDto } from './dto/update-course-module.dto';

@Injectable()
export class CourseModulesService {
  constructor(private prisma: PrismaService) {}

  async create(courseId: string, orgId: string, dto: CreateCourseModuleDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: orgId, deletedAt: null },
    });
    if (!course) {
      throw new NotFoundException({ code: 'COURSE_NOT_FOUND', message: 'Course not found' });
    }

    const maxSort = await this.prisma.courseModule.findFirst({
      where: { courseId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.courseModule.create({
      data: {
        title: dto.title,
        courseId,
        sortOrder: dto.sortOrder ?? (maxSort ? maxSort.sortOrder + 1 : 0),
      },
    });
  }

  async findByCourse(courseId: string, orgId: string) {
    await this.prisma.course.findFirstOrThrow({
      where: { id: courseId, organizationId: orgId, deletedAt: null },
    });

    return this.prisma.courseModule.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
      include: {
        lessons: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { lessons: true } },
      },
    });
  }

  async update(id: string, courseId: string, orgId: string, dto: UpdateCourseModuleDto) {
    await this.prisma.course.findFirstOrThrow({
      where: { id: courseId, organizationId: orgId, deletedAt: null },
    });

    return this.prisma.courseModule.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, courseId: string, orgId: string) {
    await this.prisma.course.findFirstOrThrow({
      where: { id: courseId, organizationId: orgId, deletedAt: null },
    });

    await this.prisma.courseModule.delete({ where: { id } });
  }

  async reorder(ids: string[]) {
    const updates = ids.map((id, index) =>
      this.prisma.courseModule.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );
    await this.prisma.$transaction(updates);
  }
}
