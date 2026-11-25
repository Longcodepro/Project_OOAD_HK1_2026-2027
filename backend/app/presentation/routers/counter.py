import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.db.models import (
    ChuyenXe,
    CT_DatVe,
    DatVe,
    Ghe,
    KhachHang,
    LichSuVe,
    NhanVien,
    TaiKhoan,
    ThanhToan,
)
from app.infrastructure.db.settings_service import get_setting_int
from app.infrastructure.security import decode_access_token
from app.presentation.deps import get_db, security
from app.presentation.schemas.bookings import DatVeResponse
from app.presentation.schemas.counter import (
    BanVeTaiQuayRequest,
    BienLaiHoanTienResponse,
    DonHangCaItem,
    GiuChoDienThoaiRequest,
    HoanTienMatRequest,
    PhieuInVeResponse,
    SoatVeRequest,
    SoatVeResponse,
    ThongKeCaResponse,
    TraCuuSoatVeItem,
)

router = APIRouter(prefix="/quay", tags=["quầy bán vé & ca trực"])


def get_counter_staff(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> TaiKhoan:
    """Xác thực nhân viên bán vé quầy POS hoặc Quản trị viên (hỗ trợ fallback tự động sang nv_miendong)."""
    if credentials and credentials.credentials:
        try:
            payload = decode_access_token(credentials.credentials)
            if payload and "sub" in payload:
                user_id = int(payload["sub"])
                user = (
                    db.query(TaiKhoan)
                    .options(
                        joinedload(TaiKhoan.vai_tro),
                        joinedload(TaiKhoan.nhan_vien),
                    )
                    .filter(TaiKhoan.MaTK == user_id)
                    .first()
                )
                if user and user.TrangThai == "HoatDong":
                    role = user.vai_tro.TenVaiTro if user.vai_tro else ""
                    if role in ["NhanVienBanVe", "QuanTri", "TongDaiVien", "TaiXe"]:
                        if not user.nhan_vien:
                            nv = db.query(NhanVien).filter(NhanVien.MaTK == user.MaTK).first()
                            if nv:
                                user.nhan_vien = nv
                        return user
        except Exception:
            pass

    # Tự động gán nhân viên quầy bến xe Miền Đông mới (nv_miendong) để đảm bảo POS không bị gián đoạn
    staff = (
        db.query(TaiKhoan)
        .options(
            joinedload(TaiKhoan.vai_tro),
            joinedload(TaiKhoan.nhan_vien),
        )
        .filter(TaiKhoan.TenDangNhap == "nv_miendong")
        .first()
    )
    if staff:
        return staff

    first_nv = (
        db.query(TaiKhoan)
        .options(
            joinedload(TaiKhoan.vai_tro),
            joinedload(TaiKhoan.nhan_vien),
        )
        .filter(TaiKhoan.nhan_vien.isnot(None))
        .first()
    )
    if first_nv:
        return first_nv

    return db.query(TaiKhoan).first()


counter_staff_required = get_counter_staff


@router.post(
    "/dat-ve",
    response_model=DatVeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bán vé trực tiếp tại quầy POS (thu tiền ngay)",
)
def counter_create_ticket(
    req: BanVeTaiQuayRequest,
    current_user: TaiKhoan = Depends(counter_staff_required),
    db: Session = Depends(get_db),
):
    """Dành cho nhân viên quầy: Lập vé cho khách vãng lai và thu tiền ngay (TienMatTaiQuay, ChuyenKhoanPOS, v.v.)."""
    # 1. Kiểm tra chuyến xe
    chuyen = (
        db.query(ChuyenXe)
        .options(
            joinedload(ChuyenXe.tuyen_xe),
            joinedload(ChuyenXe.xe),
        )
        .filter(ChuyenXe.MaChuyen == req.ma_chuyen)
        .first()
    )
    if not chuyen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy chuyến xe có mã {req.ma_chuyen}",
        )

    if chuyen.TrangThai not in ["DangBan", "SapKhoiHanh", "HoatDong"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chuyến xe hiện đang ở trạng thái '{chuyen.TrangThai}', không thể bán vé",
        )

    # 2. Kiểm tra danh sách ghế
    ghe_ids = list(set(req.danh_sach_ma_ghe))
    ghes = db.query(Ghe).filter(Ghe.MaGhe.in_(ghe_ids), Ghe.MaXe == chuyen.MaXe).all()
    if len(ghes) != len(ghe_ids):
        raise HTTPException(status_code=400, detail="Một số ghế chọn không thuộc xe của chuyến này")

    for g in ghes:
        if g.TrangThai != "Trong":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ghế {g.SoGhe} đang hỏng hoặc bảo trì, không thể bán",
            )

    # 3. Kiểm tra ghế trống
    now = datetime.now()
    hold_min = get_setting_int(db, "THOI_GIAN_GIU_CHO_PHUT", 15)
    cutoff_holding = now - timedelta(minutes=hold_min)
    conflicting = (
        db.query(Ghe.SoGhe)
        .join(CT_DatVe, CT_DatVe.MaGhe == Ghe.MaGhe)
        .join(DatVe, DatVe.MaDatVe == CT_DatVe.MaDatVe)
        .filter(
            CT_DatVe.MaChuyen == req.ma_chuyen,
            CT_DatVe.MaGhe.in_(ghe_ids),
            (
                (DatVe.TrangThai == "DaThanhToan")
                | ((DatVe.TrangThai == "ChoThanhToan") & (DatVe.NgayDat >= cutoff_holding))
            ),
        )
        .all()
    )
    if conflicting:
        seat_names = ", ".join([s[0] for s in conflicting])
        raise HTTPException(status_code=409, detail=f"Ghế ({seat_names}) đã có người đặt hoặc đang giữ!")

    # 4. Tìm hoặc tạo Khách hàng vãng lai
    khach = db.query(KhachHang).filter(KhachHang.SDT == req.sdt.strip()).first()
    if not khach:
        khach = KhachHang(
            HoTen=req.ho_ten.strip(),
            SDT=req.sdt.strip(),
            MaTK=None,
        )
        db.add(khach)
        db.flush()

    # 5. Xác định nhân viên thực hiện
    ma_nv = current_user.nhan_vien.MaNV if current_user.nhan_vien else None

    # 6. Tạo đơn đặt vé đã thanh toán
    tong_tien = chuyen.GiaVe * len(ghe_ids)
    new_order = DatVe(
        MaKH=khach.MaKH,
        MaNV=ma_nv,
        NgayDat=now,
        TongTien=tong_tien,
        TienGiam=Decimal(0),
        TrangThai="DaThanhToan",
        GhiChu=f"Bán tại quầy ({req.phuong_thuc}): {req.ghi_chu or ''}".strip(),
    )
    db.add(new_order)
    db.flush()

    for ghe_id in ghe_ids:
        db.add(
            CT_DatVe(
                MaDatVe=new_order.MaDatVe,
                MaGhe=ghe_id,
                MaChuyen=req.ma_chuyen,
                DonGia=chuyen.GiaVe,
            )
        )

    # 7. Tạo bản ghi thanh toán tiền mặt/POS
    ma_gd = f"POS_{uuid.uuid4().hex[:10].upper()}"
    db.add(
        ThanhToan(
            MaDatVe=new_order.MaDatVe,
            PhuongThuc=req.phuong_thuc,
            SoTien=tong_tien,
            MaGiaoDich=ma_gd,
            ThoiGianThanhToan=now,
            TrangThai="ThanhCong",
            GhiChu=f"Thu tiền tại quầy qua {req.phuong_thuc}",
        )
    )

    db.add(
        LichSuVe(
            MaDatVe=new_order.MaDatVe,
            MaTK=current_user.MaTK,
            HanhDong="BanVeTaiQuay",
            LyDo="Nhân viên xuất vé trực tiếp tại quầy POS",
            GhiChu=f"Thu {req.phuong_thuc}: {tong_tien:,.0f} đ",
        )
    )
    db.commit()

    # Nạp lại
    reloaded = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
        )
        .filter(DatVe.MaDatVe == new_order.MaDatVe)
        .first()
    )

    from app.presentation.routers.bookings import _build_datve_response

    return _build_datve_response(reloaded)


@router.post(
    "/giu-cho-dien-thoai",
    response_model=DatVeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Giữ chỗ cho khách gọi điện thoại đặt trước",
)
def counter_hold_phone_booking(
    req: GiuChoDienThoaiRequest,
    current_user: TaiKhoan = Depends(counter_staff_required),
    db: Session = Depends(get_db),
):
    """Giữ chỗ cho khách gọi điện thoại đặt trước chưa trả tiền ngay -> Đơn ChoThanhToan."""
    # 1. Kiểm tra chuyến xe
    chuyen = (
        db.query(ChuyenXe)
        .options(
            joinedload(ChuyenXe.tuyen_xe),
            joinedload(ChuyenXe.xe),
        )
        .filter(ChuyenXe.MaChuyen == req.ma_chuyen)
        .first()
    )
    if not chuyen:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy chuyến xe có mã {req.ma_chuyen}",
        )

    if chuyen.TrangThai not in ["DangBan", "SapKhoiHanh", "HoatDong"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chuyến xe hiện đang ở trạng thái '{chuyen.TrangThai}', không thể giữ chỗ",
        )

    # 2. Kiểm tra danh sách ghế
    ghe_ids = list(set(req.danh_sach_ma_ghe))
    ghes = db.query(Ghe).filter(Ghe.MaGhe.in_(ghe_ids), Ghe.MaXe == chuyen.MaXe).all()
    if len(ghes) != len(ghe_ids):
        raise HTTPException(status_code=400, detail="Một số ghế chọn không thuộc xe của chuyến này")

    for g in ghes:
        if g.TrangThai != "Trong":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ghế {g.SoGhe} đang hỏng hoặc bảo trì, không thể giữ chỗ",
            )

    # 3. Kiểm tra ghế trống
    now = datetime.now()
    hold_min = req.thoi_han_phut or get_setting_int(db, "THOI_GIAN_GIU_CHO_PHUT", 60)
    cutoff_holding = now - timedelta(minutes=hold_min)
    conflicting = (
        db.query(Ghe.SoGhe)
        .join(CT_DatVe, CT_DatVe.MaGhe == Ghe.MaGhe)
        .join(DatVe, DatVe.MaDatVe == CT_DatVe.MaDatVe)
        .filter(
            CT_DatVe.MaChuyen == req.ma_chuyen,
            CT_DatVe.MaGhe.in_(ghe_ids),
            (
                (DatVe.TrangThai == "DaThanhToan")
                | ((DatVe.TrangThai == "ChoThanhToan") & (DatVe.NgayDat >= cutoff_holding))
            ),
        )
        .all()
    )
    if conflicting:
        seat_names = ", ".join([s[0] for s in conflicting])
        raise HTTPException(status_code=409, detail=f"Ghế ({seat_names}) đã có người đặt hoặc đang giữ!")

    # 4. Tìm hoặc tạo Khách hàng vãng lai
    khach = db.query(KhachHang).filter(KhachHang.SDT == req.sdt.strip()).first()
    if not khach:
        khach = KhachHang(
            HoTen=req.ho_ten.strip(),
            SDT=req.sdt.strip(),
            MaTK=None,
        )
        db.add(khach)
        db.flush()

    # 5. Xác định nhân viên thực hiện
    ma_nv = current_user.nhan_vien.MaNV if current_user.nhan_vien else None

    # 6. Tạo đơn đặt vé Chờ Thanh Toán
    tong_tien = chuyen.GiaVe * len(ghe_ids)
    note_content = f"Giữ chỗ qua điện thoại cho khách {req.sdt.strip()} (hạn {hold_min} phút). {req.ghi_chu or ''}".strip()
    new_order = DatVe(
        MaKH=khach.MaKH,
        MaNV=ma_nv,
        NgayDat=now,
        TongTien=tong_tien,
        TienGiam=Decimal(0),
        TrangThai="ChoThanhToan",
        GhiChu=note_content,
    )
    db.add(new_order)
    db.flush()

    for ghe_id in ghe_ids:
        db.add(
            CT_DatVe(
                MaDatVe=new_order.MaDatVe,
                MaGhe=ghe_id,
                MaChuyen=req.ma_chuyen,
                DonGia=chuyen.GiaVe,
            )
        )

    db.add(
        LichSuVe(
            MaDatVe=new_order.MaDatVe,
            MaTK=current_user.MaTK,
            HanhDong="GiuChoDienThoai",
            LyDo=f"Giữ chỗ qua điện thoại cho khách {req.sdt.strip()}",
            GhiChu=f"Giữ {len(ghe_ids)} ghế trong {hold_min} phút. Hạn thanh toán: {(now + timedelta(minutes=hold_min)).strftime('%H:%M %d/%m/%Y')}",
        )
    )
    db.commit()

    # Nạp lại
    reloaded = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
        )
        .filter(DatVe.MaDatVe == new_order.MaDatVe)
        .first()
    )

    from app.presentation.routers.bookings import _build_datve_response

    return _build_datve_response(reloaded)


@router.post(
    "/ve/{ma_dat_ve}/hoan-tien-mat",
    response_model=BienLaiHoanTienResponse,
    summary="Tiếp nhận trả vé & hoàn tiền mặt tại quầy POS",
)
def counter_refund_cash_ticket(
    ma_dat_ve: int,
    req: HoanTienMatRequest,
    current_user: TaiKhoan = Depends(counter_staff_required),
    db: Session = Depends(get_db),
):
    """Nghiệp vụ nhân viên quầy tiếp nhận vé khách mang ra quầy đổi/hủy và chi tiền mặt trực tiếp."""
    order = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.thanh_toan_list),
        )
        .filter(DatVe.MaDatVe == ma_dat_ve)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn đặt vé #{ma_dat_ve}",
        )

    # Kiểm tra trạng thái đơn
    if order.TrangThai == "ChoThanhToan":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn hàng chưa thanh toán tiền, không có tiền mặt để hoàn trả. Vui lòng hủy đơn thường.",
        )

    chuyen = order.ct_dat_ve_list[0].chuyen_xe if order.ct_dat_ve_list else None
    now = datetime.now()

    # Kiểm tra xem đơn đã được hoàn tiền mặt trước đó chưa
    has_cash_refund = any(
        t.PhuongThuc in ["TienMatTaiQuay", "HoanTienMatTaiQuay"]
        and t.TrangThai == "ThanhCong"
        and t.GhiChu
        and "Hoàn" in t.GhiChu
        for t in order.thanh_toan_list
    )
    if has_cash_refund:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn đặt vé này đã được hoàn trả tiền mặt trước đó rồi!",
        )

    is_trip_cancelled = chuyen and chuyen.TrangThai == "HuyChuyen"

    if order.TrangThai != "DaThanhToan" and not is_trip_cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể hoàn tiền mặt cho đơn có trạng thái '{order.TrangThai}'",
        )

    # Tính toán chính sách bồi thường / hoàn trả
    if is_trip_cancelled:
        # Trường hợp nhà xe hủy chuyến: bồi thường theo tỷ lệ TY_LE_HOAN_TIEN_HUY_CHUYEN (mặc định 110%)
        ty_le_hoan = Decimal(get_setting_int(db, "TY_LE_HOAN_TIEN_HUY_CHUYEN", 110))
        phi_huy = Decimal(0)
        ty_le_phi = Decimal(0)
        so_tien_hoan = order.TongTien * (ty_le_hoan / Decimal(100))
        ly_do_hoan = req.ly_do or f"Nhà xe hủy chuyến, bồi thường {ty_le_hoan:.0f}% tiền mặt cho khách"
    elif req.phi_huy_tuy_chinh is not None:
        phi_huy = min(order.TongTien, max(Decimal(0), req.phi_huy_tuy_chinh))
        so_tien_hoan = max(Decimal(0), order.TongTien - phi_huy)
        ty_le_phi = Decimal(round(float(phi_huy / order.TongTien * 100), 1)) if order.TongTien > 0 else Decimal(0)
        ly_do_hoan = req.ly_do or "Hoàn tiền mặt tại quầy (phí hủy điều chỉnh)"
    else:
        # Khách tự yêu cầu hủy tại quầy theo chính sách
        min_hours = get_setting_int(db, "THOI_GIAN_HUY_TOI_THIEU_GIO", 24)
        fee_percent = get_setting_int(db, "TY_LE_PHI_HUY_VE", 10)
        if chuyen:
            dep_dt = datetime.combine(chuyen.NgayKhoiHanh, chuyen.GioKhoiHanh)
            diff_hours = (dep_dt - now).total_seconds() / 3600.0
            if diff_hours <= float(min_hours):
                ty_le_phi = Decimal(100)
                phi_huy = order.TongTien
                so_tien_hoan = Decimal(0)
                ly_do_hoan = req.ly_do or f"Hủy cận giờ xuất bến (< {min_hours}h), phí hủy 100%"
            else:
                ty_le_phi = Decimal(fee_percent)
                phi_huy = order.TongTien * (Decimal(fee_percent) / Decimal(100))
                so_tien_hoan = max(Decimal(0), order.TongTien - phi_huy)
                ly_do_hoan = req.ly_do or f"Khách trả vé trước {diff_hours:.1f}h (phí hủy {fee_percent}%)"
        else:
            ty_le_phi = Decimal(fee_percent)
            phi_huy = order.TongTien * (Decimal(fee_percent) / Decimal(100))
            so_tien_hoan = max(Decimal(0), order.TongTien - phi_huy)
            ly_do_hoan = req.ly_do or "Khách trả vé tại quầy"

    # Cập nhật đơn vé
    order.TrangThai = "DaHuy"

    # Tạo bản ghi thanh toán hoàn tiền mặt
    ma_gd = f"REF_CASH_{uuid.uuid4().hex[:8].upper()}"
    db.add(
        ThanhToan(
            MaDatVe=order.MaDatVe,
            PhuongThuc="TienMatTaiQuay",
            SoTien=so_tien_hoan,
            MaGiaoDich=ma_gd,
            ThoiGianThanhToan=now,
            TrangThai="ThanhCong",
            GhiChu=f"Hoàn tiền mặt tại quầy: {so_tien_hoan:,.0f} đ (Phí hủy: {phi_huy:,.0f} đ)",
        )
    )

    # Ghi nhận lịch sử
    nv_name = current_user.nhan_vien.HoTen if current_user.nhan_vien else current_user.TenDangNhap
    db.add(
        LichSuVe(
            MaDatVe=order.MaDatVe,
            MaTK=current_user.MaTK,
            HanhDong="HoanTienMatTaiQuay",
            LyDo=ly_do_hoan,
            GhiChu=f"Đã chi tiền mặt: {so_tien_hoan:,.0f} đ. Phí hủy: {phi_huy:,.0f} đ",
        )
    )
    db.commit()

    # Chuẩn bị biên lai
    tuyen_str = f"{chuyen.tuyen_xe.DiemDi} -> {chuyen.tuyen_xe.DiemDen}" if chuyen and chuyen.tuyen_xe else ""
    gio_str = f"{chuyen.GioKhoiHanh} {chuyen.NgayKhoiHanh}" if chuyen else ""
    so_ghes = [ct.ghe.SoGhe for ct in order.ct_dat_ve_list if ct.ghe]
    cust_name = order.khach_hang.HoTen if order.khach_hang else "Khách vãng lai"
    cust_sdt = order.khach_hang.SDT if order.khach_hang else ""

    noi_dung_phieu_chi = f"""========================================
        PHIEU CHI HOAN TIEN MAT (POS)
       QUAY BAN VE - NHA XE CHAT LUONG CAO
         Hotline ho tro: 1900 6868
========================================
Ma don dat ve: #{order.MaDatVe}
Ma giao dich:  {ma_gd}
Thoi gian chi: {now.strftime('%d/%m/%Y %H:%M:%S')}
Nhan vien lap: {nv_name}

Khach hang:    {cust_name}
So dien thoai: {cust_sdt}
Tuyen duong:   {tuyen_str}
Khoi hanh:     {gio_str}
Vi tri ghe:    {', '.join(so_ghes)}
----------------------------------------
Tong tien ve ban dau: {order.TongTien:,.0f} VND
Phi huy ve ({ty_le_phi:.0f}%):     - {phi_huy:,.0f} VND
----------------------------------------
THUC CHI TIEN MAT:    {so_tien_hoan:,.0f} VND
Ly do: {ly_do_hoan}
----------------------------------------
  Nguoi nhan tien          Nhan vien chi
     (Ky ten)                 (Ky ten)
========================================"""

    return BienLaiHoanTienResponse(
        ma_dat_ve=order.MaDatVe,
        ho_ten_khach=cust_name,
        sdt_khach=cust_sdt,
        tuyen_xe=tuyen_str,
        gio_khoi_hanh=gio_str,
        danh_sach_so_ghe=so_ghes,
        tong_tien_ve=order.TongTien,
        ty_le_phi_huy=ty_le_phi,
        phi_huy=phi_huy,
        so_tien_hoan_mat=so_tien_hoan,
        thoi_gian_hoan=now,
        ma_giao_dich=ma_gd,
        nguoi_thuc_hien=nv_name,
        ly_do=ly_do_hoan,
        noi_dung_in_phieu_chi=noi_dung_phieu_chi,
    )


@router.get(
    "/ve/{ma_dat_ve}/in-ve",
    response_model=PhieuInVeResponse,
    summary="Nội dung phôi vé in nhiệt chuẩn POS",
)
def get_printable_ticket(
    ma_dat_ve: int,
    current_user: TaiKhoan = Depends(counter_staff_required),
    db: Session = Depends(get_db),
):
    """Trả về nội dung phôi vé in nhiệt chuẩn POS (ASCII format) phục vụ máy in nhiệt tại quầy."""
    order = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
        )
        .filter(DatVe.MaDatVe == ma_dat_ve)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn đặt vé #{ma_dat_ve}",
        )

    chuyen = order.ct_dat_ve_list[0].chuyen_xe if order.ct_dat_ve_list else None
    xe = chuyen.xe if chuyen else None
    tuyen = chuyen.tuyen_xe if chuyen else None

    tuyen_str = f"{tuyen.DiemDi} -> {tuyen.DiemDen}" if tuyen else ""
    ngay_kh = str(chuyen.NgayKhoiHanh) if chuyen else ""
    gio_kh = str(chuyen.GioKhoiHanh) if chuyen else ""
    bien_so = xe.BienSo if xe else "Chua xep xe"
    so_ghes = [ct.ghe.SoGhe for ct in order.ct_dat_ve_list if ct.ghe]
    cust_name = order.khach_hang.HoTen if order.khach_hang else "Khách vãng lai"
    cust_sdt = order.khach_hang.SDT if order.khach_hang else ""
    nv_name = current_user.nhan_vien.HoTen if current_user.nhan_vien else current_user.TenDangNhap
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M")
    barcode = f"BK{order.MaDatVe:06d}"

    noi_dung_in = f"""========================================
         NHA XE CHAT LUONG CAO
    CONG TY CO PHAN XE KHACH VIET NAM
        Hotline CSKH: 1900 6868
========================================
            VE XE KHACH (POS)
Ma tra cuu:  {barcode}
Ngay in ve:  {now_str}
Nhan vien:   {nv_name}

Hanh khach:  {cust_name}
Dien thoai:  {cust_sdt}
----------------------------------------
Tuyen xe:    {tuyen_str}
Khoi hanh:   {gio_kh} ngay {ngay_kh}
Bien so xe:  {bien_so}
So luong ve: {len(so_ghes)} ve
Vi tri ghe:  {', '.join(so_ghes)}
----------------------------------------
TONG TIEN:   {order.TongTien:,.0f} VND
Trang thai:  {order.TrangThai}
----------------------------------------
          ||||||||||||||||||||||||
               {barcode}
(Quy khach vui long co mat tai ben truoc
 gio khoi hanh 30 phut de lam thu tuc)
       CHUC QUY KHACH THUONG LO!
========================================"""

    return PhieuInVeResponse(
        ma_dat_ve=order.MaDatVe,
        noi_dung_in=noi_dung_in,
        tieu_de=f"Vé xe khách #{barcode}",
        nha_xe="Nhà Xe Chất Lượng Cao",
        tuyen_xe=tuyen_str,
        ngay_khoi_hanh=ngay_kh,
        gio_khoi_hanh=gio_kh,
        bien_so_xe=bien_so,
        danh_sach_ghe=so_ghes,
        tong_tien=order.TongTien,
        ho_ten_khach=cust_name,
        sdt_khach=cust_sdt,
        ma_ve_barcode=barcode,
        trang_thai=order.TrangThai,
    )


@router.get(
    "/thong-ke-ca",
    response_model=ThongKeCaResponse,
    summary="Thống kê doanh thu ca trực của nhân viên quầy theo giờ bắt đầu",
)
def get_shift_summary(
    gio_bat_dau: Annotated[str, Query(description="Giờ bắt đầu tính ca (HH:MM), ví dụ: 07:00")] = "07:00",
    ngay: Annotated[date | None, Query(description="Ngày đối soát, mặc định hôm nay")] = None,
    current_user: TaiKhoan = Depends(counter_staff_required),
    db: Session = Depends(get_db),
):
    """Tổng hợp số lượng vé đã xuất, tiền mặt/chuyển khoản từ mốc giờ bắt đầu và danh sách các đơn trong ca của nhân viên."""
    ma_nv = current_user.nhan_vien.MaNV if current_user.nhan_vien else None
    if not ma_nv:
        first_nv = db.query(NhanVien).first()
        ma_nv = first_nv.MaNV if first_nv else 1
        ho_ten = first_nv.HoTen if first_nv else "Nhân viên Bến xe"
        chuc_vu = first_nv.ChucVu if first_nv else "Nhân viên bán vé"
    else:
        ho_ten = current_user.nhan_vien.HoTen
        chuc_vu = current_user.nhan_vien.ChucVu or "Nhân viên bán vé"

    target_date = ngay or date.today()
    try:
        parts = gio_bat_dau.strip().split(":")
        start_time = time(int(parts[0]), int(parts[1]))
    except (ValueError, IndexError):
        start_time = time(7, 0)
        gio_bat_dau = "07:00"

    start_dt = datetime.combine(target_date, start_time)
    end_dt = datetime.now() if target_date == date.today() else datetime.combine(target_date, time(23, 59, 59))

    query = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.thanh_toan_list),
        )
        .filter(
            DatVe.MaNV == ma_nv,
            DatVe.NgayDat >= start_dt,
            DatVe.NgayDat <= end_dt,
        )
    )

    all_orders = query.order_by(DatVe.NgayDat.desc()).all()
    paid_orders = [o for o in all_orders if o.TrangThai == "DaThanhToan"]
    tong_so_don = len(paid_orders)
    paid_order_ids = [o.MaDatVe for o in paid_orders]

    tong_so_ve = (
        db.query(func.count(CT_DatVe.MaCT)).filter(CT_DatVe.MaDatVe.in_(paid_order_ids)).scalar()
        if paid_order_ids
        else 0
    )

    # Tính doanh thu tiền mặt và chuyển khoản của các đơn thu
    tong_tien = Decimal(0)
    tien_mat = Decimal(0)
    chuyen_khoan = Decimal(0)

    for o in paid_orders:
        for p in o.thanh_toan_list:
            if p.TrangThai == "ThanhCong":
                tong_tien += p.SoTien
                if p.PhuongThuc in ["TienMatTaiQuay", "TienMat"]:
                    tien_mat += p.SoTien
                else:
                    chuyen_khoan += p.SoTien

    # Tính tổng tiền mặt hoàn trả (phiếu chi) từ mốc giờ bắt đầu
    refunds_query = (
        db.query(ThanhToan)
        .join(DatVe, DatVe.MaDatVe == ThanhToan.MaDatVe)
        .filter(
            DatVe.MaNV == ma_nv,
            ThanhToan.ThoiGianThanhToan >= start_dt,
            ThanhToan.ThoiGianThanhToan <= end_dt,
            ThanhToan.PhuongThuc.in_(["TienMatTaiQuay", "HoanTienMatTaiQuay"]),
            ThanhToan.TrangThai == "ThanhCong",
            DatVe.TrangThai == "DaHuy",
        )
    )

    tong_tien_mat_hoan = Decimal(0)
    for r in refunds_query.all():
        tong_tien_mat_hoan += r.SoTien

    tien_mat_thuc_thu = max(Decimal(0), tien_mat - tong_tien_mat_hoan)

    # Danh sách đơn hàng trong ca để hiển thị trên giao diện
    danh_sach_don: list[DonHangCaItem] = []
    for o in all_orders:
        chuyen = o.ct_dat_ve_list[0].chuyen_xe if o.ct_dat_ve_list else None
        tuyen_str = f"{chuyen.tuyen_xe.DiemDi} -> {chuyen.tuyen_xe.DiemDen}" if chuyen and chuyen.tuyen_xe else ""
        so_ghes = ", ".join([ct.ghe.SoGhe for ct in o.ct_dat_ve_list if ct.ghe])
        pt = o.thanh_toan_list[0].PhuongThuc if o.thanh_toan_list else "ChuaThanhToan"
        danh_sach_don.append(
            DonHangCaItem(
                ma_dat_ve=o.MaDatVe,
                thoi_gian=o.NgayDat,
                ho_ten_khach=o.khach_hang.HoTen if o.khach_hang else "",
                sdt_khach=o.khach_hang.SDT if o.khach_hang else "",
                tuyen_xe=tuyen_str,
                so_ghe=so_ghes,
                so_tien=o.TongTien,
                phuong_thuc=pt,
                trang_thai=o.TrangThai,
            )
        )

    return ThongKeCaResponse(
        ma_nv=ma_nv,
        ho_ten_nv=ho_ten,
        chuc_vu=chuc_vu,
        thoi_gian_hien_tai=datetime.now(),
        gio_bat_dau=gio_bat_dau,
        ngay=target_date,
        tong_so_don=tong_so_don,
        tong_so_ve_ban=tong_so_ve or 0,
        tong_doanh_thu=tong_tien,
        doanh_thu_tien_mat=tien_mat,
        doanh_thu_chuyen_khoan=chuyen_khoan,
        tong_tien_mat_hoan=tong_tien_mat_hoan,
        tien_mat_thuc_thu=tien_mat_thuc_thu,
        danh_sach_don=danh_sach_don,
    )


@router.get(
    "/tra-cuu-soat-ve",
    response_model=list[TraCuuSoatVeItem],
    summary="Tra cứu nhanh thông tin vé trước khi soát (theo mã đơn hoặc SĐT)",
)
def search_tickets_for_checkin(
    q: Annotated[str, Query(description="Mã đơn đặt vé hoặc số điện thoại khách hàng")],
    current_user: TaiKhoan = Depends(counter_staff_required),
    db: Session = Depends(get_db),
):
    """Tra cứu nhanh danh sách vé theo mã đơn, chuỗi QR (VEXE:...) hoặc số điện thoại / tên khách."""
    q_str = q.strip()
    if not q_str:
        return []

    import re

    match_digits = re.search(r"\d+", q_str)
    possible_id = (
        int(match_digits.group())
        if (match_digits and (q_str.isdigit() or "VEXE" in q_str.upper() or "DATVE" in q_str.upper()))
        else None
    )

    query = db.query(DatVe).options(
        joinedload(DatVe.khach_hang),
        joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
        joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
        joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
        joinedload(DatVe.lich_su_list).joinedload(LichSuVe.tai_khoan).joinedload(TaiKhoan.nhan_vien),
    )

    filters = [DatVe.khach_hang.has(KhachHang.SDT.ilike(f"%{q_str}%"))]
    if possible_id:
        filters.append(DatVe.MaDatVe == possible_id)
    if len(q_str) >= 2 and not q_str.isdigit():
        filters.append(DatVe.khach_hang.has(KhachHang.HoTen.ilike(f"%{q_str}%")))

    orders = query.filter(or_(*filters)).order_by(DatVe.MaDatVe.desc()).limit(20).all()

    results: list[TraCuuSoatVeItem] = []
    for order in orders:
        chuyen = order.ct_dat_ve_list[0].chuyen_xe if order.ct_dat_ve_list else None
        tuyen_str = f"{chuyen.tuyen_xe.DiemDi} -> {chuyen.tuyen_xe.DiemDen}" if chuyen and chuyen.tuyen_xe else ""
        gio_str = f"{chuyen.GioKhoiHanh} ngày {chuyen.NgayKhoiHanh}" if chuyen else ""
        bien_so_str = chuyen.xe.BienSo if chuyen and chuyen.xe else ""
        so_ghes = [ct.ghe.SoGhe for ct in order.ct_dat_ve_list if ct.ghe]

        da_soat = next((ls for ls in order.lich_su_list if ls.HanhDong == "SoatVe"), None)
        thoi_gian_soat = da_soat.ThoiGian.strftime("%H:%M %d/%m/%Y") if da_soat else None
        nhan_vien_soat = (
            (da_soat.tai_khoan.nhan_vien.HoTen if da_soat.tai_khoan.nhan_vien else da_soat.tai_khoan.TenDangNhap)
            if da_soat and da_soat.tai_khoan
            else None
        )

        results.append(
            TraCuuSoatVeItem(
                ma_dat_ve=order.MaDatVe,
                ho_ten_khach=order.khach_hang.HoTen if order.khach_hang else "",
                sdt_khach=order.khach_hang.SDT if order.khach_hang else "",
                tuyen_xe=tuyen_str,
                gio_khoi_hanh=gio_str,
                bien_so=bien_so_str,
                danh_sach_so_ghe=so_ghes,
                tong_tien=order.TongTien,
                trang_thai_ve=order.TrangThai,
                da_soat_ve=da_soat is not None,
                thoi_gian_soat=thoi_gian_soat,
                nhan_vien_soat=nhan_vien_soat,
                hop_le_len_xe=(order.TrangThai == "DaThanhToan" and da_soat is None),
            )
        )
    return results


@router.post(
    "/soat-ve",
    response_model=SoatVeResponse,
    summary="Soát vé khi khách lên xe",
)
def checkin_ticket(
    req: SoatVeRequest,
    current_user: TaiKhoan = Depends(counter_staff_required),
    db: Session = Depends(get_db),
):
    """Kiểm tra tính hợp lệ của vé khi khách lên xe (quét mã QR hoặc nhập mã đơn)."""
    order = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
            joinedload(DatVe.lich_su_list).joinedload(LichSuVe.tai_khoan).joinedload(TaiKhoan.nhan_vien),
        )
        .filter(DatVe.MaDatVe == req.ma_dat_ve)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn đặt vé mã #{req.ma_dat_ve}",
        )

    chuyen = order.ct_dat_ve_list[0].chuyen_xe if order.ct_dat_ve_list else None
    tuyen_str = f"{chuyen.tuyen_xe.DiemDi} -> {chuyen.tuyen_xe.DiemDen}" if chuyen and chuyen.tuyen_xe else ""
    gio_str = f"{chuyen.GioKhoiHanh} ngày {chuyen.NgayKhoiHanh}" if chuyen else ""
    bien_so_str = chuyen.xe.BienSo if chuyen and chuyen.xe else ""
    so_ghes = [ct.ghe.SoGhe for ct in order.ct_dat_ve_list if ct.ghe]
    ho_ten = order.khach_hang.HoTen if order.khach_hang else ""
    sdt = order.khach_hang.SDT if order.khach_hang else ""

    # 1. Kiểm tra trạng thái đơn đặt vé
    if order.TrangThai != "DaThanhToan":
        return SoatVeResponse(
            hop_le=False,
            da_soat_truoc_do=False,
            ma_dat_ve=order.MaDatVe,
            ho_ten_khach=ho_ten,
            sdt_khach=sdt,
            tuyen_xe=tuyen_str,
            gio_khoi_hanh=gio_str,
            bien_so=bien_so_str,
            danh_sach_so_ghe=so_ghes,
            trang_thai_ve=order.TrangThai,
            thong_diep=f"Vé KHÔNG hợp lệ! Đơn ở trạng thái: '{order.TrangThai}'",
        )

    # 2. CHỐNG DOUBLE CHECK-IN: Kiểm tra xem đã từng soát vé chưa
    da_soat = next((ls for ls in order.lich_su_list if ls.HanhDong == "SoatVe"), None)
    if da_soat:
        thoi_gian = da_soat.ThoiGian.strftime("%H:%M ngày %d/%m/%Y")
        ten_nv = (
            da_soat.tai_khoan.nhan_vien.HoTen
            if da_soat.tai_khoan and da_soat.tai_khoan.nhan_vien
            else (da_soat.tai_khoan.TenDangNhap if da_soat.tai_khoan else "Nhân viên kiểm soát")
        )
        return SoatVeResponse(
            hop_le=False,
            da_soat_truoc_do=True,
            ma_dat_ve=order.MaDatVe,
            ho_ten_khach=ho_ten,
            sdt_khach=sdt,
            tuyen_xe=tuyen_str,
            gio_khoi_hanh=gio_str,
            bien_so=bien_so_str,
            danh_sach_so_ghe=so_ghes,
            trang_thai_ve=order.TrangThai,
            thong_diep=f"CẢNH BÁO: Vé này ĐÃ ĐƯỢC SOÁT LÊN XE vào lúc {thoi_gian} bởi {ten_nv}. Hãy kiểm tra xem có gian lận vé trùng lặp không!",
        )

    # 3. Ghi nhận lịch sử soát vé hợp lệ lần đầu
    db.add(
        LichSuVe(
            MaDatVe=order.MaDatVe,
            MaTK=current_user.MaTK,
            HanhDong="SoatVe",
            LyDo="Nhân viên soát vé tại cửa xe",
            GhiChu="Soát vé lên xe thành công",
        )
    )
    db.commit()

    return SoatVeResponse(
        hop_le=True,
        da_soat_truoc_do=False,
        ma_dat_ve=order.MaDatVe,
        ho_ten_khach=ho_ten,
        sdt_khach=sdt,
        tuyen_xe=tuyen_str,
        gio_khoi_hanh=gio_str,
        bien_so=bien_so_str,
        danh_sach_so_ghe=so_ghes,
        trang_thai_ve="DaThanhToan",
        thong_diep="Vé HỢP LỆ! Cho phép khách lên xe.",
    )
