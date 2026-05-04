import {
  Controller, Post, Patch, Delete, Get, Param, Res, Request,
  UploadedFile, UseGuards, UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { AttachmentsService } from './attachments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Вложения')
@Controller('documents/:documentId/attachments')
export class AttachmentsController {
  constructor(private attachmentsService: AttachmentsService) {}

  @Post()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Загрузить файл' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Файл до 10 МБ' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Файл не передан');
    return this.attachmentsService.upload(documentId, file);
  }

  @Patch(':id/replace')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Заменить файл вложения' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Новый файл' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  replace(
    @Param('documentId') documentId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException('Файл не передан');
    return this.attachmentsService.replace(documentId, id, file, req.user.sub);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Скачать вложение' })
  async download(
    @Param('documentId') documentId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { att, buffer } = await this.attachmentsService.getBuffer(id);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(att.originalName)}`,
    );
    res.setHeader('Content-Type', att.mimeType);
    res.send(buffer);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Удалить вложение' })
  remove(@Param('documentId') documentId: string, @Param('id') id: string) {
    return this.attachmentsService.remove(id);
  }
}
