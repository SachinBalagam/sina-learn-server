import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async create(moduleId: string, courseId: string, orgId: string, dto: CreateLessonDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: orgId, deletedAt: null },
    });
    if (!course) {
      throw new NotFoundException({ code: 'COURSE_NOT_FOUND', message: 'Course not found' });
    }

    const maxSort = await this.prisma.lesson.findFirst({
      where: { moduleId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.lesson.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type ?? 'video',
        content: dto.content ?? {},
        moduleId,
        courseId,
        sortOrder: dto.sortOrder ?? (maxSort ? maxSort.sortOrder + 1 : 0),
        duration: dto.duration,
        isFree: dto.isFree ?? false,
      },
    });
  }

  async findByModule(moduleId: string, courseId: string, orgId: string) {
    await this.prisma.course.findFirstOrThrow({
      where: { id: courseId, organizationId: orgId, deletedAt: null },
    });

    return this.prisma.lesson.findMany({
      where: { moduleId, courseId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string, courseId: string, orgId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, courseId, deletedAt: null },
    });
    if (!lesson) {
      throw new NotFoundException({ code: 'LESSON_NOT_FOUND', message: 'Lesson not found' });
    }
    return lesson;
  }

  async update(id: string, courseId: string, orgId: string, dto: UpdateLessonDto) {
    await this.findById(id, courseId, orgId);
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }

  async remove(id: string, courseId: string, orgId: string) {
    await this.findById(id, courseId, orgId);
    await this.prisma.lesson.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async reorder(moduleId: string, courseId: string, orgId: string, orderedIds: string[]) {
    await this.prisma.course.findFirstOrThrow({
      where: { id: courseId, organizationId: orgId, deletedAt: null },
    });

    const updates = orderedIds.map((id, index) =>
      this.prisma.lesson.updateMany({
        where: { id, moduleId, courseId },
        data: { sortOrder: index },
      })
    );
    await Promise.all(updates);
  }
}
