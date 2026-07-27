import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MulterFile } from '../../common/providers/multer-file.interface';
import { StorageProviderInterface } from '../../common/providers/storage-provider.interface';
import { VideoProviderInterface, VideoUploadResult } from '../../common/providers/video-provider.interface';
import { LocalStorageAdapter } from '../../common/providers/local/local-storage.adapter';
import { CloudinaryStorageAdapter } from '../../common/providers/cloudinary/cloudinary-storage.adapter';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { QueryMediaDto } from './dto/query-media.dto';
import { MediaStatus, Prisma } from '@prisma/client';

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    @Inject('STORAGE_PROVIDER') private storageProvider: StorageProviderInterface,
    @Inject('VIDEO_PROVIDER') private videoProvider: VideoProviderInterface,
    private localStorageAdapter: LocalStorageAdapter,
    private cloudinaryStorageAdapter: CloudinaryStorageAdapter,
  ) {}

  async upload(
    file: MulterFile,
    orgId: string,
    userId: string,
    dto: CreateMediaDto,
  ) {
    const isVideo = file.mimetype.startsWith('video/');

    let result: { provider: string; providerKey: string; playbackId?: string | null; thumbnailUrl?: string | null; duration?: number | null; width?: number | null; height?: number | null };
    let status: MediaStatus = MediaStatus.READY;

    if (isVideo) {
      result = await this.videoProvider.upload(file);
      status = result.playbackId ? MediaStatus.PROCESSING : MediaStatus.READY;
    } else {
      result = await this.storageProvider.upload(file, {
        folder: `${orgId}/${userId}`,
        filename: `${Date.now()}-${file.originalname}`,
      });
    }

    const saved = await this.prisma.media.create({
      data: {
        originalName: file.originalname,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        provider: result.provider,
        providerKey: result.providerKey,
        playbackId: result.playbackId,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        width: result.width,
        height: result.height,
        status,
        organizationId: orgId,
        uploadedById: userId,
        lessonId: dto.lessonId || null,
      },
    });

    const url = await this.getSignedUrl(saved.providerKey!, saved.provider, saved.mimeType);
    return {
      ...saved,
      url,
    };
  }

  async findAll(orgId: string, query: QueryMediaDto) {
    const where: Prisma.MediaWhereInput = {
      organizationId: orgId,
      deletedAt: null,
    };

    if (query.lessonId) where.lessonId = query.lessonId;
    if (query.mimeType) where.mimeType = { startsWith: query.mimeType };
    if (query.status) where.status = query.status as MediaStatus;

    const skip = ((query.page || 1) - 1) * (query.limit || 20);

    const [items, total] = await Promise.all([
      this.prisma.media.findMany({
        where,
        skip,
        take: query.limit || 20,
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.media.count({ where }),
    ]);

    const mappedItems = await Promise.all(
      items.map(async (item) => {
        const url = await this.getSignedUrl(item.providerKey!, item.provider, item.mimeType);
        return {
          ...item,
          url,
        };
      })
    );

    return { items: mappedItems, total, page: query.page || 1, limit: query.limit || 20 };
  }

  async findOne(id: string, orgId: string) {
    const media = await this.prisma.media.findFirst({
      where: { id, organizationId: orgId, deletedAt: null },
      include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!media) {
      throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media not found' });
    }
    return media;
  }

  async update(id: string, orgId: string, dto: UpdateMediaDto) {
    await this.findOne(id, orgId);
    return this.prisma.media.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, orgId: string) {
    const media = await this.findOne(id, orgId);
    let activeAdapter = this.storageProvider;
    if (media.provider === 'local') {
      activeAdapter = this.localStorageAdapter;
    } else if (media.provider === 'cloudinary') {
      activeAdapter = this.cloudinaryStorageAdapter;
    }

    await Promise.all([
      activeAdapter.delete(media.providerKey!),
      this.prisma.media.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
    ]);
  }

  async getSignedUrl(providerKey: string, provider: string, mimeType?: string, expiresIn = 3600) {
    const isVideo = mimeType?.startsWith('video/');
    if (isVideo) {
      return this.videoProvider.getStreamUrl(providerKey, { expiresIn });
    }
    if (provider === 'local') {
      return this.localStorageAdapter.getUrl(providerKey);
    }
    if (provider === 'cloudinary') {
      return this.cloudinaryStorageAdapter.getUrl(providerKey, { expiresIn });
    }
    return this.storageProvider.getUrl(providerKey, { expiresIn });
  }

  async findByLesson(lessonId: string, orgId: string) {
    return this.prisma.media.findMany({
      where: { lessonId, organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getVideoStreamUrl(id: string, orgId: string) {
    const media = await this.findOne(id, orgId);
    if (!media.mimeType.startsWith('video/')) {
      throw new NotFoundException({ code: 'NOT_VIDEO', message: 'Media is not a video' });
    }
    return this.videoProvider.getStreamUrl(media.providerKey!);
  }

  async generateDirectUploadUrl() {
    if (!this.videoProvider.generateDirectUploadUrl) {
      throw new Error('Current video provider does not support direct upload');
    }
    return this.videoProvider.generateDirectUploadUrl();
  }
}
