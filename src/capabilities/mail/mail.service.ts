import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailProviderFactory } from './email-provider.factory';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private prisma: PrismaService,
    private emailFactory: EmailProviderFactory,
  ) {}

  /**
   * Send an email using the dynamically resolved mail settings (custom tenant SMTP or platform Brevo SMTP)
   */
  async send({
    organizationId,
    to,
    subject,
    html,
  }: {
    organizationId: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<boolean> {
    try {
      const emailProvider = await this.emailFactory.getProvider(organizationId);
      await emailProvider.sendEmail({
        to,
        subject,
        body: html, // Plain text fallback
        html,
      });
      return true;
    } catch (error: any) {
      this.logger.error(`Dynamic email transmission failed to ${to}: ${error.message}`, error.stack);
      return false;
    }
  }
}
