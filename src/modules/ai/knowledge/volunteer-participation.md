# Đăng ký & Tham gia Tình nguyện (Volunteer) - Chi tiết

## 1. Khái niệm

**Tình nguyện viên (Volunteer)** là người đăng ký tham gia trực tiếp các hoạt động cứu trợ trong Event: tiếp nhận hàng, phân loại kho, đóng gói Batch, điều phối vận chuyển, phân phối tại điểm phát, ghi nhận minh chứng...

Mỗi vị trí TNV trong Event gọi là **VolunteerRole** (vd: "Phân loại kho", "Điều phối vận chuyển", "Hỗ trợ hiện trường", "Y tế", "Truyền thông").

## 2. VolunteerRole (Vị trí tuyển TNV)

### 2.1 Cấu trúc
| Trường | Bắt buộc | Mô tả |
|--------|----------|-------|
| `name` | ✓ | Tên vị trí (unique trong Event) |
| `quantity` | ✓ | Số lượng TNV cần |
| `description` | | Mô tả nhiệm vụ, kỹ năng yêu cầu, khung giờ |

### 2.2 Các vai trò phổ biến
| Role name | Nhiệm vụ chính | Kỹ năng ưu tiên |
|-----------|----------------|-----------------|
| Phân loại kho | Check hàng, phân loại theo ItemType, dán mã Batch | Cẩn thận, biết đọc mã vạch |
| Đóng gói Batch | Ghép đơn, cân đo, đóng gói, dán nhãn BatchCode | Sỉ nhặt, có thể mang nặng |
| Điều phối vận chuyển | Lên kế hoạch Trip, liên lạc tài xế, theo dõi lộ trình | Tổ chức, giao tiếp tốt |
| Hỗ trợ hiện trường | Hướng dẫn người nhận, giao hàng, check minh chứng | Năng động, thân thiện |
| Y tế / Cấp cứu | Hỗ trợ khám chữa bệnh, phát thuốc | Chứng chỉ y tế, sơ cứu |
| Truyền thông | Chụp ảnh, quay video, viết bài, livestream | Kỹ năng media, sáng tạo |
| An ninh / Trật tự | Giữ trật tự điểm phát, phân luồng người/xe | Uôn thể, kiên nhẫn |

## 3. Quy trình đăng ký & Tham gia

### 3.1 Bước 1: Tìm cơ hội
- Vào `/events` → Lọc "Cần tình nguyện viên" (Event có VolunteerRole remainingSlots > 0)
- Click Event → Xem chi tiết VolunteerRole: tên, quantity, description, remainingSlots
- Chọn vị trí phù hợp kỹ năng, khung giờ, địa điểm

### 3.2 Bước 2: Đăng ký
- Click "Đăng ký tình nguyện" → `/volunteer/apply/:eventId`
- Chọn VolunteerRole → Điền **notes** (kỹ năng, kinh nghiệm, khung giờ có thể tham gia, lưu ý sức khỏe)
- Submit → Status = **PENDING**

### 3.3 Bước 3: Chờ duyệt
- Organizer xem đơn tại `/organizer/volunteers` → Duyệt **APPROVED** hoặc **REJECTED** (có lý do)
- Nếu APPROVED: Slot VolunteerRole giảm 1, User nhận thông báo
- Xem trạng thái tại `/my/activities`

### 3.4 Bước 4: Tham gia sự kiện (Check-in/Check-out)
- Đến ngày Event: Check-in tại điểm tập kết (Organizer hoặc tự check-in qua app)
- Status: Có `checkedInAt` timestamp
- Tham gia hoạt động theo phân công
- Check-out khi kết thúc ca: Có `checkedOutAt` timestamp
- Lịch sử giờ tham gia lưu tại VolunteerAttendance

### 3.5 Bước 5: Được gán Trip (tùy chọn)
- Organizer tạo Trip → Chọn VolunteerApplication đã APPROVED → Gán vào Trip (LEADER hoặc MEMBER)
- 1 Application chỉ được gán 1 Trip / Event
- Trip Leader: Phụ trách ghi nhận phân phối, upload minh chứng

## 4. Trạng thái VolunteerApplication

| Status | Ý nghĩa | Chuyển đổi bởi |
|--------|---------|----------------|
| `PENDING` | Vừa nộp đơn, chờ duyệt | User (tạo), Organizer (duyệt) |
| `APPROVED` | Được nhận, có slot | Organizer |
| `REJECTED` | Từ chối (hết slot, không phù hợp, sai info) | Organizer |

## 5. API Endpoints

### 5.1 Đăng ký (User)
- `POST /volunteers` — Tạo đơn đăng ký
  - Body: `{ eventId, volunteerRoleId, notes? }`
  - Validate: Event PUBLISHED, Role còn slot, User chưa đăng ký Event này
- `GET /volunteers/my` — Lịch sử đăng ký cá nhân

### 5.2 Duyệt & Quản lý (Organizer)
- `GET /volunteers/event/:eventId` — Danh sách đơn của Event (pagination)
  - Filter: status, volunteerRoleId
- `PATCH /volunteers/:id/review` — Duyệt/Từ chối
  - Body: `{ status: APPROVED|REJECTED, rejectionReason? }`
  - Validate APPROVED: Role còn slot
- `POST /volunteers/:id/check-in` — Check-in (Organizer hoặc tự check-in)
- `POST /volunteers/:id/check-out` — Check-out

### 5.3 Trip Assignment (Organizer)
- Trong `POST /trips`: gán `volunteers[]` với `applicationId` + `role` (LEADER/MEMBER)
- Validate: Application APPROVED, cùng Event, chưa gán Trip khác

## 6. Lịch sử & Hồ sơ TNV cá nhân

**Endpoint:** `GET /volunteers/my` (cần JWT)

**Response:** Danh sách VolunteerApplication kèm:
- event: id, title, location, startDate, endDate, status
- volunteerRole: name, description
- status (PENDING/APPROVED/REJECTED), rejectionReason
- reviewedAt, reviewedByName
- attendance: checkedInAt, checkedOutAt, method
- tripAssignments: tripCode, tripStatus, role (LEADER/MEMBER)

## 7. Kỹ năng & Mẹo tham gia hiệu quả

### 7.1 Notes đăng ký nên ghi gì?
- **Kỹ năng cứng:** BƯM xà, cắt gác, cấp cứu, lái xe, nói tiếng Anh, dùng máy tính...
- **Kinh nghiệm:** "Đã tham gia 3 chiến dịch lũ lụt 2023-2024", "Làm kho 2 năm"
- **Khung giờ:** "Sáng 7-11h", "Chiều 13-17h", "Toàn ngày Thứ 7, CN"
- **Sức khỏe:** "Có bệnh tim, không mang nặng > 10kg", "Dị ứng bụi"
- **Yêu cầu đặc biệt:** "Cần chỗ nghỉ nghỉ trưa", "Ăn chay"

### 7.2 Checklist trước khi đi
- [ ] Đã được duyệt APPROVED
- [ ] Nắm rõ điểm tập kết, giờ check-in (xem Event detail hoặc hỏi Organizer)
- [ ] Mang theo: CMND/CCCD, đeo thẻ TNV (nếu có), nước uống, mũ nón, áo mưa
- [ ] Đã đọc hướng dẫn an toàn (Organizer gửi trước Trip)
- [ ] Biết contactName/Phone của Organizer Event

### 7.3 Quy tắc ứng xử
- Tuân thủ chỉ đạo Organizer/Trip Leader
- Đeo thẻ nhận diện / áo đồng phục (nếu có)
- Không chụp ảnh người nhận sans sự đồng ý (tuân thủ Evidence privacyConfirmed)
- Báo cáo ngay sự cố, rủi ro cho Leader/Organizer
- Check-out đầy đủ để ghi nhận giờ tham gia

## 8. Các câu hỏi thường gặp

**Q: Có thể đăng ký nhiều vị trí trong 1 Event không?**
A: **Không.** 1 User chỉ được đăng ký **1 VolunteerRole / 1 Event** (unique constraint). Chọn vị trí phù hợp nhất.

**Q: Đăng ký rồi muốn đổi vị trí làm sao?**
A: Huỷ đơn cũ (Organizer REJECT hoặc User nhờ Organizer) → Đăng ký vị trí mới. Lưu ý slot có thể đã hết.

**Q: Không được duyệt (REJECTED) có đăng ký lại được không?**
A: Được, miễn là Event còn PUBLISHED và Role còn slot. Nhưng nên hỏi lý do reject để cải thiện notes.

**Q: Quên check-out thì sao?**
A: Organizer có thể check-out hộ sau sự kiện. Giờ tham gia sẽ tính đến thời điểm Organizer check-out.

**Q: Có chứng nhận giờ tình nguyện không?**
A: Hệ thống ghi nhận `checkedInAt`/`checkedOutAt` tự động tính giờ. Organizer có thể xuất báo cáo từ `/organizer/volunteers`. Chứng nhận chính thức do Tổ chức cấp.

**Q: Người dưới 18 tuổi được tham gia không?**
A: Tùy quy định Tổ chức & pháp luật. Thường cần sự đồng ý của phụ huynh/giám hộ. Xem `description` của VolunteerRole hoặc liên hệ Organizer.

**Q: Có được trả chi phí đi lại không?**
A: OpenAid **không bật buộc** chi phí. Một số Tổ chức hỗ trợ xe buýt/bữa ăn. Xem notes Event hoặc hỏi Organizer.

## 9. Liên kết web

| Chức năng | Đường dẫn |
|-----------|-----------|
| Tìm cơ hội TNV | `/events` (lọc "Cần tình nguyện viên") |
| Đăng ký TNV | `/volunteer/apply/:eventId` |
| Lịch sử đăng ký cá nhân | `/my/activities` |
| Quản lý duyệt TNV (Organizer) | `/organizer/volunteers` |
| Chi tiết duyệt đơn (Organizer) | `/organizer/volunteers/:eventId` |
| Check-in/out (Organizer) | `/organizer/volunteers` (action buttons) |