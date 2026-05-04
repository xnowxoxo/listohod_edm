import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { extname } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_SERVICE, IStorageService } from '../storage/storage.interface';

// Statuses where active approval chain must be reset on file replace
const RESET_STATUSES = ['REVIEW', 'APPROVED'];

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

  async replace(
    documentId: string,
    attachmentId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    // 1. Validate document
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Документ не найден');

    if (doc.status === 'SIGNED') {
      throw new ForbiddenException(
        'Нельзя заменить файл у подписанного документа. Подписанные документы неизменны.',
      );
    }

    // 2. Validate attachment belongs to this document
    const att = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!att) throw new NotFoundException('Вложение не найдено');
    if (att.documentId !== documentId) {
      throw new ForbiddenException('Вложение не принадлежит этому документу');
    }

    // 3. Upload new file first (fail early before deleting old)
    const ext = extname(file.originalname);
    const newKey = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    await this.storage.upload(newKey, file.buffer, file.mimetype);

    // 4. Delete old file from storage (tolerate missing files)
    try {
      await this.storage.delete(att.storedName);
    } catch {
      // old file already gone — continue
    }

    // 5. Update attachment record in DB
    const updatedAtt = await this.prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        originalName: file.originalname,
        storedName: newKey,
        mimeType: file.mimetype,
        size: file.size,
        url: this.storage.getPublicUrl(newKey),
      },
    });

    // 6. Reset approval chain if doc was in an active/completed approval state
    const needsReset = RESET_STATUSES.includes(doc.status);
    if (needsReset) {
      await this.prisma.approvalStep.deleteMany({ where: { documentId } });
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'DRAFT' },
      });
    }

    // 7. Log the replacement
    await this.prisma.activityLog.create({
      data: {
        documentId,
        userId,
        action: 'FILE_REPLACED',
        details: {
          oldName: att.originalName,
          newName: file.originalname,
          statusBefore: needsReset ? doc.status : null,
          statusAfter: needsReset ? 'DRAFT' : null,
          approvalReset: needsReset,
        },
      },
    });

    return updatedAtt;
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
