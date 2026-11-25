from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.infrastructure.db.models import KhuyenMai
from app.presentation.deps import get_db
from app.presentation.schemas.coupons import (
    KhuyenMaiItemResponse,
    KiemTraVoucherRequest,
    KiemTraVoucherResponse,
)

router = APIRouter(prefix="/khuyen-mai", tags=["khuyến mãi"])


@router.get("", response_model=list[KhuyenMaiItemResponse], summary="Danh sách khuyến mãi khả dụng")
def get_promotions(db: Session = Depends(get_db)):
    """Lấy danh sách các mã khuyến mãi đang trong thời gian hiệu lực và còn hoạt động."""
    now = datetime.now()
    promotions = (
        db.query(KhuyenMai)
        .filter(
            KhuyenMai.TrangThai == "HoatDong",
            KhuyenMai.NgayBatDau <= now,
            KhuyenMai.NgayKetThuc >= now,
        )
        .all()
    )
    return [
        KhuyenMaiItemResponse(
            ma_km=p.MaKM,
            ten_km=p.TenKM,
            ma_code=p.MaCode,
            loai_giam=p.LoaiGiam,
            gia_tri_giam=p.GiaTriGiam,
            gia_tri_giam_toi_da=p.GiaTriGiamToiDa,
            don_toi_thieu=p.DonToiThieu,
            ngay_bat_dau=p.NgayBatDau,
            ngay_ket_thuc=p.NgayKetThuc,
            trang_thai=p.TrangThai,
            mo_ta=p.MoTa,
        )
        for p in promotions
    ]


@router.post("/kiem-tra", response_model=KiemTraVoucherResponse, summary="Kiểm tra & áp dụng mã voucher")
def validate_coupon(req: KiemTraVoucherRequest, db: Session = Depends(get_db)):
    """Kiểm tra mã code khuyến mãi với đơn hàng và tính số tiền giảm giá chính xác."""
    now = datetime.now()
    km = (
        db.query(KhuyenMai)
        .filter(KhuyenMai.MaCode == req.ma_code.strip().upper())
        .first()
    )

    if not km:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mã khuyến mãi '{req.ma_code}' không tồn tại trên hệ thống",
        )

    if km.TrangThai != "HoatDong":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã khuyến mãi '{req.ma_code}' hiện đang tạm ngừng áp dụng",
        )

    if now < km.NgayBatDau or now > km.NgayKetThuc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mã khuyến mãi '{req.ma_code}' đã hết hạn sử dụng",
        )

    if req.tong_tien < km.DonToiThieu:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Đơn hàng trị giá {req.tong_tien:,.0f} đ chưa đạt giá trị tối thiểu "
                f"{km.DonToiThieu:,.0f} đ để áp dụng mã này"
            ),
        )

    # Tính toán mức giảm giá
    tien_giam = Decimal(0)
    if km.LoaiGiam == "PhanTram":
        # GiaTriGiam ví dụ 10% -> 0.10
        tien_giam = req.tong_tien * (km.GiaTriGiam / Decimal(100))
        if km.GiaTriGiamToiDa and tien_giam > km.GiaTriGiamToiDa:
            tien_giam = km.GiaTriGiamToiDa
    else:  # TienMat
        tien_giam = min(km.GiaTriGiam, req.tong_tien)

    tong_tien_sau_giam = max(Decimal(0), req.tong_tien - tien_giam)

    return KiemTraVoucherResponse(
        hop_le=True,
        ma_km=km.MaKM,
        ten_km=km.TenKM,
        loai_giam=km.LoaiGiam,
        gia_tri_giam=km.GiaTriGiam,
        tien_giam=tien_giam,
        tong_tien_sau_giam=tong_tien_sau_giam,
        thong_diep=f"Áp dụng thành công mã {km.MaCode}, giảm {tien_giam:,.0f} VNĐ",
    )
