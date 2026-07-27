import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailProviderInterface, SendEmailOptions } from '../email-provider.interface';

@Injectable()
export class SmtpEmailAdapter implements EmailProviderInterface {
  private readonly logger = new Logger(SmtpEmailAdapter.name);
  private transporter: nodemailer.Transporter;
  private senderEmail: string;

  constructor(config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
  }) {
    this.senderEmail = config.from;
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.senderEmail,
        to: options.to,
        subject: options.subject,
        text: options.body,
        html: options.html || options.body,
      });
      this.logger.log(`Email successfully dispatched via SMTP: ${info.messageId}`);
    } catch (error) {
      this.logger.error(`SMTP email transmission failed to ${options.to}`, error);
      throw error;
    }
  }
}
