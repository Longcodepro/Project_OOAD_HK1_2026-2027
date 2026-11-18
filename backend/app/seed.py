"""Script nạp dữ liệu mẫu (Seed Data) chuẩn xác, thực tế ngoài đời.

Dữ liệu bao gồm các nhà xe lớn (Phương Trang FUTA, Thành Bưởi, Sao Việt, HK Buslines),
các bến xe thực tế (Bến xe Miền Đông, Bến xe Miền Tây, Bến xe Giáp Bát, Bến xe Mỹ Đình,
Bến xe Trung tâm Đà Nẵng, Bến xe Liên tỉnh Đà Lạt, Bến xe Nha Trang...),
các tuyến xe trải dài khắp 3 miền Bắc - Trung - Nam - Tây Nguyên - Miền Tây,
các dòng xe thực tế (Limousine 34 phòng, Giường nằm 40 chỗ, Cung điện 24 phòng, Ghế VIP 28 chỗ)
kèm tài khoản nhân viên, tài xế, khách hàng và lịch trình các chuyến xe.
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
    print("[seed] Bắt đầu nạp dữ liệu mẫu thực tế...")
    db = SessionLocal()

    try:
        # 1. Dọn sạch dữ liệu cũ theo thứ tự khóa ngoại
        print("[seed] Xóa dữ liệu cũ...")
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

        # 2. Vai Trò (6 vai trò theo RDM)
        print("[seed] Nạp VaiTro...")
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
        print("[seed] Nạp ChucNang...")
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
        print("[seed] Nạp PhanQuyen...")
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

        # Admin
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

        # Nhân viên bán vé
        danh_sach_nv = [
            ("nv_miendong", "Nguyễn Thị Mai Anh", "0912345678", date(1995, 8, 20), "Nhân viên Bến xe Miền Đông"),
            ("nv_mientay", "Lê Văn Phúc", "0987654321", date(1993, 3, 14), "Nhân viên Bến xe Miền Tây"),
            ("nv_mydinh", "Phạm Hồng Sơn", "0934567890", date(1996, 11, 28), "Nhân viên Bến xe Mỹ Đình"),
            ("nv_danang", "Hoàng Lan Hương", "0978901234", date(1997, 6, 5), "Nhân viên Bến xe Đà Nẵng"),
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
            ("tx_vothanhliem", "Võ Thanh Liêm", "0933445566", date(1989, 12, 10), "Tài xế phụ"),
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

        # Khách hàng có tài khoản
        danh_sach_kh = [
            ("kh_dangvulong", "Đặng Vũ Long", "0908889999", "Quận 1, TP. Hồ Chí Minh"),
            ("kh_nguyenminhtri", "Nguyễn Minh Trí", "0911223344", "Cầu Giấy, Hà Nội"),
            ("kh_lethithuy", "Lê Thị Thúy", "0988776655", "Hải Châu, TP. Đà Nẵng"),
            ("kh_tranthuha", "Trần Thu Hà", "0944556677", "Phường 1, TP. Đà Lạt"),
            ("kh_buiducanh", "Bùi Đức Anh", "0966332211", "Ninh Kiều, TP. Cần Thơ"),
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

        # Thêm 2 khách hàng vãng lai (MaTK = NULL)
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
        db.add_all([kh_vang_lai_1, kh_vang_lai_2])
        db.flush()

        # 6. Loại Xe & Xe & Ghế
        print("[seed] Nạp LoaiXe, Xe, Ghe...")
        loai_xe_data = [
            ("Limousine 34 Phòng", 34, "Xe giường phòng Limousine VIP, rèm riêng tư, cổng sạc, massage"),
            ("Giường Nằm 40 Chỗ", 40, "Xe giường nằm 2 tầng tiêu chuẩn FUTA, wifi, nước suối, khăn lạnh"),
            ("Cung Điện 24 Phòng", 24, "Xe cabin phòng đôi/đơn hoàng gia chuyên tuyến du lịch Sa Pa, Đà Lạt"),
            ("Ghế Ngồi Cao Cấp 28 Chỗ", 28, "Xe ghế ngồi ngả lưng bọc da cao cấp chuyên tuyến cự ly ngắn"),
        ]
        loai_xe_map: dict[str, LoaiXe] = {}
        for ten, soghe, mota in loai_xe_data:
            lx = LoaiXe(TenLoaiXe=ten, SoGhe=soghe, MoTa=mota)
            db.add(lx)
            loai_xe_map[ten] = lx
        db.flush()

        # Danh sách Xe thực tế
        xe_data = [
            ("51B-289.45", "Limousine 34 Phòng", "Thaco Mobihome", 2023),
            ("51B-305.18", "Giường Nằm 40 Chỗ", "Hyundai Universe", 2022),
            ("51B-412.79", "Cung Điện 24 Phòng", "Tracomeco", 2024),
            ("49B-018.66", "Limousine 34 Phòng", "Thaco Mobihome", 2023),
            ("29B-188.92", "Cung Điện 24 Phòng", "Hyundai Universe", 2023),
            ("29B-605.34", "Giường Nằm 40 Chỗ", "Thaco Mobihome", 2022),
            ("43B-047.82", "Limousine 34 Phòng", "Tracomeco", 2023),
            ("72B-029.11", "Ghế Ngồi Cao Cấp 28 Chỗ", "Hyundai Solati", 2023),
            ("65B-019.55", "Giường Nằm 40 Chỗ", "Thaco Mobihome", 2022),
            ("79B-031.48", "Limousine 34 Phòng", "Hyundai Universe", 2023),
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

        # Sinh danh sách Ghế cho từng xe theo loại xe
        for bienso, x in xe_map.items():
            loai_ten = next(k for k, v in loai_xe_map.items() if v.MaLoaiXe == x.MaLoaiXe)
            if "34" in loai_ten:
                # 34 phòng: A01 - A17 (Tầng 1), B01 - B17 (Tầng 2)
                for i in range(1, 18):
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"A{i:02d}", Tang=1, TrangThai="Trong"))
                for i in range(1, 18):
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"B{i:02d}", Tang=2, TrangThai="Trong"))
            elif "40" in loai_ten:
                # 40 chỗ: A01 - A20 (Tầng 1), B01 - B20 (Tầng 2)
                for i in range(1, 21):
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"A{i:02d}", Tang=1, TrangThai="Trong"))
                for i in range(1, 21):
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"B{i:02d}", Tang=2, TrangThai="Trong"))
            elif "24" in loai_ten:
                # 24 phòng VIP: A01 - A12 (Tầng 1), B01 - B12 (Tầng 2)
                for i in range(1, 13):
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"A{i:02d}", Tang=1, TrangThai="Trong"))
                for i in range(1, 13):
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"B{i:02d}", Tang=2, TrangThai="Trong"))
            elif "28" in loai_ten:
                # 28 ghế ngồi: 01 - 28 (Tầng 1)
                for i in range(1, 29):
                    db.add(Ghe(MaXe=x.MaXe, SoGhe=f"{i:02d}", Tang=1, TrangThai="Trong"))
        db.flush()

        # 7. Tuyến Xe (Phủ khắp Việt Nam)
        print("[seed] Nạp TuyenXe...")
        tuyen_data = [
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Liên tỉnh Đà Lạt (Lâm Đồng)",
                Decimal("305.00"),
                390,
                "Lộ trình: BX Miền Đông Mới -> Cao tốc Long Thành -> QL20 -> Đèo Prenn -> Bến xe Đà Lạt",
            ),
            (
                "Bến xe Liên tỉnh Đà Lạt (Lâm Đồng)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                Decimal("305.00"),
                390,
                "Lộ trình: Bến xe Đà Lạt -> Đèo Prenn -> QL20 -> Cao tốc Long Thành -> BX Miền Đông Mới",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Phía Nam Nha Trang (Khánh Hòa)",
                Decimal("435.00"),
                450,
                "Lộ trình: Cao tốc Long Thành - Dầu Giây - Phan Thiết - Vĩnh Hảo - Cam Lâm -> Bến xe Nha Trang",
            ),
            (
                "Bến xe Phía Nam Nha Trang (Khánh Hòa)",
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                Decimal("435.00"),
                450,
                "Lộ trình: Bến xe Nha Trang -> Cao tốc Cam Lâm - Vĩnh Hảo - Phan Thiết -> BX Miền Đông Mới",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Trung tâm Cần Thơ",
                Decimal("165.00"),
                210,
                "Lộ trình: BX Miền Tây -> Cao tốc Trung Lương - Mỹ Thuận -> Cầu Cần Thơ -> Bến xe Cần Thơ",
            ),
            (
                "Bến xe Trung tâm Cần Thơ",
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                Decimal("165.00"),
                210,
                "Lộ trình: Bến xe Cần Thơ -> Cầu Cần Thơ -> Cao tốc Mỹ Thuận - Trung Lương -> BX Miền Tây",
            ),
            (
                "Bến xe Miền Đông cũ (TP. Hồ Chí Minh)",
                "Bến xe Vũng Tàu (Bà Rịa - Vũng Tàu)",
                Decimal("105.00"),
                135,
                "Lộ trình: Hàng Xanh -> Cao tốc Long Thành -> QL51 -> Bến xe Vũng Tàu",
            ),
            (
                "Bến xe Vũng Tàu (Bà Rịa - Vũng Tàu)",
                "Bến xe Miền Đông cũ (TP. Hồ Chí Minh)",
                Decimal("105.00"),
                135,
                "Lộ trình: Bến xe Vũng Tàu -> QL51 -> Cao tốc Long Thành -> Bến xe Miền Đông",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Buôn Ma Thuột (Đắk Lắk)",
                Decimal("350.00"),
                450,
                "Lộ trình: QL13 -> QL14 (Đường Hồ Chí Minh) qua Đắk Nông -> Bến xe Buôn Ma Thuột",
            ),
            (
                "Bến xe Miền Tây (TP. Hồ Chí Minh)",
                "Bến xe Rạch Sỏi (Rạch Giá - Kiên Giang)",
                Decimal("250.00"),
                330,
                "Lộ trình: BX Miền Tây -> Cao tốc Trung Lương -> Tuyến Lộ Tẻ - Rạch Sỏi -> Bến xe Rạch Sỏi",
            ),
            (
                "Bến xe Mỹ Đình (Hà Nội)",
                "Bến xe Sa Pa (Lào Cai)",
                Decimal("320.00"),
                330,
                "Lộ trình: BX Mỹ Đình -> Cầu Nhật Tân -> Cao tốc Nội Bài - Lào Cai -> Cầu Móng Sến -> Sa Pa",
            ),
            (
                "Bến xe Sa Pa (Lào Cai)",
                "Bến xe Mỹ Đình (Hà Nội)",
                Decimal("320.00"),
                330,
                "Lộ trình: Bến xe Sa Pa -> Cao tốc Lào Cai - Nội Bài -> Bến xe Mỹ Đình",
            ),
            (
                "Bến xe Giáp Bát (Hà Nội)",
                "Bến xe Bãi Cháy (Hạ Long - Quảng Ninh)",
                Decimal("160.00"),
                150,
                "Lộ trình: Cao tốc Hà Nội - Hải Phòng - Bạch Đằng - Hạ Long -> Bến xe Bãi Cháy",
            ),
            (
                "Bến xe Gia Lâm (Hà Nội)",
                "Bến xe Vĩnh Niệm (Hải Phòng)",
                Decimal("110.00"),
                90,
                "Lộ trình: Cao tốc 5B Hà Nội - Hải Phòng -> Bến xe Vĩnh Niệm",
            ),
            (
                "Bến xe Trung tâm Đà Nẵng",
                "Bến xe Phía Nam Huế",
                Decimal("100.00"),
                120,
                "Lộ trình: Bến xe Đà Nẵng -> Hầm đường bộ Hải Vân -> QL1A -> Bến xe Phía Nam Huế",
            ),
            (
                "Bến xe Miền Đông mới (TP. Hồ Chí Minh)",
                "Bến xe Trung tâm Đà Nẵng",
                Decimal("950.00"),
                1020,
                "Lộ trình: Trục QL1A Nam Trung Bộ qua Bình Thuận, Ninh Thuận, Khánh Hòa, Bình Định, Đà Nẵng",
            ),
        ]
        tuyen_list: list[TuyenXe] = []
        for di, den, km, phut, mota in tuyen_data:
            tx = TuyenXe(
                DiemDi=di,
                DiemDen=den,
                KhoangCach=km,
                ThoiGianDuKien=phut,
                MoTa=mota,
                TrangThai="HoatDong",
            )
            db.add(tx)
            tuyen_list.append(tx)
        db.flush()

        # 8. Chuyến Xe (Các chuyến thực tế trong tuần từ hôm nay trở đi)
        print("[seed] Nạp ChuyenXe...")
        hom_nay = date.today()
        chuyen_xe_list: list[ChuyenXe] = []

        # Tuyến 1: TP.HCM -> Đà Lạt (Xe 51B-289.45 Limousine 34P)
        for offset in range(5):
            ngay = hom_nay + timedelta(days=offset)
            chuyen_xe_list.append(
                ChuyenXe(
                    MaTuyen=tuyen_list[0].MaTuyen,
                    MaXe=xe_map["51B-289.45"].MaXe,
                    NgayKhoiHanh=ngay,
                    GioKhoiHanh=time(8, 0),
                    GiaVe=Decimal("320000.00"),
                    TrangThai="SapKhoiHanh",
                    GhiChu="Xe Limousine 34 phòng cao cấp, đón tại Hàng Xanh lúc 08:30",
                )
            )
            chuyen_xe_list.append(
                ChuyenXe(
                    MaTuyen=tuyen_list[0].MaTuyen,
                    MaXe=xe_map["49B-018.66"].MaXe,
                    NgayKhoiHanh=ngay,
                    GioKhoiHanh=time(22, 30),
                    GiaVe=Decimal("350000.00"),
                    TrangThai="SapKhoiHanh",
                    GhiChu="Chuyến đêm, đến Đà Lạt sáng sớm 05:00",
                )
            )

        # Tuyến 2: Đà Lạt -> TP.HCM (Xe 49B-018.66)
        for offset in range(4):
            ngay = hom_nay + timedelta(days=offset)
            chuyen_xe_list.append(
                ChuyenXe(
                    MaTuyen=tuyen_list[1].MaTuyen,
                    MaXe=xe_map["49B-018.66"].MaXe,
                    NgayKhoiHanh=ngay,
                    GioKhoiHanh=time(13, 0),
                    GiaVe=Decimal("320000.00"),
                    TrangThai="SapKhoiHanh",
                    GhiChu="Trả khách tại BX Miền Đông Mới và Suối Tiên",
                )
            )

        # Tuyến 3: TP.HCM -> Nha Trang (Xe 79B-031.48)
        for offset in range(4):
            ngay = hom_nay + timedelta(days=offset)
            chuyen_xe_list.append(
                ChuyenXe(
                    MaTuyen=tuyen_list[2].MaTuyen,
                    MaXe=xe_map["79B-031.48"].MaXe,
                    NgayKhoiHanh=ngay,
                    GioKhoiHanh=time(21, 0),
                    GiaVe=Decimal("340000.00"),
                    TrangThai="SapKhoiHanh",
                    GhiChu="Chạy cao tốc toàn tuyến, êm ái, tặng nước suối khăn lạnh",
                )
            )

        # Tuyến 5: TP.HCM -> Cần Thơ (Xe 65B-019.55 Giường nằm 40C)
        for offset in range(4):
            ngay = hom_nay + timedelta(days=offset)
            for g in [time(7, 30), time(11, 0), time(15, 0)]:
                chuyen_xe_list.append(
                    ChuyenXe(
                        MaTuyen=tuyen_list[4].MaTuyen,
                        MaXe=xe_map["65B-019.55"].MaXe,
                        NgayKhoiHanh=ngay,
                        GioKhoiHanh=g,
                        GiaVe=Decimal("180000.00"),
                        TrangThai="SapKhoiHanh",
                        GhiChu="Xuất bến tại Bến xe Miền Tây",
                    )
                )

        # Tuyến 7: TP.HCM -> Vũng Tàu (Xe 72B-029.11 Ghế ngồi 28C)
        for offset in range(3):
            ngay = hom_nay + timedelta(days=offset)
            for g in [time(6, 30), time(9, 30), time(14, 0), time(17, 30)]:
                chuyen_xe_list.append(
                    ChuyenXe(
                        MaTuyen=tuyen_list[6].MaTuyen,
                        MaXe=xe_map["72B-029.11"].MaXe,
                        NgayKhoiHanh=ngay,
                        GioKhoiHanh=g,
                        GiaVe=Decimal("160000.00"),
                        TrangThai="SapKhoiHanh",
                        GhiChu="Xe limousine ghế ngả cao cấp",
                    )
                )

        # Tuyến 11: Hà Nội -> Sa Pa (Xe 29B-188.92 Cung điện 24P)
        for offset in range(4):
            ngay = hom_nay + timedelta(days=offset)
            chuyen_xe_list.append(
                ChuyenXe(
                    MaTuyen=tuyen_list[10].MaTuyen,
                    MaXe=xe_map["29B-188.92"].MaXe,
                    NgayKhoiHanh=ngay,
                    GioKhoiHanh=time(7, 0),
                    GiaVe=Decimal("450000.00"),
                    TrangThai="SapKhoiHanh",
                    GhiChu="Cabin Cung điện hoàng gia, đón phố cổ và Sân bay Nội Bài",
                )
            )
            chuyen_xe_list.append(
                ChuyenXe(
                    MaTuyen=tuyen_list[10].MaTuyen,
                    MaXe=xe_map["29B-188.92"].MaXe,
                    NgayKhoiHanh=ngay,
                    GioKhoiHanh=time(22, 0),
                    GiaVe=Decimal("480000.00"),
                    TrangThai="SapKhoiHanh",
                    GhiChu="Chuyến đêm, đến Sa Pa lúc 04:30 sáng, khách được ngủ trên xe đến 06:00",
                )
            )

        # Tuyến 15: Đà Nẵng -> Huế (Xe 43B-047.82 Limousine 34P)
        for offset in range(3):
            ngay = hom_nay + timedelta(days=offset)
            chuyen_xe_list.append(
                ChuyenXe(
                    MaTuyen=tuyen_list[14].MaTuyen,
                    MaXe=xe_map["43B-047.82"].MaXe,
                    NgayKhoiHanh=ngay,
                    GioKhoiHanh=time(9, 0),
                    GiaVe=Decimal("140000.00"),
                    TrangThai="SapKhoiHanh",
                    GhiChu="Qua hầm Hải Vân, êm ái nhanh chóng",
                )
            )

        # Tuyến 16: TP.HCM -> Đà Nẵng (Xe 51B-305.18 Giường nằm 40C)
        for offset in range(4):
            ngay = hom_nay + timedelta(days=offset)
            chuyen_xe_list.append(
                ChuyenXe(
                    MaTuyen=tuyen_list[15].MaTuyen,
                    MaXe=xe_map["51B-305.18"].MaXe,
                    NgayKhoiHanh=ngay,
                    GioKhoiHanh=time(15, 0),
                    GiaVe=Decimal("520000.00"),
                    TrangThai="SapKhoiHanh",
                    GhiChu="Bao ăn 2 bữa chính tại trạm dừng chân chất lượng cao",
                )
            )

        db.add_all(chuyen_xe_list)
        db.flush()

        # 9. Khuyến Mãi (Mã voucher thực tế ngoài đời)
        print("[seed] Nạp KhuyenMai...")
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

        # 10. Đặt Vé & Chi Tiết Đặt Vé & Thanh Toán & Lịch Sử Vé Mẫu
        print("[seed] Nạp DatVe, CT_DatVe, ThanhToan, LichSuVe mẫu...")
        # Lấy chuyến xe đầu tiên (Sài Gòn - Đà Lạt chuyến 8h sáng)
        cx_sg_dl = chuyen_xe_list[0]
        # Lấy ghế của xe chạy chuyến này
        ghe_sg_dl = db.query(Ghe).filter(Ghe.MaXe == cx_sg_dl.MaXe).order_by(Ghe.SoGhe).all()

        # Đơn 1: Khách hàng Đặng Vũ Long đặt 2 ghế A01, A02 - Đã thanh toán qua VNPay
        don_1 = DatVe(
            MaKH=kh_map["kh_dangvulong"].MaKH,
            MaNV=None,
            MaKM=km_map["CHAOBANMOI"].MaKM,
            NgayDat=datetime.now() - timedelta(hours=3),
            TongTien=Decimal("590000.00"),  # 2 vé x 320k = 640k - 50k voucher = 590k
            TienGiam=Decimal("50000.00"),
            TrangThai="DaThanhToan",
            GhiChu="Đặt qua website, thanh toán VNPay QR thành công",
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
            GhiChu="Thanh toán thành công qua VNPay-QR",
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

        # Đơn 2: Bán tại quầy cho khách vãng lai (nhân viên Mai Anh bán, ghế A05)
        don_2 = DatVe(
            MaKH=kh_vang_lai_1.MaKH,
            MaNV=nv_map["nv_miendong"].MaNV,
            MaKM=None,
            NgayDat=datetime.now() - timedelta(hours=1),
            TongTien=Decimal("320000.00"),
            TienGiam=Decimal("0.00"),
            TrangThai="DaThanhToan",
            GhiChu="Khách mua trực tiếp tại Quầy số 3 BX Miền Đông",
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

        # Đơn 3: Đơn chờ thanh toán (ghế A08, giữ chỗ trực tuyến)
        don_3 = DatVe(
            MaKH=kh_map["kh_lethithuy"].MaKH,
            MaNV=None,
            MaKM=None,
            NgayDat=datetime.now() - timedelta(minutes=2),
            TongTien=Decimal("320000.00"),
            TienGiam=Decimal("0.00"),
            TrangThai="ChoThanhToan",
            GhiChu="Đang giữ chỗ 5 phút, chờ thanh toán MoMo",
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
        print("[seed] Nạp dữ liệu mẫu THÀNH CÔNG RỰC RỠ!")

        # In tóm tắt số lượng bản ghi
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
            print(f"  + {tbl:12s}: {count} bản ghi")

    except Exception as e:
        db.rollback()
        print(f"[seed] LỖI khi nạp dữ liệu: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
