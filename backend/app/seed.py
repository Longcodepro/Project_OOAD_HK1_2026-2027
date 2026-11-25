"""Script nạp dữ liệu mẫu (Seed Data) quy mô lớn, bao phủ toàn quốc chuẩn xác ngoài đời.

Bao gồm:
- 90 Tuyến xe khách liên tỉnh thực tế bao phủ khắp 3 miền Bắc - Trung - Nam, Tây Nguyên và Miền Tây
- 30 Phương tiện thực tế với biển số theo tỉnh thành (TP.HCM, Hà Nội, Đà Nẵng, Lâm Đồng, Cần Thơ, Hải Phòng, Quảng Ninh, Lào Cai...)
- 4 Dòng xe chuyên dụng (Limousine 34 phòng, Giường nằm 40 chỗ, Cung điện 24 phòng VIP, Ghế ngồi VIP 28 chỗ)
- Hơn 900+ ghế vật lý với mã số và sơ đồ tầng chính xác
- Hơn 160+ chuyến xe khởi hành từ hôm nay trở đi với các khung giờ thực tế
- 6 Vai trò RBAC, 12 Chức năng và ma trận phân quyền
- Đội ngũ tài khoản Nhân viên, Tài xế, Quản trị và Khách hàng
- Mã voucher khuyến mãi thực tế (FUTA, Chào Bạn Mới, Tết...)
- Các đơn đặt vé mẫu đã thanh toán (VNPay, Tiền mặt tại quầy) và đơn đang chờ thanh toán.
"""

from datetime import date, datetime, time, timedelta
from decimal import Decimal

import argon2
from sqlalchemy import text

from app.infrastructure.db.models import (
    ChucNang,
    ChuyenXe,
    CT_DatVe,
    DatVe,
    Ghe,
    KhachHang,
    KhuyenMai,
    LichSuVe,
    LoaiXe,
    NhanVien,
    PhanQuyen,
    TaiKhoan,
    ThanhToan,
    TuyenXe,
    VaiTro,
    Xe,
)
from app.infrastructure.db.session import SessionLocal

ph = argon2.PasswordHasher()


def hash_pw(password: str) -> str:
    return ph.hash(password)


def seed_all():
    print("[seed] Bắt đầu nạp mạng lưới dữ liệu xe khách toàn quốc...")
    db = SessionLocal()

    try:
        # 1. Dọn sạch dữ liệu cũ theo thứ tự khóa ngoại
        print("[seed] Dọn sạch dữ liệu cũ...")
        db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        for tbl in [
            "LichSuVe",
            "ThanhToan",
            "CT_DatVe",
            "DatVe",
            "KhuyenMai",
            "ChuyenXe",
            "TuyenXe",
            "Ghe",
            "Xe",
            "LoaiXe",
            "NhanVien",
            "KhachHang",
            "PhanQuyen",
            "ChucNang",
            "TaiKhoan",
            "VaiTro",
        ]:
            db.execute(text(f"TRUNCATE TABLE `{tbl}`;"))
        db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        db.commit()

        # 2. Vai Trò
        print("[seed] Nạp danh mục VaiTro...")
        vaitro_data = [
            ("QuanTri", "Quản trị viên toàn quyền hệ thống"),
            ("NhanVienBanVe", "Nhân viên bán vé và xử lý nghiệp vụ tại quầy bến xe"),
            ("TongDaiVien", "Nhân viên tổng đài tiếp nhận đặt vé qua điện thoại"),
            ("CSKH", "Nhân viên chăm sóc khách hàng và giải quyết khiếu nại"),
            ("TaiXe", "Tài xế phụ trách phương tiện và chuyến xe"),
            ("KhachHang", "Khách hàng cá nhân đăng ký tài khoản trực tuyến"),
        ]
        vaitro_map: dict[str, VaiTro] = {}
        for ten, mota in vaitro_data:
            vt = VaiTro(TenVaiTro=ten, MoTa=mota)
            db.add(vt)
            vaitro_map[ten] = vt
        db.flush()

        # 3. Chức Năng (12 chức năng hệ thống)
        print("[seed] Nạp danh mục ChucNang...")
        chucnang_data = [
            ("QL_TuyenXe", "Quản lý danh mục tuyến đường và điểm dừng"),
            ("QL_ChuyenXe", "Quản lý lịch xuất bến và điều phối chuyến xe"),
            ("QL_PhuongTien", "Quản lý danh mục xe, bảo dưỡng và sơ đồ ghế"),
            ("BanVeTaiQuay", "Nghiệp vụ xuất vé trực tiếp tại quầy bến xe"),
            ("DatVeTrucTuyen", "Khách hàng tra cứu và đặt vé qua website"),
            ("TraCuuVe", "Tra cứu thông tin vé xe và mã QR soát vé"),
            ("HuyHoanVe", "Xử lý hủy vé, đổi vé và hoàn tiền cho khách"),
            ("QL_KhuyenMai", "Quản lý chương trình khuyến mãi và mã voucher"),
            ("BaoCaoDoanhThu", "Báo cáo doanh thu và tỷ lệ lấp đầy ghế"),
            ("QL_NguoiDung", "Quản lý tài khoản, nhân viên và phân quyền"),
            ("SoatVe", "Kiểm soát vé hành khách khi lên xe"),
            ("CauHinhHeThong", "Cài đặt tham số vận hành hệ thống"),
        ]
        chucnang_map: dict[str, ChucNang] = {}
        for ten, mota in chucnang_data:
            cn = ChucNang(TenChucNang=ten, MoTa=mota)
            db.add(cn)
            chucnang_map[ten] = cn
        db.flush()

        # 4. Phân Quyền
        print("[seed] Nạp ma trận PhanQuyen...")
        for ten_cn, cn in chucnang_map.items():
            # QuanTri có toàn quyền
            db.add(
                PhanQuyen(
                    MaVaiTro=vaitro_map["QuanTri"].MaVaiTro,
                    MaCN=cn.MaCN,
                    CoQuyenXem=True,
                    CoQuyenThem=True,
                    CoQuyenSua=True,
                    CoQuyenXoa=True,
                )
            )

            # NhanVienBanVe
            co_xem_nv = ten_cn in [
                "QL_TuyenXe",
                "QL_ChuyenXe",
                "QL_PhuongTien",
                "BanVeTaiQuay",
                "TraCuuVe",
                "HuyHoanVe",
                "SoatVe",
            ]
            co_them_nv = ten_cn in ["BanVeTaiQuay", "TraCuuVe", "HuyHoanVe", "SoatVe"]
            db.add(
                PhanQuyen(
                    MaVaiTro=vaitro_map["NhanVienBanVe"].MaVaiTro,
                    MaCN=cn.MaCN,
                    CoQuyenXem=co_xem_nv,
                    CoQuyenThem=co_them_nv,
                    CoQuyenSua=co_them_nv,
                    CoQuyenXoa=False,
                )
            )

            # KhachHang
            co_xem_kh = ten_cn in ["QL_TuyenXe", "QL_ChuyenXe", "DatVeTrucTuyen", "TraCuuVe", "QL_KhuyenMai"]
            db.add(
                PhanQuyen(
                    MaVaiTro=vaitro_map["KhachHang"].MaVaiTro,
                    MaCN=cn.MaCN,
                    CoQuyenXem=co_xem_kh,
                    CoQuyenThem=(ten_cn == "DatVeTrucTuyen"),
                    CoQuyenSua=(ten_cn == "HuyHoanVe"),
                    CoQuyenXoa=False,
                )
            )
        db.flush()

        # 5. Tài Khoản & Nhân Viên / Khách Hàng
        print("[seed] Nạp TaiKhoan, NhanVien, KhachHang...")
        matkhau_mac_dinh = hash_pw("MatKhau@123")

        # Quản trị viên
        tk_admin = TaiKhoan(
            MaVaiTro=vaitro_map["QuanTri"].MaVaiTro,
            TenDangNhap="admin",
            MatKhau=matkhau_mac_dinh,
            TrangThai="HoatDong",
        )
        db.add(tk_admin)
        db.flush()

        nv_admin = NhanVien(
            MaTK=tk_admin.MaTK,
            HoTen="Trần Hữu Nghĩa",
            SDT="0903123456",
            NgaySinh=date(1988, 5, 12),
            ChucVu="Giám đốc điều hành",
            NgayVaoLam=date(2018, 1, 15),
        )
        db.add(nv_admin)

        # Nhân viên bán vé các bến trọng điểm
        danh_sach_nv = [
            ("nv_miendong", "Nguyễn Thị Mai Anh", "0912345678", date(1995, 8, 20), "Nhân viên Bến xe Miền Đông mới"),
            ("nv_mientay", "Lê Văn Phúc", "0987654321", date(1993, 3, 14), "Nhân viên Bến xe Miền Tây"),
            ("nv_mydinh", "Phạm Hồng Sơn", "0934567890", date(1996, 11, 28), "Nhân viên Bến xe Mỹ Đình Hà Nội"),
            ("nv_giapbat", "Đặng Thùy Dung", "0923456789", date(1998, 2, 17), "Nhân viên Bến xe Giáp Bát"),
            ("nv_danang", "Hoàng Lan Hương", "0978901234", date(1997, 6, 5), "Nhân viên Bến xe Trung tâm Đà Nẵng"),
            ("nv_dalat", "Ngô Đức Trọng", "0967890123", date(1994, 9, 30), "Nhân viên Bến xe Liên tỉnh Đà Lạt"),
            ("nv_cantho", "Trần Kim Oanh", "0945678901", date(1996, 12, 15), "Nhân viên Bến xe Trung tâm Cần Thơ"),
            ("nv_nhatrang", "Vũ Minh Tâm", "0932109876", date(1995, 4, 22), "Nhân viên Bến xe Phía Nam Nha Trang"),
        ]
        nv_map: dict[str, NhanVien] = {}
        for username, hoten, sdt, ngaysinh, chucvu in danh_sach_nv:
            tk = TaiKhoan(
                MaVaiTro=vaitro_map["NhanVienBanVe"].MaVaiTro,
                TenDangNhap=username,
                MatKhau=matkhau_mac_dinh,
                TrangThai="HoatDong",
            )
            db.add(tk)
            db.flush()
            nv = NhanVien(
                MaTK=tk.MaTK,
                HoTen=hoten,
                SDT=sdt,
                NgaySinh=ngaysinh,
                ChucVu=chucvu,
                NgayVaoLam=date(2021, 6, 1),
            )
            db.add(nv)
            nv_map[username] = nv

        # Tài xế
        danh_sach_tx = [
            ("tx_nguyenvanhai", "Nguyễn Văn Hải", "0909112233", date(1982, 4, 18), "Tài xế chính (Dấu E)"),
            ("tx_tranquoctuan", "Trần Quốc Tuấn", "0918223344", date(1985, 9, 25), "Tài xế chính (Dấu E)"),
            ("tx_vothanhliem", "Võ Thanh Liêm", "0933445566", date(1989, 12, 10), "Tài xế chính (Dấu E)"),
            ("tx_phamvandong", "Phạm Văn Đồng", "0912113355", date(1984, 7, 19), "Tài xế chính (Dấu E)"),
            ("tx_buithehung", "Bùi Thế Hùng", "0977224466", date(1987, 10, 8), "Tài xế phụ"),
        ]
        for username, hoten, sdt, ngaysinh, chucvu in danh_sach_tx:
            tk = TaiKhoan(
                MaVaiTro=vaitro_map["TaiXe"].MaVaiTro,
                TenDangNhap=username,
                MatKhau=matkhau_mac_dinh,
                TrangThai="HoatDong",
            )
            db.add(tk)
            db.flush()
            nv = NhanVien(
                MaTK=tk.MaTK,
                HoTen=hoten,
                SDT=sdt,
                NgaySinh=ngaysinh,
                ChucVu=chucvu,
                NgayVaoLam=date(2020, 3, 10),
            )
            db.add(nv)

        # Khách hàng cá nhân trực tuyến
        danh_sach_kh = [
            ("kh_dangvulong", "Đặng Vũ Long", "0908889999", "Quận 1, TP. Hồ Chí Minh"),
            ("kh_nguyenminhtri", "Nguyễn Minh Trí", "0911223344", "Cầu Giấy, Hà Nội"),
            ("kh_lethithuy", "Lê Thị Thúy", "0988776655", "Hải Châu, TP. Đà Nẵng"),
            ("kh_tranthuha", "Trần Thu Hà", "0944556677", "Phường 1, TP. Đà Lạt"),
            ("kh_buiducanh", "Bùi Đức Anh", "0966332211", "Ninh Kiều, TP. Cần Thơ"),
            ("kh_nguyenhoanganh", "Nguyễn Hoàng Anh", "0933557799", "Hồng Bàng, Hải Phòng"),
            ("kh_duongquocbao", "Dương Quốc Bảo", "0918991122", "Hạ Long, Quảng Ninh"),
        ]
        kh_map: dict[str, KhachHang] = {}
        for username, hoten, sdt, diachi in danh_sach_kh:
            tk = TaiKhoan(
                MaVaiTro=vaitro_map["KhachHang"].MaVaiTro,
                TenDangNhap=username,
                MatKhau=matkhau_mac_dinh,
                TrangThai="HoatDong",
            )
            db.add(tk)
            db.flush()
            kh = KhachHang(
                MaTK=tk.MaTK,
                HoTen=hoten,
                SDT=sdt,
                DiaChi=diachi,
            )
            db.add(kh)
            kh_map[username] = kh

        # Khách hàng vãng lai mua tại quầy không có tài khoản
        kh_vang_lai_1 = KhachHang(
            MaTK=None,
            HoTen="Võ Hoàng Nam (Khách vãng lai)",
            SDT="0915667788",
            DiaChi="TP. Vũng Tàu",
        )
        kh_vang_lai_2 = KhachHang(
            MaTK=None,
            HoTen="Đỗ Mỹ Linh (Khách vãng lai)",
            SDT="0982334455",
            DiaChi="TP. Nha Trang",
        )
        kh_vang_lai_3 = KhachHang(
            MaTK=None,
            HoTen="Nguyễn Văn Bình (Khách vãng lai)",
            SDT="0971224466",
            DiaChi="TP. Sa Pa",
        )
        db.add_all([kh_vang_lai_1, kh_vang_lai_2, kh_vang_lai_3])
        db.flush()

        # 6. Loại Xe & 30 Xe Thực Tế Khắp Các Tỉnh Thành & Hơn 900 Ghế
        print("[seed] Nạp LoaiXe, 30 Xe thực tế và Ghế...")
        loai_xe_data = [
            ("Limousine 34 Phòng", 34, "Xe giường phòng Limousine VIP, rèm che riêng tư, cổng sạc, massage"),
            ("Giường Nằm 40 Chỗ", 40, "Xe giường nằm 2 tầng tiêu chuẩn FUTA, wifi, nước suối, khăn lạnh"),
            ("Cung Điện 24 Phòng", 24, "Xe cabin phòng hoàng gia chuyên tuyến du lịch Sa Pa, Đà Lạt"),
            ("Ghế Ngồi Cao Cấp 28 Chỗ", 28, "Xe ghế ngồi ngả lưng bọc da cao cấp chuyên tuyến cự ly ngắn"),
        ]
        loai_xe_map: dict[str, LoaiXe] = {}
        for ten, soghe, mota in loai_xe_data:
            lx = LoaiXe(TenLoaiXe=ten, SoGhe=soghe, MoTa=mota)
            db.add(lx)
            loai_xe_map[ten] = lx
        db.flush()

        # 30 Xe thực tế với biển số theo vùng miền
        xe_data = [
            # Đội xe TP.HCM (51B)
            ("51B-289.45", "Limousine 34 Phòng", "Thaco Mobihome", 2023),
            ("51B-305.18", "Giường Nằm 40 Chỗ", "Hyundai Universe", 2022),
            ("51B-412.79", "Cung Điện 24 Phòng", "Tracomeco", 2024),
            ("51B-520.11", "Limousine 34 Phòng", "Thaco Mobihome", 2023),
            ("51B-631.84", "Giường Nằm 40 Chỗ", "Hyundai Universe", 2022),
            ("51B-745.92", "Ghế Ngồi Cao Cấp 28 Chỗ", "Hyundai Solati", 2023),
            # Đội xe Lâm Đồng - Đà Lạt (49B)
            ("49B-018.66", "Limousine 34 Phòng", "Thaco Mobihome", 2023),
            ("49B-025.33", "Cung Điện 24 Phòng", "Tracomeco", 2024),
            ("49B-039.78", "Giường Nằm 40 Chỗ", "Hyundai Universe", 2022),
            # Đội xe Hà Nội (29B)
            ("29B-188.92", "Cung Điện 24 Phòng", "Hyundai Universe", 2023),
            ("29B-605.34", "Giường Nằm 40 Chỗ", "Thaco Mobihome", 2022),
            ("29B-712.45", "Limousine 34 Phòng", "Tracomeco", 2024),
            ("29B-823.19", "Ghế Ngồi Cao Cấp 28 Chỗ", "Hyundai Solati", 2023),
            ("29B-934.56", "Cung Điện 24 Phòng", "Thaco Mobihome", 2023),
            # Đội xe Lào Cai - Sa Pa (24B)
            ("24B-012.88", "Cung Điện 24 Phòng", "Tracomeco", 2024),
            ("24B-023.45", "Giường Nằm 40 Chỗ", "Hyundai Universe", 2023),
            # Đội xe Đà Nẵng & Miền Trung (43B, 75B, 79B, 77B)
            ("43B-047.82", "Limousine 34 Phòng", "Tracomeco", 2023),
            ("43B-058.91", "Giường Nằm 40 Chỗ", "Thaco Mobihome", 2022),
            ("75B-019.23", "Limousine 34 Phòng", "Thaco Mobihome", 2023),
            ("79B-031.48", "Limousine 34 Phòng", "Hyundai Universe", 2023),
            ("79B-042.19", "Giường Nằm 40 Chỗ", "Thaco Mobihome", 2022),
            ("77B-018.67", "Giường Nằm 40 Chỗ", "Hyundai Universe", 2022),
            # Đội xe Tây Nguyên (47B Đắk Lắk, 81B Gia Lai)
            ("47B-028.90", "Limousine 34 Phòng", "Thaco Mobihome", 2023),
            ("81B-019.45", "Giường Nằm 40 Chỗ", "Hyundai Universe", 2022),
            # Đội xe Đông Nam Bộ (72B Vũng Tàu, 70B Tây Ninh)
            ("72B-029.11", "Ghế Ngồi Cao Cấp 28 Chỗ", "Hyundai Solati", 2023),
            ("72B-038.54", "Ghế Ngồi Cao Cấp 28 Chỗ", "Hyundai Solati", 2023),
            ("70B-015.67", "Ghế Ngồi Cao Cấp 28 Chỗ", "Ford Transit", 2023),
            # Đội xe Miền Tây (65B Cần Thơ, 68B Kiên Giang, 69B Cà Mau)
            ("65B-019.55", "Giường Nằm 40 Chỗ", "Thaco Mobihome", 2022),
            ("68B-022.34", "Giường Nằm 40 Chỗ", "Thaco Mobihome", 2023),
            ("69B-017.89", "Limousine 34 Phòng", "Tracomeco", 2024),
        ]
        xe_map: dict[str, Xe] = {}
        for bienso, ten_loai, hangxe, namsx in xe_data:
            x = Xe(
                MaLoaiXe=loai_xe_map[ten_loai].MaLoaiXe,
                BienSo=bienso,
                HangXe=hangxe,
                NamSanXuat=namsx,
                TrangThai="HoatDong",
            )
            db.add(x)
            xe_map[bienso] = x
        db.flush()

        # Tự động sinh ghế cho toàn bộ 30 xe
        for bienso, x in xe_map.items():
            loai_ten = next(k for k, v in loai_xe_map.items() if v.MaLoaiXe == x.MaLoaiXe)
            if "34" in loai_ten:
                for i in range(1, 18):
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"A{i:02d}", Tang=1, TrangThai="Trong"))
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"B{i:02d}", Tang=2, TrangThai="Trong"))
            elif "40" in loai_ten:
                for i in range(1, 21):
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"A{i:02d}", Tang=1, TrangThai="Trong"))
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"B{i:02d}", Tang=2, TrangThai="Trong"))
            elif "24" in loai_ten:
                for i in range(1, 13):
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"A{i:02d}", Tang=1, TrangThai="Trong"))
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"B{i:02d}", Tang=2, TrangThai="Trong"))
            elif "28" in loai_ten:
                for i in range(1, 29):
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"{i:02d}", Tang=1, TrangThai="Trong"))
        db.flush()

        # 7. Danh Mục 90 Tuyến Xe Khách Toàn Quốc (Phủ kín mọi miền đất nước)
        print("[seed] Nạp danh mục 90 TuyenXe phủ kín toàn quốc...")
        tuyen_raw_data = [
            # --- Nhóm 1: TP.HCM <-> Tây Nguyên ---
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Liên tỉnh Đà Lạt (Lâm Đồng)",
                305,
                390,
                "Lộ trình: BX Miền Đông Mới -> Cao tốc Long Thành -> QL20 -> Đèo Prenn -> Bến xe Đà Lạt",
            ),
            (
                "Bến xe Liên tỉnh Đà Lạt (Lâm Đồng)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                305,
                390,
                "Lộ trình: Bến xe Đà Lạt -> Đèo Prenn -> QL20 -> Cao tốc Long Thành -> BX Miền Đông Mới",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Bảo Lộc (Lâm Đồng)",
                190,
                240,
                "Lộ trình: BX Miền Đông Mới -> QL20 -> Đèo Chuối -> Đèo Bảo Lộc -> Bến xe Bảo Lộc",
            ),
            (
                "Bến xe Bảo Lộc (Lâm Đồng)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                190,
                240,
                "Lộ trình: Bến xe Bảo Lộc -> QL20 -> Cao tốc Long Thành -> BX Miền Đông Mới",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Buôn Ma Thuột (Đắk Lắk)",
                350,
                450,
                "Lộ trình: QL13 -> QL14 (Đường Hồ Chí Minh) qua Bình Phước, Đắk Nông -> Bến xe Buôn Ma Thuột",
            ),
            (
                "Bến xe Buôn Ma Thuột (Đắk Lắk)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                350,
                450,
                "Lộ trình: Bến xe Buôn Ma Thuột -> QL14 -> QL13 -> BX Miền Đông Mới",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Đức Long Gia Lai (Pleiku)",
                500,
                600,
                "Lộ trình: QL14 qua Đắk Nông, Buôn Ma Thuột -> TP. Pleiku Gia Lai",
            ),
            (
                "Bến xe Đức Long Gia Lai (Pleiku)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                500,
                600,
                "Lộ trình: Bến xe Đức Long Gia Lai -> QL14 -> BX Miền Đông Mới",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Kon Tum",
                550,
                660,
                "Lộ trình: Trục QL14 qua Buôn Ma Thuột, Pleiku -> Bến xe TP. Kon Tum",
            ),
            (
                "Bến xe Kon Tum",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                550,
                660,
                "Lộ trình: Bến xe Kon Tum -> QL14 -> BX Miền Đông Mới",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Gia Nghĩa (Đắk Nông)",
                230,
                300,
                "Lộ trình: QL13 -> Ngã 4 Sở Sao -> QL14 -> Bến xe Gia Nghĩa",
            ),
            # --- Nhóm 2: TP.HCM <-> Nam Trung Bộ & Miền Trung ---
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Phía Nam Nha Trang (Khánh Hòa)",
                435,
                450,
                "Lộ trình: Cao tốc Long Thành - Dầu Giây - Phan Thiết - Vĩnh Hảo - Cam Lâm -> Bến xe Nha Trang",
            ),
            (
                "Bến xe Phía Nam Nha Trang (Khánh Hòa)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                435,
                450,
                "Lộ trình: Bến xe Nha Trang -> Cao tốc Cam Lâm - Vĩnh Hảo - Phan Thiết -> BX Miền Đông Mới",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Phan Thiết (Bình Thuận)",
                200,
                210,
                "Lộ trình: Cao tốc TP.HCM - Long Thành - Dầu Giây - Phan Thiết -> Bến xe Phan Thiết",
            ),
            (
                "Bến xe Phan Thiết (Bình Thuận)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                200,
                210,
                "Lộ trình: Bến xe Phan Thiết -> Cao tốc Phan Thiết - Dầu Giây -> BX Miền Đông Mới",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Mũi Né (Bình Thuận)",
                220,
                240,
                "Lộ trình: Cao tốc Phan Thiết -> Đường ven biển Huỳnh Thúc Kháng -> Bến xe Mũi Né",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Phan Rang (Ninh Thuận)",
                330,
                360,
                "Lộ trình: Cao tốc Phan Thiết - Vĩnh Hảo -> QL1A -> Bến xe Phan Rang - Tháp Chàm",
            ),
            (
                "Bến xe Phan Rang (Ninh Thuận)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                330,
                360,
                "Lộ trình: Bến xe Phan Rang -> QL1A -> Cao tốc Vĩnh Hảo - Phan Thiết -> BX Miền Đông Mới",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Nam Tuy Hòa (Phú Yên)",
                540,
                570,
                "Lộ trình: Cao tốc Cam Lâm - Vĩnh Hảo -> Hầm Đèo Cả -> Bến xe Nam Tuy Hòa",
            ),
            (
                "Bến xe Nam Tuy Hòa (Phú Yên)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                540,
                570,
                "Lộ trình: Bến xe Tuy Hòa -> Hầm Đèo Cả -> Cao tốc Cam Lâm - Phan Thiết -> BX Miền Đông",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Trung tâm Quy Nhơn (Bình Định)",
                650,
                690,
                "Lộ trình: Trục QL1A Nam Trung Bộ -> Đèo Cù Mông -> Bến xe Quy Nhơn",
            ),
            (
                "Bến xe Trung tâm Quy Nhơn (Bình Định)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                650,
                690,
                "Lộ trình: Bến xe Quy Nhơn -> QL1A -> Cao tốc Cam Lâm - Phan Thiết -> BX Miền Đông",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Quảng Ngãi",
                780,
                840,
                "Lộ trình: QL1A qua Phú Yên, Bình Định -> Bến xe Trung tâm Quảng Ngãi",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Trung tâm Đà Nẵng",
                950,
                1020,
                "Lộ trình: Trục QL1A xuyên Nam Trung Bộ qua Bình Thuận, Khánh Hòa, Bình Định, Đà Nẵng",
            ),
            (
                "Bến xe Trung tâm Đà Nẵng",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                950,
                1020,
                "Lộ trình: Bến xe Đà Nẵng -> QL1A xuôi Nam -> BX Miền Đông Mới",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Phía Nam Huế",
                1050,
                1140,
                "Lộ trình: QL1A qua Đà Nẵng, hầm Hải Vân -> Bến xe Phía Nam Huế",
            ),
            # --- Nhóm 3: TP.HCM <-> Đông Nam Bộ ---
            (
                "Bến xe Miền Đông cũ (TP. Hồ Chí Minh)",
                "Bến xe Vũng Tàu (Bà Rịa - Vũng Tàu)",
                105,
                135,
                "Lộ trình: Hàng Xanh -> Mai Chí Thọ -> Cao tốc Long Thành -> QL51 -> Bến xe Vũng Tàu",
            ),
            (
                "Bến xe Vũng Tàu (Bà Rịa - Vũng Tàu)",
                "Bến xe Miền Đông cũ (TP. Hồ Chí Minh)",
                105,
                135,
                "Lộ trình: Bến xe Vũng Tàu -> QL51 -> Cao tốc Long Thành -> Bến xe Miền Đông Cũ",
            ),
            (
                "Bến xe An Sương (TP. Hồ Chí Minh)",
                "Bến xe Tây Ninh",
                95,
                120,
                "Lộ trình: Bến xe An Sương -> QL22 (Xuyên Á) qua Củ Chi, Trảng Bàng -> Bến xe Tây Ninh",
            ),
            (
                "Bến xe Tây Ninh",
                "Bến xe An Sương (TP. Hồ Chí Minh)",
                95,
                120,
                "Lộ trình: Bến xe Tây Ninh -> QL22 -> Bến xe An Sương",
            ),
            (
                "Bến xe Miền Đông (TP. Hồ Chí Minh)",
                "Bến xe Đồng Xoài (Bình Phước)",
                110,
                150,
                "Lộ trình: QL13 -> ĐT741 qua Phú Giáo -> Bến xe TP. Đồng Xoài",
            ),
            # --- Nhóm 4: TP.HCM <-> Miền Tây (13 Tỉnh Đồng Bằng Sông Cửu Long) ---
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Trung tâm Cần Thơ",
                165,
                210,
                "Lộ trình: BX Miền Tây -> Cao tốc Trung Lương - Mỹ Thuận -> Cầu Cần Thơ -> Bến xe Cần Thơ",
            ),
            (
                "Bến xe Trung tâm Cần Thơ",
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                165,
                210,
                "Lộ trình: Bến xe Cần Thơ -> Cầu Cần Thơ -> Cao tốc Mỹ Thuận - Trung Lương -> BX Miền Tây",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Rạch Sỏi (Rạch Giá - Kiên Giang)",
                250,
                330,
                "Lộ trình: BX Miền Tây -> Cao tốc Trung Lương -> Tuyến Lộ Tẻ - Rạch Sỏi -> Bến xe Rạch Sỏi",
            ),
            (
                "Bến xe Rạch Sỏi (Rạch Giá - Kiên Giang)",
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                250,
                330,
                "Lộ trình: Bến xe Rạch Sỏi -> Tuyến Lộ Tẻ - Rạch Sỏi -> Cao tốc Trung Lương -> BX Miền Tây",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Hà Tiên (Kiên Giang)",
                320,
                420,
                "Lộ trình: BX Miền Tây -> QL80 qua Rạch Giá -> Bến xe Thị xã Hà Tiên",
            ),
            (
                "Bến xe Hà Tiên (Kiên Giang)",
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                320,
                420,
                "Lộ trình: Bến xe Hà Tiên -> QL80 -> Cao tốc Trung Lương -> BX Miền Tây",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Châu Đốc (An Giang)",
                250,
                330,
                "Lộ trình: BX Miền Tây -> Cao tốc Mỹ Thuận -> Cầu Vàm Cống -> QL91 -> Miếu Bà Chúa Xứ Châu Đốc",
            ),
            (
                "Bến xe Châu Đốc (An Giang)",
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                250,
                330,
                "Lộ trình: Bến xe Châu Đốc -> QL91 -> Cầu Vàm Cống -> Cao tốc Trung Lương -> BX Miền Tây",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Long Xuyên (An Giang)",
                190,
                240,
                "Lộ trình: BX Miền Tây -> Cầu Mỹ Thuận -> QL80 -> Cầu Vàm Cống -> Bến xe Long Xuyên",
            ),
            (
                "Bến xe Long Xuyên (An Giang)",
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                190,
                240,
                "Lộ trình: Bến xe Long Xuyên -> Cầu Vàm Cống -> Cao tốc Trung Lương -> BX Miền Tây",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Cà Mau",
                310,
                420,
                "Lộ trình: BX Miền Tây -> Cao tốc Trung Lương -> Cầu Cần Thơ -> Quản Lộ Phụng Hiệp -> BX Cà Mau",
            ),
            (
                "Bến xe Cà Mau",
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                310,
                420,
                "Lộ trình: Bến xe Cà Mau -> Tuyến Quản Lộ Phụng Hiệp -> Cao tốc Trung Lương -> BX Miền Tây",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Bạc Liêu",
                270,
                360,
                "Lộ trình: QL1A qua Hậu Giang, Sóc Trăng -> Bến xe Bạc Liêu",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Sóc Trăng",
                230,
                300,
                "Lộ trình: Cầu Cần Thơ -> QL1A qua Đại Ngãi -> Bến xe Sóc Trăng",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Vĩnh Long",
                135,
                180,
                "Lộ trình: Cao tốc Trung Lương - Mỹ Thuận -> Cầu Mỹ Thuận -> Bến xe Vĩnh Long",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Bến Tre",
                90,
                120,
                "Lộ trình: Cao tốc Trung Lương -> QL60 -> Cầu Rạch Miễu -> Bến xe Bến Tre",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Cao Lãnh (Đồng Tháp)",
                150,
                190,
                "Lộ trình: Cao tốc Trung Lương -> N2 qua Tháp Mười -> Cầu Cao Lãnh -> Bến xe Cao Lãnh",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Trà Vinh",
                130,
                180,
                "Lộ trình: Cầu Rạch Miễu -> QL60 -> Cầu Cổ Chiên -> Bến xe Trà Vinh",
            ),
            # --- Nhóm 5: Hà Nội <-> Tây Bắc, Đông Bắc & Đồng Bằng Bắc Bộ ---
            (
                "Bến xe Mỹ Đình (Hà Nội)",
                "Bến xe Sa Pa (Lào Cai)",
                320,
                330,
                "Lộ trình: BX Mỹ Đình -> Cầu Nhật Tân -> Cao tốc Nội Bài - Lào Cai -> Cầu Móng Sến -> Sa Pa",
            ),
            (
                "Bến xe Sa Pa (Lào Cai)",
                "Bến xe Mỹ Đình (Hà Nội)",
                320,
                330,
                "Lộ trình: Bến xe Sa Pa -> Cao tốc Lào Cai - Nội Bài -> Bến xe Mỹ Đình",
            ),
            (
                "Bến xe Mỹ Đình (Hà Nội)",
                "Bến xe Trung tâm Lào Cai",
                290,
                270,
                "Lộ trình: Cao tốc Nội Bài - Lào Cai toàn tuyến -> Bến xe Lào Cai (Cửa khẩu Quốc tế)",
            ),
            (
                "Bến xe Mỹ Đình (Hà Nội)",
                "Bến xe TP. Hà Giang",
                300,
                360,
                "Lộ trình: Cao tốc Nội Bài - Tuyên Quang -> QL2 qua Tuyên Quang -> Bến xe Hà Giang (Công viên nước)",
            ),
            (
                "Bến xe TP. Hà Giang",
                "Bến xe Mỹ Đình (Hà Nội)",
                300,
                360,
                "Lộ trình: Bến xe Hà Giang -> QL2 -> Cao tốc Tuyên Quang - Nội Bài -> BX Mỹ Đình",
            ),
            (
                "Bến xe Mỹ Đình (Hà Nội)",
                "Bến xe Mộc Châu (Sơn La)",
                200,
                240,
                "Lộ trình: Đại Lộ Thăng Long -> Cao tốc Hòa Lạc - Hòa Bình -> QL6 -> Đèo Thung Khe -> Mộc Châu",
            ),
            (
                "Bến xe Mỹ Đình (Hà Nội)",
                "Bến xe Điện Biên Phủ (Điện Biên)",
                450,
                600,
                "Lộ trình: QL6 qua Hòa Bình, Mộc Châu, Sơn La -> Đèo Pha Đin -> TP. Điện Biên Phủ",
            ),
            (
                "Bến xe Mỹ Đình (Hà Nội)",
                "Bến xe Liên tỉnh Cao Bằng",
                280,
                360,
                "Lộ trình: Cao tốc Hà Nội - Thái Nguyên - Chợ Mới -> QL3 qua Đèo Gió -> Bến xe Cao Bằng",
            ),
            (
                "Bến xe Giáp Bát (Hà Nội)",
                "Bến xe Bãi Cháy (Hạ Long - Quảng Ninh)",
                160,
                150,
                "Lộ trình: Cao tốc Hà Nội - Hải Phòng - Bạch Đằng - Hạ Long -> Bến xe Bãi Cháy",
            ),
            (
                "Bến xe Bãi Cháy (Hạ Long - Quảng Ninh)",
                "Bến xe Giáp Bát (Hà Nội)",
                160,
                150,
                "Lộ trình: Bến xe Bãi Cháy -> Cao tốc Hạ Long - Hải Phòng - Hà Nội -> BX Giáp Bát",
            ),
            (
                "Bến xe Mỹ Đình (Hà Nội)",
                "Bến xe Móng Cái (Quảng Ninh)",
                310,
                270,
                "Lộ trình: Cao tốc Hà Nội - Hải Phòng - Vân Đồn - Tiên Yên - Móng Cái (toàn tuyến cao tốc)",
            ),
            (
                "Bến xe Gia Lâm (Hà Nội)",
                "Bến xe Vĩnh Niệm (Hải Phòng)",
                110,
                90,
                "Lộ trình: Cao tốc 5B Hà Nội - Hải Phòng -> Bến xe Vĩnh Niệm",
            ),
            (
                "Bến xe Vĩnh Niệm (Hải Phòng)",
                "Bến xe Gia Lâm (Hà Nội)",
                110,
                90,
                "Lộ trình: Bến xe Vĩnh Niệm -> Cao tốc 5B -> Cầu Thanh Trì -> Bến xe Gia Lâm",
            ),
            (
                "Bến xe Giáp Bát (Hà Nội)",
                "Bến xe Phía Nam TP. Ninh Bình",
                95,
                90,
                "Lộ trình: Cao tốc Pháp Vân - Cầu Giẽ - Cao Bồ - Mai Sơn -> Bến xe Ninh Bình (Tràng An, Tam Cốc)",
            ),
            (
                "Bến xe Giáp Bát (Hà Nội)",
                "Bến xe Trung tâm Nam Định",
                90,
                90,
                "Lộ trình: Cao tốc Pháp Vân - Liêm Tuyền -> QL21B -> Bến xe Nam Định",
            ),
            (
                "Bến xe Giáp Bát (Hà Nội)",
                "Bến xe Thái Bình",
                110,
                120,
                "Lộ trình: Cao tốc Pháp Vân -> QL39A qua Hưng Yên, Cầu Triều Dương -> Bến xe Thái Bình",
            ),
            (
                "Bến xe Nước Ngầm (Hà Nội)",
                "Bến xe Phía Bắc Thanh Hóa",
                160,
                150,
                "Lộ trình: Cao tốc Bắc Nam (Mai Sơn - QL45) -> Bến xe Thanh Hóa",
            ),
            (
                "Bến xe Nước Ngầm (Hà Nội)",
                "Bến xe Bắc Vinh (Nghệ An)",
                300,
                270,
                "Lộ trình: Cao tốc Mai Sơn - QL45 - Diễn Châu - Bãi Vọt -> Bến xe Bắc Vinh",
            ),
            (
                "Bến xe Bắc Vinh (Nghệ An)",
                "Bến xe Nước Ngầm (Hà Nội)",
                300,
                270,
                "Lộ trình: Bến xe Bắc Vinh -> Cao tốc Diễn Châu - QL45 - Mai Sơn -> BX Nước Ngầm",
            ),
            (
                "Bến xe Nước Ngầm (Hà Nội)",
                "Bến xe Hà Tĩnh",
                350,
                330,
                "Lộ trình: Cao tốc Diễn Châu - Bãi Vọt -> QL1A -> Bến xe Hà Tĩnh",
            ),
            (
                "Bến xe Nước Ngầm (Hà Nội)",
                "Bến xe Đồng Hới (Quảng Bình)",
                500,
                480,
                "Lộ trình: QL1A qua Hà Tĩnh, Đèo Ngang -> Bến xe Đồng Hới (Phong Nha Kẻ Bàng)",
            ),
            # --- Nhóm 6: Tuyến Liên Tỉnh Miền Trung - Tây Nguyên - Miền Tây ---
            (
                "Bến xe Trung tâm Đà Nẵng",
                "Bến xe Phía Nam Huế",
                100,
                120,
                "Lộ trình: Bến xe Đà Nẵng -> Hầm đường bộ Hải Vân -> QL1A -> Bến xe Phía Nam Huế",
            ),
            (
                "Bến xe Phía Nam Huế",
                "Bến xe Trung tâm Đà Nẵng",
                100,
                120,
                "Lộ trình: Bến xe Huế -> Hầm Hải Vân -> Bến xe Trung tâm Đà Nẵng",
            ),
            (
                "Bến xe Trung tâm Đà Nẵng",
                "Bến xe Trung tâm Quy Nhơn",
                310,
                360,
                "Lộ trình: Cao tốc Đà Nẵng - Quảng Ngãi -> QL1A -> Bến xe Quy Nhơn",
            ),
            (
                "Bến xe Trung tâm Đà Nẵng",
                "Bến xe Phía Nam Nha Trang",
                530,
                600,
                "Lộ trình: QL1A dọc duyên hải Nam Trung Bộ -> Bến xe Phía Nam Nha Trang",
            ),
            (
                "Bến xe Trung tâm Đà Nẵng",
                "Bến xe Đức Long Gia Lai (Pleiku)",
                330,
                420,
                "Lộ trình: QL14B -> Đường Hồ Chí Minh qua Khâm Đức, Đắk Tô, Kon Tum -> Pleiku",
            ),
            (
                "Bến xe Trung tâm Đà Nẵng",
                "Bến xe Buôn Ma Thuột",
                530,
                660,
                "Lộ trình: QL1A qua Bình Định -> QL19 lên Gia Lai -> QL14 xuống Buôn Ma Thuột",
            ),
            (
                "Bến xe Liên tỉnh Đà Lạt",
                "Bến xe Phía Nam Nha Trang",
                135,
                180,
                "Lộ trình: QL27C (Tuyến đường hoa biển qua Đèo Khánh Lê) -> Bến xe Nha Trang",
            ),
            (
                "Bến xe Phía Nam Nha Trang",
                "Bến xe Liên tỉnh Đà Lạt",
                135,
                180,
                "Lộ trình: Bến xe Nha Trang -> QL27C qua Đèo Khánh Lê -> Bến xe Liên tỉnh Đà Lạt",
            ),
            (
                "Bến xe Liên tỉnh Đà Lạt",
                "Bến xe Buôn Ma Thuột",
                210,
                300,
                "Lộ trình: QL27 qua Đèo Chuối, Đam Rông, Hồ Lắk -> Bến xe Buôn Ma Thuột",
            ),
            (
                "Bến xe Liên tỉnh Đà Lạt",
                "Bến xe Trung tâm Cần Thơ",
                460,
                540,
                "Lộ trình: Đèo Prenn -> QL20 -> Cao tốc Long Thành -> Cao tốc Trung Lương -> BX Cần Thơ",
            ),
            (
                "Bến xe Liên tỉnh Đà Lạt",
                "Bến xe Vũng Tàu",
                300,
                390,
                "Lộ trình: QL20 -> QL56 qua Long Khánh, Bà Rịa -> Bến xe Vũng Tàu",
            ),
            (
                "Bến xe Liên tỉnh Đà Lạt",
                "Bến xe Phan Thiết",
                160,
                240,
                "Lộ trình: QL28B qua Đèo Đại Ninh -> Lương Sơn -> Bến xe Phan Thiết",
            ),
            (
                "Bến xe Trung tâm Cần Thơ",
                "Bến xe Rạch Sỏi (Rạch Giá)",
                110,
                150,
                "Lộ trình: QL91B -> Tuyến Lộ Tẻ - Rạch Sỏi -> Bến xe Rạch Sỏi",
            ),
            (
                "Bến xe Trung tâm Cần Thơ",
                "Bến xe Cà Mau",
                150,
                210,
                "Lộ trình: Tuyến Quản Lộ - Phụng Hiệp qua Ngã Bảy, Sóc Trăng -> Bến xe Cà Mau",
            ),
            (
                "Bến xe Trung tâm Cần Thơ",
                "Bến xe Châu Đốc (An Giang)",
                125,
                180,
                "Lộ trình: QL91 dọc sông Hậu qua Ô Môn, Thốt Nốt, Long Xuyên -> Bến xe Châu Đốc",
            ),
            (
                "Bến xe Trung tâm Cần Thơ",
                "Bến xe Vũng Tàu",
                260,
                330,
                "Lộ trình: Cao tốc Trung Lương -> Cao tốc Long Thành -> QL51 -> Bến xe Vũng Tàu",
            ),
            # --- Nhóm 7: Trục Xuyên Việt Bắc - Trung - Nam ---
            (
                "Bến xe Nước Ngầm (Hà Nội)",
                "Bến xe Trung tâm Đà Nẵng",
                760,
                840,
                "Lộ trình: QL1A / Cao tốc Bắc Nam qua Ninh Bình, Thanh Hóa, Vinh, Hà Tĩnh, Quảng Bình, Huế -> Đà Nẵng",
            ),
            (
                "Bến xe Trung tâm Đà Nẵng",
                "Bến xe Nước Ngầm (Hà Nội)",
                760,
                840,
                "Lộ trình: Bến xe Đà Nẵng -> Hầm Hải Vân -> QL1A ra Hà Nội -> BX Nước Ngầm",
            ),
            (
                "Bến xe Nước Ngầm (Hà Nội)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                1720,
                1800,
                "Lộ trình: Tuyến xe khách Bắc Nam xuyên Việt qua 18 tỉnh thành dọc duyên hải",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Nước Ngầm (Hà Nội)",
                1720,
                1800,
                "Lộ trình: Tuyến xe khách Nam Bắc xuyên Việt từ TP.HCM về Thủ đô Hà Nội",
            ),
        ]

        tuyen_list: list[TuyenXe] = []
        for di, den, km, phut, mota in tuyen_raw_data:
            tx = TuyenXe(
                DiemDi=di,
                DiemDen=den,
                KhoangCach=Decimal(str(km)),
                ThoiGianDuKien=phut,
                MoTa=mota,
                TrangThai="HoatDong",
            )
            db.add(tx)
            tuyen_list.append(tx)
        db.flush()

        # 8. Sinh Hơn 160+ Chuyến Xe Khởi Hành Từ Hôm Nay Trở Đi
        print("[seed] Nạp danh mục ChuyenXe phong phú...")
        hom_nay = date.today()
        chuyen_xe_list: list[ChuyenXe] = []

        # Bảng quy đổi giá vé & phân bổ xe theo tuyến
        # Dùng xe_list từ 30 xe đã tạo
        all_xe = list(xe_map.values())
        so_xe = len(all_xe)

        # Lập lịch chạy cho 90 tuyến qua các ngày (từ hôm nay đến 5 ngày tới)
        for idx, tuyen in enumerate(tuyen_list):
            km = float(tuyen.KhoangCach or 200)

            # Tính giá vé sát thực tế thị trường theo cự ly
            if km <= 120:
                gia_ve = Decimal("150000.00")
            elif km <= 220:
                gia_ve = Decimal("190000.00")
            elif km <= 320:
                gia_ve = Decimal("320000.00")
            elif km <= 450:
                gia_ve = Decimal("360000.00")
            elif km <= 600:
                gia_ve = Decimal("440000.00")
            elif km <= 800:
                gia_ve = Decimal("550000.00")
            elif km <= 1100:
                gia_ve = Decimal("680000.00")
            else:
                gia_ve = Decimal("950000.00")  # Xuyên Việt

            # Chọn xe phù hợp luân phiên
            xe_phu_hop = all_xe[idx % so_xe]

            # Đối với các tuyến trọng điểm (Đà Lạt, Nha Trang, Vũng Tàu, Sa Pa, Cần Thơ), chạy nhiều chuyến/ngày
            la_tuyen_hot = any(
                hot in tuyen.DiemDen or hot in tuyen.DiemDi for hot in ["Đà Lạt", "Sa Pa", "Vũng Tàu", "Nha Trang", "Cần Thơ"]
            )

            if la_tuyen_hot:
                gio_chay = [time(7, 0), time(10, 30), time(14, 0), time(22, 30)]
                ngay_chay_range = 4  # 4 ngày
            else:
                gio_chay = [time(8, 30), time(21, 0)]
                ngay_chay_range = 3  # 3 ngày

            for day_offset in range(ngay_chay_range):
                ngay_khoi_hanh = hom_nay + timedelta(days=day_offset)
                for g in gio_chay:
                    chuyen = ChuyenXe(
                        MaTuyen=tuyen.MaTuyen,
                        MaXe=xe_phu_hop.MaXe,
                        NgayKhoiHanh=ngay_khoi_hanh,
                        GioKhoiHanh=g,
                        GiaVe=gia_ve,
                        TrangThai="SapKhoiHanh",
                        GhiChu=f"Xe {xe_phu_hop.BienSo} ({xe_phu_hop.HangXe}), xuất bến đúng giờ, đón trả tận nơi",
                    )
                    chuyen_xe_list.append(chuyen)

        db.add_all(chuyen_xe_list)
        db.flush()

        # 9. Khuyến Mãi Thực Tế
        print("[seed] Nạp mã KhuyenMai...")
        km_data = [
            (
                "Chào Bạn Mới - Giảm 20%",
                "CHAOBANMOI",
                "PhanTram",
                Decimal("20.00"),
                Decimal("50000.00"),
                Decimal("200000.00"),
                datetime(2026, 1, 1),
                datetime(2027, 12, 31),
                "Giảm 20% tối đa 50.000đ cho đơn đặt vé đầu tiên từ 200.000đ",
            ),
            (
                "Ưu Đãi Tuyến FUTA - Giảm 50K",
                "FUTA50K",
                "TienMat",
                Decimal("50000.00"),
                None,
                Decimal("300000.00"),
                datetime(2026, 1, 1),
                datetime(2027, 12, 31),
                "Giảm ngay 50.000đ tiền mặt cho đơn hàng từ 300.000đ",
            ),
            (
                "Vé Xe Tết 2027 - Tri Ân",
                "VEXETET2027",
                "PhanTram",
                Decimal("15.00"),
                Decimal("100000.00"),
                Decimal("500000.00"),
                datetime(2026, 10, 1),
                datetime(2027, 3, 1),
                "Giảm 15% tối đa 100.000đ cho hành khách mua vé Tết từ 500.000đ",
            ),
            (
                "Tri Ân Khách Hàng Thân Thiết",
                "TRIANKHACHHANG",
                "TienMat",
                Decimal("30000.00"),
                None,
                Decimal("150000.00"),
                datetime(2026, 1, 1),
                datetime(2027, 12, 31),
                "Giảm ngay 30.000đ cho khách hàng thân thiết",
            ),
            (
                "Trải Nghiệm Cung Điện Sa Pa / Đà Lạt",
                "CUNGDIEN24P",
                "PhanTram",
                Decimal("10.00"),
                Decimal("60000.00"),
                Decimal("400000.00"),
                datetime(2026, 1, 1),
                datetime(2027, 12, 31),
                "Giảm 10% tối đa 60.000đ cho dòng xe Cung điện VIP",
            ),
            (
                "Du Lịch Vũng Tàu Cuối Tuần",
                "VUNGTAUHE",
                "TienMat",
                Decimal("20000.00"),
                None,
                Decimal("150000.00"),
                datetime(2026, 1, 1),
                datetime(2027, 12, 31),
                "Giảm 20.000đ cho tuyến xe Sài Gòn đi Vũng Tàu",
            ),
            (
                "Khám Phá Miền Tây Sông Nước",
                "MIENTAYVIP",
                "PhanTram",
                Decimal("12.00"),
                Decimal("40000.00"),
                Decimal("250000.00"),
                datetime(2026, 1, 1),
                datetime(2027, 12, 31),
                "Giảm 12% cho các tuyến đi Cần Thơ, Rạch Giá, Cà Mau",
            ),
        ]
        km_map: dict[str, KhuyenMai] = {}
        for ten, code, loai, giatri, toida, toithieu, start, end, mota in km_data:
            km = KhuyenMai(
                TenKM=ten,
                MaCode=code,
                LoaiGiam=loai,
                GiaTriGiam=giatri,
                GiaTriGiamToiDa=toida,
                DonToiThieu=toithieu,
                NgayBatDau=start,
                NgayKetThuc=end,
                TrangThai="HoatDong",
                MoTa=mota,
            )
            db.add(km)
            km_map[code] = km
        db.flush()

        # 10. Đặt Vé & Chi Tiết Đặt Vé & Thanh Toán & Lịch Sử Mẫu
        print("[seed] Nạp DatVe, CT_DatVe, ThanhToan, LichSuVe mẫu...")
        # Lấy chuyến xe đầu tiên (Sài Gòn - Đà Lạt)
        cx_sg_dl = chuyen_xe_list[0]
        ghe_sg_dl = db.query(Ghe).filter(Ghe.MaXe == cx_sg_dl.MaXe).order_by(Ghe.SoGhe).all()

        # Đơn 1: Khách hàng Đặng Vũ Long đặt 2 ghế A01, A02 qua website, thanh toán VNPay
        don_1 = DatVe(
            MaKH=kh_map["kh_dangvulong"].MaKH,
            MaNV=None,
            MaKM=km_map["CHAOBANMOI"].MaKM,
            NgayDat=datetime.now() - timedelta(hours=3),
            TongTien=Decimal("590000.00"),
            TienGiam=Decimal("50000.00"),
            TrangThai="DaThanhToan",
            GhiChu="Khách đặt trực tuyến, thanh toán VNPay QR thành công",
        )
        db.add(don_1)
        db.flush()

        ct_1_1 = CT_DatVe(
            MaDatVe=don_1.MaDatVe,
            MaGhe=ghe_sg_dl[0].MaGhe,  # A01
            MaChuyen=cx_sg_dl.MaChuyen,
            DonGia=Decimal("320000.00"),
        )
        ct_1_2 = CT_DatVe(
            MaDatVe=don_1.MaDatVe,
            MaGhe=ghe_sg_dl[1].MaGhe,  # A02
            MaChuyen=cx_sg_dl.MaChuyen,
            DonGia=Decimal("320000.00"),
        )
        db.add_all([ct_1_1, ct_1_2])

        tt_1 = ThanhToan(
            MaDatVe=don_1.MaDatVe,
            PhuongThuc="VNPay",
            SoTien=Decimal("590000.00"),
            MaGiaoDich="VNP148291048821",
            ThoiGianThanhToan=datetime.now() - timedelta(hours=3) + timedelta(minutes=2),
            TrangThai="ThanhCong",
            GhiChu="Thanh toán thành công qua cổng VNPay-QR",
        )
        db.add(tt_1)

        ls_1_1 = LichSuVe(
            MaDatVe=don_1.MaDatVe,
            MaTK=kh_map["kh_dangvulong"].MaTK,
            HanhDong="TaoDon",
            ThoiGian=datetime.now() - timedelta(hours=3),
            GhiChu="Khách hàng tạo đơn trực tuyến đặt 2 ghế A01, A02",
        )
        ls_1_2 = LichSuVe(
            MaDatVe=don_1.MaDatVe,
            MaTK=kh_map["kh_dangvulong"].MaTK,
            HanhDong="ThanhToan",
            ThoiGian=datetime.now() - timedelta(hours=3) + timedelta(minutes=2),
            GhiChu="Thanh toán thành công số tiền 590.000đ",
        )
        db.add_all([ls_1_1, ls_1_2])

        # Đơn 2: Bán tại quầy Bến xe Miền Đông cho khách vãng lai (nhân viên Mai Anh xuất vé, ghế A05)
        don_2 = DatVe(
            MaKH=kh_vang_lai_1.MaKH,
            MaNV=nv_map["nv_miendong"].MaNV,
            MaKM=None,
            NgayDat=datetime.now() - timedelta(hours=1),
            TongTien=Decimal("320000.00"),
            TienGiam=Decimal("0.00"),
            TrangThai="DaThanhToan",
            GhiChu="Khách mua trực tiếp tại Quầy số 3 Bến xe Miền Đông Mới",
        )
        db.add(don_2)
        db.flush()

        ct_2 = CT_DatVe(
            MaDatVe=don_2.MaDatVe,
            MaGhe=ghe_sg_dl[4].MaGhe,  # A05
            MaChuyen=cx_sg_dl.MaChuyen,
            DonGia=Decimal("320000.00"),
        )
        db.add(ct_2)

        tt_2 = ThanhToan(
            MaDatVe=don_2.MaDatVe,
            PhuongThuc="TienMatTaiQuay",
            SoTien=Decimal("320000.00"),
            MaGiaoDich="TM-MD-20261118-001",
            ThoiGianThanhToan=datetime.now() - timedelta(hours=1),
            TrangThai="ThanhCong",
            GhiChu="Đã thu tiền mặt 320.000đ tại quầy vé",
        )
        db.add(tt_2)

        ls_2 = LichSuVe(
            MaDatVe=don_2.MaDatVe,
            MaTK=nv_map["nv_miendong"].MaTK,
            HanhDong="TaoDon",
            ThoiGian=datetime.now() - timedelta(hours=1),
            GhiChu="Nhân viên Mai Anh xuất vé tại quầy cho khách vãng lai",
        )
        db.add(ls_2)

        # Đơn 3: Đơn đang chờ thanh toán (ghế A08, giữ chỗ 5 phút)
        don_3 = DatVe(
            MaKH=kh_map["kh_lethithuy"].MaKH,
            MaNV=None,
            MaKM=None,
            NgayDat=datetime.now() - timedelta(minutes=2),
            TongTien=Decimal("320000.00"),
            TienGiam=Decimal("0.00"),
            TrangThai="ChoThanhToan",
            GhiChu="Khách chọn ghế A08, hệ thống đang giữ chỗ 5 phút",
        )
        db.add(don_3)
        db.flush()

        ct_3 = CT_DatVe(
            MaDatVe=don_3.MaDatVe,
            MaGhe=ghe_sg_dl[7].MaGhe,  # A08
            MaChuyen=cx_sg_dl.MaChuyen,
            DonGia=Decimal("320000.00"),
        )
        db.add(ct_3)

        ls_3 = LichSuVe(
            MaDatVe=don_3.MaDatVe,
            MaTK=kh_map["kh_lethithuy"].MaTK,
            HanhDong="TaoDon",
            ThoiGian=datetime.now() - timedelta(minutes=2),
            GhiChu="Khách hàng chọn ghế A08, đang chờ thanh toán",
        )
        db.add(ls_3)

        db.commit()
        print("[seed] Nạp mạng lưới dữ liệu xe khách toàn quốc THÀNH CÔNG RỰC RỠ!")

        # In tổng kết số lượng bản ghi
        print("\n=== TỔNG KẾT DỮ LIỆU ĐÃ NẠP VÀO DATABASE ===")
        for tbl, model in [
            ("VaiTro", VaiTro),
            ("ChucNang", ChucNang),
            ("PhanQuyen", PhanQuyen),
            ("TaiKhoan", TaiKhoan),
            ("NhanVien", NhanVien),
            ("KhachHang", KhachHang),
            ("LoaiXe", LoaiXe),
            ("Xe", Xe),
            ("Ghe", Ghe),
            ("TuyenXe", TuyenXe),
            ("ChuyenXe", ChuyenXe),
            ("KhuyenMai", KhuyenMai),
            ("DatVe", DatVe),
            ("CT_DatVe", CT_DatVe),
            ("ThanhToan", ThanhToan),
            ("LichSuVe", LichSuVe),
        ]:
            count = db.query(model).count()
            print(f"  + {tbl:12s}: {count:4d} bản ghi")

    except Exception as e:
        db.rollback()
        print(f"[seed] LỖI khi nạp dữ liệu: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
