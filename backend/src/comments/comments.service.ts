import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(documentId: string, text: string, userId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Документ не найден');

    return this.prisma.comment.create({
      data: { documentId, text, authorId: userId },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });
  }

  async remove(id: string, userId: string, userRole: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Комментарий не найден');
    if (comment.authorId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Нет доступа');
    }
    await this.prisma.comment.delete({ where: { id } });
    return { message: 'Комментарий удалён' };
  }
}
