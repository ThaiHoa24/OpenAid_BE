import { Injectable } from '@nestjs/common';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';
import type { FileStorage, StoredFile } from './storage.types.js';

@Injectable()
export class StorageService implements FileStorage {
  async save(_file: {
    bytes: Uint8Array;
    mimeType: string;
    originalName: string;
  }): Promise<StoredFile> {
    return featureNotImplemented(
      'FR25: validate image bytes/size and implement local or object storage',
    );
  }

  async remove(_key: string): Promise<void> {
    return featureNotImplemented('File storage deletion');
  }
}
