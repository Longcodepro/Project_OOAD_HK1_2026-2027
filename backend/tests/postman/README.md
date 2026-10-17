# Bộ test API cho Postman

`OOAD_API_Tests.postman_collection.json`: **396 request, 605 khẳng định**, chia 17 thư mục (mỗi chức năng một thư mục, mỗi request là một trường hợp test, tên request ghi rõ kết quả mong đợi, ví dụ "Hủy vé còn > 24 giờ → hoàn 340.000, phí 60.000").

## Dùng trong Postman
1. Chạy backend kèm dữ liệu mẫu: `docker compose up -d --build mysql backend` (tự tạo bảng và nạp dữ liệu, xem `backend/README.md`).
2. Postman → **Import** → chọn file `OOAD_API_Tests.postman_collection.json`.
3. Chạy cả bộ: bấm `...` cạnh tên collection → **Run collection** → Run. Thư mục `00. Chuẩn bị` phải chạy trước (tự đăng nhập và dựng khách hàng, xe, tuyến riêng cho lần chạy này, nên chạy lại bao nhiêu lần cũng được).
4. Thử riêng một chức năng: chuột phải thư mục (ví dụ `05. Giữ chỗ tạm thời`) → **Run folder**. Thư mục nào cần dữ liệu thì tự tạo chuyến riêng ở đầu thư mục, chỉ cần `00` đã chạy một lần trong phiên.
5. Đổi địa chỉ server: sửa biến `base_url` của collection (mặc định `http://localhost:8000`).

## Dùng trên dòng lệnh (Newman)
```bash
npx newman run tests/postman/OOAD_API_Tests.postman_collection.json
```

## Thêm trường hợp test
Sửa `cases_a.py`, `cases_b.py` hoặc `cases_c.py` (mỗi chức năng là một hàm `f_xxx`), rồi sinh lại file JSON:
```bash
python tests/postman/build_collection.py
```
Biến trong chuỗi viết `@{ten_bien}` (thành `{{ten_bien}}` của Postman). `expect=200` kiểm mã HTTP; `js("mô tả", "biểu thức")` kiểm nội dung (`j` là JSON phản hồi); `setv("biến", "biểu thức")` lưu giá trị cho request sau.

## Chức năng ↔ thư mục
| Thư mục | Use case | Số request |
|---|---|---|
| 01 | UC08, UC09, UC19: đăng ký, đăng nhập, OTP, khóa tạm | 26 |
| 02 | UC10, UC11, UC12: quên/đổi mật khẩu, hồ sơ | 21 |
| 03 | UC14: xe và sơ đồ ghế | 19 |
| 04 | UC13, UC01: tuyến, chuyến, tra cứu | 30 |
| 05 | UC20: giữ chỗ | 19 |
| 06 | UC15: giá vé, mã giảm giá | 19 |
| 07 | UC02, UC21: đặt vé online, thanh toán | 32 |
| 08 | UC04: bán vé tại quầy | 19 |
| 09 | UC07, UC23: lịch sử, tra cứu vé | 25 |
| 10 | UC05, UC06, UC22: hủy vé, hoàn tiền | 37 |
| 11 | UC13: nhà xe hủy chuyến | 21 |
| 12 | UC18: quản lý đơn, hoàn tiền thủ công | 19 |
| 13 | UC16: tài khoản, phân quyền | 28 |
| 14 | UC17: thống kê | 11 |
| 15 | Hệ thống: health, Swagger, phân trang | 9 |
| 16 | Đổi lịch/đổi xe, hoàn tiền muộn, tham số hệ thống, đổi SĐT | 38 |

(Một phần request mỗi thư mục là bước chuẩn bị dữ liệu, tên bắt đầu bằng "Chuẩn bị".)
