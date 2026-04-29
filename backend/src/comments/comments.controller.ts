import { Controller, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class CreateCommentDto {
  @IsString()
  text: string;
}

@ApiTags('Комментарии')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('documents/:documentId/comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Добавить комментарий' })
  create(@Param('documentId') documentId: string, @Body() body: CreateCommentDto, @Request() req) {
    return this.commentsService.create(documentId, body.text, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить комментарий' })
  remove(@Param('id') id: string, @Request() req) {
    return this.commentsService.remove(id, req.user.id, req.user.role);
  }
}
