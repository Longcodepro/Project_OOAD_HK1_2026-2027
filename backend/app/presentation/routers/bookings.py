import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.db.models import (
    ChuyenXe,
    CT_DatVe,
    DatVe,
    Ghe,
    KhachHang,
    KhuyenMai,
    LichSuVe,
    TaiKhoan,
    ThanhToan,
    Xe,
)
from app.infrastructure.db.settings_service import get_setting_int
from app.presentation.deps import get_current_user, get_db, security
from app.presentation.schemas.bookings import (
    BaoGiaHuyVeResponse,
    CapNhatHanhKhachRequest,
    CTDatVeResponse,
    DatVeResponse,
    HuyVeResponse,
    TaoDonDatVeRequest,
    ThanhToanRequest,
    ThanhToanResponse,
    YeuCauHuyVeRequest,
)

router = APIRouter(prefix="/dat-ve", tags=["đặt vé & thanh toán"])
ve_router = APIRouter(prefix="/ve", tags=["tra cứu & hủy vé"])


def _build_datve_response(dv: DatVe, db: Session | None = None) -> DatVeResponse:
    chuyen = dv.ct_dat_ve_list[0].chuyen_xe if dv.ct_dat_ve_list else None
    diem_di = chuyen.tuyen_xe.DiemDi if chuyen and chuyen.tuyen_xe else ""
    diem_den = chuyen.tuyen_xe.DiemDen if chuyen and chuyen.tuyen_xe else ""
    ngay_khoi_hanh = chuyen.NgayKhoiHanh if chuyen else dv.NgayDat.date()
    gio_khoi_hanh = chuyen.GioKhoiHanh if chuyen else dv.NgayDat.time()
    ma_chuyen = chuyen.MaChuyen if chuyen else 0

    bien_so_xe = None
    loai_xe = None
    try:
        if chuyen and chuyen.xe:
            bien_so_xe = chuyen.xe.BienSo
            if chuyen.xe.loai_xe:
                loai_xe = chuyen.xe.loai_xe.TenLoaiXe
    except Exception:
        pass

    danh_sach_ve = [
        CTDatVeResponse(
            ma_ct=ct.MaCT,
            ma_ghe=ct.MaGhe,
            so_ghe=ct.ghe.SoGhe if ct.ghe else "",
            tang=ct.ghe.Tang if ct.ghe else 1,
            don_gia=ct.DonGia,
            ho_ten_hanh_khach=ct.HoTenHanhKhach or (dv.khach_hang.HoTen if dv.khach_hang else ""),
            sdt_hanh_khach=ct.SDTHanhKhach or (dv.khach_hang.SDT if dv.khach_hang else ""),
        )
        for ct in dv.ct_dat_ve_list
    ]

    thanh_tien = max(Decimal(0), dv.TongTien)
    hold_min = get_setting_int(db, "THOI_GIAN_GIU_CHO_PHUT", 15) if db else 15
    han_thanh_toan = dv.NgayDat + timedelta(minutes=hold_min)

    return DatVeResponse(
        ma_dat_ve=dv.MaDatVe,
        ma_kh=dv.MaKH,
        ho_ten_kh=dv.khach_hang.HoTen if dv.khach_hang else "",
        sdt_kh=dv.khach_hang.SDT if dv.khach_hang else "",
        ma_chuyen=ma_chuyen,
        diem_di=diem_di,
        diem_den=diem_den,
        ngay_khoi_hanh=ngay_khoi_hanh,
        gio_khoi_hanh=gio_khoi_hanh,
        ngay_dat=dv.NgayDat,
        tong_tien=dv.TongTien + dv.TienGiam,
        tien_giam=dv.TienGiam,
        thanh_tien=thanh_tien,
        trang_thai=dv.TrangThai,
        han_thanh_toan=han_thanh_toan,
        ghi_chu=dv.GhiChu,
        bien_so_xe=bien_so_xe,
        loai_xe=loai_xe,
        danh_sach_ve=danh_sach_ve,
    )


@router.post("", response_model=DatVeResponse, status_code=status.HTTP_201_CREATED, summary="Tạo đơn đặt vé mới")
def create_booking(
    req: TaoDonDatVeRequest,
    credentials=Depends(security),
    db: Session = Depends(get_db),
):
    """Tạo đơn đặt vé trực tuyến (hỗ trợ cả khách có tài khoản và khách vãng lai)."""
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
            detail=f"Chuyến xe hiện đang ở trạng thái '{chuyen.TrangThai}', không thể đặt vé",
        )

    # 2. Kiểm tra danh sách ghế
    ghe_ids = list(set(req.danh_sach_ma_ghe))
    ghes = (
        db.query(Ghe)
        .filter(Ghe.MaGhe.in_(ghe_ids), Ghe.MaXe == chuyen.MaXe)
        .all()
    )

    if len(ghes) != len(ghe_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Một số ghế được chọn không tồn tại hoặc không thuộc xe của chuyến này",
        )

    for g in ghes:
        if g.TrangThai != "Trong":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ghế {g.SoGhe} hiện đang bị hỏng hoặc bảo trì, vui lòng chọn ghế khác",
            )

    # 3. Kiểm tra ghế đã bị đặt hoặc đang được giữ chỗ còn hạn (chống Double-Booking)
    now = datetime.now()
    hold_min = get_setting_int(db, "THOI_GIAN_GIU_CHO_PHUT", 15)
    cutoff_holding = now - timedelta(minutes=hold_min)

    conflicting_seats = (
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

    if conflicting_seats:
        seat_names = ", ".join([s[0] for s in conflicting_seats])
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ghế ({seat_names}) đã có người đặt hoặc đang giữ chỗ. Vui lòng chọn ghế khác!",
        )

    # 4. Xác định thông tin Khách hàng (Đã đăng nhập hay khách mới)
    current_user_id = None
    khach_hang: KhachHang | None = None

    if credentials and credentials.credentials:
        try:
            current_user = get_current_user(credentials, db)
            current_user_id = current_user.MaTK
            if current_user.khach_hang:
                khach_hang = current_user.khach_hang
        except HTTPException:
            current_user_id = None

    if not khach_hang:
        # Tìm khách hàng theo SĐT
        khach_hang = db.query(KhachHang).filter(KhachHang.SDT == req.sdt.strip()).first()
        if not khach_hang:
            khach_hang = KhachHang(
                HoTen=req.ho_ten.strip(),
                SDT=req.sdt.strip(),
                DiaChi=req.dia_chi.strip() if req.dia_chi else None,
                MaTK=current_user_id,
            )
            db.add(khach_hang)
            db.flush()

    # 5. Tính toán giá vé và khuyến mãi
    tong_tien_goc = chuyen.GiaVe * len(ghe_ids)
    tien_giam = Decimal(0)
    ma_km_id = req.ma_km

    # Nếu có mã code voucher
    if req.ma_code_km:
        km = (
            db.query(KhuyenMai)
            .filter(
                KhuyenMai.MaCode == req.ma_code_km.strip().upper(),
                KhuyenMai.TrangThai == "HoatDong",
                KhuyenMai.NgayBatDau <= now,
                KhuyenMai.NgayKetThuc >= now,
            )
            .first()
        )
        if km and tong_tien_goc >= km.DonToiThieu:
            ma_km_id = km.MaKM
            if km.LoaiGiam == "PhanTram":
                tien_giam = tong_tien_goc * (km.GiaTriGiam / Decimal(100))
                if km.GiaTriGiamToiDa and tien_giam > km.GiaTriGiamToiDa:
                    tien_giam = km.GiaTriGiamToiDa
            else:
                tien_giam = min(km.GiaTriGiam, tong_tien_goc)

    tong_tien_phai_tra = max(Decimal(0), tong_tien_goc - tien_giam)

    # 6. Tạo Đơn đặt vé
    new_order = DatVe(
        MaKH=khach_hang.MaKH,
        MaKM=ma_km_id,
        NgayDat=now,
        TongTien=tong_tien_phai_tra,
        TienGiam=tien_giam,
        TrangThai="ChoThanhToan",
        GhiChu=req.ghi_chu,
    )
    db.add(new_order)
    db.flush()

    # 7. Tạo Chi tiết vé cho từng ghế
    hk_map = {}
    if req.danh_sach_hanh_khach:
        for hk in req.danh_sach_hanh_khach:
            hk_map[hk.ma_ghe] = hk

    for ghe_id in ghe_ids:
        hk_info = hk_map.get(ghe_id)
        ht = (hk_info.ho_ten.strip() if hk_info and hk_info.ho_ten and hk_info.ho_ten.strip() else None) or req.ho_ten.strip()
        sdt_khach = (hk_info.sdt.strip() if hk_info and hk_info.sdt and hk_info.sdt.strip() else None) or req.sdt.strip()

        ct = CT_DatVe(
            MaDatVe=new_order.MaDatVe,
            MaGhe=ghe_id,
            MaChuyen=req.ma_chuyen,
            DonGia=chuyen.GiaVe,
            HoTenHanhKhach=ht,
            SDTHanhKhach=sdt_khach,
        )
        db.add(ct)

    # 8. Ghi nhận Lịch sử vé
    # Lấy admin hoặc user mặc định nếu khách không login
    log_tk_id = current_user_id
    if not log_tk_id:
        admin_tk = db.query(TaiKhoan).filter(TaiKhoan.TenDangNhap == "admin").first()
        log_tk_id = admin_tk.MaTK if admin_tk else 1

    lich_su = LichSuVe(
        MaDatVe=new_order.MaDatVe,
        MaTK=log_tk_id,
        HanhDong="TaoDon",
        LyDo="Khách hàng tạo đơn đặt vé trực tuyến",
        GhiChu=f"Đặt {len(ghe_ids)} ghế trên chuyến #{req.ma_chuyen}",
    )
    db.add(lich_su)
    db.commit()

    # Nạp lại đầy đủ các relationships
    db.refresh(new_order)
    reloaded_order = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe).joinedload(Xe.loai_xe),
        )
        .filter(DatVe.MaDatVe == new_order.MaDatVe)
        .first()
    )

    return _build_datve_response(reloaded_order)


@router.post("/{ma_dat_ve}/thanh-toan", response_model=ThanhToanResponse, summary="Thanh toán đơn đặt vé")
def pay_booking(
    ma_dat_ve: int,
    req: ThanhToanRequest,
    db: Session = Depends(get_db),
):
    """Xử lý thanh toán cho đơn đặt vé qua VietQR, MoMo, Thẻ hoặc Tiền mặt."""
    order = (
        db.query(DatVe)
        .options(joinedload(DatVe.khach_hang))
        .filter(DatVe.MaDatVe == ma_dat_ve)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn đặt vé có mã #{ma_dat_ve}",
        )

    if order.TrangThai == "DaThanhToan":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn đặt vé này đã được thanh toán thành công trước đó",
        )

    if order.TrangThai == "DaHuy":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn đặt vé này đã bị hủy, không thể tiếp tục thanh toán",
        )

    now = datetime.now()
    hold_min = get_setting_int(db, "THOI_GIAN_GIU_CHO_PHUT", 15)
    if now > order.NgayDat + timedelta(minutes=hold_min):
        order.TrangThai = "DaHuy"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Đơn đặt vé đã quá hạn thanh toán {hold_min} phút và đã tự động hủy. Vui lòng đặt lại vé mới!",
        )

    # Áp dụng mã giảm giá voucher nếu khách nhập tại bước thanh toán (và đơn chưa có mã)
    if req.ma_code_km and not order.MaKM:
        km = (
            db.query(KhuyenMai)
            .filter(
                KhuyenMai.MaCode == req.ma_code_km.strip().upper(),
                KhuyenMai.TrangThai == "HoatDong",
                KhuyenMai.NgayBatDau <= now,
                KhuyenMai.NgayKetThuc >= now,
            )
            .first()
        )
        if km:
            tong_tien_goc = sum(ct.DonGia for ct in order.ct_dat_ve_list)
            if tong_tien_goc >= km.DonToiThieu:
                tien_giam = Decimal(0)
                if km.LoaiGiam == "PhanTram":
                    tien_giam = tong_tien_goc * (km.GiaTriGiam / Decimal(100))
                    if km.GiaTriGiamToiDa and tien_giam > km.GiaTriGiamToiDa:
                        tien_giam = km.GiaTriGiamToiDa
                else:
                    tien_giam = min(km.GiaTriGiam, tong_tien_goc)
                order.MaKM = km.MaKM
                order.TienGiam = tien_giam
                order.TongTien = max(Decimal(0), tong_tien_goc - tien_giam)

    ma_gd = req.ma_giao_dich or f"TXN_{uuid.uuid4().hex[:12].upper()}"

    if req.mo_phong == "that_bai":
        payment_fail = ThanhToan(
            MaDatVe=order.MaDatVe,
            PhuongThuc=req.phuong_thuc,
            SoTien=order.TongTien,
            MaGiaoDich=ma_gd,
            ThoiGianThanhToan=now,
            TrangThai="ThatBai",
            GhiChu="Mô phỏng thanh toán thất bại từ cổng thanh toán",
        )
        db.add(payment_fail)
        db.commit()
        return ThanhToanResponse(
            ma_thanh_toan=payment_fail.MaThanhToan,
            ma_dat_ve=order.MaDatVe,
            phuong_thuc=req.phuong_thuc,
            so_tien=order.TongTien,
            ma_giao_dich=ma_gd,
            thoi_gian_thanh_toan=now,
            trang_thai="ThatBai",
            thong_diep="Thanh toán không thành công. Vui lòng thử lại phương thức khác!",
        )

    # Thanh toán thành công
    so_tk = None
    bank = None
    owner = None
    if req.phuong_thuc != "TienMatTaiQuay":
        so_tk = req.so_tai_khoan or f"190388{order.MaDatVe:04d}99"
        bank = req.ten_ngan_hang or "Techcombank"
        owner = req.ten_chu_tai_khoan or (order.khach_hang.HoTen if order.khach_hang else "KHACH HANG")

    payment_success = ThanhToan(
        MaDatVe=order.MaDatVe,
        PhuongThuc=req.phuong_thuc,
        SoTien=order.TongTien,
        MaGiaoDich=ma_gd,
        SoTaiKhoan=so_tk,
        TenNganHang=bank,
        TenChuTaiKhoan=owner,
        ThoiGianThanhToan=now,
        TrangThai="ThanhCong",
        GhiChu=f"Thanh toán thành công qua {req.phuong_thuc}",
    )
    db.add(payment_success)

    order.TrangThai = "DaThanhToan"

    # Ghi nhận lịch sử
    admin_tk = db.query(TaiKhoan).filter(TaiKhoan.TenDangNhap == "admin").first()
    log_tk_id = admin_tk.MaTK if admin_tk else 1

    lich_su = LichSuVe(
        MaDatVe=order.MaDatVe,
        MaTK=log_tk_id,
        HanhDong="ThanhToan",
        LyDo=f"Thanh toán thành công qua {req.phuong_thuc}",
        GhiChu=f"Mã GD: {ma_gd}",
    )
    db.add(lich_su)
    db.commit()
    db.refresh(payment_success)

    return ThanhToanResponse(
        ma_thanh_toan=payment_success.MaThanhToan,
        ma_dat_ve=order.MaDatVe,
        phuong_thuc=req.phuong_thuc,
        so_tien=order.TongTien,
        ma_giao_dich=ma_gd,
        thoi_gian_thanh_toan=now,
        trang_thai="ThanhCong",
        thong_diep="Thanh toán thành công! Vé của bạn đã được xuất.",
    )


@router.get("/{ma_dat_ve}", response_model=DatVeResponse, summary="Chi tiết đơn đặt vé")
def get_booking_detail(ma_dat_ve: int, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết một đơn đặt vé."""
    order = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe).joinedload(Xe.loai_xe),
        )
        .filter(DatVe.MaDatVe == ma_dat_ve)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn đặt vé #{ma_dat_ve}",
        )
    return _build_datve_response(order)


@router.post("/{ma_dat_ve}/huy", response_model=HuyVeResponse, summary="Hủy đơn đặt vé chưa thanh toán")
def cancel_unpaid_booking(ma_dat_ve: int, db: Session = Depends(get_db)):
    """Hủy đơn đặt vé khi đang ở trạng thái 'ChoThanhToan' để giải phóng ghế ngay lập tức."""
    order = db.query(DatVe).filter(DatVe.MaDatVe == ma_dat_ve).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn đặt vé #{ma_dat_ve}",
        )

    if order.TrangThai != "ChoThanhToan":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chỉ có thể hủy nhanh đơn đang chờ thanh toán. Đơn hiện tại là '{order.TrangThai}'",
        )

    order.TrangThai = "DaHuy"
    admin_tk = db.query(TaiKhoan).filter(TaiKhoan.TenDangNhap == "admin").first()
    db.add(
        LichSuVe(
            MaDatVe=order.MaDatVe,
            MaTK=admin_tk.MaTK if admin_tk else 1,
            HanhDong="HuyDon",
            LyDo="Khách hàng hoặc hệ thống chủ động hủy đơn chưa thanh toán",
        )
    )
    db.commit()

    return HuyVeResponse(
        ma_dat_ve=order.MaDatVe,
        trang_thai="DaHuy",
        so_tien_hoan=Decimal(0),
        phi_huy=Decimal(0),
        thong_diep="Hủy đơn thành công, các ghế đã được giải phóng về trạng thái trống.",
    )


# ==========================================
# PHÂN HỆ VÉ & TRA CỨU / HỦY VÉ HOÀN TIỀN
# ==========================================


@ve_router.get("/tra-cuu", response_model=list[DatVeResponse], summary="Tra cứu vé công khai")
def lookup_tickets(
    ma_dat_ve: Annotated[int | None, Query(description="Mã đơn đặt vé")] = None,
    sdt: Annotated[str | None, Query(description="Số điện thoại đặt vé hoặc hành khách")] = None,
    ho_ten: Annotated[str | None, Query(description="Họ tên người đặt hoặc hành khách")] = None,
    q: Annotated[str | None, Query(description="Từ khóa tìm kiếm linh hoạt (Mã, SĐT, hoặc Tên)")] = None,
    db: Session = Depends(get_db),
):
    """Tra cứu vé xe linh hoạt theo Mã đơn, Số điện thoại hoặc Họ tên hành khách (cả người đặt và người đi)."""
    search_term = (q or "").strip()
    param_sdt = (sdt or "").strip()
    param_name = (ho_ten or "").strip()

    if not ma_dat_ve and not param_sdt and not param_name and not search_term:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng cung cấp ít nhất một thông tin: Mã đơn đặt vé, Số điện thoại hoặc Họ tên",
        )

    query = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe).joinedload(Xe.loai_xe),
        )
    )

    filters = []

    if ma_dat_ve:
        filters.append(DatVe.MaDatVe == ma_dat_ve)

    if param_sdt:
        filters.append(
            or_(
                DatVe.khach_hang.has(KhachHang.SDT.ilike(f"%{param_sdt}%")),
                DatVe.ct_dat_ve_list.any(CT_DatVe.SDTHanhKhach.ilike(f"%{param_sdt}%")),
            )
        )

    if param_name:
        filters.append(
            or_(
                DatVe.khach_hang.has(KhachHang.HoTen.ilike(f"%{param_name}%")),
                DatVe.ct_dat_ve_list.any(CT_DatVe.HoTenHanhKhach.ilike(f"%{param_name}%")),
            )
        )

    if search_term:
        # Nhận diện nếu search_term là số
        term_clean = search_term.replace("#", "").replace("VE-", "").strip()
        import re
        match_num = re.search(r"^\d+", term_clean)
        
        term_filters = [
            DatVe.khach_hang.has(KhachHang.HoTen.ilike(f"%{search_term}%")),
            DatVe.ct_dat_ve_list.any(CT_DatVe.HoTenHanhKhach.ilike(f"%{search_term}%")),
            DatVe.khach_hang.has(KhachHang.SDT.ilike(f"%{search_term}%")),
            DatVe.ct_dat_ve_list.any(CT_DatVe.SDTHanhKhach.ilike(f"%{search_term}%")),
        ]
        if match_num and len(match_num.group()) <= 7:
            term_filters.append(DatVe.MaDatVe == int(match_num.group()))

        filters.append(or_(*term_filters))

    if filters:
        query = query.filter(and_(*filters))

    orders = query.order_by(DatVe.NgayDat.desc()).distinct().all()
    return [_build_datve_response(o) for o in orders]


@ve_router.get("/lich-su", response_model=list[DatVeResponse], summary="Lịch sử vé của tôi")
def get_my_tickets(
    trang_thai: Annotated[str | None, Query(description="ChoThanhToan, DaThanhToan, DaHuy")] = None,
    current_user: TaiKhoan = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lấy danh sách các đơn đặt vé của người dùng hiện tại đang đăng nhập."""
    if not current_user.khach_hang:
        return []

    query = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe).joinedload(Xe.loai_xe),
        )
        .filter(DatVe.MaKH == current_user.khach_hang.MaKH)
    )

    if trang_thai:
        query = query.filter(DatVe.TrangThai == trang_thai.strip())

    orders = query.order_by(DatVe.NgayDat.desc()).all()
    return [_build_datve_response(o) for o in orders]


@ve_router.put("/{ma_dat_ve}/hanh-khach", response_model=DatVeResponse, summary="Cập nhật thông tin hành khách cho từng vé")
def update_passengers(
    ma_dat_ve: int,
    req: CapNhatHanhKhachRequest,
    db: Session = Depends(get_db),
):
    """Cập nhật Họ tên và SĐT của hành khách cho từng vé. Chặn nếu còn <= 2 giờ trước khi khởi hành."""
    order = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe).joinedload(Xe.loai_xe),
        )
        .filter(DatVe.MaDatVe == ma_dat_ve)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn đặt vé #{ma_dat_ve}",
        )

    if order.TrangThai == "DaHuy":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Đơn đặt vé đã bị hủy, không thể chỉnh sửa thông tin hành khách",
        )

    chuyen = order.ct_dat_ve_list[0].chuyen_xe if order.ct_dat_ve_list else None
    if not chuyen:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không tìm thấy thông tin chuyến xe của vé này",
        )

    if chuyen.TrangThai in ["HoanThanh", "HuyChuyen"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chuyến xe đã ở trạng thái '{chuyen.TrangThai}', không thể thay đổi thông tin",
        )

    now = datetime.now()
    thoi_gian_chay = datetime.combine(chuyen.NgayKhoiHanh, chuyen.GioKhoiHanh)
    delta_hours = (thoi_gian_chay - now).total_seconds() / 3600.0

    if delta_hours <= 2.0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chuyến xe sắp khởi hành trong vòng 2 giờ (danh sách hành khách đã chốt xuất bến), không thể tự chỉnh sửa trực tuyến. Vui lòng liên hệ quầy vé để được hỗ trợ.",
        )

    ct_map = {ct.MaCT: ct for ct in order.ct_dat_ve_list}
    updated_items = []
    for item in req.danh_sach_hanh_khach:
        if item.ma_ct not in ct_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Vé #{item.ma_ct} không thuộc đơn đặt vé #{ma_dat_ve}",
            )
        ct = ct_map[item.ma_ct]
        ct.HoTenHanhKhach = item.ho_ten.strip()
        ct.SDTHanhKhach = item.sdt.strip()
        so_ghe_str = ct.ghe.SoGhe if ct.ghe else str(ct.MaGhe)
        updated_items.append(f"Ghế {so_ghe_str}: {item.ho_ten.strip()} ({item.sdt.strip()})")

    admin_tk = db.query(TaiKhoan).filter(TaiKhoan.TenDangNhap == "admin").first()
    lich_su = LichSuVe(
        MaDatVe=order.MaDatVe,
        MaTK=admin_tk.MaTK if admin_tk else 1,
        HanhDong="CapNhatHanhKhach",
        LyDo="Khách hàng cập nhật thông tin hành khách trực tuyến",
        GhiChu=", ".join(updated_items),
    )
    db.add(lich_su)
    db.commit()
    db.refresh(order)

    return _build_datve_response(order, db)


@ve_router.get("/{ma_dat_ve}/bao-gia-huy", response_model=BaoGiaHuyVeResponse, summary="Báo giá phí hủy vé")
@ve_router.post("/{ma_dat_ve}/bao-gia-huy", response_model=BaoGiaHuyVeResponse, summary="Báo giá phí hủy vé")
def quote_ticket_cancellation(ma_dat_ve: int, db: Session = Depends(get_db)):
    """Tính toán điều kiện và mức phí hoàn tiền khi khách hàng muốn hủy vé."""
    order = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe),
            joinedload(DatVe.thanh_toan_list),
            joinedload(DatVe.khach_hang),
        )
        .filter(DatVe.MaDatVe == ma_dat_ve)
        .first()
    )
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy đơn đặt vé #{ma_dat_ve}",
        )

    if order.TrangThai != "DaThanhToan":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Chỉ có thể yêu cầu hoàn vé cho đơn đã thanh toán. Đơn hiện tại: '{order.TrangThai}'",
        )

    chuyen = order.ct_dat_ve_list[0].chuyen_xe if order.ct_dat_ve_list else None
    if not chuyen:
        raise HTTPException(status_code=400, detail="Không tìm thấy thông tin chuyến xe")

    departure_dt = datetime.combine(chuyen.NgayKhoiHanh, chuyen.GioKhoiHanh)
    now = datetime.now()
    diff_hours = (departure_dt - now).total_seconds() / 3600.0

    min_hours = get_setting_int(db, "THOI_GIAN_HUY_TOI_THIEU_GIO", 24)
    fee_percent = get_setting_int(db, "TY_LE_PHI_HUY_VE", 10)

    is_counter = (order.MaNV is not None) or any(t.PhuongThuc == "TienMatTaiQuay" for t in order.thanh_toan_list)
    hinh_thuc_mua = "TaiQuay" if is_counter else "Online"
    hinh_thuc_hoan = "NhanTienMatTaiQuay" if is_counter else "ChuyenKhoanNgay"

    last_payment = next((t for t in reversed(order.thanh_toan_list) if t.TrangThai == "ThanhCong"), None)
    tai_khoan_hoan = None
    if not is_counter and last_payment and last_payment.SoTaiKhoan:
        tai_khoan_hoan = f"{last_payment.TenNganHang or 'NganHang'} - {last_payment.SoTaiKhoan} ({last_payment.TenChuTaiKhoan or 'CHU TK'})"

    if diff_hours <= float(min_hours):
        return BaoGiaHuyVeResponse(
            ma_dat_ve=ma_dat_ve,
            cho_phep_huy=False,
            hinh_thuc_mua=hinh_thuc_mua,
            hinh_thuc_hoan=hinh_thuc_hoan,
            tai_khoan_hoan=tai_khoan_hoan,
            so_gio_con_lai=round(max(0.0, diff_hours), 1),
            ty_le_phi_huy=100,
            phi_huy=order.TongTien,
            so_tien_hoan_lai=Decimal(0),
            ly_do=f"Thời gian còn lại đến giờ khởi hành là {round(max(0.0, diff_hours), 1)} giờ (không lớn hơn {min_hours} giờ), không áp dụng hủy vé hoàn tiền",
        )

    phi_huy = order.TongTien * (Decimal(fee_percent) / Decimal(100))
    so_tien_hoan = max(Decimal(0), order.TongTien - phi_huy)

    return BaoGiaHuyVeResponse(
        ma_dat_ve=ma_dat_ve,
        cho_phep_huy=True,
        hinh_thuc_mua=hinh_thuc_mua,
        hinh_thuc_hoan=hinh_thuc_hoan,
        tai_khoan_hoan=tai_khoan_hoan,
        so_gio_con_lai=round(diff_hours, 1),
        ty_le_phi_huy=fee_percent,
        phi_huy=phi_huy,
        so_tien_hoan_lai=so_tien_hoan,
        ly_do=f"Hủy trước {round(diff_hours, 1)} giờ (> {min_hours} giờ), phí hủy vé quy định là {fee_percent}%",
    )


@ve_router.post("/{ma_dat_ve}/yeu-cau-huy", response_model=HuyVeResponse, summary="Thực hiện hủy vé & hoàn tiền")
def cancel_paid_ticket(
    ma_dat_ve: int,
    req: YeuCauHuyVeRequest,
    db: Session = Depends(get_db),
):
    """Hủy vé đã thanh toán, tính phí hủy theo quy định và giải phóng ghế."""
    quote = quote_ticket_cancellation(ma_dat_ve, db)
    if quote.hinh_thuc_mua == "TaiQuay":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Vé này được mua trực tiếp tại quầy bán vé bằng tiền mặt. "
                "Theo quy định, Quý khách vui lòng mang vé xe hoặc CCCD ra quầy vé tại bến xe "
                "để nhân viên kiểm tra và làm thủ tục nhận lại tiền mặt trực tiếp."
            ),
        )

    if not quote.cho_phep_huy:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể hủy vé: {quote.ly_do}",
        )

    order = (
        db.query(DatVe)
        .options(joinedload(DatVe.thanh_toan_list))
        .filter(DatVe.MaDatVe == ma_dat_ve)
        .first()
    )
    order.TrangThai = "DaHuy"

    now = datetime.now()
    admin_tk = db.query(TaiKhoan).filter(TaiKhoan.TenDangNhap == "admin").first()

    last_payment = next((t for t in reversed(order.thanh_toan_list) if t.TrangThai == "ThanhCong"), None)

    # Ghi nhận giao dịch hoàn tiền online tức thì
    hoan_tien = ThanhToan(
        MaDatVe=order.MaDatVe,
        PhuongThuc="HoanTienOnline",
        SoTien=quote.so_tien_hoan_lai,
        MaGiaoDich=f"REFUND_{uuid.uuid4().hex[:10].upper()}",
        SoTaiKhoan=last_payment.SoTaiKhoan if last_payment else None,
        TenNganHang=last_payment.TenNganHang if last_payment else None,
        TenChuTaiKhoan=last_payment.TenChuTaiKhoan if last_payment else None,
        ThoiGianThanhToan=now,
        TrangThai="ThanhCong",
        GhiChu=f"Hoàn tiền trực tuyến sau khi trừ {quote.ty_le_phi_huy}% phí hủy ({quote.phi_huy:,.0f} đ)",
    )
    db.add(hoan_tien)

    db.add(
        LichSuVe(
            MaDatVe=order.MaDatVe,
            MaTK=admin_tk.MaTK if admin_tk else 1,
            HanhDong="HuyVeOnline",
            LyDo=req.ly_do,
            GhiChu=f"Hoàn {quote.so_tien_hoan_lai:,.0f} VNĐ về TK: {quote.tai_khoan_hoan or 'gốc'}",
        )
    )
    db.commit()

    return HuyVeResponse(
        ma_dat_ve=order.MaDatVe,
        trang_thai="DaHuy",
        hinh_thuc_mua="Online",
        hinh_thuc_hoan="ChuyenKhoanNgay",
        tai_khoan_hoan=quote.tai_khoan_hoan,
        so_tien_hoan=quote.so_tien_hoan_lai,
        phi_huy=quote.phi_huy,
        thong_diep=f"Hủy vé thành công! Đã tự động hoàn trả {quote.so_tien_hoan_lai:,.0f} VNĐ về tài khoản {quote.tai_khoan_hoan or 'gốc đã thanh toán'}.",
    )
