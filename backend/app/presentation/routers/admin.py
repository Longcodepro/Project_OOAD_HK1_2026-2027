import csv
import io
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.db.models import (
    ChuyenXe,
    CT_DatVe,
    DatVe,
    Ghe,
    KhachHang,
    KhuyenMai,
    LichSuVe,
    LoaiXe,
    NhanVien,
    TaiKhoan,
    ThanhToan,
    ThongBaoSMS,
    TuyenXe,
    VaiTro,
    Xe,
)
from app.infrastructure.db.settings_service import get_setting_int, get_setting_str
from app.infrastructure.security import hash_password
from app.presentation.deps import get_db, require_roles
from app.presentation.schemas.admin import (
    BaoCaoHuyChuyenResponse,
    CapNhatTrangThaiChuyenRequest,
    CapNhatTrangThaiKhuyenMaiRequest,
    CapNhatTrangThaiTaiKhoanRequest,
    CapNhatTrangThaiTuyenRequest,
    CapNhatTrangThaiTuyenResponse,
    CapNhatTrangThaiXeRequest,
    CapNhatTrangThaiXeResponse,
    ChiTietDongBo,
    ChuyenXeAnhHuongItem,
    DoanhThuTheoTuyenItem,
    DongBoVongDoiResponse,
    GheXeItemResponse,
    KetQuaHuyChuyenResponse,
    KhachHangHuyChuyenItem,
    KhuyenMaiAdminItemResponse,
    LapLichHangLoatRequest,
    LapLichHangLoatResponse,
    LichSuThaoTacResponse,
    LoaiXeResponse,
    PhuongTienResponse,
    TaiKhoanAdminItemResponse,
    TaoChuyenXeRequest,
    TaoKhuyenMaiAdminRequest,
    TaoNhanVienRequest,
    TaoPhuongTienRequest,
    TaoTuyenXeRequest,
    ThongBaoKhachHangHuyChuyenItem,
    ThongBaoSMSDaGuiItem,
    ThongKeKPIResponse,
    ThongKePhuongThucItem,
    ThongKeTheoNgayItem,
    ThongKeTuyenXeItem,
    ThongTinChuyenGanNhat,
    XacNhanHoanThanhResponse,
    XacNhanHuyChuyenAdminRequest,
    XeItemResponse,
)

get_password_hash = hash_password
from app.presentation.schemas.coupons import KhuyenMaiItemResponse
from app.presentation.schemas.trips import ChuyenXeItemResponse, TuyenXeResponse

router = APIRouter(prefix="/admin", tags=["quản trị viên (admin)"])

admin_required = require_roles(["QuanTri"])


@router.get(
    "/thong-ke",
    response_model=ThongKeKPIResponse,
    summary="Báo cáo tổng quan KPI doanh thu toàn hệ thống",
)
def get_admin_kpi(
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Lấy số liệu thống kê doanh thu, số vé, chuyến xe và khách hàng."""
    # 1. Doanh thu thanh toán thành công (không bao gồm hoàn tiền)
    tong_thu = (
        db.query(func.coalesce(func.sum(ThanhToan.SoTien), 0))
        .filter(
            ThanhToan.TrangThai == "ThanhCong",
            ~ThanhToan.PhuongThuc.like("HoanTien%"),
            ~ThanhToan.MaGiaoDich.like("REF_%"),
        )
        .scalar()
        or Decimal(0)
    )

    # 2. Tiền hoàn hủy bồi thường (online + quầy)
    tong_hoan = (
        db.query(func.coalesce(func.sum(ThanhToan.SoTien), 0))
        .filter(
            ThanhToan.TrangThai == "ThanhCong",
            or_(
                ThanhToan.PhuongThuc.like("HoanTien%"),
                ThanhToan.MaGiaoDich.like("REF_%"),
            ),
        )
        .scalar()
        or Decimal(0)
    )

    # 3. Số đơn đã thanh toán
    tong_don = (
        db.query(func.count(DatVe.MaDatVe))
        .filter(DatVe.TrangThai == "DaThanhToan")
        .scalar()
        or 0
    )

    # 4. Số vé bán được
    tong_ve = (
        db.query(func.count(CT_DatVe.MaCT))
        .join(CT_DatVe.dat_ve)
        .filter(DatVe.TrangThai == "DaThanhToan")
        .scalar()
        or 0
    )

    # 5. Tổng số chuyến xe trên hệ thống
    tong_chuyen = db.query(func.count(ChuyenXe.MaChuyen)).scalar() or 0

    # 6. Tổng khách hàng
    tong_khach = db.query(func.count(KhachHang.MaKH)).scalar() or 0

    return ThongKeKPIResponse(
        tong_doanh_thu_thuc_te=tong_thu - tong_hoan,
        tong_tien_thu=tong_thu,
        tong_tien_hoan=tong_hoan,
        tong_don_hang=tong_don,
        tong_ve_ban=tong_ve,
        tong_chuyen_xe=tong_chuyen,
        tong_khach_hang=tong_khach,
        # Legacy backward-compatibility
        tong_doanh_thu=tong_thu - tong_hoan,
        tong_so_don=tong_don,
        tong_so_ve_ban=tong_ve,
        tong_so_chuyen_hoat_dong=tong_chuyen,
        tong_so_khach_hang=tong_khach,
        tong_tien_hoan_huy=tong_hoan,
    )


@router.get(
    "/thong-ke/tuyen-xe",
    response_model=list[ThongKeTuyenXeItem],
    summary="Thống kê doanh thu theo từng tuyến xe",
)
@router.get(
    "/thong-ke/doanh-thu-theo-tuyen",
    response_model=list[ThongKeTuyenXeItem],
    summary="Thống kê doanh thu theo từng tuyến đường (legacy alias)",
)
def get_revenue_by_route(
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Tổng hợp số chuyến, số vé, tỷ lệ lấp đầy và doanh thu thực tế phân bổ theo từng tuyến xe."""
    routes = db.query(TuyenXe).order_by(TuyenXe.MaTuyen).all()
    results: list[ThongKeTuyenXeItem] = []

    for r in routes:
        trip_ids = [c.MaChuyen for c in r.chuyen_xe_list]
        so_chuyen = len(trip_ids)
        tuyen_xe_name = f"{r.DiemDi} -> {r.DiemDen}"

        # Tổng số ghế trên tất cả các chuyến của tuyến
        tong_ghe = sum(c.xe.loai_xe.SoGhe for c in r.chuyen_xe_list if c.xe and c.xe.loai_xe)

        if not trip_ids:
            results.append(
                ThongKeTuyenXeItem(
                    ma_tuyen=r.MaTuyen,
                    tuyen_xe=tuyen_xe_name,
                    diem_di=r.DiemDi,
                    diem_den=r.DiemDen,
                    so_chuyen=0,
                    so_ve_ban=0,
                    tong_doanh_thu=Decimal(0),
                    doanh_thu=Decimal(0),
                    ty_le_lap_day_trung_binh=0.0,
                )
            )
            continue

        # Số vé bán và doanh thu của các đơn đã thanh toán
        stats = (
            db.query(
                func.count(CT_DatVe.MaCT).label("so_ve"),
                func.coalesce(func.sum(CT_DatVe.DonGia), 0).label("doanh_thu"),
            )
            .join(CT_DatVe.dat_ve)
            .filter(
                CT_DatVe.MaChuyen.in_(trip_ids),
                DatVe.TrangThai == "DaThanhToan",
            )
            .first()
        )
        so_ve = stats.so_ve if stats else 0
        doanh_thu = stats.doanh_thu if stats else Decimal(0)
        ty_le = round(float(so_ve / tong_ghe * 100), 1) if tong_ghe > 0 else 0.0

        results.append(
            ThongKeTuyenXeItem(
                ma_tuyen=r.MaTuyen,
                tuyen_xe=tuyen_xe_name,
                diem_di=r.DiemDi,
                diem_den=r.DiemDen,
                so_chuyen=so_chuyen,
                so_ve_ban=so_ve,
                tong_doanh_thu=doanh_thu,
                doanh_thu=doanh_thu,
                ty_le_lap_day_trung_binh=ty_le,
            )
        )

    # Sắp xếp tuyến theo doanh thu giảm dần
    results.sort(key=lambda x: x.tong_doanh_thu, reverse=True)
    return results



@router.get(
    "/thong-ke/theo-ngay",
    response_model=list[ThongKeTheoNgayItem],
    summary="Thống kê doanh thu theo từng ngày gần nhất",
)
def get_revenue_by_date(
    so_ngay: int = Query(7, ge=1, le=90, description="Số ngày gần nhất cần thống kê (mặc định 7 hoặc 30)"),
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Thống kê doanh thu, số vé, số đơn hàng theo từng ngày."""
    today = date.today()
    start_date = today - timedelta(days=so_ngay - 1)

    # Tiền thu theo ngày
    thu_rows = (
        db.query(
            func.date(ThanhToan.ThoiGianThanhToan).label("ngay"),
            func.coalesce(func.sum(ThanhToan.SoTien), 0).label("tien_thu"),
        )
        .filter(
            ThanhToan.TrangThai == "ThanhCong",
            ~ThanhToan.PhuongThuc.like("HoanTien%"),
            ~ThanhToan.MaGiaoDich.like("REF_%"),
            func.date(ThanhToan.ThoiGianThanhToan) >= start_date,
        )
        .group_by(func.date(ThanhToan.ThoiGianThanhToan))
        .all()
    )
    thu_dict = {r.ngay: r.tien_thu for r in thu_rows}

    # Tiền hoàn theo ngày
    hoan_rows = (
        db.query(
            func.date(ThanhToan.ThoiGianThanhToan).label("ngay"),
            func.coalesce(func.sum(ThanhToan.SoTien), 0).label("tien_hoan"),
        )
        .filter(
            ThanhToan.TrangThai == "ThanhCong",
            or_(
                ThanhToan.PhuongThuc.like("HoanTien%"),
                ThanhToan.MaGiaoDich.like("REF_%"),
            ),
            func.date(ThanhToan.ThoiGianThanhToan) >= start_date,
        )
        .group_by(func.date(ThanhToan.ThoiGianThanhToan))
        .all()
    )
    hoan_dict = {r.ngay: r.tien_hoan for r in hoan_rows}

    # Số đơn theo ngày
    don_rows = (
        db.query(
            func.date(DatVe.NgayDat).label("ngay"),
            func.count(DatVe.MaDatVe).label("so_don"),
        )
        .filter(
            DatVe.TrangThai == "DaThanhToan",
            func.date(DatVe.NgayDat) >= start_date,
        )
        .group_by(func.date(DatVe.NgayDat))
        .all()
    )
    don_dict = {r.ngay: r.so_don for r in don_rows}

    # Số vé theo ngày
    ve_rows = (
        db.query(
            func.date(DatVe.NgayDat).label("ngay"),
            func.count(CT_DatVe.MaCT).label("so_ve"),
        )
        .join(CT_DatVe.dat_ve)
        .filter(
            DatVe.TrangThai == "DaThanhToan",
            func.date(DatVe.NgayDat) >= start_date,
        )
        .group_by(func.date(DatVe.NgayDat))
        .all()
    )
    ve_dict = {r.ngay: r.so_ve for r in ve_rows}

    results: list[ThongKeTheoNgayItem] = []
    for i in range(so_ngay):
        cur_d = start_date + timedelta(days=i)
        thu = thu_dict.get(cur_d, Decimal(0))
        hoan = hoan_dict.get(cur_d, Decimal(0))
        net = thu - hoan
        results.append(
            ThongKeTheoNgayItem(
                ngay=cur_d.strftime("%Y-%m-%d"),
                doanh_thu=net,
                so_ve=ve_dict.get(cur_d, 0),
                so_don=don_dict.get(cur_d, 0),
            )
        )

    return results



@router.get(
    "/thong-ke/phuong-thuc-thanh-toan",
    response_model=list[ThongKePhuongThucItem],
    summary="Thống kê tỷ trọng doanh thu theo phương thức thanh toán",
)
def get_revenue_by_payment_method(
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Thống kê cơ cấu doanh thu theo phương thức thanh toán: VietQR / Chuyển khoản vs Tiền mặt tại quầy."""
    stats = (
        db.query(
            ThanhToan.PhuongThuc,
            func.count(ThanhToan.MaThanhToan).label("so_gd"),
            func.sum(ThanhToan.SoTien).label("tong_tien"),
        )
        .filter(
            ThanhToan.TrangThai == "ThanhCong",
            ~ThanhToan.PhuongThuc.like("HoanTien%"),
            ~ThanhToan.MaGiaoDich.like("REF_%"),
        )
        .group_by(ThanhToan.PhuongThuc)
        .all()
    )

    name_map = {
        "VietQR": "VietQR Trực Tuyến",
        "TienMatTaiQuay": "Tiền Mặt Tại Quầy",
        "ChuyenKhoanPOS": "Chuyển Khoản POS Quầy",
        "VNPay": "Cổng VNPay-QR",
        "ChuyenKhoan": "Chuyển Khoản Trực Tuyến",
    }

    tong_tien_tat_ca = sum(s.tong_tien for s in stats) or Decimal(1)

    results: list[ThongKePhuongThucItem] = []
    for s in stats:
        pt = s.PhuongThuc
        ty_le = round(float(s.tong_tien / tong_tien_tat_ca * 100), 1)
        results.append(
            ThongKePhuongThucItem(
                phuong_thuc=pt,
                ten_hien_thi=name_map.get(pt, pt),
                so_giao_dich=s.so_gd,
                tong_tien=s.tong_tien,
                ty_le_phan_tram=ty_le,
            )
        )

    results.sort(key=lambda x: x.tong_tien, reverse=True)
    return results



@router.get(
    "/thong-ke/xuat-csv",
    summary="Xuất báo cáo doanh thu & KPI ra file CSV (UTF-8 BOM)",
)
def export_revenue_csv(
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Xuất báo cáo thống kê dạng file CSV có UTF-8 BOM, tương thích hoàn toàn Excel không lỗi font."""
    kpi = get_admin_kpi(current_user=current_user, db=db)
    routes_stats = get_revenue_by_route(current_user=current_user, db=db)
    methods_stats = get_revenue_by_payment_method(current_user=current_user, db=db)
    days_stats = get_revenue_by_date(so_ngay=30, current_user=current_user, db=db)

    output = io.StringIO()
    writer = csv.writer(output)

    # 1. Header Báo cáo
    writer.writerow(["BÁO CÁO THỐNG KÊ DOANH THU & KPI TOÀN HỆ THỐNG"])
    writer.writerow(["Thời gian xuất báo cáo", datetime.now().strftime("%d/%m/%Y %H:%M:%S")])
    writer.writerow(
        ["Người xuất", current_user.nhan_vien.HoTen if current_user.nhan_vien else current_user.TenDangNhap]
    )
    writer.writerow([])

    # 2. Bảng KPI tổng quan
    writer.writerow(["--- 1. CHỈ SỐ KPI TỔNG QUAN ---"])
    writer.writerow(["Chỉ số", "Giá trị"])
    writer.writerow(["Tổng doanh thu thực tế (VNĐ)", f"{kpi.tong_doanh_thu_thuc_te:,.0f}"])
    writer.writerow(["Tổng tiền thu thành công (VNĐ)", f"{kpi.tong_tien_thu:,.0f}"])
    writer.writerow(["Tổng tiền hoàn hủy bồi thường (VNĐ)", f"{kpi.tong_tien_hoan:,.0f}"])
    writer.writerow(["Tổng số đơn hàng đã thanh toán", kpi.tong_don_hang])
    writer.writerow(["Tổng số vé đã bán", kpi.tong_ve_ban])
    writer.writerow(["Tổng số chuyến xe trên hệ thống", kpi.tong_chuyen_xe])
    writer.writerow(["Tổng số khách hàng đăng ký", kpi.tong_khach_hang])
    writer.writerow([])

    # 3. Bảng Doanh thu theo Tuyến xe
    writer.writerow(["--- 2. THỐNG KÊ DOANH THU THEO TUYẾN XE ---"])
    writer.writerow(
        ["Mã Tuyến", "Tuyến Xe", "Số Chuyến", "Số Vé Đã Bán", "Doanh Thu (VNĐ)", "Tỷ Lệ Lấp Đầy Ghế (%)"]
    )
    for r in routes_stats:
        writer.writerow(
            [
                r.ma_tuyen,
                r.tuyen_xe,
                r.so_chuyen,
                r.so_ve_ban,
                f"{r.tong_doanh_thu:,.0f}",
                f"{r.ty_le_lap_day_trung_binh}%",
            ]
        )
    writer.writerow([])

    # 4. Bảng Doanh thu theo Phương thức thanh toán
    writer.writerow(["--- 3. TỶ TRỌNG THEO PHƯƠNG THỨC THANH TOÁN ---"])
    writer.writerow(
        ["Mã Phương Thức", "Tên Phương Thức", "Số Lượt Giao Dịch", "Tổng Số Tiền Thu (VNĐ)", "Tỷ Trọng (%)"]
    )
    for m in methods_stats:
        writer.writerow(
            [m.phuong_thuc, m.ten_hien_thi, m.so_giao_dich, f"{m.tong_tien:,.0f}", f"{m.ty_le_phan_tram}%"]
        )
    writer.writerow([])

    # 5. Bảng Doanh thu 30 ngày gần nhất
    writer.writerow(["--- 4. DOANH THU THEO NGÀY (30 NGÀY GẦN NHẤT) ---"])
    writer.writerow(["Ngày", "Doanh Thu Thuần (VNĐ)", "Số Vé Bán", "Số Đơn Hàng"])
    for d in days_stats:
        writer.writerow([d.ngay, f"{d.doanh_thu:,.0f}", d.so_ve, d.so_don])

    csv_data = "\ufeff" + output.getvalue()
    filename = f"BaoCao_DoanhThu_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data.encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/tuyen-xe",
    response_model=list[TuyenXeResponse],
    summary="Danh sách toàn bộ tuyến xe (Admin)",
)
def get_all_routes_admin(
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Lấy danh sách tất cả các tuyến xe (bao gồm cả HoatDong và TamDung) cho quản trị viên."""
    routes = db.query(TuyenXe).order_by(TuyenXe.MaTuyen).all()
    return [
        TuyenXeResponse(
            ma_tuyen=r.MaTuyen,
            diem_di=r.DiemDi,
            diem_den=r.DiemDen,
            khoang_cach=r.KhoangCach,
            thoi_gian_du_kien=r.ThoiGianDuKien,
            mo_ta=r.MoTa,
            trang_thai=r.TrangThai,
        )
        for r in routes
    ]


@router.post(
    "/tuyen-xe",
    response_model=TuyenXeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Thêm mới tuyến xe",
)
def create_route(
    req: TaoTuyenXeRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Admin tạo mới một tuyến xe khai thác."""
    route = TuyenXe(
        DiemDi=req.diem_di.strip(),
        DiemDen=req.diem_den.strip(),
        KhoangCach=req.khoang_cach,
        ThoiGianDuKien=req.thoi_gian_du_kien,
        MoTa=req.mo_ta,
        TrangThai="HoatDong",
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return TuyenXeResponse(
        ma_tuyen=route.MaTuyen,
        diem_di=route.DiemDi,
        diem_den=route.DiemDen,
        khoang_cach=route.KhoangCach,
        thoi_gian_du_kien=route.ThoiGianDuKien,
        mo_ta=route.MoTa,
        trang_thai=route.TrangThai,
    )


@router.put(
    "/tuyen-xe/{ma_tuyen}/trang-thai",
    response_model=CapNhatTrangThaiTuyenResponse,
    summary="Bật / Tạm dừng khai thác tuyến xe",
)
def update_route_status(
    ma_tuyen: int,
    req: CapNhatTrangThaiTuyenRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Admin bật hoặc tạm dừng khai thác tuyến xe. Kiểm tra an toàn các chuyến đang mở bán."""
    if req.trang_thai not in ["HoatDong", "TamDung"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trạng thái tuyến chỉ có thể là 'HoatDong' hoặc 'TamDung'",
        )

    route = db.query(TuyenXe).filter(TuyenXe.MaTuyen == ma_tuyen).first()
    if not route:
        raise HTTPException(status_code=404, detail="Không tìm thấy tuyến xe")

    so_chuyen_dang_mo_ban = 0
    if req.trang_thai == "TamDung":
        so_chuyen_dang_mo_ban = (
            db.query(func.count(ChuyenXe.MaChuyen))
            .filter(
                ChuyenXe.MaTuyen == ma_tuyen,
                ChuyenXe.TrangThai.in_(["DangBan", "SapKhoiHanh"]),
            )
            .scalar()
            or 0
        )
        route.TrangThai = "TamDung"
        db.commit()
        if so_chuyen_dang_mo_ban > 0:
            thong_diep = f"Tuyến hiện đang có {so_chuyen_dang_mo_ban} chuyến xe đang mở bán hoặc chuẩn bị chạy."
        else:
            thong_diep = f"Đã tạm dừng khai thác tuyến #{ma_tuyen} thành công."
    else:
        route.TrangThai = "HoatDong"
        db.commit()
        thong_diep = f"Đã kích hoạt khai thác tuyến #{ma_tuyen} thành công."

    return CapNhatTrangThaiTuyenResponse(
        ma_tuyen=route.MaTuyen,
        trang_thai=route.TrangThai,
        so_chuyen_dang_mo_ban=so_chuyen_dang_mo_ban,
        thong_diep=thong_diep,
    )


@router.get(
    "/xe",
    response_model=list[XeItemResponse],
    summary="Danh sách xe sẵn sàng lập lịch kèm chuyến xe mới nhất",
)
def get_admin_vehicles(
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Lấy danh sách xe đang hoạt động kèm thông tin chuyến xe mới nhất để Admin xếp lịch quay đầu."""
    vehicles = (
        db.query(Xe)
        .options(joinedload(Xe.loai_xe))
        .filter(Xe.TrangThai == "HoatDong")
        .order_by(Xe.MaXe)
        .all()
    )

    results: list[XeItemResponse] = []
    for v in vehicles:
        latest_trip = (
            db.query(ChuyenXe)
            .options(joinedload(ChuyenXe.tuyen_xe))
            .filter(ChuyenXe.MaXe == v.MaXe, ChuyenXe.TrangThai != "HuyChuyen")
            .order_by(ChuyenXe.NgayKhoiHanh.desc(), ChuyenXe.GioKhoiHanh.desc())
            .first()
        )
        chuyen_gan_nhat = None
        if latest_trip and latest_trip.tuyen_xe:
            chuyen_gan_nhat = ThongTinChuyenGanNhat(
                ma_chuyen=latest_trip.MaChuyen,
                tuyen_xe=f"{latest_trip.tuyen_xe.DiemDi} -> {latest_trip.tuyen_xe.DiemDen}",
                diem_den=latest_trip.tuyen_xe.DiemDen,
                ngay_khoi_hanh=latest_trip.NgayKhoiHanh,
                gio_khoi_hanh=latest_trip.GioKhoiHanh,
                trang_thai=latest_trip.TrangThai,
            )

        results.append(
            XeItemResponse(
                ma_xe=v.MaXe,
                bien_so=v.BienSo,
                ma_loai_xe=v.MaLoaiXe,
                ten_loai_xe=v.loai_xe.TenLoaiXe if v.loai_xe else "Xe khách",
                so_ghe=v.loai_xe.SoGhe if v.loai_xe else 0,
                trang_thai=v.TrangThai,
                chuyen_gan_nhat=chuyen_gan_nhat,
            )
        )
    return results


@router.get(
    "/phuong-tien",
    response_model=list[PhuongTienResponse],
    summary="Danh sách toàn bộ xe trong đội xe kèm số chuyến xe đã phụ trách",
)
def get_all_vehicles(
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Lấy danh sách toàn bộ xe (Xe join LoaiXe), có kèm thống kê số chuyến xe đã phụ trách."""
    vehicles = (
        db.query(Xe)
        .options(joinedload(Xe.loai_xe))
        .order_by(Xe.MaXe.desc())
        .all()
    )

    trip_counts = dict(
        db.query(ChuyenXe.MaXe, func.count(ChuyenXe.MaChuyen))
        .group_by(ChuyenXe.MaXe)
        .all()
    )

    results: list[PhuongTienResponse] = []
    for v in vehicles:
        ten_loai = v.loai_xe.TenLoaiXe if v.loai_xe else "Không xác định"
        so_ghe = v.loai_xe.SoGhe if v.loai_xe else 0
        results.append(
            PhuongTienResponse(
                ma_xe=v.MaXe,
                bien_so=v.BienSo,
                hang_xe=v.HangXe,
                nam_san_xuat=v.NamSanXuat,
                ma_loai_xe=v.MaLoaiXe,
                ten_loai_xe=ten_loai,
                so_ghe=so_ghe,
                trang_thai=v.TrangThai,
                so_chuyen_da_chay=trip_counts.get(v.MaXe, 0),
            )
        )
    return results


@router.post(
    "/phuong-tien",
    response_model=PhuongTienResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Thêm mới phương tiện và tự động sinh danh sách ghế",
)
def create_vehicle(
    req: TaoPhuongTienRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Thêm mới xe vào đội xe: kiểm tra biển số duy nhất, viết hoa chuẩn VN, và tự động sinh danh sách ghế."""
    bien_so = req.bien_so.strip().upper()
    if not bien_so:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Biển số xe không được để trống.",
        )

    # Kiểm tra trùng biển số
    existing_xe = db.query(Xe).filter(func.upper(Xe.BienSo) == bien_so).first()
    if existing_xe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Biển số xe '{bien_so}' đã tồn tại trong hệ thống.",
        )

    # Kiểm tra loại xe
    loai_xe = db.query(LoaiXe).filter(LoaiXe.MaLoaiXe == req.ma_loai_xe).first()
    if not loai_xe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy loại xe có mã {req.ma_loai_xe}.",
        )

    # Tạo xe
    new_xe = Xe(
        BienSo=bien_so,
        HangXe=req.hang_xe.strip() if req.hang_xe else None,
        NamSanXuat=req.nam_san_xuat,
        MaLoaiXe=req.ma_loai_xe,
        TrangThai="HoatDong",
    )
    db.add(new_xe)
    db.flush()

    # Tự động sinh danh sách ghế theo số ghế và số tầng của loại xe
    ten_loai_lower = loai_xe.TenLoaiXe.lower()
    is_two_floors = any(k in ten_loai_lower for k in ["giường", "phòng", "limousine", "cung điện"]) or (
        loai_xe.SoGhe % 2 == 0 and "ghế ngồi" not in ten_loai_lower and loai_xe.SoGhe > 20
    )

    if is_two_floors:
        half = loai_xe.SoGhe // 2
        for i in range(1, half + 1):
            db.add(Ghe(MaXe=new_xe.MaXe, SoGhe=f"A{i:02d}", Tang=1, TrangThai="Trong"))
        for i in range(1, (loai_xe.SoGhe - half) + 1):
            db.add(Ghe(MaXe=new_xe.MaXe, SoGhe=f"B{i:02d}", Tang=2, TrangThai="Trong"))
    else:
        for i in range(1, loai_xe.SoGhe + 1):
            db.add(Ghe(MaXe=new_xe.MaXe, SoGhe=f"{i:02d}", Tang=1, TrangThai="Trong"))

    db.commit()
    db.refresh(new_xe)

    return PhuongTienResponse(
        ma_xe=new_xe.MaXe,
        bien_so=new_xe.BienSo,
        hang_xe=new_xe.HangXe,
        nam_san_xuat=new_xe.NamSanXuat,
        ma_loai_xe=new_xe.MaLoaiXe,
        ten_loai_xe=loai_xe.TenLoaiXe,
        so_ghe=loai_xe.SoGhe,
        trang_thai=new_xe.TrangThai,
        so_chuyen_da_chay=0,
    )


@router.put(
    "/phuong-tien/{ma_xe}/trang-thai",
    response_model=CapNhatTrangThaiXeResponse,
    summary="Cập nhật trạng thái xe (Hoạt động / Bảo trì / Ngừng hoạt động)",
)
def update_vehicle_status(
    ma_xe: int,
    req: CapNhatTrangThaiXeRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Cập nhật trạng thái xe ('HoatDong', 'BaoTri', 'NgungHoatDong') và cảnh báo các chuyến xe bị ảnh hưởng."""
    valid_statuses = ["HoatDong", "BaoTri", "NgungHoatDong"]
    if req.trang_thai not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Trạng thái xe không hợp lệ. Chỉ chấp nhận một trong các giá trị: {', '.join(valid_statuses)}",
        )

    xe = db.query(Xe).options(joinedload(Xe.loai_xe)).filter(Xe.MaXe == ma_xe).first()
    if not xe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy phương tiện có mã {ma_xe}.",
        )

    chuyen_anh_huong_list: list[ChuyenXeAnhHuongItem] = []
    canh_bao = None

    if req.trang_thai in ["BaoTri", "NgungHoatDong"]:
        affected_trips = (
            db.query(ChuyenXe)
            .options(joinedload(ChuyenXe.tuyen_xe))
            .filter(
                ChuyenXe.MaXe == ma_xe,
                ChuyenXe.TrangThai.in_(["DangBan", "SapKhoiHanh"]),
            )
            .order_by(ChuyenXe.NgayKhoiHanh, ChuyenXe.GioKhoiHanh)
            .all()
        )

        for trip in affected_trips:
            tuyen_str = (
                f"{trip.tuyen_xe.DiemDi} -> {trip.tuyen_xe.DiemDen}"
                if trip.tuyen_xe
                else f"Tuyến #{trip.MaTuyen}"
            )
            chuyen_anh_huong_list.append(
                ChuyenXeAnhHuongItem(
                    ma_chuyen=trip.MaChuyen,
                    tuyen_xe=tuyen_str,
                    ngay_khoi_hanh=trip.NgayKhoiHanh,
                    gio_khoi_hanh=trip.GioKhoiHanh,
                    trang_thai=trip.TrangThai,
                )
            )

        if chuyen_anh_huong_list:
            canh_bao = (
                f"CẢNH BÁO AN TOÀN: Xe {xe.BienSo} chuyển sang '{req.trang_thai}' "
                f"nhưng đang có {len(chuyen_anh_huong_list)} chuyến xe đang mở bán hoặc chuẩn bị khởi hành! "
                f"Cần điều động xe thay thế hoặc thực hiện hủy chuyến hoàn tiền."
            )

    xe.TrangThai = req.trang_thai
    db.commit()

    thong_diep = (
        f"Đã cập nhật trạng thái xe {xe.BienSo} thành '{req.trang_thai}'"
        + (f" (Kèm cảnh báo {len(chuyen_anh_huong_list)} chuyến bị ảnh hưởng)" if chuyen_anh_huong_list else " thành công.")
    )

    return CapNhatTrangThaiXeResponse(
        ma_xe=xe.MaXe,
        bien_so=xe.BienSo,
        trang_thai=xe.TrangThai,
        so_chuyen_anh_huong=len(chuyen_anh_huong_list),
        danh_sach_chuyen_anh_huong=chuyen_anh_huong_list,
        canh_bao=canh_bao,
        thong_diep=thong_diep,
    )


@router.get(
    "/phuong-tien/{ma_xe}/so-do-ghe",
    response_model=list[GheXeItemResponse],
    summary="Lấy danh sách sơ đồ toàn bộ ghế của phương tiện",
)
def get_vehicle_seat_map(
    ma_xe: int,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Lấy danh sách toàn bộ ghế (Ghe) của xe: ma_ghe, so_ghe, tang, trang_thai."""
    xe = db.query(Xe).filter(Xe.MaXe == ma_xe).first()
    if not xe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy phương tiện có mã {ma_xe}.",
        )

    seats = (
        db.query(Ghe)
        .filter(Ghe.MaXe == ma_xe)
        .order_by(Ghe.Tang, Ghe.SoGhe)
        .all()
    )

    return [
        GheXeItemResponse(
            ma_ghe=g.MaGhe,
            ma_xe=g.MaXe,
            so_ghe=g.SoGhe,
            tang=g.Tang,
            trang_thai=g.TrangThai,
        )
        for g in seats
    ]


@router.get(
    "/loai-xe",
    response_model=list[LoaiXeResponse],
    summary="Danh sách các loại xe trong hệ thống",
)
def get_all_vehicle_types(
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Danh sách các loại xe trong hệ thống (Giường nằm 34 phòng, Limousine 22 phòng, Ghế ngồi 45 chỗ...)."""
    vehicle_types = db.query(LoaiXe).order_by(LoaiXe.MaLoaiXe).all()
    return [
        LoaiXeResponse(
            ma_loai_xe=lx.MaLoaiXe,
            ten_loai_xe=lx.TenLoaiXe,
            so_ghe=lx.SoGhe,
            mo_ta=lx.MoTa,
        )
        for lx in vehicle_types
    ]



@router.post(
    "/chuyen-xe",
    response_model=ChuyenXeItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Lập lịch chuyến xe mới",
)
def create_trip(
    req: TaoChuyenXeRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Lập lịch chạy cho một chuyến xe và kiểm tra chống xung đột lịch cùng xe."""
    # 1. Kiểm tra tuyến tồn tại
    route = db.query(TuyenXe).filter(TuyenXe.MaTuyen == req.ma_tuyen).first()
    if not route:
        raise HTTPException(status_code=404, detail="Không tìm thấy tuyến xe")

    # 2. Kiểm tra xe tồn tại
    xe = db.query(Xe).filter(Xe.MaXe == req.ma_xe).first()
    if not xe:
        raise HTTPException(status_code=404, detail="Không tìm thấy xe được gán")

    # 3. Kiểm tra chống xung đột lịch xe (cùng 1 xe chạy cùng ngày và cùng giờ)
    conflicting = (
        db.query(ChuyenXe)
        .filter(
            ChuyenXe.MaXe == req.ma_xe,
            ChuyenXe.NgayKhoiHanh == req.ngay_khoi_hanh,
            ChuyenXe.GioKhoiHanh == req.gio_khoi_hanh,
            ChuyenXe.TrangThai != "HuyChuyen",
        )
        .first()
    )
    if conflicting:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Xe '{xe.BienSo}' đã có lịch chạy vào lúc {req.gio_khoi_hanh} ngày {req.ngay_khoi_hanh} (Chuyến #{conflicting.MaChuyen})",
        )

    # 4. Tạo chuyến xe
    new_trip = ChuyenXe(
        MaTuyen=req.ma_tuyen,
        MaXe=req.ma_xe,
        NgayKhoiHanh=req.ngay_khoi_hanh,
        GioKhoiHanh=req.gio_khoi_hanh,
        GiaVe=req.gia_ve,
        TrangThai="DangBan",
        GhiChu=req.ghi_chu,
    )
    db.add(new_trip)
    db.commit()
    db.refresh(new_trip)

    return ChuyenXeItemResponse(
        ma_chuyen=new_trip.MaChuyen,
        ma_tuyen=new_trip.MaTuyen,
        diem_di=route.DiemDi,
        diem_den=route.DiemDen,
        ngay_khoi_hanh=new_trip.NgayKhoiHanh,
        gio_khoi_hanh=new_trip.GioKhoiHanh,
        gia_ve=new_trip.GiaVe,
        trang_thai=new_trip.TrangThai,
        ghi_chu=new_trip.GhiChu,
        ma_xe=xe.MaXe,
        bien_so=xe.BienSo,
        ten_loai_xe=xe.loai_xe.TenLoaiXe,
        tong_so_ghe=xe.loai_xe.SoGhe,
        so_ghe_trong=xe.loai_xe.SoGhe,
    )


@router.post(
    "/chuyen-xe/lap-lich-hang-loat",
    response_model=LapLichHangLoatResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Lập lịch chuyến xe định kỳ trong N ngày liên tiếp",
)
def bulk_schedule_trips(
    req: LapLichHangLoatRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Admin lập lịch chuyến xe lặp lại hàng ngày từ ngày bắt đầu đến ngày kết thúc."""
    if req.ngay_bat_dau > req.ngay_ket_thuc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày bắt đầu không được lớn hơn ngày kết thúc!",
        )

    delta_days = (req.ngay_ket_thuc - req.ngay_bat_dau).days + 1
    if delta_days > 90:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chỉ cho phép lập lịch định kỳ tối đa 90 ngày mỗi lần!",
        )

    route = db.query(TuyenXe).filter(TuyenXe.MaTuyen == req.ma_tuyen).first()
    if not route:
        raise HTTPException(status_code=404, detail="Không tìm thấy tuyến xe")

    xe = db.query(Xe).filter(Xe.MaXe == req.ma_xe).first()
    if not xe:
        raise HTTPException(status_code=404, detail="Không tìm thấy xe được gán")

    current_date = req.ngay_bat_dau
    dates_to_create: list[date] = []
    while current_date <= req.ngay_ket_thuc:
        conflicting = (
            db.query(ChuyenXe)
            .filter(
                ChuyenXe.MaXe == req.ma_xe,
                ChuyenXe.NgayKhoiHanh == current_date,
                ChuyenXe.GioKhoiHanh == req.gio_khoi_hanh,
                ChuyenXe.TrangThai != "HuyChuyen",
            )
            .first()
        )
        if conflicting:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Xe '{xe.BienSo}' đã có lịch chạy vào lúc {req.gio_khoi_hanh} ngày {current_date} (Chuyến #{conflicting.MaChuyen})",
            )
        dates_to_create.append(current_date)
        current_date += timedelta(days=1)

    created_ids: list[int] = []
    now = datetime.now()
    for d in dates_to_create:
        departure_dt = datetime.combine(d, req.gio_khoi_hanh)
        if now < departure_dt - timedelta(hours=1):
            init_status = "DangBan"
        elif departure_dt - timedelta(hours=1) <= now < departure_dt:
            init_status = "SapKhoiHanh"
        else:
            init_status = "DangChay"

        new_trip = ChuyenXe(
            MaTuyen=req.ma_tuyen,
            MaXe=req.ma_xe,
            NgayKhoiHanh=d,
            GioKhoiHanh=req.gio_khoi_hanh,
            GiaVe=req.gia_ve,
            TrangThai=init_status,
            GhiChu=req.ghi_chu,
        )
        db.add(new_trip)
        db.flush()
        created_ids.append(new_trip.MaChuyen)

    db.commit()

    return LapLichHangLoatResponse(
        status="success",
        so_chuyen_tao=len(created_ids),
        danh_sach_ma_chuyen=created_ids,
        thong_diep=f"Đã lập lịch thành công {len(created_ids)} chuyến xe từ ngày {req.ngay_bat_dau} đến ngày {req.ngay_ket_thuc}.",
    )


@router.post(
    "/chuyen-xe/dong-bo-vong-doi",
    response_model=DongBoVongDoiResponse,
    summary="Đồng bộ vòng đời trạng thái chuyến xe theo thời gian thực",
)
def sync_trip_lifecycle(
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """
    Quét và tự động đồng bộ trạng thái các chuyến theo thời gian thực:
    - now < GioKhoiHanh - 1 tiếng: DangBan (Đang mở bán)
    - GioKhoiHanh - 1 tiếng <= now < GioKhoiHanh: SapKhoiHanh (Sắp khởi hành)
    - now >= GioKhoiHanh (và chưa hoàn thành): DangChay (Đang chạy trên đường)
    - Chuyến đã HoanThanh hoặc HuyChuyen: giữ nguyên.
    """
    now = datetime.now()
    trips = (
        db.query(ChuyenXe)
        .filter(ChuyenXe.TrangThai.notin_(["HoanThanh", "HuyChuyen"]))
        .all()
    )

    updated_count = 0
    for trip in trips:
        departure_dt = datetime.combine(trip.NgayKhoiHanh, trip.GioKhoiHanh)
        if now < departure_dt - timedelta(hours=1):
            target_status = "DangBan"
        elif departure_dt - timedelta(hours=1) <= now < departure_dt:
            target_status = "SapKhoiHanh"
        else:
            target_status = "DangChay"

        if trip.TrangThai != target_status:
            trip.TrangThai = target_status
            updated_count += 1

    db.commit()

    dang_ban = db.query(func.count(ChuyenXe.MaChuyen)).filter(ChuyenXe.TrangThai == "DangBan").scalar() or 0
    sap_khoi_hanh = db.query(func.count(ChuyenXe.MaChuyen)).filter(ChuyenXe.TrangThai == "SapKhoiHanh").scalar() or 0
    dang_chay = db.query(func.count(ChuyenXe.MaChuyen)).filter(ChuyenXe.TrangThai == "DangChay").scalar() or 0

    return DongBoVongDoiResponse(
        status="success",
        so_chuyen_cap_nhat=updated_count,
        thong_diep=f"Đồng bộ thành công! Đã cập nhật trạng thái cho {updated_count} chuyến xe.",
        chi_tiet=ChiTietDongBo(
            dang_ban=dang_ban,
            sap_khoi_hanh=sap_khoi_hanh,
            dang_chay=dang_chay,
        ),
    )


@router.get(
    "/chuyen-xe/{ma_chuyen}/bao-cao-huy",
    response_model=BaoCaoHuyChuyenResponse,
    summary="Xem trước báo cáo thống kê chi phí hoàn tiền & thông báo khi hủy chuyến",
)
def get_cancel_trip_report(
    ma_chuyen: int,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Hiển thị bảng thống kê chi phí hoàn tiền (Tab 1) và bảng thông báo 3 cột phân loại kênh hoàn/SMS (Tab 2)."""
    trip = (
        db.query(ChuyenXe)
        .options(
            joinedload(ChuyenXe.tuyen_xe),
            joinedload(ChuyenXe.xe),
        )
        .filter(ChuyenXe.MaChuyen == ma_chuyen)
        .first()
    )
    if not trip:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")

    if trip.TrangThai == "HoanThanh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chuyến xe đã kết thúc hành trình, không thể hủy!",
        )

    if trip.TrangThai == "DangChay":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Xe đang chở khách lăn bánh trên đường, không thể hủy chuyến! Vui lòng chọn điều xe cứu hộ/chuyển khách.",
        )

    ty_le_mac_dinh = get_setting_int(db, "TY_LE_HOAN_TIEN_KHI_HUY_CHUYEN", 110)

    # Lấy các đơn đặt vé đã thanh toán
    orders = (
        db.query(DatVe)
        .join(CT_DatVe, CT_DatVe.MaDatVe == DatVe.MaDatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.thanh_toan_list),
        )
        .filter(
            CT_DatVe.MaChuyen == ma_chuyen,
            DatVe.TrangThai == "DaThanhToan",
        )
        .distinct()
        .all()
    )

    danh_sach_khach: list[KhachHangHuyChuyenItem] = []
    danh_sach_thong_bao: list[ThongBaoKhachHangHuyChuyenItem] = []
    tong_ve = 0
    tong_tien_goc = Decimal(0)
    tong_tien_hoan = Decimal(0)

    for od in orders:
        tickets_on_trip = [ct for ct in od.ct_dat_ve_list if ct.MaChuyen == ma_chuyen]
        so_ve = len(tickets_on_trip)
        tien_goc = od.TongTien
        tien_hoan = tien_goc * (Decimal(ty_le_mac_dinh) / Decimal(100))

        tong_ve += so_ve
        tong_tien_goc += tien_goc
        tong_tien_hoan += tien_hoan

        # Tab 1: Thiệt hại & bồi thường
        danh_sach_khach.append(
            KhachHangHuyChuyenItem(
                ma_dat_ve=od.MaDatVe,
                ho_ten=od.khach_hang.HoTen if od.khach_hang else "Khách vãng lai",
                sdt=od.khach_hang.SDT if od.khach_hang else "",
                so_luong_ve=so_ve,
                tien_goc=tien_goc,
                tien_hoan_du_kien=tien_hoan,
            )
        )

        # Tab 2: Thông báo người dùng & Kênh hoàn tiền (3 Cột chuẩn)
        is_counter = (od.MaNV is not None) or any(t.PhuongThuc == "TienMatTaiQuay" for t in od.thanh_toan_list)
        so_ghe_list = [ct.ghe.SoGhe for ct in tickets_on_trip if ct.ghe]
        so_ghe_str = ", ".join(so_ghe_list) if so_ghe_list else f"{so_ve} ghế"

        if is_counter:
            hinh_thuc = "TaiQuay"
            tai_khoan_str = None  # Để trống nếu mua trực tiếp tại quầy
            sdt_sms = od.khach_hang.SDT if od.khach_hang else ""
        else:
            hinh_thuc = "Online"
            last_pay = next((t for t in reversed(od.thanh_toan_list) if t.TrangThai == "ThanhCong"), None)
            if last_pay and last_pay.SoTaiKhoan:
                tai_khoan_str = f"{last_pay.TenNganHang or 'Ngân hàng'} - {last_pay.SoTaiKhoan} ({last_pay.TenChuTaiKhoan or (od.khach_hang.HoTen if od.khach_hang else 'KHACH HANG')})"
            else:
                tai_khoan_str = f"Techcombank - 190388{od.MaDatVe:04d}99 ({od.khach_hang.HoTen if od.khach_hang else 'KHACH HANG'})"
            sdt_sms = None  # Để trống nếu mua trực tuyến

        danh_sach_thong_bao.append(
            ThongBaoKhachHangHuyChuyenItem(
                ho_ten=od.khach_hang.HoTen if od.khach_hang else "Khách vãng lai",
                danh_sach_so_ghe=so_ghe_str,
                ma_dat_ve=od.MaDatVe,
                danh_sach_ma_ve=[ct.MaCT for ct in tickets_on_trip],
                hinh_thuc_mua=hinh_thuc,
                tai_khoan_hoan_tien=tai_khoan_str,
                sdt_gui_message=sdt_sms,
            )
        )

    tuyen_str = f"{trip.tuyen_xe.DiemDi} -> {trip.tuyen_xe.DiemDen}" if trip.tuyen_xe else ""
    gio_str = f"{trip.GioKhoiHanh} ngày {trip.NgayKhoiHanh}"

    default_mau_sms = (
        "[NHA XE HOANG LONG] Tran trong thong bao den Quy khach {HO_TEN}: "
        "Chuyen xe #{MA_CHUYEN} tuyen {TUYEN_XE} khoi hanh luc {GIO_KHOI_HANH} ngay {NGAY_KHOI_HANH} "
        "buoc phai HUY vi ly do: {LY_DO}. "
        "Ve so #{MA_DAT_VE} (Ghe: {DANH_SACH_GHE}) cua Quy khach se duoc hoan tien boi thuong {TY_LE_HOAN}% "
        "tong cong {TONG_TIEN_HOAN} VND. "
        "Kinh moi Quy khach mang theo ve hoac CCCD den quay ve ben xe de nhan tien mat boi thuong truoc ngay {HAN_NHAN_TIEN}. "
        "Nha xe thanh that cao loi vi su bat tien nay. Hotline 24/7: 1900 6868."
    )
    mau_sms = get_setting_str(db, "MAU_SMS_HUY_CHUYEN_QUAY", default_mau_sms)

    preview_cust = next(
        (od for od in orders if (od.MaNV is not None or any(t.PhuongThuc == "TienMatTaiQuay" for t in od.thanh_toan_list))),
        None,
    )
    if preview_cust:
        prev_name = preview_cust.khach_hang.HoTen if preview_cust.khach_hang else "Quý khách"
        prev_order = str(preview_cust.MaDatVe)
        prev_ghe = ", ".join([ct.ghe.SoGhe for ct in preview_cust.ct_dat_ve_list if ct.ghe]) or "A01"
        prev_tien = f"{preview_cust.TongTien * Decimal(ty_le_mac_dinh) / Decimal(100):,.0f}"
    else:
        prev_name = "Nguyễn Văn A"
        prev_order = "1024"
        prev_ghe = "A01, A02"
        prev_tien = "550,000"

    noi_dung_xem_truoc = (
        mau_sms
        .replace("{HO_TEN}", prev_name)
        .replace("{MA_DAT_VE}", prev_order)
        .replace("{MA_CHUYEN}", str(trip.MaChuyen))
        .replace("{TUYEN_XE}", tuyen_str)
        .replace("{GIO_KHOI_HANH}", str(trip.GioKhoiHanh))
        .replace("{NGAY_KHOI_HANH}", str(trip.NgayKhoiHanh))
        .replace("{DANH_SACH_GHE}", prev_ghe)
        .replace("{TY_LE_HOAN}", str(ty_le_mac_dinh))
        .replace("{TONG_TIEN_HOAN}", prev_tien)
        .replace("{HAN_NHAN_TIEN}", (datetime.now() + timedelta(days=7)).strftime("%d/%m/%Y"))
        .replace("{LY_DO}", "Sự cố thời tiết bão lũ")
        .replace("{HOTLINE}", "1900 6868")
    )

    return BaoCaoHuyChuyenResponse(
        ma_chuyen=trip.MaChuyen,
        tuyen_xe=tuyen_str,
        gio_khoi_hanh=gio_str,
        bien_so=trip.xe.BienSo if trip.xe else "",
        trang_thai_hien_tai=trip.TrangThai,
        tong_so_ve_da_ban=tong_ve,
        tong_tien_goc=tong_tien_goc,
        ty_le_hoan_mac_dinh=ty_le_mac_dinh,
        tong_tien_hoan_du_kien=tong_tien_hoan,
        danh_sach_khach=danh_sach_khach,
        danh_sach_thong_bao_khach=danh_sach_thong_bao,
        mau_tin_nhan_sms=mau_sms,
        noi_dung_sms_xem_truoc=noi_dung_xem_truoc,
    )


@router.post(
    "/chuyen-xe/{ma_chuyen}/xac-nhan-huy",
    response_model=KetQuaHuyChuyenResponse,
    summary="Xác nhận hủy chuyến xe & hoàn tiền tự động",
)
def confirm_cancel_trip(
    ma_chuyen: int,
    req: XacNhanHuyChuyenAdminRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Admin xác nhận hủy chuyến: khóa bán ngay lập tức, tự động hoàn tiền online và gửi SMS cho khách mua trực tiếp."""
    trip = (
        db.query(ChuyenXe)
        .options(joinedload(ChuyenXe.tuyen_xe))
        .filter(ChuyenXe.MaChuyen == ma_chuyen)
        .first()
    )
    if not trip:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")

    if trip.TrangThai == "HoanThanh":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chuyến xe đã kết thúc hành trình, không thể hủy!",
        )

    if trip.TrangThai == "DangChay":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Xe đang chở khách lăn bánh trên đường, không thể hủy chuyến!",
        )

    if trip.TrangThai == "HuyChuyen":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chuyến xe này đã bị hủy trước đó!",
        )

    # Xác định tỷ lệ hoàn tiền
    ty_le = req.ty_le_hoan_tien or get_setting_int(db, "TY_LE_HOAN_TIEN_KHI_HUY_CHUYEN", 110)

    # 1. Đổi trạng thái chuyến thành HuyChuyen
    trip.TrangThai = "HuyChuyen"
    trip.GhiChu = f"Hủy chuyến bởi Admin: {req.ly_do}"

    # 2. Tìm tất cả các đơn đặt vé của chuyến này
    orders = (
        db.query(DatVe)
        .join(CT_DatVe, CT_DatVe.MaDatVe == DatVe.MaDatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.thanh_toan_list),
        )
        .filter(CT_DatVe.MaChuyen == ma_chuyen)
        .distinct()
        .all()
    )

    tuyen_str = f"{trip.tuyen_xe.DiemDi} -> {trip.tuyen_xe.DiemDen}" if trip.tuyen_xe else ""
    default_mau_sms = (
        "[NHA XE HOANG LONG] Tran trong thong bao den Quy khach {HO_TEN}: "
        "Chuyen xe #{MA_CHUYEN} tuyen {TUYEN_XE} khoi hanh luc {GIO_KHOI_HANH} ngay {NGAY_KHOI_HANH} "
        "buoc phai HUY vi ly do: {LY_DO}. "
        "Ve so #{MA_DAT_VE} (Ghe: {DANH_SACH_GHE}) cua Quy khach se duoc hoan tien boi thuong {TY_LE_HOAN}% "
        "tong cong {TONG_TIEN_HOAN} VND. "
        "Kinh moi Quy khach mang theo ve hoac CCCD den quay ve ben xe de nhan tien mat boi thuong truoc ngay {HAN_NHAN_TIEN}. "
        "Nha xe thanh that cao loi vi su bat tien nay. Hotline 24/7: 1900 6868."
    )
    sms_template = req.noi_dung_sms_tuy_chinh or get_setting_str(db, "MAU_SMS_HUY_CHUYEN_QUAY", default_mau_sms)

    now = datetime.now()
    so_don_da_huy = 0
    so_ve_da_huy = 0
    so_don_online_hoan_ngay = 0
    so_don_quay_cho_nhan_tien_mat = 0
    so_sms_da_gui = 0
    tong_tien_hoan = Decimal(0)
    danh_sach_sms_da_gui: list[ThongBaoSMSDaGuiItem] = []

    for od in orders:
        if od.TrangThai == "DaThanhToan":
            od.TrangThai = "DaHuy"
            tien_hoan = od.TongTien * (Decimal(ty_le) / Decimal(100))
            tong_tien_hoan += tien_hoan
            so_don_da_huy += 1

            tickets_on_trip = [ct for ct in od.ct_dat_ve_list if ct.MaChuyen == ma_chuyen]
            so_ve_da_huy += len(tickets_on_trip)
            so_ghe_list = [ct.ghe.SoGhe for ct in tickets_on_trip if ct.ghe]
            so_ghe_str = ", ".join(so_ghe_list) if so_ghe_list else f"{len(tickets_on_trip)} ghế"

            is_counter = (od.MaNV is not None) or any(t.PhuongThuc == "TienMatTaiQuay" for t in od.thanh_toan_list)

            if is_counter:
                # Mua trực tiếp tại quầy: Tạo giao dịch chờ nhận tiền mặt tại quầy
                so_don_quay_cho_nhan_tien_mat += 1
                db.add(
                    ThanhToan(
                        MaDatVe=od.MaDatVe,
                        PhuongThuc="TienMatTaiQuay",
                        SoTien=tien_hoan,
                        MaGiaoDich=f"CASH_REFUND_{uuid.uuid4().hex[:8].upper()}",
                        ThoiGianThanhToan=now,
                        TrangThai="ChoHoanTien",
                        GhiChu=f"Khách mua tại quầy mang vé ra quầy nhận tiền mặt bồi thường {ty_le}%",
                    )
                )

                # Soạn và gửi tin nhắn SMS
                cust_name = od.khach_hang.HoTen if od.khach_hang else "Quý khách"
                cust_sdt = od.khach_hang.SDT if od.khach_hang else ""
                sms_text = (
                    sms_template
                    .replace("{HO_TEN}", cust_name)
                    .replace("{MA_DAT_VE}", str(od.MaDatVe))
                    .replace("{MA_CHUYEN}", str(trip.MaChuyen))
                    .replace("{TUYEN_XE}", tuyen_str)
                    .replace("{GIO_KHOI_HANH}", str(trip.GioKhoiHanh))
                    .replace("{NGAY_KHOI_HANH}", str(trip.NgayKhoiHanh))
                    .replace("{DANH_SACH_GHE}", so_ghe_str)
                    .replace("{TY_LE_HOAN}", str(ty_le))
                    .replace("{TONG_TIEN_HOAN}", f"{tien_hoan:,.0f}")
                    .replace("{HAN_NHAN_TIEN}", (now + timedelta(days=7)).strftime("%d/%m/%Y"))
                    .replace("{LY_DO}", req.ly_do)
                    .replace("{HOTLINE}", "1900 6868")
                )
                db.add(
                    ThongBaoSMS(
                        MaDatVe=od.MaDatVe,
                        MaChuyen=ma_chuyen,
                        SDT=cust_sdt,
                        LoaiThongBao="SMS_HuyChuyenMoiNhanTien",
                        NoiDung=sms_text,
                        TrangThai="DaGui",
                        ThoiGianGui=now,
                        GhiChu=f"Gửi tin nhắn SMS mời khách mua tại quầy ra nhận {ty_le}% tiền mặt",
                    )
                )
                so_sms_da_gui += 1

                danh_sach_sms_da_gui.append(
                    ThongBaoSMSDaGuiItem(
                        ma_dat_ve=od.MaDatVe,
                        ho_ten=cust_name,
                        sdt=cust_sdt,
                        noi_dung=sms_text,
                        trang_thai="DaGui",
                    )
                )

                db.add(
                    LichSuVe(
                        MaDatVe=od.MaDatVe,
                        MaTK=current_user.MaTK,
                        HanhDong="NhaXeHuyChuyenChoKhachRaQuay",
                        LyDo=req.ly_do,
                        GhiChu=f"Đã gửi SMS tới {cust_sdt}. Chờ khách ra quầy nhận {tien_hoan:,.0f} đ",
                    )
                )

            else:
                # Mua trực tuyến: Tự động hoàn tiền online tức thì 110%
                so_don_online_hoan_ngay += 1
                last_pay = next((t for t in reversed(od.thanh_toan_list) if t.TrangThai == "ThanhCong"), None)
                stk = last_pay.SoTaiKhoan if last_pay else f"190388{od.MaDatVe:04d}99"
                bank = last_pay.TenNganHang if last_pay else "Techcombank"
                owner = last_pay.TenChuTaiKhoan if last_pay else (od.khach_hang.HoTen if od.khach_hang else "KHACH HANG")

                db.add(
                    ThanhToan(
                        MaDatVe=od.MaDatVe,
                        PhuongThuc="HoanTienOnline",
                        SoTien=tien_hoan,
                        MaGiaoDich=f"COMP_{uuid.uuid4().hex[:10].upper()}",
                        SoTaiKhoan=stk,
                        TenNganHang=bank,
                        TenChuTaiKhoan=owner,
                        ThoiGianThanhToan=now,
                        TrangThai="ThanhCong",
                        GhiChu=f"Nhà xe hủy chuyến, hoàn tức thì {ty_le}% về TK {bank} - {stk}",
                    )
                )

                db.add(
                    LichSuVe(
                        MaDatVe=od.MaDatVe,
                        MaTK=current_user.MaTK,
                        HanhDong="NhaXeHuyChuyenBoiThuongOnline",
                        LyDo=req.ly_do,
                        GhiChu=f"Hoàn tức thì {ty_le}%: {tien_hoan:,.0f} đ về TK {bank} - {stk}",
                    )
                )

        elif od.TrangThai == "ChoThanhToan":
            od.TrangThai = "DaHuy"
            so_don_da_huy += 1

    db.commit()

    return KetQuaHuyChuyenResponse(
        ma_chuyen=trip.MaChuyen,
        trang_thai="HuyChuyen",
        so_don_da_huy=so_don_da_huy,
        so_ve_da_huy=so_ve_da_huy,
        so_don_online_hoan_ngay=so_don_online_hoan_ngay,
        so_don_quay_cho_nhan_tien_mat=so_don_quay_cho_nhan_tien_mat,
        so_sms_da_gui=so_sms_da_gui,
        ty_le_hoan_tien_ap_dung=ty_le,
        tong_tien_hoan_thuc_te=tong_tien_hoan,
        thong_diep=(
            f"Hủy chuyến #{ma_chuyen} thành công! Đã xử lý {so_don_da_huy} đơn ({so_ve_da_huy} vé). "
            f"Hoàn tiền online tức thì: {so_don_online_hoan_ngay} đơn; "
            f"Chờ nhận tiền mặt tại quầy: {so_don_quay_cho_nhan_tien_mat} đơn (đã gửi {so_sms_da_gui} tin nhắn SMS)."
        ),
        danh_sach_sms=danh_sach_sms_da_gui,
    )


@router.post(
    "/chuyen-xe/{ma_chuyen}/xac-nhan-hoan-thanh",
    response_model=XacNhanHoanThanhResponse,
    summary="Xác nhận chuyến xe đã cập bến an toàn (Hoàn thành)",
)
def confirm_complete_trip(
    ma_chuyen: int,
    ghi_chu: str | None = None,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Admin / Điều hành bến bấm xác nhận khi xe đã về bến đỗ an toàn và trả khách xong.
    Ràng buộc cứng: Chỉ cho phép xác nhận khi chuyến đang ở trạng thái 'DangChay'.
    Nếu chuyến chưa chạy (DangBan, SapKhoiHanh), trả về 400 Bad Request cảnh báo:
    'Chuyến xe chưa khởi hành lăn bánh, không thể xác nhận hoàn thành!'
    """
    trip = db.query(ChuyenXe).filter(ChuyenXe.MaChuyen == ma_chuyen).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")

    if trip.TrangThai == "HoanThanh":
        return XacNhanHoanThanhResponse(
            status="success",
            message=f"Chuyến xe #{ma_chuyen} đã ở trạng thái Hoàn thành trước đó.",
            ma_chuyen=ma_chuyen,
            trang_thai=trip.TrangThai,
        )

    if trip.TrangThai in ["DangBan", "SapKhoiHanh"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chuyến xe chưa khởi hành lăn bánh, không thể xác nhận hoàn thành!",
        )

    if trip.TrangThai != "DangChay":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xác nhận hoàn thành cho chuyến xe ở trạng thái '{trip.TrangThai}'!",
        )

    trip.TrangThai = "HoanThanh"
    if ghi_chu:
        trip.GhiChu = ghi_chu

    db.commit()
    return XacNhanHoanThanhResponse(
        status="success",
        message=f"Xác nhận chuyến xe #{ma_chuyen} đã hoàn thành hành trình và về bến an toàn.",
        ma_chuyen=ma_chuyen,
        trang_thai=trip.TrangThai,
    )


@router.put(
    "/chuyen-xe/{ma_chuyen}/trang-thai",
    response_model=dict,
    summary="Cập nhật trạng thái chuyến xe",
)
def update_trip_status(
    ma_chuyen: int,
    req: CapNhatTrangThaiChuyenRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Cập nhật trạng thái chuyến xe: DangBan, SapKhoiHanh, DangChay, HoanThanh, HuyChuyen."""
    trip = db.query(ChuyenXe).filter(ChuyenXe.MaChuyen == ma_chuyen).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Không tìm thấy chuyến xe")

    # Kiểm tra luật hủy chuyến
    if req.trang_thai == "HuyChuyen":
        if trip.TrangThai == "HoanThanh":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chuyến xe đã kết thúc hành trình, không thể hủy!",
            )
        if trip.TrangThai == "DangChay":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Xe đang chở khách lăn bánh trên đường, không thể hủy chuyến!",
            )

    trip.TrangThai = req.trang_thai
    if req.ghi_chu:
        trip.GhiChu = req.ghi_chu

    db.commit()
    return {
        "status": "success",
        "message": f"Cập nhật trạng thái chuyến #{ma_chuyen} thành '{req.trang_thai}'",
        "ma_chuyen": ma_chuyen,
        "trang_thai": trip.TrangThai,
    }


@router.get(
    "/khuyen-mai",
    response_model=list[KhuyenMaiAdminItemResponse],
    summary="Danh sách voucher khuyến mãi quản trị kèm thống kê",
)
def get_admin_promotions(
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Lấy danh sách tất cả voucher khuyến mãi, sắp xếp theo mã giảm mới nhất.
    Kèm thống kê số lần sử dụng thực tế (DatVe có MaKM và TrangThai='DaThanhToan').
    """
    now = datetime.now()
    promotions = db.query(KhuyenMai).order_by(KhuyenMai.MaKM.desc()).all()

    # Thống kê số lần sử dụng: gom nhóm đếm vé đã thanh toán
    usage_counts = dict(
        db.query(DatVe.MaKM, func.count(DatVe.MaDatVe))
        .filter(DatVe.MaKM.isnot(None), DatVe.TrangThai == "DaThanhToan")
        .group_by(DatVe.MaKM)
        .all()
    )

    results: list[KhuyenMaiAdminItemResponse] = []
    for km in promotions:
        con_hieu_luc = (
            km.TrangThai == "HoatDong"
            and km.NgayBatDau <= now <= km.NgayKetThuc
        )
        so_lan = usage_counts.get(km.MaKM, 0)
        results.append(
            KhuyenMaiAdminItemResponse(
                ma_km=km.MaKM,
                ten_km=km.TenKM,
                ma_code=km.MaCode,
                loai_giam=km.LoaiGiam,
                gia_tri_giam=km.GiaTriGiam,
                gia_tri_giam_toi_da=km.GiaTriGiamToiDa,
                don_toi_thieu=km.DonToiThieu,
                ngay_bat_dau=km.NgayBatDau,
                ngay_ket_thuc=km.NgayKetThuc,
                trang_thai=km.TrangThai,
                mo_ta=km.MoTa,
                so_lan_su_dung=so_lan,
                con_hieu_luc=con_hieu_luc,
            )
        )
    return results



@router.post(
    "/khuyen-mai",
    response_model=KhuyenMaiAdminItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo mới mã khuyến mãi",
)
def create_promotion(
    req: TaoKhuyenMaiAdminRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Admin tạo mã voucher khuyến mãi mới với validation chuẩn mực."""
    code = req.ma_code.strip().upper()
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã khuyến mãi không được để trống",
        )

    if req.loai_giam not in ["PhanTram", "TienMat"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Loại giảm giá không hợp lệ (chỉ chấp nhận 'PhanTram' hoặc 'TienMat')",
        )

    if req.ngay_ket_thuc <= req.ngay_bat_dau:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày kết thúc phải sau ngày bắt đầu",
        )

    if req.loai_giam == "PhanTram" and not (1 <= req.gia_tri_giam <= 100):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giá trị giảm theo phần trăm phải từ 1% đến 100%",
        )

    if req.gia_tri_giam <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giá trị giảm phải lớn hơn 0",
        )

    if req.don_toi_thieu < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn tối thiểu phải lớn hơn hoặc bằng 0",
        )

    existed = db.query(KhuyenMai).filter(KhuyenMai.MaCode == code).first()
    if existed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã khuyến mãi '{code}' đã tồn tại trên hệ thống",
        )

    km = KhuyenMai(
        TenKM=req.ten_km.strip(),
        MaCode=code,
        LoaiGiam=req.loai_giam,
        GiaTriGiam=req.gia_tri_giam,
        GiaTriGiamToiDa=req.gia_tri_giam_toi_da,
        DonToiThieu=req.don_toi_thieu,
        NgayBatDau=req.ngay_bat_dau,
        NgayKetThuc=req.ngay_ket_thuc,
        TrangThai="HoatDong",
        MoTa=req.mo_ta,
    )
    db.add(km)
    db.commit()
    db.refresh(km)

    now = datetime.now()
    con_hieu_luc = (
        km.TrangThai == "HoatDong"
        and km.NgayBatDau <= now <= km.NgayKetThuc
    )

    return KhuyenMaiAdminItemResponse(
        ma_km=km.MaKM,
        ten_km=km.TenKM,
        ma_code=km.MaCode,
        loai_giam=km.LoaiGiam,
        gia_tri_giam=km.GiaTriGiam,
        gia_tri_giam_toi_da=km.GiaTriGiamToiDa,
        don_toi_thieu=km.DonToiThieu,
        ngay_bat_dau=km.NgayBatDau,
        ngay_ket_thuc=km.NgayKetThuc,
        trang_thai=km.TrangThai,
        mo_ta=km.MoTa,
        so_lan_su_dung=0,
        con_hieu_luc=con_hieu_luc,
    )


@router.put(
    "/khuyen-mai/{ma_km}/trang-thai",
    response_model=KhuyenMaiAdminItemResponse,
    summary="Bật / Tắt kích hoạt voucher khuyến mãi",
)
def update_promotion_status(
    ma_km: int,
    req: CapNhatTrangThaiKhuyenMaiRequest | None = None,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Bật / Tắt kích hoạt voucher (HoatDong <-> TamDung).

    QUY TẮC BẢO TOÀN LỊCH SỬ KẾ TOÁN:
    KHÔNG xóa cứng voucher để không phá vỡ liên kết dữ liệu tài chính lịch sử trong DatVe.
    Thay vào đó, chuyển trạng thái sang 'TamDung' để ngừng áp dụng.
    """
    km = db.query(KhuyenMai).filter(KhuyenMai.MaKM == ma_km).first()
    if not km:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy mã khuyến mãi #{ma_km}",
        )

    if req and req.trang_thai:
        if req.trang_thai not in ["HoatDong", "TamDung"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trạng thái chỉ có thể là 'HoatDong' hoặc 'TamDung'",
            )
        km.TrangThai = req.trang_thai
    else:
        km.TrangThai = "TamDung" if km.TrangThai == "HoatDong" else "HoatDong"

    db.commit()
    db.refresh(km)

    now = datetime.now()
    con_hieu_luc = (
        km.TrangThai == "HoatDong"
        and km.NgayBatDau <= now <= km.NgayKetThuc
    )
    so_lan = (
        db.query(func.count(DatVe.MaDatVe))
        .filter(DatVe.MaKM == km.MaKM, DatVe.TrangThai == "DaThanhToan")
        .scalar()
        or 0
    )

    return KhuyenMaiAdminItemResponse(
        ma_km=km.MaKM,
        ten_km=km.TenKM,
        ma_code=km.MaCode,
        loai_giam=km.LoaiGiam,
        gia_tri_giam=km.GiaTriGiam,
        gia_tri_giam_toi_da=km.GiaTriGiamToiDa,
        don_toi_thieu=km.DonToiThieu,
        ngay_bat_dau=km.NgayBatDau,
        ngay_ket_thuc=km.NgayKetThuc,
        trang_thai=km.TrangThai,
        mo_ta=km.MoTa,
        so_lan_su_dung=so_lan,
        con_hieu_luc=con_hieu_luc,
    )


# ==================== CHỨC NĂNG 9: QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN RBAC (UC21, UC22) ====================

@router.get(
    "/tai-khoan",
    response_model=list[TaiKhoanAdminItemResponse],
    summary="Danh sách tài khoản người dùng & phân quyền RBAC (Admin)",
)
def get_user_accounts(
    vai_tro: str | None = Query(None, description="Lọc theo vai trò: 'QuanTri', 'NhanVienBanVe', 'KhachHang'"),
    trang_thai: str | None = Query(None, description="Lọc theo trạng thái: 'HoatDong', 'Khoa'"),
    q: str | None = Query(None, description="Tìm kiếm theo tên đăng nhập, số điện thoại hoặc họ tên"),
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách tất cả tài khoản người dùng trên hệ thống kèm thông tin vai trò, họ tên, SĐT, chức vụ.
    Hỗ trợ tìm kiếm theo từ khóa và lọc theo vai trò, trạng thái.
    """
    query = (
        db.query(TaiKhoan)
        .options(
            joinedload(TaiKhoan.vai_tro),
            joinedload(TaiKhoan.khach_hang),
            joinedload(TaiKhoan.nhan_vien),
        )
        .outerjoin(VaiTro, TaiKhoan.MaVaiTro == VaiTro.MaVaiTro)
        .outerjoin(KhachHang, TaiKhoan.MaTK == KhachHang.MaTK)
        .outerjoin(NhanVien, TaiKhoan.MaTK == NhanVien.MaTK)
    )

    if vai_tro:
        query = query.filter(VaiTro.TenVaiTro == vai_tro.strip())

    if trang_thai:
        query = query.filter(TaiKhoan.TrangThai == trang_thai.strip())

    if q:
        kw = f"%{q.strip()}%"
        query = query.filter(
            or_(
                TaiKhoan.TenDangNhap.ilike(kw),
                KhachHang.HoTen.ilike(kw),
                NhanVien.HoTen.ilike(kw),
                KhachHang.SDT.ilike(kw),
                NhanVien.SDT.ilike(kw),
            )
        )

    users = query.order_by(TaiKhoan.MaTK.desc()).all()

    results: list[TaiKhoanAdminItemResponse] = []
    for u in users:
        ho_ten = u.nhan_vien.HoTen if u.nhan_vien else (u.khach_hang.HoTen if u.khach_hang else None)
        sdt = u.nhan_vien.SDT if u.nhan_vien else (u.khach_hang.SDT if u.khach_hang else None)
        chuc_vu = u.nhan_vien.ChucVu if u.nhan_vien else None
        ten_vai_tro = u.vai_tro.TenVaiTro if u.vai_tro else ""

        results.append(
            TaiKhoanAdminItemResponse(
                ma_tk=u.MaTK,
                ten_dang_nhap=u.TenDangNhap,
                vai_tro=ten_vai_tro,
                trang_thai=u.TrangThai,
                ngay_tao=u.NgayTao,
                ho_ten=ho_ten,
                sdt=sdt,
                chuc_vu=chuc_vu,
            )
        )

    return results


@router.post(
    "/nhan-vien",
    response_model=TaiKhoanAdminItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Thêm mới tài khoản nhân viên bán vé (Admin)",
)
def create_staff_account(
    req: TaoNhanVienRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """
    Tạo mới tài khoản nhân viên bán vé quầy POS:
    - Băm mật khẩu an toàn bằng Argon2 (get_password_hash).
    - Gán vai trò NhanVienBanVe.
    - Tạo đồng thời bản ghi trong TaiKhoan và NhanVien.
    - Kiểm tra tính duy nhất của tên đăng nhập và số điện thoại.
    """
    username = req.ten_dang_nhap.strip()
    phone = req.sdt.strip()

    # Kiểm tra trùng tên đăng nhập
    existed_user = db.query(TaiKhoan).filter(TaiKhoan.TenDangNhap == username).first()
    if existed_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tên đăng nhập đã tồn tại trên hệ thống",
        )

    # Kiểm tra trùng số điện thoại (trong NhanVien hoặc KhachHang)
    existed_nv_phone = db.query(NhanVien).filter(NhanVien.SDT == phone).first()
    existed_kh_phone = db.query(KhachHang).filter(KhachHang.SDT == phone).first()
    if existed_nv_phone or existed_kh_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số điện thoại đã được đăng ký trên hệ thống",
        )

    # Tìm vai trò NhanVienBanVe
    role_nv = db.query(VaiTro).filter(VaiTro.TenVaiTro == "NhanVienBanVe").first()
    if not role_nv:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không tìm thấy vai trò NhanVienBanVe trong hệ thống",
        )

    # Tạo tài khoản
    new_tk = TaiKhoan(
        MaVaiTro=role_nv.MaVaiTro,
        TenDangNhap=username,
        MatKhau=get_password_hash(req.mat_khau),
        TrangThai="HoatDong",
    )
    db.add(new_tk)
    db.flush()

    # Tạo nhân viên
    chuc_vu = req.chuc_vu.strip() if req.chuc_vu else "NhanVienBanVe"
    new_nv = NhanVien(
        MaTK=new_tk.MaTK,
        HoTen=req.ho_ten.strip(),
        SDT=phone,
        ChucVu=chuc_vu,
        NgayVaoLam=date.today(),
    )
    db.add(new_nv)
    db.commit()
    db.refresh(new_tk)

    return TaiKhoanAdminItemResponse(
        ma_tk=new_tk.MaTK,
        ten_dang_nhap=new_tk.TenDangNhap,
        vai_tro="NhanVienBanVe",
        trang_thai=new_tk.TrangThai,
        ngay_tao=new_tk.NgayTao,
        ho_ten=new_nv.HoTen,
        sdt=new_nv.SDT,
        chuc_vu=new_nv.ChucVu,
    )


@router.put(
    "/tai-khoan/{ma_tk}/trang-thai",
    response_model=TaiKhoanAdminItemResponse,
    summary="Khóa hoặc mở khóa tài khoản người dùng (Admin)",
)
def update_user_status(
    ma_tk: int,
    req: CapNhatTrangThaiTaiKhoanRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """
    Cập nhật trạng thái tài khoản ('HoatDong' <-> 'Khoa').
    RÀNG BUỘC BẢO MẬT CỨNG: Admin KHÔNG ĐƯỢC PHÉP tự khóa tài khoản của chính mình (ma_tk == current_user.MaTK).
    """
    tk = (
        db.query(TaiKhoan)
        .options(
            joinedload(TaiKhoan.vai_tro),
            joinedload(TaiKhoan.khach_hang),
            joinedload(TaiKhoan.nhan_vien),
        )
        .filter(TaiKhoan.MaTK == ma_tk)
        .first()
    )
    if not tk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản người dùng",
        )

    # Xác định trạng thái đích
    if req.trang_thai:
        if req.trang_thai not in ["HoatDong", "Khoa"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trạng thái chỉ có thể là 'HoatDong' hoặc 'Khoa'",
            )
        new_status = req.trang_thai
    else:
        new_status = "Khoa" if tk.TrangThai == "HoatDong" else "HoatDong"

    # Ràng buộc bảo mật cứng: Admin không được phép tự khóa tài khoản của chính mình
    if ma_tk == current_user.MaTK and new_status == "Khoa":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bạn không thể tự khóa tài khoản quản trị của chính mình!",
        )

    tk.TrangThai = new_status
    db.commit()
    db.refresh(tk)

    ho_ten = tk.nhan_vien.HoTen if tk.nhan_vien else (tk.khach_hang.HoTen if tk.khach_hang else None)
    sdt = tk.nhan_vien.SDT if tk.nhan_vien else (tk.khach_hang.SDT if tk.khach_hang else None)
    chuc_vu = tk.nhan_vien.ChucVu if tk.nhan_vien else None
    ten_vai_tro = tk.vai_tro.TenVaiTro if tk.vai_tro else ""

    return TaiKhoanAdminItemResponse(
        ma_tk=tk.MaTK,
        ten_dang_nhap=tk.TenDangNhap,
        vai_tro=ten_vai_tro,
        trang_thai=tk.TrangThai,
        ngay_tao=tk.NgayTao,
        ho_ten=ho_ten,
        sdt=sdt,
        chuc_vu=chuc_vu,
    )


@router.get(
    "/tai-khoan/{ma_tk}/nhat-ky",
    response_model=list[LichSuThaoTacResponse],
    summary="Lấy nhật ký thao tác (Audit Log) của tài khoản (Admin)",
)
def get_user_audit_logs(
    ma_tk: int,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """
    Truy vấn lịch sử thao tác của tài khoản từ bảng LichSuVe, sắp xếp theo thời gian mới nhất.
    """
    tk = db.query(TaiKhoan).filter(TaiKhoan.MaTK == ma_tk).first()
    if not tk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản người dùng",
        )

    logs = (
        db.query(LichSuVe)
        .filter(LichSuVe.MaTK == ma_tk)
        .order_by(LichSuVe.ThoiGian.desc())
        .all()
    )

    return [
        LichSuThaoTacResponse(
            ma_lich_su=log.MaLichSu,
            ma_dat_ve=log.MaDatVe,
            hanh_dong=log.HanhDong,
            thoi_gian=log.ThoiGian,
            ly_do=log.LyDo,
            ghi_chu=log.GhiChu,
        )
        for log in logs
    ]

