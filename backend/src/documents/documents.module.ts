import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { DocumentsPublicController } from './documents-public.controller';
import { StampService } from './stamp.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [NotificationsModule, StorageModule],
  providers: [DocumentsService, StampService],
  controllers: [DocumentsController, DocumentsPublicController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
