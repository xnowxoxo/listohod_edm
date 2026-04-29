import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_SERVICE, IStorageService } from '../storage/storage.interface';

@Injectable()
export class AttachmentsService {
  constructor(
    private prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private storage: IStorageService,
  ) {}

  async findOne(id: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id } });
    if (!att) throw new NotFoundException('Вложение не найдено');
    return att;
  }

  async upload(documentId: string, file: Express.Multer.File) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Документ не найден');

    const ext = extname(file.originalname);
    const key = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    await this.storage.upload(key, file.buffer, file.mimetype);

    return this.prisma.attachment.create({
      data: {
        documentId,
        originalName: file.originalname,
        storedName: key,
        mimeType: file.mimetype,
        size: file.size,
        url: this.storage.getPublicUrl(key),
      },
    });
  }

  async getBuffer(id: string): Promise<{ att: Awaited<ReturnType<typeof this.findOne>>; buffer: Buffer }> {
    const att = await this.findOne(id);
    const buffer = await this.storage.download(att.storedName);
    return { att, buffer };
  }

  async remove(id: string) {
    const att = await this.findOne(id);
    await this.storage.delete(att.storedName);
    await this.prisma.attachment.delete({ where: { id } });
    return { message: 'Вложение удалено' };
  }
}
