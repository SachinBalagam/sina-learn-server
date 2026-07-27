import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequirePermission } from '../../common/permissions/require-permission.decorator';
import { Permissions } from '../../common/permissions/permission.registry';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.ORG_MANAGE_INVITES)
  async create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser('id') userId: string,
    @CurrentOrg('id') orgId: string,
  ) {
    return this.invitationsService.create(orgId, userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.ORG_MANAGE_INVITES)
  async findByOrg(@CurrentOrg('id') orgId: string) {
    return this.invitationsService.findByOrg(orgId);
  }

  @Post(':token/accept')
  async accept(@Param('token') token: string) {
    return this.invitationsService.accept(token);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.ORG_MANAGE_INVITES)
  async revoke(@Param('id') id: string, @CurrentOrg('id') orgId: string) {
    return this.invitationsService.revoke(id, orgId);
  }
}
