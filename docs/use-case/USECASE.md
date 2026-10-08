# ĐẶC TẢ USE CASE — HỆ THỐNG ĐẶT VÉ XE KHÁCH TRỰC TUYẾN

> Tài liệu này mô tả toàn bộ sơ đồ Use Case của đồ án, viết để AI đọc và sinh code.
> Nguồn gốc: file `UseCase_DatVeXeKhach.drawio` (17 sơ đồ). Mọi thay đổi phải sửa ở file
> draw.io trước, rồi cập nhật lại tài liệu này.

- **Phiên bản:** 2026-10-07
- **Số sơ đồ:** 17 (16 sơ đồ chức năng + 1 sơ đồ tổng quát)
- **Phạm vi:** website đặt vé xe khách liên tỉnh, luồng mua vé là trọng tâm

---

## 1. ACTOR

### Actor chính (người dùng trực tiếp hệ thống)

| Actor | Vai trò |
|---|---|
| `KHÁCH HÀNG` | Người mua vé qua website. Bắt buộc phải **đăng nhập** để mua vé và hủy vé online. |
| `NHÂN VIÊN BÁN VÉ` | Nhân viên tại quầy, bán vé và hủy vé giúp khách vãng lai. |
| `ADMIN` | Quản trị viên, quản lý chuyến xe, xe, giá vé, tài khoản, xem thống kê. |

### Actor phụ (hệ thống ngoài)

| Actor | Vai trò |
|---|---|
| `CỔNG THANH TOÁN` | Hệ thống thanh toán bên ngoài. Xử lý thanh toán online và hoàn tiền về nguồn gốc. Giả lập bằng mock service. |
| `DỊCH VỤ SMS` | Dịch vụ gửi SMS bên ngoài. Gửi mã OTP tới số điện thoại. |

---

## 2. QUY ƯỚC ĐỌC SƠ ĐỒ

| Ký hiệu | Ý nghĩa | Hướng mũi tên |
|---|---|---|
| Đường liền, không mũi tên | Actor thực hiện use case (association) | Không có |
| `«include»` | Use case cơ sở **luôn luôn** gọi use case được include | Từ use case cơ sở → use case được dùng chung |
| `«extend»` | Luồng mở rộng, **có thể xảy ra hoặc không** | Từ use case mở rộng → use case cơ sở |

Quy ước bổ sung:

- Use case được `«include»` hoặc `«extend»` **không nối trực tiếp với actor người**.
- Điều kiện tiên quyết (ví dụ "đã đăng nhập") ghi trong **đặc tả**, không vẽ `«include»` tới
  "Đăng nhập" ở các sơ đồ chi tiết. Chỉ sơ đồ tổng quát mới thể hiện quan hệ này.
- Mỗi use case là **một mục tiêu hoàn chỉnh**, không phải một bước thao tác. Các bước
  (chọn điểm đi, chọn ngày, chọn ghế...) nằm trong luồng cơ bản của đặc tả.

---

## 3. CHI TIẾT 17 SƠ ĐỒ

### 1. Đăng nhập - Đăng xuất

**Actor:** `KHÁCH HÀNG`, `NHÂN VIÊN BÁN VÉ`, `ADMIN`

**Use case:**

- Đăng nhập
- Đăng xuất

**Actor thực hiện:**

- `KHÁCH HÀNG` → Đăng nhập
- `NHÂN VIÊN BÁN VÉ` → Đăng nhập
- `ADMIN` → Đăng nhập
- `KHÁCH HÀNG` → Đăng xuất
- `NHÂN VIÊN BÁN VÉ` → Đăng xuất
- `ADMIN` → Đăng xuất


### 2. Đăng ký tài khoản

**Actor:** `KHÁCH HÀNG`, `DỊCH VỤ SMS`

**Use case:**

- Đăng ký tài khoản
- Xác thực số điện thoại bằng OTP

**Actor thực hiện:**

- `KHÁCH HÀNG` → Đăng ký tài khoản
- Xác thực số điện thoại bằng OTP → `DỊCH VỤ SMS` (actor phụ)

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Đăng ký tài khoản | `«include»` | Xác thực số điện thoại bằng OTP |


### 3. Khôi phục mật khẩu

**Actor:** `KHÁCH HÀNG`, `DỊCH VỤ SMS`

**Use case:**

- Khôi phục mật khẩu
- Xác thực số điện thoại bằng OTP

**Actor thực hiện:**

- `KHÁCH HÀNG` → Khôi phục mật khẩu
- Xác thực số điện thoại bằng OTP → `DỊCH VỤ SMS` (actor phụ)

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Khôi phục mật khẩu | `«include»` | Xác thực số điện thoại bằng OTP |


### 4. Đổi mật khẩu

**Actor:** `KHÁCH HÀNG`, `NHÂN VIÊN BÁN VÉ`, `ADMIN`

**Use case:**

- Đổi mật khẩu

**Actor thực hiện:**

- `KHÁCH HÀNG` → Đổi mật khẩu
- `NHÂN VIÊN BÁN VÉ` → Đổi mật khẩu
- `ADMIN` → Đổi mật khẩu


### 5. Quản lý thông tin cá nhân

**Actor:** `KHÁCH HÀNG`, `NHÂN VIÊN BÁN VÉ`, `ADMIN`

**Use case:**

- Xem thông tin cá nhân
- Cập nhật thông tin cá nhân

**Actor thực hiện:**

- `KHÁCH HÀNG` → Xem thông tin cá nhân
- `NHÂN VIÊN BÁN VÉ` → Xem thông tin cá nhân
- `ADMIN` → Xem thông tin cá nhân

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Cập nhật thông tin cá nhân | `«extend»` | Xem thông tin cá nhân |


### 6. Xem lịch sử mua vé

**Actor:** `KHÁCH HÀNG`

**Use case:**

- Xem lịch sử mua vé
- Lọc lịch sử theo trạng thái vé

**Actor thực hiện:**

- `KHÁCH HÀNG` → Xem lịch sử mua vé

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Lọc lịch sử theo trạng thái vé | `«extend»` | Xem lịch sử mua vé |


### 7. Tra cứu chuyến xe

**Actor:** `KHÁCH HÀNG`, `NHÂN VIÊN BÁN VÉ`

**Use case:**

- Tra cứu chuyến xe
- Lọc kết quả tra cứu

**Actor thực hiện:**

- `KHÁCH HÀNG` → Tra cứu chuyến xe
- `NHÂN VIÊN BÁN VÉ` → Tra cứu chuyến xe

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Lọc kết quả tra cứu | `«extend»` | Tra cứu chuyến xe |


### 8. Đặt vé trực tuyến

**Actor:** `KHÁCH HÀNG`, `CỔNG THANH TOÁN`

**Use case:**

- Áp dụng mã giảm giá
- Đặt vé trực tuyến
- Giữ chỗ tạm thời
- Thanh toán
- Thanh toán qua Ví MoMo / ZaloPay
- Thanh toán qua VietQR / Thẻ

**Actor thực hiện:**

- `KHÁCH HÀNG` → Đặt vé trực tuyến
- Thanh toán → `CỔNG THANH TOÁN` (actor phụ)

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Áp dụng mã giảm giá | `«extend»` | Đặt vé trực tuyến |
| Đặt vé trực tuyến | `«include»` | Giữ chỗ tạm thời |
| Đặt vé trực tuyến | `«include»` | Thanh toán |
| Thanh toán qua Ví MoMo / ZaloPay | `«extend»` | Thanh toán |
| Thanh toán qua VietQR / Thẻ | `«extend»` | Thanh toán |


### 9. Bán vé & in vé tại quầy

**Actor:** `NHÂN VIÊN BÁN VÉ`, `CỔNG THANH TOÁN`

**Use case:**

- Áp dụng mã giảm giá
- Bán vé tại quầy
- Giữ chỗ tạm thời
- Thanh toán
- Thanh toán tiền mặt
- Thanh toán qua VietQR

**Actor thực hiện:**

- `NHÂN VIÊN BÁN VÉ` → Bán vé tại quầy
- Thanh toán qua VietQR → `CỔNG THANH TOÁN` (actor phụ)

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Áp dụng mã giảm giá | `«extend»` | Bán vé tại quầy |
| Bán vé tại quầy | `«include»` | Giữ chỗ tạm thời |
| Bán vé tại quầy | `«include»` | Thanh toán |
| Thanh toán tiền mặt | `«extend»` | Thanh toán |
| Thanh toán qua VietQR | `«extend»` | Thanh toán |


### 10. Hủy vé trực tuyến

**Actor:** `KHÁCH HÀNG`, `CỔNG THANH TOÁN`

**Use case:**

- Hủy vé trực tuyến
- Hoàn tiền

**Actor thực hiện:**

- `KHÁCH HÀNG` → Hủy vé trực tuyến
- Hoàn tiền → `CỔNG THANH TOÁN` (actor phụ)

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Hủy vé trực tuyến | `«include»` | Hoàn tiền |


### 11. Hủy vé tại quầy

**Actor:** `NHÂN VIÊN BÁN VÉ`, `CỔNG THANH TOÁN`

**Use case:**

- Hủy vé tại quầy
- Tra cứu vé
- Hoàn tiền
- In biên nhận hủy vé
- Hoàn tiền mặt
- Hoàn qua cổng thanh toán

**Actor thực hiện:**

- `NHÂN VIÊN BÁN VÉ` → Hủy vé tại quầy
- Hoàn qua cổng thanh toán → `CỔNG THANH TOÁN` (actor phụ)

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Hủy vé tại quầy | `«include»` | Tra cứu vé |
| Hủy vé tại quầy | `«include»` | Hoàn tiền |
| In biên nhận hủy vé | `«extend»` | Hủy vé tại quầy |
| Hoàn tiền mặt | `«extend»` | Hoàn tiền |
| Hoàn qua cổng thanh toán | `«extend»` | Hoàn tiền |


### 12. Quản lý chuyến xe & lịch trình

**Actor:** `ADMIN`, `CỔNG THANH TOÁN`

**Use case:**

- Xem danh sách chuyến xe
- Thêm chuyến xe mới
- Sửa lịch trình chuyến xe
- Hủy chuyến xe
- Tìm kiếm chuyến xe
- Xử lý vé của chuyến bị hủy
- Hoàn tiền

**Actor thực hiện:**

- `ADMIN` → Xem danh sách chuyến xe
- `ADMIN` → Thêm chuyến xe mới
- `ADMIN` → Sửa lịch trình chuyến xe
- `ADMIN` → Hủy chuyến xe
- Hoàn tiền → `CỔNG THANH TOÁN` (actor phụ)

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Tìm kiếm chuyến xe | `«extend»` | Xem danh sách chuyến xe |
| Xử lý vé của chuyến bị hủy | `«extend»` | Hủy chuyến xe |
| Xử lý vé của chuyến bị hủy | `«include»` | Hoàn tiền |


### 13. Quản lý xe & sơ đồ ghế

**Actor:** `ADMIN`

**Use case:**

- Xem danh sách xe
- Thêm xe mới
- Sửa thông tin xe
- Ngừng hoạt động xe
- Xem sơ đồ ghế của xe
- Thiết lập sơ đồ ghế

**Actor thực hiện:**

- `ADMIN` → Xem danh sách xe
- `ADMIN` → Thêm xe mới
- `ADMIN` → Sửa thông tin xe
- `ADMIN` → Ngừng hoạt động xe

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Xem sơ đồ ghế của xe | `«extend»` | Xem danh sách xe |
| Thêm xe mới | `«include»` | Thiết lập sơ đồ ghế |


### 14. Quản lý giá vé & khuyến mãi

**Actor:** `ADMIN`

**Use case:**

- Xem giá vé các chuyến xe
- Cập nhật giá vé chuyến xe
- Xem danh sách mã giảm giá
- Thêm mã giảm giá mới
- Bật / Tắt mã giảm giá

**Actor thực hiện:**

- `ADMIN` → Xem giá vé các chuyến xe
- `ADMIN` → Cập nhật giá vé chuyến xe
- `ADMIN` → Xem danh sách mã giảm giá
- `ADMIN` → Thêm mã giảm giá mới

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Bật / Tắt mã giảm giá | `«extend»` | Xem danh sách mã giảm giá |


### 15. Quản lý tài khoản & phân quyền

**Actor:** `ADMIN`

**Use case:**

- Xem danh sách người dùng
- Tạo tài khoản nhân viên
- Cập nhật tài khoản nhân viên
- Khóa / Mở khóa tài khoản người dùng
- Đặt lại mật khẩu cho nhân viên
- Tìm kiếm tài khoản
- Xem chi tiết hồ sơ & lịch sử hoạt động
- Phân quyền vai trò

**Actor thực hiện:**

- `ADMIN` → Xem danh sách người dùng
- `ADMIN` → Tạo tài khoản nhân viên
- `ADMIN` → Cập nhật tài khoản nhân viên
- `ADMIN` → Khóa / Mở khóa tài khoản người dùng
- `ADMIN` → Đặt lại mật khẩu cho nhân viên

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Tìm kiếm tài khoản | `«extend»` | Xem danh sách người dùng |
| Xem chi tiết hồ sơ & lịch sử hoạt động | `«extend»` | Xem danh sách người dùng |
| Tạo tài khoản nhân viên | `«include»` | Phân quyền vai trò |
| Cập nhật tài khoản nhân viên | `«include»` | Phân quyền vai trò |


### 16. Thống kê & báo cáo doanh thu

**Actor:** `ADMIN`

**Use case:**

- Thống kê doanh thu
- Thống kê vé bán & vé hủy
- Thống kê tỷ lệ lấp đầy chỗ ngồi
- Xem bảng điều khiển doanh thu tổng quan
- Lọc thống kê
- Xuất báo cáo

**Actor thực hiện:**

- `ADMIN` → Thống kê doanh thu
- `ADMIN` → Thống kê vé bán & vé hủy
- `ADMIN` → Thống kê tỷ lệ lấp đầy chỗ ngồi
- `ADMIN` → Xem bảng điều khiển doanh thu tổng quan

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Lọc thống kê | `«extend»` | Thống kê doanh thu |
| Lọc thống kê | `«extend»` | Thống kê vé bán & vé hủy |
| Lọc thống kê | `«extend»` | Thống kê tỷ lệ lấp đầy chỗ ngồi |
| Lọc thống kê | `«extend»` | Xem bảng điều khiển doanh thu tổng quan |
| Xuất báo cáo | `«extend»` | Thống kê doanh thu |
| Xuất báo cáo | `«extend»` | Thống kê vé bán & vé hủy |
| Xuất báo cáo | `«extend»` | Thống kê tỷ lệ lấp đầy chỗ ngồi |


### 17. Sơ đồ tổng quát

**Actor:** `KHÁCH HÀNG`, `NHÂN VIÊN BÁN VÉ`, `ADMIN`, `CỔNG THANH TOÁN`, `DỊCH VỤ SMS`

**Use case:**

- Đăng ký tài khoản
- Đăng nhập
- Đăng xuất
- Khôi phục mật khẩu
- Đổi mật khẩu
- Quản lý thông tin cá nhân
- Tra cứu chuyến xe
- Đặt vé trực tuyến
- Xem lịch sử mua vé
- Hủy vé trực tuyến
- Bán vé tại quầy
- Hủy vé tại quầy
- Quản lý chuyến xe & lịch trình
- Quản lý xe & sơ đồ ghế
- Quản lý giá vé & khuyến mãi
- Quản lý tài khoản & phân quyền
- Thống kê & báo cáo doanh thu
- Xác thực số điện thoại bằng OTP
- Giữ chỗ tạm thời
- Thanh toán
- Tra cứu vé
- Hoàn tiền

**Actor thực hiện:**

- `KHÁCH HÀNG` → Đăng ký tài khoản
- `KHÁCH HÀNG` → Đăng nhập
- `KHÁCH HÀNG` → Đăng xuất
- `KHÁCH HÀNG` → Khôi phục mật khẩu
- `KHÁCH HÀNG` → Đổi mật khẩu
- `KHÁCH HÀNG` → Quản lý thông tin cá nhân
- `KHÁCH HÀNG` → Tra cứu chuyến xe
- `KHÁCH HÀNG` → Đặt vé trực tuyến
- `KHÁCH HÀNG` → Xem lịch sử mua vé
- `KHÁCH HÀNG` → Hủy vé trực tuyến
- `NHÂN VIÊN BÁN VÉ` → Đăng nhập
- `NHÂN VIÊN BÁN VÉ` → Đăng xuất
- `NHÂN VIÊN BÁN VÉ` → Đổi mật khẩu
- `NHÂN VIÊN BÁN VÉ` → Quản lý thông tin cá nhân
- `NHÂN VIÊN BÁN VÉ` → Tra cứu chuyến xe
- `NHÂN VIÊN BÁN VÉ` → Bán vé tại quầy
- `NHÂN VIÊN BÁN VÉ` → Hủy vé tại quầy
- `ADMIN` → Đăng nhập
- `ADMIN` → Đăng xuất
- `ADMIN` → Đổi mật khẩu
- `ADMIN` → Quản lý thông tin cá nhân
- `ADMIN` → Quản lý chuyến xe & lịch trình
- `ADMIN` → Quản lý xe & sơ đồ ghế
- `ADMIN` → Quản lý giá vé & khuyến mãi
- `ADMIN` → Quản lý tài khoản & phân quyền
- `ADMIN` → Thống kê & báo cáo doanh thu
- Xác thực số điện thoại bằng OTP → `DỊCH VỤ SMS` (actor phụ)
- Thanh toán → `CỔNG THANH TOÁN` (actor phụ)
- Hoàn tiền → `CỔNG THANH TOÁN` (actor phụ)

**Quan hệ:**

| Từ | Quan hệ | Tới |
|---|---|---|
| Đăng ký tài khoản | `«include»` | Xác thực số điện thoại bằng OTP |
| Khôi phục mật khẩu | `«include»` | Xác thực số điện thoại bằng OTP |
| Đặt vé trực tuyến | `«include»` | Giữ chỗ tạm thời |
| Đặt vé trực tuyến | `«include»` | Thanh toán |
| Bán vé tại quầy | `«include»` | Giữ chỗ tạm thời |
| Bán vé tại quầy | `«include»` | Thanh toán |
| Hủy vé trực tuyến | `«include»` | Hoàn tiền |
| Hủy vé tại quầy | `«include»` | Tra cứu vé |
| Hủy vé tại quầy | `«include»` | Hoàn tiền |

---

## 4. USE CASE DÙNG CHUNG

Các use case dưới đây xuất hiện ở nhiều sơ đồ. Khi code, **chỉ xây dựng một lần** rồi
tái sử dụng, không viết trùng.

| Use case | Xuất hiện ở sơ đồ | Ghi chú |
|---|---|---|
| Xác thực số điện thoại bằng OTP | 2, 3, 17 | Gọi `DỊCH VỤ SMS`. Dùng chung cho đăng ký và khôi phục mật khẩu |
| Giữ chỗ tạm thời | 8, 9, 17 | Khóa ghế ~10 phút trước khi thanh toán. Dùng chung cho bán online và tại quầy |
| Thanh toán | 8, 9, 17 | Luồng mở rộng khác nhau: online có Ví/VietQR, tại quầy có tiền mặt/VietQR |
| Tra cứu vé | 11, 17 | Nhân viên tìm vé của khách theo mã vé / số điện thoại |
| Hoàn tiền | 10, 11, 12, 17 | Dùng chung cho hủy vé online, hủy tại quầy, và hủy chuyến xe |
| Áp dụng mã giảm giá | 8, 9 | `«extend»` ở cả hai kênh bán vé |

---

## 5. QUY TẮC NGHIỆP VỤ ĐÃ CHỐT

Những quy tắc này đã được quyết định trong quá trình phân tích. Code phải tuân theo.

### Tài khoản & đăng nhập

1. Khách hàng **bắt buộc phải đăng nhập** để mua vé trực tuyến. Khách vãng lai
   muốn mua vé phải đến quầy giao dịch.
2. **Hủy vé online bắt buộc đăng nhập** — vì phải biết vé nào của ai mới hủy được.
3. Khách vãng lai muốn hủy vé thì ra quầy, nhân viên hủy giúp (sơ đồ 11).
4. OTP gửi qua **SMS tới số điện thoại**, không phải email.

### Đặt vé & thanh toán

5. **Giữ chỗ tạm thời** là use case dùng chung, không gộp vào luồng cơ bản, vì cả bán
   online lẫn bán tại quầy đều dùng.
6. Chọn ghế là **một bước trong luồng cơ bản** của đặt vé, không phải use case riêng.
7. Thanh toán tại quầy: nhân viên được hỏi chọn **tiền mặt** hoặc **VietQR**. Chỉ VietQR
   mới gọi `CỔNG THANH TOÁN`.
8. Thanh toán online: Ví MoMo / ZaloPay hoặc VietQR / Thẻ. Cả hai đều qua `CỔNG THANH TOÁN`.
9. **Mã giảm giá áp dụng ở cả hai kênh** bán vé (online và tại quầy).
10. Vé lưu **3 giá trị tiền**: `giaGoc`, `tienGiam`, `thanhTien`.

### Hủy vé & hoàn tiền

11. **Hoàn tiền về đúng nguồn đã thanh toán.** Thanh toán online thì hoàn qua cổng,
    thanh toán tiền mặt thì hoàn tiền mặt tại quầy.
12. Vé thanh toán bằng **tiền mặt chỉ hủy được tại quầy**, không hủy online được.
13. **Phí hủy tính trên số tiền thực trả** (`thanhTien`), không tính trên giá gốc.
14. **Nhà xe hủy chuyến thì hoàn 100%**, không trừ phí (sơ đồ 12).
15. Hủy chuyến xe có 2 trường hợp: chưa bán vé nào (hủy thẳng) và đã bán vé
    (phải xử lý vé của chuyến bị hủy → hoàn tiền).

### Xe & ghế

16. **Sơ đồ ghế khai báo theo từng xe**, để khách chọn chỗ trên app tận dụng lại được.
17. **Trạng thái ghế thuộc về cặp (chuyến xe, ghế)**, không thuộc về riêng ghế — cùng một
    ghế trên cùng một xe có thể trống ở chuyến này và đã bán ở chuyến khác.

### Mã giảm giá

18. Mã giảm giá **không có chức năng sửa và xóa** — chỉ có thêm, xem danh sách, và
    bật/tắt. Chủ ý thiết kế để giữ toàn vẹn dữ liệu của các vé đã dùng mã đó.

### Ngoài phạm vi

19. Không làm: quản lý tuyến/điểm dừng riêng, đổi vé, trụ bán vé tự động (kiosk),
    quản lý tài xế.
20. Điểm đón/trả được khai báo ngay trong use case "Thêm chuyến xe mới".

---

## 6. ĐIỂM CHƯA CHỐT

| Vấn đề | Trạng thái |
|---|---|
| Use case "Quản lý đơn đặt vé" cho ADMIN | **Chưa quyết định** có làm hay không. Hiện chưa có trong 17 sơ đồ. |
