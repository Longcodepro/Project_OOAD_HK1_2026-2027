# CẨM NANG TEST TỪNG CHỨC NĂNG, DANH MỤC ENDPOINT & KỊCH BẢN POSTMAN

> **Dự án:** Hệ thống Quản trị & Đặt vé xe khách liên tỉnh (OOAD Bus Lines)  
> **Bộ dữ liệu mẫu chân thực mới nhất:**  
> • **Khoảng thời gian lịch sử:** Từ **01/10/2026** đến **17/11/2026** (48 ngày với **1.104 chuyến xe** đã hoàn thành, **26.125 vé** và đơn hàng chân thực, 389 lệnh hoàn tiền).  
> • **Lịch trình tương lai:** **887 chuyến xe** mở bán từ **18/11/2026** đến **18/12/2026**, có sẵn **2.741 vé đã đặt trước** (`CHUA_DI`) để sơ đồ ghế có màu ghế bán/trống sống động.  
> • **Biển số xe thực tế:** 22 xe thuộc các tỉnh thành lớn (`51B-284.73`, `29B-184.29`, `49B-018.47`, `79B-028.63`, `43B-047.81`, `65B-016.78`...).  
> • **Các ca đặc thù có sẵn:** Chuyến xe bị hủy bất khả kháng do sạt lở đèo Sa Pa ngày 28/10/2026 (hoàn 100%); Lệnh hoàn tiền bị lỗi cổng chờ Admin duyệt thủ công (`CHO_XU_LY_THU_CONG`) của khách `0900000012`.  
> • **Trạng thái kiểm thử tự động:** **33/33** API công khai PASS, **44/44** E2E steps PASS, **10 luồng** Concurrency Race Condition PASS 100%.

---

## 1. THÔNG TIN MÔI TRƯỜNG & TÀI KHOẢN TEST

### 1.1 Địa chỉ máy chủ (Base URLs)
* **Frontend Web**: `http://localhost:5173` (Cổng Khách hàng: `/`, Cổng Quản trị & Quầy: `/#/admin`).
* **Backend API trực tiếp**: `http://localhost:8005` (hoặc `http://localhost:8005/api`).
* **Tài liệu Swagger UI**: `http://localhost:8005/docs` (kiểm tra trực tiếp trên trình duyệt).

### 1.2 Danh sách tài khoản thử nghiệm có sẵn trong CSDL
| Số điện thoại | Mật khẩu | Vai trò (`Role`) | Mục đích test |
| :--- | :--- | :--- | :--- |
| `0900000002` | `Khach12345` | **KHACH_HANG** | Khách hàng online (Nguyễn Văn An): đã có lịch sử vé và vé sắp đi. |
| `0900000010` | `Khach12345` | **KHACH_HANG** | Khách hàng online (Trần Thị Bình): có lịch sử vé thanh toán VietQR. |
| `0900000012` | `Khach12345` | **KHACH_HANG** | Khách hàng (Phạm Minh Đức): có lệnh hoàn tiền lỗi chờ Admin duyệt. |
| `0983124567` | `Khach12345` | **KHACH_HANG** | Khách hàng thân thiết (Lê Văn Tuấn): tài khoản người dùng thực tế. |
| `0900000001` | `Staff12345` | **NHAN_VIEN_BAN_VE** | Nhân viên quầy Mỹ Đình: bán vé POS, in vé, soát vé QR. |
| `0900000003` | `Staff12345` | **NHAN_VIEN_BAN_VE** | Nhân viên quầy Miền Đông: bán vé POS, đối soát doanh thu ca trực. |
| `0900000000` | `Admin12345` | **ADMIN** | Quản trị viên hệ thống: xem KPI doanh thu, duyệt hoàn tiền, quản lý chuyến/tuyến/xe. |

---

## 2. FILE POSTMAN COLLECTION ĐÃ CÓ SẴN TRONG PROJECT

Hệ thống đã có sẵn 2 bộ sưu tập Postman chuẩn hóa để bạn mở test ngay:
1. **Bộ sưu tập toàn diện (Khuyên dùng)**:  
   [`backend/tests/postman/OOAD_API_Tests.postman_collection.json`](file:///home/long/Documents/University/HOCTAP/HK7/Object-Oriented Analysis and Design (OOAD)/DoAn/Project_OOAD_HK1_2026-2027/backend/tests/postman/OOAD_API_Tests.postman_collection.json)  
   * **17 thư mục**, **396 requests**, **607 assertions** tự động kiểm tra status code và nội dung JSON.  
   * Biến môi trường: `base_url` mặc định là `http://localhost:8005` (nếu chạy qua Docker) hoặc `http://localhost:8000`.
2. **Bộ sưu tập tinh gọn**:  
   [`Vexe_API_Collection.postman_collection.json`](file:///home/long/Documents/University/HOCTAP/HK7/Object-Oriented Analysis and Design (OOAD)/DoAn/Project_OOAD_HK1_2026-2027/Vexe_API_Collection.postman_collection.json)  
   * **79 requests** chuẩn hóa theo từng Use Case.

---

## 3. DANH MỤC CHI TIẾT CÁC CHỨC NĂNG, ENDPOINT & TEST CASES

---

### NHÓM 1: XÁC THỰC, TÀI KHOẢN & BẢO MẬT (UC01, UC02, UC10, UC11)

#### 1.1 Đăng nhập lấy Bearer Token (UC02)
* **Endpoint**: `POST /auth/login`
* **Test Case 1 (Happy Path)**: Đăng nhập đúng SĐT và Mật khẩu.
  * **Body**:
    ```json
    {
      "phone": "0900000002",
      "password": "Khach12345"
    }
    ```
  * **Kỳ vọng**: HTTP `200 OK`, JSON trả về `access_token` (JWT) và `token_type: "bearer"`.
* **Test Case 2 (Negative - Sai mật khẩu)**:
  * **Body**: `{"phone": "0900000002", "password": "SaiMatKhau"}`
  * **Kỳ vọng**: HTTP `400 Bad Request` hoặc `401 Unauthorized` ("Số điện thoại hoặc mật khẩu không đúng").
* **Test Case 3 (Security - Khóa tài khoản sau 5 lần sai)**:
  * Nhập sai 5 lần liên tiếp $\rightarrow$ Lần thứ 6 nhận HTTP `403 Forbidden` ("Tài khoản bị tạm khóa 15 phút").

#### 1.2 Đăng ký tài khoản bằng OTP giả lập (UC01)
* **Bước 1**: `POST /auth/register/otp`
  * **Body**: `{"phone": "0988111222"}`
  * **Kỳ vọng**: HTTP `200 OK`, response trả về `mock_otp: "123456"` (hoặc 6 số ngẫu nhiên do `SMS_MOCK=true`).
* **Bước 2**: `POST /auth/register`
  * **Body**:
    ```json
    {
      "phone": "0988111222",
      "password": "MatKhauMoi123",
      "full_name": "Nguyễn Văn Test",
      "otp": "123456"
    }
    ```
  * **Kỳ vọng**: HTTP `201 Created`, tài khoản được tạo thành công.

---

### NHÓM 2: TRA CỨU TUYẾN & CHUYẾN XE (UC03)

#### 2.1 Xem danh sách tuyến đang khai thác
* **Endpoint**: `GET /routes`
* **Headers**: Không yêu cầu token.
* **Kỳ vọng**: HTTP `200 OK`, mảng các tuyến đường kèm giá vé thấp nhất (`from_price`) và số chuyến sắp chạy.

#### 2.2 Tìm kiếm chuyến xe công khai
* **Endpoint**: `GET /trips/search?origin=TP.+Hồ+Chí+Minh&destination=Đà+Lạt&date=2026-11-21`
* **Test Case 1 (Có chuyến)**:
  * **Kỳ vọng**: HTTP `200 OK`, `items` chứa danh sách chuyến, mỗi chuyến có `id`, `departure_time`, `price`, `available_seats`.
* **Test Case 2 (Không truyền param `date`)**:
  * **Kỳ vọng**: HTTP `422 Unprocessable Entity` (báo thiếu query parameter bắt buộc).

---

### NHÓM 3: SƠ ĐỒ GHẾ & GIỮ CHỖ THỜI GIAN THỰC (UC04, UC05)

#### 3.1 Lấy sơ đồ trạng thái ghế
* **Endpoint**: `GET /trips/{trip_id}/seats` (ví dụ `trip_id = 370`)
* **Kỳ vọng**: HTTP `200 OK`, danh sách các vị trí ghế với mã (`A01`, `B01`), tầng (`floor: 1 | 2`) và trạng thái (`TRONG`, `TAM_KHOA`, `DA_BAN`).
* **Thực tế:** Các chuyến trong 7 ngày tới đã có khoảng 35%-50% số ghế màu đỏ/xám (`DA_BAN`), các ghế còn lại trống màu xanh để chọn.

#### 3.2 Khóa tạm giữ ghế 15 phút (UC04)
* **Endpoint**: `POST /trips/{trip_id}/hold`
* **Headers**: `Authorization: Bearer <token_khach_hoac_staff>`
* **Body**:
  ```json
  {
    "seat_ids": [477]
  }
  ```
* **Test Case 1 (Giữ ghế thành công)**:
  * **Kỳ vọng**: HTTP `200 OK`, `seconds_left: 900` (15 phút), trạng thái ghế chuyển sang `TAM_KHOA`.
  * **WebSocket**: Bắn sự kiện `SEATS_HELD` tới mọi client đang mở `/ws/trips/{trip_id}`.
* **Test Case 2 (Race Condition - Ghế đã có người giữ)**:
  * Gửi lại request với cùng `seat_ids`:
  * **Kỳ vọng**: HTTP `409 Conflict` ("Ghế không còn trống").

#### 3.3 Nhả ghế giữ chỗ (UC05)
* **Endpoint**: `POST /trips/{trip_id}/release`
* **Body**: `{"seat_ids": [477]}`
* **Kỳ vọng**: HTTP `200 OK`, ghế trở về trạng thái `TRONG`.

---

### NHÓM 4: ĐẶT VÉ TRỰC TUYẾN & ÁP MÃ GIẢM GIÁ (UC06, UC07)

#### 4.1 Kiểm tra & Áp dụng Voucher
* **Endpoint**: `POST /coupons/validate`
* **Body**:
  ```json
  {
    "code": "CHAOBAN",
    "order_amount": 300000
  }
  ```
* **Test Case 1 (Voucher hợp lệ)**:
  * **Kỳ vọng**: HTTP `200 OK`, `valid: true`, `discount_amount: 30000` (giảm 10%).
* **Test Case 2 (Voucher hết hạn hoặc tắt)**:
  * Mã `HETHAN` hoặc `DANGTAT` $\rightarrow$ `valid: false` kèm lý do lỗi.

#### 4.2 Tạo đơn đặt vé trực tuyến (UC06)
* **Endpoint**: `POST /orders`
* **Headers**: `Authorization: Bearer <token_khach>`
* **Body**:
  ```json
  {
    "trip_id": 370,
    "items": [
      {
        "seat_id": 477,
        "passenger_name": "Nguyễn Văn Test",
        "passenger_phone": "0900000002"
      }
    ],
    "coupon_code": "CHAOBAN"
  }
  ```
* **Kỳ vọng**: HTTP `201 Created`, đơn hàng có trạng thái `CHO_THANH_TOAN`, tổng tiền đã trừ voucher, sinh mã đơn `ORD-...`.

#### 4.3 Thanh toán đơn hàng (UC07)
* **Endpoint**: `POST /orders/{order_id}/pay`
* **Body**:
  ```json
  {
    "method": "VIETQR",
    "simulate": "success"
  }
  ```
* **Kỳ vọng**: HTTP `200 OK`, `result: "THANH_CONG"`, trạng thái đơn đổi thành `DA_THANH_TOAN`, vé đổi thành `CHUA_DI`.
* **WebSocket**: Bắn sự kiện `ORDER_PAID` tới `/ws/orders/{order_id}`.

---

### NHÓM 5: TRA CỨU, XEM VÉ & IN VÉ ĐIỆN TỬ PDF (UC08, UC10)

#### 5.1 Lịch sử vé của tôi
* **Endpoint**: `GET /me/tickets?status=CHUA_DI`
* **Headers**: `Authorization: Bearer <token_khach>`
* **Kỳ vọng**: HTTP `200 OK`, trả về các vé chưa đi của khách hàng.

#### 5.2 Tải vé điện tử PDF khổ in chuẩn A4
* **Endpoint**: `GET /tickets/{ticket_id}/pdf`
* **Kỳ vọng**: HTTP `200 OK`, `Content-Type: application/pdf`, nội dung file PDF bắt đầu bằng `%PDF`, hiển thị đầy đủ tiếng Việt có dấu Unicode và mã QR.

#### 5.3 Tra cứu vé công khai (Dành cho khách/nhân viên)
* **Endpoint**: `GET /tickets/lookup?ticket_id={ticket_id}` hoặc `GET /tickets/lookup?phone=0900000002`
* **Kỳ vọng**: HTTP `200 OK`, hiển thị chi tiết hành trình mà không bắt buộc đăng nhập.

---

### NHÓM 6: HỦY VÉ & HOÀN TIỀN (UC09)

#### 6.1 Xem báo giá hủy vé
* **Endpoint**: `GET /tickets/{ticket_id}/cancel-quote`
* **Kỳ vọng**: HTTP `200 OK`, trả về:
  * `eligible: true` (nếu còn $\ge 24\text{h}$ trước giờ khởi hành).
  * `fee_percent: 15`.
  * `refund_amount`: số tiền hoàn lại sau khi trừ phí 15%.

#### 6.2 Thực hiện hủy vé online
* **Endpoint**: `POST /tickets/{ticket_id}/cancel`
* **Body**: `{"simulate": "success"}`
* **Kỳ vọng**: HTTP `200 OK`, trạng thái vé chuyển sang `DA_HUY`, sinh mã hoàn tiền `HT-...`, ghế trên chuyến được tự động giải phóng về `TRONG`.

---

### NHÓM 7: BÁN VÉ TẠI QUẦY - POS (UC11, UC12, UC13)

#### 7.1 Lập phiếu bán vé quầy
* **Endpoint**: `POST /counter/orders`
* **Headers**: `Authorization: Bearer <token_staff>`
* **Body**:
  ```json
  {
    "trip_id": 370,
    "items": [
      {
        "seat_id": 478,
        "passenger_name": "Khách Vãng Lai",
        "passenger_phone": "0911222333"
      }
    ]
  }
  ```
* **Kỳ vọng**: HTTP `201 Created`, kênh ghi nhận `TAI_QUAY`.

#### 7.2 Thu tiền mặt & In phôi vé giấy POS
* **Bước 1**: `POST /orders/{order_id}/pay` với `method: "TIEN_MAT"`.
* **Bước 2**: `GET /counter/orders/{order_id}/receipts`
  * **Kỳ vọng**: HTTP `200 OK`, trả về nội dung phôi in nhiệt (Mã vé, hành trình, giá vé, giờ in).

#### 7.3 Đối soát doanh thu ca trực của nhân viên
* **Endpoint**: `GET /counter/orders`
* **Headers**: `Authorization: Bearer <token_staff>`
* **Kỳ vọng**: HTTP `200 OK`, tổng hợp số đơn đã bán, số vé và tổng tiền thu theo từng phương thức (Tiền mặt, VietQR).

---

### NHÓM 8: QUẢN TRỊ VIÊN HỆ THỐNG - ADMIN (UC15 $\rightarrow$ UC24)

#### 8.1 Thống kê & Báo cáo doanh thu thời gian thực (UC15, UC16)
* **Endpoint**: `GET /admin/reports?date_from=2026-10-01&date_to=2026-11-30`
* **Headers**: `Authorization: Bearer <token_admin>`
* **Kỳ vọng**: HTTP `200 OK`, trả về biểu đồ doanh thu liên tục từ đầu tháng 10 đến tháng 11, phản ánh đúng chu kỳ ngày thường và cuối tuần.
* **Xuất file**:
  * CSV: `GET /admin/reports/export.csv?date_from=2026-10-01&date_to=2026-11-30`
  * XLSX: `GET /admin/reports/export.xlsx?date_from=2026-10-01&date_to=2026-11-30`
  * PDF: `GET /admin/reports/export.pdf?date_from=2026-10-01&date_to=2026-11-30`

#### 8.2 Xử lý lại lệnh hoàn tiền bị lỗi (UC17)
* **Endpoint**: `POST /admin/refunds/{refund_id}/retry`
* **Kỳ vọng**: HTTP `200 OK`, lệnh hoàn tiền từ `CHO_XU_LY_THU_CONG` chuyển sang `DA_HOAN`.

#### 8.3 Khóa / Mở khóa tài khoản người dùng (UC22)
* **Khóa tài khoản**: `POST /admin/users/{user_id}/lock`
* **Mở khóa**: `POST /admin/users/{user_id}/unlock`

---

## 4. HƯỚNG DẪN THỰC HIỆN TEST LẠI

1. **Test nhanh bằng Postman**:
   * Mở Postman $\rightarrow$ **Import** $\rightarrow$ Chọn file [`backend/tests/postman/OOAD_API_Tests.postman_collection.json`](file:///home/long/Documents/University/HOCTAP/HK7/Object-Oriented Analysis and Design (OOAD)/DoAn/Project_OOAD_HK1_2026-2027/backend/tests/postman/OOAD_API_Tests.postman_collection.json).
   * Chạy thư mục `00. Chuẩn bị` trước để đăng nhập và thiết lập biến môi trường.
   * Chạy tiếp từng thư mục chức năng mong muốn (ví dụ: `05. Giữ chỗ tạm thời`, `07. Đặt vé online`).
2. **Test trực tiếp trên Giao diện Web (UI)**:
   * Mở trình duyệt tại `http://localhost:5173`.
   * Thử luồng khách: Tìm chặng **TP. Hồ Chí Minh $\rightarrow$ Đà Lạt** (chọn ngày 21/11/2026), chọn ghế, áp mã `CHAOBAN`, quét mã QR thanh toán.
   * Thử luồng quầy/admin: Vào `http://localhost:5173/#/admin`, đăng nhập bằng `0900000001` (Staff) hoặc `0900000000` (Admin) để thao tác bán vé POS và xem biểu đồ báo cáo từ tháng 10/2026.
