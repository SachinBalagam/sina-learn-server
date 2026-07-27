import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mux from '@mux/mux-node';
import { MulterFile } from '../multer-file.interface';
import { VideoProviderInterface, VideoUploadResult } from '../video-provider.interface';

@Injectable()
export class MuxVideoAdapter implements VideoProviderInterface {
  private readonly logger = new Logger(MuxVideoAdapter.name);
  private muxClient: InstanceType<typeof Mux> | null = null;

  constructor(private configService: ConfigService) {
    const tokenId = this.configService.get<string>('MUX_TOKEN_ID');
    const tokenSecret = this.configService.get<string>('MUX_TOKEN_SECRET');

    if (tokenId && tokenSecret) {
      this.muxClient = new Mux({ tokenId, tokenSecret });
      this.logger.log('Mux configured');
    } else {
      this.logger.warn('Mux not configured — missing env vars');
    }
  }

  async upload(
    file: MulterFile,
    options?: { folder?: string; public?: boolean },
  ): Promise<VideoUploadResult> {
    if (!this.muxClient) {
      throw new Error('Mux is not configured. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET.');
    }

    const corsOrigin = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

    const upload = await this.muxClient.video.uploads.create({
      cors_origin: corsOrigin,
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'standard',
        normalize_audio: true,
      },
    });

    if (!upload.url) {
      throw new Error('Mux upload URL not returned');
    }

    await fetch(upload.url, { method: 'PUT', body: new Uint8Array(file.buffer) });

    return {
      provider: 'mux',
      providerKey: upload.id,
      playbackId: null,
      thumbnailUrl: null,
      duration: null,
      width: null,
      height: null,
    };
  }

  private async resolveAssetId(providerKey: string): Promise<string | null> {
    if (!this.muxClient) return null;
    try {
      const upload = await this.muxClient.video.uploads.retrieve(providerKey);
      return upload.asset_id || null;
    } catch {
      return providerKey;
    }
  }

  async getStreamUrl(
    providerKey: string,
    options?: { expiresIn?: number },
  ): Promise<string> {
    if (!this.muxClient) {
      throw new Error('Mux is not configured.');
    }

    const assetId = await this.resolveAssetId(providerKey);
    const asset = await this.muxClient.video.assets.retrieve(assetId!);
    const playbackId = asset.playback_ids?.[0]?.id;
    if (!playbackId) {
      throw new Error('No playback ID found for Mux asset');
    }

    const baseUrl = `https://stream.mux.com/${playbackId}.m3u8`;
    if (options?.expiresIn) {
      const token = this.muxClient.jwt.signPlaybackId(playbackId, {
        expiration: String(Math.floor(Date.now() / 1000) + options.expiresIn),
      });
      return `${baseUrl}?token=${token}`;
    }

    return baseUrl;
  }

  async getThumbnailUrl(providerKey: string): Promise<string | null> {
    if (!this.muxClient) return null;
    try {
      const assetId = await this.resolveAssetId(providerKey);
      const asset = await this.muxClient.video.assets.retrieve(assetId!);
      const playbackId = asset.playback_ids?.[0]?.id;
      if (!playbackId) return null;
      return `https://image.mux.com/${playbackId}/thumbnail.jpg?width=640&height=360&fit_mode=smartcrop`;
    } catch {
      return null;
    }
  }

  async getStatus(providerKey: string): Promise<'processing' | 'ready' | 'failed'> {
    if (!this.muxClient) return 'failed';
    try {
      const assetId = await this.resolveAssetId(providerKey);
      const asset = await this.muxClient.video.assets.retrieve(assetId!);
      const status = asset.status;
      if (status === 'preparing') return 'processing';
      if (status === 'ready') return 'ready';
      return 'failed';
    } catch {
      return 'processing';
    }
  }

  async delete(providerKey: string): Promise<void> {
    if (!this.muxClient) {
      throw new Error('Mux is not configured.');
    }
    const assetId = await this.resolveAssetId(providerKey);
    await this.muxClient.video.assets.delete(assetId!);
  }

  async generateDirectUploadUrl(options?: {
    folder?: string;
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
  }): Promise<{ uploadUrl: string; providerKey: string }> {
    if (!this.muxClient) {
      throw new Error('Mux is not configured.');
    }

    const upload = await this.muxClient.video.uploads.create({
      cors_origin: this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000'),
      new_asset_settings: {
        playback_policy: ['public'],
        mp4_support: 'standard',
        normalize_audio: true,
      },
    });

    if (!upload.url) {
      throw new Error('Mux upload URL not returned');
    }

    return { uploadUrl: upload.url, providerKey: upload.id };
  }
}
