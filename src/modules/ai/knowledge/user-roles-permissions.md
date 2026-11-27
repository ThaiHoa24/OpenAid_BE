# Vai trò & Quyền hạn Người dùng (RBAC) - Chi tiết

## 1. Tổng quan mô hình phân quyền

OpenAid sử dụng **RBAC (Role-Based Access Control)** hai cấp:
1. **SystemRole** (Hệ thống): USER / ADMIN — áp dụng toàn nền tảng
2. **OrganizationRole** (Tổ chức): MEMBER / ORGANIZER — áp dụng trong từng Organization

Kết hợp với **OrgStatus**: PENDING / APPROVED / REJECTED / SUSPENDED

## 2. SystemRole (Vai trò hệ thống)

### 2.1 USER (Mặc định)
- Tài khoản thông thường đăng ký trên OpenAid
- Có thể: Xem Event công khai, quyên góp, đăng ký TNV, tra cứu trackingId, xem lịch sử cá nhân
- Không thể: Quản lý tổ chức, tạo Event, duyệt TNV, xem báo cáo admin

### 2.2 ADMIN
- Ban Quản Trị Nền Tảng (Platform Admin)
- **Full access** mọi dữ liệu, mọi chức năng
- Quản lý: Organization (duyệt/huỷ), User (khóa/mở), Event (kiểm toán), Transparency (audit logs)
- Xem: Dashboard hệ thống, thống kê tổng hợp, audit logs toàn bộ

## 3. OrganizationRole (Vai trò trong tổ chức)

### 3.1 MEMBER
- Thành viên cơ bản của Organization
- Có thể: Xem thông tin Org, tham gia Event của Org (nếu được phân công)
- Không thể: Tạo/sửa Event, duyệt TNV/Quyên góp, quản lý kho/batch/trip

### 3.2 ORGANIZER
- Người điều phối hoạt động của Organization
- **Full quyền trên dữ liệu Organization mình:**
  - Event: Tạo, sửa, Publish, Close, Cancel, xem tất cả trạng thái
  - Donation: Tiếp nhận/Reject, tạo Batch, xem tất cả đơn
  - Volunteer: Duyệt/Từ chối đơn, check-in/out, gán Trip
  - Inventory: Xem tồn kho, tạo Batch
  - Batch: Tạo, READY, Reconcile
  - Trip: Tạo, cập nhật status, ghi nhận phân phối+minh chứng
  - Transparency: Xem stats, timeline, duyệt Evidence
  - Organization: Cập nhật thông tin, quản lý thành viên (thêm/xoá/sửa role)

## 4. OrgStatus (Trạng thái tổ chức)

| Status | Ý nghĩa | Có tạo Event? | Có Publish Event? |
|--------|---------|---------------|-------------------|
| `PENDING` | Vừa đăng ký, chờ Admin duyệt | ✓ (DRAFT) | ✗ |
| `APPROVED` | Đã duyệt, hoạt động bình thường | ✓ | ✓ |
| `REJECTED` | Từ chối | ✗ | ✗ |
| `SUSPENDED` | Tạm khóa (vi phạm, kiểm tra) | ✗ | ✗ |

**Quy tắc:** Chỉ Organization `APPROVED` mới được **Publish Event** (PUBLISHED). Organizer của Org PENDING/REJECTED/SUSPENDED chỉ được tạo DRAFT.

## 5. Ma trận quyền chi tiết

### 5.1 Event (Chiến dịch)

| Hành động | Guest | User | Organizer (org Event) | Admin |
|-----------|-------|------|----------------------|-------|
| Xem danh sách PUBLISHED | ✓ | ✓ | ✓ | ✓ |
| Xem chi tiết PUBLISHED | ✓ | ✓ | ✓ | ✓ |
| Xem DRAFT/CLOSED/CANCELLED | ✗ | ✗ | ✓ | ✓ |
| Tạo Event mới | ✗ | ✗ | ✓* | ✓ |
| Cập nhật Event (DRAFT) | ✗ | ✗ | ✓ | ✓ |
| Publish Event (DRAFT→PUBLISHED) | ✗ | ✗ | ✓** | ✓ |
| Close/Cancel Event | ✗ | ✗ | ✓ | ✓ |
| Xóa Event (DRAFT, no data) | ✗ | ✗ | ✓ | ✓ |
| Xem VolunteerRole/DonationNeed | ✓ | ✓ | ✓ | ✓ |

*Chỉ Organizer của Organization đó
**Chỉ khi Organization đã APPROVED

### 5.2 Donation (Quyên góp)

| Hành động | Guest | User | Organizer (org Event) | Admin |
|-----------|-------|------|----------------------|-------|
| Tạo đơn quyên góp | ✗ | ✓ | ✓ | ✓ |
| Xem đơn của mình (my donations) | ✗ | ✓ | ✓ | ✓ |
| Xem tất cả đơn Event | ✗ | ✗ | ✓ | ✓ |
| Tiếp nhận/Reject đơn (PENDING) | ✗ | ✗ | ✓ | ✓ |
| Huỷ đơn của mình (PENDING) | ✗ | ✓ | ✓ | ✓ |
| Tra cứu trackingId công khai | ✓ | ✓ | ✓ | ✓ |

### 5.3 Volunteer (Tình nguyện)

| Hành động | Guest | User | Organizer (org Event) | Admin |
|-----------|-------|------|----------------------|-------|
| Đăng ký TNV | ✗ | ✓ | ✓ | ✓ |
| Xem đơn của mình (my activities) | ✗ | ✓ | ✓ | ✓ |
| Xem tất cả đơn Event | ✗ | ✗ | ✓ | ✓ |
| Duyệt/Từ chối đơn | ✗ | ✗ | ✓ | ✓ |
| Check-in/Check-out | ✗ | ✓* | ✓ | ✓ |
| Gán Trip (Leader/Member) | ✗ | ✗ | ✓ | ✓ |

*User tự check-in/out đơn của mình (nếu APPROVED)

### 5.4 Inventory, Batch, Trip, Distribution

| Hành động | Guest | User | Organizer (org Event) | Admin |
|-----------|-------|------|----------------------|-------|
| Xem Inventory | ✗ | ✗ | ✓ | ✓ |
| Tạo Batch | ✗ | ✗ | ✓ | ✓ |
| Cập nhật Batch (DRAFT→READY) | ✗ | ✗ | ✓ | ✓ |
| Reconcile Batch | ✗ | ✗ | ✓ | ✓ |
| Tạo Trip | ✗ | ✗ | ✓ | ✓ |
| Cập nhật Trip status | ✗ | ✗ | ✓ | ✓ |
| Ghi DistributionRecord + Evidence | ✗ | ✗ | ✓ | ✓ |
| Cập nhật DistributionPoint | ✗ | ✗ | ✓ | ✓ |
| Xem Evidence (APPROVED, public) | ✓ | ✓ | ✓ | ✓ |
| Duyệt Evidence | ✗ | ✗ | ✓ | ✓ |

### 5.5 Transparency & Tracking

| Hành động | Guest | User | Organizer (org Event) | Admin |
|-----------|-------|------|----------------------|-------|
| Tra cứu trackingId public | ✓ | ✓ | ✓ | ✓ |
| Xem Public Timeline | ✓ | ✓ | ✓ | ✓ |
| Xem Private Timeline (Event org) | ✗ | ✗ | ✓ | ✓ |
| Xem Transparency Stats | ✗ | ✗ | ✓ | ✓ |
| Xem Audit Logs (all) | ✗ | ✗ | ✗ | ✓ |

### 5.6 Organization Management

| Hành động | Guest | User | Organizer (org mình) | Admin |
|-----------|-------|------|----------------------|-------|
| Đăng ký Organization mới | ✗ | ✓ | ✓ | ✓ |
| Xem Org của mình | ✗ | ✓ | ✓ | ✓ |
| Cập nhật thông tin Org | ✗ | ✗ | ✓ | ✓ |
| Quản lý thành viên (thêm/xoá/sửa role) | ✗ | ✗ | ✓ | ✓ |
| Duyệt/Từ chối Org | ✗ | ✗ | ✗ | ✓ |
| Suspend/Unsuspend Org | ✗ | ✗ | ✗ | ✓ |
| Xem tất cả Org | ✗ | ✗ | ✗ | ✓ |

### 5.7 User Management

| Hành động | Guest | User | Organizer | Admin |
|-----------|-------|------|-----------|-------|
| Đăng ký tài khoản | ✓ | ✓ | ✓ | ✓ |
| Đăng nhập/Đăng xuất | ✓ | ✓ | ✓ | ✓ |
| Cập nhật hồ sơ cá nhân | ✗ | ✓ | ✓ | ✓ |
| Xem danh sách User | ✗ | ✗ | ✗ | ✓ |
| Khóa/Mở tài khoản User | ✗ | ✗ | ✗ | ✓ |
| Đổi SystemRole User | ✗ | ✗ | ✗ | ✓ |

## 6. Kiểm tra quyền trong Backend (Implementation)

### 6.1 Decorators & Guards
```typescript
// Controller level
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(SystemRole.ADMIN)  // Chỉ Admin

// Hoặc custom guard trong Service
await this.organizationAccessService.requireOrganizer(userId, organizationId);
await this.organizationAccessService.requireEventOrganizer(userId, eventId);
await this.organizationAccessService.requireApprovedOrganizer(userId, organizationId);
```

### 6.2 OrganizationAccessService (Core)
```typescript
// Kiểm tra User là ORGANIZER của Organization
async requireOrganizer(userId: string, organizationId: string)

// Kiểm tra User là ORGANIZER của Organization đã APPROVED
async requireApprovedOrganizer(userId: string, organizationId: string)

// Kiểm tra User là ORGANIZER của Organization sở hữu Event
async requireEventOrganizer(userId: string, eventId: string)
```

### 6.3 CurrentUser Decorator
```typescript
@CurrentUser('id') userId: string
@CurrentUser() user: AuthenticatedUser { id, email, fullName, systemRole }
```

## 7. Luồng xác thực & Phân quyền cho AI Function Calling

### 7.1 Guest (chưa đăng nhập)
- Chỉ gọi được: `search_events`, `get_event_detail`, `get_event_status`, `track_donation`, `get_feature_links`, `get_organization_info` (public)
- **Không** truyền `userId` vào function args

### 7.2 User (đã đăng nhập, systemRole=USER)
- Gọi thêm: `get_my_donations`, `get_my_volunteer_applications`
- Backend tự lấy `userId` từ JWT → lọc dữ liệu theo `donorId=userId` hoặc `userId=userId`

### 7.3 Organizer (systemRole=USER + OrganizationRole=ORGANIZER)
- Gọi thêm: `search_volunteer_opportunities` (có filter org), `get_batch_detail`, `get_trip_detail`, `get_transparency_stats`
- Backend validate: `requireEventOrganizer(userId, eventId)` hoặc `requireOrganizer(userId, orgId)`

### 7.4 Admin (systemRole=ADMIN)
- Gọi tất cả functions, bỏ qua kiểm tra org/event ownership
- Backend check `systemRole === ADMIN` → skip OrganizationAccessService

## 8. Các câu hỏi thường gặp

**Q: Tôi là User, tại sao không thấy nút "Tạo chiến dịch"?**
A: Chỉ **Organizer** của Organization đã **APPROVED** mới thấy. Bạn cần: (1) Tạo/Tham gia Organization, (2) Nhờ Admin duyệt Org APPROVED, (3) Nhờ Organizer hiện tại thêm bạn làm ORGANIZER.

**Q: Organizer của Org A có xem Event của Org B không?**
A: **Không.** Organizer chỉ truy xuất dữ liệu Event/Donation/Volunteer/Batch/Trip của **Organization mình**. Admin mới xem cross-org.

**Q: VolunteerApplication REJECTED có còn trong timeline không?**
A: Có. TransparencyLog ghi `VOLUNTEER_REJECTED` (isPublic=false). Organizer/Admin xem được, User xem được lịch sử cá nhân.

**Q: Làm sao để thành Organizer?**
A: Cách 1: Tạo Organization mới → Admin duyệt APPROVED → Tự động thành Organizer. Cách 2: Nhờ Organizer hiện tại của Org thêm bạn qua `/organizer/organization` → Quản lý thành viên → Thêm ORGANIZER.

**Q: SystemRole ADMIN khác OrganizationRole ORGANIZER ra sao?**
A: **ADMIN** = quản trị toàn nền tảng (mọi Org, mọi User, audit logs). **ORGANIZER** = điều phối 1 Organization cụ thể. 1 User có thể vừa là ADMIN vừa là ORGANIZER.

**Q: Organization SUSPENDED thì Organizer còn quyền gì?**
A: Chỉ xem dữ liệu lịch sử. **Không thể** tạo Event mới, Publish, tiếp nhận Donation, tạo Batch/Trip. Cần Admin unsuspend.

## 9. Tóm tắt nhanh cho AI

| Nếu User hỏi... | Kiểm tra quyền | Function gọi |
|-----------------|----------------|--------------|
| "Tạo chiến dịch" | systemRole=ADMIN OR (OrgRole=ORGANIZER AND OrgStatus=APPROVED) | create_event (chưa có, sẽ thêm) |
| "Duyệt đơn TNV" | OrgRole=ORGANIZER của Event org | review_volunteer_application |
| "Xem kho của tôi" | OrgRole=ORGANIZER | get_organization_inventory |
| "Thống kê minh bạch" | OrgRole=ORGANIZER (event org) OR Admin | get_transparency_stats |
| "Lịch sử quyên góp tôi" | Authenticated User | get_my_donations |
| "Đơn đăng ký TNV tôi" | Authenticated User | get_my_volunteer_applications |

**Lưu ý:** AI **KHÔNG** tự quyết định quyền. Mọi function call đều được **Backend validate lại** trước khi query DB. AI chỉ cần truyền đúng parameters, Backend lo phần authorize.