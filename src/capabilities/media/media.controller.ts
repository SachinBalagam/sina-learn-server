import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { MulterFile } from '../../common/providers/multer-file.interface';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/permissions/permission.registry';
import { RequirePermission } from '../../common/permissions/require-permission.decorator';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission(Permissions.MEDIA_UPLOAD)
  async upload(
    @UploadedFile() file: MulterFile,
    @Body() dto: CreateMediaDto,
    @CurrentOrg('id') orgId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const resolvedOrgId = orgId || (req.user as any)?.organizationId;
    if (!resolvedOrgId) {
      throw new BadRequestException({ code: 'ORG_REQUIRED', message: 'Organization ID is required' });
    }
    return this.mediaService.upload(file, resolvedOrgId, userId, dto);
  }

  @Get()
  @RequirePermission(Permissions.MEDIA_READ)
  async findAll(
    @Query() query: QueryMediaDto,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.mediaService.findAll(orgId, query);
  }

  @Get(':id')
  @RequirePermission(Permissions.MEDIA_READ)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.mediaService.findOne(id, orgId);
  }

  @Patch(':id')
  @RequirePermission(Permissions.MEDIA_UPLOAD)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaDto,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.mediaService.update(id, orgId, dto);
  }

  @Delete(':id')
  @RequirePermission(Permissions.MEDIA_DELETE)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.mediaService.remove(id, orgId);
  }

  @Get(':id/signed-url')
  @RequirePermission(Permissions.MEDIA_READ)
  async getSignedUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    const media = await this.mediaService.findOne(id, orgId);
    const url = await this.mediaService.getSignedUrl(media.providerKey!, media.provider);
    return { url };
  }

  @Get(':id/stream-url')
  @RequirePermission(Permissions.MEDIA_READ)
  async getVideoStreamUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    const url = await this.mediaService.getVideoStreamUrl(id, orgId);
    return { url };
  }

  @Get('lesson/:lessonId')
  @RequirePermission(Permissions.MEDIA_READ)
  async findByLesson(
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Req() req: Request,
  ) {
    const orgId = req.org?.id || (req.user as any)?.organizationId;
    return this.mediaService.findByLesson(lessonId, orgId);
  }

  @Post('direct-upload-url')
  @RequirePermission(Permissions.MEDIA_UPLOAD)
  async getDirectUploadUrl() {
    return this.mediaService.generateDirectUploadUrl();
  }
}
