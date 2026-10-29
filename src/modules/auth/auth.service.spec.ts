import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { AuthService } from './auth.service.js';
import type { PrismaService } from '../../database/prisma.service.js';

describe('Registration and PostgreSQL email uniqueness', () => {
  const database = {
    user: { findFirst: vi.fn(), create: vi.fn() },
  };
  const jwt = { sign: vi.fn(() => 'test-token') };
  const dto = {
    email: 'Donor@Example.test',
    fullName: 'Donor',
    password: 'SyntheticPassword123!',
  };
  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();
    jwt.sign.mockReturnValue('test-token');
    database.user.findFirst.mockResolvedValue(null);
    service = new AuthService(
      database as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
  });

  it('checks duplicate emails without case sensitivity before creating an account', async () => {
    database.user.findFirst.mockResolvedValue({ id: 'existing-user' });
    await expect(service.register(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(database.user.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: 'donor@example.test', mode: 'insensitive' } },
    });
    expect(database.user.create).not.toHaveBeenCalled();
  });

  it('stores a normalized email and a password hash', async () => {
    database.user.create.mockResolvedValue({
      id: 'test-user',
      email: 'donor@example.test',
      systemRole: 'USER',
    });
    await service.register(dto);
    expect(database.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'donor@example.test' }),
      }),
    );
    const { passwordHash } = database.user.create.mock.calls[0][0].data;
    expect(passwordHash).not.toBe(dto.password);
    expect(passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('returns a client error if a concurrent signup wins the unique index race', async () => {
    database.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    await expect(service.register(dto)).rejects.toThrow(
      'Email is already registered',
    );
    expect(jwt.sign).not.toHaveBeenCalled();
  });

  it('propagates unrelated database failures', async () => {
    const failure = new Error('Database unavailable');
    database.user.create.mockRejectedValue(failure);
    await expect(service.register(dto)).rejects.toBe(failure);
  });
});
