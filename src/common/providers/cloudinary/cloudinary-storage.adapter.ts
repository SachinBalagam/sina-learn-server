import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { MulterFile } from '../multer-file.interface';
import { StorageProviderInterface, UploadResult } from '../storage-provider.interface';

@Injectable()
export class CloudinaryStorageAdapter implements StorageProviderInterface {
  private readonly logger = new Logger(CloudinaryStorageAdapter.name);

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
      this.logger.log('Cloudinary Storage configured');
    } else {
      this.logger.warn('Cloudinary Storage not configured — missing env vars');
    }
  }

  async upload(
    file: MulterFile,
    options?: { folder?: string; filename?: string; isPublic?: boolean },
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const baseFolder = options?.folder || 'uploads';
      const isImage = file.mimetype.startsWith('image/');
      const isVideo = file.mimetype.startsWith('video/');
      
      let typeFolder = 'docs';
      if (isImage) {
        typeFolder = 'images';
      } else if (isVideo) {
        typeFolder = 'videos';
      }
      
      const folder = `sina-learn/${baseFolder}/${typeFolder}`;
      const resourceType = isImage ? 'image' : (isVideo ? 'video' : 'raw');

      // Clean filename for public ID. Raw resources retain their extensions in Cloudinary.
      let publicId: string | undefined = undefined;
      if (options?.filename) {
        publicId = isImage ? options.filename.split('.')[0] : options.filename;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder,
          public_id: publicId,
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error('Cloudinary storage upload returned no result'));
            return;
          }
          resolve({
            url: result.secure_url,
            provider: 'cloudinary',
            providerKey: result.public_id,
            size: result.bytes || file.size,
            mimeType: file.mimetype,
          });
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async getUrl(providerKey: string, options?: { expiresIn?: number }): Promise<string> {
    const isVideo = providerKey.includes('/videos/');
    const hasExtension = providerKey.includes('.');
    const resourceType = isVideo ? 'video' : (hasExtension ? 'raw' : 'image');
    return cloudinary.url(providerKey, {
      resource_type: resourceType,
      secure: true,
    });
  }

  async delete(providerKey: string): Promise<void> {
    const isVideo = providerKey.includes('/videos/');
    const hasExtension = providerKey.includes('.');
    const resourceType = isVideo ? 'video' : (hasExtension ? 'raw' : 'image');
    await cloudinary.uploader.destroy(providerKey, { resource_type: resourceType });
  }

  async list(folder?: string): Promise<{ key: string; url: string; size: number }[]> {
    try {
      const prefix = folder ? `${folder}/` : '';
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix,
        max_results: 100,
      });
      return (result.resources || []).map((resource: any) => ({
        key: resource.public_id,
        url: resource.secure_url,
        size: resource.bytes || 0,
      }));
    } catch (err) {
      this.logger.error('Failed to list files from Cloudinary', err);
      return [];
    }
  }
}
