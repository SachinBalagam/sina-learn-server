import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './capabilities/auth/auth.module';
import { UsersModule } from './capabilities/users/users.module';
import { OrganizationsModule } from './capabilities/organizations/organizations.module';
import { InvitationsModule } from './capabilities/invitations/invitations.module';
import { SettingsModule } from './capabilities/settings/settings.module';
import { LearningModule } from './capabilities/learning/learning.module';
import { MediaModule } from './capabilities/media/media.module';
import { NotificationsModule } from './capabilities/notifications/notifications.module';
import { PaymentsModule } from './capabilities/payments/payments.module';
import { ProvidersModule } from './common/providers/providers.module';
import { PermissionsModule } from './common/permissions/permissions.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { MailModule } from './capabilities/mail/mail.module';
import { RolesModule } from './capabilities/roles/roles.module';
import { AdminModule } from './capabilities/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    OrganizationsModule,
    InvitationsModule,
    PermissionsModule,
    ProvidersModule,
    MediaModule,
    NotificationsModule,
    PaymentsModule,
    SettingsModule,
    LearningModule,
    MailModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
