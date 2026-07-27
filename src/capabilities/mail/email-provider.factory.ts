import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SmtpEmailAdapter } from '../../common/providers/smtp/smtp-email.adapter';
import { WebApiEmailAdapter } from '../../common/providers/web-api/web-api-email.adapter';
import { ConsoleEmailAdapter } from '../../common/providers/console/console-email.adapter';
import { EmailProviderInterface } from '../../common/providers/email-provider.interface';

@Injectable()
export class EmailProviderFactory {
  private readonly logger = new Logger(EmailProviderFactory.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getProvider(orgId?: string): Promise<EmailProviderInterface> {
    // 1. Check for custom organization-level credentials
    if (orgId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { settings: true },
      });

      const mailSettings = (org?.settings as any)?.mail;
      
      // Case A: Custom SMTP Credentials
      if (
        mailSettings?.provider === 'smtp' &&
        mailSettings?.smtpHost &&
        mailSettings?.smtpPort &&
        mailSettings?.smtpUser &&
        mailSettings?.apiKey
      ) {
        this.logger.log(`Resolving custom SMTP email provider for Organization: ${orgId}`);
        return new SmtpEmailAdapter({
          host: mailSettings.smtpHost,
          port: parseInt(mailSettings.smtpPort, 10),
          secure: mailSettings.smtpPort === '465',
          user: mailSettings.smtpUser,
          pass: mailSettings.apiKey,
          from: mailSettings.senderEmail || 'noreply@sinalearn.com',
        });
      }

      // Case B: Custom Web API Credentials (Resend or SendGrid REST API)
      if (
        (mailSettings?.provider === 'api' || mailSettings?.provider === 'resend' || mailSettings?.provider === 'sendgrid') &&
        mailSettings?.apiKey
      ) {
        this.logger.log(`Resolving custom Web API email provider for Organization: ${orgId}`);
        return new WebApiEmailAdapter(
          mailSettings.apiKey,
          mailSettings.senderEmail || 'noreply@sinalearn.com',
        );
      }
    }

    // 2. Platform-wide fallback (Brevo SMTP configuration via environment variables)
    const brevoHost = this.configService.get<string>('BREVO_SMTP_HOST');
    const brevoPort = this.configService.get<number>('BREVO_SMTP_PORT', 587);
    const brevoUser = this.configService.get<string>('BREVO_SMTP_USER');
    const brevoPass = this.configService.get<string>('BREVO_SMTP_PASS');
    const brevoFrom = this.configService.get<string>('BREVO_SMTP_FROM', 'noreply@sinalearn.com');

    if (brevoHost && brevoUser && brevoPass) {
      this.logger.log('Resolving platform Brevo SMTP email provider');
      return new SmtpEmailAdapter({
        host: brevoHost,
        port: Number(brevoPort),
        secure: Number(brevoPort) === 465,
        user: brevoUser,
        pass: brevoPass,
        from: brevoFrom,
      });
    }

    // 3. Local Development sandbox fallback
    this.logger.warn('Brevo SMTP parameters not configured in .env — using console logging adapter.');
    return new ConsoleEmailAdapter(this.configService);
  }
}
