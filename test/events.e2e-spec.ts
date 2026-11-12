import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../dist/app.module.js';
import { configureApplication } from '../dist/bootstrap.js';
import { PrismaService } from '../dist/database/prisma.service.js';
import { EventStatus, SystemRole } from '@prisma/client';

describe('Events, Admin & Reports E2E Tests (ADM-05, ADM-06, REP-01)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const adminUser = {
    id: '00000000-0000-4000-8000-000000000001',
    email: 'admin@openaid.test',
    fullName: 'System Admin',
    systemRole: SystemRole.ADMIN,
    isActive: true,
  };

  const normalUser = {
    id: '00000000-0000-4000-8000-000000000002',
    email: 'normal@openaid.test',
    fullName: 'Normal User',
    systemRole: SystemRole.USER,
    isActive: true,
  };

  const sampleEvent: any = {
    id: '11111111-0000-4000-8000-000000000001',
    organizationId: '22222222-0000-4000-8000-000000000001',
    createdById: adminUser.id,
    title: 'Chiến dịch cứu trợ khẩn cấp miền Trung',
    description: 'Hỗ trợ đồng bào lũ lụt',
    location: 'Đà Nẵng',
    contactName: 'Ban điều phối',
    contactPhone: '0901234567',
    startDate: new Date('2026-11-10T08:00:00Z'),
    endDate: new Date('2026-11-20T18:00:00Z'),
    status: EventStatus.PUBLISHED,
    moderationReason: null,
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-01T00:00:00Z'),
    organization: {
      id: '22222222-0000-4000-8000-000000000001',
      name: 'Tổ chức Cứu trợ OpenAid',
      code: 'OPENAID',
      status: 'APPROVED',
      email: 'contact@openaid.test',
      phoneNumber: '0236123456',
    },
    volunteerRoles: [
      { id: 'vr-1', name: 'Tình nguyện viên', quantity: 10, description: '' },
    ],
    donationNeeds: [],
    inventory: [],
    batches: [],
    donations: [],
    trips: [],
    _count: {
      donations: 5,
      trips: 1,
      volunteerApplications: 3,
    },
  };

  let currentEvent = { ...sampleEvent };

  const mockPrisma = {
    user: {
      findUnique: async ({ where }: any) => {
        if (where?.id === adminUser.id) return adminUser;
        if (where?.id === normalUser.id) return normalUser;
        return null;
      },
    },
    event: {
      findUnique: async ({ where }: any) => {
        if (where?.id === currentEvent.id) return currentEvent;
        return null;
      },
      findMany: async () => [currentEvent],
      count: async () => 1,
      update: async ({ data }: any) => {
        currentEvent = {
          ...currentEvent,
          ...data,
          updatedAt: new Date(),
        };
        return currentEvent;
      },
    },
    organizationMember: {
      findUnique: async () => null,
    },
    transparencyLog: {
      create: async ({ data }: any) => ({ id: 'log-1', ...data }),
    },
    $transaction: async (cb: (tx: any) => Promise<any>) => cb(mockPrisma),
  };

  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL ??= 'postgresql://smoke:smoke@localhost:5432/unused';
    process.env.JWT_SECRET ??= 'synthetic-smoke-test-secret';

    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = fixture.createNestApplication();
    app.useLogger(false);
    configureApplication(app);
    await app.init();

    jwtService = app.get(JwtService);
    adminToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      systemRole: SystemRole.ADMIN,
    });
    userToken = jwtService.sign({
      sub: normalUser.id,
      email: normalUser.email,
      systemRole: SystemRole.USER,
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('ADM-05: GET /api/admin/events', () => {
    it('rejects access from normal USER (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/events')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
    });

    it('allows ADMIN to retrieve paginated list of all system events (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/admin/events?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('total', 1);
      expect(res.body.data).toHaveProperty('page', 1);
      expect(res.body.data).toHaveProperty('limit', 10);
      expect(res.body.data).toHaveProperty('totalPages', 1);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items[0].id).toBe(currentEvent.id);
    });
  });

  describe('ADM-06: PATCH /api/admin/events/:id/status', () => {
    it('rejects moderation by normal USER (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/events/${currentEvent.id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ status: 'SUSPENDED', reason: 'Không có quyền' });

      expect(res.status).toBe(403);
    });

    it('rejects moderation with invalid status (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/events/${currentEvent.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'DRAFT' });

      expect(res.status).toBe(400);
    });

    it('allows ADMIN to moderate event to SUSPENDED with reason (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/events/${currentEvent.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'SUSPENDED',
          reason: 'Phát hiện dấu hiệu vi phạm quy chuẩn minh bạch',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUSPENDED');
      expect(res.body.data.moderationReason).toBe(
        'Phát hiện dấu hiệu vi phạm quy chuẩn minh bạch',
      );
    });

    it('allows ADMIN to forcibly cancel event to CANCELLED (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/events/${currentEvent.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'CANCELLED',
          reason: 'Cưỡng chế hủy bỏ chiến dịch do gian lận',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CANCELLED');
    });
  });

  describe('REP-01: GET /api/reports/events/:id/export', () => {
    it('exports CSV report with standard download headers (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/events/${currentEvent.id}/export?format=csv`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.csv');
      expect(res.text).toContain('BÁO CÁO TỔNG KẾT NGHIỆM THU CHIẾN DỊCH CỨU TRỢ');
    });

    it('exports XLSX report with standard download headers (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/events/${currentEvent.id}/export?format=xlsx`)
        .set('Authorization', `Bearer ${adminToken}`)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.xlsx');
      expect(Number(res.headers['content-length'])).toBeGreaterThan(1000);
    });

    it('exports PDF report with standard download headers (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reports/events/${currentEvent.id}/export?format=pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .responseType('blob');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('.pdf');
      expect(Number(res.headers['content-length'])).toBeGreaterThan(1000);
    });
  });
});
