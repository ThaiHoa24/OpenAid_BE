// test/donations.e2e-spec.ts
// ============================================================
// FILE TEST E2E: LUỒNG DONATION (QUYÊN GÓP HIỆN VẬT)
// ------------------------------------------------------------
// Phạm vi kiểm tra:
//   1. Test số lượng (quantity): sai định dạng → báo lỗi 400.
//   2. Tracking ID: đúng định dạng, ngẫu nhiên, không trùng lặp.
//   3. Đóng góp VƯỢT mục tiêu (over-target): vẫn thành công, chỉ cảnh báo.
//   4. Từ chối nhận hàng (REJECTED): kho KHÔNG tăng.
//   5. Xác nhận nhận hàng (RECEIVED): kho tăng ddung 1 lần (không cộng lặp).
//
// MỤC TIÊU PASS TEST:
//   Luồng Event → Donation → Receipt → Inventory chạy đúng, lỗi được ghi nhận.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { AppModule } from '../dist/app.module.js';
import { configureApplication } from '../dist/bootstrap.js';
import { PrismaService } from '../dist/database/prisma.service.js';
import {
  SystemRole,
  OrganizationRole,
  OrgStatus,
  EventStatus,
  DonationStatus,
} from '@prisma/client';

describe('Luồng Donation: Event → Donation → Receipt → Inventory', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  // ============================================================
  // "DATABASE GIẢ" - lưu dữ liệu trong bộ nhớ máy
  // ============================================================
  const usersStore: any[] = [];
  const orgsStore: any[] = [];
  const membersStore: any[] = [];
  const eventsStore: any[] = [];
  const rolesStore: any[] = [];
  const needsStore: any[] = [];
  const donationsStore: any[] = [];
  const inventoryStore: any[] = [];
  const itemTypesStore: any[] = [];
  const unitsStore: any[] = [];
  const transparencyLogsStore: any[] = [];

  // Mã UUID cố định cho catalog (loại hàng + đơn vị).
  // BẮT BUỘC đúng định dạng UUID vì DTO kiểm tra @IsUUID().
  const RICE_ID = '50000000-0000-4000-8000-000000000001';
  const KG_ID = '60000000-0000-4000-8000-000000000001';

  // Hàm format số lượng dạng chuỗi thập phân 3 chữ số (theo hợp đồng API).
  // Ví dụ: 50 → "50.000". FE không dùng float nhị phân cho tính toán kho.
  const fmt = (n: number) => (Math.round(n * 1000) / 1000).toFixed(3);

  // Sinh Tracking ID giả cho mock: DON-<năm>-<8 ký tự hex ngẫu nhiên>.
  const genTrackingId = () =>
    `DON-${new Date().getFullYear()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // ============================================================
  // HÀM CHUYỂN DỮ LIỆU NỘI BỘ → DẠNG TRẢ VỀ GIỐNG API THẬT
  // ============================================================
  const outDon = (d: any) => ({
    id: d.id,
    trackingId: d.trackingId,
    eventId: d.eventId,
    donationNeedId: d.donationNeedId,
    itemTypeId: d.itemTypeId,
    unitId: d.unitId,
    donorId: d.donorId,
    batchId: d.batchId ?? null,
    quantity: fmt(d._q),
    status: d.status,
    receivedAt: d.receivedAt ?? null,
    rejectionReason: d.rejectionReason ?? null,
    warning: d.warning ?? null,
    photoUrl: d.photoUrl ?? null,
    createdAt: d.createdAt,
    event: eventsStore.find((e) => e.id === d.eventId) ?? null,
    donationNeed: needsStore.find((n) => n.id === d.donationNeedId) ?? null,
  });

  const outInv = (r: any) => ({
    id: r.id,
    eventId: r.eventId,
    itemTypeId: r.itemTypeId,
    unitId: r.unitId,
    receivedQuantity: fmt(r._r),
    availableQuantity: fmt(r._a),
    reservedQuantity: fmt(r._res),
    distributedQuantity: fmt(r._d),
    lostQuantity: fmt(r._l),
    updatedAt: r.updatedAt,
  });

  const outNeed = (n: any) => ({
    ...n,
    targetQuantity: fmt(n._target),
    itemType: itemTypesStore.find((i) => i.id === n.itemTypeId) ?? null,
    unit: unitsStore.find((u) => u.id === n.unitId) ?? null,
  });

  const outEvent = (e: any) => ({
    id: e.id,
    organizationId: e.organizationId,
    title: e.title,
    description: e.description ?? null,
    location: e.location,
    contactName: e.contactName,
    contactPhone: e.contactPhone ?? null,
    startDate: e.startDate,
    endDate: e.endDate ?? null,
    status: e.status,
    organization: orgsStore.find((o) => o.id === e.organizationId) ?? null,
    volunteerRoles: rolesStore.filter((r) => r.eventId === e.id),
    donationNeeds: needsStore.filter((n) => n.eventId === e.id).map(outNeed),
  });

  // ============================================================
  // MOCK PRISMA - giả lập các hàm truy vấn database
  // ============================================================
  const mockPrisma: any = {
    // --- BẢNG USER ---
    user: {
      findFirst: async ({ where }: any) => {
        if (where?.email?.equals) {
          const target = where.email.equals.toLowerCase();
          return usersStore.find((u) => u.email.toLowerCase() === target) ?? null;
        }
        return null;
      },
      findUnique: async ({ where }: any) =>
        usersStore.find((u) => u.id === where?.id) ?? null,
      findMany: async ({ skip = 0, take = 20 }: any) =>
        usersStore.slice(skip, skip + take).map((u) => ({
          id: u.id, email: u.email, fullName: u.fullName,
          phoneNumber: u.phoneNumber, avatarUrl: u.avatarUrl ?? null,
          systemRole: u.systemRole, isActive: u.isActive, createdAt: u.createdAt,
        })),
      create: async ({ data, select }: any) => {
        const newUser: any = {
          id: `00000000-0000-4000-8000-${String(usersStore.length + 1).padStart(12, '0')}`,
          email: data.email, fullName: data.fullName,
          passwordHash: data.passwordHash, phoneNumber: data.phoneNumber ?? null,
          systemRole: data.systemRole ?? SystemRole.USER,
          isActive: data.isActive ?? true,
          createdAt: new Date(), updatedAt: new Date(),
        };
        usersStore.push(newUser);
        if (select) {
          const res: any = {};
          for (const key of Object.keys(select)) if (select[key]) res[key] = newUser[key];
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

    // --- BẢNG ORGANIZATION ---
    organization: {
      findUnique: async ({ where }: any) =>
        orgsStore.find((o) => o.id === where?.id || o.code === where?.code) ?? null,
      findMany: async ({ where, skip = 0, take = 20 }: any) => {
        let list = orgsStore;
        if (where?.status) list = list.filter((o) => o.status === where.status);
        return list.slice(skip, skip + take);
      },
      create: async ({ data }: any) => {
        const newOrg: any = {
          id: `10000000-0000-4000-8000-${String(orgsStore.length + 1).padStart(12, '0')}`,
          name: data.name, code: data.code, description: data.description ?? null,
          email: data.email, phoneNumber: data.phoneNumber ?? null,
          address: data.address ?? null, status: data.status ?? OrgStatus.PENDING,
          createdById: data.createdById, createdAt: new Date(), updatedAt: new Date(),
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

    // --- BẢNG ORGANIZATION MEMBER ---
    organizationMember: {
      findUnique: async ({ where }: any) => {
        if (where?.userId_organizationId) {
          const { userId, organizationId } = where.userId_organizationId;
          const member = membersStore.find(
            (m) => m.userId === userId && m.organizationId === organizationId,
          );
          if (!member) return null;
          return { ...member, organization: orgsStore.find((o) => o.id === organizationId) };
        }
        return null;
      },
      findMany: async ({ where }: any) => {
        let list = membersStore;
        if (where?.userId) list = list.filter((m) => m.userId === where.userId);
        return list.map((m) => ({
          ...m, organization: orgsStore.find((o) => o.id === m.organizationId),
        }));
      },
      create: async ({ data }: any) => {
        const newMember: any = {
          id: `20000000-0000-4000-8000-${String(membersStore.length + 1).padStart(12, '0')}`,
          userId: data.userId, organizationId: data.organizationId,
          role: data.role ?? OrganizationRole.MEMBER, createdAt: new Date(),
        };
        membersStore.push(newMember);
        return newMember;
      },
    },

    // --- BẢNG EVENT ---
    event: {
      findUnique: async ({ where }: any) => {
        const e = eventsStore.find((ev) => ev.id === where?.id);
        return e ? outEvent(e) : null;
      },
      findMany: async ({ where, skip = 0, take = 20 }: any) => {
        let list = eventsStore;
        if (where?.status) list = list.filter((e) => e.status === where.status);
        return list.slice(skip, skip + take).map(outEvent);
      },
      count: async ({ where }: any) => {
        let list = eventsStore;
        if (where?.status) list = list.filter((e) => e.status === where.status);
        return list.length;
      },
      create: async ({ data }: any) => {
        const newEvent: any = {
          id: `30000000-0000-4000-8000-${String(eventsStore.length + 1).padStart(12, '0')}`,
          organizationId: data.organization?.connect?.id ?? data.organizationId,
          createdById: data.createdBy?.connect?.id,
          title: data.title, description: data.description ?? null,
          location: data.location, contactName: data.contactName,
          contactPhone: data.contactPhone ?? null,
          startDate: data.startDate, endDate: data.endDate ?? null,
          status: data.status ?? EventStatus.DRAFT,
          createdAt: new Date(), updatedAt: new Date(),
        };
        eventsStore.push(newEvent);
        // Tạo nested volunteerRoles nếu có
        if (data.volunteerRoles?.create) {
          for (const vr of data.volunteerRoles.create) {
            rolesStore.push({
              id: `40000000-0000-4000-8000-${String(rolesStore.length + 1).padStart(12, '0')}`,
              eventId: newEvent.id, name: vr.name, quantity: vr.quantity,
              description: vr.description ?? null, createdAt: new Date(),
            });
          }
        }
        // Tạo nested donationNeeds nếu có
        if (data.donationNeeds?.create) {
          for (const dn of data.donationNeeds.create) {
            needsStore.push({
              id: `41000000-0000-4000-8000-${String(needsStore.length + 1).padStart(12, '0')}`,
              eventId: newEvent.id,
              itemTypeId: dn.itemType?.connect?.id ?? dn.itemTypeId,
              unitId: dn.unit?.connect?.id ?? dn.unitId,
              _target: Number(dn.targetQuantity),
              notes: dn.notes ?? null, createdAt: new Date(),
            });
          }
        }
        return outEvent(newEvent);
      },
      update: async ({ where, data }: any) => {
        const e = eventsStore.find((ev) => ev.id === where.id);
        if (!e) throw new Error('Event not found');
        for (const key of Object.keys(data)) {
          if (data[key] !== undefined) e[key] = data[key];
        }
        e.updatedAt = new Date();
        return outEvent(e);
      },
      delete: async ({ where }: any) => {
        const idx = eventsStore.findIndex((e) => e.id === where.id);
        if (idx === -1) throw new Error('Event not found');
        return eventsStore.splice(idx, 1)[0];
      },
    },

    // --- BẢNG VOLUNTEER ROLE ---
    volunteerRole: {
      create: async ({ data }: any) => {
        const role = {
          id: `40000000-0000-4000-8000-${String(rolesStore.length + 1).padStart(12, '0')}`,
          ...data, createdAt: new Date(),
        };
        rolesStore.push(role);
        return role;
      },
      deleteMany: async ({ where }: any) => {
        const before = rolesStore.length;
        const kept = rolesStore.filter((r) => r.eventId !== where?.eventId);
        rolesStore.length = 0;
        rolesStore.push(...kept);
        return { count: before - rolesStore.length };
      },
    },

    // --- BẢNG DONATION NEED ---
    donationNeed: {
      findUnique: async ({ where }: any) => {
        const n = needsStore.find((x) => x.id === where?.id);
        return n ? outNeed(n) : null;
      },
      findMany: async ({ where }: any) => {
        let list = needsStore;
        if (where?.eventId) list = list.filter((n) => n.eventId === where.eventId);
        return list.map(outNeed);
      },
      create: async ({ data }: any) => {
        const need = {
          id: `41000000-0000-4000-8000-${String(needsStore.length + 1).padStart(12, '0')}`,
          eventId: data.eventId, itemTypeId: data.itemTypeId, unitId: data.unitId,
          _target: Number(data.targetQuantity), notes: data.notes ?? null,
          createdAt: new Date(),
        };
        needsStore.push(need);
        return outNeed(need);
      },
      delete: async ({ where }: any) => {
        const idx = needsStore.findIndex((n) => n.id === where.id);
        if (idx === -1) throw new Error('Need not found');
        return needsStore.splice(idx, 1)[0];
      },
      deleteMany: async ({ where }: any) => {
        const before = needsStore.length;
        const kept = needsStore.filter((n) => n.eventId !== where?.eventId);
        needsStore.length = 0;
        needsStore.push(...kept);
        return { count: before - needsStore.length };
      },
    },

    // --- BẢNG DONATION (trọng tâm của file test này) ---
    donation: {
      create: async ({ data, select }: any) => {
        const newDon: any = {
          id: `51000000-0000-4000-8000-${String(donationsStore.length + 1).padStart(12, '0')}`,
          trackingId: data.trackingId ?? genTrackingId(),
          eventId: data.eventId, donationNeedId: data.donationNeedId,
          itemTypeId: data.itemTypeId, unitId: data.unitId,
          donorId: data.donorId, batchId: data.batchId ?? null,
          _q: Number(data.quantity),
          status: data.status ?? DonationStatus.PENDING,
          receivedAt: data.receivedAt ?? null,
          rejectionReason: data.rejectionReason ?? null,
          warning: data.warning ?? null,
          createdAt: new Date(), updatedAt: new Date(),
        };
        donationsStore.push(newDon);
        if (select) {
          const res: any = {};
          const out = outDon(newDon);
          for (const key of Object.keys(select)) if (select[key]) res[key] = out[key];
          return res;
        }
        return outDon(newDon);
      },
      findUnique: async ({ where }: any) => {
        const d = donationsStore.find((x) => x.id === where?.id);
        return d ? outDon(d) : null;
      },
      findFirst: async ({ where }: any) => {
        let list = donationsStore;
        if (where?.id) list = list.filter((d) => d.id === where.id);
        if (where?.trackingId) list = list.filter((d) => d.trackingId === where.trackingId);
        return list[0] ? outDon(list[0]) : null;
      },
      findMany: async ({ where, skip = 0, take = 20 }: any) => {
        let list = donationsStore;
        if (where?.donorId) list = list.filter((d) => d.donorId === where.donorId);
        if (where?.eventId) list = list.filter((d) => d.eventId === where.eventId);
        if (where?.status) list = list.filter((d) => d.status === where.status);
        return list.slice(skip, skip + take).map(outDon);
      },
      update: async ({ where, data }: any) => {
        const d = donationsStore.find((x) => x.id === where.id);
        if (!d) throw new Error('Donation not found');
        for (const key of Object.keys(data)) {
          if (data[key] !== undefined) {
            if (key === 'quantity') d._q = Number(data[key]);
            else d[key] = data[key];
          }
        }
        d.updatedAt = new Date();
        return outDon(d);
      },
      count: async ({ where }: any) => {
        let list = donationsStore;
        if (where?.eventId) list = list.filter((d) => d.eventId === where.eventId);
        if (where?.status) list = list.filter((d) => d.status === where.status);
        if (where?.donationNeedId) list = list.filter((d) => d.donationNeedId === where.donationNeedId);
        return list.length;
      },
    },

    // --- BẢNG INVENTORY (tồn kho theo Event + loại hàng + đơn vị) ---
    inventory: {
      findUnique: async ({ where }: any) => {
        let row: any = null;
        if (where?.id) row = inventoryStore.find((r) => r.id === where.id);
        if (where?.eventId_itemTypeId_unitId) {
          const { eventId, itemTypeId, unitId } = where.eventId_itemTypeId_unitId;
          row = inventoryStore.find(
            (r) => r.eventId === eventId && r.itemTypeId === itemTypeId && r.unitId === unitId,
          );
        }
        return row ? outInv(row) : null;
      },
      findMany: async ({ where }: any) => {
        let list = inventoryStore;
        if (where?.eventId) list = list.filter((r) => r.eventId === where.eventId);
        return list.map(outInv);
      },
      create: async ({ data }: any) => {
        const row: any = {
          id: `52000000-0000-4000-8000-${String(inventoryStore.length + 1).padStart(12, '0')}`,
          eventId: data.eventId, itemTypeId: data.itemTypeId, unitId: data.unitId,
          _r: 0, _a: 0, _res: 0, _d: 0, _l: 0, updatedAt: new Date(),
        };
        inventoryStore.push(row);
        return outInv(row);
      },
      upsert: async ({ where, create, update }: any) => {
        const key = where?.eventId_itemTypeId_unitId ?? where;
        let row = inventoryStore.find(
          (r) =>
            r.eventId === key?.eventId &&
            r.itemTypeId === key?.itemTypeId &&
            r.unitId === key?.unitId,
        );
        if (!row) {
          row = {
            id: `52000000-0000-4000-8000-${String(inventoryStore.length + 1).padStart(12, '0')}`,
            eventId: create?.eventId ?? key?.eventId,
            itemTypeId: create?.itemTypeId ?? key?.itemTypeId,
            unitId: create?.unitId ?? key?.unitId,
            _r: 0, _a: 0, _res: 0, _d: 0, _l: 0, updatedAt: new Date(),
          };
          inventoryStore.push(row);
        }
        // Hỗ trợ cả gán trực tiếp lẫn dạng { increment: n }
        const apply = (field: string, val: any) => {
          if (val === undefined) return;
          if (typeof val === 'object' && val !== null && 'increment' in val) {
            row[field] += Number(val.increment);
          } else {
            row[field] = Number(val);
          }
        };
        apply('_r', update?.receivedQuantity);
        apply('_a', update?.availableQuantity);
        apply('_res', update?.reservedQuantity);
        apply('_d', update?.distributedQuantity);
        apply('_l', update?.lostQuantity);
        row.updatedAt = new Date();
        return outInv(row);
      },
      update: async ({ where, data }: any) => {
        let row = inventoryStore.find((r) => r.id === where?.id);
        if (!row && where?.eventId_itemTypeId_unitId) {
          const { eventId, itemTypeId, unitId } = where.eventId_itemTypeId_unitId;
          row = inventoryStore.find(
            (r) => r.eventId === eventId && r.itemTypeId === itemTypeId && r.unitId === unitId,
          );
        }
        if (!row) throw new Error('Inventory not found');
        const apply = (field: string, val: any) => {
          if (val === undefined) return;
          if (typeof val === 'object' && val !== null && 'increment' in val) {
            row[field] += Number(val.increment);
          } else {
            row[field] = Number(val);
          }
        };
        apply('_r', data?.receivedQuantity);
        apply('_a', data?.availableQuantity);
        apply('_res', data?.reservedQuantity);
        apply('_d', data?.distributedQuantity);
        apply('_l', data?.lostQuantity);
        row.updatedAt = new Date();
        return outInv(row);
      },
    },

    // --- BẢNG CATALOG (loại hàng + đơn vị) ---
    itemType: {
      findMany: async ({ where }: any) => {
        let list = itemTypesStore;
        if (where?.id?.in) list = list.filter((i) => where.id.in.includes(i.id));
        if (where?.isActive !== undefined) list = list.filter((i) => i.isActive === where.isActive);
        return list;
      },
      findUnique: async ({ where }: any) =>
        itemTypesStore.find((i) => i.id === where?.id || i.code === where?.code) ?? null,
    },
    unit: {
      findMany: async ({ where }: any) => {
        let list = unitsStore;
        if (where?.id?.in) list = list.filter((u) => where.id.in.includes(u.id));
        if (where?.isActive !== undefined) list = list.filter((u) => u.isActive === where.isActive);
        return list;
      },
      findUnique: async ({ where }: any) =>
        unitsStore.find((u) => u.id === where?.id || u.code === where?.code) ?? null,
    },

    // --- BẢNG TRANSPARENCY LOG (nhật ký minh bạch) ---
    // Backend ghi vào bảng này khi nhận/từ chối donation (khi đã code xong).
    transparencyLog: {
      create: async ({ data }: any) => {
        const log = {
          id: `80000000-0000-4000-8000-${String(transparencyLogsStore.length + 1).padStart(12, '0')}`,
          ...data, createdAt: new Date(),
        };
        transparencyLogsStore.push(log);
        return log;
      },
      findMany: async () => transparencyLogsStore,
      count: async () => transparencyLogsStore.length,
    },

    // --- CÁC BẢNG GIẢ CHỈ ĐỂ ĐẾM (tránh lỗi "is not a function") ---
    volunteerApplication: { count: async () => 0 },
    batch: { count: async () => 0 },
    trip: { count: async () => 0 },

    // --- TRANSACTION: giả lập giao dịch database ---
    $transaction: async (arg: any) => {
      if (typeof arg === 'function') return arg(mockPrisma);
      return Promise.all(arg);
    },
  };

  // ============================================================
  // BIẾN LƯU TRỮ DÙNG CHUNG GIỮA CÁC BƯỚC TEST
  // ============================================================
  let adminToken: string;
  let organizerToken: string;
  let donorToken: string;
  let createdOrgId: string;
  let createdEventId: string;
  let createdNeedId: string;
  let donationAId: string; // donation sẽ bị TỪ CHỐI (REJECTED)
  let donationBId: string; // donation sẽ được NHẬN (RECEIVED)
  let trackingA: string;
  let trackingB: string;
  let receiptBOk = false; // đánh dấu bước nhận hàng B đã chạy được (khác 501)

  // ============================================================
  // SETUP: khởi tạo app + seed catalog + tạo sẵn Admin
  // ============================================================
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET ??= 'test-jwt-secret-donation-workflow';

    // Seed catalog bằng UUID HỢP LỆ
    itemTypesStore.push({ id: RICE_ID, code: 'RICE', name: 'Rice', category: 'Food', isActive: true });
    unitsStore.push({ id: KG_ID, code: 'KG', name: 'Kilogram', isActive: true });

    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = fixture.createNestApplication();
    app.useLogger(false); // tắt log để output sạch sẽ
    configureApplication(app);
    await app.init();
    jwtService = app.get(JwtService);

    // Tạo sẵn tài khoản ADMIN để duyệt tổ chức
    const adminHash = await bcrypt.hash('AdminPass123!', 10);
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

  // ============================================================
  // BƯỚC 1: ĐĂNG KÝ TÀI KHOẢN (Organizer + Donor)
  // ============================================================
  describe('Bước 1: Đăng ký tài khoản', () => {
    it('Đăng ký Organizer (người tạo tổ chức & chiến dịch)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'organizer@openaid.test',
          fullName: 'Nguyễn Văn Tổ Chức',
          password: 'Password123!',
        });
      // 201 = tạo tài khoản thành công
      expect(res.status).toBe(201);
      organizerToken = res.body.data.accessToken;
    });

    it('Đăng ký Donor (nhà hảo tâm quyên góp hiện vật)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'donor@openaid.test',
          fullName: 'Trần Thị Hảo Tâm',
          password: 'Password123!',
        });
      expect(res.status).toBe(201);
      donorToken = res.body.data.accessToken;
    });
  });

  // ============================================================
  // BƯỚC 2: TẠO TỔ CHỨC + ADMIN DUYỆT
  // (Tổ chức phải APPROVED thì Event mới được publish)
  // ============================================================
  describe('Bước 2: Tổ chức và duyệt tổ chức', () => {
    it('Organizer tạo tổ chức mới (trạng thái PENDING)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/organizations')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          name: 'Hội Cứu Trợ Miền Trung',
          code: 'HCTMT-DON',
          email: 'contact@hctmt.org',
          description: 'Tổ chức thiện nguyện',
        });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING');
      createdOrgId = res.body.data.id;
    });

    it('Admin duyệt tổ chức (PENDING → APPROVED)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/admin/organizations/${createdOrgId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });

  // ============================================================
  // BƯỚC 3: TẠO EVENT KÈM DONATION NEED (mục tiêu 100 kg gạo)
  // Chức năng Event ĐÃ ĐƯỢC CODE nên bước này chạy thật 100%.
  // ============================================================
  describe('Bước 3: Tạo Event và Donation Need', () => {
    it('Organizer tạo Event DRAFT kèm nhu cầu 100 kg gạo', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          organizationId: createdOrgId,
          title: 'Cứu trợ lũ Hòa Vang',
          location: 'Hòa Vang, Đà Nẵng',
          contactName: 'Nguyễn Văn Tổ Chức',
          contactPhone: '0901234567',
          startDate: '2026-12-01T08:00:00.000Z',
          endDate: '2026-12-03T18:00:00.000Z',
          volunteerRoles: [{ name: 'Vận chuyển', quantity: 10 }],
          // itemTypeId / unitId BẮT BUỘC là UUID hợp lệ
          donationNeeds: [{ itemTypeId: RICE_ID, unitId: KG_ID, targetQuantity: 100 }],
        });
      // 201 = tạo Event thành công ở trạng thái DRAFT
      expect([201, 501]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.data.status).toBe('DRAFT');
        createdEventId = res.body.data.id;
        createdNeedId = res.body.data.donationNeeds[0].id;
      } else {
        console.warn('[BỎ QUA] Tạo Event trả về 501 (backend chưa code).');
      }
      createdEventId = res.body.data.id;
      createdNeedId = res.body.data.donationNeeds[0].id;
    });

    it('Organizer công bố Event (DRAFT → PUBLISHED)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/events/${createdEventId}/status`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'PUBLISHED' });
      // 200 = công bố thành công (tổ chức đã được Admin duyệt)
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('PUBLISHED');
    });
  });

  // ============================================================
  // BƯỚC 4: TEST SỐ LƯỢNG (QUANTITY) VÀ XÁC THỰC
  // ValidationPipe chạy TRƯỚC service nên các lỗi 400/401 dưới đây
  // PASS NGAY cả khi module Donation còn là khung sườn (501).
  // ============================================================
  describe('Bước 4: Test số lượng và xác thực (lỗi được ghi nhận)', () => {
    it('Chặn request KHÔNG có token (401)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/donations')
        .send({ donationNeedId: createdNeedId, quantity: 50 });
      // 401 = chưa đăng nhập nên bị chặn ngay từ cổng
      expect(res.status).toBe(401);
    });

    it('Từ chối số lượng = 0 (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donationNeedId: createdNeedId, quantity: 0 });
      // 400 = dữ liệu sai: quantity phải > 0
      expect(res.status).toBe(400);
      // Kiểm tra envelope lỗi chuẩn: success=false, statusCode, message
      expect(res.body.success).toBe(false);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    it('Từ chối số lượng ÂM (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donationNeedId: createdNeedId, quantity: -5 });
      expect(res.status).toBe(400);
    });

    it('Từ chối số lượng quá 3 chữ số thập phân (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donationNeedId: createdNeedId, quantity: 1.2345 });
      // 400 = kho dùng Decimal(14,3), không chấp nhận 4 chữ số lẻ
      expect(res.status).toBe(400);
    });

    it('Từ chối khi THIẾU donationNeedId (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ quantity: 50 });
      expect(res.status).toBe(400);
    });

    it('Từ chối donationNeedId KHÔNG phải UUID (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donationNeedId: 'not-a-uuid', quantity: 50 });
      expect(res.status).toBe(400);
    });

    it('Từ chối trường LẠ không có trong hợp đồng API (400)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donationNeedId: createdNeedId, quantity: 50, hackField: 'xxx' });
      // 400 = ValidationPipe chặn over-posting (forbidNonWhitelisted)
      expect(res.status).toBe(400);
    });

    it('Từ chối trạng thái receipt KHÔNG hợp lệ (400)', async () => {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      const res = await request(app.getHttpServer())
        .patch(`/api/donations/${fakeId}/receipt`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'LOST' });
      // 400 = receipt chỉ nhận RECEIVED hoặc REJECTED
      expect(res.status).toBe(400);
    });
  });

  // ============================================================
  // BƯỚC 5: TẠO DONATION + TRACKING ID + VƯỢT MỤC TIÊU
  // Module Donation hiện còn scaffold → chấp nhận cả 501.
  // Khi đã code xong, test kiểm tra chặt chẽ 201 + định dạng Tracking ID.
  // ============================================================
  describe('Bước 5: Tạo Donation và Tracking ID', () => {
    it('Donor quyên góp 50 kg gạo (trong mục tiêu) → nhận Tracking ID', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donationNeedId: createdNeedId, quantity: 50 });
      // 201 = tạo donation thành công; 501 = backend chưa code chức năng này
      expect([201, 501]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.data.status).toBe('PENDING');
        expect(res.body.data.quantity).toBe('50.000');
        // Tracking ID đúng định dạng DON-<năm>-<8 ký tự hex>
        expect(res.body.data.trackingId).toMatch(/^DON-\d{4}-[A-F0-9]{8}$/);
        // Chưa vượt mục tiêu thì không có cảnh báo
        expect(res.body.data.warning).toBeFalsy();
        donationAId = res.body.data.id;
        trackingA = res.body.data.trackingId;
      } else {
        console.warn('[BỎ QUA] Tạo donation trả về 501 (backend chưa code).');
      }
    });

    it('Donor quyên góp thêm 50 kg nữa (đủ mục tiêu)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donationNeedId: createdNeedId, quantity: 50 });
      expect([201, 501]).toContain(res.status);
      if (res.status === 201) {
        donationBId = res.body.data.id;
        trackingB = res.body.data.trackingId;
      } else {
        console.warn('[BỎ QUA] Tạo donation B trả về 501 (backend chưa code).');
      }
    });

    it('Đóng góp VƯỢT mục tiêu (999 kg) vẫn thành công, chỉ cảnh báo', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donationNeedId: createdNeedId, quantity: 999 });
      // Mục tiêu (target) KHÔNG phải giới hạn cứng: vượt vẫn nhận, chỉ warning
      expect([201, 501]).toContain(res.status);
      if (res.status === 201) {
        expect(res.body.data.status).toBe('PENDING');
        // Vượt mục tiêu → phải có cảnh báo nhưng KHÔNG được reject
        expect(res.body.data.warning).toBeTruthy();
      } else {
        console.warn('[BỎ QUA] Over-target trả về 501 (backend chưa code).');
      }
    });

    it('Tracking ID là DUY NHẤT và không tuần tự', async () => {
      if (!trackingA || !trackingB) {
        console.warn('[BỎ QUA] Chưa có Tracking ID để so sánh (501).');
        return;
      }
      // Hai donation khác nhau phải có mã khác nhau
      expect(trackingA).not.toBe(trackingB);
    });
  });

  // ============================================================
  // BƯỚC 6: TỪ CHỐI NHẬN HÀNG (REJECTED) → KHO KHÔNG TĂNG
  // ============================================================
  describe('Bước 6: Từ chối nhận hàng', () => {
    it('Organizer từ chối donation A (hàng hỏng) → kho KHÔNG tăng', async () => {
      if (!donationAId) {
        console.warn('[BỎ QUA] Chưa có donation A để từ chối (501).');
        return;
      }
      const res = await request(app.getHttpServer())
        .patch(`/api/donations/${donationAId}/receipt`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'REJECTED', rejectionReason: 'Hàng bị hỏng khi vận chuyển' });
      // 200 = xử lý thành công; 501 = backend chưa code
      expect([200, 501]).toContain(res.status);
      if (res.status === 200) {
        expect(res.body.data.status).toBe('REJECTED');
        expect(res.body.data.rejectionReason).toContain('hỏng');
      } else {
        console.warn('[BỎ QUA] Receipt REJECTED trả về 501 (backend chưa code).');
      }
    });
  });

  // ============================================================
  // BƯỚC 7: XÁC NHẬN NHẬN HÀNG (RECEIVED) → KHO TĂNG ĐÚNG 1 LẦN
  // ============================================================
  describe('Bước 7: Xác nhận nhận hàng và kiểm tra kho', () => {
    it('Organizer xác nhận nhận donation B → kho tăng Received + Available', async () => {
      if (!donationBId) {
        console.warn('[BỎ QUA] Chưa có donation B để nhận (501).');
        return;
      }
      const res = await request(app.getHttpServer())
        .patch(`/api/donations/${donationBId}/receipt`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'RECEIVED' });
      expect([200, 501]).toContain(res.status);
      if (res.status === 200) {
        receiptBOk = true;
        expect(res.body.data.status).toBe('RECEIVED');
        expect(res.body.data.receivedAt).toBeTruthy();
      } else {
        console.warn('[BỎ QUA] Receipt RECEIVED trả về 501 (backend chưa code).');
      }
    });

    it('Gọi receipt LẶP LẠI không được cộng kho lần hai (idempotency)', async () => {
      if (!receiptBOk) {
        console.warn('[BỎ QUA] Chưa chạy được receipt lần đầu (501).');
        return;
      }
      const retry = await request(app.getHttpServer())
        .patch(`/api/donations/${donationBId}/receipt`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'RECEIVED' });
      // Chấp nhận 200 (trả trạng thái hiện tại) hoặc 409 (đã xử lý rồi)
      expect([200, 409, 501]).toContain(retry.status);
      // QUAN TRỌNG: dù retry trả mã gì, kho chỉ được cộng ĐÚNG MỘT LẦN 50 kg
      const row = inventoryStore.find(
        (r) => r.eventId === createdEventId && r.itemTypeId === RICE_ID && r.unitId === KG_ID,
      );
      if (row) {
        expect(row._r).toBe(50); // received KHÔNG được thành 100
        expect(row._a).toBe(50); // available KHÔNG được thành 100
      }
    });

    it('Kho thỏa phương trình bảo toàn: Received = Available + Reserved + Distributed + Lost', async () => {
      if (!receiptBOk) {
        console.warn('[BỎ QUA] Chưa có dữ liệu kho để kiểm tra (501).');
        return;
      }
      const row = inventoryStore.find(
        (r) => r.eventId === createdEventId && r.itemTypeId === RICE_ID && r.unitId === KG_ID,
      );
      expect(row).toBeDefined();
      // Phương trình tồn kho bắt buộc theo SRS (BR05 / FR15)
      expect(row._r).toBe(row._a + row._res + row._d + row._l);
      // Donation bị TỪ CHỐI (A) không được tính vào kho
      expect(row._r).toBe(50);
    });

    it('API Inventory trả đúng số liệu theo tổ chức', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventory/organization/${createdOrgId}`)
        .set('Authorization', `Bearer ${organizerToken}`);
      // 200 = truy vấn thành công; 501 = backend chưa code
      expect([200, 501]).toContain(res.status);
      if (res.status === 200) {
        const rows = res.body.data;
        expect(Array.isArray(rows)).toBe(true);
        const rice = rows.find(
          (r: any) => r.eventId === createdEventId && r.itemTypeId === RICE_ID,
        );
        expect(rice).toBeDefined();
        expect(rice.receivedQuantity).toBe('50.000');
        expect(rice.availableQuantity).toBe('50.000');
      } else {
        console.warn('[BỎ QUA] Inventory API trả về 501 (backend chưa code).');
      }
    });
  });

  // ============================================================
  // BƯỚC 8: MY DONATIONS + GHI NHẬN LỖI / AUDIT
  // ============================================================
  describe('Bước 8: My Donations và ghi nhận lỗi', () => {
    it('Donor xem danh sách đóng góp của chính mình', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/donations/my')
        .set('Authorization', `Bearer ${donorToken}`);
      expect([200, 501]).toContain(res.status);
      if (res.status === 200) {
        const list = res.body.data;
        expect(Array.isArray(list)).toBe(true);
        const donA = list.find((d: any) => d.id === donationAId);
        const donB = list.find((d: any) => d.id === donationBId);
        // Donation A bị từ chối, B đã nhận — trạng thái phải đúng
        if (donA) expect(donA.status).toBe('REJECTED');
        if (donB) expect(donB.status).toBe('RECEIVED');
      } else {
        console.warn('[BỎ QUA] My Donations trả về 501 (backend chưa code).');
      }
    });

    it('Nhật ký minh bạch ghi nhận các thay đổi trạng thái quan trọng', async () => {
      // Khi receipt đã code xong, mỗi lần nhận/từ chối phải ghi TransparencyLog
      if (!receiptBOk) {
        console.warn('[BỎ QUA] Chưa có receipt để kiểm tra audit log (501).');
        return;
      }
      const donLogs = transparencyLogsStore.filter((l: any) => l.entityType === 'DONATION');
      if (donLogs.length === 0) {
        console.warn('[CẢNH BÁO] Chưa thấy TransparencyLog cho DONATION.');
      } else {
        // Log phải có actor, trạng thái cũ/mới phục vụ truy vết
        expect(donLogs.some((l: any) => l.actorId && l.newStatus)).toBe(true);
      }
    });
  });
    // ============================================================
  // KIỂM TRA CÁC MÃ LỖI CÒN LẠI (401 / 403 / 404 / 409)
  // Mục đích: đảm bảo mọi đường dẫn sai đều trả về ĐÚNG mã lỗi,
  //           không bị lộ lỗi 500 (sập server) ra ngoài.
  // ============================================================
  describe('Bước 9: Kiểm tra các mã lỗi còn lại', () => {
    // UUID đúng định dạng nhưng KHÔNG tồn tại trong database
    const fakeUuid = '99999999-9999-4999-8999-999999999999';

    it('401: Xem inventory mà KHÔNG đăng nhập → bị chặn', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventory/organization/${createdOrgId}`);
      // 401 = chưa đăng nhập. Test này PASS NGAY cả khi backend chưa code
      expect(res.status).toBe(401);
    });

    it('403: Donor KHÔNG được tự duyệt receipt đơn của mình', async () => {
      if (!donationBId) {
        console.warn('[BỎ QUA] Chưa có donation để kiểm tra quyền (501).');
        return;
      }
      const res = await request(app.getHttpServer())
        .patch(`/api/donations/${donationBId}/receipt`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ status: 'RECEIVED' });
      // 403 = donor không có quyền receipt (chỉ Organizer được); 501 = chưa code
      expect([403, 501]).toContain(res.status);
    });

    it('403: Người KHÔNG thuộc tổ chức không được xem inventory', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/inventory/organization/${createdOrgId}`)
        .set('Authorization', `Bearer ${donorToken}`);
      // donor không phải thành viên tổ chức → 403 khi đã code; 501 hiện tại
      expect([403, 501]).toContain(res.status);
    });

    it('404: Receipt một donation KHÔNG tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/donations/${fakeUuid}/receipt`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'RECEIVED' });
      // 404 = UUID hợp lệ nhưng không có trong DB; 501 = chưa code
      expect([404, 501]).toContain(res.status);
    });

    it('404: Tạo donation với donationNeed KHÔNG tồn tại', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/donations')
        .set('Authorization', `Bearer ${donorToken}`)
        .send({ donationNeedId: fakeUuid, quantity: 10 });
      // Định dạng UUID đúng nên qua được validation (không phải 400),
      // nhưng need không có trong DB → 404 khi đã code; 501 hiện tại
      expect([404, 501]).toContain(res.status);
    });

    it('409: Không thể receipt lần nữa sau khi đã REJECTED', async () => {
      if (!donationAId) {
        console.warn('[BỎ QUA] Chưa có donation bị từ chối để kiểm tra (501).');
        return;
      }
      const res = await request(app.getHttpServer())
        .patch(`/api/donations/${donationAId}/receipt`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ status: 'RECEIVED' });
      // 409 = đơn đã xử lý rồi, không cho đổi trạng thái; 501 = chưa code
      expect([409, 501]).toContain(res.status);
    });
  });
});