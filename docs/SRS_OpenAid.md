# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

## OpenAid – Transparent In-Kind Donation & Volunteer Coordination System

**Document Type:** Software Requirements Specification  
**Project:** OpenAid  
**Version:** 1.0 – MVP Baseline  
**Architecture:** Modular Monolith  
**Primary Stack:** Next.js + NestJS + Prisma + PostgreSQL + Docker  

---

# 1. Introduction

## 1.1 Purpose

Tài liệu này đặc tả các yêu cầu phần mềm cho **OpenAid Version 1.0 (MVP)** – một nền tảng web hỗ trợ tổ chức từ thiện quản lý chiến dịch, tuyển tình nguyện viên, tiếp nhận quyên góp hiện vật, quản lý kho và lô hàng, tổ chức chuyến phân phối, lưu bằng chứng và công khai hành trình đóng góp thông qua Tracking ID.

SRS là nguồn tham chiếu chính để:

- Frontend xác định màn hình, hành vi và dữ liệu cần hiển thị.
- Backend xác định module, API, validation và business rules.
- QA xây dựng test case và acceptance criteria.
- Nhóm dự án kiểm soát scope MVP và tránh thêm chức năng ngoài phạm vi.
- Giảng viên/mentor đánh giá tính nhất quán giữa Proposal, thiết kế và sản phẩm thực tế.

Các tài liệu kỹ thuật chi tiết hơn nên được sử dụng cùng SRS:

- `API_CONTRACT.md` – hợp đồng giao tiếp FE/BE.
- `RBAC.md` – mô hình phân quyền chi tiết.
- `schema.prisma` – mô hình dữ liệu vật lý hiện tại.
- `architecture.md` – kiến trúc và ranh giới module.

---

## 1.2 Product Scope

OpenAid là nền tảng trung gian số giữa:

- charitable organizations;
- users tham gia tình nguyện;
- users quyên góp hiện vật;
- Platform Admin;
- Public Visitors.

Trung tâm của hệ thống là **Event**.

Một Event có thể đồng thời:

- tuyển Volunteer theo các Volunteer Roles;
- công bố Donation Needs;
- tiếp nhận Donation;
- cập nhật Inventory;
- gom Donation thành Batch;
- đưa Batch vào Distribution Trip;
- phân phối tại Distribution Points;
- lưu Distribution Records và Evidence;
- công khai Timeline và Tracking information.

Chuỗi nghiệp vụ chính của MVP:

```text
Event
  ↓
Volunteer / Donation
  ↓
Inventory
  ↓
Donation Batch
  ↓
Distribution Trip
  ↓
Distribution Confirmation
  ↓
Evidence
  ↓
Transparency Timeline
  ↓
Dashboard / Report
```

Mục tiêu chính của MVP không phải số lượng chức năng lớn, mà là hoàn thành một **end-to-end workflow** có khả năng truy vết ở mức Batch.

---

## 1.3 Definitions and Terminology

| Thuật ngữ | Ý nghĩa |
|---|---|
| User | Tài khoản người dùng trong hệ thống. System role là `USER` hoặc `ADMIN`. |
| Organizer | User có `OrganizationMember.role = ORGANIZER` trong một Organization cụ thể. |
| Volunteer | Một User tham gia Event thông qua `VolunteerApplication`; không phải system role. |
| Donor | Một User tạo `Donation`; không phải system role. |
| Event | Chiến dịch/sự kiện cứu trợ do Organization tổ chức. |
| Donation Need | Nhu cầu hiện vật của Event theo ItemType, Unit và target quantity. |
| Donation | Cam kết/đăng ký quyên góp hiện vật của một User. |
| Tracking ID | Mã công khai duy nhất, ngẫu nhiên, không tuần tự dùng để theo dõi Donation. |
| Inventory | Tồn kho theo Event + ItemType + Unit. |
| Batch | Lô hàng gom các Donation tương thích của cùng Event/type/unit. |
| Trip | Chuyến vận chuyển/phân phối thuộc một Event. |
| Distribution Point | Điểm nhận/phân phối trong một Trip. |
| Distribution Record | Bản ghi số lượng từ một Batch được phát tại một Distribution Point. |
| Evidence | Ảnh/bằng chứng liên quan đến phân phối. |
| Transparency Log | Audit log lưu actor, thời gian và thay đổi trạng thái. |
| Public Tracking | Tra cứu công khai bằng Tracking ID, không cần đăng nhập. |
| Pledged | Tổng lượng đã đăng ký, loại trừ Donation bị rejected/cancelled. |
| Received | Lượng Donation đã được Organization xác nhận nhận. |

---

# 2. Overall Description

## 2.1 Product Perspective

OpenAid Version 1.0 là một Web Application sử dụng kiến trúc **Modular Monolith**.

Kiến trúc tổng quát:

```text
Browser
   ↓
Next.js Web Application
   ↓ REST API
NestJS Modular Monolith
   ↓ Prisma ORM
PostgreSQL

+ File Storage cho Evidence/Donation photos
```

Backend là một ứng dụng NestJS duy nhất nhưng được tách theo domain/module để dễ phát triển, kiểm thử và bảo trì.

Microservices, message queue và distributed architecture không thuộc MVP.

---

## 2.2 Main Backend Modules

OpenAid Backend hiện được tổ chức thành các module chính:

```text
admin
auth
batches
dashboard
distribution
donations
events
evidence
health
inventory
organizations
storage
transparency
trips
users
volunteers
```

Các module cùng chạy trong một NestJS application.

---

## 2.3 User Classes and Actors

### Public Visitor

Không cần tài khoản.

Nhu cầu chính:

- xem Event công khai;
- xem thông tin Organization công khai;
- nhập Tracking ID;
- theo dõi hành trình đóng góp công khai;
- xem Evidence đã được duyệt để public.

### USER

System role mặc định.

Một USER có thể đồng thời:

- tạo Donation;
- submit VolunteerApplication;
- tham gia Organization;
- được assign vào Trip nếu application phù hợp.

`Donor` và `Volunteer` không phải permanent roles.

### Organizer

Một USER có `OrganizationMember.role = ORGANIZER` trong một Organization.

Organizer quản lý nghiệp vụ của Organization đó, không có quyền toàn hệ thống.

### Trip Leader

Volunteer được gán vào một Trip với `TripVolunteer.role = LEADER`.

Quyền chỉ áp dụng trong Trip tương ứng.

### Platform Admin

User có `systemRole = ADMIN`.

Admin chịu trách nhiệm quản trị nền tảng, users, organizations, basic moderation và audit.

---

## 2.4 Operating Environment

Target MVP:

- Responsive Web Application.
- Desktop và mobile web widths.
- REST API.
- PostgreSQL database.
- Docker/Docker Compose deployment.
- Seed/synthetic data cho demo.

---

## 2.5 Technology Constraints

Stack chính được cố định:

| Layer | Technology |
|---|---|
| Frontend | Next.js / React |
| UI | TailwindCSS |
| Backend | Node.js + NestJS + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Authentication | JWT |
| API documentation | Swagger / OpenAPI |
| File upload | Local storage ở dev hoặc Object Storage khi deploy |
| Container | Docker / Docker Compose |
| CI/CD | GitHub Actions |

Không chuyển backend sang framework hoặc architecture khác trong phạm vi MVP.

---

# 3. Scope

## 3.1 In Scope

### Account, Organization & Admin

- Register.
- Login.
- Logout theo requirement; API/session implementation phải được thống nhất trong API Contract.
- Profile management.
- Create Organization.
- Admin review/enable/disable Organization.
- User administration cơ bản.
- Organization-scoped authorization.

### Event Management & Discovery

- Event CRUD theo lifecycle.
- Volunteer Roles.
- Donation Needs.
- Event list/detail.
- Search/filter theo area, time và support type theo contract cuối.

### Volunteer Participation

- Apply vào Volunteer Role.
- Organizer approve/reject.
- My Activities.
- Check-in/check-out bằng confirmation button; QR có thể được sử dụng nếu hoàn thành trong scope.

### Donation & Inventory

- View Donation Needs.
- Create in-kind Donation.
- Generate Tracking ID.
- My Donations.
- Confirm received/reject.
- Inventory quantities.

### Donation Batch

- Group compatible Donations.
- Reserve inventory.
- Batch lifecycle.
- Reconciliation returned/lost goods.

### Distribution Trip

- Create Trip cho một Event.
- Assign Batches.
- Assign approved Volunteers.
- Một Trip Leader.
- Ordered Distribution Points.
- Trip/Point status update.

### Distribution Confirmation & Evidence

- Record quantity per Batch per Point.
- Record beneficiary count/notes nếu có.
- Upload Evidence.
- Privacy confirmation.
- Organizer review Evidence.

### Transparency, Dashboard & Report

- Transparency Log.
- Timeline.
- Public Tracking.
- Event-level dashboard.
- Final transparency summary bằng query trên dữ liệu hiện có.

Không tạo Report entity riêng trong MVP.

---

## 3.2 Out of Scope

Các chức năng sau không thuộc OpenAid Version 1.0 MVP:

- Live GPS và ETA.
- Donor pickup workflow.
- Real-money donations hoặc Payment Gateway.
- Beneficiary verification 1-to-1.
- Full social network: like/comment/share/follow.
- Micro-volunteering.
- Group pooling.
- Rating, E-certificate, Gamification.
- AI recommendation.
- Fraud/anomaly detection bằng AI.
- Blockchain/Smart Contract.
- Route optimization/logistics integration.
- Advanced Organization Verification/eKYC.
- Native mobile application.

Phase 2 chỉ được xem xét sau khi end-to-end MVP hoạt động ổn định.

---

# 4. Role and Authorization Requirements

## 4.1 System Roles

```text
USER
ADMIN
```

## 4.2 Organization Roles

```text
MEMBER
ORGANIZER
```

## 4.3 Trip Roles

```text
MEMBER
LEADER
```

## 4.4 Role Principles

- `DONOR` không phải role.
- `VOLUNTEER` không phải role.
- Một USER có thể vừa donate vừa volunteer trong cùng một Event.
- Organizer permission chỉ áp dụng cho Organization tương ứng.
- Trip Leader permission chỉ áp dụng cho Trip tương ứng.
- Frontend route protection không thay thế backend authorization.
- Backend phải kiểm tra resource ownership và scope trước mutation.

Chi tiết permission matrix được quản lý trong `RBAC.md`.

---

# 5. Functional Requirements

## FR01 – User Authentication

**Priority:** High

Hệ thống phải cho phép user:

- đăng ký tài khoản;
- đăng nhập;
- đăng xuất theo session/authentication strategy đã chốt;
- sử dụng password được lưu dưới dạng hash.

Hệ thống không được lưu plain-text password.

---

## FR02 – Profile Management

**Priority:** Medium

Authenticated User phải có thể:

- xem profile của chính mình;
- cập nhật các trường profile được cho phép như full name, phone number và avatar URL khi supported.

User không được sửa system role của chính mình.

---

## FR03 – Role-Based Access Control

**Priority:** High

Hệ thống phải enforce:

```text
SystemRole: USER | ADMIN
OrganizationRole: MEMBER | ORGANIZER
TripVolunteerRole: MEMBER | LEADER
```

Organizer permissions phải được kiểm tra theo Organization.

Volunteer và Donor được xác định theo hành vi/data relationship, không phải permanent roles.

---

## FR04 – Organization Management

**Priority:** High

Authenticated User có thể tạo Organization profile.

Organization có lifecycle approval ở mức:

```text
PENDING
APPROVED
REJECTED
SUSPENDED
```

Platform Admin có thể review Organization.

Chỉ Organization đủ điều kiện hoạt động mới được dùng để publish Event.

---

## FR05 – Event Management

**Priority:** High

Organizer phải có thể:

- create Event;
- edit Event;
- publish Event;
- close Event;
- cancel Event;
- delete Draft Event theo rule.

Event lifecycle chính:

```text
DRAFT → PUBLISHED → CLOSED
                 ↘ CANCELLED
```

Business constraints:

- Chỉ approved Organization được publish.
- Draft Event có thể physically delete.
- Published Event đã có applications, donations hoặc trips không được physically delete.

---

## FR06 – Volunteer Roles & Donation Needs

**Priority:** High

Organizer có thể khai báo trong Event:

### Volunteer Role

- name;
- quantity;
- optional description.

### Donation Need

- ItemType;
- Unit;
- targetQuantity;
- optional notes.

ItemType và Unit phải dùng standard catalog thay vì free-text nếu backend contract yêu cầu ID.

---

## FR07 – Event Discovery

**Priority:** High

Public/User phải có thể:

- xem Event list;
- xem Event detail;
- search;
- filter theo area;
- filter theo time;
- filter theo support type theo API contract cuối.

Public discovery chỉ hiển thị Event phù hợp để công khai.

---

## FR08 – Volunteer Application

**Priority:** High

Authenticated USER có thể:

- chọn một Volunteer Role của Event;
- submit VolunteerApplication;
- thêm notes nếu supported.

VolunteerApplication phải tham chiếu đúng Event và VolunteerRole của Event đó.

Theo schema hiện tại, một User có tối đa một VolunteerApplication cho mỗi Event.

---

## FR09 – Application Review

**Priority:** High

Organizer của Organization sở hữu Event có thể:

- xem applications;
- approve;
- reject.

Status:

```text
PENDING
APPROVED
REJECTED
```

Hệ thống phải kiểm tra capacity/business policy trước khi approve nếu policy capacity được bật.

---

## FR10 – My Volunteer Activities

**Priority:** High

Authenticated USER phải xem được các VolunteerApplication của chính mình, bao gồm ít nhất:

- Event;
- Volunteer Role;
- application status;
- attendance status/timestamps khi có.

---

## FR11 – Check-in / Check-out

**Priority:** Medium

Hệ thống phải lưu attendance riêng cho VolunteerApplication.

Thông tin chính:

- checkedInAt;
- checkedOutAt.

MVP phải hỗ trợ ít nhất confirmation button.

QR check-in là lựa chọn triển khai nếu team đủ thời gian; GPS không bắt buộc.

---

## FR12 – Create Donation

**Priority:** High

Authenticated USER có thể chọn Donation Need và nhập quantity.

Hệ thống phải:

- tạo Donation cho current authenticated user;
- gắn Donation vào đúng Event/DonationNeed/ItemType/Unit;
- generate unique, non-sequential Tracking ID;
- cho phép pledge vượt targetQuantity;
- chỉ warning khi target bị vượt, không reject vì vượt target.

Donation Need là **target, không phải hard cap**.

Các metric phải được phân biệt:

```text
Needed
Pledged
Received
Distributed
```

Trong đó:

- Pledged = registered và không bị rejected/cancelled.
- Received = confirmed by Organization.

Photo của Donation chỉ được xem là supported khi upload contract được triển khai đầy đủ.

---

## FR13 – My Donations

**Priority:** High

Authenticated USER phải có thể xem Donation của chính mình, bao gồm:

- Tracking ID;
- Event;
- goods type/unit;
- quantity;
- status;
- tracking action.

User không được xem private Donation data của user khác.

---

## FR14 – Confirm Donation Received

**Priority:** High

Organizer của Event có thể:

- confirm Donation received;
- mark Donation rejected/not received.

Khi `RECEIVED`:

- Donation.receivedAt được ghi nhận;
- Inventory tương ứng được tăng Received và Available theo transaction nghiệp vụ.

Rejected Donation không làm tăng Inventory.

---

## FR15 – Inventory Management

**Priority:** High

Inventory được quản lý theo:

```text
Event + ItemType + Unit
```

Các quantity:

```text
receivedQuantity
availableQuantity
reservedQuantity
distributedQuantity
lostQuantity
```

Invariant bắt buộc:

```text
Received = Available + Reserved + Distributed + Lost/Written-off
```

Workflow quantity:

```text
Receipt confirmed
    ↓
Available
    ↓ create Batch
Reserved
    ↓ confirm distribution
Distributed
```

Nếu còn hàng hoặc hàng trả về:

```text
Reserved → Available
```

Nếu thất thoát:

```text
Reserved → Lost/Written-off
```

Việc assign Batch vào Trip không được reserve lần thứ hai.

---

## FR16 – Donation Batch

**Priority:** High

Organizer có thể tạo Batch từ các Donation phù hợp.

Mọi Donation trong một Batch phải có:

- cùng Event;
- cùng ItemType;
- cùng Unit;
- trạng thái hợp lệ để batch;
- chưa thuộc Batch khác.

Rule:

```text
Donation.eventId = Batch.eventId
```

Một Donation thuộc tối đa một Batch.

Không splitting Donation trong MVP.

Khi Batch được tạo, quantity tương ứng chuyển:

```text
Available → Reserved
```

Batch status:

```text
DRAFT
READY
ASSIGNED
DISTRIBUTED
```

---

## FR17 – Distribution Trip

**Priority:** High

Organizer có thể tạo Trip cho **một Event**.

Trip bao gồm:

- departure date/time;
- departure point;
- optional vehicle;
- Batch list;
- Volunteer assignments;
- ordered Distribution Points.

Constraints:

- mọi Batch phải thuộc cùng Event với Trip;
- volunteer được assign phải có VolunteerApplication `APPROVED` cho cùng Event;
- một volunteer được chọn làm `LEADER`;
- các volunteer khác là `MEMBER`.

---

## FR18 – Trip & Distribution Point Status

**Priority:** High

Trip status:

```text
SCHEDULED → PREPARING → IN_TRANSIT → COMPLETED
```

Hoặc:

```text
SCHEDULED / PREPARING / IN_TRANSIT → CANCELLED
```

Distribution Point status:

```text
PENDING → ARRIVED → DISTRIBUTED
```

Hoặc:

```text
PENDING / ARRIVED → SKIPPED
```

Rules:

- Organizer hoặc Trip Leader mới được update operational statuses.
- Trip chỉ được `COMPLETED` khi mọi Distribution Point là `DISTRIBUTED` hoặc `SKIPPED`.
- Trip chỉ được cancel trước khi có Distribution Point đã `DISTRIBUTED` theo proposal baseline.
- Khi Trip bị cancel, active Batch assignments phải được unassign.
- Batch status chuyển `ASSIGNED → READY`.
- Inventory quantity của Batch vẫn là `Reserved`.
- Batch có thể được assign sang Trip khác.
- Một Batch chỉ thuộc tối đa một non-cancelled Trip tại một thời điểm.
- Unassignment/cancellation phải được audit.

---

## FR19 – Distribution Confirmation

**Priority:** High

Organizer hoặc Trip Leader có thể tạo DistributionRecord.

Mỗi DistributionRecord biểu diễn:

```text
one TripBatch
+
one DistributionPoint
+
distributedQuantity
```

Rule:

- total distributed quantity của một Batch trên mọi Points không được vượt Batch.quantity;
- quantity remaining/returned/lost phải được reconcile ở Batch;
- confirmation actor phải lấy từ authenticated user, không tin client-supplied user ID.

Assigned Trip Volunteer có thể upload Evidence theo permission policy.

---

## FR20 – Transparency Log

**Priority:** High

Hệ thống phải ghi audit cho các thay đổi quan trọng.

Log tối thiểu chứa:

- action;
- entityType;
- entityId;
- actor;
- old status;
- new status;
- evidence reference nếu có;
- details;
- timestamp.

Các mutation quan trọng ảnh hưởng stock/status và audit nên commit nhất quán trong transaction khi có thể.

---

## FR21 – Transparency Timeline

**Priority:** High

Hệ thống phải hiển thị Timeline theo thứ tự thời gian cho các resource liên quan như:

- Donation;
- Batch;
- Trip;
- Distribution Point;
- Evidence.

Timeline phải phản ánh các thay đổi đã được log.

---

## FR22 – Public Tracking

**Priority:** High

Public Visitor có thể nhập Tracking ID hợp lệ mà không cần đăng nhập.

Public Tracking có thể hiển thị chuỗi liên quan:

```text
Donation
→ Batch
→ Trip
→ Distribution Points
→ Approved Evidence
→ Timeline
```

Public response không được expose:

- donor private profile;
- volunteer private profile;
- email/phone cá nhân;
- internal notes;
- pending/rejected Evidence.

Traceability của OpenAid là **batch-level traceability**, không phải item-level physical proof.

Hệ thống không tuyên bố rằng một đơn vị vật lý cụ thể của Donor A đã tới đúng Beneficiary B sau khi hàng đã được trộn trong Batch.

---

## FR23 – Dashboard & Report

**Priority:** Medium

Hệ thống phải cung cấp summary bằng query trên dữ liệu hiện có.

Các metric gồm:

- volunteers;
- donations;
- batches;
- trips;
- Needed;
- Pledged;
- Received;
- Reserved;
- Distributed;
- Lost/Written-off khi cần.

Không tạo một `Report` table/entity riêng chỉ để lưu summary trong MVP.

---

## FR24 – Admin Management

**Priority:** Medium

Platform Admin phải có các khả năng cơ bản:

- view users;
- activate/deactivate users;
- view pending Organizations;
- approve/reject/suspend Organization theo policy;
- basic Event moderation khi endpoint được triển khai;
- view global audit information được cho phép.

Các endpoint moderation chưa có trong backend không được coi là implemented cho đến khi API Contract được cập nhật.

---

## FR25 – File Upload Validation & Evidence Privacy

**Priority:** Medium

Evidence upload phải enforce:

- supported image format;
- maximum file size theo storage policy;
- privacy confirmation trước khi public workflow tiếp tục.

Uploader phải xác nhận rằng:

- identifiable beneficiaries đã được crop/blur; hoặc
- consent đã được lấy.

Evidence workflow:

```text
Upload
→ Privacy Confirmation
→ Organizer Review
→ APPROVED / REJECTED
→ Public Display nếu APPROVED
```

MVP không thực hiện automatic face detection hoặc automatic image verification.

Hệ thống không tự động chứng minh Evidence là thật.

---

## FR26 – Error Handling & Logging

**Priority:** Medium

Hệ thống phải:

- validate input;
- trả error message rõ ràng;
- sử dụng HTTP status code phù hợp;
- log lỗi quan trọng;
- không expose stack trace hoặc sensitive internal information cho public client trong production-like environment.

---

# 6. Business Rules

## BR01 – Unified USER model

Volunteer và Donor không phải system roles.

```text
User
├── VolunteerApplication
└── Donation
```

Một User có thể thực hiện cả hai hoạt động trong cùng một Event.

---

## BR02 – Organization scope

Organizer permission chỉ có hiệu lực trong Organization mà user có membership `ORGANIZER`.

Không có global ORGANIZER system role.

---

## BR03 – Event publication

Event chỉ được publish khi:

- caller là Organizer của Event Organization;
- Organization ở trạng thái được phép hoạt động;
- Event đang ở state hợp lệ.

---

## BR04 – Donation Need target

Target quantity là mục tiêu, không phải giới hạn cứng.

Pledge vượt target vẫn hợp lệ và hệ thống chỉ hiển thị warning.

---

## BR05 – Inventory conservation

Tại mọi thời điểm:

```text
Received = Available + Reserved + Distributed + Lost/Written-off
```

---

## BR06 – Batch compatibility

Một Batch không được trộn:

- Event khác nhau;
- ItemType khác nhau;
- Unit khác nhau.

Một Donation không được chia vào nhiều Batch.

---

## BR07 – Trip Event consistency

```text
Batch.eventId = Trip.eventId
```

Volunteer assignment cũng phải thuộc approved application của cùng Event.

---

## BR08 – Trip Leader

Mỗi Trip phải có một designated `LEADER` theo workflow MVP.

Các volunteer còn lại là `MEMBER`.

---

## BR09 – Distribution quantity

Tổng `distributedQuantity` của Batch qua tất cả Distribution Points không được vượt `Batch.quantity`.

---

## BR10 – Trip cancellation

Trip chỉ được cancel trong điều kiện business rule cho phép.

Khi cancel:

- Trip trở thành `CANCELLED`;
- active TripBatch assignment được đóng/unassign;
- Batch trở về `READY`;
- Inventory vẫn `Reserved`;
- Batch có thể assign sang Trip khác;
- audit log phải được tạo.

---

## BR11 – Evidence visibility

Evidence chỉ public khi:

```text
privacyConfirmed = true
AND
reviewStatus = APPROVED
```

---

## BR12 – Transparency meaning

Transparency trong OpenAid nghĩa là:

- traceability;
- auditability;
- accountability.

Không đồng nghĩa với automatic truth verification.

---

# 7. State Requirements

## 7.1 Organization

```text
PENDING
APPROVED
REJECTED
SUSPENDED
```

Transition cụ thể phải được Admin policy kiểm soát.

---

## 7.2 Event

```text
DRAFT → PUBLISHED → CLOSED
                 ↘ CANCELLED
```

Physical deletion chỉ dành cho Draft theo business rule.

---

## 7.3 Volunteer Application

```text
PENDING → APPROVED
        ↘ REJECTED
```

---

## 7.4 Donation

Schema hiện tại hỗ trợ:

```text
PENDING
RECEIVED
REJECTED
IN_BATCH
DISTRIBUTED
CANCELLED
```

Service phải chỉ cho phép transitions phù hợp business workflow; không được suy ra rằng mọi enum có thể chuyển tùy ý.

---

## 7.5 Batch

```text
DRAFT → READY → ASSIGNED → DISTRIBUTED
```

Cancelled Trip có thể làm active assignment trở về:

```text
ASSIGNED → READY
```

nhưng inventory vẫn Reserved.

---

## 7.6 Trip

```text
SCHEDULED → PREPARING → IN_TRANSIT → COMPLETED
```

hoặc `CANCELLED` khi điều kiện cancel còn hợp lệ.

---

## 7.7 Distribution Point

```text
PENDING → ARRIVED → DISTRIBUTED
```

hoặc:

```text
PENDING / ARRIVED → SKIPPED
```

---

## 7.8 Evidence

```text
PENDING → APPROVED
        ↘ REJECTED
```

Chỉ `APPROVED` được public.

---

# 8. Data Requirements

## 8.1 Core Entities

Data model MVP hiện gồm các nhóm entity chính:

### Identity & Organization

- User
- Organization
- OrganizationMember

### Event & Volunteer

- Event
- VolunteerRole
- VolunteerApplication
- VolunteerAttendance

### Donation & Inventory

- ItemType
- Unit
- DonationNeed
- Donation
- Inventory
- Batch

### Distribution

- Trip
- TripVolunteer
- TripBatch
- DistributionPoint
- DistributionRecord

### Transparency

- Evidence
- TransparencyLog

---

## 8.2 Data Integrity Requirements

- UUID được dùng cho primary IDs của business entities.
- User.email phải unique.
- Organization.code phải unique.
- Donation.trackingId phải unique.
- Batch.batchCode phải unique.
- Trip.tripCode phải unique.
- OrganizationMember phải unique theo `(userId, organizationId)`.
- DonationNeed phải unique theo `(eventId, itemTypeId, unitId)`.
- Inventory phải unique theo `(eventId, itemTypeId, unitId)`.
- DistributionPoint position phải unique trong Trip.
- DistributionRecord phải unique theo `(tripBatchId, distributionPointId)` theo schema baseline.
- Foreign-key relation phải preserve Event consistency theo schema/composite relations.

---

## 8.3 Audit Data

TransparencyLog phải hỗ trợ ít nhất:

- entity type;
- entity ID;
- actor ID;
- action;
- old/new status;
- optional Evidence;
- details JSON;
- timestamp.

---

# 9. External Interface Requirements

## 9.1 Web Interface

Các route/màn hình mục tiêu hiện tại gồm:

### Public / User

```text
/events
/events/[id]
/my/activities
/my/donations
/track
```

### Organizer

```text
/organizer/events
/organizer/volunteers
/organizer/donations
/organizer/inventory
/organizer/batches
/organizer/trips
/organizer/transparency
```

### Admin

```text
/admin/organizations
/admin/users
/admin/events
```

UI phải responsive.

---

## 9.2 REST API

Backend cung cấp REST API với prefix hiện tại:

```text
/api
```

Các domain API chính:

```text
/api/auth
/api/users
/api/organizations
/api/events
/api/volunteers
/api/donations
/api/inventory
/api/batches
/api/trips
/api/distribution
/api/evidence
/api/transparency
/api/dashboard
/api/admin
/api/health
```

Request/response cụ thể, status code, validation và implementation status được định nghĩa trong `API_CONTRACT.md`.

---

## 9.3 Authentication Interface

Protected endpoints sử dụng Bearer JWT theo backend baseline.

Backend phải lấy authenticated identity từ token/context thay vì tin các identity fields do client tự gửi.

---

## 9.4 File Storage Interface

Storage module phải abstraction việc lưu file.

Target:

```text
Local Storage (development)
Object Storage (deployment target)
```

Storage provider cụ thể có thể thay đổi mà không thay đổi business domain.

---

# 10. Non-Functional Requirements

## NFR01 – Performance

Các API thông thường như:

- list;
- detail;
- create;
- status update;

nên phản hồi dưới **3 giây** trong staging/demo environment với seed dataset và single Docker Compose deployment.

---

## NFR02 – Security

Hệ thống phải sử dụng:

- JWT authentication;
- password hashing;
- RBAC/scoped authorization;
- backend input validation;
- protected sensitive endpoints.

---

## NFR03 – Privacy

Public Tracking không được expose personal information của donors/volunteers.

Evidence chỉ public sau privacy confirmation và Organizer approval.

MVP không sử dụng automatic face detection hoặc automatic media processing.

---

## NFR04 – Usability

- UI responsive ở desktop/mobile widths.
- Main tasks nên hoàn thành trong tối đa 5 bước từ home page theo proposal target.
- Main task gồm volunteer apply, donation creation và Distribution Point update.

---

## NFR05 – Data Integrity

Inventory conservation equation phải luôn đúng:

```text
Received = Available + Reserved + Distributed + Lost/Written-off
```

Invalid state transitions phải bị reject.

---

## NFR06 – Traceability

Mọi important status change phải có TransparencyLog gồm:

- actor;
- time;
- old status;
- new status;
- evidence nếu có.

---

## NFR07 – Maintainability

Backend sử dụng Modular Monolith với module boundaries rõ ràng.

Code phải tuân theo project conventions và tránh coupling không cần thiết giữa modules.

---

## NFR08 – Reliability

- Có error handling.
- Có logging.
- Seed data có thể restore demo environment.
- End-to-end workflow phải chạy được mà không chỉnh DB thủ công.

---

## NFR09 – Deployment

System phải có khả năng đóng gói/deploy bằng Docker cho:

```text
frontend
backend
database
```

Môi trường thực tế có thể triển khai từng service/container theo deployment plan.

---

## NFR10 – Documentation

Dự án phải có:

- Swagger/OpenAPI documentation;
- API Contract;
- SRS;
- RBAC;
- architecture documentation;
- database/data model documentation;
- test documentation cần thiết cho Capstone.

---

# 11. Constraints

## 11.1 Time Constraint

Project được triển khai trong phạm vi Capstone Project 1 và kế hoạch khoảng 12 tuần trong proposal baseline.

## 11.2 Team Constraint

Team gồm 4 thành viên và phải ưu tiên hoàn thành end-to-end MVP trước các chức năng secondary.

## 11.3 Technical Constraint

- Architecture phải đơn giản, dễ debug.
- Không dùng microservices trong MVP.
- Không cần message queue.
- Stack chính đã được cố định.

## 11.4 Scope Constraint

Không thêm feature mới trước khi core end-to-end scenario hoạt động.

Nếu thiếu thời gian, Medium/secondary features có thể giảm ưu tiên trước High-priority workflows.

## 11.5 Financial Constraint

Không xử lý tiền thật và không tích hợp Payment Gateway.

## 11.6 Data Constraint

Demo sử dụng seed/synthetic data; không yêu cầu sử dụng real personal data.

## 11.7 Infrastructure Constraint

Location chỉ cần text/map link; không có real-time location tracking.

---

# 12. Assumptions

- Organization được Platform Admin review thủ công ở mức cơ bản trước khi được phép publish Event.
- User có Internet và thiết bị sử dụng Web Application.
- Donor và Organization tự chịu trách nhiệm vận chuyển goods tới receiving point; OpenAid chỉ ghi nhận thông tin.
- Evidence do user upload được coi là user-submitted evidence; hệ thống không tự xác minh tính chân thực của nội dung ảnh.
- Demo data được chuẩn bị để chạy đủ một end-to-end scenario.
- QR/file-storage libraries có thể sử dụng nếu phù hợp phạm vi và chi phí.
- Hệ thống được đánh giá như prototype/staging MVP, không phải large-scale production platform.

---

# 13. Main End-to-End Acceptance Scenario

Một MVP được coi là đạt core workflow khi scenario sau có thể chạy mà không sửa DB thủ công:

```text
1. User đăng ký/đăng nhập.
2. Organization được tạo và Admin approve.
3. Organizer tạo Event.
4. Organizer khai báo Volunteer Roles và Donation Needs.
5. Event được publish.
6. USER A apply Volunteer.
7. Organizer approve USER A.
8. USER B hoặc cùng USER A tạo Donation và nhận Tracking ID.
9. Organizer confirm Donation received.
10. Inventory Available tăng đúng quantity.
11. Organizer tạo Batch từ compatible Donations.
12. Inventory chuyển Available → Reserved.
13. Organizer tạo Trip và assign Batch + approved Volunteers + Points.
14. Trip Leader/Organizer cập nhật Trip/Point status.
15. Distribution quantity được ghi bằng DistributionRecord.
16. Evidence được upload với privacy confirmation.
17. Organizer review Evidence.
18. Batch được reconcile nếu có returned/lost quantity.
19. Inventory quantities vẫn thỏa conservation equation.
20. Public Visitor nhập Tracking ID.
21. Public Tracking hiển thị Donation → Batch → Trip → Points → approved Evidence/Timeline mà không lộ PII.
22. Dashboard phản ánh summary chính xác.
23. TransparencyLog ghi nhận các mutation/status changes quan trọng.
```

---

# 14. Acceptance Criteria by Major Domain

## Authentication

- Password không lưu plain text.
- Protected routes reject unauthenticated request.
- Disabled user không được thực hiện protected operations theo auth policy.

## Organization

- User có thể create Organization.
- Admin có thể review Organization.
- Unapproved Organization không được publish Event.

## Event

- Event lifecycle được enforce.
- Draft delete hoạt động đúng rule.
- Published Event có business data không bị physical delete trái rule.

## Volunteer

- User apply đúng role/event.
- Organizer khác Organization không review được application.
- Only approved volunteer được assign vào Trip.

## Donation

- Tracking ID unique và non-sequential.
- Donation over target vẫn tạo được và chỉ warning.
- Donor chỉ xem own donations ở private endpoint.

## Inventory

- Receipt tăng Received + Available đúng.
- Batch creation chuyển Available → Reserved đúng một lần.
- Trip assignment không reserve lại.
- Distribution/reconcile giữ invariant.

## Batch

- Không mix Event/type/unit.
- Donation không thuộc nhiều Batch.
- Cancelled Trip không làm hàng trở về Available chỉ vì cancel.

## Trip

- Chỉ dùng approved volunteer cùng Event.
- Có Trip Leader.
- Complete chỉ khi Points terminal.
- Cancel hoạt động đúng inventory/assignment rule.

## Distribution

- Record gắn đúng TripBatch và Point.
- Total distributed không vượt Batch quantity.

## Evidence

- Privacy confirmation bắt buộc theo policy.
- Pending/rejected Evidence không public.
- Organizer review trước public display.

## Transparency

- Public Tracking không cần login.
- Không expose PII.
- Timeline chronological.
- Audit log có actor/time/status data cần thiết.

---

# 15. Requirements Traceability Summary

| Domain | Main Requirements |
|---|---|
| Authentication / User | FR01–FR03 |
| Organization / Event | FR04–FR07 |
| Volunteer | FR08–FR11 |
| Donation / Inventory / Batch | FR12–FR16 |
| Trip / Distribution | FR17–FR19 |
| Transparency | FR20–FR22 |
| Dashboard / Admin / Files | FR23–FR26 |
| Performance / Security / Quality | NFR01–NFR10 |

Chi tiết API mapping của từng FR được theo dõi trong tài liệu API traceability/API Contract của dự án.

---

# 16. Open Decisions / Items Not Yet Fully Contracted

Các điểm sau tồn tại trong requirement hoặc prototype nhưng cần được khóa ở API/design trước khi coi là implementation hoàn chỉnh:

1. Logout/session refresh/revocation strategy.
2. API lấy membership context của current user cho multi-organization UI.
3. Catalog API cho ItemType/Unit.
4. Semantics khi edit nested Volunteer Roles/Donation Needs sau khi Event đã có dữ liệu.
5. Donation photo upload contract.
6. Evidence multipart upload/storage serving implementation.
7. Admin Event moderation endpoints.
8. Quy tắc attendance cụ thể: ai xác nhận và time window.
9. Điều kiện chi tiết để Point được coi là `DISTRIBUTED` khi có nhiều Batch.
10. Cancel Trip nếu đã có DistributionRecord nhưng Point chưa terminal.
11. Batch reconciliation dùng cumulative hay delta input.
12. Exact public code generation/collision retry strategy.
13. Concurrency/idempotency policy cho receipt, distribution và reconciliation.

Các điểm này không được tự suy diễn khác nhau giữa FE và BE; khi chốt phải cập nhật SRS/API Contract/RBAC nếu làm thay đổi requirement.

---

# 17. Document Governance

SRS là requirement baseline của OpenAid MVP.

Khi thay đổi requirement:

1. Tạo issue/task mô tả lý do thay đổi.
2. Kiểm tra ảnh hưởng tới Proposal/SRS.
3. Cập nhật `API_CONTRACT.md` nếu API thay đổi.
4. Cập nhật `RBAC.md` nếu quyền thay đổi.
5. Cập nhật `schema.prisma` + migration nếu data model thay đổi.
6. Cập nhật FE/BE và test trong cùng Sprint/PR phù hợp.
7. Không để code trở thành nguồn requirement duy nhất mà tài liệu không được cập nhật.

---

# 18. Suggested Documentation Structure

```text
OpenAid_BE/
└── docs/
    ├── SRS.md
    ├── architecture.md
    ├── api/
    │   ├── API_CONTRACT.md
    │   └── RBAC.md
    └── diagrams/
        ├── system-context.*
        ├── use-case.*
        ├── architecture.*
        ├── erd.*
        ├── state-diagrams.*
        └── sequence-diagrams.*
```

---

# 19. Source Baseline

Tài liệu SRS này được tổng hợp từ các artifact hiện tại của OpenAid:

- Project Proposal của OpenAid.
- Prisma database schema hiện tại.
- API traceability and decisions document.
- API Contract.
- RBAC specification.
- Backend Modular Monolith module structure.
- Current Frontend route list.

Nếu các artifact trên có thay đổi sau khi SRS được freeze, team phải thực hiện change review để giữ tính nhất quán.

---

**End of Software Requirements Specification – OpenAid Version 1.0 MVP**
