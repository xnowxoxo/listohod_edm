import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface NotifyPayload {
  userId: string;
  type: string;
  title: string;
  body?: string;
  documentId?: string;
}

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async notify(payload: NotifyPayload) {
    return this.prisma.notification.create({ data: payload });
  }

  async notifyMany(payloads: NotifyPayload[]) {
    if (!payloads.length) return;
    await this.prisma.notification.createMany({ data: payloads });
  }

  async findForUser(userId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          document: {
            select: { id: true, number: true, title: true, type: true, status: true },
          },
        },
      }),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
