import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from './mail.service';
import { MailTemplatesService } from './mail-templates.service';

@Injectable()
export class MailNotificationService {
  private readonly logger = new Logger(MailNotificationService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private templatesService: MailTemplatesService,
  ) {}

  /**
   * Dispatches a templated email notification if capability and template settings allow it
   */
  async sendNotification(
    orgId: string,
    key: string,
    to: string,
    variables: Record<string, string>,
  ): Promise<boolean> {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
      });

      if (!org || !org.isActive) {
        this.logger.warn(`Skipping email dispatch: Organization ${orgId} is not active or not found.`);
        return false;
      }

      const settings = (org.settings as Record<string, any>) || {};

      // 1. Check Master Email Delivery Switch
      const deliveryEnabled = settings.mail?.deliveryEnabled ?? true;
      if (!deliveryEnabled) {
        this.logger.log(`Skipping email dispatch: Master email notifications toggled OFF for organization ${org.name}`);
        return false;
      }

      // 2. Check Module/Capability Switch
      const capabilities = settings.capabilities || {};
      if (key.startsWith('lms_') && capabilities.enableLms === false) {
        this.logger.log(`Skipping email dispatch: LMS capability is disabled for organization ${org.name}`);
        return false;
      }
      if (key.startsWith('hrms_') && capabilities.enableHrms === false) {
        this.logger.log(`Skipping email dispatch: HRMS capability is disabled for organization ${org.name}`);
        return false;
      }
      if (key.startsWith('crm_') && capabilities.enableCrm === false) {
        this.logger.log(`Skipping email dispatch: CRM capability is disabled for organization ${org.name}`);
        return false;
      }

      // 3. Fetch specific template and verify it is enabled
      const template = await this.templatesService.findByKey(orgId, key);
      if (!(template as any).isEnabled) {
        this.logger.log(`Skipping email dispatch: Template '${key}' is disabled at organization level for ${org.name}`);
        return false;
      }

      // Add default common variables
      const finalVariables = {
        organizationName: org.name,
        ...variables,
      };

      // 4. Compile Template Accoutrements
      const compiledSubject = this.templatesService.compileTemplate(template.subject, finalVariables);
      const compiledBody = this.templatesService.compileTemplate(template.htmlBody, finalVariables);

      // 5. Send via Mailer Provider
      return await this.mailService.send({
        organizationId: orgId,
        to,
        subject: compiledSubject,
        html: compiledBody,
      });
    } catch (error) {
      const err = error as any;
      this.logger.error(`Failed to dispatch email notification: ${err.message}`, err.stack);
      return false;
    }
  }
}
