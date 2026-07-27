import { Injectable, ConflictException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';
import { ConfigService } from '@nestjs/config';
import { MailNotificationService } from '../../../capabilities/mail/mail-notification.service';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);
  private readonly baseUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mailNotificationService: MailNotificationService,
  ) {
    this.baseUrl = this.configService.get('FRONTEND_URL', 'http://localhost:3000');
  }

  async enroll(orgId: string, dto: CreateEnrollmentDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, organizationId: orgId, deletedAt: null, isPublished: true },
    });
    if (!course) {
      throw new NotFoundException({ code: 'COURSE_NOT_FOUND', message: 'Published course not found' });
    }

    if (course.price && course.price > 0) {
      throw new BadRequestException({ code: 'COURSE_IS_PAID', message: 'This course requires payment. Please use the checkout flow.' });
    }

    const existing = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: dto.userId!, courseId: dto.courseId } },
    });
    if (existing) {
      throw new ConflictException({ code: 'ALREADY_ENROLLED', message: 'User is already enrolled in this course' });
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId: dto.userId!,
        courseId: dto.courseId,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true, slug: true } },
      },
    });

    // Send enrollment welcome email asynchronously
    this.mailNotificationService.sendNotification(
      orgId,
      'lms_welcome',
      enrollment.user.email,
      {
        studentName: `${enrollment.user.firstName} ${enrollment.user.lastName}`,
        courseTitle: course.title,
        courseUrl: `${this.baseUrl}/learning/courses/${course.id}`,
        organizationName: orgId,
      }
    ).catch((e) => this.logger.error('Failed to send enrollment confirmation email', e));

    return enrollment;
  }

  async getStats(courseId: string, orgId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: orgId },
      select: { id: true, title: true },
    });
    if (!course) throw new NotFoundException({ code: 'COURSE_NOT_FOUND', message: 'Course not found' });

    const [totalEnrollments, completedEnrollments, totalCertificates] = await Promise.all([
      this.prisma.enrollment.count({ where: { courseId } }),
      this.prisma.enrollment.count({ where: { courseId, completed: true } }),
      this.prisma.certificate.count({ where: { courseId, deletedAt: null } }),
    ]);

    return {
      courseId,
      totalEnrollments,
      completedEnrollments,
      completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
      totalCertificates,
    };
  }

  async findByCourse(courseId: string, orgId: string) {
    await this.prisma.course.findFirstOrThrow({
      where: { id: courseId, organizationId: orgId },
    });

    return this.prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async findByUser(userId: string, orgId: string) {
    return this.prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
            estimatedDuration: true,
            category: { select: { name: true } },
            _count: { select: { modules: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async completeLesson(userId: string, courseId: string, lessonId: string, orgId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: orgId, deletedAt: null },
    });
    if (!course) {
      throw new NotFoundException({ code: 'COURSE_NOT_FOUND', message: 'Course not found' });
    }

    const existing = await this.prisma.completedLesson.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    if (existing) {
      return existing;
    }

    await this.prisma.completedLesson.create({
      data: { userId, lessonId, courseId, organizationId: orgId },
    });

    const totalLessons = await this.prisma.lesson.count({
      where: { courseId, deletedAt: null },
    });
    const completedCount = await this.prisma.completedLesson.count({
      where: { userId, courseId },
    });

    const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    return this.updateProgress(userId, courseId, progress);
  }

  async getCompletedLessons(userId: string, courseId: string, orgId: string) {
    return this.prisma.completedLesson.findMany({
      where: { userId, courseId, organizationId: orgId },
      select: { lessonId: true, completedAt: true },
    });
  }

  async updateProgress(userId: string, courseId: string, progress: number) {
    const completed = progress >= 100;
    
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    const wasCompleted = enrollment?.completed;

    const result = await this.prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data: {
        progress,
        completed,
        ...(completed ? { completedAt: new Date() } : {}),
      },
    });

    if (completed && !wasCompleted) {
      const course = await this.prisma.course.findUnique({ where: { id: courseId } });
      if (course) {
        const certificate = await this.prisma.certificate.create({
          data: {
            title: `Certificate of Completion - ${course.title}`,
            description: `Successfully completed all modules of ${course.title}.`,
            organizationId: course.organizationId,
            courseId: courseId,
            userId: userId,
          },
        });

        // Trigger email notification asynchronously
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, firstName: true, lastName: true },
        }).then((user) => {
          if (user) {
            const certificateUrl = `${this.baseUrl}/dashboard/certificates/${certificate.id}`;
            this.mailNotificationService.sendNotification(
              course.organizationId,
              'lms_certificate',
              user.email,
              {
                studentName: `${user.firstName} ${user.lastName}`,
                courseTitle: course.title,
                certificateUrl,
              }
              ).catch((e) => this.logger.warn('Failed to send per-user certificate email', e));
          }
        }).catch((err) => {
          this.logger.error('Failed to send certificate completion emails', err);
        });
      }
    }

    return result;
  }

  async unenroll(userId: string, courseId: string, orgId: string) {
    await this.prisma.course.findFirstOrThrow({
      where: { id: courseId, organizationId: orgId },
    });

    await this.prisma.enrollment.delete({
      where: { userId_courseId: { userId, courseId } },
    });
  }
}
