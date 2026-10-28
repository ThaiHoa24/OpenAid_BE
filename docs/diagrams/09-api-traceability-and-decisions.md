# 09 API, traceability và các điểm cần chốt

Tài liệu này nối các use case với yêu cầu và route thực tế, đồng thời ghi rõ các chi tiết chưa thể coi là đã chốt. Không sửa source API hoặc schema trong lần soạn bộ sơ đồ này. Mọi endpoint liệt kê là decorator hiện có; các endpoint đề xuất/chưa có được tách ở cuối.

## Ma trận functional requirements

| FR   | Nội dung theo proposal                               | Use case                   | Module/entity chính                      | Hình cần phản ánh và hiện trạng                                                       |
| ---- | ---------------------------------------------------- | -------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------- |
| FR01 | Register/login/logout, hash password                 | UC01–03                    | auth/User                                | Context, UC, SEQ01–02; register/login có code, logout BE chưa có route                |
| FR02 | Profile management                                   | UC04                       | users/User                               | UC, component, SEQ02; logic hiện có                                                   |
| FR03 | USER/ADMIN và org-scoped MEMBER/ORGANIZER            | UC06 và mọi UC được bảo vệ | auth/organizations/TripVolunteer         | Actor hierarchy, scope notes, sequences; global guard/helper có, domain calls còn chờ |
| FR04 | Organization create/enable/disable                   | UC05–07                    | Organization/OrganizationMember          | UC, B01, SEQ03; KHUNG                                                                 |
| FR05 | Event lifecycle, chỉ approved Org publish            | UC08/11                    | Event                                    | UC, state, SEQ03; KHUNG                                                               |
| FR06 | Volunteer roles và donation needs chuẩn              | UC09/10                    | VolunteerRole/DonationNeed/ItemType/Unit | ERD, B01, DTO; KHUNG, catalog route chưa có                                           |
| FR07 | Discovery, search/filter                             | UC12                       | events                                   | Context, UC, DFD P2; KHUNG                                                            |
| FR08 | Role application                                     | UC13                       | VolunteerApplication                     | UC, B02, SEQ04; KHUNG                                                                 |
| FR09 | Application approval/rejection                       | UC14                       | volunteers                               | UC, B02, SEQ04; KHUNG                                                                 |
| FR10 | My Activities                                        | UC15                       | volunteers                               | UC, DFD P2, scoped query; KHUNG                                                       |
| FR11 | Attendance                                           | UC16                       | VolunteerAttendance                      | B02/state/SEQ04; button đủ cho MVP, QR optional                                       |
| FR12 | Donation + unique random Tracking ID, target warning | UC17/21/42                 | Donation/DonationNeed                    | B03, SEQ05; KHUNG, helper ID có nhưng chưa được workflow gọi                          |
| FR13 | My Donations                                         | UC18                       | donations                                | UC, DFD P3; KHUNG                                                                     |
| FR14 | Confirm received hoặc reject                         | UC19/20                    | Donation                                 | B03, SEQ06; KHUNG                                                                     |
| FR15 | Available/Reserved/Distributed/Lost và returns       | UC22/25/43                 | Inventory                                | ERD/stock table/SEQ06–07/09/13; schema + SQL constraints có                           |
| FR16 | Whole donations cùng Event/type/unit vào Batch       | UC23/24                    | Batch/Donation                           | ERD, B03, SEQ07; KHUNG                                                                |
| FR17 | Trip một Event, volunteers/batches/ordered points    | UC26–29                    | Trip/TripVolunteer/TripBatch/Point       | ERD, B04, SEQ08; KHUNG                                                                |
| FR18 | Trip/Point transitions, complete/cancel guards       | UC30–32                    | Trip/Point/TripBatch                     | State, B04, SEQ09–10/13; cần C04–C07                                                  |
| FR19 | Quantity mỗi Batch/Point, evidence, reconcile        | UC25/33/34                 | DistributionRecord/Evidence              | ERD, SEQ09/11/13; KHUNG                                                               |
| FR20 | Automatic time/actor/old/new/evidence audit          | UC44 và các mutation       | TransparencyLog                          | DFD D6, transaction sequences; append(tx) có nhưng chưa gọi trong workflows           |
| FR21 | Chronological timeline                               | UC36                       | transparency                             | B03, SEQ12; KHUNG                                                                     |
| FR22 | Public Tracking không PII, chỉ approved evidence     | UC37                       | transparency/Evidence                    | Context, public boundary, SEQ12; KHUNG                                                |
| FR23 | Basic Dashboard và final summary bằng query          | UC38                       | dashboard                                | DFD P6, SEQ13; KHUNG, không Report entity                                             |
| FR24 | User/Org/Event administration và moderation cơ bản   | UC07/39–41                 | admin                                    | UC, component; User/Org route có, Event moderation chưa có                            |
| FR25 | File size/format/privacy/review                      | UC34/35/45                 | evidence/storage                         | Storage boundary, ERD, SEQ11; interface/policy có, upload adapter chưa có             |
| FR26 | Errors và logging                                    | Xuyên suốt                 | common filters/interceptors              | HTTP pipeline; cơ chế chung có, domain errors còn chờ                                 |

## Ma trận non-functional requirements

| NFR   | Mục tiêu proposal                                     | Cách đưa vào sơ đồ/thiết kế                                        | Điều chưa thể kết luận                                  |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| NFR01 | API thông thường <3 giây trên staging/demo với seed   | Gắn note performance trên API; scoped queries, indexes, pagination | Chưa có benchmark end-to-end                            |
| NFR02 | JWT/hash/RBAC/input validation                        | Pipeline, trust boundary, SEQ01/02                                 | Organization/Leader rules chưa được gọi trong workflow  |
| NFR03 | Public data không PII, ảnh qua privacy/review         | Public projection + controlled file access                         | Private storage/serving chưa chọn                       |
| NFR04 | Responsive; tác vụ chính ≤5 bước từ home              | Liên hệ UC với Web pages, activity lanes                           | Cần đánh giá UI; không suy từ BE tests                  |
| NFR05 | Conservation và valid transitions                     | ERD constraints + transaction/state diagrams                       | Cross-row/concurrency/state guards chưa làm             |
| NFR06 | Status changes có audit đủ actor/time/old/new         | Audit lifeline trong transaction                                   | Các service chưa append log                             |
| NFR07 | Modular Monolith, module boundaries                   | Một API process, 16 module, repository boundaries                  | Không mô tả thành microservices                         |
| NFR08 | Error handling, seed restore, demo không chỉnh DB tay | Error branches, deployment seed, full demo activity                | Seed hiện chỉ foundation, chưa đủ full demo             |
| NFR09 | Docker frontend/backend/database                      | Deployment hiện tại và target                                      | Compose BE mới có backend/db; FE container chưa có      |
| NFR10 | Swagger và tài liệu kỹ thuật                          | /api/docs và bộ tài liệu này                                       | Tài liệu/API schema chưa chứng minh workflow hoàn chỉnh |

## Tên gọi thống nhất khi vẽ

| Business/proposal            | Backend hiện tại                              | Frontend prototype cần map                                          |
| ---------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| Account                      | User.fullName, phoneNumber, isActive          | User.name, phone, status ACTIVE/DISABLED; có bio ở mock, BE chưa có |
| Organization active/disabled | OrgStatus PENDING/APPROVED/REJECTED/SUSPENDED | Prototype PENDING/APPROVED/DISABLED; cần map chính sách             |
| Event contact                | contactName/contactPhone                      | contactPerson/contactPhone/contactEmail; vài trường FE chưa có BE   |
| Volunteer need               | VolunteerRole.quantity                        | requiredQuantity; approvedQuantity là giá trị tính ở UI/mock        |
| Volunteer attendance         | VolunteerAttendance riêng                     | Một số trường attendance nằm trực tiếp trên Application mock        |
| Goods and unit               | ItemType/Unit có id, code, name               | Prototype có nhãn type/unit; phải map sang ID khi gọi API           |
| Donation Batch               | Batch                                         | Không tạo thêm DonationBatch entity trùng                           |
| Inventory Item               | Inventory                                     | Theo Event/type/unit, tổng Organization là aggregate                |
| Distribution Trip            | Trip                                          | Batches/volunteers/points qua bảng liên kết                         |
| Batch items                  | Donation.batchId                              | Không có BatchItem riêng, không splitting                           |
| Summary report               | Dashboard query result                        | Không INSERT Report entity                                          |
| Image verification           | Evidence.reviewStatus                         | Duyệt hiển thị, không chứng minh nội dung ảnh thật                  |

Không dùng model mock làm nguồn chính cho ERD vật lý. Không gửi nhãn type/unit hoặc userId từ mock thay UUID DB chỉ vì màn hình đã hiển thị được.

## Toàn bộ route hiện có

Bảng trích từ decorator controller, prefix /api. Public không yêu cầu JWT; route khác chịu global JWT guard. Với domain scaffold, auth/validation có thể trả lỗi trước 501. JWT không tự bảo đảm quyền Organizer/Leader. Path param hiện chưa có ParseUUIDPipe chung; các IsUUID nêu ở DTO là validation body/query.

| Module        | Method/path                                     | Quyền hiện tại               | DTO Body/Query                   | Service method           | Trạng thái                      |
| ------------- | ----------------------------------------------- | ---------------------------- | -------------------------------- | ------------------------ | ------------------------------- |
| admin         | GET /api/admin/organizations/pending            | SystemRole.ADMIN             | Query: PaginationDto             | getPendingOrganizations  | KHUNG: 501 sau guard/validation |
| admin         | PATCH /api/admin/organizations/:id/review       | SystemRole.ADMIN             | Body: ReviewOrganizationDto      | reviewOrganization       | KHUNG: 501 sau guard/validation |
| admin         | GET /api/admin/users                            | SystemRole.ADMIN             | Query: PaginationDto             | getAllUsers              | KHUNG: 501 sau guard/validation |
| admin         | PATCH /api/admin/users/:id/active               | SystemRole.ADMIN             | Body: SetUserActiveDto           | toggleUserActive         | KHUNG: 501 sau guard/validation |
| auth          | POST /api/auth/register                         | Public                       | Body: RegisterDto                | register                 | Logic hiện có                   |
| auth          | POST /api/auth/login                            | Public                       | Body: LoginDto                   | login                    | Logic hiện có                   |
| batches       | POST /api/batches                               | JWT; scope nghiệp vụ còn chờ | Body: CreateBatchDto             | createBatch              | KHUNG: 501 sau guard/validation |
| batches       | GET /api/batches/event/:eventId                 | JWT; scope nghiệp vụ còn chờ | —                                | getBatchesByEvent        | KHUNG: 501 sau guard/validation |
| batches       | GET /api/batches/:id                            | JWT; scope nghiệp vụ còn chờ | —                                | getBatchById             | KHUNG: 501 sau guard/validation |
| batches       | PATCH /api/batches/:id/status                   | JWT; scope nghiệp vụ còn chờ | Body: UpdateBatchDto             | updateBatch              | KHUNG: 501 sau guard/validation |
| batches       | POST /api/batches/:id/reconcile                 | JWT; scope nghiệp vụ còn chờ | Body: ReconcileBatchDto          | reconcileBatch           | KHUNG: 501 sau guard/validation |
| dashboard     | GET /api/dashboard/events/:eventId              | JWT; scope nghiệp vụ còn chờ | —                                | getOverviewStats         | KHUNG: 501 sau guard/validation |
| distribution  | POST /api/distribution/records                  | JWT; scope nghiệp vụ còn chờ | Body: CreateDistributionDto      | createDistribution       | KHUNG: 501 sau guard/validation |
| distribution  | GET /api/distribution/records/:id               | JWT; scope nghiệp vụ còn chờ | —                                | getDistributionById      | KHUNG: 501 sau guard/validation |
| distribution  | GET /api/distribution/trip/:tripId              | JWT; scope nghiệp vụ còn chờ | —                                | getDistributionsByTrip   | KHUNG: 501 sau guard/validation |
| distribution  | PATCH /api/distribution/points/:id/status       | JWT; scope nghiệp vụ còn chờ | Body: UpdateDistributionPointDto | updatePoint              | KHUNG: 501 sau guard/validation |
| donations     | POST /api/donations                             | JWT; scope nghiệp vụ còn chờ | Body: CreateDonationDto          | createDonation           | KHUNG: 501 sau guard/validation |
| donations     | GET /api/donations/my                           | JWT; scope nghiệp vụ còn chờ | Query: PaginationDto             | getMyDonations           | KHUNG: 501 sau guard/validation |
| donations     | GET /api/donations/event/:eventId               | JWT; scope nghiệp vụ còn chờ | Query: PaginationDto             | getEventDonations        | KHUNG: 501 sau guard/validation |
| donations     | PATCH /api/donations/:id/receipt                | JWT; scope nghiệp vụ còn chờ | Body: ReceiveDonationDto         | receiveDonation          | KHUNG: 501 sau guard/validation |
| donations     | POST /api/donations/:id/cancel                  | JWT; scope nghiệp vụ còn chờ | —                                | cancelDonation           | KHUNG: 501 sau guard/validation |
| events        | GET /api/events                                 | Public                       | Query: EventQueryDto             | getAllEvents             | KHUNG: 501 sau guard/validation |
| events        | GET /api/events/:id                             | Public                       | —                                | getEventById             | KHUNG: 501 sau guard/validation |
| events        | POST /api/events                                | JWT; scope nghiệp vụ còn chờ | Body: CreateEventDto             | createEvent              | KHUNG: 501 sau guard/validation |
| events        | PATCH /api/events/:id                           | JWT; scope nghiệp vụ còn chờ | Body: UpdateEventDto             | updateEvent              | KHUNG: 501 sau guard/validation |
| events        | PATCH /api/events/:id/status                    | JWT; scope nghiệp vụ còn chờ | Body: ChangeEventStatusDto       | changeStatus             | KHUNG: 501 sau guard/validation |
| events        | DELETE /api/events/:id                          | JWT; scope nghiệp vụ còn chờ | —                                | deleteDraft              | KHUNG: 501 sau guard/validation |
| evidence      | POST /api/evidence                              | JWT; scope nghiệp vụ còn chờ | Body: CreateEvidenceDto          | createEvidence           | KHUNG: 501 sau guard/validation |
| evidence      | GET /api/evidence/trip/:tripId                  | JWT; scope nghiệp vụ còn chờ | —                                | getEvidenceByTrip        | KHUNG: 501 sau guard/validation |
| evidence      | PATCH /api/evidence/:id/review                  | JWT; scope nghiệp vụ còn chờ | Body: ReviewEvidenceDto          | reviewEvidence           | KHUNG: 501 sau guard/validation |
| health        | GET /api/health/live                            | Public                       | —                                | inline                   | Logic hiện có                   |
| inventory     | GET /api/inventory/organization/:organizationId | JWT; scope nghiệp vụ còn chờ | Query: InventoryQueryDto         | getOrganizationInventory | KHUNG: 501 sau guard/validation |
| organizations | GET /api/organizations                          | Public                       | Query: PaginationDto             | getAllOrganizations      | KHUNG: 501 sau guard/validation |
| organizations | GET /api/organizations/:id                      | Public                       | —                                | getOrganizationById      | KHUNG: 501 sau guard/validation |
| organizations | POST /api/organizations                         | JWT; scope nghiệp vụ còn chờ | Body: CreateOrganizationDto      | createOrganization       | KHUNG: 501 sau guard/validation |
| organizations | PATCH /api/organizations/:id                    | JWT; scope nghiệp vụ còn chờ | Body: UpdateOrganizationDto      | updateOrganization       | KHUNG: 501 sau guard/validation |
| organizations | POST /api/organizations/:id/members             | JWT; scope nghiệp vụ còn chờ | Body: AddOrganizationMemberDto   | addMember                | KHUNG: 501 sau guard/validation |
| transparency  | GET /api/transparency/track/:trackingId         | Public                       | —                                | searchByTrackingId       | KHUNG: 501 sau guard/validation |
| transparency  | GET /api/transparency/timeline                  | JWT; scope nghiệp vụ còn chờ | Query: TimelineQueryDto          | getTimeline              | KHUNG: 501 sau guard/validation |
| transparency  | GET /api/transparency/logs                      | SystemRole.ADMIN             | Query: PaginationDto             | getRecentAuditLogs       | KHUNG: 501 sau guard/validation |
| trips         | GET /api/trips/event/:eventId                   | JWT; scope nghiệp vụ còn chờ | Query: PaginationDto             | getTripsByEvent          | KHUNG: 501 sau guard/validation |
| trips         | GET /api/trips/:id                              | JWT; scope nghiệp vụ còn chờ | —                                | getTripById              | KHUNG: 501 sau guard/validation |
| trips         | POST /api/trips                                 | JWT; scope nghiệp vụ còn chờ | Body: CreateTripDto              | createTrip               | KHUNG: 501 sau guard/validation |
| trips         | PATCH /api/trips/:id/status                     | JWT; scope nghiệp vụ còn chờ | Body: UpdateTripDto              | updateTrip               | KHUNG: 501 sau guard/validation |
| users         | GET /api/users/profile                          | JWT; current user id         | —                                | getProfile               | Logic hiện có                   |
| users         | PATCH /api/users/profile                        | JWT; current user id         | Body: UpdateUserDto              | updateProfile            | Logic hiện có                   |
| volunteers    | POST /api/volunteers/apply                      | JWT; scope nghiệp vụ còn chờ | Body: CreateVolunteerDto         | registerVolunteer        | KHUNG: 501 sau guard/validation |
| volunteers    | GET /api/volunteers/my                          | JWT; scope nghiệp vụ còn chờ | —                                | getMyApplications        | KHUNG: 501 sau guard/validation |
| volunteers    | GET /api/volunteers/event/:eventId              | JWT; scope nghiệp vụ còn chờ | —                                | getEventVolunteers       | KHUNG: 501 sau guard/validation |
| volunteers    | PATCH /api/volunteers/:id/review                | JWT; scope nghiệp vụ còn chờ | Body: ReviewVolunteerDto         | reviewApplication        | KHUNG: 501 sau guard/validation |
| volunteers    | POST /api/volunteers/:id/check-in               | JWT; scope nghiệp vụ còn chờ | —                                | checkIn                  | KHUNG: 501 sau guard/validation |
| volunteers    | POST /api/volunteers/:id/check-out              | JWT; scope nghiệp vụ còn chờ | —                                | checkOut                 | KHUNG: 501 sau guard/validation |

## DTO registry hiện có

Field và validator là hợp đồng khung, không thay kiểm tra quyền, quan hệ, trạng thái, tổng số lượng hoặc các điều kiện tương tác nhiều field. Mapped DTO kế thừa được ghi rõ.

### PaginationDto

Nguồn: [src/common/dto/pagination.dto.ts](../../src/common/dto/pagination.dto.ts).

| Trường | Type | Validator/transform                                     | Default |
| ------ | ---- | ------------------------------------------------------- | ------- |
| skip   | ?    | IsOptional; Type(() => Number); IsInt; Min(0)           | 0       |
| take   | ?    | IsOptional; Type(() => Number); IsInt; Min(1); Max(100) | 20      |

### ReviewOrganizationDto

Nguồn: [src/modules/admin/dto/index.ts](../../src/modules/admin/dto/index.ts).

| Trường | Type      | Validator/transform | Default |
| ------ | --------- | ------------------- | ------- |
| status | OrgStatus | IsEnum(OrgStatus)   | —       |

### SetUserActiveDto

Nguồn: [src/modules/admin/dto/index.ts](../../src/modules/admin/dto/index.ts).

| Trường   | Type    | Validator/transform | Default |
| -------- | ------- | ------------------- | ------- |
| isActive | boolean | IsBoolean           | —       |

### LoginDto

Nguồn: [src/modules/auth/dto/index.ts](../../src/modules/auth/dto/index.ts).

| Trường   | Type   | Validator/transform                                                                       | Default |
| -------- | ------ | ----------------------------------------------------------------------------------------- | ------- |
| email    | string | IsEmail({}, { message: 'Invalid email format' }); IsNotEmpty                              | —       |
| password | string | IsString; MinLength(6, { message: 'Password must be at least 6 characters' }); IsNotEmpty | —       |

### RegisterDto

Nguồn: [src/modules/auth/dto/index.ts](../../src/modules/auth/dto/index.ts).

| Trường       | Type   | Validator/transform                                                                       | Default |
| ------------ | ------ | ----------------------------------------------------------------------------------------- | ------- |
| email        | string | IsEmail({}, { message: 'Invalid email format' }); IsNotEmpty                              | —       |
| fullName     | string | IsString; IsNotEmpty                                                                      | —       |
| password     | string | IsString; MinLength(6, { message: 'Password must be at least 6 characters' }); IsNotEmpty | —       |
| phoneNumber? | string | IsOptional; IsString                                                                      | —       |

### CreateBatchDto

Nguồn: [src/modules/batches/dto/index.ts](../../src/modules/batches/dto/index.ts).

| Trường      | Type     | Validator/transform                                                | Default |
| ----------- | -------- | ------------------------------------------------------------------ | ------- |
| eventId     | string   | IsUUID                                                             | —       |
| donationIds | string[] | IsArray; ArrayNotEmpty; ArrayUnique; IsUUID('all', { each: true }) | —       |

### UpdateBatchDto

Nguồn: [src/modules/batches/dto/index.ts](../../src/modules/batches/dto/index.ts).

| Trường | Type        | Validator/transform       | Default |
| ------ | ----------- | ------------------------- | ------- |
| status | BatchStatus | IsIn([BatchStatus.READY]) | —       |

### ReconcileBatchDto

Nguồn: [src/modules/batches/dto/index.ts](../../src/modules/batches/dto/index.ts).

| Trường           | Type   | Validator/transform                       | Default |
| ---------------- | ------ | ----------------------------------------- | ------- |
| returnedQuantity | number | IsNumber({ maxDecimalPlaces: 3 }); Min(0) | —       |
| lostQuantity     | number | IsNumber({ maxDecimalPlaces: 3 }); Min(0) | —       |
| note             | string | IsString; IsNotEmpty                      | —       |

### CreateDistributionDto

Nguồn: [src/modules/distribution/dto/index.ts](../../src/modules/distribution/dto/index.ts).

| Trường              | Type   | Validator/transform                           | Default |
| ------------------- | ------ | --------------------------------------------- | ------- |
| tripBatchId         | string | IsUUID                                        | —       |
| distributionPointId | string | IsUUID                                        | —       |
| distributedQuantity | number | IsNumber({ maxDecimalPlaces: 3 }); Min(0.001) | —       |
| beneficiaryCount?   | number | IsOptional; IsInt; Min(0)                     | —       |
| notes?              | string | IsOptional; IsString                          | —       |

### UpdateDistributionPointDto

Nguồn: [src/modules/distribution/dto/index.ts](../../src/modules/distribution/dto/index.ts).

| Trường         | Type                    | Validator/transform              | Default |
| -------------- | ----------------------- | -------------------------------- | ------- |
| status         | DistributionPointStatus | IsEnum(DistributionPointStatus)  | —       |
| skippedReason? | string                  | IsOptional; IsString; IsNotEmpty | —       |

### CreateDonationDto

Nguồn: [src/modules/donations/dto/index.ts](../../src/modules/donations/dto/index.ts).

| Trường         | Type   | Validator/transform                           | Default |
| -------------- | ------ | --------------------------------------------- | ------- |
| donationNeedId | string | IsUUID                                        | —       |
| quantity       | number | IsNumber({ maxDecimalPlaces: 3 }); Min(0.001) | —       |

### ReceiveDonationDto

Nguồn: [src/modules/donations/dto/index.ts](../../src/modules/donations/dto/index.ts).

| Trường           | Type           | Validator/transform                                      | Default |
| ---------------- | -------------- | -------------------------------------------------------- | ------- |
| status           | DonationStatus | IsIn([DonationStatus.RECEIVED, DonationStatus.REJECTED]) | —       |
| rejectionReason? | string         | IsOptional; IsString                                     | —       |

### VolunteerRoleInputDto

Nguồn: [src/modules/events/dto/index.ts](../../src/modules/events/dto/index.ts).

| Trường       | Type   | Validator/transform  | Default |
| ------------ | ------ | -------------------- | ------- |
| name         | string | IsString; IsNotEmpty | —       |
| quantity     | number | IsInt; Min(1)        | —       |
| description? | string | IsOptional; IsString | —       |

### DonationNeedInputDto

Nguồn: [src/modules/events/dto/index.ts](../../src/modules/events/dto/index.ts).

| Trường         | Type   | Validator/transform                           | Default |
| -------------- | ------ | --------------------------------------------- | ------- |
| itemTypeId     | string | IsUUID                                        | —       |
| unitId         | string | IsUUID                                        | —       |
| targetQuantity | number | IsNumber({ maxDecimalPlaces: 3 }); Min(0.001) | —       |

### CreateEventDto

Nguồn: [src/modules/events/dto/index.ts](../../src/modules/events/dto/index.ts).

| Trường          | Type                    | Validator/transform                                                                    | Default |
| --------------- | ----------------------- | -------------------------------------------------------------------------------------- | ------- |
| organizationId  | string                  | IsUUID                                                                                 | —       |
| title           | string                  | IsString; IsNotEmpty; MaxLength(200)                                                   | —       |
| description?    | string                  | IsOptional; IsString                                                                   | —       |
| location        | string                  | IsString; IsNotEmpty                                                                   | —       |
| contactName     | string                  | IsString; IsNotEmpty                                                                   | —       |
| contactPhone?   | string                  | IsOptional; IsString                                                                   | —       |
| startDate       | string                  | IsDateString                                                                           | —       |
| endDate?        | string                  | IsOptional; IsDateString                                                               | —       |
| volunteerRoles? | VolunteerRoleInputDto[] | IsOptional; IsArray; ValidateNested({ each: true }); Type(() => VolunteerRoleInputDto) | —       |
| donationNeeds?  | DonationNeedInputDto[]  | IsOptional; IsArray; ValidateNested({ each: true }); Type(() => DonationNeedInputDto)  | —       |

### UpdateEventDto

Nguồn: [src/modules/events/dto/index.ts](../../src/modules/events/dto/index.ts). Kế thừa: extends PartialType( OmitType(CreateEventDto, ['organizationId'] as const), ).

Dùng các mapped field từ lớp cha, không khai báo thêm.

### EventQueryDto

Nguồn: [src/modules/events/dto/index.ts](../../src/modules/events/dto/index.ts). Kế thừa: extends PaginationDto.

| Trường      | Type   | Validator/transform      | Default |
| ----------- | ------ | ------------------------ | ------- |
| search?     | string | IsOptional; IsString     | —       |
| area?       | string | IsOptional; IsString     | —       |
| from?       | string | IsOptional; IsDateString | —       |
| to?         | string | IsOptional; IsDateString | —       |
| itemTypeId? | string | IsOptional; IsUUID       | —       |

### ChangeEventStatusDto

Nguồn: [src/modules/events/dto/index.ts](../../src/modules/events/dto/index.ts).

| Trường | Type        | Validator/transform | Default |
| ------ | ----------- | ------------------- | ------- |
| status | EventStatus | IsEnum(EventStatus) | —       |

### CreateEvidenceDto

Nguồn: [src/modules/evidence/dto/index.ts](../../src/modules/evidence/dto/index.ts).

| Trường                | Type    | Validator/transform  | Default |
| --------------------- | ------- | -------------------- | ------- |
| tripId                | string  | IsUUID               | —       |
| distributionPointId   | string  | IsUUID               | —       |
| distributionRecordId? | string  | IsOptional; IsUUID   | —       |
| privacyConfirmed      | boolean | Equals(true)         | —       |
| caption?              | string  | IsOptional; IsString | —       |

### ReviewEvidenceDto

Nguồn: [src/modules/evidence/dto/index.ts](../../src/modules/evidence/dto/index.ts).

| Trường | Type                 | Validator/transform                                                  | Default |
| ------ | -------------------- | -------------------------------------------------------------------- | ------- |
| status | EvidenceReviewStatus | IsIn([EvidenceReviewStatus.APPROVED, EvidenceReviewStatus.REJECTED]) | —       |
| note?  | string               | IsOptional; IsString                                                 | —       |

### InventoryQueryDto

Nguồn: [src/modules/inventory/dto/index.ts](../../src/modules/inventory/dto/index.ts). Kế thừa: extends PaginationDto.

| Trường   | Type   | Validator/transform | Default |
| -------- | ------ | ------------------- | ------- |
| eventId? | string | IsOptional; IsUUID  | —       |

### CreateOrganizationDto

Nguồn: [src/modules/organizations/dto/index.ts](../../src/modules/organizations/dto/index.ts).

| Trường       | Type   | Validator/transform  | Default |
| ------------ | ------ | -------------------- | ------- |
| name         | string | IsString; IsNotEmpty | —       |
| code         | string | IsString; IsNotEmpty | —       |
| description? | string | IsOptional; IsString | —       |
| email        | string | IsEmail              | —       |
| phoneNumber? | string | IsOptional; IsString | —       |
| address?     | string | IsOptional; IsString | —       |

### UpdateOrganizationDto

Nguồn: [src/modules/organizations/dto/index.ts](../../src/modules/organizations/dto/index.ts).

| Trường       | Type   | Validator/transform  | Default |
| ------------ | ------ | -------------------- | ------- |
| name?        | string | IsOptional; IsString | —       |
| description? | string | IsOptional; IsString | —       |
| phoneNumber? | string | IsOptional; IsString | —       |
| address?     | string | IsOptional; IsString | —       |

### AddOrganizationMemberDto

Nguồn: [src/modules/organizations/dto/organization-member.dto.ts](../../src/modules/organizations/dto/organization-member.dto.ts).

| Trường | Type             | Validator/transform      | Default |
| ------ | ---------------- | ------------------------ | ------- |
| userId | string           | IsUUID                   | —       |
| role   | OrganizationRole | IsEnum(OrganizationRole) | —       |

### TimelineQueryDto

Nguồn: [src/modules/transparency/dto/index.ts](../../src/modules/transparency/dto/index.ts).

| Trường     | Type                   | Validator/transform            | Default |
| ---------- | ---------------------- | ------------------------------ | ------- |
| entityType | TransparencyEntityType | IsEnum(TransparencyEntityType) | —       |
| entityId   | string                 | IsString                       | —       |

### TripVolunteerInputDto

Nguồn: [src/modules/trips/dto/index.ts](../../src/modules/trips/dto/index.ts).

| Trường        | Type              | Validator/transform       | Default |
| ------------- | ----------------- | ------------------------- | ------- |
| applicationId | string            | IsUUID                    | —       |
| role          | TripVolunteerRole | IsEnum(TripVolunteerRole) | —       |

### DistributionPointInputDto

Nguồn: [src/modules/trips/dto/index.ts](../../src/modules/trips/dto/index.ts).

| Trường   | Type   | Validator/transform  | Default |
| -------- | ------ | -------------------- | ------- |
| position | number | IsInt; Min(1)        | —       |
| name     | string | IsString; IsNotEmpty | —       |
| location | string | IsString; IsNotEmpty | —       |
| mapUrl?  | string | IsOptional; IsUrl    | —       |

### CreateTripDto

Nguồn: [src/modules/trips/dto/index.ts](../../src/modules/trips/dto/index.ts).

| Trường         | Type                        | Validator/transform                                                                           | Default |
| -------------- | --------------------------- | --------------------------------------------------------------------------------------------- | ------- |
| eventId        | string                      | IsUUID                                                                                        | —       |
| departurePoint | string                      | IsString; IsNotEmpty                                                                          | —       |
| departureDate  | string                      | IsDateString                                                                                  | —       |
| vehicle?       | string                      | IsOptional; IsString                                                                          | —       |
| batchIds       | string[]                    | IsArray; ArrayNotEmpty; ArrayUnique; IsUUID('all', { each: true })                            | —       |
| volunteers     | TripVolunteerInputDto[]     | IsArray; ArrayNotEmpty; ValidateNested({ each: true }); Type(() => TripVolunteerInputDto)     | —       |
| points         | DistributionPointInputDto[] | IsArray; ArrayNotEmpty; ValidateNested({ each: true }); Type(() => DistributionPointInputDto) | —       |

### UpdateTripDto

Nguồn: [src/modules/trips/dto/index.ts](../../src/modules/trips/dto/index.ts).

| Trường | Type       | Validator/transform | Default |
| ------ | ---------- | ------------------- | ------- |
| status | TripStatus | IsEnum(TripStatus)  | —       |

### UpdateUserDto

Nguồn: [src/modules/users/dto/index.ts](../../src/modules/users/dto/index.ts).

| Trường       | Type   | Validator/transform  | Default |
| ------------ | ------ | -------------------- | ------- |
| fullName?    | string | IsOptional; IsString | —       |
| phoneNumber? | string | IsOptional; IsString | —       |
| avatarUrl?   | string | IsOptional; IsUrl    | —       |

### CreateVolunteerDto

Nguồn: [src/modules/volunteers/dto/index.ts](../../src/modules/volunteers/dto/index.ts).

| Trường          | Type   | Validator/transform  | Default |
| --------------- | ------ | -------------------- | ------- |
| eventId         | string | IsUUID               | —       |
| volunteerRoleId | string | IsUUID               | —       |
| notes?          | string | IsOptional; IsString | —       |

### ReviewVolunteerDto

Nguồn: [src/modules/volunteers/dto/index.ts](../../src/modules/volunteers/dto/index.ts).

| Trường | Type                       | Validator/transform                                                                 | Default |
| ------ | -------------------------- | ----------------------------------------------------------------------------------- | ------- |
| status | VolunteerApplicationStatus | IsIn([ VolunteerApplicationStatus.APPROVED, VolunteerApplicationStatus.REJECTED, ]) | —       |

## Các hợp đồng còn thiếu hoặc chưa hoàn chỉnh

| Nhu cầu                                  | Trạng thái thực tế                                                              | Hệ quả khi vẽ                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Logout / session refresh / token storage | BE chỉ có register/login; không refresh/revoke route                            | Use case có, sequence revocation chưa được coi là hiện có               |
| Membership context cho UI                | Có AddOrganizationMemberDto/route khung; chưa có “my memberships” query route   | Active Organization selector là UI prototype; API context cần chốt      |
| Catalog goods/units                      | Có ItemType/Unit schema và seed; chưa có controller GET catalog                 | Ghi dependency catalog ở Event creation, không bịa một route đã tồn tại |
| Edit role/need độc lập                   | Create/UpdateEventDto có nested arrays; chưa có child-resource CRUD route riêng | Coi là thao tác thuộc Event aggregate; update semantics cần thiết kế    |
| Donation photo                           | Schema có photoUrl, CreateDonationDto chỉ có Need/quantity                      | Optional photo trong proposal chưa có upload contract                   |
| Evidence multipart                       | Metadata DTO có, chưa có FileInterceptor/UploadedFile và adapter hoạt động      | SEQ11 là dự kiến; không ghi “upload endpoint đã nhận file”              |
| Admin Event moderation                   | FE có admin/events prototype; BE AdminController chỉ User/Org                   | UC40 có yêu cầu nhưng thiếu contract, không thêm GET/PATCH route giả    |
| Final summary report                     | Có scaffold GET dashboard/events/:eventId                                       | Không mặc định có PDF/Excel export, lịch gửi hoặc Report table          |
| QR attendance                            | Không có QR package/endpoint trong backend hiện tại                             | Button đủ MVP; QR là library option theo proposal                       |
| Public serving ảnh                       | Chưa có storage provider/directory mount/download authorization                 | Metadata approved chưa tự bảo vệ một public URL đã bị lộ                |

## Những điểm cần chốt trước khi đóng băng thiết kế

Đây là các quyết định cần đội dự án thống nhất trong SRS/Architecture. Chúng không chặn việc dựng hình tổng quan; gắn note Cxx vào luồng chi tiết liên quan. Các hướng dưới đây là đề xuất thiết kế, chưa phải thay đổi đã áp dụng vào code.

| ID  | Chủ đề                                                | Điều đã biết                                                                                                                    | Chi tiết cần chốt / hướng đề xuất                                                                                                                                                                 | Sơ đồ bị ảnh hưởng                  |
| --- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| C01 | Phiên đăng nhập và logout                             | BE phát Bearer JWT; FE đang lưu demo user id                                                                                    | Chọn cách giữ token/client session và có cần server revocation. Đừng thêm Redis/refresh table trước khi chốt scope.                                                                               | UC/Architecture/Sequence/Deployment |
| C02 | Volunteer capacity/attendance                         | Role có quantity; Application APPROVED; Attendance riêng                                                                        | Ai được bấm xác nhận, Event/time window nào, giới hạn capacity và quy trình nếu đầy. Button trước, QR optional.                                                                                   | UC/B02/State/SEQ04                  |
| C03 | Upload và privacy                                     | Metadata + privacy + Organizer review; policy 5 MiB JPEG/PNG/WebP                                                               | Chọn adapter local/cloud, lưu storage key hay map URL, private serving trước duyệt, donation photo contract, orphan-file cleanup. 5 MiB là quyết định scaffold, proposal chỉ yêu cầu có giới hạn. | Context/ERD/SEQ11/Deployment        |
| C04 | Evidence và thời điểm hoàn tất                        | Trip complete cần Points terminal; proposal nhắc Batch/Donation Distributed có evidence                                         | Cần ảnh cho mỗi Point hay Record? Cần upload hay approved? Giữ số lượng phát thực tế độc lập với review; định nghĩa rõ gate finalization.                                                         | Activity/State/SEQ09/11/13          |
| C05 | Point có nhiều Batch                                  | Record là một TripBatch + Point; endpoint mỗi lần một Record                                                                    | Khi nào Point DISTRIBUTED? Đề xuất hoàn tất rõ sau khi nhập đủ các record cần thiết; một record không mặc nhiên hoàn tất mọi batch ở Point.                                                       | ERD/Activity/SEQ09                  |
| C06 | Cancel sau khi đã có Record nhưng Point chưa terminal | FR18 cấm cancel nếu Point Distributed; record/stock là lần ghi riêng                                                            | Đề xuất cũng kiểm tra chưa có phân phối thực tế/Record để tránh hoàn tác sai hàng đã phát. Chốt atomicity và quy trình recovery khi cập nhật Point thất bại.                                      | State/SEQ09/10                      |
| C07 | Reconcile và trạng thái cuối Batch                    | Có returnedQuantity/lostQuantity/note; enum chỉ DRAFT/READY/ASSIGNED/DISTRIBUTED                                                | Chọn input cumulative hay delta; ai có quyền; xử lý all-return/all-lost và việc hiển thị “Distributed” khi phát ít hơn toàn lô. Đừng đánh đồng accounted với actually distributed.                | ERD/State/Report/SEQ13              |
| C08 | Moderation và phản ánh                                | FR24 có basic reports/moderation; Issue Reporting ở Phase 2                                                                     | Chốt phạm vi Admin moderation Event; xử lý phản ánh thủ công hay trong hệ thống. Không thêm IssueReport entity vào MVP nếu chưa quyết định.                                                       | Context/UC/Component/ERD            |
| C09 | Môi trường deploy thực tế                             | BE Docker/Compose có; FE Next rewrite có; chưa FE image/service                                                                 | Chọn host/domain/TLS/ingress, FE build env, image serving và persistence. Giữ hình current/target riêng.                                                                                          | Architecture/Deployment             |
| C10 | Retry, idempotency và concurrency                     | Unique/check constraints có; transaction nghiệp vụ chưa có                                                                      | Định nghĩa duplicate receipt/record/reconcile response; conditional update/locking và lỗi 409/400 cụ thể. Không tự vẽ Idempotency-Key hoặc bảng command đã tồn tại.                               | Sequence/Data Flow                  |
| C11 | Discovery và chênh lệch FE fields                     | BE Event có location/contactName; DTO filter có area/itemTypeId; FE có area/category/image/contactEmail                         | Chốt filter area bằng location hay thêm trường chuẩn; type of support dùng goods/role/category nào; map DTO FE/BE. Không thêm cột vào ERD vật lý hiện tại chỉ vì mock có.                         | UC/ERD/API/UI component             |
| C12 | Mã công khai                                          | Proposal yêu cầu unique random non-sequential Tracking ID; helper default AID-year-random có, chưa dùng trong Donation scaffold | Chốt prefix và collision retry, code Batch không chỉ dựa thời gian nếu cần unique mạnh; DB unique là lớp bảo vệ cuối.                                                                             | SEQ05/ERD/Tracking UI               |
| C13 | Chỉnh/sửa dữ liệu đã chốt và vòng đời ngoại lệ        | Chưa có reject/resubmit/review-again/undo workflow đầy đủ                                                                       | Chốt có cho đổi role/application, sửa Record, xóa Draft Batch đang Reserved, reinstate Org hay không. Giữ ngoài hình chính khi chưa có scope.                                                     | State/UC/Sequence                   |

## Kiểm tra nhất quán trước khi vẽ bản cuối

- Context không mở các module bên trong; Architecture mới tách browser/Web/API/DB/file storage.
- Dùng một tên actor xuyên suốt, không biến Volunteer/Donor thành systemRole.
- Component “hiện có” chỉ dùng module imports/constructor thực; target collaboration phải có nhãn dự kiến.
- ERD có đúng 20 entity, 12 enum, 37 FK relations ở mốc này; không đếm logical entityId của audit thành FK.
- Nhiều-batch Trip phải qua TripBatch; quantity tại Point phải qua DistributionRecord.
- Canceled assignment phải nằm trong lịch sử; active assignment có partial unique index.
- Không cộng Reserved lần nữa khi gán/chạy Trip; không tăng Available khi chỉ hủy Trip.
- Dùng đúng transition và điều kiện C04–C07, không suy ra từ enum rằng mọi cạnh đều hợp lệ.
- Audit và stock/status commit cùng transaction; byte ảnh nằm ngoài DB transaction.
- Public DTO/URL không lộ user/contact/internal notes hoặc ảnh pending/rejected.
- FE localStorage là prototype; target API/DB integration phải được vẽ như kế hoạch.
- Deployment hiện tại có backend/db/DB volume; frontend container, file storage, TLS và registry chưa được triển khai trong Compose/CI.
- Tiêu đề hình và legend ghi rõ HIỆN CÓ/KHUNG/THIẾT KẾ MVP/CẦN CHỐT.
- Các file CONTRIBUTING và CI không tự chứng minh GitHub branch protection hoặc continuous deployment đã được bật.

## Tham khảo ký hiệu

Nguồn nghiệp vụ chính là proposal và source được liệt kê ở index. Ký hiệu hỗ trợ: [Mermaid ER](https://mermaid.js.org/syntax/entityRelationshipDiagram.html), [PlantUML Use Case](https://plantuml.com/use-case-diagram). Mã hình trong các tài liệu là điểm khởi đầu để bố trí lại, không bắt buộc giữ một hình quá lớn trên một trang.
