import { Controller, Get, Body, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { MailTemplatesService } from './mail-templates.service';
import { UpsertTemplateDto } from './dto/upsert-template.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Request } from 'express';
import { RequirePermission } from '../../common/permissions/require-permission.decorator';
import { Permissions } from '../../common/permissions/permission.registry';

@Controller('mail/templates')
@UseGuards(JwtAuthGuard)
export class MailTemplatesController {
  constructor(private templatesService: MailTemplatesService) {}

  @Get()
  @RequirePermission(Permissions.SETTINGS_UPDATE) // Admin settings permission
  async findAll(@Req() req: Request) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.templatesService.findAll(orgId);
  }

  @Get(':key')
  @RequirePermission(Permissions.SETTINGS_UPDATE)
  async findByKey(@Param('key') key: string, @Req() req: Request) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.templatesService.findByKey(orgId, key);
  }

  @Patch(':key')
  @RequirePermission(Permissions.SETTINGS_UPDATE)
  async upsert(
    @Param('key') key: string,
    @Body() dto: UpsertTemplateDto,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.templatesService.upsert(orgId, key, dto);
  }
}
