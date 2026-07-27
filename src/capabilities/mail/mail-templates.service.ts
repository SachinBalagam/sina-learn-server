import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpsertTemplateDto } from './dto/upsert-template.dto';

const DEFAULT_TEMPLATES: Record<string, { subject: string; htmlBody: string }> = {
  lms_welcome: {
    subject: 'Welcome to your Course!',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;">
        <h2 style="color: #4f46e5;">Welcome to Sina Learn Portal</h2>
        <p>Hello {{studentName}},</p>
        <p>You have been enrolled in <strong>{{courseTitle}}</strong>. Get ready to start learning and tracking your achievements!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{courseUrl}}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Access your Course</a>
        </div>
        <p style="color: #71717a; font-size: 12px;">This mail was sent from {{organizationName}}.</p>
      </div>
    `,
  },
  core_invite: {
    subject: 'You have been invited to join {{organizationName}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;">
        <h2 style="color: #4f46e5;">Workspace Invitation</h2>
        <p>Hello,</p>
        <p>You have been invited to join <strong>{{organizationName}}</strong> as a <strong>{{role}}</strong>.</p>
        <p>Click the button below to accept the invitation and set up your profile:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{inviteLink}}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Accept Invitation</a>
        </div>
        <p style="color: #71717a; font-size: 12px;">This invitation link will expire in 7 days.</p>
      </div>
    `,
  },
  core_password_reset: {
    subject: 'Reset your Password for {{organizationName}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;">
        <h2 style="color: #ef4444;">Password Reset Request</h2>
        <p>Hi {{firstName}},</p>
        <p>We received a request to reset your password for your <strong>{{organizationName}}</strong> account.</p>
        <p>Click the button below to choose a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetLink}}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you did not request this change, you can safely ignore this email.</p>
        <p style="color: #71717a; font-size: 12px;">This reset link will expire in 1 hour.</p>
      </div>
    `,
  },
  lms_course_launch: {
    subject: 'New Course Launched: {{courseTitle}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;">
        <h2 style="color: #10b981;">New Course Available!</h2>
        <p>Hello Learner,</p>
        <p>We are excited to announce the launch of a new course: <strong>{{courseTitle}}</strong>.</p>
        <p>Start learning today by clicking the link below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{courseUrl}}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Course Details</a>
        </div>
        <p style="color: #71717a; font-size: 12px;">Sent from {{organizationName}} LMS.</p>
      </div>
    `,
  },
  lms_quiz_passed: {
    subject: 'Congratulations! You passed the Quiz: {{quizTitle}}',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;">
        <h2 style="color: #10b981;">Quiz Passed! 🎉</h2>
        <p>Hi {{studentName}},</p>
        <p>Congratulations! You scored <strong>{{score}}%</strong> on the quiz <strong>{{quizTitle}}</strong>, passing the required threshold of {{passingScore}}%.</p>
        <p>Keep up the great work and continue your learning journey!</p>
        <p style="color: #71717a; font-size: 12px;">Sina Learn LMS Learning Portal.</p>
      </div>
    `,
  },
  lms_certificate: {
    subject: 'Your Certificate is ready for {{courseTitle}}!',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;">
        <h2 style="color: #8b5cf6;">Congratulations on Graduation! 🎓</h2>
        <p>Hi {{studentName}},</p>
        <p>You have successfully completed <strong>{{courseTitle}}</strong> and earned your official certificate of completion.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{certificateUrl}}" style="background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">View Certificate</a>
        </div>
        <p>We are proud of your achievement!</p>
        <p style="color: #71717a; font-size: 12px;">Sina Learn LMS Credentials System.</p>
      </div>
    `,
  },
  hrms_clockin: {
    subject: 'Work Day Started - Clock In Confirmation',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;">
        <h2 style="color: #ec4899;">Clock In Confirmed</h2>
        <p>Hi {{employeeName}},</p>
        <p>Your clock-in request has been logged successfully at <strong>{{time}}</strong>.</p>
        <p>Have a productive work session!</p>
        <p style="color: #71717a; font-size: 12px;">Sina Learn HRMS capability engine.</p>
      </div>
    `,
  },
  billing_invoice: {
    subject: 'Your Invoice Receipt Confirmation',
    htmlBody: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 12px;">
        <h2 style="color: #06b6d4;">Invoice Paid Successfully</h2>
        <p>Dear Customer,</p>
        <p>We received your subscription billing payment of <strong>{{amount}}</strong> for your growth plan.</p>
        <div style="padding: 15px; background-color: #f4f4f5; border-radius: 8px; margin: 20px 0;">
          Invoice ID: {{invoiceId}}<br>
          Billing Period: {{period}}
        </div>
        <p style="color: #71717a; font-size: 12px;">Billing operations by Sina Learn.</p>
      </div>
    `,
  },
};

@Injectable()
export class MailTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(orgId: string) {
    const customTemplates = await this.prisma.mailTemplate.findMany({
      where: { organizationId: orgId },
    });

    // Merge default templates if not customized yet
    return Object.keys(DEFAULT_TEMPLATES).map((key) => {
      const custom = customTemplates.find((t) => t.key === key);
      return {
        key,
        subject: custom ? custom.subject : DEFAULT_TEMPLATES[key].subject,
        htmlBody: custom ? custom.htmlBody : DEFAULT_TEMPLATES[key].htmlBody,
        isEnabled: custom ? (custom as any).isEnabled : true,
        isCustomized: !!custom,
      };
    });
  }

  async findByKey(orgId: string, key: string) {
    const custom = await this.prisma.mailTemplate.findUnique({
      where: {
        organizationId_key: { organizationId: orgId, key },
      },
    });

    if (custom) {
      return { ...custom, isCustomized: true };
    }

    if (DEFAULT_TEMPLATES[key]) {
      return {
        key,
        subject: DEFAULT_TEMPLATES[key].subject,
        htmlBody: DEFAULT_TEMPLATES[key].htmlBody,
        isEnabled: true,
        isCustomized: false,
      };
    }

    throw new NotFoundException({ code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' });
  }

  async upsert(orgId: string, key: string, dto: UpsertTemplateDto) {
    if (!DEFAULT_TEMPLATES[key]) {
      throw new NotFoundException({ code: 'INVALID_TEMPLATE_KEY', message: 'Invalid template key definition' });
    }

    return (this.prisma.mailTemplate as any).upsert({
      where: {
        organizationId_key: { organizationId: orgId, key },
      },
      create: {
        organizationId: orgId,
        key,
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        isEnabled: dto.isEnabled ?? true,
      },
      update: {
        subject: dto.subject,
        htmlBody: dto.htmlBody,
        isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : undefined,
      },
    });
  }

  compileTemplate(htmlBody: string, variables: Record<string, string>): string {
    let compiled = htmlBody;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      compiled = compiled.replace(regex, value ?? '');
    }
    return compiled;
  }
}
