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

OpenAid hướng tới ba nhóm nghiệp vụ: quản lý chiến dịch và tình nguyện viên; tiếp nhận hiện vật, quản lý tồn kho và đóng kiện; điều phối chuyến phân phối, lưu bằng chứng và tra cứu hành trình đóng góp bằng Tracking ID.

**Repository hiện ở giai đoạn xây dựng nền tảng, chưa có luồng nghiệp vụ hoàn chỉnh từ đầu đến cuối.**

| Thành phần         | Trạng thái hiện tại                                                                                                                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tài khoản và hồ sơ | Đã có xử lý đăng ký, đăng nhập, phát JWT, xem và cập nhật hồ sơ cá nhân.                                                                                                                                                                |
| Hạ tầng HTTP       | Đã có JWT guard và system-role guard toàn cục, validation DTO, CORS, định dạng response, xử lý lỗi, Swagger và liveness endpoint.                                                                                                       |
| Cơ sở dữ liệu      | Đã có Prisma schema, initial migration SQL và seed dữ liệu nền tảng. Cần chạy migration để tạo database.                                                                                                                                |
| Module nghiệp vụ   | Đã có route, DTO, controller và service khung cho tổ chức, chiến dịch, tình nguyện viên, quyên góp, kho, kiện hàng, chuyến xe, cấp phát, bằng chứng, minh bạch, dashboard và quản trị. Các use case này đang trả `501 Not Implemented`. |
| Lưu trữ ảnh        | Đã có interface và service placeholder; lưu/xóa tệp chưa được triển khai.                                                                                                                                                               |
| Kiểm thử           | Đã có unit test cho tiện ích và HTTP smoke test dùng Prisma mock. Các kịch bản tích hợp nghiệp vụ còn là `it.todo`.                                                                                                                     |

Các endpoint khung gọi `featureNotImplemented()` với mã yêu cầu FR cần triển khai. Request vẫn có thể bị từ chối bởi xác thực, phân quyền hoặc validation trước khi tới service.

## Công nghệ sử dụng

Các phiên bản chính dưới đây theo khai báo trong `package.json` và image trong `compose.yaml`:

| Thành phần            | Công nghệ                                                 |
| --------------------- | --------------------------------------------------------- |
| Runtime               | Node.js >= 22, npm                                        |
| Ngôn ngữ              | TypeScript 6, native ESM (`"type": "module"`)             |
| Framework             | NestJS 12, Express                                        |
| Database / ORM        | PostgreSQL 16, Prisma 6 (`@prisma/client`)                |
| Xác thực              | Passport JWT, bcrypt                                      |
| Validation / API docs | `class-validator`, `class-transformer`, `@nestjs/swagger` |
| Kiểm thử              | Vitest 4, Supertest 7, coverage V8                        |
| Chất lượng mã nguồn   | Oxlint, Prettier                                          |
| Container / CI        | Docker Compose, GitHub Actions                            |

## Cấu trúc dự án

```text
OpenAid_BE/
├── .github/workflows/ci.yml    # Validate schema, build, lint, unit test và E2E
├── docs/                       # Đặc tả, API contract và tài liệu kiến trúc
│   ├── API_contract/
│   ├── diagrams/
│   ├── architecture.md
│   ├── PRODUCT_BACKLOG.md
│   ├── SRS_OpenAid.md
│   └── C1SE.102_ProjectProposal.docx
├── prisma/
│   ├── migrations/             # Migration SQL, CHECK và partial unique index
│   ├── schema.prisma           # 20 models, 12 enums và các quan hệ dữ liệu
│   └── seed.mjs                # Script thực thi bởi npm run prisma:seed
├── src/
│   ├── common/                 # Decorator, guard, DTO, filter, interceptor, pipe, utils
│   ├── config/                 # Cấu hình và kiểm tra biến môi trường
│   ├── database/               # PrismaModule, PrismaService
│   ├── modules/                # 16 module nghiệp vụ và kỹ thuật
│   │   ├── auth/               # Đăng ký, đăng nhập và JWT
│   │   ├── users/              # Hồ sơ cá nhân
│   │   ├── organizations/      # Tổ chức, thành viên và OrganizationAccessService
│   │   ├── events/             # Chiến dịch, VolunteerRole và DonationNeed
│   │   ├── volunteers/         # Ứng tuyển và điểm danh
│   │   ├── donations/          # Quyên góp và Tracking ID
│   │   ├── inventory/          # Kho theo Event, loại hàng và đơn vị
│   │   ├── batches/            # Kiện hàng và liên kết Donation
│   │   ├── trips/              # Chuyến xe, TripVolunteer và TripBatch
│   │   ├── distribution/       # Điểm phân phối và bản ghi cấp phát
│   │   ├── evidence/           # Metadata ảnh, xác nhận riêng tư và duyệt bằng chứng
│   │   ├── storage/            # Interface lưu trữ tệp; adapter còn chờ triển khai
│   │   ├── transparency/       # Tra cứu công khai và timeline
│   │   ├── dashboard/          # Truy vấn tổng hợp; không có Report entity
│   │   ├── admin/              # Quản trị tài khoản và duyệt tổ chức
│   │   └── health/             # Liveness endpoint
│   ├── app.module.ts           # Root module; storage được import qua evidence
│   ├── bootstrap.ts            # HTTP setup dùng chung với smoke test
│   └── main.ts                 # Entry point
├── test/
│   ├── scaffold.e2e-spec.ts    # HTTP smoke test với Prisma mock
│   └── *.e2e-spec.ts           # Kịch bản tích hợp nghiệp vụ đang để TODO
├── .env.example               # Mẫu cấu hình môi trường
├── compose.yaml               # PostgreSQL và backend
├── Dockerfile                 # Build nhiều giai đoạn, Node.js 22
├── prisma.config.ts           # Đường dẫn schema, migrations và lệnh seed
├── vitest.config.ts           # Unit test: src/**/*.spec.ts
├── vitest.config.e2e.ts        # E2E: test/**/*.e2e-spec.ts
├── package.json
└── CONTRIBUTING.md             # Quy trình Git/GitHub của nhóm
```

## Khởi chạy cục bộ

### 1. Chuẩn bị môi trường

- Node.js >= 22 và npm.
- Docker với Docker Compose để chạy PostgreSQL, hoặc PostgreSQL 16 được cài riêng.
- Git để lấy mã nguồn.

Chạy các lệnh dưới đây tại thư mục gốc của repository.

### 2. Tạo cấu hình môi trường

PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Nếu đã có `.env`, cập nhật các giá trị cần thiết trong tệp đó. Mẫu cấu hình mặc định:

| Biến                | Giá trị trong `.env.example`                                                        | Ý nghĩa                                                        |
| ------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `PORT`              | `3001`                                                                              | Cổng HTTP khi chạy backend cục bộ; cổng host khi chạy Compose. |
| `NODE_ENV`          | `development`                                                                       | Chấp nhận `development`, `production` hoặc `test`.             |
| `DATABASE_URL`      | `postgresql://openaid:openaid_dev_password@localhost:5433/openaid_db?schema=public` | Kết nối PostgreSQL khi chạy backend cục bộ; bắt buộc có.       |
| `JWT_SECRET`        | `replace-with-a-random-development-secret`                                          | Khóa ký JWT; bắt buộc có và cần thay bằng giá trị riêng.       |
| `JWT_EXPIRES_IN`    | `7d`                                                                                | Thời hạn access token.                                         |
| `FRONTEND_URL`      | `http://localhost:3000`                                                             | Origin được phép gọi API qua CORS, có bật credentials.         |
| `POSTGRES_USER`     | `openaid`                                                                           | Tài khoản PostgreSQL dùng bởi Compose.                         |
| `POSTGRES_PASSWORD` | `openaid_dev_password`                                                              | Mật khẩu PostgreSQL dùng bởi Compose.                          |
| `POSTGRES_DB`       | `openaid_db`                                                                        | Tên database dùng bởi Compose.                                 |
| `DB_PORT`           | `5433`                                                                              | Cổng PostgreSQL trên máy host; cổng trong container là `5432`. |

Khi đổi thông tin PostgreSQL hoặc `DB_PORT`, cập nhật `DATABASE_URL` tương ứng cho backend chạy cục bộ. Không commit `.env` chứa secret.

### 3. Cài dependencies và khởi động PostgreSQL

```bash
npm ci
docker compose up -d db
```

Nếu dùng PostgreSQL cài riêng, tạo database và cấu hình `DATABASE_URL` thay cho bước Compose. Chờ database sẵn sàng trước khi chạy migration.

### 4. Sinh Prisma Client và áp dụng migration

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate:deploy
```

Hướng dẫn này dành cho database phát triển mới. Nếu database đang dùng schema cũ, cần lập kế hoạch chuyển dữ liệu trước khi áp dụng migration hiện tại.

`prisma:migrate:deploy` áp dụng các migration đã có trong `prisma/migrations/`. Khi phát triển thay đổi schema và cần tạo migration mới, dùng `npm run prisma:migrate -- --name ten_thay_doi`.

### 5. Nạp dữ liệu mẫu và chạy backend

```bash
npm run prisma:seed
npm run start:dev
```

Seed là bước tùy chọn để có dữ liệu phát triển. Prisma kết nối PostgreSQL khi ứng dụng khởi động, nên database phải đang hoạt động.

| Thành phần   | Đường dẫn mặc định                      |
| ------------ | --------------------------------------- |
| API base URL | `http://localhost:3001/api`             |
| Swagger UI   | `http://localhost:3001/api/docs`        |
| OpenAPI JSON | `http://localhost:3001/api/docs-json`   |
| Liveness     | `http://localhost:3001/api/health/live` |

Để chạy bản build:

```bash
npm run build
npm run start:prod
```

`npm run build` tự chạy `prisma generate` qua hook `prebuild`. Prisma Client nằm trong `node_modules` và được import từ `@prisma/client`. Build không tự migrate hoặc seed database.

## Dữ liệu seed

Lệnh `npm run prisma:seed` được cấu hình trong `prisma.config.ts` để chạy `node prisma/seed.mjs`. Script dùng `upsert`, có thể chạy lại và không đặt lại mật khẩu của tài khoản đã tồn tại.

| Email                    | Quyền hệ thống | Quyền tổ chức                          |
| ------------------------ | -------------- | -------------------------------------- |
| `admin@example.test`     | `ADMIN`        | Không được gán membership trong seed   |
| `organizer@example.test` | `USER`         | `ORGANIZER` của tổ chức `OPENAID-DEMO` |

Mật khẩu khi tạo mới hai tài khoản demo: `OpenAidDemo123!`. Các tài khoản này dành cho môi trường phát triển.

Seed còn tạo tổ chức mẫu đã được duyệt, danh mục gạo/nước uống, đơn vị kg/chai, một Event ở trạng thái `DRAFT`, vị trí tình nguyện và nhu cầu quyên góp. Đây là dữ liệu nền tảng; chưa có dữ liệu demo cho toàn bộ luồng quyên góp và phân phối.

## Sử dụng API

Các route có logic hiện tại:

| Method  | Endpoint             | Xác thực   | Chức năng                                       |
| ------- | -------------------- | ---------- | ----------------------------------------------- |
| `POST`  | `/api/auth/register` | Công khai  | Đăng ký tài khoản                               |
| `POST`  | `/api/auth/login`    | Công khai  | Đăng nhập và nhận access token                  |
| `GET`   | `/api/users/profile` | Bearer JWT | Xem hồ sơ cá nhân                               |
| `PATCH` | `/api/users/profile` | Bearer JWT | Cập nhật `fullName`, `phoneNumber`, `avatarUrl` |
| `GET`   | `/api/health/live`   | Công khai  | Kiểm tra liveness của ứng dụng                  |

Response đăng ký/đăng nhập chứa token tại `data.accessToken`. Gửi token bằng header `Authorization: Bearer <accessToken>` hoặc nhập vào nút **Authorize** trên Swagger.

Ứng dụng dùng chung response envelope. Ví dụ `GET /api/health/live`:

```json
{
  "success": true,
  "statusCode": 200,
  "data": { "status": "ok" },
  "timestamp": "2026-10-28T00:00:00.000Z"
}
```

Response lỗi gồm `success: false`, `statusCode`, `timestamp`, `path` và `message`. Liveness chỉ trả trạng thái ứng dụng, không thực hiện truy vấn kiểm tra database.

Các route nghiệp vụ khác hiện được công bố trong Swagger nhưng vẫn là khung chờ triển khai. Xem [API Contract](docs/API_contract/API_CONTRACT_OpenAid.md) để đối chiếu phạm vi tích hợp và [mã nguồn controller](src/modules/) để kiểm tra route hiện có.

## Chạy bằng Docker Compose

Tạo `.env` và đặt `JWT_SECRET` như hướng dẫn trên, sau đó chạy:

```bash
docker compose up -d db
docker compose build backend
docker compose run --rm backend npm run prisma:migrate:deploy
docker compose run --rm backend npm run prisma:seed
docker compose up -d backend
```

Bước seed có thể bỏ qua nếu không cần dữ liệu mẫu. Compose gồm hai service `db` và `backend`; backend chờ database healthy trước khi khởi động. Migration và seed là các lệnh chạy riêng.

Trong Compose, backend chạy ở cổng `3001` trong container và kết nối PostgreSQL bằng `db:5432`; `DATABASE_URL` được Compose tạo từ các biến `POSTGRES_*`. Cổng host mặc định là `3001` cho API và `5433` cho PostgreSQL. Volume `postgres_data` giữ dữ liệu database qua các lần khởi động lại container.

## Kiểm tra và scripts thường dùng

| Lệnh                      | Mục đích                                                     |
| ------------------------- | ------------------------------------------------------------ |
| `npm run start:dev`       | Chạy backend với watch mode                                  |
| `npm run start:debug`     | Chạy backend với debugger và watch mode                      |
| `npm run build`           | Sinh Prisma Client và biên dịch NestJS vào `dist/`           |
| `npm run start:prod`      | Chạy `dist/main.js` sau khi build                            |
| `npm run prisma:validate` | Kiểm tra Prisma schema                                       |
| `npm run lint`            | Chạy Oxlint cho `src/` và `test/`                            |
| `npm run format`          | Ghi lại định dạng các tệp TypeScript trong `src/` và `test/` |
| `npm test`                | Chạy unit test bằng Vitest                                   |
| `npm run test:watch`      | Chạy unit test ở watch mode                                  |
| `npm run test:cov`        | Chạy unit test và xuất coverage                              |
| `npm run test:e2e`        | Tự build qua hook `pretest:e2e`, sau đó chạy bộ E2E          |

CI tại `.github/workflows/ci.yml` dùng Node.js 22 và chạy `npm ci`, validate schema, build, lint, unit test và E2E khi push hoặc mở Pull Request.

Smoke test trong `test/scaffold.e2e-spec.ts` dùng chung cấu hình HTTP với ứng dụng và thay `PrismaService` bằng mock, không cần PostgreSQL thật. Các test nghiệp vụ còn là TODO; CI hiện chưa kiểm chứng migration, seed hay workflow trên database thật.

## Phân quyền và nguyên tắc phát triển

- `User.systemRole`: `USER` hoặc `ADMIN`. JWT strategy đọc lại tài khoản và quyền từ database; tài khoản không tồn tại hoặc bị khóa bị từ chối.
- `OrganizationMember.role`: `MEMBER` hoặc `ORGANIZER`, giới hạn theo từng tổ chức. `OrganizationAccessService` đã có hàm kiểm tra Organizer và trạng thái tổ chức để dùng khi triển khai nghiệp vụ.
- `TripVolunteer.role`: `LEADER` hoặc `MEMBER` trong một chuyến đi. Volunteer và Donor được xác định qua dữ liệu tham gia, không phải system role.
- Route mặc định yêu cầu JWT; route công khai dùng `@Public()`. `@Roles()` chỉ kiểm tra system role. Quyền theo tổ chức và chuyến đi phải được kiểm tra trong use case tương ứng.
- Khi bổ sung nghiệp vụ, controller nhận DTO, service điều phối phân quyền/trạng thái/transaction, repository đóng gói truy vấn. Lấy phạm vi tổ chức từ entity được thao tác trước khi kiểm tra quyền.
- Số lượng hiện vật dùng `Decimal(14, 3)`. Migration SQL chứa các CHECK và partial unique index ngoài Prisma schema; cần giữ các ràng buộc này khi thay đổi database.

Chi tiết ranh giới module, quy tắc dữ liệu và phần còn chờ triển khai nằm trong [tài liệu kiến trúc](docs/architecture.md).

## Tài liệu dự án

| Tài liệu                                                  | Nội dung                                                                                            |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [CONTRIBUTING.md](CONTRIBUTING.md)                        | Quy định Git/GitHub, nhánh, commit, review và Pull Request của nhóm                                 |
| [Product Backlog](docs/PRODUCT_BACKLOG.md)                | User stories, độ ưu tiên, tiêu chí chấp nhận và kế hoạch sprint                                     |
| [SRS OpenAid](docs/SRS_OpenAid.md)                        | Yêu cầu chức năng, phi chức năng và phạm vi MVP                                                     |
| [API Contract](docs/API_contract/API_CONTRACT_OpenAid.md) | Hợp đồng tích hợp Frontend/Backend và trạng thái endpoint                                           |
| [Kiến trúc hệ thống](docs/architecture.md)                | Modular Monolith, ranh giới module, phân quyền và toàn vẹn dữ liệu                                  |
| [Bộ sơ đồ hệ thống](docs/diagrams/README.md)              | System context, use case, kiến trúc, ERD, luồng nghiệp vụ, sequence, deployment và đối chiếu FR/API |
| [Đề cương đồ án](docs/C1SE.102_ProjectProposal.docx)      | Đề xuất đồ án Capstone 1                                                                            |
