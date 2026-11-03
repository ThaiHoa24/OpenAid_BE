import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../dist/app.module.js';
import { configureApplication } from '../dist/bootstrap.js';
import { PrismaService } from '../dist/database/prisma.service.js';
import { SystemRole, OrganizationRole, OrgStatus } from '@prisma/client';

describe('Authentication & RBAC E2E Integration Tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  // In-memory data store for testing
  const usersStore: any[] = [];
  const orgsStore: any[] = [];
  const membersStore: any[] = [];

  const mockPrisma = {
    user: {
      findFirst: async ({ where }: any) => {
        if (where?.email?.equals) {
          const target = where.email.equals.toLowerCase();
          return usersStore.find((u) => u.email.toLowerCase() === target) ?? null;
        }
        return null;
      },
      findUnique: async ({ where }: any) => {
        if (where?.id) {
          return usersStore.find((u) => u.id === where.id) ?? null;
        }
        return null;
      },
      findMany: async ({ skip = 0, take = 20 }: any) => {
        return usersStore.slice(skip, skip + take).map((u) => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName,
          phoneNumber: u.phoneNumber,
          avatarUrl: u.avatarUrl ?? null,
          systemRole: u.systemRole,
          isActive: u.isActive,
          createdAt: u.createdAt,
        }));
      },
      create: async ({ data, select }: any) => {
        const newUser: any = {
          id: `00000000-0000-4000-8000-${String(usersStore.length + 1).padStart(12, '0')}`,
          email: data.email,
          fullName: data.fullName,
          passwordHash: data.passwordHash,
          phoneNumber: data.phoneNumber ?? null,
          systemRole: data.systemRole ?? SystemRole.USER,
          isActive: data.isActive ?? true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        usersStore.push(newUser);
        if (select) {
          const res: any = {};
          for (const key of Object.keys(select)) {
            if (select[key]) res[key] = newUser[key];
          }
          return res;
        }
        return newUser;
      },
      update: async ({ where, data }: any) => {
        const user = usersStore.find((u) => u.id === where.id);
        if (!user) throw new Error('User not found');
        Object.assign(user, data, { updatedAt: new Date() });
        return user;
      },
    },

    organization: {
      findUnique: async ({ where }: any) => {
        if (where?.id) {
          return orgsStore.find((o) => o.id === where.id) ?? null;
        }
        if (where?.code) {
          return orgsStore.find((o) => o.code === where.code) ?? null;
        }
        return null;
      },
      findMany: async ({ where, skip = 0, take = 20 }: any) => {
        let list = orgsStore;
        if (where?.status) {
          list = list.filter((o) => o.status === where.status);
        }
        return list.slice(skip, skip + take);
      },
      create: async ({ data }: any) => {
        const newOrg = {
          id: `10000000-0000-4000-8000-${String(orgsStore.length + 1).padStart(12, '0')}`,
          name: data.name,
          code: data.code,
          description: data.description ?? null,
          email: data.email,
          phoneNumber: data.phoneNumber ?? null,
          address: data.address ?? null,
          status: data.status ?? OrgStatus.PENDING,
          createdById: data.createdById,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        orgsStore.push(newOrg);
        return newOrg;
      },
      update: async ({ where, data }: any) => {
        const org = orgsStore.find((o) => o.id === where.id);
        if (!org) throw new Error('Org not found');
        Object.assign(org, data, { updatedAt: new Date() });
        return org;
      },
    },

    organizationMember: {
      findUnique: async ({ where }: any) => {
        if (where?.userId_organizationId) {
          const { userId, organizationId } = where.userId_organizationId;
          const member = membersStore.find(
            (m) => m.userId === userId && m.organizationId === organizationId,
          );
          if (!member) return null;
          const org = orgsStore.find((o) => o.id === organizationId);
          return { ...member, organization: org };
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        let list = membersStore;
        if (where?.userId) {
          list = list.filter((m) => m.userId === where.userId);
        }
        return list.map((m) => {
          const org = orgsStore.find((o) => o.id === m.organizationId);
          return {
            ...m,
            organization: org,
          };
        });
      },
      create: async ({ data }: any) => {
        const newMember = {
          id: `20000000-0000-4000-8000-${String(membersStore.length + 1).padStart(12, '0')}`,
          userId: data.userId,
          organizationId: data.organizationId,
          role: data.role ?? OrganizationRole.MEMBER,
          createdAt: new Date(),
        };
        membersStore.push(newMember);
        return newMember;
      },
    },

    $transaction: async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(mockPrisma);
      }
      return Promise.all(arg);
    },
  };

  let normalUserToken: string;
  let normalUserId: string;
  let secondUserToken: string;
  let secondUserId: string;
  let adminToken: string;
  let createdOrgId: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET ??= 'test-jwt-secret-caps1-auth-rbac';

    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = fixture.createNestApplication();
    app.useLogger(false);
    configureApplication(app);
    await app.init();
    jwtService = app.get(JwtService);

    // Pre-seed an ADMIN account in mock DB
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
  });

  afterAll(async () => {
    await app?.close();
  });

  // =========================================================================
  // 1. AUTHENTICATION FLOW
  // =========================================================================
  describe('Authentication (Register, Login, JWT, Hash Password)', () => {
    it('registers a new user successfully and returns JWT token and hashed password verification', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'user1@openaid.test',
          fullName: 'Nguyen Van Mot',
          password: 'Password123!',
          phoneNumber: '0901234567',
        });

      expect(response.status).toBe(201);
      normalUserToken = response.body.data?.accessToken;
      normalUserId = response.body.data?.user?.id;

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe('user1@openaid.test');
      expect(response.body.data.user.systemRole).toBe(SystemRole.USER);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');

      // Verify password was properly hashed in database
      const savedUser = usersStore.find((u) => u.id === normalUserId);
      expect(savedUser.passwordHash).not.toBe('Password123!');
      const matches = await bcrypt.compare('Password123!', savedUser.passwordHash);
      expect(matches).toBe(true);
    });

    it('rejects registration with a duplicate email (case-insensitive)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'USER1@openaid.test',
          fullName: 'Nguyen Van Duplicate',
          password: 'Password123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email is already registered');
    });

    it('registers a second normal user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'user2@openaid.test',
          fullName: 'Tran Thi Hai',
          password: 'Password123!',
        });

      expect(response.status).toBe(201);
      secondUserToken = response.body.data.accessToken;
      secondUserId = response.body.data.user.id;
    });

    it('logs in successfully with correct credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'user1@openaid.test',
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user.id).toBe(normalUserId);
    });

    it('rejects login with invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'user1@openaid.test',
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('allows authenticated user to get profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(normalUserId);
      expect(response.body.data.email).toBe('user1@openaid.test');
    });

    it('blocks unauthenticated access to profile with 401', async () => {
      const response = await request(app.getHttpServer()).get('/api/users/profile');
      expect(response.status).toBe(401);
    });
  });

  // =========================================================================
  // 2. SYSTEM RBAC (RolesGuard: ADMIN vs USER)
  // =========================================================================
  describe('System-level RBAC (USER cannot access ADMIN endpoints)', () => {
    it('USER role is forbidden (403) from accessing GET /api/admin/users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        'You do not have permission to access this resource',
      );
    });

    it('USER role is forbidden (403) from accessing GET /api/admin/organizations/pending', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/organizations/pending')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(response.status).toBe(403);
    });

    it('forged token claiming ADMIN systemRole is rejected (403) because database holds USER role', async () => {
      const forgedToken = jwtService.sign({
        sub: normalUserId,
        email: 'user1@openaid.test',
        systemRole: SystemRole.ADMIN,
      });

      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(response.status).toBe(403);
    });

    it('ADMIN role is permitted (200) to access GET /api/admin/users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // 3. ORGANIZATION-SCOPED RBAC (ORGANIZER vs Non-ORGANIZER)
  // =========================================================================
  describe('Organization-level RBAC (Scoped ORGANIZER permissions)', () => {
    it('USER 1 creates an Organization and is automatically assigned as ORGANIZER', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({
          name: 'Hoi Cuu Tro Mien Trung',
          code: 'HCTMT',
          description: 'To chuc thien nguyen Mien Trung',
          email: 'contact@hctmt.org',
          phoneNumber: '0988776655',
          address: 'Da Nang, Viet Nam',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Hoi Cuu Tro Mien Trung');
      expect(response.body.data.code).toBe('HCTMT');
      expect(response.body.data.status).toBe(OrgStatus.PENDING);
      createdOrgId = response.body.data.id;

      // Verify in membersStore that USER 1 is ORGANIZER
      const member = membersStore.find(
        (m) => m.userId === normalUserId && m.organizationId === createdOrgId,
      );
      expect(member).toBeDefined();
      expect(member.role).toBe(OrganizationRole.ORGANIZER);
    });

    it('USER 1 sees ORGANIZER membership in GET /api/users/memberships', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/memberships')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0]).toMatchObject({
        organizationId: createdOrgId,
        organizationName: 'Hoi Cuu Tro Mien Trung',
        role: OrganizationRole.ORGANIZER,
      });
    });

    it('USER 2 (not a member of this Organization) is forbidden (403) from updating it', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/organizations/${createdOrgId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          name: 'Ten Bi Hack boi User 2',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Organizer permission is required');
    });

    it('USER 2 is forbidden (403) from adding members to an Organization they do not organize', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/organizations/${createdOrgId}/members`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          userId: secondUserId,
          role: OrganizationRole.ORGANIZER,
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Organizer permission is required');
    });

    it('USER 1 (ORGANIZER) can update the Organization successfully (200)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/organizations/${createdOrgId}`)
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({
          description: 'Mo ta duoc cap nhat boi Chinh chu Organizer',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe(
        'Mo ta duoc cap nhat boi Chinh chu Organizer',
      );
    });

    it('USER 1 (ORGANIZER) adds USER 2 as a MEMBER', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/organizations/${createdOrgId}/members`)
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({
          userId: secondUserId,
          role: OrganizationRole.MEMBER,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.userId).toBe(secondUserId);
      expect(response.body.data.role).toBe(OrganizationRole.MEMBER);
    });

    it('USER 2 is now a MEMBER, but still forbidden (403) from updating because they are not an ORGANIZER', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/organizations/${createdOrgId}`)
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          name: 'Member khong the doi ten Org',
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Organizer permission is required');
    });
  });
});
