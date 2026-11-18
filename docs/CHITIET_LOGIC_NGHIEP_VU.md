# TÀI LIỆU TÓM TẮT CHI TIẾT LOGIC NGHIỆP VỤ & MÃ NGUỒN
## (Business & Code Logic Technical Cheat Sheet)
### Hệ thống Đặt vé Xe khách Trực tuyến & Quản trị Bến xe (Dự án OOAD)

> **Mục đích tài liệu:** Cung cấp bản phân tích logic nghiệp vụ, thuật toán toán học, điều kiện kiểm tra (validation), chuyển đổi trạng thái (state transitions), sự kiện WebSocket thời gian thực và mã lỗi HTTP của toàn bộ hệ thống. Dành cho Tester, Developer và Giảng viên đối soát nhanh khi kiểm thử trên giao diện Web hoặc Postman mà không cần phải đọc lại từng dòng mã nguồn.

---

## MỤC LỤC TỔNG QUAN

1. [Tổng quan Kiến trúc Hệ thống & Cơ chế Cốt lõi](#1-tổng-quan-kiến-trúc-hệ-thống--cơ-chế-cốt-lõi)
   - 1.1. Kiến trúc Clean Architecture / Hexagonal (Ports & Adapters)
   - 1.2. Cơ chế Phiên đăng nhập kép (Dual-Session Architecture)
   - 1.3. Cơ chế Khóa phiên tức thì (Instant Session Revocation via `token_version`)
   - 1.4. Cơ chế Chống xung đột ghế nguyên tử (Atomic CAS Concurrency Control)
   - 1.5. Cơ chế WebSocket Pub/Sub thời gian thực (Observer Pattern)
   - 1.6. Cơ chế Tự động Dọn dẹp quá hạn (Background Cleanup & Lazy Evaluation)
2. [Phân hệ Xác thực & Quản lý Tài khoản (Auth & Accounts)](#2-phân-hệ-xác-thực--quản-lý-tài-khoản)
   - 2.1. Đăng ký tài khoản mới (UC08)
   - 2.2. Đăng nhập hệ thống & Khóa tạm chống Brute-force (UC09)
   - 2.3. Đăng xuất tài khoản (UC09)
   - 2.4. Khôi phục mật khẩu qua OTP (UC10)
   - 2.5. Đổi số điện thoại xác thực OTP số mới (UC11)
   - 2.6. Đổi mật khẩu cá nhân (UC12)
   - 2.7. Cập nhật hồ sơ cá nhân
3. [Phân hệ Quản trị Đội xe, Tuyến & Chuyến xe (Fleet, Routes & Trips)](#3-phân-hệ-quản-trị-đội-xe-tuyến--chuyến-xe)
   - 3.1. Quản lý Tuyến đường (UC13)
   - 3.2. Quản lý Xe & Thuật toán Sinh sơ đồ ghế tự động (UC14)
   - 3.3. Tạo Chuyến xe & Thuật toán Phát hiện Xung đột Lịch xe (UC13)
   - 3.4. Cập nhật Chuyến & Đổi xe (Hoán đổi ghế & Báo SMS khách hàng)
   - 3.5. Điều chỉnh Giá vé Chuyến xe (UC15)
   - 3.6. Tra cứu Chuyến xe Công khai & Gợi ý Ngày lân cận (UC01)
4. [Phân hệ Khóa tạm Ghế (Seat Holds)](#4-phân-hệ-khóa-tạm-ghế-seat-holds)
   - 4.1. Khóa tạm ghế giữ chỗ (UC21)
   - 4.2. Tra cứu ghế đang giữ & Thời gian còn lại
   - 4.3. Chủ động giải phóng ghế giữ chỗ
5. [Phân hệ Đặt vé & Thanh toán (Booking & Payments)](#5-phân-hệ-đặt-vé--thanh-toán-booking--payments)
   - 5.1. Tạo Đơn đặt vé Trực tuyến (UC02)
   - 5.2. Bán vé tại Quầy cho Khách vãng lai (UC04)
   - 5.3. Thanh toán Đơn hàng & Mô phỏng Cổng giả lập (UC22)
   - 5.4. Hoàn tất Đơn hàng, Xuất vé & Phát hành mã QR
   - 5.5. Xử lý Webhook Thanh toán muộn (Late Webhook & Tự động hoàn tiền)
   - 5.6. Hủy Đơn hàng chờ thanh toán
   - 5.7. In phôi vé giấy tại Quầy
6. [Phân hệ Khuyến mãi & Voucher (Coupons)](#6-phân-hệ-khuyến-mãi--voucher-coupons)
   - 6.1. Tạo mới & Quản lý Trạng thái Mã giảm giá (UC15)
   - 6.2. Kiểm tra & Tính toán Mức giảm giá (Validation & Discount Calculation)
   - 6.3. Thuật toán Phân bổ Giảm giá vào từng Vé (`allocate_discount`)
7. [Phân hệ Tra cứu vé, Hủy vé & Hoàn tiền (Tickets, Cancellations & Refunds)](#7-phân-hệ-tra-cứu-vé-hủy-vé--hoàn-tiền)
   - 7.1. Lịch sử Mua vé & Trạng thái Động (UC07)
   - 7.2. Tra cứu Soát vé cho Nhân viên (UC24)
   - 7.3. Báo giá Phí hủy vé (`cancel_quote`)
   - 7.4. Khách hàng Tự hủy vé Trực tuyến (UC05)
   - 7.5. Hủy vé tại Quầy Giao dịch (UC06)
   - 7.6. Nhà xe Hủy chuyến Hoàn tiền 100% (UC13)
   - 7.7. Xử lý lại Lệnh hoàn tiền thất bại (UC18 / UC23)
8. [Phân hệ Báo cáo Thống kê & Đối soát (Reports & Counter Sales)](#8-phân-hệ-báo-cáo-thống-kê--đối-soát)
   - 8.1. Báo cáo Doanh thu, Hủy vé & Tỷ lệ Lấp đầy ghế (UC17)
   - 8.2. Đối soát Doanh thu Ca trực Quầy (Counter Summary)
9. [Phân hệ Quản trị Người dùng & Cấu hình Tham số (Admin Users & Settings)](#9-phân-hệ-quản-trị-người-dùng--cấu-hình-tham-số)
   - 9.1. Quản lý Tài khoản Nội bộ & Phân quyền (UC16)
   - 9.2. Cấu hình Tham số Vận hành Hệ thống
10. [Bảng Tra cứu Mã lỗi HTTP & Cheat Sheet Kiểm thử](#10-bảng-tra-cứu-mã-lỗi-http--cheat-sheet-kiểm-thử)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG & CƠ CHẾ CỐT LÕI

### 1.1. Kiến trúc Clean Architecture / Hexagonal (Ports & Adapters)
Hệ thống được thiết kế phân tầng nghiêm ngặt nhằm đảm bảo tính độc lập giữa logic nghiệp vụ và hạ tầng kỹ thuật:
- **Domain Layer (`backend/app/domain/`):** Chứa các thực thể nghiệp vụ (`entities/`), các quy tắc nghiệp vụ thuần túy (`rules/`) không phụ thuộc vào framework, database hay thư viện bên ngoài.
- **Application Layer (`backend/app/application/`):** Chứa các Use Cases (`use_cases/`), điều phối luồng dữ liệu, giao tiếp với bên ngoài thông qua các giao diện cổng trừu tượng (`ports/`).
- **Infrastructure Layer (`backend/app/infrastructure/`):** Hiện thực hóa các Ports: Database ORM (`db/repositories/`), WebSocket Pub/Sub (`websocket/hubs.py`), Băm mật khẩu & JWT (`security/`), Cổng thanh toán & SMS giả lập (`mock/`).
- **Presentation Layer (`backend/app/presentation/`):** FastAPI Routers (`routers/`), Schemas Pydantic (`schemas/`), Dependency Injection (`deps.py`) và Bộ xử lý lỗi tập trung (`errors.py`).

### 1.2. Cơ chế Phiên đăng nhập kép (Dual-Session Architecture)
- **Vấn đề:** Trong quá trình vận hành hoặc kiểm thử, một người dùng có thể cần vừa mở giao diện Khách hàng (`#/`) để đặt vé, vừa mở giao diện Quản trị / Bán vé quầy (`#/admin`) để duyệt đơn và soát vé trên cùng một trình duyệt.
- **Giải pháp:** Frontend sử dụng 2 cặp key lưu trữ LocalStorage độc lập:
  - Cổng Khách hàng (`customer`): Lưu `vexe_token` và `vexe_user`.
  - Cổng Quản trị (`admin`): Lưu `vexe_admin_token` và `vexe_admin_user`.
- **Cơ chế Request Interceptor:** Hàm `currentPortal()` phân tích URL Hash. Nếu bắt đầu bằng `#/admin`, Axios sẽ tự động gắn Bearer Token của cổng Admin; ngược lại gắn Token của cổng Customer.
- **Kiểm soát cổng khi đăng nhập:** Tài khoản vai trò `KHACH_HANG` bị chặn không được đăng nhập tại Cổng Quản trị. Ngược lại, nhân viên nội bộ (`ADMIN`, `NHAN_VIEN_BAN_VE`) khi đăng nhập tại cổng Khách hàng sẽ bị từ chối và yêu cầu chuyển sang cổng Quản trị.

### 1.3. Cơ chế Khóa phiên tức thì (Instant Session Revocation via `token_version`)
- Token JWT được cấp phát có thời hạn (Access Token), chứa claim `token_version`.
- Mỗi tài khoản trong database lưu một số nguyên `token_version` (khởi tạo = 1).
- Khi xảy ra các biến cố bảo mật:
  1. Người dùng bấm Đăng xuất (`logout`).
  2. Người dùng Đổi mật khẩu (`change_password`) hoặc Đổi số điện thoại (`change_phone`).
  3. Quản trị viên Khóa tài khoản (`set_locked(True)`) hoặc Đặt lại mật khẩu (`reset_password`).
- Hệ thống gọi `account.revoke_tokens()` -> thực hiện `token_version += 1`.
- Tại dependency xác thực (`get_current_account`), hệ thống giải mã JWT và so sánh `claims.token_version == account.token_version`. Nếu lệch, lập tức ném lỗi `401 Unauthorized (InvalidToken)`, vô hiệu hóa toàn bộ các phiên cũ trên mọi thiết bị ngay lập tức.

### 1.4. Cơ chế Chống xung đột ghế nguyên tử (Atomic CAS Concurrency Control)
- **Vấn đề:** Hiện tượng Race Condition khi hàng trăm người dùng cùng bấm giữ hoặc mua một ghế tại cùng một phần nghìn giây.
- **Giải pháp:** Sử dụng kỹ thuật **Compare-And-Swap (CAS)** trực tiếp tại câu lệnh `UPDATE` cơ sở dữ liệu (`backend/app/infrastructure/db/repositories/holds.py`):
  ```sql
  UPDATE trip_seats
  SET status = 'TAM_KHOA', held_by = :account_id, hold_until = :until
  WHERE trip_id = :trip_id
    AND seat_id = :sid
    AND (
      status = 'TRONG'
      OR (status = 'TAM_KHOA' AND hold_until < :now)
    );
  ```
- **Nguyên lý hoạt động:**
  - Cơ sở dữ liệu sử dụng Row-Level Lock: Chỉ duy nhất tiến trình đầu tiên chạm tới bản ghi thỏa mãn điều kiện WHERE sẽ cập nhật thành công (`rowcount = 1`).
  - Các tiến trình đến sau nhận `rowcount = 0` (ghế không còn TRONG và cũng không quá hạn).
  - Hệ thống phát hiện `rowcount = 0`, đánh dấu `bad.append(sid)`, lập tức kích hoạt `db.rollback()` toàn bộ giao dịch, đảm bảo nguyên tắc All-or-Nothing (hoặc giữ được toàn bộ ghế đã chọn, hoặc không giữ ghế nào).
  - Trả về mã lỗi `409 Conflict` kèm danh sách `unavailable_seat_ids` để giao diện đổi màu cảnh báo người dùng.

### 1.5. Cơ chế WebSocket Pub/Sub thời gian thực (Observer Pattern)
Hệ thống triển khai 2 Hub quản lý kết nối thời gian thực tại `backend/app/infrastructure/websocket/hubs.py`:
1. **`TripSeatHub` (Kênh `/ws/trips/{trip_id}/seats`):**
   - Quản lý các kết nối WebSocket đang xem sơ đồ ghế của chuyến xe `trip_id`.
   - **Sự kiện `SEATS_HELD`:** Bắn ra khi có người giữ chỗ thành công -> Client đổi màu ghế sang trạng thái "Đang được giữ" (vàng).
   - **Sự kiện `SEATS_RELEASED`:** Bắn ra khi người giữ nhả ghế hoặc Cleanup Worker thu hồi -> Client đổi màu ghế về "Trống" (trắng/xanh).
   - **Sự kiện `SEATS_BOOKED`:** Bắn ra khi đơn hàng thanh toán thành công -> Client đổi màu ghế sang "Đã bán" (xám).
2. **`OrderHub` (Kênh `/ws/orders/{order_id}`):**
   - Quản lý client đang mở trang thanh toán / quét mã QR VietQR của đơn hàng `order_id`.
   - **Sự kiện `ORDER_PAID`:** Bắn ra khi thanh toán thành công -> Giao diện tự động chuyển hướng sang trang "Vé của tôi / Thành công".
   - **Sự kiện `ORDER_CANCELLED`:** Bắn ra khi đơn bị hủy do hết hạn giữ chỗ -> Giao diện hiện thông báo hết thời gian và yêu cầu chọn lại.

### 1.6. Cơ chế Tự động Dọn dẹp quá hạn (Background Cleanup & Lazy Evaluation)
Hệ thống sử dụng cơ chế bảo vệ kép (Double-Protection):
1. **Kiểm tra lười (Lazy Evaluation):** Tại mọi use case tìm kiếm chuyến (`trips.search`), xem sơ đồ ghế (`trips.seat_map`), giữ chỗ (`holds.hold`) hoặc tải đơn hàng (`booking.load`), hệ thống luôn tự động gọi `release_expired_holds(utcnow())` và `expire_if_needed(agg)`. Đảm bảo dữ liệu truy xuất luôn luôn chuẩn xác theo thời gian thực mà không phụ thuộc hoàn toàn vào cron job.
2. **Background Cleanup Worker (`backend/app/application/use_cases/cleanup.py`):**
   - Chạy định kỳ trong nền.
   - Quét và giải phóng các ghế giữ chỗ độc lập quá hạn (`hold_until < now`).
   - Quét các đơn hàng `CHO_THANH_TOAN` đã quá hạn thanh toán (`created_at < now - hold_minutes`), chuyển trạng thái sang `DA_HUY`, hủy vé tạm và trả lại ghế trống cho chuyến xe.

---

## 2. PHÂN HỆ XÁC THỰC & QUẢN LÝ TÀI KHOẢN

### 2.1. Đăng ký tài khoản mới (UC08)
- **Mã nguồn:** `backend/app/application/use_cases/auth.py` (`request_register_otp`, `register`).
- **Endpoint:**
  - `POST /auth/register/otp` (Nhận mã OTP thử nghiệm).
  - `POST /auth/register` (Hoàn tất đăng ký).
- **Điều kiện tiền đề & Validation:**
  - `phone`: Số điện thoại chưa từng được đăng ký trong hệ thống (`PhoneAlreadyRegistered -> 409`).
  - `password`: Đạt chuẩn an toàn theo `is_strong_password` (từ 8 đến 72 ký tự, bắt buộc chứa ít nhất 1 chữ cái và 1 chữ số; nếu không đạt -> `WeakPassword -> 422`).
  - `otp`: Mã 6 số, chưa sử dụng, chưa quá hạn 120s, nhập sai dưới 5 lần.
- **Luồng xử lý từng bước:**
  1. Khách gửi yêu cầu cấp OTP -> Hệ thống kiểm tra số điện thoại -> Kiểm tra tần suất gửi (chống spam < 60s -> `OtpRequestedTooSoon -> 429`) -> Sinh mã 6 số ngẫu nhiên, lưu hash và gửi qua SMS Mock.
  2. Khách gửi thông tin đăng ký kèm OTP -> Hệ thống kiểm tra mật khẩu mạnh -> Kiểm tra lại tính duy nhất của SĐT -> Tiêu thụ OTP (`_consume_otp`: kiểm tra hash, đánh dấu `used = True`).
  3. Thêm bản ghi `Account` với vai trò `KHACH_HANG`, mật khẩu băm bcrypt.
- **Mã lỗi có thể gặp:** `400 Bad Request` (InvalidOtp), `409 Conflict` (PhoneAlreadyRegistered), `422 Unprocessable Entity` (WeakPassword), `429 Too Many Requests` (OtpRequestedTooSoon).

### 2.2. Đăng nhập hệ thống & Khóa tạm chống Brute-force (UC09)
- **Mã nguồn:** `backend/app/application/use_cases/auth.py` (`login`), `backend/app/domain/entities/account.py`.
- **Endpoint:** `POST /auth/login`.
- **Điều kiện tiền đề & Validation:**
  - Body: `phone` (chuỗi số), `password` (chuỗi thô).
- **Luồng xử lý & Quy tắc nghiệp vụ:**
  1. Tìm tài khoản theo SĐT. Nếu không tồn tại -> `InvalidCredentials -> 401`.
  2. Kiểm tra trạng thái tài khoản: Nếu `status == 'KHOA'` (bị Admin khóa) -> `AccountDisabled -> 403`.
  3. Kiểm tra khóa tạm thời: Nếu `locked_until > now` -> `LoginTemporarilyLocked -> 423` (Người dùng bị khóa tạm thời).
  4. Xác thực mật khẩu qua bcrypt hasher:
     - **Nếu sai mật khẩu:** Tăng `failed_login_count += 1`.
       - Nếu `failed_login_count >= 5` (`login_max_failures`): Thiết lập `locked_until = now + 15 phút` (`login_lock_minutes`), reset `failed_login_count = 0`. Lưu DB và ném lỗi `InvalidCredentials -> 401`.
     - **Nếu đúng mật khẩu:**
       - Reset `failed_login_count = 0`, gỡ bỏ `locked_until = None`.
       - Ghi nhật ký hoạt động `DANG_NHAP`.
       - Cấp Access Token JWT (chứa `account_id`, `role`, `token_version`).
- **State Transitions:**
  - `failed_login_count`: 0 -> 1 -> 2 -> 3 -> 4 -> khóa tạm (`locked_until` = now + 15m).
  - Đăng nhập đúng: `failed_login_count` = 0, `locked_until` = null.
- **Mã lỗi HTTP:** `401 Unauthorized` (InvalidCredentials), `403 Forbidden` (AccountDisabled), `423 Locked` (LoginTemporarilyLocked).

### 2.3. Đăng xuất tài khoản (UC09)
- **Mã nguồn:** `backend/app/application/use_cases/auth.py` (`logout`).
- **Endpoint:** `POST /auth/logout`.
- **Luồng xử lý:**
  1. Xác thực token của tài khoản đang đăng nhập.
  2. Thực hiện `account.revoke_tokens()`: Tăng `token_version` trong DB thêm 1 đơn vị.
  3. Ghi nhật ký hoạt động `DANG_XUAT`.
  4. Mọi request dùng token cũ sau đó sẽ nhận `401 Unauthorized`.

### 2.4. Khôi phục mật khẩu qua OTP (UC10)
- **Mã nguồn:** `backend/app/application/use_cases/auth.py` (`request_reset_otp`, `reset_password`).
- **Endpoint:**
  - `POST /auth/password/forgot/otp` (Yêu cầu mã xác thực).
  - `POST /auth/password/reset` (Đặt mật khẩu mới).
- **Quy tắc an ninh đặc thù:**
  - Tại bước yêu cầu OTP: Nếu số điện thoại KHÔNG tồn tại hoặc đang bị KHOÁ, hệ thống trả về HTTP 200 thành công nhưng ngầm trả về `None` (không phát sinh OTP và không gửi SMS). Điều này ngăn chặn kẻ tấn công dò quét danh sách số điện thoại đã đăng ký (User Enumeration Protection).
- **Luồng xử lý đặt lại mật khẩu:**
  1. Kiểm tra mật khẩu mới đạt chuẩn `is_strong_password` (>= 8 ký tự, có chữ và số; nếu không -> 422).
  2. Tìm tài khoản. Nếu không có hoặc bị khóa -> Báo lỗi OTP không hợp lệ (`InvalidOtp -> 400`) để đồng nhất lỗi.
  3. Tiêu thụ OTP (`_consume_otp`).
  4. Cập nhật `password_hash = hash(new_password)`.
  5. Reset `failed_login_count = 0`, `locked_until = None`, `must_change_password = False`.
  6. Kích hoạt `revoke_tokens()` để đăng xuất khỏi tất cả thiết bị khác.

### 2.5. Đổi số điện thoại (UC11)
- **Mã nguồn:** `backend/app/application/use_cases/auth.py` (`request_change_phone_otp`, `change_phone`).
- **Endpoint:**
  - `POST /auth/phone/otp` (Gửi OTP đến số điện thoại mới).
  - `POST /auth/phone/change` (Xác nhận đổi số).
- **Quy tắc nghiệp vụ:**
  - Số điện thoại mới không được trùng với số hiện tại.
  - Số điện thoại mới chưa từng được đăng ký bởi bất kỳ tài khoản nào khác (`409 Conflict`).
  - Bắt buộc nhập đúng mật khẩu hiện tại của tài khoản (`WrongCurrentPassword -> 400`).
  - Phải xác thực thành công OTP gửi tới **SỐ ĐIỆN THOẠI MỚI** (để chứng minh quyền sở hữu số mới).
  - Sau khi đổi thành công: Tự động `revoke_tokens()` và cấp Token JWT mới mang định danh mới.

### 2.6. Đổi mật khẩu cá nhân (UC12)
- **Mã nguồn:** `backend/app/application/use_cases/auth.py` (`change_password`).
- **Endpoint:** `POST /auth/password/change`.
- **Quy tắc nghiệp vụ:**
  - Kiểm tra mật khẩu hiện tại chính xác (`WrongCurrentPassword -> 400`).
  - Mật khẩu mới phải đạt chính sách mật khẩu mạnh (`WeakPassword -> 422`).
  - Mật khẩu mới BẮT BUỘC phải khác mật khẩu hiện tại (`SamePassword -> 400`).
  - Cập nhật mật khẩu mới, đặt `must_change_password = False`, tăng `token_version` và cấp token mới ngay trong phản hồi.

---

## 3. PHÂN HỆ QUẢN TRỊ ĐỘI XE, TUYẾN & CHUYẾN XE

### 3.1. Quản lý Tuyến đường (UC13)
- **Mã nguồn:** `backend/app/application/use_cases/trips.py` (`create_route`, `update_route`).
- **Quy tắc nghiệp vụ:**
  - Cặp `(origin, destination)` là duy nhất. Không thể tạo hai tuyến có cùng điểm đi và điểm đến (`Conflict -> 409`).
  - Mã tuyến tự động sinh: `TX-{ORIGIN_ABBR}{DEST_ABBR}` (ví dụ: Hà Nội -> Đà Nẵng sinh mã `TX-HNDN`).
  - Tuyến có trạng thái: `HOAT_DONG` (Active) hoặc `NGUNG` (Stopped). Chuyến xe chỉ được tạo trên tuyến đang `HOAT_DONG`.

### 3.2. Quản lý Xe & Thuật toán Sinh sơ đồ ghế tự động (UC14)
- **Mã nguồn:** `backend/app/application/use_cases/fleet.py`, `backend/app/domain/rules/seat_layout.py`.
- **Ràng buộc nghiệp vụ:**
  - Thêm xe luôn đi kèm việc tạo sơ đồ ghế (không thể có xe mà không có ghế).
  - Biển số xe (`plate`) là duy nhất trong toàn hệ thống.
  - **Không thể ngừng hoạt động xe (`set_status(INACTIVE)`):** Nếu xe đang được phân công cho các chuyến xe chưa khởi hành (`departure_at > now`) và chưa bị hủy -> Bắt buộc hủy chuyến hoặc đổi xe trước (`BusinessRule -> 400`).
  - **Không thể sửa sơ đồ ghế (`replace_layout`):** Nếu xe đã từng được gán cho bất kỳ chuyến xe nào trong quá khứ hoặc tương lai (tránh làm sai lệch dữ liệu vé đã bán) -> `BusinessRule -> 400`.
- **Thuật toán sinh sơ đồ ghế (`generate_layout`):**
  - Tham số: `floors` (số tầng: 1 hoặc 2), `rows` (số hàng), `seats_per_row` (số ghế/hàng).
  - Tầng 1: Đánh tiền tố `A`, đánh số liên tục từ `A01` đến `A{rows * seats_per_row:02d}`.
  - Tầng 2: Đánh tiền tố `B`, đánh số liên tục từ `B01` đến `B{rows * seats_per_row:02d}`.
  - Mỗi ghế lưu chính xác tọa độ ma trận `(floor, row_no, col_no)`.

### 3.3. Tạo Chuyến xe & Thuật toán Phát hiện Xung đột Lịch xe (UC13)
- **Mã nguồn:** `backend/app/application/use_cases/trips.py` (`create_trip`), `backend/app/domain/rules/scheduling.py` (`overlaps`).
- **Endpoint:** `POST /admin/trips`.
- **Điều kiện kiểm tra (Validation):**
  1. Tuyến đường phải đang ở trạng thái `HOAT_DONG`.
  2. Xe phải đang ở trạng thái `HOAT_DONG` và đã có sơ đồ ghế.
  3. Thời điểm khởi hành `departure_at = combine(departure_date, departure_time)` phải ở tương lai so với giờ hiện tại Việt Nam (`departure_at > now_vn()`).
  4. **Kiểm tra xung đột lịch xe (`_check_vehicle_free`):**
     - Thời gian kết thúc dự kiến: `arrival_at = departure_at + route.expected_minutes` (mặc định 360 phút nếu tuyến chưa cấu hình).
     - Quét toàn bộ các chuyến xe khác của cùng phương tiện đó (bỏ qua các chuyến đã có status `DA_HUY`).
     - Áp dụng thuật toán giao thoa: `overlaps(start1, end1, start2, end2) = (start1 < end2) and (start2 < end1)`.
     - Nếu có bất kỳ chuyến nào giao nhau -> Ném lỗi `Conflict -> 409` kèm ID và thời gian chuyến bị trùng.
- **Khởi tạo dữ liệu:**
  - Tạo bản ghi `Trip` với mã định danh tự động: `CX-{ROUTE_PART}-{YYMMDD}-{HHMM}`.
  - Tạo danh sách trạm dừng đón (`DON`) và trả (`TRA`) theo thứ tự `order`.
  - Tự động sinh toàn bộ bản ghi `TripSeatModel` tương ứng với số ghế của xe, gán trạng thái khởi tạo là `TRONG` (FREE).

### 3.4. Cập nhật Chuyến & Đổi xe (Hoán đổi ghế & Báo SMS)
- **Mã nguồn:** `backend/app/application/use_cases/trips.py` (`update_trip`, `_check_swap`).
- **Quy tắc nghiệp vụ:**
  - Chuyến đã hủy (`DA_HUY`) hoặc chuyến đã khởi hành (`departure_at <= now_vn()`) thì KHÔNG ĐƯỢC PHÉP sửa.
  - **Quy tắc Đổi xe mới (`_check_swap`):**
    - Xe mới phải đang `HOAT_DONG`.
    - Xe mới BẮT BUỘC phải có đầy đủ toàn bộ các mã ghế hiện đang được giữ chỗ (`TAM_KHOA`) hoặc đã bán (`DA_BAN`) của chuyến hiện tại.
    - Nếu thiếu dù chỉ 1 mã ghế -> Báo lỗi `BusinessRule -> 400` ("Xe mới không có các ghế đang bán/giữ: ...").
    - Thực hiện chuyển đổi ánh xạ ghế cũ sang ghế mới có cùng mã (`code`).
  - **Hiệu ứng phụ (Side-effects):** Tự động gửi SMS thông báo đổi lịch / đổi xe cho toàn bộ hành khách đã mua vé thành công trên chuyến đó.

### 3.5. Điều chỉnh Giá vé Chuyến xe (UC15)
- **Mã nguồn:** `backend/app/application/use_cases/trips.py` (`update_price`).
- **Quy tắc nghiệp vụ:**
  - Chuyến đã hủy hoặc đã khởi hành không đổi giá được.
  - **Nguyên tắc bảo toàn giá:** Giá vé mới chỉ áp dụng cho các giao dịch đặt vé phát sinh sau thời điểm đổi. Tất cả các vé đã bán trước đó vẫn giữ nguyên giá mua gốc lưu trong trường `original_price` và `amount` của bảng `tickets`.

### 3.6. Tra cứu Chuyến xe Công khai & Gợi ý Ngày lân cận (UC01)
- **Mã nguồn:** `backend/app/application/use_cases/trips.py` (`search`).
- **Endpoint:** `GET /trips/search`.
- **Tham số lọc:** `origin`, `destination`, `date`, `part` (SANG: 05:00-11:59, CHIEU: 12:00-17:59, DEM: 18:00-04:59), `vehicle_type_id`, `min_price`, `max_price`.
- **Cơ chế hoạt động:**
  1. Tự động giải phóng ghế giữ chỗ quá hạn trước khi đếm số ghế trống (`available_seats`).
  2. Chỉ hiển thị các chuyến có `departure_at > now_vn()` và trạng thái `MO_BAN`.
  3. **Xử lý ngoại lệ không có chuyến (E1):** Nếu ngày yêu cầu không có chuyến nào thỏa mãn, hệ thống tự động quét biên độ 3 ngày trước và 3 ngày sau (`date ± 3 ngày`) và trả về danh sách `suggested_dates` có chuyến xe hoạt động để gợi ý cho khách hàng trên giao diện.

---

## 4. PHÂN HỆ KHÓA TẠM GHẾ (SEAT HOLDS)

### 4.1. Khóa tạm ghế giữ chỗ (UC21)
- **Mã nguồn:** `backend/app/application/use_cases/holds.py`, `backend/app/infrastructure/db/repositories/holds.py`.
- **Endpoint:** `POST /trips/{trip_id}/hold`.
- **Điều kiện tiền đề & Validation:**
  - Người dùng đã đăng nhập (vai trò `KHACH_HANG` hoặc `NHAN_VIEN_BAN_VE`).
  - Chuyến xe tồn tại, trạng thái `MO_BAN` và chưa khởi hành.
  - Danh sách `seat_ids` không được rỗng, các ghế phải thuộc đúng chuyến xe này.
  - **Giới hạn số ghế:** Tổng số ghế đang giữ + số ghế mới chọn <= 10 ghế (`MAX_SEATS_PER_ACCOUNT`). Vượt quá -> `BusinessRule -> 400`.
- **Luồng xử lý Atomic CAS:**
  1. Thu hồi các ghế đã hết hạn trên chuyến (`release_expired_holds`).
  2. Tính thời hạn giữ: `until = now + timedelta(minutes=THOI_GIAN_GIU_CHO_PHUT)` (mặc định 15 phút).
  3. Chạy câu lệnh UPDATE nguyên tử trên từng ghế: Chỉ update khi ghế `TRONG` hoặc (`TAM_KHOA` nhưng đã quá hạn).
  4. Nếu có ghế bị người khác chiếm -> `rollback` và ném lỗi `Conflict -> 409` kèm danh sách `unavailable_seat_ids`.
- **Hiệu ứng phụ (Side-effects):**
  - Bắn sự kiện WebSocket `SEATS_HELD` tới phòng `trip_id` để cập nhật giao diện của tất cả người dùng khác đang xem sơ đồ ghế.
- **State Transition:** Ghế chuyển từ `TRONG` -> `TAM_KHOA` (`held_by = account_id`, `hold_until = until`).

### 4.2. Tra cứu ghế đang giữ & Thời gian còn lại
- **Endpoint:** `GET /trips/{trip_id}/hold`.
- **Luồng xử lý:** Quét các ghế trên chuyến có `held_by == account.id` và `hold_until >= now`. Tính `seconds_left = max(0, int((until - now).total_seconds()))`. Trả về danh sách ghế và đồng hồ đếm ngược cho UI.

### 4.3. Chủ động giải phóng ghế giữ chỗ
- **Endpoint:** `POST /trips/{trip_id}/release`.
- **Luồng xử lý:**
  - Nhả một phần (nếu truyền `seat_ids`) hoặc nhả toàn bộ ghế tài khoản đang giữ trên chuyến đó.
  - Cập nhật DB: `status = TRONG`, `held_by = NULL`, `hold_until = NULL`.
  - Bắn sự kiện WebSocket `SEATS_RELEASED` tới phòng `trip_id`.

---

## 5. PHÂN HỆ ĐẶT VÉ & THANH TOÁN (BOOKING & PAYMENTS)

### 5.1. Tạo Đơn đặt vé Trực tuyến (UC02)
- **Mã nguồn:** `backend/app/application/use_cases/booking.py` (`create_order`).
- **Endpoint:** `POST /orders`.
- **Quy trình nghiệp vụ 6 bước:**
  1. **Kiểm tra chuyến:** Tồn tại, status `MO_BAN`, chưa khởi hành.
  2. **Kiểm tra ghế giữ chỗ:** Các ghế BẮT BUỘC phải đang ở trạng thái `TAM_KHOA` bởi chính tài khoản người tạo đơn (`now_held_by`). Nếu chưa giữ hoặc vừa hết hạn -> Báo lỗi `Conflict -> 409`.
  3. **Kiểm tra trạm đón/trả:** Trạm đón phải là loại `DON`, trạm trả phải là loại `TRA` thuộc chuyến.
  4. **Kiểm tra Voucher:** Nếu có `coupon_code`: Kiểm tra tính hợp lệ (thời hạn, số lượt, min_order). Trừ trước 1 lượt sử dụng (`coupons.use_one`) ngay khi tạo đơn để tránh vượt hạn mức.
  5. **Tính tiền & Phân bổ chiết khấu:**
     - `subtotal = trip.price * số_lượng_vé`.
     - Phân bổ giảm giá vào từng vé bằng hàm `allocate_discount`.
  6. **Lưu đơn & vé:**
     - Tạo bản ghi `Order` ở trạng thái `CHO_THANH_TOAN`. Mã đơn: `ORD-{YYMMDD}-{ID:04d}`.
     - Tạo các bản ghi `Ticket` ở trạng thái `CHO_THANH_TOAN`.

### 5.2. Bán vé tại Quầy cho Khách vãng lai (UC04)
- **Mã nguồn:** `backend/app/application/use_cases/booking.py` (`create_counter_order`).
- **Endpoint:** `POST /counter/orders`.
- **Đặc thù nghiệp vụ quầy:**
  - Khách vãng lai mua vé tại quầy bến xe KHÔNG CẦN tài khoản khách hàng.
  - Đơn hàng được thiết lập: `channel = TAI_QUAY`, `account_id = NULL`, `holder_id = clerk.id`, `clerk_id = clerk.id`.
  - Ghế được khóa tạm dưới danh nghĩa của nhân viên thu ngân (`clerk.id`).

### 5.3. Thanh toán Đơn hàng & Mô phỏng Cổng giả lập (UC22)
- **Mã nguồn:** `backend/app/application/use_cases/booking.py` (`pay`).
- **Endpoint:** `POST /orders/{order_id}/pay`.
- **Tham số đầu vào:**
  - `method`: `VIETQR`, `MOMO`, `ZALOPAY`, `THE`, `TIEN_MAT`.
  - `simulate`: `success`, `fail`, `pending` (tham số giả lập dùng cho kiểm thử).
- **Luồng xử lý chi tiết:**
  1. Kiểm tra đơn hàng: Phải ở trạng thái `CHO_THANH_TOAN`. Nếu đã bị hủy do hết hạn giữ chỗ -> Báo lỗi `Conflict -> 409`.
  2. **Ràng buộc tiền mặt:** Phương thức `TIEN_MAT` CHỈ ĐƯỢC PHÉP sử dụng cho kênh `TAI_QUAY` (`BusinessRule -> 400` nếu khách online chọn tiền mặt).
  3. **Hủy giao dịch cũ khi đổi phương thức:** Nếu đơn đang có giao dịch ở trạng thái `DANG_XU_LY` (ví dụ khách bấm thanh toán VietQR hiện mã QR nhưng sau đó đổi ý chọn sang MoMo) -> Giao dịch cũ bị chuyển sang `DA_HUY` để vô hiệu hóa mã QR cũ.
  4. **Xử lý theo cổng thanh toán:**
     - **Thanh toán Tiền mặt (`TIEN_MAT`):** Ghi nhận `Payment` thành công (`THANH_CONG`) ngay lập tức, gọi `_finalize`.
     - **Thanh toán Điện tử:** Gọi `PaymentGateway.charge(order_id, total, method, simulate)`:
       + Trả về `SUCCESS`: Ghi nhận `Payment` thành công, lưu `transaction_id`, gọi `_finalize`.
       + Trả về `PROCESSING`: Ghi nhận `Payment` trạng thái `DANG_XU_LY`, trả về mã `qr_content` cho client quét mã VietQR.
       + Trả về `FAILED`: Ghi nhận `Payment` trạng thái `THAT_BAI`. Giữ nguyên đơn hàng ở `CHO_THANH_TOAN` để khách thử lại phương thức khác trước khi hết hạn giữ chỗ.

### 5.4. Hoàn tất Đơn hàng, Xuất vé & Phát hành mã QR
Hàm `_finalize` thực hiện các chuyển đổi trạng thái mang tính quyết định:
1. **Vé xe (`Ticket`):** Chuyển trạng thái từ `CHO_THANH_TOAN` sang `CHUA_DI` (UNUSED). Phát hành mã QR ngẫu nhiên an toàn qua `secrets.token_urlsafe(16)`.
2. **Ghế chuyến xe (`TripSeat`):** Chuyển trạng thái từ `TAM_KHOA` (HELD) sang `DA_BAN` (SOLD).
3. **Đơn hàng (`Order`):** Chuyển trạng thái từ `CHO_THANH_TOAN` sang `DA_THANH_TOAN` (PAID).
4. **Hiệu ứng phụ:**
   - Bắn sự kiện WebSocket `ORDER_PAID` tới OrderHub (`/ws/orders/{order_id}`).
   - Bắn sự kiện WebSocket `SEATS_BOOKED` tới TripSeatHub (`/ws/trips/{trip_id}/seats`).
   - Gửi SMS Mock thông báo mã vé, giờ chạy và mã QR đến SĐT hành khách.

### 5.5. Xử lý Webhook Thanh toán muộn (Late Webhook)
- **Mã nguồn:** `backend/app/application/use_cases/booking.py` (`handle_webhook`).
- **Endpoint:** `POST /payments/webhook` (Yêu cầu Header `x-gateway-key`).
- **Đặc tính Idempotent:** Gọi lại nhiều lần với cùng một `transaction_id` không làm thay đổi trạng thái và không phát vé hai lần.
- **Kịch bản Tiền về muộn (Late Payment):**
  - Khách quét QR chuyển khoản nhưng đơn hàng đã bị quá hạn giữ chỗ (đã chuyển sang `THAT_BAI` hoặc `DA_HUY`), hoặc giao dịch đã bị hủy do khách đổi phương thức trước đó.
  - Khi cổng thanh toán báo tiền về thành công: Hệ thống phát hiện đơn không còn ở trạng thái `CHO_THANH_TOAN` hợp lệ.
  - **Tự động xử lý:** Hệ thống ghi nhận thanh toán thành công, đồng thời **TỰ ĐỘNG SINH LỆNH HOÀN TIỀN 100% (`_refund_late_payment`)** hoàn trả lại số tiền về cho khách hàng (lý do: `THANH_TOAN_QUA_HAN`). Nếu cổng từ chối hoàn tự động, lệnh hoàn được đẩy vào hàng đợi chờ xử lý thủ công của Admin (UC18).

### 5.6. Hủy Đơn hàng chờ thanh toán
- **Endpoint:** `POST /orders/{order_id}/cancel-pending`.
- **Luồng xử lý (`_close_pending`):**
  - Khách chủ động hủy đơn khi chưa thanh toán:
  - Chuyển trạng thái đơn sang `DA_HUY`.
  - Hủy các vé tạm (`TicketStatus.CANCELLED`).
  - Hủy các giao dịch đang xử lý (`PaymentStatus.CANCELLED`).
  - Giải phóng ghế giữ chỗ trên chuyến về `TRONG`.
  - **Hoàn trả lượt dùng voucher (`coupons.release_one`):** Trả lại 1 lượt dùng cho mã giảm giá để người khác có thể sử dụng.
  - Bắn sự kiện WebSocket `ORDER_CANCELLED` và `SEATS_RELEASED`.

### 5.7. In phôi vé giấy tại Quầy
- **Endpoint:** `GET /counter/orders/{order_id}/receipts`.
- **Quy tắc:** Chỉ áp dụng cho đơn bán tại quầy (`channel == TAI_QUAY`) và đã thanh toán thành công (`status == DA_THANH_TOAN`).
- Cho phép nhân viên in lại phôi vé giấy nhiều lần nếu máy in bị kẹt giấy hoặc mờ mực.

---

## 6. PHÂN HỆ KHUYẾN MÃI & VOUCHER (COUPONS)

### 6.1. Tạo mới & Quản lý Trạng thái Mã giảm giá (UC15)
- **Mã nguồn:** `backend/app/application/use_cases/coupons.py`, `backend/app/domain/entities/coupon.py`.
- **Quy tắc kiểm tra khi tạo:**
  - `valid_to > valid_from` (Thời hạn kết thúc phải sau thời hạn bắt đầu).
  - Loại `PHAN_TRAM`: Giá trị `value` phải nằm trong khoảng `(0, 100]`.
  - Mã voucher (`code`) tự động chuyển thành chữ hoa và là duy nhất (`Conflict -> 409` nếu trùng).
- **Quy tắc bảo toàn lịch sử:** Không cung cấp API xóa mã voucher để tránh làm sai lệch dữ liệu tài chính lịch sử. Chỉ cung cấp tính năng bật/tắt kích hoạt (`toggle` giữa `BAT` và `TAT`).

### 6.2. Kiểm tra & Tính toán Mức giảm giá (Validation & Calculation)
Hàm `coupon.problem(now, amount)` kiểm tra tuần tự 4 điều kiện nghiêm ngặt:
1. `status == CouponStatus.ON`: Mã phải đang được bật (nếu tắt -> "Mã giảm giá đang tắt").
2. `valid_from <= now <= valid_to`: Thời điểm áp dụng phải trong khung hiệu lực (nếu không -> "Mã giảm giá chưa tới hoặc đã quá thời hạn").
3. `used < quantity`: Số lượt đã dùng chưa vượt quá số lượng phát hành (nếu hết -> "Mã giảm giá đã hết lượt sử dụng").
4. `amount >= min_order`: Giá trị đơn hàng trước giảm phải đạt mức tối thiểu (nếu không -> "Đơn hàng chưa đạt mức tối thiểu...").

**Công thức tính mức giảm (`discount_for`):**
- Nếu loại `PHAN_TRAM`:
  $$\text{discount} = \min\left(\text{amount} \times \frac{\text{value}}{100}, \text{max\_discount}\right)$$
- Nếu loại `SO_TIEN`:
  $$\text{discount} = \min(\text{value}, \text{amount})$$
- Kết quả làm tròn đến 2 chữ số thập phân (`ROUND_HALF_UP`).

### 6.3. Thuật toán Phân bổ Giảm giá vào từng Vé (`allocate_discount`)
- **Mã nguồn:** `backend/app/domain/rules/pricing.py`.
- **Mục tiêu:** Khi một đơn hàng mua nhiều vé áp dụng voucher giảm giá chung, mức giảm giá phải được chia nhỏ vào từng chiếc vé theo tỷ lệ giá gốc để phục vụ việc in vé lẻ và tính tiền hoàn khi khách hủy lẻ từng vé.
- **Thuật toán dồn số dư cent vào vé cuối:**
  1. Tính tỷ lệ giảm cho từng vé $i$:
     $$d_i = \text{round}\left(\text{price}_i \times \frac{\text{total\_discount}}{\text{total\_price}}, 2\right)$$
  2. Tính tổng các phần đã chia: $S = \sum d_i$.
  3. Dồn phần chênh lệch làm tròn vào vé cuối cùng:
     $$d_{\text{cuối}} = d_{\text{cuối}} + (\text{total\_discount} - S)$$
  4. Đảm bảo: $\sum d_i \equiv \text{total\_discount}$ tuyệt đối chính xác 100%, không lệch dù chỉ 1 xu.

---

## 7. PHÂN HỆ TRA CỨU VÉ, HỦY VÉ & HOÀN TIỀN

### 7.1. Lịch sử Mua vé & Trạng thái Động (UC07)
- **Mã nguồn:** `backend/app/application/use_cases/tickets.py` (`history`), `backend/app/domain/entities/booking.py`.
- **Endpoint:** `GET /me/tickets`.
- **Quy tắc trạng thái động (`display_status`):**
  - Hệ thống KHÔNG cần chạy cron job cập nhật trạng thái vé sang `DA_HOAN_THANH`.
  - Khi người dùng đọc danh sách vé: Nếu vé có trạng thái trong DB là `CHUA_DI` (UNUSED) nhưng giờ xe chạy `departure_at <= now_vn()`, hệ thống tự động suy diễn hiển thị là `DA_HOAN_THANH` (COMPLETED).
  - Danh sách được sắp xếp theo ngày khởi hành giảm dần (chuyến mới nhất lên đầu).

### 7.2. Tra cứu Soát vé cho Nhân viên (UC24)
- **Endpoint:** `GET /tickets/lookup`.
- **Tham số tra cứu:** Hỗ trợ tìm kiếm theo `ticket_id`, mã vé `code` (ví dụ `VE-261112-0017`), mã `qr` token, hoặc số điện thoại hành khách `phone`.
- Cho phép nhân viên nhà xe kiểm tra nhanh tính hợp lệ của vé khi hành khách lên xe.

### 7.3. Báo giá Phí hủy vé (`cancel_quote`)
- **Mã nguồn:** `backend/app/application/use_cases/refunds.py` (`quote`).
- **Endpoint:** `GET /tickets/{ticket_id}/cancel-quote`.
- **Điều kiện cho phép hủy:**
  1. Vé phải ở trạng thái `CHUA_DI` (đã thanh toán và chưa hoàn thành).
  2. Thời gian còn lại trước giờ khởi hành:
     $$\text{hours\_left} = \frac{\text{departure\_at} - \text{now\_vn()}}{3600} \ge \text{HAN\_HUY\_VE\_GIO (24 giờ)}$$
  3. Nếu `hours_left < 24`: Từ chối hủy ("Chỉ được hủy khi còn ít nhất 24 giờ trước giờ khởi hành").
  4. Nếu vé trả bằng tiền mặt (`TIEN_MAT`) và người yêu cầu là khách hàng: Từ chối hủy online ("Vé trả bằng tiền mặt chỉ hủy được tại quầy").
- **Công thức tính phí và tiền hoàn:**
  - Phí hủy: $\text{fee} = \text{round}\left(\text{amount} \times \frac{15}{100}, 2\right)$ (tính trên số tiền thực trả của vé).
  - Số tiền hoàn lại cho khách: $\text{refund\_amount} = \text{amount} - \text{fee}$.

### 7.4. Khách hàng Tự hủy vé Trực tuyến (UC05)
- **Endpoint:** `POST /tickets/{ticket_id}/cancel`.
- **Luồng xử lý:**
  1. Kiểm tra quyền: Vé phải thuộc về tài khoản khách đang đăng nhập (`Forbidden -> 403` nếu hủy vé người khác).
  2. Kiểm tra điều kiện qua `quote()` (nếu không đủ -> `BusinessRule -> 400`).
  3. Gọi cổng thanh toán hoàn tiền (`PaymentGateway.refund`):
     - Nếu cổng thành công: Lệnh hoàn tiền nhận trạng thái `DA_HOAN` (DONE).
     - Nếu cổng từ chối/lỗi: Vé **VẪN ĐƯỢC HỦY**, lệnh hoàn tiền chuyển sang trạng thái `CHO_XU_LY_THU_CONG` (MANUAL) để Admin đối soát chi trả sau (UC18).
  4. **Thu hồi vé & Giải phóng ghế (`_release_ticket`):**
     - Vé chuyển trạng thái sang `DA_HUY` (CANCELLED).
     - Ghế trên chuyến chuyển từ `DA_BAN` (SOLD) về `TRONG` (FREE) để mở bán lại.
     - Nếu tất cả các vé trong cùng đơn hàng đều đã bị hủy -> Đơn hàng tự động chuyển sang `DA_HUY`.
  5. Gửi SMS thông báo số tiền hoàn và phí hủy đến số điện thoại hành khách.

### 7.5. Hủy vé tại Quầy Giao dịch (UC06)
- **Endpoint:** `POST /counter/tickets/{ticket_id}/cancel`.
- **Quy tắc đặc thù tại quầy:**
  - Dành cho nhân viên bán vé (`NHAN_VIEN_BAN_VE`).
  - Vé mua bằng tiền mặt: Nhân viên chi tiền mặt trực tiếp cho khách, lệnh hoàn nhận `status = DA_HOAN`, ghi nhận `processed_by = clerk.id`.
  - Tự động in biên nhận hủy vé (`cancel_receipt`) trả về cho khách hàng làm bằng chứng đối soát.

### 7.6. Nhà xe Hủy chuyến Hoàn tiền 100% (UC13)
- **Mã nguồn:** `backend/app/application/use_cases/refunds.py` (`cancel_trip`).
- **Endpoint:** `POST /admin/trips/{trip_id}/cancel`.
- **Quy trình xử lý hoàn tiền 100%:**
  1. Kiểm tra: Chuyến chưa bị hủy trước đó và chưa khởi hành.
  2. Khóa chuyến: Cập nhật `Trip.status = DA_HUY`, lưu lý do hủy, ngừng bán vé ngay lập tức.
  3. **Xử lý toàn bộ vé đã thanh toán:**
     - Sinh lệnh hoàn tiền với mức phí bằng 0: $\text{fee} = 0$, $\text{amount} = \text{ticket.amount}$ (Hoàn 100%).
     - Lý do hoàn: `NHA_XE_HUY_CHUYEN`.
     - Hủy vé và giải phóng ghế.
     - Gửi tin nhắn SMS xin lỗi và thông báo hoàn 100% tiền vé cho từng hành khách.
  4. **Xử lý toàn bộ đơn hàng đang chờ thanh toán của chuyến:**
     - Hủy các giao dịch thanh toán đang xử lý.
     - Hủy vé tạm và nhả ghế giữ chỗ ngay lập tức.
     - Đóng đơn hàng với trạng thái `DA_HUY`.

### 7.7. Xử lý lại Lệnh hoàn tiền thất bại (UC18 / UC23)
- **Endpoint:** `POST /admin/refunds/{refund_id}/retry`.
- Dành cho Quản trị viên xử lý các lệnh hoàn tiền bị kẹt ở trạng thái `CHO_XU_LY_THU_CONG`.
- Admin có thể kích hoạt hoàn lại qua cổng thanh toán (với `simulate='success'`) hoặc xác nhận đã chi tiền mặt ngoài đời thực cho khách để chuyển trạng thái sang `DA_HOAN`.

---

## 8. PHÂN HỆ BÁO CÁO THỐNG KÊ & ĐỐI SOÁT

### 8.1. Báo cáo Doanh thu, Hủy vé & Tỷ lệ Lấp đầy ghế (UC17)
- **Mã nguồn:** `backend/app/application/use_cases/reports.py`.
- **Endpoint:** `GET /admin/reports` (hoặc `/admin/reports/export?format=csv`).
- **Công thức toán học:**
  1. **Doanh thu gộp (Gross Revenue):**
     $$\text{Gross} = \sum \text{Payment.amount} \quad (\text{các giao dịch thanh toán SUCCESS trong kỳ})$$
  2. **Tiền đã hoàn (Refunded):**
     $$\text{Refunded} = \sum \text{Refund.amount} \quad (\text{các lệnh hoàn thực hiện trong kỳ})$$
  3. **Doanh thu thực thu (Net Revenue):**
     $$\text{Net} = \text{Gross} - \text{Refunded}$$
  4. **Tỷ lệ hủy vé (Cancel Rate):**
     $$\text{Cancel Rate} = \frac{\text{tickets\_cancelled}}{\text{tickets\_sold}} \quad (\text{nếu có bán vé})$$
  5. **Tỷ lệ lấp đầy ghế theo tuyến / toàn mạng (Occupancy Rate):**
     $$\text{Occupancy} = \frac{\sum \text{sold\_seats}}{\sum \text{total\_seats}} \quad (\text{tính trên các chuyến chạy trong kỳ})$$
- Hỗ trợ xuất dữ liệu ra file định dạng CSV chuẩn hóa tiếng Việt.

### 8.2. Đối soát Doanh thu Ca trực Quầy (Counter Summary)
- **Endpoint:** `GET /counter/orders?date=YYYY-MM-DD`.
- Dành cho nhân viên bán vé đối soát tiền mặt vào cuối ca trực:
  - Đếm tổng số đơn đã thanh toán trong ngày.
  - Đếm tổng số vé đã phát hành.
  - Tổng doanh thu theo từng phương thức (đặc biệt là tiền mặt `TIEN_MAT` cần nộp lại cho thủ quỹ).

---

## 9. PHÂN HỆ QUẢN TRỊ NGƯỜI DÙNG & CẤU HÌNH THAM SỐ

### 9.1. Quản lý Tài khoản Nội bộ & Phân quyền (UC16)
- **Mã nguồn:** `backend/app/application/use_cases/admin_users.py`.
- **Ràng buộc an ninh:**
  - Admin không thể tự khóa tài khoản của chính mình (`BusinessRule -> 400`).
  - Không cho phép tự đổi vai trò của chính mình.
  - Không cho phép chuyển đổi qua lại giữa tài khoản Khách hàng (`KHACH_HANG`) và Nhân viên nội bộ (`NHAN_VIEN_BAN_VE`, `ADMIN`).
- **Quy trình cấp tài khoản / Đặt lại mật khẩu nhân viên:**
  - Tự động sinh mật khẩu tạm ngẫu nhiên 10 ký tự đạt chuẩn chính sách mật khẩu (`temp_password`).
  - Thiết lập cờ `must_change_password = True` (buộc đổi mật khẩu ngay khi đăng nhập lần đầu).
  - Ghi nhật ký kiểm toán hệ thống (`ActivityLogger`).
- **Khóa tài khoản:**
  - Thu hồi toàn bộ phiên đăng nhập lập tức (`revoke_tokens`).
  - Đếm số vé chưa sử dụng của tài khoản đó (`_unused_tickets`). Nếu còn vé, trả về thông báo cảnh báo nhưng **vé vẫn giữ nguyên hiệu lực đi xe** cho khách.

### 9.2. Cấu hình Tham số Vận hành Hệ thống
- **Mã nguồn:** `backend/app/application/use_cases/settings.py`.
- **Bảng tham số và khoảng chặn an toàn (Validation Ranges):**

| Tên tham số | Giá trị mặc định | Khoảng cho phép | Ý nghĩa nghiệp vụ |
| :--- | :---: | :---: | :--- |
| `THOI_GIAN_GIU_CHO_PHUT` | 15 | 1 – 60 phút | Thời gian khóa tạm ghế để khách thanh toán. |
| `HAN_HUY_VE_GIO` | 24 | 0 – 720 giờ | Số giờ tối thiểu trước giờ chạy được phép hủy vé. |
| `PHI_HUY_PHAN_TRAM` | 15 | 0 – 100 % | Tỷ lệ phần trăm khấu trừ phí khi hủy vé. |
| `OTP_HIEU_LUC_GIAY` | 120 | 30 – 600 giây | Thời hạn hiệu lực của mã OTP SMS. |
| `OTP_SO_LAN_THU_TOI_DA` | 5 | 1 – 10 lần | Số lần nhập sai OTP tối đa trước khi hủy mã. |
| `OTP_GUI_LAI_GIAY` | 60 | 10 – 300 giây | Khoảng thời gian chờ tối thiểu giữa 2 lần gửi lại OTP. |
| `DANG_NHAP_SAI_TOI_DA` | 5 | 1 – 20 lần | Số lần nhập sai mật khẩu tối đa trước khi khóa tài khoản. |
| `DANG_NHAP_KHOA_PHUT` | 15 | 1 – 1440 phút | Thời gian khóa tài khoản tạm thời do đăng nhập sai. |

---

## 10. BẢNG TRA CỨU MÃ LỖI HTTP & CHEAT SHEET KIỂM THỬ

### 10.1. Bảng Tra cứu Mã lỗi HTTP Toàn hệ thống

| Mã HTTP | Tên ngoại lệ (Domain/App Error) | Nguyên nhân kích hoạt cụ thể |
| :---: | :--- | :--- |
| **400** | `InvalidOtp` | Nhập sai mã OTP, mã đã hết hạn 120s, hoặc đã thử sai quá 5 lần. |
| **400** | `WrongCurrentPassword` | Nhập sai mật khẩu hiện tại khi đổi mật khẩu hoặc đổi số điện thoại. |
| **400** | `SamePassword` | Mật khẩu mới trùng với mật khẩu cũ khi thực hiện đổi mật khẩu. |
| **400** | `BusinessRule` | Vi phạm quy tắc nghiệp vụ (chọn tiền mặt cho đơn online, hủy vé dưới 24h, xe chưa có ghế...). |
| **401** | `InvalidCredentials` | Số điện thoại không tồn tại hoặc mật khẩu đăng nhập không chính xác. |
| **401** | `InvalidToken` | Token JWT hết hạn, sai chữ ký, hoặc phiên đã bị thu hồi (`token_version` không khớp). |
| **403** | `AccountDisabled` | Tài khoản đã bị Quản trị viên vô hiệu hóa (`status = 'KHOA'`). |
| **403** | `Forbidden` | Không có quyền hạn truy cập (khách xem vé người khác, nhân viên không đủ quyền admin). |
| **404** | `NotFound` | Không tìm thấy ID chuyến, tuyến, xe, ghế, đơn hàng hoặc vé yêu cầu. |
| **409** | `Conflict` | Xung đột đồng thời (ghế đã bị người khác giữ/mua, tuyến/biển số/mã voucher đã tồn tại). |
| **409** | `PhoneAlreadyRegistered` | Số điện thoại đã được đăng ký bởi một tài khoản khác trong hệ thống. |
| **422** | `WeakPassword` | Mật khẩu không thỏa mãn chính sách bảo mật (ít hơn 8 ký tự, hoặc thiếu chữ/số). |
| **423** | `LoginTemporarilyLocked` | Tài khoản đang bị khóa tạm thời 15 phút do nhập sai mật khẩu 5 lần liên tiếp. |
| **429** | `OtpRequestedTooSoon` | Yêu cầu gửi lại OTP quá nhanh (chưa hết thời gian chờ chống spam 60 giây). |

### 10.2. Cheat Sheet Kiểm thử Nhanh trên Postman & UI

#### A. Tham số mô phỏng Cổng thanh toán giả lập (`simulate`):
Khi gọi API thanh toán `POST /orders/{id}/pay` hoặc hủy vé `POST /tickets/{id}/cancel`:
- `simulate: "success"`: Cổng xác nhận thành công ngay lập tức -> Đơn sang `DA_THANH_TOAN`, vé sang `CHUA_DI`.
- `simulate: "fail"`: Cổng từ chối thanh toán -> Thanh toán ghi nhận `THAT_BAI`, đơn giữ nguyên `CHO_THANH_TOAN` để thử lại.
- `simulate: "pending"`: Cổng trả về trạng thái đang chờ xử lý -> Trả về mã QR VietQR để người dùng quét mã.

#### B. Kiểm tra phản hồi mã OTP thử nghiệm (SMS Mock):
- Khi gọi `POST /auth/register/otp` hoặc `POST /auth/password/forgot/otp`:
- Trong môi trường phát triển / thử nghiệm, phản hồi API trả về trường `mock_otp` (ví dụ: `"mock_otp": "123456"`). Tester có thể lấy trực tiếp mã này điền vào ô xác nhận mà không cần điện thoại thật.

#### C. Kịch bản Test Concurrency Control (Race Condition):
- Mở 2 trình duyệt ẩn danh khác nhau, đăng nhập 2 tài khoản khách hàng.
- Cùng mở sơ đồ ghế của chuyến xe `trip_id = 1`.
- Cả hai tài khoản cùng gửi request `POST /trips/1/hold` chọn ghế `A01`.
- **Kết quả kỳ vọng:** Đúng 1 tài khoản nhận HTTP 200 (giữ thành công, ghế đổi màu vàng). Tài khoản còn lại nhận HTTP 409 Conflict (`unavailable_seat_ids: [...]`).
