import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../dist/app.module.js';
import { configureApplication } from '../dist/bootstrap.js';
import { PrismaService } from '../dist/database/prisma.service.js';
import { SystemRole } from '@prisma/client';

describe('Backend foundation smoke tests (no database writes)', () => {
  let app: INestApplication;
  let token: string;
  const user = {
    id: '10000000-0000-4000-8000-000000000099',
    email: 'smoke@example.test',
    fullName: 'Smoke User',
    systemRole: SystemRole.USER,
    isActive: true,
  };
  const database = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id?: string } }) =>
        where.id === user.id ? user : null,
      ),
      create: vi.fn(),
    },
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL ??=
      'postgresql://smoke:smoke@localhost:5432/unused';
    process.env.JWT_SECRET ??= 'synthetic-smoke-test-secret';
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(database)
      .compile();
    app = fixture.createNestApplication();
    app.useLogger(false);
    configureApplication(app);
    await app.init();
    token = app
      .get(JwtService)
      .sign({ sub: user.id, email: user.email, systemRole: SystemRole.USER });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('boots with the same response envelope as main.ts', async () => {
    const response = await request(app.getHttpServer()).get('/api/health/live');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: { status: 'ok' },
    });
  });

  it('publishes public and protected scaffold contracts in Swagger', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json');
    expect(response.status).toBe(200);
    const paths = response.body.paths;
    expect(paths['/api/events'].get.security ?? []).toEqual([]);
    expect(paths['/api/events'].post.security).toEqual([{ 'JWT-auth': [] }]);
    expect(
      paths['/api/transparency/track/{trackingId}'].get.security ?? [],
    ).toEqual([]);
    expect(paths['/api/trips'].post.responses).toHaveProperty('501');
  });

  it('marks public Event use cases as unimplemented', async () => {
    const response = await request(app.getHttpServer()).get('/api/events');
    expect(response.status).toBe(501);
    expect(response.body).toMatchObject({ success: false, statusCode: 501 });
  });

  it('does not expose raw domain data through the public tracking scaffold', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/transparency/track/DON-2026-TEST',
    );
    expect(response.status).toBe(501);
    expect(response.body).not.toHaveProperty('data');
  });

  it.each([
    '/api/donations',
    '/api/batches',
    '/api/trips',
    '/api/distribution/records',
  ])('requires authentication by default for POST %s', async (path) => {
    const response = await request(app.getHttpServer()).post(path).send({});
    expect(response.status).toBe(401);
  });

  it('resolves the authenticated donor before entering the My Donations scaffold', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/donations/my')
      .set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(501);
    expect(database.user.findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
    });
  });

  it('uses the database system role to protect Admin routes', async () => {
    const forgedRoleToken = app
      .get(JwtService)
      .sign({ sub: user.id, systemRole: SystemRole.ADMIN });
    const response = await request(app.getHttpServer())
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${forgedRoleToken}`);
    expect(response.status).toBe(403);
  });

  it('rejects over-posted account permissions before calling account creation', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: 'new@example.test',
        fullName: 'New User',
        password: 'SyntheticPassword123!',
        systemRole: SystemRole.ADMIN,
      });
    expect(response.status).toBe(400);
    expect(database.user.create).not.toHaveBeenCalled();
  });

  it('validates transformed pagination with the production validation pipe', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events?take=101',
    );
    expect(response.status).toBe(400);
  });
});
