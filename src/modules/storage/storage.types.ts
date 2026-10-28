export const FILE_STORAGE = Symbol('FILE_STORAGE');

export const EVIDENCE_UPLOAD_POLICY = {
  maxSizeBytes: 5 * 1024 * 1024,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export interface StoredFile {
  key: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

/** Local adapter in development, object storage adapter on deployment. */
export interface FileStorage {
  save(file: {
    bytes: Uint8Array;
    mimeType: string;
    originalName: string;
  }): Promise<StoredFile>;
  remove(key: string): Promise<void>;
}
