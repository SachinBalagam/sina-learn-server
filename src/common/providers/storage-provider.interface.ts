import { MulterFile } from './multer-file.interface';

export interface UploadResult {
  url: string;
  provider: string;
  providerKey: string;
  size: number;
  mimeType: string;
}

export interface StorageProviderInterface {
  upload(
    file: MulterFile,
    options?: { folder?: string; filename?: string; isPublic?: boolean },
  ): Promise<UploadResult>;

  getUrl(providerKey: string, options?: { expiresIn?: number }): Promise<string>;

  delete(providerKey: string): Promise<void>;

  list(folder?: string): Promise<{ key: string; url: string; size: number }[]>;
}
