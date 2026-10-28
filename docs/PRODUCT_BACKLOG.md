# OpenAid – Product Backlog

> **Dự án:** OpenAid – Transparent In-Kind Donation & Volunteer Coordination System  
> **Đề tài:** Đồ án Tốt nghiệp Capstone 1 (CMU-SE 450) – Viện Đào tạo Quốc tế, Đại học Duy Tân  
> **Nhóm thực hiện (C1SE.102):**  
> - Phan Vĩnh Thái Hòa (Leader / Scrum Master)  
> - Trần Lê Hoàng (Team Member)  
> - Tạ Quang Tịnh (Team Member)  
> - Đặng Phước Tường (Team Member)  
> **Giảng viên hướng dẫn:** ThS. Võ Đình Hiệu  
> **Kiến trúc:** Modular Monolith (NestJS + Prisma ORM + PostgreSQL 16) | Frontend: Next.js  
> **Cập nhật ngày:** 28/10/2026

---

## 1. Tổng quan & Mục đích tài liệu

Tài liệu **Product Backlog** này là nguồn thông tin duy nhất (Single Source of Truth) định hình toàn bộ phạm vi sản phẩm của hệ thống OpenAid trong khuôn khổ MVP Capstone 1. Tài liệu được xây dựng dựa trên:
1. Bản đề cương đồ án [C1SE.102_ProjectProposal.docx](C1SE.102_ProjectProposal.docx) (Version 1.0).
2. Hợp đồng API [docs/API_contract/API_CONTRACT_OpenAid.md](API_contract/API_CONTRACT_OpenAid.md).
3. Kiến trúc hệ thống và 16 Module backend tại [docs/architecture.md](architecture.md).
4. Bộ 45 Use Cases tại [docs/diagrams/02-use-cases.md](diagrams/02-use-cases.md) và Ma trận yêu cầu chức năng tại [docs/diagrams/09-api-traceability-and-decisions.md](diagrams/09-api-traceability-and-decisions.md).

---

## 2. Quy ước & Định lượng

* **Quy mô ước tính (Story Points - SP)**: Sử dụng dãy Fibonacci (`1, 2, 3, 5, 8, 13`).
* **Độ ưu tiên (MoSCoW)**:
  * `MUST`: Bắt buộc phải có trong MVP để nghiệm thu đồ án.
  * `SHOULD`: Rất quan trọng, hoàn thiện trải nghiệm vận hành thực tế.
  * `COULD`: Tùy chọn mở rộng nếu còn thời gian (Phase 2).
* **Trạng thái (Status)**:
  * `DONE`: Đã hoàn thiện mã nguồn và kiểm thử.
  * `SCAFFOLDED`: Đã có Controller, DTO, Route, HTTP 501 scaffold.
  * `IN PROGRESS`: Đang triển khai code nghiệp vụ.
  * `BACKLOG`: Đang chờ thực hiện theo Sprint.

---

## 3. Danh mục Epics (Cụm tính năng lớn)

Hệ thống được chia thành 4 Epics lớn tương ứng với các trụ cột nghiệp vụ:
* **EPIC 01: Nền tảng Hệ thống, Định danh & Quản trị (Platform, Auth & Admin)**
* **EPIC 02: Quản lý Chiến dịch & Tình nguyện viên (Volunteer Management)**
* **EPIC 03: Tiếp nhận Hiện vật & Quản lý Tồn kho (In-Kind Donation & Inventory)**
* **EPIC 04: Điều phối Vận chuyển, Cấp phát & Cổng Minh bạch (Distribution & Transparency)**

---

## 4. Chi tiết Product Backlog Items (PBI / User Stories)

### 🏛️ EPIC 01: Nền tảng Hệ thống, Định danh & Quản trị

| User Story ID | Tên Story & Mô tả (As a... I want to... So that...) | Tham chiếu | SP | Ưu tiên | Trạng thái |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **US-01** | **Đăng ký tài khoản**<br>Là một *Người dùng mới*, tôi muốn *đăng ký tài khoản bằng email và mật khẩu*, để *có thể tham gia quyên góp hoặc ứng tuyển TNV*. | FR01, UC01 | 3 | MUST | `DONE` |
| **US-02** | **Đăng nhập & Nhận JWT**<br>Là một *Người dùng*, tôi muốn *đăng nhập bằng email/password và nhận access token*, để *xác thực cho các tác vụ cần quyền*. | FR01, UC02 | 3 | MUST | `DONE` |
| **US-03** | **Quản lý Hồ sơ cá nhân**<br>Là một *Người dùng*, tôi muốn *xem và cập nhật thông tin cá nhân (họ tên, số điện thoại, avatar)*, để *thông tin liên hệ luôn chính xác*. | FR02, UC04 | 2 | MUST | `DONE` |
| **US-04** | **Đăng ký Tổ chức Cứu trợ**<br>Là một *Người dùng*, tôi muốn *đăng ký thành lập một tổ chức từ thiện (tên, mã code, giấy phép)*, để *được cấp quyền tổ chức các chiến dịch cứu trợ*. | FR04, UC05 | 5 | MUST | `SCAFFOLDED` |
| **US-05** | **Quản lý Thành viên Tổ chức**<br>Là một *Organizer*, tôi muốn *mời và phân công vai trò (MEMBER/ORGANIZER) cho các thành viên trong tổ chức*, để *cùng nhau vận hành chiến dịch*. | FR03, UC06 | 5 | MUST | `SCAFFOLDED` |
| **US-06** | **Kiểm duyệt Tổ chức & Tài khoản**<br>Là một *System Admin*, tôi muốn *phê duyệt (APPROVED) hoặc từ chối (REJECTED) tổ chức, khóa tài khoản vi phạm*, để *đảm bảo an toàn và uy tín cho nền tảng*. | FR24, UC07, UC39 | 5 | MUST | `SCAFFOLDED` |

#### Tiêu chí chấp nhận (Acceptance Criteria) cốt lõi của Epic 01:
* Mật khẩu phải được băm bảo mật bằng bcrypt (cost 10).
* Phân quyền 2 tầng: `User.systemRole` (`USER`/`ADMIN`) quản lý qua `@Roles()`, và `OrganizationMember.role` (`ORGANIZER`/`MEMBER`) quản lý qua `OrganizationAccessService`.
* Tổ chức mới tạo ở trạng thái `PENDING`, chỉ khi Admin duyệt `APPROVED` thì tổ chức mới được phép công bố (`PUBLISHED`) chiến dịch cứu trợ.

---

### 🤝 EPIC 02: Quản lý Chiến dịch & Tình nguyện viên

| User Story ID | Tên Story & Mô tả (As a... I want to... So that...) | Tham chiếu | SP | Ưu tiên | Trạng thái |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **US-07** | **Khởi tạo Chiến dịch Cứu trợ (Event)**<br>Là một *Organizer*, tôi muốn *tạo chiến dịch ở trạng thái DRAFT, thiết lập thời gian, địa bàn cứu trợ và thông tin liên hệ*, để *chuẩn bị kêu gọi hỗ trợ*. | FR05, UC08 | 5 | MUST | `SCAFFOLDED` |
| **US-08** | **Cấu hình Vị trí Tuyển TNV & Nhu cầu Hiện vật**<br>Là một *Organizer*, tôi muốn *thêm các vai trò cần tuyển (VolunteerRole) và danh mục hàng hóa cần nhận (DonationNeed)*, để *công khai mục tiêu rõ ràng*. | FR06, UC09, UC10 | 5 | MUST | `SCAFFOLDED` |
| **US-09** | **Công bố Chiến dịch (Publish Event)**<br>Là một *Organizer*, tôi muốn *chuyển trạng thái chiến dịch sang PUBLISHED*, để *cộng đồng có thể tìm kiếm và tham gia*. | FR05, UC11 | 3 | MUST | `SCAFFOLDED` |
| **US-10** | **Khám phá & Tìm kiếm Chiến dịch**<br>Là một *Khách vãng lai*, tôi muốn *xem danh sách, tìm kiếm và lọc chiến dịch theo địa bàn, trạng thái*, để *chọn chiến dịch phù hợp để đóng góp*. | FR07, UC12 | 3 | MUST | `SCAFFOLDED` |
| **US-11** | **Ứng tuyển Tình nguyện viên**<br>Là một *Tình nguyện viên*, tôi muốn *chọn một vai trò trong chiến dịch và nộp đơn ứng tuyển*, để *tham gia công tác cứu trợ*. | FR08, UC13 | 3 | MUST | `SCAFFOLDED` |
| **US-12** | **Xét duyệt Đơn Tình nguyện viên**<br>Là một *Organizer*, tôi muốn *duyệt (APPROVED) hoặc từ chối (REJECTED) đơn ứng tuyển TNV*, để *tuyển chọn đúng nhân lực cần thiết*. | FR09, UC14 | 3 | MUST | `SCAFFOLDED` |
| **US-13** | **Theo dõi Hoạt động Cá nhân (My Activities)**<br>Là một *Tình nguyện viên*, tôi muốn *xem danh sách các chiến dịch mình đã nộp đơn và trạng thái duyệt*, để *chủ động sắp xếp thời gian*. | FR10, UC15 | 2 | SHOULD | `SCAFFOLDED` |
| **US-14** | **Điểm danh Ca trực (Attendance)**<br>Là một *Organizer / Leader*, tôi muốn *ghi nhận check-in và check-out ca trực cho TNV*, để *xác nhận sự tham gia thực tế tại hiện trường*. | FR11, UC16 | 5 | MUST | `SCAFFOLDED` |

#### Tiêu chí chấp nhận (Acceptance Criteria) cốt lõi của Epic 02:
* Một người dùng chỉ có tối đa một đơn đăng ký (`VolunteerApplication`) trong một chiến dịch (`Event`).
* Việc điểm danh (`VolunteerAttendance`) được quản lý độc lập với trạng thái duyệt đơn (`status` của Application vẫn giữ `APPROVED`).
* Chỉ tổ chức đã được Admin duyệt `APPROVED` mới có quyền chuyển Event từ `DRAFT` sang `PUBLISHED`.

---

### 📦 EPIC 03: Tiếp nhận Hiện vật & Quản lý Tồn kho

| User Story ID | Tên Story & Mô tả (As a... I want to... So that...) | Tham chiếu | SP | Ưu tiên | Trạng thái |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **US-15** | **Đăng ký Quyên góp Hiện vật**<br>Là một *Nhà hảo tâm (Donor)*, tôi muốn *chọn loại hàng, số lượng và cam kết quyên góp vào chiến dịch*, để *nhận ngay một mã Tracking ID duy nhất*. | FR12, UC17 | 5 | MUST | `SCAFFOLDED` |
| **US-16** | **Quản lý Đóng góp Cá nhân (My Donations)**<br>Là một *Donor*, tôi muốn *xem lại danh sách các khoản hiện vật mình đã đăng ký và theo dõi tiến trình xử lý*, để *biết hàng đã được tiếp nhận hay chưa*. | FR13, UC18 | 3 | SHOULD | `SCAFFOLDED` |
| **US-17** | **Tiếp nhận & Kiểm định Hiện vật vào Kho**<br>Là một *Organizer*, tôi muốn *xác nhận hàng đã nhận (RECEIVED) hoặc từ chối nếu hỏng (REJECTED)*, để *cập nhật số lượng tồn kho khả dụng*. | FR14, UC19, UC20 | 5 | MUST | `SCAFFOLDED` |
| **US-18** | **Theo dõi Tồn kho Chiến dịch (Inventory)**<br>Là một *Organizer*, tôi muốn *xem bảng cân đối tồn kho (Available, Reserved, Distributed, Lost) theo từng loại hàng và đơn vị*, để *nắm rõ nguồn lực*. | FR15, UC22 | 5 | MUST | `SCAFFOLDED` |
| **US-19** | **Đóng kiện Hàng hóa (Donation Batch)**<br>Là một *Organizer*, tôi muốn *gom các khoản quyên góp đã nhận cùng loại hàng/đơn vị thành một Lô hàng (Batch)*, để *chuẩn bị xuất kho vận chuyển*. | FR16, UC23 | 5 | MUST | `SCAFFOLDED` |
| **US-20** | **Chuyển Trạng thái Lô hàng (Batch READY)**<br>Là một *Organizer*, tôi muốn *kiểm tra và chuyển trạng thái Lô hàng sang READY*, để *sẵn sàng gán vào chuyến xe cứu trợ*. | FR16, UC24 | 3 | MUST | `SCAFFOLDED` |

#### Tiêu chí chấp nhận (Acceptance Criteria) cốt lõi của Epic 03:
* **Nguyên tắc Gom lô Nguyên vẹn (Whole-Donation)**: Một khoản quyên góp (`Donation`) chỉ thuộc tối đa một `Batch` qua khóa ngoại `Donation.batchId` (không chia tách nhỏ một khoản quyên góp).
* **Độ chính xác số lượng**: Sử dụng kiểu dữ liệu `Decimal(14, 3)` cho toàn bộ các phép tính tồn kho (hỗ trợ số thập phân như kg, gói...).
* CSDL có ràng buộc `CHECK` đảm bảo phương trình tồn kho: `Available >= 0`, `Reserved >= 0`, `Distributed >= 0`.

---

### 🚚 EPIC 04: Điều phối Vận chuyển, Cấp phát & Cổng Minh bạch

| User Story ID | Tên Story & Mô tả (As a... I want to... So that...) | Tham chiếu | SP | Ưu tiên | Trạng thái |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **US-21** | **Lập Chuyến xe Cứu trợ (Distribution Trip)**<br>Là một *Organizer*, tôi muốn *tạo chuyến xe, thiết lập lịch trình và thứ tự các điểm phân phối (DistributionPoint)*, để *lên kế hoạch phát quà*. | FR17, UC26, UC27 | 5 | MUST | `SCAFFOLDED` |
| **US-22** | **Phân công Nhân sự & Gán Lô hàng vào Chuyến**<br>Là một *Organizer*, tôi muốn *gán các Lô hàng (TripBatch) và phân công TNV tham gia với đúng 1 Leader (TripVolunteer)*, để *chuyến xe có người chịu trách nhiệm*. | FR17, UC28, UC29 | 5 | MUST | `SCAFFOLDED` |
| **US-23** | **Cập nhật Vòng đời Chuyến xe & Điểm phát**<br>Là một *Trip Leader / Organizer*, tôi muốn *cập nhật trạng thái chuyến xe (Scheduled $\rightarrow$ Preparing $\rightarrow$ In Transit $\rightarrow$ Completed)*, để *ghi nhận lộ trình thực tế*. | FR18, UC30, UC31 | 5 | MUST | `SCAFFOLDED` |
| **US-24** | **Ghi nhận Số lượng Cấp phát Thực tế**<br>Là một *Trip Leader*, tôi muốn *ghi nhận số lượng thực tế trao cho bà con tại từng điểm dừng (DistributionRecord)*, để *đối soát số liệu chính xác*. | FR19, UC33 | 5 | MUST | `SCAFFOLDED` |
| **US-25** | **Tải lên Bằng chứng & Xác nhận Riêng tư**<br>Là một *TNV / Leader*, tôi muốn *chụp và upload ảnh trao quà kèm xác nhận tuân thủ riêng tư của người nhận*, để *lưu bằng chứng nghiệm thu*. | FR25, UC34, UC35 | 5 | MUST | `SCAFFOLDED` |
| **US-26** | **Kiểm duyệt Bằng chứng Công khai**<br>Là một *Organizer*, tôi muốn *xem xét và duyệt (APPROVED) ảnh bằng chứng*, để *chỉ cho phép hiển thị ảnh hợp lệ lên cổng cộng đồng*. | FR25, UC45 | 3 | MUST | `SCAFFOLDED` |
| **US-27** | **Tra cứu Minh bạch Công khai (Public Tracking)**<br>Là một *Người dân / Nhà hảo tâm*, tôi muốn *nhập Tracking ID để xem toàn bộ timeline hành trình hàng cứu trợ mà không cần đăng nhập*, để *yên tâm về sự minh bạch*. | FR21, FR22, UC36, UC37 | 5 | MUST | `SCAFFOLDED` |
| **US-28** | **Báo cáo Thống kê Chiến dịch (Dashboard)**<br>Là một *Organizer / Admin*, tôi muốn *xem biểu đồ tổng hợp số lượng tiếp nhận, tồn kho và tỷ lệ hàng đã phân phối*, để *đánh giá hiệu quả chiến dịch*. | FR23, UC38 | 5 | SHOULD | `SCAFFOLDED` |

#### Tiêu chí chấp nhận (Acceptance Criteria) cốt lõi của Epic 04:
* Mỗi chuyến xe chỉ có **tối đa 1 Leader** duy nhất (kiểm soát qua partial unique index trong database).
* Một Lô hàng (`Batch`) chỉ được gán cho tối đa 1 chuyến xe đang hoạt động (`TripBatch.unassignedAt` là NULL).
* Cổng tra cứu công khai [GET /api/transparency/track/:trackingId](API_contract/API_CONTRACT_OpenAid.md) **không để lộ bất kỳ thông tin cá nhân (PII)** của người nhận và chỉ hiển thị hình ảnh đã được Organizer duyệt `APPROVED`.

---

## 5. Kế hoạch Phân bổ Sprint (12-Week Sprint Roadmap)

Mỗi Sprint kéo dài 2 tuần, tập trung hoàn thiện và tích hợp end-to-end từng miền:

```text
+---------------------------------------------------------------------------------------------------+
|  Sprint 1 (Tuần 1-2): Foundation, Auth, Profile & System Admin                                   |
|  -> US-01, US-02, US-03, US-06 | Kết quả: Đăng ký, đăng nhập, JWT Guard, Profile, Quản trị     |
+---------------------------------------------------------------------------------------------------+
|  Sprint 2 (Tuần 3-4): Organization Management & Event Lifecycle                                   |
|  -> US-04, US-05, US-07, US-08, US-09, US-10 | Kết quả: CRUD Tổ chức, Tạo & Công bố Chiến dịch   |
+---------------------------------------------------------------------------------------------------+
|  Sprint 3 (Tuần 5-6): Volunteer Recruitment & Attendance                                          |
|  -> US-11, US-12, US-13, US-14 | Kết quả: Ứng tuyển TNV, Duyệt hồ sơ, Điểm danh ca trực          |
+---------------------------------------------------------------------------------------------------+
|  Sprint 4 (Tuần 7-8): In-Kind Donations, Inventory & Donation Batches                             |
|  -> US-15, US-16, US-17, US-18, US-19, US-20 | Kết quả: Đăng ký hiện vật, Mã Tracking, Nhập kho  |
+---------------------------------------------------------------------------------------------------+
|  Sprint 5 (Tuần 9-10): Distribution Trips & On-site Distribution Records                          |
|  -> US-21, US-22, US-23, US-24 | Kết quả: Tạo chuyến xe, Gán lô & TNV, Ghi nhận cấp phát quà      |
+---------------------------------------------------------------------------------------------------+
|  Sprint 6 (Tuần 11-12): Evidence Review, Public Transparency Timeline & Final Presentation        |
|  -> US-25, US-26, US-27, US-28 | Kết quả: Upload ảnh, Tra cứu Tracking công khai, Dashboard Demo  |
+---------------------------------------------------------------------------------------------------+
```

---

## 6. Tiêu chuẩn Hoàn thành (Definition of Done - DoD)

Một User Story được coi là **DONE** khi và chỉ khi đáp ứng tất cả các tiêu chí kỹ thuật sau:
1. **Code Quality**: Viết theo chuẩn TypeScript ESM, chạy `npm run lint` (`oxlint`) đạt 0 lỗi.
2. **Architecture Compliance**: Tuân thủ đúng kiến trúc 3 lớp: `Controller` (nhận DTO & validate) $\rightarrow$ `Service` (xử lý nghiệp vụ & phân quyền) $\rightarrow$ `Repository` (truy vấn Prisma).
3. **Security & Authorization**:
   - Các route công khai phải có `@Public()`.
   - Các thao tác theo tổ chức phải gọi `organizationAccessService.requireOrganizer(...)` dựa trên entity được query từ database, không tin tưởng `organizationId` từ body.
4. **Data Integrity**: Các thao tác thay đổi số lượng tồn kho và trạng thái phải nằm trong cùng một Database Transaction và ghi nhận vào `TransparencyLog`.
5. **Testing**: Kiểm thử đơn vị (Unit test) và kiểm thử tích hợp E2E (`npm run test:e2e`) vượt qua 100%.
6. **Documentation**: Cập nhật Swagger annotations (`@ApiProperty`, `@ApiOperation`) và phản ánh vào hợp đồng API.
