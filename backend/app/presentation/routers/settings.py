from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.infrastructure.db.models import CaiDat, TaiKhoan
from app.presentation.deps import get_db, require_roles
from app.presentation.schemas.settings import (
    CaiDatItemResponse,
    CapNhatCaiDatHeThongRequest,
    CapNhatMotCaiDatRequest,
)

router = APIRouter(prefix="/cai-dat", tags=["cài đặt hệ thống (quản lý)"])
admin_required = require_roles(["QuanTri"])


@router.get("", response_model=list[CaiDatItemResponse], summary="Xem danh sách thông số cài đặt hệ thống")
def get_system_settings(db: Session = Depends(get_db)):
    """Xem các tham số vận hành: thời gian giữ chỗ (phút), phí phạt hủy vé (%), số giờ tối thiểu được hủy."""
    items = db.query(CaiDat).order_by(CaiDat.MaCaiDat).all()
    return [
        CaiDatItemResponse(
            ma_cai_dat=item.MaCaiDat,
            khoa=item.Khoa,
            gia_tri=item.GiaTri,
            mo_ta=item.MoTa,
            ngay_cap_nhat=item.NgayCapNhat,
        )
        for item in items
    ]


@router.put(
    "",
    response_model=list[CaiDatItemResponse],
    summary="Cập nhật tham số hệ thống (Chỉ Quản lý / Quản trị viên)",
)
def update_system_settings(
    req: CapNhatCaiDatHeThongRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Quản lý điều chỉnh thời gian giữ chỗ vé và chính sách phí hủy vé hoàn tiền."""
    now = datetime.now()

    if req.thoi_gian_giu_cho_phut is not None:
        rec = db.query(CaiDat).filter(CaiDat.Khoa == "THOI_GIAN_GIU_CHO_PHUT").first()
        if not rec:
            rec = CaiDat(
                Khoa="THOI_GIAN_GIU_CHO_PHUT",
                GiaTri=str(req.thoi_gian_giu_cho_phut),
                MoTa="Thời gian giữ chỗ và hạn thanh toán đơn hàng (phút)",
                NgayCapNhat=now,
            )
            db.add(rec)
        else:
            rec.GiaTri = str(req.thoi_gian_giu_cho_phut)
            rec.NgayCapNhat = now

    if req.ty_le_phi_huy_ve is not None:
        rec = db.query(CaiDat).filter(CaiDat.Khoa == "TY_LE_PHI_HUY_VE").first()
        if not rec:
            rec = CaiDat(
                Khoa="TY_LE_PHI_HUY_VE",
                GiaTri=str(req.ty_le_phi_huy_ve),
                MoTa="Tỷ lệ phần trăm phí phạt khi hoàn hủy vé trước 24 giờ (%)",
                NgayCapNhat=now,
            )
            db.add(rec)
        else:
            rec.GiaTri = str(req.ty_le_phi_huy_ve)
            rec.NgayCapNhat = now

    if req.thoi_gian_huy_toi_thieu_gio is not None:
        rec = db.query(CaiDat).filter(CaiDat.Khoa == "THOI_GIAN_HUY_TOI_THIEU_GIO").first()
        if not rec:
            rec = CaiDat(
                Khoa="THOI_GIAN_HUY_TOI_THIEU_GIO",
                GiaTri=str(req.thoi_gian_huy_toi_thieu_gio),
                MoTa="Thời gian tối thiểu trước giờ khởi hành cho phép hủy vé (giờ)",
                NgayCapNhat=now,
            )
            db.add(rec)
        else:
            rec.GiaTri = str(req.thoi_gian_huy_toi_thieu_gio)
            rec.NgayCapNhat = now

    if req.ty_le_hoan_tien_khi_huy_chuyen is not None:
        rec = db.query(CaiDat).filter(CaiDat.Khoa == "TY_LE_HOAN_TIEN_KHI_HUY_CHUYEN").first()
        if not rec:
            rec = CaiDat(
                Khoa="TY_LE_HOAN_TIEN_KHI_HUY_CHUYEN",
                GiaTri=str(req.ty_le_hoan_tien_khi_huy_chuyen),
                MoTa="Tỷ lệ phần trăm hoàn tiền bồi thường khi Nhà xe đơn phương hủy chuyến (%)",
                NgayCapNhat=now,
            )
            db.add(rec)
        else:
            rec.GiaTri = str(req.ty_le_hoan_tien_khi_huy_chuyen)
            rec.NgayCapNhat = now

    db.commit()

    items = db.query(CaiDat).order_by(CaiDat.MaCaiDat).all()
    return [
        CaiDatItemResponse(
            ma_cai_dat=item.MaCaiDat,
            khoa=item.Khoa,
            gia_tri=item.GiaTri,
            mo_ta=item.MoTa,
            ngay_cap_nhat=item.NgayCapNhat,
        )
        for item in items
    ]


@router.put(
    "/{khoa}",
    response_model=CaiDatItemResponse,
    summary="Cập nhật một thông số cài đặt cụ thể",
)
def update_single_setting(
    khoa: str,
    req: CapNhatMotCaiDatRequest,
    current_user: TaiKhoan = Depends(admin_required),
    db: Session = Depends(get_db),
):
    """Cập nhật riêng lẻ một thông số cài đặt (Chỉ Quản trị viên)."""
    item = db.query(CaiDat).filter(CaiDat.Khoa == khoa.strip()).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy tham số cài đặt '{khoa}'",
        )

    item.GiaTri = req.gia_tri.strip()
    if req.mo_ta is not None:
        item.MoTa = req.mo_ta.strip()
    item.NgayCapNhat = datetime.now()
    db.commit()
    db.refresh(item)

    return CaiDatItemResponse(
        ma_cai_dat=item.MaCaiDat,
        khoa=item.Khoa,
        gia_tri=item.GiaTri,
        mo_ta=item.MoTa,
        ngay_cap_nhat=item.NgayCapNhat,
    )
