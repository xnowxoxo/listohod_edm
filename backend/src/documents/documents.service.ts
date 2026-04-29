import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

// Transitions available via generic changeStatus (admin/general operations).
// DRAFT→REVIEW and REVIEW→APPROVED/REJECTED/NEEDS_REVISION are handled by dedicated methods.
const STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['ARCHIVED'],
  REVIEW: ['DRAFT'],
  APPROVED: ['SIGNED', 'REJECTED'],
  SIGNED: ['ARCHIVED'],
  REJECTED: ['DRAFT', 'ARCHIVED'],
  NEEDS_REVISION: ['DRAFT'],
  ARCHIVED: ['DRAFT'],
};

@Injectable()
export class DocumentsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private docInclude = {
    createdBy: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
    assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
    attachments: true,
    _count: { select: { comments: true, approvals: true } },
  };

  private stepInclude = {
    approver: {
      select: { id: true, firstName: true, lastName: true, role: true, position: true },
    },
  };

  async findAll(query: {
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, type, search } = query;
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const where: any = {};

    // By default exclude ARCHIVED; pass status=ARCHIVED to get only archived docs
    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'ARCHIVED' };
    }
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { number: { contains: search, mode: 'insensitive' } },
        { counterparty: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        include: this.docInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        ...this.docInclude,
        comments: {
          include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        approvals: {
          include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        },
        approvalSteps: {
          include: this.stepInclude,
          orderBy: { order: 'asc' },
        },
        activities: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });
    if (!doc) throw new NotFoundException('Документ не найден');
    return doc;
  }

  async create(dto: CreateDocumentDto, userId: string) {
    const number = await this.generateNumber(dto.type);
    const doc = await this.prisma.document.create({
      data: { ...dto, number, createdById: userId, tags: dto.tags || [] },
      include: this.docInclude,
    });
    await this.logActivity(doc.id, userId, 'CREATED');
    return doc;
  }

  async update(id: string, dto: UpdateDocumentDto, userId: string, userRole: string) {
    const doc = await this.findOne(id);
    if (userRole !== 'ADMIN' && doc.createdById !== userId) {
      throw new ForbiddenException('Нет доступа к редактированию документа');
    }
    const updated = await this.prisma.document.update({
      where: { id },
      data: dto,
      include: this.docInclude,
    });
    await this.logActivity(id, userId, 'UPDATED');
    return updated;
  }

  // ─── Submit for review (DRAFT/REJECTED/NEEDS_REVISION → REVIEW) ─────────────
  async submitForReview(id: string, approverIds: string[], userId: string) {
    const doc = await this.findOne(id);

    if (!['DRAFT', 'REJECTED', 'NEEDS_REVISION'].includes(doc.status)) {
      throw new BadRequestException(
        'Отправить на согласование можно только документ в статусе "Черновик", "Отклонён" или "На доработке"',
      );
    }
    if (doc.createdById !== userId) {
      throw new ForbiddenException('Только инициатор может отправить документ на согласование');
    }

    // Validate approvers
    const activeApprovers = await this.prisma.user.findMany({
      where: { id: { in: approverIds }, isActive: true },
      select: { id: true },
    });
    if (activeApprovers.length !== approverIds.length) {
      throw new BadRequestException('Один или несколько согласующих не найдены или неактивны');
    }

    const isResubmission = ['REJECTED', 'NEEDS_REVISION'].includes(doc.status);

    // Clear existing steps and create fresh chain
    await this.prisma.approvalStep.deleteMany({ where: { documentId: id } });

    // Initiator is auto-approved at order 0
    await this.prisma.approvalStep.create({
      data: {
        documentId: id,
        approverId: userId,
        order: 0,
        status: 'APPROVED',
        decidedAt: new Date(),
        comment: 'Инициатор документа',
      },
    });

    // All selected approvers are created as PENDING simultaneously (parallel approval)
    for (let i = 0; i < approverIds.length; i++) {
      await this.prisma.approvalStep.create({
        data: { documentId: id, approverId: approverIds[i], order: i + 1, status: 'PENDING' },
      });
    }

    await this.prisma.document.update({ where: { id }, data: { status: 'REVIEW' } });
    await this.logActivity(id, userId, 'STATUS_CHANGED', { from: doc.status, to: 'REVIEW', approverIds });

    // ── Notify each approver (excluding initiator if they somehow appear in list) ──
    const notifType = isResubmission ? 'DOCUMENT_RESUBMITTED' : 'APPROVAL_REQUIRED';
    const notifTitle = isResubmission
      ? `Документ повторно отправлен на согласование`
      : `Требуется ваше согласование`;

    await this.notifications.notifyMany(
      approverIds
        .filter((aid) => aid !== userId)
        .map((aid) => ({
          userId: aid,
          type: notifType,
          title: notifTitle,
          body: doc.title,
          documentId: id,
        })),
    );

    return this.findOne(id);
  }

  // ─── Approver decision (parallel: each approver decides independently) ────────
  async decideApproval(
    id: string,
    decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION',
    userId: string,
    comment?: string,
  ) {
    const doc = await this.findOne(id);

    if (doc.status !== 'REVIEW') {
      throw new BadRequestException('Документ не находится на согласовании');
    }

    const steps = await this.prisma.approvalStep.findMany({
      where: { documentId: id },
      orderBy: { order: 'asc' },
    });

    if (!steps.length) {
      throw new BadRequestException('Маршрут согласования не настроен для этого документа');
    }

    const myStep = steps.find((s) => s.approverId === userId);
    if (!myStep) {
      throw new ForbiddenException('Вы не являетесь согласующим по данному документу');
    }

    if (myStep.status !== 'PENDING') {
      throw new BadRequestException('Вы уже приняли решение по данному документу');
    }

    if (decision === 'NEEDS_REVISION' && !comment?.trim()) {
      throw new BadRequestException('При возврате на доработку необходимо указать причину в комментарии');
    }

    // Record the step decision
    await this.prisma.approvalStep.update({
      where: { id: myStep.id },
      data: { status: decision, comment, decidedAt: new Date() },
    });

    // Record in Approval history
    await this.prisma.approval.create({
      data: { documentId: id, userId, decision, comment },
    });

    await this.logActivity(id, userId, 'STATUS_CHANGED', {
      stepOrder: myStep.order,
      decision,
      comment,
    });

    if (decision === 'REJECTED') {
      await this.prisma.document.update({ where: { id }, data: { status: 'REJECTED' } });
      // Notify creator (don't notify if approver IS the creator)
      if (doc.createdById !== userId) {
        await this.notifications.notify({
          userId: doc.createdById,
          type: 'DOCUMENT_REJECTED',
          title: 'Документ отклонён',
          body: comment ? `${doc.title} — «${comment}»` : doc.title,
          documentId: id,
        });
      }
      return this.findOne(id);
    }

    if (decision === 'NEEDS_REVISION') {
      await this.prisma.document.update({ where: { id }, data: { status: 'NEEDS_REVISION' } });
      if (doc.createdById !== userId) {
        await this.notifications.notify({
          userId: doc.createdById,
          type: 'DOCUMENT_NEEDS_REVISION',
          title: 'Документ возвращён на доработку',
          body: comment ? `${doc.title} — «${comment}»` : doc.title,
          documentId: id,
        });
      }
      return this.findOne(id);
    }

    // Approved — check if all required approver steps (order > 0) are APPROVED
    const requiredSteps = await this.prisma.approvalStep.findMany({
      where: { documentId: id, order: { gt: 0 } },
    });
    const allApproved = requiredSteps.every((s) => s.status === 'APPROVED');

    if (allApproved) {
      await this.prisma.document.update({ where: { id }, data: { status: 'APPROVED' } });
      // Notify creator that the document is fully approved
      if (doc.createdById !== userId) {
        await this.notifications.notify({
          userId: doc.createdById,
          type: 'DOCUMENT_APPROVED',
          title: 'Документ согласован',
          body: doc.title,
          documentId: id,
        });
      }
    }

    return this.findOne(id);
  }

  // ─── Generic status change (admin/general transitions) ───────────────────────
  async changeStatus(
    id: string,
    status: DocumentStatus,
    userId: string,
    userRole: string,
    comment?: string,
  ) {
    const doc = await this.findOne(id);
    const allowed = STATUS_TRANSITIONS[doc.status] || [];

    if (!allowed.includes(status)) {
      throw new ForbiddenException(
        `Переход ${doc.status} → ${status} недопустим. ` +
        (doc.status === 'DRAFT' && status === 'REVIEW'
          ? 'Используйте "Отправить на согласование" с указанием согласующих.'
          : ''),
      );
    }

    // REVIEW → DRAFT (recall): only creator or admin
    if (doc.status === 'REVIEW' && status === 'DRAFT') {
      if (userRole !== 'ADMIN' && doc.createdById !== userId) {
        throw new ForbiddenException('Отозвать документ может только инициатор или администратор');
      }
    }

    const data: any = { status };
    if (status === DocumentStatus.SIGNED) data.signedAt = new Date();

    await this.prisma.document.update({ where: { id }, data });

    if (['APPROVED', 'REJECTED', 'SIGNED'].includes(status)) {
      await this.prisma.approval.create({
        data: { documentId: id, userId, decision: status, comment },
      });
    }

    await this.logActivity(id, userId, 'STATUS_CHANGED', { from: doc.status, to: status, comment });

    // ── Notifications for generic transitions ──
    if (status === DocumentStatus.SIGNED) {
      // Notify creator if they didn't sign it themselves
      if (doc.createdById !== userId) {
        await this.notifications.notify({
          userId: doc.createdById,
          type: 'DOCUMENT_SIGNED',
          title: 'Документ подписан',
          body: doc.title,
          documentId: id,
        });
      }
      // Notify all approvers who participated
      const approverSteps = await this.prisma.approvalStep.findMany({
        where: { documentId: id, order: { gt: 0 } },
        select: { approverId: true },
      });
      const approverIds = approverSteps
        .map((s) => s.approverId)
        .filter((aid) => aid !== userId && aid !== doc.createdById);
      await this.notifications.notifyMany(
        approverIds.map((aid) => ({
          userId: aid,
          type: 'DOCUMENT_SIGNED',
          title: 'Документ подписан',
          body: doc.title,
          documentId: id,
        })),
      );
    }

    return this.findOne(id);
  }

  async remove(id: string, userId: string, userRole: string) {
    const doc = await this.findOne(id);
    if (userRole !== 'ADMIN' && doc.createdById !== userId) {
      throw new ForbiddenException('Нет доступа');
    }
    if (doc.status === DocumentStatus.SIGNED) {
      throw new ForbiddenException('Подписанный документ нельзя удалить');
    }
    await this.prisma.document.delete({ where: { id } });
    return { message: 'Документ удалён' };
  }

  private async generateNumber(type: string): Promise<string> {
    const prefixes: Record<string, string> = {
      CONTRACT: 'ДОГ', INVOICE: 'СЧФ', ACT: 'АКТ',
      SPECIFICATION: 'СПЦ', LETTER: 'ПИС', ORDER: 'ПРК', OTHER: 'ДОК',
    };
    const prefix = prefixes[type] || 'ДОК';
    const year = new Date().getFullYear();
    const count = await this.prisma.document.count({ where: { type: type as any } });
    return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`;
  }

  private async logActivity(documentId: string, userId: string, action: string, details?: any) {
    await this.prisma.activityLog.create({ data: { documentId, userId, action, details } });
  }
}
