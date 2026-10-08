# SEQUENCE DIAGRAM — PHẦN 2: NHÓM QUẢN TRỊ

Tiếp theo `Sequence_Diagrams_P1_NghiepVu.md` (SD01 đến SD11).
Quy ước ký hiệu và phân lớp đối tượng xem ở file phần 1.

---

## SD12 - Quản lý chuyến xe & lịch trình

Use case: **UC-12 (sơ đồ D12)**

### Đối tượng tham gia

| Đối tượng | Loại |
|---|---|
| Admin | Tác nhân |
| :GiaoDienQuanLyChuyen | Giao diện (boundary) |
| :DieuKhienChuyenXe | Điều khiển (control) |
| :ChuyenXe | Thực thể (entity) |
| :Xe | Thực thể (entity) |
| :GheChuyenXe | Thực thể (entity) |
| :Ve | Thực thể (entity) |
| :DieuKhienHoanTien | Điều khiển (control) |
| CỔNG THANH TOÁN | Hệ thống ngoài |

### Sơ đồ

```mermaid
sequenceDiagram
    autonumber
    actor P0 as Admin
    participant P1 as :GiaoDienQuanLyChuyen
    participant P2 as :DieuKhienChuyenXe
    participant P3 as :ChuyenXe
    participant P4 as :Xe
    participant P5 as :GheChuyenXe
    participant P6 as :Ve
    participant P7 as :DieuKhienHoanTien
    actor P8 as CỔNG THANH TOÁN
    P0->>P1: xemDanhSachChuyenXe()
    P1->>P2: layDanhSachChuyen(boLoc)
    P2->>P3: truyVanChuyen(boLoc)
    P3-->>P2: danhSachChuyen
    P2-->>P1: danhSachChuyen
    P1->>P0: hienThiDanhSach()
    opt «extend» Tìm kiếm chuyến xe
    P0->>P1: timKiemChuyenXe(tuKhoa, ngay, tuyen)
    P1->>P2: timKiem(dieuKien)
    P2-->>P1: ketQuaTimKiem
    end
    opt Thêm chuyến xe mới
    P0->>P1: themChuyenXeMoi(maXe, tuyen, gioChay, giaVe)
    P1->>P2: taoChuyenXe(duLieu)
    P2->>P4: kiemTraXeHoatDong(maXe)
    P4-->>P2: xeHopLe
    P2->>P2: kiemTraTrungLichXe()
    P2->>P3: taoChuyenXe(DA_LEN_LICH)
    P2->>P4: laySoDoGhe(maXe)
    P4-->>P2: danhSachGhe
    P2->>P5: sinhGheChoChuyen(CON_TRONG)
    end
    opt Sửa lịch trình chuyến xe
    P0->>P1: suaLichTrinh(maChuyen, gioChayMoi)
    P1->>P2: capNhatLichTrinh(maChuyen, duLieuMoi)
    P2->>P3: capNhat(duLieuMoi)
    P2-->>P1: daCapNhat
    end
    opt Hủy chuyến xe
    P0->>P1: huyChuyenXe(maChuyen, lyDo)
    P1->>P2: huyChuyen(maChuyen, lyDo)
    P2->>P3: capNhatTrangThai(DA_HUY)
    loop «extend» Xử lý vé của chuyến bị hủy — mỗi vé đã phát hành
    P2->>P6: layDanhSachVeDaPhatHanh(maChuyen)
    P6-->>P2: danhSachVe
    opt «include» Hoàn tiền (lặp cho từng vé)
    P2->>P7: hoanTien(maVe, 100%)
    P7->>P8: yeuCauHoanTien(maGiaoDich, soTien)
    P8-->>P7: ketQuaHoanTien
    P7-->>P2: ketQuaHoanTien
    end
    P2->>P6: capNhatTrangThai(DA_HUY, lyDo=CHUYEN_BI_HUY)
    end
    P2-->>P1: banTongHop(soVeHuy, soTienHoan)
    P1->>P0: hienThiKetQuaHuyChuyen()
    end
```

### Bảng thông điệp

| STT | Từ | Đến | Thông điệp | Loại |
|---|---|---|---|---|
| 1 | Admin | :GiaoDienQuanLyChuyen | xemDanhSachChuyenXe() | Đồng bộ |
| 2 | :GiaoDienQuanLyChuyen | :DieuKhienChuyenXe | layDanhSachChuyen(boLoc) | Đồng bộ |
| 3 | :DieuKhienChuyenXe | :ChuyenXe | truyVanChuyen(boLoc) | Đồng bộ |
| - | :ChuyenXe | :DieuKhienChuyenXe | danhSachChuyen | Đáp ứng |
| - | :DieuKhienChuyenXe | :GiaoDienQuanLyChuyen | danhSachChuyen | Đáp ứng |
| 4 | :GiaoDienQuanLyChuyen | Admin | hienThiDanhSach() | Đồng bộ |
| 5 | Admin | :GiaoDienQuanLyChuyen | timKiemChuyenXe(tuKhoa, ngay, tuyen) | Đồng bộ |
| 6 | :GiaoDienQuanLyChuyen | :DieuKhienChuyenXe | timKiem(dieuKien) | Đồng bộ |
| - | :DieuKhienChuyenXe | :GiaoDienQuanLyChuyen | ketQuaTimKiem | Đáp ứng |
| 7 | Admin | :GiaoDienQuanLyChuyen | themChuyenXeMoi(maXe, tuyen, gioChay, giaVe) | Đồng bộ |
| 8 | :GiaoDienQuanLyChuyen | :DieuKhienChuyenXe | taoChuyenXe(duLieu) | Đồng bộ |
| 9 | :DieuKhienChuyenXe | :Xe | kiemTraXeHoatDong(maXe) | Đồng bộ |
| - | :Xe | :DieuKhienChuyenXe | xeHopLe | Đáp ứng |
| 10 | :DieuKhienChuyenXe | :DieuKhienChuyenXe | kiemTraTrungLichXe() | Đồng bộ |
| 11 | :DieuKhienChuyenXe | :ChuyenXe | taoChuyenXe(DA_LEN_LICH) | Tạo đối tượng |
| 12 | :DieuKhienChuyenXe | :Xe | laySoDoGhe(maXe) | Đồng bộ |
| - | :Xe | :DieuKhienChuyenXe | danhSachGhe | Đáp ứng |
| 13 | :DieuKhienChuyenXe | :GheChuyenXe | sinhGheChoChuyen(CON_TRONG) | Tạo đối tượng |
| 14 | Admin | :GiaoDienQuanLyChuyen | suaLichTrinh(maChuyen, gioChayMoi) | Đồng bộ |
| 15 | :GiaoDienQuanLyChuyen | :DieuKhienChuyenXe | capNhatLichTrinh(maChuyen, duLieuMoi) | Đồng bộ |
| 16 | :DieuKhienChuyenXe | :ChuyenXe | capNhat(duLieuMoi) | Đồng bộ |
| - | :DieuKhienChuyenXe | :GiaoDienQuanLyChuyen | daCapNhat | Đáp ứng |
| 17 | Admin | :GiaoDienQuanLyChuyen | huyChuyenXe(maChuyen, lyDo) | Đồng bộ |
| 18 | :GiaoDienQuanLyChuyen | :DieuKhienChuyenXe | huyChuyen(maChuyen, lyDo) | Đồng bộ |
| 19 | :DieuKhienChuyenXe | :ChuyenXe | capNhatTrangThai(DA_HUY) | Đồng bộ |
| 20 | :DieuKhienChuyenXe | :Ve | layDanhSachVeDaPhatHanh(maChuyen) | Đồng bộ |
| - | :Ve | :DieuKhienChuyenXe | danhSachVe | Đáp ứng |
| 21 | :DieuKhienChuyenXe | :DieuKhienHoanTien | hoanTien(maVe, 100%) | Đồng bộ |
| 22 | :DieuKhienHoanTien | CỔNG THANH TOÁN | yeuCauHoanTien(maGiaoDich, soTien) | Đồng bộ |
| - | CỔNG THANH TOÁN | :DieuKhienHoanTien | ketQuaHoanTien | Đáp ứng |
| - | :DieuKhienHoanTien | :DieuKhienChuyenXe | ketQuaHoanTien | Đáp ứng |
| 23 | :DieuKhienChuyenXe | :Ve | capNhatTrangThai(DA_HUY, lyDo=CHUYEN_BI_HUY) | Đồng bộ |
| - | :DieuKhienChuyenXe | :GiaoDienQuanLyChuyen | banTongHop(soVeHuy, soTienHoan) | Đáp ứng |
| 24 | :GiaoDienQuanLyChuyen | Admin | hienThiKetQuaHuyChuyen() | Đồng bộ |

> extend: Tìm kiếm chuyến xe, Xử lý vé của chuyến bị hủy. include: Xử lý vé của chuyến bị hủy -> Hoàn tiền (hoàn 100%). Thêm chuyến mới sẽ sinh toàn bộ ghế của chuyến từ sơ đồ ghế của xe.

---

## SD13 - Quản lý xe & sơ đồ ghế

Use case: **UC-13 (sơ đồ D13)**

### Đối tượng tham gia

| Đối tượng | Loại |
|---|---|
| Admin | Tác nhân |
| :GiaoDienQuanLyXe | Giao diện (boundary) |
| :DieuKhienXe | Điều khiển (control) |
| :Xe | Thực thể (entity) |
| :GheXe | Thực thể (entity) |
| :ChuyenXe | Thực thể (entity) |

### Sơ đồ

```mermaid
sequenceDiagram
    autonumber
    actor P0 as Admin
    participant P1 as :GiaoDienQuanLyXe
    participant P2 as :DieuKhienXe
    participant P3 as :Xe
    participant P4 as :GheXe
    participant P5 as :ChuyenXe
    P0->>P1: xemDanhSachXe()
    P1->>P2: layDanhSachXe(boLoc)
    P2->>P3: truyVanXe(boLoc)
    P3-->>P2: danhSachXe
    P2-->>P1: danhSachXe
    P1->>P0: hienThiDanhSachXe()
    opt «extend» Xem sơ đồ ghế của xe
    P0->>P1: xemSoDoGheCuaXe(maXe)
    P1->>P2: laySoDoGhe(maXe)
    P2->>P4: layDanhSachGhe(maXe)
    P4-->>P2: danhSachGhe
    P1->>P0: hienThiSoDoGhe()
    end
    opt Thêm xe mới
    P0->>P1: themXeMoi(bienSo, loaiXe, danhSachGhe)
    P1->>P2: taoXe(duLieu, danhSachGhe)
    P2->>P2: kiemTraBienSoChuaTonTai()
    P2->>P2: kiemTraCoSoDoGhe()
    P2->>P3: taoXe(HOAT_DONG)
    opt «include» Thiết lập sơ đồ ghế (bắt buộc)
    P2->>P4: thietLapSoDoGhe(danhSachGhe)
    end
    P2-->>P1: taoThanhCong
    P1->>P0: thongBaoThemXeThanhCong()
    end
    opt Sửa thông tin xe
    P0->>P1: suaThongTinXe(maXe, duLieuMoi)
    P1->>P2: capNhatXe(maXe, duLieuMoi)
    P2->>P3: capNhat(duLieuMoi)
    P2-->>P1: daCapNhat
    end
    opt Ngừng hoạt động xe
    P0->>P1: ngungHoatDongXe(maXe)
    P1->>P2: ngungHoatDong(maXe)
    P2->>P5: kiemTraChuyenSapChay(maXe)
    P5-->>P2: soChuyenSapChay
    alt [xe không còn chuyến sắp chạy]
    P2->>P3: capNhatTrangThai(NGUNG_HOAT_DONG)
    else [xe còn chuyến sắp chạy]
    P1->>P0: thongBaoLoi(VEHICLE_HAS_UPCOMING_TRIPS)
    end
    end
```

### Bảng thông điệp

| STT | Từ | Đến | Thông điệp | Loại |
|---|---|---|---|---|
| 1 | Admin | :GiaoDienQuanLyXe | xemDanhSachXe() | Đồng bộ |
| 2 | :GiaoDienQuanLyXe | :DieuKhienXe | layDanhSachXe(boLoc) | Đồng bộ |
| 3 | :DieuKhienXe | :Xe | truyVanXe(boLoc) | Đồng bộ |
| - | :Xe | :DieuKhienXe | danhSachXe | Đáp ứng |
| - | :DieuKhienXe | :GiaoDienQuanLyXe | danhSachXe | Đáp ứng |
| 4 | :GiaoDienQuanLyXe | Admin | hienThiDanhSachXe() | Đồng bộ |
| 5 | Admin | :GiaoDienQuanLyXe | xemSoDoGheCuaXe(maXe) | Đồng bộ |
| 6 | :GiaoDienQuanLyXe | :DieuKhienXe | laySoDoGhe(maXe) | Đồng bộ |
| 7 | :DieuKhienXe | :GheXe | layDanhSachGhe(maXe) | Đồng bộ |
| - | :GheXe | :DieuKhienXe | danhSachGhe | Đáp ứng |
| 8 | :GiaoDienQuanLyXe | Admin | hienThiSoDoGhe() | Đồng bộ |
| 9 | Admin | :GiaoDienQuanLyXe | themXeMoi(bienSo, loaiXe, danhSachGhe) | Đồng bộ |
| 10 | :GiaoDienQuanLyXe | :DieuKhienXe | taoXe(duLieu, danhSachGhe) | Đồng bộ |
| 11 | :DieuKhienXe | :DieuKhienXe | kiemTraBienSoChuaTonTai() | Đồng bộ |
| 12 | :DieuKhienXe | :DieuKhienXe | kiemTraCoSoDoGhe() | Đồng bộ |
| 13 | :DieuKhienXe | :Xe | taoXe(HOAT_DONG) | Tạo đối tượng |
| 14 | :DieuKhienXe | :GheXe | thietLapSoDoGhe(danhSachGhe) | Tạo đối tượng |
| - | :DieuKhienXe | :GiaoDienQuanLyXe | taoThanhCong | Đáp ứng |
| 15 | :GiaoDienQuanLyXe | Admin | thongBaoThemXeThanhCong() | Đồng bộ |
| 16 | Admin | :GiaoDienQuanLyXe | suaThongTinXe(maXe, duLieuMoi) | Đồng bộ |
| 17 | :GiaoDienQuanLyXe | :DieuKhienXe | capNhatXe(maXe, duLieuMoi) | Đồng bộ |
| 18 | :DieuKhienXe | :Xe | capNhat(duLieuMoi) | Đồng bộ |
| - | :DieuKhienXe | :GiaoDienQuanLyXe | daCapNhat | Đáp ứng |
| 19 | Admin | :GiaoDienQuanLyXe | ngungHoatDongXe(maXe) | Đồng bộ |
| 20 | :GiaoDienQuanLyXe | :DieuKhienXe | ngungHoatDong(maXe) | Đồng bộ |
| 21 | :DieuKhienXe | :ChuyenXe | kiemTraChuyenSapChay(maXe) | Đồng bộ |
| - | :ChuyenXe | :DieuKhienXe | soChuyenSapChay | Đáp ứng |
| 22 | :DieuKhienXe | :Xe | capNhatTrangThai(NGUNG_HOAT_DONG) | Đồng bộ |
| 23 | :GiaoDienQuanLyXe | Admin | thongBaoLoi(VEHICLE_HAS_UPCOMING_TRIPS) | Đồng bộ |

> include: Thêm xe mới -> Thiết lập sơ đồ ghế (bắt buộc). extend: Xem sơ đồ ghế của xe. Ngừng hoạt động là xóa mềm.

---

## SD14 - Quản lý giá vé & khuyến mãi

Use case: **UC-14 (sơ đồ D14)**

### Đối tượng tham gia

| Đối tượng | Loại |
|---|---|
| Admin | Tác nhân |
| :GiaoDienGiaVeKhuyenMai | Giao diện (boundary) |
| :DieuKhienGiaVe | Điều khiển (control) |
| :ChuyenXe | Thực thể (entity) |
| :KhuyenMai | Thực thể (entity) |

### Sơ đồ

```mermaid
sequenceDiagram
    autonumber
    actor P0 as Admin
    participant P1 as :GiaoDienGiaVeKhuyenMai
    participant P2 as :DieuKhienGiaVe
    participant P3 as :ChuyenXe
    participant P4 as :KhuyenMai
    P0->>P1: xemGiaVeCacChuyen()
    P1->>P2: layBangGiaVe()
    P2->>P3: truyVanGiaVe()
    P3-->>P2: bangGiaVe
    P2-->>P1: bangGiaVe
    P1->>P0: hienThiBangGiaVe()
    opt Cập nhật giá vé chuyến xe
    P0->>P1: capNhatGiaVe(maChuyen, giaMoi)
    P1->>P2: capNhatGiaVeChuyen(maChuyen, giaMoi)
    P2->>P2: kiemTraChuyenConHieuLuc()
    P2->>P3: capNhatGia(giaMoi)
    P3-->>P2: daCapNhat
    P1->>P0: thongBaoCapNhatGiaThanhCong()
    end
    P0->>P1: xemDanhSachMaGiamGia()
    P1->>P2: layDanhSachMa()
    P2->>P4: truyVanMa()
    P4-->>P2: danhSachMa
    P2-->>P1: danhSachMa + trangThai
    P1->>P0: hienThiDanhSachMa()
    opt Thêm mã giảm giá mới
    P0->>P1: themMaGiamGiaMoi(ma, tyLe, soLuong, thoiHan)
    P1->>P2: taoMaGiamGia(duLieu)
    P2->>P2: kiemTraMaChuaTonTai()
    P2->>P4: taoMa(dangHoatDong=true)
    P2-->>P1: taoThanhCong
    end
    opt «extend» Bật / Tắt mã giảm giá
    P0->>P1: batTatMaGiamGia(ma, trangThai)
    P1->>P2: doiTrangThaiMa(ma, trangThai)
    P2->>P4: capNhatDangHoatDong(trangThai)
    P4-->>P2: daCapNhat
    P1->>P0: hienThiTrangThaiMoi()
    end
```

### Bảng thông điệp

| STT | Từ | Đến | Thông điệp | Loại |
|---|---|---|---|---|
| 1 | Admin | :GiaoDienGiaVeKhuyenMai | xemGiaVeCacChuyen() | Đồng bộ |
| 2 | :GiaoDienGiaVeKhuyenMai | :DieuKhienGiaVe | layBangGiaVe() | Đồng bộ |
| 3 | :DieuKhienGiaVe | :ChuyenXe | truyVanGiaVe() | Đồng bộ |
| - | :ChuyenXe | :DieuKhienGiaVe | bangGiaVe | Đáp ứng |
| - | :DieuKhienGiaVe | :GiaoDienGiaVeKhuyenMai | bangGiaVe | Đáp ứng |
| 4 | :GiaoDienGiaVeKhuyenMai | Admin | hienThiBangGiaVe() | Đồng bộ |
| 5 | Admin | :GiaoDienGiaVeKhuyenMai | capNhatGiaVe(maChuyen, giaMoi) | Đồng bộ |
| 6 | :GiaoDienGiaVeKhuyenMai | :DieuKhienGiaVe | capNhatGiaVeChuyen(maChuyen, giaMoi) | Đồng bộ |
| 7 | :DieuKhienGiaVe | :DieuKhienGiaVe | kiemTraChuyenConHieuLuc() | Đồng bộ |
| 8 | :DieuKhienGiaVe | :ChuyenXe | capNhatGia(giaMoi) | Đồng bộ |
| - | :ChuyenXe | :DieuKhienGiaVe | daCapNhat | Đáp ứng |
| 9 | :GiaoDienGiaVeKhuyenMai | Admin | thongBaoCapNhatGiaThanhCong() | Đồng bộ |
| 10 | Admin | :GiaoDienGiaVeKhuyenMai | xemDanhSachMaGiamGia() | Đồng bộ |
| 11 | :GiaoDienGiaVeKhuyenMai | :DieuKhienGiaVe | layDanhSachMa() | Đồng bộ |
| 12 | :DieuKhienGiaVe | :KhuyenMai | truyVanMa() | Đồng bộ |
| - | :KhuyenMai | :DieuKhienGiaVe | danhSachMa | Đáp ứng |
| - | :DieuKhienGiaVe | :GiaoDienGiaVeKhuyenMai | danhSachMa + trangThai | Đáp ứng |
| 13 | :GiaoDienGiaVeKhuyenMai | Admin | hienThiDanhSachMa() | Đồng bộ |
| 14 | Admin | :GiaoDienGiaVeKhuyenMai | themMaGiamGiaMoi(ma, tyLe, soLuong, thoiHan) | Đồng bộ |
| 15 | :GiaoDienGiaVeKhuyenMai | :DieuKhienGiaVe | taoMaGiamGia(duLieu) | Đồng bộ |
| 16 | :DieuKhienGiaVe | :DieuKhienGiaVe | kiemTraMaChuaTonTai() | Đồng bộ |
| 17 | :DieuKhienGiaVe | :KhuyenMai | taoMa(dangHoatDong=true) | Tạo đối tượng |
| - | :DieuKhienGiaVe | :GiaoDienGiaVeKhuyenMai | taoThanhCong | Đáp ứng |
| 18 | Admin | :GiaoDienGiaVeKhuyenMai | batTatMaGiamGia(ma, trangThai) | Đồng bộ |
| 19 | :GiaoDienGiaVeKhuyenMai | :DieuKhienGiaVe | doiTrangThaiMa(ma, trangThai) | Đồng bộ |
| 20 | :DieuKhienGiaVe | :KhuyenMai | capNhatDangHoatDong(trangThai) | Đồng bộ |
| - | :KhuyenMai | :DieuKhienGiaVe | daCapNhat | Đáp ứng |
| 21 | :GiaoDienGiaVeKhuyenMai | Admin | hienThiTrangThaiMoi() | Đồng bộ |

> extend: Bật / Tắt mã giảm giá (không xóa mã). Giá vé mới chỉ áp dụng cho đơn đặt sau đó, vé cũ giữ giá đã chụp lúc đặt.

---

## SD15 - Quản lý tài khoản & phân quyền

Use case: **UC-15 (sơ đồ D15)**

### Đối tượng tham gia

| Đối tượng | Loại |
|---|---|
| Admin | Tác nhân |
| :GiaoDienQuanLyTaiKhoan | Giao diện (boundary) |
| :DieuKhienTaiKhoan | Điều khiển (control) |
| :TaiKhoan | Thực thể (entity) |
| :VaiTro | Thực thể (entity) |
| :NhatKyHoatDong | Thực thể (entity) |

### Sơ đồ

```mermaid
sequenceDiagram
    autonumber
    actor P0 as Admin
    participant P1 as :GiaoDienQuanLyTaiKhoan
    participant P2 as :DieuKhienTaiKhoan
    participant P3 as :TaiKhoan
    participant P4 as :VaiTro
    participant P5 as :NhatKyHoatDong
    P0->>P1: xemDanhSachNguoiDung()
    P1->>P2: layDanhSachNguoiDung(boLoc)
    P2->>P3: truyVanTaiKhoan(boLoc)
    P3-->>P2: danhSachTaiKhoan
    P2-->>P1: danhSachTaiKhoan
    P1->>P0: hienThiDanhSach()
    opt «extend» Tìm kiếm tài khoản
    P0->>P1: timKiemTaiKhoan(tuKhoa, vaiTro, trangThai)
    P1->>P2: timKiem(dieuKien)
    P2-->>P1: ketQuaTimKiem
    end
    opt «extend» Xem chi tiết hồ sơ & lịch sử hoạt động
    P0->>P1: xemChiTietHoSo(maTK)
    P1->>P2: layChiTietVaNhatKy(maTK)
    P2->>P5: layNhatKyHoatDong(maTK)
    P5-->>P2: danhSachHoatDong
    P1->>P0: hienThiHoSo + lichSuHoatDong()
    end
    opt Tạo tài khoản nhân viên
    P0->>P1: taoTaiKhoanNhanVien(sdt, hoTen, matKhau, vaiTro)
    P1->>P2: taoNhanVien(duLieu)
    P2->>P2: kiemTraSoChuaDangKy()
    opt «include» Phân quyền vai trò
    P2->>P4: phanQuyenVaiTro(vaiTro)
    P4-->>P2: vaiTroHopLe
    end
    P2->>P3: taoTaiKhoan(vaiTro, DANG_HOAT_DONG)
    P2->>P5: ghiNhatKy(TAO_TAI_KHOAN)
    P2-->>P1: taoThanhCong
    end
    opt Cập nhật tài khoản nhân viên
    P0->>P1: capNhatTaiKhoanNhanVien(maTK, duLieu, vaiTro)
    P1->>P2: capNhatNhanVien(maTK, duLieu)
    opt «include» Phân quyền vai trò
    P2->>P4: phanQuyenVaiTro(vaiTro)
    P4-->>P2: vaiTroHopLe
    end
    P2->>P2: kiemTraKhongTuHaQuyen()
    P2->>P3: capNhat(duLieu, vaiTro)
    P2-->>P1: daCapNhat
    end
    opt Khóa / Mở khóa tài khoản người dùng
    P0->>P1: khoaMoKhoaTaiKhoan(maTK, trangThai)
    P1->>P2: doiTrangThaiTaiKhoan(maTK, trangThai)
    P2->>P2: kiemTraKhongPhaiAdminCuoiCung()
    P2->>P3: capNhatTrangThai(BI_KHOA)
    P2->>P3: tangTokenVersion()
    end
    opt Đặt lại mật khẩu cho nhân viên
    P0->>P1: datLaiMatKhauNhanVien(maTK, matKhauMoi)
    P1->>P2: datLaiMatKhau(maTK, matKhauMoi)
    P2->>P3: capNhatMatKhau(matKhauMoi)
    P2->>P3: tangTokenVersion()
    P2-->>P1: daDatLai
    end
```

### Bảng thông điệp

| STT | Từ | Đến | Thông điệp | Loại |
|---|---|---|---|---|
| 1 | Admin | :GiaoDienQuanLyTaiKhoan | xemDanhSachNguoiDung() | Đồng bộ |
| 2 | :GiaoDienQuanLyTaiKhoan | :DieuKhienTaiKhoan | layDanhSachNguoiDung(boLoc) | Đồng bộ |
| 3 | :DieuKhienTaiKhoan | :TaiKhoan | truyVanTaiKhoan(boLoc) | Đồng bộ |
| - | :TaiKhoan | :DieuKhienTaiKhoan | danhSachTaiKhoan | Đáp ứng |
| - | :DieuKhienTaiKhoan | :GiaoDienQuanLyTaiKhoan | danhSachTaiKhoan | Đáp ứng |
| 4 | :GiaoDienQuanLyTaiKhoan | Admin | hienThiDanhSach() | Đồng bộ |
| 5 | Admin | :GiaoDienQuanLyTaiKhoan | timKiemTaiKhoan(tuKhoa, vaiTro, trangThai) | Đồng bộ |
| 6 | :GiaoDienQuanLyTaiKhoan | :DieuKhienTaiKhoan | timKiem(dieuKien) | Đồng bộ |
| - | :DieuKhienTaiKhoan | :GiaoDienQuanLyTaiKhoan | ketQuaTimKiem | Đáp ứng |
| 7 | Admin | :GiaoDienQuanLyTaiKhoan | xemChiTietHoSo(maTK) | Đồng bộ |
| 8 | :GiaoDienQuanLyTaiKhoan | :DieuKhienTaiKhoan | layChiTietVaNhatKy(maTK) | Đồng bộ |
| 9 | :DieuKhienTaiKhoan | :NhatKyHoatDong | layNhatKyHoatDong(maTK) | Đồng bộ |
| - | :NhatKyHoatDong | :DieuKhienTaiKhoan | danhSachHoatDong | Đáp ứng |
| 10 | :GiaoDienQuanLyTaiKhoan | Admin | hienThiHoSo + lichSuHoatDong() | Đồng bộ |
| 11 | Admin | :GiaoDienQuanLyTaiKhoan | taoTaiKhoanNhanVien(sdt, hoTen, matKhau, vaiTro) | Đồng bộ |
| 12 | :GiaoDienQuanLyTaiKhoan | :DieuKhienTaiKhoan | taoNhanVien(duLieu) | Đồng bộ |
| 13 | :DieuKhienTaiKhoan | :DieuKhienTaiKhoan | kiemTraSoChuaDangKy() | Đồng bộ |
| 14 | :DieuKhienTaiKhoan | :VaiTro | phanQuyenVaiTro(vaiTro) | Đồng bộ |
| - | :VaiTro | :DieuKhienTaiKhoan | vaiTroHopLe | Đáp ứng |
| 15 | :DieuKhienTaiKhoan | :TaiKhoan | taoTaiKhoan(vaiTro, DANG_HOAT_DONG) | Tạo đối tượng |
| 16 | :DieuKhienTaiKhoan | :NhatKyHoatDong | ghiNhatKy(TAO_TAI_KHOAN) | Đồng bộ |
| - | :DieuKhienTaiKhoan | :GiaoDienQuanLyTaiKhoan | taoThanhCong | Đáp ứng |
| 17 | Admin | :GiaoDienQuanLyTaiKhoan | capNhatTaiKhoanNhanVien(maTK, duLieu, vaiTro) | Đồng bộ |
| 18 | :GiaoDienQuanLyTaiKhoan | :DieuKhienTaiKhoan | capNhatNhanVien(maTK, duLieu) | Đồng bộ |
| 19 | :DieuKhienTaiKhoan | :VaiTro | phanQuyenVaiTro(vaiTro) | Đồng bộ |
| - | :VaiTro | :DieuKhienTaiKhoan | vaiTroHopLe | Đáp ứng |
| 20 | :DieuKhienTaiKhoan | :DieuKhienTaiKhoan | kiemTraKhongTuHaQuyen() | Đồng bộ |
| 21 | :DieuKhienTaiKhoan | :TaiKhoan | capNhat(duLieu, vaiTro) | Đồng bộ |
| - | :DieuKhienTaiKhoan | :GiaoDienQuanLyTaiKhoan | daCapNhat | Đáp ứng |
| 22 | Admin | :GiaoDienQuanLyTaiKhoan | khoaMoKhoaTaiKhoan(maTK, trangThai) | Đồng bộ |
| 23 | :GiaoDienQuanLyTaiKhoan | :DieuKhienTaiKhoan | doiTrangThaiTaiKhoan(maTK, trangThai) | Đồng bộ |
| 24 | :DieuKhienTaiKhoan | :DieuKhienTaiKhoan | kiemTraKhongPhaiAdminCuoiCung() | Đồng bộ |
| 25 | :DieuKhienTaiKhoan | :TaiKhoan | capNhatTrangThai(BI_KHOA) | Đồng bộ |
| 26 | :DieuKhienTaiKhoan | :TaiKhoan | tangTokenVersion() | Đồng bộ |
| 27 | Admin | :GiaoDienQuanLyTaiKhoan | datLaiMatKhauNhanVien(maTK, matKhauMoi) | Đồng bộ |
| 28 | :GiaoDienQuanLyTaiKhoan | :DieuKhienTaiKhoan | datLaiMatKhau(maTK, matKhauMoi) | Đồng bộ |
| 29 | :DieuKhienTaiKhoan | :TaiKhoan | capNhatMatKhau(matKhauMoi) | Đồng bộ |
| 30 | :DieuKhienTaiKhoan | :TaiKhoan | tangTokenVersion() | Đồng bộ |
| - | :DieuKhienTaiKhoan | :GiaoDienQuanLyTaiKhoan | daDatLai | Đáp ứng |

> include: Tạo / Cập nhật tài khoản nhân viên -> Phân quyền vai trò. extend: Tìm kiếm tài khoản, Xem chi tiết hồ sơ & lịch sử hoạt động. Khóa tài khoản sẽ tăng token_version để đá phiên đang đăng nhập.

---

## SD16 - Thống kê & báo cáo doanh thu

Use case: **UC-16 (sơ đồ D16)**

### Đối tượng tham gia

| Đối tượng | Loại |
|---|---|
| Admin | Tác nhân |
| :GiaoDienThongKe | Giao diện (boundary) |
| :DieuKhienThongKe | Điều khiển (control) |
| :GiaoDichThanhToan | Thực thể (entity) |
| :HoanTien | Thực thể (entity) |
| :Ve | Thực thể (entity) |
| :GheChuyenXe | Thực thể (entity) |
| :BaoCao | Thực thể (entity) |

### Sơ đồ

```mermaid
sequenceDiagram
    autonumber
    actor P0 as Admin
    participant P1 as :GiaoDienThongKe
    participant P2 as :DieuKhienThongKe
    participant P3 as :GiaoDichThanhToan
    participant P4 as :HoanTien
    participant P5 as :Ve
    participant P6 as :GheChuyenXe
    participant P7 as :BaoCao
    P0->>P1: moBangDieuKhien()
    P1->>P2: xemBangDieuKhienTongQuan(tuNgay, denNgay)
    P2->>P3: tongTienThanhToanThanhCong(kyBaoCao)
    P3-->>P2: doanhThuGop
    P2->>P4: tongTienDaHoan(kyBaoCao)
    P4-->>P2: tienHoan
    P2->>P2: tinhDoanhThuRong()
    P2->>P5: demVeBanVaVeHuy(kyBaoCao)
    P5-->>P2: soVeBan, soVeHuy
    P2->>P6: tinhTyLeLapDay(kyBaoCao)
    P6-->>P2: tyLeLapDay
    P2-->>P1: duLieuTongQuan
    P1->>P0: hienThiBieuDoTongQuan()
    opt «extend» Lọc thống kê — áp cho cả 4 báo cáo
    P0->>P1: chonBoLoc(tuNgay, denNgay, nhomTheo, tuyen, kenh)
    P1->>P2: locThongKe(boLoc)
    P2->>P3: truyVanTheoBoLoc(boLoc)
    P3-->>P2: duLieuDoanhThu
    P2->>P5: truyVanTheoBoLoc(boLoc)
    P5-->>P2: duLieuVe
    P2->>P6: truyVanTheoBoLoc(boLoc)
    P6-->>P2: duLieuLapDay
    P2-->>P1: duLieuDaLoc
    P1->>P0: capNhatLaiCacBieuDo()
    end
    opt «extend» Xuất báo cáo
    P0->>P1: xuatBaoCao(loaiBaoCao, dinhDang)
    P1->>P2: xuatBaoCao(loaiBaoCao, boLoc, dinhDang)
    P2->>P7: taoBaoCao(duLieu, dinhDang)
    P7-->>P2: tepBaoCao
    P2-->>P1: tepBaoCao
    P1->>P0: taiTepVeMay()
    end
```

### Bảng thông điệp

| STT | Từ | Đến | Thông điệp | Loại |
|---|---|---|---|---|
| 1 | Admin | :GiaoDienThongKe | moBangDieuKhien() | Đồng bộ |
| 2 | :GiaoDienThongKe | :DieuKhienThongKe | xemBangDieuKhienTongQuan(tuNgay, denNgay) | Đồng bộ |
| 3 | :DieuKhienThongKe | :GiaoDichThanhToan | tongTienThanhToanThanhCong(kyBaoCao) | Đồng bộ |
| - | :GiaoDichThanhToan | :DieuKhienThongKe | doanhThuGop | Đáp ứng |
| 4 | :DieuKhienThongKe | :HoanTien | tongTienDaHoan(kyBaoCao) | Đồng bộ |
| - | :HoanTien | :DieuKhienThongKe | tienHoan | Đáp ứng |
| 5 | :DieuKhienThongKe | :DieuKhienThongKe | tinhDoanhThuRong() | Đồng bộ |
| 6 | :DieuKhienThongKe | :Ve | demVeBanVaVeHuy(kyBaoCao) | Đồng bộ |
| - | :Ve | :DieuKhienThongKe | soVeBan, soVeHuy | Đáp ứng |
| 7 | :DieuKhienThongKe | :GheChuyenXe | tinhTyLeLapDay(kyBaoCao) | Đồng bộ |
| - | :GheChuyenXe | :DieuKhienThongKe | tyLeLapDay | Đáp ứng |
| - | :DieuKhienThongKe | :GiaoDienThongKe | duLieuTongQuan | Đáp ứng |
| 8 | :GiaoDienThongKe | Admin | hienThiBieuDoTongQuan() | Đồng bộ |
| 9 | Admin | :GiaoDienThongKe | chonBoLoc(tuNgay, denNgay, nhomTheo, tuyen, kenh) | Đồng bộ |
| 10 | :GiaoDienThongKe | :DieuKhienThongKe | locThongKe(boLoc) | Đồng bộ |
| 11 | :DieuKhienThongKe | :GiaoDichThanhToan | truyVanTheoBoLoc(boLoc) | Đồng bộ |
| - | :GiaoDichThanhToan | :DieuKhienThongKe | duLieuDoanhThu | Đáp ứng |
| 12 | :DieuKhienThongKe | :Ve | truyVanTheoBoLoc(boLoc) | Đồng bộ |
| - | :Ve | :DieuKhienThongKe | duLieuVe | Đáp ứng |
| 13 | :DieuKhienThongKe | :GheChuyenXe | truyVanTheoBoLoc(boLoc) | Đồng bộ |
| - | :GheChuyenXe | :DieuKhienThongKe | duLieuLapDay | Đáp ứng |
| - | :DieuKhienThongKe | :GiaoDienThongKe | duLieuDaLoc | Đáp ứng |
| 14 | :GiaoDienThongKe | Admin | capNhatLaiCacBieuDo() | Đồng bộ |
| 15 | Admin | :GiaoDienThongKe | xuatBaoCao(loaiBaoCao, dinhDang) | Đồng bộ |
| 16 | :GiaoDienThongKe | :DieuKhienThongKe | xuatBaoCao(loaiBaoCao, boLoc, dinhDang) | Đồng bộ |
| 17 | :DieuKhienThongKe | :BaoCao | taoBaoCao(duLieu, dinhDang) | Tạo đối tượng |
| - | :BaoCao | :DieuKhienThongKe | tepBaoCao | Đáp ứng |
| - | :DieuKhienThongKe | :GiaoDienThongKe | tepBaoCao | Đáp ứng |
| 18 | :GiaoDienThongKe | Admin | taiTepVeMay() | Đồng bộ |

> extend: Lọc thống kê (áp cho cả 4 báo cáo), Xuất báo cáo. Doanh thu ròng = tổng thanh toán thành công trừ tiền đã hoàn.

---

## Đối chiếu đối tượng điều khiển với service backend

| Đối tượng điều khiển | Service trong `DacTaUseCase_v2.md` | Xuất hiện ở sơ đồ |
|---|---|---|
| `:DieuKhienXacThuc` | xác thực, RoleGuard | SD01 |
| `:DieuKhienDangKy`, `:DieuKhienMatKhau` | OtpService, SmsService | SD02, SD03, SD04 |
| `:DieuKhienHoSo` | — | SD05 |
| `:DieuKhienVe` | — | SD06 |
| `:DieuKhienChuyenXe` | — | SD07, SD12 |
| `:DieuKhienDatVe` | BookingService, SeatHoldService | SD08, SD09 |
| `:DieuKhienThanhToan` | PaymentService, PaymentGateway | SD08, SD09 |
| `:DieuKhienHuyVe` | TicketLookupService | SD10, SD11 |
| `:DieuKhienHoanTien` | RefundService | SD10, SD11, SD12 |
| `:DieuKhienXe` | — | SD13 |
| `:DieuKhienGiaVe` | — | SD14 |
| `:DieuKhienTaiKhoan` | RoleGuard, AuditService | SD15 |
| `:DieuKhienThongKe` | — | SD16 |

## Điểm cần xác nhận

Các điểm này lấy theo mặc định đã ghi trong `DacTaUseCase_v2.md` mục 11, nếu nhóm chốt khác thì sửa lại sơ đồ:

1. **SD08** — thời gian giữ chỗ ghi 10 phút theo quyết định của nhóm; sơ đồ use case không quy định.
2. **SD10** — hủy vé trực tuyến chỉ thực hiện sau khi hoàn tiền thành công. Nếu nhóm muốn hủy trước rồi hoàn sau thì đảo thứ tự thông điệp 13 và nhóm hoàn tiền.
3. **SD12** — `Hoàn tiền` được gọi từ `Xử lý vé của chuyến bị hủy`. Cần mở ảnh `12_QuanLyChuyenXeVaLichTrinh.png` đối chiếu xem có phải include trực tiếp từ `Hủy chuyến xe` không.
4. **SD11, SD16** — hướng mũi tên extend và use case đích của `Xuất báo cáo` chưa chắc chắn.
5. **SD16** — định dạng tệp xuất báo cáo chưa quy định, sơ đồ chỉ ghi `dinhDang`.

## Việc tiếp theo

Sau Sequence Diagram, theo kế hoạch đồ án là **sơ đồ lớp (Class Diagram)**. Danh sách lớp
có thể rút trực tiếp từ các đối tượng thực thể trong file này:
`TaiKhoan`, `VaiTro`, `MaOTP`, `PhienLamViec`, `Xe`, `GheXe`, `ChuyenXe`, `GheChuyenXe`,
`DonDatVe`, `Ve`, `GiaoDichThanhToan`, `HoanTien`, `KhuyenMai`, `NhatKyHoatDong`, `BaoCao`.

Các thao tác của từng lớp lấy từ cột "Thông điệp" trong các bảng ở trên — đây chính là
bước "ánh xạ thông điệp thành thao tác" mà Chương 4 mô tả.
