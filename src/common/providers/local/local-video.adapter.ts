import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { MulterFile } from '../multer-file.interface';
import { VideoProviderInterface, VideoUploadResult } from '../video-provider.interface';

@Injectable()
export class LocalVideoAdapter implements VideoProviderInterface {
  private uploadDir: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = configService.get<string>('UPLOAD_DIR', 'uploads');
    this.baseUrl = configService.get<string>('UPLOAD_BASE_URL', 'http://localhost:4000/uploads');
    const videoDir = path.join(this.uploadDir, 'videos');
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
  }

  async upload(
    file: MulterFile,
    options?: { folder?: string; public?: boolean },
  ): Promise<VideoUploadResult> {
    const ext = path.extname(file.originalname);
    const filename = `${crypto.randomUUID()}${ext}`;
    const folder = options?.folder || 'videos';
    const dir = path.join(this.uploadDir, folder);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, file.buffer);

    const providerKey = `${folder}/${filename}`;
    return {
      provider: 'local',
      providerKey,
      playbackId: providerKey,
      thumbnailUrl: null,
      duration: null,
      width: null,
      height: null,
    };
  }

  async getStreamUrl(providerKey: string, options?: { expiresIn?: number }): Promise<string> {
    return `${this.baseUrl}/${providerKey}`;
  }

  async getThumbnailUrl(providerKey: string): Promise<string | null> {
    const baseName = path.basename(providerKey, path.extname(providerKey));
    const dirName = path.dirname(providerKey);
    const thumbPath = path.join(this.uploadDir, dirName, `${baseName}.jpg`);
    if (fs.existsSync(thumbPath)) {
      return `${this.baseUrl}/${dirName}/${baseName}.jpg`;
    }
    return null;
  }

  async getStatus(providerKey: string): Promise<'processing' | 'ready' | 'failed'> {
    const filePath = path.join(this.uploadDir, providerKey);
    if (fs.existsSync(filePath)) {
      return 'ready';
    }
    return 'failed';
  }

  async delete(providerKey: string): Promise<void> {
    const filePath = path.join(this.uploadDir, providerKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
