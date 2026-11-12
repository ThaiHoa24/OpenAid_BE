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
| **Chiến dịch & Vòng đời Sự kiện (Events Lifecycle)** | **Hoàn thành** | Quản lý vòng đời chiến dịch (`DRAFT` → `PUBLISHED` → `CLOSED`/`CANCELLED`), cấu hình vị trí TNV (`VolunteerRole`), lọc và tìm kiếm sự kiện công khai, xóa nháp an toàn, tự động ghi vết Transparency Audit Log khi chuyển trạng thái. |
| **Nhu cầu Hiện vật & Danh mục (Donation Needs & Catalogs)** | **Hoàn thành** | Tra cứu danh mục loại hàng chuẩn (`ItemType`) và đơn vị tính (`Unit`); Khai báo, thêm, xóa và truy vấn nhu cầu hiện vật (`DonationNeed`) theo chiến dịch; Thuật toán sinh Tracking ID ngẫu nhiên không tuần tự. |
| **Nền tảng Lưu trữ Tệp Dùng Chung (Shared Upload Foundation)** | **Hoàn thành** | Upload file dùng chung (`/api/uploads`), kiểm tra dung lượng tối đa 5MB, lọc định dạng nghiêm ngặt (`JPEG`, `PNG`, `WebP`), sinh mã lưu trữ ngẫu nhiên an toàn, phục vụ stream file tĩnh có cache control. |
| **Nền tảng Ghi vết Minh bạch (Shared Transparency Log Foundation)** | **Hoàn thành** | Ghi log minh bạch trong cùng transaction DB (`TransparencyRepository`), tra cứu nhật ký kiểm toán cho Admin (`/api/transparency/logs`), truy xuất dòng thời gian minh bạch theo thực thể (`/api/transparency/timeline`). |
| **Hạ tầng HTTP & Kiến trúc** | **Hoàn thành** | Modular Monolith (16 modules), validation pipe toàn cục, Transform Interceptor chuẩn hóa response envelope, AllExceptionsFilter, Swagger UI, Liveness endpoint (`/api/health/live`). |
| **Cơ sở dữ liệu** | **Hoàn thành** | PostgreSQL `openaid` gồm 20 models, 12 enums, UUID `gen_random_uuid()`, `TIMESTAMPTZ`. Baseline migration (`20261028000000_init`) và Prisma schema đồng bộ 100%. |
| **Tình nguyện viên (Volunteers)** | **Hoàn thành** | Đăng ký ứng tuyển TNV theo vị trí (VOL-01), xem đơn cá nhân (VOL-02), Organizer duyệt/từ chối đơn (VOL-03, VOL-04), xác nhận Check-in/Check-out ca trực kèm lưu vết thời gian và người xác nhận (VOL-05, VOL-06). |
| **Quyên góp & Tiếp nhận (Donations)** | **Hoàn thành** | Đăng ký quyên góp hiện vật sinh Tracking ID (FR12), xem lịch sử quyên góp của bản thân (FR13), Organizer tiếp nhận hàng vào kho và tự động ghi vết minh bạch trong transaction DB (FR14, FR15, FR20), hủy quyên góp nháp. |
| **Quản lý Tồn kho & Đóng kiện (Inventory & Batches)** | **Hoàn thành** | Quản lý số lượng tồn kho theo sự kiện và loại hàng; Đóng kiện hàng từ các khoản quyên góp (FR16), chuyển trạng thái kiện `PACKED` → `READY` chuẩn bị vận chuyển (FR17). |
| **Chuyến xe Cứu trợ & Phân phối (Trips & Distribution)** | **Hoàn thành** | Lập chuyến xe gán kiện hàng `READY`, điều phối Trip Leader và TNV `APPROVED`, lộ trình các điểm phân phối (TRP-01 - TRP-03); Cập nhật trạng thái chuyến xe (`IN_TRANSIT`, `COMPLETED`); Ghi nhận số lượng hiện vật cấp phát thực tế tại điểm (FR18, FR19). |
| **Bằng chứng & Minh bạch Công khai (Evidence & Transparency)** | **Hoàn thành** | Tải lên ảnh/biên bản bàn giao tại điểm phát, Organizer phê duyệt bằng chứng (FR19); Tra cứu hành trình minh bạch công khai qua Tracking ID không cần đăng nhập (FR21, FR22), xem timeline kiểm toán hệ thống. |
| **Thống kê & Báo cáo (Dashboard)** | **Hoàn thành** | Thống kê số liệu tổng quan theo chiến dịch: tổng hiện vật quyên góp, tỷ lệ hoàn thành nhu cầu, số lượng tồn kho, tiến độ chuyến xe và số lượng TNV tham gia. |
| **Kiểm thử tự động** | **Hoàn thành** | <ul><li>**Unit tests:** 110/110 tests passed (kiểm thử 10.000 Tracking ID duy nhất 0% collision, StorageService, TransparencyService, EventsService, AuthService, VolunteersService, DonationsService, BatchesService, TripsService, DistributionService, CommonUtils).</li><li>**E2E Integration & Smoke tests:** 30/30 tests passed trong `test/auth.e2e-spec.ts` và `test/scaffold.e2e-spec.ts`.</li></ul> |

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
| File Storage | Multer, Local disk storage (chính sách JPEG/PNG/WebP, max 5MB) |
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
│   │   ├── events/             # Quản lý chiến dịch, vai trò TNV, nhu cầu quyên góp, catalogs
│   │   ├── volunteers/         # Ứng tuyển và điểm danh tình nguyện viên
│   │   ├── donations/          # Đăng ký quyên góp và sinh Tracking ID
│   │   ├── inventory/          # Quản lý kho theo chiến dịch, loại hàng và đơn vị
│   │   ├── batches/            # Đóng kiện hàng từ các khoản quyên góp
│   │   ├── trips/              # Chuyến xe phân phối và điều phối viên
│   │   ├── distribution/       # Điểm phân phối và xác nhận số lượng thực tế
│   │   ├── evidence/           # Bằng chứng hình ảnh, xác nhận quyền riêng tư
│   │   ├── storage/            # Quản lý lưu trữ tệp (Local Storage, kiểm duyệt MIME/size)
│   │   ├── transparency/       # Tra cứu nhật ký kiểm toán, timeline minh bạch
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
| **Admin** | `GET` | `/api/admin/organizations/pending` | Bearer JWT + `ADMIN` | Danh sách tổ chức đang chờ duyệt (`ADM-01`) |
| **Admin** | `PATCH` | `/api/admin/organizations/:id/review` | Bearer JWT + `ADMIN` | Phê duyệt hoặc từ chối tổ chức kèm ghi vết `TransparencyLog` (`ADM-02`) |
| **Admin** | `GET` | `/api/admin/users` | Bearer JWT + `ADMIN` | Danh sách tất cả người dùng trong hệ thống (`ADM-03`) |
| **Admin** | `PATCH` | `/api/admin/users/:id/active` | Bearer JWT + `ADMIN` | Khóa hoặc mở khóa tài khoản người dùng (chặn tự khóa chính mình) (`ADM-04`) |
| **Admin** | `GET` | `/api/admin/events` | Bearer JWT + `ADMIN` | Danh sách toàn bộ sự kiện kèm tìm kiếm, lọc theo tổ chức và trạng thái (`ADM-05`) |
| **Admin** | `PATCH` | `/api/admin/events/:id/status` | Bearer JWT + `ADMIN` | Kiểm duyệt sự kiện cấp hệ thống (`SUSPENDED` / `CLOSED`, `PUBLISHED`, `CANCELLED`) (`ADM-06`) |
| **Events** | `GET` | `/api/events/catalogs/item-types` | Công khai | Lấy danh mục các loại hàng hóa cứu trợ đang hoạt động (`ItemType`) |
| **Events** | `GET` | `/api/events/catalogs/units` | Công khai | Lấy danh mục các đơn vị đo lường đang hoạt động (`Unit`) |
| **Events** | `GET` | `/api/events` | Công khai | Khám phá, lọc danh sách chiến dịch theo địa bàn, tổ chức, trạng thái, từ khóa |
| **Events** | `GET` | `/api/events/:id` | Công khai | Xem chi tiết thông tin chiến dịch, vị trí TNV và nhu cầu hàng hóa |
| **Events** | `POST` | `/api/events` | Bearer JWT + `ORGANIZER` | Tạo chiến dịch mới ở trạng thái `DRAFT` kèm roles và donation needs |
| **Events** | `PATCH` | `/api/events/:id` | Bearer JWT + `ORGANIZER` | Cập nhật thông tin chiến dịch (chỉ áp dụng khi chiến dịch là `DRAFT`) |
| **Events** | `PATCH` | `/api/events/:id/status` | Bearer JWT + `ORGANIZER` | Đổi trạng thái (`PUBLISHED`, `CLOSED`, `CANCELLED`) và ghi audit log |
| **Events** | `DELETE` | `/api/events/:id` | Bearer JWT + `ORGANIZER` | Xóa chiến dịch nháp `DRAFT` (chỉ khi chưa có đơn TNV, quyên góp, chuyến xe) |
| **Events** | `GET` | `/api/events/:id/donation-needs` | Công khai | Tra cứu danh sách nhu cầu hiện vật của một chiến dịch cụ thể |
| **Events** | `POST` | `/api/events/:id/donation-needs` | Bearer JWT + `ORGANIZER` | Khai báo bổ sung nhu cầu hiện vật vào chiến dịch `DRAFT` |
| **Events** | `PATCH` | `/api/events/donation-needs/:id` | Bearer JWT + `ORGANIZER` | Cập nhật độc lập 1 nhu cầu quyên góp (`EVT-SUB`) |
| **Events** | `DELETE` | `/api/events/donation-needs/:id` | Bearer JWT + `ORGANIZER` | Xóa độc lập 1 nhu cầu quyên góp khỏi chiến dịch (`EVT-SUB`) |
| **Events** | `GET` | `/api/events/:id/volunteer-roles` | Công khai | Lấy danh sách vị trí tuyển tình nguyện viên của sự kiện (`EVT-SUB`) |
| **Events** | `POST` | `/api/events/:id/volunteer-roles` | Bearer JWT + `ORGANIZER` | Thêm mới 1 vị trí tình nguyện viên vào sự kiện (`EVT-SUB`) |
| **Events** | `PATCH` | `/api/events/volunteer-roles/:id` | Bearer JWT + `ORGANIZER` | Cập nhật độc lập 1 vị trí tình nguyện viên (`EVT-SUB`) |
| **Events** | `DELETE` | `/api/events/volunteer-roles/:id` | Bearer JWT + `ORGANIZER` | Xóa độc lập 1 vị trí tình nguyện viên (`EVT-SUB`) |
| **Storage** | `POST` | `/api/uploads` | Bearer JWT | Tải lên tệp ảnh (`JPEG`/`PNG`/`WebP`, <= 5MB) trả về URL và metadata |
| **Storage** | `GET` | `/api/uploads/:key` | Công khai | Phục vụ xem/tải trực tiếp file ảnh đã tải lên |
| **Volunteers** | `POST` | `/api/volunteers/apply` | Bearer JWT | Nộp đơn ứng tuyển tình nguyện viên vào sự kiện (`VOL-01`) |
| **Volunteers** | `GET` | `/api/volunteers/my` | Bearer JWT | Xem danh sách hoạt động và trạng thái ứng tuyển của bản thân (`VOL-02`) |
| **Volunteers** | `GET` | `/api/volunteers/event/:eventId` | Bearer JWT + `ORGANIZER` | Xem danh sách tình nguyện viên ứng tuyển theo sự kiện (`VOL-03`) |
| **Volunteers** | `PATCH` | `/api/volunteers/:id/review` | Bearer JWT + `ORGANIZER` | Xét duyệt (`APPROVED`/`REJECTED`) đơn ứng tuyển tình nguyện viên (`VOL-04`) |
| **Volunteers** | `POST` | `/api/volunteers/:id/check-in` | Bearer JWT + `ORGANIZER` | Xác nhận Check-in ca trực tình nguyện viên (`VOL-05`) |
| **Volunteers** | `POST` | `/api/volunteers/:id/check-out` | Bearer JWT + `ORGANIZER` | Xác nhận Check-out ca trực tình nguyện viên (`VOL-06`) |
| **Donations** | `POST` | `/api/donations` | Bearer JWT | Đăng ký quyên góp hiện vật mới (`{ donationNeedId, quantity, photoUrl?, notes? }`) và sinh Tracking ID (`FR12`, `DON-IMG`) |
| **Donations** | `GET` | `/api/donations/my` | Bearer JWT | Xem lịch sử các khoản quyên góp của bản thân (`FR13`) |
| **Donations** | `GET` | `/api/donations/event/:eventId` | Bearer JWT + `ORGANIZER` | Danh sách các khoản quyên góp theo chiến dịch (`FR14`) |
| **Donations** | `PATCH` | `/api/donations/:id/receipt` | Bearer JWT + `ORGANIZER` | Tiếp nhận hiện vật vào kho (`RECEIVED`) hoặc từ chối (`REJECTED`) (`FR14`, `FR15`) |
| **Donations** | `POST` | `/api/donations/:id/cancel` | Bearer JWT | Hủy khoản quyên góp đang ở trạng thái `PENDING` của bản thân (`FR12`) |
| **Inventory** | `GET` | `/api/inventory/organization/:organizationId` | Bearer JWT + `ORGANIZER` | Truy vấn tồn kho (`Available`/`Reserved`/`Distributed`/`Lost`) theo tổ chức và `eventId` (`OA-S4-05`) |
| **Batches** | `POST` | `/api/batches` | Bearer JWT + `ORGANIZER` | Đóng kiện hàng mới từ các khoản quyên góp đã nhận (`BAT-01`) |
| **Batches** | `GET` | `/api/batches/event/:eventId` | Bearer JWT + `ORGANIZER` | Danh sách các kiện hàng cứu trợ theo sự kiện (`BAT-02`) |
| **Batches** | `GET` | `/api/batches/:id` | Bearer JWT + `ORGANIZER` | Chi tiết kiện hàng kèm danh sách các khoản quyên góp thành phần (`BAT-03`) |
| **Batches** | `PATCH` | `/api/batches/:id/status` | Bearer JWT + `ORGANIZER` | Cập nhật trạng thái kiện hàng (chuyển sang `READY` để gán chuyến xe) (`BAT-04`) |
| **Batches** | `POST` | `/api/batches/:id/reconcile` | Bearer JWT + `ORGANIZER` | Đối soát kết quả lô hàng sau chuyến đi (`returnedQuantity`, `lostQuantity`, `note`) (`BAT-05`) |
| **Trips** | `GET` | `/api/trips/event/:eventId` | Bearer JWT + `ORGANIZER` | Danh sách chuyến xe cứu trợ theo sự kiện (`TRP-01`) |
| **Trips** | `GET` | `/api/trips/:id` | Bearer JWT + `ORGANIZER` | Chi tiết chuyến xe, lô hàng (`TripBatch`), điểm phát và nhân sự (`TRP-02`) |
| **Trips** | `POST` | `/api/trips` | Bearer JWT + `ORGANIZER` | Lập chuyến xe mới: gán kiện `READY`, TNV (1 Leader), điểm phát (`TRP-03`) |
| **Trips** | `PATCH` | `/api/trips/:id/status` | Bearer JWT + `ORGANIZER` | Cập nhật trạng thái chuyến xe (`SCHEDULED` → `PREPARING` → `IN_TRANSIT` → `COMPLETED` / `CANCELLED`) (`TRP-04`) |
| **Distribution** | `POST` | `/api/distribution/records` | Bearer JWT + `ORGANIZER` | Ghi nhận số lượng hiện vật cấp phát thực tế tại điểm theo `tripBatchId` (`DIS-01`) |
| **Distribution** | `GET` | `/api/distribution/records/:id` | Bearer JWT + `ORGANIZER` | Xem chi tiết một biên bản cấp phát thực tế (`DIS-02`) |
| **Distribution** | `GET` | `/api/distribution/trip/:tripId` | Bearer JWT + `ORGANIZER` | Xem toàn bộ biên bản cấp phát của một chuyến xe (`DIS-03`) |
| **Distribution** | `PATCH` | `/api/distribution/points/:id/status` | Bearer JWT + `ORGANIZER` | Cập nhật trạng thái Điểm phát (`PENDING` → `ARRIVED` → `DISTRIBUTED` / `SKIPPED`) (`DIS-04`) |
| **Evidence** | `POST` | `/api/evidence` | Bearer JWT | Tải lên bằng chứng phân phối (ảnh, chú thích, xác nhận quyền riêng tư) (`OA-S5-08`) |
| **Evidence** | `GET` | `/api/evidence/trip/:tripId` | Bearer JWT | Xem danh sách ảnh/biên bản bằng chứng của một chuyến xe |
| **Evidence** | `PATCH` | `/api/evidence/:id/review` | Bearer JWT + `ORGANIZER` | Phê duyệt (`APPROVED`) hoặc từ chối (`REJECTED`) bằng chứng hình ảnh (`OA-S5-08`) |
| **Dashboard** | `GET` | `/api/dashboard/events/:eventId` | Bearer JWT + `ORGANIZER` | Thống kê số liệu tổng quan của sự kiện (Donations, Batches, Trips, Volunteers, Inventory) (`OA-S4-04`) |
| **Reports** | `GET` | `/api/reports/events/:id/export` | Bearer JWT + `ORGANIZER` | Xuất báo cáo tổng kết nghiệm thu chiến dịch (`CSV` / `Excel` / `PDF` / `JSON`) (`REP-01`) |
| **Transparency** | `GET` | `/api/transparency/track/:trackingId` | Công khai | Tra cứu công khai hành trình đóng góp và minh bạch bằng Tracking ID (`FR21`, `FR22`) |
| **Transparency** | `GET` | `/api/transparency/logs` | Bearer JWT + `ADMIN` | Tra cứu danh sách nhật ký kiểm toán toàn hệ thống (hỗ trợ phân trang) |
| **Transparency** | `GET` | `/api/transparency/timeline` | Công khai / Bearer JWT | Xem dòng thời gian minh bạch theo từng thực thể (`entityType`, `entityId`) |
| **Health** | `GET` | `/api/health/live` | Công khai | Kiểm tra tình trạng sống (Liveness) của Backend |

---

## Chuẩn Response Envelope

Mọi response thành công đều được chuẩn hóa qua `TransformInterceptor`:

```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "timestamp": "2026-11-04T14:40:00.000Z"
}
```

Mọi lỗi nghiệp vụ hoặc phân quyền đều trả về cấu trúc thống nhất qua `AllExceptionsFilter`:

```json
{
  "success": false,
  "statusCode": 403,
  "timestamp": "2026-11-04T14:40:00.000Z",
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
| `npm test` | Chạy bộ Unit Tests cho toàn bộ 16 module bằng Vitest (`141/141 passed`) |
| `npm run test:e2e` | Tự động build và chạy toàn bộ kịch bản E2E Integration & Smoke Tests (`30/30 passed`) |
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
