import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import fs from 'node:fs';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { EventStatus, SystemRole } from '../../common/enums/index.js';
import { ReportFormat } from './dto/index.js';

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'object' && typeof v.toNumber === 'function') {
    return v.toNumber();
  }
  const n = Number(v);
  return Number.isNaN(n) ? 0 : n;
}

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  /**
   * REP-01: Xuất báo cáo tổng kết nghiệm thu chiến dịch (PDF / CSV / Excel)
   * Tổng hợp dữ liệu tiếp nhận (donations), tồn kho (inventory/batches) và phân phối (trips/distribution).
   */
  async exportEventReport(
    actor: AuthenticatedUser,
    eventId: string,
    format: ReportFormat,
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organization: true,
        createdBy: {
          select: { id: true, fullName: true, email: true },
        },
        donationNeeds: {
          include: { itemType: true, unit: true },
        },
        inventory: {
          include: { itemType: true, unit: true },
        },
        batches: {
          include: {
            itemType: true,
            unit: true,
            createdBy: { select: { fullName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        donations: {
          include: {
            donor: { select: { fullName: true, email: true } },
            itemType: true,
            unit: true,
            receivedBy: { select: { fullName: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        trips: {
          include: {
            points: {
              include: {
                records: {
                  include: {
                    confirmedBy: { select: { fullName: true, email: true } },
                    tripBatch: {
                      include: {
                        batch: {
                          include: { itemType: true, unit: true },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { position: 'asc' },
            },
            createdBy: { select: { fullName: true, email: true } },
          },
          orderBy: { departureDate: 'desc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Phân quyền: Admin có toàn quyền xuất báo cáo; nếu không phải Admin thì chỉ xuất khi là Organizer hoặc chiến dịch không phải DRAFT
    if (actor.systemRole !== SystemRole.ADMIN) {
      if (event.status === EventStatus.DRAFT) {
        await this.organizationAccessService.requireEventOrganizer(
          actor.id,
          eventId,
        );
      }
    }

    const safeTitle = (event.title || 'campaign')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .slice(0, 30);

    switch (format) {
      case ReportFormat.CSV: {
        const buffer = this.generateCsvReport(event);
        return {
          buffer,
          mimeType: 'text/csv; charset=utf-8',
          fileName: `bao-cao-nghiem-thu-${safeTitle}-${event.id.slice(0, 8)}.csv`,
        };
      }

      case ReportFormat.XLSX: {
        const buffer = await this.generateXlsxReport(event);
        return {
          buffer,
          mimeType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          fileName: `bao-cao-nghiem-thu-${safeTitle}-${event.id.slice(0, 8)}.xlsx`,
        };
      }

      case ReportFormat.PDF: {
        const buffer = await this.generatePdfReport(event);
        return {
          buffer,
          mimeType: 'application/pdf',
          fileName: `bao-cao-nghiem-thu-${safeTitle}-${event.id.slice(0, 8)}.pdf`,
        };
      }

      default:
        throw new BadRequestException(`Unsupported report format: ${format}`);
    }
  }

  /**
   * Tạo tệp CSV tổng kết nghiệm thu (hỗ trợ UTF-8 BOM chuẩn cho Excel)
   */
  private generateCsvReport(event: any): Buffer {
    const lines: string[] = [];

    // Header metadata
    lines.push('BÁO CÁO TỔNG KẾT NGHIỆM THU CHIẾN DỊCH CỨU TRỢ');
    lines.push(`Mã chiến dịch,${escapeCsv(event.id)}`);
    lines.push(`Tên chiến dịch,${escapeCsv(event.title)}`);
    lines.push(`Tổ chức thực hiện,${escapeCsv(event.organization?.name || 'N/A')}`);
    lines.push(`Mã tổ chức,${escapeCsv(event.organization?.code || 'N/A')}`);
    lines.push(`Trạng thái,${escapeCsv(event.status)}`);
    lines.push(
      `Thời gian thực hiện,${escapeCsv(
        `${new Date(event.startDate).toLocaleDateString('vi-VN')} - ${
          event.endDate
            ? new Date(event.endDate).toLocaleDateString('vi-VN')
            : 'Đang diễn ra'
        }`,
      )}`,
    );
    lines.push(`Địa điểm,${escapeCsv(event.location)}`);
    lines.push(`Người liên hệ,${escapeCsv(`${event.contactName} (${event.contactPhone || 'N/A'})`)}`);
    lines.push(`Thời điểm xuất báo cáo,${escapeCsv(new Date().toISOString())}`);
    lines.push('');

    // BẢNG 1: TỔNG HỢP NHU CẦU & TỒN KHO HIỆN VẬT
    lines.push('--- PHẦN 1: TỔNG HỢP NHU CẦU & TỒN KHO HIỆN VẬT ---');
    lines.push(
      [
        'Mặt hàng',
        'Đơn vị tính',
        'Nhu cầu mục tiêu',
        'Tổng đã tiếp nhận',
        'Tồn kho khả dụng',
        'Đang giữ trước',
        'Đã phân phối',
        'Hao hụt/Mất',
      ].join(','),
    );

    // Map needs & inventory
    const itemMap = new Map<string, any>();
    for (const need of event.donationNeeds || []) {
      const key = `${need.itemTypeId}:${need.unitId}`;
      itemMap.set(key, {
        item: need.itemType?.name || 'Hàng cứu trợ',
        unit: need.unit?.name || 'Phần',
        target: toNum(need.targetQuantity),
        received: 0,
        available: 0,
        reserved: 0,
        distributed: 0,
        lost: 0,
      });
    }

    for (const inv of event.inventory || []) {
      const key = `${inv.itemTypeId}:${inv.unitId}`;
      const existing = itemMap.get(key) || {
        item: inv.itemType?.name || 'Hàng cứu trợ',
        unit: inv.unit?.name || 'Phần',
        target: 0,
        received: 0,
        available: 0,
        reserved: 0,
        distributed: 0,
        lost: 0,
      };
      existing.received = toNum(inv.receivedQuantity);
      existing.available = toNum(inv.availableQuantity);
      existing.reserved = toNum(inv.reservedQuantity);
      existing.distributed = toNum(inv.distributedQuantity);
      existing.lost = toNum(inv.lostQuantity);
      itemMap.set(key, existing);
    }

    for (const row of itemMap.values()) {
      lines.push(
        [
          escapeCsv(row.item),
          escapeCsv(row.unit),
          row.target,
          row.received,
          row.available,
          row.reserved,
          row.distributed,
          row.lost,
        ].join(','),
      );
    }
    lines.push('');

    // BẢNG 2: CHI TIẾT DANH SÁCH TIẾP NHẬN QUYÊN GÓP (DONATIONS)
    lines.push('--- PHẦN 2: CHI TIẾT TIẾP NHẬN QUYÊN GÓP ---');
    lines.push(
      [
        'Mã vận đơn (Tracking ID)',
        'Người đóng góp',
        'Email',
        'Mặt hàng',
        'Đơn vị tính',
        'Số lượng đăng ký',
        'Số lượng thực nhận',
        'Trạng thái',
        'Thời gian tiếp nhận',
        'Người kiểm nhận',
      ].join(','),
    );

    for (const d of event.donations || []) {
      lines.push(
        [
          escapeCsv(d.trackingId),
          escapeCsv(d.donor?.fullName || 'Ẩn danh'),
          escapeCsv(d.donor?.email || ''),
          escapeCsv(d.itemType?.name || ''),
          escapeCsv(d.unit?.name || ''),
          toNum(d.quantity),
          toNum(d.receivedQuantity),
          escapeCsv(d.status),
          escapeCsv(
            d.receivedAt
              ? new Date(d.receivedAt).toLocaleString('vi-VN')
              : 'Chưa nhận',
          ),
          escapeCsv(d.receivedBy?.fullName || 'N/A'),
        ].join(','),
      );
    }
    lines.push('');

    // BẢNG 3: QUẢN LÝ LÔ HÀNG ĐÃ ĐÓNG GÓI (BATCHES)
    lines.push('--- PHẦN 3: DANH SÁCH LÔ HÀNG ĐÓNG GÓI ---');
    lines.push(
      [
        'Mã lô hàng (Batch Code)',
        'Mặt hàng',
        'Đơn vị tính',
        'Số lượng trong lô',
        'Trả lại kho',
        'Hao hụt',
        'Trạng thái',
        'Người tạo lô',
        'Ghi chú đối soát',
      ].join(','),
    );

    for (const b of event.batches || []) {
      lines.push(
        [
          escapeCsv(b.batchCode),
          escapeCsv(b.itemType?.name || ''),
          escapeCsv(b.unit?.name || ''),
          toNum(b.quantity),
          toNum(b.returnedQuantity),
          toNum(b.lostQuantity),
          escapeCsv(b.status),
          escapeCsv(b.createdBy?.fullName || ''),
          escapeCsv(b.reconciliationNote || ''),
        ].join(','),
      );
    }
    lines.push('');

    // BẢNG 4: KẾT QUẢ CỨU TRỢ VÀ PHÂN PHỐI (TRIPS & DISTRIBUTION)
    lines.push('--- PHẦN 4: KẾT QUẢ ĐIỀU PHỐI VÀ PHÂN PHỐI THỰC TẾ ---');
    lines.push(
      [
        'Mã chuyến đi',
        'Phương tiện',
        'Trạng thái chuyến',
        'Điểm cứu trợ',
        'Địa chỉ điểm',
        'Mặt hàng phát',
        'Đơn vị tính',
        'Số lượng trao',
        'Số người nhận quà',
        'Người xác nhận',
        'Thời gian xác nhận',
      ].join(','),
    );

    for (const trip of event.trips || []) {
      for (const pt of trip.points || []) {
        for (const rec of pt.records || []) {
          const item = rec.tripBatch?.batch?.itemType?.name || 'Hàng cứu trợ';
          const unit = rec.tripBatch?.batch?.unit?.name || 'Phần';
          lines.push(
            [
              escapeCsv(trip.tripCode),
              escapeCsv(trip.vehicle || 'N/A'),
              escapeCsv(trip.status),
              escapeCsv(pt.name),
              escapeCsv(pt.location),
              escapeCsv(item),
              escapeCsv(unit),
              toNum(rec.distributedQuantity),
              rec.beneficiaryCount || 0,
              escapeCsv(rec.confirmedBy?.fullName || 'N/A'),
              escapeCsv(
                rec.confirmedAt
                  ? new Date(rec.confirmedAt).toLocaleString('vi-VN')
                  : '',
              ),
            ].join(','),
          );
        }
      }
    }

    // Add UTF-8 Byte Order Mark for Excel display compatibility
    const csvContent = '\uFEFF' + lines.join('\r\n');
    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Tạo sổ tính Excel (.xlsx) đa bảng với định dạng chuyên nghiệp
   */
  private async generateXlsxReport(event: any): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'OpenAid System';
    workbook.created = new Date();

    const titleFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Dark blue
    };
    const whiteBoldFont: Partial<ExcelJS.Font> = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
      size: 11,
    };

    // SHEET 1: Tổng quan & Tồn kho
    const wsOverview = workbook.addWorksheet('Tổng quan & Tồn kho');
    wsOverview.columns = [
      { header: 'Mặt hàng', key: 'item', width: 25 },
      { header: 'Đơn vị tính', key: 'unit', width: 14 },
      { header: 'Nhu cầu mục tiêu', key: 'target', width: 18 },
      { header: 'Tổng đã tiếp nhận', key: 'received', width: 18 },
      { header: 'Tồn kho khả dụng', key: 'available', width: 18 },
      { header: 'Đang giữ trước', key: 'reserved', width: 16 },
      { header: 'Đã phân phối', key: 'distributed', width: 16 },
      { header: 'Hao hụt/Mất', key: 'lost', width: 16 },
    ];

    wsOverview.spliceRows(1, 0,
      ['BÁO CÁO TỔNG KẾT NGHIỆM THU CHIẾN DỊCH CỨU TRỢ'],
      [`Tên chiến dịch: ${event.title}`],
      [`Tổ chức thực hiện: ${event.organization?.name || 'N/A'} (Mã: ${event.organization?.code || 'N/A'})`],
      [`Địa điểm: ${event.location} | Trạng thái: ${event.status}`],
      [`Thời gian: ${new Date(event.startDate).toLocaleDateString('vi-VN')} - ${event.endDate ? new Date(event.endDate).toLocaleDateString('vi-VN') : 'Đang diễn ra'}`],
      [`Ngày lập báo cáo: ${new Date().toLocaleString('vi-VN')}`],
      [],
    );

    // Style the title row
    const titleRow = wsOverview.getRow(1);
    titleRow.font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } };

    // Header row of the table is now row 8
    const overviewHeaderRow = wsOverview.getRow(8);
    overviewHeaderRow.eachCell((cell) => {
      cell.fill = titleFill;
      cell.font = whiteBoldFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    // Populate data rows for inventory & needs
    const itemMap = new Map<string, any>();
    for (const need of event.donationNeeds || []) {
      const key = `${need.itemTypeId}:${need.unitId}`;
      itemMap.set(key, {
        item: need.itemType?.name || 'Hàng cứu trợ',
        unit: need.unit?.name || 'Phần',
        target: toNum(need.targetQuantity),
        received: 0,
        available: 0,
        reserved: 0,
        distributed: 0,
        lost: 0,
      });
    }

    for (const inv of event.inventory || []) {
      const key = `${inv.itemTypeId}:${inv.unitId}`;
      const existing = itemMap.get(key) || {
        item: inv.itemType?.name || 'Hàng cứu trợ',
        unit: inv.unit?.name || 'Phần',
        target: 0,
        received: 0,
        available: 0,
        reserved: 0,
        distributed: 0,
        lost: 0,
      };
      existing.received = toNum(inv.receivedQuantity);
      existing.available = toNum(inv.availableQuantity);
      existing.reserved = toNum(inv.reservedQuantity);
      existing.distributed = toNum(inv.distributedQuantity);
      existing.lost = toNum(inv.lostQuantity);
      itemMap.set(key, existing);
    }

    for (const row of itemMap.values()) {
      wsOverview.addRow(row);
    }

    // SHEET 2: Tiếp nhận quyên góp
    const wsDonations = workbook.addWorksheet('Tiếp nhận quyên góp');
    wsDonations.columns = [
      { header: 'Mã vận đơn', key: 'trackingId', width: 22 },
      { header: 'Người đóng góp', key: 'donorName', width: 22 },
      { header: 'Email', key: 'donorEmail', width: 25 },
      { header: 'Mặt hàng', key: 'item', width: 20 },
      { header: 'Đơn vị tính', key: 'unit', width: 14 },
      { header: 'Số lượng đăng ký', key: 'quantity', width: 18 },
      { header: 'Số lượng thực nhận', key: 'receivedQuantity', width: 20 },
      { header: 'Trạng thái', key: 'status', width: 16 },
      { header: 'Ngày tiếp nhận', key: 'receivedAt', width: 20 },
      { header: 'Người kiểm nhận', key: 'receivedBy', width: 20 },
    ];
    const donHeader = wsDonations.getRow(1);
    donHeader.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF065F46' }, // Dark green
      };
      cell.font = whiteBoldFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    for (const d of event.donations || []) {
      wsDonations.addRow({
        trackingId: d.trackingId,
        donorName: d.donor?.fullName || 'Ẩn danh',
        donorEmail: d.donor?.email || '',
        item: d.itemType?.name || '',
        unit: d.unit?.name || '',
        quantity: toNum(d.quantity),
        receivedQuantity: toNum(d.receivedQuantity),
        status: d.status,
        receivedAt: d.receivedAt
          ? new Date(d.receivedAt).toLocaleString('vi-VN')
          : 'Chưa nhận',
        receivedBy: d.receivedBy?.fullName || 'N/A',
      });
    }

    // SHEET 3: Quản lý Lô hàng
    const wsBatches = workbook.addWorksheet('Quản lý Lô hàng');
    wsBatches.columns = [
      { header: 'Mã lô', key: 'batchCode', width: 22 },
      { header: 'Mặt hàng', key: 'item', width: 22 },
      { header: 'Đơn vị tính', key: 'unit', width: 14 },
      { header: 'Số lượng đóng lô', key: 'quantity', width: 18 },
      { header: 'Trả lại kho', key: 'returnedQuantity', width: 16 },
      { header: 'Hao hụt', key: 'lostQuantity', width: 14 },
      { header: 'Trạng thái', key: 'status', width: 16 },
      { header: 'Người tạo', key: 'createdBy', width: 20 },
      { header: 'Ghi chú đối soát', key: 'note', width: 30 },
    ];
    const batchHeader = wsBatches.getRow(1);
    batchHeader.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF9A3412' }, // Dark orange
      };
      cell.font = whiteBoldFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    for (const b of event.batches || []) {
      wsBatches.addRow({
        batchCode: b.batchCode,
        item: b.itemType?.name || '',
        unit: b.unit?.name || '',
        quantity: toNum(b.quantity),
        returnedQuantity: toNum(b.returnedQuantity),
        lostQuantity: toNum(b.lostQuantity),
        status: b.status,
        createdBy: b.createdBy?.fullName || '',
        note: b.reconciliationNote || '',
      });
    }

    // SHEET 4: Phân phối cứu trợ
    const wsDistribution = workbook.addWorksheet('Phân phối cứu trợ');
    wsDistribution.columns = [
      { header: 'Mã chuyến', key: 'tripCode', width: 20 },
      { header: 'Phương tiện', key: 'vehicle', width: 18 },
      { header: 'Trạng thái', key: 'status', width: 16 },
      { header: 'Điểm trao quà', key: 'pointName', width: 25 },
      { header: 'Địa điểm', key: 'location', width: 25 },
      { header: 'Mặt hàng phát', key: 'item', width: 22 },
      { header: 'Đơn vị tính', key: 'unit', width: 14 },
      { header: 'Số lượng trao', key: 'quantity', width: 16 },
      { header: 'Số người nhận', key: 'beneficiaries', width: 16 },
      { header: 'Người xác nhận', key: 'confirmedBy', width: 20 },
      { header: 'Thời gian xác nhận', key: 'confirmedAt', width: 20 },
    ];
    const distHeader = wsDistribution.getRow(1);
    distHeader.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF581C87' }, // Dark purple
      };
      cell.font = whiteBoldFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    for (const trip of event.trips || []) {
      for (const pt of trip.points || []) {
        for (const rec of pt.records || []) {
          const item = rec.tripBatch?.batch?.itemType?.name || 'Hàng cứu trợ';
          const unit = rec.tripBatch?.batch?.unit?.name || 'Phần';
          wsDistribution.addRow({
            tripCode: trip.tripCode,
            vehicle: trip.vehicle || 'N/A',
            status: trip.status,
            pointName: pt.name,
            location: pt.location,
            item,
            unit,
            quantity: toNum(rec.distributedQuantity),
            beneficiaries: rec.beneficiaryCount || 0,
            confirmedBy: rec.confirmedBy?.fullName || 'N/A',
            confirmedAt: rec.confirmedAt
              ? new Date(rec.confirmedAt).toLocaleString('vi-VN')
              : '',
          });
        }
      }
    }

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Tạo tệp PDF tài liệu nghiệm thu chính thức
   */
  private generatePdfReport(event: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => reject(err));

        // Use standard Arial TTF on Windows if present for complete Vietnamese Unicode glyphs
        const fontCandidates = [
          'C:/Windows/Fonts/arial.ttf',
          '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        ];
        const fontPath = fontCandidates.find((p) => fs.existsSync(p));
        if (fontPath) {
          doc.font(fontPath);
        } else {
          doc.font('Helvetica');
        }

        // Header Title
        doc
          .fontSize(16)
          .text('BÁO CÁO TỔNG KẾT NGHIỆM THU CHIẾN DỊCH CỨU TRỢ', {
            align: 'center',
          })
          .moveDown(0.25);

        doc
          .fontSize(10)
          .fillColor('#64748b')
          .text('Nền tảng Quản lý và Điều phối Cứu trợ Minh bạch OpenAid', {
            align: 'center',
          })
          .fillColor('#000000')
          .moveDown(0.8);

        // Divider
        doc
          .moveTo(40, doc.y)
          .lineTo(555, doc.y)
          .strokeColor('#cbd5e1')
          .stroke()
          .moveDown(0.8);

        // SECTION 1: Campaign Information
        doc.fontSize(12).text('1. THÔNG TIN CHIẾN DỊCH', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(10);
        doc.text(`Tên chiến dịch: ${event.title}`);
        doc.text(
          `Đơn vị tổ chức: ${event.organization?.name || 'N/A'} (Mã: ${event.organization?.code || 'N/A'})`,
        );
        doc.text(`Địa điểm triển khai: ${event.location}`);
        doc.text(
          `Thời gian: ${new Date(event.startDate).toLocaleDateString('vi-VN')} - ${
            event.endDate
              ? new Date(event.endDate).toLocaleDateString('vi-VN')
              : 'Đang triển khai'
          }`,
        );
        doc.text(`Trạng thái nghiệm thu: ${event.status}`);
        doc.text(
          `Đầu mối liên hệ: ${event.contactName} - ${event.contactPhone || 'N/A'}`,
        );
        doc.moveDown(0.8);

        // SECTION 2: Inventory & Reception Summary
        doc
          .fontSize(12)
          .text('2. TỔNG HỢP TIẾP NHẬN & TỒN KHO HIỆN VẬT', {
            underline: true,
          });
        doc.moveDown(0.3);
        doc.fontSize(10);

        const itemMap = new Map<string, any>();
        for (const need of event.donationNeeds || []) {
          const key = `${need.itemTypeId}:${need.unitId}`;
          itemMap.set(key, {
            item: need.itemType?.name || 'Hàng cứu trợ',
            unit: need.unit?.name || 'Phần',
            target: toNum(need.targetQuantity),
            received: 0,
            distributed: 0,
            available: 0,
          });
        }
        for (const inv of event.inventory || []) {
          const key = `${inv.itemTypeId}:${inv.unitId}`;
          const existing = itemMap.get(key) || {
            item: inv.itemType?.name || 'Hàng cứu trợ',
            unit: inv.unit?.name || 'Phần',
            target: 0,
            received: 0,
            distributed: 0,
            available: 0,
          };
          existing.received = toNum(inv.receivedQuantity);
          existing.distributed = toNum(inv.distributedQuantity);
          existing.available = toNum(inv.availableQuantity);
          itemMap.set(key, existing);
        }

        if (itemMap.size === 0) {
          doc.text('- Chưa có dữ liệu hiện vật cứu trợ.');
        } else {
          for (const row of itemMap.values()) {
            doc.text(
              `- ${row.item}: Mục tiêu ${row.target} ${row.unit} | Đã tiếp nhận: ${row.received} ${row.unit} | Đã phân phối: ${row.distributed} ${row.unit} | Tồn khả dụng: ${row.available} ${row.unit}`,
            );
          }
        }
        doc.moveDown(0.8);

        // SECTION 3: Batches Summary
        doc
          .fontSize(12)
          .text('3. QUẢN LÝ LÔ HÀNG ĐÓNG GÓI & ĐỐI SOÁT', {
            underline: true,
          });
        doc.moveDown(0.3);
        doc.fontSize(10);
        const batchCount = (event.batches || []).length;
        doc.text(`- Tổng số lô hàng đã tạo: ${batchCount}`);
        if (batchCount > 0) {
          const sampleBatches = event.batches.slice(0, 5);
          for (const b of sampleBatches) {
            doc.text(
              `  + Lô [${b.batchCode}]: ${toNum(b.quantity)} ${b.unit?.name || ''} ${b.itemType?.name || ''} - Trạng thái: ${b.status}`,
            );
          }
          if (batchCount > 5) {
            doc.text(`  + ... và ${batchCount - 5} lô hàng khác.`);
          }
        }
        doc.moveDown(0.8);

        // SECTION 4: Distribution & Delivery
        doc
          .fontSize(12)
          .text('4. KẾT QUẢ ĐIỀU PHỐI VÀ PHÂN PHỐI THỰC TẾ', {
            underline: true,
          });
        doc.moveDown(0.3);
        doc.fontSize(10);
        const tripsCount = (event.trips || []).length;
        let totalBeneficiaries = 0;
        let totalRecordsCount = 0;
        for (const tr of event.trips || []) {
          for (const pt of tr.points || []) {
            for (const rc of pt.records || []) {
              totalBeneficiaries += rc.beneficiaryCount || 0;
              totalRecordsCount++;
            }
          }
        }
        doc.text(`- Tổng số chuyến vận chuyển: ${tripsCount}`);
        doc.text(`- Tổng số lượt phân phối quà: ${totalRecordsCount}`);
        doc.text(`- Tổng số người thụ hưởng: ${totalBeneficiaries} người`);
        doc.moveDown(1.2);

        // Sign-off
        doc.fontSize(10);
        doc.text(
          `Báo cáo được trích xuất tự động vào ngày ${new Date().toLocaleString('vi-VN')}.`,
          { align: 'right' },
        );
        doc.text('Đại diện Tổ chức / Ban Kiểm toán OpenAid', {
          align: 'right',
        });
        doc.moveDown(0.2);
        doc.text('(Ký và ghi rõ họ tên)', { align: 'right' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
