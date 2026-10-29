import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import request from 'supertest';

// No fallback to DATABASE_URL: this suite writes only to an explicit test database.
const testUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!testUrl)(
  'PostgreSQL UUID schema and account API compatibility',
  () => {
    const runId = randomUUID();
    const emails = [
      `api-${runId}@example.test`,
      `Legacy-${runId}@Example.test`,
      `race-${runId}@example.test`,
    ];
    const password = 'SyntheticPassword123!';
    let prisma: PrismaClient;
    let app: INestApplication;
    let verifiedDatabase = false;
    let token: string;
    let legacyId: string;

    beforeAll(async () => {
      const parsed = new URL(testUrl!);
      const name = decodeURIComponent(parsed.pathname.slice(1));
      if (!/^(openaid_test|openaid_sync_test_[a-f0-9]{12})$/.test(name)) {
        throw new Error(
          'TEST_DATABASE_URL must target openaid_test or an isolated openaid_sync_test_<12 hex> database',
        );
      }
      process.env.DATABASE_URL = testUrl;
      process.env.NODE_ENV = 'test';
      process.env.JWT_SECRET = 'postgres-compatibility-synthetic-secret';
      prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });
      const [database] = await prisma.$queryRaw<
        { name: string }[]
      >`SELECT current_database() AS name`;
      expect(database.name).toBe(name);
      verifiedDatabase = true;

      const { AppModule } = await import('../dist/app.module.js');
      const { configureApplication } = await import('../dist/bootstrap.js');
      const { PrismaService } =
        await import('../dist/database/prisma.service.js');
      const fixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = fixture.createNestApplication();
      app.useLogger(false);
      configureApplication(app, false);
      await app.init();
      const [applicationDatabase] = await app.get(PrismaService).$queryRaw<
        { name: string }[]
      >`SELECT current_database() AS name`;
      expect(applicationDatabase.name).toBe(name);

      const user = await prisma.user.create({
        data: {
          email: emails[1],
          fullName: 'Legacy Donor',
          passwordHash: await bcrypt.hash(password, 10),
        },
      });
      legacyId = user.id;
      token = app.get(JwtService).sign({ sub: user.id, systemRole: 'USER' });
    }, 30000);

    afterAll(async () => {
      try {
        if (verifiedDatabase)
          await prisma.user.deleteMany({ where: { email: { in: emails } } });
      } finally {
        await app?.close();
        await prisma?.$disconnect();
      }
    });

    it('registers, logs in, reads and updates a profile with database-generated UUIDs and timestamps', async () => {
      const registration = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: emails[0].toUpperCase(),
          fullName: 'API Donor',
          password,
        });
      expect(registration.status).toBe(201);
      expect(registration.body.data.user.id).toMatch(/^[a-f0-9-]{36}$/i);
      expect(registration.body.data.user.email).toBe(emails[0]);
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: emails[0].toUpperCase(), password });
      expect(login.status).toBe(200);
      const auth = `Bearer ${login.body.data.accessToken}`;
      const profile = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', auth);
      expect(profile.status).toBe(200);
      expect(profile.body.data).not.toHaveProperty('passwordHash');
      const before = await prisma.user.findUniqueOrThrow({
        where: { id: profile.body.data.id },
      });
      const update = await request(app.getHttpServer())
        .patch('/api/users/profile')
        .set('Authorization', auth)
        .send({ fullName: 'Updated Donor', phoneNumber: '0901234567' });
      expect(update.status).toBe(200);
      const after = await prisma.user.findUniqueOrThrow({
        where: { id: before.id },
      });
      expect(after.fullName).toBe('Updated Donor');
      expect(after.updatedAt.getTime()).toBeGreaterThan(
        before.updatedAt.getTime(),
      );
    });

    it('logs in existing mixed-case accounts and blocks case-variant duplicate registration', async () => {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: emails[1].toLowerCase(), password });
      expect(login.status).toBe(200);
      expect(login.body.data.user.id).toBe(legacyId);
      const duplicate = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: emails[1].toUpperCase(),
          fullName: 'Duplicate',
          password,
        });
      expect(duplicate.status).toBe(400);
    });

    it('creates only one account when case-variant signups race', async () => {
      const responses = await Promise.all(
        [emails[2], emails[2].toUpperCase()].map((email) =>
          request(app.getHttpServer())
            .post('/api/auth/register')
            .send({ email, fullName: 'Race Donor', password }),
        ),
      );
      expect(responses.map((response) => response.status).sort()).toEqual([
        201, 400,
      ]);
      expect(await prisma.user.count({ where: { email: emails[2] } })).toBe(1);
    });

    it('rejects malformed UUID subjects before querying a native UUID column', async () => {
      const invalid = app.get(JwtService).sign({ sub: 'not-a-uuid' });
      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${invalid}`);
      expect(response.status).toBe(401);
    });

    it.each([
      { fullName: null },
      { fullName: '   ' },
      { fullName: 'a'.repeat(151) },
      { phoneNumber: '1'.repeat(26) },
    ])(
      'rejects profile values incompatible with PostgreSQL constraints: %j',
      async (data) => {
        const response = await request(app.getHttpServer())
          .patch('/api/users/profile')
          .set('Authorization', `Bearer ${token}`)
          .send(data);
        expect(response.status).toBe(400);
      },
    );
  },
);
