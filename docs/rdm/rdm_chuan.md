// ==========================================
// HỆ THỐNG QUẢN LÝ BÁN VÉ XE KHÁCH
// ==========================================


// ==========================================
// 1. PHÂN HỆ XÁC THỰC & PHÂN QUYỀN (RBAC)
// ==========================================

Table TaiKhoan {
  MaTK int [pk, increment]
  MaVaiTro int [not null]

  TenDangNhap varchar(50) [not null, unique]
  MatKhau varchar(255) [not null]

  TrangThai varchar(20) [not null, default: 'HoatDong']
  NgayTao datetime [not null, default: `now()`]
}


// Vai trò của tài khoản
Table VaiTro {
  MaVaiTro int [pk, increment]

  TenVaiTro varchar(50) [not null, unique]
  // QuanTri, NhanVienBanVe, TongDaiVien,
  // CSKH, TaiXe, KhachHang

  MoTa varchar(255)
}


// Chức năng của hệ thống
Table ChucNang {
  MaCN int [pk, increment]

  TenChucNang varchar(100) [not null, unique]
  MoTa varchar(255)
}


// Phân quyền theo vai trò
Table PhanQuyen {
  MaPQ int [pk, increment]

  MaVaiTro int [not null]
  MaCN int [not null]

  CoQuyenXem boolean [not null, default: false]
  CoQuyenThem boolean [not null, default: false]
  CoQuyenSua boolean [not null, default: false]
  CoQuyenXoa boolean [not null, default: false]

  indexes {
    (MaVaiTro, MaCN) [unique]
  }
}


// ==========================================
// 2. KHÁCH HÀNG & NHÂN VIÊN
// ==========================================

Table KhachHang {
  MaKH int [pk, increment]

  // Có thể NULL nếu khách vãng lai
  MaTK int [unique]
  HoTen varchar(100) [not null]
  SDT varchar(15) [not null]
  DiaChi varchar(255)

}


// Nhân viên
Table NhanVien {
  MaNV int [pk, increment]

  // Nhân viên bắt buộc có tài khoản
  MaTK int [not null, unique]
  HoTen varchar(100) [not null]
  SDT varchar(15) [not null]
  NgaySinh date
  ChucVu varchar(50) [not null]
  // NhanVienBanVe, TongDaiVien,
  // CSKH, TaiXe, PhuXe, QuanTri
  NgayVaoLam date
}


// ==========================================
// 3. QUẢN LÝ XE
// ==========================================

Table LoaiXe {
  MaLoaiXe int [pk, increment]

  TenLoaiXe varchar(100) [not null, unique]
  SoGhe int [not null]
  MoTa varchar(255)
}


Table Xe {
  MaXe int [pk, increment]

  MaLoaiXe int [not null]

  BienSo varchar(20) [not null, unique]
  HangXe varchar(100)
  NamSanXuat int

  TrangThai varchar(20) [not null, default: 'HoatDong']
  // HoatDong, BaoTri, NgungHoatDong
}


Table Ghe {
  MaGhe int [pk, increment]

  MaXe int [not null]

  SoGhe varchar(10) [not null]
  // A01, A02, B01...

  Tang int [not null, default: 1]

  TrangThai varchar(20) [not null, default: 'Trong']

  indexes {
    (MaXe, SoGhe) [unique]
  }
}


// ==========================================
// 4. QUẢN LÝ TUYẾN & CHUYẾN XE
// ==========================================

Table TuyenXe {
  MaTuyen int [pk, increment]

  DiemDi varchar(100) [not null]
  DiemDen varchar(100) [not null]

  KhoangCach decimal(10,2)
  ThoiGianDuKien int
  // Đơn vị: phút

  MoTa varchar(255)

  TrangThai varchar(20) [not null, default: 'HoatDong']
}


Table ChuyenXe {
  MaChuyen int [pk, increment]

  MaTuyen int [not null]
  MaXe int [not null]

  NgayKhoiHanh date [not null]
  GioKhoiHanh time [not null]

  GiaVe decimal(15,2) [not null]

  TrangThai varchar(20) [not null, default: 'SapKhoiHanh']
  // SapKhoiHanh, DangChay, HoanThanh, DaHuy

  GhiChu varchar(255)
}


// ==========================================
// 5. KHUYẾN MÃI
// ==========================================

Table KhuyenMai {
  MaKM int [pk, increment]

  TenKM varchar(100) [not null]

  MaCode varchar(50) [not null, unique]

  // PhanTram hoặc TienMat
  LoaiGiam varchar(20) [not null]

  // Ví dụ:
  // 10 = giảm 10%
  // 50000 = giảm 50.000đ
  GiaTriGiam decimal(15,2) [not null]

  // Chỉ dùng khi LoaiGiam = PhanTram
  GiaTriGiamToiDa decimal(15,2)

  // Đơn hàng tối thiểu để sử dụng mã
  DonToiThieu decimal(15,2) [not null, default: 0]

  NgayBatDau datetime [not null]
  NgayKetThuc datetime [not null]

  TrangThai varchar(20) [not null, default: 'HoatDong']

  MoTa varchar(255)
}


// ==========================================
// 6. ĐẶT VÉ
// ==========================================

Table DatVe {
  MaDatVe int [pk, increment]

  // Khách hàng sở hữu đơn
  MaKH int [not null]

  // Nhân viên hỗ trợ tạo đơn
  // NULL nếu khách tự đặt online
  MaNV int

  // Mỗi đơn tối đa 1 mã khuyến mãi
  MaKM int

  NgayDat datetime [not null, default: `now()`]

  TongTien decimal(15,2) [not null]

  TienGiam decimal(15,2) [not null, default: 0]

  TrangThai varchar(30) [not null, default: 'ChoThanhToan']
  // ChoThanhToan, DaThanhToan, DaHuy

  GhiChu varchar(255)
}


// ==========================================
// 7. CHI TIẾT ĐẶT VÉ
// ==========================================

Table CT_DatVe {
  MaCT int [pk, increment]

  MaDatVe int [not null]
  MaGhe int [not null]
  MaChuyen int [not null]

  DonGia decimal(15,2) [not null]

  indexes {
    (MaDatVe, MaGhe) [unique]
  }
}


// ==========================================
// 8. THANH TOÁN
// ==========================================

Table ThanhToan {
  MaThanhToan int [pk, increment]

  MaDatVe int [not null]

  PhuongThuc varchar(50) [not null]
  // VNPay, MoMo, TienMatTaiQuay, ChuyenKhoan

  SoTien decimal(15,2) [not null]

  MaGiaoDich varchar(100)

  ThoiGianThanhToan datetime [not null, default: `now()`]

  TrangThai varchar(30) [not null, default: 'ChoThanhToan']
  // ChoThanhToan, ThanhCong, ThatBai

  GhiChu varchar(255)
}


// ==========================================
// 9. LỊCH SỬ VÉ / LỊCH SỬ THAO TÁC
// ==========================================

Table LichSuVe {
  MaLichSu int [pk, increment]

  MaDatVe int [not null]

  // Tài khoản thực hiện thao tác
  // Có thể là khách hàng, nhân viên hoặc admin
  MaTK int [not null]

  HanhDong varchar(50) [not null]
  // TaoDon, ThanhToan, DoiGhe,
  // HuyVe, HoanTien

  ThoiGian datetime [not null, default: `now()`]

  LyDo varchar(255)
  GhiChu varchar(255)
}


// ==========================================
// 10. KHÓA NGOẠI
// ==========================================


// ---------- RBAC ----------

Ref: TaiKhoan.MaVaiTro > VaiTro.MaVaiTro

Ref: PhanQuyen.MaVaiTro > VaiTro.MaVaiTro
Ref: PhanQuyen.MaCN > ChucNang.MaCN


// ---------- Tài khoản - Người dùng ----------

Ref: KhachHang.MaTK - TaiKhoan.MaTK

Ref: NhanVien.MaTK - TaiKhoan.MaTK


// ---------- Xe ----------

Ref: Xe.MaLoaiXe > LoaiXe.MaLoaiXe

Ref: Ghe.MaXe > Xe.MaXe


// ---------- Tuyến - Chuyến ----------

Ref: ChuyenXe.MaTuyen > TuyenXe.MaTuyen

Ref: ChuyenXe.MaXe > Xe.MaXe


// ---------- Đặt vé ----------

Ref: DatVe.MaKH > KhachHang.MaKH

Ref: DatVe.MaNV > NhanVien.MaNV

Ref: DatVe.MaKM > KhuyenMai.MaKM

// ---------- Chi tiết vé ----------

Ref: CT_DatVe.MaDatVe > DatVe.MaDatVe

Ref: CT_DatVe.MaGhe > Ghe.MaGhe

Ref: CT_DatVe.MaChuyen > ChuyenXe.MaChuyen


// ---------- Thanh toán ----------

Ref: ThanhToan.MaDatVe > DatVe.MaDatVe


// ---------- Lịch sử ----------

Ref: LichSuVe.MaDatVe > DatVe.MaDatVe

Ref: LichSuVe.MaTK > TaiKhoan.MaTK