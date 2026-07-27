export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface EmailProviderInterface {
  sendEmail(options: SendEmailOptions): Promise<void>;
}
