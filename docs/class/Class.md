# PHÂN HỆ 06: SƠ ĐỒ LỚP (CLASS DIAGRAM)

> **`ClassDiagram_DatVeXeKhach.drawio` là nguồn sự thật; file này mô tả lại bằng chữ.**
> Sửa sơ đồ trong draw.io trước, rồi cập nhật file này cho khớp. Repo không giữ ảnh xuất ra.

- **Phiên bản:** 2026-11-12 (rà soát chéo với RDM, Use Case, Sequence và code backend)
- **Số trang:** 21 — 1 trang tổng quan + 2 trang mức phân tích + 18 trang mức thiết kế BCE
- **Liên quan:** [RDM](../rdm/RDM.md) · [Use Case](../use-case/USECASE.md) ·
  [Đặc tả](../specs/DacTaUseCase.md) · [Sequence](../sequence/Sequence_diagram.md)

---

## 1. Quy ước màu theo mô hình BCE

| Màu | Vai trò | Ý nghĩa |
|---|---|---|
| Đỏ `#f8cecc` | **Actor** | Tác nhân người dùng và lớp `TaiKhoan` (lớp hiện thực của tác nhân) |
| Xanh dương `#dae8fc` | **Boundary** | Lớp giao diện (`ManHinh*`, `GiaoDien*`) |
| Cam `#ffe6cc` | **Control** | Lớp điều khiển (`DieuKhien*`), lớp dịch vụ (`DichVu*`, `QuanLyGhe`) |
| Xanh lá `#d5e8d4` | **Entity** | Lớp thực thể — ánh xạ 1–1 với bảng trong RDM |
| Tím `#e1d5e7` | **External** | Hệ thống ngoài / thiết bị: `CongThanhToan`, `DichVuSMS`, `MayInVe` |

Quan hệ: mũi tên liền `endArrow=open` = liên kết thường; **nét đứt** = phụ thuộc (lớp điều
khiển đọc/ghi lớp thực thể). Bội số ghi ở hai đầu (`1`, `*`).

---

## 2. Danh sách trang

| # | Tab | Nội dung |
|---|---|---|
| 1 | Toàn bộ hệ thống | 18 lớp thực thể và quan hệ giữa chúng (xem mục 3) |
| 2 | 1.1. Khách hàng Đặt vé & Thanh toán trực tuyến | Mức phân tích, chưa tách B/C/E chi tiết |
| 3 | 1.2. Bán vé & In vé trực tiếp tại quầy bến xe | Mức phân tích |
| 4 | 2.1. Đặt vé trực tuyến & Tạm khóa chỗ ngồi (UC02) | B/C/E |
| 5 | 2.2. Xử lý Thanh toán & Xuất vé điện tử (UC22) | B/C/E |
| 6 | 2.3. Bán vé & In vé trực tiếp tại quầy (UC04) | B/C/E |
| 7 | 2.4. Đăng ký tài khoản (UC08) & Đăng nhập (UC09) | B/C/E — gộp hai use case |
| 8 | 2.5. Tra cứu & Tìm chuyến xe (UC01) | B/C/E |
| 9 | 2.6. Hủy vé trực tuyến (UC05) | B/C/E |
| 10 | 2.7. Hủy vé tại quầy (UC06) | B/C/E |
| 11 | 2.8. Khôi phục mật khẩu (UC10) | B/C/E |
| 12 | 2.9. Lịch sử mua vé (UC07) | B/C/E |
| 13 | 2.10. Quản lý thông tin cá nhân (UC11) | B/C/E |
| 14 | 2.11. Đổi mật khẩu (UC12) | B/C/E |
| 15 | 2.12. Quản lý chuyến xe & lịch trình (UC13) | B/C/E |
| 16 | 2.13. Quản lý xe & sơ đồ ghế (UC14) | B/C/E |
| 17 | 2.14. Quản lý giá vé & khuyến mãi (UC15) | B/C/E — gộp UC15a và UC15b |
| 18 | 2.15. Quản lý tài khoản & phân quyền (UC16) | B/C/E |
| 19 | 2.16. Thống kê & báo cáo doanh thu (UC17) | B/C/E |
| 20 | 2.17. Quản lý đơn đặt vé (UC18) | B/C/E |
| 21 | 2.18. Quản lý tham số hệ thống (UC19) | B/C/E |

> **Số trang Class và số sơ đồ tuần tự không trùng nhau** vì Class gộp UC08+UC09 vào một trang
> (2.4) và gộp UC15a+UC15b vào một trang (2.14), còn Sequence tách thành bốn sơ đồ riêng. Vì vậy
> Class có 18 trang thiết kế, Sequence có 20. Mã `UCxx` trong tên tab mới là chỗ để đối chiếu,
> không phải số thứ tự tab.

---

## 3. Trang tổng quan — 18 lớp thực thể

Đúng 18 lớp, ánh xạ **1–1** với 18 bảng trong [`RDM.md`](../rdm/RDM.md) mục 3 (cùng tên, cùng
thuộc tính, cùng kiểu). Lớp `TaiKhoan` tô màu Actor vì nó vừa là thực thể vừa là lớp hiện thực
của ba tác nhân người dùng.

`VaiTro` · `TaiKhoan` · `OtpXacThuc` · `NhatKyHoatDong` · `ThamSo` · `LoaiXe` · `Xe` · `Ghe` ·
`TuyenXe` · `ChuyenXe` · `DiemDonTra` · `GheChuyen` · `MaGiamGia` · `DonDatVe` · `BanVeQuay` ·
`VeXe` · `ThanhToan` · `HoanTien`

Thuộc tính và kiểu dữ liệu không nhắc lại ở đây — xem `RDM.md` mục 3 để tránh hai nơi lệch nhau.
Quan hệ và bội số: xem `RDM.md` mục 4 (22 quan hệ). Enum: `RDM.md` mục 5.

---

## 4. Lớp B/C/E theo từng use case

| Tab | Boundary | Control | Entity | External |
|---|---|---|---|---|
| 2.1 (UC02) | `ManHinhChonGhe` | `DieuKhienGiuCho`, `QuanLyGhe` | `Ghe` | — |
| 2.2 (UC22) | — | `DieuKhienThanhToan`, `DichVuVe`, `DichVuThongBao` | `DonDatVe`, `VeXe`, `Ghe` | `CongThanhToan` |
| 2.3 (UC04) | `ManHinhBanVeQuay` | `DieuKhienBanVeQuay`, `QuanLyGhe` | `DonDatVe`, `VeXe`, `BanVeQuay`, `Ghe` | `MayInVe` |
| 2.4 (UC08, UC09) | `ManHinhDangKy`, `ManHinhDangNhap` | `DieuKhienDangKy`, `DieuKhienDangNhap` | `TaiKhoan` | `DichVuSMS` |
| 2.5 (UC01) | `ManHinhTrangChu` | `DieuKhienTraCuu` | `ChuyenXe`, `CoSoDuLieu` | — |
| 2.6 (UC05) | `ManHinhQuanLyVe` | `DieuKhienHuyVe` | `VeXe`, `Ghe`, `HoanTien` | `CongThanhToan` |
| 2.7 (UC06) | `ManHinhBanVeQuay` | `DieuKhienHuyVeQuay` | `VeXe`, `Ghe`, `HoanTien` | `MayInVe`, `CongThanhToan` |
| 2.8 (UC10) | `ManHinhKhoiPhuc` | `DieuKhienXacThuc` | `TaiKhoan` | `DichVuSMS` |
| 2.9 (UC07) | `ManHinhLichSuVe` | `DieuKhienLichSuVe` | `VeXe` | — |
| 2.10 (UC11) | `ManHinhHoSo` | `DieuKhienHoSo` | `TaiKhoan` | — |
| 2.11 (UC12) | `ManHinhDoiMatKhau` | `DieuKhienDoiMatKhau` | `TaiKhoan` | — |
| 2.12 (UC13) | `ManHinhQuanLyChuyen` | `DieuKhienQuanLyChuyen` | `ChuyenXe`, `VeXe`, `HoanTien` | `CongThanhToan` |
| 2.13 (UC14) | `ManHinhQuanLyXe` | `DieuKhienQuanLyXe` | `XeKhach`, `Ghe` | — |
| 2.14 (UC15) | `ManHinhGiaVe`, `ManHinhKhuyenMai` | `DieuKhienGiaVe`, `DieuKhienKhuyenMai` | `ChuyenXe`, `MaGiamGia` | — |
| 2.15 (UC16) | `ManHinhQuanLyTaiKhoan` | `DieuKhienQuanLyTaiKhoan` | `TaiKhoan` | — |
| 2.16 (UC17) | `ManHinhThongKe` | `DieuKhienThongKe` | `VeXe`, `ChuyenXe` | — |
| 2.17 (UC18) | `ManHinhQuanLyDon` | `DieuKhienQuanLyDon` | `DonDatVe`, `VeXe`, `HoanTien` | `CongThanhToan` |
| 2.18 (UC19) | `ManHinhThamSo` | `DieuKhienThamSo` | `ThamSo`, `NhatKyHoatDong` | — |

Hai trang mức phân tích dùng lớp thô hơn: tab 1.1 có `GiaoDienDatVe` / `HeThongDatVe`, tab 1.2 có
`GiaoDienBanVe` / `HeThongBanVe` (sơ đồ tuần tự 1.1 và 1.2 gọi chung là `:GiaoDien` / `:HeThong` —
cùng một ý, chỉ khác cách đặt tên ở mức phân tích).

---

## 5. Ánh xạ lớp → bảng RDM → code backend

Tên trong code là tiếng Anh `snake_case`; bảng ánh xạ đầy đủ ở `backend/README.md`.

| Lớp thực thể | Bảng RDM | Model SQLAlchemy |
|---|---|---|
| `VaiTro` | `VaiTro` | `RoleModel` — `app/infrastructure/db/models/auth.py` |
| `TaiKhoan` | `TaiKhoan` | `AccountModel` — cùng file |
| `OtpXacThuc` | `OtpXacThuc` | `OtpModel` — cùng file |
| `NhatKyHoatDong` | `NhatKyHoatDong` | `ActivityLogModel` — `models/system.py` |
| `ThamSo` | `ThamSo` | `SettingModel` — `models/system.py` |
| `LoaiXe`, `Xe` (`XeKhach`), `Ghe` | `LoaiXe`, `Xe`, `Ghe` | `VehicleTypeModel`, `VehicleModel`, `SeatModel` — `models/fleet.py` |
| `TuyenXe`, `ChuyenXe`, `DiemDonTra`, `GheChuyen` | cùng tên | `RouteModel`, `TripModel`, `StopModel`, `TripSeatModel` — `models/trip.py` |
| `MaGiamGia` | `MaGiamGia` | `CouponModel` — `models/promo.py` |
| `DonDatVe`, `BanVeQuay`, `VeXe`, `ThanhToan` | cùng tên | `OrderModel`, `CounterSaleModel`, `TicketModel`, `PaymentModel` — `models/booking.py` |
| `HoanTien` | `HoanTien` | `RefundModel` — `models/refund.py` |

Lớp **không** thành bảng:

| Lớp | Vì sao |
|---|---|
| `ManHinh*`, `GiaoDien*` | Lớp giao diện — ở backend tương ứng tầng `app/presentation/` (router + schema) |
| `DieuKhien*`, `DichVuVe`, `DichVuThongBao`, `QuanLyGhe` | Lớp điều khiển — tương ứng `app/application/use_cases/` |
| `CongThanhToan`, `DichVuSMS` | Hệ thống ngoài — bản giả ở `app/infrastructure/mock/` |
| `MayInVe` | Thiết bị — chỉ trả về nội dung vé giấy (`GET /counter/orders/{id}/receipts`) |
| `CoSoDuLieu` | Tầng lưu trữ, không phải một bảng |
| `NguoiDung`, `KhachHang`, `NhanVienBanVe`, `Admin` | Tác nhân — đều lưu ở `TaiKhoan` + `VaiTro` |
| `XeKhach` | Cùng là `Xe` (+ `LoaiXe`), chỉ khác tên gọi ở sơ đồ lớp |

Bảng ánh xạ lớp ↔ bảng cũng có ở `RDM.md` mục 7; hai nơi phải khớp nhau.
