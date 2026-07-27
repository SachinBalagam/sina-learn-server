import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { MulterFile } from '../multer-file.interface';
import { StorageProviderInterface, UploadResult } from '../storage-provider.interface';

@Injectable()
export class LocalStorageAdapter implements StorageProviderInterface {
  private uploadDir: string;
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = configService.get<string>('UPLOAD_DIR', 'uploads');
    this.baseUrl = configService.get<string>('UPLOAD_BASE_URL', 'http://localhost:4000/uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(
    file: MulterFile,
    options?: { folder?: string; filename?: string; isPublic?: boolean },
  ): Promise<UploadResult> {
    const ext = path.extname(file.originalname);
    const filename = options?.filename || `${crypto.randomUUID()}${ext}`;
    const folder = options?.folder || 'general';
    const dir = path.join(this.uploadDir, folder);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, file.buffer);

    const providerKey = `${folder}/${filename}`;
    return {
      url: `${this.baseUrl}/${providerKey}`,
      provider: 'local',
      providerKey,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async getUrl(providerKey: string, options?: { expiresIn?: number }): Promise<string> {
    return `${this.baseUrl}/${providerKey}`;
  }

  async delete(providerKey: string): Promise<void> {
    const filePath = path.join(this.uploadDir, providerKey);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async list(folder?: string): Promise<{ key: string; url: string; size: number }[]> {
    const dir = folder ? path.join(this.uploadDir, folder) : this.uploadDir;
    if (!fs.existsSync(dir)) return [];

    const items = fs.readdirSync(dir);
    return items.map((name) => {
      const stat = fs.statSync(path.join(dir, name));
      return {
        key: `${folder ? folder + '/' : ''}${name}`,
        url: `${this.baseUrl}/${folder ? folder + '/' : ''}${name}`,
        size: stat.size,
      };
    });
  }
}
