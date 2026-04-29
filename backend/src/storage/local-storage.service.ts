import { Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { resolve } from 'path';
import { IStorageService } from './storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService {
  private get dir(): string {
    const d = process.env.UPLOAD_DIR
      ? resolve(process.env.UPLOAD_DIR)
      : `${process.cwd()}/uploads`;
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
    return d;
  }

  async upload(key: string, buffer: Buffer): Promise<void> {
    writeFileSync(`${this.dir}/${key}`, buffer);
  }

  async download(key: string): Promise<Buffer> {
    const filePath = `${this.dir}/${key}`;
    if (!existsSync(filePath)) throw new NotFoundException('Файл не найден на диске');
    return readFileSync(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = `${this.dir}/${key}`;
    if (existsSync(filePath)) unlinkSync(filePath);
  }

  getPublicUrl(key: string): string {
    return `/uploads/${key}`;
  }
}
