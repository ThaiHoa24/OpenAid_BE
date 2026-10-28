# OpenAid Backend

Backend scaffold cho đề tài **OpenAid Transparent In-Kind Donation and Volunteer Coordination System**.

Dự án hiện ở giai đoạn xây dựng nền tảng. Schema, module và DTO được tổ chức theo proposal; các use case nghiệp vụ đang trả `501 Not Implemented`. Auth/profile hiện có được giữ lại và đồng bộ sang `systemRole`. Chưa có luồng nghiệp vụ end-to-end.

Quy định sử dụng Git/GitHub của nhóm: [CONTRIBUTING.md](CONTRIBUTING.md). Đọc trước khi tạo nhánh, commit, push hoặc mở Pull Request.

## Công nghệ

NestJS, TypeScript ESM, Prisma, PostgreSQL, JWT, Swagger, Vitest, Oxlint và Docker Compose. Dùng Node.js 22 trở lên.

## Cấu trúc

```text
CONTRIBUTING.md                # Quy định Git/GitHub và quy trình đóng góp của nhóm
prisma/
  schema.prisma                 # Entity, enum, relation và index
  migrations/                   # Initial migration và ràng buộc PostgreSQL
  seed.mjs                      # Seed nền tảng bằng native ESM
src/
  common/
    decorators/                 # CurrentUser, Public, Roles (system role)
    dto/                        # Pagination dùng chung
    enums/                      # Re-export enum từ Prisma
    filters/
    guards/                     # Global JWT guard và system-role guard
    interceptors/
    pipes/
    types/                      # AuthenticatedUser
    utils/
  config/
  database/                     # PrismaService import từ @prisma/client
  modules/
    auth/
    users/
    organizations/              # Membership và OrganizationAccessService
    events/                     # VolunteerRole và DonationNeed thuộc Event
    volunteers/                 # Application và Attendance
    donations/
    inventory/                  # Kho theo Event, loại hàng và đơn vị
    batches/
    trips/                      # TripVolunteer và TripBatch
    distribution/               # DistributionPoint và DistributionRecord
    evidence/                   # Metadata, privacy confirmation và Organizer review
    transparency/               # Public tracking, timeline và transaction audit log
    dashboard/                  # Query/report, không có Report entity
    storage/                    # Interface cho local/object storage; adapter còn chờ
    health/
  app.module.ts
  bootstrap.ts                  # HTTP setup dùng chung với smoke test
  main.ts
test/
  scaffold.e2e-spec.ts           # Kiểm tra HTTP/guard/validation, mock database
  *.e2e-spec.ts                 # Kịch bản tích hợp để TODO theo từng use case
docs/
  architecture.md               # Ranh giới module, quy tắc dữ liệu và kế hoạch triển khai
```

Chi tiết quyết định thiết kế và phần còn chờ triển khai: [docs/architecture.md](docs/architecture.md).

Bộ thông tin để thiết kế 8 nhóm sơ đồ kiến trúc, gồm ERD đầy đủ, use case, sequence, deployment và đối chiếu FR/API: [docs/diagrams/README.md](docs/diagrams/README.md).

## Khởi chạy cục bộ

```powershell
npm ci
Copy-Item .env.example .env
# Sửa DATABASE_URL và JWT_SECRET trong .env trước khi kết nối database.
npm run prisma:validate
npm run build
# Khi đã có một database phát triển mới, áp dụng migration và seed:
npm run prisma:migrate:deploy
npm run prisma:seed
npm run start:dev
```

Nếu đã có database theo schema cũ, cần lên kế hoạch chuyển dữ liệu trước khi áp dụng schema mới. Các lệnh kiểm tra/build không migrate hoặc seed database.

API: `http://localhost:3001/api`  
Swagger: `http://localhost:3001/api/docs`  
Liveness: `GET /api/health/live`

`npm run build` tự sinh Prisma Client vào `node_modules`; bản build dùng `@prisma/client` trực tiếp. Không cần copy client vào `dist/generated`.

## Docker Compose

Compose trong repository này gồm backend và PostgreSQL. Frontend Next.js thuộc phần tích hợp ở repository frontend.

```powershell
docker compose up -d db
docker compose build backend
docker compose run --rm backend npm run prisma:migrate:deploy
docker compose run --rm backend npm run prisma:seed
docker compose up -d backend
```

PostgreSQL được expose ở `localhost:5433` theo mặc định; có thể đặt `DB_PORT` để đổi cổng. Backend trong Compose kết nối bằng hostname `db`.

## Kiểm tra

```powershell
npm run prisma:validate
npm run build
npm run lint
npm test
npm run test:e2e
```

Smoke test chạy cùng HTTP setup với ứng dụng và thay Prisma bằng mock, không đọc/ghi database thật. Các test TODO ghi lại những kịch bản cần bổ sung khi triển khai nghiệp vụ; chúng không chứng minh tính đúng đắn của workflow.

## Phạm vi tiếp theo

Triển khai lần lượt Organization/Event, Volunteer, Donation receipt, Inventory/Batch, Trip/Distribution, Evidence/Tracking và Dashboard. Chỉ thay placeholder khi use case đã có phân quyền theo tổ chức, kiểm tra trạng thái, transaction và audit log tương ứng.
