import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.configService.get<number>('SMTP_PORT') ?? 587,
        secure: (this.configService.get<number>('SMTP_PORT') ?? 587) === 465,
        auth: {
          user: this.configService.get<string>('SMTP_USER'),
          pass: this.configService.get<string>('SMTP_PASS'),
        },
      });
      this.logger.log(`SMTP configured → ${host}`);
    } else {
      this.logger.warn('SMTP_HOST not set — running in dev mode (emails logged, not sent)');
    }
  }

  private get isDev(): boolean {
    return this.transporter === null;
  }

  private get frontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private get fromAddress(): string {
    return this.configService.get<string>('SMTP_FROM') || 'StemAcademia <noreply@stemacademia.ru>';
  }

  // ─── Templates ──────────────────────────────────────────────────────────────

  private wrapHtml(title: string, body: string): string {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

          <!-- Logo / header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#3b82f6;border-radius:14px;width:52px;height:52px;text-align:center;vertical-align:middle;">
                    <span style="font-size:26px;line-height:52px;">📄</span>
                  </td>
                </tr>
              </table>
              <div style="color:#f8fafc;font-size:20px;font-weight:700;margin-top:12px;">StemAcademia</div>
              <div style="color:#94a3b8;font-size:13px;margin-top:4px;">Система электронного документооборота</div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1e293b;border-radius:16px;border:1px solid #334155;padding:36px 40px;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <div style="color:#475569;font-size:12px;">
                Это письмо отправлено автоматически, не отвечайте на него.<br>
                © 2026 StemAcademia. Все права защищены.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private verificationHtml(link: string): string {
    const body = `
      <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 8px;">Подтвердите ваш email</h1>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;">
        Вы зарегистрировались в системе StemAcademia. Для активации аккаунта подтвердите ваш email-адрес.
      </p>
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td align="center">
            <a href="${link}"
               style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;
                      font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;
                      letter-spacing:0.01em;">
              Подтвердить email
            </a>
          </td>
        </tr>
      </table>
      <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0 0 8px;">
        Или скопируйте эту ссылку в браузер:
      </p>
      <p style="background:#0f172a;border-radius:8px;padding:10px 14px;margin:0 0 24px;
                word-break:break-all;font-size:12px;color:#60a5fa;font-family:monospace;">
        ${link}
      </p>
      <p style="color:#475569;font-size:12px;line-height:1.6;margin:0;border-top:1px solid #334155;padding-top:20px;">
        Ссылка действительна <strong style="color:#64748b;">24 часа</strong>.
        Если вы не регистрировались в StemAcademia — просто проигнорируйте это письмо.
      </p>
    `;
    return this.wrapHtml('Подтверждение email — StemAcademia', body);
  }

  private passwordResetHtml(link: string): string {
    const body = `
      <h1 style="color:#f8fafc;font-size:22px;font-weight:700;margin:0 0 8px;">Сброс пароля</h1>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0 0 28px;">
        Мы получили запрос на сброс пароля для вашего аккаунта в StemAcademia.
        Нажмите на кнопку ниже, чтобы установить новый пароль.
      </p>
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
        <tr>
          <td align="center">
            <a href="${link}"
               style="display:inline-block;background:#3b82f6;color:#ffffff;text-decoration:none;
                      font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;
                      letter-spacing:0.01em;">
              Сбросить пароль
            </a>
          </td>
        </tr>
      </table>
      <p style="color:#64748b;font-size:12px;line-height:1.6;margin:0 0 8px;">
        Или скопируйте эту ссылку в браузер:
      </p>
      <p style="background:#0f172a;border-radius:8px;padding:10px 14px;margin:0 0 24px;
                word-break:break-all;font-size:12px;color:#60a5fa;font-family:monospace;">
        ${link}
      </p>
      <p style="color:#475569;font-size:12px;line-height:1.6;margin:0;border-top:1px solid #334155;padding-top:20px;">
        Ссылка действительна <strong style="color:#64748b;">1 час</strong>.
        Если вы не запрашивали сброс пароля — просто проигнорируйте это письмо,
        ваш пароль останется без изменений.
      </p>
    `;
    return this.wrapHtml('Сброс пароля — StemAcademia', body);
  }

  // ─── Send methods ────────────────────────────────────────────────────────────

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/verify-email?token=${token}`;

    if (this.isDev) {
      this.logger.log(`[DEV EMAIL] Verification for <${email}>`);
      this.logger.log(`[DEV EMAIL] Link: ${link}`);
      return;
    }

    await this.transporter!.sendMail({
      from: this.fromAddress,
      to: email,
      subject: 'Подтвердите email — StemAcademia',
      html: this.verificationHtml(link),
      text: `Подтвердите ваш email по ссылке: ${link}\n\nСсылка действительна 24 часа.`,
    });

    this.logger.log(`Verification email sent to <${email}>`);
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const link = `${this.frontendUrl}/reset-password?token=${token}`;

    if (this.isDev) {
      this.logger.log(`[DEV EMAIL] Password reset for <${email}>`);
      this.logger.log(`[DEV EMAIL] Link: ${link}`);
      return;
    }

    await this.transporter!.sendMail({
      from: this.fromAddress,
      to: email,
      subject: 'Сброс пароля — StemAcademia',
      html: this.passwordResetHtml(link),
      text: `Сбросьте пароль по ссылке: ${link}\n\nСсылка действительна 1 час.`,
    });

    this.logger.log(`Password reset email sent to <${email}>`);
  }
}
