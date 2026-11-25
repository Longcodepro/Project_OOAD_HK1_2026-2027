"""
Script kiểm tra toàn diện API cho Chức Năng 1:
- Hủy chuyến xe (Admin): GET báo cáo thiệt hại & POST xác nhận hủy hoàn tiền
- Tra cứu vé & Hủy vé hoàn tiền (Khách hàng): GET tra-cuu, GET bao-gia-huy, POST yeu-cau-huy
"""
import os
import sys
from decimal import Decimal
from datetime import date, time, datetime, timedelta
import pytest
from fastapi.testclient import TestClient

# Thêm backend vào sys.path
sys.path.insert(0, os.path.abspath("backend"))

os.environ["MYSQL_HOST"] = os.environ.get("MYSQL_HOST", "127.0.0.1")

from app.main import app
from app.infrastructure.db.session import SessionLocal
from app.infrastructure.db.models import ChuyenXe, DatVe, CT_DatVe, Ghe, KhachHang, TaiKhoan, ThanhToan

client = TestClient(app)

def get_admin_token():
    res = client.post("/api/auth/login", json={"ten_dang_nhap": "admin", "mat_khau": "MatKhau@123"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

def get_staff_token():
    res = client.post("/api/auth/login", json={"ten_dang_nhap": "nv_miendong", "mat_khau": "MatKhau@123"})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]

def test_admin_cancel_trip_report_and_confirmation():
    admin_token = get_admin_token()
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Tạo một chuyến xe mới trong tương lai để kiểm tra
    db = SessionLocal()
    try:
        tomorrow = date.today() + timedelta(days=2)
        trip = ChuyenXe(
            MaTuyen=1,
            MaXe=1,
            NgayKhoiHanh=tomorrow,
            GioKhoiHanh=time(14, 0),
            GiaVe=Decimal("250000"),
            TrangThai="DangBan",
            GhiChu="Chuyến test hủy chuyến",
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)
        trip_id = trip.MaChuyen

        # Tạo 1 đơn online và 1 đơn tại quầy cho chuyến xe này
        kh_online = db.query(KhachHang).first()
        ghe_1 = db.query(Ghe).filter(Ghe.MaXe == 1).first()
        ghe_2 = db.query(Ghe).filter(Ghe.MaXe == 1).offset(1).first()

        order_online = DatVe(
            MaKH=kh_online.MaKH,
            TongTien=Decimal("250000"),
            TrangThai="DaThanhToan",
            NgayDat=datetime.now(),
        )
        db.add(order_online)
        db.commit()
        db.refresh(order_online)

        ct_online = CT_DatVe(
            MaDatVe=order_online.MaDatVe,
            MaChuyen=trip_id,
            MaGhe=ghe_1.MaGhe,
            DonGia=Decimal("250000"),
        )
        db.add(ct_online)

        pay_online = ThanhToan(
            MaDatVe=order_online.MaDatVe,
            SoTien=Decimal("250000"),
            PhuongThuc="VNPAY",
            TrangThai="ThanhCong",
            SoTaiKhoan="1903889999",
            TenNganHang="Techcombank",
            TenChuTaiKhoan="NGUYEN VAN TEST",
            ThoiGianThanhToan=datetime.now(),
        )
        db.add(pay_online)

        # Đơn quầy
        order_counter = DatVe(
            MaKH=kh_online.MaKH,
            MaNV=1,
            TongTien=Decimal("250000"),
            TrangThai="DaThanhToan",
            NgayDat=datetime.now(),
        )
        db.add(order_counter)
        db.commit()
        db.refresh(order_counter)

        ct_counter = CT_DatVe(
            MaDatVe=order_counter.MaDatVe,
            MaChuyen=trip_id,
            MaGhe=ghe_2.MaGhe,
            DonGia=Decimal("250000"),
        )
        db.add(ct_counter)

        pay_counter = ThanhToan(
            MaDatVe=order_counter.MaDatVe,
            SoTien=Decimal("250000"),
            PhuongThuc="TienMatTaiQuay",
            TrangThai="ThanhCong",
            ThoiGianThanhToan=datetime.now(),
        )
        db.add(pay_counter)
        db.commit()

        # 1. TEST GET BÁO CÁO HỦY CHUYẾN (ADMIN)
        rep_res = client.get(f"/api/admin/chuyen-xe/{trip_id}/bao-cao-huy", headers=headers)
        assert rep_res.status_code == 200, rep_res.text
        rep_data = rep_res.json()

        # Tab 1: Thiệt hại & chi phí
        assert rep_data["ma_chuyen"] == trip_id
        assert rep_data["tong_so_ve_da_ban"] == 2
        assert float(rep_data["tong_tien_goc"]) == 500000.0
        assert rep_data["ty_le_hoan_mac_dinh"] == 110
        assert float(rep_data["tong_tien_hoan_du_kien"]) == 550000.0
        assert len(rep_data["danh_sach_khach"]) == 2

        # Tab 2: Thông báo hành khách 3 cột
        tb_list = rep_data["danh_sach_thong_bao_khach"]
        assert len(tb_list) == 2

        online_item = next(x for x in tb_list if x["hinh_thuc_mua"] == "Online")
        counter_item = next(x for x in tb_list if x["hinh_thuc_mua"] == "TaiQuay")

        # Cột 2 & Cột 3 quy tắc
        assert online_item["tai_khoan_hoan_tien"] is not None
        assert online_item["sdt_gui_message"] is None

        assert counter_item["tai_khoan_hoan_tien"] is None
        assert counter_item["sdt_gui_message"] is not None

        # SMS Textarea ở dưới cùng Tab 2
        assert len(rep_data["mau_tin_nhan_sms"]) > 0
        assert len(rep_data["noi_dung_sms_xem_truoc"]) > 0

        # 2. TEST POST XÁC NHẬN HỦY CHUYẾN (ADMIN)
        confirm_res = client.post(
            f"/api/admin/chuyen-xe/{trip_id}/xac-nhan-huy",
            headers=headers,
            json={
                "ly_do": "Sạt lở đèo do bão lũ, không đảm bảo an toàn giao thông",
                "ty_le_hoan_tien": 110,
                "noi_dung_sms_tuy_chinh": "Tin nhắn SMS thông báo hủy chuyến kiểm tra",
            },
        )
        assert confirm_res.status_code == 200, confirm_res.text
        confirm_data = confirm_res.json()

        assert confirm_data["ma_chuyen"] == trip_id
        assert confirm_data["trang_thai"] == "HuyChuyen"
        assert confirm_data["so_don_da_huy"] == 2
        assert confirm_data["so_ve_da_huy"] == 2
        assert confirm_data["so_don_online_hoan_ngay"] == 1
        assert confirm_data["so_don_quay_cho_nhan_tien_mat"] == 1
        assert confirm_data["so_sms_da_gui"] == 1
        assert float(confirm_data["tong_tien_hoan_thuc_te"]) == 550000.0

    finally:
        db.close()


def test_customer_ticket_lookup_and_online_refund():
    # Tạo đơn đặt vé online cách ngày đi > 24h để test hủy hoàn tiền
    db = SessionLocal()
    try:
        departure = date.today() + timedelta(days=3)
        trip = ChuyenXe(
            MaTuyen=1,
            MaXe=1,
            NgayKhoiHanh=departure,
            GioKhoiHanh=time(9, 30),
            GiaVe=Decimal("300000"),
            TrangThai="DangBan",
            GhiChu="Trip customer refund test",
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)

        kh = db.query(KhachHang).first()
        ghe = db.query(Ghe).filter(Ghe.MaXe == 1).first()

        order = DatVe(
            MaKH=kh.MaKH,
            TongTien=Decimal("300000"),
            TrangThai="DaThanhToan",
            NgayDat=datetime.now(),
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        ct = CT_DatVe(
            MaDatVe=order.MaDatVe,
            MaChuyen=trip.MaChuyen,
            MaGhe=ghe.MaGhe,
            DonGia=Decimal("300000"),
        )
        db.add(ct)

        pay = ThanhToan(
            MaDatVe=order.MaDatVe,
            SoTien=Decimal("300000"),
            PhuongThuc="VNPAY",
            TrangThai="ThanhCong",
            SoTaiKhoan="1902223344",
            TenNganHang="Techcombank",
            TenChuTaiKhoan="NGUYEN VAN KHACH",
            ThoiGianThanhToan=datetime.now(),
        )
        db.add(pay)
        db.commit()

        # 1. Tra cứu vé
        lookup_res = client.get(f"/api/ve/tra-cuu?ma_dat_ve={order.MaDatVe}")
        assert lookup_res.status_code == 200, lookup_res.text
        lookup_data = lookup_res.json()
        assert len(lookup_data) == 1
        assert lookup_data[0]["ma_dat_ve"] == order.MaDatVe
        assert lookup_data[0]["trang_thai"] == "DaThanhToan"

        # 2. Báo giá hủy vé (GET & POST)
        quote_res = client.get(f"/api/ve/{order.MaDatVe}/bao-gia-huy")
        assert quote_res.status_code == 200, quote_res.text
        quote_data = quote_res.json()
        assert quote_data["cho_phep_huy"] is True
        assert quote_data["hinh_thuc_mua"] == "Online"
        assert quote_data["so_gio_con_lai"] > 24
        assert quote_data["ty_le_phi_huy"] > 0
        expected_phi = 300000.0 * (quote_data["ty_le_phi_huy"] / 100.0)
        expected_hoan = 300000.0 - expected_phi
        assert float(quote_data["phi_huy"]) == expected_phi
        assert float(quote_data["so_tien_hoan_lai"]) == expected_hoan

        # 3. Thực hiện hủy vé & hoàn tiền
        cancel_res = client.post(
            f"/api/ve/{order.MaDatVe}/yeu-cau-huy",
            json={"ly_do": "Khách hàng bận việc đột xuất"},
        )
        assert cancel_res.status_code == 200, cancel_res.text
        cancel_data = cancel_res.json()
        assert cancel_data["ma_dat_ve"] == order.MaDatVe
        assert cancel_data["trang_thai"] == "DaHuy"
        assert float(cancel_data["so_tien_hoan"]) == expected_hoan
        assert float(cancel_data["phi_huy"]) == expected_phi

    finally:
        db.close()
