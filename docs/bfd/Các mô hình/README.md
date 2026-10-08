---
tai_lieu: Mục lục bộ tài liệu phân tích – thiết kế
du_an: Hệ thống đặt vé xe khách trực tuyến (đồ án OOAD – SGU)
stack_du_kien: FastAPI (Python) + React + MySQL + JWT
cap_nhat: 2026-10-02
---

# Bộ tài liệu phân tích – thiết kế (dạng AI đọc được)

Đây là bản chữ (markdown) của toàn bộ phần **Phân tích – Thiết kế** theo `YeuCauDoAn-OOAD.pdf`. Mọi sơ đồ viết bằng **Mermaid** — vừa để AI đọc, vừa để paste vào draw.io.

## Cấu trúc thư mục

| File | Nội dung | Mục trong báo cáo |
|------|----------|-------------------|
| `01-usecase/usecase-model.md` | Actor, 15 use case, sơ đồ tổng quát + 14 sơ đồ chi tiết, danh sách lỗi đã sửa so với bản trên Drive | Mô hình Usecase |
| `01-usecase/dac-ta-usecase.md` | Quy định nghiệp vụ dùng chung + đặc tả 15 use case | Đặc tả usecase |
| `02-sequence/sequence-diagrams.md` | 17 sơ đồ tuần tự + danh sách đối tượng giao diện / xử lý | Mô hình Sequence |
| `03-class/class-diagram.md` | Sơ đồ lớp, danh sách lớp, quan hệ, mô tả thuộc tính & phương thức | Thiết kế lớp đối tượng |
| `04-rdm/rdm.md` | Ánh xạ lớp → bảng theo 9 quy tắc, sơ đồ RDM, mô tả 16 bảng, ràng buộc toàn vẹn | Thiết kế CSDL |
| `04-rdm/schema.sql` | Lệnh tạo CSDL MySQL 8 + dữ liệu khởi tạo | Thư mục `Database` khi nộp |
| `04-rdm/kiem-thu-schema.sql` | Chạy thử 1 luồng đặt vé + 14 lệnh sai để chứng minh ràng buộc hoạt động | Phụ lục / bảo vệ đồ án |

## Đã kiểm tra (2026-10-02)

| Hạng mục | Kết quả |
|----------|---------|
| 34 sơ đồ Mermaid (15 use case + 17 sequence + 1 class + 1 RDM) | render được hết, 0 lỗi |
| `schema.sql` chạy trên MariaDB 10.11 (tương thích MySQL 8) | tạo đủ **16 bảng, 18 khóa ngoại, 15 ràng buộc CHECK** |
| `kiem-thu-schema.sql` phần 1 — luồng đặt vé đầy đủ | chạy trót lọt: đặt 2 ghế → thanh toán → `DA_THANH_TOAN`, truy vấn ghế trống trả về đúng rỗng |
| 14 lệnh sai ở phần 2 | CSDL **chặn đủ 14/14** |
| 17 lớp đều có bảng tương ứng trong `rdm.md`, 16 bảng đều có mô tả | khớp |
| 15 use case đều có đặc tả + sơ đồ tuần tự + dòng trong ma trận truy vết | khớp |

**Lưu ý quan trọng từ kiểm thử:** RB01 (không bán trùng ghế) đã thử và CSDL **không** chặn được — hai vé khác nhau vẫn giữ được cùng một ghế. Không thể đặt `UNIQUE(ma_chuyen, ma_ghe)` vì vé đã hủy / hết hạn vẫn giữ dòng `CHI_TIET_VE` và ghế đó phải bán lại được. Bắt buộc kiểm trong code bằng transaction + `SELECT … FOR UPDATE` (chi tiết ở RB01 trong `rdm.md`). Đây là điểm nên nói rõ khi bảo vệ đồ án.

## Paste sơ đồ vào draw.io

1. Mở file `.md`, copy phần **giữa** ` ```mermaid ` và ` ``` ` (không lấy 2 dòng đó).
2. draw.io → bấm **+** trên thanh công cụ → **Advanced → Mermaid…** (một số bản: **Arrange → Insert → Mermaid…**).
3. Dán → **Insert**. Muốn sửa lại thì double-click vào sơ đồ để mở lại mã Mermaid.

Nhóm đã dùng đúng cách này để vẽ các ảnh trong `Drive › OOAD › USECASE` (mã Mermaid gốc được lưu ngầm trong từng file PNG).

## Mã định danh — dùng để tìm và sửa nhanh

| Tiền tố | Ý nghĩa | Ví dụ | Định nghĩa ở |
|---------|---------|-------|--------------|
| `A1–A3`, `E1–E2` | Tác nhân, hệ thống ngoài | A2 = Nhân viên bán vé | usecase-model.md |
| `UCxx`, `UCxx.y` | Use case, chức năng con | UC08.3 = Áp dụng mã giảm giá | usecase-model.md |
| `QDxx` | Quy định nghiệp vụ | QD01 = giữ ghế 5 phút | dac-ta-usecase.md |
| `SDxx` | Sơ đồ tuần tự | SD08 = Đặt vé & thanh toán | sequence-diagrams.md |
| Tên lớp `PascalCase` | Lớp | `ChuyenXe` | class-diagram.md |
| Tên bảng `VIET_HOA` | Bảng | `CHUYEN_XE` | rdm.md, schema.sql |
| `RBxx` | Ràng buộc toàn vẹn kiểm trong code | RB01 = không bán trùng ghế | rdm.md |

## Ma trận truy vết (sửa 1 chỗ → biết phải sửa theo ở đâu)

| Use case | Sequence | Lớp chính | Bảng chính |
|----------|----------|-----------|------------|
| UC01 Đăng nhập | SD01 | NguoiDung, VaiTro, NhatKyHoatDong | NGUOI_DUNG, VAI_TRO, NHAT_KY_HOAT_DONG |
| UC02 Đăng xuất | SD02 | NguoiDung, NhatKyHoatDong | NHAT_KY_HOAT_DONG |
| UC03 Đăng ký | SD03 | NguoiDung, MaXacThuc | NGUOI_DUNG, MA_XAC_THUC |
| UC04 Quên mật khẩu | SD04 | NguoiDung, MaXacThuc | NGUOI_DUNG, MA_XAC_THUC |
| UC05 Thông tin cá nhân | SD05 | NguoiDung | NGUOI_DUNG |
| UC06 Tìm chuyến | SD06 | TuyenXe, ChuyenXe, Ghe | TUYEN_XE, CHUYEN_XE, GHE, VE, CHI_TIET_VE |
| UC07 Chọn ghế | SD07 | ChuyenXe, Ve, ChiTietVe, ThamSo | VE, CHI_TIET_VE, THAM_SO |
| UC08 Đặt vé & thanh toán | SD08 | Ve, TuyenXe, MaGiamGia, ThanhToan | VE, CHI_TIET_TUYEN, MA_GIAM_GIA, THANH_TOAN |
| UC09 Tra cứu & hủy vé | SD09 | Ve, ThanhToan, ThamSo | VE, THANH_TOAN, THAM_SO |
| UC10 Bán vé tại quầy | SD10 | ChuyenXe, Ve, ThanhToan | VE, CHI_TIET_VE, THANH_TOAN |
| UC11 Quản lý chuyến | SD11, SD11b | ChuyenXe, TuyenXe, Xe, Ve | CHUYEN_XE, VE, THANH_TOAN |
| UC12 Quản lý xe | SD12 | Xe, LoaiXe, Ghe | XE, LOAI_XE, GHE |
| UC13 Giá vé & khuyến mãi | SD13, SD13b | ChuyenXe, MaGiamGia | CHUYEN_XE, MA_GIAM_GIA |
| UC14 Tài khoản & phân quyền | SD14 | NguoiDung, VaiTro, NhatKyHoatDong | NGUOI_DUNG, VAI_TRO, NHAT_KY_HOAT_DONG |
| UC15 Thống kê | SD15 | ThongKeDoanhThu, Ve, ChuyenXe | VE, CHI_TIET_VE, CHUYEN_XE, THANH_TOAN |

## Quy trình cập nhật đề xuất

1. Đổi **nghiệp vụ** (thêm bước, đổi quy định) → sửa `dac-ta-usecase.md` trước.
2. Dò ma trận trên → sửa sơ đồ use case / sequence liên quan.
3. Cần lưu thêm dữ liệu → thêm thuộc tính vào `class-diagram.md` (cả sơ đồ lẫn bảng mô tả) → thêm cột vào `rdm.md` và `schema.sql`.
4. Paste lại các khối Mermaid đã đổi vào draw.io.
5. Cập nhật ngày `cap_nhat` ở đầu file đã sửa.

## Việc còn mở

- **Q1:** thiếu use case quản lý tuyến đường & điểm dừng (chi tiết ở cuối `usecase-model.md`). Class / RDM đã có sẵn `TuyenXe`, `DiemDung`, `ChiTietTuyen`.
- Các giá trị QD02–QD05 là giả định — nhóm chốt lại rồi sửa trong `dac-ta-usecase.md` và dòng `INSERT INTO THAM_SO` của `schema.sql`.
- Chưa làm: BFD + kế hoạch, Thiết kế giao diện (danh sách thành phần, biến cố). Danh sách `:ManHinh…` cuối `sequence-diagrams.md` có thể dùng làm khung cho phần giao diện.
