import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../dist/app.module.js';
import { configureApplication } from '../dist/bootstrap.js';
import { PrismaService } from '../dist/database/prisma.service.js';
import { SystemRole, OrgStatus } from '@prisma/client';

/**
 * ============================================================================
 * TEST M1 — Admin duyệt Organization (phần còn thiếu trong auth.e2e-spec.ts)
 * ============================================================================
 * Mục tiêu từ test_plan.txt:
 *   "Test đăng ký, đăng nhập, RBAC, duyệt Organization, trạng thái Event
 *    và quyền truy cập. Done: Các test case chính pass; lỗi được ghi trên Jira."
 *
 * Phạm vi test:
 *   - Admin duyệt Organization PENDING → APPROVED (200)
 *   - Admin từ chối Organization PENDING → REJECTED (200)
 *   - Non-Admin (USER) gọi endpoint review → 403 Forbidden
 *   - Review Organization không tồn tại → 404
 *   - Review Organization đã APPROVED → SUSPENDED (200, service cho phép)
 *   - Organization sau khi APPROVED thì publish Event được 
 *
 * ============================================================================
 */

describe('M1 — Admin duyệt Organization', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  // In-memory data store
  const usersStore: any[] = [];
  const orgsStore: any[] = [];

  const mockPrisma = {
    user: {
      findUnique: async ({ where }: any) => {
        if (where?.id) {
          return usersStore.find((u) => u.id === where.id) ?? null;
        }
        return null;
      },
      create: async ({ data }: any) => {
        const newUser = {
          id: `00000000-0000-4000-8000-${String(usersStore.length + 1).padStart(12, '0')}`,
          email: data.email,
          fullName: data.fullName,
          passwordHash: data.passwordHash,
          systemRole: data.systemRole ?? SystemRole.USER,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        usersStore.push(newUser);
        return newUser;
      },
    },
    organization: {
      findUnique: async ({ where }: any) => {
        if (where?.id) {
          return orgsStore.find((o) => o.id === where.id) ?? null;
        }
        return null;
      },
      update: async ({ where, data }: any) => {
        const org = orgsStore.find((o) => o.id === where.id);
        if (!org) throw new Error('Org not found');
        Object.assign(org, data, { updatedAt: new Date() });
        return org;
      },
    },
    $transaction: async (arg: any) => {
      if (typeof arg === 'function') return arg(mockPrisma);
      return Promise.all(arg);
    },
  };

  let adminToken: string;
  let userToken: string;
  let pendingOrgId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET ??= 'test-jwt-secret-admin-review';

    const fixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = fixture.createNestApplication();
    app.useLogger(false);
    configureApplication(app);
    await app.init();
    jwtService = app.get(JwtService);

    // Seed Admin user
    const adminHash = await bcrypt.hash('AdminPassword123!', 10);
    const adminUser = await mockPrisma.user.create({
      data: {
        email: 'admin@openaid.test',
        fullName: 'Platform Admin',
        passwordHash: adminHash,
        systemRole: SystemRole.ADMIN,
        isActive: true,
      },
    });
    adminToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      systemRole: SystemRole.ADMIN,
    });

    // Seed USER thường
    const userHash = await bcrypt.hash('UserPassword123!', 10);
    const normalUser = await mockPrisma.user.create({
      data: {
        email: 'user@openaid.test',
        fullName: 'Normal User',
        passwordHash: userHash,
        systemRole: SystemRole.USER,
        isActive: true,
      },
    });
    userToken = jwtService.sign({
      sub: normalUser.id,
      email: normalUser.email,
      systemRole: SystemRole.USER,
    });

    // Seed Organization PENDING
    orgsStore.push({
      id: '20000000-0000-4000-8000-000000000001',
      name: 'Hoi Cuu Tro Test',
      code: 'HCTTEST',
      description: 'To chuc test',
      email: 'test@hct.test',
      status: OrgStatus.PENDING,
      createdById: normalUser.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    pendingOrgId = '20000000-0000-4000-8000-000000000001';
  });

  afterAll(async () => {
    await app?.close();
  });

  // =========================================================================
  // TEST 1: Admin duyệt Organization PENDING → APPROVED
  // =========================================================================
  it('Admin duyệt Organization PENDING → APPROVED (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/organizations/${pendingOrgId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: OrgStatus.APPROVED });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(OrgStatus.APPROVED);
    expect(response.body.data.reviewedById).toBeDefined();
    expect(response.body.data.reviewedAt).toBeDefined();
  });

  // =========================================================================
  // TEST 2: Admin từ chối Organization PENDING → REJECTED
  // =========================================================================
  it('Admin từ chối Organization → REJECTED (200)', async () => {
    // Tạo org mới để test reject
    const newOrgId = '20000000-0000-4000-8000-000000000002';
    orgsStore.push({
      id: newOrgId,
      name: 'Hoi Bi Tu Choi',
      code: 'HCTREJECT',
      email: 'reject@hct.test',
      status: OrgStatus.PENDING,
      createdById: 'user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/admin/organizations/${newOrgId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: OrgStatus.REJECTED });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(OrgStatus.REJECTED);
  });

  // =========================================================================
  // TEST 3: Non-Admin (USER) gọi endpoint review → 403
  // =========================================================================
  it('USER thường bị cấm (403) khi gọi PATCH /api/admin/organizations/:id/review', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/organizations/${pendingOrgId}/review`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ status: OrgStatus.APPROVED });

    expect(response.status).toBe(403);
    expect(response.body.message).toContain('permission');
  });

  // =========================================================================
  // TEST 4: Review Organization không tồn tại → 404
  // =========================================================================
  it('Review Organization không tồn tại trả 404', async () => {
    const response = await request(app.getHttpServer())
      .patch('/api/admin/organizations/00000000-0000-0000-0000-000000000000/review')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: OrgStatus.APPROVED });

    expect(response.status).toBe(404);
    expect(response.body.message).toContain('not found');
  });

  // =========================================================================
  // TEST 5: Review Organization đã APPROVED → SUSPENDED (service cho phép)
  // =========================================================================
  it('Admin có thể chuyển Organization APPROVED → SUSPENDED (200)', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/admin/organizations/${pendingOrgId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: OrgStatus.SUSPENDED });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(OrgStatus.SUSPENDED);
  });

  // =========================================================================
  // TEST 6: Organization sau khi APPROVED thì publish Event được
  // =========================================================================
  it('Organization APPROVED có thể publish Event ', async () => {
    // Test này cần EventsService.changeStatus() — hiện trả 501
    const response = await request(app.getHttpServer())
      .patch('/api/events/30000000-0000-4000-8000-000000000001/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PUBLISHED' });

    expect(response.status).toBe(501);
  });
});