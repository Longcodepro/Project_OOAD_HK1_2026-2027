from datetime import date, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.db.models import ChuyenXe, CT_DatVe, DatVe, TuyenXe, Xe
from app.infrastructure.db.settings_service import get_setting_int
from app.presentation.deps import get_db
from app.presentation.schemas.trips import (
    ChuyenXeItemResponse,
    GheItemResponse,
    SoDoGheResponse,
    TuyenXeResponse,
)

router = APIRouter(prefix="/tuyen-xe", tags=["tuyến & chuyến xe"])
chuyen_router = APIRouter(prefix="/chuyen-xe", tags=["tuyến & chuyến xe"])


@router.get("", response_model=list[TuyenXeResponse], summary="Danh sách tuyến xe đang khai thác")
def get_routes(
    diem_di: str | None = None,
    diem_den: str | None = None,
    tat_ca: bool = False,
    db: Session = Depends(get_db),
):
    """Lấy danh sách các tuyến xe, hỗ trợ lọc theo Điểm đi và Điểm đến."""
    query = db.query(TuyenXe)
    if not tat_ca:
        query = query.filter(TuyenXe.TrangThai == "HoatDong")
    if diem_di:
        query = query.filter(TuyenXe.DiemDi.ilike(f"%{diem_di.strip()}%"))
    if diem_den:
        query = query.filter(TuyenXe.DiemDen.ilike(f"%{diem_den.strip()}%"))

    routes = query.order_by(TuyenXe.MaTuyen).all()
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


@chuyen_router.get("", response_model=list[ChuyenXeItemResponse], summary="Tìm kiếm chuyến xe công khai")
def search_trips(
    diem_di: Annotated[str | None, Query(description="Tỉnh/Thành phố hoặc Bến xe xuất phát")] = None,
    diem_den: Annotated[str | None, Query(description="Tỉnh/Thành phố hoặc Bến xe nơi đến")] = None,
    ngay_di: Annotated[date | None, Query(description="Ngày khởi hành (YYYY-MM-DD)")] = None,
    ngay: Annotated[date | None, Query(description="Ngày khởi hành (alias)")] = None,
    ma_loai_xe: Annotated[int | None, Query(description="Lọc theo loại xe")] = None,
    ma_tuyen: Annotated[int | None, Query(description="Lọc theo mã tuyến")] = None,
    tuyen_id: Annotated[int | None, Query(description="Lọc theo mã tuyến (alias)")] = None,
    sap_xep: Annotated[str, Query(description="gio_som, gia_tang, gia_giam")] = "gio_som",
    trang_thai: Annotated[str | None, Query(description="Lọc theo trạng thái cụ thể")] = None,
    tat_ca_trang_thai: Annotated[bool, Query(description="Lấy tất cả các trạng thái chuyến")] = False,
    db: Session = Depends(get_db),
):
    """Tìm kiếm các chuyến xe khả dụng với số ghế trống tính toán thời gian thực."""
    actual_ma_tuyen = ma_tuyen if ma_tuyen is not None else tuyen_id
    actual_ngay_di = ngay_di if ngay_di is not None else ngay

    query = (
        db.query(ChuyenXe)
        .join(ChuyenXe.tuyen_xe)
        .join(ChuyenXe.xe)
        .join(Xe.loai_xe)
        .options(
            joinedload(ChuyenXe.tuyen_xe),
            joinedload(ChuyenXe.xe).joinedload(Xe.loai_xe),
        )
    )

    if actual_ma_tuyen:
        query = query.filter(ChuyenXe.MaTuyen == actual_ma_tuyen)

    if trang_thai:
        query = query.filter(ChuyenXe.TrangThai == trang_thai.strip())
    elif not tat_ca_trang_thai:
        query = query.filter(ChuyenXe.TrangThai.in_(["DangBan", "SapKhoiHanh", "HoatDong"]))

    if diem_di:
        query = query.filter(TuyenXe.DiemDi.ilike(f"%{diem_di.strip()}%"))
    if diem_den:
        query = query.filter(TuyenXe.DiemDen.ilike(f"%{diem_den.strip()}%"))
    if actual_ngay_di:
        query = query.filter(ChuyenXe.NgayKhoiHanh == actual_ngay_di)
    if ma_loai_xe:
        query = query.filter(Xe.MaLoaiXe == ma_loai_xe)

    if sap_xep == "gia_tang":
        query = query.order_by(ChuyenXe.GiaVe.asc(), ChuyenXe.GioKhoiHanh.asc())
    elif sap_xep == "gia_giam":
        query = query.order_by(ChuyenXe.GiaVe.desc(), ChuyenXe.GioKhoiHanh.asc())
    else:  # gio_som
        query = query.order_by(ChuyenXe.NgayKhoiHanh.asc(), ChuyenXe.GioKhoiHanh.asc())

    trips = query.limit(100).all()

    # Tính toán số ghế trống cho từng chuyến
    now = datetime.now()
    hold_min = get_setting_int(db, "THOI_GIAN_GIU_CHO_PHUT", 15)
    cutoff_holding = now - timedelta(minutes=hold_min)

    results: list[ChuyenXeItemResponse] = []
    for trip in trips:
        total_seats = trip.xe.loai_xe.SoGhe

        # Đếm số ghế đã bán hoặc đang giữ chỗ còn hạn
        booked_count = (
            db.query(func.count(CT_DatVe.MaCT))
            .join(CT_DatVe.dat_ve)
            .filter(
                CT_DatVe.MaChuyen == trip.MaChuyen,
                (
                    (DatVe.TrangThai == "DaThanhToan")
                    | ((DatVe.TrangThai == "ChoThanhToan") & (DatVe.NgayDat >= cutoff_holding))
                ),
            )
            .scalar()
            or 0
        )

        available_seats = max(0, total_seats - booked_count)

        results.append(
            ChuyenXeItemResponse(
                ma_chuyen=trip.MaChuyen,
                ma_tuyen=trip.MaTuyen,
                diem_di=trip.tuyen_xe.DiemDi,
                diem_den=trip.tuyen_xe.DiemDen,
                ngay_khoi_hanh=trip.NgayKhoiHanh,
                gio_khoi_hanh=trip.GioKhoiHanh,
                gia_ve=trip.GiaVe,
                trang_thai=trip.TrangThai,
                ghi_chu=trip.GhiChu,
                ma_xe=trip.xe.MaXe,
                bien_so=trip.xe.BienSo,
                ten_loai_xe=trip.xe.loai_xe.TenLoaiXe,
                tong_so_ghe=total_seats,
                so_ghe_trong=available_seats,
            )
        )

    return results


@chuyen_router.get("/{ma_chuyen}", response_model=ChuyenXeItemResponse, summary="Chi tiết chuyến xe")
def get_trip_detail(ma_chuyen: int, db: Session = Depends(get_db)):
    """Lấy thông tin chi tiết của một chuyến xe cụ thể."""
    trip = (
        db.query(ChuyenXe)
        .options(
            joinedload(ChuyenXe.tuyen_xe),
            joinedload(ChuyenXe.xe).joinedload(Xe.loai_xe),
        )
        .filter(ChuyenXe.MaChuyen == ma_chuyen)
        .first()
    )
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy chuyến xe có mã {ma_chuyen}",
        )

    now = datetime.now()
    hold_min = get_setting_int(db, "THOI_GIAN_GIU_CHO_PHUT", 15)
    cutoff_holding = now - timedelta(minutes=hold_min)
    total_seats = trip.xe.loai_xe.SoGhe

    booked_count = (
        db.query(func.count(CT_DatVe.MaCT))
        .join(CT_DatVe.dat_ve)
        .filter(
            CT_DatVe.MaChuyen == trip.MaChuyen,
            (
                (DatVe.TrangThai == "DaThanhToan")
                | ((DatVe.TrangThai == "ChoThanhToan") & (DatVe.NgayDat >= cutoff_holding))
            ),
        )
        .scalar()
        or 0
    )

    return ChuyenXeItemResponse(
        ma_chuyen=trip.MaChuyen,
        ma_tuyen=trip.MaTuyen,
        diem_di=trip.tuyen_xe.DiemDi,
        diem_den=trip.tuyen_xe.DiemDen,
        ngay_khoi_hanh=trip.NgayKhoiHanh,
        gio_khoi_hanh=trip.GioKhoiHanh,
        gia_ve=trip.GiaVe,
        trang_thai=trip.TrangThai,
        ghi_chu=trip.GhiChu,
        ma_xe=trip.xe.MaXe,
        bien_so=trip.xe.BienSo,
        ten_loai_xe=trip.xe.loai_xe.TenLoaiXe,
        tong_so_ghe=total_seats,
        so_ghe_trong=max(0, total_seats - booked_count),
    )


@chuyen_router.get("/{ma_chuyen}/so-do-ghe", response_model=SoDoGheResponse, summary="Sơ đồ ghế thời gian thực")
def get_trip_seat_map(ma_chuyen: int, db: Session = Depends(get_db)):
    """Trả về sơ đồ từng ghế (tầng 1, tầng 2) và trạng thái động: TRONG, TAM_GIU, DA_DAT, BAO_TRI."""
    trip = (
        db.query(ChuyenXe)
        .options(
            joinedload(ChuyenXe.xe).joinedload(Xe.loai_xe),
            joinedload(ChuyenXe.xe).joinedload(Xe.ghe_list),
        )
        .filter(ChuyenXe.MaChuyen == ma_chuyen)
        .first()
    )
    if not trip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy chuyến xe có mã {ma_chuyen}",
        )

    now = datetime.now()
    hold_min = get_setting_int(db, "THOI_GIAN_GIU_CHO_PHUT", 15)
    cutoff_holding = now - timedelta(minutes=hold_min)

    # Lấy danh sách các vé của chuyến này
    ct_list = (
        db.query(CT_DatVe)
        .join(CT_DatVe.dat_ve)
        .options(joinedload(CT_DatVe.dat_ve))
        .filter(
            CT_DatVe.MaChuyen == ma_chuyen,
            DatVe.TrangThai.in_(["DaThanhToan", "ChoThanhToan"]),
        )
        .all()
    )

    booked_seat_ids: set[int] = set()
    holding_seat_ids: set[int] = set()

    for ct in ct_list:
        if ct.dat_ve.TrangThai == "DaThanhToan":
            booked_seat_ids.add(ct.MaGhe)
        elif ct.dat_ve.TrangThai == "ChoThanhToan" and ct.dat_ve.NgayDat >= cutoff_holding:
            holding_seat_ids.add(ct.MaGhe)

    danh_sach_ghe: list[GheItemResponse] = []
    # Sắp xếp ghế theo Tầng và Số ghế
    sorted_ghe = sorted(trip.xe.ghe_list, key=lambda g: (g.Tang, g.SoGhe))

    so_ghe_da_dat = 0
    for ghe in sorted_ghe:
        # Xác định trạng thái động của ghế
        if ghe.TrangThai != "Trong":
            status_ghe = "BAO_TRI"
        elif ghe.MaGhe in booked_seat_ids:
            status_ghe = "DA_DAT"
            so_ghe_da_dat += 1
        elif ghe.MaGhe in holding_seat_ids:
            status_ghe = "TAM_GIU"
            so_ghe_da_dat += 1
        else:
            status_ghe = "TRONG"

        danh_sach_ghe.append(
            GheItemResponse(
                ma_ghe=ghe.MaGhe,
                so_ghe=ghe.SoGhe,
                tang=ghe.Tang,
                trang_thai_vat_ly=ghe.TrangThai,
                trang_thai_chuyen=status_ghe,
                gia_ve=trip.GiaVe,
            )
        )

    total_seats = trip.xe.loai_xe.SoGhe
    so_ghe_trong = max(0, total_seats - so_ghe_da_dat)

    return SoDoGheResponse(
        ma_chuyen=trip.MaChuyen,
        ma_xe=trip.xe.MaXe,
        bien_so=trip.xe.BienSo,
        ten_loai_xe=trip.xe.loai_xe.TenLoaiXe,
        tong_so_ghe=total_seats,
        so_ghe_trong=so_ghe_trong,
        so_ghe_da_dat=so_ghe_da_dat,
        danh_sach_ghe=danh_sach_ghe,
    )
