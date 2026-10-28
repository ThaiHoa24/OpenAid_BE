# OpenAid API Contract

> **Project:** OpenAid – Transparent In-Kind Donation & Volunteer Coordination System  
> **Backend:** NestJS Modular Monolith + Prisma + PostgreSQL  
> **Frontend:** Next.js  
> **API prefix hiện tại:** `/api`  
> **Tài liệu này:** hợp đồng tích hợp FE ↔ BE cho MVP, được tổng hợp từ Proposal, `schema.prisma`, cấu trúc 16 module BE, route FE hiện tại và tài liệu `09-api-traceability-and-decisions.md`.

---

## 1. Mục đích

File này là **API Contract chính để team FE và BE cùng bám vào**.

Nguyên tắc:

- Không dùng mock FE làm nguồn chính cho model vật lý.
- Không biến `Volunteer` hoặc `Donor` thành `SystemRole`.
- Không tự coi endpoint chưa tồn tại là đã implement.
- Mọi endpoint được gắn trạng thái rõ ràng.
- Các business rule quan trọng phải được kiểm tra ở Backend, không chỉ ở UI.
- Các thao tác thay đổi stock/status/audit nên nằm trong cùng transaction nghiệp vụ.

---

## 2. Trạng thái endpoint

| Trạng thái | Ý nghĩa |
|---|---|
| `IMPLEMENTED` | Route và logic chính đã có |
| `SCAFFOLDED` | Route/DTO/controller đã có nhưng service nghiệp vụ còn khung hoặc trả `501` |
| `REQUIRED / TO IMPLEMENT` | Proposal hoặc FE cần nhưng BE chưa có contract/route hoàn chỉnh |
| `OPTIONAL / PHASE 2` | Không bắt buộc cho MVP |

---

## 3. Actor và phân quyền

### 3.1 System role

```text
USER
ADMIN
```

`Volunteer` và `Donor` **không phải system role**.

Một `USER` có thể đồng thời:

- tạo `VolunteerApplication` để tham gia tình nguyện;
- tạo `Donation` để đóng góp hiện vật;
- là `ORGANIZER` của một hoặc nhiều Organization thông qua `OrganizationMember`.

### 3.2 Organization role

```text
MEMBER
ORGANIZER
```

`ORGANIZER` chỉ có quyền trong Organization mà user là thành viên `ORGANIZER`.

### 3.3 Trip role

```text
LEADER
MEMBER
```

Chỉ `ORGANIZER` của Organization sở hữu Event hoặc `Trip LEADER` mới được thực hiện các thao tác thay đổi trạng thái Trip/Distribution Point và xác nhận số lượng phân phối theo business rule.

---

## 4. Authentication

Các route Public không yêu cầu JWT. Các route còn lại dùng Bearer JWT.

```http
Authorization: Bearer <access_token>
```

### Public routes hiện có

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/events`
- `GET /api/events/:id`
- `GET /api/organizations`
- `GET /api/organizations/:id`
- `GET /api/transparency/track/:trackingId`
- `GET /api/health/live`

> Lưu ý: JWT chỉ xác thực user. Quyền `ORGANIZER`/`Trip LEADER` phải được check thêm ở domain service/guard tương ứng.

---

## 5. Quy ước response đề xuất để FE và BE thống nhất

> **Trạng thái:** `TARGET CONTRACT` – đây là format đề xuất để khóa tích hợp. Nếu source hiện tại đang dùng format khác, team cần chọn một format duy nhất trước khi FE nối API thật.

### 5.1 Success – single resource

```json
{
  "success": true,
  "data": {},
  "message": "Optional message"
}
```

### 5.2 Success – list có pagination

```json
{
  "success": true,
  "data": [],
  "meta": {
    "skip": 0,
    "take": 20,
    "total": 100
  }
}
```

### 5.3 Error

```json
{
  "success": false,
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "errors": []
}
```

### 5.4 HTTP status code chuẩn

| Code | Dùng khi |
|---:|---|
| `200` | GET/PATCH/POST action thành công không tạo resource mới |
| `201` | Tạo resource mới thành công |
| `204` | Xóa thành công và không trả body |
| `400` | DTO/validation/status transition không hợp lệ |
| `401` | Chưa đăng nhập / JWT không hợp lệ |
| `403` | Đăng nhập rồi nhưng không có quyền |
| `404` | Resource không tồn tại |
| `409` | Conflict: duplicate, capacity, stock, active assignment, invalid concurrent state |
| `422` | Có thể dùng cho business validation nếu team muốn tách khỏi `400`; nếu không thì giữ `400` |
| `500` | Lỗi server không dự kiến |
| `501` | Chỉ dùng tạm thời cho scaffold chưa implement; không dùng khi hoàn thiện MVP |

---

## 6. Pagination

DTO hiện tại:

```text
skip: integer >= 0, default 0
take: integer 1..100, default 20
```

Ví dụ:

```http
GET /api/events?skip=0&take=20
```

---

## 7. Enum contract

### SystemRole

```text
USER | ADMIN
```

### OrganizationRole

```text
MEMBER | ORGANIZER
```

### OrgStatus

```text
PENDING | APPROVED | REJECTED | SUSPENDED
```

### EventStatus

```text
DRAFT | PUBLISHED | CLOSED | CANCELLED
```

### VolunteerApplicationStatus

```text
PENDING | APPROVED | REJECTED
```

### DonationStatus

```text
PENDING | RECEIVED | REJECTED | IN_BATCH | DISTRIBUTED | CANCELLED
```

### BatchStatus

```text
DRAFT | READY | ASSIGNED | DISTRIBUTED
```

### TripStatus

```text
SCHEDULED | PREPARING | IN_TRANSIT | COMPLETED | CANCELLED
```

### TripVolunteerRole

```text
LEADER | MEMBER
```

### DistributionPointStatus

```text
PENDING | ARRIVED | DISTRIBUTED | SKIPPED
```

### EvidenceReviewStatus

```text
PENDING | APPROVED | REJECTED
```

---

# 8. Endpoint Registry

## 8.1 Auth

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| AUTH-01 | POST | `/api/auth/register` | Public | `RegisterDto` | `IMPLEMENTED` |
| AUTH-02 | POST | `/api/auth/login` | Public | `LoginDto` | `IMPLEMENTED` |
| AUTH-03 | POST | `/api/auth/logout` | JWT | — | `REQUIRED / TO IMPLEMENT` |

### AUTH-01 Register

**Request**

```json
{
  "email": "user@example.com",
  "fullName": "Nguyen Van A",
  "password": "123456",
  "phoneNumber": "0900000000"
}
```

Validation:

- `email`: valid email, required.
- `fullName`: string, required.
- `password`: minimum 6 characters.
- `phoneNumber`: optional string.
- Email phải unique.

**Target response `201`**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "fullName": "Nguyen Van A",
    "phoneNumber": "0900000000",
    "systemRole": "USER",
    "isActive": true
  }
}
```

Không trả `passwordHash`.

### AUTH-02 Login

**Request**

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**Target response `200`**

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt-token",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "fullName": "Nguyen Van A",
      "systemRole": "USER",
      "isActive": true
    }
  }
}
```

> Refresh token/revoke chưa được chốt trong source hiện tại. Không thêm Redis/refresh-token table nếu team chưa quyết định scope.

---

## 8.2 Users

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| USR-01 | GET | `/api/users/profile` | JWT | — | `IMPLEMENTED` |
| USR-02 | PATCH | `/api/users/profile` | JWT | `UpdateUserDto` | `IMPLEMENTED` |
| USR-03 | GET | `/api/users/memberships` | JWT | — | `REQUIRED / TO IMPLEMENT` |

### User response shape

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "fullName": "Nguyen Van A",
  "phoneNumber": "0900000000",
  "avatarUrl": null,
  "systemRole": "USER",
  "isActive": true,
  "createdAt": "2026-10-28T00:00:00.000Z",
  "updatedAt": "2026-10-28T00:00:00.000Z"
}
```

### USR-02 Update profile

**Request**

```json
{
  "fullName": "Nguyen Van B",
  "phoneNumber": "0911111111",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

> `bio` có ở FE mock nhưng **không có trong schema hiện tại**, vì vậy không đưa vào contract BE.

### USR-03 Membership context

Mục đích: FE biết user đang thuộc Organization nào và role gì.

**Target response**

```json
{
  "success": true,
  "data": [
    {
      "organizationId": "uuid",
      "organizationName": "Helping Hands Da Nang",
      "organizationStatus": "APPROVED",
      "role": "ORGANIZER"
    }
  ]
}
```

---

## 8.3 Organizations

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| ORG-01 | GET | `/api/organizations` | Public | `PaginationDto` | `SCAFFOLDED` |
| ORG-02 | GET | `/api/organizations/:id` | Public | — | `SCAFFOLDED` |
| ORG-03 | POST | `/api/organizations` | JWT | `CreateOrganizationDto` | `SCAFFOLDED` |
| ORG-04 | PATCH | `/api/organizations/:id` | JWT + Organizer scope | `UpdateOrganizationDto` | `SCAFFOLDED` |
| ORG-05 | POST | `/api/organizations/:id/members` | JWT + Organizer scope | `AddOrganizationMemberDto` | `SCAFFOLDED` |

### ORG-03 Create organization

```json
{
  "name": "Helping Hands Da Nang",
  "code": "HHDN",
  "description": "Charity organization",
  "email": "contact@example.com",
  "phoneNumber": "0900000000",
  "address": "Da Nang"
}
```

Business rules:

- `code` unique.
- Organization mới mặc định `PENDING`.
- Organization chỉ publish Event khi `status = APPROVED`.
- Creator/membership policy cần được service chốt rõ; khuyến nghị creator trở thành `ORGANIZER` trong cùng transaction nếu đó là flow FE mong muốn.

### Organization response

```json
{
  "id": "uuid",
  "name": "Helping Hands Da Nang",
  "code": "HHDN",
  "description": "Charity organization",
  "email": "contact@example.com",
  "phoneNumber": "0900000000",
  "address": "Da Nang",
  "status": "APPROVED",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

## 8.4 Catalogs – ItemType / Unit

`ItemType` và `Unit` có trong schema/seed nhưng controller GET catalog hiện chưa có.

| ID | Method | Endpoint | Auth | Status |
|---|---|---|---|---|
| CAT-01 | GET | `/api/catalogs/item-types` | Public hoặc JWT | `REQUIRED / TO IMPLEMENT` |
| CAT-02 | GET | `/api/catalogs/units` | Public hoặc JWT | `REQUIRED / TO IMPLEMENT` |

> Path trên là **target contract đề xuất**, chưa phải route hiện có.

### ItemType response

```json
{
  "id": "uuid",
  "code": "RICE",
  "name": "Rice",
  "category": "FOOD"
}
```

### Unit response

```json
{
  "id": "uuid",
  "code": "KG",
  "name": "Kilogram"
}
```

FE khi tạo Event/Donation Need phải gửi UUID `itemTypeId` và `unitId`, không gửi label mock thay ID DB.

---

## 8.5 Events

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| EVT-01 | GET | `/api/events` | Public | `EventQueryDto` | `SCAFFOLDED` |
| EVT-02 | GET | `/api/events/:id` | Public | — | `SCAFFOLDED` |
| EVT-03 | POST | `/api/events` | JWT + Organization ORGANIZER | `CreateEventDto` | `SCAFFOLDED` |
| EVT-04 | PATCH | `/api/events/:id` | JWT + Organization ORGANIZER | `UpdateEventDto` | `SCAFFOLDED` |
| EVT-05 | PATCH | `/api/events/:id/status` | JWT + Organization ORGANIZER | `ChangeEventStatusDto` | `SCAFFOLDED` |
| EVT-06 | DELETE | `/api/events/:id` | JWT + Organization ORGANIZER | — | `SCAFFOLDED` |

### EVT-01 Event discovery query

```text
skip?: number
 take?: number
search?: string
area?: string
from?: ISO date
to?: ISO date
itemTypeId?: UUID
```

> `area` hiện chưa có field chuẩn riêng trong DB; backend Event chỉ có `location`. Team cần thống nhất `area` filter map vào `location` hay thêm field sau này. Không tự thêm cột chỉ vì FE mock có `area`.

### EVT-03 Create Event

```json
{
  "organizationId": "uuid",
  "title": "Support for Hoa Vang Flood Area",
  "description": "...",
  "location": "Hoa Vang, Da Nang",
  "contactName": "Nguyen Van A",
  "contactPhone": "0900000000",
  "startDate": "2026-11-01T08:00:00.000Z",
  "endDate": "2026-11-02T17:00:00.000Z",
  "volunteerRoles": [
    {
      "name": "Transportation",
      "quantity": 10,
      "description": "Move donated goods"
    }
  ],
  "donationNeeds": [
    {
      "itemTypeId": "uuid",
      "unitId": "uuid",
      "targetQuantity": 500
    }
  ]
}
```

Business rules:

- Caller phải là `ORGANIZER` của `organizationId`.
- Organization phải được Admin `APPROVED` trước khi Event được `PUBLISHED`.
- `startDate < endDate` nếu có `endDate`.
- `DonationNeed` unique theo `(eventId, itemTypeId, unitId)`.
- `VolunteerRole` unique theo `(eventId, name)`.

### Event lifecycle

```text
DRAFT -> PUBLISHED -> CLOSED
                 \-> CANCELLED
```

- Draft có thể delete.
- Published Event có application/donation/trip không được physical delete.

### Event detail target response

```json
{
  "id": "uuid",
  "organization": {
    "id": "uuid",
    "name": "Helping Hands Da Nang"
  },
  "title": "Support for Hoa Vang Flood Area",
  "description": "...",
  "location": "Hoa Vang, Da Nang",
  "contactName": "Nguyen Van A",
  "contactPhone": "0900000000",
  "startDate": "...",
  "endDate": "...",
  "status": "PUBLISHED",
  "volunteerRoles": [],
  "donationNeeds": []
}
```

---

## 8.6 Volunteers

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| VOL-01 | POST | `/api/volunteers/apply` | JWT USER | `CreateVolunteerDto` | `SCAFFOLDED` |
| VOL-02 | GET | `/api/volunteers/my` | JWT USER | — | `SCAFFOLDED` |
| VOL-03 | GET | `/api/volunteers/event/:eventId` | JWT + Organizer scope | — | `SCAFFOLDED` |
| VOL-04 | PATCH | `/api/volunteers/:id/review` | JWT + Organizer scope | `ReviewVolunteerDto` | `SCAFFOLDED` |
| VOL-05 | POST | `/api/volunteers/:id/check-in` | JWT | — | `SCAFFOLDED` |
| VOL-06 | POST | `/api/volunteers/:id/check-out` | JWT | — | `SCAFFOLDED` |

### VOL-01 Apply

```json
{
  "eventId": "uuid",
  "volunteerRoleId": "uuid",
  "notes": "I can help with transportation"
}
```

Business rules:

- Event và VolunteerRole phải cùng Event.
- Một User chỉ có một `VolunteerApplication` cho cùng Event theo schema `@@unique([eventId, userId])`.
- Event phải ở trạng thái cho phép apply theo policy MVP.
- Capacity dựa trên `VolunteerRole.quantity`; cách xử lý khi đủ chỗ cần thống nhất trong service.

### VOL-04 Review

```json
{
  "status": "APPROVED"
}
```

Chỉ nhận:

```text
APPROVED | REJECTED
```

### Attendance

- `VolunteerAttendance` là entity riêng.
- Check-in tạo attendance nếu chưa có.
- Check-out cập nhật `checkedOutAt`.
- QR là optional; confirmation button đủ cho MVP.

---

## 8.7 Donations

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| DON-01 | POST | `/api/donations` | JWT USER | `CreateDonationDto` | `SCAFFOLDED` |
| DON-02 | GET | `/api/donations/my` | JWT USER | `PaginationDto` | `SCAFFOLDED` |
| DON-03 | GET | `/api/donations/event/:eventId` | JWT + Organizer scope | `PaginationDto` | `SCAFFOLDED` |
| DON-04 | PATCH | `/api/donations/:id/receipt` | JWT + Organizer scope | `ReceiveDonationDto` | `SCAFFOLDED` |
| DON-05 | POST | `/api/donations/:id/cancel` | JWT owner | — | `SCAFFOLDED` |

### DON-01 Create donation

```json
{
  "donationNeedId": "uuid",
  "quantity": 50
}
```

Business rules:

- `quantity > 0`.
- DonationNeed phải tồn tại.
- Event/Need phải còn cho phép nhận pledge theo policy.
- `DonationNeed` là target, **không phải hard cap**.
- Nếu pledge vượt target: backend có thể trả warning nhưng không reject chỉ vì vượt target.
- Tự derive `eventId`, `itemTypeId`, `unitId` từ DonationNeed; FE không nên gửi lặp các field này.
- Generate `trackingId` unique, random, non-sequential.
- `donorId` lấy từ JWT current user, không nhận từ body.
- Status mặc định `PENDING`.

**Target response `201`**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "trackingId": "DON-2026-7K3Q9X",
    "eventId": "uuid",
    "donationNeedId": "uuid",
    "itemType": {
      "id": "uuid",
      "code": "RICE",
      "name": "Rice"
    },
    "unit": {
      "id": "uuid",
      "code": "KG",
      "name": "Kilogram"
    },
    "quantity": "50.000",
    "status": "PENDING",
    "warning": null
  }
}
```

### DON-04 Confirm receipt / reject

```json
{
  "status": "RECEIVED",
  "rejectionReason": null
}
```

hoặc:

```json
{
  "status": "REJECTED",
  "rejectionReason": "Goods were not delivered"
}
```

Business rules khi `RECEIVED`:

- Chỉ xử lý một lần; retry phải tránh cộng Inventory hai lần.
- `receivedAt` được set.
- Tăng `Inventory.receivedQuantity`.
- Tăng `Inventory.availableQuantity`.
- Giữ invariant:

```text
received = available + reserved + distributed + lost
```

Business rules khi `REJECTED`:

- Không cộng Inventory.
- `rejectionReason` nên bắt buộc nếu reject.

### Donation photo

Schema có `photoUrl` nhưng `CreateDonationDto` hiện chưa có upload/file contract. Vì vậy donation photo hiện là **chưa hoàn chỉnh**.

---

## 8.8 Inventory

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| INV-01 | GET | `/api/inventory/organization/:organizationId` | JWT + Organization scope | `InventoryQueryDto` | `SCAFFOLDED` |

Query:

```text
skip?: number
 take?: number
eventId?: UUID
```

### Inventory response

```json
{
  "id": "uuid",
  "eventId": "uuid",
  "itemType": {
    "id": "uuid",
    "code": "RICE",
    "name": "Rice"
  },
  "unit": {
    "id": "uuid",
    "code": "KG",
    "name": "Kilogram"
  },
  "receivedQuantity": "100.000",
  "availableQuantity": "0.000",
  "reservedQuantity": "100.000",
  "distributedQuantity": "0.000",
  "lostQuantity": "0.000"
}
```

Invariant bắt buộc:

```text
Received = Available + Reserved + Distributed + Lost/Written-off
```

Inventory được earmark theo:

```text
Event + ItemType + Unit
```

---

## 8.9 Batches

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| BAT-01 | POST | `/api/batches` | JWT + Organizer scope | `CreateBatchDto` | `SCAFFOLDED` |
| BAT-02 | GET | `/api/batches/event/:eventId` | JWT + Organizer scope | — | `SCAFFOLDED` |
| BAT-03 | GET | `/api/batches/:id` | JWT + Organizer scope | — | `SCAFFOLDED` |
| BAT-04 | PATCH | `/api/batches/:id/status` | JWT + Organizer scope | `UpdateBatchDto` | `SCAFFOLDED` |
| BAT-05 | POST | `/api/batches/:id/reconcile` | JWT + Organizer scope | `ReconcileBatchDto` | `SCAFFOLDED` |

### BAT-01 Create batch

```json
{
  "eventId": "uuid",
  "donationIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

Business rules bắt buộc:

- Tất cả Donation phải `RECEIVED`.
- Tất cả Donation cùng `eventId`.
- Cùng `itemTypeId`.
- Cùng `unitId`.
- Một Donation chỉ thuộc tối đa một Batch (`Donation.batchId` nullable FK).
- Tổng quantity của Batch = tổng quantity Donation được chọn.
- Inventory phải đủ `availableQuantity`.
- Khi tạo Batch:

```text
Available -= batch.quantity
Reserved  += batch.quantity
```

- Không cộng Reserved lần nữa khi Batch được gán vào Trip.
- Sinh `batchCode` unique.

### BAT-04 Update status

DTO hiện chỉ cho:

```json
{
  "status": "READY"
}
```

Các trạng thái `ASSIGNED/DISTRIBUTED` nên được thay đổi bởi workflow Trip/Distribution, không cho FE tùy ý PATCH nếu không đúng nghiệp vụ.

### BAT-05 Reconcile

```json
{
  "returnedQuantity": 15,
  "lostQuantity": 5,
  "note": "15kg returned to warehouse, 5kg damaged"
}
```

Cần chốt rõ input là cumulative hay delta. Khuyến nghị API contract final chọn **cumulative final reconciliation** để retry an toàn hơn, nhưng source hiện tại chưa chốt.

---

## 8.10 Trips

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| TRP-01 | GET | `/api/trips/event/:eventId` | JWT + Organization scope | `PaginationDto` | `SCAFFOLDED` |
| TRP-02 | GET | `/api/trips/:id` | JWT + Organization scope / assigned member | — | `SCAFFOLDED` |
| TRP-03 | POST | `/api/trips` | JWT + Organizer scope | `CreateTripDto` | `SCAFFOLDED` |
| TRP-04 | PATCH | `/api/trips/:id/status` | JWT + Organizer or Trip LEADER | `UpdateTripDto` | `SCAFFOLDED` |

### TRP-03 Create Trip

```json
{
  "eventId": "uuid",
  "departurePoint": "Da Nang warehouse",
  "departureDate": "2026-11-02T07:00:00.000Z",
  "vehicle": "Truck 43C-12345",
  "batchIds": ["batch-uuid"],
  "volunteers": [
    {
      "applicationId": "application-uuid-1",
      "role": "LEADER"
    },
    {
      "applicationId": "application-uuid-2",
      "role": "MEMBER"
    }
  ],
  "points": [
    {
      "position": 1,
      "name": "Hoa Bac Commune",
      "location": "Hoa Bac, Hoa Vang, Da Nang",
      "mapUrl": "https://maps.google.com/..."
    }
  ]
}
```

Business rules:

- Trip thuộc đúng một Event.
- Batch phải cùng Event với Trip.
- VolunteerApplication phải cùng Event và `APPROVED`.
- Phải có đúng một `LEADER` theo business rule MVP.
- Batch chỉ được có tối đa một active/non-cancelled Trip assignment tại một thời điểm.
- Gán Batch vào Trip **không thay đổi stock quantity lần nữa**.
- DistributionPoint `position` unique trong Trip.

### Trip lifecycle

```text
SCHEDULED -> PREPARING -> IN_TRANSIT -> COMPLETED
                                  \-> CANCELLED (theo rule)
```

Không suy ra mọi cạnh chỉ vì enum tồn tại. Service phải enforce transition hợp lệ.

### Cancel Trip

Rule proposal hiện tại:

- Chỉ cancel trước khi có Distribution Point `DISTRIBUTED`.
- Khi cancel:
  - Trip -> `CANCELLED`;
  - active `TripBatch` được `unassignedAt`;
  - Batch `ASSIGNED -> READY`;
  - quantity vẫn `Reserved`;
  - Batch có thể assign sang Trip khác;
  - không tăng `Available` chỉ vì cancel Trip.

**Khuyến nghị an toàn cần team chốt:** nếu đã có `DistributionRecord` thực tế dù Point chưa terminal, cũng nên chặn cancel hoặc có recovery transaction rõ ràng.

---

## 8.11 Distribution

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| DST-01 | POST | `/api/distribution/records` | JWT + Organizer/Trip LEADER | `CreateDistributionDto` | `SCAFFOLDED` |
| DST-02 | GET | `/api/distribution/records/:id` | JWT + scoped access | — | `SCAFFOLDED` |
| DST-03 | GET | `/api/distribution/trip/:tripId` | JWT + scoped access | — | `SCAFFOLDED` |
| DST-04 | PATCH | `/api/distribution/points/:id/status` | JWT + Organizer/Trip LEADER | `UpdateDistributionPointDto` | `SCAFFOLDED` |

### DST-01 Create DistributionRecord

```json
{
  "tripBatchId": "uuid",
  "distributionPointId": "uuid",
  "distributedQuantity": 40,
  "beneficiaryCount": 25,
  "notes": "Distributed to 25 households"
}
```

Business rules:

- `tripBatchId` và `distributionPointId` phải thuộc cùng Trip.
- Record đại diện đúng:

```text
one TripBatch + one DistributionPoint + distributedQuantity
```

- Schema unique `(tripBatchId, distributionPointId)`: mỗi Batch tại một Point có tối đa một record.
- `confirmedById` lấy từ current user, không lấy từ body.
- Tổng distributed của một Batch trên tất cả Points không vượt `Batch.quantity`.
- Quantity mutation phải transaction-safe để tránh race condition.
- Nếu endpoint được retry, không được cộng distributed hai lần.

### DST-04 Distribution Point status

```json
{
  "status": "ARRIVED"
}
```

hoặc:

```json
{
  "status": "SKIPPED",
  "skippedReason": "Road blocked"
}
```

Lifecycle:

```text
PENDING -> ARRIVED -> DISTRIBUTED
    \-----------------> SKIPPED
```

Trip chỉ `COMPLETED` khi tất cả Points đều `DISTRIBUTED` hoặc `SKIPPED`.

> Cần chốt chính xác khi nào Point được phép chuyển `DISTRIBUTED` nếu Point có nhiều Batch. Một DistributionRecord không nên mặc nhiên hoàn tất toàn Point.

---

## 8.12 Evidence

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| EVD-01 | POST | `/api/evidence` | JWT assigned Volunteer / Leader / Organizer theo policy | `CreateEvidenceDto` | `SCAFFOLDED` metadata, upload file chưa hoàn chỉnh |
| EVD-02 | GET | `/api/evidence/trip/:tripId` | JWT scoped | — | `SCAFFOLDED` |
| EVD-03 | PATCH | `/api/evidence/:id/review` | JWT + Organizer scope | `ReviewEvidenceDto` | `SCAFFOLDED` |

### EVD-01 Metadata DTO hiện có

```json
{
  "tripId": "uuid",
  "distributionPointId": "uuid",
  "distributionRecordId": "uuid",
  "privacyConfirmed": true,
  "caption": "Distribution at Hoa Bac"
}
```

Business rules:

- `privacyConfirmed` bắt buộc `true`.
- Trip, Point và optional Record phải cùng relation hợp lệ.
- Người upload phải có quyền theo Event/Trip.
- Evidence mặc định `PENDING`.
- Chỉ Evidence `APPROVED` mới được đưa vào Public Tracking/Public Timeline.
- `uploadedById`, `reviewedById`, timestamps lấy từ server/context.

### Upload file

Schema yêu cầu:

```text
imageUrl
mimeType
sizeBytes
```

Nhưng source hiện tại chưa có `FileInterceptor/UploadedFile` và storage adapter hoạt động hoàn chỉnh.

**Target MVP policy hiện được đề xuất trong tài liệu kỹ thuật:**

- JPEG / PNG / WebP;
- giới hạn khoảng 5 MiB;
- file pending/rejected không được lộ public URL;
- byte ảnh nằm ngoài DB transaction; metadata nằm trong DB.

### EVD-03 Review

```json
{
  "status": "APPROVED",
  "note": "Privacy checked"
}
```

hoặc:

```json
{
  "status": "REJECTED",
  "note": "Identifiable beneficiary face is visible"
}
```

---

## 8.13 Transparency

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| TRN-01 | GET | `/api/transparency/track/:trackingId` | Public | — | `SCAFFOLDED` |
| TRN-02 | GET | `/api/transparency/timeline` | JWT | `TimelineQueryDto` | `SCAFFOLDED` |
| TRN-03 | GET | `/api/transparency/logs` | ADMIN | `PaginationDto` | `SCAFFOLDED` |

### TRN-01 Public Tracking

Public chain:

```text
Donation -> Batch -> Trip -> Distribution Point -> Approved Evidence -> Timeline
```

**Không trả PII** của donor/volunteer.

Không trả:

- email;
- phoneNumber;
- internal notes nhạy cảm;
- pending/rejected Evidence;
- reviewer internal note nếu không cần public.

**Target response**

```json
{
  "success": true,
  "data": {
    "trackingId": "DON-2026-7K3Q9X",
    "donation": {
      "status": "DISTRIBUTED",
      "quantity": "50.000",
      "itemType": "Rice",
      "unit": "kg",
      "event": {
        "id": "uuid",
        "title": "Support for Hoa Vang Flood Area"
      }
    },
    "batch": {
      "id": "uuid",
      "batchCode": "RICE-BATCH-001",
      "status": "DISTRIBUTED"
    },
    "trips": [
      {
        "id": "uuid",
        "tripCode": "TRIP-001",
        "status": "COMPLETED",
        "points": [
          {
            "name": "Hoa Bac Commune",
            "status": "DISTRIBUTED",
            "records": [
              {
                "distributedQuantity": "40.000"
              }
            ],
            "evidence": [
              {
                "imageUrl": "public-approved-url",
                "caption": "Distribution evidence",
                "uploadedAt": "..."
              }
            ]
          }
        ]
      }
    ],
    "timeline": []
  }
}
```

### TRN-02 Timeline

Query:

```text
entityType: TransparencyEntityType
entityId: string
```

Target log shape:

```json
{
  "id": "uuid",
  "action": "TRIP_STATUS_CHANGED",
  "entityType": "TRIP",
  "entityId": "uuid",
  "oldStatus": "PREPARING",
  "newStatus": "IN_TRANSIT",
  "details": {},
  "createdAt": "..."
}
```

Audit rule:

- status/stock mutation và TransparencyLog nên commit cùng transaction.

---

## 8.14 Dashboard

| ID | Method | Endpoint | Auth | Status |
|---|---|---|---|---|
| DSH-01 | GET | `/api/dashboard/events/:eventId` | JWT + scoped access | `SCAFFOLDED` |

Dashboard được tạo bằng query; **không có Report entity**.

Target response:

```json
{
  "success": true,
  "data": {
    "eventId": "uuid",
    "volunteers": {
      "applications": 20,
      "approved": 15,
      "checkedIn": 10
    },
    "donations": {
      "count": 30,
      "batches": 5,
      "trips": 2
    },
    "quantities": [
      {
        "itemTypeId": "uuid",
        "unitId": "uuid",
        "needed": "500.000",
        "pledged": "320.000",
        "received": "240.000",
        "reserved": "100.000",
        "distributed": "120.000",
        "lost": "0.000"
      }
    ]
  }
}
```

Không mặc định có PDF/Excel export trong MVP.

---

## 8.15 Admin

| ID | Method | Endpoint | Auth | DTO | Status |
|---|---|---|---|---|---|
| ADM-01 | GET | `/api/admin/organizations/pending` | ADMIN | `PaginationDto` | `SCAFFOLDED` |
| ADM-02 | PATCH | `/api/admin/organizations/:id/review` | ADMIN | `ReviewOrganizationDto` | `SCAFFOLDED` |
| ADM-03 | GET | `/api/admin/users` | ADMIN | `PaginationDto` | `SCAFFOLDED` |
| ADM-04 | PATCH | `/api/admin/users/:id/active` | ADMIN | `SetUserActiveDto` | `SCAFFOLDED` |
| ADM-05 | GET | `/api/admin/events` | ADMIN | pagination/filter | `REQUIRED / TO IMPLEMENT` |
| ADM-06 | PATCH | `/api/admin/events/:id/status` | ADMIN | moderation DTO | `REQUIRED / TO IMPLEMENT` |

> `ADM-05/06` là target contract đề xuất vì FE có `/admin/events` và FR24 yêu cầu basic Event moderation, nhưng AdminController hiện tại chưa có route Event moderation.

### ADM-02 Review Organization

```json
{
  "status": "APPROVED"
}
```

Cho phép theo `OrgStatus` nhưng service nên kiểm tra transition hợp lý thay vì cho nhảy tùy ý.

### ADM-04 Toggle user

```json
{
  "isActive": false
}
```

---

## 8.16 Health

| ID | Method | Endpoint | Auth | Status |
|---|---|---|---|---|
| HLT-01 | GET | `/api/health/live` | Public | `IMPLEMENTED` |

Có thể thêm readiness endpoint sau nếu deployment cần, nhưng không bắt buộc theo contract hiện tại.

---

# 9. FE Route -> API Mapping

| FE page | API chính |
|---|---|
| `/events` | `GET /api/events`, catalog item types/units nếu filter cần |
| `/events/[id]` | `GET /api/events/:id`, `POST /api/volunteers/apply`, `POST /api/donations` |
| `/my/activities` | `GET /api/volunteers/my`, check-in/check-out |
| `/my/donations` | `GET /api/donations/my`, `POST /api/donations/:id/cancel` |
| `/track` | `GET /api/transparency/track/:trackingId` |
| `/organizer/events` | Event CRUD/status, catalogs |
| `/organizer/volunteers` | Event volunteers + review application |
| `/organizer/donations` | Event donations + receipt/reject |
| `/organizer/inventory` | Organization inventory |
| `/organizer/batches` | Batch list/create/detail/status/reconcile |
| `/organizer/trips` | Trip list/create/detail/status + distribution point/records |
| `/organizer/transparency` | Evidence list/review + timeline |
| `/admin/organizations` | Pending organizations + review |
| `/admin/users` | Admin users + active status |
| `/admin/events` | `ADM-05/06` – hiện còn thiếu BE route |

---

# 10. Business Rules bắt buộc ở Backend

## BR-01 Role model

- `SystemRole = USER | ADMIN`.
- `OrganizationRole = MEMBER | ORGANIZER`.
- `Volunteer/Donor` là participation type, không phải permanent role.

## BR-02 Organization scope

- Organizer chỉ thao tác dữ liệu thuộc Organization mà user là `ORGANIZER`.
- Organization phải `APPROVED` mới publish Event.

## BR-03 Event consistency

- Event lifecycle phải enforce transition.
- Draft mới physical delete.
- Published Event đã có application/donation/trip không physical delete.

## BR-04 Volunteer consistency

- Application phải tham chiếu VolunteerRole cùng Event.
- Một User tối đa một Application mỗi Event theo schema hiện tại.
- Trip chỉ assign Application `APPROVED` của cùng Event.

## BR-05 Donation tracking

- Tracking ID unique, random, non-sequential.
- DonationNeed là target, không phải hard cap.
- User có thể đồng thời volunteer và donate trong cùng Event.

## BR-06 Inventory conservation

```text
Received = Available + Reserved + Distributed + Lost
```

Các update liên quan phải atomic.

## BR-07 Batch

- Same Event + ItemType + Unit.
- Donation tối đa một Batch.
- Create Batch: `Available -> Reserved`.
- Assign Trip không reserve lần hai.

## BR-08 Trip

- Batch và volunteers phải cùng Event.
- Một Trip có một Leader theo MVP.
- Một Batch tối đa một active Trip assignment.
- Cancel Trip không đưa Reserved về Available.

## BR-09 Distribution

- `DistributionRecord = TripBatch + DistributionPoint + distributedQuantity`.
- Tổng distributed của Batch không vượt Batch quantity.
- Một Batch tại một Point tối đa một record theo schema hiện tại.

## BR-10 Evidence privacy

- `privacyConfirmed = true` trước upload metadata.
- Chỉ Organizer review public evidence.
- Chỉ `APPROVED` evidence được trả về public tracking.

## BR-11 Transparency

- Mọi mutation quan trọng tạo audit log.
- Public projection không lộ PII.

---

# 11. Các contract còn thiếu cần ưu tiên trước khi FE bỏ mock

## P0 – cần cho integration chính

1. `GET /api/users/memberships` hoặc contract tương đương để FE biết Organization context.
2. Catalog ItemType/Unit GET routes.
3. Evidence multipart/file upload + storage serving policy.
4. Admin Event moderation routes cho `/admin/events`.
5. Scope guard/service check cho Organizer và Trip Leader.
6. Domain service thật cho các route đang `SCAFFOLDED`.
7. Transaction + audit integration cho receipt, batch, trip, distribution, reconcile.

## P1 – cần chốt nhưng không nhất thiết block UI đầu tiên

1. Logout/session strategy.
2. Donation photo upload.
3. Point `DISTRIBUTED` gate khi có nhiều Batch.
4. Cancel Trip khi đã có DistributionRecord nhưng Point chưa terminal.
5. Reconcile là cumulative hay delta.
6. Retry/idempotency/concurrency behavior và error code cụ thể.
7. `area`/`category` mapping giữa FE mock và Event schema thật.

## Phase 2 / không bắt buộc MVP

- Advanced organization verification/eKYC.
- GPS/live tracking.
- Payments.
- AI/fraud detection.
- Blockchain.
- Report entity/PDF scheduler.
- IssueReport entity nếu chưa chốt scope.

---

# 12. Error code đề xuất

> Đây là naming proposal để FE xử lý ổn định; cần BE thống nhất trước khi freeze.

| Code | HTTP | Ý nghĩa |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | DTO/input sai |
| `INVALID_STATUS_TRANSITION` | 400 | Chuyển trạng thái không hợp lệ |
| `UNAUTHORIZED` | 401 | Chưa xác thực |
| `FORBIDDEN` | 403 | Không có quyền |
| `RESOURCE_NOT_FOUND` | 404 | Không tìm thấy entity |
| `DUPLICATE_RESOURCE` | 409 | Vi phạm unique/business duplicate |
| `ORGANIZATION_NOT_APPROVED` | 409 | Org chưa được publish Event |
| `VOLUNTEER_CAPACITY_FULL` | 409 | Role đã đủ số lượng nếu team enforce hard capacity |
| `DONATION_ALREADY_PROCESSED` | 409 | Receipt/reject bị gọi lặp |
| `INSUFFICIENT_AVAILABLE_STOCK` | 409 | Không đủ Available để tạo Batch |
| `DONATION_ALREADY_IN_BATCH` | 409 | Donation đã thuộc Batch |
| `BATCH_ALREADY_ASSIGNED` | 409 | Batch đang có active Trip assignment |
| `DISTRIBUTION_EXCEEDS_BATCH` | 409 | Tổng distributed vượt Batch quantity |
| `TRIP_CANNOT_BE_CANCELLED` | 409 | Trip đã có distribution không cho cancel |
| `TRIP_NOT_COMPLETABLE` | 409 | Chưa đủ Point terminal |
| `EVIDENCE_PRIVACY_NOT_CONFIRMED` | 400 | Chưa xác nhận privacy |

---

# 13. Decimal handling

Các quantity dùng Prisma `Decimal(14,3)`.

Khuyến nghị API trả quantity dạng **string decimal** để tránh lỗi floating point JavaScript:

```json
{
  "quantity": "50.000"
}
```

FE có thể parse để hiển thị nhưng không nên dùng binary float cho phép tính tài chính/stock quan trọng.

---

# 14. Security contract

- Password chỉ lưu hash; không bao giờ trả `passwordHash`.
- `donorId`, `confirmedById`, `uploadedById`, `reviewedById`, `actorId` lấy từ authenticated context, không tin client gửi.
- Public Tracking dùng projection riêng, không serialize nguyên Prisma entity graph.
- Pending/rejected Evidence không được public.
- Path UUID nên validate nhất quán (`ParseUUIDPipe` hoặc equivalent) trước khi freeze API.
- CORS chỉ cho phép FE origin được cấu hình ở môi trường deploy.

---

# 15. Transaction boundaries quan trọng

Các flow sau nên dùng Prisma transaction:

### Receipt donation

```text
Donation PENDING -> RECEIVED
+ Inventory received += qty
+ Inventory available += qty
+ TransparencyLog
```

### Create Batch

```text
validate donations
+ create Batch
+ attach Donations
+ Available -= qty
+ Reserved += qty
+ status updates
+ TransparencyLog
```

### Distribution

```text
validate TripBatch/Point
+ create/update DistributionRecord
+ Reserved -= distributed qty (theo workflow finalization đã chốt)
+ Distributed += qty
+ status/log updates
```

### Cancel Trip

```text
validate cancel allowed
+ Trip CANCELLED
+ TripBatch.unassignedAt
+ Batch ASSIGNED -> READY
+ Reserved unchanged
+ TransparencyLog
```

### Reconcile

```text
remaining/returned -> Available
lost -> Lost
reserved -> giảm tương ứng
+ Batch final state
+ TransparencyLog
```

> Chi tiết exact timing của stock khi ghi DistributionRecord vs khi finalize Point/Batch cần team thống nhất, nhưng conservation invariant luôn phải đúng.

---

# 16. API implementation priority theo Sprint/integration

## Phase A – Foundation

- Auth
- User profile
- Membership context
- Catalogs

## Phase B – Event + Volunteer

- Organizations
- Events
- Volunteer application/review/attendance

## Phase C – Donation + Inventory

- Donation create/my/event
- Receipt/reject
- Inventory

## Phase D – Batch + Trip

- Batch create/list/detail/status
- Trip create/list/detail/status

## Phase E – Distribution + Transparency

- DistributionRecord
- DistributionPoint status
- Evidence upload/review
- Timeline
- Public Tracking
- Dashboard

## Phase F – Admin + hardening

- Admin user/org
- Admin event moderation
- Error codes
- transactions/concurrency
- E2E contract tests

---

# 17. Contract test checklist

Trước khi bỏ mock FE, tối thiểu cần E2E test các flow:

1. Register -> Login -> Profile.
2. Admin approve Organization.
3. Organizer create/publish Event.
4. User apply Volunteer -> Organizer approve -> check-in/out.
5. User create Donation -> Tracking ID.
6. Organizer receive Donation -> Inventory tăng đúng.
7. Create Batch -> Available giảm, Reserved tăng.
8. Create Trip -> Batch assignment không thay stock.
9. Trip status + Point status đúng transition.
10. Create DistributionRecord -> không vượt Batch quantity.
11. Evidence privacy + Organizer approval.
12. Public Tracking chỉ trả approved evidence, không PII.
13. Cancel Trip -> Batch Ready, stock vẫn Reserved.
14. Reconcile -> Inventory conservation đúng.
15. Dashboard query khớp dữ liệu workflow.

---

# 18. FE integration checklist

Khi chuyển từ mock service sang API thật:

- Giữ component/UI hiện tại.
- Thay mock service bằng HTTP service theo contract này.
- Không gửi mock label thay UUID.
- Không dựa vào role `DONOR`/`VOLUNTEER`.
- Một USER truy cập được cả `/my/activities` và `/my/donations`.
- Map status enum sang i18n ở UI, không dịch value enum trong API/DB.
- Handle `401`, `403`, `404`, `409` riêng.
- Sau mutation thành công, re-fetch/invalidate cache thay vì tự sửa số liệu không kiểm chứng.

---

# 19. Những điểm chưa được coi là đã chốt

Các điểm sau vẫn cần quyết định kỹ thuật trước khi gọi contract là “frozen”:

1. Logout/refresh/revoke strategy.
2. Public/private file storage và signed/public URL.
3. Exact evidence gate để Point/Trip/Batch hoàn tất.
4. Point có nhiều Batch: khi nào chuyển `DISTRIBUTED`.
5. Cancel khi đã có record thực tế.
6. Reconcile cumulative hay delta.
7. Retry/idempotency/concurrency policy.
8. `area/category/contactEmail/image` từ FE mock map thế nào với schema thật.
9. Tracking ID prefix/collision retry convention.
10. Các undo/reopen/resubmit workflow ngoài happy path.

---

# 20. Definition of Done cho API Contract

API được coi là ready cho FE integration khi:

- Route không còn trả `501`.
- DTO validation khớp contract.
- Scope authorization được enforce ở backend.
- Response schema ổn định.
- Error code ổn định.
- Swagger phản ánh đúng request/response/status code.
- E2E test happy path + major failure path pass.
- Audit/stock transaction pass consistency test.
- Public endpoint không lộ PII.

---

# 21. Nguồn tài liệu dùng để lập contract

- OpenAid Project Proposal bản cuối.
- `schema.prisma` hiện tại: 20 model, 12 enum.
- Cấu trúc Backend `OpenAid_BE` với 16 module nghiệp vụ/hệ thống.
- `09-api-traceability-and-decisions.md` – route decorator, DTO registry, implementation status, unresolved decisions.
- FE route hiện tại:
  - `/events`
  - `/events/[id]`
  - `/my/activities`
  - `/my/donations`
  - `/track`
  - `/organizer/events`
  - `/organizer/volunteers`
  - `/organizer/donations`
  - `/organizer/inventory`
  - `/organizer/batches`
  - `/organizer/trips`
  - `/organizer/transparency`
  - `/admin/organizations`
  - `/admin/users`
  - `/admin/events`

---

## Kết luận

File này nên được đặt tại:

```text
OpenAid_BE/docs/api/API_CONTRACT.md
```

Trong quá trình code, **không sửa API tùy ý ở FE hoặc BE**. Nếu contract cần thay đổi, cập nhật file này trong cùng Pull Request với source code liên quan để FE/BE luôn đồng bộ.
