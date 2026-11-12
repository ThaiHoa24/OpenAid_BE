import { Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import {
  DonationStatus,
  VolunteerApplicationStatus,
} from '../../common/enums/index.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  async getOverviewStats(actor: AuthenticatedUser, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organization: true,
        volunteerRoles: true,
        donationNeeds: {
          include: {
            itemType: true,
            unit: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        eventId,
      );
    }

    const [
      donationsCount,
      batchesCount,
      tripsCount,
      applicationsCount,
      inventories,
      donations,
      applications,
    ] = await Promise.all([
      this.prisma.donation.count({ where: { eventId } }),
      this.prisma.batch.count({ where: { eventId } }),
      this.prisma.trip.count({ where: { eventId } }),
      this.prisma.volunteerApplication.count({ where: { eventId } }),
      this.prisma.inventory.findMany({
        where: { eventId },
        include: {
          itemType: true,
          unit: true,
        },
      }),
      this.prisma.donation.findMany({
        where: { eventId },
        select: {
          itemTypeId: true,
          unitId: true,
          quantity: true,
          status: true,
        },
      }),
      this.prisma.volunteerApplication.findMany({
        where: { eventId },
        select: {
          volunteerRoleId: true,
          status: true,
        },
      }),
    ]);

    // Inventory summary
    const inventorySummary = inventories.map((inv) => ({
      itemTypeId: inv.itemTypeId,
      itemType: inv.itemType.name,
      unitId: inv.unitId,
      unit: inv.unit.name,
      received: inv.receivedQuantity.toNumber(),
      available: inv.availableQuantity.toNumber(),
      reserved: inv.reservedQuantity.toNumber(),
      distributed: inv.distributedQuantity.toNumber(),
      lost: inv.lostQuantity.toNumber(),
    }));

    // Needed vs Pledged vs Received vs Distributed comparison (OA-S5-05)
    let totalNeededQuantity = 0;
    let totalReceivedQuantity = 0;
    let totalDistributedQuantity = 0;

    const donationNeedsProgress = event.donationNeeds.map((dn) => {
      const target = dn.targetQuantity.toNumber();
      totalNeededQuantity += target;

      const matchingDonations = donations.filter(
        (d) => d.itemTypeId === dn.itemTypeId && d.unitId === dn.unitId,
      );

      const pledged = matchingDonations
        .filter((d) => d.status === DonationStatus.PENDING)
        .reduce((sum, d) => sum + d.quantity.toNumber(), 0);

      const inv = inventories.find(
        (i) => i.itemTypeId === dn.itemTypeId && i.unitId === dn.unitId,
      );

      const received = inv ? inv.receivedQuantity.toNumber() : 0;
      const available = inv ? inv.availableQuantity.toNumber() : 0;
      const reserved = inv ? inv.reservedQuantity.toNumber() : 0;
      const distributed = inv ? inv.distributedQuantity.toNumber() : 0;
      const lost = inv ? inv.lostQuantity.toNumber() : 0;

      totalReceivedQuantity += received;
      totalDistributedQuantity += distributed;

      const fulfillmentRate =
        target > 0
          ? Math.min(100, Number(((received / target) * 100).toFixed(1)))
          : 100;

      const distributionRate =
        target > 0
          ? Math.min(100, Number(((distributed / target) * 100).toFixed(1)))
          : 100;

      return {
        id: dn.id,
        itemTypeId: dn.itemTypeId,
        itemType: dn.itemType.name,
        unitId: dn.unitId,
        unit: dn.unit.name,
        targetQuantity: target,
        pledgedQuantity: pledged,
        receivedQuantity: received,
        availableQuantity: available,
        reservedQuantity: reserved,
        distributedQuantity: distributed,
        lostQuantity: lost,
        remainingNeeded: Math.max(0, target - received),
        fulfillmentRate,
        distributionRate,
      };
    });

    // Volunteer roles recruitment progress
    let totalVolunteerTarget = 0;
    let totalVolunteerApproved = 0;

    const volunteerRolesProgress = event.volunteerRoles.map((vr) => {
      totalVolunteerTarget += vr.quantity;
      const roleApps = applications.filter((a) => a.volunteerRoleId === vr.id);
      const approvedCount = roleApps.filter(
        (a) => a.status === VolunteerApplicationStatus.APPROVED,
      ).length;
      const pendingCount = roleApps.filter(
        (a) => a.status === VolunteerApplicationStatus.PENDING,
      ).length;
      const rejectedCount = roleApps.filter(
        (a) => a.status === VolunteerApplicationStatus.REJECTED,
      ).length;

      totalVolunteerApproved += approvedCount;

      const fulfillmentRate =
        vr.quantity > 0
          ? Math.min(
              100,
              Number(((approvedCount / vr.quantity) * 100).toFixed(1)),
            )
          : 100;

      return {
        id: vr.id,
        name: vr.name,
        targetQuantity: vr.quantity,
        approvedCount,
        pendingCount,
        rejectedCount,
        fulfillmentRate,
      };
    });

    return {
      eventId: event.id,
      eventTitle: event.title,
      eventStatus: event.status,
      organizationName: event.organization.name,
      stats: {
        donationsCount,
        batchesCount,
        tripsCount,
        applicationsCount,
        totalNeededQuantity,
        totalReceivedQuantity,
        totalDistributedQuantity,
        totalVolunteerTarget,
        totalVolunteerApproved,
      },
      donationNeeds: donationNeedsProgress,
      volunteerRoles: volunteerRolesProgress,
      inventorySummary,
    };
  }

  /**
   * REP-01: Xuất báo cáo tổng kết nghiệm thu chiến dịch (CSV / Excel / PDF / JSON)
   * Tổng hợp toàn bộ dữ liệu Tiếp nhận - Tồn kho - Lô hàng - Phân phối - Minh chứng
   */
  async exportEventReport(
    actor: AuthenticatedUser,
    eventId: string,
    rawFormat?: string,
  ) {
    const overview = await this.getOverviewStats(actor, eventId);
    const format = (rawFormat || 'csv').toLowerCase();

    const [event, donations, batches, trips, records, evidences] =
      await Promise.all([
        this.prisma.event.findUniqueOrThrow({
          where: { id: eventId },
          include: {
            organization: true,
            createdBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
        }),
        this.prisma.donation.findMany({
          where: { eventId },
          orderBy: { createdAt: 'asc' },
          include: {
            donor: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
              },
            },
            itemType: true,
            unit: true,
            batch: { select: { id: true, batchCode: true, status: true } },
          },
        }),
        this.prisma.batch.findMany({
          where: { eventId },
          orderBy: { createdAt: 'asc' },
          include: {
            itemType: true,
            unit: true,
          },
        }),
        this.prisma.trip.findMany({
          where: { eventId },
          orderBy: { departureDate: 'asc' },
          include: {
            points: { orderBy: { position: 'asc' } },
          },
        }),
        this.prisma.distributionRecord.findMany({
          where: { trip: { eventId } },
          orderBy: { confirmedAt: 'asc' },
          include: {
            trip: { select: { id: true, tripCode: true, vehicle: true } },
            point: { select: { id: true, name: true, location: true } },
            tripBatch: {
              include: {
                batch: {
                  include: { itemType: true, unit: true },
                },
              },
            },
            confirmedBy: { select: { id: true, fullName: true } },
            evidence: {
              select: {
                id: true,
                imageUrl: true,
                reviewStatus: true,
                privacyConfirmed: true,
              },
            },
          },
        }),
        this.prisma.evidence.findMany({
          where: { trip: { eventId } },
          orderBy: { uploadedAt: 'asc' },
          include: {
            trip: { select: { tripCode: true } },
            point: { select: { name: true, location: true } },
            uploadedBy: { select: { fullName: true } },
            reviewedBy: { select: { fullName: true } },
          },
        }),
      ]);

    const generatedAt = new Date().toISOString();
    const safeCode = event.id.slice(0, 8).toUpperCase();

    const escapeCsv = (val: unknown): string => {
      const str = val === null || val === undefined ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const escapeHtml = (val: unknown): string => {
      return String(val ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const donationRows = donations.map((d) => ({
      trackingId: d.trackingId,
      donorName: d.donor?.fullName || 'Nhà hảo tâm',
      donorEmail: d.donor?.email || '',
      itemType: d.itemType.name,
      unit: d.unit.name,
      quantity: d.quantity.toNumber(),
      receivedQuantity: d.receivedQuantity.toNumber(),
      status: d.status,
      batchCode: d.batch?.batchCode || '',
      photoUrl: d.photoUrl || '',
      createdAt: d.createdAt.toISOString(),
      receivedAt: d.receivedAt ? d.receivedAt.toISOString() : '',
    }));

    const batchRows = batches.map((b) => ({
      batchCode: b.batchCode,
      itemType: b.itemType.name,
      unit: b.unit.name,
      quantity: b.quantity.toNumber(),
      returnedQuantity: b.returnedQuantity.toNumber(),
      lostQuantity: b.lostQuantity.toNumber(),
      status: b.status,
      reconciliationNote: b.reconciliationNote || '',
    }));

    const distributionRows = records.map((r) => ({
      tripCode: r.trip.tripCode,
      pointName: r.point.name,
      pointLocation: r.point.location,
      batchCode: r.tripBatch.batch.batchCode,
      itemType: r.tripBatch.batch.itemType.name,
      unit: r.tripBatch.batch.unit.name,
      distributedQuantity: r.distributedQuantity.toNumber(),
      beneficiaryCount: r.beneficiaryCount,
      confirmedBy: r.confirmedBy.fullName,
      confirmedAt: r.confirmedAt.toISOString(),
      approvedEvidenceCount: r.evidence.filter(
        (e) => e.reviewStatus === 'APPROVED',
      ).length,
      notes: r.notes || '',
    }));

    // Build CSV content (with UTF-8 BOM for Excel compatibility)
    const csvLines: string[] = [
      'BÁO CÁO TỔNG KẾT NGHIỆM THU CHIẾN DỊCH CỨU TRỢ - OPENAID',
      `Mã chiến dịch,${escapeCsv(event.id)}`,
      `Tên chiến dịch,${escapeCsv(event.title)}`,
      `Tổ chức thực hiện,${escapeCsv(event.organization.name)} (${escapeCsv(event.organization.code)})`,
      `Địa điểm cứu trợ,${escapeCsv(event.location)}`,
      `Trạng thái,${escapeCsv(event.status)}`,
      `Thời gian xuất báo cáo,${escapeCsv(generatedAt)}`,
      '',
      'I. TỔNG HỢP TIẾP NHẬN - TỒN KHO - PHÂN PHỐI THEO NHU YẾU PHẨM',
      'Hàng hóa,Đơn vị,Mục tiêu cần,Đang cam kết,Đã nhập kho,Tồn khả dụng,Đang trên xe,Đã cấp phát,Thất thoát/Hư hỏng,Tỷ lệ tiếp nhận (%),Tỷ lệ cấp phát (%)',
      ...overview.donationNeeds.map((n) =>
        [
          n.itemType,
          n.unit,
          n.targetQuantity,
          n.pledgedQuantity,
          n.receivedQuantity,
          n.availableQuantity,
          n.reservedQuantity,
          n.distributedQuantity,
          n.lostQuantity,
          n.fulfillmentRate,
          n.distributionRate,
        ]
          .map(escapeCsv)
          .join(','),
      ),
      '',
      'II. DANH SÁCH ĐÓNG GÓP & TIẾP NHẬN (DONATIONS)',
      'Mã Tracking ID,Nhà hảo tâm,Email,Hàng hóa,Đơn vị,SL cam kết,SL thực nhận,Trạng thái,Mã Lô (Batch),Ngày tạo,Ngày nhập kho',
      ...donationRows.map((d) =>
        [
          d.trackingId,
          d.donorName,
          d.donorEmail,
          d.itemType,
          d.unit,
          d.quantity,
          d.receivedQuantity,
          d.status,
          d.batchCode,
          d.createdAt,
          d.receivedAt,
        ]
          .map(escapeCsv)
          .join(','),
      ),
      '',
      'III. DANH SÁCH LÔ HÀNG & ĐỐI SOÁT (BATCHES)',
      'Mã Lô (Batch Code),Hàng hóa,Đơn vị,Số lượng đóng lô,Số lượng hoàn kho,Số lượng thất thoát,Trạng thái,Ghi chú đối soát',
      ...batchRows.map((b) =>
        [
          b.batchCode,
          b.itemType,
          b.unit,
          b.quantity,
          b.returnedQuantity,
          b.lostQuantity,
          b.status,
          b.reconciliationNote,
        ]
          .map(escapeCsv)
          .join(','),
      ),
      '',
      'IV. BIÊN BẢN CẤP PHÁT THỰC ĐỊA (DISTRIBUTION RECORDS)',
      'Mã Chuyến xe,Điểm cấp phát,Địa chỉ,Mã Lô,Hàng hóa,Đơn vị,SL cấp phát,Số hộ dân nhận,Người xác nhận,Thời gian xác nhận,Số ảnh minh chứng đã duyệt,Ghi chú',
      ...distributionRows.map((r) =>
        [
          r.tripCode,
          r.pointName,
          r.pointLocation,
          r.batchCode,
          r.itemType,
          r.unit,
          r.distributedQuantity,
          r.beneficiaryCount,
          r.confirmedBy,
          r.confirmedAt,
          r.approvedEvidenceCount,
          r.notes,
        ]
          .map(escapeCsv)
          .join(','),
      ),
    ];

    const csvContent = '\uFEFF' + csvLines.join('\r\n');

    // Build printable HTML / Excel-compatible document
    const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>Báo Cáo Nghiệm Thu Chiến Dịch - ${escapeHtml(event.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #1e293b; margin: 24px; line-height: 1.5; }
    h1 { color: #1f4d36; font-size: 20px; margin-bottom: 4px; }
    h2 { color: #1f4d36; font-size: 15px; margin-top: 24px; border-bottom: 2px solid #1f4d36; padding-bottom: 4px; }
    .meta { font-size: 13px; color: #475569; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
    th { background-color: #e6efe3; color: #1f4d36; font-weight: bold; }
    .num { text-align: right; }
    .signatures { margin-top: 40px; width: 100%; border: none; }
    .signatures td { border: none; text-align: center; width: 50%; vertical-align: top; padding-top: 16px; }
  </style>
</head>
<body>
  <h1>BÁO CÁO TỔNG KẾT NGHIỆM THU CHIẾN DỊCH CỨU TRỢ (OPENAID)</h1>
  <div class="meta">
    <div><strong>Chiến dịch:</strong> ${escapeHtml(event.title)} (${escapeHtml(event.status)})</div>
    <div><strong>Tổ chức điều phối:</strong> ${escapeHtml(event.organization.name)} (${escapeHtml(event.organization.code)})</div>
    <div><strong>Địa bàn cứu trợ:</strong> ${escapeHtml(event.location)}</div>
    <div><strong>Thời gian kết xuất:</strong> ${escapeHtml(generatedAt)}</div>
  </div>

  <h2>I. ĐỐI SOÁT TIẾP NHẬN - TỒN KHO - PHÂN PHỐI VẬT TƯ</h2>
  <table>
    <thead>
      <tr>
        <th>Hàng hóa</th><th>Đơn vị</th><th class="num">Mục tiêu</th><th class="num">Đã nhập kho</th>
        <th class="num">Tồn khả dụng</th><th class="num">Đang trên xe</th><th class="num">Đã cấp phát</th>
        <th class="num">Thất thoát</th><th class="num">Tỷ lệ đạt (%)</th>
      </tr>
    </thead>
    <tbody>
      ${overview.donationNeeds
        .map(
          (n) => `<tr>
        <td>${escapeHtml(n.itemType)}</td><td>${escapeHtml(n.unit)}</td>
        <td class="num">${n.targetQuantity}</td><td class="num">${n.receivedQuantity}</td>
        <td class="num">${n.availableQuantity}</td><td class="num">${n.reservedQuantity}</td>
        <td class="num">${n.distributedQuantity}</td><td class="num">${n.lostQuantity}</td>
        <td class="num">${n.fulfillmentRate}%</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h2>II. DANH SÁCH TIẾP NHẬN QUYÊN GÓP (${donationRows.length} khoản)</h2>
  <table>
    <thead>
      <tr>
        <th>Tracking ID</th><th>Nhà hảo tâm</th><th>Hàng hóa</th><th class="num">SL Cam kết</th>
        <th class="num">SL Nhập kho</th><th>Trạng thái</th><th>Mã Lô</th>
      </tr>
    </thead>
    <tbody>
      ${donationRows
        .map(
          (d) => `<tr>
        <td>${escapeHtml(d.trackingId)}</td><td>${escapeHtml(d.donorName)}</td>
        <td>${escapeHtml(d.itemType)} (${escapeHtml(d.unit)})</td>
        <td class="num">${d.quantity}</td><td class="num">${d.receivedQuantity}</td>
        <td>${escapeHtml(d.status)}</td><td>${escapeHtml(d.batchCode)}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h2>III. BIÊN BẢN CẤP PHÁT THỰC ĐỊA (${distributionRows.length} biên bản)</h2>
  <table>
    <thead>
      <tr>
        <th>Chuyến xe</th><th>Điểm cấp phát</th><th>Mã Lô</th><th>Hàng hóa</th>
        <th class="num">SL Cấp phát</th><th class="num">Số hộ dân</th><th>Người xác nhận</th><th>Ảnh duyệt</th>
      </tr>
    </thead>
    <tbody>
      ${distributionRows
        .map(
          (r) => `<tr>
        <td>${escapeHtml(r.tripCode)}</td><td>${escapeHtml(r.pointName)}</td>
        <td>${escapeHtml(r.batchCode)}</td><td>${escapeHtml(r.itemType)} (${escapeHtml(r.unit)})</td>
        <td class="num">${r.distributedQuantity}</td><td class="num">${r.beneficiaryCount}</td>
        <td>${escapeHtml(r.confirmedBy)}</td><td class="num">${r.approvedEvidenceCount}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <table class="signatures">
    <tr>
      <td><strong>ĐẠI DIỆN BAN TỔ CHỨC</strong><br/><em>(Ký, ghi rõ họ tên)</em><br/><br/><br/>${escapeHtml(event.contactName)}</td>
      <td><strong>XÁC NHẬN KIỂM TOÁN HỆ THỐNG OPENAID</strong><br/><em>(Trích xuất tự động từ Sổ cái Minh bạch)</em><br/><br/><br/>OpenAid Transparency Engine</td>
    </tr>
  </table>
</body>
</html>`;

    let fileName = `OpenAid_Report_${safeCode}.csv`;
    let mimeType = 'text/csv; charset=utf-8';
    let content = csvContent;

    if (format === 'excel' || format === 'xlsx' || format === 'xls') {
      fileName = `OpenAid_Report_${safeCode}.xls`;
      mimeType = 'application/vnd.ms-excel; charset=utf-8';
      content = '\uFEFF' + htmlContent;
    } else if (format === 'pdf' || format === 'html') {
      fileName = `OpenAid_Report_${safeCode}.html`;
      mimeType = 'text/html; charset=utf-8';
      content = htmlContent;
    }

    return {
      reportId: `REP-${safeCode}-${Date.now()}`,
      generatedAt,
      format: format === 'xlsx' || format === 'xls' ? 'excel' : format,
      fileName,
      mimeType,
      content,
      event: {
        id: event.id,
        title: event.title,
        status: event.status,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        organizationName: event.organization.name,
        organizationCode: event.organization.code,
        contactName: event.contactName,
        contactPhone: event.contactPhone,
      },
      summary: overview.stats,
      donationNeeds: overview.donationNeeds,
      volunteerRoles: overview.volunteerRoles,
      inventorySummary: overview.inventorySummary,
      donations: donationRows,
      batches: batchRows,
      trips: trips.map((t) => ({
        tripCode: t.tripCode,
        departurePoint: t.departurePoint,
        departureDate: t.departureDate,
        vehicle: t.vehicle,
        status: t.status,
        pointsCount: t.points.length,
      })),
      distributions: distributionRows,
      evidencesCount: evidences.length,
    };
  }
}
