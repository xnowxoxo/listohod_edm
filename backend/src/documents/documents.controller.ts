import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Request, Query, Res, Inject, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { StampService } from './stamp.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { SubmitForReviewDto } from './dto/submit-for-review.dto';
import { DecideApprovalDto } from './dto/decide-approval.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { STORAGE_SERVICE, IStorageService } from '../storage/storage.interface';

@ApiTags('Документы')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private documentsService: DocumentsService,
    private stampService: StampService,
    @Inject(STORAGE_SERVICE) private storage: IStorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Список документов' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'createdBy', required: false, description: 'Фильтр по ID создателя' })
  findAll(@Query() query: any) {
    return this.documentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Документ по ID' })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Get(':id/final')
  @ApiOperation({ summary: 'Скачать итоговый документ с листом согласования (PDF)' })
  async downloadFinal(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.documentsService.findOne(id);

    const pdfAtt = (doc.attachments || []).find((a: any) => a.mimeType === 'application/pdf');
    if (!pdfAtt) {
      throw new BadRequestException(
        'Документ не содержит PDF-вложения. Прикрепите PDF-файл для формирования итогового документа.',
      );
    }

    const pdfBuffer = await this.storage.download(pdfAtt.storedName);
    const buffer = await this.stampService.generateFinalPdf(doc, pdfBuffer);

    const filename = encodeURIComponent(`${doc.number}-согласован.pdf`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.send(buffer);
  }

  @Post()
  @ApiOperation({ summary: 'Создать документ' })
  create(@Body() dto: CreateDocumentDto, @Request() req) {
    return this.documentsService.create(dto, req.user.id);
  }

  @Post(':id/submit-for-review')
  @ApiOperation({ summary: 'Отправить на согласование с указанием цепочки согласующих' })
  submitForReview(
    @Param('id') id: string,
    @Body() dto: SubmitForReviewDto,
    @Request() req,
  ) {
    return this.documentsService.submitForReview(id, dto.approverIds, req.user.id);
  }

  @Post(':id/decide')
  @ApiOperation({ summary: 'Решение текущего согласующего (согласовать / отклонить)' })
  decide(
    @Param('id') id: string,
    @Body() dto: DecideApprovalDto,
    @Request() req,
  ) {
    return this.documentsService.decideApproval(id, dto.decision, req.user.id, dto.comment);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить документ' })
  update(@Param('id') id: string, @Body() dto: UpdateDocumentDto, @Request() req) {
    return this.documentsService.update(id, dto, req.user.id, req.user.role);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Изменить статус документа (общие переходы)' })
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto, @Request() req) {
    return this.documentsService.changeStatus(id, dto.status, req.user.id, req.user.role, dto.comment);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить документ' })
  remove(@Param('id') id: string, @Request() req) {
    return this.documentsService.remove(id, req.user.id, req.user.role);
  }
}
