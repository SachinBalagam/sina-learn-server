import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { RequirePermission } from '../../common/permissions/require-permission.decorator';
import { Permissions } from '../../common/permissions/permission.registry';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermission(Permissions.SETTINGS_READ)
  async get(@CurrentOrg('id') orgId: string) {
    return this.settingsService.get(orgId);
  }

  @Patch()
  @RequirePermission(Permissions.SETTINGS_UPDATE)
  async update(@CurrentOrg('id') orgId: string, @Body() dto: UpdateSettingsDto) {
    return this.settingsService.update(orgId, dto);
  }
}
