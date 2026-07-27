import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { CoursesModule } from './courses/courses.module';
import { CourseModulesModule } from './course-modules/course-modules.module';
import { LessonsModule } from './lessons/lessons.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { QuizzesModule } from './quizzes/quizzes.module';
import { CertificatesModule } from './certificates/certificates.module';
import { LiveSessionsModule } from './live-sessions/live-sessions.module';

@Module({
  imports: [
    CategoriesModule,
    CoursesModule,
    CourseModulesModule,
    LessonsModule,
    EnrollmentsModule,
    QuizzesModule,
    CertificatesModule,
    LiveSessionsModule,
  ],
  exports: [
    CategoriesModule,
    CoursesModule,
    CourseModulesModule,
    LessonsModule,
    EnrollmentsModule,
    QuizzesModule,
    CertificatesModule,
    LiveSessionsModule,
  ],
})
export class LearningModule {}
