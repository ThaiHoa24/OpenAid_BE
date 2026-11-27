# Chiến dịch Cứu trợ (Events) - Chi tiết

## 1. Khái niệm

**Chiến dịch (Event)** là đơn vị tổ chức cấp cao nhất trong OpenAid, đại diện cho một hoạt động cứu trợ cụ thể tại một địa điểm, khung thời gian xác định, với các nhu cầu quyên góp và vị trí tình nguyện viên được định nghĩa rõ ràng.

Mỗi Event thuộc về một **Organization** (Tổ chức từ thiện) và do một **Organizer** (Người điều phối) tạo ra.

## 2. Các loại chiến dịch theo Category

| Category | Mô tả | Ví dụ |
|----------|-------|-------|
| `Cứu trợ khẩn cấp` | Phản ứng nhanh đối với thiên tai, dịch bệnh | Hỗ trợ vùng ngập lụt, động đất |
| `Giáo dục & Trẻ em` | Hỗ trợ học tập, đồ dùng cá nhân cho trẻ em | Tặng balo, sách vở, áo ấm mùa đông |
| `An sinh cộng đồng` | Hoạt động định kỳ hỗ trợ nhóm yếu thế | Bếp ăn 0 đồng, khám chữa bệnh miễn phí |
| `Y tế & Sức khỏe` | Cung cấp trang thiết bị, thuốc men, y tế | Tặng xe lăn, máy tạo oxy, hộp cấp cứu |
| `Cứu trợ hiện vật` | Tổng quát các chiến dịch nhận hàng hóa vật chất | Tuyển tập quần áo, thực phẩm khô |

## 3. Cấu trúc thông tin chiến dịch

### 3.1 Thông tin cơ bản
| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `title` | ✓ | Tên chiến dịch (vd: "Hỗ trợ nhu yếu phẩm vùng ngập Hòa Vang") |
| `description` | | Mô tả chi tiết, bối cảnh, mục tiêu |
| `location` | ✓ | Địa điểm tổ chức (tỉnh/huyện/xã cụ thể) |
| `contactName` | ✓ | Tên người liên hệ Ban Tổ Chức |
| `contactPhone` | | SĐT liên hệ |
| `startDate` | ✓ | Thời gian bắt đầu |
| `endDate` | | Thời gian kết thúc (tùy chọn) |
| `category` | | Phân loại (xem bảng Category) |
| `status` | ✓ | DRAFT / PUBLISHED / CLOSED / CANCELLED |

### 3.2 Nhu cầu quyên góp (DonationNeed)
Mỗi Event có 1-n DonationNeed, mỗi need định nghĩa:
- `itemTypeId` + `unitId`: Loại hàng & đơn vị (unique trong Event)
- `targetQuantity`: Mục tiêu số lượng cần quyên góp
- `notes`: Ghi chú (vd: "Ưu tiên gạo thơm, hạn dùng > 6 tháng")

**Tiến độ tự động tính:**
- `pledgedQuantity`: Tổng quantity các Donation (PENDING+RECEIVED+IN_BATCH+DISTRIBUTED)
- `receivedQuantity`: Tổng receivedQuantity các Donation (RECEIVED+IN_BATCH+DISTRIBUTED)
- `remainingQuantity`: max(0, targetQuantity - receivedQuantity)
- `fillRatio`: receivedQuantity / targetQuantity

### 3.3 Vị trí tình nguyện viên (VolunteerRole)
Mỗi Event có 1-n VolunteerRole:
- `name`: Tên vị trí (vd: "Phân loại kho", "Điều phối vận chuyển", "Hỗ trợ hiện trường")
- `quantity`: Số lượng TNV cần cho vị trí này
- `description`: Mô tả nhiệm vụ, kỹ năng yêu cầu

**Trạng thái tuyển:**
- `approvedQuantity`: Số đơn APPROVED
- `remainingSlots`: max(0, quantity - approvedQuantity)

## 4. Trạng thái & Hành động

### 4.1 Bảng trạng thái Event
| Status | Ý nghĩa | Ai thấy | Có nhận quyên góp/TNV? |
|--------|---------|---------|------------------------|
| DRAFT | Nháp, đang soạn thảo | Organizer, Admin | Không |
| PUBLISHED | Đang diễn ra, công khai | Mọi người | Có |
| CLOSED | Đã kết thúc | Mọi người | Không |
| CANCELLED | Đã huỷ | Organizer, Admin | Không |

### 4.2 Chuyển trạng thái hợp lệ
```
DRAFT ──► PUBLISHED (Organizer/Admin, Org phải APPROVED)
   │
   └──► CANCELLED (Organizer/Admin)

PUBLISHED ──► CLOSED (Organizer/Admin)
   │
   └──► CANCELLED (Organizer/Admin)

CLOSED ──► PUBLISHED (Chỉ Admin - reopen)
CANCELLED: Không chuyển tiếp
```

### 4.3 Hành động theo vai trò

| Hành động | Guest | User | Organizer (org Event) | Admin |
|-----------|-------|------|----------------------|-------|
| Xem danh sách PUBLISHED | ✓ | ✓ | ✓ | ✓ |
| Xem chi tiết PUBLISHED | ✓ | ✓ | ✓ | ✓ |
| Xem DRAFT/CLOSED/CANCELLED | ✗ | ✗ | ✓ | ✓ |
| Tạo Event mới | ✗ | ✗ | ✓ | ✓ |
| Cập nhật Event (DRAFT) | ✗ | ✗ | ✓ | ✓ |
| Publish Event | ✗ | ✗ | ✓* | ✓ |
| Close/Cancel Event | ✗ | ✗ | ✓ | ✓ |
| Xóa Event (chỉ DRAFT, không có data liên quan) | ✗ | ✗ | ✓ | ✓ |

*Organizer chỉ Publish được nếu Organization đã APPROVED

## 5. Tìm kiếm & Lọc chiến dịch (Public API)

**Endpoint:** `GET /events`

**Query params:**
| Param | Type | Mô tả |
|-------|------|-------|
| `search` | string | Tìm trong title, description, location, category |
| `area` | string | Lọc theo location (contains, case-insensitive) |
| `category` | string | Lọc theo category chính xác |
| `status` | enum | PUBLISHED (mặc định), CLOSED, ALL (Organizer/Admin) |
| `itemTypeId` | UUID | Lọc Event có DonationNeed itemType này |
| `from` | ISO date | startDate >= from |
| `to` | ISO date | startDate <= to |
| `organizationId` | UUID | Chỉ Organizer/Admin của org đó |
| `skip` | int | Pagination (mặc định 0) |
| `take` | int | Page size (mặc định 20, max 100) |

**Response:** Danh sách Event enriched với:
- organization.name
- donationNeeds: targetQuantity, pledgedQuantity, receivedQuantity, remainingQuantity, itemType, unit
- volunteerRoles: quantity, approvedQuantity, remainingSlots

## 6. Chi tiết chiến dịch (Public API)

**Endpoint:** `GET /events/:id`

**Response bao gồm:**
- Toàn bộ thông tin cơ bản
- organization: id, name, code, email, phone, address
- donationNeeds: đầy đủ tiến độ (target/pledged/received/remaining/fillRatio)
- volunteerRoles: đầy đủ tiến độ (quantity/approved/remaining)
- createdBy: id, fullName
- timestamps

## 7. Cách người dùng tương tác

### 7.1 Nhà hảo tâm (Donor)
1. Vào `/events` → Lọc theo khu vực, loại hàng muốn cho
2. Click vào Event → Xem `/events/:id` → Xem **Nhu cầu đang thiếu** (remainingQuantity > 0)
3. Click "Quyên góp ngay" → `/donate/:eventId` → Chọn DonationNeed → Khai báo số lượng
4. Nhận **TrackingId** → Mang hàng đến điểm tập kết theo hướng dẫn

### 7.2 Tình nguyện viên (Volunteer)
1. Vào `/events` → Lọc "Cần tình nguyện viên" (remainingSlots > 0)
2. Click Event → Xem VolunteerRole → Chọn vị trí phù hợp kỹ năng/khung giờ
3. Click "Đăng ký" → `/volunteer/apply/:eventId` → Điền notes (kỹ năng, khung giờ)
4. Chờ duyệt → Xem trạng thái tại `/my/activities`

### 7.3 Organizer
1. `/organizer/events` → Xem danh sách Event tổ chức mình
2. Tạo mới: `/organizer/events/new` → Điền thông tin, cấu hình Role & Need
3. Publish khi sẵn sàng → Quản lý Donation/Volunteer tại `/organizer/donations`, `/organizer/volunteers`
4. Điều phối kho/batch/trip: `/organizer/inventory`, `/organizer/batches`, `/organizer/trips`

## 8. Các câu hỏi thường gặp về Chiến dịch

**Q: Làm sao biết chiến dịch nào đang cần gấp?**
A: Trên `/events` có badge trạng thái: "Cần hỗ trợ gấp" (fillRatio < 40%), "Đang diễn ra", "Sắp diễn ra". AI cũng có thể lọc: "Các chiến dịch fillRatio < 0.4".

**Q: Có thể quyên góp cho chiến dịch CLOSED không?**
A: Không. Chỉ chiến dịch PUBLISHED mới nhận quyên góp và đăng ký TNV.

**Q: Tổ chức chưa duyệt (PENDING) có tạo Event được không?**
A: Được tạo DRAFT, nhưng **không thể Publish** cho đến khi Org được Admin duyệt APPROVED.

**Q: Event có endDate null nghĩa là gì?**
A: Chiến dịch không có thời hạn kết thúc cố định (hoạt động liên tục), chỉ Close khi Organizer quyết định.

**Q: Làm sao xem tiến độ quyên góp thực tế?**
A: Vào chi tiết Event → Xem từng DonationNeed: "Đã nhận: X / Mục tiêu: Y (Z%)". Tổng thể fillRatio hiển thị ở card Event.

## 9. Liên kết web liên quan

| Chức năng | Đường dẫn |
|-----------|-----------|
| Danh sách chiến dịch | `/events` |
| Chi tiết chiến dịch | `/events/:eventId` |
| Đăng ký quyên góp | `/donate/:eventId` |
| Đăng ký TNV | `/volunteer/apply/:eventId` |
| Quản lý Event (Organizer) | `/organizer/events` |
| Tạo Event mới | `/organizer/events/new` |
| Chi tiết Event (Organizer) | `/organizer/events/:eventId` |