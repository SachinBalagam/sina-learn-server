import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { MulterFile } from '../multer-file.interface';
import { VideoProviderInterface, VideoUploadResult } from '../video-provider.interface';

@Injectable()
export class CloudinaryVideoAdapter implements VideoProviderInterface {
  private readonly logger = new Logger(CloudinaryVideoAdapter.name);

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.logger.log('Cloudinary configured');
    } else {
      this.logger.warn('Cloudinary not configured — missing env vars');
    }
  }

  async upload(
    file: MulterFile,
    options?: { folder?: string; public?: boolean },
  ): Promise<VideoUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: options?.folder || 'videos',
          public_id: undefined,
          eager: [{ streaming_profile: 'hd', format: 'm3u8' }],
          eager_async: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error('Cloudinary upload returned no result'));
            return;
          }
          resolve({
            provider: 'cloudinary',
            providerKey: result.public_id,
            playbackId: result.playback_url || null,
            thumbnailUrl: result.thumbnail_url || null,
            duration: result.duration || null,
            width: result.width || null,
            height: result.height || null,
          });
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async getStreamUrl(
    providerKey: string,
    options?: { expiresIn?: number },
  ): Promise<string> {
    const url = cloudinary.url(providerKey, {
      resource_type: 'video',
      secure: true,
      format: 'mp4',
      sign_url: true,
      type: 'upload',
    });
    return url;
  }

  async getThumbnailUrl(providerKey: string): Promise<string | null> {
    try {
      const url = cloudinary.url(providerKey, {
        resource_type: 'video',
        secure: true,
        format: 'jpg',
        width: 640,
        height: 360,
        crop: 'fill',
        type: 'upload',
      });
      return url;
    } catch {
      return null;
    }
  }

  async getStatus(providerKey: string): Promise<'processing' | 'ready' | 'failed'> {
    try {
      const result = await cloudinary.api.resource(providerKey, {
        resource_type: 'video',
      });
      if (result.status === 'processing' || result.status === 'uploading') {
        return 'processing';
      }
      if (result.status === 'ready' || result.status === 'active') {
        return 'ready';
      }
      return 'failed';
    } catch {
      return 'failed';
    }
  }

  async delete(providerKey: string): Promise<void> {
    await cloudinary.uploader.destroy(providerKey, { resource_type: 'video' });
  }

  async generateDirectUploadUrl(options?: {
    folder?: string;
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
  }): Promise<{ uploadUrl: string; providerKey: string }> {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = options?.folder || 'videos';
    const publicId = `direct_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        public_id: publicId,
        folder,
        resource_type: 'video',
      },
      this.configService.get<string>('CLOUDINARY_API_SECRET')!,
    );

    const uploadUrl = `https://api.cloudinary.com/v1_1/${this.configService.get<string>('CLOUDINARY_CLOUD_NAME')}/video/upload`;
    return { uploadUrl, providerKey: `${folder}/${publicId}` };
  }
}
