import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailProviderInterface, SendEmailOptions } from '../email-provider.interface';

@Injectable()
export class ConsoleEmailAdapter implements EmailProviderInterface {
  private readonly logger = new Logger(ConsoleEmailAdapter.name);
  private readonly from: string;

  constructor(configService: ConfigService) {
    this.from = configService.get<string>('EMAIL_FROM', 'noreply@skilify.com');
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    this.logger.log('--- EMAIL ---');
    this.logger.log(`From: ${this.from}`);
    this.logger.log(`To: ${options.to}`);
    this.logger.log(`Subject: ${options.subject}`);
    this.logger.log(`Body: ${options.body}`);
    if (options.html) {
      this.logger.log(`HTML: ${options.html.substring(0, 200)}...`);
    }
    this.logger.log('--- END EMAIL ---');
  }
}
