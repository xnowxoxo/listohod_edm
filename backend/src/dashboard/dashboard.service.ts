import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      totalDocuments,
      byStatus,
      byType,
      recentDocuments,
      totalUsers,
    ] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.document.groupBy({ by: ['status'], _count: true }),
      this.prisma.document.groupBy({ by: ['type'], _count: true }),
      this.prisma.document.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.user.count(),
    ]);

    const statusMap = byStatus.reduce((acc, s) => {
      acc[s.status] = s._count;
      return acc;
    }, {} as Record<string, number>);

    const typeMap = byType.reduce((acc, t) => {
      acc[t.type] = t._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalDocuments,
      totalUsers,
      byStatus: statusMap,
      byType: typeMap,
      recentDocuments,
    };
  }

  async getMyTasks(userId: string) {
    const steps = await this.prisma.approvalStep.findMany({
      where: { approverId: userId, status: 'PENDING', order: { gt: 0 } },
      include: {
        document: {
          select: {
            id: true, number: true, title: true, type: true, status: true, createdAt: true,
            createdBy: { select: { firstName: true, lastName: true } },
            approvalSteps: { select: { status: true, order: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { items: steps, total: steps.length };
  }

  async getRecentActivity(userId: string) {
    const items = await this.prisma.activityLog.findMany({
      where: {
        OR: [
          { document: { createdById: userId } },
          { document: { approvalSteps: { some: { approverId: userId } } } },
        ],
      },
      include: {
        document: { select: { id: true, number: true, title: true, status: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });
    return { items };
  }
}
