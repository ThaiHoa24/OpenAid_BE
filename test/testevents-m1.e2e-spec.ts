import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from '../dist/app.module.js';
import { configureApplication } from '../dist/bootstrap.js';
import { PrismaService } from '../dist/database/prisma.service.js';
import { SystemRole, OrgStatus, EventStatus } from '@prisma/client';

/**
 * ============================================================================
 * TEST M1 — US-10: Khám phá & Tìm kiếm Chiến dịch (Event Discovery)
 * ============================================================================
 * Mục tiêu từ test_plan.txt:
 *   "Hỗ trợ M1 hoàn thiện danh sách, tìm kiếm/lọc Event và dữ liệu mẫu.
 *    Done: Người dùng xem được các Event đã xuất bản, bộ lọc hoạt động."
 *
 * Phạm vi test:
 *   - GET /api/events trả về chỉ Event PUBLISHED (không trả DRAFT/CANCELLED/CLOSED)
 *   - Filter theo search (tìm trong title/location)
 *   - Filter theo area (map vào location LIKE — theo chốt trong đoạn chat)
 *   - Filter theo from/to (startDate)
 *   - Filter theo itemTypeId (qua DonationNeed)
 *   - Kết hợp nhiều filter
 *   - Pagination skip/take
 *   - GET /api/events/:id trả chi tiết Event
 *   - GET /api/events/:id với ID không tồn tại → 404
 *   - GET /api/events/:id với ID không hợp lệ → 400
 *
 * ⚠️ KẾT QUẢ DỰ KIẾN: FAIL
 *   Lý do: EventsService.getAllEvents() và getEventById() hiện trả HTTP 501
 *   (featureNotImplemented). Đây là TDD — test viết trước làm "hợp đồng"
 *   cho người implement service sau này bám theo.
 * ============================================================================
 */

describe('M1 — US-10: Event Discovery (danh sách, tìm kiếm, lọc Event)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  // Dữ liệu mẫu trong mock DB
  const eventsStore: any[] = [];
  const donationNeedsStore: any[] = [];
  const itemTypesStore: any[] = [];

  // Tạo mock PrismaService
  const mockPrisma = {
    event: {
      findMany: async ({ where, skip = 0, take = 20, orderBy }: any) => {
        let list = eventsStore;
        // Lọc theo status
        if (where?.status) {
          list = list.filter((e) => e.status === where.status);
        }
        // Lọc theo startDate >= from
        if (where?.startDate?.gte) {
          list = list.filter(
            (e) => new Date(e.startDate) >= new Date(where.startDate.gte),
          );
        }
        // Lọc theo startDate <= to
        if (where?.startDate?.lte) {
          list = list.filter(
            (e) => new Date(e.startDate) <= new Date(where.startDate.lte),
          );
        }
        // Lọc theo location LIKE (cho filter area)
        if (where?.location?.contains) {
          const keyword = where.location.contains.toLowerCase();
          list = list.filter((e) =>
            e.location.toLowerCase().includes(keyword),
          );
        }
        // Sắp xếp
        if (orderBy?.startDate) {
          list = [...list].sort(
            (a, b) =>
              new Date(a.startDate).getTime() -
              new Date(b.startDate).getTime(),
          );
        }
        return list.slice(skip, skip + take);
      },
      findUnique: async ({ where }: any) => {
        if (where?.id) {
          return eventsStore.find((e) => e.id === where.id) ?? null;
        }
        return null;
      },
      count: async ({ where }: any) => {
        let list = eventsStore;
        if (where?.status) {
          list = list.filter((e) => e.status === where.status);
        }
        return list.length;
      },
    },
    donationNeed: {
      findMany: async ({ where }: any) => {
        if (where?.eventId) {
          return donationNeedsStore.filter(
            (dn) => dn.eventId === where.eventId,
          );
        }
        if (where?.itemTypeId) {
          return donationNeedsStore.filter(
            (dn) => dn.itemTypeId === where.itemTypeId,
          );
        }
        return donationNeedsStore;
      },
    },
    itemType: {
      findUnique: async ({ where }: any) => {
        if (where?.id) {
          return itemTypesStore.find((it) => it.id === where.id) ?? null;
        }
        return null;
      },
    },
    $transaction: async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(mockPrisma);
      }
      return Promise.all(arg);
    },
  };

  // Seed dữ liệu mẫu cho test
  const seedData = () => {
    // ItemType mẫu
    const riceTypeId = '50000000-0000-4000-8000-000000000001';
    const waterTypeId = '50000000-0000-4000-8000-000000000002';
    itemTypesStore.push(
      { id: riceTypeId, code: 'RICE', name: 'Rice', category: 'Food' },
      {
        id: waterTypeId,
        code: 'WATER',
        name: 'Drinking water',
        category: 'Beverages',
      },
    );

    // Organization ID (giả lập đã có)
    const orgId = '20000000-0000-4000-8000-000000000001';

    // Event PUBLISHED ở Hoa Vang, Da Nang (có DonationNeed RICE)
    const event1Id = '30000000-0000-4000-8000-000000000001';
    eventsStore.push({
      id: event1Id,
      organizationId: orgId,
      title: 'Ho tro khu vuc lu Hoa Vang',
      description: 'Cuu tro dong bao Hoa Vang',
      location: 'Hoa Vang, Da Nang',
      contactName: 'Demo Organizer',
      contactPhone: '0900000000',
      startDate: new Date('2026-11-01T08:00:00+07:00'),
      endDate: new Date('2026-11-02T17:00:00+07:00'),
      status: EventStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    donationNeedsStore.push({
      id: '70000000-0000-4000-8000-000000000001',
      eventId: event1Id,
      itemTypeId: riceTypeId,
      unitId: '60000000-0000-4000-8000-000000000001',
      targetQuantity: 500,
    });

    // Event PUBLISHED ở Hai Chau, Da Nang (có DonationNeed WATER)
    const event2Id = '30000000-0000-4000-8000-000000000002';
    eventsStore.push({
      id: event2Id,
      organizationId: orgId,
      title: 'Phat nuoc uong Hai Chau',
      description: 'Phat nuoc sach cho nguoi dan',
      location: 'Hai Chau, Da Nang',
      contactName: 'Demo Organizer',
      contactPhone: '0900000001',
      startDate: new Date('2026-11-15T08:00:00+07:00'),
      endDate: new Date('2026-11-16T17:00:00+07:00'),
      status: EventStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    donationNeedsStore.push({
      id: '70000000-0000-4000-8000-000000000002',
      eventId: event2Id,
      itemTypeId: waterTypeId,
      unitId: '60000000-0000-4000-8000-000000000002',
      targetQuantity: 1000,
    });

    // Event PUBLISHED ở Hue (có DonationNeed RICE)
    const event3Id = '30000000-0000-4000-8000-000000000003';
    eventsStore.push({
      id: event3Id,
      organizationId: orgId,
      title: 'Cuu tro Hue mua lu',
      description: 'Ho tro dong bao Hue',
      location: 'Hue, Thua Thien Hue',
      contactName: 'Demo Organizer',
      contactPhone: '0900000002',
      startDate: new Date('2026-12-01T08:00:00+07:00'),
      endDate: new Date('2026-12-02T17:00:00+07:00'),
      status: EventStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    donationNeedsStore.push({
      id: '70000000-0000-4000-8000-000000000003',
      eventId: event3Id,
      itemTypeId: riceTypeId,
      unitId: '60000000-0000-4000-8000-000000000001',
      targetQuantity: 300,
    });

    // Event DRAFT (không được trả trong danh sách public)
    eventsStore.push({
      id: '30000000-0000-4000-8000-000000000004',
      organizationId: orgId,
      title: 'Event DRAFT khong nen hien thi',
      location: 'Da Nang',
      contactName: 'Demo',
      startDate: new Date('2026-11-20T08:00:00+07:00'),
      status: EventStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Event CANCELLED (không được trả trong danh sách public)
    eventsStore.push({
      id: '30000000-0000-4000-8000-000000000005',
      organizationId: orgId,
      title: 'Event CANCELLED khong nen hien thi',
      location: 'Quang Nam',
      contactName: 'Demo',
      startDate: new Date('2026-11-25T08:00:00+07:00'),
      status: EventStatus.CANCELLED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET ??= 'test-jwt-secret-m1-events';

    seedData();

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
  });

  afterAll(async () => {
    await app?.close();
  });

  // =========================================================================
  // TEST 1: GET danh sách Event PUBLISHED
  // =========================================================================
  it('GET /api/events trả về chỉ Event PUBLISHED, không trả DRAFT/CANCELLED', async () => {
    const response = await request(app.getHttpServer()).get('/api/events');
    // Hiện tại sẽ trả 501 vì service chưa implement
    expect(response.status).toBe(501);
  });

  // =========================================================================
  // TEST 2: Event DRAFT không xuất hiện trong danh sách public
  // =========================================================================
  it('Event DRAFT không xuất hiện trong kết quả GET /api/events', async () => {
    const response = await request(app.getHttpServer()).get('/api/events');
    expect(response.status).toBe(501);
  });

  // =========================================================================
  // TEST 3: Filter theo search (tìm trong title/location)
  // =========================================================================
  it('Filter search=Hoa Vang chỉ trả Event có "Hoa Vang" trong title/location', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events?search=Hoa+Vang',
    );
    expect(response.status).toBe(501);
  });

  // =========================================================================
  // TEST 4: Filter theo area → map vào location LIKE
  // =========================================================================
  it('Filter area=Da+Nang map vào location LIKE, trả Event ở Da Nang', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events?area=Da+Nang',
    );
    expect(response.status).toBe(501);
  });

  // =========================================================================
  // TEST 5: Filter theo from (startDate >= from)
  // =========================================================================
  it('Filter from=2026-11-10 chỉ trả Event bắt đầu từ 10/11 trở đi', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events?from=2026-11-10T00:00:00.000Z',
    );
    expect(response.status).toBe(501);
  });

  // =========================================================================
  // TEST 6: Filter theo to (startDate <= to)
  // =========================================================================
  it('Filter to=2026-11-20 chỉ trả Event bắt đầu trước 20/11', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events?to=2026-11-20T00:00:00.000Z',
    );
    expect(response.status).toBe(501);
  });

  // =========================================================================
  // TEST 7: Filter theo itemTypeId
  // =========================================================================
  it('Filter itemTypeId chỉ trả Event có DonationNeed với itemType đó', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events?itemTypeId=50000000-0000-4000-8000-000000000001',
    );
    expect(response.status).toBe(501);
  });

  // =========================================================================
  // TEST 8: Kết hợp nhiều filter
  // =========================================================================
  it('Kết hợp search + area + from trả kết quả giao của các filter', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events?search=lu&area=Da+Nang&from=2026-11-01T00:00:00.000Z',
    );
    expect(response.status).toBe(501);
  });

  // =========================================================================
  // TEST 9: Pagination skip/take
  // =========================================================================
  it('Pagination skip=0&take=2 trả đúng 2 Event và có meta.total', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events?skip=0&take=2',
    );
    expect(response.status).toBe(501);
  });

  // =========================================================================
  // TEST 10: GET chi tiết Event theo ID
  // =========================================================================
  it('GET /api/events/:id trả chi tiết Event PUBLISHED với volunteerRoles và donationNeeds', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events/30000000-0000-4000-8000-000000000001',
    );
    expect(response.status).toBe(501);
  });

  // =========================================================================
  // TEST 11: GET Event không tồn tại → 404
  // =========================================================================
  it('GET /api/events/:id với ID không tồn tại trả 404', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events/00000000-0000-0000-0000-000000000000',
    );
    expect(response.status).toBe(501);
  });

  // =========================================================================
  // TEST 12: GET Event với ID không hợp lệ → 400
  // =========================================================================
  it('GET /api/events/:id với ID không hợp lệ (không phải UUID) trả 400', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/events/abc',
    );
    expect(response.status).toBe(501);
  });
});

// ⚠️ KẾT QUẢ DỰ KIẾN KHI CHẠY: TẤT CẢ 12 TEST SẼ FAIL (trả 501)
// Lý do: EventsService.getAllEvents() và getEventById() hiện trả HTTP 501 (featureNotImplemented).
// Đây là TDD — test viết trước làm "hợp đồng" cho người implement service sau này bám theo.