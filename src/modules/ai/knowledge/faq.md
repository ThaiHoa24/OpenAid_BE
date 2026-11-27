# Câu hỏi Thường gặp (FAQ) - OpenAid

## 1. Chung về OpenAid

### Q1: OpenAid là gì? Khác gì với các nền tảng quyên góp khác?
**A:** OpenAid là nền tảng **điều phối cứu trợ hiện vật minh bạch theo Lô hàng (Batch)**. Khác biệt cốt lõi:
- **Theo dõi tận tay:** Món quà từ người cho → kho → lô hàng → chuyến xe → điểm phát → người nhận, **mọi bước đều có minh chứng ảnh**.
- **Mã tra cứu duy nhất (TrackingId):** Người quyên góp nhập mã → xem toàn bộ hành trình, không chỉ "đã nhận".
- **Tích hợp tình nguyện viên:** Đăng ký, duyệt, check-in, phân công chuyến xe — tất cả trong một luồng.
- **Minh bạch mặc định:** Mọi thay đổi trạng thái quan trọng đều có audit log công khai.

### Q2: OpenAid có thu phí không?
**A:** **Hoàn toàn miễn phí** cho nhà hảo tâm, tình nguyện viên và tổ chức từ thiện. Nền tảng vận hành nhờ tài trợ và đóng góp của cộng đồng.

### Q3: Làm sao để tin tưởng OpenAid?
**A:**
- Mã nguồn mở / minh bạch quy trình (TransparencyLog public)
- Mỗi đơn quyên góp có TrackingId tra cứu được toàn bộ chuỗi
- Minh chứng ảnh phải được duyệt (APPROVED) + cam kết quyền riêng tư mới công khai
- Tổ chức phải được Admin duyệt (APPROVED) mới được Publish Event

---

## 2. Tài khoản & Đăng nhập

### Q4: Tôi cần tài khoản để làm gì?
| Không cần tài khoản | Cần tài khoản (User) | Cần tài khoản Organizer/Admin |
|---------------------|---------------------|------------------------------|
| Xem chiến dịch công khai | Đăng ký quyên góp | Tạo/Cập nhật Event |
| Tra cứu TrackingId | Đăng ký TNV | Tiếp nhận quyên góp |
| Xem trang About/How-it-works | Xem lịch sử cá nhân | Tạo Batch/Trip |
| | Check-in/out TNV | Ghi nhận phân phối |
| | | Duyệt TNV/Evidence |

### Q5: Quên mật khẩu làm sao?
**A:** Trang `/login` → "Quên mật khẩu" → Nhập email → Nhận OTP → Đặt lại mật khẩu.

### Q6: Có thể đăng nhập bằng Google/Facebook không?
**A:** Hiện tại chỉ hỗ trợ **Email + Mật khẩu** + OTP xác thực. Social login dự kiến cập nhật sau.

### Q7: Một email có thể đăng ký nhiều tài khoản không?
**A:** **Không.** Email unique trong hệ thống. 1 email = 1 tài khoản User.

---

## 3. Quyên góp Hiện vật

### Q8: Có thể quyên góp tiền mặt không?
**A:** OpenAid **chuyên hiện vật**. Nếu muốn quyên góp tiền, vui lòng liên hệ trực tiếp Tổ chức qua thông tin trên Event.

### Q9: Hàng quyên góp cần đáp ứng tiêu chuẩn gì?
**A:** Xem [Danh mục hàng hóa khuyến nghị](../in-kind-donations.md#21-các-nhóm-hàng-hóa-chính). Tóm tắt:
- Thực phẩm: HSD ≥ 3 tháng, nguyên bao bì
- Quần áo: Sạch, gấp gọn, phân loại size/độ tuổi
- Y tế: Nguyên tem, chưa mở, còn HSD
- Học tập: Mới hoặc còn dùng tốt, sạch sẽ

### Q10: Đăng ký quyên góp xong nhưng chưa mang hàng, có bị huỷ không?
**A:** Đơn ở status **PENDING** không tự huỷ. Bạn có thể tự huỷ tại `/my/donations` (chỉ khi PENDING). Organizer có thể REJECT khi bạn mang hàng đến nếu không đạt yêu cầu.

### Q11: Organizer REJECT đơn của tôi, có quyên góp lại không?
**A:** **Có.** Đơn REJECTED → Bạn sửa lại hàng/theo yêu cầu → Tạo đơn mới tại `/donate/:eventId`.

### Q12: TrackingId là gì? Có giống mã vận đơn không?
**A:** TrackingId (`TRK-...`) là **mã duy nhất của đơn quyên góp**, liên kết **toàn bộ chuỗi nghiệp vụ**: Donation → Batch → Trip → DistributionPoint → Evidence. Mã vận đơn truyền thống chỉ theo dõi chuyển phát.

### Q13: Mất TrackingId, tìm lại ở đâu?
**A:** Đăng nhập → **`/my/donations`** → Xem tất cả đơn kèm TrackingId. Hoặc check email xác nhận (nếu hệ thống gửi mail).

### Q14: Tại sao đơn RECEIVED nhưng không thấy Batch/Trip?
**A:** Hàng đã về kho nhưng Organizer **chưa tạo Batch** hoặc **chưa gán Trip**. Liên hệ Organizer qua contactPhone trên Event.

---

## 4. Tình nguyện viên

### Q15: Có điều kiện gì để làm TNV không?
**A:** Mọi người đều có thể đăng ký. Một số vị trí yêu cầu kỹ năng đặc biệt (y tế, lái xe, cấp cứu) — ghi rõ trong VolunteerRole description. Người dưới 18 tuổi cần sự đồng ý phụ huynh.

### Q16: Có thể đăng ký nhiều vị trí trong 1 Event không?
**A:** **Không.** 1 User chỉ được đăng ký **1 VolunteerRole / 1 Event** (ràng buộc unique).

### Q17: Đăng ký rồi muốn đổi vị trí làm sao?
**A:** Nhờ Organizer REJECT đơn cũ → Đăng ký vị trí mới (nếu còn slot).

### Q18: Không được duyệt (REJECTED) có đăng ký lại được không?
**A:** **Được**, miễn Event còn PUBLISHED và Role còn slot. Nên hỏi lý do reject để cải thiện notes.

### Q19: Có được trả chi phí đi lại / bữa ăn không?
**A:** OpenAid **không bắt buộc**. Một số Tổ chức hỗ trợ xe buýt/bữa ăn — xem notes Event hoặc hỏi Organizer.

### Q20: Quên check-out thì sao?
**A:** Organizer có thể check-out hộ sau sự kiện. Giờ tham gia tính đến thời điểm Organizer check-out.

### Q21: Có chứng nhận giờ tình nguyện không?
**A:** Hệ thống ghi nhận `checkedInAt`/`checkedOutAt` tự động tính giờ. Organizer xuất báo cáo từ `/organizer/volunteers`. Chứng nhận chính thức do Tổ chức cấp.

---

## 5. Tổ chức & Organizer

### Q22: Làm sao để tổ chức của tôi tham gia OpenAid?
**A:** Đăng ký Organization tại `/register` (chọn "Đăng ký tổ chức") → Admin duyệt → Org status = APPROVED → Tạo Event, điều phối hoạt động.

### Q23: Organization PENDING có tạo Event được không?
**A:** **Được tạo DRAFT**, nhưng **KHÔNG THỂ PUBLISH** cho đến khi Admin duyệt APPROVED.

### Q24: Làm sao thêm Organizer cho tổ chức?
**A:** Organizer hiện tại vào `/organizer/organization` → Tab "Thành viên" → "Thêm thành viên" → Chọn role **ORGANIZER**.

### Q25: Org bị SUSPENDED thì sao?
**A:** Chỉ xem dữ liệu lịch sử. **Không thể** tạo Event mới, Publish, tiếp nhận Donation, tạo Batch/Trip. Cần Admin unsuspend.

---

## 6. Minh bạch & Tra cứu

### Q26: Ai có thể xem TrackingId của tôi?
**Ai có mã** (TrackingId) đều tra cứu được tại `/track/:trackingId`. **Không cần đăng nhập**. Thông tin hiển thị: trackingId, item, quantity, status, event, batch, trip, điểm phát, ảnh minh chứng, timeline công khai. **Không hiển thị** thông tin cá nhân nhạy cảm (email, phone, địa chỉ nhà riêng).

### Q27: Ảnh minh chứng trên /track có che mặt người nhận không?
**A:** **Bắt buộc** `privacyConfirmed=true` khi upload. Organizer/Admin duyệt (APPROVED) mới công khai. Nếu ảnh có mặt người nhận rõ ràng → Organizer sẽ REJECTED hoặc yêu cầu chụp lại.

### Q28: Thống kê minh bạch (transparencyScore) tính như nào?
**A:** `% Donation có chuỗi đầy đủ (Pledged → Received → In Batch → In Transit → Distributed) + % Evidence APPROVED / Total DistributionPoints`. Điểm cao = quy trình vận hành chuẩn, minh bạch.

### Q29: Làm sao biết Organizer có "giật" hàng không?
**A:** Mọi bước đều có TransparencyLog: Receive (quantity), Batch Create (quantity), Trip Assign (batchCode), Distribution (quantity + evidence ảnh). So sánh quantity qua các mốc. Nếu mismatch → có log chứng minh.

---

## 7. Kỹ thuật & Tích hợp

### Q30: OpenAid có API public không?
**A:** Hiện tại chỉ `/transparency/track/:trackingId` public. Cần API key cho tích hợp sâu — liên hệ Admin.

### Q31: Có thể embed widget tra cứu trên web riêng không?
**A:** Chưa hỗ trợ iframe/embed. Có thể link trực tiếp: `https://openaid.example.com/track/TRK-XXXX`

### Q32: Hệ thống chạy trên hạ tầng gì?
**A:** Backend: NestJS + Prisma + PostgreSQL. Frontend: Next.js 15 + React 19 + Tailwind. Deploy: Docker/K8s (hoặc serverless).

### Q33: Dữ liệu có được backup không?
**A:** PostgreSQL tự động backup hàng ngày. Point-in-time recovery enabled.

---

## 8. Khắc phục sự cố

### Q34: Không nhận được email OTP?
**A:** Check thư Spam/Junk. Đợi 1-2 phút. Nếu vẫn không có → Thử gửi lại hoặc liên hệ support@openaid.example.com

### Q35: Lỗi "Network Error" khi gọi API?
**A:** Kiểm tra kết nối internet. Backend có thể đang restart (deploy). Thử lại sau 30 giây.

### Q36: Upload ảnh minh chứng bị lỗi?
**A:** Kiểm tra: định dạng JPG/PNG, kích thước < 5MB, kích thước ảnh hợp lý. Thử chụp lại ảnh nhẹ hơn.

### Q37: Không thấy nút "Tạo chiến dịch" / "Tiếp nhận" / "Tạo Batch"?
**A:** Kiểm tra quyền:
- Chỉ **Organizer** của Org **APPROVED** mới thấy
- Đã đăng nhập đúng tài khoản?
- Org có bị SUSPENDED không?

### Q38: Event PUBLISHED nhưng không thấy trên /events?
**A:** Có thể đang bị lọc (khu vực, loại hàng, từ khóa). Xóa bộ lọc hoặc kiểm tra `status=PUBLISHED`.

---

## 9. Liên hệ & Hỗ trợ

| Kênh | Mô tả |
|------|-------|
| Email hỗ trợ | `support@openaid.example.com` |
| Hotline (giờ hành chính) | `1900-xxxx` |
| Fanpage/OpenAid | `facebook.com/openaid` |
| Báo cáo lỗi / Đề xuất | `/feedback` (trên web) |
| Bảo mật / Vulnerability | `security@openaid.example.com` |

---

## 10. Từ viết tắt & Thuật ngữ

| Viết tắt | Ý nghĩa |
|----------|---------|
| **BAT** | Batch Code (Lô hàng) |
| **TRK** | Tracking Id (Mã tra cứu quyên góp) |
| **TRP** | Trip Code (Chuyến xe) |
| **TNV** | Tình Nguyện Viên |
| **BTC** | Ban Tổ Chức (Organizer) |
| **HSD** | Hạn Sử Dụng |
| **SKU** | Stock Keeping Unit (Mã hàng - ItemType+Unit) |
| **RBAC** | Role-Based Access Control (Phân quyền theo vai trò) |
| **DTO** | Data Transfer Object |
| **RAG** | Retrieval-Augmented Generation (Truy xuất tăng cường sinh thành) |