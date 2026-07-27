import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { MailNotificationService } from '../../../capabilities/mail/mail-notification.service';

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(
    private prisma: PrismaService,
    private mailNotificationService: MailNotificationService,
  ) {}

  async create(orgId: string, userId: string, dto: CreateQuizDto) {
    return this.prisma.quiz.create({
      data: {
        title: dto.title,
        description: dto.description,
        timeLimit: dto.timeLimit,
        passingScore: dto.passingScore ?? 70,
        maxAttempts: dto.maxAttempts ?? 3,
        lessonId: dto.lessonId,
        courseId: dto.courseId,
        organizationId: orgId,
        createdById: userId,
      },
      include: { _count: { select: { questions: true, attempts: true } } },
    });
  }

  async findByCourse(courseId: string, orgId: string) {
    return this.prisma.quiz.findMany({
      where: { courseId, organizationId: orgId, deletedAt: null },
      include: { _count: { select: { questions: true, attempts: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByLesson(lessonId: string, orgId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { lessonId, organizationId: orgId, deletedAt: null },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
    if (!quiz) throw new NotFoundException({ code: 'QUIZ_NOT_FOUND', message: 'Quiz not found' });
    return quiz;
  }

  async findById(id: string, orgId: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
    if (!quiz) throw new NotFoundException({ code: 'QUIZ_NOT_FOUND', message: 'Quiz not found' });
    return quiz;
  }

  async update(id: string, orgId: string, dto: UpdateQuizDto) {
    await this.findById(id, orgId);
    return this.prisma.quiz.update({ where: { id }, data: dto });
  }

  async remove(id: string, orgId: string) {
    await this.findById(id, orgId);
    await this.prisma.quiz.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addQuestion(quizId: string, orgId: string, dto: CreateQuestionDto) {
    await this.findById(quizId, orgId);
    const maxSort = await this.prisma.quizQuestion.findFirst({
      where: { quizId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    return this.prisma.quizQuestion.create({
      data: {
        quizId,
        type: dto.type ?? 'multiple_choice',
        question: dto.question,
        options: dto.options,
        correctAnswer: dto.correctAnswer,
        points: dto.points ?? 1,
        sortOrder: maxSort ? maxSort.sortOrder + 1 : 0,
      },
    });
  }

  async addQuestions(quizId: string, orgId: string, dtos: CreateQuestionDto[]) {
    await this.findById(quizId, orgId);
    const maxSort = await this.prisma.quizQuestion.findFirst({
      where: { quizId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    return this.prisma.quizQuestion.createMany({
      data: dtos.map((dto, index) => ({
        quizId,
        type: dto.type ?? 'multiple_choice',
        question: dto.question,
        options: dto.options,
        correctAnswer: dto.correctAnswer,
        points: dto.points ?? 1,
        sortOrder: (maxSort ? maxSort.sortOrder + 1 : 0) + index,
      })),
    });
  }

  async updateQuestion(id: string, quizId: string, orgId: string, dto: Partial<CreateQuestionDto>) {
    await this.findById(quizId, orgId);
    return this.prisma.quizQuestion.update({ where: { id }, data: dto });
  }

  async removeQuestion(id: string, quizId: string, orgId: string) {
    await this.findById(quizId, orgId);
    await this.prisma.quizQuestion.delete({ where: { id } });
  }

  async startAttempt(quizId: string, orgId: string, userId: string) {
    const quiz = await this.findById(quizId, orgId);
    if (quiz.status !== 'PUBLISHED') {
      throw new BadRequestException({ code: 'QUIZ_NOT_PUBLISHED', message: 'Quiz is not published' });
    }

    const attemptCount = await this.prisma.quizAttempt.count({
      where: { quizId, userId },
    });
    if (attemptCount >= quiz.maxAttempts) {
      throw new ForbiddenException({ code: 'MAX_ATTEMPTS', message: 'Maximum attempts reached' });
    }

    return this.prisma.quizAttempt.create({
      data: { quizId, userId },
      include: {
        quiz: {
          include: {
            questions: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, type: true, question: true, options: true, points: true, sortOrder: true },
            },
          },
        },
      },
    });
  }

  async submitAttempt(attemptId: string, userId: string, dto: SubmitAttemptDto) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: { include: { questions: true } } },
    });
    if (!attempt) throw new NotFoundException({ code: 'ATTEMPT_NOT_FOUND', message: 'Attempt not found' });
    if (attempt.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your attempt' });
    if (attempt.completedAt) throw new BadRequestException({ code: 'ALREADY_SUBMITTED', message: 'Already submitted' });

    // Check time limit
    if (attempt.quiz.timeLimit) {
      const elapsed = (Date.now() - new Date(attempt.startedAt).getTime()) / 60000;
      if (elapsed > attempt.quiz.timeLimit) {
        throw new BadRequestException({ code: 'TIME_EXCEEDED', message: 'Time limit exceeded' });
      }
    }

    let score = 0;
    const totalPoints = attempt.quiz.questions.reduce((sum, q) => sum + q.points, 0);

    for (const answer of dto.answers) {
      const question = attempt.quiz.questions.find((q) => q.id === answer.questionId);
      if (question && question.correctAnswer === answer.answer) {
        score += question.points;
      }
    }

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const passed = percentage >= attempt.quiz.passingScore;

    const result = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        answers: dto.answers,
        score: percentage,
        passed,
        completedAt: new Date(),
      },
    });

    if (passed) {
      // Auto-complete the lesson if this quiz is attached to one
      if (attempt.quiz.lessonId) {
        await this.completeLessonOnQuizPass(userId, attempt.quiz.courseId, attempt.quiz.lessonId, attempt.quiz.organizationId);
      }

      // Send email notification asynchronously
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, firstName: true, lastName: true },
      }).then((user) => {
        if (user) {
          this.mailNotificationService.sendNotification(
            attempt.quiz.organizationId,
            'lms_quiz_passed',
            user.email,
            {
              studentName: `${user.firstName} ${user.lastName}`,
              quizTitle: attempt.quiz.title,
              score: percentage.toString(),
              passingScore: attempt.quiz.passingScore.toString(),
            }
          ).catch((e) => this.logger.warn('Failed to send per-user quiz notification', e));
        }
      }).catch((err) => {
        this.logger.error('Failed to send quiz passed notifications', err);
      });
    }

    return result;
  }

  async getAttempts(quizId: string, orgId: string, userId?: string) {
    await this.findById(quizId, orgId);
    const where: any = { quizId };
    if (userId) where.userId = userId;

    return this.prisma.quizAttempt.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  private async completeLessonOnQuizPass(userId: string, courseId: string, lessonId: string, orgId: string) {
    const existing = await this.prisma.completedLesson.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    if (existing) return;

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
    const completed = progress >= 100;

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    const wasCompleted = enrollment?.completed;

    await this.prisma.enrollment.update({
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
            courseId,
            userId,
          },
        });

        this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, firstName: true, lastName: true },
        }).then((user) => {
          if (user) {
            const certificateUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/certificates/${certificate.id}`;
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
  }
}
