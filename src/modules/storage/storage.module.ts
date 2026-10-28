import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { FILE_STORAGE } from './storage.types.js';

@Module({
  providers: [
    StorageService,
    { provide: FILE_STORAGE, useExisting: StorageService },
  ],
  exports: [FILE_STORAGE],
})
export class StorageModule {}
