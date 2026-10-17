# RDM — MÔ HÌNH QUAN HỆ DỮ LIỆU (HỆ THỐNG ĐẶT VÉ XE KHÁCH)

> Nguồn gốc: `RDM_DatVeXeKhach.drawio` (cùng thư mục). Sửa drawio trước rồi cập nhật file này.
> Bản 2026-10-17: dựng từ 4 tài liệu chuẩn **BFD, Use Case, Đặc tả, Sequence** (không sao chép `rdm.svg` cũ; `rdm.svg` chỉ còn là tham khảo).
> Quy ước đặt tên: tên bảng = tên lớp thực thể trong Sequence (`TaiKhoan`, `DonDatVe`, `VeXe`, `MaGiamGia`...).

## 1. Quy ước
- Cờ: **PK** khóa chính, **FK** khóa ngoại, **UQ** duy nhất, **NN** NOT NULL (không có NN = nullable).
- Quan hệ ghi `Con (bội số) → Cha (bội số)`; `0..1` = khóa ngoại nullable.

## 2. Quyết định thiết kế (và nguồn gốc)
| Quyết định | Nguồn / lý do |
|---|---|
| **Một bảng `TaiKhoan`** cho cả 3 vai trò (hồ sơ HoTen/NgaySinh/DiaChi nằm trong đó); không có bảng KhachHang/NhanVien | Sequence chỉ có thực thể `:TaiKhoan`; Use Case UC11 cho cả 3 vai trò xem/sửa hồ sơ; BFD dùng một bảng người dùng + vai trò |
| Vai trò: `VaiTro` (3 dòng KHACH_HANG, NHAN_VIEN_BAN_VE, ADMIN); không có bảng chức năng/quyền chi tiết | UC16 "Phân quyền vai trò" = gán vai trò; BFD chỉ liệt kê `VAI_TRO` |
| Đăng nhập bằng `SDT` (UQ), **không có email** | Quyết định: chỉ dùng số điện thoại |
| `BatDoiMatKhau`, `SoLanDangNhapSai`, `KhoaDangNhapDen`, `PhienBanToken` trên `TaiKhoan` | Đặc tả UC09 (khóa tạm khi sai nhiều lần), UC10/UC16 (thu hồi phiên), UC16 (buộc đổi mật khẩu lần đăng nhập kế) |
| `OtpXacThuc` | UC19 OTP SMS; BFD `MA_XAC_THUC` |
| `NhatKyHoatDong` (thay `LichSuVe`) | UC16 "lịch sử hoạt động"/audit log; BFD `NHAT_KY_HOAT_DONG` |
| `ThamSo` (khóa=tên tham số) | BFD `THAM_SO`: giữ chỗ 5 phút, hạn hủy 24 giờ, phí hủy 15%... |
| **`GheChuyen`** (PK kép chuyến + ghế) giữ trạng thái ghế; `Ghe` chỉ là sơ đồ ghế của xe | Rule #17: trạng thái ghế thuộc cặp (chuyến, ghế); giữ chỗ 5 phút |
| **`VeXe`** = 1 ghế 1 chuyến, lưu GiaGoc/TienGiam/ThanhTien; sinh cùng lúc với đơn | Rule #10; Sequence `:VeXe` |
| `DonDatVe.MaTK` nullable, `KenhBan` (TRUC_TUYEN/TAI_QUAY); **`BanVeQuay`** ghi nhân viên bán + thời gian | Khách vãng lai chỉ nhập họ tên + SĐT (lưu ở `VeXe`), không tạo tài khoản; Đặc tả UC04 |
| **`HoanTien`** | UC22: hoàn về đúng nguồn, phí hủy, hủy chuyến hoàn 100%, "Chờ xử lý thủ công" cho UC18 |
| **`DiemDonTra`** theo chuyến | Rule #20: điểm đón/trả khai báo khi thêm chuyến xe |
| Không có bảng ca trực, tài xế, tuyến/điểm dừng quản lý riêng | Rule #19; đã chốt không làm ca trực |
| `TuyenXe` vẫn có bảng (dữ liệu khởi tạo, không có màn hình quản lý riêng) | `ChuyenXe` cần tuyến; BFD `TUYEN_XE` |

## 3. Các bảng

### VaiTro
| Cột | Kiểu | Cờ |
|---|---|---|
| MaVaiTro | int | PK |
| TenVaiTro | varchar(50) | UQ NN |
| MoTa | varchar(255) |  |

### TaiKhoan
| Cột | Kiểu | Cờ |
|---|---|---|
| MaTK | int | PK |
| MaVaiTro | int | FK NN |
| SDT | varchar(15) | UQ NN |
| MatKhau | varchar(255) | NN |
| HoTen | varchar(100) | NN |
| NgaySinh | date |  |
| DiaChi | varchar(255) |  |
| TrangThai | varchar(20) | NN |
| BatDoiMatKhau | boolean | NN |
| SoLanDangNhapSai | int | NN |
| KhoaDangNhapDen | datetime |  |
| PhienBanToken | int | NN |
| NgayTao | datetime | NN |

### OtpXacThuc
| Cột | Kiểu | Cờ |
|---|---|---|
| MaOTP | int | PK |
| SDT | varchar(15) | NN |
| MaXacThucBam | varchar(255) | NN |
| MucDich | varchar(20) | NN |
| HetHan | datetime | NN |
| DaDung | boolean | NN |
| SoLanSai | int | NN |

### NhatKyHoatDong
| Cột | Kiểu | Cờ |
|---|---|---|
| MaNK | int | PK |
| MaTK | int | FK NN |
| HanhDong | varchar(50) | NN |
| DoiTuong | varchar(50) |  |
| MaDoiTuong | int |  |
| ChiTiet | varchar(500) |  |
| ThoiGian | datetime | NN |

### ThamSo
| Cột | Kiểu | Cờ |
|---|---|---|
| TenThamSo | varchar(50) | PK |
| GiaTri | varchar(100) | NN |
| MoTa | varchar(255) |  |

### LoaiXe
| Cột | Kiểu | Cờ |
|---|---|---|
| MaLoaiXe | int | PK |
| TenLoaiXe | varchar(100) | UQ NN |
| MoTa | varchar(255) |  |

### Xe
| Cột | Kiểu | Cờ |
|---|---|---|
| MaXe | int | PK |
| MaLoaiXe | int | FK NN |
| BienSo | varchar(20) | UQ NN |
| HangXe | varchar(100) |  |
| NamSanXuat | int |  |
| TrangThai | varchar(20) | NN |
| GhiChu | varchar(255) |  |

### Ghe
| Cột | Kiểu | Cờ |
|---|---|---|
| MaGhe | int | PK |
| MaXe | int | FK NN |
| SoGhe | varchar(10) | NN |
| Tang | int | NN |
| Hang | int | NN |
| Cot | int | NN |

### TuyenXe
| Cột | Kiểu | Cờ |
|---|---|---|
| MaTuyen | int | PK |
| DiemDi | varchar(100) | NN |
| DiemDen | varchar(100) | NN |
| KhoangCach | decimal(10,2) |  |
| ThoiGianDuKien | int |  |
| TrangThai | varchar(20) | NN |

### ChuyenXe
| Cột | Kiểu | Cờ |
|---|---|---|
| MaChuyen | int | PK |
| MaTuyen | int | FK NN |
| MaXe | int | FK NN |
| NgayKhoiHanh | date | NN |
| GioKhoiHanh | time | NN |
| GiaVe | decimal(15,2) | NN |
| TrangThai | varchar(20) | NN |
| LyDoHuy | varchar(255) |  |
| GhiChu | varchar(255) |  |

### DiemDonTra
| Cột | Kiểu | Cờ |
|---|---|---|
| MaDiem | int | PK |
| MaChuyen | int | FK NN |
| TenDiem | varchar(255) | NN |
| LoaiDiem | varchar(10) | NN |
| ThuTu | int | NN |

### GheChuyen
| Cột | Kiểu | Cờ |
|---|---|---|
| MaChuyen | int | PK FK |
| MaGhe | int | PK FK |
| TrangThai | varchar(20) | NN |
| MaTKGiu | int | FK |
| HetHanKhoa | datetime |  |

### MaGiamGia
| Cột | Kiểu | Cờ |
|---|---|---|
| MaGG | int | PK |
| MaCode | varchar(50) | UQ NN |
| LoaiGiam | varchar(20) | NN |
| GiaTriGiam | decimal(15,2) | NN |
| GiaTriGiamToiDa | decimal(15,2) |  |
| DonToiThieu | decimal(15,2) | NN |
| SoLuong | int | NN |
| SoLuotDaDung | int | NN |
| NgayBatDau | datetime | NN |
| NgayKetThuc | datetime | NN |
| TrangThai | varchar(20) | NN |
| MoTa | varchar(255) |  |

### DonDatVe
| Cột | Kiểu | Cờ |
|---|---|---|
| MaDon | int | PK |
| MaTK | int | FK |
| MaGG | int | FK |
| KenhBan | varchar(20) | NN |
| NgayDat | datetime | NN |
| TongTien | decimal(15,2) | NN |
| TienGiam | decimal(15,2) | NN |
| TrangThai | varchar(30) | NN |
| GhiChu | varchar(255) |  |

### BanVeQuay
| Cột | Kiểu | Cờ |
|---|---|---|
| MaBQ | int | PK |
| MaDon | int | FK UQ NN |
| MaTK | int | FK NN |
| ThoiGian | datetime | NN |

### VeXe
| Cột | Kiểu | Cờ |
|---|---|---|
| MaVe | int | PK |
| MaDon | int | FK NN |
| MaChuyen | int | FK NN |
| MaGhe | int | FK NN |
| MaDiemDon | int | FK |
| MaDiemTra | int | FK |
| HoTenHK | varchar(100) | NN |
| SDTHK | varchar(15) | NN |
| MaQR | varchar(100) | UQ |
| GiaGoc | decimal(15,2) | NN |
| TienGiam | decimal(15,2) | NN |
| ThanhTien | decimal(15,2) | NN |
| TrangThai | varchar(30) | NN |

### ThanhToan
| Cột | Kiểu | Cờ |
|---|---|---|
| MaThanhToan | int | PK |
| MaDon | int | FK NN |
| PhuongThuc | varchar(50) | NN |
| SoTien | decimal(15,2) | NN |
| MaGiaoDich | varchar(100) |  |
| ThoiGianThanhToan | datetime | NN |
| TrangThai | varchar(30) | NN |
| GhiChu | varchar(255) |  |

### HoanTien
| Cột | Kiểu | Cờ |
|---|---|---|
| MaHT | int | PK |
| MaVe | int | FK NN |
| MaTKXuLy | int | FK |
| SoTienHoan | decimal(15,2) | NN |
| PhiHuy | decimal(15,2) | NN |
| HinhThuc | varchar(20) | NN |
| TrangThai | varchar(30) | NN |
| LyDo | varchar(30) | NN |
| MaGiaoDich | varchar(100) |  |
| LyDoLoi | varchar(255) |  |
| ThoiGian | datetime | NN |

## 4. Quan hệ
| Con | Cha | Bội số (con → cha) | Ý nghĩa |
|---|---|---|---|
| TaiKhoan | VaiTro | * → 1 | thuộc vai trò |
| NhatKyHoatDong | TaiKhoan | * → 1 | của |
| Xe | LoaiXe | * → 1 | thuộc loại |
| Ghe | Xe | * → 1 | gồm |
| ChuyenXe | TuyenXe | * → 1 | chạy tuyến |
| ChuyenXe | Xe | * → 1 | dùng xe |
| DiemDonTra | ChuyenXe | * → 1 | của chuyến |
| GheChuyen | ChuyenXe | * → 1 | của chuyến |
| GheChuyen | Ghe | * → 1 | của ghế |
| GheChuyen | TaiKhoan | * → 0..1 | giữ bởi |
| DonDatVe | TaiKhoan | * → 0..1 | đặt bởi (online) |
| DonDatVe | MaGiamGia | * → 0..1 | áp dụng |
| BanVeQuay | DonDatVe | 1 → 1 | ghi nhận |
| BanVeQuay | TaiKhoan | * → 1 | bán bởi |
| VeXe | DonDatVe | * → 1 | thuộc đơn |
| VeXe | ChuyenXe | * → 1 | đi chuyến |
| VeXe | Ghe | * → 1 | ngồi ghế |
| VeXe | DiemDonTra | * → 0..1 | đón tại |
| VeXe | DiemDonTra | * → 0..1 | trả tại |
| ThanhToan | DonDatVe | * → 1 | của đơn |
| HoanTien | VeXe | * → 1 | của vé |
| HoanTien | TaiKhoan | * → 0..1 | xử lý bởi |

## 5. Enum (chốt, code phải dùng đúng)
| Bảng.cột | Giá trị |
|---|---|
| VaiTro.TenVaiTro | KHACH_HANG, NHAN_VIEN_BAN_VE, ADMIN |
| TaiKhoan.TrangThai | HOAT_DONG, KHOA |
| Xe.TrangThai | HOAT_DONG, NGUNG_HOAT_DONG |
| TuyenXe.TrangThai | HOAT_DONG, NGUNG |
| ChuyenXe.TrangThai | MO_BAN, DA_KHOA, DA_HUY (*"đã khởi hành" suy từ ngày giờ*) |
| GheChuyen.TrangThai | TRONG, TAM_KHOA, DA_BAN |
| DonDatVe.TrangThai | CHO_THANH_TOAN, DA_THANH_TOAN, THAT_BAI, DA_HUY |
| DonDatVe.KenhBan | TRUC_TUYEN, TAI_QUAY |
| VeXe.TrangThai | CHO_THANH_TOAN, CHUA_DI, DA_HOAN_THANH, DA_HUY |
| ThanhToan.PhuongThuc | MOMO, ZALOPAY, VIETQR, THE, TIEN_MAT |
| ThanhToan.TrangThai | DANG_XU_LY, THANH_CONG, THAT_BAI, DA_HUY |
| MaGiamGia.TrangThai | BAT, TAT |
| MaGiamGia.LoaiGiam | PHAN_TRAM, SO_TIEN |
| HoanTien.HinhThuc | CONG_THANH_TOAN, TIEN_MAT |
| HoanTien.TrangThai | DA_HOAN, CHO_XU_LY_THU_CONG |
| HoanTien.LyDo | KHACH_HUY_VE, NHA_XE_HUY_CHUYEN |
| DiemDonTra.LoaiDiem | DON, TRA |
| OtpXacThuc.MucDich | DANG_KY, KHOI_PHUC_MAT_KHAU |
| ThamSo.TenThamSo | THOI_GIAN_GIU_CHO_PHUT=5, HAN_HUY_VE_GIO=24, PHI_HUY_PHAN_TRAM=15, OTP_HIEU_LUC_GIAY, OTP_SO_LAN_THU_TOI_DA, DANG_NHAP_SAI_TOI_DA |

*(Các giá trị enum do tài liệu chuẩn gợi ý; chỉ các giá trị trong Đặc tả/Sequence/BFD là bắt buộc — còn lại là thiết kế bổ sung.)*

## 6. Quy tắc nghiệp vụ gắn với dữ liệu
1. **Giữ chỗ 5 phút** (Đặc tả UC20): `GheChuyen.TrangThai=TAM_KHOA`, `HetHanKhoa = now + ThamSo.THOI_GIAN_GIU_CHO_PHUT`, `MaTKGiu` = tài khoản giữ. Hết hạn kiểm tra lười mỗi khi có request xem/giữ ghế (không dùng scheduler).
2. **3 giá trị tiền trên vé:** `GiaGoc` (=`ChuyenXe.GiaVe` tại thời điểm đặt), `TienGiam` (phần mã giảm giá phân bổ vào vé), `ThanhTien = GiaGoc − TienGiam`; `DonDatVe.TongTien = Σ ThanhTien`, `DonDatVe.TienGiam = Σ TienGiam`. Giá vé đổi sau đó **không** ảnh hưởng vé đã bán.
3. **`VeXe` tạo cùng lúc với đơn** (`CHO_THANH_TOAN`, `MaQR` NULL). Thanh toán thành công → sinh `MaQR`, `CHUA_DI`, ghế `DA_BAN` (Sequence 2.2 `luuThongTinVe` = ghi `MaQR`/phát hành). Thanh toán **thất bại** → ghi `ThanhToan.TrangThai=THAT_BAI`, đơn vẫn `CHO_THANH_TOAN`, khách thử lại trong 5 phút; **hết 5 phút** → đơn `THAT_BAI`, vé `DA_HUY`, ghế về `TRONG`.
4. **`DA_HOAN_THANH` suy ra khi truy vấn** (chuyến đã khởi hành mà vé `CHUA_DI`), không dùng job.
5. **Hủy vé** (UC05/UC06): chỉ khi còn **≥ 24 giờ** trước giờ khởi hành; phí **15% trên `ThanhTien`**; dưới 24 giờ từ chối. Vé `TIEN_MAT` chỉ hủy tại quầy. Hoàn về đúng nguồn (`HoanTien.HinhThuc`). Lệnh hoàn bị từ chối → `HoanTien.TrangThai=CHO_XU_LY_THU_CONG` (vé vẫn hủy, ghế vẫn nhả); Admin xử lý ở UC18, `MaTKXuLy` = người xử lý.
6. **Nhà xe hủy chuyến** (UC13): hoàn 100% mọi vé đã thanh toán (`PhiHuy=0`, `LyDo=NHA_XE_HUY_CHUYEN`), `ChuyenXe.LyDoHuy` ghi lý do.
7. **Mã giảm giá:** không sửa/xóa, chỉ thêm và bật/tắt. Áp dụng được khi `TrangThai=BAT`, trong hạn, `SoLuotDaDung < SoLuong`, đơn ≥ `DonToiThieu`; `MaCode` không trùng.
8. **Đặt online:** bắt buộc đăng nhập, `DonDatVe.MaTK` = khách, `KenhBan=TRUC_TUYEN`, không có `BanVeQuay`. **Bán tại quầy:** `MaTK` NULL, `KenhBan=TAI_QUAY`, có đúng 1 `BanVeQuay` (nhân viên + thời gian); họ tên + SĐT khách ở `VeXe.HoTenHK/SDTHK`.
9. **Đăng nhập:** sai quá `DANG_NHAP_SAI_TOI_DA` lần → `KhoaDangNhapDen` (khóa tạm); Admin khóa → `TrangThai=KHOA`. Đổi/đặt lại mật khẩu hoặc khóa → tăng `PhienBanToken` (thu hồi phiên); Admin đặt lại mật khẩu → `BatDoiMatKhau=true`.
10. **Số chỗ của xe = số dòng `Ghe`** của xe đó (sơ đồ ghế khai báo theo từng xe); không lưu số ghế ở `LoaiXe`.
11. Ràng buộc nên thêm ở tầng ứng dụng/DB: không có 2 vé khác `DA_HUY` cùng (`MaChuyen`,`MaGhe`).
12. **Thêm chuyến xe** (UC13): kiểm tra xe không trùng lịch; sinh sẵn một dòng `GheChuyen` (`TRONG`) cho mỗi `Ghe` của xe. Chuyến đã khởi hành thì không sửa/xóa.
13. **Sơ đồ ghế** chỉ sửa được trên xe chưa có chuyến mở bán (Đặc tả UC14); `Ghe` không bị xóa khi đã có `VeXe`.
14. **Bảo mật dữ liệu:** `MatKhau` và `MaXacThucBam` lưu dạng băm (không lưu rõ); `MaQR` là chuỗi ngẫu nhiên không đoán được (không dùng số tăng dần); `SDT` chuẩn hóa một định dạng (vd. 0xxxxxxxxx) trước khi lưu/so sánh.
15. **OTP:** hiệu lực ngắn (`OTP_HIEU_LUC_GIAY`), sai quá `OTP_SO_LAN_THU_TOI_DA` lần thì khóa mã; mã dùng xong đặt `DaDung=true`.
16. **Đối soát thanh toán:** webhook cổng thanh toán xử lý idempotent theo `MaGiaoDich` (cùng mã giao dịch gửi lại không tạo thêm `ThanhToan` hay phát vé lần hai); `ThanhToan.TrangThai=DANG_XU_LY` khi cổng phản hồi chậm.
17. **Hoàn tiền:** mỗi vé hủy có đúng một `HoanTien` (kể cả hoàn 0đ nếu có); hủy chuyến hoàn 100% ghi `PhiHuy=0`, `LyDo=NHA_XE_HUY_CHUYEN`.
18. **Đổi phương thức tại quầy:** nhân viên được quay lại chọn lại phương thức trước khi chốt. Đổi từ `VIETQR` (đang `DANG_XU_LY`) sang `TIEN_MAT` thì `ThanhToan` VietQR cũ → `DA_HUY`, mã QR thanh toán của nó bị vô hiệu; tạo `ThanhToan` mới `TIEN_MAT`.

## 7. Ánh xạ lớp BCE (Class/Sequence) → bảng
| Lớp trong Class/Sequence | Bảng RDM |
|---|---|
| `:Ghe` (có `trangThai`) | trạng thái → `GheChuyen`; sơ đồ ghế (số ghế, tầng, hàng, cột) → `Ghe` |
| `:DonDatVe`, `:VeXe`, `:MaGiamGia`, `:ChuyenXe`, `:HoanTien`, `:ThanhToan`, `:TaiKhoan` | cùng tên |
| `:XeKhach` | `Xe` (+ `LoaiXe`) |
| `:NguoiDung`, `:KhachHang`, `:NhanVienBanVe`, `:Admin` (tác nhân) | `TaiKhoan` (+ `VaiTro`) |
| `:CongThanhToan`, `:DichVuSMS`, `:MayInVe` | hệ thống ngoài/thiết bị — không có bảng (giao dịch ở `ThanhToan`, `HoanTien`; OTP ở `OtpXacThuc`) |
| `:CoSoDuLieu` | tầng lưu trữ, không phải bảng |

## 8. Ánh xạ BFD → bảng chính
| BFD | Chức năng | Bảng chính |
|---|---|---|
| 1.1 | Đăng ký tài khoản | `TaiKhoan`, `VaiTro`, `OtpXacThuc` |
| 1.2 | Đăng nhập & Đăng xuất | `TaiKhoan`, `NhatKyHoatDong`, `ThamSo` |
| 1.3 | Khôi phục mật khẩu | `TaiKhoan`, `OtpXacThuc` |
| 1.4 | Đổi mật khẩu | `TaiKhoan` |
| 1.5 | Quản lý thông tin cá nhân | `TaiKhoan` |
| 1.6 | Quản lý tài khoản & Phân quyền | `TaiKhoan`, `VaiTro`, `NhatKyHoatDong` |
| 2.1 | Quản lý xe & Sơ đồ ghế | `Xe`, `LoaiXe`, `Ghe` |
| 2.2 | Quản lý chuyến xe & Lịch trình | `ChuyenXe`, `TuyenXe`, `Xe`, `DiemDonTra`, `VeXe`, `HoanTien` |
| 2.3 | Quản lý giá vé & Khuyến mãi | `ChuyenXe`, `MaGiamGia` |
| 2.4 | Tra cứu chuyến xe | `ChuyenXe`, `TuyenXe`, `GheChuyen` |
| 3.1 | Đặt vé trực tuyến | `DonDatVe`, `VeXe`, `ChuyenXe`, `GheChuyen`, `DiemDonTra` |
| 3.2 | Bán vé & In vé tại quầy | `DonDatVe`, `VeXe`, `BanVeQuay` |
| 3.3 | Giữ chỗ tạm thời | `GheChuyen`, `ThamSo` |
| 3.4 | Thanh toán | `ThanhToan`, `DonDatVe` |
| 3.5 | Áp dụng mã giảm giá | `MaGiamGia`, `DonDatVe`, `VeXe` |
| 4.1 | Xem lịch sử mua vé | `DonDatVe`, `VeXe`, `ChuyenXe` |
| 4.2 | Tra cứu vé | `VeXe`, `DonDatVe` |
| 4.3 | Hủy vé trực tuyến | `VeXe`, `HoanTien`, `ThanhToan`, `ThamSo` |
| 4.4 | Hủy vé tại quầy | `VeXe`, `HoanTien`, `NhatKyHoatDong` |
| 4.5 | Hoàn tiền | `HoanTien`, `ThanhToan`, `ThamSo` |
| 4.6 | Quản lý đơn đặt vé | `DonDatVe`, `VeXe`, `ThanhToan`, `HoanTien` |
| 5.1 | Thống kê doanh thu | `VeXe`, `DonDatVe`, `ThanhToan`, `HoanTien`, `TuyenXe` |
| 5.2 | Thống kê vé bán & vé hủy | `VeXe` |
| 5.3 | Thống kê tỷ lệ lấp đầy chỗ ngồi | `ChuyenXe`, `Ghe`, `VeXe` |
| 5.4–5.5 | Bảng điều khiển / Xuất báo cáo | (tổng hợp từ 5.1–5.3) |
