import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StorageService } from './storage.service.js';

describe('StorageService (KAN-18 Shared Upload Foundation)', () => {
  let service: StorageService;
  const createdKeys: string[] = [];

  beforeEach(() => {
    service = new StorageService();
  });

  afterEach(async () => {
    for (const key of createdKeys) {
      try {
        await service.remove(key);
      } catch {
        // Ignore errors during cleanup
      }
    }
  });

  it('successfully saves a valid JPEG image', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const stored = await service.save({
      bytes,
      mimeType: 'image/jpeg',
      originalName: 'relief-photo.jpg',
    });

    createdKeys.push(stored.key);

    expect(stored.key).toMatch(/^[a-f0-9]{32}\.jpg$/);
    expect(stored.url).toBe(`/uploads/${stored.key}`);
    expect(stored.mimeType).toBe('image/jpeg');
    expect(stored.sizeBytes).toBe(bytes.length);

    // Verify file content can be retrieved
    const fetched = await service.getFile(stored.key);
    expect(fetched.mimeType).toBe('image/jpeg');
    expect(fetched.buffer.length).toBe(bytes.length);
  });

  it('successfully saves a valid PNG and WebP image', async () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    const storedPng = await service.save({
      bytes: pngBytes,
      mimeType: 'image/png',
      originalName: 'test.png',
    });
    createdKeys.push(storedPng.key);
    expect(storedPng.key.endsWith('.png')).toBe(true);

    const webpBytes = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
    const storedWebp = await service.save({
      bytes: webpBytes,
      mimeType: 'image/webp',
      originalName: 'test.webp',
    });
    createdKeys.push(storedWebp.key);
    expect(storedWebp.key.endsWith('.webp')).toBe(true);
  });

  it('rejects file when content is empty', async () => {
    await expect(
      service.save({
        bytes: new Uint8Array(0),
        mimeType: 'image/jpeg',
        originalName: 'empty.jpg',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects unsupported file formats (e.g. application/pdf, text/plain)', async () => {
    const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    await expect(
      service.save({
        bytes,
        mimeType: 'application/pdf',
        originalName: 'document.pdf',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects file exceeding 5MB limit', async () => {
    const oversizedBytes = new Uint8Array(5 * 1024 * 1024 + 1);
    await expect(
      service.save({
        bytes: oversizedBytes,
        mimeType: 'image/jpeg',
        originalName: 'large.jpg',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException when fetching a non-existent file key', async () => {
    await expect(service.getFile('non-existent-key-12345.jpg')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('successfully removes an existing file', async () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const stored = await service.save({
      bytes,
      mimeType: 'image/jpeg',
      originalName: 'to-delete.jpg',
    });

    await service.remove(stored.key);
    await expect(service.getFile(stored.key)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('runs cleanupOrphans safely without errors', async () => {
    const mockPrisma = {
      evidence: { findMany: vi.fn().mockResolvedValue([]) },
      user: { findMany: vi.fn().mockResolvedValue([]) },
      donation: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;

    const result = await service.cleanupOrphans(mockPrisma, 0); // 0ms threshold
    expect(result).toHaveProperty('scannedCount');
    expect(result).toHaveProperty('deletedCount');
  });
});
