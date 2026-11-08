import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  EVIDENCE_UPLOAD_POLICY,
  type FileStorage,
  type StoredFile,
} from './storage.types.js';

@Injectable()
export class StorageService implements FileStorage {
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch {
      // Directory already exists or cannot be created
    }
  }

  /**
   * KAN-18 / FR25: Validate định dạng, dung lượng và lưu trữ file cục bộ
   */
  async save(file: {
    bytes: Uint8Array;
    mimeType: string;
    originalName: string;
  }): Promise<StoredFile> {
    if (!file.bytes || file.bytes.length === 0) {
      throw new BadRequestException('File content cannot be empty');
    }

    // 1. Validate MIME type theo chính sách
    const isMimeAllowed = (
      EVIDENCE_UPLOAD_POLICY.allowedMimeTypes as readonly string[]
    ).includes(file.mimeType.toLowerCase());
    if (!isMimeAllowed) {
      throw new BadRequestException(
        `Invalid file type '${file.mimeType}'. Allowed formats: ${EVIDENCE_UPLOAD_POLICY.allowedMimeTypes.join(', ')}`,
      );
    }

    // 2. Validate kích thước file tối đa (5MB)
    if (file.bytes.length > EVIDENCE_UPLOAD_POLICY.maxSizeBytes) {
      throw new BadRequestException(
        `File size (${(file.bytes.length / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of 5MB`,
      );
    }

    await this.ensureUploadDir();

    // 3. Sinh key ngẫu nhiên an toàn, không tuần tự và tránh trùng lặp
    const ext = this.getExtensionFromMimeType(file.mimeType, file.originalName);
    const randomHex = crypto.randomBytes(16).toString('hex');
    const key = `${randomHex}${ext}`;
    const filePath = path.join(this.uploadDir, key);

    await fs.writeFile(filePath, file.bytes);

    return {
      key,
      url: `/uploads/${key}`,
      mimeType: file.mimeType.toLowerCase(),
      sizeBytes: file.bytes.length,
    };
  }

  /**
   * Xóa file an toàn khỏi vùng lưu trữ
   */
  async remove(key: string): Promise<void> {
    const safeKey = path.basename(key);
    const filePath = path.join(this.uploadDir, safeKey);
    try {
      await fs.unlink(filePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  /**
   * Đọc file để phục vụ tải về / hiển thị
   */
  async getFile(key: string): Promise<{ buffer: Buffer; mimeType: string }> {
    const safeKey = path.basename(key);
    const filePath = path.join(this.uploadDir, safeKey);

    try {
      const buffer = await fs.readFile(filePath);
      const mimeType = this.getMimeTypeFromExtension(safeKey);
      return { buffer, mimeType };
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new NotFoundException('File not found');
      }
      throw err;
    }
  }

  private getExtensionFromMimeType(
    mimeType: string,
    originalName: string,
  ): string {
    const lower = mimeType.toLowerCase();
    if (lower === 'image/jpeg') return '.jpg';
    if (lower === 'image/png') return '.png';
    if (lower === 'image/webp') return '.webp';
    return path.extname(originalName) || '.bin';
  }

  private getMimeTypeFromExtension(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    return 'application/octet-stream';
  }
}
