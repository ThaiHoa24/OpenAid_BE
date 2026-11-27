# Theo dõi Đóng góp & Minh bạch (Tracking & Transparency) - Chi tiết

## 1. Triết lý Minh bạch OpenAid

**Minh bạch không phải là tính năng phụ — đó là cốt lõi.** Mọi hành động quan trọng trong OpenAid đều tạo ra **TransparencyLog** (nhật ký kiểm toán) bất biến, cho phép ai có quyền (hoặc công khai) truy vết lại được: *Ai làm gì, khi nào, thay đổi gì, bằng chứng gì.*

## 2. TransparencyLog (Nhật ký kiểm toán)

### 2.1 Cấu trúc
| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | UUID | Khóa chính |
| `eventId` | UUID? | Event liên quan (null cho system-level) |
| `action` | String | Hành động (vd: DONATION_RECEIVED, BATCH_CREATED) |
| `entityType` | Enum | Loại thực thể (TransparencyEntityType) |
| `entityId` | UUID | ID thực thể bị tác động |
| `actorId` | UUID | User thực hiện hành động |
| `oldStatus` | String? | Trạng thái cũ |
| `newStatus` | String? | Trạng thái mới |
| `evidenceId` | UUID? | Minh chứng liên quan (nếu có) |
| `details` | JSON | Chi tiết bổ sung (quantity, trackingId, batchCode...) |
| `isPublic` | Boolean | true = công khai, false = chỉ có quyền mới xem |
| `createdAt` | DateTime | Thời gian tạo |

### 2.2 TransparencyEntityType (Loại thực thể)
```
USER, ORGANIZATION, EVENT, VOLUNTEER_APPLICATION,
DONATION, INVENTORY, BATCH, TRIP,
DISTRIBUTION_POINT, DISTRIBUTION_RECORD, EVIDENCE
```

### 2.3 Action tiêu biểu theo Entity

| EntityType | Actions (isPublic thường = true) |
|------------|----------------------------------|
| EVENT | EVENT_STATUS_CHANGED (Publish/Close/Cancel) |
| DONATION | DONATION_PLEDGED, DONATION_RECEIVED, DONATION_REJECTED, DONATION_CANCELLED |
| BATCH | BATCH_CREATED, BATCH_READY, BATCH_RECONCILED |
| TRIP | TRIP_CREATED, TRIP_PREPARING, TRIP_IN_TRANSIT, TRIP_COMPLETED, TRIP_CANCELLED |
| DISTRIBUTION_POINT | POINT_ARRIVED, POINT_DISTRIBUTED, POINT_SKIPPED |
| DISTRIBUTION_RECORD | DISTRIBUTION_RECORDED |
| EVIDENCE | EVIDENCE_UPLOADED, EVIDENCE_APPROVED, EVIDENCE_REJECTED |
| VOLUNTEER_APPLICATION | VOLUNTEER_APPLIED, VOLUNTEER_APPROVED, VOLUNTEER_REJECTED, VOLUNTEER_CHECKED_IN, VOLUNTEER_CHECKED_OUT |
| ORGANIZATION | ORG_STATUS_CHANGED (Approve/Reject/Suspend) |
| USER | USER_ROLE_CHANGED (SystemRole/OrganizationRole) |

### 2.4 Ví dụ TransparencyLog entry
```json
{
  "id": "uuid",
  "eventId": "event-uuid",
  "action": "DISTRIBUTION_RECORDED",
  "entityType": "DISTRIBUTION_RECORD",
  "entityId": "record-uuid",
  "actorId": "organizer-uuid",
  "oldStatus": null,
  "newStatus": "DISTRIBUTED",
  "evidenceId": "evidence-uuid",
  "details": {
    "tripCode": "TRP-ABC123",
    "pointName": "Trung tâm xã Hòa Phước",
    "batchCode": "BAT-XYZ789",
    "distributedQuantity": 100,
    "beneficiaries": 25
  },
  "isPublic": true,
  "createdAt": "2026-11-20T10:15:00Z"
}
```

## 3. Tra cứu công khai (Public Tracking) — `/track/:trackingId`

### 3.1 Không cần đăng nhập
Bất kỳ ai có TrackingId đều có thể tra cứu hành trình đơn quyên góp.

### 3.2 Dữ liệu trả về (Public DTO Chain)
```
Donation (trackingId, item, quantity, status, event, org)
    │
    ├──► Batch (batchCode, quantity, distributed/returned/lost, status)
    │       │
    │       └──► Trip (tripCode, departurePoint, date, status)
    │               │
    │               ├──► DistributionPoints[] (name, address, order, status, arrivedAt, distributedAt)
    │               │       │
    │               │       └──► DistributionRecords[] (batchCode, item, unit, quantity, recordedAt)
    │               │
    │               └──► PublicEvidences[] (imageUrl, caption, pointName, uploadedAt)
    │                       ← Chỉ Evidence APPROVED + privacyConfirmed=true
    │
    └──► Timeline[] (Public TransparencyLogs liên quan)
            ← Chỉ log isPublic=true của Donation, Batch, Trip, Event
```

### 3.3 Timeline hiển thị cho người quyên góp
| Mốc | Action | Mô tả hiển thị |
|-----|--------|----------------|
| 1 | DONATION_PLEDGED | "Bạn đã cam kết quyên góp [quantity] [unit] [itemType]" |
| 2 | DONATION_RECEIVED | "Ban Tổ Chức đã tiếp nhận tại kho [timestamp]" |
| 3 | BATCH_CREATED | "Hiện vật được gom vào lô hàng [BatchCode]" |
| 4 | TRIP_CREATED | "Lô hàng được gán vào chuyến xe [TripCode] xuất phát từ [departurePoint]" |
| 5 | POINT_ARRIVED | "Chuyến xe đã đến điểm [PointName]" |
| 6 | DISTRIBUTION_RECORDED | "Đã phân phối [quantity] [unit] cho [beneficiaries] người tại [PointName]" |
| 7 | EVIDENCE_UPLOADED + APPROVED | "Có minh chứng ảnh bàn giao" (có thể click xem ảnh) |
| 8 | BATCH_RECONCILED | "Lô hàng đã đối soát: phân phối [X], trả về [Y], mất [Z]" |
| 9 | DONATION_DISTRIBUTED | "Đơn quyên góp của bạn đã đến tay người nhận" |

## 4. Thống kê Minh bạch (Transparency Stats)

### 4.1 Endpoint
`GET /transparency/stats?eventId=&organizationId=` (cần quyền Organizer/Admin)

### 4.2 Chỉ số quan trọng
| Metric | Mô tả | Công thức |
|--------|-------|-----------|
| `totalDonations` | Tổng số đơn quyên góp | COUNT(Donation) |
| `totalQuantityPledged` | Tổng lượng cam kết | SUM(Donation.quantity) |
| `totalQuantityReceived` | Tổng lượng đã nhận | SUM(Donation.receivedQuantity WHERE status!=CANCELLED/REJECTED) |
| `totalQuantityDistributed` | Tổng lượng đã phân phối | SUM(DistributionRecord.distributedQuantity) |
| `totalBatches` | Số lô hàng | COUNT(Batch) |
| `totalTrips` | Số chuyến xe | COUNT(Trip) |
| `totalVolunteers` | Số TNV đã duyệt | COUNT(VolunteerApplication WHERE status=APPROVED) |
| `totalVolunteerHours` | Tổng giờ TNV | SUM(checkedOutAt - checkedInAt) |
| `transparencyScore` | Điểm minh bạch | % Donation có full chain (Pledged→Distributed) + % Evidence APPROVED |

### 4.3 Phân quyền xem Stats
| Vai trò | Xem được |
|---------|----------|
| Admin | Toàn hệ thống, mọi Event/Org |
| Organizer | Chỉ Event của tổ chức mình |
| User/Guest | Không (chỉ tra cứu trackingId cá nhân) |

## 5. Timeline thực thể (Entity Timeline)

### 5.1 Endpoint
`GET /transparency/timeline?entityType=&entityId=&isPublicOnly=` 

### 5.2 Use cases
- **Organizer:** Xem full timeline Event/Batch/Trip/DistributionRecord để audit
- **Admin:** Xem timeline User/Organization/Official
- **Public (isPublicOnly=true):** Xem timeline công khai của Donation/Batch/Trip/Event

### 5.3 Response format
```json
[
  {
    "id": "log-uuid",
    "timestamp": "2026-11-20T10:15:00Z",
    "actorId": "user-uuid",
    "actorName": "Nguyễn Văn A",
    "actorRole": "ORGANIZER",
    "action": "DISTRIBUTION_RECORDED",
    "description": "Phân phối 100kg gạo tại xã Hòa Phước",
    "oldStatus": null,
    "newStatus": "DISTRIBUTED",
    "entityType": "DISTRIBUTION_RECORD",
    "entityId": "record-uuid",
    "eventId": "event-uuid"
  }
]
```

## 6. Minh chứng (Evidence) & Quy trình duyệt

### 6.1 Upload Evidence
- Tự động khi ghi `DistributionRecord` (atomic transaction)
- Hoặc upload riêng cho Trip/DistributionPoint
- Bắt buộc: `privacyConfirmed=true` (cam kết không vi phạm quyền riêng tư người nhận)

### 6.2 Review Evidence
**Endpoint:** `PATCH /evidence/:id/review` (Organizer/Admin)
- `reviewStatus`: APPROVED / REJECTED
- `reviewNote`: Ghi chú duyệt

### 6.3 Hiển thị công khai
Chỉ Evidence thỏa mãn **CẢ 2** điều kiện:
1. `reviewStatus = APPROVED`
2. `privacyConfirmed = true`

## 7. Các câu hỏi thường gặp về Minh bạch

**Q: TrackingId là gì? Có giống mã vận đơn không?**
A: TrackingId (`TRK-...`) là mã **duy nhất của đơn quyên góp**, khác mã vận đơn truyền thống. Nó liên kết **toàn bộ chuỗi**: Donation → Batch → Trip → DistributionPoint → Evidence. Mã vận đơn chỉ theo dõi chuyển phát, TrackingId theo dõi **cả quy trình nghiệp vụ**.

**Q: Tại sao đơn của tôi status RECEIVED nhưng không thấy Batch/Trip?**
A: Hàng đã về kho nhưng Organizer **chưa tạo Batch** hoặc **chưa gán Trip**. Liên hệ Organizer qua contactPhone trên Event để biết kế hoạch vận chuyển.

**Q: Evidence trên /track có bị che mặt người nhận không?**
A: **Bắt buộc** `privacyConfirmed=true` khi upload. Organizer/Admin duyệt (APPROVED) mới công khai. Nếu ảnh có mặt người nhận rõ ràng → Organizer sẽ REJECTED hoặc yêu cầu chụp lại (che mặt, chụp góc rộng).

**Q: Có thể xem timeline của Organization không?**
A: Admin xem được full. Public chỉ xem log `isPublic=true` của Organization (vd: ORG_STATUS_CHANGED APPROVED).

**Q: Thống kê minh bạch (transparencyScore) tính như nào?**
A: `% Donation có chuỗi đầy đủ (Pledged → Received → In Batch → In Transit → Distributed) + % Evidence APPROVED / Total DistributionPoints`. Điểm cao = quy trình vận hành chuẩn, minh bạch.

**Q: Làm sao biết Organizer có "giật" hàng không?**
A: Mọi bước đều có TransparencyLog: Receive (quantity), Batch Create (quantity), Trip Assign (batchCode), Distribution (quantity + evidence ảnh). So sánh quantity qua các mốc. Nếu mismatch → có log chứng minh.

**Q: Có API public để build widget tra cứu trên web khác không?**
A: Hiện tại chỉ `/transparency/track/:trackingId` public. Cần API key cho tích hợp sâu — liên hệ Admin.

## 8. Liên kết web

| Chức năng | Đường dẫn |
|-----------|-----------|
| Tra cứu minh bạch (public) | `/track` hoặc `/track/:trackingId` |
| Thống kê minh bạch (Organizer) | `/organizer/transparency` |
| Thống kê minh bạch (Admin) | `/admin/dashboard` (tab Transparency) |
| Timeline Event (Organizer) | `/organizer/transparency` → Chọn Event |
| Duyệt minh chứng (Organizer) | `/organizer/transparency` (tab Evidence) |
| Audit logs (Admin) | `/admin/dashboard` → Audit Logs |