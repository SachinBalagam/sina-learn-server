import { Controller, Get, Post, Body, Param, Patch, Delete, UseGuards, Res, Header, Query } from '@nestjs/common';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../../common/decorators/current-org.decorator';
import { RequirePermission } from '../../../common/permissions/require-permission.decorator';
import { Permissions } from '../../../common/permissions/permission.registry';
import type { Response } from 'express';

@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.COURSES_READ)
  async issue(
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
    @Body('courseId') courseId: string,
    @Body('recipientId') recipientId: string,
  ) {
    return this.certificatesService.issue(orgId, userId, courseId, recipientId);
  }

  @Get('verify/:id')
  async verify(@Param('id') id: string) {
    return this.certificatesService.verify(id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async findMyCertificates(
    @CurrentUser('id') userId: string,
    @CurrentOrg('id') orgId: string,
  ) {
    return this.certificatesService.findByUser(userId, orgId);
  }

  @Get('org')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.COURSES_READ)
  async findOrgCertificates(
    @CurrentOrg('id') orgId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.certificatesService.findByOrg(orgId, { page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get('public/:id/pdf')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="certificate.pdf"')
  async downloadPublicPdf(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdf = await this.certificatesService.generatePdf(id);
    res.send(pdf);
  }

  @Get(':id/pdf')
  @UseGuards(JwtAuthGuard)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="certificate.pdf"')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentOrg('id') orgId: string,
    @Res() res: Response,
  ) {
    const pdf = await this.certificatesService.generatePdf(id, orgId);
    res.send(pdf);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(
    @Param('id') id: string,
    @CurrentOrg('id') orgId: string,
  ) {
    return this.certificatesService.findById(id, orgId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @RequirePermission(Permissions.COURSES_DELETE)
  async revoke(@Param('id') id: string, @CurrentOrg('id') orgId: string) {
    return this.certificatesService.revoke(id, orgId);
  }
}
