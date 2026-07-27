import { Injectable, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ConfigService } from '@nestjs/config';
import { MailNotificationService } from '../../../capabilities/mail/mail-notification.service';

@Injectable()
export class CoursesService {
  private readonly logger = new Logger(CoursesService.name);
  private readonly baseUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mailNotificationService: MailNotificationService,
  ) {
    this.baseUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
  }

  async create(orgId: string, userId: string, dto: CreateCourseDto) {
    const slug = dto.slug || this.generateSlug(dto.title);

    const existing = await this.prisma.course.findFirst({
      where: { organizationId: orgId, slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({ code: 'COURSE_SLUG_EXISTS', message: 'A course with this slug already exists' });
    }

    return this.prisma.course.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        thumbnailUrl: dto.thumbnailUrl,
        categoryId: dto.categoryId,
        price: dto.price ?? 0,
        currency: dto.currency ?? 'INR',
        estimatedDuration: dto.estimatedDuration,
        organizationId: orgId,
        createdById: userId,
      },
      include: {
        category: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { modules: true, enrollments: true } },
      },
    });
  }

  async findAll(orgId: string, includeDrafts = false, options?: { search?: string; categoryId?: string; page?: number; limit?: number; userId?: string }) {
    const where: any = { organizationId: orgId, deletedAt: null };
    if (!includeDrafts) {
      where.isPublished = true;
    }
    if (options?.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }
    if (options?.categoryId) {
      where.categoryId = options.categoryId;
    }

    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const include: any = {
      category: true,
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { modules: true, enrollments: true } },
    };

    if (options?.userId) {
      include.enrollments = {
        where: { userId: options.userId },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        skip,
        take: limit,
        include,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.course.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findByInstructor(userId: string) {
    return this.prisma.course.findMany({
      where: {
        instructors: { some: { userId } },
        deletedAt: null,
      },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { modules: true, enrollments: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findById(id: string, orgId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        category: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              where: { deletedAt: null },
              orderBy: { sortOrder: 'asc' },
              select: { id: true, title: true, type: true, sortOrder: true, duration: true, isFree: true, content: true },
            },
          },
        },
        instructors: {
          include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
        _count: { select: { modules: true, enrollments: true } },
      },
    });
    if (!course) {
      throw new NotFoundException({ code: 'COURSE_NOT_FOUND', message: 'Course not found' });
    }
    return course;
  }

  async findBySlug(slug: string, orgId: string) {
    const course = await this.prisma.course.findFirst({
      where: { slug, organizationId: orgId, deletedAt: null },
      include: {
        category: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { modules: true, enrollments: true } },
      },
    });
    if (!course) {
      throw new NotFoundException({ code: 'COURSE_NOT_FOUND', message: 'Course not found' });
    }
    return course;
  }

  async update(id: string, orgId: string, dto: UpdateCourseDto) {
    const existingCourse = await this.findById(id, orgId);
    const wasPublished = existingCourse.isPublished;

    if (dto.slug) {
      const existing = await this.prisma.course.findFirst({
        where: { organizationId: orgId, slug: dto.slug, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException({ code: 'COURSE_SLUG_EXISTS', message: 'Slug already in use' });
      }
    }

    const data: any = { ...dto };
    if (dto.isPublished && !data.publishedAt) {
      data.publishedAt = new Date();
      data.status = 'PUBLISHED';
    }

    const course = await this.prisma.course.update({
      where: { id },
      data,
      include: {
        category: true,
        _count: { select: { modules: true, enrollments: true } },
      },
    });

    if (course.isPublished && !wasPublished) {
      // Find all learners in organization to notify
      this.prisma.user.findMany({
        where: { organizationId: orgId, role: 'LEARNER', isActive: true },
        select: { email: true }
      }).then((learners) => {
        const courseUrl = `${this.baseUrl}/courses/${course.slug}`;
        for (const learner of learners) {
          this.mailNotificationService.sendNotification(
            orgId,
            'lms_course_launch',
            learner.email,
            {
              courseTitle: course.title,
              courseUrl,
            }
          ).catch((e) => this.logger.warn('Failed to send per-user course launch email', e));
        }
      }).catch((err) => {
        this.logger.error('Failed to send course launch notifications', err);
      });
    }

    return course;
  }

  async remove(id: string, orgId: string) {
    await this.findById(id, orgId);

    await this.prisma.$transaction([
      this.prisma.courseModule.deleteMany({ where: { courseId: id } }),
      this.prisma.lesson.updateMany({ where: { courseId: id }, data: { deletedAt: new Date() } }),
      this.prisma.quiz.updateMany({ where: { courseId: id }, data: { deletedAt: new Date() } }),
      this.prisma.enrollment.deleteMany({ where: { courseId: id } }),
      this.prisma.certificate.updateMany({ where: { courseId: id }, data: { deletedAt: new Date() } }),
      this.prisma.course.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  async assignInstructor(courseId: string, orgId: string, userId: string) {
    await this.findById(courseId, orgId);

    return this.prisma.courseInstructor.create({
      data: { courseId, userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async removeInstructor(courseId: string, orgId: string, userId: string) {
    await this.findById(courseId, orgId);
    await this.prisma.courseInstructor.delete({
      where: { courseId_userId: { courseId, userId } },
    });
  }
}
