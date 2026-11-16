# OpenAid Backend

Backend cho **OpenAid – Transparent In-Kind Donation & Volunteer Coordination System** (Hệ thống điều phối tình nguyện viên và quyên góp hiện vật minh bạch), xây dựng theo kiến trúc **Modular Monolith** với NestJS 12, Prisma 6 và PostgreSQL. Tích hợp hoàn chỉnh với Frontend Next.js (`OpenAid_FE`).

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

OpenAid giải quyết trọn vẹn ba nhóm nghiệp vụ cốt lõi:
1. **Quản lý tổ chức, chiến dịch & tình nguyện viên**: Đăng ký tổ chức, xét duyệt pháp nhân, phát động chiến dịch, ứng tuyển, xét duyệt và điểm danh thực địa.
2. **Tiếp nhận hiện vật, tồn kho bảo toàn & đóng kiện (Batch)**: Tiếp nhận quyên góp kèm Tracking ID, tự động cập nhật tồn kho bảo toàn (`Available`, `Reserved`, `Distributed`, `Lost`), gom lô hàng và đối soát sau chuyến đi.
3. **Điều phối chuyến xe, bằng chứng thực địa & minh bạch công khai**: Lập chuyến xe (1 Trip Leader + TNV + các lô hàng `READY`), cập nhật điểm phát, ghi nhận bàn giao, duyệt ảnh minh chứng (ẩn danh quyền riêng tư) và tra cứu hành trình công khai qua Tracking ID.

### Trạng thái các module

| Thành phần | Trạng thái | Chi tiết triển khai |
| --- | :---: | --- |
| **Xác thực & OTP Email (`auth`, `mail`)** | **Hoàn thành** | Đăng ký trực tiếp hoặc xác thực OTP qua email (`Nodemailer` SMTP), quên mật khẩu & đặt lại mật khẩu bằng OTP, chuẩn hóa email, mã hóa mật khẩu `bcrypt`, cấp và xác thực JWT Bearer token. |
| **Hồ sơ & Context User (`users`)** | **Hoàn thành** | Xem/cập nhật hồ sơ cá nhân (`/api/users/profile`: `fullName`, `phoneNumber`, `avatarUrl`), tra cứu danh sách tổ chức và vai trò tham gia (`/api/users/memberships`). |
| **Phân quyền 2 tầng (RBAC)** | **Hoàn thành** | **Cấp hệ thống:** `SystemRole` (`USER`, `ADMIN`) bảo vệ bởi `JwtAuthGuard` và `RolesGuard` toàn cục.<br>**Cấp tổ chức:** `OrganizationRole` (`MEMBER`, `ORGANIZER`) bảo vệ bởi `OrganizationAccessService`. |
| **Tổ chức (`organizations`)** | **Hoàn thành** | Danh sách/chi tiết tổ chức kèm `_count` (`events`, `members`); tạo tổ chức tự động gán `ORGANIZER` cho người tạo trong transaction; cập nhật thông tin (`name`, `description`, `email`, `phoneNumber`, `address`) và mời thành viên. |
| **Quản trị hệ thống (`admin`)** | **Hoàn thành** | Danh sách tổ chức chờ duyệt (`ADM-01`), duyệt/từ chối/đình chỉ tổ chức kèm `rejectionReason` và `TransparencyLog` (`ADM-02`), danh sách user kèm `memberships` & `_count` (`ADM-03`), khóa/mở khóa tài khoản (`ADM-04`), quản lý và kiểm duyệt sự kiện toàn hệ thống (`ADM-05`, `ADM-06`). |
| **Chiến dịch & Danh mục (`events`)** | **Hoàn thành** | Vòng đời chiến dịch (`DRAFT` → `PUBLISHED` → `CLOSED` / `CANCELLED`), quản lý `VolunteerRole` và `DonationNeed` (tính toán sẵn `approvedQuantity`, `pledgedQuantity`, `receivedQuantity`, `distributedQuantity`, `_count`), danh mục `ItemType` & `Unit`. |
| **Tình nguyện viên (`volunteers`)** | **Hoàn thành** | Ứng tuyển TNV (`VOL-01`), xem đơn cá nhân (`VOL-02`), danh sách theo sự kiện (`VOL-03`), duyệt/từ chối kèm `rejectionReason` (`VOL-04`), Check-in / Check-out ca trực (`VOL-05`, `VOL-06`). |
| **Quyên góp (`donations`)** | **Hoàn thành** | Đăng ký quyên góp sinh Tracking ID (`TRK-...`) hỗ trợ `photoUrl` & `notes`, xem lịch sử cá nhân, tiếp nhận vào kho (`RECEIVED`) hoặc từ chối (`REJECTED`) kèm cập nhật `Inventory` và `TransparencyLog`, hủy đơn `PENDING`. |
| **Kho bãi & Đóng kiện (`inventory`, `batches`)** | **Hoàn thành** | Truy vấn tồn kho bảo toàn theo tổ chức & sự kiện (`OA-S4-05`), đóng lô hàng từ các khoản `RECEIVED` (`BAT-01`), chuyển trạng thái `READY` (`BAT-04`), đối soát `returnedQuantity` / `lostQuantity` sau chuyến đi (`BAT-05`). |
| **Chuyến xe & Phân phối (`trips`, `distribution`)** | **Hoàn thành** | Lập chuyến xe gán lô `READY`, TNV `APPROVED` (đúng 1 `LEADER`) và các điểm phát (`TRP-03`); tra cứu chuyến xe công khai cho sự kiện đã công bố (`TRP-01`); cập nhật trạng thái chuyến xe (`TRP-04`), điểm phát (`DIS-04`) và ghi nhận số lượng trao tặng (`DIS-01`). |
| **Bằng chứng & Minh bạch (`evidence`, `transparency`, `storage`)** | **Hoàn thành** | Upload ảnh (`JPEG`/`PNG`/`WebP` <= 5MB) qua `/api/uploads`, tải lên & duyệt bằng chứng thực địa kèm xác nhận quyền riêng tư, tra cứu công khai theo `trackingId`, audit logs và timeline. |
| **Thống kê & Báo cáo (`dashboard`)** | **Hoàn thành** | Thống kê tổng quan sự kiện (`/api/dashboard/events/:eventId` kèm số lượng pending donations/applications/evidences), xuất báo cáo nghiệm thu `CSV` / `Excel` / `PDF` / `JSON` (`/api/reports/events/:id/export`). |
| **Kiểm thử tự động** | **Hoàn thành** | **Unit tests:** 141/141 tests passed trên 16 test files (Vitest).<br>**E2E & Smoke tests:** Kịch bản kiểm thử tích hợp Auth, RBAC & HTTP contracts (`test/auth.e2e-spec.ts`, `test/scaffold.e2e-spec.ts`). |

---

## Mô hình Phân quyền (RBAC 2 tầng)

Hệ thống tuân thủ mô hình **RBAC 2 tầng** ([docs/architecture.md](docs/architecture.md) và [docs/API_contract/API_CONTRACT_OpenAid.md](docs/API_contract/API_CONTRACT_OpenAid.md)):

```text
1. SYSTEM-LEVEL ROLE (Toàn hệ thống - User.systemRole)
   ├── USER  : Người dùng thông thường (có thể quyên góp, ứng tuyển TNV, tạo tổ chức).
   └── ADMIN : Quản trị viên nền tảng (duyệt tổ chức, quản lý user, kiểm duyệt sự kiện, xem audit logs).

2. ORGANIZATION-LEVEL ROLE (Theo phạm vi tổ chức - OrganizationMember.role)
   ├── MEMBER    : Thành viên của tổ chức.
   └── ORGANIZER : Điều phối viên của tổ chức (quản lý chiến dịch, duyệt TNV, kho, lô hàng, chuyến xe).
```

---

## Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Runtime | Node.js >= 22, npm |
| Ngôn ngữ | TypeScript 6, native ESM (`"type": "module"`) |
| Framework | NestJS 12, Express |
| Database / ORM | PostgreSQL, Prisma 6 (`@prisma/client`) |
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
│   ├── migrations/             # Lịch sử migrations PostgreSQL
│   ├── schema.prisma           # Định nghĩa models, enums, ràng buộc quan hệ
│   └── seed.mjs                # Script nạp dữ liệu mẫu (users, orgs, events, batches, trips...)
├── scripts/check-db.mjs        # Kiểm tra kết nối DB và độ khớp Prisma schema
├── src/
│   ├── common/                 # Guards, decorators (@Roles, @Public, @CurrentUser), filters, interceptors, pipes
│   ├── config/                 # Cấu hình môi trường và env validation
│   ├── database/               # PrismaModule, PrismaService
│   ├── modules/                # 17 modules: admin, auth, batches, dashboard, distribution, donations,
│   │                           # events, evidence, health, inventory, mail, organizations, storage,
│   │                           # transparency, trips, users, volunteers
│   ├── app.module.ts           # Root module
│   ├── bootstrap.ts            # Cấu hình HTTP chung (CORS, /api prefix, Pipes, Interceptors, Swagger)
│   └── main.ts                 # Bootstrap server
├── test/                       # E2E & compatibility tests
├── compose.yaml                # Docker Compose cho Backend + PostgreSQL
├── Dockerfile                  # Multi-stage build Dockerfile
├── package.json
└── CONTRIBUTING.md
```

---

## Khởi chạy dự án cục bộ

### 1. Chuẩn bị môi trường
* Node.js >= 22 và npm.
* PostgreSQL 14+ (hoặc chạy qua Docker Compose).

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

### 3. Cài đặt, Migration & Seed dữ liệu mẫu

```bash
# Cài đặt thư viện
npm ci

# Áp dụng migration và sinh Prisma Client
npx prisma migrate dev

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

*(Hoặc chạy toàn bộ hệ thống `db` + `backend` + `frontend` bằng `docker compose up --build` tại thư mục gốc `OpenAid/`.)*

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
| **Auth** | `POST` | `/api/auth/send-register-otp` | Công khai | Gửi OTP xác thực email đăng ký |
| **Auth** | `POST` | `/api/auth/verify-register` | Công khai | Xác thực OTP và đăng ký tài khoản |
| **Auth** | `POST` | `/api/auth/forgot-password` | Công khai | Gửi OTP đặt lại mật khẩu |
| **Auth** | `POST` | `/api/auth/reset-password` | Công khai | Đặt lại mật khẩu với OTP |
| **Auth** | `POST` | `/api/auth/register` | Công khai | Đăng ký trực tiếp (không OTP) |
| **Auth** | `POST` | `/api/auth/login` | Công khai | Đăng nhập nhận JWT Access Token |
| **Users** | `GET` / `PATCH` | `/api/users/profile` | Bearer JWT | Xem / cập nhật hồ sơ cá nhân |
| **Users** | `GET` | `/api/users/memberships` | Bearer JWT | Danh sách tổ chức và vai trò của user |
| **Organizations** | `GET` | `/api/organizations`, `/api/organizations/:id` | Công khai | Danh sách và chi tiết tổ chức (kèm thành viên & `_count`) |
| **Organizations** | `POST` | `/api/organizations` | Bearer JWT | Đăng ký tổ chức mới (trạng thái `PENDING`) |
| **Organizations** | `PATCH` | `/api/organizations/:id` | `ORGANIZER` | Cập nhật thông tin tổ chức |
| **Organizations** | `POST` | `/api/organizations/:id/members` | `ORGANIZER` | Mời / thêm thành viên vào tổ chức |
| **Admin** | `GET` | `/api/admin/organizations/pending` | `ADMIN` | Danh sách tổ chức chờ duyệt |
| **Admin** | `PATCH` | `/api/admin/organizations/:id/review` | `ADMIN` | Duyệt / từ chối / đình chỉ tổ chức |
| **Admin** | `GET` | `/api/admin/users` | `ADMIN` | Danh sách user (kèm `memberships` & `_count`) |
| **Admin** | `PATCH` | `/api/admin/users/:id/active` | `ADMIN` | Khóa / mở khóa tài khoản user |
| **Admin** | `GET` | `/api/admin/events` | `ADMIN` | Danh sách toàn bộ sự kiện mọi trạng thái |
| **Admin** | `PATCH` | `/api/admin/events/:id/status` | `ADMIN` | Kiểm duyệt / tạm đình chỉ / mở lại sự kiện |
| **Events** | `GET` | `/api/events/catalogs/item-types`, `/units` | Công khai | Danh mục loại hàng hóa & đơn vị tính |
| **Events** | `GET` | `/api/events`, `/api/events/:id` | Công khai | Danh sách & chi tiết sự kiện (kèm tiến độ thực tế) |
| **Events** | `POST` / `PATCH` / `DELETE` | `/api/events`, `/api/events/:id` | `ORGANIZER` | Tạo, cập nhật, xóa nháp chiến dịch |
| **Events** | `PATCH` | `/api/events/:id/status` | `ORGANIZER` / `ADMIN` | Chuyển trạng thái (`PUBLISHED`, `CLOSED`, `CANCELLED`) |
| **Events** | `GET` / `POST` / `PATCH` / `DELETE` | `/api/events/:id/donation-needs*`, `/volunteer-roles*` | Công khai / `ORGANIZER` | Quản lý nhu cầu hiện vật và vị trí TNV |
| **Volunteers** | `POST` | `/api/volunteers/apply` | Bearer JWT | Nộp đơn ứng tuyển TNV |
| **Volunteers** | `GET` | `/api/volunteers/my` | Bearer JWT | Đơn ứng tuyển của bản thân |
| **Volunteers** | `GET` | `/api/volunteers/event/:eventId` | `ORGANIZER` | Danh sách đơn TNV theo sự kiện |
| **Volunteers** | `PATCH` | `/api/volunteers/:id/review` | `ORGANIZER` | Duyệt / từ chối đơn (hỗ trợ `rejectionReason`) |
| **Volunteers** | `POST` | `/api/volunteers/:id/check-in`, `/check-out` | TNV / `ORGANIZER` | Điểm danh Check-in / Check-out ca trực |
| **Donations** | `POST` | `/api/donations` | Bearer JWT | Cam kết quyên góp & sinh Tracking ID |
| **Donations** | `GET` | `/api/donations/my` | Bearer JWT | Lịch sử quyên góp của bản thân |
| **Donations** | `GET` | `/api/donations/event/:eventId` | `ORGANIZER` | Danh sách quyên góp theo sự kiện |
| **Donations** | `PATCH` | `/api/donations/:id/receipt` | `ORGANIZER` | Xác nhận nhập kho (`RECEIVED`) hoặc từ chối (`REJECTED`) |
| **Donations** | `POST` | `/api/donations/:id/cancel` | Bearer JWT | Hủy khoản quyên góp `PENDING` |
| **Inventory** | `GET` | `/api/inventory/organization/:organizationId` | `ORGANIZER` | Tồn kho bảo toàn theo tổ chức & `eventId` |
| **Batches** | `POST` / `GET` / `PATCH` | `/api/batches`, `/event/:eventId`, `/:id/status` | `ORGANIZER` | Tạo lô hàng, xem chi tiết, chuyển sang `READY` |
| **Batches** | `POST` | `/api/batches/:id/reconcile` | `ORGANIZER` | Đối soát hoàn kho / thất thoát sau chuyến đi |
| **Trips** | `GET` | `/api/trips/event/:eventId` | Công khai / `ORGANIZER` | Danh sách chuyến xe theo sự kiện (kèm `records` & `evidence` đã duyệt) |
| **Trips** | `GET` | `/api/trips/:id` | `ORGANIZER` / TNV chuyến xe | Chi tiết chuyến xe |
| **Trips** | `POST` / `PATCH` | `/api/trips`, `/api/trips/:id/status` | `ORGANIZER` / Trip Leader | Lập chuyến xe & cập nhật trạng thái |
| **Distribution** | `POST` / `GET` | `/api/distribution/records`, `/trip/:tripId` | `ORGANIZER` / Trip Leader | Ghi nhận & xem biên bản cấp phát tại điểm |
| **Distribution** | `PATCH` | `/api/distribution/points/:id/status` | `ORGANIZER` / Trip Leader | Cập nhật trạng thái điểm phát |
| **Evidence** | `POST` / `GET` | `/api/evidence`, `/api/evidence/trip/:tripId` | `ORGANIZER` / TNV chuyến xe | Tải lên & xem bằng chứng phân phối |
| **Evidence** | `PATCH` | `/api/evidence/:id/review` | `ORGANIZER` | Phê duyệt / từ chối bằng chứng công khai |
| **Storage** | `POST` / `GET` | `/api/uploads`, `/api/uploads/:key` | Bearer JWT / Công khai | Tải lên & truy xuất file ảnh |
| **Dashboard & Reports** | `GET` | `/api/dashboard/events/:eventId`, `/api/reports/events/:id/export` | `ORGANIZER` / `ADMIN` | Thống kê sự kiện & xuất báo cáo (`csv`, `excel`, `pdf`, `json`) |
| **Transparency** | `GET` | `/api/transparency/track/:trackingId`, `/timeline`, `/logs` | Công khai / `ADMIN` | Tra cứu hành trình công khai, timeline & audit logs |
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
| `npm test` | Chạy Unit Tests toàn bộ 16 modules bằng Vitest (`141/141 passed`) |
| `npm run test:e2e` | Build và chạy E2E Integration & Smoke Tests (`vitest.config.e2e.ts`) |
| `npm run db:check` | Kiểm tra kết nối và độ khớp giữa DB và Prisma schema |
