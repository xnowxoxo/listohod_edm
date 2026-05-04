import { Injectable, UnauthorizedException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const verificationToken = randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiresAt: expiresAt,
      },
    });

    // Пытаемся отправить письмо, но не блокируем регистрацию при ошибке SMTP
    const isDev = !this.configService.get<string>('SMTP_HOST');
    let emailSent = false;

    if (!isDev) {
      try {
        await this.emailService.sendVerificationEmail(dto.email, verificationToken);
        emailSent = true;
      } catch (err: any) {
        this.logger.error(`SMTP error for ${dto.email}: ${err?.message ?? err}`);
        // emailSent остаётся false — вернём токен напрямую, чтобы пользователь мог подтвердить без письма
      }
    }

    // Токен возвращается:
    //   - в dev-режиме (SMTP не настроен)
    //   - в production если SMTP не смог отправить письмо
    const returnToken = isDev || !emailSent;

    return {
      message: emailSent
        ? 'Регистрация прошла успешно. Проверьте email для подтверждения аккаунта.'
        : 'Регистрация прошла успешно. Письмо не удалось отправить — подтвердите аккаунт по ссылке ниже.',
      ...(returnToken ? { devVerificationToken: verificationToken } : {}),
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: dto.token,
        emailVerificationTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Ссылка для подтверждения недействительна или истекла');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
    });

    return { message: 'Email успешно подтверждён. Теперь вы можете войти в систему.' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);

    // Always return the same message to not expose which emails are registered
    if (!user || !user.isActive) {
      return {
        message: 'Если такой email зарегистрирован, вы получите письмо со ссылкой для сброса пароля.',
      };
    }

    const resetToken = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetTokenExpiresAt: expiresAt,
      },
    });

    await this.emailService.sendPasswordResetEmail(dto.email, resetToken);

    const isDev = !this.configService.get<string>('SMTP_HOST');
    return {
      message: 'Если такой email зарегистрирован, вы получите письмо со ссылкой для сброса пароля.',
      ...(isDev ? { devResetToken: resetToken } : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Ссылка для сброса пароля недействительна или истекла');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return { message: 'Пароль успешно изменён. Теперь вы можете войти в систему.' };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email не подтверждён. Проверьте почту и перейдите по ссылке из письма.');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    return {
      accessToken: token,
      user: this.usersService.sanitize(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    return this.usersService.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        position: dto.position,
        department: dto.department,
      },
    });
    return this.usersService.sanitize(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Новый пароль и подтверждение не совпадают');
    }

    const user = await this.usersService.findById(userId);
    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Неверный текущий пароль');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { message: 'Пароль успешно изменён' };
  }
}
