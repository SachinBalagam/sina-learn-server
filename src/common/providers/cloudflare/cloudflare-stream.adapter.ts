import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterFile } from '../multer-file.interface';
import { VideoProviderInterface, VideoUploadResult } from '../video-provider.interface';

@Injectable()
export class CloudflareStreamAdapter implements VideoProviderInterface {
  private readonly logger = new Logger(CloudflareStreamAdapter.name);
  private readonly apiBase: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN');

    if (accountId && apiToken) {
      this.apiBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;
      this.logger.log('Cloudflare Stream configured');
    } else {
      this.apiBase = '';
      this.logger.warn('Cloudflare Stream not configured — missing env vars');
    }
  }

  private get headers() {
    const token = this.configService.get<string>('CLOUDFLARE_API_TOKEN');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async upload(
    file: MulterFile,
    options?: { folder?: string; public?: boolean },
  ): Promise<VideoUploadResult> {
    if (!this.apiBase) {
      throw new Error('Cloudflare Stream is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.');
    }

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });
    formData.append('file', blob, file.originalname);

    const response = await fetch(`${this.apiBase}/copy`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.configService.get<string>('CLOUDFLARE_API_TOKEN')}` },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Cloudflare upload failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const result = data.result;

    return {
      provider: 'cloudflare',
      providerKey: result.uid,
      playbackId: result.uid,
      thumbnailUrl: `https://videodelivery.net/${result.uid}/thumbnails/thumbnail.jpg`,
      duration: result.duration || null,
      width: result.input?.width || null,
      height: result.input?.height || null,
    };
  }

  async getStreamUrl(
    providerKey: string,
    options?: { expiresIn?: number },
  ): Promise<string> {
    if (options?.expiresIn) {
      return `https://videodelivery.net/${providerKey}/manifest/video.m3u8`;
    }
    return `https://videodelivery.net/${providerKey}/manifest/video.m3u8`;
  }

  async getThumbnailUrl(providerKey: string): Promise<string | null> {
    return `https://videodelivery.net/${providerKey}/thumbnails/thumbnail.jpg?width=640&height=360&fit=cover`;
  }

  async getStatus(providerKey: string): Promise<'processing' | 'ready' | 'failed'> {
    if (!this.apiBase) return 'failed';

    try {
      const response = await fetch(`${this.apiBase}/${providerKey}`, {
        headers: this.headers,
      });
      if (!response.ok) return 'failed';

      const data = await response.json();
      const status = data.result?.status?.state;

      if (status === 'queued' || status === 'inprogress' || status === 'downloading') {
        return 'processing';
      }
      if (status === 'ready' || status === 'active') {
        return 'ready';
      }
      return 'failed';
    } catch {
      return 'failed';
    }
  }

  async delete(providerKey: string): Promise<void> {
    if (!this.apiBase) {
      throw new Error('Cloudflare Stream is not configured.');
    }

    const response = await fetch(`${this.apiBase}/${providerKey}`, {
      method: 'DELETE',
      headers: this.headers,
    });

    if (!response.ok) {
      this.logger.warn(`Cloudflare delete failed: ${response.status}`);
    }
  }

  async generateDirectUploadUrl(options?: {
    folder?: string;
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
  }): Promise<{ uploadUrl: string; providerKey: string }> {
    if (!this.apiBase) {
      throw new Error('Cloudflare Stream is not configured.');
    }

    const body: Record<string, any> = {
      maxDurationSeconds: 3600,
    };

    if (options?.maxSizeBytes) {
      body.maxSizeBytes = options.maxSizeBytes;
    }

    const response = await fetch(`${this.apiBase}/direct_upload`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Cloudflare direct upload failed: ${response.status}`);
    }

    const data = await response.json();
    return {
      uploadUrl: data.result.uploadURL,
      providerKey: data.result.uid,
    };
  }
}
