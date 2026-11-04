import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { StorageController } from './storage.controller.js';
import { FILE_STORAGE } from './storage.types.js';

@Module({
  controllers: [StorageController],
  providers: [
    StorageService,
    { provide: FILE_STORAGE, useExisting: StorageService },
  ],
  exports: [FILE_STORAGE, StorageService],
})
export class StorageModule {}
