# Tài liệu thiết kế sơ đồ OpenAid

Bộ tài liệu này cung cấp đầu vào để vẽ đủ 8 nhóm sơ đồ trong yêu cầu: System Context, Use Case, High-level Architecture, Module/Component, Data Model/ERD, Business/Data Flow, Sequence và Deployment. Mốc đối chiếu: **28/10/2026**.

Đọc tài liệu này trước, sau đó mở từng phần dưới đây. Mỗi phần có danh sách thành phần, nhãn quan hệ, quy tắc và mã sơ đồ tham khảo có thể sao chép sang công cụ vẽ hỗ trợ Mermaid hoặc PlantUML. Có thể dựng lại bằng shape trong draw.io từ các bảng node/quan hệ; không cần nhập toàn bộ mã nếu công cụ không hỗ trợ.

## Các tài liệu

| Loại sơ đồ                        | Tài liệu                                                                     | Cách dùng                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1. System Context                 | [01-system-context.md](01-system-context.md)                                 | Actors, ranh giới, external systems, mũi tên dữ liệu                      |
| 2. Use Case                       | [02-use-cases.md](02-use-cases.md)                                           | Actor hierarchy, catalog use case, include, điều kiện và PlantUML         |
| 3. High-level System Architecture | [03-high-level-architecture.md](03-high-level-architecture.md)               | Các lớp/container, giao thức, trust boundary, hiện tại và đích MVP        |
| 4. Module/Component               | [04-modules-and-components.md](04-modules-and-components.md)                 | 16 module thực tế, dependency injection và phối hợp dự kiến               |
| 5. Data Model/ERD                 | [05-data-model-and-erd.md](05-data-model-and-erd.md)                         | Toàn bộ 20 entity, 12 enum, cột, PK/FK/UK, cardinality và SQL constraints |
| 6. Business/Data Flow             | [06-business-and-data-flows.md](06-business-and-data-flows.md)               | Activity, DFD, trạng thái, stock và kịch bản số liệu                      |
| 7. Sequence                       | [07-sequences.md](07-sequences.md)                                           | Luồng login có code và các interaction dự kiến cho nghiệp vụ MVP          |
| 8. Deployment                     | [08-deployment.md](08-deployment.md)                                         | Compose hiện có, cổng, volume, FE proxy, triển khai đích và CI            |
| Phụ lục đối chiếu                 | [09-api-traceability-and-decisions.md](09-api-traceability-and-decisions.md) | Toàn bộ route hiện tại, DTO, FR/NFR và các điểm cần chốt                  |

## Nguồn và mức độ chắc chắn

1. Proposal: `C1SE.102_ProjectProposal.docx`, Version 1.0, ngày tài liệu 29/09/2026; mục 6–10, 12–14. Dùng cho mục tiêu, actor, phạm vi và yêu cầu.
2. Backend: [schema](../../prisma/schema.prisma), [initial SQL](../../prisma/migrations/20261028000000_init/migration.sql), [AppModule](../../src/app.module.ts), [module source](../../src/modules), [HTTP setup](../../src/bootstrap.ts), [Compose](../../compose.yaml), [Dockerfile](../../Dockerfile), [CI](../../.github/workflows/ci.yml).
3. Frontend đã kiểm tra cấu trúc trong thư mục cùng cấp `../OpenAid`: `package.json`, `next.config.ts`, `src/app`, `src/view`, `src/services`, `src/hooks/useAuth.tsx`, `src/types/index.ts`. Thư mục này không nằm trong backend repository; đường dẫn ở đây nhằm nhận diện nguồn trong workspace.
4. [Tài liệu kiến trúc nền tảng](../architecture.md) và [quy định Git](../../CONTRIBUTING.md).

| Nhãn         | Ý nghĩa khi đặt vào sơ đồ                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------- |
| HIỆN CÓ      | Khai báo/cấu hình hoặc logic có thể xác định trong mã nguồn. Không đồng nghĩa đã deploy hoặc tích hợp end-to-end. |
| KHUNG        | Đã có module/controller/DTO/service nhưng nghiệp vụ trả HTTP 501.                                                 |
| THIẾT KẾ MVP | Hành vi cần xây dựng theo proposal; chưa mô tả là đã thực thi.                                                    |
| CẦN CHỐT Cxx | Chi tiết chưa đủ để coi là quyết định đã thống nhất; xem phụ lục 09.                                              |

Kiến trúc tổng thể đích là một frontend Next.js, một backend NestJS Modular Monolith, một PostgreSQL database và nơi lưu ảnh. Backend hiện có 16 module trong `src/modules`; StorageModule được nạp qua EvidenceModule. Database schema có 20 bảng nghiệp vụ, chưa có bảng Report/Notification/Payment.

Frontend hiện là prototype dùng `storageService` với seed và browser localStorage. File `next.config.ts` đã có rewrite `/api/:path* → BACKEND_API_URL/api/:path*`, nhưng các service đã kiểm tra vẫn dùng mock. Vì vậy không vẽ frontend đang đọc PostgreSQL qua backend như một kết nối nghiệp vụ đã hoàn tất.

## Quy ước trình bày chung

- Trên tiêu đề mỗi hình, ghi mức nhìn và trạng thái: ví dụ “OpenAid System Context — thiết kế MVP” hoặc “Backend module dependencies — cấu trúc hiện có”.
- Nét liền biểu diễn cấu trúc đã khai báo; nét đứt biểu diễn phần dự kiến. Thêm chữ KHUNG cho component chưa có logic, vì chỉ dùng màu dễ gây hiểu nhầm.
- System Context chỉ có OpenAid, actor và hệ thống ngoài. Container diagram mới tách Web/API/Database/Storage. Component diagram đi sâu vào backend.
- Mũi tên phải có động từ hoặc tên dữ liệu: gửi đăng ký, đọc timeline, ghi metadata, TCP PostgreSQL. Không dùng mũi tên trống để trộn dependency với data flow.
- Donor và Volunteer là vai trò tương tác; Organizer theo tổ chức; Leader theo Trip. Không biến tất cả thành role cố định của User.
- Batch-level traceability: donor theo dõi batch và các điểm mà batch đi qua; không khẳng định phần hàng của donor được trao vật lý cho một người/điểm cụ thể.
- JWT, bcrypt, Prisma và QR library là thư viện/cơ chế bên trong; không vẽ thành dịch vụ ngoài độc lập.
- Mentor, đội phát triển và người thụ hưởng không có tài khoản/chức năng vận hành riêng được xác định trong MVP. Không tự thêm họ thành actor sử dụng hệ thống.
- Các công nghệ ngoài MVP như GPS thời gian thực, payment, AI, blockchain, notification và eKYC không đặt vào đường chạy chính.

## Trình tự vẽ

Context → Use Case → High-level Architecture → Module/Component → ERD → Business/Data Flow → Sequence → Deployment. Dùng cùng tên actor/entity ở mọi hình. Khi một quyết định Cxx chưa chốt, giữ note trên hình thay vì tự thêm bảng, endpoint hoặc nhánh trạng thái.

## Bộ hình nên nộp

Một Context; một Use Case tổng quan và các hình chi tiết theo 3 miền; một kiến trúc container đích; một component tổng quan và một hình dependency hiện tại; một ERD tổng quan kèm ERD theo miền; các activity/DFD và state diagram; các sequence chính trong phần 07; một Deployment hiện tại và một đích MVP. Việc chia hình nhỏ giúp giữ đủ chữ và tránh đường nối chồng lên nhau.
