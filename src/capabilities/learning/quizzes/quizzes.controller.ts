import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { RequirePermission } from '../../../common/permissions/require-permission.decorator';
import { Permissions } from '../../../common/permissions/permission.registry';

@Controller()
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post('courses/:courseId/quizzes')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.QUIZZES_CREATE)
  async create(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateQuizDto,
  ) {
    return this.quizzesService.create(orgId, userId, dto);
  }

  @Get('courses/:courseId/quizzes')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.COURSES_READ)
  async findByCourse(@Param('courseId') courseId: string, @CurrentOrg('id') orgId: string) {
    return this.quizzesService.findByCourse(courseId, orgId);
  }

  @Get('lessons/:lessonId/quiz')
  @UseGuards(JwtAuthGuard)
  async findByLesson(@Param('lessonId') lessonId: string, @CurrentOrg('id') orgId: string) {
    return this.quizzesService.findByLesson(lessonId, orgId);
  }

  @Get('quizzes/:id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: string, @CurrentOrg('id') orgId: string) {
    return this.quizzesService.findById(id, orgId);
  }

  @Patch('quizzes/:id')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.QUIZZES_UPDATE)
  async update(@Param('id') id: string, @CurrentOrg('id') orgId: string, @Body() dto: UpdateQuizDto) {
    return this.quizzesService.update(id, orgId, dto);
  }

  @Post('quizzes/:id/publish')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.QUIZZES_UPDATE)
  async publish(@Param('id') id: string, @CurrentOrg('id') orgId: string) {
    return this.quizzesService.update(id, orgId, { status: 'PUBLISHED' });
  }

  @Delete('quizzes/:id')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.QUIZZES_DELETE)
  async remove(@Param('id') id: string, @CurrentOrg('id') orgId: string) {
    return this.quizzesService.remove(id, orgId);
  }

  @Post('quizzes/:id/questions')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.QUIZZES_CREATE)
  async addQuestion(@Param('id') id: string, @CurrentOrg('id') orgId: string, @Body() dto: CreateQuestionDto) {
    return this.quizzesService.addQuestion(id, orgId, dto);
  }

  @Post('quizzes/:id/questions/batch')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.QUIZZES_CREATE)
  async addQuestions(@Param('id') id: string, @CurrentOrg('id') orgId: string, @Body('questions') questions: CreateQuestionDto[]) {
    return this.quizzesService.addQuestions(id, orgId, questions);
  }

  @Patch('quizzes/:quizId/questions/:id')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.QUIZZES_UPDATE)
  async updateQuestion(
    @Param('id') id: string,
    @Param('quizId') quizId: string,
    @CurrentOrg('id') orgId: string,
    @Body() dto: Partial<CreateQuestionDto>,
  ) {
    return this.quizzesService.updateQuestion(id, quizId, orgId, dto);
  }

  @Delete('quizzes/:quizId/questions/:id')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.QUIZZES_DELETE)
  async removeQuestion(@Param('id') id: string, @Param('quizId') quizId: string, @CurrentOrg('id') orgId: string) {
    return this.quizzesService.removeQuestion(id, quizId, orgId);
  }

  @Post('quizzes/:id/attempts')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.QUIZZES_ATTEMPT)
  async startAttempt(@Param('id') id: string, @CurrentOrg('id') orgId: string, @CurrentUser('id') userId: string) {
    return this.quizzesService.startAttempt(id, orgId, userId);
  }

  @Post('attempts/:id/submit')
  @UseGuards(JwtAuthGuard)
  async submitAttempt(@Param('id') id: string, @CurrentUser('id') userId: string, @Body() dto: SubmitAttemptDto) {
    return this.quizzesService.submitAttempt(id, userId, dto);
  }

  @Get('quizzes/:id/attempts')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.QUIZZES_UPDATE)
  async getAttempts(
    @Param('id') id: string,
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.quizzesService.getAttempts(id, orgId, userId);
  }
}
