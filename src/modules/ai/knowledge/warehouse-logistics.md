# Quản lý Kho, Đóng gói, Vận chuyển & Phân phối - Chi tiết

## 1. Tổng quan luồng vật流

```
Donation RECEIVED
      │
      ▼
Inventory (Tồn kho Event+ItemType+Unit)
      │
      ├──► Create Batch (DRAFT) ──► Batch READY
      │                              │
      │                              ▼
      │                        Create Trip
      │                              │
      │                              ▼
      │                        Batch ASSIGNED
      │                              │
      │                              ▼
      │                        Trip IN_TRANSIT
      │                              │
      │                              ▼
      │                        DistributionPoint: ARRIVED → DISTRIBUTED
      │                              │
      │                              ▼
      │                        DistributionRecord + Evidence
      │                              │
      │                              ▼
      └──────────────────► Batch RECONCILE (DISTRIBUTED)
                              │
                              ▼
                        Donation DISTRIBUTED
```

## 2. Inventory (Tồn kho)

### 2.1 Key & Uniqueness
- **Unique:** EventId + ItemTypeId + UnitId
- Mỗi Event có 1 Inventory record cho mỗi cặp ItemType+Unit có DonationNeed

### 2.2 Các trường lượng (Decimal)
| Trường | Ý nghĩa | Cập nhật khi |
|--------|---------|--------------|
| `receivedQuantity` | Tổng lượng đã nhận về kho | Receive Donation (+), Reconcile returned (+) |
| `availableQuantity` | Sẵn sàng dùng = received - reserved - distributed - lost | Tự động tính |
| `reservedQuantity` | Đã reserve cho Batch DRAFT/READY | Create Batch (+), Batch READY (giữ), Trip assign (-) |
| `distributedQuantity` | Đã phân phối qua Trip | DistributionRecord (+) |
| `lostQuantity` | Mất hỏng khi đối soát | Batch Reconcile (+) |

### 2.3 Công thức
```
availableQuantity = receivedQuantity - reservedQuantity - distributedQuantity - lostQuantity
```

### 2.4 API
- `GET /inventory/org/:organizationId?eventId=` — Xem tồn kho tổ chức (Organizer)
- Response: List Inventory với đầy đủ trường lượng, itemType, unit, event title

## 3. Batch (Lô hàng)

### 3.1 Khái niệm
**Batch** gom nhiều Donation cùng `itemTypeId` + `unitId` + `eventId` thành một lô hàng thống nhất để vận chuyển. Mỗi Batch có **BatchCode** duy nhất: `BAT-<timestamp>-<random>`

### 3.2 Tạo Batch (Create)
**Điều kiện:**
- Organizer của Event
- Danh sách `donationIds[]`: cùng itemType+unit+event, status=RECEIVED
- Tổng quantity ≤ Inventory.availableQuantity

**Hành động:**
1. Tạo Batch DRAFT, quantity = sum(donations.quantity)
2. Cập nhật Donation: batchId=batch.id, status=IN_BATCH
3. Inventory: availableQuantity -= quantity, reservedQuantity += quantity
4. TransparencyLog: BATCH_CREATED (isPublic=true)

### 3.3 Trạng thái Batch
| Status | Ý nghĩa | Chuyển tiếp |
|--------|---------|-------------|
| `DRAFT` | Vừa tạo, chưa confirm số lượng | READY (Organizer) |
| `READY` | Sẵn sàng gán Trip | ASSIGNED (khi gán Trip) |
| `ASSIGNED` | Đã gán vào Trip | DISTRIBUTED (sau reconcile) |
| `DISTRIBUTED` | Đã đối soát xong | (End) |

### 3.4 Cập nhật trạng thái
- `PATCH /batches/:id` — DRAFT → READY (Organizer)
- Gán Trip tự động chuyển READY → ASSIGNED

### 3.5 Đối soát Batch (Reconcile) — QUAN TRỌNG
**Khi:** Trip COMPLETED, cần kết thúc lô hàng
**Input:** `returnedQuantity`, `lostQuantity`, `note`
**Validate:** returned + lost ≤ batch.quantity
**Hành động (transaction):**
1. Batch: status=DISTRIBUTED, returnedQuantity, lostQuantity, reconciliationNote
2. Inventory: reservedQuantity -= batch.quantity; distributedQuantity += (batch.quantity - returned - lost); lostQuantity += lostQuantity; receivedQuantity += returnedQuantity
3. Donation trong Batch: status=DISTRIBUTED
4. TransparencyLog: BATCH_RECONCILED (isPublic=true)

### 3.6 API
- `POST /batches` — Tạo Batch
- `GET /batches/event/:eventId` — Danh sách Batch của Event
- `GET /batches/:id` — Chi tiết Batch (kèm donations, trip assignments)
- `PATCH /batches/:id` — DRAFT → READY
- `POST /batches/:id/reconcile` — Đối soát

## 4. Trip (Chuyến xe phân phối)

### 4.1 Khái niệm
**Trip** là một chuyến xe vận chuyển 1-n Batch từ kho đến các DistributionPoint. Có **TripCode**: `TRP-<timestamp>-<random>`

### 4.2 Tạo Trip
**Input:**
- `eventId`, `batchIds[]`, `volunteers[]` (applicationId + role), `points[]` (position, name, location, mapUrl), `departurePoint`, `departureDate`, `vehicle`

**Validate:**
- Tất cả Batch: cùng Event, status READY/DRAFT
- Tất cả VolunteerApplication: APPROVED, cùng Event, chưa gán Trip khác
- **Đúng 1 LEADER** trong volunteers
- Point positions unique

**Hành động (transaction):**
1. Tạo Trip SCHEDULED
2. Tạo TripBatch links, TripVolunteer links, DistributionPoints
3. Batch: status=READY → ASSIGNED
4. TransparencyLog: TRIP_CREATED (isPublic=true)

### 4.3 Trạng thái Trip
| Status | Ý nghĩa | Ai chuyển | Điều kiện |
|--------|---------|-----------|-----------|
| `SCHEDULED` | Vừa tạo, chờ xuất phát | Organizer | - |
| `PREPARING` | Đang chuẩn bị hàng, nạp xe | Organizer/Leader | - |
| `IN_TRANSIT` | Đang trên đường | Organizer/Leader | - |
| `COMPLETED` | Hoàn tất phân phối tất cả điểm | Organizer/Leader | Tất cả Point DISTRIBUTED/SKIPPED |
| `CANCELLED` | Huỷ chuyến | Organizer/Leader | Chưa có Point DISTRIBUTED |

### 4.4 Cập nhật Trip
`PATCH /trips/:id` — Cập nhật status (Organizer hoặc Trip Leader)
- COMPLETED: Validate tất cả Point đã DISTRIBUTED/SKIPPED
- CANCELLED: Validate chưa có Point DISTRIBUTED; Batch về READY

### 4.5 API
- `GET /trips/event/:eventId` — Danh sách Trip (Organizer/Volunteer gán)
- `GET /trips/:id` — Chi tiết Trip (kèm batches, volunteers, points, records, evidence)
- `POST /trips` — Tạo Trip
- `PATCH /trips/:id` — Cập nhật status

## 5. Distribution (Phân phối tại điểm)

### 5.1 DistributionPoint
Mỗi Trip có 1-n DistributionPoint theo thứ tự `position`:
- `name`, `location`, `mapUrl` (Google Maps link)
- Status: `PENDING` → `ARRIVED` → `DISTRIBUTED` / `SKIPPED`

**Cập nhật:** `PATCH /distribution/points/:id` (Organizer/Leader)
- ARRIVED: arrivedAt=now
- DISTRIBUTED: distributedAt=now
- SKIPPED: skippedReason (bắt buộc)

### 5.2 DistributionRecord (Bản ghi phân phối)
**Tạo khi:** Đến điểm, phân phát xong
**Input:** `tripBatchId`, `distributionPointId`, `distributedQuantity`, `beneficiaryCount`, `notes`
**Validate:** Tổng distributedQuantity của TripBatch ≤ Batch.quantity

**Atomic Transaction (QUAN TRỌNG):**
`POST /trips/:id/distribution-evidence` — Ghi nhận phân phối + Upload minh chứng **trong 1 transaction**
1. Tạo DistributionRecord
2. Cập nhật Point status=DISTRIBUTED, distributedAt=now
3. Cập nhật Batch.distributedQuantity += distributedQuantity
4. Tạo Evidence (PENDING review)
5. TransparencyLog: DISTRIBUTION_RECORDED + EVIDENCE_UPLOADED

### 5.3 Evidence (Minh chứng)
- `imageUrl`, `caption`, `privacyConfirmed` (bắt buộc true khi upload)
- `reviewStatus`: PENDING → APPROVED/REJECTED (Organizer/Admin duyệt)
- **Chỉ Evidence APPROVED + privacyConfirmed=true** hiển thị trên `/track` public

## 6. Luồng vận hành thực tế (Checklist Organizer)

### 6.1 Hàng ngày tại kho
1. Mở `/organizer/inventory` → Xem availableQuantity từng ItemType
2. Mở `/organizer/donations` tab "Đã tiếp nhận" → Chọn đơn để tạo Batch
3. `/organizer/batches` → "Tạo lô hàng mới" → Chọn đơn, confirm → Batch DRAFT
4. Review Batch → "Sẵn sàng" (READY)

### 6.2 Lên kế hoạch chuyến xe
1. `/organizer/trips` → "Tạo chuyến xe mới"
2. Chọn Batch READY, Volunteer APPROVED (chọn 1 Leader), thiết lập Points
3. Submit → Trip SCHEDULED, Batch → ASSIGNED

### 6.3 Ngày xuất phát
1. Trip Leader check hàng, nạp xe → Cập nhật Trip PREPARING → IN_TRANSIT
2. Đến điểm 1: Cập nhật Point ARRIVED
3. Phân phối xong: Dùng `/organizer/trips/:id` → "Ghi nhận phân phối" → Nhập quantity, beneficiary, notes, upload ảnh minh chứng → Submit (atomic)
4. Lặp lại cho các điểm tiếp theo

### 6.4 Kết thúc chuyến
1. Tất cả Point DISTRIBUTED/SKIPPED → Cập nhật Trip COMPLETED
2. `/organizer/batches` → Batch ASSIGNED → "Đối soát" → Nhập returned/lost, note → Submit
3. Batch → DISTRIBUTED, Donation → DISTRIBUTED, Inventory cập nhật

## 7. Các câu hỏi thường gặp

**Q: Batch DRAFT và READY khác gì?**
A: DRAFT = vừa tạo, chưa confirm chắc chắn số lượng. READY = Organizer đã kiểm tra, sẵn sàng gán Trip. Chỉ READY mới được gán Trip.

**Q: Tạo Batch xong muốn huỷ làm sao?**
A: Chỉ huỷ được khi Batch DRAFT. Nếu READY/ASSIGNED: phải huỷ Trip gán trước (nếu có), sau đó reconcile returned=quantity, lost=0.

**Q: Phân phối xong nhưng số lượng không khớp Batch?**
A: Khi reconcile: nhập `returnedQuantity` (hàng về kho) và `lostQuantity` (hỏng/mất). Hệ thống tự tính distributed = quantity - returned - lost.

**Q: Trip Leader và Organizer quyền gì khác nhau?**
A: **Trip Leader** (Volunteer được gán LEADER): Cập nhật Trip status, Point status, ghi DistributionRecord+Evidence. **Organizer**: Toàn quyền + tạo Trip, tạo Batch, reconcile Batch, duyệt Evidence.

**Q: Evidence bị REJECTED thì sao?**
A: Không hiển thị trên `/track` public. Organizer có thể upload lại Evidence mới cho DistributionRecord đó.

**Q: Có thể tách 1 Batch ra 2 Trip không?**
A: **Không.** 1 Batch chỉ gán được 1 Trip. Muốn tách: tạo 2 Batch riêng từ đầu.

**Q: Inventory availableQuantity âm được không?**
A: **Không.** Hệ thống validate khi tạo Batch: totalQuantity ≤ availableQuantity. Khi reconcile: distributedQuantity không vượt quantity.

## 8. Liên kết web

| Chức năng | Đường dẫn |
|-----------|-----------|
| Xem tồn kho (Organizer) | `/organizer/inventory` |
| Quản lý Batch (Organizer) | `/organizer/batches` |
| Tạo Batch mới | `/organizer/batches` (nút "Tạo lô hàng") |
| Chi tiết Batch | `/organizer/batches/:batchId` |
| Đối soát Batch | `/organizer/batches/:batchId` (nút "Đối soát") |
| Quản lý Trip (Organizer) | `/organizer/trips` |
| Tạo Trip mới | `/organizer/trips` (nút "Tạo chuyến xe") |
| Chi tiết Trip | `/organizer/trips/:tripId` |
| Ghi nhận phân phối + minh chứng | `/organizer/trips/:tripId` (tab "Phân phối") |
| Cập nhật điểm phát | `/organizer/trips/:tripId` (action trên Point) |
| Minh bạch & Đối soát | `/organizer/transparency` |