import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailTemplatesService } from './mail-templates.service';
import { MailTemplatesController } from './mail-templates.controller';
import { MailNotificationService } from './mail-notification.service';
import { EmailProviderFactory } from './email-provider.factory';

@Global()
@Module({
  controllers: [MailTemplatesController],
  providers: [MailService, MailTemplatesService, MailNotificationService, EmailProviderFactory],
  exports: [MailService, MailTemplatesService, MailNotificationService, EmailProviderFactory],
})
export class MailModule {}
