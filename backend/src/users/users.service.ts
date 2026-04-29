import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { createdDocuments: true } } },
    });
    return users.map(this.sanitize);
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email уже используется');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        role: dto.role,
        position: dto.position,
        department: dto.department,
      },
    });
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
      delete data.password;
    }
    const user = await this.prisma.user.update({ where: { id }, data });
    return this.sanitize(user);
  }

  async deactivate(id: string) {
    await this.findById(id);
    await this.prisma.user.update({ where: { id }, data: { isActive: false } });
    return { message: 'Пользователь деактивирован' };
  }

  async hardDelete(id: string, requesterId: string) {
    if (id === requesterId) {
      throw new ForbiddenException('Нельзя удалить собственную учётную запись');
    }

    await this.findById(id);

    const docCount = await this.prisma.document.count({ where: { createdById: id } });
    if (docCount > 0) {
      throw new BadRequestException(
        `Невозможно удалить пользователя: он является автором ${docCount} документа(ов) в системе. ` +
        `Удаление нарушит историю и аудит документов. Оставьте пользователя деактивированным.`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.document.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      }),
      this.prisma.approvalStep.deleteMany({ where: { approverId: id } }),
      this.prisma.approval.deleteMany({ where: { userId: id } }),
      this.prisma.comment.deleteMany({ where: { authorId: id } }),
      this.prisma.activityLog.deleteMany({ where: { userId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    return { message: 'Пользователь удалён' };
  }

  sanitize(user: any) {
    const {
      passwordHash,
      emailVerificationToken,
      emailVerificationTokenExpiresAt,
      passwordResetToken,
      passwordResetTokenExpiresAt,
      ...rest
    } = user;
    return rest;
  }
}
