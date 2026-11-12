import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service.js';
import { ReportFormat } from './dto/index.js';
import { EventStatus, SystemRole } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('ReportsService - REP-01', () => {
  let service: ReportsService;
  let prisma: any;
  let orgAccess: any;

  const adminActor: AuthenticatedUser = {
    id: 'admin-uuid-1',
    email: 'admin@openaid.test',
    systemRole: SystemRole.ADMIN,
  };

  const userActor: AuthenticatedUser = {
    id: 'user-uuid-1',
    email: 'user@openaid.test',
    systemRole: SystemRole.USER,
  };

  const sampleEventData = {
    id: 'event-uuid-1',
    title: 'Cứu trợ đồng bào miền Trung lũ lụt',
    location: 'Huyện Hòa Vang, TP Đà Nẵng',
    status: EventStatus.PUBLISHED,
    startDate: new Date('2026-11-10T08:00:00Z'),
    endDate: new Date('2026-11-20T18:00:00Z'),
    contactName: 'Trần Văn B',
    contactPhone: '0912345678',
    organization: {
      id: 'org-uuid-1',
      name: 'Hội Cứu trợ Thiện nguyện',
      code: 'HCTTN',
      status: 'APPROVED',
    },
    createdBy: {
      id: 'user-creator',
      fullName: 'Người Tạo',
      email: 'creator@openaid.test',
    },
    donationNeeds: [
      {
        id: 'dn-1',
        itemTypeId: 'item-1',
        unitId: 'unit-1',
        targetQuantity: 1000,
        itemType: { name: 'Mì ăn liền' },
        unit: { name: 'Thùng' },
      },
    ],
    inventory: [
      {
        id: 'inv-1',
        itemTypeId: 'item-1',
        unitId: 'unit-1',
        receivedQuantity: 800,
        availableQuantity: 300,
        reservedQuantity: 100,
        distributedQuantity: 400,
        lostQuantity: 0,
        itemType: { name: 'Mì ăn liền' },
        unit: { name: 'Thùng' },
      },
    ],
    batches: [
      {
        id: 'batch-1',
        batchCode: 'BATCH-2026-001',
        quantity: 500,
        returnedQuantity: 50,
        lostQuantity: 10,
        status: 'READY',
        itemType: { name: 'Mì ăn liền' },
        unit: { name: 'Thùng' },
        createdBy: { fullName: 'Thủ kho A' },
        reconciliationNote: 'Đã kiểm đếm đầy đủ',
      },
    ],
    donations: [
      {
        id: 'don-1',
        trackingId: 'AID-2026-0001',
        quantity: 100,
        receivedQuantity: 100,
        status: 'RECEIVED',
        receivedAt: new Date('2026-11-11T10:00:00Z'),
        donor: { fullName: 'Nguyễn Mạnh Hùng', email: 'hung@donor.test' },
        itemType: { name: 'Mì ăn liền' },
        unit: { name: 'Thùng' },
        receivedBy: { fullName: 'TNV Nhận Hàng' },
      },
    ],
    trips: [
      {
        id: 'trip-1',
        tripCode: 'TRIP-2026-01',
        vehicle: 'Xe tải 5 tấn (29C-12345)',
        status: 'COMPLETED',
        points: [
          {
            id: 'pt-1',
            name: 'UBND Xã Hòa Liên',
            location: 'Thôn Hưởng Phước, Hòa Liên',
            records: [
              {
                id: 'rec-1',
                distributedQuantity: 400,
                beneficiaryCount: 200,
                confirmedAt: new Date('2026-11-15T14:00:00Z'),
                confirmedBy: { fullName: 'Trưởng thôn' },
                tripBatch: {
                  batch: {
                    itemType: { name: 'Mì ăn liền' },
                    unit: { name: 'Thùng' },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      event: {
        findUnique: vi.fn(),
      },
    };

    orgAccess = {
      requireEventOrganizer: vi.fn(),
    };

    service = new ReportsService(prisma, orgAccess);
  });

  it('throws NotFoundException if event is not found', async () => {
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(
      service.exportEventReport(adminActor, 'non-existent', ReportFormat.PDF),
    ).rejects.toThrow(NotFoundException);
  });

  it('checks organizer access if non-admin tries to export DRAFT event report', async () => {
    prisma.event.findUnique.mockResolvedValue({
      ...sampleEventData,
      status: EventStatus.DRAFT,
    });
    orgAccess.requireEventOrganizer.mockRejectedValue(
      new ForbiddenException('Access denied'),
    );

    await expect(
      service.exportEventReport(userActor, sampleEventData.id, ReportFormat.CSV),
    ).rejects.toThrow(ForbiddenException);

    expect(orgAccess.requireEventOrganizer).toHaveBeenCalledWith(
      userActor.id,
      sampleEventData.id,
    );
  });

  it('exports CSV report correctly with UTF-8 BOM and standard filename', async () => {
    prisma.event.findUnique.mockResolvedValue(sampleEventData);

    const result = await service.exportEventReport(
      adminActor,
      sampleEventData.id,
      ReportFormat.CSV,
    );

    expect(result.mimeType).toBe('text/csv; charset=utf-8');
    expect(result.fileName).toContain('.csv');
    expect(result.buffer).toBeInstanceOf(Buffer);

    const content = result.buffer.toString('utf-8');
    // Check for UTF-8 BOM character
    expect(content.charCodeAt(0)).toBe(0xfeff);
    expect(content).toContain('BÁO CÁO TỔNG KẾT NGHIỆM THU CHIẾN DỊCH CỨU TRỢ');
    expect(content).toContain('Cứu trợ đồng bào miền Trung lũ lụt');
    expect(content).toContain('AID-2026-0001');
    expect(content).toContain('BATCH-2026-001');
    expect(content).toContain('TRIP-2026-01');
  });

  it('exports XLSX report correctly with valid binary buffer', async () => {
    prisma.event.findUnique.mockResolvedValue(sampleEventData);

    const result = await service.exportEventReport(
      adminActor,
      sampleEventData.id,
      ReportFormat.XLSX,
    );

    expect(result.mimeType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(result.fileName).toContain('.xlsx');
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(1000);
  });

  it('exports PDF report correctly with valid binary buffer', async () => {
    prisma.event.findUnique.mockResolvedValue(sampleEventData);

    const result = await service.exportEventReport(
      adminActor,
      sampleEventData.id,
      ReportFormat.PDF,
    );

    expect(result.mimeType).toBe('application/pdf');
    expect(result.fileName).toContain('.pdf');
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(1000);
    // PDF signature check (%PDF-)
    expect(result.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});

