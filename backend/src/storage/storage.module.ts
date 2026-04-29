import { Module } from '@nestjs/common';
import { STORAGE_SERVICE } from './storage.interface';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';

@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useFactory: () => {
        const driver = process.env.STORAGE_DRIVER ?? 'local';
        return driver === 's3' ? new S3StorageService() : new LocalStorageService();
      },
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
