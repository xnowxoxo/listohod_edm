export const STORAGE_SERVICE = 'STORAGE_SERVICE';

export interface IStorageService {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<void>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getPublicUrl(key: string): string;
}
