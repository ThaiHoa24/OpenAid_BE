# Hướng dẫn sử dụng các chức năng OpenAid

## 1. Dành cho Nhà hảo tâm (Donor)

### 1.1 Tìm chiến dịch để quyên góp
1. Truy cập **`/events`** (Danh sách chiến dịch)
2. Sử dụng bộ lọc:
   - **Khu vực:** Chọn tỉnh/thành phố
   - **Loại hàng:** Chọn nhóm hàng bạn muốn cho (Thực phẩm, Quần áo, Y tế...)
   - **Từ khóa:** Tìm theo tên chiến dịch
3. Xem badge trạng thái:
   - 🔴 **Cần hỗ trợ gấp** (fillRatio < 40%) — Ưu tiên quyên góp
   - 🟢 **Đang diễn ra** — Còn nhận quyên góp
   - 🟡 **Sắp diễn ra** — Chưa bắt đầu, có thể đăng ký trước
4. Click vào chiến dịch → Xem chi tiết tại **`/events/:id`**

### 1.2 Đăng ký quyên góp hiện vật
1. Tại trang chi tiết Event → Tab **"Nhu cầu quyên góp"**
2. Xem cột **"Còn thiếu"** (remainingQuantity) → Chọn mục bạn muốn cho
3. Nhấn **"Quyên góp ngay"** → Chuyển đến **`/donate/:eventId`**
4. Điền thông tin:
   - Số lượng (quantity)
   - Ảnh minh chứng (tùy chọn, khuyến khích)
   - Ghi chú (tùy chọn: HSD, bao bì, yêu cầu đặc biệt)
5. Nhấn **"Xác nhận quyên góp"**
6. **Nhận TrackingId** (vd: `TRK-A1B2C3D4`) — **Lưu lại mã này!**

### 1.3 Gửi hàng đến điểm tập kết
1. Xem thông tin điểm tập kết trên trang Event (location, contactName, contactPhone)
2. Mang hàng đến đúng địa chỉ, giờ làm việc
3. Gặp Ban Tổ Chức → Họ kiểm tra hàng → **Tiếp nhận (RECEIVED)** trên hệ thống
4. Bạn có thể hỏi TrackingId để đối soát

### 1.4 Theo dõi hành trình quyên góp
1. Truy cập **`/track`** hoặc **`/track/TRK-A1B2C3D4`**
2. Nhập TrackingId → Xem timeline:
   - 📦 **Đã cam kết** (PLEDGED)
   - 📥 **Đã tiếp nhận tại kho** (RECEIVED)
   - 📦 **Đã gom vào lô hàng** (IN_BATCH) — Xem BatchCode
   - 🚛 **Đang vận chuyển** (IN_TRANSIT) — Xem TripCode, điểm xuất phát
   - 📍 **Đã đến điểm phát** (ARRIVED/DISTRIBUTED) — Xem tên điểm, giờ
   - ✅ **Đã bàn giao** (DISTRIBUTED) — Xem ảnh minh chứng, số người nhận
3. Có thể share link TrackingId cho người thân/bạn bè xem cùng

### 1.5 Xem lịch sử quyên góp cá nhân
1. Đăng nhập → **`/my/donations`**
2. Xem danh sách tất cả đơn đã khai báo kèm TrackingId, status, event
3. Click TrackingId → Xem chi tiết hành trình

---

## 2. Dành cho Tình nguyện viên (Volunteer)

### 2.1 Tìm cơ hội tham gia
1. Truy cập **`/events`** → Lọc **"Cần tình nguyện viên"**
2. Click Event → Xem tab **"Vị trí tuyển TNV"**
3. Mỗi vị trí hiển thị: Tên, Mô tả nhiệm vụ, Số lượng cần, **Còn trống**
4. Chọn vị trí phù hợp kỹ năng, khung giờ, địa điểm

### 2.2 Đăng ký tình nguyện
1. Nhấn **"Đăng ký"** → Chuyển đến **`/volunteer/apply/:eventId`**
2. Chọn VolunteerRole
3. **Điền Notes quan trọng:**
   - Kỹ năng: "Biết lái xe tải", "Có chứng chỉ sơ cứu", "Giao tiếp tốt", "Dùng được máy tính"
   - Kinh nghiệm: "Tham gia 2 chiến dịch lũ 2023", "Làm kho 3 năm"
   - Khung giờ: "Sáng 7-11h", "Toàn ngày T7/CN", "Linh hoạt"
   - Lưu ý sức khỏe: "Không mang nặng > 15kg", "Dị ứng bụi"
4. Submit → Status = **PENDING** (Chờ duyệt)

### 2.3 Theo dõi trạng thái đăng ký
1. **`/my/activities`** → Xem tất cả đơn đã nộp
2. Trạng thái:
   - ⏳ **PENDING** — Đang chờ Organizer duyệt
   - ✅ **APPROVED** — Được nhận, chuẩn bị tham gia
   - ❌ **REJECTED** — Xem lý do (rejectionReason), có thể đăng ký lại vị trí khác

### 2.4 Tham gia sự kiện (Check-in/Check-out)
1. Ngày Event: Đến điểm tập kết đúng giờ
2. **Check-in:** Gặp Organizer hoặc tự check-in trên app → Ghi nhận `checkedInAt`
3. Tham gia hoạt động theo phân công (Leader hướng dẫn)
4. **Check-out:** Kết thúc ca → Ghi nhận `checkedOutAt`
5. Hệ thống tự tính giờ tham gia

### 2.5 Được phân công Trip (tùy chọn)
- Organizer có thể gán bạn vào Trip (Leader hoặc Member)
- Xem Trip tại `/my/activities` → Tab "Chuyến xe"
- Nếu là **Leader**: Phụ trách ghi nhận phân phối, chụp minh chứng

---

## 3. Dành cho Organizer (Người điều phối tổ chức)

### 3.1 Quản lý Organization
1. **`/organizer/organization`** → Xem/Cập nhật thông tin Org
2. **Tab "Thành viên"** → Thêm/Xoá/Sửa role (MEMBER/ORGANIZER)
3. Chỉ Org **APPROVED** mới Publish Event được

### 3.2 Tạo & Quản lý Chiến dịch
1. **`/organizer/events`** → "Tạo chiến dịch mới"
2. Điền: Title, Description, Location, Contact, Start/End Date, Category
3. **Cấu hình VolunteerRole:** Thêm vị trí, quantity, description
4. **Cấu hình DonationNeed:** Chọn ItemType+Unit, TargetQuantity, Notes
5. Save → Status = **DRAFT**
6. Review → **"Công bố" (Publish)** → Status = **PUBLISHED**

### 3.3 Quản lý Quyên góp
1. **`/organizer/donations`** → Tab **"Chờ tiếp nhận"**
2. Xem đơn PENDING → Check hàng thực tế → **Tiếp nhận** hoặc **Từ chối**
3. Tab **"Đã tiếp nhận"** → Chọn đơn → **"Tạo lô hàng"**

### 3.4 Quản lý Kho & Batch
1. **`/organizer/inventory`** → Xem availableQuantity từng ItemType
2. **`/organizer/batches`** → "Tạo lô hàng mới"
   - Chọn đơn RECEIVED cùng ItemType+Unit
   - Hệ thống validate availableQuantity
   - Save → Batch **DRAFT** → Review → **"Sẵn sàng" (READY)**

### 3.5 Lập kế hoạch Vận chuyển (Trip)
1. **`/organizer/trips`** → "Tạo chuyến xe mới"
2. Chọn: Batch READY, Volunteer APPROVED (chọn 1 **LEADER**), Points (vị trí, tên, địa chỉ, mapUrl)
3. Submit → Trip **SCHEDULED**, Batch → **ASSIGNED**

### 3.6 Theo dõi & Ghi nhận Phân phối
1. **`/organizer/trips/:tripId`** → Tab **"Phân phối"**
2. Đi đến điểm → Cập nhật Point **ARRIVED**
3. Phân phối xong → **"Ghi nhận phân phối"**:
   - Chọn TripBatch, DistributionPoint
   - Nhập: Số lượng phân phối, Số người nhận, Ghi chú
   - **Upload ảnh minh chứng** (bắt buộc privacyConfirmed)
   - Submit → Atomic: DistributionRecord + Evidence + Point DISTRIBUTED
4. Lặp lại cho các điểm khác

### 3.7 Kết thúc chuyến & Đối soát
1. Tất cả Point DISTRIBUTED/SKIPPED → Cập nhật Trip **COMPLETED**
2. **`/organizer/batches`** → Batch ASSIGNED → **"Đối soát"**
3. Nhập: Số lượng trả về kho, Số lượng mất/hỏng, Ghi chú
4. Submit → Batch **DISTRIBUTED**, Donation → **DISTRIBUTED**, Inventory cập nhật

### 3.8 Minh bạch & Báo cáo
1. **`/organizer/transparency`** → Xem:
   - **Thống kê:** Tổng đơn, tổng lượng, tỷ lệ phân phối, giờ TNV
   - **Timeline:** Audit log từng Event/Batch/Trip
   - **Minh chứng:** Duyệt APPROVED/REJECTED Evidence
2. Xuất báo cáo (nếu có tính năng export)

---

## 4. Dành cho Admin (Ban Quản Trị Nền tảng)

### 4.1 Dashboard tổng quan
**`/admin/dashboard`** → Thống kê: Users, Organizations, Events, Donations, Volunteers, Transparency Score

### 4.2 Quản lý Organization
**`/admin/organizations`** → Duyệt APPROVED/REJECTED, Suspend/Unsuspend, xem chi tiết

### 4.3 Quản lý User
**`/admin/users`** → Xem danh sách, khóa/mở tài khoản, đổi SystemRole

### 4.4 Kiểm toán Chiến dịch
**`/admin/events`** → Xem tất cả Event mọi Org, mọi trạng thái, audit

### 4.5 Audit Logs
**`/admin/dashboard`** → Tab **"Nhật ký kiểm toán"** → Xem TransparencyLog toàn hệ thống (pagination)

---

## 5. Tra cứu Minh bạch Công khai (Ai cũng dùng được)

### 5.1 Tra cứu theo TrackingId
1. **`/track`** → Nhập TrackingId (vd: `TRK-A1B2C3D4`)
2. Hoặc trực tiếp: **`/track/TRK-A1B2C3D4`**
3. Xem: Thông tin đơn, Batch, Trip, Điểm phát, Minh chứng, Timeline

### 5.2 Tìm hiểu OpenAid
- **`/about`** — Về OpenAid, sứ mệnh, đội ngũ
- **`/how-it-works`** — Cách thức hoạt động chi tiết (4 bước)
- **`/events`** — Xem tất cả chiến dịch công khai

---

## 6. Mẹo sử dụng hiệu quả

### 6.1 Cho Donor
- ✅ Luôn lưu **TrackingId** ngay sau khi đăng ký
- ✅ Chụp ảnh hàng trước khi gửi (để đối soát nếu cần)
- ✅ Kiểm tra **HSD ≥ 3 tháng**, bao bì nguyên vẹn
- ✅ Liên hệ Organizer trước khi mang hàng (xác nhận giờ, địa chỉ)

### 6.2 Cho Volunteer
- ✅ Điền **Notes chi tiết** khi đăng ký (kỹ năng, khung giờ, lưu ý sức khỏe)
- ✅ Check-in/out **đầy đủ** để ghi nhận giờ
- ✅ Mang theo: CMND/CCCD, nước, mũ nón, áo mưa
- ✅ Tuân thủ hướng dẫn an toàn của Leader/Organizer

### 6.3 Cho Organizer
- ✅ Tiếp nhận Donation **ngay khi hàng về kho** (đừng để chờ)
- ✅ Tạo Batch **ghép đúng ItemType+Unit**, không trộn lẫn
- ✅ Chọn **1 Leader có kinh nghiệm** cho mỗi Trip
- ✅ Ghi nhận phân phối + minh chứng **ngay tại điểm** (đừng về sau mới nhập)
- ✅ Đối soát Batch **sau khi Trip COMPLETED**, nhập chính xác returned/lost

---

## 7. Liên kết nhanh (Quick Links)

| Chức năng | Đường dẫn |
|-----------|-----------|
| Trang chủ | `/` |
| Danh sách chiến dịch | `/events` |
| Chi tiết chiến dịch | `/events/:eventId` |
| Đăng ký quyên góp | `/donate/:eventId` |
| Đăng ký TNV | `/volunteer/apply/:eventId` |
| Tra cứu minh bạch | `/track` hoặc `/track/:trackingId` |
| Lịch sử quyên góp | `/my/donations` |
| Hoạt động của tôi | `/my/activities` |
| Về OpenAid | `/about` |
| Cách hoạt động | `/how-it-works` |
| **Organizer Console** | `/organizer/dashboard` |
| Quản lý Event | `/organizer/events` |
| Quản lý Quyên góp | `/organizer/donations` |
| Quản lý Kho | `/organizer/inventory` |
| Quản lý Batch | `/organizer/batches` |
| Quản lý Trip | `/organizer/trips` |
| Minh bạch & Báo cáo | `/organizer/transparency` |
| Quản lý Tổ chức | `/organizer/organization` |
| **Admin Console** | `/admin/dashboard` |
| Quản lý Org | `/admin/organizations` |
| Quản lý User | `/admin/users` |
| Kiểm toán Event | `/admin/events` |