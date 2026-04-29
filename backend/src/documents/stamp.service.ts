import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fontkit from '@pdf-lib/fontkit';
import * as QRCode from 'qrcode';
import { existsSync, readFileSync } from 'fs';

const FONT_PATHS_REGULAR = [
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  '/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
];
const FONT_PATHS_BOLD = [
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  '/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf',
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
];

const ALLOWED_STATUSES = ['APPROVED', 'SIGNED', 'ARCHIVED'];

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик', REVIEW: 'На рассмотрении', APPROVED: 'Согласован',
  SIGNED: 'Подписан', REJECTED: 'Отклонён', ARCHIVED: 'Архив',
};
const STEP_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает', APPROVED: 'Согласован', REJECTED: 'Отклонён', NEEDS_REVISION: 'На доработке',
};

@Injectable()
export class StampService {
  private loadFont(paths: string[]): Buffer | null {
    for (const p of paths) {
      if (existsSync(p)) return readFileSync(p);
    }
    return null;
  }

  private fmtDT(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow',
      });
    } catch { return dateStr; }
  }

  private fmtD(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU', {
        day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Moscow',
      });
    } catch { return dateStr; }
  }

  async generateFinalPdf(doc: any, pdfBuffer: Buffer): Promise<Buffer> {
    if (!ALLOWED_STATUSES.includes(doc.status)) {
      throw new BadRequestException(
        `Итоговый документ доступен только после согласования. Текущий статус: ${STATUS_LABELS[doc.status] || doc.status}`,
      );
    }

    const originalPdf = await PDFDocument.load(pdfBuffer);
    const stampDoc = await this.buildStampPage(doc);

    const finalPdf = await PDFDocument.create();
    const origPages = await finalPdf.copyPages(originalPdf, originalPdf.getPageIndices());
    origPages.forEach((p) => finalPdf.addPage(p));
    const [stampPage] = await finalPdf.copyPages(stampDoc, [0]);
    finalPdf.addPage(stampPage);

    finalPdf.setTitle(`${doc.number} — Согласован`);
    finalPdf.setAuthor('StemAcademia EDM');
    finalPdf.setCreator('StemAcademia EDM');

    return Buffer.from(await finalPdf.save());
  }

  private async buildStampPage(doc: any): Promise<PDFDocument> {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit as any);

    const regularData = this.loadFont(FONT_PATHS_REGULAR);
    const boldData = this.loadFont(FONT_PATHS_BOLD);
    let font: any, fontBold: any;

    if (regularData) {
      font = await pdf.embedFont(regularData, { subset: true });
      fontBold = boldData ? await pdf.embedFont(boldData, { subset: true }) : font;
    } else {
      font = await pdf.embedFont(StandardFonts.Helvetica);
      fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    }

    const PAGE_W = 595.28;
    const PAGE_H = 841.89;
    const M = 50;
    const CW = PAGE_W - M * 2;
    const page = pdf.addPage([PAGE_W, PAGE_H]);

    // ── Header ───────────────────────────────────────────────────
    page.drawRectangle({ x: 0, y: PAGE_H - 62, width: PAGE_W, height: 62, color: rgb(0.09, 0.26, 0.49) });
    page.drawText('ЛИСТ СОГЛАСОВАНИЯ', { x: M, y: PAGE_H - 36, size: 17, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('StemAcademia EDM · Система электронного документооборота', {
      x: M, y: PAGE_H - 52, size: 8, font, color: rgb(0.65, 0.82, 1),
    });

    // ── Document info ─────────────────────────────────────────────
    let y = PAGE_H - 62 - 24;
    const lbl = (t: string, x: number) =>
      page.drawText(t, { x, y, size: 7.5, font, color: rgb(0.52, 0.52, 0.52) });
    const val = (t: string, x: number, bold = false) => {
      const f = bold ? fontBold : font;
      page.drawText(t || '—', { x, y: y - 14, size: 10, font: f, color: rgb(0.1, 0.1, 0.1) });
    };

    lbl('Номер документа', M);
    lbl('Статус', M + 230);
    val(doc.number, M, true);
    const sColor = ['APPROVED', 'SIGNED'].includes(doc.status) ? rgb(0.07, 0.5, 0.18)
      : doc.status === 'REJECTED' ? rgb(0.7, 0.1, 0.1) : rgb(0.3, 0.3, 0.3);
    page.drawText(STATUS_LABELS[doc.status] || doc.status, {
      x: M + 230, y: y - 14, size: 10, font: fontBold, color: sColor,
    });
    y -= 40;

    lbl('Название документа', M);
    const title = doc.title.length > 85 ? doc.title.slice(0, 85) + '…' : doc.title;
    page.drawText(title, { x: M, y: y - 14, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= 40;

    const authorName = doc.createdBy
      ? `${doc.createdBy.lastName || ''} ${doc.createdBy.firstName || ''}`.trim() : '—';
    lbl('Автор / инициатор', M);
    if (doc.counterparty) lbl('Контрагент', M + 230);
    page.drawText(authorName, { x: M, y: y - 14, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    if (doc.counterparty) {
      page.drawText(doc.counterparty, { x: M + 230, y: y - 14, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    }
    y -= 40;

    lbl('Дата создания', M);
    if (doc.signedAt) lbl('Дата подписания', M + 230);
    page.drawText(this.fmtDT(doc.createdAt), { x: M, y: y - 14, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    if (doc.signedAt) {
      page.drawText(this.fmtD(doc.signedAt), { x: M + 230, y: y - 14, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    }
    y -= 34;

    // ── Divider ───────────────────────────────────────────────────
    page.drawLine({ start: { x: M, y }, end: { x: PAGE_W - M, y }, thickness: 0.6, color: rgb(0.78, 0.78, 0.78) });
    y -= 18;

    // ── Approval chain title ───────────────────────────────────────
    const steps: any[] = doc.approvalSteps || [];
    const hasSteps = steps.length > 0;

    page.drawText(hasSteps ? 'Маршрут согласования' : 'Решения по документу', {
      x: M, y, size: 12, font: fontBold, color: rgb(0.09, 0.26, 0.49),
    });
    y -= 22;

    if (hasSteps) {
      // ── Approval Steps table ────────────────────────────────────
      const COL_N    = M;
      const COL_NAME = M + 24;
      const COL_DEC  = M + 295;
      const COL_DATE = M + 400;

      // Table header
      page.drawRectangle({ x: M - 5, y: y - 16, width: CW + 10, height: 22, color: rgb(0.91, 0.95, 1) });
      const th = (t: string, x: number) =>
        page.drawText(t, { x, y: y - 10, size: 7.5, font: fontBold, color: rgb(0.25, 0.35, 0.55) });
      th('№', COL_N);
      th('Согласующий', COL_NAME);
      th('Решение', COL_DEC);
      th('Дата и время', COL_DATE);
      y -= 22;

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (y < 140) break;
        const isInitiator = step.order === 0;
        const ROW_H = step.comment ? 32 : 22;

        if (i % 2 === 0) {
          page.drawRectangle({
            x: M - 5, y: y - ROW_H + 4, width: CW + 10, height: ROW_H,
            color: rgb(0.975, 0.975, 0.975),
          });
        }

        const fullName = step.approver
          ? `${step.approver.lastName || ''} ${step.approver.firstName || ''}`.trim() : '—';
        // All steps show their real status label; initiator is always APPROVED → "Согласован"
        const decLabel = STEP_STATUS_LABELS[step.status] || step.status;
        const decColor = step.status === 'REJECTED' ? rgb(0.68, 0.1, 0.1)
          : step.status === 'APPROVED' ? rgb(0.07, 0.5, 0.18)
          : rgb(0.55, 0.55, 0.55);

        // Circle: "И" (green) for initiator, number for approvers
        const circleColor = isInitiator ? rgb(0.18, 0.48, 0.22)
          : step.status === 'REJECTED' ? rgb(0.68, 0.1, 0.1)
          : step.status === 'APPROVED' ? rgb(0.07, 0.5, 0.18)
          : rgb(0.09, 0.26, 0.49);
        page.drawCircle({ x: COL_N + 7, y: y - 10, size: 8, color: circleColor });
        const circleLabel = isInitiator ? 'И' : String(step.order);
        page.drawText(circleLabel, { x: COL_N + (circleLabel.length > 1 ? 3.5 : 5.5), y: y - 13, size: 7, font: fontBold, color: rgb(1, 1, 1) });

        // Name: add "(инициатор)" hint in muted style after the name
        page.drawText(fullName, { x: COL_NAME, y: y - 13, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
        if (isInitiator) {
          const nameWidth = font.widthOfTextAtSize(fullName, 9);
          page.drawText('(инициатор)', {
            x: COL_NAME + nameWidth + 4, y: y - 13, size: 7.5, font, color: rgb(0.55, 0.55, 0.55),
          });
        }
        page.drawText(decLabel, { x: COL_DEC, y: y - 13, size: 9, font: fontBold, color: decColor });

        if (step.decidedAt) {
          page.drawText(this.fmtDT(step.decidedAt), {
            x: COL_DATE, y: y - 13, size: 7.5, font, color: rgb(0.42, 0.42, 0.42),
          });
        } else {
          page.drawText('—', { x: COL_DATE, y: y - 13, size: 8, font, color: rgb(0.7, 0.7, 0.7) });
        }

        if (step.comment) {
          page.drawText(`«${step.comment}»`, {
            x: COL_NAME + 4, y: y - 25, size: 7.5, font, color: rgb(0.52, 0.52, 0.52),
          });
        }
        y -= ROW_H;
      }
    } else {
      // Legacy: use approvals table
      const approvals: any[] = doc.approvals || [];
      if (approvals.length === 0) {
        page.drawText('Записи о согласовании отсутствуют', {
          x: M, y, size: 10, font, color: rgb(0.55, 0.55, 0.55),
        });
        y -= 20;
      } else {
        const COL_NAME = M;
        const COL_DEC  = M + 295;
        const COL_DATE = M + 400;

        page.drawRectangle({ x: M - 5, y: y - 16, width: CW + 10, height: 22, color: rgb(0.91, 0.95, 1) });
        const th = (t: string, x: number) =>
          page.drawText(t, { x, y: y - 10, size: 7.5, font: fontBold, color: rgb(0.25, 0.35, 0.55) });
        th('ФИО', COL_NAME); th('Решение', COL_DEC); th('Дата', COL_DATE);
        y -= 22;

        for (let i = 0; i < approvals.length; i++) {
          const a = approvals[i];
          if (y < 140) break;
          const ROW_H = a.comment ? 30 : 22;
          if (i % 2 === 0) {
            page.drawRectangle({ x: M - 5, y: y - ROW_H + 4, width: CW + 10, height: ROW_H, color: rgb(0.975, 0.975, 0.975) });
          }
          const name = a.user ? `${a.user.lastName || ''} ${a.user.firstName || ''}`.trim() : '—';
          const decColor = a.decision === 'REJECTED' ? rgb(0.68, 0.1, 0.1)
            : ['APPROVED', 'SIGNED'].includes(a.decision) ? rgb(0.07, 0.5, 0.18) : rgb(0.35, 0.35, 0.35);
          page.drawText(name, { x: COL_NAME, y: y - 13, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
          page.drawText(a.decision, { x: COL_DEC, y: y - 13, size: 9, font: fontBold, color: decColor });
          page.drawText(this.fmtDT(a.createdAt), { x: COL_DATE, y: y - 13, size: 8, font, color: rgb(0.42, 0.42, 0.42) });
          if (a.comment) {
            page.drawText(`«${a.comment}»`, { x: COL_NAME + 4, y: y - 24, size: 7.5, font, color: rgb(0.52, 0.52, 0.52) });
          }
          y -= ROW_H;
        }
      }
    }

    // ── QR Code ───────────────────────────────────────────────────
    const QR_S = 88;
    const QR_X = PAGE_W - M - QR_S;
    const QR_Y = 72;
    try {
      const qrBuf = await QRCode.toBuffer(
        [`Номер: ${doc.number}`, `Статус: ${STATUS_LABELS[doc.status] || doc.status}`, `Дата: ${this.fmtDT(new Date().toISOString())}`].join('\n'),
        { width: QR_S * 3, margin: 1, errorCorrectionLevel: 'M' },
      );
      const qrImg = await pdf.embedPng(qrBuf);
      page.drawImage(qrImg, { x: QR_X, y: QR_Y, width: QR_S, height: QR_S });
      page.drawText('Идентификатор', { x: QR_X + 8, y: QR_Y - 11, size: 7, font, color: rgb(0.55, 0.55, 0.55) });
    } catch (_) { /* skip */ }

    // ── Footer ────────────────────────────────────────────────────
    page.drawLine({ start: { x: M, y: 73 }, end: { x: PAGE_W - M, y: 73 }, thickness: 0.5, color: rgb(0.78, 0.78, 0.78) });
    page.drawText(
      `Документ согласован в системе StemAcademia · Сформировано: ${this.fmtDT(new Date().toISOString())}`,
      { x: M, y: 55, size: 8, font, color: rgb(0.5, 0.5, 0.5) },
    );
    page.drawText(`Лист согласования · ${doc.number}`, { x: M, y: 42, size: 7, font, color: rgb(0.65, 0.65, 0.65) });

    return pdf;
  }
}
