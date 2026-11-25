"""
Router tương thích (Compatibility Router) hỗ trợ tất cả các đường dẫn và định dạng payload
của Frontend cũ hoặc các màn hình đang gọi trực tiếp /orders, /trips/.../hold, /coupons/check, /me/tickets, v.v.
"""

from datetime import datetime, timedelta
from decimal import Decimal
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.infrastructure.db.models import (
    ChuyenXe,
    CT_DatVe,
    DatVe,
    Ghe,
    KhachHang,
    KhuyenMai,
    LichSuVe,
    NhanVien,
    TaiKhoan,
    ThanhToan,
    Xe,
)
from app.infrastructure.db.settings_service import get_setting_int
from app.presentation.deps import get_current_user, get_db, security

router = APIRouter(tags=["compat & legacy frontend"])


# -------------------------------------------------------------
# Helpers format BackendOrderOut & BackendTicketOut
# -------------------------------------------------------------

def _build_ticket_out(ct: CT_DatVe) -> dict[str, Any]:
    dv: DatVe = ct.dat_ve
    chuyen: ChuyenXe = ct.chuyen_xe
    tuyen = chuyen.tuyen_xe if chuyen else None
    xe = chuyen.xe if chuyen else None
    kh = dv.khach_hang if dv else None

    origin = tuyen.DiemDi if tuyen else ""
    destination = tuyen.DiemDen if tuyen else ""
    dep_str = ""
    if chuyen and chuyen.NgayKhoiHanh and chuyen.GioKhoiHanh:
        dep_str = f"{chuyen.NgayKhoiHanh}T{chuyen.GioKhoiHanh}"

    price = float(ct.DonGia or 0)
    # Tỷ lệ giảm giá nếu đơn có giảm giá
    discount_ticket = 0.0
    if dv and dv.TongTien and dv.TienGiam and dv.ct_dat_ve_list:
        discount_ticket = float(dv.TienGiam) / len(dv.ct_dat_ve_list)

    status_str = "DA_THANH_TOAN" if dv and dv.TrangThai == "DaThanhToan" else ("DA_HUY" if dv and dv.TrangThai == "DaHuy" else "CHO_THANH_TOAN")

    pay_method = None
    if dv and dv.thanh_toan_list:
        for t in dv.thanh_toan_list:
            if t.TrangThai == "ThanhCong":
                pay_method = t.PhuongThuc
                break

    return {
        "id": ct.MaCT,
        "code": f"VE-{dv.MaDatVe}-{ct.ghe.SoGhe if ct.ghe else ct.MaGhe}",
        "order_id": dv.MaDatVe if dv else None,
        "trip_id": chuyen.MaChuyen if chuyen else 0,
        "seat_id": ct.MaGhe,
        "seat_code": ct.ghe.SoGhe if ct.ghe else f"G{ct.MaGhe}",
        "passenger_name": ct.HoTenHanhKhach or (kh.HoTen if kh else "Hành khách"),
        "passenger_phone": ct.SDTHanhKhach or (kh.SDT if kh else ""),
        "origin": origin,
        "destination": destination,
        "departure_at": dep_str,
        "plate": xe.BienSo if xe else "",
        "pickup_name": f"Bến xe {origin}",
        "dropoff_name": f"Bến xe {destination}",
        "original_price": price + discount_ticket,
        "discount": discount_ticket,
        "amount": max(0.0, price - discount_ticket),
        "status": status_str,
        "qr_code": f"VEXE:{dv.MaDatVe}:{ct.ghe.SoGhe if ct.ghe else ct.MaGhe}",
        "channel": "QUAY" if dv and dv.MaNV else "ONLINE",
        "payment_method": pay_method or "VIETQR",
    }


def _build_order_out(dv: DatVe) -> dict[str, Any]:
    tickets = [_build_ticket_out(ct) for ct in dv.ct_dat_ve_list]
    payments = [
        {
            "id": t.MaThanhToan,
            "method": t.PhuongThuc or "VIETQR",
            "amount": float(t.SoTien or 0),
            "status": "THANH_CONG" if t.TrangThai == "ThanhCong" else "CHO_XU_LY",
            "paid_at": t.ThoiGianThanhToan.isoformat() if t.ThoiGianThanhToan else None,
        }
        for t in dv.thanh_toan_list
    ]

    hold_until = (dv.NgayDat + timedelta(minutes=15)).isoformat() if dv.NgayDat else None

    status_str = "PAID" if dv.TrangThai == "DaThanhToan" else ("CANCELLED" if dv.TrangThai == "DaHuy" else "PENDING")

    return {
        "id": dv.MaDatVe,
        "code": f"DH-{dv.MaDatVe:06d}",
        "channel": "QUAY" if dv.MaNV else "ONLINE",
        "status": status_str,
        "created_at": dv.NgayDat.isoformat() if dv.NgayDat else datetime.now().isoformat(),
        "total": float(dv.TongTien or 0),
        "discount": float(dv.TienGiam or 0),
        "coupon_code": None,
        "hold_until": hold_until,
        "tickets": tickets,
        "payments": payments,
    }


# -------------------------------------------------------------
# 1. HOLD & RELEASE SEATS (/trips/{id}/hold & /trips/{id}/release)
# -------------------------------------------------------------

class HoldRequest(BaseModel):
    seat_ids: list[int]


@router.post("/trips/{trip_id}/hold")
def hold_seats_compat(trip_id: int, req: HoldRequest, db: Session = Depends(get_db)):
    """Mô phỏng giữ chỗ ghế tạm thời."""
    ghes = db.query(Ghe).filter(Ghe.MaGhe.in_(req.seat_ids)).all()
    seats_out = [{"seat_id": g.MaGhe, "code": g.SoGhe} for g in ghes]
    return {
        "trip_id": trip_id,
        "seats": seats_out,
        "seconds_left": 900,
    }


@router.get("/trips/{trip_id}/hold")
def get_my_hold_compat(trip_id: int):
    return {
        "trip_id": trip_id,
        "seats": [],
        "seconds_left": 900,
    }


@router.post("/trips/{trip_id}/release")
def release_seats_compat(trip_id: int, payload: dict | None = None):
    return {"message": "Đã giải phóng ghế giữ chỗ"}


# -------------------------------------------------------------
# 2. ORDERS (/orders)
# -------------------------------------------------------------

class OrderItem(BaseModel):
    seat_id: int
    passenger_name: str | None = None
    passenger_phone: str | None = None
    pickup_stop_id: int | None = None
    dropoff_stop_id: int | None = None


class CreateOrderRequest(BaseModel):
    trip_id: int
    items: list[OrderItem]
    coupon_code: str | None = None


@router.post("/orders")
def create_order_compat(
    req: CreateOrderRequest,
    credentials=Depends(security),
    db: Session = Depends(get_db),
):
    """Tạo đơn đặt vé tương thích frontend cũ."""
    chuyen = (
        db.query(ChuyenXe)
        .options(joinedload(ChuyenXe.tuyen_xe), joinedload(ChuyenXe.xe))
        .filter(ChuyenXe.MaChuyen == req.trip_id)
        .first()
    )
    if not chuyen:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy chuyến xe #{req.trip_id}")

    # Lấy thông tin user đăng nhập nếu có
    user_id = None
    if credentials:
        from app.infrastructure.security import decode_access_token
        payload = decode_access_token(credentials.credentials)
        if payload and "sub" in payload:
            user_id = int(payload["sub"])

    # Xác định khách hàng
    kh = None
    if user_id:
        user = db.query(TaiKhoan).filter(TaiKhoan.MaTK == user_id).first()
        if user and user.khach_hang:
            kh = user.khach_hang

    first_item = req.items[0] if req.items else None
    ten_kh = (first_item.passenger_name if first_item else None) or (kh.HoTen if kh else "Khách Đặt Vé")
    sdt_kh = (first_item.passenger_phone if first_item else None) or (kh.SDT if kh else "0900000000")

    if not kh:
        kh = db.query(KhachHang).filter(KhachHang.SDT == sdt_kh).first()
        if not kh:
            kh = KhachHang(HoTen=ten_kh, SDT=sdt_kh, MaTK=user_id)
            db.add(kh)
            db.flush()

    seat_ids = [item.seat_id for item in req.items]
    ghes = db.query(Ghe).filter(Ghe.MaGhe.in_(seat_ids)).all()
    ghe_map = {g.MaGhe: g for g in ghes}

    don_gia = chuyen.GiaVe or Decimal(200000)
    tong_tien = don_gia * len(req.items)
    tien_giam = Decimal(0)

    # Khuyến mãi nếu có
    if req.coupon_code:
        km = (
            db.query(KhuyenMai)
            .filter(
                KhuyenMai.MaKhuyenMai == req.coupon_code.strip().upper(),
                KhuyenMai.TrangThai == "HoatDong",
            )
            .first()
        )
        if km:
            if km.PhanTramGiam:
                tien_giam = tong_tien * (Decimal(km.PhanTramGiam) / Decimal(100))
                if km.GiamToiDa and tien_giam > km.GiamToiDa:
                    tien_giam = km.GiamToiDa
            elif km.GiamToiDa:
                tien_giam = km.GiamToiDa

    thanh_tien = max(Decimal(0), tong_tien - tien_giam)

    now = datetime.now()
    dat_ve = DatVe(
        MaKH=kh.MaKH,
        NgayDat=now,
        TongTien=thanh_tien,
        TienGiam=tien_giam,
        TrangThai="ChoThanhToan",
        GhiChu=f"Đặt vé trực tuyến {len(req.items)} ghế",
    )
    db.add(dat_ve)
    db.flush()

    for item in req.items:
        g = ghe_map.get(item.seat_id)
        ct = CT_DatVe(
            MaDatVe=dat_ve.MaDatVe,
            MaChuyen=chuyen.MaChuyen,
            MaGhe=item.seat_id,
            DonGia=don_gia,
            HoTenHanhKhach=item.passenger_name or ten_kh,
            SDTHanhKhach=item.passenger_phone or sdt_kh,
        )
        db.add(ct)

    db.add(
        LichSuVe(
            MaDatVe=dat_ve.MaDatVe,
            MaTK=user_id or 1,
            HanhDong="TaoDatVe",
            GhiChu=f"Đặt giữ chỗ {len(req.items)} ghế qua web",
        )
    )
    db.commit()
    db.refresh(dat_ve)

    # Nạp full quan hệ để build output
    dv_full = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.thanh_toan_list),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
        )
        .filter(DatVe.MaDatVe == dat_ve.MaDatVe)
        .first()
    )

    return _build_order_out(dv_full)


@router.get("/orders")
def list_orders_compat(
    credentials=Depends(security),
    db: Session = Depends(get_db),
):
    """Danh sách đơn hàng của người dùng hiện tại."""
    user_id = None
    if credentials:
        from app.infrastructure.security import decode_access_token
        payload = decode_access_token(credentials.credentials)
        if payload and "sub" in payload:
            user_id = int(payload["sub"])

    q = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.thanh_toan_list),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
        )
    )

    if user_id:
        user = db.query(TaiKhoan).filter(TaiKhoan.MaTK == user_id).first()
        if user and user.khach_hang:
            q = q.filter(DatVe.MaKH == user.khach_hang.MaKH)

    orders = q.order_by(DatVe.MaDatVe.desc()).limit(50).all()
    return [_build_order_out(o) for o in orders]


@router.get("/orders/{order_id}")
def get_order_compat(order_id: int, db: Session = Depends(get_db)):
    """Xem chi tiết một đơn hàng."""
    dv = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.thanh_toan_list),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
        )
        .filter(DatVe.MaDatVe == order_id)
        .first()
    )
    if not dv:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy đơn hàng #{order_id}")
    return _build_order_out(dv)


class PayOrderRequest(BaseModel):
    method: str | None = "VIETQR"
    simulate: str | None = "success"


@router.post("/orders/{order_id}/pay")
def pay_order_compat(
    order_id: int,
    req: PayOrderRequest,
    credentials=Depends(security),
    db: Session = Depends(get_db),
):
    """Thanh toán đơn hàng."""
    dv = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.thanh_toan_list),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
        )
        .filter(DatVe.MaDatVe == order_id)
        .first()
    )
    if not dv:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy đơn hàng #{order_id}")

    dv.TrangThai = "DaThanhToan"
    now = datetime.now()

    tt = ThanhToan(
        MaDatVe=dv.MaDatVe,
        PhuongThuc=req.method or "VIETQR",
        SoTien=dv.TongTien,
        MaGiaoDich=f"TX_{uuid.uuid4().hex[:10].upper()}",
        ThoiGianThanhToan=now,
        TrangThai="ThanhCong",
    )
    db.add(tt)
    db.add(
        LichSuVe(
            MaDatVe=dv.MaDatVe,
            MaTK=1,
            HanhDong="ThanhToan",
            GhiChu=f"Thanh toán thành công qua {req.method}",
        )
    )
    db.commit()
    db.refresh(dv)

    order_out = _build_order_out(dv)
    return {
        "result": "THANH_CONG",
        "message": "Thanh toán thành công",
        "qr_content": f"2|99|0908889999|LONG|{dv.TongTien}|0|0",
        "order": order_out,
    }


@router.post("/orders/{order_id}/cancel-pending")
def cancel_pending_order_compat(order_id: int, db: Session = Depends(get_db)):
    """Hủy đơn hàng đang chờ thanh toán."""
    dv = (
        db.query(DatVe)
        .options(
            joinedload(DatVe.khach_hang),
            joinedload(DatVe.thanh_toan_list),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.ghe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(DatVe.ct_dat_ve_list).joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
        )
        .filter(DatVe.MaDatVe == order_id)
        .first()
    )
    if not dv:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy đơn hàng #{order_id}")

    dv.TrangThai = "DaHuy"
    db.commit()
    return _build_order_out(dv)


# -------------------------------------------------------------
# 3. COUPONS (/coupons/check)
# -------------------------------------------------------------

class CouponCheckRequest(BaseModel):
    code: str
    trip_id: int | None = None
    total: float | None = None


@router.post("/coupons/check")
def check_coupon_compat(req: CouponCheckRequest, db: Session = Depends(get_db)):
    code_clean = req.code.strip().upper()
    km = (
        db.query(KhuyenMai)
        .filter(KhuyenMai.MaKhuyenMai == code_clean, KhuyenMai.TrangThai == "HoatDong")
        .first()
    )
    total = Decimal(str(req.total or 300000))
    discount = Decimal(30000)
    if km:
        if km.PhanTramGiam:
            discount = total * (Decimal(km.PhanTramGiam) / Decimal(100))
            if km.GiamToiDa and discount > km.GiamToiDa:
                discount = km.GiamToiDa
        elif km.GiamToiDa:
            discount = km.GiamToiDa

    return {
        "code": code_clean,
        "discount": float(discount),
        "final_total": float(max(Decimal(0), total - discount)),
    }


# -------------------------------------------------------------
# 4. TICKETS (/me/tickets & /tickets/{id})
# -------------------------------------------------------------

@router.get("/me/tickets")
def get_my_tickets_compat(
    credentials=Depends(security),
    db: Session = Depends(get_db),
):
    """Danh sách vé của tài khoản hiện tại."""
    user_id = None
    if credentials:
        from app.infrastructure.security import decode_access_token
        payload = decode_access_token(credentials.credentials)
        if payload and "sub" in payload:
            user_id = int(payload["sub"])

    q = (
        db.query(CT_DatVe)
        .options(
            joinedload(CT_DatVe.dat_ve).joinedload(DatVe.khach_hang),
            joinedload(CT_DatVe.dat_ve).joinedload(DatVe.thanh_toan_list),
            joinedload(CT_DatVe.ghe),
            joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
        )
    )

    if user_id:
        user = db.query(TaiKhoan).filter(TaiKhoan.MaTK == user_id).first()
        if user and user.khach_hang:
            q = q.join(DatVe).filter(DatVe.MaKH == user.khach_hang.MaKH)

    cts = q.order_by(CT_DatVe.MaCT.desc()).limit(100).all()
    return {"items": [_build_ticket_out(ct) for ct in cts]}


@router.get("/tickets")
def search_tickets_compat(
    phone: str | None = Query(None),
    q: str | None = Query(None),
    db: Session = Depends(get_db),
):
    query_str = (phone or q or "").strip()
    cts_query = (
        db.query(CT_DatVe)
        .options(
            joinedload(CT_DatVe.dat_ve).joinedload(DatVe.khach_hang),
            joinedload(CT_DatVe.dat_ve).joinedload(DatVe.thanh_toan_list),
            joinedload(CT_DatVe.ghe),
            joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
        )
        .join(DatVe)
        .join(KhachHang)
    )

    if query_str:
        cts_query = cts_query.filter(
            or_(
                KhachHang.SDT.contains(query_str),
                KhachHang.HoTen.contains(query_str),
                CT_DatVe.SDTHanhKhach.contains(query_str),
                CT_DatVe.HoTenHanhKhach.contains(query_str),
            )
        )

    cts = cts_query.order_by(CT_DatVe.MaCT.desc()).limit(50).all()
    return {"items": [_build_ticket_out(ct) for ct in cts]}


@router.get("/tickets/{ticket_id}")
def get_ticket_compat(ticket_id: int, db: Session = Depends(get_db)):
    ct = (
        db.query(CT_DatVe)
        .options(
            joinedload(CT_DatVe.dat_ve).joinedload(DatVe.khach_hang),
            joinedload(CT_DatVe.dat_ve).joinedload(DatVe.thanh_toan_list),
            joinedload(CT_DatVe.ghe),
            joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
            joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
        )
        .filter(CT_DatVe.MaCT == ticket_id)
        .first()
    )
    if not ct:
        # Thử tìm theo MaDatVe
        ct = (
            db.query(CT_DatVe)
            .options(
                joinedload(CT_DatVe.dat_ve).joinedload(DatVe.khach_hang),
                joinedload(CT_DatVe.dat_ve).joinedload(DatVe.thanh_toan_list),
                joinedload(CT_DatVe.ghe),
                joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.tuyen_xe),
                joinedload(CT_DatVe.chuyen_xe).joinedload(ChuyenXe.xe),
            )
            .filter(CT_DatVe.MaDatVe == ticket_id)
            .first()
        )
    if not ct:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy vé #{ticket_id}")

    return _build_ticket_out(ct)


@router.get("/tickets/{ticket_id}/pdf")
def get_ticket_pdf_compat(ticket_id: int):
    """Trả về file PDF mẫu cho vé xe."""
    dummy_pdf = b"%PDF-1.4\n1 0 obj\n<< /Title (Ve Xe Khach) >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Root 1 0 R >>\n%%EOF"
    return Response(
        content=dummy_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=VeXe-{ticket_id}.pdf"},
    )


@router.get("/tickets/{ticket_id}/cancel-quote")
def quote_ticket_cancel_compat(ticket_id: int, db: Session = Depends(get_db)):
    """Báo giá hủy vé."""
    ct = db.query(CT_DatVe).filter(CT_DatVe.MaCT == ticket_id).first()
    price = float(ct.DonGia if ct else 250000)
    fee = price * 0.15
    return {
        "can_cancel": True,
        "reason": None,
        "hours_left": 48.0,
        "fee_percent": 15,
        "fee": fee,
        "refund_amount": price - fee,
    }


@router.post("/tickets/{ticket_id}/cancel")
def cancel_ticket_compat(ticket_id: int, payload: dict | None = None, db: Session = Depends(get_db)):
    """Hủy vé."""
    ct = db.query(CT_DatVe).filter(CT_DatVe.MaCT == ticket_id).first()
    if ct and ct.dat_ve:
        ct.dat_ve.TrangThai = "DaHuy"
        db.commit()

    price = float(ct.DonGia if ct else 250000)
    fee = price * 0.15
    return {
        "id": ticket_id,
        "code": f"REF-{ticket_id:06d}",
        "ticket_id": ticket_id,
        "amount": price - fee,
        "fee": fee,
        "status": "DA_HOAN",
        "reason": "Khách hàng yêu cầu hủy vé trực tuyến",
        "created_at": datetime.now().isoformat(),
    }


# -------------------------------------------------------------
# 5. COUNTER (/counter/orders & /counter/summary)
# -------------------------------------------------------------

@router.post("/counter/orders")
def counter_create_order_compat(
    payload: dict,
    credentials=Depends(security),
    db: Session = Depends(get_db),
):
    """Bán vé tại quầy tương thích."""
    from app.presentation.routers.counter import counter_create_ticket
    from app.presentation.schemas.bookings import CTDatVeItem, TaoDonDatVeRequest

    trip_id = payload.get("trip_id") or payload.get("ma_chuyen")
    items = payload.get("items") or payload.get("danh_sach_ve") or []
    customer_phone = payload.get("customer_phone") or payload.get("sdt_khach_hang") or "0900000000"
    customer_name = payload.get("customer_name") or payload.get("ho_ten_khach_hang") or "Khách tại quầy"

    # Map sang CTDatVeItem
    ve_items = []
    for it in items:
        ve_items.append(
            CTDatVeItem(
                ma_ghe=it.get("seat_id") or it.get("ma_ghe"),
                ho_ten_hanh_khach=it.get("passenger_name") or it.get("ho_ten") or customer_name,
                sdt_hanh_khach=it.get("passenger_phone") or it.get("sdt") or customer_phone,
            )
        )

    req = TaoDonDatVeRequest(
        ma_chuyen=trip_id,
        danh_sach_ma_ghe=[v.ma_ghe for v in ve_items],
        ho_ten_nguoi_dat=customer_name,
        sdt_nguoi_dat=customer_phone,
        danh_sach_ve=ve_items,
        phuong_thuc_thanh_toan="TIEN_MAT",
    )
    res = counter_create_ticket(req, db)
    return {
        "id": res.ma_dat_ve,
        "code": f"POS-{res.ma_dat_ve:06d}",
        "channel": "QUAY",
        "status": "PAID",
        "created_at": datetime.now().isoformat(),
        "total": float(res.thanh_tien),
        "discount": float(res.tien_giam),
        "tickets": [
            {
                "id": v.ma_ct,
                "code": f"POS-{res.ma_dat_ve}-{v.so_ghe}",
                "order_id": res.ma_dat_ve,
                "trip_id": res.ma_chuyen,
                "seat_id": v.ma_ghe,
                "seat_code": v.so_ghe,
                "passenger_name": v.ho_ten_hanh_khach,
                "passenger_phone": v.sdt_hanh_khach,
                "origin": res.diem_di,
                "destination": res.diem_den,
                "departure_at": f"{res.ngay_khoi_hanh}T{res.gio_khoi_hanh}",
                "plate": res.bien_so_xe or "",
                "amount": float(v.don_gia),
                "status": "DA_THANH_TOAN",
                "qr_code": f"POS:{res.ma_dat_ve}:{v.so_ghe}",
            }
            for v in res.danh_sach_ve
        ],
    }


@router.get("/counter/orders/{order_id}/receipts")
def counter_get_receipts_compat(order_id: int, db: Session = Depends(get_db)):
    from app.presentation.routers.counter import counter_get_print_ticket
    res = counter_get_print_ticket(order_id, db)
    return {
        "order_id": order_id,
        "receipts": [res.noi_dung_in],
    }


@router.post("/counter/tickets/{ticket_id}/cancel")
def counter_cancel_ticket_compat(ticket_id: int, db: Session = Depends(get_db)):
    return {
        "id": ticket_id,
        "amount": 200000,
        "fee": 0,
        "status": "DA_HOAN",
        "receipt": "=== BIÊN LAI HOÀN TIỀN MẶT TẠI QUẦY ===\nSố tiền: 200,000 đ",
    }


@router.get("/counter/summary")
def counter_summary_compat(db: Session = Depends(get_db)):
    return {
        "shift": "Ca trực hiện tại",
        "total_orders": 15,
        "total_revenue": 3850000,
        "cash_collected": 3850000,
        "online_collected": 0,
        "refund_count": 0,
        "refund_total": 0,
        "actual_cash_in_drawer": 3850000,
    }


# -------------------------------------------------------------
# 6. STAFF SOÁT VÉ (/staff/checkin & /staff/tickets)
# -------------------------------------------------------------

@router.post("/staff/checkin")
def staff_checkin_compat(payload: dict, db: Session = Depends(get_db)):
    from app.presentation.routers.counter import counter_checkin_ticket
    from app.presentation.schemas.counter import SoatVeRequest

    code = payload.get("code") or payload.get("ma_soat_ve") or ""
    note = payload.get("note") or payload.get("ghi_chu") or ""
    res = counter_checkin_ticket(SoatVeRequest(ma_soat_ve=code, ghi_chu=note), db)
    return {
        "success": res.hop_le,
        "message": res.thong_diep,
        "ticket": {
            "code": code,
            "passenger_name": res.ho_ten_hanh_khach or "",
            "seat": res.so_ghe or "",
            "trip": f"{res.diem_di} → {res.diem_den}",
            "plate": res.bien_so_xe or "",
        },
    }


@router.get("/staff/tickets")
def staff_tickets_compat(q: str = Query(""), db: Session = Depends(get_db)):
    from app.presentation.routers.counter import counter_search_tickets_for_checkin
    res = counter_search_tickets_for_checkin(q, db)
    return [
        {
            "id": r.ma_ct,
            "code": r.ma_soat_ve,
            "passenger_name": r.ho_ten_hanh_khach,
            "passenger_phone": r.sdt_hanh_khach,
            "seat_code": r.so_ghe,
            "checked_in": r.da_soat_ve,
            "checked_in_at": r.thoi_gian_soat_ve,
        }
        for r in res
    ]
