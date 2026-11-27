# Chức năng & Quy trình nghiệp vụ OpenAid

## 1. Quản lý Chiến dịch (Event Management)

### 1.1 Vòng đời Event
```
DRAFT → PUBLISHED → CLOSED
  ↓           ↓
CANCELLED  CANCELLED
```

- **DRAFT:** Chỉ Organizer của tổ chức sở hữu xem/sửa được. Cấu hình VolunteerRole, DonationNeed.
- **PUBLISHED:** Công khai cho mọi người xem, nhận quyên góp & đăng ký TNV. Admin hoặc Organizer đã duyệt mới được Publish.
- **CLOSED:** Kết thúc tự nhiên hoặc Organizer đóng. Không nhận thêm quyên góp/TNV.
- **CANCELLED:** Huỷ bỏ. Chỉ Admin hoặc Organizer (khi chưa có dữ liệu liên quan) được huỷ.

### 1.2 Tạo & Cấu hình Event (US-07, US-08)
**Đầu vào:** title, description, location, contactName/Phone, startDate/endDate, category, volunteerRoles[], donationNeeds[]

**VolunteerRole:** name, quantity, description (tùy chọn)
**DonationNeed:** itemTypeId, unitId, targetQuantity, notes (tùy chọn)

**Validate:**
- VolunteerRole name unique trong Event
- DonationNeed (itemTypeId + unitId) unique trong Event
- itemType & unit phải active trong catalog

### 1.3 Tìm kiếm & Lọc Event (US-10)
**Public (Guest/User):** Chỉ Event PUBLISHED (mặc định), có thể lọc CLOSED
**Organizer:** Xem tất cả Event của tổ chức mình (kể cả DRAFT)
**Admin:** Xem tất cả Event hệ thống

**Bộ lọc:** keyword (title/description/location/category), area (location), from/to (startDate), itemTypeId, status, organizationId

### 1.4 Thay đổi trạng thái (US-09)
**Cho phép:**
- DRAFT → PUBLISHED / CANCELLED
- PUBLISHED → CLOSED / CANCELLED
- CLOSED → PUBLISHED (chỉ Admin - reopen)
- CANCELLED: không chuyển trạng thái khác

**Phân quyền:**
- Admin: Mọi chuyển đổi hợp lệ
- Organizer: Chỉ tổ chức mình, không được Publish nếu Org chưa APPROVED
- User/Guest: Không được

---

## 2. Quyên góp Hiện vật (Donation Flow)

### 2.1 Tạo đơn quyên góp
**Điều kiện:** Event phải PUBLISHED
**Đầu vào:** donationNeedId, quantity, photoUrl (tùy chọn), notes (tùy chọn)
**Output:** Donation với trackingId (TRK-XXXX), status = PENDING

### 2.2 Tiếp nhận tại kho (Receive)
**Người thực hiện:** Organizer của Event
**Điều kiện:** Donation status = PENDING
**Hành động:** RECEIVED (cập nhật receivedQuantity = quantity, receivedAt, receivedById) hoặc REJECTED (lý do)
**Khi RECEIVED:** Tự động cập nhật Inventory: availableQuantity += quantity

### 2.3 Huỷ đơn quyên góp
**Người thực hiện:** Donor (chủ đơn)
**Điều kiện:** Donation status = PENDING
**Kết quả:** status = CANCELLED

### 2.4 Theo dõi đơn quyên góp (Tracking)
**Công khai:** /track/:trackingId (không cần đăng nhập)
**Thông tin hiển thị:**
- TrackingId, Item, Quantity, Status, CreatedAt, ReceivedAt
- Event: title, location
- Batch (nếu có): batchCode, status, Trip (nếu có): tripCode, status, điểm phát
- Timeline công khai (TransparencyLog isPublic=true)
- Minh chứng ảnh đã duyệt (Evidence APPROVED + privacyConfirmed)

---

## 3. Quản lý Kho & Lô hàng (Inventory & Batch)

### 3.1 Inventory (Tồn kho)
**Key:** EventId + ItemTypeId + UnitId (unique)
**Các trường lượng:**
- receivedQuantity: Tổng đã tiếp nhận
- availableQuantity: Sẵn sàng dùng (received - reserved - distributed - lost)
- reservedQuantity: Đã reserve cho Batch DRAFT/READY
- distributedQuantity: Đã phân phối qua Trip
- lostQuantity: Mất hỏng khi đối soát

**Cập nhật tự động:**
- Receive Donation → received↑, available↑
- Create Batch → available↓, reserved↑
- Batch READY → reserved không đổi
- Trip Distribution → reserved↓, distributed↑
- Batch Reconcile (returned/lost) → reserved↓, returned/lost cập nhật

### 3.2 Batch (Lô hàng)
**Key:** batchCode unique, liên kết Inventory (Event+ItemType+Unit)
**Tạo từ:** Danh sách DonationIds (cùng itemType+unit, status=RECEIVED)
**Validate:** Tổng quantity ≤ Inventory.availableQuantity
**Trạng thái:** DRAFT → READY → ASSIGNED → DISTRIBUTED
- **DRAFT:** Vừa tạo, chưa confirm
- **READY:** Sẵn sàng gán Trip
- **ASSIGNED:** Đã gán vào Trip
- **DISTRIBUTED:** Đã đối soát xong (reconcile)

**Reconcile (Đối soát):** Nhập returnedQuantity, lostQuantity, note → Cập nhật Batch, Inventory, Donation status=DISTRIBUTED

---

## 4. Vận chuyển & Phân phối (Trip & Distribution)

### 4.1 Trip (Chuyến xe)
**Tạo từ:** EventId, batchIds[], volunteers[] (applicationId + role), points[] (position, name, location, mapUrl)
**Validate:**
- Tất cả Batch cùng Event, status READY/DRAFT
- Tất cả VolunteerApplication APPROVED, cùng Event
- Có đúng 1 LEADER
- Point positions unique

**Trạng thái:** SCHEDULED → PREPARING → IN_TRANSIT → COMPLETED / CANCELLED
**Cập nhật:** Organizer hoặc Trip Leader

### 4.2 DistributionPoint (Điểm phát)
**Thuộc Trip:** position (thứ tự), name, location, mapUrl
**Trạng thái:** PENDING → ARRIVED → DISTRIBUTED / SKIPPED

### 4.3 DistributionRecord (Bản ghi phân phối)
**Tạo tại:** TripBatch + DistributionPoint
**Đầu vào:** distributedQuantity, beneficiaryCount, notes
**Validate:** Tổng distributedQuantity của TripBatch ≤ Batch.quantity
**Tự động:** Cập nhật Point status = DISTRIBUTED, distributedAt

### 4.4 Evidence (Minh chứng)
**Upload khi:** Ghi DistributionRecord (atomic transaction)
**Trạng thái duyệt:** PENDING → APPROVED / REJECTED
**Công khai:** Chỉ Evidence APPROVED + privacyConfirmed=true hiển thị trên /track

### 4.5 Ghi nhận phân phối + Minh chứng (Atomic)
**Endpoint:** `recordDistributionWithEvidence` (TripsService)
**Trong 1 transaction:** Tạo DistributionRecord + Cập nhật Point + Tạo Evidence + TransparencyLog
**Đảm bảo:** Nếu upload evidence fail → rollback distribution record

---

## 5. Tình nguyện viên (Volunteer Flow)

### 5.1 Đăng ký
**Điều kiện:** Event PUBLISHED, VolunteerRole còn slot (approved < quantity)
**Ràng buộc:** 1 User chỉ đăng ký 1 Role / 1 Event
**Status:** PENDING

### 5.2 Duyệt đơn
**Người duyệt:** Organizer của Event
**Validate khi APPROVED:** Slot còn trống
**Status:** APPROVED / REJECTED (có rejectionReason)

### 5.3 Check-in / Check-out
**Check-in:** Chỉ APPROVED, Event không CANCELLED, chưa check-in
**Check-out:** Đã check-in, chưa check-out
**Người thao tác:** Tự check-in/out hoặc Organizer/Trip Leader

### 5.4 Trip Assignment
**Tạo Trip:** Gán VolunteerApplication đã APPROVED vào Trip (Leader/Member)
**1 Application chỉ được gán 1 Trip / Event**

---

## 6. Minh bạch & Kiểm toán (Transparency)

### 6.1 TransparencyLog
**Ghi nhận:** Mọi thay đổi trạng thái quan trọng (Event, Donation, Batch, Trip, Point, VolunteerApp, Evidence...)
**Cấu trúc:** action, entityType, entityId, actorId, oldStatus, newStatus, details (JSON), isPublic
**Truy vấn:**
- Admin: Xem tất cả log (pagination)
- Public: Chỉ log isPublic=true
- Entity timeline: Theo entityType+entityId (công khai hoặc private theo quyền)

### 6.2 Tra cứu công khai (Public Tracking)
**Input:** trackingId
**Output:** Donation info + Batch + Trip + Points + Records + Public Evidences + Public Timeline
**Không cần:** Authentication

---

## 7. Tổ chức & Phân quyền (Organization & RBAC)

### 7.1 Organization
**Trạng thái:** PENDING → APPROVED / REJECTED / SUSPENDED
**Chỉ Org APPROVED mới được Publish Event**

### 7.2 OrganizationMember
**Role:** MEMBER / ORGANIZER
**1 User có thể là member của nhiều Org**

### 7.3 SystemRole (User)
**USER** (mặc định) / **ADMIN**

### 7.4 Ma trận quyền truy xuất dữ liệu

| Dữ liệu | Guest | User | Organizer (org mình) | Admin |
|---------|-------|------|---------------------|-------|
| Event PUBLISHED | ✓ | ✓ | ✓ | ✓ |
| Event DRAFT/CLOSED/CANCELLED | ✗ | ✗ | ✓ (org mình) | ✓ |
| DonationNeed công khai | ✓ | ✓ | ✓ | ✓ |
| Donation tracking công khai | ✓ | ✓ | ✓ | ✓ |
| Donation cá nhân (my donations) | ✗ | ✓ | ✓ | ✓ |
| VolunteerRole công khai | ✓ | ✓ | ✓ | ✓ |
| VolunteerApplication cá nhân | ✗ | ✓ | ✓ (event org mình) | ✓ |
| Inventory/Batch/Trip | ✗ | ✗ | ✓ (event org mình) | ✓ |
| DistributionRecord/Evidence | ✗ (chỉ public evidence) | ✗ | ✓ (event org mình) | ✓ |
| TransparencyLog (all) | ✗ | ✗ | ✓ (event org mình) | ✓ |
| TransparencyLog (public) | ✓ | ✓ | ✓ | ✓ |
| Organization management | ✗ | ✗ | ✗ | ✓ |
| User management | ✗ | ✗ | ✗ | ✓ |

---

## 8. Catalog dữ liệu tham chiếu

### 8.1 ItemType (Loại hàng)
- code unique, name, category, isActive
- Ví dụ: Gạo (FOOD), Áo ấm (CLOTHING), Sách vở (EDUCATION), Thuốc/Y tế (MEDICAL)

### 8.2 Unit (Đơn vị)
- code unique, name, isActive
- Ví dụ: kg, gói, hộp, cái, bộ, chai, lọ

---

## 9. API Endpoints tóm tắt (cho Function Calling)

### Events
- `GET /events` - Lọc, tìm kiếm (public)
- `GET /events/:id` - Chi tiết (public/org)
- `POST /events` - Tạo (Organizer)
- `PATCH /events/:id` - Cập nhật (Organizer)
- `PATCH /events/:id/status` - Thay đổi trạng thái (Organizer/Admin)

### Donations
- `POST /donations` - Tạo đơn (User)
- `GET /donations/my` - Lịch sử cá nhân (User)
- `GET /donations/event/:eventId` - Quản lý đơn (Organizer)
- `PATCH /donations/:id/receive` - Tiếp nhận/huỷ (Organizer)
- `DELETE /donations/:id` - Huỷ đơn (Donor)

### Volunteers
- `POST /volunteers` - Đăng ký (User)
- `GET /volunteers/my` - Lịch sử cá nhân (User)
- `GET /volunteers/event/:eventId` - Danh sách duyệt (Organizer)
- `PATCH /volunteers/:id/review` - Duyệt/huỷ (Organizer)
- `POST /volunteers/:id/check-in` - Check-in
- `POST /volunteers/:id/check-out` - Check-out

### Inventory & Batch
- `GET /inventory/org/:orgId` - Tồn kho tổ chức (Organizer)
- `POST /batches` - Tạo Batch (Organizer)
- `GET /batches/event/:eventId` - Danh sách Batch (Organizer)
- `GET /batches/:id` - Chi tiết Batch (Organizer)
- `PATCH /batches/:id` - Cập nhật trạng thái (Organizer)
- `POST /batches/:id/reconcile` - Đối soát (Organizer)

### Trips & Distribution
- `GET /trips/event/:eventId` - Danh sách Trip (Organizer/Volunteer)
- `GET /trips/:id` - Chi tiết Trip (Organizer/Volunteer)
- `POST /trips` - Tạo Trip (Organizer)
- `PATCH /trips/:id` - Cập nhật trạng thái (Organizer/Leader)
- `POST /trips/:id/distribution-evidence` - Ghi nhận phân phối + minh chứng (Organizer/Leader)
- `PATCH /distribution/points/:id` - Cập nhật điểm phát (Organizer/Leader)

### Transparency
- `GET /transparency/logs` - Audit logs (Admin)
- `GET /transparency/timeline` - Timeline entity (Public/Private)
- `GET /transparency/track/:trackingId` - Tra cứu công khai (Public)

### Organizations
- `GET /organizations` - Danh sách (Admin/Organizer)
- `GET /organizations/:id` - Chi tiết
- `POST /organizations` - Đăng ký Org
- `PATCH /organizations/:id/review` - Duyệt (Admin)