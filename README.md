# OpenAid Backend

Backend cho **OpenAid – Transparent In-Kind Donation & Volunteer Coordination System** (Hệ thống điều phối tình nguyện viên, quyên góp hiện vật minh bạch và trợ lý AI tra cứu thời gian thực), xây dựng theo kiến trúc **Modular Monolith** với NestJS 12, Prisma 6, PostgreSQL và Google Gemini Developer API (`@google/genai`). Tích hợp hoàn chỉnh với Frontend Next.js (`OpenAid_FE`).

> **Đề tài:** Đồ án Tốt nghiệp Capstone 1 (CMU-SE 450) – Viện Đào tạo Quốc tế, Đại học Duy Tân
>
> **Nhóm:** C1SE.102 | **Giảng viên hướng dẫn:** ThS. Võ Đình Hiệu

| Thành viên | Vai trò |
| --- | --- |
| Phan Vĩnh Thái Hòa | Leader / Scrum Master |
| Trần Lê Hoàng | Team Member |
| Tạ Quang Tịnh | Team Member |
| Đặng Phước Tường | Team Member |

---

## Phạm vi và trạng thái triển khai

OpenAid giải quyết trọn vẹn bốn nhóm nghiệp vụ cốt lõi:
1. **Quản lý tổ chức, chiến dịch & tình nguyện viên**: Đăng ký tổ chức, xét duyệt pháp nhân, phát động chiến dịch, ứng tuyển, xét duyệt và điểm danh thực địa.
2. **Tiếp nhận hiện vật, tồn kho bảo toàn & đóng kiện (Batch)**: Tiếp nhận quyên góp kèm Tracking ID, tự động cập nhật tồn kho bảo toàn (`Available`, `Reserved`, `Distributed`, `Lost`), gom lô hàng và đối soát sau chuyến đi.
3. **Điều phối chuyến xe, bằng chứng thực địa & minh bạch công khai**: Lập chuyến xe (1 Trip Leader + TNV + các lô hàng `READY`), cập nhật điểm phát, ghi nhận bàn giao nguyên tử kèm ảnh minh chứng (ẩn danh quyền riêng tư) và tra cứu hành trình công khai qua Tracking ID.
4. **Trợ lý AI OpenAid (`ai`)**: Tích hợp Gemini Developer API (`@google/genai`) kết hợp RAG Knowledge Base + 12 Function Calling tools có kiểm soát phân quyền RBAC, trả kèm thẻ chiến dịch có ảnh thật và đồng bộ lịch sử hội thoại theo từng tài khoản `User` trong PostgreSQL.

### Trạng thái các module (18 modules)

| Thành phần | Trạng thái | Chi tiết triển khai |
| --- | :---: | --- |
| **Trợ lý AI & Lịch sử Chat (`ai`)** | **Hoàn thành** | Gemini Developer API (`@google/genai`, `vertexai: false`, model `gemini-3.5-flash-lite`), hỗ trợ key `AQ.` / `AIza...`, RAG Knowledge Base (9 tài liệu nghiệp vụ), 12 Function Calling tools tuân thủ RBAC, tự động gom thẻ chiến dịch kèm ảnh thật (`Evidence` / `Donation.photoUrl` / fallback theo `category`), xử lý mã lỗi `401`/`403`/`404`/`429`, lưu & đồng bộ lịch sử chat (`chat_conversations`, `chat_messages`), đổi tên, xóa, like/dislike và tạo lại câu trả lời. |
| **Xác thực & OTP Email (`auth`, `mail`)** | **Hoàn thành** | Đăng ký trực tiếp hoặc xác thực OTP qua email (`Nodemailer` SMTP), quên mật khẩu & đặt lại mật khẩu bằng OTP, chuẩn hóa email, mã hóa mật khẩu `bcrypt`, cấp và xác thực JWT Bearer token. |
| **Hồ sơ & Context User (`users`)** | **Hoàn thành** | Xem/cập nhật hồ sơ cá nhân (`/api/users/profile`: `fullName`, `phoneNumber`, `avatarUrl`), tra cứu danh sách tổ chức và vai trò tham gia (`/api/users/memberships`). |
| **Phân quyền 2 tầng (RBAC)** | **Hoàn thành** | **Cấp hệ thống:** `SystemRole` (`USER`, `ADMIN`) bảo vệ bởi `JwtAuthGuard` và `RolesGuard` toàn cục.<br>**Cấp tổ chức:** `OrganizationRole` (`MEMBER`, `ORGANIZER`) bảo vệ bởi `OrganizationAccessService`. |
| **Tổ chức (`organizations`)** | **Hoàn thành** | Danh sách/chi tiết tổ chức kèm `_count` (`events`, `members`); tạo tổ chức tự động gán `ORGANIZER` cho người tạo trong transaction; cập nhật thông tin và mời thành viên. |
| **Quản trị hệ thống (`admin`)** | **Hoàn thành** | Danh sách tổ chức chờ duyệt (`ADM-01`), duyệt/từ chối/đình chỉ tổ chức kèm `rejectionReason` và `TransparencyLog` (`ADM-02`), danh sách user kèm `memberships` & `_count` (`ADM-03`), khóa/mở khóa tài khoản (`ADM-04`), quản lý và kiểm duyệt sự kiện toàn hệ thống (`ADM-05`, `ADM-06`). |
| **Chiến dịch & Danh mục (`events`)** | **Hoàn thành** | Vòng đời chiến dịch (`DRAFT` → `PUBLISHED` → `CLOSED` / `CANCELLED`), quản lý `VolunteerRole` và `DonationNeed`, danh mục `ItemType`, `Unit` & `areas` (`GET /api/events/catalogs/areas`), phân loại theo `category`. |
| **Tình nguyện viên (`volunteers`)** | **Hoàn thành** | Ứng tuyển TNV (`VOL-01`), xem đơn cá nhân (`VOL-02`), danh sách theo sự kiện (`VOL-03`), duyệt/từ chối kèm `rejectionReason` (`VOL-04`), Check-in / Check-out ca trực (`VOL-05`, `VOL-06`). |
| **Quyên góp (`donations`)** | **Hoàn thành** | Đăng ký quyên góp sinh Tracking ID (`TRK-...`) hỗ trợ `photoUrl`, xem lịch sử cá nhân, tiếp nhận vào kho (`RECEIVED`) hoặc từ chối (`REJECTED`) kèm cập nhật `Inventory` và `TransparencyLog`, hủy đơn `PENDING`. |
| **Kho bãi & Đóng kiện (`inventory`, `batches`)** | **Hoàn thành** | Truy vấn tồn kho bảo toàn theo tổ chức & sự kiện, đóng lô hàng từ các khoản `RECEIVED`, chuyển trạng thái `READY`, đối soát `returnedQuantity` / `lostQuantity` sau chuyến đi. |
| **Chuyến xe & Phân phối (`trips`, `distribution`)** | **Hoàn thành** | Lập chuyến xe gán lô `READY`, TNV `APPROVED` (đúng 1 `LEADER`) và các điểm phát; cập nhật trạng thái chuyến xe/điểm phát; ghi nhận bàn giao **Atomic** (`POST /api/trips/:id/distribute-with-evidence`: ghi nhận phân phối + upload ảnh minh chứng trong 1 transaction). |
| **Bằng chứng & Minh bạch (`evidence`, `transparency`, `storage`)** | **Hoàn thành** | Upload ảnh (`JPEG`/`PNG`/`WebP` ≤ 5MB) qua `/api/uploads`, tải lên & duyệt bằng chứng thực địa kèm xác nhận quyền riêng tư, tra cứu công khai qua `trackingId`, audit logs và timeline. |
| **Thống kê & Báo cáo (`dashboard`)** | **Hoàn thành** | Thống kê tổng quan sự kiện (`/api/dashboard/events/:eventId`), xuất báo cáo nghiệm thu `CSV` / `Excel` / `PDF` / `JSON` (`/api/reports/events/:id/export`). |
| **Kiểm thử tự động** | **Hoàn thành** | Unit tests với Vitest & E2E/Smoke tests với Supertest (`test/auth.e2e-spec.ts`, `test/scaffold.e2e-spec.ts`). |

---

## Mô hình Phân quyền (RBAC 2 tầng)

Hệ thống tuân thủ mô hình **RBAC 2 tầng** (áp dụng đồng bộ cho cả REST API và AI Function Calling):

```text
1. SYSTEM-LEVEL ROLE (Toàn hệ thống - User.systemRole)
   ├── USER  : Người dùng thông thường (quyên góp, ứng tuyển TNV, tạo tổ chức, đồng bộ lịch sử chat AI).
   └── ADMIN : Quản trị viên nền tảng (duyệt tổ chức, quản lý user, kiểm duyệt sự kiện, xem audit logs).

2. ORGANIZATION-LEVEL ROLE (Theo phạm vi tổ chức - OrganizationMember.role)
   ├── MEMBER    : Thành viên của tổ chức.
   └── ORGANIZER : Điều phối viên của tổ chức (quản lý chiến dịch, duyệt TNV, kho, lô hàng, chuyến xe).
```

---

## Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Runtime | Node.js ≥ 22, npm |
| Ngôn ngữ | TypeScript 6, native ESM (`"type": "module"`) |
| Framework | NestJS 12, Express |
| Database / ORM | PostgreSQL, Prisma 6 (`@prisma/client`) |
| AI / LLM | Google Gemini Developer API (`@google/genai`, `vertexai: false`, `gemini-3.5-flash-lite`) |
| Xác thực & Bảo mật | Passport JWT, `bcrypt`, `JwtAuthGuard`, `RolesGuard`, `OrganizationAccessService` |
| Email / OTP | Nodemailer (SMTP) |
| File Storage | Multer, Local disk storage (`uploads/`, `JPEG`/`PNG`/`WebP`, max 5MB) |
| Validation / Docs | `class-validator`, `class-transformer`, `@nestjs/swagger` |
| Kiểm thử | Vitest 4, Supertest 7 |
| Code quality | Oxlint, Prettier |
| Container / CI | Docker, Docker Compose, GitHub Actions |

---

## Cấu trúc thư mục

```text
OpenAid_BE/
├── .github/workflows/ci.yml    # Pipeline CI: validate schema, build, lint, test
├── docs/                       # Tài liệu đồ án, API Contract, SRS, ERD & sơ đồ thiết kế
├── prisma/
│   ├── migrations/             # Lịch sử migrations PostgreSQL (init, otp_verification, chat_history)
│   ├── schema.prisma           # Models, enums & ràng buộc quan hệ (gồm ChatConversation, ChatMessage)
│   └── seed.mjs                # Script nạp dữ liệu mẫu (users, orgs, events, batches, trips...)
├── scripts/check-db.mjs        # Kiểm tra kết nối DB và độ khớp Prisma schema
├── src/
│   ├── common/                 # Guards, decorators (@Roles, @Public, @CurrentUser), filters, interceptors, pipes
│   ├── config/                 # Cấu hình môi trường (database, jwt, mail, ai) & env validation
│   ├── database/               # PrismaModule, PrismaService
│   ├── modules/                # 18 modules:
│   │   ├── ai/                 # Trợ lý AI: ai.service, ai.controller, dto/, prompts/, knowledge/ (RAG), tools/ (12 tools)
│   │   ├── admin/ auth/ batches/ dashboard/ distribution/ donations/
│   │   ├── events/ evidence/ health/ inventory/ mail/ organizations/
│   │   └── storage/ transparency/ trips/ users/ volunteers/
│   ├── app.module.ts           # Root module
│   ├── bootstrap.ts            # Cấu hình HTTP chung (CORS, /api prefix, Pipes, Interceptors, Swagger)
│   └── main.ts                 # Bootstrap server
├── test/                       # E2E & compatibility tests
├── compose.yaml                # Docker Compose cho Backend + PostgreSQL
├── Dockerfile                  # Multi-stage build Dockerfile
├── package.json
└── README.md
```

---

## Khởi chạy dự án cục bộ

### 1. Chuẩn bị môi trường
* Node.js ≥ 22 và npm.
* PostgreSQL 14+ (hoặc chạy qua Docker Compose).
* Google AI Studio API Key (miễn phí tại [Google AI Studio](https://aistudio.google.com/apikey)) cho tính năng Chatbot AI.

### 2. Cấu hình biến môi trường

Sao chép `.env.example` thành `.env`:

```bash
cp .env.example .env
```

*(Windows PowerShell: `Copy-Item .env.example .env`)*

| Biến | Mặc định | Mô tả |
| --- | --- | --- |
| `PORT` | `3001` | Cổng HTTP của Backend |
| `DATABASE_URL` | `postgresql://postgres:...@localhost:5432/openaid?schema=public` | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | — | Khóa bí mật ký và xác thực JWT |
| `JWT_EXPIRES_IN` | `7d` | Thời hạn Access Token |
| `FRONTEND_URL` | `http://localhost:3000` | Origin Frontend được phép CORS |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` | `smtp.gmail.com`, `587` | Cấu hình SMTP gửi OTP qua email |
| `GEMINI_API_KEY` | — | API Key từ Google AI Studio (hỗ trợ cả dạng `AQ.` và `AIza...`) |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Model Gemini Flash sử dụng cho Gemini Developer API |

### 3. Cài đặt, Migration & Seed dữ liệu mẫu

```bash
# Cài đặt thư viện
npm ci

# Áp dụng migrations và sinh Prisma Client
npm run prisma:migrate:deploy
npm run prisma:generate

# Nạp dữ liệu mẫu ban đầu (tài khoản demo, tổ chức, danh mục, chiến dịch, lô hàng, chuyến xe)
npm run prisma:seed

# Kiểm tra tính khớp giữa database và schema
npm run db:check
```

### 4. Chạy ứng dụng

```bash
# Chế độ phát triển (watch mode)
npm run start:dev

# Hoặc build & chạy Production
npm run build
npm run start:prod
```

* **API Base URL:** `http://localhost:3001/api`
* **Swagger UI:** `http://localhost:3001/api/docs`
* **OpenAPI JSON:** `http://localhost:3001/api/docs-json`
* **Health Liveness:** `http://localhost:3001/api/health/live`

---

## Tài khoản Demo (từ `prisma/seed.mjs`)

| Vai trò | Email | Mật khẩu |
| --- | --- | --- |
| **Admin** | `admin@openaid.demo` | `123456` |
| **Organizer** (Hội OpenAid Đà Nẵng) | `organizer@openaid.demo` | `123456` |
| **User** (TNV / Nhà hảo tâm) | `user@openaid.demo` | `123456` |
| **Volunteer B** | `volunteer.b@openaid.demo` | `123456` |

---

## Danh mục API chính

| Nhóm | Method | Endpoint | Quyền truy cập | Chức năng |
| --- | --- | --- | --- | --- |
| **AI Assistant** | `POST` | `/api/ai/chat` | Công khai | Chat trực tiếp với trợ lý AI OpenAid (cho khách chưa đăng nhập) |
| **AI Assistant** | `GET` | `/api/ai/conversations` | Bearer JWT | Lấy danh sách lịch sử hội thoại của tài khoản hiện tại |
| **AI Assistant** | `POST` | `/api/ai/conversations/messages` | Bearer JWT | Gửi tin nhắn, gọi AI + Function Calling & lưu đồng bộ vào DB |
| **AI Assistant** | `PATCH` / `DELETE` | `/api/ai/conversations/:id` | Bearer JWT | Đổi tên / xóa cuộc hội thoại (cascade xóa tin nhắn) |
| **AI Assistant** | `PATCH` | `/api/ai/messages/:id/feedback` | Bearer JWT | Lưu đánh giá `like` / `dislike` cho tin nhắn AI |
| **AI Assistant** | `POST` | `/api/ai/conversations/:id/regenerate` | Bearer JWT | Tạo lại câu trả lời mới và cập nhật DB |
| **Auth** | `POST` | `/api/auth/send-register-otp`, `/verify-register` | Công khai | Gửi OTP & xác thực đăng ký tài khoản |
| **Auth** | `POST` | `/api/auth/forgot-password`, `/reset-password` | Công khai | Gửi OTP & đặt lại mật khẩu |
| **Auth** | `POST` | `/api/auth/register`, `/login` | Công khai | Đăng ký trực tiếp & đăng nhập nhận JWT |
| **Users** | `GET` / `PATCH` | `/api/users/profile`, `/memberships` | Bearer JWT | Xem/cập nhật hồ sơ & tổ chức tham gia |
| **Organizations** | `GET` / `POST` / `PATCH` | `/api/organizations*` | Công khai / JWT / `ORGANIZER` | Tra cứu, đăng ký tổ chức, cập nhật & mời thành viên |
| **Admin** | `GET` / `PATCH` | `/api/admin/organizations*`, `/users*`, `/events*` | `ADMIN` | Duyệt tổ chức, quản lý user & kiểm duyệt sự kiện |
| **Events** | `GET` / `POST` / `PATCH` / `DELETE` | `/api/events*`, `/catalogs/*` | Công khai / `ORGANIZER` | Quản lý chiến dịch, danh mục `item-types`, `units`, `areas`, `donation-needs`, `volunteer-roles` |
| **Volunteers** | `POST` / `GET` / `PATCH` | `/api/volunteers*` | Bearer JWT / `ORGANIZER` | Ứng tuyển, duyệt đơn, Check-in / Check-out ca trực |
| **Donations** | `POST` / `GET` / `PATCH` | `/api/donations*` | Bearer JWT / `ORGANIZER` | Cam kết quyên góp sinh Tracking ID, nhập kho (`RECEIVED`) / từ chối, hủy đơn |
| **Inventory & Batches** | `GET` / `POST` / `PATCH` | `/api/inventory*`, `/api/batches*` | `ORGANIZER` | Tồn kho bảo toàn, đóng lô hàng, chuyển `READY`, đối soát sau chuyến đi |
| **Trips & Distribution** | `GET` / `POST` / `PATCH` | `/api/trips*`, `/api/distribution*` | Công khai / `ORGANIZER` / Trip Leader | Lập chuyến xe, cập nhật điểm phát, bàn giao **Atomic** (`distribute-with-evidence`) |
| **Evidence & Transparency** | `POST` / `GET` / `PATCH` | `/api/evidence*`, `/api/transparency*`, `/api/uploads*` | Công khai / JWT / `ORGANIZER` | Upload & duyệt ảnh minh chứng, tra cứu công khai theo `trackingId`, audit logs |
| **Dashboard & Reports** | `GET` | `/api/dashboard/events/:eventId`, `/api/reports/events/:id/export` | `ORGANIZER` / `ADMIN` | Thống kê sự kiện & xuất báo cáo (`csv`, `excel`, `pdf`, `json`) |
| **Health** | `GET` | `/api/health/live` | Công khai | Kiểm tra trạng thái hoạt động của server |

---

## Chuẩn Response Envelope

* **Thành công** (`TransformInterceptor`): `{ "success": true, "statusCode": 200, "data": ..., "timestamp": "..." }`
* **Lỗi** (`AllExceptionsFilter`): `{ "success": false, "statusCode": 4xx/5xx, "timestamp": "...", "path": "...", "message": "..." }`

---

## Các lệnh kiểm thử & bảo trì

| Lệnh | Ý nghĩa |
| --- | --- |
| `npm run lint` | Kiểm tra chất lượng code bằng Oxlint |
| `npm run format` | Định dạng code bằng Prettier |
| `npm run build` | Chạy `prisma generate` và biên dịch NestJS sang `dist/` |
| `npm test` | Chạy Unit Tests bằng Vitest |
| `npm run test:e2e` | Build và chạy E2E Integration & Smoke Tests (`vitest.config.e2e.ts`) |
| `npm run db:check` | Kiểm tra kết nối và độ khớp giữa DB và Prisma schema |
| `npm run prisma:migrate:deploy` | Áp dụng toàn bộ Prisma migrations lên PostgreSQL |
| `npm run prisma:seed` | Nạp dữ liệu mẫu ban đầu |

---

## Các Cập Nhật Gần Đây

### v2.2 — Trợ lý AI OpenAid & Đồng bộ Lịch sử Chat
| Phân loại | Thay đổi |
| --- | --- |
| **Module AI (`src/modules/ai/`)** | Tích hợp `@google/genai` kết nối Gemini Developer API (`vertexai: false`, `generativelanguage.googleapis.com`, model `gemini-3.5-flash-lite`), hỗ trợ Authorization Key dạng `AQ.` và `AIza...`, xử lý chi tiết lỗi `401`/`403`/`404`/`429`. |
| **RAG + 12 Function Calling Tools** | Nạp 9 tài liệu nghiệp vụ OpenAid vào Knowledge Base và 12 tools đọc dữ liệu thật (`Events`, `Donations`, `Volunteers`, `Batches`, `Trips`, `Organizations`, `Transparency`, `Navigation`) tuân thủ phân quyền RBAC theo người dùng. |
| **Đồng bộ lịch sử Chat theo User** | Thêm migration `20261127103000_add_chat_history` với 2 bảng `chat_conversations` & `chat_messages` (lưu `campaigns` dạng JSON và `feedback` like/dislike). |
| **Thẻ chiến dịch kèm ảnh thật** | Tự động gom danh sách chiến dịch (`campaigns`) khi bot gọi tool tìm kiếm sự kiện/TNV, kéo ảnh theo thứ tự ưu tiên: ảnh `Evidence` đã duyệt → `Donation.photoUrl` → ảnh mặc định theo `category`. |

### v2.1 — Atomic Distribution, Category & OTP
| Phân loại | Thay đổi |
| --- | --- |
| **Atomic Trip Distribution + Evidence** | Endpoint `POST /api/trips/:id/distribute-with-evidence` kết hợp ghi nhận phân phối + upload ảnh minh chứng trong 1 Prisma transaction. |
| **Event Category & Areas Catalog** | Thêm cột `Event.category` (6 danh mục chuẩn) và endpoint `GET /api/events/catalogs/areas`. |
| **Security & OTP** | Xác thực OTP 3 bước cho đăng ký & quên mật khẩu qua `otp_verifications`, bỏ mật khẩu mặc định hardcode, sinh `orgCode` chống trùng lặp. |
