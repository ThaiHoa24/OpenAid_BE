# OpenAid Backend

Backend cho **OpenAid – Transparent In-Kind Donation & Volunteer Coordination System** (Hệ thống điều phối tình nguyện viên và quyên góp hiện vật minh bạch), xây dựng theo kiến trúc **Modular Monolith** với NestJS, Prisma và PostgreSQL. Frontend Next.js được phát triển ở repository riêng.

> **Đề tài:** Đồ án Tốt nghiệp Capstone 1 (CMU-SE 450) – Viện Đào tạo Quốc tế, Đại học Duy Tân
>
> **Nhóm:** C1SE.102
>
> **Giảng viên hướng dẫn:** ThS. Võ Đình Hiệu

| Thành viên         | Vai trò               |
| ------------------ | --------------------- |
| Phan Vĩnh Thái Hòa | Leader / Scrum Master |
| Trần Lê Hoàng      | Team Member           |
| Tạ Quang Tịnh      | Team Member           |
| Đặng Phước Tường   | Team Member           |

## Phạm vi và trạng thái triển khai

OpenAid hướng tới ba nhóm nghiệp vụ chính: quản lý chiến dịch và tình nguyện viên; tiếp nhận hiện vật, quản lý tồn kho và đóng kiện (Batch); điều phối chuyến phân phối, lưu bằng chứng và tra cứu hành trình đóng góp bằng Tracking ID.

### Trạng thái tính năng hiện tại

| Thành phần | Trạng thái triển khai | Chi tiết |
| --- | :---: | --- |
| **Xác thực (Authentication)** | **Hoàn thành** | Đăng ký, đăng nhập, chuẩn hóa email không phân biệt hoa/thường, mã hóa mật khẩu với `bcrypt`, cấp phát và xác thực JWT Bearer token. |
| **Hồ sơ & Context User** | **Hoàn thành** | Xem/cập nhật hồ sơ cá nhân (`/api/users/profile`), tra cứu danh sách tổ chức và vai trò đang tham gia (`/api/users/memberships`). |
| **Phân quyền 2 tầng (RBAC)** | **Hoàn thành** | <ul><li>**Cấp hệ thống:** `SystemRole` (`USER`, `ADMIN`) bảo vệ bởi `RolesGuard` toàn cục. Đọc role trực tiếp từ database, chống giả mạo token.</li><li>**Cấp tổ chức:** `OrganizationRole` (`MEMBER`, `ORGANIZER`) bảo vệ bởi `OrganizationAccessService`. Chỉ `ORGANIZER` của tổ chức mới được chỉnh sửa hoặc quản lý thành viên.</li></ul> |
| **Quản lý Tổ chức (Organizations)** | **Hoàn thành** | Xem danh sách/chi tiết tổ chức (công khai); Tạo tổ chức kèm tự động gán quyền `ORGANIZER` cho người tạo trong transaction; Cập nhật thông tin và thêm thành viên có kiểm tra quyền `ORGANIZER`. |
| **Quản trị hệ thống (Admin Console)** | **Hoàn thành** | Danh sách tổ chức chờ duyệt, phê duyệt/từ chối tổ chức, xem danh sách người dùng, bật/tắt trạng thái hoạt động tài khoản. Khóa nghiêm ngặt bởi `@Roles(SystemRole.ADMIN)`. |
| **Hạ tầng HTTP & Kiến trúc** | **Hoàn thành** | Modular Monolith (16 modules), validation pipe toàn cục, Transform Interceptor chuẩn hóa response envelope, AllExceptionsFilter, Swagger UI, Liveness endpoint (`/api/health/live`). |
| **Cơ sở dữ liệu** | **Hoàn thành** | PostgreSQL `openaid` gồm 20 models, 12 enums, UUID `gen_random_uuid()`, `TIMESTAMPTZ`. Baseline migration (`20261028000000_init`) và Prisma schema đồng bộ 100%. |
| **Các luồng nghiệp vụ còn lại** | Đang phát triển (Scaffold) | Chiến dịch (Events), Tình nguyện viên (Volunteers), Quyên góp (Donations), Kho (Inventory), Kiện hàng (Batches), Chuyến xe (Trips), Cấp phát (Distribution), Bằng chứng (Evidence), Minh bạch (Transparency), Báo cáo (Dashboard). |
| **Kiểm thử tự động** | **Hoàn thành** | <ul><li>**Unit tests:** 7/7 tests passed (tiện ích và logic đăng ký).</li><li>**E2E Integration tests:** 18/18 tests passed trong `test/auth.e2e-spec.ts` kiểm chứng toàn diện Auth và RBAC (chặn USER thường truy cập trái phép chức năng ADMIN/ORGANIZER).</li><li>**Smoke tests:** 12/12 tests passed trong `test/scaffold.e2e-spec.ts`.</li></ul> |

---

## Mô hình Phân quyền (RBAC Architecture)

Hệ thống tuân thủ nghiêm ngặt nguyên tắc **RBAC 2 tầng** được định tả trong [Tài liệu Kiến trúc](docs/architecture.md) và [API Contract](docs/API_contract/API_CONTRACT_OpenAid.md):

```text
1. SYSTEM-LEVEL ROLE (Toàn hệ thống - Lưu tại User.systemRole)
   ├── USER  : Người dùng thông thường, có thể quyên góp, ứng tuyển tình nguyện viên và tạo tổ chức.
   └── ADMIN : Quản trị viên nền tảng, duyệt tổ chức, quản lý tài khoản, moderation hệ thống.

2. ORGANIZATION-LEVEL ROLE (Theo phạm vi tổ chức - Lưu tại OrganizationMember.role)
   ├── MEMBER    : Thành viên của tổ chức, tham gia các hoạt động thông thường.
   └── ORGANIZER : Trưởng ban tổ chức, có quyền quản lý thông tin tổ chức, duyệt chiến dịch, kho và chuyến xe.

* Lưu ý: "DONOR" và "VOLUNTEER" KHÔNG PHẢI là system role, mà là hành vi tham gia của USER trong từng sự kiện.
```

---

## Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Runtime | Node.js >= 22, npm |
| Ngôn ngữ | TypeScript 6, native ESM (`"type": "module"`) |
| Framework | NestJS 12, Express |
| Database / ORM | PostgreSQL, Prisma 6 (`@prisma/client`) |
| Xác thực & Bảo mật | Passport JWT, bcrypt (hashing 10 rounds), `RolesGuard`, `OrganizationAccessService` |
| Validation / Docs | `class-validator`, `class-transformer`, `@nestjs/swagger` |
| Kiểm thử | Vitest 4, Supertest 7 |
| Code quality | Oxlint, Prettier |
| Container / CI | Docker, Docker Compose, GitHub Actions |

---

## Cấu trúc thư mục

```text
OpenAid_BE/
├── .github/workflows/ci.yml    # Pipeline CI: validate schema, build, lint, test
├── docs/                       # Tài liệu đồ án và đặc tả kỹ thuật
│   ├── API_contract/           # API_CONTRACT_OpenAid.md - Hợp đồng tích hợp FE/BE
│   ├── diagrams/               # Bộ sơ đồ kiến trúc, use case, ERD, data flow
│   ├── architecture.md         # Tài liệu kiến trúc Modular Monolith
│   ├── PRODUCT_BACKLOG.md      # Danh sách backlog theo chuẩn Scrum
│   ├── SRS_OpenAid.md          # Đặc tả yêu cầu phần mềm chi tiết
│   └── C1SE.102_ProjectProposal.docx # Đề cương đồ án Capstone 1
├── prisma/
│   ├── migrations/             # Baseline migration (20261028000000_init)
│   ├── schema.prisma           # 20 models, 12 enums, ràng buộc quan hệ
│   └── seed.mjs                # Script nạp dữ liệu nền tảng mẫu
├── scripts/check-db.mjs        # Script kiểm tra kết nối DB và tính khớp schema
├── src/
│   ├── common/                 # Guards, decorators (@Roles, @Public, @CurrentUser), filters, interceptors
│   ├── config/                 # Cấu hình môi trường và env validation
│   ├── database/               # PrismaModule, PrismaService
│   ├── modules/                # 16 module nghiệp vụ và hệ thống
│   │   ├── auth/               # Đăng ký, đăng nhập, JWT strategy
│   │   ├── users/              # Hồ sơ cá nhân, danh sách memberships
│   │   ├── organizations/      # Quản lý tổ chức, thành viên, OrganizationAccessService
│   │   ├── admin/              # Quản trị hệ thống, duyệt tổ chức, toggle user active
│   │   ├── events/             # Chiến dịch thiện nguyện, vai trò TNV, nhu cầu quyên góp
│   │   ├── volunteers/         # Ứng tuyển và điểm danh tình nguyện viên
│   │   ├── donations/          # Đăng ký quyên góp và sinh Tracking ID
│   │   ├── inventory/          # Quản lý kho theo chiến dịch, loại hàng và đơn vị
│   │   ├── batches/            # Đóng kiện hàng từ các khoản quyên góp
│   │   ├── trips/              # Chuyến xe phân phối và điều phối viên
│   │   ├── distribution/       # Điểm phân phối và xác nhận số lượng thực tế
│   │   ├── evidence/           # Bằng chứng hình ảnh, xác nhận quyền riêng tư
│   │   ├── storage/            # Quản lý lưu trữ tệp (Local / Cloud Storage)
│   │   ├── transparency/       # Tra cứu Tracking ID công khai, timeline minh bạch
│   │   ├── dashboard/          # Thống kê số liệu chiến dịch
│   │   └── health/             # Health check & Liveness endpoint
│   ├── app.module.ts           # Root module
│   ├── bootstrap.ts            # Cấu hình HTTP chung (CORS, Pipes, Interceptors, Swagger)
│   └── main.ts                 # Bootstrap server
├── test/
│   ├── auth.e2e-spec.ts        # 18 test cases E2E cho Auth & RBAC (Done verification)
│   ├── scaffold.e2e-spec.ts    # 12 smoke tests HTTP contracts & Swagger
│   └── postgres-compatibility.e2e-spec.ts # Test tương thích PostgreSQL riêng
├── compose.yaml               # Docker Compose: PostgreSQL + Backend
├── Dockerfile                 # Multi-stage build Dockerfile
├── package.json
└── CONTRIBUTING.md             # Quy định đóng góp mã nguồn của nhóm
```

---

## Khởi chạy dự án cục bộ

### 1. Chuẩn bị môi trường

* Node.js >= 22 và npm.
* PostgreSQL (phiên bản 14+ khuyến nghị).

### 2. Cấu hình biến môi trường

Sao chép file cấu hình mẫu:

```bash
cp .env.example .env
```

*(Trên Windows PowerShell: `Copy-Item .env.example .env`)*

Cập nhật các thông số cần thiết trong file `.env`:

| Biến | Mặc định | Mô tả |
| --- | --- | --- |
| `PORT` | `3001` | Cổng HTTP của server Backend |
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5432/openaid?schema=public` | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | `openaid_jwt_secret_key_caps1_2026` | Khóa bí mật dùng để ký và giải mã JWT token |
| `JWT_EXPIRES_IN` | `7d` | Thời hạn hiệu lực của access token |
| `FRONTEND_URL` | `http://localhost:3000` | Địa chỉ Frontend Next.js cho phép CORS |

### 3. Cài đặt thư viện

```bash
npm ci
```

### 4. Áp dụng Migration & Dữ liệu mẫu

```bash
# Áp dụng migration vào database và sinh Prisma Client
npx prisma migrate dev

# Nạp dữ liệu mẫu ban đầu (danh mục, đơn vị, tài khoản demo)
npm run prisma:seed

# Kiểm tra tính khớp giữa database và schema
npm run db:check
```

### 5. Chạy ứng dụng

```bash
# Chế độ phát triển (Development watch mode)
npm run start:dev

# Hoặc biên dịch và chạy bản Production
npm run build
npm run start:prod
```

Địa chỉ dịch vụ sau khi khởi động:
* **API Base URL:** `http://localhost:3001/api`
* **Swagger API Documentation:** `http://localhost:3001/api/docs`
* **OpenAPI Schema (JSON):** `http://localhost:3001/api/docs-json`
* **Health Liveness:** `http://localhost:3001/api/health/live`

---

## Danh mục API đã hoạt động hoàn chỉnh

Các API đã hoàn thiện logic nghiệp vụ, bảo vệ bởi RBAC và sẵn sàng cho Frontend tích hợp:

| Nhóm | Method | Endpoint | Quyền truy cập | Chức năng |
| --- | --- | --- | --- | --- |
| **Auth** | `POST` | `/api/auth/register` | Công khai | Đăng ký tài khoản mới (mã hóa mật khẩu bằng bcrypt) |
| **Auth** | `POST` | `/api/auth/login` | Công khai | Đăng nhập và nhận Bearer JWT Access Token |
| **Users** | `GET` | `/api/users/profile` | Bearer JWT | Xem thông tin hồ sơ của tài khoản đang đăng nhập |
| **Users** | `PATCH` | `/api/users/profile` | Bearer JWT | Cập nhật hồ sơ (họ tên, số điện thoại, avatar) |
| **Users** | `GET` | `/api/users/memberships` | Bearer JWT | Tra cứu các tổ chức mà tài khoản đang là MEMBER hoặc ORGANIZER |
| **Organizations** | `GET` | `/api/organizations` | Công khai | Lấy danh sách tổ chức thiện nguyện (hỗ trợ phân trang) |
| **Organizations** | `GET` | `/api/organizations/:id` | Công khai | Xem chi tiết thông tin tổ chức |
| **Organizations** | `POST` | `/api/organizations` | Bearer JWT | Tạo hồ sơ tổ chức mới (tự động gán quyền `ORGANIZER` cho người tạo) |
| **Organizations** | `PATCH` | `/api/organizations/:id` | Bearer JWT + `ORGANIZER` | Cập nhật thông tin tổ chức (chỉ `ORGANIZER` của tổ chức được phép) |
| **Organizations** | `POST` | `/api/organizations/:id/members` | Bearer JWT + `ORGANIZER` | Thêm thành viên vào tổ chức (chỉ `ORGANIZER` của tổ chức được phép) |
| **Admin** | `GET` | `/api/admin/organizations/pending` | Bearer JWT + `ADMIN` | Danh sách tổ chức đang chờ duyệt kích hoạt hoạt động |
| **Admin** | `PATCH` | `/api/admin/organizations/:id/review` | Bearer JWT + `ADMIN` | Phê duyệt hoặc từ chối trạng thái hoạt động của tổ chức |
| **Admin** | `GET` | `/api/admin/users` | Bearer JWT + `ADMIN` | Danh sách tất cả người dùng trong hệ thống |
| **Admin** | `PATCH` | `/api/admin/users/:id/active` | Bearer JWT + `ADMIN` | Khóa hoặc mở khóa tài khoản người dùng |
| **Health** | `GET` | `/api/health/live` | Công khai | Kiểm tra tình trạng sống (Liveness) của Backend |

> *Ghi chú: Các endpoint thuộc các miền Events, Volunteers, Donations, Inventory, Batches, Trips, Distribution, Evidence, Transparency, Dashboard đã có sẵn khung Route, DTO và Swagger Contract, đang trả về mã `501 Not Implemented` theo lộ trình phát triển của Sprint tiếp theo.*

---

## Chuẩn Response Envelope

Mọi response thành công đều được chuẩn hóa qua `TransformInterceptor`:

```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2026-11-03T13:40:00.000Z"
}
```

Mọi lỗi nghiệp vụ hoặc phân quyền đều trả về cấu trúc thống nhất qua `AllExceptionsFilter`:

```json
{
  "success": false,
  "statusCode": 403,
  "timestamp": "2026-11-03T13:40:00.000Z",
  "path": "/api/admin/users",
  "message": "You do not have permission to access this resource"
}
```

---

## Các lệnh kiểm thử & bảo trì mã nguồn

| Lệnh | Ý nghĩa |
| --- | --- |
| `npm run lint` | Kiểm tra chất lượng và quy chuẩn code bằng Oxlint (0 errors, 0 warnings) |
| `npm run format` | Định dạng code tự động bằng Prettier |
| `npm run build` | Tự động chạy `prisma generate` và biên dịch NestJS sang `dist/` |
| `npm test` | Chạy bộ Unit Tests bằng Vitest |
| `npm run test:e2e` | Tự động build và chạy toàn bộ kịch bản E2E Integration Tests |
| `npm run db:check` | Kiểm tra kết nối và độ tương thích giữa DB và Prisma |

---

## Tài liệu tham khảo dự án

| Tài liệu | Đường dẫn | Nội dung tóm tắt |
| --- | --- | --- |
| **API Contract** | [docs/API_contract/API_CONTRACT_OpenAid.md](docs/API_contract/API_CONTRACT_OpenAid.md) | Đặc tả hợp đồng API chi tiết giữa Frontend và Backend |
| **Kiến trúc hệ thống** | [docs/architecture.md](docs/architecture.md) | Thiết kế Modular Monolith, ranh giới domain, ràng buộc toàn vẹn |
| **SRS Đặc tả yêu cầu** | [docs/SRS_OpenAid.md](docs/SRS_OpenAid.md) | Bảng đặc tả yêu cầu chức năng (FR) và phi chức năng (NFR) |
| **Product Backlog** | [docs/PRODUCT_BACKLOG.md](docs/PRODUCT_BACKLOG.md) | Backlog đồ án, user stories, phân chia sprint |
| **Bộ sơ đồ thiết kế** | [docs/diagrams/README.md](docs/diagrams/README.md) | Use case diagram, Sequence diagram, ERD database |
| **Đề cương đồ án** | [docs/C1SE.102_ProjectProposal.docx](docs/C1SE.102_ProjectProposal.docx) | Hồ sơ proposal Capstone 1 phê duyệt bởi Duy Tan University |
