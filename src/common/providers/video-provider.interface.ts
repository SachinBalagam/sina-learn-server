import { MulterFile } from './multer-file.interface';

export interface VideoUploadResult {
  provider: string;
  providerKey: string;
  playbackId: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
}

export interface VideoProviderInterface {
  upload(
    file: MulterFile,
    options?: { folder?: string; public?: boolean },
  ): Promise<VideoUploadResult>;

  getStreamUrl(providerKey: string, options?: { expiresIn?: number }): Promise<string>;

  getThumbnailUrl(providerKey: string): Promise<string | null>;

  getStatus(providerKey: string): Promise<'processing' | 'ready' | 'failed'>;

  delete(providerKey: string): Promise<void>;

  generateDirectUploadUrl?(options?: {
    folder?: string;
    maxSizeBytes?: number;
    allowedMimeTypes?: string[];
  }): Promise<{ uploadUrl: string; providerKey: string }>;
}
