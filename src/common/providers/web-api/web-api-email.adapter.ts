import { Injectable, Logger } from '@nestjs/common';
import { EmailProviderInterface, SendEmailOptions } from '../email-provider.interface';

@Injectable()
export class WebApiEmailAdapter implements EmailProviderInterface {
  private readonly logger = new Logger(WebApiEmailAdapter.name);

  constructor(
    private readonly apiKey: string,
    private readonly senderEmail: string,
  ) {}

  async sendEmail(options: SendEmailOptions): Promise<void> {
    const isResend = this.apiKey.startsWith('re_');

    if (isResend) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.senderEmail,
          to: [options.to],
          subject: options.subject,
          html: options.html || options.body,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Resend Web API Error: ${response.status} - ${body}`);
      }
      this.logger.log(`Resend Web API email sent successfully to ${options.to}`);
    } else {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: options.to }] }],
          from: { email: this.senderEmail },
          subject: options.subject,
          content: [{ type: 'text/html', value: options.html || options.body }],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`SendGrid Web API Error: ${response.status} - ${body}`);
      }
      this.logger.log(`SendGrid Web API email sent successfully to ${options.to}`);
    }
  }
}
