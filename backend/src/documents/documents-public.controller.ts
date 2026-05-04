import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';

@ApiTags('Публичная верификация')
@Controller('verify')
export class DocumentsPublicController {
  constructor(private documentsService: DocumentsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Публичная проверка документа без авторизации' })
  verify(@Param('id') id: string) {
    return this.documentsService.findPublicVerify(id);
  }
}
