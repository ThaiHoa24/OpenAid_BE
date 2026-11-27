# Quyên góp Hiện vật (In-kind Donations) - Chi tiết

## 1. Khái niệm

**Quyên góp hiện vật** trên OpenAid khác với quyên góp tiền: Người cho đóng góp **hàng hóa vật chất cụ thể** (gạo, áo ấm, sách vở, thuốc...), mỗi món hàng được theo dõi **từng đơn vị, từng lô hàng** từ lúc khai báo đến khi trao tận tay người nhận.

Mỗi đơn quyên góp nhận được một **Mã tra cứu (TrackingId)** duy nhất: `TRK-<timestamp>-<random>`

## 2. Danh mục hàng hóa được khuyến nghị (ItemType Catalog)

Hệ thống quản lý ItemType (Loại hàng) và Unit (Đơn vị) tập trung. Chỉ ItemType/Unit `isActive=true` mới dùng được.

### 2.1 Các nhóm hàng hóa chính

| Category (ItemType.category) | ItemType ví dụ | Unit phổ biến | Lưu ý bảo quản |
|------------------------------|----------------|---------------|----------------|
| **FOOD** (Thực phẩm) | Gạo, Mì gói, Sữa hộp, Nước đóng chai, Lương khô, Bánh quy | kg, gói, hộp, chai, lạng | Còn HSD ≥ 3 tháng, nguyên bao bì |
| **CLOTHING** (Quần áo) | Áo ấm, Áo mưa, Quần áo trẻ em, Chăn mền, Mũ nón | cái, bộ, bộ (set) | Sạch, gấp gọn, phân loại size/độ tuổi |
| **EDUCATION** (Học tập) | Vở trắng, Bút, Cặp sách, Balo, Sách giáo khoa, Đồ dùng văn phòng | cái, bộ, cuốn, pack | Mới hoặc còn dùng tốt, sạch sẽ |
| **MEDICAL** (Y tế) | Băng gạc, Nước muối sinh lý, Dầu gió, Khẩu trang, Cồn sát khuẩn, Hộp cấp cứu | hộp, cuộn, chai, gói, cái | Nguyên tem, chưa mở, còn HSD |
| **HYGIENE** (Vệ sinh) | Xà phòng, Kem đánh răng, Giấy vệ sinh, Bàn chải, Bã tắm | cái, hộp, gói, chai | Nguyên bao bì |
| **SHELTER** (Trú ẩn) | Tents, Chăn, Nệm lồng, Bạt nylon, Đèn pin, Sạc dự phòng | cái, bộ, cuộn | Sạch, nguyên vẹn, hoạt động tốt |
| **OTHER** (Khác) | Đồ chơi, Điện tử cũ, Văn hóa nghệ thuật | cái, bộ | Tùy loại |

### 2.2 Đơn vị (Unit) chuẩn
| Code | Name | Áp dụng cho |
|------|------|-------------|
| `kg` | Kilogam | Gạo, thực phẩm khô theo trọng lượng |
| `g` | Gam | Dược phẩm, gia vị nhỏ |
| `goi` | Gói | Mì ăn liền, sữa bột, đồ khô gói |
| `hop` | Hộp | Sữa hộp, thuốc hộp, hộp cấp cứu |
| `chai` | Chai | Nước, dầu gió, xà phòng lỏng |
| `cai` | Cái | Quần áo, balo, cặp, xe lăn, đèn |
| `bo` | Bộ | Bộ quần áo, bộ văn phòng phẩm, bộ cấp cứu |
| `cuon` | Cuộn | Giấy vệ sinh, băng gạc, bạt nylon |
| `pack` | Pack | Khẩu trang, găng tay, vở (pack 10/20) |
| `lan` | Lạng | Lương thực truyền thống (500g) |

## 3. Quy trình Quyên góp (3 bước)

### Bước 1: Chọn chiến dịch & Khai báo
- Vào `/events` → Chọn Event PUBLISHED
- Xem tab "Nhu cầu quyên góp" → Chọn Item cần cho
- Click "Quyên góp" → `/donate/:eventId`
- Chọn DonationNeed, nhập **quantity**, upload **photoUrl** (tùy chọn), ghi **notes**
- Submit → Nhận **TrackingId** (vd: `TRK-A1B2C3D4`)

### Bước 2: Gửi hàng & Tiếp nhận
- Mang hàng đến **Điểm tập kết** (thông tin trên chi tiết Event)
- Ban Tổ Chức kiểm tra: số lượng, tình trạng, HSD, bao bì
- Trên hệ thống: Organizer **Receive** (RECEIVED) hoặc **Reject** (REJECTED + lý do)
- Nếu RECEIVED: Hiện vật vào **Inventory**, Donation status = RECEIVED

### Bước 3: Theo dõi hành trình
- Vào `/track` hoặc `/track/TRK-A1B2C3D4`
- Xem timeline: PLEDGED → RECEIVED → IN_BATCH → IN_TRANSIT → DISTRIBUTED
- Xem BatchCode, TripCode, điểm phát, ảnh minh chứng bàn giao

## 4. Trạng thái Donation (DonationStatus)

| Status | Ý nghĩa | Khi nào | Ai thay đổi |
|--------|---------|---------|-------------|
| `PENDING` | Vừa khai báo, chờ mang hàng | Tạo đơn | Donor (tự tạo) |
| `RECEIVED` | Đã tiếp nhận tại kho | Organizer check hàng | Organizer |
| `REJECTED` | Từ chối nhận (sai loại, hỏng, quá HSD) | Organizer check hàng | Organizer |
| `IN_BATCH` | Đã gom vào Lô hàng (Batch) | Tạo Batch | Organizer |
| `DISTRIBUTED` | Đã phân phối đến người nhận | Reconcile Batch | Organizer |
| `CANCELLED` | Donor huỷ đơn | Chỉ khi PENDING | Donor (chủ đơn) |

## 5. Tiếp nhận hàng tại kho (Receive Process)

### 5.1 Điều kiện
- Donation status = PENDING
- Organizer của Event sở hữu Donation

### 5.2 Hành động Receive
**Input:** `status` = RECEIVED | REJECTED, `rejectionReason` (nếu REJECTED)

**Khi RECEIVED:**
- Donation: status=RECEIVED, receivedAt=now, receivedById=actor, receivedQuantity=quantity
- Inventory: availableQuantity += quantity, receivedQuantity += quantity
- TransparencyLog: DONATION_RECEIVED (isPublic=true)

**Khi REJECTED:**
- Donation: status=REJECTED, rejectionReason
- TransparencyLog: DONATION_REJECTED (isPublic=false)

### 5.3 Huỷ đơn bởi Donor
**Điều kiện:** Donation status = PENDING, actor = donorId
**Kết quả:** status = CANCELLED, TransparencyLog: DONATION_CANCELLED (isPublic=false)

## 6. Theo dõi minh bạch (Public Tracking)

### 6.1 Endpoint công khai
`GET /transparency/track/:trackingId` — **Không cần authentication**

### 6.2 Thông tin trả về
```json
{
  "donation": {
    "trackingId": "TRK-...",
    "itemType": "Gạo",
    "unit": "kg",
    "quantity": 50,
    "status": "DISTRIBUTED",
    "createdAt": "2026-11-15T08:00:00Z",
    "eventTitle": "Hỗ trợ vùng ngập Hòa Vang",
    "organizationName": "Hội Chữ Thập Đỏ Đà Nẵng"
  },
  "batch": {
    "batchCode": "BAT-...",
    "status": "DISTRIBUTED",
    "totalQuantity": 500,
    "distributedQuantity": 480,
    "returnedQuantity": 10,
    "lostQuantity": 10
  },
  "trip": {
    "tripCode": "TRP-...",
    "departurePoint": "Kho trung tâm Đà Nẵng",
    "scheduledDate": "2026-11-20T06:00:00Z",
    "status": "COMPLETED"
  },
  "distributionPoints": [
    {
      "name": "Trung tâm xã Hòa Phước",
      "address": "Xã Hòa Phước, H. Hòa Vang",
      "order": 1,
      "status": "DISTRIBUTED",
      "arrivedAt": "2026-11-20T09:30:00Z",
      "distributedAt": "2026-11-20T10:15:00Z",
      "records": [
        { "batchCode": "BAT-...", "itemType": "Gạo", "unit": "kg", "distributedQuantity": 100, "recordedAt": "..." }
      ]
    }
  ],
  "publicEvidences": [
    { "imageUrl": "...", "caption": "Bàn giao 100kg gạo tại xã Hòa Phước", "distributionPointName": "Trung tâm xã Hòa Phước", "uploadedAt": "..." }
  ],
  "timeline": [
    { "timestamp": "...", "actorName": "Nguyễn Văn A", "actorRole": "USER", "action": "DONATION_PLEDGED", "description": "Cam kết quyên góp 50kg gạo" },
    { "timestamp": "...", "actorName": "Trần Thị B (Organizer)", "actorRole": "ORGANIZER", "action": "DONATION_RECEIVED", "description": "Tiếp nhận 50kg gạo tại kho" },
    { "timestamp": "...", "actorName": "Lê Văn C (Organizer)", "actorRole": "ORGANIZER", "action": "BATCH_CREATED", "description": "Gom vào lô BAT-... cùng 490kg gạo khác" },
    { "timestamp": "...", "actorName": "Lê Văn C", "actorRole": "ORGANIZER", "action": "TRIP_CREATED", "description": "Tạo chuyến TRP-... gán lô BAT-..." },
    { "timestamp": "...", "actorName": "Phạm Văn D (Leader)", "actorRole": "ORGANIZER", "action": "DISTRIBUTION_RECORDED", "description": "Phân phối 100kg tại xã Hòa Phước" },
    { "timestamp": "...", "actorName": "Phạm Văn D", "actorRole": "ORGANIZER", "action": "EVIDENCE_UPLOADED", "description": "Tải lên minh chứng bàn giao" }
  ]
}
```

## 7. Lịch sử quyên góp cá nhân (Authenticated)

**Endpoint:** `GET /donations/my` (cần JWT)

**Response:** Danh sách Donation của user hiện tại, kèm:
- trackingId, itemType, unit, quantity, status
- event: id, title, location
- createdAt, receivedAt
- batch (nếu có): batchCode, status
- trackingUrl: `/track/:trackingId`

## 8. Quản lý quyên góp bởi Organizer

**Endpoint:** `GET /donations/event/:eventId` (cần Organizer quyền)

**Chức năng:**
- Lọc theo status (PENDING, RECEIVED, REJECTED, IN_BATCH, DISTRIBUTED)
- Xem chi tiết từng đơn
- Receive/Reject đơn PENDING
- Tạo Batch từ các đơn RECEIVED

## 9. Các câu hỏi thường gặp

**Q: Tôi quyên góp 10kg gạo nhưng hệ thống ghi nhận 9.5kg, sao?**
A: Organizer nhận thực tế có thể khác khai báo (mất mát khi vận chuyển, bao bì hỏng). `receivedQuantity` ghi nhận số lượng thực tế check tại kho. Liên hệ Organizer qua contactPhone trên Event để xác nhận.

**Q: Có thể quyên góp tiền mặt không?**
A: OpenAid **chuyên hiện vật**. Quyên góp tiền vui lòng liên hệ trực tiếp tổ chức từ thiện qua thông tin trên Event hoặc website tổ chức.

**Q: Hết hạn sử dụng (HSD) gần được nhận không?**
A: Khuyến nghị **HSD còn ≥ 3 tháng**. Organizer có quyền REJECT nếu HSD quá gần hoặc hàng hóa không đạt yêu cầu.

**Q: TrackingId mất rồi, tìm lại ở đâu?**
A: Đăng nhập → `/my/donations` → Xem tất cả đơn đã khai báo kèm TrackingId. Hoặc check email xác nhận (nếu hệ thống gửi mail).

**Q: Tại sao đơn của tôi lâu vẫn PENDING?**
A: Chưa mang hàng đến điểm tập kết, hoặc Organizer chưa xử lý. Liên hệ Ban Tổ Chức qua contactPhone trên Event.

**Q: Có thể sửa số lượng sau khi submit không?**
A: Không. Chỉ có thể **huỷ đơn (CANCELLED)** khi còn PENDING, sau đó tạo đơn mới.

## 10. Liên kết web

| Chức năng | Đường dẫn |
|-----------|-----------|
| Danh sách chiến dịch để quyên góp | `/events` |
| Trang đăng ký quyên góp | `/donate/:eventId` |
| Tra cứu minh bạch (public) | `/track` hoặc `/track/:trackingId` |
| Lịch sử quyên góp cá nhân | `/my/donations` |
| Quản lý đơn quyên góp (Organizer) | `/organizer/donations` |
| Tiếp nhận hàng tại kho (Organizer) | `/organizer/donations` (tab "Chờ tiếp nhận") |