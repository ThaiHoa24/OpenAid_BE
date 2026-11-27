# Tổng quan hệ thống OpenAid

## 1. OpenAid là gì?

**OpenAid** là nền tảng số điều phối cứu trợ hiện vật và tình nguyện viên **minh bạch**, được thiết kế để giải quyết bài toán: *"Làm sao để mỗi món quà từ người cho đến đúng tay người nhận, và ai cũng có thể kiểm chứng được quá trình đó?"*

OpenAid kết nối ba nhóm cộng đồng cốt lõi:
- **Nhà hảo tâm (Donor):** Quyên góp đúng nhu yếu phẩm đang thiếu, theo dõi hành trình lô hàng đến tận điểm trao.
- **Tình nguyện viên (Volunteer):** Đăng ký tham gia trực tiếp các khâu tiếp nhận, phân loại, đóng gói, vận chuyển và trao quà.
- **Tổ chức từ thiện / Ban Điều Phối (Organizer):** Quản lý chiến dịch, tồn kho, đóng gói Batch, lập kế hoạch chuyến xe (Trip) và công khai bằng chứng phân phối.

## 2. Triết lý cốt lõi: Minh bạch theo Lô hàng (Batch)

Khác với các nền tảng quyên góp truyền thống chỉ ghi nhận "đã quyên góp gì", OpenAid xây dựng **chuỗi minh bạch liền mạch** dựa trên khái niệm **Batch (Lô hàng)**:

```
Quyên góp (Donation) → Tiếp nhận → Kho (Inventory) → Đóng gói Batch
→ Gán vào Trip (Chuyến xe) → Phân phối tại DistributionPoint
→ Ghi nhận DistributionRecord + Minh chứng (Evidence)
→ Người quyên góp tra cứu bằng TrackingId thấy TOÀN BỘ hành trình
```

Mỗi lô hàng có **mã định danh duy nhất (BatchCode)**, mỗi đóng góp có **TrackingId** liên kết ngược về Batch và Trip tương ứng.

## 3. Các module chức năng chính

| Module | Chức năng cốt lõi |
|--------|------------------|
| **Events (Chiến dịch)** | Tạo, cấu hình nhu cầu quyên góp & vị trí TNV, công bố (PUBLISHED), đóng/kết thúc |
| **Donations (Quyên góp)** | Khai báo quyên góp, tiếp nhận tại kho, cấp trackingId, huỷ đơn |
| **Inventory (Kho)** | Theo dõi tồn kho: received / available / reserved / distributed / lost |
| **Batches (Lô hàng)** | Ghép các đơn quyên góp cùng loại hàng thành lô, reserve kho, trạng thái DRAFT→READY→ASSIGNED→DISTRIBUTED |
| **Trips (Chuyến xe)** | Lập kế hoạch phân phối: điểm xuất phát, lịch trình, gán Batch, gán TNV (Leader/Member), điểm phát |
| **Distribution (Phân phối)** | Ghi nhận phân phối tại từng điểm, số lượng, số người thụ hưởng, minh chứng ảnh |
| **Volunteers (Tình nguyện)** | Đăng ký, duyệt, check-in/out, lịch sử tham gia |
| **Transparency (Minh bạch)** | Audit log mọi thay đổi trạng thái, timeline công khai, tìm kiếm theo trackingId |
| **Organizations (Tổ chức)** | Đăng ký, duyệt, quản lý thành viên (Organizer/Member) |

## 4. Luồng nghiệp vụ điển hình

### 4.1 Từ thiện tổ chức chiến dịch
1. Tổ chức đăng ký → Admin duyệt (APPROVED)
2. Organizer tạo Event DRAFT → Cấu hình VolunteerRole & DonationNeed
3. Organizer Publish Event → Trạng thái PUBLISHED, công khai trên /events

### 4.2 Người hảo tâm quyên góp
1. Xem /events → Chọn chiến dịch → Xem DonationNeed (đang thiếu gì)
2. Vào /donate/:eventId → Khai báo số lượng, ảnh → Nhận TrackingId
3. Mang hàng đến điểm tập kết → Organizer Receive (RECEIVED) → Vào Inventory

### 4.3 Điều phối kho & vận chuyển
1. Organizer tạo Batch từ các Donation RECEIVED cùng itemType+unit
2. Batch READY → Tạo Trip, gán Batch, gán TNV Leader/Member, thiết lập DistributionPoints
3. Trip IN_TRANSIT → Tại từng điểm: TNV ghi DistributionRecord + upload Evidence
4. Trip COMPLETED → Batch RECONCILED (returned/lost) → Donation DISTRIBUTED

### 4.4 Tình nguyện viên tham gia
1. Xem /events → Chọn vị trí VolunteerRole → Đăng ký
2. Chờ duyệt APPROVED → Check-in tại sự kiện → Tham gia hoạt động → Check-out
3. Xem lịch sử tại /my/activities

### 4.5 Minh bạch & Tra cứu
- Người quyên góp: /track/TrackingId → Xem timeline: Pledged → Received → In Batch → In Transit → Distributed (+ ảnh bằng chứng)
- Công khai: TransparencyLog công khai (isPublic=true) cho mọi thay đổi trạng thái quan trọng

## 5. Các khái niệm dữ liệu then chốt

| Thực thể | Mô tả | Mã định danh |
|----------|-------|--------------|
| **Event** | Chiến dịch cứu trợ | UUID |
| **DonationNeed** | Nhu cầu hàng hóa của Event | UUID |
| **Donation** | Một đơn quyên góp của Donor | TrackingId (TRK-...) |
| **Inventory** | Tồn kho theo Event + ItemType + Unit | UUID |
| **Batch** | Lô hàng gom từ nhiều Donation | BatchCode (BAT-...) |
| **Trip** | Chuyến xe phân phối | TripCode (TRP-...) |
| **DistributionPoint** | Điểm giao/handoff trên tuyến Trip | UUID |
| **DistributionRecord** | Bản ghi phân phối tại 1 điểm | UUID |
| **Evidence** | Minh chứng ảnh/video tại điểm | UUID |
| **VolunteerRole** | Vị trí tuyển TNV trong Event | UUID |
| **VolunteerApplication** | Đơn đăng ký TNV | UUID |
| **TransparencyLog** | Nhật ký kiểm toán bất biến | UUID |

## 6. Công nghệ & Kiến trúc

- **Backend:** NestJS (TypeScript) + Prisma ORM + PostgreSQL
- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Auth:** JWT (Access Token + Refresh Token), RBAC (SystemRole + OrganizationRole)
- **AI:** Gemini Developer API (Function Calling + RAG)
- **Storage:** Local / S3-compatible cho Evidence images
- **Real-time:** (Dự kiến) WebSocket cho tracking live

## 7. Liên kết hữu ích

- Trang chủ: `https://openaid.example.com/`
- Danh sách chiến dịch: `/events`
- Tra cứu minh bạch: `/track`
- Cách thức hoạt động: `/how-it-works`
- Về OpenAid: `/about`