# QUY ĐỊNH LÀM VIỆC NHÓM VỚI GIT & GITHUB

> **Áp dụng cho tất cả thành viên.** Mục tiêu: không ai push trực tiếp vào `main`, mọi thay đổi đều được kiểm tra trước khi gộp, và mọi người cập nhật code theo cùng một quy trình.

## 1. Quy tắc bắt buộc

1. **`main` là nhánh ổn định**, chỉ nhận code thông qua Pull Request (PR) đã được review và kiểm tra.
2. **Mỗi thành viên phải tạo nhánh riêng cho từng công việc** từ `main` mới nhất. Không code trực tiếp trên `main`, không push trực tiếp lên `main`.
3. **Tên nhánh phải bắt đầu bằng tên thành viên** (viết thường, không dấu, không khoảng trắng), theo mẫu: `ten/loai-cong-viec-mo-ta`.
   - Ví dụ: `son/feat-login`, `an/fix-cart-total`, `minh/refactor-user-service`.
   - `feat`: tính năng mới; `fix`: sửa lỗi; `refactor`: chỉnh cấu trúc; `docs`: tài liệu.
   - Không dùng một nhánh cá nhân duy nhất cho nhiều công việc không liên quan.
4. **Trước khi code hoặc cập nhật nhánh, kiểm tra thay đổi đang làm dở** bằng `git status`. Commit hoặc stash trước khi chuyển nhánh/pull.
5. **Sau khi push**, tạo/cập nhật PR từ nhánh cá nhân vào `main`, gửi thông báo cho nhóm để review. Push lên nhánh cá nhân **chưa có nghĩa** là code đã vào `main`.
6. **Chỉ người được phân công review/merge** (trưởng nhóm hoặc người phụ trách) được hoàn tất PR. Ít nhất 1 người khác kiểm tra, các bài test cần thiết phải qua trước khi merge.
7. **Sau khi PR được merge**, người merge thông báo rõ cho nhóm. Các thành viên cập nhật `main` trước khi làm tiếp.
8. **Không dùng `git push --force` lên `main`; không sửa lịch sử chung** hoặc xóa nhánh của người khác. Không tự ý dùng `git reset --hard` để xử lý xung đột.

## 2. Quy trình làm việc chuẩn

### Bước A — Bắt đầu công việc mới

Mở terminal trong thư mục dự án. Nếu đang có thay đổi chưa commit, hãy hoàn tất hoặc tạm cất chúng trước khi chuyển nhánh.

```bash
git status
git switch main
git pull --ff-only origin main
git switch -c son/feat-login
```

**Thay `son/feat-login` bằng tên của bạn và công việc thực tế.** Lệnh `--ff-only` giúp dừng lại nếu nhánh `main` cục bộ bị lệch lịch sử thay vì tự tạo merge ngoài ý muốn. Nếu lệnh báo lỗi, không ép pull; báo người phụ trách để kiểm tra.

Nếu đã có nhánh cá nhân trước đó, dùng `git switch ten/ten-nhanh` để quay lại, không tạo trùng tên.

### Bước B — Code, kiểm tra và push lên nhánh cá nhân

```bash
git status
git add .
git commit -m "feat: add login API"
git push -u origin son/feat-login
```

Trước `git add .`, **kiểm tra `git status` và các file được thêm** để không đưa `.env`, API key, file chứa mật khẩu, file build hoặc dữ liệu cá nhân lên GitHub. Lần push tiếp theo trên cùng nhánh thường chỉ cần `git push`.

Trên GitHub, mở **Pull Request**:

- **Base**: `main`.
- **Compare**: `son/feat-login` (nhánh của bạn).
- Tiêu đề mô tả việc đã làm, ghi các thay đổi chính, cách test và ảnh minh họa nếu có.
- Gắn người review; **không tự merge** nếu chưa được phân công.

**Tin nhắn sau khi push/đã tạo PR:**

> [PR CẦN REVIEW] Sơn đã push nhánh `son/feat-login` — PR: [dán link]. Nội dung: thêm API đăng nhập. Đã test: [mô tả]. Nhờ [người review] kiểm tra giúp. **Chưa merge vào `main`; cả nhóm chưa cần pull `main`.**

### Bước C — Cập nhật code mới từ `main` vào nhánh đang làm

Khi đồng đội đã merge code mới, **người đang có công việc dở cần cập nhật `main` vào nhánh của mình** trước khi tiếp tục hoặc trước khi đề nghị merge PR:

```bash
git status
git fetch origin
git switch son/feat-login
git merge origin/main
```

- Nếu `git status` hiển thị file chưa commit, hãy **commit** thay đổi hợp lệ hoặc dùng `git stash push -m "wip"` trước khi merge; sau đó `git stash pop` để lấy lại và kiểm tra xung đột nếu có.
- Nếu có xung đột khi `git merge origin/main`, làm theo **Mục 4**. Khi đã giải quyết, chạy test, rồi `git push` để cập nhật PR.
- Không dùng `git push --force` hoặc `git pull --rebase` tùy tiện trên nhánh đang chia sẻ với người khác.

### Bước D — Review và merge PR

Người review kiểm tra:

- PR đúng nhánh nguồn, nhánh đích `main`.
- Không có thông tin bí mật, file rác hoặc thay đổi ngoài phạm vi công việc.
- Code chạy được, test liên quan đạt; không còn merge conflict.
- Nếu liên quan các phần cùng chỉnh sửa (API, schema, migration, env), đã trao đổi với người phụ trách.

Nếu cần sửa, người tạo PR tiếp tục commit và push **vào nhánh của chính mình**. Sau khi PR đạt yêu cầu, người có quyền merge mới gộp vào `main` trên GitHub (khuyến nghị **Squash and merge** để lịch sử gọn, nếu dự án cho phép).

**Tin nhắn sau khi đã merge:**

> [ĐÃ MERGE — CẦN PULL] PR #[số PR] của Sơn đã merge vào `main`. Nội dung: [mô tả]. Mọi người cập nhật `main` trước khi tiếp tục code. Nếu đang sửa dở, commit/stash trước; sau đó cập nhật `main` vào nhánh cá nhân. Lưu ý: [thay đổi API/DB/env nếu có].

## 3. Thành viên khác cập nhật code sau khi được báo merge

### Trường hợp 1 — Chưa làm dở gì, chỉ cần lấy `main` mới nhất

```bash
git status
git switch main
git pull --ff-only origin main
```

### Trường hợp 2 — Đang code trên nhánh cá nhân

**Không pull `main` thẳng vào thư mục đang có thay đổi chưa lưu.** Hãy commit phần đang làm (hoặc stash), rồi cập nhật như sau:

```bash
git status
git fetch origin
git switch son/feat-login
git merge origin/main
```

Sau merge, chạy lại dự án/test vì thay đổi từ đồng đội có thể ảnh hưởng đến phần đang làm. Nếu dùng stash thì `git stash pop` sau merge và kiểm tra cẩn thận.

Nếu bắt đầu **công việc mới**, quay lại `main`, `git pull --ff-only origin main`, rồi tạo nhánh mới từ đó (như Bước A). **Không tiếp tục tính năng mới trên nhánh PR cũ đã merge.**

## 4. Khi xảy ra merge conflict

Ví dụ: Git báo `CONFLICT (content): Merge conflict in src/...`.

1. Chạy `git status` để xem file nào bị conflict.
2. Mở từng file, tìm các dấu `<<<<<<<`, `=======`, `>>>>>>>`.
3. Trao đổi với người sửa cùng phần code, quyết định giữ/ghép nội dung nào; xóa toàn bộ dấu conflict sau khi xử lý.
4. Chạy lại test/lint liên quan. Đánh dấu các file đã giải quyết và hoàn tất merge:

   ```bash
   git add duong-dan/toi-file-da-sua
   git commit
   git push
   ```

5. Nếu chưa biết cách xử lý an toàn, **dừng lại và nhờ người phụ trách hỗ trợ**. Để hủy lần merge đang thực hiện mà chưa hoàn tất, có thể dùng `git merge --abort` sau khi kiểm tra tình trạng file; không dùng lệnh xóa sạch thay đổi.

> **Lưu ý:** Git có thể gộp thành công nhưng code vẫn lỗi logic. Vì vậy bắt buộc chạy thử sau khi cập nhật, đặc biệt với database migrations, schema, DTO/API contract và file cấu hình.

## 5. Phối hợp để giảm xung đột

| Tình huống | Quy tắc nhóm |
| --- | --- |
| Hai người cùng sửa một module/file | Thông báo trong nhóm và thống nhất ai sửa phần nào trước. |
| Thay đổi database schema/migration | Thông báo trước, ghi rõ nội dung thay đổi schema và cách chạy sau khi pull. |
| Thêm biến môi trường | Chỉ cập nhật `.env.example`/tài liệu; **không commit `.env` chứa secret**. |
| Sửa API dùng chung giữa FE/BE | Báo endpoint/DTO/response mới và thời điểm merge. |
| PR lớn, kéo dài nhiều ngày | Chia nhỏ PR; thường xuyên merge `origin/main` vào nhánh công việc. |
| Có lỗi sau khi merge | Báo nhóm ngay; tạo nhánh `ten/fix-...` để sửa qua PR, không âm thầm push thẳng `main`. |

### Quy trình chuẩn khi làm việc với Database (Prisma Migration)

Dự án đã thiết lập hệ thống **Prisma Migration** chính thức. Để tránh xung đột database giữa các thành viên:

1. **Khi bạn cần sửa/thêm bảng, cột, quan hệ:**
   - **Bước 1:** Chỉ chỉnh sửa trong [`prisma/schema.prisma`](prisma/schema.prisma).
   - **Bước 2:** Chạy lệnh tạo migration tự động:
     ```bash
     npx prisma migrate dev --name <ten_mo_ta_ngan_gon>
     ```
     *(Ví dụ: `npx prisma migrate dev --name add_avatar_url_to_users`)*
   - **Bước 3:** Kiểm tra lại bằng `npm run db:check`.
   - **Bước 4:** Commit cả file `schema.prisma` lẫn thư mục migration mới được sinh ra trong `prisma/migrations/`.
   - **Tuyệt đối không:** Tự ý chạy SQL sửa cấu trúc bảng ngoài DBeaver mà không qua Prisma migration, hoặc sửa đổi các file migration cũ đã được merge vào `main`.

2. **Khi bạn pull code mới có migration từ đồng đội:**
   - Sau khi merge code mới từ `main`, chạy:
     ```bash
     npm run prisma:migrate
     npm run db:check
     ```
   - Prisma sẽ tự động áp dụng các migration mới vào database cục bộ của bạn và sinh lại Prisma Client đồng bộ.

## 6. Checklist trước mỗi PR

- [ ] Tôi đang ở đúng nhánh `ten/loai-mo-ta`, không phải `main`.
- [ ] Nhánh của tôi đã cập nhật thay đổi mới từ `origin/main`.
- [ ] Tôi đã review diff; không có secret, file rác hoặc code debug không cần thiết.
- [ ] Tôi đã chạy test/build/lint liên quan.
- [ ] PR chọn **base `main`**, mô tả rõ thay đổi và người review.
- [ ] Tôi đã gửi link PR cho nhóm; không tự ý merge.
- [ ] Sau khi merge, người phụ trách sẽ thông báo để cả nhóm cập nhật.

## 7. Cấu hình bắt buộc đối với quản trị viên repository

**Quan trọng: File Markdown này là nội quy làm việc, không tự chặn được `git push origin main`.** Người có quyền quản trị phải bật cơ chế bảo vệ trên GitHub:

1. Vào repository → **Settings → Rules → Rulesets → New ruleset → New branch ruleset**.
2. Đặt tên `Protect main`, chọn **Enforcement status: Active**.
3. Ở **Target branches**, chọn nhánh `main` (hoặc `default branch` nếu mặc định là `main`).
4. Bật **Require a pull request before merging**, **Require approvals** (đề xuất ít nhất 1 người), **Block force pushes**, **Restrict deletions** và **Require conversation resolution before merging** nếu có.
5. Không thêm bypass cho thành viên thông thường; cân nhắc bật **Do not allow bypassing** (nếu giao diện/gói hỗ trợ). Có thể yêu cầu **status checks** khi dự án đã thiết lập CI.
6. Lưu ruleset và thử push trực tiếp lên `main` bằng một tài khoản thành viên để xác nhận bị từ chối; thử PR để xác nhận luồng review/merge hoạt động.

**Tham khảo chính thức:**

- [GitHub Docs — Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
- [GitHub Docs — Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)

---

**Quy trình tóm tắt:** `main` mới nhất → tạo `ten/cong-viec` → code/commit → push nhánh cá nhân → mở PR + báo nhóm → review/test → merge vào `main` → báo nhóm lần nữa → mọi người cập nhật code an toàn.
